import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initSettingsPanel } from '/js/components/settings-panel.js';
import { ParetoChart } from '/js/charts/pareto-chart.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (Math.round(n * 10) / 10).toFixed(1) + '%';
const fmt2   = n => '$' + Math.abs(n).toFixed(2);

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

const el   = id => document.getElementById(id);
const val  = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

function table(cols, rows, foot) {
  const thead = '<thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
  const tfoot = foot ? '<tfoot><tr>' + foot.map(c => '<td><strong>' + c + '</strong></td>').join('') + '</tr></tfoot>' : '';
  return '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">' + thead + tbody + tfoot + '</table></div>';
}

function insight(text) {
  return '<div class="ch12-insight" style="margin-top:var(--space-4);">' + text + '</div>';
}

function panel(title, body, note) {
  return '<div style="flex:1 1 300px;min-width:280px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-3);color:var(--color-primary-text);">' + title + '</div>'
    + '<div style="overflow-x:auto;">' + body + '</div>'
    + (note ? '<p style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin:var(--space-3) 0 0;font-style:italic;">' + note + '</p>' : '')
    + '</div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- COQ Report Builder
// ══════════════════════════════════════════════════════════════════════════════

function calcCOQ() {
  const revY1   = val('coq-revenue-y1');
  const revY2   = val('coq-revenue-y2');
  const prevY1  = val('coq-prev-y1');
  const prevY2  = val('coq-prev-y2');
  const apprY1  = val('coq-appr-y1');
  const apprY2  = val('coq-appr-y2');
  const intY1   = val('coq-int-y1');
  const intY2   = val('coq-int-y2');
  const extY1   = val('coq-ext-y1');
  const extY2   = val('coq-ext-y2');

  const confY1  = prevY1 + apprY1;
  const confY2  = prevY2 + apprY2;
  const failY1  = intY1 + extY1;
  const failY2  = intY2 + extY2;
  const totalY1 = confY1 + failY1;
  const totalY2 = confY2 + failY2;

  const pctRev = (v, rev) => rev > 0 ? fmtPct(v / rev * 100) : '—';
  const chg    = (y1, y2) => {
    const d = y2 - y1;
    const cls = d <= 0 ? 'variance-fav' : 'variance-unfav';
    return '<span class="' + cls + '">' + (d >= 0 ? '+' : '') + fmt(d) + '</span>';
  };

  const rows = [
    ['Prevention Costs', fmt(prevY1), pctRev(prevY1, revY1), fmt(prevY2), pctRev(prevY2, revY2), chg(prevY1, prevY2)],
    ['Appraisal Costs',  fmt(apprY1), pctRev(apprY1, revY1), fmt(apprY2), pctRev(apprY2, revY2), chg(apprY1, apprY2)],
    ['<strong>Total Conformance</strong>', '<strong>' + fmt(confY1) + '</strong>', pctRev(confY1, revY1), '<strong>' + fmt(confY2) + '</strong>', pctRev(confY2, revY2), chg(confY1, confY2)],
    ['Internal Failure', fmt(intY1), pctRev(intY1, revY1), fmt(intY2), pctRev(intY2, revY2), chg(intY1, intY2)],
    ['External Failure', fmt(extY1), pctRev(extY1, revY1), fmt(extY2), pctRev(extY2, revY2), chg(extY1, extY2)],
    ['<strong>Total Nonconformance</strong>', '<strong>' + fmt(failY1) + '</strong>', pctRev(failY1, revY1), '<strong>' + fmt(failY2) + '</strong>', pctRev(failY2, revY2), chg(failY1, failY2)],
  ];

  const foot = ['Total Quality Costs', fmt(totalY1), pctRev(totalY1, revY1), fmt(totalY2), pctRev(totalY2, revY2), chg(totalY1, totalY2)];

  const netSavings = (failY1 - failY2) - (confY2 - confY1);
  const isImproving = totalY2 < totalY1;

  const out = getOrCreate('coq-output', 'div', 'tool-output', el('coq-calculate').parentElement);
  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + table(['Category', 'Year 1', '% Rev', 'Year 2', '% Rev', 'Change'], rows, foot)
    + insight(
        isImproving
          ? 'Total quality costs decreased by <strong>' + fmt(totalY1 - totalY2) + '</strong>. '
            + 'Conformance spending increased by <strong>' + fmt(confY2 - confY1) + '</strong> '
            + 'while failure costs fell by <strong>' + fmt(failY1 - failY2) + '</strong>. '
            + 'Net return on quality investment: <strong>' + fmt(netSavings) + '</strong>.'
          : 'Total quality costs increased by <strong>' + fmt(totalY2 - totalY1) + '</strong>. '
            + 'Review whether conformance spending is being directed at the right prevention activities.'
      )
    + '</div>';

  renderShowWork(el('coq-show-work'), [
    { label: 'Year 1 Conformance Costs', formula: 'Prevention + Appraisal', values: fmt(prevY1) + ' + ' + fmt(apprY1), result: fmt(confY1) },
    { label: 'Year 1 Nonconformance Costs', formula: 'Internal Failure + External Failure', values: fmt(intY1) + ' + ' + fmt(extY1), result: fmt(failY1) },
    { label: 'Year 1 Total COQ', formula: 'Conformance + Nonconformance', values: fmt(confY1) + ' + ' + fmt(failY1), result: fmt(totalY1) },
    { label: 'Year 1 COQ as % of Revenue', formula: 'Total COQ / Revenue', values: fmt(totalY1) + ' / ' + fmt(revY1), result: pctRev(totalY1, revY1) },
    { label: 'Year 2 Total COQ', formula: 'Conformance + Nonconformance', values: fmt(confY2) + ' + ' + fmt(failY2), result: fmt(totalY2) },
    { label: 'Year 2 COQ as % of Revenue', formula: 'Total COQ / Revenue', values: fmt(totalY2) + ' / ' + fmt(revY2), result: pctRev(totalY2, revY2) },
    { label: 'Net Return on Quality Investment', formula: 'Failure cost reduction - Conformance cost increase', values: fmt(failY1 - failY2) + ' - ' + fmt(confY2 - confY1), result: fmt(netSavings), highlight: true },
  ], { title: 'COQ Report Show Work', defaultOpen: false });
}

function initCOQ() {
  const btn = el('coq-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcCOQ);

  el('coq-load-example') && el('coq-load-example').addEventListener('click', () => {
    setVal('coq-revenue-y1', 10000000); setVal('coq-revenue-y2', 11000000);
    setVal('coq-prev-y1', 400000);  setVal('coq-prev-y2', 600000);
    setVal('coq-appr-y1', 300000);  setVal('coq-appr-y2', 350000);
    setVal('coq-int-y1', 800000);   setVal('coq-int-y2', 500000);
    setVal('coq-ext-y1', 1200000);  setVal('coq-ext-y2', 700000);
    calcCOQ();
  });

  initRandomizer('coq-randomize', [
    { id: 'coq-revenue-y1', min: 5000000,  max: 50000000, step: 500000,  integer: true },
    { id: 'coq-revenue-y2', min: 5000000,  max: 55000000, step: 500000,  integer: true },
    { id: 'coq-prev-y1',    min: 100000,   max: 1000000,  step: 50000,   integer: true },
    { id: 'coq-prev-y2',    min: 100000,   max: 1200000,  step: 50000,   integer: true },
    { id: 'coq-appr-y1',    min: 100000,   max: 800000,   step: 50000,   integer: true },
    { id: 'coq-appr-y2',    min: 100000,   max: 900000,   step: 50000,   integer: true },
    { id: 'coq-int-y1',     min: 200000,   max: 2000000,  step: 100000,  integer: true },
    { id: 'coq-int-y2',     min: 100000,   max: 1800000,  step: 100000,  integer: true },
    { id: 'coq-ext-y1',     min: 300000,   max: 3000000,  step: 100000,  integer: true },
    { id: 'coq-ext-y2',     min: 100000,   max: 2500000,  step: 100000,  integer: true },
  ], calcCOQ);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Quality Cost Trade-off Analyzer
// ══════════════════════════════════════════════════════════════════════════════

function calcTradeoff() {
  const revenue     = val('toa-revenue');
  const maxFailure  = val('toa-max-failure');
  const currentConf = val('toa-conformance-budget');
  const elasticity  = val('toa-failure-elasticity');

  // Model: failure cost = maxFailure / (1 + elasticity * conformance/revenue)
  // Total cost = conformance + failure cost
  const steps = 20;
  const maxConf = revenue * 0.25;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const conf = (i / steps) * maxConf;
    const fail = maxFailure / (1 + elasticity * conf / revenue);
    const total = conf + fail;
    points.push({ conf, fail, total });
  }

  const optimal = points.reduce((best, p) => p.total < best.total ? p : best, points[0]);
  const currentFail = maxFailure / (1 + elasticity * currentConf / revenue);
  const currentTotal = currentConf + currentFail;
  const potentialSavings = currentTotal - optimal.total;

  const tableRows = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(mult => {
    const conf  = optimal.conf * mult;
    const fail  = maxFailure / (1 + elasticity * conf / revenue);
    const total = conf + fail;
    const isCurrent = Math.abs(conf - currentConf) < optimal.conf * 0.15;
    const isOpt     = Math.abs(conf - optimal.conf) < optimal.conf * 0.05;
    return [
      fmt(Math.round(conf)),
      fmtPct(conf / revenue * 100),
      fmt(Math.round(fail)),
      fmtPct(fail / revenue * 100),
      '<strong>' + fmt(Math.round(total)) + '</strong>',
      isCurrent ? '<span class="chapter-badge">Current</span>' : isOpt ? '<span class="chapter-badge chapter-badge--control">Optimal</span>' : '',
    ];
  });

  const out = getOrCreate('toa-output', 'div', 'tool-output', el('toa-calculate').parentElement);
  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-5);">'
    + panel('Current Position',
        '<p style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt(Math.round(currentTotal)) + '</p>'
        + '<p>Conformance: ' + fmt(Math.round(currentConf)) + ' (' + fmtPct(currentConf / revenue * 100) + ' of revenue)</p>'
        + '<p>Failure: ' + fmt(Math.round(currentFail)) + ' (' + fmtPct(currentFail / revenue * 100) + ' of revenue)</p>',
        'Total quality cost at current conformance spending level.'
      )
    + panel('Optimal Position',
        '<p style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-success);">' + fmt(Math.round(optimal.total)) + '</p>'
        + '<p>Conformance: ' + fmt(Math.round(optimal.conf)) + ' (' + fmtPct(optimal.conf / revenue * 100) + ' of revenue)</p>'
        + '<p>Failure: ' + fmt(Math.round(optimal.fail)) + ' (' + fmtPct(optimal.fail / revenue * 100) + ' of revenue)</p>',
        'Conformance spending level that minimizes total quality cost.'
      )
    + panel('Potential Savings',
        '<p style="font-size:var(--font-size-2xl);font-weight:800;color:' + (potentialSavings > 0 ? 'var(--color-success)' : 'var(--color-gray-500)') + ';">' + fmt(Math.round(Math.abs(potentialSavings))) + '</p>'
        + '<p>' + (potentialSavings > 0 ? 'Moving to optimal conformance spending could save this amount annually.' : 'Current spending is at or near the optimal level.') + '</p>',
        'Difference between current total quality cost and optimal total quality cost.'
      )
    + '</div>'
    + table(
        ['Conformance Spend', '% Revenue', 'Failure Cost', '% Revenue', 'Total Quality Cost', ''],
        tableRows,
        null
      )
    + insight('The trade-off: every dollar of conformance spending reduces failure costs by approximately <strong>' + elasticity.toFixed(1) + 'x</strong> until diminishing returns set in. The optimal point is where the marginal cost of conformance equals the marginal reduction in failure costs.')
    + '</div>';

  renderShowWork(el('toa-show-work'), [
    { label: 'Current Failure Cost', formula: 'Max Failure / (1 + elasticity x conformance/revenue)', values: fmt(maxFailure) + ' / (1 + ' + elasticity + ' x ' + fmt(currentConf) + ' / ' + fmt(revenue) + ')', result: fmt(Math.round(currentFail)) },
    { label: 'Current Total Quality Cost', formula: 'Conformance + Failure', values: fmt(currentConf) + ' + ' + fmt(Math.round(currentFail)), result: fmt(Math.round(currentTotal)) },
    { label: 'Optimal Conformance Spending', formula: 'Spending level that minimizes total quality cost', values: 'Solved numerically across 20 spending levels', result: fmt(Math.round(optimal.conf)), highlight: true },
    { label: 'Optimal Total Quality Cost', formula: 'Conformance + Failure at optimal point', values: fmt(Math.round(optimal.conf)) + ' + ' + fmt(Math.round(optimal.fail)), result: fmt(Math.round(optimal.total)), highlight: true },
    { label: 'Potential Annual Savings', formula: 'Current total - Optimal total', values: fmt(Math.round(currentTotal)) + ' - ' + fmt(Math.round(optimal.total)), result: fmt(Math.round(potentialSavings)) },
  ], { title: 'Quality Cost Trade-off Show Work', defaultOpen: false });
}

function initTradeoff() {
  const btn = el('toa-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcTradeoff);

  el('toa-load-example') && el('toa-load-example').addEventListener('click', () => {
    setVal('toa-revenue', 10000000);
    setVal('toa-max-failure', 3000000);
    setVal('toa-conformance-budget', 700000);
    setVal('toa-failure-elasticity', 2.5);
    calcTradeoff();
  });

  initRandomizer('toa-randomize', [
    { id: 'toa-revenue',             min: 5000000,  max: 50000000, step: 1000000, integer: true },
    { id: 'toa-max-failure',         min: 500000,   max: 10000000, step: 250000,  integer: true },
    { id: 'toa-conformance-budget',  min: 100000,   max: 3000000,  step: 100000,  integer: true },
    { id: 'toa-failure-elasticity',  min: 1.0,      max: 5.0,      step: 0.25 },
  ], calcTradeoff);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Nonfinancial Quality Measures
// ══════════════════════════════════════════════════════════════════════════════

function calcNFQ() {
  const measures = [
    { name: 'Defect Rate (%)',          lowerIsBetter: true,  target: val('nfq-defect-target'),    prior: val('nfq-defect-prior'),    current: val('nfq-defect-current'),    unit: '% of units' },
    { name: 'On-Time Delivery (%)',     lowerIsBetter: false, target: val('nfq-otd-target'),       prior: val('nfq-otd-prior'),       current: val('nfq-otd-current'),       unit: '%' },
    { name: 'Customer Satisfaction (%)',lowerIsBetter: false, target: val('nfq-sat-target'),       prior: val('nfq-sat-prior'),       current: val('nfq-sat-current'),       unit: '% satisfied' },
    { name: 'Warranty Claims',          lowerIsBetter: true,  target: val('nfq-warranty-target'),  prior: val('nfq-warranty-prior'),  current: val('nfq-warranty-current'),  unit: 'per month' },
    { name: 'Customer Complaints',      lowerIsBetter: true,  target: val('nfq-complaints-target'),prior: val('nfq-complaints-prior'),current: val('nfq-complaints-current'),unit: 'per month' },
  ];

  function status(m) {
    const atTarget = m.lowerIsBetter ? m.current <= m.target : m.current >= m.target;
    const improving = m.lowerIsBetter ? m.current < m.prior : m.current > m.prior;
    if (atTarget) return { label: 'On Target', color: 'var(--color-success)', bg: 'var(--color-success-bg, #1a3a2a)' };
    if (improving) return { label: 'Improving', color: 'var(--color-accent)', bg: 'var(--color-warning-bg, #3a2a00)' };
    return { label: 'Off Target', color: 'var(--color-danger)', bg: 'var(--color-danger-bg, #3a1a1a)' };
  }

  function trend(m) {
    const d = m.current - m.prior;
    const good = m.lowerIsBetter ? d < 0 : d > 0;
    const cls = good ? 'variance-fav' : 'variance-unfav';
    return '<span class="' + cls + '">' + (d >= 0 ? '+' : '') + (Math.round(d * 10) / 10) + '</span>';
  }

  const rows = measures.map(m => {
    const s = status(m);
    return [
      m.name,
      m.target + ' ' + m.unit,
      m.prior + ' ' + m.unit,
      m.current + ' ' + m.unit,
      trend(m),
      '<span style="background:' + s.bg + ';color:' + s.color + ';padding:2px 8px;border-radius:4px;font-weight:700;font-size:var(--font-size-xs);">' + s.label + '</span>',
    ];
  });

  const onTarget  = measures.filter(m => { const s = status(m); return s.label === 'On Target'; }).length;
  const improving = measures.filter(m => { const s = status(m); return s.label === 'Improving'; }).length;
  const offTarget = measures.filter(m => { const s = status(m); return s.label === 'Off Target'; }).length;

  const out = getOrCreate('nfq-output', 'div', 'tool-output', el('nfq-calculate').parentElement);
  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + table(['Measure', 'Target', 'Prior Period', 'Current Period', 'Change', 'Status'], rows, null)
    + '<div style="display:flex;gap:var(--space-4);margin-top:var(--space-4);flex-wrap:wrap;">'
    + '<div style="flex:1;min-width:140px;text-align:center;padding:var(--space-4);background:var(--color-success-bg, #1a3a2a);border-radius:var(--radius-md);border:1px solid var(--color-success);">'
    + '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-success);">' + onTarget + '</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-success);">On Target</div></div>'
    + '<div style="flex:1;min-width:140px;text-align:center;padding:var(--space-4);background:var(--color-warning-bg, #3a2a00);border-radius:var(--radius-md);border:1px solid var(--color-accent);">'
    + '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-accent);">' + improving + '</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-accent);">Improving</div></div>'
    + '<div style="flex:1;min-width:140px;text-align:center;padding:var(--space-4);background:var(--color-danger-bg, #3a1a1a);border-radius:var(--radius-md);border:1px solid var(--color-danger);">'
    + '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-danger);">' + offTarget + '</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-danger);">Off Target</div></div>'
    + '</div>'
    + insight('Nonfinancial measures are leading indicators. Improvements in defect rates and customer satisfaction typically precede improvements in financial quality costs by one to two periods.')
    + '</div>';
}

function initNFQ() {
  const btn = el('nfq-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcNFQ);

  el('nfq-load-example') && el('nfq-load-example').addEventListener('click', () => {
    setVal('nfq-defect-target', 1.0);    setVal('nfq-defect-prior', 3.2);    setVal('nfq-defect-current', 2.1);
    setVal('nfq-otd-target', 98);        setVal('nfq-otd-prior', 91);        setVal('nfq-otd-current', 94);
    setVal('nfq-sat-target', 90);        setVal('nfq-sat-prior', 82);        setVal('nfq-sat-current', 86);
    setVal('nfq-warranty-target', 50);   setVal('nfq-warranty-prior', 180);  setVal('nfq-warranty-current', 120);
    setVal('nfq-complaints-target', 10); setVal('nfq-complaints-prior', 45); setVal('nfq-complaints-current', 28);
    calcNFQ();
  });

  initRandomizer('nfq-randomize', [
    { id: 'nfq-defect-target',      min: 0.5,  max: 3,    step: 0.1 },
    { id: 'nfq-defect-prior',       min: 1,    max: 8,    step: 0.1 },
    { id: 'nfq-defect-current',     min: 0.5,  max: 7,    step: 0.1 },
    { id: 'nfq-otd-target',         min: 90,   max: 99,   step: 1 },
    { id: 'nfq-otd-prior',          min: 75,   max: 98,   step: 1 },
    { id: 'nfq-otd-current',        min: 78,   max: 99,   step: 1 },
    { id: 'nfq-sat-target',         min: 85,   max: 99,   step: 1 },
    { id: 'nfq-sat-prior',          min: 70,   max: 95,   step: 1 },
    { id: 'nfq-sat-current',        min: 72,   max: 97,   step: 1 },
    { id: 'nfq-warranty-target',    min: 10,   max: 100,  step: 5,  integer: true },
    { id: 'nfq-warranty-prior',     min: 50,   max: 300,  step: 10, integer: true },
    { id: 'nfq-warranty-current',   min: 30,   max: 250,  step: 10, integer: true },
    { id: 'nfq-complaints-target',  min: 5,    max: 30,   step: 1,  integer: true },
    { id: 'nfq-complaints-prior',   min: 20,   max: 100,  step: 5,  integer: true },
    { id: 'nfq-complaints-current', min: 15,   max: 90,   step: 5,  integer: true },
  ], calcNFQ);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- MCE Calculator
// ══════════════════════════════════════════════════════════════════════════════

function calcMCE() {
  const processing = val('mce-processing');
  const inspection = val('mce-inspection');
  const waiting    = val('mce-waiting');
  const moving     = val('mce-moving');
  const targetMCE  = val('mce-target-mce') / 100;

  const cycleTime  = processing + inspection + waiting + moving;
  const mce        = cycleTime > 0 ? processing / cycleTime : 0;
  const nvaTime    = inspection + waiting + moving;

  const timeToTarget = targetMCE > 0 && targetMCE < 1
    ? processing / targetMCE - cycleTime
    : 0;
  const nvaReduction = Math.abs(timeToTarget);
  const targetAchievable = targetMCE <= mce || nvaTime >= nvaReduction;

  const mceColor = mce >= 0.8 ? 'var(--color-success)' : mce >= 0.5 ? 'var(--color-accent)' : 'var(--color-danger)';

  const componentRows = [
    ['Processing Time (value-added)', processing.toFixed(1) + ' hrs', fmtPct(processing / cycleTime * 100), '<span class="variance-fav">Value-Added</span>'],
    ['Inspection Time', inspection.toFixed(1) + ' hrs', fmtPct(inspection / cycleTime * 100), '<span class="variance-unfav">Non-Value-Added</span>'],
    ['Waiting Time', waiting.toFixed(1) + ' hrs', fmtPct(waiting / cycleTime * 100), '<span class="variance-unfav">Non-Value-Added</span>'],
    ['Moving Time', moving.toFixed(1) + ' hrs', fmtPct(moving / cycleTime * 100), '<span class="variance-unfav">Non-Value-Added</span>'],
  ];

  const out = getOrCreate('mce-output', 'div', 'tool-output', el('mce-calculate').parentElement);
  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-5);">'
    + panel('Manufacturing Cycle Time',
        '<p style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + cycleTime.toFixed(1) + ' hours</p>'
        + '<p>Value-added: ' + processing.toFixed(1) + ' hrs</p>'
        + '<p>Non-value-added: ' + nvaTime.toFixed(1) + ' hrs</p>',
        'Total time from order receipt to delivery.'
      )
    + panel('Manufacturing Cycle Efficiency',
        '<p style="font-size:var(--font-size-2xl);font-weight:800;color:' + mceColor + ';">' + fmtPct(mce * 100) + '</p>'
        + '<p>' + (mce >= 0.8 ? 'Excellent -- minimal waste in the process.' : mce >= 0.5 ? 'Moderate -- significant improvement opportunity.' : 'Low -- majority of time is non-value-added.') + '</p>',
        'MCE = Processing Time / Manufacturing Cycle Time. Perfect MCE = 100%.'
      )
    + panel('To Reach ' + fmtPct(targetMCE * 100) + ' MCE Target',
        targetMCE <= mce
          ? '<p style="color:var(--color-success);font-weight:700;">Target already achieved.</p>'
          : '<p>Reduce non-value-added time by <strong>' + nvaReduction.toFixed(1) + ' hours</strong></p>'
            + '<p>From ' + nvaTime.toFixed(1) + ' hrs to ' + (nvaTime - nvaReduction).toFixed(1) + ' hrs NVA</p>',
        'Assumes processing time stays constant.'
      )
    + '</div>'
    + table(['Component', 'Time', '% of Cycle', 'Type'], componentRows,
        ['Total Cycle Time', cycleTime.toFixed(1) + ' hrs', '100%', ''])
    + insight('The largest non-value-added component is <strong>' + (waiting >= inspection && waiting >= moving ? 'waiting time' : inspection >= moving ? 'inspection time' : 'moving time') + '</strong> at ' + fmtPct(Math.max(inspection, waiting, moving) / cycleTime * 100) + ' of cycle time. Reducing waiting time through better scheduling and reducing inspection through prevention-based quality programs are the highest-leverage improvements.')
    + '</div>';

  renderShowWork(el('mce-show-work'), [
    { label: 'Manufacturing Cycle Time', formula: 'Processing + Inspection + Waiting + Moving', values: processing + ' + ' + inspection + ' + ' + waiting + ' + ' + moving, result: cycleTime.toFixed(1) + ' hours' },
    { label: 'Non-Value-Added Time', formula: 'Inspection + Waiting + Moving', values: inspection + ' + ' + waiting + ' + ' + moving, result: nvaTime.toFixed(1) + ' hours' },
    { label: 'Manufacturing Cycle Efficiency', formula: 'Processing Time / Manufacturing Cycle Time', values: processing + ' / ' + cycleTime.toFixed(1), result: fmtPct(mce * 100), highlight: true },
    { label: 'NVA Time Reduction to Hit Target', formula: 'Processing / Target MCE - Current Cycle Time', values: processing + ' / ' + targetMCE.toFixed(2) + ' - ' + cycleTime.toFixed(1), result: nvaReduction.toFixed(1) + ' hours to eliminate' },
  ], { title: 'MCE Show Work', defaultOpen: false });
}

function initMCE() {
  const btn = el('mce-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcMCE);

  el('mce-load-example') && el('mce-load-example').addEventListener('click', () => {
    setVal('mce-processing', 8);
    setVal('mce-inspection', 3);
    setVal('mce-waiting', 12);
    setVal('mce-moving', 5);
    setVal('mce-target-mce', 80);
    calcMCE();
  });

  initRandomizer('mce-randomize', [
    { id: 'mce-processing',  min: 2,  max: 24,  step: 0.5 },
    { id: 'mce-inspection',  min: 0,  max: 12,  step: 0.5 },
    { id: 'mce-waiting',     min: 0,  max: 48,  step: 1 },
    { id: 'mce-moving',      min: 0,  max: 10,  step: 0.5 },
    { id: 'mce-target-mce',  min: 50, max: 95,  step: 5,  integer: true },
  ], calcMCE);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Pareto Diagram Builder
// ══════════════════════════════════════════════════════════════════════════════

const PARETO_DEFAULTS = [
  { label: 'Scratches',       value: 42 },
  { label: 'Dimensional',     value: 28 },
  { label: 'Surface Finish',  value: 19 },
  { label: 'Assembly Error',  value: 14 },
  { label: 'Missing Parts',   value: 9  },
  { label: 'Wrong Color',     value: 6  },
  { label: 'Packaging',       value: 4  },
  { label: 'Other',           value: 3  },
];

let paretoChart = null;

function buildParetoInputs(data) {
  const grid = el('pareto-inputs-grid');
  if (!grid) return;
  grid.innerHTML = '';
  data.forEach((d, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:var(--space-2);align-items:center;';
    row.innerHTML = '<input class="form-input" type="text" id="pareto-label-' + i + '" value="' + d.label + '" placeholder="Defect type" style="flex:2;" />'
      + '<input class="form-input" type="number" id="pareto-value-' + i + '" value="' + d.value + '" min="0" step="1" placeholder="Count" style="flex:1;" />';
    grid.appendChild(row);
  });
}

function readParetoData() {
  const data = [];
  for (let i = 0; i < 8; i++) {
    const labelEl = el('pareto-label-' + i);
    const valueEl = el('pareto-value-' + i);
    if (!labelEl || !valueEl) continue;
    const label = labelEl.value.trim();
    const value = parseFloat(valueEl.value) || 0;
    if (label && value > 0) data.push({ label, value });
  }
  return data;
}

function buildPareto() {
  const data  = readParetoData();
  const title = el('pareto-title') ? el('pareto-title').value.trim() || 'Defect Analysis' : 'Defect Analysis';
  const canvas = el('pareto-canvas');
  if (!canvas || !data.length) return;

  if (paretoChart) {
    paretoChart.update({ data, title });
  } else {
    paretoChart = new ParetoChart(canvas, { data, title });
  }
}

function initPareto() {
  buildParetoInputs(PARETO_DEFAULTS);

  const buildBtn = el('pareto-build');
  if (buildBtn) buildBtn.addEventListener('click', buildPareto);

  el('pareto-load-example') && el('pareto-load-example').addEventListener('click', () => {
    buildParetoInputs(PARETO_DEFAULTS);
    buildPareto();
  });

  el('pareto-randomize') && el('pareto-randomize').addEventListener('click', () => {
    const labels = ['Scratches', 'Cracks', 'Warping', 'Discoloration', 'Assembly', 'Leaks', 'Missing Parts', 'Packaging'];
    const data = labels.map(label => ({
      label,
      value: Math.floor(Math.random() * 80) + 2,
    }));
    buildParetoInputs(data);
    buildPareto();
  });

  window.addEventListener('resize', () => {
    if (paretoChart) paretoChart.handleResize();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Cost of Quality (COQ)', definition: 'The costs incurred to prevent defects or that arise as a result of defects. Includes prevention, appraisal, internal failure, and external failure costs.' },
  { term: 'Prevention Costs', definition: 'Costs incurred to preclude the production of products that do not conform to specifications. Examples: design engineering, process engineering, supplier evaluation, and quality training.' },
  { term: 'Appraisal Costs', definition: 'Costs incurred to detect which individual units do not conform to specifications. Examples: inspection of materials, work-in-process testing, and finished goods inspection.' },
  { term: 'Internal Failure Costs', definition: 'Costs incurred on defective products before they are shipped to customers. Examples: scrap, rework, and re-inspection of reworked products.' },
  { term: 'External Failure Costs', definition: 'Costs incurred on defective products after they are shipped to customers. Examples: warranty repairs, customer returns, and lost future sales.' },
  { term: 'Conformance Costs', definition: 'The sum of prevention costs and appraisal costs. Costs incurred to ensure products meet quality standards.' },
  { term: 'Nonconformance Costs', definition: 'The sum of internal failure costs and external failure costs. Costs incurred because products fail to meet quality standards.' },
  { term: 'Manufacturing Cycle Time', definition: 'The time from when a customer order is received until the finished product is delivered. Includes processing, inspection, waiting, and moving time.' },
  { term: 'Manufacturing Cycle Efficiency (MCE)', definition: 'The ratio of value-added (processing) time to manufacturing cycle time. MCE = Processing Time / Manufacturing Cycle Time. A perfect MCE equals 1.0.' },
  { term: 'Value-Added Time', definition: 'Time that actually transforms the product in ways the customer values. Only processing time is value-added.' },
  { term: 'Non-Value-Added Time', definition: 'Time spent on inspection, waiting, and moving that does not transform the product. Reducing NVA time improves MCE and reduces costs.' },
  { term: 'Pareto Diagram', definition: 'A bar chart that ranks causes of a problem from most to least frequent, with a cumulative percentage line. Used to identify the vital few causes responsible for most defects.' },
  { term: 'Customer Response Time', definition: 'The time between a customer placing an order and the product being delivered. A key time-based performance measure.' },
  { term: 'On-Time Performance', definition: 'The percentage of orders delivered by the promised date. A nonfinancial quality measure that is a leading indicator of customer satisfaction.' },
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

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER COMPLETE
// ══════════════════════════════════════════════════════════════════════════════

function injectResetButton(card) {
  if (el('ch20-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch20-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch20');
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
  const status = el('ch20-status');
  if (!btn || !card) return;

  if (isChapterComplete('ch20')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }

  btn.addEventListener('click', () => {
    markChapterComplete('ch20');
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
  initSettingsPanel();
  initCOQ();
  initTradeoff();
  initNFQ();
  initMCE();
  initPareto();
  initKeyTerms();
  initChapterComplete();
});
