import { initHeader } from '/js/components/header.js';
import { TERMS, CHAPTERS } from '/js/data/managerial-terms.js';

const CHAPTER_TITLES = {
  1: 'Ch. 1 — The Manager',
  2: 'Ch. 2 — Cost Terms',
  3: 'Ch. 3 — CVP Analysis',
  4: 'Ch. 4 — Job Costing',
  5: 'Ch. 5 — ABC',
  6: 'Ch. 6 — Master Budget',
  7: 'Ch. 7 — Flexible Budgets',
  8: 'Ch. 8 — Overhead Variances',
  9: 'Ch. 9 — Inventory Costing',
  10: 'Ch. 10 — Cost Behavior',
  11: 'Ch. 11 — Data Analytics',
  12: 'Ch. 12 — Relevant Costs',
  13: 'Ch. 13 — Strategy',
  14: 'Ch. 14 — Pricing',
  15: 'Ch. 15 — Customer Profitability',
  16: 'Ch. 16 — Support Dept Allocation',
  17: 'Ch. 17 — Joint Products',
  18: 'Ch. 18 — Process Costing',
  19: 'Ch. 19 — Spoilage',
  20: 'Ch. 20 — Quality and Time',
  21: 'Ch. 21 — Inventory Mgmt',
  22: 'Ch. 22 — Capital Budgeting',
  23: 'Ch. 23 — Transfer Pricing',
  24: 'Ch. 24 — Performance'
};

let activeChapter = null;
let searchQuery = '';

function getFiltered() {
  return TERMS.filter(t => {
    const matchChapter = activeChapter === null || t.chapter === activeChapter;
    const q = searchQuery.toLowerCase();
    const matchSearch = q === '' ||
      t.term.toLowerCase().includes(q) ||
      t.definition.toLowerCase().includes(q);
    return matchChapter && matchSearch;
  });
}

function renderGrid() {
  const grid = document.getElementById('glossary-grid');
  const empty = document.getElementById('glossary-empty');
  const count = document.getElementById('glossary-count');
  if (!grid) return;

  const filtered = getFiltered();
  count.textContent = filtered.length + ' of ' + TERMS.length + ' terms';

  if (filtered.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  grid.style.display = '';
  empty.style.display = 'none';

  grid.innerHTML = filtered.map(t => {
    const chLabel = CHAPTER_TITLES[t.chapter] || 'Ch. ' + t.chapter;
    return '<div class="key-term" role="button" tabindex="0" aria-expanded="false">'
      + '<div class="key-term__word">' + t.term
      + '<span style="font-size:var(--font-size-xs);font-weight:400;color:var(--color-gray-500);margin-left:var(--space-2);">' + chLabel + '</span>'
      + '</div>'
      + '<p class="key-term__definition">' + t.definition + '</p>'
      + '</div>';
  }).join('');

  grid.querySelectorAll('.key-term').forEach(div => {
    div.addEventListener('click', () => {
      const open = div.classList.toggle('key-term--open');
      div.setAttribute('aria-expanded', open);
    });
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); }
    });
  });
}

function renderFilters() {
  const container = document.getElementById('glossary-chapter-filters');
  if (!container) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'btn btn--sm ' + (activeChapter === null ? 'btn--primary' : 'btn--secondary');
  allBtn.textContent = 'All Chapters';
  allBtn.addEventListener('click', () => { activeChapter = null; renderFilters(); renderGrid(); });
  container.innerHTML = '';
  container.appendChild(allBtn);

  CHAPTERS.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'btn btn--sm ' + (activeChapter === ch ? 'btn--primary' : 'btn--secondary');
    btn.textContent = 'Ch. ' + ch;
    btn.title = CHAPTER_TITLES[ch] || '';
    btn.addEventListener('click', () => {
      activeChapter = activeChapter === ch ? null : ch;
      renderFilters();
      renderGrid();
    });
    container.appendChild(btn);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHeader();

  renderFilters();
  renderGrid();

  const search = document.getElementById('glossary-search');
  if (search) {
    search.addEventListener('input', () => {
      searchQuery = search.value;
      renderGrid();
    });
  }

  const clear = document.getElementById('glossary-clear');
  if (clear) {
    clear.addEventListener('click', () => {
      searchQuery = '';
      activeChapter = null;
      if (search) search.value = '';
      renderFilters();
      renderGrid();
    });
  }

  const emptyClear = document.getElementById('glossary-empty-clear');
  if (emptyClear) {
    emptyClear.addEventListener('click', () => {
      searchQuery = '';
      activeChapter = null;
      if (search) search.value = '';
      renderFilters();
      renderGrid();
    });
  }
});