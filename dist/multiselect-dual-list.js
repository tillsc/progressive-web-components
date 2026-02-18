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
    this._bindEvents();
  }
  disconnectedCallback() {
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

// src/core/pwc-children-observer-element.js
var PwcChildrenObserverElement = class extends PwcElement {
  static observeMode = "children";
  // "children" | "tree"
  connectedCallback() {
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
      if (!this.isConnected) return;
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
    btn.className = "pwc-msdl-action";
    btn.dataset.action = "remove";
    btn.textContent = this.removeLabel;
    btn.setAttribute("aria-label", `${this.removeAriaLabel} ${item.label}`);
    li.appendChild(btn);
    return li;
  }
};
var define = () => defineOnce("pwc-multiselect-dual-list", PwcMultiselectDualList);

// src/multiselect-dual-list/multiselect-dual-list.css
var multiselect_dual_list_default = "pwc-multiselect-dual-list {\n  /* sizing */\n  --pwc-msdl-width: 100%;\n\n  /* spacing */\n  --pwc-msdl-gap: 12px;\n  --pwc-msdl-padding: 8px;\n  --pwc-msdl-item-padding: 6px 10px;\n  --pwc-msdl-indent: 1.5em;\n\n  /* list */\n  --pwc-msdl-list-max-height: 20em;\n\n  /* visuals */\n  --pwc-msdl-bg: #fff;\n  --pwc-msdl-border: 1px solid rgba(0, 0, 0, 0.15);\n  --pwc-msdl-border-radius: 4px;\n  --pwc-msdl-separator: rgba(0, 0, 0, 0.08);\n\n  /* item */\n  --pwc-msdl-item-bg: #f8f8f8;\n  --pwc-msdl-item-hover-bg: #f0f0f0;\n  --pwc-msdl-item-selected-bg: #e8e8e8;\n  --pwc-msdl-item-selected-color: #999;\n  --pwc-msdl-item-disabled-color: #bbb;\n\n  /* button */\n  --pwc-msdl-action-bg: transparent;\n  --pwc-msdl-action-hover-bg: rgba(0, 0, 0, 0.06);\n  --pwc-msdl-action-border: 1px solid rgba(0, 0, 0, 0.2);\n  --pwc-msdl-action-radius: 3px;\n\n  display: block;\n  width: var(--pwc-msdl-width);\n}\n\n.pwc-msdl-container {\n  display: flex;\n  gap: var(--pwc-msdl-gap);\n}\n\n.pwc-msdl-selected,\n.pwc-msdl-available {\n  flex: 1;\n  min-width: 0;\n  background: var(--pwc-msdl-bg);\n  border: var(--pwc-msdl-border);\n  border-radius: var(--pwc-msdl-border-radius);\n  padding: var(--pwc-msdl-padding);\n}\n\n.pwc-msdl-header {\n  font-weight: 600;\n  margin-bottom: 6px;\n}\n\n.pwc-msdl-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  max-height: var(--pwc-msdl-list-max-height);\n  overflow-y: auto;\n}\n\n.pwc-msdl-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: var(--pwc-msdl-item-padding);\n  background: var(--pwc-msdl-item-bg);\n  border-bottom: 1px solid var(--pwc-msdl-separator);\n}\n\n.pwc-msdl-item:last-child {\n  border-bottom: none;\n}\n\n.pwc-msdl-item:hover {\n  background: var(--pwc-msdl-item-hover-bg);\n}\n\n.pwc-msdl-item--selected {\n  background: var(--pwc-msdl-item-selected-bg);\n  color: var(--pwc-msdl-item-selected-color);\n}\n\n.pwc-msdl-item--disabled {\n  color: var(--pwc-msdl-item-disabled-color);\n  cursor: default;\n}\n\n.pwc-msdl-action {\n  appearance: none;\n  border: var(--pwc-msdl-action-border);\n  background: var(--pwc-msdl-action-bg);\n  padding: 2px 8px;\n  border-radius: var(--pwc-msdl-action-radius);\n  cursor: pointer;\n  font: inherit;\n  font-size: 0.85em;\n  flex-shrink: 0;\n  margin-left: 8px;\n}\n\n.pwc-msdl-action:hover {\n  background: var(--pwc-msdl-action-hover-bg);\n}\n\npwc-multiselect-dual-list[hide-selected] .pwc-msdl-item--selected {\n  display: none;\n}\n";

// src/multiselect-dual-list/index.js
function register() {
  PwcMultiselectDualList.registerCss(multiselect_dual_list_default);
  define();
}
register();
export {
  register
};
