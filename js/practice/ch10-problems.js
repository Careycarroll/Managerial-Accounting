// js/practice/ch10-problems.js
// Chapter 10 — Determining How Costs Behave
// Pass 2 problems — high-low, regression interpretation, learning curves,
// and cost estimation method selection.

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH10_REVIEW = [
  {
    label: "Ch. 10 — Determining How Costs Behave",
    href: `${BASE}pages/learn/ch10.html`,
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
// Problem 1 — High-Low Method
// ============================================================================

export const highLowMethod = {
  id: "ch10-high-low",
  title: "High-Low Method",
  chapter: 10,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Estimate a mixed-cost equation (y = a + bx) using the high-low method.",
  reviewChapters: CH10_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const variableRate = randomInRange(8, 22, 1);
    const fixedCost = roundToNearest(randomInRange(15000, 60000), 1000);

    const lowActivity = roundToNearest(randomInRange(1000, 3000), 100);
    const highActivity = roundToNearest(
      randomInRange(lowActivity + 2000, lowActivity + 5000),
      100,
    );

    // Noise added so it's not perfectly linear
    const lowNoise = randomInRange(-800, 800, 100);
    const highNoise = randomInRange(-800, 800, 100);

    const lowCost = lowActivity * variableRate + fixedCost + lowNoise;
    const highCost = highActivity * variableRate + fixedCost + highNoise;

    return { company, lowActivity, highActivity, lowCost, highCost };
  },

  scenario: (data) => `
    <p>${data.company.name} wants to estimate the relationship between machine-hours
    and electricity cost. From 12 months of data, the lowest activity month had
    <strong>${data.lowActivity.toLocaleString()} machine-hours</strong> with
    <strong>$${data.lowCost.toLocaleString()}</strong> in electricity cost. The
    highest activity month had <strong>${data.highActivity.toLocaleString()} machine-hours</strong>
    with <strong>$${data.highCost.toLocaleString()}</strong> in electricity cost.</p>
  `,

  given: (data) => [
    {
      label: "Low activity (MH)",
      value: `${data.lowActivity.toLocaleString()}`,
    },
    { label: "Low cost", value: `$${data.lowCost.toLocaleString()}` },
    {
      label: "High activity (MH)",
      value: `${data.highActivity.toLocaleString()}`,
    },
    { label: "High cost", value: `$${data.highCost.toLocaleString()}` },
  ],

  steps: [
    {
      id: "variable-rate",
      question: "What is the variable cost per machine-hour (the slope, b)?",
      resultType: "money-small",
      unit: "$ per MH",
      tolerance: { value: 0.1, type: "absolute" },
      solve: (data) =>
        roundTo(
          (data.highCost - data.lowCost) /
            (data.highActivity - data.lowActivity),
          2,
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Variable Rate (Slope)",
          formula: "(High Cost − Low Cost) ÷ (High Activity − Low Activity)",
          values: `($${data.highCost.toLocaleString()} − $${data.lowCost.toLocaleString()}) ÷ (${data.highActivity.toLocaleString()} − ${data.lowActivity.toLocaleString()})`,
          result: `$${correctValue} per MH`,
          highlight: true,
          note: "Slope captures the variable cost per unit of activity.",
        },
      ],
    },
    {
      id: "fixed-cost",
      question: "What is the estimated fixed cost (the intercept, a)?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 100, type: "absolute" },
      solve: (data, prior) =>
        Math.round(data.highCost - prior["variable-rate"] * data.highActivity),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Fixed Cost (Intercept)",
          formula: "High Cost − (Variable Rate × High Activity)",
          values: `$${data.highCost.toLocaleString()} − ($${prior["variable-rate"]} × ${data.highActivity.toLocaleString()})`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "variable-rate",
            "1",
            prior,
            studentAnswers,
            (v) => `$${v}`,
          ),
          note: "You could equally use the low data point — both yield the same intercept since the line passes through both.",
        },
      ],
    },
    {
      id: "predict-cost",
      question:
        "Using the equation y = a + bx, what is the predicted cost at 2,500 machine-hours?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 200, type: "absolute" },
      solve: (data, prior) =>
        Math.round(prior["fixed-cost"] + prior["variable-rate"] * 2500),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Predicted Cost",
          formula: "a + b × x",
          values: `$${prior["fixed-cost"].toLocaleString()} + ($${prior["variable-rate"]} × 2,500)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "fixed-cost",
            "2",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "high-low-limitation",
      type: "choice",
      intentionalSingleAnswer: true,
      question: "What is the main limitation of the high-low method?",
      options: [
        {
          id: "two-points-only",
          label:
            "It uses only the two extreme data points, ignoring all others — extreme months may not be representative",
        },
        {
          id: "too-complex",
          label: "It requires advanced statistical software",
        },
        {
          id: "works-only-fixed",
          label: "It only works for purely fixed costs",
        },
        {
          id: "requires-regression",
          label:
            "You must first run a regression to verify the high-low result",
        },
      ],
      correctId: () => "two-points-only",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "High-Low Limitation",
          formula: "Estimate quality ∝ data points used",
          values:
            "High and low points may be outliers (unusual months: shutdown, strike, peak demand). Regression uses all observations.",
          result: "Highly sensitive to extreme observations",
          highlight: true,
          note: "High-low is fine as a quick first pass, but regression is preferred when reliable data is available.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Cost Function Evaluation
// ============================================================================

export const costFunctionEvaluation = {
  id: "ch10-cost-function-eval",
  title: "Evaluating a Cost Function",
  chapter: 10,
  difficulty: "intermediate",
  estimatedMinutes: 6,
  description:
    "A regression has been run on a cost driver. Interpret the R² and slope significance, and judge whether the driver is plausible.",
  reviewChapters: CH10_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    // Generate plausible regression output
    const slope = randomInRange(6, 18, 1);
    const intercept = roundToNearest(randomInRange(10000, 40000), 1000);

    // R² scenarios: high, medium, low
    const rSquaredScenarios = [0.92, 0.85, 0.78, 0.62, 0.45, 0.31];
    const rSquared =
      rSquaredScenarios[Math.floor(Math.random() * rSquaredScenarios.length)];

    // Plausibility scenarios — sometimes the driver doesn't make sense
    const drivers = [
      { name: "machine-hours", cost: "machine maintenance", plausible: true },
      {
        name: "direct labor hours",
        cost: "indirect labor supervision",
        plausible: true,
      },
      {
        name: "units produced",
        cost: "electricity for machining",
        plausible: true,
      },
      {
        name: "number of shipments",
        cost: "shipping department cost",
        plausible: true,
      },
      { name: "CEO salary", cost: "factory utilities", plausible: false },
      { name: "monthly rainfall", cost: "plant heating", plausible: false },
    ];
    const driver = drivers[Math.floor(Math.random() * drivers.length)];

    return { company, slope, intercept, rSquared, driver };
  },

  scenario: (data) => `
    <p>${data.company.name}'s controller ran a regression to estimate
    <strong>${data.driver.cost}</strong> as a function of
    <strong>${data.driver.name}</strong>. The regression produced:</p>
    <ul style="margin-left:var(--space-4);">
      <li>Intercept (a): <strong>$${data.intercept.toLocaleString()}</strong></li>
      <li>Slope (b): <strong>$${data.slope}</strong> per ${data.driver.name}</li>
      <li>R² = <strong>${data.rSquared.toFixed(2)}</strong></li>
    </ul>
  `,

  given: (data) => [
    { label: "Cost being estimated", value: data.driver.cost },
    { label: "Cost driver", value: data.driver.name },
    { label: "Intercept (a)", value: `$${data.intercept.toLocaleString()}` },
    { label: "Slope (b)", value: `$${data.slope} per driver unit` },
    { label: "R²", value: data.rSquared.toFixed(2) },
  ],

  steps: [
    {
      id: "predict-cost",
      question: "What is the predicted cost at 1,500 driver units?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.intercept + data.slope * 1500),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Cost Prediction",
          formula: "a + b × x",
          values: `$${data.intercept.toLocaleString()} + ($${data.slope} × 1,500)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "r-squared-interpretation",
      type: "choice",
      question: "How would you characterize this R²?",
      options: [
        {
          id: "strong",
          label:
            "Strong fit (R² > 0.80) — driver explains most variation in cost",
        },
        {
          id: "moderate",
          label:
            "Moderate fit (0.60 ≤ R² ≤ 0.80) — usable, but some variation unexplained",
        },
        {
          id: "weak",
          label: "Weak fit (R² < 0.60) — driver does not explain cost reliably",
        },
      ],
      correctId: (data) => {
        if (data.rSquared > 0.8) return "strong";
        if (data.rSquared >= 0.6) return "moderate";
        return "weak";
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "R² Interpretation",
          formula: "R² = proportion of variance explained by the regression",
          values: `R² = ${data.rSquared.toFixed(2)}`,
          result:
            correctId === "strong"
              ? "Strong (>0.80)"
              : correctId === "moderate"
                ? "Moderate (0.60-0.80)"
                : "Weak (<0.60)",
          highlight: true,
          note: "These thresholds are rules of thumb — the right cutoff depends on the cost being studied and what alternatives are available.",
        },
      ],
    },
    {
      id: "plausibility",
      type: "choice",
      question: `Is "${(data) => data.driver?.name || "this driver"}" a plausible economic driver of "${(data) => data.driver?.cost || "this cost"}"?`,
      options: [
        {
          id: "yes-plausible",
          label:
            "Yes — there is a logical cause-and-effect relationship between driver and cost",
        },
        {
          id: "no-spurious",
          label: "No — the relationship is likely spurious, even if R² is high",
        },
        { id: "maybe", label: "Maybe — R² alone determines plausibility" },
      ],
      correctId: (data) =>
        data.driver.plausible ? "yes-plausible" : "no-spurious",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Plausibility Test",
          formula: "Does the driver cause changes in the cost?",
          values: `Driver: ${data.driver.name}, Cost: ${data.driver.cost}`,
          result:
            correctId === "yes-plausible"
              ? "Plausible cause-and-effect relationship"
              : "Implausible — likely spurious correlation",
          highlight: true,
          note: "Horngren's first criterion for evaluating a cost function is economic plausibility. A high R² with no logical link is a coincidence, not a useful prediction model.",
        },
      ],
    },
    {
      id: "overall-quality",
      type: "choice",
      question:
        "Combining R² AND plausibility, how good is this cost function for predicting future costs?",
      options: [
        {
          id: "reliable",
          label:
            "Reliable — both economic plausibility AND statistical fit (R² ≥ 0.80) hold",
        },
        {
          id: "unreliable-r2",
          label: "Unreliable — plausibility holds but statistical fit is weak",
        },
        {
          id: "unreliable-plausibility",
          label:
            "Unreliable — statistical fit is strong but the driver is not plausible",
        },
        {
          id: "unreliable-both",
          label:
            "Unreliable — neither plausibility nor statistical fit is acceptable",
        },
      ],
      correctId: (data) => {
        const goodR2 = data.rSquared >= 0.8;
        if (data.driver.plausible && goodR2) return "reliable";
        if (data.driver.plausible && !goodR2) return "unreliable-r2";
        if (!data.driver.plausible && goodR2) return "unreliable-plausibility";
        return "unreliable-both";
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Combined Judgment",
          formula: "Plausibility + Statistical Fit",
          values: `Plausible: ${data.driver.plausible ? "Yes" : "No"}, R²: ${data.rSquared.toFixed(2)}`,
          result:
            correctId === "reliable"
              ? "Reliable for prediction"
              : "Not reliable",
          highlight: true,
          note: "Both criteria must hold. A high R² with no causal logic is a warning sign — likely correlation without causation.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Learning Curve
// ============================================================================

export const learningCurve = {
  id: "ch10-learning-curve",
  title: "Learning Curve — Cumulative Average Time",
  chapter: 10,
  difficulty: "intermediate",
  estimatedMinutes: 6,
  description:
    "Apply the cumulative-average-time learning model to estimate labor as production doubles.",
  reviewChapters: CH10_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const firstUnitTime = randomInRange(40, 120, 5);
    const learningRate = [0.8, 0.85, 0.9][Math.floor(Math.random() * 3)];
    const wage = randomInRange(20, 35, 1);

    return { company, product, firstUnitTime, learningRate, wage };
  },

  scenario: (data) => `
    <p>${data.company.name} just completed the first unit of a custom-engineered
    ${data.product.singular}. The first unit required
    <strong>${data.firstUnitTime} labor hours</strong>. Based on similar projects,
    management expects an <strong>${(data.learningRate * 100).toFixed(0)}% cumulative
    average-time learning curve</strong>. Direct labor costs
    <strong>$${data.wage} per hour</strong>.</p>
  `,

  given: (data) => [
    { label: "First unit time", value: `${data.firstUnitTime} hours` },
    {
      label: "Learning rate",
      value: `${(data.learningRate * 100).toFixed(0)}%`,
    },
    { label: "Wage rate", value: `$${data.wage} per hour` },
  ],

  steps: [
    {
      id: "avg-time-2-units",
      question:
        "What is the cumulative average time per unit after 2 units are produced?",
      resultType: "money-small",
      unit: "hours",
      tolerance: { value: 0.5, type: "absolute" },
      solve: (data) => roundTo(data.firstUnitTime * data.learningRate, 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Cumulative Avg Time @ 2 units",
          formula: "First Unit × Learning Rate",
          values: `${data.firstUnitTime} × ${data.learningRate.toFixed(2)}`,
          result: `${correctValue} hours`,
          highlight: true,
          note: "Each time cumulative production doubles, the cumulative average time per unit drops by the learning rate.",
        },
      ],
    },
    {
      id: "avg-time-4-units",
      question: "What is the cumulative average time per unit after 4 units?",
      resultType: "money-small",
      unit: "hours",
      tolerance: { value: 0.5, type: "absolute" },
      solve: (data, prior) =>
        roundTo(prior["avg-time-2-units"] * data.learningRate, 1),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Cumulative Avg Time @ 4 units",
          formula: "Avg @ 2 units × Learning Rate",
          values: `${prior["avg-time-2-units"]} × ${data.learningRate.toFixed(2)}`,
          result: `${correctValue} hours`,
          highlight: true,
          annotation: carryForwardNote(
            "avg-time-2-units",
            "1",
            prior,
            studentAnswers,
            (v) => `${v} hours`,
          ),
        },
      ],
    },
    {
      id: "total-labor-cost-4",
      question:
        "What is the total direct labor cost for the first 4 units produced?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 50, type: "absolute" },
      solve: (data, prior) =>
        Math.round(prior["avg-time-4-units"] * 4 * data.wage),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Total Labor Cost — 4 Units",
          formula: "Avg Time × Units × Wage",
          values: `${prior["avg-time-4-units"]} hours × 4 units × $${data.wage}/hr`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "avg-time-4-units",
            "2",
            prior,
            studentAnswers,
            (v) => `${v} hours`,
          ),
        },
      ],
    },
    {
      id: "learning-implication",
      type: "choice",
      intentionalSingleAnswer: true,
      question: "Why is the learning curve important for cost estimation?",
      options: [
        {
          id: "declining-costs",
          label:
            "Labor cost per unit declines as cumulative production grows — using a constant per-unit estimate overstates future costs",
        },
        {
          id: "always-linear",
          label: "Labor costs always behave linearly with production",
        },
        {
          id: "only-services",
          label:
            "Learning curves apply only to service operations, not manufacturing",
        },
        {
          id: "irrelevant-for-mature",
          label:
            "Learning curves are irrelevant once a product is in production",
        },
      ],
      correctId: () => "declining-costs",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Why It Matters",
          formula: "Cumulative production doubles → avg time × learning rate",
          values:
            "Failing to account for learning means bidding too high (losing contracts) or budgeting too high (missing improvement targets).",
          result:
            "Learning curve adjusts predictions for the cost-reduction reality of repetition",
          highlight: true,
          note: "Common in aerospace, electronics, complex assembly. Bid prices for follow-on orders often rely on learning-curve projections.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — Regression vs High-Low
// ============================================================================

export const regressionVsHighLow = {
  id: "ch10-regression-vs-highlow",
  title: "Regression vs High-Low",
  chapter: 10,
  difficulty: "advanced",
  estimatedMinutes: 8,
  description:
    "Compare high-low and regression cost estimates. Pick the better predictor and justify with the right criteria.",
  reviewChapters: CH10_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    // True underlying relationship
    const trueSlope = randomInRange(8, 16, 1);
    const trueIntercept = roundToNearest(randomInRange(20000, 50000), 1000);

    // High-low: based on extreme months that have unusual noise
    const lowActivity = roundToNearest(randomInRange(1000, 2000), 100);
    const highActivity = roundToNearest(
      lowActivity + randomInRange(2500, 4500, 100),
      100,
    );
    const lowNoise = randomInRange(-2000, -500, 100); // Negative noise at low → understated cost
    const highNoise = randomInRange(500, 2000, 100); // Positive noise at high → overstated cost

    const lowCost = lowActivity * trueSlope + trueIntercept + lowNoise;
    const highCost = highActivity * trueSlope + trueIntercept + highNoise;

    const hlSlope = roundTo(
      (highCost - lowCost) / (highActivity - lowActivity),
      2,
    );
    const hlIntercept = Math.round(highCost - hlSlope * highActivity);

    // Regression closer to true values
    const regSlope = roundTo(trueSlope + randomInRange(-50, 50, 10) / 100, 2);
    const regIntercept = roundToNearest(
      trueIntercept + randomInRange(-1500, 1500, 100),
      100,
    );
    const regRSquared = roundTo(randomInRange(65, 95, 1) / 100, 2);

    return {
      company,
      lowActivity,
      lowCost,
      highActivity,
      highCost,
      hlSlope,
      hlIntercept,
      regSlope,
      regIntercept,
      regRSquared,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} estimated overhead costs using two methods.</p>
    <p><strong>High-low</strong>: Low month had ${data.lowActivity.toLocaleString()} MH
    at $${data.lowCost.toLocaleString()} cost; high month had
    ${data.highActivity.toLocaleString()} MH at $${data.highCost.toLocaleString()} cost.</p>
    <p><strong>Regression</strong> using 12 months of data: slope $${data.regSlope}/MH,
    intercept $${data.regIntercept.toLocaleString()}, R² = ${data.regRSquared}.</p>
  `,

  given: (data) => [
    { label: "High-low slope", value: `$${data.hlSlope} per MH` },
    {
      label: "High-low intercept",
      value: `$${data.hlIntercept.toLocaleString()}`,
    },
    { label: "Regression slope", value: `$${data.regSlope} per MH` },
    {
      label: "Regression intercept",
      value: `$${data.regIntercept.toLocaleString()}`,
    },
    { label: "Regression R²", value: `${data.regRSquared}` },
  ],

  steps: [
    {
      id: "hl-prediction",
      question:
        "Using the high-low equation, what is the predicted cost at 3,000 MH?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.hlIntercept + data.hlSlope * 3000),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "High-Low Prediction",
          formula: "a + b × x",
          values: `$${data.hlIntercept.toLocaleString()} + ($${data.hlSlope} × 3,000)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "reg-prediction",
      question:
        "Using the regression equation, what is the predicted cost at 3,000 MH?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) => Math.round(data.regIntercept + data.regSlope * 3000),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Regression Prediction",
          formula: "a + b × x",
          values: `$${data.regIntercept.toLocaleString()} + ($${data.regSlope} × 3,000)`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: "prediction-gap",
      question:
        "What is the absolute difference between the two predictions at 3,000 MH? (Enter positive.)",
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) =>
        Math.abs(prior["hl-prediction"] - prior["reg-prediction"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Prediction Gap",
          formula: "|High-Low − Regression|",
          values: `|$${prior["hl-prediction"].toLocaleString()} − $${prior["reg-prediction"].toLocaleString()}|`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "Even small per-unit differences compound at high activity levels — both methods can produce very different predictions.",
        },
      ],
    },
    {
      id: "better-method",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Which estimate is generally more reliable for cost prediction?",
      options: [
        {
          id: "regression",
          label:
            "Regression — uses all data points and provides a measure of fit (R²)",
        },
        { id: "high-low", label: "High-low — simpler and more transparent" },
        {
          id: "depends-on-r-squared",
          label: "Depends on R² — high-low is better when R² < 0.50",
        },
        {
          id: "no-difference",
          label: "No meaningful difference — both produce equivalent results",
        },
      ],
      correctId: () => "regression",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Why Regression Wins",
          formula: "Information used",
          values:
            "High-low: 2 points (often outliers). Regression: all n observations. Regression also provides R² as a fit diagnostic.",
          result: "Regression is generally preferred when data is available",
          highlight: true,
          note: "High-low remains useful as a quick estimate or when only summary data is available, but regression should be the workhorse for serious cost analysis.",
        },
      ],
    },
    {
      id: "r-squared-interpretation",
      type: "choice",
      question: `The regression's R² is ${(data) => data.regRSquared || "X.XX"}. What does this tell you?`,
      options: [
        {
          id: "strong-fit",
          label:
            "The regression explains a large portion of the variation in cost — usable for prediction",
        },
        {
          id: "weak-fit",
          label:
            "The regression is weak; predictions should be treated with caution",
        },
        {
          id: "perfect-fit",
          label: "A perfect fit — cost is fully determined by the driver",
        },
        {
          id: "meaningless",
          label: "R² is a meaningless statistic in cost estimation",
        },
      ],
      correctId: (data) =>
        data.regRSquared >= 0.8 ? "strong-fit" : "weak-fit",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "R² Reading",
          values: `R² = ${data.regRSquared}`,
          result:
            correctId === "strong-fit"
              ? "Strong fit (≥0.80)"
              : "Weak fit (<0.80)",
          highlight: true,
          note: "R² above 0.80 is generally considered strong for overhead cost regressions. Below 0.60 suggests important drivers are missing or the relationship is unstable.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Cost Estimation Method Selection
// ============================================================================

export const methodSelection = {
  id: "ch10-method-selection",
  title: "Cost Estimation Method Selection",
  chapter: 10,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Match the right cost estimation method to three different practical situations.",
  reviewChapters: CH10_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    // Pool of scenarios with the correct method
    const scenarioPool = [
      {
        situation:
          "Estimate cost for a brand-new product line with no historical data",
        bestMethod: "industrial-engineering",
      },
      {
        situation:
          "Estimate maintenance cost using 36 months of historical data",
        bestMethod: "regression",
      },
      {
        situation:
          "Need a quick estimate using only summary data (no monthly detail)",
        bestMethod: "high-low",
      },
      {
        situation:
          "Categorize each line of the G&A ledger as fixed or variable",
        bestMethod: "account-analysis",
      },
      {
        situation: "Estimate cost for a one-off custom engineering project",
        bestMethod: "industrial-engineering",
      },
      {
        situation:
          "Detect whether a cost has changed behavior recently using statistical evidence",
        bestMethod: "regression",
      },
    ];

    const shuffled = scenarioPool.slice().sort(() => Math.random() - 0.5);
    return { company, sit1: shuffled[0], sit2: shuffled[1], sit3: shuffled[2] };
  },

  scenario: (data) => `
    <p>${data.company.name}'s controller faces three cost-estimation problems
    and needs to pick the right method for each.</p>
  `,

  given: (data) => [
    { label: "Situation 1", value: data.sit1.situation },
    { label: "Situation 2", value: data.sit2.situation },
    { label: "Situation 3", value: data.sit3.situation },
  ],

  steps: [
    {
      id: "method-1",
      type: "choice",
      question: "For Situation 1, which method is best?",
      options: [
        {
          id: "account-analysis",
          label:
            "Account analysis — qualitative classification of each ledger account",
        },
        {
          id: "industrial-engineering",
          label: "Industrial engineering — bottom-up time-and-motion study",
        },
        { id: "high-low", label: "High-low method" },
        { id: "regression", label: "Regression analysis" },
      ],
      correctId: (data) => data.sit1.bestMethod,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Match Situation to Method",
          values: data.sit1.situation,
          result:
            correctId === "industrial-engineering"
              ? "Industrial engineering"
              : correctId === "regression"
                ? "Regression"
                : correctId === "high-low"
                  ? "High-low"
                  : "Account analysis",
          highlight: true,
        },
      ],
    },
    {
      id: "method-2",
      type: "choice",
      question: "For Situation 2, which method is best?",
      options: [
        { id: "account-analysis", label: "Account analysis" },
        { id: "industrial-engineering", label: "Industrial engineering" },
        { id: "high-low", label: "High-low method" },
        { id: "regression", label: "Regression analysis" },
      ],
      correctId: (data) => data.sit2.bestMethod,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Match Situation to Method",
          values: data.sit2.situation,
          result:
            correctId === "industrial-engineering"
              ? "Industrial engineering"
              : correctId === "regression"
                ? "Regression"
                : correctId === "high-low"
                  ? "High-low"
                  : "Account analysis",
          highlight: true,
        },
      ],
    },
    {
      id: "method-3",
      type: "choice",
      question: "For Situation 3, which method is best?",
      options: [
        { id: "account-analysis", label: "Account analysis" },
        { id: "industrial-engineering", label: "Industrial engineering" },
        { id: "high-low", label: "High-low method" },
        { id: "regression", label: "Regression analysis" },
      ],
      correctId: (data) => data.sit3.bestMethod,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Match Situation to Method",
          values: data.sit3.situation,
          result:
            correctId === "industrial-engineering"
              ? "Industrial engineering"
              : correctId === "regression"
                ? "Regression"
                : correctId === "high-low"
                  ? "High-low"
                  : "Account analysis",
          highlight: true,
          note: "No single method dominates — the right method depends on data availability, urgency, and the cost/benefit of accuracy. Horngren recommends matching the method to the decision being supported.",
        },
      ],
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const ch10Problems = [
  highLowMethod,
  costFunctionEvaluation,
  learningCurve,
  regressionVsHighLow,
  methodSelection,
];
