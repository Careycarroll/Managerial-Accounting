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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Present value of annuity factor: (1 - (1+r)^-n) / r
function pvaf(r, n) {
  if (r === 0) return n;
  return (1 - Math.pow(1 + r, -n)) / r;
}

// Present value of single amount: 1 / (1+r)^n
function pvf(r, n) {
  return 1 / Math.pow(1 + r, n);
}

// IRR via bisection (after-tax cash flows array, year-0 is negative outflow)
function calcIRR(cashFlows) {
  let lo = -0.999,
    hi = 10.0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const npv = cashFlows.reduce(
      (sum, cf, t) => sum + cf / Math.pow(1 + mid, t),
      0,
    );
    if (Math.abs(npv) < 0.01) return mid;
    if (npv > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Depth toggle ──────────────────────────────────────────────────────────────

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

// ── Scenario card ─────────────────────────────────────────────────────────────

function initScenario() {
  const useBtn = el("scenario-use-btn");
  if (useBtn) {
    useBtn.addEventListener("click", () => {
      setVal("c-investment", 500000);
      setVal("c-cashflow", 120000);
      setVal("c-life", 6);
      setVal("c-salvage", 50000);
      setVal("c-rate", 12);
      setVal("c-tax", 30);
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
  const invest = val("c-investment");
  const cf = val("c-cashflow");
  const life = val("c-life");
  const salvage = val("c-salvage");
  const rate = val("c-rate") / 100;
  const tax = val("c-tax") / 100;

  // Straight-line depreciation
  const depn = (invest - salvage) / life;

  // After-tax annual operating cash flow
  const atcf = cf * (1 - tax) + depn * tax;

  // After-tax salvage (book value = salvage at end of SL life, so no tax on gain)
  const atSalvage = salvage;

  // NPV
  const npv = -invest + atcf * pvaf(rate, life) + atSalvage * pvf(rate, life);

  // Payback (simple, pre-tax cash flow)
  const payback = invest / cf;

  // IRR (bisection on after-tax flows)
  const flows = [-invest];
  for (let t = 1; t <= life; t++) {
    flows.push(t === life ? atcf + atSalvage : atcf);
  }
  const irr = calcIRR(flows);

  // AARR = average annual after-tax net income / average investment
  const avgNetIncome = cf * (1 - tax) - depn * (1 - tax);
  const avgInvestment = (invest + salvage) / 2;
  const aarr = avgInvestment > 0 ? avgNetIncome / avgInvestment : 0;

  const verdict = npv > 0 ? "yes" : "no";
  const verdictColor =
    verdict === "yes" ? "var(--color-success)" : "var(--color-danger)";
  const verdictBg =
    verdict === "yes" ? "var(--color-success-bg)" : "var(--color-danger-bg)";
  const verdictBorder =
    verdict === "yes" ? "var(--color-success)" : "var(--color-danger)";
  const verdictLabel =
    verdict === "yes"
      ? "Invest -- NPV is positive"
      : "Do not invest -- NPV is negative";
  const verdictText =
    verdict === "yes"
      ? "At a <strong>" +
        fmtPct(rate * 100) +
        "</strong> required return, this project generates a positive NPV of <strong>" +
        fmt(npv) +
        "</strong>. The investment creates value. IRR of <strong>" +
        fmtPct(irr * 100) +
        "</strong> exceeds the hurdle rate, and you recover your initial outlay in <strong>" +
        payback.toFixed(1) +
        " years</strong>."
      : "At a <strong>" +
        fmtPct(rate * 100) +
        "</strong> required return, this project destroys value -- NPV is <strong>(" +
        fmt(Math.abs(npv)) +
        ")</strong>. The IRR of <strong>" +
        fmtPct(irr * 100) +
        "</strong> falls short of the hurdle rate. Payback of <strong>" +
        payback.toFixed(1) +
        " years</strong> does not compensate for the risk.";

  const out = el("c-output");
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
    kpi(
      "NPV",
      fmt(npv),
      "net present value",
      npv >= 0 ? "var(--color-success)" : "var(--color-danger)",
    ) +
    kpi(
      "IRR",
      fmtPct(irr * 100),
      "internal rate of return",
      irr >= rate ? "var(--color-success)" : "var(--color-danger)",
    ) +
    kpi(
      "Payback",
      payback.toFixed(1) + " yrs",
      "years to recover investment",
      "var(--color-primary-text)",
    ) +
    kpi(
      "AARR",
      fmtPct(aarr * 100),
      "acctg rate of return",
      "var(--color-primary-text)",
    ) +
    "</div>" +
    '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:' +
    verdictBg +
    ";border:1px solid " +
    verdictBorder +
    ';margin-bottom:var(--space-4);">' +
    '<div style="font-size:var(--font-size-base);font-weight:700;color:' +
    verdictColor +
    ';margin-bottom:var(--space-2);">' +
    verdictLabel +
    "</div>" +
    '<p style="margin:0;font-size:var(--font-size-sm);">' +
    verdictText +
    "</p>" +
    "</div>" +
    "</div>";

  renderShowWork(
    el("c-show-work"),
    [
      {
        label: "Annual Depreciation (Straight-Line)",
        formula: "(Investment - Salvage) / Life",
        values: "(" + fmt(invest) + " - " + fmt(salvage) + ") / " + life,
        result: fmt(depn) + " per year",
      },
      {
        label: "After-Tax Annual Cash Flow",
        formula: "CF x (1 - Tax) + Depreciation x Tax",
        values:
          fmt(cf) +
          " x (1 - " +
          fmtPct(tax * 100) +
          ") + " +
          fmt(depn) +
          " x " +
          fmtPct(tax * 100),
        result: fmt(atcf) + " per year",
        highlight: true,
      },
      {
        label: "PV Annuity Factor",
        formula: "(1 - (1 + r)^-n) / r",
        values:
          "(1 - (1 + " +
          fmtPct(rate * 100) +
          ")^-" +
          life +
          ") / " +
          fmtPct(rate * 100),
        result: pvaf(rate, life).toFixed(4),
      },
      {
        label: "PV of Annual Cash Flows",
        formula: "ATCF x PVAF",
        values: fmt(atcf) + " x " + pvaf(rate, life).toFixed(4),
        result: fmt(atcf * pvaf(rate, life)),
      },
      {
        label: "PV of Salvage Value",
        formula: "Salvage x PVF(r, n)",
        values: fmt(salvage) + " x " + pvf(rate, life).toFixed(4),
        result: fmt(salvage * pvf(rate, life)),
      },
      {
        label: "NPV",
        formula: "-Investment + PV(Cash Flows) + PV(Salvage)",
        values:
          "-" +
          fmt(invest) +
          " + " +
          fmt(atcf * pvaf(rate, life)) +
          " + " +
          fmt(salvage * pvf(rate, life)),
        result: fmt(npv),
        highlight: true,
      },
      {
        label: "Simple Payback",
        formula: "Investment / Annual Cash Inflow",
        values: fmt(invest) + " / " + fmt(cf),
        result: payback.toFixed(2) + " years",
      },
      {
        label: "AARR",
        formula: "Avg Annual Net Income / Avg Investment",
        values: fmt(avgNetIncome) + " / " + fmt(avgInvestment),
        result: fmtPct(aarr * 100),
      },
    ],
    { title: "Capital Budgeting Show Work", defaultOpen: false },
  );
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const invest = val("a-investment");
  const salvage = val("a-salvage");
  const life = val("a-life");
  const workingCap = val("a-working-cap");
  const revenue = val("a-revenue");
  const costSavings = val("a-cost-savings");
  const cashCosts = val("a-cash-costs");
  const rate = val("a-rate") / 100;
  const tax = val("a-tax") / 100;
  const coc = val("a-cost-of-cap") / 100;

  const depn = (invest - salvage) / life;
  const annualCF = revenue + costSavings - cashCosts;
  const atcf = annualCF * (1 - tax) + depn * tax;

  // Terminal cash flows (year n)
  const atSalvage = salvage; // book = salvage under SL, no tax on gain
  const wcRecovery = workingCap;
  const terminalCF = atcf + atSalvage + wcRecovery;

  // Year-0 outflow
  const year0 = -(invest + workingCap);

  // Build cash flow array
  const flows = [year0];
  for (let t = 1; t <= life; t++) {
    flows.push(t === life ? terminalCF : atcf);
  }

  // NPV
  const npv = flows.reduce((sum, cf, t) => sum + cf * pvf(rate, t), 0);

  // IRR
  const irr = calcIRR(flows);

  // Payback (cumulative after-tax)
  let cumulative = year0;
  let payback = life; // default if never recovered
  for (let t = 1; t <= life; t++) {
    const prev = cumulative;
    cumulative += flows[t];
    if (prev < 0 && cumulative >= 0) {
      payback = t - 1 + Math.abs(prev) / flows[t];
      break;
    }
  }

  // AARR
  const avgNetIncome = annualCF * (1 - tax) - depn * (1 - tax);
  const avgInvestment = (invest + salvage) / 2;
  const aarr = avgInvestment > 0 ? avgNetIncome / avgInvestment : 0;

  // ROI and RI (Ch. 24 tie-in) -- use average investment as asset base
  const roi = avgInvestment > 0 ? avgNetIncome / avgInvestment : 0;
  const ri = avgNetIncome - coc * avgInvestment;

  // Sensitivity: breakeven hurdle rate = IRR
  const breakevenRate = irr;

  // NPV profile for sensitivity table (rates from 0% to IRR+10%)
  const profileRates = [0, 5, 8, 10, 12, 15, 20, 25].map((r) => r / 100);

  const verdict = npv > 0 ? "yes" : "no";
  const verdictColor =
    verdict === "yes" ? "var(--color-success)" : "var(--color-danger)";
  const verdictBg =
    verdict === "yes" ? "var(--color-success-bg)" : "var(--color-danger-bg)";
  const verdictBorder =
    verdict === "yes" ? "var(--color-success)" : "var(--color-danger)";

  const out = el("a-output");
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    // ── KPI row ──
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
    kpi(
      "NPV",
      fmt(npv),
      "net present value",
      npv >= 0 ? "var(--color-success)" : "var(--color-danger)",
    ) +
    kpi(
      "IRR",
      fmtPct(irr * 100),
      "internal rate of return",
      irr >= rate ? "var(--color-success)" : "var(--color-danger)",
    ) +
    kpi(
      "Payback",
      payback.toFixed(1) + " yrs",
      "after-tax payback",
      "var(--color-primary-text)",
    ) +
    kpi(
      "AARR",
      fmtPct(aarr * 100),
      "accounting rate of return",
      "var(--color-primary-text)",
    ) +
    "</div>" +
    // ── Year-by-year cash flow table ──
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">After-Tax Cash Flow by Year</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Year</th><th>Pre-Tax CF</th><th>Tax</th><th>Dep'n Shield</th><th>After-Tax CF</th><th>PV Factor</th><th>PV of CF</th></tr></thead>" +
    "<tbody>" +
    "<tr><td>0</td><td>(" +
    fmt(invest + workingCap) +
    ")</td><td>--</td><td>--</td><td>(" +
    fmt(invest + workingCap) +
    ")</td><td>1.0000</td><td>(" +
    fmt(invest + workingCap) +
    ")</td></tr>" +
    Array.from({ length: life }, (_, i) => {
      const t = i + 1;
      const cf = t === life ? terminalCF : atcf;
      const pv = cf * pvf(rate, t);
      const taxAmt = annualCF * tax;
      const shield = depn * tax;
      const terminal =
        t === life ? " + " + fmt(atSalvage + wcRecovery) + " terminal" : "";
      return (
        "<tr" +
        (t === life ? ' class="ch12-result-table__relevant-total"' : "") +
        ">" +
        "<td>" +
        t +
        (t === life ? " (final)" : "") +
        "</td>" +
        "<td>" +
        fmt(annualCF) +
        terminal +
        "</td>" +
        "<td>(" +
        fmt(taxAmt) +
        ")</td>" +
        "<td>" +
        fmt(shield) +
        "</td>" +
        "<td>" +
        fmt(cf) +
        "</td>" +
        "<td>" +
        pvf(rate, t).toFixed(4) +
        "</td>" +
        "<td>" +
        (pv >= 0 ? fmt(pv) : "(" + fmt(Math.abs(pv)) + ")") +
        "</td>" +
        "</tr>"
      );
    }).join("") +
    "</tbody>" +
    '<tfoot><tr class="ch12-result-table__total"><td colspan="6">NPV</td><td>' +
    (npv >= 0 ? fmt(npv) : "(" + fmt(Math.abs(npv)) + ")") +
    "</td></tr></tfoot>" +
    "</table></div>" +
    // ── Decision metrics ──
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Decision Metrics</h4>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
    metricCard(
      "NPV",
      fmt(npv),
      npv >= 0
        ? "Accept -- positive NPV creates value"
        : "Reject -- negative NPV destroys value",
      npv >= 0,
    ) +
    metricCard(
      "IRR vs Hurdle",
      fmtPct(irr * 100) + " vs " + fmtPct(rate * 100),
      irr >= rate
        ? "Accept -- IRR exceeds required return"
        : "Reject -- IRR below required return",
      irr >= rate,
    ) +
    metricCard(
      "Payback",
      payback.toFixed(1) + " years",
      "After-tax cash recovery period",
      true,
    ) +
    metricCard(
      "AARR",
      fmtPct(aarr * 100),
      "Accounting rate of return on avg investment",
      true,
    ) +
    "</div>" +
    // ── Ch. 24 Performance tie-in ──
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Performance Measurement Tie-In (Ch. 24)</h4>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
    metricCard(
      "ROI",
      fmtPct(roi * 100),
      "Avg net income / avg investment. Managers may reject positive-NPV projects if ROI < division target.",
      true,
    ) +
    metricCard(
      "Residual Income",
      fmt(ri),
      ri >= 0
        ? "RI is positive -- project exceeds cost of capital"
        : "RI is negative -- project earns less than cost of capital",
      ri >= 0,
    ) +
    "</div>" +
    // ── Sensitivity table ──
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Sensitivity: NPV at Different Hurdle Rates</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Hurdle Rate</th><th>NPV</th><th>Decision</th></tr></thead>" +
    "<tbody>" +
    profileRates
      .map((r) => {
        const n = flows.reduce((sum, cf, t) => sum + cf * pvf(r, t), 0);
        return (
          "<tr" +
          (Math.abs(r - rate) < 0.001
            ? ' class="ch12-result-table__relevant-total"'
            : "") +
          ">" +
          "<td>" +
          fmtPct(r * 100) +
          (Math.abs(r - rate) < 0.001 ? " (your rate)" : "") +
          "</td>" +
          '<td class="' +
          (n >= 0 ? "variance-fav" : "variance-unfav") +
          '">' +
          (n >= 0 ? fmt(n) : "(" + fmt(Math.abs(n)) + ")") +
          "</td>" +
          "<td>" +
          (n >= 0 ? "Accept" : "Reject") +
          "</td>" +
          "</tr>"
        );
      })
      .join("") +
    "</tbody></table></div>" +
    // ── Verdict ──
    '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:' +
    verdictBg +
    ";border:1px solid " +
    verdictBorder +
    ';margin-bottom:var(--space-4);">' +
    '<div style="font-size:var(--font-size-base);font-weight:700;color:' +
    verdictColor +
    ';margin-bottom:var(--space-2);">' +
    (verdict === "yes"
      ? "Invest -- all primary metrics support approval"
      : "Do not invest -- project fails the NPV test") +
    "</div>" +
    '<p style="margin:0;font-size:var(--font-size-sm);">' +
    "The project breaks even (NPV = 0) at a hurdle rate of <strong>" +
    fmtPct(breakevenRate * 100) +
    "</strong>. " +
    (verdict === "yes"
      ? "Your required return of <strong>" +
        fmtPct(rate * 100) +
        "</strong> is below that threshold, so the project creates value at <strong>" +
        fmt(npv) +
        "</strong>."
      : "Your required return of <strong>" +
        fmtPct(rate * 100) +
        "</strong> exceeds that threshold, so the project destroys value by <strong>" +
        fmt(Math.abs(npv)) +
        "</strong>.") +
    " Note: ROI-based evaluation (Ch. 24) may lead managers to reject this project if divisional ROI targets differ from the NPV hurdle rate -- a classic goal-congruence problem." +
    "</p>" +
    "</div>" +
    "</div>";

  renderShowWork(
    el("a-show-work"),
    [
      {
        label: "Annual Depreciation (Straight-Line)",
        formula: "(Investment - Salvage) / Life",
        values: "(" + fmt(invest) + " - " + fmt(salvage) + ") / " + life,
        result: fmt(depn) + " per year",
      },
      {
        label: "Pre-Tax Annual Cash Flow",
        formula: "Revenue Increase + Cost Savings - Cash Costs",
        values:
          fmt(revenue) + " + " + fmt(costSavings) + " - " + fmt(cashCosts),
        result: fmt(annualCF),
      },
      {
        label: "After-Tax Operating Cash Flow",
        formula: "Pre-Tax CF x (1 - Tax) + Depreciation x Tax",
        values:
          fmt(annualCF) +
          " x (1 - " +
          fmtPct(tax * 100) +
          ") + " +
          fmt(depn) +
          " x " +
          fmtPct(tax * 100),
        result: fmt(atcf) + " per year",
        highlight: true,
      },
      {
        label: "Year-0 Cash Outflow",
        formula: "-(Investment + Working Capital)",
        values: "-(" + fmt(invest) + " + " + fmt(workingCap) + ")",
        result: "(" + fmt(invest + workingCap) + ")",
      },
      {
        label: "Terminal Cash Flow (Year " + life + ")",
        formula: "ATCF + Salvage + Working Capital Recovery",
        values: fmt(atcf) + " + " + fmt(atSalvage) + " + " + fmt(wcRecovery),
        result: fmt(terminalCF),
      },
      {
        label: "NPV",
        formula: "Sum of PV(after-tax cash flows)",
        values: "Year 0 through Year " + life,
        result: fmt(npv),
        highlight: true,
      },
      {
        label: "IRR",
        formula: "Rate where NPV = 0 (bisection)",
        values: "Solved numerically",
        result: fmtPct(irr * 100),
        highlight: true,
      },
      {
        label: "AARR",
        formula: "Avg Annual Net Income / Avg Investment",
        values: fmt(avgNetIncome) + " / " + fmt(avgInvestment),
        result: fmtPct(aarr * 100),
      },
      {
        label: "Residual Income",
        formula: "Avg Net Income - (Cost of Capital x Avg Investment)",
        values:
          fmt(avgNetIncome) +
          " - (" +
          fmtPct(coc * 100) +
          " x " +
          fmt(avgInvestment) +
          ")",
        result: fmt(ri),
        highlight: true,
      },
    ],
    { title: "Capital Budgeting Full Analysis Show Work", defaultOpen: false },
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function kpi(label, value, sub, color) {
  return (
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;">' +
    '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">' +
    label +
    "</div>" +
    '<div style="font-size:var(--font-size-2xl);font-weight:800;color:' +
    color +
    ';">' +
    value +
    "</div>" +
    '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' +
    sub +
    "</div>" +
    "</div>"
  );
}

function metricCard(label, value, desc, positive) {
  return (
    '<div style="background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">' +
    '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">' +
    label +
    "</div>" +
    '<div style="font-size:var(--font-size-xl);font-weight:800;color:' +
    (positive ? "var(--color-success)" : "var(--color-danger)") +
    ';margin-bottom:var(--space-2);">' +
    value +
    "</div>" +
    '<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">' +
    desc +
    "</div>" +
    "</div>"
  );
}

// ── Randomizers ───────────────────────────────────────────────────────────────

function randConcept(outcome) {
  const life = Math.round(4 + Math.random() * 8);
  const rate = Math.round((8 + Math.random() * 12) * 2) / 2;
  const tax = Math.round(20 + Math.random() * 20);
  const invest = Math.round((200000 + Math.random() * 800000) / 10000) * 10000;
  const salvagePct = 0.05 + Math.random() * 0.15;
  const salvage = Math.round((invest * salvagePct) / 5000) * 5000;
  const depn = (invest - salvage) / life;
  const r = rate / 100;
  const t = tax / 100;

  // Solve for cf that produces target NPV direction
  // NPV = -invest + atcf * pvaf(r,life) + salvage * pvf(r,life)
  // atcf = cf*(1-t) + depn*t
  // target: npv > margin (yes), npv < -margin (no), |npv| < margin (border)
  const pvaFactor = pvaf(r, life);
  const pvSalvage = salvage * pvf(r, life);

  let targetNPV;
  if (outcome === "yes") targetNPV = invest * (0.15 + Math.random() * 0.25);
  if (outcome === "no") targetNPV = -invest * (0.15 + Math.random() * 0.25);
  if (outcome === "border") targetNPV = invest * (Math.random() * 0.06 - 0.03);

  // atcf needed = (targetNPV + invest - pvSalvage) / pvaFactor
  const atcfNeeded = (targetNPV + invest - pvSalvage) / pvaFactor;
  // atcf = cf*(1-t) + depn*t  =>  cf = (atcf - depn*t) / (1-t)
  const cf = t < 1 ? (atcfNeeded - depn * t) / (1 - t) : atcfNeeded;
  const cfRounded = Math.max(1000, Math.round(cf / 1000) * 1000);

  setVal("c-investment", invest);
  setVal("c-cashflow", cfRounded);
  setVal("c-life", life);
  setVal("c-salvage", salvage);
  setVal("c-rate", rate);
  setVal("c-tax", tax);
  calcConcept();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initDepthToggle();
  initScenario();

  el("c-calculate") && el("c-calculate").addEventListener("click", calcConcept);
  el("a-calculate") &&
    el("a-calculate").addEventListener("click", calcAnalysis);

  el("c-rand-yes") &&
    el("c-rand-yes").addEventListener("click", () => randConcept("yes"));
  el("c-rand-no") &&
    el("c-rand-no").addEventListener("click", () => randConcept("no"));
  el("c-rand-border") &&
    el("c-rand-border").addEventListener("click", () => randConcept("border"));
});
