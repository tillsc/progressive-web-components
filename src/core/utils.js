/** Assigns a random ID to `el` if it has none. Returns the (existing or new) ID. */
export function ensureId(el, prefix = "pwc") {
  if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2)}`;
  return el.id;
}

/** Defines a Custom Element only if the name isn't already registered. */
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
