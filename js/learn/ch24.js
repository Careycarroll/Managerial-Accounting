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

const el   = id => document.getElementById(id);
const val  = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
const sval = id => { const n = el(id); return n ? n.value.trim() : ''; };
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
// TOOL 1 -- ROI vs Residual Income
// ═══════════════════════════════════════════════════════════════════════════

function calcROIvsRI() {
  const currentOI  = val('roi-current-oi');
  const currentInv = val('roi-current-inv');
  const required   = val('roi-required') / 100;
  const newOI      = val('roi-new-oi');
  const newInv     = val('roi-new-inv');

  const currentROI  = currentOI / currentInv;
  const currentRI   = currentOI - required * currentInv;
  const projectROI  = newInv > 0 ? newOI / newInv : 0;
  const projectRI   = newOI - required * newInv;
  const totalOI     = currentOI + newOI;
  const totalInv    = currentInv + newInv;
  const combinedROI = totalOI / totalInv;
  const combinedRI  = totalOI - required * totalInv;

  const roiAccepts = combinedROI > currentROI;
  const riAccepts  = projectRI > 0;

  const out = getOrCreate('roi-output', 'div', 'tool-output', el('roi-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Current Division',
        table(['Metric', 'Value'], [
          ['Operating Income', fmt(currentOI)],
          ['Investment', fmt(currentInv)],
          ['ROI', fmtPct(currentROI * 100)],
          ['Residual Income', fmt(currentRI)]
        ])
      )
    + panel('New Project',
        table(['Metric', 'Value'], [
          ['Operating Income', fmt(newOI)],
          ['Investment', fmt(newInv)],
          ['Project ROI', fmtPct(projectROI * 100)],
          ['Project RI', fmt(projectRI)]
        ])
      )
    + panel('Combined',
        table(['Metric', 'Value'], [
          ['Total OI', fmt(totalOI)],
          ['Total Investment', fmt(totalInv)],
          ['Combined ROI', fmtPct(combinedROI * 100)],
          ['Combined RI', fmt(combinedRI)]
        ])
      )
    + '</div>'
    + verdict(
        roiAccepts === riAccepts
          ? (roiAccepts
              ? 'Both metrics say accept. ROI rises to ' + fmtPct(combinedROI * 100) + ' and RI increases by ' + fmt(projectRI) + '.'
              : 'Both metrics say reject. ROI falls to ' + fmtPct(combinedROI * 100) + ' and project RI is negative at ' + fmt(projectRI) + '.')
          : 'ROI and RI disagree. ROI says ' + (roiAccepts ? 'accept' : 'reject') + '; RI says ' + (riAccepts ? 'accept' : 'reject') + '. The project earns ' + fmtPct(projectROI * 100) + ' which is ' + (projectROI > required ? 'above' : 'below') + ' the required return of ' + fmtPct(required * 100) + '. A manager evaluated on ROI would ' + (roiAccepts ? 'accept' : 'reject') + ' this project; one evaluated on RI would ' + (riAccepts ? 'accept' : 'reject') + ' it.',
        roiAccepts === riAccepts
      )
    + insight('The classic conflict: a project earning more than the required return adds corporate value. RI says accept any project with positive RI. But if the project ROI is below the division ROI, it pulls the average down -- a manager focused on ROI rejects it. Residual income avoids this trap.')
    + '</div>';

  renderShowWork(el('roi-show-work'), [
    { label: 'Current ROI', formula: 'Operating Income / Investment', values: fmt(currentOI) + ' / ' + fmt(currentInv), result: fmtPct(currentROI * 100) },
    { label: 'Current RI', formula: 'OI - (Required Rate x Investment)', values: fmt(currentOI) + ' - (' + fmtPct(required * 100) + ' x ' + fmt(currentInv) + ')', result: fmt(currentRI) },
    { label: 'Project ROI', formula: 'Project OI / Project Investment', values: fmt(newOI) + ' / ' + fmt(newInv), result: fmtPct(projectROI * 100) },
    { label: 'Project RI', formula: 'Project OI - (Required Rate x Project Investment)', values: fmt(newOI) + ' - (' + fmtPct(required * 100) + ' x ' + fmt(newInv) + ')', result: fmt(projectRI), highlight: true },
    { label: 'Combined ROI', formula: 'Total OI / Total Investment', values: fmt(totalOI) + ' / ' + fmt(totalInv), result: fmtPct(combinedROI * 100), highlight: true },
    { label: 'Combined RI', formula: 'Total OI - (Required Rate x Total Investment)', values: fmt(totalOI) + ' - (' + fmtPct(required * 100) + ' x ' + fmt(totalInv) + ')', result: fmt(combinedRI), highlight: true }
  ], { title: 'ROI vs RI', defaultOpen: false });
}

function initROIvsRI() {
  const btn = el('roi-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcROIvsRI);
  el('roi-load-example') && el('roi-load-example').addEventListener('click', () => {
    setVal('roi-current-oi', 240000); setVal('roi-current-inv', 1500000); setVal('roi-required', 12);
    setVal('roi-new-oi', 60000); setVal('roi-new-inv', 400000);
    calcROIvsRI();
  });
  initRandomizer('roi-randomize', [
    { id: 'roi-current-oi',  min: 50000,  max: 500000,  step: 10000, integer: true },
    { id: 'roi-current-inv', min: 500000, max: 3000000, step: 50000, integer: true },
    { id: 'roi-required',    min: 6,      max: 20,      step: 0.5 },
    { id: 'roi-new-oi',      min: 10000,  max: 200000,  step: 5000,  integer: true },
    { id: 'roi-new-inv',     min: 100000, max: 1000000, step: 25000, integer: true }
  ], calcROIvsRI);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 2 -- EVA Calculator
// ═══════════════════════════════════════════════════════════════════════════

function calcEVA() {
  const ebit      = val('eva-ebit');
  const taxRate   = val('eva-tax-rate') / 100;
  const capital   = val('eva-total-capital');
  const wacc      = val('eva-wacc') / 100;
  const reqRI     = val('eva-required-ri') / 100;

  const nopat     = ebit * (1 - taxRate);
  const capCharge = wacc * capital;
  const eva       = nopat - capCharge;
  const simpleRI  = ebit - reqRI * capital;

  const out = getOrCreate('eva-output', 'div', 'tool-output', el('eva-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('NOPAT',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + fmt(nopat) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">EBIT x (1 - Tax Rate)</p>',
        'After-tax operating profit available to all capital providers.'
      )
    + panel('Capital Charge',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' + fmt(capCharge) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">WACC x Total Capital</p>',
        'Minimum required return on all invested capital.'
      )
    + panel('EVA',
        '<div style="font-size:var(--font-size-3xl);font-weight:800;color:' + (eva >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + fmt(eva) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">NOPAT - Capital Charge</p>',
        eva >= 0 ? 'Creating value above cost of capital.' : 'Destroying value -- earning less than cost of capital.'
      )
    + '</div>'
    + insight('EVA vs Simple RI: Simple RI uses pretax income and a generic required rate. EVA uses NOPAT (after-tax) and WACC (the actual blended cost of debt and equity). Simple RI for comparison: <strong>' + fmt(simpleRI) + '</strong>. EVA is generally considered the more accurate measure of true economic value creation.')
    + verdict(eva >= 0 ? 'EVA is positive at <strong>' + fmt(eva) + '</strong>. The division earns more than its cost of capital.' : 'EVA is negative at <strong>' + fmt(eva) + '</strong>. The division does not earn its cost of capital.', eva >= 0)
    + '</div>';

  renderShowWork(el('eva-show-work'), [
    { label: 'NOPAT', formula: 'EBIT x (1 - Tax Rate)', values: fmt(ebit) + ' x (1 - ' + fmtPct(taxRate * 100) + ')', result: fmt(nopat), highlight: true },
    { label: 'Capital Charge', formula: 'WACC x Total Capital', values: fmtPct(wacc * 100) + ' x ' + fmt(capital), result: fmt(capCharge) },
    { label: 'EVA', formula: 'NOPAT - Capital Charge', values: fmt(nopat) + ' - ' + fmt(capCharge), result: fmt(eva), highlight: true },
    { label: 'Simple RI (comparison)', formula: 'EBIT - (Required Rate x Capital)', values: fmt(ebit) + ' - (' + fmtPct(reqRI * 100) + ' x ' + fmt(capital) + ')', result: fmt(simpleRI) }
  ], { title: 'EVA Calculation', defaultOpen: false });
}

function initEVA() {
  const btn = el('eva-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcEVA);
  el('eva-load-example') && el('eva-load-example').addEventListener('click', () => {
    setVal('eva-ebit', 500000); setVal('eva-tax-rate', 25); setVal('eva-total-capital', 3000000);
    setVal('eva-wacc', 10); setVal('eva-required-ri', 10);
    calcEVA();
  });
  initRandomizer('eva-randomize', [
    { id: 'eva-ebit',          min: 100000, max: 2000000, step: 25000,  integer: true },
    { id: 'eva-tax-rate',      min: 15,     max: 35,      step: 1 },
    { id: 'eva-total-capital', min: 500000, max: 8000000, step: 100000, integer: true },
    { id: 'eva-wacc',          min: 6,      max: 16,      step: 0.5 },
    { id: 'eva-required-ri',   min: 6,      max: 16,      step: 0.5 }
  ], calcEVA);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 3 -- DuPont Decomposition
// ═══════════════════════════════════════════════════════════════════════════

function calcDuPont() {
  const aLabel   = sval('dp-a-label') || 'Division A';
  const aRev     = val('dp-a-revenue');
  const aOI      = val('dp-a-oi');
  const aAssets  = val('dp-a-assets');
  const bLabel   = sval('dp-b-label') || 'Division B';
  const bRev     = val('dp-b-revenue');
  const bOI      = val('dp-b-oi');
  const bAssets  = val('dp-b-assets');

  const aMargin   = aRev > 0 ? aOI / aRev : 0;
  const aTurnover = aAssets > 0 ? aRev / aAssets : 0;
  const aROI      = aMargin * aTurnover;
  const bMargin   = bRev > 0 ? bOI / bRev : 0;
  const bTurnover = bAssets > 0 ? bRev / bAssets : 0;
  const bROI      = bMargin * bTurnover;

  const out = getOrCreate('dp-output', 'div', 'tool-output', el('dp-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + panel('DuPont: ' + aLabel + ' vs ' + bLabel,
        table(
          ['Component', aLabel, bLabel],
          [
            ['Revenue', fmt(aRev), fmt(bRev)],
            ['Operating Income', fmt(aOI), fmt(bOI)],
            ['Investment', fmt(aAssets), fmt(bAssets)],
            ['Profit Margin', fmtPct(aMargin * 100), fmtPct(bMargin * 100)],
            ['Asset Turnover', aTurnover.toFixed(2) + 'x', bTurnover.toFixed(2) + 'x'],
            ['ROI (Margin x Turnover)', fmtPct(aROI * 100), fmtPct(bROI * 100)]
          ]
        ),
        'ROI = Profit Margin x Asset Turnover. The same ROI can be achieved through very different strategies.'
      )
    + insight(aLabel + ' achieves ROI through ' + (aMargin > bMargin ? 'higher margins (' + fmtPct(aMargin * 100) + ')' : 'higher turnover (' + aTurnover.toFixed(2) + 'x)') + '. ' + bLabel + ' relies on ' + (bMargin > aMargin ? 'higher margins (' + fmtPct(bMargin * 100) + ')' : 'higher turnover (' + bTurnover.toFixed(2) + 'x)') + '. Two divisions with identical ROI can have completely different business models.')
    + verdict(
        Math.abs(aROI - bROI) < 0.005
          ? aLabel + ' and ' + bLabel + ' have essentially equal ROI but through different strategies.'
          : (aROI > bROI ? aLabel : bLabel) + ' has the higher ROI at ' + fmtPct(Math.max(aROI, bROI) * 100) + '.',
        true
      )
    + '</div>';

  renderShowWork(el('dp-show-work'), [
    { label: aLabel + ' Profit Margin', formula: 'OI / Revenue', values: fmt(aOI) + ' / ' + fmt(aRev), result: fmtPct(aMargin * 100) },
    { label: aLabel + ' Asset Turnover', formula: 'Revenue / Investment', values: fmt(aRev) + ' / ' + fmt(aAssets), result: aTurnover.toFixed(2) + 'x' },
    { label: aLabel + ' ROI', formula: 'Margin x Turnover', values: fmtPct(aMargin * 100) + ' x ' + aTurnover.toFixed(2), result: fmtPct(aROI * 100), highlight: true },
    { label: bLabel + ' Profit Margin', formula: 'OI / Revenue', values: fmt(bOI) + ' / ' + fmt(bRev), result: fmtPct(bMargin * 100) },
    { label: bLabel + ' Asset Turnover', formula: 'Revenue / Investment', values: fmt(bRev) + ' / ' + fmt(bAssets), result: bTurnover.toFixed(2) + 'x' },
    { label: bLabel + ' ROI', formula: 'Margin x Turnover', values: fmtPct(bMargin * 100) + ' x ' + bTurnover.toFixed(2), result: fmtPct(bROI * 100), highlight: true }
  ], { title: 'DuPont Decomposition', defaultOpen: false });
}

function initDuPont() {
  const btn = el('dp-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcDuPont);
  el('dp-load-example') && el('dp-load-example').addEventListener('click', () => {
    setVal('dp-a-label', 'Luxury Goods'); setVal('dp-a-revenue', 2000000); setVal('dp-a-oi', 400000); setVal('dp-a-assets', 2500000);
    setVal('dp-b-label', 'Grocery'); setVal('dp-b-revenue', 10000000); setVal('dp-b-oi', 400000); setVal('dp-b-assets', 2500000);
    calcDuPont();
  });
  initRandomizer('dp-randomize', [
    { id: 'dp-a-revenue', min: 500000,  max: 10000000, step: 100000, integer: true },
    { id: 'dp-a-oi',      min: 50000,   max: 2000000,  step: 25000,  integer: true },
    { id: 'dp-a-assets',  min: 500000,  max: 8000000,  step: 100000, integer: true },
    { id: 'dp-b-revenue', min: 500000,  max: 10000000, step: 100000, integer: true },
    { id: 'dp-b-oi',      min: 50000,   max: 2000000,  step: 25000,  integer: true },
    { id: 'dp-b-assets',  min: 500000,  max: 8000000,  step: 100000, integer: true }
  ], calcDuPont);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Performance Dashboard
// ═══════════════════════════════════════════════════════════════════════════

function calcDashboard() {
  const rate   = val('pd-rate') / 100;
  const tax    = val('pd-tax') / 100;
  const p1Rev  = val('pd-p1-revenue');
  const p1OI   = val('pd-p1-oi');
  const p1Inv  = val('pd-p1-assets');
  const p2Rev  = val('pd-p2-revenue');
  const p2OI   = val('pd-p2-oi');
  const p2Inv  = val('pd-p2-assets');

  function metrics(rev, oi, inv) {
    const roi      = inv > 0 ? oi / inv : 0;
    const ri       = oi - rate * inv;
    const nopat    = oi * (1 - tax);
    const capChg   = rate * inv;
    const eva      = nopat - capChg;
    const margin   = rev > 0 ? oi / rev : 0;
    const turnover = inv > 0 ? rev / inv : 0;
    return { roi, ri, eva, margin, turnover, nopat, capChg };
  }

  const m1 = metrics(p1Rev, p1OI, p1Inv);
  const m2 = metrics(p2Rev, p2OI, p2Inv);
  const revGrowth = p1Rev > 0 ? (p2Rev - p1Rev) / p1Rev : 0;
  const oiGrowth  = p1OI > 0 ? (p2OI - p1OI) / p1OI : 0;

  const out = getOrCreate('pd-output', 'div', 'tool-output', el('pd-calculate').parentElement);

  const colorClass = (v1, v2, higherBetter) => {
    if (Math.abs(v1 - v2) < 0.001) return '';
    return (higherBetter ? v2 > v1 : v2 < v1) ? 'variance-fav' : 'variance-unfav';
  };

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + table(
        ['Metric', 'Period 1', 'Period 2', 'Change'],
        [
          ['Revenue', fmt(p1Rev), fmt(p2Rev), '<span class="' + colorClass(p1Rev, p2Rev, true) + '">' + fmtS(p2Rev - p1Rev) + '</span>'],
          ['Operating Income', fmt(p1OI), fmt(p2OI), '<span class="' + colorClass(p1OI, p2OI, true) + '">' + fmtS(p2OI - p1OI) + '</span>'],
          ['Investment', fmt(p1Inv), fmt(p2Inv), fmtS(p2Inv - p1Inv)],
          ['ROI', fmtPct(m1.roi * 100), fmtPct(m2.roi * 100), '<span class="' + colorClass(m1.roi, m2.roi, true) + '">' + (m2.roi >= m1.roi ? '+' : '') + fmtPct((m2.roi - m1.roi) * 100) + '</span>'],
          ['Residual Income', fmt(m1.ri), fmt(m2.ri), '<span class="' + colorClass(m1.ri, m2.ri, true) + '">' + fmtS(m2.ri - m1.ri) + '</span>'],
          ['EVA', fmt(m1.eva), fmt(m2.eva), '<span class="' + colorClass(m1.eva, m2.eva, true) + '">' + fmtS(m2.eva - m1.eva) + '</span>'],
          ['Profit Margin', fmtPct(m1.margin * 100), fmtPct(m2.margin * 100), '<span class="' + colorClass(m1.margin, m2.margin, true) + '">' + (m2.margin >= m1.margin ? '+' : '') + fmtPct((m2.margin - m1.margin) * 100) + '</span>'],
          ['Asset Turnover', m1.turnover.toFixed(2) + 'x', m2.turnover.toFixed(2) + 'x', '<span class="' + colorClass(m1.turnover, m2.turnover, true) + '">' + (m2.turnover >= m1.turnover ? '+' : '') + (m2.turnover - m1.turnover).toFixed(2) + 'x</span>'],
          ['Revenue Growth', '--', fmtPct(revGrowth * 100), '<span class="' + (revGrowth >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + fmtPct(revGrowth * 100) + '</span>'],
          ['OI Growth', '--', fmtPct(oiGrowth * 100), '<span class="' + (oiGrowth >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + fmtPct(oiGrowth * 100) + '</span>']
        ]
      )
    + insight('No single metric tells the full story. ROI is a percentage that ignores scale. RI and EVA are dollar amounts that reward larger divisions. Profit margin and asset turnover reveal the DuPont strategy. Revenue and OI growth show trajectory. Use all metrics together for a balanced view.')
    + '</div>';

  renderShowWork(el('pd-show-work'), [
    { label: 'Period 1 ROI', formula: 'OI / Investment', values: fmt(p1OI) + ' / ' + fmt(p1Inv), result: fmtPct(m1.roi * 100) },
    { label: 'Period 1 RI', formula: 'OI - (Rate x Investment)', values: fmt(p1OI) + ' - (' + fmtPct(rate * 100) + ' x ' + fmt(p1Inv) + ')', result: fmt(m1.ri) },
    { label: 'Period 1 EVA', formula: 'NOPAT - Capital Charge', values: fmt(m1.nopat) + ' - ' + fmt(m1.capChg), result: fmt(m1.eva) },
    { label: 'Period 2 ROI', formula: 'OI / Investment', values: fmt(p2OI) + ' / ' + fmt(p2Inv), result: fmtPct(m2.roi * 100), highlight: true },
    { label: 'Period 2 RI', formula: 'OI - (Rate x Investment)', values: fmt(p2OI) + ' - (' + fmtPct(rate * 100) + ' x ' + fmt(p2Inv) + ')', result: fmt(m2.ri), highlight: true },
    { label: 'Period 2 EVA', formula: 'NOPAT - Capital Charge', values: fmt(m2.nopat) + ' - ' + fmt(m2.capChg), result: fmt(m2.eva), highlight: true }
  ], { title: 'Performance Dashboard', defaultOpen: false });
}

function initDashboard() {
  const btn = el('pd-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcDashboard);
  el('pd-load-example') && el('pd-load-example').addEventListener('click', () => {
    setVal('pd-rate', 10); setVal('pd-tax', 25);
    setVal('pd-p1-revenue', 5000000); setVal('pd-p1-oi', 500000); setVal('pd-p1-assets', 4000000);
    setVal('pd-p2-revenue', 5500000); setVal('pd-p2-oi', 600000); setVal('pd-p2-assets', 4200000);
    calcDashboard();
  });
  initRandomizer('pd-randomize', [
    { id: 'pd-rate',       min: 6,      max: 16,      step: 0.5 },
    { id: 'pd-tax',        min: 15,     max: 35,      step: 1 },
    { id: 'pd-p1-revenue', min: 1000000, max: 10000000, step: 100000, integer: true },
    { id: 'pd-p1-oi',      min: 50000,  max: 2000000,  step: 25000,  integer: true },
    { id: 'pd-p1-assets',  min: 500000, max: 8000000,  step: 100000, integer: true },
    { id: 'pd-p2-revenue', min: 1000000, max: 10000000, step: 100000, integer: true },
    { id: 'pd-p2-oi',      min: 50000,  max: 2000000,  step: 25000,  integer: true },
    { id: 'pd-p2-assets',  min: 500000, max: 8000000,  step: 100000, integer: true }
  ], calcDashboard);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Compensation Linkage Analyzer
// ═══════════════════════════════════════════════════════════════════════════

function calcComp() {
  const base         = val('comp-base');
  const targetBonusPct = val('comp-target-bonus') / 100;
  const targetBonus  = base * targetBonusPct;

  const roiTarget    = val('comp-roi-target');
  const roiActual    = val('comp-roi-actual');
  const roiWeight    = val('comp-roi-weight') / 100;
  const revTarget    = val('comp-rev-target');
  const revActual    = val('comp-rev-actual');
  const revWeight    = val('comp-rev-weight') / 100;
  const csatTarget   = val('comp-csat-target');
  const csatActual   = val('comp-csat-actual');
  const csatWeight   = val('comp-csat-weight') / 100;

  const totalWeight  = roiWeight + revWeight + csatWeight;

  const roiScore     = roiTarget > 0 ? roiActual / roiTarget : 0;
  const revScore     = revTarget > 0 ? revActual / revTarget : 0;
  const csatScore    = csatTarget > 0 ? csatActual / csatTarget : 0;

  const weightedScore = totalWeight > 0
    ? (roiScore * roiWeight + revScore * revWeight + csatScore * csatWeight) / totalWeight
    : 0;

  const bonusPayout  = targetBonus * weightedScore;
  const totalComp    = base + bonusPayout;

  const out = getOrCreate('comp-output', 'div', 'tool-output', el('comp-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + table(
        ['Metric', 'Target', 'Actual', 'Score', 'Weight', 'Weighted Score'],
        [
          ['ROI (%)', fmtPct(roiTarget), fmtPct(roiActual), fmtPct(roiScore * 100), fmtPct(roiWeight * 100), fmtPct(roiScore * roiWeight * 100)],
          ['Revenue ($M)', revTarget.toFixed(1), revActual.toFixed(1), fmtPct(revScore * 100), fmtPct(revWeight * 100), fmtPct(revScore * revWeight * 100)],
          ['Customer Satisfaction', csatTarget.toFixed(1), csatActual.toFixed(1), fmtPct(csatScore * 100), fmtPct(csatWeight * 100), fmtPct(csatScore * csatWeight * 100)]
        ],
        ['Total', '', '', '', fmtPct(totalWeight * 100), fmtPct(weightedScore * 100)]
      )
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-top:var(--space-4);">'
    + panel('Bonus Calculation',
        '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt(bonusPayout) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">Target bonus ' + fmt(targetBonus) + ' x weighted score ' + fmtPct(weightedScore * 100) + '</p>'
      )
    + panel('Total Compensation',
        '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt(totalComp) + '</div>'
        + '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">Base ' + fmt(base) + ' + Bonus ' + fmt(bonusPayout) + '</p>'
      )
    + '</div>'
    + (Math.abs(totalWeight - 1) > 0.01 ? '<div style="margin-top:var(--space-4);padding:var(--space-3);background:var(--color-warning-bg);border:1px solid var(--color-warning);border-radius:var(--radius-md);color:var(--color-warning);">Warning: metric weights sum to ' + fmtPct(totalWeight * 100) + ', not 100%. Adjust weights to sum to 100%.</div>' : '')
    + insight('Goal congruence check: ROI weight of ' + fmtPct(roiWeight * 100) + ' means ' + fmtPct(roiWeight * 100) + ' of the bonus depends on ROI. If ROI is the dominant metric, managers may reject positive-RI projects that dilute their ROI. A balanced scorecard approach using multiple metrics -- including non-financial measures like customer satisfaction -- reduces this risk.')
    + '</div>';

  renderShowWork(el('comp-show-work'), [
    { label: 'Target Bonus', formula: 'Base Salary x Target Bonus %', values: fmt(base) + ' x ' + fmtPct(targetBonusPct * 100), result: fmt(targetBonus) },
    { label: 'ROI Score', formula: 'Actual ROI / Target ROI', values: fmtPct(roiActual) + ' / ' + fmtPct(roiTarget), result: fmtPct(roiScore * 100) },
    { label: 'Revenue Score', formula: 'Actual Revenue / Target Revenue', values: revActual.toFixed(1) + ' / ' + revTarget.toFixed(1), result: fmtPct(revScore * 100) },
    { label: 'Customer Satisfaction Score', formula: 'Actual / Target', values: csatActual.toFixed(1) + ' / ' + csatTarget.toFixed(1), result: fmtPct(csatScore * 100) },
    { label: 'Weighted Performance Score', formula: 'Sum of (Score x Weight) / Total Weight', values: fmtPct(roiScore * 100) + ' x ' + fmtPct(roiWeight * 100) + ' + ...', result: fmtPct(weightedScore * 100), highlight: true },
    { label: 'Bonus Payout', formula: 'Target Bonus x Weighted Score', values: fmt(targetBonus) + ' x ' + fmtPct(weightedScore * 100), result: fmt(bonusPayout), highlight: true }
  ], { title: 'Compensation Calculation', defaultOpen: false });
}

function initComp() {
  const btn = el('comp-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcComp);
  el('comp-load-example') && el('comp-load-example').addEventListener('click', () => {
    setVal('comp-base', 200000); setVal('comp-target-bonus', 50);
    setVal('comp-roi-target', 15); setVal('comp-roi-actual', 17); setVal('comp-roi-weight', 40);
    setVal('comp-rev-target', 5); setVal('comp-rev-actual', 5.5); setVal('comp-rev-weight', 30);
    setVal('comp-csat-target', 8); setVal('comp-csat-actual', 8.5); setVal('comp-csat-weight', 30);
    calcComp();
  });
  initRandomizer('comp-randomize', [
    { id: 'comp-base',         min: 100000, max: 500000, step: 10000, integer: true },
    { id: 'comp-target-bonus', min: 20,     max: 100,    step: 5 },
    { id: 'comp-roi-target',   min: 8,      max: 25,     step: 0.5 },
    { id: 'comp-roi-actual',   min: 5,      max: 30,     step: 0.5 },
    { id: 'comp-rev-target',   min: 1,      max: 20,     step: 0.5 },
    { id: 'comp-rev-actual',   min: 0.5,    max: 25,     step: 0.5 },
    { id: 'comp-csat-target',  min: 6,      max: 10,     step: 0.1 },
    { id: 'comp-csat-actual',  min: 5,      max: 10,     step: 0.1 }
  ], calcComp);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 6 -- Multinational Performance Comparator
// ═══════════════════════════════════════════════════════════════════════════

function calcMP() {
  const aCountry   = sval('mp-a-country') || 'Country A';
  const aOI        = val('mp-a-oi');
  const aAssets    = val('mp-a-assets');
  const aFX        = val('mp-a-fx');
  const aInflation = val('mp-a-inflation') / 100;
  const aGDP       = val('mp-a-gdp') / 100;
  const bCountry   = sval('mp-b-country') || 'Country B';
  const bOI        = val('mp-b-oi');
  const bAssets    = val('mp-b-assets');
  const bFX        = val('mp-b-fx');
  const bInflation = val('mp-b-inflation') / 100;
  const bGDP       = val('mp-b-gdp') / 100;

  const aOI_usd    = aOI * aFX;
  const aAssets_usd = aAssets * aFX;
  const bOI_usd    = bOI * bFX;
  const bAssets_usd = bAssets * bFX;

  const aROI_local = aAssets > 0 ? aOI / aAssets : 0;
  const bROI_local = bAssets > 0 ? bOI / bAssets : 0;
  const aROI_usd   = aAssets_usd > 0 ? aOI_usd / aAssets_usd : 0;
  const bROI_usd   = bAssets_usd > 0 ? bOI_usd / bAssets_usd : 0;

  const aROI_real  = (1 + aROI_local) / (1 + aInflation) - 1;
  const bROI_real  = (1 + bROI_local) / (1 + bInflation) - 1;
  const aROI_vs_gdp = aROI_local - aGDP;
  const bROI_vs_gdp = bROI_local - bGDP;

  const out = getOrCreate('mp-output', 'div', 'tool-output', el('mp-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + table(
        ['Measure', aCountry, bCountry],
        [
          ['Operating Income (local)', fmtN(aOI), fmtN(bOI)],
          ['Investment (local)', fmtN(aAssets), fmtN(bAssets)],
          ['Exchange Rate to USD', aFX.toFixed(3), bFX.toFixed(3)],
          ['Operating Income (USD)', fmt(aOI_usd), fmt(bOI_usd)],
          ['Investment (USD)', fmt(aAssets_usd), fmt(bAssets_usd)],
          ['ROI (local currency)', fmtPct(aROI_local * 100), fmtPct(bROI_local * 100)],
          ['ROI (USD)', fmtPct(aROI_usd * 100), fmtPct(bROI_usd * 100)],
          ['Local Inflation', fmtPct(aInflation * 100), fmtPct(bInflation * 100)],
          ['Real ROI (inflation-adjusted)', fmtPct(aROI_real * 100), fmtPct(bROI_real * 100)],
          ['Local GDP Growth', fmtPct(aGDP * 100), fmtPct(bGDP * 100)],
          ['ROI vs GDP (economic context)', fmtPct(aROI_vs_gdp * 100), fmtPct(bROI_vs_gdp * 100)]
        ]
      )
    + insight('Key adjustments for multinational comparison: (1) <strong>Currency translation</strong> -- convert to a common currency for comparison. (2) <strong>Inflation adjustment</strong> -- real ROI removes the inflation component that inflates nominal profits. (3) <strong>Economic context</strong> -- ROI vs local GDP growth shows whether the manager is outperforming the local economy. A 12% ROI in a 15% inflation environment is worse than a 10% ROI in a 2% inflation environment.')
    + verdict(
        'Real ROI comparison: ' + aCountry + ' ' + fmtPct(aROI_real * 100) + ' vs ' + bCountry + ' ' + fmtPct(bROI_real * 100) + '. ' + (aROI_real > bROI_real ? aCountry : bCountry) + ' has the higher inflation-adjusted return. ROI vs local GDP: ' + aCountry + ' ' + (aROI_vs_gdp >= 0 ? '+' : '') + fmtPct(aROI_vs_gdp * 100) + ', ' + bCountry + ' ' + (bROI_vs_gdp >= 0 ? '+' : '') + fmtPct(bROI_vs_gdp * 100) + '.',
        true
      )
    + '</div>';

  renderShowWork(el('mp-show-work'), [
    { label: aCountry + ' ROI (local)', formula: 'OI / Investment in local currency', values: fmtN(aOI) + ' / ' + fmtN(aAssets), result: fmtPct(aROI_local * 100) },
    { label: aCountry + ' ROI (USD)', formula: 'OI_USD / Investment_USD', values: fmt(aOI_usd) + ' / ' + fmt(aAssets_usd), result: fmtPct(aROI_usd * 100) },
    { label: aCountry + ' Real ROI', formula: '(1 + ROI) / (1 + Inflation) - 1', values: '(1 + ' + fmtPct(aROI_local * 100) + ') / (1 + ' + fmtPct(aInflation * 100) + ') - 1', result: fmtPct(aROI_real * 100), highlight: true },
    { label: bCountry + ' ROI (local)', formula: 'OI / Investment in local currency', values: fmtN(bOI) + ' / ' + fmtN(bAssets), result: fmtPct(bROI_local * 100) },
    { label: bCountry + ' ROI (USD)', formula: 'OI_USD / Investment_USD', values: fmt(bOI_usd) + ' / ' + fmt(bAssets_usd), result: fmtPct(bROI_usd * 100) },
    { label: bCountry + ' Real ROI', formula: '(1 + ROI) / (1 + Inflation) - 1', values: '(1 + ' + fmtPct(bROI_local * 100) + ') / (1 + ' + fmtPct(bInflation * 100) + ') - 1', result: fmtPct(bROI_real * 100), highlight: true }
  ], { title: 'Multinational Performance', defaultOpen: false });
}

function initMP() {
  const btn = el('mp-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcMP);
  el('mp-load-example') && el('mp-load-example').addEventListener('click', () => {
    setVal('mp-a-country', 'United States'); setVal('mp-a-oi', 500000); setVal('mp-a-assets', 3000000);
    setVal('mp-a-fx', 1); setVal('mp-a-inflation', 3); setVal('mp-a-gdp', 2.5);
    setVal('mp-b-country', 'Brazil'); setVal('mp-b-oi', 2500000); setVal('mp-b-assets', 15000000);
    setVal('mp-b-fx', 0.2); setVal('mp-b-inflation', 8); setVal('mp-b-gdp', 4);
    calcMP();
  });
  initRandomizer('mp-randomize', [
    { id: 'mp-a-oi',        min: 100000,  max: 2000000,  step: 25000, integer: true },
    { id: 'mp-a-assets',    min: 500000,  max: 8000000,  step: 100000, integer: true },
    { id: 'mp-a-fx',        min: 0.5,     max: 2,        step: 0.05 },
    { id: 'mp-a-inflation', min: 1,       max: 15,       step: 0.5 },
    { id: 'mp-a-gdp',       min: 0,       max: 8,        step: 0.5 },
    { id: 'mp-b-oi',        min: 500000,  max: 10000000, step: 100000, integer: true },
    { id: 'mp-b-assets',    min: 1000000, max: 30000000, step: 500000, integer: true },
    { id: 'mp-b-fx',        min: 0.05,    max: 1,        step: 0.05 },
    { id: 'mp-b-inflation', min: 2,       max: 30,       step: 1 },
    { id: 'mp-b-gdp',       min: 0,       max: 10,       step: 0.5 }
  ], calcMP);
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ═══════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Return on Investment (ROI)', definition: 'Operating income divided by investment. A percentage measure that allows comparison across divisions of different sizes. Weakness: may cause managers to reject positive-RI projects that dilute the division ROI.' },
  { term: 'Residual Income (RI)', definition: 'Operating income minus a capital charge (required rate of return times investment). A dollar measure that avoids the ROI rejection problem -- any project with positive RI adds value.' },
  { term: 'Economic Value Added (EVA)', definition: 'NOPAT minus a capital charge using WACC. Refines residual income by using after-tax operating profit and the actual weighted-average cost of capital.' },
  { term: 'NOPAT', definition: 'Net Operating Profit After Tax. Operating income multiplied by (1 - tax rate). Used in EVA to measure after-tax operating performance available to all capital providers.' },
  { term: 'WACC', definition: 'Weighted-Average Cost of Capital. The blended required return on all sources of capital (debt and equity), weighted by their proportions in the capital structure.' },
  { term: 'DuPont Analysis', definition: 'Decomposition of ROI into Profit Margin times Asset Turnover. Reveals whether ROI comes from high margins (differentiation strategy) or high turnover (cost leadership strategy).' },
  { term: 'Profit Margin', definition: 'Operating income divided by revenue. Measures how much of each revenue dollar is converted to operating profit.' },
  { term: 'Asset Turnover', definition: 'Revenue divided by investment. Measures how efficiently assets generate revenue. Also called investment turnover.' },
  { term: 'Investment Center', definition: 'A responsibility center whose manager is held accountable for revenues, costs, and the level of investment in assets used by the center.' },
  { term: 'Goal Congruence', definition: 'Alignment between individual manager incentives and overall organizational objectives. Performance metrics and compensation systems should be designed to foster goal congruence.' },
  { term: 'Capital Charge', definition: 'The minimum required return on invested capital. Equal to the required rate of return multiplied by the investment base. Subtracted from operating income to compute residual income.' },
  { term: 'Real ROI', definition: 'ROI adjusted for inflation. Computed as (1 + Nominal ROI) / (1 + Inflation Rate) - 1. Used in multinational comparisons to remove the effect of inflation on reported performance.' },
  { term: 'Current Cost', definition: 'The cost to replace an asset at current prices, as opposed to historical cost. Using current cost in the investment base produces a more economically meaningful ROI.' },
  { term: 'Historical Cost', definition: 'Original acquisition cost of an asset, less accumulated depreciation. Most commonly used in practice but can distort ROI comparisons between old and new assets.' }
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
  if (el('ch24-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch24-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch24');
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
  const status = el('ch24-status');
  if (!btn || !card) return;
  if (isChapterComplete('ch24')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch24');
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
  initROIvsRI();
  initEVA();
  initDuPont();
  initDashboard();
  initComp();
  initMP();
  initKeyTerms();
  initChapterComplete();
});