import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initSettingsPanel } from '/js/components/settings-panel.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtD   = n => n >= 0 ? fmt(n) : '(' + fmt(n) + ')';
const fmtPct = n => (n * 100).toFixed(1) + '%';
const fmtN   = n => Math.round(n).toLocaleString();
const fmt2   = n => '$' + Math.abs(n).toFixed(2);

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

const el   = id => document.getElementById(id);
const val  = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
const sval = id => { const n = el(id); return n ? n.value.trim() : ''; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

function panel(title, bodyHTML, noteHTML) {
  return '<div style="flex:1 1 300px;min-width:280px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-3);color:var(--color-primary-text);">' + title + '</div>'
    + '<div style="overflow-x:auto;">' + bodyHTML + '</div>'
    + (noteHTML ? '<p style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin:var(--space-3) 0 0;font-style:italic;">' + noteHTML + '</p>' : '')
    + '</div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Joint Cost Allocator
// ══════════════════════════════════════════════════════════════════════════════

function getProducts() {
  const products = [];
  ['a', 'b', 'c'].forEach(key => {
    const name = sval('jc-' + key + '-name');
    const units = val('jc-' + key + '-units');
    if (!name && key === 'c') return;
    if (key === 'c' && !name) return;
    products.push({
      name: name || ('Product ' + key.toUpperCase()),
      units,
      splitoffPrice: val('jc-' + key + '-splitoff-price'),
      finalPrice: val('jc-' + key + '-final-price'),
      sepCost: val('jc-' + key + '-sep-cost'),
    });
  });
  return products;
}

function calcJointCost() {
  const jointCost = val('jc-joint-cost');
  const products  = getProducts();
  const out = getOrCreate('jc-output', 'div', 'tool-output', el('jc-calculate').parentElement);

  if (products.length < 2) {
    out.innerHTML = '<div class="ch12-insight" style="margin-top:var(--space-4);">Enter at least two products to allocate joint costs.</div>';
    return;
  }

  // Sales value at splitoff
  const svTotal = products.reduce((s, p) => s + p.units * p.splitoffPrice, 0);
  const svAlloc = products.map(p => {
    const sv = p.units * p.splitoffPrice;
    const wt = svTotal > 0 ? sv / svTotal : 0;
    return { ...p, sv, wt, alloc: wt * jointCost };
  });

  // NRV method
  const nrvTotal = products.reduce((s, p) => s + (p.units * p.finalPrice - p.sepCost), 0);
  const nrvAlloc = products.map(p => {
    const nrv = p.units * p.finalPrice - p.sepCost;
    const wt  = nrvTotal > 0 ? nrv / nrvTotal : 0;
    return { ...p, nrv, wt, alloc: wt * jointCost };
  });

  // Constant gross margin % NRV
  const totalRevenue   = products.reduce((s, p) => s + p.units * p.finalPrice, 0);
  const totalSepCost   = products.reduce((s, p) => s + p.sepCost, 0);
  const totalCost      = jointCost + totalSepCost;
  const overallGM      = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;
  const cgmAlloc = products.map(p => {
    const rev        = p.units * p.finalPrice;
    const targetGP   = rev * overallGM;
    const alloc      = rev - targetGP - p.sepCost;
    return { ...p, rev, targetGP, alloc };
  });

  function methodTable(rows, cols, totals) {
    const thead = '<thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>';
    const tbody = '<tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
    const tfoot = totals ? '<tfoot><tr>' + totals.map(c => '<td><strong>' + c + '</strong></td>').join('') + '</tr></tfoot>' : '';
    return '<table class="ch12-result-table" style="min-width:360px;width:100%;">' + thead + tbody + tfoot + '</table>';
  }

  const svTable = methodTable(
    svAlloc.map(p => [p.name, fmt(p.sv), fmtPct(p.wt), fmt(p.alloc)]),
    ['Product', 'Sales Value at Splitoff', 'Weight', 'Allocated Joint Cost'],
    ['Total', fmt(svTotal), '100%', fmt(jointCost)]
  );

  const nrvTable = methodTable(
    nrvAlloc.map(p => [p.name, fmt(p.units * p.finalPrice), fmt(p.sepCost), fmt(p.nrv), fmtPct(p.wt), fmt(p.alloc)]),
    ['Product', 'Final Revenue', 'Sep. Cost', 'NRV', 'Weight', 'Allocated Joint Cost'],
    ['Total', fmt(totalRevenue), fmt(totalSepCost), fmt(nrvTotal), '100%', fmt(jointCost)]
  );

  const cgmTable = methodTable(
    cgmAlloc.map(p => [p.name, fmt(p.rev), fmt(p.targetGP), fmt(p.sepCost), fmt(p.alloc)]),
    ['Product', 'Final Revenue', 'Target GP (' + fmtPct(overallGM) + ')', 'Sep. Cost', 'Allocated Joint Cost'],
    ['Total', fmt(totalRevenue), fmt(totalRevenue * overallGM), fmt(totalSepCost), fmt(jointCost)]
  );

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="overflow-x:auto;"><div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Method 1: Sales Value at Splitoff', svTable, 'Allocates based on relative sales value at the splitoff point. Most theoretically sound when market prices exist at splitoff.')
    + panel('Method 2: Net Realizable Value (NRV)', nrvTable, 'Uses final selling price minus separable costs. Used when no market price exists at splitoff.')
    + panel('Method 3: Constant Gross Margin % NRV', cgmTable, 'Forces all products to earn the same gross margin percentage. Allocates joint costs as a residual.')
    + '</div></div>'
    + '<div class="ch12-insight" style="margin-top:var(--space-4);">Overall gross margin percentage: <strong>' + fmtPct(overallGM) + '</strong>. Total revenue: <strong>' + fmt(totalRevenue) + '</strong>. Total costs: <strong>' + fmt(totalCost) + '</strong>.</div>'
    + '</div>';

  renderShowWork(el('jc-show-work'), [
    { label: 'Total Sales Value at Splitoff', formula: 'Sum of (units x splitoff price) for each product', values: svAlloc.map(p => fmtN(p.units) + ' x ' + fmt2(p.splitoffPrice)).join(' + '), result: fmt(svTotal) },
    { label: 'Total NRV', formula: 'Sum of (final revenue - separable costs) for each product', values: nrvAlloc.map(p => '(' + fmt(p.units * p.finalPrice) + ' - ' + fmt(p.sepCost) + ')').join(' + '), result: fmt(nrvTotal) },
    { label: 'Overall Gross Margin %', formula: '(Total Revenue - Total Costs) / Total Revenue', values: '(' + fmt(totalRevenue) + ' - ' + fmt(totalCost) + ') / ' + fmt(totalRevenue), result: fmtPct(overallGM), highlight: true },
    ...svAlloc.map(p => ({ label: p.name + ' -- Sales Value Allocation', formula: 'Weight x Joint Cost', values: fmtPct(p.wt) + ' x ' + fmt(jointCost), result: fmt(p.alloc) })),
    ...nrvAlloc.map(p => ({ label: p.name + ' -- NRV Allocation', formula: 'NRV Weight x Joint Cost', values: fmtPct(p.wt) + ' x ' + fmt(jointCost), result: fmt(p.alloc) })),
  ], { title: 'Joint Cost Allocation Show Work', defaultOpen: false });
}

function initJointCostAllocator() {
  const calcBtn = el('jc-calculate');
  if (!calcBtn) return;
  calcBtn.addEventListener('click', calcJointCost);

  el('jc-load-example') && el('jc-load-example').addEventListener('click', () => {
    setVal('jc-joint-cost', 400000);
    setVal('jc-a-name', 'Butter'); setVal('jc-a-units', 25000); setVal('jc-a-splitoff-price', 8); setVal('jc-a-final-price', 10); setVal('jc-a-sep-cost', 30000);
    setVal('jc-b-name', 'Cream');  setVal('jc-b-units', 10000); setVal('jc-b-splitoff-price', 25); setVal('jc-b-final-price', 30); setVal('jc-b-sep-cost', 20000);
    setVal('jc-c-name', ''); setVal('jc-c-units', 0); setVal('jc-c-splitoff-price', 0); setVal('jc-c-final-price', 0); setVal('jc-c-sep-cost', 0);
    calcJointCost();
  });

  initRandomizer('jc-randomize', [
    { id: 'jc-joint-cost',        min: 100000, max: 1000000, step: 50000,  integer: true },
    { id: 'jc-a-units',           min: 5000,   max: 100000,  step: 5000,   integer: true },
    { id: 'jc-a-splitoff-price',  min: 2,      max: 50,      step: 1 },
    { id: 'jc-a-final-price',     min: 5,      max: 80,      step: 1 },
    { id: 'jc-a-sep-cost',        min: 0,      max: 200000,  step: 10000,  integer: true },
    { id: 'jc-b-units',           min: 2000,   max: 80000,   step: 2000,   integer: true },
    { id: 'jc-b-splitoff-price',  min: 5,      max: 80,      step: 1 },
    { id: 'jc-b-final-price',     min: 8,      max: 120,     step: 1 },
    { id: 'jc-b-sep-cost',        min: 0,      max: 150000,  step: 10000,  integer: true },
  ], calcJointCost);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Sell-or-Process-Further Calculator
// ══════════════════════════════════════════════════════════════════════════════

function calcSellOrProcess() {
  const products = [1, 2, 3].map(i => ({
    name:     sval('sp-p' + i + '-name'),
    units:    val('sp-p' + i + '-units'),
    splitoff: val('sp-p' + i + '-splitoff'),
    final:    val('sp-p' + i + '-final'),
    sep:      val('sp-p' + i + '-sep'),
  })).filter(p => p.name && p.units > 0);

  const out = getOrCreate('sp-output', 'div', 'tool-output', el('sp-calculate').parentElement);

  if (products.length === 0) {
    out.innerHTML = '<div class="ch12-insight" style="margin-top:var(--space-4);">Enter at least one product to analyze.</div>';
    return;
  }

  const rows = products.map(p => {
    const revSplitoff  = p.units * p.splitoff;
    const revFinal     = p.units * p.final;
    const incrRevenue  = revFinal - revSplitoff;
    const incrCost     = p.sep;
    const netBenefit   = incrRevenue - incrCost;
    const shouldProcess = netBenefit > 0;
    return { ...p, revSplitoff, revFinal, incrRevenue, incrCost, netBenefit, shouldProcess };
  });

  const tableRows = rows.map(r =>
    '<tr>'
    + '<td><strong>' + r.name + '</strong></td>'
    + '<td>' + fmt(r.revSplitoff) + '</td>'
    + '<td>' + fmt(r.revFinal) + '</td>'
    + '<td class="' + (r.incrRevenue >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (r.incrRevenue >= 0 ? '+' : '') + fmt(r.incrRevenue) + '</td>'
    + '<td>(' + fmt(r.incrCost) + ')</td>'
    + '<td class="' + (r.netBenefit >= 0 ? 'variance-fav' : 'variance-unfav') + '"><strong>' + (r.netBenefit >= 0 ? '+' : '') + fmt(r.netBenefit) + '</strong></td>'
    + '<td><span style="font-weight:700;color:' + (r.shouldProcess ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + (r.shouldProcess ? 'Process Further' : 'Sell at Splitoff') + '</span></td>'
    + '</tr>'
  ).join('');

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="overflow-x:auto;">'
    + '<table class="ch12-result-table" style="min-width:600px;">'
    + '<thead><tr><th>Product</th><th>Revenue at Splitoff</th><th>Revenue After Processing</th><th>Incremental Revenue</th><th>Separable Cost</th><th>Net Benefit</th><th>Decision</th></tr></thead>'
    + '<tbody>' + tableRows + '</tbody>'
    + '</table>'
    + '</div>'
    + '<div class="ch12-insight" style="margin-top:var(--space-4);">Joint costs are <strong>always irrelevant</strong> to this decision. They are sunk at the splitoff point and will be incurred regardless of whether any product is processed further. Only incremental revenue and incremental separable costs matter.</div>'
    + '</div>';

  renderShowWork(el('sp-show-work'), rows.map(r => ({
    label: r.name + ' -- Net Benefit of Processing Further',
    formula: 'Incremental Revenue - Separable Cost',
    values: '(' + fmt(r.revFinal) + ' - ' + fmt(r.revSplitoff) + ') - ' + fmt(r.sep),
    result: (r.netBenefit >= 0 ? '+' : '') + fmt(r.netBenefit) + ' -- ' + (r.shouldProcess ? 'PROCESS FURTHER' : 'SELL AT SPLITOFF'),
    highlight: true
  })), { title: 'Sell-or-Process-Further Show Work', defaultOpen: false });
}

function initSellOrProcess() {
  const calcBtn = el('sp-calculate');
  if (!calcBtn) return;
  calcBtn.addEventListener('click', calcSellOrProcess);

  el('sp-load-example') && el('sp-load-example').addEventListener('click', () => {
    setVal('sp-p1-name', 'Butter');    setVal('sp-p1-units', 25000); setVal('sp-p1-splitoff', 8);  setVal('sp-p1-final', 10); setVal('sp-p1-sep', 30000);
    setVal('sp-p2-name', 'Cream');     setVal('sp-p2-units', 10000); setVal('sp-p2-splitoff', 25); setVal('sp-p2-final', 30); setVal('sp-p2-sep', 20000);
    setVal('sp-p3-name', ''); setVal('sp-p3-units', 0); setVal('sp-p3-splitoff', 0); setVal('sp-p3-final', 0); setVal('sp-p3-sep', 0);
    calcSellOrProcess();
  });

  initRandomizer('sp-randomize', [
    { id: 'sp-p1-units',    min: 5000,  max: 80000,  step: 5000,  integer: true },
    { id: 'sp-p1-splitoff', min: 2,     max: 40,     step: 1 },
    { id: 'sp-p1-final',    min: 3,     max: 60,     step: 1 },
    { id: 'sp-p1-sep',      min: 0,     max: 200000, step: 10000, integer: true },
    { id: 'sp-p2-units',    min: 2000,  max: 50000,  step: 2000,  integer: true },
    { id: 'sp-p2-splitoff', min: 5,     max: 60,     step: 1 },
    { id: 'sp-p2-final',    min: 6,     max: 80,     step: 1 },
    { id: 'sp-p2-sep',      min: 0,     max: 150000, step: 10000, integer: true },
  ], calcSellOrProcess);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Byproduct Accounting Comparator
// ══════════════════════════════════════════════════════════════════════════════

function calcByproduct() {
  const mainRevenue  = val('bp-main-revenue');
  const jointCost    = val('bp-joint-cost');
  const byName       = sval('bp-by-name') || 'Byproduct';
  const byProduced   = val('bp-by-produced');
  const bySold       = val('bp-by-sold');
  const byPrice      = val('bp-by-price');
  const bySepCost    = val('bp-by-sep-cost');

  const byNRV        = byProduced * (byPrice - bySepCost);
  const byRevSold    = bySold * byPrice;
  const bySepSold    = bySold * bySepCost;

  // Production method -- recognize byproduct NRV at production, reduce joint cost
  const prodJointCostNet = jointCost - byNRV;
  const prodOI = mainRevenue - prodJointCostNet;

  // Sales method -- recognize byproduct revenue only when sold
  const salesOI = mainRevenue + byRevSold - bySepSold - jointCost;

  const out = getOrCreate('bp-output', 'div', 'tool-output', el('bp-calculate').parentElement);

  const prodTable = '<table class="ch12-result-table" style="min-width:300px;width:100%;">'
    + '<tbody>'
    + '<tr><td>Main Product Revenue</td><td>' + fmt(mainRevenue) + '</td></tr>'
    + '<tr><td>Joint Costs</td><td>(' + fmt(jointCost) + ')</td></tr>'
    + '<tr class="variance-fav"><td>' + byName + ' NRV (reduces joint cost)</td><td>+' + fmt(byNRV) + '</td></tr>'
    + '<tr><td>Net Joint Costs</td><td>(' + fmt(prodJointCostNet) + ')</td></tr>'
    + '</tbody>'
    + '<tfoot><tr class="ch12-result-table__total"><td>Operating Income</td><td class="' + (prodOI >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + fmtD(prodOI) + '</td></tr></tfoot>'
    + '</table>';

  const salesTable = '<table class="ch12-result-table" style="min-width:300px;width:100%;">'
    + '<tbody>'
    + '<tr><td>Main Product Revenue</td><td>' + fmt(mainRevenue) + '</td></tr>'
    + '<tr class="variance-fav"><td>' + byName + ' Revenue (' + fmtN(bySold) + ' units sold)</td><td>+' + fmt(byRevSold) + '</td></tr>'
    + '<tr><td>' + byName + ' Separable Costs (sold units)</td><td>(' + fmt(bySepSold) + ')</td></tr>'
    + '<tr><td>Joint Costs</td><td>(' + fmt(jointCost) + ')</td></tr>'
    + '</tbody>'
    + '<tfoot><tr class="ch12-result-table__total"><td>Operating Income</td><td class="' + (salesOI >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + fmtD(salesOI) + '</td></tr></tfoot>'
    + '</table>';

  const unsoldUnits = byProduced - bySold;
  const timingDiff  = prodOI - salesOI;

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="overflow-x:auto;"><div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Production Method', prodTable, 'Byproduct NRV recognized at production. Reduces joint cost allocated to main products. Inventory of unsold byproduct carried at NRV.')
    + panel('Sales Method', salesTable, 'Byproduct revenue recognized only when sold. Simpler but delays income recognition. More conservative.')
    + '</div></div>'
    + '<div class="ch12-insight" style="margin-top:var(--space-4);">'
    + 'Unsold byproduct units: <strong>' + fmtN(unsoldUnits) + '</strong>. '
    + 'Income difference (Production minus Sales method): <strong>' + (timingDiff >= 0 ? '+' : '') + fmt(timingDiff) + '</strong>. '
    + (Math.abs(timingDiff) < 1 ? 'Methods produce the same income when all byproduct is sold.' : 'The production method reports higher income this period because it recognizes the NRV of unsold byproduct inventory.')
    + '</div>'
    + '</div>';

  renderShowWork(el('bp-show-work'), [
    { label: byName + ' NRV (Production Method)', formula: 'Units Produced x (Price - Separable Cost per unit)', values: fmtN(byProduced) + ' x (' + fmt2(byPrice) + ' - ' + fmt2(bySepCost) + ')', result: fmt(byNRV) },
    { label: 'Production Method: Net Joint Cost', formula: 'Joint Cost - Byproduct NRV', values: fmt(jointCost) + ' - ' + fmt(byNRV), result: fmt(prodJointCostNet) },
    { label: 'Production Method: Operating Income', formula: 'Main Revenue - Net Joint Cost', values: fmt(mainRevenue) + ' - ' + fmt(prodJointCostNet), result: fmtD(prodOI), highlight: true },
    { label: byName + ' Revenue Sold (Sales Method)', formula: 'Units Sold x Price', values: fmtN(bySold) + ' x ' + fmt2(byPrice), result: fmt(byRevSold) },
    { label: 'Sales Method: Operating Income', formula: 'Main Revenue + Byproduct Revenue - Byproduct Sep Cost - Joint Cost', values: fmt(mainRevenue) + ' + ' + fmt(byRevSold) + ' - ' + fmt(bySepSold) + ' - ' + fmt(jointCost), result: fmtD(salesOI), highlight: true },
    { label: 'Timing Difference', formula: 'Production OI - Sales OI', values: fmtD(prodOI) + ' - ' + fmtD(salesOI), result: (timingDiff >= 0 ? '+' : '') + fmt(timingDiff), note: 'Difference equals NRV of unsold byproduct inventory' }
  ], { title: 'Byproduct Accounting Show Work', defaultOpen: false });
}

function initByproductComparator() {
  const calcBtn = el('bp-calculate');
  if (!calcBtn) return;
  calcBtn.addEventListener('click', calcByproduct);

  el('bp-load-example') && el('bp-load-example').addEventListener('click', () => {
    setVal('bp-main-revenue', 500000);
    setVal('bp-joint-cost', 400000);
    setVal('bp-by-name', 'Buttermilk');
    setVal('bp-by-produced', 10000);
    setVal('bp-by-sold', 8000);
    setVal('bp-by-price', 2);
    setVal('bp-by-sep-cost', 0.50);
    calcByproduct();
  });

  initRandomizer('bp-randomize', [
    { id: 'bp-main-revenue',  min: 100000, max: 2000000, step: 50000,  integer: true },
    { id: 'bp-joint-cost',    min: 50000,  max: 1500000, step: 50000,  integer: true },
    { id: 'bp-by-produced',   min: 1000,   max: 50000,   step: 1000,   integer: true },
    { id: 'bp-by-sold',       min: 500,    max: 40000,   step: 500,    integer: true },
    { id: 'bp-by-price',      min: 0.50,   max: 20,      step: 0.25 },
    { id: 'bp-by-sep-cost',   min: 0,      max: 5,       step: 0.10 },
  ], calcByproduct);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Process Flow Visualizer
// ══════════════════════════════════════════════════════════════════════════════

function buildProcessFlow() {
  const processName = sval('pf-process-name') || 'Joint Process';
  const jointCost   = val('pf-joint-cost');

  const products = [1, 2, 3].map(i => {
    const name = sval('pf-p' + i + '-name');
    if (!name) return null;
    return {
      name,
      type:     el('pf-p' + i + '-type') ? el('pf-p' + i + '-type').value : 'main',
      units:    val('pf-p' + i + '-units'),
      splitoff: val('pf-p' + i + '-splitoff'),
      sep:      val('pf-p' + i + '-sep'),
      final:    val('pf-p' + i + '-final'),
    };
  }).filter(Boolean);

  const out = getOrCreate('pf-output', 'div', 'tool-output', el('pf-visualize').parentElement);

  if (products.length === 0) {
    out.innerHTML = '<div class="ch12-insight" style="margin-top:var(--space-4);">Enter at least one product to visualize.</div>';
    return;
  }

  const mainProducts = products.filter(p => p.type === 'main');
  const byproducts   = products.filter(p => p.type === 'byproduct');

  const totalSplitoffValue = products.reduce((s, p) => s + p.units * p.splitoff, 0);
  const totalFinalRevenue  = products.reduce((s, p) => s + p.units * p.final, 0);
  const totalSepCost       = products.reduce((s, p) => s + p.sep, 0);

  function productCard(p, color) {
    const splitoffRev = p.units * p.splitoff;
    const finalRev    = p.units * p.final;
    const nrv         = finalRev - p.sep;
    return '<div style="flex:1 1 180px;min-width:160px;background:' + color + ';border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--font-size-sm);">'
      + '<div style="font-weight:700;margin-bottom:var(--space-2);">' + p.name + (p.type === 'byproduct' ? ' <span style="font-size:var(--font-size-xs);opacity:0.7;">(byproduct)</span>' : '') + '</div>'
      + '<div>Units: <strong>' + fmtN(p.units) + '</strong></div>'
      + '<div>Splitoff value: <strong>' + fmt(splitoffRev) + '</strong></div>'
      + (p.sep > 0 ? '<div style="margin-top:var(--space-1);padding-top:var(--space-1);border-top:1px solid rgba(255,255,255,0.3);">Sep. cost: <strong>' + fmt(p.sep) + '</strong></div>' : '')
      + (p.sep > 0 ? '<div>Final revenue: <strong>' + fmt(finalRev) + '</strong></div>' : '')
      + (p.sep > 0 ? '<div>NRV: <strong>' + fmt(nrv) + '</strong></div>' : '')
      + '</div>';
  }

  const mainCards   = mainProducts.map(p => productCard(p, 'var(--color-primary)')).join('');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const byCards     = byproducts.map(p => productCard(p, isDark ? 'var(--color-gray-200)' : 'var(--color-gray-500)')).join('');

  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<div style="text-align:center;margin-bottom:var(--space-6);">'

    + '<div style="display:inline-block;background:var(--color-accent);color:#fff;border-radius:var(--radius-md);padding:var(--space-3) var(--space-6);font-weight:700;font-size:var(--font-size-lg);">'
    + 'Raw Inputs'
    + '</div>'

    + '<div style="font-size:var(--font-size-2xl);color:var(--color-gray-400);margin:var(--space-2) 0;">&#8595;</div>'

    + '<div style="display:inline-block;background:var(--color-primary);color:#fff;border-radius:var(--radius-md);padding:var(--space-4) var(--space-6);font-weight:700;">'
    + '<div style="font-size:var(--font-size-lg);">' + processName + '</div>'
    + '<div style="font-size:var(--font-size-sm);opacity:0.85;margin-top:var(--space-1);">Joint Costs: ' + fmt(jointCost) + '</div>'
    + '</div>'

    + '<div style="font-size:var(--font-size-2xl);color:var(--color-gray-400);margin:var(--space-2) 0;">&#8595;</div>'

    + '<div style="display:inline-block;background:var(--color-accent);color:#fff;border-radius:var(--radius-md);padding:var(--space-2) var(--space-5);font-weight:700;">'
    + 'Splitoff Point'
    + '</div>'

    + '<div style="font-size:var(--font-size-2xl);color:var(--color-gray-400);margin:var(--space-2) 0;">&#8595;</div>'

    + '</div>'

    + (mainProducts.length > 0 ? '<div style="margin-bottom:var(--space-3);"><p class="ch9-section-label">Main Products</p><div style="display:flex;flex-wrap:wrap;gap:var(--space-3);color:#fff;">' + mainCards + '</div></div>' : '')
    + (byproducts.length > 0   ? '<div style="margin-top:var(--space-4);"><p class="ch9-section-label">Byproducts</p><div style="display:flex;flex-wrap:wrap;gap:var(--space-3);color:#fff;">' + byCards + '</div></div>' : '')

    + '<div class="ch12-insight" style="margin-top:var(--space-5);">'
    + 'Total splitoff value: <strong>' + fmt(totalSplitoffValue) + '</strong> | '
    + 'Total separable costs: <strong>' + fmt(totalSepCost) + '</strong> | '
    + 'Total final revenue: <strong>' + fmt(totalFinalRevenue) + '</strong>'
    + '</div>'
    + '</div>';
}

function initProcessFlow() {
  const vizBtn = el('pf-visualize');
  if (!vizBtn) return;
  vizBtn.addEventListener('click', buildProcessFlow);

  el('pf-load-example') && el('pf-load-example').addEventListener('click', () => {
    setVal('pf-process-name', 'Dairy Processing');
    setVal('pf-joint-cost', 400000);
    setVal('pf-p1-name', 'Butter');    setVal('pf-p1-units', 25000); setVal('pf-p1-splitoff', 8);  setVal('pf-p1-sep', 30000); setVal('pf-p1-final', 10);
    setVal('pf-p2-name', 'Cream');     setVal('pf-p2-units', 10000); setVal('pf-p2-splitoff', 25); setVal('pf-p2-sep', 20000); setVal('pf-p2-final', 30);
    setVal('pf-p3-name', 'Buttermilk'); setVal('pf-p3-units', 10000); setVal('pf-p3-splitoff', 2); setVal('pf-p3-sep', 5000);  setVal('pf-p3-final', 2.50);
    if (el('pf-p1-type')) el('pf-p1-type').value = 'main';
    if (el('pf-p2-type')) el('pf-p2-type').value = 'main';
    if (el('pf-p3-type')) el('pf-p3-type').value = 'byproduct';
    buildProcessFlow();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Joint Costs', definition: 'Costs of a single process that yields multiple products simultaneously. Cannot be traced to individual products before the splitoff point.' },
  { term: 'Splitoff Point', definition: 'The juncture in a joint production process where two or more products become separately identifiable.' },
  { term: 'Joint Products', definition: 'Two or more products that have relatively high sales value and are not separately identifiable as individual products until the splitoff point.' },
  { term: 'Byproduct', definition: 'A product from a joint production process that has low total sales value compared with the total sales value of the main products.' },
  { term: 'Separable Costs', definition: 'Costs incurred beyond the splitoff point that can be attributed to individual products. These are relevant to sell-or-process-further decisions.' },
  { term: 'Sales Value at Splitoff Method', definition: 'Allocates joint costs based on the relative sales value of each product at the splitoff point. Considered the most theoretically sound method.' },
  { term: 'Net Realizable Value (NRV) Method', definition: 'Allocates joint costs based on the relative NRV (final selling price minus separable costs) of each product. Used when no market price exists at splitoff.' },
  { term: 'Constant Gross Margin % NRV Method', definition: 'Allocates joint costs so that all products earn the same gross margin percentage. Treats joint cost allocation as a residual.' },
  { term: 'Sell-or-Process-Further Decision', definition: 'A decision about whether to sell a product at the splitoff point or process it further. Joint costs are always irrelevant -- only incremental revenues and separable costs matter.' },
  { term: 'Production Method (Byproducts)', definition: 'Recognizes byproduct NRV at the time of production, reducing the joint costs allocated to main products.' },
  { term: 'Sales Method (Byproducts)', definition: 'Recognizes byproduct revenue only when the byproduct is sold. More conservative and simpler than the production method.' },
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
  if (el('ch17-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch17-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch17');
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
  const btn    = el('mark-complete-btn');
  const card   = el('chapter-complete');
  const status = el('ch17-status');
  if (!btn || !card) return;

  if (isChapterComplete('ch17')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }

  btn.addEventListener('click', () => {
    markChapterComplete('ch17');
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
  initJointCostAllocator();
  initSellOrProcess();
  initByproductComparator();
  initProcessFlow();
  initKeyTerms();
  initChapterComplete();
});
