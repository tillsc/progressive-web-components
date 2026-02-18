// src/core/utils.js
function ensureId(el, prefix = "pwc") {
  if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2)}`;
  return el.id;
}
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}
function tokenList(str) {
  const el = document.createElement("span");
  el.className = str || "";
  return el.classList;
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

// src/dialog-opener/base.js
var BaseDialogOpener = class extends PwcElement {
  static events = ["click"];
  static hiddenInDialogSelector = "pwc-dialog-opener-hidden, [data-pwc-dialog-opener-hidden]";
  constructor() {
    super();
    this._iframeLoadHandler = (e) => {
      this._onIFrameLoad(e).catch(console.error);
    };
  }
  handleEvent(e) {
    if (e.type !== "click") return;
    if (e.defaultPrevented) return;
    const link = e.target.closest("a");
    if (!link || !this.contains(link)) return;
    e.preventDefault();
    if (this.hasAttribute("local-reload") && !this.id) {
      console.warn("<pwc-dialog-opener> has local-reload attribute but no id", this);
    }
    const href = link.getAttribute("href");
    if (!href) return;
    const label = link.getAttribute("aria-label") || link.textContent.trim();
    const iframeTitle = this.getAttribute("iframe-title") || (label ? `Dialog: ${label}` : "");
    this._openDialogWith(href, iframeTitle);
  }
  // Variant hook: must return a DOM element containing the iframe
  // eslint-disable-next-line no-unused-vars
  findOrCreateDialog(_src) {
    throw new Error("BaseDialogOpener: findOrCreateDialog(src) must be implemented by a variant");
  }
  // Variant hook: close the dialog
  closeDialog() {
    throw new Error("BaseDialogOpener: closeDialog() must be implemented by a variant");
  }
  createIFrame(src) {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.style.width = "100%";
    iframe.style.height = getComputedStyle(this).getPropertyValue("--pwc-dialog-opener-height").trim() || "550px";
    iframe.style.display = "none";
    return iframe;
  }
  _openDialogWith(href, iframeTitle) {
    const src = this._prepareIFrameLink(href);
    this.dialog = this.findOrCreateDialog(src);
    this._enhanceIFrame(iframeTitle);
  }
  _prepareIFrameLink(src) {
    const s = new URL(src, document.location.href);
    const defaultValues = [...this.querySelectorAll("input")].map((input) => {
      if (input.value) return input.value;
      return null;
    }).filter((item) => item !== null);
    if (defaultValues.length > 0) {
      s.searchParams.set("pwc_default", defaultValues.join(","));
    }
    s.searchParams.set("pwc_embedded", true);
    return s.toString();
  }
  _enhanceIFrame(iframeTitle) {
    this.iframe = this.dialog.querySelector("iframe");
    this.iframe.title = iframeTitle;
    this.iframe.removeEventListener("load", this._iframeLoadHandler);
    this.iframe.addEventListener("load", this._iframeLoadHandler);
  }
  _installIFrameAdditionalEventTriggers() {
    const additionalEvents = tokenList(this.getAttribute("iframe-additional-events"));
    if (!additionalEvents.length) return;
    const doc = this.iframe?.contentWindow?.document;
    if (!doc) return;
    this._hookedDocs ||= /* @__PURE__ */ new WeakSet();
    if (this._hookedDocs.has(doc)) return;
    this._hookedDocs.add(doc);
    for (const ev of additionalEvents) {
      doc.addEventListener(ev, this._iframeLoadHandler);
    }
  }
  async _onIFrameLoad(_e) {
    let uri;
    try {
      uri = new URL(this.iframe.contentWindow.location);
    } catch (e) {
      throw new Error(`<pwc-dialog-opener> cannot access iframe location (cross-origin?): ${e.message}`);
    }
    if (uri.searchParams.has("pwc_done_with")) {
      this.closeDialog();
      uri.searchParams.delete("pwc_embedded");
      uri.searchParams.set("pwc_cb", Math.floor(Math.random() * 1e5));
      const localReloadWorked = await this._tryLocalReload(uri);
      if (!localReloadWorked) {
        window.location.href = uri.toString();
      }
      return;
    }
    this._installIFrameAdditionalEventTriggers();
    this._applyIFrameDomTransformations();
    this.iframe.style.display = "unset";
  }
  async _tryLocalReload(newUri) {
    const currentUri = new URL(window.location.href);
    if (currentUri.hostname !== newUri.hostname || currentUri.pathname !== newUri.pathname || currentUri.protocol !== newUri.protocol) {
      console.log(`<dialog-opener> Warning: local-reload got different base uri (${newUri.toString()}) then window has (${currentUri.toString()}). This might lead to problems, but we'll try it anyway.`);
    }
    if (this.hasAttribute("local-reload") && this.id) {
      const localReloadTokens = tokenList(this.getAttribute("local-reload"));
      const localReloadOptions = {
        replaceUrl: localReloadTokens.contains("replace-url"),
        pushUrl: localReloadTokens.contains("push-url"),
        withScripts: localReloadTokens.contains("with-scripts")
      };
      newUri.searchParams.set("local_reload", this.id);
      const res = await fetch(newUri);
      if (res.ok) {
        const html = await res.text();
        const newDocument = new DOMParser().parseFromString(html, "text/html");
        const fragment = newDocument.getElementById(this.id);
        if (fragment) {
          this.replaceChildren(...fragment.childNodes);
          if (localReloadOptions.replaceUrl || localReloadOptions.pushUrl) {
            if (localReloadOptions.pushUrl) {
              history.pushState(null, "", newUri);
            } else if (localReloadOptions.replaceUrl) {
              history.replaceState(null, "", newUri);
            }
          }
          if (localReloadOptions.withScripts) {
            this._executeInlineScripts(this);
          }
          this.dispatchEvent(
            new CustomEvent("pwc-dialog-opener:local-reload", {
              bubbles: true,
              detail: { url: newUri.toString() }
            })
          );
          return true;
        }
        console.log("local-reload not possible, falling back to full reload");
      }
    }
    return false;
  }
  _executeInlineScripts(root) {
    console.log("Executing inline scripts in local-reload fragment", root);
    const scripts = Array.from(root.querySelectorAll("script"));
    for (const old of scripts) {
      if (old.src) {
        console.warn("Ignoring external script in local-reload fragment:", old.src);
        old.remove();
        continue;
      }
      const s = document.createElement("script");
      if (old.type) s.type = old.type;
      if (old.noModule) s.noModule = true;
      s.textContent = old.textContent || "";
      old.replaceWith(s);
    }
  }
  _applyIFrameDomTransformations() {
    const iframeDoc = this.iframe.contentWindow?.document;
    if (!iframeDoc) return;
    if (this.getAttribute("hoist-actions")) {
      let buttonContainer = this.dialog.querySelector("dialog-opener-buttons");
      if (!buttonContainer) {
        buttonContainer = document.createElement("dialog-opener-buttons");
        this.dialog.querySelector(".pwc-dialog-opener-actions").prepend(buttonContainer);
      } else {
        buttonContainer.innerHTML = "";
      }
      const elements = iframeDoc.querySelectorAll(this._moveOutSelector());
      for (let i = 0; i < elements.length; i++) {
        const btn = elements[i];
        const outerBtn = document.createElement(btn.tagName);
        for (const attr of btn.attributes) {
          outerBtn.setAttribute(attr.name, attr.value);
        }
        outerBtn.innerHTML = btn.innerHTML;
        outerBtn.addEventListener("click", () => {
          this.iframe.style.display = "none";
          btn.click();
        });
        buttonContainer.append(outerBtn);
        btn.style.display = "none";
      }
    }
    iframeDoc.querySelectorAll(this.constructor.hiddenInDialogSelector).forEach((el) => {
      el.style.display = "none";
    });
  }
  _moveOutSelector() {
    let selector = this.getAttribute("hoist-actions");
    if (selector === "submit") {
      selector = "button[type=submit], input[type=submit]";
    }
    return selector;
  }
};

// src/dialog-opener/dialog-opener.js
var PwcDialogOpener = class extends BaseDialogOpener {
  findOrCreateDialog(src) {
    if (!this.modalDialog) {
      this.modalDialog = document.createElement("pwc-modal-dialog");
      document.body.appendChild(this.modalDialog);
    }
    const closeText = this.getAttribute("close-text") || "Close";
    this.modalDialog.open({
      closeText,
      showClose: false
    });
    this.modalDialog.footerEl.classList.add("pwc-dialog-opener-actions");
    this.modalDialog.footerEl.innerHTML = `
      <button type="button" class="pwc-dialog-opener-close" data-pwc-action="close" aria-label="${closeText}">
        ${closeText}
      </button>
    `;
    const iframe = this.createIFrame(src);
    this.modalDialog.bodyEl.replaceChildren(iframe);
    return this.modalDialog.ui.rootEl;
  }
  closeDialog() {
    this.modalDialog.close();
  }
};
function define() {
  defineOnce("pwc-dialog-opener", PwcDialogOpener);
}

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

// src/modal-dialog/modal-dialog.js
var PwcModalDialog = class extends ModalDialogBase {
  get isOpen() {
    return Boolean(this._ui?.rootEl?.open);
  }
  _render({ title, size, closeText, showCloseButton = true }) {
    const dlg = document.createElement("dialog");
    dlg.className = `pwc-modal-dialog pwc-modal-dialog--${size}`;
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
var define2 = () => defineOnce("pwc-modal-dialog", PwcModalDialog);

// src/modal-dialog/modal-dialog.css
var modal_dialog_default = "pwc-modal-dialog {\n  /* sizing */\n  --pwc-modal-max-width: 720px;\n  --pwc-modal-width: 92vw;\n\n  /* spacing */\n  --pwc-modal-padding-header: 12px 16px;\n  --pwc-modal-padding-body: 16px;\n  --pwc-modal-padding-footer: 12px 16px;\n  --pwc-modal-gap-footer: 8px;\n\n  /* visuals */\n  --pwc-modal-bg: #fff;\n  --pwc-modal-backdrop: rgba(0, 0, 0, 0.45);\n  --pwc-modal-border-radius: 6px;\n  --pwc-modal-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);\n  --pwc-modal-separator: rgba(0, 0, 0, 0.08);\n\n  /* controls */\n  --pwc-modal-close-radius: 4px;\n  --pwc-modal-close-hover-bg: rgba(0, 0, 0, 0.06);\n}\n\npwc-modal-dialog dialog.pwc-modal-dialog {\n  border: none;\n  padding: 0;\n  max-width: min(var(--pwc-modal-max-width), var(--pwc-modal-width));\n  width: var(--pwc-modal-width);\n}\n\npwc-modal-dialog dialog.pwc-modal-dialog::backdrop {\n  background: var(--pwc-modal-backdrop);\n}\n\npwc-modal-dialog .pwc-modal-dialog-surface {\n  background: var(--pwc-modal-bg);\n  border-radius: var(--pwc-modal-border-radius);\n  box-shadow: var(--pwc-modal-shadow);\n  overflow: hidden;\n}\n\n/* Header */\n\npwc-modal-dialog .pwc-modal-dialog-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: var(--pwc-modal-padding-header);\n  border-bottom: 1px solid var(--pwc-modal-separator);\n}\n\npwc-modal-dialog .pwc-modal-dialog-title {\n  margin: 0;\n  font-size: 1.1rem;\n  font-weight: 600;\n}\n\n/* Close button */\n\npwc-modal-dialog .pwc-modal-dialog-x {\n  appearance: none;\n  border: none;\n  background: transparent;\n  font: inherit;\n  font-size: 1.25rem;\n  line-height: 1;\n  padding: 4px 6px;\n  cursor: pointer;\n  border-radius: var(--pwc-modal-close-radius);\n}\n\npwc-modal-dialog .pwc-modal-dialog-x:hover {\n  background: var(--pwc-modal-close-hover-bg);\n}\n\n/* Body */\n\npwc-modal-dialog .pwc-modal-dialog-body {\n  padding: var(--pwc-modal-padding-body);\n}\n\n/* Sizes */\n\npwc-modal-dialog dialog.pwc-modal-dialog--sm { --pwc-modal-max-width: 400px; }\npwc-modal-dialog dialog.pwc-modal-dialog--xl { --pwc-modal-max-width: 1000px; }\n\n/* Footer */\n\npwc-modal-dialog .pwc-modal-dialog-footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: var(--pwc-modal-gap-footer);\n  padding: var(--pwc-modal-padding-footer);\n  border-top: 1px solid var(--pwc-modal-separator);\n}\n\n";

// src/modal-dialog/index.js
function register() {
  registerCss(modal_dialog_default);
  define2();
}
register();

// src/dialog-opener/index.js
define();
