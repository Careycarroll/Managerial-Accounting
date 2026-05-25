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
function setVal(id, v) {
  const n = el(id);
  if (n) n.value = v;
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
      setVal("c-prevention", 40000);
      setVal("c-appraisal", 25000);
      setVal("c-internal", 80000);
      setVal("c-external", 120000);
      setVal("c-revenue", 2000000);
      setVal("c-benchmark", 4);
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

// ── KPI tile helper ───────────────────────────────────────────────────────────

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

// ── Concept ───────────────────────────────────────────────────────────────────

function calcConcept() {
  const prevention = val("c-prevention");
  const appraisal = val("c-appraisal");
  const internal = val("c-internal");
  const external = val("c-external");
  const revenue = val("c-revenue");
  const benchmark = val("c-benchmark") / 100;

  const conformance = prevention + appraisal;
  const nonconformance = internal + external;
  const totalCOQ = conformance + nonconformance;
  const coqPct = revenue > 0 ? totalCOQ / revenue : 0;
  const benchmarkAmt = revenue * benchmark;
  const vsB = totalCOQ - benchmarkAmt;

  const prevPct = totalCOQ > 0 ? prevention / totalCOQ : 0;
  const apprPct = totalCOQ > 0 ? appraisal / totalCOQ : 0;
  const intPct = totalCOQ > 0 ? internal / totalCOQ : 0;
  const extPct = totalCOQ > 0 ? external / totalCOQ : 0;
  const confPct = totalCOQ > 0 ? conformance / totalCOQ : 0;
  const nconfPct = totalCOQ > 0 ? nonconformance / totalCOQ : 0;

  const failureHeavy = nconfPct > 0.65;
  const preventionHeavy = confPct > 0.65;
  const overBenchmark = coqPct > benchmark;

  const verdictLabel = failureHeavy
    ? "Failure-heavy -- invest more in prevention and appraisal"
    : preventionHeavy
      ? "Prevention-heavy -- quality system is mature; monitor failure costs"
      : "Balanced quality cost structure";
  const verdictBg = failureHeavy
    ? "var(--color-danger-bg)"
    : preventionHeavy
      ? "var(--color-success-bg)"
      : "var(--color-info-bg)";
  const verdictBorder = failureHeavy
    ? "var(--color-danger)"
    : preventionHeavy
      ? "var(--color-success)"
      : "var(--color-info)";
  const verdictColor = failureHeavy
    ? "var(--color-danger)"
    : preventionHeavy
      ? "var(--color-success)"
      : "var(--color-info)";

  const verdictText = failureHeavy
    ? "<strong>" +
      fmtPct(nconfPct * 100) +
      "</strong> of your quality costs are failure costs (" +
      fmt(nonconformance) +
      "). For every dollar spent preventing defects, you are spending <strong>" +
      (conformance > 0 ? (nonconformance / conformance).toFixed(1) : "N/A") +
      "x</strong> fixing them. Shifting investment toward prevention typically reduces total COQ significantly."
    : preventionHeavy
      ? "Your quality system is prevention-focused -- <strong>" +
        fmtPct(confPct * 100) +
        "</strong> of COQ is conformance spending. Failure costs are low at <strong>" +
        fmt(nonconformance) +
        "</strong>. Monitor whether prevention spending can be reduced without increasing failures."
      : "Conformance costs are <strong>" +
        fmt(conformance) +
        "</strong> (" +
        fmtPct(confPct * 100) +
        "%) and nonconformance costs are <strong>" +
        fmt(nonconformance) +
        "</strong> (" +
        fmtPct(nconfPct * 100) +
        "%). Total COQ of <strong>" +
        fmt(totalCOQ) +
        "</strong> is " +
        (overBenchmark ? "<strong>above</strong>" : "<strong>below</strong>") +
        " the industry benchmark of <strong>" +
        fmt(benchmarkAmt) +
        "</strong>.";

  const out = el("c-output");
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
    kpi(
      "Total COQ",
      fmt(totalCOQ),
      fmtPct(coqPct * 100) + " of revenue",
      overBenchmark ? "var(--color-danger)" : "var(--color-success)",
    ) +
    kpi(
      "Conformance",
      fmt(conformance),
      fmtPct(confPct * 100) + " of COQ",
      "var(--color-primary-text)",
    ) +
    kpi(
      "Nonconformance",
      fmt(nonconformance),
      fmtPct(nconfPct * 100) + " of COQ",
      nonconformance > conformance
        ? "var(--color-danger)"
        : "var(--color-primary-text)",
    ) +
    kpi(
      "vs Benchmark",
      (vsB >= 0 ? "+" : "-") + fmt(Math.abs(vsB)),
      benchmark * 100 + "% benchmark",
      vsB > 0 ? "var(--color-danger)" : "var(--color-success)",
    ) +
    "</div>" +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Cost-of-Quality Report</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Category</th><th>Amount</th><th>% of COQ</th><th>% of Revenue</th></tr></thead>" +
    "<tbody>" +
    '<tr><td colspan="4" style="font-weight:700;color:var(--color-primary-text);background:var(--color-gray-100);">Costs of Conformance</td></tr>' +
    '<tr><td style="padding-left:var(--space-5);">Prevention</td><td>' +
    fmt(prevention) +
    "</td><td>" +
    fmtPct(prevPct * 100) +
    "</td><td>" +
    fmtPct(revenue > 0 ? (prevention / revenue) * 100 : 0) +
    "</td></tr>" +
    '<tr><td style="padding-left:var(--space-5);">Appraisal</td><td>' +
    fmt(appraisal) +
    "</td><td>" +
    fmtPct(apprPct * 100) +
    "</td><td>" +
    fmtPct(revenue > 0 ? (appraisal / revenue) * 100 : 0) +
    "</td></tr>" +
    '<tr class="ch12-result-table__relevant-total"><td>Total Conformance</td><td>' +
    fmt(conformance) +
    "</td><td>" +
    fmtPct(confPct * 100) +
    "</td><td>" +
    fmtPct(revenue > 0 ? (conformance / revenue) * 100 : 0) +
    "</td></tr>" +
    '<tr><td colspan="4" style="font-weight:700;color:var(--color-primary-text);background:var(--color-gray-100);">Costs of Nonconformance</td></tr>' +
    '<tr><td style="padding-left:var(--space-5);">Internal Failure</td><td>' +
    fmt(internal) +
    "</td><td>" +
    fmtPct(intPct * 100) +
    "</td><td>" +
    fmtPct(revenue > 0 ? (internal / revenue) * 100 : 0) +
    "</td></tr>" +
    '<tr><td style="padding-left:var(--space-5);">External Failure</td><td>' +
    fmt(external) +
    "</td><td>" +
    fmtPct(extPct * 100) +
    "</td><td>" +
    fmtPct(revenue > 0 ? (external / revenue) * 100 : 0) +
    "</td></tr>" +
    '<tr class="ch12-result-table__relevant-total"><td>Total Nonconformance</td><td>' +
    fmt(nonconformance) +
    "</td><td>" +
    fmtPct(nconfPct * 100) +
    "</td><td>" +
    fmtPct(revenue > 0 ? (nonconformance / revenue) * 100 : 0) +
    "</td></tr>" +
    "</tbody>" +
    '<tfoot><tr class="ch12-result-table__total"><td>Total Cost of Quality</td><td>' +
    fmt(totalCOQ) +
    "</td><td>100.0%</td><td>" +
    fmtPct(coqPct * 100) +
    "</td></tr>" +
    "<tr><td>Industry Benchmark</td><td>" +
    fmt(benchmarkAmt) +
    "</td><td>--</td><td>" +
    fmtPct(benchmark * 100) +
    "</td></tr>" +
    "</tfoot>" +
    "</table></div>" +
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
        label: "Total Conformance Costs",
        formula: "Prevention + Appraisal",
        values: fmt(prevention) + " + " + fmt(appraisal),
        result: fmt(conformance),
      },
      {
        label: "Total Nonconformance Costs",
        formula: "Internal Failure + External Failure",
        values: fmt(internal) + " + " + fmt(external),
        result: fmt(nonconformance),
        highlight: true,
      },
      {
        label: "Total COQ",
        formula: "Conformance + Nonconformance",
        values: fmt(conformance) + " + " + fmt(nonconformance),
        result: fmt(totalCOQ),
        highlight: true,
      },
      {
        label: "COQ as % of Revenue",
        formula: "Total COQ / Revenue",
        values: fmt(totalCOQ) + " / " + fmt(revenue),
        result: fmtPct(coqPct * 100),
        highlight: true,
      },
      {
        label: "Benchmark Amount",
        formula: "Revenue x Benchmark %",
        values: fmt(revenue) + " x " + fmtPct(benchmark * 100),
        result: fmt(benchmarkAmt),
      },
      {
        label: "vs Benchmark",
        formula: "Total COQ - Benchmark Amount",
        values: fmt(totalCOQ) + " - " + fmt(benchmarkAmt),
        result: (vsB >= 0 ? "+" : "") + fmt(vsB),
      },
    ],
    { title: "COQ Report Show Work", defaultOpen: false },
  );
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function calcAnalysis() {
  const prev1 = val("a-prev1");
  const prev2 = val("a-prev2");
  const prev3 = val("a-prev3");
  const appr1 = val("a-appr1");
  const appr2 = val("a-appr2");
  const int1 = val("a-int1");
  const int2 = val("a-int2");
  const int3 = val("a-int3");
  const ext1 = val("a-ext1");
  const ext2 = val("a-ext2");
  const ext3 = val("a-ext3");

  const normalSpoil = val("a-normal-spoil");
  const abnormalSpoil = val("a-abnormal-spoil");
  const spoilCost = val("a-spoil-cost");
  const invest = val("a-invest");
  const reduction = val("a-reduction") / 100;
  const revenue = val("a-revenue");
  const benchmark = val("a-benchmark") / 100;

  const prevention = prev1 + prev2 + prev3;
  const appraisal = appr1 + appr2;
  const internal = int1 + int2 + int3;
  const external = ext1 + ext2 + ext3;
  const conformance = prevention + appraisal;
  const nonconformance = internal + external;
  const totalCOQ = conformance + nonconformance;
  const coqPct = revenue > 0 ? totalCOQ / revenue : 0;
  const benchmarkAmt = revenue * benchmark;

  const normalSpoilCost = normalSpoil * spoilCost;
  const abnormalSpoilCost = abnormalSpoil * spoilCost;
  const totalSpoilCost = normalSpoilCost + abnormalSpoilCost;

  const failureSavings = nonconformance * reduction;
  const netBenefit = failureSavings - invest;
  const worthIt = netBenefit > 0;
  const paybackYears = failureSavings > 0 ? invest / failureSavings : Infinity;

  const lineItems = [
    { label: "Training", cat: "Prevention", amt: prev1 },
    { label: "Process Design", cat: "Prevention", amt: prev2 },
    { label: "Supplier Eval", cat: "Prevention", amt: prev3 },
    { label: "Inspection", cat: "Appraisal", amt: appr1 },
    { label: "Testing", cat: "Appraisal", amt: appr2 },
    { label: "Scrap", cat: "Internal Failure", amt: int1 },
    { label: "Rework", cat: "Internal Failure", amt: int2 },
    { label: "Downtime", cat: "Internal Failure", amt: int3 },
    { label: "Warranty", cat: "External Failure", amt: ext1 },
    { label: "Returns", cat: "External Failure", amt: ext2 },
    { label: "Lost Customers", cat: "External Failure", amt: ext3 },
  ]
    .filter((i) => i.amt > 0)
    .sort((a, b) => b.amt - a.amt);

  const out = el("a-output");
  out.innerHTML =
    '<div style="margin-top:var(--space-5);">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
    kpi(
      "Total COQ",
      fmt(totalCOQ),
      fmtPct(coqPct * 100) + " of revenue",
      totalCOQ > benchmarkAmt ? "var(--color-danger)" : "var(--color-success)",
    ) +
    kpi(
      "Conformance",
      fmt(conformance),
      fmtPct(totalCOQ > 0 ? (conformance / totalCOQ) * 100 : 0) + " of COQ",
      "var(--color-primary-text)",
    ) +
    kpi(
      "Nonconformance",
      fmt(nonconformance),
      fmtPct(totalCOQ > 0 ? (nonconformance / totalCOQ) * 100 : 0) + " of COQ",
      nonconformance > conformance
        ? "var(--color-danger)"
        : "var(--color-primary-text)",
    ) +
    kpi(
      "Abnormal Spoilage",
      fmt(abnormalSpoilCost),
      fmtN(abnormalSpoil) + " units",
      abnormalSpoil > 0 ? "var(--color-danger)" : "var(--color-gray-400)",
    ) +
    "</div>" +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Pareto -- Quality Cost Line Items (Largest to Smallest)</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Line Item</th><th>Category</th><th>Amount</th><th>% of COQ</th><th>Cumulative %</th></tr></thead>" +
    "<tbody>" +
    (() => {
      let cum = 0;
      return lineItems
        .map((item) => {
          cum += item.amt;
          const pct = totalCOQ > 0 ? (item.amt / totalCOQ) * 100 : 0;
          const cumPct = totalCOQ > 0 ? (cum / totalCOQ) * 100 : 0;
          const isFailure = item.cat.includes("Failure");
          return (
            "<tr>" +
            "<td>" +
            item.label +
            "</td>" +
            '<td><span style="font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:9999px;background:' +
            (isFailure ? "var(--color-danger-bg)" : "var(--color-info-bg)") +
            ";color:" +
            (isFailure ? "var(--color-danger)" : "var(--color-info)") +
            ';">' +
            item.cat +
            "</span></td>" +
            "<td>" +
            fmt(item.amt) +
            "</td>" +
            "<td>" +
            fmtPct(pct) +
            "</td>" +
            "<td>" +
            fmtPct(cumPct) +
            (cumPct <= 80 ? " &#9679;" : "") +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
    })() +
    "</tbody>" +
    '<tfoot><tr class="ch12-result-table__total"><td colspan="2">Total COQ</td><td>' +
    fmt(totalCOQ) +
    "</td><td>100.0%</td><td>--</td></tr></tfoot>" +
    "</table></div>" +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Spoilage Cost Analysis</h4>' +
    '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;margin-bottom:var(--space-5);">' +
    "<thead><tr><th>Type</th><th>Units</th><th>Cost/Unit</th><th>Total Cost</th><th>Accounting Treatment</th></tr></thead>" +
    "<tbody>" +
    "<tr><td>Normal Spoilage</td><td>" +
    fmtN(normalSpoil) +
    "</td><td>" +
    fmt(spoilCost) +
    "</td><td>" +
    fmt(normalSpoilCost) +
    "</td><td>Included in product cost (inventoriable)</td></tr>" +
    "<tr><td>Abnormal Spoilage</td><td>" +
    fmtN(abnormalSpoil) +
    "</td><td>" +
    fmt(spoilCost) +
    "</td><td>" +
    fmt(abnormalSpoilCost) +
    '</td><td style="color:var(--color-danger);">Period cost -- expensed immediately</td></tr>' +
    "</tbody>" +
    '<tfoot><tr class="ch12-result-table__total"><td>Total Spoilage</td><td>' +
    fmtN(normalSpoil + abnormalSpoil) +
    "</td><td>--</td><td>" +
    fmt(totalSpoilCost) +
    "</td><td>--</td></tr></tfoot>" +
    "</table></div>" +
    '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Prevention Investment Decision</h4>' +
    '<div style="padding:var(--space-5);border-radius:var(--radius-lg);background:' +
    (worthIt ? "var(--color-success-bg)" : "var(--color-danger-bg)") +
    ";border:1px solid " +
    (worthIt ? "var(--color-success)" : "var(--color-danger)") +
    ';margin-bottom:var(--space-4);">' +
    '<div style="font-size:var(--font-size-base);font-weight:700;color:' +
    (worthIt ? "var(--color-success)" : "var(--color-danger)") +
    ';margin-bottom:var(--space-2);">' +
    (worthIt
      ? "Invest -- prevention pays for itself"
      : "Do not invest -- savings do not cover the cost") +
    "</div>" +
    '<p style="margin:0;font-size:var(--font-size-sm);">Investing <strong>' +
    fmt(invest) +
    "</strong> in prevention is expected to reduce failure costs by <strong>" +
    fmtPct(reduction * 100) +
    "</strong>, saving <strong>" +
    fmt(failureSavings) +
    "</strong> per year. " +
    "Net benefit: <strong>" +
    (netBenefit >= 0 ? "" : "(") +
    fmt(Math.abs(netBenefit)) +
    (netBenefit < 0 ? ")" : "") +
    "</strong>. " +
    (isFinite(paybackYears)
      ? "Payback period: <strong>" +
        paybackYears.toFixed(1) +
        " years</strong>."
      : "No payback -- failure savings are zero.") +
    "</p>" +
    "</div>" +
    "</div>";

  renderShowWork(
    el("a-show-work"),
    [
      {
        label: "Total Prevention",
        formula: "Training + Process Design + Supplier Eval",
        values: fmt(prev1) + " + " + fmt(prev2) + " + " + fmt(prev3),
        result: fmt(prevention),
      },
      {
        label: "Total Appraisal",
        formula: "Inspection + Testing",
        values: fmt(appr1) + " + " + fmt(appr2),
        result: fmt(appraisal),
      },
      {
        label: "Total Internal Failure",
        formula: "Scrap + Rework + Downtime",
        values: fmt(int1) + " + " + fmt(int2) + " + " + fmt(int3),
        result: fmt(internal),
      },
      {
        label: "Total External Failure",
        formula: "Warranty + Returns + Lost Customers",
        values: fmt(ext1) + " + " + fmt(ext2) + " + " + fmt(ext3),
        result: fmt(external),
      },
      {
        label: "Total COQ",
        formula: "Prevention + Appraisal + Internal + External",
        values:
          fmt(prevention) +
          " + " +
          fmt(appraisal) +
          " + " +
          fmt(internal) +
          " + " +
          fmt(external),
        result: fmt(totalCOQ),
        highlight: true,
      },
      {
        label: "Abnormal Spoilage Cost",
        formula: "Abnormal Units x Cost per Unit",
        values: fmtN(abnormalSpoil) + " x " + fmt(spoilCost),
        result: fmt(abnormalSpoilCost),
        highlight: true,
      },
      {
        label: "Expected Failure Cost Savings",
        formula: "Nonconformance Costs x Reduction %",
        values: fmt(nonconformance) + " x " + fmtPct(reduction * 100),
        result: fmt(failureSavings),
      },
      {
        label: "Net Benefit of Prevention Investment",
        formula: "Failure Savings - Investment",
        values: fmt(failureSavings) + " - " + fmt(invest),
        result: fmt(netBenefit),
        highlight: true,
      },
      {
        label: "Payback Period",
        formula: "Investment / Annual Savings",
        values: fmt(invest) + " / " + fmt(failureSavings),
        result: isFinite(paybackYears)
          ? paybackYears.toFixed(1) + " years"
          : "N/A",
      },
    ],
    { title: "Quality Analysis Show Work", defaultOpen: false },
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

  el("c-rand-failure") &&
    el("c-rand-failure").addEventListener("click", () => {
      const rev =
        Math.round((1000000 + Math.random() * 4000000) / 50000) * 50000;
      const prev =
        Math.round((rev * 0.005 + Math.random() * rev * 0.01) / 1000) * 1000;
      const appr =
        Math.round((rev * 0.005 + Math.random() * rev * 0.01) / 1000) * 1000;
      const intF =
        Math.round((rev * 0.03 + Math.random() * rev * 0.04) / 1000) * 1000;
      const extF =
        Math.round((rev * 0.04 + Math.random() * rev * 0.05) / 1000) * 1000;
      setVal("c-prevention", prev);
      setVal("c-appraisal", appr);
      setVal("c-internal", intF);
      setVal("c-external", extF);
      setVal("c-revenue", rev);
      setVal("c-benchmark", 4);
      calcConcept();
    });

  el("c-rand-prevention") &&
    el("c-rand-prevention").addEventListener("click", () => {
      const rev =
        Math.round((1000000 + Math.random() * 4000000) / 50000) * 50000;
      const prev =
        Math.round((rev * 0.03 + Math.random() * rev * 0.03) / 1000) * 1000;
      const appr =
        Math.round((rev * 0.02 + Math.random() * rev * 0.02) / 1000) * 1000;
      const intF =
        Math.round((rev * 0.003 + Math.random() * rev * 0.005) / 1000) * 1000;
      const extF =
        Math.round((rev * 0.002 + Math.random() * rev * 0.004) / 1000) * 1000;
      setVal("c-prevention", prev);
      setVal("c-appraisal", appr);
      setVal("c-internal", intF);
      setVal("c-external", extF);
      setVal("c-revenue", rev);
      setVal("c-benchmark", 4);
      calcConcept();
    });

  el("c-rand-balanced") &&
    el("c-rand-balanced").addEventListener("click", () => {
      const rev =
        Math.round((1000000 + Math.random() * 4000000) / 50000) * 50000;
      const prev =
        Math.round((rev * 0.01 + Math.random() * rev * 0.015) / 1000) * 1000;
      const appr =
        Math.round((rev * 0.01 + Math.random() * rev * 0.01) / 1000) * 1000;
      const intF =
        Math.round((rev * 0.01 + Math.random() * rev * 0.015) / 1000) * 1000;
      const extF =
        Math.round((rev * 0.01 + Math.random() * rev * 0.015) / 1000) * 1000;
      setVal("c-prevention", prev);
      setVal("c-appraisal", appr);
      setVal("c-internal", intF);
      setVal("c-external", extF);
      setVal("c-revenue", rev);
      setVal("c-benchmark", 4);
      calcConcept();
    });
});
