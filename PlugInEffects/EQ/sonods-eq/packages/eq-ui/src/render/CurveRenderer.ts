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
  accentColor?: string;
  glowColor?: string;
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
      accentColor = '#84CC16',
      glowColor = 'rgba(132, 204, 22, 0.65)',
    } = options;

    const ctx = this.ctx;

    // Reset transform & clear
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 1. Subtle 0 dB center baseline (clean ungridded background per spec)
    const zeroY = gainToY(0, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Ghost curves for selected band
    if (selectedBandIndex !== null) {
      for (const ghost of ghostCurves) {
        if (ghost.bandIndex === selectedBandIndex && ghost.points.length > 1) {
          ctx.strokeStyle = 'rgba(132, 204, 22, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          this.drawSmoothCurvePath(ctx, ghost.points, width, height);
          ctx.stroke();
        }
      }
    }

    // 3. Main glowing response curve
    if (curvePoints.length > 1) {
      // Background gradient under curve
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(132, 204, 22, 0.12)');
      gradient.addColorStop(0.5, 'rgba(132, 204, 22, 0.03)');
      gradient.addColorStop(1, 'rgba(132, 204, 22, 0.0)');

      ctx.beginPath();
      this.drawSmoothCurvePath(ctx, curvePoints, width, height);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Outer glow pass
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      this.drawSmoothCurvePath(ctx, curvePoints, width, height);
      ctx.stroke();
      ctx.restore();

      // Bright lime core line
      ctx.strokeStyle = '#D9F99D';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      this.drawSmoothCurvePath(ctx, curvePoints, width, height);
      ctx.stroke();
    }

    // 4. Band Handles (circular green fill + gold ring matching sketch)
    for (const band of bands) {
      if (!band.enabled) continue;

      const bx = frequencyToX(band.freq, width);
      const by = gainToY(band.gain, height);
      const isSelected = band.index === selectedBandIndex;
      const isHovered = band.index === hoveredBandIndex;

      this.drawBandHandle(ctx, bx, by, isSelected, isHovered, band);
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
    band?: BandState
  ): void {
    const radius = isSelected ? 8 : isHovered ? 7 : 6;

    ctx.save();
    if (isSelected || isHovered) {
      ctx.shadowColor = 'rgba(132, 204, 22, 0.9)';
      ctx.shadowBlur = 10;
    }

    // Outer gold ring
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? 'rgba(234, 179, 8, 0.9)' : 'rgba(202, 138, 4, 0.6)';
    ctx.fill();

    // Inner lime green core
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#84CC16';
    ctx.fill();

    // Center bright dot
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#FEF08A';
    ctx.fill();

    ctx.restore();

    // Dynamic EQ range bracket
    if (band && band.dynamicEnabled && Math.abs(band.dynamicRange) > 0.5) {
      const rangeOffset = (band.dynamicRange / 60) * 100;
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - rangeOffset);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
