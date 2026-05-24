import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initSettingsPanel } from '/js/components/settings-panel.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmt2   = n => '$' + Math.abs(n).toFixed(2);
const fmtN   = n => Math.round(n).toLocaleString();
const fmtPct = n => (Math.round(n * 10) / 10).toFixed(1) + '%';

function getOrCreate(id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement(tag || 'div');
    node.id = id;
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
  }
  return node;
}

const el   = id => document.getElementById(id);
const val  = id => { const n = el(id); return n ? (parseFloat(n.value) || 0) : 0; };
function setVal(id, v) { const n = el(id); if (n) n.value = v; }

function table(cols, rows, foot) {
  const thead = '<thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
  const tfoot = foot ? '<tfoot><tr>' + foot.map(c => '<td><strong>' + c + '</strong></td>').join('') + '</tr></tfoot>' : '';
  return '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">' + thead + tbody + tfoot + '</table></div>';
}

function insight(text) {
  return '<div class="ch12-insight" style="margin-top:var(--space-4);">' + text + '</div>';
}

function panel(title, body, note) {
  return '<div style="flex:1 1 300px;min-width:280px;background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);padding:var(--space-4);">'
    + '<div style="font-weight:700;font-size:var(--font-size-sm);margin-bottom:var(--space-3);color:var(--color-primary-text);">' + title + '</div>'
    + '<div style="overflow-x:auto;">' + body + '</div>'
    + (note ? '<p style="font-size:var(--font-size-xs);color:var(--color-gray-500);margin:var(--space-3) 0 0;font-style:italic;">' + note + '</p>' : '')
    + '</div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Physical Units Flow Tracker
// ══════════════════════════════════════════════════════════════════════════════

function calcPhysicalUnits() {
  const begWIP    = val('pu-beg-wip');
  const started   = val('pu-started');
  const completed = val('pu-completed');
  const endWIP    = val('pu-end-wip');

  const toAccountFor  = begWIP + started;
  const accountedFor  = completed + endWIP;
  const balanced      = Math.abs(toAccountFor - accountedFor) < 0.01;

  const out = getOrCreate('pu-output', 'div', 'tool-output', el('pu-calculate').parentElement);

  const statusColor = balanced ? 'var(--color-success)' : 'var(--color-danger)';
  const statusText  = balanced ? 'Balanced' : 'Does not balance -- check your inputs';

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Units to Account For',
        table(
          ['Source', 'Units'],
          [
            ['Beginning Work-in-Process', fmtN(begWIP)],
            ['Started (or transferred in) this period', fmtN(started)],
          ],
          ['Total units to account for', fmtN(toAccountFor)]
        ),
        'These are all the units that entered the process this period.'
      )
    + panel('Units Accounted For',
        table(
          ['Destination', 'Units'],
          [
            ['Completed and transferred out', fmtN(completed)],
            ['Ending Work-in-Process', fmtN(endWIP)],
          ],
          ['Total units accounted for', fmtN(accountedFor)]
        ),
        'Every unit must be either completed or still in process at period end.'
      )
    + '</div>'
    + '<div style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);border:2px solid ' + statusColor + ';background:' + (balanced ? 'var(--color-success-light)' : 'var(--color-danger-light)') + ';">'
    + '<strong style="color:' + statusColor + ';">' + statusText + '</strong>'
    + (balanced ? '<br />Units to account for (' + fmtN(toAccountFor) + ') = Units accounted for (' + fmtN(accountedFor) + '). You are ready to proceed to Step 2.' : '<br />Units to account for: ' + fmtN(toAccountFor) + ' | Units accounted for: ' + fmtN(accountedFor) + ' | Difference: ' + fmtN(Math.abs(toAccountFor - accountedFor)))
    + '</div>'
    + insight('Rule: Beginning WIP + Units Started = Units Completed + Ending WIP. This must always balance before you can proceed with cost calculations.')
    + '</div>';

  renderShowWork(el('pu-show-work'), [
    { label: 'Units to Account For', formula: 'Beginning WIP + Units Started', values: fmtN(begWIP) + ' + ' + fmtN(started), result: fmtN(toAccountFor) },
    { label: 'Units Accounted For', formula: 'Units Completed + Ending WIP', values: fmtN(completed) + ' + ' + fmtN(endWIP), result: fmtN(accountedFor) },
    { label: 'Balance Check', formula: 'Units to Account For - Units Accounted For', values: fmtN(toAccountFor) + ' - ' + fmtN(accountedFor), result: balanced ? '0 -- Balanced' : fmtN(toAccountFor - accountedFor) + ' -- Does not balance', highlight: true },
  ], { title: 'Physical Units Flow', defaultOpen: false });
}

function initPhysicalUnits() {
  const btn = el('pu-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcPhysicalUnits);

  el('pu-load-example') && el('pu-load-example').addEventListener('click', () => {
    setVal('pu-beg-wip', 400);
    setVal('pu-started', 2000);
    setVal('pu-completed', 2100);
    setVal('pu-end-wip', 300);
    calcPhysicalUnits();
  });

  initRandomizer('pu-randomize', [
    { id: 'pu-beg-wip',    min: 0,    max: 1000,  step: 50,  integer: true },
    { id: 'pu-started',    min: 500,  max: 5000,  step: 100, integer: true },
    { id: 'pu-completed',  min: 400,  max: 4500,  step: 100, integer: true },
  ], () => {
    const beg     = val('pu-beg-wip');
    const started = val('pu-started');
    const comp    = val('pu-completed');
    const endWIP  = Math.max(0, beg + started - comp);
    setVal('pu-end-wip', endWIP);
    calcPhysicalUnits();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Equivalent Units Calculator
// ══════════════════════════════════════════════════════════════════════════════

function calcEUP() {
  const begWIP      = val('eup-beg-wip');
  const begPctDM    = val('eup-beg-pct-dm') / 100;
  const begPctCC    = val('eup-beg-pct-cc') / 100;
  const started     = val('eup-started');
  const completed   = val('eup-completed');
  const endWIP      = val('eup-end-wip');
  const endPctDM    = val('eup-end-pct-dm') / 100;
  const endPctCC    = val('eup-end-pct-cc') / 100;

  const startedAndCompleted = Math.max(0, completed - begWIP);

  // Weighted-average EUP
  const wa_dm = completed + endWIP * endPctDM;
  const wa_cc = completed + endWIP * endPctCC;

  // FIFO EUP
  const fifo_dm = begWIP * (1 - begPctDM) + startedAndCompleted + endWIP * endPctDM;
  const fifo_cc = begWIP * (1 - begPctCC) + startedAndCompleted + endWIP * endPctCC;

  const out = getOrCreate('eup-output', 'div', 'tool-output', el('eup-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Weighted-Average Method',
        table(
          ['Component', 'DM Units', 'Conversion Units'],
          [
            ['Completed and transferred out', fmtN(completed), fmtN(completed)],
            ['Ending WIP (' + fmtPct(endPctDM * 100) + '% DM, ' + fmtPct(endPctCC * 100) + '% CC)', fmtN(endWIP * endPctDM), fmtN(endWIP * endPctCC)],
          ],
          ['Equivalent Units of Production', fmtN(wa_dm), fmtN(wa_cc)]
        ),
        'Weighted-average includes all work done to date, regardless of period. Beginning WIP completion percentages are not needed.'
      )
    + panel('FIFO Method',
        table(
          ['Component', 'DM Units', 'Conversion Units'],
          [
            ['Complete beginning WIP (' + fmtPct((1-begPctDM)*100) + '% DM, ' + fmtPct((1-begPctCC)*100) + '% CC)', fmtN(begWIP * (1-begPctDM)), fmtN(begWIP * (1-begPctCC))],
            ['Started and completed this period', fmtN(startedAndCompleted), fmtN(startedAndCompleted)],
            ['Ending WIP (' + fmtPct(endPctDM*100) + '% DM, ' + fmtPct(endPctCC*100) + '% CC)', fmtN(endWIP * endPctDM), fmtN(endWIP * endPctCC)],
          ],
          ['Equivalent Units of Production', fmtN(fifo_dm), fmtN(fifo_cc)]
        ),
        'FIFO counts only current-period work. It subtracts work already done on beginning WIP in prior periods.'
      )
    + '</div>'
    + insight('Key difference: FIFO EUP (' + fmtN(fifo_cc) + ' conversion) vs Weighted-Average EUP (' + fmtN(wa_cc) + ' conversion). The gap equals the prior-period work already in beginning WIP: ' + fmtN(begWIP * begPctCC) + ' conversion equivalent units.')
    + '</div>';

  renderShowWork(el('eup-show-work'), [
    { label: 'Started and Completed (FIFO)', formula: 'Units Completed - Beginning WIP', values: fmtN(completed) + ' - ' + fmtN(begWIP), result: fmtN(startedAndCompleted) },
    { label: 'WA Equivalent Units -- DM', formula: 'Completed + Ending WIP x End% DM', values: fmtN(completed) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctDM*100), result: fmtN(wa_dm) },
    { label: 'WA Equivalent Units -- Conversion', formula: 'Completed + Ending WIP x End% CC', values: fmtN(completed) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctCC*100), result: fmtN(wa_cc), highlight: true },
    { label: 'FIFO Equivalent Units -- DM', formula: 'Beg WIP x (1-Beg%) + S&C + End WIP x End%', values: fmtN(begWIP) + ' x ' + fmtPct((1-begPctDM)*100) + ' + ' + fmtN(startedAndCompleted) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctDM*100), result: fmtN(fifo_dm) },
    { label: 'FIFO Equivalent Units -- Conversion', formula: 'Beg WIP x (1-Beg%) + S&C + End WIP x End%', values: fmtN(begWIP) + ' x ' + fmtPct((1-begPctCC)*100) + ' + ' + fmtN(startedAndCompleted) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctCC*100), result: fmtN(fifo_cc), highlight: true },
  ], { title: 'Equivalent Units Calculation', defaultOpen: false });
}

function initEUP() {
  const btn = el('eup-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcEUP);

  el('eup-load-example') && el('eup-load-example').addEventListener('click', () => {
    setVal('eup-beg-wip', 400); setVal('eup-beg-pct-dm', 100); setVal('eup-beg-pct-cc', 25);
    setVal('eup-started', 2000); setVal('eup-completed', 2100);
    setVal('eup-end-wip', 300); setVal('eup-end-pct-dm', 100); setVal('eup-end-pct-cc', 67);
    calcEUP();
  });

  initRandomizer('eup-randomize', [
    { id: 'eup-beg-wip',     min: 0,   max: 1000, step: 50,  integer: true },
    { id: 'eup-beg-pct-dm',  min: 0,   max: 100,  step: 10 },
    { id: 'eup-beg-pct-cc',  min: 0,   max: 100,  step: 10 },
    { id: 'eup-started',     min: 500, max: 5000, step: 100, integer: true },
    { id: 'eup-completed',   min: 400, max: 4500, step: 100, integer: true },
    { id: 'eup-end-pct-dm',  min: 0,   max: 100,  step: 10 },
    { id: 'eup-end-pct-cc',  min: 0,   max: 100,  step: 10 },
  ], () => {
    const beg   = val('eup-beg-wip');
    const start = val('eup-started');
    const comp  = val('eup-completed');
    setVal('eup-end-wip', Math.max(0, beg + start - comp));
    calcEUP();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Weighted-Average Process Costing Engine
// ══════════════════════════════════════════════════════════════════════════════

function calcWeightedAverage() {
  const begWIP      = val('wa-beg-wip');
  const started     = val('wa-started');
  const completed   = val('wa-completed');
  const endWIP      = val('wa-end-wip');
  const endPctDM    = val('wa-end-pct-dm') / 100;
  const endPctCC    = val('wa-end-pct-cc') / 100;
  const begCostDM   = val('wa-beg-cost-dm');
  const begCostCC   = val('wa-beg-cost-cc');
  const currCostDM  = val('wa-curr-cost-dm');
  const currCostCC  = val('wa-curr-cost-cc');

  // Step 2: EUP
  const eup_dm = completed + endWIP * endPctDM;
  const eup_cc = completed + endWIP * endPctCC;

  // Step 3: Cost per EUP
  const totalCostDM = begCostDM + currCostDM;
  const totalCostCC = begCostCC + currCostCC;
  const cpeu_dm = eup_dm > 0 ? totalCostDM / eup_dm : 0;
  const cpeu_cc = eup_cc > 0 ? totalCostCC / eup_cc : 0;
  const cpeu_total = cpeu_dm + cpeu_cc;

  // Step 4 & 5: Assign costs
  const costCompleted = completed * cpeu_total;
  const costEndWIP_dm = endWIP * endPctDM * cpeu_dm;
  const costEndWIP_cc = endWIP * endPctCC * cpeu_cc;
  const costEndWIP    = costEndWIP_dm + costEndWIP_cc;
  const totalAssigned = costCompleted + costEndWIP;
  const totalAvailable = totalCostDM + totalCostCC;

  const out = getOrCreate('wa-output', 'div', 'tool-output', el('wa-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<h4 style="margin-bottom:var(--space-3);">Step 2: Equivalent Units of Production</h4>'
    + table(
        ['', 'Direct Materials', 'Conversion'],
        [
          ['Completed and transferred out', fmtN(completed), fmtN(completed)],
          ['Ending WIP', fmtN(endWIP * endPctDM), fmtN(endWIP * endPctCC)],
        ],
        ['EUP (Weighted-Average)', fmtN(eup_dm), fmtN(eup_cc)]
      )
    + '<h4 style="margin:var(--space-5) 0 var(--space-3);">Step 3: Cost per Equivalent Unit</h4>'
    + table(
        ['', 'Direct Materials', 'Conversion', 'Total'],
        [
          ['Beginning WIP costs', fmt(begCostDM), fmt(begCostCC), fmt(begCostDM + begCostCC)],
          ['Current period costs', fmt(currCostDM), fmt(currCostCC), fmt(currCostDM + currCostCC)],
          ['Total costs', fmt(totalCostDM), fmt(totalCostCC), fmt(totalCostDM + totalCostCC)],
          ['Divide by EUP', fmtN(eup_dm), fmtN(eup_cc), ''],
          ['Cost per equivalent unit', fmt2(cpeu_dm), fmt2(cpeu_cc), fmt2(cpeu_total)],
        ]
      )
    + '<h4 style="margin:var(--space-5) 0 var(--space-3);">Steps 4 and 5: Assign Costs</h4>'
    + table(
        ['', 'Amount'],
        [
          ['Completed and transferred out (' + fmtN(completed) + ' x ' + fmt2(cpeu_total) + ')', fmt(costCompleted)],
          ['Ending WIP -- Direct Materials (' + fmtN(endWIP * endPctDM) + ' x ' + fmt2(cpeu_dm) + ')', fmt(costEndWIP_dm)],
          ['Ending WIP -- Conversion (' + fmtN(endWIP * endPctCC) + ' x ' + fmt2(cpeu_cc) + ')', fmt(costEndWIP_cc)],
        ],
        ['Total costs assigned', fmt(totalAssigned)]
      )
    + insight('Total costs available: ' + fmt(totalAvailable) + ' | Total costs assigned: ' + fmt(totalAssigned) + ' | Difference (rounding): ' + fmt(Math.abs(totalAvailable - totalAssigned)))
    + '</div>';

  renderShowWork(el('wa-show-work'), [
    { label: 'EUP -- Direct Materials', formula: 'Completed + Ending WIP x End%', values: fmtN(completed) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctDM*100), result: fmtN(eup_dm) },
    { label: 'EUP -- Conversion', formula: 'Completed + Ending WIP x End%', values: fmtN(completed) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctCC*100), result: fmtN(eup_cc) },
    { label: 'Cost per EUP -- DM', formula: '(Beg WIP Cost DM + Current Cost DM) / EUP DM', values: '(' + fmt(begCostDM) + ' + ' + fmt(currCostDM) + ') / ' + fmtN(eup_dm), result: fmt2(cpeu_dm) },
    { label: 'Cost per EUP -- Conversion', formula: '(Beg WIP Cost CC + Current Cost CC) / EUP CC', values: '(' + fmt(begCostCC) + ' + ' + fmt(currCostCC) + ') / ' + fmtN(eup_cc), result: fmt2(cpeu_cc) },
    { label: 'Total Cost per EUP', formula: 'CPEU DM + CPEU CC', values: fmt2(cpeu_dm) + ' + ' + fmt2(cpeu_cc), result: fmt2(cpeu_total), highlight: true },
    { label: 'Cost of Completed Units', formula: 'Completed x Total CPEU', values: fmtN(completed) + ' x ' + fmt2(cpeu_total), result: fmt(costCompleted), highlight: true },
    { label: 'Cost of Ending WIP', formula: 'EUP DM x CPEU DM + EUP CC x CPEU CC', values: fmtN(endWIP * endPctDM) + ' x ' + fmt2(cpeu_dm) + ' + ' + fmtN(endWIP * endPctCC) + ' x ' + fmt2(cpeu_cc), result: fmt(costEndWIP) },
  ], { title: 'Weighted-Average Process Costing', defaultOpen: false });
}

function initWeightedAverage() {
  const btn = el('wa-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcWeightedAverage);

  el('wa-load-example') && el('wa-load-example').addEventListener('click', () => {
    setVal('wa-beg-wip', 400); setVal('wa-started', 2000); setVal('wa-completed', 2100);
    setVal('wa-end-wip', 300); setVal('wa-end-pct-dm', 100); setVal('wa-end-pct-cc', 67);
    setVal('wa-beg-cost-dm', 32000); setVal('wa-beg-cost-cc', 18900);
    setVal('wa-curr-cost-dm', 160000); setVal('wa-curr-cost-cc', 150000);
    calcWeightedAverage();
  });

  initRandomizer('wa-randomize', [
    { id: 'wa-beg-wip',       min: 0,      max: 1000,   step: 50,   integer: true },
    { id: 'wa-started',       min: 500,    max: 5000,   step: 100,  integer: true },
    { id: 'wa-completed',     min: 400,    max: 4500,   step: 100,  integer: true },
    { id: 'wa-end-pct-dm',    min: 0,      max: 100,    step: 10 },
    { id: 'wa-end-pct-cc',    min: 0,      max: 100,    step: 10 },
    { id: 'wa-beg-cost-dm',   min: 5000,   max: 100000, step: 5000, integer: true },
    { id: 'wa-beg-cost-cc',   min: 2000,   max: 80000,  step: 2000, integer: true },
    { id: 'wa-curr-cost-dm',  min: 50000,  max: 500000, step: 10000, integer: true },
    { id: 'wa-curr-cost-cc',  min: 30000,  max: 400000, step: 10000, integer: true },
  ], () => {
    const beg   = val('wa-beg-wip');
    const start = val('wa-started');
    const comp  = val('wa-completed');
    setVal('wa-end-wip', Math.max(0, beg + start - comp));
    calcWeightedAverage();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- FIFO Process Costing Engine
// ══════════════════════════════════════════════════════════════════════════════

function calcFIFO() {
  const begWIP      = val('fifo-beg-wip');
  const begPctDM    = val('fifo-beg-pct-dm') / 100;
  const begPctCC    = val('fifo-beg-pct-cc') / 100;
  const started     = val('fifo-started');
  const completed   = val('fifo-completed');
  const endWIP      = val('fifo-end-wip');
  const endPctDM    = val('fifo-end-pct-dm') / 100;
  const endPctCC    = val('fifo-end-pct-cc') / 100;
  const begCostDM   = val('fifo-beg-cost-dm');
  const begCostCC   = val('fifo-beg-cost-cc');
  const currCostDM  = val('fifo-curr-cost-dm');
  const currCostCC  = val('fifo-curr-cost-cc');

  const startedAndCompleted = Math.max(0, completed - begWIP);

  // Step 2: FIFO EUP
  const eup_dm = begWIP * (1 - begPctDM) + startedAndCompleted + endWIP * endPctDM;
  const eup_cc = begWIP * (1 - begPctCC) + startedAndCompleted + endWIP * endPctCC;

  // Step 3: Cost per EUP (current period costs only)
  const cpeu_dm = eup_dm > 0 ? currCostDM / eup_dm : 0;
  const cpeu_cc = eup_cc > 0 ? currCostCC / eup_cc : 0;
  const cpeu_total = cpeu_dm + cpeu_cc;

  // Step 4 & 5: Assign costs
  const begWIPCarry   = begCostDM + begCostCC;
  const costToFinishDM = begWIP * (1 - begPctDM) * cpeu_dm;
  const costToFinishCC = begWIP * (1 - begPctCC) * cpeu_cc;
  const costBegCompleted = begWIPCarry + costToFinishDM + costToFinishCC;

  const costSandC     = startedAndCompleted * cpeu_total;
  const costCompleted = costBegCompleted + costSandC;

  const costEndWIP_dm = endWIP * endPctDM * cpeu_dm;
  const costEndWIP_cc = endWIP * endPctCC * cpeu_cc;
  const costEndWIP    = costEndWIP_dm + costEndWIP_cc;

  const totalAssigned  = costCompleted + costEndWIP;
  const totalAvailable = begCostDM + begCostCC + currCostDM + currCostCC;

  const out = getOrCreate('fifo-output', 'div', 'tool-output', el('fifo-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<h4 style="margin-bottom:var(--space-3);">Step 2: FIFO Equivalent Units of Production</h4>'
    + table(
        ['Component', 'Direct Materials', 'Conversion'],
        [
          ['Complete beginning WIP (work remaining)', fmtN(begWIP * (1-begPctDM)), fmtN(begWIP * (1-begPctCC))],
          ['Started and completed this period', fmtN(startedAndCompleted), fmtN(startedAndCompleted)],
          ['Ending WIP', fmtN(endWIP * endPctDM), fmtN(endWIP * endPctCC)],
        ],
        ['EUP (FIFO)', fmtN(eup_dm), fmtN(eup_cc)]
      )
    + '<h4 style="margin:var(--space-5) 0 var(--space-3);">Step 3: Cost per Equivalent Unit (Current Period Only)</h4>'
    + table(
        ['', 'Direct Materials', 'Conversion', 'Total'],
        [
          ['Current period costs only', fmt(currCostDM), fmt(currCostCC), fmt(currCostDM + currCostCC)],
          ['Divide by FIFO EUP', fmtN(eup_dm), fmtN(eup_cc), ''],
          ['Cost per equivalent unit', fmt2(cpeu_dm), fmt2(cpeu_cc), fmt2(cpeu_total)],
        ]
      )
    + '<h4 style="margin:var(--space-5) 0 var(--space-3);">Steps 4 and 5: Assign Costs</h4>'
    + table(
        ['', 'Amount'],
        [
          ['Beginning WIP carried forward', fmt(begWIPCarry)],
          ['Cost to finish beginning WIP -- DM (' + fmtN(begWIP*(1-begPctDM)) + ' x ' + fmt2(cpeu_dm) + ')', fmt(costToFinishDM)],
          ['Cost to finish beginning WIP -- CC (' + fmtN(begWIP*(1-begPctCC)) + ' x ' + fmt2(cpeu_cc) + ')', fmt(costToFinishCC)],
          ['Started and completed (' + fmtN(startedAndCompleted) + ' x ' + fmt2(cpeu_total) + ')', fmt(costSandC)],
          ['Total cost of completed units', fmt(costCompleted)],
          ['Ending WIP -- DM (' + fmtN(endWIP*endPctDM) + ' x ' + fmt2(cpeu_dm) + ')', fmt(costEndWIP_dm)],
          ['Ending WIP -- CC (' + fmtN(endWIP*endPctCC) + ' x ' + fmt2(cpeu_cc) + ')', fmt(costEndWIP_cc)],
        ],
        ['Total costs assigned', fmt(totalAssigned)]
      )
    + insight('Total costs available: ' + fmt(totalAvailable) + ' | Total costs assigned: ' + fmt(totalAssigned) + ' | Difference (rounding): ' + fmt(Math.abs(totalAvailable - totalAssigned)))
    + '</div>';

  renderShowWork(el('fifo-show-work'), [
    { label: 'Started and Completed', formula: 'Completed - Beginning WIP', values: fmtN(completed) + ' - ' + fmtN(begWIP), result: fmtN(startedAndCompleted) },
    { label: 'FIFO EUP -- Conversion', formula: 'Beg WIP x (1-Beg%) + S&C + End WIP x End%', values: fmtN(begWIP) + ' x ' + fmtPct((1-begPctCC)*100) + ' + ' + fmtN(startedAndCompleted) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctCC*100), result: fmtN(eup_cc), highlight: true },
    { label: 'CPEU -- DM (current period only)', formula: 'Current DM Cost / FIFO EUP DM', values: fmt(currCostDM) + ' / ' + fmtN(eup_dm), result: fmt2(cpeu_dm) },
    { label: 'CPEU -- Conversion (current period only)', formula: 'Current CC Cost / FIFO EUP CC', values: fmt(currCostCC) + ' / ' + fmtN(eup_cc), result: fmt2(cpeu_cc) },
    { label: 'Cost to Complete Beginning WIP', formula: 'Beg WIP cost + remaining DM + remaining CC', values: fmt(begWIPCarry) + ' + ' + fmt(costToFinishDM) + ' + ' + fmt(costToFinishCC), result: fmt(costBegCompleted) },
    { label: 'Total Cost of Completed Units', formula: 'Cost to complete beg WIP + Started and completed cost', values: fmt(costBegCompleted) + ' + ' + fmt(costSandC), result: fmt(costCompleted), highlight: true },
    { label: 'Cost of Ending WIP', formula: 'EUP DM x CPEU DM + EUP CC x CPEU CC', values: fmtN(endWIP*endPctDM) + ' x ' + fmt2(cpeu_dm) + ' + ' + fmtN(endWIP*endPctCC) + ' x ' + fmt2(cpeu_cc), result: fmt(costEndWIP) },
  ], { title: 'FIFO Process Costing', defaultOpen: false });
}

function initFIFO() {
  const btn = el('fifo-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcFIFO);

  el('fifo-load-example') && el('fifo-load-example').addEventListener('click', () => {
    setVal('fifo-beg-wip', 400); setVal('fifo-beg-pct-dm', 100); setVal('fifo-beg-pct-cc', 25);
    setVal('fifo-started', 2000); setVal('fifo-completed', 2100);
    setVal('fifo-end-wip', 300); setVal('fifo-end-pct-dm', 100); setVal('fifo-end-pct-cc', 67);
    setVal('fifo-beg-cost-dm', 32000); setVal('fifo-beg-cost-cc', 18900);
    setVal('fifo-curr-cost-dm', 160000); setVal('fifo-curr-cost-cc', 150000);
    calcFIFO();
  });

  initRandomizer('fifo-randomize', [
    { id: 'fifo-beg-wip',      min: 0,      max: 1000,   step: 50,   integer: true },
    { id: 'fifo-beg-pct-dm',   min: 0,      max: 100,    step: 10 },
    { id: 'fifo-beg-pct-cc',   min: 0,      max: 100,    step: 10 },
    { id: 'fifo-started',      min: 500,    max: 5000,   step: 100,  integer: true },
    { id: 'fifo-completed',    min: 400,    max: 4500,   step: 100,  integer: true },
    { id: 'fifo-end-pct-dm',   min: 0,      max: 100,    step: 10 },
    { id: 'fifo-end-pct-cc',   min: 0,      max: 100,    step: 10 },
    { id: 'fifo-beg-cost-dm',  min: 5000,   max: 100000, step: 5000, integer: true },
    { id: 'fifo-beg-cost-cc',  min: 2000,   max: 80000,  step: 2000, integer: true },
    { id: 'fifo-curr-cost-dm', min: 50000,  max: 500000, step: 10000, integer: true },
    { id: 'fifo-curr-cost-cc', min: 30000,  max: 400000, step: 10000, integer: true },
  ], () => {
    const beg   = val('fifo-beg-wip');
    const start = val('fifo-started');
    const comp  = val('fifo-completed');
    setVal('fifo-end-wip', Math.max(0, beg + start - comp));
    calcFIFO();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Method Comparator
// ══════════════════════════════════════════════════════════════════════════════

function calcComparator() {
  const begWIP      = val('cmp-beg-wip');
  const begPctCC    = val('cmp-beg-pct-cc') / 100;
  const started     = val('cmp-started');
  const completed   = val('cmp-completed');
  const endWIP      = val('cmp-end-wip');
  const endPctCC    = val('cmp-end-pct-cc') / 100;
  const begCostDM   = val('cmp-beg-cost-dm');
  const begCostCC   = val('cmp-beg-cost-cc');
  const currCostDM  = val('cmp-curr-cost-dm');
  const currCostCC  = val('cmp-curr-cost-cc');

  const endPctDM = 1;
  const begPctDM = 1;

  // Weighted-Average
  const wa_eup_dm   = completed + endWIP * endPctDM;
  const wa_eup_cc   = completed + endWIP * endPctCC;
  const wa_cpeu_dm  = wa_eup_dm > 0 ? (begCostDM + currCostDM) / wa_eup_dm : 0;
  const wa_cpeu_cc  = wa_eup_cc > 0 ? (begCostCC + currCostCC) / wa_eup_cc : 0;
  const wa_cpeu     = wa_cpeu_dm + wa_cpeu_cc;
  const wa_completed = completed * wa_cpeu;
  const wa_endWIP   = endWIP * endPctDM * wa_cpeu_dm + endWIP * endPctCC * wa_cpeu_cc;

  // FIFO
  const sc          = Math.max(0, completed - begWIP);
  const fifo_eup_dm = begWIP * (1-begPctDM) + sc + endWIP * endPctDM;
  const fifo_eup_cc = begWIP * (1-begPctCC) + sc + endWIP * endPctCC;
  const fifo_cpeu_dm = fifo_eup_dm > 0 ? currCostDM / fifo_eup_dm : 0;
  const fifo_cpeu_cc = fifo_eup_cc > 0 ? currCostCC / fifo_eup_cc : 0;
  const fifo_cpeu   = fifo_cpeu_dm + fifo_cpeu_cc;
  const fifo_begCost = begCostDM + begCostCC + begWIP*(1-begPctDM)*fifo_cpeu_dm + begWIP*(1-begPctCC)*fifo_cpeu_cc;
  const fifo_completed = fifo_begCost + sc * fifo_cpeu;
  const fifo_endWIP = endWIP * endPctDM * fifo_cpeu_dm + endWIP * endPctCC * fifo_cpeu_cc;

  const diffCPEU      = wa_cpeu - fifo_cpeu;
  const diffCompleted = wa_completed - fifo_completed;
  const diffEndWIP    = wa_endWIP - fifo_endWIP;

  const out = getOrCreate('cmp-output', 'div', 'tool-output', el('cmp-calculate').parentElement);

  const diffClass = n => n >= 0 ? 'variance-fav' : 'variance-unfav';

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="overflow-x:auto;"><table class="ch12-result-table" style="width:100%;">'
    + '<thead><tr><th>Metric</th><th>Weighted-Average</th><th>FIFO</th><th>Difference (WA - FIFO)</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>EUP -- Conversion</td><td>' + fmtN(wa_eup_cc) + '</td><td>' + fmtN(fifo_eup_cc) + '</td><td class="' + diffClass(wa_eup_cc - fifo_eup_cc) + '">' + fmtN(wa_eup_cc - fifo_eup_cc) + '</td></tr>'
    + '<tr><td>Cost per EUP -- Conversion</td><td>' + fmt2(wa_cpeu_cc) + '</td><td>' + fmt2(fifo_cpeu_cc) + '</td><td class="' + diffClass(wa_cpeu_cc - fifo_cpeu_cc) + '">' + (wa_cpeu_cc - fifo_cpeu_cc >= 0 ? '+' : '') + '$' + Math.abs(wa_cpeu_cc - fifo_cpeu_cc).toFixed(2) + '</td></tr>'
    + '<tr><td>Total Cost per EUP</td><td>' + fmt2(wa_cpeu) + '</td><td>' + fmt2(fifo_cpeu) + '</td><td class="' + diffClass(wa_cpeu - fifo_cpeu) + '">' + (wa_cpeu - fifo_cpeu >= 0 ? '+' : '') + '$' + Math.abs(wa_cpeu - fifo_cpeu).toFixed(2) + '</td></tr>'
    + '<tr><td><strong>Cost of Completed Units</strong></td><td><strong>' + fmt(wa_completed) + '</strong></td><td><strong>' + fmt(fifo_completed) + '</strong></td><td class="' + diffClass(diffCompleted) + '"><strong>' + (diffCompleted >= 0 ? '+' : '-') + fmt(Math.abs(diffCompleted)) + '</strong></td></tr>'
    + '<tr><td><strong>Cost of Ending WIP</strong></td><td><strong>' + fmt(wa_endWIP) + '</strong></td><td><strong>' + fmt(fifo_endWIP) + '</strong></td><td class="' + diffClass(diffEndWIP) + '"><strong>' + (diffEndWIP >= 0 ? '+' : '-') + fmt(Math.abs(diffEndWIP)) + '</strong></td></tr>'
    + '</tbody></table></div>'
    + '<div style="margin-top:var(--space-5);padding:var(--space-4);background:var(--color-gray-50);border:1px solid var(--color-gray-200);border-radius:var(--radius-md);">'
    + '<strong>When does the method choice matter?</strong>'
    + '<ul style="margin:var(--space-3) 0 0;padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);">'
    + '<li>When beginning WIP is large relative to total units, FIFO and WA diverge more.</li>'
    + '<li>When costs change significantly between periods, FIFO gives a better picture of current-period efficiency.</li>'
    + '<li>When beginning WIP is zero, both methods produce identical results.</li>'
    + '<li>FIFO is preferred for performance evaluation because it isolates current-period costs.</li>'
    + '<li>Weighted-average is simpler and preferred when cost stability makes period separation unnecessary.</li>'
    + '</ul>'
    + '</div>'
    + insight('Cost difference on completed units: ' + (diffCompleted >= 0 ? '+' : '') + fmt(diffCompleted) + '. Cost difference on ending WIP: ' + (diffEndWIP >= 0 ? '+' : '') + fmt(diffEndWIP) + '. Total costs assigned are the same under both methods -- only the allocation between completed units and ending WIP differs.')
    + '</div>';

  renderShowWork(el('cmp-show-work'), [
    { label: 'WA EUP -- Conversion', formula: 'Completed + Ending WIP x End%', values: fmtN(completed) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctCC*100), result: fmtN(wa_eup_cc) },
    { label: 'FIFO EUP -- Conversion', formula: 'Beg WIP x (1-Beg%) + S&C + End WIP x End%', values: fmtN(begWIP) + ' x ' + fmtPct((1-begPctCC)*100) + ' + ' + fmtN(sc) + ' + ' + fmtN(endWIP) + ' x ' + fmtPct(endPctCC*100), result: fmtN(fifo_eup_cc) },
    { label: 'WA Cost per EUP', formula: 'Total costs / WA EUP', values: fmt(begCostDM+begCostCC+currCostDM+currCostCC) + ' / ' + fmtN(wa_eup_cc), result: fmt2(wa_cpeu), highlight: true },
    { label: 'FIFO Cost per EUP', formula: 'Current period costs only / FIFO EUP', values: fmt(currCostDM+currCostCC) + ' / ' + fmtN(fifo_eup_cc), result: fmt2(fifo_cpeu), highlight: true },
    { label: 'WA Cost of Completed Units', formula: 'Completed x WA CPEU', values: fmtN(completed) + ' x ' + fmt2(wa_cpeu), result: fmt(wa_completed) },
    { label: 'FIFO Cost of Completed Units', formula: 'Beg WIP cost + finish cost + S&C cost', values: fmt(fifo_begCost) + ' + ' + fmt(sc * fifo_cpeu), result: fmt(fifo_completed) },
    { label: 'Difference in Completed Unit Cost', formula: 'WA - FIFO', values: fmt(wa_completed) + ' - ' + fmt(fifo_completed), result: (diffCompleted >= 0 ? '+' : '') + fmt(diffCompleted), highlight: true },
  ], { title: 'WA vs FIFO Comparison', defaultOpen: false });
}

function initComparator() {
  const btn = el('cmp-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcComparator);

  el('cmp-load-example') && el('cmp-load-example').addEventListener('click', () => {
    setVal('cmp-beg-wip', 400); setVal('cmp-beg-pct-cc', 25);
    setVal('cmp-started', 2000); setVal('cmp-completed', 2100);
    setVal('cmp-end-wip', 300); setVal('cmp-end-pct-cc', 67);
    setVal('cmp-beg-cost-dm', 32000); setVal('cmp-beg-cost-cc', 18900);
    setVal('cmp-curr-cost-dm', 160000); setVal('cmp-curr-cost-cc', 150000);
    calcComparator();
  });

  initRandomizer('cmp-randomize', [
    { id: 'cmp-beg-wip',      min: 0,      max: 1000,   step: 50,   integer: true },
    { id: 'cmp-beg-pct-cc',   min: 0,      max: 100,    step: 10 },
    { id: 'cmp-started',      min: 500,    max: 5000,   step: 100,  integer: true },
    { id: 'cmp-completed',    min: 400,    max: 4500,   step: 100,  integer: true },
    { id: 'cmp-end-pct-cc',   min: 0,      max: 100,    step: 10 },
    { id: 'cmp-beg-cost-dm',  min: 5000,   max: 100000, step: 5000, integer: true },
    { id: 'cmp-beg-cost-cc',  min: 2000,   max: 80000,  step: 2000, integer: true },
    { id: 'cmp-curr-cost-dm', min: 50000,  max: 500000, step: 10000, integer: true },
    { id: 'cmp-curr-cost-cc', min: 30000,  max: 400000, step: 10000, integer: true },
  ], () => {
    const beg   = val('cmp-beg-wip');
    const start = val('cmp-started');
    const comp  = val('cmp-completed');
    setVal('cmp-end-wip', Math.max(0, beg + start - comp));
    calcComparator();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Process Costing', definition: 'A costing system in which the cost of a product is obtained by using broad averages to assign costs to masses of similar units. Used when identical or similar units are produced in large quantities.' },
  { term: 'Work-in-Process (WIP)', definition: 'Units that have been started but not yet completed at the end of a period. WIP must be valued in terms of equivalent units.' },
  { term: 'Equivalent Units of Production (EUP)', definition: 'A derived measure of output that takes the quantity of each input in units completed and in units in ending WIP inventory and converts them into the amount of completed output that could have been made with that quantity of input.' },
  { term: 'Weighted-Average Method', definition: 'A process-costing method that assigns the average of the costs in beginning WIP and costs added during the current period to equivalent units completed and to equivalent units in ending WIP.' },
  { term: 'FIFO Method', definition: 'A process-costing method that assigns the cost of the previous accounting period\'s equivalent units in beginning WIP to the first units completed and assigns the cost of equivalent units worked on during the current period to ending WIP.' },
  { term: 'Transferred-In Costs', definition: 'Costs incurred in a previous department that are carried forward as the product moves to a subsequent process. Treated like a separate cost category (similar to direct materials) in the receiving department.' },
  { term: 'Splitoff Point', definition: 'The juncture in a joint production process when two or more products become separately identifiable. Relevant to joint costing in Chapter 17.' },
  { term: 'Five-Step Procedure', definition: 'The standard process costing framework: (1) Summarize physical unit flow, (2) Compute equivalent units, (3) Compute cost per equivalent unit, (4) Summarize total costs, (5) Assign costs to units completed and ending WIP.' },
  { term: 'Cost per Equivalent Unit', definition: 'Total costs in a cost category divided by equivalent units of production in that category. Used to assign costs to completed units and ending WIP.' },
  { term: 'Normal Spoilage', definition: 'Spoilage that arises under efficient operating conditions. It is an inherent result of the process and is included in the cost of good units produced.' },
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
  if (el('ch18-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch18-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch18');
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
  const btn  = el('mark-complete-btn');
  const card = el('chapter-complete');
  const status = el('ch18-status');
  if (!btn || !card) return;

  if (isChapterComplete('ch18')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }

  btn.addEventListener('click', () => {
    markChapterComplete('ch18');
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
  initPhysicalUnits();
  initEUP();
  initWeightedAverage();
  initFIFO();
  initComparator();
  initKeyTerms();
  initChapterComplete();
});
