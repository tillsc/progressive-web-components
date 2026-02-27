import { PwcChildrenObserverElement } from "../core/pwc-children-observer-element.js";

/**
 * MultiselectDualListBase
 *
 * Enhances a native <select> with a two-column UI:
 * selected items on the left, available items on the right.
 * Hierarchy from data-pwc-parent on <option> is shown as indentation.
 *
 * Subclass contract:
 * - _buildUI() → { availableList, selectedList }
 * - _createAvailableEntry(item) → DOM element for available list
 * - _createSelectedEntry(item) → DOM element for selected list
 * - get _selectedClass → CSS class toggled on available entries when selected
 */
export class MultiselectDualListBase extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static events = ["click"];

  get _selectedClass() { return "pwc-multiselect-dual-list-item--selected"; }

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
    const parentMap = new Map();
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
    const visited = new Set();
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
      for (const opt of this._select.options) {
        if (opt.selected) opt.selected = false;
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

  get select() { return this._select; }

  get filter() { return this.querySelector("pwc-filter, pwc-filter-bs5"); }

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
    return this.getAttribute("remove-label") || "\u00d7";
  }

  get addAriaLabel() {
    return this.getAttribute("add-aria-label") || "Add";
  }

  get removeAriaLabel() {
    return this.getAttribute("remove-aria-label") || "Remove";
  }

}
