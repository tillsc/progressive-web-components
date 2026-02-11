import { MultiselectDualListBase } from "../base.js";
import { defineOnce } from "../../core/utils.js";

export class PwcMultiselectDualListBs5 extends MultiselectDualListBase {
  get _selectedClass() { return "list-group-item-secondary"; }

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
      availableList: container.querySelector("[data-role='available']"),
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

}

export const define = () => defineOnce("pwc-multiselect-dual-list-bs5", PwcMultiselectDualListBs5);
