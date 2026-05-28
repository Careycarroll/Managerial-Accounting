// js/practice/practice-engine.js
// Practice Engine v2 — randomized multi-step calculation problems.
// See SPEC.md (co-located) for the authoritative contract.
//
// v2 changes from v1:
//  - Show-work renders persistently on submitted steps (not just active)
//  - Show Solution button available on any submitted step, past or current
//  - Final step submission renders step + "See Summary" button (no auto-advance)
//  - Summary screen includes collapsible <details> per-step show-work

import { renderShowWork } from '/js/components/show-work.js';

// ============================================================================
// Section 1 — Exported helper utilities
// ============================================================================

export function randomInRange(min, max, step = 1) {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
}

export function roundTo(value, decimals = 0) {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

export function roundToNearest(value, nearest) {
  return Math.round(value / nearest) * nearest;
}

export function ensureGreaterThan(value, floor, minDelta = 1) {
  return value > floor + minDelta ? value : floor + minDelta;
}

export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Section 2 — Tolerance system
// ============================================================================

const TOLERANCE_TIER_DEFAULTS = {
  'money-small':  { value: 1,    type: 'absolute' },
  'money-medium': { value: 1,    type: 'percent'  },
  'money-large':  { value: 0.5,  type: 'percent'  },
  'units':        { value: 1,    type: 'absolute' },
  'percent':      { value: 0.5,  type: 'absolute' },
  'years':        { value: 0.1,  type: 'absolute' },
};

function resolveTolerance(step, correctValue) {
  if (step.tolerance) return step.tolerance;
  const tier = TOLERANCE_TIER_DEFAULTS[step.resultType];
  if (!tier) return { value: 1, type: 'absolute' };
  if (step.resultType === 'units' && Math.abs(correctValue) >= 1000) {
    return { value: 0.5, type: 'percent' };
  }
  return tier;
}

function evaluateAnswer(studentValue, correctValue, tol) {
  const diff = Math.abs(studentValue - correctValue);
  if (tol.type === 'absolute') {
    return { correct: diff <= tol.value, deviation: diff };
  }
  const denom = Math.abs(correctValue) || 1;
  const pctDiff = (diff / denom) * 100;
  return { correct: pctDiff <= tol.value, deviation: pctDiff };
}

// ============================================================================
// Section 3 — Formatters
// ============================================================================

function formatStudentAnswer(value, resultType) {
  if (value === null || value === undefined) return '—';
  switch (resultType) {
    case 'money-small':
    case 'money-medium':
    case 'money-large':
      return '$' + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
    case 'units':
      return Number(value).toLocaleString() + ' units';
    case 'percent':
      return Number(value).toFixed(1) + '%';
    case 'years':
      return Number(value).toFixed(1) + ' years';
    default:
      return String(value);
  }
}

// ============================================================================
// Section 4 — PracticeEngine class
// ============================================================================

export class PracticeEngine {
  constructor() {
    this.problem = null;
    this.container = null;
    this.state = null;
  }

  init(problem, container, options = {}) {
    this.problem = problem;
    this.container = container;
    this.state = this._initialState(options);
    this._render();
  }

  reset() {
    this.state = this._initialState({});
    this._render();
  }

  _initialState({ seed }) {
    let data;
    if (seed !== undefined) {
      const prng = mulberry32(seed);
      const original = Math.random;
      Math.random = prng;
      data = this.problem.randomize();
      Math.random = original;
    } else {
      data = this.problem.randomize();
    }
    return this._buildInitial(data);
  }

  _buildInitial(data) {
    return {
      data,
      activeStepIndex: 0,
      studentAnswers: {},
      correctValues: {},
      stepResults: {},
      solutionViewed: {},
      finalSubmitted: false,
      complete: false,
    };
  }

  // --------------------------------------------------------------------------
  // Rendering
  // --------------------------------------------------------------------------

  _render() {
    if (this.state.complete) {
      this._renderSummary();
      return;
    }
    this.container.innerHTML = '';
    this.container.appendChild(this._buildProblemHeader());
    this.container.appendChild(this._buildGivenPanel());
    const stepList = document.createElement('div');
    stepList.className = 'practice-step-list';
    stepList.style.cssText = 'display:flex;flex-direction:column;gap:var(--space-4);margin-top:var(--space-5);';
    this.problem.steps.forEach((step, idx) => {
      stepList.appendChild(this._buildStepCard(step, idx));
    });
    this.container.appendChild(stepList);

    // If all steps submitted, render See Summary button at end
    if (this.state.finalSubmitted) {
      this.container.appendChild(this._buildSeeSummaryButton());
    }
  }

  _buildProblemHeader() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:var(--space-4);';
    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
        <h3 style="margin:0;color:var(--color-primary-text);">${this.problem.title}</h3>
        <button id="practice-back-btn" style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);background:var(--color-gray-100);color:var(--color-primary-text);font-size:var(--font-size-xs);font-weight:700;border:1px solid var(--color-gray-200);cursor:pointer;">&larr; Back to problems</button>
      </div>
      <div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Estimated: ${this.problem.estimatedMinutes || 5} min · ${this.problem.steps.length} steps</div>
    `;
    wrap.querySelector('#practice-back-btn').addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('practice:back-to-picker', { bubbles: true }));
    });
    return wrap;
  }

  _buildGivenPanel() {
    const rows = this.problem.given(this.state.data);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:var(--color-info-bg);border:1px solid var(--color-info);border-radius:var(--radius-md);padding:var(--space-4);';
    wrap.innerHTML = `
      <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Given Information</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3);">
        ${rows.map(r => `
          <div>
            <div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">${r.label}</div>
            <div style="font-size:var(--font-size-base);font-weight:700;color:var(--color-primary-text);">${r.value}</div>
          </div>
        `).join('')}
      </div>
    `;
    return wrap;
  }

  _buildStepCard(step, idx) {
    const isSubmitted = this.state.stepResults[step.id] !== undefined;
    const isActive    = idx === this.state.activeStepIndex && !isSubmitted;
    const isLocked    = idx > this.state.activeStepIndex && !isSubmitted;

    const card = document.createElement('div');
    let cardClass = 'practice-step-card';
    if (isLocked) cardClass += ' practice-step-card--locked';
    else if (isActive) cardClass += ' practice-step-card--active';
    else if (isSubmitted) {
      cardClass += this.state.stepResults[step.id].correct
        ? ' practice-step-card--submitted-correct'
        : ' practice-step-card--submitted-incorrect';
    }
    card.className = cardClass;
    card.dataset.stepId = step.id;

    // --- Header row ---
    const headerHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <span style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);">Step ${idx + 1}</span>
          ${isSubmitted ? (this.state.stepResults[step.id].correct
              ? '<span style="font-size:var(--font-size-sm);font-weight:700;color:var(--color-success);">✓ Correct</span>'
              : '<span style="font-size:var(--font-size-sm);font-weight:700;color:var(--color-danger);">✗ Incorrect</span>') : ''}
        </div>
        ${isLocked ? '<span style="font-size:var(--font-size-xs);color:var(--color-gray-400);">🔒 Locked</span>' : ''}
      </div>
    `;

    const questionHtml = `
      <div style="font-size:var(--font-size-base);font-weight:600;color:var(--color-primary-text);margin-bottom:var(--space-3);">
        ${step.question}
      </div>
    `;

    // --- Body (input or submitted result) ---
    let bodyHtml = '';
    if (isSubmitted) {
      const result = this.state.stepResults[step.id];
      const studentVal = this.state.studentAnswers[step.id];
      const correctVal = this.state.correctValues[step.id];
      bodyHtml = `
        <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--color-card-bg);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);margin-bottom:var(--space-3);">
          <span style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Your answer:</span>
          <span style="font-weight:700;color:var(--color-primary-text);">${formatStudentAnswer(studentVal, step.resultType)}</span>
          ${result.correct
            ? `<span style="margin-left:auto;font-size:var(--font-size-xs);color:var(--color-success);">within tolerance</span>`
            : `<span style="margin-left:auto;font-size:var(--font-size-xs);color:var(--color-danger);">Incorrect</span>`}
        </div>
      `;
    } else if (isActive) {
      bodyHtml = `
        <div style="display:flex;gap:var(--space-3);align-items:center;margin-bottom:var(--space-3);">
          <input
            type="number"
            id="practice-input-${step.id}"
            step="any"
            placeholder="Your answer"
            style="flex:1;padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);border:2px solid var(--color-gray-200);background:var(--color-card-bg);color:var(--color-primary-text);font-size:var(--font-size-base);transition:border-color 0.15s;"
          />
          <span style="font-size:var(--font-size-sm);color:var(--color-gray-500);min-width:90px;">${step.unit || ''}</span>
          <button
            id="practice-submit-${step.id}"
            disabled
            style="padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);background:var(--color-accent);color:#fff;font-weight:700;font-size:var(--font-size-sm);border:none;cursor:pointer;opacity:0.4;transition:opacity 0.15s;"
          >Submit &rarr;</button>
        </div>
      `;
    } else {
      // Locked future step — show question text dim, no input
      bodyHtml = `
        <div style="font-size:var(--font-size-xs);color:var(--color-gray-400);font-style:italic;">
          Submit step ${this.state.activeStepIndex + 1} to unlock.
        </div>
      `;
    }

    // --- Show solution button + show-work panel ---
    let workHtml = '';
    if (isSubmitted) {
      const viewed = this.state.solutionViewed[step.id];
      if (!viewed) {
        workHtml = `
          <button
            class="practice-show-solution-btn"
            data-step-id="${step.id}"
            style="padding:var(--space-2) var(--space-4);border-radius:var(--radius-md);background:var(--color-gray-100);color:var(--color-primary-text);font-weight:700;font-size:var(--font-size-xs);border:1px solid var(--color-gray-200);cursor:pointer;margin-bottom:var(--space-3);"
          >Show Solution</button>
          <div class="practice-show-work-mount" data-step-id="${step.id}"></div>
        `;
      } else {
        workHtml = `
          <div style="font-size:var(--font-size-xs);color:var(--color-gray-500);font-style:italic;margin-bottom:var(--space-2);">Solution shown</div>
          <div class="practice-show-work-mount" data-step-id="${step.id}"></div>
        `;
      }
    }

    card.style.cssText = `
      border:1px solid var(--color-gray-200);
      border-radius:var(--radius-md);
      padding:var(--space-4) var(--space-5);
      background:var(--color-card-bg);
      ${isLocked ? 'opacity:0.5;background:var(--color-gray-50);' : ''}
      ${isActive ? 'border-color:var(--color-accent);box-shadow:0 0 0 3px rgba(212,165,89,0.15);' : ''}
      ${isSubmitted && this.state.stepResults[step.id].correct ? 'border-color:var(--color-success);background:var(--color-success-bg);' : ''}
      ${isSubmitted && !this.state.stepResults[step.id].correct ? 'border-color:var(--color-danger);background:var(--color-danger-bg);' : ''}
    `;

    card.innerHTML = headerHtml + questionHtml + bodyHtml + workHtml;

    // --- Wire up active step input ---
    if (isActive) {
      const input  = card.querySelector(`#practice-input-${step.id}`);
      const submit = card.querySelector(`#practice-submit-${step.id}`);
      input.addEventListener('input', () => {
        const ok = input.value !== '' && !isNaN(parseFloat(input.value));
        submit.disabled = !ok;
        submit.style.opacity = ok ? '1' : '0.4';
      });
      input.addEventListener('focus', () => { input.style.borderColor = 'var(--color-accent)'; });
      input.addEventListener('blur',  () => { input.style.borderColor = 'var(--color-gray-200)'; });
      submit.addEventListener('click', () => {
        const val = parseFloat(input.value);
        if (!isNaN(val)) this._handleSubmit(step, val);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !submit.disabled) submit.click();
      });
    }

    // --- Wire up Show Solution button ---
    const showBtn = card.querySelector('.practice-show-solution-btn');
    if (showBtn) {
      showBtn.addEventListener('click', () => {
        this._handleShowSolution(step.id);
      });
    }

    // --- If solution already viewed, mount the show-work panel ---
    if (isSubmitted && this.state.solutionViewed[step.id]) {
      const mount = card.querySelector('.practice-show-work-mount');
      this._mountShowWork(mount, step);
    }

    return card;
  }

  _buildSeeSummaryButton() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;justify-content:center;margin-top:var(--space-5);';
    wrap.innerHTML = `
      <button id="practice-see-summary-btn" style="padding:var(--space-3) var(--space-8);border-radius:var(--radius-md);background:var(--color-accent);color:#fff;font-weight:700;font-size:var(--font-size-sm);border:none;cursor:pointer;">See Summary &rarr;</button>
    `;
    wrap.querySelector('#practice-see-summary-btn').addEventListener('click', () => {
      this.state.complete = true;
      this._render();
    });
    return wrap;
  }

  // --------------------------------------------------------------------------
  // Submission
  // --------------------------------------------------------------------------

  _handleSubmit(step, studentValue) {
    // 1. Compute correct value via step.solve()
    const correctValue = step.solve(this.state.data, this.state.correctValues);

    // 2. Tolerance check
    const tol = resolveTolerance(step, correctValue);
    const { correct, deviation } = evaluateAnswer(studentValue, correctValue, tol);

    // 3. Store in state
    this.state.studentAnswers[step.id] = studentValue;
    this.state.correctValues[step.id]  = correctValue;
    this.state.stepResults[step.id]    = { correct, deviation };

    // 4. Determine if final step
    const stepIdx = this.problem.steps.findIndex(s => s.id === step.id);
    const isFinalStep = stepIdx === this.problem.steps.length - 1;

    if (isFinalStep) {
      this.state.finalSubmitted = true;
      // Do NOT auto-complete -- render step + See Summary button
    } else {
      // Advance active step
      this.state.activeStepIndex = stepIdx + 1;
    }

    this._render();

    // Scroll into view: for non-final steps, scroll to newly active step;
    // for final step, scroll to See Summary button.
    setTimeout(() => {
      if (isFinalStep) {
        const btn = this.container.querySelector('#practice-see-summary-btn');
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const next = this.problem.steps[stepIdx + 1];
        if (next) {
          const nextCard = this.container.querySelector(`[data-step-id="${next.id}"]`);
          if (nextCard) nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 50);
  }

  // --------------------------------------------------------------------------
  // Show solution
  // --------------------------------------------------------------------------

  _handleShowSolution(stepId) {
    this.state.solutionViewed[stepId] = true;
    this._render();
  }

  _mountShowWork(mountEl, step) {
    if (!mountEl) return;
    const data = this.state.data;
    const prior = this.state.correctValues;
    const studentAnswers = this.state.studentAnswers;
    const correctValue = this.state.correctValues[step.id];

    const workSteps = step.showWork(data, prior, studentAnswers, correctValue);
    renderShowWork(mountEl, workSteps, {
      title: 'Solution',
      defaultOpen: true,
    });
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------

  _renderSummary() {
    this.container.innerHTML = '';
    const summary = document.createElement('div');
    summary.className = 'practice-summary';

    const correctCount = Object.values(this.state.stepResults).filter(r => r.correct).length;
    const total = this.problem.steps.length;

    summary.innerHTML = `
      <div class="practice-summary__header">
        <div class="practice-summary__count">${correctCount} of ${total} correct</div>
        <div class="practice-summary__label">Problem Complete</div>
      </div>

      <div class="practice-summary__steps-list">
        ${this.problem.steps.map((step, idx) => {
          const r = this.state.stepResults[step.id];
          const correct = r && r.correct;
          const studentVal = this.state.studentAnswers[step.id];
          const correctVal = this.state.correctValues[step.id];
          const viewed = this.state.solutionViewed[step.id];
          return `
            <div class="practice-summary__step-row practice-summary__step-row--${correct ? 'correct' : 'incorrect'}">
              <div class="practice-summary__step-marker">${correct ? '✓' : '✗'}</div>
              <div class="practice-summary__step-content">
                <div class="practice-summary__step-question">Step ${idx + 1}: ${step.question}</div>
                <div class="practice-summary__step-answer">
                  Your answer: <strong>${formatStudentAnswer(studentVal, step.resultType)}</strong>
                  ${!correct ? ` · Correct: <strong>${formatStudentAnswer(correctVal, step.resultType)}</strong>` : ''}
                </div>
                ${viewed ? `<div class="practice-summary__step-flag">Solution viewed during problem</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="practice-summary__actions">
        <button class="practice-summary__btn practice-summary__btn--primary" id="practice-try-again-btn">&#8635; Try Again</button>
        <button class="practice-summary__btn practice-summary__btn--secondary" id="practice-try-different-btn">Try Different Problem</button>
      </div>

      ${(this.problem.reviewChapters && this.problem.reviewChapters.length > 0) ? `
        <div class="practice-summary__review-section">
          <div class="practice-summary__review-label">Review Related Chapters</div>
          <div class="practice-summary__review-links">
            ${this.problem.reviewChapters.map(c => `
              <a href="${c.href}" class="practice-summary__review-link">${c.label} &rarr;</a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="practice-summary__solutions-section" style="margin-top:var(--space-6);padding-top:var(--space-5);border-top:1px solid var(--color-gray-200);">
        <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);letter-spacing:0.05em;">Solutions (click to expand)</div>
        ${this.problem.steps.map((step, idx) => `
          <details style="margin-bottom:var(--space-3);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);background:var(--color-card-bg);">
            <summary style="cursor:pointer;padding:var(--space-3) var(--space-4);font-size:var(--font-size-sm);font-weight:600;color:var(--color-primary-text);user-select:none;">
              Step ${idx + 1}: ${step.question}
            </summary>
            <div class="practice-summary__solution-mount" data-step-id="${step.id}" style="padding:0 var(--space-4) var(--space-4);"></div>
          </details>
        `).join('')}
      </div>
    `;

    this.container.appendChild(summary);

    // Mount show-work into each <details> panel
    this.problem.steps.forEach((step) => {
      const mount = this.container.querySelector(`.practice-summary__solution-mount[data-step-id="${step.id}"]`);
      if (mount) {
        this._mountShowWork(mount, step);
      }
    });

    // Wire summary actions
    this.container.querySelector('#practice-try-again-btn').addEventListener('click', () => {
      this.reset();
    });
    this.container.querySelector('#practice-try-different-btn').addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('practice:back-to-picker', { bubbles: true }));
    });
  }
}
