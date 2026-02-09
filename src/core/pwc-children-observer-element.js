import {PwcElement} from "./pwc-element.js";

/**
 * Children observer element.
 *
 * Calls onChildrenChanged() whenever child nodes change.
 * This is for truly dynamic components, not as an init strategy.
 *
 * Modes:
 * - "children": direct children only
 * - "tree": full subtree
 */
export class PwcChildrenObserverElement extends PwcElement {
  static observeMode = "children"; // "children" | "tree"

  connectedCallback() {
    if (this._connected) return;
    super.connectedCallback();
    this._startChildrenObserver();
  }

  disconnectedCallback() {
    this._stopChildrenObserver();
    super.disconnectedCallback();
  }

  /**
   * Hook for subclasses.
   * Called on every observed mutation.
   * Must be cheap and idempotent.
   */
  onChildrenChanged(_mutations) {}

  _startChildrenObserver() {
    const mode = this.constructor.observeMode || "children";
    const subtree = mode === "tree";

    this._childrenObserver = new MutationObserver((mutations) => {
      if (!this._connected) return;
      this.onChildrenChanged(mutations);
    });

    this._childrenObserver.observe(this, { childList: true, subtree });
  }

  _stopChildrenObserver() {
    if (!this._childrenObserver) return;
    this._childrenObserver.disconnect();
    this._childrenObserver = null;
  }
}
