import {PwcElement} from "./pwc-element.js";

/**
 * Calls onConnect() once a sentinel element appears in the light DOM.
 * Uses a MutationObserver only until the sentinel is found, then disconnects.
 * Use when children arrive asynchronously (e.g. streamed partials).
 */
export class PwcSentinelInitElement extends PwcElement {
  /** Selector for the sentinel. Subclasses may override. */
  static sentinelSelector = "pwc-sentinel, [data-pwc-sentinel]";

  connectedCallback() {
    super.connectedCallback();

    if (this._hasSentinel()) {
      this.onConnect();
      return;
    }

    this._sentinelObserver = new MutationObserver(() => {
      if (!this.isConnected) return;
      if (!this._hasSentinel()) return;

      this._stopSentinelObserver();
      this.onConnect();
    });

    // subtree:true so the sentinel can be nested (common with templates/partials)
    this._sentinelObserver.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    this._stopSentinelObserver();
    super.disconnectedCallback();
  }

  /** Called once when the sentinel is present. Subclasses override. */
  onConnect() {}

  _hasSentinel() {
    const selector = this.constructor.sentinelSelector;
    return Boolean(this.querySelector(selector));
  }

  _stopSentinelObserver() {
    if (!this._sentinelObserver) return;
    this._sentinelObserver.disconnect();
    this._sentinelObserver = null;
  }
}
