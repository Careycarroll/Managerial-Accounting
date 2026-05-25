import { initHeader } from "/js/components/header.js";
import { renderShowWork } from "/js/components/show-work.js";

const fmt = (n) => "$" + Math.abs(Math.round(n)).toLocaleString();
const fmtN = (n) => Math.round(n).toLocaleString();
const fmtPct = (n) => (Math.round(n * 10) / 10).toFixed(1) + "%";

const el = (id) => document.getElementById(id);
const val = (id) => {
  const n = el(id);
  return n ? parseFloat(n.value) || 0 : 0;
};

// ── Default customer data ─────────────────────────────────────────────────────

const DEFAULT_CUSTOMERS = [
  {
    name: "Apex Retail",
    revenue: 920000,
    cost: 598000,
    orders: 48,
    deliveries: 24,
    support: 140,
    returns: 18000,
  },
  {
    name: "Blue Star Co",
    revenue: 680000,
    cost: 408000,
    orders: 120,
    deliveries: 60,
    support: 280,
    returns: 42000,
  },
  {
    name: "Crown Dist",
    revenue: 450000,
    cost: 270000,
    orders: 18,
    deliveries: 9,
    support: 40,
    returns: 5000,
  },
  {
    name: "Delta Wholesale",
    revenue: 310000,
    cost: 217000,
    orders: 96,
    deliveries: 48,
    support: 320,
    returns: 28000,
  },
];

const ANALYSIS_CUSTOMERS = [
  {
    name: "Apex Retail",
    revenue: 920000,
    cost: 598000,
    orders: 48,
    deliveries: 24,
    support: 140,
    returns: 18000,
  },
  {
    name: "Blue Star Co",
    revenue: 680000,
    cost: 408000,
    orders: 120,
    deliveries: 60,
    support: 280,
    returns: 42000,
  },
  {
    name: "Crown Dist",
    revenue: 450000,
    cost: 270000,
    orders: 18,
    deliveries: 9,
    support: 40,
    returns: 5000,
  },
  {
    name: "Delta Wholesale",
    revenue: 310000,
    cost: 217000,
    orders: 96,
    deliveries: 48,
    support: 320,
    returns: 28000,
  },
  {
    name: "Echo Partners",
    revenue: 180000,
    cost: 108000,
    orders: 12,
    deliveries: 6,
    support: 20,
    returns: 2000,
  },
];

// ── Build input rows ──────────────────────────────────────────────────────────

function buildRows(tbodyId, customers) {
  const tbody = el(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = customers
    .map(
      (c, i) =>
        "<tr>" +
        '<td><input class="form-input form-input--sm" type="text" data-field="name" data-idx="' +
        i +
        '" value="' +
        c.name +
        '" style="min-width:120px;" /></td>' +
        '<td><input class="form-input form-input--sm" type="number" data-field="revenue" data-idx="' +
        i +
        '" value="' +
        c.revenue +
        '" step="10000" /></td>' +
        '<td><input class="form-input form-input--sm" type="number" data-field="cost" data-idx="' +
        i +
        '" value="' +
        c.cost +
        '" step="10000" /></td>' +
        '<td><input class="form-input form-input--sm" type="number" data-field="orders" data-idx="' +
        i +
        '" value="' +
        c.orders +
        '" step="1" /></td>' +
        '<td><input class="form-input form-input--sm" type="number" data-field="deliveries" data-idx="' +
        i +
        '" value="' +
        c.deliveries +
        '" step="1" /></td>' +
        '<td><input class="form-input form-input--sm" type="number" data-field="support" data-idx="' +
        i +
        '" value="' +
        c.support +
        '" step="10" /></td>' +
        '<td><input class="form-input form-input--sm" type="number" data-field="returns" data-idx="' +
        i +
        '" value="' +
        c.returns +
        '" step="1000" /></td>' +
        "</tr>",
    )
    .join("");
}

function readRows(tbodyId) {
  const tbody = el(tbodyId);
  if (!tbody) return [];
  const rows = tbody.querySelectorAll("tr");
  return Array.from(rows).map((row) => {
    const get = (field) => {
      const input = row.querySelector('[data-field="' + field + '"]');
      return input
        ? field === "name"
          ? input.value.trim()
          : parseFloat(input.value) || 0
        : 0;
    };
    return {
      name: get("name"),
      revenue: get("revenue"),
      cost: get("cost"),
      orders: get("orders"),
      deliveries: get("deliveries"),
      support: get("support"),
      returns: get("returns"),
    };
  });
}

function calcCustomer(c, orderRate, deliveryRate, supportRate, returnsRate) {
  const grossMargin = c.revenue - c.cost;
  const orderCost = c.orders * orderRate;
  const deliveryCost = c.deliveries * deliveryRate;
  const supportCost = c.support * supportRate;
  const returnsCost = c.returns * (returnsRate / 100);
  const totalService = orderCost + deliveryCost + supportCost + returnsCost;
  const operatingIncome = grossMargin - totalService;
  const gmPct = c.revenue > 0 ? grossMargin / c.revenue : 0;
  const oiPct = c.revenue > 0 ? operatingIncome / c.revenue : 0;
  return {
    ...c,
    grossMargin,
    orderCost,
    deliveryCost,
    supportCost,
    returnsCost,
    totalService,
    operatingIncome,
    gmPct,
    oiPct,
  };
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
      buildRows("c-customer-rows", DEFAULT_CUSTOMERS);
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
  const orderRate = val("c-order-rate");
  const deliveryRate = val("c-delivery-rate");
  const supportRate = val("c-support-rate");
  const customers = readRows("c-customer-rows").map((c) =>
    calcCustomer(c, orderRate, deliveryRate, supportRate, 0),
  );

  if (customers.length === 0) return;

  const sorted = [...customers].sort(
    (a, b) => b.operatingIncome - a.operatingIncome,
  );
  const totalRevenue = customers.reduce((s, c) => s + c.revenue, 0);
  const totalOI = customers.reduce((s, c) => s + c.operatingIncome, 0);

  const rows = sorted
    .map((c, i) => {
      const rank = i + 1;
      const tier =
        c.operatingIncome > 0 && c.oiPct >= 0.1
          ? "Grow"
          : c.operatingIncome > 0
            ? "Manage"
            : "Review";
      const tierColor =
        tier === "Grow"
          ? "var(--color-success)"
          : tier === "Manage"
            ? "var(--color-warning)"
            : "var(--color-danger)";
      return (
        "<tr>" +
        "<td><strong>#" +
        rank +
        "</strong> " +
        c.name +
        "</td>" +
        "<td>" +
        fmt(c.revenue) +
        "</td>" +
        "<td>" +
        fmt(c.grossMargin) +
        " (" +
        fmtPct(c.gmPct * 100) +
        ")</td>" +
        "<td>" +
        fmt(c.totalService) +
        "</td>" +
        '<td class="' +
        (c.operatingIncome >= 0 ? "variance-fav" : "variance-unfav") +
        '"><strong>' +
        fmt(c.operatingIncome) +
        "</strong> (" +
        fmtPct(c.oiPct * 100) +
        ")</td>" +
        '<td><span style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:9999px;background:' +
        tierColor +
        ';color:#fff;">' +
        tier +
        "</span></td>" +
        "</tr>"
      );
    })
    .join("");

  const profitableCount = customers.filter((c) => c.operatingIncome > 0).length;
  const lossCount = customers.filter((c) => c.operatingIncome <= 0).length;
  const topCustomer = sorted[0];
  const bottomCustomer = sorted[sorted.length - 1];

  const out = el("c-output");
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Customer Profitability Ranking</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Rank / Customer</th><th>Revenue</th><th>Gross Margin</th><th>Service Costs</th><th>Operating Income</th><th>Action</th></tr></thead>" +
    "<tbody>" +
    rows +
    "</tbody>" +
    '<tfoot><tr class="ch12-result-table__total"><td>Total</td><td>' +
    fmt(totalRevenue) +
    '</td><td></td><td></td><td class="' +
    (totalOI >= 0 ? "variance-fav" : "variance-unfav") +
    '">' +
    fmt(totalOI) +
    "</td><td></td></tr></tfoot>" +
    "</table></div>" +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Profitable Customers</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:var(--color-success);">' +
    profitableCount +
    " of " +
    customers.length +
    "</div></div>" +
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Best Customer</div><div style="font-size:var(--font-size-base);font-weight:800;color:var(--color-success);">' +
    topCustomer.name +
    '</div><div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' +
    fmt(topCustomer.operatingIncome) +
    " OI</div></div>" +
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Needs Review</div><div style="font-size:var(--font-size-base);font-weight:800;color:' +
    (bottomCustomer.operatingIncome < 0
      ? "var(--color-danger)"
      : "var(--color-warning)") +
    ';">' +
    bottomCustomer.name +
    '</div><div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' +
    fmt(bottomCustomer.operatingIncome) +
    " OI</div></div>" +
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">Total OI</div><div style="font-size:var(--font-size-2xl);font-weight:800;color:' +
    (totalOI >= 0 ? "var(--color-success)" : "var(--color-danger)") +
    ';">' +
    fmt(totalOI) +
    "</div></div>" +
    "</div>" +
    '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:var(--color-gray-50);border:1px solid var(--color-gray-200);margin-bottom:var(--space-4);">' +
    '<div style="font-size:var(--font-size-base);font-weight:700;color:var(--color-primary-text);margin-bottom:var(--space-3);">Bottom Line</div>' +
    '<p style="margin:0 0 var(--space-2);font-size:var(--font-size-sm);"><strong>' +
    profitableCount +
    " of " +
    customers.length +
    " customers</strong> are profitable after service costs. " +
    (lossCount > 0
      ? "<strong>" +
        lossCount +
        " customer" +
        (lossCount > 1 ? "s" : "") +
        "</strong> " +
        (lossCount > 1 ? "are" : "is") +
        " destroying value -- they cost more to serve than they generate in gross margin. "
      : "") +
    "Your most profitable customer is <strong>" +
    topCustomer.name +
    "</strong> at <strong>" +
    fmt(topCustomer.operatingIncome) +
    "</strong>. " +
    "High revenue does not equal high profit -- <strong>" +
    bottomCustomer.name +
    "</strong> ranks last despite " +
    (bottomCustomer.revenue > topCustomer.revenue
      ? "higher revenue"
      : "its revenue") +
    ".</p>" +
    '<p style="margin:0;font-size:var(--font-size-sm);">Action tiers: <strong style="color:var(--color-success);">Grow</strong> -- invest in these relationships. <strong style="color:var(--color-warning);">Manage</strong> -- profitable but thin, reduce service costs or raise prices. <strong style="color:var(--color-danger);">Review</strong> -- unprofitable, renegotiate terms or exit.</p>' +
    "</div>" +
    "</div>";

  renderShowWork(
    el("c-show-work"),
    customers.map((c) => ({
      label: c.name,
      formula: "Revenue - Product Cost - Service Costs",
      values:
        fmt(c.revenue) + " - " + fmt(c.cost) + " - " + fmt(c.totalService),
      result: fmt(c.operatingIncome) + " (" + fmtPct(c.oiPct * 100) + ")",
      highlight: c === topCustomer,
    })),
    { title: "Customer Profitability Show Work", defaultOpen: false },
  );
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const orderRate = val("a-order-rate");
  const deliveryRate = val("a-delivery-rate");
  const supportRate = val("a-support-rate");
  const returnsRate = val("a-returns-rate");
  const customers = readRows("a-customer-rows").map((c) =>
    calcCustomer(c, orderRate, deliveryRate, supportRate, returnsRate),
  );

  if (customers.length === 0) return;

  const sorted = [...customers].sort(
    (a, b) => b.operatingIncome - a.operatingIncome,
  );
  const totalOI = customers.reduce((s, c) => s + c.operatingIncome, 0);
  const totalRevenue = customers.reduce((s, c) => s + c.revenue, 0);

  let cumOI = 0;
  const whaleRows = sorted
    .map((c, i) => {
      cumOI += c.operatingIncome;
      const cumPct = totalOI !== 0 ? cumOI / totalOI : 0;
      const bar = Math.max(0, Math.min(100, Math.round(cumPct * 100)));
      const tier =
        c.operatingIncome > 0 && c.oiPct >= 0.1
          ? "Grow"
          : c.operatingIncome > 0
            ? "Manage"
            : "Review";
      const tierColor =
        tier === "Grow"
          ? "var(--color-success)"
          : tier === "Manage"
            ? "var(--color-warning)"
            : "var(--color-danger)";
      const action =
        tier === "Grow"
          ? "Invest in relationship. Offer volume incentives. Protect from competitors."
          : tier === "Manage"
            ? "Reduce service frequency. Negotiate minimum order sizes. Review pricing."
            : "Renegotiate terms. Require minimum order quantities. Consider exiting.";
      return (
        "<tr>" +
        "<td><strong>#" +
        (i + 1) +
        "</strong> " +
        c.name +
        "</td>" +
        "<td>" +
        fmt(c.revenue) +
        "</td>" +
        "<td>" +
        fmt(c.grossMargin) +
        "</td>" +
        "<td>" +
        fmt(c.orderCost) +
        "</td>" +
        "<td>" +
        fmt(c.deliveryCost) +
        "</td>" +
        "<td>" +
        fmt(c.supportCost) +
        "</td>" +
        "<td>" +
        fmt(c.returnsCost) +
        "</td>" +
        '<td class="' +
        (c.operatingIncome >= 0 ? "variance-fav" : "variance-unfav") +
        '"><strong>' +
        fmt(c.operatingIncome) +
        "</strong></td>" +
        '<td><div style="background:var(--color-gray-200);border-radius:4px;height:8px;width:80px;"><div style="background:' +
        (cumPct >= 1
          ? "var(--color-success)"
          : cumPct >= 0.8
            ? "var(--color-warning)"
            : "var(--color-primary)") +
        ";height:8px;border-radius:4px;width:" +
        bar +
        '%"></div></div><div style="font-size:0.65rem;color:var(--color-gray-500);">' +
        fmtPct(cumPct * 100) +
        " cumul.</div></td>" +
        '<td><span style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:9999px;background:' +
        tierColor +
        ';color:#fff;">' +
        tier +
        "</span></td>" +
        '<td style="font-size:var(--font-size-xs);color:var(--color-gray-600);max-width:200px;">' +
        action +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  const out = el("a-output");
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Full Customer Profitability Report</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;min-width:900px;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Rank</th><th>Revenue</th><th>Gross Margin</th><th>Order Cost</th><th>Delivery Cost</th><th>Support Cost</th><th>Returns Cost</th><th>Operating Income</th><th>Cumulative</th><th>Tier</th><th>Recommended Action</th></tr></thead>" +
    "<tbody>" +
    whaleRows +
    "</tbody>" +
    '<tfoot><tr class="ch12-result-table__total"><td>Total</td><td>' +
    fmt(totalRevenue) +
    "</td><td>" +
    fmt(customers.reduce((s, c) => s + c.grossMargin, 0)) +
    "</td><td>" +
    fmt(customers.reduce((s, c) => s + c.orderCost, 0)) +
    "</td><td>" +
    fmt(customers.reduce((s, c) => s + c.deliveryCost, 0)) +
    "</td><td>" +
    fmt(customers.reduce((s, c) => s + c.supportCost, 0)) +
    "</td><td>" +
    fmt(customers.reduce((s, c) => s + c.returnsCost, 0)) +
    '</td><td class="' +
    (totalOI >= 0 ? "variance-fav" : "variance-unfav") +
    '">' +
    fmt(totalOI) +
    "</td><td></td><td></td><td></td></tr></tfoot>" +
    "</table></div>" +
    '<div style="padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);border:1px solid var(--color-gray-200);font-size:var(--font-size-sm);color:var(--color-gray-600);">' +
    "<strong>The whale curve insight:</strong> In most businesses, the top 20% of customers generate more than 100% of profits -- because unprofitable customers drag the total down. The cumulative column shows this effect. Customers that push the cumulative line above 100% are destroying value." +
    "</div>" +
    "</div>";
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initDepthToggle();
  buildRows("c-customer-rows", DEFAULT_CUSTOMERS);
  buildRows("a-customer-rows", ANALYSIS_CUSTOMERS);
  initScenario();

  el("c-calculate") && el("c-calculate").addEventListener("click", calcConcept);
  el("a-calculate") &&
    el("a-calculate").addEventListener("click", calcAnalysis);

  el("c-rand-clear") &&
    el("c-rand-clear").addEventListener("click", () => {
      const customers = DEFAULT_CUSTOMERS.map((c) => {
        const rev =
          Math.round((200000 + Math.random() * 800000) / 10000) * 10000;
        const cost = Math.round(rev * (0.55 + Math.random() * 0.15));
        return {
          name: c.name,
          revenue: rev,
          cost,
          orders: Math.round(10 + Math.random() * 30),
          deliveries: Math.round(5 + Math.random() * 20),
          support: Math.round(20 + Math.random() * 100),
          returns: Math.round(rev * (0.01 + Math.random() * 0.03)),
        };
      });
      buildRows("c-customer-rows", customers);
      calcConcept();
    });

  el("c-rand-hidden") &&
    el("c-rand-hidden").addEventListener("click", () => {
      const orderRate = val("c-order-rate");
      const deliveryRate = val("c-delivery-rate");
      const supportRate = val("c-support-rate");
      const customers = DEFAULT_CUSTOMERS.map((c, i) => {
        const rev =
          Math.round((200000 + Math.random() * 800000) / 10000) * 10000;
        const cost = Math.round(rev * (0.55 + Math.random() * 0.1));
        const orders =
          i >= 2
            ? Math.round(80 + Math.random() * 80)
            : Math.round(10 + Math.random() * 20);
        const deliveries =
          i >= 2
            ? Math.round(40 + Math.random() * 40)
            : Math.round(5 + Math.random() * 10);
        const support =
          i >= 2
            ? Math.round(200 + Math.random() * 200)
            : Math.round(20 + Math.random() * 50);
        const returns =
          i >= 2
            ? Math.round(rev * (0.05 + Math.random() * 0.05))
            : Math.round(rev * 0.01);
        return {
          name: c.name,
          revenue: rev,
          cost,
          orders,
          deliveries,
          support,
          returns,
        };
      });
      buildRows("c-customer-rows", customers);
      calcConcept();
    });
});
