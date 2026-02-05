export function installOnce(id, cssText, root = document) {
  if (root.getElementById(id)) return;

  const style = root.createElement("style");
  style.id = id;
  style.textContent = cssText;
  root.head.appendChild(style);
}