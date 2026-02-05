// src/core/css.js
function installOnce(id, cssText, root = document) {
  if (root.getElementById(id)) return;
  const style = root.createElement("style");
  style.id = id;
  style.textContent = cssText;
  root.head.appendChild(style);
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
  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
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
  onConnect() {
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
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

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
      if (input.type !== "hidden" && input.value) return input.value;
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
        (e) => this.iFrameLoad(e).then(resolve),
        { once: true }
      );
    });
  }
  async iFrameLoad(_e) {
    const uri = new URL(this.iframe.contentWindow.location);
    if (uri.searchParams.has("dialog_finished_with")) {
      this.modal.hide();
      uri.searchParams.delete("_layout");
      uri.searchParams.set("dummy", Math.random(1e5));
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
      console.log(
        `<dialog-opener> Warning: local-reload got different base uri (${newUri.toString()}) then window has (${currentUri.toString()}). This might lead to problems, but we'll try it anyway.`
      );
    }
    if (this.hasAttribute("local-reload") && this.id) {
      newUri.searchParams.set("local_reload", this.id);
      const res = await fetch(newUri);
      if (res.ok) {
        const html = await res.text();
        const newDocument = new DOMParser().parseFromString(html, "text/html");
        const fragment = newDocument.getElementById(this.id);
        if (fragment) {
          this.replaceChildren(...fragment.children);
          return true;
        }
        console.log(
          `<dialog-opener> Problem: Element with id "${this.id}" not found in new serverside fragment`,
          html
        );
      }
    }
    return false;
  }
  moveElementsToOuterActions() {
    if (!this.getAttribute("move-out")) return;
    const iframeDoc = this.iframe.contentWindow.document;
    if (!iframeDoc) return;
    let buttonContainer = this.dialog.querySelector("dialog-opener-buttons");
    if (!buttonContainer) {
      buttonContainer = document.createElement("dialog-opener-buttons");
      this.dialog.querySelector(".modal-footer").prepend(buttonContainer);
    } else {
      buttonContainer.innerHTML = "";
    }
    let selector = this.getAttribute("move-out");
    if (selector === "submit") {
      selector = "button[type=submit], input[type=submit]";
    } else if (selector === "primary") {
      selector = "button[type=submit].btn-primary, input[type=submit].btn-primary";
    }
    const elements = iframeDoc.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      const btn = elements[i];
      const outerBtn = document.createElement(btn.tagName);
      outerBtn.setAttribute("class", btn.getAttribute("class"));
      outerBtn.setAttribute("type", btn.getAttribute("type"));
      outerBtn.setAttribute("value", btn.getAttribute("value"));
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
};

// src/dialog-opener/dialog-opener.js
var DialogController = class {
  constructor(dialogEl) {
    this.el = dialogEl;
  }
  show() {
    if (typeof this.el.showModal === "function" && !this.el.open) {
      this.el.showModal();
    }
  }
  hide() {
    if (this.el.open) {
      this.el.close();
    }
  }
};
var PwcDialogOpener = class extends BaseDialogOpener {
  dialogContent(closeText) {
    return `
      <div class="pwc-dialog-opener-surface" role="document">
        <header class="pwc-dialog-opener-header">
          <button class="pwc-dialog-opener-close" type="button" aria-label="Close">${closeText}</button>
        </header>
        <section class="pwc-dialog-opener-body"></section>
      </div>
    `;
  }
  findOrCreateDialog(src) {
    if (!this.dialog) {
      this.dialog = document.createElement("dialog");
      this.dialog.className = "pwc-dialog-opener-modal";
      this.dialog.addEventListener("click", (e) => {
        if (e.target === this.dialog) this.modal.hide();
      });
      this.dialog.addEventListener("close", () => {
        const iframe2 = this.dialog.querySelector("iframe");
        if (iframe2) iframe2.remove();
      });
      document.body.appendChild(this.dialog);
      this.modal = new DialogController(this.dialog);
    }
    this.dialog.innerHTML = this.dialogContent(this.getAttribute("close") || "Close");
    const closeBtn = this.dialog.querySelector(".pwc-dialog-opener-close");
    if (closeBtn) closeBtn.addEventListener("click", () => this.modal.hide());
    const body = this.dialog.querySelector(".pwc-dialog-opener-body");
    body.innerHTML = "";
    const iframe = this.createIFrame(src);
    body.appendChild(iframe);
  }
};
function define() {
  defineOnce("pwc-dialog-opener", PwcDialogOpener);
}

// src/dialog-opener/dialog-opener.css
var dialog_opener_default = "dialog.pwc-dialog-opener-modal {\n  border: none;\n  padding: 0;\n  background: transparent;\n}\n\ndialog.pwc-dialog-opener-modal::backdrop {\n  background: rgba(0, 0, 0, 0.45);\n}\n\n/* Visual surface */\ndialog.pwc-dialog-opener-modal .pwc-dialog-opener-surface {\n  width: min(900px, 92vw);\n  max-height: 92vh;\n\n  background: #fff;\n  border-radius: 10px;\n  overflow: hidden;\n\n  box-shadow:\n    0 12px 30px rgba(0, 0, 0, 0.25);\n}\n\n/* Header */\ndialog.pwc-dialog-opener-modal .pwc-dialog-opener-header {\n  display: flex;\n  justify-content: flex-end;\n  padding: 10px 12px;\n\n  border-bottom: 1px solid rgba(0, 0, 0, 0.08);\n}\n\n/* Close button */\ndialog.pwc-dialog-opener-modal .pwc-dialog-opener-close {\n  appearance: none;\n  border: none;\n  background: transparent;\n  font: inherit;\n\n  padding: 6px 8px;\n  border-radius: 6px;\n  cursor: pointer;\n}\n\ndialog.pwc-dialog-opener-modal .pwc-dialog-opener-close:hover {\n  background: rgba(0, 0, 0, 0.06);\n}\n\n/* Body */\ndialog.pwc-dialog-opener-modal .pwc-dialog-opener-body {\n  padding: 0;\n}\n\n/* iframe */\ndialog.pwc-dialog-opener-modal iframe {\n  display: block;\n  width: 100%;\n  height: var(--pwc-dialog-opener-height, 550px);\n  border: none;\n}";

// src/dialog-opener/index.js
function register() {
  installOnce("pwc-dialog-opener", dialog_opener_default);
  define();
}
register();
export {
  register
};
