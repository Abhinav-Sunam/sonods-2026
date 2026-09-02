//! SonoDS Compressor DSP Core
//!
//! Architecture decisions:
//! - Task 0.1: Self-contained minimal crate without external workspace coupling.
//! - Task 0.3: Feedforward detection topology for Phase 1-4; feedback character in Phase 5.
//! - Task 0.4: Fixed per-character soft knee default conforming to 4-knob hardware layout.
//!
//! Formula references:
//! Giannoulis, Massberg & Reiss, "Digital Dynamic Range Compressor Design — A Tutorial and Analysis",
//! JAES vol. 60 no. 6, 2012.

pub mod compressor;
pub mod denormals;
pub mod detector;
pub mod gain_computer;
pub mod lookahead;
pub mod param_smoother;
pub mod sidechain;
pub mod smoother;

pub use compressor::{CompressorCharacter, CompressorCore};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn comp_core_version() -> String {
    "0.1.0".to_string()
}

#[cfg(test)]
mod silence_transient_tests {
    use super::*;

    #[test]
    fn test_silence_then_transient_denormal_safety() {
        let mut comp = CompressorCore::new(48000.0);
        comp.set_threshold_immediate(-12.0);
        comp.set_ratio_immediate(4.0);

        // Feed 50,000 samples of pure digital silence (could trigger denormals in leaky integrators)
        for _ in 0..50000 {
            let (l, r) = comp.process_sample(0.0, 0.0);
            assert!(!l.is_nan(), "Left channel became NaN during silence");
            assert!(!r.is_nan(), "Right channel became NaN during silence");
            assert_eq!(l, 0.0);
            assert_eq!(r, 0.0);
        }

        // Sudden transient attack after silence
        let (tl, tr) = comp.process_sample(0.95, 0.95);
        assert!(!tl.is_nan(), "Transient caused NaN on left");
        assert!(!tr.is_nan(), "Transient caused NaN on right");
        assert!(tl.is_finite());
        assert!(tr.is_finite());
    }
}
