// ── check-scores.js ───────────────────────────────────────────────────────────
// Verifies that all four score levels (optimal, acceptable, suboptimal, poor)
// are reachable across randomized scenarios for each stage.
// A score that is never reachable indicates a scoring logic bug.

const ALL_SCORES = ["optimal", "acceptable", "suboptimal", "poor"];

export function checkScoreDistribution(scenario, runs = 50) {
  // Per-stage score counters
  const stageScores = {};
  scenario.stages.forEach((stage) => {
    stageScores[stage.id] = {
      stageId: stage.id,
      stageTitle: stage.title,
      scores: { optimal: 0, acceptable: 0, suboptimal: 0, poor: 0 },
      types: {},
    };
  });

  for (let run = 0; run < runs; run++) {
    let metrics;
    try {
      metrics =
        typeof scenario.randomizeMetrics === "function"
          ? scenario.randomizeMetrics()
          : JSON.parse(JSON.stringify(scenario.initialMetrics || {}));
    } catch {
      continue;
    }

    const state = { metrics };

    scenario.stages.forEach((stage) => {
      const counter = stageScores[stage.id];

      // ── Single choice ──────────────────────────────────────────────────
      if (
        stage.answerTypes &&
        stage.answerTypes.includes("single-choice") &&
        typeof stage.generateOptions === "function"
      ) {
        try {
          const options = stage.generateOptions(state);
          options.forEach((opt) => {
            try {
              const c = opt.consequence(state);
              if (c.score && counter.scores[c.score] !== undefined) {
                counter.scores[c.score]++;
              }
            } catch {}
          });
        } catch {}
      }

      // ── Multiple choice ────────────────────────────────────────────────
      if (
        stage.answerTypes &&
        stage.answerTypes.includes("multiple-choice") &&
        typeof stage.generateMultiOptions === "function" &&
        typeof stage.evaluateSelection === "function"
      ) {
        try {
          const options = stage.generateMultiOptions(state);
          if (options.length > 0) {
            // Test individual selections
            options.forEach((opt) => {
              try {
                const result = stage.evaluateSelection([opt], state);
                if (
                  result.score &&
                  counter.scores[result.score] !== undefined
                ) {
                  counter.scores[result.score]++;
                }
              } catch {}
            });

            // Test all correct
            const correct = options.filter((o) => o.correct);
            if (correct.length > 0) {
              try {
                const result = stage.evaluateSelection(correct, state);
                if (
                  result.score &&
                  counter.scores[result.score] !== undefined
                ) {
                  counter.scores[result.score]++;
                }
              } catch {}
            }

            // Test all incorrect
            const incorrect = options.filter((o) => !o.correct);
            if (incorrect.length > 0) {
              try {
                const result = stage.evaluateSelection(incorrect, state);
                if (
                  result.score &&
                  counter.scores[result.score] !== undefined
                ) {
                  counter.scores[result.score]++;
                }
              } catch {}
            }
          }
        } catch {}
      }

      // ── Numeric ────────────────────────────────────────────────────────
      if (
        stage.answerTypes &&
        stage.answerTypes.includes("numeric") &&
        typeof stage.numericConfig === "function"
      ) {
        try {
          const config = stage.numericConfig(state);
          if (typeof config.evaluate === "function") {
            const vc = metrics.variableCost || 10;
            const testValues = [
              0.01,
              vc * 0.5,
              vc + 1,
              vc * 1.5,
              vc * 2.5,
              vc * 5,
              999999,
            ];
            testValues.forEach((val) => {
              try {
                const result = config.evaluate(val, state);
                if (
                  result.score &&
                  counter.scores[result.score] !== undefined
                ) {
                  counter.scores[result.score]++;
                }
              } catch {}
            });
          }
        } catch {}
      }
    });
  }

  // ── Analyze results ───────────────────────────────────────────────────────
  const stageResults = Object.values(stageScores).map((sr) => {
    const missing = ALL_SCORES.filter((s) => sr.scores[s] === 0);
    const total = Object.values(sr.scores).reduce((a, b) => a + b, 0);

    // Compute distribution percentages
    const distribution = {};
    ALL_SCORES.forEach((s) => {
      distribution[s] =
        total > 0 ? Math.round((sr.scores[s] / total) * 100) : 0;
    });

    // Flag imbalanced distributions
    const warnings = [];
    if (sr.scores.optimal === 0) {
      warnings.push(
        'No "optimal" score ever reached — student cannot achieve best outcome',
      );
    }
    if (sr.scores.poor === 0 && total > 10) {
      warnings.push(
        'No "poor" score ever reached — consider adding a clearly wrong option',
      );
    }
    if (distribution.optimal > 60) {
      warnings.push(
        `"optimal" is ${distribution.optimal}% of scores — may be too easy to guess`,
      );
    }

    return {
      stageId: sr.stageId,
      stageTitle: sr.stageTitle,
      scores: sr.scores,
      distribution,
      missing,
      warnings,
      total,
    };
  });

  // Overall score totals across all stages
  const overall = { optimal: 0, acceptable: 0, suboptimal: 0, poor: 0 };
  stageResults.forEach((sr) => {
    ALL_SCORES.forEach((s) => {
      overall[s] += sr.scores[s];
    });
  });

  const missing = ALL_SCORES.filter((s) => overall[s] === 0);

  return { scoresSeen: overall, missing, stageResults };
}
