// ── stress-randomizer.js ──────────────────────────────────────────────────────
// Runs randomizeMetrics() N times and validates each result.
// Catches edge cases where randomization produces unplayable scenarios.

export function stressTestRandomizer(scenario, runs = 100) {
  const errors = [];

  if (typeof scenario.randomizeMetrics !== "function") {
    return ["randomizeMetrics is not a function — cannot stress test"];
  }

  // Collect all metric keys from first run to know what to expect
  let expectedKeys;
  try {
    expectedKeys = Object.keys(scenario.randomizeMetrics());
  } catch (err) {
    return [`randomizeMetrics() threw on first run: ${err.message}`];
  }

  for (let i = 0; i < runs; i++) {
    let metrics;
    try {
      metrics = scenario.randomizeMetrics();
    } catch (err) {
      errors.push(`Run ${i}: randomizeMetrics() threw: ${err.message}`);
      continue;
    }

    if (!metrics || typeof metrics !== "object") {
      errors.push(`Run ${i}: randomizeMetrics() returned non-object`);
      continue;
    }

    // Check all expected keys are present
    expectedKeys.forEach((key) => {
      if (metrics[key] === undefined) {
        errors.push(`Run ${i}: missing key "${key}"`);
      }
    });

    // Numeric sanity checks
    const numericChecks = [
      { key: "variableCost", min: 1, max: 10000, label: "Variable cost" },
      { key: "fixedCosts", min: 1000, max: 10000000, label: "Fixed costs" },
      { key: "targetProfit", min: 0, max: 10000000, label: "Target profit" },
      { key: "marketDemand", min: 100, max: 1000000, label: "Market demand" },
    ];

    numericChecks.forEach(({ key, min, max, label }) => {
      if (metrics[key] === undefined) return; // already caught above
      if (typeof metrics[key] !== "number") {
        errors.push(
          `Run ${i}: ${label} (${key}) is not a number (got ${typeof metrics[key]})`,
        );
        return;
      }
      if (isNaN(metrics[key])) {
        errors.push(`Run ${i}: ${label} (${key}) is NaN`);
        return;
      }
      if (!isFinite(metrics[key])) {
        errors.push(`Run ${i}: ${label} (${key}) is Infinity`);
        return;
      }
      if (metrics[key] < min) {
        errors.push(
          `Run ${i}: ${label} (${key}) = ${metrics[key]} is below minimum ${min}`,
        );
      }
      if (metrics[key] > max) {
        errors.push(
          `Run ${i}: ${label} (${key}) = ${metrics[key]} exceeds maximum ${max}`,
        );
      }
    });

    // Business logic sanity checks
    if (metrics.variableCost !== undefined && metrics.priceLow !== undefined) {
      if (metrics.variableCost >= metrics.priceLow) {
        errors.push(
          `Run ${i}: variableCost (${metrics.variableCost}) >= priceLow (${metrics.priceLow}) — no viable price exists`,
        );
      }
    }

    if (metrics.variableCost !== undefined && metrics.priceMid !== undefined) {
      if (metrics.variableCost >= metrics.priceMid) {
        errors.push(
          `Run ${i}: variableCost (${metrics.variableCost}) >= priceMid (${metrics.priceMid}) — mid price has no margin`,
        );
      }
    }

    if (
      metrics.fixedCosts !== undefined &&
      metrics.targetProfit !== undefined &&
      metrics.marketDemand !== undefined
    ) {
      // Check that target profit is theoretically achievable at some price
      // At optimal price (70% of market demand), can we hit target?
      if (metrics.variableCost !== undefined) {
        const maxCM = metrics.variableCost * 3; // generous upper bound
        const minVolume = metrics.marketDemand * 0.5; // 50% of market is realistic
        const maxPossibleOI = minVolume * maxCM - metrics.fixedCosts;
        if (maxPossibleOI < metrics.targetProfit * 0.1) {
          errors.push(
            `Run ${i}: targetProfit (${metrics.targetProfit}) may be unachievable given fixedCosts and marketDemand`,
          );
        }
      }
    }

    // Check price options if scenario generates them
    if (typeof scenario.stages[0].generateOptions === "function") {
      try {
        const state = { metrics };
        const options = scenario.stages[0].generateOptions(state);

        if (!Array.isArray(options) || options.length === 0) {
          errors.push(`Run ${i}: generateOptions() returned empty array`);
          continue;
        }

        // At least one option must be viable (positive CM)
        const viableOptions = options.filter((opt) => {
          try {
            const c = opt.consequence(state);
            return c.score !== "poor";
          } catch {
            return false;
          }
        });

        if (viableOptions.length === 0) {
          errors.push(
            `Run ${i}: all options scored "poor" — no viable path through Stage 1`,
          );
        }

        // At least one option must be optimal
        const optimalOptions = options.filter((opt) => {
          try {
            const c = opt.consequence(state);
            return c.score === "optimal";
          } catch {
            return false;
          }
        });

        if (optimalOptions.length === 0) {
          errors.push(
            `Run ${i}: no "optimal" option in Stage 1 — student cannot achieve best score`,
          );
        }

        if (optimalOptions.length > 2) {
          errors.push(
            `Run ${i}: ${optimalOptions.length} "optimal" options in Stage 1 — too many correct answers`,
          );
        }
      } catch (err) {
        errors.push(`Run ${i}: generateOptions() threw: ${err.message}`);
      }
    }
  }

  // Deduplicate similar errors (replace run number with N)
  const deduped = [
    ...new Set(errors.map((e) => e.replace(/Run \d+/g, "Run N"))),
  ];
  return deduped;
}
