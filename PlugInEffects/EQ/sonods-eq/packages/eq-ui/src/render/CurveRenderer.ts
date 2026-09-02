import { BandState } from '@sonods/eq-engine';
import { frequencyToX, gainToY } from '../coords.js';

export interface CurvePoint {
  freq: number;
  gainDb: number;
}

export interface RenderOptions {
  width: number;
  height: number;
  dpr: number;
  curvePoints: CurvePoint[];
  bands: BandState[];
  selectedBandIndex: number | null;
  hoveredBandIndex: number | null;
  ghostCurves?: { bandIndex: number; points: CurvePoint[] }[];
  curveColor?: string;
  handleColor?: string;
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
      curveColor = '#18181B',
      handleColor = '#84CC16',
    } = options;

    const ctx = this.ctx;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 1. Subtle 0 dB center reference line (clean ungridded background per spec)
    const zeroY = gainToY(0, height);
    ctx.strokeStyle = '#E4E4E7';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Ghost curves for selected band (light transparent dark stroke)
    if (selectedBandIndex !== null) {
      for (const ghost of ghostCurves) {
        if (ghost.bandIndex === selectedBandIndex && ghost.points.length > 1) {
          ctx.strokeStyle = 'rgba(24, 24, 27, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          this.drawSmoothCurvePath(ctx, ghost.points, width, height);
          ctx.stroke();
        }
      }
    }

    // 3. Main response curve - Solid, confident dark line, NO glow / NO bloom
    if (curvePoints.length > 1) {
      ctx.strokeStyle = curveColor;
      ctx.lineWidth = 2.75;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      this.drawSmoothCurvePath(ctx, curvePoints, width, height);
      ctx.stroke();
    }

    // 4. Band Handles (Solid flat green dots from REF-SKETCH)
    for (const band of bands) {
      if (!band.enabled) continue;

      const bx = frequencyToX(band.freq, width);
      const by = gainToY(band.gain, height);
      const isSelected = band.index === selectedBandIndex;
      const isHovered = band.index === hoveredBandIndex;

      this.drawBandHandle(ctx, bx, by, isSelected, isHovered, handleColor, band);
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
    isSelected: boolean,
    isHovered: boolean,
    handleColor: string,
    band?: BandState
  ): void {
    const radius = isSelected ? 6.5 : isHovered ? 6.0 : 5.0;

    // Solid flat green circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? '#4D7C0F' : handleColor;
    ctx.fill();

    // Subtle dark border ring
    ctx.lineWidth = isSelected ? 2.0 : 1.5;
    ctx.strokeStyle = isSelected ? '#18181B' : '#65A30D';
    ctx.stroke();

    // Dynamic EQ range bracket
    if (band && band.dynamicEnabled && Math.abs(band.dynamicRange) > 0.5) {
      const rangeOffset = (band.dynamicRange / 60) * 100;
      ctx.strokeStyle = '#65A30D';
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
