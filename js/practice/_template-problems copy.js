// js/practice/_template-problems.js
// TEMPLATE — copy to chXX-problems.js for new chapters.
// Conforms to js/practice/SPEC.md (Pass 2).
//
// AUTHORING CHECKLIST (see agent_prompt.txt §6.9):
//   1. Save as chXX-problems.js with the chapter number
//   2. Replace CH_REVIEW href with the correct learn page
//   3. Author 3-5 problems following the schema below
//   4. Mix numeric and choice steps — pair magnitudes with directions/decisions
//   5. Run: npm run validate -- js/practice/chXX-problems.js
//   6. Clone an existing chXX.html + chXX.js for picker wiring
//   7. Activate the tile in js/practice/index.js
//
// CRITICAL ANTI-PATTERNS:
//   - Never write `${data => data.foo}` in template literals — it stringifies
//     the arrow function. Either use plain strings, or use options: (data) => [...]
//     for choice step option labels that need data interpolation.
//   - Never call randomCompany() / randomProduct() inside scenario() or showWork().
//     Call them in randomize() and store on data.
//   - Never use Math.random() inside solve() or correctId() — only in randomize().
//   - Never hardcode hex colors in show-work entries — use CSS tokens via highlight: true.
//   - Numeric steps require `unit` field. Choice steps don't.
//   - Pedagogically-fixed choice steps (always one correct answer) need
//     `intentionalSingleAnswer: true` to suppress the validator coverage warning.

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
  randomChoice,
} from './practice-engine.js';
import { randomCompany, randomProduct } from './scenario-pools.js';

const BASE = import.meta.env.BASE_URL;

const CH_REVIEW = [
  { label: 'Ch. XX — Chapter Title', href: `${BASE}pages/learn/chXX.html` },
];

// ============================================================================
// Carry-forward annotation helper
// ----------------------------------------------------------------------------
// Use in showWork entries that depend on a prior step's correct value. When
// the student's earlier answer differs from the correct one, this returns
// an annotation string for the show-work entry's `annotation` field.
// ============================================================================

function carryForwardNote(stepId, label, prior, studentAnswers, formatter = (v) => `$${v.toLocaleString()}`) {
  const correct = prior[stepId];
  const student = studentAnswers[stepId];
  if (student === undefined) return null;
  if (typeof correct === 'string') {
    if (correct === student) return null;
    return `Using Step ${label}'s correct selection: ${correct} (your selection: ${student})`;
  }
  if (Math.abs(correct - student) <= 0.5) return null;
  return `Using Step ${label}'s correct value: ${formatter(correct)} (your answer: ${formatter(student)})`;
}

// ============================================================================
// Problem 1 — Foundation Problem Template
// ============================================================================

export const problemOne = {
  id: 'chXX-problem-one',
  title: 'Problem Title',
  chapter: 0, // <-- set to your chapter number
  difficulty: 'foundation', // 'foundation' | 'intermediate' | 'advanced'
  estimatedMinutes: 6,
  description:
    'Brief description shown on the picker tile under the title.',
  reviewChapters: CH_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    // Numeric inputs — use the helpers, not raw Math.random
    const someValue = randomInRange(40, 80, 1);
    const someAmount = roundToNearest(randomInRange(60000, 180000), 5000);

    // Enforce sensible constraints
    const constrained = ensureGreaterThan(randomInRange(10, 30), 5, 1);

    return {
      company, product,
      someValue, someAmount, constrained,
    };
  },

  // OPTIONAL — Pass 2 scenario field. Renders as prose card above given panel.
  // Use to weave randomized data into business narrative.
  scenario: (data) => `
    <p>${data.company.name} produces ${data.product.plural}. The relevant
    figures are <strong>$${data.someValue}</strong> per unit and
    <strong>$${data.someAmount.toLocaleString()}</strong> in fixed costs.</p>
  `,

  given: (data) => [
    { label: 'Some value', value: `$${data.someValue}` },
    { label: 'Some amount', value: `$${data.someAmount.toLocaleString()}` },
  ],

  steps: [
    // ------------------------------------------------------------------------
    // NUMERIC STEP TEMPLATE
    // ------------------------------------------------------------------------
    {
      id: 'numeric-step-id',
      question: 'What is the calculation result?',
      resultType: 'money-medium',
      // resultType options:
      //   'money-small'  — ±$1 absolute (CM per unit, prices under ~$100)
      //   'money-medium' — ±1% relative ($100 to $10,000)
      //   'money-large'  — ±0.5% relative (over $10,000)
      //   'units'        — ±1 absolute under 1,000, else ±0.5%
      //   'percent'      — ±0.5 percentage points (return whole-number form: 25, not 0.25)
      //   'years'        — ±0.1 years
      unit: '$', // Required for numeric steps; cosmetic only
      // tolerance: { value: 2, type: 'absolute' }, // Optional override
      solve: (data, prior) => {
        // Pure function — given same data + prior, must return same number
        // Use prior['earlier-step-id'] to reference earlier step's CORRECT value
        return data.someValue * 2;
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Calculation Label',
          formula: 'Plain-English Formula',
          values: `$${data.someValue} × 2`,
          result: `$${correctValue}`,
          highlight: true, // marks the headline result row
          // note: 'Optional pedagogical note shown below the row.',
          // annotation: carryForwardNote('earlier-step', '1', prior, studentAnswers),
        },
      ],
    },

    // ------------------------------------------------------------------------
    // CHOICE STEP TEMPLATE — interpretation/decision
    // ------------------------------------------------------------------------
    {
      id: 'choice-step-id',
      type: 'choice',
      question: 'Based on the analysis, what should the company do?',
      options: [
        { id: 'accept', label: 'Accept — positive contribution margin' },
        { id: 'reject', label: 'Reject — negative contribution margin' },
        // Add 2-4 plausible distractors. The correct answer should be a
        // function of the randomized data, never trivia.
      ],
      // For options that need to interpolate data into labels, use function form:
      // options: (data, prior) => [
      //   { id: 'accept', label: `Accept — produce ${data.product.plural}` },
      //   { id: 'reject', label: 'Reject — variable cost exceeds price' },
      // ],
      correctId: (data, prior) => {
        // Must be a function of data, not a constant
        return prior['numeric-step-id'] > 0 ? 'accept' : 'reject';
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Decision Rule',
          formula: 'Compare result to threshold',
          values: `Result = $${prior['numeric-step-id']}`,
          result: correctId === 'accept' ? 'Accept' : 'Reject',
          highlight: true,
          note: 'Explain WHY this is the right answer.',
        },
      ],
    },

    // ------------------------------------------------------------------------
    // INTENTIONAL SINGLE-ANSWER CHOICE TEMPLATE
    // Use when the lesson is recognizing a fixed truth, not computing
    // which option matches the data. Plausible distractors are required.
    // ------------------------------------------------------------------------
    {
      id: 'concept-recognition',
      type: 'choice',
      intentionalSingleAnswer: true, // Suppresses validator coverage warning
      question: 'Which is the most important characteristic of this concept?',
      options: [
        { id: 'correct-answer', label: 'The pedagogically correct answer' },
        { id: 'plausible-trap-1', label: 'A plausible misconception' },
        { id: 'plausible-trap-2', label: 'Another plausible misconception' },
        { id: 'plausible-trap-3', label: 'A third plausible misconception' },
      ],
      correctId: () => 'correct-answer', // Always the same
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Concept Recognition',
          formula: 'Why this answer is always correct',
          values: 'The reasoning that makes this fixed regardless of data.',
          result: 'The Correct Answer',
          highlight: true,
          note: 'Explain why the distractors are tempting but wrong.',
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Intermediate Problem (copy/modify structure above)
// ============================================================================

// export const problemTwo = { ... };

// ============================================================================
// Problem 3 — Advanced Problem (copy/modify structure above)
// ============================================================================

// export const problemThree = { ... };

// ============================================================================
// Export — Update array name to match chapter
// ============================================================================

export const chXXProblems = [
  problemOne,
  // problemTwo,
  // problemThree,
];
