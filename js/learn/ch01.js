/**
 * ch01.js — Chapter 1: The Manager and Management Accounting
 * Interactive tools: accounting comparison, value chain, five-step process, IMA ethics
 */
import { markChapterComplete, isChapterComplete, resetChapter } from '/js/core/progress-tracker.js';

// ── Data ──────────────────────────────────────────────────────

const ACCOUNTING_COMPARISON = [
  {
    dimension: 'Primary Users',
    financial: 'External parties (investors, creditors, regulators)',
    management: 'Internal managers at all levels',
    cost: 'Both internal managers and external parties',
    detail: {
      financial: 'Financial accounting reports are designed for shareholders, banks, and government agencies who need standardized information.',
      management: 'Management accounting is tailored to the specific decisions managers face — no standardization required.',
      cost: 'Cost accounting bridges both worlds, providing cost data used in financial statements and management decisions.',
    }
  },
  {
    dimension: 'Time Focus',
    financial: 'Historical (past performance)',
    management: 'Future-oriented (planning & decisions)',
    cost: 'Both historical and future-oriented',
    detail: {
      financial: 'Financial statements report what already happened — last quarter, last year.',
      management: 'Management accounting looks forward: budgets, forecasts, and what-if analyses.',
      cost: 'Cost accounting records historical costs but also uses them to predict future costs.',
    }
  },
  {
    dimension: 'Rules & Standards',
    financial: 'Required to follow GAAP / IFRS',
    management: 'No mandatory rules — designed for usefulness',
    cost: 'GAAP for external; flexible for internal use',
    detail: {
      financial: 'GAAP (Generally Accepted Accounting Principles) ensures comparability across companies.',
      management: 'Managers choose whatever format helps them make better decisions — no external rules apply.',
      cost: 'When cost data appears in financial statements, GAAP applies. Internal cost reports can use any format.',
    }
  },
  {
    dimension: 'Reporting Frequency',
    financial: 'Periodic (quarterly, annually)',
    management: 'As needed (daily, weekly, or real-time)',
    cost: 'Continuous — costs tracked as incurred',
    detail: {
      financial: 'Public companies must file quarterly (10-Q) and annual (10-K) reports on a fixed schedule.',
      management: 'A manager might need a daily sales report, a weekly variance report, or an ad-hoc analysis for a one-time decision.',
      cost: 'Cost systems track costs continuously so managers always know current production costs.',
    }
  },
  {
    dimension: 'Scope',
    financial: 'Entire organization (consolidated)',
    management: 'Any segment, product, or decision',
    cost: 'Individual products, services, or processes',
    detail: {
      financial: 'Financial statements show the company as a whole — you cannot see individual product profitability.',
      management: 'Management accounting can zoom in on a single product, customer, department, or decision.',
      cost: 'Cost accounting specializes in assigning costs to specific products or services.',
    }
  },
];

const VALUE_CHAIN_STEPS = [
  { id: 'rnd',          name: 'R&D',          icon: '🔬', desc: 'Generating and experimenting with ideas for new products, services, or processes' },
  { id: 'design',       name: 'Design',        icon: '✏️',  desc: 'Detailed planning, engineering, and testing of products and processes' },
  { id: 'production',   name: 'Production',    icon: '🏭', desc: 'Acquiring, storing, and assembling resources to produce a product or deliver a service' },
  { id: 'marketing',    name: 'Marketing',     icon: '📣', desc: 'Promoting and selling products or services to customers' },
  { id: 'distribution', name: 'Distribution',  icon: '🚚', desc: 'Processing orders and delivering products or services to customers' },
  { id: 'service',      name: 'Customer\nService', icon: '🤝', desc: 'Providing after-sale support to customers' },
];

const VALUE_CHAIN_ACTIVITIES = [
  { id: 'a1', text: 'Testing a new product prototype',         correct: 'rnd' },
  { id: 'a2', text: 'Running a TV advertisement',              correct: 'marketing' },
  { id: 'a3', text: 'Assembling components on a factory line', correct: 'production' },
  { id: 'a4', text: 'Handling a customer warranty claim',       correct: 'service' },
  { id: 'a5', text: 'Shipping finished goods to retailers',     correct: 'distribution' },
  { id: 'a6', text: 'Engineering a product for easier assembly',correct: 'design' },
  { id: 'a7', text: 'Conducting market research',              correct: 'marketing' },
  { id: 'a8', text: 'Setting up a customer help desk',         correct: 'service' },
];

const FIVE_STEPS = [
  {
    number: 1,
    title: 'Identify the Problem and Uncertainties',
    desc: 'Define the decision that needs to be made and the key uncertainties that affect the outcome.',
    key: '<strong>Key question:</strong> What exactly are we deciding, and what could go wrong?',
    example: {
      title: 'Step 1 — Daily News Company',
      text: 'Should the Daily News add a Sunday edition? Key uncertainty: Will enough readers subscribe to make it profitable?'
    }
  },
  {
    number: 2,
    title: 'Obtain Information',
    desc: 'Gather relevant data — historical costs, market research, competitor information, and expert opinions.',
    key: '<strong>Key question:</strong> What data do we need, and where do we get it?',
    example: {
      title: 'Step 2 — Daily News Company',
      text: 'Gather data on printing costs, delivery costs, potential advertising revenue, and competitor Sunday edition circulation numbers.'
    }
  },
  {
    number: 3,
    title: 'Make Predictions About the Future',
    desc: 'Use the information gathered to forecast future revenues, costs, and other outcomes under each alternative.',
    key: '<strong>Key question:</strong> What do we expect to happen under each option?',
    example: {
      title: 'Step 3 — Daily News Company',
      text: 'Predict: Sunday edition will add 10,000 subscribers at $2/week revenue, with $15,000/week in additional costs — a projected $5,000/week profit.'
    }
  },
  {
    number: 4,
    title: 'Make Decisions by Choosing Among Alternatives',
    desc: 'Evaluate the predicted outcomes and select the alternative that best achieves the organization\'s goals.',
    key: '<strong>Key question:</strong> Which option maximizes value given our predictions and constraints?',
    example: {
      title: 'Step 4 — Daily News Company',
      text: 'Decision: Launch the Sunday edition. The projected $5,000/week profit exceeds the required return, and the qualitative benefit of increased market presence supports the decision.'
    }
  },
  {
    number: 5,
    title: 'Implement the Decision, Evaluate Performance, and Learn',
    desc: 'Execute the chosen alternative, track actual results against predictions, and use the feedback to improve future decisions.',
    key: '<strong>Key question:</strong> Did it work as expected? What can we learn for next time?',
    example: {
      title: 'Step 5 — Daily News Company',
      text: 'After 3 months: actual profit is $3,800/week — below the $5,000 prediction. Investigation reveals delivery costs were underestimated. This learning improves future cost estimates.'
    }
  },
];

const IMA_STANDARDS = [
  {
    name: 'Competence',
    icon: '🎓',
    desc: 'Maintain professional knowledge and skills; perform duties in accordance with relevant laws and standards.',
    behaviors: [
      'Keep skills and knowledge current',
      'Perform duties with professional expertise',
      'Prepare complete and clear reports',
    ]
  },
  {
    name: 'Confidentiality',
    icon: '🔒',
    desc: 'Keep information confidential except when authorized or legally required to disclose it.',
    behaviors: [
      'Do not disclose confidential information',
      'Inform subordinates about confidentiality',
      'Refrain from using confidential info for personal gain',
    ]
  },
  {
    name: 'Integrity',
    icon: '⚖️',
    desc: 'Avoid conflicts of interest; refrain from activities that would prejudice your ability to carry out duties ethically.',
    behaviors: [
      'Avoid conflicts of interest',
      'Refuse gifts that could influence decisions',
      'Communicate unfavorable information honestly',
    ]
  },
  {
    name: 'Credibility',
    icon: '✅',
    desc: 'Communicate information fairly and objectively; disclose all relevant information that could influence decisions.',
    behaviors: [
      'Communicate information fairly and objectively',
      'Disclose all relevant information',
      'Disclose delays or deficiencies in information',
    ]
  },
];

const ETHICS_SCENARIOS = [
  {
    scenario: 'Maria, a management accountant, discovers that her company\'s CEO has been inflating revenue figures in internal reports to boost his annual bonus. Maria\'s supervisor tells her to "look the other way." What standard is being violated?',
    correct: 'Integrity',
    explanation: 'Integrity requires avoiding conflicts of interest and communicating unfavorable information honestly. The CEO\'s manipulation and the supervisor\'s instruction both violate this standard.'
  },
  {
    scenario: 'James shares details of his company\'s upcoming acquisition with his brother-in-law, who then buys stock in the target company before the deal is announced. Which IMA standard did James violate?',
    correct: 'Confidentiality',
    explanation: 'Confidentiality requires that management accountants not disclose confidential information or use it for personal gain. Sharing non-public acquisition information is a clear violation — and also illegal insider trading.'
  },
  {
    scenario: 'Sarah prepares a budget variance report but omits several unfavorable variances because she knows her manager dislikes bad news. The report is technically accurate but incomplete. Which standard is violated?',
    correct: 'Credibility',
    explanation: 'Credibility requires disclosing all relevant information that could influence a user\'s understanding. Omitting unfavorable variances gives a misleading picture, violating this standard even if no numbers are falsified.'
  },
  {
    scenario: 'David, a cost accountant, has not updated his knowledge of the new lease accounting standard (ASC 842) that took effect two years ago. His lease cost calculations are now incorrect. Which standard is violated?',
    correct: 'Competence',
    explanation: 'Competence requires maintaining professional knowledge and skills. Failing to stay current with relevant accounting standards and producing incorrect calculations violates this standard.'
  },
  {
    scenario: 'Lisa accepts an expensive vacation package from a supplier whose contract she is responsible for evaluating and recommending. She plans to recommend the supplier anyway. Which standard is most directly violated?',
    correct: 'Integrity',
    explanation: 'Integrity requires refusing gifts or favors that could influence — or appear to influence — professional judgment. Accepting a vacation from a supplier under evaluation is a textbook conflict of interest.'
  },
];

const KEY_TERMS = [
  { term: 'Management Accounting', definition: 'Measures, analyzes, and reports financial and nonfinancial information that helps managers make decisions to fulfill the goals of an organization. Focuses on internal reporting.' },
  { term: 'Financial Accounting', definition: 'Measures and records business transactions and provides financial statements based on GAAP. Focuses on reporting to external parties such as investors and banks.' },
  { term: 'Cost Accounting', definition: 'Measures, analyzes, and reports financial and nonfinancial information relating to the costs of acquiring or using resources. Provides information for both management and financial accounting.' },
  { term: 'Value Chain', definition: 'The sequence of business functions by which a product is made progressively more useful to customers: R&D, design, production, marketing, distribution, and customer service.' },
  { term: 'Supply Chain', definition: 'The flow of goods, services, and information from the initial sources of materials and services to the delivery of products to consumers, regardless of whether those activities occur in the same organization or in other organizations.' },
  { term: 'Strategy', definition: 'Specifies how an organization matches its own capabilities with the opportunities in the marketplace to accomplish its objectives.' },
  { term: 'Cost Leadership', definition: 'An organization\'s ability to achieve lower costs relative to competitors through productivity and efficiency improvements, elimination of waste, and tight cost control.' },
  { term: 'Product Differentiation', definition: 'An organization\'s ability to offer products or services perceived by its customers to be superior and unique relative to the products or services of its competitors.' },
  { term: 'Planning', definition: 'Selecting organization goals, predicting results under various alternative ways of achieving those goals, deciding how to attain the desired goals, and communicating the goals and how to achieve them to the entire organization.' },
  { term: 'Control', definition: 'Taking actions that implement the planning decisions, evaluating past performance, and providing feedback and learning that will help future decision making.' },
  { term: 'Controller', definition: 'The financial executive primarily responsible for management accounting and financial accounting. Also referred to as chief accounting officer.' },
  { term: 'Chief Financial Officer (CFO)', definition: 'Executive responsible for overseeing the financial operations of an organization. Also called finance director.' },
  { term: 'Line Management', definition: 'Managers (for example, in production, marketing, or distribution) who are directly responsible for attaining the goals of the organization.' },
  { term: 'Staff Management', definition: 'Staff (such as management accountants and human resources managers) who provide advice, support, and assistance to line management.' },
];

// ── Tool 1: Accounting Comparison ────────────────────────────

function initAccountingComparison() {
  const tbody = document.getElementById('comparison-table-body');
  const detail = document.getElementById('comparison-detail');
  const detailText = document.getElementById('comparison-detail-text');
  if (!tbody) return;

  let activeCell = null;

  ACCOUNTING_COMPARISON.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.dimension}</td>
      <td class="clickable" data-type="financial"  data-dim="${row.dimension}">${row.financial}</td>
      <td class="clickable" data-type="management" data-dim="${row.dimension}">${row.management}</td>
      <td class="clickable" data-type="cost"       data-dim="${row.dimension}">${row.cost}</td>
    `;
    tbody.appendChild(tr);
  });

  tbody.addEventListener('click', e => {
    const cell = e.target.closest('.clickable');
    if (!cell) return;
    const type = cell.dataset.type;
    const dim  = cell.dataset.dim;
    const rowData = ACCOUNTING_COMPARISON.find(r => r.dimension === dim);
    if (!rowData) return;

    if (activeCell) activeCell.classList.remove('clickable--active');
    if (activeCell === cell) {
      activeCell = null;
      detail.hidden = true;
      return;
    }
    cell.classList.add('clickable--active');
    activeCell = cell;
    detailText.textContent = rowData.detail[type];
    detail.hidden = false;
  });
}

// ── Tool 2: Value Chain ───────────────────────────────────────

function initValueChain() {
  const diagram  = document.getElementById('value-chain-diagram');
  const chipsEl  = document.getElementById('activity-chips');
  const resultEl = document.getElementById('value-chain-result');
  const resultTx = document.getElementById('value-chain-result-text');
  if (!diagram || !chipsEl) return;

  let selectedActivity = null;
  const placements = {};

  VALUE_CHAIN_STEPS.forEach(step => {
    const div = document.createElement('div');
    div.className = 'value-chain-step';
    div.dataset.stepId = step.id;
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `${step.name} — click to place selected activity`);
    div.innerHTML = `
      <div class="value-chain-step__number">${VALUE_CHAIN_STEPS.indexOf(step) + 1}</div>
      <div class="value-chain-step__icon">${step.icon}</div>
      <div class="value-chain-step__name">${step.name}</div>
      <div class="value-chain-step__drop-zone" id="drop-${step.id}"></div>
    `;
    div.addEventListener('click', () => placeActivity(step.id, div));
    div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') placeActivity(step.id, div); });
    diagram.appendChild(div);
  });

  VALUE_CHAIN_ACTIVITIES.forEach(act => {
    const chip = document.createElement('button');
    chip.className = 'activity-chip';
    chip.dataset.actId = act.id;
    chip.textContent = act.text;
    chip.addEventListener('click', () => selectActivity(act.id, chip));
    chipsEl.appendChild(chip);
  });

  function selectActivity(actId, chip) {
    if (chip.classList.contains('activity-chip--placed')) return;
    document.querySelectorAll('.activity-chip--selected').forEach(c => c.classList.remove('activity-chip--selected'));
    if (selectedActivity === actId) { selectedActivity = null; return; }
    selectedActivity = actId;
    chip.classList.add('activity-chip--selected');
  }

  function placeActivity(stepId, stepEl) {
    if (!selectedActivity) return;
    const act  = VALUE_CHAIN_ACTIVITIES.find(a => a.id === selectedActivity);
    const chip = chipsEl.querySelector(`[data-act-id="${selectedActivity}"]`);
    const zone = document.getElementById(`drop-${stepId}`);
    if (!act || !chip || !zone) return;

    const isCorrect = act.correct === stepId;
    placements[act.id] = { stepId, correct: isCorrect };

    if (isCorrect) {
      chip.classList.remove('activity-chip--selected', 'activity-chip--incorrect');
      chip.classList.add('activity-chip--placed');
      const tag = document.createElement('span');
      tag.style.cssText = 'font-size:0.65rem;background:rgba(255,255,255,0.2);color:#fff;padding:2px 6px;border-radius:9999px;';
      tag.textContent = act.text;
      zone.appendChild(tag);
    } else {
      chip.classList.add('activity-chip--incorrect');
      chip.classList.remove('activity-chip--selected');
      resultEl.hidden = false;
      resultEl.className = 'result-panel result-panel--danger';
      resultTx.textContent = `"${act.text}" doesn't belong in ${VALUE_CHAIN_STEPS.find(s => s.id === stepId).name}. Think about what that function does and try again.`;
      setTimeout(() => chip.classList.remove('activity-chip--incorrect'), 1500);
    }

    selectedActivity = null;
    checkValueChainComplete();
  }

  function checkValueChainComplete() {
    const placed  = Object.values(placements).filter(p => p.correct).length;
    const total   = VALUE_CHAIN_ACTIVITIES.length;
    if (placed === total) {
      resultEl.hidden = false;
      resultEl.className = 'result-panel result-panel--success';
      resultTx.textContent = `All ${total} activities correctly placed! You understand how the value chain functions work together to deliver value to customers.`;
    }
  }
}

// ── Tool 3: Five-Step Process ─────────────────────────────────

function initFiveStep() {
  const nav     = document.querySelector('.five-step-nav');
  const content = document.getElementById('five-step-content');
  const toggle  = document.getElementById('five-step-example-toggle');
  const body    = document.getElementById('five-step-example-body');
  const stepsEl = document.getElementById('example-steps');
  if (!nav || !content) return;

  FIVE_STEPS.forEach((step, i) => {
    const tab = document.createElement('button');
    tab.className = `five-step-tab${i === 0 ? ' five-step-tab--active' : ''}`;
    tab.dataset.step = i;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', i === 0);
    tab.innerHTML = `<span>${step.number}</span><span>${step.title.split(' ').slice(0, 2).join(' ')}</span>`;
    tab.addEventListener('click', () => showStep(i));
    nav.appendChild(tab);

    const panel = document.createElement('div');
    panel.className = `five-step-panel${i === 0 ? ' five-step-panel--active' : ''}`;
    panel.dataset.step = i;
    panel.innerHTML = `
      <div class="five-step-panel__number">Step ${step.number} of 5</div>
      <div class="five-step-panel__title">${step.title}</div>
      <p class="five-step-panel__desc">${step.desc}</p>
      <div class="five-step-panel__key">${step.key}</div>
    `;
    content.appendChild(panel);
  });

  if (stepsEl) {
    FIVE_STEPS.forEach(step => {
      const div = document.createElement('div');
      div.className = 'example-step';
      div.innerHTML = `
        <div class="example-step__number">${step.number}</div>
        <div class="example-step__content">
          <div class="example-step__title">${step.example.title}</div>
          <p class="example-step__text">${step.example.text}</p>
        </div>
      `;
      stepsEl.appendChild(div);
    });
  }

  if (toggle && body) {
    toggle.addEventListener('click', () => {
      const open = body.classList.toggle('worked-example__body--open');
      toggle.setAttribute('aria-expanded', open);
      toggle.querySelector('.worked-example__chevron').textContent = open ? '▲' : '▼';
    });
    toggle.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
    });
  }

  function showStep(index) {
    nav.querySelectorAll('.five-step-tab').forEach((t, i) => {
      t.classList.toggle('five-step-tab--active', i === index);
      t.setAttribute('aria-selected', i === index);
    });
    content.querySelectorAll('.five-step-panel').forEach((p, i) => {
      p.classList.toggle('five-step-panel--active', i === index);
    });
  }
}

// ── Tool 4: IMA Ethics ────────────────────────────────────────

function initEthics() {
  const standardsEl = document.getElementById('ethics-standards');
  const scenarioEl  = document.getElementById('ethics-scenario-display');
  const optionsEl   = document.getElementById('ethics-scenario-options');
  const resultEl    = document.getElementById('ethics-result');
  const resultTx    = document.getElementById('ethics-result-text');
  const counterEl   = document.getElementById('ethics-counter');
  const prevBtn     = document.getElementById('ethics-prev');
  const nextBtn     = document.getElementById('ethics-next');
  if (!standardsEl) return;

  IMA_STANDARDS.forEach(std => {
    const div = document.createElement('div');
    div.className = 'ethics-standard';
    div.innerHTML = `
      <div class="ethics-standard__icon">${std.icon}</div>
      <div class="ethics-standard__name">${std.name}</div>
      <p class="ethics-standard__desc">${std.desc}</p>
      <ul class="ethics-standard__behaviors">
        ${std.behaviors.map(b => `<li>${b}</li>`).join('')}
      </ul>
    `;
    standardsEl.appendChild(div);
  });

  let current = 0;
  let answered = false;

  function showScenario(index) {
    const s = ETHICS_SCENARIOS[index];
    scenarioEl.textContent = s.scenario;
    optionsEl.innerHTML = '';
    resultEl.hidden = true;
    answered = false;

    IMA_STANDARDS.forEach(std => {
      const btn = document.createElement('button');
      btn.className = 'ethics-option';
      btn.textContent = std.name;
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const correct = std.name === s.correct;
        btn.classList.add(correct ? 'ethics-option--correct' : 'ethics-option--incorrect');
        if (!correct) {
          optionsEl.querySelectorAll('.ethics-option').forEach(b => {
            if (b.textContent === s.correct) b.classList.add('ethics-option--correct');
          });
        }
        resultEl.hidden = false;
        resultEl.className = `result-panel result-panel--${correct ? 'success' : 'danger'}`;
        resultTx.textContent = s.explanation;
      });
      optionsEl.appendChild(btn);
    });

    counterEl.textContent = `Scenario ${index + 1} of ${ETHICS_SCENARIOS.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === ETHICS_SCENARIOS.length - 1;
  }

  prevBtn.addEventListener('click', () => { if (current > 0) showScenario(--current); });
  nextBtn.addEventListener('click', () => { if (current < ETHICS_SCENARIOS.length - 1) showScenario(++current); });

  showScenario(0);
}

// ── Key Terms ─────────────────────────────────────────────────

function initKeyTerms() {
  const grid = document.getElementById('key-terms-grid');
  if (!grid) return;

  KEY_TERMS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'key-term';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-expanded', 'false');
    div.innerHTML = `
      <div class="key-term__word">${item.term}</div>
      <p class="key-term__definition">${item.definition}</p>
    `;
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

// ── Chapter Complete ──────────────────────────────────────────

function initChapterComplete() {
  const btn       = document.getElementById('mark-complete-btn');
  const statusEl  = document.getElementById('ch01-status');
  const actionsEl = btn?.closest('.chapter-complete__actions');

  if (isChapterComplete('ch01')) setCompleteUI();

  btn?.addEventListener('click', () => {
    markChapterComplete('ch01');
    setCompleteUI();
  });

  function setCompleteUI() {
    if (statusEl) {
      statusEl.textContent = '✓ Completed';
      statusEl.classList.add('chapter-hero__progress-label--complete');
    }
    if (btn) {
      btn.textContent = '✓ Completed';
      btn.disabled = true;
    }
    if (actionsEl && !actionsEl.querySelector('.reset-chapter-btn')) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn--ghost-danger reset-chapter-btn';
      resetBtn.textContent = 'Reset Chapter';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset Chapter 1? This will clear your completion status and reload the page.')) {
          resetChapter('ch01');
          window.location.reload();
        }
      });
      actionsEl.appendChild(resetBtn);
    }
  }
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initAccountingComparison();
  initValueChain();
  initFiveStep();
  initEthics();
  initKeyTerms();
  initChapterComplete();
});
