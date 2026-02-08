// src/core/pwc-element.js
var PwcElement = class extends HTMLElement {
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
  onDisconnect() {
  }
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
  }
};
var PwcSimpleInitElement = class extends PwcElement {
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
  onConnect() {
  }
};
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

// src/modal-dialog/base.js
var ModalDialogBase = class extends PwcSimpleInitElement {
  static events = ["click"];
  onDisconnect() {
    this._teardown();
  }
  get ui() {
    if (!this._ui) throw new Error("ui is only available after open()");
    return this._ui;
  }
  get rootEl() {
    return this.ui.rootEl;
  }
  get bodyEl() {
    return this.ui.bodyEl;
  }
  get headerEl() {
    return this.ui.headerEl;
  }
  get footerEl() {
    return this.ui.footerEl;
  }
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
};

// src/modal-dialog/modal-dialog.js
var PwcModalDialog = class extends ModalDialogBase {
  isOpen() {
    return Boolean(this.rootEl?.open);
  }
  _render({ title, size, closeText }) {
    const dlg = document.createElement("dialog");
    dlg.className = `pwc-modal-dialog pwc-modal-dialog--${size}`;
    dlg.innerHTML = `
      <div class="pwc-modal-dialog-surface" role="document">
        <header class="pwc-modal-dialog-header">
          <h3 class="pwc-modal-dialog-title"></h3>
          <button type="button" class="pwc-modal-dialog-x" aria-label="Close" data-pwc-action="close">\xD7</button>
        </header>
        <section class="pwc-modal-dialog-body"></section>
        <footer class="pwc-modal-dialog-footer"></footer>
      </div>
    `;
    dlg.querySelector(".pwc-modal-dialog-title").textContent = title;
    dlg.querySelector("[data-pwc-action='close']").setAttribute("aria-label", closeText);
    this.replaceChildren(dlg);
    return {
      rootEl: dlg,
      bodyEl: dlg.querySelector(".pwc-modal-dialog-body"),
      headerEl: dlg.querySelector(".pwc-modal-dialog-header"),
      footerEl: dlg.querySelector(".pwc-modal-dialog-footer"),
      teardown: () => {
        if (dlg.open) dlg.close();
        dlg.remove();
      }
    };
  }
  _getOpenSibling() {
    const candidates = Array.from(document.querySelectorAll("pwc-modal-dialog"));
    return candidates.find((el) => el !== this && el._ui?.rootEl?.open === true) || null;
  }
  _suspend(hostEl) {
    if (hostEl.isOpen()) hostEl.rootEl.close();
  }
  _restore(hostEl) {
    const dlg = hostEl.rootEl;
    if (dlg && typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
  }
  _show(ui) {
    const dlg = ui.rootEl;
    if (typeof dlg?.showModal !== "function") throw new Error("<dialog> not supported");
    if (!dlg.open) dlg.showModal();
  }
  _hide(ui) {
    const dlg = ui?.rootEl;
    if (dlg?.open) dlg.close();
  }
  _armFinalClose(ui, onFinalClose) {
    const dlg = ui?.rootEl;
    if (!dlg) return;
    const onClose = () => {
      if (this.dataset.closeReason !== "final") return;
      onFinalClose();
    };
    dlg.addEventListener("close", onClose);
    const prevTeardown = ui.teardown;
    ui.teardown = () => {
      dlg.removeEventListener("close", onClose);
      if (prevTeardown) prevTeardown();
    };
  }
};
var define = () => defineOnce("pwc-modal-dialog", PwcModalDialog);

// src/modal-dialog/index.js
function register() {
  define();
}
register();
export {
  register
};
