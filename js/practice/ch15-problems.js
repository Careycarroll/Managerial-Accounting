// js/practice/ch15-problems.js
// Chapter 15 — Cost Allocation, Customer Profitability, and Sales-Variance Analysis
// Pass 2 problems — pairs customer profitability computations with choice steps
// for retain/drop interpretation and pricing decisions.
//
// Conforms to js/practice/SPEC.md (Pass 2).
// Five problems:
//   1. Customer Profitability — Single Customer
//   2. ABC Customer Comparison (small-order trap)
//   3. Sales-Volume Variance
//   4. Sales-Mix vs Sales-Quantity Variance
//   5. Customer Drop Decision with Cost Hierarchy

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH15_REVIEW = [
  {
    label: "Ch. 15 — Cost Allocation and Customer Profitability",
    href: `${BASE}pages/learn/ch15.html`,
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
// Problem 1 — Customer Profitability (Single Customer)
// ============================================================================

export const customerProfitabilitySingle = {
  id: "ch15-customer-profitability",
  title: "Customer Profitability — Single Customer",
  chapter: 15,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Compute customer-level operating income using the cost hierarchy, then decide whether to retain the customer.",
  reviewChapters: CH15_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "distribution" });
    const customerName =
      randomCompany({ category: "retail", includeSuffix: false }).base +
      " Stores";

    const revenue = roundToNearest(randomInRange(120000, 400000), 5000);
    const cogsPercent = randomInRange(60, 75, 1) / 100;
    const cogs = Math.round(revenue * cogsPercent);
    const grossMargin = revenue - cogs;

    const ordersPlaced = roundToNearest(randomInRange(40, 200), 10);
    const costPerOrder = randomInRange(25, 75, 5);
    const orderProcessingCost = ordersPlaced * costPerOrder;

    const deliveries = roundToNearest(randomInRange(30, 150), 5);
    const costPerDelivery = randomInRange(80, 200, 10);
    const deliveryCost = deliveries * costPerDelivery;

    const salesVisits = randomInRange(8, 30, 1);
    const costPerVisit = randomInRange(150, 400, 25);
    const salesVisitCost = salesVisits * costPerVisit;

    return {
      company,
      customerName,
      revenue,
      cogs,
      cogsPercent,
      grossMargin,
      ordersPlaced,
      costPerOrder,
      orderProcessingCost,
      deliveries,
      costPerDelivery,
      deliveryCost,
      salesVisits,
      costPerVisit,
      salesVisitCost,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is analyzing the profitability of one of its retail
    customers, <strong>${data.customerName}</strong>. Last year the customer
    purchased <strong>$${data.revenue.toLocaleString()}</strong> of merchandise.
    Cost of goods sold for these items was
    <strong>$${data.cogs.toLocaleString()}</strong>.</p>
    <p>${data.company.base} tracked the following customer-specific activities:
    <strong>${data.ordersPlaced.toLocaleString()} orders processed</strong> at
    $${data.costPerOrder} each, <strong>${data.deliveries.toLocaleString()} deliveries</strong>
    at $${data.costPerDelivery} each, and <strong>${data.salesVisits} sales visits</strong>
    at $${data.costPerVisit} each.</p>
  `,

  given: (data) => [
    {
      label: "Revenue from customer",
      value: `$${data.revenue.toLocaleString()}`,
    },
    { label: "Cost of goods sold", value: `$${data.cogs.toLocaleString()}` },
    {
      label: "Orders processed",
      value: `${data.ordersPlaced} @ $${data.costPerOrder}`,
    },
    {
      label: "Deliveries",
      value: `${data.deliveries} @ $${data.costPerDelivery}`,
    },
    {
      label: "Sales visits",
      value: `${data.salesVisits} @ $${data.costPerVisit}`,
    },
  ],

  steps: [
    {
      id: "gross-margin",
      question: "What is the gross margin earned on this customer?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => data.grossMargin,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Gross Margin",
          formula: "Revenue − Cost of Goods Sold",
          values: `$${data.revenue.toLocaleString()} − $${data.cogs.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "Gross margin is the starting point — but customer-level costs below the line determine actual profitability.",
        },
      ],
    },
    {
      id: "total-customer-costs",
      question:
        "What are the total customer-level costs (orders + deliveries + sales visits)?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        data.orderProcessingCost + data.deliveryCost + data.salesVisitCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Order Processing",
          values: `${data.ordersPlaced} × $${data.costPerOrder}`,
          result: `$${data.orderProcessingCost.toLocaleString()}`,
        },
        {
          label: "Deliveries",
          values: `${data.deliveries} × $${data.costPerDelivery}`,
          result: `$${data.deliveryCost.toLocaleString()}`,
        },
        {
          label: "Sales Visits",
          values: `${data.salesVisits} × $${data.costPerVisit}`,
          result: `$${data.salesVisitCost.toLocaleString()}`,
        },
        {
          label: "Total Customer-Level Costs",
          formula: "Sum of activity-based costs traced to this customer",
          values: "Sum of above",
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "customer-operating-income",
      question: "What is the customer-level operating income?",
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) =>
        prior["gross-margin"] - prior["total-customer-costs"],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Customer-Level Operating Income",
          formula: "Gross Margin − Customer-Level Costs",
          values: `$${prior["gross-margin"].toLocaleString()} − $${prior["total-customer-costs"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation:
            carryForwardNote("gross-margin", "1", prior, studentAnswers) ||
            carryForwardNote(
              "total-customer-costs",
              "2",
              prior,
              studentAnswers,
            ),
          note: "This is the customer's direct contribution before allocating corporate-level costs.",
        },
      ],
    },
    {
      id: "retain-decision",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Based on the customer-level operating income, what action should the company take?",
      options: [
        {
          id: "retain-profitable",
          label:
            "Retain — the customer generates positive operating income at the customer level",
        },
        {
          id: "review-low-margin",
          label:
            "Retain but renegotiate — the customer generates a loss at the customer level",
        },
        {
          id: "drop-low-gm",
          label:
            "Drop — gross margin alone is not enough to cover allocated corporate overhead",
        },
        {
          id: "cannot-decide",
          label: "Cannot decide without knowing allocated corporate overhead",
        },
      ],
      correctId: (data, prior) =>
        prior["customer-operating-income"] > 0
          ? "retain-profitable"
          : "review-low-margin",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Decision",
          formula: "Customer-Level OI > 0 → retain; ≤ 0 → renegotiate or drop",
          values: `Customer OI = $${prior["customer-operating-income"].toLocaleString()}`,
          result: correctId === "retain-profitable" ? "Retain" : "Renegotiate",
          highlight: true,
          note: "Allocated corporate costs would continue regardless — they're not relevant to the keep/drop decision at the customer level.",
        },
      ],
    },
    {
      id: "cm-per-dollar-revenue",
      question:
        "What is the customer-level operating income as a percentage of revenue?",
      resultType: "percent",
      unit: "%",
      solve: (data, prior) =>
        roundTo((prior["customer-operating-income"] / data.revenue) * 100, 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Customer Margin %",
          formula: "Customer Operating Income ÷ Revenue",
          values: `$${prior["customer-operating-income"].toLocaleString()} ÷ $${data.revenue.toLocaleString()}`,
          result: `${correctValue}%`,
          highlight: true,
          note: "This ratio is what whale-curve analysis uses to rank customers — it normalizes across customer sizes.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — ABC Customer Comparison (Small-Order Trap)
// ============================================================================

export const abcCustomerComparison = {
  id: "ch15-abc-comparison",
  title: "ABC Customer Comparison",
  chapter: 15,
  difficulty: "intermediate",
  estimatedMinutes: 8,
  description:
    "Two customers have identical revenue but very different cost-to-serve. ABC reveals which is actually profitable.",
  reviewChapters: CH15_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "distribution" });
    const custANameBase = randomCompany({
      category: "retail",
      includeSuffix: false,
    }).base;
    const custBNameBase = randomCompany({
      category: "retail",
      includeSuffix: false,
    }).base;

    // Same revenue for both customers
    const revenue = roundToNearest(randomInRange(150000, 350000), 5000);
    const cogsPercent = randomInRange(62, 72, 1) / 100;
    const cogs = Math.round(revenue * cogsPercent);
    const grossMargin = revenue - cogs;

    // Customer A: large infrequent orders (LOW cost-to-serve)
    const ordersA = randomInRange(8, 20, 2);
    const deliveriesA = randomInRange(6, 18, 2);

    // Customer B: many small orders (HIGH cost-to-serve)
    const ordersB = randomInRange(80, 200, 10);
    const deliveriesB = randomInRange(60, 150, 10);

    const costPerOrder = randomInRange(30, 60, 5);
    const costPerDelivery = randomInRange(100, 180, 10);

    const costAToServe = ordersA * costPerOrder + deliveriesA * costPerDelivery;
    const costBToServe = ordersB * costPerOrder + deliveriesB * costPerDelivery;

    const oiA = grossMargin - costAToServe;
    const oiB = grossMargin - costBToServe;

    return {
      company,
      custAName: `${custANameBase} Wholesale`,
      custBName: `${custBNameBase} Boutiques`,
      revenue,
      cogs,
      grossMargin,
      ordersA,
      deliveriesA,
      costAToServe,
      ordersB,
      deliveriesB,
      costBToServe,
      costPerOrder,
      costPerDelivery,
      oiA,
      oiB,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} serves two customers that purchase the same total
    dollar volume each year. <strong>${data.custAName}</strong> places a few large
    orders requiring full pallet deliveries. <strong>${data.custBName}</strong>
    operates many small storefronts and places frequent small orders requiring
    individual deliveries to each location.</p>
    <p>Both customers buy <strong>$${data.revenue.toLocaleString()}</strong> worth
    of merchandise per year with the same gross-margin percentage. Per-activity
    costs: order processing $${data.costPerOrder} per order, delivery $${data.costPerDelivery}
    per delivery. Activity counts: ${data.custAName} placed
    <strong>${data.ordersA} orders</strong> and required <strong>${data.deliveriesA} deliveries</strong>;
    ${data.custBName} placed <strong>${data.ordersB} orders</strong> and required
    <strong>${data.deliveriesB} deliveries</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Revenue (each customer)",
      value: `$${data.revenue.toLocaleString()}`,
    },
    { label: "COGS (each customer)", value: `$${data.cogs.toLocaleString()}` },
    {
      label: `${data.custAName} — orders / deliveries`,
      value: `${data.ordersA} / ${data.deliveriesA}`,
    },
    {
      label: `${data.custBName} — orders / deliveries`,
      value: `${data.ordersB} / ${data.deliveriesB}`,
    },
    { label: "Cost per order", value: `$${data.costPerOrder}` },
    { label: "Cost per delivery", value: `$${data.costPerDelivery}` },
  ],

  steps: [
    {
      id: "cost-a",
      question: `What is the total cost-to-serve for ${(data) => data.custAName}? (Hint: orders + deliveries)`,
      resultType: "money-medium",
      unit: "$",
      solve: (data) => data.costAToServe,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: `Cost-to-Serve — ${data.custAName}`,
          formula: "(Orders × Cost/Order) + (Deliveries × Cost/Delivery)",
          values: `(${data.ordersA} × $${data.costPerOrder}) + (${data.deliveriesA} × $${data.costPerDelivery})`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "cost-b",
      question:
        "What is the total cost-to-serve for the other (small-order) customer?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => data.costBToServe,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: `Cost-to-Serve — ${data.custBName}`,
          formula: "(Orders × Cost/Order) + (Deliveries × Cost/Delivery)",
          values: `(${data.ordersB} × $${data.costPerOrder}) + (${data.deliveriesB} × $${data.costPerDelivery})`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "Many small orders create much higher activity-based costs even when total revenue is identical.",
        },
      ],
    },
    {
      id: "oi-a",
      question: `What is the customer-level operating income for ${(data) => data.custAName}?`,
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) => data.grossMargin - prior["cost-a"],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: `${data.custAName} — Customer OI`,
          formula: "Gross Margin − Cost-to-Serve",
          values: `$${data.grossMargin.toLocaleString()} − $${prior["cost-a"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote("cost-a", "1", prior, studentAnswers),
        },
      ],
    },
    {
      id: "oi-b",
      question: `What is the customer-level operating income for ${(data) => data.custBName}?`,
      resultType: "money-large",
      unit: "$",
      solve: (data, prior) => data.grossMargin - prior["cost-b"],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: `${data.custBName} — Customer OI`,
          formula: "Gross Margin − Cost-to-Serve",
          values: `$${data.grossMargin.toLocaleString()} − $${prior["cost-b"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote("cost-b", "2", prior, studentAnswers),
        },
      ],
    },
    {
      id: "more-profitable",
      type: "choice",
      intentionalSingleAnswer: true,
      question: "Which customer is more profitable, and why?",
      options: [
        {
          id: "a-more-profitable",
          label: `${(data) => data.custAName} — same revenue, but far lower cost-to-serve`,
        },
        {
          id: "b-more-profitable",
          label: `${(data) => data.custBName} — frequent orders create stronger relationship`,
        },
        {
          id: "tied-revenue",
          label: "They are equally profitable because revenue is identical",
        },
        {
          id: "cannot-tell",
          label: "Cannot determine without knowing gross margin %",
        },
      ],
      correctId: (data, prior) =>
        prior["oi-a"] > prior["oi-b"]
          ? "a-more-profitable"
          : "b-more-profitable",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Comparison",
          formula: "Compare customer-level operating incomes",
          values: `$${prior["oi-a"].toLocaleString()} vs $${prior["oi-b"].toLocaleString()}`,
          result:
            correctId === "a-more-profitable"
              ? `${data.custAName} is more profitable`
              : `${data.custBName} is more profitable`,
          highlight: true,
          note: "Identical revenue can produce very different profitability when cost-to-serve varies. This is the classic ABC insight — small frequent orders often look fine on the income statement but lose money once activity costs are traced properly.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Sales-Volume Variance
// ============================================================================

export const salesVolumeVariance = {
  id: "ch15-sales-volume-variance",
  title: "Sales-Volume Variance",
  chapter: 15,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Compute the sales-volume variance and identify whether it is favorable or unfavorable.",
  reviewChapters: CH15_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const budgetedUnits = roundToNearest(randomInRange(8000, 25000), 500);
    const unitDeltaPct = randomInRange(-15, 15, 1);
    const minDelta = Math.ceil(budgetedUnits * 0.05);
    let actualUnits = roundToNearest(
      budgetedUnits * (1 + unitDeltaPct / 100),
      100,
    );
    if (Math.abs(actualUnits - budgetedUnits) < minDelta) {
      actualUnits = budgetedUnits + (unitDeltaPct >= 0 ? minDelta : -minDelta);
    }
    const cmPerUnit = randomInRange(15, 45, 1);
    return { company, budgetedUnits, actualUnits, cmPerUnit };
  },

  scenario: (data) => `
    <p>${data.company.name} budgeted sales of
    <strong>${data.budgetedUnits.toLocaleString()} units</strong> at a budgeted
    contribution margin of <strong>$${data.cmPerUnit} per unit</strong>. Actual
    sales were <strong>${data.actualUnits.toLocaleString()} units</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Budgeted units",
      value: `${data.budgetedUnits.toLocaleString()}`,
    },
    { label: "Actual units", value: `${data.actualUnits.toLocaleString()}` },
    { label: "Budgeted CM per unit", value: `$${data.cmPerUnit}` },
  ],

  steps: [
    {
      id: "unit-difference",
      question:
        "What is the difference between actual and budgeted units? (Enter as a positive number.)",
      resultType: "units",
      unit: "units",
      solve: (data) => Math.abs(data.actualUnits - data.budgetedUnits),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Unit Difference",
          formula: "|Actual Units − Budgeted Units|",
          values: `|${data.actualUnits.toLocaleString()} − ${data.budgetedUnits.toLocaleString()}|`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
        },
      ],
    },
    {
      id: "volume-variance-amount",
      question:
        "What is the magnitude of the sales-volume variance? (Enter as a positive number.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) => prior["unit-difference"] * data.cmPerUnit,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Sales-Volume Variance",
          formula: "Unit Difference × Budgeted CM per Unit",
          values: `${prior["unit-difference"].toLocaleString()} × $${data.cmPerUnit}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "unit-difference",
            "1",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
          note: "The variance uses budgeted CM/unit — sales-price effects are isolated separately.",
        },
      ],
    },
    {
      id: "volume-variance-direction",
      type: "choice",
      question: "Is the sales-volume variance favorable or unfavorable?",
      options: [
        {
          id: "favorable",
          label: "Favorable — actual units exceeded budgeted units",
        },
        {
          id: "unfavorable",
          label: "Unfavorable — actual units fell short of budgeted units",
        },
      ],
      correctId: (data) =>
        data.actualUnits > data.budgetedUnits ? "favorable" : "unfavorable",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Direction",
          formula: "Compare Actual Units to Budgeted Units",
          values: `${data.actualUnits.toLocaleString()} ${data.actualUnits > data.budgetedUnits ? ">" : "<"} ${data.budgetedUnits.toLocaleString()}`,
          result: correctId === "favorable" ? "Favorable" : "Unfavorable",
          highlight: true,
          note: "For revenue/CM variances, more units sold than planned is favorable.",
        },
      ],
    },
    {
      id: "static-budget-cm",
      question: "What was the original static-budget contribution margin?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => data.budgetedUnits * data.cmPerUnit,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Static-Budget CM",
          formula: "Budgeted Units × Budgeted CM per Unit",
          values: `${data.budgetedUnits.toLocaleString()} × $${data.cmPerUnit}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — Sales-Mix vs Sales-Quantity Variance
// ============================================================================

export const salesMixQuantityVariance = {
  id: "ch15-mix-quantity-variance",
  title: "Sales-Mix vs Sales-Quantity Variance",
  chapter: 15,
  difficulty: "advanced",
  estimatedMinutes: 10,
  description:
    "Decompose the total sales-volume variance into sales-mix and sales-quantity components.",
  reviewChapters: CH15_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const budgetedUnitsA = roundToNearest(randomInRange(6000, 12000), 500);
    const budgetedUnitsB = roundToNearest(randomInRange(4000, 10000), 500);
    const cmA = randomInRange(20, 50, 1);
    const cmB = randomInRange(35, 80, 1);

    const budgetedTotal = budgetedUnitsA + budgetedUnitsB;
    const budgetedMixA = budgetedUnitsA / budgetedTotal;

    // Actual totals shifted ±15%; mix shifted as well
    const totalDeltaPct = randomInRange(-12, 12, 2);
    const actualTotal = roundToNearest(
      budgetedTotal * (1 + totalDeltaPct / 100),
      500,
    );

    // Mix shift: A may take more or less share
    const mixDeltaPct = randomInRange(-15, 15, 3);
    const actualMixA = Math.max(
      0.2,
      Math.min(0.8, budgetedMixA + mixDeltaPct / 100),
    );
    const actualUnitsA = Math.round(actualTotal * actualMixA);
    const actualUnitsB = actualTotal - actualUnitsA;

    const budgetedCompositeCM =
      (budgetedUnitsA * cmA + budgetedUnitsB * cmB) / budgetedTotal;

    return {
      company,
      budgetedUnitsA,
      budgetedUnitsB,
      budgetedTotal,
      actualUnitsA,
      actualUnitsB,
      actualTotal,
      cmA,
      cmB,
      budgetedMixA,
      budgetedCompositeCM: roundTo(budgetedCompositeCM, 2),
    };
  },

  scenario: (data) => `
    <p>${data.company.name} sells two products. Budgeted sales: Product A
    <strong>${data.budgetedUnitsA.toLocaleString()} units</strong> at $${data.cmA} CM,
    Product B <strong>${data.budgetedUnitsB.toLocaleString()} units</strong> at $${data.cmB} CM.
    Actual sales: Product A <strong>${data.actualUnitsA.toLocaleString()} units</strong>,
    Product B <strong>${data.actualUnitsB.toLocaleString()} units</strong>. Management
    wants to decompose the volume variance into mix and quantity effects.</p>
  `,

  given: (data) => [
    {
      label: "Budgeted units A / B",
      value: `${data.budgetedUnitsA.toLocaleString()} / ${data.budgetedUnitsB.toLocaleString()}`,
    },
    {
      label: "Actual units A / B",
      value: `${data.actualUnitsA.toLocaleString()} / ${data.actualUnitsB.toLocaleString()}`,
    },
    { label: "Budgeted CM A / B", value: `$${data.cmA} / $${data.cmB}` },
    {
      label: "Budgeted total units",
      value: `${data.budgetedTotal.toLocaleString()}`,
    },
    {
      label: "Actual total units",
      value: `${data.actualTotal.toLocaleString()}`,
    },
    {
      label: "Budgeted composite CM/unit",
      value: `$${data.budgetedCompositeCM}`,
    },
  ],

  steps: [
    {
      id: "budgeted-mix-pct",
      question:
        "What is the budgeted sales-mix percentage for Product A? (Enter as a percent, e.g., 60 for 60%.)",
      resultType: "percent",
      unit: "%",
      solve: (data) => roundTo(data.budgetedMixA * 100, 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Budgeted Mix — Product A",
          formula: "Budgeted Units A ÷ Budgeted Total Units",
          values: `${data.budgetedUnitsA.toLocaleString()} ÷ ${data.budgetedTotal.toLocaleString()}`,
          result: `${correctValue}%`,
          highlight: true,
        },
      ],
    },
    {
      id: "sales-quantity-variance",
      question:
        "What is the magnitude of the sales-quantity variance? (Total volume difference × composite CM. Enter positive.)",
      resultType: "money-large",
      unit: "$",
      solve: (data) =>
        Math.abs(
          (data.actualTotal - data.budgetedTotal) * data.budgetedCompositeCM,
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Sales-Quantity Variance",
          formula: "|Actual Total − Budgeted Total| × Budgeted Composite CM",
          values: `|${data.actualTotal.toLocaleString()} − ${data.budgetedTotal.toLocaleString()}| × $${data.budgetedCompositeCM}`,
          result: `$${Math.round(correctValue).toLocaleString()}`,
          highlight: true,
          note: "Holds the mix constant at budgeted percentages — isolates the pure volume effect.",
        },
      ],
    },
    {
      id: "quantity-direction",
      type: "choice",
      question: "Is the sales-quantity variance favorable or unfavorable?",
      options: [
        {
          id: "favorable",
          label: "Favorable — actual total units exceeded budget",
        },
        {
          id: "unfavorable",
          label: "Unfavorable — actual total units fell short of budget",
        },
      ],
      correctId: (data) =>
        data.actualTotal > data.budgetedTotal ? "favorable" : "unfavorable",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Direction",
          values: `Actual ${data.actualTotal.toLocaleString()} ${data.actualTotal > data.budgetedTotal ? ">" : "<"} Budgeted ${data.budgetedTotal.toLocaleString()}`,
          result: correctId === "favorable" ? "Favorable" : "Unfavorable",
          highlight: true,
        },
      ],
    },
    {
      id: "sales-mix-variance",
      question:
        "What is the magnitude of the sales-mix variance? (Enter positive.) Formula: |Actual mix − Budgeted mix| × Actual total × CM difference, computed for each product and summed.",
      resultType: "money-large",
      unit: "$",
      solve: (data) => {
        // Mix variance = sum over products of (Actual mix% − Budgeted mix%) × Actual total × CM
        const budMixA = data.budgetedUnitsA / data.budgetedTotal;
        const budMixB = data.budgetedUnitsB / data.budgetedTotal;
        const actMixA = data.actualUnitsA / data.actualTotal;
        const actMixB = data.actualUnitsB / data.actualTotal;
        const mixVarA = (actMixA - budMixA) * data.actualTotal * data.cmA;
        const mixVarB = (actMixB - budMixB) * data.actualTotal * data.cmB;
        return Math.round(Math.abs(mixVarA + mixVarB));
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const budMixA = data.budgetedUnitsA / data.budgetedTotal;
        const actMixA = data.actualUnitsA / data.actualTotal;
        const mixVarA = (actMixA - budMixA) * data.actualTotal * data.cmA;
        const mixVarB = -(actMixA - budMixA) * data.actualTotal * data.cmB;
        return [
          {
            label: "Mix Variance — Product A",
            formula: "(Actual Mix% − Budgeted Mix%) × Actual Total × CM",
            values: `(${roundTo(actMixA * 100, 1)}% − ${roundTo(budMixA * 100, 1)}%) × ${data.actualTotal.toLocaleString()} × $${data.cmA}`,
            result: `${mixVarA >= 0 ? "+" : "−"}$${Math.abs(Math.round(mixVarA)).toLocaleString()}`,
          },
          {
            label: "Mix Variance — Product B",
            formula: "Same formula for B",
            values: "Mirror of A (mix shift is zero-sum)",
            result: `${mixVarB >= 0 ? "+" : "−"}$${Math.abs(Math.round(mixVarB)).toLocaleString()}`,
          },
          {
            label: "Total Mix Variance",
            formula: "Sum across products",
            values: "A + B",
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            note: "Holds total volume constant at actual — isolates the effect of shifting toward higher- or lower-CM products.",
          },
        ];
      },
    },
    {
      id: "mix-direction",
      type: "choice",
      question: "Is the sales-mix variance favorable or unfavorable?",
      options: [
        {
          id: "favorable",
          label: "Favorable — mix shifted toward higher-CM product",
        },
        {
          id: "unfavorable",
          label: "Unfavorable — mix shifted toward lower-CM product",
        },
      ],
      correctId: (data) => {
        const budMixA = data.budgetedUnitsA / data.budgetedTotal;
        const actMixA = data.actualUnitsA / data.actualTotal;
        const mixVarA = (actMixA - budMixA) * data.actualTotal * data.cmA;
        const mixVarB = -(actMixA - budMixA) * data.actualTotal * data.cmB;
        return mixVarA + mixVarB > 0 ? "favorable" : "unfavorable";
      },
      showWork: (data, prior, studentAnswers, correctId) => {
        const budMixA = data.budgetedUnitsA / data.budgetedTotal;
        const actMixA = data.actualUnitsA / data.actualTotal;
        const aShifted = actMixA > budMixA;
        const cmAHigher = data.cmA > data.cmB;
        return [
          {
            label: "Direction Analysis",
            formula: "Mix favorable if shift toward higher-CM product",
            values: `Mix shifted toward Product ${aShifted ? "A" : "B"}; Product ${cmAHigher ? "A" : "B"} has higher CM`,
            result: correctId === "favorable" ? "Favorable" : "Unfavorable",
            highlight: true,
          },
        ];
      },
    },
    {
      id: "total-volume-variance",
      question:
        "Confirm: what is the total sales-volume variance? (Mix variance + Quantity variance, using their signs.) Enter positive.",
      resultType: "money-large",
      unit: "$",
      solve: (data) => {
        const quantityVar =
          (data.actualTotal - data.budgetedTotal) * data.budgetedCompositeCM;
        const budMixA = data.budgetedUnitsA / data.budgetedTotal;
        const actMixA = data.actualUnitsA / data.actualTotal;
        const mixVarA = (actMixA - budMixA) * data.actualTotal * data.cmA;
        const mixVarB = -(actMixA - budMixA) * data.actualTotal * data.cmB;
        return Math.round(Math.abs(quantityVar + mixVarA + mixVarB));
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Total Sales-Volume Variance",
          formula: "Sales-Mix Variance + Sales-Quantity Variance",
          values: `Mix ${prior["sales-mix-variance"].toLocaleString()} + Quantity ${Math.round(prior["sales-quantity-variance"]).toLocaleString()} (signed)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "This is the same total volume variance computed in Problem 3 — just decomposed into mix and quantity components for deeper analysis.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Customer Drop Decision with Cost Hierarchy
// ============================================================================

export const customerDropDecision = {
  id: "ch15-customer-drop",
  title: "Customer Drop Decision",
  chapter: 15,
  difficulty: "intermediate",
  estimatedMinutes: 7,
  description:
    "A customer shows a reported loss after corporate allocations. Decide whether to drop, distinguishing avoidable from unavoidable costs.",
  reviewChapters: CH15_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "distribution" });
    const customerName =
      randomCompany({ category: "retail", includeSuffix: false }).base +
      " Markets";

    const revenue = roundToNearest(randomInRange(180000, 500000), 5000);
    const cogsPercent = randomInRange(66, 76, 1) / 100;
    const cogs = Math.round(revenue * cogsPercent);
    const grossMargin = revenue - cogs;

    // Avoidable customer-sustaining costs (would go away if customer dropped)
    const avoidableCustomerCosts = roundToNearest(
      (grossMargin * randomInRange(40, 70, 5)) / 100,
      1000,
    );

    // Unavoidable allocated corporate costs (would remain regardless)
    const allocatedCorporate = roundToNearest(
      (grossMargin * randomInRange(20, 50, 5)) / 100,
      1000,
    );

    const reportedCustomerOI =
      grossMargin - avoidableCustomerCosts - allocatedCorporate;
    const incrementalImpactIfDropped = grossMargin - avoidableCustomerCosts; // Lost contribution

    return {
      company,
      customerName,
      revenue,
      cogs,
      grossMargin,
      avoidableCustomerCosts,
      allocatedCorporate,
      reportedCustomerOI,
      incrementalImpactIfDropped,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is considering dropping
    <strong>${data.customerName}</strong> because the customer's reported operating
    income after all allocations is concerning. Annual revenue from
    ${data.customerName} is <strong>$${data.revenue.toLocaleString()}</strong>;
    cost of goods sold is <strong>$${data.cogs.toLocaleString()}</strong>.</p>
    <p>${data.company.base} has identified
    <strong>$${data.avoidableCustomerCosts.toLocaleString()}</strong> of
    customer-sustaining costs (dedicated sales rep, customer-specific warehouse
    space) that would be eliminated if the customer were dropped. An additional
    <strong>$${data.allocatedCorporate.toLocaleString()}</strong> of allocated
    corporate-level costs are charged to this customer's P&L but would continue
    regardless of whether the customer remains.</p>
  `,

  given: (data) => [
    { label: "Revenue", value: `$${data.revenue.toLocaleString()}` },
    { label: "COGS", value: `$${data.cogs.toLocaleString()}` },
    { label: "Gross margin", value: `$${data.grossMargin.toLocaleString()}` },
    {
      label: "Avoidable customer-sustaining costs",
      value: `$${data.avoidableCustomerCosts.toLocaleString()}`,
    },
    {
      label: "Allocated corporate costs (unavoidable)",
      value: `$${data.allocatedCorporate.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "reported-oi",
      question:
        "What is the reported customer operating income (after all allocations)?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => data.reportedCustomerOI,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Reported Customer OI",
          formula: "Gross Margin − Avoidable Costs − Allocated Corporate",
          values: `$${data.grossMargin.toLocaleString()} − $${data.avoidableCustomerCosts.toLocaleString()} − $${data.allocatedCorporate.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "This figure includes allocated corporate costs that would persist regardless of the keep/drop decision.",
        },
      ],
    },
    {
      id: "impact-if-dropped",
      question:
        "What is the change in total firm operating income if the customer is dropped? (Enter positive if income would increase, negative if it would decrease.)",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data) => -data.incrementalImpactIfDropped,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Lost Gross Margin",
          values: `−$${data.grossMargin.toLocaleString()}`,
        },
        {
          label: "Avoidable Cost Savings",
          values: `+$${data.avoidableCustomerCosts.toLocaleString()}`,
        },
        {
          label: "Change in Firm Operating Income",
          formula:
            "Avoidable Costs − Gross Margin (allocated costs are not relevant)",
          values: `$${data.avoidableCustomerCosts.toLocaleString()} − $${data.grossMargin.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note:
            "Allocated corporate costs ($" +
            data.allocatedCorporate.toLocaleString() +
            ") would persist after dropping the customer — they're not relevant.",
        },
      ],
    },
    {
      id: "drop-decision",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Based on the relevant-cost analysis, should the company drop this customer?",
      options: [
        {
          id: "keep",
          label:
            "Keep — dropping would reduce firm operating income (avoidable costs < lost gross margin)",
        },
        {
          id: "drop",
          label:
            "Drop — firm operating income would increase (avoidable costs > lost gross margin)",
        },
        {
          id: "drop-reported-loss",
          label:
            "Drop — the customer is reporting a loss after all allocations",
        },
        {
          id: "cannot-decide",
          label: "Cannot decide without computing fully-allocated costs",
        },
      ],
      correctId: (data) =>
        data.incrementalImpactIfDropped > 0 ? "keep" : "drop",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Decision Rule",
          formula:
            "Drop if firm OI increases (avoidable savings > gross margin lost)",
          values: `Net impact: ${prior["impact-if-dropped"] >= 0 ? "+" : ""}$${Math.round(prior["impact-if-dropped"]).toLocaleString()}`,
          result:
            correctId === "keep" ? "Keep the customer" : "Drop the customer",
          highlight: true,
          note: "The reported loss is misleading — it includes unavoidable allocated costs. Only the avoidable cost analysis matters.",
        },
      ],
    },
    {
      id: "allocated-effect",
      type: "choice",
      question:
        "If the customer is dropped, what happens to the $" +
        ((data) => data.allocatedCorporate.toLocaleString()) +
        " in allocated corporate costs?",
      options: [
        {
          id: "unchanged",
          label:
            "Total corporate costs are unchanged; they are redistributed across remaining customers",
        },
        {
          id: "eliminated",
          label: "They are eliminated along with the customer",
        },
        {
          id: "reduced-proportionally",
          label:
            "They are reduced proportionally to the customer's revenue share",
        },
        {
          id: "become-variable",
          label: "They become variable costs of the remaining customers",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "unchanged",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Allocated Cost Behavior",
          formula: "Allocation rearranges costs; it doesn't change their total",
          values:
            "Total corporate costs persist — they are redistributed to remaining customers, often making the next customer look worse on the report.",
          result: "Unchanged in total",
          highlight: true,
          note: 'This is the death-spiral logic of full-cost reporting — dropping a customer makes the remaining customers look less profitable, prompting more "drop" decisions.',
        },
      ],
    },
    {
      id: "breakeven-cost-reduction",
      question:
        "For the company to be indifferent between keeping and dropping the customer, by how much would avoidable customer-sustaining costs need to decrease (assuming everything else stays the same)?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data) =>
        Math.max(0, data.avoidableCustomerCosts - data.grossMargin),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Indifference Point",
          formula:
            "Avoidable Costs − Gross Margin (the amount by which avoidable costs exceed gross margin)",
          values: `$${data.avoidableCustomerCosts.toLocaleString()} − $${data.grossMargin.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note:
            correctValue === 0
              ? "Avoidable costs are already below gross margin — keeping is clearly correct, no reduction needed."
              : "If avoidable costs were reduced by this amount, the firm would be indifferent. Greater reduction → drop becomes net negative.",
        },
      ],
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const ch15Problems = [
  customerProfitabilitySingle,
  abcCustomerComparison,
  salesVolumeVariance,
  salesMixQuantityVariance,
  customerDropDecision,
];
