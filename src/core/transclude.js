import { requestContext } from "./context.js";

const MORPH_OPTIONS = {
  morphStyle: "innerHTML",
  restoreFocus: true,
  callbacks: {
    beforeAttributeUpdated(attributeName, node) {
      if (
        (attributeName === "value" || attributeName === "checked") &&
        node.matches?.("input,textarea,select") &&
        node.isConnected && !node.readOnly && !node.disabled
      ) return false;
      return true;
    },
    afterNodeMorphed(oldNode, newNode) {
      if (!newNode?.matches?.("[data-pwc-force-value]")) return;
      if (newNode.matches("input[type=checkbox],input[type=radio]")) {
        oldNode.checked = newNode.hasAttribute("checked");
      } else {
        oldNode.value = newNode.getAttribute("value") ?? "";
      }
    },
  },
};

/** Replace children of `target` with `content` (string or nodes). Delegates to a morph library if available. */
export function transclude(target, content, contextElement) {
  const el = contextElement || target;
  const morphLib = el.hasAttribute?.("nomorph") ? null : requestContext(el, "idiomorph");
  if (morphLib) {
    morphLib.morph(target, content, MORPH_OPTIONS);
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
