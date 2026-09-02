import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface PressKnobProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  size?: number; // default 64px
  label: string;
  unit?: string;
  displayFormatter?: (val: number) => string;
  onChange: (val: number) => void;
}

/**
 * PressKnob Component per Task 4.1.
 *
 * Distinctive aesthetic from the reference doodle:
 * - Flat, solid amber/gold filled circle (#F59E0B)
 * - Single dark-red pointer indicator (#991B1B) rotating with value
 * - Clean tactile pointer drag, double-click reset, arrow nudge, and hover readout
 */
export const PressKnob: React.FC<PressKnobProps> = ({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  defaultValue = 0,
  size = 64,
  label,
  unit = '',
  displayFormatter,
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  // Map value to angle (-135deg to +135deg => 270deg total range)
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + normalized * 270;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartValue.current = value;
    },
    [value]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const deltaY = dragStartY.current - e.clientY; // Upward increases value
      const range = max - min;
      const sensitivity = 150; // pixels to traverse full range
      const stepVal = e.shiftKey ? step * 0.1 : step;
      let nextVal = dragStartValue.current + (deltaY / sensitivity) * range;

      // Quantize to step
      if (stepVal > 0) {
        nextVal = Math.round(nextVal / stepVal) * stepVal;
      }
      nextVal = Math.max(min, Math.min(max, nextVal));
      onChange(Number(nextVal.toFixed(4)));
    },
    [isDragging, max, min, onChange, step]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    onChange(defaultValue);
  }, [defaultValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let delta = 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') delta = step;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') delta = -step;

      if (delta !== 0) {
        e.preventDefault();
        const nextVal = Math.max(min, Math.min(max, value + delta));
        onChange(Number(nextVal.toFixed(4)));
      }
    },
    [max, min, onChange, step, value]
  );

  const formattedValue = displayFormatter
    ? displayFormatter(value)
    : `${Number(value.toFixed(2))}${unit}`;

  const knobRadius = (size - 6) / 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        userSelect: 'none',
        fontFamily: 'var(--comp-font-family, -apple-system, sans-serif)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Knob Body */}
      <div
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          outline: 'none',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: 'visible' }}
        >
          {/* Subtle outer track ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={knobRadius + 2}
            fill="none"
            stroke="#E4E4E7"
            strokeWidth="1.5"
          />

          {/* Solid Flat Amber/Gold Circle body from reference doodle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={knobRadius}
            fill="#F59E0B"
            stroke="#18181B"
            strokeWidth="2.5"
            style={{
              filter: isHovered || isDragging ? 'drop-shadow(0 4px 10px rgba(245, 158, 11, 0.4))' : 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.12))',
              transition: 'filter 0.15s ease',
            }}
          />

          {/* Rotating Pointer Container */}
          <g transform={`translate(${size / 2}, ${size / 2}) rotate(${angle})`}>
            {/* Dark-red pointer dot / indicator line per reference sketch */}
            <circle
              cx="0"
              cy={-knobRadius * 0.55}
              r={knobRadius * 0.22}
              fill="#991B1B"
              stroke="#18181B"
              strokeWidth="1.2"
            />
            {/* Fine line tip toward edge */}
            <line
              x1="0"
              y1={-knobRadius * 0.55}
              x2="0"
              y2={-knobRadius * 0.85}
              stroke="#991B1B"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {/* Label and Value */}
      <div style={{ textAlign: 'center', minHeight: '30px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#18181B',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 600,
            fontFamily: 'var(--comp-font-mono, monospace)',
            color: isDragging || isHovered ? '#B45309' : '#71717A',
            transition: 'color 0.15s ease',
          }}
        >
          {formattedValue}
        </div>
      </div>
    </div>
  );
};
