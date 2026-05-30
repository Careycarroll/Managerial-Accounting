// js/practice/scenario-pools.js
// Scenario pool helpers for narrative-wrapped Practice problems.
// See SPEC.md §2.5 (Pass 2) — narrative scenarios.
//
// Problem authors call randomCompany() / randomProduct() inside randomize()
// and store the result on the data object. Scenario prose, given() panels,
// and showWork annotations all read from data — they never call these
// helpers themselves. That guarantees a stable name across a problem
// instance and lets engine.reset() pick a fresh one.
//
// All randomness routes through Math.random() so the engine's seeded-PRNG
// override (PracticeEngine init options.seed) makes the entire pick chain
// deterministic for tests.

import NAMES      from './data/names.json';
import INDUSTRIES from './data/industries.json';
import SUFFIXES   from './data/suffixes.json';
import PRODUCTS   from './data/products.json';

// ============================================================================
// Internal pickers
// ============================================================================

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickFiltered(arr, category) {
  if (!category || category === 'any') return pick(arr);
  const matches = arr.filter(item => item.categories.includes(category));
  if (matches.length === 0) {
    // Fall back to 'any'-tagged entries rather than crash.
    const anyMatches = arr.filter(item => item.categories.includes('any'));
    if (anyMatches.length > 0) return pick(anyMatches);
    return pick(arr);
  }
  return pick(matches);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a random company name record.
 *
 * @param {object}  [opts]
 * @param {string}  [opts.category]      Industry category. Default 'any'.
 *                                        Valid: 'manufacturing', 'process',
 *                                        'service', 'retail', 'distribution',
 *                                        'technology', 'healthcare',
 *                                        'hospitality', 'construction', 'any'.
 * @param {boolean} [opts.includeSuffix] Default true. When false, no legal-form
 *                                        suffix is appended (suitable for prose
 *                                        like "Bayport's contribution margin").
 *
 * @returns {{ name: string, base: string, industry: string, suffix: string, category: string }}
 */
export function randomCompany(opts = {}) {
  const category       = opts.category ?? 'any';
  const includeSuffix  = opts.includeSuffix !== false;

  const base     = pick(NAMES);
  const industry = pickFiltered(INDUSTRIES, category).label;
  const suffix   = includeSuffix ? pick(SUFFIXES) : '';

  // Compose the display name. Skip industry word if category is 'any' AND
  // the picked descriptor was an 'any'-only word like "Holdings" — in that
  // case "Bayport Holdings, LLC" reads better than "Bayport Holdings".
  // We always include both unless the suffix is blank, in which case we
  // also drop the comma.
  let name = `${base} ${industry}`.trim();
  if (suffix) name += `, ${suffix}`;

  return {
    name,        // full rendered string, e.g. "Bayport Manufacturing, LLC"
    base,        // standalone, e.g. "Bayport" — use for possessives in show-work
    industry,    // e.g. "Manufacturing"
    suffix,      // e.g. "LLC" or ""
    category,    // the category this was filtered to
  };
}

/**
 * Generate a random product record.
 *
 * @param {object} [opts]
 * @param {string} [opts.category]  Same categories as randomCompany().
 *
 * @returns {{ singular: string, plural: string, category: string }}
 */
export function randomProduct(opts = {}) {
  const category = opts.category ?? 'manufacturing';
  const entry    = pickFiltered(PRODUCTS, category);
  return {
    singular: entry.singular,
    plural:   entry.plural,
    category,
  };
}

// ============================================================================
// Re-export raw pools for tests and tooling
// ============================================================================

export const POOLS = {
  names:      NAMES,
  industries: INDUSTRIES,
  suffixes:   SUFFIXES,
  products:   PRODUCTS,
};

/**
 * Diagnostic helper — returns the count of valid combinations for a category.
 * Used by tests/validate-problem.js to confirm pool sizes haven't regressed.
 */
export function combinationCount(category = 'any') {
  const industryMatches = category === 'any'
    ? INDUSTRIES.length
    : INDUSTRIES.filter(i => i.categories.includes(category)).length || 1;
  const productMatches = category === 'any'
    ? PRODUCTS.length
    : PRODUCTS.filter(p => p.categories.includes(category)).length || 1;
  return {
    names:      NAMES.length,
    industries: industryMatches,
    suffixes:   SUFFIXES.length,
    products:   productMatches,
    companies:  NAMES.length * industryMatches * SUFFIXES.length,
  };
}
