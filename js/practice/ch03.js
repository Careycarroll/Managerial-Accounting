// js/practice/ch03.js
// Wires the Ch. 3 practice page:
//  - Renders picker tiles from ch03Problems
//  - On tile click: hides picker, shows problem container, inits PracticeEngine
//  - Listens for 'practice:back-to-picker' event from engine summary screen
//
// Conforms to js/practice/SPEC.md.

import { initHeader } from '/js/components/header.js';
import { PracticeEngine } from './practice-engine.js';
import { ch03Problems } from './ch03-problems.js';

const BASE = import.meta.env.BASE_URL;

// ============================================================================
// DOM references
// ============================================================================

const pickerView    = document.getElementById('practice-picker-view');
const pickerGrid    = document.getElementById('practice-picker');
const problemView   = document.getElementById('practice-problem-view');

let engine = null;

// ============================================================================
// Picker tile rendering
// ============================================================================

function renderPicker() {
  pickerGrid.innerHTML = ch03Problems.map((problem) => {
    const minutes = problem.estimatedMinutes ?? 5;
    const stepCount = problem.steps.length;
    return `
      <button class="practice-picker-tile" data-problem-id="${problem.id}" type="button">
        <div class="practice-picker-tile__label">Foundation</div>
        <h3 class="practice-picker-tile__title">${problem.title}</h3>
        <p class="practice-picker-tile__desc">${problem.description || ''}</p>
        <div class="practice-picker-tile__meta">
          <span class="practice-picker-tile__meta-time">~${minutes} min · ${stepCount} steps</span>
          <span class="practice-picker-tile__cta">Start &rarr;</span>
        </div>
      </button>
    `;
  }).join('');

  pickerGrid.querySelectorAll('.practice-picker-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      const id = tile.dataset.problemId;
      const problem = ch03Problems.find((p) => p.id === id);
      if (problem) startProblem(problem);
    });
  });
}

// ============================================================================
// Problem lifecycle
// ============================================================================

function startProblem(problem) {
  pickerView.classList.add('practice-picker--hidden');
  problemView.classList.remove('practice-problem-container--hidden');

  if (!engine) {
    engine = new PracticeEngine();
  }
  engine.init(problem, problemView);

  // Scroll the problem into view (helpful on mobile after picker collapse)
  problemView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function returnToPicker() {
  problemView.classList.add('practice-problem-container--hidden');
  problemView.innerHTML = '';
  pickerView.classList.remove('practice-picker--hidden');
  pickerView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================================
// Wire events
// ============================================================================

// Engine dispatches this from the summary screen's "Try Different Problem" button
// AND from the problem header's "Back to problems" button.
problemView.addEventListener('practice:back-to-picker', returnToPicker);

// ============================================================================
// Bootstrap
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  renderPicker();
});
