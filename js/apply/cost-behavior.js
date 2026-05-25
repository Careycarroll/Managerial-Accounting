import { initHeader } from '/js/components/header.js';
import { renderShowWork } from '/js/components/show-work.js';

const fmt    = (n) => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmt2   = (n) => '$' + Math.abs(n).toFixed(2);
const fmtN   = (n) => Math.round(n).toLocaleString();
const fmtPct = (n) => (Math.round(n * 10) / 10).toFixed(1) + '%';

const el  = (id) => document.getElementById(id);
const val = (id) => { const n = el(id); return n ? parseFloat(n.value) || 0 : 0; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

// ── Depth toggle ──────────────────────────────────────────────────────────────

function initDepthToggle() {
  const buttons = document.querySelectorAll('.depth-btn');
  buttons.forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('depth-btn--active'));
      btn.classList.add('depth-btn--active');
      const depth = btn.dataset.depth;
      document.querySelectorAll('.depth-panel').forEach((p) => {
        p.classList.toggle('depth-panel--active', p.id === 'depth-' + depth);
      });
    });
  });
}

// ── Scenario card ─────────────────────────────────────────────────────────────

function initScenario() {
  const useBtn = el('scenario-use-btn');
  if (useBtn) {
    useBtn.addEventListener('click', () => {
      setVal('c-high-units',    8000);
      setVal('c-high-cost',     94000);
      setVal('c-low-units',     3000);
      setVal('c-low-cost',      64000);
      setVal('c-predict-units', 6500);
      el('scenario-card').style.display = 'none';
      calcConcept();
    });
  }
  const toggle = el('scenario-toggle');
  const body   = el('scenario-body');
  if (toggle && body) {
    toggle.addEventListener('click', () => {
      const open = body.style.display === 'none';
      body.style.display = open ? '' : 'none';
      toggle.textContent = open ? 'Hide scenario' : 'Show scenario';
    });
  }
}

// ── KPI tile helper ───────────────────────────────────────────────────────────

function kpi(label, value, sub, color) {
  return '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">' + label + '</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:' + color + ';">' + value + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' + sub + '</div>'
    + '</div>';
}

// ── Concept ───────────────────────────────────────────────────────────────────

function calcConcept() {
  const xHigh    = val('c-high-units');
  const yHigh    = val('c-high-cost');
  const xLow     = val('c-low-units');
  const yLow     = val('c-low-cost');
  const xPredict = val('c-predict-units');

  const deltaX = xHigh - xLow;
  const deltaY = yHigh - yLow;

  if (deltaX <= 0) {
    el('c-output').innerHTML = '<p style="color:var(--color-danger);margin-top:var(--space-4);">High activity must be greater than low activity.</p>';
    return;
  }

  const varRate  = deltaY / deltaX;
  const fixedCost = yHigh - varRate * xHigh;
  const predicted = fixedCost + varRate * xPredict;

  const varPct  = predicted > 0 ? (varRate * xPredict) / predicted : 0;
  const fixedPct = 1 - varPct;

  const costStructure = fixedPct > 0.7
    ? 'high fixed cost structure -- costs are relatively stable regardless of volume'
    : varPct > 0.7
      ? 'high variable cost structure -- costs move closely with activity'
      : 'mixed cost structure -- both fixed and variable components are significant';

  const out = el('c-output');
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + kpi('Variable Rate', fmt2(varRate), 'per unit of activity', 'var(--color-primary-text)')
    + kpi('Fixed Cost', fmt(fixedCost), 'per period', 'var(--color-primary-text)')
    + kpi('Predicted Cost', fmt(predicted), 'at ' + fmtN(xPredict) + ' units', 'var(--color-success)')
    + kpi('Variable %', fmtPct(varPct * 100), 'of predicted total', 'var(--color-primary-text)')
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-2);">Cost Equation</div>'
    + '<div style="font-family:var(--font-mono);font-size:var(--font-size-base);color:var(--color-accent);padding:var(--space-3);background:var(--color-gray-100);border-radius:var(--radius-sm);">'
    + 'Total Cost = ' + fmt(fixedCost) + ' + ' + fmt2(varRate) + ' &times; Activity'
    + '</div>'
    + '</div>'
    + '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:var(--color-info-bg);border:1px solid var(--color-info);margin-bottom:var(--space-4);">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:var(--color-primary-text);margin-bottom:var(--space-2);">Cost Structure Insight</div>'
    + '<p style="margin:0;font-size:var(--font-size-sm);">This operation has a <strong>' + costStructure + '</strong>. '
    + 'At <strong>' + fmtN(xPredict) + ' units</strong> of activity, estimated total cost is <strong>' + fmt(predicted) + '</strong> -- '
    + 'made up of <strong>' + fmt(fixedCost) + '</strong> fixed and <strong>' + fmt(varRate * xPredict) + '</strong> variable.</p>'
    + '</div>'
    + '</div>';

  renderShowWork(el('c-show-work'), [
    {
      label: 'Variable Cost Rate',
      formula: '(High Cost - Low Cost) / (High Activity - Low Activity)',
      values: '(' + fmt(yHigh) + ' - ' + fmt(yLow) + ') / (' + fmtN(xHigh) + ' - ' + fmtN(xLow) + ')',
      result: fmt2(varRate) + ' per unit',
      highlight: true,
    },
    {
      label: 'Fixed Cost Component',
      formula: 'High Cost - (Variable Rate x High Activity)',
      values: fmt(yHigh) + ' - (' + fmt2(varRate) + ' x ' + fmtN(xHigh) + ')',
      result: fmt(fixedCost),
      highlight: true,
    },
    {
      label: 'Predicted Total Cost',
      formula: 'Fixed Cost + (Variable Rate x Predicted Activity)',
      values: fmt(fixedCost) + ' + (' + fmt2(varRate) + ' x ' + fmtN(xPredict) + ')',
      result: fmt(predicted),
      highlight: true,
    },
  ], { title: 'High-Low Method Show Work', defaultOpen: false });
}

// ── Regression helpers ────────────────────────────────────────────────────────

function simpleRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  const denom = sumX2 - n * meanX * meanX;
  if (Math.abs(denom) < 1e-10) return null;

  const slope     = (sumXY - n * meanX * meanY) / denom;
  const intercept = meanY - slope * meanX;

  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (intercept + slope * p.x), 2), 0);
  const r2    = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  return { slope, intercept, r2 };
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const xs = [1,2,3,4,5,6].map(i => val('a-x' + i));
  const ys = [1,2,3,4,5,6].map(i => val('a-y' + i));

  const points = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.x > 0 && p.y > 0);

  if (points.length < 2) {
    el('a-output').innerHTML = '<p style="color:var(--color-danger);margin-top:var(--space-4);">Enter at least two valid data points.</p>';
    return;
  }

  const xPredict    = val('a-predict');
  const learnRate   = val('a-learn-rate') / 100;
  const learnInit   = val('a-learn-initial');
  const learnUnits  = val('a-learn-units');

  // High-low
  const sorted  = [...points].sort((a, b) => a.x - b.x);
  const low     = sorted[0];
  const high    = sorted[sorted.length - 1];
  const hlSlope = (high.y - low.y) / (high.x - low.x);
  const hlInt   = high.y - hlSlope * high.x;
  const hlPred  = hlInt + hlSlope * xPredict;

  // Regression
  const reg     = simpleRegression(points);
  const regPred = reg ? reg.intercept + reg.slope * xPredict : 0;

  // Learning curve: cumulative average time model
  // avg cost at N units = initial x N^(log(rate)/log(2))
  const b           = Math.log(learnRate) / Math.log(2);
  const avgCostAtN  = learnInit * Math.pow(learnUnits, b);
  const totalCostN  = avgCostAtN * learnUnits;
  const marginalN   = learnUnits > 1
    ? totalCostN - learnInit * Math.pow(learnUnits - 1, b) * (learnUnits - 1)
    : learnInit;

  const r2Label = reg
    ? (reg.r2 > 0.95 ? 'Excellent fit' : reg.r2 > 0.85 ? 'Good fit' : reg.r2 > 0.70 ? 'Moderate fit' : 'Poor fit')
    : 'N/A';
  const r2Color = reg
    ? (reg.r2 > 0.95 ? 'var(--color-success)' : reg.r2 > 0.85 ? 'var(--color-success)' : reg.r2 > 0.70 ? 'var(--color-warning)' : 'var(--color-danger)')
    : 'var(--color-gray-400)';

  const betterMethod = reg && Math.abs(reg.r2) > 0.85 ? 'regression' : 'high-low';

  const out = el('a-output');
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">'

    // Data points table
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Observations Used</h4>'
    + '<div style="overflow-x:auto;margin-bottom:var(--space-5);">'
    + '<table class="ch12-result-table" style="width:100%;">'
    + '<thead><tr><th>Month</th><th>Activity</th><th>Actual Cost</th><th>High-Low Fit</th><th>Regression Fit</th><th>Residual (Reg)</th></tr></thead>'
    + '<tbody>'
    + points.map((p, i) => {
        const hlFit  = hlInt + hlSlope * p.x;
        const regFit = reg ? reg.intercept + reg.slope * p.x : 0;
        const resid  = reg ? p.y - regFit : 0;
        return '<tr><td>Month ' + (i + 1) + '</td><td>' + fmtN(p.x) + '</td><td>' + fmt(p.y) + '</td><td>' + fmt(hlFit) + '</td><td>' + (reg ? fmt(regFit) : '--') + '</td><td style="color:' + (Math.abs(resid) < 2000 ? 'var(--color-success)' : 'var(--color-warning)') + ';">' + (reg ? fmt(resid) : '--') + '</td></tr>';
      }).join('')
    + '</tbody></table></div>'

    // Comparison
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Method Comparison at ' + fmtN(xPredict) + ' Units</h4>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">High-Low Method</div>'
    + '<div style="font-family:var(--font-mono);font-size:var(--font-size-xs);color:var(--color-accent);padding:var(--space-2);background:var(--color-gray-100);border-radius:var(--radius-sm);margin-bottom:var(--space-3);">TC = ' + fmt(hlInt) + ' + ' + fmt2(hlSlope) + 'x</div>'
    + '<div style="font-size:var(--font-size-xl);font-weight:800;color:var(--color-primary-text);">' + fmt(hlPred) + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-top:var(--space-1);">Uses only 2 data points</div>'
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Regression Analysis</div>'
    + (reg
        ? '<div style="font-family:var(--font-mono);font-size:var(--font-size-xs);color:var(--color-accent);padding:var(--space-2);background:var(--color-gray-100);border-radius:var(--radius-sm);margin-bottom:var(--space-3);">TC = ' + fmt(reg.intercept) + ' + ' + fmt2(reg.slope) + 'x</div>'
          + '<div style="font-size:var(--font-size-xl);font-weight:800;color:var(--color-primary-text);">' + fmt(regPred) + '</div>'
          + '<div style="font-size:var(--font-size-xs);margin-top:var(--space-1);">R&sup2; = <strong style="color:' + r2Color + ';">' + (reg.r2 * 100).toFixed(1) + '%</strong> &mdash; ' + r2Label + '</div>'
        : '<div style="color:var(--color-gray-400);font-size:var(--font-size-sm);">Insufficient data</div>')
    + '</div>'
    + '</div>'

    // Learning curve
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Learning Curve (' + fmtPct(learnRate * 100) + ' Rate)</h4>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + kpi('Avg Cost at ' + fmtN(learnUnits) + ' Units', fmt(avgCostAtN), 'cumulative avg unit cost', 'var(--color-primary-text)')
    + kpi('Total Cumulative Cost', fmt(totalCostN), 'all units combined', 'var(--color-primary-text)')
    + kpi('Marginal Unit Cost', fmt(marginalN), 'cost of last unit', 'var(--color-success)')
    + kpi('Reduction from Unit 1', fmtPct((1 - avgCostAtN / learnInit) * 100), 'vs initial unit cost', 'var(--color-success)')
    + '</div>'

    // Verdict
    + '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:var(--color-info-bg);border:1px solid var(--color-info);margin-bottom:var(--space-4);">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:var(--color-primary-text);margin-bottom:var(--space-2);">'
    + (betterMethod === 'regression' ? 'Use regression -- R\u00B2 confirms a reliable cost relationship' : 'High-low is adequate -- more data points would improve confidence')
    + '</div>'
    + '<p style="margin:0;font-size:var(--font-size-sm);">'
    + (reg
        ? 'Regression uses all <strong>' + points.length + ' observations</strong> and explains <strong>' + (reg.r2 * 100).toFixed(1) + '%</strong> of cost variation (R&sup2;). '
          + 'At <strong>' + fmtN(xPredict) + '</strong> units, regression predicts <strong>' + fmt(regPred) + '</strong> vs high-low estimate of <strong>' + fmt(hlPred) + '</strong> -- a difference of <strong>' + fmt(Math.abs(regPred - hlPred)) + '</strong>. '
          + (betterMethod === 'regression' ? 'The regression estimate is more reliable because it incorporates all available data.' : 'With limited data, both methods give similar results.')
        : 'Enter more data points to enable regression analysis.')
    + '</p>'
    + '</div>'
    + '</div>';

  renderShowWork(el('a-show-work'), [
    {
      label: 'High-Low Variable Rate',
      formula: '(High Cost - Low Cost) / (High Activity - Low Activity)',
      values: '(' + fmt(high.y) + ' - ' + fmt(low.y) + ') / (' + fmtN(high.x) + ' - ' + fmtN(low.x) + ')',
      result: fmt2(hlSlope) + ' per unit',
      highlight: true,
    },
    {
      label: 'High-Low Fixed Cost',
      formula: 'High Cost - (Variable Rate x High Activity)',
      values: fmt(high.y) + ' - (' + fmt2(hlSlope) + ' x ' + fmtN(high.x) + ')',
      result: fmt(hlInt),
    },
    {
      label: 'High-Low Prediction',
      formula: 'Fixed + Variable Rate x Predicted Activity',
      values: fmt(hlInt) + ' + ' + fmt2(hlSlope) + ' x ' + fmtN(xPredict),
      result: fmt(hlPred),
      highlight: true,
    },
    ...(reg ? [
      {
        label: 'Regression Slope (b)',
        formula: 'Sum(xy) - n*xBar*yBar / Sum(x^2) - n*xBar^2',
        values: 'Computed across ' + points.length + ' observations',
        result: fmt2(reg.slope) + ' per unit',
      },
      {
        label: 'Regression Intercept (a)',
        formula: 'yBar - b * xBar',
        values: 'Mean cost - slope x mean activity',
        result: fmt(reg.intercept),
      },
      {
        label: 'R\u00B2 Goodness of Fit',
        formula: '1 - SS_residual / SS_total',
        values: 'Measures how well the line fits the data',
        result: (reg.r2 * 100).toFixed(1) + '%',
        highlight: true,
      },
      {
        label: 'Regression Prediction',
        formula: 'Intercept + Slope x Predicted Activity',
        values: fmt(reg.intercept) + ' + ' + fmt2(reg.slope) + ' x ' + fmtN(xPredict),
        result: fmt(regPred),
        highlight: true,
      },
    ] : []),
    {
      label: 'Learning Curve Exponent (b)',
      formula: 'log(learning rate) / log(2)',
      values: 'log(' + fmtPct(learnRate * 100) + ') / log(2)',
      result: b.toFixed(4),
    },
    {
      label: 'Avg Unit Cost at ' + fmtN(learnUnits) + ' Units',
      formula: 'Initial Cost x Cumulative Units^b',
      values: fmt(learnInit) + ' x ' + learnUnits + '^' + b.toFixed(4),
      result: fmt(avgCostAtN),
      highlight: true,
    },
  ], { title: 'Cost Analysis Show Work', defaultOpen: false });
}

// ── Randomizers ───────────────────────────────────────────────────────────────

function randHighFixed() {
  const fixed = Math.round((40000 + Math.random() * 60000) / 1000) * 1000;
  const varR  = Math.round((1 + Math.random() * 3) * 2) / 2;
  const xH    = Math.round((7000 + Math.random() * 5000) / 500) * 500;
  const xL    = Math.round((1000 + Math.random() * 2000) / 500) * 500;
  setVal('c-high-units',    xH);
  setVal('c-high-cost',     Math.round(fixed + varR * xH));
  setVal('c-low-units',     xL);
  setVal('c-low-cost',      Math.round(fixed + varR * xL));
  setVal('c-predict-units', Math.round((xL + xH) / 2 / 500) * 500);
  calcConcept();
}

function randHighVariable() {
  const fixed = Math.round((5000 + Math.random() * 10000) / 1000) * 1000;
  const varR  = Math.round((8 + Math.random() * 12) * 2) / 2;
  const xH    = Math.round((7000 + Math.random() * 5000) / 500) * 500;
  const xL    = Math.round((1000 + Math.random() * 2000) / 500) * 500;
  setVal('c-high-units',    xH);
  setVal('c-high-cost',     Math.round(fixed + varR * xH));
  setVal('c-low-units',     xL);
  setVal('c-low-cost',      Math.round(fixed + varR * xL));
  setVal('c-predict-units', Math.round((xL + xH) / 2 / 500) * 500);
  calcConcept();
}

function randMixed() {
  const fixed = Math.round((20000 + Math.random() * 30000) / 1000) * 1000;
  const varR  = Math.round((4 + Math.random() * 6) * 2) / 2;
  const xH    = Math.round((7000 + Math.random() * 5000) / 500) * 500;
  const xL    = Math.round((1000 + Math.random() * 2000) / 500) * 500;
  setVal('c-high-units',    xH);
  setVal('c-high-cost',     Math.round(fixed + varR * xH));
  setVal('c-low-units',     xL);
  setVal('c-low-cost',      Math.round(fixed + varR * xL));
  setVal('c-predict-units', Math.round((xL + xH) / 2 / 500) * 500);
  calcConcept();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();
  initScenario();

  el('c-calculate')      && el('c-calculate').addEventListener('click', calcConcept);
  el('a-calculate')      && el('a-calculate').addEventListener('click', calcAnalysis);
  el('c-rand-high-fixed')    && el('c-rand-high-fixed').addEventListener('click', randHighFixed);
  el('c-rand-high-variable') && el('c-rand-high-variable').addEventListener('click', randHighVariable);
  el('c-rand-mixed')         && el('c-rand-mixed').addEventListener('click', randMixed);
});
