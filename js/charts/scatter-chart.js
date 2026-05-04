/**
 * scatter-chart.js -- Scatter plot with optional regression line overlay
 * Extends Chart base class.
 * Config: {
 *   points: [{ x, y, label? }],
 *   regressionLine: { a, b } (optional -- y = a + bX),
 *   highLowLine: { a, b } (optional),
 *   xLabel: string,
 *   yLabel: string,
 *   xUnit: string (optional suffix),
 *   yUnit: string (optional prefix e.g. '$'),
 *   title: string,
 *   showPointLabels: bool,
 *   relevantRange: { min, max } (optional -- draws dashed vertical lines)
 * }
 * Interactions: crosshair, tooltip, click-to-pin, scroll-to-zoom (from chart-core)
 */
import { Chart } from './chart-core.js';

export class ScatterChart extends Chart {
  constructor(canvasEl, config = {}) {
    super(canvasEl, {
      points: [],
      regressionLine: null,
      highLowLine: null,
      xLabel: 'Activity (X)',
      yLabel: 'Cost (Y)',
      xUnit: '',
      yUnit: '$',
      title: '',
      showPointLabels: true,
      relevantRange: null,
      padding: { top: 50, right: 40, bottom: 60, left: 80 },...config,
    });
    this.draw();
  }

  // ── Data bounds ────────────────────────────────────────────

  _bounds() {
    const { points, regressionLine, highLowLine } = this.config;
    if (!points || points.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 1000 };

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    // Extend range slightly for padding
    const xPad = (maxX - minX) * 0.15 || maxX * 0.15 || 10;
    const yPad = (maxY - minY) * 0.15 || maxY * 0.15 || 100;

    minX = Math.max(0, minX - xPad);
    maxX = maxX + xPad;
    minY = Math.max(0, minY - yPad);
    maxY = maxY + yPad;

    // Include regression line endpoints in Y range
    if (regressionLine) {
      const yAtMin = regressionLine.a + regressionLine.b * minX;
      const yAtMax = regressionLine.a + regressionLine.b * maxX;
      minY = Math.min(minY, yAtMin, 0);
      maxY = Math.max(maxY, yAtMax);
    }

    return { minX, maxX, minY, maxY };
  }

  // ── Coordinate transforms ──────────────────────────────────

  _toCanvasX(dataX, bounds) {
    const zoom = this._zoom || {};
    const minX = zoom.minX !== undefined ? zoom.minX : bounds.minX;
    const maxX = zoom.maxX !== undefined ? zoom.maxX : bounds.maxX;
    return this.chartX + ((dataX - minX) / (maxX - minX)) * this.chartW;
  }

  _toCanvasY(dataY, bounds) {
    const zoom = this._zoom || {};
    const minY = zoom.minY !== undefined ? zoom.minY : bounds.minY;
    const maxY = zoom.maxY !== undefined ? zoom.maxY : bounds.maxY;
    return this.chartY + this.chartH - ((dataY - minY) / (maxY - minY)) * this.chartH;
  }

  _toDataX(canvasX, bounds) {
    const zoom = this._zoom || {};
    const minX = zoom.minX !== undefined ? zoom.minX : bounds.minX;
    const maxX = zoom.maxX !== undefined ? zoom.maxX : bounds.maxX;
    return minX + ((canvasX - this.chartX) / this.chartW) * (maxX - minX);
  }

  _toDataY(canvasY, bounds) {
    const zoom = this._zoom || {};
    const minY = zoom.minY !== undefined ? zoom.minY : bounds.minY;
    const maxY = zoom.maxY !== undefined ? zoom.maxY : bounds.maxY;
    return minY + ((this.chartY + this.chartH - canvasY) / this.chartH) * (maxY - minY);
  }

  // ── Main draw ──────────────────────────────────────────────

  draw() {
    this.clear();
    const { points, regressionLine, highLowLine, xLabel, yLabel,
            xUnit, yUnit, title, showPointLabels, relevantRange } = this.config;

    if (!points || points.length === 0) {
      this._drawEmpty();
      return;
    }

    const bounds = this._bounds();
    const zoom   = this._zoom || {};
    const minX   = zoom.minX !== undefined ? zoom.minX : bounds.minX;
    const maxX   = zoom.maxX !== undefined ? zoom.maxX : bounds.maxX;
    const minY   = zoom.minY !== undefined ? zoom.minY : bounds.minY;
    const maxY   = zoom.maxY !== undefined ? zoom.maxY : bounds.maxY;

    this._drawGrid(minX, maxX, minY, maxY, xUnit, yUnit);
    this._drawAxesLabels(xLabel, yLabel, title);

    // Relevant range shading
    if (relevantRange) {
      const rx1 = this._toCanvasX(relevantRange.min, bounds);
      const rx2 = this._toCanvasX(relevantRange.max, bounds);
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(200, 151, 58, 0.08)';
      ctx.fillRect(rx1, this.chartY, rx2 - rx1, this.chartH);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(200, 151, 58, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rx1, this.chartY); ctx.lineTo(rx1, this.chartY + this.chartH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx2, this.chartY); ctx.lineTo(rx2, this.chartY + this.chartH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Label
      ctx.save();
      ctx.fillStyle = 'rgba(200, 151, 58, 0.8)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Relevant Range', (rx1 + rx2) / 2, this.chartY + 14);
      ctx.restore();
    }

    // High-low line (blue, dashed)
    if (highLowLine) {
      this._drawLine(highLowLine.a, highLowLine.b, bounds,
        '#3b82f6', 2, [6, 4], 'High-Low', true);
    }

    // Regression line (primary color, solid)
    if (regressionLine) {
      this._drawLine(regressionLine.a, regressionLine.b, bounds,
        '#1a365d', 2.5, [], 'Regression', false);
    }

    // Data points
    this._drawPoints(points, bounds, showPointLabels, yUnit);

    // Crosshair + tooltip
    if (this._mouse && this._inChartArea(this._mouse.x, this._mouse.y)) {
      this._drawCrosshair(this._mouse, bounds, xUnit, yUnit);
    }

    // Pinned tooltips
    this._pins.forEach(pin => this._drawTooltipBox(pin, bounds, xUnit, yUnit));
  }

  // ── Draw helpers ───────────────────────────────────────────

  _drawEmpty() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Enter data points and click Calculate to see the scatter plot.',
      this.chartX + this.chartW / 2, this.chartY + this.chartH / 2);
    ctx.restore();
  }

  _drawGrid(minX, maxX, minY, maxY, xUnit, yUnit) {
    const ctx    = this.ctx;
    const bounds = { minX, maxX, minY, maxY };
    const ticks  = 6;

    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth   = 1;
    ctx.fillStyle   = '#64748b';
    ctx.font        = '11px Inter, sans-serif';

    // Y gridlines and labels
    for (let i = 0; i <= ticks; i++) {
      const val = minY + (maxY - minY) * (i / ticks);
      const cy  = this._toCanvasY(val, bounds);
      ctx.beginPath();
      ctx.moveTo(this.chartX, cy);
      ctx.lineTo(this.chartX + this.chartW, cy);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(yUnit + this._fmtNum(val), this.chartX - 8, cy + 4);
    }

    // X gridlines and labels
    for (let i = 0; i <= ticks; i++) {
      const val = minX + (maxX - minX) * (i / ticks);
      const cx  = this._toCanvasX(val, bounds);
      ctx.beginPath();
      ctx.moveTo(cx, this.chartY);
      ctx.lineTo(cx, this.chartY + this.chartH);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(this._fmtNum(val) + (xUnit ? ' ' + xUnit : ''),
        cx, this.chartY + this.chartH + 18);
    }

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.chartX, this.chartY);
    ctx.lineTo(this.chartX, this.chartY + this.chartH);
    ctx.lineTo(this.chartX + this.chartW, this.chartY + this.chartH);
    ctx.stroke();

    ctx.restore();
  }

  _drawAxesLabels(xLabel, yLabel, title) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#374151';
    ctx.font      = '12px Inter, sans-serif';
    ctx.textAlign = 'center';

    // X axis label
    ctx.fillText(xLabel, this.chartX + this.chartW / 2, this.chartY + this.chartH + 40);

    // Y axis label (rotated)
    ctx.save();
    ctx.translate(14, this.chartY + this.chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // Title
    if (title) {
      ctx.font      = 'bold 13px Inter, sans-serif';
      ctx.fillStyle = '#1a365d';
      ctx.fillText(title, this.chartX + this.chartW / 2, this.chartY - 20);
    }

    ctx.restore();
  }

  _drawLine(a, b, bounds, color, width, dash, labelText, labelOffset) {
    const ctx  = this.ctx;
    const zoom = this._zoom || {};
    const minX = zoom.minX !== undefined ? zoom.minX : bounds.minX;
    const maxX = zoom.maxX !== undefined ? zoom.maxX : bounds.maxX;

    const x1 = minX;
    const x2 = maxX;
    const y1 = a + b * x1;
    const y2 = a + b * x2;

    const cx1 = this._toCanvasX(x1, bounds);
    const cy1 = this._toCanvasY(y1, bounds);
    const cx2 = this._toCanvasX(x2, bounds);
    const cy2 = this._toCanvasY(y2, bounds);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Line label with background
    // labelOffset true = anchor at left end of line, false/0 = anchor at right end
    if (labelText) {
      ctx.font         = '11px Inter, sans-serif';
      ctx.textAlign    = 'left';
      const anchorLeft = !!labelOffset;
      const anchorCX   = anchorLeft ? cx1 : cx2;
      const anchorCY   = anchorLeft ? cy1 : cy2;
      const tw         = ctx.measureText(labelText).width;
      const labelX     = anchorLeft
        ? Math.max(anchorCX + 4, this.chartX + 4)
        : Math.min(anchorCX + 4, this.chartX + this.chartW - tw - 6);
      const labelY     = Math.max(Math.min(anchorCY - 6, this.chartY + this.chartH - 6), this.chartY + 14);
      ctx.fillStyle    = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.roundRect(labelX - 3, labelY - 11, tw + 6, 15, 3);
      ctx.fill();
      ctx.fillStyle    = color;
      ctx.fillText(labelText, labelX, labelY);
    }

    ctx.restore();
  }

  _drawPoints(points, bounds, showLabels, yUnit) {
    const ctx = this.ctx;
    ctx.save();

    points.forEach((p, i) => {
      const cx = this._toCanvasX(p.x, bounds);
      const cy = this._toCanvasY(p.y, bounds);

      // Skip if outside chart area
      if (cx < this.chartX - 10 || cx > this.chartX + this.chartW + 10) return;
      if (cy < this.chartY - 10 || cy > this.chartY + this.chartH + 10) return;

      // Point circle
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle   = '#c8973a';
      ctx.fill();
      ctx.strokeStyle = '#1a365d';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Label (week number or custom) with background
      if (showLabels && p.label !== undefined) {
        const labelText = String(p.label);
        ctx.font        = '10px Inter, sans-serif';
        ctx.textAlign   = 'center';
        const tw        = ctx.measureText(labelText).width;
        const lx        = cx - tw / 2 - 3;
        const ly        = cy - 20;
        const lw        = tw + 6;
        const lh        = 13;
        ctx.fillStyle   = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.roundRect(lx, ly, lw, lh, 3);
        ctx.fill();
        ctx.fillStyle   = '#374151';
        ctx.fillText(labelText, cx, cy - 9);
      }
    });

    ctx.restore();
  }

  _drawCrosshair(mouse, bounds, xUnit, yUnit) {
    const ctx  = this.ctx;
    const dataX = this._toDataX(mouse.x, bounds);
    const dataY = this._toDataY(mouse.y, bounds);

    ctx.save();
    ctx.strokeStyle = 'rgba(100,116,139,0.5)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mouse.x, this.chartY);
    ctx.lineTo(mouse.x, this.chartY + this.chartH);
    ctx.moveTo(this.chartX, mouse.y);
    ctx.lineTo(this.chartX + this.chartW, mouse.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tooltip
    const lines = [
      (xUnit ? '' : '') + this._fmtNum(dataX) + (xUnit ? ' ' + xUnit : ''),
      yUnit + this._fmtNum(dataY)
    ];
    this._drawTooltipAt(mouse.x, mouse.y, lines);
    ctx.restore();
  }

  _drawTooltipBox(pin, bounds, xUnit, yUnit) {
    const cx    = this._toCanvasX(pin.x, bounds);
    const cy    = this._toCanvasY(pin.y, bounds);
    const lines = [
      this._fmtNum(pin.x) + (xUnit ? ' ' + xUnit : ''),
      yUnit + this._fmtNum(pin.y)
    ];
    this._drawTooltipAt(cx, cy, lines, true);
  }

  _drawTooltipAt(cx, cy, lines, pinned) {
    const ctx     = this.ctx;
    const pad     = 8;
    const lineH   = 16;
    const w       = 110;
    const h       = lines.length * lineH + pad * 2;
    let   tx      = cx + 12;
    let   ty      = cy - h / 2;

    if (tx + w > this.chartX + this.chartW) tx = cx - w - 12;
    if (ty < this.chartY) ty = this.chartY;
    if (ty + h > this.chartY + this.chartH) ty = this.chartY + this.chartH - h;

    ctx.save();
    ctx.fillStyle   = pinned ? 'rgba(26,54,93,0.92)' : 'rgba(30,41,59,0.85)';
    ctx.strokeStyle = pinned ? '#c8973a' : 'transparent';
    ctx.lineWidth   = 1.5;
    this._roundRect(tx, ty, w, h, 6);
    ctx.fill();
    if (pinned) ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font      = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      ctx.fillText(line, tx + pad, ty + pad + 12 + i * lineH);
    });
    ctx.restore();
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _fmtNum(n) {
    if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
    if (Math.abs(n) >= 10)   return Math.round(n * 10) / 10 + '';
    return Math.round(n * 100) / 100 + '';
  }

  // ── Zoom interaction (override base _zoom handling) ────────

  _handleZoom(delta, centerX, centerY) {
    const bounds  = this._bounds();
    const zoom    = this._zoom || { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY };
    const factor  = delta > 0 ? 1.15 : 0.87;
    const dataX   = this._toDataX(centerX, bounds);
    const dataY   = this._toDataY(centerY, bounds);

    zoom.minX = dataX - (dataX - zoom.minX) * factor;
    zoom.maxX = dataX + (zoom.maxX - dataX) * factor;
    zoom.minY = dataY - (dataY - zoom.minY) * factor;
    zoom.maxY = dataY + (zoom.maxY - dataY) * factor;

    this._zoom = zoom;
    this.draw();
  }

  // ── Public API ─────────────────────────────────────────────

  update(config) {
    this.config = {...this.config,...config };
    this._zoom  = null;
    this._pins  = [];
    this.draw();
  }
}
