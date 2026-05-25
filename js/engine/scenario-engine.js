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
  },
  acceptable: {
    label: "Acceptable",
    color: "var(--color-warning)",
    bg: "var(--color-warning-bg)",
    icon: "~",
  },
  suboptimal: {
    label: "Suboptimal",
    color: "var(--color-danger)",
    bg: "var(--color-danger-bg)",
    icon: "✗",
  },
};

function overallRating(decisions) {
  const total = decisions.length;
  if (total === 0)
    return { label: "No decisions", color: "var(--color-gray-500)", pct: 0 };
  const optimal = decisions.filter((d) => d.score === "optimal").length;
  const pct = optimal / total;
  if (pct >= 0.8)
    return {
      label: "Expert decision-maker",
      color: "var(--color-success)",
      pct,
    };
  if (pct >= 0.6)
    return { label: "Sound reasoning", color: "var(--color-warning)", pct };
  return { label: "Review key concepts", color: "var(--color-danger)", pct };
}

// ── Deep clone state metrics safely ──────────────────────────────────────────

function cloneMetrics(metrics) {
  return JSON.parse(JSON.stringify(metrics));
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
    return {
      scenarioId: this.scenario.id,
      stageIndex: 0,
      decisions: [],
      consequences: [],
      metrics: cloneMetrics(this.scenario.initialMetrics),
      complete: false,
    };
  }

  _currentStage() {
    return this.scenario.stages[this.state.stageIndex];
  }

  _nextStageIndex(stage) {
    if (typeof stage.nextStage === "function") {
      const nextId = stage.nextStage(this.state);
      return this.scenario.stages.findIndex((s) => s.id === nextId);
    }
    if (typeof stage.nextStage === "string") {
      return this.scenario.stages.findIndex((s) => s.id === stage.nextStage);
    }
    // Linear -- just advance
    return this.state.stageIndex + 1;
  }

  // ── Decision handling ───────────────────────────────────────────────────────

  _applyDecision(option) {
    const stage = this._currentStage();
    const consequence = option.consequence(this.state);

    // Record decision
    this.state.decisions.push({
      stageId: stage.id,
      stageTitle: stage.title,
      optionLabel: option.label,
      score: consequence.score || "acceptable",
    });

    // Apply metric updates
    if (consequence.metricUpdates) {
      Object.assign(this.state.metrics, consequence.metricUpdates);
    }

    // Record consequence
    this.state.consequences.push({
      stageId: stage.id,
      narrative: consequence.narrative,
      detail: consequence.detail || null,
      score: consequence.score || "acceptable",
    });

    // Advance or complete
    const nextIndex = this._nextStageIndex(stage);
    if (nextIndex < 0 || nextIndex >= this.scenario.stages.length) {
      this.state.complete = true;
      this._renderConsequence(consequence, true);
    } else {
      this.state.stageIndex = nextIndex;
      this._renderConsequence(consequence, false);
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  _renderStage() {
    const stage = this._currentStage();
    const state = this.state;
    const total = this.scenario.stages.length;
    const current = state.stageIndex + 1;

    const contextHTML =
      typeof stage.context === "function"
        ? stage.context(state)
        : stage.context;

    const optionsHTML = stage.options
      .map(
        (opt, i) =>
          '<button class="sim-option-btn" data-option-index="' +
          i +
          '" style="' +
          "display:block;width:100%;text-align:left;padding:var(--space-4);" +
          "margin-bottom:var(--space-3);border-radius:var(--radius-md);" +
          "border:2px solid var(--color-gray-200);background:var(--color-card-bg);" +
          "color:var(--color-primary-text);font-size:var(--font-size-sm);" +
          'cursor:pointer;transition:border-color 0.15s,background 0.15s;">' +
          '<div style="font-weight:700;margin-bottom:var(--space-1);">' +
          opt.label +
          "</div>" +
          (opt.sublabel
            ? '<div style="font-size:var(--font-size-xs);color:var(--color-gray-500);">' +
              opt.sublabel +
              "</div>"
            : "") +
          "</button>",
      )
      .join("");

    const metricsHTML = this._renderMetrics(
      state.metrics,
      stage.highlightMetrics || [],
    );

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
      // Options
      '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Your Decision</div>' +
      optionsHTML +
      "</div>";

    // Wire option buttons
    this.container.querySelectorAll(".sim-option-btn").forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.borderColor = "var(--color-simulation)";
        btn.style.background = "var(--color-gray-50)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderColor = "var(--color-gray-200)";
        btn.style.background = "var(--color-card-bg)";
      });
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.optionIndex, 10);
        this._applyDecision(stage.options[idx]);
      });
    });
  }

  _renderConsequence(consequence, isFinal) {
    const scoreMeta = SCORE_META[consequence.score] || SCORE_META.acceptable;
    const stage =
      this.scenario.stages[this.state.stageIndex - (isFinal ? 0 : 0)];

    this.container.innerHTML =
      '<div style="padding:var(--space-6) 0;">' +
      // Score badge
      '<div style="display:inline-flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);border-radius:9999px;background:' +
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
      // Consequence narrative
      '<div style="background:var(--color-card-bg);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-5);margin-bottom:var(--space-5);">' +
      '<div style="font-size:var(--font-size-base);font-weight:700;color:var(--color-primary-text);margin-bottom:var(--space-3);">What happened</div>' +
      '<p style="margin:0;font-size:var(--font-size-sm);line-height:1.7;color:var(--color-primary-text);">' +
      consequence.narrative +
      "</p>" +
      (consequence.detail
        ? '<div style="margin-top:var(--space-3);">' +
          consequence.detail +
          "</div>"
        : "") +
      "</div>" +
      // Updated metrics
      '<div style="margin-bottom:var(--space-5);">' +
      this._renderMetrics(
        this.state.metrics,
        Object.keys(consequence.metricUpdates || {}),
      ) +
      "</div>" +
      // Continue / Debrief button
      '<button id="sim-continue-btn" style="' +
      "padding:var(--space-3) var(--space-6);border-radius:var(--radius-md);" +
      "background:var(--color-simulation);color:#fff;font-weight:700;" +
      'font-size:var(--font-size-sm);border:none;cursor:pointer;">' +
      (isFinal ? "See Full Debrief &rarr;" : "Continue &rarr;") +
      "</button>" +
      "</div>";

    const continueBtn = this.container.querySelector("#sim-continue-btn");
    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        if (isFinal) {
          this._renderDebrief();
        } else {
          this._renderStage();
        }
      });
    }
  }

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
          '<span style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);">' +
          d.stageTitle +
          "</span>" +
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
          '" style="display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--font-size-xs);font-weight:600;color:var(--color-accent);text-decoration:none;padding:var(--space-2) var(--space-3);border:1px solid var(--color-accent);border-radius:var(--radius-sm);">' +
          c.label +
          " &rarr;</a>",
      )
      .join("");

    this.container.innerHTML =
      '<div style="padding:var(--space-6) 0;">' +
      // Overall rating
      '<div style="text-align:center;padding:var(--space-6);background:var(--color-card-bg);border:1px solid var(--color-gray-200);border-radius:var(--radius-lg);margin-bottom:var(--space-6);">' +
      '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Simulation Complete</div>' +
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
      // Review links
      (chaptersHTML
        ? '<div style="margin-top:var(--space-5);"><div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-3);">Review These Concepts</div><div style="display:flex;flex-wrap:wrap;gap:var(--space-2);">' +
          chaptersHTML +
          "</div></div>"
        : "") +
      // Try again
      '<div style="margin-top:var(--space-6);display:flex;gap:var(--space-3);">' +
      '<button id="sim-reset-btn" style="padding:var(--space-3) var(--space-6);border-radius:var(--radius-md);background:var(--color-gray-100);color:var(--color-primary-text);font-weight:700;font-size:var(--font-size-sm);border:1px solid var(--color-gray-200);cursor:pointer;">Try Again</button>' +
      '<a href="/pages/apply/" style="padding:var(--space-3) var(--space-6);border-radius:var(--radius-md);background:var(--color-card-bg);color:var(--color-primary-text);font-weight:700;font-size:var(--font-size-sm);border:1px solid var(--color-gray-200);text-decoration:none;display:inline-flex;align-items:center;">All Scenarios &rarr;</a>' +
      "</div>" +
      "</div>";

    this.container
      .querySelector("#sim-reset-btn")
      .addEventListener("click", () => this.reset());
  }

  // ── Metrics renderer ────────────────────────────────────────────────────────
  // Scenario can define metricDisplay to control which metrics show and how.
  // metricDisplay: [{ key, label, format }]
  // format: 'currency' | 'number' | 'percent' | 'raw'

  _renderMetrics(metrics, highlightKeys) {
    const display = this.scenario.metricDisplay;
    if (!display || display.length === 0) return "";

    const tiles = display
      .map((m) => {
        const value = metrics[m.key];
        const highlight = highlightKeys.includes(m.key);
        let formatted;
        if (m.format === "currency") formatted = fmt(value);
        else if (m.format === "percent") formatted = fmtPct(value);
        else if (m.format === "number") formatted = fmtN(value);
        else formatted = value;

        return (
          '<div style="background:' +
          (highlight ? "var(--color-warning-bg)" : "var(--color-gray-50)") +
          ";" +
          "border:1px solid " +
          (highlight ? "var(--color-warning)" : "var(--color-gray-200)") +
          ";" +
          'border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">' +
          '<div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:var(--color-gray-500);margin-bottom:var(--space-1);">' +
          m.label +
          "</div>" +
          '<div style="font-size:var(--font-size-lg);font-weight:800;color:' +
          (highlight ? "var(--color-warning)" : "var(--color-primary-text)") +
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
