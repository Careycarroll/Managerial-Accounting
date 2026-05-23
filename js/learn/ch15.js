import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initSettingsPanel } from '/js/components/settings-panel.js';

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
const sval = id => {
  const node = el(id);
  return node ? node.value.trim() : '';
};
function setVal(id, value) {
  const node = el(id);
  if (node) node.value = value;
}
function resultClass(n) {
  return n >= 0 ? 'variance-fav' : 'variance-unfav';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Customer Cost Hierarchy Classifier
// ══════════════════════════════════════════════════════════════════════════════

const HIERARCHY_SCENARIOS = [
  {
    text: 'A sales commission equal to 3% of the invoice amount for each unit sold to a customer.',
    answer: 'output-unit',
    why: 'The cost changes with each unit or dollar sold to the customer. It is a customer output-unit-level cost.'
  },
  {
    text: 'The cost of processing and verifying each customer purchase order, regardless of order size.',
    answer: 'batch',
    why: 'Each order is a batch of customer activity. The cost depends on the number of orders, not the number of units in each order.'
  },
  {
    text: 'Annual salary and travel costs for a dedicated account manager assigned to one national account.',
    answer: 'customer-sustaining',
    why: 'The cost supports one specific customer relationship independent of individual orders or units.'
  },
  {
    text: 'Costs of maintaining an e-commerce platform used by all customers who buy through the online channel.',
    answer: 'channel',
    why: 'The cost supports a distribution channel rather than one customer or one order.'
  },
  {
    text: 'The CEO salary and corporate legal department costs that cannot be traced meaningfully to customers or channels.',
    answer: 'corporate',
    why: 'These are corporate-sustaining costs. They support the organization as a whole and are usually excluded from customer profitability decisions.'
  },
  {
    text: 'Special packaging inserted into every unit shipped to a particular customer.',
    answer: 'output-unit',
    why: 'The cost varies with each unit shipped to the customer, so it is output-unit-level.'
  },
  {
    text: 'Freight scheduling and paperwork for each delivery run to a customer location.',
    answer: 'batch',
    why: 'Each delivery is a batch-level customer activity. The cost is driven by number of deliveries.'
  },
  {
    text: 'Custom engineering support for a customer that requires unique product specifications throughout the year.',
    answer: 'customer-sustaining',
    why: 'The cost exists to sustain a specific customer and is not driven directly by individual orders or units.'
  },
  {
    text: 'Retail-store merchandising support used for all customers served through the brick-and-mortar channel.',
    answer: 'channel',
    why: 'The cost supports the retail distribution channel, not one customer.'
  },
  {
    text: 'Annual financial audit and stock exchange listing fees.',
    answer: 'corporate',
    why: 'These costs support the company as a whole and are corporate-sustaining.'
  }
];

let hierIndex = -1;
let hierCorrect = 0;
let hierTotal = 0;
let hierUsed = [];

const HIER_LABELS = {
  'output-unit': 'Customer Output-Unit-Level',
  batch: 'Customer Batch-Level',
  'customer-sustaining': 'Customer-Sustaining',
  channel: 'Distribution-Channel',
  corporate: 'Corporate-Sustaining'
};

function initHierarchyClassifier() {
  const nextBtn = el('hier-next-btn');
  const resetBtn = el('hier-reset-btn');
  if (!nextBtn) return;
  nextBtn.addEventListener('click', showNextHierarchyScenario);
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      hierIndex = -1;
      hierCorrect = 0;
      hierTotal = 0;
      hierUsed = [];
      if (el('hier-scenario-area')) el('hier-scenario-area').innerHTML = '';
      if (el('hier-results-area')) el('hier-results-area').innerHTML = '';
      showNextHierarchyScenario();
    });
  }
}

function showNextHierarchyScenario() {
  const area = el('hier-scenario-area');
  if (!area) return;
  const available = HIERARCHY_SCENARIOS.map((_, i) => i).filter(i => !hierUsed.includes(i));
  if (available.length === 0) {
    area.innerHTML = '<div class="card" style="margin-top:var(--space-4);"><p class="result-highlight">All cost items completed.</p></div>';
    updateHierarchyResults();
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  hierUsed.push(pick);
  hierIndex = pick;
  const s = HIERARCHY_SCENARIOS[pick];
  area.innerHTML = '<div class="card" style="margin-top:var(--space-4);">'
    + '<p style="font-size:var(--font-size-lg);line-height:1.6;margin-bottom:var(--space-4);">' + s.text + '</p>'
    + '<div class="tool-actions" style="flex-wrap:wrap;">'
    + '<button class="btn btn--secondary hier-answer-btn" data-answer="output-unit">Output-Unit</button>'
    + '<button class="btn btn--secondary hier-answer-btn" data-answer="batch">Batch-Level</button>'
    + '<button class="btn btn--secondary hier-answer-btn" data-answer="customer-sustaining">Customer-Sustaining</button>'
    + '<button class="btn btn--secondary hier-answer-btn" data-answer="channel">Channel</button>'
    + '<button class="btn btn--secondary hier-answer-btn" data-answer="corporate">Corporate</button>'
    + '</div>'
    + '<div id="hier-feedback"></div>'
    + '</div>';
  area.querySelectorAll('.hier-answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handleHierarchyAnswer(btn.dataset.answer));
  });
}

function handleHierarchyAnswer(chosen) {
  const s = HIERARCHY_SCENARIOS[hierIndex];
  const feedback = el('hier-feedback');
  if (!s || !feedback) return;
  const correct = chosen === s.answer;
  hierTotal++;
  if (correct) hierCorrect++;
  feedback.innerHTML = '<div class="feedback-card" style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:' + (correct ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-danger-bg, #fef2f2)') + ';border:1px solid ' + (correct ? 'var(--color-success, #22c55e)' : 'var(--color-danger, #ef4444)') + ';">'
    + '<h4 style="margin:0 0 var(--space-2);">' + (correct ? 'Correct' : 'Not quite') + '</h4>'
    + '<p><strong>Best answer:</strong> ' + HIER_LABELS[s.answer] + '</p>'
    + '<p style="margin-bottom:0;">' + s.why + '</p>'
    + '</div>';
  feedback.parentElement.querySelectorAll('.hier-answer-btn').forEach(btn => { btn.disabled = true; });
  updateHierarchyResults();
}

function updateHierarchyResults() {
  const area = el('hier-results-area');
  if (!area) return;
  area.innerHTML = '<div class="card" style="margin-top:var(--space-4);">'
    + '<h4 style="margin-top:0;">Score</h4>'
    + '<p class="result-highlight">' + hierCorrect + ' correct out of ' + hierTotal + ' answered</p>'
    + '<p style="margin-bottom:0;color:var(--color-gray-600);">Remaining cost items: ' + (HIERARCHY_SCENARIOS.length - hierUsed.length) + '</p>'
    + '</div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Customer Profitability Analyzer
// ══════════════════════════════════════════════════════════════════════════════

function readCustomers() {
  return [1, 2, 3].map(i => {
    const revenue = val('cpa-c' + i + '-revenue');
    const product = val('cpa-c' + i + '-product');
    const orders = val('cpa-c' + i + '-orders');
    const deliveries = val('cpa-c' + i + '-deliveries');
    const support = val('cpa-c' + i + '-support');
    const returns = val('cpa-c' + i + '-returns');
    const orderCost = orders * val('cpa-order-rate');
    const deliveryCost = deliveries * val('cpa-delivery-rate');
    const supportCost = support * val('cpa-support-rate');
    const operatingIncome = revenue - product - orderCost - deliveryCost - supportCost - returns;
    const grossMargin = revenue - product;
    const customerCost = orderCost + deliveryCost + supportCost + returns;
    return {
      id: i,
      name: sval('cpa-c' + i + '-name') || 'Customer ' + i,
      revenue,
      product,
      orders,
      deliveries,
      support,
      returns,
      orderCost,
      deliveryCost,
      supportCost,
      grossMargin,
      customerCost,
      operatingIncome,
      margin: revenue ? operatingIncome / revenue : 0
    };
  });
}

function calcCustomerProfitability() {
  const customers = readCustomers();
  const ranked = [...customers].sort((a, b) => b.operatingIncome - a.operatingIncome);
  const totalRevenue = customers.reduce((s, c) => s + c.revenue, 0);
  const totalOI = customers.reduce((s, c) => s + c.operatingIncome, 0);
  const totalCustomerCosts = customers.reduce((s, c) => s + c.customerCost, 0);

  const rows = ranked.map((c, idx) => '<tr>'
    + '<td>' + (idx + 1) + '. ' + c.name + '</td>'
    + '<td>' + fmt(c.revenue) + '</td>'
    + '<td>(' + fmt(c.product) + ')</td>'
    + '<td>' + fmt(c.grossMargin) + '</td>'
    + '<td>(' + fmt(c.orderCost) + ')</td>'
    + '<td>(' + fmt(c.deliveryCost) + ')</td>'
    + '<td>(' + fmt(c.supportCost) + ')</td>'
    + '<td>(' + fmt(c.returns) + ')</td>'
    + '<td class="' + resultClass(c.operatingIncome) + '">' + fmtD(c.operatingIncome) + '</td>'
    + '<td>' + fmtPct(c.margin) + '</td>'
    + '</tr>').join('');

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const out = getOrCreate('cpa-output', 'div', 'tool-output', el('cpa-output').parentElement);
  out.innerHTML = '<div class="ch12-t1-result">'
    + '<div class="result-grid" style="margin-top:var(--space-4);">'
    + '<div class="result-card"><div class="result-card__label">Total Revenue</div><div class="result-card__value">' + fmt(totalRevenue) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Total Customer Costs</div><div class="result-card__value">' + fmt(totalCustomerCosts) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Total Customer OI</div><div class="result-card__value ' + resultClass(totalOI) + '">' + fmtD(totalOI) + '</div></div>'
    + '</div>'
    + '<div style="overflow-x:auto;margin-top:var(--space-4);"><table class="ch12-result-table">'
    + '<thead><tr><th>Rank / Customer</th><th>Revenue</th><th>Product Cost</th><th>Gross Margin</th><th>Ordering</th><th>Delivery</th><th>Support</th><th>Returns</th><th>Customer OI</th><th>Margin</th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '<div class="ch12-insight" style="margin-top:var(--space-4);"><strong>Interpretation:</strong> ' + best.name + ' is the most profitable customer at ' + fmtD(best.operatingIncome) + '. ' + worst.name + ' is the weakest customer at ' + fmtD(worst.operatingIncome) + '. Profitability depends on service intensity, not revenue alone.</div>'
    + '</div>';

  renderShowWork(el('cpa-show-work'), [
    { label: 'Order cost pool', formula: 'Orders x Cost per Order', values: customers.map(c => c.name + ': ' + fmtN(c.orders) + ' x ' + fmt(val('cpa-order-rate'))).join('; '), result: fmt(customers.reduce((s, c) => s + c.orderCost, 0)) },
    { label: 'Delivery cost pool', formula: 'Deliveries x Cost per Delivery', values: customers.map(c => c.name + ': ' + fmtN(c.deliveries) + ' x ' + fmt(val('cpa-delivery-rate'))).join('; '), result: fmt(customers.reduce((s, c) => s + c.deliveryCost, 0)) },
    { label: 'Support cost pool', formula: 'Support Hours x Cost per Support Hour', values: customers.map(c => c.name + ': ' + fmtN(c.support) + ' x ' + fmt(val('cpa-support-rate'))).join('; '), result: fmt(customers.reduce((s, c) => s + c.supportCost, 0)) },
    { label: 'Total customer operating income', formula: 'Revenue - product costs - customer-level costs', values: ranked.map(c => c.name + ': ' + fmtD(c.operatingIncome)).join('; '), result: fmtD(totalOI), highlight: true }
  ], { title: 'Customer Profitability Show Work', defaultOpen: false });
}

function initCustomerProfitability() {
  const calcBtn = el('cpa-calculate');
  if (!calcBtn) return;
  calcBtn.addEventListener('click', calcCustomerProfitability);
  const loadBtn = el('cpa-load-example');
  if (loadBtn) loadBtn.addEventListener('click', () => {
    setVal('cpa-order-rate', 90);
    setVal('cpa-delivery-rate', 240);
    setVal('cpa-support-rate', 65);
    setVal('cpa-c1-name', 'Apex Retail'); setVal('cpa-c1-revenue', 920000); setVal('cpa-c1-product', 598000); setVal('cpa-c1-orders', 48); setVal('cpa-c1-deliveries', 24); setVal('cpa-c1-support', 140); setVal('cpa-c1-returns', 36000);
    setVal('cpa-c2-name', 'Beacon Wholesale'); setVal('cpa-c2-revenue', 760000); setVal('cpa-c2-product', 532000); setVal('cpa-c2-orders', 18); setVal('cpa-c2-deliveries', 10); setVal('cpa-c2-support', 52); setVal('cpa-c2-returns', 12000);
    setVal('cpa-c3-name', 'Cobalt Online'); setVal('cpa-c3-revenue', 510000); setVal('cpa-c3-product', 357000); setVal('cpa-c3-orders', 92); setVal('cpa-c3-deliveries', 64); setVal('cpa-c3-support', 260); setVal('cpa-c3-returns', 42000);
    calcCustomerProfitability();
  });
  initRandomizer('cpa-randomize', [
    { id: 'cpa-order-rate', min: 40, max: 160, step: 10, integer: true },
    { id: 'cpa-delivery-rate', min: 100, max: 450, step: 25, integer: true },
    { id: 'cpa-support-rate', min: 35, max: 125, step: 5, integer: true },
    { id: 'cpa-c1-revenue', min: 400000, max: 1200000, step: 25000, integer: true },
    { id: 'cpa-c2-revenue', min: 400000, max: 1200000, step: 25000, integer: true },
    { id: 'cpa-c3-revenue', min: 400000, max: 1200000, step: 25000, integer: true },
    { id: 'cpa-c1-orders', min: 10, max: 120, step: 1, integer: true },
    { id: 'cpa-c2-orders', min: 10, max: 120, step: 1, integer: true },
    { id: 'cpa-c3-orders', min: 10, max: 120, step: 1, integer: true }
  ], () => {
    [1, 2, 3].forEach(i => {
      const rev = val('cpa-c' + i + '-revenue');
      setVal('cpa-c' + i + '-product', Math.round(rev * (0.58 + Math.random() * 0.18) / 1000) * 1000);
      setVal('cpa-c' + i + '-deliveries', Math.max(4, Math.round(val('cpa-c' + i + '-orders') * (0.35 + Math.random() * 0.35))));
      setVal('cpa-c' + i + '-support', Math.round(30 + Math.random() * 280));
      setVal('cpa-c' + i + '-returns', Math.round(rev * (0.01 + Math.random() * 0.07) / 1000) * 1000);
    });
    calcCustomerProfitability();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Whale Curve Builder
// ══════════════════════════════════════════════════════════════════════════════

let whaleCustomers = [
  { name: 'Northstar', profit: 128000 },
  { name: 'Harbor', profit: 98000 },
  { name: 'Summit', profit: 76000 },
  { name: 'Orion', profit: 42000 },
  { name: 'Pioneer', profit: 21000 },
  { name: 'Metro', profit: 9000 },
  { name: 'Lakeside', profit: 2000 },
  { name: 'Canyon', profit: -6000 },
  { name: 'Juniper', profit: -14000 },
  { name: 'Keystone', profit: -27000 },
  { name: 'Riverton', profit: -42000 },
  { name: 'Vista', profit: -61000 }
];

function buildWhaleCurve() {
  const sorted = [...whaleCustomers].sort((a, b) => b.profit - a.profit);
  const cumulative = [];
  let running = 0;
  sorted.forEach(c => {
    running += c.profit;
    cumulative.push({ ...c, cumulative: running });
  });
  const totalProfit = running;
  const peak = cumulative.reduce((max, c) => c.cumulative > max.cumulative ? c : max, cumulative[0]);
  const lossCustomers = sorted.filter(c => c.profit < 0);
  const maxY = Math.max(...cumulative.map(c => c.cumulative), Math.abs(Math.min(...cumulative.map(c => c.cumulative), 0)), Math.abs(totalProfit), 1);
  const width = 760;
  const height = 300;
  const pad = 48;
  const points = cumulative.map((c, i) => {
    const x = pad + (i / (cumulative.length - 1)) * (width - pad * 2);
    const y = pad + (1 - ((c.cumulative + maxY * 0.15) / (maxY * 1.3))) * (height - pad * 2);
    return { x, y, ...c };
  });
  const zeroY = pad + (1 - ((0 + maxY * 0.15) / (maxY * 1.3))) * (height - pad * 2);
  const path = points.map((p, i) => (i === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  const circles = points.map(p => '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="var(--color-accent)"><title>' + p.name + ': cumulative ' + fmtD(p.cumulative) + '</title></circle>').join('');
  const rows = cumulative.map((c, i) => '<tr>'
    + '<td>' + (i + 1) + '</td>'
    + '<td>' + c.name + '</td>'
    + '<td class="' + resultClass(c.profit) + '">' + fmtD(c.profit) + '</td>'
    + '<td class="' + resultClass(c.cumulative) + '">' + fmtD(c.cumulative) + '</td>'
    + '</tr>').join('');

  const out = getOrCreate('whale-output', 'div', 'tool-output', el('whale-output').parentElement);
  out.innerHTML = '<div class="result-grid" style="margin-top:var(--space-4);">'
    + '<div class="result-card"><div class="result-card__label">Total Customer Profit</div><div class="result-card__value ' + resultClass(totalProfit) + '">' + fmtD(totalProfit) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Peak Cumulative Profit</div><div class="result-card__value">' + fmtD(peak.cumulative) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Loss Customers</div><div class="result-card__value">' + lossCustomers.length + '</div></div>'
    + '</div>'
    + '<div class="card" style="margin-top:var(--space-4);overflow-x:auto;">'
    + '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Whale curve chart" style="width:100%;min-width:680px;max-height:360px;">'
    + '<line x1="' + pad + '" y1="' + zeroY.toFixed(1) + '" x2="' + (width - pad) + '" y2="' + zeroY.toFixed(1) + '" stroke="var(--color-gray-300)" stroke-width="2" />'
    + '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (height - pad) + '" stroke="var(--color-gray-300)" />'
    + '<line x1="' + pad + '" y1="' + (height - pad) + '" x2="' + (width - pad) + '" y2="' + (height - pad) + '" stroke="var(--color-gray-300)" />'
    + '<path d="' + path + '" fill="none" stroke="var(--color-primary)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />'
    + circles
    + '<text x="' + pad + '" y="' + (pad - 16) + '" fill="var(--color-gray-600)" font-size="13">Cumulative customer profit</text>'
    + '<text x="' + (width - pad - 145) + '" y="' + (height - 14) + '" fill="var(--color-gray-600)" font-size="13">Customers ranked by profit</text>'
    + '</svg></div>'
    + '<div style="overflow-x:auto;margin-top:var(--space-4);"><table class="ch12-result-table"><thead><tr><th>Rank</th><th>Customer</th><th>Individual Profit</th><th>Cumulative Profit</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    + '<div class="ch12-insight" style="margin-top:var(--space-4);"><strong>Interpretation:</strong> The curve peaks at ' + fmtD(peak.cumulative) + ' after ' + peak.name + '. Loss customers reduce cumulative profit to final company profit of ' + fmtD(totalProfit) + '.</div>';

  renderShowWork(el('whale-show-work'), [
    { label: 'Rank customers', formula: 'Sort individual customer profits from highest to lowest', values: sorted.slice(0, 4).map(c => c.name + ': ' + fmtD(c.profit)).join('; ') + '...', result: 'Ranking complete' },
    { label: 'Compute cumulative profit', formula: 'Running sum of ranked customer profits', values: 'Peak: ' + fmtD(peak.cumulative) + '; Final: ' + fmtD(totalProfit), result: fmtD(totalProfit), highlight: true },
    { label: 'Profit erosion from loss customers', formula: 'Peak cumulative profit - final profit', values: fmtD(peak.cumulative) + ' - ' + fmtD(totalProfit), result: fmt(peak.cumulative - totalProfit) }
  ], { title: 'Whale Curve Show Work', defaultOpen: false });
}

function initWhaleCurve() {
  const buildBtn = el('whale-build');
  if (!buildBtn) return;
  buildBtn.addEventListener('click', buildWhaleCurve);
  const loadBtn = el('whale-load-example');
  if (loadBtn) loadBtn.addEventListener('click', () => {
    whaleCustomers = [
      { name: 'Northstar', profit: 128000 }, { name: 'Harbor', profit: 98000 }, { name: 'Summit', profit: 76000 },
      { name: 'Orion', profit: 42000 }, { name: 'Pioneer', profit: 21000 }, { name: 'Metro', profit: 9000 },
      { name: 'Lakeside', profit: 2000 }, { name: 'Canyon', profit: -6000 }, { name: 'Juniper', profit: -14000 },
      { name: 'Keystone', profit: -27000 }, { name: 'Riverton', profit: -42000 }, { name: 'Vista', profit: -61000 }
    ];
    buildWhaleCurve();
  });
  const randomBtn = el('whale-randomize');
  if (randomBtn) randomBtn.addEventListener('click', () => {
    const names = ['Atlas', 'Baker', 'Cedar', 'Delta', 'Elm', 'Falcon', 'Grove', 'Hudson', 'Ivory', 'Jasper', 'Kingston', 'Logan'];
    whaleCustomers = names.map((name, i) => {
      const base = 120000 - i * 16000;
      const noise = Math.round((Math.random() * 32000 - 12000) / 1000) * 1000;
      return { name, profit: base + noise - (i > 6 ? i * 12000 : 0) };
    });
    buildWhaleCurve();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Sales Variance Calculator
// ══════════════════════════════════════════════════════════════════════════════

function readSalesProducts() {
  return [1, 2].map(i => ({
    name: sval('sv-p' + i + '-name') || 'Product ' + i,
    budgetQty: val('sv-p' + i + '-bq'),
    actualQty: val('sv-p' + i + '-aq'),
    cm: val('sv-p' + i + '-cm')
  }));
}

function calcSalesVariances() {
  const p = readSalesProducts();
  const budgetTotalQty = p.reduce((s, x) => s + x.budgetQty, 0);
  const actualTotalQty = p.reduce((s, x) => s + x.actualQty, 0);
  const budgetMix = p.map(x => budgetTotalQty ? x.budgetQty / budgetTotalQty : 0);
  const actualMix = p.map(x => actualTotalQty ? x.actualQty / actualTotalQty : 0);
  const weightedBudgetCM = p.reduce((s, x, i) => s + budgetMix[i] * x.cm, 0);

  const salesVolumeVariance = p.reduce((s, x) => s + (x.actualQty - x.budgetQty) * x.cm, 0);
  const salesMixVariance = p.reduce((s, x, i) => s + (actualMix[i] - budgetMix[i]) * actualTotalQty * x.cm, 0);
  const salesQuantityVariance = (actualTotalQty - budgetTotalQty) * weightedBudgetCM;

  const budgetMarket = val('sv-budget-market');
  const actualMarket = val('sv-actual-market');
  const budgetMarketShare = budgetMarket ? budgetTotalQty / budgetMarket : 0;
  const actualMarketShare = actualMarket ? actualTotalQty / actualMarket : 0;
  const marketShareVariance = (actualMarketShare - budgetMarketShare) * actualMarket * weightedBudgetCM;
  const marketSizeVariance = (actualMarket - budgetMarket) * budgetMarketShare * weightedBudgetCM;

  const rows = p.map((x, i) => '<tr>'
    + '<td>' + x.name + '</td>'
    + '<td>' + fmtN(x.budgetQty) + '</td>'
    + '<td>' + fmtN(x.actualQty) + '</td>'
    + '<td>' + fmtPct(budgetMix[i]) + '</td>'
    + '<td>' + fmtPct(actualMix[i]) + '</td>'
    + '<td>' + fmt(x.cm) + '</td>'
    + '<td class="' + resultClass((actualMix[i] - budgetMix[i]) * actualTotalQty * x.cm) + '">' + fmtD((actualMix[i] - budgetMix[i]) * actualTotalQty * x.cm) + '</td>'
    + '</tr>').join('');

  const out = getOrCreate('sv-output', 'div', 'tool-output', el('sv-output').parentElement);
  out.innerHTML = '<div class="result-grid" style="margin-top:var(--space-4);">'
    + '<div class="result-card"><div class="result-card__label">Sales-Volume Variance</div><div class="result-card__value ' + resultClass(salesVolumeVariance) + '">' + fmtD(salesVolumeVariance) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Sales-Mix Variance</div><div class="result-card__value ' + resultClass(salesMixVariance) + '">' + fmtD(salesMixVariance) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Sales-Quantity Variance</div><div class="result-card__value ' + resultClass(salesQuantityVariance) + '">' + fmtD(salesQuantityVariance) + '</div></div>'
    + '</div>'
    + '<div style="overflow-x:auto;margin-top:var(--space-4);"><table class="ch12-result-table"><thead><tr><th>Product</th><th>Budget Units</th><th>Actual Units</th><th>Budget Mix</th><th>Actual Mix</th><th>Budget CM</th><th>Mix Effect</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    + '<div class="result-grid" style="margin-top:var(--space-4);">'
    + '<div class="result-card"><div class="result-card__label">Budget Market Share</div><div class="result-card__value">' + fmtPct(budgetMarketShare) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Actual Market Share</div><div class="result-card__value">' + fmtPct(actualMarketShare) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Market-Share Variance</div><div class="result-card__value ' + resultClass(marketShareVariance) + '">' + fmtD(marketShareVariance) + '</div></div>'
    + '<div class="result-card"><div class="result-card__label">Market-Size Variance</div><div class="result-card__value ' + resultClass(marketSizeVariance) + '">' + fmtD(marketSizeVariance) + '</div></div>'
    + '</div>'
    + '<div class="ch12-insight" style="margin-top:var(--space-4);"><strong>Check:</strong> Sales-volume variance equals sales-mix plus sales-quantity variance: ' + fmtD(salesVolumeVariance) + ' vs. ' + fmtD(salesMixVariance + salesQuantityVariance) + '. Sales-quantity variance equals market-share plus market-size variance: ' + fmtD(salesQuantityVariance) + ' vs. ' + fmtD(marketShareVariance + marketSizeVariance) + '.</div>';

  renderShowWork(el('sv-show-work'), [
    { label: 'Weighted-average budgeted contribution margin', formula: 'Sum of budget mix x budget CM per unit', values: p.map((x, i) => fmtPct(budgetMix[i]) + ' x ' + fmt(x.cm)).join(' + '), result: fmt(weightedBudgetCM) },
    { label: 'Sales-volume variance', formula: 'Sum of (actual units - budget units) x budget CM', values: p.map(x => '(' + fmtN(x.actualQty) + ' - ' + fmtN(x.budgetQty) + ') x ' + fmt(x.cm)).join(' + '), result: fmtD(salesVolumeVariance), highlight: true },
    { label: 'Sales-mix variance', formula: 'Sum of (actual mix - budget mix) x actual total units x budget CM', values: 'Actual total units: ' + fmtN(actualTotalQty), result: fmtD(salesMixVariance) },
    { label: 'Sales-quantity variance', formula: '(Actual total units - Budget total units) x Weighted budget CM', values: '(' + fmtN(actualTotalQty) + ' - ' + fmtN(budgetTotalQty) + ') x ' + fmt(weightedBudgetCM), result: fmtD(salesQuantityVariance) },
    { label: 'Market-share variance', formula: '(Actual share - Budget share) x Actual market size x Weighted budget CM', values: '(' + fmtPct(actualMarketShare) + ' - ' + fmtPct(budgetMarketShare) + ') x ' + fmtN(actualMarket), result: fmtD(marketShareVariance) },
    { label: 'Market-size variance', formula: '(Actual market size - Budget market size) x Budget share x Weighted budget CM', values: '(' + fmtN(actualMarket) + ' - ' + fmtN(budgetMarket) + ') x ' + fmtPct(budgetMarketShare), result: fmtD(marketSizeVariance) }
  ], { title: 'Sales Variance Show Work', defaultOpen: false });
}

function initSalesVariance() {
  const calcBtn = el('sv-calculate');
  if (!calcBtn) return;
  calcBtn.addEventListener('click', calcSalesVariances);
  const loadBtn = el('sv-load-example');
  if (loadBtn) loadBtn.addEventListener('click', () => {
    setVal('sv-p1-name', 'Standard'); setVal('sv-p1-bq', 9000); setVal('sv-p1-aq', 7600); setVal('sv-p1-cm', 18);
    setVal('sv-p2-name', 'Premium'); setVal('sv-p2-bq', 6000); setVal('sv-p2-aq', 8100); setVal('sv-p2-cm', 35);
    setVal('sv-budget-market', 150000); setVal('sv-actual-market', 157000);
    calcSalesVariances();
  });
  initRandomizer('sv-randomize', [
    { id: 'sv-p1-bq', min: 4000, max: 15000, step: 500, integer: true },
    { id: 'sv-p1-aq', min: 4000, max: 15000, step: 500, integer: true },
    { id: 'sv-p1-cm', min: 10, max: 45, step: 1, integer: true },
    { id: 'sv-p2-bq', min: 4000, max: 15000, step: 500, integer: true },
    { id: 'sv-p2-aq', min: 4000, max: 15000, step: 500, integer: true },
    { id: 'sv-p2-cm', min: 15, max: 70, step: 1, integer: true },
    { id: 'sv-budget-market', min: 90000, max: 250000, step: 5000, integer: true },
    { id: 'sv-actual-market', min: 90000, max: 250000, step: 5000, integer: true }
  ], calcSalesVariances);
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Cost Allocation', definition: 'The assignment of indirect costs to a cost object, such as a customer, product, department, or distribution channel.' },
  { term: 'Cost Object', definition: 'Anything for which managers want a separate measurement of cost. Customers and distribution channels can be cost objects.' },
  { term: 'Customer Output-Unit-Level Cost', definition: 'A customer cost driven by each unit sold or shipped to a customer.' },
  { term: 'Customer Batch-Level Cost', definition: 'A customer cost driven by a batch of customer activity, such as an order, delivery, or sales visit.' },
  { term: 'Customer-Sustaining Cost', definition: 'A cost incurred to support an individual customer regardless of the number of units or orders.' },
  { term: 'Distribution-Channel Cost', definition: 'A cost incurred to support a particular channel, such as retail, wholesale, online, or dealer networks.' },
  { term: 'Corporate-Sustaining Cost', definition: 'A cost that supports the organization as a whole and is not meaningfully traceable to individual customers or channels.' },
  { term: 'Customer Profitability Analysis', definition: 'Reporting and analysis that identifies revenues, product costs, and customer-level costs to determine operating income by customer.' },
  { term: 'Whale Curve', definition: 'A graph of cumulative customer profitability after ranking customers from most profitable to least profitable.' },
  { term: 'Sales-Mix Variance', definition: 'The effect on contribution margin of selling a different mix of products than budgeted, holding total actual units constant.' },
  { term: 'Sales-Quantity Variance', definition: 'The effect on contribution margin of selling more or fewer total units than budgeted, holding the budgeted mix constant.' },
  { term: 'Market-Share Variance', definition: 'The portion of sales-quantity variance caused by changes in the company share of the market.' },
  { term: 'Market-Size Variance', definition: 'The portion of sales-quantity variance caused by changes in total industry market size.' }
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
  if (el('ch15-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch15-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch15');
    const markBtn = el('mark-complete-btn');
    if (markBtn) {
      markBtn.textContent = 'Mark as Complete';
      markBtn.disabled = false;
      markBtn.classList.remove('btn--success');
    }
    const status = el('ch15-status');
    if (status) status.textContent = 'Not started';
    resetBtn.remove();
  });
  card.appendChild(resetBtn);
}

function initChapterComplete() {
  const btn = el('mark-complete-btn');
  const card = el('chapter-complete');
  const status = el('ch15-status');
  if (!btn || !card) return;
  if (isChapterComplete('ch15')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch15');
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
  initHierarchyClassifier();
  initCustomerProfitability();
  initWhaleCurve();
  initSalesVariance();
  initKeyTerms();
  initChapterComplete();
});
