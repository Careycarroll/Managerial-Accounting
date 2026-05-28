// js/practice/ch03-problems.js
// Chapter 3 — Cost-Volume-Profit Analysis
// Foundation-tier practice problems.
//
// Conforms to js/practice/SPEC.md.
// Five problems, each with randomize() / given() / steps[].

import {
  randomInRange,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";

const BASE = import.meta.env.BASE_URL;

const CH03_REVIEW = [
  { label: "Ch. 3 — CVP Analysis", href: `${BASE}pages/learn/ch03.html` },
];

// ============================================================================
// Helper: annotation builder for carry-forward show-work
// ============================================================================
// Returns an annotation string when the student's earlier answer differs
// meaningfully from the engine's correct value. Threshold of 0.01 avoids
// noisy annotations on borderline-correct floating-point answers.

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
  if (Math.abs(correct - student) <= 0.01) return null;
  return `Using Step ${label} correct value: ${formatter(correct)} (your answer: ${formatter(student)})`;
}

// ============================================================================
// Problem 1 — Breakeven Basics
// ============================================================================
// Skills: CM per unit, CM ratio, BEP in units, BEP in revenue.

export const breakevenBasics = {
  id: "ch03-breakeven-basics",
  title: "Breakeven Basics",
  chapter: 3,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Calculate contribution margin per unit, CM ratio, and breakeven point in units and revenue.",
  reviewChapters: CH03_REVIEW,

  randomize: () => {
    const price = randomInRange(40, 80, 1);
    const variableCost = randomInRange(15, Math.floor(price * 0.7), 1);
    const fixedCosts = roundToNearest(randomInRange(60000, 180000), 5000);
    // Expected units: a bit above breakeven so the problem feels realistic
    const cmPerUnit = price - variableCost;
    const bep = Math.ceil(fixedCosts / cmPerUnit);
    const expectedUnits = roundToNearest(
      ensureGreaterThan(Math.round(bep * 1.4), bep, 500),
      100,
    );
    return { price, variableCost, fixedCosts, expectedUnits };
  },

  given: (data) => [
    { label: "Selling price per unit", value: `$${data.price}` },
    { label: "Variable cost per unit", value: `$${data.variableCost}` },
    { label: "Fixed costs", value: `$${data.fixedCosts.toLocaleString()}` },
    {
      label: "Expected unit sales",
      value: `${data.expectedUnits.toLocaleString()} units`,
    },
  ],

  steps: [
    {
      id: "cm-per-unit",
      question: "What is the contribution margin per unit?",
      resultType: "money-small",
      unit: "$ per unit",
      solve: (data) => data.price - data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Contribution Margin per Unit",
          formula: "Selling Price − Variable Cost",
          values: `$${data.price} − $${data.variableCost}`,
          result: `$${correctValue} per unit`,
          highlight: true,
        },
      ],
    },
    {
      id: "cm-ratio",
      question: "What is the contribution margin ratio?",
      resultType: "percent",
      unit: "%",
      solve: (data, prior) =>
        Math.round((prior["cm-per-unit"] / data.price) * 1000) / 10,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Contribution Margin Ratio",
          formula: "CM per Unit ÷ Selling Price",
          values: `$${prior["cm-per-unit"]} ÷ $${data.price}`,
          result: `${correctValue}%`,
          highlight: true,
          annotation: carryForwardNote(
            "cm-per-unit",
            "1",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "bep-units",
      question: "What is the breakeven point in units?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) => Math.ceil(data.fixedCosts / prior["cm-per-unit"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Breakeven Point in Units",
          formula: "Fixed Costs ÷ CM per Unit",
          values: `$${data.fixedCosts.toLocaleString()} ÷ $${prior["cm-per-unit"]}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          annotation: carryForwardNote(
            "cm-per-unit",
            "1",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "bep-revenue",
      question: "What is the breakeven point in revenue dollars?",
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) => prior["bep-units"] * data.price,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Breakeven Revenue",
          formula: "Breakeven Units × Selling Price",
          values: `${prior["bep-units"].toLocaleString()} × $${data.price}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "bep-units",
            "3",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Target Operating Income
// ============================================================================
// Skills: pretax target income, CVP target formula, units & revenue for target OI.

export const targetOperatingIncome = {
  id: "ch03-target-oi",
  title: "Target Operating Income",
  chapter: 3,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Find the units and revenue required to achieve a target operating income.",
  reviewChapters: CH03_REVIEW,

  randomize: () => {
    const price = randomInRange(50, 100, 1);
    const variableCost = randomInRange(20, Math.floor(price * 0.65), 1);
    const fixedCosts = roundToNearest(randomInRange(80000, 200000), 5000);
    // Target OI: meaningful but achievable — between 0.3x and 0.8x of fixed costs
    const targetOI = roundToNearest(
      randomInRange(Math.round(fixedCosts * 0.3), Math.round(fixedCosts * 0.8)),
      5000,
    );
    return { price, variableCost, fixedCosts, targetOI };
  },

  given: (data) => [
    { label: "Selling price per unit", value: `$${data.price}` },
    { label: "Variable cost per unit", value: `$${data.variableCost}` },
    { label: "Fixed costs", value: `$${data.fixedCosts.toLocaleString()}` },
    {
      label: "Target operating income",
      value: `$${data.targetOI.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "cm-per-unit",
      question: "What is the contribution margin per unit?",
      resultType: "money-small",
      unit: "$ per unit",
      solve: (data) => data.price - data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Contribution Margin per Unit",
          formula: "Selling Price − Variable Cost",
          values: `$${data.price} − $${data.variableCost}`,
          result: `$${correctValue} per unit`,
          highlight: true,
        },
      ],
    },
    {
      id: "target-units",
      question:
        "How many units must be sold to achieve the target operating income?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) =>
        Math.ceil((data.fixedCosts + data.targetOI) / prior["cm-per-unit"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Units for Target Operating Income",
          formula: "(Fixed Costs + Target OI) ÷ CM per Unit",
          values: `($${data.fixedCosts.toLocaleString()} + $${data.targetOI.toLocaleString()}) ÷ $${prior["cm-per-unit"]}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          annotation: carryForwardNote(
            "cm-per-unit",
            "1",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "target-revenue",
      question:
        "What revenue is required to achieve the target operating income?",
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) => prior["target-units"] * data.price,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Revenue at Target Units",
          formula: "Target Units × Selling Price",
          values: `${prior["target-units"].toLocaleString()} × $${data.price}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "target-units",
            "2",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
        },
      ],
    },
    {
      id: "units-above-bep",
      question:
        "How many units above breakeven are required to hit the target OI?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) => Math.ceil(data.targetOI / prior["cm-per-unit"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Incremental Units Above Breakeven",
          formula: "Target OI ÷ CM per Unit",
          values: `$${data.targetOI.toLocaleString()} ÷ $${prior["cm-per-unit"]}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          annotation: carryForwardNote(
            "cm-per-unit",
            "1",
            prior,
            studentAnswers,
          ),
          note: "Each unit beyond breakeven adds CM directly to operating income.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Target Net Income with Taxes
// ============================================================================
// Skills: convert after-tax NI target to pretax target, then CVP target formula.

export const targetNetIncomeWithTaxes = {
  id: "ch03-target-ni-tax",
  title: "Target Net Income with Taxes",
  chapter: 3,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Convert an after-tax net income target to a pretax target, then find required units and revenue.",
  reviewChapters: CH03_REVIEW,

  randomize: () => {
    const price = randomInRange(60, 120, 1);
    const variableCost = randomInRange(25, Math.floor(price * 0.6), 1);
    const fixedCosts = roundToNearest(randomInRange(100000, 250000), 5000);
    const targetNI = roundToNearest(
      randomInRange(
        Math.round(fixedCosts * 0.25),
        Math.round(fixedCosts * 0.6),
      ),
      5000,
    );
    // Tax rate: 20%, 25%, or 30% — common exam rates
    const taxRate = [0.2, 0.25, 0.3][Math.floor(Math.random() * 3)];
    return { price, variableCost, fixedCosts, targetNI, taxRate };
  },

  given: (data) => [
    { label: "Selling price per unit", value: `$${data.price}` },
    { label: "Variable cost per unit", value: `$${data.variableCost}` },
    { label: "Fixed costs", value: `$${data.fixedCosts.toLocaleString()}` },
    {
      label: "Target net income (after tax)",
      value: `$${data.targetNI.toLocaleString()}`,
    },
    { label: "Tax rate", value: `${(data.taxRate * 100).toFixed(0)}%` },
  ],

  steps: [
    {
      id: "pretax-target",
      question:
        "What is the pretax operating income required to achieve the target net income?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => Math.round(data.targetNI / (1 - data.taxRate)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Pretax Target Operating Income",
          formula: "After-Tax Target ÷ (1 − Tax Rate)",
          values: `$${data.targetNI.toLocaleString()} ÷ (1 − ${data.taxRate.toFixed(2)})`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: `Because ${(data.taxRate * 100).toFixed(0)}% of pretax income goes to taxes, you need a larger pretax figure to net the target.`,
        },
      ],
    },
    {
      id: "cm-per-unit",
      question: "What is the contribution margin per unit?",
      resultType: "money-small",
      unit: "$ per unit",
      solve: (data) => data.price - data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Contribution Margin per Unit",
          formula: "Selling Price − Variable Cost",
          values: `$${data.price} − $${data.variableCost}`,
          result: `$${correctValue} per unit`,
          highlight: true,
        },
      ],
    },
    {
      id: "target-units",
      question: "How many units must be sold to achieve the pretax target?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) =>
        Math.ceil(
          (data.fixedCosts + prior["pretax-target"]) / prior["cm-per-unit"],
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Units to Achieve Pretax Target",
          formula: "(Fixed Costs + Pretax Target) ÷ CM per Unit",
          values: `($${data.fixedCosts.toLocaleString()} + $${prior["pretax-target"].toLocaleString()}) ÷ $${prior["cm-per-unit"]}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          annotation:
            carryForwardNote(
              "pretax-target",
              "1",
              prior,
              studentAnswers,
              (v) => `$${v.toLocaleString()}`,
            ) || carryForwardNote("cm-per-unit", "2", prior, studentAnswers),
        },
      ],
    },
    {
      id: "target-revenue",
      question: "What revenue is required to achieve the pretax target?",
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) => prior["target-units"] * data.price,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Revenue at Target Units",
          formula: "Target Units × Selling Price",
          values: `${prior["target-units"].toLocaleString()} × $${data.price}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "target-units",
            "3",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — Margin of Safety
// ============================================================================
// Skills: margin of safety in units, dollars, and percent. BEP is GIVEN
// to isolate the margin-of-safety concept (per Pass 1 design decision).

export const marginOfSafety = {
  id: "ch03-margin-of-safety",
  title: "Margin of Safety",
  chapter: 3,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Calculate margin of safety in units, dollars, and as a percentage of expected sales.",
  reviewChapters: CH03_REVIEW,

  randomize: () => {
    const price = randomInRange(30, 80, 1);
    const variableCost = randomInRange(10, Math.floor(price * 0.6), 1);
    const cmPerUnit = price - variableCost;
    // Choose a clean BEP in the 3k–12k range
    const bepUnits = roundToNearest(randomInRange(3000, 12000), 100);
    // Expected sales meaningfully above BEP (so MoS % is in a useful range)
    const expectedUnits = roundToNearest(
      ensureGreaterThan(
        Math.round((bepUnits * randomInRange(12, 18)) / 10),
        bepUnits,
        500,
      ),
      100,
    );
    return { price, variableCost, cmPerUnit, bepUnits, expectedUnits };
  },

  given: (data) => [
    { label: "Selling price per unit", value: `$${data.price}` },
    { label: "Variable cost per unit", value: `$${data.variableCost}` },
    {
      label: "Breakeven point",
      value: `${data.bepUnits.toLocaleString()} units`,
    },
    {
      label: "Expected unit sales",
      value: `${data.expectedUnits.toLocaleString()} units`,
    },
  ],

  steps: [
    {
      id: "mos-units",
      question: "What is the margin of safety in units?",
      resultType: "units",
      unit: "units",
      solve: (data) => data.expectedUnits - data.bepUnits,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Margin of Safety (Units)",
          formula: "Expected Sales − Breakeven Sales",
          values: `${data.expectedUnits.toLocaleString()} − ${data.bepUnits.toLocaleString()}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          note: "How far sales can fall before you cease to be profitable.",
        },
      ],
    },
    {
      id: "mos-dollars",
      question: "What is the margin of safety in revenue dollars?",
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) => prior["mos-units"] * data.price,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Margin of Safety (Dollars)",
          formula: "MoS Units × Selling Price",
          values: `${prior["mos-units"].toLocaleString()} × $${data.price}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "mos-units",
            "1",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
        },
      ],
    },
    {
      id: "mos-percent",
      question:
        "What is the margin of safety as a percentage of expected sales?",
      resultType: "percent",
      unit: "%",
      solve: (data, prior) =>
        Math.round((prior["mos-units"] / data.expectedUnits) * 1000) / 10,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Margin of Safety Percentage",
          formula: "MoS Units ÷ Expected Sales",
          values: `${prior["mos-units"].toLocaleString()} ÷ ${data.expectedUnits.toLocaleString()}`,
          result: `${correctValue}%`,
          highlight: true,
          annotation: carryForwardNote(
            "mos-units",
            "1",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
          note: "A higher MoS% means more cushion against demand shortfalls.",
        },
      ],
    },
    {
      id: "mos-revenue-pct",
      question:
        "If sales drop 15% from expected, will you still be above breakeven? Enter the resulting margin of safety in units (use negative value if below breakeven).",
      resultType: "units",
      unit: "units",
      tolerance: { value: 2, type: "absolute" },
      solve: (data) => {
        const droppedSales = Math.round(data.expectedUnits * 0.85);
        return droppedSales - data.bepUnits;
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const droppedSales = Math.round(data.expectedUnits * 0.85);
        return [
          {
            label: "Reduced Sales",
            formula: "Expected Sales × (1 − 0.15)",
            values: `${data.expectedUnits.toLocaleString()} × 0.85`,
            result: `${droppedSales.toLocaleString()} units`,
          },
          {
            label: "New Margin of Safety",
            formula: "Reduced Sales − Breakeven",
            values: `${droppedSales.toLocaleString()} − ${data.bepUnits.toLocaleString()}`,
            result: `${correctValue.toLocaleString()} units`,
            highlight: true,
            note:
              correctValue > 0
                ? "Still profitable after the 15% drop."
                : "Sales drop below breakeven — operating loss.",
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Problem 5 — What-If: Price Change
// ============================================================================
// Skills: recalculate BEP after a price reduction, compare original vs new BEP.

export const whatIfPriceChange = {
  id: "ch03-whatif-price",
  title: "What-If: Price Change",
  chapter: 3,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "A price reduction is being considered. Calculate the impact on contribution margin and breakeven.",
  reviewChapters: CH03_REVIEW,

  randomize: () => {
    const originalPrice = randomInRange(50, 100, 1);
    const variableCost = randomInRange(20, Math.floor(originalPrice * 0.6), 1);
    const fixedCosts = roundToNearest(randomInRange(80000, 200000), 5000);
    // Price reduction: 8% to 18% lower
    const reductionPct = randomInRange(8, 18, 1);
    const newPrice = Math.round(originalPrice * (1 - reductionPct / 100));
    // Make sure new price still exceeds VC by a sensible amount
    const safeNewPrice = ensureGreaterThan(newPrice, variableCost, 3);
    return {
      originalPrice,
      variableCost,
      fixedCosts,
      newPrice: safeNewPrice,
      reductionPct,
    };
  },

  given: (data) => [
    { label: "Original selling price", value: `$${data.originalPrice}` },
    { label: "Variable cost per unit", value: `$${data.variableCost}` },
    { label: "Fixed costs", value: `$${data.fixedCosts.toLocaleString()}` },
    {
      label: "Proposed new price",
      value: `$${data.newPrice} (${data.reductionPct}% reduction)`,
    },
  ],

  steps: [
    {
      id: "original-bep",
      question: "What is the breakeven point in units at the original price?",
      resultType: "units",
      unit: "units",
      solve: (data) =>
        Math.ceil(data.fixedCosts / (data.originalPrice - data.variableCost)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Original CM per Unit",
          formula: "Original Price − Variable Cost",
          values: `$${data.originalPrice} − $${data.variableCost}`,
          result: `$${data.originalPrice - data.variableCost} per unit`,
        },
        {
          label: "Original Breakeven",
          formula: "Fixed Costs ÷ Original CM",
          values: `$${data.fixedCosts.toLocaleString()} ÷ $${data.originalPrice - data.variableCost}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
        },
      ],
    },
    {
      id: "new-cm",
      question:
        "What is the new contribution margin per unit at the reduced price?",
      resultType: "money-small",
      unit: "$ per unit",
      solve: (data) => data.newPrice - data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "New CM per Unit",
          formula: "New Price − Variable Cost",
          values: `$${data.newPrice} − $${data.variableCost}`,
          result: `$${correctValue} per unit`,
          highlight: true,
          note: "A small price cut compresses CM more than you might expect because variable cost stays fixed.",
        },
      ],
    },
    {
      id: "new-bep",
      question: "What is the breakeven point in units at the new price?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) => Math.ceil(data.fixedCosts / prior["new-cm"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "New Breakeven",
          formula: "Fixed Costs ÷ New CM",
          values: `$${data.fixedCosts.toLocaleString()} ÷ $${prior["new-cm"]}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          annotation: carryForwardNote("new-cm", "2", prior, studentAnswers),
        },
      ],
    },
    {
      id: "bep-change-pct",
      question:
        "By what percentage does breakeven increase from the original to the new price?",
      resultType: "percent",
      unit: "%",
      solve: (data, prior) => {
        const change = prior["new-bep"] - prior["original-bep"];
        return Math.round((change / prior["original-bep"]) * 1000) / 10;
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Change in Breakeven",
          formula: "New BEP − Original BEP",
          values: `${prior["new-bep"].toLocaleString()} − ${prior["original-bep"].toLocaleString()}`,
          result: `${(prior["new-bep"] - prior["original-bep"]).toLocaleString()} more units`,
        },
        {
          label: "Percentage Increase",
          formula: "Change ÷ Original BEP",
          values: `${(prior["new-bep"] - prior["original-bep"]).toLocaleString()} ÷ ${prior["original-bep"].toLocaleString()}`,
          result: `${correctValue}%`,
          highlight: true,
          annotation:
            carryForwardNote(
              "original-bep",
              "1",
              prior,
              studentAnswers,
              (v) => `${v.toLocaleString()} units`,
            ) ||
            carryForwardNote(
              "new-bep",
              "3",
              prior,
              studentAnswers,
              (v) => `${v.toLocaleString()} units`,
            ),
          note: `A ${data.reductionPct}% price cut produced a ${correctValue}% increase in breakeven — price changes have outsized leverage on BEP.`,
        },
      ],
    },
  ],
};

// ============================================================================
// Export all problems as an ordered array for the picker UI
// ============================================================================

export const ch03Problems = [
  breakevenBasics,
  targetOperatingIncome,
  targetNetIncomeWithTaxes,
  marginOfSafety,
  whatIfPriceChange,
];
