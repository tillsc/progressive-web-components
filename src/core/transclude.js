import { requestContext } from "./context.js";

/** Replace children of `target` with `content` (string or nodes). Delegates to a morph function if available. */
export function transclude(target, content, contextElement) {
  const el = contextElement || target;
  const morph = el.hasAttribute?.("nomorph") ? null : requestContext(el, "morph");
  if (morph) {
    morph(target, content);
  } else if (typeof content === "string") {
    target.innerHTML = content;
  } else {
    target.replaceChildren(...content);
  }
}

/** Re-create script elements inside `root` so the browser executes them. */
export function executeScripts(root) {
  for (const old of Array.from(root.querySelectorAll("script"))) {
    const s = document.createElement("script");
    if (old.src) s.src = old.src;
    if (old.type) s.type = old.type;
    if (old.noModule) s.noModule = true;
    s.textContent = old.textContent;
    old.replaceWith(s);
  }
}
