//! Pure waveshaper transfer curves for Tape, Tube, and Transformer.

/// Tunable bias constant for Tube character (tuned by ear in Task 1.8, not final yet).
pub const TUBE_DEFAULT_BIAS: f64 = 0.2;

/// Tunable blend ratio for Transformer character (tuned by ear in Task 1.8, not final yet).
pub const TRANSFORMER_TUBE_BLEND: f64 = 0.2;

/// Scaling factor for Transformer quadratic soft-clipping term (tune later in Task 1.8).
pub const TRANSFORMER_K_SCALE: f64 = 0.35;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Character {
    Tape,
    Tube,
    Transformer,
}

/// Pure, stateless waveshaper transfer function.
///
/// - `Tape`: `tanh(drive * x) / tanh(drive)`
/// - `Tube`: `tanh(drive * (x + bias)) - tanh(drive * bias)` with DC offset correction
/// - `Transformer`: `x - k * x * |x|` blended with Tube curve
#[inline]
pub fn shape(x: f64, drive: f64, character: Character) -> f64 {
    match character {
        Character::Tape => shape_tape(x, drive),
        Character::Tube => shape_tube(x, drive, TUBE_DEFAULT_BIAS),
        Character::Transformer => shape_transformer(x, drive),
    }
}

#[inline]
pub fn shape_tape(x: f64, drive: f64) -> f64 {
    if drive.abs() < 1e-7 {
        x
    } else {
        let denom = drive.tanh();
        if denom.abs() < 1e-7 {
            x
        } else {
            (drive * x).tanh() / denom
        }
    }
}

#[inline]
pub fn shape_tube(x: f64, drive: f64, bias: f64) -> f64 {
    if drive.abs() < 1e-7 {
        x
    } else {
        // Includes the DC-offset correction term: - tanh(drive * bias)
        (drive * (x + bias)).tanh() - (drive * bias).tanh()
    }
}

#[inline]
pub fn shape_transformer(x: f64, drive: f64) -> f64 {
    let k = TRANSFORMER_K_SCALE * (drive / (1.0 + drive.abs()));
    let quad = x - k * x * x.abs();
    let tube_part = shape_tube(x, drive, TUBE_DEFAULT_BIAS);
    (1.0 - TRANSFORMER_TUBE_BLEND) * quad + TRANSFORMER_TUBE_BLEND * tube_part
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tube_dc_offset_is_zero_at_x_zero() {
        // Assert output at x=0 is exactly 0.0 for all drive/bias combinations
        let drives = [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
        let biases = [0.0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.8];

        for &drive in &drives {
            for &bias in &biases {
                let out = shape_tube(0.0, drive, bias);
                assert!(
                    out.abs() < 1e-12,
                    "Tube DC offset not zero at x=0: drive={}, bias={}, out={}",
                    drive,
                    bias,
                    out
                );
            }
        }
    }

    #[test]
    fn test_tape_zero_and_symmetry() {
        let drives = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
        for &drive in &drives {
            assert!(shape_tape(0.0, drive).abs() < 1e-12);
            // Tape is symmetric (odd function): f(-x) == -f(x)
            for &x in &[0.1, 0.5, 0.9, 1.5] {
                let pos = shape_tape(x, drive);
                let neg = shape_tape(-x, drive);
                assert!((pos + neg).abs() < 1e-10, "Tape should be symmetric odd function");
            }
        }
    }

    #[test]
    fn test_transformer_zero_at_x_zero() {
        let drives = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
        for &drive in &drives {
            let out = shape_transformer(0.0, drive);
            assert!(
                out.abs() < 1e-12,
                "Transformer not zero at x=0: drive={}, out={}",
                drive,
                out
            );
        }
    }

    #[test]
    fn test_curves_grid_evaluation() {
        let x_grid: Vec<f64> = (-20..=20).map(|i| i as f64 * 0.1).collect();
        let drives = [0.2, 0.5, 1.0, 2.0, 4.0, 8.0];

        for &drive in &drives {
            for &x in &x_grid {
                let tape = shape(x, drive, Character::Tape);
                let tube = shape(x, drive, Character::Tube);
                let xfmr = shape(x, drive, Character::Transformer);

                assert!(tape.is_finite(), "Tape output not finite at x={}, drive={}", x, drive);
                assert!(tube.is_finite(), "Tube output not finite at x={}, drive={}", x, drive);
                assert!(xfmr.is_finite(), "Transformer output not finite at x={}, drive={}", x, drive);

                // Closed-form exact verification for Tape
                let expected_tape = (drive * x).tanh() / drive.tanh();
                assert!((tape - expected_tape).abs() < 1e-10);

                // Closed-form exact verification for Tube
                let expected_tube = (drive * (x + TUBE_DEFAULT_BIAS)).tanh() - (drive * TUBE_DEFAULT_BIAS).tanh();
                assert!((tube - expected_tube).abs() < 1e-10);
            }
        }
    }
}
