/**
 * chart-core.js — Base chart class for all canvas charts
 * Provides: DPI scaling, resize handling, axis/grid utilities, color system, tooltip
 */

export class Chart {
  constructor(canvasEl, config = {}) {
    if (!canvasEl) throw new Error('Chart requires a canvas element');
    this.canvas  = canvasEl;
    this.ctx     = canvasEl.getContext('2d');
    this.config  = config;
    this.padding = { top: 40, right: 30, bottom: 50, left: 70, ...config.padding };

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this.canvas.parentElement);
    this._setupCanvas();
  }

  // ── Canvas Setup ───────────────────────────────────────────

  _setupCanvas() {
    const dpr    = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const w      = parent.clientWidth  || 600;
    const h      = parent.clientHeight || 360;

    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);

    this.width  = w;
    this.height = h;
    this.chartX = this.padding.left;
    this.chartY = this.padding.top;
    this.chartW = w - this.padding.left - this.padding.right;
    this.chartH = h - this.padding.top  - this.padding.bottom;
  }

  _onResize() {
    this._setupCanvas();
    this.draw();
  }

  // ── Color System ───────────────────────────────────────────

  color(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim() || '#1a365d';
  }

  get colors() {
    return {
      primary:   this.color('--color-primary'),
      accent:    this.color('--color-accent'),
      success:   this.color('--color-success'),
      danger:    this.color('--color-danger'),
      info:      this.color('--color-info'),
      gray300:   this.color('--color-gray-300'),
      gray500:   this.color('--color-gray-500'),
      gray100:   this.color('--color-gray-100'),
      text:      this.color('--color-text'),
      textMuted: this.color('--color-text-muted'),
      surface:   this.color('--color-surface'),
    };
  }

  // ── Coordinate Helpers ─────────────────────────────────────

  xScale(value, minVal, maxVal) {
    return this.chartX + ((value - minVal) / (maxVal - minVal)) * this.chartW;
  }

  yScale(value, minVal, maxVal) {
    return this.chartY + this.chartH - ((value - minVal) / (maxVal - minVal)) * this.chartH;
  }

  // ── Clear ──────────────────────────────────────────────────

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // ── Grid & Axes ────────────────────────────────────────────

  drawGrid(xTicks, yTicks, xMin, xMax, yMin, yMax) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.colors.gray100;
    ctx.lineWidth   = 1;

    yTicks.forEach(val => {
      const y = this.yScale(val, yMin, yMax);
      ctx.beginPath();
      ctx.moveTo(this.chartX, y);
      ctx.lineTo(this.chartX + this.chartW, y);
      ctx.stroke();
    });

    xTicks.forEach(val => {
      const x = this.xScale(val, xMin, xMax);
      ctx.beginPath();
      ctx.moveTo(x, this.chartY);
      ctx.lineTo(x, this.chartY + this.chartH);
      ctx.stroke();
    });

    ctx.restore();
  }

  drawAxes(xTicks, yTicks, xMin, xMax, yMin, yMax, xLabel = '', yLabel = '') {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = this.colors.gray300;
    ctx.lineWidth   = 1.5;

    ctx.beginPath();
    ctx.moveTo(this.chartX, this.chartY);
    ctx.lineTo(this.chartX, this.chartY + this.chartH);
    ctx.lineTo(this.chartX + this.chartW, this.chartY + this.chartH);
    ctx.stroke();

    ctx.fillStyle  = this.colors.textMuted;
    ctx.font       = '11px Inter, system-ui, sans-serif';
    ctx.textAlign  = 'right';
    ctx.textBaseline = 'middle';

    yTicks.forEach(val => {
      const y = this.yScale(val, yMin, yMax);
      ctx.fillText(this._fmtNum(val), this.chartX - 8, y);
    });

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    xTicks.forEach(val => {
      const x = this.xScale(val, xMin, xMax);
      ctx.fillText(this._fmtNum(val), x, this.chartY + this.chartH + 8);
    });

    if (xLabel) {
      ctx.font      = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle = this.colors.textMuted;
      ctx.fillText(xLabel, this.chartX + this.chartW / 2, this.chartY + this.chartH + 28);
    }

    if (yLabel) {
      ctx.save();
      ctx.translate(14, this.chartY + this.chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.font         = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle    = this.colors.textMuted;
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Line Drawing ───────────────────────────────────────────

  drawLine(points, color, lineWidth = 2, dashed = false) {
    if (points.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    ctx.lineJoin    = 'round';
    if (dashed) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Filled Region ──────────────────────────────────────────

  drawFilledRegion(points, color, alpha = 0.12) {
    if (points.length < 3) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Point Marker ───────────────────────────────────────────

  drawPoint(x, y, color, radius = 5) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle   = color;
    ctx.strokeStyle = this.colors.surface;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ── Label ──────────────────────────────────────────────────

  drawLabel(text, x, y, color, align = 'left', baseline = 'bottom', fontSize = 11) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle    = color;
    ctx.font         = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign    = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ── Legend ─────────────────────────────────────────────────

  drawLegend(items) {
    const ctx     = this.ctx;
    const startX  = this.chartX;
    const y       = this.chartY - 18;
    let   x       = startX;

    ctx.save();
    ctx.font         = '11px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    items.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y - 5, 20, 10);
      ctx.fillStyle = this.colors.text;
      ctx.fillText(item.label, x + 26, y);
      x += ctx.measureText(item.label).width + 50;
    });

    ctx.restore();
  }

  // ── Number Formatting ──────────────────────────────────────

  _fmtNum(n) {
    if (Math.abs(n) >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000)    return '$' + (n / 1000).toFixed(0) + 'k';
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }

  _fmtDollar(n) {
    return '$' + Math.round(n).toLocaleString();
  }

  // ── Nice Tick Generation ───────────────────────────────────

  niceTicks(min, max, targetCount = 5) {
    const range     = max - min;
    const rawStep   = range / targetCount;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const niceSteps = [1, 2, 2.5, 5, 10];
    const step      = niceSteps.find(s => s * magnitude >= rawStep) * magnitude;
    const niceMin   = Math.floor(min / step) * step;
    const ticks     = [];
    for (let t = niceMin; t <= max + step * 0.01; t += step) {
      if (t >= min - step * 0.01) ticks.push(Math.round(t * 1000) / 1000);
    }
    return ticks;
  }

  // ── Destroy ────────────────────────────────────────────────

  destroy() {
    this._resizeObserver.disconnect();
  }

  // ── Subclasses implement draw() ────────────────────────────

  draw() {
    throw new Error('Chart subclass must implement draw()');
  }

  update(config) {
    this.config = { ...this.config, ...config };
    this.draw();
  }
}
