import React, { useMemo } from 'react';
import { CharacterType } from '@sonods/sat-engine';

interface SaturatorCharacterFaceProps {
  drive: number; // 0.0 to 1.0 continuous
  character: CharacterType;
  audioPeak?: number; // 0.0 to 1.0 live audio amplitude
}

export const SaturatorCharacterFace: React.FC<SaturatorCharacterFaceProps> = ({
  drive,
  character,
  audioPeak = 0.0,
}) => {
  // Compute character-specific accent color and glow
  const charAccent = useMemo(() => {
    switch (character) {
      case 'tape':
        return { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', name: 'Tape Warmth' };
      case 'tube':
        return { primary: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)', name: 'Tube Warmth' };
      case 'transformer':
        return { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)', name: 'Transformer Iron' };
    }
  }, [character]);

  // Continuous animation parameters derived purely from drive and audio
  const bounceScale = 1.0 + audioPeak * 0.06 * (0.4 + drive * 0.6);

  // Rainbow stream continuous geometry (stays strictly inside 250px height)
  const streamLength = 35 + drive * 110 + audioPeak * 15;
  const waveAmp = (drive * 12 + audioPeak * 6);
  const widthTop = 22 + drive * 14;
  const widthBottom = 26 + drive * 50;

  const streamY0 = 84;
  const streamY1 = streamY0 + streamLength;

  // S-curve control offsets
  const c1y = streamY0 + streamLength * 0.35;
  const c2y = streamY0 + streamLength * 0.7;

  // Eye transition opacities (smooth crossfade between arch eyes and heart eyes)
  const archOpacity = Math.max(0, Math.min(1, 1 - (drive - 0.32) * 3.5));
  const heartOpacity = Math.max(0, Math.min(1, (drive - 0.32) * 3.5));
  const heartScale = 0.52 + drive * 0.16 + audioPeak * 0.05;

  // Continuous mouth depth
  const mouthDepth = 6 + drive * 20;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <svg
        width="180"
        height="240"
        viewBox="0 0 180 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0 0 ${6 + drive * 18}px ${charAccent.glow})`,
          overflow: 'visible',
          transition: 'filter 0.2s ease',
        }}
      >
        <defs>
          {/* Main vertical rainbow flow gradient */}
          <linearGradient id="satRainbowStream" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="18%" stopColor="#f97316" />
            <stop offset="38%" stopColor="#eab308" />
            <stop offset="58%" stopColor="#22c55e" />
            <stop offset="78%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Secondary horizontal spectrum gradient for multi-colored highlights */}
          <linearGradient id="satRainbowStripe" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="25%" stopColor="#eab308" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="75%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* --- Cascading Continuous Rainbow Stream --- */}
        <g opacity={0.88 + drive * 0.12}>
          {/* Outer glow layer for high drive */}
          {drive > 0.3 && (
            <path
              d={`
                M ${90 - widthTop / 2} ${streamY0}
                C ${90 - widthTop / 2 - waveAmp * 1.3} ${c1y},
                  ${90 - widthBottom / 2 + waveAmp * 1.3} ${c2y},
                  ${90 - widthBottom / 2 - 4} ${streamY1}
                L ${90 + widthBottom / 2 + 4} ${streamY1}
                C ${90 + widthBottom / 2 + waveAmp * 1.3} ${c2y},
                  ${90 + widthTop / 2 - waveAmp * 1.3} ${c1y},
                  ${90 + widthTop / 2} ${streamY0}
                Z
              `}
              fill="url(#satRainbowStream)"
              opacity={drive * 0.3}
              style={{ filter: 'blur(6px)' }}
            />
          )}

          {/* Main fluid rainbow ribbon */}
          <path
            d={`
              M ${90 - widthTop / 2} ${streamY0}
              C ${90 - widthTop / 2 - waveAmp} ${c1y},
                ${90 - widthBottom / 2 + waveAmp} ${c2y},
                ${90 - widthBottom / 2} ${streamY1}
              L ${90 + widthBottom / 2} ${streamY1}
              C ${90 + widthBottom / 2 + waveAmp} ${c2y},
                ${90 + widthTop / 2 - waveAmp} ${c1y},
                ${90 + widthTop / 2} ${streamY0}
              Z
            `}
            fill="url(#satRainbowStream)"
          />

          {/* Inner multi-colored highlight streak */}
          {drive > 0.15 && (
            <path
              d={`
                M ${90 - widthTop * 0.25} ${streamY0 + 4}
                C ${90 - waveAmp * 0.7} ${c1y},
                  ${90 + waveAmp * 0.7} ${c2y},
                  ${90 - widthBottom * 0.25} ${streamY1 - 4}
                L ${90 + widthBottom * 0.25} ${streamY1 - 4}
                C ${90 + waveAmp * 0.7} ${c2y},
                  ${90 - waveAmp * 0.7} ${c1y},
                  ${90 + widthTop * 0.25} ${streamY0 + 4}
                Z
              `}
              fill="url(#satRainbowStripe)"
              opacity={0.35 + drive * 0.35}
            />
          )}
        </g>

        {/* --- Cute Character Head --- */}
        <g transform={`translate(90, 60) scale(${bounceScale}) translate(-90, -60)`}>
          {/* Outer Head Circle */}
          <circle
            cx="90"
            cy="60"
            r="44"
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="3.5"
          />

          {/* Rosy Cheeks (continuous blush scaling with drive) */}
          <ellipse
            cx="58"
            cy="66"
            rx={6 + drive * 4}
            ry={4 + drive * 2}
            fill="#ff8da1"
            opacity={0.3 + drive * 0.6}
          />
          <ellipse
            cx="122"
            cy="66"
            rx={6 + drive * 4}
            ry={4 + drive * 2}
            fill="#ff8da1"
            opacity={0.3 + drive * 0.6}
          />

          {/* --- Eye Expressions (Continuous Crossfade) --- */}
          {/* 1. Arch Eyes ^ ^ (predominant at low drive) */}
          {archOpacity > 0 && (
            <g
              stroke="#18181B"
              strokeWidth={3.5 + drive * 0.5}
              strokeLinecap="round"
              fill="none"
              opacity={archOpacity}
            >
              <path d="M 62 53 Q 70 43 78 53" />
              <path d="M 102 53 Q 110 43 118 53" />
            </g>
          )}

          {/* 2. Heart Eyes ♥ ♥ (predominant at high drive) */}
          {heartOpacity > 0 && (
            <g
              fill={charAccent.primary}
              stroke="#18181B"
              strokeWidth="2.5"
              opacity={heartOpacity}
            >
              {/* Left Heart Eye */}
              <path
                d="M 70 53 C 70 47 64 43 59 46 C 54 49 55 55 59 60 L 70 69 L 81 60 C 85 55 86 49 81 46 C 76 43 70 47 70 53 Z"
                transform={`translate(70, 53) scale(${heartScale}) translate(-70, -53)`}
              />
              {/* Right Heart Eye */}
              <path
                d="M 110 53 C 110 47 104 43 99 46 C 94 49 95 55 99 60 L 110 69 L 121 60 C 125 55 126 49 121 46 C 116 43 110 47 110 53 Z"
                transform={`translate(110, 53) scale(${heartScale}) translate(-110, -53)`}
              />
            </g>
          )}

          {/* --- Mouth Expressions (Continuously opens and smiles wider) --- */}
          {drive < 0.2 ? (
            // Gentle content smile
            <path
              d={`M 78 68 Q 90 ${72 + drive * 30} 102 68`}
              stroke="#18181B"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            // Open smiling mouth that continuously opens wider
            <g>
              <path
                d={`M 78 67 Q 90 ${67 + mouthDepth} 102 67 Z`}
                fill="#ef4444"
                stroke="#18181B"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Tongue */}
              {mouthDepth > 10 && (
                <path
                  d={`M 83 ${67 + mouthDepth * 0.55} Q 90 ${67 + mouthDepth} 97 ${67 + mouthDepth * 0.55} Z`}
                  fill="#fda4af"
                />
              )}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
