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
// TOOL 1 -- Decentralization Trade-off
// ═══════════════════════════════════════════════════════════════════════════

const DC_SCENARIOS = [
  { text: 'A multinational consumer goods company has 40 country subsidiaries that each face very different local consumer preferences and regulatory environments.', answer: 'decentralize', why: 'Local market knowledge and responsiveness matter more than corporate uniformity. Decentralization lets each country adapt to its market.' },
  { text: 'A regional bank is deciding how to set interest rates on standard deposit products offered identically across all branches.', answer: 'centralize', why: 'Standardized pricing requires central control to avoid arbitrage and ensure compliance. Local branch managers should not set deposit rates.' },
  { text: 'A software company allows engineering teams to choose their own development tools, frameworks, and project management approaches.', answer: 'decentralize', why: 'Engineering teams have specialized knowledge of their problems. Local autonomy fosters innovation and motivation.' },
  { text: 'A hospital network is reviewing patient safety protocols that affect every facility and are subject to federal regulation.', answer: 'centralize', why: 'Safety standards and regulatory compliance require uniformity. Local variations introduce risk.' },
  { text: 'A grocery chain manager debates whether store managers should set produce prices based on local supplier deals and demand.', answer: 'decentralize', why: 'Produce pricing is highly time-sensitive and depends on local supply. Store managers know their local conditions best.' },
  { text: 'A car manufacturer is choosing whether to use the same brake supplier across all plants worldwide.', answer: 'centralize', why: 'Bulk purchasing power and engineering consistency favor centralized sourcing for critical components.' },
  { text: 'A consulting firm allows project leaders to negotiate fees directly with clients within broad guidelines.', answer: 'decentralize', why: 'Project leaders have detailed client and project knowledge. Decentralized pricing speeds deals and motivates managers.' },
  { text: 'A retail chain is implementing a new corporate-wide HR information system that processes payroll for all employees.', answer: 'centralize', why: 'Payroll processing benefits from scale, audit controls, and consistent tax treatment. Centralization is appropriate.' },
  { text: 'A research division allows scientists to pursue exploratory projects with minimal corporate oversight.', answer: 'decentralize', why: 'Innovation requires autonomy. Heavy central oversight in research often stifles breakthroughs.' },
  { text: 'A construction company is debating whether project managers can approve cost overruns above 10 percent of budget without corporate approval.', answer: 'centralize', why: 'Material cost variances of this magnitude affect overall profitability. Central oversight ensures decisions align with corporate goals.' }
];

let dcIndex = -1, dcCorrect = 0, dcTotal = 0, dcUsed = [];

function initDecentralization() {
  const nextBtn  = el('dc-next-btn');
  const resetBtn = el('dc-reset-btn');
  if (!nextBtn) return;
  nextBtn.addEventListener('click', showNextDC);
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      dcUsed = []; dcCorrect = 0; dcTotal = 0; dcIndex = -1;
      const area = el('dc-scenario-area');
      const res  = el('dc-results-area');
      if (area) area.innerHTML = '';
      if (res)  res.innerHTML = '';
      showNextDC();
    });
  }
}

function showNextDC() {
  const area = el('dc-scenario-area');
  if (!area) return;
  const available = DC_SCENARIOS.map((_, i) => i).filter(i => dcUsed.indexOf(i) === -1);
  if (available.length === 0) {
    area.innerHTML = '<div class="card" style="margin-top:var(--space-4);"><p class="result-highlight">All 10 scenarios completed.</p></div>';
    updateDCResults();
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  dcUsed.push(pick);
  dcIndex = pick;
  const s = DC_SCENARIOS[pick];
  area.innerHTML = '<div class="card" style="margin-top:var(--space-4);">'
    + '<p style="font-size:var(--font-size-lg);line-height:1.6;margin-bottom:var(--space-4);">' + s.text + '</p>'
    + '<div class="tool-actions" style="flex-wrap:wrap;">'
    + '<button class="btn btn--primary dc-answer-btn" data-answer="decentralize">Decentralize</button>'
    + '<button class="btn btn--secondary dc-answer-btn" data-answer="centralize">Centralize</button>'
    + '</div>'
    + '<div id="dc-feedback"></div>'
    + '</div>';
  area.querySelectorAll('.dc-answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDCAnswer(btn.dataset.answer));
  });
}

function handleDCAnswer(chosen) {
  const s = DC_SCENARIOS[dcIndex];
  const feedback = el('dc-feedback');
  if (!s || !feedback) return;
  const correct = chosen === s.answer;
  dcTotal++;
  if (correct) dcCorrect++;
  const labels = { decentralize: 'Decentralize', centralize: 'Centralize' };
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  feedback.innerHTML = '<div style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:'
    + (correct ? (isDark ? 'var(--color-success-bg,#1a3a2a)' : 'var(--color-success-bg,#f0fdf4)') : (isDark ? 'var(--color-danger-bg,#3a1a1a)' : 'var(--color-danger-bg,#fef2f2)'))
    + ';border:1px solid ' + (correct ? 'var(--color-success)' : 'var(--color-danger)') + ';">'
    + '<h4 style="margin:0 0 var(--space-2);">' + (correct ? 'Correct' : 'Not quite') + ' -- ' + labels[s.answer] + '</h4>'
    + '<p style="margin:0;">' + s.why + '</p>'
    + '</div>';
  feedback.parentElement.querySelectorAll('.dc-answer-btn').forEach(btn => { btn.disabled = true; });
  updateDCResults();
}

function updateDCResults() {
  const area = el('dc-results-area');
  if (!area) return;
  area.innerHTML = '<div class="ch12-insight" style="margin-top:var(--space-4);">Score: <strong>' + dcCorrect + ' / ' + dcTotal + '</strong> | Remaining: <strong>' + (DC_SCENARIOS.length - dcUsed.length) + '</strong></div>';
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Transfer Price Method Comparator
// ═══════════════════════════════════════════════════════════════════════════

function calcTPC() {
  const units      = val('tpc-units');
  const varCost    = val('tpc-var-cost');
  const fixedCost  = val('tpc-fixed-cost');
  const markup     = val('tpc-markup') / 100;
  const marketPx   = val('tpc-market-price');
  const finalPx    = val('tpc-final-price');
  const buyAdd     = val('tpc-buy-add-cost');
  const negotiated = val('tpc-negotiated');

  const fullCost = varCost + fixedCost;
  const costPlus = fullCost * (1 + markup);

  const methods = [
    { name: 'Market-Based',          tp: marketPx },
    { name: 'Variable Cost',         tp: varCost },
    { name: 'Full Cost',             tp: fullCost },
    { name: 'Cost-Plus',             tp: costPlus },
    { name: 'Negotiated',            tp: negotiated }
  ];

  const rows = methods.map(m => {
    const sellingDivProfit = (m.tp - varCost) * units;
    const buyingDivProfit  = (finalPx - m.tp - buyAdd) * units;
    const corpProfit       = sellingDivProfit + buyingDivProfit;
    return [m.name, fmt(m.tp), fmt(sellingDivProfit), fmt(buyingDivProfit), fmt(corpProfit)];
  });

  const out = getOrCreate('tpc-output', 'div', 'tool-output', el('tpc-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + panel('All Transfer Pricing Methods Compared',
        table(['Method', 'Transfer Price', 'Selling Div Profit', 'Buying Div Profit', 'Corporate Profit'], rows),
        'Corporate profit is identical across methods because internal transfers do not change total external revenues or costs. The methods only redistribute profit between divisions.'
      )
    + insight('Notice the key insight: <strong>corporate profit is the same in every row</strong>. Transfer pricing redistributes profit between divisions but does not change overall corporate results. The choice of method matters for divisional performance evaluation, manager motivation, and -- in multinational contexts -- tax minimization.')
    + '</div>';

  renderShowWork(el('tpc-show-work'), [
    { label: 'Variable Cost per Unit', formula: 'Input from cost structure', values: fmt(varCost), result: fmt(varCost) },
    { label: 'Full Cost per Unit', formula: 'Variable Cost + Fixed Cost', values: fmt(varCost) + ' + ' + fmt(fixedCost), result: fmt(fullCost) },
    { label: 'Cost-Plus Transfer Price', formula: 'Full Cost x (1 + Markup)', values: fmt(fullCost) + ' x ' + (1 + markup).toFixed(2), result: fmt(costPlus), highlight: true },
    { label: 'Market-Based Transfer Price', formula: 'External market price', values: fmt(marketPx), result: fmt(marketPx), highlight: true },
    { label: 'Selling Division Profit per Unit', formula: 'Transfer Price - Variable Cost', values: 'Transfer Price - ' + fmt(varCost), result: 'Varies by method' },
    { label: 'Buying Division Profit per Unit', formula: 'Final Price - Transfer Price - Additional Costs', values: fmt(finalPx) + ' - Transfer Price - ' + fmt(buyAdd), result: 'Varies by method' },
    { label: 'Corporate Profit per Unit', formula: 'Final Price - Variable Cost - Additional Costs', values: fmt(finalPx) + ' - ' + fmt(varCost) + ' - ' + fmt(buyAdd), result: fmt(finalPx - varCost - buyAdd), highlight: true }
  ], { title: 'Transfer Price Methods', defaultOpen: false });
}

function initTPC() {
  const btn = el('tpc-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcTPC);
  el('tpc-load-example') && el('tpc-load-example').addEventListener('click', () => {
    setVal('tpc-units', 10000); setVal('tpc-var-cost', 40); setVal('tpc-fixed-cost', 15);
    setVal('tpc-markup', 20); setVal('tpc-market-price', 75); setVal('tpc-final-price', 120);
    setVal('tpc-buy-add-cost', 25); setVal('tpc-negotiated', 60);
    calcTPC();
  });
  initRandomizer('tpc-randomize', [
    { id: 'tpc-units',         min: 1000,  max: 50000, step: 500,  integer: true },
    { id: 'tpc-var-cost',      min: 10,    max: 100,   step: 1 },
    { id: 'tpc-fixed-cost',    min: 5,     max: 50,    step: 1 },
    { id: 'tpc-markup',        min: 10,    max: 50,    step: 5 },
    { id: 'tpc-market-price',  min: 30,    max: 200,   step: 1 },
    { id: 'tpc-final-price',   min: 50,    max: 300,   step: 1 },
    { id: 'tpc-buy-add-cost',  min: 5,     max: 60,    step: 1 },
    { id: 'tpc-negotiated',    min: 30,    max: 150,   step: 1 }
  ], calcTPC);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 3 -- General Transfer Pricing Rule
// ═══════════════════════════════════════════════════════════════════════════

function calcGTR() {
  const varCost       = val('gtr-var-cost');
  const capacity      = val('gtr-capacity');
  const extDemand     = val('gtr-external-demand');
  const intNeed       = val('gtr-internal-need');
  const extPrice      = val('gtr-external-price');
  const extVar        = val('gtr-external-var');

  const idleCapacity   = capacity - extDemand;
  const constrained    = intNeed > idleCapacity;
  const lostExternal   = constrained ? Math.max(0, intNeed - idleCapacity) : 0;
  const cmPerUnit      = extPrice - extVar;
  const oppCost        = constrained ? (lostExternal * cmPerUnit) / intNeed : 0;
  const minTP          = varCost + oppCost;
  const maxTP          = extPrice;

  const out = getOrCreate('gtr-output', 'div', 'tool-output', el('gtr-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Capacity Situation',
        table(
          ['Item', 'Units'],
          [
            ['Total Capacity', fmtN(capacity)],
            ['External Demand', fmtN(extDemand)],
            ['Idle Capacity', fmtN(idleCapacity)],
            ['Internal Need', fmtN(intNeed)],
            ['Lost External Sales if Transfer Happens', fmtN(lostExternal)]
          ]
        ),
        constrained ? 'Capacity is constrained -- some external sales will be lost.' : 'Idle capacity exists -- no external sales lost.'
      )
    + panel('Minimum Transfer Price',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + fmt(minTP) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">Variable Cost ' + fmt(varCost) + ' + Opportunity Cost ' + fmt(oppCost) + '</p>',
        constrained ? 'Includes opportunity cost of lost external contribution margin.' : 'Equals variable cost because no external sales are lost.'
      )
    + panel('Maximum Transfer Price',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + fmt(maxTP) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">External market price</p>',
        'The buying division would never pay more than the external market price.'
      )
    + '</div>'
    + verdict(
        'Any transfer price between <strong>' + fmt(minTP) + '</strong> (minimum) and <strong>' + fmt(maxTP) + '</strong> (maximum) leaves both divisions and the corporation better off than no transfer. Outside this range, one party prefers not to transact.',
        true
      )
    + insight('The general rule formula: <strong>Minimum Transfer Price = Incremental Cost per Unit + Opportunity Cost per Unit</strong>. When idle capacity exists, opportunity cost is zero -- so minimum price equals variable cost. When at full capacity, opportunity cost equals the contribution margin per unit lost from displaced external sales.')
    + '</div>';

  renderShowWork(el('gtr-show-work'), [
    { label: 'Idle Capacity', formula: 'Total Capacity - External Demand', values: fmtN(capacity) + ' - ' + fmtN(extDemand), result: fmtN(idleCapacity) + ' units' },
    { label: 'Lost External Sales if Transfer', formula: 'Max(0, Internal Need - Idle Capacity)', values: 'Max(0, ' + fmtN(intNeed) + ' - ' + fmtN(idleCapacity) + ')', result: fmtN(lostExternal) + ' units' },
    { label: 'Contribution Margin per External Unit', formula: 'External Price - External Variable Cost', values: fmt(extPrice) + ' - ' + fmt(extVar), result: fmt(cmPerUnit) },
    { label: 'Opportunity Cost per Unit Transferred', formula: 'Lost External Sales x CM / Internal Need', values: '(' + fmtN(lostExternal) + ' x ' + fmt(cmPerUnit) + ') / ' + fmtN(intNeed), result: fmt(oppCost), highlight: true },
    { label: 'Minimum Transfer Price', formula: 'Variable Cost + Opportunity Cost', values: fmt(varCost) + ' + ' + fmt(oppCost), result: fmt(minTP), highlight: true },
    { label: 'Maximum Transfer Price', formula: 'External Market Price', values: fmt(extPrice), result: fmt(maxTP) }
  ], { title: 'General Transfer Pricing Rule', defaultOpen: false });
}

function initGTR() {
  const btn = el('gtr-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcGTR);
  el('gtr-load-example') && el('gtr-load-example').addEventListener('click', () => {
    setVal('gtr-var-cost', 40); setVal('gtr-capacity', 50000); setVal('gtr-external-demand', 40000);
    setVal('gtr-internal-need', 15000); setVal('gtr-external-price', 75); setVal('gtr-external-var', 40);
    calcGTR();
  });
  initRandomizer('gtr-randomize', [
    { id: 'gtr-var-cost',         min: 10,    max: 100,   step: 1 },
    { id: 'gtr-capacity',         min: 10000, max: 100000, step: 1000, integer: true },
    { id: 'gtr-external-demand',  min: 5000,  max: 90000,  step: 1000, integer: true },
    { id: 'gtr-internal-need',    min: 1000,  max: 30000,  step: 1000, integer: true },
    { id: 'gtr-external-price',   min: 20,    max: 200,    step: 1 },
    { id: 'gtr-external-var',     min: 10,    max: 100,    step: 1 }
  ], calcGTR);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Multinational Tax Strategy
// ═══════════════════════════════════════════════════════════════════════════

function calcMN() {
  const units      = val('mn-units');
  const prodCost   = val('mn-prod-cost');
  const finalPx    = val('mn-final-price');
  const buyAdd     = val('mn-buy-add-cost');
  const taxProd    = val('mn-tax-prod') / 100;
  const taxBuy     = val('mn-tax-buy') / 100;
  const tpLow      = val('mn-tp-low');
  const tpHigh     = val('mn-tp-high');

  function calc(tp) {
    const prodProfit = (tp - prodCost) * units;
    const buyProfit  = (finalPx - tp - buyAdd) * units;
    const prodTax    = prodProfit * taxProd;
    const buyTax     = buyProfit * taxBuy;
    const afterTax   = (prodProfit + buyProfit) - (prodTax + buyTax);
    return { tp, prodProfit, buyProfit, prodTax, buyTax, totalTax: prodTax + buyTax, afterTax };
  }

  const lowResult  = calc(tpLow);
  const highResult = calc(tpHigh);
  const optimalTP  = taxProd < taxBuy ? tpHigh : tpLow;
  const optimalResult = taxProd < taxBuy ? highResult : lowResult;
  const savings = Math.abs(highResult.afterTax - lowResult.afterTax);

  const out = getOrCreate('mn-output', 'div', 'tool-output', el('mn-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Low TP: ' + fmt(tpLow),
        table(
          ['Item', 'Amount'],
          [
            ['Producing Division Profit', fmt(lowResult.prodProfit)],
            ['Buying Division Profit', fmt(lowResult.buyProfit)],
            ['Tax in Producing Country (' + fmtPct(taxProd * 100) + ')', '(' + fmt(lowResult.prodTax) + ')'],
            ['Tax in Buying Country (' + fmtPct(taxBuy * 100) + ')', '(' + fmt(lowResult.buyTax) + ')']
          ],
          ['Global After-Tax Profit', fmt(lowResult.afterTax)]
        )
      )
    + panel('High TP: ' + fmt(tpHigh),
        table(
          ['Item', 'Amount'],
          [
            ['Producing Division Profit', fmt(highResult.prodProfit)],
            ['Buying Division Profit', fmt(highResult.buyProfit)],
            ['Tax in Producing Country (' + fmtPct(taxProd * 100) + ')', '(' + fmt(highResult.prodTax) + ')'],
            ['Tax in Buying Country (' + fmtPct(taxBuy * 100) + ')', '(' + fmt(highResult.buyTax) + ')']
          ],
          ['Global After-Tax Profit', fmt(highResult.afterTax)]
        )
      )
    + '</div>'
    + verdict(
        'Optimal transfer price: <strong>' + fmt(optimalTP) + '</strong>. Global after-tax profit: <strong>' + fmt(optimalResult.afterTax) + '</strong>. Tax savings from optimal pricing within the arms-length range: <strong>' + fmt(savings) + '</strong>.',
        true
      )
    + insight('Strategy: shift profit to the lower-tax jurisdiction by setting the transfer price to favor that division. ' + (taxProd < taxBuy ? 'Producing country has the lower tax rate, so use a high transfer price to keep more profit in the producing division.' : 'Buying country has the lower tax rate, so use a low transfer price to push more profit to the buying division.') + ' Tax authorities require transfer prices within an arms-length range based on comparable third-party transactions. Aggressive pricing outside this range invites audits, adjustments, and penalties under Section 482 of the US tax code and similar regulations worldwide.')
    + '</div>';

  renderShowWork(el('mn-show-work'), [
    { label: 'Producing Division Profit per Unit', formula: 'Transfer Price - Production Cost', values: 'Transfer Price - ' + fmt(prodCost), result: 'Varies' },
    { label: 'Buying Division Profit per Unit', formula: 'Final Price - Transfer Price - Additional Costs', values: fmt(finalPx) + ' - Transfer Price - ' + fmt(buyAdd), result: 'Varies' },
    { label: 'Total Profit per Unit (Corporate)', formula: 'Final Price - Production Cost - Additional Costs', values: fmt(finalPx) + ' - ' + fmt(prodCost) + ' - ' + fmt(buyAdd), result: fmt(finalPx - prodCost - buyAdd), highlight: true },
    { label: 'Optimal Strategy', formula: 'Shift profit to lower-tax country within arms-length range', values: 'Producing tax ' + fmtPct(taxProd * 100) + ', Buying tax ' + fmtPct(taxBuy * 100), result: taxProd < taxBuy ? 'High TP (' + fmt(tpHigh) + ')' : 'Low TP (' + fmt(tpLow) + ')', highlight: true },
    { label: 'Tax Savings', formula: 'Optimal after-tax profit - Suboptimal after-tax profit', values: fmt(optimalResult.afterTax) + ' - ' + fmt(optimalResult.afterTax - savings), result: fmt(savings) }
  ], { title: 'Multinational Tax Strategy', defaultOpen: false });
}

function initMN() {
  const btn = el('mn-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcMN);
  el('mn-load-example') && el('mn-load-example').addEventListener('click', () => {
    setVal('mn-units', 10000); setVal('mn-prod-cost', 50); setVal('mn-final-price', 150);
    setVal('mn-buy-add-cost', 20); setVal('mn-tax-prod', 35); setVal('mn-tax-buy', 15);
    setVal('mn-tp-low', 55); setVal('mn-tp-high', 120);
    calcMN();
  });
  initRandomizer('mn-randomize', [
    { id: 'mn-units',        min: 1000,  max: 50000, step: 500,  integer: true },
    { id: 'mn-prod-cost',    min: 20,    max: 100,   step: 1 },
    { id: 'mn-final-price',  min: 80,    max: 300,   step: 1 },
    { id: 'mn-buy-add-cost', min: 5,     max: 50,    step: 1 },
    { id: 'mn-tax-prod',     min: 5,     max: 45,    step: 1 },
    { id: 'mn-tax-buy',      min: 5,     max: 45,    step: 1 },
    { id: 'mn-tp-low',       min: 30,    max: 100,   step: 1 },
    { id: 'mn-tp-high',      min: 80,    max: 200,   step: 1 }
  ], calcMN);
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ═══════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Decentralization', definition: 'The delegation of decision-making authority to lower levels in an organization, giving subunit managers responsibility for decisions affecting their unit.' },
  { term: 'Centralization', definition: 'Decision-making concentrated at the top of an organization, with subunit managers having limited discretion.' },
  { term: 'Goal Congruence', definition: 'A condition in which individual managers and the organization as a whole have aligned objectives. Performance evaluation systems should foster goal congruence.' },
  { term: 'Responsibility Center', definition: 'A part of an organization for whose performance a manager is held accountable. Types include cost centers, revenue centers, profit centers, and investment centers.' },
  { term: 'Transfer Price', definition: 'The price one subunit charges another for a product or service supplied internally. Transfer pricing affects divisional profits but not total corporate profit in a single-country setting.' },
  { term: 'Market-Based Transfer Pricing', definition: 'Setting the transfer price equal to the external market price for the same or similar goods. Works best when a perfectly competitive market exists for the transferred item.' },
  { term: 'Cost-Based Transfer Pricing', definition: 'Setting the transfer price using internal cost data -- variable cost, full cost, or cost plus a markup. Simple but may not motivate the selling division to control costs.' },
  { term: 'Negotiated Transfer Pricing', definition: 'Transfer price determined by negotiation between selling and buying divisions. Preserves divisional autonomy but may be time-consuming.' },
  { term: 'General Transfer Pricing Rule', definition: 'Minimum transfer price = incremental cost per unit + opportunity cost per unit. Sets a floor below which the selling division should refuse to transfer.' },
  { term: 'Incremental Cost', definition: 'Additional cost incurred to produce and transfer one more unit. Usually equal to variable cost per unit for the selling division.' },
  { term: 'Opportunity Cost', definition: 'Contribution margin forgone by transferring internally instead of selling externally. Zero when idle capacity exists; positive when capacity is constrained.' },
  { term: 'Arms-Length Standard', definition: 'A tax requirement that transfer prices in multinational transactions reflect prices charged in comparable transactions between unrelated parties.' },
  { term: 'Section 482', definition: 'US Internal Revenue Code provision requiring arms-length transfer pricing between affiliated entities. Similar regulations exist in most countries to limit tax-driven profit shifting.' },
  { term: 'Tax Arbitrage', definition: 'Using transfer prices to shift profit from high-tax jurisdictions to low-tax jurisdictions. Legal within the arms-length range but heavily scrutinized by tax authorities.' }
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
  if (el('ch23-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch23-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch23');
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
  const status = el('ch23-status');
  if (!btn || !card) return;
  if (isChapterComplete('ch23')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch23');
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
  initDecentralization();
  initTPC();
  initGTR();
  initMN();
  initKeyTerms();
  initChapterComplete();
});