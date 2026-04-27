# Managerial Accounting Interactive

An interactive learning tool for Horngren's Cost Accounting (17th Edition). Built with Vite, vanilla JavaScript, and CSS custom properties. No frameworks. Deployed as a Progressive Web App on GitHub Pages.

Live: https://careycarroll.github.io/Managerial-Accounting/

Source: Horngren, Datar & Rajan -- Cost Accounting: A Managerial Emphasis, 17th Edition

---

## Goal

Build a comprehensive interactive learning companion that covers every concept in the textbook -- chapter by chapter -- with three layers of engagement:

1. Learn -- Chapter-by-chapter interactive tools, worked examples, and practice problems tied directly to the textbook
2. Apply -- Real-world business decision scenarios that pull from multiple chapters
3. Depth Levels -- Every Apply scenario has three modes: Concept (quick), Analysis (full), Simulation (sequential decisions)

The tool is designed for students who want to understand the why, not just the math.

---

## Running Locally

    # Clone
    git clone https://github.com/careycarroll/Managerial-Accounting.git
    cd Managerial-Accounting

    # Install dependencies
    npm install

    # Start dev server
    npm run dev
    # Open http://localhost:5173/

    # Build for production
    npm run build

    # Deploy to GitHub Pages
    npm run deploy

---

## Project Structure

    Managerial-Accounting/
    ├── index.html                        # Landing page
    ├── vite.config.js                    # Vite multi-page app + PWA configuration
    ├── package.json
    │
    ├── pages/
    │   ├── learn/
    │   │   ├── index.html                # Learn section -- chapter grid with progress
    │   │   ├── ch01.html                 # Ch. 1: The Manager and Management Accounting ✅
    │   │   ├── ch02.html                 # Ch. 2: Cost Terms and Purposes
    │   │   ├── ch03.html                 # Ch. 3: CVP Analysis
    │   │   ├── ch04.html                 # Ch. 4: Job Costing
    │   │   ├── ch05.html                 # Ch. 5: Activity-Based Costing
    │   │   ├── ch06.html                 # Ch. 6: Master Budget
    │   │   ├── ch07.html                 # Ch. 7: Flexible Budgets, Direct-Cost Variances
    │   │   ├── ch08.html                 # Ch. 8: Overhead Variances
    │   │   ├── ch09.html                 # Ch. 9: Inventory Costing and Capacity
    │   │   ├── ch10.html                 # Ch. 10: Cost Behavior
    │   │   ├── ch11.html                 # Ch. 11: Data Analytics and Prediction
    │   │   ├── ch12.html                 # Ch. 12: Relevant Costs and Decision Making
    │   │   ├── ch13.html                 # Ch. 13: Strategy and Balanced Scorecard
    │   │   ├── ch14.html                 # Ch. 14: Pricing Decisions
    │   │   ├── ch15.html                 # Ch. 15: Customer Profitability
    │   │   ├── ch16.html                 # Ch. 16: Support Department Allocation
    │   │   ├── ch17.html                 # Ch. 17: Joint Products and Byproducts
    │   │   ├── ch18.html                 # Ch. 18: Process Costing
    │   │   ├── ch19.html                 # Ch. 19: Spoilage, Rework, and Scrap
    │   │   ├── ch20.html                 # Ch. 20: Quality and Time
    │   │   ├── ch21.html                 # Ch. 21: Inventory Management and JIT
    │   │   ├── ch22.html                 # Ch. 22: Capital Budgeting
    │   │   ├── ch23.html                 # Ch. 23: Transfer Pricing
    │   │   └── ch24.html                 # Ch. 24: Performance Measurement
    │   └── apply/
    │       ├── index.html                # Apply section -- scenario grid
    │       ├── what-does-it-cost.html
    │       ├── will-we-break-even.html
    │       ├── whats-our-plan.html
    │       ├── did-we-hit-our-plan.html
    │       ├── make-or-buy.html
    │       ├── what-should-we-charge.html
    │       ├── which-customers.html
    │       ├── managing-inventory.html
    │       ├── is-investment-worth-it.html
    │       ├── measuring-performance.html
    │       ├── what-do-costs-tell-us.html
    │       └── are-we-producing-quality.html
    │
    ├── js/
    │   ├── core/
    │   │   ├── main.js                   # Landing page entry point
    │   │   └── progress-tracker.js       # localStorage-based chapter/scenario progress
    │   ├── components/
    │   │   ├── depth-selector.js         # Concept/Analysis/Simulation toggle (built)
    │   │   ├── journal-entry.js          # T-account and journal entry renderer (stubbed)
    │   │   ├── formula-display.js        # KaTeX formula rendering (stubbed)
    │   │   ├── worked-example.js         # Collapsible guided walkthrough panels (stubbed)
    │   │   └── term-tooltip.js           # Hover definitions from glossary (stubbed)
    │   ├── charts/                       # Canvas chart components (not yet built)
    │   ├── engine/                       # Simulation state machine (not yet built)
    │   ├── learn/
    │   │   ├── index.js                  # Learn index -- chapter grid renderer (built)
    │   │   ├── ch01.js                   # Ch. 1 interactive tools (built)
    │   │   └── ch02.js... ch24.js       # Not yet built
    │   ├── apply/                        # Not yet built
    │   └── data/
    │       └── managerial-terms.js       # 200+ glossary terms (not yet built)
    │
    └── css/
        ├── base.css                      # Custom properties, reset, typography (built)
        ├── components.css                # Shared UI components (built)
        ├── learn.css                     # Learn section layout and chapter cards (built)
        └── apply.css                     # Not yet built

---

## Learn Section -- Chapter Status

| # | Chapter | Status | Tools |
|---|---------|--------|-------|
| 1 | The Manager and Management Accounting | Complete | Accounting comparison, value chain builder, five-step process, IMA ethics, key terms |
| 2 | An Introduction to Cost Terms and Purposes | Not started | Cost classifier, relevant range visualizer, manufacturing flow, unit cost trap |
| 3 | Cost-Volume-Profit Analysis | Not started | CVP dashboard, PV graph, sensitivity analysis, sales mix CVP |
| 4 | Job Costing | Not started | Job cost record builder, overhead rate calculator, disposal methods |
| 5 | Activity-Based Costing and ABM | Not started | ABC system builder, cost hierarchy classifier, simple vs. ABC comparison |
| 6 | Master Budget and Responsibility Accounting | Not started | Master budget builder, cash budget, responsibility center classifier |
| 7 | Flexible Budgets and Direct-Cost Variances | Not started | Variance analysis engine, flexible budget builder, journal entry generator |
| 8 | Flexible Budgets and Overhead Variances | Not started | Overhead variance engine, variance diagram, ABC overhead extension |
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

## Apply Section -- Scenario Status

Each scenario has three depth levels: Concept / Analysis / Simulation

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
- CSS custom properties -- full design system in base.css (colors, spacing, typography, shadows)
- Progress tracking -- localStorage via progress-tracker.js, no server required
- Depth selector -- depth-selector.js manages Concept/Analysis/Simulation toggle state per page
- GitHub Pages -- base path /Managerial-Accounting/ in production, / in dev
- KaTeX -- formula rendering for mathematical expressions across chapter tools
- No canvas yet -- Ch. 1 is purely HTML/CSS interactive. Canvas charts begin at Ch. 3 (CVP) and Ch. 10 (scatter/regression)

---

## Architecture Decisions

Why Vite over native ES modules?
38 HTML pages with multiple JS imports made manual script tag management impractical. Vite handles code splitting, tree shaking, and HMR automatically with zero framework overhead.

Why PWA from the start?
Students study everywhere. Offline capability means the tool works on a plane, in a library with spotty wifi, or cached on a phone. Adding PWA after the fact is harder than building it in from day one.

Why three depth levels?
The same concept needs to serve a student seeing it for the first time (Concept), a student doing homework (Analysis), and a student preparing for an exam or case interview (Simulation). One tool, three audiences, one toggle.

Why separate Learn and Apply sections?
Learn is chapter-driven (how the book teaches). Apply is decision-driven (how managers think). Students need both -- the mechanics to understand the math, and the context to know when to use it.

---

## Development Roadmap

Phase 1 -- Learn Section Foundation (In Progress)
Build all 24 chapter pages following the Ch. 1 template. Priority order:
Ch. 2 -> Ch. 3 -> Ch. 12 -> Ch. 6 -> Ch. 7/8 -> remaining chapters

Phase 2 -- Apply Section Level 1 (Concept)
Build all 12 Apply scenario pages at Concept depth. Establishes the Apply page template.

Phase 3 -- Shared Chart Library
Build canvas chart components needed across multiple chapters: CVP chart, variance diagram, whale curve, control chart, Pareto diagram, scatter plot, decision tree renderer.

Phase 4 -- Apply Section Level 2 (Analysis)
Upgrade all 12 Apply scenarios to Analysis depth.

Phase 5 -- Apply Section Level 3 (Simulation)
Build Level 3 simulations for the 6 highest-value scenarios.

---

## Useful Dev Commands

    # Start dev server
    npm run dev

    # Kill all running Vite/Node processes
    lsof -ti :5173,:5174,:5175,:5176 | xargs kill -9 2>/dev/null; pkill -9 -f vite 2>/dev/null; echo done

    # Build for production
    npm run build

    # Deploy to GitHub Pages
    npm run deploy

    # Check file sizes
    find ~/Github\ Projects/Managerial-Accounting/js -name "*.js" | xargs wc -c | sort -n

    # Dump source files to audit.txt
    for f in pages/**/*.html js/**/*.js css/*.css; do
      echo "========== $f =========="
      cat "$f"
    done > audit.txt

---

## Known Issues / Polish Backlog

- View toggle buttons on Learn index need styling refinement
- Apply section index page not yet built
- Ch. 2-24 pages not yet built
- No canvas chart components yet
- js/components/ files stubbed but not implemented
