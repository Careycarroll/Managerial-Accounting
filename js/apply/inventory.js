import { initHeader } from "/js/components/header.js";
import { renderShowWork } from "/js/components/show-work.js";

const fmt = (n) => "$" + Math.abs(Math.round(n)).toLocaleString();
const fmt2 = (n) => "$" + Math.abs(n).toFixed(2);
const fmtN = (n) => Math.round(n).toLocaleString();
const fmtPct = (n) => (Math.round(n * 10) / 10).toFixed(1) + "%";

const el = (id) => document.getElementById(id);
const val = (id) => {
  const n = el(id);
  return n ? parseFloat(n.value) || 0 : 0;
};
function setVal(id, v) {
  const n = el(id);
  if (n) n.value = v;
}

function initDepthToggle() {
  const buttons = document.querySelectorAll(".depth-btn");
  buttons.forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("depth-btn--active"));
      btn.classList.add("depth-btn--active");
      const depth = btn.dataset.depth;
      document.querySelectorAll(".depth-panel").forEach((p) => {
        p.classList.toggle("depth-panel--active", p.id === "depth-" + depth);
      });
    });
  });
}

function initScenario() {
  const useBtn = el("scenario-use-btn");
  if (useBtn) {
    useBtn.addEventListener("click", () => {
      setVal("c-demand", 24000);
      setVal("c-order-cost", 150);
      setVal("c-carry-cost", 8);
      setVal("c-current-qty", 2000);
      setVal("c-avg-demand", 66);
      setVal("c-max-demand", 90);
      setVal("c-avg-lead", 5);
      setVal("c-max-lead", 8);
      el("scenario-card").style.display = "none";
      calcConcept();
    });
  }
  const toggle = el("scenario-toggle");
  const body = el("scenario-body");
  if (toggle && body) {
    toggle.addEventListener("click", () => {
      const open = body.style.display === "none";
      body.style.display = open ? "" : "none";
      toggle.textContent = open ? "Hide scenario" : "Show scenario";
    });
  }
}

// ── Concept ───────────────────────────────────────────────────────────────────

function calcConcept() {
  const D = val("c-demand");
  const S = val("c-order-cost");
  const H = val("c-carry-cost");
  const Q = val("c-current-qty");
  const avgD = val("c-avg-demand");
  const maxD = val("c-max-demand");
  const avgL = val("c-avg-lead");
  const maxL = val("c-max-lead");

  const eoq = H > 0 ? Math.sqrt((2 * D * S) / H) : 0;
  const eoqR = Math.round(eoq);

  const totalCostEOQ = (D / eoq) * S + (eoq / 2) * H;
  const totalCostQ = (D / Q) * S + (Q / 2) * H;
  const savings = totalCostQ - totalCostEOQ;

  const safetyStock = maxD * maxL - avgD * avgL;
  const reorderPoint = avgD * avgL + safetyStock;

  const ordersPerYearEOQ = D / eoqR;
  const ordersPerYearQ = D / Q;

  const out = el("c-output");
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">EOQ</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' +
    fmtN(eoqR) +
    ' units</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">optimal order size</div></div>' +
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Annual Savings</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:' +
    (savings > 0 ? "var(--color-success)" : "var(--color-gray-500)") +
    ';">' +
    fmt(savings) +
    '</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">vs current qty</div></div>' +
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Safety Stock</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' +
    fmtN(safetyStock) +
    ' units</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">buffer inventory</div></div>' +
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Reorder Point</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-primary-text);">' +
    fmtN(reorderPoint) +
    ' units</div><div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">place order when stock hits this</div></div>' +
    "</div>" +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">EOQ vs Current Order Quantity</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Metric</th><th>Current (" +
    fmtN(Q) +
    " units)</th><th>EOQ (" +
    fmtN(eoqR) +
    " units)</th><th>Difference</th></tr></thead>" +
    "<tbody>" +
    "<tr><td>Orders per Year</td><td>" +
    ordersPerYearQ.toFixed(1) +
    "</td><td>" +
    ordersPerYearEOQ.toFixed(1) +
    "</td><td>" +
    (ordersPerYearEOQ - ordersPerYearQ).toFixed(1) +
    "</td></tr>" +
    "<tr><td>Average Inventory</td><td>" +
    fmtN(Q / 2) +
    " units</td><td>" +
    fmtN(eoqR / 2) +
    " units</td><td>" +
    fmtN(eoqR / 2 - Q / 2) +
    " units</td></tr>" +
    "<tr><td>Annual Ordering Cost</td><td>" +
    fmt((D / Q) * S) +
    "</td><td>" +
    fmt((D / eoqR) * S) +
    '</td><td class="' +
    ((D / eoqR) * S < (D / Q) * S ? "variance-fav" : "variance-unfav") +
    '">' +
    fmt((D / eoqR) * S - (D / Q) * S) +
    "</td></tr>" +
    "<tr><td>Annual Carrying Cost</td><td>" +
    fmt((Q / 2) * H) +
    "</td><td>" +
    fmt((eoqR / 2) * H) +
    '</td><td class="' +
    ((eoqR / 2) * H < (Q / 2) * H ? "variance-fav" : "variance-unfav") +
    '">' +
    fmt((eoqR / 2) * H - (Q / 2) * H) +
    "</td></tr>" +
    '</tbody><tfoot><tr class="ch12-result-table__total"><td>Total Annual Inventory Cost</td><td>' +
    fmt(totalCostQ) +
    "</td><td>" +
    fmt(totalCostEOQ) +
    '</td><td class="' +
    (savings > 0 ? "variance-fav" : "variance-unfav") +
    '">' +
    (savings > 0 ? "-" : "+") +
    fmt(Math.abs(savings)) +
    "</td></tr></tfoot>" +
    "</table></div>" +
    '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:' +
    (savings > 100 ? "var(--color-success-bg)" : "var(--color-gray-50)") +
    ";border:1px solid " +
    (savings > 100 ? "var(--color-success)" : "var(--color-gray-200)") +
    ';margin-bottom:var(--space-4);">' +
    '<div style="font-size:var(--font-size-base);font-weight:700;color:' +
    (savings > 100 ? "var(--color-success)" : "var(--color-primary-text)") +
    ';margin-bottom:var(--space-2);">' +
    (savings > 100
      ? "Switch to EOQ -- significant savings available"
      : savings > 0
        ? "Minor savings available from EOQ"
        : "Current order quantity is near optimal") +
    "</div>" +
    '<p style="margin:0 0 var(--space-2);font-size:var(--font-size-sm);">' +
    (savings > 100
      ? "Your current order quantity of <strong>" +
        fmtN(Q) +
        " units</strong> costs <strong>" +
        fmt(totalCostQ) +
        "</strong> per year. Switching to EOQ of <strong>" +
        fmtN(eoqR) +
        " units</strong> reduces total inventory costs to <strong>" +
        fmt(totalCostEOQ) +
        "</strong> -- saving <strong>" +
        fmt(savings) +
        "</strong> annually."
      : "Your current order quantity of <strong>" +
        fmtN(Q) +
        " units</strong> is " +
        (Math.abs(Q - eoqR) / eoqR < 0.1
          ? "very close to"
          : "within range of") +
        " the EOQ of <strong>" +
        fmtN(eoqR) +
        " units</strong>. Minimal savings from switching.") +
    "</p>" +
    '<p style="margin:0;font-size:var(--font-size-sm);">Place a new order when inventory falls to <strong>' +
    fmtN(reorderPoint) +
    " units</strong> (safety stock of " +
    fmtN(safetyStock) +
    " units protects against demand spikes and supplier delays).</p>" +
    "</div>" +
    "</div>";

  renderShowWork(
    el("c-show-work"),
    [
      {
        label: "EOQ",
        formula: "sqrt(2 x D x S / H)",
        values: "sqrt(2 x " + fmtN(D) + " x " + fmt(S) + " / " + fmt(H) + ")",
        result: fmtN(eoqR) + " units",
        highlight: true,
      },
      {
        label: "Total Cost at EOQ",
        formula: "(D/EOQ) x S + (EOQ/2) x H",
        values:
          "(" +
          fmtN(D) +
          "/" +
          fmtN(eoqR) +
          ") x " +
          fmt(S) +
          " + (" +
          fmtN(eoqR) +
          "/2) x " +
          fmt(H),
        result: fmt(totalCostEOQ),
      },
      {
        label: "Total Cost at Current Qty",
        formula: "(D/Q) x S + (Q/2) x H",
        values:
          "(" +
          fmtN(D) +
          "/" +
          fmtN(Q) +
          ") x " +
          fmt(S) +
          " + (" +
          fmtN(Q) +
          "/2) x " +
          fmt(H),
        result: fmt(totalCostQ),
      },
      {
        label: "Annual Savings",
        formula: "Current Cost - EOQ Cost",
        values: fmt(totalCostQ) + " - " + fmt(totalCostEOQ),
        result: fmt(savings),
        highlight: true,
      },
      {
        label: "Safety Stock",
        formula: "(Max Demand x Max Lead) - (Avg Demand x Avg Lead)",
        values: "(" + maxD + " x " + maxL + ") - (" + avgD + " x " + avgL + ")",
        result: fmtN(safetyStock) + " units",
        highlight: true,
      },
      {
        label: "Reorder Point",
        formula: "(Avg Demand x Avg Lead) + Safety Stock",
        values: "(" + avgD + " x " + avgL + ") + " + fmtN(safetyStock),
        result: fmtN(reorderPoint) + " units",
        highlight: true,
      },
    ],
    { title: "EOQ and Reorder Point Show Work", defaultOpen: false },
  );
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const D = val("a-demand");
  const S = val("a-order-cost");
  const H = val("a-carry-cost");
  const Q = val("a-current-qty");
  const jitS = val("a-jit-order-cost");
  const produced = val("a-units-produced");
  const sold = val("a-units-sold");
  const price = val("a-selling-price");
  const varCost = val("a-var-cost");
  const fixedMfg = val("a-fixed-mfg");
  const varSGA = val("a-var-sga");
  const fixedSGA = val("a-fixed-sga");

  const eoq = H > 0 ? Math.sqrt((2 * D * S) / H) : 0;
  const eoqR = Math.round(eoq);
  const jitQty = Math.max(1, Math.round(D / 365));

  function totalCost(qty, orderCost) {
    return qty > 0 ? (D / qty) * orderCost + (qty / 2) * H : 0;
  }

  const costCurrent = totalCost(Q, S);
  const costEOQ = totalCost(eoqR, S);
  const costJIT = totalCost(jitQty, jitS);

  const fixedMfgPU = produced > 0 ? fixedMfg / produced : 0;
  const absorbCostPU = varCost + fixedMfgPU;
  const endingInv = produced - sold;

  const absRevenue = sold * price;
  const absCOGS = sold * absorbCostPU;
  const absGrossProfit = absRevenue - absCOGS;
  const absVarSGA = sold * varSGA;
  const absOI = absGrossProfit - absVarSGA - fixedSGA;

  const varRevenue = sold * price;
  const varCOGS = sold * varCost;
  const varCM = varRevenue - varCOGS - sold * varSGA;
  const varOI = varCM - fixedMfg - fixedSGA;

  const oiDiff = absOI - varOI;
  const fixedInInv = endingInv * fixedMfgPU;

  const out = el("a-output");
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Inventory Management Comparison</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Approach</th><th>Order Qty</th><th>Orders/Year</th><th>Avg Inventory</th><th>Annual Cost</th><th>vs Current</th></tr></thead>" +
    "<tbody>" +
    '<tr class="ch12-t1-result__row--irrelevant"><td>Current</td><td>' +
    fmtN(Q) +
    "</td><td>" +
    (D / Q).toFixed(1) +
    "</td><td>" +
    fmtN(Q / 2) +
    "</td><td>" +
    fmt(costCurrent) +
    "</td><td>--</td></tr>" +
    '<tr class="ch12-t1-result__row--relevant"><td>EOQ (optimal)</td><td>' +
    fmtN(eoqR) +
    "</td><td>" +
    (D / eoqR).toFixed(1) +
    "</td><td>" +
    fmtN(eoqR / 2) +
    "</td><td>" +
    fmt(costEOQ) +
    '</td><td class="' +
    (costEOQ < costCurrent ? "variance-fav" : "variance-unfav") +
    '">' +
    fmt(costEOQ - costCurrent) +
    "</td></tr>" +
    "<tr><td>JIT (daily orders)</td><td>" +
    fmtN(jitQty) +
    "</td><td>" +
    fmtN(D / jitQty) +
    "</td><td>" +
    fmtN(jitQty / 2) +
    "</td><td>" +
    fmt(costJIT) +
    '</td><td class="' +
    (costJIT < costCurrent ? "variance-fav" : "variance-unfav") +
    '">' +
    fmt(costJIT - costCurrent) +
    "</td></tr>" +
    "</tbody></table></div>" +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Absorption vs Variable Costing Income Effect</h4>' +
    '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-5);">' +
    '<div style="flex:1 1 280px;min-width:260px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">' +
    '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Absorption Costing</div>' +
    '<table class="ch12-result-table" style="width:100%;"><tbody>' +
    "<tr><td>Revenue (" +
    fmtN(sold) +
    " x " +
    fmt(price) +
    ')</td><td style="text-align:right;">' +
    fmt(absRevenue) +
    "</td></tr>" +
    "<tr><td>COGS (" +
    fmtN(sold) +
    " x " +
    fmt2(absorbCostPU) +
    ')</td><td style="text-align:right;">(' +
    fmt(absCOGS) +
    ")</td></tr>" +
    '<tr class="ch12-result-table__relevant-total"><td>Gross Profit</td><td style="text-align:right;">' +
    fmt(absGrossProfit) +
    "</td></tr>" +
    '<tr><td>Variable SGA</td><td style="text-align:right;">(' +
    fmt(absVarSGA) +
    ")</td></tr>" +
    '<tr><td>Fixed SGA</td><td style="text-align:right;">(' +
    fmt(fixedSGA) +
    ")</td></tr>" +
    '</tbody><tfoot><tr class="ch12-result-table__total"><td>Operating Income</td><td style="text-align:right;">' +
    fmt(absOI) +
    "</td></tr></tfoot></table>" +
    "</div>" +
    '<div style="flex:1 1 280px;min-width:260px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">' +
    '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);margin-bottom:var(--space-3);">Variable Costing</div>' +
    '<table class="ch12-result-table" style="width:100%;"><tbody>' +
    '<tr><td>Revenue</td><td style="text-align:right;">' +
    fmt(varRevenue) +
    "</td></tr>" +
    "<tr><td>Variable COGS (" +
    fmtN(sold) +
    " x " +
    fmt(varCost) +
    ')</td><td style="text-align:right;">(' +
    fmt(varCOGS) +
    ")</td></tr>" +
    '<tr><td>Variable SGA</td><td style="text-align:right;">(' +
    fmt(sold * varSGA) +
    ")</td></tr>" +
    '<tr class="ch12-result-table__relevant-total"><td>Contribution Margin</td><td style="text-align:right;">' +
    fmt(varCM) +
    "</td></tr>" +
    '<tr><td>Fixed Manufacturing</td><td style="text-align:right;">(' +
    fmt(fixedMfg) +
    ")</td></tr>" +
    '<tr><td>Fixed SGA</td><td style="text-align:right;">(' +
    fmt(fixedSGA) +
    ")</td></tr>" +
    '</tbody><tfoot><tr class="ch12-result-table__total"><td>Operating Income</td><td style="text-align:right;">' +
    fmt(varOI) +
    "</td></tr></tfoot></table>" +
    "</div>" +
    "</div>" +
    '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:' +
    (oiDiff > 0 ? "var(--color-warning-bg)" : "var(--color-gray-50)") +
    ";border:1px solid " +
    (oiDiff > 0 ? "var(--color-warning)" : "var(--color-gray-200)") +
    ';margin-bottom:var(--space-4);">' +
    '<div style="font-size:var(--font-size-base);font-weight:700;color:' +
    (oiDiff > 0 ? "var(--color-warning)" : "var(--color-primary-text)") +
    ';margin-bottom:var(--space-2);">' +
    (oiDiff > 0
      ? "Warning: Absorption costing overstates income when production exceeds sales"
      : produced === sold
        ? "Methods agree: production equals sales"
        : "Variable costing shows higher income: sales exceed production") +
    "</div>" +
    '<p style="margin:0;font-size:var(--font-size-sm);">' +
    "Absorption costing OI: <strong>" +
    fmt(absOI) +
    "</strong>. Variable costing OI: <strong>" +
    fmt(varOI) +
    "</strong>. Difference: <strong>" +
    fmt(Math.abs(oiDiff)) +
    "</strong>. " +
    (endingInv > 0
      ? "You produced <strong>" +
        fmtN(endingInv) +
        " more units</strong> than you sold. Under absorption costing, <strong>" +
        fmt(fixedInInv) +
        "</strong> of fixed manufacturing costs are deferred in ending inventory instead of expensed. This inflates reported income by <strong>" +
        fmt(oiDiff) +
        "</strong> compared to variable costing."
      : "Production equals sales, so both methods produce the same result.") +
    "</p>" +
    "</div>" +
    "</div>";

  renderShowWork(
    el("a-show-work"),
    [
      {
        label: "EOQ",
        formula: "sqrt(2 x D x S / H)",
        values: "sqrt(2 x " + fmtN(D) + " x " + fmt(S) + " / " + fmt(H) + ")",
        result: fmtN(eoqR) + " units",
        highlight: true,
      },
      {
        label: "Fixed Mfg Cost per Unit (Absorption)",
        formula: "Fixed Mfg / Units Produced",
        values: fmt(fixedMfg) + " / " + fmtN(produced),
        result: fmt2(fixedMfgPU),
      },
      {
        label: "Absorption Cost per Unit",
        formula: "Variable Cost + Fixed Mfg per Unit",
        values: fmt(varCost) + " + " + fmt2(fixedMfgPU),
        result: fmt2(absorbCostPU),
      },
      {
        label: "Ending Inventory Units",
        formula: "Produced - Sold",
        values: fmtN(produced) + " - " + fmtN(sold),
        result: fmtN(endingInv),
      },
      {
        label: "Fixed Costs in Ending Inventory",
        formula: "Ending Inv x Fixed Mfg per Unit",
        values: fmtN(endingInv) + " x " + fmt2(fixedMfgPU),
        result: fmt(fixedInInv),
      },
      {
        label: "Absorption OI",
        formula: "Revenue - Absorption COGS - SGA",
        values:
          fmt(absRevenue) +
          " - " +
          fmt(absCOGS) +
          " - " +
          fmt(absVarSGA + fixedSGA),
        result: fmt(absOI),
        highlight: true,
      },
      {
        label: "Variable OI",
        formula: "CM - Fixed Mfg - Fixed SGA",
        values: fmt(varCM) + " - " + fmt(fixedMfg) + " - " + fmt(fixedSGA),
        result: fmt(varOI),
        highlight: true,
      },
      {
        label: "OI Difference",
        formula:
          "Absorption OI - Variable OI = Fixed costs deferred in inventory",
        values: fmt(absOI) + " - " + fmt(varOI),
        result: fmt(oiDiff),
        highlight: true,
      },
    ],
    { title: "Inventory Analysis Show Work", defaultOpen: false },
  );
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initDepthToggle();
  initScenario();

  el("c-calculate") && el("c-calculate").addEventListener("click", calcConcept);
  el("a-calculate") &&
    el("a-calculate").addEventListener("click", calcAnalysis);

  el("c-rand-suboptimal") &&
    el("c-rand-suboptimal").addEventListener("click", () => {
      const D = Math.round((10000 + Math.random() * 40000) / 500) * 500;
      const S = Math.round(50 + Math.random() * 200);
      const H = Math.round((2 + Math.random() * 15) * 2) / 2;
      const eoq = Math.round(Math.sqrt((2 * D * S) / H));
      const Q = Math.round((eoq * (2.5 + Math.random() * 2.5)) / 100) * 100;
      const avgD = Math.round(D / 365);
      const maxD = Math.round(avgD * (1.3 + Math.random() * 0.4));
      setVal("c-demand", D);
      setVal("c-order-cost", S);
      setVal("c-carry-cost", H);
      setVal("c-current-qty", Math.max(100, Q));
      setVal("c-avg-demand", avgD);
      setVal("c-max-demand", maxD);
      setVal("c-avg-lead", Math.round(3 + Math.random() * 7));
      setVal("c-max-lead", Math.round(7 + Math.random() * 7));
      calcConcept();
    });

  el("c-rand-optimal") &&
    el("c-rand-optimal").addEventListener("click", () => {
      const D = Math.round((10000 + Math.random() * 40000) / 500) * 500;
      const S = Math.round(50 + Math.random() * 200);
      const H = Math.round((2 + Math.random() * 15) * 2) / 2;
      const eoq = Math.round(Math.sqrt((2 * D * S) / H));
      const Q = Math.round((eoq * (0.9 + Math.random() * 0.2)) / 10) * 10;
      const avgD = Math.round(D / 365);
      const maxD = Math.round(avgD * (1.2 + Math.random() * 0.3));
      setVal("c-demand", D);
      setVal("c-order-cost", S);
      setVal("c-carry-cost", H);
      setVal("c-current-qty", Math.max(10, Q));
      setVal("c-avg-demand", avgD);
      setVal("c-max-demand", maxD);
      setVal("c-avg-lead", Math.round(3 + Math.random() * 7));
      setVal("c-max-lead", Math.round(7 + Math.random() * 7));
      calcConcept();
    });
});
