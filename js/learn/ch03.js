/**
 * ch03.js — Chapter 3: Cost-Volume-Profit Analysis
 * Tools: CVP Dashboard, CVP Graph, Sensitivity Analysis, Sales Mix CVP
 */
import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { CVPChart } from '/js/charts/cvp-chart.js';
import { initRandomizer } from '/js/components/randomizer.js';

// ── Data ──────────────────────────────────────────────────────

const KEY_TERMS = [
  { term: 'Cost-Volume-Profit (CVP) Analysis', definition: 'A tool managers use to study the behavior of and relationship among total revenues, total costs, and operating income as changes occur in units sold, selling price, variable cost per unit, or fixed costs.' },
  { term: 'Contribution Margin', definition: 'The difference between total revenues and total variable costs. Contribution margin = Total revenues - Total variable costs.' },
  { term: 'Contribution Margin per Unit', definition: 'Selling price minus variable cost per unit. Represents how much each unit sold contributes toward covering fixed costs and then generating profit.' },
  { term: 'Contribution Margin Percentage', definition: 'Also called contribution margin ratio. Contribution margin divided by revenues. Represents the contribution margin per dollar of revenue.' },
  { term: 'Contribution Income Statement', definition: 'An income statement that groups costs into variable costs and fixed costs to highlight contribution margin. Format: Revenue - Variable Costs = CM - Fixed Costs = Operating Income.' },
  { term: 'Breakeven Point (BEP)', definition: 'The quantity of output sold at which total revenues equal total costs — the quantity that results in $0 operating income. BEP (units) = Fixed Costs / Contribution Margin per Unit.' },
  { term: 'Target Operating Income', definition: 'The desired level of operating income used to determine the required sales volume. Units required = (Fixed Costs + Target Operating Income) / CM per Unit.' },
  { term: 'Net Income', definition: 'Operating income minus income taxes. When income taxes are present, convert target net income to target operating income: Target OI = Target Net Income / (1 - Tax Rate).' },
  { term: 'Sensitivity Analysis', definition: 'A "what if" technique that examines how an outcome changes if original predicted data are not achieved or if an underlying assumption changes.' },
  { term: 'Margin of Safety', definition: 'Budgeted (or actual) revenues minus breakeven revenues. Indicates how far revenues can fall before a loss occurs. Often expressed as a percentage of budgeted revenues.' },
  { term: 'Operating Leverage', definition: 'The effect that fixed costs have on changes in operating income as changes occur in units sold. Degree of operating leverage = Contribution Margin / Operating Income.' },
  { term: 'Sales Mix', definition: 'The quantities or proportions of various products that constitute a company\'s total unit sales. Breakeven in a multi-product company depends on the assumed sales mix.' },
  { term: 'Revenue Driver', definition: 'A variable, such as number of units sold, that causally affects revenues. Analogous to a cost driver for costs.' },
  { term: 'PV Graph', definition: 'Profit-volume graph. Shows how changes in the quantity of units sold affect operating income directly. The PV line starts at -Fixed Costs at zero units and crosses zero at the breakeven point.' },
  { term: 'Gross Margin vs. Contribution Margin', definition: 'Gross margin = Revenues - Cost of Goods Sold (includes fixed manufacturing costs). Contribution margin = Revenues - All Variable Costs. They differ by fixed manufacturing costs and variable non-manufacturing costs.' },
];

// ── Shared State ──────────────────────────────────────────────

let cvpChart = null;

function getInputs() {
  const v = id => parseFloat(document.getElementById(id)?.value) || 0;
  return {
    price:    v('cvp-price'),
    vc:       v('cvp-vc'),
    fc:       v('cvp-fc'),
    target:   v('cvp-target'),
    tax:      v('cvp-tax') / 100,
    budgeted: v('cvp-budgeted'),
    maxUnits: parseFloat(document.getElementById('cvp-max-units')?.value) || 60,
  };
}

function fmt(n)    { return '$' + Math.round(n).toLocaleString(); }
function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }

// ── Tool 1: CVP Dashboard ─────────────────────────────────────

function calcCVP(price, vc, fc, target, tax, budgeted) {
  const cm       = price - vc;
  const cmPct    = price > 0 ? cm / price : 0;
  const bepUnits = cm > 0 ? fc / cm : Infinity;
  const bepRev   = bepUnits * price;

  let targetOI = target;
  if (tax > 0 && tax < 1) targetOI = target / (1 - tax);
  const targetUnits = cm > 0 ? Math.ceil((fc + targetOI) / cm) : Infinity;

  const mosUnits = budgeted - bepUnits;
  const mosPct   = budgeted > 0 ? mosUnits / budgeted : 0;

  const opIncome = cm * budgeted - fc;

  return { cm, cmPct, bepUnits, bepRev, targetUnits, mosUnits, mosPct, opIncome, targetOI };
}

function updateDashboard() {
  const { price, vc, fc, target, tax, budgeted, maxUnits } = getInputs();
  const r = calcCVP(price, vc, fc, target, tax, budgeted);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('cvp-out-cm-unit',     fmt(r.cm));
  set('cvp-out-cm-pct',      fmtPct(r.cmPct));
  set('cvp-out-bep-units',   isFinite(r.bepUnits) ? Math.ceil(r.bepUnits).toLocaleString() : '∞');
  set('cvp-out-bep-rev',     isFinite(r.bepRev)   ? fmt(r.bepRev)   : '∞');
  set('cvp-out-target-units',isFinite(r.targetUnits) ? r.targetUnits.toLocaleString() : '∞');
  set('cvp-out-mos',         isFinite(r.mosPct) ? fmtPct(r.mosPct) : '—');

  renderIncomeStatement(price, vc, fc, budgeted, r);
  updateSensitivity();

  if (cvpChart) {
    cvpChart.update({
      sellingPrice: price,
      variableCost: vc,
      fixedCosts:   fc,
      maxUnits:     maxUnits,
      currentUnits: budgeted,
    });
  }
}

function renderIncomeStatement(price, vc, fc, units, r) {
  const body = document.getElementById('cvp-is-body');
  if (!body) return;
  const rev    = price * units;
  const totVC  = vc * units;
  const cm     = r.cm * units;
  const oi     = cm - fc;

  body.innerHTML = `
    <div class="is-row"><span>Revenues (${units.toLocaleString()} × ${fmt(price)})</span><span>${fmt(rev)}</span></div>
    <div class="is-row is-row--indent"><span>Variable Costs (${units.toLocaleString()} × ${fmt(vc)})</span><span>(${fmt(totVC)})</span></div>
    <div class="is-row is-row--subtotal"><span>Contribution Margin</span><span>${fmt(cm)}</span></div>
    <div class="is-row is-row--indent"><span>Fixed Costs</span><span>(${fmt(fc)})</span></div>
    <div class="is-row is-row--total ${oi >= 0 ? 'is-row--profit' : 'is-row--loss'}">
      <span>Operating Income</span><span>${fmt(oi)}</span>
    </div>
  `;
}

function initDashboard() {
  ['cvp-price','cvp-vc','cvp-fc','cvp-target','cvp-tax','cvp-budgeted','cvp-max-units'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateDashboard);
  });
  updateDashboard();
}

// ── Tool 2: CVP Chart ─────────────────────────────────────────

function initCVPChart() {
  const canvas = document.getElementById('cvp-canvas');
  if (!canvas) return;
  const { price, vc, fc, budgeted, maxUnits } = getInputs();
  cvpChart = new CVPChart(canvas, {
    sellingPrice: price,
    variableCost: vc,
    fixedCosts:   fc,
    maxUnits:     maxUnits,
    currentUnits: budgeted,
  });
}

// ── Tool 3: Sensitivity Analysis ──────────────────────────────

function updateSensitivity() {
  const { price, vc, fc, budgeted } = getInputs();
  const tbody   = document.getElementById('sensitivity-tbody');
  const baseEl  = document.getElementById('sens-base-values');
  const insight = document.getElementById('sensitivity-insight');
  if (!tbody) return;

  if (baseEl) {
    baseEl.innerHTML = `
      <span>Price: <strong>${fmt(price)}</strong></span>
      <span>VC/Unit: <strong>${fmt(vc)}</strong></span>
      <span>Fixed Costs: <strong>${fmt(fc)}</strong></span>
      <span>Budgeted Units: <strong>${budgeted.toLocaleString()}</strong></span>
    `;
  }

  const scenarios = [
    { label: 'Base Case',          fc: fc,          vc: vc,          tag: 'base' },
    { label: 'Fixed Costs +20%',   fc: fc * 1.20,   vc: vc,          tag: 'warn' },
    { label: 'Fixed Costs -20%',   fc: fc * 0.80,   vc: vc,          tag: 'good' },
    { label: 'Variable Cost +20%', fc: fc,          vc: vc * 1.20,   tag: 'warn' },
    { label: 'Variable Cost -20%', fc: fc,          vc: vc * 0.80,   tag: 'good' },
    { label: 'Both Costs +20%',    fc: fc * 1.20,   vc: vc * 1.20,   tag: 'bad'  },
    { label: 'Both Costs -20%',    fc: fc * 0.80,   vc: vc * 0.80,   tag: 'best' },
  ];

  tbody.innerHTML = '';
  scenarios.forEach(s => {
    const cm    = price - s.vc;
    const bepU  = cm > 0 ? Math.ceil(s.fc / cm) : Infinity;
    const bepR  = isFinite(bepU) ? bepU * price : Infinity;
    const oi    = cm * budgeted - s.fc;
    const tr    = document.createElement('tr');
    if (s.tag === 'base') tr.style.fontWeight = '600';
    if (s.tag === 'bad' || s.tag === 'warn') tr.style.color = 'var(--color-danger)';
    if (s.tag === 'good' || s.tag === 'best') tr.style.color = 'var(--color-success)';
    tr.innerHTML = `
      <td>${s.label}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(s.fc)}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(s.vc)}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${isFinite(bepU) ? bepU.toLocaleString() : '∞'}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${isFinite(bepR) ? fmt(bepR) : '∞'}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(oi)}</td>
    `;
    tbody.appendChild(tr);
  });

  if (insight) {
    const baseBEP  = price - vc > 0 ? Math.ceil(fc / (price - vc)) : 0;
    const highBEP  = price - vc * 1.2 > 0 ? Math.ceil(fc * 1.2 / (price - vc * 1.2)) : 0;
    insight.innerHTML = `<strong>Key insight:</strong> A 20% increase in both costs raises the breakeven point from 
      <strong>${baseBEP.toLocaleString()} units</strong> to 
      <strong>${highBEP.toLocaleString()} units</strong> — 
      a ${baseBEP > 0 ? Math.round(((highBEP - baseBEP) / baseBEP) * 100) : '—'}% increase. 
      This is why managers monitor cost structure changes closely.`;
  }
}

// ── Tool 4: Sales Mix CVP ─────────────────────────────────────

function initSalesMix() {
  const btn = document.getElementById('sm-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcSalesMix);
}

function calcSalesMix() {
  const gv  = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gs  = id => document.getElementById(id)?.value || '';

  const aName  = gs('sm-a-name') || 'Product A';
  const bName  = gs('sm-b-name') || 'Product B';
  const aPrice = gv('sm-a-price');
  const aVC    = gv('sm-a-vc');
  const aMix   = gv('sm-a-mix');
  const bPrice = gv('sm-b-price');
  const bVC    = gv('sm-b-vc');
  const bMix   = gv('sm-b-mix');
  const fc     = gv('sm-fc');

  const aCM        = aPrice - aVC;
  const bCM        = bPrice - bVC;
  const bundleCM   = aCM * aMix + bCM * bMix;
  const bundleRev  = aPrice * aMix + bPrice * bMix;
  const bundleCMPct= bundleRev > 0 ? bundleCM / bundleRev : 0;

  if (bundleCM <= 0) {
    document.getElementById('salesmix-results').hidden = false;
    document.getElementById('salesmix-results-grid').innerHTML =
      '<p style="color:var(--color-danger)">Bundle contribution margin is zero or negative — no breakeven exists.</p>';
    return;
  }

  const bepBundles = Math.ceil(fc / bundleCM);
  const bepUnitsA  = bepBundles * aMix;
  const bepUnitsB  = bepBundles * bMix;
  const bepRevA    = bepUnitsA * aPrice;
  const bepRevB    = bepUnitsB * bPrice;
  const bepRevTotal= bepRevA + bepRevB;

  const resultsGrid = document.getElementById('salesmix-results-grid');
  resultsGrid.innerHTML = `
    <div class="sm-result-card">
      <div class="sm-result-card__label">CM per Bundle</div>
      <div class="sm-result-card__value">${fmt(bundleCM)}</div>
    </div>
    <div class="sm-result-card">
      <div class="sm-result-card__label">Bundle CM%</div>
      <div class="sm-result-card__value">${fmtPct(bundleCMPct)}</div>
    </div>
    <div class="sm-result-card sm-result-card--highlight">
      <div class="sm-result-card__label">Breakeven Bundles</div>
      <div class="sm-result-card__value">${bepBundles.toLocaleString()}</div>
    </div>
    <div class="sm-result-card sm-result-card--highlight">
      <div class="sm-result-card__label">Breakeven Revenue</div>
      <div class="sm-result-card__value">${fmt(bepRevTotal)}</div>
    </div>
  `;

  const breakdown = document.getElementById('salesmix-breakdown');
  breakdown.innerHTML = `
    <h4 style="margin-bottom:var(--space-4);font-size:var(--font-size-sm);font-weight:700;">Breakeven by Product</h4>
    <table class="data-table">
      <thead><tr><th>Product</th><th>CM/Unit</th><th>Units in Bundle</th><th>BEP Units</th><th>BEP Revenue</th></tr></thead>
      <tbody>
        <tr>
          <td>${aName}</td>
          <td style="text-align:right">${fmt(aCM)}</td>
          <td style="text-align:right">${aMix}</td>
          <td style="text-align:right">${bepUnitsA.toLocaleString()}</td>
          <td style="text-align:right">${fmt(bepRevA)}</td>
        </tr>
        <tr>
          <td>${bName}</td>
          <td style="text-align:right">${fmt(bCM)}</td>
          <td style="text-align:right">${bMix}</td>
          <td style="text-align:right">${bepUnitsB.toLocaleString()}</td>
          <td style="text-align:right">${fmt(bepRevB)}</td>
        </tr>
        <tr style="font-weight:700;border-top:2px solid var(--color-border)">
          <td>Total</td>
          <td></td>
          <td style="text-align:right">${(aMix + bMix)}</td>
          <td style="text-align:right">${(bepUnitsA + bepUnitsB).toLocaleString()}</td>
          <td style="text-align:right">${fmt(bepRevTotal)}</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:var(--space-4);font-size:var(--font-size-xs);color:var(--color-text-muted);">
      Assumes sales mix of ${aMix} units of ${aName} for every ${bMix} units of ${bName} remains constant at all volume levels.
    </p>
  `;

  document.getElementById('salesmix-results').hidden = false;
}

// ── Key Terms ─────────────────────────────────────────────────

function initKeyTerms() {
  const grid = document.getElementById('key-terms-grid');
  if (!grid) return;
  KEY_TERMS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'key-term';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-expanded', 'false');
    div.innerHTML = `<div class="key-term__word">${item.term}</div><p class="key-term__definition">${item.definition}</p>`;
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

// ── Chapter Complete ──────────────────────────────────────────

function initChapterComplete() {
  const btn       = document.getElementById('mark-complete-btn');
  const statusEl  = document.getElementById('ch03-status');
  const actionsEl = btn?.closest('.chapter-complete__actions');

  if (isChapterComplete('ch03')) setCompleteUI();
  btn?.addEventListener('click', () => { markChapterComplete('ch03'); setCompleteUI(); });

  function setCompleteUI() {
    if (statusEl) { statusEl.textContent = '✓ Completed'; statusEl.classList.add('chapter-hero__progress-label--complete'); }
    if (btn)      { btn.textContent = '✓ Completed'; btn.disabled = true; }
    if (actionsEl && !actionsEl.querySelector('.reset-chapter-btn')) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn--ghost-danger reset-chapter-btn';
      resetBtn.textContent = 'Reset Chapter';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset Chapter 3? This will clear your completion status and reload the page.')) {
          resetChapter('ch03');
          window.location.reload();
        }
      });
      actionsEl.appendChild(resetBtn);
    }
  }
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initCVPChart();
  initDashboard();
  initRandomizer('cvp-randomize-btn', [
    { id: 'cvp-price',    min: 50,   max: 500,   step: 5,   integer: true },
    { id: 'cvp-vc',       min: 10,   max: 400,   step: 5,   integer: true, constraint: 'lessThan:cvp-price' },
    { id: 'cvp-fc',       min: 1000, max: 50000, step: 500, integer: true },
    { id: 'cvp-target',   min: 500,  max: 20000, step: 500, integer: true },
    { id: 'cvp-tax',      min: 0,    max: 40,    step: 5,   integer: true },
    { id: 'cvp-budgeted', min: 10,   max: 200,   step: 5,   integer: true },
  ]);
  initSalesMix();
  initRandomizer('sm-randomize-btn', [
    { id: 'sm-a-price', min: 50,   max: 500,   step: 5,   integer: true },
    { id: 'sm-a-vc',    min: 10,   max: 400,   step: 5,   integer: true, constraint: 'lessThan:sm-a-price' },
    { id: 'sm-a-mix',   min: 1,    max: 10,    step: 1,   integer: true },
    { id: 'sm-b-price', min: 50,   max: 500,   step: 5,   integer: true },
    { id: 'sm-b-vc',    min: 10,   max: 400,   step: 5,   integer: true, constraint: 'lessThan:sm-b-price' },
    { id: 'sm-b-mix',   min: 1,    max: 10,    step: 1,   integer: true },
    { id: 'sm-fc',      min: 1000, max: 50000, step: 500, integer: true },
  ], () => document.getElementById('sm-calculate').click());
  initKeyTerms();
  initChapterComplete();
});
