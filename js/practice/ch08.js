// js/practice/ch08.js
// Wires the Ch. 8 practice page.
// Conforms to js/practice/SPEC.md (Pass 2).

import { initHeader } from "/js/components/header.js";
import { PracticeEngine } from "./practice-engine.js";
import { ch08Problems } from "./ch08-problems.js";

const BASE = import.meta.env.BASE_URL;

const pickerView = document.getElementById("practice-picker-view");
const pickerGrid = document.getElementById("practice-picker");
const problemView = document.getElementById("practice-problem-view");

let engine = null;

function difficultyLabel(d) {
  if (d === "intermediate") return "Intermediate";
  if (d === "advanced") return "Advanced";
  return "Foundation";
}

function renderPicker() {
  pickerGrid.innerHTML = ch08Problems
    .map((problem) => {
      const minutes = problem.estimatedMinutes ?? 7;
      const stepCount = problem.steps.length;
      return `
      <button class="practice-picker-tile" data-problem-id="${problem.id}" type="button">
        <div class="practice-picker-tile__label">${difficultyLabel(problem.difficulty)}</div>
        <h3 class="practice-picker-tile__title">${problem.title}</h3>
        <p class="practice-picker-tile__desc">${problem.description || ""}</p>
        <div class="practice-picker-tile__meta">
          <span class="practice-picker-tile__meta-time">~${minutes} min · ${stepCount} steps</span>
          <span class="practice-picker-tile__cta">Start &rarr;</span>
        </div>
      </button>
    `;
    })
    .join("");

  pickerGrid.querySelectorAll(".practice-picker-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const id = tile.dataset.problemId;
      const problem = ch08Problems.find((p) => p.id === id);
      if (problem) startProblem(problem);
    });
  });
}

function startProblem(problem) {
  pickerView.classList.add("practice-picker--hidden");
  problemView.classList.remove("practice-problem-container--hidden");
  if (!engine) engine = new PracticeEngine();
  engine.init(problem, problemView);
  problemView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function returnToPicker() {
  problemView.classList.add("practice-problem-container--hidden");
  problemView.innerHTML = "";
  pickerView.classList.remove("practice-picker--hidden");
  pickerView.scrollIntoView({ behavior: "smooth", block: "start" });
}

problemView.addEventListener("practice:back-to-picker", returnToPicker);

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  renderPicker();
});
