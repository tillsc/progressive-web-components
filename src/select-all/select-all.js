import { PwcChildrenObserverElement } from "../core/pwc-children-observer-element.js";
import { defineOnce } from "../core/utils.js";

export class PwcSelectAll extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static events = ["change", "click"];

  static defaultCheckboxSelector = "input[type=checkbox]";
  static defaultCheckedSelector = "pwc-select-all-checked, [data-pwc-select-all-checked]";
  static defaultTotalSelector   = "pwc-select-all-total, [data-pwc-select-all-total]";

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
          actionEl.getAttribute("data-pwc-select-all-selector"),
        );
        return;
      }
    }

    if (e.type === "change" && !this._applyingAction) {
      const trigger = e.target.closest("[data-pwc-select-all]");
      if (trigger instanceof HTMLInputElement && trigger.type === "checkbox") {
        this._applyAction(
          trigger.checked ? "select-all" : "deselect-all",
          trigger.getAttribute("data-pwc-select-all-selector"),
        );
        return;
      }
      this._updateDisplays();
    }
  }

  selectAll()       { this._applyAction("select-all"); }
  deselectAll()     { this._applyAction("deselect-all"); }
  invertSelection() { this._applyAction("invert"); }

  _checkboxes(selectorOverride) {
    const cbSel = selectorOverride
      || this.getAttribute("checkbox-selector")
      || this.constructor.defaultCheckboxSelector;

    return Array.from(this.querySelectorAll(cbSel))
      .filter((cb) => !cb.hasAttribute("data-pwc-select-all"));
  }

  _applyAction(action, selectorOverride = null) {
    this._applyingAction = true;
    try {
      const boxes = this._checkboxes(selectorOverride);
      for (const cb of boxes) {
        const next = action === "select-all" ? true
                   : action === "deselect-all" ? false
                   : !cb.checked;
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
      detail: { action },
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
}

export function define() {
  defineOnce("pwc-select-all", PwcSelectAll);
}
