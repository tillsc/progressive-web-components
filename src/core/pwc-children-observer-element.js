import {PwcElement} from "./pwc-element.js";

/**
 * Calls onChildrenChanged() on connect and on every subsequent child mutation.
 * Modes: "children" (direct only, default) or "tree" (full subtree).
 * Optional attribute observation via static observeAttributes (array of names).
 */
export class PwcChildrenObserverElement extends PwcElement {
  static observeMode = "children"; // "children" | "tree"
  static observeAttributes = null;

  connectedCallback() {
    super.connectedCallback();
    this._startChildrenObserver();
  }

  disconnectedCallback() {
    this._stopChildrenObserver();
    super.disconnectedCallback();
  }

  /** Called on connect and on every child mutation. Subclasses override. */
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
      if (!this.isConnected) return;
      this.onChildrenChanged(mutations);
    });

    const options = { childList: true, subtree };
    if (this.constructor.observeAttributes?.length) {
      options.attributes = true;
      options.attributeFilter = this.constructor.observeAttributes;
    }

    this._childrenObserver.observe(this, options);

    this.onChildrenChanged([]);
  }

  _stopChildrenObserver() {
    if (!this._childrenObserver) return;
    this._childrenObserver.disconnect();
    this._childrenObserver = null;
  }
}
