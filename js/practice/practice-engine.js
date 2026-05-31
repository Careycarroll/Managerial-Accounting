// js/practice/practice-engine.js
// Practice Engine v3 — Pass 2 spec compliant.
// See SPEC.md (co-located) for the authoritative contract.
//
// v3 changes from v2:
//  - Optional scenario(data) card renders above given panel
//  - Step type discriminator: 'numeric' (default) or 'choice'
//  - Choice steps: radio-button options, exact-id grading via step.correctId()
//  - studentAnswers / correctValues store strings for choice, numbers for numeric
//  - Summary, show-work, and submission flow handle both step types
//  - Pass 1 problems (Ch. 3) validate and behave identically — no migration needed

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
// Section 2 — Tolerance system (numeric steps only)
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
// Section 3 — Step-type helpers
// ============================================================================

function getStepType(step) {
  return step.type === 'choice' ? 'choice' : 'numeric';
}

// ============================================================================
// Section 4 — Formatters
// ============================================================================

function formatNumericAnswer(value, resultType) {
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
// Section 5 — PracticeEngine class
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
      shuffledOptions: {},
      finalSubmitted: false,
      complete: false,
    };
  }

  // --------------------------------------------------------------------------
  // Helpers for choice steps
  // --------------------------------------------------------------------------

  _getOptionsForStep(step) {
    // Pass 2: shuffle option order at first lookup, cache per step id.
    // Order stays stable across re-renders (post-submit, show-solution, summary).
    // Correct-answer grading is by id match, so shuffle doesn't affect correctness.
    if (this.state.shuffledOptions[step.id]) {
      return this.state.shuffledOptions[step.id];
    }
    let raw;
    if (typeof step.options === 'function') {
      raw = step.options(this.state.data, this.state.correctValues);
    } else {
      raw = step.options || [];
    }
    const shuffled = this._fisherYates(raw);
    this.state.shuffledOptions[step.id] = shuffled;
    return shuffled;
  }

  _fisherYates(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _getOptionLabel(step, optionId) {
    const opts = this._getOptionsForStep(step);
    const found = opts.find(o => o.id === optionId);
    return found ? found.label : String(optionId);
  }

  // Pretty answer for any step type (numeric OR choice), used in submitted-row
  // display and summary rows.
  _formatAnswer(value, step) {
    if (value === null || value === undefined) return '—';
    if (getStepType(step) === 'choice') {
      return this._getOptionLabel(step, value);
    }
    return formatNumericAnswer(value, step.resultType);
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

    // Optional scenario card (Pass 2)
    const scenarioCard = this._buildScenarioCard();
    if (scenarioCard) this.container.appendChild(scenarioCard);

    this.container.appendChild(this._buildGivenPanel());
    const stepList = document.createElement('div');
    stepList.className = 'practice-step-list';
    stepList.style.cssText = 'display:flex;flex-direction:column;gap:var(--space-4);margin-top:var(--space-5);';
    this.problem.steps.forEach((step, idx) => {
      stepList.appendChild(this._buildStepCard(step, idx));
    });
    this.container.appendChild(stepList);

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

  _buildScenarioCard() {
    if (typeof this.problem.scenario !== 'function') return null;
    const html = this.problem.scenario(this.state.data);
    if (!html) return null;
    const card = document.createElement('div');
    card.className = 'practice-scenario';
    card.style.cssText = `
      background: var(--color-card-bg);
      border: 1px solid var(--color-gray-200);
      border-left: 4px solid var(--color-accent);
      border-radius: var(--radius-md);
      padding: var(--space-4) var(--space-5);
      margin-bottom: var(--space-4);
      color: var(--color-primary-text);
      font-size: var(--font-size-base);
      line-height: 1.6;
    `;
    card.innerHTML = `
      <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);letter-spacing:0.05em;">Scenario</div>
      <div class="practice-scenario__body">${html}</div>
    `;
    return card;
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
    const stepType    = getStepType(step);

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
      bodyHtml = this._buildSubmittedBody(step);
    } else if (isActive) {
      bodyHtml = stepType === 'choice'
        ? this._buildChoiceInputBody(step)
        : this._buildNumericInputBody(step);
    } else {
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

    // --- Wire up active step inputs ---
    if (isActive) {
      if (stepType === 'choice') this._wireChoiceInputs(card, step);
      else this._wireNumericInputs(card, step);
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

  // --------------------------------------------------------------------------
  // Numeric input body + wiring
  // --------------------------------------------------------------------------

  _buildNumericInputBody(step) {
    return `
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
  }

  _wireNumericInputs(card, step) {
    const input  = card.querySelector(`#practice-input-${step.id}`);
    const submit = card.querySelector(`#practice-submit-${step.id}`);
    if (!input || !submit) return;
    input.addEventListener('input', () => {
      const ok = input.value !== '' && !isNaN(parseFloat(input.value));
      submit.disabled = !ok;
      submit.style.opacity = ok ? '1' : '0.4';
    });
    input.addEventListener('focus', () => { input.style.borderColor = 'var(--color-accent)'; });
    input.addEventListener('blur',  () => { input.style.borderColor = 'var(--color-gray-200)'; });
    submit.addEventListener('click', () => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) this._handleNumericSubmit(step, val);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submit.disabled) submit.click();
    });
  }

  // --------------------------------------------------------------------------
  // Choice input body + wiring
  // --------------------------------------------------------------------------

  _buildChoiceInputBody(step) {
    const options = this._getOptionsForStep(step);
    const optsHtml = options.map((opt, i) => `
      <label
        class="practice-choice-option"
        data-option-id="${opt.id}"
        style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3) var(--space-4);border:2px solid var(--color-gray-200);border-radius:var(--radius-md);background:var(--color-card-bg);cursor:pointer;margin-bottom:var(--space-2);transition:border-color 0.15s, background 0.15s;"
      >
        <input
          type="radio"
          name="practice-choice-${step.id}"
          value="${opt.id}"
          style="margin-top:3px;flex-shrink:0;cursor:pointer;"
        />
        <span style="font-size:var(--font-size-sm);color:var(--color-primary-text);line-height:1.5;">${opt.label}</span>
      </label>
    `).join('');
    return `
      <div class="practice-choice-list" style="margin-bottom:var(--space-3);">
        ${optsHtml}
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button
          id="practice-submit-${step.id}"
          disabled
          style="padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);background:var(--color-accent);color:#fff;font-weight:700;font-size:var(--font-size-sm);border:none;cursor:pointer;opacity:0.4;transition:opacity 0.15s;"
        >Submit &rarr;</button>
      </div>
    `;
  }

  _wireChoiceInputs(card, step) {
    const radios = card.querySelectorAll(`input[name="practice-choice-${step.id}"]`);
    const submit = card.querySelector(`#practice-submit-${step.id}`);
    const labels = card.querySelectorAll('.practice-choice-option');
    if (!submit) return;

    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        submit.disabled = false;
        submit.style.opacity = '1';
        labels.forEach((lbl) => {
          const isSelected = lbl.dataset.optionId === radio.value && radio.checked;
          lbl.style.borderColor = isSelected ? 'var(--color-accent)' : 'var(--color-gray-200)';
          lbl.style.background = isSelected ? 'var(--color-warning-bg)' : 'var(--color-card-bg)';
        });
      });
    });

    submit.addEventListener('click', () => {
      const selected = card.querySelector(`input[name="practice-choice-${step.id}"]:checked`);
      if (selected) this._handleChoiceSubmit(step, selected.value);
    });
  }

  // --------------------------------------------------------------------------
  // Submitted body (works for both numeric and choice)
  // --------------------------------------------------------------------------

  _buildSubmittedBody(step) {
    const result = this.state.stepResults[step.id];
    const studentVal = this.state.studentAnswers[step.id];
    return `
      <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--color-card-bg);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);margin-bottom:var(--space-3);">
        <span style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Your answer:</span>
        <span style="font-weight:700;color:var(--color-primary-text);">${this._formatAnswer(studentVal, step)}</span>
        ${result.correct
          ? `<span style="margin-left:auto;font-size:var(--font-size-xs);color:var(--color-success);">${getStepType(step) === 'choice' ? 'correct selection' : 'within tolerance'}</span>`
          : `<span style="margin-left:auto;font-size:var(--font-size-xs);color:var(--color-danger);">Incorrect</span>`}
      </div>
    `;
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
  // Submission — numeric
  // --------------------------------------------------------------------------

  _handleNumericSubmit(step, studentValue) {
    const correctValue = step.solve(this.state.data, this.state.correctValues);
    const tol = resolveTolerance(step, correctValue);
    const { correct, deviation } = evaluateAnswer(studentValue, correctValue, tol);

    this.state.studentAnswers[step.id] = studentValue;
    this.state.correctValues[step.id]  = correctValue;
    this.state.stepResults[step.id]    = { correct, deviation };

    this._afterSubmit(step);
  }

  // --------------------------------------------------------------------------
  // Submission — choice
  // --------------------------------------------------------------------------

  _handleChoiceSubmit(step, studentChoiceId) {
    const correctId = step.correctId(this.state.data, this.state.correctValues);
    const correct = studentChoiceId === correctId;

    this.state.studentAnswers[step.id] = studentChoiceId;
    this.state.correctValues[step.id]  = correctId;
    this.state.stepResults[step.id]    = { correct, deviation: 0 };

    this._afterSubmit(step);
  }

  // --------------------------------------------------------------------------
  // Common post-submit logic
  // --------------------------------------------------------------------------

  _afterSubmit(step) {
    const stepIdx = this.problem.steps.findIndex(s => s.id === step.id);
    const isFinalStep = stepIdx === this.problem.steps.length - 1;

    if (isFinalStep) {
      this.state.finalSubmitted = true;
    } else {
      this.state.activeStepIndex = stepIdx + 1;
    }

    this._render();

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
    const correctRef = this.state.correctValues[step.id]; // number OR string (id)

    const workSteps = step.showWork(data, prior, studentAnswers, correctRef);
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
                  Your answer: <strong>${this._formatAnswer(studentVal, step)}</strong>
                  ${!correct ? ` · Correct: <strong>${this._formatAnswer(correctVal, step)}</strong>` : ''}
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

    this.problem.steps.forEach((step) => {
      const mount = this.container.querySelector(`.practice-summary__solution-mount[data-step-id="${step.id}"]`);
      if (mount) this._mountShowWork(mount, step);
    });

    this.container.querySelector('#practice-try-again-btn').addEventListener('click', () => {
      this.reset();
    });
    this.container.querySelector('#practice-try-different-btn').addEventListener('click', () => {
      this.container.dispatchEvent(new CustomEvent('practice:back-to-picker', { bubbles: true }));
    });
  }
}
