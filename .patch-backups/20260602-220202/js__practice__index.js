// js/practice/index.js
// Renders the Practice landing page:
//  - Chapter problems grid (Ch. 3, Ch. 7, Ch. 12 active; others coming soon)
//  - Cross-chapter problems grid (all coming soon for Pass 1)

import { initHeader } from '/js/components/header.js';

const BASE = import.meta.env.BASE_URL;

const CHAPTER_PROBLEMS = [
  {
    chapter: 3,
    title: 'CVP Analysis',
    desc: 'Breakeven, target profit, margin of safety, and price sensitivity.',
    problemCount: 5,
    estimatedMinutes: 5,
    available: true,
    href: `${BASE}pages/practice/ch03.html`,
  },
  {
    chapter: 5,
    title: 'Activity-Based Costing',
    desc: 'Cost driver allocation, ABC vs traditional, cost hierarchy, TDABC, and ABM decisions.',
    problemCount: 5,
    estimatedMinutes: 7,
    available: true,
    href: `${BASE}pages/practice/ch05.html`,
  },
  {
    chapter: 7,
    title: 'Direct-Cost Variances',
    desc: 'Price and efficiency variances for direct materials and labor, with favorable/unfavorable interpretation.',
    problemCount: 5,
    estimatedMinutes: 6,
    available: true,
    href: `${BASE}pages/practice/ch07.html`,
  },
  {
    chapter: 8,
    title: 'Overhead Variances',
    desc: 'Variable and fixed overhead spending, efficiency, and production-volume variances with favorable/unfavorable interpretation.',
    problemCount: 5,
    estimatedMinutes: 7,
    available: true,
    href: `${BASE}pages/practice/ch08.html`,
  },
  {
    chapter: 9,
    title: 'Inventory Costing',
    desc: 'Absorption vs variable costing, inventory build/draw income effects, capacity concepts, and denominator-level choice.',
    problemCount: 5,
    estimatedMinutes: 6,
    available: true,
    href: `${BASE}pages/practice/ch09.html`,
  },
  {
    chapter: 10,
    title: 'Cost Behavior',
    desc: 'High-low method, regression interpretation, learning curves, and cost estimation method selection.',
    problemCount: 5,
    estimatedMinutes: 6,
    available: true,
    href: `${BASE}pages/practice/ch10.html`,
  },
  {
    chapter: 12,
    title: 'Relevant Costs',
    desc: 'Special orders, make-or-buy, drop/keep, equipment replacement, and constrained product mix.',
    problemCount: 5,
    estimatedMinutes: 7,
    available: true,
    href: `${BASE}pages/practice/ch12.html`,
  },
  {
    chapter: 15,
    title: 'Customer Profitability',
    desc: 'Customer-level operating income, ABC cost-to-serve, sales-mix/quantity variances, and drop decisions.',
    problemCount: 5,
    estimatedMinutes: 7,
    available: true,
    href: `${BASE}pages/practice/ch15.html`,
  },
  {
    chapter: 18,
    title: 'Process Costing',
    desc: 'Physical-units flow, equivalent units, cost per EU, FIFO vs weighted-average, and spoilage accounting.',
    problemCount: 5,
    estimatedMinutes: 6,
    available: true,
    href: `${BASE}pages/practice/ch18.html`,
  },
  {
    chapter: 21,
    title: 'Inventory Management',
    desc: 'EOQ, safety stock, reorder point, JIT economics, and backflush costing.',
    problemCount: 5,
    estimatedMinutes: 6,
    available: true,
    href: `${BASE}pages/practice/ch21.html`,
  },
  {
    chapter: 22,
    title: 'Capital Budgeting',
    desc: 'NPV, IRR, payback, and AARR calculations with tax effects and depreciation tax shields.',
    problemCount: 5,
    estimatedMinutes: 7,
    available: true,
    href: `${BASE}pages/practice/ch22.html`,
  },
  {
    chapter: 23,
    title: 'Transfer Pricing',
    desc: 'Market-based, cost-based, and negotiated transfer pricing; general rule; multinational tax strategy.',
    problemCount: 5,
    estimatedMinutes: 7,
    available: true,
    href: `${BASE}pages/practice/ch23.html`,
  },
  {
    chapter: 24,
    title: 'Performance Measurement',
    desc: 'ROI, residual income, EVA, investment-center decisions, and pay-for-performance design.',
    problemCount: 5,
    estimatedMinutes: 7,
    available: true,
    href: `${BASE}pages/practice/ch24.html`,
  },
];

const CROSS_CHAPTER_PROBLEMS = [
  {
    title: 'Profitability Analysis',
    chapters: [3, 12, 15],
    desc: 'Combine CVP, relevant costs, and customer profitability.',
    available: false,
  },
  {
    title: 'Full Variance Analysis',
    chapters: [7, 8],
    desc: 'Direct cost and overhead variances together.',
    available: false,
  },
  {
    title: 'Make or Buy Decision',
    chapters: [12, 5, 10],
    desc: 'Relevant costs combined with ABC and cost behavior.',
    available: false,
  },
  {
    title: 'Capital Investment',
    chapters: [22, 12, 24],
    desc: 'NPV with relevant costs and performance measurement.',
    available: false,
  },
];

function renderChapterTile(p) {
  const minutesPerProblem = p.estimatedMinutes ?? 5;
  const totalMinutes = p.problemCount ? `~${p.problemCount * minutesPerProblem} min` : '';
  const meta = p.available
    ? `${p.problemCount} problems · ${totalMinutes}`
    : 'Coming soon';
  const cta = p.available
    ? `<span class="practice-picker-tile__cta">Start &rarr;</span>`
    : `<span class="practice-picker-tile__cta" style="color:var(--color-gray-400);">Coming soon</span>`;

  const inner = `
    <div class="practice-picker-tile__label">Chapter ${p.chapter}</div>
    <h3 class="practice-picker-tile__title">${p.title}</h3>
    <p class="practice-picker-tile__desc">${p.desc}</p>
    <div class="practice-picker-tile__meta">
      <span class="practice-picker-tile__meta-time">${meta}</span>
      ${cta}
    </div>
  `;

  if (p.available) {
    return `<a href="${p.href}" class="practice-picker-tile" style="text-decoration:none;">${inner}</a>`;
  }
  return `<div class="practice-picker-tile" style="cursor:not-allowed;opacity:0.55;">${inner}</div>`;
}

function renderCrossTile(p) {
  const chapterLabel = `Ch. ${p.chapters.join(' + Ch. ')}`;
  const cta = p.available
    ? `<span class="practice-picker-tile__cta">Start &rarr;</span>`
    : `<span class="practice-picker-tile__cta" style="color:var(--color-gray-400);">Coming soon</span>`;

  const inner = `
    <div class="practice-picker-tile__label">Cross-Chapter</div>
    <h3 class="practice-picker-tile__title">${p.title}</h3>
    <p class="practice-picker-tile__desc">${p.desc}</p>
    <div class="practice-picker-tile__meta">
      <span class="practice-picker-tile__meta-time">${chapterLabel}</span>
      ${cta}
    </div>
  `;

  if (p.available) {
    return `<a href="${p.href}" class="practice-picker-tile" style="text-decoration:none;">${inner}</a>`;
  }
  return `<div class="practice-picker-tile" style="cursor:not-allowed;opacity:0.55;">${inner}</div>`;
}

function renderGrid(targetId, items, renderer) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = items.map(renderer).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  renderGrid('practice-chapter-grid', CHAPTER_PROBLEMS, renderChapterTile);
  renderGrid('practice-cross-grid', CROSS_CHAPTER_PROBLEMS, renderCrossTile);
});
