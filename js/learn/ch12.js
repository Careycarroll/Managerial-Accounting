import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initHeader } from '/js/components/header.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtN   = n => Math.round(n).toLocaleString();
const fmtD   = n => n >= 0 ? fmt(n) : '(' + fmt(n) + ')';
const fmtPct = n => (n * 100).toFixed(1) + '%';

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


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Relevant Cost Identifier
// ═══════════════════════════════════════════════════════════════════════════════

const PRECISION_DATA = [
  { label: 'Revenues',               alt1: 6250000,  alt2: 6250000,  differs: false, type: 'revenue' },
  { label: 'Direct Materials',       alt1: 1250000,  alt2: 1250000,  differs: false, type: 'cost' },
  { label: 'Manufacturing Labor',    alt1: 640000,   alt2: 480000,   differs: true,  type: 'cost' },
  { label: 'Manufacturing Overhead', alt1: 750000,   alt2: 750000,   differs: false, type: 'cost' },
  { label: 'Marketing Costs',        alt1: 2000000,  alt2: 2000000,  differs: false, type: 'cost' },
  { label: 'Reorganization Costs',   alt1: 0,        alt2: 90000,    differs: true,  type: 'cost' }
];

let t1Rows = [];

function buildT1Table(data) {
  const container = document.getElementById('t1-line-items');
  container.innerHTML = '';
  t1Rows = [];

  const alt1Name = sval('t1-alt1-name') || 'Alternative 1';
  const alt2Name = sval('t1-alt2-name') || 'Alternative 2';

  const header = document.createElement('div');
  header.className = 'ch12-t1-header';
  header.innerHTML = '<div class="ch12-t1-col ch12-t1-col--label">Line Item</div>'
    + '<div class="ch12-t1-col ch12-t1-col--amt">' + alt1Name + '</div>'
    + '<div class="ch12-t1-col ch12-t1-col--amt">' + alt2Name + '</div>'
    + '<div class="ch12-t1-col ch12-t1-col--check">Differs?</div>'
    + '<div class="ch12-t1-col ch12-t1-col--type">Type</div>';
  container.appendChild(header);

  data.forEach((row, i) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'ch12-t1-row';
    rowEl.innerHTML = '<div class="ch12-t1-col ch12-t1-col--label">'
      + '<input class="form-input form-input--sm" type="text" data-col="label" data-idx="' + i + '" value="' + row.label + '" /></div>'
      + '<div class="ch12-t1-col ch12-t1-col--amt">'
      + '<input class="form-input form-input--sm" type="number" data-col="alt1" data-idx="' + i + '" value="' + row.alt1 + '" step="1000" /></div>'
      + '<div class="ch12-t1-col ch12-t1-col--amt">'
      + '<input class="form-input form-input--sm" type="number" data-col="alt2" data-idx="' + i + '" value="' + row.alt2 + '" step="1000" /></div>'
      + '<div class="ch12-t1-col ch12-t1-col--check">'
      + '<input type="checkbox" data-col="differs" data-idx="' + i + '" ' + (row.differs ? 'checked' : '') + ' style="width:18px;height:18px;cursor:pointer;" /></div>'
      + '<div class="ch12-t1-col ch12-t1-col--type">'
      + '<select class="form-input form-input--sm" data-col="type" data-idx="' + i + '">'
      + '<option value="revenue" ' + (row.type === 'revenue' ? 'selected' : '') + '>Revenue</option>'
      + '<option value="cost" ' + (row.type === 'cost' ? 'selected' : '') + '>Cost</option>'
      + '</select></div>';
    container.appendChild(rowEl);
    t1Rows.push(rowEl);
  });
}

function readT1Rows() {
  const container = document.getElementById('t1-line-items');
  const rows = [];
  container.querySelectorAll('.ch12-t1-row').forEach(rowEl => {
    const label   = rowEl.querySelector('[data-col="label"]').value.trim();
    const alt1    = parseFloat(rowEl.querySelector('[data-col="alt1"]').value) || 0;
    const alt2    = parseFloat(rowEl.querySelector('[data-col="alt2"]').value) || 0;
    const differs = rowEl.querySelector('[data-col="differs"]').checked;
    const type    = rowEl.querySelector('[data-col="type"]').value;
    rows.push({ label, alt1, alt2, differs, type });
  });
  return rows;
}

function calcTool1() {
  const rows     = readT1Rows();
  const alt1Name = sval('t1-alt1-name') || 'Alternative 1';
  const alt2Name = sval('t1-alt2-name') || 'Alternative 2';

  // Compute totals: revenue - costs for each alternative
  let total1All = 0, total2All = 0;
  let total1Rel = 0, total2Rel = 0;

  rows.forEach(r => {
    const sign = r.type === 'revenue' ? 1 : -1;
    total1All += sign * r.alt1;
    total2All += sign * r.alt2;
    if (r.differs) {
      total1Rel += sign * r.alt1;
      total2Rel += sign * r.alt2;
    }
  });

  const diffAll = total2All - total1All;
  const diffRel = total2Rel - total1Rel;
  const preferred = diffAll >= 0 ? alt2Name : alt1Name;

  const rowsHTML = rows.map(r => {
    const sign    = r.type === 'revenue' ? 1 : -1;
    const diff    = sign * (r.alt2 - r.alt1);
    const relClass = r.differs ? 'ch12-t1-result__row--relevant' : 'ch12-t1-result__row--irrelevant';
    const badge   = r.differs
      ? '<span class="ch12-badge ch12-badge--relevant">Relevant</span>'
      : '<span class="ch12-badge ch12-badge--irrelevant">Irrelevant</span>';
    return '<tr class="' + relClass + '">'
      + '<td>' + r.label + ' ' + badge + '</td>'
      + '<td>' + (r.type === 'revenue' ? fmt(r.alt1) : '(' + fmt(r.alt1) + ')') + '</td>'
      + '<td>' + (r.type === 'revenue' ? fmt(r.alt2) : '(' + fmt(r.alt2) + ')') + '</td>'
      + '<td>' + (r.differs ? (diff >= 0 ? '+' + fmt(diff) : '-' + fmt(Math.abs(diff))) : '—') + '</td>'
      + '</tr>';
  }).join('');

  const out = getOrCreate('t1-output', 'div', 'tool-output',
    document.getElementById('t1-output').parentElement);

  out.innerHTML = '<div class="ch12-t1-result">'
    + '<table class="ch12-result-table">'
    + '<thead><tr><th>Line Item</th><th>' + alt1Name + '</th><th>' + alt2Name + '</th><th>Difference</th></tr></thead>'
    + '<tbody>' + rowsHTML + '</tbody>'
    + '<tfoot>'
    + '<tr class="ch12-result-table__total"><td>Operating Income (All Items)</td><td>' + fmtD(total1All) + '</td><td>' + fmtD(total2All) + '</td><td>' + (diffAll >= 0 ? '+' : '') + fmtD(diffAll) + '</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Net Advantage (Relevant Items Only)</td><td>' + fmtD(total1Rel) + '</td><td>' + fmtD(total2Rel) + '</td><td>' + (diffRel >= 0 ? '+' : '') + fmtD(diffRel) + '</td></tr>'
    + '</tfoot>'
    + '</table>'
    + '<div class="ch12-verdict ' + (Math.abs(diffAll) < 1 ? 'ch12-verdict--neutral' : 'ch12-verdict--positive') + '">'
    + (Math.abs(diffAll) < 1
        ? 'Both alternatives produce equal operating income.'
        : 'Prefer <strong>' + preferred + '</strong> by <strong>' + fmt(Math.abs(diffAll)) + '</strong>. Both the all-items and relevant-only analyses reach the same conclusion.')
    + '</div>'
    + '<div class="ch12-insight">Irrelevant items are grayed out. They appear in both alternatives equally and cancel out -- including or excluding them does not change the decision.</div>'
    + '</div>';

  renderShowWork(document.getElementById('t1-show-work'), [
    { label: 'Relevant items only: ' + alt1Name, formula: 'Sum of revenues minus costs that differ', values: rows.filter(r => r.differs).map(r => r.label + ': ' + (r.type === 'revenue' ? '+' : '-') + fmt(r.alt1)).join(', '), result: fmtD(total1Rel) },
    { label: 'Relevant items only: ' + alt2Name, formula: 'Sum of revenues minus costs that differ', values: rows.filter(r => r.differs).map(r => r.label + ': ' + (r.type === 'revenue' ? '+' : '-') + fmt(r.alt2)).join(', '), result: fmtD(total2Rel) },
    { label: 'Net advantage of ' + alt2Name, formula: alt2Name + ' relevant total - ' + alt1Name + ' relevant total', values: fmtD(total2Rel) + ' - ' + fmtD(total1Rel), result: fmtD(diffRel), highlight: true },
    { label: 'Verification (all items)', formula: 'Full income comparison', values: fmtD(total2All) + ' - ' + fmtD(total1All), result: fmtD(diffAll), note: 'Same conclusion as relevant-only analysis' }
  ], { title: 'Relevant Cost Analysis', defaultOpen: false });
}

function initTool1() {
  buildT1Table(PRECISION_DATA);

  document.getElementById('t1-load-precision').addEventListener('click', () => {
    buildT1Table(PRECISION_DATA);
  });

  document.getElementById('t1-add-row').addEventListener('click', () => {
    const rows = readT1Rows();
    rows.push({ label: 'New Item', alt1: 0, alt2: 0, differs: false, type: 'cost' });
    buildT1Table(rows);
  });

  document.getElementById('t1-calculate').addEventListener('click', calcTool1);

  initRandomizer('t1-randomize', [
    { id: 't1-alt1-name', min: 0, max: 0, step: 1 }
  ], () => {
    const rows = readT1Rows();
    rows.forEach(r => {
      r.alt1 = Math.round((Math.random() * 800000 + 100000) / 10000) * 10000;
      const delta = Math.random() > 0.5 ? Math.round((Math.random() * 200000) / 10000) * 10000 : 0;
      r.alt2 = r.alt1 + (Math.random() > 0.5 ? delta : -delta);
      r.differs = r.alt1 !== r.alt2;
    });
    buildT1Table(rows);
    calcTool1();
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Special Order Analyzer
// ═══════════════════════════════════════════════════════════════════════════════

function calcTool2() {
  const capacity     = val('t2-capacity');
  const currentUnits = val('t2-current-units');
  const sp           = val('t2-selling-price');
  const varMfg       = val('t2-var-mfg');
  const fixedMfg     = val('t2-fixed-mfg');
  const varMktg      = val('t2-var-mktg');
  const fixedMktg    = val('t2-fixed-mktg');
  const orderUnits   = val('t2-order-units');
  const orderPrice   = val('t2-order-price');
  const orderVarMktg = val('t2-order-var-mktg');

  const idleCapacity   = capacity - currentUnits;
  const hasCapacity    = orderUnits <= idleCapacity;
  const relevantRev    = orderPrice * orderUnits;
  const relevantVarMfg = varMfg * orderUnits;
  const relevantVarMktg = orderVarMktg * orderUnits;
  const relevantCost   = relevantVarMfg + relevantVarMktg;
  const incrementalOI  = relevantRev - relevantCost;
  const accept         = hasCapacity && incrementalOI > 0;

  // Current income statement
  const currentRev  = sp * currentUnits;
  const currentVarMfg = varMfg * currentUnits;
  const currentVarMktg = varMktg * currentUnits;
  const currentCM   = currentRev - currentVarMfg - currentVarMktg;
  const currentOI   = currentCM - fixedMfg - fixedMktg;

  const withRev     = currentRev + relevantRev;
  const withVarMfg  = currentVarMfg + relevantVarMfg;
  const withVarMktg = currentVarMktg + relevantVarMktg;
  const withCM      = withRev - withVarMfg - withVarMktg;
  const withOI      = withCM - fixedMfg - fixedMktg;

  const out = getOrCreate('t2-output', 'div', 'tool-output',
    document.getElementById('t2-output').parentElement);

  const capacityBadge = hasCapacity
    ? '<span class="ch12-badge ch12-badge--relevant">Idle capacity available: ' + fmtN(idleCapacity) + ' units</span>'
    : '<span class="ch12-badge ch12-badge--irrelevant">Insufficient capacity: only ' + fmtN(idleCapacity) + ' units idle</span>';

  out.innerHTML = '<div class="ch12-special-order">'
    + '<div class="ch12-so-capacity">' + capacityBadge + '</div>'

    + '<div class="ch12-so-grid">'

    + '<div class="ch12-so-panel">'
    + '<div class="ch12-so-panel__title">Relevant Analysis (Special Order Only)</div>'
    + '<table class="ch12-result-table">'
    + '<tbody>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Incremental Revenue (' + fmtN(orderUnits) + ' x ' + fmt(orderPrice) + ')</td><td>' + fmt(relevantRev) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Incremental Variable Mfg (' + fmtN(orderUnits) + ' x ' + fmt(varMfg) + ')</td><td>(' + fmt(relevantVarMfg) + ')</td></tr>'
    + (orderVarMktg > 0 ? '<tr class="ch12-t1-result__row--relevant"><td>Incremental Variable Mktg (' + fmtN(orderUnits) + ' x ' + fmt(orderVarMktg) + ')</td><td>(' + fmt(relevantVarMktg) + ')</td></tr>' : '')
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Fixed Mfg Costs (unchanged)</td><td>—</td></tr>'
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Fixed Mktg Costs (unchanged)</td><td>—</td></tr>'
    + '</tbody>'
    + '<tfoot><tr class="ch12-result-table__relevant-total"><td>Incremental Operating Income</td><td class="' + (incrementalOI >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + fmtD(incrementalOI) + '</td></tr></tfoot>'
    + '</table>'
    + '</div>'

    + '<div class="ch12-so-panel">'
    + '<div class="ch12-so-panel__title">Full Income Statement Comparison</div>'
    + '<table class="ch12-result-table">'
    + '<thead><tr><th></th><th>Without Order</th><th>With Order</th><th>Difference</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>Revenues</td><td>' + fmt(currentRev) + '</td><td>' + fmt(withRev) + '</td><td>+' + fmt(relevantRev) + '</td></tr>'
    + '<tr><td>Variable Mfg</td><td>(' + fmt(currentVarMfg) + ')</td><td>(' + fmt(withVarMfg) + ')</td><td>(' + fmt(relevantVarMfg) + ')</td></tr>'
    + '<tr><td>Variable Mktg</td><td>(' + fmt(currentVarMktg) + ')</td><td>(' + fmt(withVarMktg) + ')</td><td>(' + fmt(relevantVarMktg) + ')</td></tr>'
    + '<tr><td>Contribution Margin</td><td>' + fmt(currentCM) + '</td><td>' + fmt(withCM) + '</td><td>+' + fmt(withCM - currentCM) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Fixed Mfg</td><td>(' + fmt(fixedMfg) + ')</td><td>(' + fmt(fixedMfg) + ')</td><td>—</td></tr>'
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Fixed Mktg</td><td>(' + fmt(fixedMktg) + ')</td><td>(' + fmt(fixedMktg) + ')</td><td>—</td></tr>'
    + '</tbody>'
    + '<tfoot><tr class="ch12-result-table__total"><td>Operating Income</td><td>' + fmtD(currentOI) + '</td><td>' + fmtD(withOI) + '</td><td class="' + (incrementalOI >= 0 ? 'variance-fav' : 'variance-unfav') + '">+' + fmtD(incrementalOI) + '</td></tr></tfoot>'
    + '</table>'
    + '</div>'

    + '</div>'

    + '<div class="ch12-verdict ' + (accept ? 'ch12-verdict--positive' : 'ch12-verdict--negative') + '">'
    + (hasCapacity
        ? (accept
            ? 'Accept the special order. Operating income increases by <strong>' + fmt(incrementalOI) + '</strong>. The order price of ' + fmt(orderPrice) + ' exceeds the relevant variable cost of ' + fmt(varMfg + orderVarMktg) + ' per unit.'
            : 'Reject the special order. Even with idle capacity, the order price of ' + fmt(orderPrice) + ' does not cover the relevant variable cost of ' + fmt(varMfg + orderVarMktg) + ' per unit.')
        : 'Reject the special order. Insufficient idle capacity -- the order requires ' + fmtN(orderUnits) + ' units but only ' + fmtN(idleCapacity) + ' units of idle capacity exist.')
    + '</div>'
    + '</div>';

  renderShowWork(document.getElementById('t2-show-work'), [
    { label: 'Idle Capacity Check', formula: 'Capacity - Current Production', values: fmtN(capacity) + ' - ' + fmtN(currentUnits), result: fmtN(idleCapacity) + ' units idle' },
    { label: 'Incremental Revenue', formula: 'Order Units x Order Price', values: fmtN(orderUnits) + ' x ' + fmt(orderPrice), result: fmt(relevantRev) },
    { label: 'Incremental Variable Cost', formula: 'Order Units x (Var Mfg + Var Mktg)', values: fmtN(orderUnits) + ' x (' + fmt(varMfg) + ' + ' + fmt(orderVarMktg) + ')', result: fmt(relevantCost) },
    { label: 'Incremental Operating Income', formula: 'Incremental Revenue - Incremental Variable Cost', values: fmt(relevantRev) + ' - ' + fmt(relevantCost), result: fmtD(incrementalOI), highlight: true },
    { label: 'Fixed Costs', formula: 'Fixed mfg and mktg costs do not change', values: 'Irrelevant -- same under both alternatives', result: 'Excluded from analysis' }
  ], { title: 'Special Order Analysis', defaultOpen: false });
}

function initTool2() {
  document.getElementById('t2-calculate').addEventListener('click', calcTool2);
  document.getElementById('t2-load-surfgear').addEventListener('click', () => {
    document.getElementById('t2-capacity').value      = 45000;
    document.getElementById('t2-current-units').value = 30000;
    document.getElementById('t2-selling-price').value = 20;
    document.getElementById('t2-var-mfg').value        = 7.50;
    document.getElementById('t2-fixed-mfg').value      = 202500;
    document.getElementById('t2-var-mktg').value       = 5.00;
    document.getElementById('t2-fixed-mktg').value     = 60000;
    document.getElementById('t2-order-units').value    = 5000;
    document.getElementById('t2-order-price').value    = 11;
    document.getElementById('t2-order-var-mktg').value = 0;
    calcTool2();
  });
  initRandomizer('t2-randomize', [
    { id: 't2-capacity',      min: 20000,  max: 100000, step: 5000,  integer: true },
    { id: 't2-current-units', min: 10000,  max: 70000,  step: 5000,  integer: true, constraint: 'lessThan:t2-capacity' },
    { id: 't2-selling-price', min: 10,     max: 100,    step: 5 },
    { id: 't2-var-mfg',       min: 3,      max: 40,     step: 1 },
    { id: 't2-fixed-mfg',     min: 50000,  max: 500000, step: 25000, integer: true },
    { id: 't2-var-mktg',      min: 1,      max: 15,     step: 1 },
    { id: 't2-fixed-mktg',    min: 20000,  max: 200000, step: 10000, integer: true },
    { id: 't2-order-units',   min: 1000,   max: 15000,  step: 1000,  integer: true },
    { id: 't2-order-price',   min: 5,      max: 80,     step: 5 }
  ], calcTool2);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Make-or-Buy and Opportunity Cost Calculator
// ═══════════════════════════════════════════════════════════════════════════════

function calcTool3() {
  const units         = val('t3-units');
  const buyPrice      = val('t3-buy-price');
  const varCost       = val('t3-var-cost');
  const avoidFixed    = val('t3-avoidable-fixed');
  const unavoidFixed  = val('t3-unavoidable-fixed');
  const oppIncome     = val('t3-opp-income');
  const oppLabel      = sval('t3-opp-label') || 'Alternative use of capacity';
  const constrained   = document.getElementById('t3-cap-yes').checked;

  const makeCostRel   = varCost * units + avoidFixed;
  const buyCostRel    = buyPrice * units;
  const oppCost       = constrained ? oppIncome : 0;

  // Panel A: Total alternatives approach
  // Make: incremental make cost + no opp income (if constrained, forgo it)
  // Buy: incremental buy cost - opp income (gain it)
  const panelA_make   = makeCostRel + (constrained ? 0 : 0);
  const panelA_buy    = buyCostRel - (constrained ? oppIncome : 0);

  // Panel B: Opportunity cost approach
  const panelB_make   = makeCostRel + oppCost;
  const panelB_buy    = buyCostRel + 0;

  const preferMakeA   = panelA_make <= panelA_buy;
  const preferMakeB   = panelB_make <= panelB_buy;
  const diffA         = Math.abs(panelA_make - panelA_buy);
  const diffB         = Math.abs(panelB_make - panelB_buy);

  const out = getOrCreate('t3-output', 'div', 'tool-output',
    document.getElementById('t3-output').parentElement);

  out.innerHTML = '<div class="ch12-mob-grid">'

    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Panel A: Total Alternatives Approach</div>'
    + '<table class="ch12-result-table">'
    + '<thead><tr><th>Item</th><th>Make</th><th>Buy</th></tr></thead>'
    + '<tbody>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Variable Cost (' + fmtN(units) + ' x ' + fmt(varCost) + ')</td><td>' + fmt(varCost * units) + '</td><td>—</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Avoidable Fixed Costs</td><td>' + fmt(avoidFixed) + '</td><td>—</td></tr>'
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Unavoidable Fixed Costs</td><td>' + fmt(unavoidFixed) + '</td><td>' + fmt(unavoidFixed) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Outside Purchase (' + fmtN(units) + ' x ' + fmt(buyPrice) + ')</td><td>—</td><td>' + fmt(buyCostRel) + '</td></tr>'
    + (constrained ? '<tr class="ch12-t1-result__row--relevant"><td>Less: Income from ' + oppLabel + '</td><td>—</td><td>(' + fmt(oppIncome) + ')</td></tr>' : '')
    + '</tbody>'
    + '<tfoot><tr class="ch12-result-table__relevant-total"><td>Total Relevant Costs</td><td>' + fmt(makeCostRel) + '</td><td>' + fmt(panelA_buy) + '</td></tr></tfoot>'
    + '</table>'
    + '<div class="ch12-mob-verdict ' + (preferMakeA ? 'ch12-mob-verdict--make' : 'ch12-mob-verdict--buy') + '">'
    + 'Prefer to <strong>' + (preferMakeA ? 'MAKE' : 'BUY') + '</strong> by ' + fmt(diffA)
    + '</div>'
    + '</div>'

    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Panel B: Opportunity Cost Approach</div>'
    + '<table class="ch12-result-table">'
    + '<thead><tr><th>Item</th><th>Make</th><th>Buy</th></tr></thead>'
    + '<tbody>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Variable Cost (' + fmtN(units) + ' x ' + fmt(varCost) + ')</td><td>' + fmt(varCost * units) + '</td><td>—</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Avoidable Fixed Costs</td><td>' + fmt(avoidFixed) + '</td><td>—</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Outside Purchase (' + fmtN(units) + ' x ' + fmt(buyPrice) + ')</td><td>—</td><td>' + fmt(buyCostRel) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Opportunity Cost (' + oppLabel + ')</td><td>' + fmt(oppCost) + '</td><td>$0</td></tr>'
    + '</tbody>'
    + '<tfoot><tr class="ch12-result-table__relevant-total"><td>Total Relevant Costs</td><td>' + fmt(panelB_make) + '</td><td>' + fmt(panelB_buy) + '</td></tr></tfoot>'
    + '</table>'
    + '<div class="ch12-mob-verdict ' + (preferMakeB ? 'ch12-mob-verdict--make' : 'ch12-mob-verdict--buy') + '">'
    + 'Prefer to <strong>' + (preferMakeB ? 'MAKE' : 'BUY') + '</strong> by ' + fmt(diffB)
    + '</div>'
    + '</div>'

    + '</div>'

    + '<div class="ch12-insight">Both panels reach the same conclusion. Panel A subtracts opportunity income from the buy alternative. Panel B adds opportunity cost to the make alternative. The difference between alternatives is always ' + fmt(diffA) + '.</div>'
    + (unavoidFixed > 0 ? '<div class="ch12-insight" style="margin-top:var(--space-2);">The ' + fmt(unavoidFixed) + ' of unavoidable fixed costs appears under both alternatives and is irrelevant -- it does not affect the decision.</div>' : '');

  renderShowWork(document.getElementById('t3-show-work'), [
    { label: 'Relevant Cost to Make', formula: 'Variable Cost + Avoidable Fixed', values: fmt(varCost * units) + ' + ' + fmt(avoidFixed), result: fmt(makeCostRel) },
    { label: 'Relevant Cost to Buy', formula: 'Units x Buy Price', values: fmtN(units) + ' x ' + fmt(buyPrice), result: fmt(buyCostRel) },
    { label: 'Opportunity Cost', formula: constrained ? 'Income forgone by not using freed capacity' : 'Zero -- capacity is idle either way', values: oppLabel, result: fmt(oppCost) },
    { label: 'Panel A Net Relevant Cost (Make)', formula: 'Make costs (unavoidable excluded)', values: fmt(makeCostRel), result: fmt(panelA_make) },
    { label: 'Panel A Net Relevant Cost (Buy)', formula: 'Buy cost - opportunity income', values: fmt(buyCostRel) + ' - ' + fmt(constrained ? oppIncome : 0), result: fmt(panelA_buy) },
    { label: 'Panel B Net Relevant Cost (Make)', formula: 'Make costs + opportunity cost', values: fmt(makeCostRel) + ' + ' + fmt(oppCost), result: fmt(panelB_make), highlight: true },
    { label: 'Panel B Net Relevant Cost (Buy)', formula: 'Buy cost + $0 opportunity cost', values: fmt(buyCostRel) + ' + $0', result: fmt(panelB_buy), highlight: true },
    { label: 'Decision', formula: 'Lower total relevant cost wins', values: 'Make: ' + fmt(panelB_make) + ' vs Buy: ' + fmt(panelB_buy), result: preferMakeB ? 'MAKE -- saves ' + fmt(diffB) : 'BUY -- saves ' + fmt(diffB) }
  ], { title: 'Make-or-Buy Analysis', defaultOpen: false });
}

function initTool3() {
  document.getElementById('t3-calculate').addEventListener('click', calcTool3);
  document.getElementById('t3-load-soho').addEventListener('click', () => {
    document.getElementById('t3-units').value            = 250000;
    document.getElementById('t3-buy-price').value        = 64;
    document.getElementById('t3-var-cost').value         = 60;
    document.getElementById('t3-avoidable-fixed').value  = 750000;
    document.getElementById('t3-unavoidable-fixed').value = 3000000;
    document.getElementById('t3-opp-income').value       = 2500000;
    document.getElementById('t3-opp-label').value        = 'Make and sell Digiteks';
    document.getElementById('t3-cap-yes').checked        = true;
    calcTool3();
  });
  initRandomizer('t3-randomize', [
    { id: 't3-units',            min: 10000,   max: 500000,  step: 10000,  integer: true },
    { id: 't3-buy-price',        min: 20,      max: 150,     step: 5 },
    { id: 't3-var-cost',         min: 10,      max: 120,     step: 5 },
    { id: 't3-avoidable-fixed',  min: 100000,  max: 2000000, step: 100000, integer: true },
    { id: 't3-unavoidable-fixed', min: 500000, max: 5000000, step: 250000, integer: true },
    { id: 't3-opp-income',       min: 0,       max: 5000000, step: 250000, integer: true }
  ], calcTool3);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Product Mix and Bottleneck Manager
// ═══════════════════════════════════════════════════════════════════════════════

const POWER_RECREATION_PRODUCTS = [
  { name: 'Snowmobile Engine', cm: 240, hours: 2, demand: 999999 },
  { name: 'Boat Engine',       cm: 375, hours: 5, demand: 999999 }
];

let t4Products = [...POWER_RECREATION_PRODUCTS];

function buildT4ProductsGrid(products) {
  const container = document.getElementById('t4-products-grid');
  container.innerHTML = '';
  t4Products = products;

  products.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'ch12-t4-product-row';
    row.innerHTML = '<div class="form-group">'
      + '<label class="form-label">Product ' + (i + 1) + ' Name</label>'
      + '<input class="form-input form-input--sm" type="text" data-col="name" data-idx="' + i + '" value="' + p.name + '" /></div>'
      + '<div class="form-group">'
      + '<label class="form-label">CM per Unit ($)</label>'
      + '<input class="form-input form-input--sm" type="number" data-col="cm" data-idx="' + i + '" value="' + p.cm + '" min="0" step="5" /></div>'
      + '<div class="form-group">'
      + '<label class="form-label">Resource Hours per Unit</label>'
      + '<input class="form-input form-input--sm" type="number" data-col="hours" data-idx="' + i + '" value="' + p.hours + '" min="0.1" step="0.5" /></div>'
      + '<div class="form-group">'
      + '<label class="form-label">Max Demand (units)</label>'
      + '<input class="form-input form-input--sm" type="number" data-col="demand" data-idx="' + i + '" value="' + (p.demand >= 999999 ? '' : p.demand) + '" placeholder="Unlimited" min="0" /></div>';
    container.appendChild(row);
  });
}

function readT4Products() {
  const container = document.getElementById('t4-products-grid');
  const products = [];
  container.querySelectorAll('.ch12-t4-product-row').forEach(row => {
    const name   = row.querySelector('[data-col="name"]').value.trim();
    const cm     = parseFloat(row.querySelector('[data-col="cm"]').value) || 0;
    const hours  = parseFloat(row.querySelector('[data-col="hours"]').value) || 1;
    const dInput = row.querySelector('[data-col="demand"]').value;
    const demand = dInput === '' ? 999999 : (parseFloat(dInput) || 999999);
    products.push({ name, cm, hours, demand });
  });
  return products;
}

function calcTool4() {
  const products      = readT4Products();
  const totalResource = val('t4-resource-total');
  const resourceLabel = sval('t4-resource-label') || 'Resource Hours';

  // Compute CM per resource hour and rank
  const ranked = products.map(p => ({
    ...p,
    cmPerHour: p.hours > 0 ? p.cm / p.hours : 0
  })).sort((a, b) => b.cmPerHour - a.cmPerHour);

  // Allocate resource greedily
  let remaining = totalResource;
  const allocation = ranked.map(p => {
    const maxUnits   = Math.min(p.demand, remaining > 0 ? Math.floor(remaining / p.hours) : 0);
    const hoursUsed  = maxUnits * p.hours;
    const totalCM    = maxUnits * p.cm;
    remaining       -= hoursUsed;
    return { ...p, maxUnits, hoursUsed, totalCM };
  });

  const totalCM    = allocation.reduce((s, p) => s + p.totalCM, 0);
  const totalHours = allocation.reduce((s, p) => s + p.hoursUsed, 0);

  // Bottleneck analysis
  const btnCM       = val('t4-btn-cm');
  const btnGained   = val('t4-btn-units-gained');
  const btnCost     = val('t4-btn-cost');
  const btnBenefit  = btnCM * btnGained;
  const btnWorthIt  = btnBenefit > btnCost;

  const rankRows = allocation.map((p, i) =>
    '<tr class="' + (i === 0 ? 'lc-table__row--doubling' : '') + '">'
    + '<td>' + p.name + (i === 0 ? ' <span class="lc-doubling-badge">Best</span>' : '') + '</td>'
    + '<td>' + fmt(p.cm) + '</td>'
    + '<td>' + p.hours + '</td>'
    + '<td><strong>' + fmt(p.cmPerHour) + '</strong></td>'
    + '<td>' + fmtN(p.maxUnits) + '</td>'
    + '<td>' + fmtN(p.hoursUsed) + '</td>'
    + '<td>' + fmt(p.totalCM) + '</td>'
    + '</tr>'
  ).join('');

  const out = getOrCreate('t4-output', 'div', 'tool-output',
    document.getElementById('t4-output').parentElement);

  out.innerHTML = '<div class="ch12-t4-result">'

    + '<div class="ch12-t4-section">'
    + '<div class="ch12-t4-section__title">Product Mix Optimization</div>'
    + '<div class="ch10-lc-table-wrap"><table class="ch10-lc-table">'
    + '<thead><tr><th>Product</th><th>CM/Unit</th><th>' + resourceLabel + '/Unit</th><th>CM/' + resourceLabel + '</th><th>Units to Produce</th><th>' + resourceLabel + ' Used</th><th>Total CM</th></tr></thead>'
    + '<tbody>' + rankRows + '</tbody>'
    + '<tfoot><tr class="ch12-result-table__total"><td colspan="4">Totals</td><td></td><td>' + fmtN(totalHours) + ' / ' + fmtN(totalResource) + '</td><td>' + fmt(totalCM) + '</td></tr></tfoot>'
    + '</table></div>'
    + '<div class="ch12-insight">Ranked by contribution margin per ' + resourceLabel + '. Produce the highest-ranked product first until capacity is exhausted or demand is met, then move to the next.</div>'
    + '</div>'

    + '<div class="ch12-t4-section" style="margin-top:var(--space-6);">'
    + '<div class="ch12-t4-section__title">Bottleneck Relief Decision</div>'
    + '<div class="ch12-mob-grid">'
    + '<div class="ch12-mob-panel"><div class="ch12-mob-panel__title">Incremental Benefit</div>'
    + '<div class="ch12-so-panel__title" style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-success);margin:var(--space-2) 0;">' + fmt(btnBenefit) + '</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-gray-600);">' + fmtN(btnGained) + ' extra units x ' + fmt(btnCM) + ' CM per unit</div>'
    + '</div>'
    + '<div class="ch12-mob-panel"><div class="ch12-mob-panel__title">Incremental Cost</div>'
    + '<div class="ch12-so-panel__title" style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-danger);margin:var(--space-2) 0;">' + fmt(btnCost) + '</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-gray-600);">Cost of bottleneck relief per period</div>'
    + '</div>'
    + '<div class="ch12-mob-panel"><div class="ch12-mob-panel__title">Net Benefit</div>'
    + '<div class="ch12-so-panel__title" style="font-size:var(--font-size-2xl);font-weight:800;color:' + (btnWorthIt ? 'var(--color-success)' : 'var(--color-danger)') + ';margin:var(--space-2) 0;">' + fmt(btnBenefit - btnCost) + '</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-gray-600);">' + (btnWorthIt ? 'Invest in bottleneck relief' : 'Do not invest -- cost exceeds benefit') + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'

    + '</div>';

  renderShowWork(document.getElementById('t4-show-work'), [
    ...allocation.map(p => ({
      label: p.name + ' -- CM per ' + resourceLabel,
      formula: 'CM per Unit / ' + resourceLabel + ' per Unit',
      values: fmt(p.cm) + ' / ' + p.hours,
      result: fmt(p.cmPerHour) + ' per ' + resourceLabel,
      highlight: allocation.indexOf(p) === 0
    })),
    { label: 'Optimal Mix Total CM', formula: 'Sum of (Units x CM per Unit) for each product', values: allocation.map(p => fmtN(p.maxUnits) + ' x ' + fmt(p.cm)).join(' + '), result: fmt(totalCM), highlight: true },
    { label: 'Bottleneck Relief: Incremental CM', formula: 'Additional Units x CM per Unit', values: fmtN(btnGained) + ' x ' + fmt(btnCM), result: fmt(btnBenefit) },
    { label: 'Bottleneck Relief: Net Benefit', formula: 'Incremental CM - Cost of Relief', values: fmt(btnBenefit) + ' - ' + fmt(btnCost), result: fmt(btnBenefit - btnCost) + (btnWorthIt ? ' -- INVEST' : ' -- DO NOT INVEST'), highlight: true }
  ], { title: 'Product Mix and Bottleneck Analysis', defaultOpen: false });
}

function initTool4() {
  buildT4ProductsGrid(POWER_RECREATION_PRODUCTS);
  document.getElementById('t4-calculate').addEventListener('click', calcTool4);
  document.getElementById('t4-load-power').addEventListener('click', () => {
    document.getElementById('t4-resource-total').value  = 600;
    document.getElementById('t4-resource-label').value  = 'Machine-Hours';
    document.getElementById('t4-btn-cm').value          = 240;
    document.getElementById('t4-btn-units-gained').value = 3;
    document.getElementById('t4-btn-cost').value        = 320;
    buildT4ProductsGrid(POWER_RECREATION_PRODUCTS);
    calcTool4();
  });
  initRandomizer('t4-randomize', [
    { id: 't4-resource-total', min: 200,  max: 2000, step: 100,  integer: true },
    { id: 't4-btn-cm',         min: 50,   max: 500,  step: 25 },
    { id: 't4-btn-units-gained', min: 1,  max: 20,   step: 1,   integer: true },
    { id: 't4-btn-cost',       min: 100,  max: 5000, step: 100, integer: true }
  ], () => {
    const products = readT4Products();
    products.forEach(p => {
      p.cm    = Math.round((Math.random() * 400 + 50) / 5) * 5;
      p.hours = Math.round((Math.random() * 8 + 1) * 2) / 2;
    });
    buildT4ProductsGrid(products);
    calcTool4();
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Add/Drop and Equipment Replacement
// ═══════════════════════════════════════════════════════════════════════════════

function calcT5Drop() {
  const revenue      = val('t5-revenue');
  const cogs         = val('t5-cogs');
  const varCosts     = val('t5-var-costs');
  const unavoidable  = val('t5-unavoidable');
  const oppCost      = val('t5-opp-cost');

  const avoidableCosts = cogs + varCosts;
  const reportedOI     = revenue - cogs - varCosts - unavoidable;
  const netEffectDrop  = -(revenue - avoidableCosts - oppCost);
  const keepBetter     = netEffectDrop < 0;

  const out = getOrCreate('t5-drop-output', 'div', 'tool-output',
    document.getElementById('t5-drop-output').parentElement);

  out.innerHTML = '<div class="ch12-drop-result">'
    + '<div class="ch12-mob-grid">'

    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Reported P&L (Including Allocated Overhead)</div>'
    + '<table class="ch12-result-table"><tbody>'
    + '<tr><td>Revenue</td><td>' + fmt(revenue) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>COGS (avoidable)</td><td>(' + fmt(cogs) + ')</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Other Variable / Avoidable Costs</td><td>(' + fmt(varCosts) + ')</td></tr>'
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Allocated Fixed Overhead (unavoidable)</td><td>(' + fmt(unavoidable) + ')</td></tr>'
    + '</tbody><tfoot>'
    + '<tr class="ch12-result-table__total"><td>Reported Operating Income</td><td class="' + (reportedOI >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + fmtD(reportedOI) + '</td></tr>'
    + '</tfoot></table>'
    + '</div>'

    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Relevant Analysis (Effect of Dropping)</div>'
    + '<table class="ch12-result-table"><tbody>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Revenue Lost</td><td>(' + fmt(revenue) + ')</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Avoidable Costs Saved</td><td>+' + fmt(avoidableCosts) + '</td></tr>'
    + (oppCost > 0 ? '<tr class="ch12-t1-result__row--relevant"><td>Opportunity Gain (e.g. lease value)</td><td>+' + fmt(oppCost) + '</td></tr>' : '')
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Unavoidable Fixed Costs (still incurred)</td><td>—</td></tr>'
    + '</tbody><tfoot>'
    + '<tr class="ch12-result-table__relevant-total"><td>Net Effect of Dropping</td><td class="' + (netEffectDrop >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (netEffectDrop >= 0 ? '+' : '') + fmtD(netEffectDrop) + '</td></tr>'
    + '</tfoot></table>'
    + '</div>'

    + '</div>'

    + '<div class="ch12-verdict ' + (keepBetter ? 'ch12-verdict--positive' : 'ch12-verdict--negative') + '">'
    + (keepBetter
        ? 'Keep the customer. Dropping would decrease operating income by <strong>' + fmt(Math.abs(netEffectDrop)) + '</strong>. The allocated overhead of ' + fmt(unavoidable) + ' will be reallocated elsewhere -- it does not disappear.'
        : 'Drop the customer. Dropping increases operating income by <strong>' + fmt(Math.abs(netEffectDrop)) + '</strong>. Revenue lost (' + fmt(revenue) + ') is less than avoidable costs saved (' + fmt(avoidableCosts) + ') plus opportunity gains (' + fmt(oppCost) + ').')
    + '</div>'
    + '</div>';
}

function calcT5Equip() {
  const oldBook    = val('t5-old-book');
  const oldDisposal = val('t5-old-disposal');
  const oldOpCost  = val('t5-old-opcost');
  const newCost    = val('t5-new-cost');
  const newOpCost  = val('t5-new-opcost');
  const years      = val('t5-years');

  const keepTotal  = oldOpCost * years;
  const replaceTotal = newCost - oldDisposal + newOpCost * years;
  const savings    = keepTotal - replaceTotal;
  const shouldReplace = savings > 0;

  // Year 1 performance evaluation impact
  const keepY1OI   = -(oldOpCost + oldBook / years);
  const replaceY1OI = -(newOpCost + newCost / years + (oldBook - oldDisposal));

  const out = getOrCreate('t5-equip-output', 'div', 'tool-output',
    document.getElementById('t5-equip-output').parentElement);

  out.innerHTML = '<div class="ch12-equip-result">'

    + '<div class="ch12-mob-grid">'
    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Relevant Cost Comparison (' + years + ' years)</div>'
    + '<table class="ch12-result-table"><thead><tr><th>Item</th><th>Keep</th><th>Replace</th></tr></thead><tbody>'
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Book Value of Old Machine (sunk cost)</td><td>' + fmt(oldBook) + '</td><td>' + fmt(oldBook) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Current Disposal Value of Old Machine</td><td>—</td><td>(' + fmt(oldDisposal) + ')</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>New Machine Cost</td><td>—</td><td>' + fmt(newCost) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Cash Operating Costs (' + years + ' years)</td><td>' + fmt(keepTotal) + '</td><td>' + fmt(newOpCost * years) + '</td></tr>'
    + '</tbody><tfoot>'
    + '<tr class="ch12-result-table__total"><td>Total Costs (all items)</td><td>' + fmt(keepTotal + oldBook) + '</td><td>' + fmt(replaceTotal + oldBook) + '</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Total Relevant Costs</td><td>' + fmt(keepTotal) + '</td><td>' + fmt(replaceTotal) + '</td></tr>'
    + '</tfoot></table>'
    + '</div>'

    + '<div class="ch12-mob-panel">'
    + '<div class="ch12-mob-panel__title">Performance Evaluation Conflict (Year 1 Only)</div>'
    + '<table class="ch12-result-table"><thead><tr><th>Item</th><th>Keep</th><th>Replace</th></tr></thead><tbody>'
    + '<tr><td>Cash Operating Costs</td><td>(' + fmt(oldOpCost) + ')</td><td>(' + fmt(newOpCost) + ')</td></tr>'
    + '<tr><td>Depreciation</td><td>(' + fmt(oldBook / years) + ')</td><td>(' + fmt(newCost / years) + ')</td></tr>'
    + '<tr><td>Loss on Disposal</td><td>—</td><td>(' + fmt(oldBook - oldDisposal) + ')</td></tr>'
    + '</tbody><tfoot>'
    + '<tr class="ch12-result-table__total"><td>Year 1 Operating Income Effect</td><td class="' + (keepY1OI >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + fmtD(keepY1OI) + '</td><td class="' + (replaceY1OI >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + fmtD(replaceY1OI) + '</td></tr>'
    + '</tfoot></table>'
    + '<div class="ch12-insight" style="margin-top:var(--space-3);">A manager evaluated on Year 1 income may choose to keep the old machine even though replacing it is better over ' + years + ' years. This is the decision-model vs. performance-evaluation conflict.</div>'
    + '</div>'
    + '</div>'

    + '<div class="ch12-verdict ' + (shouldReplace ? 'ch12-verdict--positive' : 'ch12-verdict--negative') + '">'
    + (shouldReplace
        ? 'Replace the machine. Relevant cost savings over ' + years + ' years: <strong>' + fmt(savings) + '</strong>. Book value of ' + fmt(oldBook) + ' is a sunk cost and irrelevant -- it will be expensed either way.'
        : 'Keep the machine. Replacing costs <strong>' + fmt(Math.abs(savings)) + '</strong> more over ' + years + ' years on a relevant cost basis.')
    + '</div>'
    + '</div>';

  renderShowWork(document.getElementById('t5-show-work'), [
    { label: 'Book Value of Old Machine', formula: 'Original cost - Accumulated depreciation', values: fmt(oldBook), result: 'SUNK COST -- irrelevant', note: 'Will be expensed either way over ' + years + ' years' },
    { label: 'Relevant Cost to Keep', formula: 'Cash operating costs x years', values: fmt(oldOpCost) + ' x ' + years, result: fmt(keepTotal) },
    { label: 'Relevant Cost to Replace', formula: 'New machine cost - disposal value + operating costs x years', values: fmt(newCost) + ' - ' + fmt(oldDisposal) + ' + ' + fmt(newOpCost) + ' x ' + years, result: fmt(replaceTotal) },
    { label: 'Net Savings from Replacing', formula: 'Keep cost - Replace cost', values: fmt(keepTotal) + ' - ' + fmt(replaceTotal), result: fmt(savings), highlight: true },
    { label: 'Year 1 OI: Keep', formula: '-(Operating cost + Depreciation)', values: '-(' + fmt(oldOpCost) + ' + ' + fmt(oldBook / years) + ')', result: fmtD(keepY1OI) },
    { label: 'Year 1 OI: Replace', formula: '-(Operating cost + Depreciation + Loss on disposal)', values: '-(' + fmt(newOpCost) + ' + ' + fmt(newCost / years) + ' + ' + fmt(oldBook - oldDisposal) + ')', result: fmtD(replaceY1OI), note: 'Manager may resist replacing due to this first-year loss' }
  ], { title: 'Equipment Replacement Analysis', defaultOpen: false });
}

function initTool5() {
  document.getElementById('t5-calculate-drop').addEventListener('click', calcT5Drop);
  document.getElementById('t5-calculate-equip').addEventListener('click', calcT5Equip);

  document.getElementById('t5-load-wisk').addEventListener('click', () => {
    document.getElementById('t5-revenue').value     = 400000;
    document.getElementById('t5-cogs').value        = 330000;
    document.getElementById('t5-var-costs').value   = 55000;
    document.getElementById('t5-unavoidable').value = 47000;
    document.getElementById('t5-opp-cost').value    = 0;
    calcT5Drop();
  });

  document.getElementById('t5-load-toledo').addEventListener('click', () => {
    document.getElementById('t5-old-book').value    = 400000;
    document.getElementById('t5-old-disposal').value = 40000;
    document.getElementById('t5-old-opcost').value  = 800000;
    document.getElementById('t5-new-cost').value    = 600000;
    document.getElementById('t5-new-opcost').value  = 460000;
    document.getElementById('t5-years').value       = 2;
    calcT5Equip();
  });

  initRandomizer('t5-randomize-drop', [
    { id: 't5-revenue',     min: 100000, max: 1000000, step: 50000,  integer: true },
    { id: 't5-cogs',        min: 50000,  max: 700000,  step: 25000,  integer: true },
    { id: 't5-var-costs',   min: 10000,  max: 200000,  step: 10000,  integer: true },
    { id: 't5-unavoidable', min: 10000,  max: 150000,  step: 10000,  integer: true },
    { id: 't5-opp-cost',    min: 0,      max: 100000,  step: 10000,  integer: true }
  ], calcT5Drop);

  initRandomizer('t5-randomize-equip', [
    { id: 't5-old-book',    min: 100000, max: 2000000, step: 50000,  integer: true },
    { id: 't5-old-disposal', min: 0,     max: 500000,  step: 25000,  integer: true },
    { id: 't5-old-opcost',  min: 100000, max: 2000000, step: 50000,  integer: true },
    { id: 't5-new-cost',    min: 100000, max: 2000000, step: 50000,  integer: true },
    { id: 't5-new-opcost',  min: 50000,  max: 1500000, step: 50000,  integer: true },
    { id: 't5-years',       min: 1,      max: 10,      step: 1,      integer: true }
  ], calcT5Equip);
}


// ═══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ═══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Relevant Costs',          definition: 'Expected future costs that differ among alternative courses of action. Only relevant costs should influence decisions. Historical costs are never relevant.' },
  { term: 'Relevant Revenues',       definition: 'Expected future revenues that differ among alternative courses of action. Revenues that are the same under all alternatives are irrelevant.' },
  { term: 'Sunk Costs',              definition: 'Past costs that have already been incurred and cannot be changed regardless of which alternative is chosen. Always irrelevant to future decisions. Also called past costs or historical costs.' },
  { term: 'One-Time-Only Special Order', definition: 'A special order with no long-run implications. When idle capacity exists and fixed costs are unaffected, the relevant cost is only the variable cost of fulfilling the order.' },
  { term: 'Insourcing',              definition: 'Producing goods or providing services within an organization rather than purchasing from an outside vendor.' },
  { term: 'Outsourcing',             definition: 'Purchasing goods and services from outside vendors rather than producing them internally. Also called make-or-buy decisions.' },
  { term: 'Make-or-Buy Decisions',   definition: 'Decisions about whether a producer of goods or services will insource or outsource. Quality, dependability of suppliers, and costs are the most important factors.' },
  { term: 'Opportunity Cost',        definition: 'The contribution to operating income that is forgone by not using a limited resource in its next-best alternative use. Not recorded in financial accounting systems but crucial to decision making.' },
  { term: 'Incremental Cost',        definition: 'The additional total cost incurred for an activity. Only includes costs that change as a result of the decision.' },
  { term: 'Differential Cost',       definition: 'The difference in total cost between two alternatives. Sometimes used interchangeably with incremental cost.' },
  { term: 'Product-Mix Decisions',   definition: 'Decisions managers make about which products to sell and in what quantities. When a resource is constrained, maximize contribution margin per unit of the constraining resource.' },
  { term: 'Constraining Resource',   definition: 'The resource that restricts or limits the production or sale of products. Also called the limiting factor or bottleneck. Managers maximize CM per unit of the constraining resource.' },
  { term: 'Theory of Constraints (TOC)', definition: 'Describes methods to maximize operating income when faced with bottleneck and non-bottleneck operations. Focuses on keeping the bottleneck busy and increasing its efficiency.' },
  { term: 'Throughput Margin',       definition: 'Revenues minus the direct material costs of goods sold. Used in TOC analysis, which treats all other operating costs as fixed in the short run.' },
  { term: 'Bottleneck',              definition: 'An operation where capacity is less than the demand placed on it. The bottleneck determines the output of the entire system. Improving non-bottleneck operations does not increase total output.' },
  { term: 'Book Value',              definition: 'Original cost minus accumulated depreciation of an asset. Always a sunk cost and therefore irrelevant in equipment-replacement decisions.' },
  { term: 'Decision Model',          definition: 'A formal method of making a choice that often involves both quantitative and qualitative analyses. Management accountants analyze and present relevant data to guide managers decisions.' },
  { term: 'Qualitative Factors',     definition: 'Outcomes that are difficult to measure accurately in numerical terms. Examples include employee morale, supplier reliability, and product quality. Must be considered alongside quantitative factors.' },
  { term: 'Quantitative Factors',    definition: 'Outcomes measured in numerical terms. Financial quantitative factors can be expressed in monetary terms. Non-financial quantitative factors can be measured numerically but not in dollars.' },
  { term: 'Full Costs of the Product', definition: 'The sum of all variable and fixed costs in all business functions of the value chain. Includes R&D, design, production, marketing, distribution, and customer service costs.' }
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
  if (document.getElementById('ch12-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch12-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch12');
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
  if (isChapterComplete('ch12')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch12');
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
