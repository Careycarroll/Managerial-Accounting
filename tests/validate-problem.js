// tests/validate-problem.js
// Validates a Practice problem file (js/practice/chXX-problems.js) against
// the Pass 2 spec (js/practice/SPEC.md).
//
// Usage:
//   node --import ./tests/_practice-register.mjs tests/validate-problem.js \
//        js/practice/ch07-problems.js
//
// Exits 0 on full pass, 1 on any failure. Warnings do not fail.
//
// v2 changes:
//  - `unit` requirement is numeric-only. Choice steps don't render an input
//    field, so `unit` is meaningless for them.
//  - Coverage check honors step.intentionalSingleAnswer: true — when set,
//    a single-answer choice step is reported as a passing line, not a warning.
//    Use this for choice steps whose pedagogy is "the right answer is always
//    X; the lesson is recognizing why, not computing which option."

import { pathToFileURL } from 'node:url';
import { resolve, basename } from 'node:path';

// ============================================================================
// Output helpers
// ============================================================================

const RESET   = '\x1b[0m';
const GREEN   = '\x1b[32m';
const RED     = '\x1b[31m';
const YELLOW  = '\x1b[33m';
const CYAN    = '\x1b[36m';
const DIM     = '\x1b[2m';
const BOLD    = '\x1b[1m';

const pass    = (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`);
const fail    = (msg) => console.log(`  ${RED}✗${RESET} ${msg}`);
const warn    = (msg) => console.log(`  ${YELLOW}⚠${RESET} ${msg}`);
const info    = (msg) => console.log(`  ${DIM}${msg}${RESET}`);
const heading = (msg) => console.log(`\n${BOLD}${CYAN}${msg}${RESET}`);

let totalChecks   = 0;
let totalFailures = 0;
let totalWarnings = 0;

function check(condition, okMsg, failMsg) {
  totalChecks++;
  if (condition) { pass(okMsg); return true; }
  totalFailures++;
  fail(failMsg || okMsg);
  return false;
}

function warning(msg) {
  totalWarnings++;
  warn(msg);
}

// ============================================================================
// Validators
// ============================================================================

const VALID_DIFFICULTIES = ['foundation', 'intermediate', 'advanced'];
const VALID_RESULT_TYPES = ['money-small', 'money-medium', 'money-large', 'units', 'percent', 'years'];

function validateSchema(problem) {
  heading('1. Schema validation');

  const required = ['id', 'title', 'chapter', 'difficulty', 'estimatedMinutes', 'reviewChapters', 'randomize', 'given', 'steps'];
  for (const field of required) {
    check(problem[field] !== undefined, `${field} present`, `${field} is missing`);
  }

  check(typeof problem.id === 'string' && problem.id.length > 0, 'id is non-empty string');
  check(typeof problem.title === 'string', 'title is string');
  check(typeof problem.chapter === 'number', 'chapter is number');
  check(VALID_DIFFICULTIES.includes(problem.difficulty),
    `difficulty is valid (${problem.difficulty})`,
    `difficulty "${problem.difficulty}" not in [${VALID_DIFFICULTIES.join(', ')}]`);
  check(typeof problem.estimatedMinutes === 'number' && problem.estimatedMinutes > 0, 'estimatedMinutes is positive number');
  check(Array.isArray(problem.reviewChapters) && problem.reviewChapters.length > 0, 'reviewChapters is non-empty array');
  check(typeof problem.randomize === 'function', 'randomize is function');
  check(typeof problem.given === 'function', 'given is function');
  check(Array.isArray(problem.steps) && problem.steps.length >= 1, 'steps is non-empty array');

  if (problem.scenario !== undefined) {
    check(typeof problem.scenario === 'function', 'scenario (when present) is function');
  } else {
    info('scenario: not present (Pass 1 problem)');
  }
}

function validateSteps(problem) {
  heading('2. Step schema validation');

  const ids = new Set();
  problem.steps.forEach((step, idx) => {
    const label = `step[${idx}] "${step.id || '<no id>'}"`;
    const type = step.type === 'choice' ? 'choice' : 'numeric';

    if (!check(typeof step.id === 'string' && step.id.length > 0, `${label}: id present`)) return;
    if (ids.has(step.id)) {
      totalFailures++;
      fail(`${label}: id "${step.id}" is duplicated within problem`);
    }
    ids.add(step.id);

    check(typeof step.question === 'string' && step.question.length > 0, `${label}: question present`);
    check(typeof step.showWork === 'function', `${label}: showWork is function`);

    if (type === 'numeric') {
      // Numeric steps render an input field; unit labels it.
      check(typeof step.unit === 'string', `${label}: unit present (numeric)`);
      check(typeof step.solve === 'function', `${label}: numeric step has solve()`);
      check(VALID_RESULT_TYPES.includes(step.resultType),
        `${label}: resultType is valid (${step.resultType})`,
        `${label}: resultType "${step.resultType}" not in [${VALID_RESULT_TYPES.join(', ')}]`);
    } else {
      // Choice steps render radio buttons; unit has no meaning.
      check(typeof step.correctId === 'function', `${label}: choice step has correctId()`);
      const opts = step.options;
      check(Array.isArray(opts) || typeof opts === 'function', `${label}: choice step has options (array or function)`);
    }
  });
}

function validateRandomize(problem) {
  heading('3. randomize() stress test (100 runs)');

  let failed = 0;
  let nanFound = false;
  let companyMissingButScenarioUsesIt = 0;

  const scenarioUsesCompany = problem.scenario
    ? /data\.company/.test(problem.scenario.toString())
    : false;

  for (let i = 0; i < 100; i++) {
    let data;
    try {
      data = problem.randomize();
    } catch (e) {
      failed++;
      if (failed === 1) fail(`randomize() threw on iteration ${i}: ${e.message}`);
      continue;
    }
    if (!data || typeof data !== 'object') {
      failed++;
      continue;
    }
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'number' && (!isFinite(v) || isNaN(v))) {
        nanFound = true;
        if (failed === 0) fail(`randomize() produced NaN/Infinity for "${k}" on iteration ${i}`);
        failed++;
        break;
      }
    }
    if (scenarioUsesCompany && !data.company) {
      companyMissingButScenarioUsesIt++;
    }
  }

  check(failed === 0, `100 randomize() calls produced valid data`, `${failed}/100 randomize() calls failed`);
  if (companyMissingButScenarioUsesIt > 0) {
    warning(`scenario() references data.company but ${companyMissingButScenarioUsesIt}/100 randomize() outputs lacked it`);
  }
}

function validateScenario(problem) {
  if (!problem.scenario) return;
  heading('4. scenario(data) renders');
  const data = problem.randomize();
  try {
    const html = problem.scenario(data);
    check(typeof html === 'string' && html.length > 10, 'scenario returns non-empty HTML string');
  } catch (e) {
    fail(`scenario() threw: ${e.message}`);
  }
}

function validateGiven(problem) {
  heading('5. given(data) shape');
  const data = problem.randomize();
  try {
    const rows = problem.given(data);
    if (!check(Array.isArray(rows), 'given() returns array')) return;
    if (!check(rows.length > 0, 'given() returns non-empty array')) return;
    let badRow = -1;
    rows.forEach((row, i) => {
      if (badRow !== -1) return;
      if (!row || typeof row.label !== 'string' || typeof row.value !== 'string') {
        badRow = i;
      }
    });
    check(badRow === -1,
      `${rows.length} given() rows have {label: string, value: string}`,
      `given() row[${badRow}] missing label or value as string`);
  } catch (e) {
    fail(`given() threw: ${e.message}`);
  }
}

function validateDeterminism(problem) {
  heading('6. Solve/correctId determinism');

  // Fix a single data object, run each step's solver 10 times, expect identical results
  const data = problem.randomize();
  const prior = {};

  for (let s = 0; s < problem.steps.length; s++) {
    const step = problem.steps[s];
    const type = step.type === 'choice' ? 'choice' : 'numeric';
    const fn = type === 'numeric' ? step.solve : step.correctId;
    let results = [];
    let threw = false;
    try {
      for (let i = 0; i < 10; i++) {
        results.push(fn(data, prior));
      }
    } catch (e) {
      threw = true;
      fail(`step "${step.id}": ${type === 'numeric' ? 'solve' : 'correctId'}() threw — ${e.message}`);
    }
    if (threw) continue;

    const first = results[0];
    const allSame = results.every(r => r === first);
    check(allSame,
      `step "${step.id}": ${type === 'numeric' ? 'solve' : 'correctId'}() deterministic across 10 calls`,
      `step "${step.id}": ${type === 'numeric' ? 'solve' : 'correctId'}() varied across 10 calls`);

    if (type === 'numeric') {
      check(typeof first === 'number' && isFinite(first),
        `step "${step.id}": solve() returns finite number (${first})`,
        `step "${step.id}": solve() returned ${first}`);
    } else {
      check(typeof first === 'string' && first.length > 0,
        `step "${step.id}": correctId() returns non-empty string ("${first}")`,
        `step "${step.id}": correctId() returned ${first}`);
    }

    // Build prior for next step
    prior[step.id] = first;
  }
}

function validateShowWork(problem) {
  heading('7. Full walkthrough — every step + showWork');

  const data = problem.randomize();
  const prior = {};
  const studentAnswers = {};

  for (const step of problem.steps) {
    const type = step.type === 'choice' ? 'choice' : 'numeric';
    let correctRef;
    try {
      correctRef = type === 'numeric' ? step.solve(data, prior) : step.correctId(data, prior);
    } catch (e) {
      fail(`step "${step.id}": ${type === 'numeric' ? 'solve' : 'correctId'}() threw during walkthrough — ${e.message}`);
      continue;
    }
    prior[step.id]          = correctRef;
    studentAnswers[step.id] = correctRef;

    let workSteps;
    try {
      workSteps = step.showWork(data, prior, studentAnswers, correctRef);
    } catch (e) {
      fail(`step "${step.id}": showWork() threw — ${e.message}`);
      continue;
    }

    if (!check(Array.isArray(workSteps), `step "${step.id}": showWork() returns array (${workSteps?.length ?? '?'} entries)`)) continue;
    const allHaveLabel = workSteps.every(w => w && typeof w.label === 'string');
    check(allHaveLabel,
      `step "${step.id}": all show-work entries have .label`,
      `step "${step.id}": one or more show-work entries missing .label`);
  }
}

function validateChoiceCoverage(problem) {
  const choiceSteps = problem.steps.filter(s => s.type === 'choice');
  if (choiceSteps.length === 0) {
    info('No choice steps — coverage check skipped');
    return;
  }
  heading('8. Choice step distribution (50 runs)');

  // Track correct-id distribution per choice step
  const distrib = {};
  choiceSteps.forEach(s => { distrib[s.id] = {}; });

  for (let i = 0; i < 50; i++) {
    const data = problem.randomize();
    const prior = {};
    for (const step of problem.steps) {
      const type = step.type === 'choice' ? 'choice' : 'numeric';
      let val;
      try {
        val = type === 'numeric' ? step.solve(data, prior) : step.correctId(data, prior);
      } catch { val = undefined; }
      prior[step.id] = val;
      if (type === 'choice') {
        distrib[step.id][val] = (distrib[step.id][val] || 0) + 1;
      }
    }
  }

  for (const step of choiceSteps) {
    const d = distrib[step.id];
    const optionCount = Array.isArray(step.options) ? step.options.length : 'function';
    const summary = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ');
    check(Object.keys(d).length >= 1, `step "${step.id}": ${summary}`);

    const uniqueAnswers = Object.keys(d).length;
    if (uniqueAnswers === 1 && typeof optionCount === 'number' && optionCount > 1) {
      if (step.intentionalSingleAnswer === true) {
        pass(`step "${step.id}": intentional single-answer step (verified by author)`);
      } else {
        warning(`step "${step.id}": only 1 of ${optionCount} options ever correct across 50 runs — may be intentional, verify (set intentionalSingleAnswer: true to suppress)`);
      }
    }
  }
}

function validateReviewChapters(problem) {
  heading('9. reviewChapters paths');

  problem.reviewChapters.forEach((ch, i) => {
    if (!ch) { fail(`reviewChapter[${i}] is null/undefined`); return; }
    check(typeof ch.label === 'string' && ch.label.length > 0, `reviewChapter has label "${ch.label}"`);

    if (typeof ch.href === 'string') {
      // After the loader hook, BASE_URL has been rewritten to '/', so a correct
      // href will look like '/pages/learn/chXX.html'. A leftover bare path will
      // also look the same — so this check is informational at runtime; the
      // anti-pattern is detected by static grep on the source file.
      check(ch.href.startsWith('/'), `reviewChapter href starts with '/' ("${ch.href}")`);
    } else {
      fail(`reviewChapter[${i}] href is not a string`);
    }
  });
}

// ============================================================================
// Driver
// ============================================================================

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node --import ./tests/_practice-register.mjs tests/validate-problem.js js/practice/chXX-problems.js');
    process.exit(2);
  }

  const filePath = resolve(process.cwd(), arg);
  const fileURL  = pathToFileURL(filePath).href;

  console.log(`${BOLD}Validating ${basename(filePath)}${RESET}`);
  console.log(`${DIM}${filePath}${RESET}`);

  let mod;
  try {
    mod = await import(fileURL);
  } catch (e) {
    console.error(`\n${RED}Failed to import file:${RESET} ${e.message}`);
    if (e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
    process.exit(1);
  }

  // Collect exported problem objects. Convention is: every named export that
  // looks like a problem definition object (has id + steps array). We skip
  // helper utilities and aggregate arrays.
  const problems = [];
  for (const [key, val] of Object.entries(mod)) {
    if (val && typeof val === 'object' && !Array.isArray(val)
        && typeof val.id === 'string' && Array.isArray(val.steps)) {
      problems.push({ exportName: key, problem: val });
    }
  }

  if (problems.length === 0) {
    console.error(`\n${RED}No problem definitions found in this file.${RESET}`);
    process.exit(1);
  }

  console.log(`${DIM}Found ${problems.length} problems.${RESET}\n`);

  for (const { exportName, problem } of problems) {
    console.log(`\n${BOLD}━━━ ${problem.title} (${problem.id}) ━━━${RESET}`);
    validateSchema(problem);
    validateSteps(problem);
    validateRandomize(problem);
    validateScenario(problem);
    validateGiven(problem);
    validateDeterminism(problem);
    validateShowWork(problem);
    validateChoiceCoverage(problem);
    validateReviewChapters(problem);
  }

  console.log(`\n${BOLD}━━━ Summary ━━━${RESET}`);
  console.log(`Checks: ${totalChecks}`);
  console.log(`${totalFailures === 0 ? GREEN : RED}Failures: ${totalFailures}${RESET}`);
  if (totalWarnings > 0) console.log(`${YELLOW}Warnings: ${totalWarnings}${RESET}`);

  process.exit(totalFailures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\n${RED}Validator crashed:${RESET}`, e);
  process.exit(2);
});
