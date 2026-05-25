import { initHeader } from '/js/components/header.js';
import { renderShowWork } from '/js/components/show-work.js';

const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmt2   = n => '$' + Math.abs(n).toFixed(2);
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (Math.round(n * 10) / 10).toFixed(1) + '%';

const el  = id => document.getElementById(id);
const val = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

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
      setVal('c-units', 50000);
      setVal('c-var-cost', 38);
      setVal('c-avoidable-fixed', 400000);
      setVal('c-unavoidable-fixed', 600000);
      setVal('c-buy-price', 58);
      setVal('c-opp-income', 300000);
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

// ── Concept ───────────────────────────────────────────────────────────────────

function calcConcept() {
  const units          = val('c-units');
  const varCost        = val('c-var-cost');
  const avoidFixed     = val('c-avoidable-fixed');
  const unavoidFixed   = val('c-unavoidable-fixed');
  const buyPrice       = val('c-buy-price');
  const oppIncome      = val('c-opp-income');

  const makeCostRel    = varCost * units + avoidFixed;
  const buyCostRel     = buyPrice * units - oppIncome;
  const netAdvBuy      = makeCostRel - buyCostRel;
  const preferBuy      = netAdvBuy > 0;
  const indiffPrice    = (varCost * units + avoidFixed - oppIncome) / units;

  const panelAMake     = makeCostRel + unavoidFixed;
  const panelABuy      = buyCostRel + unavoidFixed;
  const panelBMake     = varCost * units + avoidFixed + oppIncome;
  const panelBBuy      = buyPrice * units;

  const out = el('c-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-5);">'

    + '<div style="flex:1 1 280px;min-width:260px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Panel A: Total Alternatives</div>'
    + '<table class="ch12-result-table" style="width:100%;"><thead><tr><th>Item</th><th>Make</th><th>Buy</th></tr></thead><tbody>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Variable Cost (' + fmtN(units) + ' x ' + fmt2(varCost) + ')</td><td>' + fmt(varCost * units) + '</td><td>--</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Avoidable Fixed Costs</td><td>' + fmt(avoidFixed) + '</td><td>--</td></tr>'
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Unavoidable Fixed Costs</td><td>' + fmt(unavoidFixed) + '</td><td>' + fmt(unavoidFixed) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Outside Purchase (' + fmtN(units) + ' x ' + fmt2(buyPrice) + ')</td><td>--</td><td>' + fmt(buyPrice * units) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Less: Opportunity Income</td><td>--</td><td>(' + fmt(oppIncome) + ')</td></tr>'
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Total Relevant Cost</td><td>' + fmt(panelAMake) + '</td><td>' + fmt(panelABuy) + '</td></tr></tfoot></table>'
    + '</div>'

    + '<div style="flex:1 1 280px;min-width:260px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Panel B: Opportunity Cost Approach</div>'
    + '<table class="ch12-result-table" style="width:100%;"><thead><tr><th>Item</th><th>Make</th><th>Buy</th></tr></thead><tbody>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Variable Cost</td><td>' + fmt(varCost * units) + '</td><td>--</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Avoidable Fixed Costs</td><td>' + fmt(avoidFixed) + '</td><td>--</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Opportunity Cost</td><td>' + fmt(oppIncome) + '</td><td>$0</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Outside Purchase</td><td>--</td><td>' + fmt(buyPrice * units) + '</td></tr>'
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Total Relevant Cost</td><td>' + fmt(panelBMake) + '</td><td>' + fmt(panelBBuy) + '</td></tr></tfoot></table>'
    + '</div>'

    + '</div>'

    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Net Advantage of ' + (preferBuy ? 'Buying' : 'Making') + '</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-success);">' + fmt(Math.abs(netAdvBuy)) + '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">per year</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Indifference Price</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt2(indiffPrice) + '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">per unit -- decision flips here</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Buy Price vs Indiff</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:' + (preferBuy ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + fmt2(buyPrice - indiffPrice) + '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' + (preferBuy ? 'below indifference -- buy' : 'above indifference -- make') + '</div></div>'
    + '</div>'

    + '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:' + (preferBuy ? 'var(--color-success-bg)' : 'var(--color-danger-bg)') + ';border:1px solid ' + (preferBuy ? 'var(--color-success)' : 'var(--color-danger)') + ';margin-bottom:var(--space-4);">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:' + (preferBuy ? 'var(--color-success)' : 'var(--color-danger)') + ';margin-bottom:var(--space-2);">' + (preferBuy ? 'Buy from outside supplier' : 'Continue making in-house') + '</div>'
    + '<p style="margin:0 0 var(--space-2);font-size:var(--font-size-sm);">'
    + (preferBuy
        ? 'Buying saves <strong>' + fmt(netAdvBuy) + '</strong> per year in relevant costs. The outside price of <strong>' + fmt2(buyPrice) + '</strong> is below the indifference price of <strong>' + fmt2(indiffPrice) + '</strong>. The unavoidable fixed costs of <strong>' + fmt(unavoidFixed) + '</strong> will continue either way -- they are irrelevant to this decision.'
        : 'Making is cheaper by <strong>' + fmt(Math.abs(netAdvBuy)) + '</strong> per year. The outside price of <strong>' + fmt2(buyPrice) + '</strong> exceeds the indifference price of <strong>' + fmt2(indiffPrice) + '</strong>. To justify outsourcing, the supplier would need to drop the price by at least <strong>' + fmt2(buyPrice - indiffPrice) + '</strong> per unit.')
    + '</p>'
    + '<p style="margin:0;font-size:var(--font-size-sm);"><strong>But consider:</strong> supplier reliability, quality control, loss of manufacturing expertise, and whether the freed capacity opportunity is truly available.</p>'
    + '</div>'

    + '</div>';

  renderShowWork(el('c-show-work'), [
    { label: 'Relevant Cost to Make', formula: '(Variable Cost x Units) + Avoidable Fixed', values: fmt2(varCost) + ' x ' + fmtN(units) + ' + ' + fmt(avoidFixed), result: fmt(makeCostRel) },
    { label: 'Relevant Cost to Buy', formula: '(Buy Price x Units) - Opportunity Income', values: fmt2(buyPrice) + ' x ' + fmtN(units) + ' - ' + fmt(oppIncome), result: fmt(buyCostRel) },
    { label: 'Net Advantage of Buying', formula: 'Make Cost - Buy Cost', values: fmt(makeCostRel) + ' - ' + fmt(buyCostRel), result: fmt(netAdvBuy), highlight: true },
    { label: 'Indifference Price', formula: '(Variable Cost x Units + Avoidable Fixed - Opp Income) / Units', values: '(' + fmt(varCost * units) + ' + ' + fmt(avoidFixed) + ' - ' + fmt(oppIncome) + ') / ' + fmtN(units), result: fmt2(indiffPrice), highlight: true },
    { label: 'Unavoidable Fixed Costs', formula: 'Same under both alternatives', values: fmt(unavoidFixed), result: 'Irrelevant -- excluded from analysis' }
  ], { title: 'Make or Buy Show Work', defaultOpen: false });
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const units          = val('a-units');
  const dm             = val('a-dm');
  const dl             = val('a-dl');
  const varOH          = val('a-var-oh');
  const avoidFixed     = val('a-avoidable-fixed');
  const unavoidFixed   = val('a-unavoidable-fixed');
  const buyPrice       = val('a-buy-price');
  const oppIncome      = val('a-opp-income');
  const sellerCap      = val('a-seller-capacity');
  const sellerExt      = val('a-seller-external');
  const sellerExtPrice = val('a-seller-ext-price');

  const varCost        = dm + dl + varOH;
  const makeCostRel    = varCost * units + avoidFixed;
  const buyCostRel     = buyPrice * units - oppIncome;
  const netAdvBuy      = makeCostRel - buyCostRel;
  const preferBuy      = netAdvBuy > 0;
  const indiffPrice    = (varCost * units + avoidFixed - oppIncome) / units;

  const sellerIdle     = sellerCap - sellerExt;
  const constrained    = units > sellerIdle;
  const lostExternal   = constrained ? Math.max(0, units - sellerIdle) : 0;
  const sellerCM       = sellerExtPrice - varCost;
  const oppCostPerUnit = constrained && units > 0 ? (lostExternal * sellerCM) / units : 0;
  const minTP          = varCost + oppCostPerUnit;
  const maxTP          = buyPrice;

  const sensRows = [-20, -10, -5, 0, 5, 10, 20].map(pct => {
    const adjPrice = buyPrice * (1 + pct / 100);
    const adjBuy   = adjPrice * units - oppIncome;
    const adjAdv   = makeCostRel - adjBuy;
    const prefer   = adjAdv > 0 ? 'Buy' : 'Make';
    const isBase   = pct === 0;
    return '<tr' + (isBase ? ' class="ch12-result-table__relevant-total"' : '') + '>'
      + '<td>' + (pct >= 0 ? '+' : '') + pct + '%' + (isBase ? ' (current)' : '') + '</td>'
      + '<td>' + fmt2(adjPrice) + '</td>'
      + '<td>' + fmt(adjBuy) + '</td>'
      + '<td class="' + (adjAdv >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (adjAdv >= 0 ? '+' : '') + fmt(adjAdv) + '</td>'
      + '<td><strong>' + prefer + '</strong></td>'
      + '</tr>';
  });

  const qualFactors = [
    { factor: 'Supplier quality and reliability', make: 'Full control', buy: 'Dependent on supplier' },
    { factor: 'Manufacturing expertise', make: 'Retained', buy: 'May be lost permanently' },
    { factor: 'Supply chain risk', make: 'Internal -- lower risk', buy: 'External -- higher risk' },
    { factor: 'Flexibility to change specs', make: 'High', buy: 'Limited by contract' },
    { factor: 'Capacity for growth', make: 'Must invest in capacity', buy: 'Supplier absorbs volume risk' },
    { factor: 'Strategic fit', make: 'Core competency retained', buy: 'Focus on core activities' }
  ];

  const out = el('a-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Cost Breakdown</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<thead><tr><th>Cost Component</th><th>Per Unit</th><th>Total (' + fmtN(units) + ' units)</th><th>Relevant?</th></tr></thead>'
    + '<tbody>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Direct Materials</td><td>' + fmt2(dm) + '</td><td>' + fmt(dm * units) + '</td><td>Yes</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Direct Labor</td><td>' + fmt2(dl) + '</td><td>' + fmt(dl * units) + '</td><td>Yes</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Variable Overhead</td><td>' + fmt2(varOH) + '</td><td>' + fmt(varOH * units) + '</td><td>Yes</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Avoidable Fixed Costs</td><td>' + fmt2(avoidFixed / units) + '</td><td>' + fmt(avoidFixed) + '</td><td>Yes</td></tr>'
    + '<tr class="ch12-t1-result__row--irrelevant"><td>Unavoidable Fixed Costs</td><td>' + fmt2(unavoidFixed / units) + '</td><td>' + fmt(unavoidFixed) + '</td><td>No -- same either way</td></tr>'
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Total Relevant Make Cost</td><td>' + fmt2(varCost + avoidFixed / units) + '</td><td>' + fmt(makeCostRel) + '</td><td></td></tr></tfoot>'
    + '</table></div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Sensitivity: Decision at Different Buy Prices</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<thead><tr><th>Price Change</th><th>Buy Price</th><th>Total Buy Cost</th><th>Net Advantage of Buying</th><th>Decision</th></tr></thead>'
    + '<tbody>' + sensRows.join('') + '</tbody>'
    + '</table></div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Transfer Pricing: If Buying from Sister Division</h4>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-5);">'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3);margin-bottom:var(--space-3);">'
    + '<div style="text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Seller Idle Capacity</div><strong>' + fmtN(sellerIdle) + ' units</strong></div>'
    + '<div style="text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Internal Need</div><strong>' + fmtN(units) + ' units</strong></div>'
    + '<div style="text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Capacity Constrained?</div><strong>' + (constrained ? 'Yes' : 'No') + '</strong></div>'
    + '<div style="text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Opportunity Cost/Unit</div><strong>' + fmt2(oppCostPerUnit) + '</strong></div>'
    + '</div>'
    + '<div style="display:flex;gap:var(--space-4);flex-wrap:wrap;">'
    + '<div style="flex:1;text-align:center;padding:var(--space-3);background:var(--color-success-bg);border-radius:var(--radius-md);border:1px solid var(--color-success);"><div style="font-size:var(--font-size-xs);color:var(--color-success);font-weight:700;margin-bottom:4px;">Minimum Transfer Price</div><div style="font-size:var(--font-size-xl);font-weight:800;color:var(--color-success);">' + fmt2(minTP) + '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Variable cost + opportunity cost</div></div>'
    + '<div style="flex:1;text-align:center;padding:var(--space-3);background:var(--color-danger-bg);border-radius:var(--radius-md);border:1px solid var(--color-danger);"><div style="font-size:var(--font-size-xs);color:var(--color-danger);font-weight:700;margin-bottom:4px;">Maximum Transfer Price</div><div style="font-size:var(--font-size-xl);font-weight:800;color:var(--color-danger);">' + fmt2(maxTP) + '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">External market price</div></div>'
    + '</div>'
    + (minTP <= maxTP ? '<p style="margin:var(--space-3) 0 0;font-size:var(--font-size-sm);color:var(--color-gray-600);">A transfer price between <strong>' + fmt2(minTP) + '</strong> and <strong>' + fmt2(maxTP) + '</strong> benefits both divisions. Any price in this range is acceptable.' : '<p style="margin:var(--space-3) 0 0;font-size:var(--font-size-sm);color:var(--color-danger);">No mutually beneficial transfer price exists. The minimum price the seller needs exceeds the maximum the buyer will pay.</p>')
    + '</div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Qualitative Factors</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-4);">'
    + '<thead><tr><th>Factor</th><th>Make</th><th>Buy</th></tr></thead>'
    + '<tbody>' + qualFactors.map(q => '<tr><td>' + q.factor + '</td><td>' + q.make + '</td><td>' + q.buy + '</td></tr>').join('') + '</tbody>'
    + '</table></div>'
    + '<div style="padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);border:1px solid var(--color-gray-200);font-size:var(--font-size-sm);color:var(--color-gray-600);">Quantitative analysis says <strong>' + (preferBuy ? 'buy' : 'make') + '</strong> by <strong>' + fmt(Math.abs(netAdvBuy)) + '</strong> per year. But the final decision must weigh qualitative factors -- especially supplier reliability and whether this component is a strategic capability you want to retain.</div>'

    + '</div>';

  renderShowWork(el('a-show-work'), [
    { label: 'Variable Cost per Unit', formula: 'DM + DL + Variable OH', values: fmt2(dm) + ' + ' + fmt2(dl) + ' + ' + fmt2(varOH), result: fmt2(varCost) },
    { label: 'Total Relevant Make Cost', formula: '(VC x Units) + Avoidable Fixed', values: fmt2(varCost) + ' x ' + fmtN(units) + ' + ' + fmt(avoidFixed), result: fmt(makeCostRel) },
    { label: 'Total Relevant Buy Cost', formula: '(Buy Price x Units) - Opportunity Income', values: fmt2(buyPrice) + ' x ' + fmtN(units) + ' - ' + fmt(oppIncome), result: fmt(buyCostRel) },
    { label: 'Net Advantage of Buying', formula: 'Make Cost - Buy Cost', values: fmt(makeCostRel) + ' - ' + fmt(buyCostRel), result: fmt(netAdvBuy), highlight: true },
    { label: 'Indifference Price', formula: '(VC x Units + Avoidable Fixed - Opp Income) / Units', values: '(' + fmt(varCost * units) + ' + ' + fmt(avoidFixed) + ' - ' + fmt(oppIncome) + ') / ' + fmtN(units), result: fmt2(indiffPrice), highlight: true },
    { label: 'Min Transfer Price (General Rule)', formula: 'Variable Cost + Opportunity Cost per Unit', values: fmt2(varCost) + ' + ' + fmt2(oppCostPerUnit), result: fmt2(minTP), highlight: true }
  ], { title: 'Make or Buy Analysis', defaultOpen: false });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();
  initScenario();
  el('c-calculate') && el('c-calculate').addEventListener('click', calcConcept);
  el('c-rand-buy') && el('c-rand-buy').addEventListener('click', () => {
    const units      = Math.round((10000 + Math.random() * 90000) / 1000) * 1000;
    const varCost    = Math.round(20 + Math.random() * 40);
    const avoidFixed = Math.round((50000 + Math.random() * 350000) / 10000) * 10000;
    const unavoid    = Math.round((100000 + Math.random() * 500000) / 10000) * 10000;
    const oppIncome  = Math.round((50000 + Math.random() * 300000) / 10000) * 10000;
    const indiff     = (varCost * units + avoidFixed - oppIncome) / units;
    const buyPrice   = Math.round(indiff * (0.75 + Math.random() * 0.15));
    setVal('c-units', units); setVal('c-var-cost', varCost);
    setVal('c-avoidable-fixed', avoidFixed); setVal('c-unavoidable-fixed', unavoid);
    setVal('c-buy-price', Math.max(1, buyPrice)); setVal('c-opp-income', oppIncome);
    calcConcept();
  });
  el('c-rand-make') && el('c-rand-make').addEventListener('click', () => {
    const units      = Math.round((10000 + Math.random() * 90000) / 1000) * 1000;
    const varCost    = Math.round(20 + Math.random() * 40);
    const avoidFixed = Math.round((50000 + Math.random() * 350000) / 10000) * 10000;
    const unavoid    = Math.round((100000 + Math.random() * 500000) / 10000) * 10000;
    const oppIncome  = Math.round((10000 + Math.random() * 100000) / 10000) * 10000;
    const indiff     = (varCost * units + avoidFixed - oppIncome) / units;
    const buyPrice   = Math.round(indiff * (1.15 + Math.random() * 0.25));
    setVal('c-units', units); setVal('c-var-cost', varCost);
    setVal('c-avoidable-fixed', avoidFixed); setVal('c-unavoidable-fixed', unavoid);
    setVal('c-buy-price', buyPrice); setVal('c-opp-income', oppIncome);
    calcConcept();
  });
  el('a-calculate') && el('a-calculate').addEventListener('click', calcAnalysis);
});