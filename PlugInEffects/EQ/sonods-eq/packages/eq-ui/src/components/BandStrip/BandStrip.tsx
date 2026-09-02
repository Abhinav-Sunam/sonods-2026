import React from 'react';
import { BandState, Shape } from '@sonods/eq-engine';
import { Knob } from '../Knob/index.js';
import { GainSlider } from '../GainSlider/index.js';
import { formatFrequency, formatQ } from '../../coords.js';
import styles from './BandStrip.module.css';

export interface BandStripProps {
  band: BandState;
  bandNumber: number;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  onGainChange: (gain: number) => void;
  onFreqChange: (freq: number) => void;
  onQChange: (q: number) => void;
  onShapeChange: (shape: Shape) => void;
}

export const BandStrip: React.FC<BandStripProps> = ({
  band,
  bandNumber,
  color,
  isSelected,
  onSelect,
  onGainChange,
  onFreqChange,
  onQChange,
  onShapeChange,
}) => {
  const getShapeSymbol = (shape: Shape) => {
    switch (shape) {
      case Shape.LowCut:
        return 'HP';
      case Shape.LowShelf:
        return 'LS';
      case Shape.Bell:
        return 'PEAK';
      case Shape.HighShelf:
        return 'HS';
      case Shape.HighCut:
        return 'LP';
      default:
        return 'PEAK';
    }
  };

  const cycleShape = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shapes = [Shape.LowCut, Shape.LowShelf, Shape.Bell, Shape.HighShelf, Shape.HighCut];
    const currIdx = shapes.indexOf(band.shape);
    const nextShape = shapes[(currIdx + 1) % shapes.length];
    onShapeChange(nextShape);
  };

  return (
    <div
      className={`${styles.bandStrip} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
    >
      {/* Header: Band Number & Shape */}
      <div className={styles.headerRow}>
        <div
          className={styles.bandNumber}
          style={{ backgroundColor: color }}
          title={`Band ${bandNumber} (Click to select)`}
        >
          {bandNumber}
        </div>
        <button
          className={styles.shapeBtn}
          onClick={cycleShape}
          title={`Filter: ${getShapeSymbol(band.shape)} (Click to cycle)`}
        >
          {getShapeSymbol(band.shape)}
        </button>
      </div>

      {/* Vertical Gain Slider */}
      <GainSlider
        gain={band.gain}
        color={color}
        onChange={onGainChange}
      />

      {/* FREQ & BW/Q Rotary Knobs */}
      <div className={styles.controlsColumn}>
        <Knob
          label="FREQ"
          value={band.freq}
          min={20}
          max={20000}
          isLog={true}
          color={color}
          ringColor="#EAB308"
          formatValue={(v) => formatFrequency(v)}
          onChange={onFreqChange}
        />
        <Knob
          label="BW"
          value={band.q}
          min={0.1}
          max={10.0}
          color={color}
          ringColor="#EAB308"
          formatValue={(v) => formatQ(v)}
          onChange={onQChange}
        />
      </div>
    </div>
  );
};
