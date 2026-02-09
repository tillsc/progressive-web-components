import {PwcElement} from "./pwc-element.js";

/**
 * Sentinel init element.
 *
 * Calls onConnect() once per connection, when a sentinel appears in the light DOM.
 * Uses a MutationObserver only until ready.
 *
 * Subclasses may override sentinelSelector().
 */
export class PwcSentinelInitElement extends PwcElement {
  static sentinelSelector = "pwc-sentinel, [data-pwc-sentinel]";

  connectedCallback() {
    if (this._connected) return;
    super.connectedCallback();

    if (this._hasSentinel()) {
      this.onConnect();
      return;
    }

    this._sentinelObserver = new MutationObserver(() => {
      if (!this._connected) return;
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

  /**
   * Hook for subclasses.
   * Called once per connection, when the sentinel is present.
   */
  onConnect() {}

  _hasSentinel() {
    const selector = this.constructor.sentinelSelector || PwcSentinelInitElement.sentinelSelector;
    return Boolean(this.querySelector(selector));
  }

  _stopSentinelObserver() {
    if (!this._sentinelObserver) return;
    this._sentinelObserver.disconnect();
    this._sentinelObserver = null;
  }
}
