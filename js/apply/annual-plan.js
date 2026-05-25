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
      setVal('c-units', 10000); setVal('c-price', 85);
      setVal('c-var-mfg', 32); setVal('c-var-sga', 8);
      setVal('c-fixed-mfg', 180000); setVal('c-fixed-sga', 120000);
      setVal('c-target-margin', 15);
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
  const units      = val('c-units');
  const price      = val('c-price');
  const varMfg     = val('c-var-mfg');
  const varSGA     = val('c-var-sga');
  const fixedMfg   = val('c-fixed-mfg');
  const fixedSGA   = val('c-fixed-sga');
  const targetMgn  = val('c-target-margin') / 100;

  const vcPerUnit  = varMfg + varSGA;
  const cm         = price - vcPerUnit;
  const cmr        = price > 0 ? cm / price : 0;
  const totalFixed = fixedMfg + fixedSGA;
  const revenue    = units * price;
  const totalVC    = units * vcPerUnit;
  const totalCM    = units * cm;
  const oi         = totalCM - totalFixed;
  const oiMargin   = revenue > 0 ? oi / revenue : 0;
  const beUnits    = cm > 0 ? totalFixed / cm : 0;
  const opLeverage = oi > 0 ? totalCM / oi : 0;
  const targetOI   = revenue * targetMgn;
  const targetUnits = cm > 0 ? (totalFixed + targetOI) / cm : 0;
  const meetsTarget = oiMargin >= targetMgn;

  const whatIf = [
    { label: 'Price -5%',     newPrice: price * 0.95, newVC: vcPerUnit, newFixed: totalFixed },
    { label: 'Var Costs +10%', newPrice: price,       newVC: vcPerUnit * 1.1, newFixed: totalFixed },
    { label: 'Volume -20%',   newPrice: price,        newVC: vcPerUnit, newFixed: totalFixed, newUnits: units * 0.8 }
  ];

  const whatIfCards = whatIf.map(s => {
    const u   = s.newUnits || units;
    const c   = s.newPrice - s.newVC;
    const o   = u * c - s.newFixed;
    const d   = o - oi;
    return '<div style="flex:1 1 180px;min-width:160px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
      + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">' + s.label + '</div>'
      + '<div style="font-size:var(--font-size-xl);font-weight:800;color:' + (o >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + fmt(o) + '</div>'
      + '<div style="font-size:var(--font-size-xs);color:' + (d >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';margin-top:var(--space-1);">' + (d >= 0 ? '+' : '') + fmt(d) + ' vs plan</div>'
      + '</div>';
  }).join('');

  const verdictColor  = meetsTarget ? 'var(--color-success)' : 'var(--color-danger)';
  const verdictBg     = meetsTarget ? 'var(--color-success-bg)' : 'var(--color-danger-bg)';
  const verdictBorder = meetsTarget ? 'var(--color-success)' : 'var(--color-danger)';
  const verdictText   = meetsTarget
    ? 'Your plan delivers a <strong>' + fmtPct(oiMargin * 100) + '</strong> operating margin -- above the board target of <strong>' + fmtPct(targetMgn * 100) + '</strong>. Operating income is <strong>' + fmt(oi) + '</strong>. You need to sell at least <strong>' + fmtN(Math.ceil(beUnits)) + ' units</strong> to break even -- your plan is <strong>' + fmtN(Math.round(units - beUnits)) + ' units above that</strong>. For every 1% increase in volume, operating income grows <strong>' + fmtPct(opLeverage) + '</strong>.'
    : 'Your plan misses the board target. You are projecting a <strong>' + fmtPct(oiMargin * 100) + '</strong> margin but the board wants <strong>' + fmtPct(targetMgn * 100) + '</strong>. To hit the target you need either <strong>' + fmtN(Math.ceil(targetUnits)) + ' units</strong> sold, a price increase, or <strong>' + fmt(targetOI - oi) + '</strong> in cost reductions.';

  const out = el('c-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Projected Income Statement</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);"><tbody>'
    + '<tr><td>Revenue (' + fmtN(units) + ' x ' + fmt(price) + ')</td><td style="text-align:right;">' + fmt(revenue) + '</td></tr>'
    + '<tr><td>Variable Costs (' + fmtN(units) + ' x ' + fmt2(vcPerUnit) + ')</td><td style="text-align:right;">(' + fmt(totalVC) + ')</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Contribution Margin (' + fmtPct(cmr * 100) + ' ratio)</td><td style="text-align:right;">' + fmt(totalCM) + '</td></tr>'
    + '<tr><td>Fixed Manufacturing</td><td style="text-align:right;">(' + fmt(fixedMfg) + ')</td></tr>'
    + '<tr><td>Fixed Selling/Admin</td><td style="text-align:right;">(' + fmt(fixedSGA) + ')</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Operating Income</td><td style="text-align:right;">' + fmt(oi) + '</td></tr>'
    + '<tr><td style="color:var(--color-gray-500);">Operating Margin</td><td style="text-align:right;color:' + (meetsTarget ? 'var(--color-success)' : 'var(--color-danger)') + ';font-weight:700;">' + fmtPct(oiMargin * 100) + '</td></tr>'
    + '</tbody></table></div>'

    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Breakeven</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmtN(Math.ceil(beUnits)) + '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">units</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">CM per Unit</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt(cm) + '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' + fmtPct(cmr * 100) + ' ratio</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Op. Leverage</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + opLeverage.toFixed(1) + 'x</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">1% vol = ' + fmtPct(opLeverage) + ' OI</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Target Units</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmtN(Math.ceil(targetUnits)) + '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">for ' + fmtPct(targetMgn * 100) + ' margin</div></div>'
    + '</div>'

    + '<div style="margin-top:var(--space-4);padding:var(--space-5);border-radius:var(--radius-lg);background:' + verdictBg + ';border:1px solid ' + verdictBorder + ';margin-bottom:var(--space-5);">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:' + verdictColor + ';margin-bottom:var(--space-2);">' + (meetsTarget ? 'Plan meets board target' : 'Plan misses board target') + '</div>'
    + '<p style="margin:0;font-size:var(--font-size-sm);">' + verdictText + '</p>'
    + '</div>'

    + '<div style="font-size:var(--font-size-sm);font-weight:700;color:var(--color-primary-text);margin-bottom:var(--space-3);">What-If Scenarios</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">' + whatIfCards + '</div>'

    + '</div>';

  renderShowWork(el('c-show-work'), [
    { label: 'Variable Cost per Unit', formula: 'Variable Mfg + Variable SGA', values: fmt(varMfg) + ' + ' + fmt(varSGA), result: fmt2(vcPerUnit) },
    { label: 'Contribution Margin per Unit', formula: 'Price - Variable Cost', values: fmt(price) + ' - ' + fmt2(vcPerUnit), result: fmt(cm) },
    { label: 'CM Ratio', formula: 'CM / Price', values: fmt(cm) + ' / ' + fmt(price), result: fmtPct(cmr * 100) },
    { label: 'Total Contribution Margin', formula: 'Units x CM per Unit', values: fmtN(units) + ' x ' + fmt(cm), result: fmt(totalCM) },
    { label: 'Total Fixed Costs', formula: 'Fixed Mfg + Fixed SGA', values: fmt(fixedMfg) + ' + ' + fmt(fixedSGA), result: fmt(totalFixed) },
    { label: 'Operating Income', formula: 'Total CM - Total Fixed Costs', values: fmt(totalCM) + ' - ' + fmt(totalFixed), result: fmt(oi), highlight: true },
    { label: 'Operating Margin', formula: 'OI / Revenue', values: fmt(oi) + ' / ' + fmt(revenue), result: fmtPct(oiMargin * 100), highlight: true },
    { label: 'Breakeven Units', formula: 'Fixed Costs / CM per Unit', values: fmt(totalFixed) + ' / ' + fmt(cm), result: fmtN(Math.ceil(beUnits)) + ' units', highlight: true },
    { label: 'Operating Leverage', formula: 'Total CM / Operating Income', values: fmt(totalCM) + ' / ' + fmt(oi), result: opLeverage.toFixed(1) + 'x' }
  ], { title: 'Annual Plan Show Work', defaultOpen: false });
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const units     = val('a-units');
  const price     = val('a-price');
  const varMfg    = val('a-var-mfg');
  const varSGA    = val('a-var-sga');
  const fixedMfg  = val('a-fixed-mfg');
  const fixedSGA  = val('a-fixed-sga');
  const begFG     = val('a-beg-fg');
  const endFG     = val('a-end-fg');
  const dmPerUnit = val('a-dm-per-unit');
  const dmCost    = val('a-dm-cost');
  const dlHrs     = val('a-dl-hrs');
  const dlRate    = val('a-dl-rate');

  const unitsToProdu = units - begFG + endFG;
  const totalDM      = unitsToProdu * dmPerUnit * dmCost;
  const totalDL      = unitsToProdu * dlHrs * dlRate;
  const varOH        = varMfg * unitsToProdu - (unitsToProdu * dmPerUnit * dmCost) - (unitsToProdu * dlHrs * dlRate);
  const vcPerUnit    = varMfg + varSGA;
  const cm           = price - vcPerUnit;
  const totalFixed   = fixedMfg + fixedSGA;
  const revenue      = units * price;
  const totalVC      = units * vcPerUnit;
  const totalCM      = units * cm;
  const oi           = totalCM - totalFixed;
  const oiMargin     = revenue > 0 ? oi / revenue : 0;
  const beUnits      = cm > 0 ? totalFixed / cm : 0;

  const sensLevels = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
  const sensRows = sensLevels.map(pct => {
    const u   = Math.round(units * pct);
    const rev = u * price;
    const o   = u * cm - totalFixed;
    const m   = rev > 0 ? o / rev : 0;
    const isBase = pct === 1.0;
    return '<tr' + (isBase ? ' class="ch12-result-table__relevant-total"' : '') + '>'
      + '<td>' + fmtPct(pct * 100) + (isBase ? ' (plan)' : '') + '</td>'
      + '<td>' + fmtN(u) + '</td>'
      + '<td>' + fmt(rev) + '</td>'
      + '<td>' + fmt(u * cm) + '</td>'
      + '<td>' + fmt(o) + '</td>'
      + '<td class="' + (m >= 0.15 ? 'variance-fav' : m >= 0 ? '' : 'variance-unfav') + '">' + fmtPct(m * 100) + '</td>'
      + '</tr>';
  }).join('');

  const out = el('a-output');
  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-5);">'

    + '<div style="flex:1 1 280px;min-width:260px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Sales Budget</div>'
    + '<table class="ch12-result-table" style="width:100%;"><tbody>'
    + '<tr><td>Budgeted units sold</td><td style="text-align:right;">' + fmtN(units) + '</td></tr>'
    + '<tr><td>Selling price</td><td style="text-align:right;">' + fmt(price) + '</td></tr>'
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Budgeted Revenue</td><td style="text-align:right;">' + fmt(revenue) + '</td></tr></tfoot></table>'
    + '</div>'

    + '<div style="flex:1 1 280px;min-width:260px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Production Budget</div>'
    + '<table class="ch12-result-table" style="width:100%;"><tbody>'
    + '<tr><td>Units to sell</td><td style="text-align:right;">' + fmtN(units) + '</td></tr>'
    + '<tr><td>+ Target ending FG</td><td style="text-align:right;">' + fmtN(endFG) + '</td></tr>'
    + '<tr><td>- Beginning FG</td><td style="text-align:right;">(' + fmtN(begFG) + ')</td></tr>'
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Units to Produce</td><td style="text-align:right;">' + fmtN(unitsToProdu) + '</td></tr></tfoot></table>'
    + '</div>'

    + '<div style="flex:1 1 280px;min-width:260px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Direct Materials Budget</div>'
    + '<table class="ch12-result-table" style="width:100%;"><tbody>'
    + '<tr><td>Units to produce</td><td style="text-align:right;">' + fmtN(unitsToProdu) + '</td></tr>'
    + '<tr><td>DM per unit (' + dmPerUnit + ' lbs)</td><td style="text-align:right;">' + fmtN(unitsToProdu * dmPerUnit) + ' lbs</td></tr>'
    + '<tr><td>Cost per lb</td><td style="text-align:right;">' + fmt2(dmCost) + '</td></tr>'
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Total DM Cost</td><td style="text-align:right;">' + fmt(totalDM) + '</td></tr></tfoot></table>'
    + '</div>'

    + '<div style="flex:1 1 280px;min-width:260px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Direct Labor Budget</div>'
    + '<table class="ch12-result-table" style="width:100%;"><tbody>'
    + '<tr><td>Units to produce</td><td style="text-align:right;">' + fmtN(unitsToProdu) + '</td></tr>'
    + '<tr><td>DL hours per unit</td><td style="text-align:right;">' + dlHrs + ' hrs</td></tr>'
    + '<tr><td>Total DL hours</td><td style="text-align:right;">' + fmtN(unitsToProdu * dlHrs) + '</td></tr>'
    + '<tr><td>Labor rate</td><td style="text-align:right;">' + fmt2(dlRate) + '/hr</td></tr>'
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Total DL Cost</td><td style="text-align:right;">' + fmt(totalDL) + '</td></tr></tfoot></table>'
    + '</div>'

    + '</div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Budgeted Income Statement</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);"><tbody>'
    + '<tr><td>Revenue</td><td style="text-align:right;">' + fmt(revenue) + '</td></tr>'
    + '<tr><td>Variable Costs</td><td style="text-align:right;">(' + fmt(totalVC) + ')</td></tr>'
    + '<tr class="ch12-result-table__relevant-total"><td>Contribution Margin</td><td style="text-align:right;">' + fmt(totalCM) + '</td></tr>'
    + '<tr><td>Fixed Manufacturing</td><td style="text-align:right;">(' + fmt(fixedMfg) + ')</td></tr>'
    + '<tr><td>Fixed Selling/Admin</td><td style="text-align:right;">(' + fmt(fixedSGA) + ')</td></tr>'
    + '<tr class="ch12-result-table__total"><td>Operating Income</td><td style="text-align:right;">' + fmt(oi) + '</td></tr>'
    + '<tr><td style="color:var(--color-gray-500);">Operating Margin</td><td style="text-align:right;font-weight:700;">' + fmtPct(oiMargin * 100) + '</td></tr>'
    + '</tbody></table></div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Volume Sensitivity Analysis</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">'
    + '<thead><tr><th>Volume %</th><th>Units</th><th>Revenue</th><th>Contribution Margin</th><th>Operating Income</th><th>OI Margin</th></tr></thead>'
    + '<tbody>' + sensRows + '</tbody>'
    + '</table></div>'
    + '<div style="margin-top:var(--space-3);padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);border:1px solid var(--color-gray-200);font-size:var(--font-size-sm);color:var(--color-gray-600);">Green rows meet the 15% margin target. The plan breaks even at <strong>' + fmtN(Math.ceil(beUnits)) + ' units</strong> -- ' + fmtPct((beUnits / units) * 100) + ' of plan volume. Fixed costs of <strong>' + fmt(totalFixed) + '</strong> must be covered before any profit is earned.</div>'

    + '</div>';

  renderShowWork(el('a-show-work'), [
    { label: 'Units to Produce', formula: 'Units Sold + Ending FG - Beginning FG', values: fmtN(units) + ' + ' + fmtN(endFG) + ' - ' + fmtN(begFG), result: fmtN(unitsToProdu) },
    { label: 'Total DM Cost', formula: 'Units to Produce x DM per Unit x DM Cost', values: fmtN(unitsToProdu) + ' x ' + dmPerUnit + ' x ' + fmt2(dmCost), result: fmt(totalDM) },
    { label: 'Total DL Cost', formula: 'Units to Produce x DL Hours x DL Rate', values: fmtN(unitsToProdu) + ' x ' + dlHrs + ' x ' + fmt2(dlRate), result: fmt(totalDL) },
    { label: 'Budgeted Revenue', formula: 'Units Sold x Price', values: fmtN(units) + ' x ' + fmt(price), result: fmt(revenue) },
    { label: 'Budgeted Operating Income', formula: 'Total CM - Total Fixed Costs', values: fmt(totalCM) + ' - ' + fmt(totalFixed), result: fmt(oi), highlight: true },
    { label: 'Budgeted Operating Margin', formula: 'OI / Revenue', values: fmt(oi) + ' / ' + fmt(revenue), result: fmtPct(oiMargin * 100), highlight: true }
  ], { title: 'Master Budget Show Work', defaultOpen: false });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();
  initScenario();
  el('c-calculate') && el('c-calculate').addEventListener('click', calcConcept);
  el('a-calculate') && el('a-calculate').addEventListener('click', calcAnalysis);
});