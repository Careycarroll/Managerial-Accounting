// js/practice/ch21-problems.js
// Chapter 21 — Inventory Management, Just-in-Time, and Simplified Costing
// Pass 2 problems — EOQ, safety stock, reorder points, JIT economics,
// and backflush costing.

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
  randomChoice,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH21_REVIEW = [
  {
    label: "Ch. 21 — Inventory Management, JIT, and Simplified Costing",
    href: `${BASE}pages/learn/ch21.html`,
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
// Problem 1 — EOQ Calculation
// ============================================================================

export const eoqCalculation = {
  id: "ch21-eoq",
  title: "Economic Order Quantity",
  chapter: 21,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Compute the EOQ, the number of orders per year at EOQ, and the total annual relevant cost.",
  reviewChapters: CH21_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "retail" });
    const product = randomProduct({ category: "retail" });

    const annualDemand = roundToNearest(randomInRange(8000, 50000), 1000);
    const orderingCost = randomInRange(20, 80, 5);
    const carryingCostPerUnit = roundTo(
      randomInRange(2, 12, 1) + Math.random() * 0.9,
      2,
    );

    return {
      company,
      product,
      annualDemand,
      orderingCost,
      carryingCostPerUnit,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} sells ${data.product.plural} year-round. Annual demand
    is <strong>${data.annualDemand.toLocaleString()} units</strong>, and demand is
    relatively constant. Each purchase order costs the company
    <strong>$${data.orderingCost}</strong> to process (shipping, paperwork, receiving).
    The cost to carry one unit in inventory for a year — including warehouse space,
    insurance, and capital tied up — is <strong>$${data.carryingCostPerUnit}</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Annual demand (D)",
      value: `${data.annualDemand.toLocaleString()} units`,
    },
    { label: "Cost per order (P)", value: `$${data.orderingCost}` },
    {
      label: "Carrying cost per unit (C)",
      value: `$${data.carryingCostPerUnit}`,
    },
  ],

  steps: [
    {
      id: "eoq",
      question: "What is the Economic Order Quantity (EOQ)?",
      resultType: "units",
      unit: "units",
      tolerance: { value: 5, type: "absolute" },
      solve: (data) =>
        Math.round(
          Math.sqrt(
            (2 * data.annualDemand * data.orderingCost) /
              data.carryingCostPerUnit,
          ),
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Economic Order Quantity",
          formula: "√(2DP ÷ C)",
          values: `√(2 × ${data.annualDemand.toLocaleString()} × $${data.orderingCost} ÷ $${data.carryingCostPerUnit})`,
          result: `${correctValue.toLocaleString()} units per order`,
          highlight: true,
          note: "EOQ minimizes total annual relevant cost (ordering + carrying).",
        },
      ],
    },
    {
      id: "orders-per-year",
      question: "How many orders per year would the company place at EOQ?",
      resultType: "money-small",
      unit: "orders",
      tolerance: { value: 0.5, type: "absolute" },
      solve: (data, prior) => roundTo(data.annualDemand / prior["eoq"], 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Orders per Year",
          formula: "Annual Demand ÷ EOQ",
          values: `${data.annualDemand.toLocaleString()} ÷ ${prior["eoq"].toLocaleString()}`,
          result: `${correctValue} orders`,
          highlight: true,
          annotation: carryForwardNote(
            "eoq",
            "1",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
        },
      ],
    },
    {
      id: "total-relevant-cost",
      question:
        "What is the total annual relevant cost at EOQ (ordering cost + carrying cost)?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data, prior) => {
        const orderingTotal =
          (data.annualDemand / prior["eoq"]) * data.orderingCost;
        const carryingTotal = (prior["eoq"] / 2) * data.carryingCostPerUnit;
        return Math.round(orderingTotal + carryingTotal);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const orderingTotal = Math.round(
          (data.annualDemand / prior["eoq"]) * data.orderingCost,
        );
        const carryingTotal = Math.round(
          (prior["eoq"] / 2) * data.carryingCostPerUnit,
        );
        return [
          {
            label: "Total Ordering Cost",
            formula: "(D ÷ EOQ) × P",
            values: `(${data.annualDemand.toLocaleString()} ÷ ${prior["eoq"].toLocaleString()}) × $${data.orderingCost}`,
            result: `$${orderingTotal.toLocaleString()}`,
          },
          {
            label: "Total Carrying Cost",
            formula: "(EOQ ÷ 2) × C",
            values: `(${prior["eoq"].toLocaleString()} ÷ 2) × $${data.carryingCostPerUnit}`,
            result: `$${carryingTotal.toLocaleString()}`,
          },
          {
            label: "Total Annual Relevant Cost",
            formula: "Ordering + Carrying",
            values: `$${orderingTotal.toLocaleString()} + $${carryingTotal.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            note: "At EOQ, ordering cost equals carrying cost. This is the mathematical property that defines the optimum.",
          },
        ];
      },
    },
    {
      id: "eoq-tradeoff",
      type: "choice",
      intentionalSingleAnswer: true,
      question: "What tradeoff does EOQ optimize?",
      options: [
        {
          id: "ordering-vs-carrying",
          label:
            "Cost of placing orders (favors fewer, larger orders) vs cost of holding inventory (favors more, smaller orders)",
        },
        { id: "price-vs-quality", label: "Purchase price vs supplier quality" },
        {
          id: "demand-vs-supply",
          label: "Customer demand vs supplier capacity",
        },
        {
          id: "fixed-vs-variable",
          label: "Fixed manufacturing costs vs variable manufacturing costs",
        },
      ],
      correctId: () => "ordering-vs-carrying",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "The EOQ Tradeoff",
          formula: "Ordering cost vs Carrying cost",
          values:
            "Fewer, larger orders → low ordering cost, high carrying. More, smaller orders → high ordering cost, low carrying.",
          result: "EOQ is the order size where these two forces balance",
          highlight: true,
          note: "EOQ assumes constant demand, constant lead time, and no quantity discounts. When those assumptions break down, EOQ becomes an approximation rather than an optimum.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Reorder Point & Safety Stock
// ============================================================================

export const reorderPoint = {
  id: "ch21-reorder-point",
  title: "Reorder Point & Safety Stock",
  chapter: 21,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Compute the reorder point with and without safety stock, given variable lead time demand.",
  reviewChapters: CH21_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "retail" });
    const product = randomProduct({ category: "retail" });

    const dailyDemand = randomInRange(20, 200, 5);
    const leadTimeDays = randomInRange(4, 14, 1);
    const safetyStock = roundToNearest(randomInRange(50, 500), 25);

    return { company, product, dailyDemand, leadTimeDays, safetyStock };
  },

  scenario: (data) => `
    <p>${data.company.name} purchases ${data.product.plural} from a supplier with
    a <strong>${data.leadTimeDays}-day lead time</strong>. Average daily demand is
    <strong>${data.dailyDemand} units</strong>. Management wants to maintain
    <strong>${data.safetyStock.toLocaleString()} units</strong> of safety stock to
    protect against unexpected demand spikes or shipping delays.</p>
  `,

  given: (data) => [
    { label: "Daily demand", value: `${data.dailyDemand} units` },
    { label: "Lead time", value: `${data.leadTimeDays} days` },
    {
      label: "Safety stock",
      value: `${data.safetyStock.toLocaleString()} units`,
    },
  ],

  steps: [
    {
      id: "lead-time-demand",
      question: "What is the expected demand during the lead time?",
      resultType: "units",
      unit: "units",
      solve: (data) => data.dailyDemand * data.leadTimeDays,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Lead-Time Demand",
          formula: "Daily Demand × Lead Time",
          values: `${data.dailyDemand} × ${data.leadTimeDays}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
        },
      ],
    },
    {
      id: "rop-no-safety",
      question: "What is the reorder point WITHOUT safety stock?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) => prior["lead-time-demand"],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Reorder Point (no safety)",
          formula: "Lead-Time Demand (no buffer)",
          values: `${prior["lead-time-demand"].toLocaleString()}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          annotation: carryForwardNote(
            "lead-time-demand",
            "1",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
          note: "Without safety stock, you reorder exactly when inventory hits the lead-time demand level — risky if demand or lead time varies.",
        },
      ],
    },
    {
      id: "rop-with-safety",
      question: "What is the reorder point WITH safety stock?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) => prior["lead-time-demand"] + data.safetyStock,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Reorder Point (with safety)",
          formula: "Lead-Time Demand + Safety Stock",
          values: `${prior["lead-time-demand"].toLocaleString()} + ${data.safetyStock.toLocaleString()}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          annotation: carryForwardNote(
            "lead-time-demand",
            "1",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
          note: "Safety stock provides a cushion against demand variability and lead-time variability. It costs carrying cost but reduces stockout cost.",
        },
      ],
    },
    {
      id: "safety-stock-tradeoff",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "What is the primary tradeoff in setting the level of safety stock?",
      options: [
        {
          id: "stockout-vs-carrying",
          label:
            "Cost of stockouts (lost sales, expediting, customer dissatisfaction) vs cost of carrying extra inventory",
        },
        {
          id: "price-vs-quality",
          label: "Purchase price discounts vs product quality",
        },
        { id: "lead-time-vs-quality", label: "Lead time vs supplier quality" },
        { id: "fixed-vs-variable", label: "Fixed costs vs variable costs" },
      ],
      correctId: () => "stockout-vs-carrying",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Safety Stock Tradeoff",
          formula:
            "Higher safety stock → fewer stockouts but more carrying cost",
          values:
            "Stockout costs are often hard to quantify (lost goodwill, lost future sales) — so the optimal safety stock level depends on management's risk tolerance.",
          result: "Stockout cost vs carrying cost",
          highlight: true,
          note: "Statistical methods using demand standard deviation can produce an optimal safety stock for a target service level, but qualitative judgment usually plays a role.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — EOQ Sensitivity
// ============================================================================

export const eoqSensitivity = {
  id: "ch21-eoq-sensitivity",
  title: "EOQ Sensitivity Analysis",
  chapter: 21,
  difficulty: "intermediate",
  estimatedMinutes: 6,
  description:
    "Compare total cost at EOQ vs at order sizes deviating from EOQ — discover why EOQ is forgiving.",
  reviewChapters: CH21_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "retail" });
    const annualDemand = roundToNearest(randomInRange(10000, 40000), 1000);
    const orderingCost = randomInRange(30, 70, 5);
    const carryingCostPerUnit = roundTo(
      randomInRange(3, 9, 1) + Math.random() * 0.9,
      2,
    );

    const eoq = Math.round(
      Math.sqrt((2 * annualDemand * orderingCost) / carryingCostPerUnit),
    );
    const tooSmall = Math.round(eoq * 0.5);
    const tooLarge = Math.round(eoq * 2);

    return {
      company,
      annualDemand,
      orderingCost,
      carryingCostPerUnit,
      eoq,
      tooSmall,
      tooLarge,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} has computed an EOQ of approximately
    <strong>${data.eoq.toLocaleString()} units</strong> for one of its key
    products (D = ${data.annualDemand.toLocaleString()}, P = $${data.orderingCost},
    C = $${data.carryingCostPerUnit}). Management is considering whether to order
    much smaller batches (about half the EOQ) or much larger batches (about
    double the EOQ) for operational reasons.</p>
  `,

  given: (data) => [
    { label: "Annual demand", value: `${data.annualDemand.toLocaleString()}` },
    { label: "Cost per order", value: `$${data.orderingCost}` },
    { label: "Carrying cost per unit", value: `$${data.carryingCostPerUnit}` },
    { label: "EOQ", value: `${data.eoq.toLocaleString()} units` },
    {
      label: "Small order option",
      value: `${data.tooSmall.toLocaleString()} units`,
    },
    {
      label: "Large order option",
      value: `${data.tooLarge.toLocaleString()} units`,
    },
  ],

  steps: [
    {
      id: "total-cost-eoq",
      question: "What is the total annual relevant cost at EOQ?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data) => {
        const ordering = (data.annualDemand / data.eoq) * data.orderingCost;
        const carrying = (data.eoq / 2) * data.carryingCostPerUnit;
        return Math.round(ordering + carrying);
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Total Cost @ EOQ",
          formula: "(D ÷ Q)P + (Q ÷ 2)C",
          values: `(${data.annualDemand.toLocaleString()} ÷ ${data.eoq.toLocaleString()}) × $${data.orderingCost} + (${data.eoq.toLocaleString()} ÷ 2) × $${data.carryingCostPerUnit}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "total-cost-small",
      question:
        "What is the total annual relevant cost at the SMALL order size?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data) => {
        const ordering =
          (data.annualDemand / data.tooSmall) * data.orderingCost;
        const carrying = (data.tooSmall / 2) * data.carryingCostPerUnit;
        return Math.round(ordering + carrying);
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Total Cost @ Small Order",
          formula: "(D ÷ Q)P + (Q ÷ 2)C",
          values: `(${data.annualDemand.toLocaleString()} ÷ ${data.tooSmall.toLocaleString()}) × $${data.orderingCost} + (${data.tooSmall.toLocaleString()} ÷ 2) × $${data.carryingCostPerUnit}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "Smaller orders → more orders per year → much higher ordering cost.",
        },
      ],
    },
    {
      id: "total-cost-large",
      question:
        "What is the total annual relevant cost at the LARGE order size?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data) => {
        const ordering =
          (data.annualDemand / data.tooLarge) * data.orderingCost;
        const carrying = (data.tooLarge / 2) * data.carryingCostPerUnit;
        return Math.round(ordering + carrying);
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Total Cost @ Large Order",
          formula: "(D ÷ Q)P + (Q ÷ 2)C",
          values: `(${data.annualDemand.toLocaleString()} ÷ ${data.tooLarge.toLocaleString()}) × $${data.orderingCost} + (${data.tooLarge.toLocaleString()} ÷ 2) × $${data.carryingCostPerUnit}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "Larger orders → fewer orders per year (low ordering cost) but much higher average inventory (high carrying cost).",
        },
      ],
    },
    {
      id: "sensitivity-insight",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "What does the comparison tell you about EOQ as a decision tool?",
      options: [
        {
          id: "forgiving-near-optimum",
          label:
            "EOQ is fairly forgiving — total cost rises gradually for moderate deviations, so EOQ is a useful benchmark even when assumptions are imperfect",
        },
        {
          id: "must-be-exact",
          label: "EOQ must be followed exactly or total costs explode",
        },
        {
          id: "irrelevant",
          label:
            "EOQ is irrelevant in practice because demand is always variable",
        },
        {
          id: "only-for-perishable",
          label: "EOQ only works for perishable goods",
        },
      ],
      correctId: () => "forgiving-near-optimum",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "EOQ Sensitivity",
          formula: "Total cost curve is flat near the optimum",
          values:
            "A 50% deviation in order size typically increases total cost by only 10–25%. Even rough approximations of EOQ inputs give near-optimal results.",
          result:
            "EOQ is robust to estimation error — a useful planning tool even with imperfect inputs",
          highlight: true,
          note: "This is why EOQ has remained widely used despite being over 100 years old. Modern systems use it as a baseline before layering in lead-time variability, quantity discounts, and stockout-cost analysis.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — JIT vs Traditional Comparison
// ============================================================================

export const jitComparison = {
  id: "ch21-jit-vs-traditional",
  title: "JIT vs Traditional Inventory Costs",
  chapter: 21,
  difficulty: "intermediate",
  estimatedMinutes: 7,
  description:
    "Compare carrying costs under traditional vs JIT inventory policy and identify the prerequisites for JIT success.",
  reviewChapters: CH21_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    const annualDemand = roundToNearest(randomInRange(20000, 80000), 1000);
    const traditionalEoqCarrying = roundTo(randomInRange(3, 10, 1), 1);

    // Traditional: average inventory = EOQ/2 = some moderate amount
    const traditionalAvgInventory = roundToNearest(
      randomInRange(2000, 8000),
      100,
    );
    const traditionalCarryingTotal = Math.round(
      traditionalAvgInventory * traditionalEoqCarrying,
    );

    // JIT: very small avg inventory (10-20% of traditional)
    const jitAvgInventory = Math.round(
      (traditionalAvgInventory * randomInRange(8, 20, 2)) / 100,
    );
    const jitCarryingTotal = Math.round(
      jitAvgInventory * traditionalEoqCarrying,
    );

    // JIT setup cost reduction + extra reliability investments
    const jitTransitionCost = roundToNearest(randomInRange(20000, 80000), 5000);

    return {
      company,
      annualDemand,
      traditionalEoqCarrying,
      traditionalAvgInventory,
      traditionalCarryingTotal,
      jitAvgInventory,
      jitCarryingTotal,
      jitTransitionCost,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is considering switching from a traditional inventory
    policy to a just-in-time (JIT) system. Under the current traditional policy,
    average inventory is <strong>${data.traditionalAvgInventory.toLocaleString()} units</strong>
    with a carrying cost of <strong>$${data.traditionalEoqCarrying} per unit per year</strong>.
    Under a JIT system, the company estimates it can reduce average inventory to
    <strong>${data.jitAvgInventory.toLocaleString()} units</strong> (same per-unit
    carrying cost). One-time investments to enable JIT (supplier qualification,
    process improvements, training) are estimated at
    <strong>$${data.jitTransitionCost.toLocaleString()}</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Traditional avg inventory",
      value: `${data.traditionalAvgInventory.toLocaleString()} units`,
    },
    {
      label: "JIT avg inventory",
      value: `${data.jitAvgInventory.toLocaleString()} units`,
    },
    {
      label: "Carrying cost per unit",
      value: `$${data.traditionalEoqCarrying}`,
    },
    {
      label: "JIT transition cost (one-time)",
      value: `$${data.jitTransitionCost.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "traditional-carrying",
      question:
        "What is the annual carrying cost under the TRADITIONAL system?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round(data.traditionalAvgInventory * data.traditionalEoqCarrying),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Traditional Carrying Cost",
          formula: "Avg Inventory × Carrying Cost per Unit",
          values: `${data.traditionalAvgInventory.toLocaleString()} × $${data.traditionalEoqCarrying}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "jit-carrying",
      question: "What is the annual carrying cost under the JIT system?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round(data.jitAvgInventory * data.traditionalEoqCarrying),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "JIT Carrying Cost",
          formula: "Avg Inventory × Carrying Cost per Unit",
          values: `${data.jitAvgInventory.toLocaleString()} × $${data.traditionalEoqCarrying}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "first-year-savings",
      question:
        "What is the FIRST-YEAR net savings of switching to JIT (after the transition cost)?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data, prior) =>
        prior["traditional-carrying"] -
        prior["jit-carrying"] -
        data.jitTransitionCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Annual Savings",
          values: `$${prior["traditional-carrying"].toLocaleString()} − $${prior["jit-carrying"].toLocaleString()}`,
          result: `$${(prior["traditional-carrying"] - prior["jit-carrying"]).toLocaleString()}`,
        },
        {
          label: "First-Year Net",
          formula: "Annual Savings − Transition Cost",
          values: `$${(prior["traditional-carrying"] - prior["jit-carrying"]).toLocaleString()} − $${data.jitTransitionCost.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation:
            carryForwardNote(
              "traditional-carrying",
              "1",
              prior,
              studentAnswers,
            ) || carryForwardNote("jit-carrying", "2", prior, studentAnswers),
          note: "Subsequent years would only show the recurring savings (no transition cost). JIT often has a 1-2 year payback period.",
        },
      ],
    },
    {
      id: "jit-prerequisites",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Which of the following is a PREREQUISITE for successful JIT implementation?",
      options: [
        {
          id: "reliable-suppliers",
          label:
            "Highly reliable suppliers with consistent quality and short, predictable lead times",
        },
        {
          id: "large-warehouses",
          label: "Large warehouse space to store backup inventory",
        },
        {
          id: "slow-production",
          label: "Slow production cycles to allow time for quality inspection",
        },
        {
          id: "high-stockout-tolerance",
          label: "A customer base that tolerates frequent stockouts",
        },
      ],
      correctId: () => "reliable-suppliers",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "JIT Prerequisites",
          formula: "JIT depends on supply chain reliability",
          values:
            "Without reliable suppliers, frequent stockouts make JIT more expensive than traditional inventory holding.",
          result:
            "Reliable suppliers with consistent quality and short lead times",
          highlight: true,
          note: "Other prerequisites include: stable demand, close supplier partnerships, quality-at-source production, and information systems that support real-time communication.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Backflush Costing
// ============================================================================

export const backflushCosting = {
  id: "ch21-backflush",
  title: "Backflush Costing",
  chapter: 21,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Identify trigger points and the conditions under which backflush costing is appropriate.",
  reviewChapters: CH21_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    return { company, product };
  },

  scenario: (data) => `
    <p>${data.company.name} is considering replacing its detailed cost-tracking
    system with backflush costing for its ${data.product.singular} line. Under
    backflush costing, journal entries are deferred until specific trigger points,
    and inventory accounts are "backed into" rather than tracked continuously.</p>
  `,

  given: (data) => [
    { label: "Company", value: data.company.name },
    { label: "Product line", value: data.product.singular },
  ],

  steps: [
    {
      id: "common-triggers",
      type: "choice",
      question:
        "In most backflush-costing systems, where are the journal-entry trigger points?",
      options: [
        {
          id: "purchase-and-finished",
          label:
            "When materials are PURCHASED and when finished goods are SOLD (or completed)",
        },
        {
          id: "every-stage",
          label:
            "Every stage of production — raw materials, WIP, finished goods, sold",
        },
        {
          id: "only-period-end",
          label: "Only at period-end when financial statements are prepared",
        },
        {
          id: "only-completion",
          label: "Only when products are physically completed",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "purchase-and-finished",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Trigger Points",
          formula:
            "Variants: 2-trigger (purchase + sale), 1-trigger (sale only)",
          values:
            "Eliminates separate WIP accounting. When production cycle times are very short and inventories are minimal, the WIP details add minimal information.",
          result: "Purchase of materials and completion/sale of finished goods",
          highlight: true,
          note: "Some firms use a single trigger (sale only). The key idea is to bypass continuous tracking of inventories that don't exist for long.",
        },
      ],
    },
    {
      id: "when-appropriate",
      type: "choice",
      question:
        "For which type of operation is backflush costing MOST appropriate?",
      options: [
        {
          id: "jit-fast-cycle",
          label:
            "JIT-style operations with very short production cycles and minimal WIP inventory",
        },
        { id: "long-projects", label: "Long-duration construction projects" },
        {
          id: "high-variety-low-volume",
          label: "High-mix, low-volume custom production",
        },
        {
          id: "process-with-large-wip",
          label: "Process operations with large WIP inventories",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "jit-fast-cycle",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "When to Use Backflush",
          formula: "Backflush works when WIP and FG inventories are small",
          values:
            "JIT environments naturally have minimal inventory at any point in time. Detailed tracking provides little value when there's little to track.",
          result: "JIT operations with fast cycles and minimal inventory",
          highlight: true,
          note: "Backflush would distort cost reporting in long-cycle or high-WIP operations. Always tailor the costing system to the production environment, not the other way around.",
        },
      ],
    },
    {
      id: "tradeoff",
      type: "choice",
      intentionalSingleAnswer: true,
      question: "What is the main tradeoff in adopting backflush costing?",
      options: [
        {
          id: "simplicity-vs-detail",
          label:
            "Simplicity and reduced administrative cost vs loss of detailed cost-flow tracking through production",
        },
        { id: "accuracy-vs-speed", label: "Accuracy vs reporting speed" },
        {
          id: "tax-vs-financial",
          label: "Tax reporting vs financial reporting",
        },
        { id: "fixed-vs-variable", label: "Fixed costs vs variable costs" },
      ],
      correctId: () => "simplicity-vs-detail",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "The Backflush Tradeoff",
          formula: "Simpler bookkeeping vs less granular cost data",
          values:
            "You lose the ability to identify WIP-specific cost variances or analyze cost flow through production stages.",
          result:
            "Acceptable when WIP is minimal and the simplification provides real administrative savings",
          highlight: true,
          note: "In JIT environments, you're usually using SPC and other production metrics for control purposes, so the lost cost detail is replaceable with operational data.",
        },
      ],
    },
  ],
};

// ============================================================================
// Export
// ============================================================================


// ============================================================================
// Problem 6 — Quantity Discount Decision
// ============================================================================

export const quantityDiscount = {
  id: 'ch21-quantity-discount',
  title: 'Quantity Discount Decision',
  chapter: 21,
  difficulty: 'intermediate',
  estimatedMinutes: 8,
  description:
    'A supplier offers a price discount for ordering in larger quantities. Compare total annual cost at EOQ vs at the discount break.',
  reviewChapters: CH21_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'retail' });

    const annualDemand = roundToNearest(randomInRange(10000, 30000), 1000);
    const orderingCost = randomInRange(40, 80, 5);
    const carryingPctOfPrice = roundTo(randomInRange(15, 30, 1) / 100, 2);

    // Regular price and discount tier
    const regularPrice = randomInRange(20, 60, 5);
    const discountPct = randomInRange(2, 6, 1) / 100;
    const discountPrice = roundTo(regularPrice * (1 - discountPct), 2);

    // Discount threshold (must be larger than EOQ to force the tradeoff)
    const carryingPerUnit = regularPrice * carryingPctOfPrice;
    const eoq = Math.round(Math.sqrt((2 * annualDemand * orderingCost) / carryingPerUnit));
    const discountThreshold = roundToNearest(eoq * randomInRange(140, 180, 10) / 100, 100);

    return {
      company,
      annualDemand, orderingCost, carryingPctOfPrice,
      regularPrice, discountPct, discountPrice,
      eoq, discountThreshold,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} purchases an inventory item at a regular price of
    <strong>$${data.regularPrice}</strong> per unit. The supplier offers a
    <strong>${(data.discountPct * 100).toFixed(0)}% discount</strong> for orders
    of at least <strong>${data.discountThreshold.toLocaleString()} units</strong>.
    Annual demand is <strong>${data.annualDemand.toLocaleString()} units</strong>,
    ordering cost is <strong>$${data.orderingCost}</strong>, and carrying cost is
    <strong>${(data.carryingPctOfPrice * 100).toFixed(0)}% of unit price</strong>
    per year.</p>
  `,

  given: (data) => [
    { label: 'Annual demand', value: `${data.annualDemand.toLocaleString()} units` },
    { label: 'Regular price', value: `$${data.regularPrice} per unit` },
    { label: 'Discount price (orders ≥ threshold)', value: `$${data.discountPrice} per unit` },
    { label: 'Discount threshold', value: `${data.discountThreshold.toLocaleString()} units` },
    { label: 'Ordering cost', value: `$${data.orderingCost}` },
    { label: 'Carrying cost rate', value: `${(data.carryingPctOfPrice * 100).toFixed(0)}% of price` },
  ],

  steps: [
    {
      id: 'eoq-no-discount',
      question: 'What is the EOQ at the REGULAR price (no discount)?',
      resultType: 'units',
      unit: 'units',
      tolerance: { value: 10, type: 'absolute' },
      solve: (data) => {
        const carryingPerUnit = data.regularPrice * data.carryingPctOfPrice;
        return Math.round(Math.sqrt((2 * data.annualDemand * data.orderingCost) / carryingPerUnit));
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const carryingPerUnit = roundTo(data.regularPrice * data.carryingPctOfPrice, 2);
        return [
          {
            label: 'Carrying Cost per Unit (regular price)',
            formula: 'Price × Carrying %',
            values: `$${data.regularPrice} × ${(data.carryingPctOfPrice * 100).toFixed(0)}%`,
            result: `$${carryingPerUnit}`,
          },
          {
            label: 'EOQ',
            formula: '√(2DP ÷ C)',
            values: `√(2 × ${data.annualDemand.toLocaleString()} × $${data.orderingCost} ÷ $${carryingPerUnit})`,
            result: `${correctValue.toLocaleString()} units`,
            highlight: true,
          },
        ];
      },
    },
    {
      id: 'cost-at-eoq',
      question: 'What is the TOTAL annual cost if ordering at EOQ (regular price)? Include purchase cost, ordering cost, and carrying cost.',
      resultType: 'money-large',
      unit: '$',
      tolerance: { value: 1, type: 'percent' },
      solve: (data, prior) => {
        const carryingPerUnit = data.regularPrice * data.carryingPctOfPrice;
        const purchase = data.annualDemand * data.regularPrice;
        const ordering = (data.annualDemand / prior['eoq-no-discount']) * data.orderingCost;
        const carrying = (prior['eoq-no-discount'] / 2) * carryingPerUnit;
        return Math.round(purchase + ordering + carrying);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const carryingPerUnit = roundTo(data.regularPrice * data.carryingPctOfPrice, 2);
        const purchase = Math.round(data.annualDemand * data.regularPrice);
        const ordering = Math.round((data.annualDemand / prior['eoq-no-discount']) * data.orderingCost);
        const carrying = Math.round((prior['eoq-no-discount'] / 2) * carryingPerUnit);
        return [
          {
            label: 'Annual Purchase Cost',
            values: `${data.annualDemand.toLocaleString()} × $${data.regularPrice}`,
            result: `$${purchase.toLocaleString()}`,
          },
          {
            label: 'Annual Ordering Cost',
            values: `(${data.annualDemand.toLocaleString()} ÷ ${prior['eoq-no-discount'].toLocaleString()}) × $${data.orderingCost}`,
            result: `$${ordering.toLocaleString()}`,
          },
          {
            label: 'Annual Carrying Cost',
            values: `(${prior['eoq-no-discount'].toLocaleString()} ÷ 2) × $${carryingPerUnit}`,
            result: `$${carrying.toLocaleString()}`,
          },
          {
            label: 'Total Annual Cost @ EOQ',
            formula: 'Purchase + Ordering + Carrying',
            values: `$${purchase.toLocaleString()} + $${ordering.toLocaleString()} + $${carrying.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
          },
        ];
      },
    },
    {
      id: 'cost-at-discount',
      question: 'What is the TOTAL annual cost if ordering AT the discount threshold (capturing the discount)?',
      resultType: 'money-large',
      unit: '$',
      tolerance: { value: 1, type: 'percent' },
      solve: (data) => {
        const carryingPerUnit = data.discountPrice * data.carryingPctOfPrice;
        const purchase = data.annualDemand * data.discountPrice;
        const ordering = (data.annualDemand / data.discountThreshold) * data.orderingCost;
        const carrying = (data.discountThreshold / 2) * carryingPerUnit;
        return Math.round(purchase + ordering + carrying);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const carryingPerUnit = roundTo(data.discountPrice * data.carryingPctOfPrice, 2);
        const purchase = Math.round(data.annualDemand * data.discountPrice);
        const ordering = Math.round((data.annualDemand / data.discountThreshold) * data.orderingCost);
        const carrying = Math.round((data.discountThreshold / 2) * carryingPerUnit);
        return [
          {
            label: 'Annual Purchase Cost (discounted)',
            values: `${data.annualDemand.toLocaleString()} × $${data.discountPrice}`,
            result: `$${purchase.toLocaleString()}`,
          },
          {
            label: 'Annual Ordering Cost (fewer orders)',
            values: `(${data.annualDemand.toLocaleString()} ÷ ${data.discountThreshold.toLocaleString()}) × $${data.orderingCost}`,
            result: `$${ordering.toLocaleString()}`,
          },
          {
            label: 'Annual Carrying Cost (more inventory)',
            values: `(${data.discountThreshold.toLocaleString()} ÷ 2) × $${carryingPerUnit}`,
            result: `$${carrying.toLocaleString()}`,
          },
          {
            label: 'Total Annual Cost @ Discount',
            formula: 'Purchase + Ordering + Carrying (all at discount terms)',
            values: 'Sum of above',
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            note: 'Note: Ordering cost falls (fewer orders) but carrying cost rises (larger batches).',
          },
        ];
      },
    },
    {
      id: 'savings',
      question: 'What are the NET annual savings of accepting the discount? (Cost @ EOQ − Cost @ Discount. Positive = savings, negative = extra cost.)',
      resultType: 'money-medium',
      unit: '$',
      tolerance: { value: 1, type: 'percent' },
      solve: (data, prior) => prior['cost-at-eoq'] - prior['cost-at-discount'],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Net Annual Savings',
          formula: 'Cost @ EOQ − Cost @ Discount',
          values: `$${prior['cost-at-eoq'].toLocaleString()} − $${prior['cost-at-discount'].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: correctValue > 0
            ? 'Positive — discount savings outweigh extra carrying cost.'
            : 'Negative — extra carrying cost from larger batches exceeds the discount savings.',
        },
      ],
    },
    {
      id: 'decision',
      type: 'choice',
      intentionalSingleAnswer: true,
      question: 'Should the company accept the quantity discount?',
      options: [
        { id: 'accept-positive', label: 'Accept — total cost drops despite higher carrying cost' },
        { id: 'reject-negative', label: 'Reject — extra carrying cost from larger batches exceeds discount savings' },
        { id: 'accept-purchase-discount', label: 'Accept — any purchase discount is worth taking' },
        { id: 'reject-larger-orders', label: 'Reject — larger orders increase risk regardless of cost' },
      ],
      correctId: (data, prior) => prior['savings'] > 0 ? 'accept-positive' : 'reject-negative',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Decision Rule',
          formula: 'Accept discount only if total annual cost falls',
          values: `Net change: $${prior['savings'].toLocaleString()}`,
          result: correctId === 'accept-positive' ? 'Accept' : 'Reject',
          highlight: true,
          note: 'Quantity discounts are tempting because the purchase price falls, but they always come with higher carrying cost. The right comparison is total annual cost.',
        },
      ],
    },
  ],
};

export const ch21Problems = [
  eoqCalculation,
  reorderPoint,
  eoqSensitivity,
  jitComparison,
  backflushCosting,
  quantityDiscount,
];
