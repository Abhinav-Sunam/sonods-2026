import React, { useState, useEffect, useRef } from 'react';
import { EqState, ParamId, PhaseMode, Shape, SonodsEqNode } from '@sonods/eq-engine';
import { SonodsEq, INSTRUMENT_PRESETS, applyPresetWithAnimation, SessionRegistry } from '@sonods/eq-ui';
import { AudioHarness, SourceType } from './audioHarness';
import './style.css';

export const App: React.FC = () => {
  const [node, setNode] = useState<SonodsEqNode | null>(null);
  const [harness, setHarness] = useState<AudioHarness | null>(null);
  const [dspStatus, setDspStatus] = useState('Initializing WASM Core...');
  const [currentSource, setCurrentSource] = useState<SourceType | 'stop'>('stop');
  const [phaseMode, setPhaseMode] = useState<PhaseMode>(PhaseMode.ZeroLatency);
  const [isBypassed, setIsBypassed] = useState(false);
  const [abState, setAbState] = useState<'A' | 'B'>('A');
  const [volume, setVolume] = useState(0.5);

  const stateARef = useRef<EqState | null>(null);
  const stateBRef = useRef<EqState | null>(null);
  const simulatedTrackRef = useRef<SessionRegistry | null>(null);

  useEffect(() => {
    const audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const eqNode = new SonodsEqNode(audioCtx);
    const audioHarness = new AudioHarness(audioCtx);

    simulatedTrackRef.current = new SessionRegistry('simulated-remote-session', 'Kick Drum Track');

    eqNode.whenReady().then(() => {
      // Add default curve matching sketch
      eqNode.addBand(Shape.LowCut, 35, 0, 0.7);
      eqNode.addBand(Shape.LowShelf, 100, 3.5, 0.8);
      eqNode.addBand(Shape.Bell, 450, -2.5, 1.4);
      eqNode.addBand(Shape.Bell, 2400, 4.0, 2.0);
      eqNode.addBand(Shape.HighShelf, 8500, 3.5, 0.9);

      // Wire nodes
      eqNode.connect(audioHarness.masterGain);
      audioHarness.masterGain.connect(audioCtx.destination);

      setNode(eqNode);
      setHarness(audioHarness);
      setDspStatus(`Ready (${audioCtx.sampleRate} Hz) • Rust DF2T`);
      stateARef.current = eqNode.getState();
    });

    return () => {
      eqNode.destroy();
      audioHarness.stop();
      simulatedTrackRef.current?.destroy();
    };
  }, []);

  const handlePlaySource = (type: SourceType | 'stop') => {
    if (!harness || !node) return;
    if (type === 'stop') {
      harness.stop();
      setCurrentSource('stop');
    } else {
      harness.play(type, node.inputNode);
      setCurrentSource(type);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (harness) {
      harness.masterGain.gain.value = newVol;
    }
  };

  const handleSetPhase = (mode: PhaseMode) => {
    setPhaseMode(mode);
    node?.setPhaseMode(mode);
  };

  const handleToggleBypass = () => {
    if (!node) return;
    const nextBypass = !isBypassed;
    setIsBypassed(nextBypass);
    for (const band of node.getBands()) {
      node.setBandParam(band.index, ParamId.Bypass, nextBypass ? 0 : 1);
    }
  };

  const handleToggleAB = () => {
    if (!node) return;
    if (abState === 'A') {
      stateARef.current = node.getState();
      if (!stateBRef.current) {
        stateBRef.current = JSON.parse(JSON.stringify(stateARef.current));
      }
      node.setState(stateBRef.current);
      setAbState('B');
    } else {
      stateBRef.current = node.getState();
      if (stateARef.current) {
        node.setState(stateARef.current);
      }
      setAbState('A');
    }
  };

  const handleResetFlat = () => {
    if (!node) return;
    for (const band of node.getBands()) {
      node.setBandParam(band.index, ParamId.Gain, 0.0);
    }
  };

  const handleApplyPreset = (key: 'vocal' | 'kick' | 'bass') => {
    if (node) {
      applyPresetWithAnimation(node, INSTRUMENT_PRESETS[key]);
    }
  };

  const handleSimulateKickConflict = () => {
    const kickEnergy = new Float32Array(4096).fill(-90);
    for (let i = 5; i < 20; i++) {
      kickEnergy[i] = -18.0;
    }
    simulatedTrackRef.current?.publishSnapshot([{ freq: 65, gainDb: 6, q: 2 }], kickEnergy);
  };

  const handleSimulateBassConflict = () => {
    const bassEnergy = new Float32Array(4096).fill(-90);
    for (let i = 25; i < 55; i++) {
      bassEnergy[i] = -15.0;
    }
    simulatedTrackRef.current?.publishSnapshot([{ freq: 220, gainDb: 5, q: 1.5 }], bassEnergy);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand-title">
          <h1>SonoDS Studio EQ</h1>
        </div>
        <div className="status-badge" id="dsp-status">
          {dspStatus}
        </div>
      </header>

      {/* Main EQ Rack Stage */}
      <div className="plugin-stage">
        <SonodsEq node={node} trackName="Lead Vocal Track" showDevOverlay={false} />
      </div>

      {/* Interaction Instructions */}
      <div className="instructions-card">
        <div>
          <span className="key-tag">Click</span> Create Band &nbsp;|&nbsp;{' '}
          <span className="key-tag">Drag</span> Freq / Gain &nbsp;|&nbsp;{' '}
          <span className="key-tag">Scroll</span> Adjust Q &nbsp;|&nbsp;{' '}
          <span className="key-tag">Shift+Drag</span> Lock Gain Axis
        </div>
        <div>
          <span className="key-tag">Double Click</span> Reset Band &nbsp;|&nbsp;{' '}
          <span className="key-tag">Right Click</span> Shape & Dynamic Menu &nbsp;|&nbsp;{' '}
          <span className="key-tag">Tab / Arrows</span> Keyboard
        </div>
      </div>

      {/* Studio Controls Grid */}
      <div className="controls-grid">
        {/* Audio Source Card */}
        <div className="control-card">
          <div className="card-title">
            <span>Audio Signal Source</span>
            <span
              style={{
                color: currentSource === 'stop' ? 'var(--text-dim)' : 'var(--accent)',
              }}
            >
              {currentSource === 'stop' ? 'Stopped' : `Playing ${currentSource.toUpperCase()}`}
            </span>
          </div>
          <div className="btn-group">
            <button
              className={`studio-btn ${currentSource === 'pad' ? 'active' : ''}`}
              onClick={() => handlePlaySource('pad')}
            >
              Synth Pad
            </button>
            <button
              className={`studio-btn ${currentSource === 'drums' ? 'active' : ''}`}
              onClick={() => handlePlaySource('drums')}
            >
              Drum Loop
            </button>
            <button
              className={`studio-btn ${currentSource === 'pink_noise' ? 'active' : ''}`}
              onClick={() => handlePlaySource('pink_noise')}
            >
              Pink Noise
            </button>
            <button
              className={`studio-btn ${currentSource === 'sine' ? 'active' : ''}`}
              onClick={() => handlePlaySource('sine')}
            >
              450Hz Sine
            </button>
            <button
              className="studio-btn"
              style={{ color: '#EF4444' }}
              onClick={() => handlePlaySource('stop')}
            >
              Stop
            </button>
          </div>
          <div className="volume-slider">
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            />
            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Processing Mode & Phase Card */}
        <div className="control-card">
          <div className="card-title">
            <span>Phase & Engine Mode</span>
          </div>
          <div className="btn-group">
            <button
              className={`studio-btn ${phaseMode === PhaseMode.ZeroLatency ? 'active' : ''}`}
              onClick={() => handleSetPhase(PhaseMode.ZeroLatency)}
            >
              Zero Latency (IIR)
            </button>
            <button
              className={`studio-btn ${phaseMode === PhaseMode.NaturalPhase ? 'active' : ''}`}
              onClick={() => handleSetPhase(PhaseMode.NaturalPhase)}
            >
              Natural Phase
            </button>
            <button
              className={`studio-btn ${phaseMode === PhaseMode.LinearPhase ? 'active' : ''}`}
              onClick={() => handleSetPhase(PhaseMode.LinearPhase)}
            >
              Linear Phase (FIR)
            </button>
          </div>
          <div className="btn-group" style={{ marginTop: '4px' }}>
            <button
              className={`studio-btn ${isBypassed ? 'active' : ''}`}
              onClick={handleToggleBypass}
            >
              {isBypassed ? 'EQ Bypassed' : 'Bypass EQ'}
            </button>
            <button
              className={`studio-btn ${abState === 'B' ? 'active' : ''}`}
              onClick={handleToggleAB}
            >
              A/B State: {abState}
            </button>
            <button className="studio-btn" onClick={handleResetFlat}>
              Flat Curve
            </button>
          </div>
        </div>

        {/* Cross-Track Awareness & Presets */}
        <div className="control-card">
          <div className="card-title">
            <span>Cross-Track AI Awareness</span>
          </div>
          <div className="btn-group">
            <button className="studio-btn" onClick={handleSimulateKickConflict}>
              Simulate Kick Conflict
            </button>
            <button className="studio-btn" onClick={handleSimulateBassConflict}>
              Simulate Bass Conflict
            </button>
          </div>
          <div className="btn-group">
            <button className="studio-btn" onClick={() => handleApplyPreset('vocal')}>
              Vocal Preset
            </button>
            <button className="studio-btn" onClick={() => handleApplyPreset('kick')}>
              Kick Preset
            </button>
            <button className="studio-btn" onClick={() => handleApplyPreset('bass')}>
              Bass Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
