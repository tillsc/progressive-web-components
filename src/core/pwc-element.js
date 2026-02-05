/**
 * Base class for progressive-web-components.
 *
 * Responsibilities:
 * - Ensure idempotent lifecycle handling
 * - Defer initialization to a microtask
 * - Declaratively bind and unbind host-level DOM events
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

    // Defer initialization to ensure child nodes
    // from server-rendered HTML are available.
    queueMicrotask(() => {
      this._bindEvents();
      this.onConnect();
    });
  }

  disconnectedCallback() {
    if (!this._connected) return;
    this._connected = false;

    this._unbindEvents();
    this.onDisconnect();
  }

  /**
   * Hook for subclasses.
   * Called once per connection, after microtask deferral.
   */
  onConnect() {}

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