/**
 * cvp-chart.js — CVP Graph (Exhibit 3-2 style)
 * Extends Chart base class.
 * Config: { sellingPrice, variableCost, fixedCosts, maxUnits, currentUnits? }
 * Interactions: crosshair, tooltip, click-to-pin, scroll-to-zoom (from chart-core)
 */
import { Chart } from './chart-core.js';

export class CVPChart extends Chart {
  constructor(canvasEl, config = {}) {
    super(canvasEl, {
      sellingPrice: 200,
      variableCost: 120,
      fixedCosts:   2000,
      maxUnits:     60,
      currentUnits: null,
      padding: { top: 50, right: 30, bottom: 58, left: 78 },...config,
    });
    this.draw();
  }

  // ── Values at a given unit level ───────────────────────────

  _valuesAt(units) {
    const { sellingPrice: sp, variableCost: vc, fixedCosts: fc } = this.config;
    const revenue   = sp * units;
    const totalCost = fc + vc * units;
    const opIncome  = revenue - totalCost;
    return { units, revenue, totalCost, fixedCosts: fc, opIncome };
  }

  // ── Main draw ──────────────────────────────────────────────

  draw() {
    this.clear();
    const { sellingPrice, variableCost, fixedCosts, maxUnits } = this.config;
    if (sellingPrice <= 0 || maxUnits <= 0) return;

    const zoom    = this._zoom || { minU: 0, maxU: maxUnits };
    const minU    = zoom.minU;
    const maxU    = zoom.maxU;
    const minD    = 0;
    const maxRevV = sellingPrice * maxU;
    const maxCstV = fixedCosts + variableCost * maxU;
    const maxD    = Math.max(maxRevV, maxCstV) * 1.08;

    this._minU = minU;
    this._maxU = maxU;
    this._minD = minD;
    this._maxD = maxD;

    const xTicks = this.niceTicks(minU, maxU, 6);
    const yTicks = this.niceTicks(minD, maxD, 6);

    this.drawGrid(xTicks, yTicks, minU, maxU, minD, maxD);
    this.drawAxes(xTicks, yTicks, minU, maxU, minD, maxD, 'Units Sold', 'Dollars');

    const cm  = sellingPrice - variableCost;
    const bep = cm > 0 ? fixedCosts / cm : null;

    this._drawLossRegion(bep, minU, maxU, minD, maxD);
    this._drawProfitRegion(bep, minU, maxU, minD, maxD);
    this._drawTotalCostLine(minU, maxU, minD, maxD);
    this._drawRevenueLine(minU, maxU, minD, maxD);
    this._drawFixedCostLine(minU, maxU, minD, maxD);

    if (bep !== null && bep >= minU && bep <= maxU) {
      this._drawBreakevenPoint(bep, minU, maxU, minD, maxD);
    }

    if (this.config.currentUnits !== null && this.config.currentUnits > 0) {
      this._drawCurrentUnits(this.config.currentUnits, minU, maxU, minD, maxD);
    }

    this._pins.forEach(pin => {
      const units = this.xToValue(pin.x, minU, maxU);
      if (units >= minU && units <= maxU) {
        this.drawPinMarker(pin.x);
        this._drawPinTooltip(pin.x, units, minU, maxU, minD, maxD);
      }
    });

    if (this._mouse && this._inChartArea(this._mouse.x, this._mouse.y)) {
      this.drawCrosshair(this._mouse.x, this._mouse.y);
      const units = this.xToValue(this._mouse.x, minU, maxU);
      this._drawHoverTooltip(this._mouse.x, this._mouse.y, units);
    }

    this.drawLegend([
      { label: 'Total Revenue', color: this.colors.primary },
      { label: 'Total Cost',    color: this.colors.accent  },
      { label: 'Fixed Cost',    color: this.colors.gray500 },
    ]);

    this.drawHint();
  }

  // ── Revenue line ───────────────────────────────────────────

  _drawRevenueLine(minU, maxU, minD, maxD) {
    const { sellingPrice: sp } = this.config;
    this.drawLine([
      { x: this.xScale(minU, minU, maxU), y: this.yScale(sp * minU, minD, maxD) },
      { x: this.xScale(maxU, minU, maxU), y: this.yScale(sp * maxU, minD, maxD) },
    ], this.colors.primary, 2.5);
  }

  // ── Total cost line ────────────────────────────────────────

  _drawTotalCostLine(minU, maxU, minD, maxD) {
    const { variableCost: vc, fixedCosts: fc } = this.config;
    this.drawLine([
      { x: this.xScale(minU, minU, maxU), y: this.yScale(fc + vc * minU, minD, maxD) },
      { x: this.xScale(maxU, minU, maxU), y: this.yScale(fc + vc * maxU, minD, maxD) },
    ], this.colors.accent, 2.5);
  }

  // ── Fixed cost line ────────────────────────────────────────

  _drawFixedCostLine(minU, maxU, minD, maxD) {
    const { fixedCosts: fc } = this.config;
    const y    = this.yScale(fc, minD, maxD);
    const xEnd = this.xScale(maxU, minU, maxU);
    const xStart = this.xScale(minU, minU, maxU);

    this.drawLine([
      { x: xStart, y },
      { x: xEnd,   y },
    ], this.colors.gray500, 1.5, true);

    this.drawLabelWithBackground(
      'Fixed: ' + this._fmtDollar(fc),
      xStart + 8,
      y - 6,
      this.colors.gray700,
      { fontSize: 10, baseline: 'bottom', border: this.colors.gray200 }
    );
  }

  // ── Loss region ────────────────────────────────────────────

  _drawLossRegion(bep, minU, maxU, minD, maxD) {
    if (bep === null) return;
    const { sellingPrice: sp, variableCost: vc, fixedCosts: fc } = this.config;
    const xS   = v => this.xScale(v, minU, maxU);
    const yS   = v => this.yScale(v, minD, maxD);
    const endU = Math.min(bep, maxU);

    const pts = [
      { x: xS(minU), y: yS(sp * minU)        },
      { x: xS(endU), y: yS(sp * endU)         },
      { x: xS(endU), y: yS(fc + vc * endU)    },
      { x: xS(minU), y: yS(fc + vc * minU)    },
    ];
    this.drawFilledRegion(pts, this.colors.danger, 0.1);
  }

  // ── Profit region ──────────────────────────────────────────

  _drawProfitRegion(bep, minU, maxU, minD, maxD) {
    if (bep === null) return;
    const { sellingPrice: sp, variableCost: vc, fixedCosts: fc } = this.config;
    const xS     = v => this.xScale(v, minU, maxU);
    const yS     = v => this.yScale(v, minD, maxD);
    const startU = Math.max(bep, minU);

    const pts = [
      { x: xS(startU), y: yS(sp * startU)        },
      { x: xS(maxU),   y: yS(sp * maxU)           },
      { x: xS(maxU),   y: yS(fc + vc * maxU)      },
      { x: xS(startU), y: yS(fc + vc * startU)    },
    ];
    this.drawFilledRegion(pts, this.colors.success, 0.1);
  }

  // ── Breakeven point ────────────────────────────────────────

  _drawBreakevenPoint(bep, minU, maxU, minD, maxD) {
    const { sellingPrice: sp } = this.config;
    const x   = this.xScale(bep, minU, maxU);
    const y   = this.yScale(sp * bep, minD, maxD);
    const rev = sp * bep;

    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.colors.textMuted;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, this.chartY + this.chartH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(this.chartX, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    this.drawPoint(x, y, this.colors.primary, 6);

    const labelX  = x + 10;
    const labelY1 = y - 10;
    const labelY2 = y + 8;

    this.drawLabelWithBackground(
      'BEP: ' + Math.round(bep) + ' units',
      labelX, labelY1,
      this.colors.primary,
      { fontSize: 11, baseline: 'bottom', border: this.colors.info }
    );
    this.drawLabelWithBackground(
      this._fmtDollar(rev),
      labelX, labelY2,
      this.colors.primary,
      { fontSize: 10, baseline: 'top', border: this.colors.info }
    );
  }

  // ── Current units marker ───────────────────────────────────

  _drawCurrentUnits(units, minU, maxU, minD, maxD) {
    const v        = this._valuesAt(units);
    const x        = this.xScale(units, minU, maxU);
    const yRev     = this.yScale(v.revenue,   minD, maxD);
    const yCost    = this.yScale(v.totalCost, minD, maxD);
    const isProfit = v.opIncome >= 0;
    const color    = isProfit ? this.colors.success : this.colors.danger;

    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, this.chartY);
    ctx.lineTo(x, this.chartY + this.chartH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    this.drawPoint(x, yRev,  this.colors.primary, 5);
    this.drawPoint(x, yCost, this.colors.accent,  5);

    const midY = (yRev + yCost) / 2;
    this.drawLabelWithBackground(
      (isProfit ? '+' : '') + this._fmtDollar(v.opIncome),
      x + 8, midY,
      color,
      { fontSize: 11, baseline: 'middle', border: isProfit ? this.colors.success : this.colors.danger }
    );
  }

  // ── Hover tooltip ──────────────────────────────────────────

  _drawHoverTooltip(mouseX, mouseY, units) {
    const v = this._valuesAt(Math.max(0, units));
    this.drawTooltip(mouseX, mouseY, [
      { label: 'Units',          value: Math.round(units).toLocaleString(),  color: null },
      { label: 'Revenue',        value: this._fmtDollar(v.revenue),          color: this.colors.primary },
      { label: 'Total Cost',     value: this._fmtDollar(v.totalCost),        color: this.colors.accent  },
      { label: 'Fixed Cost',     value: this._fmtDollar(v.fixedCosts),       color: this.colors.gray500 },
      { label: 'Operating Inc.', value: (v.opIncome >= 0 ? '+' : '') + this._fmtDollar(v.opIncome),
        color: v.opIncome >= 0 ? this.colors.success : this.colors.danger },
    ]);
  }

  // ── Pinned tooltip ─────────────────────────────────────────

  _drawPinTooltip(pinX, units, minU, maxU, minD, maxD) {
    const v    = this._valuesAt(Math.max(0, units));
    const yRev = this.yScale(v.revenue, minD, maxD);

    this.drawPoint(pinX, yRev, this.colors.gray700, 4);

    this.drawTooltip(pinX, yRev, [
      { label: 'Units',          value: Math.round(units).toLocaleString(),  color: null },
      { label: 'Revenue',        value: this._fmtDollar(v.revenue),          color: this.colors.primary },
      { label: 'Total Cost',     value: this._fmtDollar(v.totalCost),        color: this.colors.accent  },
      { label: 'Operating Inc.', value: (v.opIncome >= 0 ? '+' : '') + this._fmtDollar(v.opIncome),
        color: v.opIncome >= 0 ? this.colors.success : this.colors.danger },
    ]);
  }
}
