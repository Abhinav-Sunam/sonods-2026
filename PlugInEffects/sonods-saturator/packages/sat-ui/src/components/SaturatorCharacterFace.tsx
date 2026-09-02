import React, { useMemo } from 'react';
import { CharacterType } from '@sonods/sat-engine';

interface SaturatorCharacterFaceProps {
  drive: number; // 0.0 to 1.0
  character: CharacterType;
  audioPeak?: number; // 0.0 to 1.0 live audio amplitude
}

// The bold, saturated rainbow colors matching the user's reference art
const STREAM_COLORS = [
  '#ff0044', // Hot pink-red
  '#ff6600', // Bold orange
  '#ffee00', // Bright yellow
  '#00ff66', // Electric green
  '#00ccff', // Bright cyan
  '#ff00ff', // Hot magenta
];

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

  // The rainbow stream grows MUCH more dramatically with drive
  const streamBaseWidth = 36;
  const streamWidth = streamBaseWidth + stage * 12 + drive * 30;
  const streamLength = 60 + drive * 160 + audioPeak * 40;
  const waveAmp = stage === 4 ? 18 + audioPeak * 12 : stage === 3 ? 12 + audioPeak * 6 : stage === 2 ? 6 : 2;

  // SVG dimensions — bigger canvas to accommodate the larger stream
  const svgWidth = 200;
  const svgHeight = 50 + 100 + streamLength; // top pad + head + stream
  const headCx = svgWidth / 2;
  const headCy = 58;
  const streamTop = 95;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '0',
      }}
    >
      <svg
        width={svgWidth}
        height={Math.min(svgHeight, 340)}
        viewBox={`0 0 ${svgWidth} ${Math.min(svgHeight, 340)}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0 0 ${8 + drive * 16}px ${charAccent.glow})`,
          overflow: 'visible',
          transition: 'filter 0.3s ease',
        }}
      >
        <defs>
          {/* Multi-stripe rainbow gradient for the stream */}
          <linearGradient id="rainbowStreamV" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff0044" />
            <stop offset="18%" stopColor="#ff6600" />
            <stop offset="36%" stopColor="#ffee00" />
            <stop offset="54%" stopColor="#00ff66" />
            <stop offset="72%" stopColor="#00ccff" />
            <stop offset="90%" stopColor="#ff00ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Horizontal rainbow gradient for individual stripes */}
          <linearGradient id="rainbowStreamH" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff0044" />
            <stop offset="20%" stopColor="#ff6600" />
            <stop offset="40%" stopColor="#ffee00" />
            <stop offset="60%" stopColor="#00ff66" />
            <stop offset="80%" stopColor="#00ccff" />
            <stop offset="100%" stopColor="#ff00ff" />
          </linearGradient>

          <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="streamGlow" x="-20%" y="-5%" width="140%" height="110%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- Cascading Rainbow Stream (BOLD — major visual element) --- */}
        <g filter="url(#streamGlow)">
          {/* Render individual colored stripes side-by-side for the bold rainbow look */}
          {STREAM_COLORS.map((color, i) => {
            const stripeWidth = streamWidth / STREAM_COLORS.length;
            const totalWidth = streamWidth;
            const startX = headCx - totalWidth / 2 + i * stripeWidth;

            if (stage === 1) {
              // Stage 1: Calm straight beam with individual color stripes
              return (
                <rect
                  key={i}
                  x={startX}
                  y={streamTop}
                  width={stripeWidth + 0.5} // slight overlap to avoid gaps
                  height={streamLength}
                  fill={color}
                  opacity={0.8}
                  rx={i === 0 ? 3 : i === STREAM_COLORS.length - 1 ? 3 : 0}
                />
              );
            }

            if (stage === 2) {
              // Stage 2: Gentle flowing curves
              const sway = waveAmp * Math.sin((i / STREAM_COLORS.length) * Math.PI);
              return (
                <path
                  key={i}
                  d={`M ${startX} ${streamTop}
                      Q ${startX + sway} ${streamTop + streamLength * 0.5}
                        ${startX} ${streamTop + streamLength}
                      L ${startX + stripeWidth} ${streamTop + streamLength}
                      Q ${startX + stripeWidth + sway} ${streamTop + streamLength * 0.5}
                        ${startX + stripeWidth} ${streamTop}
                      Z`}
                  fill={color}
                  opacity={0.85}
                />
              );
            }

            if (stage === 3) {
              // Stage 3: Expanding radiant cascade — flares outward
              const flare = (i - STREAM_COLORS.length / 2) * 4;
              const endX = startX + flare;
              return (
                <path
                  key={i}
                  d={`M ${startX} ${streamTop}
                      Q ${startX + waveAmp * (i % 2 === 0 ? 1 : -1)} ${streamTop + streamLength * 0.4}
                        ${endX} ${streamTop + streamLength}
                      L ${endX + stripeWidth + 2} ${streamTop + streamLength}
                      Q ${startX + stripeWidth + waveAmp * (i % 2 === 0 ? -1 : 1)} ${streamTop + streamLength * 0.4}
                        ${startX + stripeWidth} ${streamTop}
                      Z`}
                  fill={color}
                  opacity={0.9}
                />
              );
            }

            // Stage 4: Ecstatic long wavy undulating waterfall!
            const phase = (i / STREAM_COLORS.length) * Math.PI * 2;
            const w1 = waveAmp * Math.sin(phase);
            const w2 = waveAmp * Math.cos(phase + 1);
            const w3 = waveAmp * Math.sin(phase + 2);
            const flare = (i - STREAM_COLORS.length / 2) * 6;
            const endX = startX + flare;

            return (
              <path
                key={i}
                d={`M ${startX} ${streamTop}
                    C ${startX + w1} ${streamTop + streamLength * 0.2}
                      ${startX + w2} ${streamTop + streamLength * 0.4}
                      ${startX + w3} ${streamTop + streamLength * 0.6}
                    C ${startX - w1} ${streamTop + streamLength * 0.8}
                      ${endX} ${streamTop + streamLength * 0.95}
                      ${endX} ${streamTop + streamLength}
                    L ${endX + stripeWidth + 3} ${streamTop + streamLength}
                    C ${endX + stripeWidth + 3} ${streamTop + streamLength * 0.95}
                      ${startX + stripeWidth - w1} ${streamTop + streamLength * 0.8}
                      ${startX + stripeWidth + w3} ${streamTop + streamLength * 0.6}
                    C ${startX + stripeWidth + w2} ${streamTop + streamLength * 0.4}
                      ${startX + stripeWidth + w1} ${streamTop + streamLength * 0.2}
                      ${startX + stripeWidth} ${streamTop}
                    Z`}
                fill={color}
                opacity={0.92}
              />
            );
          })}
        </g>

        {/* --- Cute Character Head --- */}
        <g transform={`translate(${headCx}, ${headCy}) scale(${bounceScale}) translate(${-headCx}, ${-headCy})`}>
          {/* Outer Head Circle */}
          <circle
            cx={headCx}
            cy={headCy}
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
            cx={headCx - 32}
            cy={headCy + 7}
            rx={stage >= 3 ? 9 : 7}
            ry="5"
            fill="#ff8da1"
            opacity={0.5 + drive * 0.5}
          />
          <ellipse
            cx={headCx + 32}
            cy={headCy + 7}
            rx={stage >= 3 ? 9 : 7}
            ry="5"
            fill="#ff8da1"
            opacity={0.5 + drive * 0.5}
          />

          {/* --- Eye Expressions --- */}
          {stage === 1 && (
            // Stage 1: Content happy arch eyes ^ ^
            <g stroke="#1a1c23" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d={`M ${headCx - 28} ${headCy - 6} Q ${headCx - 20} ${headCy - 15} ${headCx - 12} ${headCy - 6}`} />
              <path d={`M ${headCx + 12} ${headCy - 6} Q ${headCx + 20} ${headCy - 15} ${headCx + 28} ${headCy - 6}`} />
            </g>
          )}

          {stage === 2 && (
            // Stage 2: Blushing happy eyes ^ ^
            <g stroke="#1a1c23" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d={`M ${headCx - 30} ${headCy - 7} Q ${headCx - 20} ${headCy - 19} ${headCx - 10} ${headCy - 7}`} />
              <path d={`M ${headCx + 10} ${headCy - 7} Q ${headCx + 20} ${headCy - 19} ${headCx + 30} ${headCy - 7}`} />
            </g>
          )}

          {(stage === 3 || stage === 4) && (
            // Stage 3 & 4: Radiant Heart Eyes ♥ ♥
            <g fill={charAccent.primary} stroke="#1a1c23" strokeWidth="2.5">
              {/* Left Heart Eye */}
              <path
                d={`M ${headCx - 20} ${headCy - 6} C ${headCx - 20} ${headCy - 12} ${headCx - 26} ${headCy - 16} ${headCx - 31} ${headCy - 13} C ${headCx - 36} ${headCy - 10} ${headCx - 35} ${headCy - 4} ${headCx - 31} ${headCy + 1} L ${headCx - 20} ${headCy + 10} L ${headCx - 9} ${headCy + 1} C ${headCx - 5} ${headCy - 4} ${headCx - 4} ${headCy - 10} ${headCx - 9} ${headCy - 13} C ${headCx - 14} ${headCy - 16} ${headCx - 20} ${headCy - 12} ${headCx - 20} ${headCy - 6} Z`}
                transform={`translate(${headCx - 20}, ${headCy - 6}) scale(0.6) translate(${-(headCx - 20)}, ${-(headCy - 6)})`}
              />
              {/* Right Heart Eye */}
              <path
                d={`M ${headCx + 20} ${headCy - 6} C ${headCx + 20} ${headCy - 12} ${headCx + 14} ${headCy - 16} ${headCx + 9} ${headCy - 13} C ${headCx + 4} ${headCy - 10} ${headCx + 5} ${headCy - 4} ${headCx + 9} ${headCy + 1} L ${headCx + 20} ${headCy + 10} L ${headCx + 31} ${headCy + 1} C ${headCx + 35} ${headCy - 4} ${headCx + 36} ${headCy - 10} ${headCx + 31} ${headCy - 13} C ${headCx + 26} ${headCy - 16} ${headCx + 20} ${headCy - 12} ${headCx + 20} ${headCy - 6} Z`}
                transform={`translate(${headCx + 20}, ${headCy - 6}) scale(0.6) translate(${-(headCx + 20)}, ${-(headCy - 6)})`}
              />
            </g>
          )}

          {/* --- Mouth Expressions --- */}
          {stage === 1 && (
            // Stage 1: Content gentle smile
            <path
              d={`M ${headCx - 10} ${headCy + 8} Q ${headCx} ${headCy + 17} ${headCx + 10} ${headCy + 8}`}
              stroke="#1a1c23"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {stage === 2 && (
            // Stage 2: Happy open smile ^ ▽ ^
            <path
              d={`M ${headCx - 12} ${headCy + 6} Q ${headCx} ${headCy + 24} ${headCx + 12} ${headCy + 6} Z`}
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
                d={`M ${headCx - 14} ${headCy + 6} Q ${headCx} ${headCy + 28} ${headCx + 14} ${headCy + 6} Z`}
                fill="#e11d48"
                stroke="#1a1c23"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Tongue/Highlight */}
              <path
                d={`M ${headCx - 8} ${headCy + 17} Q ${headCx} ${headCy + 26} ${headCx + 8} ${headCy + 17} Z`}
                fill="#fb7185"
              />
            </g>
          )}

          {stage === 4 && (
            // Stage 4: Ecstatic open mouth in saturation bliss ♥ O ♥
            <g>
              <ellipse
                cx={headCx}
                cy={headCy + 14}
                rx="14"
                ry="16"
                fill="#be123c"
                stroke="#1a1c23"
                strokeWidth="3.5"
              />
              <ellipse
                cx={headCx}
                cy={headCy + 19}
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
