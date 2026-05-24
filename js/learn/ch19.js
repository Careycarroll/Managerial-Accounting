import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initHeader } from '/js/components/header.js';

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
const sval = id => { const n = el(id); return n ? n.value.trim() : ''; };
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
// TOOL 1 -- Spoilage, Rework, and Scrap Classifier
// ══════════════════════════════════════════════════════════════════════════════

const CLASSIFIER_SCENARIOS = [
  {
    text: 'A glass manufacturer expects 3% of bottles to crack during the firing process. This rate has been consistent for years and is considered inherent to the process.',
    answer: 'normal-spoilage',
    why: 'Spoilage that is inherent in an efficient production process and arises under normal operating conditions is normal spoilage. It is absorbed into the cost of good units.'
  },
  {
    text: 'A power outage causes a batch of 500 pharmaceutical tablets to be exposed to humidity, rendering them unusable. This has never happened before.',
    answer: 'abnormal-spoilage',
    why: 'Spoilage caused by an unusual event not inherent in the normal production process is abnormal spoilage. It is expensed immediately as a loss.'
  },
  {
    text: 'A furniture maker finds that chair legs are cut 2mm too short. Workers re-cut and re-sand the legs to correct the defect. The chairs are then sold as first-quality goods.',
    answer: 'rework',
    why: 'Rework involves correcting defective units so they can be sold as good units. The cost of rework is either charged to the specific job or to manufacturing overhead depending on whether it is normal or abnormal.'
  },
  {
    text: 'Metal shavings left over from machining operations are collected and sold to a recycler for $0.08 per pound.',
    answer: 'scrap',
    why: 'Scrap is a residual output of a production process that has low sales value relative to the main product. Metal shavings sold to a recycler are classic scrap.'
  },
  {
    text: 'A bakery expects 2% of loaves to be misshapen due to oven variation. These loaves are sold at a discount as day-old bread.',
    answer: 'normal-spoilage',
    why: 'Misshapen loaves from normal oven variation are normal spoilage. The expected rate makes this inherent to the process.'
  },
  {
    text: 'A semiconductor fab produces 200 chips with microscopic cracks due to a contaminated chemical bath. The contamination was caused by a supplier error.',
    answer: 'abnormal-spoilage',
    why: 'Spoilage caused by a supplier error is not inherent in the normal production process. It is abnormal spoilage and should be expensed, not absorbed into good unit costs.'
  },
  {
    text: 'Fabric remnants left after cutting garment patterns are bundled and sold to a quilting supply company.',
    answer: 'scrap',
    why: 'Fabric remnants from cutting operations are scrap -- a residual with low relative value that can be sold.'
  },
  {
    text: 'A circuit board manufacturer finds that 1% of boards have a soldering defect. Workers re-solder the connections. This defect rate is expected and budgeted.',
    answer: 'rework',
    why: 'Expected, budgeted rework to correct defective units is normal rework. The cost is typically charged to manufacturing overhead and spread across all jobs.'
  },
  {
    text: 'A paint manufacturer expects 1.5% of batches to fail color-matching tests due to pigment variation. Failed batches are discarded.',
    answer: 'normal-spoilage',
    why: 'An expected failure rate inherent in the pigment-mixing process is normal spoilage. It is absorbed into the cost of good batches.'
  },
  {
    text: 'Wood chips and sawdust from a lumber mill are collected and sold to a paper manufacturer.',
    answer: 'scrap',
    why: 'Wood chips and sawdust are byproduct residuals with low relative value -- classic scrap from a manufacturing process.'
  },
  {
    text: 'A flood damages 800 units of finished goods in a warehouse. The units cannot be repaired and must be discarded.',
    answer: 'abnormal-spoilage',
    why: 'Flood damage is not inherent in the production process. This is abnormal spoilage -- an unusual loss that is expensed immediately.'
  },
  {
    text: 'A jewelry maker finds that 10 rings have scratches from a polishing machine. Workers re-polish the rings to restore them to sellable condition.',
    answer: 'rework',
    why: 'Re-polishing defective rings to make them sellable is rework. Whether it is normal or abnormal depends on whether such scratches are expected in the normal polishing process.'
  }
];

let scIndex = -1;
let scCorrect = 0;
let scTotal = 0;
let scUsed = [];

const SC_LABELS = {
  'normal-spoilage': 'Normal Spoilage',
  'abnormal-spoilage': 'Abnormal Spoilage',
  'rework': 'Rework',
  'scrap': 'Scrap'
};

function initSpoilageClassifier() {
  const nextBtn  = el('sc-next-btn');
  const resetBtn = el('sc-reset-btn');
  if (!nextBtn) return;
  nextBtn.addEventListener('click', showNextScenario);
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      scUsed = []; scCorrect = 0; scTotal = 0; scIndex = -1;
      const area = el('sc-scenario-area');
      const res  = el('sc-results-area');
      if (area) area.innerHTML = '';
      if (res)  res.innerHTML = '';
      showNextScenario();
    });
  }
}

function showNextScenario() {
  const area = el('sc-scenario-area');
  if (!area) return;
  const available = CLASSIFIER_SCENARIOS.map((_, i) => i).filter(i => !scUsed.includes(i));
  if (available.length === 0) {
    area.innerHTML = '<div class="card" style="margin-top:var(--space-4);"><p class="result-highlight">All 12 scenarios completed.</p></div>';
    updateScResults();
    return;
  }
  const pick = available[Math.floor(Math.random() * available.length)];
  scUsed.push(pick);
  scIndex = pick;
  const s = CLASSIFIER_SCENARIOS[pick];
  area.innerHTML = '<div class="card" style="margin-top:var(--space-4);">'
    + '<p style="font-size:var(--font-size-lg);line-height:1.6;margin-bottom:var(--space-4);">' + s.text + '</p>'
    + '<div class="tool-actions" style="flex-wrap:wrap;">'
    + '<button class="btn btn--primary sc-answer-btn" data-answer="normal-spoilage">Normal Spoilage</button>'
    + '<button class="btn btn--secondary sc-answer-btn" data-answer="abnormal-spoilage">Abnormal Spoilage</button>'
    + '<button class="btn btn--secondary sc-answer-btn" data-answer="rework">Rework</button>'
    + '<button class="btn btn--secondary sc-answer-btn" data-answer="scrap">Scrap</button>'
    + '</div>'
    + '<div id="sc-feedback"></div>'
    + '</div>';
  area.querySelectorAll('.sc-answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handleScAnswer(btn.dataset.answer));
  });
}

function handleScAnswer(chosen) {
  const s = CLASSIFIER_SCENARIOS[scIndex];
  const feedback = el('sc-feedback');
  if (!s || !feedback) return;
  const correct = chosen === s.answer;
  scTotal++;
  if (correct) scCorrect++;
  feedback.innerHTML = '<div style="margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:'
    + (correct ? 'var(--color-success-bg, #1a3a2a);border:1px solid var(--color-success)' : 'var(--color-danger-bg, #3a1a1a);border:1px solid var(--color-danger)')
    + ';">'
    + '<h4 style="margin:0 0 var(--space-2);">' + (correct ? 'Correct' : 'Not quite') + ' -- ' + SC_LABELS[s.answer] + '</h4>'
    + '<p style="margin:0;">' + s.why + '</p>'
    + '</div>';
  feedback.parentElement.querySelectorAll('.sc-answer-btn').forEach(btn => { btn.disabled = true; });
  updateScResults();
}

function updateScResults() {
  const area = el('sc-results-area');
  if (!area) return;
  area.innerHTML = insight('Score: <strong>' + scCorrect + ' / ' + scTotal + '</strong> | Remaining: <strong>' + (CLASSIFIER_SCENARIOS.length - scUsed.length) + '</strong>');
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Inspection Point Analyzer
// ══════════════════════════════════════════════════════════════════════════════

function calcInspectionPoint() {
  const begWIP       = val('ip-beg-wip');
  const begPct       = val('ip-beg-pct') / 100;
  const started      = val('ip-started');
  const goodCompleted = val('ip-good-completed');
  const spoiled      = val('ip-spoiled');
  const endWIP       = val('ip-end-wip');
  const endPct       = val('ip-end-pct') / 100;
  const inspection   = val('ip-inspection') / 100;
  const normalRate   = val('ip-normal-rate') / 100;

  const toAccountFor = begWIP + started;
  const accountedFor = goodCompleted + spoiled + endWIP;
  const balanced     = Math.abs(toAccountFor - accountedFor) < 0.5;

  // Which units passed the inspection point?
  const begWIPInspected  = begPct < inspection ? 0 : begWIP;  // beg WIP already past inspection
  const endWIPInspected  = endPct >= inspection ? endWIP : 0;  // end WIP reached inspection

  // Units that passed inspection this period
  const unitsInspected = goodCompleted + spoiled + endWIPInspected;

  // Normal spoilage = normalRate x good units that passed inspection
  const normalSpoilage   = Math.round(goodCompleted * normalRate);
  const abnormalSpoilage = Math.max(0, spoiled - normalSpoilage);

  const out = getOrCreate('ip-output', 'div', 'tool-output', el('ip-calculate').parentElement);

  const balanceColor = balanced ? 'var(--color-success)' : 'var(--color-danger)';

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="padding:var(--space-3);border-radius:var(--radius-md);border:2px solid ' + balanceColor + ';background:' + (balanced ? 'var(--color-success-bg, #1a3a2a)' : 'var(--color-danger-bg, #3a1a1a)') + ';margin-bottom:var(--space-4);">'
    + '<strong>Physical Flow: ' + (balanced ? 'Balanced' : 'Does not balance') + '</strong>'
    + ' -- Units to account for: ' + fmtN(toAccountFor) + ' | Units accounted for: ' + fmtN(accountedFor)
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Inspection Point Analysis',
        table(
          ['Category', 'Units', 'Inspected?'],
          [
            ['Beginning WIP (already ' + fmtPct(begPct * 100) + ' complete)', fmtN(begWIP), begPct >= inspection ? 'Already past inspection' : 'Passes inspection this period'],
            ['Good units completed', fmtN(goodCompleted), 'Yes -- all completed units pass'],
            ['Ending WIP (' + fmtPct(endPct * 100) + ' complete)', fmtN(endWIP), endPct >= inspection ? 'Yes -- reached inspection point' : 'No -- not yet at ' + fmtPct(inspection * 100)],
            ['Spoiled units', fmtN(spoiled), 'Yes -- detected at inspection'],
          ]
        ),
        'Inspection point is at ' + fmtPct(inspection * 100) + ' completion. Only units that reach this point bear spoilage costs.'
      )
    + panel('Normal vs. Abnormal Spoilage',
        table(
          ['Type', 'Units', 'Treatment'],
          [
            ['Total spoiled units', fmtN(spoiled), 'Detected at inspection point'],
            ['Normal spoilage (' + fmtPct(normalRate * 100) + ' x ' + fmtN(goodCompleted) + ')', fmtN(normalSpoilage), 'Absorbed into good unit costs'],
            ['Abnormal spoilage (remainder)', fmtN(abnormalSpoilage), 'Expensed immediately as a loss'],
          ],
          ['Total', fmtN(spoiled), '']
        ),
        'Normal spoilage = normal rate x good units inspected. Abnormal spoilage = total spoiled - normal spoilage.'
      )
    + '</div>'
    + insight('Key rule: Ending WIP units that have NOT yet reached the inspection point (' + fmtPct(inspection * 100) + '%) do NOT bear any spoilage costs. Only units that pass through the inspection point this period share in normal spoilage costs.')
    + '</div>';

  renderShowWork(el('ip-show-work'), [
    { label: 'Units to Account For', formula: 'Beginning WIP + Units Started', values: fmtN(begWIP) + ' + ' + fmtN(started), result: fmtN(toAccountFor) },
    { label: 'Units Accounted For', formula: 'Good Completed + Spoiled + Ending WIP', values: fmtN(goodCompleted) + ' + ' + fmtN(spoiled) + ' + ' + fmtN(endWIP), result: fmtN(accountedFor) },
    { label: 'Ending WIP Inspected?', formula: 'Ending WIP completion % vs inspection point %', values: fmtPct(endPct * 100) + ' vs ' + fmtPct(inspection * 100), result: endPct >= inspection ? 'Yes -- bears spoilage costs' : 'No -- does not bear spoilage costs' },
    { label: 'Normal Spoilage', formula: 'Normal rate x Good units completed', values: fmtPct(normalRate * 100) + ' x ' + fmtN(goodCompleted), result: fmtN(normalSpoilage), highlight: true },
    { label: 'Abnormal Spoilage', formula: 'Total spoiled - Normal spoilage', values: fmtN(spoiled) + ' - ' + fmtN(normalSpoilage), result: fmtN(abnormalSpoilage), highlight: true },
  ], { title: 'Inspection Point Analysis', defaultOpen: false });
}

function initInspectionPoint() {
  const btn = el('ip-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcInspectionPoint);

  el('ip-load-example') && el('ip-load-example').addEventListener('click', () => {
    setVal('ip-beg-wip', 500);
    setVal('ip-beg-pct', 40);
    setVal('ip-started', 2000);
    setVal('ip-good-completed', 1800);
    setVal('ip-spoiled', 100);
    setVal('ip-end-wip', 600);
    setVal('ip-end-pct', 25);
    setVal('ip-inspection', 100);
    setVal('ip-normal-rate', 5);
    calcInspectionPoint();
  });

  initRandomizer('ip-randomize', [
    { id: 'ip-beg-wip',       min: 0,    max: 1000, step: 50,  integer: true },
    { id: 'ip-beg-pct',       min: 10,   max: 90,   step: 10 },
    { id: 'ip-started',       min: 1000, max: 5000, step: 100, integer: true },
    { id: 'ip-good-completed',min: 800,  max: 4500, step: 100, integer: true },
    { id: 'ip-spoiled',       min: 0,    max: 300,  step: 10,  integer: true },
    { id: 'ip-end-pct',       min: 10,   max: 80,   step: 10 },
    { id: 'ip-inspection',    min: 50,   max: 100,  step: 10 },
    { id: 'ip-normal-rate',   min: 1,    max: 8,    step: 0.5 },
  ], () => {
    const beg     = val('ip-beg-wip');
    const started = val('ip-started');
    const good    = val('ip-good-completed');
    const spoiled = val('ip-spoiled');
    const endWIP  = Math.max(0, beg + started - good - spoiled);
    setVal('ip-end-wip', endWIP);
    calcInspectionPoint();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Weighted-Average Process Costing with Spoilage
// ══════════════════════════════════════════════════════════════════════════════

function calcWASpoilage() {
  const begWIP        = val('wa-beg-wip');
  const begPctDM      = val('wa-beg-pct-dm') / 100;
  const begPctCC      = val('wa-beg-pct-cc') / 100;
  const started       = val('wa-started');
  const goodUnits     = val('wa-good-units');
  const normalSpoil   = val('wa-normal-spoil');
  const abnormalSpoil = val('wa-abnormal-spoil');
  const endWIP        = val('wa-end-wip');
  const endPctDM      = val('wa-end-pct-dm') / 100;
  const endPctCC      = val('wa-end-pct-cc') / 100;
  const inspection    = val('wa-inspection') / 100;

  const begCostDM  = val('wa-beg-cost-dm');
  const begCostCC  = val('wa-beg-cost-cc');
  const currCostDM = val('wa-curr-cost-dm');
  const currCostCC = val('wa-curr-cost-cc');

  const toAccountFor = begWIP + started;
  const accountedFor = goodUnits + normalSpoil + abnormalSpoil + endWIP;
  const balanced     = Math.abs(toAccountFor - accountedFor) < 0.5;

  // Step 2: EUP (weighted-average)
  // Normal spoilage -- at inspection point (100% DM typically, inspection % for CC)
  const normalSpoilDM = normalSpoil * 1;
  const normalSpoilCC = normalSpoil * inspection;
  const abnormalSpoilDM = abnormalSpoil * 1;
  const abnormalSpoilCC = abnormalSpoil * inspection;

  const eupDM = goodUnits + normalSpoilDM + abnormalSpoilDM + endWIP * endPctDM;
  const eupCC = goodUnits + normalSpoilCC + abnormalSpoilCC + endWIP * endPctCC;

  // Step 3: Cost per EUP
  const totalCostDM = begCostDM + currCostDM;
  const totalCostCC = begCostCC + currCostCC;
  const cpuDM = eupDM > 0 ? totalCostDM / eupDM : 0;
  const cpuCC = eupCC > 0 ? totalCostCC / eupCC : 0;
  const cpuTotal = cpuDM + cpuCC;

  // Step 4: Assign costs
  const goodUnitCost    = goodUnits * cpuTotal;
  const normalCost      = normalSpoilDM * cpuDM + normalSpoilCC * cpuCC;
  const abnormalCost    = abnormalSpoilDM * cpuDM + abnormalSpoilCC * cpuCC;
  const endWIPCostDM    = endWIP * endPctDM * cpuDM;
  const endWIPCostCC    = endWIP * endPctCC * cpuCC;
  const endWIPCost      = endWIPCostDM + endWIPCostCC;

  // Normal spoilage absorbed into good units
  const goodUnitTotalCost = goodUnitCost + normalCost;
  const costPerGoodUnit   = goodUnits > 0 ? goodUnitTotalCost / goodUnits : 0;

  const totalAssigned = goodUnitTotalCost + abnormalCost + endWIPCost;
  const totalAvailable = totalCostDM + totalCostCC;

  const out = getOrCreate('wa-output', 'div', 'tool-output', el('wa-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + (balanced ? '' : insight('<strong>Warning:</strong> Units do not balance. Check inputs before interpreting costs.'))
    + '<h4>Step 1: Physical Flow</h4>'
    + table(
        ['Source', 'Units'],
        [
          ['Beginning WIP', fmtN(begWIP)],
          ['Started this period', fmtN(started)],
        ],
        ['Total to account for', fmtN(toAccountFor)]
      )
    + table(
        ['Destination', 'Units'],
        [
          ['Good units completed', fmtN(goodUnits)],
          ['Normal spoilage', fmtN(normalSpoil)],
          ['Abnormal spoilage', fmtN(abnormalSpoil)],
          ['Ending WIP', fmtN(endWIP)],
        ],
        ['Total accounted for', fmtN(accountedFor)]
      )
    + '<h4 style="margin-top:var(--space-4);">Step 2: Equivalent Units (Weighted-Average)</h4>'
    + table(
        ['Component', 'DM EUP', 'Conversion EUP'],
        [
          ['Good units completed', fmtN(goodUnits), fmtN(goodUnits)],
          ['Normal spoilage (at inspection ' + fmtPct(inspection * 100) + ')', fmtN(normalSpoilDM), fmtN(normalSpoilCC)],
          ['Abnormal spoilage (at inspection ' + fmtPct(inspection * 100) + ')', fmtN(abnormalSpoilDM), fmtN(abnormalSpoilCC)],
          ['Ending WIP (' + fmtPct(endPctDM * 100) + '% DM, ' + fmtPct(endPctCC * 100) + '% CC)', fmtN(endWIP * endPctDM), fmtN(endWIP * endPctCC)],
        ],
        ['Total EUP', fmtN(eupDM), fmtN(eupCC)]
      )
    + '<h4 style="margin-top:var(--space-4);">Step 3: Cost per Equivalent Unit</h4>'
    + table(
        ['Cost Category', 'Beginning WIP', 'Current Period', 'Total', 'EUP', 'Cost per EU'],
        [
          ['Direct Materials', fmt(begCostDM), fmt(currCostDM), fmt(totalCostDM), fmtN(eupDM), fmt2(cpuDM)],
          ['Conversion Costs', fmt(begCostCC), fmt(currCostCC), fmt(totalCostCC), fmtN(eupCC), fmt2(cpuCC)],
        ],
        ['Total', fmt(begCostDM + begCostCC), fmt(currCostDM + currCostCC), fmt(totalAvailable), '', fmt2(cpuTotal)]
      )
    + '<h4 style="margin-top:var(--space-4);">Step 4 &amp; 5: Assign Costs</h4>'
    + table(
        ['Category', 'Calculation', 'Amount'],
        [
          ['Good units completed', fmtN(goodUnits) + ' x ' + fmt2(cpuTotal), fmt(goodUnitCost)],
          ['Normal spoilage (absorbed into good units)', fmtN(normalSpoilDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(normalSpoilCC) + ' x ' + fmt2(cpuCC), fmt(normalCost)],
          ['Total cost of good units (incl. normal spoilage)', '', fmt(goodUnitTotalCost)],
          ['Cost per good unit', fmt(goodUnitTotalCost) + ' / ' + fmtN(goodUnits), fmt2(costPerGoodUnit)],
          ['Abnormal spoilage (expensed)', fmtN(abnormalSpoilDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(abnormalSpoilCC) + ' x ' + fmt2(cpuCC), fmt(abnormalCost)],
          ['Ending WIP', fmtN(endWIP * endPctDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(endWIP * endPctCC) + ' x ' + fmt2(cpuCC), fmt(endWIPCost)],
        ],
        ['Total Costs Assigned', '', fmt(totalAssigned)]
      )
    + insight('Normal spoilage cost of ' + fmt(normalCost) + ' is added to good unit costs, raising the cost per good unit to ' + fmt2(costPerGoodUnit) + '. Abnormal spoilage of ' + fmt(abnormalCost) + ' is expensed and never assigned to good units.')
    + '</div>';

  renderShowWork(el('wa-show-work'), [
    { label: 'Total DM Cost Available', formula: 'Beginning WIP DM + Current Period DM', values: fmt(begCostDM) + ' + ' + fmt(currCostDM), result: fmt(totalCostDM) },
    { label: 'Total CC Cost Available', formula: 'Beginning WIP CC + Current Period CC', values: fmt(begCostCC) + ' + ' + fmt(currCostCC), result: fmt(totalCostCC) },
    { label: 'EUP -- Direct Materials', formula: 'Good + Normal Spoil + Abnormal Spoil + Ending WIP x DM%', values: fmtN(goodUnits) + ' + ' + fmtN(normalSpoilDM) + ' + ' + fmtN(abnormalSpoilDM) + ' + ' + fmtN(endWIP * endPctDM), result: fmtN(eupDM) },
    { label: 'EUP -- Conversion', formula: 'Good + Normal Spoil x insp% + Abnormal Spoil x insp% + Ending WIP x CC%', values: fmtN(goodUnits) + ' + ' + fmtN(normalSpoilCC) + ' + ' + fmtN(abnormalSpoilCC) + ' + ' + fmtN(endWIP * endPctCC), result: fmtN(eupCC) },
    { label: 'Cost per EU -- DM', formula: 'Total DM / EUP DM', values: fmt(totalCostDM) + ' / ' + fmtN(eupDM), result: fmt2(cpuDM), highlight: true },
    { label: 'Cost per EU -- Conversion', formula: 'Total CC / EUP CC', values: fmt(totalCostCC) + ' / ' + fmtN(eupCC), result: fmt2(cpuCC), highlight: true },
    { label: 'Normal Spoilage Cost', formula: 'Normal spoil EUP x CPU (absorbed into good units)', values: fmtN(normalSpoilDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(normalSpoilCC) + ' x ' + fmt2(cpuCC), result: fmt(normalCost) },
    { label: 'Abnormal Spoilage Cost', formula: 'Abnormal spoil EUP x CPU (expensed)', values: fmtN(abnormalSpoilDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(abnormalSpoilCC) + ' x ' + fmt2(cpuCC), result: fmt(abnormalCost) },
    { label: 'Cost per Good Unit', formula: '(Good unit cost + Normal spoilage cost) / Good units', values: '(' + fmt(goodUnitCost) + ' + ' + fmt(normalCost) + ') / ' + fmtN(goodUnits), result: fmt2(costPerGoodUnit), highlight: true },
  ], { title: 'Weighted-Average with Spoilage', defaultOpen: false });
}

function initWASpoilage() {
  const btn = el('wa-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcWASpoilage);

  el('wa-load-example') && el('wa-load-example').addEventListener('click', () => {
    setVal('wa-beg-wip', 1000); setVal('wa-beg-pct-dm', 100); setVal('wa-beg-pct-cc', 40);
    setVal('wa-started', 4000); setVal('wa-good-units', 4000);
    setVal('wa-normal-spoil', 200); setVal('wa-abnormal-spoil', 100);
    setVal('wa-end-wip', 700); setVal('wa-end-pct-dm', 100); setVal('wa-end-pct-cc', 30);
    setVal('wa-inspection', 100);
    setVal('wa-beg-cost-dm', 1595); setVal('wa-beg-cost-cc', 1146);
    setVal('wa-curr-cost-dm', 6405); setVal('wa-curr-cost-cc', 8604);
    calcWASpoilage();
  });

  initRandomizer('wa-randomize', [
    { id: 'wa-beg-wip',        min: 0,    max: 2000,  step: 100,  integer: true },
    { id: 'wa-beg-pct-cc',     min: 10,   max: 80,    step: 10 },
    { id: 'wa-started',        min: 2000, max: 8000,  step: 200,  integer: true },
    { id: 'wa-good-units',     min: 1500, max: 7000,  step: 200,  integer: true },
    { id: 'wa-normal-spoil',   min: 50,   max: 400,   step: 50,   integer: true },
    { id: 'wa-abnormal-spoil', min: 0,    max: 200,   step: 25,   integer: true },
    { id: 'wa-end-pct-cc',     min: 10,   max: 70,    step: 10 },
    { id: 'wa-beg-cost-dm',    min: 500,  max: 5000,  step: 100,  integer: true },
    { id: 'wa-beg-cost-cc',    min: 300,  max: 3000,  step: 100,  integer: true },
    { id: 'wa-curr-cost-dm',   min: 2000, max: 15000, step: 500,  integer: true },
    { id: 'wa-curr-cost-cc',   min: 2000, max: 15000, step: 500,  integer: true },
  ], () => {
    const beg     = val('wa-beg-wip');
    const started = val('wa-started');
    const good    = val('wa-good-units');
    const normal  = val('wa-normal-spoil');
    const abnorm  = val('wa-abnormal-spoil');
    const endWIP  = Math.max(0, beg + started - good - normal - abnorm);
    setVal('wa-end-wip', endWIP);
    calcWASpoilage();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- FIFO Process Costing with Spoilage
// ══════════════════════════════════════════════════════════════════════════════

function calcFIFOSpoilage() {
  const begWIP        = val('fifo-beg-wip');
  const begPctDM      = val('fifo-beg-pct-dm') / 100;
  const begPctCC      = val('fifo-beg-pct-cc') / 100;
  const started       = val('fifo-started');
  const goodUnits     = val('fifo-good-units');
  const normalSpoil   = val('fifo-normal-spoil');
  const abnormalSpoil = val('fifo-abnormal-spoil');
  const endWIP        = val('fifo-end-wip');
  const endPctDM      = val('fifo-end-pct-dm') / 100;
  const endPctCC      = val('fifo-end-pct-cc') / 100;
  const inspection    = val('fifo-inspection') / 100;

  const begCostDM  = val('fifo-beg-cost-dm');
  const begCostCC  = val('fifo-beg-cost-cc');
  const currCostDM = val('fifo-curr-cost-dm');
  const currCostCC = val('fifo-curr-cost-cc');

  const toAccountFor = begWIP + started;
  const accountedFor = goodUnits + normalSpoil + abnormalSpoil + endWIP;
  const balanced     = Math.abs(toAccountFor - accountedFor) < 0.5;

  // FIFO EUP -- only current period work
  const startedAndCompleted = Math.max(0, goodUnits - begWIP);
  const begWIPWorkDM = begWIP * (1 - begPctDM);
  const begWIPWorkCC = begWIP * (1 - begPctCC);

  const normalSpoilDM   = normalSpoil * 1;
  const normalSpoilCC   = normalSpoil * inspection;
  const abnormalSpoilDM = abnormalSpoil * 1;
  const abnormalSpoilCC = abnormalSpoil * inspection;

  const eupDM = begWIPWorkDM + startedAndCompleted + normalSpoilDM + abnormalSpoilDM + endWIP * endPctDM;
  const eupCC = begWIPWorkCC + startedAndCompleted + normalSpoilCC + abnormalSpoilCC + endWIP * endPctCC;

  const cpuDM = eupDM > 0 ? currCostDM / eupDM : 0;
  const cpuCC = eupCC > 0 ? currCostCC / eupCC : 0;
  const cpuTotal = cpuDM + cpuCC;

  // Assign costs
  const begWIPCompletionCost = begWIPWorkDM * cpuDM + begWIPWorkCC * cpuCC;
  const begWIPTotalCost      = begCostDM + begCostCC + begWIPCompletionCost;
  const startedCompletedCost = startedAndCompleted * cpuTotal;
  const normalCost           = normalSpoilDM * cpuDM + normalSpoilCC * cpuCC;
  const abnormalCost         = abnormalSpoilDM * cpuDM + abnormalSpoilCC * cpuCC;
  const endWIPCost           = endWIP * endPctDM * cpuDM + endWIP * endPctCC * cpuCC;

  const goodUnitCost    = begWIPTotalCost + startedCompletedCost + normalCost;
  const costPerGoodUnit = goodUnits > 0 ? goodUnitCost / goodUnits : 0;
  const totalAssigned   = goodUnitCost + abnormalCost + endWIPCost;

  const out = getOrCreate('fifo-output', 'div', 'tool-output', el('fifo-calculate').parentElement);

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + (balanced ? '' : insight('<strong>Warning:</strong> Units do not balance. Check inputs.'))
    + '<h4>Step 2: FIFO Equivalent Units (Current Period Work Only)</h4>'
    + table(
        ['Component', 'DM EUP', 'Conversion EUP'],
        [
          ['Beginning WIP -- work to complete (' + fmtPct((1-begPctDM)*100) + '% DM, ' + fmtPct((1-begPctCC)*100) + '% CC)', fmtN(begWIPWorkDM), fmtN(begWIPWorkCC)],
          ['Started and completed this period', fmtN(startedAndCompleted), fmtN(startedAndCompleted)],
          ['Normal spoilage (at inspection ' + fmtPct(inspection*100) + ')', fmtN(normalSpoilDM), fmtN(normalSpoilCC)],
          ['Abnormal spoilage (at inspection ' + fmtPct(inspection*100) + ')', fmtN(abnormalSpoilDM), fmtN(abnormalSpoilCC)],
          ['Ending WIP (' + fmtPct(endPctDM*100) + '% DM, ' + fmtPct(endPctCC*100) + '% CC)', fmtN(endWIP*endPctDM), fmtN(endWIP*endPctCC)],
        ],
        ['Total FIFO EUP', fmtN(eupDM), fmtN(eupCC)]
      )
    + '<h4 style="margin-top:var(--space-4);">Step 3: Cost per Equivalent Unit (Current Period Only)</h4>'
    + table(
        ['Cost', 'Current Period', 'EUP', 'Cost per EU'],
        [
          ['Direct Materials', fmt(currCostDM), fmtN(eupDM), fmt2(cpuDM)],
          ['Conversion Costs', fmt(currCostCC), fmtN(eupCC), fmt2(cpuCC)],
        ],
        ['Total', fmt(currCostDM + currCostCC), '', fmt2(cpuTotal)]
      )
    + '<h4 style="margin-top:var(--space-4);">Steps 4 &amp; 5: Assign Costs</h4>'
    + table(
        ['Category', 'Calculation', 'Amount'],
        [
          ['Beginning WIP -- prior period cost', '', fmt(begCostDM + begCostCC)],
          ['Beginning WIP -- completion cost this period', fmtN(begWIPWorkDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(begWIPWorkCC) + ' x ' + fmt2(cpuCC), fmt(begWIPCompletionCost)],
          ['Started and completed', fmtN(startedAndCompleted) + ' x ' + fmt2(cpuTotal), fmt(startedCompletedCost)],
          ['Normal spoilage (absorbed)', fmtN(normalSpoilDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(normalSpoilCC) + ' x ' + fmt2(cpuCC), fmt(normalCost)],
          ['Total cost of good units', '', fmt(goodUnitCost)],
          ['Cost per good unit', fmt(goodUnitCost) + ' / ' + fmtN(goodUnits), fmt2(costPerGoodUnit)],
          ['Abnormal spoilage (expensed)', fmtN(abnormalSpoilDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(abnormalSpoilCC) + ' x ' + fmt2(cpuCC), fmt(abnormalCost)],
          ['Ending WIP', fmtN(endWIP*endPctDM) + ' x ' + fmt2(cpuDM) + ' + ' + fmtN(endWIP*endPctCC) + ' x ' + fmt2(cpuCC), fmt(endWIPCost)],
        ],
        ['Total Costs Assigned', '', fmt(totalAssigned)]
      )
    + insight('FIFO keeps beginning WIP costs separate. Current period CPU is based only on current period costs divided by current period EUP. Normal spoilage is absorbed into good unit costs; abnormal spoilage is expensed.')
    + '</div>';

  renderShowWork(el('fifo-show-work'), [
    { label: 'Started and Completed', formula: 'Good units - Beginning WIP', values: fmtN(goodUnits) + ' - ' + fmtN(begWIP), result: fmtN(startedAndCompleted) },
    { label: 'FIFO EUP -- DM', formula: 'Beg WIP work + S&C + Normal + Abnormal + End WIP x DM%', values: fmtN(begWIPWorkDM) + ' + ' + fmtN(startedAndCompleted) + ' + ' + fmtN(normalSpoilDM) + ' + ' + fmtN(abnormalSpoilDM) + ' + ' + fmtN(endWIP*endPctDM), result: fmtN(eupDM) },
    { label: 'FIFO EUP -- CC', formula: 'Beg WIP work + S&C + Normal x insp% + Abnormal x insp% + End WIP x CC%', values: fmtN(begWIPWorkCC) + ' + ' + fmtN(startedAndCompleted) + ' + ' + fmtN(normalSpoilCC) + ' + ' + fmtN(abnormalSpoilCC) + ' + ' + fmtN(endWIP*endPctCC), result: fmtN(eupCC) },
    { label: 'CPU -- DM (current period only)', formula: 'Current DM cost / FIFO EUP DM', values: fmt(currCostDM) + ' / ' + fmtN(eupDM), result: fmt2(cpuDM), highlight: true },
    { label: 'CPU -- CC (current period only)', formula: 'Current CC cost / FIFO EUP CC', values: fmt(currCostCC) + ' / ' + fmtN(eupCC), result: fmt2(cpuCC), highlight: true },
    { label: 'Cost per Good Unit', formula: 'Total good unit cost / Good units', values: fmt(goodUnitCost) + ' / ' + fmtN(goodUnits), result: fmt2(costPerGoodUnit), highlight: true },
  ], { title: 'FIFO with Spoilage', defaultOpen: false });
}

function initFIFOSpoilage() {
  const btn = el('fifo-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcFIFOSpoilage);

  el('fifo-load-example') && el('fifo-load-example').addEventListener('click', () => {
    setVal('fifo-beg-wip', 1000); setVal('fifo-beg-pct-dm', 100); setVal('fifo-beg-pct-cc', 40);
    setVal('fifo-started', 4000); setVal('fifo-good-units', 4000);
    setVal('fifo-normal-spoil', 200); setVal('fifo-abnormal-spoil', 100);
    setVal('fifo-end-wip', 700); setVal('fifo-end-pct-dm', 100); setVal('fifo-end-pct-cc', 30);
    setVal('fifo-inspection', 100);
    setVal('fifo-beg-cost-dm', 1595); setVal('fifo-beg-cost-cc', 1146);
    setVal('fifo-curr-cost-dm', 6405); setVal('fifo-curr-cost-cc', 8604);
    calcFIFOSpoilage();
  });

  initRandomizer('fifo-randomize', [
    { id: 'fifo-beg-wip',        min: 0,    max: 2000,  step: 100,  integer: true },
    { id: 'fifo-beg-pct-cc',     min: 10,   max: 80,    step: 10 },
    { id: 'fifo-started',        min: 2000, max: 8000,  step: 200,  integer: true },
    { id: 'fifo-good-units',     min: 1500, max: 7000,  step: 200,  integer: true },
    { id: 'fifo-normal-spoil',   min: 50,   max: 400,   step: 50,   integer: true },
    { id: 'fifo-abnormal-spoil', min: 0,    max: 200,   step: 25,   integer: true },
    { id: 'fifo-end-pct-cc',     min: 10,   max: 70,    step: 10 },
    { id: 'fifo-beg-cost-dm',    min: 500,  max: 5000,  step: 100,  integer: true },
    { id: 'fifo-beg-cost-cc',    min: 300,  max: 3000,  step: 100,  integer: true },
    { id: 'fifo-curr-cost-dm',   min: 2000, max: 15000, step: 500,  integer: true },
    { id: 'fifo-curr-cost-cc',   min: 2000, max: 15000, step: 500,  integer: true },
  ], () => {
    const beg     = val('fifo-beg-wip');
    const started = val('fifo-started');
    const good    = val('fifo-good-units');
    const normal  = val('fifo-normal-spoil');
    const abnorm  = val('fifo-abnormal-spoil');
    const endWIP  = Math.max(0, beg + started - good - normal - abnorm);
    setVal('fifo-end-wip', endWIP);
    calcFIFOSpoilage();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Rework and Scrap Accounting
// ══════════════════════════════════════════════════════════════════════════════

function calcReworkScrap() {
  const reworkUnits  = val('rs-rework-units');
  const reworkCost   = val('rs-rework-cost');
  const reworkType   = sval('rs-rework-type');
  const scrapUnits   = val('rs-scrap-units');
  const scrapValue   = val('rs-scrap-value');
  const scrapMethod  = sval('rs-scrap-method');

  const totalRework = reworkUnits * reworkCost;
  const totalScrap  = scrapUnits * scrapValue;

  const out = getOrCreate('rs-output', 'div', 'tool-output', el('rs-calculate').parentElement);

  // Rework journal entry
  let reworkJE = '';
  let reworkNote = '';
  if (reworkType === 'normal-job') {
    reworkJE = table(
      ['Account', 'Debit', 'Credit'],
      [
        ['Work-in-Process (specific job)', fmt(totalRework), ''],
        ['Various Accounts (materials, labor, overhead)', '', fmt(totalRework)],
      ]
    );
    reworkNote = 'Normal rework charged to the specific job. The job bears the full rework cost, increasing its total cost.';
  } else if (reworkType === 'normal-overhead') {
    reworkJE = table(
      ['Account', 'Debit', 'Credit'],
      [
        ['Manufacturing Overhead Control', fmt(totalRework), ''],
        ['Various Accounts (materials, labor, overhead)', '', fmt(totalRework)],
      ]
    );
    reworkNote = 'Normal rework charged to manufacturing overhead. The cost is spread across all jobs through the overhead rate, not charged to any specific job.';
  } else {
    reworkJE = table(
      ['Account', 'Debit', 'Credit'],
      [
        ['Loss from Abnormal Rework', fmt(totalRework), ''],
        ['Various Accounts (materials, labor, overhead)', '', fmt(totalRework)],
      ]
    );
    reworkNote = 'Abnormal rework is expensed immediately as a loss. It is never charged to WIP or overhead -- it represents an avoidable inefficiency.';
  }

  // Scrap journal entry
  let scrapJE = '';
  let scrapNote = '';
  if (scrapMethod === 'production') {
    scrapJE = table(
      ['Account', 'Debit', 'Credit'],
      [
        ['Scrap Inventory (or Materials Inventory)', fmt(totalScrap), ''],
        ['Work-in-Process (or Manufacturing Overhead)', '', fmt(totalScrap)],
      ]
    );
    scrapNote = 'Recognized at production: scrap value reduces WIP cost (or overhead) immediately when scrap is generated. The job or process gets credit for the scrap value.';
  } else {
    scrapJE = table(
      ['Account', 'Debit', 'Credit'],
      [
        ['Cash or Accounts Receivable', fmt(totalScrap), ''],
        ['Scrap Revenue (or Manufacturing Overhead)', '', fmt(totalScrap)],
      ]
    );
    scrapNote = 'Recognized at sale: no entry when scrap is generated. When sold, cash is debited and scrap revenue (or overhead) is credited. Simpler but delays recognition.';
  }

  out.innerHTML = '<div style="margin-top:var(--space-5);">'
    + '<div style="display:flex;flex-wrap:wrap;gap:var(--space-4);">'
    + panel('Rework: ' + (reworkType === 'normal-job' ? 'Normal -- Charged to Job' : reworkType === 'normal-overhead' ? 'Normal -- Charged to Overhead' : 'Abnormal -- Expensed'),
        '<p style="font-size:var(--font-size-sm);margin-bottom:var(--space-3);">'
        + fmtN(reworkUnits) + ' units x ' + fmt(reworkCost) + ' = <strong>' + fmt(totalRework) + '</strong> total rework cost</p>'
        + reworkJE,
        reworkNote
      )
    + panel('Scrap: ' + (scrapMethod === 'production' ? 'Recognized at Production' : 'Recognized at Sale'),
        '<p style="font-size:var(--font-size-sm);margin-bottom:var(--space-3);">'
        + fmtN(scrapUnits) + ' units x ' + fmt(scrapValue) + ' = <strong>' + fmt(totalScrap) + '</strong> total scrap value</p>'
        + scrapJE,
        scrapNote
      )
    + '</div>'
    + insight('Key distinction: Normal rework and scrap reduce costs to good units or overhead. Abnormal rework is always expensed. Scrap timing (production vs. sale) affects when the benefit is recognized but not the total amount.')
    + '</div>';

  renderShowWork(el('rs-show-work'), [
    { label: 'Total Rework Cost', formula: 'Units reworked x Cost per unit', values: fmtN(reworkUnits) + ' x ' + fmt(reworkCost), result: fmt(totalRework) },
    { label: 'Rework Treatment', formula: reworkType === 'normal-job' ? 'Debit WIP (specific job)' : reworkType === 'normal-overhead' ? 'Debit Manufacturing Overhead' : 'Debit Loss from Abnormal Rework', values: '', result: fmt(totalRework) },
    { label: 'Total Scrap Value', formula: 'Scrap units x Sales value per unit', values: fmtN(scrapUnits) + ' x ' + fmt(scrapValue), result: fmt(totalScrap), highlight: true },
    { label: 'Scrap Recognition', formula: scrapMethod === 'production' ? 'At production: credit WIP or Overhead' : 'At sale: credit Scrap Revenue or Overhead', values: '', result: fmt(totalScrap) },
  ], { title: 'Rework and Scrap Journal Entries', defaultOpen: false });
}

function initReworkScrap() {
  const btn = el('rs-calculate');
  if (!btn) return;
  btn.addEventListener('click', calcReworkScrap);

  el('rs-load-example') && el('rs-load-example').addEventListener('click', () => {
    setVal('rs-rework-units', 50);
    setVal('rs-rework-cost', 100);
    setVal('rs-scrap-units', 200);
    setVal('rs-scrap-value', 5);
    calcReworkScrap();
  });

  initRandomizer('rs-randomize', [
    { id: 'rs-rework-units', min: 10,  max: 200,  step: 10,  integer: true },
    { id: 'rs-rework-cost',  min: 20,  max: 500,  step: 10 },
    { id: 'rs-scrap-units',  min: 50,  max: 1000, step: 50,  integer: true },
    { id: 'rs-scrap-value',  min: 0.5, max: 25,   step: 0.5 },
  ], calcReworkScrap);
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Spoilage', definition: 'Units of production that do not meet the standards required by customers and are discarded or sold at reduced prices.' },
  { term: 'Normal Spoilage', definition: 'Spoilage that arises under efficient operating conditions. It is inherent in the production process and is treated as a product cost, absorbed into the cost of good units.' },
  { term: 'Abnormal Spoilage', definition: 'Spoilage that is not inherent in the production process and would not arise under efficient operating conditions. It is expensed immediately as a period cost.' },
  { term: 'Inspection Point', definition: 'The stage in the production process at which products are examined to determine whether they are acceptable or spoiled. Only units that reach the inspection point bear normal spoilage costs.' },
  { term: 'Rework', definition: 'Units of production that do not meet the standards required by customers but are repaired and sold as good finished units.' },
  { term: 'Normal Rework', definition: 'Rework that is expected to occur under efficient operating conditions. Costs are charged to manufacturing overhead (spread across all jobs) or to the specific job depending on the cause.' },
  { term: 'Abnormal Rework', definition: 'Rework that is not expected to occur under efficient operating conditions. Costs are expensed immediately and never charged to WIP or overhead.' },
  { term: 'Scrap', definition: 'Residual material that results from manufacturing a product and has low sales value relative to the total value of the product.' },
  { term: 'Production Method (Scrap)', definition: 'Recognizing scrap value at the time of production by crediting Work-in-Process or Manufacturing Overhead. Reduces the cost of the job or process immediately.' },
  { term: 'Sales Method (Scrap)', definition: 'Recognizing scrap value only when the scrap is sold. No entry is made when scrap is generated; cash and scrap revenue are recorded at the point of sale.' },
  { term: 'Weighted-Average with Spoilage', definition: 'Process costing that blends beginning WIP costs with current period costs and includes spoiled units in the EUP calculation at the inspection point completion percentage.' },
  { term: 'FIFO with Spoilage', definition: 'Process costing that keeps beginning WIP costs separate. Current period CPU is based only on current period costs. Spoilage EUP is calculated at the inspection point completion percentage.' },
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
  if (el('ch19-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch19-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch19');
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
  const status = el('ch19-status');
  if (!btn || !card) return;
  if (isChapterComplete('ch19')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    if (status) status.textContent = 'Complete';
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch19');
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
  initHeader();
  initSpoilageClassifier();
  initInspectionPoint();
  initWASpoilage();
  initFIFOSpoilage();
  initReworkScrap();
  initKeyTerms();
  initChapterComplete();
});
