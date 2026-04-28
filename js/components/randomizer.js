/**
 * randomizer.js — Universal input randomizer component
 * Usage: initRandomizer(buttonId, fields, onRandomize?)
 *
 * fields: Array of field config objects:
 * {
 *   id:         string   — input element id
 *   min:        number   — minimum value
 *   max:        number   — maximum value
 *   step:       number   — round to nearest step
 *   constraint: string?  — 'lessThan:otherId' | 'greaterThan:otherId'
 *   integer:    bool?    — force integer output (default false)
 * }
 *
 * After setting values, fires native 'input' event on each field
 * so existing listeners update automatically.
 */

function randomBetween(min, max, step = 1) {
  const steps = Math.floor((max - min) / step);
  return min + Math.round(Math.random() * steps) * step;
}

function resolveConstraint(constraint, fields, values) {
  if (!constraint) return { min: null, max: null };
  const [type, refId] = constraint.split(':');
  const refVal = values[refId];
  if (refVal === undefined) return { min: null, max: null };
  if (type === 'lessThan')    return { min: null, max: refVal - 1 };
  if (type === 'greaterThan') return { min: refVal + 1, max: null };
  return { min: null, max: null };
}

export function initRandomizer(buttonId, fields, onRandomize = null) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.addEventListener('click', () => {
    const values = {};

    fields.forEach(field => {
      const el = document.getElementById(field.id);
      if (!el) return;
      const currentVal = parseFloat(el.value) || 0;
      values[field.id] = currentVal;
    });

    fields.forEach(field => {
      const el = document.getElementById(field.id);
      if (!el) return;

      const constraint = resolveConstraint(field.constraint, fields, values);
      const min  = constraint.min !== null ? Math.max(field.min, constraint.min) : field.min;
      const max  = constraint.max !== null ? Math.min(field.max, constraint.max) : field.max;
      const step = field.step || 1;

      if (min >= max) return;

      let val = randomBetween(min, max, step);
      if (field.integer) val = Math.round(val);

      values[field.id] = val;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    if (typeof onRandomize === 'function') onRandomize(values);
  });
}
