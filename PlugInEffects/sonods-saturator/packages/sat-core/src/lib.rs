//! # SonoDS Saturator DSP Core (`sat_core`)
//!
//! ## Architecture Decisions (Phase 0)
//! - **Task 0.1 (Shared Crate Decision)**: Option B (Shared / modular primitives).
//! - **Task 0.2 (Design Tokens Decision)**: Option B (Self-contained design tokens).
//! - **Task 0.3 (JA Solver Method)**: Runge-Kutta (RK4/RK2).
//! - **Task 0.4 (Keyframe Character Art)**: Hand-drawn 4-stage character art mapping 0% -> 100% drive.
//! - **Task 0.5 (Phase 6 Scope)**: Kept in scope for unified session intelligence.

pub mod adaa;
pub mod antideriv;
pub mod oversampling;
pub mod smoothing;
pub mod waveshaper;

pub use adaa::AdaaState;
pub use antideriv::{antideriv1, antideriv2};
pub use oversampling::{HalfBand2x, OversampledSaturator, Quality};
pub use smoothing::{
    CharacterCrossfader, SmoothedParam, CHARACTER_CROSSFADE_MS, DRIVE_SMOOTHING_MS,
    MIX_SMOOTHING_MS, OUTPUT_SMOOTHING_MS, TONE_SMOOTHING_MS,
};
pub use waveshaper::{
    shape, shape_tape, shape_transformer, shape_tube, Character, TRANSFORMER_K_SCALE,
    TRANSFORMER_TUBE_BLEND, TUBE_DEFAULT_BIAS,
};
