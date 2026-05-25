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
      setVal('c-units', 25000);
      setVal('c-var-cost', 90);
      setVal('c-fixed-cost', 1300000);
      setVal('c-invested-capital', 2000000);
      setVal('c-target-roi', 20);
      setVal('c-market-price', 180);
      setVal('c-target-margin', 18);
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
  const units         = val('c-units');
  const varCost       = val('c-var-cost');
  const fixedCost     = val('c-fixed-cost');
  const capital       = val('c-invested-capital');
  const targetROI     = val('c-target-roi') / 100;
  const marketPrice   = val('c-market-price');
  const targetMargin  = val('c-target-margin') / 100;

  const fullCostPU    = varCost + (units > 0 ? fixedCost / units : 0);
  const targetReturn  = capital * targetROI;
  const targetReturnPU = units > 0 ? targetReturn / units : 0;

  const costPlusPrice  = fullCostPU + targetReturnPU;
  const costPlusMargin = costPlusPrice > 0 ? targetReturnPU / costPlusPrice : 0;

  const targetPrice    = marketPrice;
  const allowableCost  = targetPrice * (1 - targetMargin);
  const costGap        = fullCostPU - allowableCost;
  const feasible       = costGap <= 0;

  const atMarketOI     = units * (marketPrice - varCost) - fixedCost;
  const atMarketMargin = units * marketPrice > 0 ? atMarketOI / (units * marketPrice) : 0;
  const atCostPlusOI   = units * (costPlusPrice - varCost) - fixedCost;

  const out = el('c-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'

    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Full Cost per Unit</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt2(fullCostPU) + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Variable + Fixed</div>'
    + '</div>'

    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Cost-Plus Price</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt2(costPlusPrice) + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Cost + ' + fmtPct(targetROI * 100) + ' ROI return</div>'
    + '</div>'

    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Market Price</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt2(marketPrice) + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Competitor benchmark</div>'
    + '</div>'

    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Allowable Cost</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:' + (feasible ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + fmt2(allowableCost) + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Market price - ' + fmtPct(targetMargin * 100) + ' margin</div>'
    + '</div>'

    + '</div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Price Comparison</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<thead><tr><th>Approach</th><th>Price</th><th>OI at ' + fmtN(units) + ' units</th><th>OI Margin</th><th>vs Market</th></tr></thead>'
    + '<tbody>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Cost-Plus (target ROI)</td><td>' + fmt2(costPlusPrice) + '</td><td>' + fmt(atCostPlusOI) + '</td><td>' + fmtPct(costPlusMargin * 100) + '</td><td class="' + (costPlusPrice <= marketPrice ? 'variance-fav' : 'variance-unfav') + '">' + (costPlusPrice <= marketPrice ? 'Below market -- competitive' : 'Above market -- risk') + '</td></tr>'
    + '<tr><td>Market Price</td><td>' + fmt2(marketPrice) + '</td><td>' + fmt(atMarketOI) + '</td><td>' + fmtPct(atMarketMargin * 100) + '</td><td>Benchmark</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>Target Cost Allowable</td><td>' + fmt2(targetPrice) + '</td><td>--</td><td>' + fmtPct(targetMargin * 100) + ' (target)</td><td>Requires cost of ' + fmt2(allowableCost) + '</td></tr>'
    + '</tbody></table></div>'

    + '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:' + (feasible ? 'var(--color-success-bg)' : 'var(--color-warning-bg)') + ';border:1px solid ' + (feasible ? 'var(--color-success)' : 'var(--color-warning)') + ';margin-bottom:var(--space-4);">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:' + (feasible ? 'var(--color-success)' : 'var(--color-warning)') + ';margin-bottom:var(--space-2);">'
    + (feasible ? 'Your cost structure supports market pricing' : 'Cost reduction required to compete at market price')
    + '</div>'
    + '<p style="margin:0 0 var(--space-2);font-size:var(--font-size-sm);">'
    + (feasible
        ? 'Your full cost of <strong>' + fmt2(fullCostPU) + '</strong> is below the allowable cost of <strong>' + fmt2(allowableCost) + '</strong>. You can price at market and still earn your target margin. Your cost-plus price of <strong>' + fmt2(costPlusPrice) + '</strong> is ' + (costPlusPrice < marketPrice ? '<strong>' + fmt2(marketPrice - costPlusPrice) + ' below market</strong> -- you have pricing power.' : '<strong>' + fmt2(costPlusPrice - marketPrice) + ' above market</strong> -- consider pricing at market instead.')
        : 'Your full cost of <strong>' + fmt2(fullCostPU) + '</strong> exceeds the allowable cost of <strong>' + fmt2(allowableCost) + '</strong> by <strong>' + fmt2(costGap) + ' per unit</strong>. To hit your ' + fmtPct(targetMargin * 100) + ' margin target at market price, you need to cut costs by <strong>' + fmt(costGap * units) + '</strong> annually through value engineering.')
    + '</p>'
    + '</div>'

    + '</div>';

  renderShowWork(el('c-show-work'), [
    { label: 'Full Cost per Unit', formula: 'Variable Cost + (Fixed Cost / Units)', values: fmt2(varCost) + ' + (' + fmt(fixedCost) + ' / ' + fmtN(units) + ')', result: fmt2(fullCostPU) },
    { label: 'Target Return per Unit', formula: '(Invested Capital x Target ROI) / Units', values: '(' + fmt(capital) + ' x ' + fmtPct(targetROI * 100) + ') / ' + fmtN(units), result: fmt2(targetReturnPU) },
    { label: 'Cost-Plus Price', formula: 'Full Cost + Target Return per Unit', values: fmt2(fullCostPU) + ' + ' + fmt2(targetReturnPU), result: fmt2(costPlusPrice), highlight: true },
    { label: 'Allowable Cost (Target Costing)', formula: 'Market Price x (1 - Target Margin)', values: fmt2(marketPrice) + ' x (1 - ' + fmtPct(targetMargin * 100) + ')', result: fmt2(allowableCost), highlight: true },
    { label: 'Cost Gap', formula: 'Full Cost - Allowable Cost', values: fmt2(fullCostPU) + ' - ' + fmt2(allowableCost), result: fmt2(costGap) + (costGap > 0 ? ' -- must reduce costs' : ' -- no gap'), highlight: true },
    { label: 'OI at Market Price', formula: '(Units x (Market Price - VC)) - Fixed Costs', values: '(' + fmtN(units) + ' x (' + fmt2(marketPrice) + ' - ' + fmt2(varCost) + ')) - ' + fmt(fixedCost), result: fmt(atMarketOI) }
  ], { title: 'Pricing Show Work', defaultOpen: false });
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const units       = val('a-units');
  const varMfg      = val('a-var-mfg');
  const varSGA      = val('a-var-sga');
  const fixedMfg    = val('a-fixed-mfg');
  const fixedSGA    = val('a-fixed-sga');
  const capital     = val('a-invested-capital');
  const targetROI   = val('a-target-roi') / 100;
  const marketPrice = val('a-market-price');
  const targetMgn   = val('a-target-margin') / 100;

  const varMfgPU    = varMfg;
  const varSGAPU    = varSGA;
  const fixedMfgPU  = units > 0 ? fixedMfg / units : 0;
  const fixedSGAPU  = units > 0 ? fixedSGA / units : 0;
  const mfgCostPU   = varMfgPU + fixedMfgPU;
  const fullCostPU  = varMfgPU + varSGAPU + fixedMfgPU + fixedSGAPU;
  const targetReturn = capital * targetROI;
  const targetRetPU  = units > 0 ? targetReturn / units : 0;

  function costPlusPrice(base, markup) {
    return base * (1 + markup);
  }

  const varMfgMarkup   = (fullCostPU + targetRetPU - varMfgPU) / varMfgPU;
  const mfgMarkup      = (fullCostPU + targetRetPU - mfgCostPU) / mfgCostPU;
  const fullMarkup     = targetRetPU / fullCostPU;

  const priceVarMfg    = varMfgPU * (1 + varMfgMarkup);
  const priceMfg       = mfgCostPU * (1 + mfgMarkup);
  const priceFull      = fullCostPU * (1 + fullMarkup);

  const allowableCost  = marketPrice * (1 - targetMgn);
  const costGap        = fullCostPU - allowableCost;

  const volLevels = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];
  const volRows = volLevels.map(pct => {
    const u    = Math.round(units * pct);
    const fc   = u > 0 ? (fixedMfg + fixedSGA) / u : 0;
    const full = varMfg + varSGA + fc;
    const p    = full + targetRetPU;
    const oi   = u * (marketPrice - varMfg - varSGA) - fixedMfg - fixedSGA;
    const m    = u * marketPrice > 0 ? oi / (u * marketPrice) : 0;
    const isBase = pct === 1.0;
    return '<tr' + (isBase ? ' class="ch12-result-table__relevant-total"' : '') + '>'
      + '<td>' + fmtPct(pct * 100) + (isBase ? ' (plan)' : '') + '</td>'
      + '<td>' + fmtN(u) + '</td>'
      + '<td>' + fmt2(full) + '</td>'
      + '<td>' + fmt2(p) + '</td>'
      + '<td class="' + (p <= marketPrice ? 'variance-fav' : 'variance-unfav') + '">' + (p <= marketPrice ? 'Below market' : 'Above market') + '</td>'
      + '<td class="' + (m >= targetMgn ? 'variance-fav' : 'variance-unfav') + '">' + fmtPct(m * 100) + '</td>'
      + '</tr>';
  });

  const out = el('a-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Cost-Plus Methods Compared</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<thead><tr><th>Method</th><th>Cost Base</th><th>Markup %</th><th>Price</th><th>OI Margin</th><th>vs Market</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>Variable Mfg Cost-Plus</td><td>' + fmt2(varMfgPU) + '</td><td>' + fmtPct(varMfgMarkup * 100) + '</td><td>' + fmt2(priceVarMfg) + '</td><td>' + fmtPct(targetRetPU / priceVarMfg * 100) + '</td><td class="' + (priceVarMfg <= marketPrice ? 'variance-fav' : 'variance-unfav') + '">' + fmt2(priceVarMfg - marketPrice) + '</td></tr>'
    + '<tr><td>Manufacturing Cost-Plus</td><td>' + fmt2(mfgCostPU) + '</td><td>' + fmtPct(mfgMarkup * 100) + '</td><td>' + fmt2(priceMfg) + '</td><td>' + fmtPct(targetRetPU / priceMfg * 100) + '</td><td class="' + (priceMfg <= marketPrice ? 'variance-fav' : 'variance-unfav') + '">' + fmt2(priceMfg - marketPrice) + '</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Full Cost-Plus</td><td>' + fmt2(fullCostPU) + '</td><td>' + fmtPct(fullMarkup * 100) + '</td><td>' + fmt2(priceFull) + '</td><td>' + fmtPct(targetRetPU / priceFull * 100) + '</td><td class="' + (priceFull <= marketPrice ? 'variance-fav' : 'variance-unfav') + '">' + fmt2(priceFull - marketPrice) + '</td></tr>'
    + '</tbody></table></div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Target Costing Analysis</h4>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Market Price</div><strong>' + fmt2(marketPrice) + '</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Target Margin</div><strong>' + fmtPct(targetMgn * 100) + '</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Allowable Cost</div><strong>' + fmt2(allowableCost) + '</strong></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:4px;">Current Full Cost</div><strong>' + fmt2(fullCostPU) + '</strong></div>'
    + '<div style="background:' + (costGap > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)') + ';border:1px solid ' + (costGap > 0 ? 'var(--color-danger)' : 'var(--color-success)') + ';border-radius:var(--radius-md);padding:var(--space-3);text-align:center;"><div style="font-size:var(--font-size-xs);color:' + (costGap > 0 ? 'var(--color-danger)' : 'var(--color-success)') + ';margin-bottom:4px;">Cost Gap</div><strong style="color:' + (costGap > 0 ? 'var(--color-danger)' : 'var(--color-success)') + ';">' + fmt2(costGap) + '</strong></div>'
    + '</div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">How Price Changes with Volume</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">'
    + '<thead><tr><th>Volume %</th><th>Units</th><th>Full Cost/Unit</th><th>Cost-Plus Price</th><th>vs Market</th><th>OI Margin at Market</th></tr></thead>'
    + '<tbody>' + volRows.join('') + '</tbody>'
    + '</table></div>'
    + '<div style="margin-top:var(--space-3);padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);border:1px solid var(--color-gray-200);font-size:var(--font-size-sm);color:var(--color-gray-600);">As volume increases, fixed costs spread over more units, reducing the full cost per unit and the required cost-plus price. This is why scale matters in pricing decisions.</div>'

    + '</div>';

  renderShowWork(el('a-show-work'), [
    { label: 'Variable Mfg Cost per Unit', formula: 'Input', values: fmt2(varMfgPU), result: fmt2(varMfgPU) },
    { label: 'Fixed Mfg Cost per Unit', formula: 'Fixed Mfg / Units', values: fmt(fixedMfg) + ' / ' + fmtN(units), result: fmt2(fixedMfgPU) },
    { label: 'Full Cost per Unit', formula: 'Var Mfg + Var SGA + Fixed Mfg/unit + Fixed SGA/unit', values: fmt2(varMfgPU) + ' + ' + fmt2(varSGAPU) + ' + ' + fmt2(fixedMfgPU) + ' + ' + fmt2(fixedSGAPU), result: fmt2(fullCostPU) },
    { label: 'Target Return per Unit', formula: '(Capital x ROI) / Units', values: '(' + fmt(capital) + ' x ' + fmtPct(targetROI * 100) + ') / ' + fmtN(units), result: fmt2(targetRetPU) },
    { label: 'Full Cost-Plus Price', formula: 'Full Cost + Target Return', values: fmt2(fullCostPU) + ' + ' + fmt2(targetRetPU), result: fmt2(priceFull), highlight: true },
    { label: 'Allowable Cost (Target Costing)', formula: 'Market Price x (1 - Target Margin)', values: fmt2(marketPrice) + ' x (1 - ' + fmtPct(targetMgn * 100) + ')', result: fmt2(allowableCost), highlight: true },
    { label: 'Cost Gap', formula: 'Full Cost - Allowable Cost', values: fmt2(fullCostPU) + ' - ' + fmt2(allowableCost), result: fmt2(costGap) + (costGap > 0 ? ' -- value engineering needed' : ' -- no gap'), highlight: true }
  ], { title: 'Pricing Analysis Show Work', defaultOpen: false });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();
  initScenario();

  el('c-calculate') && el('c-calculate').addEventListener('click', calcConcept);
  el('a-calculate') && el('a-calculate').addEventListener('click', calcAnalysis);

  el('c-rand-viable') && el('c-rand-viable').addEventListener('click', () => {
    const units    = Math.round((10000 + Math.random() * 40000) / 500) * 500;
    const varCost  = Math.round(40 + Math.random() * 60);
    const fixed    = Math.round((300000 + Math.random() * 1200000) / 10000) * 10000;
    const capital  = Math.round((500000 + Math.random() * 3000000) / 50000) * 50000;
    const roi      = Math.round(10 + Math.random() * 15);
    const fullCost = varCost + fixed / units;
    const retPU    = (capital * roi / 100) / units;
    const cpPrice  = fullCost + retPU;
    const market   = Math.round(cpPrice * (1.15 + Math.random() * 0.25));
    setVal('c-units', units); setVal('c-var-cost', varCost);
    setVal('c-fixed-cost', fixed); setVal('c-invested-capital', capital);
    setVal('c-target-roi', roi); setVal('c-market-price', market);
    setVal('c-target-margin', 18);
    calcConcept();
  });

  el('c-rand-stretch') && el('c-rand-stretch').addEventListener('click', () => {
    const units    = Math.round((5000 + Math.random() * 20000) / 500) * 500;
    const varCost  = Math.round(60 + Math.random() * 80);
    const fixed    = Math.round((500000 + Math.random() * 2000000) / 10000) * 10000;
    const capital  = Math.round((1000000 + Math.random() * 5000000) / 50000) * 50000;
    const roi      = Math.round(18 + Math.random() * 12);
    const fullCost = varCost + fixed / units;
    const retPU    = (capital * roi / 100) / units;
    const cpPrice  = fullCost + retPU;
    const market   = Math.round(cpPrice * (0.75 + Math.random() * 0.15));
    setVal('c-units', units); setVal('c-var-cost', varCost);
    setVal('c-fixed-cost', fixed); setVal('c-invested-capital', capital);
    setVal('c-target-roi', roi); setVal('c-market-price', market);
    setVal('c-target-margin', 18);
    calcConcept();
  });
});