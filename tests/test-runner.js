// ── Test Runner ───────────────────────────────────────────────────────────────
// Runs all simulation scenario tests and reports results.
//
// Usage:
//   node tests/test-runner.js js/engine/scenarios/breakeven-sim.js
//
// Exit codes:
//   0 -- all tests passed
//   1 -- one or more errors found

import { validateScenario } from "./validate-scenario.js";
import { walkAllPaths } from "./walk-paths.js";
import { stressTestRandomizer } from "./stress-randomizer.js";
import { checkScoreDistribution } from "./check-scores.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function pass(msg) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}
function fail(msg) {
  console.log(`  ${RED}✗${RESET} ${msg}`);
}
function warn(msg) {
  console.log(`  ${YELLOW}~${RESET} ${msg}`);
}
function info(msg) {
  console.log(`  ${DIM}${msg}${RESET}`);
}
function header(msg) {
  console.log(`\n${BOLD}${CYAN}${msg}${RESET}`);
}
function divider() {
  console.log(`${DIM}${"─".repeat(60)}${RESET}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const scenarioPath = process.argv[2];
  if (!scenarioPath) {
    console.error(
      `${RED}Usage: node tests/test-runner.js <path-to-scenario>${RESET}`,
    );
    process.exit(1);
  }

  console.log(`\n${BOLD}Simulation Scenario Test Runner${RESET}`);
  console.log(`${DIM}Scenario: ${scenarioPath}${RESET}`);
  divider();

  // Dynamic import of scenario
  let scenario;
  try {
    const mod = await import("../" + scenarioPath);
    // Find the exported scenario (first non-default export that has stages)
    scenario = Object.values(mod).find((v) => v && Array.isArray(v.stages));
    if (!scenario) throw new Error("No valid scenario export found");
  } catch (err) {
    console.error(`${RED}Failed to import scenario: ${err.message}${RESET}`);
    process.exit(1);
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalPassed = 0;

  // ── Test 1: Structure Validation ──────────────────────────────────────────
  header("Test 1 — Structure Validation");
  const { errors: structErrors, warnings: structWarnings } =
    validateScenario(scenario);

  if (structErrors.length === 0 && structWarnings.length === 0) {
    pass("All required fields present and valid");
    totalPassed++;
  } else {
    structErrors.forEach((e) => {
      fail(e);
      totalErrors++;
    });
    structWarnings.forEach((w) => {
      warn(w);
      totalWarnings++;
    });
  }

  // ── Test 2: Path Walkthrough ───────────────────────────────────────────────
  header("Test 2 — Simulation Path Walkthrough");
  const pathResults = walkAllPaths(scenario);

  if (pathResults.length === 0) {
    pass("All paths walked successfully — no consequence errors");
    totalPassed++;
  } else {
    pathResults.forEach((r) => {
      fail(r.error);
      if (r.path && r.path.length > 0) {
        info("  Path: " + r.path.slice(-3).join(" → "));
      }
      totalErrors++;
    });
  }

  // ── Test 3: Randomizer Stress Test ────────────────────────────────────────
  header("Test 3 — Randomizer Stress Test (100 runs)");
  const randErrors = stressTestRandomizer(scenario, 100);

  if (randErrors.length === 0) {
    pass("All 100 randomized metric sets are valid");
    totalPassed++;
  } else {
    // Deduplicate similar errors
    const deduped = [
      ...new Set(randErrors.map((e) => e.replace(/Run \d+/, "Run N"))),
    ];
    deduped.forEach((e) => {
      fail(e);
      totalErrors++;
    });
  }

  // ── Test 4: Score Distribution ────────────────────────────────────────────
  header("Test 4 — Score Distribution Check (50 runs)");
  const { scoresSeen, missing, stageResults } = checkScoreDistribution(
    scenario,
    50,
  );

  // Per-stage breakdown
  stageResults.forEach((sr) => {
    const counts = Object.entries(sr.scores)
      .map(([s, c]) => `${s}:${c}`)
      .join("  ");
    const missingScores = Object.entries(sr.scores)
      .filter(([s, c]) => c === 0)
      .map(([s]) => s);

    if (missingScores.length === 0) {
      pass(`${sr.stageId} — all scores reachable  ${DIM}(${counts})${RESET}`);
      totalPassed++;
    } else {
      warn(
        `${sr.stageId} — scores never seen: ${missingScores.join(", ")}  ${DIM}(${counts})${RESET}`,
      );
      totalWarnings++;
    }
  });

  // ── Test 5: Breakdown Label Check ─────────────────────────────────────────
  header("Test 5 — Selection Breakdown Label Check");
  const breakdownErrors = checkBreakdownLabels(scenario);

  if (breakdownErrors.length === 0) {
    pass("All selection breakdown items have valid labels");
    totalPassed++;
  } else {
    breakdownErrors.forEach((e) => {
      fail(e);
      totalErrors++;
    });
  }

  // ── Test 6: nextStage Graph Check ─────────────────────────────────────────
  header("Test 6 — Stage Graph Connectivity");
  const graphErrors = checkStageGraph(scenario);

  if (graphErrors.length === 0) {
    pass("All stage transitions resolve to valid stage ids");
    totalPassed++;
  } else {
    graphErrors.forEach((e) => {
      fail(e);
      totalErrors++;
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  divider();
  console.log(`\n${BOLD}Summary${RESET}`);
  console.log(`  ${GREEN}Passed:${RESET}   ${totalPassed}`);
  console.log(`  ${YELLOW}Warnings:${RESET} ${totalWarnings}`);
  console.log(`  ${RED}Errors:${RESET}   ${totalErrors}`);

  if (totalErrors === 0) {
    console.log(`\n${GREEN}${BOLD}All tests passed.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(
      `\n${RED}${BOLD}${totalErrors} error(s) found. Fix before deploying.${RESET}\n`,
    );
    process.exit(1);
  }
}

// ── Inline tests (no separate file needed) ────────────────────────────────────

function checkBreakdownLabels(scenario) {
  const errors = [];
  const metrics =
    typeof scenario.randomizeMetrics === "function"
      ? scenario.randomizeMetrics()
      : scenario.initialMetrics;
  const state = { metrics };

  scenario.stages.forEach((stage) => {
    if (!stage.generateMultiOptions || !stage.evaluateSelection) return;

    const options = stage.generateMultiOptions(state);

    // Test each individual option selected
    options.forEach((opt, i) => {
      const result = stage.evaluateSelection([opt], state);
      if (result.selectionBreakdown) {
        result.selectionBreakdown.forEach((item, j) => {
          if (item.label === undefined || item.label === null) {
            errors.push(
              `${stage.id}: breakdown item ${j} has undefined label (option ${i}: "${opt.label}")`,
            );
          }
        });
      }
    });

    // Test all selected
    const allResult = stage.evaluateSelection(options, state);
    if (allResult.selectionBreakdown) {
      allResult.selectionBreakdown.forEach((item, j) => {
        if (item.label === undefined || item.label === null) {
          errors.push(
            `${stage.id}: breakdown item ${j} has undefined label (all-selected test)`,
          );
        }
      });
    }
  });

  return errors;
}

function checkStageGraph(scenario) {
  const errors = [];
  const stageIds = new Set(scenario.stages.map((s) => s.id));
  const metrics =
    typeof scenario.randomizeMetrics === "function"
      ? scenario.randomizeMetrics()
      : scenario.initialMetrics;

  scenario.stages.forEach((stage) => {
    if (stage.nextStage === null || stage.nextStage === undefined) return;

    if (typeof stage.nextStage === "string") {
      if (!stageIds.has(stage.nextStage)) {
        errors.push(
          `${stage.id}: nextStage "${stage.nextStage}" does not exist`,
        );
      }
    } else if (typeof stage.nextStage === "function") {
      // Test with a few metric variations
      try {
        const result = stage.nextStage({ metrics });
        if (result && !stageIds.has(result)) {
          errors.push(
            `${stage.id}: nextStage() returned "${result}" which does not exist`,
          );
        }
      } catch (err) {
        errors.push(`${stage.id}: nextStage() threw an error: ${err.message}`);
      }
    }
  });

  return errors;
}

main().catch((err) => {
  console.error(`${RED}Unexpected error: ${err.message}${RESET}`);
  console.error(err.stack);
  process.exit(1);
});
