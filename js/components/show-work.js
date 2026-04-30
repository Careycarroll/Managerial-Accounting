/**
 * show-work.js — Shared step-by-step calculation renderer
 *
 * Usage:
 *   renderShowWork(containerEl, steps, options)
 *
 * steps: Array of step objects:
 *   {
 *     step:    number  — step number (auto-assigned if omitted)
 *     label:   string  — plain-English description of what is being calculated
 *     formula: string  — symbolic formula  e.g. 'BEP = Fixed Costs ÷ CM/unit'
 *     values:  string  — substituted values e.g. '$2,000 ÷ $80'
 *     result:  string  — final result       e.g. '25 units'
 *     note:    string? — optional explanatory note shown below the result
 *     highlight: bool? — true to visually emphasize this step (final answer, key insight)
 *   }
 *
 * options:
 *   title:       string  — panel title (default 'Show Work')
 *   defaultOpen: bool    — start expanded (default false)
 *   id:          string  — unique id for the toggle (auto-generated if omitted)
 */

let _idCounter = 0;

export function renderShowWork(containerEl, steps, options = {}) {
  if (!containerEl || !steps || steps.length === 0) return;

  const title       = options.title       || 'Show Work';
  const defaultOpen = options.defaultOpen || false;
  const id          = options.id          || `show-work-${++_idCounter}`;

  const numberedSteps = steps.map((s, i) => ({ ...s, step: s.step ?? i + 1 }));

  const stepsHTML = numberedSteps.map(s => `
    <div class="sw-step${s.highlight ? ' sw-step--highlight' : ''}">
      <div class="sw-step__number">Step ${s.step}</div>
      <div class="sw-step__content">
        <div class="sw-step__label">${s.label}</div>
        <div class="sw-step__math">
          <div class="sw-step__row">
            <span class="sw-step__row-label">Formula</span>
            <span class="sw-step__formula">${s.formula}</span>
          </div>
          <div class="sw-step__row">
            <span class="sw-step__row-label">Values</span>
            <span class="sw-step__values">${s.values}</span>
          </div>
          <div class="sw-step__row sw-step__row--result">
            <span class="sw-step__row-label">Result</span>
            <span class="sw-step__result">${s.result}</span>
          </div>
          ${s.note ? `<div class="sw-step__note">${s.note}</div>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  const html = `
    <div class="sw-panel" id="${id}">
      <button class="sw-toggle" aria-expanded="${defaultOpen}" aria-controls="${id}-body"
              id="${id}-toggle" type="button">
        <span class="sw-toggle__icon">📐</span>
        <span class="sw-toggle__label">${title}</span>
        <span class="sw-toggle__chevron">${defaultOpen ? '▲' : '▼'}</span>
      </button>
      <div class="sw-body${defaultOpen ? ' sw-body--open' : ''}" id="${id}-body" role="region">
        <div class="sw-steps">
          ${stepsHTML}
        </div>
      </div>
    </div>
  `;

  containerEl.innerHTML = html;

  const toggle = containerEl.querySelector(`#${id}-toggle`);
  const body   = containerEl.querySelector(`#${id}-body`);
  const chevron= containerEl.querySelector('.sw-toggle__chevron');

  toggle.addEventListener('click', () => {
    const open = body.classList.toggle('sw-body--open');
    toggle.setAttribute('aria-expanded', open);
    chevron.textContent = open ? '▲' : '▼';
  });
}
