// src/core/utils.js
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

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

// src/dialog-opener/base.js
var BaseDialogOpener = class extends PwcElement {
  static events = ["click"];
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
    this.open(href);
  }
  open(href) {
    const src = this.prepareIFrameLink(href);
    this.findOrCreateDialog(src);
    this.enhanceIFrame().then(() => this.modal.show());
  }
  prepareIFrameLink(src) {
    const s = new URL(src, document.location.href);
    const defaultValues = [...this.querySelectorAll("input")].map((input) => {
      if (input.value) return input.value;
      return null;
    }).filter((item) => item !== null);
    if (defaultValues.length > 0) {
      s.searchParams.set("default", defaultValues.join(","));
    }
    s.searchParams.set("_layout", false);
    return s.toString();
  }
  // Variant hook: must set this.dialog and this.modal
  // eslint-disable-next-line no-unused-vars
  findOrCreateDialog(_src) {
    throw new Error("BaseDialogOpener: findOrCreateDialog(src) must be implemented by a variant");
  }
  createIFrame(src) {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.style.width = "100%";
    iframe.style.height = getComputedStyle(this).getPropertyValue("--pwc-dialog-opener-height").trim() || "550px";
    iframe.style.display = "none";
    return iframe;
  }
  enhanceIFrame() {
    this.iframe = this.dialog.querySelector("iframe");
    return new Promise((resolve) => {
      this.iframe.addEventListener(
        "load",
        (e) => this.iFrameLoad(e).then(resolve)
      );
    });
  }
  async iFrameLoad(_e) {
    let uri;
    try {
      uri = new URL(this.iframe.contentWindow.location);
    } catch (e) {
      throw new Error(`<pwc-dialog-opener> cannot access iframe location (cross-origin?): ${e.message}`);
    }
    if (uri.searchParams.has("dialog_finished_with")) {
      this.modal.hide();
      uri.searchParams.delete("_layout");
      uri.searchParams.set("dummy", Math.floor(Math.random() * 1e5));
      const localReloadWorked = await this.tryLocalReload(uri);
      if (!localReloadWorked) {
        window.location.href = uri.toString();
      }
      return;
    }
    this.moveElementsToOuterActions();
    this.iframe.style.display = "unset";
  }
  async tryLocalReload(newUri) {
    const currentUri = new URL(window.location.href);
    if (currentUri.hostname !== newUri.hostname || currentUri.pathname !== newUri.pathname || currentUri.protocol !== newUri.protocol) {
      console.log(`<dialog-opener> Warning: local-reload got different base uri (${newUri.toString()}) then window has (${currentUri.toString()}). This might lead to problems, but we'll try it anyway.`);
    }
    if (this.hasAttribute("local-reload") && this.id) {
      const localReloadOptionTokens = document.createElement("div").classList;
      if (this.hasAttribute("local-reload")) localReloadOptionTokens.add(...this.getAttribute("local-reload").split(/\s+/));
      const localReloadOptions = {
        replaceUrl: localReloadOptionTokens.contains("replace-url"),
        pushUrl: localReloadOptionTokens.contains("push-url"),
        withScripts: localReloadOptionTokens.contains("with-scripts")
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
            this.executeInlineScripts(this);
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
  executeInlineScripts(root) {
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
  moveElementsToOuterActions() {
    if (!this.getAttribute("move-out")) return;
    const iframeDoc = this.iframe.contentWindow.document;
    if (!iframeDoc) return;
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
      btn.style.visibility = "hidden";
      btn.style.display = "none";
    }
  }
  _moveOutSelector() {
    let selector = this.getAttribute("move-out");
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
    if (!this.dialog) {
      this.dialog = this.querySelector(tag) || document.createElement(tag);
      if (!this.dialog.isConnected) {
        this.appendChild(this.dialog);
      }
    }
    this.dialog.open({
      title: this.getAttribute("title") || "",
      size: this.getAttribute("size") || "lg",
      closeText: this.getAttribute("close") || "Close",
      showClose: false,
      backdrop: true,
      keyboard: true,
      focus: true
    });
    const closeText = this.getAttribute("close") || "Close";
    this.dialog.footerEl.innerHTML = `
      <div class="pwc-dialog-opener-actions">
        <button type="button" class="btn btn-secondary" data-pwc-action="close" aria-label="${closeText}">
          ${closeText}
        </button>
      </div>
    `;
    const body = this.dialog.bodyEl;
    body.replaceChildren(this.createIFrame(src));
    this.modal = {
      show: () => {
      },
      hide: () => this.dialog.close()
    };
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
