/** Assigns a random ID to `el` if it has none. Returns the (existing or new) ID. */
export function ensureId(el, prefix = "pwc") {
  if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2)}`;
  return el.id;
}

/** Register a Custom Element only if the name isn't taken. */
export function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

/** Parse a space-separated string into a DOMTokenList. */
export function tokenList(str) {
  const el = document.createElement("span");
  el.className = str || "";
  return el.classList;
}

/** Shared cache: normalized cssText or resolved URL → CSSStyleSheet. */
const _sheetCache = new Map();

/** Return a cached CSSStyleSheet for the given CSS text.
 *  Browser normalization ensures whitespace differences share the same sheet. */
export function getOrCreateSheet(cssText) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  const normalized = Array.from(sheet.cssRules, (r) => r.cssText).join("\n");
  if (_sheetCache.has(normalized)) {
    return _sheetCache.get(normalized);
  }
  _sheetCache.set(normalized, sheet);
  return sheet;
}

/** Fetch a stylesheet by URL and cache the resulting CSSStyleSheet. Returns null on failure. */
export async function fetchSheet(url) {
  const resolved = new URL(url, document.baseURI).href;
  if (_sheetCache.has(resolved)) {
    return _sheetCache.get(resolved);
  }
  try {
    const res = await fetch(resolved);
    if (!res.ok) return null;
    const cssText = await res.text();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    _sheetCache.set(resolved, sheet);
    return sheet;
  } catch {
    return null;
  }
}

/** Register a stylesheet on the document (cached, deduplicated). */
export function registerCss(cssText) {
  adoptSheets(document, [getOrCreateSheet(cssText)]);
}

/** Adopt sheets into a target (document or shadowRoot), skipping duplicates. */
export function adoptSheets(target, sheets) {
  const existing = target.adoptedStyleSheets;
  const newOnes = sheets.filter((s) => !existing.includes(s));
  if (newOnes.length) {
    target.adoptedStyleSheets = [...existing, ...newOnes];
  }
}
