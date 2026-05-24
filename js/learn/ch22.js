import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initHeader } from '/js/components/header.js';

const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtS   = n => (n >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(n)).toLocaleString();
const fmt2   = n => '$' + Math.abs(n).toFixed(2);
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (Math.round(n * 10) / 10).toFixed(1) + '%';

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

const el  = id => document.getElementById(id);
const val = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

function insight(text) {
  return '<div class="ch12-insight" style="margin-top:var(--space-4);">' + text + '</div>';
}

function verdict(text, positive) {
  return '<div class="ch12-verdict ' + (positive ? 'ch12-verdict--positive' : 'ch12-verdict--negative') + '">' + text + '</div>';
}

function panel(title, body, note) {
  return '<div style="flex:1 1 300px;min-width:280px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-3);color:var(--color-primary-text);">' + title + '</div>'
    + '<div style="overflow-x:auto;">' + body + '</div>'
    + (note ? '<p style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin:var(--space-3) 0 0;font-style:italic;">' + note + '</p>' : '')
    + '</div>';
}

function table(cols, rows, foot) {
  const thead = '<thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
  const tfoot = foot ? '<tfoot><tr>' + foot.map(c => '<td><strong>' + c + '</strong></td>').join('') + '</tr></tfoot>' : '';
  return '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">' + thead + tbody + tfoot + '</table></div>';
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Relevant Cash Flow Identifier
// ═══════════════════════════════════════════════════════════════════════════

const RCF_SCENARIOS = [
  { text: 'Cost of a market research study completed last year to evaluate a potential new product.', answer: 'irrelevant', why: 'This is a sunk cost. It has already been incurred and cannot be changed by accepting or rejecting the project.' },
  { text: 'Expected additional working capital required to support the new project operations.', answer: 'relevant', why: 'Working capital increases are relevant cash outflows at the start and are recovered as inflows at the end of the project.' },
  { text: 'Depreciation expense on a new machine purchased for the project.', answer: 'partial', why: 'Depreciation is not a cash flow itself, but it provides a tax shield. The tax shield is a relevant cash flow; the depreciation expense is not.' },
  { text: 'Allocated share of corporate headquarters overhead based on project revenue.', answer: 'irrelevant', why: 'Allocated overhead does not change with the project decision. It is irrelevant unless the project actually causes additional overhead spending.' },
  { text: 'Lost rental income from a warehouse that will now be used for the new project.', answer: 'relevant', why: 'This is an opportunity cost. The forgone rental income is a relevant cash outflow attributable to the project.' },
  { text: 'After-tax cash proceeds from selling old equipment that will be replaced by new equipment.', answer: 'relevant', why: 'Sale of old equipment is a relevant cash inflow at project initiation. The after-tax amount is what matters.' },
  { text: 'Book value of old equipment being replaced.', answer: 'irrelevant', why: 'Book value is a sunk cost. It affects the tax calculation on the sale gain or loss, but the book value itself is not a relevant cash flow.' },
  { text: 'Salvage value expected at the end of the project life.', answer: 'relevant', why: 'Terminal salvage value is a relevant cash inflow in the final year. Tax effects on the salvage gain must also be considered.' },
  { text: 'Increased operating expenses caused directly by the new project.', answer: 'relevant', why: 'Incremental operating expenses are relevant cash outflows. Only changes from the status quo are counted.' },
  { text: 'Cost of a feasibility study that has not yet been performed but is required before approving the project.', answer: 'relevant', why: 'Even though it occurs before the project, the feasibility study cost is incremental and avoidable if the project is rejected.' },
  { text: 'Tax shield provided by depreciation on a new asset.', answer: 'relevant', why: 'Depreciation reduces taxable income, which reduces tax payments. The tax savings are relevant cash inflows.' },
  { text: 'Allocated portion of the CFO salary that will not change regardless of the decision.', answer: 'irrelevant', why: 'Fixed corporate costs that do not change with the project decision are irrelevant.' }
];

let rcfIndex = -1, rcfCorrect = 0, rcfTotal = 0, rcfUsed = [];

function initRelevantCF() {
  const nextBtn  = el('rcf-next-btn');
  const resetBtn = el('rcf-reset-btn');
  if (!nextBtn) return;
  nextBtn.addEventListener('click', showNextRCF);
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      rcfUsed = []; rcfCorrect = 0; rcfTotal = 0; rcfIndex = -1;
      const area = el('rcf-scenario-area');
      const res  = el('rcf-results-area');
      if (area) area.innerHTML = '';
      if (res)  res.innerHTML = '';
      showNextRCF();
    });
  }
}

function showNextRCF() {
  const area = el('rcf-scenario-area');
  if (!area) return;
  const available = RCF_SCENARIOS.map((_, i) => i).filter(i => rcfUsed.indexOf(i) === -1);
  if (available.length === 0) {
    area.innerHTML = '<div class="card" style="margin-top:var(--space-4);"><p class="result-highlight">All 12 cash flow items completed.</p></div>';
    updateRCFResults();
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  rcfUsed.push(pick);
  rcfIndex = pick;
  const s = RCF_SCENARIOS[pick];
  area.innerHTML = '<div class="card" style="margin-top:var(--space-4);">'
    + '<p style="font-size:var(--font-size-lg);line-height:1.6;margin-bottom:var(--space-4);">' + s.text + '</p>'
    + '<div class="tool-actions" style="flex-wrap:wrap;">'
    + '<button class="btn btn--primary rcf-answer-btn" data-answer="relevant">Relevant</button>'
    + '<button class="btn btn--secondary rcf-answer-btn" data-answer="irrelevant">Irrelevant</button>'
    + '<button class="btn btn--secondary rcf-answer-btn" data-answer="partial">Partially Relevant</button>'
    + '</div>'
    + '<div id="rcf-feedback"></div>'
    + '</div>';
  area.querySelectorAll('.rcf-answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handleRCFAnswer(btn.dataset.answer));
  });
}

function handleRCFAnswer(chosen) {
  const s = RCF_SCENARIOS[rcfIndex];
  const feedback = el('rcf-feedback');
  if (!s || !feedback) return;
  const correct = chosen === s.answer;
  rcfTotal++;
  if (correct) rcfCorrect++;
  const labels = { relevant: 'Relevant', irrelevant: 'Irrelevant', partial: 'Partially Relevant' };
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  feedback.innerHTML = '<div style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:'
    + (correct ? (isDark ? 'var(--color-success-bg,#1a3a2a)' : 'var(--color-success-bg,#f0fdf4)') : (isDark ? 'var(--color-danger-bg,#3a1a1a)' : 'var(--color-danger-bg,#fef2f2)'))
    + ';border:1px solid ' + (correct ? 'var(--color-success)' : 'var(--color-danger)') + ';">'
    + '<h4 style="margin:0 0 var(--space-2);">' + (correct ? 'Correct' : 'Not quite') + ' -- ' + labels[s.answer] + '</h4>'
    + '<p style="margin:0;">' + s.why + '</p>'
    + '</div>';
  feedback.parentElement.querySelectorAll('.rcf-answer-btn').forEach(btn => { btn.disabled = true; });
  updateRCFResults();
}

function updateRCFResults() {
  const area = el('rcf-results-area');
  if (!area) return;
  area.innerHTML = '<div class="ch12-insight" style="margin-top:var(--space-4);">Score: <strong>' + rcfCorrect + ' / ' + rcfTotal + '</strong> | Remaining: <strong>' + (RCF_SCENARIOS.length - rcfUsed.length) + '</strong></div>';
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 2 -- NPV and IRR Calculator
// ═══════════════════════════════════════════════════════════════════════════

function npv(rate, cashFlows) {
  let sum = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    sum += cashFlows[t] / Math.pow(1 + rate, t);
  }
  return sum;
}

function irr(cashFlows) {
  let low = -0.99, high = 10;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const v = npv(mid, cashFlows);
    if (Math.abs(v) < 0.01) return mid;
    if (v > 0) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

function calcNPV() {
  const initial = val('npv-initial');
  const rate    = val('npv-rate') / 100;
  const years   = Math.min(5, val('npv-years'));
  const terminal = val('npv-terminal');

  const cashFlows = [-initial];
  for (let t = 1; t <= 5; t++) {
    const cf = val('npv-cf' + t);
    if (t <= years) {
      cashFlows.push(t === years ? cf + terminal : cf);
    }
  }

  const projectNPV = npv(rate, cashFlows);
  const projectIRR = irr(cashFlows);

  const rows = cashFlows.map((cf, t) => {
    const pv = cf / Math.pow(1 + rate, t);
    const factor = 1 / Math.pow(1 + rate, t);
    return ['Year ' + t, fmt(cf), factor.toFixed(4), fmt(pv)];
  });

  const out = getOrCreate('npv-output', 'div', 'tool-output', el('npv-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('NPV',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + fmt(projectNPV) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">at ' + fmtPct(rate * 100) + ' discount rate</p>',
        projectNPV > 0 ? 'NPV is positive -- the project earns more than the required rate of return.' : 'NPV is negative -- the project does not meet the required rate of return.'
      )
    + panel('IRR',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + fmtPct(projectIRR * 100) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">required: ' + fmtPct(rate * 100) + '</p>',
        projectIRR > rate ? 'IRR exceeds required rate -- consistent with positive NPV.' : 'IRR is below required rate -- consistent with negative NPV.'
      )
    + '</div>'
    + '<div style="margin-top:var(--space-4);">'
    + table(['Year', 'Cash Flow', 'Discount Factor', 'Present Value'], rows, ['Net Present Value', '', '', fmt(projectNPV)])
    + '</div>'
    + verdict(
        projectNPV > 0
          ? 'Accept the project. NPV is positive at <strong>' + fmt(projectNPV) + '</strong> and IRR of <strong>' + fmtPct(projectIRR * 100) + '</strong> exceeds the required rate of return.'
          : 'Reject the project. NPV is negative at <strong>' + fmt(projectNPV) + '</strong> and IRR of <strong>' + fmtPct(projectIRR * 100) + '</strong> is below the required rate.',
        projectNPV > 0
      )
    + '</div>';

  const steps = [
    { label: 'Project NPV', formula: 'Sum of (CF_t / (1+r)^t)', values: 'Sum across ' + (cashFlows.length) + ' years at ' + fmtPct(rate * 100), result: fmt(projectNPV), highlight: true },
    { label: 'Project IRR', formula: 'Rate where NPV = 0', values: 'Iterative solution', result: fmtPct(projectIRR * 100), highlight: true }
  ];
  renderShowWork(el('npv-show-work'), steps, { title: 'NPV and IRR Calculation', defaultOpen: false });
}

function initNPV() {
  const btn = el('npv-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcNPV);
  el('npv-load-example') && el('npv-load-example').addEventListener('click', () => {
    setVal('npv-initial', 500000); setVal('npv-rate', 10); setVal('npv-years', 5);
    setVal('npv-cf1', 150000); setVal('npv-cf2', 160000); setVal('npv-cf3', 170000);
    setVal('npv-cf4', 180000); setVal('npv-cf5', 190000); setVal('npv-terminal', 50000);
    calcNPV();
  });
  initRandomizer('npv-randomize', [
    { id: 'npv-initial',  min: 100000, max: 2000000, step: 25000, integer: true },
    { id: 'npv-rate',     min: 5,      max: 20,      step: 0.5 },
    { id: 'npv-years',    min: 3,      max: 5,       step: 1, integer: true },
    { id: 'npv-cf1',      min: 50000,  max: 500000,  step: 10000, integer: true },
    { id: 'npv-cf2',      min: 50000,  max: 500000,  step: 10000, integer: true },
    { id: 'npv-cf3',      min: 50000,  max: 500000,  step: 10000, integer: true },
    { id: 'npv-cf4',      min: 50000,  max: 500000,  step: 10000, integer: true },
    { id: 'npv-cf5',      min: 50000,  max: 500000,  step: 10000, integer: true },
    { id: 'npv-terminal', min: 0,      max: 200000,  step: 10000, integer: true }
  ], calcNPV);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Payback Period and AARR
// ═══════════════════════════════════════════════════════════════════════════

function calcPayback() {
  const initial = val('pb-initial');
  const annualCF = val('pb-annual-cf');
  const years = val('pb-years');
  const depreciation = val('pb-depreciation');
  const rate = val('pb-rate') / 100;

  const simplePayback = annualCF > 0 ? initial / annualCF : 0;

  let cumPV = 0;
  let discountedPayback = years + 1;
  for (let t = 1; t <= years; t++) {
    cumPV += annualCF / Math.pow(1 + rate, t);
    if (cumPV >= initial && discountedPayback > years) {
      const prevCum = cumPV - annualCF / Math.pow(1 + rate, t);
      const fraction = (initial - prevCum) / (annualCF / Math.pow(1 + rate, t));
      discountedPayback = (t - 1) + fraction;
      break;
    }
  }

  const annualOI = annualCF - depreciation;
  const avgInvestment = initial / 2;
  const aarr = avgInvestment > 0 ? annualOI / avgInvestment : 0;

  const out = getOrCreate('pb-output', 'div', 'tool-output', el('pb-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Simple Payback',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + simplePayback.toFixed(2) + ' years</div>',
        'Ignores time value of money. Treats all cash flows equally regardless of when they occur.'
      )
    + panel('Discounted Payback',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + (discountedPayback > years ? '> ' + years : discountedPayback.toFixed(2)) + ' years</div>',
        discountedPayback > years ? 'Investment is not recovered within project life on a discounted basis.' : 'Recognizes time value of money but still ignores cash flows after payback.'
      )
    + panel('AARR',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + fmtPct(aarr * 100) + '</div>',
        'Average annual operating income divided by average investment. Ignores time value of money entirely.'
      )
    + '</div>'
    + insight('Payback and AARR are simpler than NPV but have serious limitations. Payback ignores all cash flows after recovery -- a project with high early payback but no later cash flows looks better than a project with steady long-term returns. AARR uses accounting income rather than cash flows and ignores time value of money. Use these methods only as supplementary checks alongside NPV.')
    + '</div>';

  renderShowWork(el('pb-show-work'), [
    { label: 'Simple Payback Period', formula: 'Initial Investment / Annual Cash Flow', values: fmt(initial) + ' / ' + fmt(annualCF), result: simplePayback.toFixed(2) + ' years', highlight: true },
    { label: 'Annual Operating Income', formula: 'Annual Cash Flow - Depreciation', values: fmt(annualCF) + ' - ' + fmt(depreciation), result: fmt(annualOI) },
    { label: 'Average Investment', formula: 'Initial Investment / 2', values: fmt(initial) + ' / 2', result: fmt(avgInvestment) },
    { label: 'AARR', formula: 'Annual Operating Income / Average Investment', values: fmt(annualOI) + ' / ' + fmt(avgInvestment), result: fmtPct(aarr * 100), highlight: true }
  ], { title: 'Payback and AARR Calculation', defaultOpen: false });
}

function initPayback() {
  const btn = el('pb-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcPayback);
  el('pb-load-example') && el('pb-load-example').addEventListener('click', () => {
    setVal('pb-initial', 500000); setVal('pb-annual-cf', 150000); setVal('pb-years', 5);
    setVal('pb-depreciation', 100000); setVal('pb-rate', 10);
    calcPayback();
  });
  initRandomizer('pb-randomize', [
    { id: 'pb-initial',      min: 100000, max: 1500000, step: 25000, integer: true },
    { id: 'pb-annual-cf',    min: 30000,  max: 400000,  step: 5000, integer: true },
    { id: 'pb-years',        min: 3,      max: 12,      step: 1, integer: true },
    { id: 'pb-depreciation', min: 10000,  max: 200000,  step: 5000, integer: true },
    { id: 'pb-rate',         min: 5,      max: 20,      step: 0.5 }
  ], calcPayback);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Capital Budgeting Dashboard
// ═══════════════════════════════════════════════════════════════════════════

function calcDashboard() {
  const initial = val('cbd-initial');
  const revenue = val('cbd-revenue');
  const opex = val('cbd-opex');
  const years = val('cbd-years');
  const salvage = val('cbd-salvage');
  const taxRate = val('cbd-tax-rate') / 100;
  const discount = val('cbd-discount') / 100;

  const annualDep = (initial - salvage) / years;
  const ebit = revenue - opex - annualDep;
  const tax = ebit * taxRate;
  const niat = ebit - tax;
  const afterTaxCF = niat + annualDep;
  const taxShield = annualDep * taxRate;

  const cashFlows = [-initial];
  for (let t = 1; t <= years; t++) {
    cashFlows.push(t === years ? afterTaxCF + salvage : afterTaxCF);
  }
  const projectNPV = npv(discount, cashFlows);
  const projectIRR = irr(cashFlows);
  const simplePayback = afterTaxCF > 0 ? initial / afterTaxCF : 0;
  const aarr = niat / (initial / 2);

  const out = getOrCreate('cbd-output', 'div', 'tool-output', el('cbd-calculate').parentElement);

  const decision = projectNPV > 0 && projectIRR > discount;

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('After-Tax Operating Cash Flow',
        table(
          ['Item', 'Amount'],
          [
            ['Revenue', fmt(revenue)],
            ['Operating Expenses', '(' + fmt(opex) + ')'],
            ['Depreciation', '(' + fmt(annualDep) + ')'],
            ['Pretax Income (EBIT)', fmt(ebit)],
            ['Tax at ' + fmtPct(taxRate * 100), '(' + fmt(tax) + ')'],
            ['Net Income After Tax', fmt(niat)],
            ['Add back Depreciation', fmt(annualDep)],
          ],
          ['After-Tax Cash Flow per Year', fmt(afterTaxCF)]
        ),
        'Depreciation tax shield: ' + fmt(taxShield) + ' per year'
      )
    + panel('Four Methods Side by Side',
        table(
          ['Method', 'Result', 'Decision'],
          [
            ['NPV at ' + fmtPct(discount * 100), fmt(projectNPV), projectNPV > 0 ? 'Accept' : 'Reject'],
            ['IRR', fmtPct(projectIRR * 100), projectIRR > discount ? 'Accept' : 'Reject'],
            ['Simple Payback', simplePayback.toFixed(2) + ' years', simplePayback < years ? 'Within life' : 'Beyond life'],
            ['AARR', fmtPct(aarr * 100), aarr > discount ? 'Accept' : 'Reject']
          ]
        )
      )
    + '</div>'
    + verdict(
        decision
          ? 'Accept the project. NPV of <strong>' + fmt(projectNPV) + '</strong> is positive, IRR of <strong>' + fmtPct(projectIRR * 100) + '</strong> exceeds the required ' + fmtPct(discount * 100) + ', and depreciation provides annual tax savings of <strong>' + fmt(taxShield) + '</strong>.'
          : 'Reject the project. NPV of <strong>' + fmt(projectNPV) + '</strong> indicates the project does not meet the required rate of return.',
        decision
      )
    + insight('Tax effects matter. The depreciation tax shield of ' + fmt(taxShield) + ' per year adds ' + fmt(taxShield * years) + ' in nominal cash flow over the project life. Ignoring taxes typically understates project value when there is a positive tax rate.')
    + '</div>';

  renderShowWork(el('cbd-show-work'), [
    { label: 'Annual Depreciation', formula: '(Initial - Salvage) / Years', values: '(' + fmt(initial) + ' - ' + fmt(salvage) + ') / ' + years, result: fmt(annualDep) },
    { label: 'Pretax Income (EBIT)', formula: 'Revenue - Opex - Depreciation', values: fmt(revenue) + ' - ' + fmt(opex) + ' - ' + fmt(annualDep), result: fmt(ebit) },
    { label: 'Tax', formula: 'EBIT x Tax Rate', values: fmt(ebit) + ' x ' + fmtPct(taxRate * 100), result: fmt(tax) },
    { label: 'After-Tax Cash Flow', formula: 'Net Income + Depreciation', values: fmt(niat) + ' + ' + fmt(annualDep), result: fmt(afterTaxCF), highlight: true },
    { label: 'Depreciation Tax Shield', formula: 'Depreciation x Tax Rate', values: fmt(annualDep) + ' x ' + fmtPct(taxRate * 100), result: fmt(taxShield) },
    { label: 'NPV', formula: 'PV of all cash flows including salvage', values: 'discounted at ' + fmtPct(discount * 100), result: fmt(projectNPV), highlight: true },
    { label: 'IRR', formula: 'Rate where NPV = 0', values: 'iterative', result: fmtPct(projectIRR * 100), highlight: true }
  ], { title: 'Capital Budgeting Dashboard', defaultOpen: false });
}

function initDashboard() {
  const btn = el('cbd-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcDashboard);
  el('cbd-load-example') && el('cbd-load-example').addEventListener('click', () => {
    setVal('cbd-initial', 800000); setVal('cbd-revenue', 500000); setVal('cbd-opex', 200000);
    setVal('cbd-years', 6); setVal('cbd-salvage', 100000); setVal('cbd-tax-rate', 25); setVal('cbd-discount', 12);
    calcDashboard();
  });
  initRandomizer('cbd-randomize', [
    { id: 'cbd-initial',  min: 200000, max: 2000000, step: 50000, integer: true },
    { id: 'cbd-revenue',  min: 100000, max: 1500000, step: 25000, integer: true },
    { id: 'cbd-opex',     min: 50000,  max: 800000,  step: 25000, integer: true },
    { id: 'cbd-years',    min: 3,      max: 12,      step: 1, integer: true },
    { id: 'cbd-salvage',  min: 0,      max: 200000,  step: 10000, integer: true },
    { id: 'cbd-tax-rate', min: 15,     max: 35,      step: 1 },
    { id: 'cbd-discount', min: 6,      max: 18,      step: 0.5 }
  ], calcDashboard);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Sensitivity Analyzer
// ═══════════════════════════════════════════════════════════════════════════

function calcSensitivity() {
  const initial = val('sens-initial');
  const baseCF = val('sens-annual-cf');
  const years = val('sens-years');
  const baseRate = val('sens-rate') / 100;
  const terminal = val('sens-terminal');

  function projectNPV(cf, rate, life, term) {
    const flows = [-initial];
    for (let t = 1; t <= life; t++) {
      flows.push(t === life ? cf + term : cf);
    }
    return npv(rate, flows);
  }

  const baseNPV = projectNPV(baseCF, baseRate, years, terminal);

  const scenarios = [
    { label: 'Annual Cash Flow', variations: [-20, -10, 0, 10, 20] },
    { label: 'Discount Rate', variations: [-2, -1, 0, 1, 2] },
    { label: 'Project Life', variations: [-2, -1, 0, 1, 2] },
    { label: 'Terminal Value', variations: [-50, -25, 0, 25, 50] }
  ];

  const rows = [];
  scenarios.forEach(s => {
    s.variations.forEach(v => {
      let newCF = baseCF, newRate = baseRate, newLife = years, newTerm = terminal;
      let varText = '';
      if (s.label === 'Annual Cash Flow') { newCF = baseCF * (1 + v / 100); varText = (v >= 0 ? '+' : '') + v + '%'; }
      else if (s.label === 'Discount Rate') { newRate = baseRate + v / 100; varText = (v >= 0 ? '+' : '') + v + ' pp'; }
      else if (s.label === 'Project Life') { newLife = Math.max(1, years + v); varText = (v >= 0 ? '+' : '') + v + ' yr'; }
      else if (s.label === 'Terminal Value') { newTerm = terminal * (1 + v / 100); varText = (v >= 0 ? '+' : '') + v + '%'; }
      const newNPV = projectNPV(newCF, newRate, newLife, newTerm);
      const change = newNPV - baseNPV;
      rows.push([s.label, varText, fmt(newNPV), fmtS(change), newNPV > 0 ? 'Accept' : 'Reject']);
    });
  });

  const out = getOrCreate('sens-output', 'div', 'tool-output', el('sens-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + panel('Base Case NPV',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + fmt(baseNPV) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">Annual CF ' + fmt(baseCF) + ', ' + years + ' years, ' + fmtPct(baseRate * 100) + ' discount, terminal ' + fmt(terminal) + '</p>'
      )
    + '<div style="margin-top:var(--space-4);">'
    + table(['Variable', 'Change', 'New NPV', 'NPV Change', 'Decision'], rows)
    + '</div>'
    + insight('The variables that most affect NPV are the high-risk assumptions. If small changes in a variable flip the decision from accept to reject, that variable needs careful estimation and possibly a risk-adjusted discount rate.')
    + '</div>';

  renderShowWork(el('sens-show-work'), [
    { label: 'Base NPV', formula: 'Standard NPV calculation with base inputs', values: 'CF=' + fmt(baseCF) + ', r=' + fmtPct(baseRate * 100) + ', n=' + years + ', term=' + fmt(terminal), result: fmt(baseNPV), highlight: true }
  ], { title: 'Sensitivity Analysis', defaultOpen: false });
}

function initSensitivity() {
  const btn = el('sens-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcSensitivity);
  el('sens-load-example') && el('sens-load-example').addEventListener('click', () => {
    setVal('sens-initial', 500000); setVal('sens-annual-cf', 140000); setVal('sens-years', 5);
    setVal('sens-rate', 10); setVal('sens-terminal', 50000);
    calcSensitivity();
  });
  initRandomizer('sens-randomize', [
    { id: 'sens-initial',   min: 100000, max: 2000000, step: 25000, integer: true },
    { id: 'sens-annual-cf', min: 30000,  max: 400000,  step: 5000, integer: true },
    { id: 'sens-years',     min: 3,      max: 12,      step: 1, integer: true },
    { id: 'sens-rate',      min: 5,      max: 20,      step: 0.5 },
    { id: 'sens-terminal',  min: 0,      max: 200000,  step: 10000, integer: true }
  ], calcSensitivity);
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ═══════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Net Present Value (NPV)', definition: 'The sum of present values of all expected cash flows in a project, including the initial investment. Accept projects with positive NPV.' },
  { term: 'Internal Rate of Return (IRR)', definition: 'The discount rate at which a projects NPV equals zero. Accept projects whose IRR exceeds the required rate of return.' },
  { term: 'Required Rate of Return', definition: 'The minimum acceptable rate of return on a project, typically the company cost of capital or a hurdle rate set by management.' },
  { term: 'Payback Period', definition: 'The time required for accumulated cash inflows to equal the initial investment. Simple to compute but ignores cash flows after recovery and time value of money.' },
  { term: 'Discounted Payback', definition: 'Payback period computed using discounted cash flows. Recognizes time value of money but still ignores cash flows beyond the payback date.' },
  { term: 'Accrual Accounting Rate of Return (AARR)', definition: 'Average annual operating income divided by average investment. Uses accounting income rather than cash flows and ignores time value of money.' },
  { term: 'Relevant Cash Flow', definition: 'A future cash flow that differs between project alternatives. Only relevant cash flows should be used in capital budgeting analysis.' },
  { term: 'Sunk Cost', definition: 'A cost already incurred that cannot be changed by any future decision. Sunk costs are never relevant in capital budgeting.' },
  { term: 'Opportunity Cost', definition: 'The value of the best forgone alternative. For example, the rental income lost when company-owned space is used for a new project.' },
  { term: 'Working Capital Investment', definition: 'Additional current assets minus additional current liabilities required to support a project. Recovered as a cash inflow at project end.' },
  { term: 'Terminal Cash Flow', definition: 'Cash flow at the end of a project including salvage value of equipment, recovery of working capital, and any tax effects on terminal sales.' },
  { term: 'Depreciation Tax Shield', definition: 'The tax savings created by depreciation deductions. Equal to annual depreciation multiplied by the tax rate.' },
  { term: 'Sensitivity Analysis', definition: 'Recalculating NPV by varying one input at a time to identify which assumptions most affect the decision.' },
  { term: 'Real Option', definition: 'Flexibility embedded in a project such as the option to expand, abandon, or delay. Traditional NPV often undervalues projects with significant real options.' }
];

function initKeyTerms() {
  const grid = el('key-terms-grid');
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

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER COMPLETE
// ═══════════════════════════════════════════════════════════════════════════

function injectResetButton(card) {
  if (el('ch22-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch22-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch22');
    const markBtn = el('mark-complete-btn');
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
  const btn  = el('mark-complete-btn');
  const card = el('chapter-complete');
  const status = el('ch22-status');
  if (!btn || !card) return;
  if (isChapterComplete('ch22')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch22');
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initRelevantCF();
  initNPV();
  initPayback();
  initDashboard();
  initSensitivity();
  initKeyTerms();
  initChapterComplete();
});