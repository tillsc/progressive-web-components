/**
 * Base class for progressive-web-components.
 *
 * Responsibilities:
 * - Ensure idempotent lifecycle handling
 * - Declaratively bind and unbind host-level DOM events
 * - Provide a consistent cleanup hook
 *
 * This is intentionally minimal.
 * No rendering, no templating, no magic.
 */
export class PwcElement extends HTMLElement {
  /**
   * List of DOM event types to bind on the host element.
   * Subclasses may override.
   *
   * Example:
   *   static events = ["click", "input"];
   */
  static events = [];

  connectedCallback() {
    if (this._connected) return;
    this._connected = true;

    this._bindEvents();
  }

  disconnectedCallback() {
    if (!this._connected) return;
    this._connected = false;

    this._unbindEvents();
    this.onDisconnect();
  }

  /**
   * Optional cleanup hook for subclasses.
   */
  onDisconnect() {}

  /**
   * Bind declared events using the handleEvent pattern.
   */
  _bindEvents() {
    const events = this.constructor.events ?? [];
    for (const type of events) {
      this.addEventListener(type, this);
    }
  }

  /**
   * Unbind all previously declared events.
   */
  _unbindEvents() {
    const events = this.constructor.events ?? [];
    for (const type of events) {
      this.removeEventListener(type, this);
    }
  }

  /**
   * Default event handler.
   * Subclasses are expected to override this method
   * and route events as needed.
   */
  handleEvent(_event) {
    // intentionally empty
  }
}

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
    const selector = this.constructor.sentinelSelector || "[data-pwc-end]";
    return Boolean(this.querySelector(selector));
  }

  _stopSentinelObserver() {
    if (!this._sentinelObserver) return;
    this._sentinelObserver.disconnect();
    this._sentinelObserver = null;
  }
}

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

export function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}