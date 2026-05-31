// js/practice/ch07-problems.js
// Chapter 7 — Flexible Budgets and Direct-Cost Variances
// Pass 2 problems — pairs numeric magnitude calculations with choice steps
// for favorable/unfavorable interpretation (mirrors textbook variance reporting).
//
// Conforms to js/practice/SPEC.md (Pass 2).
// Five problems:
//   1. Direct Materials Variances (price + efficiency)
//   2. Direct Labor Variances (rate + efficiency)
//   3. Static vs Flexible Budget (variance decomposition)
//   4. Combined DM + DL (four variances, investigation prioritization)
//   5. Variance Investigation (pattern → operational cause)

import {
  randomInRange,
  roundToNearest,
  ensureGreaterThan,
} from './practice-engine.js';
import { randomCompany, randomProduct } from './scenario-pools.js';

const BASE = import.meta.env.BASE_URL;

const CH07_REVIEW = [
  { label: 'Ch. 7 — Flexible Budgets and Direct-Cost Variances', href: `${BASE}pages/learn/ch07.html` },
];

// ============================================================================
// Helper — carry-forward annotation (handles both numeric and string priors)
// ============================================================================

function carryForwardNote(stepId, label, prior, studentAnswers, formatter = (v) => `$${v}`) {
  const correct = prior[stepId];
  const student = studentAnswers[stepId];
  if (student === undefined) return null;
  if (typeof correct === 'string') {
    if (correct === student) return null;
    return `Using Step ${label}'s correct selection: ${correct} (your selection: ${student})`;
  }
  if (Math.abs(correct - student) <= 0.01) return null;
  return `Using Step ${label}'s correct value: ${formatter(correct)} (your answer: ${formatter(student)})`;
}

// ============================================================================
// Problem 1 — Direct Materials Variances
// ============================================================================

export const directMaterialsVariances = {
  id: 'ch07-dm-variances',
  title: 'Direct Materials Variances',
  chapter: 7,
  difficulty: 'foundation',
  estimatedMinutes: 7,
  description:
    'Compute direct materials price and efficiency variances, then mark each as favorable or unfavorable.',
  reviewChapters: CH07_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    const standardPrice = randomInRange(8, 20, 1);
    // Actual price within ±15% but at least $1 different
    const priceDeltaPct = randomInRange(-15, 15, 1);
    const actualPrice = ensureGreaterThan(
      Math.max(1, Math.round(standardPrice * (1 + priceDeltaPct / 100))),
      0,
      0,
    );
    const safeActualPrice = Math.abs(actualPrice - standardPrice) < 1
      ? standardPrice + (priceDeltaPct >= 0 ? 1 : -1)
      : actualPrice;

    const standardQtyPerUnit = randomInRange(2, 6, 1);
    const actualUnits = roundToNearest(randomInRange(800, 4000), 100);
    const standardQty = standardQtyPerUnit * actualUnits;

    // Actual quantity within ±8% but at least 3% off
    const qtyDeltaPct = randomInRange(-8, 8, 1);
    const minQtyDelta = Math.ceil(standardQty * 0.03);
    let actualQty = Math.round(standardQty * (1 + qtyDeltaPct / 100));
    if (Math.abs(actualQty - standardQty) < minQtyDelta) {
      actualQty = standardQty + (qtyDeltaPct >= 0 ? minQtyDelta : -minQtyDelta);
    }

    return {
      company, product,
      standardPrice, actualPrice: safeActualPrice,
      standardQtyPerUnit, actualUnits,
      standardQty, actualQty,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} budgeted <strong>${data.standardQtyPerUnit} pounds</strong>
    of direct material per ${data.product.singular} at a standard price of
    <strong>$${data.standardPrice} per pound</strong>. During the period the company
    produced <strong>${data.actualUnits.toLocaleString()} ${data.product.plural}</strong>,
    purchased and used <strong>${data.actualQty.toLocaleString()} pounds</strong> of
    material, and paid <strong>$${data.actualPrice} per pound</strong>.</p>
  `,

  given: (data) => [
    { label: 'Standard price per pound', value: `$${data.standardPrice}` },
    { label: 'Actual price per pound', value: `$${data.actualPrice}` },
    { label: 'Standard quantity per unit', value: `${data.standardQtyPerUnit} lbs` },
    { label: 'Actual units produced', value: `${data.actualUnits.toLocaleString()}` },
    { label: 'Standard quantity allowed', value: `${data.standardQty.toLocaleString()} lbs` },
    { label: 'Actual quantity used', value: `${data.actualQty.toLocaleString()} lbs` },
  ],

  steps: [
    {
      id: 'price-variance-amount',
      question: 'What is the magnitude of the direct materials price variance? (Enter as a positive number.)',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actualPrice - data.standardPrice) * data.actualQty),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DM Price Variance',
          formula: '(Actual Price − Standard Price) × Actual Quantity',
          values: `($${data.actualPrice} − $${data.standardPrice}) × ${data.actualQty.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'The price variance isolates the impact of paying more or less than standard for what was actually purchased.',
        },
      ],
    },
    {
      id: 'price-variance-direction',
      type: 'choice',
      question: 'Is the price variance favorable or unfavorable?',
      options: [
        { id: 'favorable', label: 'Favorable — paid less than standard' },
        { id: 'unfavorable', label: 'Unfavorable — paid more than standard' },
      ],
      correctId: (data) => data.actualPrice < data.standardPrice ? 'favorable' : 'unfavorable',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Direction',
          formula: 'Compare Actual Price to Standard Price',
          values: `$${data.actualPrice} ${data.actualPrice < data.standardPrice ? '<' : '>'} $${data.standardPrice}`,
          result: correctId === 'favorable' ? 'Favorable' : 'Unfavorable',
          highlight: true,
          note: 'For a cost variance, paying less than standard is favorable; paying more is unfavorable.',
        },
      ],
    },
    {
      id: 'efficiency-variance-amount',
      question: 'What is the magnitude of the direct materials efficiency variance? (Enter as a positive number.)',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actualQty - data.standardQty) * data.standardPrice),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DM Efficiency Variance',
          formula: '(Actual Quantity − Standard Quantity) × Standard Price',
          values: `(${data.actualQty.toLocaleString()} − ${data.standardQty.toLocaleString()}) × $${data.standardPrice}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'The efficiency variance isolates the impact of using more or less material than the standard allowed for actual output.',
        },
      ],
    },
    {
      id: 'efficiency-variance-direction',
      type: 'choice',
      question: 'Is the efficiency variance favorable or unfavorable?',
      options: [
        { id: 'favorable', label: 'Favorable — used less material than standard' },
        { id: 'unfavorable', label: 'Unfavorable — used more material than standard' },
      ],
      correctId: (data) => data.actualQty < data.standardQty ? 'favorable' : 'unfavorable',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Direction',
          formula: 'Compare Actual Quantity to Standard Quantity',
          values: `${data.actualQty.toLocaleString()} ${data.actualQty < data.standardQty ? '<' : '>'} ${data.standardQty.toLocaleString()}`,
          result: correctId === 'favorable' ? 'Favorable' : 'Unfavorable',
          highlight: true,
        },
      ],
    },
    {
      id: 'total-dm-variance',
      question: 'What is the total direct materials flexible-budget variance? (Enter as a positive number representing the net dollar effect.)',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => {
        const priceVar = (data.actualPrice - data.standardPrice) * data.actualQty;
        const effVar = (data.actualQty - data.standardQty) * data.standardPrice;
        return Math.abs(priceVar + effVar);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const priceVar = (data.actualPrice - data.standardPrice) * data.actualQty;
        const effVar = (data.actualQty - data.standardQty) * data.standardPrice;
        const net = priceVar + effVar;
        return [
          {
            label: 'Signed Price Variance',
            formula: '(AP − SP) × AQ',
            values: `($${data.actualPrice} − $${data.standardPrice}) × ${data.actualQty.toLocaleString()}`,
            result: `${priceVar >= 0 ? '+' : ''}$${priceVar.toLocaleString()} (${priceVar > 0 ? 'U' : priceVar < 0 ? 'F' : '—'})`,
          },
          {
            label: 'Signed Efficiency Variance',
            formula: '(AQ − SQ) × SP',
            values: `(${data.actualQty.toLocaleString()} − ${data.standardQty.toLocaleString()}) × $${data.standardPrice}`,
            result: `${effVar >= 0 ? '+' : ''}$${effVar.toLocaleString()} (${effVar > 0 ? 'U' : effVar < 0 ? 'F' : '—'})`,
          },
          {
            label: 'Total DM Flex-Budget Variance',
            formula: 'Price Variance + Efficiency Variance',
            values: `${priceVar >= 0 ? '+' : ''}$${priceVar.toLocaleString()} ${effVar >= 0 ? '+' : ''}$${effVar.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()} ${net > 0 ? '(Unfavorable)' : net < 0 ? '(Favorable)' : ''}`,
            highlight: true,
            note: 'Price and efficiency variances together explain the entire flexible-budget variance for materials.',
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Problem 2 — Direct Labor Variances
// ============================================================================

export const directLaborVariances = {
  id: 'ch07-dl-variances',
  title: 'Direct Labor Variances',
  chapter: 7,
  difficulty: 'foundation',
  estimatedMinutes: 7,
  description:
    'Compute direct labor rate and efficiency variances, then mark each as favorable or unfavorable.',
  reviewChapters: CH07_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    const standardRate = randomInRange(18, 32, 1);
    const rateDeltaPct = randomInRange(-12, 12, 1);
    let actualRate = Math.max(1, Math.round(standardRate * (1 + rateDeltaPct / 100)));
    if (Math.abs(actualRate - standardRate) < 1) {
      actualRate = standardRate + (rateDeltaPct >= 0 ? 1 : -1);
    }

    const standardHoursPerUnit = randomInRange(2, 5, 1);
    const actualUnits = roundToNearest(randomInRange(600, 3000), 100);
    const standardHours = standardHoursPerUnit * actualUnits;

    const hoursDeltaPct = randomInRange(-10, 10, 1);
    const minHoursDelta = Math.ceil(standardHours * 0.03);
    let actualHours = Math.round(standardHours * (1 + hoursDeltaPct / 100));
    if (Math.abs(actualHours - standardHours) < minHoursDelta) {
      actualHours = standardHours + (hoursDeltaPct >= 0 ? minHoursDelta : -minHoursDelta);
    }

    return {
      company, product,
      standardRate, actualRate,
      standardHoursPerUnit, actualUnits,
      standardHours, actualHours,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} budgeted <strong>${data.standardHoursPerUnit} direct labor hours</strong>
    per ${data.product.singular} at a standard rate of <strong>$${data.standardRate} per hour</strong>.
    During the period the company produced <strong>${data.actualUnits.toLocaleString()} ${data.product.plural}</strong>,
    worked <strong>${data.actualHours.toLocaleString()} actual labor hours</strong>, and paid workers
    an average of <strong>$${data.actualRate} per hour</strong>.</p>
  `,

  given: (data) => [
    { label: 'Standard rate per hour', value: `$${data.standardRate}` },
    { label: 'Actual rate per hour', value: `$${data.actualRate}` },
    { label: 'Standard hours per unit', value: `${data.standardHoursPerUnit} hrs` },
    { label: 'Actual units produced', value: `${data.actualUnits.toLocaleString()}` },
    { label: 'Standard hours allowed', value: `${data.standardHours.toLocaleString()} hrs` },
    { label: 'Actual hours worked', value: `${data.actualHours.toLocaleString()} hrs` },
  ],

  steps: [
    {
      id: 'rate-variance-amount',
      question: 'What is the magnitude of the direct labor rate variance? (Enter as a positive number.)',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actualRate - data.standardRate) * data.actualHours),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DL Rate Variance',
          formula: '(Actual Rate − Standard Rate) × Actual Hours',
          values: `($${data.actualRate} − $${data.standardRate}) × ${data.actualHours.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'The rate variance isolates the impact of paying more or less than standard for hours actually worked.',
        },
      ],
    },
    {
      id: 'rate-variance-direction',
      type: 'choice',
      question: 'Is the labor rate variance favorable or unfavorable?',
      options: [
        { id: 'favorable', label: 'Favorable — paid less than standard rate' },
        { id: 'unfavorable', label: 'Unfavorable — paid more than standard rate' },
      ],
      correctId: (data) => data.actualRate < data.standardRate ? 'favorable' : 'unfavorable',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Direction',
          formula: 'Compare Actual Rate to Standard Rate',
          values: `$${data.actualRate} ${data.actualRate < data.standardRate ? '<' : '>'} $${data.standardRate}`,
          result: correctId === 'favorable' ? 'Favorable' : 'Unfavorable',
          highlight: true,
        },
      ],
    },
    {
      id: 'efficiency-variance-amount',
      question: 'What is the magnitude of the direct labor efficiency variance? (Enter as a positive number.)',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actualHours - data.standardHours) * data.standardRate),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DL Efficiency Variance',
          formula: '(Actual Hours − Standard Hours) × Standard Rate',
          values: `(${data.actualHours.toLocaleString()} − ${data.standardHours.toLocaleString()}) × $${data.standardRate}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'The efficiency variance isolates the impact of using more or fewer hours than the standard allowed for actual output.',
        },
      ],
    },
    {
      id: 'efficiency-variance-direction',
      type: 'choice',
      question: 'Is the labor efficiency variance favorable or unfavorable?',
      options: [
        { id: 'favorable', label: 'Favorable — used fewer hours than standard' },
        { id: 'unfavorable', label: 'Unfavorable — used more hours than standard' },
      ],
      correctId: (data) => data.actualHours < data.standardHours ? 'favorable' : 'unfavorable',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Direction',
          formula: 'Compare Actual Hours to Standard Hours',
          values: `${data.actualHours.toLocaleString()} ${data.actualHours < data.standardHours ? '<' : '>'} ${data.standardHours.toLocaleString()}`,
          result: correctId === 'favorable' ? 'Favorable' : 'Unfavorable',
          highlight: true,
        },
      ],
    },
    {
      id: 'total-dl-variance',
      question: 'What is the total direct labor flexible-budget variance? (Enter as a positive number.)',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => {
        const rateVar = (data.actualRate - data.standardRate) * data.actualHours;
        const effVar = (data.actualHours - data.standardHours) * data.standardRate;
        return Math.abs(rateVar + effVar);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const rateVar = (data.actualRate - data.standardRate) * data.actualHours;
        const effVar = (data.actualHours - data.standardHours) * data.standardRate;
        const net = rateVar + effVar;
        return [
          {
            label: 'Signed Rate Variance',
            formula: '(AR − SR) × AH',
            values: `($${data.actualRate} − $${data.standardRate}) × ${data.actualHours.toLocaleString()}`,
            result: `${rateVar >= 0 ? '+' : ''}$${rateVar.toLocaleString()} (${rateVar > 0 ? 'U' : rateVar < 0 ? 'F' : '—'})`,
          },
          {
            label: 'Signed Efficiency Variance',
            formula: '(AH − SH) × SR',
            values: `(${data.actualHours.toLocaleString()} − ${data.standardHours.toLocaleString()}) × $${data.standardRate}`,
            result: `${effVar >= 0 ? '+' : ''}$${effVar.toLocaleString()} (${effVar > 0 ? 'U' : effVar < 0 ? 'F' : '—'})`,
          },
          {
            label: 'Total DL Flex-Budget Variance',
            formula: 'Rate Variance + Efficiency Variance',
            values: `${rateVar >= 0 ? '+' : ''}$${rateVar.toLocaleString()} ${effVar >= 0 ? '+' : ''}$${effVar.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()} ${net > 0 ? '(Unfavorable)' : net < 0 ? '(Favorable)' : ''}`,
            highlight: true,
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Problem 3 — Static vs Flexible Budget
// ============================================================================

export const staticVsFlexibleBudget = {
  id: 'ch07-static-vs-flex',
  title: 'Static vs Flexible Budget',
  chapter: 7,
  difficulty: 'intermediate',
  estimatedMinutes: 9,
  description:
    'Decompose the static-budget variance into the flexible-budget variance and the sales-volume variance.',
  reviewChapters: CH07_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    const budgetedUnits = roundToNearest(randomInRange(8000, 15000), 500);
    // Actual volume meaningfully different (5-20%)
    const volumeDeltaPct = randomInRange(-20, 20, 1);
    const minDelta = Math.ceil(budgetedUnits * 0.05);
    let actualUnits = Math.round(budgetedUnits * (1 + volumeDeltaPct / 100));
    if (Math.abs(actualUnits - budgetedUnits) < minDelta) {
      actualUnits = budgetedUnits + (volumeDeltaPct >= 0 ? minDelta : -minDelta);
    }
    actualUnits = roundToNearest(actualUnits, 500);

    const variableCostPerUnit = randomInRange(6, 12, 1);
    const fixedCost = roundToNearest(randomInRange(300000, 500000), 10000);

    // Actual costs: variable per unit slightly off standard, fixed slightly off
    const vcDelta = randomInRange(-1, 1, 1);
    const actualVCPerUnit = Math.max(1, variableCostPerUnit + vcDelta);
    const actualVariableCost = actualVCPerUnit * actualUnits;
    const fixedDelta = roundToNearest(randomInRange(-20000, 20000), 1000);
    const actualFixedCost = fixedCost + fixedDelta;

    return {
      company, product,
      budgetedUnits, actualUnits,
      variableCostPerUnit, actualVCPerUnit, actualVariableCost,
      fixedCost, actualFixedCost,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} budgeted production of
    <strong>${data.budgetedUnits.toLocaleString()} ${data.product.plural}</strong> at a
    standard variable cost of <strong>$${data.variableCostPerUnit} per unit</strong> and
    total fixed costs of <strong>$${data.fixedCost.toLocaleString()}</strong>. Actual
    production was <strong>${data.actualUnits.toLocaleString()} ${data.product.plural}</strong>
    with actual variable costs of <strong>$${data.actualVariableCost.toLocaleString()}</strong>
    and actual fixed costs of <strong>$${data.actualFixedCost.toLocaleString()}</strong>.</p>
  `,

  given: (data) => [
    { label: 'Budgeted units', value: `${data.budgetedUnits.toLocaleString()}` },
    { label: 'Actual units', value: `${data.actualUnits.toLocaleString()}` },
    { label: 'Standard variable cost per unit', value: `$${data.variableCostPerUnit}` },
    { label: 'Budgeted fixed cost', value: `$${data.fixedCost.toLocaleString()}` },
    { label: 'Actual variable cost', value: `$${data.actualVariableCost.toLocaleString()}` },
    { label: 'Actual fixed cost', value: `$${data.actualFixedCost.toLocaleString()}` },
  ],

  steps: [
    {
      id: 'flex-budget-variable',
      question: 'What is the flexible-budget amount for variable costs at actual volume?',
      resultType: 'money-large',
      unit: '$',
      solve: (data) => data.variableCostPerUnit * data.actualUnits,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Flexible Budget — Variable Costs',
          formula: 'Standard VC per Unit × Actual Units',
          values: `$${data.variableCostPerUnit} × ${data.actualUnits.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'The flexible budget restates the budget at the actual volume, isolating cost performance from volume effects.',
        },
      ],
    },
    {
      id: 'flex-variance-amount',
      question: 'What is the magnitude of the total flexible-budget variance (variable + fixed)? (Enter as a positive number.)',
      resultType: 'money-large',
      unit: '$',
      solve: (data, prior) => {
        const vcVariance = data.actualVariableCost - prior['flex-budget-variable'];
        const fixedVariance = data.actualFixedCost - data.fixedCost;
        return Math.abs(vcVariance + fixedVariance);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const vcVariance = data.actualVariableCost - prior['flex-budget-variable'];
        const fixedVariance = data.actualFixedCost - data.fixedCost;
        const total = vcVariance + fixedVariance;
        return [
          {
            label: 'Variable Cost Variance',
            formula: 'Actual VC − Flex Budget VC',
            values: `$${data.actualVariableCost.toLocaleString()} − $${prior['flex-budget-variable'].toLocaleString()}`,
            result: `${vcVariance >= 0 ? '+' : ''}$${vcVariance.toLocaleString()}`,
          },
          {
            label: 'Fixed Cost Variance',
            formula: 'Actual Fixed − Budgeted Fixed',
            values: `$${data.actualFixedCost.toLocaleString()} − $${data.fixedCost.toLocaleString()}`,
            result: `${fixedVariance >= 0 ? '+' : ''}$${fixedVariance.toLocaleString()}`,
          },
          {
            label: 'Total Flexible-Budget Variance',
            formula: 'VC Variance + Fixed Variance',
            values: `${vcVariance >= 0 ? '+' : ''}$${vcVariance.toLocaleString()} ${fixedVariance >= 0 ? '+' : ''}$${fixedVariance.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()} ${total > 0 ? '(Unfavorable)' : total < 0 ? '(Favorable)' : ''}`,
            highlight: true,
            annotation: carryForwardNote('flex-budget-variable', '1', prior, studentAnswers, (v) => `$${v.toLocaleString()}`),
          },
        ];
      },
    },
    {
      id: 'flex-variance-direction',
      type: 'choice',
      question: 'Is the total flexible-budget variance favorable or unfavorable?',
      options: [
        { id: 'favorable', label: 'Favorable — actual costs lower than flexible budget' },
        { id: 'unfavorable', label: 'Unfavorable — actual costs higher than flexible budget' },
      ],
      correctId: (data, prior) => {
        const vcVariance = data.actualVariableCost - prior['flex-budget-variable'];
        const fixedVariance = data.actualFixedCost - data.fixedCost;
        return (vcVariance + fixedVariance) < 0 ? 'favorable' : 'unfavorable';
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Direction',
          formula: 'Compare actual costs to flexible-budget costs',
          values: correctId === 'favorable' ? 'Actual < Flex Budget' : 'Actual > Flex Budget',
          result: correctId === 'favorable' ? 'Favorable' : 'Unfavorable',
          highlight: true,
          note: 'The flexible-budget variance reflects cost performance independent of volume — it measures whether you controlled costs at the volume you actually ran.',
        },
      ],
    },
    {
      id: 'volume-variance-amount',
      question: 'What is the magnitude of the sales-volume variance (in cost terms)? (Enter as a positive number.)',
      resultType: 'money-large',
      unit: '$',
      solve: (data, prior) => Math.abs(
        prior['flex-budget-variable'] - (data.variableCostPerUnit * data.budgetedUnits)
      ),
      showWork: (data, prior, studentAnswers, correctValue) => {
        const staticBudgetVC = data.variableCostPerUnit * data.budgetedUnits;
        const volumeVar = prior['flex-budget-variable'] - staticBudgetVC;
        return [
          {
            label: 'Static-Budget Variable Costs',
            formula: 'Standard VC × Budgeted Units',
            values: `$${data.variableCostPerUnit} × ${data.budgetedUnits.toLocaleString()}`,
            result: `$${staticBudgetVC.toLocaleString()}`,
          },
          {
            label: 'Sales-Volume Variance (Cost)',
            formula: 'Flex Budget VC − Static Budget VC',
            values: `$${prior['flex-budget-variable'].toLocaleString()} − $${staticBudgetVC.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()} ${volumeVar > 0 ? '(Unfavorable cost effect from higher volume)' : volumeVar < 0 ? '(Favorable cost effect from lower volume)' : ''}`,
            highlight: true,
            note: 'Fixed costs do not flex with volume, so the entire sales-volume variance comes from variable costs.',
          },
        ];
      },
    },
    {
      id: 'volume-variance-direction',
      type: 'choice',
      question: 'For the sales-volume variance in cost terms, is the effect favorable or unfavorable?',
      options: [
        { id: 'favorable', label: 'Favorable — produced fewer units than budgeted (lower variable cost)' },
        { id: 'unfavorable', label: 'Unfavorable — produced more units than budgeted (higher variable cost)' },
      ],
      correctId: (data) => data.actualUnits < data.budgetedUnits ? 'favorable' : 'unfavorable',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Direction',
          formula: 'Compare Actual Volume to Budgeted Volume',
          values: `${data.actualUnits.toLocaleString()} ${data.actualUnits < data.budgetedUnits ? '<' : '>'} ${data.budgetedUnits.toLocaleString()}`,
          result: correctId === 'favorable' ? 'Favorable (cost terms only)' : 'Unfavorable (cost terms only)',
          highlight: true,
          note: 'Important: a "favorable" cost variance from producing fewer units is NOT good news — selling fewer units means lower contribution margin, which usually swamps the cost savings. The cost variance only reflects the cost line.',
        },
      ],
    },
    {
      id: 'static-variance-amount',
      question: 'What is the magnitude of the total static-budget variance? (Enter as a positive number.)',
      resultType: 'money-large',
      unit: '$',
      solve: (data, prior) => {
        const totalActual = data.actualVariableCost + data.actualFixedCost;
        const totalStatic = (data.variableCostPerUnit * data.budgetedUnits) + data.fixedCost;
        return Math.abs(totalActual - totalStatic);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const totalActual = data.actualVariableCost + data.actualFixedCost;
        const totalStatic = (data.variableCostPerUnit * data.budgetedUnits) + data.fixedCost;
        const staticVar = totalActual - totalStatic;
        return [
          {
            label: 'Total Actual Cost',
            formula: 'Actual VC + Actual Fixed',
            values: `$${data.actualVariableCost.toLocaleString()} + $${data.actualFixedCost.toLocaleString()}`,
            result: `$${totalActual.toLocaleString()}`,
          },
          {
            label: 'Total Static-Budget Cost',
            formula: '(Standard VC × Budgeted Units) + Budgeted Fixed',
            values: `$${(data.variableCostPerUnit * data.budgetedUnits).toLocaleString()} + $${data.fixedCost.toLocaleString()}`,
            result: `$${totalStatic.toLocaleString()}`,
          },
          {
            label: 'Static-Budget Variance',
            formula: 'Actual − Static Budget',
            values: `$${totalActual.toLocaleString()} − $${totalStatic.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()} ${staticVar > 0 ? '(Unfavorable)' : staticVar < 0 ? '(Favorable)' : ''}`,
            highlight: true,
            note: 'The static-budget variance = flexible-budget variance + sales-volume variance. It mixes cost performance and volume effects, which is why decomposing it is essential.',
          },
        ];
      },
    },
    {
      id: 'static-variance-direction',
      type: 'choice',
      question: 'Is the total static-budget variance favorable or unfavorable?',
      options: [
        { id: 'favorable', label: 'Favorable — actual total cost less than static budget' },
        { id: 'unfavorable', label: 'Unfavorable — actual total cost greater than static budget' },
      ],
      correctId: (data) => {
        const totalActual = data.actualVariableCost + data.actualFixedCost;
        const totalStatic = (data.variableCostPerUnit * data.budgetedUnits) + data.fixedCost;
        return totalActual < totalStatic ? 'favorable' : 'unfavorable';
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Direction',
          formula: 'Compare Total Actual to Total Static Budget',
          values: correctId === 'favorable' ? 'Total Actual < Total Static' : 'Total Actual > Total Static',
          result: correctId === 'favorable' ? 'Favorable' : 'Unfavorable',
          highlight: true,
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — Combined DM + DL (Investigation Prioritization)
// ============================================================================

export const combinedDirectVariances = {
  id: 'ch07-combined-variances',
  title: 'Combined DM + DL Variances',
  chapter: 7,
  difficulty: 'intermediate',
  estimatedMinutes: 9,
  description:
    'Compute all four direct-cost variances and identify which deserves investigation priority based on magnitude.',
  reviewChapters: CH07_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    // DM
    const stdPrice = randomInRange(10, 18, 1);
    const priceDelta = randomInRange(-12, 12, 1);
    let actPrice = Math.max(1, Math.round(stdPrice * (1 + priceDelta / 100)));
    if (Math.abs(actPrice - stdPrice) < 1) actPrice = stdPrice + (priceDelta >= 0 ? 1 : -1);

    const actualUnits = roundToNearest(randomInRange(1000, 3000), 100);
    const stdQtyPerUnit = randomInRange(3, 5, 1);
    const stdQty = stdQtyPerUnit * actualUnits;
    const qtyDelta = randomInRange(-8, 8, 1);
    const minQtyDelta = Math.ceil(stdQty * 0.03);
    let actQty = Math.round(stdQty * (1 + qtyDelta / 100));
    if (Math.abs(actQty - stdQty) < minQtyDelta) actQty = stdQty + (qtyDelta >= 0 ? minQtyDelta : -minQtyDelta);

    // DL
    const stdRate = randomInRange(20, 30, 1);
    const rateDelta = randomInRange(-10, 10, 1);
    let actRate = Math.max(1, Math.round(stdRate * (1 + rateDelta / 100)));
    if (Math.abs(actRate - stdRate) < 1) actRate = stdRate + (rateDelta >= 0 ? 1 : -1);

    const stdHrsPerUnit = randomInRange(2, 4, 1);
    const stdHrs = stdHrsPerUnit * actualUnits;
    const hrsDelta = randomInRange(-8, 8, 1);
    const minHrsDelta = Math.ceil(stdHrs * 0.03);
    let actHrs = Math.round(stdHrs * (1 + hrsDelta / 100));
    if (Math.abs(actHrs - stdHrs) < minHrsDelta) actHrs = stdHrs + (hrsDelta >= 0 ? minHrsDelta : -minHrsDelta);

    return {
      company, product,
      stdPrice, actPrice, stdQty, actQty, actualUnits, stdQtyPerUnit,
      stdRate, actRate, stdHrs, actHrs, stdHrsPerUnit,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} produced <strong>${data.actualUnits.toLocaleString()} ${data.product.plural}</strong>.
    Standard direct materials cost is <strong>${data.stdQtyPerUnit} lbs at $${data.stdPrice}/lb</strong> per unit;
    standard direct labor cost is <strong>${data.stdHrsPerUnit} hours at $${data.stdRate}/hr</strong> per unit.
    Actual results: <strong>${data.actQty.toLocaleString()} lbs used at $${data.actPrice}/lb</strong> and
    <strong>${data.actHrs.toLocaleString()} hours worked at $${data.actRate}/hr</strong>.</p>
  `,

  given: (data) => [
    { label: 'Actual units', value: `${data.actualUnits.toLocaleString()}` },
    { label: 'DM: std $/lb · actual $/lb', value: `$${data.stdPrice} · $${data.actPrice}` },
    { label: 'DM: std lbs · actual lbs', value: `${data.stdQty.toLocaleString()} · ${data.actQty.toLocaleString()}` },
    { label: 'DL: std $/hr · actual $/hr', value: `$${data.stdRate} · $${data.actRate}` },
    { label: 'DL: std hrs · actual hrs', value: `${data.stdHrs.toLocaleString()} · ${data.actHrs.toLocaleString()}` },
  ],

  steps: [
    {
      id: 'dm-price-var',
      question: 'What is the magnitude of the DM price variance?',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actPrice - data.stdPrice) * data.actQty),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DM Price Variance',
          formula: '(AP − SP) × AQ',
          values: `($${data.actPrice} − $${data.stdPrice}) × ${data.actQty.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()} (${data.actPrice > data.stdPrice ? 'U' : 'F'})`,
          highlight: true,
        },
      ],
    },
    {
      id: 'dm-eff-var',
      question: 'What is the magnitude of the DM efficiency variance?',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actQty - data.stdQty) * data.stdPrice),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DM Efficiency Variance',
          formula: '(AQ − SQ) × SP',
          values: `(${data.actQty.toLocaleString()} − ${data.stdQty.toLocaleString()}) × $${data.stdPrice}`,
          result: `$${correctValue.toLocaleString()} (${data.actQty > data.stdQty ? 'U' : 'F'})`,
          highlight: true,
        },
      ],
    },
    {
      id: 'dl-rate-var',
      question: 'What is the magnitude of the DL rate variance?',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actRate - data.stdRate) * data.actHrs),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DL Rate Variance',
          formula: '(AR − SR) × AH',
          values: `($${data.actRate} − $${data.stdRate}) × ${data.actHrs.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()} (${data.actRate > data.stdRate ? 'U' : 'F'})`,
          highlight: true,
        },
      ],
    },
    {
      id: 'dl-eff-var',
      question: 'What is the magnitude of the DL efficiency variance?',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actHrs - data.stdHrs) * data.stdRate),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DL Efficiency Variance',
          formula: '(AH − SH) × SR',
          values: `(${data.actHrs.toLocaleString()} − ${data.stdHrs.toLocaleString()}) × $${data.stdRate}`,
          result: `$${correctValue.toLocaleString()} (${data.actHrs > data.stdHrs ? 'U' : 'F'})`,
          highlight: true,
        },
      ],
    },
    {
      id: 'largest-variance',
      type: 'choice',
      question: 'Which variance has the largest magnitude and should be investigated first?',
      options: (data, prior) => [
        { id: 'dm-price', label: `DM Price Variance ($${(prior['dm-price-var'] || 0).toLocaleString()})` },
        { id: 'dm-eff', label: `DM Efficiency Variance ($${(prior['dm-eff-var'] || 0).toLocaleString()})` },
        { id: 'dl-rate', label: `DL Rate Variance ($${(prior['dl-rate-var'] || 0).toLocaleString()})` },
        { id: 'dl-eff', label: `DL Efficiency Variance ($${(prior['dl-eff-var'] || 0).toLocaleString()})` },
      ],
      correctId: (data, prior) => {
        const variances = [
          { id: 'dm-price', amount: prior['dm-price-var'] },
          { id: 'dm-eff', amount: prior['dm-eff-var'] },
          { id: 'dl-rate', amount: prior['dl-rate-var'] },
          { id: 'dl-eff', amount: prior['dl-eff-var'] },
        ];
        return variances.reduce((max, v) => v.amount > max.amount ? v : max).id;
      },
      showWork: (data, prior, studentAnswers, correctId) => {
        const variances = [
          { id: 'dm-price', label: 'DM Price', amount: prior['dm-price-var'] },
          { id: 'dm-eff', label: 'DM Efficiency', amount: prior['dm-eff-var'] },
          { id: 'dl-rate', label: 'DL Rate', amount: prior['dl-rate-var'] },
          { id: 'dl-eff', label: 'DL Efficiency', amount: prior['dl-eff-var'] },
        ];
        const sorted = [...variances].sort((a, b) => b.amount - a.amount);
        return [
          {
            label: 'Variance Magnitudes (Ranked)',
            formula: 'Compare absolute dollar amounts',
            values: sorted.map(v => `${v.label}: $${v.amount.toLocaleString()}`).join(' · '),
            result: `Largest: ${sorted[0].label} ($${sorted[0].amount.toLocaleString()})`,
            highlight: true,
            note: 'Management by exception: investigate the largest variances first, since they have the greatest impact and likely the clearest underlying causes. Direction (F/U) matters less than magnitude for prioritization.',
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Problem 5 — Variance Investigation (Pattern Recognition)
// ============================================================================

export const varianceInvestigation = {
  id: 'ch07-variance-investigation',
  title: 'Variance Investigation',
  chapter: 7,
  difficulty: 'intermediate',
  estimatedMinutes: 6,
  description:
    'Given a pattern of direct materials variances, identify the most likely operational cause.',
  reviewChapters: CH07_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    const stdPrice = randomInRange(10, 20, 1);
    const stdQtyPerUnit = randomInRange(3, 6, 1);
    const actualUnits = roundToNearest(randomInRange(1500, 4000), 100);
    const stdQty = stdQtyPerUnit * actualUnits;

    // Pick a deliberate direction pattern
    const dmPriceFav = Math.random() < 0.5; // true → AP < SP
    const dmEffFav = Math.random() < 0.5;   // true → AQ < SQ

    const priceDelta = randomInRange(8, 15, 1);
    const actPrice = dmPriceFav
      ? Math.max(1, Math.round(stdPrice * (1 - priceDelta / 100)))
      : Math.round(stdPrice * (1 + priceDelta / 100));

    const qtyDelta = randomInRange(5, 12, 1);
    const actQty = dmEffFav
      ? Math.round(stdQty * (1 - qtyDelta / 100))
      : Math.round(stdQty * (1 + qtyDelta / 100));

    return {
      company, product,
      stdPrice, actPrice, stdQty, actQty, stdQtyPerUnit, actualUnits,
      dmPriceFav, dmEffFav,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} produced <strong>${data.actualUnits.toLocaleString()} ${data.product.plural}</strong>
    using <strong>${data.actQty.toLocaleString()} lbs</strong> of direct material purchased at
    <strong>$${data.actPrice}/lb</strong>. Standards call for <strong>${data.stdQtyPerUnit} lbs at
    $${data.stdPrice}/lb</strong> per unit. The plant manager has asked the analyst to identify
    the most likely cause of the variance pattern.</p>
  `,

  given: (data) => [
    { label: 'Standard price', value: `$${data.stdPrice}/lb` },
    { label: 'Actual price', value: `$${data.actPrice}/lb` },
    { label: 'Standard quantity', value: `${data.stdQty.toLocaleString()} lbs` },
    { label: 'Actual quantity', value: `${data.actQty.toLocaleString()} lbs` },
  ],

  steps: [
    {
      id: 'price-variance',
      question: 'What is the magnitude of the DM price variance?',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actPrice - data.stdPrice) * data.actQty),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DM Price Variance',
          formula: '(AP − SP) × AQ',
          values: `($${data.actPrice} − $${data.stdPrice}) × ${data.actQty.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()} (${data.dmPriceFav ? 'F' : 'U'})`,
          highlight: true,
        },
      ],
    },
    {
      id: 'eff-variance',
      question: 'What is the magnitude of the DM efficiency variance?',
      resultType: 'money-medium',
      unit: '$',
      solve: (data) => Math.abs((data.actQty - data.stdQty) * data.stdPrice),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'DM Efficiency Variance',
          formula: '(AQ − SQ) × SP',
          values: `(${data.actQty.toLocaleString()} − ${data.stdQty.toLocaleString()}) × $${data.stdPrice}`,
          result: `$${correctValue.toLocaleString()} (${data.dmEffFav ? 'F' : 'U'})`,
          highlight: true,
        },
      ],
    },
    {
      id: 'likely-cause',
      type: 'choice',
      question: 'Based on the variance pattern (price direction + efficiency direction), what is the most plausible operational cause?',
      options: (data, prior) => [
        {
          id: 'cheap-material',
          label: 'Purchasing bought lower-grade material at a discount, causing more waste in production',
        },
        {
          id: 'premium-material',
          label: 'Production switched to a premium material — more expensive but easier to work with and less waste',
        },
        {
          id: 'negotiated-discount',
          label: 'Purchasing negotiated better terms with the existing supplier; production usage was unchanged',
        },
        {
          id: 'inflation-and-inexperience',
          label: 'Industry-wide price inflation raised material costs and new worker inexperience led to more waste',
        },
      ],
      correctId: (data) => {
        if (data.dmPriceFav && data.dmEffFav) return 'negotiated-discount';
        if (data.dmPriceFav && !data.dmEffFav) return 'cheap-material';
        if (!data.dmPriceFav && data.dmEffFav) return 'premium-material';
        return 'inflation-and-inexperience';
      },
      showWork: (data, prior, studentAnswers, correctId) => {
        const pattern = `${data.dmPriceFav ? 'Favorable' : 'Unfavorable'} price, ${data.dmEffFav ? 'Favorable' : 'Unfavorable'} efficiency`;
        const causes = {
          'negotiated-discount': 'Both variances favorable → cleanest story is a supplier-side win with no operational disruption',
          'cheap-material': 'Favorable price + unfavorable efficiency → classic "false economy" pattern. Cheap material saves on purchasing but wastes more in production. The net effect is often unfavorable.',
          'premium-material': 'Unfavorable price + favorable efficiency → premium-material trade-off. Pay more per pound but use less of it. Net effect depends on whether the efficiency gain offsets the price premium.',
          'inflation-and-inexperience': 'Both unfavorable → likely two independent issues. Supply-side inflation plus a production-side issue (training, equipment, process change).',
        };
        return [
          {
            label: 'Pattern Identified',
            formula: 'Match price direction × efficiency direction to operational story',
            values: pattern,
            result: causes[correctId],
            highlight: true,
            note: 'In practice, the variance pattern is a diagnostic starting point, not a conclusion. Real investigation requires talking to purchasing, production, and quality control to confirm the hypothesis.',
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Export all problems
// ============================================================================

export const ch07Problems = [
  directMaterialsVariances,
  directLaborVariances,
  staticVsFlexibleBudget,
  combinedDirectVariances,
  varianceInvestigation,
];
