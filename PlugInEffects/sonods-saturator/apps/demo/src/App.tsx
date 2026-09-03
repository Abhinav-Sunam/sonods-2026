import React, { useEffect, useRef, useState } from 'react';
import { SonodsSaturatorNode } from '@sonods/sat-engine';
import { FACTORY_PRESETS, SaturatorPreset, SonodsSaturatorPlugin } from '@sonods/sat-ui';

export const App: React.FC = () => {
  const [node, setNode] = useState<SonodsSaturatorNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [signalType, setSignalType] = useState<string>('file');
  const [selectedPreset, setSelectedPreset] = useState<string>('tape-master-glue');
  const [isBypassed, setIsBypassed] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const drumIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtxRef.current = ctx;

    const satNode = new SonodsSaturatorNode(ctx);
    satNode.whenReady().then(() => {
      setNode(satNode);
    });

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    gainRef.current = masterGain;

    satNode.outputNode.connect(masterGain);
    masterGain.connect(ctx.destination);

    return () => {
      satNode.dispose();
      ctx.close();
    };
  }, []);

  // Handle file upload and decode to AudioBuffer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioCtxRef.current) return;

    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    setFileName(file.name);
    setIsDecoding(true);
    setSignalType('file');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);
    } catch (err) {
      console.error('Failed to decode audio file:', err);
      setFileName('Error decoding file');
    } finally {
      setIsDecoding(false);
      // Reset input value so same file can be re-uploaded if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startSignal = async () => {
    if (!audioCtxRef.current || !node) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    stopSignal();

    if (signalType === 'file') {
      if (!audioBuffer) return;
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(node.inputNode);
      source.start();
      source.onended = () => {
        setIsPlaying(false);
      };
      sourceRef.current = source;
    } else if (signalType === 'sine440' || signalType === 'bass100') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = signalType === 'sine440' ? 440 : 100;
      osc.connect(node.inputNode);
      osc.start();
      oscRef.current = osc;
    } else if (signalType === 'chirp') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(40, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(12000, ctx.currentTime + 3);
      osc.connect(node.inputNode);
      osc.start();
      oscRef.current = osc;
    } else if (signalType === 'drums') {
      let step = 0;
      const bpm = 124;
      const intervalMs = (60 / bpm / 4) * 1000;

      drumIntervalRef.current = window.setInterval(() => {
        const now = ctx.currentTime;
        if (step % 8 === 0) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
          g.gain.setValueAtTime(0.8, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(g);
          g.connect(node.inputNode);
          osc.start(now);
          osc.stop(now + 0.25);
        }
        if (step % 8 === 4) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
          g.gain.setValueAtTime(0.6, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(g);
          g.connect(node.inputNode);
          osc.start(now);
          osc.stop(now + 0.18);
        }
        if (step % 2 === 0) {
          const bufferSize = ctx.sampleRate * 0.04;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.18, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          whiteNoise.connect(g);
          g.connect(node.inputNode);
          whiteNoise.start(now);
        }
        step = (step + 1) % 16;
      }, intervalMs);
    }

    setIsPlaying(true);
  };

  const stopSignal = () => {
    if (oscRef.current) {
      try { oscRef.current.stop(); oscRef.current.disconnect(); } catch {}
      oscRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.stop(); sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (drumIntervalRef.current) {
      clearInterval(drumIntervalRef.current);
      drumIntervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPreset(presetId);
    const preset = FACTORY_PRESETS.find((p) => p.id === presetId);
    if (preset && node) {
      node.setDrive(preset.drive);
      node.setCharacter(preset.character);
      node.setTone(preset.tone);
      node.setMix(preset.mix);
      node.setOutputGain(preset.outputGain);
      node.setAutoGain(preset.autoGain);
      node.setQuality(preset.quality);
    }
  };

  const handleBypassToggle = () => {
    if (!node) return;
    const nextBypass = !isBypassed;
    setIsBypassed(nextBypass);
    node.setMix(nextBypass ? 0.0 : 1.0);
  };

  const canPlay = signalType !== 'file' || audioBuffer !== null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '32px 16px',
        boxSizing: 'border-box',
        background: '#F0F0F2',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      }}
    >
      {/* --- Global Toolbar & Signal Generator --- */}
      <div
        style={{
          width: '720px',
          maxWidth: '100%',
          marginBottom: '16px',
          padding: '10px 18px',
          borderRadius: '12px',
          background: '#FFFFFF',
          border: '1.5px solid #D4D4D8',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Top row: Source selector + Play/Stop */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={signalType}
              onChange={(e) => {
                setSignalType(e.target.value);
                if (isPlaying) stopSignal();
              }}
              style={{
                background: '#FAFAFA',
                color: '#18181B',
                border: '1.5px solid #D4D4D8',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <option value="file">🎵 Upload Song</option>
              <option value="sine440">440 Hz Sine Wave</option>
              <option value="bass100">100 Hz Sub Bass</option>
              <option value="drums">124 BPM Drum Groove</option>
              <option value="chirp">Logarithmic Frequency Sweep</option>
            </select>

            <button
              onClick={isPlaying ? stopSignal : startSignal}
              disabled={!canPlay || isDecoding}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: !canPlay || isDecoding ? '#D4D4D8' : isPlaying ? '#ef4444' : '#22c55e',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: !canPlay || isDecoding ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: !canPlay || isDecoding ? 0.6 : 1,
              }}
            >
              {isDecoding ? '⏳ Decoding...' : isPlaying ? '⏹ STOP' : '▶ PLAY'}
            </button>
          </div>

          {/* Preset + Bypass */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={selectedPreset}
              onChange={handlePresetSelect}
              style={{
                background: '#FAFAFA',
                color: '#18181B',
                border: '1.5px solid #D4D4D8',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {FACTORY_PRESETS.map((p: SaturatorPreset) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleBypassToggle}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: isBypassed ? '1.5px solid #eab308' : '1.5px solid #D4D4D8',
                background: isBypassed ? '#fef9c322' : '#FFFFFF',
                color: isBypassed ? '#a16207' : '#52525B',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {isBypassed ? 'BYPASSED' : 'ACTIVE'}
            </button>
          </div>
        </div>

        {/* File Upload Row (only when file mode is selected) */}
        {signalType === 'file' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#FAFAFA',
              border: '1.5px dashed #D4D4D8',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1.5px solid #D4D4D8',
                background: '#FFFFFF',
                color: '#18181B',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              📁 Choose File
            </button>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: fileName ? '#18181B' : '#A1A1AA',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {isDecoding ? '⏳ Decoding audio...' : fileName || 'No file selected — drop any MP3, WAV, FLAC, etc.'}
            </span>
            {audioBuffer && (
              <span style={{ fontSize: '10px', color: '#71717A', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {audioBuffer.duration.toFixed(1)}s • {audioBuffer.numberOfChannels}ch • {audioBuffer.sampleRate / 1000}kHz
              </span>
            )}
          </div>
        )}
      </div>

      {/* --- Main Plugin Interface --- */}
      {node ? (
        <SonodsSaturatorPlugin node={node} />
      ) : (
        <div style={{ padding: '40px', color: '#71717A', fontSize: '14px' }}>
          Initializing SonoDS Saturator DSP Engine...
        </div>
      )}
    </div>
  );
};
