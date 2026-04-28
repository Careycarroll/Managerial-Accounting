/**
 * cvp-chart.js — CVP Graph (Exhibit 3-2 style)
 * Extends Chart base class.
 * Config: { sellingPrice, variableCost, fixedCosts, maxUnits, currentUnits? }
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
      padding: { top: 50, right: 30, bottom: 55, left: 75 },
      ...config,
    });
    this.draw();
  }

  draw() {
    this.clear();
    const { sellingPrice, variableCost, fixedCosts, maxUnits, currentUnits } = this.config;

    if (sellingPrice <= 0 || maxUnits <= 0) return;

    const minUnits  = 0;
    const maxRev    = sellingPrice * maxUnits;
    const maxCost   = Math.max(fixedCosts + variableCost * maxUnits, maxRev) * 1.05;
    const minDollar = 0;

    const xTicks = this.niceTicks(minUnits, maxUnits, 6);
    const yTicks = this.niceTicks(minDollar, maxCost, 6);

    this.drawGrid(xTicks, yTicks, minUnits, maxUnits, minDollar, maxCost);
    this.drawAxes(xTicks, yTicks, minUnits, maxUnits, minDollar, maxCost, 'Units Sold', 'Dollars');

    const xS = v => this.xScale(v, minUnits, maxUnits);
    const yS = v => this.yScale(v, minDollar, maxCost);

    const cm = sellingPrice - variableCost;
    const bep = cm > 0 ? fixedCosts / cm : null;

    this._drawLossRegion(bep, sellingPrice, variableCost, fixedCosts, minUnits, maxUnits, minDollar, maxCost);
    this._drawProfitRegion(bep, sellingPrice, variableCost, fixedCosts, minUnits, maxUnits, minDollar, maxCost);
    this._drawFixedCostLine(fixedCosts, minUnits, maxUnits, minDollar, maxCost);
    this._drawTotalCostLine(variableCost, fixedCosts, minUnits, maxUnits, minDollar, maxCost);
    this._drawRevenueLine(sellingPrice, minUnits, maxUnits, minDollar, maxCost);

    if (bep !== null && bep >= 0 && bep <= maxUnits) {
      this._drawBreakevenPoint(bep, sellingPrice, variableCost, fixedCosts, xS, yS);
    }

    if (currentUnits !== null && currentUnits > 0) {
      this._drawCurrentUnits(currentUnits, sellingPrice, variableCost, fixedCosts, xS, yS);
    }

    this.drawLegend([
      { label: 'Total Revenue',   color: this.colors.primary },
      { label: 'Total Cost',      color: this.colors.accent },
      { label: 'Fixed Cost',      color: this.colors.gray300 },
    ]);
  }

  _drawRevenueLine(sp, minU, maxU, minD, maxD) {
    const pts = [
      { x: this.xScale(minU, minU, maxU), y: this.yScale(0,       minD, maxD) },
      { x: this.xScale(maxU, minU, maxU), y: this.yScale(sp*maxU, minD, maxD) },
    ];
    this.drawLine(pts, this.colors.primary, 2.5);
  }

  _drawTotalCostLine(vc, fc, minU, maxU, minD, maxD) {
    const pts = [
      { x: this.xScale(minU, minU, maxU), y: this.yScale(fc,           minD, maxD) },
      { x: this.xScale(maxU, minU, maxU), y: this.yScale(fc + vc*maxU, minD, maxD) },
    ];
    this.drawLine(pts, this.colors.accent, 2.5);
  }

  _drawFixedCostLine(fc, minU, maxU, minD, maxD) {
    const y   = this.yScale(fc, minD, maxD);
    const pts = [
      { x: this.xScale(minU, minU, maxU), y },
      { x: this.xScale(maxU, minU, maxU), y },
    ];
    this.drawLine(pts, this.colors.gray300, 1.5, true);
    this.drawLabel(
      'Fixed Costs: ' + this._fmtDollar(fc),
      this.xScale(minU, minU, maxU) + 6,
      y - 6,
      this.colors.gray500,
      'left', 'bottom', 10
    );
  }

  _drawLossRegion(bep, sp, vc, fc, minU, maxU, minD, maxD) {
    if (bep === null) return;
    const xS = v => this.xScale(v, minU, maxU);
    const yS = v => this.yScale(v, minD, maxD);
    const capU = Math.min(bep, maxU);
    const pts = [
      { x: xS(0),    y: yS(fc) },
      { x: xS(capU), y: yS(sp * capU) },
      { x: xS(capU), y: yS(fc + vc * capU) },
    ];
    this.drawFilledRegion(pts, this.colors.danger, 0.1);
  }

  _drawProfitRegion(bep, sp, vc, fc, minU, maxU, minD, maxD) {
    if (bep === null) return;
    const xS  = v => this.xScale(v, minU, maxU);
    const yS  = v => this.yScale(v, minD, maxD);
    const startU = Math.max(bep, 0);
    const pts = [
      { x: xS(startU), y: yS(sp * startU) },
      { x: xS(maxU),   y: yS(sp * maxU) },
      { x: xS(maxU),   y: yS(fc + vc * maxU) },
      { x: xS(startU), y: yS(fc + vc * startU) },
    ];
    this.drawFilledRegion(pts, this.colors.success, 0.1);
  }

  _drawBreakevenPoint(bep, sp, vc, fc, xS, yS) {
    const x   = xS(bep);
    const y   = yS(sp * bep);
    const rev = sp * bep;

    this.ctx.save();
    this.ctx.strokeStyle = this.colors.textMuted;
    this.ctx.lineWidth   = 1;
    this.ctx.setLineDash([4, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, this.chartY + this.chartH);
    this.ctx.stroke();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(this.chartX, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();

    this.drawPoint(x, y, this.colors.primary, 6);

    const labelX = x + 8;
    const labelY = y - 8;
    this.drawLabel(
      `BEP: ${Math.round(bep)} units`,
      labelX, labelY,
      this.colors.primary, 'left', 'bottom', 11
    );
    this.drawLabel(
      this._fmtDollar(rev),
      labelX, labelY + 14,
      this.colors.primary, 'left', 'bottom', 10
    );
  }

  _drawCurrentUnits(units, sp, vc, fc, xS, yS) {
    const x          = xS(units);
    const revenue    = sp * units;
    const totalCost  = fc + vc * units;
    const opIncome   = revenue - totalCost;
    const isProfit   = opIncome >= 0;
    const color      = isProfit ? this.colors.success : this.colors.danger;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth   = 1.5;
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, this.chartY);
    this.ctx.lineTo(x, this.chartY + this.chartH);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();

    this.drawPoint(x, yS(revenue),   this.colors.primary, 5);
    this.drawPoint(x, yS(totalCost), this.colors.accent,  5);

    const labelX = x + 6;
    const labelY = yS(revenue) - 6;
    this.drawLabel(
      (isProfit ? '+' : '') + this._fmtDollar(opIncome),
      labelX, labelY,
      color, 'left', 'bottom', 11
    );
  }
}
