# Practice Engine — Specification

**Location:** `js/practice/SPEC.md`
**Module:** `js/practice/practice-engine.js`
**Status:** Pass 1 design — locked May 2026

This document is the authoritative contract for the Practice section's engine and problem definition format. Any problem author (human or agent) writing a `.problems.js` file must conform to this spec. Any engine modification must preserve the behaviors documented here.

---

## 1. Architecture Overview

### 1.1 Data flow

    Problem Definition (chXX-problems.js)
              ↓
    PracticeEngine.init(problem, container)
              ↓
    randomize() → data           ← runs once per init/reset
              ↓
    Render problem header + given panel + step list (all steps visible, only Step 1 active)
              ↓
    Student submits Step N answer
              ↓
    engine calls step.solve(data, prior) → correctValue
              ↓
    engine compares student answer vs correctValue using tolerance
              ↓
    correctValue is stored in state.correctValues[stepId] regardless of student answer
              ↓
    next step unlocked; prior[stepId] = correctValue available to its solve()
              ↓
    after final step: render summary

### 1.2 Engine state shape

    {
      problem: <problem definition object>,
      container: <DOM element>,
      data: { ...result of randomize() },
      activeStepIndex: <integer>,
      studentAnswers: { [stepId]: <number> },
      correctValues: { [stepId]: <number> },
      stepResults: { [stepId]: { correct: boolean, deviation: number } },
      solutionViewed: { [stepId]: boolean },
      complete: false
    }

The engine never mutates `problem`. It clones `data` from `randomize()` and treats it as read-only after that.

---

## 2. Problem Definition Schema

A problem is exported from a chapter problems file as a named export. Multiple problems per file is normal.

    export const breakevenBasics = {
      id: 'ch03-breakeven-basics',
      title: 'Breakeven Basics',
      chapter: 3,
      difficulty: 'foundation',          // 'foundation' | 'intermediate' | 'advanced'
      estimatedMinutes: 5,

      reviewChapters: [
        { label: 'Ch. 3 — CVP Analysis', href: 'pages/learn/ch03.html' }
      ],

      randomize: () => { /* see §2.1 */ },
      given:     (data) => [ /* see §2.2 */ ],
      steps:     [ /* see §3 */ ],
    };

### 2.1 `randomize()` — required

Pure function. Returns a plain object of randomized inputs the problem needs. Called once per `init()` and once per `reset()`.

Must use the engine's helpers (§6) so values are deterministic when a seed is provided.

    randomize: () => {
      const price       = randomInRange(40, 80, 1);
      const variableCost = randomInRange(15, Math.floor(price * 0.7), 1);
      const fixedCosts  = roundToNearest(randomInRange(60000, 180000), 5000);
      const expectedUnits = roundToNearest(
        randomInRange(Math.ceil(fixedCosts / (price - variableCost) * 1.3), 20000),
        100
      );
      return { price, variableCost, fixedCosts, expectedUnits };
    }

Constraints the engine assumes (author's responsibility to enforce):

- All numbers produce sensible results when fed through each `solve()` function
- `price > variableCost` for any CVP problem
- Numbers are realistic (no $0.37 prices, no 8,392,471 unit BEPs)
- Calling `randomize()` 100 times produces 100 valid problem instances

### 2.2 `given(data)` — required

Returns an array of `{ label, value }` rows for display in the "Given Information" panel at the top of the problem.

    given: (data) => [
      { label: 'Selling price per unit',  value: `$${data.price}` },
      { label: 'Variable cost per unit',  value: `$${data.variableCost}` },
      { label: 'Fixed costs',             value: `$${data.fixedCosts.toLocaleString()}` },
      { label: 'Expected unit sales',     value: `${data.expectedUnits.toLocaleString()} units` },
    ]

Values must be pre-formatted strings (the engine does not format them). Use the formatter helpers (§6).

### 2.3 `reviewChapters` — required

Array of `{ label, href }` objects. Rendered in the summary screen. `href` must use the `import.meta.env.BASE_URL` pattern — see Anti-Pattern §13.1.

    reviewChapters: [
      { label: 'Ch. 3 — CVP Analysis', href: `${import.meta.env.BASE_URL}pages/learn/ch03.html` }
    ]

In practice, problem files declare a `const BASE = import.meta.env.BASE_URL;` at the top of the file and use `` `${BASE}pages/learn/ch03.html` `` in each problem's `reviewChapters` array.

### 2.4 Optional fields

- `description` (string) — shown on the picker tile under the title
- `chapter` (number) — used by the test suite and the picker page for filtering

---

## 3. Step Definition Schema

A step is an entry in the `steps` array. Steps execute sequentially. The student cannot proceed to step N+1 until step N is submitted.

    {
      id: 'cm-per-unit',
      question: 'What is the contribution margin per unit?',
      resultType: 'money-small',
      tolerance: { value: 1, type: 'absolute' },
      unit: '$ per unit',

      solve:    (data, prior) => /* number */,
      showWork: (data, prior, studentAnswers, correctValue) => [ /* see §3.5 */ ]
    }

### 3.1 `id` — required, string

Unique within the problem. Used as the key in `state.correctValues`, `state.studentAnswers`, etc. Stable across reset(). Kebab-case is conventional (`cm-per-unit`, `bep-units`).

### 3.2 `question` — required, string

The question text rendered to the student. Plain text, no HTML. Keep concise — the given panel above carries the context.

### 3.3 `resultType` — required, enum

Determines the default tolerance tier (see §4). Valid values:

| resultType     | Meaning                                             | Default tolerance                      |
| -------------- | --------------------------------------------------- | -------------------------------------- |
| `money-small`  | $ value under ~$100 (CM per unit, prices)           | ±$1 absolute                           |
| `money-medium` | $100 to $10,000                                     | ±1% relative                           |
| `money-large`  | over $10,000 (revenues, total costs)                | ±0.5% relative                         |
| `units`        | counts                                              | ±1 absolute if under 1,000, else ±0.5% |
| `percent`      | percentage (return whole-number form: 25, not 0.25) | ±0.5 percentage points                 |
| `years`        | time periods                                        | ±0.1 years                             |

### 3.4 `tolerance` — optional, override object

When present, overrides the resultType default.

    tolerance: { value: 2, type: 'absolute' }   // ±2 absolute
    tolerance: { value: 1.5, type: 'percent' }  // ±1.5% relative

Authors should only override when the step's natural tolerance differs from the tier default. For most steps, omit `tolerance` and rely on `resultType`.

### 3.5 `unit` — required, string

Display unit shown next to the input ("$ per unit", "units", "%"). Cosmetic only — does not affect grading.

### 3.6 `solve(data, prior)` — required, function

Returns the correct numeric value for this step. Called once per submission.

- `data` is the result of `randomize()`
- `prior` is `{ [earlierStepId]: correctValue }` — only contains steps that have been completed
- Return type: `number` (the engine handles formatting for display)

  solve: (data, prior) => data.price - data.variableCost

  // later step using prior:
  solve: (data, prior) => Math.ceil(data.fixedCosts / prior['cm-per-unit'])

Must be deterministic — given the same `data` and `prior`, must return the same number. The test suite calls `solve()` 100 times with the same inputs and verifies stability.

### 3.7 `showWork(data, prior, studentAnswers, correctValue)` — required, function

Returns an array of show-work step objects passed to the shared `renderShowWork()` component (see `js/components/show-work.js`).

    showWork: (data, prior, studentAnswers, correctValue) => [
      {
        label:   'Contribution Margin per Unit',
        formula: 'Selling Price - Variable Cost',
        values:  `$${data.price} - $${data.variableCost}`,
        result:  `$${correctValue} per unit`,
        highlight: true
      }
    ]

Each entry is `{ label, formula?, values?, result, highlight? }`. The component renders these as collapsible step cards.

When a `prior` value is used and the student's earlier answer was wrong, the author should reference it with the carry-forward annotation:

    {
      label: 'Breakeven Units',
      formula: 'Fixed Costs / CM per Unit',
      values: `$${data.fixedCosts.toLocaleString()} / $${prior['cm-per-unit']}`,
      result: `${correctValue.toLocaleString()} units`,
      highlight: true,
      annotation: prior['cm-per-unit'] !== studentAnswers['cm-per-unit']
        ? `Using Step 1's correct value: $${prior['cm-per-unit']} (your answer: $${studentAnswers['cm-per-unit']})`
        : null
    }

The engine passes `state.studentAnswers` into `showWork()` as a fifth argument when the author needs to compare. Most steps don't need it — only steps that depend on earlier prior values for which the student may have given a wrong answer.

---

## 4. Tolerance System

### 4.1 Default tiers by `resultType`

See §3.3 table.

### 4.2 Evaluation algorithm

    function evaluateAnswer(studentValue, correctValue, toleranceConfig) {
      const { value, type } = toleranceConfig;
      const deviation = Math.abs(studentValue - correctValue);
      if (type === 'absolute') {
        return { correct: deviation <= value, deviation };
      } else {
        const allowed = Math.abs(correctValue) * (value / 100);
        return { correct: deviation <= allowed, deviation };
      }
    }

### 4.3 Override worked examples

    // Step where student calculates BEP units — engine default for 'units' resultType is ±1
    // but author wants stricter
    { resultType: 'units', tolerance: { value: 0, type: 'absolute' } }

    // Step calculating a small ratio displayed as decimal — needs tighter tolerance
    { resultType: 'percent', tolerance: { value: 0.1, type: 'absolute' } }

    // Step expecting a multi-million-dollar NPV
    { resultType: 'money-large', tolerance: { value: 0.25, type: 'percent' } }

### 4.4 What the engine displays on wrong answers

After a wrong submission, the engine shows: "Your answer: $40 — correct answer: $42 (off by $2)." It does NOT reveal the correct answer until the student clicks "Show Solution" (Decision 2). The numerical correct value is visible in the show-work panel only.

Wait — let me reconsider. There's a tension here. If the engine says "off by $2," that implies the student can infer the correct value. We have two clean options:

**Option A:** Engine says only "Incorrect" on wrong answers and does not reveal deviation. Student must click "Show Solution" to see the correct value via show-work. **Stricter, more exam-like.**

**Option B:** Engine says "Incorrect — your answer: $40" but does not show the correct value or deviation. Student must click "Show Solution" to see correct value. **Slight middle ground.**

**This spec adopts Option A.** Matches the "must submit, no hints, on-demand show-work" pattern locked in Decisions 2 and 4.

---

## 5. Engine API

### 5.1 Class

    import { PracticeEngine } from './practice-engine.js';

    const engine = new PracticeEngine();
    engine.init(problem, containerElement);

### 5.2 Methods

    init(problem, containerEl, options?)
      // options.seed?: number — for deterministic random in tests
      // Loads problem, runs randomize(), renders Step 1 active

    reset()
      // Re-runs randomize(), clears all state, re-renders Step 1 active

### 5.3 Engine does NOT expose

- Internal state mutators
- Direct DOM access methods
- Multi-problem orchestration (the page handles picker → engine.init)

---

## 6. Helper Utilities

Exported from `practice-engine.js`. Problem authors import these for use in `randomize()`.

    import { randomInRange, roundTo, roundToNearest, ensureGreaterThan, randomChoice } from './practice-engine.js';

### 6.1 `randomInRange(min, max, step?)`

Returns an integer between `min` and `max` inclusive, snapped to `step` (default 1).

    randomInRange(40, 80)        → 53
    randomInRange(40, 80, 5)     → 55 or 60 or ... (multiples of 5)

### 6.2 `roundTo(value, decimals)`

Returns `value` rounded to `decimals` decimal places.

    roundTo(3.14159, 2)  → 3.14
    roundTo(1234.567, 0) → 1235

### 6.3 `roundToNearest(value, nearest)`

Returns `value` rounded to the nearest multiple of `nearest`.

    roundToNearest(12345, 100)   → 12300
    roundToNearest(12345, 1000)  → 12000

### 6.4 `ensureGreaterThan(value, floor)`

Returns `value` if greater than `floor`, else returns `floor + 1`. Use to enforce constraints during randomization.

    const variableCost = ensureGreaterThan(randomInRange(10, 30), 5);

### 6.5 `randomChoice(array)`

Returns a random element from the array.

    const productMix = randomChoice([[60, 40], [70, 30], [50, 50]]);

---

## 7. Lifecycle Walkthrough

### 7.1 Page load (handled by chXX.html's JS file)

1. Page renders picker tiles (one per problem in the chapter's problems array)
2. Student clicks a tile
3. Page calls `engine.init(selectedProblem, container)`

### 7.2 `engine.init()` lifecycle

1. Store `problem` and `container` on engine instance
2. Build `state.data` from `problem.randomize()`
3. Build `state.studentAnswers`, `correctValues`, `stepResults`, `solutionViewed` as empty objects
4. Set `state.activeStepIndex = 0`
5. Render: problem header (title + given panel) + step list

### 7.3 Render contract

The container's HTML is set in three phases:

    [HEADER]      Problem title + given panel
    [STEPS]       Every step as a card. Step at activeStepIndex is "active" (input enabled, submit shown). Steps before are "submitted" (answer visible, "Show Solution" button if not yet viewed, show-work expanded if viewed). Steps after are "locked" (input disabled, no submit button).
    [SUMMARY]     Only shown when state.complete === true. Replaces the steps section.

### 7.4 Submission flow

1. Student types in active step's input, clicks Submit
2. Engine reads input value, parses as number
3. Engine calls `step.solve(data, prior)` — `prior` built from `correctValues` only for completed steps
4. Engine evaluates answer against `correctValue` using tolerance
5. Engine stores `studentAnswers[stepId] = value`, `correctValues[stepId] = correctValue`, `stepResults[stepId] = { correct, deviation }`
6. If correct: green check + submit transitions to "Show Solution" button. The next step is unlocked: its input becomes enabled and the engine focuses it.
7. If incorrect: red X + "Incorrect" message + submit transitions to "Show Solution" button. The next step is unlocked the same way — student is not blocked by wrong answers.
8. If this was the final step, after submission render the summary.

### 7.5 Show Solution flow

1. Student clicks "Show Solution" on a submitted step
2. Engine sets `state.solutionViewed[stepId] = true`
3. Engine re-renders that step's card to include the show-work panel (calling `step.showWork(data, prior, studentAnswers, correctValue)` and passing the result to `renderShowWork()`)
4. The button is replaced with "Solution shown" muted text

### 7.6 Summary

Rendered when `state.activeStepIndex === steps.length`:

    [SUMMARY HEADER]      "You answered X of Y correctly"
    [PER-STEP ROWS]       One row per step:
                          ✓ or ✗ icon | step title | student answer / correct answer (if wrong) | "Solution viewed" if applicable
    [REVIEW LINKS]        From problem.reviewChapters
    [ACTION BUTTONS]      "Try Again" (calls engine.reset()) | "Try Different Problem" (page handles; engine listens for click)

The "Try Different Problem" button's click is handled by the engine emitting a `practice:exit` event on the container. The chapter page listens for this event and toggles the picker back into view.

---

## 8. Rendering Contract

The engine writes to `container.innerHTML` directly (no virtual DOM). Inline styles use CSS custom property tokens — never hardcoded hex.

### 8.1 Required CSS classes (defined in `css/practice.css`, written separately)

- `.practice-problem` — outer wrapper
- `.practice-step` — each step card
- `.practice-step--locked` — step input disabled, dim appearance
- `.practice-step--active` — current step, full prominence
- `.practice-step--submitted` — completed step, answer visible
- `.practice-step--correct` — submitted + correct (border-left green)
- `.practice-step--incorrect` — submitted + wrong (border-left red)
- `.practice-summary` — replaces step list on completion
- `.practice-picker` — tile container (on the chapter page, not engine)
- `.practice-picker-tile` — individual tile

### 8.2 Engine-emitted events

The engine dispatches CustomEvents on the container:

    practice:step-submitted   { stepId, correct, deviation }
    practice:complete         { correctCount, totalSteps }
    practice:exit             — "Try Different Problem" was clicked
    practice:reset            — fired after engine.reset() completes

---

## 9. Validation Rules

A problem definition is valid when:

1. `id`, `title`, `chapter`, `difficulty`, `estimatedMinutes`, `reviewChapters`, `randomize`, `given`, `steps` all present
2. `steps.length >= 1`
3. Every step has `id`, `question`, `resultType`, `unit`, `solve`, `showWork`
4. All step IDs are unique within the problem
5. `randomize()` returns an object (not null/undefined)
6. `given(data)` returns an array of `{ label, value }` objects
7. `solve(data, prior)` returns a finite number
8. `showWork(...)` returns an array
9. `reviewChapters` is a non-empty array

The test suite (§12) verifies all of these.

---

## 10. Carry-Forward Behavior

### 10.1 Rule

Every step receives `prior` from the engine, which is built exclusively from `state.correctValues`. The student's actual answer for an earlier step is NEVER passed to a later step's `solve()`.

This means:

- A student who gets Step 1 wrong cannot have their Step 2 wrong-by-cascade
- Step 2's `solve()` always operates on the correct Step 1 value
- Step 2 is graded purely on whether the student correctly applied the Step 2 formula

### 10.2 Annotation pattern

When a later step's show-work uses a `prior` value AND the student got that earlier step wrong, the show-work entry should display an annotation. The author handles this in `showWork()` using the `studentAnswers` argument (fifth parameter passed by the engine — see §3.7).

This is a per-step author responsibility, not an engine-side automatic feature. The engine only provides the data; the author decides which steps need annotations.

---

## 11. Worked Example — Breakeven Basics

Full problem definition, as it should appear in `ch03-problems.js`:

    const BASE = import.meta.env.BASE_URL;

    export const breakevenBasics = {
      id: 'ch03-breakeven-basics',
      title: 'Breakeven Basics',
      description: 'Calculate contribution margin, CM ratio, breakeven units, and breakeven revenue.',
      chapter: 3,
      difficulty: 'foundation',
      estimatedMinutes: 5,

      reviewChapters: [
        { label: 'Ch. 3 — CVP Analysis', href: `${BASE}pages/learn/ch03.html` }
      ],

      randomize: () => {
        const price = randomInRange(40, 80, 1);
        const variableCost = randomInRange(15, Math.floor(price * 0.7), 1);
        const fixedCosts = roundToNearest(randomInRange(60000, 180000), 5000);
        return { price, variableCost, fixedCosts };
      },

      given: (data) => [
        { label: 'Selling price per unit', value: `$${data.price}` },
        { label: 'Variable cost per unit', value: `$${data.variableCost}` },
        { label: 'Total fixed costs',      value: `$${data.fixedCosts.toLocaleString()}` }
      ],

      steps: [
        {
          id: 'cm-per-unit',
          question: 'What is the contribution margin per unit?',
          resultType: 'money-small',
          unit: '$ per unit',
          solve: (data) => data.price - data.variableCost,
          showWork: (data, prior, studentAnswers, correctValue) => [
            {
              label: 'Contribution Margin per Unit',
              formula: 'Selling Price - Variable Cost',
              values: `$${data.price} - $${data.variableCost}`,
              result: `$${correctValue}`,
              highlight: true
            }
          ]
        },
        {
          id: 'cm-ratio',
          question: 'What is the contribution margin ratio?',
          resultType: 'percent',
          unit: '%',
          solve: (data, prior) => roundTo(
            ((data.price - data.variableCost) / data.price) * 100,
            1
          ),
          showWork: (data, prior, studentAnswers, correctValue) => [
            {
              label: 'CM Ratio',
              formula: '(CM per Unit / Selling Price) × 100',
              values: `($${prior['cm-per-unit']} / $${data.price}) × 100`,
              result: `${correctValue}%`,
              highlight: true
            }
          ]
        },
        {
          id: 'bep-units',
          question: 'What is the breakeven point in units?',
          resultType: 'units',
          unit: 'units',
          solve: (data, prior) => Math.ceil(data.fixedCosts / prior['cm-per-unit']),
          showWork: (data, prior, studentAnswers, correctValue) => [
            {
              label: 'Breakeven Units',
              formula: 'Fixed Costs / CM per Unit',
              values: `$${data.fixedCosts.toLocaleString()} / $${prior['cm-per-unit']}`,
              result: `${correctValue.toLocaleString()} units`,
              highlight: true
            }
          ]
        },
        {
          id: 'bep-revenue',
          question: 'What is the breakeven point in revenue dollars?',
          resultType: 'money-large',
          unit: '$',
          solve: (data, prior) => prior['bep-units'] * data.price,
          showWork: (data, prior, studentAnswers, correctValue) => [
            {
              label: 'Breakeven Revenue',
              formula: 'Breakeven Units × Selling Price',
              values: `${prior['bep-units'].toLocaleString()} × $${data.price}`,
              result: `$${correctValue.toLocaleString()}`,
              highlight: true
            }
          ]
        }
      ]
    };

---

## 12. Testing Contract

`tests/validate-problem.js` runs the following checks against every problem definition imported from `js/practice/*-problems.js`:

1. **Schema validation** — every required field present and correct type
2. **Random stress test** — 100 calls to `randomize()`; verify each result is sane (no zeros where positives expected, ratios within reasonable bounds)
3. **Solve determinism** — given fixed `data` and `prior`, `solve()` returns the same number on 10 calls
4. **Tolerance reasonability** — at least one valid student answer near the correct value passes; clearly-wrong answers fail
5. **Show-work shape** — `showWork()` returns an array of `{ label, ... }` objects with required fields per `renderShowWork()` contract
6. **Carry-forward coherence** — Step N's `solve()` works when given the `prior` object containing Step 1..N-1's correctValues

Run with: `node tests/validate-problem.js js/practice/ch03-problems.js`

---

## 13. Anti-Patterns

### 13.1 Hardcoded paths in `reviewChapters`

    // WRONG — 404s on GitHub Pages under /Managerial-Accounting/ subpath
    reviewChapters: [
      { label: 'Ch. 3', href: '/pages/learn/ch03.html' }
    ]

    // CORRECT — use BASE constant from top of file
    const BASE = import.meta.env.BASE_URL;
    reviewChapters: [
      { label: 'Ch. 3', href: `${BASE}pages/learn/ch03.html` }
    ]

### 13.2 Hardcoded hex colors in show-work entries

The `renderShowWork()` component handles styling via CSS classes. Authors should NEVER specify color in `showWork()` return values. Use the `highlight: true` field to mark important rows; the component handles the visual treatment via CSS tokens.

### 13.3 Non-deterministic `solve()`

    // WRONG — uses Math.random inside solve, defeats grading
    solve: (data) => data.price * (Math.random() > 0.5 ? 0.9 : 1.0)

    // CORRECT — all randomness lives in randomize(); solve is pure
    solve: (data) => data.price * 0.9

### 13.4 Mutating `data` or `prior` inside `solve()`

    // WRONG — mutates state passed by engine
    solve: (data, prior) => {
      data.price *= 1.1;     // never mutate
      return data.price;
    }

    // CORRECT — treat data and prior as immutable
    solve: (data, prior) => data.price * 1.1

### 13.5 Cascading wrong answers in `solve()`

The engine guarantees `prior` contains correct values. Authors do not need to defend against student errors here. Step 2's `solve(data, prior)` always sees the right Step 1 value.

### 13.6 Forgetting `tolerance` for non-default cases

If a step's natural tolerance is unusual (e.g., a step that returns 0.5 percentage points must use `{ value: 0.05, type: 'absolute' }` — not the default `±0.5pp`), specify it explicitly. The default tier is a starting point, not a guarantee.

### 13.7 Missing `unit` field

The `unit` field is required even when it seems redundant. The engine renders it next to the input. Leaving it empty makes the input field unlabeled.

---

## 14. Open Items for Future Passes

These are deliberately deferred from Pass 1:

- **Difficulty badges on picker tiles** (Pass 4)
- **Time tracking and per-problem analytics** (deferred indefinitely)
- **Hint system** (excluded per Decision 4)
- **KaTeX in step question text** (add when first problem needs it; show-work panel already supports it)
- **Per-problem completion persistence in localStorage** (not in Pass 1 scope; add when student progress tracking warrants it)

---

**End of specification.** When this contract changes, increment Pass number and date in the header. All existing problem files must continue to validate against future versions of this spec unless a migration is documented.
