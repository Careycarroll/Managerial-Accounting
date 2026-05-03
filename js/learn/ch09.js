import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';

const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
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

const val = id => parseFloat(document.getElementById(id).value) || 0;

// ── TOOL 1 ────────────────────────────────────────────────────────────────────

function calcTool1() {
  const sp     = val('t1-selling-price');
  const dm     = val('t1-dm-cost');
  const dl     = val('t1-dl-cost');
  const voh    = val('t1-var-oh-cost');
  const vmkt   = val('t1-var-mktg-cost');
  const fmfg   = val('t1-fixed-mfg');
  const fmkt   = val('t1-fixed-mktg');
  const prod   = val('t1-units-produced');
  const sold   = val('t1-units-sold');
  const begInv = val('t1-beg-inv');

  const varMfgUnit = dm + dl + voh;
  const endInv     = begInv + prod - sold;
  const fixedRate  = fmfg / prod;

  const vc_rev  = sp * sold;
  const vc_cogs = varMfgUnit * sold;
  const vc_vmkt = vmkt * sold;
  const vc_cm   = vc_rev - vc_cogs - vc_vmkt;
  const vc_oi   = vc_cm - fmfg - fmkt;

  const ac_invUnit = varMfgUnit + fixedRate;
  const ac_cogs    = ac_invUnit * sold;
  const ac_gm      = sp * sold - ac_cogs;
  const ac_oi      = ac_gm - vmkt * sold - fmkt;

  const tc_rev      = sp * sold;
  const tc_dmCOGS   = dm * sold;
  const tc_tm       = tc_rev - tc_dmCOGS;
  const tc_otherMfg = fmfg + (dl + voh) * prod;
  const tc_oi       = tc_tm - tc_otherMfg - vmkt * sold - fmkt;

  const fixedEndInv  = fixedRate * endInv;
  const fixedBegInv  = fixedRate * begInv;
  const diff         = fixedEndInv - fixedBegInv;

  const parent = document.getElementById('tool-1');
  const out    = getOrCreate('t1-output', 'div', 'tool-output', parent);

  const ruleText = endInv > begInv
    ? 'Inventory increased &rarr; Absorption OI is higher (fixed costs deferred to future period)'
    : endInv < begInv
    ? 'Inventory decreased &rarr; Variable OI is higher (prior-period fixed costs now expensed)'
    : 'Inventory unchanged &rarr; Both methods report equal operating income';

  out.innerHTML = '<div class="costing-compare-grid">'
    + '<div class="costing-col costing-col--vc">'
    + '<div class="costing-col__header">Variable Costing</div>'
    + '<div class="costing-col__subtitle">Contribution Margin Format</div>'
    + '<table class="is-table">'
    + '<tr><td>Revenues</td><td>' + fmt(vc_rev) + '</td></tr>'
    + '<tr class="is-table__section"><td colspan="2">Variable Costs</td></tr>'
    + '<tr class="is-table__indent"><td>Variable COGS (' + fmtN(sold) + ' x ' + fmt(varMfgUnit) + ')</td><td>(' + fmt(vc_cogs) + ')</td></tr>'
    + '<tr class="is-table__indent"><td>Variable Marketing (' + fmtN(sold) + ' x ' + fmt(vmkt) + ')</td><td>(' + fmt(vc_vmkt) + ')</td></tr>'
    + '<tr class="is-table__subtotal"><td>Contribution Margin</td><td>' + fmt(vc_cm) + '</td></tr>'
    + '<tr class="is-table__section"><td colspan="2">Fixed Costs</td></tr>'
    + '<tr class="is-table__indent"><td>Fixed Manufacturing</td><td>(' + fmt(fmfg) + ')</td></tr>'
    + '<tr class="is-table__indent"><td>Fixed Marketing</td><td>(' + fmt(fmkt) + ')</td></tr>'
    + '<tr class="is-table__total ' + (vc_oi >= 0 ? 'is-table__total--pos' : 'is-table__total--neg') + '"><td>Operating Income</td><td>' + fmt(vc_oi) + '</td></tr>'
    + '</table>'
    + '<div class="inv-cost-badge">Inventoriable cost/unit: <strong>' + fmt(varMfgUnit) + '</strong></div>'
    + '</div>'

    + '<div class="costing-col costing-col--ac">'
    + '<div class="costing-col__header">Absorption Costing</div>'
    + '<div class="costing-col__subtitle">Gross Margin Format</div>'
    + '<table class="is-table">'
    + '<tr><td>Revenues</td><td>' + fmt(sp * sold) + '</td></tr>'
    + '<tr class="is-table__section"><td colspan="2">Cost of Goods Sold</td></tr>'
    + '<tr class="is-table__indent"><td>COGS (' + fmtN(sold) + ' x ' + fmt(ac_invUnit) + ')</td><td>(' + fmt(ac_cogs) + ')</td></tr>'
    + '<tr class="is-table__subtotal"><td>Gross Margin</td><td>' + fmt(ac_gm) + '</td></tr>'
    + '<tr class="is-table__section"><td colspan="2">Operating Costs</td></tr>'
    + '<tr class="is-table__indent"><td>Variable Marketing</td><td>(' + fmt(vmkt * sold) + ')</td></tr>'
    + '<tr class="is-table__indent"><td>Fixed Marketing</td><td>(' + fmt(fmkt) + ')</td></tr>'
    + '<tr class="is-table__total ' + (ac_oi >= 0 ? 'is-table__total--pos' : 'is-table__total--neg') + '"><td>Operating Income</td><td>' + fmt(ac_oi) + '</td></tr>'
    + '</table>'
    + '<div class="inv-cost-badge">Inventoriable cost/unit: <strong>' + fmt(ac_invUnit) + '</strong>'
    + '<span class="inv-cost-badge__note">(' + fmt(varMfgUnit) + ' variable + ' + fmt(fixedRate) + ' fixed)</span></div>'
    + '</div>'

    + '<div class="costing-col costing-col--tc">'
    + '<div class="costing-col__header">Throughput Costing</div>'
    + '<div class="costing-col__subtitle">Super-Variable Format</div>'
    + '<table class="is-table">'
    + '<tr><td>Revenues</td><td>' + fmt(tc_rev) + '</td></tr>'
    + '<tr class="is-table__indent"><td>Direct Materials COGS (' + fmtN(sold) + ' x ' + fmt(dm) + ')</td><td>(' + fmt(tc_dmCOGS) + ')</td></tr>'
    + '<tr class="is-table__subtotal"><td>Throughput Margin</td><td>' + fmt(tc_tm) + '</td></tr>'
    + '<tr class="is-table__section"><td colspan="2">All Other Costs (period)</td></tr>'
    + '<tr class="is-table__indent"><td>Mfg costs excl. DM (' + fmtN(prod) + ' units)</td><td>(' + fmt(tc_otherMfg) + ')</td></tr>'
    + '<tr class="is-table__indent"><td>Variable Marketing</td><td>(' + fmt(vmkt * sold) + ')</td></tr>'
    + '<tr class="is-table__indent"><td>Fixed Marketing</td><td>(' + fmt(fmkt) + ')</td></tr>'
    + '<tr class="is-table__total ' + (tc_oi >= 0 ? 'is-table__total--pos' : 'is-table__total--neg') + '"><td>Operating Income</td><td>' + fmt(tc_oi) + '</td></tr>'
    + '</table>'
    + '<div class="inv-cost-badge">Inventoriable cost/unit: <strong>' + fmt(dm) + '</strong>'
    + '<span class="inv-cost-badge__note">(direct materials only)</span></div>'
    + '</div>'
    + '</div>'

    + '<div class="reconciliation-panel">'
    + '<div class="reconciliation-panel__title">Reconciliation: Absorption OI minus Variable OI = ' + fmt(Math.abs(diff)) + '</div>'
    + '<div class="reconciliation-panel__formula">Absorption OI - Variable OI = Fixed mfg in ending inventory - Fixed mfg in beginning inventory</div>'
    + '<div class="reconciliation-panel__calc">' + fmt(ac_oi) + ' - ' + fmt(vc_oi) + ' = (' + fmt(fixedRate) + ' x ' + fmtN(endInv) + ') - (' + fmt(fixedRate) + ' x ' + fmtN(begInv) + ') = <strong>' + fmt(diff) + '</strong></div>'
    + '<div class="reconciliation-panel__rule">' + ruleText + '</div>'
    + '</div>'

    + '<div class="oi-summary-row">'
    + '<div class="oi-badge oi-badge--ac">AC: ' + fmt(ac_oi) + '</div>'
    + '<div class="oi-badge oi-badge--vc">VC: ' + fmt(vc_oi) + '</div>'
    + '<div class="oi-badge oi-badge--tc">TC: ' + fmt(tc_oi) + '</div>'
    + '</div>';

  renderShowWork(document.getElementById('t1-show-work'), [
    { label: 'Variable Mfg Cost per Unit', formula: 'DM + DL + Variable OH', values: fmt(dm) + ' + ' + fmt(dl) + ' + ' + fmt(voh), result: fmt(varMfgUnit) },
    { label: 'Fixed Mfg Cost per Unit (Absorption)', formula: 'Fixed Mfg / Units Produced', values: fmt(fmfg) + ' / ' + fmtN(prod), result: fmt(fixedRate) },
    { label: 'Ending Inventory', formula: 'Beg Inv + Produced - Sold', values: fmtN(begInv) + ' + ' + fmtN(prod) + ' - ' + fmtN(sold), result: fmtN(endInv) + ' units' },
    { label: 'Variable Costing OI', formula: '(SP - Var Mfg - Var Mktg) x Sold - Fixed Mfg - Fixed Mktg', values: '(' + fmt(sp) + ' - ' + fmt(varMfgUnit) + ' - ' + fmt(vmkt) + ') x ' + fmtN(sold) + ' - ' + fmt(fmfg) + ' - ' + fmt(fmkt), result: fmt(vc_oi), highlight: true },
    { label: 'Absorption Costing OI', formula: 'Revenue - COGS - Var Mktg - Fixed Mktg', values: fmt(sp * sold) + ' - ' + fmt(ac_cogs) + ' - ' + fmt(vmkt * sold) + ' - ' + fmt(fmkt), result: fmt(ac_oi), highlight: true },
    { label: 'Throughput Costing OI', formula: 'Throughput Margin - Other Mfg - Mktg', values: fmt(tc_tm) + ' - ' + fmt(tc_otherMfg) + ' - ' + fmt(vmkt * sold) + ' - ' + fmt(fmkt), result: fmt(tc_oi), highlight: true },
    { label: 'Reconciliation', formula: 'AC OI - VC OI = Fixed Rate x (End Inv - Beg Inv)', values: fmt(ac_oi) + ' - ' + fmt(vc_oi) + ' = ' + fmt(fixedRate) + ' x (' + fmtN(endInv) + ' - ' + fmtN(begInv) + ')', result: fmt(diff) }
  ], { title: 'Three-Method Calculation', defaultOpen: false });
}

function initTool1() {
  document.getElementById('t1-calculate').addEventListener('click', calcTool1);
  initRandomizer('t1-randomize', [
    { id: 't1-selling-price',  min: 500,    max: 2000,    step: 50,    integer: true },
    { id: 't1-dm-cost',        min: 50,     max: 200,     step: 10,    integer: true },
    { id: 't1-dl-cost',        min: 20,     max: 100,     step: 5,     integer: true },
    { id: 't1-var-oh-cost',    min: 10,     max: 80,      step: 5,     integer: true },
    { id: 't1-var-mktg-cost',  min: 50,     max: 250,     step: 10,    integer: true },
    { id: 't1-fixed-mfg',      min: 400000, max: 2000000, step: 50000, integer: true },
    { id: 't1-fixed-mktg',     min: 400000, max: 2000000, step: 50000, integer: true },
    { id: 't1-units-produced', min: 5000,   max: 15000,   step: 500,   integer: true },
    { id: 't1-units-sold',     min: 3000,   max: 12000,   step: 500,   integer: true, constraint: 'lessThan:t1-units-produced' }
  ], calcTool1);
}

// ── TOOL 2 ────────────────────────────────────────────────────────────────────

function calcTool2() {
  const sp        = val('t2-selling-price');
  const vmc       = val('t2-var-mfg-cost');
  const vmkt      = val('t2-var-mktg-cost');
  const fmfg      = val('t2-fixed-mfg');
  const fmkt      = val('t2-fixed-mktg');
  const begInv    = val('t2-beg-inv');
  const sold      = val('t2-units-sold');
  const denom     = val('t2-denominator');
  const prodLevel = val('t2-production-level');

  const fixedRate   = fmfg / denom;
  const invCostUnit = vmc + fixedRate;
  const endInv      = begInv + prodLevel - sold;
  const revenues    = sp * sold;

  const cogsStd  = invCostUnit * sold;
  const pvv      = fmfg - fixedRate * prodLevel;
  const adjCOGS  = cogsStd + pvv;
  const gm       = revenues - adjCOGS;
  const mktgCost = vmkt * sold + fmkt;
  const ac_oi    = gm - mktgCost;

  const cm     = (sp - vmc - vmkt) * sold;
  const vc_oi  = cm - fmfg - fmkt;

  const incomePerUnit = fixedRate;
  const extraInv      = endInv - begInv;
  const incomeBoost   = incomePerUnit * Math.max(0, extraInv);
  const pvvLabel      = pvv > 0 ? 'U' : pvv < 0 ? 'F' : '0';
  const pvvClass      = pvv > 0 ? 'variance-unfav' : pvv < 0 ? 'variance-fav' : 'variance-zero';

  const insightText = endInv === begInv
    ? '<div class="incentive-insight incentive-insight--equal">Production equals net sales needed - both methods report equal income.</div>'
    : endInv > begInv
    ? '<div class="incentive-insight incentive-insight--warning">Inventory is building up. Absorption OI is inflated by ' + fmt(incomeBoost) + ' relative to variable costing.</div>'
    : '<div class="incentive-insight incentive-insight--info">Inventory is decreasing. Variable OI exceeds absorption OI as prior-period fixed costs flow through COGS.</div>';

  const parent = document.getElementById('tool-2');
  const out    = getOrCreate('t2-output', 'div', 'tool-output', parent);

  out.innerHTML = '<div class="incentive-grid">'
    + '<div class="incentive-is">'
    + '<div class="incentive-is__header">Absorption Costing Income Statement</div>'
    + '<div class="incentive-is__subhead">Production: ' + fmtN(prodLevel) + ' units | Sales: ' + fmtN(sold) + ' units | Ending Inventory: ' + fmtN(endInv) + ' units</div>'
    + '<table class="is-table">'
    + '<tr><td>Revenues (' + fmtN(sold) + ' x ' + fmt(sp) + ')</td><td>' + fmt(revenues) + '</td></tr>'
    + '<tr class="is-table__section"><td colspan="2">Cost of Goods Sold</td></tr>'
    + '<tr class="is-table__indent"><td>Beginning Inventory (' + fmtN(begInv) + ' x ' + fmt(invCostUnit) + ')</td><td>' + fmt(invCostUnit * begInv) + '</td></tr>'
    + '<tr class="is-table__indent"><td>Variable Mfg (' + fmtN(prodLevel) + ' x ' + fmt(vmc) + ')</td><td>' + fmt(vmc * prodLevel) + '</td></tr>'
    + '<tr class="is-table__indent"><td>Allocated Fixed Mfg (' + fmtN(prodLevel) + ' x ' + fmt(fixedRate) + ')</td><td>' + fmt(fixedRate * prodLevel) + '</td></tr>'
    + '<tr class="is-table__indent"><td>Less: Ending Inventory (' + fmtN(endInv) + ' x ' + fmt(invCostUnit) + ')</td><td>(' + fmt(invCostUnit * endInv) + ')</td></tr>'
    + '<tr class="is-table__indent"><td>Production-Volume Variance</td><td><span class="' + pvvClass + '">' + fmt(Math.abs(pvv)) + ' ' + pvvLabel + '</span></td></tr>'
    + '<tr class="is-table__subtotal"><td>Cost of Goods Sold</td><td>' + fmt(adjCOGS) + '</td></tr>'
    + '<tr class="is-table__subtotal"><td>Gross Margin</td><td>' + fmt(gm) + '</td></tr>'
    + '<tr class="is-table__indent"><td>Variable Marketing (' + fmtN(sold) + ' x ' + fmt(vmkt) + ')</td><td>(' + fmt(vmkt * sold) + ')</td></tr>'
    + '<tr class="is-table__indent"><td>Fixed Marketing</td><td>(' + fmt(fmkt) + ')</td></tr>'
    + '<tr class="is-table__total ' + (ac_oi >= 0 ? 'is-table__total--pos' : 'is-table__total--neg') + '"><td>Operating Income (Absorption)</td><td>' + fmt(ac_oi) + '</td></tr>'
    + '</table></div>'

    + '<div class="incentive-insights">'
    + '<div class="incentive-callout ' + (incomeBoost > 0 ? 'incentive-callout--warning' : 'incentive-callout--neutral') + '">'
    + '<div class="incentive-callout__label">Income per Extra Unit in Inventory</div>'
    + '<div class="incentive-callout__value">' + fmt(incomePerUnit) + '</div>'
    + '<div class="incentive-callout__note">Each unit added to ending inventory absorbs ' + fmt(fixedRate) + ' of fixed manufacturing cost, deferring it to a future period.</div>'
    + '</div>'
    + '<div class="incentive-compare">'
    + '<div class="incentive-compare__row"><span class="incentive-compare__label">Absorption Costing OI</span><span class="incentive-compare__value ' + (ac_oi >= 0 ? 'pos' : 'neg') + '">' + fmt(ac_oi) + '</span></div>'
    + '<div class="incentive-compare__row"><span class="incentive-compare__label">Variable Costing OI</span><span class="incentive-compare__value ' + (vc_oi >= 0 ? 'pos' : 'neg') + '">' + fmt(vc_oi) + '</span></div>'
    + '<div class="incentive-compare__row incentive-compare__row--diff"><span class="incentive-compare__label">Difference</span><span class="incentive-compare__value">' + fmt(Math.abs(ac_oi - vc_oi)) + '</span></div>'
    + '</div>'
    + insightText
    + '</div></div>';

  renderShowWork(document.getElementById('t2-show-work'), [
    { label: 'Fixed Mfg Cost Rate', formula: 'Fixed Mfg / Denominator Level', values: fmt(fmfg) + ' / ' + fmtN(denom), result: fmt(fixedRate) + ' per unit' },
    { label: 'Inventoriable Cost per Unit', formula: 'Variable Mfg + Fixed Rate', values: fmt(vmc) + ' + ' + fmt(fixedRate), result: fmt(invCostUnit) },
    { label: 'Ending Inventory', formula: 'Beg Inv + Production - Sales', values: fmtN(begInv) + ' + ' + fmtN(prodLevel) + ' - ' + fmtN(sold), result: fmtN(endInv) + ' units' },
    { label: 'Production-Volume Variance', formula: 'Budgeted Fixed OH - (Rate x Actual Production)', values: fmt(fmfg) + ' - (' + fmt(fixedRate) + ' x ' + fmtN(prodLevel) + ')', result: fmt(Math.abs(pvv)) + ' ' + pvvLabel },
    { label: 'Absorption Costing OI', formula: 'Gross Margin - Var Mktg - Fixed Mktg', values: fmt(gm) + ' - ' + fmt(vmkt * sold) + ' - ' + fmt(fmkt), result: fmt(ac_oi), highlight: true },
    { label: 'Variable Costing OI', formula: 'CM per unit x Sold - Fixed Mfg - Fixed Mktg', values: fmt(sp - vmc - vmkt) + ' x ' + fmtN(sold) + ' - ' + fmt(fmfg) + ' - ' + fmt(fmkt), result: fmt(vc_oi), highlight: true }
  ], { title: 'Incentive Simulator Calculation', defaultOpen: false });
}

function initTool2() {
  const slider  = document.getElementById('t2-production-level');
  const display = document.getElementById('t2-production-display');
  slider.addEventListener('input', () => { display.textContent = fmtN(parseFloat(slider.value)); });
  document.getElementById('t2-calculate').addEventListener('click', calcTool2);
  initRandomizer('t2-randomize', [
    { id: 't2-selling-price',  min: 500,    max: 2000,    step: 50,    integer: true },
    { id: 't2-var-mfg-cost',   min: 100,    max: 400,     step: 20,    integer: true },
    { id: 't2-var-mktg-cost',  min: 50,     max: 250,     step: 10,    integer: true },
    { id: 't2-fixed-mfg',      min: 400000, max: 2000000, step: 50000, integer: true },
    { id: 't2-fixed-mktg',     min: 400000, max: 2000000, step: 50000, integer: true },
    { id: 't2-beg-inv',        min: 0,      max: 3000,    step: 500,   integer: true },
    { id: 't2-units-sold',     min: 3000,   max: 10000,   step: 500,   integer: true },
    { id: 't2-denominator',    min: 5000,   max: 15000,   step: 500,   integer: true }
  ], calcTool2);
}

// ── TOOL 3 ────────────────────────────────────────────────────────────────────

function calcTool3() {
  const fmfg       = val('t3-fixed-mfg');
  const vmc        = val('t3-var-mfg-cost');
  const actualProd = val('t3-actual-production');
  const thUS       = val('t3-th-units-shift');
  const thSD       = val('t3-th-shifts-day');
  const thDY       = val('t3-th-days-year');
  const prUS       = val('t3-pr-units-shift');
  const prDY       = val('t3-pr-days-year');
  const normalU    = val('t3-normal-units');
  const masterU    = val('t3-master-units');

  const theoreticalUnits = thUS * thSD * thDY;
  const practicalUnits   = prUS * thSD * prDY;

  const concepts = [
    { name: 'Theoretical',        units: theoreticalUnits, note: thUS + ' units/shift x ' + thSD + ' shifts x ' + thDY + ' days' },
    { name: 'Practical',          units: practicalUnits,   note: prUS + ' units/shift x ' + thSD + ' shifts x ' + prDY + ' days', recommended: true },
    { name: 'Normal Utilization', units: normalU,          note: 'Average demand over 2-3 years' },
    { name: 'Master-Budget',      units: masterU,          note: 'Current year budgeted demand' }
  ].map(c => {
    const fixedRate = fmfg / c.units;
    const totalUnit = fixedRate + vmc;
    const pvv       = fmfg - fixedRate * actualProd;
    const pvvLabel  = pvv > 0 ? 'U' : pvv < 0 ? 'F' : '-';
    const pvvClass  = pvv > 0 ? 'variance-unfav' : pvv < 0 ? 'variance-fav' : 'variance-zero';
    return { ...c, fixedRate, totalUnit, pvv, pvvLabel, pvvClass };
  });

  const parent = document.getElementById('tool-3');
  const out    = getOrCreate('t3-output', 'div', 'tool-output', parent);

  const tableRows = concepts.map(r =>
    '<tr class="' + (r.recommended ? 'capacity-table__row--highlight' : '') + '">'
    + '<td>' + r.name + (r.recommended ? ' <span class="capacity-badge">Recommended for pricing</span>' : '')
    + '<div class="capacity-table__note">' + r.note + '</div></td>'
    + '<td>' + fmtN(r.units) + '</td>'
    + '<td>' + fmt(r.fixedRate) + '</td>'
    + '<td>' + fmt(vmc) + '</td>'
    + '<td><strong>' + fmt(r.totalUnit) + '</strong></td>'
    + '<td><span class="' + r.pvvClass + '">' + fmt(Math.abs(r.pvv)) + ' ' + r.pvvLabel + '</span></td>'
    + '</tr>'
  ).join('');

  out.innerHTML = '<div class="capacity-table-wrap">'
    + '<table class="capacity-table"><thead><tr>'
    + '<th>Capacity Concept</th><th>Capacity Units</th><th>Fixed Rate/Unit</th>'
    + '<th>Variable Rate/Unit</th><th>Total Unit Cost</th><th>PVV (' + fmtN(actualProd) + ' actual)</th>'
    + '</tr></thead><tbody>' + tableRows + '</tbody></table></div>'
    + '<div class="capacity-insight-row">'
    + '<div class="capacity-insight-card"><div class="capacity-insight-card__title">Supply-Based Concepts</div>'
    + '<p>Theoretical and Practical capacity measure what the plant can produce. They are stable and do not change when demand fluctuates.</p></div>'
    + '<div class="capacity-insight-card"><div class="capacity-insight-card__title">Demand-Based Concepts</div>'
    + '<p>Normal and Master-Budget capacity measure what customers demand. They embed the cost of unused capacity into the unit price.</p></div>'
    + '<div class="capacity-insight-card capacity-insight-card--accent"><div class="capacity-insight-card__title">PVV Formula</div>'
    + '<p>Budgeted Fixed OH minus (Rate x Actual Production). Zero only when actual production equals the denominator level.</p></div>'
    + '</div>';

  const swSteps = [
    { label: 'Theoretical Capacity', formula: 'Units/Shift x Shifts/Day x Days/Year', values: fmtN(thUS) + ' x ' + fmtN(thSD) + ' x ' + fmtN(thDY), result: fmtN(theoreticalUnits) + ' units' },
    { label: 'Practical Capacity', formula: 'Units/Shift (realistic) x Shifts/Day x Operating Days', values: fmtN(prUS) + ' x ' + fmtN(thSD) + ' x ' + fmtN(prDY), result: fmtN(practicalUnits) + ' units' }
  ];
  concepts.forEach(r => {
    swSteps.push({ label: r.name + ' Fixed Rate', formula: 'Fixed Mfg / Capacity Units', values: fmt(fmfg) + ' / ' + fmtN(r.units), result: fmt(r.fixedRate) + ' per unit' });
    swSteps.push({ label: r.name + ' PVV', formula: 'Budgeted Fixed OH - (Rate x Actual Prod)', values: fmt(fmfg) + ' - (' + fmt(r.fixedRate) + ' x ' + fmtN(actualProd) + ')', result: fmt(Math.abs(r.pvv)) + ' ' + r.pvvLabel, highlight: !!r.recommended });
  });

  renderShowWork(document.getElementById('t3-show-work'), swSteps, { title: 'Capacity Rate Calculations', defaultOpen: false });
}

function initTool3() {
  document.getElementById('t3-calculate').addEventListener('click', calcTool3);
  initRandomizer('t3-randomize', [
    { id: 't3-fixed-mfg',         min: 400000, max: 3000000, step: 100000, integer: true },
    { id: 't3-var-mfg-cost',      min: 50,     max: 400,     step: 10,     integer: true },
    { id: 't3-actual-production', min: 3000,   max: 15000,   step: 500,    integer: true },
    { id: 't3-th-units-shift',    min: 15,     max: 50,      step: 5,      integer: true },
    { id: 't3-th-shifts-day',     min: 1,      max: 3,       step: 1,      integer: true },
    { id: 't3-th-days-year',      min: 300,    max: 365,     step: 5,      integer: true },
    { id: 't3-pr-units-shift',    min: 10,     max: 40,      step: 5,      integer: true, constraint: 'lessThan:t3-th-units-shift' },
    { id: 't3-pr-days-year',      min: 240,    max: 320,     step: 10,     integer: true, constraint: 'lessThan:t3-th-days-year' },
    { id: 't3-normal-units',      min: 5000,   max: 20000,   step: 1000,   integer: true },
    { id: 't3-master-units',      min: 4000,   max: 15000,   step: 500,    integer: true, constraint: 'lessThan:t3-normal-units' }
  ], calcTool3);
}

// ── TOOL 4 ────────────────────────────────────────────────────────────────────

function calcTool4() {
  const fmfg       = val('t4-fixed-mfg');
  const vmc        = val('t4-var-mfg-cost');
  const practical  = val('t4-practical-capacity');
  const budgeted   = val('t4-budgeted-demand');
  const actualProd = val('t4-actual-production');

  const practicalRate = fmfg / practical;
  const masterRate    = fmfg / budgeted;
  const usedCost      = practicalRate * actualProd;
  const unusedUnits   = practical - actualProd;
  const unusedCost    = practicalRate * unusedUnits;
  const costPractical = practicalRate + vmc;
  const costMaster    = masterRate + vmc;
  const hiddenPerUnit = masterRate - practicalRate;
  const unusedPct     = unusedUnits / practical;
  const usedPct       = 1 - unusedPct;

  const parent = document.getElementById('tool-4');
  const out    = getOrCreate('t4-output', 'div', 'tool-output', parent);

  out.innerHTML = '<div class="capacity-split-grid">'
    + '<div class="capacity-split-panel">'
    + '<div class="capacity-split-panel__title">Used vs. Unused Capacity Split</div>'
    + '<div class="capacity-split-panel__subtitle">At practical capacity rate of ' + fmt(practicalRate) + '/unit</div>'
    + '<table class="is-table"><thead><tr><th>Component</th><th>Units</th><th>Rate</th><th>Cost</th></tr></thead><tbody>'
    + '<tr class="capacity-split__used"><td>Used Capacity</td><td>' + fmtN(actualProd) + '</td><td>' + fmt(practicalRate) + '</td><td><strong>' + fmt(usedCost) + '</strong></td></tr>'
    + '<tr class="capacity-split__unused"><td>Unused Capacity</td><td>' + fmtN(unusedUnits) + '</td><td>' + fmt(practicalRate) + '</td><td><strong>' + fmt(unusedCost) + '</strong></td></tr>'
    + '<tr class="is-table__total"><td>Total Fixed Mfg Costs</td><td>' + fmtN(practical) + '</td><td></td><td>' + fmt(fmfg) + '</td></tr>'
    + '</tbody></table>'
    + '<div class="unused-pct-bar">'
    + '<div class="unused-pct-bar__label">Capacity Utilization: <strong>' + fmtPct(usedPct) + '</strong> used | <strong>' + fmtPct(unusedPct) + '</strong> unused</div>'
    + '<div class="unused-pct-bar__track"><div class="unused-pct-bar__fill" style="width:' + fmtPct(usedPct) + '"></div></div>'
    + '</div></div>'

    + '<div class="capacity-pricing-panel">'
    + '<div class="capacity-pricing-panel__title">Pricing Implications</div>'
    + '<table class="is-table"><thead><tr><th>Denominator</th><th>Fixed Rate</th><th>Total Unit Cost</th><th>Unused Cost Hidden?</th></tr></thead><tbody>'
    + '<tr class="capacity-table__row--highlight"><td>Practical Capacity <span class="capacity-badge">Recommended</span></td><td>' + fmt(practicalRate) + '</td><td><strong>' + fmt(costPractical) + '</strong></td><td class="variance-fav">No - visible</td></tr>'
    + '<tr><td>Master-Budget Capacity</td><td>' + fmt(masterRate) + '</td><td><strong>' + fmt(costMaster) + '</strong></td><td class="variance-unfav">Yes - ' + fmt(hiddenPerUnit) + '/unit hidden</td></tr>'
    + '</tbody></table>'
    + '<div class="capacity-insight-row" style="margin-top:var(--space-4);">'
    + '<div class="capacity-insight-card"><div class="capacity-insight-card__title">For Pricing</div>'
    + '<p>Use practical capacity rate (' + fmt(costPractical) + '/unit). Customers should not pay for capacity the company chose to leave idle.</p></div>'
    + '<div class="capacity-insight-card"><div class="capacity-insight-card__title">For Performance Evaluation</div>'
    + '<p>Use master-budget rate for current-year marketing manager evaluation. They are accountable for the demand they committed to, not long-run capacity decisions.</p></div>'
    + '</div></div></div>';

  renderShowWork(document.getElementById('t4-show-work'), [
    { label: 'Practical Capacity Rate', formula: 'Fixed Mfg / Practical Capacity', values: fmt(fmfg) + ' / ' + fmtN(practical), result: fmt(practicalRate) + ' per unit' },
    { label: 'Master-Budget Rate', formula: 'Fixed Mfg / Master-Budget Demand', values: fmt(fmfg) + ' / ' + fmtN(budgeted), result: fmt(masterRate) + ' per unit' },
    { label: 'Used Capacity Cost', formula: 'Practical Rate x Actual Production', values: fmt(practicalRate) + ' x ' + fmtN(actualProd), result: fmt(usedCost), highlight: true },
    { label: 'Unused Capacity Cost', formula: 'Practical Rate x (Practical - Actual)', values: fmt(practicalRate) + ' x (' + fmtN(practical) + ' - ' + fmtN(actualProd) + ')', result: fmt(unusedCost), highlight: true },
    { label: 'Hidden Unused Cost per Unit', formula: 'Master-Budget Rate - Practical Rate', values: fmt(masterRate) + ' - ' + fmt(practicalRate), result: fmt(hiddenPerUnit) + ' per unit embedded in master-budget cost' },
    { label: 'Capacity Utilization', formula: 'Actual Production / Practical Capacity', values: fmtN(actualProd) + ' / ' + fmtN(practical), result: fmtPct(usedPct) + ' utilized' }
  ], { title: 'Used vs. Unused Capacity Analysis', defaultOpen: false });
}

function initTool4() {
  document.getElementById('t4-calculate').addEventListener('click', calcTool4);
  initRandomizer('t4-randomize', [
    { id: 't4-fixed-mfg',          min: 400000, max: 3000000, step: 100000, integer: true },
    { id: 't4-var-mfg-cost',       min: 50,     max: 400,     step: 10,     integer: true },
    { id: 't4-practical-capacity', min: 8000,   max: 30000,   step: 1000,   integer: true },
    { id: 't4-budgeted-demand',    min: 4000,   max: 20000,   step: 500,    integer: true, constraint: 'lessThan:t4-practical-capacity' },
    { id: 't4-actual-production',  min: 3000,   max: 18000,   step: 500,    integer: true, constraint: 'lessThan:t4-practical-capacity' }
  ], calcTool4);
}

// ── TOOL 5 ────────────────────────────────────────────────────────────────────

function calcTool5() {
  const fmfg    = val('t5-fixed-mfg');
  const vmc     = val('t5-var-mfg-cost');
  const initVol = val('t5-initial-volume');
  const lost1   = val('t5-lost-r1');
  const lost2   = val('t5-lost-r2');
  const lost3   = val('t5-lost-r3');

  const rounds = [
    { label: 'Initial', volume: initVol,                          lostUnits: 0 },
    { label: 'Round 1', volume: Math.max(0, initVol - lost1),     lostUnits: lost1 },
    { label: 'Round 2', volume: Math.max(0, initVol - lost1 - lost2), lostUnits: lost2 },
    { label: 'Round 3', volume: Math.max(0, initVol - lost1 - lost2 - lost3), lostUnits: lost3 }
  ].map(r => {
    if (r.volume <= 0) return { ...r, collapsed: true };
    const fixedRate = fmfg / r.volume;
    const totalUnit = fixedRate + vmc;
    return { ...r, fixedRate, totalUnit, collapsed: false };
  });

  const baseTotal = rounds[0].totalUnit || 0;
  const intensityClasses = ['', 'spiral-table__row--mild', 'spiral-table__row--moderate', 'spiral-table__row--severe'];

  const spiralRows = rounds.map((r, i) => {
    if (r.collapsed) {
      return '<tr class="spiral-table__collapsed"><td>' + r.label + '</td>'
        + '<td colspan="4" style="text-align:center;color:var(--color-danger);">Volume reached zero - market collapsed</td></tr>';
    }
    const increase = i === 0 ? '<span class="spiral-base">Baseline</span>' : '<span class="spiral-increase">+' + fmt(r.totalUnit - baseTotal) + '</span>';
    const lostBadge = i > 0 ? ' <span class="spiral-lost">-' + fmtN(r.lostUnits) + ' units lost</span>' : '';
    return '<tr class="' + intensityClasses[i] + '">'
      + '<td>' + r.label + lostBadge + '</td>'
      + '<td>' + fmtN(r.volume) + '</td>'
      + '<td>' + fmt(r.fixedRate) + '</td>'
      + '<td>' + fmt(r.totalUnit) + '</td>'
      + '<td>' + increase + '</td>'
      + '</tr>';
  }).join('');

  const parent = document.getElementById('tool-5');
  const out    = getOrCreate('t5-output', 'div', 'tool-output', parent);

  out.innerHTML = '<div class="spiral-wrap">'
    + '<table class="spiral-table"><thead><tr>'
    + '<th>Scenario</th><th>Remaining Volume</th><th>Fixed Rate/Unit</th><th>Total Unit Cost</th><th>Cost Increase vs. Baseline</th>'
    + '</tr></thead><tbody>' + spiralRows + '</tbody></table>'
    + '<div class="spiral-annotation">As volume shrinks, fixed costs are spread over fewer units, raising the minimum viable price. If the company uses this higher cost to set prices, it becomes less competitive, risking further customer losses.</div>'
    + '</div>'

    + '<div class="lo7-callout-grid">'
    + '<div class="lo7-card"><div class="lo7-card__icon">&#9888;</div>'
    + '<div class="lo7-card__title">Forecasting Risk (LO 7)</div>'
    + '<p>Normal capacity utilization averages demand over 2-3 years, but demand cycles can be permanent. U.S. steel companies in the 1980s assumed a cyclical downturn would reverse - it did not, and many plants closed.</p></div>'

    + '<div class="lo7-card"><div class="lo7-card__icon">&#9992;</div>'
    + '<div class="lo7-card__title">Nonmanufacturing Capacity (LO 7)</div>'
    + '<p>Airlines, hospitals, and railroads face identical unused-capacity cost problems without any inventory to absorb costs. A hospital must still choose practical vs. master-budget capacity to price procedures and evaluate department managers.</p></div>'

    + '<div class="lo7-card"><div class="lo7-card__icon">&#9881;</div>'
    + '<div class="lo7-card__title">ABC and Capacity (LO 7)</div>'
    + '<p>Activity-based costing systems use multiple cost pools such as setups and material handling. For each pool, practical capacity is the correct denominator - it sets the activity rate at the cost of supplying the activity, not the cost of using it.</p></div>'
    + '</div>';

  const validRounds = rounds.filter(r => !r.collapsed);
  const swSteps = [];
  validRounds.forEach(r => {
    swSteps.push({ label: r.label + ' Fixed Rate', formula: 'Fixed Mfg / Remaining Volume', values: fmt(fmfg) + ' / ' + fmtN(r.volume), result: fmt(r.fixedRate) + ' per unit', highlight: r.label !== 'Initial' });
    swSteps.push({ label: r.label + ' Total Unit Cost', formula: 'Fixed Rate + Variable Mfg Cost', values: fmt(r.fixedRate) + ' + ' + fmt(vmc), result: fmt(r.totalUnit) });
  });

  renderShowWork(document.getElementById('t5-show-work'), swSteps, { title: 'Downward Demand Spiral Calculation', defaultOpen: false });
}

function initTool5() {
  document.getElementById('t5-calculate').addEventListener('click', calcTool5);
  initRandomizer('t5-randomize', [
    { id: 't5-fixed-mfg',      min: 400000, max: 3000000, step: 100000, integer: true },
    { id: 't5-var-mfg-cost',   min: 50,     max: 400,     step: 10,     integer: true },
    { id: 't5-initial-volume', min: 5000,   max: 20000,   step: 1000,   integer: true },
    { id: 't5-lost-r1',        min: 500,    max: 3000,    step: 500,    integer: true },
    { id: 't5-lost-r2',        min: 500,    max: 3000,    step: 500,    integer: true },
    { id: 't5-lost-r3',        min: 250,    max: 2000,    step: 250,    integer: true }
  ], calcTool5);
}


// ── Key Terms ─────────────────────────────────────────────────

const KEY_TERMS = [
  { term: 'Absorption Costing',              definition: 'Inventory costing method in which all manufacturing costs, variable and fixed, are included as inventoriable costs. Required for external financial reporting under GAAP.' },
  { term: 'Variable Costing',                definition: 'Inventory costing method in which only variable manufacturing costs are inventoriable. Fixed manufacturing costs are expensed in the period incurred. Also called direct costing.' },
  { term: 'Throughput Costing',              definition: 'Extreme form of variable costing in which only direct materials costs are inventoriable. All other costs including direct labor and variable overhead are period costs. Also called super-variable costing.' },
  { term: 'Direct Costing',                  definition: 'Alternative name for variable costing. A misnomer because variable manufacturing overhead, an indirect cost, is inventoriable under this method.' },
  { term: 'Theoretical Capacity',            definition: 'Level of capacity based on producing at full efficiency all the time. Does not allow for any downtime or interruptions. Represents an idealized upper bound.' },
  { term: 'Practical Capacity',              definition: 'Theoretical capacity reduced for unavoidable interruptions such as scheduled maintenance and holidays. Represents the maximum output a plant can realistically achieve.' },
  { term: 'Normal Capacity Utilization',     definition: 'Capacity level that satisfies average customer demand over 2 to 3 years incorporating seasonal, cyclical, and trend factors. A demand-based measure.' },
  { term: 'Master-Budget Capacity Utilization', definition: 'Expected level of capacity utilization for the current budget period, typically one year. Used for short-run planning and performance evaluation of marketing managers.' },
  { term: 'Production-Volume Variance',      definition: 'Difference between budgeted fixed manufacturing overhead and fixed overhead allocated using the budgeted rate times actual output. Exists only under absorption costing.' },
  { term: 'Downward Demand Spiral',          definition: 'Continuing reduction in demand that occurs when competitor prices are not met. As demand drops, unit costs rise under demand-based costing systems, further reducing competitiveness.' }
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
    div.innerHTML = '<div class="key-term__word">' + item.term + '</div><p class="key-term__definition">' + item.definition + '</p>';
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

// ── CHAPTER COMPLETE ──────────────────────────────────────────────────────────

function injectResetButton(card) {
  if (document.getElementById('ch09-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch09-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch09');
    const markBtn = document.getElementById('mark-complete-btn');
    if (markBtn) {
      markBtn.textContent = 'Mark Chapter Complete';
      markBtn.disabled = false;
      markBtn.classList.remove('btn--success');
    }
    resetBtn.remove();
  });
  card.appendChild(resetBtn);
}

function initChapterComplete() {
  const btn  = document.getElementById('mark-complete-btn');
  const card = document.getElementById('chapter-complete-card');
  if (!btn || !card) return;
  if (isChapterComplete('ch09')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch09');
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    injectResetButton(card);
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTool1();
  initTool2();
  initTool3();
  initTool4();
  initTool5();
  initKeyTerms();
  initChapterComplete();
});
