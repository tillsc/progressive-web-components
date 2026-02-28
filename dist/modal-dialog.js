// src/core/pwc-element.js
var PwcElement = class extends HTMLElement {
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
  onDisconnect() {
  }
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
  }
};

// src/core/pwc-simple-init-element.js
var PwcSimpleInitElement = class extends PwcElement {
  connectedCallback() {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.onConnect();
    });
  }
  /** Called once after connect. Subclasses override. */
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
  get isOpen() {
    return false;
  }
  open({ title = "", closeText = "Close", ...options }) {
    if (!this.isConnected) {
      this._autoRemove = true;
      document.body.appendChild(this);
    }
    this._teardown();
    const ui = this._render({ title, closeText, ...options });
    this._ui = ui;
    const parent = this._getOpenSibling();
    this._parent = parent && parent !== ui.rootEl ? parent : null;
    this._closed = false;
    this._armFinalClose(ui, () => this._onFinalClose());
    if (this._parent) {
      this._parent.dataset.closeReason = "suspend";
      this._suspend(this._parent);
    }
    this._show(ui, { title, closeText, ...options });
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
function ensureId(el, prefix = "pwc") {
  if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2)}`;
  return el.id;
}
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}
var _sheetCache = /* @__PURE__ */ new Map();
function getOrCreateSheet(cssText) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  const normalized = Array.from(sheet.cssRules, (r) => r.cssText).join("\n");
  if (_sheetCache.has(normalized)) {
    return _sheetCache.get(normalized);
  }
  _sheetCache.set(normalized, sheet);
  return sheet;
}
function registerCss(cssText) {
  adoptSheets(document, [getOrCreateSheet(cssText)]);
}
function adoptSheets(target, sheets) {
  const existing = target.adoptedStyleSheets;
  const newOnes = sheets.filter((s) => !existing.includes(s));
  if (newOnes.length) {
    target.adoptedStyleSheets = [...existing, ...newOnes];
  }
}

// src/modal-dialog/modal-dialog.js
var PwcModalDialog = class extends ModalDialogBase {
  get isOpen() {
    return Boolean(this._ui?.rootEl?.open);
  }
  _render({ title, width, height, closeText, showCloseButton = true }) {
    const dlg = document.createElement("dialog");
    dlg.className = "pwc-modal-dialog";
    dlg.innerHTML = `
      <div class="pwc-modal-dialog-surface">
        <header class="pwc-modal-dialog-header">
          <h3 class="pwc-modal-dialog-title"></h3>
        </header>
        <section class="pwc-modal-dialog-body"></section>
        <footer class="pwc-modal-dialog-footer"></footer>
      </div>
    `;
    const titleEl = dlg.querySelector(".pwc-modal-dialog-title");
    titleEl.textContent = title;
    dlg.setAttribute("aria-labelledby", ensureId(titleEl, "pwc-mdlg-title"));
    if (showCloseButton) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pwc-modal-dialog-x";
      btn.setAttribute("aria-label", closeText);
      btn.setAttribute("data-pwc-action", "close");
      btn.textContent = "\xD7";
      dlg.querySelector(".pwc-modal-dialog-header").appendChild(btn);
    }
    this.replaceChildren(dlg);
    if (width) this.style.setProperty("--pwc-modal-dialog-width", width);
    else this.style.removeProperty("--pwc-modal-dialog-width");
    if (height) this.style.setProperty("--pwc-modal-dialog-height", height);
    else this.style.removeProperty("--pwc-modal-dialog-height");
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
    if (hostEl.isOpen) hostEl.rootEl.close();
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
      if (this.dataset.closeReason === "suspend") return;
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

// src/modal-dialog/modal-dialog.css
var modal_dialog_default = "pwc-modal-dialog {\n  /* sizing */\n  --pwc-modal-dialog-width: 720px;\n  --pwc-modal-dialog-max-width: 92vw;\n  --pwc-modal-dialog-height: auto;\n  --pwc-modal-dialog-max-height: 90vh;\n\n  /* spacing */\n  --pwc-modal-dialog-padding-header: 12px 16px;\n  --pwc-modal-dialog-padding-body: 16px;\n  --pwc-modal-dialog-padding-footer: 12px 16px;\n  --pwc-modal-dialog-gap-footer: 8px;\n\n  /* visuals */\n  --pwc-modal-dialog-bg: #fff;\n  --pwc-modal-dialog-backdrop: rgba(0, 0, 0, 0.45);\n  --pwc-modal-dialog-border-radius: 6px;\n  --pwc-modal-dialog-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);\n  --pwc-modal-dialog-separator: rgba(0, 0, 0, 0.08);\n\n  /* controls */\n  --pwc-modal-dialog-close-radius: 4px;\n  --pwc-modal-dialog-close-hover-bg: rgba(0, 0, 0, 0.06);\n}\n\npwc-modal-dialog dialog.pwc-modal-dialog {\n  border: none;\n  padding: 0;\n  width: var(--pwc-modal-dialog-width);\n  max-width: var(--pwc-modal-dialog-max-width);\n  max-height: var(--pwc-modal-dialog-max-height);\n  display: flex;\n  flex-direction: column;\n}\n\npwc-modal-dialog dialog.pwc-modal-dialog::backdrop {\n  background: var(--pwc-modal-dialog-backdrop);\n}\n\npwc-modal-dialog .pwc-modal-dialog-surface {\n  flex: 1;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n  background: var(--pwc-modal-dialog-bg);\n  border-radius: var(--pwc-modal-dialog-border-radius);\n  box-shadow: var(--pwc-modal-dialog-shadow);\n  overflow: hidden;\n}\n\n/* Header */\n\npwc-modal-dialog .pwc-modal-dialog-header {\n  flex-shrink: 0;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: var(--pwc-modal-dialog-padding-header);\n  border-bottom: 1px solid var(--pwc-modal-dialog-separator);\n}\n\npwc-modal-dialog .pwc-modal-dialog-title {\n  margin: 0;\n  font-size: 1.1rem;\n  font-weight: 600;\n}\n\n/* Close button */\n\npwc-modal-dialog .pwc-modal-dialog-x {\n  appearance: none;\n  border: none;\n  background: transparent;\n  font: inherit;\n  font-size: 1.25rem;\n  line-height: 1;\n  padding: 4px 6px;\n  cursor: pointer;\n  border-radius: var(--pwc-modal-dialog-close-radius);\n}\n\npwc-modal-dialog .pwc-modal-dialog-x:hover {\n  background: var(--pwc-modal-dialog-close-hover-bg);\n}\n\n/* Body */\n\npwc-modal-dialog .pwc-modal-dialog-body {\n  flex: 1 1 var(--pwc-modal-dialog-height);\n  min-height: 0;\n  overflow: auto;\n  padding: var(--pwc-modal-dialog-padding-body);\n}\n\n/* Footer */\n\npwc-modal-dialog .pwc-modal-dialog-footer {\n  flex-shrink: 0;\n  display: flex;\n  justify-content: flex-end;\n  gap: var(--pwc-modal-dialog-gap-footer);\n  padding: var(--pwc-modal-dialog-padding-footer);\n  border-top: 1px solid var(--pwc-modal-dialog-separator);\n}\n";

// src/modal-dialog/index.js
function register() {
  registerCss(modal_dialog_default);
  define();
}
register();
export {
  register
};
