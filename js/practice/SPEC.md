# Practice Engine — Specification

**Location:** `js/practice/SPEC.md`
**Module:** `js/practice/practice-engine.js`
**Status:** Pass 2 — locked May 2026

This document is the authoritative contract for the Practice section's engine and problem definition format. Any problem author (human or agent) writing a `.problems.js` file must conform to this spec. Any engine modification must preserve the behaviors documented here.

**Pass 2 changes from Pass 1:**

- Added optional `scenario(data)` field for narrative wrappers (§2.5)
- Added `choice` step type alongside `numeric` (§3.8–§3.13)
- Documented scenario pool helpers `randomCompany()` / `randomProduct()` (§6.6)
- Corrected §4.4 (Option A is now stated cleanly, no meta-commentary)
- Corrected §7.6 (summary requires "See Summary" click, not auto-trigger)
- Corrected §8.2 (event list now matches engine reality)
- New worked example in §11 demonstrating scenario + choice
- Pass 1 problem files validate against Pass 2 unchanged

---

## 1. Architecture Overview

### 1.1 Data flow

    Problem Definition (chXX-problems.js)
              ↓
    PracticeEngine.init(problem, container)
              ↓
    randomize() → data           ← runs once per init/reset
              ↓
    Render problem header + scenario (if present) + given panel + step list
              ↓
    Student submits Step N answer (numeric or choice)
              ↓
    engine calls step.solve(data, prior)   — numeric
       OR    step.correctId(data, prior)   — choice
              ↓
    engine compares student answer vs correct value
       (tolerance for numeric, exact ID match for choice)
              ↓
    correct value stored in state.correctValues[stepId] regardless of student answer
              ↓
    next step unlocked; prior[stepId] = correct value available to its solve/correctId
              ↓
    after final step submission: "See Summary" button appears
              ↓
    student clicks → render summary

### 1.2 Engine state shape

    {
      problem: <problem definition object>,
      container: <DOM element>,
      data: { ...result of randomize() },
      activeStepIndex: <integer>,
      studentAnswers: { [stepId]: <number | string> },  // string for choice steps (the option id)
      correctValues:  { [stepId]: <number | string> },  // string for choice steps
      stepResults:    { [stepId]: { correct: boolean, deviation?: number } },
      solutionViewed: { [stepId]: boolean },
      finalSubmitted: false,
      complete: false
    }

The engine never mutates `problem`. It treats `data` from `randomize()` as read-only after that.

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
        { label: 'Ch. 3 — CVP Analysis', href: `${BASE}pages/learn/ch03.html` }
      ],

      randomize: () => { /* see §2.1 */ },
      scenario:  (data) => `...`,        // OPTIONAL — Pass 2 addition, see §2.5
      given:     (data) => [ /* see §2.2 */ ],
      steps:     [ /* see §3 */ ],
    };

### 2.1 `randomize()` — required

Pure function. Returns a plain object of randomized inputs the problem needs. Called once per `init()` and once per `reset()`.

Must use the engine's helpers (§6) so values are deterministic when a seed is provided.

    randomize: () => {
      const company = randomCompany({ category: 'manufacturing' });
      const product = randomProduct({ category: 'manufacturing' });
      const price       = randomInRange(40, 80, 1);
      const variableCost = randomInRange(15, Math.floor(price * 0.7), 1);
      const fixedCosts  = roundToNearest(randomInRange(60000, 180000), 5000);
      return { company, product, price, variableCost, fixedCosts };
    }

Constraints the engine assumes (author's responsibility to enforce):

- All numbers produce sensible results when fed through each `solve()` function
- `price > variableCost` for any CVP problem
- Numbers are realistic (no $0.37 prices, no 8,392,471 unit BEPs)
- Calling `randomize()` 100 times produces 100 valid problem instances

### 2.2 `given(data)` — required

Returns an array of `{ label, value }` rows for display in the "Given Information" panel.

    given: (data) => [
      { label: 'Selling price per unit',  value: `$${data.price}` },
      { label: 'Variable cost per unit',  value: `$${data.variableCost}` },
      { label: 'Fixed costs',             value: `$${data.fixedCosts.toLocaleString()}` },
    ]

Values must be pre-formatted strings. The engine does not format them.

### 2.3 `reviewChapters` — required

Array of `{ label, href }` objects. Rendered in the summary screen. `href` must use the `import.meta.env.BASE_URL` pattern — see Anti-Pattern §13.1.

    reviewChapters: [
      { label: 'Ch. 3 — CVP Analysis', href: `${BASE}pages/learn/ch03.html` }
    ]

In practice, problem files declare a `const BASE = import.meta.env.BASE_URL;` at the top of the file.

### 2.4 Optional metadata fields

- `description` (string) — shown on the picker tile under the title
- `chapter` (number) — used by the test suite and picker page for filtering

### 2.5 `scenario(data)` — optional (Pass 2)

Function returning an HTML string. When present, the engine renders it as a narrative card above the `given` panel. Used to wrap calculations in business context — the exam-style framing that teaches extraction-from-prose alongside the math.

    scenario: (data) => `
      <p>${data.company.name} produces a single ${data.product.singular}
      that sells for $${data.price}. The company has been approached by a
      new customer requesting a special order of ${data.specialUnits.toLocaleString()}
      units at $${data.specialPrice} per unit. ${data.company.base}'s current
      capacity is sufficient to fulfill the order without affecting existing sales.</p>
    `

Rules:

- Returns a string of HTML (paragraphs, optional `<strong>`/`<em>`). No JS execution embedded.
- The engine wraps the returned string in a styled card with class `practice-scenario`.
- All randomized values used in the prose must also appear in `given()` so students who skim still have a reference table.
- Use `data.company.name` for the full rendered name ("Bayport Manufacturing, LLC") and `data.company.base` for possessives in show-work ("Bayport's CM").
- Never call `randomCompany()` or `randomProduct()` inside `scenario()` — call them in `randomize()` and store the result on `data`. The scenario must read the same name every render.

When `scenario` is omitted (Pass 1 problems), the engine renders only the given panel. No visual difference from Pass 1 behavior.

---

## 3. Step Definition Schema

A step is an entry in the `steps` array. Steps execute sequentially. The student cannot proceed to step N+1 until step N is submitted.

Pass 2 introduces a `type` discriminator. Two types are supported:

- `'numeric'` (default) — student enters a number, graded by tolerance
- `'choice'` — student picks an option, graded by exact ID match

If `type` is omitted, the engine treats the step as `'numeric'`. **This guarantees Pass 1 problems validate unchanged.**

### 3.1 `id` — required, string

Unique within the problem. Used as the key in `state.correctValues`, `state.studentAnswers`, etc. Stable across reset(). Kebab-case is conventional.

### 3.2 `question` — required, string

The question text rendered to the student. Plain text, no HTML. Keep concise — the scenario and given panel above carry the context.

### 3.3 `type` — optional, enum

`'numeric'` | `'choice'`. Defaults to `'numeric'`.

---

## 3.A — Numeric Step Fields (type: 'numeric')

### 3.4 `resultType` — required for numeric, enum

Determines the default tolerance tier (see §4). Valid values:

| resultType     | Meaning                                             | Default tolerance                      |
| -------------- | --------------------------------------------------- | -------------------------------------- |
| `money-small`  | $ value under ~$100 (CM per unit, prices)           | ±$1 absolute                           |
| `money-medium` | $100 to $10,000                                     | ±1% relative                           |
| `money-large`  | over $10,000 (revenues, total costs)                | ±0.5% relative                         |
| `units`        | counts                                              | ±1 absolute if under 1,000, else ±0.5% |
| `percent`      | percentage (return whole-number form: 25, not 0.25) | ±0.5 percentage points                 |
| `years`        | time periods                                        | ±0.1 years                             |

### 3.5 `tolerance` — optional, override object

When present, overrides the resultType default.

    tolerance: { value: 2, type: 'absolute' }   // ±2 absolute
    tolerance: { value: 1.5, type: 'percent' }  // ±1.5% relative

### 3.6 `unit` — required for numeric, string

Display unit shown next to the input ("$ per unit", "units", "%"). Cosmetic only — does not affect grading.

### 3.7 `solve(data, prior)` — required for numeric, function

Returns the correct numeric value for this step.

- `data` is the result of `randomize()`
- `prior` is `{ [earlierStepId]: correctValue }` — only contains completed steps
- Return type: `number`

  solve: (data, prior) => data.price - data.variableCost

  // later step using prior:
  solve: (data, prior) => Math.ceil(data.fixedCosts / prior['cm-per-unit'])

Must be deterministic — given the same `data` and `prior`, must return the same number.

### 3.7.1 `showWork(data, prior, studentAnswers, correctValue)` — required for numeric

Returns an array of show-work step objects passed to the shared `renderShowWork()` component.

    showWork: (data, prior, studentAnswers, correctValue) => [
      {
        label:   'Contribution Margin per Unit',
        formula: 'Selling Price - Variable Cost',
        values:  `$${data.price} - $${data.variableCost}`,
        result:  `$${correctValue} per unit`,
        highlight: true,
        annotation: prior['some-earlier-step'] !== studentAnswers['some-earlier-step']
          ? `Using Step N's correct value...`
          : null
      }
    ]

---

## 3.B — Choice Step Fields (type: 'choice')

A choice step presents 2–5 radio-button options. The correct option is computed from `data` and `prior` at submission time, so the right answer rotates with the randomized numbers — it is not a static "answer C" trivia question.

**When to use choice steps:**

- Interpretation pairing — "should the company accept the special order?" after computing CM
- Direction calls — "is the variance favorable or unfavorable?" after computing variance
- Decision recommendations — "given constrained capacity, what should the firm do?"

**When NOT to use choice steps:**

- Conceptual recognition that doesn't change round-to-round — "which cost system is this?" The answer never changes, students memorize it, pedagogy collapses. Use Apply scenarios for that pattern.
- Anything that could just as easily be numeric — choice should test judgment, not arithmetic.

### 3.8 `type` — required, must be `'choice'`

### 3.9 `question` — same as §3.2

### 3.10 `options` — required, array

Static list of 2–5 option objects. Order is preserved in rendering.

    options: [
      { id: 'accept', label: 'Accept the special order' },
      { id: 'reject', label: 'Reject the special order' },
    ]

Each option:

- `id` — string, unique within the step's options. Used for grading and stored in `correctValues`/`studentAnswers`. Kebab-case conventional.
- `label` — string, displayed to the student.
- `sublabel` — optional string, smaller secondary text under the label.

Options are static in Pass 2. Dynamic option generation (e.g., bell-curve numeric options like the simulation engine) is deferred to a later pass.

### 3.11 `correctId(data, prior)` — required, function

Returns the `id` of the correct option as a string. Called at submission time.

    correctId: (data, prior) => {
      const cm = prior['cm-special'];
      return cm > 0 ? 'accept' : 'reject';
    }

Must be deterministic. Must return a string matching one of the `options[].id` values — the test suite verifies this.

### 3.12 `showWork(data, prior, studentAnswers, correctId)` — required for choice

Same signature shape as the numeric showWork, but the fourth argument is the correct option's `id` (string) instead of a numeric value.

    showWork: (data, prior, studentAnswers, correctId) => [
      {
        label: 'Decision Rule',
        formula: 'With unused capacity, accept any order with positive CM',
        values: `CM = $${prior['cm-special'].toLocaleString()} (positive)`,
        result: correctId === 'accept'
          ? 'Accept the order'
          : 'Reject the order',
        highlight: true,
      }
    ]

The author can read `studentAnswers[step.id]` to compare the student's choice against `correctId` and add annotations.

### 3.13 No `unit`, `resultType`, `tolerance`, or `solve` on choice steps

These fields are numeric-only. The validator will warn if they appear on a choice step.

---

## 4. Tolerance System (numeric only)

### 4.1 Default tiers by `resultType`

See §3.4 table.

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

### 4.3 Override examples

    { resultType: 'units', tolerance: { value: 0, type: 'absolute' } }     // exact match required
    { resultType: 'percent', tolerance: { value: 0.1, type: 'absolute' } } // ±0.1pp
    { resultType: 'money-large', tolerance: { value: 0.25, type: 'percent' } } // tighter than tier default

### 4.4 Wrong-answer display rule (Option A — locked)

On a wrong submission, the engine displays only "Incorrect" with the student's submitted value echoed back. The engine does **not** display:

- The correct value
- The deviation amount
- Any hint about direction (high/low)

The student must click "Show Solution" to see the correct value via the show-work panel. This matches exam conditions and the "must submit, no hints" pattern.

For choice steps, the same rule applies: a wrong choice shows "Incorrect" with the student's selected option echoed. The correct option is revealed only via Show Solution.

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

Exported from `practice-engine.js` (numeric helpers) and `scenario-pools.js` (narrative helpers).

### 6.1 `randomInRange(min, max, step?)`

Returns an integer between `min` and `max` inclusive, snapped to `step` (default 1).

### 6.2 `roundTo(value, decimals)`

Returns `value` rounded to `decimals` decimal places.

### 6.3 `roundToNearest(value, nearest)`

Returns `value` rounded to the nearest multiple of `nearest`.

### 6.4 `ensureGreaterThan(value, floor, minDelta?)`

Returns `value` if greater than `floor + minDelta`, else returns `floor + minDelta`. Use to enforce constraints during randomization.

### 6.5 `randomChoice(array)`

Returns a random element from the array.

### 6.6 Scenario pool helpers (Pass 2)

Imported from `./scenario-pools.js`:

    import { randomCompany, randomProduct } from './scenario-pools.js';

**`randomCompany(opts?)`** — returns a company record.

    randomCompany({ category: 'manufacturing' })
    // → {
    //     name:     'Bayport Manufacturing, LLC',  // full display string
    //     base:     'Bayport',                     // for possessives
    //     industry: 'Manufacturing',
    //     suffix:   'LLC',
    //     category: 'manufacturing',
    //   }

Options:

- `category` — one of `'manufacturing'`, `'process'`, `'service'`, `'retail'`, `'distribution'`, `'technology'`, `'healthcare'`, `'hospitality'`, `'construction'`, `'any'`. Default `'any'`.
- `includeSuffix` — boolean, default `true`. When `false`, no legal-form suffix is appended.

**`randomProduct(opts?)`** — returns a product record.

    randomProduct({ category: 'manufacturing' })
    // → { singular: 'precision component', plural: 'precision components', category: 'manufacturing' }

Options:

- `category` — same enum as above. Default `'manufacturing'`.

### 6.7 Pool helper usage rules

- **Call only inside `randomize()`.** Never inside `scenario()`, `given()`, `solve()`, `correctId()`, or `showWork()`. Those functions must read from `data` so the name stays stable across renders.
- **Store the entire returned object on `data`.** Reading `data.company.name` vs. `data.company.base` is how prose vs. show-work consistency is maintained.
- **All randomness routes through `Math.random()`** so the engine's seed override makes pool picks deterministic for tests.

### 6.8 Pool size reference

| Pool                             | Entries      | Combined with industries × suffixes |
| -------------------------------- | ------------ | ----------------------------------- |
| `names.json`                     | 325          | —                                   |
| `industries.json`                | 50           | —                                   |
| `suffixes.json`                  | 10 (3 empty) | —                                   |
| `products.json`                  | 46           | —                                   |
| Manufacturing-category companies | —            | ~26,000                             |
| Any-category companies           | —            | 162,500                             |

The `combinationCount(category)` diagnostic in `scenario-pools.js` exposes these for the test suite.

---

## 7. Lifecycle Walkthrough

### 7.1 Page load (handled by chXX.html's JS file)

1. Page renders picker tiles (one per problem in the chapter's problems array)
2. Student clicks a tile
3. Page calls `engine.init(selectedProblem, container)`

### 7.2 `engine.init()` lifecycle

1. Store `problem` and `container` on engine instance
2. Build `state.data` from `problem.randomize()`
3. Build empty `studentAnswers`, `correctValues`, `stepResults`, `solutionViewed`
4. Set `state.activeStepIndex = 0`, `finalSubmitted = false`, `complete = false`
5. Render: problem header + scenario (if present) + given panel + step list

### 7.3 Render contract

The container's HTML is set in phases:

    [HEADER]      Title + back-to-picker button + estimated time/step count
    [SCENARIO]    Optional — rendered only if problem.scenario is defined
    [GIVEN]       Given panel
    [STEPS]       Every step as a card:
                    - active step: input/options enabled, submit button shown
                    - submitted steps: answer visible, Show Solution button if not yet viewed
                    - locked steps: input disabled, dimmed
    [SEE SUMMARY] Button appearing after final step is submitted
    [SUMMARY]     Replaces step list when state.complete === true

### 7.4 Submission flow

**Numeric step:**

1. Student types value, clicks Submit
2. Engine parses input as float
3. Engine calls `step.solve(data, prior)` → `correctValue`
4. Engine evaluates against tolerance
5. Stores `studentAnswers[stepId] = value`, `correctValues[stepId] = correctValue`, `stepResults[stepId] = { correct, deviation }`

**Choice step:**

1. Student selects radio, clicks Submit
2. Engine reads selected option's `id`
3. Engine calls `step.correctId(data, prior)` → `correctId` (string)
4. Engine evaluates: `correct = (selectedId === correctId)`
5. Stores `studentAnswers[stepId] = selectedId`, `correctValues[stepId] = correctId`, `stepResults[stepId] = { correct }`

**Both step types, after grading:**

6. If this was NOT the final step: advance `activeStepIndex`, focus the next step's input.
7. If this WAS the final step: set `finalSubmitted = true`, render "See Summary" button below the step list. Do not auto-advance to summary.

### 7.5 Show Solution flow

1. Student clicks "Show Solution" on any submitted step (past or current)
2. Engine sets `state.solutionViewed[stepId] = true`
3. Engine re-renders that step's card with show-work panel expanded
4. Button replaced with "Solution shown" muted text

Show-work persists across re-renders. Once revealed, it stays revealed until `reset()`.

### 7.6 Summary trigger

The summary is rendered only when `state.complete === true`. The state transitions to `complete = true` only when the student clicks the "See Summary" button that appears after the final step is submitted.

The engine does NOT auto-advance to the summary when `activeStepIndex === steps.length`. The student must opt in. This gives them time to inspect the final step's show-work before moving on.

### 7.7 Summary content

When rendered:

    [HEADER]      "X of Y correct" + "Problem Complete"
    [STEPS LIST]  One row per step:
                  ✓/✗ icon | step question | student answer | correct answer if wrong | "Solution viewed" flag if applicable
    [ACTIONS]     "Try Again" (calls engine.reset()) | "Try Different Problem" (dispatches practice:back-to-picker)
    [REVIEW]      Links from problem.reviewChapters
    [SOLUTIONS]   Collapsible <details> per step — clicking expands the full show-work for that step

The summary's solutions section uses the same `step.showWork(...)` function that the in-flow Show Solution button uses. No duplicated rendering logic.

---

## 8. Rendering Contract

The engine writes to `container.innerHTML` directly (no virtual DOM). Inline styles use CSS custom property tokens — never hardcoded hex.

### 8.1 CSS classes (defined in `css/practice.css`)

- `.practice-scenario` — narrative card above the given panel (Pass 2 addition)
- `.practice-problem-container` — outer wrapper
- `.practice-step-card` — each step card
- `.practice-step-card--locked` — step disabled, dim appearance
- `.practice-step-card--active` — current step
- `.practice-step-card--submitted-correct` — submitted + correct (border green)
- `.practice-step-card--submitted-incorrect` — submitted + wrong (border red)
- `.practice-choice-options` — radio button group container (Pass 2 addition)
- `.practice-summary` — replaces step list on completion
- `.practice-picker` — tile container (on the chapter page, not engine)
- `.practice-picker-tile` — individual tile

### 8.2 Engine-emitted events

The engine dispatches CustomEvents on the container:

    practice:back-to-picker  — student clicked "Back to problems" or "Try Different Problem"

That is the only event currently emitted. The following events were specified in Pass 1 but not implemented; they remain deferred:

    practice:step-submitted  — { stepId, correct, deviation }    [deferred]
    practice:complete        — { correctCount, totalSteps }      [deferred]
    practice:reset           — fired after engine.reset() completes [deferred]

These will be added when the first consumer (page-level analytics, progress tracking) requires them. Until then, the engine emits only `practice:back-to-picker` and the chapter page wires that single handler.

---

## 9. Validation Rules

A problem definition is valid when:

1. `id`, `title`, `chapter`, `difficulty`, `estimatedMinutes`, `reviewChapters`, `randomize`, `given`, `steps` all present
2. `steps.length >= 1`
3. Every step has `id`, `question`
4. Numeric steps (`type` omitted or `'numeric'`): `resultType`, `unit`, `solve`, `showWork` present
5. Choice steps (`type === 'choice'`): `options`, `correctId`, `showWork` present; `options.length >= 2`; every option has unique `id` and `label`
6. All step IDs are unique within the problem
7. `randomize()` returns an object (not null/undefined)
8. `given(data)` returns an array of `{ label, value }` objects
9. Numeric `solve(data, prior)` returns a finite number
10. Choice `correctId(data, prior)` returns a string matching one of the step's `options[].id`
11. `showWork(...)` returns an array (for both step types)
12. `reviewChapters` is a non-empty array
13. If `scenario` is present, it must be a function that returns a string

The test suite (§12) verifies all of these.

---

## 10. Carry-Forward Behavior

### 10.1 Rule

Every step receives `prior` from the engine, built exclusively from `state.correctValues`. The student's actual answer is NEVER passed to a later step's `solve()` or `correctId()`.

This applies to both step types:

- **Numeric:** Step N's `solve()` always operates on the correct prior numeric values.
- **Choice:** Step N's `correctId()` always operates on the correct prior values (numeric or choice IDs from earlier steps).

A student who chose "reject" wrongly in step 3 will still have Step 4 evaluated against the _correct_ prior step 3 choice. Step 4 is graded purely on whether the student applied step 4's logic correctly.

### 10.2 Annotation pattern

When a later step's `showWork` references a prior value AND the student got that earlier step wrong, the show-work entry should display an annotation acknowledging the divergence. The author handles this via the `studentAnswers` argument:

    // Numeric step referencing a prior numeric value
    annotation: prior['cm-per-unit'] !== studentAnswers['cm-per-unit']
      ? `Using Step 1's correct value: $${prior['cm-per-unit']} (your answer: $${studentAnswers['cm-per-unit']})`
      : null

    // Choice step referencing a prior choice
    annotation: prior['capacity-decision'] !== studentAnswers['capacity-decision']
      ? `Using the correct prior decision (${prior['capacity-decision']})`
      : null

This is a per-step author responsibility, not engine-side automation. The engine provides the data; the author decides which steps need annotations.

---

## 11. Worked Example — Generic Special Order

Full Pass 2 problem definition demonstrating scenario + choice steps. This is the template for case-flavored Practice problems.

    import {
      randomInRange, roundToNearest, ensureGreaterThan,
    } from './practice-engine.js';
    import { randomCompany, randomProduct } from './scenario-pools.js';

    const BASE = import.meta.env.BASE_URL;

    export const specialOrderUnconstrained = {
      id: 'ch12-special-order-unconstrained',
      title: 'Special Order — Unconstrained Capacity',
      description: 'Decide whether to accept a special order when capacity is available.',
      chapter: 12,
      difficulty: 'foundation',
      estimatedMinutes: 7,

      reviewChapters: [
        { label: 'Ch. 12 — Relevant Information', href: `${BASE}pages/learn/ch12.html` }
      ],

      randomize: () => {
        const company = randomCompany({ category: 'manufacturing' });
        const product = randomProduct({ category: 'manufacturing' });
        const regularPrice  = randomInRange(80, 140, 5);
        const variableCost  = randomInRange(30, Math.floor(regularPrice * 0.55), 1);
        const specialPrice  = randomInRange(
          Math.floor(variableCost * 1.15),                  // floor: must beat VC
          Math.floor(regularPrice * 0.85),                  // ceiling: below regular
          1
        );
        const specialUnits  = roundToNearest(randomInRange(500, 2000), 100);
        const fixedCosts    = roundToNearest(randomInRange(40000, 90000), 5000);
        return {
          company, product,
          regularPrice, variableCost, specialPrice, specialUnits, fixedCosts,
        };
      },

      scenario: (data) => `
        <p>${data.company.name} produces a single ${data.product.singular}
        that sells to its regular customers for $${data.regularPrice}. Variable
        production cost is $${data.variableCost} per unit and fixed costs total
        $${data.fixedCosts.toLocaleString()} per month.</p>
        <p>A new customer has approached ${data.company.base} requesting a special
        order of ${data.specialUnits.toLocaleString()} ${data.product.plural}
        at $${data.specialPrice} each. ${data.company.base} currently has
        unused production capacity and the special order will not affect sales
        to regular customers.</p>
      `,

      given: (data) => [
        { label: 'Regular selling price',  value: `$${data.regularPrice}` },
        { label: 'Variable cost per unit', value: `$${data.variableCost}` },
        { label: 'Fixed costs (monthly)',  value: `$${data.fixedCosts.toLocaleString()}` },
        { label: 'Special order price',    value: `$${data.specialPrice}` },
        { label: 'Special order quantity', value: `${data.specialUnits.toLocaleString()} units` },
      ],

      steps: [
        {
          id: 'cm-special-per-unit',
          question: 'What is the contribution margin per unit on the special order?',
          resultType: 'money-small',
          unit: '$ per unit',
          solve: (data) => data.specialPrice - data.variableCost,
          showWork: (data, prior, _, correctValue) => [
            {
              label: 'CM per Unit (Special Order)',
              formula: 'Special Price − Variable Cost',
              values: `$${data.specialPrice} − $${data.variableCost}`,
              result: `$${correctValue} per unit`,
              highlight: true,
            }
          ],
        },
        {
          id: 'cm-special-total',
          question: 'What is the total contribution margin from the special order?',
          resultType: 'money-large',
          unit: '$',
          solve: (data, prior) => prior['cm-special-per-unit'] * data.specialUnits,
          showWork: (data, prior, _, correctValue) => [
            {
              label: 'Total CM',
              formula: 'CM per Unit × Special Units',
              values: `$${prior['cm-special-per-unit']} × ${data.specialUnits.toLocaleString()}`,
              result: `$${correctValue.toLocaleString()}`,
              highlight: true,
            }
          ],
        },
        {
          id: 'accept-decision',
          type: 'choice',
          question: 'Given unused capacity and no impact on regular sales, should ' +
                    'the company accept the special order?',
          options: [
            { id: 'accept', label: 'Accept the special order' },
            { id: 'reject', label: 'Reject the special order' },
          ],
          correctId: (data, prior) => prior['cm-special-total'] > 0 ? 'accept' : 'reject',
          showWork: (data, prior, studentAnswers, correctId) => [
            {
              label: 'Decision Rule',
              formula: 'With unused capacity, accept any order with positive CM',
              values: `Total CM = $${prior['cm-special-total'].toLocaleString()}`,
              result: correctId === 'accept'
                ? `Accept — order adds $${prior['cm-special-total'].toLocaleString()} to operating income`
                : 'Reject — order does not contribute positive CM',
              highlight: true,
              annotation: studentAnswers['accept-decision'] !== correctId
                ? `Your selection (${studentAnswers['accept-decision']}) does not match the decision rule.`
                : null,
            }
          ],
        },
      ],
    };

This problem demonstrates:

- Narrative scenario consuming randomized company + product + numbers
- Two numeric steps that carry forward correctly
- A choice step whose correct answer is computed from the prior numeric CM
- Annotation on the choice step for wrong-answer feedback

---

## 12. Testing Contract

`tests/validate-problem.js` runs the following checks against every problem definition imported from `js/practice/*-problems.js`:

1. **Schema validation** — every required field present and correct type, including the new Pass 2 fields (`type`, `options`, `correctId` for choice steps; `scenario` if present)
2. **Random stress test** — 100 calls to `randomize()`; verify sane results, no zeros where positives expected, ratios within reasonable bounds. For problems using `randomCompany`/`randomProduct`, verify the returned `data.company` and `data.product` shapes.
3. **Solve / correctId determinism** — given fixed `data` and `prior`, `solve()` and `correctId()` return the same value on 10 calls
4. **Tolerance reasonability** (numeric) — a student answer near the correct value passes; clearly-wrong answers fail
5. **Choice correctness** — `correctId()` returns a string matching one of the step's `options[].id` across 100 random data instances
6. **Show-work shape** — `showWork()` returns an array of objects with required fields, for both step types
7. **Carry-forward coherence** — Step N's `solve`/`correctId` works when given the `prior` object containing earlier correctValues
8. **Scenario validity** — if `scenario` present, returns a non-empty string when called with random data
9. **Pool size guard** — `scenario-pools.js`' `combinationCount()` returns expected minimums (names ≥ 300, industries ≥ 25, suffixes ≥ 8, products ≥ 30)

Run with: `node tests/validate-problem.js js/practice/ch12-problems.js`

---

## 13. Anti-Patterns

### 13.1 Hardcoded paths in `reviewChapters`

    // WRONG — 404s on GitHub Pages under /Managerial-Accounting/ subpath
    reviewChapters: [{ label: 'Ch. 3', href: '/pages/learn/ch03.html' }]

    // CORRECT
    const BASE = import.meta.env.BASE_URL;
    reviewChapters: [{ label: 'Ch. 3', href: `${BASE}pages/learn/ch03.html` }]

### 13.2 Hardcoded hex colors in show-work entries

`renderShowWork()` handles styling via CSS classes. Authors should NEVER specify color in `showWork()` return values. Use `highlight: true` to mark important rows; the component handles the visual treatment via CSS tokens.

### 13.3 Non-deterministic `solve()` or `correctId()`

    // WRONG — uses Math.random inside solve/correctId, defeats grading
    solve: (data) => data.price * (Math.random() > 0.5 ? 0.9 : 1.0)
    correctId: (data) => Math.random() > 0.5 ? 'accept' : 'reject'

    // CORRECT — all randomness lives in randomize(); solve/correctId are pure
    solve: (data) => data.price * 0.9
    correctId: (data, prior) => prior['cm'] > 0 ? 'accept' : 'reject'

### 13.4 Mutating `data` or `prior`

    // WRONG
    solve: (data, prior) => {
      data.price *= 1.1;     // never mutate
      return data.price;
    }

    // CORRECT — treat data and prior as immutable
    solve: (data, prior) => data.price * 1.1

### 13.5 Cascading wrong answers

The engine guarantees `prior` contains correct values. Authors do not need to defend against student errors here. Step 2's `solve(data, prior)` always sees the right Step 1 value.

### 13.6 Forgetting `tolerance` for non-default cases

If a step's natural tolerance is unusual, specify it explicitly. The default tier is a starting point, not a guarantee.

### 13.7 Missing `unit` field on numeric steps

The `unit` field is required for numeric steps even when seemingly redundant. The engine renders it next to the input.

### 13.8 Calling pool helpers outside `randomize()` (Pass 2)

    // WRONG — name changes every render
    scenario: (data) => `${randomCompany().name} produces...`

    // CORRECT — name fixed at randomize time, read from data
    randomize: () => ({ company: randomCompany({ category: 'manufacturing' }), ... }),
    scenario: (data) => `${data.company.name} produces...`

### 13.9 Static-trivia choice steps (Pass 2)

    // WRONG — "correct answer" is the same every round, students memorize
    {
      type: 'choice',
      question: 'What allocation method does this system use?',
      options: [
        { id: 'dl-dollars', label: 'Direct labor dollars' },
        { id: 'machine-hours', label: 'Machine hours' },
      ],
      correctId: () => 'dl-dollars',  // never changes!
    }

    // CORRECT — the right choice follows from the randomized data
    {
      type: 'choice',
      question: 'Given the contribution margin you calculated, should the order be accepted?',
      options: [
        { id: 'accept', label: 'Accept' },
        { id: 'reject', label: 'Reject' },
      ],
      correctId: (data, prior) => prior['cm'] > 0 ? 'accept' : 'reject',
    }

Static recognition questions belong in Apply scenarios, not Practice. Practice choice steps must test judgment that depends on randomized numbers.

### 13.10 Choice options that aren't mutually exclusive (Pass 2)

Options must be discrete, mutually exclusive answers. "Accept" / "Reject" is fine. "Accept" / "Accept if X" / "Accept if Y" creates partial-credit ambiguity that the engine cannot grade. Restructure as multiple choice steps if multiple aspects of the decision need to be tested.

---

## 14. Open Items for Future Passes

Deliberately deferred:

- **Same-data multi-system comparison** (VMD-style one-pool/two-pool/three-pool) — architectural change to support parallel sub-problems sharing one `randomize()`. Pass 3 candidate.
- **Dynamic option generation for choice steps** — bell-curve numeric options like the simulation engine. Useful for "estimate the variance" questions. Pass 3.
- **Difficulty badges on picker tiles** — Pass 4.
- **Time tracking and per-problem analytics** — deferred indefinitely.
- **Hint system** — excluded per Pass 1 Decision 4.
- **KaTeX in step question text** — add when first problem needs it; show-work panel already supports it.
- **Per-problem completion persistence in localStorage** — add when student progress tracking warrants it.
- **Event emissions** (`practice:step-submitted`, `practice:complete`, `practice:reset`) — add when first consumer needs them. See §8.2.

---

**End of specification.** When this contract changes, increment Pass number and date in the header. All existing problem files must continue to validate against future versions of this spec unless a migration is documented.
