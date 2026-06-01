// js/practice/ch24-problems.js
// Chapter 24 — Performance Measurement, Compensation, and Multinational Considerations
// Pass 2 problems — exercises ROI/RI/EVA computation, the ROI-vs-RI
// goal-congruence conflict, and pay-for-performance design.
//
// Conforms to js/practice/SPEC.md (Pass 2).
// Five problems:
//   1. ROI Calculation & Decomposition
//   2. Residual Income vs ROI
//   3. EVA — Economic Value Added
//   4. Investment Center Decision (RI ↑ ROI ↓)
//   5. Compensation Linkage

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH24_REVIEW = [
  {
    label: "Ch. 24 — Performance Measurement and Compensation",
    href: `${BASE}pages/learn/ch24.html`,
  },
];

// ============================================================================
// Carry-forward annotation helper
// ============================================================================

function carryForwardNote(
  stepId,
  label,
  prior,
  studentAnswers,
  formatter = (v) => `$${v.toLocaleString()}`,
) {
  const correct = prior[stepId];
  const student = studentAnswers[stepId];
  if (student === undefined) return null;
  if (typeof correct === "string") {
    if (correct === student) return null;
    return `Using Step ${label}'s correct selection: ${correct} (your selection: ${student})`;
  }
  if (Math.abs(correct - student) <= 0.5) return null;
  return `Using Step ${label}'s correct value: ${formatter(correct)} (your answer: ${formatter(student)})`;
}

// ============================================================================
// Problem 1 — ROI Calculation & DuPont Decomposition
// ============================================================================

export const roiDecomposition = {
  id: "ch24-roi-dupont",
  title: "ROI & DuPont Decomposition",
  chapter: 24,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Compute return on investment and decompose it into operating margin and asset turnover (the DuPont identity).",
  reviewChapters: CH24_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const revenue = roundToNearest(randomInRange(2000000, 6000000), 50000);
    const operatingMarginPct = randomInRange(8, 18, 1) / 100;
    const operatingIncome = Math.round(revenue * operatingMarginPct);

    // Investment base 60%-130% of revenue
    const turnoverRatio = roundTo(randomInRange(75, 150, 5) / 100, 2);
    const invested = roundToNearest(revenue / turnoverRatio, 50000);

    return {
      company,
      product,
      revenue,
      operatingIncome,
      operatingMarginPct,
      invested,
      turnoverRatio,
    };
  },

  scenario: (data) => `
    <p>${data.company.name}'s ${data.product.singular} division reported
    <strong>$${data.revenue.toLocaleString()}</strong> in revenue and
    <strong>$${data.operatingIncome.toLocaleString()}</strong> in operating
    income for the year. The division's invested capital (operating assets) is
    <strong>$${data.invested.toLocaleString()}</strong>.</p>
  `,

  given: (data) => [
    { label: "Revenue", value: `$${data.revenue.toLocaleString()}` },
    {
      label: "Operating income",
      value: `$${data.operatingIncome.toLocaleString()}`,
    },
    { label: "Invested capital", value: `$${data.invested.toLocaleString()}` },
  ],

  steps: [
    {
      id: "roi",
      question:
        "What is the division's ROI? (Enter as a percent, e.g., 12.5 for 12.5%.)",
      resultType: "percent",
      unit: "%",
      solve: (data) => roundTo((data.operatingIncome / data.invested) * 100, 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Return on Investment",
          formula: "Operating Income ÷ Invested Capital",
          values: `$${data.operatingIncome.toLocaleString()} ÷ $${data.invested.toLocaleString()}`,
          result: `${correctValue}%`,
          highlight: true,
          note: "ROI is the single most-cited divisional performance metric — captures both profitability and asset efficiency in one ratio.",
        },
      ],
    },
    {
      id: "operating-margin",
      question:
        "What is the operating margin (operating income as a percentage of revenue)?",
      resultType: "percent",
      unit: "%",
      solve: (data) => roundTo((data.operatingIncome / data.revenue) * 100, 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Operating Margin",
          formula: "Operating Income ÷ Revenue",
          values: `$${data.operatingIncome.toLocaleString()} ÷ $${data.revenue.toLocaleString()}`,
          result: `${correctValue}%`,
          highlight: true,
        },
      ],
    },
    {
      id: "asset-turnover",
      question:
        "What is the asset turnover ratio (revenue per dollar of invested capital)?",
      resultType: "money-small",
      unit: "times",
      tolerance: { value: 0.02, type: "absolute" },
      solve: (data) => roundTo(data.revenue / data.invested, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Asset Turnover",
          formula: "Revenue ÷ Invested Capital",
          values: `$${data.revenue.toLocaleString()} ÷ $${data.invested.toLocaleString()}`,
          result: `${correctValue} times`,
          highlight: true,
          note: "Asset turnover measures how efficiently the division converts capital into revenue. Higher = more efficient.",
        },
      ],
    },
    {
      id: "dupont-verification",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Why does Operating Margin × Asset Turnover equal ROI? (The DuPont identity.)",
      options: [
        {
          id: "cancellation",
          label:
            "(OI ÷ Revenue) × (Revenue ÷ Invested) — revenue cancels, leaving OI ÷ Invested = ROI",
        },
        {
          id: "accounting-rule",
          label: "GAAP requires the two components to multiply to ROI",
        },
        {
          id: "industry-standard",
          label:
            "Industry convention sets ROI as a product of these two ratios",
        },
        {
          id: "coincidence",
          label:
            "The two ratios happen to multiply to ROI in this case but not generally",
        },
      ],
      correctId: () => "cancellation",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "DuPont Identity",
          formula:
            "(OI ÷ Revenue) × (Revenue ÷ Invested) = OI ÷ Invested = ROI",
          values: `${prior["operating-margin"]}% × ${prior["asset-turnover"]} = ${prior["roi"]}%`,
          result: "Revenue cancels algebraically",
          highlight: true,
          note: "Decomposing ROI into margin and turnover lets managers diagnose WHY ROI moved — pricing/cost issue (margin) or asset utilization issue (turnover).",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Residual Income vs ROI Conflict
// ============================================================================

export const residualIncomeVsRoi = {
  id: "ch24-ri-vs-roi",
  title: "Residual Income vs ROI",
  chapter: 24,
  difficulty: "intermediate",
  estimatedMinutes: 8,
  description:
    "Compute residual income and explore why ROI and RI can give opposite signals on new investments.",
  reviewChapters: CH24_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    const currentInvested = roundToNearest(
      randomInRange(2000000, 5000000),
      100000,
    );
    const currentRoi = randomInRange(16, 25, 1) / 100; // High-performing division
    const currentOI = Math.round(currentInvested * currentRoi);

    const requiredRate = randomInRange(10, 14, 1) / 100;

    // New project: lower ROI than current, but above required rate
    const projectInvestment = roundToNearest(
      randomInRange(400000, 1200000),
      50000,
    );
    const projectRoi = roundTo(
      requiredRate +
        ((currentRoi - requiredRate) * randomInRange(20, 50, 5)) / 100,
      3,
    );
    const projectOI = Math.round(projectInvestment * projectRoi);

    return {
      company,
      currentInvested,
      currentRoi,
      currentOI,
      requiredRate,
      projectInvestment,
      projectRoi,
      projectOI,
    };
  },

  scenario: (data) => `
    <p>${data.company.name}'s division currently earns
    <strong>$${data.currentOI.toLocaleString()}</strong> on invested capital of
    <strong>$${data.currentInvested.toLocaleString()}</strong>. The company's
    required rate of return for the division is
    <strong>${(data.requiredRate * 100).toFixed(0)}%</strong>.</p>
    <p>The division manager is evaluating a new project that would require
    <strong>$${data.projectInvestment.toLocaleString()}</strong> of additional
    investment and generate <strong>$${data.projectOI.toLocaleString()}</strong>
    in additional operating income annually.</p>
  `,

  given: (data) => [
    {
      label: "Current invested capital",
      value: `$${data.currentInvested.toLocaleString()}`,
    },
    {
      label: "Current operating income",
      value: `$${data.currentOI.toLocaleString()}`,
    },
    {
      label: "Required rate of return",
      value: `${(data.requiredRate * 100).toFixed(0)}%`,
    },
    {
      label: "Project investment",
      value: `$${data.projectInvestment.toLocaleString()}`,
    },
    {
      label: "Project operating income",
      value: `$${data.projectOI.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "current-ri",
      question: "What is the division's current residual income?",
      resultType: "money-large",
      unit: "$",
      solve: (data) =>
        Math.round(data.currentOI - data.currentInvested * data.requiredRate),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Residual Income",
          formula: "Operating Income − (Invested Capital × Required Rate)",
          values: `$${data.currentOI.toLocaleString()} − ($${data.currentInvested.toLocaleString()} × ${(data.requiredRate * 100).toFixed(0)}%)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "RI is the dollar amount of profit above the minimum required return — a value-creation metric.",
        },
      ],
    },
    {
      id: "project-ri",
      question:
        "What is the residual income generated by the new project (on its own)?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round(data.projectOI - data.projectInvestment * data.requiredRate),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Project Residual Income",
          formula: "Project OI − (Project Investment × Required Rate)",
          values: `$${data.projectOI.toLocaleString()} − ($${data.projectInvestment.toLocaleString()} × ${(data.requiredRate * 100).toFixed(0)}%)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "roi-after-project",
      question: "What would the division's ROI be AFTER accepting the project?",
      resultType: "percent",
      unit: "%",
      tolerance: { value: 0.5, type: "absolute" },
      solve: (data) => {
        const totalOI = data.currentOI + data.projectOI;
        const totalInvested = data.currentInvested + data.projectInvestment;
        return roundTo((totalOI / totalInvested) * 100, 1);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const totalOI = data.currentOI + data.projectOI;
        const totalInvested = data.currentInvested + data.projectInvestment;
        return [
          {
            label: "Total OI After Project",
            values: `$${data.currentOI.toLocaleString()} + $${data.projectOI.toLocaleString()}`,
            result: `$${totalOI.toLocaleString()}`,
          },
          {
            label: "Total Invested After Project",
            values: `$${data.currentInvested.toLocaleString()} + $${data.projectInvestment.toLocaleString()}`,
            result: `$${totalInvested.toLocaleString()}`,
          },
          {
            label: "New ROI",
            formula: "Total OI ÷ Total Invested",
            values: `$${totalOI.toLocaleString()} ÷ $${totalInvested.toLocaleString()}`,
            result: `${correctValue}%`,
            highlight: true,
            note: `Compare to current ROI of ${(data.currentRoi * 100).toFixed(1)}%. The new project has a ROI of ${(data.projectRoi * 100).toFixed(1)}%, so the division's average ROI DROPS.`,
          },
        ];
      },
    },
    {
      id: "roi-trap",
      type: "choice",
      question:
        "If the manager is evaluated on ROI alone, would they accept this project?",
      options: [
        {
          id: "reject-dilutes-roi",
          label:
            "No — the project dilutes the division's ROI even though it earns more than the required rate",
        },
        {
          id: "accept-positive-ri",
          label: "Yes — the project has positive residual income",
        },
        {
          id: "reject-too-small",
          label: "No — the project is too small to matter",
        },
        {
          id: "accept-high-roi",
          label:
            "Yes — any project with positive ROI improves division performance",
        },
      ],
      correctId: () => "reject-dilutes-roi",
      intentionalSingleAnswer: true,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "The ROI Trap",
          formula:
            "Project ROI < Division ROI → manager rejects despite positive RI",
          values: `Project ${(data.projectRoi * 100).toFixed(1)}% < Division ${(data.currentRoi * 100).toFixed(1)}%`,
          result: "Manager rejects — goal-congruence failure",
          highlight: true,
          note: "This is the classic conflict: ROI-based evaluation discourages divisions from accepting any project below their current average, even when those projects exceed the company's required rate and create shareholder value.",
        },
      ],
    },
    {
      id: "ri-resolves-conflict",
      type: "choice",
      question:
        "If the manager is evaluated on RI instead of ROI, would they accept the project?",
      options: [
        {
          id: "accept-positive-ri",
          label:
            "Yes — the project has positive residual income, so it increases the division's RI",
        },
        {
          id: "reject-low-roi",
          label: "No — the project lowers the division's ROI",
        },
        {
          id: "depends-on-size",
          label:
            "It depends on the size of the investment relative to current operations",
        },
        {
          id: "indifferent",
          label: "The manager would be indifferent between the two metrics",
        },
      ],
      correctId: () => "accept-positive-ri",
      intentionalSingleAnswer: true,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "RI Aligns Incentives",
          formula: "RI > 0 ⟹ project earns above required rate ⟹ creates value",
          values: `Project RI = $${prior["project-ri"].toLocaleString()} > 0`,
          result:
            "Accept — RI metric encourages value-creating projects regardless of current ROI",
          highlight: true,
          note: "This is why most academic and practitioner literature prefers RI over ROI for capital-budgeting incentives — it doesn't penalize divisions for accepting positive-NPV projects.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — EVA: Economic Value Added
// ============================================================================

export const evaCalculation = {
  id: "ch24-eva",
  title: "Economic Value Added (EVA)",
  chapter: 24,
  difficulty: "intermediate",
  estimatedMinutes: 7,
  description:
    "Calculate EVA using NOPAT and WACC — the cash-based, tax-adjusted version of residual income.",
  reviewChapters: CH24_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    const operatingIncome = roundToNearest(
      randomInRange(800000, 2500000),
      25000,
    );
    const taxRate = randomInRange(20, 30, 1) / 100;
    const nopat = Math.round(operatingIncome * (1 - taxRate));

    const totalCapital = roundToNearest(
      randomInRange(4000000, 12000000),
      100000,
    );
    const wacc = randomInRange(8, 12, 1) / 100;

    return { company, operatingIncome, taxRate, nopat, totalCapital, wacc };
  },

  scenario: (data) => `
    <p>${data.company.name}'s board has asked for an EVA calculation for the
    division. The division generated <strong>$${data.operatingIncome.toLocaleString()}</strong>
    in pretax operating income on <strong>$${data.totalCapital.toLocaleString()}</strong>
    of total capital. The company's tax rate is
    <strong>${(data.taxRate * 100).toFixed(0)}%</strong> and its weighted-average
    cost of capital (WACC) is <strong>${(data.wacc * 100).toFixed(0)}%</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Pretax operating income",
      value: `$${data.operatingIncome.toLocaleString()}`,
    },
    { label: "Total capital", value: `$${data.totalCapital.toLocaleString()}` },
    { label: "Tax rate", value: `${(data.taxRate * 100).toFixed(0)}%` },
    { label: "WACC", value: `${(data.wacc * 100).toFixed(0)}%` },
  ],

  steps: [
    {
      id: "nopat",
      question: "What is NOPAT (Net Operating Profit After Tax)?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => Math.round(data.operatingIncome * (1 - data.taxRate)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "NOPAT",
          formula: "Operating Income × (1 − Tax Rate)",
          values: `$${data.operatingIncome.toLocaleString()} × (1 − ${data.taxRate.toFixed(2)})`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "NOPAT is what operations would earn for shareholders if the firm had no debt — a clean operating-income measure.",
        },
      ],
    },
    {
      id: "capital-charge",
      question:
        "What is the capital charge (the dollar cost of the capital employed)?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => Math.round(data.totalCapital * data.wacc),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Capital Charge",
          formula: "Total Capital × WACC",
          values: `$${data.totalCapital.toLocaleString()} × ${(data.wacc * 100).toFixed(0)}%`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "This is the minimum dollar return investors require for tying up this much capital.",
        },
      ],
    },
    {
      id: "eva",
      question: "What is the EVA (Economic Value Added)?",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data, prior) => prior["nopat"] - prior["capital-charge"],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "EVA",
          formula: "NOPAT − Capital Charge",
          values: `$${prior["nopat"].toLocaleString()} − $${prior["capital-charge"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation:
            carryForwardNote("nopat", "1", prior, studentAnswers) ||
            carryForwardNote("capital-charge", "2", prior, studentAnswers),
          note: "Positive EVA means the division is creating economic value above its cost of capital. Negative EVA means it would be better to return the capital to shareholders.",
        },
      ],
    },
    {
      id: "eva-interpretation",
      type: "choice",
      question:
        "Based on the EVA result, what is happening to shareholder value?",
      options: [
        {
          id: "creating-value",
          label:
            "Value is being created — EVA is positive, division earns above cost of capital",
        },
        {
          id: "destroying-value",
          label:
            "Value is being destroyed — EVA is negative, division earns below cost of capital",
        },
        {
          id: "breakeven",
          label: "Neither created nor destroyed — EVA is approximately zero",
        },
        {
          id: "cannot-tell",
          label: "EVA does not measure shareholder value creation",
        },
      ],
      correctId: (data, prior) => {
        const eva = prior["eva"];
        if (Math.abs(eva) < 5000) return "breakeven";
        return eva > 0 ? "creating-value" : "destroying-value";
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "EVA Decision Rule",
          formula: "EVA > 0 → value created; EVA < 0 → value destroyed",
          values: `EVA = $${prior["eva"].toLocaleString()}`,
          result:
            correctId === "creating-value"
              ? "Creating value"
              : correctId === "destroying-value"
                ? "Destroying value"
                : "Approximately at breakeven",
          highlight: true,
          note: "EVA is widely used in compensation systems because it directly aligns manager incentives with shareholder value creation.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — Investment Center Decision
// ============================================================================

export const investmentCenterDecision = {
  id: "ch24-investment-decision",
  title: "Investment Center Decision",
  chapter: 24,
  difficulty: "advanced",
  estimatedMinutes: 8,
  description:
    "A high-performing manager is offered a new project. Compute the metrics and identify which evaluation system creates the right incentive.",
  reviewChapters: CH24_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    const currentOI = roundToNearest(randomInRange(500000, 1500000), 25000);
    const currentInvested = roundToNearest(
      randomInRange(2500000, 6000000),
      100000,
    );
    const requiredRate = randomInRange(10, 14, 1) / 100;

    const projectInvestment = roundToNearest(
      randomInRange(500000, 1500000),
      50000,
    );

    // Project earns above required rate but below current ROI
    const currentRoi = currentOI / currentInvested;
    const projectRoiTarget = roundTo(
      requiredRate +
        ((currentRoi - requiredRate) * randomInRange(25, 60, 5)) / 100,
      3,
    );
    const projectOI = Math.round(projectInvestment * projectRoiTarget);

    return {
      company,
      currentOI,
      currentInvested,
      currentRoi,
      requiredRate,
      projectInvestment,
      projectOI,
      projectRoiTarget,
    };
  },

  scenario: (data) => `
    <p>${data.company.name}'s division manager currently runs a profitable
    operation: <strong>$${data.currentOI.toLocaleString()}</strong> in operating
    income on <strong>$${data.currentInvested.toLocaleString()}</strong> of
    invested capital. The company's required rate of return is
    <strong>${(data.requiredRate * 100).toFixed(0)}%</strong>.</p>
    <p>Corporate has identified a new project that would add
    <strong>$${data.projectInvestment.toLocaleString()}</strong> of investment and
    <strong>$${data.projectOI.toLocaleString()}</strong> of operating income to the
    division. The manager will be evaluated next year on one of two metrics —
    ROI or RI — and bonus is tied to whichever metric is selected.</p>
  `,

  given: (data) => [
    { label: "Current OI", value: `$${data.currentOI.toLocaleString()}` },
    {
      label: "Current invested",
      value: `$${data.currentInvested.toLocaleString()}`,
    },
    {
      label: "Required rate",
      value: `${(data.requiredRate * 100).toFixed(0)}%`,
    },
    {
      label: "Project investment",
      value: `$${data.projectInvestment.toLocaleString()}`,
    },
    { label: "Project OI", value: `$${data.projectOI.toLocaleString()}` },
  ],

  steps: [
    {
      id: "project-roi",
      question: "What is the standalone ROI of the new project?",
      resultType: "percent",
      unit: "%",
      solve: (data) =>
        roundTo((data.projectOI / data.projectInvestment) * 100, 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Project ROI",
          formula: "Project OI ÷ Project Investment",
          values: `$${data.projectOI.toLocaleString()} ÷ $${data.projectInvestment.toLocaleString()}`,
          result: `${correctValue}%`,
          highlight: true,
        },
      ],
    },
    {
      id: "project-ri",
      question: "What is the standalone RI of the new project?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round(data.projectOI - data.projectInvestment * data.requiredRate),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Project Residual Income",
          formula: "Project OI − (Project Investment × Required Rate)",
          values: `$${data.projectOI.toLocaleString()} − ($${data.projectInvestment.toLocaleString()} × ${(data.requiredRate * 100).toFixed(0)}%)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "A project with positive RI creates value for shareholders, regardless of whether it improves divisional averages.",
        },
      ],
    },
    {
      id: "roi-incentive",
      type: "choice",
      question:
        "Under ROI-based evaluation, what action would the manager take?",
      options: [
        {
          id: "reject-dilutes",
          label: "Reject the project — it dilutes the division's current ROI",
        },
        {
          id: "accept-positive-roi",
          label: "Accept the project — it has positive ROI",
        },
        {
          id: "accept-above-required",
          label: "Accept the project — it exceeds the required rate",
        },
        {
          id: "cannot-decide",
          label: "Cannot decide without seeing other available projects",
        },
      ],
      correctId: () => "reject-dilutes",
      intentionalSingleAnswer: true,
      showWork: (data, prior, studentAnswers, correctId) => {
        const currentRoiPct = roundTo(data.currentRoi * 100, 1);
        return [
          {
            label: "ROI Comparison",
            formula: "Project ROI vs Current Division ROI",
            values: `${prior["project-roi"]}% < ${currentRoiPct}%`,
            result: "Project lowers the division average → manager rejects",
            highlight: true,
            note: "Even though the project earns above the required rate (and would create shareholder value), ROI-based bonus structure punishes the manager for taking it.",
          },
        ];
      },
    },
    {
      id: "ri-incentive",
      type: "choice",
      question:
        "Under RI-based evaluation, what action would the manager take?",
      options: [
        {
          id: "accept-positive-ri",
          label:
            "Accept the project — positive RI means it increases division RI",
        },
        {
          id: "reject-low-roi",
          label:
            "Reject the project — its ROI is below the division's current ROI",
        },
        {
          id: "accept-only-if-large",
          label:
            "Accept only if the project investment is large enough to dominate the RI calculation",
        },
        {
          id: "reject-corporate-conflict",
          label:
            "Reject the project because it was identified by corporate, not the division",
        },
      ],
      correctId: () => "accept-positive-ri",
      intentionalSingleAnswer: true,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "RI Alignment",
          formula: "RI > 0 ⟹ value-creating ⟹ accept",
          values: `Project RI = $${prior["project-ri"].toLocaleString()} > 0`,
          result: "Manager accepts — incentives align with shareholder value",
          highlight: true,
          note: "This is the textbook case for why RI is preferred over ROI in many performance-measurement systems. It eliminates the disincentive to accept positive-NPV projects.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Compensation Linkage & Controllability
// ============================================================================

export const compensationLinkage = {
  id: "ch24-compensation",
  title: "Compensation Design & Controllability",
  chapter: 24,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Apply the controllability principle to compensation design and identify which performance measure best matches a managerial role.",
  reviewChapters: CH24_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    // Three role scenarios, randomized
    const roles = [
      {
        title: "Plant Manager",
        responsibilities:
          "production scheduling, quality, factory labor and overhead",
        canControl: "production efficiency, scrap rates, machine uptime",
        cannotControl:
          "product selling prices, marketing campaigns, corporate financing decisions",
        bestMeasure: "cost-center",
      },
      {
        title: "Regional Sales Manager",
        responsibilities:
          "sales staff in 12 markets, regional advertising budget, customer relationships",
        canControl:
          "sales volume, customer mix, regional pricing within company guidelines",
        cannotControl:
          "manufacturing costs, corporate brand strategy, inventory investment levels",
        bestMeasure: "revenue-center",
      },
      {
        title: "Product Line VP",
        responsibilities:
          "pricing, marketing, manufacturing, and inventory for one full product line",
        canControl:
          "pricing, product mix, marketing spend, working capital management",
        cannotControl: "corporate-level capital allocation decisions",
        bestMeasure: "profit-center",
      },
      {
        title: "Division President",
        responsibilities:
          "all aspects of a self-contained business unit including investment decisions",
        canControl:
          "pricing, costs, working capital, and major capital investments within division",
        cannotControl: "parent-company financing, tax structure",
        bestMeasure: "investment-center",
      },
    ];

    const role = roles[Math.floor(Math.random() * roles.length)];

    return { company, role };
  },

  scenario: (data) => `
    <p>${data.company.name} is designing the performance-measurement system for
    a <strong>${data.role.title}</strong>. This manager is responsible for
    ${data.role.responsibilities}.</p>
    <p>They can directly control: ${data.role.canControl}.<br>
    They cannot control: ${data.role.cannotControl}.</p>
  `,

  given: (data) => [
    { label: "Role", value: data.role.title },
    { label: "Responsibilities", value: data.role.responsibilities },
    { label: "Within control", value: data.role.canControl },
    { label: "Outside control", value: data.role.cannotControl },
  ],

  steps: [
    {
      id: "responsibility-center",
      type: "choice",
      question:
        "What type of responsibility center best matches this manager's scope?",
      options: [
        {
          id: "cost-center",
          label: "Cost center — accountable only for costs incurred",
        },
        {
          id: "revenue-center",
          label: "Revenue center — accountable for revenue generation",
        },
        {
          id: "profit-center",
          label: "Profit center — accountable for both revenue and cost",
        },
        {
          id: "investment-center",
          label:
            "Investment center — accountable for revenue, cost, and capital invested",
        },
      ],
      correctId: (data) => data.role.bestMeasure,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Responsibility Center Match",
          formula:
            "Controllability principle: hold manager accountable only for what they can control",
          values: `Role: ${data.role.title}`,
          result:
            correctId === "cost-center"
              ? "Cost center"
              : correctId === "revenue-center"
                ? "Revenue center"
                : correctId === "profit-center"
                  ? "Profit center"
                  : "Investment center",
          highlight: true,
          note: "Mismatched responsibility centers are a common source of dysfunctional behavior — e.g., evaluating a plant manager on ROI penalizes them for capital allocation decisions made by corporate.",
        },
      ],
    },
    {
      id: "controllability-principle",
      type: "choice",
      question: "What is the controllability principle in compensation design?",
      options: [
        {
          id: "control-what-you-control",
          label:
            "Hold managers accountable only for performance dimensions they can directly influence",
        },
        {
          id: "hold-them-to-everything",
          label:
            "Hold managers accountable for everything that affects firm performance, controllable or not",
        },
        {
          id: "use-eva-always",
          label:
            "Always use EVA — it captures the right behaviors regardless of role",
        },
        {
          id: "separate-fixed-variable",
          label: "Separate fixed and variable costs in the manager's P&L",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "control-what-you-control",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Controllability Principle",
          formula:
            "Bonuses should reward decisions manager made, not luck or external factors",
          values:
            "Managers cannot improve metrics they don't control — incentive becomes ineffective",
          result:
            "Hold managers accountable only for what they can directly influence",
          highlight: true,
          note: "Real-world compensation often violates this — division managers get hit for raw material prices set globally, plant managers for product mix decided by marketing — but the principle is the design ideal.",
        },
      ],
    },
    {
      id: "subjective-evaluation",
      type: "choice",
      question:
        "When might purely formula-based bonuses (e.g., 100% based on ROI) be problematic, even with the right responsibility center?",
      options: [
        {
          id: "gaming-myopia",
          label:
            'Managers may "game" the metric or focus only on short-term improvements that hurt long-term value',
        },
        {
          id: "always-best",
          label:
            "Formula-based bonuses are always optimal — they remove subjectivity",
        },
        { id: "too-expensive", label: "They are too expensive to administer" },
        {
          id: "illegal-in-some-states",
          label: "They violate employment law in some jurisdictions",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "gaming-myopia",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Formula-Based Pay Failure Modes",
          formula: "Single metric ≠ full performance",
          values:
            "ROI-only → reject value-creating projects. Revenue-only → cut prices to hit target. Profit-only → defer R&D.",
          result:
            "Subjective judgment + balanced scorecard mitigates these gaming behaviors",
          highlight: true,
          note: "This is why most modern executive compensation includes multiple metrics (financial + nonfinancial), peer-group comparisons, and a discretionary component judged by the compensation committee.",
        },
      ],
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const ch24Problems = [
  roiDecomposition,
  residualIncomeVsRoi,
  evaCalculation,
  investmentCenterDecision,
  compensationLinkage,
];
