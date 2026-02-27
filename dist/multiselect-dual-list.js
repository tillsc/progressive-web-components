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

// src/core/utils.js
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

// src/multiselect-dual-list/multiselect-dual-list.js
var PwcMultiselectDualList = class extends MultiselectDualListBase {
  _buildUI() {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="pwc-multiselect-dual-list-selected">
        <div class="pwc-multiselect-dual-list-header">${this.selectedLabel}</div>
        <ul class="pwc-multiselect-dual-list-list" role="listbox" aria-label="${this.selectedLabel}"></ul>
      </div>
      <div class="pwc-multiselect-dual-list-available">
        <div class="pwc-multiselect-dual-list-header">${this.availableLabel}</div>
        <pwc-filter row-selector="[data-value]">
          <ul class="pwc-multiselect-dual-list-list" role="listbox" aria-label="${this.availableLabel}"></ul>
        </pwc-filter>
      </div>
    `;
    container.className = "pwc-multiselect-dual-list-container";
    this.select.after(container);
    return {
      selectedList: container.querySelector(".pwc-multiselect-dual-list-selected .pwc-multiselect-dual-list-list"),
      availableList: container.querySelector(".pwc-multiselect-dual-list-available .pwc-multiselect-dual-list-list")
    };
  }
  _createEntry(item) {
    const li = document.createElement("li");
    li.className = "pwc-multiselect-dual-list-item";
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
      li.classList.add("pwc-multiselect-dual-list-item--disabled");
      li.setAttribute("aria-disabled", "true");
    }
    if (item.selected) li.classList.add("pwc-multiselect-dual-list-item--selected");
    if (item.depth > 0) li.style.paddingLeft = `${item.depth * 1.5}em`;
    if (!item.disabled) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pwc-multiselect-dual-list-action";
      btn.dataset.action = "add";
      btn.textContent = this.addLabel;
      btn.setAttribute("aria-label", `${this.addAriaLabel} ${item.label}`);
      if (item.selected) btn.style.display = "none";
      li.appendChild(btn);
    }
    return li;
  }
  _createSelectedEntry(item) {
    const li = this._createEntry(item);
    li.setAttribute("aria-selected", "true");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pwc-multiselect-dual-list-action";
    btn.dataset.action = "remove";
    btn.textContent = this.removeLabel;
    btn.setAttribute("aria-label", `${this.removeAriaLabel} ${item.label}`);
    li.appendChild(btn);
    return li;
  }
};
var define = () => defineOnce("pwc-multiselect-dual-list", PwcMultiselectDualList);

// src/multiselect-dual-list/multiselect-dual-list.css
var multiselect_dual_list_default = "pwc-multiselect-dual-list {\n  /* sizing */\n  --pwc-multiselect-dual-list-width: 100%;\n\n  /* spacing */\n  --pwc-multiselect-dual-list-gap: 12px;\n  --pwc-multiselect-dual-list-padding: 8px;\n  --pwc-multiselect-dual-list-item-padding: 6px 10px;\n  --pwc-multiselect-dual-list-indent: 1.5em;\n\n  /* list */\n  --pwc-multiselect-dual-list-list-max-height: 20em;\n\n  /* visuals */\n  --pwc-multiselect-dual-list-bg: #fff;\n  --pwc-multiselect-dual-list-border: 1px solid rgba(0, 0, 0, 0.15);\n  --pwc-multiselect-dual-list-border-radius: 4px;\n  --pwc-multiselect-dual-list-separator: rgba(0, 0, 0, 0.08);\n\n  /* item */\n  --pwc-multiselect-dual-list-item-bg: #f8f8f8;\n  --pwc-multiselect-dual-list-item-hover-bg: #f0f0f0;\n  --pwc-multiselect-dual-list-item-selected-bg: #e8e8e8;\n  --pwc-multiselect-dual-list-item-selected-color: #999;\n  --pwc-multiselect-dual-list-item-disabled-color: #bbb;\n\n  /* button */\n  --pwc-multiselect-dual-list-action-bg: transparent;\n  --pwc-multiselect-dual-list-action-hover-bg: rgba(0, 0, 0, 0.06);\n  --pwc-multiselect-dual-list-action-border: 1px solid rgba(0, 0, 0, 0.2);\n  --pwc-multiselect-dual-list-action-radius: 3px;\n\n  display: block;\n  width: var(--pwc-multiselect-dual-list-width);\n}\n\n.pwc-multiselect-dual-list-container {\n  display: flex;\n  gap: var(--pwc-multiselect-dual-list-gap);\n}\n\n.pwc-multiselect-dual-list-selected,\n.pwc-multiselect-dual-list-available {\n  flex: 1;\n  min-width: 0;\n  background: var(--pwc-multiselect-dual-list-bg);\n  border: var(--pwc-multiselect-dual-list-border);\n  border-radius: var(--pwc-multiselect-dual-list-border-radius);\n  padding: var(--pwc-multiselect-dual-list-padding);\n}\n\n.pwc-multiselect-dual-list-header {\n  font-weight: 600;\n  margin-bottom: 6px;\n}\n\n.pwc-multiselect-dual-list-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  max-height: var(--pwc-multiselect-dual-list-list-max-height);\n  overflow-y: auto;\n}\n\n.pwc-multiselect-dual-list-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: var(--pwc-multiselect-dual-list-item-padding);\n  background: var(--pwc-multiselect-dual-list-item-bg);\n  border-bottom: 1px solid var(--pwc-multiselect-dual-list-separator);\n}\n\n.pwc-multiselect-dual-list-item:last-child {\n  border-bottom: none;\n}\n\n.pwc-multiselect-dual-list-item:hover {\n  background: var(--pwc-multiselect-dual-list-item-hover-bg);\n}\n\n.pwc-multiselect-dual-list-item--selected {\n  background: var(--pwc-multiselect-dual-list-item-selected-bg);\n  color: var(--pwc-multiselect-dual-list-item-selected-color);\n}\n\n.pwc-multiselect-dual-list-item--disabled {\n  color: var(--pwc-multiselect-dual-list-item-disabled-color);\n  cursor: default;\n}\n\n.pwc-multiselect-dual-list-action {\n  appearance: none;\n  border: var(--pwc-multiselect-dual-list-action-border);\n  background: var(--pwc-multiselect-dual-list-action-bg);\n  padding: 2px 8px;\n  border-radius: var(--pwc-multiselect-dual-list-action-radius);\n  cursor: pointer;\n  font: inherit;\n  font-size: 0.85em;\n  flex-shrink: 0;\n  margin-left: 8px;\n}\n\n.pwc-multiselect-dual-list-action:hover {\n  background: var(--pwc-multiselect-dual-list-action-hover-bg);\n}\n\npwc-multiselect-dual-list[hide-selected] .pwc-multiselect-dual-list-item--selected {\n  display: none;\n}\n";

// src/multiselect-dual-list/index.js
function register() {
  registerCss(multiselect_dual_list_default);
  define();
}
register();
export {
  register
};
