import React, { useEffect, useState } from 'react';
import { SonodsCompressorNode, CompressorCharacterType, CompressorState } from '@sonods/comp-engine';
import { PressKnob } from './PressKnob.js';
import { PressIllustration } from './PressIllustration.js';
import '../theme/tokens.css';

interface SonodsCompressorPluginProps {
  node: SonodsCompressorNode;
}

/**
 * SonodsCompressorPlugin Main UI Component (Task 4.3 & 4.4).
 *
 * Layout directly reproduces the user's hand-drawn doodle:
 * - Left side: Hydraulic Press with burger stack illustration reacting to real-time compression.
 * - Right side: 2x2 grid of 4 primary flat amber knobs (Threshold, Ratio, Attack, Release).
 * - Clean white chassis frame with rounded corners, thick dark border, character selector,
 *   secondary controls bar, and the signature "SonoDS" branding in bottom-right corner.
 */
export const SonodsCompressorPlugin: React.FC<SonodsCompressorPluginProps> = ({ node }) => {
  const [state, setState] = useState<CompressorState>(node.getState());
  const [gainReductionDb, setGainReductionDb] = useState(node.getCurrentGainReductionDb());

  useEffect(() => {
    const unsubState = node.subscribe((newState) => {
      setState(newState);
    });
    const unsubGr = node.subscribeGainReduction((gr) => {
      setGainReductionDb(gr);
    });

    return () => {
      unsubState();
      unsubGr();
    };
  }, [node]);

  return (
    <div
      style={{
        width: '680px',
        maxWidth: '100%',
        background: '#FFFFFF',
        borderRadius: '24px',
        border: '3.5px solid #18181B',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
        padding: '28px 32px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header bar with character selector pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #E4E4E7',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#18181B',
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.2px', color: '#18181B' }}>
            Compression
          </span>
        </div>

        {/* Character Topology Pills (VCA / Opto / FET) */}
        <div
          style={{
            display: 'flex',
            background: '#F4F4F5',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #E4E4E7',
            gap: '2px',
          }}
        >
          {(['vca', 'opto', 'fet'] as CompressorCharacterType[]).map((char) => {
            const active = state.character === char;
            return (
              <button
                key={char}
                onClick={() => node.setCharacter(char)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: active ? '#18181B' : 'transparent',
                  color: active ? '#FFFFFF' : '#71717A',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {char}
              </button>
            );
          })}
        </div>

        {/* Gain reduction numeric badge */}
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'ui-monospace, monospace',
            fontWeight: 700,
            color: gainReductionDb > 0.5 ? '#EF4444' : '#71717A',
            padding: '3px 8px',
            borderRadius: '6px',
            background: gainReductionDb > 0.5 ? 'rgba(239, 68, 68, 0.1)' : '#F4F4F5',
            transition: 'all 0.1s ease',
          }}
        >
          GR: -{gainReductionDb.toFixed(1)} dB
        </div>
      </div>

      {/* Main 50/50 Body: Left = Hydraulic Press, Right = 2x2 Knobs (Matching Doodle) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          alignItems: 'center',
        }}
      >
        {/* Left Side: Hydraulic Press Illustration */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            background: '#FAFAFA',
            borderRadius: '16px',
            border: '1.5px solid #E4E4E7',
            height: '240px',
          }}
        >
          <PressIllustration gainReductionDb={gainReductionDb} width={220} height={220} />
        </div>

        {/* Right Side: 2x2 Primary Knob Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px 16px',
            justifyItems: 'center',
            alignItems: 'center',
            padding: '8px 0',
          }}
        >
          {/* Knob 1: Threshold */}
          <PressKnob
            label="Threshold"
            value={state.threshold}
            min={-60.0}
            max={0.0}
            step={0.5}
            defaultValue={-16.0}
            unit=" dB"
            onChange={(val) => node.setThreshold(val)}
          />

          {/* Knob 2: Ratio */}
          <PressKnob
            label="Ratio"
            value={state.ratio}
            min={1.0}
            max={20.0}
            step={0.1}
            defaultValue={4.0}
            displayFormatter={(val) => `${val.toFixed(1)}:1`}
            onChange={(val) => node.setRatio(val)}
          />

          {/* Knob 3: Attack */}
          <PressKnob
            label="Attack"
            value={state.attack * 1000} // display in ms
            min={0.1}
            max={100.0}
            step={0.5}
            defaultValue={20.0}
            unit=" ms"
            onChange={(val) => node.setAttack(val / 1000)}
          />

          {/* Knob 4: Release */}
          <PressKnob
            label="Release"
            value={state.release * 1000} // display in ms
            min={10.0}
            max={1000.0}
            step={5.0}
            defaultValue={150.0}
            unit=" ms"
            onChange={(val) => node.setRelease(val / 1000)}
          />
        </div>
      </div>

      {/* Secondary Controls Toolbar (Mix, Output Gain, HPF, Auto Gain) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F4F4F5',
          borderRadius: '12px',
          padding: '10px 16px',
          gap: '12px',
          fontSize: '11px',
          color: '#52525B',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>HPF:</span>
          <input
            type="range"
            min="20"
            max="300"
            step="5"
            value={state.sidechainHpf}
            onChange={(e) => node.setSidechainHpf(parseFloat(e.target.value))}
            style={{ width: '60px', accentColor: '#F59E0B' }}
          />
          <span style={{ fontFamily: 'monospace', minWidth: '40px' }}>{Math.round(state.sidechainHpf)}Hz</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Mix:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.mix}
            onChange={(e) => node.setMix(parseFloat(e.target.value))}
            style={{ width: '60px', accentColor: '#F59E0B' }}
          />
          <span style={{ fontFamily: 'monospace', minWidth: '35px' }}>{Math.round(state.mix * 100)}%</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Output:</span>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={state.outputGain}
            onChange={(e) => node.setOutputGain(parseFloat(e.target.value))}
            style={{ width: '60px', accentColor: '#F59E0B' }}
          />
          <span style={{ fontFamily: 'monospace', minWidth: '45px' }}>
            {state.outputGain > 0 ? `+${state.outputGain.toFixed(1)}` : state.outputGain.toFixed(1)}dB
          </span>
        </div>

        <button
          onClick={() => node.setAutoGain(state.autoGain > 0.5 ? 0.0 : 1.0)}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: state.autoGain > 0.5 ? '1px solid #F59E0B' : '1px solid #D4D4D8',
            background: state.autoGain > 0.5 ? '#FEF3C7' : '#FFFFFF',
            color: state.autoGain > 0.5 ? '#B45309' : '#71717A',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Auto Gain: {state.autoGain > 0.5 ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Signature "SonoDS" branding in bottom-right corner matching sketch */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '24px',
          fontSize: '16px',
          fontWeight: 900,
          letterSpacing: '-0.4px',
          color: '#18181B',
          opacity: 0.85,
        }}
      >
        SonoDS
      </div>
    </div>
  );
};
