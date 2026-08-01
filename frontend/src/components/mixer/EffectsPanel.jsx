import React from 'react';
import useMixerStore from '../../store/useMixerStore';

// Interactive Knob Component with drag-to-adjust capability
const InteractiveKnob = ({ label, value, min = -12, max = 12, unit = 'dB', onChange, size = 44, color = 'var(--accent)' }) => {
  const handleMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = value;
    const range = max - min;

    const handleMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const sensitivity = range / 150;
      let newVal = startVal + deltaY * sensitivity;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(Math.round(newVal * 10) / 10);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Convert value to rotation (-135deg to +135deg)
  const norm = (value - min) / (max - min);
  const rotation = Math.max(0, Math.min(1, norm)) * 270 - 135;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      userSelect: 'none',
    }}>
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          cursor: 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)',
        }}
      >
        <div style={{
          position: 'absolute',
          width: '70%',
          height: '70%',
          borderRadius: '50%',
          background: '#090d16',
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.05s ease-out',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '2px',
            height: '8px',
            background: color,
            borderRadius: '1px',
            marginTop: '3px',
            boxShadow: `0 0 6px ${color}`,
          }} />
        </div>
      </div>

      <span style={{
        fontSize: '9px',
        fontWeight: 600,
        color: 'var(--mixer-subtext)',
        letterSpacing: '0.5px',
        fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase',
      }}>
        {label}
      </span>

      <span style={{
        fontSize: '9px',
        color: 'var(--mixer-label-color-active)',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 500,
      }}>
        {value > 0 && unit === 'dB' ? `+${value}` : value}{unit}
      </span>
    </div>
  );
};

const EffectsPanel = ({ audioEngine }) => {
  const selectedStemId = useMixerStore((state) => state.selectedStemId);
  const activeStemConfig = useMixerStore((state) => state.activeStemConfig) || [];
  const fxSettings = useMixerStore((state) => state.fxSettings);
  const updateFx = useMixerStore((state) => state.updateFx);

  const selectedStem = activeStemConfig.find((s) => s.id === selectedStemId);
  const stemFx = selectedStemId && fxSettings[selectedStemId] ? fxSettings[selectedStemId] : {
    eq: { low: 0, mid: 0, high: 0 },
    comp: { thresh: -16, ratio: 3, makeup: 0 },
    sat: 0,
    sends: { reverb: 0.1, delay: 0.05 },
  };

  if (!selectedStem) {
    return (
      <div style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--mixer-channel-bg)',
        border: '0.5px solid var(--mixer-channel-border)',
        borderRadius: '12px',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minHeight: '400px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--mixer-subtext)',
          fontSize: '16px',
        }}>
          🎛️
        </div>
        <div style={{
          fontSize: '10px',
          letterSpacing: '1.5px',
          color: 'var(--mixer-subtext)',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          textTransform: 'uppercase',
        }}>
          LIVE FX RACK
        </div>
        <div style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.4)',
          lineHeight: '1.4',
        }}>
          Select any track to tweak its real-time AI DSP settings
        </div>
      </div>
    );
  }

  const { eq, comp, sat, sends } = stemFx;

  return (
    <div style={{
      width: '220px',
      flexShrink: 0,
      background: 'var(--mixer-channel-bg)',
      border: '0.5px solid var(--mixer-channel-border)',
      borderRadius: '12px',
      padding: '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      overflowY: 'auto',
      maxHeight: '620px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '0.5px solid var(--mixer-channel-border)',
        paddingBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: selectedStem.color || 'var(--accent)',
            boxShadow: `0 0 8px ${selectedStem.color || 'var(--accent)'}`,
          }} />
          <span style={{
            fontSize: '10px',
            letterSpacing: '1.5px',
            color: 'var(--mixer-label-color-active)',
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            textTransform: 'uppercase',
            maxWidth: '120px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {selectedStem.displayName}
          </span>
        </div>
        <span style={{
          fontSize: '9px',
          letterSpacing: '1px',
          color: 'var(--mixer-subtext)',
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          FX RACK
        </span>
      </div>

      {/* 1. PARAMETRIC EQ MODULE */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '9px',
            letterSpacing: '1px',
            color: 'var(--accent)',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            PARAMETRIC EQ
          </span>
          <span style={{ fontSize: '8px', color: 'var(--mixer-subtext)', fontFamily: "'JetBrains Mono', monospace" }}>
            3-BAND
          </span>
        </div>

        {/* Dynamic EQ Curve SVG */}
        <div style={{
          height: '42px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '6px',
          overflow: 'hidden',
          padding: '4px',
          border: '0.5px solid rgba(255,255,255,0.04)',
        }}>
          <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%' }}>
            <path
              d={`M 0,20 Q 25,${20 - (eq.low || 0) * 1.2} 50,${20 - (eq.mid || 0) * 1.2} T 100,${20 - (eq.high || 0) * 1.2}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            {/* Zero reference line */}
            <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.1)" strokeDasharray="2,2" />
          </svg>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <InteractiveKnob
            label="LOW"
            value={eq.low ?? 0}
            min={-12}
            max={12}
            unit="dB"
            color="#34d399"
            onChange={(v) => updateFx(selectedStemId, 'eq', 'low', v, audioEngine)}
          />
          <InteractiveKnob
            label="MID"
            value={eq.mid ?? 0}
            min={-12}
            max={12}
            unit="dB"
            color="#fbbf24"
            onChange={(v) => updateFx(selectedStemId, 'eq', 'mid', v, audioEngine)}
          />
          <InteractiveKnob
            label="HIGH"
            value={eq.high ?? 0}
            min={-12}
            max={12}
            unit="dB"
            color="#60a5fa"
            onChange={(v) => updateFx(selectedStemId, 'eq', 'high', v, audioEngine)}
          />
        </div>
      </div>

      {/* 2. DYNAMICS COMPRESSOR MODULE */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '9px',
            letterSpacing: '1px',
            color: '#f87171',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            DYNAMICS
          </span>
          <span style={{ fontSize: '8px', color: 'var(--mixer-subtext)', fontFamily: "'JetBrains Mono', monospace" }}>
            COMPRESSOR
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <InteractiveKnob
            label="THRESH"
            value={comp.thresh ?? -16}
            min={-40}
            max={0}
            unit="dB"
            color="#f87171"
            onChange={(v) => updateFx(selectedStemId, 'comp', 'thresh', v, audioEngine)}
          />
          <InteractiveKnob
            label="RATIO"
            value={comp.ratio ?? 3}
            min={1}
            max={10}
            unit=":1"
            color="#f87171"
            onChange={(v) => updateFx(selectedStemId, 'comp', 'ratio', v, audioEngine)}
          />
          <InteractiveKnob
            label="MAKEUP"
            value={comp.makeup ?? 0}
            min={0}
            max={12}
            unit="dB"
            color="#f87171"
            onChange={(v) => updateFx(selectedStemId, 'comp', 'makeup', v, audioEngine)}
          />
        </div>
      </div>

      {/* 3. SATURATION MODULE */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '9px',
            letterSpacing: '1px',
            color: '#fbbf24',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            SATURATION
          </span>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: sat > 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            boxShadow: sat > 0 ? `0 0 ${sat / 5}px #fbbf24` : 'none',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
          <InteractiveKnob
            label="DRIVE"
            value={sat ?? 0}
            min={0}
            max={100}
            unit="%"
            color="#fbbf24"
            size={48}
            onChange={(v) => updateFx(selectedStemId, 'sat', '', v, audioEngine)}
          />
        </div>
      </div>

      {/* 4. SPATIAL SENDS MODULE */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <span style={{
          fontSize: '9px',
          letterSpacing: '1px',
          color: '#c084fc',
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          SPATIAL SENDS
        </span>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <InteractiveKnob
            label="REVERB"
            value={Math.round((sends.reverb ?? 0) * 100)}
            min={0}
            max={100}
            unit="%"
            color="#c084fc"
            onChange={(v) => updateFx(selectedStemId, 'sends', 'reverb', v / 100, audioEngine)}
          />
          <InteractiveKnob
            label="DELAY"
            value={Math.round((sends.delay ?? 0) * 100)}
            min={0}
            max={100}
            unit="%"
            color="#a78bfa"
            onChange={(v) => updateFx(selectedStemId, 'sends', 'delay', v / 100, audioEngine)}
          />
        </div>
      </div>
    </div>
  );
};

export default EffectsPanel;
