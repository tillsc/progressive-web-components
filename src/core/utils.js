export function ensureId(el, prefix = "pwc") {
  if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2)}`;
  return el.id;
}

export function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}
