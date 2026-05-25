# Managerial Accounting Interactive

An interactive learning tool for Horngren's Cost Accounting (17th Edition). Built with Vite, vanilla JavaScript, and CSS custom properties. No frameworks. Deployed as a Progressive Web App on GitHub Pages.

Live: https://careycarroll.github.io/Managerial-Accounting/

Source: Horngren, Datar & Rajan -- Cost Accounting: A Managerial Emphasis, 17th Edition

---

## Goal

Build a comprehensive interactive learning companion that covers every concept in the textbook -- chapter by chapter -- with three layers of engagement:

1. Learn -- Chapter-by-chapter interactive tools, show-work panels, and practice problems tied directly to the textbook
2. Apply -- Real-world business decision scenarios that pull from multiple chapters
3. Depth Levels -- Every Apply scenario has three modes: Concept (quick), Analysis (full), Simulation (sequential decisions)

---

## Running Locally

    git clone https://github.com/careycarroll/Managerial-Accounting.git
    cd Managerial-Accounting
    npm install
    npm run dev

---

## Learn Section -- Chapter Status

| #   | Chapter                                               | Status      | Tools                                                                                                                                                                    |
| --- | ----------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | The Manager and Management Accounting                 | Complete    | Accounting comparison, value chain builder, five-step process, IMA ethics                                                                                                |
| 2   | An Introduction to Cost Terms and Purposes            | Complete    | Cost classifier, relevant range visualizer, manufacturing cost flow, unit cost trap                                                                                      |
| 3   | Cost-Volume-Profit Analysis                           | Complete    | CVP dashboard, CVP graph (canvas, interactive), sensitivity analysis, sales mix CVP                                                                                      |
| 4   | Job Costing                                           | Complete    | Job cost record builder, normal vs actual costing, overhead disposal, job vs process classifier                                                                          |
| 5   | Activity-Based Costing and ABM                        | Complete    | Simple vs ABC comparator, cost hierarchy classifier, ABC system builder (8 pools), ABM decisions                                                                         |
| 6   | Master Budget and Responsibility Accounting           | Complete    | Operating budget builder (9-step), sensitivity analysis, responsibility center classifier, cash budget, Kaizen simulator                                                 |
| 7   | Flexible Budgets and Direct-Cost Variances            | Complete    | Static vs flexible budget analyzer, direct-cost variance calculator (Level 3 columnar), variance hierarchy diagram                                                       |
| 8   | Flexible Budgets and Overhead Variances               | Complete    | Overhead rate developer (4-step), 4-variance overhead analyzer (Panels A+B), complete variance hierarchy (Exhibit 8-5)                                                   |
| 9   | Inventory Costing and Capacity Analysis               | Complete    | Absorption vs variable costing comparator, capacity concepts calculator, denominator-level analysis, income effects                                                      |
| 10  | Determining How Costs Behave                          | Complete    | Cost estimation suite, scatter plot visualizer, regression/high-low comparison, learning curve calculator                                                                |
| 11  | Data Analytic Thinking and Prediction                 | Complete    | Data analytics workflow, decision tree/Gini tools, prediction model evaluation, ROC curve visualizer                                                                     |
| 12  | Decision Making and Relevant Information              | Complete    | Relevant cost identifier, special order analyzer, make-or-buy calculator, product mix/bottleneck manager, add/drop and equipment replacement                             |
| 13  | Strategy, Balanced Scorecard, Strategic Profitability | Complete    | Strategy identifier, balanced scorecard builder, strategic profitability analyzer, engineered vs discretionary cost classifier                                           |
| 14  | Pricing Decisions and Cost Management                 | Complete    | Pricing context identifier, cost-plus pricing calculator, target costing/value engineering, life-cycle profitability planner                                             |
| 15  | Cost Allocation and Customer Profitability            | Complete    | Customer cost hierarchy classifier, customer profitability analyzer, whale curve builder, sales variance calculator                                                      |
| 16  | Allocation of Support-Department Costs                | Complete    | Support department allocation engine (direct/step-down/reciprocal), common cost allocator, revenue allocation with Shapley value, bundled product profitability analyzer |
| 17  | Cost Allocation: Joint Products and Byproducts        | Complete    | Joint cost allocator (3 methods), sell-or-process-further calculator, byproduct accounting comparator, process flow visualizer                                           |
| 18  | Process Costing                                       | Complete    | Physical units flow tracker, equivalent units calculator, weighted-average engine, FIFO engine, method comparator                                                        |
| 19  | Spoilage, Rework, and Scrap                           | Complete    | Spoilage classifier, inspection point analyzer, process costing with spoilage (weighted-average), process costing with spoilage (FIFO), rework and scrap accounting      |
| 20  | Balanced Scorecard: Quality and Time                  | Complete    | COQ report builder (two-period), quality cost trade-off analyzer, nonfinancial quality measures analyzer, MCE calculator, Pareto diagram (canvas)                        |
| 21  | Inventory Management, JIT, and Simplified Costing     | Not started | EOQ calculator, safety stock optimizer, JIT and backflush costing engine                                                                                                 |
| 22  | Capital Budgeting and Cost Analysis                   | Not started | Capital budgeting dashboard, relevant cash flow builder, sensitivity analysis                                                                                            |
| 23  | Management Control Systems and Transfer Pricing       | Not started | Transfer pricing calculator, goal congruence test, multinational tax tool                                                                                                |
| 24  | Performance Measurement and Compensation              | Not started | Performance dashboard, DuPont decomposition, WACC calculator                                                                                                             |

---

## Shared Components

| Component       | File                             | Status              | Used In                                     |
| --------------- | -------------------------------- | ------------------- | ------------------------------------------- |
| Randomizer      | js/components/randomizer.js      | Built               | Numeric tools across Learn chapters         |
| Journal Entry   | js/components/journal-entry.js   | Built               | Ch. 4, Ch. 6, journal-entry style tools     |
| Show Work       | js/components/show-work.js       | Built               | Calculator tools across Learn chapters      |
| Settings Panel  | js/components/settings-panel.js  | Built               | All chapter pages -- width, font, dark mode |
| Depth Selector  | js/components/depth-selector.js  | Not built / pending | Planned for Apply section                   |
| Formula Display | js/components/formula-display.js | Not built           | Planned                                     |
| Term Tooltip    | js/components/term-tooltip.js    | Not built           | Planned                                     |

## Chart Library

| Chart            | File                        | Status    | Used In              |
| ---------------- | --------------------------- | --------- | -------------------- |
| Base Chart       | js/charts/chart-core.js     | Built     | All chart components |
| CVP Chart        | js/charts/cvp-chart.js      | Built     | Ch. 3                |
| Scatter Plot     | js/charts/scatter-chart.js  | Built     | Ch. 10               |
| ROC Chart        | js/charts/roc-chart.js      | Built     | Ch. 11               |
| Pareto Diagram   | js/charts/pareto-chart.js   | Built     | Ch. 20               |
| Variance Diagram | js/charts/variance-chart.js | Not built | Planned              |
| Control Chart    | js/charts/control-chart.js  | Not built | Planned              |

---

## Apply Section -- Scenario Status

| Scenario                           | Chapters      | Status      |
| ---------------------------------- | ------------- | ----------- |
| What does it cost to make this?    | 2, 4, 5, 18   | Not started |
| Will we break even? Make a profit? | 3, 9, 12      | Not started |
| What's our plan for the year?      | 6, 10         | Not started |
| Did we hit our plan?               | 7, 8          | Not started |
| Should we make it or buy it?       | 12, 5, 10, 23 | Not started |
| What should we charge?             | 14, 12, 3     | Not started |
| Which customers are profitable?    | 15, 16, 5     | Not started |
| Are we managing inventory well?    | 21, 9, 12     | Not started |
| Is this investment worth it?       | 22, 12, 24    | Not started |
| How are we measuring performance?  | 24, 23, 13    | Not started |
| What do our costs tell us?         | 10, 11        | Not started |
| Are we producing quality?          | 20, 19, 12    | Not started |

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
- GitHub Pages -- base path /Managerial-Accounting/ in production, / in dev

---

## Development Roadmap

Phase 1 -- Learn Section Chapters 1-4 -- Complete
Ch. 1 (Manager), Ch. 2 (Cost Terms), Ch. 3 (CVP with canvas), Ch. 4 (Job Costing).
Shared components: randomizer, journal-entry, show-work.
Chart library: chart-core (full interaction layer), cvp-chart.

Phase 2 -- Learn Section Chapters 5-12 -- Complete
Ch. 5 (ABC), Ch. 6 (Master Budget), Ch. 7 (Flexible Budgets and Direct-Cost Variances), Ch. 8 (Overhead Variances), Ch. 9 (Inventory Costing and Capacity Analysis), Ch. 10 (Cost Behavior with scatter chart), Ch. 11 (Data Analytics and Prediction with ROC chart), Ch. 12 (Relevant Costs and Decision Making).

Phase 3 -- Learn Section Chapters 13-24 -- Complete
Ch. 13 (Strategy), Ch. 14 (Pricing), Ch. 15 (Customer Profitability), Ch. 16 (Support Dept Allocation), Ch. 17 (Joint Products), Ch. 18 (Process Costing), Ch. 19 (Spoilage), Ch. 20 (Quality and Time) -- all complete.
Settings panel with dark mode, font scaling, and content width added to all pages.
Next: Ch. 21 (Inventory Management, JIT, and Simplified Costing).

Phase 4 -- Apply Section -- In Progress
Apply index page and 2 of 12 scenarios built (breakeven, product cost). Each scenario has Concept and Analysis depth.

Phase 5 -- Shared Chart Library Expansion
variance-chart, control-chart, and any additional chart components needed for later chapters.

Phase 6 -- Apply Section Level 2 (Analysis)
Upgrade all 12 Apply scenarios to Analysis depth.

Phase 7 -- Apply Section Level 3 (Simulation)
Build Level 3 simulations for the 6 highest-value scenarios.

---

## Useful Dev Commands

    npm run dev
    npm run build
    npm run deploy
    lsof -ti :5173,:5174,:5175,:5176 | xargs kill -9 2>/dev/null; pkill -9 -f vite 2>/dev/null; echo done

## CSS Authoring Rule

Never write CSS inside Python triple-quoted strings passed through a shell heredoc.
The terminal collapses newlines between closing braces and the next selector, producing broken
output like `}.next-rule {` that renders correctly in browsers but is unreadable and hard to debug.

Always write CSS as a Python list of strings and join with newline:

    lines = [
        ".my-class {",
        "  color: red;",
        "}",
        ".next-class {",
        "  color: blue;",
        "}",
    ]
    with open(path, 'a') as f:
        f.write('\n'.join(lines) + '\n')

## Dark Mode Rule

Never use hardcoded hex color values in JS-generated HTML. Always use CSS custom property tokens so dark mode works automatically.

    WRONG:  background: '#f0fdf4'
    RIGHT:  background: 'var(--color-success-bg)'

Token reference for JS output:

- var(--color-success-bg) dark green background in dark mode
- var(--color-danger-bg) dark red background in dark mode
- var(--color-warning-bg) dark amber background in dark mode
- var(--color-info-bg) dark navy background in dark mode
- var(--color-success) teal text in dark mode
- var(--color-danger) red text in dark mode
- var(--color-warning) amber text in dark mode
- var(--color-primary-text) light blue text in dark mode, navy in light mode
- var(--color-accent) gold, same in both modes

---

## Known Issues / Polish Backlog

- View toggle buttons on Learn index need styling refinement
- Apply section not yet started
- CSS integrity audit previously found collapsed `}.selector` patterns in css/learn.css; browsers tolerate this, but it should be cleaned up in a polish pass
- show-work not yet added to Ch. 1 (no numeric tools -- low priority)
- formula-display.js, worked-example.js, term-tooltip.js not yet built
- depth-selector.js not currently present and should be built when Apply section begins
- js/data/managerial-terms.js not yet built
