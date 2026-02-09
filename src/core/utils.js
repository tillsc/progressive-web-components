export function ensureId(el, prefix = "pwc") {
  if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2)}`;
  return el.id;
}

export function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

export function installCssOnce(id, cssText, root = document) {
  if (root.getElementById(id)) return;

  const style = root.createElement("style");
  style.id = id;
  style.textContent = cssText;
  root.head.appendChild(style);
}
