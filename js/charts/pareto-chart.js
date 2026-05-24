// ── Pareto Chart Component ───────────────────────────────────────────────────
// Canvas-based Pareto diagram for Chapter 20.
// Usage:
//   import { ParetoChart } from '/js/charts/pareto-chart.js';
//   const chart = new ParetoChart(canvasEl, { data: [{ label: 'Scratches', value: 42 }] });
//   chart.update({ data: nextData });

export class ParetoChart {
  constructor(canvas, config = {}) {
    if (!canvas) throw new Error('ParetoChart requires a canvas element.');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = {
      data: [],
      title: 'Pareto Diagram',
      barColor: null,
      barColorActive: null,
      lineColor: null,
      thresholdColor: null,
      gridColor: null,
      textColor: null,
      mutedTextColor: null,
      ...config,
    };
    this.hoverIndex = -1;
    this.selectedIndex = -1;
    this.barRects = [];
    this.tooltip = null;

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);

    this.resize();
    this.draw();
  }

  update(config = {}) {
    this.config = { ...this.config, ...config };
    this.hoverIndex = -1;
    this.selectedIndex = -1;
    this.resize();
    this.draw();
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.handleResize);
    this.hideTooltip();
  }

  handleResize() {
    this.resize();
    this.draw();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width || this.canvas.parentElement?.clientWidth || 800;
    const cssHeight = rect.height || 420;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = cssWidth;
    this.height = cssHeight;
  }

  getTheme() {
    const styles = getComputedStyle(document.documentElement);
    const fallback = (name, value) => (styles.getPropertyValue(name).trim() || value);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: this.config.textColor || fallback('--color-gray-900', isDark ? '#f7fafc' : '#0f172a'),
      muted: this.config.mutedTextColor || fallback('--color-gray-500', isDark ? '#a0aec0' : '#64748b'),
      grid: this.config.gridColor || fallback('--color-border', isDark ? '#3d4f66' : '#d6dce6'),
      bar: this.config.barColor || fallback('--color-primary', '#1a365d'),
      barActive: this.config.barColorActive || fallback('--color-accent', '#c8973a'),
      line: this.config.lineColor || fallback('--color-danger', isDark ? '#fc8181' : '#c53030'),
      threshold: this.config.thresholdColor || fallback('--color-accent', '#c8973a'),
      surface: fallback('--color-surface', isDark ? '#1e2530' : '#ffffff'),
    };
  }

  normalizeData() {
    const raw = Array.isArray(this.config.data) ? this.config.data : [];
    const cleaned = raw
      .map((d, i) => ({
        label: String(d.label || d.name || `Item ${i + 1}`),
        value: Math.max(0, Number(d.value ?? d.count ?? d.frequency ?? 0) || 0),
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = cleaned.reduce((s, d) => s + d.value, 0);
    let cumulative = 0;
    return cleaned.map(d => {
      cumulative += d.value;
      return {
        ...d,
        cumulative,
        cumulativePct: total > 0 ? cumulative / total : 0,
      };
    });
  }

  draw() {
    const ctx = this.ctx;
    const theme = this.getTheme();
    const data = this.normalizeData();
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = theme.surface;
    ctx.fillRect(0, 0, w, h);

    if (!data.length) {
      this.drawEmpty(theme);
      return;
    }

    const margin = {
      top: 54,
      right: 62,
      bottom: 92,
      left: 62,
    };
    const plotW = Math.max(1, w - margin.left - margin.right);
    const plotH = Math.max(1, h - margin.top - margin.bottom);
    const maxValue = Math.max(...data.map(d => d.value));
    const yMax = this.niceMax(maxValue);

    this.barRects = [];

    this.drawTitle(theme, margin);
    this.drawAxes(theme, margin, plotW, plotH, yMax);
    this.drawBars(theme, data, margin, plotW, plotH, yMax);
    this.drawCumulativeLine(theme, data, margin, plotW, plotH);
    this.drawThreshold(theme, margin, plotW, plotH);
    this.drawLegend(theme, margin, plotW);
  }

  drawEmpty(theme) {
    const ctx = this.ctx;
    ctx.fillStyle = theme.text;
    ctx.font = '700 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No defect data to display', this.width / 2, this.height / 2 - 8);
    ctx.fillStyle = theme.muted;
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Enter at least one defect type with a positive frequency.', this.width / 2, this.height / 2 + 18);
  }

  drawTitle(theme, margin) {
    const ctx = this.ctx;
    ctx.fillStyle = theme.text;
    ctx.font = '700 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.title || 'Pareto Diagram', margin.left, 24);
  }

  drawAxes(theme, margin, plotW, plotH, yMax) {
    const ctx = this.ctx;
    const left = margin.left;
    const top = margin.top;
    const bottom = margin.top + plotH;
    const right = margin.left + plotW;

    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = theme.muted;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const pct = i / ticks;
      const y = bottom - pct * plotH;
      const value = yMax * pct;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillText(Math.round(value).toLocaleString(), left - 8, y);
    }

    ctx.textAlign = 'left';
    for (let i = 0; i <= ticks; i++) {
      const pct = i / ticks;
      const y = bottom - pct * plotH;
      ctx.fillText(Math.round(pct * 100) + '%', right + 8, y);
    }

    ctx.strokeStyle = theme.text;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(right, top);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    ctx.save();
    ctx.translate(18, top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = theme.muted;
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(this.width - 18, top + plotH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = theme.muted;
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cumulative %', 0, 0);
    ctx.restore();
  }

  drawBars(theme, data, margin, plotW, plotH, yMax) {
    const ctx = this.ctx;
    const gap = Math.max(6, plotW * 0.018);
    const barW = Math.max(14, (plotW - gap * (data.length + 1)) / data.length);
    const bottom = margin.top + plotH;

    data.forEach((d, i) => {
      const x = margin.left + gap + i * (barW + gap);
      const barH = yMax > 0 ? (d.value / yMax) * plotH : 0;
      const y = bottom - barH;
      const active = i === this.hoverIndex || i === this.selectedIndex;

      ctx.fillStyle = active ? theme.barActive : theme.bar;
      ctx.globalAlpha = active ? 1 : 0.88;
      ctx.fillRect(x, y, barW, barH);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = active ? theme.barActive : theme.bar;
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeRect(x, y, barW, barH);

      ctx.fillStyle = theme.text;
      ctx.font = '700 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(d.value.toLocaleString(), x + barW / 2, y - 4);

      ctx.save();
      ctx.translate(x + barW / 2, bottom + 12);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = theme.muted;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.truncate(d.label, 18), 0, 0);
      ctx.restore();

      this.barRects.push({ x, y, width: barW, height: barH, index: i, data: d });
    });
  }

  drawCumulativeLine(theme, data, margin, plotW, plotH) {
    const ctx = this.ctx;
    const gap = Math.max(6, plotW * 0.018);
    const barW = Math.max(14, (plotW - gap * (data.length + 1)) / data.length);
    const bottom = margin.top + plotH;

    const points = data.map((d, i) => {
      const x = margin.left + gap + i * (barW + gap) + barW / 2;
      const y = bottom - d.cumulativePct * plotH;
      return { x, y, data: d };
    });

    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    points.forEach((p, i) => {
      const active = i === this.hoverIndex || i === this.selectedIndex;
      ctx.fillStyle = active ? theme.barActive : theme.line;
      ctx.beginPath();
      ctx.arc(p.x, p.y, active ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.surface;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  drawThreshold(theme, margin, plotW, plotH) {
    const ctx = this.ctx;
    const y = margin.top + plotH - 0.8 * plotH;
    const left = margin.left;
    const right = margin.left + plotW;

    ctx.strokeStyle = theme.threshold;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = theme.threshold;
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('80% threshold', right - 6, y - 4);
  }

  drawLegend(theme, margin, plotW) {
    const ctx = this.ctx;
    const y = this.height - 20;
    const x = margin.left;

    ctx.font = '12px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.bar;
    ctx.fillRect(x, y - 5, 16, 10);
    ctx.fillStyle = theme.muted;
    ctx.fillText('Defect frequency', x + 22, y);

    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 150, y);
    ctx.lineTo(x + 184, y);
    ctx.stroke();
    ctx.fillStyle = theme.muted;
    ctx.fillText('Cumulative percentage', x + 194, y);

    ctx.strokeStyle = theme.threshold;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(x + 370, y);
    ctx.lineTo(x + 404, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.muted;
    ctx.fillText('80% line', x + 414, y);
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = this.barRects.find(r => x >= r.x && x <= r.x + r.width && y >= Math.min(r.y, r.y + r.height) && y <= r.y + r.height);
    const nextIndex = hit ? hit.index : -1;
    if (nextIndex !== this.hoverIndex) {
      this.hoverIndex = nextIndex;
      this.draw();
    }
    if (hit) this.showTooltip(event.clientX, event.clientY, hit.data);
    else this.hideTooltip();
  }

  handleMouseLeave() {
    this.hoverIndex = -1;
    this.hideTooltip();
    this.draw();
  }

  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = this.barRects.find(r => x >= r.x && x <= r.x + r.width && y >= Math.min(r.y, r.y + r.height) && y <= r.y + r.height);
    this.selectedIndex = hit ? (this.selectedIndex === hit.index ? -1 : hit.index) : -1;
    this.draw();
  }

  showTooltip(clientX, clientY, d) {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.style.position = 'fixed';
      this.tooltip.style.zIndex = '2000';
      this.tooltip.style.pointerEvents = 'none';
      this.tooltip.style.padding = '8px 10px';
      this.tooltip.style.borderRadius = '8px';
      this.tooltip.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
      this.tooltip.style.font = '12px Inter, sans-serif';
      document.body.appendChild(this.tooltip);
    }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.tooltip.style.background = isDark ? '#1e2530' : '#ffffff';
    this.tooltip.style.color = isDark ? '#f7fafc' : '#0f172a';
    this.tooltip.style.border = isDark ? '1px solid #3d4f66' : '1px solid #d6dce6';
    this.tooltip.innerHTML = '<strong>' + this.escape(d.label) + '</strong><br />Count: ' + d.value.toLocaleString() + '<br />Cumulative: ' + (d.cumulativePct * 100).toFixed(1) + '%';
    this.tooltip.style.left = Math.min(clientX + 14, window.innerWidth - 190) + 'px';
    this.tooltip.style.top = Math.min(clientY + 14, window.innerHeight - 90) + 'px';
    this.tooltip.hidden = false;
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.hidden = true;
  }

  niceMax(value) {
    if (value <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const scaled = value / pow;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return nice * pow;
  }

  truncate(text, max) {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  escape(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
