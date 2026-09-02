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
      // 5 standard parametric EQ bands
      eqNode.addBand(Shape.LowCut, 35, 0, 0.7);
      eqNode.addBand(Shape.LowShelf, 120, 3.0, 0.8);
      eqNode.addBand(Shape.Bell, 800, -2.5, 1.4);
      eqNode.addBand(Shape.HighShelf, 6000, 2.5, 0.9);
      eqNode.addBand(Shape.HighCut, 18000, 0, 0.7);

      // Wire audio nodes
      eqNode.connect(audioHarness.masterGain);
      audioHarness.masterGain.connect(audioCtx.destination);

      setNode(eqNode);
      setHarness(audioHarness);
      setDspStatus(`DSP Engine: Active (${audioCtx.sampleRate} Hz) • Rust DF2T`);
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
      node.setBandParam(band.index, ParamId.Enabled, nextBypass ? 0 : 1);
    }
  };

  const handleToggleAB = () => {
    if (!node) return;
    if (abState === 'A') {
      stateARef.current = node.getState();
      if (!stateBRef.current) {
        stateBRef.current = JSON.parse(JSON.stringify(stateARef.current));
      }
      if (stateBRef.current) {
        node.setState(stateBRef.current);
      }
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
    node.resetToDefault();
    setIsBypassed(false);
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
          <h1>SonoDS Parametric EQ 2</h1>
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
          <span className="key-tag">Click/Drag</span> Canvas Node or Slider &nbsp;|&nbsp;{' '}
          <span className="key-tag">Rotate Knobs</span> FREQ & BW &nbsp;|&nbsp;{' '}
          <span className="key-tag">Double Click</span> Reset 0 dB
        </div>
        <div>
          <span className="key-tag">Top Shape Icon</span> Cycle Filter Type &nbsp;|&nbsp;{' '}
          <span className="key-tag">Top-Right AI</span> Smart Preset Curves
        </div>
      </div>

      {/* Studio Controls Grid */}
      <div className="controls-grid">
        {/* Audio Source Card */}
        <div className="control-card">
          <div className="card-title">
            <span>Audio Signal Generator</span>
            <span
              style={{
                color: currentSource === 'stop' ? 'var(--text-dim)' : '#84CC16',
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
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Monitor Level</span>
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

        {/* Global EQ Functions */}
        <div className="control-card">
          <div className="card-title">
            <span>Global EQ & A/B Testing</span>
          </div>
          <div className="btn-group">
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
              A/B Compare: State {abState}
            </button>
            <button className="studio-btn" onClick={handleResetFlat}>
              Flat All Bands
            </button>
          </div>
        </div>

        {/* Cross-Track AI Overlap */}
        <div className="control-card">
          <div className="card-title">
            <span>Cross-Track Collision Simulation</span>
          </div>
          <div className="btn-group">
            <button className="studio-btn" onClick={handleSimulateKickConflict}>
              Simulate Kick Overlap
            </button>
            <button className="studio-btn" onClick={handleSimulateBassConflict}>
              Simulate Bass Overlap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
