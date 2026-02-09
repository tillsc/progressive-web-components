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

// src/dialog-opener/dialog-opener.js
var PwcDialogOpener = class extends BaseDialogOpener {
  findOrCreateDialog(src) {
    if (!this.modalDialog) {
      this.modalDialog = document.createElement("pwc-modal-dialog");
      document.body.appendChild(this.modalDialog);
    }
    const closeText = this.getAttribute("close") || "Close";
    this.modalDialog.open({
      closeText,
      showClose: false
    });
    this.modalDialog.footerEl.innerHTML = `
  <div class="pwc-dialog-opener-actions pwc-dialog-opener-footer">
    <button type="button" class="pwc-dialog-opener-close" data-pwc-action="close" aria-label="${closeText}">
      ${closeText}
    </button>
  </div>
`;
    const iframe = this.createIFrame(src);
    this.modalDialog.bodyEl.replaceChildren(iframe);
    this.dialog = this.modalDialog.ui.rootEl;
    this.modal = {
      show: () => {
      },
      // modal-dialog is already shown by open()
      hide: () => this.modalDialog.close()
    };
  }
};
function define() {
  defineOnce("pwc-dialog-opener", PwcDialogOpener);
}

// src/dialog-opener/dialog-opener.css
var dialog_opener_default = "/* Footer actions container (used by move-out) */\n.pwc-dialog-opener-footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: 8px;\n}\n\n/* Close button */\n.pwc-dialog-opener-close {\n  appearance: none;\n  border: 1px solid rgba(0, 0, 0, 0.25);\n  background: transparent;\n  font: inherit;\n  padding: 6px 12px;\n  border-radius: 4px;\n  cursor: pointer;\n}\n\n.pwc-dialog-opener-close:hover {\n  background: rgba(0, 0, 0, 0.06);\n}\n";

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

// src/modal-dialog/modal-dialog.js
var PwcModalDialog = class extends ModalDialogBase {
  isOpen() {
    return Boolean(this._ui?.rootEl?.open);
  }
  _render({ title, size, closeText, showClose = true }) {
    const dlg = document.createElement("dialog");
    dlg.className = `pwc-modal-dialog pwc-modal-dialog--${size}`;
    dlg.innerHTML = `
      <div class="pwc-modal-dialog-surface" role="document">
        <header class="pwc-modal-dialog-header">
          <h3 class="pwc-modal-dialog-title"></h3>
        </header>
        <section class="pwc-modal-dialog-body"></section>
        <footer class="pwc-modal-dialog-footer"></footer>
      </div>
    `;
    dlg.querySelector(".pwc-modal-dialog-title").textContent = title;
    if (showClose) {
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
var modal_dialog_default = "pwc-modal-dialog {\n  /* sizing */\n  --pwc-modal-max-width: 720px;\n  --pwc-modal-width: 92vw;\n\n  /* spacing */\n  --pwc-modal-padding-header: 12px 16px;\n  --pwc-modal-padding-body: 16px;\n  --pwc-modal-padding-footer: 12px 16px;\n  --pwc-modal-gap-footer: 8px;\n\n  /* visuals */\n  --pwc-modal-bg: #fff;\n  --pwc-modal-backdrop: rgba(0, 0, 0, 0.45);\n  --pwc-modal-border-radius: 6px;\n  --pwc-modal-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);\n  --pwc-modal-separator: rgba(0, 0, 0, 0.08);\n\n  /* controls */\n  --pwc-modal-close-radius: 4px;\n  --pwc-modal-close-hover-bg: rgba(0, 0, 0, 0.06);\n}\n\npwc-modal-dialog dialog.pwc-modal-dialog {\n  border: none;\n  padding: 0;\n  max-width: min(var(--pwc-modal-max-width), var(--pwc-modal-width));\n  width: var(--pwc-modal-width);\n}\n\npwc-modal-dialog dialog.pwc-modal-dialog::backdrop {\n  background: var(--pwc-modal-backdrop);\n}\n\npwc-modal-dialog .pwc-modal-dialog-surface {\n  background: var(--pwc-modal-bg);\n  border-radius: var(--pwc-modal-border-radius);\n  box-shadow: var(--pwc-modal-shadow);\n  overflow: hidden;\n}\n\n/* Header */\n\npwc-modal-dialog .pwc-modal-dialog-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: var(--pwc-modal-padding-header);\n  border-bottom: 1px solid var(--pwc-modal-separator);\n}\n\npwc-modal-dialog .pwc-modal-dialog-title {\n  margin: 0;\n  font-size: 1.1rem;\n  font-weight: 600;\n}\n\n/* Close button */\n\npwc-modal-dialog .pwc-modal-dialog-x {\n  appearance: none;\n  border: none;\n  background: transparent;\n  font: inherit;\n  font-size: 1.25rem;\n  line-height: 1;\n  padding: 4px 6px;\n  cursor: pointer;\n  border-radius: var(--pwc-modal-close-radius);\n}\n\npwc-modal-dialog .pwc-modal-dialog-x:hover {\n  background: var(--pwc-modal-close-hover-bg);\n}\n\n/* Body */\n\npwc-modal-dialog .pwc-modal-dialog-body {\n  padding: var(--pwc-modal-padding-body);\n}\n\n/* Footer */\n\npwc-modal-dialog .pwc-modal-dialog-footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: var(--pwc-modal-gap-footer);\n  padding: var(--pwc-modal-padding-footer);\n  border-top: 1px solid var(--pwc-modal-separator);\n}\n\npwc-modal-dialog .pwc-modal-dialog-close {\n  appearance: none;\n  border: 1px solid rgba(0, 0, 0, 0.25);\n  background: transparent;\n  padding: 6px 12px;\n  border-radius: var(--pwc-modal-close-radius);\n  cursor: pointer;\n}\n\npwc-modal-dialog .pwc-modal-dialog-close:hover {\n  background: var(--pwc-modal-close-hover-bg);\n}";

// src/modal-dialog/index.js
function register() {
  PwcModalDialog.registerCss(modal_dialog_default);
  define2();
}
register();

// src/dialog-opener/index.js
function register2() {
  PwcDialogOpener.registerCss(dialog_opener_default);
  define();
}
register2();
export {
  register2 as register
};
