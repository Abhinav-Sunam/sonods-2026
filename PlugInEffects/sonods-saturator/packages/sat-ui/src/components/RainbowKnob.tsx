import React, { useCallback, useEffect, useRef, useState } from 'react';

interface RainbowKnobProps {
  value: number; // Current value
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  size?: number; // Diameter in px (default 72)
  label: string;
  unit?: string;
  displayFormatter?: (val: number) => string;
  onChange: (val: number) => void;
  accentColor?: string;
  hero?: boolean; // If true, renders the big bold concentric rainbow knob
}

// Bold rainbow ring colors matching the user's reference drawings
const RAINBOW_RINGS = [
  '#ff00ff', // Hot magenta (outermost)
  '#00ccff', // Bright cyan
  '#00ff66', // Electric green
  '#ffee00', // Bright yellow
  '#ff6600', // Bold orange
  '#ff0044', // Hot pink-red (innermost)
];

export const RainbowKnob: React.FC<RainbowKnobProps> = ({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  defaultValue = 0,
  size = 72,
  label,
  unit = '',
  displayFormatter,
  onChange,
  accentColor = '#38bdf8',
  hero = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  // Map value to angle (-135deg to +135deg => 270deg sweep)
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + normalized * 270;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartValue.current = value;
    },
    [value]
  );

  const handleDoubleClick = useCallback(() => {
    onChange(defaultValue);
  }, [defaultValue, onChange]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * (e.shiftKey ? step * 0.1 : step);
      const nextVal = Math.max(min, Math.min(max, value + delta));
      onChange(Number(nextVal.toFixed(4)));
    },
    [max, min, onChange, step, value]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStartY.current - e.clientY;
      const sensitivity = e.shiftKey ? 0.001 : 0.005;
      const range = max - min;
      const deltaVal = deltaY * sensitivity * range;
      const rawVal = dragStartValue.current + deltaVal;
      const steppedVal = Math.round(rawVal / step) * step;
      const clampedVal = Math.max(min, Math.min(max, steppedVal));
      onChange(Number(clampedVal.toFixed(4)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, max, min, onChange, step]);

  const displayText = displayFormatter
    ? displayFormatter(value)
    : `${Number(value.toFixed(2))}${unit}`;

  if (hero) {
    return <HeroRainbowKnob
      size={size}
      normalized={normalized}
      angle={angle}
      isDragging={isDragging}
      label={label}
      displayText={displayText}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    />;
  }

  // --- Standard (smaller) knob with bolder rainbow ---
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (270 / 360);
  const strokeDashoffset = arcLength * (1 - normalized);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        userSelect: 'none',
        cursor: 'ns-resize',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(135deg)', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`knobRainbow-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff0044" />
              <stop offset="20%" stopColor="#ff6600" />
              <stop offset="40%" stopColor="#ffee00" />
              <stop offset="60%" stopColor="#00ff66" />
              <stop offset="80%" stopColor="#00ccff" />
              <stop offset="100%" stopColor="#ff00ff" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Active Progress Arc — bolder and more saturated */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#knobRainbow-${label})`}
            strokeWidth={strokeWidth + 1}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: isDragging ? 'none' : 'stroke-dashoffset 0.1s ease',
              filter: `drop-shadow(0 0 ${isDragging ? 8 : 4}px rgba(255, 0, 255, 0.5))`,
            }}
          />
        </svg>

        {/* Rotary Dial Center Body */}
        <div
          style={{
            position: 'absolute',
            width: size - 16,
            height: size - 16,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #FFFFFF, #F0F0F2)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.8)',
            border: '1.5px solid #D4D4D8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${angle}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease',
          }}
        >
          {/* Inner concentric ring */}
          <div
            style={{
              width: size - 28,
              height: size - 28,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #F4F4F5 0%, #E4E4E7 100%)',
              border: '1px solid #D4D4D8',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              position: 'relative',
            }}
          >
            {/* Pointer / Pip Indicator */}
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '3.5px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: isDragging ? '#ffffff' : accentColor,
                boxShadow: isDragging
                  ? '0 0 8px #ffffff'
                  : `0 0 6px ${accentColor}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Label and Value */}
      <span
        style={{
          marginTop: '6px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#52525B',
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: 'var(--sat-font-mono)',
          color: isDragging ? '#18181B' : '#71717A',
          transition: 'color 0.15s ease',
        }}
      >
        {displayText}
      </span>
    </div>
  );
};

/* ====================================================================
   HERO RAINBOW KNOB — Big bold concentric rainbow bullseye 
   Matches the user's hand-drawn reference art: a large, prominent
   concentric rainbow circle like a lollipop/speech-bubble with bold
   pink/cyan/yellow/green/red rings. THE visual centerpiece.
   ==================================================================== */

interface HeroRainbowKnobProps {
  size: number;
  normalized: number;
  angle: number;
  isDragging: boolean;
  label: string;
  displayText: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onWheel: (e: React.WheelEvent) => void;
}

const HeroRainbowKnob: React.FC<HeroRainbowKnobProps> = ({
  size,
  normalized,
  angle,
  isDragging,
  label,
  displayText,
  onMouseDown,
  onDoubleClick,
  onWheel,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const totalRings = RAINBOW_RINGS.length;
  const ringSpacing = (size / 2 - 14) / totalRings; // leave center gap

  // Glow intensity scales with normalized value
  const glowIntensity = 6 + normalized * 14;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        userSelect: 'none',
        cursor: 'ns-resize',
        position: 'relative',
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onWheel={onWheel}
    >
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            overflow: 'visible',
            filter: `drop-shadow(0 0 ${glowIntensity}px rgba(255, 0, 255, 0.35))`,
          }}
        >
          <defs>
            {/* Per-ring sweep gradients — each ring has a rainbow gradient that sweeps 270° */}
            {RAINBOW_RINGS.map((color, i) => (
              <linearGradient key={`ringGrad-${i}`} id={`heroRingGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity={0.9 + normalized * 0.1} />
                <stop offset="100%" stopColor={RAINBOW_RINGS[(i + 2) % totalRings]} stopOpacity={0.9 + normalized * 0.1} />
              </linearGradient>
            ))}
          </defs>

          {/* Outer dark outline circle (like the speech-bubble border in the drawing) */}
          <circle
            cx={cx}
            cy={cy}
            r={size / 2 - 2}
            fill="none"
            stroke="#1a1c23"
            strokeWidth={4}
          />

          {/* Concentric rainbow filled rings — thick, bold, filling the circle */}
          {RAINBOW_RINGS.map((color, i) => {
            const outerR = size / 2 - 6 - i * ringSpacing;
            const innerR = outerR - ringSpacing + 2;
            if (outerR <= 0 || innerR <= 0) return null;

            // Each ring sweeps based on drive value (0..270deg)
            const sweepAngle = normalized * 270;
            const startAngle = 135; // start from bottom-left (matching standard knob 270° arc)
            const endAngle = startAngle + sweepAngle;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const largeArc = sweepAngle > 180 ? 1 : 0;

            // Outer arc
            const ox1 = cx + outerR * Math.cos(startRad);
            const oy1 = cy + outerR * Math.sin(startRad);
            const ox2 = cx + outerR * Math.cos(endRad);
            const oy2 = cy + outerR * Math.sin(endRad);

            // Inner arc (reverse)
            const ix1 = cx + innerR * Math.cos(endRad);
            const iy1 = cy + innerR * Math.sin(endRad);
            const ix2 = cx + innerR * Math.cos(startRad);
            const iy2 = cy + innerR * Math.sin(startRad);

            // Background track for this ring (full 270°)
            const bgEndAngle = startAngle + 270;
            const bgEndRad = (bgEndAngle * Math.PI) / 180;
            const bgox2 = cx + outerR * Math.cos(bgEndRad);
            const bgoy2 = cy + outerR * Math.sin(bgEndRad);
            const bgix1 = cx + innerR * Math.cos(bgEndRad);
            const bgiy1 = cy + innerR * Math.sin(bgEndRad);

            return (
              <g key={i}>
                {/* Background track (dim) */}
                <path
                  d={`M ${ox1} ${oy1} A ${outerR} ${outerR} 0 1 1 ${bgox2} ${bgoy2} L ${bgix1} ${bgiy1} A ${innerR} ${innerR} 0 1 0 ${ix2} ${iy2} Z`}
                  fill={color}
                  opacity={0.12}
                />

                {/* Active fill ring */}
                {normalized > 0.005 && (
                  <path
                    d={`M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`}
                    fill={color}
                    opacity={0.85 + normalized * 0.15}
                    style={{
                      transition: isDragging ? 'none' : 'd 0.15s ease',
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Center light circle with pointer */}
          <circle
            cx={cx}
            cy={cy}
            r={14}
            fill="#FFFFFF"
            stroke="#D4D4D8"
            strokeWidth={2}
          />

          {/* Rotating pointer pip */}
          <g transform={`rotate(${angle} ${cx} ${cy})`}>
            <rect
              x={cx - 2}
              y={cy - 12}
              width={4}
              height={8}
              rx={2}
              fill={isDragging ? '#ffffff' : '#ff00ff'}
              style={{
                filter: isDragging
                  ? 'drop-shadow(0 0 6px #ffffff)'
                  : 'drop-shadow(0 0 4px #ff00ff)',
              }}
            />
          </g>
        </svg>
      </div>

      {/* Label and Value */}
      <span
        style={{
          marginTop: '8px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#18181B',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 800,
          fontFamily: 'var(--sat-font-mono)',
          color: isDragging ? '#18181B' : '#ff00ff',
          textShadow: isDragging ? 'none' : '0 0 6px rgba(255, 0, 255, 0.3)',
          transition: 'color 0.15s ease',
        }}
      >
        {displayText}
      </span>
    </div>
  );
};
