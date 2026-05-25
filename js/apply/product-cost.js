import { initHeader } from '/js/components/header.js';
import { renderShowWork } from '/js/components/show-work.js';

const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmt2   = n => '$' + Math.abs(n).toFixed(2);
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (Math.round(n * 10) / 10).toFixed(1) + '%';

const el  = id => document.getElementById(id);
const val = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
const sval = id => { const n = el(id); return n ? n.value.trim() : ''; };
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
      setVal('c-units', 50);
      setVal('c-selling-price', 200);
      setVal('c-dm-qty', 8);
      setVal('c-dm-rate', 6);
      setVal('c-dl-hrs', 3);
      setVal('c-dl-rate', 25);
      setVal('c-oh-rate', 18);
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
  const units        = val('c-units');
  const sellingPrice = val('c-selling-price');
  const dmQty        = val('c-dm-qty');
  const dmRate       = val('c-dm-rate');
  const dlHrs        = val('c-dl-hrs');
  const dlRate       = val('c-dl-rate');
  const ohRate       = val('c-oh-rate');

  const dmPerUnit    = dmQty * dmRate;
  const dlPerUnit    = dlHrs * dlRate;
  const ohPerUnit    = dlHrs * ohRate;
  const totalPerUnit = dmPerUnit + dlPerUnit + ohPerUnit;
  const totalJob     = totalPerUnit * units;
  const grossMargin  = sellingPrice > 0 ? (sellingPrice - totalPerUnit) / sellingPrice : 0;
  const jobRevenue   = sellingPrice * units;
  const jobProfit    = jobRevenue - totalJob;

  const dmPct = totalPerUnit > 0 ? dmPerUnit / totalPerUnit : 0;
  const dlPct = totalPerUnit > 0 ? dlPerUnit / totalPerUnit : 0;
  const ohPct = totalPerUnit > 0 ? ohPerUnit / totalPerUnit : 0;

  const out = el('c-output');

  const verdictColor = grossMargin >= 0.3 ? 'var(--color-success)' : grossMargin >= 0.1 ? 'var(--color-warning)' : 'var(--color-danger)';
  const verdictBg    = grossMargin >= 0.3 ? 'var(--color-success-bg)' : grossMargin >= 0.1 ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)';
  const verdictBorder = grossMargin >= 0.3 ? 'var(--color-success)' : grossMargin >= 0.1 ? 'var(--color-warning)' : 'var(--color-danger)';

  const verdictText = grossMargin >= 0.3
    ? 'Each unit costs <strong>' + fmt2(totalPerUnit) + '</strong> to make. At your selling price of <strong>' + fmt(sellingPrice) + '</strong>, your gross margin is <strong>' + fmtPct(grossMargin * 100) + '</strong> -- healthy. This job generates <strong>' + fmt(jobProfit) + '</strong> in gross profit.'
    : grossMargin >= 0.1
      ? 'Each unit costs <strong>' + fmt2(totalPerUnit) + '</strong> to make. Your gross margin of <strong>' + fmtPct(grossMargin * 100) + '</strong> is thin. Small cost overruns or price concessions could eliminate your profit on this job.'
      : grossMargin >= 0
        ? 'Each unit costs <strong>' + fmt2(totalPerUnit) + '</strong> to make. Your gross margin of <strong>' + fmtPct(grossMargin * 100) + '</strong> is very thin. This job barely covers its direct costs before any selling or administrative expenses.'
        : 'Each unit costs <strong>' + fmt2(totalPerUnit) + '</strong> to make but you are selling for only <strong>' + fmt(sellingPrice) + '</strong>. You lose <strong>' + fmt2(Math.abs(sellingPrice - totalPerUnit)) + '</strong> per unit on this job.';

  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Cost per Unit</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt2(totalPerUnit) + '</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Total Job Cost</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' + fmt(totalJob) + '</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Gross Margin</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:' + verdictColor + ';">' + fmtPct(grossMargin * 100) + '</div></div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Job Profit</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:' + (jobProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + fmt(jobProfit) + '</div></div>'
    + '</div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Cost Breakdown per Unit</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);"><thead><tr><th>Cost Component</th><th>Calculation</th><th>Per Unit</th><th>% of Total</th><th>Total Job</th></tr></thead><tbody>'
    + '<tr><td>Direct Materials</td><td>' + fmtN(dmQty) + ' units x ' + fmt2(dmRate) + '</td><td>' + fmt2(dmPerUnit) + '</td><td>' + fmtPct(dmPct * 100) + '</td><td>' + fmt(dmPerUnit * units) + '</td></tr>'
    + '<tr><td>Direct Labor</td><td>' + dlHrs + ' hrs x ' + fmt2(dlRate) + '</td><td>' + fmt2(dlPerUnit) + '</td><td>' + fmtPct(dlPct * 100) + '</td><td>' + fmt(dlPerUnit * units) + '</td></tr>'
    + '<tr><td>Manufacturing Overhead</td><td>' + dlHrs + ' DLH x ' + fmt2(ohRate) + '</td><td>' + fmt2(ohPerUnit) + '</td><td>' + fmtPct(ohPct * 100) + '</td><td>' + fmt(ohPerUnit * units) + '</td></tr>'
    + '</tbody><tfoot><tr class="ch12-result-table__total"><td>Total Manufacturing Cost</td><td></td><td>' + fmt2(totalPerUnit) + '</td><td>100%</td><td>' + fmt(totalJob) + '</td></tr></tfoot></table></div>'

    + '<div style="margin-top:var(--space-4);padding:var(--space-5);border-radius:var(--radius-lg);background:' + verdictBg + ';border:1px solid ' + verdictBorder + ';">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:' + verdictColor + ';margin-bottom:var(--space-2);">Bottom Line</div>'
    + '<p style="margin:0;font-size:var(--font-size-sm);">' + verdictText + '</p>'
    + '</div>'

    + '<div id="c-show-work"></div>'
    + '</div>';

  renderShowWork(el('c-show-work'), [
    { label: 'Direct Materials per Unit', formula: 'Quantity per Unit x Material Cost', values: fmtN(dmQty) + ' x ' + fmt2(dmRate), result: fmt2(dmPerUnit) },
    { label: 'Direct Labor per Unit', formula: 'Hours per Unit x Labor Rate', values: dlHrs + ' x ' + fmt2(dlRate), result: fmt2(dlPerUnit) },
    { label: 'Overhead per Unit', formula: 'DL Hours per Unit x Overhead Rate', values: dlHrs + ' x ' + fmt2(ohRate), result: fmt2(ohPerUnit) },
    { label: 'Total Cost per Unit', formula: 'DM + DL + OH', values: fmt2(dmPerUnit) + ' + ' + fmt2(dlPerUnit) + ' + ' + fmt2(ohPerUnit), result: fmt2(totalPerUnit), highlight: true },
    { label: 'Total Job Cost', formula: 'Cost per Unit x Units', values: fmt2(totalPerUnit) + ' x ' + fmtN(units), result: fmt(totalJob), highlight: true },
    { label: 'Gross Margin', formula: '(Selling Price - Cost per Unit) / Selling Price', values: '(' + fmt(sellingPrice) + ' - ' + fmt2(totalPerUnit) + ') / ' + fmt(sellingPrice), result: fmtPct(grossMargin * 100), highlight: true }
  ], { title: 'Job Cost Show Work', defaultOpen: false });
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const totalOH    = val('a-total-oh');
  const totalDLH   = val('a-total-dlh');
  const p1Name     = sval('a-p1-name') || 'Product 1';
  const p1Units    = val('a-p1-units');
  const p1DLH      = val('a-p1-dlh');
  const p1DM       = val('a-p1-dm');
  const p1DLRate   = val('a-p1-dl-rate');
  const p1Setups   = val('a-p1-setups');
  const p1Insp     = val('a-p1-inspections');
  const p2Name     = sval('a-p2-name') || 'Product 2';
  const p2Units    = val('a-p2-units');
  const p2DLH      = val('a-p2-dlh');
  const p2DM       = val('a-p2-dm');
  const p2DLRate   = val('a-p2-dl-rate');
  const p2Setups   = val('a-p2-setups');
  const p2Insp     = val('a-p2-inspections');
  const setupCost  = val('a-pool-setup-cost');
  const inspCost   = val('a-pool-inspection-cost');
  const otherCost  = val('a-pool-other-cost');

  const simpleRate = totalDLH > 0 ? totalOH / totalDLH : 0;

  // Simple overhead allocation
  const p1SimpleOH  = p1DLH * simpleRate;
  const p2SimpleOH  = p2DLH * simpleRate;
  const p1SimpleDL  = p1DLH * p1DLRate;
  const p2SimpleDL  = p2DLH * p2DLRate;
  const p1SimpleCost = p1DM + p1SimpleDL + p1SimpleOH;
  const p2SimpleCost = p2DM + p2SimpleDL + p2SimpleOH;

  // ABC allocation
  const totalSetups = p1Setups + p2Setups;
  const totalInsp   = p1Insp * p1Units + p2Insp * p2Units;
  const totalDLHAll = p1DLH * p1Units + p2DLH * p2Units;

  const setupRate   = totalSetups > 0 ? setupCost / totalSetups : 0;
  const inspRate    = totalInsp > 0 ? inspCost / totalInsp : 0;
  const otherRate   = totalDLHAll > 0 ? otherCost / totalDLHAll : 0;

  const p1SetupOH   = p1Units > 0 ? (p1Setups * setupRate) / p1Units : 0;
  const p1InspOH    = p1Insp * inspRate;
  const p1OtherOH   = p1DLH * otherRate;
  const p1ABCOH     = p1SetupOH + p1InspOH + p1OtherOH;
  const p1ABCCost   = p1DM + p1SimpleDL + p1ABCOH;

  const p2SetupOH   = p2Units > 0 ? (p2Setups * setupRate) / p2Units : 0;
  const p2InspOH    = p2Insp * inspRate;
  const p2OtherOH   = p2DLH * otherRate;
  const p2ABCOH     = p2SetupOH + p2InspOH + p2OtherOH;
  const p2ABCCost   = p2DM + p2SimpleDL + p2ABCOH;

  const p1Diff = p1ABCCost - p1SimpleCost;
  const p2Diff = p2ABCCost - p2SimpleCost;

  const out = el('a-output');

  out.innerHTML = '<div style="margin-top:var(--space-5);">'

    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-5);">'

    + '<div style="flex:1 1 300px;min-width:280px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-3);color:var(--color-primary-text);">Simple Overhead Rate</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);margin-bottom:var(--space-3);">' + fmt2(simpleRate) + ' per DLH</div>'
    + '<table class="ch12-result-table" style="width:100%;"><thead><tr><th>Product</th><th>DM</th><th>DL</th><th>OH</th><th>Total/Unit</th></tr></thead><tbody>'
    + '<tr><td>' + p1Name + '</td><td>' + fmt2(p1DM) + '</td><td>' + fmt2(p1SimpleDL) + '</td><td>' + fmt2(p1SimpleOH) + '</td><td><strong>' + fmt2(p1SimpleCost) + '</strong></td></tr>'
    + '<tr><td>' + p2Name + '</td><td>' + fmt2(p2DM) + '</td><td>' + fmt2(p2SimpleDL) + '</td><td>' + fmt2(p2SimpleOH) + '</td><td><strong>' + fmt2(p2SimpleCost) + '</strong></td></tr>'
    + '</tbody></table></div>'

    + '<div style="flex:1 1 300px;min-width:280px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-3);color:var(--color-primary-text);">Activity-Based Costing</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:var(--space-3);">Setup: ' + fmt2(setupRate) + '/setup   Inspection: ' + fmt2(inspRate) + '/inspection   Other: ' + fmt2(otherRate) + '/DLH</div>'
    + '<table class="ch12-result-table" style="width:100%;"><thead><tr><th>Product</th><th>DM</th><th>DL</th><th>OH (ABC)</th><th>Total/Unit</th></tr></thead><tbody>'
    + '<tr><td>' + p1Name + '</td><td>' + fmt2(p1DM) + '</td><td>' + fmt2(p1SimpleDL) + '</td><td>' + fmt2(p1ABCOH) + '</td><td><strong>' + fmt2(p1ABCCost) + '</strong></td></tr>'
    + '<tr><td>' + p2Name + '</td><td>' + fmt2(p2DM) + '</td><td>' + fmt2(p2SimpleDL) + '</td><td>' + fmt2(p2ABCOH) + '</td><td><strong>' + fmt2(p2ABCCost) + '</strong></td></tr>'
    + '</tbody></table></div>'

    + '</div>'

    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Costing Difference</h4>'
    + '<table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-4);"><thead><tr><th>Product</th><th>Simple Cost</th><th>ABC Cost</th><th>Difference</th><th>Implication</th></tr></thead><tbody>'
    + '<tr><td>' + p1Name + '</td><td>' + fmt2(p1SimpleCost) + '</td><td>' + fmt2(p1ABCCost) + '</td><td class="' + (p1Diff >= 0 ? 'variance-unfav' : 'variance-fav') + '">' + (p1Diff >= 0 ? '+' : '') + fmt2(p1Diff) + '</td><td>' + (p1Diff > 0.5 ? p1Name + ' is <strong>under-costed</strong> under simple allocation' : p1Diff < -0.5 ? p1Name + ' is <strong>over-costed</strong> under simple allocation' : 'Methods agree') + '</td></tr>'
    + '<tr><td>' + p2Name + '</td><td>' + fmt2(p2SimpleCost) + '</td><td>' + fmt2(p2ABCCost) + '</td><td class="' + (p2Diff >= 0 ? 'variance-unfav' : 'variance-fav') + '">' + (p2Diff >= 0 ? '+' : '') + fmt2(p2Diff) + '</td><td>' + (p2Diff > 0.5 ? p2Name + ' is <strong>under-costed</strong> under simple allocation' : p2Diff < -0.5 ? p2Name + ' is <strong>over-costed</strong> under simple allocation' : 'Methods agree') + '</td></tr>'
    + '</tbody></table>'

    + '<div style="padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);border:1px solid var(--color-gray-200);font-size:var(--font-size-sm);color:var(--color-gray-600);">'
    + '<strong>Why this matters:</strong> If you price based on simple overhead costs, you may be overcharging for high-volume simple products (losing sales) and undercharging for low-volume complex products (losing money). ABC reveals the true cost of complexity.'
    + '</div>'

    + '</div>';
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();
  initScenario();
  el('c-calculate') && el('c-calculate').addEventListener('click', calcConcept);
  el('c-rand-profitable') && el('c-rand-profitable').addEventListener('click', () => {
    const dmQty  = Math.round((2 + Math.random() * 8) * 2) / 2;
    const dmRate = Math.round((3 + Math.random() * 12) * 4) / 4;
    const dlHrs  = Math.round((0.5 + Math.random() * 4) * 4) / 4;
    const dlRate = Math.round(15 + Math.random() * 25);
    const ohRate = Math.round(10 + Math.random() * 20);
    const cost   = dmQty * dmRate + dlHrs * dlRate + dlHrs * ohRate;
    const price  = Math.round(cost * (1.35 + Math.random() * 0.4));
    const units  = Math.round(10 + Math.random() * 90);
    setVal('c-units', units); setVal('c-selling-price', price);
    setVal('c-dm-qty', dmQty); setVal('c-dm-rate', dmRate);
    setVal('c-dl-hrs', dlHrs); setVal('c-dl-rate', dlRate); setVal('c-oh-rate', ohRate);
    calcConcept();
  });
  el('c-rand-unprofitable') && el('c-rand-unprofitable').addEventListener('click', () => {
    const dmQty  = Math.round((2 + Math.random() * 8) * 2) / 2;
    const dmRate = Math.round((3 + Math.random() * 12) * 4) / 4;
    const dlHrs  = Math.round((0.5 + Math.random() * 4) * 4) / 4;
    const dlRate = Math.round(15 + Math.random() * 25);
    const ohRate = Math.round(10 + Math.random() * 20);
    const cost   = dmQty * dmRate + dlHrs * dlRate + dlHrs * ohRate;
    const price  = Math.round(cost * (0.75 + Math.random() * 0.2));
    const units  = Math.round(10 + Math.random() * 90);
    setVal('c-units', units); setVal('c-selling-price', price);
    setVal('c-dm-qty', dmQty); setVal('c-dm-rate', dmRate);
    setVal('c-dl-hrs', dlHrs); setVal('c-dl-rate', dlRate); setVal('c-oh-rate', ohRate);
    calcConcept();
  });
  el('a-calculate') && el('a-calculate').addEventListener('click', calcAnalysis);
});