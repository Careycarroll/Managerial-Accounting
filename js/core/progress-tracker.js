/**
 * progress-tracker.js
 * Tracks student progress through Learn chapters and Apply scenarios.
 */
const STORAGE_KEY = 'ma-progress';

const DEFAULT_PROGRESS = {
  chapters: {
    ch01:false,ch02:false,ch03:false,ch04:false,ch05:false,ch06:false,
    ch07:false,ch08:false,ch09:false,ch10:false,ch11:false,ch12:false,
    ch13:false,ch14:false,ch15:false,ch16:false,ch17:false,ch18:false,
    ch19:false,ch20:false,ch21:false,ch22:false,ch23:false,ch24:false,
  },
  scenarios: {
    'what-does-it-cost':       {concept:false,analysis:false,simulation:false},
    'will-we-break-even':      {concept:false,analysis:false,simulation:false},
    'whats-our-plan':          {concept:false,analysis:false,simulation:false},
    'did-we-hit-our-plan':     {concept:false,analysis:false,simulation:false},
    'make-or-buy':             {concept:false,analysis:false,simulation:false},
    'what-should-we-charge':   {concept:false,analysis:false,simulation:false},
    'which-customers':         {concept:false,analysis:false,simulation:false},
    'managing-inventory':      {concept:false,analysis:false,simulation:false},
    'is-investment-worth-it':  {concept:false,analysis:false,simulation:false},
    'measuring-performance':   {concept:false,analysis:false,simulation:false},
    'what-do-costs-tell-us':   {concept:false,analysis:false,simulation:false},
    'are-we-producing-quality':{concept:false,analysis:false,simulation:false},
  },
  lastVisited: null,
};

export function getProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(DEFAULT_PROGRESS);
    return {...structuredClone(DEFAULT_PROGRESS),...JSON.parse(stored) };
  } catch { return structuredClone(DEFAULT_PROGRESS); }
}

export function markChapterComplete(chapterId) {
  const p = getProgress();
  p.chapters[chapterId] = true;
  p.lastVisited = chapterId;
  _save(p);
}

export function markScenarioComplete(scenarioId, depth) {
  const p = getProgress();
  if (p.scenarios[scenarioId]) p.scenarios[scenarioId][depth] = true;
  _save(p);
}

export function isChapterComplete(chapterId) {
  return getProgress().chapters[chapterId] === true;
}

export function getCompletedChapterCount() {
  return Object.values(getProgress().chapters).filter(Boolean).length;
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

function _save(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}
