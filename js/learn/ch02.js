/**
 * ch02.js — Chapter 2: An Introduction to Cost Terms and Purposes
 * Tools: Cost Classifier, Relevant Range Visualizer, Manufacturing Cost Flow, Unit Cost Trap
 */
import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initRandomizer } from '/js/components/randomizer.js';

const CLASSIFIER_ITEMS = [
  {
    scenario: 'Cost object: Tesla Model 3 vehicles produced',
    item: 'Steel and tires used in assembly',
    assign: 'direct',
    behavior: 'variable',
    explanation: 'Steel and tires are traceable directly to each Model 3 (direct) and total cost rises proportionally with units produced (variable).'
  },
  {
    scenario: 'Cost object: Tesla Model 3 vehicles produced',
    item: 'Salary of the Model 3 assembly line supervisor',
    assign: 'direct',
    behavior: 'fixed',
    explanation: 'The supervisor works exclusively on the Model 3 line so the cost is traceable (direct), but the salary does not change with the number of cars produced (fixed).'
  },
  {
    scenario: 'Cost object: Tesla Model 3 vehicles produced',
    item: 'Depreciation of the Tesla Factory building',
    assign: 'indirect',
    behavior: 'fixed',
    explanation: 'The factory houses multiple product lines so depreciation cannot be traced to Model 3 alone (indirect), and it does not change with production volume (fixed).'
  },
  {
    scenario: 'Cost object: Tesla Model 3 vehicles produced',
    item: 'Power costs metered only to the entire plant',
    assign: 'indirect',
    behavior: 'variable',
    explanation: 'Power cannot be traced to a specific model without separate metering (indirect), but total power usage rises as more cars are produced (variable).'
  },
  {
    scenario: 'Cost object: Number of mortgage loans processed',
    item: 'Fee paid to property appraisal company per loan',
    assign: 'direct',
    behavior: 'variable',
    explanation: 'Each appraisal fee is incurred for a specific loan (direct) and total fees increase with each additional loan processed (variable).'
  },
  {
    scenario: 'Cost object: Number of mortgage loans processed',
    item: 'Salary of the mortgage department executive',
    assign: 'direct',
    behavior: 'fixed',
    explanation: 'The executive works exclusively in the mortgage department (direct), but the salary does not change based on how many loans are processed (fixed).'
  },
  {
    scenario: 'Cost object: Number of mortgage loans processed',
    item: 'Annual cost of sponsoring a golf tournament',
    assign: 'indirect',
    behavior: 'fixed',
    explanation: 'Sponsorship benefits the bank broadly and cannot be traced to individual loans (indirect), and the cost is set annually regardless of loan volume (fixed).'
  },
  {
    scenario: 'Cost object: Cooper Furniture recliners assembled',
    item: 'Cost of fabric used on recliners',
    assign: 'direct',
    behavior: 'variable',
    explanation: 'Fabric is used exclusively on recliners and can be traced to each unit (direct), and total fabric cost rises with each recliner assembled (variable).'
  },
  {
    scenario: 'Cost object: Cooper Furniture recliners assembled',
    item: 'Annual fire insurance for the Potomac plant',
    assign: 'indirect',
    behavior: 'fixed',
    explanation: 'Insurance covers the entire plant including the rocker line (indirect), and the annual premium does not change with recliner production volume (fixed).'
  },
  {
    scenario: 'Cost object: Cooper Furniture recliners assembled',
    item: 'Wages of temporary workers hired during peak recliner production',
    assign: 'direct',
    behavior: 'variable',
    explanation: 'These workers are hired specifically for recliner assembly (direct) and total wages rise and fall with production volume (variable).'
  },
];

const KEY_TERMS = [
  { term: 'Cost Object', definition: 'Anything for which a separate measurement of costs is desired. Examples: a product, service, project, customer, activity, or department.' },
  { term: 'Direct Cost', definition: 'A cost that is related to a particular cost object and can be traced to it in an economically feasible way. Also called cost tracing.' },
  { term: 'Indirect Cost', definition: 'A cost that is related to a particular cost object but cannot be traced to it in an economically feasible way. Indirect costs are allocated to cost objects.' },
  { term: 'Cost Allocation', definition: 'The process of assigning indirect costs to a particular cost object using a reasonable allocation base.' },
  { term: 'Cost Tracing', definition: 'The assignment of direct costs to a particular cost object using a direct measure of the resources consumed.' },
  { term: 'Variable Cost', definition: 'A cost that changes in total in proportion to changes in the volume or activity level of a cost object. The cost per unit remains constant.' },
  { term: 'Fixed Cost', definition: 'A cost that remains unchanged in total for a given time period despite wide changes in the volume or activity level of a cost object. The cost per unit decreases as volume increases.' },
  { term: 'Cost Driver', definition: 'A variable that causally affects total costs over a given time span, such as units produced, machine hours, or miles driven.' },
  { term: 'Relevant Range', definition: 'The band of activity within which a specific relationship between cost and volume is valid. Outside this range, cost behavior may change.' },
  { term: 'Inventoriable Costs', definition: 'All costs of a product that are considered assets when incurred and expensed as cost of goods sold only when the product is sold. For manufacturers, these are all manufacturing costs.' },
  { term: 'Period Costs', definition: 'All costs in the income statement other than cost of goods sold. Expensed in the period incurred. Examples: R&D, marketing, distribution, customer service.' },
  { term: 'Direct Materials Costs', definition: 'Acquisition costs of all materials that eventually become part of the cost object and can be traced to it in an economically feasible way.' },
  { term: 'Direct Manufacturing Labor Costs', definition: 'Compensation of all manufacturing labor that can be traced to the cost object in an economically feasible way.' },
  { term: 'Manufacturing Overhead Costs', definition: 'All manufacturing costs that are related to the cost object but cannot be traced to it. Also called indirect manufacturing costs or factory overhead.' },
  { term: 'Prime Costs', definition: 'All direct manufacturing costs: direct materials + direct manufacturing labor.' },
  { term: 'Conversion Costs', definition: 'All manufacturing costs other than direct materials: direct manufacturing labor + manufacturing overhead.' },
  { term: 'Cost of Goods Manufactured', definition: 'The cost of goods brought to completion during the period. Calculated as: Beginning WIP + Total Manufacturing Costs Incurred minus Ending WIP.' },
  { term: 'Unit Cost', definition: 'Also called average cost. Total cost divided by the number of units. Must be interpreted cautiously because fixed costs per unit change with volume.' },
  { term: 'Product Cost', definition: 'The sum of costs assigned to a product for a specific purpose. Differs depending on whether the purpose is financial reporting, pricing decisions, or government contracts.' },
  { term: 'Work-in-Process Inventory', definition: 'Goods partially worked on but not yet completed. Appears as an asset on the balance sheet.' },
];

function initCostClassifier() {
  const scenarioEl   = document.getElementById('classifier-scenario');
  const itemEl       = document.getElementById('classifier-item');
  const feedbackEl   = document.getElementById('classifier-feedback');
  const feedbackText = document.getElementById('classifier-feedback-text');
  const counterEl    = document.getElementById('classifier-counter');
  const prevBtn      = document.getElementById('classifier-prev');
  const nextBtn      = document.getElementById('classifier-next');
  const progressFill = document.getElementById('classifier-progress-fill');
  const progressLabel= document.getElementById('classifier-progress-label');
  if (!scenarioEl) return;

  let current   = 0;
  const answers = CLASSIFIER_ITEMS.map(() => ({ assign: null, behavior: null }));
  const correct = new Array(CLASSIFIER_ITEMS.length).fill(false);

  function render(index) {
    const item = CLASSIFIER_ITEMS[index];
    scenarioEl.textContent = item.scenario;
    itemEl.textContent     = item.item;
    feedbackEl.hidden      = true;
    counterEl.textContent  = `${index + 1} of ${CLASSIFIER_ITEMS.length}`;
    prevBtn.disabled       = index === 0;

    document.querySelectorAll('.classifier-btn').forEach(btn => {
      btn.classList.remove('classifier-btn--selected', 'classifier-btn--correct', 'classifier-btn--incorrect');
    });

    const saved = answers[index];
    if (saved.assign) {
      const btn = document.querySelector(`[data-dim="assign"][data-val="${saved.assign}"]`);
      if (btn) btn.classList.add(saved.assign === item.assign ? 'classifier-btn--correct' : 'classifier-btn--incorrect');
    }
    if (saved.behavior) {
      const btn = document.querySelector(`[data-dim="behavior"][data-val="${saved.behavior}"]`);
      if (btn) btn.classList.add(saved.behavior === item.behavior ? 'classifier-btn--correct' : 'classifier-btn--incorrect');
    }

    if (correct[index]) {
      feedbackEl.hidden = false;
      feedbackEl.className = 'classifier-feedback classifier-feedback--success';
      feedbackText.textContent = item.explanation;
      nextBtn.disabled = index === CLASSIFIER_ITEMS.length - 1;
    } else if (saved.assign && saved.behavior) {
      feedbackEl.hidden = false;
      feedbackEl.className = 'classifier-feedback classifier-feedback--hint';
      const hints = [];
      if (saved.assign   !== item.assign)   hints.push('assignment (direct/indirect)');
      if (saved.behavior !== item.behavior) hints.push('behavior (variable/fixed)');
      feedbackText.textContent = `Not quite — reconsider the ${hints.join(' and ')}.`;
      nextBtn.disabled = true;
    } else {
      nextBtn.disabled = true;
    }
    updateProgress();
  }

  function updateProgress() {
    const count = correct.filter(Boolean).length;
    const pct   = Math.round((count / CLASSIFIER_ITEMS.length) * 100);
    progressFill.style.width  = `${pct}%`;
    progressLabel.textContent = `${count} of ${CLASSIFIER_ITEMS.length} classified correctly`;
  }

  document.querySelectorAll('.classifier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (correct[current]) return;
      answers[current][btn.dataset.dim] = btn.dataset.val;
      const item = CLASSIFIER_ITEMS[current];
      if (answers[current].assign && answers[current].behavior) {
        if (answers[current].assign === item.assign && answers[current].behavior === item.behavior) {
          correct[current] = true;
        }
      }
      render(current);
    });
  });

  prevBtn.addEventListener('click', () => { if (current > 0) render(--current); });
  nextBtn.addEventListener('click', () => { if (current < CLASSIFIER_ITEMS.length - 1) render(++current); });
  render(0);
}

function initRelevantRange() {
  const slider       = document.getElementById('miles-slider');
  const milesDisplay = document.getElementById('miles-display');
  const trucksEl     = document.getElementById('rr-trucks');
  const totalFixEl   = document.getElementById('rr-total-fixed');
  const unitFixEl    = document.getElementById('rr-unit-fixed');
  const rangeEl      = document.getElementById('rr-range');
  const diagramEl    = document.getElementById('rr-diagram');
  const insightText  = document.getElementById('rr-insight-text');
  if (!slider) return;

  const TRUCK_COST     = 40000;
  const TRUCK_CAPACITY = 120000;

  function fmtMiles(n) { return n.toLocaleString(); }
  function fmtDollar(n) { return '$' + n.toLocaleString(); }

  function update() {
    const miles  = parseInt(slider.value);
    const trucks = Math.ceil(miles / TRUCK_CAPACITY);
    const total  = trucks * TRUCK_COST;
    const unit   = (total / miles).toFixed(3);
    const rStart = (trucks - 1) * TRUCK_CAPACITY + 1;
    const rEnd   = trucks * TRUCK_CAPACITY;

    milesDisplay.textContent = fmtMiles(miles);
    trucksEl.textContent     = trucks;
    totalFixEl.textContent   = fmtDollar(total);
    unitFixEl.textContent    = '$' + unit;
    rangeEl.textContent      = `${fmtMiles(rStart)}-${fmtMiles(rEnd)}`;

    renderDiagram(miles, trucks);

    const lowerMiles  = Math.max(miles - 50000, 10000);
    const lowerTrucks = Math.ceil(lowerMiles / TRUCK_CAPACITY);
    const lowerTotal  = lowerTrucks * TRUCK_COST;
    const costChange  = lowerTrucks < trucks
      ? `could drop to ${fmtDollar(lowerTotal)}`
      : `stays at ${fmtDollar(total)}`;

    insightText.textContent = `At ${fmtMiles(miles)} miles you need ${trucks} truck${trucks > 1 ? 's' : ''} `
      + `at a total fixed cost of ${fmtDollar(total)}. The unit fixed cost is $${unit}/mile. `
      + `If volume drops to ${fmtMiles(lowerMiles)} miles, total fixed cost ${costChange} `
      + `— but the unit cost changes regardless.`;
  }

  function renderDiagram(currentMiles, currentTrucks) {
    const maxTrucks = 3;
    const maxMiles  = TRUCK_CAPACITY * maxTrucks;
    const width     = diagramEl.clientWidth || 600;
    const height    = 160;
    const padL = 70, padR = 20, padT = 20, padB = 30;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const maxCost = maxTrucks * TRUCK_COST;

    const xS = m => padL + (m / maxMiles) * chartW;
    const yS = c => padT + chartH - (c / maxCost) * chartH;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px;" aria-hidden="true">`;
    svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="var(--color-border)" stroke-width="1"/>`;
    svg += `<line x1="${padL}" y1="${padT+chartH}" x2="${padL+chartW}" y2="${padT+chartH}" stroke="var(--color-border)" stroke-width="1"/>`;

    for (let t = 1; t <= maxTrucks; t++) {
      const cost   = t * TRUCK_COST;
      const y      = yS(cost);
      const xStart = xS((t-1) * TRUCK_CAPACITY);
      const xEnd   = xS(t * TRUCK_CAPACITY);
      const active = t === currentTrucks;
      svg += `<line x1="${xStart}" y1="${y}" x2="${xEnd}" y2="${y}" stroke="${active ? 'var(--color-accent)' : 'var(--color-gray-300)'}" stroke-width="${active ? 3 : 1.5}"/>`;
      if (t < maxTrucks) {
        const xNext = xS(t * TRUCK_CAPACITY);
        svg += `<line x1="${xNext}" y1="${y}" x2="${xNext}" y2="${yS((t+1)*TRUCK_COST)}" stroke="var(--color-gray-300)" stroke-width="1.5" stroke-dasharray="4,3"/>`;
      }
      svg += `<text x="${padL-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--color-text-muted)">$${(cost/1000).toFixed(0)}k</text>`;
    }

    const cx = xS(currentMiles);
    const cy = yS(currentTrucks * TRUCK_COST);
    const rS = xS((currentTrucks-1) * TRUCK_CAPACITY);
    const rE = xS(currentTrucks * TRUCK_CAPACITY);
    svg += `<rect x="${rS}" y="${padT}" width="${rE-rS}" height="${chartH}" fill="var(--color-accent)" opacity="0.08"/>`;
    svg += `<line x1="${cx}" y1="${padT}" x2="${cx}" y2="${padT+chartH}" stroke="var(--color-primary)" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="5" fill="var(--color-accent)" stroke="white" stroke-width="2"/>`;

    for (let t = 0; t <= maxTrucks; t++) {
      svg += `<text x="${xS(t*TRUCK_CAPACITY)}" y="${padT+chartH+16}" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">${(t*TRUCK_CAPACITY/1000).toFixed(0)}k</text>`;
    }
    svg += `<text x="${padL+chartW/2}" y="${height-2}" text-anchor="middle" font-size="10" fill="var(--color-text-muted)">Miles Hauled</text>`;
    svg += '</svg>';
    diagramEl.innerHTML = svg;
  }

  slider.addEventListener('input', update);
  update();
}

function initCostFlow() {
  const calcBtn = document.getElementById('cf-calculate');
  const diagram = document.getElementById('cf-diagram');
  if (!calcBtn) return;

  const fmt    = n => '$' + Math.round(n).toLocaleString();
  const getVal = id => parseFloat(document.getElementById(id).value) || 0;
  const set    = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmt(val); };

  calcBtn.addEventListener('click', () => {
    const dmBegin     = getVal('cf-dm-begin');
    const dmPurchases = getVal('cf-dm-purchases');
    const dmEnd       = getVal('cf-dm-end');
    const labor       = getVal('cf-labor');
    const overhead    = getVal('cf-overhead');
    const wipBegin    = getVal('cf-wip-begin');
    const wipEnd      = getVal('cf-wip-end');
    const fgBegin     = getVal('cf-fg-begin');
    const fgEnd       = getVal('cf-fg-end');

    const dmAvailable = dmBegin + dmPurchases;
    const dmUsed      = dmAvailable - dmEnd;
    const mfgCosts    = dmUsed + labor + overhead;
    const wipTotal    = wipBegin + mfgCosts;
    const cogm        = wipTotal - wipEnd;
    const fgAvailable = fgBegin + cogm;
    const cogs        = fgAvailable - fgEnd;

    set('cf-out-dm-begin',     dmBegin);
    set('cf-out-dm-purchases', dmPurchases);
    set('cf-out-dm-available', dmAvailable);
    set('cf-out-dm-end',       dmEnd);
    set('cf-out-dm-used',      dmUsed);
    set('cf-out-wip-begin',    wipBegin);
    set('cf-out-wip-dm',       dmUsed);
    set('cf-out-wip-dl',       labor);
    set('cf-out-wip-oh',       overhead);
    set('cf-out-wip-total',    wipTotal);
    set('cf-out-wip-end',      wipEnd);
    set('cf-out-cogm',         cogm);
    set('cf-out-fg-begin',     fgBegin);
    set('cf-out-fg-cogm',      cogm);
    set('cf-out-fg-available', fgAvailable);
    set('cf-out-fg-end',       fgEnd);
    set('cf-out-cogs',         cogs);
    set('cf-sum-dm-used',      dmUsed);
    set('cf-sum-mfg-costs',    mfgCosts);
    set('cf-sum-cogm',         cogm);
    set('cf-sum-cogs',         cogs);

    diagram.hidden = false;

    const cfSW = document.getElementById('cf-show-work') || (() => {
      const el = document.createElement('div');
      el.id = 'cf-show-work';
      diagram.parentElement.appendChild(el);
      return el;
    })();
    renderShowWork(cfSW, [
      {
        label:   'Direct Materials Used',
        formula: 'DM Used = Beginning Inventory + Purchases − Ending Inventory',
        values:  `$${dmBegin.toLocaleString()} + $${dmPurchases.toLocaleString()} − $${dmEnd.toLocaleString()}`,
        result:  '$' + dmUsed.toLocaleString(),
      },
      {
        label:   'Total Manufacturing Costs Incurred',
        formula: 'Total Mfg Costs = DM Used + Direct Labor + Manufacturing Overhead',
        values:  `$${dmUsed.toLocaleString()} + $${labor.toLocaleString()} + $${overhead.toLocaleString()}`,
        result:  '$' + mfgCosts.toLocaleString(),
      },
      {
        label:   'Cost of Goods Manufactured (COGM)',
        formula: 'COGM = Beginning WIP + Total Mfg Costs − Ending WIP',
        values:  `$${wipBegin.toLocaleString()} + $${mfgCosts.toLocaleString()} − $${wipEnd.toLocaleString()}`,
        result:  '$' + cogm.toLocaleString(),
        highlight: true,
      },
      {
        label:   'Cost of Goods Sold (COGS)',
        formula: 'COGS = Beginning Finished Goods + COGM − Ending Finished Goods',
        values:  `$${fgBegin.toLocaleString()} + $${cogm.toLocaleString()} − $${fgEnd.toLocaleString()}`,
        result:  '$' + cogs.toLocaleString(),
        highlight: true,
        note:    'COGS flows to the income statement as an expense only when goods are sold.',
      },
    ], { title: 'Show Work — Manufacturing Cost Flow' });
  });
}

function initUnitCostTrap() {
  const calcBtn   = document.getElementById('uc-calculate');
  const resultsEl = document.getElementById('uc-results');
  const tableBody = document.getElementById('uc-table-body');
  const trapText  = document.getElementById('uc-trap-text');
  if (!calcBtn) return;

  const getVal     = id => parseFloat(document.getElementById(id).value) || 0;
  const fmtDollar  = n => '$' + Math.round(n).toLocaleString();
  const fmtUnits   = n => Math.round(n).toLocaleString() + ' units';

  calcBtn.addEventListener('click', () => {
    const fixed       = getVal('uc-fixed');
    const variable    = getVal('uc-variable');
    const baseVol     = getVal('uc-base-volume');
    const predictVol  = getVal('uc-predict-volume');

    const baseTotalVar    = variable * baseVol;
    const baseTotalCost   = fixed + baseTotalVar;
    const baseUnitCost    = baseTotalCost / baseVol;
    const predictTotalVar = variable * predictVol;
    const predictTotalCost= fixed + predictTotalVar;
    const wrongEstimate   = baseUnitCost * predictVol;
    const error           = Math.abs(wrongEstimate - predictTotalCost);
    const overUnder       = wrongEstimate < predictTotalCost ? 'underestimates' : 'overestimates';

    const rows = [
      ['Units Produced',                              fmtUnits(baseVol),          fmtUnits(predictVol)],
      ['Variable Cost per Unit',                      fmtDollar(variable),        fmtDollar(variable)],
      ['Total Variable Costs',                        fmtDollar(baseTotalVar),    fmtDollar(predictTotalVar)],
      ['Total Fixed Costs',                           fmtDollar(fixed),           fmtDollar(fixed)],
      ['Total Costs (correct)',                       fmtDollar(baseTotalCost),   fmtDollar(predictTotalCost)],
      ['Unit Cost',                                   fmtDollar(baseUnitCost),    fmtDollar(predictTotalCost / predictVol)],
      ['Wrong estimate (base unit cost x predicted)', '—',                        fmtDollar(wrongEstimate)],
      ['Error',                                       '—',                        fmtDollar(error)],
    ];

    tableBody.innerHTML = '';
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      if (i === 4 || i === 5) tr.style.fontWeight = '600';
      if (i === 6) tr.style.color = 'var(--color-warning)';
      if (i === 7) tr.style.color = 'var(--color-danger)';
      row.forEach((cell, ci) => {
        const td = document.createElement('td');
        td.textContent = cell;
        if (ci > 0) td.style.textAlign = 'right';
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });

    trapText.textContent = `Using the base unit cost of ${fmtDollar(baseUnitCost)} to predict costs at `
      + `${fmtUnits(predictVol)} gives ${fmtDollar(wrongEstimate)} — but the correct total cost is `
      + `${fmtDollar(predictTotalCost)}. The unit cost ${overUnder} actual costs by ${fmtDollar(error)}. `
      + `This happens because the ${fmtDollar(fixed)} of fixed costs is spread over fewer units at the lower volume. `
      + `The unit cost of ${fmtDollar(baseUnitCost)} is only valid at exactly ${fmtUnits(baseVol)}.`;

    resultsEl.hidden = false;

    const ucSW = document.getElementById('uc-show-work') || (() => {
      const el = document.createElement('div');
      el.id = 'uc-show-work';
      resultsEl.parentElement.appendChild(el);
      return el;
    })();
    renderShowWork(ucSW, [
      {
        label:   'Base Unit Cost',
        formula: 'Unit Cost = Total Costs ÷ Units Produced',
        values:  `($${fixed.toLocaleString()} + $${(variable * baseVol).toLocaleString()}) ÷ ${baseVol.toLocaleString()} units`,
        result:  '$' + baseUnitCost.toFixed(2) + '/unit',
      },
      {
        label:   'Correct Total Cost at Predicted Volume',
        formula: 'Total Cost = Fixed Costs + (Variable Cost/unit × Units)',
        values:  `$${fixed.toLocaleString()} + ($${variable.toLocaleString()} × ${predictVol.toLocaleString()})`,
        result:  '$' + predictTotalCost.toLocaleString(),
        highlight: true,
      },
      {
        label:   'Wrong Estimate Using Base Unit Cost',
        formula: 'Wrong Estimate = Base Unit Cost × Predicted Volume',
        values:  `$${baseUnitCost.toFixed(2)} × ${predictVol.toLocaleString()} units`,
        result:  '$' + wrongEstimate.toLocaleString(),
      },
      {
        label:   'The Error',
        formula: 'Error = Wrong Estimate − Correct Total Cost',
        values:  `$${wrongEstimate.toLocaleString()} − $${predictTotalCost.toLocaleString()}`,
        result:  '$' + error.toLocaleString() + ' ' + (wrongEstimate > predictTotalCost ? 'overestimate' : 'underestimate'),
        highlight: true,
        note:    'The unit cost of $' + baseUnitCost.toFixed(2) + ' is only valid at exactly ' + baseVol.toLocaleString() + ' units. Fixed costs spread differently at every other volume.',
      },
    ], { title: 'Show Work — Unit Cost Trap' });
  });
}

function initKeyTerms() {
  const grid = document.getElementById('key-terms-grid');
  if (!grid) return;
  KEY_TERMS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'key-term';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-expanded', 'false');
    div.innerHTML = `<div class="key-term__word">${item.term}</div><p class="key-term__definition">${item.definition}</p>`;
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

function initChapterComplete() {
  const btn       = document.getElementById('mark-complete-btn');
  const statusEl  = document.getElementById('ch02-status');
  const actionsEl = btn?.closest('.chapter-complete__actions');

  if (isChapterComplete('ch02')) setCompleteUI();
  btn?.addEventListener('click', () => { markChapterComplete('ch02'); setCompleteUI(); });

  function setCompleteUI() {
    if (statusEl) { statusEl.textContent = '✓ Completed'; statusEl.classList.add('chapter-hero__progress-label--complete'); }
    if (btn)      { btn.textContent = '✓ Completed'; btn.disabled = true; }
    if (actionsEl && !actionsEl.querySelector('.reset-chapter-btn')) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn--ghost-danger reset-chapter-btn';
      resetBtn.textContent = 'Reset Chapter';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset Chapter 2? This will clear your completion status and reload the page.')) {
          resetChapter('ch02');
          window.location.reload();
        }
      });
      actionsEl.appendChild(resetBtn);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCostClassifier();
  initRelevantRange();
  initCostFlow();
  initRandomizer('cf-randomize-btn', [
    { id: 'cf-dm-begin',     min: 0,     max: 50000,  step: 1000, integer: true },
    { id: 'cf-dm-purchases', min: 10000, max: 200000, step: 5000, integer: true },
    { id: 'cf-dm-end',       min: 0,     max: 30000,  step: 1000, integer: true },
    { id: 'cf-labor',        min: 5000,  max: 100000, step: 1000, integer: true },
    { id: 'cf-overhead',     min: 5000,  max: 80000,  step: 1000, integer: true },
    { id: 'cf-wip-begin',    min: 0,     max: 20000,  step: 1000, integer: true },
    { id: 'cf-wip-end',      min: 0,     max: 20000,  step: 1000, integer: true },
    { id: 'cf-fg-begin',     min: 0,     max: 50000,  step: 1000, integer: true },
    { id: 'cf-fg-end',       min: 0,     max: 50000,  step: 1000, integer: true },
  ], () => document.getElementById('cf-calculate').click());
  initUnitCostTrap();
  initRandomizer('uc-randomize-btn', [
    { id: 'uc-fixed',          min: 100000,  max: 20000000, step: 100000,  integer: true },
    { id: 'uc-variable',       min: 5,       max: 500,      step: 5,       integer: true },
    { id: 'uc-base-volume',    min: 10000,   max: 1000000,  step: 10000,   integer: true },
    { id: 'uc-predict-volume', min: 5000,    max: 900000,   step: 5000,    integer: true, constraint: 'lessThan:uc-base-volume' },
  ], () => document.getElementById('uc-calculate').click());
  initKeyTerms();
  initChapterComplete();
});
