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
  onConnect() {
    const { wrapper, input } = this._createInput();
    this._input = input;
    const debounceTimeout = Number(this.getAttribute("debounce"));
    input.addEventListener(
      "keyup",
      this._debounce(
        this._applyFilter,
        Number.isFinite(debounceTimeout) ? debounceTimeout : 300
      )
    );
    this.prepend(wrapper);
  }
  _createInput() {
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = this.getAttribute("placeholder") || "Search\u2026";
    return { wrapper: input, input };
  }
  _debounce(fn, timeout) {
    if (timeout === 0) {
      return (...args) => fn.apply(this, args);
    }
    return (...args) => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => fn.apply(this, args), timeout);
    };
  }
  _rowSelector() {
    return this.getAttribute("row-selector") || this.constructor.defaultRowSelector;
  }
  _rows() {
    return Array.from(this.querySelectorAll(this._rowSelector()));
  }
  _applyFilter() {
    const tokens = this._input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const rows = this._rows();
    if (!tokens.length) {
      for (const r of rows) r.hidden = false;
      return;
    }
    for (const r of rows) r.hidden = true;
    const matches = tokens.map((t) => this._rowsForToken(t));
    const keep = matches.reduce((a, b) => a.filter((x) => b.includes(x)));
    for (const r of keep) r.hidden = false;
  }
  _rowsForToken(token) {
    const safe = token.replace(/"/g, '\\"');
    const expr = `.//*[contains(translate(normalize-space(string(.)), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'),"${safe}")]`;
    const snap = document.evaluate(
      expr,
      this,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
    );
    const rows = [];
    for (let i = 0; i < snap.snapshotLength; i++) {
      const r = snap.snapshotItem(i)?.closest(this._rowSelector());
      if (r && !rows.includes(r)) rows.push(r);
    }
    return rows;
  }
};

// src/core/utils.js
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

// src/filter/bs5/filter.js
var PwcFilterBs5 = class extends BaseFilter {
  _createInput() {
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = this.getAttribute("placeholder") || "Search\u2026";
    input.classList.add("form-control");
    const wrapper = document.createElement("div");
    wrapper.className = "mb-2";
    wrapper.appendChild(input);
    return { wrapper, input };
  }
};
function define() {
  defineOnce("pwc-filter-bs5", PwcFilterBs5);
}

// src/filter/bs5/index.js
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
function define2() {
  defineOnce("pwc-dialog-opener-bs5", PwcDialogOpenerBs5);
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
var define3 = () => defineOnce("pwc-modal-dialog-bs5", PwcModalDialogBs5);

// src/modal-dialog/bs5/index.js
function register2() {
  define3();
}
register2();

// src/dialog-opener/bs5/index.js
function register3() {
  define2();
}
register3();

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
  static events = ["click", "input"];
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
        this._filterInput = ui.filterInput;
      }
      this._populateLists(items);
      select.style.display = "none";
      const filterText = this._filterInput?.value;
      if (filterText) this._applyFilter(filterText);
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
      return;
    }
    if (e.type === "input") {
      if (this._filterInput && e.target === this._filterInput) {
        this._applyFilter(this._filterInput.value);
      }
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
  get filterText() {
    return this._filterInput?.value ?? "";
  }
  set filterText(text) {
    if (this._filterInput) this._filterInput.value = text;
    this._applyFilter(text);
  }
  _applyFilter(text) {
    const { matchCount, totalCount } = this._filterAvailable(text);
    this.dispatchEvent(new CustomEvent("pwc-multiselect-dual-list:filter", {
      bubbles: true,
      detail: { filterText: text, matchCount, totalCount }
    }));
  }
  _buildFilterRegex(text) {
    if (!text) return null;
    try {
      return new RegExp(text, "i");
    } catch {
      return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
  }
};

// src/multiselect-dual-list/bs5/multiselect-dual-list.js
var PwcMultiselectDualListBs5 = class extends MultiselectDualListBase {
  get _selectedClass() {
    return "list-group-item-secondary";
  }
  _buildUI() {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="col">
        <h6>${this.selectedLabel}</h6>
        <div class="list-group" style="max-height:20em;overflow-y:auto" role="listbox" aria-label="${this.selectedLabel}" data-role="selected"></div>
      </div>
      <div class="col">
        <h6>${this.availableLabel}</h6>
        <input type="search" class="form-control form-control-sm mb-2" placeholder="Filter\u2026" aria-label="Filter ${this.availableLabel}" />
        <div class="list-group" style="max-height:20em;overflow-y:auto" role="listbox" aria-label="${this.availableLabel}" data-role="available"></div>
      </div>
    `;
    container.className = "row g-3";
    this.select.after(container);
    return {
      selectedList: container.querySelector("[data-role='selected']"),
      availableList: container.querySelector("[data-role='available']"),
      filterInput: container.querySelector("input[type='search']")
    };
  }
  _createEntry(item) {
    const el = document.createElement("div");
    el.className = "list-group-item d-flex justify-content-between align-items-center";
    el.role = "option";
    el.dataset.value = item.value;
    const label = document.createElement("span");
    label.textContent = item.label;
    el.appendChild(label);
    return el;
  }
  _createAvailableEntry(item) {
    const el = this._createEntry(item);
    el.setAttribute("aria-selected", String(item.selected));
    if (item.disabled) {
      el.classList.add("disabled");
      el.setAttribute("aria-disabled", "true");
    }
    if (item.selected) el.classList.add("list-group-item-secondary");
    if (item.depth > 0) el.style.paddingLeft = `${item.depth * 1.5 + 0.75}em`;
    if (!item.disabled) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-primary";
      btn.dataset.action = "add";
      btn.textContent = this.addLabel;
      btn.setAttribute("aria-label", `${this.addLabel} ${item.label}`);
      if (item.selected) btn.style.display = "none";
      el.appendChild(btn);
    }
    return el;
  }
  _createSelectedEntry(item) {
    const el = this._createEntry(item);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm btn-outline-danger";
    btn.dataset.action = "remove";
    btn.textContent = this.removeLabel;
    btn.setAttribute("aria-label", `${this.removeLabel} ${item.label}`);
    el.appendChild(btn);
    return el;
  }
  _filterAvailable(text) {
    const items = this._availableList.querySelectorAll("[data-value]");
    const totalCount = items.length;
    const regex = this._buildFilterRegex(text);
    if (!regex) {
      for (const el of items) el.classList.remove("d-none");
      return { matchCount: totalCount, totalCount };
    }
    let matchCount = 0;
    for (const el of items) {
      const label = el.querySelector("span")?.textContent || "";
      const match = regex.test(label);
      el.classList.toggle("d-none", !match);
      if (match) matchCount++;
    }
    return { matchCount, totalCount };
  }
};
var define4 = () => defineOnce("pwc-multiselect-dual-list-bs5", PwcMultiselectDualListBs5);

// src/multiselect-dual-list/bs5/index.js
function register4() {
  PwcMultiselectDualListBs5.registerCss(
    "pwc-multiselect-dual-list-bs5[hide-selected] .list-group-item-secondary { display: none; }"
  );
  define4();
}
register4();

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
    this._drag.overZone = zone;
    this._drag.overMethod = beforeEl ? "before" : "append";
  }
  _onDrop(e) {
    if (!this._drag?.item) return;
    const zone = this._closestZone(e.target);
    if (!zone) return;
    e.preventDefault();
    this._applyMove(this._drag.item, this._drag.fromZone, zone, this._drag.overMethod || "append");
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
    this._emitChange(item, zone, zone, this._indexInZone(item, zone), "before");
  }
  _keyboardMoveToZone(item, zone) {
    const fromZone = this._closestZone(item);
    if (!fromZone || fromZone === zone) return;
    zone.appendChild(item);
    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    item.focus();
    this._emitChange(item, fromZone, zone, this._indexInZone(item, zone), "append");
  }
  _zoneByHotkey(key) {
    const zones = this._zones();
    if (!zones.some((z) => z.hasAttribute("data-pwc-zone-key"))) return null;
    return zones.find((z) => z.getAttribute("data-pwc-zone-key") === key) || null;
  }
  _emitChange(item, fromZone, toZone, index, method) {
    this.dispatchEvent(
      new CustomEvent("pwc-zone-transfer:change", {
        bubbles: true,
        detail: {
          itemId: this._itemId(item),
          fromZone: this._zoneName(fromZone),
          toZone: this._zoneName(toZone),
          index,
          method
        }
      })
    );
  }
  _applyMove(item, fromZone, toZone, method) {
    if (this._placeholder?.parentNode === toZone) toZone.insertBefore(item, this._placeholder);
    else toZone.appendChild(item);
    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    this._emitChange(item, fromZone, toZone, this._indexInZone(item, toZone), method);
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
function register5() {
  PwcZoneTransfer.registerCss(zone_transfer_default);
  define5();
}
register5();
