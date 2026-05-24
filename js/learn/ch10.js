import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { ScatterChart } from '/js/charts/scatter-chart.js';
import { initHeader } from '/js/components/header.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtN   = n => Math.round(n * 100) / 100 + '';
const fmtNL  = n => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

function getOrCreate(id, tag, className, parent) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tag || 'div');
    el.id = id;
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
  }
  return el;
}

const val  = id => parseFloat(document.getElementById(id).value) || 0;
const sval = id => document.getElementById(id).value.trim();

// ── Elegant Rugs dataset (Exhibit 10-3) ───────────────────────────────────────
const ELEGANT_RUGS = [
  { x: 68, y: 1190 }, { x: 88, y: 1211 }, { x: 62, y: 1004 },
  { x: 72, y: 917  }, { x: 60, y: 770  }, { x: 96, y: 1456 },
  { x: 78, y: 1180 }, { x: 46, y: 710  }, { x: 82, y: 1316 },
  { x: 94, y: 1032 }, { x: 68, y: 752  }, { x: 48, y: 963  }
];

// ── Shared data table helpers ─────────────────────────────────────────────────

function buildDataTable(tbodyId, rows) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + (i + 1) + '</td>'
      + '<td><input class="form-input form-input--sm" type="number" '
      + 'data-col="x" data-row="' + i + '" value="' + r.x + '" step="1" /></td>'
      + '<td><input class="form-input form-input--sm" type="number" '
      + 'data-col="y" data-row="' + i + '" value="' + r.y + '" step="1" /></td>';
    tbody.appendChild(tr);
  });
}

function readDataTable(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return [];
  const points = [];
  tbody.querySelectorAll('tr').forEach((tr, i) => {
    const xInput = tr.querySelector('[data-col="x"]');
    const yInput = tr.querySelector('[data-col="y"]');
    if (!xInput || !yInput) return;
    const x = parseFloat(xInput.value);
    const y = parseFloat(yInput.value);
    if (!isNaN(x) && !isNaN(y)) points.push({ x, y, label: i + 1 });
  });
  return points;
}

function initDataTable(tbodyId, defaultData) {
  buildDataTable(tbodyId, defaultData);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Cost Function Builder
// ═══════════════════════════════════════════════════════════════════════════════

function calcTool1() {
  const a      = val('t1-fixed');
  const b      = val('t1-variable');
  const x      = val('t1-activity');
  const maxX   = val('t1-max-x');

  const yAtX   = a + b * x;
  const yFixed = a;           // pure fixed: y = a
  const yVar   = b * x;       // pure variable at x: y = bX (no fixed)
  const yMixed = a + b * x;   // mixed: y = a + bX

  const isVariable = a === 0 && b > 0;
  const isFixed    = b === 0 && a > 0;
  const isMixed    = a > 0 && b > 0;

  let costType = isVariable ? 'Variable Cost (y = bX)'
               : isFixed    ? 'Fixed Cost (y = a)'
               : 'Mixed Cost (y = a + bX)';

  const out = getOrCreate('t1-output', 'div', 'tool-output',
    document.getElementById('t1-output').parentElement);

  // Build comparison table for all three types at this X
  const varCostAtX   = b * x;
  const fixedCostAtX = a;
  const mixedCostAtX = a + b * x;

  out.innerHTML = '<div class="ch10-cf-grid">'

    + '<div class="ch10-cf-card ch10-cf-card--variable">'
    + '<div class="ch10-cf-card__type">Variable Cost</div>'
    + '<div class="ch10-cf-card__formula">y = bX</div>'
    + '<div class="ch10-cf-card__formula">y = ' + fmtN(b) + 'X</div>'
    + '<div class="ch10-cf-card__value">' + fmt(varCostAtX) + '</div>'
    + '<div class="ch10-cf-card__note">at X = ' + fmtN(x) + '</div>'
    + '<div class="ch10-cf-card__desc">No fixed component. Cost is zero when activity is zero. Slope = ' + fmt(b) + ' per unit.</div>'
    + '</div>'

    + '<div class="ch10-cf-card ch10-cf-card--fixed">'
    + '<div class="ch10-cf-card__type">Fixed Cost</div>'
    + '<div class="ch10-cf-card__formula">y = a</div>'
    + '<div class="ch10-cf-card__formula">y = ' + fmt(a) + '</div>'
    + '<div class="ch10-cf-card__value">' + fmt(fixedCostAtX) + '</div>'
    + '<div class="ch10-cf-card__note">at any X</div>'
    + '<div class="ch10-cf-card__desc">Constant regardless of activity. Slope = $0. Intercept = ' + fmt(a) + '.</div>'
    + '</div>'

    + '<div class="ch10-cf-card ch10-cf-card--mixed' + (isMixed ? ' ch10-cf-card--active' : '') + '">'
    + '<div class="ch10-cf-card__type">Mixed Cost</div>'
    + '<div class="ch10-cf-card__formula">y = a + bX</div>'
    + '<div class="ch10-cf-card__formula">y = ' + fmt(a) + ' + ' + fmtN(b) + 'X</div>'
    + '<div class="ch10-cf-card__value">' + fmt(mixedCostAtX) + '</div>'
    + '<div class="ch10-cf-card__note">at X = ' + fmtN(x) + '</div>'
    + '<div class="ch10-cf-card__desc">Has both fixed (' + fmt(a) + ') and variable (' + fmt(b) + '/unit) components.</div>'
    + '</div>'

    + '</div>'

    + '<div class="ch10-cf-result">'
    + '<div class="ch10-cf-result__label">Your function: <strong>' + costType + '</strong></div>'
    + '<div class="ch10-cf-result__eq">y = ' + fmt(a) + ' + ' + fmtN(b) + 'X</div>'
    + '<div class="ch10-cf-result__pred">At X = ' + fmtN(x) + ':   y = '
    + fmt(a) + ' + (' + fmtN(b) + ' &times; ' + fmtN(x) + ') = <strong>' + fmt(yAtX) + '</strong></div>'
    + '</div>';

  renderShowWork(document.getElementById('t1-show-work'), [
    { label: 'Cost Function', formula: 'y = a + bX', values: 'a = ' + fmt(a) + ', b = ' + fmtN(b), result: costType },
    { label: 'Cost at Activity Level X', formula: 'y = a + b * X', values: fmt(a) + ' + ' + fmtN(b) + ' * ' + fmtN(x), result: fmt(yAtX), highlight: true },
    { label: 'Fixed Component', formula: 'Does not change with X', values: fmt(a), result: 'Period cost = ' + fmt(a) },
    { label: 'Variable Component at X', formula: 'b * X', values: fmtN(b) + ' * ' + fmtN(x), result: fmt(b * x) }
  ], { title: 'Cost Function Calculation', defaultOpen: false });
}

function initTool1() {
  document.getElementById('t1-calculate').addEventListener('click', calcTool1);
  initRandomizer('t1-randomize', [
    { id: 't1-fixed',    min: 0,   max: 2000, step: 100, integer: true },
    { id: 't1-variable', min: 0,   max: 50,   step: 1   },
    { id: 't1-activity', min: 10,  max: 200,  step: 10,  integer: true },
    { id: 't1-max-x',    min: 50,  max: 300,  step: 25,  integer: true }
  ], calcTool1);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- High-Low Method Calculator
// ═══════════════════════════════════════════════════════════════════════════════

let t2Chart = null;

function calcTool2() {
  const points  = readDataTable('t2-table-body');
  const predictX = val('t2-predict-x');
  const xLabel   = sval('t2-x-label') || 'Activity (X)';
  const yLabel   = sval('t2-y-label') || 'Cost (Y)';

  if (points.length < 2) {
    alert('Enter at least 2 observations.');
    return;
  }

  // Find highest and lowest X observations
  const highObs = points.reduce((a, b) => b.x > a.x ? b : a);
  const lowObs  = points.reduce((a, b) => b.x < a.x ? b : a);

  const slope    = (highObs.y - lowObs.y) / (highObs.x - lowObs.x);
  const constant = highObs.y - slope * highObs.x;
  const predictY = constant + slope * predictX;

  // Show chart
  const chartWrap = document.getElementById('t2-chart-wrap');
  chartWrap.style.display = 'block';
  const canvas = document.getElementById('t2-canvas');

  if (t2Chart) {
    t2Chart.update({
      points,
      highLowLine: { a: constant, b: slope },
      xLabel,
      yLabel,
      title: 'High-Low Method -- ' + xLabel + ' vs ' + yLabel,
      showPointLabels: true,
      relevantRange: { min: lowObs.x, max: highObs.x }
    });
  } else {
    t2Chart = new ScatterChart(canvas, {
      points,
      highLowLine: { a: constant, b: slope },
      xLabel,
      yLabel,
      title: 'High-Low Method -- ' + xLabel + ' vs ' + yLabel,
      showPointLabels: true,
      relevantRange: { min: lowObs.x, max: highObs.x }
    });
  }

  const out = getOrCreate('t2-output', 'div', 'tool-output',
    document.getElementById('t2-output').parentElement);

  out.innerHTML = '<div class="ch10-hl-result">'
    + '<div class="ch10-hl-result__grid">'

    + '<div class="ch10-hl-obs ch10-hl-obs--high">'
    + '<div class="ch10-hl-obs__label">Highest Observation (X)</div>'
    + '<div class="ch10-hl-obs__vals">X = ' + fmtN(highObs.x) + '  |  Y = ' + fmt(highObs.y) + '</div>'
    + '</div>'

    + '<div class="ch10-hl-obs ch10-hl-obs--low">'
    + '<div class="ch10-hl-obs__label">Lowest Observation (X)</div>'
    + '<div class="ch10-hl-obs__vals">X = ' + fmtN(lowObs.x) + '  |  Y = ' + fmt(lowObs.y) + '</div>'
    + '</div>'

    + '<div class="ch10-hl-eq">'
    + '<div class="ch10-hl-eq__label">Estimated Cost Function</div>'
    + '<div class="ch10-hl-eq__formula">y = ' + fmt(constant) + ' + ' + fmtN(slope) + 'X</div>'
    + '<div class="ch10-hl-eq__note">Slope b = ' + fmt(slope) + ' per unit  |  Constant a = ' + fmt(constant) + '</div>'
    + '</div>'

    + '<div class="ch10-hl-pred">'
    + '<div class="ch10-hl-pred__label">Predicted Cost at X = ' + fmtN(predictX) + '</div>'
    + '<div class="ch10-hl-pred__value">' + fmt(predictY) + '</div>'
    + '<div class="ch10-hl-pred__calc">' + fmt(constant) + ' + (' + fmtN(slope) + ' &times; ' + fmtN(predictX) + ')</div>'
    + '</div>'

    + '</div>'
    + '<div class="ch10-hl-warning">Note: The high-low method uses only 2 of ' + points.length + ' observations. '
    + 'Results may not represent the full dataset. Use regression analysis for a more accurate estimate.</div>'
    + '</div>';

  renderShowWork(document.getElementById('t2-show-work'), [
    { label: 'Step 1: Identify Highest and Lowest X', formula: 'Highest X = ' + fmtN(highObs.x) + ', Lowest X = ' + fmtN(lowObs.x), values: 'Difference = ' + fmtN(highObs.x - lowObs.x), result: fmtN(highObs.x - lowObs.x) + ' units' },
    { label: 'Step 2: Cost Difference', formula: 'Y at High - Y at Low', values: fmt(highObs.y) + ' - ' + fmt(lowObs.y), result: fmt(highObs.y - lowObs.y) },
    { label: 'Step 3: Slope Coefficient (b)', formula: 'Cost Difference / X Difference', values: fmt(highObs.y - lowObs.y) + ' / ' + fmtN(highObs.x - lowObs.x), result: fmtN(slope) + ' per unit', highlight: true },
    { label: 'Step 4: Constant (a) using High observation', formula: 'Y_high - b * X_high', values: fmt(highObs.y) + ' - (' + fmtN(slope) + ' * ' + fmtN(highObs.x) + ')', result: fmt(constant), highlight: true },
    { label: 'Step 5: Cost Function', formula: 'y = a + bX', values: 'y = ' + fmt(constant) + ' + ' + fmtN(slope) + 'X', result: 'Estimated cost function' },
    { label: 'Step 6: Predict at X = ' + fmtN(predictX), formula: 'y = a + b * X', values: fmt(constant) + ' + ' + fmtN(slope) + ' * ' + fmtN(predictX), result: fmt(predictY), highlight: true }
  ], { title: 'High-Low Method Steps', defaultOpen: false });
}

function initTool2() {
  initDataTable('t2-table-body', ELEGANT_RUGS);
  document.getElementById('t2-calculate').addEventListener('click', calcTool2);
  document.getElementById('t2-load-elegant').addEventListener('click', () => {
    buildDataTable('t2-table-body', ELEGANT_RUGS);
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Regression Analysis Evaluator
// ═══════════════════════════════════════════════════════════════════════════════

let t3Chart = null;

function calcRegression(points) {
  const n   = points.length;
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;

  // R-squared
  const yBar       = sumY / n;
  const ssTot      = points.reduce((s, p) => s + Math.pow(p.y - yBar, 2), 0);
  const ssRes      = points.reduce((s, p) => s + Math.pow(p.y - (a + b * p.x), 2), 0);
  const r2         = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Standard error of regression
  const df         = n - 2;
  const se         = df > 0 ? Math.sqrt(ssRes / df) : 0;

  // Standard error of b coefficient
  const xBar       = sumX / n;
  const ssXX       = points.reduce((s, p) => s + Math.pow(p.x - xBar, 2), 0);
  const seb        = ssXX > 0 ? se / Math.sqrt(ssXX) : 0;
  const tStat      = seb > 0 ? b / seb : 0;

  return { a, b, r2, se, seb, tStat, n, yBar, ssRes, ssTot };
}

function calcTool3() {
  const points   = readDataTable('t3-table-body');
  const predictX = val('t3-predict-x');
  const xLabel   = sval('t3-x-label') || 'Activity (X)';
  const yLabel   = sval('t3-y-label') || 'Cost (Y)';

  if (points.length < 3) {
    alert('Enter at least 3 observations for regression.');
    return;
  }

  const reg = calcRegression(points);
  if (!reg) { alert('Cannot compute regression -- check data.'); return; }

  const predictY = reg.a + reg.b * predictX;

  // High-low for comparison
  const highObs  = points.reduce((a, b) => b.x > a.x ? b : a);
  const lowObs   = points.reduce((a, b) => b.x < a.x ? b : a);
  const hlSlope  = (highObs.y - lowObs.y) / (highObs.x - lowObs.x);
  const hlConst  = highObs.y - hlSlope * highObs.x;
  const hlPredY  = hlConst + hlSlope * predictX;

  // Show chart
  const chartWrap = document.getElementById('t3-chart-wrap');
  chartWrap.style.display = 'block';
  const canvas = document.getElementById('t3-canvas');

  if (t3Chart) {
    t3Chart.update({
      points,
      regressionLine: { a: reg.a, b: reg.b },
      highLowLine: { a: hlConst, b: hlSlope },
      xLabel,
      yLabel,
      title: 'Regression Analysis -- ' + xLabel + ' vs ' + yLabel,
      showPointLabels: true,
      relevantRange: { min: lowObs.x, max: highObs.x }
    });
  } else {
    t3Chart = new ScatterChart(canvas, {
      points,
      regressionLine: { a: reg.a, b: reg.b },
      highLowLine: { a: hlConst, b: hlSlope },
      xLabel,
      yLabel,
      title: 'Regression Analysis -- ' + xLabel + ' vs ' + yLabel,
      showPointLabels: true,
      relevantRange: { min: lowObs.x, max: highObs.x }
    });
  }

  // R2 quality label
  const r2Quality = reg.r2 >= 0.7 ? 'Strong fit'
                  : reg.r2 >= 0.3 ? 'Moderate fit'
                  : 'Weak fit';
  const r2Class   = reg.r2 >= 0.7 ? 'ch10-stat--good'
                  : reg.r2 >= 0.3 ? 'ch10-stat--ok'
                  : 'ch10-stat--poor';

  // t-stat significance (cutoff ~2.0 for most sample sizes)
  const tSigClass = Math.abs(reg.tStat) >= 2.0 ? 'ch10-stat--good' : 'ch10-stat--poor';
  const tSigLabel = Math.abs(reg.tStat) >= 2.0 ? 'Significant' : 'Not significant';

  const out = getOrCreate('t3-output', 'div', 'tool-output',
    document.getElementById('t3-output').parentElement);

  out.innerHTML = '<div class="ch10-reg-result">'

    + '<div class="ch10-reg-eq">'
    + '<div class="ch10-reg-eq__label">Regression Equation</div>'
    + '<div class="ch10-reg-eq__formula">y = ' + fmt(reg.a) + ' + ' + fmtN(reg.b) + 'X</div>'
    + '</div>'

    + '<div class="ch10-reg-stats">'
    + '<div class="ch10-stat ' + r2Class + '"><div class="ch10-stat__label">R&sup2; (Goodness of Fit)</div>'
    + '<div class="ch10-stat__value">' + (reg.r2 * 100).toFixed(1) + '%</div>'
    + '<div class="ch10-stat__note">' + r2Quality + '</div></div>'

    + '<div class="ch10-stat"><div class="ch10-stat__label">Std Error of Regression</div>'
    + '<div class="ch10-stat__value">' + fmt(reg.se) + '</div>'
    + '<div class="ch10-stat__note">Variation around line</div></div>'

    + '<div class="ch10-stat ' + tSigClass + '"><div class="ch10-stat__label">t-Statistic (slope b)</div>'
    + '<div class="ch10-stat__value">' + fmtN(reg.tStat) + '</div>'
    + '<div class="ch10-stat__note">' + tSigLabel + ' (cutoff ~2.0)</div></div>'
    + '</div>'

    + '<div class="ch10-reg-compare">'
    + '<div class="ch10-reg-compare__title">Prediction Comparison at X = ' + fmtN(predictX) + '</div>'
    + '<div class="ch10-reg-compare__row">'
    + '<span class="ch10-reg-compare__method">Regression</span>'
    + '<span class="ch10-reg-compare__eq">y = ' + fmt(reg.a) + ' + ' + fmtN(reg.b) + ' &times; ' + fmtN(predictX) + '</span>'
    + '<span class="ch10-reg-compare__val ch10-reg-compare__val--reg">' + fmt(predictY) + '</span>'
    + '</div>'
    + '<div class="ch10-reg-compare__row">'
    + '<span class="ch10-reg-compare__method">High-Low</span>'
    + '<span class="ch10-reg-compare__eq">y = ' + fmt(hlConst) + ' + ' + fmtN(hlSlope) + ' &times; ' + fmtN(predictX) + '</span>'
    + '<span class="ch10-reg-compare__val">' + fmt(hlPredY) + '</span>'
    + '</div>'
    + '<div class="ch10-reg-compare__diff">Difference: ' + fmt(Math.abs(predictY - hlPredY))
    + (predictY > hlPredY ? ' (regression predicts higher)' : ' (high-low predicts higher)') + '</div>'
    + '</div>'

    + '<div class="ch10-criteria-grid">'
    + '<div class="ch10-criteria-card"><div class="ch10-criteria-card__num">1</div>'
    + '<div class="ch10-criteria-card__title">Economic Plausibility</div>'
    + '<p>Does a cause-and-effect relationship exist between X and Y? The slope b = ' + fmtN(reg.b)
    + ' means each unit increase in X is associated with a ' + fmt(reg.b) + ' increase in cost. '
    + 'Evaluate whether this makes operational sense.</p></div>'

    + '<div class="ch10-criteria-card"><div class="ch10-criteria-card__num">2</div>'
    + '<div class="ch10-criteria-card__title">Goodness of Fit (R&sup2;)</div>'
    + '<p>R&sup2; = ' + (reg.r2 * 100).toFixed(1) + '% means X explains '
    + (reg.r2 * 100).toFixed(1) + '% of the variation in Y. '
    + (reg.r2 >= 0.3 ? 'This passes the goodness-of-fit test (R&sup2; &ge; 0.30).'
                     : 'This fails the goodness-of-fit test (R&sup2; &lt; 0.30). Consider a different cost driver.')
    + '</p></div>'

    + '<div class="ch10-criteria-card"><div class="ch10-criteria-card__num">3</div>'
    + '<div class="ch10-criteria-card__title">Significance of Independent Variable</div>'
    + '<p>t-statistic = ' + fmtN(reg.tStat) + '. '
    + (Math.abs(reg.tStat) >= 2.0
      ? 'The slope is statistically significant -- changes in X reliably predict changes in Y.'
      : 'The slope is not statistically significant at the 5% level. The relationship may be due to chance.')
    + '</p></div>'
    + '</div>'

    + '</div>';

  renderShowWork(document.getElementById('t3-show-work'), [
    { label: 'n (observations)', formula: 'Count of data pairs', values: '', result: reg.n + '' },
    { label: 'Sum of X', formula: 'SUM(X)', values: '', result: fmtNL(points.reduce((s,p)=>s+p.x,0)) },
    { label: 'Sum of Y', formula: 'SUM(Y)', values: '', result: fmtNL(points.reduce((s,p)=>s+p.y,0)) },
    { label: 'Sum of X^2', formula: 'SUM(X^2)', values: '', result: fmtNL(points.reduce((s,p)=>s+p.x*p.x,0)) },
    { label: 'Sum of XY', formula: 'SUM(X*Y)', values: '', result: fmtNL(points.reduce((s,p)=>s+p.x*p.y,0)) },
    { label: 'Slope b', formula: '[n*SUM(XY) - SUM(X)*SUM(Y)] / [n*SUM(X^2) - SUM(X)^2]', values: '', result: fmtN(reg.b) + ' per unit', highlight: true },
    { label: 'Constant a', formula: '[SUM(Y) - b*SUM(X)] / n', values: '', result: fmt(reg.a), highlight: true },
    { label: 'R-squared', formula: '1 - SS_Residual / SS_Total', values: 'SS_Res = ' + fmtNL(reg.ssRes) + ', SS_Tot = ' + fmtNL(reg.ssTot), result: (reg.r2 * 100).toFixed(2) + '%', highlight: true },
    { label: 'Predicted Y at X = ' + fmtN(predictX), formula: 'a + b * X', values: fmt(reg.a) + ' + ' + fmtN(reg.b) + ' * ' + fmtN(predictX), result: fmt(predictY), highlight: true }
  ], { title: 'Regression Calculation', defaultOpen: false });
}

function initTool3() {
  initDataTable('t3-table-body', ELEGANT_RUGS);
  document.getElementById('t3-calculate').addEventListener('click', calcTool3);
  document.getElementById('t3-load-elegant').addEventListener('click', () => {
    buildDataTable('t3-table-body', ELEGANT_RUGS);
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Learning Curve Calculator
// ═══════════════════════════════════════════════════════════════════════════════

function calcTool4() {
  const a          = val('t4-first-unit');
  const rate       = val('t4-learning-rate') / 100;
  const maxUnits   = Math.min(Math.max(Math.round(val('t4-max-units')), 2), 32);
  const laborRate  = val('t4-labor-rate');
  const model      = document.querySelector('input[name="t4-model"]:checked').value;

  const b = Math.log(rate) / Math.log(2);

  // Build table rows for units 1 through maxUnits
  const rows = [];

  if (model === 'cumavg') {
    // Cumulative average-time model: y = a * X^b
    let cumTotal = 0;
    for (let x = 1; x <= maxUnits; x++) {
      const cumAvg   = a * Math.pow(x, b);
      const cumTot   = cumAvg * x;
      const indivUnit = x === 1 ? cumTot : cumTot - rows[x - 2].cumTotal;
      rows.push({ x, cumAvg, cumTotal: cumTot, indivUnit });
    }
  } else {
    // Incremental unit-time model: y = a * X^b (time for Xth unit)
    let cumTotal = 0;
    for (let x = 1; x <= maxUnits; x++) {
      const indivUnit = a * Math.pow(x, b);
      cumTotal += indivUnit;
      const cumAvg = cumTotal / x;
      rows.push({ x, cumAvg, cumTotal, indivUnit });
    }
  }

  const modelLabel = model === 'cumavg'
    ? 'Cumulative Average-Time Learning Model'
    : 'Incremental Unit-Time Learning Model';

  // Identify doubling rows
  const doublings = new Set([1, 2, 4, 8, 16, 32]);

  const tableRows = rows.map(r => {
    const isDoubling = doublings.has(r.x);
    const totalCost  = r.cumTotal * laborRate;
    const addlCost   = r.x === 1 ? totalCost : (r.cumTotal - rows[r.x - 2].cumTotal) * laborRate;
    return '<tr class="' + (isDoubling ? 'lc-table__row--doubling' : '') + '">'
      + '<td>' + r.x + (isDoubling ? ' <span class="lc-doubling-badge">2x</span>' : '') + '</td>'
      + '<td>' + r.cumAvg.toFixed(2) + '</td>'
      + '<td>' + r.cumTotal.toFixed(2) + '</td>'
      + '<td>' + r.indivUnit.toFixed(2) + '</td>'
      + '<td>' + fmt(totalCost) + '</td>'
      + '</tr>';
  }).join('');

  const out = getOrCreate('t4-output', 'div', 'tool-output',
    document.getElementById('t4-output').parentElement);

  out.innerHTML = '<div class="ch10-lc-result">'
    + '<div class="ch10-lc-header">'
    + '<div class="ch10-lc-header__title">' + modelLabel + '</div>'
    + '<div class="ch10-lc-header__params">'
    + 'Learning rate: <strong>' + Math.round(rate * 100) + '%</strong>  |  '
    + 'b = ln(' + fmtN(rate) + ') / ln(2) = <strong>' + b.toFixed(4) + '</strong>  |  '
    + 'First unit: <strong>' + fmtN(a) + ' hrs</strong>'
    + '</div>'
    + '</div>'

    + '<div class="ch10-lc-table-wrap">'
    + '<table class="ch10-lc-table">'
    + '<thead><tr>'
    + '<th>Cumulative Units (X)</th>'
    + '<th>Avg Time/Unit (hrs)</th>'
    + '<th>Cumulative Total Time (hrs)</th>'
    + '<th>Individual Unit Time (hrs)</th>'
    + '<th>Cumulative Cost @ ' + fmt(laborRate) + '/hr</th>'
    + '</tr></thead>'
    + '<tbody>' + tableRows + '</tbody>'
    + '</table>'
    + '</div>'

    + '<div class="ch10-lc-insight">'
    + '<span class="lc-doubling-badge">2x</span> rows show where cumulative production doubles. '
    + 'At each doubling, ' + (model === 'cumavg' ? 'cumulative average time per unit' : 'time for the last unit')
    + ' falls to <strong>' + Math.round(rate * 100) + '%</strong> of the prior doubling value.'
    + '</div>'
    + '</div>';

  renderShowWork(document.getElementById('t4-show-work'), [
    { label: 'Learning Curve Formula', formula: 'y = a * X^b', values: 'a = ' + fmtN(a) + ' hrs, X = cumulative units', result: modelLabel },
    { label: 'Exponent b', formula: 'ln(learning rate) / ln(2)', values: 'ln(' + fmtN(rate) + ') / ln(2)', result: b.toFixed(6) },
    { label: 'At X = 1', formula: 'y = a * 1^b = a', values: fmtN(a) + ' hrs', result: fmtN(a) + ' hrs' },
    { label: 'At X = 2 (first doubling)', formula: 'y = a * 2^b', values: fmtN(a) + ' * 2^' + b.toFixed(4), result: (a * Math.pow(2, b)).toFixed(2) + ' hrs = ' + Math.round(rate * 100) + '% of ' + fmtN(a), highlight: true },
    { label: 'At X = 4 (second doubling)', formula: 'y = a * 4^b', values: fmtN(a) + ' * 4^' + b.toFixed(4), result: (a * Math.pow(4, b)).toFixed(2) + ' hrs', highlight: true },
    { label: 'Cumulative Cost at X = ' + maxUnits, formula: 'Cumulative Total Hours * Labor Rate', values: rows[maxUnits - 1].cumTotal.toFixed(2) + ' hrs * ' + fmt(laborRate), result: fmt(rows[maxUnits - 1].cumTotal * laborRate), highlight: true }
  ], { title: 'Learning Curve Calculation', defaultOpen: false });
}

function initTool4() {
  document.getElementById('t4-calculate').addEventListener('click', calcTool4);
  initRandomizer('t4-randomize', [
    { id: 't4-first-unit',    min: 50,  max: 500,  step: 50,  integer: true },
    { id: 't4-learning-rate', min: 70,  max: 95,   step: 5,   integer: true },
    { id: 't4-max-units',     min: 8,   max: 16,   step: 4,   integer: true },
    { id: 't4-labor-rate',    min: 20,  max: 100,  step: 10,  integer: true }
  ], calcTool4);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Data Problems Identifier
// ═══════════════════════════════════════════════════════════════════════════════

const DATA_PROBLEMS = [
  {
    scenario: 'A transport company tracks engine lubricant costs monthly. The lubricant is purchased in bulk and stored. Monthly records show large costs in purchase months and near-zero costs in other months.',
    problem: 'Time period mismatch',
    explanation: 'The cost recording period (purchase date) does not match the consumption period. Accrual accounting should be used to match lubricant costs consumed to the periods in which the trucks actually operated.'
  },
  {
    scenario: 'A factory allocates depreciation, insurance, and rent to products based on units produced. A manager uses the resulting per-unit cost as a variable cost in a pricing model.',
    problem: 'Fixed costs allocated as variable',
    explanation: 'Depreciation, insurance, and rent are fixed costs. Allocating them per unit makes them appear variable. The manager should separate fixed and variable components rather than treating allocated fixed cost per unit as truly variable.'
  },
  {
    scenario: 'A regression of marketing costs on units sold shows an unusually high cost in one month. Investigation reveals a data entry error -- a decimal point was misplaced.',
    problem: 'Extreme observation (outlier)',
    explanation: 'Errors in recording costs create extreme observations that distort the regression line. The observation should be corrected or excluded before estimating the cost function.'
  },
  {
    scenario: 'A company estimates overhead costs using data spanning a period when new automated equipment was installed mid-year, fundamentally changing the cost structure.',
    problem: 'Non-stationary relationship',
    explanation: 'The underlying relationship between the cost driver and costs changed when new technology was introduced. The analyst should split the data into two periods and estimate separate cost functions, one before and one after the technology change.'
  },
  {
    scenario: 'A cost pool combines health benefits and pension costs and uses number of employees as the cost driver. However, pension costs are driven by employee salary levels, not headcount.',
    problem: 'Non-homogeneous cost pool',
    explanation: 'Health benefits and pension costs have different cost drivers. They should be separated into two homogeneous cost pools: one driven by number of employees, one driven by salary levels.'
  },
  {
    scenario: 'A company estimates its cost function using data from a period of high inflation. The regression shows costs rising even when activity levels are unchanged.',
    problem: 'Inflation distortion',
    explanation: 'Inflation causes costs to rise independently of activity levels, distorting the estimated variable cost rate. Each cost observation should be deflated by a price index before estimating the cost function.'
  },
  {
    scenario: 'A small startup estimates its cost function using only 3 months of data, all from a single quarter when activity was unusually high due to a one-time product launch.',
    problem: 'Insufficient or unrepresentative data',
    explanation: 'Reliable cost estimation requires numerous observations spanning a wide range of the cost driver. Data from a single unusual period does not represent the normal relationship between the cost driver and costs.'
  }
];

function initTool5() {
  const container = document.getElementById('t5-scenarios');
  if (!container) return;

  container.innerHTML = '<p style="font-size:var(--font-size-sm);color:var(--color-gray-600);margin-bottom:var(--space-4);">Click each scenario card to reveal the data problem and explanation.</p>';

  DATA_PROBLEMS.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'ch10-dp-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');

    card.innerHTML = '<div class="ch10-dp-card__header">'
      + '<span class="ch10-dp-card__num">' + (i + 1) + '</span>'
      + '<div class="ch10-dp-card__scenario">' + item.scenario + '</div>'
      + '<span class="ch10-dp-card__toggle">&#9660;</span>'
      + '</div>'
      + '<div class="ch10-dp-card__answer" style="display:none;">'
      + '<div class="ch10-dp-card__problem">Data Problem: <strong>' + item.problem + '</strong></div>'
      + '<div class="ch10-dp-card__explanation">' + item.explanation + '</div>'
      + '</div>';

    const toggle = () => {
      const answer  = card.querySelector('.ch10-dp-card__answer');
      const chevron = card.querySelector('.ch10-dp-card__toggle');
      const open    = answer.style.display === 'none';
      answer.style.display = open ? 'block' : 'none';
      chevron.innerHTML    = open ? '&#9650;' : '&#9660;';
      card.setAttribute('aria-expanded', open);
      if (open) card.classList.add('ch10-dp-card--open');
      else card.classList.remove('ch10-dp-card--open');
    };

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    container.appendChild(card);
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ═══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Cost Function',              definition: 'A mathematical description of how a cost changes with changes in the level of an activity. General form: y = a + bX.' },
  { term: 'Linear Cost Function',       definition: 'A cost function in which the graph of total costs based on the level of a single activity is a straight line within the relevant range.' },
  { term: 'Slope Coefficient (b)',      definition: 'The amount by which total cost changes when a one-unit change occurs in the cost driver. Represents the variable cost per unit of activity.' },
  { term: 'Constant / Intercept (a)',   definition: 'The component of total cost that does not vary with changes in the level of the activity within the relevant range. The fixed cost component.' },
  { term: 'Mixed Cost',                 definition: 'A cost that has both fixed and variable elements. Also called a semivariable cost. Expressed as y = a + bX.' },
  { term: 'Cost Estimation',            definition: 'Measuring a cost relationship based on data from past costs and the related level of activity, used to predict future costs.' },
  { term: 'High-Low Method',            definition: 'The simplest quantitative method to estimate a cost function. Uses only the highest and lowest observed values of the cost driver to estimate slope and constant.' },
  { term: 'Regression Analysis',        definition: 'A statistical method that measures the average amount of change in the dependent variable associated with a unit change in one or more independent variables. Uses all observations.' },
  { term: 'Dependent Variable (y)',     definition: 'The cost to be predicted and managed in a cost function estimation. Plotted on the vertical (Y) axis.' },
  { term: 'Independent Variable (X)',   definition: 'The level of activity or cost driver used to predict the dependent variable. Plotted on the horizontal (X) axis.' },
  { term: 'Goodness of Fit (R^2)',      definition: 'The coefficient of determination. Measures the percentage of variation in Y explained by X. Ranges from 0 to 1; 0.30 or higher generally passes the test.' },
  { term: 'Residual Term',              definition: 'The vertical distance between an actual cost observation and the estimated regression line. Regression minimizes the sum of squared residuals.' },
  { term: 'Learning Curve',             definition: 'A function that measures how labor-hours per unit decline as units of production increase because workers become more efficient with experience.' },
  { term: 'Experience Curve',           definition: 'A broader application of the learning curve that extends to other business functions such as marketing, distribution, and customer service.' },
  { term: 'Cumulative Average-Time Learning Model', definition: 'Cumulative average time per unit declines by a constant percentage each time the cumulative quantity of units produced doubles.' },
  { term: 'Incremental Unit-Time Learning Model',   definition: 'The incremental time needed to produce the last unit declines by a constant percentage each time the cumulative quantity of units produced doubles.' },
  { term: 'Nonlinear Cost Function',    definition: 'A cost function for which the graph of total costs is not a straight line within the relevant range. Arises from quantity discounts, step functions, or learning effects.' },
  { term: 'Step Cost Function',         definition: 'A cost function in which cost remains the same over various ranges of activity but increases by discrete amounts as activity moves from one range to the next.' },
  { term: 'Account Analysis Method',    definition: 'Estimates cost functions by classifying cost accounts as variable, fixed, or mixed based on qualitative judgment about the identified level of activity.' },
  { term: 'Conference Method',          definition: 'Estimates cost functions based on analysis and opinions about costs and their drivers gathered from various departments of a company.' },
  { term: 'Industrial Engineering Method', definition: 'Estimates cost functions by analyzing the relationship between inputs and outputs in physical terms. Also called the work-measurement method.' },
  { term: 'Multicollinearity',          definition: 'Exists in multiple regression when two or more independent variables are highly correlated with each other, inflating standard errors of individual coefficients.' }
];

function initKeyTerms() {
  const grid = document.getElementById('key-terms-grid');
  if (!grid) return;
  KEY_TERMS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'key-term';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-expanded', 'false');
    div.innerHTML = '<div class="key-term__word">' + item.term + '</div>'
      + '<p class="key-term__definition">' + item.definition + '</p>';
    div.addEventListener('click', () => {
      const open = div.classList.toggle('key-term--open');
      div.setAttribute('aria-expanded', open);
    });
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); }
    });
    grid.appendChild(div);
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER COMPLETE
// ═══════════════════════════════════════════════════════════════════════════════

function injectResetButton(card) {
  if (document.getElementById('ch10-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch10-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch10');
    const markBtn = document.getElementById('mark-complete-btn');
    if (markBtn) {
      markBtn.textContent = 'Mark as Complete';
      markBtn.disabled = false;
      markBtn.classList.remove('btn--success');
    }
    resetBtn.remove();
  });
  card.appendChild(resetBtn);
}

function initChapterComplete() {
  const btn  = document.getElementById('mark-complete-btn');
  const card = document.getElementById('chapter-complete');
  if (!btn || !card) return;
  if (isChapterComplete('ch10')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch10');
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    injectResetButton(card);
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initTool1();
  initTool2();
  initTool3();
  initTool4();
  initTool5();
  initKeyTerms();
  initChapterComplete();
});
