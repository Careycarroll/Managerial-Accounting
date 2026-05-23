import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtS   = n => n >= 0 ? fmt(n) : '(' + fmt(n) + ')';
const fmtN   = n => Math.round(n).toLocaleString();
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

const el = id => document.getElementById(id);
const val = id => {
  const node = el(id);
  return node ? (parseFloat(node.value) || 0) : 0;
};

function setVal(id, value) {
  const node = el(id);
  if (node) node.value = value;
}

function moneyClass(n) {
  return n >= 0 ? 'variance-fav' : 'variance-unfav';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Strategy Identifier
// ══════════════════════════════════════════════════════════════════════════════

const STRATEGY_SCENARIOS = [
  {
    text: 'A smartphone maker invests heavily in R&D to develop a foldable screen with a unique hinge mechanism. It prices its phones 40% above competitors.',
    answer: 'differentiation',
    why: 'Heavy R&D investment and premium pricing signal product differentiation. The company competes by offering unique features customers value.'
  },
  {
    text: 'A regional airline eliminates assigned seating, charges separately for checked bags, and uses a single aircraft type to minimize maintenance costs. It offers the lowest fares in every market it serves.',
    answer: 'cost-leadership',
    why: 'Operational simplification and lowest-fare positioning are hallmarks of cost leadership. The company competes by being the low-cost provider.'
  },
  {
    text: 'A coffee chain sources high-altitude, single-origin beans and trains baristas in latte art. Customers pay $6 for a cup that costs $0.90 to produce.',
    answer: 'differentiation',
    why: 'Unique sourcing, specialized training, and premium pricing indicate product differentiation through quality and customer experience.'
  },
  {
    text: 'A furniture retailer designs flat-pack products customers assemble at home, operates warehouse-style stores, and prices 30% below traditional furniture stores.',
    answer: 'cost-leadership',
    why: 'Flat-pack design, self-assembly, and warehouse operations reduce costs, enabling lower prices. This is cost leadership.'
  },
  {
    text: 'A pharmaceutical company holds 12 patents on a novel drug delivery system. Its products treat conditions no generic can address, and insurers reimburse at premium rates.',
    answer: 'differentiation',
    why: 'Patent protection and unique therapeutic capability create differentiation. Competitors cannot easily replicate the offer.'
  },
  {
    text: 'A cement manufacturer invests in automated kilns, negotiates long-term limestone contracts, and operates its own delivery fleet to minimize per-ton costs.',
    answer: 'cost-leadership',
    why: 'Automation, supply-chain control, and per-unit cost minimization in a commodity product indicate cost leadership.'
  },
  {
    text: 'A luxury watchmaker employs master artisans who hand-finish each movement. Production is limited to 2,000 pieces per year, and the waiting list is 18 months.',
    answer: 'differentiation',
    why: 'Craftsmanship, exclusivity, limited production, and customer willingness to wait all signal product differentiation.'
  },
  {
    text: 'A generic drug manufacturer focuses on high-volume production of off-patent medications, using process engineering to achieve the lowest cost per pill in the industry.',
    answer: 'cost-leadership',
    why: 'High-volume production of commodity generic products with process engineering for lowest unit cost is classic cost leadership.'
  },
  {
    text: 'An electric vehicle company develops proprietary battery technology, builds a charging network, and sells directly to consumers through its own stores.',
    answer: 'differentiation',
    why: 'Proprietary technology, unique distribution, and ecosystem building create differentiated value.'
  },
  {
    text: 'A discount grocery chain stocks only 1,500 SKUs, displays products on shipping pallets, and uses small-format stores to reduce labor and rent costs.',
    answer: 'cost-leadership',
    why: 'SKU reduction, minimal fixtures, and lower operating costs support a low-cost competitive position.'
  },
  {
    text: 'A consulting firm hires only from top MBA programs, develops proprietary analytical frameworks, and charges twice the industry average hourly rate.',
    answer: 'differentiation',
    why: 'Selective hiring, proprietary methods, brand prestige, and premium pricing indicate differentiation.'
  },
  {
    text: 'A steel producer operates mini-mills that melt scrap metal, locates plants near customers to reduce shipping costs, and targets commodity rebar markets.',
    answer: 'cost-leadership',
    why: 'Mini-mill technology, location strategy, and a commodity market focus all aim at the lowest delivered cost.'
  }
];

let stratIndex = -1;
let stratCorrect = 0;
let stratTotal = 0;
let stratUsed = [];

function initStrategyIdentifier() {
  const nextBtn = el('strat-next-btn');
  const randomBtn = el('strat-random-btn');
  if (!nextBtn) return;

  nextBtn.addEventListener('click', showNextStrategy);
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      stratUsed = [];
      stratCorrect = 0;
      stratTotal = 0;
      const results = el('strat-results-area');
      if (results) results.innerHTML = '';
      showNextStrategy();
    });
  }
}

function showNextStrategy() {
  const area = el('strat-scenario-area');
  if (!area) return;

  const available = STRATEGY_SCENARIOS.map((_, i) => i).filter(i => !stratUsed.includes(i));
  if (available.length === 0) {
    area.innerHTML = '<div class="card" style="margin-top:var(--space-4);"><p class="result-highlight">All 12 scenarios completed.</p></div>';
    updateStratResults();
    return;
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  stratUsed.push(pick);
  stratIndex = pick;
  const s = STRATEGY_SCENARIOS[pick];

  area.innerHTML = `
    <div class="card" style="margin-top:var(--space-4);">
      <p style="font-size:var(--font-size-lg);line-height:1.6;margin-bottom:var(--space-4);">${s.text}</p>
      <div class="tool-actions">
        <button class="btn btn--primary strat-answer-btn" data-answer="differentiation">Product Differentiation</button>
        <button class="btn btn--secondary strat-answer-btn" data-answer="cost-leadership">Cost Leadership</button>
      </div>
      <div id="strat-feedback"></div>
    </div>
  `;

  area.querySelectorAll('.strat-answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handleStratAnswer(btn.dataset.answer));
  });
}

function handleStratAnswer(chosen) {
  const s = STRATEGY_SCENARIOS[stratIndex];
  const feedback = el('strat-feedback');
  if (!s || !feedback) return;

  const correct = chosen === s.answer;
  stratTotal++;
  if (correct) stratCorrect++;

  const label = s.answer === 'differentiation' ? 'Product Differentiation' : 'Cost Leadership';
  feedback.innerHTML = `
    <div class="feedback-card feedback-card--${correct ? 'correct' : 'incorrect'}" style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:${correct ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-danger-bg, #fef2f2)'};border:1px solid ${correct ? 'var(--color-success, #22c55e)' : 'var(--color-danger, #ef4444)'};">
      <h4 style="margin:0 0 var(--space-2);">${correct ? 'Correct' : 'Not quite'} — ${label}</h4>
      <p style="margin:0;">${s.why}</p>
    </div>
  `;

  const buttons = feedback.parentElement.querySelectorAll('.strat-answer-btn');
  buttons.forEach(btn => { btn.disabled = true; });
  updateStratResults();
}

function updateStratResults() {
  const area = el('strat-results-area');
  if (!area) return;
  area.innerHTML = `
    <div class="ch12-insight" style="margin-top:var(--space-4);">
      Score: <strong>${stratCorrect} / ${stratTotal}</strong> | Remaining scenarios: <strong>${12 - stratUsed.length}</strong>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Balanced Scorecard Builder
// ══════════════════════════════════════════════════════════════════════════════

const SCORECARDS = {
  differentiation: {
    title: 'Product Differentiation Strategy',
    theme: 'Win by offering unique products, superior service, and innovation customers will pay more for.',
    perspectives: [
      { name: 'Financial', objective: 'Increase operating income through premium pricing and revenue growth', measure: 'Price premium, gross margin percentage, operating income growth', target: 'Maintain 20% price premium and increase OI by 12%' },
      { name: 'Customer', objective: 'Delight target customers with distinctive product features and service', measure: 'Customer satisfaction, market share in premium segment, repeat purchase rate', target: 'Customer satisfaction above 92% and premium share up 5 points' },
      { name: 'Internal Process', objective: 'Accelerate innovation and improve launch quality', measure: 'New-product cycle time, defect rate at launch, feature adoption rate', target: 'Reduce development cycle by 15% and defects below 1%' },
      { name: 'Learning & Growth', objective: 'Build design, analytics, and customer-insight capabilities', measure: 'Training hours, R&D skill certification, employee engagement', target: '40 innovation hours per employee and engagement above 85%' }
    ]
  },
  'cost-leadership': {
    title: 'Cost Leadership Strategy',
    theme: 'Win by delivering reliable products at the lowest sustainable cost.',
    perspectives: [
      { name: 'Financial', objective: 'Increase operating income through lower unit costs and efficient asset use', measure: 'Cost per unit, inventory turns, operating income growth', target: 'Reduce unit cost by 8% and improve turns by 15%' },
      { name: 'Customer', objective: 'Deliver dependable value at competitive prices', measure: 'On-time delivery, price index versus competitors, customer retention', target: '98% on-time delivery and price 10% below market average' },
      { name: 'Internal Process', objective: 'Standardize processes and eliminate nonvalue-added work', measure: 'Setup time, yield, throughput time, rework percentage', target: 'Reduce setup time by 20% and rework below 2%' },
      { name: 'Learning & Growth', objective: 'Develop continuous-improvement and process-engineering skills', measure: 'Kaizen suggestions, lean certification, cross-training rate', target: '3 implemented improvements per employee and 80% cross-trained' }
    ]
  }
};

function initBalancedScorecard() {
  const btn = el('bsc-build-btn');
  if (!btn) return;
  btn.addEventListener('click', buildScorecard);
}

function buildScorecard() {
  const strategy = el('bsc-strategy') ? el('bsc-strategy').value : 'differentiation';
  const data = SCORECARDS[strategy];
  const out = getOrCreate('bsc-output-area', 'div', 'tool-output', el('bsc-build-btn').parentElement);

  const cards = data.perspectives.map((p, i) => `
    <div class="card" style="border-left:4px solid var(--color-primary);">
      <div style="font-size:var(--font-size-xs);font-weight:800;text-transform:uppercase;color:var(--color-accent);">Perspective ${i + 1}</div>
      <h4 style="margin:var(--space-1) 0;">${p.name}</h4>
      <p><strong>Objective:</strong> ${p.objective}</p>
      <p><strong>Measure:</strong> ${p.measure}</p>
      <p><strong>Target:</strong> ${p.target}</p>
    </div>
  `).join('');

  const mapRows = [...data.perspectives].reverse().map((p, i, arr) => `
    <div style="text-align:center;">
      <div class="card" style="display:inline-block;min-width:min(520px,90%);padding:var(--space-4);background:var(--color-gray-50);">
        <strong>${p.name}</strong><br />${p.objective}
      </div>
      ${i < arr.length - 1 ? '<div style="font-size:var(--font-size-2xl);color:var(--color-accent);margin:var(--space-2) 0;">↑</div>' : ''}
    </div>
  `).join('');

  out.innerHTML = `
    <div style="margin-top:var(--space-5);">
      <h3>${data.title}</h3>
      <p class="ch12-insight"><strong>Strategic theme:</strong> ${data.theme}</p>
      <div class="ohrate-grid" style="margin-top:var(--space-4);">${cards}</div>
      <h3 style="margin-top:var(--space-6);">Strategy Map</h3>
      <p class="tool-header__desc">Balanced scorecards work best when measures are linked. Learning and growth capabilities improve internal processes; better processes improve customer value; customer value drives financial results.</p>
      <div style="margin-top:var(--space-4);">${mapRows}</div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Strategic Profitability Analyzer
// ══════════════════════════════════════════════════════════════════════════════

function initStrategicProfitability() {
  const calcBtn = el('spa-calculate');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', calcStrategicProfitability);

  const loadBtn = el('spa-load-example');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      setVal('spa-units-t1', 40000);
      setVal('spa-price-t1', 22);
      setVal('spa-units-t2', 42000);
      setVal('spa-price-t2', 24);

      setVal('spa-vc-qty-t1', 2800000);
      setVal('spa-vc-rate-t1', 0.14);
      setVal('spa-vc-qty-t2', 2710000);
      setVal('spa-vc-rate-t2', 0.15);

      setVal('spa-fc-qty-t1', 32000);
      setVal('spa-fc-rate-t1', 7.50);
      setVal('spa-fc-qty-t2', 32000);
      setVal('spa-fc-rate-t2', 7.50);

      calcStrategicProfitability();
    });
  }

  if (el('spa-randomize')) {
    initRandomizer('spa-randomize', [
      { id: 'spa-units-t1', min: 25000, max: 120000, step: 1000, integer: true },
      { id: 'spa-price-t1', min: 10, max: 80, step: 1 },
      { id: 'spa-units-t2', min: 25000, max: 140000, step: 1000, integer: true },
      { id: 'spa-price-t2', min: 10, max: 90, step: 1 },
      { id: 'spa-vc-qty-t1', min: 500000, max: 6000000, step: 10000, integer: true },
      { id: 'spa-vc-rate-t1', min: 0.05, max: 2.00, step: 0.01 },
      { id: 'spa-vc-qty-t2', min: 500000, max: 6500000, step: 10000, integer: true },
      { id: 'spa-vc-rate-t2', min: 0.05, max: 2.25, step: 0.01 },
      { id: 'spa-fc-qty-t1', min: 10000, max: 100000, step: 1000, integer: true },
      { id: 'spa-fc-rate-t1', min: 2, max: 30, step: 0.25 },
      { id: 'spa-fc-qty-t2', min: 10000, max: 110000, step: 1000, integer: true },
      { id: 'spa-fc-rate-t2', min: 2, max: 35, step: 0.25 }
    ], calcStrategicProfitability);
  }
}

function calcStrategicProfitability() {
  const units1 = val('spa-units-t1');
  const price1 = val('spa-price-t1');
  const units2 = val('spa-units-t2');
  const price2 = val('spa-price-t2');

  const vcQty1 = val('spa-vc-qty-t1');
  const vcRate1 = val('spa-vc-rate-t1');
  const vcQty2 = val('spa-vc-qty-t2');
  const vcRate2 = val('spa-vc-rate-t2');

  const fcQty1 = val('spa-fc-qty-t1');
  const fcRate1 = val('spa-fc-rate-t1');
  const fcQty2 = val('spa-fc-qty-t2');
  const fcRate2 = val('spa-fc-rate-t2');

  const out = getOrCreate('spa-output', 'div', 'tool-output', el('spa-calculate') ? el('spa-calculate').parentElement : document.body);

  if (!units1 || !units2 || !price1 || !price2 || !vcQty1 || !vcQty2 || !vcRate1 || !vcRate2 || !fcQty1 || !fcQty2 || !fcRate1 || !fcRate2) {
    out.innerHTML = '<div class="feedback-card feedback-card--incorrect" style="margin-top:var(--space-4);padding:var(--space-3);">Enter all Year 1 and Year 2 revenue, variable-cost, and fixed-cost values before calculating.</div>';
    return;
  }

  const revenue1 = units1 * price1;
  const revenue2 = units2 * price2;

  const variableCost1 = vcQty1 * vcRate1;
  const variableCost2 = vcQty2 * vcRate2;
  const fixedCost1 = fcQty1 * fcRate1;
  const fixedCost2 = fcQty2 * fcRate2;

  const cost1 = variableCost1 + fixedCost1;
  const cost2 = variableCost2 + fixedCost2;
  const oi1 = revenue1 - cost1;
  const oi2 = revenue2 - cost2;
  const totalChange = oi2 - oi1;

  const volumeRatio = units2 / units1;
  const vcQtyFlex = vcQty1 * volumeRatio;
  const fcQtyFlex = fcQty1 * volumeRatio;

  const growthRevenue = (units2 - units1) * price1;
  const growthVariableCost = (vcQtyFlex - vcQty1) * vcRate1;
  const growthFixedCost = (fcQtyFlex - fcQty1) * fcRate1;
  const growthComponent = growthRevenue - growthVariableCost - growthFixedCost;

  const priceRecoveryRevenue = (price2 - price1) * units2;
  const priceRecoveryVariableCost = (vcRate2 - vcRate1) * vcQtyFlex;
  const priceRecoveryFixedCost = (fcRate2 - fcRate1) * fcQtyFlex;
  const priceRecoveryComponent = priceRecoveryRevenue - priceRecoveryVariableCost - priceRecoveryFixedCost;

  const variableProductivity = (vcQtyFlex - vcQty2) * vcRate2;
  const fixedProductivity = (fcQtyFlex - fcQty2) * fcRate2;
  const productivityComponent = variableProductivity + fixedProductivity;

  const explainedChange = growthComponent + priceRecoveryComponent + productivityComponent;
  const checkDiff = totalChange - explainedChange;

  const largest = [
    { label: 'growth', amount: Math.abs(growthComponent) },
    { label: 'price recovery', amount: Math.abs(priceRecoveryComponent) },
    { label: 'productivity', amount: Math.abs(productivityComponent) }
  ].sort((a, b) => b.amount - a.amount)[0].label;

  const strategySignal = priceRecoveryComponent > 0 && priceRecoveryComponent >= Math.abs(productivityComponent)
    ? 'Price recovery is favorable and prominent. This often supports a differentiation story: customers accepted higher prices enough to offset input-cost changes.'
    : productivityComponent > 0 && productivityComponent >= Math.abs(priceRecoveryComponent)
      ? 'Productivity is favorable and prominent. This often supports a cost-leadership story: the company generated more output with fewer effective inputs.'
      : growthComponent > 0 && largest === 'growth'
        ? 'Growth is the largest driver. Management should verify whether higher volume came from strategy execution, market expansion, or price concessions.'
        : 'The signal is mixed. Use the balanced scorecard to connect financial changes to customer, process, and learning-and-growth drivers.';

  out.innerHTML = `
    <div style="margin-top:var(--space-5);">
      <h3>Strategic Profitability Decomposition</h3>
      <div class="ohrate-grid" style="margin-top:var(--space-4);">
        <div class="card">
          <h4>Year 1 Operating Income</h4>
          <p style="font-size:var(--font-size-2xl);font-weight:800;">${fmtS(oi1)}</p>
          <p>Revenue ${fmt(revenue1)} − Variable ${fmt(variableCost1)} − Fixed ${fmt(fixedCost1)}</p>
        </div>
        <div class="card">
          <h4>Year 2 Operating Income</h4>
          <p style="font-size:var(--font-size-2xl);font-weight:800;">${fmtS(oi2)}</p>
          <p>Revenue ${fmt(revenue2)} − Variable ${fmt(variableCost2)} − Fixed ${fmt(fixedCost2)}</p>
        </div>
        <div class="card">
          <h4>Total Change</h4>
          <p class="${moneyClass(totalChange)}" style="font-size:var(--font-size-2xl);font-weight:800;">${totalChange >= 0 ? '+' : ''}${fmtS(totalChange)}</p>
          <p>Year 2 OI − Year 1 OI</p>
        </div>
      </div>

      <table class="ch12-result-table" style="margin-top:var(--space-5);">
        <thead><tr><th>Component</th><th>Strategic Meaning</th><th>Amount</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>Growth</strong></td>
            <td>Effect of selling more or fewer units, holding Year 1 prices and Year 1 input efficiency constant</td>
            <td class="${moneyClass(growthComponent)}">${growthComponent >= 0 ? '+' : ''}${fmtS(growthComponent)}</td>
          </tr>
          <tr>
            <td><strong>Price-Recovery</strong></td>
            <td>Effect of selling-price changes and input-price changes, holding flexible Year 2 input quantities constant</td>
            <td class="${moneyClass(priceRecoveryComponent)}">${priceRecoveryComponent >= 0 ? '+' : ''}${fmtS(priceRecoveryComponent)}</td>
          </tr>
          <tr>
            <td><strong>Productivity</strong></td>
            <td>Effect of using fewer or more actual inputs than expected for Year 2 output</td>
            <td class="${moneyClass(productivityComponent)}">${productivityComponent >= 0 ? '+' : ''}${fmtS(productivityComponent)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="ch12-result-table__total"><td colspan="2">Total Explained Change</td><td>${explainedChange >= 0 ? '+' : ''}${fmtS(explainedChange)}</td></tr>
        </tfoot>
      </table>

      <div class="ch12-insight" style="margin-top:var(--space-4);">
        <strong>Strategy signal:</strong> ${strategySignal}
      </div>
      <div class="ch12-insight" style="margin-top:var(--space-2);">
        <strong>Flexible input quantities:</strong> Variable input ${fmtN(vcQtyFlex)} and fixed capacity ${fmtN(fcQtyFlex)} are estimated from Year 1 efficiency scaled to Year 2 output.
      </div>
      <div class="ch12-insight" style="margin-top:var(--space-2);">
        <strong>Verification:</strong> Components explain ${fmtS(explainedChange)} versus actual OI change of ${fmtS(totalChange)}. Rounding difference: ${fmtS(checkDiff)}.
      </div>
    </div>
  `;

  const showWorkTarget = el('spa-show-work');
  if (showWorkTarget) {
    renderShowWork(showWorkTarget, [
      { label: 'Year 1 Operating Income', formula: 'Revenue - Variable Costs - Fixed Costs', values: fmt(revenue1) + ' - ' + fmt(variableCost1) + ' - ' + fmt(fixedCost1), result: fmtS(oi1) },
      { label: 'Year 2 Operating Income', formula: 'Revenue - Variable Costs - Fixed Costs', values: fmt(revenue2) + ' - ' + fmt(variableCost2) + ' - ' + fmt(fixedCost2), result: fmtS(oi2) },
      { label: 'Total Operating Income Change', formula: 'Year 2 OI - Year 1 OI', values: fmtS(oi2) + ' - ' + fmtS(oi1), result: fmtS(totalChange), highlight: true },
      { label: 'Flexible Variable Input Quantity', formula: 'Year 1 VC input quantity x (Year 2 units / Year 1 units)', values: fmtN(vcQty1) + ' x (' + fmtN(units2) + ' / ' + fmtN(units1) + ')', result: fmtN(vcQtyFlex) },
      { label: 'Flexible Fixed Capacity Quantity', formula: 'Year 1 capacity x (Year 2 units / Year 1 units)', values: fmtN(fcQty1) + ' x (' + fmtN(units2) + ' / ' + fmtN(units1) + ')', result: fmtN(fcQtyFlex) },
      { label: 'Growth Component', formula: 'Growth revenue - growth VC - growth FC', values: fmt(growthRevenue) + ' - ' + fmt(growthVariableCost) + ' - ' + fmt(growthFixedCost), result: fmtS(growthComponent) },
      { label: 'Price-Recovery Component', formula: 'Price effect on revenue - price effects on variable and fixed inputs', values: fmt(priceRecoveryRevenue) + ' - ' + fmt(priceRecoveryVariableCost) + ' - ' + fmt(priceRecoveryFixedCost), result: fmtS(priceRecoveryComponent) },
      { label: 'Productivity Component', formula: '(Flexible VC qty - Actual VC qty) x VC rate2 + (Flexible FC qty - Actual FC qty) x FC rate2', values: '(' + fmtN(vcQtyFlex) + ' - ' + fmtN(vcQty2) + ') x ' + fmt(vcRate2) + ' + (' + fmtN(fcQtyFlex) + ' - ' + fmtN(fcQty2) + ') x ' + fmt(fcRate2), result: fmtS(productivityComponent) },
      { label: 'Verification', formula: 'Growth + Price-Recovery + Productivity', values: fmtS(growthComponent) + ' + ' + fmtS(priceRecoveryComponent) + ' + ' + fmtS(productivityComponent), result: fmtS(explainedChange), highlight: true }
    ], { title: 'Strategic Profitability Show Work', defaultOpen: false });
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Engineered vs. Discretionary Cost Classifier
// ══════════════════════════════════════════════════════════════════════════════

const COST_SCENARIOS = [
  { text: 'Direct materials: each finished unit requires exactly 3 pounds of aluminum at $4 per pound.', answer: 'engineered', why: 'There is a measurable cause-and-effect relationship between output units and pounds of aluminum used.' },
  { text: 'Corporate image advertising budget of $2 million approved annually by senior management.', answer: 'discretionary', why: 'Advertising spending is set by management judgment. The output effect is uncertain and not directly measurable.' },
  { text: 'Machine power: each machine-hour consumes 12 kilowatt-hours at the utility rate.', answer: 'engineered', why: 'Power consumption can be traced to machine-hour usage with a clear input-output relationship.' },
  { text: 'Research project exploring a new product platform with no guaranteed commercial launch.', answer: 'discretionary', why: 'R&D spending is chosen through periodic planning and has no immediate measurable output relationship.' },
  { text: 'Piece-rate labor paid $5 for each unit assembled.', answer: 'engineered', why: 'Labor cost varies directly with units assembled.' },
  { text: 'Employee leadership-development retreat approved for high-potential managers.', answer: 'discretionary', why: 'Training programs are management decisions and do not have a precise short-run output relationship.' },
  { text: 'Packaging materials: one box and two inserts are required for every product shipped.', answer: 'engineered', why: 'Packaging inputs are physically required per unit shipped.' },
  { text: 'Brand sponsorship of a professional sports event.', answer: 'discretionary', why: 'The sponsorship amount is a management choice with uncertain cause-and-effect linkage to revenue.' },
  { text: 'Cloud computing charge of $0.03 per transaction processed.', answer: 'engineered', why: 'The cost is directly tied to transaction volume.' },
  { text: 'Annual budget for organizational culture initiatives.', answer: 'discretionary', why: 'Culture spending is set by management judgment rather than a measurable output formula.' },
  { text: 'Sales commissions equal to 6% of sales revenue.', answer: 'engineered', why: 'The commission cost is caused directly by sales revenue.' },
  { text: 'Corporate public relations campaign after a rebranding effort.', answer: 'discretionary', why: 'Public relations spending is chosen by management and does not vary directly with output.' },
  { text: 'Direct labor standard of 0.4 hours per unit at $28 per hour.', answer: 'engineered', why: 'The labor cost has a standard input-output relationship with units produced.' },
  { text: 'Exploratory analytics team searching for new customer segments.', answer: 'discretionary', why: 'The activity may create future value, but spending is not directly measurable per output unit.' }
];

let costIndex = -1;
let costCorrect = 0;
let costTotal = 0;
let costUsed = [];

function initCapacityClassifier() {
  const nextBtn = el('cost-next-btn');
  const randomBtn = el('cost-random-btn');
  if (!nextBtn) return;

  nextBtn.addEventListener('click', showNextCost);
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      costUsed = [];
      costCorrect = 0;
      costTotal = 0;
      const results = el('cost-results-area');
      if (results) results.innerHTML = '';
      showNextCost();
    });
  }
}

function showNextCost() {
  const area = el('cost-scenario-area');
  if (!area) return;
  const available = COST_SCENARIOS.map((_, i) => i).filter(i => !costUsed.includes(i));
  if (available.length === 0) {
    area.innerHTML = '<div class="card" style="margin-top:var(--space-4);"><p class="result-highlight">All 14 cost scenarios completed.</p></div>';
    updateCostResults();
    return;
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  costUsed.push(pick);
  costIndex = pick;
  const s = COST_SCENARIOS[pick];

  area.innerHTML = `
    <div class="card" style="margin-top:var(--space-4);">
      <p style="font-size:var(--font-size-lg);line-height:1.6;margin-bottom:var(--space-4);">${s.text}</p>
      <div class="tool-actions">
        <button class="btn btn--primary cost-answer-btn" data-answer="engineered">Engineered Cost</button>
        <button class="btn btn--secondary cost-answer-btn" data-answer="discretionary">Discretionary Cost</button>
      </div>
      <div id="cost-feedback"></div>
    </div>
  `;

  area.querySelectorAll('.cost-answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handleCostAnswer(btn.dataset.answer));
  });
}

function handleCostAnswer(chosen) {
  const s = COST_SCENARIOS[costIndex];
  const feedback = el('cost-feedback');
  if (!s || !feedback) return;

  const correct = chosen === s.answer;
  costTotal++;
  if (correct) costCorrect++;

  const label = s.answer === 'engineered' ? 'Engineered Cost' : 'Discretionary Cost';
  feedback.innerHTML = `
    <div class="feedback-card feedback-card--${correct ? 'correct' : 'incorrect'}" style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:${correct ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-danger-bg, #fef2f2)'};border:1px solid ${correct ? 'var(--color-success, #22c55e)' : 'var(--color-danger, #ef4444)'};">
      <h4 style="margin:0 0 var(--space-2);">${correct ? 'Correct' : 'Not quite'} — ${label}</h4>
      <p style="margin:0;">${s.why}</p>
    </div>
  `;

  feedback.parentElement.querySelectorAll('.cost-answer-btn').forEach(btn => { btn.disabled = true; });
  updateCostResults();
}

function updateCostResults() {
  const area = el('cost-results-area');
  if (!area) return;
  area.innerHTML = `
    <div class="ch12-insight" style="margin-top:var(--space-4);">
      Score: <strong>${costCorrect} / ${costTotal}</strong> | Remaining scenarios: <strong>${14 - costUsed.length}</strong>
      <br />Unused-capacity note: Engineered costs are easier to flex with output. Discretionary costs require explicit management decisions to increase, maintain, or reduce capacity.
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Strategy', definition: 'How an organization matches its capabilities with market opportunities to accomplish its objectives.' },
  { term: 'Product Differentiation', definition: 'A strategy of offering products or services customers perceive as unique and valuable, often supporting premium prices.' },
  { term: 'Cost Leadership', definition: 'A strategy of achieving lower costs than competitors while delivering acceptable quality and functionality.' },
  { term: 'Balanced Scorecard', definition: 'A framework that translates strategy into performance measures across financial, customer, internal-business-process, and learning-and-growth perspectives.' },
  { term: 'Strategy Map', definition: 'A diagram showing cause-and-effect relationships among strategic objectives across balanced scorecard perspectives.' },
  { term: 'Growth Component', definition: 'The portion of operating-income change caused by selling more or fewer units, holding prior-period prices and efficiency constant.' },
  { term: 'Price-Recovery Component', definition: 'The portion of operating-income change caused by changes in selling prices and input prices.' },
  { term: 'Productivity Component', definition: 'The portion of operating-income change caused by using fewer or more inputs to produce actual output.' },
  { term: 'Engineered Cost', definition: 'A cost with a measurable cause-and-effect relationship between output and resources used.' },
  { term: 'Discretionary Cost', definition: 'A cost arising from periodic management decisions, with no clear measurable cause-and-effect relationship to output.' },
  { term: 'Unused Capacity', definition: 'Available resource capacity not used to support current output. Managers must decide whether to retain it for future growth or downsize.' },
  { term: 'Downsizing', definition: 'Reducing capacity levels and related costs when unused capacity is not expected to be needed.' }
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
  if (el('ch13-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch13-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch13');
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
  const status = el('ch13-status');
  if (!btn || !card) return;

  if (isChapterComplete('ch13')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }

  btn.addEventListener('click', () => {
    markChapterComplete('ch13');
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
  initStrategyIdentifier();
  initBalancedScorecard();
  initStrategicProfitability();
  initCapacityClassifier();
  initKeyTerms();
  initChapterComplete();
});
