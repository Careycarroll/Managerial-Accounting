// js/practice/ch22-problems.js
// Chapter 22 — Capital Budgeting and Cost Analysis
// Pass 2 problems — mixes numeric capital-budgeting calculations with
// choice steps for accept/reject and project-ranking decisions.
//
// Conforms to js/practice/SPEC.md (Pass 2).
// Five problems:
//   1. NPV — Even Cash Flows
//   2. NPV — Uneven Cash Flows
//   3. Payback Period (uniform & cumulative)
//   4. IRR vs. Required Return
//   5. After-Tax Cash Flows + NPV (with depreciation tax shield)

import {
  randomInRange,
  roundTo,
  roundToNearest,
  randomChoice,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH22_REVIEW = [
  {
    label: "Ch. 22 — Capital Budgeting and Cost Analysis",
    href: `${BASE}pages/learn/ch22.html`,
  },
];

// ============================================================================
// Financial-math helpers (inline — no external library)
// ============================================================================

// PV of $1 received n years from now at rate r
function pvOfOne(r, n) {
  return 1 / Math.pow(1 + r, n);
}

// PV of an annuity of $1 for n years at rate r
function pvAnnuityFactor(r, n) {
  return (1 - Math.pow(1 + r, -n)) / r;
}

// Carry-forward annotation helper (string + numeric priors)
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
// Problem 1 — NPV with Even Cash Flows
// ============================================================================

export const npvEvenCashFlows = {
  id: "ch22-npv-even",
  title: "NPV — Even Cash Flows",
  chapter: 22,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Compute NPV for a project with equal annual cash flows, then decide whether to accept it.",
  reviewChapters: CH22_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });
    const investment = roundToNearest(randomInRange(80000, 250000), 5000);
    const annualCF = roundToNearest(
      randomInRange(
        Math.round(investment * 0.2),
        Math.round(investment * 0.35),
      ),
      1000,
    );
    const years = randomChoice([4, 5, 6, 7]);
    const rate = randomChoice([0.08, 0.1, 0.12, 0.14]);
    return { company, product, investment, annualCF, years, rate };
  },

  scenario: (data) => `
    <p>${data.company.name} is evaluating a project to upgrade equipment used to
    produce ${data.product.plural}. The project requires an initial investment of
    <strong>$${data.investment.toLocaleString()}</strong> today and is expected to
    generate <strong>$${data.annualCF.toLocaleString()}</strong> in net cash flow
    each year for <strong>${data.years} years</strong>. The required rate of return
    is <strong>${(data.rate * 100).toFixed(0)}%</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Initial investment",
      value: `$${data.investment.toLocaleString()}`,
    },
    { label: "Annual cash flow", value: `$${data.annualCF.toLocaleString()}` },
    { label: "Project life", value: `${data.years} years` },
    {
      label: "Required rate of return",
      value: `${(data.rate * 100).toFixed(0)}%`,
    },
  ],

  steps: [
    {
      id: "pv-annuity-factor",
      question:
        "What is the present value annuity factor for the project life at the required rate?",
      resultType: "money-small",
      unit: "factor",
      tolerance: { value: 0.01, type: "absolute" },
      solve: (data) => roundTo(pvAnnuityFactor(data.rate, data.years), 3),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Present Value Annuity Factor",
          formula: "(1 − (1 + r)⁻ⁿ) ÷ r",
          values: `(1 − (1 + ${data.rate})⁻${data.years}) ÷ ${data.rate}`,
          result: `${correctValue}`,
          highlight: true,
          note: "This factor converts a series of equal future cash flows into a single present value.",
        },
      ],
    },
    {
      id: "pv-cash-flows",
      question: "What is the present value of the annual cash flows?",
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) =>
        Math.round(prior["pv-annuity-factor"] * data.annualCF),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "PV of Cash Inflows",
          formula: "Annual Cash Flow × PV Annuity Factor",
          values: `$${data.annualCF.toLocaleString()} × ${prior["pv-annuity-factor"]}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "pv-annuity-factor",
            "1",
            prior,
            studentAnswers,
            (v) => v.toString(),
          ),
        },
      ],
    },
    {
      id: "npv",
      question:
        "What is the net present value (NPV) of the project? Enter a positive number for positive NPV, negative for negative NPV.",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data, prior) => prior["pv-cash-flows"] - data.investment,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Net Present Value",
          formula: "PV of Cash Inflows − Initial Investment",
          values: `$${prior["pv-cash-flows"].toLocaleString()} − $${data.investment.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "pv-cash-flows",
            "2",
            prior,
            studentAnswers,
          ),
          note: "NPV measures the project's value-creation in today's dollars after recovering the investment.",
        },
      ],
    },
    {
      id: "accept-decision",
      type: "choice",
      question:
        "Based on the NPV decision rule, should the company accept this project?",
      options: [
        {
          id: "accept",
          label: "Accept — NPV is positive, so the project creates value",
        },
        {
          id: "reject-negative-npv",
          label: "Reject — NPV is negative, so the project destroys value",
        },
        { id: "reject-payback", label: "Reject — payback period is too long" },
        { id: "indifferent", label: "Indifferent — NPV is approximately zero" },
      ],
      correctId: (data, prior) => {
        const npv = prior["npv"];
        if (Math.abs(npv) < 500) return "indifferent";
        return npv > 0 ? "accept" : "reject-negative-npv";
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "NPV Decision Rule",
          formula: "Accept if NPV > 0, Reject if NPV < 0",
          values: `NPV = $${prior["npv"].toLocaleString()}`,
          result:
            correctId === "accept"
              ? "Accept"
              : correctId === "reject-negative-npv"
                ? "Reject"
                : "Indifferent",
          highlight: true,
          note: "NPV is the only capital budgeting method that directly measures dollar value creation.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — NPV with Uneven Cash Flows
// ============================================================================

export const npvUnevenCashFlows = {
  id: "ch22-npv-uneven",
  title: "NPV — Uneven Cash Flows",
  chapter: 22,
  difficulty: "intermediate",
  estimatedMinutes: 8,
  description:
    "Discount uneven yearly cash flows to present value and compute NPV.",
  reviewChapters: CH22_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });
    const investment = roundToNearest(randomInRange(120000, 300000), 5000);
    const cf1 = roundToNearest(randomInRange(20000, 60000), 1000);
    const cf2 = roundToNearest(randomInRange(40000, 90000), 1000);
    const cf3 = roundToNearest(randomInRange(50000, 110000), 1000);
    const cf4 = roundToNearest(randomInRange(40000, 90000), 1000);
    const rate = randomChoice([0.08, 0.1, 0.12]);
    return { company, product, investment, cf1, cf2, cf3, cf4, rate };
  },

  scenario: (data) => `
    <p>${data.company.name} is considering a four-year project that will produce
    uneven cash flows. The initial investment is
    <strong>$${data.investment.toLocaleString()}</strong>, and expected net cash
    inflows are <strong>$${data.cf1.toLocaleString()}</strong> in Year 1,
    <strong>$${data.cf2.toLocaleString()}</strong> in Year 2,
    <strong>$${data.cf3.toLocaleString()}</strong> in Year 3, and
    <strong>$${data.cf4.toLocaleString()}</strong> in Year 4. The required rate of
    return is <strong>${(data.rate * 100).toFixed(0)}%</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Initial investment",
      value: `$${data.investment.toLocaleString()}`,
    },
    { label: "Year 1 cash flow", value: `$${data.cf1.toLocaleString()}` },
    { label: "Year 2 cash flow", value: `$${data.cf2.toLocaleString()}` },
    { label: "Year 3 cash flow", value: `$${data.cf3.toLocaleString()}` },
    { label: "Year 4 cash flow", value: `$${data.cf4.toLocaleString()}` },
    {
      label: "Required rate of return",
      value: `${(data.rate * 100).toFixed(0)}%`,
    },
  ],

  steps: [
    {
      id: "pv-year-1",
      question: "What is the present value of the Year 1 cash flow?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.cf1 * pvOfOne(data.rate, 1)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "PV of Year 1 Cash Flow",
          formula: "CF₁ × (1 + r)⁻¹",
          values: `$${data.cf1.toLocaleString()} × ${roundTo(pvOfOne(data.rate, 1), 4)}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "pv-year-2",
      question: "What is the present value of the Year 2 cash flow?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.cf2 * pvOfOne(data.rate, 2)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "PV of Year 2 Cash Flow",
          formula: "CF₂ × (1 + r)⁻²",
          values: `$${data.cf2.toLocaleString()} × ${roundTo(pvOfOne(data.rate, 2), 4)}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "pv-year-3",
      question: "What is the present value of the Year 3 cash flow?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.cf3 * pvOfOne(data.rate, 3)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "PV of Year 3 Cash Flow",
          formula: "CF₃ × (1 + r)⁻³",
          values: `$${data.cf3.toLocaleString()} × ${roundTo(pvOfOne(data.rate, 3), 4)}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "npv",
      question:
        "What is the NPV of the project? (Hint: discount Year 4 too, then sum all four years and subtract the investment.) Enter negative for negative NPV.",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data, prior) => {
        const pv4 = Math.round(data.cf4 * pvOfOne(data.rate, 4));
        return (
          prior["pv-year-1"] +
          prior["pv-year-2"] +
          prior["pv-year-3"] +
          pv4 -
          data.investment
        );
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const pv4 = Math.round(data.cf4 * pvOfOne(data.rate, 4));
        return [
          {
            label: "PV of Year 4 Cash Flow",
            formula: "CF₄ × (1 + r)⁻⁴",
            values: `$${data.cf4.toLocaleString()} × ${roundTo(pvOfOne(data.rate, 4), 4)}`,
            result: `$${pv4.toLocaleString()}`,
          },
          {
            label: "Total PV of Cash Inflows",
            formula: "Sum of yearly PVs",
            values: `$${prior["pv-year-1"].toLocaleString()} + $${prior["pv-year-2"].toLocaleString()} + $${prior["pv-year-3"].toLocaleString()} + $${pv4.toLocaleString()}`,
            result: `$${(prior["pv-year-1"] + prior["pv-year-2"] + prior["pv-year-3"] + pv4).toLocaleString()}`,
          },
          {
            label: "Net Present Value",
            formula: "Total PV − Initial Investment",
            values: `$${(prior["pv-year-1"] + prior["pv-year-2"] + prior["pv-year-3"] + pv4).toLocaleString()} − $${data.investment.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
          },
        ];
      },
    },
    {
      id: "accept-decision",
      type: "choice",
      question: "Should the company accept this project?",
      options: [
        { id: "accept", label: "Accept — NPV is positive" },
        { id: "reject", label: "Reject — NPV is negative" },
        {
          id: "reject-undiscounted",
          label:
            "Reject — total undiscounted cash flows are less than the investment",
        },
        {
          id: "accept-payback",
          label: "Accept — the project pays back within four years",
        },
      ],
      correctId: (data, prior) => (prior["npv"] > 0 ? "accept" : "reject"),
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Decision",
          formula: "Accept if NPV > 0",
          values: `NPV = $${prior["npv"].toLocaleString()}`,
          result: correctId === "accept" ? "Accept" : "Reject",
          highlight: true,
          note: "Total undiscounted cash flow is not a valid criterion — it ignores the time value of money.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Payback Period
// ============================================================================

export const paybackPeriod = {
  id: "ch22-payback",
  title: "Payback Period",
  chapter: 22,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Compute payback for two projects with different cash flow patterns and identify the limitations.",
  reviewChapters: CH22_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    // Project A: even cash flows
    const investmentA = roundToNearest(randomInRange(60000, 150000), 5000);
    const annualCFA = roundToNearest(investmentA / randomInRange(3, 5), 1000);
    // Project B: front-loaded with same total investment range
    const investmentB = roundToNearest(randomInRange(80000, 180000), 5000);
    const cf1B = roundToNearest(
      (investmentB * randomInRange(35, 50)) / 100,
      1000,
    );
    const cf2B = roundToNearest(
      (investmentB * randomInRange(35, 50)) / 100,
      1000,
    );
    const cf3B = roundToNearest(
      (investmentB * randomInRange(20, 35)) / 100,
      1000,
    );
    const cf4B = roundToNearest(
      (investmentB * randomInRange(15, 25)) / 100,
      1000,
    );
    return {
      company,
      investmentA,
      annualCFA,
      investmentB,
      cf1B,
      cf2B,
      cf3B,
      cf4B,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is comparing two projects with different cash flow
    patterns. <strong>Project A</strong> requires
    <strong>$${data.investmentA.toLocaleString()}</strong> and returns
    <strong>$${data.annualCFA.toLocaleString()}</strong> per year evenly.
    <strong>Project B</strong> requires
    <strong>$${data.investmentB.toLocaleString()}</strong> and returns
    <strong>$${data.cf1B.toLocaleString()}</strong>,
    <strong>$${data.cf2B.toLocaleString()}</strong>,
    <strong>$${data.cf3B.toLocaleString()}</strong>, and
    <strong>$${data.cf4B.toLocaleString()}</strong> in years 1–4. Both projects are
    being evaluated using the payback method.</p>
  `,

  given: (data) => [
    {
      label: "Project A — Investment",
      value: `$${data.investmentA.toLocaleString()}`,
    },
    {
      label: "Project A — Annual CF",
      value: `$${data.annualCFA.toLocaleString()}`,
    },
    {
      label: "Project B — Investment",
      value: `$${data.investmentB.toLocaleString()}`,
    },
    { label: "Project B — Year 1", value: `$${data.cf1B.toLocaleString()}` },
    { label: "Project B — Year 2", value: `$${data.cf2B.toLocaleString()}` },
    { label: "Project B — Year 3", value: `$${data.cf3B.toLocaleString()}` },
    { label: "Project B — Year 4", value: `$${data.cf4B.toLocaleString()}` },
  ],

  steps: [
    {
      id: "payback-a",
      question: "What is the payback period for Project A (in years)?",
      resultType: "years",
      unit: "years",
      solve: (data) => roundTo(data.investmentA / data.annualCFA, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Payback — Project A (uniform cash flows)",
          formula: "Investment ÷ Annual Cash Flow",
          values: `$${data.investmentA.toLocaleString()} ÷ $${data.annualCFA.toLocaleString()}`,
          result: `${correctValue} years`,
          highlight: true,
          note: "With uniform cash flows, payback is a single division.",
        },
      ],
    },
    {
      id: "payback-b",
      question: "What is the payback period for Project B (in years)?",
      resultType: "years",
      unit: "years",
      tolerance: { value: 0.15, type: "absolute" },
      solve: (data) => {
        const cfs = [data.cf1B, data.cf2B, data.cf3B, data.cf4B];
        let cumulative = 0;
        for (let y = 0; y < cfs.length; y++) {
          if (cumulative + cfs[y] >= data.investmentB) {
            const remaining = data.investmentB - cumulative;
            return roundTo(y + remaining / cfs[y], 2);
          }
          cumulative += cfs[y];
        }
        return cfs.length;
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const cfs = [data.cf1B, data.cf2B, data.cf3B, data.cf4B];
        let cumulative = 0;
        let crossYear = 0;
        let remaining = 0;
        for (let y = 0; y < cfs.length; y++) {
          if (cumulative + cfs[y] >= data.investmentB) {
            crossYear = y;
            remaining = data.investmentB - cumulative;
            break;
          }
          cumulative += cfs[y];
        }
        return [
          {
            label: "Cumulative cash flow tracking",
            formula: "Year-by-year sum until investment is recovered",
            values: `Year ${crossYear} cumulative: $${cumulative.toLocaleString()} — need $${remaining.toLocaleString()} more from Year ${crossYear + 1}'s $${cfs[crossYear].toLocaleString()}`,
            result: `${crossYear} + ${roundTo(remaining / cfs[crossYear], 2)} = ${correctValue} years`,
            highlight: true,
            note: "Uneven cash flows require tracking cumulative inflows until the investment is recovered.",
          },
        ];
      },
    },
    {
      id: "shorter-payback",
      type: "choice",
      question: "Which project has the shorter payback period?",
      options: [
        { id: "project-a", label: "Project A — pays back faster" },
        { id: "project-b", label: "Project B — pays back faster" },
        { id: "tied", label: "Both have approximately equal payback" },
      ],
      correctId: (data, prior) => {
        const diff = prior["payback-a"] - prior["payback-b"];
        if (Math.abs(diff) < 0.15) return "tied";
        return diff > 0 ? "project-b" : "project-a";
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Compare paybacks",
          formula: "Choose the project that recovers investment sooner",
          values: `Project A: ${prior["payback-a"]} years · Project B: ${prior["payback-b"]} years`,
          result:
            correctId === "project-a"
              ? "Project A"
              : correctId === "project-b"
                ? "Project B"
                : "Approximately equal",
          highlight: true,
        },
      ],
    },
    {
      id: "payback-limitation",
      type: "choice",
      question: "Which is the most important limitation of the payback method?",
      options: [
        {
          id: "ignores-time-value",
          label:
            "It ignores the time value of money and cash flows after payback",
        },
        {
          id: "too-conservative",
          label: "It is too conservative for risky projects",
        },
        {
          id: "requires-irr",
          label: "It cannot be calculated without knowing IRR first",
        },
        {
          id: "only-positive-cf",
          label: "It only works when all cash flows are positive",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "ignores-time-value",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Payback Method Limitation",
          formula:
            "Two flaws: no discounting + ignores post-payback cash flows",
          values:
            'A project paying back in 3 years but earning nothing after is "preferred" over one paying back in 4 years and earning for 20.',
          result: "Ignores time value and post-payback cash flows",
          highlight: true,
          note: "This is why NPV and IRR are preferred for the final decision — payback is a screening tool, not a decision rule.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — IRR vs. Required Return
// ============================================================================

export const irrVsRequired = {
  id: "ch22-irr",
  title: "IRR vs. Required Return",
  chapter: 22,
  difficulty: "intermediate",
  estimatedMinutes: 7,
  description:
    "Estimate the IRR of a project by trial-and-error, compare to the required rate, and decide.",
  reviewChapters: CH22_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const investment = roundToNearest(randomInRange(100000, 200000), 5000);
    const years = randomChoice([4, 5, 6]);
    // Annual CF chosen so IRR falls between 6% and 16%
    const targetIRR = randomChoice([0.07, 0.09, 0.11, 0.13, 0.15]);
    const annualCF = roundToNearest(
      investment / pvAnnuityFactor(targetIRR, years),
      500,
    );
    const requiredRate = randomChoice([0.08, 0.1, 0.12]);
    return { company, investment, annualCF, years, requiredRate, targetIRR };
  },

  scenario: (data) => `
    <p>${data.company.name} is evaluating a project requiring an initial investment of
    <strong>$${data.investment.toLocaleString()}</strong>. The project will generate
    <strong>$${data.annualCF.toLocaleString()}</strong> annually for
    <strong>${data.years} years</strong>. The company's required rate of return is
    <strong>${(data.requiredRate * 100).toFixed(0)}%</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Initial investment",
      value: `$${data.investment.toLocaleString()}`,
    },
    { label: "Annual cash flow", value: `$${data.annualCF.toLocaleString()}` },
    { label: "Project life", value: `${data.years} years` },
    {
      label: "Required rate of return",
      value: `${(data.requiredRate * 100).toFixed(0)}%`,
    },
  ],

  steps: [
    {
      id: "pv-factor-needed",
      question: "What PV annuity factor would make NPV equal to zero?",
      resultType: "money-small",
      unit: "factor",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data) => roundTo(data.investment / data.annualCF, 3),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "PV Annuity Factor at IRR",
          formula: "Investment ÷ Annual Cash Flow",
          values: `$${data.investment.toLocaleString()} ÷ $${data.annualCF.toLocaleString()}`,
          result: `${correctValue}`,
          highlight: true,
          note: "At IRR, the PV of cash inflows exactly equals the initial investment, so NPV = 0.",
        },
      ],
    },
    {
      id: "irr-estimate",
      question:
        "Approximate the IRR by trial and error. Enter as a percentage (e.g., 11.5 for 11.5%).",
      resultType: "percent",
      unit: "%",
      tolerance: { value: 1.0, type: "absolute" },
      solve: (data) => {
        // Scan from 5% to 20% in 0.5% steps; report the rate closest to actual factor
        const targetFactor = data.investment / data.annualCF;
        let bestRate = 0.05;
        let bestDiff = Infinity;
        for (let r = 0.05; r <= 0.2; r += 0.005) {
          const factor = pvAnnuityFactor(r, data.years);
          const diff = Math.abs(factor - targetFactor);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestRate = r;
          }
        }
        return roundTo(bestRate * 100, 1);
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Approximate IRR",
          formula: "Find rate r where (1 − (1+r)⁻ⁿ) ÷ r = required factor",
          values: `Try rates until annuity factor for ${data.years} years ≈ ${prior["pv-factor-needed"]}`,
          result: `IRR ≈ ${correctValue}%`,
          highlight: true,
          note: "Trial-and-error or a financial calculator. The textbook PV table is the manual method.",
        },
      ],
    },
    {
      id: "irr-vs-required",
      type: "choice",
      question: "How does the IRR compare to the required rate of return?",
      options: [
        { id: "irr-higher", label: "IRR is higher than the required rate" },
        { id: "irr-lower", label: "IRR is lower than the required rate" },
        {
          id: "irr-equal",
          label: "IRR equals the required rate (approximately)",
        },
      ],
      correctId: (data, prior) => {
        const irrPct = prior["irr-estimate"];
        const reqPct = data.requiredRate * 100;
        if (Math.abs(irrPct - reqPct) < 0.6) return "irr-equal";
        return irrPct > reqPct ? "irr-higher" : "irr-lower";
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Comparison",
          formula: "IRR vs. Required Rate",
          values: `IRR ≈ ${prior["irr-estimate"]}% vs. Required ${(data.requiredRate * 100).toFixed(0)}%`,
          result:
            correctId === "irr-higher"
              ? "IRR > Required"
              : correctId === "irr-lower"
                ? "IRR < Required"
                : "IRR ≈ Required",
          highlight: true,
        },
      ],
    },
    {
      id: "accept-decision",
      type: "choice",
      question:
        "Based on the IRR rule, should the company accept this project?",
      options: [
        { id: "accept", label: "Accept — IRR exceeds the required rate" },
        { id: "reject", label: "Reject — IRR is below the required rate" },
        {
          id: "reject-low-irr",
          label: "Reject — IRR seems too low in absolute terms",
        },
        {
          id: "indifferent",
          label: "Indifferent — IRR and required rate are approximately equal",
        },
      ],
      correctId: (data, prior) => {
        const irrPct = prior["irr-estimate"];
        const reqPct = data.requiredRate * 100;
        if (Math.abs(irrPct - reqPct) < 0.6) return "indifferent";
        return irrPct > reqPct ? "accept" : "reject";
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "IRR Decision Rule",
          formula: "Accept if IRR > Required Rate",
          values: `IRR ${prior["irr-estimate"]}% vs. Required ${(data.requiredRate * 100).toFixed(0)}%`,
          result:
            correctId === "accept"
              ? "Accept"
              : correctId === "reject"
                ? "Reject"
                : "Indifferent",
          highlight: true,
          note: "IRR is always evaluated relative to the required return, never in absolute terms.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — After-Tax Cash Flows + NPV
// ============================================================================

export const afterTaxNPV = {
  id: "ch22-aftertax-npv",
  title: "After-Tax NPV with Depreciation",
  chapter: 22,
  difficulty: "advanced",
  estimatedMinutes: 9,
  description:
    "Incorporate depreciation tax shields and an after-tax salvage value into the NPV calculation.",
  reviewChapters: CH22_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const investment = roundToNearest(randomInRange(150000, 350000), 5000);
    const years = randomChoice([4, 5]);
    const salvage = roundToNearest(
      (investment * randomInRange(8, 18)) / 100,
      1000,
    );
    const annualPretaxCF = roundToNearest(
      (investment * randomInRange(28, 45)) / 100,
      1000,
    );
    const taxRate = randomChoice([0.21, 0.25, 0.3]);
    const rate = randomChoice([0.08, 0.1, 0.12]);
    const annualDeprec = roundTo((investment - salvage) / years, 0);
    return {
      company,
      investment,
      years,
      salvage,
      annualPretaxCF,
      taxRate,
      rate,
      annualDeprec,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is evaluating a manufacturing equipment purchase costing
    <strong>$${data.investment.toLocaleString()}</strong>. The equipment will produce
    <strong>$${data.annualPretaxCF.toLocaleString()}</strong> in pretax operating cash
    inflows each year for <strong>${data.years} years</strong>, after which it can be
    sold for <strong>$${data.salvage.toLocaleString()}</strong> (equal to its book
    value at that time). Depreciation is straight-line. The company's tax rate is
    <strong>${(data.taxRate * 100).toFixed(0)}%</strong> and the required rate of
    return is <strong>${(data.rate * 100).toFixed(0)}%</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Initial investment",
      value: `$${data.investment.toLocaleString()}`,
    },
    { label: "Project life", value: `${data.years} years` },
    { label: "Salvage value", value: `$${data.salvage.toLocaleString()}` },
    {
      label: "Annual pretax operating CF",
      value: `$${data.annualPretaxCF.toLocaleString()}`,
    },
    {
      label: "Annual depreciation",
      value: `$${data.annualDeprec.toLocaleString()}`,
    },
    { label: "Tax rate", value: `${(data.taxRate * 100).toFixed(0)}%` },
    {
      label: "Required rate of return",
      value: `${(data.rate * 100).toFixed(0)}%`,
    },
  ],

  steps: [
    {
      id: "depreciation-tax-shield",
      question: "What is the annual depreciation tax shield?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.annualDeprec * data.taxRate),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Depreciation Tax Shield",
          formula: "Annual Depreciation × Tax Rate",
          values: `$${data.annualDeprec.toLocaleString()} × ${(data.taxRate * 100).toFixed(0)}%`,
          result: `$${correctValue.toLocaleString()} per year`,
          highlight: true,
          note: "Depreciation is non-cash, but it reduces taxable income. The tax savings is real cash.",
        },
      ],
    },
    {
      id: "aftertax-operating-cf",
      question:
        "What is the annual after-tax operating cash flow (including the depreciation tax shield)?",
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) =>
        Math.round(
          data.annualPretaxCF * (1 - data.taxRate) +
            prior["depreciation-tax-shield"],
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "After-Tax Operating CF",
          formula: "Pretax CF × (1 − Tax Rate) + Depreciation Tax Shield",
          values: `$${data.annualPretaxCF.toLocaleString()} × (1 − ${data.taxRate.toFixed(2)}) + $${prior["depreciation-tax-shield"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()} per year`,
          highlight: true,
          annotation: carryForwardNote(
            "depreciation-tax-shield",
            "1",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "pv-operating-cf",
      question:
        "What is the present value of the after-tax operating cash flows over the project life?",
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) =>
        Math.round(
          prior["aftertax-operating-cf"] *
            pvAnnuityFactor(data.rate, data.years),
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "PV of After-Tax Operating CF",
          formula: "After-Tax CF × PV Annuity Factor",
          values: `$${prior["aftertax-operating-cf"].toLocaleString()} × ${roundTo(pvAnnuityFactor(data.rate, data.years), 3)}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "aftertax-operating-cf",
            "2",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "npv",
      question:
        "What is the NPV of the project? (Include the PV of salvage value at the end.) Enter negative for negative NPV.",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1.5, type: "percent" },
      solve: (data, prior) => {
        const pvSalvage = Math.round(
          data.salvage * pvOfOne(data.rate, data.years),
        );
        return prior["pv-operating-cf"] + pvSalvage - data.investment;
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const pvSalvage = Math.round(
          data.salvage * pvOfOne(data.rate, data.years),
        );
        return [
          {
            label: "PV of Salvage Value",
            formula: "Salvage × (1 + r)⁻ⁿ",
            values: `$${data.salvage.toLocaleString()} × ${roundTo(pvOfOne(data.rate, data.years), 4)}`,
            result: `$${pvSalvage.toLocaleString()}`,
            note: "Since salvage equals book value, there is no gain/loss on disposal and no tax effect.",
          },
          {
            label: "NPV",
            formula: "PV Operating CF + PV Salvage − Investment",
            values: `$${prior["pv-operating-cf"].toLocaleString()} + $${pvSalvage.toLocaleString()} − $${data.investment.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            annotation: carryForwardNote(
              "pv-operating-cf",
              "3",
              prior,
              studentAnswers,
            ),
          },
        ];
      },
    },
    {
      id: "accept-decision",
      type: "choice",
      question: "Should the company accept the project?",
      options: [
        { id: "accept", label: "Accept — NPV is positive" },
        { id: "reject-negative", label: "Reject — NPV is negative" },
        {
          id: "reject-depreciation",
          label: "Reject — depreciation reduces reported profit",
        },
        {
          id: "reject-payback-unclear",
          label: "Reject — payback period was not calculated",
        },
      ],
      correctId: (data, prior) =>
        prior["npv"] > 0 ? "accept" : "reject-negative",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Decision",
          formula: "NPV decision rule",
          values: `NPV = $${prior["npv"].toLocaleString()}`,
          result: correctId === "accept" ? "Accept" : "Reject",
          highlight: true,
          note: "Depreciation reduces reported profit but creates a real cash tax shield — it should not be a reason to reject a positive-NPV project.",
        },
      ],
    },
  ],
};

// ============================================================================
// Exports
// ============================================================================


// ============================================================================
// Problem 6 — Capital Rationing & Project Ranking by PI
// ============================================================================

export const capitalRationing = {
  id: 'ch22-capital-rationing',
  title: 'Capital Rationing — Profitability Index Ranking',
  chapter: 22,
  difficulty: 'advanced',
  estimatedMinutes: 9,
  description:
    'When capital is limited, rank competing projects by profitability index to maximize total NPV within the budget.',
  reviewChapters: CH22_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const requiredRate = randomChoice([0.10, 0.12, 0.14]);

    // Three projects with different investment sizes and NPVs
    const projA = {
      cost: roundToNearest(randomInRange(80000, 150000), 5000),
      annualCF: 0, life: randomChoice([4, 5, 6]),
    };
    const projB = {
      cost: roundToNearest(randomInRange(120000, 220000), 5000),
      annualCF: 0, life: randomChoice([4, 5, 6]),
    };
    const projC = {
      cost: roundToNearest(randomInRange(180000, 320000), 5000),
      annualCF: 0, life: randomChoice([4, 5, 6]),
    };

    // Set annual CF so each project has positive NPV with different PIs
    const pvAnnuity = (r, n) => (1 - Math.pow(1 + r, -n)) / r;

    // Make each project's PI different by design
    // PI = (PV of inflows) / Initial cost
    const piA = roundTo(randomInRange(120, 145, 5) / 100, 2);
    const piB = roundTo(randomInRange(105, 125, 5) / 100, 2);
    const piC = roundTo(randomInRange(110, 130, 5) / 100, 2);

    const pvInflowsA = Math.round(projA.cost * piA);
    const pvInflowsB = Math.round(projB.cost * piB);
    const pvInflowsC = Math.round(projC.cost * piC);

    projA.annualCF = Math.round(pvInflowsA / pvAnnuity(requiredRate, projA.life));
    projB.annualCF = Math.round(pvInflowsB / pvAnnuity(requiredRate, projB.life));
    projC.annualCF = Math.round(pvInflowsC / pvAnnuity(requiredRate, projC.life));

    const npvA = pvInflowsA - projA.cost;
    const npvB = pvInflowsB - projB.cost;
    const npvC = pvInflowsC - projC.cost;

    // Capital budget allows two of three projects
    const totalCostAll = projA.cost + projB.cost + projC.cost;
    const budget = roundToNearest(Math.round(totalCostAll * randomInRange(60, 75, 5) / 100), 10000);

    return {
      company, requiredRate, budget,
      projA: { ...projA, pvInflows: pvInflowsA, npv: npvA, pi: piA },
      projB: { ...projB, pvInflows: pvInflowsB, npv: npvB, pi: piB },
      projC: { ...projC, pvInflows: pvInflowsC, npv: npvC, pi: piC },
    };
  },

  scenario: (data) => `
    <p>${data.company.name} has three competing capital projects but only
    <strong>$${data.budget.toLocaleString()}</strong> available to invest this
    year. The required rate of return is <strong>${(data.requiredRate * 100).toFixed(0)}%</strong>.
    All three projects have positive NPV individually, but the company can only
    fund a subset.</p>
    <p><strong>Project A:</strong> Cost $${data.projA.cost.toLocaleString()},
    annual CF $${data.projA.annualCF.toLocaleString()} for ${data.projA.life} years.</p>
    <p><strong>Project B:</strong> Cost $${data.projB.cost.toLocaleString()},
    annual CF $${data.projB.annualCF.toLocaleString()} for ${data.projB.life} years.</p>
    <p><strong>Project C:</strong> Cost $${data.projC.cost.toLocaleString()},
    annual CF $${data.projC.annualCF.toLocaleString()} for ${data.projC.life} years.</p>
  `,

  given: (data) => [
    { label: 'Capital budget', value: `$${data.budget.toLocaleString()}` },
    { label: 'Required rate', value: `${(data.requiredRate * 100).toFixed(0)}%` },
    { label: 'Project A cost / NPV', value: `$${data.projA.cost.toLocaleString()} / $${data.projA.npv.toLocaleString()}` },
    { label: 'Project B cost / NPV', value: `$${data.projB.cost.toLocaleString()} / $${data.projB.npv.toLocaleString()}` },
    { label: 'Project C cost / NPV', value: `$${data.projC.cost.toLocaleString()} / $${data.projC.npv.toLocaleString()}` },
  ],

  steps: [
    {
      id: 'pi-projA',
      question: 'What is the Profitability Index (PI) for Project A?',
      resultType: 'money-small',
      unit: 'PI',
      tolerance: { value: 0.02, type: 'absolute' },
      solve: (data) => roundTo(data.projA.pvInflows / data.projA.cost, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'PI for Project A',
          formula: 'PV of Inflows ÷ Initial Investment',
          values: `$${data.projA.pvInflows.toLocaleString()} ÷ $${data.projA.cost.toLocaleString()}`,
          result: `${correctValue}`,
          highlight: true,
          note: 'PI > 1.0 means the project creates value. Higher PI = more value per dollar invested.',
        },
      ],
    },
    {
      id: 'pi-projB',
      question: 'What is the Profitability Index for Project B?',
      resultType: 'money-small',
      unit: 'PI',
      tolerance: { value: 0.02, type: 'absolute' },
      solve: (data) => roundTo(data.projB.pvInflows / data.projB.cost, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'PI for Project B',
          formula: 'PV of Inflows ÷ Initial Investment',
          values: `$${data.projB.pvInflows.toLocaleString()} ÷ $${data.projB.cost.toLocaleString()}`,
          result: `${correctValue}`,
          highlight: true,
        },
      ],
    },
    {
      id: 'pi-projC',
      question: 'What is the Profitability Index for Project C?',
      resultType: 'money-small',
      unit: 'PI',
      tolerance: { value: 0.02, type: 'absolute' },
      solve: (data) => roundTo(data.projC.pvInflows / data.projC.cost, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'PI for Project C',
          formula: 'PV of Inflows ÷ Initial Investment',
          values: `$${data.projC.pvInflows.toLocaleString()} ÷ $${data.projC.cost.toLocaleString()}`,
          result: `${correctValue}`,
          highlight: true,
        },
      ],
    },
    {
      id: 'optimal-combination',
      type: 'choice',
      question: 'Which combination of projects maximizes total NPV within the capital budget?',
      options: (data) => {
        // Build option labels dynamically based on PI ranking
        const ranked = ['A', 'B', 'C'].sort((x, y) => {
          const pis = { A: data.projA.pi, B: data.projB.pi, C: data.projC.pi };
          return pis[y] - pis[x];
        });
        return [
          { id: 'highest-pi', label: `Projects ${ranked[0]} and ${ranked[1]} — highest PI ranking within budget` },
          { id: 'all-three', label: 'All three projects — they all have positive NPV' },
          { id: 'highest-npv', label: 'Whichever two projects have the highest individual NPVs' },
          { id: 'cheapest', label: 'The two cheapest projects to stay well under budget' },
        ];
      },
      correctId: () => 'highest-pi',
      intentionalSingleAnswer: true,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Capital Rationing Decision Rule',
          formula: 'Rank by PI; select projects within budget',
          values: `PI rankings — A: ${data.projA.pi}, B: ${data.projB.pi}, C: ${data.projC.pi}. Pick highest-PI projects that fit budget $${data.budget.toLocaleString()}.`,
          result: 'Rank by PI, not by absolute NPV',
          highlight: true,
          note: 'When capital is limited, ranking by PI maximizes total NPV. A high-NPV but high-cost project may not be the best use of scarce capital — a smaller, higher-PI project might yield more total value.',
        },
      ],
    },
    {
      id: 'why-pi-not-npv',
      type: 'choice',
      intentionalSingleAnswer: true,
      question: 'In capital rationing, why is PI a better ranking tool than NPV alone?',
      options: [
        { id: 'efficiency', label: 'PI measures NPV per dollar invested — when capital is constrained, you want maximum value per scarce dollar' },
        { id: 'simpler', label: 'PI is easier to calculate than NPV' },
        { id: 'tax-favorable', label: 'PI produces a better tax outcome' },
        { id: 'no-difference', label: 'PI and NPV always give the same ranking' },
      ],
      correctId: () => 'efficiency',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Why PI Wins Under Capital Rationing',
          formula: 'PI = NPV efficiency per dollar of capital',
          values: 'Without rationing, NPV alone is the right metric. WITH rationing, PI ensures the limited capital is allocated to highest-value-per-dollar projects.',
          result: 'PI is the right rationing metric',
          highlight: true,
          note: 'Without capital constraints, the answer is always "accept all positive-NPV projects." Capital rationing is the case where this rule breaks down.',
        },
      ],
    },
  ],
};


// ============================================================================
// Problem 7 — Discounted Payback (Modified Payback)
// ============================================================================

export const discountedPayback = {
  id: 'ch22-discounted-payback',
  title: 'Discounted Payback Period',
  chapter: 22,
  difficulty: 'intermediate',
  estimatedMinutes: 7,
  description:
    'Calculate the discounted payback period — payback computed from present-value cash flows, addressing the time-value flaw of regular payback.',
  reviewChapters: CH22_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const requiredRate = randomChoice([0.08, 0.10, 0.12]);

    const investment = roundToNearest(randomInRange(100000, 250000), 5000);
    const annualCF = roundToNearest(investment * randomInRange(20, 35, 1) / 100, 1000);
    const projectLife = randomChoice([5, 6, 7]);

    // Compute payback (regular)
    const regularPayback = roundTo(investment / annualCF, 2);

    // Compute discounted payback
    let cumDiscCF = 0;
    let discPaybackYear = projectLife;
    for (let yr = 1; yr <= projectLife; yr++) {
      const discCF = annualCF / Math.pow(1 + requiredRate, yr);
      cumDiscCF += discCF;
      if (cumDiscCF >= investment) {
        const prevCum = cumDiscCF - discCF;
        const remaining = investment - prevCum;
        discPaybackYear = (yr - 1) + remaining / discCF;
        break;
      }
    }
    const discountedPaybackResult = roundTo(discPaybackYear, 2);

    return {
      company, requiredRate,
      investment, annualCF, projectLife,
      regularPayback,
      discountedPayback: discountedPaybackResult,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is evaluating a project requiring an initial
    investment of <strong>$${data.investment.toLocaleString()}</strong>. The
    project generates <strong>$${data.annualCF.toLocaleString()}</strong> in
    annual cash flow for <strong>${data.projectLife} years</strong>. The
    required rate of return is <strong>${(data.requiredRate * 100).toFixed(0)}%</strong>.</p>
    <p>Management wants to compare regular payback (ignoring time value) with
    discounted payback (using discounted cash flows).</p>
  `,

  given: (data) => [
    { label: 'Initial investment', value: `$${data.investment.toLocaleString()}` },
    { label: 'Annual cash flow', value: `$${data.annualCF.toLocaleString()}` },
    { label: 'Project life', value: `${data.projectLife} years` },
    { label: 'Required rate of return', value: `${(data.requiredRate * 100).toFixed(0)}%` },
  ],

  steps: [
    {
      id: 'regular-payback',
      question: 'What is the REGULAR payback period (undiscounted)?',
      resultType: 'years',
      unit: 'years',
      tolerance: { value: 0.1, type: 'absolute' },
      solve: (data) => roundTo(data.investment / data.annualCF, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Regular Payback',
          formula: 'Initial Investment ÷ Annual Cash Flow',
          values: `$${data.investment.toLocaleString()} ÷ $${data.annualCF.toLocaleString()}`,
          result: `${correctValue} years`,
          highlight: true,
        },
      ],
    },
    {
      id: 'pv-year-1',
      question: 'What is the PRESENT VALUE of the Year 1 cash flow?',
      resultType: 'money-medium',
      unit: '$',
      tolerance: { value: 100, type: 'absolute' },
      solve: (data) => Math.round(data.annualCF / (1 + data.requiredRate)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'PV of Year 1 CF',
          formula: 'CF ÷ (1 + r)¹',
          values: `$${data.annualCF.toLocaleString()} ÷ ${(1 + data.requiredRate).toFixed(2)}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'Each year\'s CF must be discounted before being applied to payback.',
        },
      ],
    },
    {
      id: 'pv-year-2',
      question: 'What is the PRESENT VALUE of the Year 2 cash flow?',
      resultType: 'money-medium',
      unit: '$',
      tolerance: { value: 100, type: 'absolute' },
      solve: (data) => Math.round(data.annualCF / Math.pow(1 + data.requiredRate, 2)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'PV of Year 2 CF',
          formula: 'CF ÷ (1 + r)²',
          values: `$${data.annualCF.toLocaleString()} ÷ ${Math.pow(1 + data.requiredRate, 2).toFixed(2)}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: 'discounted-payback',
      question: 'What is the DISCOUNTED payback period?',
      resultType: 'years',
      unit: 'years',
      tolerance: { value: 0.15, type: 'absolute' },
      solve: (data) => data.discountedPayback,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Discounted Payback',
          formula: 'Year when cumulative DISCOUNTED CF ≥ Investment',
          values: `Tracking cumulative discounted CF year-by-year until it reaches $${data.investment.toLocaleString()}`,
          result: `${correctValue} years`,
          highlight: true,
          note: 'Discounted payback is always LONGER than regular payback because each cash flow gets shrunk by the discount factor.',
        },
      ],
    },
    {
      id: 'which-method-better',
      type: 'choice',
      intentionalSingleAnswer: true,
      question: 'For management decision-making, which is more appropriate — regular payback or discounted payback?',
      options: [
        { id: 'discounted-better', label: 'Discounted payback — accounts for the time value of money, gives a more realistic break-even timeline' },
        { id: 'regular-better', label: 'Regular payback — simpler and more intuitive' },
        { id: 'same-result', label: 'Both produce the same answer' },
        { id: 'irrelevant', label: 'Neither — only NPV matters for decisions' },
      ],
      correctId: () => 'discounted-better',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Why Discounted Payback Wins',
          formula: 'Time value matters for capital decisions',
          values: `Regular payback ${prior['regular-payback']} years vs Discounted ${prior['discounted-payback']} years. The gap reflects the time value penalty.`,
          result: 'Discounted payback is theoretically superior',
          highlight: true,
          note: 'Both still have the same fundamental flaw — they ignore cash flows after payback. NPV remains the dominant method for capital decisions, but discounted payback adds value as a complementary metric for evaluating liquidity risk.',
        },
      ],
    },
  ],
};

export const ch22Problems = [
  npvEvenCashFlows,
  npvUnevenCashFlows,
  paybackPeriod,
  irrVsRequired,
  afterTaxNPV,
  capitalRationing,
  discountedPayback,
];
