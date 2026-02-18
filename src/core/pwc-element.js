/**
 * Base class for progressive-web-components.
 *
 * Declarative event binding via static events + handleEvent pattern.
 * No rendering, no templating, no magic.
 */
export class PwcElement extends HTMLElement {
  /** DOM event types to bind on the host. Subclasses override. */
  static events = [];

  connectedCallback() {
    this._bindEvents();
  }

  disconnectedCallback() {
    this._unbindEvents();
    this.onDisconnect();
  }

  /** Cleanup hook for subclasses. */
  onDisconnect() {}

  _bindEvents() {
    const events = this.constructor.events ?? [];
    for (const type of events) {
      this.addEventListener(type, this);
    }
  }

  _unbindEvents() {
    const events = this.constructor.events ?? [];
    for (const type of events) {
      this.removeEventListener(type, this);
    }
  }

  /** Default event handler. Subclasses override to route events. */
  handleEvent(_event) {
    // intentionally empty
  }
}
