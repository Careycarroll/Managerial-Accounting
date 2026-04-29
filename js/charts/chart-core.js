/**
 * chart-core.js — Base chart class for all canvas charts
 * Provides: DPI scaling, resize, axes, grid, labels, legend, interactions
 * Interactions: crosshair, tooltip, click-to-pin, scroll-to-zoom
 */

export class Chart {
  constructor(canvasEl, config = {}) {
    if (!canvasEl) throw new Error('Chart requires a canvas element');
    this.canvas  = canvasEl;
    this.ctx     = canvasEl.getContext('2d');
    this.config  = config;
    this.padding = { top: 40, right: 30, bottom: 50, left: 70,...config.padding };

    this._mouse     = null;
    this._pins      = [];
    this._zoom      = null;
    this._drag      = null;

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this.canvas.parentElement);
    this._setupCanvas();
    this._initInteraction();
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

  // ── Interaction Setup ──────────────────────────────────────

  _initInteraction() {
    this.canvas.style.cursor = 'crosshair';

    this.canvas.addEventListener('mousedown', e => {
      const pos = this._canvasPos(e);
      if (!this._inChartArea(pos.x, pos.y)) return;
      const zoom = this._zoom || { minU: 0, maxU: this.config.maxUnits || 100 };
      this._drag = {
        startX:   pos.x,
        startMin: zoom.minU,
        startMax: zoom.maxU,
        moved:    false,
      };
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('mousemove', e => {
      const pos = this._canvasPos(e);

      if (this._drag) {
        const dx = pos.x - this._drag.startX;
        if (Math.abs(dx) > 3) this._drag.moved = true;
        if (this._drag.moved) {
          const range     = this._drag.startMax - this._drag.startMin;
          const unitsPerPx = range / this.chartW;
          const shift     = dx * unitsPerPx;
          let   newMin    = this._drag.startMin - shift;
          let   newMax    = this._drag.startMax - shift;
          if (newMin < 0) { newMax -= newMin; newMin = 0; }
          this._zoom = { minU: newMin, maxU: newMax };
        }
      }

      if (this._inChartArea(pos.x, pos.y)) {
        this._mouse = pos;
        if (!this._drag) this.canvas.style.cursor = 'crosshair';
      } else {
        this._mouse = null;
      }
      this.draw();
    });

    this.canvas.addEventListener('mouseup', e => {
      const pos = this._canvasPos(e);
      if (this._drag && !this._drag.moved && this._inChartArea(pos.x, pos.y)) {
        const existing = this._pins.findIndex(p => Math.abs(p.x - pos.x) < 12);
        if (existing >= 0) {
          this._pins.splice(existing, 1);
        } else {
          this._pins.push({ x: pos.x, y: pos.y });
        }
      }
      this._drag = null;
      this.canvas.style.cursor = 'crosshair';
      this.draw();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this._mouse = null;
      this._drag  = null;
      this.canvas.style.cursor = 'crosshair';
      this.draw();
    });

    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const pos     = this._canvasPos(e);
      const zoomIn  = e.deltaY < 0;
      this._applyZoom(pos.x, zoomIn);
      this.draw();
    }, { passive: false });

    this.canvas.addEventListener('dblclick', () => {
      this._zoom = null;
      this._pins = [];
      this.draw();
    });
  }

  _canvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  _inChartArea(x, y) {
    return (
      x >= this.chartX &&
      x <= this.chartX + this.chartW &&
      y >= this.chartY &&
      y <= this.chartY + this.chartH
    );
  }

  _applyZoom(mouseX, zoomIn) {
    const maxUnits = this.config.maxUnits || 100;
    const current  = this._zoom || { minU: 0, maxU: maxUnits };
    const range    = current.maxU - current.minU;
    const factor   = zoomIn ? 0.92 : 1.09;
    const newRange = range * factor;
    const ratio    = (mouseX - this.chartX) / this.chartW;
    const pivot    = current.minU + ratio * range;
    let   newMin   = pivot - ratio * newRange;
    let   newMax   = pivot + (1 - ratio) * newRange;
    if (newMin < 0) { newMax -= newMin; newMin = 0; }
    if (newRange < 5)             return;
    if (newRange > maxUnits * 20) return;
    this._zoom = { minU: Math.max(0, newMin), maxU: newMax };
  }

  // ── Color System ───────────────────────────────────────────

  color(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#1a365d';
  }

  get colors() {
    return {
      primary:    this.color('--color-primary'),
      accent:     this.color('--color-accent'),
      success:    this.color('--color-success'),
      danger:     this.color('--color-danger'),
      info:       this.color('--color-info'),
      gray100:    this.color('--color-gray-100'),
      gray200:    this.color('--color-gray-200'),
      gray300:    this.color('--color-gray-300'),
      gray500:    this.color('--color-gray-500'),
      gray700:    this.color('--color-gray-700'),
      text:       this.color('--color-text'),
      textMuted:  this.color('--color-text-muted'),
      surface:    this.color('--color-surface'),
      border:     this.color('--color-border'),
    };
  }

  // ── Coordinate Helpers ─────────────────────────────────────

  xScale(value, minVal, maxVal) {
    return this.chartX + ((value - minVal) / (maxVal - minVal)) * this.chartW;
  }

  yScale(value, minVal, maxVal) {
    return this.chartY + this.chartH - ((value - minVal) / (maxVal - minVal)) * this.chartH;
  }

  xToValue(px, minVal, maxVal) {
    return minVal + ((px - this.chartX) / this.chartW) * (maxVal - minVal);
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

    ctx.fillStyle    = this.colors.textMuted;
    ctx.font         = '11px Inter, system-ui, sans-serif';
    ctx.textAlign    = 'right';
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

  // ── Label with Background ──────────────────────────────────

  drawLabelWithBackground(text, x, y, textColor, options = {}) {
    const ctx      = this.ctx;
    const fontSize = options.fontSize  || 11;
    const pad      = options.padding   || 4;
    const bg       = options.bg        || 'rgba(255,255,255,0.95)';
    const border   = options.border    || null;
    const align    = options.align     || 'left';
    const baseline = options.baseline  || 'bottom';
    const bold     = options.bold      !== false;
    const radius   = options.radius    || 3;

    ctx.save();
    ctx.font         = `${bold ? '600' : '400'} ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign    = align;
    ctx.textBaseline = baseline;

    const metrics = ctx.measureText(text);
    const tw      = metrics.width;
    const th      = fontSize;

    let bx = x;
    let by = y;
    if (align === 'center') bx = x - tw / 2;
    if (align === 'right')  bx = x - tw;
    if (baseline === 'bottom') by = y - th;
    if (baseline === 'middle') by = y - th / 2;

    const rx = bx - pad;
    const ry = by - pad;
    const rw = tw + pad * 2;
    const rh = th + pad * 2;

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, radius);
    ctx.fill();

    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ── Crosshair ──────────────────────────────────────────────

  drawCrosshair(mouseX, mouseY) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.colors.gray300;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(mouseX, this.chartY);
    ctx.lineTo(mouseX, this.chartY + this.chartH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.chartX, mouseY);
    ctx.lineTo(this.chartX + this.chartW, mouseY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Tooltip ────────────────────────────────────────────────

  drawTooltip(anchorX, anchorY, lines) {
    if (!lines || lines.length === 0) return;
    const ctx      = this.ctx;
    const fontSize = 11;
    const lineH    = 18;
    const padX     = 10;
    const padY     = 8;
    const radius   = 6;

    ctx.save();
    ctx.font = `400 ${fontSize}px Inter, system-ui, sans-serif`;

    const maxW = lines.reduce((m, l) => {
      const w = ctx.measureText(l.label + '  ' + l.value).width;
      return Math.max(m, w);
    }, 0);

    const ttW = maxW + padX * 2 + 40;
    const ttH = lines.length * lineH + padY * 2;

    let tx = anchorX + 14;
    let ty = anchorY - ttH / 2;

    if (tx + ttW > this.chartX + this.chartW) tx = anchorX - ttW - 14;
    if (ty < this.chartY) ty = this.chartY;
    if (ty + ttH > this.chartY + this.chartH) ty = this.chartY + this.chartH - ttH;

    ctx.fillStyle   = 'rgba(255,255,255,0.97)';
    ctx.strokeStyle = this.colors.border;
    ctx.lineWidth   = 1;
    ctx.shadowColor   = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur    = 8;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(tx, ty, ttW, ttH, radius);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    lines.forEach((line, i) => {
      const ly = ty + padY + i * lineH + lineH / 2;

      if (line.color) {
        ctx.fillStyle = line.color;
        ctx.beginPath();
        ctx.arc(tx + padX + 4, ly, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle    = this.colors.textMuted;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.font         = `400 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(line.label, tx + padX + 14, ly);

      ctx.fillStyle = this.colors.text;
      ctx.textAlign = 'right';
      ctx.font      = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(line.value, tx + ttW - padX, ly);
    });

    ctx.restore();
  }

  // ── Pin Marker ─────────────────────────────────────────────

  drawPinMarker(x) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.colors.gray500;
    ctx.lineWidth   = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(x, this.chartY);
    ctx.lineTo(x, this.chartY + this.chartH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Legend ─────────────────────────────────────────────────

  drawLegend(items) {
    const ctx    = this.ctx;
    const y      = this.chartY - 20;
    let   x      = this.chartX;

    ctx.save();
    ctx.font         = '11px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    items.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x, y - 5, 16, 10, 2);
      ctx.fill();
      ctx.fillStyle = this.colors.text;
      ctx.fillText(item.label, x + 22, y);
      x += ctx.measureText(item.label).width + 44;
    });

    ctx.restore();
  }

  // ── Hint text ──────────────────────────────────────────────

  drawHint() {
    const ctx  = this.ctx;
    const text = 'Scroll to zoom · Drag to pan · Click to pin · Double-click to reset';
    ctx.save();
    ctx.font         = '10px Inter, system-ui, sans-serif';
    ctx.fillStyle    = this.colors.gray300;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, this.chartX + this.chartW, this.chartY + this.chartH + 44);
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
    if (range <= 0) return [min];
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
    this.config = {...this.config,...config };
    this._zoom  = null;
    this._pins  = [];
    this.draw();
  }
}
