//! Parameter smoothing and equal-power character crossfading.

use crate::waveshaper::Character;
use std::f64::consts::PI;

pub const DRIVE_SMOOTHING_MS: f64 = 20.0;
pub const TONE_SMOOTHING_MS: f64 = 20.0;
pub const MIX_SMOOTHING_MS: f64 = 15.0;
pub const OUTPUT_SMOOTHING_MS: f64 = 15.0;
pub const CHARACTER_CROSSFADE_MS: f64 = 40.0;

/// Exponential parameter smoother.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SmoothedParam {
    pub current: f64,
    pub target: f64,
    pub coeff: f64,
}

impl SmoothedParam {
    pub fn new(initial_value: f64, time_constant_ms: f64, sample_rate: f64) -> Self {
        let time_sec = (time_constant_ms / 1000.0).max(1e-6);
        let coeff = (-1.0 / (time_sec * sample_rate)).exp();
        Self {
            current: initial_value,
            target: initial_value,
            coeff,
        }
    }

    pub fn update_sample_rate(&mut self, time_constant_ms: f64, sample_rate: f64) {
        let time_sec = (time_constant_ms / 1000.0).max(1e-6);
        self.coeff = (-1.0 / (time_sec * sample_rate)).exp();
    }

    pub fn set_target(&mut self, target: f64) {
        self.target = target;
    }

    pub fn snap_to(&mut self, value: f64) {
        self.current = value;
        self.target = value;
    }

    #[inline(always)]
    pub fn tick(&mut self) -> f64 {
        if (self.current - self.target).abs() < 1e-9 {
            self.current = self.target;
        } else {
            self.current = self.target + (self.current - self.target) * self.coeff;
        }
        self.current
    }

    pub fn is_smoothing(&self) -> bool {
        (self.current - self.target).abs() > 1e-9
    }
}

/// Equal-power character crossfader between outgoing and incoming character curves.
#[derive(Debug, Clone)]
pub struct CharacterCrossfader {
    pub current_char: Character,
    pub outgoing_char: Option<Character>,
    progress: f64,
    step: f64,
}

impl CharacterCrossfader {
    pub fn new(initial: Character) -> Self {
        Self {
            current_char: initial,
            outgoing_char: None,
            progress: 1.0,
            step: 0.0,
        }
    }

    pub fn set_character(&mut self, target: Character, sample_rate: f64, duration_ms: f64) {
        if target == self.current_char && self.outgoing_char.is_none() {
            return;
        }

        self.outgoing_char = Some(self.current_char);
        self.current_char = target;
        self.progress = 0.0;

        let total_samples = (duration_ms / 1000.0 * sample_rate).max(1.0);
        self.step = 1.0 / total_samples;
    }

    pub fn is_transitioning(&self) -> bool {
        self.outgoing_char.is_some()
    }

    /// Advance one sample and return active character(s) and their equal-power weights.
    /// Returns: (incoming_char, incoming_gain, outgoing_char, outgoing_gain)
    #[inline]
    pub fn tick(&mut self) -> (Character, f64, Option<(Character, f64)>) {
        if let Some(outgoing) = self.outgoing_char {
            self.progress += self.step;
            if self.progress >= 1.0 {
                self.progress = 1.0;
                self.outgoing_char = None;
                (self.current_char, 1.0, None)
            } else {
                // Equal-power crossfade curves:
                // out_gain = cos(0.5 * PI * progress)
                // in_gain = sin(0.5 * PI * progress)
                let angle = 0.5 * PI * self.progress;
                let in_gain = angle.sin();
                let out_gain = angle.cos();
                (self.current_char, in_gain, Some((outgoing, out_gain)))
            }
        } else {
            (self.current_char, 1.0, None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_smoothed_param_click_free_rapid_automation() {
        let sample_rate = 44100.0;
        let mut drive_param = SmoothedParam::new(1.0, DRIVE_SMOOTHING_MS, sample_rate);

        // Rapid step automation from 1.0 to 10.0
        drive_param.set_target(10.0);

        let mut prev_val = 1.0;
        let mut max_delta: f64 = 0.0;

        for _ in 0..15000 {
            let val = drive_param.tick();
            let delta = (val - prev_val).abs();
            if delta > max_delta {
                max_delta = delta;
            }
            prev_val = val;
        }

        // Maximum step per sample must be tiny (zipper-noise free)
        assert!(
            max_delta < 0.02,
            "Smoothing delta too large (potential zipper noise): {}",
            max_delta
        );
        assert!((drive_param.current - 10.0).abs() < 1e-4);
    }

    #[test]
    fn test_character_equal_power_crossfade() {
        let sample_rate = 44100.0;
        let mut crossfader = CharacterCrossfader::new(Character::Tape);

        crossfader.set_character(Character::Tube, sample_rate, CHARACTER_CROSSFADE_MS);
        assert!(crossfader.is_transitioning());

        let mut samples_count = 0;
        while crossfader.is_transitioning() {
            let (_in_char, in_gain, out_opt) = crossfader.tick();
            if let Some((_out_char, out_gain)) = out_opt {
                // Assert equal-power conservation: in_gain^2 + out_gain^2 == 1.0
                let power_sum = in_gain * in_gain + out_gain * out_gain;
                assert!(
                    (power_sum - 1.0).abs() < 1e-6,
                    "Equal power not conserved during crossfade: got {}",
                    power_sum
                );
            }
            samples_count += 1;
        }

        assert_eq!(crossfader.current_char, Character::Tube);
        assert!(!crossfader.is_transitioning());
        assert!(samples_count > 100, "Crossfade window too short");
    }
}
