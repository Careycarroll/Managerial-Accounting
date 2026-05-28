// js/practice/index.js
// Renders the Practice landing page:
//  - Chapter problems grid (Ch. 3 active; others coming soon)
//  - Cross-chapter problems grid (all coming soon for Pass 1)
//
// Each tile links to a chapter practice page if available, or renders as a
// disabled "coming soon" tile if not yet built.

import { initHeader } from '/js/components/header.js';

const BASE = import.meta.env.BASE_URL;

// ============================================================================
// Chapter problems config
// ============================================================================

const CHAPTER_PROBLEMS = [
  {
    chapter: 3,
    title: 'CVP Analysis',
    desc: 'Breakeven, target profit, margin of safety, and price sensitivity.',
    problemCount: 5,
    available: true,
    href: `${BASE}pages/practice/ch03.html`,
  },
  {
    chapter: 7,
    title: 'Direct-Cost Variances',
    desc: 'Price and efficiency variances for direct materials and labor.',
    problemCount: null,
    available: false,
  },
  {
    chapter: 8,
    title: 'Overhead Variances',
    desc: 'Variable and fixed overhead spending, efficiency, and volume variances.',
    problemCount: null,
    available: false,
  },
  {
    chapter: 12,
    title: 'Relevant Costs',
    desc: 'Special orders, make-or-buy, drop/keep, equipment replacement.',
    problemCount: null,
    available: false,
  },
  {
    chapter: 22,
    title: 'Capital Budgeting',
    desc: 'NPV, IRR, payback, and AARR calculations with tax effects.',
    problemCount: null,
    available: false,
  },
];

// ============================================================================
// Cross-chapter problems config
// ============================================================================

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

// ============================================================================
// Rendering
// ============================================================================

function renderChapterTile(p) {
  const minutes = p.problemCount ? `~${p.problemCount * 5} min` : '';
  const meta = p.available
    ? `${p.problemCount} problems · ${minutes}`
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

// ============================================================================
// Bootstrap
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  renderGrid('practice-chapter-grid', CHAPTER_PROBLEMS, renderChapterTile);
  renderGrid('practice-cross-grid', CROSS_CHAPTER_PROBLEMS, renderCrossTile);
});
