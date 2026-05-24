import {
  markChapterComplete,
  isChapterComplete,
  resetChapter,
} from "/js/core/progress-tracker.js";
import { initRandomizer } from "/js/components/randomizer.js";
import { renderShowWork } from "/js/components/show-work.js";
import { initSettingsPanel } from "/js/components/settings-panel.js";

const fmt = (n) => "$" + Math.abs(Math.round(n)).toLocaleString();
const fmt2 = (n) => "$" + Math.abs(n).toFixed(2);
const fmtN = (n) => Math.round(n).toLocaleString();
const fmtPct = (n) => (Math.round(n * 10) / 10).toFixed(1) + "%";

function getOrCreate(id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement(tag || "div");
    node.id = id;
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
  }
  return node;
}

const el = (id) => document.getElementById(id);
const val = (id) => {
  const n = el(id);
  return n ? parseFloat(n.value) || 0 : 0;
};
function setVal(id, v) {
  const n = el(id);
  if (n) n.value = v;
}

function insight(text) {
  return (
    '<div class="ch12-insight" style="margin-top:var(--space-4);">' +
    text +
    "</div>"
  );
}

function verdict(text, positive) {
  return (
    '<div class="ch12-verdict ' +
    (positive ? "ch12-verdict--positive" : "ch12-verdict--negative") +
    '">' +
    text +
    "</div>"
  );
}

function panel(title, body, note) {
  return (
    '<div style="flex:1 1 300px;min-width:280px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">' +
    '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-3);color:var(--color-primary-text);">' +
    title +
    "</div>" +
    '<div style="overflow-x:auto;">' +
    body +
    "</div>" +
    (note
      ? '<p style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin:var(--space-3) 0 0;font-style:italic;">' +
        note +
        "</p>"
      : "") +
    "</div>"
  );
}

function table(cols, rows, foot) {
  const thead =
    "<thead><tr>" +
    cols.map((c) => "<th>" + c + "</th>").join("") +
    "</tr></thead>";
  const tbody =
    "<tbody>" +
    rows
      .map(
        (r) => "<tr>" + r.map((c) => "<td>" + c + "</td>").join("") + "</tr>",
      )
      .join("") +
    "</tbody>";
  const tfoot = foot
    ? "<tfoot><tr>" +
      foot.map((c) => "<td><strong>" + c + "</strong></td>").join("") +
      "</tr></tfoot>"
    : "";
  return (
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">' +
    thead +
    tbody +
    tfoot +
    "</table></div>"
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Inventory Cost Identifier
// ══════════════════════════════════════════════════════════════════════════════

const IC_SCENARIOS = [
  {
    text: "Salary of the purchasing department employee who prepares and sends purchase orders.",
    answer: "ordering",
    why: "This cost is incurred each time an order is placed. It is an ordering cost.",
  },
  {
    text: "Insurance premiums on the warehouse where finished goods are stored.",
    answer: "carrying",
    why: "Insurance on stored inventory is a carrying cost -- it increases with the amount of inventory held.",
  },
  {
    text: "Lost contribution margin from a customer who cancels an order because the item is out of stock.",
    answer: "stockout",
    why: "Lost sales from insufficient inventory are stockout costs.",
  },
  {
    text: "Cost of electricity to run the refrigerated storage facility for perishable raw materials.",
    answer: "carrying",
    why: "Storage facility operating costs are carrying costs.",
  },
  {
    text: "Freight charges paid to the supplier for each delivery.",
    answer: "ordering",
    why: "Shipping costs incurred per order are ordering costs.",
  },
  {
    text: "Obsolescence write-down on slow-moving inventory that has been superseded by a newer model.",
    answer: "carrying",
    why: "Obsolescence is a carrying cost -- the longer inventory is held, the higher the risk of obsolescence.",
  },
  {
    text: "Expediting fee paid to a supplier for emergency rush delivery when stock runs out.",
    answer: "stockout",
    why: "Rush order premiums paid to avoid or recover from a stockout are stockout costs.",
  },
  {
    text: "Annual property tax on the warehouse building used to store raw materials.",
    answer: "carrying",
    why: "Property taxes on storage facilities are carrying costs.",
  },
  {
    text: "Cost of processing and inspecting each incoming shipment from a supplier.",
    answer: "ordering",
    why: "Receiving and inspection costs incurred per order are ordering costs.",
  },
  {
    text: "Opportunity cost of capital tied up in inventory that could otherwise be invested.",
    answer: "carrying",
    why: "The opportunity cost of capital invested in inventory is a carrying cost -- often the largest component.",
  },
  {
    text: "Customer goodwill lost when a retailer is unable to fill a wholesale order on time.",
    answer: "stockout",
    why: "Damage to customer relationships from stockouts is a stockout cost -- often difficult to quantify.",
  },
  {
    text: "Cost of shrinkage and theft of inventory stored in the warehouse.",
    answer: "carrying",
    why: "Shrinkage is a carrying cost -- it increases with the level of inventory held.",
  },
];

let icIndex = -1,
  icCorrect = 0,
  icTotal = 0,
  icUsed = [];

function initInventoryCostIdentifier() {
  const nextBtn = el("ic-next-btn");
  const resetBtn = el("ic-reset-btn");
  if (!nextBtn) return;
  nextBtn.addEventListener("click", showNextIC);
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      icUsed = [];
      icCorrect = 0;
      icTotal = 0;
      icIndex = -1;
      const area = el("ic-scenario-area");
      const res = el("ic-results-area");
      if (area) area.innerHTML = "";
      if (res) res.innerHTML = "";
      showNextIC();
    });
  }
}

function showNextIC() {
  const area = el("ic-scenario-area");
  if (!area) return;
  const available = IC_SCENARIOS.map((_, i) => i).filter(
    (i) => icUsed.indexOf(i) === -1,
  );
  if (available.length === 0) {
    area.innerHTML =
      '<div class="card" style="margin-top:var(--space-4);"><p class="result-highlight">All 12 cost items completed.</p></div>';
    updateICResults();
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  icUsed.push(pick);
  icIndex = pick;
  const s = IC_SCENARIOS[pick];
  area.innerHTML =
    '<div class="card" style="margin-top:var(--space-4);">' +
    '<p style="font-size:var(--font-size-lg);line-height:1.6;margin-bottom:var(--space-4);">' +
    s.text +
    "</p>" +
    '<div class="tool-actions" style="flex-wrap:wrap;">' +
    '<button class="btn btn--primary ic-answer-btn" data-answer="ordering">Ordering Cost</button>' +
    '<button class="btn btn--secondary ic-answer-btn" data-answer="carrying">Carrying Cost</button>' +
    '<button class="btn btn--secondary ic-answer-btn" data-answer="stockout">Stockout Cost</button>' +
    "</div>" +
    '<div id="ic-feedback"></div>' +
    "</div>";
  area.querySelectorAll(".ic-answer-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleICAnswer(btn.dataset.answer));
  });
}

function handleICAnswer(chosen) {
  const s = IC_SCENARIOS[icIndex];
  const feedback = el("ic-feedback");
  if (!s || !feedback) return;
  const correct = chosen === s.answer;
  icTotal++;
  if (correct) icCorrect++;
  const labels = {
    ordering: "Ordering Cost",
    carrying: "Carrying Cost",
    stockout: "Stockout Cost",
  };
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  feedback.innerHTML =
    '<div style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:' +
    (correct
      ? isDark
        ? "var(--color-success-bg,#1a3a2a)"
        : "var(--color-success-bg,#f0fdf4)"
      : isDark
        ? "var(--color-danger-bg,#3a1a1a)"
        : "var(--color-danger-bg,#fef2f2)") +
    ";border:1px solid " +
    (correct ? "var(--color-success)" : "var(--color-danger)") +
    ';">' +
    '<h4 style="margin:0 0 var(--space-2);">' +
    (correct ? "Correct" : "Not quite") +
    " -- " +
    labels[s.answer] +
    "</h4>" +
    '<p style="margin:0;">' +
    s.why +
    "</p>" +
    "</div>";
  area.querySelectorAll(".ic-answer-btn").forEach((btn) => {
    btn.disabled = true;
  });
  updateICResults();
}

function updateICResults() {
  const area = el("ic-results-area");
  if (!area) return;
  area.innerHTML =
    '<div class="ch12-insight" style="margin-top:var(--space-4);">Score: <strong>' +
    icCorrect +
    " / " +
    icTotal +
    "</strong> | Remaining: <strong>" +
    (IC_SCENARIOS.length - icUsed.length) +
    "</strong></div>";
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- EOQ Calculator
// ══════════════════════════════════════════════════════════════════════════════

function calcEOQ() {
  const D = val("eoq-demand");
  const S = val("eoq-order-cost");
  const H = val("eoq-carry-cost");
  const Q = val("eoq-current-qty");

  if (!D || !S || !H) return;

  const eoq = Math.sqrt((2 * D * S) / H);
  const eoqRounded = Math.round(eoq);

  const ordersEOQ = D / eoq;
  const orderCostEOQ = ordersEOQ * S;
  const carryCostEOQ = (eoq / 2) * H;
  const totalEOQ = orderCostEOQ + carryCostEOQ;

  const ordersQ = D / Q;
  const orderCostQ = ordersQ * S;
  const carryCostQ = (Q / 2) * H;
  const totalQ = orderCostQ + carryCostQ;

  const savings = totalQ - totalEOQ;

  const out = getOrCreate(
    "eoq-output",
    "div",
    "tool-output",
    el("eoq-calculate").parentElement,
  );

  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">' +
    panel(
      "EOQ Result",
      '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' +
        fmtN(eoqRounded) +
        " units</div>" +
        '<p style="margin:var(--space-2) 0 0;font-size:var(--font-size-sm);">Order this quantity <strong>' +
        (D / eoqRounded).toFixed(1) +
        " times per year</strong></p>" +
        '<p style="font-size:var(--font-size-sm);">Average inventory: <strong>' +
        fmtN(Math.round(eoqRounded / 2)) +
        " units</strong></p>",
      "EOQ = square root of (2 x Annual Demand x Ordering Cost / Carrying Cost per Unit)",
    ) +
    panel(
      "Cost Comparison",
      table(
        ["Cost Component", "At EOQ", "At Current Qty (" + fmtN(Q) + ")"],
        [
          ["Annual Ordering Cost", fmt(orderCostEOQ), fmt(orderCostQ)],
          ["Annual Carrying Cost", fmt(carryCostEOQ), fmt(carryCostQ)],
        ],
        ["Total Annual Inventory Cost", fmt(totalEOQ), fmt(totalQ)],
      ),
      savings > 0
        ? "Switching to EOQ saves " + fmt(savings) + " per year."
        : "Current order quantity is already at or near EOQ.",
    ) +
    "</div>" +
    (savings > 1
      ? verdict(
          "Switching to EOQ order quantity of <strong>" +
            fmtN(eoqRounded) +
            " units</strong> saves <strong>" +
            fmt(savings) +
            "</strong> per year in total inventory costs.",
          true,
        )
      : verdict(
          "Current order quantity of " +
            fmtN(Q) +
            " units is close to the EOQ of " +
            fmtN(eoqRounded) +
            " units. Minimal savings available.",
          true,
        )) +
    "</div>";

  renderShowWork(
    el("eoq-show-work"),
    [
      {
        label: "EOQ Formula",
        formula: "sqrt(2 x D x S / H)",
        values: "sqrt(2 x " + fmtN(D) + " x " + fmt(S) + " / " + fmt(H) + ")",
        result: fmtN(eoqRounded) + " units",
        highlight: true,
      },
      {
        label: "Number of Orders per Year (EOQ)",
        formula: "Annual Demand / EOQ",
        values: fmtN(D) + " / " + fmtN(eoqRounded),
        result: (D / eoqRounded).toFixed(1) + " orders",
      },
      {
        label: "Annual Ordering Cost (EOQ)",
        formula: "Orders per Year x Cost per Order",
        values: (D / eoqRounded).toFixed(1) + " x " + fmt(S),
        result: fmt(orderCostEOQ),
      },
      {
        label: "Annual Carrying Cost (EOQ)",
        formula: "(EOQ / 2) x Carrying Cost per Unit",
        values: "(" + fmtN(eoqRounded) + " / 2) x " + fmt(H),
        result: fmt(carryCostEOQ),
      },
      {
        label: "Total Annual Inventory Cost (EOQ)",
        formula: "Ordering Cost + Carrying Cost",
        values: fmt(orderCostEOQ) + " + " + fmt(carryCostEOQ),
        result: fmt(totalEOQ),
        highlight: true,
      },
      {
        label: "Total Annual Inventory Cost (Current)",
        formula: "Ordering Cost + Carrying Cost at current qty",
        values: fmt(orderCostQ) + " + " + fmt(carryCostQ),
        result: fmt(totalQ),
      },
      {
        label: "Annual Savings from EOQ",
        formula: "Current Total - EOQ Total",
        values: fmt(totalQ) + " - " + fmt(totalEOQ),
        result: fmt(savings),
        highlight: true,
      },
    ],
    { title: "EOQ Calculation", defaultOpen: false },
  );
}

function initEOQ() {
  const btn = el("eoq-calculate");
  if (!btn) return;
  btn.addEventListener("click", calcEOQ);
  el("eoq-load-example") &&
    el("eoq-load-example").addEventListener("click", () => {
      setVal("eoq-demand", 10000);
      setVal("eoq-order-cost", 200);
      setVal("eoq-carry-cost", 5);
      setVal("eoq-current-qty", 1000);
      calcEOQ();
    });
  initRandomizer(
    "eoq-randomize",
    [
      { id: "eoq-demand", min: 1000, max: 50000, step: 500, integer: true },
      { id: "eoq-order-cost", min: 50, max: 1000, step: 25 },
      { id: "eoq-carry-cost", min: 1, max: 50, step: 0.5 },
      { id: "eoq-current-qty", min: 100, max: 5000, step: 100, integer: true },
    ],
    calcEOQ,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Safety Stock and Reorder Point
// ══════════════════════════════════════════════════════════════════════════════

function calcSafetyStock() {
  const avgDemand = val("ss-avg-demand");
  const maxDemand = val("ss-max-demand");
  const avgLead = val("ss-avg-lead");
  const maxLead = val("ss-max-lead");
  const carryPerDay = val("ss-carry-cost");
  const stockoutCost = val("ss-stockout-cost");

  const safetyStock = maxDemand * maxLead - avgDemand * avgLead;
  const reorderPoint = avgDemand * avgLead + safetyStock;
  const annualCarry = safetyStock * carryPerDay * 365;

  const out = getOrCreate(
    "ss-output",
    "div",
    "tool-output",
    el("ss-calculate").parentElement,
  );

  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">' +
    panel(
      "Safety Stock",
      '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' +
        fmtN(safetyStock) +
        " units</div>" +
        '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">Annual carrying cost of safety stock: <strong>' +
        fmt(annualCarry) +
        "</strong></p>",
      "Safety Stock = (Max Demand x Max Lead Time) - (Avg Demand x Avg Lead Time)",
    ) +
    panel(
      "Reorder Point",
      '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">' +
        fmtN(reorderPoint) +
        " units</div>" +
        '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">Place a new order when inventory falls to this level.</p>',
      "Reorder Point = (Avg Demand x Avg Lead Time) + Safety Stock",
    ) +
    panel(
      "Without Safety Stock",
      '<div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-danger);">' +
        fmtN(avgDemand * avgLead) +
        " units</div>" +
        '<p style="font-size:var(--font-size-sm);margin-top:var(--space-2);">Reorder point with no buffer. Stockout risk if demand or lead time exceeds average.</p>',
      "Reorder Point = Avg Demand x Avg Lead Time (no safety stock)",
    ) +
    "</div>" +
    insight(
      "Safety stock of <strong>" +
        fmtN(safetyStock) +
        " units</strong> protects against demand spikes of up to <strong>" +
        fmtN(maxDemand - avgDemand) +
        " units/day</strong> above average and lead time delays of up to <strong>" +
        (maxLead - avgLead) +
        " days</strong> beyond average. Annual carrying cost: <strong>" +
        fmt(annualCarry) +
        "</strong>.",
    ) +
    "</div>";

  renderShowWork(
    el("ss-show-work"),
    [
      {
        label: "Average Demand During Lead Time",
        formula: "Avg Daily Demand x Avg Lead Time",
        values: fmtN(avgDemand) + " x " + avgLead,
        result: fmtN(avgDemand * avgLead) + " units",
      },
      {
        label: "Maximum Demand During Lead Time",
        formula: "Max Daily Demand x Max Lead Time",
        values: fmtN(maxDemand) + " x " + maxLead,
        result: fmtN(maxDemand * maxLead) + " units",
      },
      {
        label: "Safety Stock",
        formula: "Max Demand During Lead Time - Avg Demand During Lead Time",
        values: fmtN(maxDemand * maxLead) + " - " + fmtN(avgDemand * avgLead),
        result: fmtN(safetyStock) + " units",
        highlight: true,
      },
      {
        label: "Reorder Point",
        formula: "Avg Demand During Lead Time + Safety Stock",
        values: fmtN(avgDemand * avgLead) + " + " + fmtN(safetyStock),
        result: fmtN(reorderPoint) + " units",
        highlight: true,
      },
      {
        label: "Annual Carrying Cost of Safety Stock",
        formula: "Safety Stock x Carrying Cost per Unit per Day x 365",
        values: fmtN(safetyStock) + " x " + fmt2(carryPerDay) + " x 365",
        result: fmt(annualCarry),
      },
    ],
    { title: "Safety Stock and Reorder Point", defaultOpen: false },
  );
}

function initSafetyStock() {
  const btn = el("ss-calculate");
  if (!btn) return;
  btn.addEventListener("click", calcSafetyStock);
  el("ss-load-example") &&
    el("ss-load-example").addEventListener("click", () => {
      setVal("ss-avg-demand", 100);
      setVal("ss-max-demand", 130);
      setVal("ss-avg-lead", 10);
      setVal("ss-max-lead", 14);
      setVal("ss-carry-cost", 0.05);
      setVal("ss-stockout-cost", 25);
      calcSafetyStock();
    });
  initRandomizer(
    "ss-randomize",
    [
      { id: "ss-avg-demand", min: 20, max: 500, step: 10, integer: true },
      { id: "ss-max-demand", min: 25, max: 650, step: 10, integer: true },
      { id: "ss-avg-lead", min: 3, max: 30, step: 1, integer: true },
      { id: "ss-max-lead", min: 4, max: 45, step: 1, integer: true },
      { id: "ss-carry-cost", min: 0.01, max: 0.5, step: 0.01 },
      { id: "ss-stockout-cost", min: 5, max: 100, step: 5 },
    ],
    calcSafetyStock,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- JIT vs Traditional
// ══════════════════════════════════════════════════════════════════════════════

function calcJIT() {
  const avgInv = val("jit-avg-inventory");
  const unitCost = val("jit-unit-cost");
  const carryPct = val("jit-carry-pct") / 100;
  const ordersYear = val("jit-orders-per-year");
  const orderCost = val("jit-order-cost");
  const jitInv = val("jit-jit-inventory");
  const jitOrders = val("jit-jit-orders");
  const jitOrderCost = val("jit-jit-order-cost");

  const tradCarry = avgInv * unitCost * carryPct;
  const tradOrder = ordersYear * orderCost;
  const tradTotal = tradCarry + tradOrder;

  const jitCarry = jitInv * unitCost * carryPct;
  const jitOrderTotal = jitOrders * jitOrderCost;
  const jitTotal = jitCarry + jitOrderTotal;

  const savings = tradTotal - jitTotal;
  const invReduction = (avgInv - jitInv) * unitCost;

  const out = getOrCreate(
    "jit-output",
    "div",
    "tool-output",
    el("jit-calculate").parentElement,
  );

  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">' +
    panel(
      "Traditional Inventory",
      table(
        ["Cost Component", "Amount"],
        [
          [
            "Annual Carrying Cost (" +
              fmtN(avgInv) +
              " units x " +
              fmt(unitCost) +
              " x " +
              fmtPct(carryPct * 100) +
              ")",
            fmt(tradCarry),
          ],
          [
            "Annual Ordering Cost (" +
              ordersYear +
              " orders x " +
              fmt(orderCost) +
              ")",
            fmt(tradOrder),
          ],
        ],
        ["Total Annual Inventory Cost", fmt(tradTotal)],
      ),
    ) +
    panel(
      "JIT Inventory",
      table(
        ["Cost Component", "Amount"],
        [
          [
            "Annual Carrying Cost (" +
              fmtN(jitInv) +
              " units x " +
              fmt(unitCost) +
              " x " +
              fmtPct(carryPct * 100) +
              ")",
            fmt(jitCarry),
          ],
          [
            "Annual Ordering Cost (" +
              jitOrders +
              " orders x " +
              fmt(jitOrderCost) +
              ")",
            fmt(jitOrderTotal),
          ],
        ],
        ["Total Annual Inventory Cost", fmt(jitTotal)],
      ),
    ) +
    "</div>" +
    (savings > 0
      ? verdict(
          "JIT saves <strong>" +
            fmt(savings) +
            "</strong> per year in inventory costs. Capital released from inventory reduction: <strong>" +
            fmt(invReduction) +
            "</strong>.",
          true,
        )
      : verdict(
          "Traditional approach has lower annual inventory costs by <strong>" +
            fmt(Math.abs(savings)) +
            "</strong>. JIT ordering cost increase exceeds carrying cost savings at these parameters.",
          false,
        )) +
    insight(
      "JIT benefits extend beyond cost savings: reduced obsolescence risk, faster defect detection, stronger supplier relationships, and less warehouse space. These qualitative benefits are not captured in this financial comparison.",
    ) +
    "</div>";

  renderShowWork(
    el("jit-show-work"),
    [
      {
        label: "Traditional Annual Carrying Cost",
        formula: "Avg Inventory x Unit Cost x Carrying %",
        values:
          fmtN(avgInv) + " x " + fmt(unitCost) + " x " + fmtPct(carryPct * 100),
        result: fmt(tradCarry),
      },
      {
        label: "Traditional Annual Ordering Cost",
        formula: "Orders per Year x Cost per Order",
        values: ordersYear + " x " + fmt(orderCost),
        result: fmt(tradOrder),
      },
      {
        label: "Traditional Total",
        formula: "Carrying + Ordering",
        values: fmt(tradCarry) + " + " + fmt(tradOrder),
        result: fmt(tradTotal),
        highlight: true,
      },
      {
        label: "JIT Annual Carrying Cost",
        formula: "JIT Avg Inventory x Unit Cost x Carrying %",
        values:
          fmtN(jitInv) + " x " + fmt(unitCost) + " x " + fmtPct(carryPct * 100),
        result: fmt(jitCarry),
      },
      {
        label: "JIT Annual Ordering Cost",
        formula: "JIT Orders per Year x JIT Cost per Order",
        values: jitOrders + " x " + fmt(jitOrderCost),
        result: fmt(jitOrderTotal),
      },
      {
        label: "JIT Total",
        formula: "Carrying + Ordering",
        values: fmt(jitCarry) + " + " + fmt(jitOrderTotal),
        result: fmt(jitTotal),
        highlight: true,
      },
      {
        label: "Annual Savings from JIT",
        formula: "Traditional Total - JIT Total",
        values: fmt(tradTotal) + " - " + fmt(jitTotal),
        result: fmt(savings),
        highlight: true,
      },
      {
        label: "Capital Released from Inventory Reduction",
        formula: "(Traditional Avg Inv - JIT Avg Inv) x Unit Cost",
        values:
          "(" + fmtN(avgInv) + " - " + fmtN(jitInv) + ") x " + fmt(unitCost),
        result: fmt(invReduction),
      },
    ],
    { title: "JIT vs Traditional Analysis", defaultOpen: false },
  );
}

function initJIT() {
  const btn = el("jit-calculate");
  if (!btn) return;
  btn.addEventListener("click", calcJIT);
  el("jit-load-example") &&
    el("jit-load-example").addEventListener("click", () => {
      setVal("jit-avg-inventory", 5000);
      setVal("jit-unit-cost", 40);
      setVal("jit-carry-pct", 20);
      setVal("jit-orders-per-year", 12);
      setVal("jit-order-cost", 500);
      setVal("jit-jit-inventory", 500);
      setVal("jit-jit-orders", 52);
      setVal("jit-jit-order-cost", 100);
      calcJIT();
    });
  initRandomizer(
    "jit-randomize",
    [
      {
        id: "jit-avg-inventory",
        min: 500,
        max: 20000,
        step: 500,
        integer: true,
      },
      { id: "jit-unit-cost", min: 5, max: 200, step: 5 },
      { id: "jit-carry-pct", min: 10, max: 35, step: 1 },
      { id: "jit-orders-per-year", min: 4, max: 52, step: 4, integer: true },
      { id: "jit-order-cost", min: 100, max: 2000, step: 100 },
      { id: "jit-jit-inventory", min: 50, max: 2000, step: 50, integer: true },
      { id: "jit-jit-orders", min: 12, max: 365, step: 12, integer: true },
      { id: "jit-jit-order-cost", min: 10, max: 500, step: 10 },
    ],
    calcJIT,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Backflush Costing Engine
// ══════════════════════════════════════════════════════════════════════════════

function calcBackflush() {
  const started = val("bf-units-started");
  const completed = val("bf-units-completed");
  const sold = val("bf-units-sold");
  const dmCost = val("bf-dm-cost");
  const ccCost = val("bf-cc-cost");

  const totalCost = dmCost + ccCost;
  const costPerUnit = started > 0 ? totalCost / started : 0;
  const cgsCost = sold * costPerUnit;
  const fgInvCost = (completed - sold) * costPerUnit;
  const wipCost = (started - completed) * costPerUnit;

  const out = getOrCreate(
    "bf-output",
    "div",
    "tool-output",
    el("bf-calculate").parentElement,
  );

  const entryRow = (debit, credit, amount, note) =>
    "<tr><td>" +
    (debit ? "<strong>" + debit + "</strong>" : "") +
    "</td>" +
    "<td>" +
    (credit ? credit : "") +
    "</td>" +
    '<td style="text-align:right;">' +
    fmt(amount) +
    "</td>" +
    '<td style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' +
    (note || "") +
    "</td></tr>";

  const entriesA =
    '<table class="ch12-result-table" style="width:100%;">' +
    "<thead><tr><th>Debit</th><th>Credit</th><th>Amount</th><th>Note</th></tr></thead><tbody>" +
    entryRow("Raw Materials / WIP", "", dmCost, "Purchase materials") +
    entryRow("Conversion Costs Applied", "", ccCost, "Labor + overhead") +
    entryRow(
      "Finished Goods",
      "Raw Mat + Conv. Costs",
      totalCost,
      "Trigger: completion",
    ) +
    entryRow("Cost of Goods Sold", "Finished Goods", cgsCost, "Trigger: sale") +
    "</tbody></table>";

  const entriesB =
    '<table class="ch12-result-table" style="width:100%;">' +
    "<thead><tr><th>Debit</th><th>Credit</th><th>Amount</th><th>Note</th></tr></thead><tbody>" +
    entryRow("Raw Materials", "", dmCost, "Purchase materials") +
    entryRow("Conversion Costs Applied", "", ccCost, "Labor + overhead") +
    entryRow(
      "Cost of Goods Sold",
      "Raw Mat + Conv. Costs",
      cgsCost,
      "Trigger: sale only",
    ) +
    entryRow(
      "Finished Goods Inventory",
      "Raw Mat + Conv. Costs",
      fgInvCost,
      "Unsold completed units",
    ) +
    "</tbody></table>";

  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-4);">' +
    panel(
      "Unit Economics",
      table(
        ["Item", "Units", "Cost"],
        [
          ["Started", fmtN(started), fmt(totalCost)],
          ["Completed", fmtN(completed), fmt(completed * costPerUnit)],
          ["Sold", fmtN(sold), fmt(cgsCost)],
          ["In Finished Goods", fmtN(completed - sold), fmt(fgInvCost)],
          ["In WIP", fmtN(started - completed), fmt(wipCost)],
        ],
        ["Cost per Unit", "", fmt2(costPerUnit)],
      ),
    ) +
    "</div>" +
    '<h4 style="color:var(--color-primary-text);">Trigger Point A -- Completion of Goods</h4>' +
    '<p style="font-size:var(--font-size-sm);color:var(--color-gray-600);margin-bottom:var(--space-3);">Costs are flushed back to Finished Goods when production is complete, then to COGS when sold.</p>' +
    entriesA +
    '<h4 style="color:var(--color-primary-text);margin-top:var(--space-5);">Trigger Point B -- Point of Sale Only</h4>' +
    '<p style="font-size:var(--font-size-sm);color:var(--color-gray-600);margin-bottom:var(--space-3);">Costs are not recorded until sale. Completed but unsold units are recognized at period end.</p>' +
    entriesB +
    insight(
      "Backflush costing works best when WIP is minimal (as in JIT environments) because it ignores the timing of production. If WIP is significant, backflush costing can distort period costs.",
    ) +
    "</div>";

  renderShowWork(
    el("bf-show-work"),
    [
      {
        label: "Total Production Cost",
        formula: "Direct Materials + Conversion Costs",
        values: fmt(dmCost) + " + " + fmt(ccCost),
        result: fmt(totalCost),
      },
      {
        label: "Cost per Unit",
        formula: "Total Cost / Units Started",
        values: fmt(totalCost) + " / " + fmtN(started),
        result: fmt2(costPerUnit),
        highlight: true,
      },
      {
        label: "Cost of Goods Sold",
        formula: "Units Sold x Cost per Unit",
        values: fmtN(sold) + " x " + fmt2(costPerUnit),
        result: fmt(cgsCost),
        highlight: true,
      },
      {
        label: "Finished Goods Inventory",
        formula: "(Completed - Sold) x Cost per Unit",
        values:
          "(" +
          fmtN(completed) +
          " - " +
          fmtN(sold) +
          ") x " +
          fmt2(costPerUnit),
        result: fmt(fgInvCost),
      },
      {
        label: "WIP Inventory",
        formula: "(Started - Completed) x Cost per Unit",
        values:
          "(" +
          fmtN(started) +
          " - " +
          fmtN(completed) +
          ") x " +
          fmt2(costPerUnit),
        result: fmt(wipCost),
      },
    ],
    { title: "Backflush Costing", defaultOpen: false },
  );
}

function initBackflush() {
  const btn = el("bf-calculate");
  if (!btn) return;
  btn.addEventListener("click", calcBackflush);
  el("bf-load-example") &&
    el("bf-load-example").addEventListener("click", () => {
      setVal("bf-units-started", 1000);
      setVal("bf-units-completed", 900);
      setVal("bf-units-sold", 800);
      setVal("bf-dm-cost", 400000);
      setVal("bf-cc-cost", 200000);
      calcBackflush();
    });
  initRandomizer(
    "bf-randomize",
    [
      { id: "bf-units-started", min: 500, max: 5000, step: 100, integer: true },
      {
        id: "bf-units-completed",
        min: 400,
        max: 4500,
        step: 100,
        integer: true,
      },
      { id: "bf-units-sold", min: 300, max: 4000, step: 100, integer: true },
      {
        id: "bf-dm-cost",
        min: 50000,
        max: 1000000,
        step: 10000,
        integer: true,
      },
      { id: "bf-cc-cost", min: 20000, max: 500000, step: 10000, integer: true },
    ],
    calcBackflush,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  {
    term: "Economic Order Quantity (EOQ)",
    definition:
      "The order quantity that minimizes total annual ordering and carrying costs. EOQ = sqrt(2 x Annual Demand x Ordering Cost per Order / Annual Carrying Cost per Unit).",
  },
  {
    term: "Ordering Costs",
    definition:
      "Costs incurred each time an order is placed, including purchasing department salaries, processing costs, and receiving and inspection costs.",
  },
  {
    term: "Carrying Costs",
    definition:
      "Costs incurred to hold inventory, including opportunity cost of capital, storage, insurance, obsolescence, and shrinkage. Also called holding costs.",
  },
  {
    term: "Stockout Costs",
    definition:
      "Costs incurred when inventory runs out, including lost contribution margin, expediting costs, and customer goodwill losses.",
  },
  {
    term: "Reorder Point",
    definition:
      "The quantity level at which a new order should be placed. Reorder Point = (Average Demand x Average Lead Time) + Safety Stock.",
  },
  {
    term: "Safety Stock",
    definition:
      "Inventory held as a buffer against demand variability and lead time uncertainty. Safety Stock = (Max Demand x Max Lead Time) - (Avg Demand x Avg Lead Time).",
  },
  {
    term: "Lead Time",
    definition:
      "The time between placing an order and receiving the goods. Longer and more variable lead times require higher safety stock.",
  },
  {
    term: "Just-in-Time (JIT)",
    definition:
      "A demand-pull system where materials are purchased and products are manufactured only as needed. Aims to eliminate waste by reducing inventory to near-zero levels.",
  },
  {
    term: "Push System",
    definition:
      "A production system that manufactures goods based on forecasted demand and pushes them through the production process. Traditional manufacturing uses push systems.",
  },
  {
    term: "Pull System",
    definition:
      "A production system that manufactures goods only in response to actual customer demand. JIT uses pull systems triggered by customer orders.",
  },
  {
    term: "Backflush Costing",
    definition:
      "A costing system that delays recording of costs until a trigger point such as completion of goods or point of sale. Simplifies accounting in JIT environments.",
  },
  {
    term: "Trigger Point",
    definition:
      "The event that causes costs to be recorded in backflush costing. Common trigger points are purchase of materials, completion of goods, and sale of goods.",
  },
  {
    term: "Materials Requirements Planning (MRP)",
    definition:
      "A push-based production planning system that schedules production and purchases based on forecasted demand and bills of materials.",
  },
  {
    term: "Value Stream Costing",
    definition:
      "A lean accounting approach that assigns costs to value streams rather than individual products. Simplifies costing in lean manufacturing environments.",
  },
];

function initKeyTerms() {
  const grid = el("key-terms-grid");
  if (!grid) return;
  KEY_TERMS.forEach((item) => {
    const div = document.createElement("div");
    div.className = "key-term";
    div.setAttribute("role", "button");
    div.setAttribute("tabindex", "0");
    div.setAttribute("aria-expanded", "false");
    div.innerHTML =
      '<div class="key-term__word">' +
      item.term +
      "</div>" +
      '<p class="key-term__definition">' +
      item.definition +
      "</p>";
    div.addEventListener("click", () => {
      const open = div.classList.toggle("key-term--open");
      div.setAttribute("aria-expanded", open);
    });
    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        div.click();
      }
    });
    grid.appendChild(div);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER COMPLETE
// ══════════════════════════════════════════════════════════════════════════════

function injectResetButton(card) {
  if (el("ch21-reset-btn")) return;
  const resetBtn = document.createElement("button");
  resetBtn.id = "ch21-reset-btn";
  resetBtn.className = "btn btn--ghost btn--small";
  resetBtn.textContent = "Reset Chapter";
  resetBtn.style.marginTop = "var(--space-3)";
  resetBtn.addEventListener("click", () => {
    resetChapter("ch21");
    const markBtn = el("mark-complete-btn");
    if (markBtn) {
      markBtn.textContent = "Mark as Complete";
      markBtn.disabled = false;
      markBtn.classList.remove("btn--success");
    }
    resetBtn.remove();
  });
  card.appendChild(resetBtn);
}

function initChapterComplete() {
  const btn = el("mark-complete-btn");
  const card = el("chapter-complete");
  const status = el("ch21-status");
  if (!btn || !card) return;
  if (isChapterComplete("ch21")) {
    btn.textContent = "Chapter Complete!";
    btn.disabled = true;
    btn.classList.add("btn--success");
    if (status) status.textContent = "Complete";
    injectResetButton(card);
  }
  btn.addEventListener("click", () => {
    markChapterComplete("ch21");
    btn.textContent = "Chapter Complete!";
    btn.disabled = true;
    btn.classList.add("btn--success");
    if (status) status.textContent = "Complete";
    injectResetButton(card);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  initSettingsPanel();
  initInventoryCostIdentifier();
  initEOQ();
  initSafetyStock();
  initJIT();
  initBackflush();
  initKeyTerms();
  initChapterComplete();
});
