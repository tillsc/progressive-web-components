import { PwcChildrenObserverElement } from "../core/pwc-children-observer-element.js";
import { tokenList } from "../core/utils.js";

/**
 * Base class for validity components.
 *
 * Applies `data-validity` attributes on form elements as custom validity
 * messages via `setCustomValidity()`. Observes the subtree for changes and
 * optionally clears errors after an event or timeout.
 *
 * Subclasses override `_updateMessage(el, text)` to control how error
 * messages are displayed in the DOM.
 */
export class BaseValidity extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static observeAttributes = ["data-validity"];

  _cleanups = [];

  onChildrenChanged(mutations) {
    if (!mutations.length) {
      for (const el of this.querySelectorAll("[data-validity]")) {
        this._applyValidity(el);
      }
      return;
    }

    const affected = mutations.flatMap((m) =>
      m.type === "attributes"
        ? [m.target]
        : [...m.addedNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE)
            .flatMap((n) => [n, ...n.querySelectorAll("[data-validity]")])
            .filter((n) => n.hasAttribute("data-validity"))
    );
    for (const el of affected) this._applyValidity(el);
  }

  _applyValidity(el) {
    const value = el.getAttribute("data-validity");
    if (value) {
      el.setCustomValidity(value);
      this._updateMessage(el, value);
      this._setupClearing(el);
    } else {
      if (el.validity?.customError) el.setCustomValidity("");
      this._updateMessage(el, null);
    }
  }

  _updateMessage(_el, _text) {}

  _setupClearing(el) {
    if (el.dataset.validityClear === "none") return;

    const clearOn = this.getAttribute("clear-on");
    const clearAfter = this.getAttribute("clear-after");

    if (!clearOn && !clearAfter) return;

    let timeoutId;

    const clear = () => {
      if (clearOn) {
        for (const event of tokenList(clearOn)) {
          el.removeEventListener(event, clear);
        }
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      el.removeAttribute("data-validity");
    };

    if (clearOn) {
      for (const event of tokenList(clearOn)) {
        el.addEventListener(event, clear);
      }
    }

    if (clearAfter) {
      timeoutId = setTimeout(clear, parseInt(clearAfter, 10));
    }

    this._cleanups.push(clear);
  }

  onDisconnect() {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
  }
}
