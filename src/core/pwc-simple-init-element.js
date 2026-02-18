import {PwcElement} from "./pwc-element.js";

/**
 * Calls onConnect() once per connection, deferred to a microtask.
 * Use when server-rendered children are available synchronously.
 */
export class PwcSimpleInitElement extends PwcElement {
  connectedCallback() {
    super.connectedCallback();

    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.onConnect();
    });
  }

  /** Called once after connect. Subclasses override. */
  onConnect() {}
}
