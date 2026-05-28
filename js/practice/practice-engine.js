// js/practice/practice-engine.js
// Practice Engine — randomized multi-step calculation problems.
// See SPEC.md (co-located) for the authoritative contract.

import { renderShowWork } from "/js/components/show-work.js";

// ============================================================================
// Section 1 — Exported helper utilities (used by problem definitions)
// ============================================================================

/**
 * Inclusive integer in [min, max], stepped by `step` (default 1).
 * randomInRange(40, 80, 1)  -> any int 40..80
 * randomInRange(60000, 180000, 5000) -> multiple of 5000 in range
 */
export function randomInRange(min, max, step = 1) {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
}

/** Round value to N decimals. */
export function roundTo(value, decimals = 0) {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

/** Round value to nearest multiple of `nearest`. roundToNearest(12873, 100) -> 12900 */
export function roundToNearest(value, nearest) {
  return Math.round(value / nearest) * nearest;
}

/** Ensure `value` exceeds `floor` by at least `minDelta`; if not, return floor + minDelta. */
export function ensureGreaterThan(value, floor, minDelta = 1) {
  return value > floor + minDelta ? value : floor + minDelta;
}

/** Random element from an array. */
export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Seeded PRNG (mulberry32) for test determinism. */
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
  "money-small": { value: 1, type: "absolute" },
  "money-medium": { value: 1, type: "percent" },
  "money-large": { value: 0.5, type: "percent" },
  units: { value: 1, type: "absolute" }, // overridden below 1000 vs above
  percent: { value: 0.5, type: "absolute" }, // 0.5 percentage points
  years: { value: 0.1, type: "absolute" },
};

function resolveTolerance(step, correctValue) {
  if (step.tolerance) return step.tolerance;
  const tier = TOLERANCE_TIER_DEFAULTS[step.resultType];
  if (!tier) return { value: 1, type: "absolute" };
  // Units: switch to percent above 1000
  if (step.resultType === "units" && Math.abs(correctValue) >= 1000) {
    return { value: 0.5, type: "percent" };
  }
  return tier;
}

function evaluateAnswer(studentValue, correctValue, tol) {
  const diff = Math.abs(studentValue - correctValue);
  if (tol.type === "absolute") {
    return { correct: diff <= tol.value, deviation: diff };
  }
  // percent
  const denom = Math.abs(correctValue) || 1;
  const pctDiff = (diff / denom) * 100;
  return { correct: pctDiff <= tol.value, deviation: pctDiff };
}

// ============================================================================
// Section 3 — Formatters
// ============================================================================

function formatStudentAnswer(value, resultType) {
  if (value === null || value === undefined) return "—";
  switch (resultType) {
    case "money-small":
    case "money-medium":
    case "money-large":
      return (
        "$" +
        Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
      );
    case "units":
      return Number(value).toLocaleString() + " units";
    case "percent":
      return Number(value).toFixed(1) + "%";
    case "years":
      return Number(value).toFixed(1) + " years";
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
    let randomFn = Math.random;
    if (seed !== undefined) {
      const prng = mulberry32(seed);
      const original = Math.random;
      Math.random = prng;
      // Run randomize then restore
      const data = this.problem.randomize();
      Math.random = original;
      return this._buildInitial(data);
    }
    const data = this.problem.randomize();
    return this._buildInitial(data);
  }

  _buildInitial(data) {
    return {
      data,
      activeStepIndex: 0,
      studentAnswers: {},
      correctValues: {},
      stepResults: {}, // { stepId: { correct: bool, deviation: number } }
      solutionViewed: {},
      complete: false,
    };
  }

  // --------------------------------------------------------------------------
  // Section 5 — Rendering
  // --------------------------------------------------------------------------

  _render() {
    if (this.state.complete) {
      this._renderSummary();
      return;
    }
    this.container.innerHTML = "";
    this.container.appendChild(this._buildProblemHeader());
    this.container.appendChild(this._buildGivenPanel());
    const stepList = document.createElement("div");
    stepList.className = "practice-step-list";
    stepList.style.cssText =
      "display:flex;flex-direction:column;gap:var(--space-4);margin-top:var(--space-5);";
    this.problem.steps.forEach((step, idx) => {
      stepList.appendChild(this._buildStepCard(step, idx));
    });
    this.container.appendChild(stepList);
  }

  _buildProblemHeader() {
    const wrap = document.createElement("div");
    wrap.style.cssText = "margin-bottom:var(--space-4);";
    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
        <h3 style="margin:0;color:var(--color-primary-text);">${this.problem.title}</h3>
        <button id="practice-back-btn" style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);background:var(--color-gray-100);color:var(--color-primary-text);font-size:var(--font-size-xs);font-weight:700;border:1px solid var(--color-gray-200);cursor:pointer;">&larr; Back to problems</button>
      </div>
      <div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">Estimated: ${this.problem.estimatedMinutes || 5} min · ${this.problem.steps.length} steps</div>
    `;
    wrap.querySelector("#practice-back-btn").addEventListener("click", () => {
      this.container.dispatchEvent(
        new CustomEvent("practice:back-to-picker", { bubbles: true }),
      );
    });
    return wrap;
  }

  _buildGivenPanel() {
    const rows = this.problem.given(this.state.data);
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "background:var(--color-info-bg);border:1px solid var(--color-info);border-radius:var(--radius-md);padding:var(--space-4);";
    wrap.innerHTML = `
      <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Given Information</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3);">
        ${rows
          .map(
            (r) => `
          <div>
            <div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">${r.label}</div>
            <div style="font-size:var(--font-size-base);font-weight:700;color:var(--color-primary-text);">${r.value}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
    return wrap;
  }

  _buildStepCard(step, idx) {
    const isActive = idx === this.state.activeStepIndex;
    const isSubmitted = idx < this.state.activeStepIndex;
    const isLocked = idx > this.state.activeStepIndex;

    const card = document.createElement("div");
    card.className = "practice-step-card";
    card.dataset.stepId = step.id;

    const borderColor = isActive
      ? "var(--color-primary-text)"
      : "var(--color-gray-200)";
    const opacity = isLocked ? "0.55" : "1";

    card.style.cssText = `
      background:var(--color-card-bg);
      border:2px solid ${borderColor};
      border-radius:var(--radius-md);
      padding:var(--space-4);
      opacity:${opacity};
      transition:border-color 0.15s, opacity 0.15s;
    `;

    const stepHeader = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
        <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);">
          Step ${idx + 1} of ${this.problem.steps.length}
        </div>
        ${isLocked ? '<div style="font-size:var(--font-size-xs);color:var(--color-gray-400);">🔒 Locked</div>' : ""}
        ${isSubmitted ? this._buildResultBadge(step.id) : ""}
      </div>
      <div style="font-size:var(--font-size-base);font-weight:600;color:var(--color-primary-text);margin-bottom:var(--space-3);">
        ${step.question}
      </div>
    `;

    let body;
    if (isLocked) {
      body = `<div style="font-size:var(--font-size-sm);color:var(--color-gray-500);font-style:italic;">Complete Step ${idx} to unlock.</div>`;
    } else if (isSubmitted) {
      body = this._buildSubmittedBody(step);
    } else {
      body = this._buildActiveInput(step);
    }

    card.innerHTML = stepHeader + body;

    if (isActive) {
      this._wireActiveInput(card, step);
    }
    if (isSubmitted && !this.state.solutionViewed[step.id]) {
      const btn = card.querySelector(`#show-solution-${step.id}`);
      if (btn)
        btn.addEventListener("click", () => this._handleShowSolution(step));
    }

    return card;
  }

  _buildResultBadge(stepId) {
    const r = this.state.stepResults[stepId];
    if (!r) return "";
    if (r.correct) {
      return `<div style="font-size:var(--font-size-xs);font-weight:700;color:var(--color-success);">&#10003; Correct</div>`;
    }
    return `<div style="font-size:var(--font-size-xs);font-weight:700;color:var(--color-danger);">&#10005; Incorrect</div>`;
  }

  _buildActiveInput(step) {
    const inputId = `practice-input-${step.id}`;
    const submitId = `practice-submit-${step.id}`;
    return `
      <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap;">
        <input id="${inputId}" type="number" step="any" placeholder="Enter answer"
               style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);border:2px solid var(--color-gray-200);background:var(--color-card-bg);color:var(--color-primary-text);font-size:var(--font-size-base);width:180px;" />
        <span style="font-size:var(--font-size-sm);color:var(--color-gray-500);">${step.unit || ""}</span>
        <button id="${submitId}" disabled
                style="padding:var(--space-2) var(--space-5);border-radius:var(--radius-md);background:var(--color-primary-text);color:#fff;font-weight:700;font-size:var(--font-size-sm);border:none;cursor:pointer;opacity:0.4;transition:opacity 0.15s;">
          Submit
        </button>
      </div>
    `;
  }

  _buildSubmittedBody(step) {
    const studentValue = this.state.studentAnswers[step.id];
    const result = this.state.stepResults[step.id];
    const solutionShown = this.state.solutionViewed[step.id];

    const answerLine = `
      <div style="font-size:var(--font-size-sm);color:var(--color-primary-text);">
        Your answer: <strong>${formatStudentAnswer(studentValue, step.resultType)}</strong>
        ${!result.correct ? `<span style="color:var(--color-danger);margin-left:var(--space-2);">— Incorrect</span>` : ""}
      </div>
    `;

    const showWorkSlot = `<div id="show-work-${step.id}" style="margin-top:var(--space-3);"></div>`;

    const solutionBtn = solutionShown
      ? `<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);font-style:italic;margin-top:var(--space-3);">Solution shown</div>`
      : `<button id="show-solution-${step.id}"
                 style="margin-top:var(--space-3);padding:var(--space-2) var(--space-4);border-radius:var(--radius-md);background:var(--color-gray-100);color:var(--color-primary-text);font-size:var(--font-size-xs);font-weight:700;border:1px solid var(--color-gray-200);cursor:pointer;">
           Show Solution
         </button>`;

    return answerLine + showWorkSlot + solutionBtn;
  }

  _wireActiveInput(card, step) {
    const input = card.querySelector(`#practice-input-${step.id}`);
    const btn = card.querySelector(`#practice-submit-${step.id}`);
    if (!input || !btn) return;
    input.focus();
    input.addEventListener("input", () => {
      const v = input.value.trim();
      const valid = v !== "" && !isNaN(parseFloat(v));
      btn.disabled = !valid;
      btn.style.opacity = valid ? "1" : "0.4";
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !btn.disabled) btn.click();
    });
    btn.addEventListener("click", () => {
      const value = parseFloat(input.value);
      if (isNaN(value)) return;
      this._handleSubmit(step, value);
    });
  }

  // --------------------------------------------------------------------------
  // Section 6 — Submission
  // --------------------------------------------------------------------------

  _handleSubmit(step, studentValue) {
    const data = this.state.data;
    const prior = { ...this.state.correctValues };
    const correctValue = step.solve(data, prior);
    const tol = resolveTolerance(step, correctValue);
    const { correct, deviation } = evaluateAnswer(
      studentValue,
      correctValue,
      tol,
    );

    this.state.studentAnswers[step.id] = studentValue;
    this.state.correctValues[step.id] = correctValue;
    this.state.stepResults[step.id] = { correct, deviation };

    // Advance
    const nextIdx = this.state.activeStepIndex + 1;
    if (nextIdx >= this.problem.steps.length) {
      this.state.complete = true;
    } else {
      this.state.activeStepIndex = nextIdx;
    }
    this._render();
  }

  // --------------------------------------------------------------------------
  // Section 7 — Show solution
  // --------------------------------------------------------------------------

  _handleShowSolution(step) {
    this.state.solutionViewed[step.id] = true;
    const slot = this.container.querySelector(`#show-work-${step.id}`);
    if (!slot) return;
    const data = this.state.data;
    const prior = this._priorThrough(step.id);
    const studentAnswers = { ...this.state.studentAnswers };
    const correctValue = this.state.correctValues[step.id];
    const entries = step.showWork(data, prior, studentAnswers, correctValue);
    renderShowWork(slot, entries, { title: "Solution", defaultOpen: true });

    // Replace the button with "Solution shown"
    const btn = this.container.querySelector(`#show-solution-${step.id}`);
    if (btn) {
      const note = document.createElement("div");
      note.style.cssText =
        "font-size:var(--font-size-xs);color:var(--color-gray-500);font-style:italic;margin-top:var(--space-3);";
      note.textContent = "Solution shown";
      btn.replaceWith(note);
    }
  }

  /** prior values from steps before `stepId` (does not include stepId itself). */
  _priorThrough(stepId) {
    const result = {};
    for (const s of this.problem.steps) {
      if (s.id === stepId) break;
      if (this.state.correctValues[s.id] !== undefined) {
        result[s.id] = this.state.correctValues[s.id];
      }
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Section 8 — Summary
  // --------------------------------------------------------------------------

  _renderSummary() {
    const steps = this.problem.steps;
    const correctCount = steps.filter(
      (s) => this.state.stepResults[s.id]?.correct,
    ).length;
    const total = steps.length;

    const reviewLinks = (this.problem.reviewChapters || [])
      .map(
        (c) =>
          `<a href="${c.href}" style="display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--font-size-xs);font-weight:600;color:var(--color-accent);text-decoration:none;padding:var(--space-2) var(--space-3);border:1px solid var(--color-accent);border-radius:var(--radius-sm);">${c.label} &rarr;</a>`,
      )
      .join("");

    const stepRows = steps
      .map((s, i) => {
        const r = this.state.stepResults[s.id];
        const viewed = this.state.solutionViewed[s.id];
        const studentAns = formatStudentAnswer(
          this.state.studentAnswers[s.id],
          s.resultType,
        );
        const correctAns = formatStudentAnswer(
          this.state.correctValues[s.id],
          s.resultType,
        );
        const icon = r?.correct ? "✓" : "✗";
        const iconColor = r?.correct
          ? "var(--color-success)"
          : "var(--color-danger)";
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-3);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);margin-bottom:var(--space-2);">
          <div style="display:flex;align-items:center;gap:var(--space-3);">
            <span style="font-weight:800;color:${iconColor};font-size:var(--font-size-lg);">${icon}</span>
            <div>
              <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);">Step ${i + 1}</div>
              <div style="font-size:var(--font-size-sm);color:var(--color-primary-text);">${s.question}</div>
            </div>
          </div>
          <div style="text-align:right;font-size:var(--font-size-xs);">
            <div>Yours: <strong>${studentAns}</strong></div>
            <div>Correct: <strong>${correctAns}</strong></div>
            ${viewed ? '<div style="color:var(--color-gray-500);font-style:italic;">(solution viewed)</div>' : ""}
          </div>
        </div>
      `;
      })
      .join("");

    this.container.innerHTML = `
      <div style="padding:var(--space-4) 0;">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5);">
          <div style="flex:1;height:2px;background:var(--color-primary-text);border-radius:9999px;"></div>
          <span style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-primary-text);letter-spacing:0.1em;white-space:nowrap;">Problem Complete</span>
          <div style="flex:1;height:2px;background:var(--color-primary-text);border-radius:9999px;"></div>
        </div>
        <div style="text-align:center;padding:var(--space-5);background:var(--color-card-bg);border:1px solid var(--color-gray-200);border-radius:var(--radius-lg);margin-bottom:var(--space-5);">
          <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-2);">You answered</div>
          <div style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-primary-text);">${correctCount} of ${total} correctly</div>
        </div>
        <h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Step-by-Step Results</h4>
        ${stepRows}
        ${
          reviewLinks
            ? `
          <div style="margin-top:var(--space-5);">
            <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Related chapter content</div>
            <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);">${reviewLinks}</div>
          </div>
        `
            : ""
        }
        <div style="margin-top:var(--space-5);display:flex;gap:var(--space-3);">
          <button id="practice-try-again-btn"
                  style="padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);background:var(--color-primary-text);color:#fff;font-weight:700;font-size:var(--font-size-sm);border:none;cursor:pointer;">
            &#8635; Try Again (new numbers)
          </button>
          <button id="practice-different-btn"
                  style="padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);background:var(--color-card-bg);color:var(--color-primary-text);font-weight:700;font-size:var(--font-size-sm);border:1px solid var(--color-gray-200);cursor:pointer;">
            Try a Different Problem &rarr;
          </button>
        </div>
      </div>
    `;

    this.container
      .querySelector("#practice-try-again-btn")
      .addEventListener("click", () => this.reset());
    this.container
      .querySelector("#practice-different-btn")
      .addEventListener("click", () => {
        this.container.dispatchEvent(
          new CustomEvent("practice:back-to-picker", { bubbles: true }),
        );
      });
  }
}
