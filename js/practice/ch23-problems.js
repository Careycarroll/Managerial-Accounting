// js/practice/ch23-problems.js
// Chapter 23 — Management Control Systems, Transfer Pricing,
// and Multinational Considerations
// Pass 2 problems — transfer pricing methods, the general rule, and
// multinational tax considerations.

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH23_REVIEW = [
  {
    label: "Ch. 23 — Management Control Systems and Transfer Pricing",
    href: `${BASE}pages/learn/ch23.html`,
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
// Problem 1 — Market-Based Transfer Price
// ============================================================================

export const marketBasedTransfer = {
  id: "ch23-market-based",
  title: "Market-Based Transfer Price",
  chapter: 23,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Determine the transfer price when the selling division has a competitive external market.",
  reviewChapters: CH23_REVIEW,

  randomize: () => {
    const sellingDiv = randomCompany({ category: "manufacturing" });
    const buyingDiv = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const variableCostPerUnit = randomInRange(15, 35, 1);
    const externalMarketPrice = roundToNearest(
      (variableCostPerUnit * randomInRange(150, 220, 5)) / 100,
      1,
    );
    const fixedCostPerUnit = randomInRange(8, 20, 1);

    // Internal transfer quantity
    const transferUnits = roundToNearest(randomInRange(2000, 8000), 100);

    // Buying div's external alternative (slightly more than selling div price)
    const buyingExternalPrice = roundToNearest(
      (externalMarketPrice * randomInRange(102, 110, 1)) / 100,
      1,
    );

    return {
      sellingDiv,
      buyingDiv,
      product,
      variableCostPerUnit,
      externalMarketPrice,
      fixedCostPerUnit,
      transferUnits,
      buyingExternalPrice,
    };
  },

  scenario: (data) => `
    <p>${data.sellingDiv.name} (the Components Division) produces a part used by
    ${data.buyingDiv.name} (the Assembly Division). The Components Division can
    sell each unit on the open market for
    <strong>$${data.externalMarketPrice}</strong>. Variable manufacturing cost is
    <strong>$${data.variableCostPerUnit}</strong> per unit, and allocated fixed cost
    is <strong>$${data.fixedCostPerUnit}</strong> per unit. The Assembly Division
    needs <strong>${data.transferUnits.toLocaleString()} units</strong> annually
    and could buy from an outside supplier at
    <strong>$${data.buyingExternalPrice}</strong> per unit.</p>
    <p>The Components Division currently has idle capacity, but a competitive
    external market exists for the part.</p>
  `,

  given: (data) => [
    { label: "Variable cost per unit", value: `$${data.variableCostPerUnit}` },
    {
      label: "Allocated fixed cost per unit",
      value: `$${data.fixedCostPerUnit}`,
    },
    { label: "External market price", value: `$${data.externalMarketPrice}` },
    {
      label: "Buying div external price",
      value: `$${data.buyingExternalPrice}`,
    },
    {
      label: "Transfer quantity",
      value: `${data.transferUnits.toLocaleString()} units`,
    },
  ],

  steps: [
    {
      id: "market-tp",
      question: "What is the market-based transfer price?",
      resultType: "money-small",
      unit: "$",
      solve: (data) => data.externalMarketPrice,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Market-Based Transfer Price",
          formula: "External market price of the part",
          values: `$${data.externalMarketPrice}`,
          result: `$${correctValue}`,
          highlight: true,
          note: "When a competitive market exists, the market price is the appropriate transfer price — it equals the selling division's opportunity cost.",
        },
      ],
    },
    {
      id: "selling-div-contribution",
      question:
        "At the market transfer price, what is the Components Division's contribution margin from the internal transfer?",
      resultType: "money-large",
      unit: "$",
      solve: (data) =>
        (data.externalMarketPrice - data.variableCostPerUnit) *
        data.transferUnits,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Selling Division Contribution",
          formula: "(Transfer Price − Variable Cost) × Units",
          values: `($${data.externalMarketPrice} − $${data.variableCostPerUnit}) × ${data.transferUnits.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "buying-div-savings",
      question:
        "What does the Assembly Division save annually by buying internally at the market price vs from the outside supplier?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        (data.buyingExternalPrice - data.externalMarketPrice) *
        data.transferUnits,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Assembly Division Savings",
          formula: "(External Price − Transfer Price) × Units",
          values: `($${data.buyingExternalPrice} − $${data.externalMarketPrice}) × ${data.transferUnits.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "Both divisions benefit when the market-based transfer price falls between the two outside alternatives.",
        },
      ],
    },
    {
      id: "why-market-works",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "When a competitive external market exists, why is the market price the ideal transfer price?",
      options: [
        {
          id: "opportunity-cost",
          label:
            "It equals the selling division's opportunity cost — they could earn this much in the external market instead",
        },
        {
          id: "tax-required",
          label:
            "Tax authorities require market-based transfer prices in all jurisdictions",
        },
        {
          id: "simplest",
          label: "Market price is the simplest method to calculate",
        },
        {
          id: "gaap-required",
          label:
            "GAAP requires market-based transfer pricing for external financial reporting",
        },
      ],
      correctId: () => "opportunity-cost",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Why Market Price Works",
          formula: "Aligns divisional incentives with corporate value",
          values:
            "Selling division earns what they'd get externally. Buying division pays what they'd pay externally. Both decisions reflect true economic alternatives.",
          result: "Market price = opportunity cost in competitive markets",
          highlight: true,
          note: "Market-based transfer pricing is the ideal benchmark. Other methods (cost-plus, negotiated) are alternatives when no clean market exists.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Cost-Based Transfer Price
// ============================================================================

export const costBasedTransfer = {
  id: "ch23-cost-based",
  title: "Cost-Based Transfer Pricing",
  chapter: 23,
  difficulty: "intermediate",
  estimatedMinutes: 6,
  description:
    "Compare three cost-based transfer pricing methods: variable cost, full cost, and cost-plus.",
  reviewChapters: CH23_REVIEW,

  randomize: () => {
    const sellingDiv = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const variableCost = randomInRange(20, 45, 1);
    const fixedCostPerUnit = randomInRange(10, 25, 1);
    const fullCost = variableCost + fixedCostPerUnit;
    const markup = randomInRange(15, 35, 5) / 100;
    const costPlusPrice = roundTo(fullCost * (1 + markup), 2);

    return {
      sellingDiv,
      product,
      variableCost,
      fixedCostPerUnit,
      fullCost,
      markup,
      costPlusPrice,
    };
  },

  scenario: (data) => `
    <p>${data.sellingDiv.name}'s Components Division produces a ${data.product.singular}
    used by the Assembly Division. Per-unit costs are: variable manufacturing
    <strong>$${data.variableCost}</strong>, allocated fixed manufacturing
    <strong>$${data.fixedCostPerUnit}</strong>. Corporate is considering three
    cost-based transfer pricing methods: variable cost, full cost, and cost-plus
    with a <strong>${(data.markup * 100).toFixed(0)}% markup</strong>.</p>
  `,

  given: (data) => [
    { label: "Variable cost per unit", value: `$${data.variableCost}` },
    { label: "Fixed cost per unit", value: `$${data.fixedCostPerUnit}` },
    { label: "Full cost per unit", value: `$${data.fullCost}` },
    { label: "Cost-plus markup", value: `${(data.markup * 100).toFixed(0)}%` },
  ],

  steps: [
    {
      id: "variable-cost-tp",
      question: "What is the transfer price under the VARIABLE COST method?",
      resultType: "money-small",
      unit: "$",
      solve: (data) => data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Variable-Cost Transfer Price",
          formula: "Variable cost per unit",
          values: `$${data.variableCost}`,
          result: `$${correctValue}`,
          highlight: true,
          note: "Variable-cost transfer pricing is appropriate for short-run decisions when the selling division has idle capacity.",
        },
      ],
    },
    {
      id: "full-cost-tp",
      question: "What is the transfer price under the FULL COST method?",
      resultType: "money-small",
      unit: "$",
      solve: (data) => data.fullCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Full-Cost Transfer Price",
          formula: "Variable cost + Allocated fixed cost",
          values: `$${data.variableCost} + $${data.fixedCostPerUnit}`,
          result: `$${correctValue}`,
          highlight: true,
        },
      ],
    },
    {
      id: "cost-plus-tp",
      question: "What is the transfer price under the COST-PLUS method?",
      resultType: "money-small",
      unit: "$",
      solve: (data) => roundTo(data.fullCost * (1 + data.markup), 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Cost-Plus Transfer Price",
          formula: "Full Cost × (1 + Markup)",
          values: `$${data.fullCost} × (1 + ${data.markup.toFixed(2)})`,
          result: `$${correctValue}`,
          highlight: true,
          note: "Cost-plus gives the selling division a target margin but requires the buying division to bear allocated fixed cost + markup, which can distort make-or-buy decisions.",
        },
      ],
    },
    {
      id: "cost-based-drawback",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "What is the main drawback of FULL-COST or COST-PLUS transfer pricing?",
      options: [
        {
          id: "distorts-decisions",
          label:
            "Includes allocated fixed costs that may not be relevant to short-run decisions — can cause buying divisions to reject internal transfers that would be profitable for the firm",
        },
        {
          id: "too-low",
          label:
            "Transfer price is always too low, reducing selling division profit",
        },
        {
          id: "too-complex",
          label: "Cost-plus pricing requires advanced statistical modeling",
        },
        { id: "illegal", label: "Cost-plus pricing violates antitrust law" },
      ],
      correctId: () => "distorts-decisions",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Cost-Based TP Drawback",
          formula: "Allocated fixed cost is not opportunity cost",
          values:
            "Buying division sees the allocated fixed cost as a real out-of-pocket expense, but it persists whether the transfer happens or not.",
          result:
            "Distorts incremental decision-making at the divisional level",
          highlight: true,
          note: "This is why variable-cost transfer pricing is theoretically preferred for short-run decisions, but selling divisions often resist it because they can't recover fixed costs.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Negotiated TP with Constrained Capacity
// ============================================================================

export const negotiatedTransfer = {
  id: "ch23-negotiated",
  title: "Negotiated Transfer Price — Constrained Capacity",
  chapter: 23,
  difficulty: "advanced",
  estimatedMinutes: 8,
  description:
    "Determine the minimum and maximum acceptable transfer prices when the selling division is operating at full capacity.",
  reviewChapters: CH23_REVIEW,

  randomize: () => {
    const sellingDiv = randomCompany({ category: "manufacturing" });
    const buyingDiv = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const variableCost = randomInRange(20, 40, 1);
    const externalPrice = roundToNearest(
      (variableCost * randomInRange(170, 230, 5)) / 100,
      1,
    );
    const buyingExternalPrice = roundToNearest(
      (externalPrice * randomInRange(108, 118, 2)) / 100,
      1,
    );

    const transferUnits = roundToNearest(randomInRange(1500, 5000), 100);

    return {
      sellingDiv,
      buyingDiv,
      product,
      variableCost,
      externalPrice,
      buyingExternalPrice,
      transferUnits,
    };
  },

  scenario: (data) => `
    <p>${data.sellingDiv.name}'s Components Division is operating at <strong>full
    capacity</strong>, selling every unit it can produce externally at
    <strong>$${data.externalPrice} per unit</strong>. Variable manufacturing cost
    is <strong>$${data.variableCost} per unit</strong>. ${data.buyingDiv.name}'s
    Assembly Division wants to buy <strong>${data.transferUnits.toLocaleString()} units</strong>
    of the component internally. The Assembly Division could buy externally at
    <strong>$${data.buyingExternalPrice} per unit</strong>.</p>
    <p>Any internal transfer to Assembly displaces equivalent external sales by
    the Components Division.</p>
  `,

  given: (data) => [
    { label: "Variable cost", value: `$${data.variableCost}` },
    {
      label: "External market price (Components)",
      value: `$${data.externalPrice}`,
    },
    {
      label: "Buying div external alternative",
      value: `$${data.buyingExternalPrice}`,
    },
    {
      label: "Transfer quantity",
      value: `${data.transferUnits.toLocaleString()} units`,
    },
  ],

  steps: [
    {
      id: "opportunity-cost",
      question:
        "What is the opportunity cost per unit to the Components Division of diverting capacity to internal sales?",
      resultType: "money-small",
      unit: "$ per unit",
      solve: (data) => data.externalPrice - data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Opportunity Cost per Unit",
          formula: "External Market Price − Variable Cost",
          values: `$${data.externalPrice} − $${data.variableCost}`,
          result: `$${correctValue}`,
          highlight: true,
          note: "When operating at full capacity, every internal sale displaces an external sale at the contribution margin.",
        },
      ],
    },
    {
      id: "min-transfer-price",
      question:
        "What is the MINIMUM acceptable transfer price for the Components Division?",
      resultType: "money-small",
      unit: "$",
      solve: (data) => data.externalPrice,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Minimum Transfer Price",
          formula: "Variable Cost + Opportunity Cost",
          values: `$${data.variableCost} + $${data.externalPrice - data.variableCost} = $${data.externalPrice}`,
          result: `$${correctValue}`,
          highlight: true,
          note: "Below this, Components would prefer to sell externally. With full capacity, the minimum acceptable internal price equals the external market price.",
        },
      ],
    },
    {
      id: "max-transfer-price",
      question:
        "What is the MAXIMUM acceptable transfer price for the Assembly Division?",
      resultType: "money-small",
      unit: "$",
      solve: (data) => data.buyingExternalPrice,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Maximum Transfer Price",
          formula: "External price Assembly would pay outside",
          values: `$${data.buyingExternalPrice}`,
          result: `$${correctValue}`,
          highlight: true,
          note: "Above this, Assembly would prefer to buy externally.",
        },
      ],
    },
    {
      id: "transfer-feasibility",
      type: "choice",
      intentionalSingleAnswer: true,
      question: "Does an internal transfer make sense for the firm overall?",
      options: [
        {
          id: "yes-range-exists",
          label:
            "Yes — there is a transfer price range where both divisions benefit and firm income increases",
        },
        {
          id: "no-no-range",
          label: "No — no acceptable transfer price exists",
        },
        { id: "depends-on-tax", label: "Depends on tax considerations" },
        {
          id: "requires-corporate-mandate",
          label:
            "Only if corporate mandates it, regardless of divisional preference",
        },
      ],
      correctId: (data) =>
        data.buyingExternalPrice > data.externalPrice
          ? "yes-range-exists"
          : "no-no-range",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Range Test",
          formula: "Transfer is profitable when Min < Max",
          values: `Min $${data.externalPrice} ${data.buyingExternalPrice > data.externalPrice ? "<" : ">="} Max $${data.buyingExternalPrice}`,
          result:
            correctId === "yes-range-exists"
              ? `Acceptable range: $${data.externalPrice} to $${data.buyingExternalPrice}`
              : "No acceptable range exists",
          highlight: true,
          note: "The negotiated transfer price would fall within this range, with the exact point determined by relative bargaining power.",
        },
      ],
    },
    {
      id: "who-benefits-most",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Under negotiated transfer pricing, how is the transfer price typically determined?",
      options: [
        {
          id: "bargaining",
          label:
            "Through bargaining between division managers within the acceptable range, often reflecting relative bargaining power",
        },
        {
          id: "corporate-mandate",
          label: "Corporate dictates the price based on cost-plus markup",
        },
        {
          id: "always-midpoint",
          label: "Always set at the midpoint of the acceptable range",
        },
        { id: "tax-authority", label: "Set by the tax authority" },
      ],
      correctId: () => "bargaining",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Negotiated TP Process",
          formula: "Range defined by economic floors and ceilings",
          values:
            "Floor: selling div's minimum (variable + opportunity cost). Ceiling: buying div's external alternative.",
          result:
            "Negotiation determines where within the range, often based on bargaining power and strategic priorities",
          highlight: true,
          note: "Negotiated pricing preserves divisional autonomy but can produce inconsistent results across the firm. Some companies prefer formula-based methods for consistency.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — General Transfer Pricing Rule
// ============================================================================

export const generalRule = {
  id: "ch23-general-rule",
  title: "The General Transfer Pricing Rule",
  chapter: 23,
  difficulty: "intermediate",
  estimatedMinutes: 6,
  description:
    "Apply the general rule: Minimum TP = Additional outlay cost + Opportunity cost of the selling division.",
  reviewChapters: CH23_REVIEW,

  randomize: () => {
    const sellingDiv = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const variableCost = randomInRange(18, 38, 1);

    // Three capacity scenarios
    const scenarios = [
      { type: "idle", externalPrice: 0, contribution: 0 },
      { type: "partial-constrained", externalPrice: 0, contribution: 0 },
      { type: "full-capacity", externalPrice: 0, contribution: 0 },
    ];
    const scenarioIdx = Math.floor(Math.random() * 3);
    const scenario = scenarios[scenarioIdx];

    if (scenario.type !== "idle") {
      scenario.externalPrice = roundToNearest(
        (variableCost * randomInRange(160, 220, 5)) / 100,
        1,
      );
      scenario.contribution = scenario.externalPrice - variableCost;
    }

    return {
      sellingDiv,
      product,
      variableCost,
      scenarioType: scenario.type,
      externalPrice: scenario.externalPrice,
      opportunityCost:
        scenario.type === "idle"
          ? 0
          : scenario.type === "partial-constrained"
            ? Math.round(scenario.contribution * 0.5)
            : scenario.contribution,
    };
  },

  scenario: (data) => {
    let capacityNarrative = "";
    if (data.scenarioType === "idle") {
      capacityNarrative =
        "The Components Division has significant <strong>idle capacity</strong> — no external customers are being displaced by an internal transfer.";
    } else if (data.scenarioType === "partial-constrained") {
      capacityNarrative = `The Components Division has <strong>partial capacity constraint</strong> — only half the internal transfer displaces external sales (at $${data.externalPrice} external price).`;
    } else {
      capacityNarrative = `The Components Division is at <strong>full capacity</strong> — every internal transfer unit displaces an external sale at $${data.externalPrice} per unit.`;
    }

    return `
      <p>${data.sellingDiv.name}'s Components Division produces a ${data.product.singular}
      at a variable cost of <strong>$${data.variableCost}</strong> per unit. The General
      Transfer Pricing Rule states:</p>
      <p style="text-align:center; font-weight:600; color:var(--color-primary-text);">
        Minimum TP = Additional Outlay Cost (per Unit) + Opportunity Cost (per Unit)
      </p>
      <p>${capacityNarrative}</p>
    `;
  },

  given: (data) => [
    { label: "Variable cost", value: `$${data.variableCost}` },
    {
      label: "Capacity scenario",
      value:
        data.scenarioType === "idle"
          ? "Idle capacity available"
          : data.scenarioType === "partial-constrained"
            ? "Partial constraint"
            : "Full capacity",
    },
    {
      label: "External market price",
      value: data.scenarioType === "idle" ? "N/A" : `$${data.externalPrice}`,
    },
    { label: "Opportunity cost per unit", value: `$${data.opportunityCost}` },
  ],

  steps: [
    {
      id: "additional-outlay",
      question:
        "What is the additional outlay cost (per unit) to the Components Division for the internal transfer?",
      resultType: "money-small",
      unit: "$ per unit",
      solve: (data) => data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Additional Outlay Cost",
          formula: "Variable cost of producing the transferred unit",
          values: `$${data.variableCost}`,
          result: `$${correctValue}`,
          highlight: true,
          note: "This is the incremental cash outflow caused by the transfer.",
        },
      ],
    },
    {
      id: "opp-cost",
      question:
        "What is the per-unit opportunity cost to the Components Division?",
      resultType: "money-small",
      unit: "$ per unit",
      solve: (data) => data.opportunityCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Opportunity Cost",
          formula: "CM forgone on lost external sales",
          values:
            data.scenarioType === "idle"
              ? "$0 — no external sale displaced"
              : data.scenarioType === "partial-constrained"
                ? `Half displaced × ($${data.externalPrice} − $${data.variableCost})`
                : `Each unit displaces external sale at CM = $${data.externalPrice} − $${data.variableCost}`,
          result: `$${correctValue}`,
          highlight: true,
        },
      ],
    },
    {
      id: "minimum-tp",
      question: "What is the minimum transfer price under the general rule?",
      resultType: "money-small",
      unit: "$",
      solve: (data, prior) => prior["additional-outlay"] + prior["opp-cost"],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Minimum Transfer Price (General Rule)",
          formula: "Additional Outlay + Opportunity Cost",
          values: `$${prior["additional-outlay"]} + $${prior["opp-cost"]}`,
          result: `$${correctValue}`,
          highlight: true,
          annotation:
            carryForwardNote(
              "additional-outlay",
              "1",
              prior,
              studentAnswers,
              (v) => `$${v}`,
            ) ||
            carryForwardNote(
              "opp-cost",
              "2",
              prior,
              studentAnswers,
              (v) => `$${v}`,
            ),
          note:
            data.scenarioType === "idle"
              ? "With idle capacity, opportunity cost is zero — variable cost is the floor."
              : data.scenarioType === "full-capacity"
                ? "With full capacity, minimum TP equals external market price — no internal discount."
                : "With partial constraint, minimum TP falls between variable cost and external price.",
        },
      ],
    },
    {
      id: "rule-elegance",
      type: "choice",
      intentionalSingleAnswer: true,
      question: "Why is the general transfer pricing rule considered elegant?",
      options: [
        {
          id: "one-rule",
          label:
            "A single formula handles all capacity situations — idle, full, and partial constraint — by varying the opportunity cost",
        },
        {
          id: "always-cheaper",
          label: "It always produces the lowest possible transfer price",
        },
        {
          id: "no-math",
          label: "It requires no calculation — just opinion-based judgment",
        },
        {
          id: "gaap-compliant",
          label: "It satisfies GAAP for external reporting",
        },
      ],
      correctId: () => "one-rule",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "General Rule Elegance",
          formula: "Min TP = Outlay + Opportunity Cost",
          values:
            "Idle: opp cost = 0 → TP floor = variable cost. Full capacity: opp cost = full external CM → TP floor = market price. Partial: somewhere in between.",
          result: "A single rule captures all three capacity cases",
          highlight: true,
          note: "This is why the general rule is the conceptual foundation for transfer pricing. Market-based and cost-based methods are special cases of it.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Multinational Tax Strategy
// ============================================================================

export const multinationalTax = {
  id: "ch23-multinational",
  title: "Multinational Transfer Pricing & Tax",
  chapter: 23,
  difficulty: "advanced",
  estimatedMinutes: 7,
  description:
    "Compute after-tax firm income under different transfer prices across high-tax and low-tax jurisdictions.",
  reviewChapters: CH23_REVIEW,

  randomize: () => {
    const parent = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const variableCost = randomInRange(25, 50, 1);
    const externalPrice = roundToNearest(
      (variableCost * randomInRange(180, 240, 10)) / 100,
      1,
    );

    // Choose which jurisdiction is high vs low tax
    const highTaxRate = [0.3, 0.35, 0.4][Math.floor(Math.random() * 3)];
    const lowTaxRate = [0.1, 0.15, 0.2][Math.floor(Math.random() * 3)];

    // Two possible transfer prices
    const lowTP = variableCost; // Variable cost only
    const highTP = externalPrice; // Full market

    // Final selling price in destination market
    const finalSellingPrice = roundToNearest(
      (externalPrice * randomInRange(140, 175, 5)) / 100,
      1,
    );

    const transferUnits = roundToNearest(randomInRange(3000, 8000), 500);

    return {
      parent,
      product,
      variableCost,
      externalPrice,
      finalSellingPrice,
      highTaxRate,
      lowTaxRate,
      lowTP,
      highTP,
      transferUnits,
    };
  },

  scenario: (data) => `
    <p>${data.parent.name} produces ${data.product.plural} in its
    <strong>Low-Tax Country</strong> (tax rate ${(data.lowTaxRate * 100).toFixed(0)}%)
    and sells them to its sales subsidiary in <strong>High-Tax Country</strong>
    (tax rate ${(data.highTaxRate * 100).toFixed(0)}%). Variable manufacturing cost
    is <strong>$${data.variableCost}</strong> per unit. The sales subsidiary
    ultimately sells the product to customers for
    <strong>$${data.finalSellingPrice}</strong> per unit. Annual transfer volume
    is <strong>${data.transferUnits.toLocaleString()} units</strong>.</p>
    <p>The company is considering two transfer prices:
    <strong>$${data.lowTP}</strong> (variable cost) or
    <strong>$${data.highTP}</strong> (external market price).</p>
  `,

  given: (data) => [
    { label: "Variable cost", value: `$${data.variableCost}` },
    { label: "Final selling price", value: `$${data.finalSellingPrice}` },
    { label: "Low-tax rate", value: `${(data.lowTaxRate * 100).toFixed(0)}%` },
    {
      label: "High-tax rate",
      value: `${(data.highTaxRate * 100).toFixed(0)}%`,
    },
    {
      label: "Transfer quantity",
      value: `${data.transferUnits.toLocaleString()} units`,
    },
  ],

  steps: [
    {
      id: "after-tax-low-tp",
      question:
        "What is total after-tax firm income at the LOW transfer price (variable cost)?",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data) => {
        const producerIncome =
          (data.lowTP - data.variableCost) * data.transferUnits;
        const producerAfterTax = producerIncome * (1 - data.lowTaxRate);
        const sellerIncome =
          (data.finalSellingPrice - data.lowTP) * data.transferUnits;
        const sellerAfterTax = sellerIncome * (1 - data.highTaxRate);
        return Math.round(producerAfterTax + sellerAfterTax);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const producerIncome = Math.round(
          (data.lowTP - data.variableCost) * data.transferUnits,
        );
        const producerAfterTax = Math.round(
          producerIncome * (1 - data.lowTaxRate),
        );
        const sellerIncome = Math.round(
          (data.finalSellingPrice - data.lowTP) * data.transferUnits,
        );
        const sellerAfterTax = Math.round(
          sellerIncome * (1 - data.highTaxRate),
        );
        return [
          {
            label: "Producer Pretax (Low-Tax)",
            values: `($${data.lowTP} − $${data.variableCost}) × ${data.transferUnits.toLocaleString()}`,
            result: `$${producerIncome.toLocaleString()}`,
          },
          {
            label: "Producer After-Tax",
            values: `$${producerIncome.toLocaleString()} × (1 − ${(data.lowTaxRate * 100).toFixed(0)}%)`,
            result: `$${producerAfterTax.toLocaleString()}`,
          },
          {
            label: "Seller Pretax (High-Tax)",
            values: `($${data.finalSellingPrice} − $${data.lowTP}) × ${data.transferUnits.toLocaleString()}`,
            result: `$${sellerIncome.toLocaleString()}`,
          },
          {
            label: "Seller After-Tax",
            values: `$${sellerIncome.toLocaleString()} × (1 − ${(data.highTaxRate * 100).toFixed(0)}%)`,
            result: `$${sellerAfterTax.toLocaleString()}`,
          },
          {
            label: "Total After-Tax Firm Income",
            formula: "Producer After-Tax + Seller After-Tax",
            values: `$${producerAfterTax.toLocaleString()} + $${sellerAfterTax.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
          },
        ];
      },
    },
    {
      id: "after-tax-high-tp",
      question:
        "What is total after-tax firm income at the HIGH transfer price (market price)?",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data) => {
        const producerIncome =
          (data.highTP - data.variableCost) * data.transferUnits;
        const producerAfterTax = producerIncome * (1 - data.lowTaxRate);
        const sellerIncome =
          (data.finalSellingPrice - data.highTP) * data.transferUnits;
        const sellerAfterTax = sellerIncome * (1 - data.highTaxRate);
        return Math.round(producerAfterTax + sellerAfterTax);
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Total After-Tax @ High TP",
          formula: "Same logic as Step 1 but with TP = $" + data.highTP,
          values:
            "Producer reports MORE income (taxed low). Seller reports LESS income (taxed high).",
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "Higher TP shifts more income from high-tax to low-tax jurisdiction — saves total tax.",
        },
      ],
    },
    {
      id: "tax-savings",
      question:
        "What is the tax savings (positive number) of using the HIGH vs LOW transfer price?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data, prior) =>
        Math.abs(prior["after-tax-high-tp"] - prior["after-tax-low-tp"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Tax-Saving Effect",
          formula: "After-tax @ High TP − After-tax @ Low TP",
          values: `$${prior["after-tax-high-tp"].toLocaleString()} − $${prior["after-tax-low-tp"].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "Higher TP shifts more pretax income to the low-tax jurisdiction. The saving = (Tax rate diff) × (Income shifted).",
        },
      ],
    },
    {
      id: "tax-strategy-decision",
      type: "choice",
      question: "To minimize total tax burden, the firm should:",
      options: [
        {
          id: "high-tp-to-low-tax",
          label:
            "Set a high transfer price when shipping FROM low-tax TO high-tax jurisdictions — shifts more income to the low-tax country",
        },
        {
          id: "low-tp-to-low-tax",
          label:
            "Set a low transfer price when shipping FROM low-tax TO high-tax jurisdictions",
        },
        {
          id: "always-market",
          label:
            "Always use market-based transfer pricing regardless of tax considerations",
        },
        {
          id: "tax-neutral",
          label: "Tax rates don't affect transfer pricing decisions",
        },
      ],
      correctId: () => "high-tp-to-low-tax",
      intentionalSingleAnswer: true,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Tax-Shifting Logic",
          formula: "Shift income to where it's taxed least",
          values:
            "High TP for goods leaving low-tax country → producer reports high income (taxed at low rate). Seller reports low income (taxed at high rate). Net firm tax falls.",
          result: "Use high TP from low-tax to high-tax country",
          highlight: true,
          note: 'BUT — most tax authorities require "arm\'s length" transfer prices. Aggressive tax shifting often triggers IRS/OECD scrutiny and penalty exposure. Real-world transfer pricing balances tax optimization with regulatory risk.',
        },
      ],
    },
    {
      id: "arms-length-constraint",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Why can't multinationals freely manipulate transfer prices to minimize tax?",
      options: [
        {
          id: "arms-length",
          label:
            'Tax authorities require "arm\'s length" pricing — what an independent third party would pay — and aggressive deviation can trigger audits and penalties',
        },
        {
          id: "gaap-prevents",
          label:
            "GAAP financial reporting prevents tax-driven transfer pricing",
        },
        {
          id: "eu-only",
          label: "Only EU regulations restrict transfer pricing",
        },
        {
          id: "no-restrictions",
          label: "There are no restrictions on transfer pricing",
        },
      ],
      correctId: () => "arms-length",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Regulatory Reality",
          formula: "Arm's length + documentation requirements",
          values:
            "OECD's Base Erosion and Profit Shifting (BEPS) and similar frameworks require firms to document that intercompany prices match what unrelated parties would pay.",
          result:
            "Tax authorities police aggressive transfer pricing — substantial penalties for non-arm's-length pricing",
          highlight: true,
          note: 'Many countries\' tax codes specifically empower tax authorities to "re-price" transactions and assess additional tax + penalties. Apple, Amazon, Google, and many others have faced multi-billion-dollar disputes over transfer pricing.',
        },
      ],
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const ch23Problems = [
  marketBasedTransfer,
  costBasedTransfer,
  negotiatedTransfer,
  generalRule,
  multinationalTax,
];
