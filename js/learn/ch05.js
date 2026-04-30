/**
 * ch05.js -- Chapter 5: Activity-Based Costing and Activity-Based Management
 * Tools: Simple vs ABC Comparator, Cost Hierarchy Classifier,
 *        ABC System Builder, ABM Decisions
 */
import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';

// ── Data ──────────────────────────────────────────────────────

const HIERARCHY_SCENARIOS = [
  {
    scenario: 'Plastim Corporation: Energy costs to run molding machines. These costs increase each time an additional lens is produced.',
    answer: 'unit',
    explanation: 'Machine energy costs vary with each unit produced -- they are output unit-level costs. The cost driver is molding machine-hours, which increases with each unit of output.'
  },
  {
    scenario: 'Plastim Corporation: Setup costs to prepare molding machines before each production run. Complex lenses require more setup time per batch.',
    answer: 'batch',
    explanation: 'Setup costs vary with the number of batches (production runs), not the number of individual units. Whether a batch contains 50 or 500 lenses, the setup cost is the same -- batch-level.'
  },
  {
    scenario: 'Plastim Corporation: Design department costs for engineering the mold and specifying the manufacturing process for each lens type.',
    answer: 'product',
    explanation: 'Design costs support a specific product regardless of how many units or batches are produced. They are product-sustaining costs driven by mold complexity (parts-square feet).'
  },
  {
    scenario: 'Plastim Corporation: General administration costs including top management compensation, rent, and building security.',
    answer: 'facility',
    explanation: 'Administration costs support the entire organization and cannot be traced to individual products, batches, or product lines. They are facility-sustaining costs.'
  },
  {
    scenario: 'SharpPitch Inc.: Procurement costs of placing purchase orders, receiving materials, and paying suppliers -- costs that vary with the number of purchase orders placed.',
    answer: 'batch',
    explanation: 'Purchase order costs vary with the number of orders placed, not the number of units. Each order is a batch-level event -- batch-level costs.'
  },
  {
    scenario: 'SharpPitch Inc.: Machine-related overhead costs such as depreciation, maintenance, and production engineering that relate to running the machines.',
    answer: 'unit',
    explanation: 'Machine depreciation and maintenance costs increase with machine usage, which increases with units produced. These are output unit-level costs.'
  },
  {
    scenario: 'SharpPitch Inc.: Costs of designing processes, drawing process charts, and making engineering changes for specific products.',
    answer: 'product',
    explanation: 'Process design costs support specific products regardless of production volume. They are product-sustaining costs -- incurred once per product, not per unit or batch.'
  },
  {
    scenario: 'SharpPitch Inc.: Plant management salaries, plant rent, and plant insurance costs that support all manufacturing operations.',
    answer: 'facility',
    explanation: 'Plant-level costs support the entire facility and cannot be meaningfully traced to individual products or batches. They are facility-sustaining costs.'
  },
  {
    scenario: 'Pharmassist Inc.: Shelf-stocking labor costs that vary with the hours spent stocking merchandise on store shelves for each product line.',
    answer: 'unit',
    explanation: 'Shelf-stocking costs vary with the hours of stocking time, which increases with the volume of items sold. These are output unit-level costs driven by stocking hours.'
  },
  {
    scenario: 'Pharmassist Inc.: Order processing costs that vary with the number of customer purchase orders placed, regardless of the size of each order.',
    answer: 'batch',
    explanation: 'Order processing costs vary with the number of orders, not the number of line items or units in each order. Each order is a batch-level event -- batch-level costs.'
  },
];

const HIERARCHY_LEVELS = [
  { id: 'unit',     label: 'Output Unit-Level', sub: 'Varies per unit' },
  { id: 'batch',    label: 'Batch-Level',        sub: 'Varies per batch' },
  { id: 'product',  label: 'Product-Sustaining', sub: 'Supports a product line' },
  { id: 'facility', label: 'Facility-Sustaining', sub: 'Supports the whole org' },
];

const DEFAULT_POOLS = [
  { name: 'Design',              hierarchy: 'product',  cost: 450000,  driver: 'Parts-square feet',       totalQty: 100,   p1Qty: 30,    p2Qty: 70    },
  { name: 'Molding Machine Setup', hierarchy: 'batch',  cost: 300000,  driver: 'Setup-hours',             totalQty: 2000,  p1Qty: 500,   p2Qty: 1500  },
  { name: 'Machine Operations',  hierarchy: 'unit',     cost: 637500,  driver: 'Molding machine-hours',   totalQty: 12750, p1Qty: 9000,  p2Qty: 3750  },
  { name: 'Shipment Setup',      hierarchy: 'batch',    cost: 81000,   driver: 'Shipment setup-hours',    totalQty: 1500,  p1Qty: 750,   p2Qty: 750   },
  { name: 'Distribution',        hierarchy: 'unit',     cost: 391500,  driver: 'Cubic feet delivered',    totalQty: 67500, p1Qty: 45000, p2Qty: 22500 },
  { name: 'Administration',      hierarchy: 'facility', cost: 255000,  driver: 'Direct manuf. labor-hrs', totalQty: 39750, p1Qty: 30000, p2Qty: 9750  },
];

const KEY_TERMS = [
  { term: 'Activity-Based Costing (ABC)', definition: 'A costing system that refines a costing system by identifying individual activities as the fundamental source of indirect costs. ABC systems calculate costs of individual activities and assign costs to cost objects based on the mix of activities needed to produce each product or service.' },
  { term: 'Activity', definition: 'An event, task, or unit of work with a specified purpose. Examples: designing products, setting up machines, operating machines, distributing products. More informally, activities are verbs -- things a firm does.' },
  { term: 'Cost Hierarchy', definition: 'A categorization of activity-cost pools based on different types of cost drivers or different degrees of difficulty in determining cause-and-effect relationships. The four levels are: output unit-level, batch-level, product-sustaining, and facility-sustaining.' },
  { term: 'Output Unit-Level Costs', definition: 'Costs of activities performed that vary with each individual unit of the cost object. Example: machine energy costs that increase with each unit produced.' },
  { term: 'Batch-Level Costs', definition: 'Costs of activities that vary with a group of units rather than each individual unit. Example: setup costs that vary with the number of setups (batches), regardless of batch size.' },
  { term: 'Product-Sustaining Costs', definition: 'Costs of activities undertaken to support individual products or services regardless of the number of units or batches produced. Example: design costs that depend on product complexity, not production volume.' },
  { term: 'Facility-Sustaining Costs', definition: 'Costs of activities that support the organization as a whole and cannot be traced to individual products. Example: general administration, plant rent, building security.' },
  { term: 'Broad Averaging', definition: 'Also called peanut-butter costing. Spreading the cost of resources uniformly to cost objects when individual products use those resources in nonuniform ways. Leads to product undercosting and overcosting.' },
  { term: 'Product Undercosting', definition: 'When the cost measurement system reports a cost for a product that is below the cost of the resources the product actually consumes. Undercosted products are underpriced, potentially causing losses.' },
  { term: 'Product Overcosting', definition: 'When the cost measurement system reports a cost for a product that is above the cost of the resources the product actually consumes. Overcosted products are overpriced, potentially losing market share.' },
  { term: 'Product-Cost Cross-Subsidization', definition: 'When a company undercosts one product, it overcosts at least one other product. The undercosted product is subsidized by the overcosted product.' },
  { term: 'Refined Costing System', definition: 'A costing system that replaces broad averages with better measurement of the costs of indirect resources used by different cost objects. Three guidelines: trace more costs as direct, increase indirect-cost pools, identify cost drivers.' },
  { term: 'Activity-Based Management (ABM)', definition: 'A method of management decision making that uses ABC information to improve customer satisfaction and profitability. Includes pricing decisions, product-mix decisions, cost reduction, process improvement, and product and process design.' },
  { term: 'Time-Driven Activity-Based Costing (TDABC)', definition: 'An ABC system that uses available time to allocate activity costs to cost objects. Requires two estimates: the cost of supplying resource capacity, and the time each activity consumes.' },
  { term: 'First-Stage Allocation', definition: 'The process of assigning costs from account classifications (salaries, depreciation, etc.) to activity-cost pools based on cause-and-effect relationships.' },
  { term: 'Second-Stage Allocation', definition: 'The allocation of costs from activity-cost pools to cost objects such as products or services, using cost drivers as allocation bases.' },
];

const fmt    = n => '$' + Math.round(n).toLocaleString();
const fmtDec = (n, d=2) => '$' + n.toFixed(d);
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

// ── Tool 1: Simple vs ABC Comparator ─────────────────────────

function initComparator() {
  const calcBtn = document.getElementById('abc-comp-calculate');
  const results = document.getElementById('abc-comp-results');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', calculate);

  function getVal(id) { return parseFloat(document.getElementById(id)?.value) || 0; }
  function getStr(id) { return document.getElementById(id)?.value || ''; }

  function calculate() {
    const p1Name      = getStr('cp-p1-name');
    const p2Name      = getStr('cp-p2-name');
    const p1Units     = getVal('cp-p1-units');
    const p2Units     = getVal('cp-p2-units');
    const p1DM        = getVal('cp-p1-dm');
    const p2DM        = getVal('cp-p2-dm');
    const p1DL        = getVal('cp-p1-dl');
    const p2DL        = getVal('cp-p2-dl');
    const p1DLH       = getVal('cp-p1-dlh');
    const p2DLH       = getVal('cp-p2-dlh');
    const p1AbcOH     = getVal('cp-p1-abc-oh');
    const p2AbcOH     = getVal('cp-p2-abc-oh');
    const totalOH     = getVal('cp-total-oh');
    const p1ExtraDirect = getVal('cp-p1-extra-direct');
    const p2ExtraDirect = getVal('cp-p2-extra-direct');

    const totalDLH    = p1Units * p1DLH + p2Units * p2DLH;
    const simpleRate  = totalDLH > 0 ? totalOH / totalDLH : 0;

    const p1SimpleDirect = (p1DM + p1DL) * p1Units;
    const p2SimpleDirect = (p2DM + p2DL) * p2Units;
    const p1SimpleOH     = simpleRate * p1Units * p1DLH;
    const p2SimpleOH     = simpleRate * p2Units * p2DLH;
    const p1SimpleTotal  = p1SimpleDirect + p1SimpleOH;
    const p2SimpleTotal  = p2SimpleDirect + p2SimpleOH;
    const p1SimpleUnit   = p1Units > 0 ? p1SimpleTotal / p1Units : 0;
    const p2SimpleUnit   = p2Units > 0 ? p2SimpleTotal / p2Units : 0;

    const p1AbcDirect = (p1DM + p1DL) * p1Units + p1ExtraDirect;
    const p2AbcDirect = (p2DM + p2DL) * p2Units + p2ExtraDirect;
    const p1AbcTotal  = p1AbcDirect + p1AbcOH;
    const p2AbcTotal  = p2AbcDirect + p2AbcOH;
    const p1AbcUnit   = p1Units > 0 ? p1AbcTotal / p1Units : 0;
    const p2AbcUnit   = p2Units > 0 ? p2AbcTotal / p2Units : 0;

    const p1Diff = p1AbcUnit - p1SimpleUnit;
    const p2Diff = p2AbcUnit - p2SimpleUnit;

    const tableEl = getOrCreate('abc-comp-table', 'div', 'abc-comp-table-wrapper', results);
    tableEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="num">Simple Costing</th>
            <th class="num">ABC System</th>
            <th class="num">Difference</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="4" style="font-weight:700;background:var(--color-gray-50);padding:var(--space-2) var(--space-4)">${p1Name}</td></tr>
          <tr><td style="padding-left:var(--space-8)">Direct Costs</td><td style="text-align:right">${fmt(p1SimpleDirect)}</td><td style="text-align:right">${fmt(p1AbcDirect)}</td><td style="text-align:right;color:${p1AbcDirect > p1SimpleDirect ? 'var(--color-danger)' : 'var(--color-success)'}">${p1AbcDirect > p1SimpleDirect ? '+' : ''}${fmt(p1AbcDirect - p1SimpleDirect)}</td></tr>
          <tr><td style="padding-left:var(--space-8)">Indirect Costs Allocated</td><td style="text-align:right">${fmt(p1SimpleOH)}</td><td style="text-align:right">${fmt(p1AbcOH)}</td><td style="text-align:right;color:${p1AbcOH > p1SimpleOH ? 'var(--color-danger)' : 'var(--color-success)'}">${p1AbcOH > p1SimpleOH ? '+' : ''}${fmt(p1AbcOH - p1SimpleOH)}</td></tr>
          <tr style="font-weight:700"><td style="padding-left:var(--space-8)">Total Cost</td><td style="text-align:right">${fmt(p1SimpleTotal)}</td><td style="text-align:right">${fmt(p1AbcTotal)}</td><td style="text-align:right;color:${p1Diff > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${p1Diff > 0 ? '+' : ''}${fmt(p1AbcTotal - p1SimpleTotal)}</td></tr>
          <tr style="font-weight:700;color:var(--color-primary)"><td style="padding-left:var(--space-8)">Cost per Unit</td><td style="text-align:right">${fmtDec(p1SimpleUnit)}</td><td style="text-align:right">${fmtDec(p1AbcUnit)}</td><td style="text-align:right;color:${p1Diff > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${p1Diff > 0 ? '+' : ''}${fmtDec(p1Diff)}</td></tr>
          <tr><td colspan="4" style="font-weight:700;background:var(--color-gray-50);padding:var(--space-2) var(--space-4)">${p2Name}</td></tr>
          <tr><td style="padding-left:var(--space-8)">Direct Costs</td><td style="text-align:right">${fmt(p2SimpleDirect)}</td><td style="text-align:right">${fmt(p2AbcDirect)}</td><td style="text-align:right;color:${p2AbcDirect > p2SimpleDirect ? 'var(--color-danger)' : 'var(--color-success)'}">${p2AbcDirect > p2SimpleDirect ? '+' : ''}${fmt(p2AbcDirect - p2SimpleDirect)}</td></tr>
          <tr><td style="padding-left:var(--space-8)">Indirect Costs Allocated</td><td style="text-align:right">${fmt(p2SimpleOH)}</td><td style="text-align:right">${fmt(p2AbcOH)}</td><td style="text-align:right;color:${p2AbcOH > p2SimpleOH ? 'var(--color-danger)' : 'var(--color-success)'}">${p2AbcOH > p2SimpleOH ? '+' : ''}${fmt(p2AbcOH - p2SimpleOH)}</td></tr>
          <tr style="font-weight:700"><td style="padding-left:var(--space-8)">Total Cost</td><td style="text-align:right">${fmt(p2SimpleTotal)}</td><td style="text-align:right">${fmt(p2AbcTotal)}</td><td style="text-align:right;color:${p2Diff > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${p2Diff > 0 ? '+' : ''}${fmt(p2AbcTotal - p2SimpleTotal)}</td></tr>
          <tr style="font-weight:700;color:var(--color-primary)"><td style="padding-left:var(--space-8)">Cost per Unit</td><td style="text-align:right">${fmtDec(p2SimpleUnit)}</td><td style="text-align:right">${fmtDec(p2AbcUnit)}</td><td style="text-align:right;color:${p2Diff > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${p2Diff > 0 ? '+' : ''}${fmtDec(p2Diff)}</td></tr>
        </tbody>
      </table>
    `;

    const p1Over = p1Diff < 0;
    const p2Over = p2Diff > 0;
    const insightEl = getOrCreate('abc-comp-insight', 'div', 'abc-comp-insight', results);
    insightEl.innerHTML = `
      <strong>Cross-subsidization detected:</strong>
      The simple costing system ${p1Over ? 'overcosts' : 'undercosts'} <strong>${p1Name}</strong> by
      <strong>${fmtDec(Math.abs(p1Diff))}/unit</strong> and
      ${p2Over ? 'overcosts' : 'undercosts'} <strong>${p2Name}</strong> by
      <strong>${fmtDec(Math.abs(p2Diff))}/unit</strong>.
      This is product-cost cross-subsidization -- when one product is overcosted, at least one other must be undercosted.
      The ${p2Over ? p2Name : p1Name} (more complex product) consumes disproportionately more indirect resources
      than the single allocation base (direct labor-hours) captures.
    `;

    results.hidden = false;

    const sw = getOrCreate('abc-comp-show-work', 'div', '', results);
    renderShowWork(sw, [
      {
        label:   'Simple Costing -- Overhead Rate',
        formula: 'Rate = Total Indirect Costs / Total Direct Labor-Hours',
        values:  `${fmt(totalOH)} / ${totalDLH.toLocaleString()} DL-hrs`,
        result:  fmtDec(simpleRate) + '/DL-hr',
      },
      {
        label:   `Simple Costing -- ${p1Name} Overhead Allocated`,
        formula: 'OH = Rate x Units x DL-hrs per unit',
        values:  `${fmtDec(simpleRate)} x ${p1Units.toLocaleString()} x ${p1DLH}`,
        result:  fmt(p1SimpleOH),
      },
      {
        label:   `Simple Costing -- ${p2Name} Overhead Allocated`,
        formula: 'OH = Rate x Units x DL-hrs per unit',
        values:  `${fmtDec(simpleRate)} x ${p2Units.toLocaleString()} x ${p2DLH}`,
        result:  fmt(p2SimpleOH),
      },
      {
        label:   `${p1Name} Cost per Unit -- Simple vs ABC`,
        formula: 'Unit Cost = Total Cost / Units Produced',
        values:  `Simple: ${fmt(p1SimpleTotal)} / ${p1Units.toLocaleString()} | ABC: ${fmt(p1AbcTotal)} / ${p1Units.toLocaleString()}`,
        result:  `Simple: ${fmtDec(p1SimpleUnit)} | ABC: ${fmtDec(p1AbcUnit)}`,
        highlight: true,
      },
      {
        label:   `${p2Name} Cost per Unit -- Simple vs ABC`,
        formula: 'Unit Cost = Total Cost / Units Produced',
        values:  `Simple: ${fmt(p2SimpleTotal)} / ${p2Units.toLocaleString()} | ABC: ${fmt(p2AbcTotal)} / ${p2Units.toLocaleString()}`,
        result:  `Simple: ${fmtDec(p2SimpleUnit)} | ABC: ${fmtDec(p2AbcUnit)}`,
        highlight: true,
        note: `The difference of ${fmtDec(Math.abs(p1Diff))}/unit on ${p1Name} and ${fmtDec(Math.abs(p2Diff))}/unit on ${p2Name} is product-cost cross-subsidization caused by broad averaging.`,
      },
    ], { title: 'Show Work -- Simple vs. ABC Costing' });
  }

  initRandomizer('abc-comp-randomize', [
    { id: 'cp-p1-units',       min: 5000,   max: 100000, step: 5000,  integer: true },
    { id: 'cp-p1-dm',          min: 5,      max: 100,    step: 2.5,   integer: false },
    { id: 'cp-p1-dl',          min: 5,      max: 50,     step: 2.5,   integer: false },
    { id: 'cp-p1-dlh',         min: 0.25,   max: 2,      step: 0.25,  integer: false },
    { id: 'cp-p2-units',       min: 1000,   max: 30000,  step: 1000,  integer: true },
    { id: 'cp-p2-dm',          min: 20,     max: 200,    step: 5,     integer: false },
    { id: 'cp-p2-dl',          min: 10,     max: 80,     step: 2.5,   integer: false },
    { id: 'cp-p2-dlh',         min: 0.25,   max: 2,      step: 0.25,  integer: false },
    { id: 'cp-total-oh',       min: 500000, max: 5000000,step: 100000,integer: true },
    { id: 'cp-p1-abc-oh',      min: 100000, max: 2000000,step: 50000, integer: true },
    { id: 'cp-p2-abc-oh',      min: 100000, max: 2000000,step: 50000, integer: true },
    { id: 'cp-p1-extra-direct',min: 0,      max: 500000, step: 10000, integer: true },
    { id: 'cp-p2-extra-direct',min: 0,      max: 500000, step: 10000, integer: true },
  ], () => document.getElementById('abc-comp-calculate').click());
}

// ── Tool 2: Cost Hierarchy Classifier ────────────────────────

function initHierarchyClassifier() {
  const scenarioEl  = document.getElementById('hier-scenario');
  const feedbackEl  = document.getElementById('hier-feedback');
  const counterEl   = document.getElementById('hier-counter');
  const prevBtn     = document.getElementById('hier-prev');
  const nextBtn     = document.getElementById('hier-next');
  const progressFill= document.getElementById('hier-progress-fill');
  const progressLbl = document.getElementById('hier-progress-label');
  if (!scenarioEl) return;

  let current = 0;
  const answers = new Array(HIERARCHY_SCENARIOS.length).fill(null);
  const correct = new Array(HIERARCHY_SCENARIOS.length).fill(false);

  function render(index) {
    const item = HIERARCHY_SCENARIOS[index];
    scenarioEl.textContent = item.scenario;
    feedbackEl.hidden      = true;
    counterEl.textContent  = `${index + 1} of ${HIERARCHY_SCENARIOS.length}`;
    prevBtn.disabled       = index === 0;

    document.querySelectorAll('.hier-btn').forEach(btn => {
      btn.classList.remove('hier-btn--correct', 'hier-btn--incorrect');
    });

    if (answers[index]) {
      const userAnswer = answers[index];
      const isCorrect  = userAnswer === item.answer;
      const userBtn    = document.querySelector(`.hier-btn[data-level="${userAnswer}"]`);
      const correctBtn = document.querySelector(`.hier-btn[data-level="${item.answer}"]`);
      if (userBtn) userBtn.classList.add(isCorrect ? 'hier-btn--correct' : 'hier-btn--incorrect');
      if (!isCorrect && correctBtn) correctBtn.classList.add('hier-btn--correct');
      feedbackEl.hidden    = false;
      feedbackEl.className = `hier-feedback hier-feedback--${isCorrect ? 'success' : 'error'}`;
      feedbackEl.innerHTML = `<strong>${isCorrect ? '✓ Correct!' : '✗ Not quite.'}</strong> ${item.explanation}`;
      nextBtn.disabled     = index === HIERARCHY_SCENARIOS.length - 1;
    } else {
      nextBtn.disabled = true;
    }
    updateProgress();
  }

  function updateProgress() {
    const count = correct.filter(Boolean).length;
    const pct   = Math.round((count / HIERARCHY_SCENARIOS.length) * 100);
    progressFill.style.width = `${pct}%`;
    progressLbl.textContent  = `${count} of ${HIERARCHY_SCENARIOS.length} classified correctly`;
  }

  document.querySelectorAll('.hier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answers[current] && correct[current]) return;
      const level = btn.dataset.level;
      answers[current] = level;
      if (level === HIERARCHY_SCENARIOS[current].answer) correct[current] = true;
      render(current);
    });
  });

  prevBtn.addEventListener('click', () => { if (current > 0) render(--current); });
  nextBtn.addEventListener('click', () => { if (current < HIERARCHY_SCENARIOS.length - 1) render(++current); });
  render(0);
}

// ── Tool 3: ABC System Builder ────────────────────────────────

let poolCount = 0;
const MAX_POOLS = 8;

function initABCBuilder() {
  const container  = document.getElementById('abc-pools-container');
  const addBtn     = document.getElementById('abc-add-pool');
  const calcBtn    = document.getElementById('abc-calculate');
  const resultsEl  = document.getElementById('abc-results');
  if (!container) return;

  DEFAULT_POOLS.forEach(pool => addPool(pool));
  updateAddButton();

  addBtn.addEventListener('click', () => {
    if (poolCount < MAX_POOLS) addPool();
    updateAddButton();
  });

  calcBtn.addEventListener('click', () => calculateABC(resultsEl));

  document.getElementById('abc-p1-name')?.addEventListener('input', updateProductHeaders);
  document.getElementById('abc-p2-name')?.addEventListener('input', updateProductHeaders);

  initRandomizer('abc-randomize', [], () => {
    document.querySelectorAll('.abc-pool-row').forEach(row => {
      const costInput  = row.querySelector('.abc-pool-cost');
      const totalInput = row.querySelector('.abc-pool-total-qty');
      const p1Input    = row.querySelector('.abc-pool-p1-qty');
      const p2Input    = row.querySelector('.abc-pool-p2-qty');
      if (costInput)  costInput.value  = Math.round(Math.random() * 900000 + 100000);
      if (totalInput) {
        const total = Math.round(Math.random() * 9000 + 1000);
        totalInput.value = total;
        const p1 = Math.round(total * (0.3 + Math.random() * 0.4));
        if (p1Input)  p1Input.value  = p1;
        if (p2Input)  p2Input.value  = total - p1;
      }
    });
    calculateABC(resultsEl);
  });
}

function addPool(defaults = {}) {
  if (poolCount >= MAX_POOLS) return;
  poolCount++;
  const id  = poolCount;
  const container = document.getElementById('abc-pools-container');

  const row = document.createElement('div');
  row.className = 'abc-pool-row';
  row.dataset.poolId = id;
  row.innerHTML = `
    <input type="text"   class="form-input abc-pool-name"      placeholder="Activity name"   value="${defaults.name     || ''}" />
    <select class="form-select abc-pool-hierarchy">
      <option value="unit"     ${defaults.hierarchy === 'unit'     ? 'selected' : ''}>Unit-Level</option>
      <option value="batch"    ${defaults.hierarchy === 'batch'    ? 'selected' : ''}>Batch-Level</option>
      <option value="product"  ${defaults.hierarchy === 'product'  ? 'selected' : ''}>Product-Sustaining</option>
      <option value="facility" ${defaults.hierarchy === 'facility' ? 'selected' : ''}>Facility-Sustaining</option>
    </select>
    <input type="number" class="form-input abc-pool-cost"      placeholder="Pool cost"       value="${defaults.cost      || ''}" min="0" step="1000" />
    <input type="text"   class="form-input abc-pool-driver"    placeholder="Cost driver"     value="${defaults.driver    || ''}" />
    <input type="number" class="form-input abc-pool-total-qty" placeholder="Total qty"       value="${defaults.totalQty  || ''}" min="1" step="1" />
    <input type="number" class="form-input abc-pool-p1-qty"    placeholder="P1 qty"          value="${defaults.p1Qty     || ''}" min="0" step="1" />
    <input type="number" class="form-input abc-pool-p2-qty"    placeholder="P2 qty"          value="${defaults.p2Qty     || ''}" min="0" step="1" />
    <button class="abc-pool-remove btn btn--ghost-danger btn--sm" data-pool-id="${id}" title="Remove pool">✕</button>
  `;

  row.querySelector('.abc-pool-remove').addEventListener('click', () => {
    row.remove();
    poolCount--;
    updateAddButton();
  });

  container.appendChild(row);
}

function updateAddButton() {
  const btn = document.getElementById('abc-add-pool');
  if (!btn) return;
  btn.disabled = poolCount >= MAX_POOLS;
  btn.title    = poolCount >= MAX_POOLS ? 'Maximum 8 pools reached' : 'Add activity pool';
}

function updateProductHeaders() {
  const p1Name = document.getElementById('abc-p1-name')?.value || 'Product 1';
  const p2Name = document.getElementById('abc-p2-name')?.value || 'Product 2';
  const h1 = document.getElementById('abc-p1-header');
  const h2 = document.getElementById('abc-p2-header');
  if (h1) h1.textContent = p1Name + ' Qty';
  if (h2) h2.textContent = p2Name + ' Qty';
}

function calculateABC(resultsEl) {
  const p1Name   = document.getElementById('abc-p1-name')?.value   || 'Product 1';
  const p2Name   = document.getElementById('abc-p2-name')?.value   || 'Product 2';
  const p1Units  = parseFloat(document.getElementById('abc-p1-units')?.value)  || 0;
  const p2Units  = parseFloat(document.getElementById('abc-p2-units')?.value)  || 0;
  const p1Direct = parseFloat(document.getElementById('abc-p1-direct')?.value) || 0;
  const p2Direct = parseFloat(document.getElementById('abc-p2-direct')?.value) || 0;

  const pools = [];
  document.querySelectorAll('.abc-pool-row').forEach(row => {
    const name     = row.querySelector('.abc-pool-name')?.value      || '';
    const hier     = row.querySelector('.abc-pool-hierarchy')?.value || 'unit';
    const cost     = parseFloat(row.querySelector('.abc-pool-cost')?.value)      || 0;
    const driver   = row.querySelector('.abc-pool-driver')?.value    || '';
    const totalQty = parseFloat(row.querySelector('.abc-pool-total-qty')?.value) || 0;
    const p1Qty    = parseFloat(row.querySelector('.abc-pool-p1-qty')?.value)    || 0;
    const p2Qty    = parseFloat(row.querySelector('.abc-pool-p2-qty')?.value)    || 0;
    const rate     = totalQty > 0 ? cost / totalQty : 0;
    const p1Alloc  = rate * p1Qty;
    const p2Alloc  = rate * p2Qty;
    pools.push({ name, hier, cost, driver, totalQty, p1Qty, p2Qty, rate, p1Alloc, p2Alloc });
  });

  const p1TotalOH  = pools.reduce((s, p) => s + p.p1Alloc, 0);
  const p2TotalOH  = pools.reduce((s, p) => s + p.p2Alloc, 0);
  const p1Total    = p1Direct + p1TotalOH;
  const p2Total    = p2Direct + p2TotalOH;
  const p1UnitCost = p1Units > 0 ? p1Total / p1Units : 0;
  const p2UnitCost = p2Units > 0 ? p2Total / p2Units : 0;

  const hierColors = { unit: 'var(--color-info)', batch: 'var(--color-success)', product: 'var(--color-accent)', facility: 'var(--color-gray-500)' };
  const hierLabels = { unit: 'Unit', batch: 'Batch', product: 'Product', facility: 'Facility' };

  let poolRows = pools.map(p => `
    <tr>
      <td>${p.name}</td>
      <td><span style="font-size:0.65rem;padding:2px 6px;border-radius:9999px;background:${hierColors[p.hier]}22;color:${hierColors[p.hier]};font-weight:700">${hierLabels[p.hier]}</span></td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(p.cost)}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmtDec(p.rate, 4)}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(p.p1Alloc)}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(p.p2Alloc)}</td>
    </tr>
  `).join('');

  resultsEl.innerHTML = `
    <h4 style="margin:var(--space-6) 0 var(--space-4);font-size:var(--font-size-sm);font-weight:700;">Activity Rates and Allocations</h4>
    <div style="overflow-x:auto;border-radius:var(--radius-lg);border:1px solid var(--color-border)">
      <table class="data-table">
        <thead>
          <tr>
            <th>Activity</th>
            <th>Hierarchy</th>
            <th class="num">Pool Cost</th>
            <th class="num">Rate/Driver Unit</th>
            <th class="num">${p1Name} Allocated</th>
            <th class="num">${p2Name} Allocated</th>
          </tr>
        </thead>
        <tbody>
          ${poolRows}
          <tr style="font-weight:700;border-top:2px solid var(--color-border)">
            <td colspan="4">Total Indirect Costs Allocated</td>
            <td style="text-align:right;font-family:var(--font-mono)">${fmt(p1TotalOH)}</td>
            <td style="text-align:right;font-family:var(--font-mono)">${fmt(p2TotalOH)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="abc-results-summary">
      <div class="abc-result-product">
        <div class="abc-result-product__title">${p1Name}</div>
        <div class="abc-result-product__row"><span>Direct Costs</span><span>${fmt(p1Direct)}</span></div>
        <div class="abc-result-product__row"><span>Indirect Costs Allocated</span><span>${fmt(p1TotalOH)}</span></div>
        <div class="abc-result-product__row abc-result-product__row--total"><span>Total Cost</span><span>${fmt(p1Total)}</span></div>
        <div class="abc-result-product__row abc-result-product__row--unit"><span>Cost per Unit</span><span>${fmtDec(p1UnitCost)}</span></div>
      </div>
      <div class="abc-result-product">
        <div class="abc-result-product__title">${p2Name}</div>
        <div class="abc-result-product__row"><span>Direct Costs</span><span>${fmt(p2Direct)}</span></div>
        <div class="abc-result-product__row"><span>Indirect Costs Allocated</span><span>${fmt(p2TotalOH)}</span></div>
        <div class="abc-result-product__row abc-result-product__row--total"><span>Total Cost</span><span>${fmt(p2Total)}</span></div>
        <div class="abc-result-product__row abc-result-product__row--unit"><span>Cost per Unit</span><span>${fmtDec(p2UnitCost)}</span></div>
      </div>
    </div>
  `;

  resultsEl.hidden = false;

  const sw = getOrCreate('abc-builder-show-work', 'div', '', resultsEl);
  const swSteps = pools.map((p, i) => ({
    step:    i + 1,
    label:   `${p.name} -- Activity Rate`,
    formula: 'Rate = Pool Cost / Total Driver Quantity',
    values:  `${fmt(p.cost)} / ${p.totalQty.toLocaleString()} ${p.driver}`,
    result:  `${fmtDec(p.rate, 4)} per ${p.driver}`,
  }));
  swSteps.push({
    label:   `${p1Name} -- Total Cost`,
    formula: 'Total = Direct Costs + Sum of All Activity Allocations',
    values:  `${fmt(p1Direct)} + ${fmt(p1TotalOH)}`,
    result:  `${fmt(p1Total)} (${fmtDec(p1UnitCost)}/unit)`,
    highlight: true,
  });
  swSteps.push({
    label:   `${p2Name} -- Total Cost`,
    formula: 'Total = Direct Costs + Sum of All Activity Allocations',
    values:  `${fmt(p2Direct)} + ${fmt(p2TotalOH)}`,
    result:  `${fmt(p2Total)} (${fmtDec(p2UnitCost)}/unit)`,
    highlight: true,
    note:    'ABC assigns more indirect costs to the product that consumes more of each activity -- producing more accurate product costs than a single overhead pool.',
  });
  renderShowWork(sw, swSteps, { title: 'Show Work -- ABC System Calculations' });
}

// ── Tool 4: ABM Decisions ─────────────────────────────────────

function initABMDecisions() {
  const calcBtn   = document.getElementById('abm-calculate');
  const resultsEl = document.getElementById('abm-results');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', calculate);

  function getVal(id) { return parseFloat(document.getElementById(id)?.value) || 0; }
  function getStr(id) { return document.getElementById(id)?.value || ''; }

  function calculate() {
    const activity      = getStr('abm-activity');
    const driver        = getStr('abm-driver');
    const currentRate   = getVal('abm-current-rate');
    const targetRate    = getVal('abm-target-rate');
    const p1Name        = getStr('abm-p1-name');
    const p1CurrentQty  = getVal('abm-p1-current-qty');
    const p1TargetQty   = getVal('abm-p1-target-qty');
    const p1Units       = getVal('abm-p1-units');
    const p2Name        = getStr('abm-p2-name');
    const p2CurrentQty  = getVal('abm-p2-current-qty');
    const p2TargetQty   = getVal('abm-p2-target-qty');
    const p2Units       = getVal('abm-p2-units');
    const totalCapacity = getVal('abm-total-capacity');

    const p1CurrentCost  = currentRate * p1CurrentQty;
    const p2CurrentCost  = currentRate * p2CurrentQty;
    const p1TargetCost   = targetRate  * p1TargetQty;
    const p2TargetCost   = targetRate  * p2TargetQty;
    const p1Savings      = p1CurrentCost - p1TargetCost;
    const p2Savings      = p2CurrentCost - p2TargetCost;
    const totalSavings   = p1Savings + p2Savings;
    const p1UnitSavings  = p1Units > 0 ? p1Savings / p1Units : 0;
    const p2UnitSavings  = p2Units > 0 ? p2Savings / p2Units : 0;

    const resourcesUsed    = p1TargetQty + p2TargetQty;
    const unusedCapacity   = totalCapacity - resourcesUsed;
    const unusedCost       = unusedCapacity > 0 ? unusedCapacity * targetRate : 0;
    const hasUnused        = unusedCapacity > 0;

    resultsEl.innerHTML = `
      <div class="abm-results-grid">
        <div class="abm-result-card">
          <div class="abm-result-card__label">Current Total Cost</div>
          <div class="abm-result-card__value">${fmt(p1CurrentCost + p2CurrentCost)}</div>
          <div class="abm-result-card__sub">${fmtDec(currentRate)}/unit × ${(p1CurrentQty + p2CurrentQty).toLocaleString()} units</div>
        </div>
        <div class="abm-result-card">
          <div class="abm-result-card__label">Target Total Cost</div>
          <div class="abm-result-card__value">${fmt(p1TargetCost + p2TargetCost)}</div>
          <div class="abm-result-card__sub">${fmtDec(targetRate)}/unit × ${resourcesUsed.toLocaleString()} units</div>
        </div>
        <div class="abm-result-card abm-result-card--savings">
          <div class="abm-result-card__label">Total Savings</div>
          <div class="abm-result-card__value" style="color:var(--color-success)">${fmt(totalSavings)}</div>
          <div class="abm-result-card__sub">${fmtPct(totalSavings / (p1CurrentCost + p2CurrentCost))} reduction</div>
        </div>
      </div>

      <table class="data-table" style="margin-top:var(--space-5)">
        <thead>
          <tr>
            <th>Product</th>
            <th class="num">Current Cost</th>
            <th class="num">Target Cost</th>
            <th class="num">Savings</th>
            <th class="num">Savings/Unit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${p1Name}</td>
            <td style="text-align:right;font-family:var(--font-mono)">${fmt(p1CurrentCost)}</td>
            <td style="text-align:right;font-family:var(--font-mono)">${fmt(p1TargetCost)}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--color-success)">${fmt(p1Savings)}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--color-success)">${fmtDec(p1UnitSavings)}</td>
          </tr>
          <tr>
            <td>${p2Name}</td>
            <td style="text-align:right;font-family:var(--font-mono)">${fmt(p2CurrentCost)}</td>
            <td style="text-align:right;font-family:var(--font-mono)">${fmt(p2TargetCost)}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--color-success)">${fmt(p2Savings)}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--color-success)">${fmtDec(p2UnitSavings)}</td>
          </tr>
        </tbody>
      </table>

      ${hasUnused ? `
        <div class="abm-unused-capacity">
          <div class="abm-unused-capacity__icon">⚠️</div>
          <div>
            <div class="abm-unused-capacity__title">Unused Capacity Created</div>
            <p>After process improvements, <strong>${unusedCapacity.toLocaleString()} ${driver}</strong> of capacity
            is unused (${fmtPct(unusedCapacity / totalCapacity)} of total). The cost of this unused capacity is
            <strong>${fmt(unusedCost)}</strong>. ABC systems highlight unused capacity as a separate line item
            rather than burdening product costs -- alerting managers to redeploy or reduce these resources.</p>
          </div>
        </div>
      ` : ''}
    `;

    resultsEl.hidden = false;

    const sw = getOrCreate('abm-show-work', 'div', '', resultsEl);
    renderShowWork(sw, [
      {
        label:   `${p1Name} -- Current ${activity} Cost`,
        formula: 'Cost = Current Rate x Current Driver Quantity',
        values:  `${fmtDec(currentRate)} x ${p1CurrentQty.toLocaleString()}`,
        result:  fmt(p1CurrentCost),
      },
      {
        label:   `${p1Name} -- Target ${activity} Cost`,
        formula: 'Cost = Target Rate x Target Driver Quantity',
        values:  `${fmtDec(targetRate)} x ${p1TargetQty.toLocaleString()}`,
        result:  fmt(p1TargetCost),
      },
      {
        label:   `${p1Name} -- Savings`,
        formula: 'Savings = Current Cost - Target Cost',
        values:  `${fmt(p1CurrentCost)} - ${fmt(p1TargetCost)}`,
        result:  `${fmt(p1Savings)} (${fmtDec(p1UnitSavings)}/unit)`,
        highlight: true,
      },
      {
        label:   `${p2Name} -- Savings`,
        formula: 'Savings = Current Cost - Target Cost',
        values:  `${fmt(p2CurrentCost)} - ${fmt(p2TargetCost)}`,
        result:  `${fmt(p2Savings)} (${fmtDec(p2UnitSavings)}/unit)`,
        highlight: true,
      },
      {
        label:   'Unused Capacity',
        formula: 'Unused = Total Capacity - (P1 Target Qty + P2 Target Qty)',
        values:  `${totalCapacity.toLocaleString()} - (${p1TargetQty.toLocaleString()} + ${p2TargetQty.toLocaleString()})`,
        result:  `${unusedCapacity.toLocaleString()} ${driver} = ${fmt(unusedCost)}`,
        note:    'ABC distinguishes costs incurred from resources used. Unused capacity cost is shown separately -- not allocated to products.',
      },
    ], { title: `Show Work -- ABM: ${activity} Cost Reduction` });
  }

  initRandomizer('abm-randomize', [
    { id: 'abm-current-rate',    min: 1,     max: 50,     step: 0.5,  integer: false },
    { id: 'abm-target-rate',     min: 0.5,   max: 45,     step: 0.5,  integer: false, constraint: 'lessThan:abm-current-rate' },
    { id: 'abm-p1-current-qty',  min: 10000, max: 200000, step: 5000, integer: true },
    { id: 'abm-p1-target-qty',   min: 5000,  max: 180000, step: 5000, integer: true, constraint: 'lessThan:abm-p1-current-qty' },
    { id: 'abm-p1-units',        min: 5000,  max: 100000, step: 5000, integer: true },
    { id: 'abm-p2-current-qty',  min: 5000,  max: 100000, step: 5000, integer: true },
    { id: 'abm-p2-target-qty',   min: 2000,  max: 90000,  step: 5000, integer: true, constraint: 'lessThan:abm-p2-current-qty' },
    { id: 'abm-p2-units',        min: 1000,  max: 50000,  step: 1000, integer: true },
  ], () => document.getElementById('abm-calculate').click());
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
  const statusEl  = document.getElementById('ch05-status');
  const actionsEl = btn?.closest('.chapter-complete__actions');
  if (isChapterComplete('ch05')) setCompleteUI();
  btn?.addEventListener('click', () => { markChapterComplete('ch05'); setCompleteUI(); });
  function setCompleteUI() {
    if (statusEl) { statusEl.textContent = '✓ Completed'; statusEl.classList.add('chapter-hero__progress-label--complete'); }
    if (btn)      { btn.textContent = '✓ Completed'; btn.disabled = true; }
    if (actionsEl && !actionsEl.querySelector('.reset-chapter-btn')) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn--ghost-danger reset-chapter-btn';
      resetBtn.textContent = 'Reset Chapter';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset Chapter 5? This will clear your completion status and reload the page.')) {
          resetChapter('ch05');
          window.location.reload();
        }
      });
      actionsEl.appendChild(resetBtn);
    }
  }
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initComparator();
  initHierarchyClassifier();
  initABCBuilder();
  initABMDecisions();
  initKeyTerms();
  initChapterComplete();
});
