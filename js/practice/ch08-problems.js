// js/practice/ch08-problems.js
// Chapter 8 — Flexible Budgets, Overhead Cost Variances, and Management Control
// Pass 2 problems — pairs numeric overhead variance calculations with
// choice steps for favorable/unfavorable interpretation. Companion to Ch. 7.
//
// Conforms to js/practice/SPEC.md (Pass 2).
// Five problems:
//   1. Variable Overhead Variances (spending + efficiency)
//   2. Fixed Overhead Variances (spending + production volume)
//   3. Four-Variance Analysis (combined VOH + FOH)
//   4. Overhead Rate Development (4-step normal costing)
//   5. Volume Variance Investigation (capacity utilization)

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH08_REVIEW = [
  {
    label: "Ch. 8 — Flexible Budgets and Overhead Variances",
    href: `${BASE}pages/learn/ch08.html`,
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
  formatter = (v) => `$${v}`,
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
// Problem 1 — Variable Overhead Variances
// ============================================================================

export const variableOHVariances = {
  id: "ch08-voh-variances",
  title: "Variable Overhead Variances",
  chapter: 8,
  difficulty: "foundation",
  estimatedMinutes: 7,
  description:
    "Compute variable overhead spending and efficiency variances, then mark each as favorable or unfavorable.",
  reviewChapters: CH08_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const standardRate = randomInRange(8, 20, 1);
    const rateDeltaPct = randomInRange(-15, 15, 1);
    const actualRate = roundTo(
      Math.max(1, standardRate * (1 + rateDeltaPct / 100)),
      2,
    );
    const safeActualRate =
      Math.abs(actualRate - standardRate) < 0.5
        ? standardRate + (rateDeltaPct >= 0 ? 1 : -1)
        : actualRate;

    const standardHrsPerUnit = randomInRange(2, 5, 1);
    const actualUnits = roundToNearest(randomInRange(1000, 4000), 100);
    const standardHrs = standardHrsPerUnit * actualUnits;

    const hrsDeltaPct = randomInRange(-10, 10, 1);
    const minHrsDelta = Math.ceil(standardHrs * 0.04);
    let actualHrs = Math.round(standardHrs * (1 + hrsDeltaPct / 100));
    if (Math.abs(actualHrs - standardHrs) < minHrsDelta) {
      actualHrs = standardHrs + (hrsDeltaPct >= 0 ? minHrsDelta : -minHrsDelta);
    }

    return {
      company,
      product,
      standardRate,
      actualRate: safeActualRate,
      standardHrsPerUnit,
      actualUnits,
      standardHrs,
      actualHrs,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} applies variable overhead based on machine-hours. The
    standard rate is <strong>$${data.standardRate} per machine-hour</strong>, and
    each ${data.product.singular} requires <strong>${data.standardHrsPerUnit} machine-hours</strong>.
    During the period the company produced
    <strong>${data.actualUnits.toLocaleString()} ${data.product.plural}</strong>,
    used <strong>${data.actualHrs.toLocaleString()} actual machine-hours</strong>,
    and incurred variable overhead at an actual rate of
    <strong>$${data.actualRate} per machine-hour</strong>.</p>
  `,

  given: (data) => [
    { label: "Standard VOH rate", value: `$${data.standardRate} per MH` },
    { label: "Actual VOH rate", value: `$${data.actualRate} per MH` },
    { label: "Standard MH per unit", value: `${data.standardHrsPerUnit} MH` },
    {
      label: "Actual units produced",
      value: `${data.actualUnits.toLocaleString()}`,
    },
    {
      label: "Standard MH allowed",
      value: `${data.standardHrs.toLocaleString()} MH`,
    },
    { label: "Actual MH used", value: `${data.actualHrs.toLocaleString()} MH` },
  ],

  steps: [
    {
      id: "voh-spending-amount",
      question:
        "What is the magnitude of the variable overhead spending variance? (Enter as a positive number.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round(
          Math.abs((data.actualRate - data.standardRate) * data.actualHrs),
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "VOH Spending Variance",
          formula: "(Actual Rate − Standard Rate) × Actual Hours",
          values: `($${data.actualRate} − $${data.standardRate}) × ${data.actualHrs.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "The spending variance isolates the impact of paying more or less than standard per hour of input actually used.",
        },
      ],
    },
    {
      id: "voh-spending-direction",
      type: "choice",
      question: "Is the VOH spending variance favorable or unfavorable?",
      options: [
        { id: "favorable", label: "Favorable — actual rate is below standard" },
        {
          id: "unfavorable",
          label: "Unfavorable — actual rate is above standard",
        },
      ],
      correctId: (data) =>
        data.actualRate < data.standardRate ? "favorable" : "unfavorable",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Direction",
          formula: "Compare Actual Rate to Standard Rate",
          values: `$${data.actualRate} ${data.actualRate < data.standardRate ? "<" : ">"} $${data.standardRate}`,
          result: correctId === "favorable" ? "Favorable" : "Unfavorable",
          highlight: true,
          note: "For VOH spending, paying less than standard per hour is favorable.",
        },
      ],
    },
    {
      id: "voh-efficiency-amount",
      question:
        "What is the magnitude of the variable overhead efficiency variance? (Enter as a positive number.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round(
          Math.abs((data.actualHrs - data.standardHrs) * data.standardRate),
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "VOH Efficiency Variance",
          formula: "(Actual Hours − Standard Hours) × Standard Rate",
          values: `(${data.actualHrs.toLocaleString()} − ${data.standardHrs.toLocaleString()}) × $${data.standardRate}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "The VOH efficiency variance reflects efficiency in using the cost driver (machine-hours), NOT efficiency in spending overhead dollars.",
        },
      ],
    },
    {
      id: "voh-efficiency-direction",
      type: "choice",
      question: "Is the VOH efficiency variance favorable or unfavorable?",
      options: [
        {
          id: "favorable",
          label: "Favorable — used fewer machine-hours than standard",
        },
        {
          id: "unfavorable",
          label: "Unfavorable — used more machine-hours than standard",
        },
      ],
      correctId: (data) =>
        data.actualHrs < data.standardHrs ? "favorable" : "unfavorable",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Direction",
          formula: "Compare Actual Hours to Standard Hours",
          values: `${data.actualHrs.toLocaleString()} ${data.actualHrs < data.standardHrs ? "<" : ">"} ${data.standardHrs.toLocaleString()}`,
          result: correctId === "favorable" ? "Favorable" : "Unfavorable",
          highlight: true,
        },
      ],
    },
    {
      id: "total-voh-variance",
      question:
        "What is the total VOH flexible-budget variance? (Sum the two variances using their signs — unfavorable adds, favorable subtracts.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => {
        const spending = (data.actualRate - data.standardRate) * data.actualHrs;
        const efficiency =
          (data.actualHrs - data.standardHrs) * data.standardRate;
        return Math.round(Math.abs(spending + efficiency));
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const spending = (data.actualRate - data.standardRate) * data.actualHrs;
        const efficiency =
          (data.actualHrs - data.standardHrs) * data.standardRate;
        const total = spending + efficiency;
        return [
          {
            label: "Spending (signed)",
            values: `${spending >= 0 ? "+" : "−"}$${Math.abs(Math.round(spending)).toLocaleString()} ${spending >= 0 ? "(U)" : "(F)"}`,
            result: "",
          },
          {
            label: "Efficiency (signed)",
            values: `${efficiency >= 0 ? "+" : "−"}$${Math.abs(Math.round(efficiency)).toLocaleString()} ${efficiency >= 0 ? "(U)" : "(F)"}`,
            result: "",
          },
          {
            label: "Total VOH Variance",
            formula: "Spending + Efficiency (signed sum)",
            values: `${total >= 0 ? "Net unfavorable" : "Net favorable"}: $${Math.abs(Math.round(total)).toLocaleString()}`,
            result: `$${correctValue.toLocaleString()} ${total >= 0 ? "(U)" : "(F)"}`,
            highlight: true,
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Problem 2 — Fixed Overhead Variances
// ============================================================================

export const fixedOHVariances = {
  id: "ch08-foh-variances",
  title: "Fixed Overhead Variances",
  chapter: 8,
  difficulty: "intermediate",
  estimatedMinutes: 8,
  description:
    "Compute fixed overhead spending and production-volume variances. The volume variance is the conceptually trickiest in the chapter.",
  reviewChapters: CH08_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const budgetedFOH = roundToNearest(randomInRange(80000, 200000), 5000);
    const denomLevel = roundToNearest(randomInRange(8000, 16000), 500);
    const stdRate = roundTo(budgetedFOH / denomLevel, 2);

    // Actual FOH within ±10% of budget but at least 3% off
    const fohDelta = randomInRange(-10, 10, 1);
    const minFohDelta = Math.ceil(budgetedFOH * 0.03);
    let actualFOH = roundToNearest(budgetedFOH * (1 + fohDelta / 100), 500);
    if (Math.abs(actualFOH - budgetedFOH) < minFohDelta) {
      actualFOH = budgetedFOH + (fohDelta >= 0 ? minFohDelta : -minFohDelta);
    }

    // Standard hours allowed for actual output (different from denom level)
    const outputDelta = randomInRange(-15, 15, 1);
    const minOutputDelta = Math.ceil(denomLevel * 0.05);
    let stdHrsAllowed = roundToNearest(
      denomLevel * (1 + outputDelta / 100),
      100,
    );
    if (Math.abs(stdHrsAllowed - denomLevel) < minOutputDelta) {
      stdHrsAllowed =
        denomLevel + (outputDelta >= 0 ? minOutputDelta : -minOutputDelta);
    }

    return {
      company,
      product,
      budgetedFOH,
      denomLevel,
      stdRate,
      actualFOH,
      stdHrsAllowed,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} budgeted <strong>$${data.budgetedFOH.toLocaleString()}</strong>
    of fixed manufacturing overhead based on a denominator activity level of
    <strong>${data.denomLevel.toLocaleString()} machine-hours</strong>. During the period the
    company actually incurred <strong>$${data.actualFOH.toLocaleString()}</strong> of fixed
    overhead while producing output that the standards allow
    <strong>${data.stdHrsAllowed.toLocaleString()} machine-hours</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Budgeted (lump-sum) FOH",
      value: `$${data.budgetedFOH.toLocaleString()}`,
    },
    {
      label: "Denominator activity level",
      value: `${data.denomLevel.toLocaleString()} MH`,
    },
    { label: "Standard FOH rate", value: `$${data.stdRate} per MH` },
    {
      label: "Actual FOH incurred",
      value: `$${data.actualFOH.toLocaleString()}`,
    },
    {
      label: "Standard MH allowed for output",
      value: `${data.stdHrsAllowed.toLocaleString()} MH`,
    },
  ],

  steps: [
    {
      id: "foh-spending-amount",
      question:
        "What is the magnitude of the fixed overhead spending variance? (Enter as a positive number.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.abs(data.actualFOH - data.budgetedFOH),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "FOH Spending Variance",
          formula: "Actual FOH − Budgeted FOH (lump sum)",
          values: `$${data.actualFOH.toLocaleString()} − $${data.budgetedFOH.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "FOH has no efficiency variance — fixed costs do not vary with the cost driver.",
        },
      ],
    },
    {
      id: "foh-spending-direction",
      type: "choice",
      question: "Is the FOH spending variance favorable or unfavorable?",
      options: [
        { id: "favorable", label: "Favorable — actual FOH below budget" },
        { id: "unfavorable", label: "Unfavorable — actual FOH above budget" },
      ],
      correctId: (data) =>
        data.actualFOH < data.budgetedFOH ? "favorable" : "unfavorable",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Direction",
          formula: "Compare Actual to Budgeted",
          values: `$${data.actualFOH.toLocaleString()} ${data.actualFOH < data.budgetedFOH ? "<" : ">"} $${data.budgetedFOH.toLocaleString()}`,
          result: correctId === "favorable" ? "Favorable" : "Unfavorable",
          highlight: true,
        },
      ],
    },
    {
      id: "foh-applied",
      question:
        "What is the fixed overhead applied to production (using the standard rate and standard hours allowed)?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.stdRate * data.stdHrsAllowed),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "FOH Applied",
          formula: "Standard Rate × Standard Hours Allowed",
          values: `$${data.stdRate} × ${data.stdHrsAllowed.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "This is the amount inventoried for fixed overhead — not the cash spent.",
        },
      ],
    },
    {
      id: "foh-volume-amount",
      question:
        "What is the magnitude of the production-volume variance? (Enter as a positive number.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) => Math.abs(data.budgetedFOH - prior["foh-applied"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Production-Volume Variance",
          formula: "Budgeted FOH − FOH Applied",
          values: `$${data.budgetedFOH.toLocaleString()} − $${prior["foh-applied"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "foh-applied",
            "3",
            prior,
            studentAnswers,
          ),
          note: "This variance exists because absorption costing applies FOH per hour, while FOH is actually a lump sum. It measures how well the company utilized planned capacity.",
        },
      ],
    },
    {
      id: "foh-volume-direction",
      type: "choice",
      question: "Is the production-volume variance favorable or unfavorable?",
      options: [
        {
          id: "favorable",
          label:
            "Favorable — produced more than denominator level (over-absorbed)",
        },
        {
          id: "unfavorable",
          label:
            "Unfavorable — produced less than denominator level (under-absorbed)",
        },
      ],
      correctId: (data, prior) =>
        prior["foh-applied"] > data.budgetedFOH ? "favorable" : "unfavorable",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Direction",
          formula: "Compare FOH Applied to Budgeted FOH",
          values: `Applied $${prior["foh-applied"].toLocaleString()} ${prior["foh-applied"] > data.budgetedFOH ? ">" : "<"} Budgeted $${data.budgetedFOH.toLocaleString()}`,
          result: correctId === "favorable" ? "Favorable" : "Unfavorable",
          highlight: true,
          note: "Producing more than the denominator level spreads the lump-sum FOH over more output — this is the favorable direction for the volume variance, NOT the same as overall favorable performance.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Four-Variance Analysis
// ============================================================================

export const fourVarianceAnalysis = {
  id: "ch08-four-variance",
  title: "Four-Variance Overhead Analysis",
  chapter: 8,
  difficulty: "advanced",
  estimatedMinutes: 9,
  description:
    "Compute all four overhead variances (VOH spending/efficiency + FOH spending/volume) and identify the largest control issue.",
  reviewChapters: CH08_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const vohStdRate = randomInRange(6, 14, 1);
    const vohActualRate = roundTo(
      vohStdRate * (1 + randomInRange(-12, 12, 1) / 100),
      2,
    );
    const safeVohActualRate =
      Math.abs(vohActualRate - vohStdRate) < 0.5
        ? vohStdRate + (vohActualRate >= vohStdRate ? 1 : -1)
        : vohActualRate;

    const stdHrs = roundToNearest(randomInRange(6000, 14000), 100);
    const actualHrs = roundToNearest(
      stdHrs * (1 + randomInRange(-8, 8, 1) / 100),
      100,
    );
    const safeActualHrs =
      Math.abs(actualHrs - stdHrs) < 200
        ? stdHrs + (actualHrs >= stdHrs ? 300 : -300)
        : actualHrs;

    const budgetedFOH = roundToNearest(randomInRange(60000, 150000), 5000);
    const actualFOH = roundToNearest(
      budgetedFOH * (1 + randomInRange(-8, 8, 1) / 100),
      500,
    );
    const safeActualFOH =
      Math.abs(actualFOH - budgetedFOH) < budgetedFOH * 0.03
        ? budgetedFOH + (actualFOH >= budgetedFOH ? 3000 : -3000)
        : actualFOH;

    const denomLevel = stdHrs + randomInRange(-1500, 1500, 100);
    const fohStdRate = roundTo(budgetedFOH / denomLevel, 2);

    return {
      company,
      vohStdRate,
      vohActualRate: safeVohActualRate,
      stdHrs,
      actualHrs: safeActualHrs,
      budgetedFOH,
      actualFOH: safeActualFOH,
      denomLevel,
      fohStdRate,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} reported the following overhead data for the period.
    Variable overhead: standard $${data.vohStdRate}/MH, actual $${data.vohActualRate}/MH.
    Fixed overhead: $${data.budgetedFOH.toLocaleString()} budgeted, $${data.actualFOH.toLocaleString()} actual,
    based on a denominator of ${data.denomLevel.toLocaleString()} machine-hours. The standards
    allow ${data.stdHrs.toLocaleString()} machine-hours for actual output, and
    ${data.actualHrs.toLocaleString()} machine-hours were actually used.</p>
  `,

  given: (data) => [
    {
      label: "VOH std rate / actual rate",
      value: `$${data.vohStdRate} / $${data.vohActualRate} per MH`,
    },
    {
      label: "Std MH allowed / Actual MH",
      value: `${data.stdHrs.toLocaleString()} / ${data.actualHrs.toLocaleString()}`,
    },
    {
      label: "Budgeted / Actual FOH",
      value: `$${data.budgetedFOH.toLocaleString()} / $${data.actualFOH.toLocaleString()}`,
    },
    {
      label: "Denominator MH (FOH rate basis)",
      value: `${data.denomLevel.toLocaleString()} MH`,
    },
    { label: "Standard FOH rate", value: `$${data.fohStdRate} per MH` },
  ],

  steps: [
    {
      id: "voh-spending",
      question: "Magnitude of the VOH spending variance?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round(
          Math.abs((data.vohActualRate - data.vohStdRate) * data.actualHrs),
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "VOH Spending",
          formula: "(Actual Rate − Std Rate) × Actual Hours",
          values: `($${data.vohActualRate} − $${data.vohStdRate}) × ${data.actualHrs.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "voh-efficiency",
      question: "Magnitude of the VOH efficiency variance?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round(Math.abs((data.actualHrs - data.stdHrs) * data.vohStdRate)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "VOH Efficiency",
          formula: "(Actual Hours − Std Hours) × Std Rate",
          values: `(${data.actualHrs.toLocaleString()} − ${data.stdHrs.toLocaleString()}) × $${data.vohStdRate}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "foh-spending",
      question: "Magnitude of the FOH spending variance?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.abs(data.actualFOH - data.budgetedFOH),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "FOH Spending",
          formula: "Actual FOH − Budgeted FOH",
          values: `$${data.actualFOH.toLocaleString()} − $${data.budgetedFOH.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "foh-volume",
      question: "Magnitude of the production-volume variance?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.abs(data.budgetedFOH - data.fohStdRate * data.stdHrs),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Production-Volume",
          formula: "Budgeted FOH − (Std Rate × Std Hours Allowed)",
          values: `$${data.budgetedFOH.toLocaleString()} − ($${data.fohStdRate} × ${data.stdHrs.toLocaleString()})`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "largest-controllable",
      type: "choice",
      question:
        "Of the four variances, which one is NOT considered controllable in the short run for variance-investigation purposes?",
      options: [
        {
          id: "voh-spending",
          label:
            "VOH spending — paying more or less than standard for input prices",
        },
        {
          id: "voh-efficiency",
          label: "VOH efficiency — using more or less of the cost driver",
        },
        {
          id: "foh-spending",
          label: "FOH spending — actual vs. budgeted commitments",
        },
        {
          id: "foh-volume",
          label:
            "Production-volume — capacity utilization vs. denominator level",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "foh-volume",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Controllability",
          formula: "Volume variance ≠ spending decision",
          values:
            "It reflects whether actual output matched planned capacity — a function of demand and capacity planning, not period-level spending.",
          result: "Production-volume variance is NOT a controllable variance",
          highlight: true,
          note: "Horngren is explicit: the production-volume variance arises only because absorption costing applies fixed overhead per unit. It does not measure spending efficiency.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — Overhead Rate Development
// ============================================================================

export const overheadRateDev = {
  id: "ch08-rate-development",
  title: "Overhead Rate Development",
  chapter: 8,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Develop separate variable and fixed overhead rates from budgeted data using normal costing.",
  reviewChapters: CH08_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const budgetedVOH = roundToNearest(randomInRange(40000, 120000), 1000);
    const budgetedFOH = roundToNearest(randomInRange(80000, 250000), 5000);
    const denomLevel = roundToNearest(randomInRange(5000, 15000), 500);
    const actualUnits = roundToNearest(randomInRange(1000, 4000), 100);
    const stdHrsPerUnit = randomInRange(2, 5, 1);
    const stdHrsAllowed = stdHrsPerUnit * actualUnits;
    return {
      company,
      budgetedVOH,
      budgetedFOH,
      denomLevel,
      actualUnits,
      stdHrsPerUnit,
      stdHrsAllowed,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} budgeted <strong>$${data.budgetedVOH.toLocaleString()}</strong>
    of variable overhead and <strong>$${data.budgetedFOH.toLocaleString()}</strong> of fixed
    overhead for the period, based on a denominator level of
    <strong>${data.denomLevel.toLocaleString()} machine-hours</strong>. Each
    ${data.actualUnits > 1 ? "unit" : "unit"} requires
    <strong>${data.stdHrsPerUnit} standard machine-hours</strong>. Actual production was
    <strong>${data.actualUnits.toLocaleString()} units</strong>.</p>
  `,

  given: (data) => [
    { label: "Budgeted VOH", value: `$${data.budgetedVOH.toLocaleString()}` },
    { label: "Budgeted FOH", value: `$${data.budgetedFOH.toLocaleString()}` },
    {
      label: "Denominator MH",
      value: `${data.denomLevel.toLocaleString()} MH`,
    },
    { label: "Std MH per unit", value: `${data.stdHrsPerUnit} MH` },
    {
      label: "Actual units produced",
      value: `${data.actualUnits.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "voh-rate",
      question: "What is the standard VOH rate per machine-hour?",
      resultType: "money-small",
      unit: "$ per MH",
      solve: (data) => roundTo(data.budgetedVOH / data.denomLevel, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Standard VOH Rate",
          formula: "Budgeted VOH ÷ Denominator MH",
          values: `$${data.budgetedVOH.toLocaleString()} ÷ ${data.denomLevel.toLocaleString()}`,
          result: `$${correctValue} per MH`,
          highlight: true,
        },
      ],
    },
    {
      id: "foh-rate",
      question: "What is the standard FOH rate per machine-hour?",
      resultType: "money-small",
      unit: "$ per MH",
      solve: (data) => roundTo(data.budgetedFOH / data.denomLevel, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Standard FOH Rate",
          formula: "Budgeted FOH ÷ Denominator MH",
          values: `$${data.budgetedFOH.toLocaleString()} ÷ ${data.denomLevel.toLocaleString()}`,
          result: `$${correctValue} per MH`,
          highlight: true,
          note: "FOH rate is unitized only for product costing purposes — the underlying FOH is still a lump sum.",
        },
      ],
    },
    {
      id: "total-rate",
      question: "What is the total (combined) overhead rate per machine-hour?",
      resultType: "money-small",
      unit: "$ per MH",
      solve: (data, prior) => roundTo(prior["voh-rate"] + prior["foh-rate"], 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Combined Rate",
          formula: "VOH Rate + FOH Rate",
          values: `$${prior["voh-rate"]} + $${prior["foh-rate"]}`,
          result: `$${correctValue} per MH`,
          highlight: true,
          annotation:
            carryForwardNote(
              "voh-rate",
              "1",
              prior,
              studentAnswers,
              (v) => `$${v}`,
            ) ||
            carryForwardNote(
              "foh-rate",
              "2",
              prior,
              studentAnswers,
              (v) => `$${v}`,
            ),
        },
      ],
    },
    {
      id: "oh-applied",
      question: "What is the total overhead applied to production this period?",
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) =>
        Math.round(prior["total-rate"] * data.stdHrsAllowed),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Overhead Applied",
          formula: "Combined Rate × Std Hours Allowed",
          values: `$${prior["total-rate"]} × ${data.stdHrsAllowed.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "total-rate",
            "3",
            prior,
            studentAnswers,
            (v) => `$${v}`,
          ),
          note: `Std hours allowed = ${data.stdHrsPerUnit} × ${data.actualUnits.toLocaleString()} = ${data.stdHrsAllowed.toLocaleString()} MH`,
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Volume Variance Investigation
// ============================================================================

export const volumeVarianceInvestigation = {
  id: "ch08-volume-investigation",
  title: "Volume Variance — Capacity Investigation",
  chapter: 8,
  difficulty: "intermediate",
  estimatedMinutes: 7,
  description:
    "The production-volume variance is large. Compute it, then identify the operational cause.",
  reviewChapters: CH08_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const budgetedFOH = roundToNearest(randomInRange(120000, 280000), 5000);
    const denomLevel = roundToNearest(randomInRange(8000, 16000), 500);
    const fohStdRate = roundTo(budgetedFOH / denomLevel, 2);

    // Pick a cause that drives the direction of the volume variance
    // 0: demand shortfall → unfavorable (under-utilization)
    // 1: idle capacity → unfavorable
    // 2: strong demand → favorable (over-utilization)
    // 3: planning error → either direction
    const causeIdx = Math.floor(Math.random() * 4);

    let stdHrsAllowed;
    if (causeIdx === 0 || causeIdx === 1) {
      // Under-utilization: produced less than denominator
      stdHrsAllowed = Math.round(
        denomLevel * (1 - randomInRange(15, 30, 1) / 100),
      );
    } else if (causeIdx === 2) {
      // Over-utilization: produced more than denominator
      stdHrsAllowed = Math.round(
        denomLevel * (1 + randomInRange(8, 18, 1) / 100),
      );
    } else {
      // Planning error: small under or small over
      const dir = Math.random() > 0.5 ? 1 : -1;
      stdHrsAllowed = Math.round(
        denomLevel * (1 + (dir * randomInRange(5, 12, 1)) / 100),
      );
    }

    return {
      company,
      product,
      budgetedFOH,
      denomLevel,
      fohStdRate,
      stdHrsAllowed,
      causeIdx,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} planned for <strong>${data.denomLevel.toLocaleString()} machine-hours</strong>
    of capacity to produce ${data.product.plural} this period. The plant's fixed
    manufacturing overhead is budgeted at
    <strong>$${data.budgetedFOH.toLocaleString()}</strong>. Actual production used the
    standards to allow <strong>${data.stdHrsAllowed.toLocaleString()} machine-hours</strong>
    — a meaningful gap from the denominator level. The plant manager wants to know what
    caused the production-volume variance.</p>
  `,

  given: (data) => [
    { label: "Budgeted FOH", value: `$${data.budgetedFOH.toLocaleString()}` },
    {
      label: "Denominator MH (planned)",
      value: `${data.denomLevel.toLocaleString()} MH`,
    },
    { label: "Standard FOH rate", value: `$${data.fohStdRate} per MH` },
    {
      label: "Std MH allowed for actual output",
      value: `${data.stdHrsAllowed.toLocaleString()} MH`,
    },
  ],

  steps: [
    {
      id: "foh-applied",
      question: "What is the fixed overhead applied to production?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.fohStdRate * data.stdHrsAllowed),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "FOH Applied",
          formula: "Std Rate × Std Hours Allowed",
          values: `$${data.fohStdRate} × ${data.stdHrsAllowed.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "volume-variance",
      question:
        "What is the magnitude of the production-volume variance? (Enter as a positive number.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) => Math.abs(data.budgetedFOH - prior["foh-applied"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Production-Volume Variance",
          formula: "Budgeted FOH − FOH Applied",
          values: `$${data.budgetedFOH.toLocaleString()} − $${prior["foh-applied"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "foh-applied",
            "1",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "likely-cause",
      type: "choice",
      question:
        "Which operational cause best explains this variance, given the magnitude and direction?",
      options: [
        {
          id: "demand-shortfall",
          label:
            "Demand shortfall — customers ordered less than planned, leaving capacity idle",
        },
        {
          id: "strong-demand",
          label:
            "Stronger-than-planned demand — production ran above denominator level",
        },
        {
          id: "idle-capacity",
          label:
            "Equipment downtime or labor shortage — could not produce planned volume",
        },
        {
          id: "planning-error",
          label:
            "Aggressive denominator level set during budgeting — planned for capacity that was never realistic",
        },
      ],
      correctId: (data) => {
        if (data.causeIdx === 0) return "demand-shortfall";
        if (data.causeIdx === 1) return "idle-capacity";
        if (data.causeIdx === 2) return "strong-demand";
        return "planning-error";
      },
      showWork: (data, prior, studentAnswers, correctId) => {
        const isOver = data.stdHrsAllowed > data.denomLevel;
        const gapPct = roundTo(
          (Math.abs(data.stdHrsAllowed - data.denomLevel) / data.denomLevel) *
            100,
          1,
        );
        return [
          {
            label: "Pattern reading",
            formula: "Compare std hours allowed to denominator level",
            values: `${isOver ? "Over" : "Under"}-utilization by ${gapPct}% (${data.stdHrsAllowed.toLocaleString()} vs ${data.denomLevel.toLocaleString()})`,
            result:
              correctId === "demand-shortfall"
                ? "Demand shortfall"
                : correctId === "idle-capacity"
                  ? "Idle capacity"
                  : correctId === "strong-demand"
                    ? "Strong demand"
                    : "Planning error",
            highlight: true,
            note: "A single variance number rarely identifies the cause uniquely — managers must combine it with operational context (sales reports, downtime logs, original capacity planning assumptions).",
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Export all problems
// ============================================================================

export const ch08Problems = [
  variableOHVariances,
  fixedOHVariances,
  fourVarianceAnalysis,
  overheadRateDev,
  volumeVarianceInvestigation,
];
