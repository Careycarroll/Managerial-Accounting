import { initHeader } from '/js/components/header.js';
import { renderShowWork } from '/js/components/show-work.js';

const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (Math.round(n * 10) / 10).toFixed(1) + '%';

const el  = id => document.getElementById(id);
const val = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };

function insight(text) {
  return '<div class="ch12-insight" style="margin-top:var(--space-4);">' + text + '</div>';
}

function verdict(text, positive) {
  return '<div class="ch12-verdict ' + (positive ? 'ch12-verdict--positive' : 'ch12-verdict--negative') + '">' + text + '</div>';
}

// ── Depth toggle ──────────────────────────────────────────────────────────────

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

// ── Concept depth ─────────────────────────────────────────────────────────────

function calcConcept() {
  const price  = val('c-price');
  const vc     = val('c-vc');
  const fc     = val('c-fc');
  const target = val('c-target');
  const actual = val('c-actual');

  const cm     = price - vc;
  const cmr    = price > 0 ? cm / price : 0;

  if (cm <= 0) {
    el('c-output').innerHTML = verdict('Variable cost equals or exceeds selling price. Contribution margin is zero or negative -- no volume of sales will cover fixed costs.', false);
    return;
  }

  const beUnits   = fc / cm;
  const beRevenue = beUnits * price;
  const targetUnits = (fc + target) / cm;
  const targetRevenue = targetUnits * price;
  const actualRevenue = actual * price;
  const actualOI = actual * cm - fc;
  const mosUnits = actual - beUnits;
  const mosPct   = actual > 0 ? mosUnits / actual : 0;
  const operatingLeverage = actualOI > 0 ? (actual * cm) / actualOI : 0;

  const out = el('c-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'

    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Breakeven Point</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmtN(Math.ceil(beUnits)) + ' units</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' + fmt(beRevenue) + ' revenue</div>'
    + '</div>'

    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">To Hit Target Profit</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmtN(Math.ceil(targetUnits)) + ' units</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' + fmt(targetRevenue) + ' revenue</div>'
    + '</div>'

    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Contribution Margin</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt(cm) + ' / unit</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' + fmtPct(cmr * 100) + ' CM ratio</div>'
    + '</div>'

    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Margin of Safety</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:' + (mosUnits >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + fmtN(Math.round(mosUnits)) + ' units</div>'
    + '<div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' + fmtPct(mosPct * 100) + ' of expected sales</div>'
    + '</div>'

    + '</div>'

    + verdict(
        actualOI >= 0
          ? 'At ' + fmtN(actual) + ' units, operating income is <strong>' + fmt(actualOI) + '</strong>. You are <strong>' + fmtN(Math.round(mosUnits)) + ' units above breakeven</strong> (' + fmtPct(mosPct * 100) + ' margin of safety). Operating leverage is <strong>' + operatingLeverage.toFixed(1) + 'x</strong> -- a 1% increase in sales increases operating income by ' + fmtPct(operatingLeverage) + '.'
          : 'At ' + fmtN(actual) + ' units, you are <strong>' + fmtN(Math.round(Math.abs(mosUnits))) + ' units below breakeven</strong>. Operating loss: <strong>' + fmt(Math.abs(actualOI)) + '</strong>. You need ' + fmtN(Math.ceil(beUnits) - actual) + ' more units to break even.',
        actualOI >= 0
      )

    + insight('<strong>How to read this:</strong> Contribution margin of ' + fmt(cm) + ' per unit means each unit sold contributes ' + fmt(cm) + ' toward covering fixed costs of ' + fmt(fc) + '. Once fixed costs are covered at ' + fmtN(Math.ceil(beUnits)) + ' units, every additional unit adds ' + fmt(cm) + ' directly to operating income.')

    + '</div>';

  renderShowWork(el('c-output'), [
    { label: 'Contribution Margin per Unit', formula: 'Selling Price - Variable Cost', values: fmt(price) + ' - ' + fmt(vc), result: fmt(cm) },
    { label: 'CM Ratio', formula: 'CM per Unit / Selling Price', values: fmt(cm) + ' / ' + fmt(price), result: fmtPct(cmr * 100) },
    { label: 'Breakeven Units', formula: 'Fixed Costs / CM per Unit', values: fmt(fc) + ' / ' + fmt(cm), result: fmtN(Math.ceil(beUnits)) + ' units', highlight: true },
    { label: 'Breakeven Revenue', formula: 'Breakeven Units x Selling Price', values: fmtN(Math.ceil(beUnits)) + ' x ' + fmt(price), result: fmt(beRevenue) },
    { label: 'Units for Target Profit', formula: '(Fixed Costs + Target Profit) / CM per Unit', values: '(' + fmt(fc) + ' + ' + fmt(target) + ') / ' + fmt(cm), result: fmtN(Math.ceil(targetUnits)) + ' units', highlight: true },
    { label: 'Operating Income at Expected Sales', formula: '(Units x CM) - Fixed Costs', values: '(' + fmtN(actual) + ' x ' + fmt(cm) + ') - ' + fmt(fc), result: fmt(actualOI), highlight: true },
    { label: 'Margin of Safety', formula: 'Expected Sales - Breakeven Units', values: fmtN(actual) + ' - ' + fmtN(Math.ceil(beUnits)), result: fmtN(Math.round(mosUnits)) + ' units (' + fmtPct(mosPct * 100) + ')' },
    { label: 'Operating Leverage', formula: 'Contribution Margin / Operating Income', values: fmt(actual * cm) + ' / ' + fmt(actualOI), result: operatingLeverage.toFixed(1) + 'x' }
  ], { title: 'CVP Show Work', defaultOpen: false });
}

// ── Analysis depth ────────────────────────────────────────────────────────────

function calcAnalysis() {
  const price   = val('a-price');
  const vc      = val('a-vc');
  const fc      = val('a-fc');
  const target  = val('a-target');
  const actual  = val('a-actual');
  const taxRate = val('a-tax') / 100;
  const sensLow  = val('a-sens-low');
  const sensHigh = val('a-sens-high');
  const sensStep = Math.max(1, val('a-sens-step'));

  const cm  = price - vc;
  const cmr = price > 0 ? cm / price : 0;

  if (cm <= 0) {
    el('a-output').innerHTML = verdict('Variable cost equals or exceeds selling price.', false);
    return;
  }

  const beUnits     = fc / cm;
  const targetUnits = (fc + target) / cm;
  const afterTaxTarget = taxRate < 1 ? target / (1 - taxRate) : target;
  const afterTaxUnits  = (fc + afterTaxTarget) / cm;
  const actualOI    = actual * cm - fc;
  const mosUnits    = actual - beUnits;
  const mosPct      = actual > 0 ? mosUnits / actual : 0;

  // Income statement at expected volume
  const revenue  = actual * price;
  const totalVC  = actual * vc;
  const totalCM  = actual * cm;
  const ebit     = totalCM - fc;
  const tax      = Math.max(0, ebit * taxRate);
  const niat     = ebit - tax;

  // Sensitivity table
  const prices = [];
  for (let p = sensLow; p <= sensHigh; p += sensStep) prices.push(p);

  const sensRows = prices.map(p => {
    const c = p - vc;
    if (c <= 0) return [fmt(p), '--', '--', '--', '--'];
    const be = fc / c;
    const oi = actual * c - fc;
    const mos = actual > 0 ? (actual - be) / actual : 0;
    return [
      fmt(p),
      fmt(c) + ' (' + fmtPct(c / p * 100) + ')',
      fmtN(Math.ceil(be)),
      fmt(oi),
      fmtPct(mos * 100)
    ];
  });

  const out = el('a-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Income Statement at ' + fmtN(actual) + ' Units</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<tbody>'
    + '<tr><td>Revenue (' + fmtN(actual) + ' x ' + fmt(price) + ')</td><td style="text-align:right;">' + fmt(revenue) + '</td></tr>'
    + '<tr><td>Variable Costs (' + fmtN(actual) + ' x ' + fmt(vc) + ')</td><td style="text-align:right;">(' + fmt(totalVC) + ')</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Contribution Margin</td><td style="text-align:right;">' + fmt(totalCM) + '</td></tr>'
    + '<tr><td>Fixed Costs</td><td style="text-align:right;">(' + fmt(fc) + ')</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Operating Income (EBIT)</td><td style="text-align:right;">' + fmt(ebit) + '</td></tr>'
    + '<tr><td>Tax (' + fmtPct(taxRate * 100) + ')</td><td style="text-align:right;">(' + fmt(tax) + ')</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Net Income After Tax</td><td style="text-align:right;">' + fmt(niat) + '</td></tr>'
    + '</tbody></table></div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Key Metrics</h4>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Breakeven</div><strong>' + fmtN(Math.ceil(beUnits)) + ' units</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">For Target (pretax)</div><strong>' + fmtN(Math.ceil(targetUnits)) + ' units</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">For Target (after-tax)</div><strong>' + fmtN(Math.ceil(afterTaxUnits)) + ' units</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Margin of Safety</div><strong>' + fmtPct(mosPct * 100) + '</strong></div>'
    + '</div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Sensitivity: Breakeven at Different Prices</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">'
    + '<thead><tr><th>Price</th><th>CM per Unit</th><th>Breakeven Units</th><th>OI at ' + fmtN(actual) + ' units</th><th>Margin of Safety</th></tr></thead>'
    + '<tbody>' + sensRows.map(r => '<tr' + (r[0] === fmt(price) ? ' class="ch12-result-table__relevant-total"' : '') + '>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>'
    + '</table></div>'

    + insight('The highlighted row is your current price. Rows above show what happens if you raise prices; rows below show the impact of discounting. Notice how a small price increase dramatically reduces the breakeven point.')
    + '</div>';
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();

  el('c-calculate') && el('c-calculate').addEventListener('click', calcConcept);
  el('a-calculate') && el('a-calculate').addEventListener('click', calcAnalysis);
});