import { initHeader } from '/js/components/header.js';
import { renderShowWork } from '/js/components/show-work.js';

const fmt    = (n) => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtN   = (n) => Math.round(n).toLocaleString();
const fmtPct = (n) => (Math.round(n * 10) / 10).toFixed(1) + '%';
const fmtD   = (n) => (n >= 0 ? '$' : '($') + Math.abs(Math.round(n)).toLocaleString() + (n < 0 ? ')' : '');

const el  = (id) => document.getElementById(id);
const val = (id) => { const n = el(id); return n ? parseFloat(n.value) || 0 : 0; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

// ── Depth toggle ──────────────────────────────────────────────────────────────

function initDepthToggle() {
  const buttons = document.querySelectorAll('.depth-btn');
  buttons.forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('depth-btn--active'));
      btn.classList.add('depth-btn--active');
      const depth = btn.dataset.depth;
      document.querySelectorAll('.depth-panel').forEach((p) => {
        p.classList.toggle('depth-panel--active', p.id === 'depth-' + depth);
      });
    });
  });
}

// ── Scenario card ─────────────────────────────────────────────────────────────

function initScenario() {
  const useBtn = el('scenario-use-btn');
  if (useBtn) {
    useBtn.addEventListener('click', () => {
      setVal('c-op-income', 2000000);
      setVal('c-assets',    10000000);
      setVal('c-hurdle',    15);
      setVal('c-wacc',      12);
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

// ── KPI tile helper ───────────────────────────────────────────────────────────

function kpi(label, value, sub, color) {
  return '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">'
    + '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">' + label + '</div>'
    + '<div style="font-size:var(--font-size-2xl);font-weight:800;color:' + color + ';">' + value + '</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' + sub + '</div>'
    + '</div>';
}

// ── Concept ───────────────────────────────────────────────────────────────────

function calcConcept() {
  const oi     = val('c-op-income');
  const assets = val('c-assets');
  const hurdle = val('c-hurdle') / 100;
  const wacc   = val('c-wacc') / 100;

  const roi = assets > 0 ? oi / assets : 0;
  const ri  = oi - hurdle * assets;
  const eva = oi - wacc * assets;

  const roiColor = roi >= hurdle ? 'var(--color-success)' : 'var(--color-danger)';
  const riColor  = ri  >= 0     ? 'var(--color-success)' : 'var(--color-danger)';
  const evaColor = eva >= 0     ? 'var(--color-success)' : 'var(--color-danger)';

  const createsValue = ri > 0 && eva > 0;
  const destroysValue = ri < 0 && eva < 0;
  const verdictLabel = createsValue
    ? 'Value Creator -- division exceeds both hurdle rate and cost of capital'
    : destroysValue
      ? 'Value Destroyer -- division fails to cover required returns'
      : 'Mixed signals -- check hurdle rate vs cost of capital assumptions';
  const verdictBg     = createsValue ? 'var(--color-success-bg)' : destroysValue ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)';
  const verdictBorder = createsValue ? 'var(--color-success)'    : destroysValue ? 'var(--color-danger)'    : 'var(--color-warning)';
  const verdictColor  = createsValue ? 'var(--color-success)'    : destroysValue ? 'var(--color-danger)'    : 'var(--color-warning)';

  const verdictText = createsValue
    ? 'ROI of <strong>' + fmtPct(roi * 100) + '</strong> exceeds the hurdle rate of <strong>' + fmtPct(hurdle * 100) + '</strong>. Residual income of <strong>' + fmt(ri) + '</strong> confirms the division creates value above the required return. EVA of <strong>' + fmt(eva) + '</strong> shows value creation after the full cost of capital.'
    : destroysValue
      ? 'ROI of <strong>' + fmtPct(roi * 100) + '</strong> falls short of the hurdle rate of <strong>' + fmtPct(hurdle * 100) + '</strong>. Residual income of <strong>(' + fmt(Math.abs(ri)) + ')</strong> confirms the division is not covering its required return. EVA of <strong>(' + fmt(Math.abs(eva)) + ')</strong> shows value is being destroyed.'
      : 'ROI of <strong>' + fmtPct(roi * 100) + '</strong> is between the cost of capital (<strong>' + fmtPct(wacc * 100) + '</strong>) and hurdle rate (<strong>' + fmtPct(hurdle * 100) + '</strong>). EVA is positive but RI is negative -- the division covers its capital cost but not the full required return.';

  const out = el('c-output');
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + kpi('ROI', fmtPct(roi * 100), 'return on investment', roiColor)
    + kpi('Residual Income', fmtD(ri), 'vs hurdle rate', riColor)
    + kpi('EVA', fmtD(eva), 'vs cost of capital', evaColor)
    + '</div>'
    + '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:' + verdictBg + ';border:1px solid ' + verdictBorder + ';margin-bottom:var(--space-4);">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:' + verdictColor + ';margin-bottom:var(--space-2);">' + verdictLabel + '</div>'
    + '<p style="margin:0;font-size:var(--font-size-sm);">' + verdictText + '</p>'
    + '</div>'
    + '</div>';

  renderShowWork(el('c-show-work'), [
    {
      label: 'ROI',
      formula: 'Operating Income / Total Assets',
      values: fmt(oi) + ' / ' + fmt(assets),
      result: fmtPct(roi * 100),
      highlight: true,
    },
    {
      label: 'Imputed Capital Charge (Hurdle)',
      formula: 'Total Assets x Required Rate',
      values: fmt(assets) + ' x ' + fmtPct(hurdle * 100),
      result: fmt(hurdle * assets),
    },
    {
      label: 'Residual Income',
      formula: 'Operating Income - (Assets x Hurdle Rate)',
      values: fmt(oi) + ' - ' + fmt(hurdle * assets),
      result: fmtD(ri),
      highlight: true,
    },
    {
      label: 'Capital Charge (WACC)',
      formula: 'Total Assets x WACC',
      values: fmt(assets) + ' x ' + fmtPct(wacc * 100),
      result: fmt(wacc * assets),
    },
    {
      label: 'EVA',
      formula: 'Operating Income - (Assets x WACC)',
      values: fmt(oi) + ' - ' + fmt(wacc * assets),
      result: fmtD(eva),
      highlight: true,
    },
  ], { title: 'ROI, RI and EVA Show Work', defaultOpen: false });
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const revenue     = val('a-revenue');
  const oi          = val('a-op-income');
  const assets      = val('a-assets');
  const currLiab    = val('a-current-liabilities');
  const hurdle      = val('a-hurdle') / 100;
  const wacc        = val('a-wacc') / 100;
  const tpUnits     = val('a-tp-units');
  const tpPrice     = val('a-tp-price');
  const tpMarket    = val('a-tp-market');
  const tpVarCost   = val('a-tp-var-cost');

  // ── ROI / RI / EVA ──
  const roi         = assets > 0 ? oi / assets : 0;
  const ri          = oi - hurdle * assets;
  const investedCap = assets - currLiab;
  const eva         = oi - wacc * investedCap;

  // ── DuPont decomposition ──
  const margin      = revenue > 0 ? oi / revenue : 0;
  const turnover    = assets  > 0 ? revenue / assets : 0;
  const roiCheck    = margin * turnover;

  // ── Transfer pricing ──
  const tpRevenue       = tpUnits * tpPrice;
  const tpMarketRevenue = tpUnits * tpMarket;
  const tpVarTotal      = tpUnits * tpVarCost;
  const tpContribAtTP   = tpRevenue - tpVarTotal;
  const tpContribAtMkt  = tpMarketRevenue - tpVarTotal;
  const tpSubsidy       = tpMarketRevenue - tpRevenue;
  const tpFair          = tpPrice >= tpVarCost && tpPrice <= tpMarket;
  const tpBelowCost     = tpPrice < tpVarCost;

  // ── BSC perspectives ──
  const bscFinancial  = roi >= hurdle ? 'green' : 'red';
  const bscCustomer   = margin >= 0.08 ? 'green' : margin >= 0.04 ? 'yellow' : 'red';
  const bscInternal   = turnover >= 1.5 ? 'green' : turnover >= 1.0 ? 'yellow' : 'red';
  const bscLearning   = eva >= 0 ? 'green' : 'yellow';

  function bscDot(status) {
    const c = status === 'green' ? 'var(--color-success)' : status === 'yellow' ? 'var(--color-warning)' : 'var(--color-danger)';
    return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + c + ';margin-right:var(--space-2);"></span>';
  }

  const out = el('a-output');
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">'

    // ── Performance metrics table ──
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Performance Metrics</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">'
    + '<thead><tr><th>Metric</th><th>Formula</th><th>Result</th><th>Verdict</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>ROI</td><td>OI / Assets</td><td>' + fmtPct(roi * 100) + '</td><td class="' + (roi >= hurdle ? 'variance-fav' : 'variance-unfav') + '">' + (roi >= hurdle ? 'Meets hurdle' : 'Below hurdle') + '</td></tr>'
    + '<tr><td>Residual Income</td><td>OI - (Assets x Hurdle)</td><td>' + fmtD(ri) + '</td><td class="' + (ri >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (ri >= 0 ? 'Value created' : 'Value destroyed') + '</td></tr>'
    + '<tr><td>EVA</td><td>OI - (Invested Capital x WACC)</td><td>' + fmtD(eva) + '</td><td class="' + (eva >= 0 ? 'variance-fav' : 'variance-unfav') + '">' + (eva >= 0 ? 'Economic profit' : 'Economic loss') + '</td></tr>'
    + '</tbody></table></div>'

    // ── DuPont decomposition ──
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">DuPont Decomposition</h4>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">'
    + kpi('Profit Margin', fmtPct(margin * 100), 'OI / Revenue', 'var(--color-primary-text)')
    + kpi('Asset Turnover', turnover.toFixed(2) + 'x', 'Revenue / Assets', 'var(--color-primary-text)')
    + kpi('ROI', fmtPct(roiCheck * 100), 'Margin x Turnover', roi >= hurdle ? 'var(--color-success)' : 'var(--color-danger)')
    + '</div>'
    + '<div style="padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-gray-50);border:1px solid var(--color-gray-200);margin-bottom:var(--space-5);font-size:var(--font-size-sm);">'
    + '<strong>DuPont insight:</strong> '
    + (margin < 0.05 && turnover >= 1.5
        ? 'Low margin, high turnover strategy. To improve ROI, focus on pricing power and cost reduction rather than asset efficiency.'
        : margin >= 0.10 && turnover < 1.0
          ? 'High margin, low turnover strategy. To improve ROI, focus on sweating assets harder -- more revenue per dollar of assets deployed.'
          : 'Balanced margin and turnover. ROI improvement requires gains on both dimensions simultaneously.')
    + '</div>'

    // ── Transfer pricing ──
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Transfer Pricing Analysis</h4>'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-4);">'
    + '<thead><tr><th>Scenario</th><th>Price/Unit</th><th>Total Revenue</th><th>Contribution</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>Current Transfer Price</td><td>' + fmt(tpPrice) + '</td><td>' + fmt(tpRevenue) + '</td><td>' + fmtD(tpContribAtTP) + '</td></tr>'
    + '<tr class="ch12-t1-result__row--relevant"><td>At Market Price</td><td>' + fmt(tpMarket) + '</td><td>' + fmt(tpMarketRevenue) + '</td><td>' + fmtD(tpContribAtMkt) + '</td></tr>'
    + '<tr><td>Variable Cost Floor</td><td>' + fmt(tpVarCost) + '</td><td>--</td><td>$0 (break-even)</td></tr>'
    + '</tbody></table></div>'
    + '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:'
    + (tpBelowCost ? 'var(--color-danger-bg)' : tpFair ? 'var(--color-success-bg)' : 'var(--color-warning-bg)')
    + ';border:1px solid '
    + (tpBelowCost ? 'var(--color-danger)' : tpFair ? 'var(--color-success)' : 'var(--color-warning)')
    + ';margin-bottom:var(--space-5);">'
    + '<div style="font-size:var(--font-size-base);font-weight:700;color:'
    + (tpBelowCost ? 'var(--color-danger)' : tpFair ? 'var(--color-success)' : 'var(--color-warning)')
    + ';margin-bottom:var(--space-2);">'
    + (tpBelowCost
        ? 'Transfer price is below variable cost -- selling division loses on every unit'
        : tpFair
          ? 'Transfer price is within the acceptable range (variable cost to market price)'
          : 'Transfer price exceeds market price -- buying division is overpaying')
    + '</div>'
    + '<p style="margin:0;font-size:var(--font-size-sm);">'
    + 'The general transfer pricing rule sets the floor at <strong>variable cost (' + fmt(tpVarCost) + '/unit)</strong> and the ceiling at <strong>market price (' + fmt(tpMarket) + '/unit)</strong>. '
    + 'At the current transfer price of <strong>' + fmt(tpPrice) + '/unit</strong>, the selling division earns a contribution of <strong>' + fmtD(tpContribAtTP) + '</strong> on ' + fmtN(tpUnits) + ' units. '
    + (tpSubsidy > 0
        ? 'The buying division receives an implicit subsidy of <strong>' + fmt(tpSubsidy) + '</strong> vs market price -- this understates the buying division\'s true costs and overstates its performance.'
        : 'The transfer price is at or above market -- the buying division is not receiving a subsidy.')
    + '</p>'
    + '</div>'

    // ── Balanced Scorecard ──
    + '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Balanced Scorecard Perspectives</h4>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3);margin-bottom:var(--space-4);">'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-2);">' + bscDot(bscFinancial) + 'Financial</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">ROI ' + fmtPct(roi * 100) + ' vs hurdle ' + fmtPct(hurdle * 100) + '. ' + (roi >= hurdle ? 'Meets target.' : 'Below target.') + '</div>'
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-2);">' + bscDot(bscCustomer) + 'Customer</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Profit margin ' + fmtPct(margin * 100) + '. ' + (margin >= 0.08 ? 'Strong pricing power.' : margin >= 0.04 ? 'Moderate margin.' : 'Thin margin -- pricing or cost pressure.') + '</div>'
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-2);">' + bscDot(bscInternal) + 'Internal Process</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Asset turnover ' + turnover.toFixed(2) + 'x. ' + (turnover >= 1.5 ? 'Efficient asset use.' : turnover >= 1.0 ? 'Moderate efficiency.' : 'Low asset utilization.') + '</div>'
    + '</div>'
    + '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-2);">' + bscDot(bscLearning) + 'Learning &amp; Growth</div>'
    + '<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">EVA ' + fmtD(eva) + '. ' + (eva >= 0 ? 'Economic value being created.' : 'Capital costs exceed returns -- reinvestment risk.') + '</div>'
    + '</div>'
    + '</div>'
    + '</div>';

  renderShowWork(el('a-show-work'), [
    {
      label: 'ROI',
      formula: 'Operating Income / Total Assets',
      values: fmt(oi) + ' / ' + fmt(assets),
      result: fmtPct(roi * 100),
      highlight: true,
    },
    {
      label: 'Residual Income',
      formula: 'OI - (Assets x Hurdle Rate)',
      values: fmt(oi) + ' - (' + fmt(assets) + ' x ' + fmtPct(hurdle * 100) + ')',
      result: fmtD(ri),
      highlight: true,
    },
    {
      label: 'Invested Capital (for EVA)',
      formula: 'Total Assets - Current Liabilities',
      values: fmt(assets) + ' - ' + fmt(currLiab),
      result: fmt(investedCap),
    },
    {
      label: 'EVA',
      formula: 'OI - (Invested Capital x WACC)',
      values: fmt(oi) + ' - (' + fmt(investedCap) + ' x ' + fmtPct(wacc * 100) + ')',
      result: fmtD(eva),
      highlight: true,
    },
    {
      label: 'Profit Margin',
      formula: 'Operating Income / Revenue',
      values: fmt(oi) + ' / ' + fmt(revenue),
      result: fmtPct(margin * 100),
    },
    {
      label: 'Asset Turnover',
      formula: 'Revenue / Total Assets',
      values: fmt(revenue) + ' / ' + fmt(assets),
      result: turnover.toFixed(2) + 'x',
    },
    {
      label: 'ROI (DuPont check)',
      formula: 'Profit Margin x Asset Turnover',
      values: fmtPct(margin * 100) + ' x ' + turnover.toFixed(2),
      result: fmtPct(roiCheck * 100),
      highlight: true,
    },
    {
      label: 'Transfer Price Subsidy',
      formula: '(Market Price - Transfer Price) x Units',
      values: '(' + fmt(tpMarket) + ' - ' + fmt(tpPrice) + ') x ' + fmtN(tpUnits),
      result: fmt(tpSubsidy),
    },
  ], { title: 'Performance Analysis Show Work', defaultOpen: false });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initDepthToggle();
  initScenario();

  el('c-calculate') && el('c-calculate').addEventListener('click', calcConcept);
  el('a-calculate') && el('a-calculate').addEventListener('click', calcAnalysis);

  // Value Creator randomizer
  el('c-rand-creator') && el('c-rand-creator').addEventListener('click', () => {
    const assets = Math.round((5000000 + Math.random() * 20000000) / 100000) * 100000;
    const hurdle = Math.round((10 + Math.random() * 8) * 2) / 2;
    const wacc   = Math.round((hurdle - 2 - Math.random() * 3) * 2) / 2;
    const oi     = Math.round(assets * (hurdle / 100 + 0.03 + Math.random() * 0.05) / 10000) * 10000;
    setVal('c-op-income', oi);
    setVal('c-assets',    assets);
    setVal('c-hurdle',    hurdle);
    setVal('c-wacc',      Math.max(5, wacc));
    calcConcept();
  });

  // Value Destroyer randomizer
  el('c-rand-destroyer') && el('c-rand-destroyer').addEventListener('click', () => {
    const assets = Math.round((5000000 + Math.random() * 20000000) / 100000) * 100000;
    const hurdle = Math.round((12 + Math.random() * 8) * 2) / 2;
    const wacc   = Math.round((hurdle - 2 - Math.random() * 3) * 2) / 2;
    const oi     = Math.round(assets * (hurdle / 100 - 0.04 - Math.random() * 0.05) / 10000) * 10000;
    setVal('c-op-income', Math.max(0, oi));
    setVal('c-assets',    assets);
    setVal('c-hurdle',    hurdle);
    setVal('c-wacc',      Math.max(5, wacc));
    calcConcept();
  });

  // Borderline randomizer
  el('c-rand-borderline') && el('c-rand-borderline').addEventListener('click', () => {
    const assets = Math.round((5000000 + Math.random() * 20000000) / 100000) * 100000;
    const wacc   = Math.round((8 + Math.random() * 5) * 2) / 2;
    const hurdle = Math.round((wacc + 2 + Math.random() * 3) * 2) / 2;
    // OI between wacc and hurdle -- positive EVA but negative RI
    const oiRate = (wacc / 100 + hurdle / 100) / 2;
    const oi     = Math.round(assets * oiRate / 10000) * 10000;
    setVal('c-op-income', oi);
    setVal('c-assets',    assets);
    setVal('c-hurdle',    hurdle);
    setVal('c-wacc',      wacc);
    calcConcept();
  });
});
