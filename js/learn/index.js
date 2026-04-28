/**
 * js/learn/index.js — Learn section index page
 * Renders chapter cards grouped by category with progress indicators
 */
import { getProgress, resetProgress } from '/js/core/progress-tracker.js';

const CHAPTERS = [
  // Foundations
  {
    id: 'ch01', num: 1, group: 'foundations',
    title: 'The Manager and Management Accounting',
    desc: 'Value chain, five-step decision process, financial vs. management accounting, IMA ethics.',
    tools: ['Accounting comparison', 'Value chain builder', 'Five-step process', 'Ethics scenarios'],
    href: '/pages/learn/ch01.html',
  },
  {
    id: 'ch02', num: 2, group: 'foundations',
    title: 'An Introduction to Cost Terms and Purposes',
    desc: 'Cost objects, direct/indirect costs, variable/fixed costs, relevant range, manufacturing cost flow.',
    tools: ['Cost classifier', 'Relevant range visualizer', 'Manufacturing flow', 'Unit cost trap'],
    href: '/pages/learn/ch02.html',
  },

  // Costing Systems
  {
    id: 'ch04', num: 4, group: 'costing',
    title: 'Job Costing',
    desc: 'Normal vs. actual costing, 7-step approach, source documents, under/overallocated overhead.',
    tools: ['Job cost record builder', 'Overhead rate calculator', 'Disposal methods comparison'],
    href: '/pages/learn/ch04.html',
  },
  {
    id: 'ch05', num: 5, group: 'costing',
    title: 'Activity-Based Costing and ABM',
    desc: 'Cost hierarchy, 7-step ABC, TDABC, cross-subsidization, activity-based management.',
    tools: ['ABC system builder', 'Cost hierarchy classifier', 'Simple vs. ABC comparison'],
    href: '/pages/learn/ch05.html',
  },
  {
    id: 'ch17', num: 17, group: 'costing',
    title: 'Cost Allocation: Joint Products and Byproducts',
    desc: 'Joint costs, splitoff point, four allocation methods, sell-or-process-further decisions.',
    tools: ['Process flow visualizer', 'Joint cost allocator', 'Sell-or-process calculator'],
    href: '/pages/learn/ch17.html',
  },
  {
    id: 'ch18', num: 18, group: 'costing',
    title: 'Process Costing',
    desc: 'Equivalent units, 5-step process costing, weighted-average and FIFO methods.',
    tools: ['Process costing engine', 'Equivalent units visualizer', 'Method comparison panel'],
    href: '/pages/learn/ch18.html',
  },
  {
    id: 'ch19', num: 19, group: 'costing',
    title: 'Spoilage, Rework, and Scrap',
    desc: 'Normal vs. abnormal spoilage, inspection points, job costing quality costs.',
    tools: ['Spoilage classifier', 'Inspection point visualizer', 'Journal entry generator'],
    href: '/pages/learn/ch19.html',
  },

  // Planning
  {
    id: 'ch03', num: 3, group: 'planning',
    title: 'Cost–Volume–Profit Analysis',
    desc: 'Breakeven, target income, margin of safety, operating leverage, sales mix.',
    tools: ['CVP dashboard', 'PV graph', 'Sensitivity analysis', 'Sales mix CVP'],
    href: '/pages/learn/ch03.html',
  },
  {
    id: 'ch06', num: 6, group: 'planning',
    title: 'Master Budget and Responsibility Accounting',
    desc: '9-step operating budget, cash budget, responsibility centers, Kaizen budgeting.',
    tools: ['Master budget builder', 'Cash budget', 'Responsibility center classifier'],
    href: '/pages/learn/ch06.html',
  },
  {
    id: 'ch10', num: 10, group: 'planning',
    title: 'Determining How Costs Behave',
    desc: 'Cost functions, high-low method, regression analysis, learning curves.',
    tools: ['Cost estimation suite', 'Scatter plot visualizer', 'Learning curve calculator'],
    href: '/pages/learn/ch10.html',
  },

  // Control
  {
    id: 'ch07', num: 7, group: 'control',
    title: 'Flexible Budgets and Direct-Cost Variances',
    desc: 'Static vs. flexible budgets, price and efficiency variances, Level 1–4 hierarchy.',
    tools: ['Variance analysis engine', 'Flexible budget builder', 'Journal entry generator'],
    href: '/pages/learn/ch07.html',
  },
  {
    id: 'ch08', num: 8, group: 'control',
    title: 'Flexible Budgets and Overhead Variances',
    desc: 'Variable and fixed overhead variances, 4-variance analysis, production-volume variance.',
    tools: ['Overhead variance engine', 'Variance diagram', 'ABC overhead extension'],
    href: '/pages/learn/ch08.html',
  },
  {
    id: 'ch09', num: 9, group: 'control',
    title: 'Inventory Costing and Capacity Analysis',
    desc: 'Variable vs. absorption vs. throughput costing, 4 capacity concepts, downward demand spiral.',
    tools: ['Costing method comparator', 'Capacity concepts calculator', 'Producing-for-inventory simulator'],
    href: '/pages/learn/ch09.html',
  },
  {
    id: 'ch20', num: 20, group: 'control',
    title: 'Balanced Scorecard: Quality and Time',
    desc: 'COQ framework, control charts, Pareto diagrams, MCE, average waiting time.',
    tools: ['COQ report builder', 'Control chart visualizer', 'Pareto diagram', 'MCE calculator'],
    href: '/pages/learn/ch20.html',
  },
  {
    id: 'ch21', num: 21, group: 'control',
    title: 'Inventory Management, JIT, and Simplified Costing',
    desc: 'EOQ model, safety stock, JIT purchasing, backflush costing, lean accounting.',
    tools: ['EOQ calculator', 'Safety stock optimizer', 'Backflush costing engine'],
    href: '/pages/learn/ch21.html',
  },

  // Decisions
  {
    id: 'ch11', num: 11, group: 'decisions',
    title: 'Data Analytic Thinking and Prediction',
    desc: 'Decision trees, Gini impurity, ROC curves, confusion matrix, payoff matrix.',
    tools: ['Decision tree builder', 'Gini calculator', 'ROC curve visualizer', 'Confusion matrix'],
    href: '/pages/learn/ch11.html',
  },
  {
    id: 'ch12', num: 12, group: 'decisions',
    title: 'Decision Making and Relevant Information',
    desc: 'Relevant costs, make-or-buy, opportunity costs, TOC, product mix, equipment replacement.',
    tools: ['Relevant cost identifier', 'Make-or-buy calculator', 'TOC bottleneck manager', 'LP visualizer'],
    href: '/pages/learn/ch12.html',
  },
  {
    id: 'ch14', num: 14, group: 'decisions',
    title: 'Pricing Decisions and Cost Management',
    desc: 'Target costing, value engineering, cost-plus pricing, life-cycle budgeting.',
    tools: ['Target costing calculator', 'Value engineering simulator', 'Cost-plus pricing comparison'],
    href: '/pages/learn/ch14.html',
  },
  {
    id: 'ch15', num: 15, group: 'decisions',
    title: 'Cost Allocation and Customer Profitability',
    desc: 'Customer-cost hierarchy, whale curve, sales-mix variance, market-share variance.',
    tools: ['Customer profitability analyzer', 'Whale curve', 'Sales variance calculator'],
    href: '/pages/learn/ch15.html',
  },
  {
    id: 'ch16', num: 16, group: 'decisions',
    title: 'Allocation of Support-Department Costs',
    desc: 'Direct, step-down, and reciprocal allocation methods, Shapley value, revenue allocation.',
    tools: ['Multi-department allocation engine', 'Common cost allocator', 'Revenue allocation tool'],
    href: '/pages/learn/ch16.html',
  },

  // Strategy
  {
    id: 'ch13', num: 13, group: 'strategy',
    title: 'Strategy, Balanced Scorecard, and Strategic Profitability',
    desc: 'Strategy maps, balanced scorecard, growth/price-recovery/productivity decomposition.',
    tools: ['Strategy map builder', 'Balanced scorecard', 'Strategic profitability analyzer'],
    href: '/pages/learn/ch13.html',
  },
  {
    id: 'ch22', num: 22, group: 'strategy',
    title: 'Capital Budgeting and Cost Analysis',
    desc: 'NPV, IRR, payback, AARR, relevant cash flows, income tax effects, inflation.',
    tools: ['Capital budgeting dashboard', 'Relevant cash flow builder', 'Sensitivity analysis'],
    href: '/pages/learn/ch22.html',
  },
  {
    id: 'ch23', num: 23, group: 'strategy',
    title: 'Management Control Systems and Transfer Pricing',
    desc: 'Transfer pricing methods, general guideline, dual pricing, multinational tax minimization.',
    tools: ['Transfer pricing calculator', 'Goal congruence test', 'Multinational tax tool'],
    href: '/pages/learn/ch23.html',
  },
  {
    id: 'ch24', num: 24, group: 'strategy',
    title: 'Performance Measurement and Compensation',
    desc: 'ROI, residual income, EVA, WACC, compensation design, four levers of control.',
    tools: ['Performance dashboard', 'DuPont decomposition', 'WACC calculator', 'Compensation simulator'],
    href: '/pages/learn/ch24.html',
  },
];

const GROUP_IDS = ['foundations', 'costing', 'planning', 'control', 'decisions', 'strategy'];

function init() {
  const progress = getProgress();

  const completed = Object.values(progress.chapters).filter(Boolean).length;
  const total = CHAPTERS.length;
  const pct = Math.round((completed / total) * 100);

  const bar   = document.getElementById('overall-progress-bar');
  const label = document.getElementById('overall-progress-label');
  if (bar)   bar.style.width = `${pct}%`;
  if (label) label.textContent = `${completed} of ${total} chapters completed`;

  GROUP_IDS.forEach(groupId => {
    const container = document.getElementById(`group-${groupId}`);
    if (!container) return;

    const chapters = CHAPTERS.filter(c => c.group === groupId);
    chapters.forEach(ch => {
      const done = progress.chapters[ch.id] === true;
      const card = document.createElement('a');
      card.href = ch.href;
      card.className = `chapter-card${done ? ' chapter-card--complete' : ''}`;
      card.setAttribute('aria-label', `Chapter ${ch.num}: ${ch.title}${done ? ' — completed' : ''}`);
      card.innerHTML = `
        <div class="chapter-card__header">
          <span class="chapter-card__number">Ch. ${ch.num}</span>
          ${done ? '<span class="chapter-card__check" aria-hidden="true">✓</span>' : ''}
        </div>
        <h3 class="chapter-card__title">${ch.title}</h3>
        <p class="chapter-card__desc">${ch.desc}</p>
        <div class="chapter-card__tools">
          ${ch.tools.map(t => `<span class="chapter-card__tool">${t}</span>`).join('')}
        </div>
        <div class="chapter-card__footer">
          <span class="chapter-card__cta">${done ? 'Review →' : 'Start →'}</span>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

init();

// ── View Toggle ───────────────────────────────────────────────

function initViewToggle() {
  const STORAGE_KEY = 'ma-learn-view';
  const groupPanel    = document.getElementById('view-group-panel');
  const sequencePanel = document.getElementById('view-sequence-panel');
  const btnGroup      = document.getElementById('view-group');
  const btnSequence   = document.getElementById('view-sequence');
  if (!groupPanel || !sequencePanel || !btnGroup || !btnSequence) return;

  const progress = getProgress();

  const sequenceContainer = document.getElementById('group-sequence');
  const sorted = [...CHAPTERS].sort((a, b) => a.num - b.num);
  sorted.forEach(ch => {
    const done = progress.chapters[ch.id] === true;
    const card = document.createElement('a');
    card.href = ch.href;
    card.className = `chapter-card${done ? ' chapter-card--complete' : ''}`;
    card.setAttribute('aria-label', `Chapter ${ch.num}: ${ch.title}${done ? ' — completed' : ''}`);
    card.innerHTML = `
      <div class="chapter-card__header">
        <span class="chapter-card__number">Ch. ${ch.num}</span>
        ${done ? '<span class="chapter-card__check" aria-hidden="true">✓</span>' : ''}
      </div>
      <h3 class="chapter-card__title">${ch.title}</h3>
      <p class="chapter-card__desc">${ch.desc}</p>
      <div class="chapter-card__tools">
        ${ch.tools.map(t => `<span class="chapter-card__tool">${t}</span>`).join('')}
      </div>
      <div class="chapter-card__footer">
        <span class="chapter-card__cta">${done ? 'Review →' : 'Start →'}</span>
      </div>
    `;
    sequenceContainer.appendChild(card);
  });

  function setView(view) {
    const isGroup = view === 'group';
    groupPanel.hidden    = !isGroup;
    sequencePanel.hidden =  isGroup;
    btnGroup.classList.toggle('view-toggle__btn--active',    isGroup);
    btnSequence.classList.toggle('view-toggle__btn--active', !isGroup);
    try { localStorage.setItem(STORAGE_KEY, view); } catch {}
  }

  btnGroup.addEventListener('click',    () => setView('group'));
  btnSequence.addEventListener('click', () => setView('sequence'));

  const saved = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
  setView(saved === 'sequence' ? 'sequence' : 'group');
}

initViewToggle();

function initResetAll() {
  const btn = document.getElementById('reset-all-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (confirm('Reset all progress? This will clear completion status for all chapters and scenarios. This cannot be undone.')) {
      resetProgress();
      window.location.reload();
    }
  });
}

initResetAll();
