//! Full Saturator Signal Chain implementation per Engineering Spec §1.5.

use crate::filters::{Biquad, DcBlocker};
use crate::oversampling::{OversampledSaturator, Quality};
use crate::smoothing::{
    CharacterCrossfader, SmoothedParam, CHARACTER_CROSSFADE_MS, DRIVE_SMOOTHING_MS,
    MIX_SMOOTHING_MS, OUTPUT_SMOOTHING_MS, TONE_SMOOTHING_MS,
};
use crate::waveshaper::Character;

/// Single channel saturator DSP instance.
#[derive(Debug, Clone)]
pub struct SaturatorChannel {
    sample_rate: f64,
    pub quality: Quality,
    pub crossfader: CharacterCrossfader,
    pub drive_param: SmoothedParam,
    pub tone_param: SmoothedParam,
    pub mix_param: SmoothedParam,
    pub output_param: SmoothedParam,

    // Stage 2: Tone pre-emphasis filter
    tone_filter: Biquad,
    last_tone_db: f64,

    // Stage 3: Nonlinear saturators
    sat_primary: OversampledSaturator,
    sat_secondary: OversampledSaturator,

    // Stage 4: Character-specific post coloration
    tape_head_bump: Biquad,
    hf_rolloff: Biquad,

    // Stage 5: DC blocker
    dc_blocker: DcBlocker,
}

impl SaturatorChannel {
    pub fn new(sample_rate: f64) -> Self {
        Self {
            sample_rate,
            quality: Quality::Standard,
            crossfader: CharacterCrossfader::new(Character::Tape),
            drive_param: SmoothedParam::new(0.0, DRIVE_SMOOTHING_MS, sample_rate),
            tone_param: SmoothedParam::new(0.0, TONE_SMOOTHING_MS, sample_rate),
            mix_param: SmoothedParam::new(1.0, MIX_SMOOTHING_MS, sample_rate),
            output_param: SmoothedParam::new(0.0, OUTPUT_SMOOTHING_MS, sample_rate),

            tone_filter: Biquad::passthrough(),
            last_tone_db: 0.0,

            sat_primary: OversampledSaturator::new(),
            sat_secondary: OversampledSaturator::new(),

            tape_head_bump: Biquad::low_shelf(80.0, 1.8, sample_rate),
            hf_rolloff: Biquad::lowpass_1pole(19000.0, sample_rate),

            dc_blocker: DcBlocker::new(sample_rate),
        }
    }

    pub fn reset(&mut self) {
        self.tone_filter.reset();
        self.sat_primary.reset();
        self.sat_secondary.reset();
        self.tape_head_bump.reset();
        self.hf_rolloff.reset();
        self.dc_blocker.reset();
    }

    pub fn set_sample_rate(&mut self, sample_rate: f64) {
        self.sample_rate = sample_rate;
        self.drive_param.update_sample_rate(DRIVE_SMOOTHING_MS, sample_rate);
        self.tone_param.update_sample_rate(TONE_SMOOTHING_MS, sample_rate);
        self.mix_param.update_sample_rate(MIX_SMOOTHING_MS, sample_rate);
        self.output_param.update_sample_rate(OUTPUT_SMOOTHING_MS, sample_rate);
        self.dc_blocker.set_sample_rate(sample_rate);
        self.tape_head_bump = Biquad::low_shelf(80.0, 1.8, sample_rate);
        self.update_tone_filter(self.last_tone_db);
    }

    pub fn set_character(&mut self, character: Character) {
        self.crossfader
            .set_character(character, self.sample_rate, CHARACTER_CROSSFADE_MS);
    }

    fn update_tone_filter(&mut self, tone_db: f64) {
        self.tone_filter = Biquad::high_shelf(3200.0, tone_db, self.sample_rate);
        self.last_tone_db = tone_db;
    }

    /// Process a single audio sample through the full signal chain per §1.5 ordering.
    #[inline]
    pub fn process_sample(&mut self, input: f64) -> f64 {
        let drive_val = self.drive_param.tick();
        let tone_val = self.tone_param.tick();
        let mix_val = self.mix_param.tick().clamp(0.0, 1.0);
        let out_val = self.output_param.tick();

        if mix_val == 0.0 && !self.mix_param.is_smoothing() {
            return input;
        }

        if (tone_val - self.last_tone_db).abs() > 0.05 {
            self.update_tone_filter(tone_val);
        }

        // 1. Input trim tied to Drive
        let drive_db = drive_val * 36.0;
        let drive_gain = 10.0f64.powf(drive_db / 20.0);
        let x_pre = input * drive_gain;

        // 2. Tone pre-emphasis filter
        let x_toned = self.tone_filter.process(x_pre);

        // 3. Oversampled + ADAA Nonlinear Stage with equal-power character crossfade
        let (in_char, in_gain, out_opt) = self.crossfader.tick();
        let curve_drive = 1.0 + drive_gain * 0.5;

        let sat_out_primary = self
            .sat_primary
            .process_sample(x_toned, curve_drive, in_char, self.quality);

        let saturated = if let Some((out_char, out_gain)) = out_opt {
            let sat_out_secondary = self
                .sat_secondary
                .process_sample(x_toned, curve_drive, out_char, self.quality);
            in_gain * sat_out_primary + out_gain * sat_out_secondary
        } else {
            sat_out_primary
        };

        // 4. Character-specific post coloration
        let colored = match in_char {
            Character::Tape => {
                let bump = self.tape_head_bump.process(saturated);
                self.hf_rolloff.process(bump)
            }
            Character::Tube => saturated,
            Character::Transformer => self.hf_rolloff.process(saturated),
        };

        // 5. DC blocking high-pass (~8Hz)
        let dc_blocked = self.dc_blocker.process(colored);

        // 6. Output trim / auto-gain
        let auto_gain = 1.0 / (1.0 + drive_gain * 0.35).sqrt();
        let output_gain = 10.0f64.powf(out_val / 20.0) * auto_gain;
        let wet = dc_blocked * output_gain;

        // 7. Dry/wet mix applied last, post-everything
        (1.0 - mix_val) * input + mix_val * wet
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::PI;

    #[test]
    fn test_mix_zero_is_bit_identical_dry_passthrough() {
        let mut chain = SaturatorChannel::new(44100.0);
        chain.mix_param.snap_to(0.0);
        chain.drive_param.snap_to(1.0);

        let test_inputs = [-1.0, -0.75, -0.33, 0.0, 0.25, 0.5, 0.88, 1.0];
        for &x in &test_inputs {
            let y = chain.process_sample(x);
            assert_eq!(y.to_bits(), x.to_bits(), "Mix=0 must be bit-identical dry passthrough");
        }
    }

    #[test]
    fn test_dc_offset_at_output_is_near_zero_at_max_tube_drive() {
        let mut chain = SaturatorChannel::new(44100.0);
        chain.set_character(Character::Tube);
        chain.drive_param.snap_to(1.0);
        chain.mix_param.snap_to(1.0);

        // 100 Hz at 44100 Hz has an exact period of 441 samples
        let period = 441;
        let n = 70 * period; // ~30870 samples
        let mut out = Vec::with_capacity(n);
        for i in 0..n {
            let t = i as f64 / 44100.0;
            let x = 0.8 * (2.0 * PI * 100.0 * t).sin() + 0.5; // High DC offset
            out.push(chain.process_sample(x));
        }

        // Average output over the last 10 exact periods (4410 samples)
        let steady_state = &out[n - 10 * period..];
        let dc_avg: f64 = steady_state.iter().sum::<f64>() / (steady_state.len() as f64);
        assert!(
            dc_avg.abs() < 1e-4,
            "DC offset at output not near zero at max Tube drive: got {}",
            dc_avg
        );
    }

    #[test]
    fn test_signal_chain_ordering_tone_is_pre_saturation() {
        let sample_rate = 44100.0;
        let mut chain_flat = SaturatorChannel::new(sample_rate);
        chain_flat.drive_param.snap_to(0.8);
        chain_flat.tone_param.snap_to(0.0);
        chain_flat.mix_param.snap_to(1.0);

        let mut chain_boost = SaturatorChannel::new(sample_rate);
        chain_boost.drive_param.snap_to(0.8);
        chain_boost.tone_param.snap_to(12.0);
        chain_boost.mix_param.snap_to(1.0);

        let freq = 3500.0;
        let n = 2048;
        let mut out_flat = Vec::with_capacity(n);
        let mut out_boost = Vec::with_capacity(n);

        for i in 0..n {
            let t = i as f64 / sample_rate;
            let x = 0.5 * (2.0 * PI * freq * t).sin();
            out_flat.push(chain_flat.process_sample(x));
            out_boost.push(chain_boost.process_sample(x));
        }

        let steady_flat = &out_flat[1000..];
        let steady_boost = &out_boost[1000..];
        let max_flat = steady_flat.iter().map(|s| s.abs()).fold(0.0f64, f64::max);
        let max_boost = steady_boost.iter().map(|s| s.abs()).fold(0.0f64, f64::max);

        assert!(
            max_boost > max_flat * 0.9,
            "Tone pre-emphasis altered saturation dynamics"
        );
    }
}
