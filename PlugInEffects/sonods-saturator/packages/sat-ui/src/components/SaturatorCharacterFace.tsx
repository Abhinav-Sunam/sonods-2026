import React, { useMemo } from 'react';
import { CharacterType } from '@sonods/sat-engine';

interface SaturatorCharacterFaceProps {
  drive: number; // 0.0 to 1.0
  character: CharacterType;
  audioPeak?: number; // 0.0 to 1.0 live audio amplitude
}

export const SaturatorCharacterFace: React.FC<SaturatorCharacterFaceProps> = ({
  drive,
  character,
  audioPeak = 0.0,
}) => {
  // Determine character stage (1 to 4) based on drive
  const stage = useMemo(() => {
    if (drive < 0.25) return 1;
    if (drive < 0.55) return 2;
    if (drive < 0.85) return 3;
    return 4;
  }, [drive]);

  // Compute character-specific accent color and glow
  const charAccent = useMemo(() => {
    switch (character) {
      case 'tape':
        return { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', name: 'Tape Warmth' };
      case 'tube':
        return { primary: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', name: 'Tube Glow' };
      case 'transformer':
        return { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', name: 'Iron Punch' };
    }
  }, [character]);

  // Reactive scaling with audio drive
  const bounceScale = 1.0 + audioPeak * 0.08 * (0.5 + drive * 0.5);
  const streamLength = 40 + drive * 120 + audioPeak * 25;
  const waveAmp = stage === 4 ? 14 + audioPeak * 8 : stage === 3 ? 8 : 4;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '8px 0',
      }}
    >
      <svg
        width="160"
        height="220"
        viewBox="0 0 160 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0 0 ${8 + drive * 16}px ${charAccent.glow})`,
          overflow: 'visible',
          transition: 'filter 0.3s ease',
        }}
      >
        <defs>
          <linearGradient id="rainbowFlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="20%" stopColor="#f97316" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="60%" stopColor="#22c55e" />
            <stop offset="80%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- Cascading Rainbow Stream --- */}
        <g opacity={0.85 + drive * 0.15}>
          {stage === 1 && (
            // Calm straight rainbow beam
            <rect
              x="62"
              y="95"
              width="36"
              height={streamLength}
              rx="6"
              fill="url(#rainbowFlow)"
              opacity="0.8"
            />
          )}

          {stage === 2 && (
            // Flowing rainbow ribbon
            <path
              d={`M 60 95 Q 68 ${120 + waveAmp} 62 ${95 + streamLength} L 98 ${95 + streamLength} Q 92 ${120 + waveAmp} 100 95 Z`}
              fill="url(#rainbowFlow)"
            />
          )}

          {stage === 3 && (
            // Radiant expanding rainbow stream
            <path
              d={`M 56 95 Q 48 ${130 + waveAmp} 52 ${95 + streamLength} L 108 ${95 + streamLength} Q 112 ${130 + waveAmp} 104 95 Z`}
              fill="url(#rainbowFlow)"
            />
          )}

          {stage === 4 && (
            // Ecstatic long wavy waterfall cascade
            <path
              d={`M 54 95 Q ${42 - waveAmp} ${125} ${58 + waveAmp} ${155} Q ${44 - waveAmp} ${185} 50 ${95 + streamLength} L 110 ${95 + streamLength} Q ${116 + waveAmp} ${185} ${102 - waveAmp} ${155} Q ${118 + waveAmp} ${125} 106 95 Z`}
              fill="url(#rainbowFlow)"
            />
          )}
        </g>

        {/* --- Cute Character Head --- */}
        <g transform={`translate(80, 58) scale(${bounceScale}) translate(-80, -58)`}>
          {/* Outer Head Circle */}
          <circle
            cx="80"
            cy="58"
            r="44"
            fill="#ffffff"
            stroke="#1a1c23"
            strokeWidth="3.5"
            style={{
              transition: 'fill 0.2s ease',
            }}
          />

          {/* Rosy Cheeks (blush) */}
          <ellipse
            cx="48"
            cy="65"
            rx={stage >= 3 ? 9 : 7}
            ry="5"
            fill="#ff8da1"
            opacity={0.5 + drive * 0.5}
          />
          <ellipse
            cx="112"
            cy="65"
            rx={stage >= 3 ? 9 : 7}
            ry="5"
            fill="#ff8da1"
            opacity={0.5 + drive * 0.5}
          />

          {/* --- Eye Expressions --- */}
          {stage === 1 && (
            // Stage 1: Content happy arch eyes ^ ^
            <g stroke="#1a1c23" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M 52 52 Q 60 43 68 52" />
              <path d="M 92 52 Q 100 43 108 52" />
            </g>
          )}

          {stage === 2 && (
            // Stage 2: Blushing winking happy eyes ^ ^
            <g stroke="#1a1c23" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M 50 51 Q 60 39 70 51" />
              <path d="M 90 51 Q 100 39 110 51" />
            </g>
          )}

          {(stage === 3 || stage === 4) && (
            // Stage 3 & 4: Radiant Heart Eyes ♥ ♥
            <g fill={charAccent.primary} stroke="#1a1c23" strokeWidth="2.5">
              {/* Left Heart Eye */}
              <path
                d="M 60 52 C 60 46 54 42 49 45 C 44 48 45 54 49 59 L 60 68 L 71 59 C 75 54 76 48 71 45 C 66 42 60 46 60 52 Z"
                transform="translate(60, 52) scale(0.65) translate(-60, -52)"
              />
              {/* Right Heart Eye */}
              <path
                d="M 100 52 C 100 46 94 42 89 45 C 84 48 85 54 89 59 L 100 68 L 111 59 C 115 54 116 48 111 45 C 106 42 100 46 100 52 Z"
                transform="translate(100, 52) scale(0.65) translate(-100, -52)"
              />
            </g>
          )}

          {/* --- Mouth Expressions --- */}
          {stage === 1 && (
            // Stage 1: Content gentle smile
            <path
              d="M 70 66 Q 80 75 90 66"
              stroke="#1a1c23"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {stage === 2 && (
            // Stage 2: Happy open smile ^ ▽ ^
            <path
              d="M 68 64 Q 80 82 92 64 Z"
              fill="#ef4444"
              stroke="#1a1c23"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
          )}

          {stage === 3 && (
            // Stage 3: Wide happy smile with tooth
            <g>
              <path
                d="M 66 64 Q 80 86 94 64 Z"
                fill="#e11d48"
                stroke="#1a1c23"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Tongue/Highlight */}
              <path
                d="M 72 75 Q 80 84 88 75 Z"
                fill="#fb7185"
              />
            </g>
          )}

          {stage === 4 && (
            // Stage 4: Ecstatic open mouth in saturation bliss ♥ O ♥
            <g>
              <ellipse
                cx="80"
                cy="72"
                rx="14"
                ry="16"
                fill="#be123c"
                stroke="#1a1c23"
                strokeWidth="3.5"
              />
              <ellipse
                cx="80"
                cy="77"
                rx="8"
                ry="8"
                fill="#fda4af"
              />
            </g>
          )}
        </g>
      </svg>

      {/* Stage Badge & Label */}
      <div
        style={{
          marginTop: '6px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: charAccent.primary,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>Stage {stage}</span>
        <span style={{ color: 'var(--sat-text-muted)' }}>•</span>
        <span>{charAccent.name}</span>
      </div>
    </div>
  );
};
