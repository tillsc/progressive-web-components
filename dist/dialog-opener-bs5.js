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

// src/core/context.js
var ContextRequestEvent = class extends Event {
  constructor(context, callback) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
  }
};
function requestContext(element, name) {
  let value;
  element.dispatchEvent(new ContextRequestEvent(name, (v) => {
    value = v;
  }));
  return value ?? window.PWC?.[name];
}

// src/core/transclude.js
var MORPH_OPTIONS = {
  morphStyle: "innerHTML",
  restoreFocus: true,
  callbacks: {
    beforeAttributeUpdated(attributeName, node) {
      if ((attributeName === "value" || attributeName === "checked") && node.matches?.("input,textarea,select") && node.isConnected && !node.readOnly && !node.disabled) return false;
      return true;
    },
    afterNodeMorphed(oldNode, newNode) {
      if (!newNode?.matches?.("[data-pwc-force-value]")) return;
      if (newNode.matches("input[type=checkbox],input[type=radio]")) {
        oldNode.checked = newNode.hasAttribute("checked");
      } else {
        oldNode.value = newNode.getAttribute("value") ?? "";
      }
    }
  }
};
function transclude(target, content, contextElement) {
  const el = contextElement || target;
  const morphLib = el.hasAttribute?.("nomorph") ? null : requestContext(el, "idiomorph");
  if (morphLib) {
    morphLib.morph(target, content, MORPH_OPTIONS);
  } else if (typeof content === "string") {
    target.innerHTML = content;
  } else {
    target.replaceChildren(...content);
  }
}
function executeScripts(root) {
  for (const old of Array.from(root.querySelectorAll("script"))) {
    const s = document.createElement("script");
    if (old.src) s.src = old.src;
    if (old.type) s.type = old.type;
    if (old.noModule) s.noModule = true;
    s.textContent = old.textContent;
    old.replaceWith(s);
  }
}

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
          transclude(this, Array.from(fragment.childNodes), this);
          if (localReloadOptions.replaceUrl || localReloadOptions.pushUrl) {
            if (localReloadOptions.pushUrl) {
              history.pushState(null, "", newUri);
            } else if (localReloadOptions.replaceUrl) {
              history.replaceState(null, "", newUri);
            }
          }
          if (localReloadOptions.withScripts) {
            executeScripts(this);
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

// src/dialog-opener/bs5/dialog-opener.js
var PwcDialogOpenerBs5 = class extends BaseDialogOpener {
  findOrCreateDialog(src) {
    const tag = "pwc-modal-dialog-bs5";
    if (!this.modalDialog) {
      this.modalDialog = this.querySelector(tag) || document.createElement(tag);
      if (!this.modalDialog.isConnected) {
        this.appendChild(this.modalDialog);
      }
    }
    const closeText = this.getAttribute("close-text") || "Close";
    this.modalDialog.open({
      title: this.getAttribute("title") || "",
      size: this.getAttribute("size") || "lg",
      closeText,
      showClose: false,
      backdrop: true,
      keyboard: true,
      focus: true
    });
    this.modalDialog.footerEl.classList.add("pwc-dialog-opener-actions");
    this.modalDialog.footerEl.innerHTML = `
      <button type="button" class="btn btn-secondary" data-pwc-action="close" aria-label="${closeText}">
        ${closeText}
      </button>
    `;
    this.modalDialog.bodyEl.replaceChildren(this.createIFrame(src));
    return this.modalDialog;
  }
  closeDialog() {
    this.modalDialog.close();
  }
  _moveOutSelector() {
    let selector = super._moveOutSelector();
    if (selector === "primary") {
      selector = ".btn-primary[type=submit]";
    }
    return selector;
  }
};
function define() {
  defineOnce("pwc-dialog-opener-bs5", PwcDialogOpenerBs5);
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

// src/modal-dialog/bs5/modal-dialog.js
var PwcModalDialogBs5 = class extends ModalDialogBase {
  static events = ["click", "hidden.bs.modal"];
  onConnect() {
    this.classList.add("modal", "fade");
    this.tabIndex = -1;
    this.setAttribute("aria-hidden", "true");
  }
  get isOpen() {
    return this.classList.contains("show");
  }
  requireBsModal() {
    const BsModal = globalThis.bootstrap?.Modal;
    if (!BsModal) throw new Error("Bootstrap Modal required (globalThis.bootstrap.Modal)");
    return BsModal;
  }
  _render({ title, size, closeText, showCloseButton = true }) {
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
    const titleEl = this.querySelector(".modal-title");
    titleEl.textContent = title;
    this.setAttribute("aria-labelledby", ensureId(titleEl, "pwc-mdlg-bs5-title"));
    if (showCloseButton) {
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
    if (e.type === "click" && e.target === this) return;
    super.handleEvent(e);
  }
};
var define2 = () => defineOnce("pwc-modal-dialog-bs5", PwcModalDialogBs5);

// src/modal-dialog/bs5/index.js
function register() {
  define2();
}
register();

// src/dialog-opener/bs5/index.js
function register2() {
  define();
}
register2();
export {
  register2 as register
};
