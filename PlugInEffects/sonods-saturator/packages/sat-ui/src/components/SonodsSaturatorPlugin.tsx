import React, { useEffect, useState } from 'react';
import {
  CharacterType,
  QualityType,
  SaturatorState,
  SonodsSaturatorNode,
} from '@sonods/sat-engine';
import { SaturatorCharacterFace } from './SaturatorCharacterFace.js';
import { RainbowKnob } from './RainbowKnob.js';
import { TransferCurveCanvas } from './TransferCurveCanvas.js';
import { HarmonicVisualizer } from './HarmonicVisualizer.js';
import '../theme/tokens.css';

export interface SonodsSaturatorPluginProps {
  node: SonodsSaturatorNode;
  width?: number | string;
}

export const SonodsSaturatorPlugin: React.FC<SonodsSaturatorPluginProps> = ({
  node,
  width = 680,
}) => {
  const [state, setState] = useState<SaturatorState>(node.getState());
  const [viewTab, setViewTab] = useState<'curve' | 'harmonics'>('curve');
  const [audioPeak, setAudioPeak] = useState<number>(0);

  // Subscribe to node state updates
  useEffect(() => {
    const unsub = node.subscribe((nextState) => {
      setState(nextState);
    });
    return unsub;
  }, [node]);

  // Real-time audio analyser polling loop for reactive face and ball animations
  useEffect(() => {
    let animId: number;
    const dataArray = new Uint8Array(node.postAnalyser.frequencyBinCount);

    const poll = () => {
      node.postAnalyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setAudioPeak(rms * 2.5);

      animId = requestAnimationFrame(poll);
    };

    poll();
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [node]);

  const handleCharacterChange = (char: CharacterType) => {
    node.setCharacter(char);
  };

  const handleQualityChange = (quality: QualityType) => {
    node.setQuality(quality);
  };

  const handleAutoGainToggle = () => {
    node.setAutoGain(!state.autoGain);
  };

  const charColor =
    state.character === 'tape'
      ? 'var(--sat-color-tape)'
      : state.character === 'tube'
      ? 'var(--sat-color-tube)'
      : 'var(--sat-color-transformer)';

  const charGlow =
    state.character === 'tape'
      ? 'var(--sat-glow-tape)'
      : state.character === 'tube'
      ? 'var(--sat-glow-tube)'
      : 'var(--sat-glow-transformer)';

  const charAccentRaw =
    state.character === 'tape'
      ? '#f59e0b'
      : state.character === 'tube'
      ? '#f43f5e'
      : '#06b6d4';

  return (
    <div
      className="sat-root"
      style={{
        width,
        maxWidth: '100%',
        borderRadius: '24px',
        background: '#FFFFFF',
        border: '3px solid #18181B',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'var(--sat-font-family)',
      }}
    >
      {/* --- Top Header Bar --- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1.5px solid #E4E4E7',
          paddingBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: charColor,
              boxShadow: `0 0 8px ${charGlow}`,
            }}
          />
          <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', color: '#18181B' }}>
            SONODS SATURATOR
          </span>
          <span className="sat-badge">ADAA2 DSP</span>
        </div>

        {/* Quality & Auto Gain Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`sat-btn ${state.quality === 'high' ? 'active' : ''}`}
            onClick={() => handleQualityChange(state.quality === 'high' ? 'standard' : 'high')}
            title="Switch between 2x and 4x Polyphase Oversampling"
          >
            {state.quality === 'high' ? '4X HQ' : '2X STD'}
          </button>

          <button
            className={`sat-btn ${state.autoGain ? 'active' : ''}`}
            onClick={handleAutoGainToggle}
            title="Analytic Auto Gain Compensation (maintains perceived loudness)"
          >
            AUTO GAIN {state.autoGain ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* --- Character Type Selector Pills --- */}
      <div
        style={{
          display: 'flex',
          background: '#F4F4F5',
          padding: '4px',
          borderRadius: '8px',
          border: '1.5px solid #E4E4E7',
          gap: '4px',
        }}
      >
        {(['tape', 'tube', 'transformer'] as CharacterType[]).map((char) => {
          const isActive = state.character === char;
          const label =
            char === 'tape'
              ? 'Tape Hysteresis'
              : char === 'tube'
              ? 'Triode Tube'
              : 'Transformer Core';

          const activeColor =
            char === 'tape'
              ? 'var(--sat-color-tape)'
              : char === 'tube'
              ? 'var(--sat-color-tube)'
              : 'var(--sat-color-transformer)';

          const activeColorHex =
            char === 'tape'
              ? '#f59e0b'
              : char === 'tube'
              ? '#f43f5e'
              : '#06b6d4';

          return (
            <button
              key={char}
              onClick={() => handleCharacterChange(char)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: '6px',
                border: isActive ? `2px solid ${activeColorHex}` : '1.5px solid transparent',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#18181B' : '#71717A',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* --- Main Middle Stage (Character Face & Visualizer) --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        {/* Left: Expressive Animated Character Stage Face */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FAFAFA',
            border: '1.5px solid #E4E4E7',
            borderRadius: '16px',
            padding: '16px',
            minHeight: '260px',
          }}
        >
          <SaturatorCharacterFace
            drive={state.drive}
            character={state.character}
            audioPeak={audioPeak}
          />
        </div>

        {/* Right: Transfer Curve or Harmonic Spectrum Visualizer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Visualizer Mode Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`sat-btn ${viewTab === 'curve' ? 'active' : ''}`}
              onClick={() => setViewTab('curve')}
            >
              Transfer Curve
            </button>
            <button
              className={`sat-btn ${viewTab === 'harmonics' ? 'active' : ''}`}
              onClick={() => setViewTab('harmonics')}
            >
              Harmonics
            </button>
          </div>

          <div
            style={{
              background: '#FAFAFA',
              border: '1.5px solid #E4E4E7',
              borderRadius: '12px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {viewTab === 'curve' ? (
              <TransferCurveCanvas
                node={node}
                width={280}
                height={200}
                audioPeak={audioPeak}
                accentColor={charAccentRaw}
              />
            ) : (
              <HarmonicVisualizer
                drive={state.drive}
                character={state.character}
                audioPeak={audioPeak}
              />
            )}
          </div>
        </div>
      </div>

      {/* --- Bottom Controls Stage (Rainbow Knobs) --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
          gap: '16px',
          alignItems: 'center',
          background: '#FAFAFA',
          border: '1.5px solid #E4E4E7',
          borderRadius: '16px',
          padding: '18px 24px',
        }}
      >
        {/* Main Drive Knob (Larger size) */}
        <RainbowKnob
          label="DRIVE"
          value={state.drive}
          min={0.0}
          max={1.0}
          step={0.01}
          defaultValue={0.3}
          size={84}
          accentColor={charAccentRaw}
          displayFormatter={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => node.setDrive(v)}
        />

        {/* Tone Pre-emphasis Knob */}
        <RainbowKnob
          label="TONE"
          value={state.tone}
          min={-12.0}
          max={12.0}
          step={0.1}
          defaultValue={0.0}
          size={68}
          unit=" dB"
          onChange={(v) => node.setTone(v)}
        />

        {/* Mix (Dry/Wet) Knob */}
        <RainbowKnob
          label="MIX"
          value={state.mix}
          min={0.0}
          max={1.0}
          step={0.01}
          defaultValue={1.0}
          size={68}
          displayFormatter={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => node.setMix(v)}
        />

        {/* Output Gain Trim Knob */}
        <RainbowKnob
          label="OUTPUT"
          value={state.outputGain}
          min={-24.0}
          max={24.0}
          step={0.1}
          defaultValue={0.0}
          size={68}
          unit=" dB"
          onChange={(v) => node.setOutputGain(v)}
        />
      </div>
    </div>
  );
};
