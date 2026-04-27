/**
 * main.js — Landing page entry point
 */
import { getCompletedChapterCount } from './progress-tracker.js';

function initLandingPage() {
  const completed = getCompletedChapterCount();
  const total = 24;
  const pct = Math.round((completed / total) * 100);
  const bar = document.getElementById('learn-progress');
  const label = document.getElementById('learn-progress-label');
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${completed} of ${total} chapters completed`;
}

initLandingPage();
