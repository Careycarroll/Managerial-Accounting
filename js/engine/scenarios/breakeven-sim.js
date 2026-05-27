// ── Breakeven Simulation ──────────────────────────────────────────────────────
// Scenario definition for "Will we break even? Make a profit?"
// Used by ScenarioEngine in js/engine/scenario-engine.js
//
// Chapters: 3 (CVP), 9 (Inventory Costing), 12 (Relevant Costs)
//
// Stage flow:
//   1. Set Price
//   2. Set Production Volume
//   3A. Cost Reduction Pressure  (if price < midPrice AND volume < 5000)
//   3B. Overhead Allocation      (otherwise)
//   4. Demand Shock
//   5. Year-End Decision
//   → Debrief
//
// Randomization:
//   randomizeMetrics() is called by the engine on every init/reset.
//   All consequence functions derive prices and volumes from state.metrics
//   so the math is always consistent with the randomized starting values.

// ── Randomizer helpers ────────────────────────────────────────────────────────

function randInt(min, max, step = 1) {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
}

function randFloat(min, max, decimals = 2) {
  const v = min + Math.random() * (max - min);
  return Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ── Bell curve option generator ───────────────────────────────────────────────
// Generates N price options distributed around the optimal price.
// The optimal price is placed at a random position (not always center).
// Spacing is irregular to prevent pattern recognition.

function generatePriceOptions(metrics) {
  const { variableCost, fixedCosts, targetProfit, marketDemand } = metrics;

  // Optimal price: hits target profit at 70% of market demand
  const targetVolume = Math.round(marketDemand * 0.7);
  const requiredCM = (fixedCosts + targetProfit) / targetVolume;
  const optimalPrice = Math.round(variableCost + requiredCM);

  // Generate 6 candidate prices at irregular intervals around optimal
  // Shift optimal position randomly (not always center)
  const shift = Math.round((Math.random() - 0.5) * 2); // -1, 0, or +1
  const belowCount = 3 + shift; // 2, 3, or 4 options below optimal
  const aboveCount = 6 - belowCount - 1; // remainder above

  const prices = [];

  // Options below optimal (progressively worse margins)
  // Use wider gaps to prevent multiple prices landing in the optimal zone
  for (let i = belowCount; i >= 1; i--) {
    const gap = randInt(6, 14) * i;
    const price = Math.max(variableCost + 1, optimalPrice - gap);
    prices.push(price);
  }

  // Optimal
  prices.push(optimalPrice);

  // Options above optimal (premium risk)
  for (let i = 1; i <= aboveCount; i++) {
    const gap = randInt(5, 12) * i;
    const price = optimalPrice + gap;
    prices.push(price);
  }

  // Score each price mathematically
  return prices.map((price) => {
    const cm = price - variableCost;
    const bep = cm > 0 ? Math.ceil(fixedCosts / cm) : Infinity;
    const targetUnits =
      cm > 0 ? Math.ceil((fixedCosts + targetProfit) / cm) : Infinity;
    const coverage = marketDemand > 0 ? targetUnits / marketDemand : Infinity;
    // Only the price closest to optimalPrice gets "optimal"
    // All others are scored by coverage thresholds
    const isOptimal = price === optimalPrice;
    const score =
      cm <= 0
        ? "poor"
        : coverage > 1.2
          ? "poor"
          : coverage > 0.95
            ? "suboptimal"
            : isOptimal
              ? "optimal"
              : coverage > 0.65
                ? "acceptable"
                : "acceptable";
    return { price, cm, bep, targetUnits, score };
  });
}

// ── Volume option generator ───────────────────────────────────────────────────

function generateVolumeOptions(metrics) {
  const { fixedCosts, targetProfit, marketDemand, price, variableCost } =
    metrics;

  // Derive CM and BEP from current price if not yet set
  const contributionMargin = metrics.contributionMargin > 0
    ? metrics.contributionMargin
    : (price > 0 ? price - variableCost : 1);
  const bep = metrics.bep > 0
    ? metrics.bep
    : Math.ceil(fixedCosts / contributionMargin);

  // Optimal volume: enough to hit target profit
  const optimalVolume = Math.ceil(
    (fixedCosts + targetProfit) / contributionMargin,
  );

  // Generate 5 volume options at irregular intervals
  const candidates = [
    Math.round(bep * 0.5), // well below BEP -- poor
    Math.round(bep * 0.85), // just below BEP -- suboptimal
    Math.round(bep * 1.1), // just above BEP -- acceptable
    optimalVolume, // hits target -- optimal
    Math.round(optimalVolume * 1.3), // above target -- acceptable (inventory risk)
    Math.round(marketDemand * 1.1), // exceeds market -- suboptimal
  ];

  // Shuffle position of optimal
  return candidates.map((volume) => {
    const oi = volume * contributionMargin - fixedCosts;
    const hitsBEP = volume >= bep;
    const hitsTarget = oi >= targetProfit;
    const score =
      volume < bep * 0.7
        ? "poor"
        : volume < bep
          ? "suboptimal"
          : hitsTarget
            ? "optimal"
            : hitsBEP
              ? "acceptable"
              : "suboptimal";
    return { volume, oi, score };
  });
}

// ── Score price (for numeric input) ──────────────────────────────────────────

function scorePrice(price, metrics) {
  const { variableCost, fixedCosts, targetProfit, marketDemand } = metrics;
  const cm = price - variableCost;
  if (cm <= 0) return "poor";
  const targetUnits = Math.ceil((fixedCosts + targetProfit) / cm);
  const coverage = targetUnits / marketDemand;
  if (coverage > 1.2) return "poor";
  if (coverage > 0.95) return "suboptimal";
  if (coverage > 0.75) return "acceptable";
  return "optimal";
}

// ── Score volume (for numeric input) ─────────────────────────────────────────

function scoreVolume(volume, metrics) {
  const { contributionMargin, fixedCosts, targetProfit, bep } = metrics;
  const oi = volume * contributionMargin - fixedCosts;
  if (volume < bep * 0.7) return "poor";
  if (volume < bep) return "suboptimal";
  if (oi >= targetProfit) return "optimal";
  return "acceptable";
}

// ── Narrative helpers ─────────────────────────────────────────────────────────

function priceNarrative(score, price, metrics) {
  const { variableCost, fixedCosts, targetProfit, marketDemand } = metrics;
  const cm = price - variableCost;
  const bep = cm > 0 ? Math.ceil(fixedCosts / cm) : null;
  const targetUnits =
    cm > 0 ? Math.ceil((fixedCosts + targetProfit) / cm) : null;

  if (score === "poor") {
    return cm <= 0
      ? "A price at or below variable cost means every unit sold increases your loss. No volume of sales will cover fixed costs."
      : "To hit your profit target at this price you would need to sell <strong>" +
          (targetUnits || "").toLocaleString() +
          " units</strong> — far beyond what the market can absorb (<strong>" +
          marketDemand.toLocaleString() +
          " units</strong>). This price is not viable.";
  }
  if (score === "suboptimal") {
    return (
      "At $" +
      price +
      ", you need <strong>" +
      (targetUnits || "").toLocaleString() +
      " units</strong> to hit your profit target — that is <strong>" +
      Math.round((targetUnits / marketDemand) * 100) +
      "%</strong> of total market demand. Very little room for error."
    );
  }
  if (score === "acceptable") {
    return (
      "At $" +
      price +
      ", your target volume of <strong>" +
      (targetUnits || "").toLocaleString() +
      " units</strong> is achievable but leaves limited margin of safety. A modest demand shortfall could push you below target."
    );
  }
  return (
    "At $" +
    price +
    ", your contribution margin of <strong>$" +
    cm +
    "/unit</strong> means you need <strong>" +
    (targetUnits || "").toLocaleString() +
    " units</strong> to hit your profit target — a realistic <strong>" +
    Math.round((targetUnits / marketDemand) * 100) +
    "%</strong> of market demand."
  );
}

function volumeNarrative(score, volume, metrics) {
  const { contributionMargin, fixedCosts, targetProfit, bep } = metrics;
  const oi = Math.round(volume * contributionMargin - fixedCosts);

  if (score === "poor") {
    return (
      "At <strong>" +
      volume.toLocaleString() +
      " units</strong> you are well below breakeven (<strong>" +
      Math.round(bep).toLocaleString() +
      " units</strong>). Operating loss: <strong>($" +
      Math.abs(oi).toLocaleString() +
      ")</strong>. Fixed costs are not covered."
    );
  }
  if (score === "suboptimal") {
    return (
      "At <strong>" +
      volume.toLocaleString() +
      " units</strong> you are below breakeven or short of your profit target. Operating income: <strong>" +
      (oi >= 0
        ? "$" + oi.toLocaleString()
        : "($" + Math.abs(oi).toLocaleString() + ")") +
      "</strong>."
    );
  }
  if (score === "acceptable") {
    return (
      "At <strong>" +
      volume.toLocaleString() +
      " units</strong> you cover fixed costs but fall short of your profit target of <strong>$" +
      targetProfit.toLocaleString() +
      "</strong>. Operating income: <strong>$" +
      oi.toLocaleString() +
      "</strong>."
    );
  }
  return (
    "At <strong>" +
    volume.toLocaleString() +
    " units</strong> you hit your profit target. Operating income: <strong>$" +
    oi.toLocaleString() +
    "</strong> vs target of <strong>$" +
    targetProfit.toLocaleString() +
    "</strong>."
  );
}

// ── Show work builders ────────────────────────────────────────────────────────

function priceShowWork(price, metrics) {
  const { variableCost, fixedCosts, targetProfit, marketDemand } = metrics;
  const cm = price - variableCost;
  const bep = cm > 0 ? Math.ceil(fixedCosts / cm) : null;
  const targetUnits =
    cm > 0 ? Math.ceil((fixedCosts + targetProfit) / cm) : null;
  const coverage =
    targetUnits && marketDemand > 0
      ? ((targetUnits / marketDemand) * 100).toFixed(1)
      : null;

  return [
    {
      label: "Contribution Margin",
      formula: "Price - Variable Cost",
      values: "$" + price + " - $" + variableCost,
      result: cm > 0 ? "$" + cm + "/unit" : "Negative — not viable",
      highlight: true,
    },
    {
      label: "Breakeven Point",
      formula: "Fixed Costs / Contribution Margin",
      values: "$" + fixedCosts.toLocaleString() + " / $" + cm,
      result: bep ? bep.toLocaleString() + " units" : "N/A",
      highlight: true,
    },
    {
      label: "Units to Hit Profit Target",
      formula: "(Fixed Costs + Target Profit) / CM",
      values:
        "($" +
        fixedCosts.toLocaleString() +
        " + $" +
        targetProfit.toLocaleString() +
        ") / $" +
        cm,
      result: targetUnits ? targetUnits.toLocaleString() + " units" : "N/A",
      highlight: true,
    },
    {
      label: "Market Demand Coverage",
      formula: "Target Units / Market Demand",
      values: (targetUnits || "N/A") + " / " + marketDemand.toLocaleString(),
      result: coverage ? coverage + "% of market" : "N/A",
    },
  ];
}

function volumeShowWork(volume, metrics) {
  const { contributionMargin, fixedCosts, targetProfit, bep, price } = metrics;
  const revenue = Math.round(volume * price);
  const totalVC = Math.round(volume * (price - contributionMargin));
  const oi = Math.round(volume * contributionMargin - fixedCosts);
  const mosUnits = volume - bep;
  const mosPct = bep > 0 ? ((mosUnits / volume) * 100).toFixed(1) : null;

  return [
    {
      label: "Revenue",
      formula: "Volume x Price",
      values: volume.toLocaleString() + " x $" + price,
      result: "$" + revenue.toLocaleString(),
    },
    {
      label: "Total Contribution Margin",
      formula: "Volume x CM per Unit",
      values: volume.toLocaleString() + " x $" + contributionMargin,
      result: "$" + Math.round(volume * contributionMargin).toLocaleString(),
      highlight: true,
    },
    {
      label: "Operating Income",
      formula: "Total CM - Fixed Costs",
      values:
        "$" +
        Math.round(volume * contributionMargin).toLocaleString() +
        " - $" +
        fixedCosts.toLocaleString(),
      result:
        oi >= 0
          ? "$" + oi.toLocaleString()
          : "($" + Math.abs(oi).toLocaleString() + ")",
      highlight: true,
    },
    {
      label: "Margin of Safety",
      formula: "Volume - Breakeven Units",
      values:
        volume.toLocaleString() + " - " + Math.round(bep).toLocaleString(),
      result:
        mosUnits >= 0
          ? mosUnits.toLocaleString() + " units (" + mosPct + "%)"
          : "Below breakeven",
    },
    {
      label: "Target Profit Gap",
      formula: "Operating Income - Target Profit",
      values:
        "$" + oi.toLocaleString() + " - $" + targetProfit.toLocaleString(),
      result:
        oi - targetProfit >= 0
          ? "Target met (+$" + (oi - targetProfit).toLocaleString() + ")"
          : "Short by $" + Math.abs(oi - targetProfit).toLocaleString(),
    },
  ];
}

// ── Scenario definition ───────────────────────────────────────────────────────

export const breakevenSim = {
  id: "breakeven",
  title: "Will we break even? Make a profit?",

  reviewChapters: [
    { label: "Ch. 3 — CVP Analysis", href: import.meta.env.BASE_URL + "pages/learn/ch03.html" },
    { label: "Ch. 9 — Inventory Costing", href: import.meta.env.BASE_URL + "pages/learn/ch09.html" },
    { label: "Ch. 12 — Relevant Costs", href: import.meta.env.BASE_URL + "pages/learn/ch12.html" },
  ],

  // ── Randomizer ─────────────────────────────────────────────────────────────

  randomizeMetrics() {
    const variableCost = randInt(18, 45, 1);
    const fixedCosts   = randInt(80000, 220000, 5000);
    const marketDemand = randInt(8000, 20000, 500);

    // targetProfit capped at 40% of fixedCosts to ensure achievability
    // and floored at 15% of fixedCosts so it is always meaningful
    const maxTarget  = Math.round(fixedCosts * 0.4 / 5000) * 5000;
    const minTarget  = Math.round(fixedCosts * 0.15 / 5000) * 5000;
    const targetProfit = randInt(minTarget, maxTarget, 5000);

    // Compute optimal price so we know the midPrice threshold for branching
    const targetVolume = Math.round(marketDemand * 0.7);
    const requiredCM   = (fixedCosts + targetProfit) / targetVolume;
    const optimalPrice = Math.round(variableCost + requiredCM);
    const midPrice     = Math.round(optimalPrice * 0.9); // 90% of optimal = threshold

    // Operation type determines correct overhead allocation method
    // 0 = automated factory, 1 = labor-intensive, 2 = simple single-product, 3 = mixed
    const operationType = randInt(0, 3);

    return {
      variableCost,
      fixedCosts,
      targetProfit,
      marketDemand,
      optimalPrice,
      midPrice,
      operationType,
      // These get populated as decisions are made
      price: 0,
      contributionMargin: 0,
      bep: 0,
      unitsForTarget: 0,
      productionVolume: 0,
      actualSales: 0,
      revenue: 0,
      operatingIncome: 0,
      overheadMethod: null,
      costReductionTaken: false,
    };
  },

  // ── Metric display ──────────────────────────────────────────────────────────

  metricDisplay: [
    { key: "variableCost", label: "Variable Cost", format: "currency" },
    { key: "fixedCosts", label: "Fixed Costs", format: "currency" },
    { key: "targetProfit", label: "Target Profit", format: "currency" },
    { key: "marketDemand", label: "Market Demand", format: "number" },
    {
      key: "price",
      label: "Price Set",
      format: "currency",
      poorIf: (v) => v === 0,
    },
    {
      key: "contributionMargin",
      label: "CM / Unit",
      format: "currency",
      poorIf: (v) => v <= 0,
    },
    {
      key: "bep",
      label: "Breakeven Units",
      format: "number",
      poorIf: (v) => v === 0,
    },
    {
      key: "operatingIncome",
      label: "Op. Income",
      format: "currency",
      poorIf: (v) => v < 0,
    },
  ],

  // ── Stages ─────────────────────────────────────────────────────────────────

  stages: [
    // ── Stage 1: Set Your Price ─────────────────────────────────────────────
    {
      id: "set-price",
      title: "Stage 1 — Set Your Price",

      answerTypes: ["single-choice", "numeric"],

      highlightMetrics: [],

      context: (state) => {
        const { variableCost, fixedCosts, targetProfit, marketDemand } =
          state.metrics;
        return (
          "<p>You are launching a new product. Your cost team has provided the following estimates:</p>" +
          '<ul style="margin:var(--space-3) 0;padding-left:var(--space-5);line-height:2;">' +
          "<li>Variable cost per unit: <strong>$" +
          variableCost +
          "</strong></li>" +
          "<li>Total fixed costs: <strong>$" +
          fixedCosts.toLocaleString() +
          "</strong></li>" +
          "<li>Profit target: <strong>$" +
          targetProfit.toLocaleString() +
          "</strong></li>" +
          "<li>Estimated market demand: <strong>" +
          marketDemand.toLocaleString() +
          " units</strong></li>" +
          "</ul>" +
          "<p>Market research shows competitors price between <strong>$" +
          (variableCost + 5) +
          "</strong> and <strong>$" +
          (variableCost + 60) +
          "</strong>. " +
          "Calculate the contribution margin, breakeven point, and units needed to hit your profit target at each price before deciding.</p>"
        );
      },

      // Single choice: bell curve options
      generateOptions: (state) => {
        const options = generatePriceOptions(state.metrics);
        return options.map((opt) => ({
          label: "$" + opt.price + " per unit",
          sublabel:
            "CM: $" +
            opt.cm +
            "/unit — BEP: " +
            (isFinite(opt.bep) ? opt.bep.toLocaleString() : "N/A") +
            " units — Target: " +
            (isFinite(opt.targetUnits)
              ? opt.targetUnits.toLocaleString()
              : "N/A") +
            " units",
          score: opt.score,
          consequence: (state) => {
            const price = opt.price;
            const cm = price - state.metrics.variableCost;
            const bep =
              cm > 0 ? Math.ceil(state.metrics.fixedCosts / cm) : Infinity;
            const targetUnits =
              cm > 0
                ? Math.ceil(
                    (state.metrics.fixedCosts + state.metrics.targetProfit) /
                      cm,
                  )
                : Infinity;
            return {
              score: opt.score,
              narrative: priceNarrative(opt.score, price, state.metrics),
              metricUpdates: {
                price,
                contributionMargin: cm,
                bep,
                unitsForTarget: targetUnits,
              },
            };
          },
        }));
      },

      // Numeric input
      numericConfig: (state) => ({
        label: "Enter your selling price per unit ($)",
        unit: "per unit",
        min: 0.01,
        step: 1,
        placeholder: "e.g. " + (state.metrics.variableCost + 20),
        hint:
          "Variable cost is $" +
          state.metrics.variableCost +
          ". Your price must exceed this to generate any contribution margin.",
        evaluate: (price, state) => {
          const score = scorePrice(price, state.metrics);
          const cm = price - state.metrics.variableCost;
          const bep =
            cm > 0 ? Math.ceil(state.metrics.fixedCosts / cm) : Infinity;
          const targetUnits =
            cm > 0
              ? Math.ceil(
                  (state.metrics.fixedCosts + state.metrics.targetProfit) / cm,
                )
              : Infinity;
          return {
            score,
            narrative: priceNarrative(score, price, state.metrics),
            metricUpdates: {
              price,
              contributionMargin: cm > 0 ? cm : 0,
              bep: isFinite(bep) ? bep : 0,
              unitsForTarget: isFinite(targetUnits) ? targetUnits : 0,
            },
          };
        },
      }),

      // Show work
      showWork: (answer, answerType, state) => {
        const price =
          answerType === "numeric"
            ? answer
            : answer.consequence(state).metricUpdates.price;
        return priceShowWork(price, state.metrics);
      },

      nextStage: "set-volume",
    },

    // ── Stage 2: Set Production Volume ──────────────────────────────────────
    {
      id: "set-volume",
      title: "Stage 2 — Set Production Volume",

      answerTypes: ["single-choice", "numeric"],

      highlightMetrics: ["price", "contributionMargin", "bep"],

      context: (state) => {
        const {
          price,
          contributionMargin,
          bep,
          fixedCosts,
          targetProfit,
          unitsForTarget,
          marketDemand,
        } = state.metrics;
        return (
          "<p>You set your price at <strong>$" +
          price +
          "</strong>. " +
          "Your contribution margin is <strong>$" +
          contributionMargin +
          "/unit</strong> " +
          "and your breakeven point is <strong>" +
          Math.round(bep).toLocaleString() +
          " units</strong>.</p>" +
          "<p>You need <strong>" +
          Math.round(unitsForTarget).toLocaleString() +
          " units</strong> to hit your profit target of <strong>$" +
          targetProfit.toLocaleString() +
          "</strong>. " +
          "Market demand is estimated at <strong>" +
          marketDemand.toLocaleString() +
          " units</strong>.</p>" +
          "<p>How many units do you commit to producing? Producing too few risks stockouts. Producing too many risks unsold inventory and write-downs.</p>"
        );
      },

      generateOptions: (state) => {
        const options = generateVolumeOptions(state.metrics);
        return options.map((opt) => ({
          label: opt.volume.toLocaleString() + " units",
          sublabel:
            "Operating income: " +
            (opt.oi >= 0
              ? "$" + Math.round(opt.oi).toLocaleString()
              : "($" + Math.abs(Math.round(opt.oi)).toLocaleString() + ")"),
          score: opt.score,
          consequence: (state) => {
            const { price, variableCost, fixedCosts } = state.metrics;
            const revenue = opt.volume * price;
            const oi = Math.round(
              opt.volume * state.metrics.contributionMargin - fixedCosts,
            );
            return {
              score: opt.score,
              narrative: volumeNarrative(opt.score, opt.volume, state.metrics),
              metricUpdates: {
                productionVolume: opt.volume,
                actualSales: opt.volume,
                revenue,
                operatingIncome: oi,
              },
            };
          },
        }));
      },

      numericConfig: (state) => ({
        label: "Enter your production volume (units)",
        unit: "units",
        min: 1,
        step: 100,
        placeholder:
          "e.g. " + Math.round(state.metrics.bep * 1.2).toLocaleString(),
        hint:
          "Breakeven is " +
          Math.round(state.metrics.bep).toLocaleString() +
          " units. Target profit requires " +
          Math.round(state.metrics.unitsForTarget).toLocaleString() +
          " units.",
        evaluate: (volume, state) => {
          const score = scoreVolume(volume, state.metrics);
          const revenue = Math.round(volume * state.metrics.price);
          const oi = Math.round(
            volume * state.metrics.contributionMargin -
              state.metrics.fixedCosts,
          );
          return {
            score,
            narrative: volumeNarrative(score, volume, state.metrics),
            metricUpdates: {
              productionVolume: volume,
              actualSales: volume,
              revenue,
              operatingIncome: oi,
            },
          };
        },
      }),

      showWork: (answer, answerType, state) => {
        const volume =
          answerType === "numeric"
            ? answer
            : parseInt(answer.label.replace(/,/g, ""));
        return volumeShowWork(volume, state.metrics);
      },

      nextStage: (state) => {
        const { price, midPrice, productionVolume } = state.metrics;
        if (price < midPrice && productionVolume < 5000)
          return "cost-reduction";
        return "overhead-allocation";
      },
    },

    // ── Stage 3A: Cost Reduction Pressure ───────────────────────────────────
    {
      id: "cost-reduction",
      title: "Stage 3 — Cost Reduction Pressure",

      answerTypes: ["multiple-choice"],

      highlightMetrics: ["price", "productionVolume", "operatingIncome"],

      context: (state) => {
        const { price, productionVolume, operatingIncome } = state.metrics;
        return (
          '<p style="color:var(--color-danger);font-weight:700;">Warning: Your current plan is not covering fixed costs.</p>' +
          "<p>At <strong>$" +
          price +
          "/unit</strong> and <strong>" +
          productionVolume.toLocaleString() +
          " units</strong>, " +
          "your operating income is <strong>(" +
          Math.abs(Math.round(operatingIncome)).toLocaleString() +
          ")</strong> — a loss.</p>" +
          "<p>You can take one or more corrective actions. Each action has a cost or risk. " +
          "Select the actions you will take. Choosing the right combination is critical — " +
          "some actions help, some hurt, and taking too many can introduce new problems.</p>"
        );
      },

      generateMultiOptions: (state) => {
        const {
          price,
          variableCost,
          fixedCosts,
          productionVolume,
          optimalPrice,
        } = state.metrics;
        return [
          {
            id: "raise-price",
            label: "Raise price to $" + optimalPrice + " — realign with market",
            sublabel:
              "Corrects the root cause. New CM: $" +
              (optimalPrice - variableCost) +
              "/unit",
            correct: true,
            poor: false,
          },
          {
            id: "cut-vc",
            label:
              "Outsource production — reduce variable cost by $" +
              Math.round(variableCost * 0.15) +
              "/unit",
            sublabel:
              "Improves margin but introduces quality and lead time risk",
            correct: true,
            poor: false,
          },
          {
            id: "cut-fc",
            label:
              "Cut fixed costs by $" +
              Math.round(fixedCosts * 0.15).toLocaleString() +
              " through headcount reduction",
            sublabel: "Reduces breakeven but impacts team capacity and morale",
            correct: true,
            poor: false,
          },
          {
            id: "increase-marketing",
            label:
              "Increase marketing spend by $" +
              Math.round(fixedCosts * 0.1).toLocaleString(),
            sublabel:
              "Adds fixed costs with uncertain demand uplift — worsens the loss",
            correct: false,
            poor: false,
          },
          {
            id: "cut-quality",
            label:
              "Reduce product quality to cut variable cost by $" +
              Math.round(variableCost * 0.2) +
              "/unit",
            sublabel:
              "Short-term cost saving with serious brand and customer retention risk",
            correct: false,
            poor: true,
          },
          {
            id: "do-nothing",
            label: "Do nothing — hope demand improves",
            sublabel: "No action taken. Loss continues to accumulate.",
            correct: false,
            poor: true,
          },
        ];
      },

      evaluateSelection: (selected, state, allOptions) => {
        const {
          price,
          variableCost,
          fixedCosts,
          productionVolume,
          optimalPrice,
        } = state.metrics;
        const ids = selected.map(o => o.id);
        const hasPoor =
          ids.includes("cut-quality") ||
          ids.includes("do-nothing");
        const hasMarketing = ids.includes("increase-marketing");
        const raisedPrice = ids.includes("raise-price");
        const cutVC = ids.includes("cut-vc");
        const cutFC = ids.includes("cut-fc");
        const correctCount = [raisedPrice, cutVC, cutFC].filter(Boolean).length;

        let score,
          narrative,
          metricUpdates = {};

        if (hasPoor) {
          score = "poor";
          narrative =
            "One or more of your selected actions will cause serious harm to the business. " +
            (ids.includes("cut-quality")
              ? "Cutting quality destroys brand equity and customer trust — the long-term cost far exceeds the short-term saving. "
              : "") +
            (ids.includes("do-nothing")
              ? "Taking no action allows losses to compound. "
              : "");
        } else if (hasMarketing && correctCount === 0) {
          score = "suboptimal";
          narrative =
            "Increasing marketing spend adds to fixed costs when you are already losing money. Without a price or cost correction, this deepens the loss.";
        } else if (correctCount === 3) {
          score = "optimal";
          narrative =
            "You identified all three corrective levers — price, variable cost, and fixed cost. Combining all three gives you the strongest path to profitability.";
          const newPrice = optimalPrice;
          const newVC = Math.round(variableCost * 0.85);
          const newFC = Math.round(fixedCosts * 0.85);
          const newCM = newPrice - newVC;
          const newOI = Math.round(productionVolume * newCM - newFC);
          metricUpdates = {
            price: newPrice,
            variableCost: newVC,
            fixedCosts: newFC,
            contributionMargin: newCM,
            operatingIncome: newOI,
            costReductionTaken: true,
          };
        } else if (correctCount === 2) {
          score = "acceptable";
          narrative =
            "You identified two of the three corrective levers. Good — but you left one improvement on the table.";
          if (raisedPrice && cutVC) {
            const newPrice = optimalPrice;
            const newVC = Math.round(variableCost * 0.85);
            const newCM = newPrice - newVC;
            const newOI = Math.round(productionVolume * newCM - fixedCosts);
            metricUpdates = {
              price: newPrice,
              variableCost: newVC,
              contributionMargin: newCM,
              operatingIncome: newOI,
              costReductionTaken: true,
            };
          } else if (raisedPrice && cutFC) {
            const newPrice = optimalPrice;
            const newFC = Math.round(fixedCosts * 0.85);
            const newCM = newPrice - variableCost;
            const newOI = Math.round(productionVolume * newCM - newFC);
            metricUpdates = {
              price: newPrice,
              fixedCosts: newFC,
              contributionMargin: newCM,
              operatingIncome: newOI,
              costReductionTaken: true,
            };
          } else {
            const newVC = Math.round(variableCost * 0.85);
            const newFC = Math.round(fixedCosts * 0.85);
            const newCM = price - newVC;
            const newOI = Math.round(productionVolume * newCM - newFC);
            metricUpdates = {
              variableCost: newVC,
              fixedCosts: newFC,
              contributionMargin: newCM,
              operatingIncome: newOI,
              costReductionTaken: true,
            };
          }
        } else if (correctCount === 1) {
          score = "suboptimal";
          narrative =
            "You identified one corrective action — a partial fix. The business is still under pressure. Two or three combined actions would have been more effective.";
          if (raisedPrice) {
            const newCM = optimalPrice - variableCost;
            const newOI = Math.round(productionVolume * newCM - fixedCosts);
            metricUpdates = {
              price: optimalPrice,
              contributionMargin: newCM,
              operatingIncome: newOI,
              costReductionTaken: true,
            };
          } else if (cutVC) {
            const newVC = Math.round(variableCost * 0.85);
            const newCM = price - newVC;
            const newOI = Math.round(productionVolume * newCM - fixedCosts);
            metricUpdates = {
              variableCost: newVC,
              contributionMargin: newCM,
              operatingIncome: newOI,
              costReductionTaken: true,
            };
          } else {
            const newFC = Math.round(fixedCosts * 0.85);
            const newOI = Math.round(
              productionVolume * state.metrics.contributionMargin - newFC,
            );
            metricUpdates = {
              fixedCosts: newFC,
              operatingIncome: newOI,
              costReductionTaken: true,
            };
          }
        } else {
          score = "poor";
          narrative =
            "No corrective action was taken that improves the business. The loss will continue.";
        }

        return {
          score,
          narrative,
          metricUpdates,
          selectionBreakdown: (allOptions || []).map(o => ({
            label: o.label,
            selected: ids.includes(o.id),
            correct: o.correct,
            reason: o.poor
              ? "Harmful — causes serious business damage"
              : o.correct
                ? ids.includes(o.id) ? "Correct action taken" : "Correct action — not selected"
                : ids.includes(o.id) ? "Incorrect — adds cost or risk without fixing root cause" : "Correctly avoided",
          })),
        };
      },

      showWork: (answer, answerType, state) => {
        const {
          price,
          variableCost,
          fixedCosts,
          productionVolume,
          contributionMargin,
        } = state.metrics;
        const currentOI = Math.round(
          productionVolume * contributionMargin - fixedCosts,
        );
        return [
          {
            label: "Current Operating Income",
            formula: "(Volume x CM) - Fixed Costs",
            values:
              productionVolume.toLocaleString() +
              " x $" +
              contributionMargin +
              " - $" +
              fixedCosts.toLocaleString(),
            result:
              currentOI >= 0
                ? "$" + currentOI.toLocaleString()
                : "($" + Math.abs(currentOI).toLocaleString() + ")",
            highlight: true,
          },
          {
            label: "Impact of Raising Price",
            formula: "New CM x Volume - Fixed Costs",
            values:
              "$" +
              (state.metrics.optimalPrice - variableCost) +
              " x " +
              productionVolume.toLocaleString() +
              " - $" +
              fixedCosts.toLocaleString(),
            result:
              "$" +
              Math.round(
                productionVolume * (state.metrics.optimalPrice - variableCost) -
                  fixedCosts,
              ).toLocaleString(),
          },
          {
            label: "Impact of Cutting Variable Cost 15%",
            formula: "New CM x Volume - Fixed Costs",
            values:
              "$" +
              (price - Math.round(variableCost * 0.85)) +
              " x " +
              productionVolume.toLocaleString() +
              " - $" +
              fixedCosts.toLocaleString(),
            result:
              "$" +
              Math.round(
                productionVolume * (price - Math.round(variableCost * 0.85)) -
                  fixedCosts,
              ).toLocaleString(),
          },
          {
            label: "Impact of Cutting Fixed Costs 15%",
            formula: "CM x Volume - New Fixed Costs",
            values:
              "$" +
              contributionMargin +
              " x " +
              productionVolume.toLocaleString() +
              " - $" +
              Math.round(fixedCosts * 0.85).toLocaleString(),
            result:
              "$" +
              Math.round(
                productionVolume * contributionMargin - fixedCosts * 0.85,
              ).toLocaleString(),
          },
        ];
      },

      nextStage: "demand-shock",
    },

    // ── Stage 3B: Overhead Allocation ───────────────────────────────────────
    {
      id: "overhead-allocation",
      title: "Stage 3 — Overhead Allocation Method",

      answerTypes: ["single-choice"],

      highlightMetrics: ["price", "productionVolume", "operatingIncome"],

      context: (state) => {
        const { price, productionVolume, operatingIncome, operationType, fixedCosts } = state.metrics;
        const typeDescriptions = [
          "<strong>Highly automated facility.</strong> Direct labor is less than 10% of production cost. " +
          "Overhead is driven by machine time, setups, and equipment maintenance. " +
          "You produce multiple product lines with very different machine hour requirements.",
          "<strong>Labor-intensive operation.</strong> Workers perform most production steps by hand. " +
          "Direct labor hours closely track how overhead is consumed across products. " +
          "Machine usage is minimal and roughly equal across product lines.",
          "<strong>Simple single-product operation.</strong> You manufacture one standardized product in high volume. " +
          "All overhead goes to this one product regardless of allocation method. " +
          "Simplicity and ease of explanation matter more than precision.",
          "<strong>Mixed multi-product operation.</strong> You produce several products with very different complexity levels. " +
          "Some require extensive setups and quality inspections; others are simple runs. " +
          "A single allocation base is unlikely to capture this variation accurately.",
        ];
        return (
          "<p>Production is underway. At <strong>" +
          productionVolume.toLocaleString() +
          " units</strong> and a price of <strong>$" +
          price +
          "</strong>, your projected operating income is <strong>" +
          (operatingIncome >= 0
            ? "$" + Math.round(operatingIncome).toLocaleString()
            : "($" + Math.abs(Math.round(operatingIncome)).toLocaleString() + ")") +
          "</strong>.</p>" +
          "<p><strong>Your operation:</strong> " + typeDescriptions[operationType] + "</p>" +
          "<p>Manufacturing overhead is approximately <strong>$" +
          Math.round(fixedCosts * 0.4).toLocaleString() +
          "</strong> of your fixed costs. Your CFO asks how you want to allocate it to products. " +
          "The right method depends on what actually drives overhead consumption in your operation. " +
          "Which method do you choose?</p>"
        );
      },

      generateOptions: (state) => {
        const t = state.metrics.operationType;
        // Scoring shifts based on operation type:
        // 0 = automated factory       → ABC optimal, labor hours poor
        // 1 = labor-intensive         → labor hours optimal, ABC acceptable (overkill)
        // 2 = simple single-product   → units produced acceptable, ABC overkill
        // 3 = mixed multi-product     → ABC optimal, labor hours suboptimal
        const scores = {
          'direct-labor': t === 1 ? 'optimal'    : t === 2 ? 'acceptable' : t === 0 ? 'poor'       : 'suboptimal',
          'abc':          t === 1 ? 'acceptable' : t === 2 ? 'suboptimal' : t === 0 ? 'optimal'    : 'optimal',
          'units':        t === 1 ? 'suboptimal' : t === 2 ? 'acceptable' : t === 0 ? 'suboptimal' : 'suboptimal',
          'period':       'poor',
          'none':         'poor',
        };

        const narratives = {
          'direct-labor': {
            optimal:    'In a labor-intensive operation, direct labor hours accurately reflect how overhead is consumed — this is the right choice here.',
            acceptable: 'Direct labor hours work reasonably well in a mixed operation but may miss some cost driver variation.',
            suboptimal: 'In a mixed multi-product operation, labor hours miss important cost driver differences between products.',
            poor:       'In a highly automated factory, labor hours are a tiny fraction of activity. This method will severely distort product costs.',
          },
          'abc': {
            optimal:    'ABC accurately traces overhead to the activities that drive it — ideal for your automated or multi-product operation.',
            acceptable: 'ABC is accurate but may be more complex than needed for a labor-intensive operation where labor hours already capture most variation.',
            suboptimal: 'ABC is powerful but overkill for a simple single-product operation — the added complexity does not improve decisions here.',
          },
          'units': {
            acceptable: 'For a simple single-product operation, allocating by units produced is straightforward and accurate enough.',
            suboptimal: 'Allocating equally per unit ignores how different products consume overhead differently — leads to mispricing.',
          },
        };

        const getNarrative = (method, score) => {
          return (narratives[method] && narratives[method][score])
            ? narratives[method][score]
            : 'This method does not match your operation type and will distort product costs.';
        };

        return [
          {
            label: 'Allocate by direct labor hours',
            sublabel: t === 1
              ? 'Your operation is labor-intensive — labor hours drive most overhead'
              : t === 0
                ? 'Your factory is highly automated — labor hours are minimal'
                : 'Traditional method — accuracy depends on whether labor drives overhead',
            consequence: () => {
              const score = scores['direct-labor'];
              return {
                score,
                narrative: getNarrative('direct-labor', score),
                detail: score === 'optimal'
                  ? 'Labor hours closely track overhead consumption in your operation. This method produces accurate product costs at low complexity.'
                  : score === 'poor'
                    ? 'Your automated factory runs with minimal direct labor. Allocating by labor hours will produce wildly distorted product costs — high-volume automated products will appear cheap while any labor-touched products will appear expensive.'
                    : 'Labor hours capture some but not all overhead variation in your operation. Product costs will be approximate.',
                metricUpdates: { overheadMethod: 'direct-labor' },
              };
            },
          },
          {
            label: 'Allocate using ABC — activity-based cost drivers',
            sublabel: t === 0 || t === 3
              ? 'Multiple cost drivers — setups, machine hours, inspections'
              : t === 1
                ? 'Accurate but complex for a labor-driven operation'
                : 'Powerful but may be overkill for a simple operation',
            consequence: () => {
              const score = scores['abc'];
              return {
                score,
                narrative: getNarrative('abc', score),
                detail: score === 'optimal'
                  ? 'ABC traces overhead to the specific activities that drive it — machine setups, quality inspections, material handling. In your operation this produces the most accurate product costs.'
                  : score === 'acceptable'
                    ? 'ABC is accurate but adds implementation complexity. In your labor-intensive operation, direct labor hours already capture most overhead variation at lower cost.'
                    : 'ABC adds significant complexity for a single-product operation where all overhead goes to one product anyway. Simpler methods work just as well here.',
                metricUpdates: { overheadMethod: 'abc' },
              };
            },
          },
          {
            label: 'Allocate by units produced — simple volume-based rate',
            sublabel: t === 2
              ? 'Single product operation — all overhead goes to one product'
              : 'Treats all units as equally overhead-intensive',
            consequence: () => {
              const score = scores['units'];
              return {
                score,
                narrative: getNarrative('units', score),
                detail: score === 'acceptable'
                  ? 'With a single product, all overhead is allocated to that product regardless of method. Units produced is simple, accurate enough, and easy to explain.'
                  : 'Allocating equally per unit assumes every unit consumes the same overhead. In your operation this is not true — different products or batches consume very different amounts of overhead resources.',
                metricUpdates: { overheadMethod: 'units' },
              };
            },
          },
          {
            label: 'Allocate by machine hours',
            sublabel: t === 0
              ? 'Your automated factory runs on machine time — this tracks actual consumption'
              : 'Machine hours may not reflect overhead consumption in your operation',
            consequence: () => {
              const score = t === 0 ? 'optimal' : t === 3 ? 'acceptable' : 'suboptimal';
              return {
                score,
                narrative: t === 0
                  ? 'In an automated factory, machine hours directly drive overhead — energy, maintenance, depreciation. This is an accurate and defensible allocation base.'
                  : t === 3
                    ? 'Machine hours capture overhead reasonably well in a mixed operation, though ABC would be more precise.'
                    : 'Machine hours do not reflect how overhead is consumed in your operation — labor or activity-based drivers would be more accurate.',
                detail: 'Machine hour rates are calculated as: Total Overhead / Total Machine Hours. Each product is charged based on machine hours consumed.',
                metricUpdates: { overheadMethod: 'machine-hours' },
              };
            },
          },
          {
            label: 'Treat all overhead as a period cost — expense immediately',
            sublabel: 'No allocation — overhead hits income statement when incurred',
            consequence: () => ({
              score: 'poor',
              narrative: 'Expensing all overhead as a period cost violates matching principles and distorts product profitability.',
              detail: 'Without overhead allocation, inventory is understated and product margins appear higher than they really are. This leads to underpricing, poor product mix decisions, and financial statements that do not reflect true product economics.',
              metricUpdates: { overheadMethod: 'period' },
            }),
          },
        ];
      },

      showWork: (answer, answerType, state) => {
        const t = state.metrics.operationType;
        const typeLabel = t === 0 ? 'Automated Factory'
                        : t === 1 ? 'Labor-Intensive Operation'
                        : t === 2 ? 'Simple Single-Product'
                        : 'Mixed Multi-Product';
        const optimalMethod = t === 0 ? 'ABC or Machine Hours'
                            : t === 1 ? 'Direct Labor Hours'
                            : t === 2 ? 'Units Produced or Labor Hours'
                            : 'ABC';
        return [
          { label: 'Operation Type',      result: typeLabel },
          { label: 'Overhead Driver',     result: t === 0 ? 'Machine time and setups' : t === 1 ? 'Direct labor hours' : t === 2 ? 'Production volume' : 'Multiple activity drivers' },
          { label: 'Optimal Method',      result: optimalMethod, highlight: true },
          { label: 'Why It Matters',      result: 'The allocation method determines reported product cost, which drives pricing, inventory valuation, and product mix decisions.' },
        ];
      },

      nextStage: "demand-shock",
    },

    // ── Stage 4: Demand Shock ────────────────────────────────────────────────
    {
      id: "demand-shock",
      title: "Stage 4 — Demand Shock",

      answerTypes: ["single-choice", "multiple-choice"],

      highlightMetrics: ["price", "productionVolume", "operatingIncome"],

      context: (state) => {
        const { price, productionVolume } = state.metrics;
        const actualDemand = Math.round(productionVolume * 0.8);
        return (
          '<p style="color:var(--color-warning);font-weight:700;">Mid-year update: actual demand is running 20% below forecast.</p>' +
          "<p>You planned to sell <strong>" +
          productionVolume.toLocaleString() +
          " units</strong> at <strong>$" +
          price +
          "</strong>. " +
          "Actual demand looks like <strong>" +
          actualDemand.toLocaleString() +
          " units</strong>. " +
          "You have already produced your full planned run.</p>" +
          "<p>What do you do? You may take one action (single choice) or combine multiple responses.</p>"
        );
      },

      generateOptions: (state) => {
        const {
          price,
          productionVolume,
          variableCost,
          fixedCosts,
          contributionMargin,
          bep,
        } = state.metrics;
        const actualSales = Math.round(productionVolume * 0.8);
        const discountedPrice = Math.round(price * 0.85);
        const discountedOI = Math.round(
          productionVolume * (discountedPrice - variableCost) - fixedCosts,
        );
        const holdOI = Math.round(
          actualSales * contributionMargin - fixedCosts,
        );
        const aboveBEP = actualSales > bep;

        return [
          {
            label: "Discount price by 15% to clear all inventory",
            sublabel:
              "New price: $" +
              discountedPrice +
              " — OI: " +
              (discountedOI >= 0
                ? "$" + discountedOI.toLocaleString()
                : "($" + Math.abs(discountedOI).toLocaleString() + ")"),
            score: "acceptable",
            consequence: (state) => ({
              score: "acceptable",
              narrative:
                "Discounting clears inventory but permanently compresses margin and may signal desperation to the market.",
              metricUpdates: {
                price: discountedPrice,
                actualSales: productionVolume,
                operatingIncome: discountedOI,
              },
            }),
          },
          {
            label: "Hold price — accept lower sales, carry inventory",
            sublabel:
              "Sales: " +
              actualSales.toLocaleString() +
              " units — OI: " +
              (holdOI >= 0
                ? "$" + holdOI.toLocaleString()
                : "($" + Math.abs(holdOI).toLocaleString() + ")"),
            score: "acceptable",
            consequence: (state) => ({
              score: "acceptable",
              narrative:
                "Holding price protects margin integrity but leaves unsold inventory on the shelf.",
              metricUpdates: { actualSales, operatingIncome: holdOI },
            }),
          },
          {
            label:
              "Run CVP analysis — find minimum viable sales volume at current price",
            sublabel:
              "Data-driven: determine if forecast demand still covers breakeven",
            score: aboveBEP ? "optimal" : "acceptable",
            consequence: (state) => ({
              score: aboveBEP ? "optimal" : "acceptable",
              narrative: aboveBEP
                ? "CVP analysis confirms forecast demand of " +
                  actualSales.toLocaleString() +
                  " units still exceeds your breakeven of " +
                  Math.round(bep).toLocaleString() +
                  " units — you remain profitable."
                : "CVP analysis reveals forecast demand of " +
                  actualSales.toLocaleString() +
                  " units falls below your breakeven of " +
                  Math.round(bep).toLocaleString() +
                  " units — action is required.",
              metricUpdates: { actualSales, operatingIncome: holdOI },
            }),
          },
          {
            label: "Accelerate production to build inventory for next period",
            sublabel: "Increases carrying costs with no demand to support it",
            score: "poor",
            consequence: (state) => ({
              score: "poor",
              narrative:
                "Producing more when demand is already below forecast compounds the inventory problem and adds carrying costs.",
              metricUpdates: {
                actualSales,
                operatingIncome: holdOI - Math.round(fixedCosts * 0.05),
              },
            }),
          },
        ];
      },

      generateMultiOptions: (state) => {
        const {
          price,
          productionVolume,
          variableCost,
          fixedCosts,
          contributionMargin,
          bep,
        } = state.metrics;
        const actualSales = Math.round(productionVolume * 0.8);
        return [
          {
            id: "cvp-analysis",
            label:
              "Run CVP analysis to understand breakeven vs forecast demand",
            correct: true,
            poor: false,
          },
          {
            id: "hold-price",
            label: "Hold price — protect margin integrity",
            correct: true,
            poor: false,
          },
          {
            id: "partial-discount",
            label: "Offer a targeted 10% discount to key customers only",
            correct: true,
            poor: false,
          },
          {
            id: "full-discount",
            label: "Discount 20% across the board to clear all inventory",
            correct: false,
            poor: false,
          },
          {
            id: "more-production",
            label: "Produce more units to lower per-unit fixed cost",
            correct: false,
            poor: true,
          },
          {
            id: "ignore",
            label: "Take no action — wait for demand to recover on its own",
            correct: false,
            poor: true,
          },
        ];
      },

      evaluateSelection: (selected, state, allOptions) => {
        const { productionVolume, contributionMargin, fixedCosts, bep } =
          state.metrics;
        const ids = selected.map(o => o.id);
        const actualSales = Math.round(productionVolume * 0.8);
        const hasPoor =
          ids.includes("more-production") ||
          ids.includes("ignore");
        const hasCVP = ids.includes("cvp-analysis");
        const holdsPrice = ids.includes("hold-price");
        const partialDisc = ids.includes("partial-discount");
        const fullDisc = ids.includes("full-discount");
        const correctCount = [hasCVP, holdsPrice, partialDisc].filter(
          Boolean,
        ).length;
        const oi = Math.round(actualSales * contributionMargin - fixedCosts);

        let score, narrative;
        if (hasPoor) {
          score = "poor";
          narrative =
            "One or more selected actions will worsen the situation. " +
            (ids.includes("more-production")
              ? "Producing more when demand is below forecast increases inventory risk. "
              : "") +
            (ids.includes("ignore")
              ? "Taking no action allows the shortfall to compound. "
              : "");
        } else if (correctCount >= 2) {
          score = "optimal";
          narrative =
            "Strong response — you combined analysis with targeted action to manage the demand shortfall without sacrificing margin integrity.";
        } else if (correctCount === 1 || fullDisc) {
          score = "acceptable";
          narrative =
            "Partial response. A single action addresses the symptom but a combined approach would have been more effective.";
        } else {
          score = "suboptimal";
          narrative =
            "No effective action taken to address the demand shortfall.";
        }

        return {
          score,
          narrative,
          metricUpdates: { actualSales, operatingIncome: oi },
          selectionBreakdown: (allOptions || []).map(o => ({
            label: o.label,
            selected: ids.includes(o.id),
            correct: o.correct,
            reason: o.poor
              ? "Harmful — causes serious business damage"
              : o.correct
                ? ids.includes(o.id) ? "Correct action taken" : "Correct action — not selected"
                : ids.includes(o.id) ? "Incorrect — adds cost or risk" : "Correctly avoided",
          })),
        };
      },

      showWork: (answer, answerType, state) => {
        const { price, productionVolume, contributionMargin, fixedCosts, bep } =
          state.metrics;
        const actualSales = Math.round(productionVolume * 0.8);
        const holdOI = Math.round(
          actualSales * contributionMargin - fixedCosts,
        );
        const aboveBEP = actualSales > bep;
        return [
          {
            label: "Forecast Demand (80% of plan)",
            formula: "Planned Volume x 0.80",
            values: productionVolume.toLocaleString() + " x 0.80",
            result: actualSales.toLocaleString() + " units",
            highlight: true,
          },
          {
            label: "Breakeven Point",
            result: Math.round(bep).toLocaleString() + " units",
          },
          {
            label: "Forecast vs Breakeven",
            result: aboveBEP
              ? "Above breakeven by " +
                (actualSales - Math.round(bep)).toLocaleString() +
                " units — still profitable"
              : "Below breakeven by " +
                (Math.round(bep) - actualSales).toLocaleString() +
                " units — action required",
            highlight: true,
          },
          {
            label: "Operating Income at Forecast Demand",
            formula: "(Forecast Sales x CM) - Fixed Costs",
            values:
              actualSales.toLocaleString() +
              " x $" +
              contributionMargin +
              " - $" +
              fixedCosts.toLocaleString(),
            result:
              holdOI >= 0
                ? "$" + holdOI.toLocaleString()
                : "($" + Math.abs(holdOI).toLocaleString() + ")",
            highlight: true,
          },
        ];
      },

      nextStage: "year-end",
    },

    // ── Stage 5: Year-End Decision ───────────────────────────────────────────
    {
      id: "year-end",
      title: "Stage 5 — Year-End Decision",

      answerTypes: ["multiple-choice"],

      highlightMetrics: ["operatingIncome", "targetProfit", "price"],

      context: (state) => {
        const {
          price,
          actualSales,
          productionVolume,
          operatingIncome,
          targetProfit,
        } = state.metrics;
        const units = actualSales || productionVolume;
        const hitTarget = operatingIncome >= targetProfit;
        const profitable = operatingIncome >= 0;
        return (
          "<p>The year is complete. Here is where you stand:</p>" +
          '<ul style="margin:var(--space-3) 0;padding-left:var(--space-5);line-height:2;">' +
          "<li>Units sold: <strong>" +
          units.toLocaleString() +
          "</strong></li>" +
          "<li>Price: <strong>$" +
          price +
          "</strong></li>" +
          "<li>Operating income: <strong>" +
          (operatingIncome >= 0
            ? "$" + Math.round(operatingIncome).toLocaleString()
            : "($" +
              Math.abs(Math.round(operatingIncome)).toLocaleString() +
              ")") +
          "</strong></li>" +
          "<li>Profit target: <strong>$" +
          Math.round(targetProfit).toLocaleString() +
          "</strong> — " +
          (hitTarget
            ? '<span style="color:var(--color-success);">Met</span>'
            : '<span style="color:var(--color-danger);">Missed</span>') +
          "</li>" +
          "</ul>" +
          "<p>Select the strategic actions you will take heading into year two. You may select multiple.</p>"
        );
      },

      generateMultiOptions: (state) => {
        const { operatingIncome, targetProfit } = state.metrics;
        const hitTarget = operatingIncome >= targetProfit;
        const profitable = operatingIncome >= 0;
        return [
          {
            id: "cvp-revision",
            label:
              "Run CVP analysis to set price and volume targets for year two",
            correct: true,
            poor: false,
          },
          {
            id: "cost-review",
            label: "Conduct a full cost structure review — fixed and variable",
            correct: true,
            poor: false,
          },
          {
            id: "price-test",
            label: "Test a price increase with a subset of customers",
            correct: hitTarget,
            poor: false,
          },
          {
            id: "maintain",
            label: "Maintain current strategy unchanged",
            correct: hitTarget,
            poor: !hitTarget,
          },
          {
            id: "exit",
            label: "Exit the product line",
            correct: !profitable && operatingIncome < -50000,
            poor: profitable,
          },
          {
            id: "expand-volume",
            label:
              "Aggressively expand production volume without a price review",
            correct: false,
            poor: true,
          },
        ];
      },

      evaluateSelection: (selected, state, allOptions) => {
        const ids = selected.map(o => o.id);
        const {
          operatingIncome,
          targetProfit,
          fixedCosts,
          variableCost,
          contributionMargin,
        } = state.metrics;
        const hitTarget = operatingIncome >= targetProfit;
        const profitable = operatingIncome >= 0;
        const hasPoor =
          ids.includes("expand-volume") ||
          (ids.includes("exit") && profitable) ||
          (ids.includes("maintain") && !hitTarget);
        const hasCVP = ids.includes("cvp-revision");
        const hasCostRev = ids.includes("cost-review");
        const correctCount = [hasCVP, hasCostRev].filter(Boolean).length;

        let score, narrative;
        if (hasPoor) {
          score = "poor";
          narrative =
            "One or more selected actions are harmful given your current results. " +
            (!hitTarget && ids.includes("maintain")
              ? "Maintaining a strategy that missed the profit target without adjustment will produce the same result next year. "
              : "") +
            (profitable && ids.includes("exit")
              ? "Exiting a profitable product line forfeits future contribution margin. "
              : "") +
            (ids.includes("expand-volume")
              ? "Expanding volume without a price review could deepen losses if margin is insufficient. "
              : "");
        } else if (correctCount === 2) {
          score = "optimal";
          narrative =
            "Excellent year-two planning. CVP analysis combined with a cost structure review gives you the data to set realistic, achievable targets.";
        } else if (correctCount === 1) {
          score = "acceptable";
          narrative =
            "Partial planning. You identified one key action but left another improvement on the table.";
        } else {
          score = "suboptimal";
          narrative =
            "No data-driven planning actions selected. Year two targets will be set without analytical support.";
        }

        const optimalPrice = state.metrics.optimalPrice;
        const newCM = optimalPrice - variableCost;
        const newBEP = Math.ceil(fixedCosts / newCM);

        return {
          score,
          narrative,
          metricUpdates: hasCVP
            ? { price: optimalPrice, contributionMargin: newCM, bep: newBEP }
            : {},
          selectionBreakdown: (allOptions || []).map(o => ({
            label: o.label,
            selected: ids.includes(o.id),
            correct: o.correct,
            reason: o.poor
              ? "Harmful — causes serious business damage"
              : o.correct
                ? ids.includes(o.id) ? "Correct action taken" : "Correct action — not selected"
                : ids.includes(o.id) ? "Incorrect — not recommended here" : "Correctly avoided",
          })),
        };
      },

      showWork: (answer, answerType, state) => {
        const {
          operatingIncome,
          targetProfit,
          fixedCosts,
          variableCost,
          optimalPrice,
          marketDemand,
        } = state.metrics;
        const newCM = optimalPrice - variableCost;
        const newBEP = Math.ceil(fixedCosts / newCM);
        const newTargetUnits = Math.ceil((fixedCosts + targetProfit) / newCM);
        return [
          {
            label: "Year One Result",
            result:
              operatingIncome >= 0
                ? "$" +
                  Math.round(operatingIncome).toLocaleString() +
                  " operating income"
                : "($" +
                  Math.abs(Math.round(operatingIncome)).toLocaleString() +
                  ") operating loss",
            highlight: true,
          },
          {
            label: "Gap to Target",
            formula: "Operating Income - Target Profit",
            values:
              "$" +
              Math.round(operatingIncome).toLocaleString() +
              " - $" +
              targetProfit.toLocaleString(),
            result:
              operatingIncome - targetProfit >= 0
                ? "Target met by $" +
                  (operatingIncome - targetProfit).toLocaleString()
                : "Short by $" +
                  Math.abs(
                    Math.round(operatingIncome - targetProfit),
                  ).toLocaleString(),
          },
          {
            label: "Year Two — Optimal Price",
            result: "$" + optimalPrice + " per unit",
          },
          {
            label: "Year Two — CM at Optimal Price",
            formula: "Optimal Price - Variable Cost",
            values: "$" + optimalPrice + " - $" + variableCost,
            result: "$" + newCM + "/unit",
            highlight: true,
          },
          {
            label: "Year Two — Units Needed for Target",
            formula: "(Fixed Costs + Target Profit) / CM",
            values:
              "($" +
              fixedCosts.toLocaleString() +
              " + $" +
              targetProfit.toLocaleString() +
              ") / $" +
              newCM,
            result:
              newTargetUnits.toLocaleString() +
              " units (" +
              Math.round((newTargetUnits / marketDemand) * 100) +
              "% of market)",
            highlight: true,
          },
        ];
      },

      nextStage: null,
    },

    // ── Stage 3B: Overhead Allocation ─────────────────────────────────────────
    {
      id: "overhead-allocation",
      title: "Stage 3 — Overhead Allocation Method",
      answerTypes: ["single-choice"],

      context: (state) => {
        const { price, productionVolume, operatingIncome } = state.metrics;
        return (
          "<p>Production is underway at <strong>" +
          productionVolume.toLocaleString() +
          " units</strong> " +
          "and a price of <strong>$" +
          price +
          "</strong>. " +
          "Projected operating income: <strong>" +
          (operatingIncome >= 0
            ? "$" + Math.round(operatingIncome).toLocaleString()
            : "($" +
              Math.abs(Math.round(operatingIncome)).toLocaleString() +
              ")") +
          "</strong>.</p>" +
          "<p>Your CFO asks how you want to allocate manufacturing overhead to products. " +
          "This affects reported product costs, pricing decisions, and inventory valuation. " +
          "Which method do you choose?</p>"
        );
      },

      highlightMetrics: ["price", "productionVolume", "operatingIncome"],

      generateOptions: (state) => [
        {
          label: "Allocate by direct labor hours",
          sublabel:
            "Traditional method — simple but may distort costs in automated environments",
          consequence: () => ({
            score: "acceptable",
            narrative:
              "Traditional allocation is simple but can mislead pricing decisions.",
            detail:
              "Direct labor hour allocation works well when labor drives overhead. " +
              "In automated operations it can over-cost labor-intensive products and under-cost machine-intensive ones, " +
              "leading to pricing decisions based on distorted product costs.",
            metricUpdates: { overheadMethod: "direct-labor" },
          }),
        },
        {
          label: "Allocate using ABC — activity-based cost drivers",
          sublabel:
            "More accurate — traces overhead to what actually drives costs",
          consequence: () => ({
            score: "optimal",
            narrative:
              "ABC reveals the true cost of each product and supports better pricing.",
            detail:
              "Activity-based costing traces overhead to products based on what actually drives costs — " +
              "setups, inspections, machine hours. This gives you accurate product margins and prevents " +
              "cross-subsidization between high-volume and low-volume products.",
            metricUpdates: { overheadMethod: "abc" },
          }),
        },
        {
          label: "Treat all overhead as a period cost — do not allocate",
          sublabel:
            "Simplest approach — but misleading for inventory and pricing",
          consequence: () => ({
            score: "suboptimal",
            narrative:
              "Expensing all overhead as a period cost distorts product profitability.",
            detail:
              "Treating overhead as a period cost means your inventory is understated and " +
              "your product margins appear higher than they really are. " +
              "This can lead to underpricing and poor product mix decisions.",
            metricUpdates: { overheadMethod: "period" },
          }),
        },
        {
          label: "Allocate by units produced — simple volume-based rate",
          sublabel: "Easy to calculate but ignores cost driver differences",
          consequence: () => ({
            score: "suboptimal",
            narrative:
              "Volume-based allocation is easy but ignores what actually drives overhead.",
            detail:
              "Allocating equally per unit produced assumes every unit consumes the same overhead. " +
              "In reality, complex or low-volume products often consume disproportionately more overhead. " +
              "This method will systematically under-cost complex products and over-cost simple ones.",
            metricUpdates: { overheadMethod: "units" },
          }),
        },
        {
          label: "Do not track overhead at all — expense as incurred",
          sublabel:
            "No allocation system — overhead hits the income statement immediately",
          consequence: () => ({
            score: "poor",
            narrative: "No overhead tracking makes product costing impossible.",
            detail:
              "Without any overhead allocation system you cannot determine true product costs, " +
              "set cost-based prices, or value inventory correctly. " +
              "This violates GAAP for external reporting and makes internal decisions unreliable.",
            metricUpdates: { overheadMethod: "none" },
          }),
        },
      ],

      showWork: (answer, answerType, state) => [
        {
          label: "Method Selected",
          result: answer.label || "N/A",
        },
        {
          label: "Impact on Product Costs",
          result:
            answer.consequence().score === "optimal"
              ? "Accurate — costs traced to drivers"
              : answer.consequence().score === "poor"
                ? "None — no product cost visibility"
                : "Approximate — may distort margins",
        },
        {
          label: "Inventory Valuation",
          result:
            answer.consequence().score === "poor"
              ? "Understated"
              : "Included in product cost",
        },
      ],

      nextStage: "demand-shock",
    },

    // ── Stage 4: Demand Shock ─────────────────────────────────────────────────
    {
      id: "demand-shock",
      title: "Stage 4 — Demand Shock",
      answerTypes: ["single-choice", "multiple-choice"],

      context: (state) => {
        const { price, productionVolume, bep } = state.metrics;
        const actualDemand = Math.round(productionVolume * 0.8);
        return (
          '<p style="color:var(--color-warning);font-weight:700;">Mid-year update: actual demand is running 20% below forecast.</p>' +
          "<p>You planned to sell <strong>" +
          productionVolume.toLocaleString() +
          " units</strong> at <strong>$" +
          price +
          "</strong>. " +
          "Actual demand looks like <strong>" +
          actualDemand.toLocaleString() +
          " units</strong>. " +
          "Your breakeven point is <strong>" +
          Math.round(bep).toLocaleString() +
          " units</strong>. " +
          "You have already produced your full planned run. What do you do?</p>"
        );
      },

      highlightMetrics: ["price", "productionVolume", "bep", "operatingIncome"],

      generateOptions: (state) => {
        const { price, productionVolume, variableCost, fixedCosts, bep } =
          state.metrics;
        const actualDemand = Math.round(productionVolume * 0.8);
        const discountedPrice = Math.round(price * 0.85);
        const revenueDiscount = actualDemand * discountedPrice;
        const revenueHold = actualDemand * price;
        const oiDiscount =
          revenueDiscount - actualDemand * variableCost - fixedCosts;
        const oiHold = revenueHold - actualDemand * variableCost - fixedCosts;
        const aboveBEP = actualDemand >= bep;

        return [
          {
            label: "Discount price by 15% to clear inventory",
            sublabel:
              "New price: $" +
              discountedPrice +
              " — projected OI: " +
              (oiDiscount >= 0
                ? "$" + Math.round(oiDiscount).toLocaleString()
                : "($" +
                  Math.abs(Math.round(oiDiscount)).toLocaleString() +
                  ")"),
            consequence: (state) => {
              const { productionVolume, variableCost, fixedCosts } =
                state.metrics;
              const revenue = productionVolume * discountedPrice;
              const oi = revenue - productionVolume * variableCost - fixedCosts;
              return {
                score: "acceptable",
                narrative:
                  "Discounting clears inventory but compresses margin.",
                detail:
                  "All <strong>" +
                  productionVolume.toLocaleString() +
                  " units</strong> sell at <strong>$" +
                  discountedPrice +
                  "</strong>. " +
                  "Revenue: <strong>$" +
                  revenue.toLocaleString() +
                  "</strong>. " +
                  "Operating income: <strong>" +
                  (oi >= 0
                    ? "$" + Math.round(oi).toLocaleString()
                    : "($" + Math.abs(Math.round(oi)).toLocaleString() + ")") +
                  "</strong>.",
                metricUpdates: {
                  price: discountedPrice,
                  actualSales: productionVolume,
                  revenue,
                  operatingIncome: oi,
                },
              };
            },
          },
          {
            label: "Hold price — accept lower sales volume",
            sublabel:
              "Sell " +
              actualDemand.toLocaleString() +
              " units at $" +
              price +
              " — projected OI: " +
              (oiHold >= 0
                ? "$" + Math.round(oiHold).toLocaleString()
                : "($" + Math.abs(Math.round(oiHold)).toLocaleString() + ")"),
            consequence: (state) => {
              const { price, variableCost, fixedCosts } = state.metrics;
              const revenue = actualDemand * price;
              const oi = revenue - actualDemand * variableCost - fixedCosts;
              return {
                score: aboveBEP ? "acceptable" : "suboptimal",
                narrative: aboveBEP
                  ? "Holding price keeps margin intact — you are still above breakeven."
                  : "Holding price leaves you below breakeven with unsold inventory.",
                detail:
                  "Only <strong>" +
                  actualDemand.toLocaleString() +
                  " units</strong> sell. " +
                  "Revenue: <strong>$" +
                  revenue.toLocaleString() +
                  "</strong>. " +
                  "Operating income: <strong>" +
                  (oi >= 0
                    ? "$" + Math.round(oi).toLocaleString()
                    : "($" + Math.abs(Math.round(oi)).toLocaleString() + ")") +
                  "</strong>. " +
                  "Unsold inventory: <strong>" +
                  (
                    state.metrics.productionVolume - actualDemand
                  ).toLocaleString() +
                  " units</strong>.",
                metricUpdates: {
                  actualSales: actualDemand,
                  revenue,
                  operatingIncome: oi,
                },
              };
            },
          },
          {
            label:
              "Analyze CVP — find the minimum volume needed at current price",
            sublabel:
              "Breakeven is " +
              Math.round(bep).toLocaleString() +
              " units — forecast demand is " +
              (aboveBEP ? "above" : "below") +
              " breakeven",
            consequence: (state) => {
              const { price, variableCost, fixedCosts, bep } = state.metrics;
              const revenue = actualDemand * price;
              const oi = revenue - actualDemand * variableCost - fixedCosts;
              return {
                score: "optimal",
                narrative:
                  "CVP analysis gives you the data to make an informed decision.",
                detail:
                  "At $" +
                  price +
                  ", breakeven is <strong>" +
                  Math.round(bep).toLocaleString() +
                  " units</strong>. " +
                  "Forecast demand of <strong>" +
                  actualDemand.toLocaleString() +
                  " units</strong> is " +
                  (aboveBEP
                    ? '<strong style="color:var(--color-success);">above breakeven</strong> — you will still be profitable.'
                    : '<strong style="color:var(--color-danger);">below breakeven</strong> — you need to act.') +
                  " Operating income at forecast: <strong>" +
                  (oi >= 0
                    ? "$" + Math.round(oi).toLocaleString()
                    : "($" + Math.abs(Math.round(oi)).toLocaleString() + ")") +
                  "</strong>.",
                metricUpdates: {
                  actualSales: actualDemand,
                  revenue,
                  operatingIncome: oi,
                },
              };
            },
          },
          {
            label: "Increase marketing spend to boost demand",
            sublabel: "Spend $15,000 on promotions — uncertain return",
            consequence: (state) => {
              const { price, variableCost, fixedCosts } = state.metrics;
              const newFC = fixedCosts + 15000;
              const revenue = actualDemand * price;
              const oi = revenue - actualDemand * variableCost - newFC;
              return {
                score: "suboptimal",
                narrative:
                  "Marketing spend adds fixed costs with uncertain demand uplift.",
                detail:
                  "Fixed costs increase by <strong>$15,000</strong> to <strong>$" +
                  Math.round(newFC).toLocaleString() +
                  "</strong>. " +
                  "If demand does not respond, operating income falls to <strong>" +
                  (oi >= 0
                    ? "$" + Math.round(oi).toLocaleString()
                    : "($" + Math.abs(Math.round(oi)).toLocaleString() + ")") +
                  "</strong>.",
                metricUpdates: {
                  fixedCosts: newFC,
                  actualSales: actualDemand,
                  revenue,
                  operatingIncome: oi,
                },
              };
            },
          },
          {
            label: "Write off unsold inventory immediately",
            sublabel: "Take the loss now — clear the books",
            consequence: (state) => {
              const { price, variableCost, fixedCosts, productionVolume } =
                state.metrics;
              const unsold = productionVolume - actualDemand;
              const writeOff = unsold * variableCost;
              const revenue = actualDemand * price;
              const oi = revenue - productionVolume * variableCost - fixedCosts;
              return {
                score: "poor",
                narrative:
                  "Writing off inventory destroys value that could be recovered.",
                detail:
                  "Writing off <strong>" +
                  unsold.toLocaleString() +
                  " units</strong> at cost destroys <strong>$" +
                  Math.round(writeOff).toLocaleString() +
                  "</strong> in value. " +
                  "Operating income: <strong>($" +
                  Math.abs(Math.round(oi)).toLocaleString() +
                  ")</strong>. " +
                  "Discounting or holding inventory are both better options.",
                metricUpdates: {
                  actualSales: actualDemand,
                  revenue,
                  operatingIncome: oi,
                },
              };
            },
          },
        ];
      },

      generateMultiOptions: (state) => {
        const { price, productionVolume, variableCost, fixedCosts, bep } =
          state.metrics;
        const actualDemand = Math.round(productionVolume * 0.8);
        const aboveBEP = actualDemand >= bep;
        return [
          {
            id: "cvp-analysis",
            label: "Run CVP analysis to understand breakeven at current demand",
            correct: true,
          },
          {
            id: "partial-discount",
            label: "Offer a modest 10% discount to move excess inventory",
            correct: true,
          },
          {
            id: "hold-price",
            label: "Hold price and carry unsold inventory into next period",
            correct: aboveBEP,
          },
          {
            id: "marketing",
            label: "Increase marketing spend by $15,000",
            correct: false,
          },
          {
            id: "write-off",
            label: "Write off all unsold inventory immediately",
            correct: false,
          },
          {
            id: "halt-production",
            label: "Halt all future production immediately",
            correct: false,
          },
        ];
      },

      evaluateSelection: (selected, state) => {
        const { price, productionVolume, variableCost, fixedCosts, bep } =
          state.metrics;
        const actualDemand = Math.round(productionVolume * 0.8);
        const ids = selected.map((o) => o.id);
        const hasWriteOff = ids.includes("write-off");
        const hasHalt = ids.includes("halt-production");
        const hasCVP = ids.includes("cvp-analysis");
        const hasDiscount = ids.includes("partial-discount");
        const hasMarketing = ids.includes("marketing");

        const discountPrice = Math.round(price * 0.9);
        const revenue = actualDemand * discountPrice;
        const oi =
          revenue -
          actualDemand * variableCost -
          fixedCosts -
          (hasMarketing ? 15000 : 0);

        if (hasWriteOff || hasHalt)
          return {
            score: "poor",
            narrative:
              "Writing off inventory or halting production destroys recoverable value.",
            detail:
              "These actions lock in losses that could be avoided. Write-offs destroy asset value; halting production does not address the demand shortfall.",
            metricUpdates: { actualSales: actualDemand, operatingIncome: oi },
            selectionBreakdown: selected.map((o) => ({
              label: o.label,
              selected: true,
              correct: o.correct,
              reason:
                o.id === "write-off"
                  ? "Destroys recoverable value"
                  : o.id === "halt-production"
                    ? "Does not address demand shortfall"
                    : o.correct
                      ? "Good choice"
                      : "Adds cost without clear benefit",
            })),
          };

        if (hasCVP && hasDiscount)
          return {
            score: "optimal",
            narrative:
              "CVP analysis plus a modest discount is the optimal response.",
            detail:
              "Understanding your breakeven first, then offering a targeted discount, maximizes recovery while preserving as much margin as possible.",
            metricUpdates: {
              price: discountPrice,
              actualSales: actualDemand,
              revenue,
              operatingIncome: oi,
            },
            selectionBreakdown: selected.map((o) => ({
              label: o.label,
              selected: true,
              correct: o.correct,
              reason: o.correct
                ? "Correct — supports informed decision-making"
                : "Adds unnecessary cost",
            })),
          };

        if (hasCVP || hasDiscount)
          return {
            score: "acceptable",
            narrative: "Partial response — you addressed part of the problem.",
            detail: hasCVP
              ? "CVP analysis is the right first step but without action on inventory you may still miss targets."
              : "A discount helps move inventory but without CVP analysis you may be discounting unnecessarily.",
            metricUpdates: { actualSales: actualDemand, operatingIncome: oi },
            selectionBreakdown: selected.map((o) => ({
              label: o.label,
              selected: true,
              correct: o.correct,
              reason: o.correct
                ? "Good choice"
                : "Not the best use of resources here",
            })),
          };

        return {
          score: "suboptimal",
          narrative:
            "None of the selected actions directly address the demand shortfall.",
          detail:
            "When demand falls short, the priority is understanding your breakeven position and deciding whether to discount or hold. Marketing spend and write-offs are not the right first moves.",
          metricUpdates: { actualSales: actualDemand, operatingIncome: oi },
          selectionBreakdown: selected.map((o) => ({
            label: o.label,
            selected: true,
            correct: false,
            reason: "Does not directly address the demand shortfall",
          })),
        };
      },

      showWork: (answer, answerType, state) => {
        const {
          price,
          productionVolume,
          variableCost,
          fixedCosts,
          bep,
          contributionMargin,
        } = state.metrics;
        const actualDemand = Math.round(productionVolume * 0.8);
        const oiAtForecast = actualDemand * contributionMargin - fixedCosts;
        return [
          {
            label: "Planned Volume",
            result: productionVolume.toLocaleString() + " units",
          },
          {
            label: "Forecast Demand (80%)",
            result: actualDemand.toLocaleString() + " units",
            highlight: true,
          },
          {
            label: "Breakeven Point",
            result: Math.round(bep).toLocaleString() + " units",
          },
          {
            label: "Demand vs BEP",
            result:
              actualDemand >= bep ? "Above breakeven ✓" : "Below breakeven ✗",
            highlight: true,
          },
          {
            label: "OI at Forecast Demand",
            formula: "(Forecast x CM) - Fixed Costs",
            values:
              actualDemand.toLocaleString() +
              " x $" +
              contributionMargin +
              " - $" +
              Math.round(fixedCosts).toLocaleString(),
            result:
              oiAtForecast >= 0
                ? "$" + Math.round(oiAtForecast).toLocaleString()
                : "($" +
                  Math.abs(Math.round(oiAtForecast)).toLocaleString() +
                  ")",
            highlight: true,
          },
        ];
      },

      nextStage: "year-end",
    },

    // ── Stage 5: Year-End Decision ────────────────────────────────────────────
    {
      id: "year-end",
      title: "Stage 5 — Year-End Decision",
      answerTypes: ["single-choice", "multiple-choice"],

      context: (state) => {
        const {
          price,
          actualSales,
          productionVolume,
          operatingIncome,
          targetProfit,
        } = state.metrics;
        const sales = actualSales || productionVolume;
        const hitTarget = operatingIncome >= targetProfit;
        const profitable = operatingIncome >= 0;
        return (
          "<p>The year is complete. Here is where you stand:</p>" +
          '<ul style="margin:var(--space-3) 0;padding-left:var(--space-5);font-size:var(--font-size-sm);line-height:2;">' +
          "<li>Units sold: <strong>" +
          sales.toLocaleString() +
          "</strong></li>" +
          "<li>Price: <strong>$" +
          price +
          "</strong></li>" +
          "<li>Operating income: <strong>" +
          (operatingIncome >= 0
            ? "$" + Math.round(operatingIncome).toLocaleString()
            : "($" +
              Math.abs(Math.round(operatingIncome)).toLocaleString() +
              ")") +
          "</strong></li>" +
          "<li>Profit target: <strong>$" +
          Math.round(targetProfit).toLocaleString() +
          "</strong> — " +
          (hitTarget
            ? '<span style="color:var(--color-success);">Target met ✓</span>'
            : '<span style="color:var(--color-danger);">Target missed ✗</span>') +
          "</li>" +
          "</ul>" +
          "<p>Looking ahead to next year, what is your strategic decision?</p>"
        );
      },

      highlightMetrics: ["operatingIncome", "targetProfit", "price"],

      generateOptions: (state) => {
        const {
          operatingIncome,
          targetProfit,
          fixedCosts,
          variableCost,
          contributionMargin,
          bep,
        } = state.metrics;
        const hitTarget = operatingIncome >= targetProfit;
        const profitable = operatingIncome >= 0;
        const deepLoss = operatingIncome < -50000;

        return [
          {
            label: "Revise price and volume targets using CVP analysis",
            sublabel:
              "Use this year's data to set mathematically grounded targets for next year",
            consequence: (state) => {
              const {
                fixedCosts,
                variableCost,
                targetProfit,
                contributionMargin,
              } = state.metrics;
              const unitsNeeded = Math.ceil(
                (fixedCosts + targetProfit) / contributionMargin,
              );
              return {
                score: "optimal",
                narrative:
                  "CVP-driven planning sets you up for a profitable year two.",
                detail:
                  "With a contribution margin of <strong>$" +
                  contributionMargin +
                  "/unit</strong>, " +
                  "you need to sell <strong>" +
                  unitsNeeded.toLocaleString() +
                  " units</strong> to hit your profit target of <strong>$" +
                  Math.round(targetProfit).toLocaleString() +
                  "</strong>. " +
                  "This gives your sales and production teams a clear, data-driven goal.",
                metricUpdates: {
                  bep: Math.ceil(fixedCosts / contributionMargin),
                },
              };
            },
          },
          {
            label:
              "Maintain current strategy — same price and volume next year",
            sublabel: hitTarget
              ? "Results were positive — stay the course"
              : "Results missed target — repeating without change",
            consequence: (state) => {
              const { operatingIncome, targetProfit } = state.metrics;
              return {
                score: hitTarget ? "acceptable" : "suboptimal",
                narrative: hitTarget
                  ? "Maintaining a working strategy is reasonable but CVP analysis could unlock further improvement."
                  : "Repeating a strategy that missed the profit target without adjustment is unlikely to improve results.",
                detail: hitTarget
                  ? "Your results were positive. Staying the course preserves what is working."
                  : "Operating income of <strong>" +
                    (operatingIncome >= 0
                      ? "$" + Math.round(operatingIncome).toLocaleString()
                      : "($" +
                        Math.abs(Math.round(operatingIncome)).toLocaleString() +
                        ")") +
                    "</strong> missed the target of <strong>$" +
                    Math.round(targetProfit).toLocaleString() +
                    "</strong>. " +
                    "Without a change in price, volume, or cost structure, next year will likely produce the same result.",
                metricUpdates: {},
              };
            },
          },
          {
            label: "Reduce price by 10% to grow market share",
            sublabel:
              "Trade margin for volume — only works if volume increase offsets margin loss",
            consequence: (state) => {
              const { price, contributionMargin, fixedCosts, targetProfit } =
                state.metrics;
              const newPrice = Math.round(price * 0.9);
              const newCM = contributionMargin - (price - newPrice);
              const newBEP =
                newCM > 0 ? Math.ceil(fixedCosts / newCM) : Infinity;
              const newTarget =
                newCM > 0
                  ? Math.ceil((fixedCosts + targetProfit) / newCM)
                  : Infinity;
              return {
                score:
                  newCM > 0 && newTarget < 15000 ? "acceptable" : "suboptimal",
                narrative:
                  "Price reduction requires significantly higher volume to compensate.",
                detail:
                  "At <strong>$" +
                  newPrice +
                  "</strong>, CM drops to <strong>$" +
                  newCM +
                  "/unit</strong>. " +
                  "New breakeven: <strong>" +
                  (isFinite(newBEP) ? newBEP.toLocaleString() : "N/A") +
                  " units</strong>. " +
                  "Units needed for target profit: <strong>" +
                  (isFinite(newTarget) ? newTarget.toLocaleString() : "N/A") +
                  "</strong>. " +
                  "Confirm market demand can support this volume before cutting price.",
                metricUpdates: {
                  price: newPrice,
                  contributionMargin: newCM,
                  bep: newBEP,
                },
              };
            },
          },
          {
            label: "Exit the product line — cut losses",
            sublabel: deepLoss
              ? "Deep losses with no clear fix — exit may be rational"
              : "Product is viable — exiting forfeits contribution margin",
            consequence: (state) => {
              const { operatingIncome } = state.metrics;
              return {
                score: deepLoss ? "acceptable" : "poor",
                narrative: deepLoss
                  ? "With deep losses and no structural fix, exit may be the right call."
                  : "Exiting a viable product forfeits contribution margin that covers fixed costs.",
                detail: deepLoss
                  ? "Operating losses of <strong>($" +
                    Math.abs(Math.round(operatingIncome)).toLocaleString() +
                    ")</strong> with no clear path to profitability makes exit rational. " +
                    "Before exiting, confirm fixed costs are truly avoidable and consider relevant cost analysis (Ch. 12)."
                  : "Your product is " +
                    (operatingIncome >= 0
                      ? "profitable"
                      : "close to breakeven") +
                    ". " +
                    "Exiting now forfeits contribution margin. A CVP-driven revision is a better path forward.",
                metricUpdates: {},
              };
            },
          },
          {
            label: "Increase fixed costs by investing in automation",
            sublabel:
              "Higher FC but lower VC per unit — only viable at high volume",
            consequence: (state) => {
              const {
                fixedCosts,
                variableCost,
                contributionMargin,
                targetProfit,
              } = state.metrics;
              const newFC = fixedCosts + 40000;
              const newVC = Math.round(variableCost * 0.85);
              const newCM = contributionMargin + (variableCost - newVC);
              const newBEP = Math.ceil(newFC / newCM);
              const newTarget = Math.ceil((newFC + targetProfit) / newCM);
              return {
                score:
                  newBEP < Math.ceil(fixedCosts / contributionMargin)
                    ? "acceptable"
                    : "suboptimal",
                narrative:
                  "Automation trades fixed for variable costs — only beneficial at high volume.",
                detail:
                  "Fixed costs rise to <strong>$" +
                  Math.round(newFC).toLocaleString() +
                  "</strong> but VC drops to <strong>$" +
                  newVC +
                  "/unit</strong>. " +
                  "New CM: <strong>$" +
                  newCM +
                  "/unit</strong>. " +
                  "New breakeven: <strong>" +
                  newBEP.toLocaleString() +
                  " units</strong>. " +
                  "This only makes sense if you can reliably sell above the new breakeven.",
                metricUpdates: {
                  fixedCosts: newFC,
                  variableCost: newVC,
                  contributionMargin: newCM,
                  bep: newBEP,
                },
              };
            },
          },
        ];
      },

      generateMultiOptions: (state) => {
        const { operatingIncome, targetProfit } = state.metrics;
        const hitTarget = operatingIncome >= targetProfit;
        return [
          {
            id: "cvp-revision",
            label:
              "Run CVP analysis to set price and volume targets for next year",
            correct: true,
          },
          {
            id: "cost-review",
            label:
              "Review fixed and variable cost structure for reduction opportunities",
            correct: true,
          },
          {
            id: "market-research",
            label: "Conduct market research to validate demand assumptions",
            correct: true,
          },
          {
            id: "price-cut",
            label: "Cut price by 15% to grow market share",
            correct: false,
          },
          {
            id: "exit",
            label: "Exit the product line",
            correct: !hitTarget && operatingIncome < -50000,
          },
          {
            id: "do-nothing",
            label: "Make no changes — repeat the same plan",
            correct: false,
          },
        ];
      },

      evaluateSelection: (selected, state) => {
        const { operatingIncome, targetProfit } = state.metrics;
        const ids = selected.map((o) => o.id);
        const hasDoNothing = ids.includes("do-nothing");
        const hasCVP = ids.includes("cvp-revision");
        const hasCostReview = ids.includes("cost-review");
        const hasMarket = ids.includes("market-research");
        const hasPriceCut = ids.includes("price-cut");
        const correctCount = [hasCVP, hasCostReview, hasMarket].filter(
          Boolean,
        ).length;

        if (hasDoNothing)
          return {
            score: "poor",
            narrative:
              "Making no changes after missing targets guarantees the same result.",
            detail:
              "Without CVP analysis, cost review, or market research, next year will repeat this year's outcome.",
            metricUpdates: {},
            selectionBreakdown: selected.map((o) => ({
              label: o.label,
              selected: true,
              correct: o.correct,
              reason:
                o.id === "do-nothing"
                  ? "Guarantees same outcome"
                  : "Good initiative",
            })),
          };

        if (correctCount === 3)
          return {
            score: "optimal",
            narrative:
              "Comprehensive planning approach — CVP, cost review, and market validation.",
            detail:
              "Combining CVP analysis with cost structure review and market research gives you the full picture needed to set achievable targets.",
            metricUpdates: {},
            selectionBreakdown: selected.map((o) => ({
              label: o.label,
              selected: true,
              correct: o.correct,
              reason: o.correct
                ? "Strong planning initiative"
                : "Adds risk without clear benefit",
            })),
          };

        if (correctCount >= 1)
          return {
            score: "acceptable",
            narrative:
              "Partial planning — you identified some key actions but missed others.",
            detail:
              "Good start. Adding " +
              (!hasCVP
                ? "CVP analysis"
                : !hasCostReview
                  ? "a cost structure review"
                  : "market research") +
              " would strengthen your plan.",
            metricUpdates: {},
            selectionBreakdown: selected.map((o) => ({
              label: o.label,
              selected: true,
              correct: o.correct,
              reason: o.correct
                ? "Good planning initiative"
                : "Consider the cost-benefit carefully",
            })),
          };

        return {
          score: "suboptimal",
          narrative:
            "None of the selected actions directly support better planning.",
          detail:
            "Price cuts without CVP analysis are guesswork. Start with the math — CVP, cost review, and market research — before making structural changes.",
          metricUpdates: {},
          selectionBreakdown: selected.map((o) => ({
            label: o.label,
            selected: true,
            correct: false,
            reason: "Does not address root cause of performance gap",
          })),
        };
      },

      showWork: (answer, answerType, state) => {
        const {
          operatingIncome,
          targetProfit,
          contributionMargin,
          fixedCosts,
        } = state.metrics;
        const gap = targetProfit - operatingIncome;
        const unitsNeeded =
          contributionMargin > 0
            ? Math.ceil((fixedCosts + targetProfit) / contributionMargin)
            : 0;
        return [
          {
            label: "Operating Income",
            result:
              operatingIncome >= 0
                ? "$" + Math.round(operatingIncome).toLocaleString()
                : "($" +
                  Math.abs(Math.round(operatingIncome)).toLocaleString() +
                  ")",
          },
          {
            label: "Profit Target",
            result: "$" + Math.round(targetProfit).toLocaleString(),
          },
          {
            label: "Gap to Target",
            result:
              gap > 0
                ? "($" + Math.round(gap).toLocaleString() + ")"
                : "Target met ✓",
            highlight: true,
          },
          {
            label: "Units Needed for Target",
            formula: "(Fixed Costs + Target Profit) / CM",
            values:
              "$" +
              Math.round(fixedCosts).toLocaleString() +
              " + $" +
              Math.round(targetProfit).toLocaleString() +
              " / $" +
              contributionMargin,
            result: unitsNeeded.toLocaleString() + " units",
            highlight: true,
          },
        ];
      },

      nextStage: null,
    },
  ],

  reviewChapters: [
    { label: "Ch. 3 — CVP Analysis", href: import.meta.env.BASE_URL + "pages/learn/ch03.html" },
    { label: "Ch. 9 — Inventory Costing", href: import.meta.env.BASE_URL + "pages/learn/ch09.html" },
    { label: "Ch. 12 — Relevant Costs", href: import.meta.env.BASE_URL + "pages/learn/ch12.html" },
  ],
};
