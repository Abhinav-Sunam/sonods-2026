//! # SonoDS Saturator DSP Core (`sat_core`)
//!
//! Architectural Decision Record (Task 0.1 / Appendix B #1):
//! Direct path dependency on `dsp-core` is adopted to reuse proven filter/smoothing
//! mathematics without modifying the established EQ DSP crate.

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn sat_core_version() -> String {
    "0.1.0".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sat_core_scaffold() {
        assert_eq!(sat_core_version(), "0.1.0");
    }
}
