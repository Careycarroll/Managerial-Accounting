// js/practice/ch05-problems.js
// Chapter 5 — Activity-Based Costing and Activity-Based Management
// Pass 2 problems — exercises cost-driver allocation, ABC vs traditional
// comparison, cost hierarchy recognition, time-driven ABC, and ABM decisions.
//
// Conforms to js/practice/SPEC.md (Pass 2).
// Five problems:
//   1. Single Cost Driver Allocation
//   2. ABC vs Traditional Comparison
//   3. Cost Hierarchy Classification
//   4. TDABC — Time Equation
//   5. ABM Decision — Product Rationalization

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH05_REVIEW = [
  {
    label: "Ch. 5 — Activity-Based Costing and ABM",
    href: `${BASE}pages/learn/ch05.html`,
  },
];

// ============================================================================
// Carry-forward annotation helper
// ============================================================================

function carryForwardNote(
  stepId,
  label,
  prior,
  studentAnswers,
  formatter = (v) => `$${v.toLocaleString()}`,
) {
  const correct = prior[stepId];
  const student = studentAnswers[stepId];
  if (student === undefined) return null;
  if (typeof correct === "string") {
    if (correct === student) return null;
    return `Using Step ${label}'s correct selection: ${correct} (your selection: ${student})`;
  }
  if (Math.abs(correct - student) <= 0.5) return null;
  return `Using Step ${label}'s correct value: ${formatter(correct)} (your answer: ${formatter(student)})`;
}

// ============================================================================
// Problem 1 — Single Cost Driver Allocation
// ============================================================================

export const singleDriverAllocation = {
  id: "ch05-single-driver",
  title: "Single Cost Driver Allocation",
  chapter: 5,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Compute an activity rate from a cost pool and driver volume, then allocate to a specific product.",
  reviewChapters: CH05_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const activityCostPool = roundToNearest(
      randomInRange(120000, 450000),
      5000,
    );
    const totalDriverUnits = roundToNearest(randomInRange(8000, 25000), 500);
    const productDriverUsage = roundToNearest(
      randomInRange(
        Math.round(totalDriverUnits * 0.05),
        Math.round(totalDriverUnits * 0.25),
      ),
      50,
    );

    // Activity name and driver — pick a coherent pair
    const activities = [
      {
        name: "machine setup",
        driver: "setups",
        verb: "performed",
        costType: "setup labor + lubricants",
      },
      {
        name: "quality inspection",
        driver: "inspections",
        verb: "completed",
        costType: "inspector salaries + test equipment",
      },
      {
        name: "material handling",
        driver: "material moves",
        verb: "executed",
        costType: "forklift operators + handling equipment",
      },
      {
        name: "production scheduling",
        driver: "scheduling hours",
        verb: "spent",
        costType: "planning staff + ERP system",
      },
    ];
    const activity = activities[Math.floor(Math.random() * activities.length)];

    const productUnits = roundToNearest(randomInRange(800, 4000), 50);

    return {
      company,
      product,
      activity,
      activityCostPool,
      totalDriverUnits,
      productDriverUsage,
      productUnits,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} uses activity-based costing to allocate
    <strong>${data.activity.name}</strong> costs to its product lines. Total annual
    cost in the ${data.activity.name} cost pool is
    <strong>$${data.activityCostPool.toLocaleString()}</strong> (${data.activity.costType}),
    and the cost driver is <strong>${data.activity.driver}</strong>. Across all
    products, the company expects to perform
    <strong>${data.totalDriverUnits.toLocaleString()} ${data.activity.driver}</strong>
    this year. The ${data.product.singular} line specifically requires
    <strong>${data.productDriverUsage.toLocaleString()} ${data.activity.driver}</strong>
    annually to produce <strong>${data.productUnits.toLocaleString()} ${data.product.plural}</strong>.</p>
  `,

  given: (data) => [
    {
      label: `${data.activity.name} cost pool`,
      value: `$${data.activityCostPool.toLocaleString()}`,
    },
    {
      label: `Total ${data.activity.driver}`,
      value: `${data.totalDriverUnits.toLocaleString()}`,
    },
    {
      label: `${data.product.singular} usage`,
      value: `${data.productDriverUsage.toLocaleString()} ${data.activity.driver}`,
    },
    {
      label: `${data.product.singular} units produced`,
      value: `${data.productUnits.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "activity-rate",
      question: "What is the activity rate (cost per driver unit)?",
      resultType: "money-small",
      unit: "$ per driver",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data) =>
        roundTo(data.activityCostPool / data.totalDriverUnits, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Activity Rate",
          formula: "Activity Cost Pool ÷ Total Driver Units",
          values: `$${data.activityCostPool.toLocaleString()} ÷ ${data.totalDriverUnits.toLocaleString()}`,
          result: `$${correctValue} per ${data.activity.driver.replace(/s$/, "")}`,
          highlight: true,
          note: "This rate is the heart of an ABC system — it converts a cost pool into a per-unit-of-activity price.",
        },
      ],
    },
    {
      id: "allocated-cost",
      question: `What is the total ${(data) => data.activity?.name || "activity"} cost allocated to the product line?`,
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) =>
        Math.round(prior["activity-rate"] * data.productDriverUsage),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Allocated Cost",
          formula: "Activity Rate × Product Driver Usage",
          values: `$${prior["activity-rate"]} × ${data.productDriverUsage.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "activity-rate",
            "1",
            prior,
            studentAnswers,
            (v) => `$${v}`,
          ),
        },
      ],
    },
    {
      id: "cost-per-unit",
      question: "What is the activity cost per unit of product?",
      resultType: "money-small",
      unit: "$ per unit",
      tolerance: { value: 0.1, type: "absolute" },
      solve: (data, prior) =>
        roundTo(prior["allocated-cost"] / data.productUnits, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Activity Cost per Unit",
          formula: "Allocated Cost ÷ Units Produced",
          values: `$${prior["allocated-cost"].toLocaleString()} ÷ ${data.productUnits.toLocaleString()}`,
          result: `$${correctValue} per unit`,
          highlight: true,
          annotation: carryForwardNote(
            "allocated-cost",
            "2",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "driver-interpretation",
      type: "choice",
      question:
        "If a competing product line uses 50% more of the cost driver but produces the same number of units, what happens to ITS activity cost per unit?",
      options: [
        {
          id: "increases-50",
          label:
            "Increases by 50% — driver usage scales linearly to per-unit cost",
        },
        {
          id: "increases-less",
          label:
            "Increases, but by less than 50% — some economies of scale exist",
        },
        {
          id: "unchanged",
          label:
            "Unchanged — per-unit allocation depends only on activity rate",
        },
        {
          id: "decreases",
          label: "Decreases — higher driver usage spreads cost over more units",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "increases-50",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "ABC Logic",
          formula: "Driver usage × Rate ÷ Units",
          values:
            "If driver usage rises 50% and units stay constant, allocated cost rises 50%, so cost-per-unit rises 50%.",
          result: "50% higher per-unit activity cost",
          highlight: true,
          note: "This is the core ABC insight — products that consume more driver activity bear more cost, even when output volume is similar.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — ABC vs Traditional Comparison
// ============================================================================

export const abcVsTraditional = {
  id: "ch05-abc-vs-traditional",
  title: "ABC vs Traditional Costing",
  chapter: 5,
  difficulty: "intermediate",
  estimatedMinutes: 9,
  description:
    "Compare per-unit costs under traditional (single-rate) vs ABC (multi-pool) systems for two products with different activity profiles.",
  reviewChapters: CH05_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const productHV = randomProduct({ category: "manufacturing" }); // High-volume, simple
    const productLV = randomProduct({ category: "manufacturing" }); // Low-volume, complex

    // Total overhead pool
    const totalOH = roundToNearest(randomInRange(400000, 900000), 10000);

    // Traditional driver: direct labor hours
    const hvUnits = roundToNearest(randomInRange(20000, 50000), 500);
    const lvUnits = roundToNearest(randomInRange(2000, 6000), 100);
    const dlhPerHv = randomInRange(2, 4, 1);
    const dlhPerLv = randomInRange(3, 6, 1); // Slightly higher for complex product
    const totalDlh = hvUnits * dlhPerHv + lvUnits * dlhPerLv;
    const traditionalRate = roundTo(totalOH / totalDlh, 2);

    // ABC: Setup + machine + DLH pools
    // Split total OH across three pools
    const setupPoolPct = randomInRange(20, 35, 5) / 100;
    const machinePoolPct = randomInRange(35, 50, 5) / 100;
    const setupPool = roundToNearest(totalOH * setupPoolPct, 1000);
    const machinePool = roundToNearest(totalOH * machinePoolPct, 1000);
    const dlhPool = totalOH - setupPool - machinePool;

    // Driver volumes — LV product disproportionately consumes setups (small batches)
    const totalSetups = randomInRange(150, 400, 10);
    const hvSetups = Math.round((totalSetups * randomInRange(15, 30, 5)) / 100);
    const lvSetups = totalSetups - hvSetups; // LV dominates setups

    const totalMachineHrs = roundToNearest(randomInRange(15000, 35000), 500);
    const hvMachineHrs = Math.round(
      (totalMachineHrs * randomInRange(55, 75, 5)) / 100,
    );
    const lvMachineHrs = totalMachineHrs - hvMachineHrs;

    return {
      company,
      productHV,
      productLV,
      totalOH,
      hvUnits,
      lvUnits,
      dlhPerHv,
      dlhPerLv,
      totalDlh,
      traditionalRate,
      setupPool,
      machinePool,
      dlhPool,
      totalSetups,
      hvSetups,
      lvSetups,
      totalMachineHrs,
      hvMachineHrs,
      lvMachineHrs,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} produces two products: <strong>high-volume
    ${data.productHV.plural}</strong> (${data.hvUnits.toLocaleString()} units)
    and <strong>low-volume ${data.productLV.plural}</strong>
    (${data.lvUnits.toLocaleString()} units). Total manufacturing overhead is
    <strong>$${data.totalOH.toLocaleString()}</strong>.</p>
    <p>Under the <strong>traditional system</strong>, overhead is allocated based
    on direct labor hours: ${data.dlhPerHv} DLH per high-volume unit and
    ${data.dlhPerLv} DLH per low-volume unit.</p>
    <p>Under <strong>ABC</strong>, the same $${data.totalOH.toLocaleString()} is split
    into three pools: <strong>$${data.setupPool.toLocaleString()}</strong> for setup,
    <strong>$${data.machinePool.toLocaleString()}</strong> for machine costs, and
    <strong>$${data.dlhPool.toLocaleString()}</strong> for DLH-driven costs.
    The low-volume product requires more frequent setups
    (${data.lvSetups} setups vs ${data.hvSetups} for high-volume).</p>
  `,

  given: (data) => [
    { label: "Total overhead", value: `$${data.totalOH.toLocaleString()}` },
    {
      label: "HV product (units / DLH per unit)",
      value: `${data.hvUnits.toLocaleString()} / ${data.dlhPerHv}`,
    },
    {
      label: "LV product (units / DLH per unit)",
      value: `${data.lvUnits.toLocaleString()} / ${data.dlhPerLv}`,
    },
    {
      label: "Setup pool / setups (HV / LV)",
      value: `$${data.setupPool.toLocaleString()} / ${data.hvSetups} / ${data.lvSetups}`,
    },
    {
      label: "Machine pool / hrs (HV / LV)",
      value: `$${data.machinePool.toLocaleString()} / ${data.hvMachineHrs.toLocaleString()} / ${data.lvMachineHrs.toLocaleString()}`,
    },
    { label: "DLH pool", value: `$${data.dlhPool.toLocaleString()}` },
  ],

  steps: [
    {
      id: "traditional-per-unit-lv",
      question:
        "Under traditional costing, what is the overhead allocated to ONE low-volume unit?",
      resultType: "money-small",
      unit: "$ per unit",
      tolerance: { value: 0.5, type: "absolute" },
      solve: (data) => roundTo(data.traditionalRate * data.dlhPerLv, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Traditional Rate (DLH-based)",
          formula: "Total OH ÷ Total DLH",
          values: `$${data.totalOH.toLocaleString()} ÷ ${data.totalDlh.toLocaleString()} DLH`,
          result: `$${data.traditionalRate} per DLH`,
        },
        {
          label: "Per LV Unit",
          formula: "Rate × DLH per Unit",
          values: `$${data.traditionalRate} × ${data.dlhPerLv}`,
          result: `$${correctValue} per unit`,
          highlight: true,
        },
      ],
    },
    {
      id: "abc-setup-cost-lv",
      question:
        "Under ABC, what is the TOTAL setup cost allocated to the low-volume product line?",
      resultType: "money-medium",
      unit: "$",
      solve: (data) =>
        Math.round((data.setupPool / data.totalSetups) * data.lvSetups),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Setup Rate",
          formula: "Setup Pool ÷ Total Setups",
          values: `$${data.setupPool.toLocaleString()} ÷ ${data.totalSetups}`,
          result: `$${roundTo(data.setupPool / data.totalSetups, 2)} per setup`,
        },
        {
          label: "Setup Cost — LV",
          formula: "Setup Rate × LV Setups",
          values: `$${roundTo(data.setupPool / data.totalSetups, 2)} × ${data.lvSetups}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "LV dominates setups despite low volume — small frequent batches drive heavy setup activity.",
        },
      ],
    },
    {
      id: "abc-total-cost-lv",
      question:
        "Under ABC, what is the TOTAL overhead allocated to the low-volume product line (setup + machine + DLH)?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1.5, type: "percent" },
      solve: (data, prior) => {
        const setupRate = data.setupPool / data.totalSetups;
        const machineRate = data.machinePool / data.totalMachineHrs;
        const dlhRate = data.dlhPool / data.totalDlh;
        const setupCost = setupRate * data.lvSetups;
        const machineCost = machineRate * data.lvMachineHrs;
        const dlhCost = dlhRate * (data.lvUnits * data.dlhPerLv);
        return Math.round(setupCost + machineCost + dlhCost);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const machineRate = roundTo(data.machinePool / data.totalMachineHrs, 2);
        const dlhRate = roundTo(data.dlhPool / data.totalDlh, 2);
        const machineCost = Math.round(machineRate * data.lvMachineHrs);
        const dlhCost = Math.round(dlhRate * (data.lvUnits * data.dlhPerLv));
        return [
          {
            label: "Setup Cost — LV (from Step 2)",
            values: `$${prior["abc-setup-cost-lv"].toLocaleString()}`,
          },
          {
            label: "Machine Cost — LV",
            formula: "Machine Rate × LV Machine Hrs",
            values: `$${machineRate} × ${data.lvMachineHrs.toLocaleString()}`,
            result: `$${machineCost.toLocaleString()}`,
          },
          {
            label: "DLH Cost — LV",
            formula: "DLH Rate × LV DLH",
            values: `$${dlhRate} × ${(data.lvUnits * data.dlhPerLv).toLocaleString()}`,
            result: `$${dlhCost.toLocaleString()}`,
          },
          {
            label: "Total ABC Cost — LV",
            formula: "Sum of three pools",
            values: "Setup + Machine + DLH",
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            annotation: carryForwardNote(
              "abc-setup-cost-lv",
              "2",
              prior,
              studentAnswers,
            ),
          },
        ];
      },
    },
    {
      id: "abc-per-unit-lv",
      question: "Under ABC, what is the overhead per ONE low-volume unit?",
      resultType: "money-small",
      unit: "$ per unit",
      tolerance: { value: 0.5, type: "absolute" },
      solve: (data, prior) =>
        roundTo(prior["abc-total-cost-lv"] / data.lvUnits, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "ABC Per Unit",
          formula: "Total ABC Cost ÷ Units",
          values: `$${prior["abc-total-cost-lv"].toLocaleString()} ÷ ${data.lvUnits.toLocaleString()}`,
          result: `$${correctValue} per unit`,
          highlight: true,
          annotation: carryForwardNote(
            "abc-total-cost-lv",
            "3",
            prior,
            studentAnswers,
          ),
        },
      ],
    },
    {
      id: "which-undercosts",
      type: "choice",
      question:
        "Comparing the two systems, which statement is TRUE for the low-volume product?",
      options: [
        {
          id: "traditional-undercosts",
          label:
            "Traditional costing UNDER-costs the LV product; ABC reveals it costs more than reported",
        },
        {
          id: "traditional-overcosts",
          label:
            "Traditional costing OVER-costs the LV product; ABC reveals it costs less than reported",
        },
        {
          id: "no-difference",
          label:
            "The two systems produce the same result — only the allocation method differs",
        },
        {
          id: "depends-on-margin",
          label: "Cannot determine without knowing the product margin",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "traditional-undercosts",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Per-Unit Comparison",
          formula: "Compare traditional and ABC per-unit costs",
          values: `Traditional $${prior["traditional-per-unit-lv"]} vs ABC $${prior["abc-per-unit-lv"]} per LV unit`,
          result:
            prior["abc-per-unit-lv"] > prior["traditional-per-unit-lv"]
              ? "ABC is higher → traditional UNDER-costs"
              : "ABC is lower than traditional",
          highlight: true,
          note: "This is the classic ABC insight: traditional single-rate costing under-costs low-volume complex products (which heavily consume setup/non-volume activities) and over-costs high-volume simple products. ABC corrects this distortion.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Cost Hierarchy Classification
// ============================================================================

export const costHierarchyClassification = {
  id: "ch05-cost-hierarchy",
  title: "Cost Hierarchy Recognition",
  chapter: 5,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Identify which level of the cost hierarchy (unit, batch, product-sustaining, or facility) each activity belongs to.",
  reviewChapters: CH05_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });

    // Pool of activities tagged with correct hierarchy level
    const activityPool = [
      { name: "machine setup before a production run", level: "batch" },
      { name: "direct labor on each unit", level: "unit" },
      { name: "engineering changes to a product design", level: "product" },
      { name: "plant security and insurance", level: "facility" },
      { name: "electrical power consumed per machine-hour", level: "unit" },
      { name: "quality testing of each unit produced", level: "unit" },
      {
        name: "moving a batch of materials to the production line",
        level: "batch",
      },
      { name: "product-specific tooling and dies", level: "product" },
      { name: "plant manager salary", level: "facility" },
      { name: "order processing (one order per customer)", level: "batch" },
      { name: "product line research and development", level: "product" },
      { name: "depreciation on factory building", level: "facility" },
    ];
    // Pick three activities, ensuring variety in levels
    const shuffled = activityPool.slice().sort(() => Math.random() - 0.5);
    const selected = [];
    const usedLevels = new Set();
    for (const a of shuffled) {
      if (
        selected.length < 3 &&
        (!usedLevels.has(a.level) || selected.length >= 2)
      ) {
        selected.push(a);
        usedLevels.add(a.level);
      }
      if (selected.length === 3) break;
    }

    return {
      company,
      activity1: selected[0],
      activity2: selected[1],
      activity3: selected[2],
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is reviewing its activity-based costing system and
    wants to ensure each activity is classified at the correct level of the cost
    hierarchy. The four hierarchy levels are:</p>
    <ul style="margin-left:var(--space-4);">
      <li><strong>Unit-level</strong> — performed for each individual unit produced</li>
      <li><strong>Batch-level</strong> — performed once per batch, regardless of batch size</li>
      <li><strong>Product-sustaining</strong> — performed to support an entire product line</li>
      <li><strong>Facility-sustaining</strong> — performed to operate the facility, not tied to any product</li>
    </ul>
  `,

  given: (data) => [
    { label: "Activity 1", value: data.activity1.name },
    { label: "Activity 2", value: data.activity2.name },
    { label: "Activity 3", value: data.activity3.name },
  ],

  steps: [
    {
      id: "classify-1",
      type: "choice",
      question: `At which level is "${(data) => data.activity1?.name || "activity 1"}" performed?`,
      options: [
        { id: "unit", label: "Unit-level" },
        { id: "batch", label: "Batch-level" },
        { id: "product", label: "Product-sustaining" },
        { id: "facility", label: "Facility-sustaining" },
      ],
      correctId: (data) => data.activity1.level,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Hierarchy Level",
          values: `"${data.activity1.name}"`,
          result: `${correctId}-level`,
          highlight: true,
          note:
            correctId === "unit"
              ? "Performed for each unit produced."
              : correctId === "batch"
                ? "Performed once per batch, regardless of batch size."
                : correctId === "product"
                  ? "Supports an entire product line, regardless of volume."
                  : "Operates the facility itself; not tied to any specific product or batch.",
        },
      ],
    },
    {
      id: "classify-2",
      type: "choice",
      question: `At which level is "${(data) => data.activity2?.name || "activity 2"}" performed?`,
      options: [
        { id: "unit", label: "Unit-level" },
        { id: "batch", label: "Batch-level" },
        { id: "product", label: "Product-sustaining" },
        { id: "facility", label: "Facility-sustaining" },
      ],
      correctId: (data) => data.activity2.level,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Hierarchy Level",
          values: `"${data.activity2.name}"`,
          result: `${correctId}-level`,
          highlight: true,
        },
      ],
    },
    {
      id: "classify-3",
      type: "choice",
      question: `At which level is "${(data) => data.activity3?.name || "activity 3"}" performed?`,
      options: [
        { id: "unit", label: "Unit-level" },
        { id: "batch", label: "Batch-level" },
        { id: "product", label: "Product-sustaining" },
        { id: "facility", label: "Facility-sustaining" },
      ],
      correctId: (data) => data.activity3.level,
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Hierarchy Level",
          values: `"${data.activity3.name}"`,
          result: `${correctId}-level`,
          highlight: true,
          note: "Correct classification matters because batch- and product-level costs are particularly susceptible to mis-allocation under traditional volume-based costing.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — TDABC Time Equation
// ============================================================================

export const tdabcTimeEquation = {
  id: "ch05-tdabc",
  title: "Time-Driven ABC",
  chapter: 5,
  difficulty: "intermediate",
  estimatedMinutes: 6,
  description:
    "Build a TDABC capacity rate and apply a time equation to two transaction types with different characteristics.",
  reviewChapters: CH05_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "service" });

    // Department cost and employees
    const numEmployees = randomInRange(10, 25, 1);
    const annualCostPerEmployee = roundToNearest(
      randomInRange(40000, 70000),
      1000,
    );
    const totalDeptCost = numEmployees * annualCostPerEmployee;

    // Practical capacity: ~80% of theoretical 2080 hrs/yr
    const productiveHoursPerEmployee = roundToNearest(
      randomInRange(1450, 1700),
      10,
    );
    const totalProductiveHours = numEmployees * productiveHoursPerEmployee;

    // Convert to minutes for time-equation math
    const totalProductiveMinutes = totalProductiveHours * 60;
    const ratePerMinute = roundTo(totalDeptCost / totalProductiveMinutes, 3);

    // Two transaction types
    // Standard transaction: base time only
    const baseMinutes = randomInRange(8, 15, 1);
    // Complex transaction: base time + per-item time
    const perItemMinutes = roundTo(randomInRange(15, 35, 1) / 10, 1); // 1.5 to 3.5 min per item
    const itemsInComplex = randomInRange(5, 12, 1);

    return {
      company,
      numEmployees,
      annualCostPerEmployee,
      totalDeptCost,
      productiveHoursPerEmployee,
      totalProductiveHours,
      totalProductiveMinutes,
      ratePerMinute,
      baseMinutes,
      perItemMinutes,
      itemsInComplex,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} operates a customer service department with
    <strong>${data.numEmployees} representatives</strong>. Total annual department
    cost is <strong>$${data.totalDeptCost.toLocaleString()}</strong> (salaries,
    benefits, occupancy, equipment). Each representative provides about
    <strong>${data.productiveHoursPerEmployee.toLocaleString()} productive hours</strong>
    per year (after vacations, training, and breaks).</p>
    <p>The department processes two types of transactions:
    <strong>standard inquiries</strong> take ${data.baseMinutes} minutes to handle,
    and <strong>complex tickets</strong> take ${data.baseMinutes} minutes baseline
    PLUS ${data.perItemMinutes} minutes for each line item to resolve.</p>
  `,

  given: (data) => [
    { label: "Department employees", value: `${data.numEmployees}` },
    {
      label: "Annual department cost",
      value: `$${data.totalDeptCost.toLocaleString()}`,
    },
    {
      label: "Productive hrs per employee",
      value: `${data.productiveHoursPerEmployee.toLocaleString()}`,
    },
    { label: "Standard transaction time", value: `${data.baseMinutes} min` },
    {
      label: "Complex transaction time",
      value: `${data.baseMinutes} + ${data.perItemMinutes} per item`,
    },
  ],

  steps: [
    {
      id: "cost-per-minute",
      question: "What is the TDABC cost rate per minute of practical capacity?",
      resultType: "money-small",
      unit: "$ per minute",
      tolerance: { value: 0.01, type: "absolute" },
      solve: (data) =>
        roundTo(data.totalDeptCost / data.totalProductiveMinutes, 3),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Total Practical Capacity (minutes)",
          formula: "Employees × Productive Hrs × 60",
          values: `${data.numEmployees} × ${data.productiveHoursPerEmployee.toLocaleString()} × 60`,
          result: `${data.totalProductiveMinutes.toLocaleString()} min`,
        },
        {
          label: "Cost per Minute",
          formula: "Total Department Cost ÷ Practical Capacity Minutes",
          values: `$${data.totalDeptCost.toLocaleString()} ÷ ${data.totalProductiveMinutes.toLocaleString()}`,
          result: `$${correctValue} per minute`,
          highlight: true,
          note: "TDABC uses practical capacity (not theoretical) to avoid spreading idle-time costs over actual transactions.",
        },
      ],
    },
    {
      id: "cost-standard",
      question: "What is the cost to process ONE standard transaction?",
      resultType: "money-small",
      unit: "$",
      tolerance: { value: 0.1, type: "absolute" },
      solve: (data, prior) =>
        roundTo(prior["cost-per-minute"] * data.baseMinutes, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Standard Transaction Cost",
          formula: "Rate per Minute × Standard Minutes",
          values: `$${prior["cost-per-minute"]} × ${data.baseMinutes}`,
          result: `$${correctValue}`,
          highlight: true,
          annotation: carryForwardNote(
            "cost-per-minute",
            "1",
            prior,
            studentAnswers,
            (v) => `$${v}`,
          ),
        },
      ],
    },
    {
      id: "cost-complex",
      question: `What is the cost to process ONE complex transaction with ${(data) => data.itemsInComplex || "multiple"} line items?`,
      resultType: "money-small",
      unit: "$",
      tolerance: { value: 0.25, type: "absolute" },
      solve: (data, prior) => {
        const totalMinutes =
          data.baseMinutes + data.perItemMinutes * data.itemsInComplex;
        return roundTo(prior["cost-per-minute"] * totalMinutes, 2);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const totalMinutes =
          data.baseMinutes + data.perItemMinutes * data.itemsInComplex;
        return [
          {
            label: "Time Equation",
            formula: "Base + (Per-Item × Item Count)",
            values: `${data.baseMinutes} + (${data.perItemMinutes} × ${data.itemsInComplex})`,
            result: `${roundTo(totalMinutes, 1)} min`,
          },
          {
            label: "Complex Transaction Cost",
            formula: "Rate per Minute × Total Minutes",
            values: `$${prior["cost-per-minute"]} × ${roundTo(totalMinutes, 1)}`,
            result: `$${correctValue}`,
            highlight: true,
            annotation: carryForwardNote(
              "cost-per-minute",
              "1",
              prior,
              studentAnswers,
              (v) => `$${v}`,
            ),
            note: "TDABC time equations easily handle transaction complexity — the same equation costs both simple and complex variations.",
          },
        ];
      },
    },
    {
      id: "tdabc-advantage",
      type: "choice",
      question: "What is the primary advantage of TDABC over traditional ABC?",
      options: [
        {
          id: "simpler-data",
          label:
            "Requires only two estimates (cost per time unit, time per activity) rather than driver volumes for many activities",
        },
        {
          id: "more-accurate",
          label: "Always produces more accurate costs than traditional ABC",
        },
        {
          id: "no-overhead",
          label: "Eliminates the need to allocate overhead at all",
        },
        {
          id: "lower-rates",
          label:
            "Produces lower per-unit costs because it uses practical capacity",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "simpler-data",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "TDABC Advantage",
          formula: "Simpler data collection",
          values:
            "Traditional ABC requires driver volumes for every activity. TDABC needs only (1) cost per time unit and (2) time per transaction type.",
          result: "Lower data-collection burden, easier to update",
          highlight: true,
          note: "Kaplan and Anderson designed TDABC specifically to address the high maintenance cost of traditional ABC systems. It also surfaces unused capacity directly.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — ABM Decision: Product Rationalization
// ============================================================================

export const abmProductRationalization = {
  id: "ch05-abm-rationalization",
  title: "ABM — Product Line Decision",
  chapter: 5,
  difficulty: "advanced",
  estimatedMinutes: 8,
  description:
    "ABC has revealed that an apparently profitable product line is actually losing money. Use the data to decide.",
  reviewChapters: CH05_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "manufacturing" });
    const product = randomProduct({ category: "manufacturing" });

    const annualRevenue = roundToNearest(randomInRange(180000, 500000), 5000);
    const grossMarginPct = randomInRange(35, 50, 1) / 100;
    const grossMargin = Math.round(annualRevenue * grossMarginPct);

    // Traditional system shows reasonable profit
    const traditionalAllocatedOH = roundToNearest(
      (grossMargin * randomInRange(40, 60, 5)) / 100,
      1000,
    );
    const traditionalOperatingIncome = grossMargin - traditionalAllocatedOH;

    // ABC reveals much higher allocation (heavy batch/product-sustaining usage)
    const abcMultiplier = roundTo(randomInRange(150, 230, 5) / 100, 2); // 1.5x to 2.3x
    const abcAllocatedOH = Math.round(traditionalAllocatedOH * abcMultiplier);
    const abcOperatingIncome = grossMargin - abcAllocatedOH;

    // Avoidable costs if dropped (most ABC OH is avoidable since it's activity-driven)
    const avoidablePct = randomInRange(75, 95, 5) / 100;
    const avoidableOH = Math.round(abcAllocatedOH * avoidablePct);
    const unavoidableOH = abcAllocatedOH - avoidableOH;

    return {
      company,
      product,
      annualRevenue,
      grossMargin,
      grossMarginPct,
      traditionalAllocatedOH,
      traditionalOperatingIncome,
      abcMultiplier,
      abcAllocatedOH,
      abcOperatingIncome,
      avoidableOH,
      unavoidableOH,
      avoidablePct,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} has long believed its ${data.product.singular} line is
    profitable. Annual revenue is <strong>$${data.annualRevenue.toLocaleString()}</strong>,
    gross margin is <strong>$${data.grossMargin.toLocaleString()}</strong>
    (${(data.grossMarginPct * 100).toFixed(0)}%), and the traditional costing
    system allocates <strong>$${data.traditionalAllocatedOH.toLocaleString()}</strong>
    of overhead, leaving operating income of
    <strong>$${data.traditionalOperatingIncome.toLocaleString()}</strong>.</p>
    <p>A recent ABC analysis has revealed that the ${data.product.singular} line
    actually consumes far more activity than traditional costing suggested.
    Under ABC, total overhead allocation rises to
    <strong>$${data.abcAllocatedOH.toLocaleString()}</strong>. Of that ABC overhead,
    <strong>$${data.avoidableOH.toLocaleString()}</strong> would be eliminated if
    the product line were dropped; the remaining
    <strong>$${data.unavoidableOH.toLocaleString()}</strong> represents allocated
    facility-sustaining costs that would persist.</p>
  `,

  given: (data) => [
    { label: "Revenue", value: `$${data.annualRevenue.toLocaleString()}` },
    { label: "Gross margin", value: `$${data.grossMargin.toLocaleString()}` },
    {
      label: "Traditional OH allocation",
      value: `$${data.traditionalAllocatedOH.toLocaleString()}`,
    },
    {
      label: "ABC OH allocation",
      value: `$${data.abcAllocatedOH.toLocaleString()}`,
    },
    {
      label: "Avoidable OH if dropped",
      value: `$${data.avoidableOH.toLocaleString()}`,
    },
    {
      label: "Unavoidable OH",
      value: `$${data.unavoidableOH.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "abc-reported-oi",
      question:
        "What is the operating income for the product line under ABC (after the new allocation)?",
      resultType: "money-large",
      unit: "$",
      solve: (data) => data.abcOperatingIncome,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Operating Income Under ABC",
          formula: "Gross Margin − ABC Allocated OH",
          values: `$${data.grossMargin.toLocaleString()} − $${data.abcAllocatedOH.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: "ABC reveals the true picture — the higher allocation reflects the line's actual activity consumption, not a change in operations.",
        },
      ],
    },
    {
      id: "oi-impact-if-dropped",
      question:
        "What is the change in TOTAL firm operating income if the product line is dropped? (Negative = decrease, positive = increase.)",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data) => data.avoidableOH - data.grossMargin,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Lost Gross Margin",
          values: `−$${data.grossMargin.toLocaleString()}`,
        },
        {
          label: "Avoidable Cost Savings",
          values: `+$${data.avoidableOH.toLocaleString()}`,
        },
        {
          label: "Net Impact on Firm OI",
          formula:
            "Avoidable Costs − Gross Margin (unavoidable OH is irrelevant)",
          values: `$${data.avoidableOH.toLocaleString()} − $${data.grossMargin.toLocaleString()}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          note: `Unavoidable allocated OH of $${data.unavoidableOH.toLocaleString()} persists regardless — irrelevant to the decision.`,
        },
      ],
    },
    {
      id: "drop-decision",
      type: "choice",
      question:
        "Based on the relevant-cost analysis (not the ABC operating income), should the company drop the product line?",
      options: [
        {
          id: "keep",
          label:
            "Keep — the line still covers its avoidable costs and contributes to unavoidable corporate overhead",
        },
        {
          id: "drop",
          label:
            "Drop — avoidable costs exceed gross margin; firm income rises if dropped",
        },
        {
          id: "drop-abc-loss",
          label:
            "Drop — the ABC analysis shows a loss, so the line is unprofitable",
        },
        {
          id: "depends-on-substitute",
          label:
            "Cannot decide without knowing what would replace the freed capacity",
        },
      ],
      correctId: (data) =>
        data.avoidableOH > data.grossMargin ? "drop" : "keep",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Decision Rule",
          formula:
            "Drop if firm OI rises (avoidable savings > lost gross margin)",
          values: `Avoidable $${data.avoidableOH.toLocaleString()} vs Gross Margin $${data.grossMargin.toLocaleString()}`,
          result: correctId === "drop" ? "Drop" : "Keep",
          highlight: true,
          note: "The ABC reported loss is misleading because it includes unavoidable allocated overhead. The right question is always: would total firm income rise or fall?",
        },
      ],
    },
    {
      id: "abm-action",
      type: "choice",
      question:
        "Suppose the decision is to KEEP the line. What ABM (activity-based management) action would best improve its profitability?",
      options: [
        {
          id: "reduce-activity",
          label:
            "Identify and reduce the activities driving the heavy ABC allocation (e.g., consolidate batches, eliminate non-value-added activities)",
        },
        {
          id: "raise-price",
          label: "Raise the price by enough to cover the ABC allocation",
        },
        {
          id: "switch-to-traditional",
          label:
            "Switch back to traditional costing so the line looks profitable again",
        },
        {
          id: "allocate-elsewhere",
          label: "Reassign the overhead allocation to a different product line",
        },
      ],
      intentionalSingleAnswer: true,
      correctId: () => "reduce-activity",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "ABM Decision Framework",
          formula: "ABM uses ABC information to drive operational improvement",
          values:
            "Cost drivers reveal which activities are expensive. Reducing or eliminating those activities directly reduces cost.",
          result: "Reduce the underlying activity, not the reported cost",
          highlight: true,
          note: "Raising prices may not be feasible competitively. Switching costing methods doesn't change actual cash flow. The point of ABM is to use ABC insights to change operations.",
        },
      ],
    },
    {
      id: "price-floor",
      question:
        "What is the minimum price reduction the product line could absorb (per dollar of current revenue) before the keep/drop decision flips?",
      resultType: "percent",
      unit: "%",
      tolerance: { value: 1, type: "absolute" },
      solve: (data) => {
        // Current: gross margin > avoidable OH means keep
        // Flip point: gross margin = avoidable OH
        // gross margin = revenue × gm%, but gm% may also change with price
        // Simplification: assume variable costs scale with revenue → use current gross margin %
        const marginReductionAllowed = data.grossMargin - data.avoidableOH;
        if (marginReductionAllowed <= 0) return 0; // Already losing money
        const revenueDeclineAllowed =
          marginReductionAllowed / data.grossMarginPct;
        return roundTo((revenueDeclineAllowed / data.annualRevenue) * 100, 1);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const marginReductionAllowed = data.grossMargin - data.avoidableOH;
        return [
          {
            label: "Gross Margin Buffer",
            formula: "Current Gross Margin − Avoidable OH",
            values: `$${data.grossMargin.toLocaleString()} − $${data.avoidableOH.toLocaleString()}`,
            result: `$${marginReductionAllowed.toLocaleString()} of margin can be lost`,
          },
          {
            label: "Maximum Revenue Decline",
            formula: "Margin Buffer ÷ Gross Margin %",
            values: `$${marginReductionAllowed.toLocaleString()} ÷ ${(data.grossMarginPct * 100).toFixed(0)}%`,
            result: `${correctValue}% of current revenue`,
            highlight: true,
            note:
              marginReductionAllowed <= 0
                ? "The line is already losing money on a relevant-cost basis — no further price reduction is acceptable."
                : "Beyond this revenue decline, dropping the line becomes economically preferred.",
          },
        ];
      },
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const ch05Problems = [
  singleDriverAllocation,
  abcVsTraditional,
  costHierarchyClassification,
  tdabcTimeEquation,
  abmProductRationalization,
];
