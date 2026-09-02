import { BandState } from '@sonods/eq-engine';
import { frequencyToX, gainToY } from '../coords.js';

export interface CurvePoint {
  freq: number;
  gainDb: number;
}

export const BAND_COLORS = [
  '#EC4899', // Band 1: Pink (Sub / Low Cut)
  '#F97316', // Band 2: Orange (Bass / Low Shelf)
  '#EAB308', // Band 3: Yellow (Low Mid)
  '#84CC16', // Band 4: Lime Green (Mid)
  '#10B981', // Band 5: Emerald (High Mid)
  '#06B6D4', // Band 6: Cyan (Presence)
  '#8B5CF6', // Band 7: Purple (Treble / High Cut)
];

const OCTAVE_REGIONS = [
  { label: 'SUB', freq: 40 },
  { label: 'BASS', freq: 100 },
  { label: 'LOW MID', freq: 300 },
  { label: 'MID', freq: 1000 },
  { label: 'HIGH MID', freq: 3000 },
  { label: 'PRES', freq: 6000 },
  { label: 'TREBLE', freq: 14000 },
];

const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const DB_TICKS = [18, 12, 6, 0, -6, -12, -18];

export interface RenderOptions {
  width: number;
  height: number;
  dpr: number;
  curvePoints: CurvePoint[];
  bands: BandState[];
  selectedBandIndex: number | null;
  hoveredBandIndex: number | null;
  ghostCurves?: { bandIndex: number; points: CurvePoint[] }[];
}

export class CurveRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(options: RenderOptions): void {
    const {
      width,
      height,
      dpr,
      curvePoints,
      bands,
      selectedBandIndex,
      hoveredBandIndex,
      ghostCurves = [],
    } = options;

    const ctx = this.ctx;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 1. Grid Background (Subtle FL Studio Style Grid)
    this.drawGrid(ctx, width, height);

    // 2. Ghost curves for selected band
    if (selectedBandIndex !== null) {
      for (const ghost of ghostCurves) {
        if (ghost.bandIndex === selectedBandIndex && ghost.points.length > 1) {
          const color = BAND_COLORS[selectedBandIndex % BAND_COLORS.length];
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          this.drawSmoothCurvePath(ctx, ghost.points, width, height);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // 3. Main Response Curve (Crisp solid line with filled area underneath)
    if (curvePoints.length > 1) {
      // Area fill underneath
      ctx.beginPath();
      this.drawSmoothCurvePath(ctx, curvePoints, width, height);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fill();

      // Sharp response line
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 2.25;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      this.drawSmoothCurvePath(ctx, curvePoints, width, height);
      ctx.stroke();
    }

    // 4. Numbered Band Handles (1..7)
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      if (!band.enabled) continue;

      const bx = frequencyToX(band.freq, width);
      const by = gainToY(band.gain, height);
      const isSelected = band.index === selectedBandIndex;
      const isHovered = band.index === hoveredBandIndex;
      const bandColor = BAND_COLORS[i % BAND_COLORS.length];

      this.drawBandHandle(ctx, bx, by, i + 1, isSelected, isHovered, bandColor, band);
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    // Horizontal dB lines
    for (const db of DB_TICKS) {
      const y = gainToY(db, height);
      ctx.strokeStyle = db === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = db === 0 ? 1.0 : 0.75;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // dB Labels
      ctx.fillStyle = db === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${db > 0 ? '+' : ''}${db}`, 6, y - 3);
    }

    // Vertical Frequency lines & labels
    for (const freq of FREQ_TICKS) {
      const x = frequencyToX(freq, width);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, height - 6);
    }

    // Top Octave Region Markers
    for (const oct of OCTAVE_REGIONS) {
      const x = frequencyToX(oct.freq, width);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(oct.label, x, 14);
    }

    ctx.restore();
  }

  private drawSmoothCurvePath(
    ctx: CanvasRenderingContext2D,
    points: CurvePoint[],
    width: number,
    height: number
  ): void {
    if (points.length < 2) return;

    const firstX = frequencyToX(points[0].freq, width);
    const firstY = gainToY(points[0].gainDb, height);
    ctx.moveTo(firstX, firstY);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const x0 = frequencyToX(p0.freq, width);
      const y0 = gainToY(p0.gainDb, height);
      const x1 = frequencyToX(p1.freq, width);
      const y1 = gainToY(p1.gainDb, height);
      const x2 = frequencyToX(p2.freq, width);
      const y2 = gainToY(p2.gainDb, height);
      const x3 = frequencyToX(p3.freq, width);
      const y3 = gainToY(p3.gainDb, height);

      const cp1x = x1 + (x2 - x0) / 6;
      const cp1y = y1 + (y2 - y0) / 6;
      const cp2x = x2 - (x3 - x1) / 6;
      const cp2y = y2 - (y3 - y1) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    }
  }

  public drawBandHandle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    num: number,
    isSelected: boolean,
    isHovered: boolean,
    bandColor: string,
    band?: BandState
  ): void {
    const radius = isSelected ? 10 : isHovered ? 9 : 8;

    ctx.save();

    // Circle Body
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = bandColor;
    ctx.fill();

    // Dark border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isSelected ? '#FFFFFF' : '#000000';
    ctx.stroke();

    // Number text (1..7)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${num}`, x, y + 0.5);

    ctx.restore();

    // Dynamic EQ bracket
    if (band && band.dynamicEnabled && Math.abs(band.dynamicRange) > 0.5) {
      const rangeOffset = (band.dynamicRange / 60) * 100;
      ctx.strokeStyle = bandColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - rangeOffset);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
