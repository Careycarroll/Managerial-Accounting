import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initHeader } from '/js/components/header.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtD   = n => n >= 0 ? fmt(n) : '(' + fmt(n) + ')';
const fmtS   = n => n >= 0 ? '+' + fmt(n) : '-' + fmt(Math.abs(n));
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (n * 100).toFixed(1) + '%';
const fmt1   = n => (Math.round(n * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

function getOrCreate(id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement(tag || 'div');
    node.id = id;
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
  }
  return node;
}

const el = id => document.getElementById(id);
const val = id => {
  const node = el(id);
  return node ? (parseFloat(node.value) || 0) : 0;
};
function setVal(id, value) {
  const node = el(id);
  if (node) node.value = value;
}

function resultClass(n) {
  return n >= 0 ? 'variance-fav' : 'variance-unfav';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Pricing Context Identifier
// ══════════════════════════════════════════════════════════════════════════════

const PRICING_SCENARIOS = [
  {
    text: 'A hotel has 40 empty rooms tonight. A tour operator offers $95 per room for the remaining rooms. Normal price is $170, but housekeeping and breakfast cost only $28 per occupied room.',
    answer: 'short-run',
    why: 'The rooms expire tonight and fixed costs are already committed. The relevant question is whether incremental revenue exceeds incremental cost.'
  },
  {
    text: 'A manufacturer is launching a new medical device and must set a list price for the next five years. The price must recover R&D, design, production, distribution, and customer-support costs.',
    answer: 'long-run',
    why: 'The decision affects multiple periods and must recover all value-chain costs plus a return on investment.'
  },
  {
    text: 'A printer has idle capacity this weekend. A customer requests a one-time rush job that will not affect regular customers or future pricing expectations.',
    answer: 'short-run',
    why: 'A one-time order with idle capacity is a short-run decision. Fixed costs that do not change are irrelevant.'
  },
  {
    text: 'A software company is deciding subscription pricing for a new platform after estimating ongoing cloud support, product updates, sales commissions, and target return on invested capital.',
    answer: 'long-run',
    why: 'The price must cover recurring and committed costs over the product life cycle. That is a long-run pricing decision.'
  },
  {
    text: 'An airline is considering whether to sell empty seats on a flight leaving in four hours through a discount app.',
    answer: 'short-run',
    why: 'Unused seat capacity perishes when the flight departs. The focus is incremental revenue versus incremental passenger costs.'
  },
  {
    text: 'A furniture maker is redesigning a product line and setting prices for next year based on manufacturing, marketing, delivery, warranty, and customer service costs.',
    answer: 'long-run',
    why: 'The price must support a sustainable product line and recover costs across the value chain.'
  },
  {
    text: 'A stadium concession vendor has unsold food with two hours left in an event and considers discounting it before it spoils.',
    answer: 'short-run',
    why: 'The cost of food already prepared is largely sunk. Discounting may be sensible if it generates contribution before spoilage.'
  },
  {
    text: 'An equipment manufacturer negotiates a three-year contract that requires dedicated engineering support, spare-parts stocking, and field-service capacity.',
    answer: 'long-run',
    why: 'Dedicated capacity and support resources are committed over several years. The price must recover those long-run costs.'
  }
];

let pcIndex = -1;
let pcCorrect = 0;
let pcTotal = 0;
let pcUsed = [];

function initPricingContext() {
  const nextBtn = el('pc-next-btn');
  const resetBtn = el('pc-reset-btn');
  if (!nextBtn) return;
  nextBtn.addEventListener('click', showNextPricingScenario);
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      pcIndex = -1;
      pcCorrect = 0;
      pcTotal = 0;
      pcUsed = [];
      const area = el('pc-scenario-area');
      const results = el('pc-results-area');
      if (area) area.innerHTML = '';
      if (results) results.innerHTML = '';
      showNextPricingScenario();
    });
  }
}

function showNextPricingScenario() {
  const area = el('pc-scenario-area');
  if (!area) return;
  const available = PRICING_SCENARIOS.map((_, i) => i).filter(i => !pcUsed.includes(i));
  if (available.length === 0) {
    area.innerHTML = '<div class="card" style="margin-top:var(--space-4);"><p class="result-highlight">All scenarios completed.</p></div>';
    updatePricingResults();
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  pcUsed.push(pick);
  pcIndex = pick;
  const s = PRICING_SCENARIOS[pick];
  area.innerHTML = '<div class="card" style="margin-top:var(--space-4);">'
    + '<p style="font-size:var(--font-size-lg);line-height:1.6;margin-bottom:var(--space-4);">' + s.text + '</p>'
    + '<div class="tool-actions">'
    + '<button class="btn btn--primary pc-answer-btn" data-answer="short-run">Short-Run Pricing</button>'
    + '<button class="btn btn--secondary pc-answer-btn" data-answer="long-run">Long-Run Pricing</button>'
    + '</div>'
    + '<div id="pc-feedback"></div>'
    + '</div>';
  area.querySelectorAll('.pc-answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handlePricingAnswer(btn.dataset.answer));
  });
}

function handlePricingAnswer(chosen) {
  const s = PRICING_SCENARIOS[pcIndex];
  const feedback = el('pc-feedback');
  if (!s || !feedback) return;
  const correct = chosen === s.answer;
  pcTotal++;
  if (correct) pcCorrect++;
  const label = s.answer === 'short-run' ? 'Short-Run Pricing' : 'Long-Run Pricing';
  feedback.innerHTML = '<div class="feedback-card" style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:' + (correct ? 'var(--color-success-bg, #1a3a2a)' : 'var(--color-danger-bg, #3a1a1a)') + ';border:1px solid ' + (correct ? 'var(--color-success)' : 'var(--color-danger)') + ';">'
    + '<h4 style="margin:0 0 var(--space-2);">' + (correct ? 'Correct' : 'Not quite') + '</h4>'
    + '<p><strong>Best answer:</strong> ' + label + '</p>'
    + '<p style="margin-bottom:0;">' + s.why + '</p>'
    + '</div>';
  feedback.parentElement.querySelectorAll('.pc-answer-btn').forEach(btn => { btn.disabled = true; });
  updatePricingResults();
}

function updatePricingResults() {
  const area = el('pc-results-area');
  if (!area) return;
  area.innerHTML = '<div class="card" style="margin-top:var(--space-4);">'
    + '<h4 style="margin-top:0;">Score</h4>'
    + '<p class="result-highlight">' + pcCorrect + ' correct out of ' + pcTotal + ' answered</p>'
    + '<p style="margin-bottom:0;color:var(--color-gray-600);">Remaining scenarios: ' + (PRICING_SCENARIOS.length - pcUsed.length) + '</p>'
    + '</div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Cost-Plus Pricing
// ══════════════════════════════════════════════════════════════════════════════

function calcCostPlus() {
  const units = val('cp-units');
  const varMfg = val('cp-var-mfg');
  const fixedMfg = val('cp-fixed-mfg');
  const varSga = val('cp-var-sga');
  const fixedSga = val('cp-fixed-sga');
  const investedCapital = val('cp-invested-capital');
  const targetRoi = val('cp-target-roi') / 100;
  const baseType = el('cp-cost-base') ? el('cp-cost-base').value : 'manufacturing';

  const fixedMfgPerUnit = units ? fixedMfg / units : 0;
  const fixedSgaPerUnit = units ? fixedSga / units : 0;
  const requiredReturnTotal = investedCapital * targetRoi;
  const requiredReturnPerUnit = units ? requiredReturnTotal / units : 0;

  const variableMfgCost = varMfg;
  const manufacturingCost = varMfg + fixedMfgPerUnit;
  const fullCost = varMfg + fixedMfgPerUnit + varSga + fixedSgaPerUnit;

  let costBase = manufacturingCost;
  let includedLabel = 'Total manufacturing cost';
  let excludedCost = varSga + fixedSgaPerUnit;
  if (baseType === 'variable-mfg') {
    costBase = variableMfgCost;
    includedLabel = 'Variable manufacturing cost';
    excludedCost = fixedMfgPerUnit + varSga + fixedSgaPerUnit;
  } else if (baseType === 'full-cost') {
    costBase = fullCost;
    includedLabel = 'Full product cost';
    excludedCost = 0;
  }

  const markupPerUnit = excludedCost + requiredReturnPerUnit;
  const markupPct = costBase ? markupPerUnit / costBase : 0;
  const targetPrice = costBase + markupPerUnit;
  const targetRevenue = targetPrice * units;
  const totalCosts = fullCost * units;
  const targetOI = targetRevenue - totalCosts;

  const card = el('cp-calculate') ? el('cp-calculate').closest('.card') : null;
  const out = getOrCreate('cp-output', 'div', 'tool-output', card);
  const work = getOrCreate('cp-show-work', 'div', '', card);

  out.innerHTML = '<div class="ch12-mob-grid">'
    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Cost Build-Up per Unit</div>'
    + '<table class="ch12-result-table"><tbody>'
    + '<tr><td>Variable manufacturing</td><td>' + fmt(varMfg) + '</td></tr>'
    + '<tr><td>Fixed manufacturing per unit</td><td>' + fmt(fixedMfgPerUnit) + '</td></tr>'
    + '<tr><td>Variable selling/admin</td><td>' + fmt(varSga) + '</td></tr>'
    + '<tr><td>Fixed selling/admin per unit</td><td>' + fmt(fixedSgaPerUnit) + '</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Full cost per unit</td><td>' + fmt(fullCost) + '</td></tr>'
    + '</tbody></table>'
    + '</div>'
    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Cost-Plus Price</div>'
    + '<table class="ch12-result-table"><tbody>'
    + '<tr><td>Selected cost base</td><td>' + includedLabel + '</td></tr>'
    + '<tr><td>Cost base per unit</td><td>' + fmt(costBase) + '</td></tr>'
    + '<tr><td>Markup per unit</td><td>' + fmt(markupPerUnit) + '</td></tr>'
    + '<tr><td>Markup percentage on base</td><td>' + fmtPct(markupPct) + '</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Cost-plus target price</td><td>' + fmt(targetPrice) + '</td></tr>'
    + '</tbody></table>'
    + '</div>'
    + '</div>'
    + '<div class="ch12-verdict ch12-verdict--positive">At ' + fmt(targetPrice) + ' per unit, expected operating income is <strong>' + fmtD(targetOI) + '</strong>, which matches the required return of ' + fmt(requiredReturnTotal) + ' on invested capital.</div>';

  renderShowWork(work, [
    { label: 'Fixed manufacturing per unit', formula: 'Fixed manufacturing costs / Expected units', values: fmt(fixedMfg) + ' / ' + fmtN(units), result: fmt(fixedMfgPerUnit) },
    { label: 'Full cost per unit', formula: 'Variable mfg + Fixed mfg/unit + Variable S&A + Fixed S&A/unit', values: fmt(varMfg) + ' + ' + fmt(fixedMfgPerUnit) + ' + ' + fmt(varSga) + ' + ' + fmt(fixedSgaPerUnit), result: fmt(fullCost) },
    { label: 'Required return per unit', formula: 'Invested capital x Target ROI / Units', values: fmt(investedCapital) + ' x ' + fmtPct(targetRoi) + ' / ' + fmtN(units), result: fmt(requiredReturnPerUnit) },
    { label: 'Markup per unit', formula: 'Excluded costs from base + Required return per unit', values: fmt(excludedCost) + ' + ' + fmt(requiredReturnPerUnit), result: fmt(markupPerUnit) },
    { label: 'Target price', formula: 'Cost base + Markup', values: fmt(costBase) + ' + ' + fmt(markupPerUnit), result: fmt(targetPrice), highlight: true },
    { label: 'Verification', formula: 'Revenue - all value-chain costs', values: fmt(targetRevenue) + ' - ' + fmt(totalCosts), result: fmtD(targetOI), note: 'This should equal the required return.' }
  ], { title: 'Cost-Plus Pricing Show Work', defaultOpen: false });
}

function initCostPlus() {
  const calcBtn = el('cp-calculate');
  if (!calcBtn) return;
  calcBtn.addEventListener('click', calcCostPlus);
  const loadBtn = el('cp-load-example');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      setVal('cp-units', 50000);
      setVal('cp-var-mfg', 32);
      setVal('cp-fixed-mfg', 600000);
      setVal('cp-var-sga', 8);
      setVal('cp-fixed-sga', 350000);
      setVal('cp-invested-capital', 2500000);
      setVal('cp-target-roi', 18);
      if (el('cp-cost-base')) el('cp-cost-base').value = 'manufacturing';
      calcCostPlus();
    });
  }
  initRandomizer('cp-randomize', [
    { id: 'cp-units', min: 10000, max: 150000, step: 5000, integer: true },
    { id: 'cp-var-mfg', min: 10, max: 120, step: 1 },
    { id: 'cp-fixed-mfg', min: 100000, max: 2000000, step: 50000, integer: true },
    { id: 'cp-var-sga', min: 2, max: 40, step: 1 },
    { id: 'cp-fixed-sga', min: 50000, max: 1000000, step: 25000, integer: true },
    { id: 'cp-invested-capital', min: 500000, max: 8000000, step: 100000, integer: true },
    { id: 'cp-target-roi', min: 8, max: 30, step: 1 }
  ], calcCostPlus);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Target Costing
// ══════════════════════════════════════════════════════════════════════════════

function calcTargetCosting() {
  const targetPrice = val('tc-target-price');
  const targetMargin = val('tc-target-margin') / 100;
  const currentCost = val('tc-current-cost');
  const units = val('tc-annual-units');
  const designSaving = val('tc-design-saving');
  const supplierSaving = val('tc-supplier-saving');
  const processSaving = val('tc-process-saving');
  const serviceSaving = val('tc-service-saving');

  const targetProfitPerUnit = targetPrice * targetMargin;
  const allowableCost = targetPrice - targetProfitPerUnit;
  const gapBefore = currentCost - allowableCost;
  const totalSavings = designSaving + supplierSaving + processSaving + serviceSaving;
  const engineeredCost = currentCost - totalSavings;
  const gapAfter = engineeredCost - allowableCost;
  const annualGapBefore = gapBefore * units;
  const annualGapAfter = gapAfter * units;
  const feasible = gapAfter <= 0;

  const card = el('tc-calculate') ? el('tc-calculate').closest('.card') : null;
  const out = getOrCreate('tc-output', 'div', 'tool-output', card);
  const work = getOrCreate('tc-show-work', 'div', '', card);

  out.innerHTML = '<div class="ch12-mob-grid">'
    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Target Cost Calculation</div>'
    + '<table class="ch12-result-table"><tbody>'
    + '<tr><td>Target selling price</td><td>' + fmt(targetPrice) + '</td></tr>'
    + '<tr><td>Target operating income per unit</td><td>(' + fmt(targetProfitPerUnit) + ')</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Allowable target cost</td><td>' + fmt(allowableCost) + '</td></tr>'
    + '<tr><td>Current estimated cost</td><td>' + fmt(currentCost) + '</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Cost gap before engineering</td><td class="' + resultClass(-gapBefore) + '">' + fmtD(gapBefore) + '</td></tr>'
    + '</tbody></table>'
    + '</div>'
    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Value Engineering Plan</div>'
    + '<table class="ch12-result-table"><tbody>'
    + '<tr><td>Design simplification</td><td>' + fmt(designSaving) + '</td></tr>'
    + '<tr><td>Supplier / materials</td><td>' + fmt(supplierSaving) + '</td></tr>'
    + '<tr><td>Process improvement</td><td>' + fmt(processSaving) + '</td></tr>'
    + '<tr><td>Service / distribution</td><td>' + fmt(serviceSaving) + '</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Total savings</td><td>' + fmt(totalSavings) + '</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Engineered cost</td><td>' + fmt(engineeredCost) + '</td></tr>'
    + '</tbody></table>'
    + '</div>'
    + '</div>'
    + '<div class="ch12-verdict ' + (feasible ? 'ch12-verdict--positive' : 'ch12-verdict--negative') + '">'
    + (feasible
      ? 'Target achieved. The engineered cost is ' + fmt(Math.abs(gapAfter)) + ' below the allowable target cost, improving annual operating income by ' + fmt(totalSavings * units) + '.'
      : 'Target not yet achieved. The remaining cost gap is <strong>' + fmt(gapAfter) + ' per unit</strong>, or ' + fmt(annualGapAfter) + ' annually at expected volume.')
    + '</div>';

  renderShowWork(work, [
    { label: 'Target operating income per unit', formula: 'Target price x Target margin', values: fmt(targetPrice) + ' x ' + fmtPct(targetMargin), result: fmt(targetProfitPerUnit) },
    { label: 'Allowable target cost', formula: 'Target price - Target operating income', values: fmt(targetPrice) + ' - ' + fmt(targetProfitPerUnit), result: fmt(allowableCost), highlight: true },
    { label: 'Cost gap before value engineering', formula: 'Current estimated cost - Allowable target cost', values: fmt(currentCost) + ' - ' + fmt(allowableCost), result: fmtD(gapBefore) + ' per unit' },
    { label: 'Annual cost gap before engineering', formula: 'Cost gap x Expected annual units', values: fmtD(gapBefore) + ' x ' + fmtN(units), result: fmtD(annualGapBefore) },
    { label: 'Engineered cost', formula: 'Current cost - Value engineering savings', values: fmt(currentCost) + ' - ' + fmt(totalSavings), result: fmt(engineeredCost) },
    { label: 'Remaining gap', formula: 'Engineered cost - Allowable target cost', values: fmt(engineeredCost) + ' - ' + fmt(allowableCost), result: fmtD(gapAfter), highlight: true }
  ], { title: 'Target Costing Show Work', defaultOpen: false });
}

function initTargetCosting() {
  const calcBtn = el('tc-calculate');
  if (!calcBtn) return;
  calcBtn.addEventListener('click', calcTargetCosting);
  const loadBtn = el('tc-load-example');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      setVal('tc-target-price', 240);
      setVal('tc-target-margin', 22);
      setVal('tc-current-cost', 205);
      setVal('tc-annual-units', 40000);
      setVal('tc-design-saving', 7);
      setVal('tc-supplier-saving', 6);
      setVal('tc-process-saving', 5);
      setVal('tc-service-saving', 3);
      calcTargetCosting();
    });
  }
  initRandomizer('tc-randomize', [
    { id: 'tc-target-price', min: 80, max: 800, step: 5 },
    { id: 'tc-target-margin', min: 10, max: 35, step: 1 },
    { id: 'tc-current-cost', min: 50, max: 700, step: 5 },
    { id: 'tc-annual-units', min: 5000, max: 150000, step: 5000, integer: true },
    { id: 'tc-design-saving', min: 0, max: 40, step: 1 },
    { id: 'tc-supplier-saving', min: 0, max: 40, step: 1 },
    { id: 'tc-process-saving', min: 0, max: 40, step: 1 },
    { id: 'tc-service-saving', min: 0, max: 25, step: 1 }
  ], calcTargetCosting);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Life-Cycle Profitability
// ══════════════════════════════════════════════════════════════════════════════

function calcLifeCycle() {
  const price = val('lc-price');
  const unitsY1 = val('lc-units-y1');
  const unitsY2 = val('lc-units-y2');
  const unitsY3 = val('lc-units-y3');
  const rd = val('lc-rd');
  const design = val('lc-design');
  const varMfg = val('lc-var-mfg');
  const fixedMfg = val('lc-fixed-mfg');
  const marketing = val('lc-marketing');
  const support = val('lc-support');

  const totalUnits = unitsY1 + unitsY2 + unitsY3;
  const revenueY1 = price * unitsY1;
  const revenueY2 = price * unitsY2;
  const revenueY3 = price * unitsY3;
  const totalRevenue = revenueY1 + revenueY2 + revenueY3;
  const totalVarMfg = varMfg * totalUnits;
  const totalCosts = rd + design + totalVarMfg + fixedMfg + marketing + support;
  const lifeCycleOI = totalRevenue - totalCosts;
  const lifeCycleMargin = totalRevenue ? lifeCycleOI / totalRevenue : 0;
  const costPerUnit = totalUnits ? totalCosts / totalUnits : 0;
  const lockedInCosts = rd + design;
  const lockedInPct = totalCosts ? lockedInCosts / totalCosts : 0;

  const card = el('lc-calculate') ? el('lc-calculate').closest('.card') : null;
  const out = getOrCreate('lc-output', 'div', 'tool-output', card);
  const work = getOrCreate('lc-show-work', 'div', '', card);

  out.innerHTML = '<div class="ch12-mob-grid">'
    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Revenue Pattern</div>'
    + '<table class="ch12-result-table"><thead><tr><th>Year</th><th>Units</th><th>Revenue</th></tr></thead><tbody>'
    + '<tr><td>Year 1</td><td>' + fmtN(unitsY1) + '</td><td>' + fmt(revenueY1) + '</td></tr>'
    + '<tr><td>Year 2</td><td>' + fmtN(unitsY2) + '</td><td>' + fmt(revenueY2) + '</td></tr>'
    + '<tr><td>Year 3</td><td>' + fmtN(unitsY3) + '</td><td>' + fmt(revenueY3) + '</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Total</td><td>' + fmtN(totalUnits) + '</td><td>' + fmt(totalRevenue) + '</td></tr>'
    + '</tbody></table>'
    + '</div>'
    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Life-Cycle Cost Summary</div>'
    + '<table class="ch12-result-table"><tbody>'
    + '<tr><td>Research and development</td><td>' + fmt(rd) + '</td></tr>'
    + '<tr><td>Design and tooling</td><td>' + fmt(design) + '</td></tr>'
    + '<tr><td>Variable manufacturing</td><td>' + fmt(totalVarMfg) + '</td></tr>'
    + '<tr><td>Fixed manufacturing support</td><td>' + fmt(fixedMfg) + '</td></tr>'
    + '<tr><td>Marketing and distribution</td><td>' + fmt(marketing) + '</td></tr>'
    + '<tr><td>Warranty and customer support</td><td>' + fmt(support) + '</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Total life-cycle costs</td><td>' + fmt(totalCosts) + '</td></tr>'
    + '</tbody></table>'
    + '</div>'
    + '</div>'
    + '<div class="card" style="margin-top:var(--space-4);">'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);">'
    + '<div><div style="font-size:var(--font-size-sm);color:var(--color-gray-600);">Life-cycle operating income</div><div class="' + resultClass(lifeCycleOI) + '" style="font-size:var(--font-size-2xl);font-weight:800;">' + fmtD(lifeCycleOI) + '</div></div>'
    + '<div><div style="font-size:var(--font-size-sm);color:var(--color-gray-600);">Life-cycle margin</div><div style="font-size:var(--font-size-2xl);font-weight:800;">' + fmtPct(lifeCycleMargin) + '</div></div>'
    + '<div><div style="font-size:var(--font-size-sm);color:var(--color-gray-600);">Life-cycle cost per unit</div><div style="font-size:var(--font-size-2xl);font-weight:800;">' + fmt(costPerUnit) + '</div></div>'
    + '<div><div style="font-size:var(--font-size-sm);color:var(--color-gray-600);">Costs locked in before production</div><div style="font-size:var(--font-size-2xl);font-weight:800;">' + fmtPct(lockedInPct) + '</div></div>'
    + '</div>'
    + '</div>'
    + '<div class="ch12-insight" style="margin-top:var(--space-4);">Life-cycle costing highlights costs committed early in design and development. Managing design choices before launch can matter more than controlling production variances after costs are locked in.</div>';

  renderShowWork(work, [
    { label: 'Total life-cycle revenue', formula: 'Price x Total units over the product life', values: fmt(price) + ' x ' + fmtN(totalUnits), result: fmt(totalRevenue) },
    { label: 'Total variable manufacturing cost', formula: 'Variable mfg cost per unit x Total units', values: fmt(varMfg) + ' x ' + fmtN(totalUnits), result: fmt(totalVarMfg) },
    { label: 'Total life-cycle costs', formula: 'R&D + Design + Mfg + Marketing + Support', values: fmt(rd) + ' + ' + fmt(design) + ' + ' + fmt(totalVarMfg) + ' + ' + fmt(fixedMfg) + ' + ' + fmt(marketing) + ' + ' + fmt(support), result: fmt(totalCosts) },
    { label: 'Life-cycle operating income', formula: 'Total revenue - Total life-cycle costs', values: fmt(totalRevenue) + ' - ' + fmt(totalCosts), result: fmtD(lifeCycleOI), highlight: true },
    { label: 'Life-cycle margin', formula: 'Life-cycle OI / Total revenue', values: fmtD(lifeCycleOI) + ' / ' + fmt(totalRevenue), result: fmtPct(lifeCycleMargin) },
    { label: 'Locked-in cost percentage', formula: '(R&D + Design) / Total costs', values: '(' + fmt(rd) + ' + ' + fmt(design) + ') / ' + fmt(totalCosts), result: fmtPct(lockedInPct), note: 'These costs are influenced heavily before production begins.' }
  ], { title: 'Life-Cycle Profitability Show Work', defaultOpen: false });
}

function initLifeCycle() {
  const calcBtn = el('lc-calculate');
  if (!calcBtn) return;
  calcBtn.addEventListener('click', calcLifeCycle);
  const loadBtn = el('lc-load-example');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      setVal('lc-price', 320);
      setVal('lc-units-y1', 18000);
      setVal('lc-units-y2', 35000);
      setVal('lc-units-y3', 22000);
      setVal('lc-rd', 2200000);
      setVal('lc-design', 1400000);
      setVal('lc-var-mfg', 145);
      setVal('lc-fixed-mfg', 1750000);
      setVal('lc-marketing', 1200000);
      setVal('lc-support', 900000);
      calcLifeCycle();
    });
  }
  initRandomizer('lc-randomize', [
    { id: 'lc-price', min: 80, max: 1000, step: 10 },
    { id: 'lc-units-y1', min: 5000, max: 80000, step: 5000, integer: true },
    { id: 'lc-units-y2', min: 5000, max: 120000, step: 5000, integer: true },
    { id: 'lc-units-y3', min: 5000, max: 100000, step: 5000, integer: true },
    { id: 'lc-rd', min: 250000, max: 6000000, step: 250000, integer: true },
    { id: 'lc-design', min: 250000, max: 4000000, step: 250000, integer: true },
    { id: 'lc-var-mfg', min: 25, max: 600, step: 5 },
    { id: 'lc-fixed-mfg', min: 250000, max: 5000000, step: 250000, integer: true },
    { id: 'lc-marketing', min: 100000, max: 4000000, step: 100000, integer: true },
    { id: 'lc-support', min: 100000, max: 3000000, step: 100000, integer: true }
  ], calcLifeCycle);
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Target Price', definition: 'The estimated price for a product or service that potential customers will be willing to pay. It is market driven rather than cost driven.' },
  { term: 'Target Cost per Unit', definition: 'The estimated long-run cost per unit that enables the company to earn its target operating income at the target price.' },
  { term: 'Target Operating Income per Unit', definition: 'The operating income the company aims to earn on each unit sold. Target cost equals target price minus this amount.' },
  { term: 'Value Engineering', definition: 'A systematic evaluation of all aspects of the value chain to reduce costs while satisfying customer needs.' },
  { term: 'Cost-Plus Pricing', definition: 'A pricing approach that adds a markup to a cost base. The markup should recover costs excluded from the base and provide the desired return.' },
  { term: 'Cost Base', definition: 'The cost amount to which a markup is added. Common bases include variable manufacturing cost, total manufacturing cost, and full product cost.' },
  { term: 'Markup Percentage', definition: 'The markup amount divided by the selected cost base. The percentage depends on which costs are included in or excluded from the base.' },
  { term: 'Life-Cycle Costing', definition: 'Tracking and accumulating costs over a products entire life, from R&D and design through production, marketing, distribution, and customer support.' },
  { term: 'Locked-in Costs', definition: 'Costs that have not yet been incurred but are committed by decisions already made, especially product design decisions.' },
  { term: 'Customer Value', definition: 'The usefulness a customer gains from a product or service. Pricing decisions must consider customer value and competitor actions, not costs alone.' },
  { term: 'Short-Run Pricing Decision', definition: 'A pricing decision for a special order or limited time period where some costs are fixed and capacity may be idle.' },
  { term: 'Long-Run Pricing Decision', definition: 'A pricing decision over a horizon long enough for managers to adjust capacity and product design. Prices should recover all value-chain costs.' }
];

function initKeyTerms() {
  const grid = el('key-terms-grid');
  if (!grid) return;
  grid.innerHTML = '';
  KEY_TERMS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'key-term';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-expanded', 'false');
    div.innerHTML = '<div class="key-term__word">' + item.term + '</div><p class="key-term__definition">' + item.definition + '</p>';
    div.addEventListener('click', () => {
      const open = div.classList.toggle('key-term--open');
      div.setAttribute('aria-expanded', open);
    });
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        div.click();
      }
    });
    grid.appendChild(div);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER COMPLETE
// ══════════════════════════════════════════════════════════════════════════════

function injectResetButton(card) {
  if (el('ch14-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch14-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch14');
    const markBtn = el('mark-complete-btn');
    if (markBtn) {
      markBtn.textContent = 'Mark as Complete';
      markBtn.disabled = false;
      markBtn.classList.remove('btn--success');
    }
    resetBtn.remove();
    const status = el('ch14-status');
    if (status) status.textContent = 'Not started';
  });
  card.appendChild(resetBtn);
}

function initChapterComplete() {
  const btn = el('mark-complete-btn');
  const card = el('chapter-complete');
  const status = el('ch14-status');
  if (!btn || !card) return;
  if (isChapterComplete('ch14')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch14');
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initPricingContext();
  initCostPlus();
  initTargetCosting();
  initLifeCycle();
  initKeyTerms();
  initChapterComplete();
});