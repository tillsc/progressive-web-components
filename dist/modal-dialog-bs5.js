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
  static registerCss(cssText) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
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

// src/core/pwc-simple-init-element.js
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

// src/core/utils.js
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

// src/modal-dialog/bs5/modal-dialog.js
var PwcModalDialogBs5 = class extends ModalDialogBase {
  static events = ["click", "hidden.bs.modal"];
  onConnect() {
    this.classList.add("modal", "fade");
    this.tabIndex = -1;
    this.setAttribute("aria-hidden", "true");
  }
  isOpen() {
    return this.classList.contains("show");
  }
  requireBsModal() {
    const BsModal = globalThis.bootstrap?.Modal;
    if (!BsModal) throw new Error("Bootstrap Modal required (globalThis.bootstrap.Modal)");
    return BsModal;
  }
  _render({ title, size, closeText, showClose = true }) {
    this.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-${size}">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title"></h3>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer"></div>
        </div>
      </div>
    `;
    this.querySelector(".modal-title").textContent = title;
    if (showClose) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-close";
      btn.setAttribute("aria-label", closeText);
      btn.setAttribute("data-pwc-action", "close");
      this.querySelector(".modal-header").appendChild(btn);
    }
    return {
      rootEl: this,
      bodyEl: this.querySelector(".modal-body"),
      headerEl: this.querySelector(".modal-header"),
      footerEl: this.querySelector(".modal-footer"),
      modal: null,
      teardown: () => {
        const BsModal = this.requireBsModal();
        BsModal.getInstance(this)?.dispose();
        this.innerHTML = "";
        this._finalClose = null;
      }
    };
  }
  _getOpenSibling() {
    const el = document.querySelector(".modal.show");
    if (el === this) return null;
    return el;
  }
  _suspend(el) {
    const BsModal = this.requireBsModal();
    BsModal.getOrCreateInstance(el).hide();
  }
  _restore(el) {
    const BsModal = this.requireBsModal();
    BsModal.getOrCreateInstance(el).show();
  }
  _show(ui, { backdrop = true, keyboard = true, focus = true } = {}) {
    const BsModal = this.requireBsModal();
    ui.modal = BsModal.getOrCreateInstance(this, { backdrop, keyboard, focus });
    ui.modal.show();
  }
  _hide(ui) {
    ui.modal?.hide();
  }
  _armFinalClose(_ui, onFinalClose) {
    this._finalClose = onFinalClose;
  }
  handleEvent(e) {
    if (e.type === "hidden.bs.modal") {
      if (this.dataset.closeReason === "suspend") return;
      const fn = this._finalClose;
      this._finalClose = null;
      if (typeof fn === "function") fn();
      return;
    }
    super.handleEvent(e);
  }
};
var define = () => defineOnce("pwc-modal-dialog-bs5", PwcModalDialogBs5);

// src/modal-dialog/bs5/index.js
function register() {
  define();
}
register();
export {
  register
};
