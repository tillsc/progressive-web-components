import { PwcSimpleInitElement } from "../core/pwc-simple-init-element.js";

export class BaseFilter extends PwcSimpleInitElement {
  static defaultRowSelector = "pwc-filter-row, [data-pwc-filter-row]";
  static events = ["input"];

  onConnect() {
    const { wrapper, input } = this._createInput();

    this._input = input;

    const debounceTimeout = Number(this.getAttribute("debounce"));
    this._debouncedFilter = this._debounce(
      () => this._applyFilter(),
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
    this._applyFilter();
  }

  _createInput() {
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = this.getAttribute("placeholder") || "Search…";

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

  _applyFilter() {
    const tokens = this._input.value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

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
          totalCount: rows.length,
        },
      })
    );
  }
}