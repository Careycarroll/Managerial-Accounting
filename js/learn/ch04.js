/**
 * ch04.js — Chapter 4: Job Costing
 * Tools: Job Cost Record Builder, Normal vs Actual Costing,
 *        Overhead Disposal Calculator, Job vs Process Classifier
 */
import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderJournalEntry } from '/js/components/journal-entry.js';
import { renderShowWork } from '/js/components/show-work.js';

// ── Data ──────────────────────────────────────────────────────

const CLASSIFIER_SCENARIOS = [
  {
    scenario: 'Mortenson | Clark constructs the Chase Center arena in San Francisco — a unique $1.2 billion project with custom steel, concrete, and 450 workers per day.',
    answer: 'job',
    explanation: 'Each construction project is unique and distinct. Costs are accumulated separately for this specific job. Classic job costing.'
  },
  {
    scenario: 'Citibank processes thousands of identical customer deposit transactions every day across all its branches.',
    answer: 'process',
    explanation: 'All deposit transactions are identical. The bank divides total processing costs by total transactions to get a per-unit cost. Classic process costing.'
  },
  {
    scenario: 'PricewaterhouseCoopers conducts an audit engagement for a specific Fortune 500 client, requiring a unique team and custom audit plan.',
    answer: 'job',
    explanation: 'Each audit is distinct — different client, different risks, different hours. Costs are tracked to the specific engagement. Job costing.'
  },
  {
    scenario: 'Intel manufactures Core i9 processor chips. Every chip produced in a batch is identical to every other chip.',
    answer: 'process',
    explanation: 'Intel produces masses of identical chips. Total manufacturing costs are divided by units produced to get cost per chip. Process costing.'
  },
  {
    scenario: 'Netflix produces an original film with a specific director, cast, and production budget tracked to that title.',
    answer: 'job',
    explanation: 'Each film is a distinct product with unique costs. Netflix tracks all costs — cast, crew, post-production — to the specific movie. Job costing.'
  },
  {
    scenario: 'Shell Oil refines crude oil into gasoline, diesel, and other petroleum products through a continuous refining process.',
    answer: 'process',
    explanation: 'Oil refining is a continuous process producing homogeneous outputs. Costs are averaged across all barrels refined. Process costing.'
  },
  {
    scenario: 'McKinsey & Company provides a strategic consulting engagement to help a specific airline restructure its operations.',
    answer: 'job',
    explanation: 'Each consulting engagement is unique — different client, problem, and deliverables. Costs are tracked to the specific project. Job costing.'
  },
  {
    scenario: 'PepsiCo produces millions of identical 12-oz cans of Pepsi-Cola on a continuous production line.',
    answer: 'process',
    explanation: 'Every can of Pepsi is identical. Total production costs are divided by cans produced to compute cost per unit. Process costing.'
  },
  {
    scenario: 'Boeing assembles a custom 787 Dreamliner configured to the specific requirements of Singapore Airlines.',
    answer: 'job',
    explanation: 'Each aircraft is built to unique customer specifications with distinct costs tracked to that specific plane. Job costing.'
  },
  {
    scenario: 'Bank of America processes hundreds of thousands of identical check-clearing transactions daily through automated systems.',
    answer: 'process',
    explanation: 'Check clearing is a uniform, repetitive process. The bank averages total processing costs over all checks cleared. Process costing.'
  },
];

const KEY_TERMS = [
  { term: 'Job-Costing System', definition: 'A costing system in which the cost object is a unit or multiple units of a distinct product or service called a job. Each job generally uses different amounts of resources.' },
  { term: 'Process-Costing System', definition: 'A costing system in which the cost object is masses of identical or similar units of a product or service. Costs are averaged over all units produced.' },
  { term: 'Job', definition: 'A unit or multiple units of a distinct product or service — the cost object in a job-costing system. Examples: a specific construction project, an audit engagement, a custom machine.' },
  { term: 'Job-Cost Record', definition: 'Also called a job-cost sheet. A document used to record and accumulate all costs assigned to a specific job, starting when work begins. Contains direct materials, direct labor, and overhead sections.' },
  { term: 'Source Document', definition: 'An original record that supports journal entries in an accounting system. Examples: materials-requisition record, labor-time sheet, purchase invoice.' },
  { term: 'Materials-Requisition Record', definition: 'A source document that contains information about the cost of direct materials used on a specific job and in a specific department.' },
  { term: 'Labor-Time Sheet', definition: 'A source document that contains information about the amount of labor time used for a specific job in a specific department. Used to trace direct labor costs to jobs.' },
  { term: 'Normal Costing', definition: 'A costing system that traces direct costs using actual rates times actual quantities, and allocates indirect costs using budgeted rates times actual quantities of cost-allocation bases.' },
  { term: 'Actual Costing', definition: 'A costing system that traces direct costs using actual rates times actual quantities, and allocates indirect costs using actual rates times actual quantities of cost-allocation bases. Actual rates are only known at year-end.' },
  { term: 'Budgeted Indirect-Cost Rate', definition: 'Calculated at the start of the fiscal year as: Budgeted annual indirect costs / Budgeted annual quantity of the cost-allocation base. Used in normal costing to allocate overhead to jobs throughout the year.' },
  { term: 'Cost Pool', definition: 'A grouping of individual indirect cost items. Cost items in a pool have the same cost-allocation base and are allocated together to cost objects.' },
  { term: 'Cost-Allocation Base', definition: 'A systematic way to link an indirect cost or group of indirect costs to cost objects. The ideal base is the cost driver of the indirect costs. Can be financial (direct labor cost) or nonfinancial (machine-hours).' },
  { term: 'Manufacturing Overhead Allocated', definition: 'Also called manufacturing overhead applied. The amount of manufacturing overhead allocated to individual jobs based on the budgeted rate multiplied by the actual quantity of the allocation base used.' },
  { term: 'Underallocated Indirect Costs', definition: 'Occurs when allocated indirect costs are less than actual indirect costs incurred. Also called underapplied or underabsorbed overhead. Formula: Actual OH - Allocated OH > 0.' },
  { term: 'Overallocated Indirect Costs', definition: 'Occurs when allocated indirect costs are greater than actual indirect costs incurred. Also called overapplied or overabsorbed overhead. Formula: Actual OH - Allocated OH < 0.' },
  { term: 'Proration', definition: 'An approach to disposing of under- or overallocated overhead that spreads the difference among ending WIP, Finished Goods, and Cost of Goods Sold in proportion to the overhead allocated in each account.' },
  { term: 'Adjusted Allocation-Rate Approach', definition: 'Restates all overhead entries using actual overhead cost rates rather than budgeted rates. Adjusts both general ledger and subsidiary ledger job-cost records. Most accurate method.' },
  { term: 'Write-Off to Cost of Goods Sold', definition: 'The simplest disposal method — the entire under- or overallocated overhead is added to (or subtracted from) Cost of Goods Sold. Appropriate when the amount is immaterial.' },
];

const fmt    = n => '$' + Math.round(n).toLocaleString();
const fmtPct = n => (n * 100).toFixed(1) + '%';

// ── Helper: get or create element appended to a parent ────────

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

// ── Tool 1: Job Cost Record Builder ──────────────────────────

function initJobCostRecord() {
  const buildBtn = document.getElementById('jcr-build-btn');
  const output   = document.getElementById('jcr-output');
  if (!buildBtn) return;

  buildBtn.addEventListener('click', buildRecord);

  function getVal(id) { return parseFloat(document.getElementById(id)?.value) || 0; }
  function getStr(id) { return document.getElementById(id)?.value || ''; }

  function buildRecord() {
    const jobName = getStr('jcr-job-name');
    const customer= getStr('jcr-customer');
    const dm      = getVal('jcr-dm');
    const dlHours = getVal('jcr-dl-hours');
    const dlRate  = getVal('jcr-dl-rate');
    const ohRate  = getVal('jcr-oh-rate');
    const price   = getVal('jcr-price');

    const dlCost  = dlHours * dlRate;
    const ohCost  = ohRate  * dlHours;
    const total   = dm + dlCost + ohCost;
    const gm      = price - total;
    const gmPct   = price > 0 ? gm / price : 0;

    document.getElementById('jcr-out-job').textContent      = 'Job No: ' + jobName;
    document.getElementById('jcr-out-customer').textContent = 'Customer: ' + customer;
    document.getElementById('jcr-out-dm').innerHTML  = `<div class="jcr-line"><span>Direct Materials</span><span>${fmt(dm)}</span></div>`;
    document.getElementById('jcr-out-dl').innerHTML  = `<div class="jcr-line"><span>${dlHours.toLocaleString()} hours × ${fmt(dlRate)}/hr</span><span>${fmt(dlCost)}</span></div>`;
    document.getElementById('jcr-out-oh').innerHTML  = `<div class="jcr-line"><span>${dlHours.toLocaleString()} DL-hrs × ${fmt(ohRate)}/hr (budgeted rate)</span><span>${fmt(ohCost)}</span></div>`;
    document.getElementById('jcr-out-total').innerHTML = `
      <div class="jcr-total__row"><span>Direct Materials</span><span>${fmt(dm)}</span></div>
      <div class="jcr-total__row"><span>Direct Manufacturing Labor</span><span>${fmt(dlCost)}</span></div>
      <div class="jcr-total__row"><span>Manufacturing Overhead Allocated</span><span>${fmt(ohCost)}</span></div>
      <div class="jcr-total__row jcr-total__row--total"><span>Total Manufacturing Cost</span><span>${fmt(total)}</span></div>
    `;

    const profitColor = gm >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    const analysis = getOrCreate('jcr-analysis', 'div', 'jcr-analysis card', output);
    analysis.innerHTML = `
      <h4 style="margin-bottom:var(--space-4);font-size:var(--font-size-sm);font-weight:700;">Job Profitability Analysis</h4>
      <div class="jcr-analysis__grid">
        <div class="jcr-analysis__item"><div class="jcr-analysis__label">Contract Price</div><div class="jcr-analysis__value">${fmt(price)}</div></div>
        <div class="jcr-analysis__item"><div class="jcr-analysis__label">Total Manufacturing Cost</div><div class="jcr-analysis__value">${fmt(total)}</div></div>
        <div class="jcr-analysis__item"><div class="jcr-analysis__label">Gross Margin</div><div class="jcr-analysis__value" style="color:${profitColor}">${fmt(gm)}</div></div>
        <div class="jcr-analysis__item"><div class="jcr-analysis__label">Gross Margin %</div><div class="jcr-analysis__value" style="color:${profitColor}">${fmtPct(gmPct)}</div></div>
        <div class="jcr-analysis__item"><div class="jcr-analysis__label">Overhead as % of Total</div><div class="jcr-analysis__value">${total > 0 ? fmtPct(ohCost / total) : '—'}</div></div>
        <div class="jcr-analysis__item"><div class="jcr-analysis__label">Markup on Cost</div><div class="jcr-analysis__value" style="color:${profitColor}">${total > 0 ? fmtPct(gm / total) : '—'}</div></div>
      </div>
    `;

    output.hidden = false;

    const sw = getOrCreate('jcr-show-work', 'div', '', output);
    renderShowWork(sw, [
      { label: 'Direct Labor Cost',                formula: 'DL Cost = DL Hours × DL Rate',                          values: `${dlHours.toLocaleString()} hours × ${fmt(dlRate)}/hr`,    result: fmt(dlCost) },
      { label: 'Manufacturing Overhead Allocated',  formula: 'OH Allocated = Budgeted OH Rate × Actual DL-Hours',     values: `${fmt(ohRate)}/DL-hr × ${dlHours.toLocaleString()} hours`, result: fmt(ohCost) },
      { label: 'Total Manufacturing Cost',          formula: 'Total = Direct Materials + Direct Labor + Overhead',    values: `${fmt(dm)} + ${fmt(dlCost)} + ${fmt(ohCost)}`,             result: fmt(total),   highlight: true },
      { label: 'Gross Margin',                      formula: 'Gross Margin = Contract Price − Total Manufacturing Cost', values: `${fmt(price)} − ${fmt(total)}`,                          result: fmt(gm) },
      { label: 'Gross Margin Percentage',           formula: 'GM% = Gross Margin ÷ Contract Price',                   values: `${fmt(gm)} ÷ ${fmt(price)}`,                               result: fmtPct(gmPct), highlight: true, note: 'A GM% above 30% is generally considered healthy for a custom manufacturing job.' },
    ], { title: 'Show Work — Job Cost Calculations' });
  }

  initRandomizer('jcr-randomize-btn', [
    { id: 'jcr-dm',       min: 1000,  max: 50000,  step: 500,  integer: true },
    { id: 'jcr-dl-hours', min: 10,    max: 500,    step: 5,    integer: true },
    { id: 'jcr-dl-rate',  min: 12,    max: 60,     step: 2,    integer: true },
    { id: 'jcr-oh-rate',  min: 10,    max: 80,     step: 5,    integer: true },
    { id: 'jcr-price',    min: 5000,  max: 200000, step: 1000, integer: true },
  ], () => buildRecord());
}

// ── Tool 2: Normal vs Actual Costing ─────────────────────────

function initNormalVsActual() {
  const calcBtn = document.getElementById('nva-calculate-btn');
  const results = document.getElementById('nva-results');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', calculate);

  function getVal(id) { return parseFloat(document.getElementById(id)?.value) || 0; }

  function calculate() {
    const budgOH    = getVal('nva-budg-oh');
    const budgHours = getVal('nva-budg-hours');
    const actOH     = getVal('nva-act-oh');
    const actHours  = getVal('nva-act-hours');
    const jobDM     = getVal('nva-job-dm');
    const jobDL     = getVal('nva-job-dl');
    const jobHours  = getVal('nva-job-hours');

    const budgRate    = budgHours > 0 ? budgOH / budgHours : 0;
    const actRate     = actHours  > 0 ? actOH  / actHours  : 0;
    const normalOH    = budgRate * jobHours;
    const actualOH    = actRate  * jobHours;
    const normalTotal = jobDM + jobDL + normalOH;
    const actualTotal = jobDM + jobDL + actualOH;
    const difference  = actualTotal - normalTotal;

    const comparison = getOrCreate('nva-comparison', 'div', 'nva-comparison', results);
    comparison.innerHTML = `
      <table class="data-table nva-table">
        <thead><tr><th>Item</th><th class="num">Normal Costing</th><th class="num">Actual Costing</th></tr></thead>
        <tbody>
          <tr><td>Annual Overhead</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(budgOH)} (budgeted)</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(actOH)} (actual)</td></tr>
          <tr><td>Annual DL-Hours</td><td style="text-align:right;font-family:var(--font-mono)">${budgHours.toLocaleString()} (budgeted)</td><td style="text-align:right;font-family:var(--font-mono)">${actHours.toLocaleString()} (actual)</td></tr>
          <tr style="font-weight:700;background:var(--color-gray-50)"><td>Overhead Rate</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(budgRate)}/DL-hr</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(actRate)}/DL-hr</td></tr>
          <tr><td colspan="3" style="padding:var(--space-2) 0;border:none"></td></tr>
          <tr><td>Direct Materials</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(jobDM)}</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(jobDM)}</td></tr>
          <tr><td>Direct Labor</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(jobDL)}</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(jobDL)}</td></tr>
          <tr><td>Overhead (${jobHours} hrs × rate)</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(normalOH)}</td><td style="text-align:right;font-family:var(--font-mono)">${fmt(actualOH)}</td></tr>
          <tr style="font-weight:700;border-top:2px solid var(--color-border)"><td>Total Job Cost</td><td style="text-align:right;font-family:var(--font-mono);color:var(--color-primary)">${fmt(normalTotal)}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--color-primary)">${fmt(actualTotal)}</td></tr>
          <tr style="color:${difference >= 0 ? 'var(--color-danger)' : 'var(--color-success)'}"><td>Difference (Actual − Normal)</td><td></td><td style="text-align:right;font-family:var(--font-mono);font-weight:700">${difference >= 0 ? '+' : ''}${fmt(difference)}</td></tr>
        </tbody>
      </table>
    `;

    const higherLower = difference > 0 ? 'higher' : difference < 0 ? 'lower' : 'identical';
    const insight = getOrCreate('nva-insight', 'div', 'nva-insight', results);
    insight.innerHTML = `
      <strong>Key insight:</strong> The actual overhead rate (${fmt(actRate)}/hr) is
      ${actRate > budgRate ? 'higher' : actRate < budgRate ? 'lower' : 'equal to'} the budgeted rate (${fmt(budgRate)}/hr).
      Actual costing produces a job cost that is <strong>${fmt(Math.abs(difference))} ${higherLower}</strong> than normal costing.
      Normal costing is preferred in practice because the budgeted rate is known at the start of the year,
      allowing managers to price jobs and monitor costs without waiting until year-end.
    `;

    results.hidden = false;

    const sw = getOrCreate('nva-show-work', 'div', '', results);
    renderShowWork(sw, [
      { label: 'Budgeted Overhead Rate',             formula: 'Budgeted Rate = Budgeted Annual OH ÷ Budgeted Annual DL-Hours', values: `${fmt(budgOH)} ÷ ${budgHours.toLocaleString()} hours`,  result: `${fmt(budgRate)}/DL-hr` },
      { label: 'Actual Overhead Rate',               formula: 'Actual Rate = Actual Annual OH ÷ Actual Annual DL-Hours',       values: `${fmt(actOH)} ÷ ${actHours.toLocaleString()} hours`,    result: `${fmt(actRate)}/DL-hr` },
      { label: 'Normal Costing — Overhead on Job',   formula: 'OH (Normal) = Budgeted Rate × Actual Job DL-Hours',            values: `${fmt(budgRate)}/hr × ${jobHours.toLocaleString()} hrs`, result: fmt(normalOH) },
      { label: 'Actual Costing — Overhead on Job',   formula: 'OH (Actual) = Actual Rate × Actual Job DL-Hours',              values: `${fmt(actRate)}/hr × ${jobHours.toLocaleString()} hrs`,  result: fmt(actualOH) },
      { label: 'Normal Costing — Total Job Cost',    formula: 'Total = Direct Materials + Direct Labor + OH (Normal)',        values: `${fmt(jobDM)} + ${fmt(jobDL)} + ${fmt(normalOH)}`,       result: fmt(normalTotal), highlight: true },
      { label: 'Actual Costing — Total Job Cost',    formula: 'Total = Direct Materials + Direct Labor + OH (Actual)',        values: `${fmt(jobDM)} + ${fmt(jobDL)} + ${fmt(actualOH)}`,       result: fmt(actualTotal), highlight: true },
      { label: 'Difference Between Methods',         formula: 'Difference = Actual Total − Normal Total',                    values: `${fmt(actualTotal)} − ${fmt(normalTotal)}`,               result: `${difference >= 0 ? '+' : ''}${fmt(difference)}`, note: 'This difference exists because the budgeted and actual overhead rates differ. Normal costing is preferred because the budgeted rate is available at the start of the year.' },
    ], { title: 'Show Work — Normal vs. Actual Costing' });
  }

  initRandomizer('nva-randomize-btn', [
    { id: 'nva-budg-oh',    min: 500000,  max: 5000000, step: 50000, integer: true },
    { id: 'nva-budg-hours', min: 10000,   max: 100000,  step: 1000,  integer: true },
    { id: 'nva-act-oh',     min: 500000,  max: 5000000, step: 50000, integer: true },
    { id: 'nva-act-hours',  min: 10000,   max: 100000,  step: 1000,  integer: true },
    { id: 'nva-job-dm',     min: 1000,    max: 50000,   step: 500,   integer: true },
    { id: 'nva-job-dl',     min: 500,     max: 20000,   step: 500,   integer: true },
    { id: 'nva-job-hours',  min: 10,      max: 500,     step: 10,    integer: true },
  ], () => document.getElementById('nva-calculate-btn').click());
}

// ── Tool 3: Overhead Disposal Calculator ─────────────────────

function initOverheadDisposal() {
  const calcBtn = document.getElementById('ohd-calculate-btn');
  const results = document.getElementById('ohd-results');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', calculate);

  function getVal(id) { return parseFloat(document.getElementById(id)?.value) || 0; }

  function getOhdSection() {
    return document.querySelector('.ohd-container')?.closest('.learn-section');
  }

  function calculate() {
    const budgRate  = getVal('ohd-budg-rate');
    const actHours  = getVal('ohd-act-hours');
    const actOH     = getVal('ohd-act-oh');
    const wip       = getVal('ohd-wip');
    const fg        = getVal('ohd-fg');
    const cogs      = getVal('ohd-cogs');
    const wipAlloc  = getVal('ohd-wip-alloc');
    const fgAlloc   = getVal('ohd-fg-alloc');
    const cogsAlloc = getVal('ohd-cogs-alloc');

    const allocated      = budgRate * actHours;
    const difference     = actOH - allocated;
    const isUnder        = difference > 0;
    const label          = isUnder ? 'Underallocated' : 'Overallocated';
    const color          = isUnder ? 'var(--color-danger)' : 'var(--color-success)';
    const totalBalances  = wip + fg + cogs;
    const totalAlloc     = wipAlloc + fgAlloc + cogsAlloc;
    const wipPctBal      = totalBalances > 0 ? wip      / totalBalances : 0;
    const fgPctBal       = totalBalances > 0 ? fg       / totalBalances : 0;
    const cogsPctBal     = totalBalances > 0 ? cogs     / totalBalances : 0;
    const wipPctAlloc    = totalAlloc    > 0 ? wipAlloc / totalAlloc    : 0;
    const fgPctAlloc     = totalAlloc    > 0 ? fgAlloc  / totalAlloc    : 0;
    const cogsPctAlloc   = totalAlloc    > 0 ? cogsAlloc/ totalAlloc    : 0;
    const wipAdj2        = wipPctBal    * difference;
    const fgAdj2         = fgPctBal     * difference;
    const cogsAdj2       = cogsPctBal   * difference;
    const wipAdj3        = wipPctAlloc  * difference;
    const fgAdj3         = fgPctAlloc   * difference;
    const cogsAdj3       = cogsPctAlloc * difference;

    const ohdSummary = getOrCreate('ohd-summary', 'div', '', results);
    ohdSummary.innerHTML = `
      <div class="ohd-summary__grid">
        <div class="ohd-summary__item">
          <div class="ohd-summary__label">Overhead Allocated</div>
          <div class="ohd-summary__value">${fmt(allocated)}</div>
          <div class="ohd-summary__sub">${budgRate}/hr × ${actHours.toLocaleString()} hrs</div>
        </div>
        <div class="ohd-summary__item">
          <div class="ohd-summary__label">Actual Overhead</div>
          <div class="ohd-summary__value">${fmt(actOH)}</div>
        </div>
        <div class="ohd-summary__item ohd-summary__item--highlight">
          <div class="ohd-summary__label">${label}</div>
          <div class="ohd-summary__value" style="color:${color}">${fmt(Math.abs(difference))}</div>
          <div class="ohd-summary__sub">${isUnder ? 'Actual > Allocated' : 'Allocated > Actual'}</div>
        </div>
      </div>
    `;

    results.hidden = false;

    const ohdSection = getOhdSection();
    const ohdMethods = getOrCreate('ohd-methods', 'div', 'ohd-methods-section', ohdSection || results);
    ohdMethods.innerHTML = `
      <h4 style="max-width:min(1200px,92vw);margin:0 auto var(--space-4);font-size:var(--font-size-base);font-weight:700;color:var(--color-gray-900);">Three Disposal Methods</h4>
      <div class="ohd-methods-grid">
        <div class="ohd-method card">
          <div class="ohd-method__title">Method 1: Write-Off to COGS</div>
          <div class="ohd-method__desc">Entire ${label.toLowerCase()} amount goes to Cost of Goods Sold. Simplest — appropriate when amount is immaterial.</div>
          <table class="data-table" style="margin-top:var(--space-3)">
            <thead><tr><th>Account</th><th class="num">Adjustment</th><th class="num">New Balance</th></tr></thead>
            <tbody>
              <tr><td>WIP</td><td style="text-align:right">—</td><td style="text-align:right">${fmt(wip)}</td></tr>
              <tr><td>Finished Goods</td><td style="text-align:right">—</td><td style="text-align:right">${fmt(fg)}</td></tr>
              <tr style="font-weight:600"><td>Cost of Goods Sold</td><td style="text-align:right;color:${color}">${isUnder?'+':'-'}${fmt(Math.abs(difference))}</td><td style="text-align:right">${fmt(cogs+(isUnder?difference:-Math.abs(difference)))}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ohd-method card">
          <div class="ohd-method__title">Method 2: Prorate by Ending Balances</div>
          <div class="ohd-method__desc">Spread in proportion to ending account balances. Expedient approximation.</div>
          <table class="data-table" style="margin-top:var(--space-3)">
            <thead><tr><th>Account</th><th class="num">% of Total</th><th class="num">Adjustment</th><th class="num">New Balance</th></tr></thead>
            <tbody>
              <tr><td>WIP</td><td style="text-align:right">${fmtPct(wipPctBal)}</td><td style="text-align:right;color:${color}">${isUnder?'+':'-'}${fmt(Math.abs(wipAdj2))}</td><td style="text-align:right">${fmt(wip+(isUnder?wipAdj2:-Math.abs(wipAdj2)))}</td></tr>
              <tr><td>Finished Goods</td><td style="text-align:right">${fmtPct(fgPctBal)}</td><td style="text-align:right;color:${color}">${isUnder?'+':'-'}${fmt(Math.abs(fgAdj2))}</td><td style="text-align:right">${fmt(fg+(isUnder?fgAdj2:-Math.abs(fgAdj2)))}</td></tr>
              <tr style="font-weight:600"><td>COGS</td><td style="text-align:right">${fmtPct(cogsPctBal)}</td><td style="text-align:right;color:${color}">${isUnder?'+':'-'}${fmt(Math.abs(cogsAdj2))}</td><td style="text-align:right">${fmt(cogs+(isUnder?cogsAdj2:-Math.abs(cogsAdj2)))}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="ohd-method card">
          <div class="ohd-method__title">Method 3: Prorate by Allocated OH</div>
          <div class="ohd-method__desc">Spread in proportion to overhead allocated in each account. Most accurate — matches actual rates.</div>
          <table class="data-table" style="margin-top:var(--space-3)">
            <thead><tr><th>Account</th><th class="num">% of OH</th><th class="num">Adjustment</th><th class="num">New Balance</th></tr></thead>
            <tbody>
              <tr><td>WIP</td><td style="text-align:right">${fmtPct(wipPctAlloc)}</td><td style="text-align:right;color:${color}">${isUnder?'+':'-'}${fmt(Math.abs(wipAdj3))}</td><td style="text-align:right">${fmt(wip+(isUnder?wipAdj3:-Math.abs(wipAdj3)))}</td></tr>
              <tr><td>Finished Goods</td><td style="text-align:right">${fmtPct(fgPctAlloc)}</td><td style="text-align:right;color:${color}">${isUnder?'+':'-'}${fmt(Math.abs(fgAdj3))}</td><td style="text-align:right">${fmt(fg+(isUnder?fgAdj3:-Math.abs(fgAdj3)))}</td></tr>
              <tr style="font-weight:600"><td>COGS</td><td style="text-align:right">${fmtPct(cogsPctAlloc)}</td><td style="text-align:right;color:${color}">${isUnder?'+':'-'}${fmt(Math.abs(cogsAdj3))}</td><td style="text-align:right">${fmt(cogs+(isUnder?cogsAdj3:-Math.abs(cogsAdj3)))}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const journalEl = getOrCreate('ohd-journal', 'div', 'container container--tool', ohdSection || results);
    journalEl.style.marginTop = 'var(--space-6)';
    const entries = isUnder
      ? [
          { account: 'Cost of Goods Sold (write-off method)', debit: Math.abs(difference), credit: null,                    indent: false },
          { account: 'Manufacturing Overhead Allocated',       debit: allocated,            credit: null,                    indent: false },
          { account: '  Manufacturing Overhead Control',       debit: null,                 credit: actOH,                   indent: true  },
        ]
      : [
          { account: 'Manufacturing Overhead Allocated',        debit: allocated,            credit: null,                    indent: false },
          { account: '  Manufacturing Overhead Control',        debit: null,                 credit: actOH,                   indent: true  },
          { account: '  Cost of Goods Sold (write-off method)', debit: null,                 credit: Math.abs(difference),    indent: true  },
        ];
    renderJournalEntry(journalEl, entries, {
      title:    'Journal Entry — Write-Off Method',
      subtitle: `Closes both Manufacturing Overhead accounts. ${label} amount of ${fmt(Math.abs(difference))} ${isUnder ? 'debited to' : 'credited to'} COGS.`,
      balanced: true,
    });

    const sw = getOrCreate('ohd-show-work', 'div', 'container container--tool', ohdSection || results);
    renderShowWork(sw, [
      { label: 'Manufacturing Overhead Allocated',  formula: 'OH Allocated = Budgeted Rate × Actual DL-Hours',                                        values: `${fmt(budgRate)}/hr × ${actHours.toLocaleString()} hours`,                                      result: fmt(allocated) },
      { label: 'Under- or Overallocated Overhead',  formula: 'Under(Over)allocated = Actual OH − OH Allocated',                                       values: `${fmt(actOH)} − ${fmt(allocated)}`,                                                             result: `${fmt(Math.abs(difference))} ${label}`, highlight: true, note: isUnder ? 'Underallocated: actual overhead exceeded what was allocated to jobs. Must be disposed of at year-end.' : 'Overallocated: more overhead was allocated to jobs than was actually incurred. Must be disposed of at year-end.' },
      { label: 'Method 1 — Write-Off to COGS',      formula: 'Entire difference → Cost of Goods Sold',                                               values: `COGS ${isUnder?'+':'−'} ${fmt(Math.abs(difference))}`,                                          result: `New COGS = ${fmt(cogs+(isUnder?difference:-Math.abs(difference)))}`, note: 'Simplest method. Appropriate when the amount is immaterial relative to operating income.' },
      { label: 'Method 2 — Prorate by Ending Balances', formula: 'Each account adjusted by (Account Balance ÷ Total Balances) × Difference',         values: `WIP: ${fmtPct(wipPctBal)}, FG: ${fmtPct(fgPctBal)}, COGS: ${fmtPct(cogsPctBal)}`,           result: `WIP ${fmt(Math.abs(wipAdj2))}, FG ${fmt(Math.abs(fgAdj2))}, COGS ${fmt(Math.abs(cogsAdj2))}`, note: 'Expedient approximation. Easy to compute but less accurate than Method 3.' },
      { label: 'Method 3 — Prorate by Allocated OH', formula: 'Each account adjusted by (OH Allocated in Account ÷ Total OH Allocated) × Difference', values: `WIP: ${fmtPct(wipPctAlloc)}, FG: ${fmtPct(fgPctAlloc)}, COGS: ${fmtPct(cogsPctAlloc)}`,    result: `WIP ${fmt(Math.abs(wipAdj3))}, FG ${fmt(Math.abs(fgAdj3))}, COGS ${fmt(Math.abs(cogsAdj3))}`, highlight: true, note: 'Most accurate method. Results match what actual costing would have produced.' },
    ], { title: 'Show Work — Overhead Disposal Calculations' });
  }

  initRandomizer('ohd-randomize-btn', [
    { id: 'ohd-budg-rate',  min: 10,     max: 100,     step: 5,     integer: true },
    { id: 'ohd-act-hours',  min: 5000,   max: 100000,  step: 1000,  integer: true },
    { id: 'ohd-act-oh',     min: 200000, max: 5000000, step: 50000, integer: true },
    { id: 'ohd-wip',        min: 10000,  max: 200000,  step: 5000,  integer: true },
    { id: 'ohd-fg',         min: 20000,  max: 300000,  step: 5000,  integer: true },
    { id: 'ohd-cogs',       min: 500000, max: 5000000, step: 50000, integer: true },
    { id: 'ohd-wip-alloc',  min: 5000,   max: 100000,  step: 1000,  integer: true },
    { id: 'ohd-fg-alloc',   min: 10000,  max: 150000,  step: 1000,  integer: true },
    { id: 'ohd-cogs-alloc', min: 200000, max: 2000000, step: 10000, integer: true },
  ], () => document.getElementById('ohd-calculate-btn').click());
}

// ── Tool 4: Job vs Process Classifier ────────────────────────

function initClassifier() {
  const scenarioEl   = document.getElementById('jpc-scenario');
  const feedbackEl   = document.getElementById('jpc-feedback');
  const counterEl    = document.getElementById('jpc-counter');
  const prevBtn      = document.getElementById('jpc-prev');
  const nextBtn      = document.getElementById('jpc-next');
  const progressFill = document.getElementById('jpc-progress-fill');
  const progressLbl  = document.getElementById('jpc-progress-label');
  const btnJob       = document.getElementById('jpc-btn-job');
  const btnProcess   = document.getElementById('jpc-btn-process');
  if (!scenarioEl) return;

  let current = 0;
  const answers = new Array(CLASSIFIER_SCENARIOS.length).fill(null);
  const correct = new Array(CLASSIFIER_SCENARIOS.length).fill(false);

  function render(index) {
    const item = CLASSIFIER_SCENARIOS[index];
    scenarioEl.textContent = item.scenario;
    feedbackEl.hidden      = true;
    counterEl.textContent  = `${index + 1} of ${CLASSIFIER_SCENARIOS.length}`;
    prevBtn.disabled       = index === 0;
    btnJob.classList.remove('jpc-btn--correct','jpc-btn--incorrect','jpc-btn--selected');
    btnProcess.classList.remove('jpc-btn--correct','jpc-btn--incorrect','jpc-btn--selected');

    if (answers[index]) {
      const isCorrect = answers[index] === item.answer;
      const userBtn   = answers[index] === 'job' ? btnJob : btnProcess;
      const otherBtn  = answers[index] === 'job' ? btnProcess : btnJob;
      userBtn.classList.add(isCorrect ? 'jpc-btn--correct' : 'jpc-btn--incorrect');
      if (!isCorrect) otherBtn.classList.add('jpc-btn--correct');
      feedbackEl.hidden    = false;
      feedbackEl.className = `jpc-feedback jpc-feedback--${isCorrect ? 'success' : 'error'}`;
      feedbackEl.innerHTML = `<strong>${isCorrect ? '✓ Correct!' : '✗ Not quite.'}</strong> ${item.explanation}`;
      nextBtn.disabled     = index === CLASSIFIER_SCENARIOS.length - 1;
    } else {
      nextBtn.disabled = true;
    }
    updateProgress();
  }

  function updateProgress() {
    const count = correct.filter(Boolean).length;
    const pct   = Math.round((count / CLASSIFIER_SCENARIOS.length) * 100);
    progressFill.style.width = `${pct}%`;
    progressLbl.textContent  = `${count} of ${CLASSIFIER_SCENARIOS.length} classified correctly`;
  }

  function answer(choice) {
    if (answers[current] && correct[current]) return;
    answers[current] = choice;
    if (choice === CLASSIFIER_SCENARIOS[current].answer) correct[current] = true;
    render(current);
  }

  btnJob.addEventListener('click',     () => answer('job'));
  btnProcess.addEventListener('click', () => answer('process'));
  prevBtn.addEventListener('click',    () => { if (current > 0) render(--current); });
  nextBtn.addEventListener('click',    () => { if (current < CLASSIFIER_SCENARIOS.length - 1) render(++current); });
  render(0);
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
  const statusEl  = document.getElementById('ch04-status');
  const actionsEl = btn?.closest('.chapter-complete__actions');
  if (isChapterComplete('ch04')) setCompleteUI();
  btn?.addEventListener('click', () => { markChapterComplete('ch04'); setCompleteUI(); });
  function setCompleteUI() {
    if (statusEl) { statusEl.textContent = '✓ Completed'; statusEl.classList.add('chapter-hero__progress-label--complete'); }
    if (btn)      { btn.textContent = '✓ Completed'; btn.disabled = true; }
    if (actionsEl && !actionsEl.querySelector('.reset-chapter-btn')) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn--ghost-danger reset-chapter-btn';
      resetBtn.textContent = 'Reset Chapter';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset Chapter 4? This will clear your completion status and reload the page.')) {
          resetChapter('ch04');
          window.location.reload();
        }
      });
      actionsEl.appendChild(resetBtn);
    }
  }
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initJobCostRecord();
  initNormalVsActual();
  initOverheadDisposal();
  initClassifier();
  initKeyTerms();
  initChapterComplete();
});
