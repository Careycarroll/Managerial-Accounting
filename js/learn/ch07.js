/**
 * ch07.js -- Chapter 7: Flexible Budgets, Direct-Cost Variances, and Management Control
 * Tools: Static vs Flexible Budget Analyzer, Direct-Cost Variance Calculator, Variance Hierarchy Diagram
 */
import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';

// ── Shared state ──────────────────────────────────────────────
let vaResults = null;
let dvResults = null;

const fmt    = n => '$' + Math.round(Math.abs(n)).toLocaleString();
const fmtDec = (n, d=2) => '$' + Math.abs(n).toFixed(d);
const fmtV   = (n, decimals=0) => {
  const abs = decimals > 0 ? Math.abs(n).toFixed(decimals) : Math.round(Math.abs(n)).toLocaleString();
  const label = n > 0 ? ' U' : n < 0 ? ' F' : '';
  const color = n > 0 ? 'var(--color-danger)' : n < 0 ? 'var(--color-success)' : 'var(--color-text-muted)';
  return { text: '$' + abs + label, color };
};
const gv = id => parseFloat(document.getElementById(id)?.value) || 0;

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

// ── Key Terms ─────────────────────────────────────────────────
const KEY_TERMS = [
  { term: 'Variance', definition: 'The difference between actual results and expected (budgeted) performance. Variances bring together the planning and control functions of management.' },
  { term: 'Static Budget', definition: 'Also called the master budget. Based on the level of output planned at the start of the budget period. Developed around a single planned output level.' },
  { term: 'Static-Budget Variance', definition: 'The difference between the actual result and the corresponding budgeted amount in the static budget. Equals the flexible-budget variance plus the sales-volume variance.' },
  { term: 'Flexible Budget', definition: 'Calculates budgeted revenues and costs based on the actual output in the budget period. Prepared retroactively after managers know the actual output level.' },
  { term: 'Flexible-Budget Variance', definition: 'The difference between an actual result and the corresponding flexible-budget amount. A better measure of performance than the static-budget variance because it compares actual and budgeted amounts for the same output level.' },
  { term: 'Sales-Volume Variance', definition: 'The difference between a flexible-budget amount and the corresponding static-budget amount. Arises solely from the difference between actual quantity sold and budgeted quantity sold.' },
  { term: 'Selling-Price Variance', definition: 'The flexible-budget variance for revenues. Arises solely from the difference between the actual selling price and the budgeted selling price.' },
  { term: 'Management by Exception', definition: 'A practice whereby managers focus more closely on areas that are not operating as expected and less closely on areas that are. Variances facilitate management by exception.' },
  { term: 'Standard', definition: 'A carefully determined price, cost, or quantity used as a benchmark for judging performance. Usually expressed on a per-unit basis.' },
  { term: 'Standard Cost', definition: 'A carefully determined cost of a unit of output. Standard cost per output unit = Standard input allowed per output unit x Standard price per input unit.' },
  { term: 'Price Variance', definition: 'Also called rate variance. The difference between actual price and budgeted price, multiplied by the actual input quantity. Measures whether inputs cost more or less than standard.' },
  { term: 'Efficiency Variance', definition: 'Also called usage variance. The difference between actual input quantity used and budgeted input quantity allowed for actual output, multiplied by budgeted price. Measures whether more or fewer inputs were used than standard.' },
  { term: "Benchmarking", definition: "The continuous process of comparing one company's performance levels against the best levels of performance in competing companies or in companies having similar processes." },
];

// ── Tool 1: Static vs Flexible Budget Analyzer ───────────────

function initVarAnalyzer() {
  const calcBtn   = document.getElementById('va-calculate');
  const resultsEl = document.getElementById('va-results');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => calculateVA(resultsEl));

  initRandomizer('va-randomize', [
    { id: 'va-budg-units', min: 5000,   max: 50000,  step: 1000, integer: true },
    { id: 'va-act-units',  min: 3000,   max: 45000,  step: 1000, integer: true },
    { id: 'va-budg-price', min: 50,     max: 300,    step: 5,    integer: true },
    { id: 'va-act-price',  min: 40,     max: 320,    step: 5,    integer: true },
    { id: 'va-budg-dm',    min: 10,     max: 100,    step: 5,    integer: true },
    { id: 'va-act-dm',     min: 8,      max: 110,    step: 1,    integer: true },
    { id: 'va-budg-dl',    min: 5,      max: 60,     step: 2,    integer: true },
    { id: 'va-act-dl',     min: 4,      max: 70,     step: 1,    integer: true },
    { id: 'va-budg-voh',   min: 5,      max: 40,     step: 2,    integer: true },
    { id: 'va-act-voh',    min: 4,      max: 45,     step: 1,    integer: true },
    { id: 'va-budg-fc',    min: 100000, max: 500000, step: 10000,integer: true },
    { id: 'va-act-fc',     min: 90000,  max: 550000, step: 10000,integer: true },
  ], () => calculateVA(resultsEl));
}

function calculateVA(resultsEl) {
  const budgUnits = gv('va-budg-units');
  const actUnits  = gv('va-act-units');
  const budgPrice = gv('va-budg-price');
  const actPrice  = gv('va-act-price');
  const budgDM    = gv('va-budg-dm');
  const actDM     = gv('va-act-dm');
  const budgDL    = gv('va-budg-dl');
  const actDL     = gv('va-act-dl');
  const budgVOH   = gv('va-budg-voh');
  const actVOH    = gv('va-act-voh');
  const budgFC    = gv('va-budg-fc');
  const actFC     = gv('va-act-fc');

  const budgVCpu  = budgDM + budgDL + budgVOH;
  const actVCpu   = actDM  + actDL  + actVOH;

  // Static budget
  const sbRev     = budgPrice * budgUnits;
  const sbVC      = budgVCpu  * budgUnits;
  const sbCM      = sbRev - sbVC;
  const sbOI      = sbCM - budgFC;

  // Flexible budget (budgeted prices, actual units)
  const fbRev     = budgPrice * actUnits;
  const fbVC      = budgVCpu  * actUnits;
  const fbCM      = fbRev - fbVC;
  const fbOI      = fbCM - budgFC;

  // Actual
  const actRev    = actPrice * actUnits;
  const actVC     = actVCpu  * actUnits;
  const actCM     = actRev - actVC;
  const actOI     = actCM - actFC;

  // Variances (positive = unfavorable for costs, negative = favorable)
  const svRev     = actRev - sbRev;    // positive = F for revenue
  const svVC      = sbVC   - actVC;    // positive = F for costs (less cost)
  const svCM      = actCM  - sbCM;
  const svOI      = actOI  - sbOI;

  const fbvRev    = actRev - fbRev;
  const fbvVC     = fbVC   - actVC;
  const fbvCM     = actCM  - fbCM;
  const fbvOI     = actOI  - fbOI;

  const svvRev    = fbRev  - sbRev;
  const svvVC     = sbVC   - fbVC;
  const svvCM     = fbCM   - sbCM;
  const svvOI     = fbOI   - sbOI;

  const spv       = (actPrice - budgPrice) * actUnits;

  vaResults = {
    budgUnits, actUnits, budgPrice, actPrice,
    budgVCpu, actVCpu, budgFC, actFC,
    sbRev, sbVC, sbCM, sbOI,
    fbRev, fbVC, fbCM, fbOI,
    actRev, actVC, actCM, actOI,
    fbvOI, svvOI, svOI, spv,
    fbvRev, fbvVC, fbvCM,
    svvRev, svvVC, svvCM,
  };
  try { sessionStorage.setItem('ch7-var-results', JSON.stringify(vaResults)); } catch {}

  const varCell = (v, isRev=false) => {
    const unf = isRev ? v < 0 : v > 0;
    const fav = isRev ? v > 0 : v < 0;
    const color = unf ? 'var(--color-danger)' : fav ? 'var(--color-success)' : 'var(--color-text-muted)';
    const label = unf ? ' U' : fav ? ' F' : '';
    return `<td style="text-align:right;font-family:var(--font-mono);color:${color}">${fmt(v)}${label}</td>`;
  };
  const numCell = v => `<td style="text-align:right;font-family:var(--font-mono)">${fmt(v)}</td>`;

  const tableHTML = `
    <div style="overflow-x:auto;border-radius:var(--radius-lg);border:1px solid var(--color-border);margin-top:var(--space-5)">
      <table class="data-table">
        <thead>
          <tr>
            <th>Line Item</th>
            <th class="num">Actual Results</th>
            <th class="num">Flex-Budget Variance</th>
            <th class="num">Flexible Budget</th>
            <th class="num">Sales-Volume Variance</th>
            <th class="num">Static Budget</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Units Sold</td>${numCell(actUnits)}
            <td style="text-align:right;color:var(--color-text-muted)">0</td>
            ${numCell(actUnits)}
            <td style="text-align:right;font-family:var(--font-mono);color:${actUnits<budgUnits?'var(--color-danger)':'var(--color-success)'}">${(actUnits-budgUnits).toLocaleString()} ${actUnits<budgUnits?'U':'F'}</td>
            ${numCell(budgUnits)}
          </tr>
          <tr><td>Revenues</td>${numCell(actRev)}${varCell(fbvRev,true)}${numCell(fbRev)}${varCell(svvRev,true)}${numCell(sbRev)}</tr>
          <tr><td style="padding-left:var(--space-6)">Direct Materials</td>
            ${numCell(actDM*actUnits)}${varCell(-(actDM-budgDM)*actUnits)}${numCell(budgDM*actUnits)}${varCell(-(budgDM*actUnits-budgDM*budgUnits))}${numCell(budgDM*budgUnits)}
          </tr>
          <tr><td style="padding-left:var(--space-6)">Direct Labor</td>
            ${numCell(actDL*actUnits)}${varCell(-(actDL-budgDL)*actUnits)}${numCell(budgDL*actUnits)}${varCell(-(budgDL*actUnits-budgDL*budgUnits))}${numCell(budgDL*budgUnits)}
          </tr>
          <tr><td style="padding-left:var(--space-6)">Variable Overhead</td>
            ${numCell(actVOH*actUnits)}${varCell(-(actVOH-budgVOH)*actUnits)}${numCell(budgVOH*actUnits)}${varCell(-(budgVOH*actUnits-budgVOH*budgUnits))}${numCell(budgVOH*budgUnits)}
          </tr>
          <tr style="font-weight:600"><td>Total Variable Costs</td>${numCell(actVC)}${varCell(-fbvVC)}${numCell(fbVC)}${varCell(-svvVC)}${numCell(sbVC)}</tr>
          <tr style="font-weight:600"><td>Contribution Margin</td>${numCell(actCM)}${varCell(fbvCM,true)}${numCell(fbCM)}${varCell(svvCM,true)}${numCell(sbCM)}</tr>
          <tr><td>Fixed Costs</td>${numCell(actFC)}${varCell(-(actFC-budgFC))}
            <td style="text-align:right;font-family:var(--font-mono)">${fmt(budgFC)}</td>
            <td style="text-align:right;color:var(--color-text-muted)">0</td>
            ${numCell(budgFC)}
          </tr>
          <tr style="font-weight:700;border-top:2px solid var(--color-border)">
            <td>Operating Income</td>${numCell(actOI)}${varCell(fbvOI,true)}${numCell(fbOI)}${varCell(svvOI,true)}${numCell(sbOI)}
          </tr>
        </tbody>
      </table>
    </div>
    <div class="var-summary-row">
      <div class="var-summary-box ${fbvOI>=0?'var-summary-box--fav':'var-summary-box--unfav'}">
        <div class="var-summary-box__label">Flexible-Budget Variance</div>
        <div class="var-summary-box__value">${fmt(fbvOI)} ${fbvOI>=0?'F':'U'}</div>
        <div class="var-summary-box__sub">Performance vs. flexible budget</div>
      </div>
      <div class="var-summary-box ${svvOI>=0?'var-summary-box--fav':'var-summary-box--unfav'}">
        <div class="var-summary-box__label">Sales-Volume Variance</div>
        <div class="var-summary-box__value">${fmt(svvOI)} ${svvOI>=0?'F':'U'}</div>
        <div class="var-summary-box__sub">Effect of selling ${Math.abs(actUnits-budgUnits).toLocaleString()} ${actUnits<budgUnits?'fewer':'more'} units</div>
      </div>
      <div class="var-summary-box ${svOI>=0?'var-summary-box--fav':'var-summary-box--unfav'}">
        <div class="var-summary-box__label">Static-Budget Variance</div>
        <div class="var-summary-box__value">${fmt(svOI)} ${svOI>=0?'F':'U'}</div>
        <div class="var-summary-box__sub">Total difference from plan</div>
      </div>
    </div>
    <div class="sensitivity-insight" style="margin-top:var(--space-4)">
      <strong>Selling-price variance:</strong> ${fmt(spv)} ${spv>=0?'F':'U'} --
      actual price of ${fmt(actPrice)}/unit vs. budgeted ${fmt(budgPrice)}/unit on ${actUnits.toLocaleString()} units sold.
    </div>
  `;

  resultsEl.innerHTML = tableHTML;

  const sw = getOrCreate('va-show-work', 'div', '', resultsEl);
  renderShowWork(sw, [
    {
      label:   'Flexible Budget Revenue',
      formula: 'Flex Rev = Budgeted Price x Actual Units',
      values:  `${fmt(budgPrice)}/unit x ${actUnits.toLocaleString()} units`,
      result:  fmt(fbRev),
    },
    {
      label:   'Flexible-Budget Variance for OI',
      formula: 'FBV = Actual OI - Flexible Budget OI',
      values:  `${fmt(actOI)} - ${fmt(fbOI)}`,
      result:  `${fmt(fbvOI)} ${fbvOI>=0?'F':'U'}`,
      highlight: true,
    },
    {
      label:   'Sales-Volume Variance for OI',
      formula: 'SVV = Flexible Budget OI - Static Budget OI',
      values:  `${fmt(fbOI)} - ${fmt(sbOI)}`,
      result:  `${fmt(svvOI)} ${svvOI>=0?'F':'U'}`,
      highlight: true,
    },
    {
      label:   'Static-Budget Variance for OI',
      formula: 'SBV = FBV + SVV',
      values:  `${fmt(fbvOI)} ${fbvOI>=0?'F':'U'} + ${fmt(svvOI)} ${svvOI>=0?'F':'U'}`,
      result:  `${fmt(svOI)} ${svOI>=0?'F':'U'}`,
      highlight: true,
      note:    'The static-budget variance always equals the sum of the flexible-budget variance and the sales-volume variance.',
    },
    {
      label:   'Selling-Price Variance',
      formula: 'SPV = (Actual Price - Budgeted Price) x Actual Units',
      values:  `(${fmt(actPrice)} - ${fmt(budgPrice)}) x ${actUnits.toLocaleString()}`,
      result:  `${fmt(spv)} ${spv>=0?'F':'U'}`,
      note:    'The selling-price variance is the flexible-budget variance for revenues only.',
    },
  ], { title: 'Show Work -- Static vs. Flexible Budget' });
}

// ── Tool 2: Direct-Cost Variance Calculator ───────────────────

function initDVCalc() {
  const calcBtn   = document.getElementById('dv-calculate');
  const resultsEl = document.getElementById('dv-results');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => calculateDV(resultsEl));

  initRandomizer('dv-randomize', [
    { id: 'dv-dm-std-qty',      min: 1,     max: 20,    step: 0.5,  integer: false },
    { id: 'dv-dm-std-price',    min: 5,     max: 80,    step: 1,    integer: true  },
    { id: 'dv-dm-act-units',    min: 1000,  max: 50000, step: 1000, integer: true  },
    { id: 'dv-dm-act-purchased',min: 1000,  max: 200000,step: 1000, integer: true  },
    { id: 'dv-dm-act-used',     min: 1000,  max: 200000,step: 1000, integer: true  },
    { id: 'dv-dm-act-price',    min: 3,     max: 90,    step: 1,    integer: true  },
    { id: 'dv-dl-std-hrs',      min: 0.25,  max: 5,     step: 0.25, integer: false },
    { id: 'dv-dl-std-rate',     min: 10,    max: 50,    step: 1,    integer: true  },
    { id: 'dv-dl-act-hrs',      min: 500,   max: 100000,step: 500,  integer: true  },
    { id: 'dv-dl-act-rate',     min: 8,     max: 60,    step: 1,    integer: true  },
  ], () => calculateDV(resultsEl));
}

function calculateDV(resultsEl) {
  const dmStdQty   = gv('dv-dm-std-qty');
  const dmStdPrice = gv('dv-dm-std-price');
  const dmActUnits = gv('dv-dm-act-units');
  const dmPurchased= gv('dv-dm-act-purchased');
  const dmUsed     = gv('dv-dm-act-used');
  const dmActPrice = gv('dv-dm-act-price');

  const dlStdHrs   = gv('dv-dl-std-hrs');
  const dlStdRate  = gv('dv-dl-std-rate');
  const dlActUnits = gv('dv-dl-act-units');
  const dlActHrs   = gv('dv-dl-act-hrs');
  const dlActRate  = gv('dv-dl-act-rate');

  // DM calculations
  const dmBudgQtyAllowed = dmStdQty * dmActUnits;
  const dmCol1Purchase   = dmPurchased * dmActPrice;
  const dmCol2Purchase   = dmPurchased * dmStdPrice;
  const dmCol1Used       = dmUsed      * dmActPrice;
  const dmCol2Used       = dmUsed      * dmStdPrice;
  const dmCol3           = dmBudgQtyAllowed * dmStdPrice;

  const dmPriceVar       = dmCol2Purchase - dmCol1Purchase;
  const dmEffVar         = dmCol3 - dmCol2Used;
  const dmFBVar          = dmCol3 - dmCol1Used;

  // DL calculations
  const dlBudgHrsAllowed = dlStdHrs * dlActUnits;
  const dlCol1           = dlActHrs * dlActRate;
  const dlCol2           = dlActHrs * dlStdRate;
  const dlCol3           = dlBudgHrsAllowed * dlStdRate;

  const dlPriceVar       = dlCol2 - dlCol1;
  const dlEffVar         = dlCol3 - dlCol2;
  const dlFBVar          = dlCol3 - dlCol1;

  dvResults = {
    dmPriceVar, dmEffVar, dmFBVar,
    dlPriceVar, dlEffVar, dlFBVar,
    dmStdQty, dmStdPrice, dmActUnits, dmPurchased, dmUsed, dmActPrice,
    dlStdHrs, dlStdRate, dlActUnits, dlActHrs, dlActRate,
  };
  try {
    const stored = JSON.parse(sessionStorage.getItem('ch7-var-results') || '{}');
    stored.dmPriceVar = dmPriceVar; stored.dmEffVar = dmEffVar; stored.dmFBVar = dmFBVar;
    stored.dlPriceVar = dlPriceVar; stored.dlEffVar = dlEffVar; stored.dlFBVar = dlFBVar;
    sessionStorage.setItem('ch7-var-results', JSON.stringify(stored));
  } catch {}

  const varSpan = (v) => {
    const color = v > 0 ? 'var(--color-success)' : v < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)';
    const label = v > 0 ? 'F' : v < 0 ? 'U' : '';
    return `<span style="color:${color};font-weight:700">${fmt(v)} ${label}</span>`;
  };

  resultsEl.innerHTML = `
    <div class="dv-columnar">
      <h4 style="margin:var(--space-6) 0 var(--space-4);font-size:var(--font-size-sm);font-weight:700;">Direct Materials -- Level 3 Analysis</h4>
      <div class="dv-col-table">
        <div class="dv-col-header">
          <div>Actual Costs<br><small>Actual Qty Purchased x Actual Price</small></div>
          <div>Actual Qty Purchased x Budgeted Price</div>
          <div>Actual Qty Used x Budgeted Price</div>
          <div>Flexible Budget<br><small>Budgeted Qty Allowed x Budgeted Price</small></div>
        </div>
        <div class="dv-col-values">
          <div class="dv-col-val">${fmt(dmCol1Purchase)}<br><small>${dmPurchased.toLocaleString()} x ${fmt(dmActPrice)}</small></div>
          <div class="dv-col-val">${fmt(dmCol2Purchase)}<br><small>${dmPurchased.toLocaleString()} x ${fmt(dmStdPrice)}</small></div>
          <div class="dv-col-val">${fmt(dmCol2Used)}<br><small>${dmUsed.toLocaleString()} x ${fmt(dmStdPrice)}</small></div>
          <div class="dv-col-val">${fmt(dmCol3)}<br><small>${dmBudgQtyAllowed.toLocaleString()} x ${fmt(dmStdPrice)}</small></div>
        </div>
        <div class="dv-col-variances">
          <div class="dv-col-var">${varSpan(dmPriceVar)}<br><small>Price Variance<br>(on purchases)</small></div>
          <div class="dv-col-var dv-col-var--skip"></div>
          <div class="dv-col-var">${varSpan(dmEffVar)}<br><small>Efficiency Variance<br>(on usage)</small></div>
          <div></div>
        </div>
        <div class="dv-col-fb-var">
          <div class="dv-col-var">${varSpan(dmFBVar)}<br><small>Flexible-Budget Variance</small></div>
        </div>
      </div>

      <h4 style="margin:var(--space-6) 0 var(--space-4);font-size:var(--font-size-sm);font-weight:700;">Direct Manufacturing Labor -- Level 3 Analysis</h4>
      <div class="dv-col-table">
        <div class="dv-col-header">
          <div>Actual Costs<br><small>Actual Hours x Actual Rate</small></div>
          <div>Actual Hours x Budgeted Rate</div>
          <div class="dv-col-header--skip"></div>
          <div>Flexible Budget<br><small>Budgeted Hours Allowed x Budgeted Rate</small></div>
        </div>
        <div class="dv-col-values">
          <div class="dv-col-val">${fmt(dlCol1)}<br><small>${dlActHrs.toLocaleString()} x ${fmt(dlActRate)}/hr</small></div>
          <div class="dv-col-val">${fmt(dlCol2)}<br><small>${dlActHrs.toLocaleString()} x ${fmt(dlStdRate)}/hr</small></div>
          <div class="dv-col-val dv-col-val--skip"></div>
          <div class="dv-col-val">${fmt(dlCol3)}<br><small>${dlBudgHrsAllowed.toLocaleString()} x ${fmt(dlStdRate)}/hr</small></div>
        </div>
        <div class="dv-col-variances">
          <div class="dv-col-var">${varSpan(dlPriceVar)}<br><small>Price (Rate) Variance</small></div>
          <div class="dv-col-var dv-col-var--skip"></div>
          <div class="dv-col-var">${varSpan(dlEffVar)}<br><small>Efficiency Variance</small></div>
          <div></div>
        </div>
        <div class="dv-col-fb-var">
          <div class="dv-col-var">${varSpan(dlFBVar)}<br><small>Flexible-Budget Variance</small></div>
        </div>
      </div>
    </div>
  `;

  const sw = getOrCreate('dv-show-work', 'div', '', resultsEl);
  renderShowWork(sw, [
    {
      label:   'DM Price Variance',
      formula: 'Price Var = (Actual Price - Budgeted Price) x Actual Qty Purchased',
      values:  `(${fmt(dmActPrice)} - ${fmt(dmStdPrice)}) x ${dmPurchased.toLocaleString()}`,
      result:  `${fmt(dmPriceVar)} ${dmPriceVar>=0?'F':'U'}`,
      highlight: dmPriceVar !== 0,
    },
    {
      label:   'DM Efficiency Variance',
      formula: 'Eff Var = (Budgeted Qty Allowed - Actual Qty Used) x Budgeted Price',
      values:  `(${dmBudgQtyAllowed.toLocaleString()} - ${dmUsed.toLocaleString()}) x ${fmt(dmStdPrice)}`,
      result:  `${fmt(dmEffVar)} ${dmEffVar>=0?'F':'U'}`,
      highlight: dmEffVar !== 0,
      note:    dmPurchased !== dmUsed ? 'Note: Qty purchased differs from qty used. Price variance is based on purchases (earliest control point); efficiency variance is based on usage.' : '',
    },
    {
      label:   'DL Price (Rate) Variance',
      formula: 'Price Var = (Actual Rate - Budgeted Rate) x Actual Hours',
      values:  `(${fmt(dlActRate)} - ${fmt(dlStdRate)}) x ${dlActHrs.toLocaleString()}`,
      result:  `${fmt(dlPriceVar)} ${dlPriceVar>=0?'F':'U'}`,
      highlight: dlPriceVar !== 0,
    },
    {
      label:   'DL Efficiency Variance',
      formula: 'Eff Var = (Budgeted Hours Allowed - Actual Hours) x Budgeted Rate',
      values:  `(${dlBudgHrsAllowed.toLocaleString()} - ${dlActHrs.toLocaleString()}) x ${fmt(dlStdRate)}`,
      result:  `${fmt(dlEffVar)} ${dlEffVar>=0?'F':'U'}`,
      highlight: dlEffVar !== 0,
      note:    'Budgeted hours allowed = Standard hours per unit x Actual units produced = ' + dlStdHrs + ' x ' + dlActUnits.toLocaleString() + ' = ' + dlBudgHrsAllowed.toLocaleString() + ' hours.',
    },
  ], { title: 'Show Work -- Direct-Cost Variances' });
}

// ── Tool 3: Variance Hierarchy Diagram ───────────────────────

function initVHDiagram() {
  const buildBtn = document.getElementById('vh-build');
  const diagramEl= document.getElementById('vh-diagram');
  if (!buildBtn) return;

  buildBtn.addEventListener('click', () => buildVHDiagram(diagramEl));
}

function buildVHDiagram(diagramEl) {
  const va = vaResults;
  const dv = dvResults;

  if (!va) {
    diagramEl.innerHTML = '<p style="padding:var(--space-4);color:var(--color-warning)">Run Tool 1 first to populate budget variances.</p>';
    return;
  }

  const varColor = v => v > 0 ? 'var(--color-success)' : v < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)';
  const varLabel = v => v > 0 ? 'F' : v < 0 ? 'U' : '';
  const varBox   = (label, value, note='', isPlaceholder=false) => {
    if (isPlaceholder) {
      return `<div class="vh-node vh-node--placeholder">
        <div class="vh-node__label">${label}</div>
        <div class="vh-node__value" style="color:var(--color-text-muted);font-size:var(--font-size-xs)">See Ch. 8</div>
        ${note ? `<div class="vh-node__note">${note}</div>` : ''}
      </div>`;
    }
    const color = varColor(value);
    return `<div class="vh-node" style="border-color:${color}">
      <div class="vh-node__label">${label}</div>
      <div class="vh-node__value" style="color:${color}">${fmt(value)} ${varLabel(value)}</div>
      ${note ? `<div class="vh-node__note">${note}</div>` : ''}
    </div>`;
  };

  const dmPV  = dv ? dv.dmPriceVar : null;
  const dmEV  = dv ? dv.dmEffVar   : null;
  const dlPV  = dv ? dv.dlPriceVar : null;
  const dlEV  = dv ? dv.dlEffVar   : null;
  const dmFBV = dv ? dv.dmFBVar    : null;
  const dlFBV = dv ? dv.dlFBVar    : null;

  const spvFBV  = va.spv;
  const fcFBV   = -(va.actFC - va.budgFC);
  const vohFBV  = -(gv('va-act-voh') - gv('va-budg-voh')) * va.actUnits;

  diagramEl.innerHTML = `
    <div class="vh-diagram">

      <div class="vh-level vh-level--1">
        <div class="vh-node vh-node--level1" style="border-color:${varColor(va.svOI)}">
          <div class="vh-node__label">Static-Budget Variance<br>for Operating Income</div>
          <div class="vh-node__value" style="color:${varColor(va.svOI)}">${fmt(va.svOI)} ${varLabel(va.svOI)}</div>
          <div class="vh-node__note">Level 1</div>
        </div>
      </div>

      <div class="vh-connector vh-connector--split"></div>

      <div class="vh-level vh-level--2">
        <div class="vh-node vh-node--level2" style="border-color:${varColor(va.fbvOI)}">
          <div class="vh-node__label">Flexible-Budget Variance</div>
          <div class="vh-node__value" style="color:${varColor(va.fbvOI)}">${fmt(va.fbvOI)} ${varLabel(va.fbvOI)}</div>
          <div class="vh-node__note">Level 2</div>
        </div>
        <div class="vh-node vh-node--level2" style="border-color:${varColor(va.svvOI)}">
          <div class="vh-node__label">Sales-Volume Variance</div>
          <div class="vh-node__value" style="color:${varColor(va.svvOI)}">${fmt(va.svvOI)} ${varLabel(va.svvOI)}</div>
          <div class="vh-node__note">Level 2</div>
        </div>
      </div>

      <div class="vh-connector vh-connector--wide"></div>

      <div class="vh-level vh-level--3">
        ${varBox('Selling-Price Variance', spvFBV, 'Revenue')}
        ${dmFBV !== null ? varBox('Direct Materials Variance', dmFBV, 'Variable Cost') : varBox('Direct Materials Variance', 0, 'Run Tool 2', false)}
        ${dlFBV !== null ? varBox('Direct Labor Variance', dlFBV, 'Variable Cost') : varBox('Direct Labor Variance', 0, 'Run Tool 2', false)}
        ${varBox('Variable OH Variance', vohFBV, 'Variable Cost')}
        ${varBox('Fixed OH Variance', fcFBV, 'Fixed Cost')}
      </div>

      ${dv ? `
      <div class="vh-connector vh-connector--narrow"></div>
      <div class="vh-level vh-level--4">
        ${varBox('DM Price Variance', dmPV)}
        ${varBox('DM Efficiency Variance', dmEV)}
        ${varBox('DL Price Variance', dlPV)}
        ${varBox('DL Efficiency Variance', dlEV)}
        <div class="vh-node vh-node--placeholder">
          <div class="vh-node__label">Variable OH<br>Spending Variance</div>
          <div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">See Ch. 8</div>
        </div>
        <div class="vh-node vh-node--placeholder">
          <div class="vh-node__label">Variable OH<br>Efficiency Variance</div>
          <div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">See Ch. 8</div>
        </div>
        <div class="vh-node vh-node--placeholder">
          <div class="vh-node__label">Fixed OH<br>Spending Variance</div>
          <div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">See Ch. 8</div>
        </div>
        <div class="vh-node vh-node--placeholder">
          <div class="vh-node__label">Production-Volume<br>Variance</div>
          <div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">See Ch. 8</div>
        </div>
      </div>
      ` : ''}

      <div class="vh-legend">
        <span class="vh-legend__item vh-legend__item--fav">Favorable (F) -- increases operating income</span>
        <span class="vh-legend__item vh-legend__item--unfav">Unfavorable (U) -- decreases operating income</span>
        <span class="vh-legend__item vh-legend__item--placeholder">Covered in Ch. 8</span>
      </div>
    </div>
  `;
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
  const statusEl  = document.getElementById('ch07-status');
  const actionsEl = btn?.closest('.chapter-complete__actions');
  if (isChapterComplete('ch07')) setCompleteUI();
  btn?.addEventListener('click', () => { markChapterComplete('ch07'); setCompleteUI(); });
  function setCompleteUI() {
    if (statusEl) { statusEl.textContent = '✓ Completed'; statusEl.classList.add('chapter-hero__progress-label--complete'); }
    if (btn)      { btn.textContent = '✓ Completed'; btn.disabled = true; }
    if (actionsEl && !actionsEl.querySelector('.reset-chapter-btn')) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn--ghost-danger reset-chapter-btn';
      resetBtn.textContent = 'Reset Chapter';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset Chapter 7? This will clear your completion status and reload the page.')) {
          resetChapter('ch07');
          window.location.reload();
        }
      });
      actionsEl.appendChild(resetBtn);
    }
  }
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initVarAnalyzer();
  initDVCalc();
  initVHDiagram();
  initKeyTerms();
  initChapterComplete();
});
