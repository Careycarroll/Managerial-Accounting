/**
 * roc-chart.js -- Receiver Operating Characteristic (ROC) Curve
 * Extends Chart base class.
 * Config: {
 *   points: [{ fpr, tpr, label? }],  -- false positive rate, true positive rate
 *   title: string,
 *   showDiagonal: bool (default true -- random classifier reference line)
 *   showAUC: bool (default true -- shaded area under curve)
 * }
 * Interactions: crosshair, tooltip, click-to-pin (from chart-core)
 */
import { Chart } from './chart-core.js';

export class ROCChart extends Chart {
  constructor(canvasEl, config = {}) {
    super(canvasEl, {
      points:       [],
      title:        'Receiver Operating Characteristic (ROC) Curve',
      showDiagonal: true,
      showAUC:      true,
      padding:      { top: 50, right: 40, bottom: 60, left: 70 },...config,
    });
    this.draw();
  }

  // ── AUC calculation (trapezoidal rule) ─────────────────────

  _calcAUC(points) {
    if (points.length < 2) return 0;
    const sorted = [...points].sort((a, b) => a.fpr - b.fpr);
    let auc = 0;
    for (let i = 1; i < sorted.length; i++) {
      const dx = sorted[i].fpr - sorted[i - 1].fpr;
      const avgY = (sorted[i].tpr + sorted[i - 1].tpr) / 2;
      auc += dx * avgY;
    }
    return Math.min(1, Math.max(0, auc));
  }

  // ── Canvas coordinates ─────────────────────────────────────

  _cx(fpr) { return this.xScale(fpr, 0, 1); }
  _cy(tpr) { return this.yScale(tpr, 0, 1); }

  // ── Main draw ──────────────────────────────────────────────

  draw() {
    this.clear();
    const { points, title, showDiagonal, showAUC } = this.config;

    this._drawBackground();
    this._drawGridAndAxes();

    if (showDiagonal) this._drawDiagonal();

    if (points && points.length >= 2) {
      if (showAUC) this._drawAUCFill(points);
      this._drawROCLine(points);
      this._drawPoints(points);
    } else {
      this._drawEmpty();
    }

    if (title) this._drawTitle(title);
    if (this._mouse && this._inChartArea(this._mouse.x, this._mouse.y)) {
      this.drawCrosshair(this._mouse.x, this._mouse.y);
      this._drawMouseTooltip(this._mouse, points);
    }
    this._pins.forEach(pin => this._drawPinTooltip(pin));
  }

  // ── Background ─────────────────────────────────────────────

  _drawBackground() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(240,247,255,0.3)';
    ctx.fillRect(this.chartX, this.chartY, this.chartW, this.chartH);
    ctx.restore();
  }

  // ── Grid and axes ──────────────────────────────────────────

  _drawGridAndAxes() {
    const ticks = [0, 0.25, 0.5, 0.75, 1.0];
    this.drawGrid(ticks, ticks, 0, 1, 0, 1);
    this.drawAxes(ticks, ticks, 0, 1, 0, 1,
      'False Positive Rate (1 - Specificity)',
      'True Positive Rate (Sensitivity)');
  }

  // ── Diagonal reference line (random classifier) ────────────

  _drawDiagonal() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(this._cx(0), this._cy(0));
    ctx.lineTo(this._cx(1), this._cy(1));
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawLabelWithBackground('Random Classifier', this._cx(0.72), this._cy(0.65),
      '#94a3b8', { fontSize: 10, bold: false, align: 'center' });
    ctx.restore();
  }

  // ── AUC shaded fill ────────────────────────────────────────

  _drawAUCFill(points) {
    const sorted = [{ fpr: 0, tpr: 0 },...points].sort((a, b) => a.fpr - b.fpr);
    if (!sorted.find(p => p.fpr === 1)) sorted.push({ fpr: 1, tpr: 1 });

    const canvasPoints = [
      { x: this._cx(0), y: this._cy(0) },...sorted.map(p => ({ x: this._cx(p.fpr), y: this._cy(p.tpr) })),
      { x: this._cx(1), y: this._cy(0) },
    ];

    this.drawFilledRegion(canvasPoints, '#1a365d', 0.10);
  }

  // ── ROC line ───────────────────────────────────────────────

  _drawROCLine(points) {
    const sorted = [{ fpr: 0, tpr: 0 },...points].sort((a, b) => a.fpr - b.fpr);
    if (!sorted.find(p => p.fpr === 1)) sorted.push({ fpr: 1, tpr: 1 });

    const canvasPoints = sorted.map(p => ({ x: this._cx(p.fpr), y: this._cy(p.tpr) }));
    this.drawLine(canvasPoints, '#1a365d', 2.5);
  }

  // ── Data points ────────────────────────────────────────────

  _drawPoints(points) {
    points.forEach(p => {
      const cx = this._cx(p.fpr);
      const cy = this._cy(p.tpr);
      this.drawPoint(cx, cy, '#c8973a', 6);

      if (p.label) {
        this.drawLabelWithBackground(p.label, cx + 10, cy - 4,
          '#374151', { fontSize: 10, bold: false, align: 'left', baseline: 'middle' });
      }
    });
  }

  // ── AUC value label ────────────────────────────────────────

  _drawAUCLabel(auc) {
    const cx = this._cx(0.6);
    const cy = this._cy(0.3);
    this.drawLabelWithBackground(
      'AUC = ' + auc.toFixed(3),
      cx, cy, '#1a365d',
      { fontSize: 12, bold: true, align: 'center', baseline: 'middle',
        bg: 'rgba(255,255,255,0.95)', border: '#1a365d', padding: 6 }
    );
  }

  // ── Title ──────────────────────────────────────────────────

  _drawTitle(title) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font         = 'bold 13px Inter, system-ui, sans-serif';
    ctx.fillStyle    = '#1a365d';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, this.chartX + this.chartW / 2, this.chartY - 36);
    ctx.restore();
  }

  // ── Empty state ────────────────────────────────────────────

  _drawEmpty() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle    = '#94a3b8';
    ctx.font         = '13px Inter, system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Enter validation data and calculate to see the ROC curve.',
      this.chartX + this.chartW / 2, this.chartY + this.chartH / 2);
    ctx.restore();
  }

  // ── Mouse tooltip ──────────────────────────────────────────

  _drawMouseTooltip(mouse, points) {
    const fpr = (mouse.x - this.chartX) / this.chartW;
    const tpr = 1 - (mouse.y - this.chartY) / this.chartH;

    const lines = [
      { label: 'FPR', value: fpr.toFixed(3) },
      { label: 'TPR', value: tpr.toFixed(3) },
    ];

    if (points && points.length > 0) {
      const nearest = points.reduce((best, p) => {
        const d = Math.hypot(this._cx(p.fpr) - mouse.x, this._cy(p.tpr) - mouse.y);
        return d < best.d ? { d, p } : best;
      }, { d: Infinity, p: null });

      if (nearest.d < 30 && nearest.p) {
        lines.push({ label: 'Point', value: nearest.p.label || '' });
        lines.push({ label: 'FPR', value: nearest.p.fpr.toFixed(3) });
        lines.push({ label: 'TPR', value: nearest.p.tpr.toFixed(3) });
      }
    }

    this.drawTooltip(mouse.x, mouse.y, lines);
  }

  // ── Pin tooltip ────────────────────────────────────────────

  _drawPinTooltip(pin) {
    const fpr = (pin.x - this.chartX) / this.chartW;
    const tpr = 1 - (pin.y - this.chartY) / this.chartH;
    this.drawTooltip(pin.x, pin.y, [
      { label: 'FPR', value: fpr.toFixed(3) },
      { label: 'TPR', value: tpr.toFixed(3) },
    ]);
  }

  // ── Public API ─────────────────────────────────────────────

  update(config) {
    this.config = {...this.config,...config };
    this._zoom  = null;
    this._pins  = [];
    this.draw();
  }
}
