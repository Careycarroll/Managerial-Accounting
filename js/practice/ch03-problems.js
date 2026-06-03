// js/practice/ch03-problems.js
// Chapter 3 — Cost-Volume-Profit Analysis
// Foundation-tier practice problems.
//
// Conforms to js/practice/SPEC.md.
// Five problems, each with randomize() / given() / steps[].

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from './scenario-pools.js';

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


// ============================================================================
// Problem 6 — Sales-Mix CVP (Multi-Product Breakeven)
// ============================================================================

export const salesMixCVP = {
  id: 'ch03-sales-mix-cvp',
  title: 'Sales-Mix CVP',
  chapter: 3,
  difficulty: 'intermediate',
  estimatedMinutes: 7,
  description:
    'Compute breakeven units in a multi-product environment using the weighted-average contribution margin.',
  reviewChapters: CH03_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });

    // Product A: lower price, higher volume (standard)
    const priceA = randomInRange(20, 50, 5);
    const vcA = randomInRange(8, Math.floor(priceA * 0.65), 1);
    const cmA = priceA - vcA;

    // Product B: higher price, lower volume (premium)
    const priceB = roundToNearest(priceA * (randomInRange(160, 250, 10) / 100), 5);
    const vcB = randomInRange(Math.round(priceB * 0.4), Math.floor(priceB * 0.65), 1);
    const cmB = priceB - vcB;

    // Sales mix as ratio
    const mixA = randomInRange(2, 5, 1);
    const mixB = randomInRange(1, 3, 1);
    const totalMix = mixA + mixB;
    const mixPctA = roundTo(mixA / totalMix * 100, 0);
    const mixPctB = 100 - mixPctA;

    // Weighted-average CM
    const weightedCM = roundTo((cmA * mixA + cmB * mixB) / totalMix, 2);

    // Fixed costs
    const fixedCosts = roundToNearest(randomInRange(150000, 400000), 5000);

    // Breakeven calculations
    const bepPackages = Math.ceil(fixedCosts / weightedCM);
    const bepA = bepPackages * mixA;
    const bepB = bepPackages * mixB;

    return {
      company,
      priceA, vcA, cmA,
      priceB, vcB, cmB,
      mixA, mixB, totalMix, mixPctA, mixPctB,
      weightedCM, fixedCosts,
      bepPackages, bepA, bepB,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} sells two products. Product A sells for <strong>$${data.priceA}</strong>
    with variable cost <strong>$${data.vcA}</strong> per unit; Product B sells for
    <strong>$${data.priceB}</strong> with variable cost <strong>$${data.vcB}</strong> per unit.
    Historically, the company sells the two products in a sales mix of
    <strong>${data.mixA} A : ${data.mixB} B</strong> (or about ${data.mixPctA}% A and ${data.mixPctB}% B).
    Total fixed costs are <strong>$${data.fixedCosts.toLocaleString()}</strong>.</p>
  `,

  given: (data) => [
    { label: 'Product A: price / VC / CM', value: `$${data.priceA} / $${data.vcA} / $${data.cmA}` },
    { label: 'Product B: price / VC / CM', value: `$${data.priceB} / $${data.vcB} / $${data.cmB}` },
    { label: 'Sales mix (A:B)', value: `${data.mixA}:${data.mixB} (${data.mixPctA}% A, ${data.mixPctB}% B)` },
    { label: 'Total fixed costs', value: `$${data.fixedCosts.toLocaleString()}` },
  ],

  steps: [
    {
      id: 'weighted-cm',
      question: 'What is the weighted-average contribution margin per "package" of products (assuming the company sells the mix as a unit)?',
      resultType: 'money-small',
      unit: '$ per package',
      tolerance: { value: 0.10, type: 'absolute' },
      solve: (data) => roundTo((data.cmA * data.mixA + data.cmB * data.mixB) / data.totalMix, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Weighted-Average CM per Package',
          formula: '(CM_A × Mix_A + CM_B × Mix_B) ÷ Total Mix',
          values: `($${data.cmA} × ${data.mixA} + $${data.cmB} × ${data.mixB}) ÷ ${data.totalMix}`,
          result: `$${correctValue} per package`,
          highlight: true,
          note: 'A "package" represents the unit-mix the company sells together (e.g., for every 3 A sold, 2 B sold).',
        },
      ],
    },
    {
      id: 'bep-packages',
      question: 'What is the breakeven point in number of packages?',
      resultType: 'units',
      unit: 'packages',
      solve: (data, prior) => Math.ceil(data.fixedCosts / prior['weighted-cm']),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Breakeven Packages',
          formula: 'Total Fixed Costs ÷ Weighted-Avg CM',
          values: `$${data.fixedCosts.toLocaleString()} ÷ $${prior['weighted-cm']}`,
          result: `${correctValue.toLocaleString()} packages`,
          highlight: true,
          annotation: carryForwardNote('weighted-cm', '1', prior, studentAnswers, (v) => `$${v}`),
        },
      ],
    },
    {
      id: 'bep-product-a',
      question: 'At breakeven, how many units of Product A are sold?',
      resultType: 'units',
      unit: 'units',
      solve: (data, prior) => prior['bep-packages'] * data.mixA,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Breakeven Units of A',
          formula: 'Breakeven Packages × Mix Ratio of A',
          values: `${prior['bep-packages'].toLocaleString()} × ${data.mixA}`,
          result: `${correctValue.toLocaleString()} units of A`,
          highlight: true,
        },
      ],
    },
    {
      id: 'bep-product-b',
      question: 'At breakeven, how many units of Product B are sold?',
      resultType: 'units',
      unit: 'units',
      solve: (data, prior) => prior['bep-packages'] * data.mixB,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Breakeven Units of B',
          formula: 'Breakeven Packages × Mix Ratio of B',
          values: `${prior['bep-packages'].toLocaleString()} × ${data.mixB}`,
          result: `${correctValue.toLocaleString()} units of B`,
          highlight: true,
        },
      ],
    },
    {
      id: 'mix-shift-impact',
      type: 'choice',
      intentionalSingleAnswer: true,
      question: 'What happens to the breakeven point if the company sells more Product B (higher CM) than the assumed mix?',
      options: [
        { id: 'lower-bep', label: 'Breakeven falls — selling more of the higher-CM product means fixed costs are covered with fewer packages' },
        { id: 'higher-bep', label: 'Breakeven rises — variable costs increase with each higher-margin product' },
        { id: 'unchanged', label: 'Unchanged — sales mix does not affect breakeven' },
        { id: 'depends', label: 'Depends on the absolute price of each product' },
      ],
      correctId: () => 'lower-bep',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Mix Shift Effect',
          formula: 'Higher-CM mix → higher weighted CM → lower BEP',
          values: `Current weighted CM: $${prior['weighted-cm']}. Shifting toward Product B (CM $${data.cmB}) raises the weighted CM.`,
          result: 'Breakeven falls (in packages and in total units)',
          highlight: true,
          note: 'This is why sales-mix planning matters as much as price/volume planning. Pushing sales toward higher-margin products lowers required volume.',
        },
      ],
    },
  ],
};


// ============================================================================
// Problem 7 — Operating Leverage
// ============================================================================

export const operatingLeverage = {
  id: 'ch03-operating-leverage',
  title: 'Operating Leverage',
  chapter: 3,
  difficulty: 'intermediate',
  estimatedMinutes: 6,
  description:
    'Compute the degree of operating leverage and use it to project profit changes from sales changes.',
  reviewChapters: CH03_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });

    const price = randomInRange(40, 100, 5);
    const variableCost = randomInRange(15, Math.floor(price * 0.65), 1);
    const cm = price - variableCost;
    const unitsSold = roundToNearest(randomInRange(5000, 18000), 500);

    const fixedCosts = roundToNearest(randomInRange(80000, 250000), 5000);
    const totalCM = unitsSold * cm;
    const operatingIncome = totalCM - fixedCosts;

    // Make sure OI is positive (otherwise DOL is negative which makes no economic sense)
    const validOI = Math.max(operatingIncome, 10000);
    const validFixed = totalCM - validOI;

    const dol = roundTo(totalCM / validOI, 2);
    const salesIncreasePct = randomInRange(10, 25, 5);

    return {
      company,
      price, variableCost, cm, unitsSold,
      fixedCosts: validFixed, totalCM, operatingIncome: validOI,
      dol, salesIncreasePct,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} sold <strong>${data.unitsSold.toLocaleString()} units</strong>
    at <strong>$${data.price}</strong> each. Variable cost is
    <strong>$${data.variableCost}</strong> per unit. Total fixed costs are
    <strong>$${data.fixedCosts.toLocaleString()}</strong>, leading to current
    operating income of <strong>$${data.operatingIncome.toLocaleString()}</strong>.
    Management is considering a marketing push expected to increase sales by
    <strong>${data.salesIncreasePct}%</strong>.</p>
  `,

  given: (data) => [
    { label: 'Selling price', value: `$${data.price}` },
    { label: 'Variable cost per unit', value: `$${data.variableCost}` },
    { label: 'Contribution margin per unit', value: `$${data.cm}` },
    { label: 'Units sold', value: `${data.unitsSold.toLocaleString()}` },
    { label: 'Total fixed costs', value: `$${data.fixedCosts.toLocaleString()}` },
    { label: 'Current operating income', value: `$${data.operatingIncome.toLocaleString()}` },
    { label: 'Expected sales increase', value: `${data.salesIncreasePct}%` },
  ],

  steps: [
    {
      id: 'total-cm',
      question: 'What is the total contribution margin?',
      resultType: 'money-large',
      unit: '$',
      solve: (data) => data.totalCM,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Total Contribution Margin',
          formula: 'CM per Unit × Units Sold',
          values: `$${data.cm} × ${data.unitsSold.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: 'dol',
      question: 'What is the degree of operating leverage (DOL)?',
      resultType: 'money-small',
      unit: 'times',
      tolerance: { value: 0.05, type: 'absolute' },
      solve: (data, prior) => roundTo(prior['total-cm'] / data.operatingIncome, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Degree of Operating Leverage',
          formula: 'Total CM ÷ Operating Income',
          values: `$${prior['total-cm'].toLocaleString()} ÷ $${data.operatingIncome.toLocaleString()}`,
          result: `${correctValue} times`,
          highlight: true,
          annotation: carryForwardNote('total-cm', '1', prior, studentAnswers),
          note: 'DOL measures sensitivity of operating income to changes in sales. Higher DOL = more variability in profit.',
        },
      ],
    },
    {
      id: 'oi-increase-pct',
      question: 'If sales increase by the projected percentage, what percentage will operating income increase by?',
      resultType: 'percent',
      unit: '%',
      tolerance: { value: 1, type: 'absolute' },
      solve: (data, prior) => roundTo(prior['dol'] * data.salesIncreasePct, 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Operating Income % Increase',
          formula: 'DOL × Sales % Change',
          values: `${prior['dol']} × ${data.salesIncreasePct}%`,
          result: `${correctValue}%`,
          highlight: true,
          annotation: carryForwardNote('dol', '2', prior, studentAnswers, (v) => `${v} times`),
          note: 'DOL is the multiplier: every 1% change in sales produces DOL% change in operating income.',
        },
      ],
    },
    {
      id: 'new-oi',
      question: 'What is the projected new operating income?',
      resultType: 'money-large',
      unit: '$',
      tolerance: { value: 1, type: 'percent' },
      solve: (data, prior) => Math.round(data.operatingIncome * (1 + prior['oi-increase-pct'] / 100)),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'New Operating Income',
          formula: 'Current OI × (1 + OI % Increase)',
          values: `$${data.operatingIncome.toLocaleString()} × (1 + ${prior['oi-increase-pct']}%)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote('oi-increase-pct', '3', prior, studentAnswers, (v) => `${v}%`),
        },
      ],
    },
    {
      id: 'leverage-tradeoff',
      type: 'choice',
      intentionalSingleAnswer: true,
      question: 'What is the strategic tradeoff of having a HIGH operating leverage?',
      options: [
        { id: 'upside-downside', label: 'Higher fixed cost structure amplifies BOTH profit gains in good times AND losses in bad times — risk and reward are linked' },
        { id: 'always-better', label: 'Always better — high leverage means higher profits no matter what' },
        { id: 'always-worse', label: 'Always worse — high leverage means higher risk regardless of sales' },
        { id: 'tax-shelter', label: 'Provides tax shelter through fixed-cost depreciation' },
      ],
      correctId: () => 'upside-downside',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Operating Leverage Tradeoff',
          formula: 'Higher fixed costs → higher DOL → more sensitive to volume',
          values: `Current DOL is ${prior['dol']} times — meaning a 1% sales change produces a ${prior['dol']}% OI change.`,
          result: 'Amplifies both upside and downside',
          highlight: true,
          note: 'Companies with high fixed cost structures (heavy manufacturing, airlines, software) face this tradeoff. Decisions about plant capacity, automation, and outsourcing all affect operating leverage.',
        },
      ],
    },
  ],
};


// ============================================================================
// Problem 8 — CVP Graph Interpretation
// ============================================================================

export const cvpGraphInterpretation = {
  id: 'ch03-cvp-graph',
  title: 'CVP Graph Interpretation',
  chapter: 3,
  difficulty: 'foundation',
  estimatedMinutes: 5,
  description:
    'Read a CVP graph to identify intercepts, breakeven coordinates, and profit/loss zones.',
  reviewChapters: CH03_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });

    const price = randomInRange(40, 90, 5);
    const variableCost = randomInRange(15, Math.floor(price * 0.65), 1);
    const fixedCosts = roundToNearest(randomInRange(60000, 150000), 5000);
    const cm = price - variableCost;
    const bepUnits = Math.ceil(fixedCosts / cm);
    const bepRevenue = bepUnits * price;

    // A specific volume above breakeven for profit-zone interpretation
    const operatingUnits = roundToNearest(bepUnits * (1 + randomInRange(15, 50, 5) / 100), 50);
    const operatingRevenue = operatingUnits * price;
    const operatingTotalCost = fixedCosts + operatingUnits * variableCost;
    const operatingProfit = operatingRevenue - operatingTotalCost;

    return {
      company,
      price, variableCost, cm, fixedCosts,
      bepUnits, bepRevenue,
      operatingUnits, operatingRevenue, operatingTotalCost, operatingProfit,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} prepared a CVP graph showing total revenue and total
    cost as functions of unit sales volume.</p>
    <ul style="margin-left:var(--space-4);">
      <li>Selling price: <strong>$${data.price}</strong> per unit</li>
      <li>Variable cost: <strong>$${data.variableCost}</strong> per unit</li>
      <li>Total fixed costs: <strong>$${data.fixedCosts.toLocaleString()}</strong></li>
    </ul>
    <p>Without drawing the graph, answer questions about its features.</p>
  `,

  given: (data) => [
    { label: 'Selling price', value: `$${data.price}` },
    { label: 'Variable cost per unit', value: `$${data.variableCost}` },
    { label: 'Total fixed costs', value: `$${data.fixedCosts.toLocaleString()}` },
  ],

  steps: [
    {
      id: 'revenue-slope',
      question: 'What is the slope of the total revenue line on the CVP graph?',
      resultType: 'money-small',
      unit: '$ per unit',
      solve: (data) => data.price,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Revenue Line Slope',
          formula: 'Selling price per unit',
          values: `$${data.price}`,
          result: `$${correctValue} per unit`,
          highlight: true,
          note: 'The total revenue line is straight, starting at the origin with slope equal to the selling price.',
        },
      ],
    },
    {
      id: 'total-cost-y-intercept',
      question: 'What is the y-intercept of the total cost line on the CVP graph?',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => data.fixedCosts,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Total Cost Y-Intercept',
          formula: 'Total fixed costs (at zero volume)',
          values: `$${data.fixedCosts.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'Total cost line starts at the fixed-cost level on the y-axis. Each unit produced adds the variable cost to total cost.',
        },
      ],
    },
    {
      id: 'breakeven-units',
      question: 'At what unit volume do the revenue and total cost lines intersect (breakeven)?',
      resultType: 'units',
      unit: 'units',
      solve: (data) => data.bepUnits,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Breakeven Volume',
          formula: 'Fixed Costs ÷ CM per Unit',
          values: `$${data.fixedCosts.toLocaleString()} ÷ $${data.cm}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
        },
      ],
    },
    {
      id: 'profit-at-volume',
      question: `What is the operating profit at ${data => data.operatingUnits} units? (Visible on graph as the vertical gap between revenue and total cost at that volume.)`,
      resultType: 'money-medium',
      unit: '$',
      tolerance: { value: 1, type: 'percent' },
      solve: (data) => data.operatingProfit,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Profit at Operating Volume',
          formula: 'Revenue − Total Cost = Profit',
          values: `($${data.price} × ${data.operatingUnits.toLocaleString()}) − ($${data.fixedCosts.toLocaleString()} + $${data.variableCost} × ${data.operatingUnits.toLocaleString()})`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'Profit zone is the area where the revenue line is above the total cost line. The vertical distance equals operating income at that volume.',
        },
      ],
    },
    {
      id: 'profit-loss-zones',
      type: 'choice',
      intentionalSingleAnswer: true,
      question: 'On the CVP graph, what does the area below the breakeven point represent?',
      options: [
        { id: 'loss-zone', label: 'The loss zone — total cost exceeds revenue, the firm is operating at a loss' },
        { id: 'profit-zone', label: 'The profit zone — sales above this point generate operating income' },
        { id: 'unused-capacity', label: 'Unused capacity — production is below the master-budget level' },
        { id: 'fixed-cost-coverage', label: 'Variable cost recovery zone — fixed costs are fully covered' },
      ],
      correctId: () => 'loss-zone',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Graph Zones',
          formula: 'BEP separates loss zone from profit zone',
          values: `At ${data.bepUnits.toLocaleString()} units, the revenue line crosses the total cost line. Below: loss. Above: profit.`,
          result: 'Loss zone — revenue insufficient to cover total costs',
          highlight: true,
          note: 'Graph reading is a useful skill for boardroom presentations. It conveys the relationship between volume, cost structure, and profitability visually.',
        },
      ],
    },
  ],
};

export const ch03Problems = [
  breakevenBasics,
  targetOperatingIncome,
  targetNetIncomeWithTaxes,
  marginOfSafety,
  whatIfPriceChange,
  salesMixCVP,
  operatingLeverage,
  cvpGraphInterpretation,
];
