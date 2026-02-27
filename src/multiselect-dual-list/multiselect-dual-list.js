import { MultiselectDualListBase } from "./base.js";
import { defineOnce } from "../core/utils.js";

export class PwcMultiselectDualList extends MultiselectDualListBase {
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
      availableList: container.querySelector(".pwc-multiselect-dual-list-available .pwc-multiselect-dual-list-list"),
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

}

export const define = () => defineOnce("pwc-multiselect-dual-list", PwcMultiselectDualList);
