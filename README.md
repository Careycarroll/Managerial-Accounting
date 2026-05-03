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

| # | Chapter | Status | Tools |
|---|---------|--------|-------|
| 1 | The Manager and Management Accounting | Complete | Accounting comparison, value chain builder, five-step process, IMA ethics |
| 2 | An Introduction to Cost Terms and Purposes | Complete | Cost classifier, relevant range visualizer, manufacturing cost flow, unit cost trap |
| 3 | Cost-Volume-Profit Analysis | Complete | CVP dashboard, CVP graph (canvas, interactive), sensitivity analysis, sales mix CVP |
| 4 | Job Costing | Complete | Job cost record builder, normal vs actual costing, overhead disposal, job vs process classifier |
| 5 | Activity-Based Costing and ABM | Complete | Simple vs ABC comparator, cost hierarchy classifier, ABC system builder (8 pools), ABM decisions |
| 6 | Master Budget and Responsibility Accounting | Complete | Operating budget builder (9-step), sensitivity analysis, responsibility center classifier, cash budget, Kaizen simulator |
| 7 | Flexible Budgets and Direct-Cost Variances | Complete | Static vs flexible budget analyzer, direct-cost variance calculator (Level 3 columnar), variance hierarchy diagram |
| 8 | Flexible Budgets and Overhead Variances | Complete | Overhead rate developer (4-step), 4-variance overhead analyzer (Panels A+B), complete variance hierarchy (Exhibit 8-5) |
| 9 | Inventory Costing and Capacity Analysis | Not started | Costing method comparator, capacity concepts calculator |
| 10 | Determining How Costs Behave | Not started | Cost estimation suite, scatter plot visualizer, learning curve calculator |
| 11 | Data Analytic Thinking and Prediction | Not started | Decision tree builder, Gini calculator, ROC curve visualizer |
| 12 | Decision Making and Relevant Information | Not started | Relevant cost identifier, make-or-buy calculator, TOC bottleneck manager |
| 13 | Strategy, Balanced Scorecard, Strategic Profitability | Not started | Strategy map builder, balanced scorecard, strategic profitability analyzer |
| 14 | Pricing Decisions and Cost Management | Not started | Target costing calculator, value engineering simulator, cost-plus comparison |
| 15 | Cost Allocation and Customer Profitability | Not started | Customer profitability analyzer, whale curve, sales variance calculator |
| 16 | Allocation of Support-Department Costs | Not started | Multi-department allocation engine, Shapley value, revenue allocation |
| 17 | Cost Allocation: Joint Products and Byproducts | Not started | Process flow visualizer, joint cost allocator, sell-or-process calculator |
| 18 | Process Costing | Not started | Process costing engine, equivalent units visualizer, method comparison |
| 19 | Spoilage, Rework, and Scrap | Not started | Spoilage classifier, inspection point visualizer, journal entry generator |
| 20 | Balanced Scorecard: Quality and Time | Not started | COQ report builder, control chart visualizer, Pareto diagram, MCE calculator |
| 21 | Inventory Management, JIT, and Simplified Costing | Not started | EOQ calculator, safety stock optimizer, backflush costing engine |
| 22 | Capital Budgeting and Cost Analysis | Not started | Capital budgeting dashboard, relevant cash flow builder, sensitivity analysis |
| 23 | Management Control Systems and Transfer Pricing | Not started | Transfer pricing calculator, goal congruence test, multinational tax tool |
| 24 | Performance Measurement and Compensation | Not started | Performance dashboard, DuPont decomposition, WACC calculator |

---

## Shared Components

| Component | File | Status | Used In |
|-----------|------|--------|---------|
| Randomizer | js/components/randomizer.js | Built | Ch. 2, 3, 4, 5, 6 |
| Journal Entry | js/components/journal-entry.js | Built | Ch. 4, 6 |
| Show Work | js/components/show-work.js | Built | Ch. 2, 3, 4, 5, 6 |
| Depth Selector | js/components/depth-selector.js | Built | Pending Apply section |
| Formula Display | js/components/formula-display.js | Not built | Planned |
| Term Tooltip | js/components/term-tooltip.js | Not built | Planned |

## Chart Library

| Chart | File | Status | Used In |
|-------|------|--------|---------|
| Base Chart | js/charts/chart-core.js | Built | All charts |
| CVP Chart | js/charts/cvp-chart.js | Built | Ch. 3 |
| Scatter Plot | js/charts/scatter-chart.js | Not built | Ch. 10 |
| Variance Diagram | js/charts/variance-chart.js | Not built | Ch. 7, 8 |
| Control Chart | js/charts/control-chart.js | Not built | Ch. 20 |
| Pareto Diagram | js/charts/pareto-chart.js | Not built | Ch. 20 |

---

## Apply Section -- Scenario Status

| Scenario | Chapters | Status |
|----------|----------|--------|
| What does it cost to make this? | 2, 4, 5, 18 | Not started |
| Will we break even? Make a profit? | 3, 9, 12 | Not started |
| What's our plan for the year? | 6, 10 | Not started |
| Did we hit our plan? | 7, 8 | Not started |
| Should we make it or buy it? | 12, 5, 10, 23 | Not started |
| What should we charge? | 14, 12, 3 | Not started |
| Which customers are profitable? | 15, 16, 5 | Not started |
| Are we managing inventory well? | 21, 9, 12 | Not started |
| Is this investment worth it? | 22, 12, 24 | Not started |
| How are we measuring performance? | 24, 23, 13 | Not started |
| What do our costs tell us? | 10, 11 | Not started |
| Are we producing quality? | 20, 19, 12 | Not started |

---

## Technical Notes

- Vite 7 -- multi-page app, no framework, vanilla JS throughout
- PWA -- service worker via vite-plugin-pwa, works offline after first load
- ES Modules -- all JS uses native import/export
- CSS custom properties -- full design system in base.css, responsive min() widths
- Progress tracking -- localStorage via progress-tracker.js, resetChapter() per chapter
- Randomizer -- fires native input events so existing listeners update automatically
- Show Work -- collapsible step-by-step panels, always rendered after output
- Chart interactions -- crosshair, tooltip, click-to-pin, scroll-to-zoom, drag-to-pan, double-click-to-reset
- Full-bleed layout --.full-bleed +.full-bleed__inner for content wider than container--tool
- No placeholder divs -- JS creates all output elements dynamically via getOrCreate pattern
- GitHub Pages -- base path /Managerial-Accounting/ in production, / in dev

---

## Development Roadmap

Phase 1 -- Learn Section Chapters 1-4 -- Complete
Ch. 1 (Manager), Ch. 2 (Cost Terms), Ch. 3 (CVP with canvas), Ch. 4 (Job Costing).
Shared components: randomizer, journal-entry, show-work.
Chart library: chart-core (full interaction layer), cvp-chart.

Phase 2 -- Learn Section Chapters 5-12 (In Progress)
Ch. 5 (ABC) -- Complete. Ch. 6 (Master Budget) -- Complete. Ch. 7 (Flexible Budgets, Direct-Cost Variances) -- Complete. Ch. 8 (Overhead Variances) -- Complete.
Remaining priority order: Ch. 12 (Relevant Costs, most cross-referenced), Ch. 9 (Inventory Costing), Ch. 10 (Cost Behavior), Ch. 11 (Data Analytics).

Phase 3 -- Learn Section Chapters 13-24
Ch. 13 (Strategy), Ch. 14 (Pricing), Ch. 15 (Customer Profitability), Ch. 16 (Support Dept Allocation),
Ch. 17 (Joint Products), Ch. 18 (Process Costing), Ch. 19 (Spoilage), Ch. 20 (Quality and Time),
Ch. 21 (Inventory Management), Ch. 22 (Capital Budgeting), Ch. 23 (Transfer Pricing), Ch. 24 (Performance Measurement).

Phase 4 -- Apply Section Level 1 (Concept)
Build all 12 Apply scenario pages at Concept depth.

Phase 5 -- Shared Chart Library Expansion
scatter-chart, variance-chart, control-chart, pareto-chart.

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

---

## Known Issues / Polish Backlog

- View toggle buttons on Learn index need styling refinement
- Apply section not yet started
- show-work not yet added to Ch. 1 (no numeric tools -- low priority)
- formula-display.js, worked-example.js, term-tooltip.js not yet built
- js/data/managerial-terms.js not yet built