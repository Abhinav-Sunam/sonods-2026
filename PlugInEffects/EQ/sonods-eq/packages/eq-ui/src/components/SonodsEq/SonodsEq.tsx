import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BandState, CutSlope, ParamId, Shape, SonodsEqNode } from '@sonods/eq-engine';
import { useSonodsEqStore } from '../../hooks/useSonodsEqStore.js';
import { SessionRegistry } from '../../sessionRegistry.js';
import {
  applyPresetWithAnimation,
  ExplainableAnnotation,
  INSTRUMENT_PRESETS,
} from '../../explainability.js';

import { StatusDots } from '../StatusDots/index.js';
import { Readout } from '../Readout/index.js';
import { CurveCanvas } from '../CurveCanvas/index.js';
import { ModePills, EqMode } from '../ModePills/index.js';
import { ContextMenu } from '../ContextMenu/index.js';
import { Annotations } from '../Annotations/index.js';

import '../../theme/tokens.css';
import styles from './SonodsEq.module.css';

export interface SonodsEqProps {
  node: SonodsEqNode | null;
  trackName?: string;
  showDevOverlay?: boolean;
}

export const SonodsEq: React.FC<SonodsEqProps> = ({
  node,
  trackName = 'Track 1',
  showDevOverlay = false,
}) => {
  const state = useSonodsEqStore(node);
  const [selectedBandIndex, setSelectedBandIndex] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<EqMode>('curve');
  const [annotations, setAnnotations] = useState<ExplainableAnnotation[]>([]);
  const [fps, setFps] = useState(60);
  const [frameDurationMs, setFrameDurationMs] = useState(0);

  // Context menu state
  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    bandIndex: number;
  } | null>(null);

  // Session registry for multi-track cross-awareness (Phase 6)
  const sessionRegistry = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new SessionRegistry(`eq-${Math.random().toString(36).substring(2, 7)}`, trackName);
  }, [trackName]);

  useEffect(() => {
    return () => {
      sessionRegistry?.destroy();
    };
  }, [sessionRegistry]);

  // Set default initial band selection if bands exist
  useEffect(() => {
    if (selectedBandIndex === null && state.bands.length > 0) {
      setSelectedBandIndex(state.bands[Math.min(2, state.bands.length - 1)].index);
    }
  }, [state.bands, selectedBandIndex]);

  const selectedBand = useMemo(() => {
    return state.bands.find((b: BandState) => b.index === selectedBandIndex) || null;
  }, [state.bands, selectedBandIndex]);

  const handleModeChange = useCallback(
    (mode: EqMode) => {
      setActiveMode(mode);
      if (mode === 'dynamic' && selectedBandIndex !== null && node) {
        const b = state.bands.find((x: BandState) => x.index === selectedBandIndex);
        if (b) {
          node.setBandParam(selectedBandIndex, ParamId.DynamicEnabled, 1);
          node.setBandParam(selectedBandIndex, ParamId.DynamicRange, -6.0);
        }
      } else if (mode === 'ai' && node) {
        applyPresetWithAnimation(node, INSTRUMENT_PRESETS.vocal).then((notes) => {
          setAnnotations(notes);
        });
      }
    },
    [selectedBandIndex, node, state.bands]
  );

  const handleFrequencyChange = useCallback(
    (newFreq: number) => {
      if (selectedBandIndex !== null && node) {
        node.setBandParam(selectedBandIndex, ParamId.Freq, newFreq);
      }
    },
    [selectedBandIndex, node]
  );

  const handleContextMenu = useCallback((x: number, y: number, bandIndex: number) => {
    setMenuState({ x, y, bandIndex });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  // Keyboard navigation (Task 4.4)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!node || state.bands.length === 0) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedBandIndex === null) {
          setSelectedBandIndex(state.bands[0].index);
        } else {
          const currIdx = state.bands.findIndex((b) => b.index === selectedBandIndex);
          const nextIdx = (currIdx + 1) % state.bands.length;
          setSelectedBandIndex(state.bands[nextIdx].index);
        }
      } else if (selectedBandIndex !== null && selectedBand) {
        const stepMult = e.shiftKey ? 4 : 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          node.setBandParam(
            selectedBandIndex,
            ParamId.Freq,
            selectedBand.freq * Math.pow(0.96, stepMult)
          );
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          node.setBandParam(
            selectedBandIndex,
            ParamId.Freq,
            selectedBand.freq * Math.pow(1.04, stepMult)
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          node.setBandParam(
            selectedBandIndex,
            ParamId.Gain,
            selectedBand.gain + 0.5 * stepMult
          );
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          node.setBandParam(
            selectedBandIndex,
            ParamId.Gain,
            selectedBand.gain - 0.5 * stepMult
          );
        }
      }
    },
    [node, state.bands, selectedBandIndex, selectedBand]
  );

  return (
    <div
      className={styles.chassis}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={closeMenu}
    >
      {/* Top Header Bar */}
      <div className={styles.topBar}>
        <Readout
          selectedBand={selectedBand}
          onFrequencyChange={handleFrequencyChange}
        />
        <StatusDots cpuWarning={frameDurationMs > 16.6} />
      </div>

      {/* Main Canvas Stage */}
      <CurveCanvas
        node={node}
        bands={state.bands}
        selectedBandIndex={selectedBandIndex}
        onSelectBand={setSelectedBandIndex}
        onContextMenu={handleContextMenu}
        onFrameTiming={(f, d) => {
          setFps(f);
          setFrameDurationMs(d);
        }}
        sessionRegistry={sessionRegistry}
      />

      {/* AI Explainability Annotations */}
      <Annotations
        annotations={annotations}
        onDismiss={(id) => setAnnotations((prev) => prev.filter((a) => a.id !== id))}
      />

      {/* Bottom Mode Action Pills */}
      <ModePills activeMode={activeMode} onModeChange={handleModeChange} />

      {/* SonoDS Logo from hand-drawn sketch */}
      <div className={styles.sonodsBrand}>SonoDS</div>

      {/* Right-click Context Menu */}
      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          band={state.bands.find((b: BandState) => b.index === menuState.bandIndex)!}
          onSelectShape={(s: Shape) => {
            node?.setBandParam(menuState.bandIndex, ParamId.Shape, s);
            closeMenu();
          }}
          onSelectSlope={(slope: CutSlope) => {
            node?.setBandParam(menuState.bandIndex, ParamId.Slope, slope);
            closeMenu();
          }}
          onToggleDynamic={() => {
            const b = state.bands.find((x: BandState) => x.index === menuState.bandIndex);
            if (b && node) {
              node.setBandParam(
                menuState.bandIndex,
                ParamId.DynamicEnabled,
                b.dynamicEnabled ? 0 : 1
              );
              node.setBandParam(
                menuState.bandIndex,
                ParamId.DynamicRange,
                b.dynamicEnabled ? 0 : -6.0
              );
            }
            closeMenu();
          }}
          onToggleMode={() => {
            const b = state.bands.find((x: BandState) => x.index === menuState.bandIndex);
            if (b && node) {
              const nextMode = (b.mode + 1) % 3;
              node.setBandParam(menuState.bandIndex, ParamId.Mode, nextMode);
            }
            closeMenu();
          }}
          onDeleteBand={() => {
            node?.removeBand(menuState.bandIndex);
            setSelectedBandIndex(null);
            closeMenu();
          }}
          onClose={closeMenu}
        />
      )}

      {/* Dev Overlay */}
      {showDevOverlay && (
        <div className={styles.devOverlay}>
          FPS: {Math.round(fps)} | Frame: {frameDurationMs.toFixed(1)}ms | DPR:{' '}
          {typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1}
        </div>
      )}
    </div>
  );
};
