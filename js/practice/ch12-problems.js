// js/practice/ch12-problems.js
// Chapter 12 — Decision Making and Relevant Information
// Pass 2 problems — exercises scenario() narrative + choice steps.
//
// Conforms to js/practice/SPEC.md (Pass 2).
// Five problems covering the core relevant-cost decision framework:
//   1. Special Order — Unconstrained Capacity
//   2. Make-or-Buy
//   3. Drop-or-Keep Segment
//   4. Equipment Replacement (sunk cost)
//   5. Product Mix with Constrained Resource

import {
  randomInRange,
  roundToNearest,
  ensureGreaterThan,
} from './practice-engine.js';
import { randomCompany, randomProduct } from './scenario-pools.js';

const BASE = import.meta.env.BASE_URL;

const CH12_REVIEW = [
  { label: 'Ch. 12 — Decision Making and Relevant Information', href: `${BASE}pages/learn/ch12.html` },
];

// ============================================================================
// Helper — carry-forward annotation, extended for choice-step priors (strings)
// ============================================================================

function carryForwardNote(stepId, label, prior, studentAnswers, formatter = (v) => `$${v}`) {
  const correct = prior[stepId];
  const student = studentAnswers[stepId];
  if (student === undefined) return null;
  // For choice priors (strings), compare directly
  if (typeof correct === 'string') {
    if (correct === student) return null;
    return `Using Step ${label}'s correct selection: ${correct} (your selection: ${student})`;
  }
  // Numeric prior
  if (Math.abs(correct - student) <= 0.01) return null;
  return `Using Step ${label}'s correct value: ${formatter(correct)} (your answer: ${formatter(student)})`;
}

// ============================================================================
// Problem 1 — Special Order, Unconstrained Capacity
// ============================================================================

export const specialOrderUnconstrained = {
  id: 'ch12-special-order-unconstrained',
  title: 'Special Order — Unconstrained Capacity',
  chapter: 12,
  difficulty: 'foundation',
  estimatedMinutes: 7,
  description:
    'A one-time special order arrives at a price below full cost. Decide whether to accept when capacity is available.',
  reviewChapters: CH12_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    const price = randomInRange(80, 140, 1);
    const directMaterials = randomInRange(15, 30, 1);
    const directLabor = randomInRange(15, 30, 1);
    const variableOH = randomInRange(8, 18, 1);
    const variableCost = directMaterials + directLabor + variableOH;
    const fixedMfgPerUnit = randomInRange(12, 25, 1);
    const fullCost = variableCost + fixedMfgPerUnit;

    const specialUnits = roundToNearest(randomInRange(500, 2000), 50);
    // Special price below full cost but meaningfully above variable cost
    const specialPrice = ensureGreaterThan(
      Math.round(variableCost + (fullCost - variableCost) * (randomInRange(20, 70, 1) / 100)),
      variableCost,
      3,
    );

    return {
      company, product,
      price, directMaterials, directLabor, variableOH, variableCost,
      fixedMfgPerUnit, fullCost,
      specialUnits, specialPrice,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} produces a single ${data.product.singular} that normally
    sells for <strong>$${data.price}</strong>. Per-unit manufacturing costs are
    direct materials <strong>$${data.directMaterials}</strong>, direct labor
    <strong>$${data.directLabor}</strong>, variable overhead
    <strong>$${data.variableOH}</strong>, and allocated fixed manufacturing overhead
    <strong>$${data.fixedMfgPerUnit}</strong>.</p>
    <p>A wholesale buyer has approached ${data.company.base} with a special order for
    <strong>${data.specialUnits.toLocaleString()} ${data.product.plural}</strong> at
    <strong>$${data.specialPrice} per unit</strong>. The order will not affect regular
    customer pricing, and ${data.company.base} has sufficient unused capacity to fulfill
    it without overtime or new investment.</p>
  `,

  given: (data) => [
    { label: 'Normal selling price', value: `$${data.price}` },
    { label: 'Variable cost per unit', value: `$${data.variableCost}` },
    { label: 'Fixed cost per unit (allocated)', value: `$${data.fixedMfgPerUnit}` },
    { label: 'Full cost per unit', value: `$${data.fullCost}` },
    { label: 'Special order quantity', value: `${data.specialUnits.toLocaleString()} units` },
    { label: 'Special order price', value: `$${data.specialPrice}` },
  ],

  steps: [
    {
      id: 'cm-per-unit-special',
      question: 'What is the contribution margin per unit on the special order?',
      resultType: 'money-small',
      unit: '$ per unit',
      solve: (data) => data.specialPrice - data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Special Order Contribution Margin per Unit',
          formula: 'Special Price − Variable Cost per Unit',
          values: `$${data.specialPrice} − $${data.variableCost}`,
          result: `$${correctValue} per unit`,
          highlight: true,
          note: 'Fixed manufacturing overhead is allocated, not incurred. With unused capacity, it is not relevant.',
        },
      ],
    },
    {
      id: 'total-cm-special',
      question: 'What is the total contribution margin from accepting the special order?',
      resultType: 'money-medium',
      unit: '$',
      solve: (data, prior) => prior['cm-per-unit-special'] * data.specialUnits,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Total Contribution Margin on Special Order',
          formula: 'CM per Unit × Special Order Quantity',
          values: `$${prior['cm-per-unit-special']} × ${data.specialUnits.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote('cm-per-unit-special', '1', prior, studentAnswers),
          note: 'With no incremental fixed costs, this total CM flows directly to operating income.',
        },
      ],
    },
    {
      id: 'accept-decision',
      type: 'choice',
      intentionalSingleAnswer: true,
      question: 'Given unconstrained capacity, should the company accept the special order?',
      options: [
        { id: 'accept', label: 'Accept — the order has positive contribution margin and no displaced production' },
        { id: 'reject-below-full-cost', label: 'Reject — the special price is below full cost per unit' },
        { id: 'reject-below-normal-price', label: 'Reject — the special price is below the normal selling price' },
        { id: 'accept-only-if-quiet', label: 'Accept only if regular customers will not learn of the discount' },
      ],
      correctId: (data, prior) => 'accept',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Decision Rule',
          formula: 'With unused capacity, accept any order with positive contribution margin',
          values: `Special CM = $${prior['cm-per-unit-special']}/unit > $0`,
          result: `Total CM contribution: $${prior['total-cm-special'].toLocaleString()} → Accept`,
          highlight: true,
          note: 'Full cost includes allocated fixed overhead, which is irrelevant when capacity is unused. Rejecting because the price is "below full cost" is the classic full-cost trap.',
        },
      ],
    },
    {
      id: 'min-acceptable-price',
      question: 'What is the minimum price per unit the company could accept on this special order without reducing operating income?',
      resultType: 'money-small',
      unit: '$ per unit',
      solve: (data) => data.variableCost,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Minimum Acceptable Price',
          formula: 'Variable Cost per Unit (the floor)',
          values: `DM ($${data.directMaterials}) + DL ($${data.directLabor}) + VOH ($${data.variableOH})`,
          result: `$${correctValue} per unit`,
          highlight: true,
          note: 'Any price above variable cost adds to operating income when capacity is unused. The floor is variable cost, not full cost.',
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Make-or-Buy
// ============================================================================

export const makeOrBuy = {
  id: 'ch12-make-or-buy',
  title: 'Make-or-Buy Decision',
  chapter: 12,
  difficulty: 'intermediate',
  estimatedMinutes: 8,
  description:
    'A supplier offers a component below the current internal full cost. Decide whether to outsource, distinguishing avoidable from unavoidable fixed costs.',
  reviewChapters: CH12_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    const annualUnits = roundToNearest(randomInRange(8000, 25000), 500);
    const directMaterials = randomInRange(8, 18, 1);
    const directLabor = randomInRange(6, 14, 1);
    const variableOH = randomInRange(4, 10, 1);
    const variableMakeCost = directMaterials + directLabor + variableOH;

    const totalFixedOH = roundToNearest(randomInRange(80000, 200000), 5000);
    // Avoidable: 30% to 60% of fixed (supervision, equipment lease that can be terminated)
    const avoidableFixedPct = randomInRange(30, 60, 5) / 100;
    const avoidableFixed = roundToNearest(totalFixedOH * avoidableFixedPct, 1000);
    const unavoidableFixed = totalFixedOH - avoidableFixed;

    const avoidableFixedPerUnit = avoidableFixed / annualUnits;
    const totalFixedPerUnit = totalFixedOH / annualUnits;
    const fullMakeCost = variableMakeCost + totalFixedPerUnit;

    // Buy price: spans from below to above the indifference point so the
    // decision can genuinely go either way.
    // Indifference point = variableMakeCost + avoidableFixed/units. We pick a
    // buy price somewhere between (variableMakeCost + $1) — clearly cheaper than
    // making — and fullMakeCost — clearly more expensive. Randomization across
    // 50 runs produces roughly an even split between make and buy.
    const buyFloor = variableMakeCost + 1;
    const buyCeiling = fullMakeCost;
    const buyPriceRaw = buyFloor + (buyCeiling - buyFloor) * (randomInRange(10, 90, 1) / 100);
    const buyPrice = Math.round(buyPriceRaw * 100) / 100;

    return {
      company, product, annualUnits,
      directMaterials, directLabor, variableOH, variableMakeCost,
      totalFixedOH, avoidableFixed, unavoidableFixed,
      totalFixedPerUnit, fullMakeCost, buyPrice,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} currently manufactures a critical
    ${data.product.singular} used in its main assembly. Annual production is
    <strong>${data.annualUnits.toLocaleString()} units</strong>. Per-unit variable
    manufacturing costs total <strong>$${data.variableMakeCost}</strong>, and the
    facility incurs <strong>$${data.totalFixedOH.toLocaleString()}</strong> per year
    in fixed manufacturing overhead allocated to this component.</p>
    <p>An outside supplier has offered to provide the same component at
    <strong>$${data.buyPrice} per unit</strong> on a long-term contract. If
    ${data.company.base} outsources, <strong>$${data.avoidableFixed.toLocaleString()}</strong>
    of the current fixed overhead would be eliminated (supervision and dedicated equipment
    lease). The remaining <strong>$${data.unavoidableFixed.toLocaleString()}</strong>
    represents allocated factory costs that would continue regardless.</p>
  `,

  given: (data) => [
    { label: 'Annual units required', value: `${data.annualUnits.toLocaleString()} units` },
    { label: 'Variable cost to make (per unit)', value: `$${data.variableMakeCost}` },
    { label: 'Total fixed overhead (annual)', value: `$${data.totalFixedOH.toLocaleString()}` },
    { label: 'Avoidable fixed if outsourced', value: `$${data.avoidableFixed.toLocaleString()}` },
    { label: 'Unavoidable fixed (continues either way)', value: `$${data.unavoidableFixed.toLocaleString()}` },
    { label: 'Supplier price per unit', value: `$${data.buyPrice}` },
  ],

  steps: [
    {
      id: 'total-make-cost',
      question: 'What is the total relevant cost to MAKE the component annually?',
      resultType: 'money-large',
      unit: '$',
      solve: (data) => data.variableMakeCost * data.annualUnits + data.avoidableFixed,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Variable Cost to Make',
          formula: 'Variable Cost per Unit × Units',
          values: `$${data.variableMakeCost} × ${data.annualUnits.toLocaleString()}`,
          result: `$${(data.variableMakeCost * data.annualUnits).toLocaleString()}`,
        },
        {
          label: 'Avoidable Fixed Cost (relevant)',
          formula: 'Fixed cost that disappears if we stop making',
          values: '—',
          result: `$${data.avoidableFixed.toLocaleString()}`,
        },
        {
          label: 'Total Relevant Cost to Make',
          formula: 'Variable + Avoidable Fixed',
          values: `$${(data.variableMakeCost * data.annualUnits).toLocaleString()} + $${data.avoidableFixed.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: `Unavoidable fixed costs ($${data.unavoidableFixed.toLocaleString()}) are excluded — they continue regardless of the decision.`,
        },
      ],
    },
    {
      id: 'total-buy-cost',
      question: 'What is the total relevant cost to BUY the component annually?',
      resultType: 'money-large',
      unit: '$',
      solve: (data) => data.buyPrice * data.annualUnits,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Total Cost to Buy',
          formula: 'Supplier Price × Units',
          values: `$${data.buyPrice} × ${data.annualUnits.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'Unavoidable fixed costs are excluded here too — they\'re the same in either alternative.',
        },
      ],
    },
    {
      id: 'cost-difference',
      question: 'What is the cost difference (Make cost − Buy cost)? A positive number means buying is cheaper.',
      resultType: 'money-large',
      unit: '$',
      tolerance: { value: 1, type: 'percent' },
      solve: (data, prior) => prior['total-make-cost'] - prior['total-buy-cost'],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Cost Difference',
          formula: 'Total Make Cost − Total Buy Cost',
          values: `$${prior['total-make-cost'].toLocaleString()} − $${prior['total-buy-cost'].toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}${correctValue > 0 ? ' (buying is cheaper)' : correctValue < 0 ? ' (making is cheaper)' : ' (indifferent)'}`,
          highlight: true,
          annotation:
            carryForwardNote('total-make-cost', '1', prior, studentAnswers, (v) => `$${v.toLocaleString()}`) ||
            carryForwardNote('total-buy-cost', '2', prior, studentAnswers, (v) => `$${v.toLocaleString()}`),
        },
      ],
    },
    {
      id: 'make-or-buy-decision',
      type: 'choice',
      question: 'Based on the relevant costs only (no qualitative factors), what should the company do?',
      options: [
        { id: 'make', label: 'Continue making — relevant cost to make is lower' },
        { id: 'buy', label: 'Outsource — relevant cost to buy is lower' },
        { id: 'indifferent', label: 'Indifferent — relevant costs are equal' },
      ],
      correctId: (data, prior) => {
        const diff = prior['cost-difference'];
        if (Math.abs(diff) < 0.5) return 'indifferent';
        return diff > 0 ? 'buy' : 'make';
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Decision',
          formula: 'Choose the alternative with lower relevant cost',
          values: `Difference = $${prior['cost-difference'].toLocaleString()}`,
          result: correctId === 'make'
            ? 'Make — saves money vs buying'
            : correctId === 'buy'
              ? 'Buy — saves money vs making'
              : 'Indifferent',
          highlight: true,
          note: 'The full per-unit make cost would have made buying look cheaper than it really is. Only avoidable fixed costs are relevant.',
        },
      ],
    },
    {
      id: 'max-acceptable-buy-price',
      question: 'What is the maximum price per unit the supplier could charge before making becomes cheaper than buying?',
      resultType: 'money-small',
      tolerance: { value: 0.5, type: 'absolute' },
      unit: '$ per unit',
      solve: (data) => {
        const avoidablePerUnit = data.avoidableFixed / data.annualUnits;
        return Math.round((data.variableMakeCost + avoidablePerUnit) * 100) / 100;
      },
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Avoidable Fixed per Unit',
          formula: 'Avoidable Fixed ÷ Annual Units',
          values: `$${data.avoidableFixed.toLocaleString()} ÷ ${data.annualUnits.toLocaleString()}`,
          result: `$${(data.avoidableFixed / data.annualUnits).toFixed(2)}/unit`,
        },
        {
          label: 'Ceiling Buy Price (Indifference Point)',
          formula: 'Variable Make Cost + Avoidable Fixed per Unit',
          values: `$${data.variableMakeCost} + $${(data.avoidableFixed / data.annualUnits).toFixed(2)}`,
          result: `$${correctValue}/unit`,
          highlight: true,
          note: 'Above this price, making is cheaper. Below, buying is cheaper.',
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Drop or Keep Segment
// ============================================================================

export const dropOrKeepSegment = {
  id: 'ch12-drop-or-keep',
  title: 'Drop or Keep a Segment',
  chapter: 12,
  difficulty: 'intermediate',
  estimatedMinutes: 7,
  description:
    'A product line shows a reported loss after allocated overhead. Decide whether dropping it actually improves company profit.',
  reviewChapters: CH12_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    const revenue = roundToNearest(randomInRange(180000, 400000), 5000);
    const variableCosts = roundToNearest(revenue * (randomInRange(55, 75, 1) / 100), 1000);
    const cm = revenue - variableCosts;

    // Total fixed allocated to segment — chosen so reported segment income is negative
    // But avoidable portion is less than CM (so keeping is correct), with ~50% chance of either direction
    const avoidableFixed = roundToNearest(randomInRange(Math.round(cm * 0.4), Math.round(cm * 1.3)), 1000);
    const allocatedCorporateFixed = roundToNearest(randomInRange(Math.round(cm * 0.3), Math.round(cm * 0.7)), 1000);
    const totalFixed = avoidableFixed + allocatedCorporateFixed;
    const reportedSegmentIncome = cm - totalFixed;

    return {
      company, product,
      revenue, variableCosts, cm,
      avoidableFixed, allocatedCorporateFixed, totalFixed,
      reportedSegmentIncome,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is reviewing the performance of its
    ${data.product.singular} product line, which reports a loss on the latest segment
    income statement:</p>
    <p>Revenue <strong>$${data.revenue.toLocaleString()}</strong>, variable costs
    <strong>$${data.variableCosts.toLocaleString()}</strong>, traceable fixed costs
    <strong>$${data.avoidableFixed.toLocaleString()}</strong> (segment-specific
    supervision and equipment), allocated corporate overhead
    <strong>$${data.allocatedCorporateFixed.toLocaleString()}</strong>. Reported
    segment income: <strong>$(${Math.abs(data.reportedSegmentIncome).toLocaleString()})</strong>.</p>
    <p>If the segment is dropped, the allocated corporate overhead would be redistributed
    to remaining segments — total company overhead does not change. Management is
    considering whether to discontinue the line.</p>
  `,

  given: (data) => [
    { label: 'Segment revenue', value: `$${data.revenue.toLocaleString()}` },
    { label: 'Variable costs', value: `$${data.variableCosts.toLocaleString()}` },
    { label: 'Contribution margin', value: `$${data.cm.toLocaleString()}` },
    { label: 'Avoidable (traceable) fixed', value: `$${data.avoidableFixed.toLocaleString()}` },
    { label: 'Allocated corporate overhead', value: `$${data.allocatedCorporateFixed.toLocaleString()}` },
    { label: 'Reported segment income (loss)', value: `$(${Math.abs(data.reportedSegmentIncome).toLocaleString()})` },
  ],

  steps: [
    {
      id: 'cm-segment',
      question: 'What is the contribution margin the segment currently generates?',
      resultType: 'money-large',
      unit: '$',
      solve: (data) => data.cm,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Segment Contribution Margin',
          formula: 'Revenue − Variable Costs',
          values: `$${data.revenue.toLocaleString()} − $${data.variableCosts.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: 'effect-on-income',
      question: 'If the segment is dropped, by how much will overall company operating income change? Enter a positive number for an increase, negative for a decrease.',
      resultType: 'money-large',
      unit: '$',
      solve: (data) => data.avoidableFixed - data.cm,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Contribution Margin Lost',
          formula: 'CM the dropped segment no longer generates',
          values: '—',
          result: `−$${data.cm.toLocaleString()}`,
        },
        {
          label: 'Avoidable Fixed Costs Saved',
          formula: 'Fixed costs that disappear with the segment',
          values: '—',
          result: `+$${data.avoidableFixed.toLocaleString()}`,
        },
        {
          label: 'Net Change in Operating Income',
          formula: 'Avoidable Fixed Saved − CM Lost',
          values: `$${data.avoidableFixed.toLocaleString()} − $${data.cm.toLocaleString()}`,
          result: `${correctValue >= 0 ? '+' : '−'}$${Math.abs(correctValue).toLocaleString()}`,
          highlight: true,
          note: 'Allocated corporate overhead does not change — it gets redistributed. It is not relevant to this decision.',
        },
      ],
    },
    {
      id: 'drop-decision',
      type: 'choice',
      question: 'Based on the relevant analysis, should the segment be dropped?',
      options: [
        { id: 'keep', label: 'Keep — dropping would reduce overall company operating income' },
        { id: 'drop', label: 'Drop — overall company operating income would increase' },
        { id: 'drop-because-loss', label: 'Drop — the segment is showing a reported loss' },
        { id: 'indifferent', label: 'Indifferent — dropping does not affect overall company income' },
      ],
      correctId: (data, prior) => {
        const change = prior['effect-on-income'];
        if (Math.abs(change) < 0.5) return 'indifferent';
        return change > 0 ? 'drop' : 'keep';
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Decision Framework',
          formula: 'Drop only if Avoidable Fixed Saved > CM Lost',
          values: `$${data.avoidableFixed.toLocaleString()} vs $${data.cm.toLocaleString()}`,
          result: correctId === 'keep'
            ? 'Keep — CM Lost exceeds Fixed Saved'
            : correctId === 'drop'
              ? 'Drop — Fixed Saved exceeds CM Lost'
              : 'Indifferent',
          highlight: true,
          note: 'The reported loss includes allocated overhead, which is unaffected by the decision. Dropping a segment with positive net contribution (CM > Avoidable Fixed) always reduces overall profit.',
        },
      ],
    },
    {
      id: 'corporate-overhead-effect',
      intentionalSingleAnswer: true,
      question: 'If the segment is dropped, what happens to the $' + 'allocated corporate overhead total at the company level?',
      type: 'choice',
      options: [
        { id: 'unchanged', label: 'Total stays the same — it gets reallocated to remaining segments' },
        { id: 'eliminated', label: 'It disappears with the segment' },
        { id: 'reduced-proportionally', label: 'It is reduced in proportion to lost revenue' },
        { id: 'grows', label: 'It grows because remaining segments absorb more' },
      ],
      correctId: () => 'unchanged',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Allocated Costs vs Traceable Costs',
          formula: 'Allocation method redistributes — does not eliminate',
          values: `$${data.allocatedCorporateFixed.toLocaleString()} of corporate overhead`,
          result: 'Total unchanged at company level',
          highlight: true,
          note: 'This is why allocated costs are irrelevant for drop-or-keep decisions. They exist either way.',
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — Equipment Replacement (Sunk Cost)
// ============================================================================

export const equipmentReplacement = {
  id: 'ch12-equipment-replacement',
  title: 'Equipment Replacement & Sunk Costs',
  chapter: 12,
  difficulty: 'intermediate',
  estimatedMinutes: 8,
  description:
    'A machine purchased years ago could be replaced with new technology. Identify which costs are relevant and decide.',
  reviewChapters: CH12_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });
    const product = randomProduct({ category: 'manufacturing' });

    const remainingYears = randomInRange(3, 5, 1);

    const oldOriginalCost = roundToNearest(randomInRange(120000, 250000), 5000);
    const oldBookValue = roundToNearest(oldOriginalCost * (randomInRange(30, 55, 1) / 100), 1000);
    const oldSalvageNow = roundToNearest(oldBookValue * (randomInRange(40, 80, 1) / 100), 1000);
    const oldAnnualOpCost = roundToNearest(randomInRange(40000, 70000), 1000);

    const newCost = roundToNearest(randomInRange(80000, 160000), 5000);
    // New annual op cost: lower than old by a meaningful amount
    const annualSavings = roundToNearest(randomInRange(15000, 35000), 1000);
    const newAnnualOpCost = oldAnnualOpCost - annualSavings;
    const newSalvageEnd = roundToNearest(newCost * (randomInRange(5, 20, 1) / 100), 1000);

    return {
      company, product, remainingYears,
      oldOriginalCost, oldBookValue, oldSalvageNow, oldAnnualOpCost,
      newCost, newAnnualOpCost, annualSavings, newSalvageEnd,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} purchased a specialized machine four years ago for
    <strong>$${data.oldOriginalCost.toLocaleString()}</strong>. The machine still has
    <strong>${data.remainingYears} years</strong> of useful life remaining, a current
    book value of <strong>$${data.oldBookValue.toLocaleString()}</strong>, and could be
    sold today for <strong>$${data.oldSalvageNow.toLocaleString()}</strong>. Annual
    operating costs on the existing machine are
    <strong>$${data.oldAnnualOpCost.toLocaleString()}</strong>.</p>
    <p>A new machine is available for <strong>$${data.newCost.toLocaleString()}</strong>
    with the same ${data.remainingYears}-year life. Annual operating costs would drop to
    <strong>$${data.newAnnualOpCost.toLocaleString()}</strong>, and the new machine
    would have a salvage value of <strong>$${data.newSalvageEnd.toLocaleString()}</strong>
    at the end of its life. Ignore the time value of money for this analysis.</p>
  `,

  given: (data) => [
    { label: 'Old machine — book value', value: `$${data.oldBookValue.toLocaleString()}` },
    { label: 'Old machine — current salvage', value: `$${data.oldSalvageNow.toLocaleString()}` },
    { label: 'Old machine — annual op cost', value: `$${data.oldAnnualOpCost.toLocaleString()}` },
    { label: 'New machine — cost', value: `$${data.newCost.toLocaleString()}` },
    { label: 'New machine — annual op cost', value: `$${data.newAnnualOpCost.toLocaleString()}` },
    { label: 'New machine — end salvage', value: `$${data.newSalvageEnd.toLocaleString()}` },
    { label: 'Years remaining', value: `${data.remainingYears} years` },
  ],

  steps: [
    {
      id: 'sunk-cost-id',
      type: 'choice',
      intentionalSingleAnswer: true,
      question: 'Which of the following is a SUNK cost in this decision?',
      options: [
        { id: 'book-value', label: 'Book value of the old machine ($' + '— historical cost minus accumulated depreciation)' },
        { id: 'salvage-old', label: 'Current salvage value of the old machine' },
        { id: 'new-cost', label: 'Purchase price of the new machine' },
        { id: 'annual-savings', label: 'Annual operating cost savings from the new machine' },
      ],
      correctId: () => 'book-value',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Sunk Cost Identification',
          formula: 'A sunk cost is past, unrecoverable, and unchanged by any future decision',
          values: 'Book value reflects past purchase, already paid',
          result: `Old machine book value ($${data.oldBookValue.toLocaleString()}) is sunk`,
          highlight: true,
          note: 'The current salvage value is relevant (it changes based on whether we sell), the new cost is relevant (it occurs only if we replace), and the operating savings are relevant. Book value is purely historical accounting.',
        },
      ],
    },
    {
      id: 'total-savings',
      question: 'Over the ' + 'remaining life, what is the total operating cost savings from switching to the new machine?',
      resultType: 'money-large',
      unit: '$',
      solve: (data) => data.annualSavings * data.remainingYears,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Annual Savings',
          formula: 'Old Op Cost − New Op Cost',
          values: `$${data.oldAnnualOpCost.toLocaleString()} − $${data.newAnnualOpCost.toLocaleString()}`,
          result: `$${data.annualSavings.toLocaleString()}/year`,
        },
        {
          label: 'Total Savings Over Remaining Life',
          formula: 'Annual Savings × Years Remaining',
          values: `$${data.annualSavings.toLocaleString()} × ${data.remainingYears}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
        },
      ],
    },
    {
      id: 'net-investment',
      question: 'What is the net investment required to replace the old machine? (New cost − Old salvage now − New salvage at end of life)',
      resultType: 'money-large',
      unit: '$',
      solve: (data) => data.newCost - data.oldSalvageNow - data.newSalvageEnd,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'New Machine Cost',
          formula: 'Cash outflow today',
          values: '—',
          result: `+$${data.newCost.toLocaleString()}`,
        },
        {
          label: 'Old Machine Salvage Today',
          formula: 'Cash inflow from selling old machine',
          values: '—',
          result: `−$${data.oldSalvageNow.toLocaleString()}`,
        },
        {
          label: 'New Machine Salvage at End',
          formula: 'Cash inflow at end of life',
          values: '—',
          result: `−$${data.newSalvageEnd.toLocaleString()}`,
        },
        {
          label: 'Net Investment',
          formula: 'New Cost − Old Salvage − Future Salvage',
          values: `$${data.newCost.toLocaleString()} − $${data.oldSalvageNow.toLocaleString()} − $${data.newSalvageEnd.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: 'Book value of the old machine appears nowhere. It is sunk and irrelevant.',
        },
      ],
    },
    {
      id: 'net-advantage',
      question: 'What is the net advantage (disadvantage) of replacing? Total Savings − Net Investment. Positive favors replacement.',
      resultType: 'money-large',
      unit: '$',
      tolerance: { value: 1, type: 'percent' },
      solve: (data, prior) => prior['total-savings'] - prior['net-investment'],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Net Advantage of Replacement',
          formula: 'Total Operating Savings − Net Investment',
          values: `$${prior['total-savings'].toLocaleString()} − $${prior['net-investment'].toLocaleString()}`,
          result: `${correctValue >= 0 ? '+' : '−'}$${Math.abs(correctValue).toLocaleString()}`,
          highlight: true,
          annotation:
            carryForwardNote('total-savings', '2', prior, studentAnswers, (v) => `$${v.toLocaleString()}`) ||
            carryForwardNote('net-investment', '3', prior, studentAnswers, (v) => `$${v.toLocaleString()}`),
        },
      ],
    },
    {
      id: 'replace-decision',
      type: 'choice',
      question: 'Based on the relevant analysis (ignoring time value of money), should the company replace?',
      options: [
        { id: 'replace', label: 'Replace — total savings exceed net investment' },
        { id: 'keep', label: 'Keep — net investment exceeds total savings' },
        { id: 'keep-book-value', label: 'Keep — replacing would waste the remaining book value of the old machine' },
        { id: 'indifferent', label: 'Indifferent — savings and investment are equal' },
      ],
      correctId: (data, prior) => {
        const advantage = prior['net-advantage'];
        if (Math.abs(advantage) < 0.5) return 'indifferent';
        return advantage > 0 ? 'replace' : 'keep';
      },
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Final Decision',
          formula: 'Replace when Net Advantage > 0',
          values: `Net advantage = $${prior['net-advantage'].toLocaleString()}`,
          result: correctId === 'replace'
            ? 'Replace'
            : correctId === 'keep'
              ? 'Keep existing machine'
              : 'Indifferent',
          highlight: true,
          note: 'The book value of the old machine never enters this analysis. Choosing to keep because of book value is the sunk-cost fallacy.',
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Product Mix Under a Constrained Resource
// ============================================================================

export const productMixConstraint = {
  id: 'ch12-product-mix-constraint',
  title: 'Product Mix Under a Constraint',
  chapter: 12,
  difficulty: 'advanced',
  estimatedMinutes: 8,
  description:
    'Two products compete for the same constrained resource. Decide which to prioritize using contribution margin per unit of constraint.',
  reviewChapters: CH12_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: 'manufacturing' });

    const priceA = randomInRange(60, 100, 1);
    const vcA = randomInRange(20, Math.floor(priceA * 0.55), 1);
    const cmA = priceA - vcA;
    const mhA = randomInRange(2, 5, 1) / 10 * 10; // 2, 3, 4, 5 machine-hours per unit

    const priceB = randomInRange(80, 140, 1);
    const vcB = randomInRange(30, Math.floor(priceB * 0.6), 1);
    const cmB = priceB - vcB;
    const mhB = randomInRange(3, 8, 1);

    // Constraint: machine-hours available
    const availableMH = roundToNearest(randomInRange(8000, 18000), 500);

    // Demand per product (unconstrained could absorb both, but constraint forces choice)
    const demandA = roundToNearest(randomInRange(1500, 4000), 100);
    const demandB = roundToNearest(randomInRange(1500, 3500), 100);

    return {
      company,
      priceA, vcA, cmA, mhA,
      priceB, vcB, cmB, mhB,
      availableMH, demandA, demandB,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} produces two products, <strong>Product A</strong> and
    <strong>Product B</strong>, on the same machining line. The line has a binding
    capacity of <strong>${data.availableMH.toLocaleString()} machine-hours</strong>
    per period — not enough to satisfy all demand for both products.</p>
    <p>Product A sells for <strong>$${data.priceA}</strong> with variable cost
    <strong>$${data.vcA}</strong> and requires <strong>${data.mhA} machine-hours</strong>
    per unit. Maximum demand is <strong>${data.demandA.toLocaleString()} units</strong>.</p>
    <p>Product B sells for <strong>$${data.priceB}</strong> with variable cost
    <strong>$${data.vcB}</strong> and requires <strong>${data.mhB} machine-hours</strong>
    per unit. Maximum demand is <strong>${data.demandB.toLocaleString()} units</strong>.</p>
  `,

  given: (data) => [
    { label: 'Product A — CM per unit', value: `$${data.cmA}` },
    { label: 'Product A — machine-hours/unit', value: `${data.mhA} hrs` },
    { label: 'Product A — demand', value: `${data.demandA.toLocaleString()} units` },
    { label: 'Product B — CM per unit', value: `$${data.cmB}` },
    { label: 'Product B — machine-hours/unit', value: `${data.mhB} hrs` },
    { label: 'Product B — demand', value: `${data.demandB.toLocaleString()} units` },
    { label: 'Available machine-hours', value: `${data.availableMH.toLocaleString()} hrs` },
  ],

  steps: [
    {
      id: 'cm-per-mh-a',
      question: 'What is the contribution margin per machine-hour for Product A?',
      resultType: 'money-small',
      tolerance: { value: 0.5, type: 'absolute' },
      unit: '$ per hour',
      solve: (data) => Math.round((data.cmA / data.mhA) * 100) / 100,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Product A — CM per Machine-Hour',
          formula: 'CM per Unit ÷ Machine-Hours per Unit',
          values: `$${data.cmA} ÷ ${data.mhA}`,
          result: `$${correctValue}/hr`,
          highlight: true,
        },
      ],
    },
    {
      id: 'cm-per-mh-b',
      question: 'What is the contribution margin per machine-hour for Product B?',
      resultType: 'money-small',
      tolerance: { value: 0.5, type: 'absolute' },
      unit: '$ per hour',
      solve: (data) => Math.round((data.cmB / data.mhB) * 100) / 100,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: 'Product B — CM per Machine-Hour',
          formula: 'CM per Unit ÷ Machine-Hours per Unit',
          values: `$${data.cmB} ÷ ${data.mhB}`,
          result: `$${correctValue}/hr`,
          highlight: true,
        },
      ],
    },
    {
      id: 'priority',
      type: 'choice',
      question: 'Which product should the company prioritize for the constrained machine-hours?',
      options: [
        { id: 'priority-a', label: 'Prioritize Product A — higher CM per machine-hour' },
        { id: 'priority-b', label: 'Prioritize Product B — higher CM per machine-hour' },
        { id: 'priority-a-cm-per-unit', label: 'Prioritize Product A — higher CM per unit' },
        { id: 'priority-b-cm-per-unit', label: 'Prioritize Product B — higher CM per unit' },
      ],
      correctId: (data, prior) => prior['cm-per-mh-a'] >= prior['cm-per-mh-b'] ? 'priority-a' : 'priority-b',
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: 'Prioritization Rule',
          formula: 'Maximize CM per unit of the constrained resource',
          values: `A: $${prior['cm-per-mh-a']}/hr vs B: $${prior['cm-per-mh-b']}/hr`,
          result: correctId === 'priority-a'
            ? 'Product A produces more CM per scarce machine-hour'
            : 'Product B produces more CM per scarce machine-hour',
          highlight: true,
          note: 'CM per unit alone is misleading when products consume different amounts of the constraint. The right metric is CM per unit of the binding resource.',
        },
      ],
    },
    {
      id: 'optimal-units',
      question: 'How many units of the prioritized product should be produced before considering the other? Limited by demand OR remaining machine-hours, whichever is smaller.',
      resultType: 'units',
      unit: 'units',
      solve: (data, prior) => {
        const priority = prior['priority'];
        if (priority === 'priority-a') {
          const maxByMH = Math.floor(data.availableMH / data.mhA);
          return Math.min(data.demandA, maxByMH);
        } else {
          const maxByMH = Math.floor(data.availableMH / data.mhB);
          return Math.min(data.demandB, maxByMH);
        }
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const priority = prior['priority'];
        const isA = priority === 'priority-a';
        const demand = isA ? data.demandA : data.demandB;
        const mh = isA ? data.mhA : data.mhB;
        const maxByMH = Math.floor(data.availableMH / mh);
        const productLabel = isA ? 'A' : 'B';
        return [
          {
            label: `Max ${productLabel} by Demand`,
            formula: 'Demand ceiling',
            values: '—',
            result: `${demand.toLocaleString()} units`,
          },
          {
            label: `Max ${productLabel} by Machine-Hours`,
            formula: 'Available MH ÷ MH per Unit',
            values: `${data.availableMH.toLocaleString()} ÷ ${mh}`,
            result: `${maxByMH.toLocaleString()} units`,
          },
          {
            label: 'Optimal Production of Priority Product',
            formula: 'Lower of the two ceilings',
            values: `min(${demand.toLocaleString()}, ${maxByMH.toLocaleString()})`,
            result: `${correctValue.toLocaleString()} units`,
            highlight: true,
            annotation: carryForwardNote('priority', '3', prior, studentAnswers),
          },
        ];
      },
    },
    {
      id: 'total-cm',
      question: 'What is the total contribution margin from the prioritized production (just the priority product, ignoring the leftover hours)?',
      resultType: 'money-large',
      unit: '$',
      solve: (data, prior) => {
        const priority = prior['priority'];
        const cm = priority === 'priority-a' ? data.cmA : data.cmB;
        return prior['optimal-units'] * cm;
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const priority = prior['priority'];
        const isA = priority === 'priority-a';
        const cm = isA ? data.cmA : data.cmB;
        const productLabel = isA ? 'A' : 'B';
        return [
          {
            label: `Total CM from Product ${productLabel}`,
            formula: 'Units Produced × CM per Unit',
            values: `${prior['optimal-units'].toLocaleString()} × $${cm}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            annotation: carryForwardNote('optimal-units', '4', prior, studentAnswers, (v) => `${v.toLocaleString()} units`),
            note: 'Remaining machine-hours would then be allocated to the lower-CM-per-hour product up to its demand.',
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Export all problems as an ordered array for the picker UI
// ============================================================================

export const ch12Problems = [
  specialOrderUnconstrained,
  makeOrBuy,
  dropOrKeepSegment,
  equipmentReplacement,
  productMixConstraint,
];
