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

// =========================================================================
// C / WASM FFI Exports for AudioWorklet Integration (Phase 2)
// =========================================================================

#[no_mangle]
pub extern "C" fn create_compressor(sample_rate: f64) -> *mut CompressorCore {
    let core = Box::new(CompressorCore::new(sample_rate));
    Box::into_raw(core)
}

#[no_mangle]
pub extern "C" fn destroy_compressor(ptr: *mut CompressorCore) {
    if !ptr.is_null() {
        unsafe {
            let _ = Box::from_raw(ptr);
        }
    }
}

#[no_mangle]
pub extern "C" fn set_sample_rate(ptr: *mut CompressorCore, sample_rate: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_sample_rate(sample_rate);
    }
}

#[no_mangle]
pub extern "C" fn set_threshold(ptr: *mut CompressorCore, threshold_db: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_threshold_db(threshold_db);
    }
}

#[no_mangle]
pub extern "C" fn set_ratio(ptr: *mut CompressorCore, ratio: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_ratio(ratio);
    }
}

#[no_mangle]
pub extern "C" fn set_attack(ptr: *mut CompressorCore, attack_s: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_attack_s(attack_s);
    }
}

#[no_mangle]
pub extern "C" fn set_release(ptr: *mut CompressorCore, release_s: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_release_s(release_s);
    }
}

#[no_mangle]
pub extern "C" fn set_knee(ptr: *mut CompressorCore, knee_db: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_knee_db(knee_db);
    }
}

#[no_mangle]
pub extern "C" fn set_stereo_link(ptr: *mut CompressorCore, link: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_link(link);
    }
}

#[no_mangle]
pub extern "C" fn set_mix(ptr: *mut CompressorCore, mix: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_mix(mix);
    }
}

#[no_mangle]
pub extern "C" fn set_output_gain(ptr: *mut CompressorCore, gain_db: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_output_gain_db(gain_db);
    }
}

#[no_mangle]
pub extern "C" fn set_auto_gain(ptr: *mut CompressorCore, amount: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_auto_gain(amount);
    }
}

#[no_mangle]
pub extern "C" fn set_sidechain_hpf(ptr: *mut CompressorCore, cutoff_hz: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_sidechain_hpf(cutoff_hz);
    }
}

#[no_mangle]
pub extern "C" fn set_lookahead(ptr: *mut CompressorCore, lookahead_s: f64) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        comp.set_lookahead(lookahead_s);
    }
}

#[no_mangle]
pub extern "C" fn set_character(ptr: *mut CompressorCore, char_id: u32) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        let character = match char_id {
            0 => CompressorCharacter::Vca,
            1 => CompressorCharacter::Opto,
            2 => CompressorCharacter::Fet,
            _ => CompressorCharacter::Vca,
        };
        comp.set_character(character);
    }
}

#[no_mangle]
pub extern "C" fn get_gain_reduction_db(ptr: *mut CompressorCore) -> f64 {
    if let Some(comp) = unsafe { ptr.as_ref() } {
        comp.current_gain_reduction_db()
    } else {
        0.0
    }
}

#[no_mangle]
pub extern "C" fn process_block(
    ptr: *mut CompressorCore,
    left_ptr: *mut f32,
    right_ptr: *mut f32,
    len: usize,
) {
    if let Some(comp) = unsafe { ptr.as_mut() } {
        if !left_ptr.is_null() && !right_ptr.is_null() && len > 0 {
            let left = unsafe { std::slice::from_raw_parts_mut(left_ptr, len) };
            let right = unsafe { std::slice::from_raw_parts_mut(right_ptr, len) };
            for i in 0..len {
                let (out_l, out_r) = comp.process_sample(left[i] as f64, right[i] as f64);
                left[i] = out_l as f32;
                right[i] = out_r as f32;
            }
        }
    }
}

#[no_mangle]
pub extern "C" fn allocate_f32_buffer(len: usize) -> *mut f32 {
    let mut vec = vec![0.0f32; len];
    let ptr = vec.as_mut_ptr();
    std::mem::forget(vec);
    ptr
}

#[no_mangle]
pub extern "C" fn deallocate_f32_buffer(ptr: *mut f32, len: usize) {
    if !ptr.is_null() {
        unsafe {
            let _ = Vec::from_raw_parts(ptr, len, len);
        }
    }
}

#[cfg(test)]
mod silence_transient_tests {
    use super::*;

    #[test]
    fn test_silence_then_transient_denormal_safety() {
        let mut comp = CompressorCore::new(48000.0);
        comp.set_threshold_immediate(-12.0);
        comp.set_ratio_immediate(4.0);

        for _ in 0..50000 {
            let (l, r) = comp.process_sample(0.0, 0.0);
            assert!(!l.is_nan(), "Left channel became NaN during silence");
            assert!(!r.is_nan(), "Right channel became NaN during silence");
            assert_eq!(l, 0.0);
            assert_eq!(r, 0.0);
        }

        let (tl, tr) = comp.process_sample(0.95, 0.95);
        assert!(!tl.is_nan(), "Transient caused NaN on left");
        assert!(!tr.is_nan(), "Transient caused NaN on right");
        assert!(tl.is_finite());
        assert!(tr.is_finite());
    }
}
