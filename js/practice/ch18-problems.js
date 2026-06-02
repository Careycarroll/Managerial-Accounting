// js/practice/ch18-problems.js
// Chapter 18 — Process Costing
// Pass 2 problems — physical-units flow, equivalent units, cost per equivalent
// unit (weighted average and FIFO), and process costing with spoilage.

import {
  randomInRange,
  roundTo,
  roundToNearest,
  ensureGreaterThan,
} from "./practice-engine.js";
import { randomCompany, randomProduct } from "./scenario-pools.js";

const BASE = import.meta.env.BASE_URL;

const CH18_REVIEW = [
  { label: "Ch. 18 — Process Costing", href: `${BASE}pages/learn/ch18.html` },
];

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
// Problem 1 — Physical Units Flow
// ============================================================================

export const physicalUnitsFlow = {
  id: "ch18-physical-flow",
  title: "Physical Units Flow",
  chapter: 18,
  difficulty: "foundation",
  estimatedMinutes: 5,
  description:
    "Reconcile the physical units flowing through a processing department.",
  reviewChapters: CH18_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "process" });
    const product = randomProduct({ category: "process" });

    const beginWIP = roundToNearest(randomInRange(2000, 8000), 100);
    const started = roundToNearest(randomInRange(20000, 60000), 500);
    const endWIP = roundToNearest(randomInRange(2000, 10000), 100);
    const transferred = beginWIP + started - endWIP;

    return { company, product, beginWIP, started, endWIP, transferred };
  },

  scenario: (data) => `
    <p>${data.company.name} processes ${data.product.plural} through a continuous
    operation. During the month, the processing department had
    <strong>${data.beginWIP.toLocaleString()} units</strong> in beginning
    work-in-process and started another <strong>${data.started.toLocaleString()}
    units</strong>. At month-end, <strong>${data.endWIP.toLocaleString()} units</strong>
    remained in ending work-in-process.</p>
  `,

  given: (data) => [
    {
      label: "Beginning WIP",
      value: `${data.beginWIP.toLocaleString()} units`,
    },
    { label: "Units started", value: `${data.started.toLocaleString()} units` },
    { label: "Ending WIP", value: `${data.endWIP.toLocaleString()} units` },
  ],

  steps: [
    {
      id: "units-accounted",
      question:
        "What is the total number of units to account for (Beginning WIP + Started)?",
      resultType: "units",
      unit: "units",
      solve: (data) => data.beginWIP + data.started,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Units to Account For",
          formula: "Beginning WIP + Units Started",
          values: `${data.beginWIP.toLocaleString()} + ${data.started.toLocaleString()}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          note: "This must equal units transferred out + ending WIP — the flow equation that anchors process costing.",
        },
      ],
    },
    {
      id: "units-transferred",
      question: "How many units were transferred out (completed)?",
      resultType: "units",
      unit: "units",
      solve: (data) => data.beginWIP + data.started - data.endWIP,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Units Transferred Out",
          formula: "(Beginning WIP + Started) − Ending WIP",
          values: `(${data.beginWIP.toLocaleString()} + ${data.started.toLocaleString()}) − ${data.endWIP.toLocaleString()}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
        },
      ],
    },
    {
      id: "units-accounted-verification",
      question: "Verify: Units transferred out + Ending WIP = how many?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) => prior["units-transferred"] + data.endWIP,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Flow Equation Check",
          formula: "Transferred Out + Ending WIP",
          values: `${prior["units-transferred"].toLocaleString()} + ${data.endWIP.toLocaleString()}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          annotation: carryForwardNote(
            "units-transferred",
            "2",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
          note: "This should equal the Units to Account For from Step 1 — that's the flow equation that anchors process costing.",
        },
      ],
    },
    {
      id: "why-track-flow",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Why is the physical-units flow tracked separately from the cost flow in process costing?",
      options: [
        {
          id: "separate-then-combine",
          label:
            "Tracking units first ensures the count reconciles, then EU calculations and cost allocations can be performed on a verified physical-unit base",
        },
        {
          id: "gaap-requires",
          label: "GAAP requires physical units to be tracked before costs",
        },
        {
          id: "tax-purposes",
          label: "Tax authorities require unit-by-unit tracking",
        },
        {
          id: "no-real-reason",
          label: "It's just a habit — both could be done together",
        },
      ],
      correctId: () => "separate-then-combine",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Why Separate Tracking",
          formula: "Physical flow → Equivalent units → Costs",
          values:
            "Verifying the physical flow first catches counting errors before they propagate into cost calculations.",
          result:
            "The two-step structure isolates physical errors from cost errors",
          highlight: true,
          note: "This is the standard Horngren methodology: Step 1 (physical units) → Step 2 (equivalent units) → Step 3 (costs per EU) → Step 4 (cost assignment). Each step builds on the previous.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 2 — Equivalent Units (Weighted Average)
// ============================================================================

export const equivalentUnitsWeightedAvg = {
  id: "ch18-eu-weighted-avg",
  title: "Equivalent Units — Weighted Average",
  chapter: 18,
  difficulty: "foundation",
  estimatedMinutes: 6,
  description:
    "Compute equivalent units for materials (added at start) and conversion costs (added evenly).",
  reviewChapters: CH18_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "process" });
    const product = randomProduct({ category: "process" });

    const transferred = roundToNearest(randomInRange(15000, 35000), 500);
    const endWIP = roundToNearest(randomInRange(2000, 6000), 100);
    const endConvPct = randomInRange(20, 80, 5);

    return { company, product, transferred, endWIP, endConvPct };
  },

  scenario: (data) => `
    <p>${data.company.name} produces ${data.product.plural} through a continuous
    process. During the month, <strong>${data.transferred.toLocaleString()} units</strong>
    were transferred out and <strong>${data.endWIP.toLocaleString()} units</strong>
    remained in ending WIP, <strong>${data.endConvPct}% complete with respect to
    conversion costs</strong>. Direct materials are added at the START of the
    process; conversion costs are incurred evenly throughout.</p>
  `,

  given: (data) => [
    {
      label: "Units transferred out",
      value: `${data.transferred.toLocaleString()}`,
    },
    { label: "Ending WIP units", value: `${data.endWIP.toLocaleString()}` },
    { label: "Ending WIP — conversion %", value: `${data.endConvPct}%` },
    { label: "Materials added at", value: "Start of process" },
  ],

  steps: [
    {
      id: "eu-materials",
      question: "What are the equivalent units for direct MATERIALS?",
      resultType: "units",
      unit: "EU",
      solve: (data) => data.transferred + data.endWIP,
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "EU — Direct Materials",
          formula: "Transferred Out × 100% + Ending WIP × 100%",
          values: `${data.transferred.toLocaleString()} + ${data.endWIP.toLocaleString()}`,
          result: `${correctValue.toLocaleString()} EU`,
          highlight: true,
          note: "Since materials are added at the start, all units in ending WIP are 100% complete for materials, even though they are not yet 100% complete for conversion.",
        },
      ],
    },
    {
      id: "eu-conversion",
      question: "What are the equivalent units for CONVERSION costs?",
      resultType: "units",
      unit: "EU",
      solve: (data) =>
        data.transferred + Math.round((data.endWIP * data.endConvPct) / 100),
      showWork: (data, prior, studentAnswers, correctValue) => {
        const endWIPConvEU = Math.round((data.endWIP * data.endConvPct) / 100);
        return [
          {
            label: "Transferred Out (100% complete)",
            values: `${data.transferred.toLocaleString()} × 100%`,
            result: `${data.transferred.toLocaleString()} EU`,
          },
          {
            label: `Ending WIP (${data.endConvPct}% complete)`,
            values: `${data.endWIP.toLocaleString()} × ${data.endConvPct}%`,
            result: `${endWIPConvEU.toLocaleString()} EU`,
          },
          {
            label: "EU — Conversion Costs",
            formula: "Transferred Out × 100% + Ending WIP × Completion %",
            values: `${data.transferred.toLocaleString()} + ${endWIPConvEU.toLocaleString()}`,
            result: `${correctValue.toLocaleString()} EU`,
            highlight: true,
          },
        ];
      },
    },
    {
      id: "eu-difference",
      question:
        "What is the difference between materials EU and conversion EU?",
      resultType: "units",
      unit: "EU",
      solve: (data, prior) => prior["eu-materials"] - prior["eu-conversion"],
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "EU Difference",
          formula: "Materials EU − Conversion EU",
          values: `${prior["eu-materials"].toLocaleString()} − ${prior["eu-conversion"].toLocaleString()}`,
          result: `${correctValue.toLocaleString()} EU`,
          highlight: true,
          note: "Materials EU exceed conversion EU because materials are fully attached at the start, while ending WIP is only partially complete for conversion.",
        },
      ],
    },
    {
      id: "why-different-eu",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Why do materials EU and conversion EU differ for the same physical units?",
      options: [
        {
          id: "different-completion",
          label:
            "Materials and conversion are added at different points in the process, so the completion percentage differs for ending WIP",
        },
        {
          id: "different-cost",
          label: "Materials and conversion have different unit costs",
        },
        {
          id: "different-quality",
          label: "Materials and conversion have different quality standards",
        },
        {
          id: "no-good-reason",
          label: "It's a calculation error — they should always be equal",
        },
      ],
      correctId: () => "different-completion",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Different Cost Inputs, Different EU",
          formula: "Each cost element has its own completion %",
          values: `Materials: 100% in ending WIP (added at start). Conversion: ${data.endConvPct}% in ending WIP (added evenly).`,
          result: "Separate EU columns for each cost element",
          highlight: true,
          note: "This is why process costing tables almost always have TWO equivalent-units columns — one for materials, one for conversion. Same units, different completion stages.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 3 — Cost per Equivalent Unit
// ============================================================================

export const costPerEquivalentUnit = {
  id: "ch18-cost-per-eu",
  title: "Cost per Equivalent Unit",
  chapter: 18,
  difficulty: "intermediate",
  estimatedMinutes: 7,
  description:
    "Calculate the cost per equivalent unit and assign costs to units transferred out vs ending WIP.",
  reviewChapters: CH18_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "process" });

    const transferred = roundToNearest(randomInRange(20000, 40000), 500);
    const endWIP = roundToNearest(randomInRange(2500, 6000), 100);
    const endConvPct = randomInRange(30, 70, 5);

    // Materials EU = transferred + endWIP (added at start)
    const matEU = transferred + endWIP;
    // Conversion EU = transferred + endWIP * conv%
    const convEU = transferred + Math.round((endWIP * endConvPct) / 100);

    // Total cost in each pool (beginning WIP + current period)
    const matCostTotal = roundToNearest(randomInRange(80000, 200000), 1000);
    const convCostTotal = roundToNearest(randomInRange(150000, 400000), 1000);

    const costPerMat = roundTo(matCostTotal / matEU, 2);
    const costPerConv = roundTo(convCostTotal / convEU, 2);

    return {
      company,
      transferred,
      endWIP,
      endConvPct,
      matEU,
      convEU,
      matCostTotal,
      convCostTotal,
      costPerMat,
      costPerConv,
    };
  },

  scenario: (data) => `
    <p>${data.company.name}'s processing department has computed the following
    equivalent units and total costs for the period:</p>
    <ul style="margin-left:var(--space-4);">
      <li>Materials: <strong>${data.matEU.toLocaleString()} EU</strong>,
        total cost <strong>$${data.matCostTotal.toLocaleString()}</strong></li>
      <li>Conversion: <strong>${data.convEU.toLocaleString()} EU</strong>,
        total cost <strong>$${data.convCostTotal.toLocaleString()}</strong></li>
    </ul>
    <p>Units transferred out: <strong>${data.transferred.toLocaleString()}</strong>.
    Ending WIP: <strong>${data.endWIP.toLocaleString()} units</strong> at
    <strong>${data.endConvPct}% complete for conversion</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Transferred out",
      value: `${data.transferred.toLocaleString()} units`,
    },
    { label: "Ending WIP units", value: `${data.endWIP.toLocaleString()}` },
    { label: "Ending WIP conv %", value: `${data.endConvPct}%` },
    {
      label: "Materials EU / cost",
      value: `${data.matEU.toLocaleString()} EU / $${data.matCostTotal.toLocaleString()}`,
    },
    {
      label: "Conversion EU / cost",
      value: `${data.convEU.toLocaleString()} EU / $${data.convCostTotal.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "cost-per-mat-eu",
      question: "What is the cost per equivalent unit of MATERIALS?",
      resultType: "money-small",
      unit: "$ per EU",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data) => roundTo(data.matCostTotal / data.matEU, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Cost per Materials EU",
          formula: "Total Materials Cost ÷ Materials EU",
          values: `$${data.matCostTotal.toLocaleString()} ÷ ${data.matEU.toLocaleString()}`,
          result: `$${correctValue}`,
          highlight: true,
        },
      ],
    },
    {
      id: "cost-per-conv-eu",
      question: "What is the cost per equivalent unit of CONVERSION?",
      resultType: "money-small",
      unit: "$ per EU",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data) => roundTo(data.convCostTotal / data.convEU, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Cost per Conversion EU",
          formula: "Total Conversion Cost ÷ Conversion EU",
          values: `$${data.convCostTotal.toLocaleString()} ÷ ${data.convEU.toLocaleString()}`,
          result: `$${correctValue}`,
          highlight: true,
        },
      ],
    },
    {
      id: "cost-transferred-out",
      question: "What is the total cost of units transferred out?",
      resultType: "money-large",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data, prior) =>
        Math.round(
          (prior["cost-per-mat-eu"] + prior["cost-per-conv-eu"]) *
            data.transferred,
        ),
      showWork: (data, prior, studentAnswers, correctValue) => {
        const totalPerUnit =
          prior["cost-per-mat-eu"] + prior["cost-per-conv-eu"];
        return [
          {
            label: "Cost per Completed Unit",
            formula: "Materials cost/EU + Conversion cost/EU",
            values: `$${prior["cost-per-mat-eu"]} + $${prior["cost-per-conv-eu"]}`,
            result: `$${roundTo(totalPerUnit, 2)}`,
          },
          {
            label: "Cost of Units Transferred",
            formula: "Per-Unit Cost × Units Transferred",
            values: `$${roundTo(totalPerUnit, 2)} × ${data.transferred.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            annotation:
              carryForwardNote(
                "cost-per-mat-eu",
                "1",
                prior,
                studentAnswers,
                (v) => `$${v}`,
              ) ||
              carryForwardNote(
                "cost-per-conv-eu",
                "2",
                prior,
                studentAnswers,
                (v) => `$${v}`,
              ),
          },
        ];
      },
    },
    {
      id: "cost-ending-wip",
      question: "What is the total cost of units in ENDING WIP?",
      resultType: "money-medium",
      unit: "$",
      tolerance: { value: 1, type: "percent" },
      solve: (data, prior) => {
        const matCost = data.endWIP * prior["cost-per-mat-eu"];
        const convCost =
          ((data.endWIP * data.endConvPct) / 100) * prior["cost-per-conv-eu"];
        return Math.round(matCost + convCost);
      },
      showWork: (data, prior, studentAnswers, correctValue) => {
        const matCost = Math.round(data.endWIP * prior["cost-per-mat-eu"]);
        const convCost = Math.round(
          ((data.endWIP * data.endConvPct) / 100) * prior["cost-per-conv-eu"],
        );
        return [
          {
            label: "Materials Cost in Ending WIP",
            formula: "Ending WIP × 100% × Cost/Mat EU",
            values: `${data.endWIP.toLocaleString()} × $${prior["cost-per-mat-eu"]}`,
            result: `$${matCost.toLocaleString()}`,
          },
          {
            label: "Conversion Cost in Ending WIP",
            formula: "Ending WIP × Completion % × Cost/Conv EU",
            values: `${data.endWIP.toLocaleString()} × ${data.endConvPct}% × $${prior["cost-per-conv-eu"]}`,
            result: `$${convCost.toLocaleString()}`,
          },
          {
            label: "Total Ending WIP Cost",
            formula: "Materials cost + Conversion cost",
            values: `$${matCost.toLocaleString()} + $${convCost.toLocaleString()}`,
            result: `$${correctValue.toLocaleString()}`,
            highlight: true,
            note: "Notice: Materials in ending WIP use FULL EU (added at start), but conversion uses only the completion %.",
          },
        ];
      },
    },
    {
      id: "cost-assignment-rule",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "Why must cost per EU be computed separately for materials and conversion?",
      options: [
        {
          id: "different-completion",
          label:
            "Materials and conversion accumulate at different points in production — units at different stages have different completion percentages for each cost element",
        },
        {
          id: "different-units",
          label:
            "Materials and conversion are measured in different physical units",
        },
        { id: "tax-rules", label: "Tax rules require separate per-EU costing" },
        {
          id: "gaap-requires",
          label: "GAAP requires the two-column treatment",
        },
      ],
      correctId: () => "different-completion",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "The Two-Column Principle",
          formula:
            "Different completion percentages → different EU → different cost/EU",
          values:
            "Ending WIP could be 100% complete for materials but 30% for conversion — combining them would distort both.",
          result:
            "Separate columns preserve the economic relationships in each cost pool",
          highlight: true,
          note: "This is the foundational insight of process costing. The two-column treatment scales to three, four, or more cost elements with multiple addition points.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 4 — FIFO vs Weighted-Average Comparison
// ============================================================================

export const fifoVsWeightedAvg = {
  id: "ch18-fifo-vs-wa",
  title: "FIFO vs Weighted Average",
  chapter: 18,
  difficulty: "intermediate",
  estimatedMinutes: 7,
  description:
    "Compare cost per equivalent unit under FIFO and weighted average — when they differ and what it means for pricing.",
  reviewChapters: CH18_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "process" });

    // Beginning WIP details (drive the difference)
    const beginWIP = roundToNearest(randomInRange(3000, 8000), 100);
    const beginWIPConvPct = randomInRange(20, 70, 5);
    const beginMatCost = roundToNearest(randomInRange(20000, 50000), 500);
    const beginConvCost = roundToNearest(randomInRange(15000, 40000), 500);

    // Current period
    const started = roundToNearest(randomInRange(25000, 50000), 500);
    const endWIP = roundToNearest(randomInRange(3000, 7000), 100);
    const endConvPct = randomInRange(20, 70, 5);
    const transferred = beginWIP + started - endWIP;

    const currentMatCost = roundToNearest(randomInRange(150000, 350000), 1000);
    const currentConvCost = roundToNearest(randomInRange(180000, 400000), 1000);

    // Weighted-average EU and costs
    const waMatEU = transferred + endWIP;
    const waConvEU = transferred + Math.round((endWIP * endConvPct) / 100);
    const waMatCost = beginMatCost + currentMatCost;
    const waConvCost = beginConvCost + currentConvCost;
    const waPerMat = roundTo(waMatCost / waMatEU, 2);
    const waPerConv = roundTo(waConvCost / waConvEU, 2);

    // FIFO EU: subtract beginning WIP work done last period
    const fifoMatEU = waMatEU - beginWIP; // beginning WIP was 100% materials already
    const fifoConvEU =
      waConvEU - Math.round((beginWIP * beginWIPConvPct) / 100);
    const fifoPerMat = roundTo(currentMatCost / fifoMatEU, 2);
    const fifoPerConv = roundTo(currentConvCost / fifoConvEU, 2);

    return {
      company,
      beginWIP,
      beginWIPConvPct,
      beginMatCost,
      beginConvCost,
      started,
      transferred,
      endWIP,
      endConvPct,
      currentMatCost,
      currentConvCost,
      waMatEU,
      waConvEU,
      waPerMat,
      waPerConv,
      fifoMatEU,
      fifoConvEU,
      fifoPerMat,
      fifoPerConv,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} is comparing FIFO and weighted-average process costing
    for the same production data:</p>
    <ul style="margin-left:var(--space-4);">
      <li>Beginning WIP: ${data.beginWIP.toLocaleString()} units, ${data.beginWIPConvPct}% complete on conversion</li>
      <li>Beginning WIP costs: materials $${data.beginMatCost.toLocaleString()}, conversion $${data.beginConvCost.toLocaleString()}</li>
      <li>Started this period: ${data.started.toLocaleString()} units</li>
      <li>Transferred out: ${data.transferred.toLocaleString()} units</li>
      <li>Ending WIP: ${data.endWIP.toLocaleString()} units, ${data.endConvPct}% complete on conversion</li>
      <li>Current period costs: materials $${data.currentMatCost.toLocaleString()}, conversion $${data.currentConvCost.toLocaleString()}</li>
    </ul>
  `,

  given: (data) => [
    {
      label: "Beginning WIP / conv %",
      value: `${data.beginWIP.toLocaleString()} / ${data.beginWIPConvPct}%`,
    },
    {
      label: "Beginning costs (Mat / Conv)",
      value: `$${data.beginMatCost.toLocaleString()} / $${data.beginConvCost.toLocaleString()}`,
    },
    {
      label: "Transferred / Ending WIP",
      value: `${data.transferred.toLocaleString()} / ${data.endWIP.toLocaleString()}`,
    },
    { label: "Ending conv %", value: `${data.endConvPct}%` },
    {
      label: "Current costs (Mat / Conv)",
      value: `$${data.currentMatCost.toLocaleString()} / $${data.currentConvCost.toLocaleString()}`,
    },
  ],

  steps: [
    {
      id: "wa-cost-per-conv",
      question:
        "Under WEIGHTED AVERAGE, what is the cost per EU of conversion?",
      resultType: "money-small",
      unit: "$ per EU",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data) =>
        roundTo((data.beginConvCost + data.currentConvCost) / data.waConvEU, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "WA Cost per Conversion EU",
          formula: "(Beginning + Current) ÷ Weighted-Avg EU",
          values: `($${data.beginConvCost.toLocaleString()} + $${data.currentConvCost.toLocaleString()}) ÷ ${data.waConvEU.toLocaleString()}`,
          result: `$${correctValue}`,
          highlight: true,
          note: "WA blends prior-period and current costs together.",
        },
      ],
    },
    {
      id: "fifo-cost-per-conv",
      question: "Under FIFO, what is the cost per EU of conversion?",
      resultType: "money-small",
      unit: "$ per EU",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data) => roundTo(data.currentConvCost / data.fifoConvEU, 2),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "FIFO Cost per Conversion EU",
          formula: "Current Period Cost ÷ FIFO EU (current work only)",
          values: `$${data.currentConvCost.toLocaleString()} ÷ ${data.fifoConvEU.toLocaleString()}`,
          result: `$${correctValue}`,
          highlight: true,
          note: "FIFO isolates current-period cost performance — beginning WIP costs are kept separate.",
        },
      ],
    },
    {
      id: "cost-gap",
      question:
        "What is the absolute difference between FIFO and WA cost per conversion EU?",
      resultType: "money-small",
      unit: "$ per EU",
      tolerance: { value: 0.05, type: "absolute" },
      solve: (data, prior) =>
        roundTo(
          Math.abs(prior["fifo-cost-per-conv"] - prior["wa-cost-per-conv"]),
          2,
        ),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Cost Gap",
          formula: "|FIFO − WA|",
          values: `|$${prior["fifo-cost-per-conv"]} − $${prior["wa-cost-per-conv"]}|`,
          result: `$${correctValue}`,
          highlight: true,
          note:
            prior["fifo-cost-per-conv"] > prior["wa-cost-per-conv"]
              ? "FIFO > WA: current period costs are higher than beginning WIP (inflation or efficiency loss)"
              : "FIFO < WA: current period costs are lower than beginning WIP (efficiency gains or deflation)",
        },
      ],
    },
    {
      id: "when-methods-differ",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "When do FIFO and weighted average give very different results?",
      options: [
        {
          id: "cost-changes",
          label:
            "When per-unit costs change significantly between periods (inflation, efficiency improvements, input price swings)",
        },
        {
          id: "no-difference-ever",
          label:
            "They never differ — both methods produce the same per-EU costs",
        },
        {
          id: "only-tax",
          label:
            "Only when calculating taxable income, not for management purposes",
        },
        {
          id: "only-with-spoilage",
          label: "Only when accounting for spoilage and waste",
        },
      ],
      correctId: () => "cost-changes",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "When Methods Diverge",
          formula: "Greater cost-period difference → greater FIFO/WA gap",
          values:
            "If beginning WIP costs equal current costs, FIFO and WA give identical results. The gap measures how much cost has shifted.",
          result:
            "Significant period-over-period cost change is the key driver",
          highlight: true,
          note: "In stable cost environments, the choice between FIFO and WA is purely administrative. In volatile environments, it can materially affect reported per-unit cost and inventory valuation.",
        },
      ],
    },
    {
      id: "fifo-decision-advantage",
      type: "choice",
      intentionalSingleAnswer: true,
      question:
        "For management decision-making, which method generally provides better information?",
      options: [
        {
          id: "fifo-current",
          label:
            "FIFO — isolates current-period cost performance, useful for cost-control analysis and pricing decisions",
        },
        {
          id: "wa-simpler",
          label: "WA — simpler and produces less variation, more reliable",
        },
        { id: "wa-tax-favorable", label: "WA — produces lower taxable income" },
        { id: "never-matters", label: "It never matters for decision-making" },
      ],
      correctId: () => "fifo-current",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "FIFO Decision Advantage",
          formula: "FIFO isolates current-period performance",
          values:
            "WA blends current and prior periods, hiding whether current costs are improving or worsening.",
          result:
            "FIFO is preferred for performance evaluation and pricing decisions",
          highlight: true,
          note: "Many companies use FIFO for internal management reporting (better decision relevance) and WA for external financial reporting (simpler, more stable). The choice should match the use case.",
        },
      ],
    },
  ],
};

// ============================================================================
// Problem 5 — Process Costing with Spoilage
// ============================================================================

export const processCostingSpoilage = {
  id: "ch18-spoilage",
  title: "Process Costing with Spoilage",
  chapter: 18,
  difficulty: "advanced",
  estimatedMinutes: 7,
  description:
    "Distinguish normal from abnormal spoilage and trace how each affects the cost of good units transferred.",
  reviewChapters: CH18_REVIEW,

  randomize: () => {
    const company = randomCompany({ category: "process" });
    const product = randomProduct({ category: "process" });

    const totalUnitsProduced = roundToNearest(randomInRange(20000, 40000), 500);
    const normalSpoilagePct = randomInRange(2, 5, 1) / 100;
    const totalSpoilage = roundToNearest(
      (totalUnitsProduced * randomInRange(4, 10, 1)) / 100,
      50,
    );

    const normalSpoilage = Math.round(totalUnitsProduced * normalSpoilagePct);
    const abnormalSpoilage = Math.max(0, totalSpoilage - normalSpoilage);
    const goodUnits = totalUnitsProduced - totalSpoilage;

    const costPerEU = roundTo(randomInRange(8, 25, 1) + Math.random() * 0.9, 2);

    return {
      company,
      product,
      totalUnitsProduced,
      normalSpoilagePct,
      totalSpoilage,
      normalSpoilage,
      abnormalSpoilage,
      goodUnits,
      costPerEU,
    };
  },

  scenario: (data) => `
    <p>${data.company.name} processes ${data.product.plural} and started
    <strong>${data.totalUnitsProduced.toLocaleString()} units</strong> this period.
    Of these, <strong>${data.totalSpoilage.toLocaleString()} units</strong> were
    spoiled and discarded. Normal spoilage is expected to be
    <strong>${(data.normalSpoilagePct * 100).toFixed(0)}%</strong> of total units
    started (an unavoidable operational waste). The cost per EU for fully
    processed units is <strong>$${data.costPerEU}</strong>.</p>
  `,

  given: (data) => [
    {
      label: "Total units started",
      value: `${data.totalUnitsProduced.toLocaleString()}`,
    },
    {
      label: "Total spoilage",
      value: `${data.totalSpoilage.toLocaleString()} units`,
    },
    {
      label: "Normal spoilage %",
      value: `${(data.normalSpoilagePct * 100).toFixed(0)}%`,
    },
    { label: "Cost per EU", value: `$${data.costPerEU}` },
  ],

  steps: [
    {
      id: "normal-spoilage-units",
      question: "How many units count as NORMAL spoilage?",
      resultType: "units",
      unit: "units",
      solve: (data) =>
        Math.round(data.totalUnitsProduced * data.normalSpoilagePct),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Normal Spoilage",
          formula: "Total Units Started × Normal Spoilage %",
          values: `${data.totalUnitsProduced.toLocaleString()} × ${(data.normalSpoilagePct * 100).toFixed(0)}%`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          note: "Normal spoilage is the unavoidable cost of doing business. It attaches to good units produced.",
        },
      ],
    },
    {
      id: "abnormal-spoilage-units",
      question: "How many units count as ABNORMAL spoilage?",
      resultType: "units",
      unit: "units",
      solve: (data, prior) =>
        Math.max(0, data.totalSpoilage - prior["normal-spoilage-units"]),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Abnormal Spoilage",
          formula: "Total Spoilage − Normal Spoilage",
          values: `${data.totalSpoilage.toLocaleString()} − ${prior["normal-spoilage-units"].toLocaleString()}`,
          result: `${correctValue.toLocaleString()} units`,
          highlight: true,
          note: "Abnormal spoilage is the avoidable cost — signals process problems, lapses in quality control, or unusual events.",
        },
      ],
    },
    {
      id: "cost-to-good-units",
      question:
        "What is the cost of normal spoilage that gets ALLOCATED to good units transferred?",
      resultType: "money-medium",
      unit: "$",
      solve: (data, prior) =>
        Math.round(prior["normal-spoilage-units"] * data.costPerEU),
      showWork: (data, prior, studentAnswers, correctValue) => [
        {
          label: "Cost to Good Units",
          formula: "Normal Spoilage Units × Cost per EU",
          values: `${prior["normal-spoilage-units"].toLocaleString()} × $${data.costPerEU}`,
          result: `$${correctValue.toLocaleString()}`,
          highlight: true,
          annotation: carryForwardNote(
            "normal-spoilage-units",
            "1",
            prior,
            studentAnswers,
            (v) => `${v.toLocaleString()} units`,
          ),
          note: "This cost is absorbed by the good units, effectively raising the per-unit cost of finished output.",
        },
      ],
    },
    {
      id: "spoilage-treatment",
      type: "choice",
      intentionalSingleAnswer: true,
      question: "How are normal and abnormal spoilage treated differently?",
      options: [
        {
          id: "normal-absorbed-abnormal-loss",
          label:
            "Normal spoilage is absorbed by good units (increasing their cost); abnormal spoilage is charged to a Loss From Abnormal Spoilage account on the income statement",
        },
        {
          id: "both-loss-account",
          label: "Both are charged to a single Loss From Spoilage account",
        },
        { id: "both-good-units", label: "Both are absorbed by good units" },
        {
          id: "neither-tracked",
          label:
            "Neither is tracked separately — both are recorded as period expense",
        },
      ],
      correctId: () => "normal-absorbed-abnormal-loss",
      showWork: (data, prior, studentAnswers, correctId) => [
        {
          label: "Different Cost Flows",
          formula: "Normal → good units; Abnormal → separate loss account",
          values:
            "Normal spoilage is treated as a regular cost of production. Abnormal spoilage is a controllable loss that should be highlighted to management.",
          result: "Separate accounting for control purposes",
          highlight: true,
          note: "This treatment lets management see normal spoilage embedded in unit costs (acceptable operational waste) while abnormal spoilage stands out as a control issue requiring attention.",
        },
      ],
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const ch18Problems = [
  physicalUnitsFlow,
  equivalentUnitsWeightedAvg,
  costPerEquivalentUnit,
  fifoVsWeightedAvg,
  processCostingSpoilage,
];
