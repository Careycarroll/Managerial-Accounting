
import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initSettingsPanel } from '/js/components/settings-panel.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtD   = n => n >= 0 ? fmt(n) : '(' + fmt(n) + ')';
const fmtPct = n => (n * 100).toFixed(1) + '%';
const fmtN   = n => Math.round(n).toLocaleString();

function getOrCreate(id, tag, className, parent) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tag || 'div');
    el.id = id;
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
  }
  return el;
}

const el   = id => document.getElementById(id);
const val  = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
const sval = id => { const n = el(id); return n ? n.value.trim() : ''; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

// panel wrapper helper — stacks on narrow, side-by-side on wide
function panelGrid(innerHTML) {
  return '<div style="overflow-x:auto;">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);align-items:start;">'
    + innerHTML
    + '</div></div>';
}

function panel(title, bodyHTML, noteHTML) {
  return '<div style="flex:1 1 300px;min-width:280px;background:var(--color-gray-50,#f9fafb);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-3);color:var(--color-primary);">' + title + '</div>'
    + '<div style="overflow-x:auto;">' + bodyHTML + '</div>'
    + (noteHTML ? '<p style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin:var(--space-3) 0 0;font-style:italic;">' + noteHTML + '</p>' : '')
    + '</div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Support Department Allocation Engine
// ══════════════════════════════════════════════════════════════════════════════

function updateAllocationLabels() {
  const sd1 = sval('sd1-name') || 'SD1';
  const sd2 = sval('sd2-name') || 'SD2';
  const od1 = sval('od1-name') || 'OD1';
  const od2 = sval('od2-name') || 'OD2';
  const set = (id, txt) => { const n = el(id); if (n) n.textContent = txt; };
  set('col-sd1-label', sd1.substring(0, 6));
  set('col-sd2-label', sd2.substring(0, 6));
  set('col-od1-label', od1.substring(0, 6));
  set('col-od2-label', od2.substring(0, 6));
  set('row-sd1-label', sd1 + ' provides:');
  set('row-sd2-label', sd2 + ' provides:');
}

function getAllocInputs() {
  return {
    sd1Name: sval('sd1-name') || 'Information Systems',
    sd2Name: sval('sd2-name') || 'Administration',
    od1Name: sval('od1-name') || 'Manufacturing',
    od2Name: sval('od2-name') || 'Marketing',
    sd1Cost: val('sd1-cost'),
    sd2Cost: val('sd2-cost'),
    sd1ToSd1: val('sd1-to-sd1') / 100,
    sd1ToSd2: val('sd1-to-sd2') / 100,
    sd1ToOd1: val('sd1-to-od1') / 100,
    sd1ToOd2: val('sd1-to-od2') / 100,
    sd2ToSd1: val('sd2-to-sd1') / 100,
    sd2ToSd2: val('sd2-to-sd2') / 100,
    sd2ToOd1: val('sd2-to-od1') / 100,
    sd2ToOd2: val('sd2-to-od2') / 100,
  };
}

function validateUsage(inputs) {
  const row1 = inputs.sd1ToSd1 + inputs.sd1ToSd2 + inputs.sd1ToOd1 + inputs.sd1ToOd2;
  const row2 = inputs.sd2ToSd1 + inputs.sd2ToSd2 + inputs.sd2ToOd1 + inputs.sd2ToOd2;
  return { row1Valid: Math.abs(row1 - 1) < 0.01, row2Valid: Math.abs(row2 - 1) < 0.01, row1, row2 };
}

function directMethod(inputs) {
  const { sd1Cost, sd2Cost, sd1ToOd1, sd1ToOd2, sd2ToOd1, sd2ToOd2 } = inputs;
  const sd1Total = sd1ToOd1 + sd1ToOd2;
  const sd2Total = sd2ToOd1 + sd2ToOd2;
  const sd1ToOd1Direct = sd1Total > 0 ? (sd1ToOd1 / sd1Total) * sd1Cost : 0;
  const sd1ToOd2Direct = sd1Total > 0 ? (sd1ToOd2 / sd1Total) * sd1Cost : 0;
  const sd2ToOd1Direct = sd2Total > 0 ? (sd2ToOd1 / sd2Total) * sd2Cost : 0;
  const sd2ToOd2Direct = sd2Total > 0 ? (sd2ToOd2 / sd2Total) * sd2Cost : 0;
  return {
    od1Total: sd1ToOd1Direct + sd2ToOd1Direct,
    od2Total: sd1ToOd2Direct + sd2ToOd2Direct,
    sd1ToOd1: sd1ToOd1Direct, sd1ToOd2: sd1ToOd2Direct,
    sd2ToOd1: sd2ToOd1Direct, sd2ToOd2: sd2ToOd2Direct,
    sd1ToSd2: 0, sd2ToSd1: 0,
  };
}

function stepDownMethod(inputs) {
  const { sd1Cost, sd2Cost, sd1ToSd2, sd1ToOd1, sd1ToOd2, sd2ToOd1, sd2ToOd2 } = inputs;
  const sd1Total = sd1ToSd2 + sd1ToOd1 + sd1ToOd2;
  const sd1ToSd2Amt = sd1Total > 0 ? (sd1ToSd2 / sd1Total) * sd1Cost : 0;
  const sd1ToOd1Amt = sd1Total > 0 ? (sd1ToOd1 / sd1Total) * sd1Cost : 0;
  const sd1ToOd2Amt = sd1Total > 0 ? (sd1ToOd2 / sd1Total) * sd1Cost : 0;
  const sd2Adjusted = sd2Cost + sd1ToSd2Amt;
  const sd2Total = sd2ToOd1 + sd2ToOd2;
  const sd2ToOd1Amt = sd2Total > 0 ? (sd2ToOd1 / sd2Total) * sd2Adjusted : 0;
  const sd2ToOd2Amt = sd2Total > 0 ? (sd2ToOd2 / sd2Total) * sd2Adjusted : 0;
  return {
    od1Total: sd1ToOd1Amt + sd2ToOd1Amt,
    od2Total: sd1ToOd2Amt + sd2ToOd2Amt,
    sd1ToOd1: sd1ToOd1Amt, sd1ToOd2: sd1ToOd2Amt,
    sd2ToOd1: sd2ToOd1Amt, sd2ToOd2: sd2ToOd2Amt,
    sd1ToSd2: sd1ToSd2Amt, sd2ToSd1: 0, sd2Adjusted,
  };
}

function reciprocalMethod(inputs) {
  const { sd1Cost, sd2Cost, sd1ToSd2, sd2ToSd1, sd1ToOd1, sd1ToOd2, sd2ToOd1, sd2ToOd2 } = inputs;
  const denom = 1 - sd2ToSd1 * sd1ToSd2;
  const s1 = denom !== 0 ? (sd1Cost + sd2ToSd1 * sd2Cost) / denom : sd1Cost;
  const s2 = sd2Cost + sd1ToSd2 * s1;
  return {
    od1Total: sd1ToOd1 * s1 + sd2ToOd1 * s2,
    od2Total: sd1ToOd2 * s1 + sd2ToOd2 * s2,
    sd1ToOd1: sd1ToOd1 * s1, sd1ToOd2: sd1ToOd2 * s1,
    sd2ToOd1: sd2ToOd1 * s2, sd2ToOd2: sd2ToOd2 * s2,
    sd1ToSd2: sd1ToSd2 * s1, sd2ToSd1: sd2ToSd1 * s2,
    s1, s2,
  };
}

function calcAllocation() {
  const inputs = getAllocInputs();
  const valid  = validateUsage(inputs);
  const outEl  = getOrCreate('alloc-output', 'div', 'tool-output', el('alloc-calculate').parentElement);

  if (!valid.row1Valid || !valid.row2Valid) {
    outEl.innerHTML = '<div style="background:var(--color-danger-bg,#fef2f2);border:1px solid var(--color-danger,#ef4444);padding:var(--space-4);border-radius:var(--radius-md);">'
      + '<strong>Usage percentages must sum to 100%.</strong><br>'
      + inputs.sd1Name + ' row sums to ' + Math.round(valid.row1 * 100) + '%.<br>'
      + inputs.sd2Name + ' row sums to ' + Math.round(valid.row2 * 100) + '%.'
      + '</div>';
    return;
  }

  const direct   = directMethod(inputs);
  const stepDown = stepDownMethod(inputs);
  const recip    = reciprocalMethod(inputs);

  function methodTable(label, result, note) {
    const tableHTML = '<table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">'
      + '<thead><tr>'
      + '<th style="text-align:left;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Flow</th>'
      + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Amount</th>'
      + '</tr></thead>'
      + '<tbody>'
      + (result.sd1ToSd2 > 0.5 ? '<tr><td style="padding:var(--space-1) var(--space-2);">' + inputs.sd1Name + ' to ' + inputs.sd2Name + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(result.sd1ToSd2) + '</td></tr>' : '')
      + (result.sd2ToSd1 > 0.5 ? '<tr><td style="padding:var(--space-1) var(--space-2);">' + inputs.sd2Name + ' to ' + inputs.sd1Name + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(result.sd2ToSd1) + '</td></tr>' : '')
      + '<tr><td style="padding:var(--space-1) var(--space-2);">' + inputs.sd1Name + ' to ' + inputs.od1Name + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(result.sd1ToOd1) + '</td></tr>'
      + '<tr><td style="padding:var(--space-1) var(--space-2);">' + inputs.sd1Name + ' to ' + inputs.od2Name + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(result.sd1ToOd2) + '</td></tr>'
      + '<tr><td style="padding:var(--space-1) var(--space-2);">' + inputs.sd2Name + ' to ' + inputs.od1Name + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(result.sd2ToOd1) + '</td></tr>'
      + '<tr><td style="padding:var(--space-1) var(--space-2);">' + inputs.sd2Name + ' to ' + inputs.od2Name + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(result.sd2ToOd2) + '</td></tr>'
      + '</tbody>'
      + '<tfoot>'
      + '<tr style="border-top:2px solid var(--color-gray-300);font-weight:700;"><td style="padding:var(--space-2);">' + inputs.od1Name + ' receives</td><td style="text-align:right;padding:var(--space-2);color:var(--color-primary);">' + fmt(result.od1Total) + '</td></tr>'
      + '<tr style="font-weight:700;"><td style="padding:var(--space-1) var(--space-2);">' + inputs.od2Name + ' receives</td><td style="text-align:right;padding:var(--space-1) var(--space-2);color:var(--color-primary);">' + fmt(result.od2Total) + '</td></tr>'
      + '<tr style="border-top:1px solid var(--color-gray-200);"><td style="padding:var(--space-1) var(--space-2);font-size:var(--font-size-xs);color:var(--color-gray-500);">Total allocated</td><td style="text-align:right;padding:var(--space-1) var(--space-2);font-size:var(--font-size-xs);color:var(--color-gray-500);">' + fmt(result.od1Total + result.od2Total) + '</td></tr>'
      + '</tfoot>'
      + '</table>';
    return panel(label, tableHTML, note);
  }

  const recipNote = 'Fully reciprocal costs: ' + inputs.sd1Name + ' = ' + fmt(recip.s1) + ', ' + inputs.sd2Name + ' = ' + fmt(recip.s2);

  outEl.innerHTML = '<div style="margin-top:var(--space-5);">'
    + panelGrid(
        methodTable('Direct Method', direct, 'Ignores all inter-support-department services.')
        + methodTable('Step-Down Method', stepDown, inputs.sd1Name + ' allocated first (includes service to ' + inputs.sd2Name + '). ' + inputs.sd2Name + ' adjusted cost: ' + fmt(stepDown.sd2Adjusted || 0) + '.')
        + methodTable('Reciprocal Method', recip, recipNote)
      )
    + '<div style="margin-top:var(--space-4);padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);border:1px solid var(--color-gray-200);">'
    + '<strong>Method Comparison:</strong> '
    + inputs.od1Name + ' receives '
    + fmt(direct.od1Total) + ' (direct), '
    + fmt(stepDown.od1Total) + ' (step-down), '
    + fmt(recip.od1Total) + ' (reciprocal). '
    + inputs.od2Name + ' receives '
    + fmt(direct.od2Total) + ' (direct), '
    + fmt(stepDown.od2Total) + ' (step-down), '
    + fmt(recip.od2Total) + ' (reciprocal). '
    + 'The reciprocal method is most accurate because it fully recognizes mutual services between support departments.'
    + '</div>'
    + '</div>';

  renderShowWork(el('alloc-show-work'), [
    { label: 'Direct Method: ' + inputs.od1Name, formula: 'SD1 cost x (SD1-to-OD1 / (SD1-to-OD1 + SD1-to-OD2)) + SD2 cost x (SD2-to-OD1 / (SD2-to-OD1 + SD2-to-OD2))', values: fmt(direct.sd1ToOd1) + ' + ' + fmt(direct.sd2ToOd1), result: fmt(direct.od1Total) },
    { label: 'Step-Down: ' + inputs.sd2Name + ' adjusted cost', formula: inputs.sd2Name + ' original + ' + inputs.sd1Name + ' allocated to ' + inputs.sd2Name, values: fmt(inputs.sd2Cost) + ' + ' + fmt(stepDown.sd1ToSd2), result: fmt(stepDown.sd2Adjusted || 0) },
    { label: 'Reciprocal: Fully reciprocated ' + inputs.sd1Name + ' cost', formula: '(SD1 + SD2-to-SD1 x SD2) / (1 - SD2-to-SD1 x SD1-to-SD2)', values: fmt(inputs.sd1Cost) + ' + ' + fmtPct(inputs.sd2ToSd1) + ' x ' + fmt(inputs.sd2Cost), result: fmt(recip.s1), highlight: true },
    { label: 'Reciprocal: Fully reciprocated ' + inputs.sd2Name + ' cost', formula: 'SD2 + SD1-to-SD2 x S1', values: fmt(inputs.sd2Cost) + ' + ' + fmtPct(inputs.sd1ToSd2) + ' x ' + fmt(recip.s1), result: fmt(recip.s2) },
    { label: 'Reciprocal: ' + inputs.od1Name + ' receives', formula: 'SD1-to-OD1 x S1 + SD2-to-OD1 x S2', values: fmtPct(inputs.sd1ToOd1) + ' x ' + fmt(recip.s1) + ' + ' + fmtPct(inputs.sd2ToOd1) + ' x ' + fmt(recip.s2), result: fmt(recip.od1Total), highlight: true },
    { label: 'Reciprocal: ' + inputs.od2Name + ' receives', formula: 'SD1-to-OD2 x S1 + SD2-to-OD2 x S2', values: fmtPct(inputs.sd1ToOd2) + ' x ' + fmt(recip.s1) + ' + ' + fmtPct(inputs.sd2ToOd2) + ' x ' + fmt(recip.s2), result: fmt(recip.od2Total), highlight: true },
  ], { title: 'Allocation Method Calculations', defaultOpen: false });
}

function initAllocationEngine() {
  const calcBtn = el('alloc-calculate');
  if (!calcBtn) return;

  ['sd1-name','sd2-name','od1-name','od2-name'].forEach(id => {
    const n = el(id);
    if (n) n.addEventListener('input', updateAllocationLabels);
  });

  el('alloc-load-example') && el('alloc-load-example').addEventListener('click', () => {
    setVal('sd1-name', 'Information Systems'); setVal('sd1-cost', 600000);
    setVal('sd2-name', 'Administration');      setVal('sd2-cost', 400000);
    setVal('od1-name', 'Manufacturing');
    setVal('od2-name', 'Marketing');
    setVal('sd1-to-sd1', 0);  setVal('sd1-to-sd2', 25); setVal('sd1-to-od1', 50); setVal('sd1-to-od2', 25);
    setVal('sd2-to-sd1', 10); setVal('sd2-to-sd2', 0);  setVal('sd2-to-od1', 60); setVal('sd2-to-od2', 30);
    updateAllocationLabels();
    calcAllocation();
  });

  initRandomizer('alloc-randomize', [
    { id: 'sd1-cost', min: 100000, max: 2000000, step: 50000, integer: true },
    { id: 'sd2-cost', min: 100000, max: 1500000, step: 50000, integer: true },
  ], () => {
    const r = () => Math.floor(Math.random() * 5) * 5;
    let a = r(), b = r(), c = r(), d = 100 - a - b - c;
    if (d < 0) { a = 0; b = 25; c = 50; d = 25; }
    setVal('sd1-to-sd1', 0); setVal('sd1-to-sd2', a); setVal('sd1-to-od1', b + c); setVal('sd1-to-od2', d);
    let e = r(), f = r(), g = 100 - e - f;
    if (g < 0) { e = 10; f = 60; g = 30; }
    setVal('sd2-to-sd1', e); setVal('sd2-to-sd2', 0); setVal('sd2-to-od1', f); setVal('sd2-to-od2', g);
    updateAllocationLabels();
    calcAllocation();
  });

  calcBtn.addEventListener('click', calcAllocation);
  updateAllocationLabels();
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Common Cost Allocator
// ══════════════════════════════════════════════════════════════════════════════

function calcCommonCost() {
  const totalCost   = val('cc-total-cost');
  const u1Name      = sval('cc-u1-name') || 'User 1';
  const u1Standalone = val('cc-u1-standalone');
  const u2Name      = sval('cc-u2-name') || 'User 2';
  const u2Standalone = val('cc-u2-standalone');
  const primary     = sval('cc-primary') === 'u2' ? 'u2' : 'u1';
  const outEl       = getOrCreate('cc-output', 'div', 'tool-output', el('cc-calculate').parentElement);

  if (!totalCost || !u1Standalone || !u2Standalone) {
    outEl.innerHTML = '<div style="background:var(--color-danger-bg,#fef2f2);border:1px solid var(--color-danger,#ef4444);padding:var(--space-4);border-radius:var(--radius-md);margin-top:var(--space-4);">Enter total common cost and standalone costs for both users.</div>';
    return;
  }

  const combinedStandalone = u1Standalone + u2Standalone;
  const u1Weight = u1Standalone / combinedStandalone;
  const u2Weight = u2Standalone / combinedStandalone;

  const u1Standalone_alloc = u1Weight * totalCost;
  const u2Standalone_alloc = u2Weight * totalCost;

  const primaryName   = primary === 'u1' ? u1Name : u2Name;
  const secondaryName = primary === 'u1' ? u2Name : u1Name;
  const primaryStandalone   = primary === 'u1' ? u1Standalone : u2Standalone;
  const secondaryStandalone = primary === 'u1' ? u2Standalone : u1Standalone;

  const primaryAlloc_inc   = Math.min(primaryStandalone, totalCost);
  const secondaryAlloc_inc = Math.max(0, totalCost - primaryAlloc_inc);

  const u1Inc = primary === 'u1' ? primaryAlloc_inc : secondaryAlloc_inc;
  const u2Inc = primary === 'u1' ? secondaryAlloc_inc : primaryAlloc_inc;

  const u1Savings_standalone = u1Standalone - u1Standalone_alloc;
  const u2Savings_standalone = u2Standalone - u2Standalone_alloc;
  const u1Savings_inc = u1Standalone - u1Inc;
  const u2Savings_inc = u2Standalone - u2Inc;

  const standaloneTable = '<table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">'
    + '<thead><tr>'
    + '<th style="text-align:left;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Party</th>'
    + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Standalone Cost</th>'
    + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Weight</th>'
    + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Allocated</th>'
    + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Savings</th>'
    + '</tr></thead>'
    + '<tbody>'
    + '<tr><td style="padding:var(--space-1) var(--space-2);">' + u1Name + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(u1Standalone) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtPct(u1Weight) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(u1Standalone_alloc) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);color:var(--color-success,#16a34a);">+' + fmt(u1Savings_standalone) + '</td></tr>'
    + '<tr><td style="padding:var(--space-1) var(--space-2);">' + u2Name + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(u2Standalone) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtPct(u2Weight) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(u2Standalone_alloc) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);color:var(--color-success,#16a34a);">+' + fmt(u2Savings_standalone) + '</td></tr>'
    + '</tbody>'
    + '<tfoot><tr style="border-top:2px solid var(--color-gray-300);font-weight:700;"><td style="padding:var(--space-2);">Total</td><td style="text-align:right;padding:var(--space-2);">' + fmt(combinedStandalone) + '</td><td style="text-align:right;padding:var(--space-2);">100%</td><td style="text-align:right;padding:var(--space-2);">' + fmt(totalCost) + '</td><td style="text-align:right;padding:var(--space-2);color:var(--color-success,#16a34a);">+' + fmt(u1Savings_standalone + u2Savings_standalone) + '</td></tr></tfoot>'
    + '</table>';

  const incrementalTable = '<table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">'
    + '<thead><tr>'
    + '<th style="text-align:left;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Party</th>'
    + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Standalone Cost</th>'
    + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Role</th>'
    + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Allocated</th>'
    + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Savings</th>'
    + '</tr></thead>'
    + '<tbody>'
    + '<tr><td style="padding:var(--space-1) var(--space-2);">' + primaryName + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(primaryStandalone) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);font-weight:700;">Primary</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(primaryAlloc_inc) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);color:var(--color-success,#16a34a);">+' + fmt(primaryStandalone - primaryAlloc_inc) + '</td></tr>'
    + '<tr><td style="padding:var(--space-1) var(--space-2);">' + secondaryName + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(secondaryStandalone) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">Secondary</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(secondaryAlloc_inc) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);color:var(--color-success,#16a34a);">+' + fmt(secondaryStandalone - secondaryAlloc_inc) + '</td></tr>'
    + '</tbody>'
    + '<tfoot><tr style="border-top:2px solid var(--color-gray-300);font-weight:700;"><td style="padding:var(--space-2);">Total</td><td style="text-align:right;padding:var(--space-2);">' + fmt(combinedStandalone) + '</td><td style="text-align:right;padding:var(--space-2);"></td><td style="text-align:right;padding:var(--space-2);">' + fmt(totalCost) + '</td><td style="text-align:right;padding:var(--space-2);color:var(--color-success,#16a34a);">+' + fmt((primaryStandalone - primaryAlloc_inc) + (secondaryStandalone - secondaryAlloc_inc)) + '</td></tr></tfoot>'
    + '</table>';

  const totalSavings = combinedStandalone - totalCost;
  const savingsPct   = combinedStandalone > 0 ? totalSavings / combinedStandalone : 0;

  outEl.innerHTML = '<div style="margin-top:var(--space-5);">'
    + panelGrid(
        panel('Standalone Cost-Allocation Method', standaloneTable, 'Both parties share savings proportionally. Neither party pays more than their standalone cost.')
        + panel('Incremental Cost-Allocation Method', incrementalTable, 'The primary party is allocated up to their standalone cost. The secondary party gets the remainder -- which may be less than their standalone cost, or even zero if the primary party absorbs everything.')
      )
    + '<div style="margin-top:var(--space-4);padding:var(--space-4);background:var(--color-success-bg,#f0fdf4);border-radius:var(--radius-md);border:1px solid var(--color-success,#22c55e);">'
    + 'Total savings from sharing: <strong>' + fmt(totalSavings) + '</strong> (' + fmtPct(savingsPct) + ' of combined standalone costs). '
    + 'The standalone method distributes savings evenly. The incremental method favors the secondary party when total cost is low.'
    + '</div>'
    + '</div>';

  renderShowWork(el('cc-show-work'), [
    { label: 'Combined standalone cost', formula: u1Name + ' standalone + ' + u2Name + ' standalone', values: fmt(u1Standalone) + ' + ' + fmt(u2Standalone), result: fmt(combinedStandalone) },
    { label: u1Name + ' standalone weight', formula: u1Name + ' standalone / combined standalone', values: fmt(u1Standalone) + ' / ' + fmt(combinedStandalone), result: fmtPct(u1Weight) },
    { label: u1Name + ' standalone allocation', formula: 'Weight x total common cost', values: fmtPct(u1Weight) + ' x ' + fmt(totalCost), result: fmt(u1Standalone_alloc) },
    { label: u2Name + ' standalone allocation', formula: 'Weight x total common cost', values: fmtPct(u2Weight) + ' x ' + fmt(totalCost), result: fmt(u2Standalone_alloc) },
    { label: primaryName + ' incremental allocation (primary)', formula: 'Min(primary standalone cost, total common cost)', values: 'Min(' + fmt(primaryStandalone) + ', ' + fmt(totalCost) + ')', result: fmt(primaryAlloc_inc), highlight: true },
    { label: secondaryName + ' incremental allocation (secondary)', formula: 'Max(0, total common cost - primary allocation)', values: 'Max(0, ' + fmt(totalCost) + ' - ' + fmt(primaryAlloc_inc) + ')', result: fmt(secondaryAlloc_inc), highlight: true },
  ], { title: 'Common Cost Allocation', defaultOpen: false });
}

function initCommonCostAllocator() {
  const calcBtn = el('cc-calculate');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', calcCommonCost);

  el('cc-load-example') && el('cc-load-example').addEventListener('click', () => {
    setVal('cc-total-cost', 10000);
    setVal('cc-u1-name', 'Widgetron Division');
    setVal('cc-u1-standalone', 30000);
    setVal('cc-u2-name', 'Gadgetron Division');
    setVal('cc-u2-standalone', 20000);
    const sel = el('cc-primary');
    if (sel) sel.value = 'u1';
    calcCommonCost();
  });

  initRandomizer('cc-randomize', [
    { id: 'cc-total-cost',     min: 5000,   max: 500000,  step: 5000,  integer: true },
    { id: 'cc-u1-standalone',  min: 10000,  max: 800000,  step: 10000, integer: true },
    { id: 'cc-u2-standalone',  min: 10000,  max: 600000,  step: 10000, integer: true },
  ], calcCommonCost);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Revenue Allocation Calculator
// ══════════════════════════════════════════════════════════════════════════════

function calcRevenueAllocation() {
  const bundlePrice = val('ra-bundle-price');
  const p1Name      = sval('ra-p1-name') || 'Product 1';
  const p1SA        = val('ra-p1-standalone');
  const p2Name      = sval('ra-p2-name') || 'Product 2';
  const p2SA        = val('ra-p2-standalone');
  const p3Name      = sval('ra-p3-name') || 'Product 3';
  const p3SA        = val('ra-p3-standalone');
  const rank1       = sval('ra-rank1');
  const rank2       = sval('ra-rank2');
  const outEl       = getOrCreate('ra-output', 'div', 'tool-output', el('ra-calculate').parentElement);

  const products = [
    { name: p1Name, sa: p1SA, key: 'p1' },
    { name: p2Name, sa: p2SA, key: 'p2' },
    { name: p3Name, sa: p3SA, key: 'p3' },
  ];

  const totalSA = p1SA + p2SA + p3SA;
  if (!bundlePrice || !totalSA) {
    outEl.innerHTML = '<div style="background:var(--color-danger-bg,#fef2f2);border:1px solid var(--color-danger,#ef4444);padding:var(--space-4);border-radius:var(--radius-md);margin-top:var(--space-4);">Enter bundle price and standalone prices for all three products.</div>';
    return;
  }

  // Standalone method
  const standalone = products.map(p => ({ ...p, alloc: (p.sa / totalSA) * bundlePrice }));

  // Incremental method
  const rank1Idx = parseInt(rank1) || 0;
  const rank2Idx = parseInt(rank2) || 1;
  const rankOrder = [rank1Idx, rank2Idx];
  const remaining = [0,1,2].filter(k => rankOrder.indexOf(k) === -1);
  const orderedIdxs = [...rankOrder, ...remaining];
  let remaining_inc = bundlePrice;
  const incremental = orderedIdxs.map(key => {
    const p = products[key];
    const alloc = Math.min(p.sa, remaining_inc);
    remaining_inc = Math.max(0, remaining_inc - alloc);
    return { ...p, alloc };
  });

  // Shapley value method
  function shapley(products, bundlePrice) {
    const n = products.length;
    const keys = products.map(p => p.key);
    const saMap = {};
    products.forEach(p => { saMap[p.key] = p.sa; });

    function subsetValue(subset) {
      if (subset.length === 0) return 0;
      const subsetSA = subset.reduce((s, k) => s + saMap[k], 0);
      return Math.min(bundlePrice * (subsetSA / Object.values(saMap).reduce((a,b)=>a+b,0)), subsetSA);
    }

    function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }

    const shapleyValues = {};
    keys.forEach(k => { shapleyValues[k] = 0; });

    for (let mask = 0; mask < (1 << n); mask++) {
      const subset = keys.filter((_, i) => mask & (1 << i));
      subset.forEach(k => {
        const withoutK = subset.filter(x => x !== k);
        const marginal = subsetValue(subset) - subsetValue(withoutK);
        const s = withoutK.length;
        const weight = factorial(s) * factorial(n - s - 1) / factorial(n);
        shapleyValues[k] += weight * marginal;
      });
    }

    const total = Object.values(shapleyValues).reduce((a,b)=>a+b,0);
    const scale = total > 0 ? bundlePrice / total : 1;
    keys.forEach(k => { shapleyValues[k] *= scale; });
    return shapleyValues;
  }

  const shapleyVals = shapley(products, bundlePrice);
  const shapleyAlloc = products.map(p => ({ ...p, alloc: shapleyVals[p.key] }));

  function methodTable(title, allocs, note) {
    const rows = allocs.map(p =>
      '<tr>'
      + '<td style="padding:var(--space-1) var(--space-2);">' + p.name + '</td>'
      + '<td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(p.sa) + '</td>'
      + '<td style="text-align:right;padding:var(--space-1) var(--space-2);font-weight:700;color:var(--color-primary);">' + fmt(p.alloc) + '</td>'
      + '<td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtPct(p.alloc / bundlePrice) + '</td>'
      + '</tr>'
    ).join('');
    const tableHTML = '<table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">'
      + '<thead><tr>'
      + '<th style="text-align:left;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Product</th>'
      + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Standalone</th>'
      + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Allocated</th>'
      + '<th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">% of Bundle</th>'
      + '</tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '<tfoot><tr style="border-top:2px solid var(--color-gray-300);font-weight:700;"><td style="padding:var(--space-2);">Total</td><td style="text-align:right;padding:var(--space-2);">' + fmt(totalSA) + '</td><td style="text-align:right;padding:var(--space-2);">' + fmt(bundlePrice) + '</td><td style="text-align:right;padding:var(--space-2);">100%</td></tr></tfoot>'
      + '</table>';
    return panel(title, tableHTML, note);
  }

  const rank1Name = products.find(p => p.key === rank1)?.name || rank1;
  const rank2Name = products.find(p => p.key === rank2)?.name || rank2;

  outEl.innerHTML = '<div style="margin-top:var(--space-5);">'
    + panelGrid(
        methodTable('Standalone Method', standalone, 'Allocates bundle price proportionally to each product\'s standalone price.')
        + methodTable('Incremental Method (' + rank1Name + ' first)', incremental, 'Primary product receives up to its standalone price. Remainder flows to secondary, then tertiary.')
        + methodTable('Shapley Value Method', shapleyAlloc, 'Averages each product\'s marginal contribution across all possible orderings. Most equitable but most complex.')
      )
    + '</div>';

  renderShowWork(el('ra-show-work'), [
    { label: 'Total standalone price', formula: p1Name + ' + ' + p2Name + ' + ' + p3Name, values: fmt(p1SA) + ' + ' + fmt(p2SA) + ' + ' + fmt(p3SA), result: fmt(totalSA) },
    { label: p1Name + ' standalone allocation', formula: '(' + p1Name + ' standalone / total standalone) x bundle price', values: '(' + fmt(p1SA) + ' / ' + fmt(totalSA) + ') x ' + fmt(bundlePrice), result: fmt(standalone[0].alloc) },
    { label: p2Name + ' standalone allocation', formula: '(' + p2Name + ' standalone / total standalone) x bundle price', values: '(' + fmt(p2SA) + ' / ' + fmt(totalSA) + ') x ' + fmt(bundlePrice), result: fmt(standalone[1].alloc) },
    { label: p3Name + ' standalone allocation', formula: '(' + p3Name + ' standalone / total standalone) x bundle price', values: '(' + fmt(p3SA) + ' / ' + fmt(totalSA) + ') x ' + fmt(bundlePrice), result: fmt(standalone[2].alloc) },
    { label: rank1Name + ' incremental (primary)', formula: 'Min(standalone, bundle price)', values: 'Min(' + fmt(products.find(p=>p.key===rank1)?.sa||0) + ', ' + fmt(bundlePrice) + ')', result: fmt(incremental.find(p=>p.key===rank1)?.alloc||0), highlight: true },
    { label: 'Shapley value: ' + p1Name, formula: 'Weighted average marginal contribution across all orderings', values: 'See full calculation', result: fmt(shapleyAlloc[0].alloc), highlight: true },
  ], { title: 'Revenue Allocation Calculations', defaultOpen: false });
}

function initRevenueAllocation() {
  const calcBtn = el('ra-calculate');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', calcRevenueAllocation);

  el('ra-load-example') && el('ra-load-example').addEventListener('click', () => {
    setVal('ra-bundle-price', 150);
    setVal('ra-p1-name', 'Hardware'); setVal('ra-p1-standalone', 100);
    setVal('ra-p2-name', 'Software'); setVal('ra-p2-standalone', 75);
    setVal('ra-p3-name', 'Support');  setVal('ra-p3-standalone', 50);
    const r1 = el('ra-rank1'); if (r1) r1.value = 'p1';
    const r2 = el('ra-rank2'); if (r2) r2.value = 'p2';
    calcRevenueAllocation();
  });

  initRandomizer('ra-randomize', [
    { id: 'ra-bundle-price',   min: 50,  max: 500,  step: 10 },
    { id: 'ra-p1-standalone',  min: 30,  max: 300,  step: 10 },
    { id: 'ra-p2-standalone',  min: 20,  max: 250,  step: 10 },
    { id: 'ra-p3-standalone',  min: 10,  max: 200,  step: 10 },
  ], calcRevenueAllocation);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Bundled Product Profitability Analyzer
// ══════════════════════════════════════════════════════════════════════════════

function calcBundleProfit() {
  const p1Name    = sval('bp-p1-name') || 'Product A';
  const p1Price   = val('bp-p1-price');
  const p1VC      = val('bp-p1-vc');
  const p2Name    = sval('bp-p2-name') || 'Product B';
  const p2Price   = val('bp-p2-price');
  const p2VC      = val('bp-p2-vc');
  const bundlePrice = val('bp-bundle-price');
  const customers   = val('bp-customers');
  const pctBoth     = val('bp-pct-both') / 100;
  const pctAOnly    = val('bp-pct-a-only') / 100;
  const pctBOnly    = val('bp-pct-b-only') / 100;
  const outEl       = getOrCreate('bp-output', 'div', 'tool-output', el('bp-calculate').parentElement);

  const custBoth  = Math.round(customers * pctBoth);
  const custAOnly = Math.round(customers * pctAOnly);
  const custBOnly = Math.round(customers * pctBOnly);

  const p1CM = p1Price - p1VC;
  const p2CM = p2Price - p2VC;
  const bundleVC = p1VC + p2VC;
  const bundleCM = bundlePrice - bundleVC;

  const standaloneRev = custBoth * (p1Price + p2Price) + custAOnly * p1Price + custBOnly * p2Price;
  const standaloneCM  = custBoth * (p1CM + p2CM) + custAOnly * p1CM + custBOnly * p2CM;

  const bundleRev = custBoth * bundlePrice + custAOnly * p1Price + custBOnly * p2Price;
  const bundleCMTotal = custBoth * bundleCM + custAOnly * p1CM + custBOnly * p2CM;

  const revDiff = bundleRev - standaloneRev;
  const cmDiff  = bundleCMTotal - standaloneCM;
  const bundlingBetter = cmDiff >= 0;

  outEl.innerHTML = '<div style="margin-top:var(--space-5);">'
    + panelGrid(
        panel('Standalone Pricing', '<table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">'
          + '<thead><tr><th style="text-align:left;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Segment</th><th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Customers</th><th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Revenue</th><th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">CM</th></tr></thead>'
          + '<tbody>'
          + '<tr><td style="padding:var(--space-1) var(--space-2);">Buy both</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtN(custBoth) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custBoth * (p1Price + p2Price)) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custBoth * (p1CM + p2CM)) + '</td></tr>'
          + '<tr><td style="padding:var(--space-1) var(--space-2);">' + p1Name + ' only</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtN(custAOnly) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custAOnly * p1Price) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custAOnly * p1CM) + '</td></tr>'
          + '<tr><td style="padding:var(--space-1) var(--space-2);">' + p2Name + ' only</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtN(custBOnly) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custBOnly * p2Price) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custBOnly * p2CM) + '</td></tr>'
          + '</tbody>'
          + '<tfoot><tr style="border-top:2px solid var(--color-gray-300);font-weight:700;"><td style="padding:var(--space-2);">Total</td><td style="text-align:right;padding:var(--space-2);">' + fmtN(customers) + '</td><td style="text-align:right;padding:var(--space-2);">' + fmt(standaloneRev) + '</td><td style="text-align:right;padding:var(--space-2);">' + fmt(standaloneCM) + '</td></tr></tfoot>'
          + '</table>', 'Customers who buy both pay full price for each product.')
        + panel('Bundle Pricing', '<table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">'
          + '<thead><tr><th style="text-align:left;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Segment</th><th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Customers</th><th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">Revenue</th><th style="text-align:right;padding:var(--space-1) var(--space-2);border-bottom:2px solid var(--color-gray-300);">CM</th></tr></thead>'
          + '<tbody>'
          + '<tr><td style="padding:var(--space-1) var(--space-2);">Buy bundle</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtN(custBoth) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custBoth * bundlePrice) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custBoth * bundleCM) + '</td></tr>'
          + '<tr><td style="padding:var(--space-1) var(--space-2);">' + p1Name + ' only</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtN(custAOnly) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custAOnly * p1Price) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custAOnly * p1CM) + '</td></tr>'
          + '<tr><td style="padding:var(--space-1) var(--space-2);">' + p2Name + ' only</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmtN(custBOnly) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custBOnly * p2Price) + '</td><td style="text-align:right;padding:var(--space-1) var(--space-2);">' + fmt(custBOnly * p2CM) + '</td></tr>'
          + '</tbody>'
          + '<tfoot><tr style="border-top:2px solid var(--color-gray-300);font-weight:700;"><td style="padding:var(--space-2);">Total</td><td style="text-align:right;padding:var(--space-2);">' + fmtN(customers) + '</td><td style="text-align:right;padding:var(--space-2);">' + fmt(bundleRev) + '</td><td style="text-align:right;padding:var(--space-2);">' + fmt(bundleCMTotal) + '</td></tr></tfoot>'
          + '</table>', 'Customers who buy both pay the bundle price instead of individual prices.')
      )
    + '<div style="margin-top:var(--space-4);padding:var(--space-4);background:' + (bundlingBetter ? 'var(--color-success-bg,#f0fdf4)' : 'var(--color-danger-bg,#fef2f2)') + ';border-radius:var(--radius-md);border:1px solid ' + (bundlingBetter ? 'var(--color-success,#22c55e)' : 'var(--color-danger,#ef4444)') + ';">'
    + (bundlingBetter
        ? 'Bundling is <strong>more profitable</strong>. Contribution margin increases by <strong>' + fmt(cmDiff) + '</strong>. The bundle price of ' + fmt(bundlePrice) + ' generates more total CM than standalone pricing even though the per-customer revenue drops by ' + fmt(Math.abs(revDiff / (custBoth || 1))) + ' per bundle customer.'
        : 'Standalone pricing is <strong>more profitable</strong>. Bundling reduces contribution margin by <strong>' + fmt(Math.abs(cmDiff)) + '</strong>. The bundle discount of ' + fmt((p1Price + p2Price) - bundlePrice) + ' per customer exceeds the benefit of any incremental volume.')
    + '</div>'
    + '</div>';

  renderShowWork(el('bp-show-work'), [
    { label: p1Name + ' contribution margin per unit', formula: 'Selling price - Variable cost', values: fmt(p1Price) + ' - ' + fmt(p1VC), result: fmt(p1CM) },
    { label: p2Name + ' contribution margin per unit', formula: 'Selling price - Variable cost', values: fmt(p2Price) + ' - ' + fmt(p2VC), result: fmt(p2CM) },
    { label: 'Bundle contribution margin per unit', formula: 'Bundle price - (VC1 + VC2)', values: fmt(bundlePrice) + ' - (' + fmt(p1VC) + ' + ' + fmt(p2VC) + ')', result: fmt(bundleCM) },
    { label: 'Standalone total CM', formula: 'Both-customers CM + A-only CM + B-only CM', values: fmt(custBoth * (p1CM + p2CM)) + ' + ' + fmt(custAOnly * p1CM) + ' + ' + fmt(custBOnly * p2CM), result: fmt(standaloneCM) },
    { label: 'Bundle total CM', formula: 'Bundle-customers CM + A-only CM + B-only CM', values: fmt(custBoth * bundleCM) + ' + ' + fmt(custAOnly * p1CM) + ' + ' + fmt(custBOnly * p2CM), result: fmt(bundleCMTotal) },
    { label: 'CM difference (bundle vs standalone)', formula: 'Bundle CM - Standalone CM', values: fmt(bundleCMTotal) + ' - ' + fmt(standaloneCM), result: (cmDiff >= 0 ? '+' : '') + fmt(cmDiff), highlight: true },
  ], { title: 'Bundling Profitability Analysis', defaultOpen: false });
}

function initBundleProfit() {
  const calcBtn = el('bp-calculate');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', calcBundleProfit);

  el('bp-load-example') && el('bp-load-example').addEventListener('click', () => {
    setVal('bp-p1-name', 'Software License'); setVal('bp-p1-price', 120); setVal('bp-p1-vc', 20);
    setVal('bp-p2-name', 'Training Package'); setVal('bp-p2-price', 80);  setVal('bp-p2-vc', 30);
    setVal('bp-bundle-price', 160);
    setVal('bp-customers', 1000);
    setVal('bp-pct-both', 40);
    setVal('bp-pct-a-only', 35);
    setVal('bp-pct-b-only', 25);
    calcBundleProfit();
  });

  initRandomizer('bp-randomize', [
    { id: 'bp-p1-price',    min: 30,  max: 300, step: 10 },
    { id: 'bp-p1-vc',       min: 5,   max: 100, step: 5 },
    { id: 'bp-p2-price',    min: 20,  max: 200, step: 10 },
    { id: 'bp-p2-vc',       min: 5,   max: 80,  step: 5 },
    { id: 'bp-customers',   min: 200, max: 5000, step: 100, integer: true },
    { id: 'bp-pct-both',    min: 10,  max: 60,  step: 5 },
    { id: 'bp-pct-a-only',  min: 10,  max: 50,  step: 5 },
    { id: 'bp-pct-b-only',  min: 10,  max: 50,  step: 5 },
  ], () => {
    const bundleDiscount = Math.floor(Math.random() * 20 + 5);
    const p1 = val('bp-p1-price');
    const p2 = val('bp-p2-price');
    setVal('bp-bundle-price', Math.max(p1 + p2 - bundleDiscount, Math.max(p1, p2) + 5));
    calcBundleProfit();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Support Department', definition: 'A department that provides services to operating departments and other support departments but does not directly produce goods or services sold to customers. Examples: IT, HR, Administration.' },
  { term: 'Operating Department', definition: 'A department that directly adds value to products or services sold to customers. Support-department costs are allocated to operating departments for product costing and pricing.' },
  { term: 'Direct Method', definition: 'Allocates each support department\'s costs directly to operating departments only, ignoring any services provided to other support departments.' },
  { term: 'Step-Down Method', definition: 'Allocates support-department costs sequentially. Once a support department\'s costs are allocated, it receives no further allocations. Partially recognizes inter-support services.' },
  { term: 'Reciprocal Method', definition: 'Fully recognizes mutual services among support departments by solving a system of simultaneous equations. Most accurate but most complex.' },
  { term: 'Common Cost', definition: 'A cost of operating a facility, activity, or resource shared by two or more users. The challenge is allocating it fairly when no single user caused the entire cost.' },
  { term: 'Standalone Cost-Allocation Method', definition: 'Allocates common costs proportionally to each party\'s standalone cost. Both parties share savings equally relative to their standalone costs.' },
  { term: 'Incremental Cost-Allocation Method', definition: 'Ranks users as primary and secondary. The primary user is allocated up to their standalone cost; the secondary user gets the remainder.' },
  { term: 'Shapley Value', definition: 'Allocates common costs or revenues by averaging each party\'s marginal contribution across all possible orderings. Satisfies fairness criteria but requires more computation.' },
  { term: 'Bundled Product', definition: 'Two or more products or services sold together for a single price. Revenue must be allocated among the bundled items for financial reporting and profitability analysis.' },
  { term: 'Standalone Revenue-Allocation Method', definition: 'Allocates bundle revenue proportionally to each product\'s standalone selling price.' },
  { term: 'Incremental Revenue-Allocation Method', definition: 'Ranks products as primary and secondary. The primary product is allocated up to its standalone price; the secondary product gets the remainder.' },
];

function initKeyTerms() {
  const grid = el('key-terms-grid');
  if (!grid) return;
  KEY_TERMS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'key-term';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-expanded', 'false');
    div.innerHTML = '<div class="key-term__word">' + item.term + '</div>'
      + '<p class="key-term__definition">' + item.definition + '</p>';
    div.addEventListener('click', () => {
      const open = div.classList.toggle('key-term--open');
      div.setAttribute('aria-expanded', open);
    });
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); }
    });
    grid.appendChild(div);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER COMPLETE
// ══════════════════════════════════════════════════════════════════════════════

function injectResetButton(card) {
  if (el('ch16-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch16-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch16');
    const markBtn = el('mark-complete-btn');
    if (markBtn) {
      markBtn.textContent = 'Mark as Complete';
      markBtn.disabled = false;
      markBtn.classList.remove('btn--success');
    }
    resetBtn.remove();
  });
  card.appendChild(resetBtn);
}

function initChapterComplete() {
  const btn    = el('mark-complete-btn');
  const card   = el('chapter-complete');
  const status = el('ch16-status');
  if (!btn || !card) return;
  if (isChapterComplete('ch16')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch16');
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initSettingsPanel();
  initAllocationEngine();
  initCommonCostAllocator();
  initRevenueAllocation();
  initBundleProfit();
  initKeyTerms();
  initChapterComplete();
});
