import {PwcElement} from "./pwc-element.js";

/**
 * Children observer element.
 *
 * Calls onChildrenChanged() on connect and on every subsequent child mutation.
 *
 * Modes (static observeMode):
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

  onChildrenChanged(_mutations) {}

  /** Run fn() without triggering onChildrenChanged for the resulting DOM mutations. */
  _withoutChildrenChangedNotification(fn) {
    fn();
    this._childrenObserver?.takeRecords();
  }

  _startChildrenObserver() {
    const mode = this.constructor.observeMode || "children";
    const subtree = mode === "tree";

    this._childrenObserver = new MutationObserver((mutations) => {
      if (!this._connected) return;
      this.onChildrenChanged(mutations);
    });

    this._childrenObserver.observe(this, { childList: true, subtree });

    this.onChildrenChanged([]);
  }

  _stopChildrenObserver() {
    if (!this._childrenObserver) return;
    this._childrenObserver.disconnect();
    this._childrenObserver = null;
  }
}
