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
  width = 740,
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
        boxShadow: 'var(--sat-shadow-panel)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* --- Top Header Bar (matching EQ topBar) --- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 18px',
          background: '#FAFAFA',
          borderBottom: '1.5px solid #E4E4E7',
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
            SonoDS Saturator
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
          padding: '8px 18px',
          gap: '6px',
          background: '#FFFFFF',
          borderBottom: '1.5px solid #E4E4E7',
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

          const activeColorVal =
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
                padding: '7px 12px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: 'var(--sat-radius-sm)',
                border: isActive ? `2px solid ${activeColorVal}` : '1.5px solid #D4D4D8',
                background: isActive ? '#FFFFFF' : '#F4F4F5',
                color: isActive ? '#18181B' : '#71717A',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? `0 0 0 2px ${activeColorVal}33` : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* --- Main Middle Stage: Character Left | BIG Rainbow Knob Right --- */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          background: '#FFFFFF',
        }}
      >
        {/* Left: Expressive Animated Character Stage + Rainbow Stream */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            minHeight: '320px',
            borderRight: '1.5px solid #E4E4E7',
          }}
        >
          <SaturatorCharacterFace
            drive={state.drive}
            character={state.character}
            audioPeak={audioPeak}
          />
        </div>

        {/* Right: BIG Hero Rainbow Drive Knob — THE visual centerpiece */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            minHeight: '320px',
            background: '#FAFAFA',
          }}
        >
          <RainbowKnob
            label="DRIVE"
            value={state.drive}
            min={0.0}
            max={1.0}
            step={0.01}
            defaultValue={0.3}
            size={200}
            hero={true}
            accentColor={charAccentRaw}
            displayFormatter={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => node.setDrive(v)}
          />
        </div>
      </div>

      {/* --- Bottom Controls Row: Knobs Left | Visualizer Right --- */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          borderTop: '1.5px solid #E4E4E7',
          background: '#E8E8EC',
        }}
      >
        {/* Left: Secondary Knobs (Tone, Mix, Output) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '18px 16px',
            borderRight: '1.5px solid #D4D4D8',
          }}
        >
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

        {/* Right: Transfer Curve or Harmonic Spectrum Visualizer */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '10px 12px',
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

          {viewTab === 'curve' ? (
            <TransferCurveCanvas
              node={node}
              width={300}
              height={140}
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

      {/* --- Bottom Bar (matching EQ bottomBar) --- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 18px',
          background: '#FAFAFA',
          borderTop: '1.5px solid #E4E4E7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Stage indicator */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: charAccentRaw,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Stage {state.drive < 0.25 ? 1 : state.drive < 0.55 ? 2 : state.drive < 0.85 ? 3 : 4}
          </span>
          <span style={{ fontSize: '10px', color: '#A1A1AA' }}>•</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#52525B',
              fontFamily: 'var(--sat-font-mono)',
            }}
          >
            Drive {Math.round(state.drive * 100)}%
          </span>
        </div>

        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#18181B',
          }}
        >
          SonoDS
        </span>
      </div>
    </div>
  );
};
