// base.js
import { PwcSimpleInitElement } from "../core/pwc-simple-init-element.js";

/**
 * ModalDialogBase
 *
 * Minimal orchestration for modal-like components with stacking.
 *
 * Subclass contract:
 * - _render(ctx) -> ui
 *     ui MUST contain: { rootEl, bodyEl, headerEl, footerEl }
 *     ui.rootEl is the "actual modal element" that receives user interactions
 *     ui MAY contain: { teardown() }
 * - _getOpenSibling() -> Element|null
 * - _suspend(el) / _restore(el)
 * - _show(ui, options) / _hide(ui)
 * - _armFinalClose(ui, onFinalClose)
 *
 * Close actions:
 * - Any click on an element with [data-pwc-action="close"] inside the component closes it.
 * - Backdrop click closes if the click target is ui.rootEl (typical for <dialog> and modal roots).
 */
export class ModalDialogBase extends PwcSimpleInitElement {
  static events = ["click"];

  onDisconnect() {
    this._teardown();
  }

  get ui() {
    if (!this._ui) throw new Error("ui is only available after open()");
    return this._ui;
  }
  get rootEl() { return this.ui.rootEl; }
  get bodyEl() { return this.ui.bodyEl; }
  get headerEl() { return this.ui.headerEl; } 
  get footerEl() { return this.ui.footerEl; }

  isOpen() {
    return false;
  }

  open({ title = "", size = "lg", closeText = "Close", ...options }) {
    if (!this.isConnected) {
      this._autoRemove = true;
      document.body.appendChild(this);
    }

    this._teardown();

    const ui = this._render({ title, size, closeText, ...options });
    this._ui = ui;

    const parent = this._getOpenSibling();
    this._parent = parent && parent !== ui.rootEl ? parent : null;

    this._closed = false;

    this._armFinalClose(ui, () => this._onFinalClose());

    if (this._parent) {
      this._parent.dataset.closeReason = "suspend";
      this._suspend(this._parent);
    }

    this._show(ui, { title, size, closeText, ...options });
  }

  close() {
    if (this._closed) return;
    this._closed = true;
    this.dataset.closeReason = "final";
    this._hide(this._ui);
  }

  _onFinalClose() {
    this._closed = true;
    delete this.dataset.closeReason;

    const parent = this._parent;
    this._parent = null;

    this._teardown();

    if (parent && parent.isConnected) {
      delete parent.dataset.closeReason;
      queueMicrotask(() => this._restore(parent));
    }

    if (this._autoRemove && this.isConnected) this.remove();
  }

  handleEvent(e) {
    if (e.type !== "click") return;
    if (e.defaultPrevented) return;

    const ui = this._ui;
    if (!ui?.rootEl) return;

    // Backdrop click (root element itself)
    if (e.target === ui.rootEl) {
      this.close();
      return;
    }

    const closeEl = e.target.closest('[data-pwc-action="close"]');
    if (!closeEl || !this.contains(closeEl)) return;

    this.close();
  }

  _teardown() {
    const ui = this._ui;
    this._ui = null;
    ui?.teardown?.();
  }
}