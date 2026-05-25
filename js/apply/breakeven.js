import { initHeader } from '/js/components/header.js';
import { renderShowWork } from '/js/components/show-work.js';
import { CVPChart } from '/js/charts/cvp-chart.js';

const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (Math.round(n * 10) / 10).toFixed(1) + '%';

const el  = id => document.getElementById(id);
const val = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

let cvpChart = null;

function initDepthToggle() {
  const buttons = document.querySelectorAll('.depth-btn');
  buttons.forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('depth-btn--active'));
      btn.classList.add('depth-btn--active');
      const depth = btn.dataset.depth;
      document.querySelectorAll('.depth-panel').forEach(p => {
        p.classList.toggle('depth-panel--active', p.id === 'depth-' + depth);
      });
    });
  });
}

function initScenario() {
  const useBtn = el('scenario-use-btn');
  if (useBtn) {
    useBtn.addEventListener('click', () => {
      setVal('c-price', 50); setVal('c-vc', 30); setVal('c-fc', 100000);
      setVal('c-target', 40000); setVal('c-actual', 8000);
      el('scenario-card').style.display = 'none';
      calcConcept();
    });
  }
  const toggle = el('scenario-toggle');
  const body   = el('scenario-body');
  if (toggle && body) {
    toggle.addEventListener('click', () => {
      const open = body.style.display === 'none';
      body.style.display = open ? '' : 'none';
      toggle.textContent = open ? 'Hide scenario' : 'Show scenario';
    });
  }
}

function plainVerdict(price, vc, fc, actual, cm, beUnits, actualOI, mosUnits, mosPct, operatingLeverage) {
  if (actualOI >= 0) {
    const safetyMsg = mosPct >= 0.3
      ? 'Sales would have to fall by more than <strong>' + fmtPct(mosPct * 100) + '</strong> before you lose money -- a comfortable cushion.'
      : mosPct >= 0.1
        ? 'You have a <strong>' + fmtPct(mosPct * 100) + '</strong> margin of safety -- moderate. A significant sales shortfall would push you into a loss.'
        : 'Your margin of safety is only <strong>' + fmtPct(mosPct * 100) + '</strong> -- thin. A small drop in volume would eliminate your profit.';
    const leverageMsg = operatingLeverage > 1
      ? ' For every <strong>1% increase in sales</strong>, operating income grows <strong>' + fmtPct(operatingLeverage) + '</strong>.'
      : '';
    return '<div style="margin-top:var(--space-4);padding:var(--space-5);border-radius:var(--radius-lg);background:var(--color-success-bg);border:1px solid var(--color-success);">'
      + '<div style="font-size:var(--font-size-lg);font-weight:700;color:var(--color-success);margin-bottom:var(--space-3);">This product is profitable at your expected volume.</div>'
      + '<p style="margin:0 0 var(--space-2);">At <strong>' + fmtN(actual) + ' units</strong> you earn <strong>' + fmt(actualOI) + '</strong> in operating income. '
      + 'You need <strong>' + fmtN(Math.ceil(beUnits)) + ' units</strong> to break even -- you are <strong>' + fmtN(Math.round(mosUnits)) + ' units above that</strong>. '
      + safetyMsg + leverageMsg + '</p>'
      + '</div>';
  } else {
    const shortfall    = Math.ceil(beUnits) - actual;
    const priceNeeded  = fc / actual + vc;
    const costCutNeeded = Math.abs(actualOI);
    return '<div style="margin-top:var(--space-4);padding:var(--space-5);border-radius:var(--radius-lg);background:var(--color-danger-bg);border:1px solid var(--color-danger);">'
      + '<div style="font-size:var(--font-size-lg);font-weight:700;color:var(--color-danger);margin-bottom:var(--space-3);">You are not breaking even at this volume.</div>'
      + '<p style="margin:0 0 var(--space-2);">At <strong>' + fmtN(actual) + ' units</strong> you lose <strong>' + fmt(Math.abs(actualOI)) + '</strong>. '
      + 'You need <strong>' + fmtN(shortfall) + ' more units</strong> to break even.</p>'
      + '<p style="margin:0;">To fix this: raise price to at least <strong>' + fmt(priceNeeded) + '</strong>, '
      + 'cut fixed costs by <strong>' + fmt(costCutNeeded) + '</strong>, '
      + 'or sell <strong>' + fmtN(shortfall) + '</strong> more units.</p>'
      + '</div>';
  }
}

function renderWhatIf(price, vc, fc, actual, baseOI) {
  const scenarios = [
    { label: 'Price -10%',       newPrice: price * 0.9, newVC: vc,  newFC: fc,       newActual: actual },
    { label: 'Fixed Costs +20%', newPrice: price,       newVC: vc,  newFC: fc * 1.2, newActual: actual },
    { label: 'Volume -30%',      newPrice: price,       newVC: vc,  newFC: fc,       newActual: actual * 0.7 }
  ];
  const cards = scenarios.map(s => {
    const newCM  = s.newPrice - s.newVC;
    const newBE  = newCM > 0 ? s.newFC / newCM : Infinity;
    const newOI  = s.newActual * newCM - s.newFC;
    const delta  = newOI - baseOI;
    return '<div style="flex:1 1 180px;min-width:160px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
      + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">' + s.label + '</div>'
      + '<div style="font-size:var(--font-size-xl);font-weight:800;color:' + (newOI >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + fmt(newOI) + '</div>'
      + '<div style="font-size:var(--font-size-xs);color:' + (delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';margin-top:var(--space-1);">' + (delta >= 0 ? '+' : '') + fmt(delta) + ' vs base</div>'
      + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-top:var(--space-1);">BE: ' + (isFinite(newBE) ? fmtN(Math.ceil(newBE)) + ' units' : 'Never') + '</div>'
      + '</div>';
  }).join('');
  return '<div style="margin-top:var(--space-5);">'
    + '<div style="font-size:var(--font-size-sm);font-weight:700;color:var(--color-primary-text);margin-bottom:var(--space-3);">What-If Scenarios</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">' + cards + '</div>'
    + '</div>';
}

function renderChart(price, vc, fc, beUnits, actual) {
  const container = el('c-chart-container');
  const canvas    = el('c-cvp-canvas');
  if (!container || !canvas) return;
  container.style.display = '';
  const maxUnits = Math.max(actual * 1.5, beUnits * 1.8, 1000);
  if (cvpChart) {
    cvpChart.update({ sellingPrice: price, variableCost: vc, fixedCosts: fc, maxUnits, currentUnits: actual });
  } else {
    cvpChart = new CVPChart(canvas, { sellingPrice: price, variableCost: vc, fixedCosts: fc, maxUnits, currentUnits: actual });
  }
}

function calcConcept() {
  const price  = val('c-price');
  const vc     = val('c-vc');
  const fc     = val('c-fc');
  const target = val('c-target');
  const actual = val('c-actual');
  const cm     = price - vc;
  const cmr    = price > 0 ? cm / price : 0;
  const out    = el('c-output');

  if (cm <= 0) {
    out.innerHTML = '<div style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-danger-bg);border:1px solid var(--color-danger);color:var(--color-danger);">Variable cost equals or exceeds selling price. No volume of sales will cover fixed costs.</div>';
    return;
  }

  const beUnits           = fc / cm;
  const beRevenue         = beUnits * price;
  const targetUnits       = (fc + target) / cm;
  const targetRevenue     = targetUnits * price;
  const actualOI          = actual * cm - fc;
  const mosUnits          = actual - beUnits;
  const mosPct            = actual > 0 ? mosUnits / actual : 0;
  const operatingLeverage = actualOI > 0 ? (actual * cm) / actualOI : 0;

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-4);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Breakeven Point</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmtN(Math.ceil(beUnits)) + ' units</div><div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' + fmt(beRevenue) + ' revenue</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">To Hit Target Profit</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmtN(Math.ceil(targetUnits)) + ' units</div><div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' + fmt(targetRevenue) + ' revenue</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Contribution Margin</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt(cm) + ' / unit</div><div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' + fmtPct(cmr * 100) + ' CM ratio</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Margin of Safety</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:' + (mosUnits >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + fmtN(Math.round(mosUnits)) + ' units</div><div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' + fmtPct(mosPct * 100) + ' of expected sales</div></div>'
    + '</div>'
    + plainVerdict(price, vc, fc, actual, cm, beUnits, actualOI, mosUnits, mosPct, operatingLeverage)
    + renderWhatIf(price, vc, fc, actual, actualOI)
    + '</div>';

  renderShowWork(out, [
    { label: 'Contribution Margin per Unit', formula: 'Selling Price - Variable Cost', values: fmt(price) + ' - ' + fmt(vc), result: fmt(cm) },
    { label: 'CM Ratio', formula: 'CM per Unit / Selling Price', values: fmt(cm) + ' / ' + fmt(price), result: fmtPct(cmr * 100) },
    { label: 'Breakeven Units', formula: 'Fixed Costs / CM per Unit', values: fmt(fc) + ' / ' + fmt(cm), result: fmtN(Math.ceil(beUnits)) + ' units', highlight: true },
    { label: 'Breakeven Revenue', formula: 'Breakeven Units x Selling Price', values: fmtN(Math.ceil(beUnits)) + ' x ' + fmt(price), result: fmt(beRevenue) },
    { label: 'Units for Target Profit', formula: '(Fixed Costs + Target Profit) / CM per Unit', values: '(' + fmt(fc) + ' + ' + fmt(target) + ') / ' + fmt(cm), result: fmtN(Math.ceil(targetUnits)) + ' units', highlight: true },
    { label: 'Operating Income at Expected Sales', formula: '(Units x CM) - Fixed Costs', values: '(' + fmtN(actual) + ' x ' + fmt(cm) + ') - ' + fmt(fc), result: fmt(actualOI), highlight: true },
    { label: 'Margin of Safety', formula: 'Expected Sales - Breakeven Units', values: fmtN(actual) + ' - ' + fmtN(Math.ceil(beUnits)), result: fmtN(Math.round(mosUnits)) + ' units (' + fmtPct(mosPct * 100) + ')' },
    { label: 'Operating Leverage', formula: 'Contribution Margin / Operating Income', values: fmt(actual * cm) + ' / ' + fmt(actualOI), result: operatingLeverage.toFixed(1) + 'x' }
  ], { title: 'CVP Show Work', defaultOpen: false });

  renderChart(price, vc, fc, beUnits, actual);
}

function calcAnalysis() {
  const price    = val('a-price');
  const vc       = val('a-vc');
  const fc       = val('a-fc');
  const target   = val('a-target');
  const actual   = val('a-actual');
  const taxRate  = val('a-tax') / 100;
  const sensLow  = val('a-sens-low');
  const sensHigh = val('a-sens-high');
  const sensStep = Math.max(1, val('a-sens-step'));
  const cm       = price - vc;
  const out      = el('a-output');

  if (cm <= 0) {
    out.innerHTML = '<div style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-danger-bg);border:1px solid var(--color-danger);color:var(--color-danger);">Variable cost equals or exceeds selling price.</div>';
    return;
  }

  const beUnits        = fc / cm;
  const targetUnits    = (fc + target) / cm;
  const afterTaxTarget = taxRate < 1 ? target / (1 - taxRate) : target;
  const afterTaxUnits  = (fc + afterTaxTarget) / cm;
  const actualOI       = actual * cm - fc;
  const mosUnits       = actual - beUnits;
  const mosPct         = actual > 0 ? mosUnits / actual : 0;
  const revenue        = actual * price;
  const totalVC        = actual * vc;
  const totalCM        = actual * cm;
  const ebit           = totalCM - fc;
  const tax            = Math.max(0, ebit * taxRate);
  const niat           = ebit - tax;

  const prices = [];
  for (let p = sensLow; p <= sensHigh + 0.001; p += sensStep) prices.push(Math.round(p * 100) / 100);

  const sensRows = prices.map(p => {
    const c = p - vc;
    if (c <= 0) return ['<strong>' + fmt(p) + '</strong>', '--', '--', '--', '--'];
    const be  = fc / c;
    const oi  = actual * c - fc;
    const mos = actual > 0 ? (actual - be) / actual : 0;
    const isBase = Math.abs(p - price) < 0.01;
    return [
      (isBase ? '<strong>' : '') + fmt(p) + (isBase ? ' (base)</strong>' : ''),
      fmt(c) + ' (' + fmtPct(c / p * 100) + ')',
      fmtN(Math.ceil(be)),
      fmt(oi),
      fmtPct(mos * 100)
    ];
  });

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Income Statement at ' + fmtN(actual) + ' Units</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);"><tbody>'
    + '<tr><td>Revenue (' + fmtN(actual) + ' x ' + fmt(price) + ')</td><td style="text-align:right;">' + fmt(revenue) + '</td></tr>'
    + '<tr><td>Variable Costs (' + fmtN(actual) + ' x ' + fmt(vc) + ')</td><td style="text-align:right;">(' + fmt(totalVC) + ')</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Contribution Margin</td><td style="text-align:right;">' + fmt(totalCM) + '</td></tr>'
    + '<tr><td>Fixed Costs</td><td style="text-align:right;">(' + fmt(fc) + ')</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Operating Income (EBIT)</td><td style="text-align:right;">' + fmt(ebit) + '</td></tr>'
    + '<tr><td>Tax (' + fmtPct(taxRate * 100) + ')</td><td style="text-align:right;">(' + fmt(tax) + ')</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Net Income After Tax</td><td style="text-align:right;">' + fmt(niat) + '</td></tr>'
    + '</tbody></table></div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Breakeven</div><strong>' + fmtN(Math.ceil(beUnits)) + ' units</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Target (pretax)</div><strong>' + fmtN(Math.ceil(targetUnits)) + ' units</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Target (after-tax)</div><strong>' + fmtN(Math.ceil(afterTaxUnits)) + ' units</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Margin of Safety</div><strong>' + fmtPct(mosPct * 100) + '</strong></div>'
    + '</div>'
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Sensitivity: Breakeven at Different Prices</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">'
    + '<thead><tr><th>Price</th><th>CM per Unit</th><th>Breakeven Units</th><th>OI at ' + fmtN(actual) + ' units</th><th>Margin of Safety</th></tr></thead>'
    + '<tbody>' + sensRows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>'
    + '</table></div>'
    + '<div style="margin-top:var(--space-4);padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);border:1px solid var(--color-gray-200);font-size:var(--font-size-sm);color:var(--color-gray-600);">A small price increase has an outsized effect on breakeven because fixed costs do not change. Every extra dollar of price goes directly to contribution margin.</div>'
    + '</div>';
}

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();
  initScenario();
  el('c-calculate') && el('c-calculate').addEventListener('click', calcConcept);
  el('c-rand-profitable') && el('c-rand-profitable').addEventListener('click', () => {
    const price = Math.round(40 + Math.random() * 60);
    const vc    = Math.round(price * (0.3 + Math.random() * 0.25));
    const fc    = Math.round((50000 + Math.random() * 150000) / 1000) * 1000;
    const cm    = price - vc;
    const be    = Math.ceil(fc / cm);
    const units = Math.round(be * (1.3 + Math.random() * 0.7));
    setVal('c-price', price); setVal('c-vc', vc); setVal('c-fc', fc);
    setVal('c-actual', units); setVal('c-target', Math.round(fc * 0.3 / 1000) * 1000);
    calcConcept();
  });
  el('c-rand-unprofitable') && el('c-rand-unprofitable').addEventListener('click', () => {
    const price = Math.round(40 + Math.random() * 60);
    const vc    = Math.round(price * (0.3 + Math.random() * 0.25));
    const fc    = Math.round((50000 + Math.random() * 150000) / 1000) * 1000;
    const cm    = price - vc;
    const be    = Math.ceil(fc / cm);
    const units = Math.round(be * (0.4 + Math.random() * 0.45));
    setVal('c-price', price); setVal('c-vc', vc); setVal('c-fc', fc);
    setVal('c-actual', units); setVal('c-target', Math.round(fc * 0.3 / 1000) * 1000);
    calcConcept();
  });
  el('a-calculate') && el('a-calculate').addEventListener('click', calcAnalysis);
});
