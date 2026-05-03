/**
 * ch08.js -- Chapter 8: Flexible Budgets, Overhead Cost Variances, and Management Control
 * Tools: Overhead Rate Developer, 4-Variance Overhead Analyzer, Complete Variance Hierarchy
 */
import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';

// ── Shared state ──────────────────────────────────────────────
let ohrResults  = null;
let ohvResults  = null;
let ch7Imported = null;

const fmt    = n => '$' + Math.round(Math.abs(n)).toLocaleString();
const fmtDec = (n, d=2) => '$' + Math.abs(n).toFixed(d);
const gv     = id => parseFloat(document.getElementById(id)?.value) || 0;

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

const varColor = v => v > 0 ? 'var(--color-success)' : v < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)';
const varLabel = v => v > 0 ? 'F' : v < 0 ? 'U' : '';
const varSpan  = v => {
  const color = varColor(v);
  const label = varLabel(v);
  return `<span style="color:${color};font-weight:700">${fmt(v)} ${label}</span>`;
};

// ── Key Terms ─────────────────────────────────────────────────
const KEY_TERMS = [
  { term: 'Variable Overhead Flexible-Budget Variance', definition: 'The difference between actual variable overhead costs incurred and flexible-budget variable overhead amounts. Equals the sum of the spending variance and efficiency variance.' },
  { term: 'Variable Overhead Spending Variance', definition: 'The difference between the actual variable overhead cost per unit of the cost-allocation base and the budgeted variable overhead cost per unit, multiplied by the actual quantity of the cost-allocation base used.' },
  { term: 'Variable Overhead Efficiency Variance', definition: 'The difference between the actual quantity of the cost-allocation base used and the budgeted quantity allowed for actual output, multiplied by the budgeted variable overhead cost per unit of the base.' },
  { term: 'Fixed Overhead Flexible-Budget Variance', definition: 'The difference between actual fixed overhead costs and fixed overhead costs in the flexible budget. For fixed overhead, this equals the spending variance because there is no efficiency variance.' },
  { term: 'Fixed Overhead Spending Variance', definition: 'Same as the fixed overhead flexible-budget variance. The difference between actual fixed overhead costs and budgeted fixed overhead costs.' },
  { term: 'Production-Volume Variance', definition: 'Also called the denominator-level variance. The difference between budgeted fixed overhead and fixed overhead allocated on the basis of actual output produced. Arises only for fixed costs.' },
  { term: 'Denominator Level', definition: 'The quantity of the cost-allocation base used to calculate the budgeted fixed overhead cost rate. Typically the budgeted output level for the period.' },
  { term: '4-Variance Analysis', definition: 'The most detailed overhead variance analysis: variable OH spending variance, variable OH efficiency variance, fixed OH spending variance, and fixed OH production-volume variance.' },
  { term: 'Standard Costing', definition: 'A costing system that traces direct costs to output using standard prices times standard quantities, and allocates overhead using standard overhead cost rates times standard quantities of the allocation base allowed for actual output.' },
  { term: 'Total-Overhead Variance', definition: 'The difference between total actual overhead incurred and total overhead allocated to actual output. Equals the sum of all four variances in the 4-variance analysis.' },
  { term: 'Operating-Income Volume Variance', definition: 'The difference between the static-budget operating income and the budgeted operating income for the actual units produced. Together with the production-volume variance, it comprises the sales-volume variance.' },
  { term: 'Underallocated Overhead', definition: 'Occurs when actual overhead costs exceed allocated overhead costs. The total of underallocated variable and fixed overhead equals the total-overhead variance when unfavorable.' },
];

// ── Tool 1: Overhead Rate Developer ──────────────────────────

function initOHRateDev() {
  const calcBtn   = document.getElementById('ohrate-calculate');
  const resultsEl = document.getElementById('ohrate-results');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => calculateOHRate(resultsEl));

  initRandomizer('ohrate-randomize', [
    { id: 'ohr-budg-units', min: 10000,   max: 500000,  step: 10000, integer: true },
    { id: 'ohr-std-hrs',    min: 0.1,     max: 3,       step: 0.05,  integer: false },
    { id: 'ohr-budg-voh',   min: 100000,  max: 5000000, step: 50000, integer: true },
    { id: 'ohr-budg-foh',   min: 100000,  max: 8000000, step: 50000, integer: true },
  ], () => calculateOHRate(resultsEl));
}

function calculateOHRate(resultsEl) {
  const budgUnits = gv('ohr-budg-units');
  const stdHrs    = gv('ohr-std-hrs');
  const budgVOH   = gv('ohr-budg-voh');
  const budgFOH   = gv('ohr-budg-foh');

  const denomHrs      = budgUnits * stdHrs;
  const vohRatePerHr  = denomHrs > 0 ? budgVOH / denomHrs : 0;
  const fohRatePerHr  = denomHrs > 0 ? budgFOH / denomHrs : 0;
  const vohRatePerUnit= stdHrs * vohRatePerHr;
  const fohRatePerUnit= stdHrs * fohRatePerHr;

  ohrResults = { budgUnits, stdHrs, budgVOH, budgFOH, denomHrs, vohRatePerHr, fohRatePerHr, vohRatePerUnit, fohRatePerUnit };

  resultsEl.innerHTML = `
    <div class="ohrate-steps">
      <div class="ohrate-step">
        <div class="ohrate-step__num">Step 1</div>
        <div class="ohrate-step__content">
          <div class="ohrate-step__label">Choose Budget Period</div>
          <div class="ohrate-step__value">Annual (12 months)</div>
        </div>
      </div>
      <div class="ohrate-step">
        <div class="ohrate-step__num">Step 2</div>
        <div class="ohrate-step__content">
          <div class="ohrate-step__label">Denominator Level (total budgeted hours)</div>
          <div class="ohrate-step__value">${budgUnits.toLocaleString()} units x ${stdHrs} hrs/unit = <strong>${denomHrs.toLocaleString()} machine-hours</strong></div>
        </div>
      </div>
      <div class="ohrate-step">
        <div class="ohrate-step__num">Step 3</div>
        <div class="ohrate-step__content">
          <div class="ohrate-step__label">Identify Overhead Costs</div>
          <div class="ohrate-step__value">Variable OH: ${fmt(budgVOH)}  |  Fixed OH: ${fmt(budgFOH)}</div>
        </div>
      </div>
      <div class="ohrate-step ohrate-step--highlight">
        <div class="ohrate-step__num">Step 4</div>
        <div class="ohrate-step__content">
          <div class="ohrate-step__label">Compute Rates</div>
          <div class="ohrate-rates-grid">
            <div class="ohrate-rate-card">
              <div class="ohrate-rate-card__label">Variable OH Rate / Hour</div>
              <div class="ohrate-rate-card__value">${fmtDec(vohRatePerHr)}/hr</div>
              <div class="ohrate-rate-card__sub">${fmt(budgVOH)} / ${denomHrs.toLocaleString()} hrs</div>
            </div>
            <div class="ohrate-rate-card">
              <div class="ohrate-rate-card__label">Variable OH Rate / Unit</div>
              <div class="ohrate-rate-card__value">${fmtDec(vohRatePerUnit)}/unit</div>
              <div class="ohrate-rate-card__sub">${stdHrs} hrs x ${fmtDec(vohRatePerHr)}/hr</div>
            </div>
            <div class="ohrate-rate-card">
              <div class="ohrate-rate-card__label">Fixed OH Rate / Hour</div>
              <div class="ohrate-rate-card__value">${fmtDec(fohRatePerHr)}/hr</div>
              <div class="ohrate-rate-card__sub">${fmt(budgFOH)} / ${denomHrs.toLocaleString()} hrs</div>
            </div>
            <div class="ohrate-rate-card">
              <div class="ohrate-rate-card__label">Fixed OH Rate / Unit</div>
              <div class="ohrate-rate-card__value">${fmtDec(fohRatePerUnit)}/unit</div>
              <div class="ohrate-rate-card__sub">${stdHrs} hrs x ${fmtDec(fohRatePerHr)}/hr</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const sw = getOrCreate('ohrate-show-work', 'div', '', resultsEl);
  renderShowWork(sw, [
    {
      label:   'Denominator Level',
      formula: 'Denominator Hours = Budgeted Units x Standard Hours per Unit',
      values:  `${budgUnits.toLocaleString()} x ${stdHrs}`,
      result:  denomHrs.toLocaleString() + ' machine-hours',
    },
    {
      label:   'Variable OH Rate per Hour',
      formula: 'VOH Rate = Budgeted Variable OH / Denominator Hours',
      values:  `${fmt(budgVOH)} / ${denomHrs.toLocaleString()}`,
      result:  fmtDec(vohRatePerHr) + '/hr',
      highlight: true,
    },
    {
      label:   'Fixed OH Rate per Hour',
      formula: 'FOH Rate = Budgeted Fixed OH / Denominator Hours',
      values:  `${fmt(budgFOH)} / ${denomHrs.toLocaleString()}`,
      result:  fmtDec(fohRatePerHr) + '/hr',
      highlight: true,
    },
    {
      label:   'Variable OH Rate per Output Unit',
      formula: 'VOH/unit = Standard Hours/unit x VOH Rate/hr',
      values:  `${stdHrs} x ${fmtDec(vohRatePerHr)}`,
      result:  fmtDec(vohRatePerUnit) + '/unit',
      note:    'This is the amount added to WIP for variable overhead for each unit produced.',
    },
    {
      label:   'Fixed OH Rate per Output Unit',
      formula: 'FOH/unit = Standard Hours/unit x FOH Rate/hr',
      values:  `${stdHrs} x ${fmtDec(fohRatePerHr)}`,
      result:  fmtDec(fohRatePerUnit) + '/unit',
      note:    'Fixed costs are unitized for inventory costing -- but remember they behave as a lump sum for planning and control.',
    },
  ], { title: 'Show Work -- Overhead Rate Development' });
}

// ── Tool 2: 4-Variance Overhead Analyzer ─────────────────────

function initOHVarAnalyzer() {
  const calcBtn   = document.getElementById('ohvar-calculate');
  const pullBtn   = document.getElementById('ohvar-pull-btn');
  const resultsEl = document.getElementById('ohvar-results');
  if (!calcBtn) return;

  pullBtn?.addEventListener('click', () => {
    if (!ohrResults) {
      alert('Run Tool 1 first to develop overhead rates.');
      return;
    }
    const r = ohrResults;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('ohv-budg-voh-rate',  r.vohRatePerHr.toFixed(2));
    setVal('ohv-budg-foh-rate',  r.fohRatePerHr.toFixed(2));
    setVal('ohv-std-hrs',        r.stdHrs);
    setVal('ohv-denom-hrs',      r.denomHrs);
    setVal('ohv-budg-foh-total', Math.round(r.budgFOH / 12));
  });

  calcBtn.addEventListener('click', () => calculateOHVar(resultsEl));

  initRandomizer('ohvar-randomize', [
    { id: 'ohv-act-units',    min: 1000,   max: 50000,  step: 1000, integer: true },
    { id: 'ohv-act-hrs',      min: 100,    max: 100000, step: 500,  integer: true },
    { id: 'ohv-act-voh',      min: 10000,  max: 500000, step: 5000, integer: true },
    { id: 'ohv-act-foh',      min: 50000,  max: 1000000,step: 10000,integer: true },
  ], () => calculateOHVar(resultsEl));
}

function calculateOHVar(resultsEl) {
  const budgVOHRate  = gv('ohv-budg-voh-rate');
  const budgFOHRate  = gv('ohv-budg-foh-rate');
  const stdHrs       = gv('ohv-std-hrs');
  const denomHrs     = gv('ohv-denom-hrs');
  const budgFOHTotal = gv('ohv-budg-foh-total');
  const actUnits     = gv('ohv-act-units');
  const actHrs       = gv('ohv-act-hrs');
  const actVOH       = gv('ohv-act-voh');
  const actFOH       = gv('ohv-act-foh');

  const budgHrsAllowed = stdHrs * actUnits;

  // Panel A: Variable OH
  const vohCol1 = actVOH;
  const vohCol2 = actHrs * budgVOHRate;
  const vohCol3 = budgHrsAllowed * budgVOHRate;
  const vohCol4 = vohCol3;

  const vohSpending  = vohCol2 - vohCol1;
  const vohEfficiency= vohCol3 - vohCol2;
  const vohFBVar     = vohCol3 - vohCol1;
  const vohUnderOver = vohCol4 - vohCol1;

  // Panel B: Fixed OH
  const fohCol1 = actFOH;
  const fohCol2 = budgFOHTotal;
  const fohCol3 = budgFOHTotal;
  const fohCol4 = budgHrsAllowed * budgFOHRate;

  const fohSpending  = fohCol2 - fohCol1;
  const fohProdVol   = fohCol4 - fohCol3;
  const fohFBVar     = fohCol2 - fohCol1;
  const fohUnderOver = fohCol4 - fohCol1;

  const totalUnderOver = vohUnderOver + fohUnderOver;

  ohvResults = {
    budgVOHRate, budgFOHRate, stdHrs, denomHrs, budgFOHTotal,
    actUnits, actHrs, actVOH, actFOH, budgHrsAllowed,
    vohSpending, vohEfficiency, vohFBVar, vohUnderOver,
    fohSpending, fohProdVol, fohFBVar, fohUnderOver,
    totalUnderOver,
    vohCol1, vohCol2, vohCol3,
    fohCol1, fohCol2, fohCol4,
  };

  const colCell = (val, sub) => `
    <div class="ohv-col-cell">
      <div class="ohv-col-val">${fmt(val)}</div>
      <div class="ohv-col-sub">${sub}</div>
    </div>`;

  const varRow = (label, val, note='') => `
    <div class="ohv-var-row">
      <div class="ohv-var-row__val" style="color:${varColor(val)};font-weight:700">${fmt(val)} ${varLabel(val)}</div>
      <div class="ohv-var-row__label">${label}</div>
      ${note ? `<div class="ohv-var-row__note">${note}</div>` : ''}
    </div>`;

  resultsEl.innerHTML = `
    <div class="ohv-panels">

      <div class="ohv-panel">
        <div class="ohv-panel__title">Panel A: Variable Manufacturing Overhead</div>
        <div class="ohv-col-grid ohv-col-grid--4">
          ${colCell(vohCol1, `Actual: ${actHrs.toLocaleString()} hrs x actual rate`)}
          ${colCell(vohCol2, `${actHrs.toLocaleString()} hrs x ${fmtDec(budgVOHRate)}/hr`)}
          ${colCell(vohCol3, `${budgHrsAllowed.toLocaleString()} hrs x ${fmtDec(budgVOHRate)}/hr`)}
          ${colCell(vohCol4, `Same as Col 3 (never a variance)`)}
        </div>
        <div class="ohv-var-grid">
          ${varRow('Spending Variance', vohSpending, 'Cols 1-2: actual rate vs. budgeted rate')}
          <div class="ohv-var-never">Never a variance</div>
          ${varRow('Efficiency Variance', vohEfficiency, 'Cols 2-3: actual hours vs. budgeted hours')}
          <div></div>
        </div>
        <div class="ohv-fb-row">
          ${varRow('Flexible-Budget Variance', vohFBVar)}
          <div class="ohv-var-never">Never a variance</div>
        </div>
        <div class="ohv-total-row">
          <strong>${fmt(vohUnderOver)} ${varLabel(vohUnderOver)}</strong>
          <span style="color:var(--color-text-muted);font-size:var(--font-size-xs)">
            ${vohUnderOver < 0 ? 'Underallocated' : 'Overallocated'} Variable OH
          </span>
        </div>
      </div>

      <div class="ohv-panel">
        <div class="ohv-panel__title">Panel B: Fixed Manufacturing Overhead</div>
        <div class="ohv-col-grid ohv-col-grid--4">
          ${colCell(fohCol1, 'Actual fixed OH incurred')}
          ${colCell(fohCol2, `Budgeted lump sum (same as static budget)`)}
          ${colCell(fohCol3, `Same budgeted lump sum`)}
          ${colCell(fohCol4, `${budgHrsAllowed.toLocaleString()} hrs x ${fmtDec(budgFOHRate)}/hr`)}
        </div>
        <div class="ohv-var-grid">
          ${varRow('Spending Variance', fohSpending, 'Cols 1-2: actual vs. budgeted fixed OH')}
          <div class="ohv-var-never">Never a variance</div>
          <div class="ohv-var-never">Never a variance</div>
          ${varRow('Production-Volume Variance', fohProdVol, 'Cols 3-4: budgeted vs. allocated fixed OH')}
        </div>
        <div class="ohv-fb-row">
          ${varRow('Flexible-Budget Variance', fohFBVar)}
          ${varRow('Production-Volume Variance', fohProdVol)}
        </div>
        <div class="ohv-total-row">
          <strong>${fmt(fohUnderOver)} ${varLabel(fohUnderOver)}</strong>
          <span style="color:var(--color-text-muted);font-size:var(--font-size-xs)">
            ${fohUnderOver < 0 ? 'Underallocated' : 'Overallocated'} Fixed OH
          </span>
        </div>
      </div>

    </div>

    <div class="ohv-summary-table">
      <h4 style="margin-bottom:var(--space-4);font-size:var(--font-size-sm);font-weight:700;">4-Variance Analysis Summary</h4>
      <table class="data-table">
        <thead><tr><th></th><th class="num">Spending Variance</th><th class="num">Efficiency Variance</th><th class="num">Production-Volume Variance</th></tr></thead>
        <tbody>
          <tr>
            <td>Variable Overhead</td>
            <td style="text-align:right;color:${varColor(vohSpending)};font-weight:600">${fmt(vohSpending)} ${varLabel(vohSpending)}</td>
            <td style="text-align:right;color:${varColor(vohEfficiency)};font-weight:600">${fmt(vohEfficiency)} ${varLabel(vohEfficiency)}</td>
            <td style="text-align:right;color:var(--color-text-muted)">Never a variance</td>
          </tr>
          <tr>
            <td>Fixed Overhead</td>
            <td style="text-align:right;color:${varColor(fohSpending)};font-weight:600">${fmt(fohSpending)} ${varLabel(fohSpending)}</td>
            <td style="text-align:right;color:var(--color-text-muted)">Never a variance</td>
            <td style="text-align:right;color:${varColor(fohProdVol)};font-weight:600">${fmt(fohProdVol)} ${varLabel(fohProdVol)}</td>
          </tr>
          <tr style="font-weight:700;border-top:2px solid var(--color-border)">
            <td>Total Overhead Variance</td>
            <td colspan="3" style="text-align:right;color:${varColor(totalUnderOver)}">${fmt(totalUnderOver)} ${varLabel(totalUnderOver)} (${totalUnderOver<0?'Underallocated':'Overallocated'})</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const sw = getOrCreate('ohvar-show-work', 'div', '', resultsEl);
  renderShowWork(sw, [
    {
      label:   'Budgeted Hours Allowed for Actual Output',
      formula: 'Budgeted Hrs = Standard Hrs/unit x Actual Units',
      values:  `${stdHrs} x ${actUnits.toLocaleString()}`,
      result:  budgHrsAllowed.toLocaleString() + ' hours',
    },
    {
      label:   'Variable OH Spending Variance',
      formula: 'VOH Spending = (Actual Rate - Budgeted Rate) x Actual Hours',
      values:  `Actual OH ${fmt(actVOH)} vs. ${actHrs.toLocaleString()} hrs x ${fmtDec(budgVOHRate)}/hr = ${fmt(vohCol2)}`,
      result:  `${fmt(vohSpending)} ${varLabel(vohSpending)}`,
      highlight: vohSpending !== 0,
      note:    'Favorable if actual variable OH cost per hour is less than budgeted.',
    },
    {
      label:   'Variable OH Efficiency Variance',
      formula: 'VOH Efficiency = (Budgeted Hrs Allowed - Actual Hrs) x Budgeted Rate',
      values:  `(${budgHrsAllowed.toLocaleString()} - ${actHrs.toLocaleString()}) x ${fmtDec(budgVOHRate)}`,
      result:  `${fmt(vohEfficiency)} ${varLabel(vohEfficiency)}`,
      highlight: vohEfficiency !== 0,
      note:    'Driven by the same factors as the direct labor efficiency variance -- if more hours are used than budgeted, variable OH efficiency is unfavorable.',
    },
    {
      label:   'Fixed OH Spending Variance',
      formula: 'FOH Spending = Budgeted Fixed OH - Actual Fixed OH',
      values:  `${fmt(budgFOHTotal)} - ${fmt(actFOH)}`,
      result:  `${fmt(fohSpending)} ${varLabel(fohSpending)}`,
      highlight: fohSpending !== 0,
    },
    {
      label:   'Production-Volume Variance',
      formula: 'PVV = Budgeted Fixed OH - Fixed OH Allocated',
      values:  `${fmt(budgFOHTotal)} - (${budgHrsAllowed.toLocaleString()} x ${fmtDec(budgFOHRate)})`,
      result:  `${fmt(fohProdVol)} ${varLabel(fohProdVol)}`,
      highlight: true,
      note:    fohProdVol < 0 ? 'Unfavorable: actual output was below budgeted output -- fixed overhead capacity was underutilized.' : 'Favorable: actual output exceeded budgeted output -- more fixed overhead was allocated than budgeted.',
    },
  ], { title: 'Show Work -- 4-Variance Overhead Analysis' });
}

// ── Tool 3: Complete Variance Hierarchy ───────────────────────

function initCompleteVH() {
  const buildBtn  = document.getElementById('ch8-build-diagram');
  const pullBtn   = document.getElementById('ch8-pull-ch7');
  const diagramEl = document.getElementById('ch8-vh-diagram');
  if (!buildBtn) return;

  pullBtn?.addEventListener('click', () => {
    const stored = sessionStorage.getItem('ch7-var-results');
    if (stored) {
      ch7Imported = JSON.parse(stored);
      pullBtn.textContent = '✓ Ch. 7 data imported';
      pullBtn.classList.add('btn--accent');
    } else {
      alert('No Ch. 7 data found. Complete Ch. 7 Tools 1 and 2 first, then return here.');
    }
  });

  buildBtn.addEventListener('click', () => buildCompleteVH(diagramEl));
}

function buildCompleteVH(diagramEl) {
  const ohv = ohvResults;

  if (!ohv) {
    diagramEl.innerHTML = '<p style="padding:var(--space-4);color:var(--color-warning)">Run Tool 2 first to populate overhead variances.</p>';
    return;
  }

  const ch7 = ch7Imported;

  const vNode = (label, value, level, note='', placeholder=false) => {
    if (placeholder) {
      return `<div class="vh-node vh-node--placeholder">
        <div class="vh-node__label">${label}</div>
        <div class="vh-node__value" style="color:var(--color-text-muted);font-size:var(--font-size-xs)">Run Ch. 7 Tools</div>
      </div>`;
    }
    const color = varColor(value);
    return `<div class="vh-node vh-node--level${level}" style="border-color:${color}">
      <div class="vh-node__label">${label}</div>
      <div class="vh-node__value" style="color:${color}">${fmt(value)} ${varLabel(value)}</div>
      ${note ? `<div class="vh-node__note">${note}</div>` : ''}
    </div>`;
  };

  const sbV   = ch7 ? ch7.svOI   : null;
  const fbV   = ch7 ? ch7.fbvOI  : null;
  const svV   = ch7 ? ch7.svvOI  : null;
  const spV   = ch7 ? ch7.spv    : null;
  const dmFBV = ch7 ? ch7.dmFBV  : null;
  const dlFBV = ch7 ? ch7.dlFBV  : null;
  const dmPV  = ch7 ? ch7.dmPriceVar : null;
  const dmEV  = ch7 ? ch7.dmEffVar   : null;
  const dlPV  = ch7 ? ch7.dlPriceVar : null;
  const dlEV  = ch7 ? ch7.dlEffVar   : null;

  const vohFBV = ohv.vohFBVar;
  const fohFBV = ohv.fohFBVar;
  const totalFBV = (fbV || 0) + vohFBV + fohFBV;
  const totalSBV = (sbV || 0);

  diagramEl.innerHTML = `
    <div class="vh-diagram">

      <div class="vh-level vh-level--1">
        ${sbV !== null ? vNode('Static-Budget Variance<br>for Operating Income', sbV, 1, 'Level 1') :
          `<div class="vh-node vh-node--placeholder vh-node--level1">
            <div class="vh-node__label">Static-Budget Variance</div>
            <div class="vh-node__value" style="color:var(--color-text-muted)">Pull from Ch. 7</div>
          </div>`}
      </div>

      <div class="vh-connector vh-connector--split"></div>

      <div class="vh-level vh-level--2">
        ${fbV !== null ? vNode('Flexible-Budget Variance', fbV + vohFBV + fohFBV, 2, 'Level 2 (incl. OH)') :
          vNode('Flexible-Budget Variance<br>(Overhead Only)', vohFBV + fohFBV, 2, 'Level 2')}
        ${svV !== null ? vNode('Sales-Volume Variance', svV, 2, 'Level 2') :
          `<div class="vh-node vh-node--placeholder vh-node--level2">
            <div class="vh-node__label">Sales-Volume Variance</div>
            <div class="vh-node__value" style="color:var(--color-text-muted)">Pull from Ch. 7</div>
          </div>`}
      </div>

      <div class="vh-connector vh-connector--wide"></div>

      <div class="vh-level vh-level--3">
        ${spV !== null ? vNode('Selling-Price Variance', spV, 3, 'Revenue') : '<div class="vh-node vh-node--placeholder"><div class="vh-node__label">Selling-Price Variance</div><div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">Pull from Ch. 7</div></div>'}
        ${dmFBV !== null ? vNode('Direct Materials Variance', dmFBV, 3, 'Variable Cost') : '<div class="vh-node vh-node--placeholder"><div class="vh-node__label">Direct Materials Variance</div><div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">Pull from Ch. 7</div></div>'}
        ${dlFBV !== null ? vNode('Direct Labor Variance', dlFBV, 3, 'Variable Cost') : '<div class="vh-node vh-node--placeholder"><div class="vh-node__label">Direct Labor Variance</div><div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">Pull from Ch. 7</div></div>'}
        ${vNode('Variable OH Variance', vohFBV, 3, 'Variable Cost')}
        ${vNode('Fixed OH Variance', fohFBV, 3, 'Fixed Cost')}
      </div>

      <div class="vh-connector vh-connector--wide"></div>

      <div class="vh-level vh-level--4">
        ${dmPV !== null ? vNode('DM Price Variance', dmPV, 4) : '<div class="vh-node vh-node--placeholder"><div class="vh-node__label">DM Price Variance</div><div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">Pull from Ch. 7</div></div>'}
        ${dmEV !== null ? vNode('DM Efficiency Variance', dmEV, 4) : '<div class="vh-node vh-node--placeholder"><div class="vh-node__label">DM Efficiency Variance</div><div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">Pull from Ch. 7</div></div>'}
        ${dlPV !== null ? vNode('DL Price Variance', dlPV, 4) : '<div class="vh-node vh-node--placeholder"><div class="vh-node__label">DL Price Variance</div><div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">Pull from Ch. 7</div></div>'}
        ${dlEV !== null ? vNode('DL Efficiency Variance', dlEV, 4) : '<div class="vh-node vh-node--placeholder"><div class="vh-node__label">DL Efficiency Variance</div><div class="vh-node__value" style="font-size:var(--font-size-xs);color:var(--color-text-muted)">Pull from Ch. 7</div></div>'}
        ${vNode('VOH Spending Variance', ohv.vohSpending, 4)}
        ${vNode('VOH Efficiency Variance', ohv.vohEfficiency, 4)}
        ${vNode('FOH Spending Variance', ohv.fohSpending, 4)}
        ${vNode('Production-Volume Variance', ohv.fohProdVol, 4)}
      </div>

      <div class="vh-legend">
        <span class="vh-legend__item vh-legend__item--fav">Favorable (F)</span>
        <span class="vh-legend__item vh-legend__item--unfav">Unfavorable (U)</span>
        <span class="vh-legend__item vh-legend__item--placeholder">Pull from Ch. 7 to complete</span>
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
  const statusEl  = document.getElementById('ch08-status');
  const actionsEl = btn?.closest('.chapter-complete__actions');
  if (isChapterComplete('ch08')) setCompleteUI();
  btn?.addEventListener('click', () => { markChapterComplete('ch08'); setCompleteUI(); });
  function setCompleteUI() {
    if (statusEl) { statusEl.textContent = '✓ Completed'; statusEl.classList.add('chapter-hero__progress-label--complete'); }
    if (btn)      { btn.textContent = '✓ Completed'; btn.disabled = true; }
    if (actionsEl && !actionsEl.querySelector('.reset-chapter-btn')) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn--ghost-danger reset-chapter-btn';
      resetBtn.textContent = 'Reset Chapter';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset Chapter 8? This will clear your completion status and reload the page.')) {
          resetChapter('ch08');
          window.location.reload();
        }
      });
      actionsEl.appendChild(resetBtn);
    }
  }
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initOHRateDev();
  initOHVarAnalyzer();
  initCompleteVH();
  initKeyTerms();
  initChapterComplete();
});
