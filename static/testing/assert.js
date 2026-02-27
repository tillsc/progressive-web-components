// Specialized assertion helpers for test pages.
// Also re-exports ok and equal so test files need only one import.

import { assert as ok, equal } from "./harness.js";
export { ok, equal };

function elId(el) {
  return el.id ? `#${el.id}` : el.tagName.toLowerCase();
}

function getTop(el) {
  return el.getBoundingClientRect().top;
}

// ── Layout ──────────────────────────────────────────────────────────────────

export function top(el, expected, msg) {
  const ta = getTop(el);
  if (expected instanceof Element) {
    const tb = getTop(expected);
    ok(ta === tb, msg ?? `${elId(el)} top (same as ${elId(expected)}: ${ta} vs ${tb})`);
  } else {
    ok(ta === expected, msg ?? `${elId(el)} top (${ta} vs ${expected})`);
  }
}

export function above(a, b, msg) {
  const ta = getTop(a), tb = getTop(b);
  ok(ta < tb, msg ?? `${elId(a)} above ${elId(b)} (${ta} vs ${tb})`);
}

export function width(el, expected, msg) {
  equal(Math.round(el.getBoundingClientRect().width), expected, msg ?? `${elId(el)} width`);
}

// ── DOM ─────────────────────────────────────────────────────────────────────

export function customElement(name, msg) {
  ok(customElements.get(name), msg ?? `"${name}" not registered`);
}

export function attr(el, name, expected, msg) {
  equal(el.getAttribute(name), expected, msg ?? `${elId(el)}[${name}]`);
}

export function hasClass(el, className, msg) {
  ok(el.classList.contains(className), msg ?? `${elId(el)} missing class "${className}"`);
}

export function noClass(el, className, msg) {
  ok(!el.classList.contains(className), msg ?? `${elId(el)} should not have class "${className}"`);
}

export function hasAttr(el, name, msg) {
  ok(el.hasAttribute(name), msg ?? `${elId(el)} missing attribute "${name}"`);
}

export function noAttr(el, name, msg) {
  ok(!el.hasAttribute(name), msg ?? `${elId(el)} should not have attribute "${name}"`);
}
