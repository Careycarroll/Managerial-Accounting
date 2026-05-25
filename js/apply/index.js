import { initHeader } from '/js/components/header.js';

const SCENARIOS = [
  {
    id: 'breakeven',
    title: 'Will we break even? Make a profit?',
    desc: 'Set price, estimate costs, and find out how many units you need to sell to cover costs and hit your profit target.',
    chapters: [3, 9, 12],
    chapterLabels: ['Ch. 3 CVP', 'Ch. 9 Inventory', 'Ch. 12 Relevant Costs'],
    href: '/pages/apply/breakeven.html',
    status: 'available',
    depths: { concept: true, analysis: false, simulation: false }
  },
  {
    id: 'product-cost',
    title: 'What does it cost to make this?',
    desc: 'Trace direct materials, direct labor, and overhead to a product using job costing or ABC.',
    chapters: [2, 4, 5, 18],
    chapterLabels: ['Ch. 2 Cost Terms', 'Ch. 4 Job Costing', 'Ch. 5 ABC', 'Ch. 18 Process'],
    href: '/pages/apply/product-cost.html',
    status: 'available',
    depths: { concept: true, analysis: true, simulation: false }
  },
  {
    id: 'annual-plan',
    title: "What's our plan for the year?",
    desc: 'Build an operating budget, set targets, and see how sensitive your plan is to key assumptions.',
    chapters: [6, 10],
    chapterLabels: ['Ch. 6 Master Budget', 'Ch. 10 Cost Behavior'],
    href: '/pages/apply/annual-plan.html',
    status: 'available',
    depths: { concept: true, analysis: true, simulation: false }
  },
  {
    id: 'variance',
    title: 'Did we hit our plan?',
    desc: 'Compare actual results to budget using flexible budget variances for direct costs and overhead.',
    chapters: [7, 8],
    chapterLabels: ['Ch. 7 Direct Variances', 'Ch. 8 Overhead Variances'],
    href: '/pages/apply/variance.html',
    status: 'available',
    depths: { concept: true, analysis: true, simulation: false }
  },
  {
    id: 'make-or-buy',
    title: 'Should we make it or buy it?',
    desc: 'Evaluate insourcing versus outsourcing with relevant costs, opportunity costs, and qualitative factors.',
    chapters: [12, 5, 10, 23],
    chapterLabels: ['Ch. 12 Relevant Costs', 'Ch. 5 ABC', 'Ch. 10 Cost Behavior', 'Ch. 23 Transfer Pricing'],
    href: '/pages/apply/make-or-buy.html',
    status: 'coming-soon',
    depths: { concept: false, analysis: false, simulation: false }
  },
  {
    id: 'pricing',
    title: 'What should we charge?',
    desc: 'Set prices using cost-plus, target costing, and market-based approaches. Find the price that hits your margin target.',
    chapters: [14, 12, 3],
    chapterLabels: ['Ch. 14 Pricing', 'Ch. 12 Relevant Costs', 'Ch. 3 CVP'],
    href: '/pages/apply/pricing.html',
    status: 'coming-soon',
    depths: { concept: false, analysis: false, simulation: false }
  },
  {
    id: 'customer-profit',
    title: 'Which customers are profitable?',
    desc: 'Build a customer profitability report and identify which customers to grow, manage, or exit.',
    chapters: [15, 16, 5],
    chapterLabels: ['Ch. 15 Customer Profit', 'Ch. 16 Allocation', 'Ch. 5 ABC'],
    href: '/pages/apply/customer-profit.html',
    status: 'coming-soon',
    depths: { concept: false, analysis: false, simulation: false }
  },
  {
    id: 'inventory',
    title: 'Are we managing inventory well?',
    desc: 'Calculate EOQ, set reorder points, and evaluate whether JIT makes sense for your operation.',
    chapters: [21, 9, 12],
    chapterLabels: ['Ch. 21 Inventory Mgmt', 'Ch. 9 Inventory Costing', 'Ch. 12 Relevant Costs'],
    href: '/pages/apply/inventory.html',
    status: 'coming-soon',
    depths: { concept: false, analysis: false, simulation: false }
  },
  {
    id: 'investment',
    title: 'Is this investment worth it?',
    desc: 'Evaluate a capital project using NPV, IRR, payback, and AARR with full tax effects.',
    chapters: [22, 12, 24],
    chapterLabels: ['Ch. 22 Capital Budgeting', 'Ch. 12 Relevant Costs', 'Ch. 24 Performance'],
    href: '/pages/apply/investment.html',
    status: 'coming-soon',
    depths: { concept: false, analysis: false, simulation: false }
  },
  {
    id: 'performance',
    title: 'How are we measuring performance?',
    desc: 'Evaluate divisions using ROI, residual income, and EVA. Design a compensation system that aligns incentives.',
    chapters: [24, 23, 13],
    chapterLabels: ['Ch. 24 Performance', 'Ch. 23 Transfer Pricing', 'Ch. 13 Strategy'],
    href: '/pages/apply/performance.html',
    status: 'coming-soon',
    depths: { concept: false, analysis: false, simulation: false }
  },
  {
    id: 'cost-behavior',
    title: 'What do our costs tell us?',
    desc: 'Estimate cost functions using regression and high-low, then use predictions to support decisions.',
    chapters: [10, 11],
    chapterLabels: ['Ch. 10 Cost Behavior', 'Ch. 11 Data Analytics'],
    href: '/pages/apply/cost-behavior.html',
    status: 'coming-soon',
    depths: { concept: false, analysis: false, simulation: false }
  },
  {
    id: 'quality',
    title: 'Are we producing quality?',
    desc: 'Build a cost-of-quality report, identify the vital few defects, and evaluate quality improvement investments.',
    chapters: [20, 19, 12],
    chapterLabels: ['Ch. 20 Quality', 'Ch. 19 Spoilage', 'Ch. 12 Relevant Costs'],
    href: '/pages/apply/quality.html',
    status: 'coming-soon',
    depths: { concept: false, analysis: false, simulation: false }
  }
];

function depthBadge(label, color, active) {
  return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:9999px;'
    + (active
        ? 'background:var(--color-' + color + ');color:#fff;'
        : 'background:var(--color-gray-100);color:var(--color-gray-400);')
    + '">'
    + '<span style="width:6px;height:6px;border-radius:50%;background:' + (active ? '#fff' : 'var(--color-gray-300)') + ';display:inline-block;"></span>'
    + label + '</span>';
}

function renderScenarios() {
  const grid = document.getElementById('apply-grid');
  if (!grid) return;

  grid.innerHTML = SCENARIOS.map(s => {
    const available = s.status === 'available';
    const chapterBadges = s.chapterLabels.map(l =>
      '<span style="font-size:0.65rem;font-weight:500;padding:2px 8px;background:var(--color-gray-100);color:var(--color-text-muted);border-radius:9999px;white-space:nowrap;">' + l + '</span>'
    ).join('');

    return '<div class="chapter-card" style="' + (available ? 'cursor:pointer;' : 'opacity:0.6;cursor:default;') + '" '
      + (available ? 'onclick="window.location.href=\'' + s.href + '\'"' : '') + '>'
      + '<div class="chapter-card__header">'
      + '<span class="chapter-card__number">Scenario</span>'
      + (available ? '<span style="font-size:0.65rem;font-weight:700;color:var(--color-success);background:var(--color-success-bg,#f0fdf4);padding:2px 8px;border-radius:9999px;">Available</span>'
          : '<span style="font-size:0.65rem;font-weight:700;color:var(--color-gray-400);background:var(--color-gray-100);padding:2px 8px;border-radius:9999px;">Coming Soon</span>')
      + '</div>'
      + '<div class="chapter-card__title">' + s.title + '</div>'
      + '<div class="chapter-card__desc">' + s.desc + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-3);">' + chapterBadges + '</div>'
      + '<div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);">'
      + depthBadge('Concept', 'concept', s.depths.concept)
      + depthBadge('Analysis', 'analysis', s.depths.analysis)
      + depthBadge('Simulation', 'simulation', s.depths.simulation)
      + '</div>'
      + '<div class="chapter-card__footer">'
      + (available ? '<span class="chapter-card__cta">Start &rarr;</span>' : '<span style="font-size:var(--font-size-xs);color:var(--color-gray-400);">Not yet available</span>')
      + '</div>'
      + '</div>';
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  renderScenarios();
});