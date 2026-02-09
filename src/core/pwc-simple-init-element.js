import {PwcElement} from "./pwc-element.js";

/**
 * Simple init element.
 *
 * Calls onConnect() once per connection, deferred to a microtask.
 * Use this when a microtask is sufficient to access server-rendered children.
 */
export class PwcSimpleInitElement extends PwcElement {
  connectedCallback() {
    if (this._connected) return;
    super.connectedCallback();

    queueMicrotask(() => {
      if (!this._connected) return;
      this.onConnect();
    });
  }

  /**
   * Hook for subclasses.
   * Called once per connection, after microtask deferral.
   */
  onConnect() {}
}
