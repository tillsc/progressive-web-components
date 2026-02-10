import { MultiselectDualListBase } from "./base.js";
import { defineOnce } from "../core/utils.js";

export class PwcMultiselectDualList extends MultiselectDualListBase {
  _buildUI() {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="pwc-msdl-selected">
        <div class="pwc-msdl-header">${this.selectedLabel}</div>
        <ul class="pwc-msdl-list" role="listbox" aria-label="${this.selectedLabel}"></ul>
      </div>
      <div class="pwc-msdl-available">
        <div class="pwc-msdl-header">${this.availableLabel}</div>
        <input type="search" class="pwc-msdl-filter" placeholder="Filter…" aria-label="Filter ${this.availableLabel}" />
        <ul class="pwc-msdl-list" role="listbox" aria-label="${this.availableLabel}"></ul>
      </div>
    `;
    container.className = "pwc-msdl-container";

    this.select.after(container);

    return {
      selectedList: container.querySelector(".pwc-msdl-selected .pwc-msdl-list"),
      availableList: container.querySelector(".pwc-msdl-available .pwc-msdl-list"),
      filterInput: container.querySelector(".pwc-msdl-filter"),
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

  _filterAvailable(text) {
    const items = this._availableList.querySelectorAll("[data-value]");
    const totalCount = items.length;
    const regex = this._buildFilterRegex(text);

    if (!regex) {
      for (const el of items) el.style.display = "";
      return { matchCount: totalCount, totalCount };
    }

    let matchCount = 0;
    for (const el of items) {
      const match = regex.test(el.textContent);
      el.style.display = match ? "" : "none";
      if (match) matchCount++;
    }
    return { matchCount, totalCount };
  }
}

export const define = () => defineOnce("pwc-multiselect-dual-list", PwcMultiselectDualList);
