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

pub mod detector;
pub mod gain_computer;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn comp_core_version() -> String {
    "0.1.0".to_string()
}
