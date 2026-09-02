//! 2nd-order Antiderivative Anti-Aliasing (ADAA2) with numerically-stable fallbacks.

use crate::antideriv::{antideriv1, antideriv2};
use crate::waveshaper::{shape, Character};

const EPSILON: f64 = 1e-5;

/// Stateful 2nd-order ADAA processor for a single audio channel.
#[derive(Debug, Clone)]
pub struct AdaaState {
    x1: f64,
    x2: f64,
}

impl Default for AdaaState {
    fn default() -> Self {
        Self::new()
    }
}

impl AdaaState {
    pub fn new() -> Self {
        Self { x1: 0.0, x2: 0.0 }
    }

    pub fn reset(&mut self) {
        self.x1 = 0.0;
        self.x2 = 0.0;
    }

    /// Process a single audio sample through 2nd-order ADAA.
    pub fn process_sample(&mut self, x0: f64, drive: f64, character: Character) -> f64 {
        let x1 = self.x1;
        let x2 = self.x2;

        let delta_01 = x0 - x1;
        let delta_12 = x1 - x2;
        let delta_02 = x0 - x2;

        let y = if delta_02.abs() >= EPSILON {
            // F2 terms for 2nd order ADAA
            let f2_01 = if delta_01.abs() >= EPSILON {
                (antideriv2(x0, drive, character) - antideriv2(x1, drive, character)) / delta_01
            } else {
                antideriv1(0.5 * (x0 + x1), drive, character)
            };

            let f2_12 = if delta_12.abs() >= EPSILON {
                (antideriv2(x1, drive, character) - antideriv2(x2, drive, character)) / delta_12
            } else {
                antideriv1(0.5 * (x1 + x2), drive, character)
            };

            2.0 * (f2_01 - f2_12) / delta_02
        } else if delta_01.abs() >= EPSILON {
            // Fallback to 1st order ADAA
            (antideriv1(x0, drive, character) - antideriv1(x1, drive, character)) / delta_01
        } else {
            // Fallback to direct shape evaluation on near-zero delta
            shape(0.5 * (x0 + x1), drive, character)
        };

        self.x2 = self.x1;
        self.x1 = x0;

        // Clean up denormals or NaN safety
        if y.is_nan() || y.is_infinite() {
            shape(x0, drive, character)
        } else {
            y
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::PI;

    /// Simple DFT to measure harmonic energy and alias energy
    fn compute_spectrum(signal: &[f64]) -> Vec<f64> {
        let n = signal.len();
        let mut magnitudes = vec![0.0; n / 2];
        for k in 0..n / 2 {
            let mut real = 0.0;
            let mut imag = 0.0;
            for (t, &s) in signal.iter().enumerate() {
                // Apply Hann window
                let w = 0.5 * (1.0 - (2.0 * PI * (t as f64) / (n as f64)).cos());
                let angle = 2.0 * PI * (k as f64) * (t as f64) / (n as f64);
                real += s * w * angle.cos();
                imag -= s * w * angle.sin();
            }
            magnitudes[k] = (real * real + imag * imag).sqrt() / (n as f64);
        }
        magnitudes
    }

    #[test]
    fn test_adaa_reduces_aliasing_versus_naive() {
        let sample_rate = 44100.0;
        let freq = 6000.0; // High frequency sine wave where harmonics fold over
        let n_samples = 2048;
        let drive = 4.0;
        let characters = [Character::Tape, Character::Tube, Character::Transformer];

        for &charac in &characters {
            let mut naive_out = Vec::with_capacity(n_samples);
            let mut adaa_out = Vec::with_capacity(n_samples);
            let mut adaa = AdaaState::new();

            for i in 0..n_samples {
                let t = i as f64 / sample_rate;
                let x = (2.0 * PI * freq * t).sin();
                naive_out.push(shape(x, drive, charac));
                adaa_out.push(adaa.process_sample(x, drive, charac));
            }

            // Verify outputs are stable and finite
            for &sample in &adaa_out {
                assert!(sample.is_finite(), "ADAA output not finite for {:?}", charac);
            }

            let naive_mag = compute_spectrum(&naive_out);
            let adaa_mag = compute_spectrum(&adaa_out);

            // Calculate high frequency aliased noise energy (above 18kHz)
            let high_freq_bin = (18000.0 / (sample_rate / 2.0) * (naive_mag.len() as f64)) as usize;
            let naive_hf_energy: f64 = naive_mag[high_freq_bin..].iter().map(|&m| m * m).sum();
            let adaa_hf_energy: f64 = adaa_mag[high_freq_bin..].iter().map(|&m| m * m).sum();

            assert!(
                adaa_hf_energy <= naive_hf_energy * 1.05,
                "ADAA should reduce or maintain HF alias energy for {:?}: adaa={}, naive={}",
                charac,
                adaa_hf_energy,
                naive_hf_energy
            );
        }
    }

    #[test]
    fn test_adaa_near_zero_delta_fallback() {
        let mut adaa = AdaaState::new();
        // Constant DC input: delta is 0
        let x = 0.5;
        let drive = 2.0;
        let expected = shape(x, drive, Character::Tape);

        // Warm-up to steady DC state
        adaa.process_sample(x, drive, Character::Tape);
        adaa.process_sample(x, drive, Character::Tape);

        // Steady-state DC check
        for _ in 0..8 {
            let out = adaa.process_sample(x, drive, Character::Tape);
            assert!(
                (out - expected).abs() < 1e-4,
                "ADAA constant DC fallback failed: got {}, expected {}",
                out,
                expected
            );
        }
    }
}
