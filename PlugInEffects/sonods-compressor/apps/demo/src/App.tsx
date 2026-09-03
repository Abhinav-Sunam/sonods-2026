import React, { useEffect, useRef, useState } from 'react';
import { SonodsCompressorNode } from '@sonods/comp-engine';
import { SonodsCompressorPlugin } from '@sonods/comp-ui';

export const App: React.FC = () => {
  const [node, setNode] = useState<SonodsCompressorNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [signalType, setSignalType] = useState<string>('drums');
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

    const compNode = new SonodsCompressorNode(ctx);
    setNode(compNode);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    gainRef.current = masterGain;

    compNode.outputNode.connect(masterGain);
    masterGain.connect(ctx.destination);

    return () => {
      compNode.dispose();
      ctx.close();
    };
  }, []);

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
      if (!audioBuffer) {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
        return;
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      source.connect(node.inputNode);
      source.start();
      source.onended = () => {
        setIsPlaying(false);
      };
      sourceRef.current = source;
    } else if (signalType === 'drums') {
      let step = 0;
      const bpm = 126;
      const intervalMs = (60 / bpm / 4) * 1000;

      // Play initial kick immediately
      playDrumStep(ctx, node.inputNode, 0);
      step = 1;

      drumIntervalRef.current = window.setInterval(() => {
        playDrumStep(ctx, node.inputNode, step);
        step = (step + 1) % 16;
      }, intervalMs);
    } else if (signalType === 'bass') {
      let step = 0;
      const bpm = 120;
      const intervalMs = (60 / bpm / 4) * 1000;

      drumIntervalRef.current = window.setInterval(() => {
        const now = ctx.currentTime;
        const freqs = [55, 55, 65.4, 55, 82.4, 73.4, 55, 98];
        const freq = freqs[step % freqs.length];

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        g.gain.setValueAtTime(0.7, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(g);
        g.connect(node.inputNode);
        osc.start(now);
        osc.stop(now + 0.25);

        step = (step + 1) % 16;
      }, intervalMs);
    } else if (signalType === 'sine440') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      osc.connect(node.inputNode);
      osc.start();
      oscRef.current = osc;
    }

    setIsPlaying(true);
  };

  const playDrumStep = (ctx: AudioContext, dest: AudioNode, step: number) => {
    const now = ctx.currentTime;
    // Kick on 0, 4, 8, 12 (4-on-the-floor)
    if (step % 4 === 0) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      g.gain.setValueAtTime(0.95, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    // Snare on 4, 12
    if (step % 8 === 4) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      g.gain.setValueAtTime(0.75, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.22);
    }
    // Hi-hats on offbeats (2, 6, 10, 14)
    if (step % 2 === 1) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, now);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.06);
    }
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
      {/* Global Toolbar & Song Uploader */}
      <div
        style={{
          width: '680px',
          maxWidth: '100%',
          marginBottom: '16px',
          padding: '12px 18px',
          borderRadius: '16px',
          background: '#FFFFFF',
          border: '1.5px solid #D4D4D8',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
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
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="drums">🥁 126 BPM Drum Bus (Transients)</option>
              <option value="bass">🎸 120 BPM Bass Groove</option>
              <option value="sine440">🔊 440 Hz Test Sine</option>
              <option value="file">🎵 Custom Audio File</option>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717A' }}>Vol:</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                defaultValue="1"
                onChange={(e) => {
                  if (gainRef.current) {
                    gainRef.current.gain.value = parseFloat(e.target.value);
                  }
                }}
                style={{ width: '80px', accentColor: '#22c55e', cursor: 'pointer' }}
              />
            </div>
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
              📁 Choose Song
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
              {isDecoding ? '⏳ Decoding audio...' : fileName || 'Drop/Select any song (MP3, WAV, FLAC, etc.)'}
            </span>
            {audioBuffer && (
              <span style={{ fontSize: '10px', color: '#71717A', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {audioBuffer.duration.toFixed(1)}s • {audioBuffer.numberOfChannels}ch • {audioBuffer.sampleRate / 1000}kHz
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Compressor Plugin Interface */}
      {node ? (
        <SonodsCompressorPlugin node={node} />
      ) : (
        <div style={{ padding: '40px', color: '#71717A', fontSize: '14px' }}>
          Initializing SonoDS Compressor DSP Core...
        </div>
      )}
    </div>
  );
};
