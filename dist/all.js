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

// src/filter/base.js
var BaseFilter = class extends PwcSimpleInitElement {
  static defaultRowSelector = "pwc-filter-row, [data-pwc-filter-row]";
  static events = ["input"];
  onConnect() {
    const { wrapper, input } = this._createInput();
    this._input = input;
    const debounceTimeout = Number(this.getAttribute("debounce"));
    this._debouncedFilter = this._debounce(
      () => this.applyFilter(),
      Number.isFinite(debounceTimeout) ? debounceTimeout : 300
    );
    this.prepend(wrapper);
  }
  onDisconnect() {
    clearTimeout(this._debounceTimer);
  }
  handleEvent(e) {
    if (e.type === "input" && e.target === this._input) {
      this._debouncedFilter();
    }
  }
  get filterText() {
    return this._input?.value ?? "";
  }
  set filterText(text) {
    if (this._input) this._input.value = text;
    this.applyFilter();
  }
  _createInput() {
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = this.getAttribute("placeholder") || "Search\u2026";
    return { wrapper: input, input };
  }
  _debounce(fn, timeout) {
    if (timeout === 0) return fn;
    return () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(fn, timeout);
    };
  }
  _rowSelector() {
    return this.getAttribute("row-selector") || this.constructor.defaultRowSelector;
  }
  _rows() {
    return Array.from(this.querySelectorAll(this._rowSelector()));
  }
  applyFilter() {
    if (!this._input) return;
    const tokens = this._input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const rows = this._rows();
    for (const row of rows) {
      const text = row.textContent.replace(/\s+/g, " ").toLowerCase();
      row.hidden = tokens.length > 0 && !tokens.every((t) => text.includes(t));
    }
    this.dispatchEvent(
      new CustomEvent("pwc-filter:change", {
        bubbles: true,
        detail: {
          filterText: this._input.value,
          matchCount: rows.filter((r) => !r.hidden).length,
          totalCount: rows.length
        }
      })
    );
  }
};

// src/filter/filter.js
var PwcFilter = class extends BaseFilter {
};
function define() {
  defineOnce("pwc-filter", PwcFilter);
}

// src/filter/index.js
function register() {
  define();
}
register();

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
    this.dialog = this.findOrCreateDialog(src);
    this.enhanceIFrame();
  }
  prepareIFrameLink(src) {
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
  enhanceIFrame() {
    this.iframe = this.dialog.querySelector("iframe");
    return new Promise((resolve, reject) => {
      this.iframe.addEventListener(
        "load",
        (e) => this.iFrameLoad(e).then(resolve, reject)
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
    if (uri.searchParams.has("pwc_done_with")) {
      this.closeDialog();
      uri.searchParams.delete("pwc_embedded");
      uri.searchParams.set("pwc_cb", Math.floor(Math.random() * 1e5));
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
    if (!this.getAttribute("hoist-actions")) return;
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
      btn.style.display = "none";
    }
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
function define2() {
  defineOnce("pwc-dialog-opener", PwcDialogOpener);
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
      <div class="pwc-modal-dialog-surface" role="document">
        <header class="pwc-modal-dialog-header">
          <h3 class="pwc-modal-dialog-title"></h3>
        </header>
        <section class="pwc-modal-dialog-body"></section>
        <footer class="pwc-modal-dialog-footer"></footer>
      </div>
    `;
    dlg.querySelector(".pwc-modal-dialog-title").textContent = title;
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
var define3 = () => defineOnce("pwc-modal-dialog", PwcModalDialog);

// src/modal-dialog/modal-dialog.css
var modal_dialog_default = "pwc-modal-dialog {\n  /* sizing */\n  --pwc-modal-max-width: 720px;\n  --pwc-modal-width: 92vw;\n\n  /* spacing */\n  --pwc-modal-padding-header: 12px 16px;\n  --pwc-modal-padding-body: 16px;\n  --pwc-modal-padding-footer: 12px 16px;\n  --pwc-modal-gap-footer: 8px;\n\n  /* visuals */\n  --pwc-modal-bg: #fff;\n  --pwc-modal-backdrop: rgba(0, 0, 0, 0.45);\n  --pwc-modal-border-radius: 6px;\n  --pwc-modal-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);\n  --pwc-modal-separator: rgba(0, 0, 0, 0.08);\n\n  /* controls */\n  --pwc-modal-close-radius: 4px;\n  --pwc-modal-close-hover-bg: rgba(0, 0, 0, 0.06);\n}\n\npwc-modal-dialog dialog.pwc-modal-dialog {\n  border: none;\n  padding: 0;\n  max-width: min(var(--pwc-modal-max-width), var(--pwc-modal-width));\n  width: var(--pwc-modal-width);\n}\n\npwc-modal-dialog dialog.pwc-modal-dialog::backdrop {\n  background: var(--pwc-modal-backdrop);\n}\n\npwc-modal-dialog .pwc-modal-dialog-surface {\n  background: var(--pwc-modal-bg);\n  border-radius: var(--pwc-modal-border-radius);\n  box-shadow: var(--pwc-modal-shadow);\n  overflow: hidden;\n}\n\n/* Header */\n\npwc-modal-dialog .pwc-modal-dialog-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: var(--pwc-modal-padding-header);\n  border-bottom: 1px solid var(--pwc-modal-separator);\n}\n\npwc-modal-dialog .pwc-modal-dialog-title {\n  margin: 0;\n  font-size: 1.1rem;\n  font-weight: 600;\n}\n\n/* Close button */\n\npwc-modal-dialog .pwc-modal-dialog-x {\n  appearance: none;\n  border: none;\n  background: transparent;\n  font: inherit;\n  font-size: 1.25rem;\n  line-height: 1;\n  padding: 4px 6px;\n  cursor: pointer;\n  border-radius: var(--pwc-modal-close-radius);\n}\n\npwc-modal-dialog .pwc-modal-dialog-x:hover {\n  background: var(--pwc-modal-close-hover-bg);\n}\n\n/* Body */\n\npwc-modal-dialog .pwc-modal-dialog-body {\n  padding: var(--pwc-modal-padding-body);\n}\n\n/* Sizes */\n\npwc-modal-dialog dialog.pwc-modal-dialog--sm { --pwc-modal-max-width: 400px; }\npwc-modal-dialog dialog.pwc-modal-dialog--xl { --pwc-modal-max-width: 1000px; }\n\n/* Footer */\n\npwc-modal-dialog .pwc-modal-dialog-footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: var(--pwc-modal-gap-footer);\n  padding: var(--pwc-modal-padding-footer);\n  border-top: 1px solid var(--pwc-modal-separator);\n}\n\n";

// src/modal-dialog/index.js
function register2() {
  PwcModalDialog.registerCss(modal_dialog_default);
  define3();
}
register2();

// src/dialog-opener/index.js
define2();

// src/core/pwc-children-observer-element.js
var PwcChildrenObserverElement = class extends PwcElement {
  static observeMode = "children";
  // "children" | "tree"
  connectedCallback() {
    if (this._connected) return;
    super.connectedCallback();
    this._startChildrenObserver();
  }
  disconnectedCallback() {
    this._stopChildrenObserver();
    super.disconnectedCallback();
  }
  onChildrenChanged(_mutations) {
  }
  /** Run fn() without triggering onChildrenChanged for the resulting DOM mutations. */
  _withoutChildrenChangedNotification(fn) {
    fn();
    this._childrenObserver?.takeRecords();
  }
  _startChildrenObserver() {
    const mode = this.constructor.observeMode || "children";
    const subtree = mode === "tree";
    this._childrenObserver = new MutationObserver((mutations) => {
      if (!this._connected) return;
      this.onChildrenChanged(mutations);
    });
    this._childrenObserver.observe(this, { childList: true, subtree });
    this.onChildrenChanged([]);
  }
  _stopChildrenObserver() {
    if (!this._childrenObserver) return;
    this._childrenObserver.disconnect();
    this._childrenObserver = null;
  }
};

// src/multiselect-dual-list/base.js
var MultiselectDualListBase = class extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static events = ["click"];
  get _selectedClass() {
    return "pwc-msdl-item--selected";
  }
  onChildrenChanged() {
    const select = this.querySelector("select");
    if (!select) return;
    this._select = select;
    const items = this._parseOptions(select);
    this._items = items;
    this._itemsByValue = new Map(items.map((item) => [item.value, item]));
    this._withoutChildrenChangedNotification(() => {
      if (!this._availableList) {
        const ui = this._buildUI();
        this._availableList = ui.availableList;
        this._selectedList = ui.selectedList;
      }
      this._populateLists(items);
      select.style.display = "none";
      this.filter?.applyFilter?.();
    });
  }
  _populateLists(items) {
    this._availableList.replaceChildren();
    this._selectedList.replaceChildren();
    for (const item of items) {
      this._availableList.appendChild(this._createAvailableEntry(item));
    }
    for (const item of items) {
      if (item.selected) {
        this._selectedList.appendChild(this._createSelectedEntry(item));
      }
    }
  }
  _parseOptions(select) {
    const options = Array.from(select.options);
    const parentMap = /* @__PURE__ */ new Map();
    for (const opt of options) {
      const parent = opt.dataset.parent;
      if (parent) parentMap.set(opt.value, parent);
    }
    return options.map((opt) => ({
      value: opt.value,
      label: opt.textContent,
      parent: opt.dataset.parent || null,
      depth: this._calculateDepth(opt.value, parentMap),
      selected: opt.selected,
      disabled: opt.disabled,
      warnOnUnselect: opt.dataset.warnOnUnselect || null
    }));
  }
  _calculateDepth(value, parentMap) {
    let depth = 0;
    let current = value;
    const visited = /* @__PURE__ */ new Set();
    while (parentMap.has(current)) {
      if (visited.has(current)) break;
      visited.add(current);
      current = parentMap.get(current);
      depth++;
    }
    return depth;
  }
  handleEvent(e) {
    if (e.type === "click") {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl || !this.contains(actionEl)) return;
      const action = actionEl.dataset.action;
      const value = actionEl.closest("[data-value]")?.dataset.value;
      if (!value) return;
      if (action === "add") this._addItem(value);
      else if (action === "remove") this._removeItem(value);
    }
  }
  _addItem(value) {
    const item = this._itemsByValue.get(value);
    if (!item || item.disabled) return;
    if (!this.select.hasAttribute("multiple")) {
      for (const opt2 of this._select.options) {
        if (opt2.selected) opt2.selected = false;
      }
      for (const el of this._availableList.querySelectorAll(`.${this._selectedClass}`)) {
        el.classList.remove(this._selectedClass);
        el.setAttribute("aria-selected", "false");
        const btn = el.querySelector("[data-action='add']");
        if (btn) btn.style.display = "";
      }
    }
    const opt = this._select.querySelector(`option[value="${CSS.escape(value)}"]`);
    if (opt) opt.selected = true;
    const availEl = this._availableList.querySelector(`[data-value="${CSS.escape(value)}"]`);
    if (availEl) {
      availEl.classList.add(this._selectedClass);
      availEl.setAttribute("aria-selected", "true");
      const btn = availEl.querySelector("[data-action='add']");
      if (btn) btn.style.display = "none";
    }
    this._withoutChildrenChangedNotification(() => {
      if (!this.select.hasAttribute("multiple")) this._selectedList.replaceChildren();
      this._selectedList.appendChild(this._createSelectedEntry(item));
    });
  }
  _removeItem(value) {
    const item = this._itemsByValue.get(value);
    if (!item) return;
    if (item.warnOnUnselect && !confirm(item.warnOnUnselect)) return;
    const opt = this._select.querySelector(`option[value="${CSS.escape(value)}"]`);
    if (opt) opt.selected = false;
    const availEl = this._availableList.querySelector(`[data-value="${CSS.escape(value)}"]`);
    if (availEl) {
      availEl.classList.remove(this._selectedClass);
      availEl.setAttribute("aria-selected", "false");
      const btn = availEl.querySelector("[data-action='add']");
      if (btn) btn.style.display = "";
    }
    const selEl = this._selectedList.querySelector(`[data-value="${CSS.escape(value)}"]`);
    if (selEl) this._withoutChildrenChangedNotification(() => selEl.remove());
  }
  get select() {
    return this._select;
  }
  get filter() {
    return this.querySelector("pwc-filter, pwc-filter-bs5");
  }
  get selectedLabel() {
    return this.getAttribute("selected-label") || "Selected";
  }
  get availableLabel() {
    return this.getAttribute("available-label") || "Available";
  }
  get addLabel() {
    return this.getAttribute("add-label") || "\u2190";
  }
  get removeLabel() {
    return this.getAttribute("remove-label") || "\xD7";
  }
};

// src/multiselect-dual-list/multiselect-dual-list.js
var PwcMultiselectDualList = class extends MultiselectDualListBase {
  _buildUI() {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="pwc-msdl-selected">
        <div class="pwc-msdl-header">${this.selectedLabel}</div>
        <ul class="pwc-msdl-list" role="listbox" aria-label="${this.selectedLabel}"></ul>
      </div>
      <div class="pwc-msdl-available">
        <div class="pwc-msdl-header">${this.availableLabel}</div>
        <pwc-filter row-selector="[data-value]">
          <ul class="pwc-msdl-list" role="listbox" aria-label="${this.availableLabel}"></ul>
        </pwc-filter>
      </div>
    `;
    container.className = "pwc-msdl-container";
    this.select.after(container);
    return {
      selectedList: container.querySelector(".pwc-msdl-selected .pwc-msdl-list"),
      availableList: container.querySelector(".pwc-msdl-available .pwc-msdl-list")
    };
  }
  _createEntry(item) {
    const li = document.createElement("li");
    li.className = "pwc-msdl-item";
    li.role = "option";
    li.dataset.value = item.value;
    const label = document.createElement("span");
    label.textContent = item.label;
    li.appendChild(label);
    return li;
  }
  _createAvailableEntry(item) {
    const li = this._createEntry(item);
    li.setAttribute("aria-selected", String(item.selected));
    if (item.disabled) {
      li.classList.add("pwc-msdl-item--disabled");
      li.setAttribute("aria-disabled", "true");
    }
    if (item.selected) li.classList.add("pwc-msdl-item--selected");
    if (item.depth > 0) li.style.paddingLeft = `${item.depth * 1.5}em`;
    if (!item.disabled) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pwc-msdl-action";
      btn.dataset.action = "add";
      btn.textContent = this.addLabel;
      btn.setAttribute("aria-label", `${this.addLabel} ${item.label}`);
      if (item.selected) btn.style.display = "none";
      li.appendChild(btn);
    }
    return li;
  }
  _createSelectedEntry(item) {
    const li = this._createEntry(item);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pwc-msdl-action";
    btn.dataset.action = "remove";
    btn.textContent = this.removeLabel;
    btn.setAttribute("aria-label", `${this.removeLabel} ${item.label}`);
    li.appendChild(btn);
    return li;
  }
};
var define4 = () => defineOnce("pwc-multiselect-dual-list", PwcMultiselectDualList);

// src/multiselect-dual-list/multiselect-dual-list.css
var multiselect_dual_list_default = "pwc-multiselect-dual-list {\n  /* sizing */\n  --pwc-msdl-width: 100%;\n\n  /* spacing */\n  --pwc-msdl-gap: 12px;\n  --pwc-msdl-padding: 8px;\n  --pwc-msdl-item-padding: 6px 10px;\n  --pwc-msdl-indent: 1.5em;\n\n  /* list */\n  --pwc-msdl-list-max-height: 20em;\n\n  /* visuals */\n  --pwc-msdl-bg: #fff;\n  --pwc-msdl-border: 1px solid rgba(0, 0, 0, 0.15);\n  --pwc-msdl-border-radius: 4px;\n  --pwc-msdl-separator: rgba(0, 0, 0, 0.08);\n\n  /* item */\n  --pwc-msdl-item-bg: #f8f8f8;\n  --pwc-msdl-item-hover-bg: #f0f0f0;\n  --pwc-msdl-item-selected-bg: #e8e8e8;\n  --pwc-msdl-item-selected-color: #999;\n  --pwc-msdl-item-disabled-color: #bbb;\n\n  /* button */\n  --pwc-msdl-action-bg: transparent;\n  --pwc-msdl-action-hover-bg: rgba(0, 0, 0, 0.06);\n  --pwc-msdl-action-border: 1px solid rgba(0, 0, 0, 0.2);\n  --pwc-msdl-action-radius: 3px;\n\n  display: block;\n  width: var(--pwc-msdl-width);\n}\n\n.pwc-msdl-container {\n  display: flex;\n  gap: var(--pwc-msdl-gap);\n}\n\n.pwc-msdl-selected,\n.pwc-msdl-available {\n  flex: 1;\n  min-width: 0;\n  background: var(--pwc-msdl-bg);\n  border: var(--pwc-msdl-border);\n  border-radius: var(--pwc-msdl-border-radius);\n  padding: var(--pwc-msdl-padding);\n}\n\n.pwc-msdl-header {\n  font-weight: 600;\n  margin-bottom: 6px;\n}\n\n.pwc-msdl-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  max-height: var(--pwc-msdl-list-max-height);\n  overflow-y: auto;\n}\n\n.pwc-msdl-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: var(--pwc-msdl-item-padding);\n  background: var(--pwc-msdl-item-bg);\n  border-bottom: 1px solid var(--pwc-msdl-separator);\n}\n\n.pwc-msdl-item:last-child {\n  border-bottom: none;\n}\n\n.pwc-msdl-item:hover {\n  background: var(--pwc-msdl-item-hover-bg);\n}\n\n.pwc-msdl-item--selected {\n  background: var(--pwc-msdl-item-selected-bg);\n  color: var(--pwc-msdl-item-selected-color);\n}\n\n.pwc-msdl-item--disabled {\n  color: var(--pwc-msdl-item-disabled-color);\n  cursor: default;\n}\n\n.pwc-msdl-action {\n  appearance: none;\n  border: var(--pwc-msdl-action-border);\n  background: var(--pwc-msdl-action-bg);\n  padding: 2px 8px;\n  border-radius: var(--pwc-msdl-action-radius);\n  cursor: pointer;\n  font: inherit;\n  font-size: 0.85em;\n  flex-shrink: 0;\n  margin-left: 8px;\n}\n\n.pwc-msdl-action:hover {\n  background: var(--pwc-msdl-action-hover-bg);\n}\n\npwc-multiselect-dual-list[hide-selected] .pwc-msdl-item--selected {\n  display: none;\n}\n";

// src/multiselect-dual-list/index.js
function register3() {
  PwcMultiselectDualList.registerCss(multiselect_dual_list_default);
  define4();
}
register3();

// src/zone-transfer/zone-transfer.js
var PwcZoneTransfer = class extends PwcChildrenObserverElement {
  static events = ["dragstart", "dragover", "drop", "dragend", "keydown"];
  static observeMode = "tree";
  static zoneSelector = "pwc-zone-transfer-zone, [data-pwc-zone]";
  static itemSelector = "pwc-zone-transfer-item, [data-pwc-item]";
  static handleSelector = "pwc-zone-transfer-handle, [data-pwc-handle]";
  onChildrenChanged() {
    const items = this._items();
    for (const item of items) {
      if (!item.hasAttribute("draggable")) item.setAttribute("draggable", "true");
      if (!item.hasAttribute("tabindex")) item.tabIndex = -1;
      if (!item.hasAttribute("role")) item.setAttribute("role", "option");
    }
    for (const zone of this._zones()) {
      if (!zone.hasAttribute("role")) zone.setAttribute("role", "listbox");
      if (!zone.hasAttribute("tabindex")) zone.tabIndex = -1;
    }
    const active = items.find((it) => it.tabIndex === 0) || items[0] || null;
    for (const it of items) it.tabIndex = it === active ? 0 : -1;
  }
  handleEvent(e) {
    if (e.type === "dragstart") return this._onDragStart(e);
    if (e.type === "dragover") return this._onDragOver(e);
    if (e.type === "drop") return this._onDrop(e);
    if (e.type === "dragend") return this._onDragEnd();
    if (e.type === "keydown") return this._onKeyDown(e);
  }
  _zones() {
    return Array.from(this.querySelectorAll(this.constructor.zoneSelector));
  }
  _items(zoneEl) {
    return Array.from((zoneEl || this).querySelectorAll(this.constructor.itemSelector));
  }
  _onDragStart(e) {
    const item = this._closestItem(e.target);
    if (!item) return;
    if (item.querySelector(this.constructor.handleSelector) && !this._closestHandle(e.target)) {
      e.preventDefault();
      return;
    }
    const zone = this._closestZone(item);
    if (!zone) return;
    this._drag = { item, fromZone: zone };
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    item.classList.add("pwc-zone-transfer-dragging");
    this._ensurePlaceholder(item);
  }
  _onDragOver(e) {
    if (!this._drag?.item) return;
    const zone = this._closestZone(e.target);
    if (!zone) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    this._ensurePlaceholder(this._drag.item);
    const beforeEl = this._beforeFromPointer(zone, e, this._drag.item);
    this._movePlaceholder(zone, beforeEl);
  }
  _onDrop(e) {
    if (!this._drag?.item) return;
    const zone = this._closestZone(e.target);
    if (!zone) return;
    e.preventDefault();
    this._applyMove(this._drag.item, this._drag.fromZone, zone, "drag");
    this._clearPlaceholder();
  }
  _onDragEnd() {
    if (this._drag?.item) this._drag.item.classList.remove("pwc-zone-transfer-dragging");
    this._drag = null;
    this._clearPlaceholder();
  }
  _onKeyDown(e) {
    if (e.target?.closest?.("input,textarea,select,button,[contenteditable]")) return;
    const item = this._closestItem(e.target);
    if (!item) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      if (e.ctrlKey || e.metaKey) this._keyboardReorder(item, dir);
      else this._focusSibling(item, dir);
      return;
    }
    const zone = this._zoneByHotkey(e.key);
    if (!zone) return;
    e.preventDefault();
    this._keyboardMoveToZone(item, zone);
  }
  _keyboardReorder(item, dir) {
    const zone = this._closestZone(item);
    if (!zone) return;
    const items = this._items(zone);
    const i = items.indexOf(item);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    zone.insertBefore(item, dir > 0 ? items[j].nextElementSibling : items[j]);
    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    item.focus();
    this._emitChange(item, zone, zone, this._indexInZone(item, zone), "keyboard");
  }
  _keyboardMoveToZone(item, zone) {
    const fromZone = this._closestZone(item);
    if (!fromZone || fromZone === zone) return;
    zone.appendChild(item);
    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    item.focus();
    this._emitChange(item, fromZone, zone, this._indexInZone(item, zone), "keyboard");
  }
  _zoneByHotkey(key) {
    const zones = this._zones();
    if (!zones.some((z) => z.hasAttribute("data-pwc-zone-hotkey"))) return null;
    return zones.find((z) => z.getAttribute("data-pwc-zone-hotkey") === key) || null;
  }
  _emitChange(item, fromZone, toZone, index, trigger) {
    this.dispatchEvent(
      new CustomEvent("pwc-zone-transfer:change", {
        bubbles: true,
        detail: {
          itemId: this._itemId(item),
          fromZone: this._zoneName(fromZone),
          toZone: this._zoneName(toZone),
          index,
          trigger
        }
      })
    );
  }
  _applyMove(item, fromZone, toZone, trigger) {
    if (this._placeholder?.parentNode === toZone) toZone.insertBefore(item, this._placeholder);
    else toZone.appendChild(item);
    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    this._emitChange(item, fromZone, toZone, this._indexInZone(item, toZone), trigger);
  }
  _focusSibling(item, dir) {
    const zone = this._closestZone(item);
    if (!zone) return;
    const items = this._items(zone);
    const i = items.indexOf(item);
    if (i < 0) return;
    const next = items[i + dir];
    if (!next) return;
    item.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  }
  _ensurePlaceholder(itemEl) {
    if (this._placeholder?.isConnected) return;
    this._placeholder = document.createElement("div");
    this._placeholder.className = "pwc-zone-transfer-placeholder";
    this._placeholder.setAttribute("aria-hidden", "true");
    this._placeholder.style.height = `${Math.max(8, Math.round(itemEl.getBoundingClientRect().height || 0))}px`;
  }
  _movePlaceholder(zoneEl, beforeEl) {
    if (!this._placeholder) return;
    if (beforeEl && beforeEl.parentNode === zoneEl) zoneEl.insertBefore(this._placeholder, beforeEl);
    else zoneEl.appendChild(this._placeholder);
  }
  _clearPlaceholder() {
    if (this._placeholder?.parentNode) this._placeholder.parentNode.removeChild(this._placeholder);
  }
  _beforeFromPointer(zoneEl, e, draggedItem) {
    const y = e.clientY;
    for (const it of this._items(zoneEl)) {
      if (it === draggedItem || it === this._placeholder) continue;
      const r = it.getBoundingClientRect();
      if (y <= r.top + r.height / 2) return it;
    }
    return null;
  }
  _closestZone(node) {
    if (!(node instanceof Element)) return null;
    const zone = node.closest(this.constructor.zoneSelector);
    return zone && this.contains(zone) ? zone : null;
  }
  _closestItem(node) {
    if (!(node instanceof Element)) return null;
    const item = node.closest(this.constructor.itemSelector);
    return item && this.contains(item) ? item : null;
  }
  _closestHandle(node) {
    if (!(node instanceof Element)) return null;
    const handle = node.closest(this.constructor.handleSelector);
    return handle && this.contains(handle) ? handle : null;
  }
  _zoneName(zoneEl) {
    if (!zoneEl) return "";
    return zoneEl.tagName.toLowerCase() === "pwc-zone-transfer-zone" ? zoneEl.getAttribute("name") || "" : zoneEl.getAttribute("data-pwc-zone") || "";
  }
  _itemId(itemEl) {
    if (!itemEl) return "";
    return itemEl.tagName.toLowerCase() === "pwc-zone-transfer-item" ? itemEl.getAttribute("id") || itemEl.getAttribute("data-id") || "" : itemEl.getAttribute("data-pwc-item") || itemEl.getAttribute("id") || "";
  }
  _indexInZone(itemEl, zoneEl) {
    return Math.max(0, this._items(zoneEl).indexOf(itemEl));
  }
};
function define5() {
  defineOnce("pwc-zone-transfer", PwcZoneTransfer);
}

// src/zone-transfer/zone-transfer.css
var zone_transfer_default = 'pwc-zone-transfer [draggable="true"] {\n    cursor: grab;\n}\n\npwc-zone-transfer .pwc-zone-transfer-dragging {\n    cursor: grabbing;\n    opacity: 0.6;\n}\n\npwc-zone-transfer .pwc-zone-transfer-placeholder {\n    opacity: 0.3;\n}';

// src/zone-transfer/index.js
function register4() {
  PwcZoneTransfer.registerCss(zone_transfer_default);
  define5();
}
register4();
