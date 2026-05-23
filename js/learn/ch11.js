import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';
import { renderShowWork } from '/js/components/show-work.js';
import { initRandomizer } from '/js/components/randomizer.js';
import { ROCChart } from '/js/charts/roc-chart.js';
import { initSettingsPanel } from '/js/components/settings-panel.js';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = n => '$' + Math.abs(Math.round(n)).toLocaleString();
const fmtP   = n => (Math.round(n * 1000) / 1000).toFixed(3);
const fmtPct = n => (n * 100).toFixed(1) + '%';

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

const val  = id => parseFloat(document.getElementById(id).value) || 0;
const sval = id => document.getElementById(id).value.trim();


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 1 -- Data Science Framework Explorer
// ═══════════════════════════════════════════════════════════════════════════════

const DS_STEPS = [
  {
    num: 1,
    title: 'Gain a Business Understanding of the Problem',
    desc: 'Define the question management needs answered. Without a clear business question, data science produces answers to problems no one has.',
    sierra: 'Sierra Investments asks: Can we identify which PeerLend Digital loans are likely to default before investing, so we can earn higher returns by avoiding those loans?',
    maRole: 'The management accountant frames the question in economic terms -- what is the cost of a wrong prediction? What return improvement justifies the analysis cost?'
  },
  {
    num: 2,
    title: 'Obtain and Explore Relevant Data',
    desc: 'Identify what data exists, assess its quality, and perform exploratory analysis to understand distributions, missing values, and potential cost drivers.',
    sierra: 'PeerLend Digital has 500,000 funded loans with features including credit score, annual income, debt-to-income ratio, loan amount, purpose, grade, and homeownership.',
    maRole: 'The management accountant evaluates whether data are objective and accurately measured. They identify which features are available at the time of the decision and which would create target leakage.'
  },
  {
    num: 3,
    title: 'Prepare the Data',
    desc: 'Clean the data, remove features that cause target leakage, handle missing values, and split into training, validation, and holdout samples.',
    sierra: 'Sierra removes Phase 2 "future" features (payments made, payments missed, late payments) that only exist after the loan is funded. The 500,000 loans are split 60% training / 20% validation / 20% holdout.',
    maRole: 'The management accountant uses business knowledge to identify target leakage -- data that would not exist at the time the investment decision must be made.'
  },
  {
    num: 4,
    title: 'Build a Model',
    desc: 'Train a predictive model on the training sample. The decision tree algorithm recursively partitions data along feature values to minimize Gini impurity.',
    sierra: 'The data science team trains decision trees of various depths on 300,000 loans. The algorithm finds that loan grade is the most important feature, followed by credit score and debt-to-income ratio.',
    maRole: 'The management accountant works with data scientists to choose model types that are interpretable and make economic sense. They flag overfitting when the model captures noise rather than signal.'
  },
  {
    num: 5,
    title: 'Evaluate the Model',
    desc: 'Compare models on the validation sample using likelihood values, ROC curves, confusion matrices, and payoff matrices. Choose the model that best balances the bias-variance tradeoff.',
    sierra: 'The pruned decision tree achieves a likelihood value of 0.13807 vs 0.000092 for the full tree on the validation sample. The ROC curve shows good separation between default and repay loans.',
    maRole: 'The management accountant constructs the payoff matrix -- estimating the dollar value of true positives, false positives, true negatives, and false negatives -- to choose the optimal cutoff probability.'
  },
  {
    num: 6,
    title: 'Visualize and Communicate Insights',
    desc: 'Present model outputs in ways managers can understand and act on. Decision tree diagrams, ROC curves, and confusion matrices make abstract statistics concrete.',
    sierra: 'Paige presents the ROC curve, confusion matrices at cutoffs of 0.30 and 0.50, and payoff calculations showing the model increases annual returns from 7.33% to 8.45% to 10.6%.',
    maRole: 'The management accountant translates model outputs into business language -- not "AUC = 0.85" but "this model correctly avoids 2 of 2 default loans without missing any repay loans at the 0.30 cutoff."'
  },
  {
    num: 7,
    title: 'Deploy the Model',
    desc: 'Implement the model in the decision-making process. Monitor data quality, reassess cutoff values as market conditions change, and retrain when historical data becomes unrepresentative.',
    sierra: 'Sierra uses the pruned tree to screen new PeerLend Digital loans in Q1 2020, investing only in loans with a predicted default probability below the chosen cutoff.',
    maRole: 'The management accountant monitors whether past data remain representative of current conditions. They reassess payoff assumptions as interest rates and default rates change over time.'
  }
];

const LEAKAGE_FEATURES = [
  { feature: 'Credit Score',        answer: 'safe',    explanation: 'Available before the loan is funded. PeerLend Digital collects this from past credit history.' },
  { feature: 'Annual Income',       answer: 'safe',    explanation: 'Available before the loan is funded. Borrowers provide this when applying.' },
  { feature: 'Loan Grade (A-F)',    answer: 'safe',    explanation: 'Assigned by PeerLend Digital at origination based on risk assessment. Available before investing.' },
  { feature: 'Number of Payments Made', answer: 'leakage', explanation: 'This is Phase 2 data -- it only exists after the loan is funded and the borrower has started repaying. Sierra does not have this at the time of the investment decision.' },
  { feature: 'Number of Late Payments', answer: 'leakage', explanation: 'Also Phase 2 data. Late payment history on the current loan only accumulates after funding. Including it would give the model information from the future.' },
  { feature: 'Debt-to-Income Ratio', answer: 'safe',   explanation: 'Calculated from the borrower application data available before funding. A legitimate predictor of default risk.' }
];

function initTool1() {
  const stepsContainer = document.getElementById('t1-steps');
  if (!stepsContainer) return;

  DS_STEPS.forEach(step => {
    const card = document.createElement('div');
    card.className = 'ch11-step-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');

    card.innerHTML = '<div class="ch11-step-card__header">'
      + '<div class="ch11-step-card__num">' + step.num + '</div>'
      + '<div class="ch11-step-card__title">' + step.title + '</div>'
      + '<span class="ch11-step-card__toggle">&#9660;</span>'
      + '</div>'
      + '<div class="ch11-step-card__body" style="display:none;">'
      + '<p class="ch11-step-card__desc">' + step.desc + '</p>'
      + '<div class="ch11-step-card__example">'
      + '<div class="ch11-step-card__example-label">Sierra Investments Example</div>'
      + '<p>' + step.sierra + '</p>'
      + '</div>'
      + '<div class="ch11-step-card__role">'
      + '<div class="ch11-step-card__role-label">Management Accountant Role</div>'
      + '<p>' + step.maRole + '</p>'
      + '</div>'
      + '</div>';

    const toggle = () => {
      const body    = card.querySelector('.ch11-step-card__body');
      const chevron = card.querySelector('.ch11-step-card__toggle');
      const open    = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      chevron.innerHTML  = open ? '&#9650;' : '&#9660;';
      card.setAttribute('aria-expanded', open);
      if (open) card.classList.add('ch11-step-card--open');
      else card.classList.remove('ch11-step-card--open');
    };

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
    stepsContainer.appendChild(card);
  });

  // Target leakage identifier
  const leakageContainer = document.getElementById('t1-leakage');
  if (!leakageContainer) return;

  LEAKAGE_FEATURES.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'ch11-leakage-row';
    row.id = 'leakage-row-' + i;

    row.innerHTML = '<div class="ch11-leakage-feature">' + item.feature + '</div>'
      + '<div class="ch11-leakage-btns">'
      + '<button class="btn btn--sm ch11-leakage-btn" data-choice="safe" data-idx="' + i + '">Safe to Use</button>'
      + '<button class="btn btn--sm ch11-leakage-btn" data-choice="leakage" data-idx="' + i + '">Target Leakage</button>'
      + '</div>'
      + '<div class="ch11-leakage-feedback" id="leakage-fb-' + i + '" style="display:none;"></div>';

    leakageContainer.appendChild(row);
  });

  leakageContainer.addEventListener('click', e => {
    const btn = e.target.closest('.ch11-leakage-btn');
    if (!btn) return;
    const idx    = parseInt(btn.dataset.idx);
    const choice = btn.dataset.choice;
    const item   = LEAKAGE_FEATURES[idx];
    const fb     = document.getElementById('leakage-fb-' + idx);
    const row    = document.getElementById('leakage-row-' + idx);
    const correct = choice === item.answer;

    row.classList.remove('ch11-leakage-row--correct', 'ch11-leakage-row--wrong');
    row.classList.add(correct ? 'ch11-leakage-row--correct' : 'ch11-leakage-row--wrong');

    fb.style.display = 'block';
    fb.className = 'ch11-leakage-feedback ' + (correct ? 'ch11-leakage-feedback--correct' : 'ch11-leakage-feedback--wrong');
    fb.innerHTML = (correct ? '&#10003; Correct. ' : '&#10007; Incorrect. ') + item.explanation;
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 2 -- Gini Impurity Calculator
// ═══════════════════════════════════════════════════════════════════════════════

function gini(a, b) {
  const n = a + b;
  if (n === 0) return 0;
  const pA = a / n;
  const pB = b / n;
  return pA * (1 - pA) + pB * (1 - pB);
}

function calcTool2() {
  const origA = val('t2-orig-a');
  const origB = val('t2-orig-b');
  const r1a   = val('t2-r1-a');
  const r1b   = val('t2-r1-b');
  const r2a   = val('t2-r2-a');
  const r2b   = val('t2-r2-b');
  const labelA = sval('t2-class-a-label') || 'Class A';
  const labelB = sval('t2-class-b-label') || 'Class B';

  const total   = origA + origB;
  const r1Total = r1a + r1b;
  const r2Total = r2a + r2b;

  if (total === 0) return;

  const giniOrig = gini(origA, origB);
  const giniR1   = gini(r1a, r1b);
  const giniR2   = gini(r2a, r2b);
  const weightedAvg = (r1Total / total) * giniR1 + (r2Total / total) * giniR2;
  const infoGain = giniOrig - weightedAvg;

  const purityLabel = g => g < 0.1 ? 'Very Pure' : g < 0.3 ? 'Mostly Pure' : g < 0.45 ? 'Moderately Mixed' : 'Highly Mixed';
  const purityClass = g => g < 0.1 ? 'ch11-gini--pure' : g < 0.3 ? 'ch11-gini--mostly' : g < 0.45 ? 'ch11-gini--mixed' : 'ch11-gini--impure';

  const out = getOrCreate('t2-output', 'div', 'tool-output',
    document.getElementById('t2-output').parentElement);

  out.innerHTML = '<div class="ch11-gini-grid">'

    + '<div class="ch11-gini-card">'
    + '<div class="ch11-gini-card__label">Original Rectangle</div>'
    + '<div class="ch11-gini-card__counts">' + labelA + ': ' + origA + '  |  ' + labelB + ': ' + origB + '  |  Total: ' + total + '</div>'
    + '<div class="ch11-gini-card__value ' + purityClass(giniOrig) + '">' + fmtP(giniOrig) + '</div>'
    + '<div class="ch11-gini-card__purity">' + purityLabel(giniOrig) + '</div>'
    + '</div>'

    + '<div class="ch11-gini-card">'
    + '<div class="ch11-gini-card__label">Rectangle R1 (after cut)</div>'
    + '<div class="ch11-gini-card__counts">' + labelA + ': ' + r1a + '  |  ' + labelB + ': ' + r1b + '  |  Total: ' + r1Total + '</div>'
    + '<div class="ch11-gini-card__value ' + purityClass(giniR1) + '">' + fmtP(giniR1) + '</div>'
    + '<div class="ch11-gini-card__purity">' + purityLabel(giniR1) + '</div>'
    + '</div>'

    + '<div class="ch11-gini-card">'
    + '<div class="ch11-gini-card__label">Rectangle R2 (after cut)</div>'
    + '<div class="ch11-gini-card__counts">' + labelA + ': ' + r2a + '  |  ' + labelB + ': ' + r2b + '  |  Total: ' + r2Total + '</div>'
    + '<div class="ch11-gini-card__value ' + purityClass(giniR2) + '">' + fmtP(giniR2) + '</div>'
    + '<div class="ch11-gini-card__purity">' + purityLabel(giniR2) + '</div>'
    + '</div>'

    + '</div>'

    + '<div class="ch11-gini-summary">'
    + '<div class="ch11-gini-summary__row">'
    + '<span>Weighted Average Gini (R1 + R2)</span>'
    + '<span class="' + purityClass(weightedAvg) + '">' + fmtP(weightedAvg) + '</span>'
    + '</div>'
    + '<div class="ch11-gini-summary__row ch11-gini-summary__row--gain">'
    + '<span>Information Gain</span>'
    + '<span>' + fmtP(infoGain) + ' (' + fmtP(giniOrig) + ' &rarr; ' + fmtP(weightedAvg) + ')</span>'
    + '</div>'
    + '<div class="ch11-gini-summary__insight">'
    + (infoGain > 0.05
        ? 'This cut provides strong information gain. The algorithm would favor this split.'
        : infoGain > 0.01
        ? 'This cut provides moderate information gain. The algorithm would consider other cuts before choosing.'
        : 'This cut provides little information gain. The algorithm would likely choose a different split.')
    + '</div>'
    + '</div>';

  renderShowWork(document.getElementById('t2-show-work'), [
    { label: 'Baseline Gini Impurity (original rectangle)',
      formula: 'p_A * (1 - p_A) + p_B * (1 - p_B)',
      values: '(' + origA + '/' + total + ') * (1 - ' + origA + '/' + total + ') + (' + origB + '/' + total + ') * (1 - ' + origB + '/' + total + ')',
      result: fmtP(giniOrig) },
    { label: 'Gini Impurity R1',
      formula: 'p_A * (1 - p_A) + p_B * (1 - p_B)',
      values: '(' + r1a + '/' + r1Total + ') * (1 - ' + r1a + '/' + r1Total + ') + (' + r1b + '/' + r1Total + ') * (1 - ' + r1b + '/' + r1Total + ')',
      result: fmtP(giniR1) },
    { label: 'Gini Impurity R2',
      formula: 'p_A * (1 - p_A) + p_B * (1 - p_B)',
      values: '(' + r2a + '/' + r2Total + ') * (1 - ' + r2a + '/' + r2Total + ') + (' + r2b + '/' + r2Total + ') * (1 - ' + r2b + '/' + r2Total + ')',
      result: fmtP(giniR2) },
    { label: 'Weighted Average Gini',
      formula: '(n_R1/n_total) * Gini_R1 + (n_R2/n_total) * Gini_R2',
      values: '(' + r1Total + '/' + total + ') * ' + fmtP(giniR1) + ' + (' + r2Total + '/' + total + ') * ' + fmtP(giniR2),
      result: fmtP(weightedAvg), highlight: true },
    { label: 'Information Gain',
      formula: 'Baseline Gini - Weighted Average Gini',
      values: fmtP(giniOrig) + ' - ' + fmtP(weightedAvg),
      result: fmtP(infoGain), highlight: true }
  ], { title: 'Gini Impurity Calculation', defaultOpen: false });
}

function initTool2() {
  document.getElementById('t2-calculate').addEventListener('click', calcTool2);
  initRandomizer('t2-randomize', [
    { id: 't2-orig-a',  min: 4,  max: 20, step: 1, integer: true },
    { id: 't2-orig-b',  min: 4,  max: 20, step: 1, integer: true },
    { id: 't2-r1-a',    min: 0,  max: 15, step: 1, integer: true },
    { id: 't2-r1-b',    min: 0,  max: 15, step: 1, integer: true },
    { id: 't2-r2-a',    min: 0,  max: 15, step: 1, integer: true },
    { id: 't2-r2-b',    min: 0,  max: 15, step: 1, integer: true }
  ], calcTool2);
  document.getElementById('t2-load-sierra').addEventListener('click', () => {
    document.getElementById('t2-orig-a').value = 12;
    document.getElementById('t2-orig-b').value = 12;
    document.getElementById('t2-r1-a').value   = 10;
    document.getElementById('t2-r1-b').value   = 3;
    document.getElementById('t2-r2-a').value   = 2;
    document.getElementById('t2-r2-b').value   = 9;
    document.getElementById('t2-class-a-label').value = 'Repay';
    document.getElementById('t2-class-b-label').value = 'Default';
    calcTool2();
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 3 -- Decision Tree Builder and Pruner
// ═══════════════════════════════════════════════════════════════════════════════

// Sierra Investments 24-loan training dataset (Exhibit 11-4)
const SIERRA_TRAINING = [
  { income: 50, credit: 530, outcome: 1 }, { income: 62, credit: 552, outcome: 1 },
  { income: 57, credit: 594, outcome: 1 }, { income: 45, credit: 604, outcome: 1 },
  { income: 64, credit: 627, outcome: 1 }, { income: 84, credit: 637, outcome: 1 },
  { income: 49, credit: 638, outcome: 1 }, { income: 66, credit: 667, outcome: 1 },
  { income: 33, credit: 674, outcome: 1 }, { income: 75, credit: 708, outcome: 1 },
  { income: 43, credit: 730, outcome: 1 }, { income: 53, credit: 748, outcome: 1 },
  { income: 86, credit: 620, outcome: 0 }, { income: 108, credit: 648, outcome: 0 },
  { income: 59, credit: 676, outcome: 0 }, { income: 110, credit: 701, outcome: 0 },
  { income: 69, credit: 731, outcome: 0 }, { income: 81, credit: 716, outcome: 0 },
  { income: 95, credit: 747, outcome: 0 }, { income: 61, credit: 752, outcome: 0 },
  { income: 65, credit: 767, outcome: 0 }, { income: 52, credit: 788, outcome: 0 },
  { income: 82, credit: 802, outcome: 0 }, { income: 87, credit: 840, outcome: 0 }
];

// Sierra Investments 10-loan validation dataset (Exhibit 11-13)
const SIERRA_VALIDATION = [
  { income: 60, credit: 690, outcome: 1 },
  { income: 67, credit: 710, outcome: 0 },
  { income: 55, credit: 772, outcome: 0 },
  { income: 61, credit: 702, outcome: 0 },
  { income: 58, credit: 715, outcome: 0 },
  { income: 54, credit: 725, outcome: 1 },
  { income: 87, credit: 665, outcome: 0 },
  { income: 90, credit: 660, outcome: 0 },
  { income: 59, credit: 718, outcome: 0 },
  { income: 53, credit: 775, outcome: 0 }
];

// Textbook tree structure (Exhibit 11-11) -- hardcoded for accuracy
// Each node: { feature, cutoff, left (<=), right (>) }
// Terminal nodes: { prediction, prob, count }
const FULL_TREE = {
  feature: 'credit', cutoff: 675,
  left: {
    feature: 'income', cutoff: 85,
    left:  { prediction: 1, label: 'Default', count: 9, prob: 1.0 },
    right: { prediction: 0, label: 'Repay',   count: 2, prob: 1.0 }
  },
  right: {
    feature: 'income', cutoff: 56,
    left: {
      feature: 'credit', cutoff: 768,
      left:  { prediction: 1, label: 'Default', count: 2, prob: 1.0 },
      right: {
        feature: 'credit', cutoff: 712,
        left: {
          feature: 'credit', cutoff: 704.5,
          left:  { prediction: 0, label: 'Repay',   count: 2, prob: 2/3 },
          right: { prediction: 1, label: 'Default', count: 1, prob: 1.0 }
        },
        right: { prediction: 0, label: 'Repay', count: 7, prob: 1.0 }
      }
    },
    right: { prediction: 0, label: 'Repay', count: 10, prob: 1.0 }
  }
};

function classifyLoan(loan, tree, maxDepth, currentDepth) {
  currentDepth = currentDepth || 0;
  if (tree.prediction !== undefined) return tree;
  if (currentDepth >= maxDepth) {
    // At pruning depth -- return probabilistic node
    const defaults = countClass(tree, 1);
    const total    = countClass(tree, 0) + defaults;
    const prob     = total > 0 ? defaults / total : 0;
    return { prediction: prob >= 0.5 ? 1 : 0, prob, label: prob >= 0.5 ? 'Default' : 'Repay', mixed: total > 1 && prob > 0 && prob < 1 };
  }
  const featureVal = tree.feature === 'credit' ? loan.credit : loan.income;
  if (featureVal <= tree.cutoff) {
    return classifyLoan(loan, tree.left, maxDepth, currentDepth + 1);
  } else {
    return classifyLoan(loan, tree.right, maxDepth, currentDepth + 1);
  }
}

function countClass(node, cls) {
  if (node.prediction !== undefined) return node.prediction === cls ? node.count : 0;
  return countClass(node.left, cls) + countClass(node.right, cls);
}

function getDepth(node) {
  if (node.prediction !== undefined) return 0;
  return 1 + Math.max(getDepth(node.left), getDepth(node.right));
}

function renderTreeSVG(depth) {
  // Build a simplified visual representation of the tree at the given depth
  const rules = getTreeRules(depth);
  const validationResults = SIERRA_VALIDATION.map(loan => {
    const result = classifyLoan(loan, FULL_TREE, depth);
    const correct = result.prediction === loan.outcome;
    return { loan, result, correct };
  });
  const correctCount = validationResults.filter(r => r.correct).length;
  const totalCount   = validationResults.length;

  return { rules, validationResults, correctCount, totalCount };
}

function getTreeRules(depth) {
  const rules = [];
  if (depth >= 1) {
    rules.push({ condition: 'Credit Score &le; 675 AND Income &le; $85k', prediction: 'Default (1)', confidence: '9/9 = 100%' });
    rules.push({ condition: 'Credit Score &le; 675 AND Income &gt; $85k', prediction: 'Repay (0)',   confidence: '2/2 = 100%' });
  }
  if (depth >= 2) {
    rules.push({ condition: 'Credit Score &gt; 675 AND Income &le; $56k AND Credit Score &le; 768', prediction: 'Default (1)', confidence: '2/3 = 67%' });
    rules.push({ condition: 'Credit Score &gt; 675 AND Income &gt; $56k', prediction: 'Repay (0)', confidence: '9/10 = 90%' });
  }
  if (depth >= 3) {
    rules[2] = { condition: 'Credit Score 675-768 AND Income &le; $56k', prediction: 'Default (1)', confidence: '2/2 = 100%' };
    rules.push({ condition: 'Credit Score &gt; 768 AND Income &le; $56k', prediction: 'Default (1)', confidence: '2/3 = 67%' });
  }
  if (depth >= 4) {
    rules.push({ condition: 'Credit Score 675-712 AND Income &gt; $56k', prediction: 'Default (1)', confidence: '1/3 = 33%' });
  }
  if (depth >= 5) {
    rules[rules.length - 1] = { condition: 'Credit Score 704.5-712 AND Income &gt; $56k', prediction: 'Default (1)', confidence: '1/1 = 100%' };
    rules.push({ condition: 'Credit Score 675-704.5 AND Income &gt; $56k', prediction: 'Repay (0)', confidence: '2/2 = 100%' });
  }
  return rules;
}

function calcTool3() {
  const depth  = parseInt(document.getElementById('t3-depth').value);
  const { rules, validationResults, correctCount, totalCount } = renderTreeSVG(depth);
  const maxDepth = getDepth(FULL_TREE);
  const isPruned = depth < maxDepth;

  const out = getOrCreate('t3-output', 'div', 'tool-output',
    document.getElementById('t3-output').parentElement);

  const rulesHTML = rules.map(r =>
    '<tr><td>' + r.condition + '</td>'
    + '<td class="' + (r.prediction.includes('Default') ? 'variance-unfav' : 'variance-fav') + '">' + r.prediction + '</td>'
    + '<td>' + r.confidence + '</td></tr>'
  ).join('');

  const validationHTML = validationResults.map((r, i) =>
    '<tr class="' + (r.correct ? 'lc-table__row--doubling' : '') + '">'
    + '<td>' + (i + 1) + '</td>'
    + '<td>' + (r.loan.outcome === 1 ? 'Default' : 'Repay') + '</td>'
    + '<td>' + r.result.label + (r.result.mixed ? ' <span style="font-size:10px;color:var(--color-gray-500);">(p=' + r.result.prob.toFixed(2) + ')</span>' : '') + '</td>'
    + '<td>' + (r.correct ? '<span class="variance-fav">&#10003; Correct</span>' : '<span class="variance-unfav">&#10007; Wrong</span>') + '</td>'
    + '</tr>'
  ).join('');

  out.innerHTML = '<div class="ch11-tree-result">'

    + '<div class="ch11-tree-header">'
    + '<div class="ch11-tree-header__title">' + (isPruned ? 'Pruned Tree (Depth ' + depth + ')' : 'Fully Grown Tree (Depth ' + maxDepth + ')') + '</div>'
    + (isPruned
        ? '<div class="ch11-tree-header__badge ch11-tree-header__badge--pruned">Pruned</div>'
        : '<div class="ch11-tree-header__badge ch11-tree-header__badge--full">Fully Grown</div>')
    + '</div>'

    + '<div class="ch11-tree-sections">'

    + '<div class="ch11-tree-section">'
    + '<div class="ch11-tree-section__title">Classification Rules</div>'
    + '<table class="ch10-lc-table"><thead><tr><th>If...</th><th>Then Predict</th><th>Confidence</th></tr></thead>'
    + '<tbody>' + rulesHTML + '</tbody></table>'
    + '</div>'

    + '<div class="ch11-tree-section">'
    + '<div class="ch11-tree-section__title">Validation Sample Results (10 loans)</div>'
    + '<table class="ch10-lc-table"><thead><tr><th>Obs.</th><th>Actual</th><th>Predicted</th><th>Result</th></tr></thead>'
    + '<tbody>' + validationHTML + '</tbody></table>'
    + '<div class="ch11-tree-score ' + (correctCount >= 9 ? 'ch11-tree-score--good' : correctCount >= 7 ? 'ch11-tree-score--ok' : 'ch11-tree-score--poor') + '">'
    + 'Correct Classification Rate: <strong>' + correctCount + '/' + totalCount + ' (' + fmtPct(correctCount / totalCount) + ')</strong>'
    + '</div>'
    + '</div>'

    + '</div>'

    + (depth === maxDepth
        ? '<div class="ch11-overfit-callout"><strong>Overfitting Warning:</strong> The fully grown tree achieves perfect purity on training data by memorizing noise. Notice the counterintuitive rule at depth 5 where a higher credit score predicts default. This is overfitting -- the model is fitting to random chance rather than the true signal.</div>'
        : '')

    + '</div>';
}

function initTool3() {
  const slider  = document.getElementById('t3-depth');
  const display = document.getElementById('t3-depth-display');
  slider.addEventListener('input', () => { display.textContent = slider.value; });
  document.getElementById('t3-build').addEventListener('click', calcTool3);
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 4 -- Model Validation Calculator
// ═══════════════════════════════════════════════════════════════════════════════

// Textbook validation data (Exhibit 11-14)
const PRUNED_TREE_DATA = [
  { y: 1, p: 0.33 }, { y: 0, p: 0.33 }, { y: 0, p: 0.01 },
  { y: 0, p: 0.33 }, { y: 0, p: 0.01 }, { y: 1, p: 0.99 },
  { y: 0, p: 0.01 }, { y: 0, p: 0.01 }, { y: 0, p: 0.01 },
  { y: 0, p: 0.01 }
];

const FULL_TREE_DATA = [
  { y: 1, p: 0.01 }, { y: 0, p: 0.99 }, { y: 0, p: 0.01 },
  { y: 0, p: 0.01 }, { y: 0, p: 0.01 }, { y: 1, p: 0.99 },
  { y: 0, p: 0.01 }, { y: 0, p: 0.01 }, { y: 0, p: 0.01 },
  { y: 0, p: 0.01 }
];

function buildValidationTable(tbodyId, data) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  data.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + (i + 1) + '</td>'
      + '<td><input class="form-input form-input--sm" type="number" data-col="y" data-row="' + i + '" value="' + row.y + '" min="0" max="1" step="1" /></td>'
      + '<td><input class="form-input form-input--sm" type="number" data-col="p" data-row="' + i + '" value="' + row.p + '" min="0.01" max="0.99" step="0.01" /></td>';
    tbody.appendChild(tr);
  });
}

function readValidationTable(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return [];
  const rows = [];
  tbody.querySelectorAll('tr').forEach(tr => {
    const yInput = tr.querySelector('[data-col="y"]');
    const pInput = tr.querySelector('[data-col="p"]');
    if (!yInput || !pInput) return;
    const y = parseFloat(yInput.value);
    const p = parseFloat(pInput.value);
    if (!isNaN(y) && !isNaN(p)) rows.push({ y, p });
  });
  return rows;
}

function calcTool4() {
  const rows   = readValidationTable('t4-table-body');
  const cutoff = val('t4-cutoff');
  if (rows.length === 0) return;

  const likelihoods = rows.map(r => {
    const L = Math.pow(r.p, r.y) * Math.pow(1 - r.p, 1 - r.y);
    const predicted = r.p >= cutoff ? 1 : 0;
    const correct   = predicted === r.y;
    return {...r, L, predicted, correct };
  });

  const overallL   = likelihoods.reduce((prod, r) => prod * r.L, 1);
  const avgL       = likelihoods.reduce((s, r) => s + r.L, 0) / likelihoods.length;
  const correctCt  = likelihoods.filter(r => r.correct).length;
  const modelQuality = avgL >= 0.80 ? 'Excellent' : avgL >= 0.65 ? 'Good' : avgL >= 0.50 ? 'Moderate' : 'Poor';
  const qualityClass = avgL >= 0.80 ? 'ch10-stat--good' : avgL >= 0.65 ? 'ch10-stat--ok' : 'ch10-stat--poor';

  const tableRows = likelihoods.map((r, i) =>
    '<tr>'
    + '<td>' + (i + 1) + '</td>'
    + '<td>' + (r.y === 1 ? 'Default (1)' : 'Repay (0)') + '</td>'
    + '<td>' + r.p.toFixed(2) + '</td>'
    + '<td>' + r.L.toFixed(4) + '</td>'
    + '<td>' + (r.predicted === 1 ? 'Default' : 'Repay') + '</td>'
    + '<td>' + (r.correct ? '<span class="variance-fav">&#10003;</span>' : '<span class="variance-unfav">&#10007;</span>') + '</td>'
    + '</tr>'
  ).join('');

  const out = getOrCreate('t4-output', 'div', 'tool-output',
    document.getElementById('t4-output').parentElement);

  out.innerHTML = '<div class="ch11-valid-result">'

    + '<div class="ch10-reg-stats" style="margin-bottom:var(--space-4);">'
    + '<div class="ch10-stat ' + qualityClass + '"><div class="ch10-stat__label">Average Likelihood</div>'
    + '<div class="ch10-stat__value">' + avgL.toFixed(4) + '</div>'
    + '<div class="ch10-stat__note">' + modelQuality + ' (threshold: 0.65)</div></div>'

    + '<div class="ch10-stat"><div class="ch10-stat__label">Overall Likelihood</div>'
    + '<div class="ch10-stat__value">' + overallL.toExponential(4) + '</div>'
    + '<div class="ch10-stat__note">Product of all L values</div></div>'

    + '<div class="ch10-stat ' + (correctCt / rows.length >= 0.8 ? 'ch10-stat--good' : 'ch10-stat--ok') + '"><div class="ch10-stat__label">Classification Rate</div>'
    + '<div class="ch10-stat__value">' + correctCt + '/' + rows.length + '</div>'
    + '<div class="ch10-stat__note">At cutoff p = ' + cutoff.toFixed(2) + '</div></div>'
    + '</div>'

    + '<div class="ch10-lc-table-wrap">'
    + '<table class="ch10-lc-table"><thead><tr>'
    + '<th>Obs.</th><th>Actual (y)</th><th>Predicted p</th>'
    + '<th>Likelihood L = p^y(1-p)^(1-y)</th><th>Predicted Class</th><th>Correct?</th>'
    + '</tr></thead><tbody>' + tableRows + '</tbody></table>'
    + '</div>'

    + '</div>';

  renderShowWork(document.getElementById('t4-show-work'), [
    { label: 'Likelihood Formula', formula: 'L = p^y * (1-p)^(1-y)', values: 'y=1 (default): L = p; y=0 (repay): L = 1-p', result: 'Ranges 0 to 1; higher = better prediction' },
    { label: 'Example: Obs 1 (y=1, p=' + likelihoods[0].p.toFixed(2) + ')', formula: 'p^1 * (1-p)^0 = p', values: likelihoods[0].p.toFixed(2) + '^1 * (1-' + likelihoods[0].p.toFixed(2) + ')^0', result: likelihoods[0].L.toFixed(4) },
    { label: 'Overall Likelihood', formula: 'Product of all individual L values', values: rows.length + ' observations multiplied together', result: overallL.toExponential(4), highlight: true },
    { label: 'Average Likelihood', formula: 'Sum of L values / n', values: likelihoods.reduce((s, r) => s + r.L, 0).toFixed(4) + ' / ' + rows.length, result: avgL.toFixed(4), highlight: true },
    { label: 'Correct Classification Rate', formula: 'Correct predictions / Total at cutoff ' + cutoff.toFixed(2), values: correctCt + ' correct out of ' + rows.length, result: fmtPct(correctCt / rows.length), highlight: true }
  ], { title: 'Model Validation Calculation', defaultOpen: false });
}

function initTool4() {
  buildValidationTable('t4-table-body', PRUNED_TREE_DATA);
  document.getElementById('t4-calculate').addEventListener('click', calcTool4);
  document.getElementById('t4-load-pruned').addEventListener('click', () => {
    buildValidationTable('t4-table-body', PRUNED_TREE_DATA);
  });
  document.getElementById('t4-load-full').addEventListener('click', () => {
    buildValidationTable('t4-table-body', FULL_TREE_DATA);
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 5 -- Confusion Matrix and Payoff Analyzer
// ═══════════════════════════════════════════════════════════════════════════════

// Textbook ROC data (Exhibit 11-16 / 11-17)
const SIERRA_ROC_POINTS = [
  { fpr: 0,    tpr: 0,   label: 'Start' },
  { fpr: 0,    tpr: 0.5, label: 'Cutoff 0.50' },
  { fpr: 0.25, tpr: 1.0, label: 'Cutoff 0.30' },
  { fpr: 1.0,  tpr: 1.0, label: 'End' }
];

const SIERRA_ROC_DEFAULT = [
  { label: 'Start',       fpr: 0,    tpr: 0   },
  { label: 'Cutoff 0.50', fpr: 0,    tpr: 0.5 },
  { label: 'Cutoff 0.30', fpr: 0.25, tpr: 1.0 },
  { label: 'End',         fpr: 1.0,  tpr: 1.0 }
];

let t5Chart = null;

function buildROCTable(data) {
  const tbody = document.getElementById('t5-roc-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  data.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + (i + 1) + '</td>'
      + '<td><input class="form-input form-input--sm" type="text" data-col="label" data-row="' + i + '" value="' + row.label + '" /></td>'
      + '<td><input class="form-input form-input--sm" type="number" data-col="fpr" data-row="' + i + '" value="' + row.fpr + '" min="0" max="1" step="0.01" /></td>'
      + '<td><input class="form-input form-input--sm" type="number" data-col="tpr" data-row="' + i + '" value="' + row.tpr + '" min="0" max="1" step="0.01" /></td>';
    tbody.appendChild(tr);
  });
}

function readROCTable() {
  const tbody = document.getElementById('t5-roc-body');
  if (!tbody) return [];
  const rows = [];
  tbody.querySelectorAll('tr').forEach(tr => {
    const labelInput = tr.querySelector('[data-col="label"]');
    const fprInput   = tr.querySelector('[data-col="fpr"]');
    const tprInput   = tr.querySelector('[data-col="tpr"]');
    if (!fprInput || !tprInput) return;
    const fpr = parseFloat(fprInput.value);
    const tpr = parseFloat(tprInput.value);
    if (!isNaN(fpr) && !isNaN(tpr)) {
      rows.push({ fpr, tpr, label: labelInput ? labelInput.value : '' });
    }
  });
  return rows;
}

function calcTool5() {
  const tp     = val('t5-tp');
  const fp     = val('t5-fp');
  const fn     = val('t5-fn');
  const tn     = val('t5-tn');
  const payTP  = val('t5-pay-tp');
  const payFP  = val('t5-pay-fp');
  const payFN  = val('t5-pay-fn');
  const payTN  = val('t5-pay-tn');

  const total       = tp + fp + fn + tn;
  const totalPayoff = tp * payTP + fp * payFP + fn * payFN + tn * payTN;
  const accuracy    = total > 0 ? (tp + tn) / total : 0;
  const fprVal      = (tp + fp) > 0 ? fp / (fp + tn) : 0;
  const tprVal      = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const precision   = (tp + fp) > 0 ? tp / (tp + fp) : 0;

  // ROC chart
  const rocPoints = readROCTable().filter(p => p.fpr >= 0 && p.fpr <= 1 && p.tpr >= 0 && p.tpr <= 1);
  const chartWrap = document.getElementById('t5-chart-wrap');
  chartWrap.style.display = 'block';
  const canvas = document.getElementById('t5-canvas');

  if (rocPoints.length >= 2) {
    if (t5Chart) {
      t5Chart.update({ points: rocPoints });
    } else {
      t5Chart = new ROCChart(canvas, {
        points: rocPoints,
        title: 'ROC Curve',
        showDiagonal: true,
        showAUC: true
      });
    }
  }

  const out = getOrCreate('t5-output', 'div', 'tool-output',
    document.getElementById('t5-output').parentElement);

  const payoffClass = totalPayoff >= 0 ? 'variance-fav' : 'variance-unfav';

  out.innerHTML = '<div class="ch11-payoff-result">'

    + '<div class="ch11-confusion-matrix">'
    + '<div class="ch11-confusion-matrix__title">Confusion Matrix</div>'
    + '<table class="ch11-cm-table">'
    + '<thead><tr><th></th><th>Predicted Default<br/>(Do Not Invest)</th><th>Predicted Repay<br/>(Invest)</th><th>Total</th></tr></thead>'
    + '<tbody>'
    + '<tr><td><strong>Actual Default</strong></td>'
    + '<td class="ch11-cm-tp">TP = ' + tp + '<br/><span class="ch11-cm-payoff">Payoff: ' + fmt(payTP) + '</span></td>'
    + '<td class="ch11-cm-fn">FN = ' + fn + '<br/><span class="ch11-cm-payoff">Payoff: ' + fmt(payFN) + '</span></td>'
    + '<td>' + (tp + fn) + '</td></tr>'
    + '<tr><td><strong>Actual Repay</strong></td>'
    + '<td class="ch11-cm-fp">FP = ' + fp + '<br/><span class="ch11-cm-payoff">Payoff: ' + fmt(payFP) + '</span></td>'
    + '<td class="ch11-cm-tn">TN = ' + tn + '<br/><span class="ch11-cm-payoff">Payoff: ' + fmt(payTN) + '</span></td>'
    + '<td>' + (fp + tn) + '</td></tr>'
    + '<tr><td><strong>Total</strong></td><td>' + (tp + fp) + '</td><td>' + (fn + tn) + '</td><td>' + total + '</td></tr>'
    + '</tbody></table>'
    + '</div>'

    + '<div class="ch10-reg-stats" style="margin:var(--space-4) 0;">'
    + '<div class="ch10-stat"><div class="ch10-stat__label">Accuracy</div>'
    + '<div class="ch10-stat__value">' + fmtPct(accuracy) + '</div>'
    + '<div class="ch10-stat__note">(TP + TN) / Total</div></div>'

    + '<div class="ch10-stat"><div class="ch10-stat__label">True Positive Rate</div>'
    + '<div class="ch10-stat__value">' + fmtPct(tprVal) + '</div>'
    + '<div class="ch10-stat__note">TP / (TP + FN)</div></div>'

    + '<div class="ch10-stat"><div class="ch10-stat__label">False Positive Rate</div>'
    + '<div class="ch10-stat__value">' + fmtPct(fprVal) + '</div>'
    + '<div class="ch10-stat__note">FP / (FP + TN)</div></div>'
    + '</div>'

    + '<div class="ch11-payoff-total">'
    + '<div class="ch11-payoff-total__label">Total Payoff</div>'
    + '<div class="ch11-payoff-total__calc">'
    + '(' + tp + ' &times; ' + fmt(payTP) + ') + (' + fp + ' &times; ' + fmt(payFP) + ') + (' + fn + ' &times; ' + fmt(payFN) + ') + (' + tn + ' &times; ' + fmt(payTN) + ')'
    + '</div>'
    + '<div class="ch11-payoff-total__value ' + payoffClass + '">' + fmt(totalPayoff) + '</div>'
    + '</div>'

    + '</div>';

  renderShowWork(document.getElementById('t5-show-work'), [
    { label: 'True Positive Rate (Sensitivity)', formula: 'TP / (TP + FN)', values: tp + ' / (' + tp + ' + ' + fn + ')', result: fmtPct(tprVal) },
    { label: 'False Positive Rate', formula: 'FP / (FP + TN)', values: fp + ' / (' + fp + ' + ' + tn + ')', result: fmtPct(fprVal) },
    { label: 'Accuracy', formula: '(TP + TN) / Total', values: '(' + tp + ' + ' + tn + ') / ' + total, result: fmtPct(accuracy) },
    { label: 'Total Payoff', formula: 'TP*payTP + FP*payFP + FN*payFN + TN*payTN',
      values: tp + '*' + fmt(payTP) + ' + ' + fp + '*' + fmt(payFP) + ' + ' + fn + '*' + fmt(payFN) + ' + ' + tn + '*' + fmt(payTN),
      result: fmt(totalPayoff), highlight: true }
  ], { title: 'Confusion Matrix and Payoff Calculation', defaultOpen: false });
}

function initTool5() {
  buildROCTable(SIERRA_ROC_DEFAULT);
  document.getElementById('t5-calculate').addEventListener('click', calcTool5);
  initRandomizer('t5-randomize', [
    { id: 't5-tp',      min: 0,   max: 20,  step: 1,  integer: true },
    { id: 't5-fp',      min: 0,   max: 20,  step: 1,  integer: true },
    { id: 't5-fn',      min: 0,   max: 20,  step: 1,  integer: true },
    { id: 't5-tn',      min: 0,   max: 80,  step: 1,  integer: true },
    { id: 't5-pay-tp',  min: 0,   max: 30,  step: 2,  integer: true },
    { id: 't5-pay-fp',  min: 0,   max: 30,  step: 2,  integer: true },
    { id: 't5-pay-fn',  min: -120, max: -20, step: 5,  integer: true },
    { id: 't5-pay-tn',  min: 20,  max: 80,  step: 5,  integer: true }
  ], calcTool5);
  document.getElementById('t5-load-050').addEventListener('click', () => {
    document.getElementById('t5-tp').value = 1;
    document.getElementById('t5-fp').value = 0;
    document.getElementById('t5-fn').value = 1;
    document.getElementById('t5-tn').value = 8;
  });
  document.getElementById('t5-load-030').addEventListener('click', () => {
    document.getElementById('t5-tp').value = 2;
    document.getElementById('t5-fp').value = 2;
    document.getElementById('t5-fn').value = 0;
    document.getElementById('t5-tn').value = 6;
  });
  document.getElementById('t5-load-roc').addEventListener('click', () => {
    buildROCTable(SIERRA_ROC_DEFAULT);
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// KEY TERMS
// ═══════════════════════════════════════════════════════════════════════════════

const KEY_TERMS = [
  { term: 'Data Science',              definition: 'The use of data analytics to draw conclusions from data. Sits at the intersection of computer science, math and statistics, and substantive domain expertise.' },
  { term: 'Predictive Modeling',       definition: 'A data science technique used to make predictions based on past or current data. The model learns from training data and predicts outcomes for new records.' },
  { term: 'Decision Tree',             definition: 'A predictive modeling technique that segments the target variable into different regions based on a set of if-then-else rules, using recursive partitioning to reduce impurity.' },
  { term: 'Gini Impurity',             definition: 'A measure of the purity of a collection of observations in a rectangle. Zero means perfectly pure (one class only). Maximum value of 0.5 for two equal classes. The algorithm minimizes Gini impurity at each cut.' },
  { term: 'Information Gain',          definition: 'The reduction in Gini impurity from the level in the original rectangle to the weighted average level in the new rectangles created by a cut. The algorithm maximizes information gain.' },
  { term: 'Overfitting',               definition: 'Occurs when a model adheres too closely to the specific details of a dataset, capturing noise from random chance in addition to signal. Overfitting limits a model ability to predict future outcomes.' },
  { term: 'Pruning',                   definition: 'A technique in which the decision tree is not grown to its full size but is only allowed to grow to a certain depth. Pruning prevents overfitting by stopping the tree before it memorizes noise.' },
  { term: 'Cross-Validation',          definition: 'The process of comparing predictions of different models on a new set of data for which the actual outcomes are already known. Managers choose the model that predicts most accurately on the validation sample.' },
  { term: 'Holdout Sample',            definition: 'A completely new dataset, unseen by the model, used to test final model performance. Also called a test sample. Provides the most honest estimate of real-world predictive accuracy.' },
  { term: 'Training Sample',           definition: 'The portion of data used to build and fit the model. Typically 60% of the total dataset. The model learns patterns from this data.' },
  { term: 'Maximum Likelihood',        definition: 'A method for evaluating model predictions. The likelihood value L = p^y * (1-p)^(1-y) ranges from 0 to 1 and is maximized when predicted probabilities are close to actual outcomes.' },
  { term: 'Bias-Variance Tradeoff',    definition: 'The tradeoff between underfitting (high bias, low variance) and overfitting (low bias, high variance). Pruning increases bias but reduces variance. The optimal depth balances both.' },
  { term: 'Hyperparameter',            definition: 'A parameter that cannot be learned by running the model and must be chosen before analysis. In decision trees, the maximum depth is a hyperparameter.' },
  { term: 'Target Leakage',            definition: 'Data that are not available at the time of the analysis and therefore should be excluded from the model. Including future data artificially inflates model performance and leads to poor real-world predictions.' },
  { term: 'ROC Curve',                 definition: 'Receiver Operating Characteristic curve. Plots the true positive rate (y-axis) against the false positive rate (x-axis) at different classification thresholds. A curve closer to the upper-left corner indicates a better model.' },
  { term: 'Confusion Matrix',          definition: 'A matrix showing predicted versus actual classifications at a given threshold. Contains true positives (TP), false positives (FP), false negatives (FN), and true negatives (TN).' },
  { term: 'True Positives (TP)',        definition: 'Observations correctly predicted as positive (e.g., default loans correctly predicted as defaults). The model correctly identified the event of interest.' },
  { term: 'False Positives (FP)',       definition: 'Observations incorrectly predicted as positive (e.g., repay loans falsely predicted as defaults). The model raised a false alarm.' },
  { term: 'False Negatives (FN)',       definition: 'Observations incorrectly predicted as negative (e.g., default loans predicted as repay). The model missed the event of interest. Often the most costly error.' },
  { term: 'True Negatives (TN)',        definition: 'Observations correctly predicted as negative (e.g., repay loans correctly predicted as repays). The model correctly identified the absence of the event.' },
  { term: 'False Positive Rate',        definition: 'The fraction of negatives incorrectly identified as positives at a given threshold. Calculated as FP / (FP + TN). Plotted on the x-axis of the ROC curve.' },
  { term: 'True Positive Rate',         definition: 'The fraction of positives correctly identified as positives at a given threshold. Also called sensitivity or recall. Calculated as TP / (TP + FN). Plotted on the y-axis of the ROC curve.' }
];

function initKeyTerms() {
  const grid = document.getElementById('key-terms-grid');
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


// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER COMPLETE
// ═══════════════════════════════════════════════════════════════════════════════

function injectResetButton(card) {
  if (document.getElementById('ch11-reset-btn')) return;
  const resetBtn = document.createElement('button');
  resetBtn.id = 'ch11-reset-btn';
  resetBtn.className = 'btn btn--ghost btn--small';
  resetBtn.textContent = 'Reset Chapter';
  resetBtn.style.marginTop = 'var(--space-3)';
  resetBtn.addEventListener('click', () => {
    resetChapter('ch11');
    const markBtn = document.getElementById('mark-complete-btn');
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
  const btn  = document.getElementById('mark-complete-btn');
  const card = document.getElementById('chapter-complete');
  if (!btn || !card) return;
  if (isChapterComplete('ch11')) {
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    injectResetButton(card);
  }
  btn.addEventListener('click', () => {
    markChapterComplete('ch11');
    btn.textContent = 'Chapter Complete!';
    btn.disabled = true;
    btn.classList.add('btn--success');
    injectResetButton(card);
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initSettingsPanel();
  initTool1();
  initTool2();
  initTool3();
  initTool4();
  initTool5();
  initKeyTerms();
  initChapterComplete();
});
