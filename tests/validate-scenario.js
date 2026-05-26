// ── validate-scenario.js ──────────────────────────────────────────────────────
// Structural validation for simulation scenario definitions.
// Checks required fields, answer type consistency, and option shapes.

export function validateScenario(scenario) {
  const errors = [];
  const warnings = [];

  // ── Top-level required fields ─────────────────────────────────────────────
  ["id", "title", "stages", "metricDisplay", "reviewChapters"].forEach(
    (field) => {
      if (!scenario[field]) errors.push(`Missing top-level field: "${field}"`);
    },
  );

  if (typeof scenario.randomizeMetrics !== "function") {
    errors.push("randomizeMetrics must be a function");
  }

  if (!Array.isArray(scenario.stages) || scenario.stages.length === 0) {
    errors.push("stages must be a non-empty array");
    return { errors, warnings }; // can't continue without stages
  }

  if (
    !Array.isArray(scenario.metricDisplay) ||
    scenario.metricDisplay.length === 0
  ) {
    warnings.push(
      "metricDisplay is empty — no metrics will be shown during simulation",
    );
  }

  // ── Get a sample metrics object for testing ───────────────────────────────
  let metrics = {};
  try {
    metrics =
      typeof scenario.randomizeMetrics === "function"
        ? scenario.randomizeMetrics()
        : scenario.initialMetrics || {};
  } catch (err) {
    errors.push(`randomizeMetrics() threw: ${err.message}`);
  }

  const state = { metrics };

  // ── Stage validation ──────────────────────────────────────────────────────
  const stageIds = new Set(scenario.stages.map((s) => s.id));

  scenario.stages.forEach((stage, i) => {
    const p = `Stage[${i}] "${stage.id || "?"}"`;

    // Required stage fields
    if (!stage.id) errors.push(`${p}: missing "id"`);
    if (!stage.title) errors.push(`${p}: missing "title"`);

    if (
      !stage.answerTypes ||
      !Array.isArray(stage.answerTypes) ||
      stage.answerTypes.length === 0
    ) {
      errors.push(`${p}: missing or empty "answerTypes" array`);
    } else {
      const validTypes = ["single-choice", "multiple-choice", "numeric"];
      stage.answerTypes.forEach((t) => {
        if (!validTypes.includes(t)) {
          errors.push(`${p}: unknown answerType "${t}"`);
        }
      });
    }

    if (!stage.context) {
      errors.push(`${p}: missing "context"`);
    } else if (typeof stage.context === "function") {
      try {
        const result = stage.context(state);
        if (typeof result !== "string")
          errors.push(`${p}: context() must return a string`);
      } catch (err) {
        errors.push(`${p}: context() threw: ${err.message}`);
      }
    }

    if (!stage.showWork) {
      warnings.push(
        `${p}: no showWork function — students will not see calculation steps`,
      );
    } else if (typeof stage.showWork !== "function") {
      errors.push(`${p}: showWork must be a function`);
    }

    // ── Single choice validation ──────────────────────────────────────────
    if (stage.answerTypes && stage.answerTypes.includes("single-choice")) {
      if (typeof stage.generateOptions !== "function") {
        errors.push(
          `${p}: answerTypes includes "single-choice" but no generateOptions function`,
        );
      } else {
        try {
          const options = stage.generateOptions(state);
          if (!Array.isArray(options) || options.length === 0) {
            errors.push(`${p}: generateOptions() returned empty array`);
          } else {
            if (options.length < 3)
              warnings.push(
                `${p}: only ${options.length} options — consider 5-7`,
              );
            if (options.length > 7)
              warnings.push(`${p}: ${options.length} options — consider max 7`);

            options.forEach((opt, j) => {
              const op = `${p} option[${j}]`;
              if (!opt.label && typeof opt.label !== "function")
                errors.push(`${op}: missing label`);
              if (typeof opt.consequence !== "function")
                errors.push(`${op}: missing consequence function`);
              else {
                try {
                  const c = opt.consequence(state);
                  validateConsequence(c, op, errors, warnings);
                } catch (err) {
                  errors.push(`${op}: consequence() threw: ${err.message}`);
                }
              }
            });

            // Check all four scores are reachable
            const scores = new Set();
            options.forEach((opt) => {
              try {
                const c = opt.consequence(state);
                if (c.score) scores.add(c.score);
              } catch {}
            });
            if (!scores.has("optimal"))
              warnings.push(
                `${p}: no "optimal" option found in generateOptions`,
              );
            if (!scores.has("poor") && options.length >= 5)
              warnings.push(
                `${p}: no "poor" option found — consider adding one for 5+ options`,
              );
          }
        } catch (err) {
          errors.push(`${p}: generateOptions() threw: ${err.message}`);
        }
      }
    }

    // ── Multiple choice validation ────────────────────────────────────────
    if (stage.answerTypes && stage.answerTypes.includes("multiple-choice")) {
      if (typeof stage.generateMultiOptions !== "function") {
        errors.push(
          `${p}: answerTypes includes "multiple-choice" but no generateMultiOptions function`,
        );
      } else {
        try {
          const options = stage.generateMultiOptions(state);
          if (!Array.isArray(options) || options.length === 0) {
            errors.push(`${p}: generateMultiOptions() returned empty array`);
          } else {
            options.forEach((opt, j) => {
              const op = `${p} multiOption[${j}]`;
              if (!opt.id) errors.push(`${op}: missing id`);
              if (!opt.label) errors.push(`${op}: missing label`);
              if (opt.correct === undefined)
                errors.push(`${op}: missing correct field`);
            });

            const hasCorrect = options.some((o) => o.correct === true);
            if (!hasCorrect)
              warnings.push(
                `${p}: no correct multi-options — all selections will score poorly`,
              );
          }
        } catch (err) {
          errors.push(`${p}: generateMultiOptions() threw: ${err.message}`);
        }
      }

      if (typeof stage.evaluateSelection !== "function") {
        errors.push(
          `${p}: answerTypes includes "multiple-choice" but no evaluateSelection function`,
        );
      } else {
        try {
          const options = stage.generateMultiOptions
            ? stage.generateMultiOptions(state)
            : [];
          if (options.length > 0) {
            // Test with first option only
            const result = stage.evaluateSelection([options[0]], state);
            validateConsequence(
              result,
              `${p} evaluateSelection`,
              errors,
              warnings,
            );

            // Test breakdown labels
            if (result.selectionBreakdown) {
              result.selectionBreakdown.forEach((item, j) => {
                if (item.label === undefined || item.label === null) {
                  errors.push(
                    `${p}: selectionBreakdown[${j}] has undefined label`,
                  );
                }
              });
            } else {
              warnings.push(
                `${p}: evaluateSelection returns no selectionBreakdown`,
              );
            }
          }
        } catch (err) {
          errors.push(`${p}: evaluateSelection() threw: ${err.message}`);
        }
      }
    }

    // ── Numeric validation ────────────────────────────────────────────────
    if (stage.answerTypes && stage.answerTypes.includes("numeric")) {
      if (typeof stage.numericConfig !== "function") {
        errors.push(
          `${p}: answerTypes includes "numeric" but no numericConfig function`,
        );
      } else {
        try {
          const config = stage.numericConfig(state);
          if (!config.label) errors.push(`${p}: numericConfig missing "label"`);
          if (!config.evaluate)
            errors.push(`${p}: numericConfig missing "evaluate" function`);
          else {
            // Test a range of values
            const testValues = [0.01, 1, 10, 100, 1000, 999999];
            testValues.forEach((val) => {
              try {
                const result = config.evaluate(val, state);
                validateConsequence(
                  result,
                  `${p} numericConfig.evaluate(${val})`,
                  errors,
                  warnings,
                );
              } catch (err) {
                errors.push(
                  `${p}: numericConfig.evaluate(${val}) threw: ${err.message}`,
                );
              }
            });
          }
        } catch (err) {
          errors.push(`${p}: numericConfig() threw: ${err.message}`);
        }
      }
    }

    // ── nextStage validation ──────────────────────────────────────────────
    if (stage.nextStage === undefined) {
      warnings.push(
        `${p}: nextStage is undefined — engine will advance linearly`,
      );
    } else if (stage.nextStage !== null) {
      if (typeof stage.nextStage === "string") {
        if (!stageIds.has(stage.nextStage)) {
          errors.push(
            `${p}: nextStage "${stage.nextStage}" does not match any stage id`,
          );
        }
      } else if (typeof stage.nextStage === "function") {
        try {
          const result = stage.nextStage(state);
          if (result && !stageIds.has(result)) {
            errors.push(
              `${p}: nextStage() returned "${result}" which does not match any stage id`,
            );
          }
        } catch (err) {
          errors.push(`${p}: nextStage() threw: ${err.message}`);
        }
      } else {
        errors.push(`${p}: nextStage must be null, a string, or a function`);
      }
    }
  });

  return { errors, warnings };
}

// ── Consequence shape validator ───────────────────────────────────────────────

function validateConsequence(c, prefix, errors, warnings) {
  if (!c || typeof c !== "object") {
    errors.push(`${prefix}: consequence must return an object`);
    return;
  }
  const validScores = ["optimal", "acceptable", "suboptimal", "poor"];
  if (!c.score) {
    errors.push(`${prefix}: consequence missing "score"`);
  } else if (!validScores.includes(c.score)) {
    errors.push(
      `${prefix}: invalid score "${c.score}" — must be one of ${validScores.join(", ")}`,
    );
  }
  if (!c.narrative) {
    errors.push(`${prefix}: consequence missing "narrative"`);
  }
  if (c.metricUpdates === undefined) {
    warnings.push(
      `${prefix}: consequence has no metricUpdates — metrics will not change`,
    );
  }
}
