// js/practice/ch09-problems.js
// Chapter 9 — Inventory Costing and Capacity Analysis
// Pass 2 problems — absorption vs variable income reconciliation,
// inventory build/draw effects, capacity concepts, denominator choice.

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH09_REVIEW = [
  {
    label: "Ch. 9 — Inventory Costing and Capacity Analysis",
    href: `${BASE}pages/learn/ch09.html`,
  },
];

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
// Problem 1 — Absorption vs Variable Income Reconciliation
// ============================================================================

export const absorptionVsVariable = {
  id: "ch09-absorption-vs-variable",
  title: "Absorption vs Variable — Income Reconciliation",
  chapter: 9,
  difficulty: "foundation",
  estimatedMinutes: 7,
  description:
    "Compute operating income under absorption AND variable costing, then explain the difference using fixed MOH in inventory.",
  reviewChapters: CH09_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const unitsProduced = roundToNearest(randomInRange(8000, 16000), 500);
    const unitsSold = roundToNearest(
      (unitsProduced * randomInRange(75, 95, 5)) / 100,
      100,
    );
    const endingInventory = unitsProduced - unitsSold;

    const price = randomInRange(40, 90, 5);
    const variableMfgPerUnit = randomInRange(15, 35, 1);
    const fixedMfgTotal = roundToNearest(randomInRange(80000, 200000), 5000);
    const fixedMfgPerUnit = roundTo(fixedMfgTotal / unitsProduced, 2);

    const variableSellingPerUnit = randomInRange(2, 8, 1);
    const fixedSellingTotal = roundToNearest(
      randomInRange(40000, 100000),
      5000,
    );

    const revenue = unitsSold * price;
    const varCostOfSales = unitsSold * variableMfgPerUnit;
    const variableSelling = unitsSold * variableSellingPerUnit;

    return {
      company,
      product,
      unitsProduced,
      unitsSold,
      endingInventory,
      price,
      variableMfgPerUnit,
      fixedMfgTotal,
      fixedMfgPerUnit,
      variableSellingPerUnit,
      fixedSellingTotal,
      revenue,
      varCostOfSales,
      variableSelling,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} produced <strong>${data.unitsProduced.toLocaleString()}</strong>
    ${data.product.plural} this year and sold
    <strong>${data.unitsSold.toLocaleString()}</strong> at
    <strong>$${data.price} each</strong>. Variable manufacturing cost is
    <strong>$${data.variableMfgPerUnit} per unit</strong>; total fixed manufacturing
    overhead is <strong>$${data.fixedMfgTotal.toLocaleString()}</strong>. Variable
    selling cost is <strong>$${data.variableSellingPerUnit} per unit sold</strong>;
    total fixed selling cost is <strong>$${data.fixedSellingTotal.toLocaleString()}</strong>.
    Beginning inventory was zero.</p>
  `,

  given: (data) => [
    {
      label: "Units produced",
      value: `${data.unitsProduced.toLocaleString()}`,
    },
    { label: "Units sold", value: `${data.unitsSold.toLocaleString()}` },
    {
      label: "Ending inventory",
      value: `${data.endingInventory.toLocaleString()} units`,
    },
    { label: "Selling price", value: `$${data.price}` },
    { label: "Variable mfg / unit", value: `$${data.variableMfgPerUnit}` },
    {
      label: "Total fixed mfg OH",
      value: `$${data.fixedMfgTotal.toLocaleString()}`,
    },
    {
      label: "Variable selling / unit",
      value: `$${data.variableSellingPerUnit}`,
    },
    {
      label: "Total fixed selling",
      value: `$${data.fixedSellingTotal.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "variable-oi",
      question: "What is operating income under VARIABLE costing?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => {
        const cm = data.revenue - data.varCostOfSales - data.variableSelling;
        return cm - data.fixedMfgTotal - data.fixedSellingTotal;
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const cm = data.revenue - data.varCostOfSales - data.variableSelling;
        return [
          {
            label: "Revenue",
            values: `${data.unitsSold.toLocaleString()} × $${data.price}`,
            result: `$${data.revenue.toLocaleString()}`,
          },
          {
            label: "Variable costs (mfg + selling)",
            values: `$${data.varCostOfSales.toLocaleString()} + $${data.variableSelling.toLocaleString()}`,
            result: `$${(data.varCostOfSales + data.variableSelling).toLocaleString()}`,
          },
          {
            label: "Contribution margin",
            values: "Revenue − Variable Costs",
            result: `$${cm.toLocaleString()}`,
          },
          {
            label: "Operating Income — Variable Costing",
            formula: "CM − Fixed Mfg − Fixed Selling",
            values: `$${cm.toLocaleString()} − $${data.fixedMfgTotal.toLocaleString()} − $${data.fixedSellingTotal.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            note: "Variable costing expenses ALL fixed manufacturing OH in the period incurred.",
          },
        ];
      },
    },
    {
      id: "absorption-oi",
      question: "What is operating income under ABSORPTION costing?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => {
        const cogsFixedPortion = data.unitsSold * data.fixedMfgPerUnit;
        const cogs = data.varCostOfSales + cogsFixedPortion;
        const grossMargin = data.revenue - cogs;
        return Math.round(
          grossMargin - data.variableSelling - data.fixedSellingTotal,
        );
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const cogsFixedPortion = Math.round(
          data.unitsSold * data.fixedMfgPerUnit,
        );
        const cogs = data.varCostOfSales + cogsFixedPortion;
        const grossMargin = data.revenue - cogs;
        return [
          {
            label: "Fixed MOH per unit",
            values: `$${data.fixedMfgTotal.toLocaleString()} ÷ ${data.unitsProduced.toLocaleString()}`,
            result: `$${data.fixedMfgPerUnit}`,
          },
          {
            label: "COGS (variable + fixed)",
            values: `$${data.varCostOfSales.toLocaleString()} + $${cogsFixedPortion.toLocaleString()}`,
            result: `$${cogs.toLocaleString()}`,
            note: "Only the fixed MOH applied to UNITS SOLD goes to COGS — the rest stays in inventory.",
          },
          {
            label: "Gross Margin",
            values: `$${data.revenue.toLocaleString()} − $${cogs.toLocaleString()}`,
            result: `$${grossMargin.toLocaleString()}`,
          },
          {
            label: "Operating Income — Absorption",
            formula: "GM − Variable Selling − Fixed Selling",
            values: `$${grossMargin.toLocaleString()} − $${data.variableSelling.toLocaleString()} − $${data.fixedSellingTotal.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
          },
        ];
      },
    },
    {
      id: "income-difference",
      question: "What is the difference (Absorption OI − Variable OI)?",
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) => prior["absorption-oi"] - prior["variable-oi"],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Income Difference",
          formula: "Absorption OI − Variable OI",
          values: `$${prior["absorption-oi"].toLocaleString()} − $${prior["variable-oi"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation:
            carryForwardNote("absorption-oi", "2", prior, studentAnswers) ||
            carryForwardNote("variable-oi", "1", prior, studentAnswers),
          note: `This equals Fixed MOH per unit × Change in inventory = $${data.fixedMfgPerUnit} × ${data.endingInventory.toLocaleString()} = $${Math.round(data.fixedMfgPerUnit * data.endingInventory).toLocaleString()}`,
        },
      ],
    },
    {
      id: "why-absorption-higher",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Production exceeds sales this period. Why is absorption OI higher than variable OI?",
      options: [
        {
          id: "foh-deferred",
          label:
            "Absorption costing defers some fixed MOH to inventory — only the portion attached to units sold hits the income statement",
        },
        {
          id: "higher-revenue",
          label:
            "Absorption costing reports more revenue than variable costing",
        },
        {
          id: "lower-variable-costs",
          label: "Absorption costing has lower variable costs",
        },
        {
          id: "tax-treatment",
          label: "Tax law requires absorption costing to show higher income",
        },
      ],
      correctId: () => "foh-deferred",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Mechanism",
          formula:
            "When inventory grows (production > sales), fixed MOH is deferred into inventory",
          values: `$${data.fixedMfgPerUnit} × ${data.endingInventory.toLocaleString()} = $${Math.round(data.fixedMfgPerUnit * data.endingInventory).toLocaleString()} held back in inventory`,
          result: "Absorption OI is higher by the amount of fixed MOH deferred",
          highlight: true,
          note:
            "Variable costing recognizes all $" +
            data.fixedMfgTotal.toLocaleString() +
            " of fixed MOH in the period. Absorption only recognizes the portion in COGS.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Inventory Build/Draw Direction
// ============================================================================

export const inventoryBuildDraw = {
  id: "ch09-build-draw",
  title: "Inventory Build vs Draw — Income Effects",
  chapter: 9,
  difficulty: "intermediate",
  estimatedMinutes: 6,
  description:
    "Identify whether absorption or variable costing reports higher OI under different production/sales scenarios.",
  reviewChapters: CH09_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    // Pick one of four scenarios randomly
    const scenarios = [
      { type: "build", produced: 12000, sold: 9000, prevInv: 1000 },
      { type: "draw", produced: 8000, sold: 11000, prevInv: 4000 },
      { type: "equal", produced: 10000, sold: 10000, prevInv: 2000 },
      { type: "build", produced: 15000, sold: 11000, prevInv: 0 },
    ];
    const s = scenarios[Math.floor(Math.random() * scenarios.length)];

    const fixedMfgTotal = roundToNearest(randomInRange(100000, 220000), 5000);
    const fixedMfgPerUnit = roundTo(fixedMfgTotal / s.produced, 2);
    const endingInv = s.prevInv + s.produced - s.sold;

    return {
      company,
      unitsProduced: s.produced,
      unitsSold: s.sold,
      beginningInv: s.prevInv,
      endingInv,
      fixedMfgTotal,
      fixedMfgPerUnit,
      scenarioType: s.type,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} reports the following manufacturing activity:</p>
    <ul style="margin-left:var(--space-4);">
      <li>Beginning inventory: <strong>${data.beginningInv.toLocaleString()} units</strong></li>
      <li>Units produced: <strong>${data.unitsProduced.toLocaleString()}</strong></li>
      <li>Units sold: <strong>${data.unitsSold.toLocaleString()}</strong></li>
      <li>Total fixed mfg overhead: <strong>$${data.fixedMfgTotal.toLocaleString()}</strong></li>
    </ul>
  `,

  given: (data) => [
    {
      label: "Beginning inventory",
      value: `${data.beginningInv.toLocaleString()} units`,
    },
    { label: "Produced", value: `${data.unitsProduced.toLocaleString()}` },
    { label: "Sold", value: `${data.unitsSold.toLocaleString()}` },
    {
      label: "Fixed MOH total",
      value: `$${data.fixedMfgTotal.toLocaleString()}`,
    },
    { label: "Fixed MOH per unit", value: `$${data.fixedMfgPerUnit}` },
  ],

  steps: [
    {
      id: "inventory-change",
      question: "What is the change in inventory units (ending − beginning)?",
      resultType: "units",
      unit: "units",
      solve: (data) => data.endingInv - data.beginningInv,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Inventory Change",
          formula: "Ending Inv − Beginning Inv = Produced − Sold",
          values: `${data.endingInv.toLocaleString()} − ${data.beginningInv.toLocaleString()}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          note:
            correctValue > 0
              ? "Inventory is building — production exceeds sales."
              : correctValue < 0
                ? "Inventory is drawing down — sales exceed production."
                : "Production equals sales — no inventory change.",
        },
      ],
    },
    {
      id: "foh-in-ending-inv",
      question:
        "How much fixed MOH is included in ending inventory under absorption costing?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.endingInv * data.fixedMfgPerUnit),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Fixed MOH in Ending Inventory",
          formula: "Ending Inv × Fixed MOH per Unit",
          values: `${data.endingInv.toLocaleString()} × $${data.fixedMfgPerUnit}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "which-shows-higher-oi",
      type: "choice",
      question:
        "Under these conditions, which costing method reports higher operating income?",
      options: [
        {
          id: "absorption-higher",
          label:
            "Absorption — inventory is building, so fixed MOH is deferred to ending inventory",
        },
        {
          id: "variable-higher",
          label:
            "Variable — inventory is drawing down, so prior-period fixed MOH flows through COGS",
        },
        {
          id: "same",
          label: "Same — no inventory change means no income difference",
        },
      ],
      correctId: (data) => {
        const change = data.endingInv - data.beginningInv;
        if (change > 0) return "absorption-higher";
        if (change < 0) return "variable-higher";
        return "same";
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Inventory Direction Rule",
          formula:
            "Absorption higher when inventory builds; Variable higher when inventory draws",
          values: `Change = ${data.endingInv - data.beginningInv} units`,
          result:
            correctId === "absorption-higher"
              ? "Absorption is higher"
              : correctId === "variable-higher"
                ? "Variable is higher"
                : "Same OI under both methods",
          highlight: true,
          note: "This pattern is why absorption-costing managers face perverse incentives — overproducing builds inventory and inflates reported income.",
        },
      ],
    },
    {
      id: "managerial-implication",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Why might absorption costing create undesirable incentives for managers?",
      options: [
        {
          id: "overproduce",
          label:
            "Managers can boost reported income by overproducing — building inventory defers fixed MOH off the income statement",
        },
        {
          id: "underprice",
          label: "Managers will tend to underprice products to boost volume",
        },
        {
          id: "less-marketing",
          label: "Managers spend less on marketing under absorption costing",
        },
        {
          id: "no-incentive-issue",
          label: "There are no incentive issues with absorption costing",
        },
      ],
      correctId: () => "overproduce",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Absorption Incentive Trap",
          formula: "OI increases as inventory grows (absorption only)",
          values:
            "Producing units that won't sell still boosts reported income by parking fixed MOH in inventory.",
          result: "Overproduction is rewarded under absorption costing",
          highlight: true,
          note: "This is exactly why bonus plans tied to absorption OI without inventory caps can lead to massive working-capital problems. Variable costing avoids the trap entirely.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Capacity Concepts
// ============================================================================

export const capacityConcepts = {
  id: "ch09-capacity-concepts",
  title: "Capacity Concepts",
  chapter: 9,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Distinguish theoretical, practical, normal, and master-budget capacity by matching definitions to concepts.",
  reviewChapters: CH09_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    const definitions = [
      {
        label:
          "Maximum possible output assuming 24/7 operation with no downtime or breaks",
        concept: "theoretical",
      },
      {
        label:
          "Maximum sustainable output allowing for unavoidable interruptions (maintenance, breaks, holidays)",
        concept: "practical",
      },
      {
        label:
          "Average level of capacity utilization expected over multiple periods, smoothing seasonal cycles",
        concept: "normal",
      },
      {
        label:
          "The level of capacity utilization expected for the upcoming budget period only",
        concept: "master-budget",
      },
    ];

    // Pick three definitions to ask about
    const shuffled = definitions.slice().sort(() => Math.random() - 0.5);

    // Add a small denominator-rate scenario for the application step
    const budgetedFOH = roundToNearest(randomInRange(180000, 400000), 5000);
    const theoreticalCapacity = roundToNearest(randomInRange(14000, 22000), 500);
    const practicalCapacity = roundToNearest(theoreticalCapacity * (randomInRange(75, 88, 1) / 100), 500);
    const masterBudgetVolume = roundToNearest(practicalCapacity * (randomInRange(70, 85, 1) / 100), 500);

    return {
      company,
      def1: shuffled[0],
      def2: shuffled[1],
      def3: shuffled[2],
      budgetedFOH, theoreticalCapacity, practicalCapacity, masterBudgetVolume,
    };
  },

  scenario: (data) => `
    <p>${data.company.name}'s controller wants to make sure the analyst team can
    distinguish between the four capacity concepts used in cost accounting:
    <strong>theoretical</strong>, <strong>practical</strong>, <strong>normal</strong>,
    and <strong>master-budget</strong> capacity.</p>
  `,

  given: (data) => [
    { label: "Definition 1", value: data.def1.label },
    { label: "Definition 2", value: data.def2.label },
    { label: "Definition 3", value: data.def3.label },
  
    { label: 'Budgeted fixed MOH', value: `$${data.budgetedFOH.toLocaleString()}` },
    { label: 'Theoretical capacity', value: `${data.theoreticalCapacity.toLocaleString()} MH` },
    { label: 'Practical capacity', value: `${data.practicalCapacity.toLocaleString()} MH` },
    { label: 'Master-budget volume', value: `${data.masterBudgetVolume.toLocaleString()} MH` },
  ],

  steps: [
    {
      id: "identify-1",
      type: "choice",
      question: "Which capacity concept matches Definition 1?",
      options: [
        { id: "theoretical", label: "Theoretical capacity" },
        { id: "practical", label: "Practical capacity" },
        { id: "normal", label: "Normal capacity utilization" },
        { id: "master-budget", label: "Master-budget capacity utilization" },
      ],
      correctId: (data) => data.def1.concept,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Definition 1 Match",
          values: data.def1.label,
          result:
            correctId.charAt(0).toUpperCase() +
            correctId.slice(1) +
            " capacity",
          highlight: true,
        },
      ],
    },
    {
      id: "identify-2",
      type: "choice",
      question: "Which capacity concept matches Definition 2?",
      options: [
        { id: "theoretical", label: "Theoretical capacity" },
        { id: "practical", label: "Practical capacity" },
        { id: "normal", label: "Normal capacity utilization" },
        { id: "master-budget", label: "Master-budget capacity utilization" },
      ],
      correctId: (data) => data.def2.concept,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Definition 2 Match",
          values: data.def2.label,
          result:
            correctId.charAt(0).toUpperCase() +
            correctId.slice(1) +
            " capacity",
          highlight: true,
        },
      ],
    },
    {
      id: "identify-3",
      type: "choice",
      question: "Which capacity concept matches Definition 3?",
      options: [
        { id: "theoretical", label: "Theoretical capacity" },
        { id: "practical", label: "Practical capacity" },
        { id: "normal", label: "Normal capacity utilization" },
        { id: "master-budget", label: "Master-budget capacity utilization" },
      ],
      correctId: (data) => data.def3.concept,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Definition 3 Match",
          values: data.def3.label,
          result:
            correctId.charAt(0).toUpperCase() +
            correctId.slice(1) +
            " capacity",
          highlight: true,
          note: "Capacity concept choice affects fixed MOH per unit, which affects unit costs, inventory valuations, and pricing decisions. Different choices for different purposes.",
        },
      ],
    },
    {
      id: 'rate-comparison',
      question: 'Using the budgeted FOH shown, what is the fixed-MOH rate per machine-hour under PRACTICAL capacity vs MASTER-BUDGET volume? (Enter the practical-capacity rate.)',
      resultType: 'money-small',
      unit: '$ per MH',
      tolerance: { value: 0.05, type: 'absolute' },
      solve: (data) => roundTo(data.budgetedFOH / data.practicalCapacity, 2),
      showWork: (data, prior, studentAnswers, correctValue) => {
        const masterRate = roundTo(data.budgetedFOH / data.masterBudgetVolume, 2);
        return [
          {
            label: 'Practical-Capacity Rate',
            formula: 'Budgeted FOH ÷ Practical Capacity',
            values: `$${data.budgetedFOH.toLocaleString()} ÷ ${data.practicalCapacity.toLocaleString()}`,
            result: `$${correctValue} per MH`,
            highlight: true,
          },
          {
            label: 'Master-Budget Rate (for comparison)',
            formula: 'Budgeted FOH ÷ Master-Budget Volume',
            values: `$${data.budgetedFOH.toLocaleString()} ÷ ${data.masterBudgetVolume.toLocaleString()}`,
            result: `$${masterRate} per MH`,
          },
          {
            label: 'Why the Rates Differ',
            formula: 'Same total FOH, different denominators',
            values: `Master-budget gives a ${roundTo((masterRate / correctValue - 1) * 100, 0)}% higher per-unit rate`,
            result: 'Capacity-concept choice has real cost-per-unit consequences',
            note: 'Practical-capacity rate isolates unused-capacity cost as a separate production-volume variance, signaling resource imbalances. Master-budget-volume buries that signal in unit costs.',
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Problem 4 — Denominator-Level Choice & Volume Variance
// ============================================================================

export const denominatorChoice = {
  id: "ch09-denominator-level",
  title: "Denominator-Level Choice",
  chapter: 9,
  difficulty: "intermediate",
  estimatedMinutes: 7,
  description:
    "Compare fixed MOH per unit and resulting volume variance under two different denominator-level choices.",
  reviewChapters: CH09_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const fixedMOH = roundToNearest(randomInRange(180000, 400000), 10000);

    // Two denominator choices: practical (higher) vs master-budget (lower)
    const practicalCapacity = roundToNearest(randomInRange(12000, 20000), 500);
    const masterBudgetVolume = roundToNearest(
      (practicalCapacity * randomInRange(70, 85, 5)) / 100,
      500,
    );
    const actualOutput = roundToNearest(
      (practicalCapacity * randomInRange(65, 90, 5)) / 100,
      500,
    );

    return {
      company,
      product,
      fixedMOH,
      practicalCapacity,
      masterBudgetVolume,
      actualOutput,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} budgets <strong>$${data.fixedMOH.toLocaleString()}</strong>
    of fixed manufacturing overhead and is choosing between two denominator levels
    for computing the standard fixed-MOH rate per ${data.product.singular}:</p>
    <ul style="margin-left:var(--space-4);">
      <li><strong>Practical capacity</strong>: ${data.practicalCapacity.toLocaleString()} units</li>
      <li><strong>Master-budget volume</strong>: ${data.masterBudgetVolume.toLocaleString()} units</li>
    </ul>
    <p>Actual production for the period was
    <strong>${data.actualOutput.toLocaleString()} units</strong>.</p>
  `,

  given: (data) => [
    { label: "Fixed MOH total", value: `$${data.fixedMOH.toLocaleString()}` },
    {
      label: "Practical capacity",
      value: `${data.practicalCapacity.toLocaleString()}`,
    },
    {
      label: "Master-budget volume",
      value: `${data.masterBudgetVolume.toLocaleString()}`,
    },
    { label: "Actual output", value: `${data.actualOutput.toLocaleString()}` },
  ],

  steps: [
    {
      id: "rate-practical",
      question:
        "What is the fixed MOH rate per unit using PRACTICAL capacity as the denominator?",
      resultType: "money-small",
      unit: "$ per unit",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data) => roundTo(data.fixedMOH / data.practicalCapacity, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Rate — Practical Capacity",
          formula: "Fixed MOH ÷ Practical Capacity",
          values: `$${data.fixedMOH.toLocaleString()} ÷ ${data.practicalCapacity.toLocaleString()}`,
          result: `$${correctValue} per unit`,
          highlight: true,
        },
      ],
    },
    {
      id: "rate-master-budget",
      question:
        "What is the fixed MOH rate per unit using MASTER-BUDGET volume as the denominator?",
      resultType: "money-small",
      unit: "$ per unit",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data) => roundTo(data.fixedMOH / data.masterBudgetVolume, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Rate — Master-Budget Volume",
          formula: "Fixed MOH ÷ Master-Budget Volume",
          values: `$${data.fixedMOH.toLocaleString()} ÷ ${data.masterBudgetVolume.toLocaleString()}`,
          result: `$${correctValue} per unit`,
          highlight: true,
          note: 'Lower denominator → higher rate. A unit produced "costs more" on paper, even though the cash spent is identical.',
        },
      ],
    },
    {
      id: "volume-variance-practical",
      question:
        "What is the production-volume variance using PRACTICAL capacity as the denominator? (Enter the magnitude, positive.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) =>
        Math.abs(
          Math.round(
            data.fixedMOH - data.actualOutput * prior["rate-practical"],
          ),
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Production-Volume Variance",
          formula: "Budgeted FOH − (Actual Output × Rate)",
          values: `$${data.fixedMOH.toLocaleString()} − (${data.actualOutput.toLocaleString()} × $${prior["rate-practical"]})`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note:
            data.actualOutput < data.practicalCapacity
              ? "Unfavorable — actual output below practical capacity"
              : "Favorable — actual output exceeds practical capacity",
        },
      ],
    },
    {
      id: "denominator-choice-impact",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Why does the choice of denominator level matter, even though total fixed MOH is unchanged?",
      options: [
        {
          id: "unit-cost-decisions",
          label:
            "It changes the unit cost used for pricing, inventory valuation, and the size of the production-volume variance",
        },
        { id: "cash-flow", label: "It changes the cash outflow for fixed MOH" },
        { id: "cogs-only", label: "It only affects COGS, not anything else" },
        {
          id: "gaap-required",
          label:
            "GAAP requires specific denominator levels for tax purposes only",
        },
      ],
      correctId: () => "unit-cost-decisions",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Denominator Impact",
          formula: "Denominator affects unit cost downstream",
          values:
            "Different unit cost → different pricing decisions, inventory values, gross margins, and reported variances.",
          result:
            "The choice has real consequences even though total spending is the same",
          highlight: true,
          note: "Horngren emphasizes that practical capacity is often preferred because it isolates unused-capacity cost, signaling resource imbalances that would be hidden by master-budget choice.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Method Comparison & When to Use
// ============================================================================

export const methodComparison = {
  id: "ch09-method-comparison",
  title: "Costing Method Selection",
  chapter: 9,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Identify which inventory-costing method best fits each use case.",
  reviewChapters: CH09_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    const cases = [
      {
        situation:
          "External financial reporting that must comply with GAAP and tax rules",
        bestMethod: "absorption",
      },
      {
        situation:
          "Internal performance measurement where managers control variable costs but not fixed capacity decisions",
        bestMethod: "variable",
      },
      {
        situation:
          "Decision-making about a special order in the short run where capacity is unused",
        bestMethod: "variable",
      },
      {
        situation:
          "Throughput-focused production where bottleneck management drives operating decisions",
        bestMethod: "throughput",
      },
      {
        situation: "Quarterly SEC filing for a US-listed manufacturer",
        bestMethod: "absorption",
      },
    ];

    const shuffled = cases.slice().sort(() => Math.random() - 0.5);
    return {
      company,
      case1: shuffled[0],
      case2: shuffled[1],
      case3: shuffled[2],
    };
  },

  scenario: (data) => `
    <p>${data.company.name}'s controller needs to choose between absorption,
    variable, and throughput costing for three different situations.</p>
  `,

  given: (data) => [
    { label: "Situation 1", value: data.case1.situation },
    { label: "Situation 2", value: data.case2.situation },
    { label: "Situation 3", value: data.case3.situation },
  ],

  steps: [
    {
      id: "select-1",
      type: "choice",
      question:
        "For Situation 1, which costing method is required or most appropriate?",
      options: [
        {
          id: "absorption",
          label: "Absorption costing — required by GAAP and IRS",
        },
        {
          id: "variable",
          label: "Variable costing — better for internal decisions",
        },
        {
          id: "throughput",
          label: "Throughput costing — only direct materials in inventory",
        },
      ],
      correctId: (data) => data.case1.bestMethod,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Situation 1 Match",
          values: data.case1.situation,
          result:
            correctId.charAt(0).toUpperCase() + correctId.slice(1) + " costing",
          highlight: true,
        },
      ],
    },
    {
      id: "select-2",
      type: "choice",
      question: "For Situation 2, which costing method is most appropriate?",
      options: [
        { id: "absorption", label: "Absorption costing" },
        { id: "variable", label: "Variable costing" },
        { id: "throughput", label: "Throughput costing" },
      ],
      correctId: (data) => data.case2.bestMethod,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Situation 2 Match",
          values: data.case2.situation,
          result:
            correctId.charAt(0).toUpperCase() + correctId.slice(1) + " costing",
          highlight: true,
        },
      ],
    },
    {
      id: "select-3",
      type: "choice",
      question: "For Situation 3, which costing method is most appropriate?",
      options: [
        { id: "absorption", label: "Absorption costing" },
        { id: "variable", label: "Variable costing" },
        { id: "throughput", label: "Throughput costing" },
      ],
      correctId: (data) => data.case3.bestMethod,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Situation 3 Match",
          values: data.case3.situation,
          result:
            correctId.charAt(0).toUpperCase() + correctId.slice(1) + " costing",
          highlight: true,
          note: "GAAP requires absorption for external reporting. Variable is preferred for performance evaluation and short-run decisions. Throughput is rare but useful when bottleneck capacity dominates.",
        },
      ],
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const ch09Problems = [
  absorptionVsVariable,
  inventoryBuildDraw,
  capacityConcepts,
  denominatorChoice,
  methodComparison,
];
