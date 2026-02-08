// src/core/utils.js
function ensureId(el, prefix = "pwc") {
  if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2)}`;
  return el.id;
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

// src/modal-dialog/bs5/modal-dialog.js
var PwcModalDialogBs5 = class extends PwcSimpleInitElement {
  onConnect() {
    this.classList.add("modal", "fade");
    this.tabIndex = -1;
    this.setAttribute("aria-hidden", "true");
  }
  onDisconnect() {
    this._teardown();
  }
  open(options = {}) {
    const BsModal = globalThis.bootstrap?.Modal;
    if (!BsModal) throw new Error("Bootstrap Modal required (globalThis.bootstrap.Modal)");
    if (!this.isConnected) {
      this._autoRemove = true;
      document.body.appendChild(this);
    }
    const {
      title = "",
      size = "lg",
      closeText = "Close",
      backdrop = true,
      keyboard = true,
      focus = true
    } = options;
    this.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-${size}">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title"></h3>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer"></div>
        </div>
      </div>
    `;
    const dialogEl = this.querySelector(".modal-dialog");
    const titleEl = this.querySelector(".modal-title");
    const bodyEl = this.querySelector(".modal-body");
    const footerEl = this.querySelector(".modal-footer");
    titleEl.textContent = title;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn btn-secondary";
    closeBtn.setAttribute("data-bs-dismiss", "modal");
    closeBtn.textContent = closeText;
    footerEl.append(closeBtn);
    const parentModalEl = document.querySelector(".modal.show");
    const parentId = parentModalEl && parentModalEl !== this ? ensureId(parentModalEl) : null;
    if (parentId) this.dataset.parentModalId = parentId;
    else delete this.dataset.parentModalId;
    this._modal = BsModal.getOrCreateInstance(this, { backdrop, keyboard, focus });
    this._closed = false;
    const onHidden = () => {
      if (this.dataset.closeReason !== "final") return;
      this.removeEventListener("hidden.bs.modal", onHidden);
      this._teardown();
      const pid = this.dataset.parentModalId;
      if (pid) {
        const el = document.getElementById(pid);
        if (el) {
          delete el.dataset.closeReason;
          BsModal.getOrCreateInstance(el).show();
        }
      }
      delete this.dataset.closeReason;
      if (this._autoRemove && this.isConnected) this.remove();
    };
    this.addEventListener("hidden.bs.modal", onHidden);
    if (parentModalEl && parentModalEl !== this) {
      parentModalEl.dataset.closeReason = "suspend";
      BsModal.getOrCreateInstance(parentModalEl).hide();
    }
    this._modal.show();
    return {
      el: this,
      bodyEl,
      footerEl,
      close: () => this.close()
    };
  }
  close() {
    if (this._closed) return;
    this._closed = true;
    this.dataset.closeReason = "final";
    this._modal?.hide();
  }
  _teardown() {
    try {
      this._modal?.dispose();
    } catch {
    } finally {
      this._modal = null;
    }
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
