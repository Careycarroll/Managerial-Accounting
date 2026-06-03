# Managerial Accounting Interactive

An interactive learning tool for Horngren's Cost Accounting (17th Edition). Built with Vite, vanilla JavaScript, and CSS custom properties. No frameworks. Deployed as a Progressive Web App on GitHub Pages.

Live: https://careycarroll.github.io/Managerial-Accounting/ (auto-deployed via GitHub Actions on every push to `main`)

Source: Horngren, Datar & Rajan -- Cost Accounting: A Managerial Emphasis, 17th Edition

---

## Goal

Build a comprehensive interactive learning companion that covers every concept in the textbook -- chapter by chapter -- with four layers of engagement:

1. Learn -- Chapter-by-chapter interactive tools, show-work panels, and practice problems tied directly to the textbook
2. Practice -- Randomized multi-step calculation problems organized by chapter and cross-chapter topic
3. Apply -- Real-world business decision scenarios that pull from multiple chapters
4. Depth Levels -- Every Apply scenario has three modes: Concept (quick), Analysis (full), Simulation (sequential decisions)

---

## Running Locally

    git clone https://github.com/careycarroll/Managerial-Accounting.git
    cd Managerial-Accounting
    npm install
    npm run dev

To preview a production-mode build locally (catches base-path issues before deploy):

    npm run build
    npm run preview

To validate Practice problem definitions before commit:

    npm run validate -- js/practice/ch03-problems.js   # single file
    npm run validate:all                                 # all chapters

---

## Deployment

Deployment is fully automated via GitHub Actions. Every push to `main` triggers a build and deploy to GitHub Pages -- typical end-to-end time is 60-120 seconds.

Workflow file: `.github/workflows/deploy.yml`

The pipeline runs two jobs:

1. **build** -- checks out the repo, installs dependencies with `npm ci`, runs `vite build`, copies `dist/index.html` to `dist/404.html` as a fallback, uploads the `dist/` directory as a Pages artifact
2. **deploy** -- publishes the artifact to the `github-pages` environment

Monitor deploys at: https://github.com/Careycarroll/Managerial-Accounting/actions

GitHub Pages source is set to **"GitHub Actions"** (not "Deploy from a branch"). Do not change this -- the workflow expects to be the deployment source.

### What this means in practice

- No `npm run deploy` step is needed. The old `gh-pages` package approach is deprecated for this project.
- Local previews use `npm run dev` (Vite dev server) or `npm run preview` (built dist served locally).
- After a successful push, hard-refresh the live site (Cmd+Shift+R) or use an incognito window -- the PWA service worker caches aggressively and may serve a stale version otherwise.

---

## Base URL Pattern (Critical for Future Development)

The deployed site lives under the subpath `/Managerial-Accounting/`. Vite handles asset rewriting automatically for `<link>` and `<script>` tags, but internal navigation links require explicit base-path handling.

### Rule 1 -- HTML files use `%BASE_URL%`

Vite expands `%BASE_URL%` to `/` in dev and `/Managerial-Accounting/` in production at build time.

    <!-- correct -->
    <a href="%BASE_URL%pages/learn/ch01.html">Ch. 1</a>

    <!-- wrong -- 404s in production -->
    <a href="/pages/learn/ch01.html">Ch. 1</a>

### Rule 2 -- JS-rendered links use `import.meta.env.BASE_URL`

For JS that emits HTML (template literals, innerHTML assignments, generated nav components), read the base URL at runtime.

    const BASE = import.meta.env.BASE_URL;
    container.innerHTML = `<a href="${BASE}pages/learn/ch01.html">Ch. 1</a>`;

For inline string concatenation where a top-level constant is awkward:

    const html = '<a href="' + import.meta.env.BASE_URL + 'pages/apply/">All Scenarios</a>';

### Exception

`<link rel="stylesheet" href="/css/...">` and `<script src="/js/...">` in HTML do NOT need `%BASE_URL%`. Vite already rewrites these as assets during build. Only `<a href>` navigation links need explicit base handling.

### When you add new pages or links

1. New HTML files: use `%BASE_URL%pages/...` for any `<a href>` to other internal pages
2. New JS components rendering links: declare `const BASE = import.meta.env.BASE_URL;` at the top of the file
3. Always run `npm run build` and inspect `dist/` output before pushing -- look for any remaining bare `/pages/...` paths

---

## Learn Section -- Chapter Status

| #   | Chapter                                               | Status   | Tools                                                                                                                                                                    |
| --- | ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | The Manager and Management Accounting                 | Complete | Accounting comparison, value chain builder, five-step process, IMA ethics                                                                                                |
| 2   | An Introduction to Cost Terms and Purposes            | Complete | Cost classifier, relevant range visualizer, manufacturing cost flow, unit cost trap                                                                                      |
| 3   | Cost-Volume-Profit Analysis                           | Complete | CVP dashboard, CVP graph (canvas, interactive), sensitivity analysis, sales mix CVP                                                                                      |
| 4   | Job Costing                                           | Complete | Job cost record builder, normal vs actual costing, overhead disposal, job vs process classifier                                                                          |
| 5   | Activity-Based Costing and ABM                        | Complete | Simple vs ABC comparator, cost hierarchy classifier, ABC system builder (8 pools), ABM decisions                                                                         |
| 6   | Master Budget and Responsibility Accounting           | Complete | Operating budget builder (9-step), sensitivity analysis, responsibility center classifier, cash budget, Kaizen simulator                                                 |
| 7   | Flexible Budgets and Direct-Cost Variances            | Complete | Static vs flexible budget analyzer, direct-cost variance calculator (Level 3 columnar), variance hierarchy diagram                                                       |
| 8   | Flexible Budgets and Overhead Variances               | Complete | Overhead rate developer (4-step), 4-variance overhead analyzer (Panels A+B), complete variance hierarchy (Exhibit 8-5)                                                   |
| 9   | Inventory Costing and Capacity Analysis               | Complete | Absorption vs variable costing comparator, capacity concepts calculator, denominator-level analysis, income effects                                                      |
| 10  | Determining How Costs Behave                          | Complete | Cost estimation suite, scatter plot visualizer, regression/high-low comparison, learning curve calculator                                                                |
| 11  | Data Analytic Thinking and Prediction                 | Complete | Data analytics workflow, decision tree/Gini tools, prediction model evaluation, ROC curve visualizer                                                                     |
| 12  | Decision Making and Relevant Information              | Complete | Relevant cost identifier, special order analyzer, make-or-buy calculator, product mix/bottleneck manager, add/drop and equipment replacement                             |
| 13  | Strategy, Balanced Scorecard, Strategic Profitability | Complete | Strategy identifier, balanced scorecard builder, strategic profitability analyzer, engineered vs discretionary cost classifier                                           |
| 14  | Pricing Decisions and Cost Management                 | Complete | Pricing context identifier, cost-plus pricing calculator, target costing/value engineering, life-cycle profitability planner                                             |
| 15  | Cost Allocation and Customer Profitability            | Complete | Customer cost hierarchy classifier, customer profitability analyzer, whale curve builder, sales variance calculator                                                      |
| 16  | Allocation of Support-Department Costs                | Complete | Support department allocation engine (direct/step-down/reciprocal), common cost allocator, revenue allocation with Shapley value, bundled product profitability analyzer |
| 17  | Cost Allocation: Joint Products and Byproducts        | Complete | Joint cost allocator (3 methods), sell-or-process-further calculator, byproduct accounting comparator, process flow visualizer                                           |
| 18  | Process Costing                                       | Complete | Physical units flow tracker, equivalent units calculator, weighted-average engine, FIFO engine, method comparator                                                        |
| 19  | Spoilage, Rework, and Scrap                           | Complete | Spoilage classifier, inspection point analyzer, process costing with spoilage (weighted-average), process costing with spoilage (FIFO), rework and scrap accounting      |
| 20  | Balanced Scorecard: Quality and Time                  | Complete | COQ report builder (two-period), quality cost trade-off analyzer, nonfinancial quality measures analyzer, MCE calculator, Pareto diagram (canvas)                        |
| 21  | Inventory Management, JIT, and Simplified Costing     | Complete | EOQ calculator, safety stock and reorder point, JIT vs traditional analyzer, backflush costing engine                                                                    |
| 22  | Capital Budgeting and Cost Analysis                   | Complete | Relevant cash flow identifier, NPV and IRR calculator, payback and AARR, capital budgeting dashboard with tax effects, sensitivity analyzer                              |
| 23  | Management Control Systems and Transfer Pricing       | Complete | Decentralization analyzer, transfer price method comparator, general transfer pricing rule calculator, multinational tax strategy tool                                   |
| 24  | Performance Measurement and Compensation              | Complete | ROI vs RI comparator, EVA calculator, DuPont decomposition, performance dashboard, compensation linkage analyzer, multinational performance comparator                   |

---

## Shared Components

| Component      | File                            | Status | Used In                                     |
| -------------- | ------------------------------- | ------ | ------------------------------------------- |
| Randomizer     | js/components/randomizer.js     | Built  | Numeric tools across Learn chapters         |
| Journal Entry  | js/components/journal-entry.js  | Built  | Ch. 4, Ch. 6, journal-entry style tools     |
| Show Work      | js/components/show-work.js      | Built  | Calculator tools across Learn chapters      |
| Settings Panel | js/components/settings-panel.js | Built  | All chapter pages -- width, font, dark mode |
| Header         | js/components/header.js         | Built  | All pages                                   |

## Chart Library

| Chart          | File                       | Status | Used In                |
| -------------- | -------------------------- | ------ | ---------------------- |
| Base Chart     | js/charts/chart-core.js    | Built  | All chart components   |
| CVP Chart      | js/charts/cvp-chart.js     | Built  | Ch. 3, Apply breakeven |
| Scatter Plot   | js/charts/scatter-chart.js | Built  | Ch. 10                 |
| ROC Chart      | js/charts/roc-chart.js     | Built  | Ch. 11                 |
| Pareto Diagram | js/charts/pareto-chart.js  | Built  | Ch. 20                 |

---

## Apply Section -- Scenario Status

| Scenario                           | Chapters      | Status                          |
| ---------------------------------- | ------------- | ------------------------------- |
| Will we break even? Make a profit? | 3, 9, 12      | Concept + Analysis + Simulation |
| What does it cost to make this?    | 2, 4, 5, 18   | Concept + Analysis              |
| What is our plan for the year?     | 6, 10         | Concept + Analysis              |
| Did we hit our plan?               | 7, 8          | Concept + Analysis              |
| Should we make it or buy it?       | 12, 5, 10, 23 | Concept + Analysis              |
| What should we charge?             | 14, 12, 3     | Concept + Analysis              |
| Which customers are profitable?    | 15, 16, 5     | Concept + Analysis              |
| Are we managing inventory well?    | 21, 9, 12     | Concept + Analysis              |
| Is this investment worth it?       | 22, 12, 24    | Concept + Analysis              |
| How are we measuring performance?  | 24, 23, 13    | Concept + Analysis              |
| What do our costs tell us?         | 10, 11        | Concept + Analysis              |
| Are we producing quality?          | 20, 19, 12    | Concept + Analysis              |

---

## Simulation Engine

The simulation engine (js/engine/scenario-engine.js) is a domain-agnostic state machine that powers the Simulation depth level for Apply scenarios. All accounting logic lives in scenario definition files under js/engine/scenarios/.

### Engine Features

- Three answer types per stage: single-choice (bell curve options), multiple-choice (select all that apply), numeric input (free entry, tolerance-based grading)
- Answer type randomly selected per stage per round -- same stage may present differently each playthrough
- Four scoring levels: optimal, acceptable, suboptimal, poor (deep red -- business-damaging decisions)
- Show work panel rendered after every decision using shared renderShowWork() component
- Selection breakdown for multiple-choice -- shows per-option correct/incorrect with reason
- Weight-based debrief rating -- poor decisions penalize more than suboptimal
- Visited stage progress tracking -- progress bar reflects actual path taken not total stage count
- randomizeMetrics() called on every init/reset -- fresh numbers every round
- Bell curve option generator -- optimal answer shifts position each round, irregular spacing prevents pattern recognition
- Branching -- nextStage as string (linear) or function (conditional based on prior decisions)

### Simulation Status

| Scenario                           | Status   | Stages | Notes                                   |
| ---------------------------------- | -------- | ------ | --------------------------------------- |
| Will we break even? Make a profit? | Complete | 5      | All three answer types, dynamic scoring |
| Should we make it or buy it?       | Planned  | --     | --                                      |
| What should we charge?             | Planned  | --     | --                                      |
| Is this investment worth it?       | Planned  | --     | --                                      |
| How are we measuring performance?  | Planned  | --     | --                                      |
| Are we producing quality?          | Planned  | --     | --                                      |

### Test Suite

Automated tests in tests/ validate every scenario definition before browser testing:

    node tests/test-runner.js js/engine/scenarios/breakeven-sim.js

Tests:

1. Structure Validation -- required fields, answer types, option shapes
2. Simulation Path Walkthrough -- walks every possible decision path, validates consequence shapes and breakdown labels
3. Randomizer Stress Test -- runs randomizeMetrics() 100 times, checks sanity and achievability
4. Score Distribution Check -- verifies all four score levels are reachable across 50 runs
5. Selection Breakdown Label Check -- confirms no undefined labels in any breakdown
6. Stage Graph Connectivity -- validates all nextStage references resolve to real stage ids

---

## Practice Section -- Phase 6A + Phase A Depth + Phase B Tier 1 Complete

A third first-class section alongside Learn and Apply. Accessible from the main nav and the landing page. **74 randomized multi-step calculation problems across 13 chapters**, with a domain-agnostic engine, scenario pool system, automated validator, and render-time option shuffling.

### Concept

Students receive randomized financial data and calculate answers step by step. Numeric steps grade by tolerance; choice steps grade by exact ID match against a function of the data. Same problem regenerates fresh numbers every attempt. No options for numeric steps, no helper tools -- mirrors exam conditions.

### Engine

`js/practice/practice-engine.js` (v3+) is the state machine. SPEC.md at `js/practice/SPEC.md` is the authoritative contract.

**Pass 2 features (locked May 2026):**

- Optional `scenario(data)` field -- prose card above the given panel, weaves randomized data into business narrative
- `choice` step type -- radio-button options, graded by `correctId(data, prior)` (a function of randomized data, never trivia)
- Carry-forward of correct values only -- student errors never cascade
- "See Summary" button gate on final step -- no auto-advance after submission
- Persistent show-work on all submitted steps, plus collapsible solutions in the summary
- **Option-order shuffle at render time** -- Fisher-Yates shuffle per problem instance, cached in `state.shuffledOptions[stepId]`, stable across re-renders. Closes the position-based pattern-matching exploit. Authors don't need to do anything; just be aware that `options[0]` in source code is not what students see in the UI.

### Scenario Pool System

`js/practice/scenario-pools.js` exposes `randomCompany()` and `randomProduct()`. Backed by four JSON files in `js/practice/data/`:

| File             | Entries | Purpose                                              |
| ---------------- | ------- | ---------------------------------------------------- |
| names.json       | 325     | Base company names (Bayport, Argent, Halberd, etc.)  |
| industries.json  | 50      | Industry descriptors with category tags              |
| suffixes.json    | 10      | Legal-form suffixes (Inc, LLC, Corp, three blanks)   |
| products.json    | 46      | Singular/plural product nouns with category tags     |

Categories: `manufacturing`, `process`, `service`, `retail`, `distribution`, `technology`, `healthcare`, `hospitality`, `construction`, `any`. Helpers filter by category, so a manufacturing problem never randomizes "Bayport Consulting." Combined uniqueness is ~26,000 names for manufacturing alone, ~162,500 for `any`.

### Practice Problems Status

| Chapter | Topic                            | Problems | Validator |
| ------- | -------------------------------- | -------- | --------- |
| Ch. 3   | CVP Analysis                     | 8        | 0 fail    |
| Ch. 5   | Activity-Based Costing & ABM     | 5        | 0 fail    |
| Ch. 7   | Direct Cost Variances            | 5        | 0 fail    |
| Ch. 8   | Overhead Variances               | 5        | 0 fail    |
| Ch. 9   | Inventory Costing & Capacity     | 5        | 0 fail    |
| Ch. 10  | Cost Behavior                    | 5        | 0 fail    |
| Ch. 12  | Relevant Costs                   | 8        | 0 fail    |
| Ch. 15  | Customer Profitability           | 5        | 0 fail    |
| Ch. 18  | Process Costing                  | 5        | 0 fail    |
| Ch. 21  | Inventory Management / JIT       | 6        | 0 fail    |
| Ch. 22  | Capital Budgeting                | 7        | 0 fail    |
| Ch. 23  | Transfer Pricing                 | 5        | 0 fail    |
| Ch. 24  | Performance Measurement          | 5        | 0 fail    |

**74 problems total. 5,264 validator checks passing. 0 failures, 1 warning (Ch. 22 `payback` shorter-payback always Project B -- pedagogically intentional, candidate for `intentionalSingleAnswer: true`).**

### Validator

`tests/validate-problem.js` runs 10 checks per problem: schema, step schema (per type), randomize stress test (100 runs), scenario rendering, given shape, solve/correctId determinism, full walkthrough including show-work, choice option coverage (50 runs), and reviewChapters path format. Pedagogically-fixed single-answer choice steps (e.g. "book value IS the sunk cost") opt in via `intentionalSingleAnswer: true`.

Run with:

    npm run validate -- js/practice/ch07-problems.js
    npm run validate:all      # all chapters

Validator infrastructure (in `tests/`):

- `_practice-hook.mjs` -- Node loader hook rewriting Vite-style `/js/...` imports and `import.meta.env.BASE_URL` for plain-Node compatibility
- `_practice-register.mjs` -- hook registrar (separate file required by Node's hooks API)
- `validate-problem.js` -- the actual validator

### Planned Cross-Chapter Problems (Phase 6B)

| Problem                | Chapters         | Status                                                |
| ---------------------- | ---------------- | ----------------------------------------------------- |
| Profitability Analysis | Ch. 3 + 12 + 15  | **Unblocked** -- all three chapters live              |
| Full Variance Analysis | Ch. 7 + 8        | **Unblocked** -- both source chapters live            |
| Make or Buy Decision   | Ch. 12 + 5 + 10  | **Unblocked** -- Ch. 5 + Ch. 10 Practice now live     |
| Capital Investment     | Ch. 22 + 12 + 24 | **Unblocked** -- Ch. 24 Practice now live             |

All four cross-chapter problems are unblocked. Phase 6B authoring is the next Practice milestone.

### File Structure

    pages/practice/index.html         Landing page (chapter + cross-chapter grids)
    pages/practice/ch03.html          CVP picker page
    pages/practice/ch05.html          ABC & ABM picker page
    pages/practice/ch07.html          Direct variance picker page
    pages/practice/ch08.html          Overhead variance picker page
    pages/practice/ch09.html          Inventory costing & capacity picker page
    pages/practice/ch10.html          Cost behavior picker page
    pages/practice/ch12.html          Relevant cost picker page
    pages/practice/ch15.html          Customer profitability picker page
    pages/practice/ch18.html          Process costing picker page
    pages/practice/ch21.html          Inventory management / JIT picker page
    pages/practice/ch22.html          Capital budgeting picker page
    pages/practice/ch23.html          Transfer pricing picker page
    pages/practice/ch24.html          Performance measurement picker page
    pages/practice/cross-chapter.html Cross-chapter picker -- empty stub for Phase 6B

    js/practice/SPEC.md               Authoritative engine + problem schema contract (Pass 2)
    js/practice/practice-engine.js    Engine v3+ -- scenario, choice, tolerance grading, option shuffle
    js/practice/scenario-pools.js     randomCompany() / randomProduct() helpers
    js/practice/index.js              Landing page picker (tile stats derived from problem arrays)
    js/practice/ch03.js               Picker wiring (one per chapter)
    js/practice/ch05.js
    js/practice/ch07.js
    js/practice/ch08.js
    js/practice/ch09.js
    js/practice/ch10.js
    js/practice/ch12.js
    js/practice/ch15.js
    js/practice/ch18.js
    js/practice/ch21.js
    js/practice/ch22.js
    js/practice/ch23.js
    js/practice/ch24.js
    js/practice/ch03-problems.js      8 CVP problems
    js/practice/ch05-problems.js      5 ABC & ABM problems
    js/practice/ch07-problems.js      5 direct-cost variance problems
    js/practice/ch08-problems.js      5 overhead variance problems
    js/practice/ch09-problems.js      5 inventory costing & capacity problems
    js/practice/ch10-problems.js      5 cost behavior problems
    js/practice/ch12-problems.js      8 relevant cost problems
    js/practice/ch15-problems.js      5 customer profitability problems
    js/practice/ch18-problems.js      5 process costing problems
    js/practice/ch21-problems.js      6 inventory management / JIT problems
    js/practice/ch22-problems.js      7 capital budgeting problems
    js/practice/ch23-problems.js      5 transfer pricing problems
    js/practice/ch24-problems.js      5 performance measurement problems
    js/practice/cross-chapter-problems.js  Empty stub -- Phase 6B

    js/practice/data/names.json       325 base company names
    js/practice/data/industries.json  50 industry descriptors
    js/practice/data/suffixes.json    10 legal-form suffixes
    js/practice/data/products.json    46 product nouns

    css/practice.css                  Picker tiles, step cards, scenario card, summary screen

    tests/_practice-hook.mjs          Node loader hook
    tests/_practice-register.mjs      Hook registrar
    tests/validate-problem.js         10-check problem validator

---

## Technical Notes

- Vite 7 -- multi-page app, no framework, vanilla JS throughout
- PWA -- service worker via vite-plugin-pwa, works offline after first load
- ES Modules -- all JS uses native import/export
- CSS custom properties -- full design system in base.css, responsive min() widths
- Progress tracking -- localStorage via progress-tracker.js, resetChapter() per chapter
- Randomizer -- fires native input events so existing listeners update automatically
- Show Work -- collapsible step-by-step panels, always rendered after output
- Settings Panel -- gear icon in header; controls content width, font size, and dark/light theme; persisted to localStorage
- Dark mode -- toggled via data-theme="dark" on html element; all overrides in css/settings-panel.css
- No hardcoded hex in JS output -- all JS-generated HTML uses CSS custom property tokens only
- Chart interactions -- chart components use canvas interaction patterns where applicable
- Full-bleed layout -- .full-bleed + .full-bleed\_\_inner for content wider than container--tool
- JS-owned outputs -- interactive result sections created or populated by JavaScript using getOrCreate patterns
- GitHub Pages -- deployed via GitHub Actions, base path `/Managerial-Accounting/` in production, `/` in dev; vite.config.js uses `command === 'build'` to determine base path

---

## Development Roadmap

Phase 1 -- Learn Section Chapters 1-4 -- Complete
Phase 2 -- Learn Section Chapters 5-12 -- Complete
Phase 3 -- Learn Section Chapters 13-24 -- Complete
Phase 4A -- Apply Section Concept + Analysis (all 12 scenarios) -- Complete
Phase 4B -- Apply Index with objective badges -- Complete
Phase 4C -- Simulation Engine -- Complete
Phase 4D -- Breakeven Simulation (first simulation) -- Complete
Phase 4E -- GitHub Pages deployment via Actions -- Complete
Phase 5 -- Remaining 5 Simulations -- In Progress
Phase 6A -- Practice Section chapter problems (Ch. 3 / 7 / 8 / 12 / 15 / 22) + engine v3 + validator + option shuffle -- Complete
Phase A (Sub-step depth) -- Extended depth on 6 existing problems across Ch. 5 / 9 / 10 / 12 -- Complete
Phase B Tier 1 -- 8 new problems across Ch. 3 (sales-mix CVP, operating leverage, CVP graph interpretation), Ch. 12 (constrained special order, sell-or-process-further, opportunity-cost pricing), Ch. 22 (capital rationing, discounted payback) -- Complete
Phase B Tier 2 -- 6 additional breadth problems -- Remaining
Phase 6B -- Practice Section cross-chapter problems (Full Variance, Profitability Analysis, Make-or-Buy, Capital Investment) -- All four unblocked, authoring not yet started

---

## Useful Dev Commands

    npm run dev          # Vite dev server, localhost
    npm run build        # Production build to dist/
    npm run preview      # Serve dist/ locally (catches base-path issues)
    npm run validate     # Run Practice problem validator on a single file
    npm run validate:all # Run validator across all Practice chapters
    git push origin main # Deploys to GitHub Pages via Actions

Kill stuck dev servers:

    lsof -ti :5173,:5174,:5175,:5176 | xargs kill -9 2>/dev/null; pkill -9 -f vite 2>/dev/null; echo done

## CSS Authoring Rule

Never write CSS inside Python triple-quoted strings passed through a shell heredoc.
Always write CSS as a Python list of strings and join with newline.

## Dark Mode Rule

Never use hardcoded hex color values in JS-generated HTML. Always use CSS custom property tokens so dark mode works automatically.

    WRONG:  background: '#f0fdf4'
    RIGHT:  background: 'var(--color-success-bg)'

Token reference for JS output:

- var(--color-success-bg) dark green background in dark mode
- var(--color-danger-bg) dark red background in dark mode
- var(--color-warning-bg) dark amber background in dark mode
- var(--color-info-bg) dark navy background in dark mode
- var(--color-poor-bg) deep dark red background in dark mode
- var(--color-success) teal text in dark mode
- var(--color-danger) red text in dark mode
- var(--color-warning) amber text in dark mode
- var(--color-poor) bright red text in dark mode
- var(--color-info) light blue text in dark mode
- var(--color-primary-text) light blue text in dark mode, navy in light mode
- var(--color-accent) gold, same in both modes

---

## Known Issues / Polish Backlog

- CSS integrity audit previously found collapsed }.selector patterns in css/learn.css; browsers tolerate this, but it should be cleaned up in a polish pass
- show-work not yet added to Ch. 1 (no numeric tools -- low priority)
- formula-display.js, worked-example.js, term-tooltip.js not yet built
- 5 remaining simulations to build (make-or-buy, pricing, investment, performance, quality)
- Phase 6B cross-chapter Practice problems pending (all four scenarios now unblocked)
- Phase B Tier 2 (6 additional breadth problems) remaining
- Ch. 15 Problem 4 (Sales-Mix vs Sales-Quantity Variance) can land on a zero-total-variance edge case where the F/U direction step reads awkwardly. Tighten randomization ranges in polish pass.
- Ch. 22 `payback` Problem -- `shorter-payback` step always resolves to Project B (validator warning). Pedagogically intentional but should either widen Project A's CF range or opt into `intentionalSingleAnswer: true`.
- breakeven-sim.js has duplicate stage definitions (overhead-allocation, demand-shock, year-end appear twice). The engine iterates the stages array and finds the first matching `id` for nextStage references, so the duplicates are dead code. This bloats apply-breakeven bundle by ~30 kB. Clean up in a polish pass.
