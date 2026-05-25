import { initHeader } from '/js/components/header.js';
import { renderShowWork } from '/js/components/show-work.js';

const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (Math.round(n * 10) / 10).toFixed(1) + '%';

const el  = id => document.getElementById(id);
const val = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

function fav(n) {
  return n >= 0
    ? '<span class="variance-fav">+' + fmt(n) + ' F</span>'
    : '<span class="variance-unfav">' + fmt(n) + ' U</span>';
}

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
      setVal('c-bud-units', 10000); setVal('c-act-units', 9200);
      setVal('c-bud-price', 85);   setVal('c-act-price', 83);
      setVal('c-bud-vc', 40);      setVal('c-act-vc', 42);
      setVal('c-bud-fixed', 300000); setVal('c-act-fixed', 308000);
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
  const budUnits  = val('c-bud-units');
  const actUnits  = val('c-act-units');
  const budPrice  = val('c-bud-price');
  const actPrice  = val('c-act-price');
  const budVC     = val('c-bud-vc');
  const actVC     = val('c-act-vc');
  const budFixed  = val('c-bud-fixed');
  const actFixed  = val('c-act-fixed');

  const budCM     = budPrice - budVC;
  const actCM     = actPrice - actVC;

  const staticBudgetOI  = budUnits * budCM - budFixed;
  const flexBudgetOI    = actUnits * budCM - budFixed;
  const actualOI        = actUnits * actCM - actFixed;

  const staticVariance  = actualOI - staticBudgetOI;
  const flexVariance    = actualOI - flexBudgetOI;
  const salesVolVariance = flexBudgetOI - staticBudgetOI;

  const revenueVariance = (actPrice - budPrice) * actUnits;
  const vcVariance      = (budVC - actVC) * actUnits;
  const fixedVariance   = budFixed - actFixed;

  const out = el('c-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Three-Column Variance Analysis</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<thead><tr><th></th><th>Static Budget<br>(' + fmtN(budUnits) + ' units)</th><th>Flexible Budget<br>(' + fmtN(actUnits) + ' units)</th><th>Actual Results<br>(' + fmtN(actUnits) + ' units)</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>Revenue</td><td>' + fmt(budUnits * budPrice) + '</td><td>' + fmt(actUnits * budPrice) + '</td><td>' + fmt(actUnits * actPrice) + '</td></tr>'
    + '<tr><td>Variable Costs</td><td>(' + fmt(budUnits * budVC) + ')</td><td>(' + fmt(actUnits * budVC) + ')</td><td>(' + fmt(actUnits * actVC) + ')</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Contribution Margin</td><td>' + fmt(budUnits * budCM) + '</td><td>' + fmt(actUnits * budCM) + '</td><td>' + fmt(actUnits * actCM) + '</td></tr>'
    + '<tr><td>Fixed Costs</td><td>(' + fmt(budFixed) + ')</td><td>(' + fmt(budFixed) + ')</td><td>(' + fmt(actFixed) + ')</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Operating Income</td><td>' + fmt(staticBudgetOI) + '</td><td>' + fmt(flexBudgetOI) + '</td><td>' + fmt(actualOI) + '</td></tr>'
    + '</tbody></table></div>'

    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Static Budget Variance</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:' + (staticVariance >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + (staticVariance >= 0 ? '+' : '') + fmt(staticVariance) + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Actual vs Static Budget</div>'
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Flexible Budget Variance</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:' + (flexVariance >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + (flexVariance >= 0 ? '+' : '') + fmt(flexVariance) + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Price + Cost execution</div>'
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Sales Volume Variance</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:' + (salesVolVariance >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + (salesVolVariance >= 0 ? '+' : '') + fmt(salesVolVariance) + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Volume effect only</div>'
    + '</div>'
    + '</div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">What Drove the Variance?</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<thead><tr><th>Driver</th><th>Variance</th><th>F/U</th><th>What it means</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>Selling Price</td><td>' + fav(revenueVariance) + '</td><td class="' + (revenueVariance >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (revenueVariance >= 0 ? 'F' : 'U') + '</td><td>You charged ' + fmt(Math.abs(actPrice - budPrice)) + ' ' + (actPrice < budPrice ? 'less' : 'more') + ' per unit than planned</td></tr>'
    + '<tr><td>Variable Cost</td><td>' + fav(vcVariance) + '</td><td class="' + (vcVariance >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (vcVariance >= 0 ? 'F' : 'U') + '</td><td>Variable costs were ' + fmt(Math.abs(actVC - budVC)) + ' ' + (actVC > budVC ? 'higher' : 'lower') + ' per unit than planned</td></tr>'
    + '<tr><td>Fixed Cost</td><td>' + fav(fixedVariance) + '</td><td class="' + (fixedVariance >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (fixedVariance >= 0 ? 'F' : 'U') + '</td><td>Fixed costs were ' + fmt(Math.abs(actFixed - budFixed)) + ' ' + (actFixed > budFixed ? 'over' : 'under') + ' budget</td></tr>'
    + '<tr><td>Sales Volume</td><td>' + fav(salesVolVariance) + '</td><td class="' + (salesVolVariance >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (salesVolVariance >= 0 ? 'F' : 'U') + '</td><td>You sold ' + fmtN(Math.abs(actUnits - budUnits)) + ' ' + (actUnits < budUnits ? 'fewer' : 'more') + ' units than planned</td></tr>'
    + '</tbody></table></div>'

    + '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:var(--color-gray-50);border:1px solid var(--color-gray-200);margin-bottom:var(--space-4);">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:var(--color-primary-text);margin-bottom:var(--space-3);">Bottom Line</div>'
    + '<p style="margin:0 0 var(--space-2);font-size:var(--font-size-sm);">Operating income missed the static budget by <strong>' + fmt(Math.abs(staticVariance)) + '</strong>. '
    + 'Of that, <strong>' + fmt(Math.abs(salesVolVariance)) + '</strong> was because you sold ' + fmtN(Math.abs(actUnits - budUnits)) + ' fewer units than planned -- that is a <strong>volume problem</strong>. '
    + 'The remaining <strong>' + fmt(Math.abs(flexVariance)) + '</strong> was because prices and costs differed from plan -- that is an <strong>execution problem</strong>.</p>'
    + '<p style="margin:0;font-size:var(--font-size-sm);">The flexible budget is the key tool: it removes the volume effect so you can judge whether the team executed well at the actual volume they achieved.</p>'
    + '</div>'

    + '</div>';

  renderShowWork(el('c-show-work'), [
    { label: 'Static Budget OI', formula: '(Bud Units x Bud CM) - Bud Fixed', values: '(' + fmtN(budUnits) + ' x ' + fmt(budCM) + ') - ' + fmt(budFixed), result: fmt(staticBudgetOI) },
    { label: 'Flexible Budget OI', formula: '(Act Units x Bud CM) - Bud Fixed', values: '(' + fmtN(actUnits) + ' x ' + fmt(budCM) + ') - ' + fmt(budFixed), result: fmt(flexBudgetOI) },
    { label: 'Actual OI', formula: '(Act Units x Act CM) - Act Fixed', values: '(' + fmtN(actUnits) + ' x ' + fmt(actCM) + ') - ' + fmt(actFixed), result: fmt(actualOI) },
    { label: 'Static Budget Variance', formula: 'Actual OI - Static Budget OI', values: fmt(actualOI) + ' - ' + fmt(staticBudgetOI), result: (staticVariance >= 0 ? '+' : '') + fmt(staticVariance), highlight: true },
    { label: 'Flexible Budget Variance', formula: 'Actual OI - Flexible Budget OI', values: fmt(actualOI) + ' - ' + fmt(flexBudgetOI), result: (flexVariance >= 0 ? '+' : '') + fmt(flexVariance) + (flexVariance >= 0 ? ' F' : ' U'), highlight: true },
    { label: 'Sales Volume Variance', formula: 'Flexible Budget OI - Static Budget OI', values: fmt(flexBudgetOI) + ' - ' + fmt(staticBudgetOI), result: (salesVolVariance >= 0 ? '+' : '') + fmt(salesVolVariance) + (salesVolVariance >= 0 ? ' F' : ' U'), highlight: true }
  ], { title: 'Variance Analysis Show Work', defaultOpen: false });
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const budUnits     = val('a-bud-units');
  const actUnits     = val('a-act-units');
  const budPrice     = val('a-bud-price');
  const actPrice     = val('a-act-price');
  const dmStdQty     = val('a-dm-std-qty');
  const dmStdPrice   = val('a-dm-std-price');
  const dmActQty     = val('a-dm-act-qty');
  const dmActPrice   = val('a-dm-act-price');
  const dlStdHrs     = val('a-dl-std-hrs');
  const dlStdRate    = val('a-dl-std-rate');
  const dlActHrs     = val('a-dl-act-hrs');
  const dlActRate    = val('a-dl-act-rate');
  const budFixed     = val('a-bud-fixed');
  const actFixed     = val('a-act-fixed');

  const dmFlexQty    = actUnits * dmStdQty;
  const dmPriceVar   = (dmStdPrice - dmActPrice) * dmActQty;
  const dmEffVar     = (dmFlexQty - dmActQty) * dmStdPrice;
  const dmTotalVar   = dmPriceVar + dmEffVar;

  const dlFlexHrs    = actUnits * dlStdHrs;
  const dlPriceVar   = (dlStdRate - dlActRate) * dlActHrs;
  const dlEffVar     = (dlFlexHrs - dlActHrs) * dlStdRate;
  const dlTotalVar   = dlPriceVar + dlEffVar;

  const revPriceVar  = (actPrice - budPrice) * actUnits;
  const revVolVar    = (actUnits - budUnits) * budPrice;
  const fixedVar     = budFixed - actFixed;

  const totalVar     = revPriceVar + revVolVar + dmTotalVar + dlTotalVar + fixedVar;

  function varRow(label, v, explanation) {
    return '<tr><td>' + label + '</td><td>' + fav(v) + '</td><td style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' + explanation + '</td></tr>';
  }

  const out = el('a-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Complete Variance Summary</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<thead><tr><th>Variance</th><th>Amount</th><th>Explanation</th></tr></thead>'
    + '<tbody>'
    + varRow('Revenue: Selling Price Variance', revPriceVar, 'Actual price ' + fmt(actPrice) + ' vs standard ' + fmt(budPrice) + ' on ' + fmtN(actUnits) + ' units')
    + varRow('Revenue: Sales Volume Variance', revVolVar, fmtN(actUnits) + ' actual vs ' + fmtN(budUnits) + ' budgeted units at ' + fmt(budPrice))
    + varRow('DM: Price Variance', dmPriceVar, 'Paid ' + fmt(dmActPrice) + '/lb vs standard ' + fmt(dmStdPrice) + '/lb on ' + fmtN(dmActQty) + ' lbs')
    + varRow('DM: Efficiency Variance', dmEffVar, 'Used ' + fmtN(dmActQty) + ' lbs vs flexible budget ' + fmtN(dmFlexQty) + ' lbs at ' + fmt(dmStdPrice))
    + varRow('DL: Price Variance', dlPriceVar, 'Paid ' + fmt(dlActRate) + '/hr vs standard ' + fmt(dlStdRate) + '/hr on ' + fmtN(dlActHrs) + ' hrs')
    + varRow('DL: Efficiency Variance', dlEffVar, 'Used ' + fmtN(dlActHrs) + ' hrs vs flexible budget ' + fmtN(dlFlexHrs) + ' hrs at ' + fmt(dlStdRate))
    + varRow('Fixed Cost Variance', fixedVar, 'Actual fixed ' + fmt(actFixed) + ' vs budgeted ' + fmt(budFixed))
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Total Variance from Static Budget OI</td><td>' + fav(totalVar) + '</td><td></td></tr></tfoot>'
    + '</table></div>'

    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">DM Variances</div>'
    + '<div style="font-size:var(--font-size-sm);margin-bottom:var(--space-1);">Price: ' + fav(dmPriceVar) + '</div>'
    + '<div style="font-size:var(--font-size-sm);margin-bottom:var(--space-1);">Efficiency: ' + fav(dmEffVar) + '</div>'
    + '<div style="font-size:var(--font-size-sm);font-weight:700;">Total: ' + fav(dmTotalVar) + '</div>'
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">DL Variances</div>'
    + '<div style="font-size:var(--font-size-sm);margin-bottom:var(--space-1);">Price: ' + fav(dlPriceVar) + '</div>'
    + '<div style="font-size:var(--font-size-sm);margin-bottom:var(--space-1);">Efficiency: ' + fav(dlEffVar) + '</div>'
    + '<div style="font-size:var(--font-size-sm);font-weight:700;">Total: ' + fav(dlTotalVar) + '</div>'
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Revenue Variances</div>'
    + '<div style="font-size:var(--font-size-sm);margin-bottom:var(--space-1);">Price: ' + fav(revPriceVar) + '</div>'
    + '<div style="font-size:var(--font-size-sm);margin-bottom:var(--space-1);">Volume: ' + fav(revVolVar) + '</div>'
    + '<div style="font-size:var(--font-size-sm);font-weight:700;">Total: ' + fav(revPriceVar + revVolVar) + '</div>'
    + '</div>'
    + '</div>'

    + '<div style="padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);border:1px solid var(--color-gray-200);font-size:var(--font-size-sm);color:var(--color-gray-600);">'
    + '<strong>How to use this:</strong> Price variances point to the purchasing or sales manager. Efficiency variances point to the production manager. Volume variances point to the sales manager. Each variance has a different owner and a different corrective action.'
    + '</div>'

    + '</div>';

  renderShowWork(el('a-show-work'), [
    { label: 'DM Price Variance', formula: '(Std Price - Act Price) x Act Qty', values: '(' + fmt(dmStdPrice) + ' - ' + fmt(dmActPrice) + ') x ' + fmtN(dmActQty), result: fav(dmPriceVar), highlight: true },
    { label: 'DM Efficiency Variance', formula: '(Flex Qty - Act Qty) x Std Price', values: '(' + fmtN(dmFlexQty) + ' - ' + fmtN(dmActQty) + ') x ' + fmt(dmStdPrice), result: fav(dmEffVar), highlight: true },
    { label: 'DL Price Variance', formula: '(Std Rate - Act Rate) x Act Hours', values: '(' + fmt(dlStdRate) + ' - ' + fmt(dlActRate) + ') x ' + fmtN(dlActHrs), result: fav(dlPriceVar), highlight: true },
    { label: 'DL Efficiency Variance', formula: '(Flex Hours - Act Hours) x Std Rate', values: '(' + fmtN(dlFlexHrs) + ' - ' + fmtN(dlActHrs) + ') x ' + fmt(dlStdRate), result: fav(dlEffVar), highlight: true },
    { label: 'Revenue Price Variance', formula: '(Act Price - Bud Price) x Act Units', values: '(' + fmt(actPrice) + ' - ' + fmt(budPrice) + ') x ' + fmtN(actUnits), result: fav(revPriceVar) },
    { label: 'Revenue Volume Variance', formula: '(Act Units - Bud Units) x Bud Price', values: '(' + fmtN(actUnits) + ' - ' + fmtN(budUnits) + ') x ' + fmt(budPrice), result: fav(revVolVar) },
    { label: 'Fixed Cost Variance', formula: 'Budgeted Fixed - Actual Fixed', values: fmt(budFixed) + ' - ' + fmt(actFixed), result: fav(fixedVar) },
    { label: 'Total Variance', formula: 'Sum of all variances', values: 'All components', result: fav(totalVar), highlight: true }
  ], { title: 'Level 3 Variance Analysis', defaultOpen: false });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();
  initScenario();
  el('c-calculate') && el('c-calculate').addEventListener('click', calcConcept);
  el('c-rand-favorable') && el('c-rand-favorable').addEventListener('click', () => {
    const budUnits = Math.round((5000 + Math.random() * 10000) / 100) * 100;
    const budPrice = Math.round(50 + Math.random() * 80);
    const budVC    = Math.round(budPrice * (0.35 + Math.random() * 0.2));
    const budFixed = Math.round((100000 + Math.random() * 300000) / 5000) * 5000;
    const actUnits = Math.round(budUnits * (1.05 + Math.random() * 0.15));
    const actPrice = Math.round(budPrice * (1.02 + Math.random() * 0.06));
    const actVC    = Math.round(budVC * (0.92 + Math.random() * 0.06));
    const actFixed = Math.round(budFixed * (0.93 + Math.random() * 0.05));
    setVal('c-bud-units', budUnits); setVal('c-act-units', actUnits);
    setVal('c-bud-price', budPrice); setVal('c-act-price', actPrice);
    setVal('c-bud-vc', budVC); setVal('c-act-vc', actVC);
    setVal('c-bud-fixed', budFixed); setVal('c-act-fixed', actFixed);
    calcConcept();
  });
  el('c-rand-unfavorable') && el('c-rand-unfavorable').addEventListener('click', () => {
    const budUnits = Math.round((5000 + Math.random() * 10000) / 100) * 100;
    const budPrice = Math.round(50 + Math.random() * 80);
    const budVC    = Math.round(budPrice * (0.35 + Math.random() * 0.2));
    const budFixed = Math.round((100000 + Math.random() * 300000) / 5000) * 5000;
    const actUnits = Math.round(budUnits * (0.75 + Math.random() * 0.15));
    const actPrice = Math.round(budPrice * (0.92 + Math.random() * 0.06));
    const actVC    = Math.round(budVC * (1.05 + Math.random() * 0.1));
    const actFixed = Math.round(budFixed * (1.04 + Math.random() * 0.08));
    setVal('c-bud-units', budUnits); setVal('c-act-units', actUnits);
    setVal('c-bud-price', budPrice); setVal('c-act-price', actPrice);
    setVal('c-bud-vc', budVC); setVal('c-act-vc', actVC);
    setVal('c-bud-fixed', budFixed); setVal('c-act-fixed', actFixed);
    calcConcept();
  });
  el('a-calculate') && el('a-calculate').addEventListener('click', calcAnalysis);
});