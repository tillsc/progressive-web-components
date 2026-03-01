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

// src/filter/base.js
var BaseFilter = class extends PwcSimpleInitElement {
  static defaultRowSelector = "pwc-filter-row, [data-pwc-filter-row]";
  static defaultStatusSelector = "pwc-filter-status, [data-pwc-filter-status]";
  static defaultInputSelector = "pwc-filter-input, [data-pwc-filter-input]";
  static events = ["input"];
  onConnect() {
    const { wrapper, input } = this._createInput();
    this._input = input;
    const debounceTimeout = Number(this.getAttribute("debounce"));
    this._debouncedFilter = this._debounce(
      () => this.applyFilter(),
      Number.isFinite(debounceTimeout) ? debounceTimeout : 300
    );
    this._status = this.querySelector(this.constructor.defaultStatusSelector);
    if (!this._status) {
      this._status = document.createElement("span");
      Object.assign(this._status.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: "0"
      });
      this.append(this._status);
    }
    if (!this._status.hasAttribute("role")) this._status.setAttribute("role", "status");
    if (!this._status.hasAttribute("aria-live")) this._status.setAttribute("aria-live", "polite");
    if (!this._status.hasAttribute("aria-atomic")) this._status.setAttribute("aria-atomic", "true");
    const inputTarget = this.querySelector(this.constructor.defaultInputSelector);
    if (inputTarget) {
      inputTarget.appendChild(wrapper);
    } else {
      this.prepend(wrapper);
    }
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
    input.setAttribute("aria-label", input.placeholder);
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
    const matchCount = rows.filter((r) => !r.hidden).length;
    if (this._status) {
      this._status.textContent = tokens.length > 0 ? `${matchCount} / ${rows.length}` : "";
    }
    this.dispatchEvent(
      new CustomEvent("pwc-filter:change", {
        bubbles: true,
        detail: {
          filterText: this._input.value,
          matchCount,
          totalCount: rows.length
        }
      })
    );
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
async function fetchSheet(url) {
  const resolved = new URL(url, document.baseURI).href;
  if (_sheetCache.has(resolved)) {
    return _sheetCache.get(resolved);
  }
  try {
    const res = await fetch(resolved);
    if (!res.ok) return null;
    const cssText = await res.text();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    _sheetCache.set(resolved, sheet);
    return sheet;
  } catch {
    return null;
  }
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
    beforeAttributeUpdated(attributeName, oldNode) {
      if ((attributeName === "value" || attributeName === "checked") && oldNode.matches?.("input,textarea,select") && oldNode.isConnected && !oldNode.readOnly && !oldNode.disabled) return false;
      return true;
    },
    afterNodeMorphed(oldNode, newNode) {
      if (!newNode?.matches?.("[data-pwc-force-value]")) return;
      if (newNode.matches("input[type=checkbox],input[type=radio]")) {
        oldNode.checked = newNode.hasAttribute("checked");
      } else {
        oldNode.value = newNode.value;
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
    iframe.style.height = "100%";
    iframe.style.minHeight = "150px";
    iframe.style.border = "none";
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
    this._adjustHeightToContent();
  }
  _adjustHeightToContent() {
    const configuredHeight = this.getAttribute("height") || getComputedStyle(this).getPropertyValue("--pwc-dialog-opener-height").trim();
    if (configuredHeight) return;
    const iframeDoc = this.iframe?.contentDocument;
    if (!iframeDoc) return;
    const iframeInnerHeight = iframeDoc.documentElement.scrollHeight;
    this.iframe.style.height = iframeInnerHeight + "px";
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
    }
    const closeText = this.getAttribute("close-text") || "Close";
    const size = this.getAttribute("size") || getComputedStyle(this).getPropertyValue("--pwc-dialog-opener-size").trim() || "lg";
    const height = this.getAttribute("height") || getComputedStyle(this).getPropertyValue("--pwc-dialog-opener-height").trim() || null;
    this.modalDialog.open({
      title: this.getAttribute("title") || "",
      size,
      height,
      closeText,
      showCloseButton: false,
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
  _render({ title, size = "lg", height, closeText, showCloseButton = true }) {
    const existing = globalThis.bootstrap?.Modal?.getInstance(this);
    if (existing) {
      this.dispatchEvent(new Event("transitionend"));
      existing.dispose();
      this.style.display = "block";
    }
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
    const bodyEl = this.querySelector(".modal-body");
    if (height) bodyEl.style.height = height;
    return {
      rootEl: this,
      bodyEl,
      headerEl: this.querySelector(".modal-header"),
      footerEl: this.querySelector(".modal-footer"),
      modal: null,
      teardown: () => {
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
  static observeAttributes = null;
  connectedCallback() {
    super.connectedCallback();
    this._startChildrenObserver();
  }
  disconnectedCallback() {
    this._stopChildrenObserver();
    super.disconnectedCallback();
  }
  /** Called on connect and on every child mutation. Subclasses override. */
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
      if (!this.isConnected) return;
      this.onChildrenChanged(mutations);
    });
    const options = { childList: true, subtree };
    if (this.constructor.observeAttributes?.length) {
      options.attributes = true;
      options.attributeFilter = this.constructor.observeAttributes;
    }
    this._childrenObserver.observe(this, options);
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
    return "pwc-multiselect-dual-list-item--selected";
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
      const parent = opt.dataset.pwcParent;
      if (parent) parentMap.set(opt.value, parent);
    }
    return options.map((opt) => ({
      value: opt.value,
      label: opt.textContent,
      parent: opt.dataset.pwcParent || null,
      depth: this._calculateDepth(opt.value, parentMap),
      selected: opt.selected,
      disabled: opt.disabled,
      warnOnUnselect: opt.dataset.pwcWarnOnUnselect || null
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
  get addAriaLabel() {
    return this.getAttribute("add-aria-label") || "Add";
  }
  get removeAriaLabel() {
    return this.getAttribute("remove-aria-label") || "Remove";
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
        <pwc-filter-bs5 row-selector="[data-value]">
          <div class="list-group" style="max-height:20em;overflow-y:auto" role="listbox" aria-label="${this.availableLabel}" data-role="available"></div>
        </pwc-filter-bs5>
      </div>
    `;
    container.className = "row g-3";
    this.select.after(container);
    return {
      selectedList: container.querySelector("[data-role='selected']"),
      availableList: container.querySelector("[data-role='available']")
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
      btn.setAttribute("aria-label", `${this.addAriaLabel} ${item.label}`);
      if (item.selected) btn.style.display = "none";
      el.appendChild(btn);
    }
    return el;
  }
  _createSelectedEntry(item) {
    const el = this._createEntry(item);
    el.setAttribute("aria-selected", "true");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm btn-outline-danger";
    btn.dataset.action = "remove";
    btn.textContent = this.removeLabel;
    btn.setAttribute("aria-label", `${this.removeAriaLabel} ${item.label}`);
    el.appendChild(btn);
    return el;
  }
};
var define4 = () => defineOnce("pwc-multiselect-dual-list-bs5", PwcMultiselectDualListBs5);

// src/multiselect-dual-list/bs5/index.js
function register4() {
  registerCss(
    "pwc-multiselect-dual-list-bs5[hide-selected] .list-group-item-secondary { display: none; }"
  );
  define4();
}
register4();

// src/validity/base.js
var BaseValidity = class extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static observeAttributes = ["data-pwc-validity"];
  _cleanups = [];
  onChildrenChanged(mutations) {
    if (!mutations.length) {
      for (const el of this.querySelectorAll("[data-pwc-validity]")) {
        this._applyValidity(el);
      }
      return;
    }
    const affected = mutations.flatMap(
      (m) => m.type === "attributes" ? [m.target] : [...m.addedNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE).flatMap((n) => [n, ...n.querySelectorAll("[data-pwc-validity]")]).filter((n) => n.hasAttribute("data-pwc-validity"))
    );
    for (const el of affected) this._applyValidity(el);
  }
  _applyValidity(el) {
    const value = el.getAttribute("data-pwc-validity");
    if (value) {
      el.setCustomValidity(value);
      this._updateMessage(el, value);
      this._setupClearing(el);
    } else {
      if (el.validity?.customError) el.setCustomValidity("");
      this._updateMessage(el, null);
    }
  }
  _updateMessage(_el, _text) {
  }
  _setupClearing(el) {
    let clearOn = el.dataset.pwcValidityClearOn ?? this.getAttribute("clear-on");
    let clearAfter = el.dataset.pwcValidityClearAfter ?? this.getAttribute("clear-after");
    if (clearOn === "off") clearOn = null;
    if (clearAfter === "off") clearAfter = null;
    if (!clearOn && !clearAfter) return;
    let timeoutId;
    const clear = () => {
      if (clearOn) {
        for (const event of tokenList(clearOn)) {
          el.removeEventListener(event, clear);
        }
      }
      if (timeoutId !== void 0) {
        clearTimeout(timeoutId);
        timeoutId = void 0;
      }
      el.removeAttribute("data-pwc-validity");
    };
    if (clearOn) {
      for (const event of tokenList(clearOn)) {
        el.addEventListener(event, clear);
      }
    }
    if (clearAfter) {
      timeoutId = setTimeout(clear, parseInt(clearAfter, 10));
    }
    this._cleanups.push(clear);
  }
  onDisconnect() {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
  }
};

// src/validity/bs5/validity.js
var PwcValidityBs5 = class extends BaseValidity {
  _updateMessage(el, text) {
    this._withoutChildrenChangedNotification(() => {
      let msg = el.nextElementSibling;
      if (text) {
        el.classList.add("is-invalid");
        if (!msg?.matches(".invalid-feedback")) {
          msg = document.createElement("div");
          msg.className = "invalid-feedback";
          el.insertAdjacentElement("afterend", msg);
        }
        msg.textContent = text;
      } else {
        el.classList.remove("is-invalid");
        if (msg?.matches(".invalid-feedback")) {
          msg.remove();
        }
      }
    });
  }
};
function define5() {
  defineOnce("pwc-validity-bs5", PwcValidityBs5);
}

// src/validity/bs5/index.js
function register5() {
  define5();
}
register5();

// src/conditional-display/conditional-display.js
var ConditionalDisplayBase = class extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static observedAttributes = ["selector", "value"];
  attributeChangedCallback(name) {
    switch (name) {
      case "selector":
        this._resolveInput();
        break;
      case "value": {
        const value = this.getAttribute("value");
        this._values = value ? value.split(",") : [];
        break;
      }
      default: {
        return;
      }
    }
    if (this.isConnected) this._update();
  }
  onChildrenChanged() {
    this._resolveInput();
    this._update();
  }
  onDisconnect() {
    this._unbindChangeEvent();
  }
  _onChange = () => this._update();
  _unbindChangeEvent() {
    if (this._changeEventTarget) {
      this._changeEventTarget.removeEventListener("change", this._onChange);
      this._changeEventTarget = null;
    }
  }
  _resolveInput() {
    this._unbindChangeEvent();
    const selector = this.getAttribute("selector");
    this._input = selector ? document.querySelector(selector) : null;
    if (this._input) {
      this._changeEventTarget = this._input.type === "radio" ? this._input.closest("form") || document : this._input;
      this._changeEventTarget.addEventListener("change", this._onChange);
    } else if (selector) {
      console.warn(`<${this.localName}>: No element matches selector "${selector}"`);
    }
  }
  _getInputValue() {
    if (!this._input) return void 0;
    if (this._input.type === "radio") {
      const name = this._input.name;
      const form = this._input.closest("form");
      if (form) return form.elements[name]?.value;
      const checked = document.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
      return checked ? checked.value : void 0;
    }
    if (this._input.type === "checkbox") {
      return this._input.checked ? this._input.value : void 0;
    }
    return this._input.value;
  }
  get _isActive() {
    if (this._input?.type === "checkbox" && !this._values?.length) {
      return this._input.checked;
    }
    const currentValue = this._getInputValue();
    return this._values?.includes(currentValue != null ? String(currentValue) : "undefined");
  }
  _update() {
    if (!this._input) return;
    this._apply(this._isActive);
  }
  _setVisible(visible) {
    if (visible) {
      this.removeAttribute("hidden");
      for (const el of this.querySelectorAll("input, select, textarea")) {
        if (el.hasAttribute("data-pwc-temporarily-disabled")) {
          el.removeAttribute("data-pwc-temporarily-disabled");
          el.removeAttribute("disabled");
        }
      }
    } else {
      this.setAttribute("hidden", "");
      for (const el of this.querySelectorAll("input, select, textarea")) {
        if (!el.disabled) {
          el.setAttribute("disabled", "");
          el.setAttribute("data-pwc-temporarily-disabled", "");
        }
      }
    }
  }
  _setEnabled(enabled) {
    if (enabled) {
      for (const el of this.querySelectorAll("input, select, textarea")) {
        if (el.hasAttribute("data-pwc-temporarily-disabled")) {
          el.removeAttribute("data-pwc-temporarily-disabled");
          el.removeAttribute("disabled");
        }
      }
    } else {
      for (const el of this.querySelectorAll("input, select, textarea")) {
        if (!el.disabled) {
          el.setAttribute("disabled", "");
          el.setAttribute("data-pwc-temporarily-disabled", "");
        }
      }
    }
  }
  _apply(_isActive) {
  }
};
var PwcShownIf = class extends ConditionalDisplayBase {
  _apply(isActive) {
    this._setVisible(isActive);
  }
};
var PwcHiddenIf = class extends ConditionalDisplayBase {
  _apply(isActive) {
    this._setVisible(!isActive);
  }
};
var PwcEnabledIf = class extends ConditionalDisplayBase {
  _apply(isActive) {
    this._setEnabled(isActive);
  }
};
var PwcDisabledIf = class extends ConditionalDisplayBase {
  _apply(isActive) {
    this._setEnabled(!isActive);
  }
};
function define6() {
  defineOnce("pwc-shown-if", PwcShownIf);
  defineOnce("pwc-hidden-if", PwcHiddenIf);
  defineOnce("pwc-enabled-if", PwcEnabledIf);
  defineOnce("pwc-disabled-if", PwcDisabledIf);
}

// src/conditional-display/index.js
function register6() {
  define6();
}
register6();

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
      if (!zone.hasAttribute("aria-label")) {
        const name = this._zoneName(zone);
        if (name) zone.setAttribute("aria-label", name);
      }
    }
    const active = items.find((it) => it.tabIndex === 0) || items[0] || null;
    for (const it of items) it.tabIndex = it === active ? 0 : -1;
    this._getOrCreateLiveRegion();
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
  _getOrCreateLiveRegion() {
    if (!this._liveRegion) {
      this._liveRegion = document.createElement("span");
      this._liveRegion.setAttribute("role", "status");
      this._liveRegion.setAttribute("aria-live", "assertive");
      this._liveRegion.setAttribute("aria-atomic", "true");
      Object.assign(this._liveRegion.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: "0"
      });
      this._withoutChildrenChangedNotification(() => this.appendChild(this._liveRegion));
    }
    return this._liveRegion;
  }
  _emitChange(item, fromZone, toZone, index, trigger) {
    if (trigger === "keyboard") {
      const region = this._getOrCreateLiveRegion();
      region.textContent = fromZone !== toZone ? this._zoneName(toZone) : `${index + 1}`;
    }
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
function define7() {
  defineOnce("pwc-zone-transfer", PwcZoneTransfer);
}

// src/zone-transfer/zone-transfer.css
var zone_transfer_default = 'pwc-zone-transfer [draggable="true"] {\n    cursor: grab;\n}\n\npwc-zone-transfer .pwc-zone-transfer-dragging {\n    cursor: grabbing;\n    opacity: 0.6;\n}\n\npwc-zone-transfer .pwc-zone-transfer-placeholder {\n    opacity: 0.3;\n}';

// src/zone-transfer/index.js
function register7() {
  registerCss(zone_transfer_default);
  define7();
}
register7();

// src/include/include.js
var PwcInclude = class _PwcInclude extends PwcSimpleInitElement {
  static observedAttributes = ["src", "media"];
  onConnect() {
    this.refresh();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    if (oldValue === newValue) return;
    this.refresh();
  }
  onDisconnect() {
    this._teardownLazy();
    this._abortPending();
  }
  get root() {
    return this.shadowRoot || this;
  }
  refresh() {
    const src = this.getAttribute("src");
    if (!src) return;
    const media = this.getAttribute("media");
    if (media && !window.matchMedia(media).matches) return;
    if (this.hasAttribute("lazy") && !this._lazyTriggered) {
      this._setupLazy();
      return;
    }
    this._fetch(src);
  }
  async _fetch(src) {
    this._abortPending();
    this._controller = new AbortController();
    this.setAttribute("aria-busy", "true");
    try {
      const credentials = this.hasAttribute("with-credentials") ? "include" : "same-origin";
      const res = await fetch(src, { signal: this._controller.signal, credentials });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      await this._insert(html, src);
      this.removeAttribute("aria-busy");
      this.dispatchEvent(new CustomEvent("pwc-include:load", { bubbles: true }));
    } catch (err) {
      if (err.name === "AbortError") return;
      const alt = this.getAttribute("alt");
      if (alt && src !== alt) {
        this._fetch(alt);
        return;
      }
      this.removeAttribute("aria-busy");
      this.dispatchEvent(
        new CustomEvent("pwc-include:error", { bubbles: true, detail: { error: err } })
      );
    }
  }
  async _insert(html, srcUrl) {
    if (this.hasAttribute("shadow") && !this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    const fragmentSelector = this.getAttribute("fragment");
    const extractStylesAttr = this.getAttribute("extract-styles");
    if (fragmentSelector || extractStylesAttr !== null) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const fragments = fragmentSelector ? Array.from(doc.querySelectorAll(fragmentSelector)) : [doc];
      if (extractStylesAttr !== null) {
        const styleEls = this._collectStyleElements(doc, extractStylesAttr, fragments);
        styleEls.forEach((el) => el.remove());
        const sheets = await _PwcInclude._resolveSheets(styleEls, srcUrl);
        if (sheets.length) {
          adoptSheets(this.shadowRoot || document, sheets);
        }
      }
      if (fragmentSelector) {
        transclude(this.root, fragments.map((m) => document.adoptNode(m)), this);
      } else {
        transclude(this.root, Array.from(doc.body.childNodes).map((n) => document.adoptNode(n)), this);
      }
    } else {
      transclude(this.root, html, this);
    }
    if (this.hasAttribute("with-scripts")) {
      executeScripts(this.root);
    }
  }
  _collectStyleElements(doc, extractStylesAttr, fragments) {
    const modes = tokenList(extractStylesAttr || "fragment");
    const selector = 'style, link[rel="stylesheet"]';
    const result = [];
    if (modes.contains("document")) {
      result.push(...doc.querySelectorAll(selector));
    } else {
      if (modes.contains("head")) {
        result.push(...doc.head.querySelectorAll(selector));
      }
      if (modes.contains("fragment")) {
        for (const fragment of fragments) {
          result.push(...fragment.querySelectorAll(selector));
        }
      }
    }
    return result;
  }
  static async _resolveSheets(styleElements, srcUrl) {
    const promises = styleElements.map((el) => {
      if (el.tagName === "LINK") {
        const href = el.getAttribute("href");
        const resolved = new URL(href, new URL(srcUrl, document.baseURI)).href;
        return fetchSheet(resolved);
      }
      return Promise.resolve(getOrCreateSheet(el.textContent));
    });
    const results = await Promise.all(promises);
    return [...new Set(results.filter(Boolean))];
  }
  _abortPending() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }
  _setupLazy() {
    if (this._observer) return;
    this._observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this._lazyTriggered = true;
        this._teardownLazy();
        this.refresh();
      }
    });
    this._observer.observe(this);
  }
  _teardownLazy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }
};
function define8() {
  defineOnce("pwc-include", PwcInclude);
}

// src/include/index.js
function register8() {
  define8();
}
register8();

// src/auto-submit/auto-submit.js
var PwcAutoSubmit = class extends PwcElement {
  static events = ["change"];
  handleEvent(e) {
    const target = e.target;
    if (!target.hasAttribute("data-pwc-auto-submit")) return;
    const form = this.querySelector("form") || target.closest("form");
    if (!form) return;
    if (this.hasAttribute("local-reload") && this.id) {
      this._submitAndLocalReload(form, target);
    } else {
      if (this.hasAttribute("local-reload")) {
        console.warn("<pwc-auto-submit> has local-reload attribute but no id", this);
      }
      form.submit();
    }
  }
  async _submitAndLocalReload(form, trigger) {
    this._abortPending();
    this._controller = new AbortController();
    this.setAttribute("aria-busy", "true");
    const url = new URL(form.action || window.location.href);
    const method = (form.method || "GET").toUpperCase();
    const formData = new FormData(form);
    formData.set("_pwc_autosubmitted_by", trigger.name || trigger.id || "");
    try {
      const credentials = this.hasAttribute("with-credentials") ? "include" : "same-origin";
      let res;
      if (method === "GET") {
        url.search = new URLSearchParams(formData).toString();
        res = await fetch(url, { signal: this._controller.signal, credentials });
      } else {
        res = await fetch(url, {
          method,
          body: formData,
          signal: this._controller.signal,
          credentials
        });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const match = doc.getElementById(this.id);
      if (match) {
        transclude(this, Array.from(match.childNodes), this);
        if (this.hasAttribute("with-scripts")) {
          executeScripts(this);
        }
        this.removeAttribute("aria-busy");
        this.dispatchEvent(new CustomEvent("pwc-auto-submit:load", { bubbles: true }));
      } else {
        console.warn(`<pwc-auto-submit> could not find #${this.id} in response, replacing entire document`);
        document.open();
        document.write(html);
        document.close();
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      this.removeAttribute("aria-busy");
      this.dispatchEvent(
        new CustomEvent("pwc-auto-submit:error", { bubbles: true, detail: { error: err } })
      );
    }
  }
  _abortPending() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }
  onDisconnect() {
    this._abortPending();
  }
};
function define9() {
  defineOnce("pwc-auto-submit", PwcAutoSubmit);
}

// src/auto-submit/index.js
function register9() {
  define9();
}
register9();

// src/select-all/select-all.js
var PwcSelectAll = class extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static events = ["change", "click"];
  static defaultCheckboxSelector = "input[type=checkbox]";
  static defaultCheckedSelector = "pwc-select-all-checked, [data-pwc-select-all-checked]";
  static defaultTotalSelector = "pwc-select-all-total, [data-pwc-select-all-total]";
  onChildrenChanged() {
    this._updateDisplays();
  }
  handleEvent(e) {
    if (e.type === "click") {
      const actionEl = e.target.closest("[data-pwc-action]");
      if (actionEl) {
        e.preventDefault();
        this._applyAction(
          actionEl.getAttribute("data-pwc-action"),
          actionEl.getAttribute("data-pwc-select-all-selector")
        );
        return;
      }
    }
    if (e.type === "change" && !this._applyingAction) {
      const trigger = e.target.closest("[data-pwc-select-all]");
      if (trigger instanceof HTMLInputElement && trigger.type === "checkbox") {
        this._applyAction(
          trigger.checked ? "select-all" : "deselect-all",
          trigger.getAttribute("data-pwc-select-all-selector")
        );
        return;
      }
      this._updateDisplays();
    }
  }
  selectAll() {
    this._applyAction("select-all");
  }
  deselectAll() {
    this._applyAction("deselect-all");
  }
  invertSelection() {
    this._applyAction("invert");
  }
  _checkboxes(selectorOverride) {
    const cbSel = selectorOverride || this.getAttribute("checkbox-selector") || this.constructor.defaultCheckboxSelector;
    return Array.from(this.querySelectorAll(cbSel)).filter((cb) => !cb.hasAttribute("data-pwc-select-all"));
  }
  _applyAction(action, selectorOverride = null) {
    this._applyingAction = true;
    try {
      const boxes = this._checkboxes(selectorOverride);
      for (const cb of boxes) {
        const next = action === "select-all" ? true : action === "deselect-all" ? false : !cb.checked;
        if (cb.checked !== next) {
          cb.checked = next;
          cb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    } finally {
      this._applyingAction = false;
    }
    this._updateDisplays();
    this.dispatchEvent(new CustomEvent("pwc-select-all:change", {
      bubbles: true,
      detail: { action }
    }));
  }
  _updateDisplays() {
    this._withoutChildrenChangedNotification(() => {
      for (const trigger of this.querySelectorAll("input[type=checkbox][data-pwc-select-all]")) {
        const boxes = this._checkboxes(trigger.getAttribute("data-pwc-select-all-selector"));
        const checkedCount = boxes.filter((cb) => cb.checked).length;
        trigger.indeterminate = checkedCount > 0 && checkedCount < boxes.length;
        trigger.checked = boxes.length > 0 && checkedCount === boxes.length;
      }
      for (const el of this.querySelectorAll(this.constructor.defaultCheckedSelector)) {
        const boxes = this._checkboxes(el.getAttribute("data-pwc-select-all-selector"));
        el.textContent = boxes.filter((cb) => cb.checked).length;
      }
      for (const el of this.querySelectorAll(this.constructor.defaultTotalSelector)) {
        el.textContent = this._checkboxes(el.getAttribute("data-pwc-select-all-selector")).length;
      }
    });
  }
};
function define10() {
  defineOnce("pwc-select-all", PwcSelectAll);
}

// src/select-all/index.js
function register10() {
  define10();
}
register10();

// src/auto-grid/auto-grid.css
var auto_grid_default = 'pwc-auto-grid {\n  --pwc-auto-grid-cols: -1;\n  --pwc-auto-grid-gap: 10px;\n  --pwc-auto-grid-min-width: 100px;\n  --pwc-auto-grid-max-width: 1fr;\n\n  /* Total width consumed by gaps (garbage when --cols is -1, but max() below saves it) */\n  --pwc-auto-grid-gap-total: calc((var(--pwc-auto-grid-cols) - 1) * var(--pwc-auto-grid-gap));\n  /* Width each column would have if all cols fit in one row */\n  --pwc-auto-grid-col-optimistic: calc((100% - var(--pwc-auto-grid-gap-total)) / var(--pwc-auto-grid-cols));\n  /* At least --min-width; the max() degrades gracefully when --cols is -1 */\n  --pwc-auto-grid-col-realistic: max(var(--pwc-auto-grid-min-width), var(--pwc-auto-grid-col-optimistic));\n  /* Final column sizing */\n  --pwc-auto-grid-col: minmax(var(--pwc-auto-grid-col-realistic), var(--pwc-auto-grid-max-width));\n\n  display: grid;\n  gap: var(--pwc-auto-grid-gap);\n  grid-template-columns: repeat(auto-fit, var(--pwc-auto-grid-col));\n}\n\npwc-auto-grid > .pwc-auto-grid-wide {\n  grid-column: 1 / -1;\n}\n\n/* Maps cols, gap, and min-width attributes to their CSS custom properties.\n * Guarded so older browsers fall back silently to the defaults above. */\n@supports (width: attr(x type(<length>), 0px)) {\n  pwc-auto-grid {\n    --pwc-auto-grid-cols: attr(cols type(<integer>), -1);\n    --pwc-auto-grid-gap: attr(gap type(<length>), 10px);\n    --pwc-auto-grid-min-width: attr(min-width type(<length>), 100px);\n    --pwc-auto-grid-max-width: attr(max-width type(<length>), 1fr);\n  }\n}\n\n/* \u2500\u2500 Switcher variant (experimental) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n *\n * Requires cols to be set to the intended number of columns.\n *\n * Places all items in one row when the container is wide enough for each item\n * to reach --pwc-auto-grid-min-width. Otherwise each item takes the full width.\n *\n * Technique: produces a CSS "boolean" (0px / 1px) via clamp(), then multiplies\n * by a large factor to force a binary column-width choice \u2014 no media queries.\n */\npwc-auto-grid.switcher {\n  /* 1px when items are too wide to fit, 0px when they fit */\n  --pwc-auto-grid-col-should-break: clamp(\n    0px,\n    var(--pwc-auto-grid-min-width) - var(--pwc-auto-grid-col-optimistic),\n    1px\n  );\n  --pwc-auto-grid-col-should-not-break: calc(1px - var(--pwc-auto-grid-col-should-break));\n\n  /* When breaking: 100% width. When not breaking: equal share of available width. */\n  --pwc-auto-grid-col: calc(\n    min(100%, var(--pwc-auto-grid-col-should-break) * 9999) +\n    min(var(--pwc-auto-grid-col-optimistic), var(--pwc-auto-grid-col-should-not-break) * 9999)\n  );\n}\n';

// src/auto-grid/index.js
function register11() {
  registerCss(auto_grid_default);
}
register11();
