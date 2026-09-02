import React, { useMemo } from 'react';
import { CharacterType } from '@sonods/sat-engine';

interface SaturatorCharacterFaceProps {
  drive: number; // 0.0 to 1.0 continuous
  character: CharacterType;
  audioPeak?: number; // 0.0 to 1.0 live audio amplitude
}

// 6 distinct vibrant rainbow colors matching the user's hand-drawn marker reference
const RAINBOW_STRIPES = [
  '#38bdf8', // Light blue (bottom outer)
  '#ef4444', // Red
  '#22c55e', // Lime green
  '#facc15', // Vibrant yellow
  '#f97316', // Orange
  '#ec4899', // Hot pink (top outer)
];

export const SaturatorCharacterFace: React.FC<SaturatorCharacterFaceProps> = ({
  drive,
  character,
  audioPeak = 0.0,
}) => {
  // Character-specific glow and heart color
  const charAccent = useMemo(() => {
    switch (character) {
      case 'tape':
        return { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)' };
      case 'tube':
        return { primary: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)' };
      case 'transformer':
        return { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)' };
    }
  }, [character]);

  // Audio-reactive bounce and wave modulation
  const bounceY = -audioPeak * 6 * (0.3 + drive * 0.7);
  const headTilt = (drive - 0.5) * 4 + Math.sin(audioPeak * Math.PI) * 2;
  const waveWobble = audioPeak * 10 * drive;

  // Eye crossfade: caret eyes (low drive) -> heart eyes (high drive)
  const caretOpacity = Math.max(0, Math.min(1, 1 - (drive - 0.25) * 3));
  const heartOpacity = Math.max(0, Math.min(1, (drive - 0.25) * 3));
  const heartScale = 0.65 + drive * 0.25 + audioPeak * 0.08;

  // Mouth continuous geometry
  const mouthOpen = Math.max(0, (drive - 0.15) / 0.85); // 0 to 1
  const mouthW = 16 + mouthOpen * 14;
  const mouthH = 6 + mouthOpen * 18;

  // Rainbow waterfall stream length & wave parameters
  const streamProgress = Math.max(0, (drive - 0.05) / 0.95); // 0 to 1
  const streamLength = streamProgress * 130;
  const sWave = (14 + waveWobble) * streamProgress;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        width: '100%',
        height: '100%',
      }}
    >
      <svg
        width="260"
        height="300"
        viewBox="0 0 260 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          overflow: 'visible',
          filter: `drop-shadow(0 4px ${12 + drive * 16}px ${charAccent.glow})`,
          transition: 'filter 0.15s ease',
        }}
      >
        {/* =========================================================
            RAINBOW WATERFALL STREAM (FLOWS OUT OF MOUTH TO RIGHT)
            Directly matching the user's hand-drawn marker art!
            ========================================================= */}
        {streamProgress > 0.02 && (
          <g opacity={0.92 + drive * 0.08}>
            {RAINBOW_STRIPES.map((color, i) => {
              const stripeOffset = (i - 2.5) * (3.5 + drive * 1.5);
              const startX = 100 + stripeOffset;
              const startY = 120 + mouthH * 0.7;

              // Bezier S-curve control points cascading down and sweeping to the right
              const cp1x = startX - 8 + sWave * 0.4;
              const cp1y = startY + streamLength * 0.25;
              const cp2x = startX + 35 + sWave * 1.2;
              const cp2y = startY + streamLength * 0.6;
              const endX = startX + 60 + sWave * 1.6;
              const endY = startY + streamLength;

              return (
                <path
                  key={i}
                  d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
                  stroke={color}
                  strokeWidth={5 + drive * 2}
                  strokeLinecap="round"
                  fill="none"
                />
              );
            })}
          </g>
        )}

        {/* =========================================================
            CHARACTER HEAD & BODY (DOODLE / INK STYLE MATCHING ART)
            ========================================================= */}
        <g
          transform={`translate(100, 110) rotate(${headTilt}) translate(-100, -110) translate(0, ${bounceY})`}
        >
          {/* --- Torso / Shirt Collar (under head) --- */}
          <path
            d="M 76 142 L 72 178 Q 100 186 128 178 L 124 142 Z"
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Shirt collar notch */}
          <path
            d="M 88 144 Q 100 154 112 144"
            stroke="#18181B"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* --- Back Hair (Left side clump flowing down behind ear) --- */}
          {/* Traced directly from user's doodle: 3 distinct puffy wavy tufts down the left */}
          <path
            d="
              M 64 88
              C 48 98, 42 118, 46 136
              C 40 148, 46 164, 58 168
              C 62 178, 76 178, 80 166
              C 86 158, 82 146, 78 136
            "
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* --- Main Face Outline --- */}
          <path
            d="
              M 66 84
              C 64 116, 74 142, 100 142
              C 126 142, 136 116, 134 84
              C 134 54, 66 54, 66 84
              Z
            "
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* --- Left Ear --- */}
          <path
            d="M 66 82 C 58 82, 58 98, 66 98"
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* --- Right Ear --- */}
          <path
            d="M 134 82 C 142 82, 142 98, 134 98"
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* --- Fluffy Cloud-Like Top Hair --- */}
          {/* Traced directly from user's doodle: wavy puffy tufts along the crown and right */}
          <path
            d="
              M 64 80
              C 46 72, 42 50, 56 38
              C 62 26, 76 28, 84 20
              C 94 10, 110 12, 120 18
              C 132 12, 146 18, 150 28
              C 162 34, 168 50, 156 64
              C 152 74, 146 80, 136 82
            "
            fill="#FFFFFF"
            stroke="#18181B"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Hair definition doodle strokes */}
          <path
            d="M 74 44 Q 84 38 94 46"
            stroke="#18181B"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 112 36 Q 124 32 134 42"
            stroke="#18181B"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* =========================================================
              FACIAL FEATURES
              ========================================================= */}

          {/* --- Slanted Pink Blush Marks (/// and \\\) --- */}
          {/* Exactly as drawn in the user's doodle: 3 diagonal pink marker strokes per cheek */}
          {drive > 0.1 && (
            <g opacity={Math.min(1, (drive - 0.1) * 2)} stroke="#ff2a85" strokeWidth="3" strokeLinecap="round">
              {/* Left Cheek Blush (///) */}
              <line x1="72" y1="96" x2="76" y2="104" />
              <line x1="77" y1="94" x2="81" y2="102" />
              <line x1="82" y1="92" x2="86" y2="100" />

              {/* Right Cheek Blush (///) */}
              <line x1="114" y1="92" x2="118" y2="100" />
              <line x1="119" y1="94" x2="123" y2="102" />
              <line x1="124" y1="96" x2="128" y2="104" />
            </g>
          )}

          {/* --- EYES: Caret ^ ^ (Low Drive) --- */}
          {caretOpacity > 0.02 && (
            <g
              stroke="#18181B"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={caretOpacity}
            >
              {/* Left Eye Caret ^ */}
              <path d="M 78 84 L 84 72 L 90 84" />
              {/* Right Eye Caret ^ */}
              <path d="M 110 84 L 116 72 L 122 84" />
            </g>
          )}

          {/* --- EYES: Oval Sockets with Hot Pink Hearts (High Drive) --- */}
          {/* Exactly as drawn in Image 2: tall oval eye with heart inside */}
          {heartOpacity > 0.02 && (
            <g opacity={heartOpacity}>
              {/* Left Eye Oval Socket */}
              <ellipse
                cx="84"
                cy="76"
                rx="8"
                ry="13"
                fill="#FFFFFF"
                stroke="#18181B"
                strokeWidth="3.5"
              />
              {/* Left Eye Heart */}
              <g transform={`translate(84, 76) scale(${heartScale}) translate(-84, -76)`}>
                <path
                  d="M 84 74 C 84 69 80 65 76 67 C 72 69 72 74 76 78 L 84 85 L 92 78 C 96 74 96 69 92 67 C 88 65 84 69 84 74 Z"
                  fill="#ff007f"
                  stroke="#18181B"
                  strokeWidth="2"
                />
              </g>

              {/* Right Eye Oval Socket */}
              <ellipse
                cx="116"
                cy="76"
                rx="8"
                ry="13"
                fill="#FFFFFF"
                stroke="#18181B"
                strokeWidth="3.5"
              />
              {/* Right Eye Heart */}
              <g transform={`translate(116, 76) scale(${heartScale}) translate(-116, -76)`}>
                <path
                  d="M 116 74 C 116 69 112 65 108 67 C 104 69 104 74 108 78 L 116 85 L 124 78 C 128 74 128 69 124 67 C 120 65 116 69 116 74 Z"
                  fill="#ff007f"
                  stroke="#18181B"
                  strokeWidth="2"
                />
              </g>
            </g>
          )}

          {/* --- MOUTH --- */}
          {mouthOpen <= 0.05 ? (
            // Small happy smiling doodle mouth (D shape from user's doodle)
            <path
              d="M 94 106 Q 100 114 106 106 Z"
              fill="#FFFFFF"
              stroke="#18181B"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          ) : (
            // Open rectangular mouth with top tooth line pouring out rainbow!
            <g>
              {/* Open mouth cavity */}
              <path
                d={`
                  M ${100 - mouthW / 2} 104
                  L ${100 + mouthW / 2} 104
                  L ${100 + mouthW / 2 + 2} ${104 + mouthH}
                  Q 100 ${104 + mouthH + 4} ${100 - mouthW / 2 - 2} ${104 + mouthH}
                  Z
                `}
                fill="#18181B"
                stroke="#18181B"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Top cute white tooth bar (as in doodle) */}
              <rect
                x={100 - mouthW / 2 + 3}
                y="105"
                width={mouthW - 6}
                height={Math.min(5, mouthH * 0.35)}
                rx="1"
                fill="#FFFFFF"
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
