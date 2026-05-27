// ── Scenario Engine ───────────────────────────────────────────────────────────
// State machine for Apply section simulations.
// The engine is domain-agnostic -- all accounting logic lives in scenario
// definition files under js/engine/scenarios/.
//
// Usage:
//   import { ScenarioEngine } from '/js/engine/scenario-engine.js';
//   import { myScenario } from '/js/engine/scenarios/my-scenario-sim.js';
//   const engine = new ScenarioEngine();
//   engine.init(myScenario, document.getElementById('depth-simulation'));

import { renderShowWork } from "/js/components/show-work.js";

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = (n) => "$" + Math.abs(Math.round(n)).toLocaleString();
const fmtN = (n) => Math.round(n).toLocaleString();
const fmtPct = (n) => (Math.round(n * 10) / 10).toFixed(1) + "%";

// ── Score helpers ─────────────────────────────────────────────────────────────

const SCORE_META = {
  optimal: {
    label: "Optimal",
    color: "var(--color-success)",
    bg: "var(--color-success-bg)",
    icon: "✓",
    weight: 1.0,
  },
  acceptable: {
    label: "Acceptable",
    color: "var(--color-warning)",
    bg: "var(--color-warning-bg)",
    icon: "~",
    weight: 0.6,
  },
  suboptimal: {
    label: "Suboptimal",
    color: "var(--color-danger)",
    bg: "var(--color-danger-bg)",
    icon: "✗",
    weight: 0.2,
  },
  poor: {
    label: "Poor",
    color: "var(--color-poor)",
    bg: "var(--color-poor-bg)",
    icon: "✗✗",
    weight: 0.0,
  },
};

function overallRating(decisions) {
  const total = decisions.length;
  if (total === 0)
    return { label: "No decisions", color: "var(--color-gray-500)", pct: 0 };
  const totalWeight = decisions.reduce(
    (sum, d) => sum + (SCORE_META[d.score] ? SCORE_META[d.score].weight : 0),
    0,
  );
  const pct = totalWeight / total;
  if (pct >= 0.85)
    return {
      label: "Expert decision-maker",
      color: "var(--color-success)",
      pct,
    };
  if (pct >= 0.65)
    return { label: "Sound reasoning", color: "var(--color-warning)", pct };
  if (pct >= 0.4)
    return { label: "Needs improvement", color: "var(--color-danger)", pct };
  return { label: "Review key concepts", color: "var(--color-poor)", pct };
}

// ── Shuffle array (Fisher-Yates) ──────────────────────────────────────────────

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Deep clone state metrics safely ──────────────────────────────────────────

function cloneMetrics(metrics) {
  return JSON.parse(JSON.stringify(metrics));
}

// ── Answer type badge ─────────────────────────────────────────────────────────

function answerTypeBadge(type) {
  const map = {
    "single-choice": { label: "Single Choice", color: "var(--color-concept)" },
    "multiple-choice": {
      label: "Multiple Choice",
      color: "var(--color-analysis)",
    },
    numeric: { label: "Numeric Input", color: "var(--color-simulation)" },
  };
  const meta = map[type] || { label: type, color: "var(--color-gray-500)" };
  return (
    '<span style="display:inline-flex;align-items:center;font-size:0.65rem;font-weight:700;' +
    "padding:2px 10px;border-radius:9999px;background:" +
    meta.color +
    ";color:#fff;" +
    'margin-bottom:var(--space-3);">' +
    meta.label +
    "</span>"
  );
}

// ── ScenarioEngine ────────────────────────────────────────────────────────────

export class ScenarioEngine {
  constructor() {
    this.scenario = null;
    this.container = null;
    this.state = null;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  init(scenarioDefinition, containerEl) {
    this.scenario = scenarioDefinition;
    this.container = containerEl;
    this.state = this._initialState();
    this._renderStage();
  }

  reset() {
    this.state = this._initialState();
    this._renderStage();
  }

  // ── State ───────────────────────────────────────────────────────────────────

  _initialState() {
    const metrics =
      typeof this.scenario.randomizeMetrics === "function"
        ? this.scenario.randomizeMetrics()
        : cloneMetrics(this.scenario.initialMetrics);

    return {
      scenarioId: this.scenario.id,
      stageIndex: 0,
      decisions: [],
      consequences: [],
      metrics,
      stageAnswerTypes: {},
      visitedStageIds: [],
      complete: false,
    };
  }

  _currentStage() {
    return this.scenario.stages[this.state.stageIndex];
  }

  _nextStageIndex(stage) {
    if (stage.nextStage === null || stage.nextStage === undefined) {
      return -1; // signals completion
    }
    if (typeof stage.nextStage === "function") {
      const nextId = stage.nextStage(this.state);
      return this.scenario.stages.findIndex((s) => s.id === nextId);
    }
    if (typeof stage.nextStage === "string") {
      return this.scenario.stages.findIndex((s) => s.id === stage.nextStage);
    }
    return this.state.stageIndex + 1;
  }

  // ── Answer type selection ───────────────────────────────────────────────────

  _selectAnswerType(stage) {
    if (this.state.stageAnswerTypes[stage.id]) {
      return this.state.stageAnswerTypes[stage.id];
    }
    const types = stage.answerTypes || ["single-choice"];
    const selected = types[Math.floor(Math.random() * types.length)];
    this.state.stageAnswerTypes[stage.id] = selected;
    return selected;
  }

  // ── Progress tracking ───────────────────────────────────────────────────────

  _recordVisit(stageId) {
    if (!this.state.visitedStageIds.includes(stageId)) {
      this.state.visitedStageIds.push(stageId);
    }
  }

  _progressLabel() {
    const visited = this.state.visitedStageIds.length;
    const stage = this._currentStage();
    const remaining = this._estimateRemainingStages(stage);
    const total = visited + remaining;
    return { current: visited, total };
  }

  _estimateRemainingStages(fromStage) {
    let count = 1;
    let s = fromStage;
    const visited = new Set(this.state.visitedStageIds);
    for (let i = 0; i < 20; i++) {
      if (!s || s.nextStage === null || s.nextStage === undefined) break;
      let nextId;
      if (typeof s.nextStage === "string") {
        nextId = s.nextStage;
      } else if (typeof s.nextStage === "function") {
        nextId = s.nextStage(this.state);
      } else {
        break;
      }
      const next = this.scenario.stages.find((st) => st.id === nextId);
      if (!next || visited.has(next.id)) break;
      count++;
      s = next;
    }
    return count;
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  _renderStage() {
    const stage = this._currentStage();
    const state = this.state;
    const type = this._selectAnswerType(stage);

    // Record visit for progress tracking
    this._recordVisit(stage.id);

    const { current, total } = this._progressLabel();

    const contextHTML =
      typeof stage.context === "function"
        ? stage.context(state)
        : stage.context;

    const metricsHTML = this._renderMetrics(
      state.metrics,
      stage.highlightMetrics || [],
    );

    // Build shell
    this.container.innerHTML =
      '<div style="padding:var(--space-6) 0;">' +
      // Progress bar
      '<div style="margin-bottom:var(--space-5);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">' +
      '<span style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);">Stage ' +
      current +
      " of " +
      total +
      "</span>" +
      '<span style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' +
      this.scenario.title +
      "</span>" +
      "</div>" +
      '<div style="height:4px;background:var(--color-gray-200);border-radius:9999px;">' +
      '<div style="height:4px;background:var(--color-simulation);border-radius:9999px;width:' +
      Math.round((current / total) * 100) +
      '%;transition:width 0.3s;"></div>' +
      "</div>" +
      "</div>" +
      // Answer type badge
      answerTypeBadge(type) +
      // Stage title
      '<h3 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">' +
      stage.title +
      "</h3>" +
      // Context
      '<div style="background:var(--color-info-bg);border:1px solid var(--color-info);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-5);font-size:var(--font-size-sm);line-height:1.7;">' +
      contextHTML +
      "</div>" +
      // Live metrics
      (metricsHTML
        ? '<div style="margin-bottom:var(--space-5);">' + metricsHTML + "</div>"
        : "") +
      // Answer area
      '<div id="sim-answer-area"></div>' +
      "</div>";

    // Render answer area based on type
    const answerArea = this.container.querySelector("#sim-answer-area");
    if (type === "single-choice") this._renderSingleChoice(stage, answerArea);
    if (type === "multiple-choice")
      this._renderMultipleChoice(stage, answerArea);
    if (type === "numeric") this._renderNumericInput(stage, answerArea);
  }

  // ── Single Choice ───────────────────────────────────────────────────────────

  _renderSingleChoice(stage, container) {
    const state = this.state;
    const rawOptions =
      typeof stage.generateOptions === "function"
        ? stage.generateOptions(state)
        : stage.options || [];

    const shuffled = shuffleArray(rawOptions);

    const label =
      '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;' +
      'color:var(--color-gray-500);margin-bottom:var(--space-3);">Select one</div>';

    const btns = shuffled
      .map((opt, i) => {
        const lbl =
          typeof opt.label === "function" ? opt.label(state) : opt.label;
        const sublbl =
          typeof opt.sublabel === "function"
            ? opt.sublabel(state)
            : opt.sublabel;
        return (
          '<button class="sim-option-btn" data-idx="' +
          i +
          '" style="' +
          "display:block;width:100%;text-align:left;padding:var(--space-4);" +
          "margin-bottom:var(--space-3);border-radius:var(--radius-md);" +
          "border:2px solid var(--color-gray-200);background:var(--color-card-bg);" +
          "color:var(--color-primary-text);font-size:var(--font-size-sm);" +
          'cursor:pointer;transition:border-color 0.15s,background 0.15s;">' +
          '<div style="font-weight:700;margin-bottom:var(--space-1);">' +
          lbl +
          "</div>" +
          (sublbl
            ? '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' +
              sublbl +
              "</div>"
            : "") +
          "</button>"
        );
      })
      .join("");

    container.innerHTML = label + btns;

    container.querySelectorAll(".sim-option-btn").forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.borderColor = "var(--color-simulation)";
        btn.style.background = "var(--color-gray-50)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderColor = "var(--color-gray-200)";
        btn.style.background = "var(--color-card-bg)";
      });
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx, 10);
        this._applyDecision(shuffled[idx], "single-choice");
      });
    });
  }

  // ── Multiple Choice ─────────────────────────────────────────────────────────

  _renderMultipleChoice(stage, container) {
    const state = this.state;
    const rawOptions =
      typeof stage.generateMultiOptions === "function"
        ? stage.generateMultiOptions(state)
        : stage.options || [];

    // Shuffle and store on the container element so the submit handler
    // can read the same array without closure staleness issues
    const shuffled = shuffleArray(rawOptions);
    container._shuffledOptions = shuffled;

    const label =
      '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;' +
      'color:var(--color-gray-500);margin-bottom:var(--space-3);">Select all that apply</div>';

    const checks = shuffled
      .map((opt, i) => {
        const lbl =
          typeof opt.label === "function" ? opt.label(state) : opt.label;
        const sublbl =
          typeof opt.sublabel === "function"
            ? opt.sublabel(state)
            : opt.sublabel;
        return (
          '<label style="display:flex;align-items:flex-start;gap:var(--space-3);' +
          "padding:var(--space-4);margin-bottom:var(--space-3);border-radius:var(--radius-md);" +
          "border:2px solid var(--color-gray-200);background:var(--color-card-bg);cursor:pointer;" +
          'transition:border-color 0.15s,background 0.15s;" class="sim-multi-row">' +
          '<input type="checkbox" data-idx="' +
          i +
          '" class="sim-multi-check" ' +
          'style="margin-top:3px;cursor:pointer;width:16px;height:16px;flex-shrink:0;" />' +
          "<div>" +
          '<div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary-text);">' +
          lbl +
          "</div>" +
          (sublbl
            ? '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-top:2px;">' +
              sublbl +
              "</div>"
            : "") +
          "</div>" +
          "</label>"
        );
      })
      .join("");

    const submitBtn =
      '<button id="sim-multi-submit" disabled style="' +
      "padding:var(--space-3) var(--space-6);border-radius:var(--radius-md);" +
      "background:var(--color-simulation);color:#fff;font-weight:700;" +
      "font-size:var(--font-size-sm);border:none;cursor:pointer;opacity:0.4;" +
      'transition:opacity 0.15s;">Submit Selection &rarr;</button>';

    container.innerHTML = label + checks + submitBtn;

    const submit = container.querySelector("#sim-multi-submit");

    container.querySelectorAll(".sim-multi-check").forEach((cb) => {
      cb.addEventListener("change", () => {
        const anyChecked =
          container.querySelectorAll(".sim-multi-check:checked").length > 0;
        submit.disabled = !anyChecked;
        submit.style.opacity = anyChecked ? "1" : "0.4";
      });
    });

    container.querySelectorAll(".sim-multi-row").forEach((row) => {
      row.addEventListener("mouseenter", () => {
        row.style.borderColor = "var(--color-simulation)";
        row.style.background = "var(--color-gray-50)";
      });
      row.addEventListener("mouseleave", () => {
        row.style.borderColor = "var(--color-gray-200)";
        row.style.background = "var(--color-card-bg)";
      });
    });

    submit.addEventListener("click", () => {
      // Read checked indices BEFORE any DOM mutation
      const checkedIndices = [];
      container.querySelectorAll(".sim-multi-check:checked").forEach((cb) => {
        checkedIndices.push(parseInt(cb.dataset.idx, 10));
      });
      // Map indices back to option objects using stored shuffled array
      const selected = checkedIndices.map(
        (idx) => container._shuffledOptions[idx],
      );
      this._applyDecision(selected, "multiple-choice");
    });
  }

  // ── Numeric Input ───────────────────────────────────────────────────────────

  _renderNumericInput(stage, container) {
    const state = this.state;
    const config = stage.numericConfig(state);

    const label =
      '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;' +
      'color:var(--color-gray-500);margin-bottom:var(--space-3);">Enter your answer</div>';

    const hint = config.hint
      ? '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-bottom:var(--space-3);">' +
        config.hint +
        "</div>"
      : "";

    const inputRow =
      '<div style="display:flex;gap:var(--space-3);align-items:center;margin-bottom:var(--space-4);">' +
      '<label style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-primary-text);white-space:nowrap;">' +
      config.label +
      "</label>" +
      '<input id="sim-numeric-input" type="number" min="' +
      (config.min || 0.01) +
      '" step="' +
      (config.step || 1) +
      '" ' +
      'placeholder="' +
      (config.placeholder || "0") +
      '" style="' +
      "padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);" +
      "border:2px solid var(--color-gray-200);background:var(--color-card-bg);" +
      "color:var(--color-primary-text);font-size:var(--font-size-base);width:160px;" +
      'transition:border-color 0.15s;" />' +
      (config.unit
        ? '<span style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' +
          config.unit +
          "</span>"
        : "") +
      "</div>";

    const submitBtn =
      '<button id="sim-numeric-submit" disabled style="' +
      "padding:var(--space-3) var(--space-6);border-radius:var(--radius-md);" +
      "background:var(--color-simulation);color:#fff;font-weight:700;" +
      "font-size:var(--font-size-sm);border:none;cursor:pointer;opacity:0.4;" +
      'transition:opacity 0.15s;">Submit &rarr;</button>';

    container.innerHTML = label + hint + inputRow + submitBtn;

    const input = container.querySelector("#sim-numeric-input");
    const submit = container.querySelector("#sim-numeric-submit");

    input.addEventListener("focus", () => {
      input.style.borderColor = "var(--color-simulation)";
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = "var(--color-gray-200)";
    });

    input.addEventListener("input", () => {
      const hasValue = input.value !== "" && parseFloat(input.value) > 0;
      submit.disabled = !hasValue;
      submit.style.opacity = hasValue ? "1" : "0.4";
    });

    submit.addEventListener("click", () => {
      const value = parseFloat(input.value);
      if (!isNaN(value) && value > 0) {
        this._applyDecision(value, "numeric");
      }
    });
  }

  // ── Decision handling ───────────────────────────────────────────────────────

  _applyDecision(answer, answerType) {
    const stage = this._currentStage();
    const state = this.state;
    let consequence, optionLabel;

    if (answerType === "single-choice") {
      consequence = answer.consequence(state);
      optionLabel =
        typeof answer.label === "function" ? answer.label(state) : answer.label;
    } else if (answerType === "multiple-choice") {
      const allMultiOptions = typeof stage.generateMultiOptions === "function" ? stage.generateMultiOptions(state) : [];
      consequence = stage.evaluateSelection(answer, state, allMultiOptions);
      optionLabel = answer
        .map((o) => (typeof o.label === "function" ? o.label(state) : o.label))
        .join("; ");
    } else if (answerType === "numeric") {
      const config = stage.numericConfig(state);
      consequence = config.evaluate(answer, state);
      optionLabel = answer.toString() + (config.unit ? " " + config.unit : "");
    }

    // Generate show work
    let showWorkSteps = null;
    if (typeof stage.showWork === "function") {
      showWorkSteps = stage.showWork(answer, answerType, state);
    }

    // Record decision
    state.decisions.push({
      stageId: stage.id,
      stageTitle: stage.title,
      answerType,
      optionLabel,
      score: consequence.score || "acceptable",
    });

    // Apply metric updates
    if (consequence.metricUpdates) {
      Object.assign(state.metrics, consequence.metricUpdates);
    }

    // Record consequence
    state.consequences.push({
      stageId: stage.id,
      narrative: consequence.narrative,
      detail: consequence.detail || null,
      score: consequence.score || "acceptable",
      selectionBreakdown: consequence.selectionBreakdown || null,
      showWorkSteps,
    });

    // Advance or complete
    const nextIndex = this._nextStageIndex(stage);
    if (nextIndex < 0 || nextIndex >= this.scenario.stages.length) {
      this.state.complete = true;
      this._renderConsequence(consequence, showWorkSteps, true);
    } else {
      this.state.stageIndex = nextIndex;
      this._renderConsequence(consequence, showWorkSteps, false);
    }
  }

  // ── Consequence rendering ───────────────────────────────────────────────────

  _renderConsequence(consequence, showWorkSteps, isFinal) {
    const scoreMeta = SCORE_META[consequence.score] || SCORE_META.acceptable;

    let html =
      '<div style="padding:var(--space-6) 0;">' +
      // Score badge
      '<div style="display:inline-flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);' +
      "border-radius:9999px;background:" +
      scoreMeta.bg +
      ";border:1px solid " +
      scoreMeta.color +
      ';margin-bottom:var(--space-4);">' +
      '<span style="font-weight:800;color:' +
      scoreMeta.color +
      ';">' +
      scoreMeta.icon +
      "</span>" +
      '<span style="font-size:var(--font-size-sm);font-weight:700;color:' +
      scoreMeta.color +
      ';">' +
      scoreMeta.label +
      " choice</span>" +
      "</div>" +
      // Narrative
      '<div style="background:var(--color-card-bg);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-5);margin-bottom:var(--space-4);">' +
      '<div style="font-size:var(--font-size-base);font-weight:700;color:var(--color-primary-text);margin-bottom:var(--space-3);">What happened</div>' +
      '<p style="margin:0;font-size:var(--font-size-sm);line-height:1.7;color:var(--color-primary-text);">' +
      consequence.narrative +
      "</p>" +
      (consequence.detail
        ? '<div style="margin-top:var(--space-3);">' +
          consequence.detail +
          "</div>"
        : "") +
      "</div>";

    // Selection breakdown for multiple choice
    if (
      consequence.selectionBreakdown &&
      consequence.selectionBreakdown.length > 0
    ) {
      html +=
        '<div style="margin-bottom:var(--space-4);">' +
        '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Selection Breakdown</div>';

      consequence.selectionBreakdown.forEach((item) => {
        // Derive color from correct boolean -- not from a score property
        const color = item.correct
          ? "var(--color-success)"
          : "var(--color-danger)";
        const bg = item.correct
          ? "var(--color-success-bg)"
          : "var(--color-danger-bg)";
        const icon = item.correct ? "✓" : "✗";
        const check = item.selected ? "☑" : "☐";
        const lbl = item.label || "—";

        html +=
          '<div style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);' +
          "border-radius:var(--radius-md);border:1px solid " +
          color +
          ";background:" +
          bg +
          ';margin-bottom:var(--space-2);">' +
          '<span style="font-weight:800;color:' +
          color +
          ';font-size:var(--font-size-sm);flex-shrink:0;">' +
          icon +
          "</span>" +
          "<div>" +
          '<div style="font-size:var(--font-size-sm);font-weight:700;color:var(--color-primary-text);">' +
          check +
          " " +
          lbl +
          "</div>" +
          (item.reason
            ? '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin-top:2px;">' +
              item.reason +
              "</div>"
            : "") +
          "</div>" +
          "</div>";
      });

      html += "</div>";
    }

    // Show work placeholder
    html +=
      '<div id="sim-show-work-area" style="margin-bottom:var(--space-4);"></div>';

    // Updated metrics
    html +=
      '<div style="margin-bottom:var(--space-5);">' +
      this._renderMetrics(
        this.state.metrics,
        Object.keys(consequence.metricUpdates || {}),
      ) +
      "</div>";

    // Continue / Debrief button
    html +=
      '<button id="sim-continue-btn" style="' +
      "padding:var(--space-3) var(--space-6);border-radius:var(--radius-md);" +
      "background:var(--color-simulation);color:#fff;font-weight:700;" +
      'font-size:var(--font-size-sm);border:none;cursor:pointer;">' +
      (isFinal ? "See Full Debrief &rarr;" : "Continue &rarr;") +
      "</button>" +
      "</div>";

    this.container.innerHTML = html;

    // Render show work using shared component
    if (showWorkSteps && showWorkSteps.length > 0) {
      const swArea = this.container.querySelector("#sim-show-work-area");
      if (swArea) {
        renderShowWork(swArea, showWorkSteps, {
          title: "Show Your Work",
          defaultOpen: true,
        });
      }
    }

    // Wire continue button
    const continueBtn = this.container.querySelector("#sim-continue-btn");
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        if (isFinal) this._renderDebrief();
        else this._renderStage();
      });
    }
  }

  // ── Debrief ─────────────────────────────────────────────────────────────────

  _renderDebrief() {
    const state = this.state;
    const rating = overallRating(state.decisions);
    const optimal = state.decisions.filter((d) => d.score === "optimal").length;
    const total = state.decisions.length;

    const decisionsHTML = state.decisions
      .map((d, i) => {
        const meta = SCORE_META[d.score] || SCORE_META.acceptable;
        const con = state.consequences[i];
        return (
          '<div style="border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-3);">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">' +
          '<div style="display:flex;align-items:center;gap:var(--space-2);">' +
          '<span style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);">' +
          d.stageTitle +
          "</span>" +
          answerTypeBadge(d.answerType) +
          "</div>" +
          '<span style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:9999px;background:' +
          meta.bg +
          ";color:" +
          meta.color +
          ';">' +
          meta.label +
          "</span>" +
          "</div>" +
          '<div style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-primary-text);margin-bottom:var(--space-1);">' +
          d.optionLabel +
          "</div>" +
          (con
            ? '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' +
              con.narrative +
              "</div>"
            : "") +
          "</div>"
        );
      })
      .join("");

    const chaptersHTML = (this.scenario.reviewChapters || [])
      .map(
        (c) =>
          '<a href="' +
          c.href +
          '" style="display:inline-flex;align-items:center;gap:var(--space-2);' +
          "font-size:var(--font-size-xs);font-weight:600;color:var(--color-accent);text-decoration:none;" +
          'padding:var(--space-2) var(--space-3);border:1px solid var(--color-accent);border-radius:var(--radius-sm);">' +
          c.label +
          " &rarr;</a>",
      )
      .join("");

    this.container.innerHTML =
      '<div style="padding:var(--space-6) 0;">' +
      // ── Debrief header ──
      '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5);">' +
      '<div style="flex:1;height:2px;background:var(--color-simulation);border-radius:9999px;"></div>' +
      '<span style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;' +
      'color:var(--color-simulation);letter-spacing:0.1em;white-space:nowrap;">Simulation Complete — Debrief</span>' +
      '<div style="flex:1;height:2px;background:var(--color-simulation);border-radius:9999px;"></div>' +
      "</div>" +
      // Overall rating
      '<div style="text-align:center;padding:var(--space-6);background:var(--color-card-bg);border:1px solid var(--color-gray-200);border-radius:var(--radius-lg);margin-bottom:var(--space-6);">' +
      '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Your Overall Rating</div>' +
      '<div style="font-size:var(--font-size-3xl);font-weight:800;color:' +
      rating.color +
      ';margin-bottom:var(--space-2);">' +
      rating.label +
      "</div>" +
      '<div style="font-size:var(--font-size-sm);color:var(--color-gray-500);">' +
      optimal +
      " of " +
      total +
      " optimal decisions</div>" +
      '<div style="height:8px;background:var(--color-gray-200);border-radius:9999px;margin:var(--space-4) auto;max-width:300px;">' +
      '<div style="height:8px;background:' +
      rating.color +
      ";border-radius:9999px;width:" +
      Math.round(rating.pct * 100) +
      '%;"></div>' +
      "</div>" +
      "</div>" +
      // Decision log
      '<h4 style="color:var(--color-primary-text);margin-bottom:var(--space-3);">Your Decisions</h4>' +
      decisionsHTML +
      // Final metrics
      '<h4 style="color:var(--color-primary-text);margin-top:var(--space-5);margin-bottom:var(--space-3);">Final State</h4>' +
      this._renderMetrics(state.metrics, []) +
      // Review chapters
      (chaptersHTML
        ? '<div style="margin-top:var(--space-5);">' +
          '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Review These Concepts</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:var(--space-2);">' +
          chaptersHTML +
          "</div>" +
          "</div>"
        : "") +
      // Actions
      '<div style="margin-top:var(--space-6);display:flex;gap:var(--space-3);">' +
      '<button id="sim-reset-btn" style="padding:var(--space-3) var(--space-6);border-radius:var(--radius-md);background:var(--color-gray-100);color:var(--color-primary-text);font-weight:700;font-size:var(--font-size-sm);border:1px solid var(--color-gray-200);cursor:pointer;">&#8635; Try Again</button>' +
      '<a href="' + import.meta.env.BASE_URL + 'pages/apply/" style="padding:var(--space-3) var(--space-6);border-radius:var(--radius-md);background:var(--color-card-bg);color:var(--color-primary-text);font-weight:700;font-size:var(--font-size-sm);border:1px solid var(--color-gray-200);text-decoration:none;display:inline-flex;align-items:center;">All Scenarios &rarr;</a>' +
      "</div>" +
      "</div>";

    this.container
      .querySelector("#sim-reset-btn")
      .addEventListener("click", () => this.reset());
  }

  // ── Metrics renderer ────────────────────────────────────────────────────────

  _renderMetrics(metrics, highlightKeys) {
    const display = this.scenario.metricDisplay;
    if (!display || display.length === 0) return "";

    const tiles = display
      .map((m) => {
        const value = metrics[m.key];
        const highlight = highlightKeys.includes(m.key);
        const isPoor = typeof m.poorIf === "function" ? m.poorIf(value) : false;

        let formatted;
        if (m.format === "currency")
          formatted = value !== 0 ? fmt(value) : "--";
        else if (m.format === "percent") formatted = fmtPct(value);
        else if (m.format === "number")
          formatted = value !== 0 ? fmtN(value) : "--";
        else formatted = value !== null && value !== undefined ? value : "--";

        const bg = isPoor
          ? "var(--color-poor-bg)"
          : highlight
            ? "var(--color-warning-bg)"
            : "var(--color-gray-50)";
        const border = isPoor
          ? "var(--color-poor)"
          : highlight
            ? "var(--color-warning)"
            : "var(--color-gray-200)";
        const color = isPoor
          ? "var(--color-poor)"
          : highlight
            ? "var(--color-warning)"
            : "var(--color-primary-text)";

        return (
          '<div style="background:' +
          bg +
          ";border:1px solid " +
          border +
          ';border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">' +
          '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-1);">' +
          m.label +
          "</div>" +
          '<div style="font-size:var(--font-size-lg);font-weight:800;color:' +
          color +
          ';">' +
          formatted +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--space-3);">' +
      tiles +
      "</div>"
    );
  }
}
