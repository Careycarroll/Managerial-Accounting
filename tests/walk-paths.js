// ── walk-paths.js ─────────────────────────────────────────────────────────────
// Walks every possible decision path through a scenario definition.
// Calls consequence functions directly without a browser or DOM.
// Reports any path that produces an invalid consequence shape,
// undefined labels, or throws an error.

const VALID_SCORES = new Set(["optimal", "acceptable", "suboptimal", "poor"]);
const MAX_DEPTH = 20; // prevent infinite loops

export function walkAllPaths(scenario) {
  const results = [];

  let metrics;
  try {
    metrics =
      typeof scenario.randomizeMetrics === "function"
        ? scenario.randomizeMetrics()
        : JSON.parse(JSON.stringify(scenario.initialMetrics || {}));
  } catch (err) {
    return [{ error: `randomizeMetrics() threw: ${err.message}`, path: [] }];
  }

  const firstStage = scenario.stages[0];
  if (!firstStage) return [{ error: "No stages defined", path: [] }];

  walkStage(scenario, firstStage.id, metrics, [], results, 0);
  return results;
}

// ── Recursive stage walker ────────────────────────────────────────────────────

function walkStage(scenario, stageId, metrics, path, results, depth) {
  if (depth > MAX_DEPTH) {
    results.push({
      error: `Max depth (${MAX_DEPTH}) exceeded — possible cycle`,
      path,
    });
    return;
  }

  const stage = scenario.stages.find((s) => s.id === stageId);
  if (!stage) {
    results.push({ error: `Stage "${stageId}" not found`, path });
    return;
  }

  const state = { metrics: { ...metrics } };

  // ── Single choice paths ───────────────────────────────────────────────────
  if (stage.answerTypes && stage.answerTypes.includes("single-choice")) {
    if (typeof stage.generateOptions === "function") {
      let options;
      try {
        options = stage.generateOptions(state);
      } catch (err) {
        results.push({
          error: `${stageId}: generateOptions() threw: ${err.message}`,
          path,
        });
        options = [];
      }

      options.forEach((opt, i) => {
        const optLabel = resolveLabel(opt.label, state);
        const optPath = [...path, `${stageId}[single:${i}:"${optLabel}"]`];

        // Validate label
        if (optLabel === undefined || optLabel === null) {
          results.push({
            error: `${stageId}: option[${i}] has undefined label`,
            path: optPath,
          });
        }

        // Call consequence
        let consequence;
        try {
          consequence = opt.consequence(state);
        } catch (err) {
          results.push({
            error: `${stageId}: option[${i}] consequence() threw: ${err.message}`,
            path: optPath,
          });
          return;
        }

        // Validate consequence
        const cErrors = validateConsequence(
          consequence,
          `${stageId} option[${i}]`,
        );
        cErrors.forEach((e) => results.push({ error: e, path: optPath }));

        // Walk next stage with updated metrics
        const nextMetrics = {
          ...metrics,
          ...(consequence.metricUpdates || {}),
        };
        const nextId = resolveNextStage(stage, { metrics: nextMetrics });
        if (nextId) {
          walkStage(scenario, nextId, nextMetrics, optPath, results, depth + 1);
        }
      });
    }
  }

  // ── Multiple choice paths ─────────────────────────────────────────────────
  if (stage.answerTypes && stage.answerTypes.includes("multiple-choice")) {
    if (
      typeof stage.generateMultiOptions === "function" &&
      typeof stage.evaluateSelection === "function"
    ) {
      let options;
      try {
        options = stage.generateMultiOptions(state);
      } catch (err) {
        results.push({
          error: `${stageId}: generateMultiOptions() threw: ${err.message}`,
          path,
        });
        options = [];
      }

      // Validate option labels
      options.forEach((opt, i) => {
        if (!opt.label) {
          results.push({
            error: `${stageId}: multiOption[${i}] missing label`,
            path,
          });
        }
        if (!opt.id) {
          results.push({
            error: `${stageId}: multiOption[${i}] missing id`,
            path,
          });
        }
      });

      // Test combinations: each individual option, all correct, all incorrect, all selected
      const testSets = buildTestSets(options);

      testSets.forEach((selected, setIdx) => {
        const setLabel = selected.map((o) => o.id || o.label).join("+");
        const optPath = [...path, `${stageId}[multi:${setLabel}]`];

        let result;
        try {
          result = stage.evaluateSelection(selected, state);
        } catch (err) {
          results.push({
            error: `${stageId}: evaluateSelection() threw: ${err.message}`,
            path: optPath,
          });
          return;
        }

        // Validate consequence shape
        const cErrors = validateConsequence(
          result,
          `${stageId} evaluateSelection`,
        );
        cErrors.forEach((e) => results.push({ error: e, path: optPath }));

        // Validate breakdown labels
        if (result.selectionBreakdown) {
          result.selectionBreakdown.forEach((item, j) => {
            if (item.label === undefined || item.label === null) {
              results.push({
                error: `${stageId}: selectionBreakdown[${j}] has undefined label (set: ${setLabel})`,
                path: optPath,
              });
            }
          });
        }

        // Walk next stage
        const nextMetrics = { ...metrics, ...(result.metricUpdates || {}) };
        const nextId = resolveNextStage(stage, { metrics: nextMetrics });
        if (nextId) {
          walkStage(scenario, nextId, nextMetrics, optPath, results, depth + 1);
        }
      });
    }
  }

  // ── Numeric paths ─────────────────────────────────────────────────────────
  if (stage.answerTypes && stage.answerTypes.includes("numeric")) {
    if (typeof stage.numericConfig === "function") {
      let config;
      try {
        config = stage.numericConfig(state);
      } catch (err) {
        results.push({
          error: `${stageId}: numericConfig() threw: ${err.message}`,
          path,
        });
        return;
      }

      if (typeof config.evaluate !== "function") {
        results.push({
          error: `${stageId}: numericConfig.evaluate is not a function`,
          path,
        });
        return;
      }

      // Test a spread of values: absurd low, near VC, optimal range, absurd high
      const vc = metrics.variableCost || 0;
      const testValues = [
        0.01,
        vc > 0 ? vc * 0.5 : 1,
        vc > 0 ? vc + 1 : 10,
        vc > 0 ? vc * 2 : 50,
        vc > 0 ? vc * 4 : 200,
        999999,
      ];

      testValues.forEach((val) => {
        const optPath = [...path, `${stageId}[numeric:${val}]`];
        let result;
        try {
          result = config.evaluate(val, state);
        } catch (err) {
          results.push({
            error: `${stageId}: numericConfig.evaluate(${val}) threw: ${err.message}`,
            path: optPath,
          });
          return;
        }

        const cErrors = validateConsequence(
          result,
          `${stageId} numeric(${val})`,
        );
        cErrors.forEach((e) => results.push({ error: e, path: optPath }));

        // Walk next stage with first test value only (avoid path explosion)
        if (val === testValues[2]) {
          const nextMetrics = { ...metrics, ...(result.metricUpdates || {}) };
          const nextId = resolveNextStage(stage, { metrics: nextMetrics });
          if (nextId) {
            walkStage(
              scenario,
              nextId,
              nextMetrics,
              optPath,
              results,
              depth + 1,
            );
          }
        }
      });
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveLabel(label, state) {
  if (typeof label === "function") {
    try {
      return label(state);
    } catch {
      return undefined;
    }
  }
  return label;
}

function resolveNextStage(stage, state) {
  if (stage.nextStage === null || stage.nextStage === undefined) return null;
  if (typeof stage.nextStage === "string") return stage.nextStage;
  if (typeof stage.nextStage === "function") {
    try {
      return stage.nextStage(state);
    } catch {
      return null;
    }
  }
  return null;
}

function validateConsequence(c, prefix) {
  const errors = [];
  if (!c || typeof c !== "object") {
    errors.push(
      `${prefix}: consequence must return an object (got ${typeof c})`,
    );
    return errors;
  }
  if (!c.score) errors.push(`${prefix}: missing "score"`);
  else if (!VALID_SCORES.has(c.score))
    errors.push(`${prefix}: invalid score "${c.score}"`);
  if (!c.narrative) errors.push(`${prefix}: missing "narrative"`);
  return errors;
}

function buildTestSets(options) {
  const sets = [];

  // Each option individually
  options.forEach((opt) => sets.push([opt]));

  // All correct options together
  const correct = options.filter((o) => o.correct === true);
  if (correct.length > 1) sets.push(correct);

  // Pairs of correct options (triggers correctCount === 2)
  if (correct.length >= 2) {
    for (let i = 0; i < correct.length - 1; i++) {
      sets.push([correct[i], correct[i + 1]]);
    }
  }

  // All incorrect options together
  const incorrect = options.filter((o) => o.correct === false);
  if (incorrect.length > 1) sets.push(incorrect);

  // All options selected
  if (options.length > 1) sets.push(options);

  // One correct + one incorrect
  if (correct.length > 0 && incorrect.length > 0) {
    sets.push([correct[0], incorrect[0]]);
  }

  // Two correct + one incorrect
  if (correct.length >= 2 && incorrect.length > 0) {
    sets.push([correct[0], correct[1], incorrect[0]]);
  }

  return sets;
}
