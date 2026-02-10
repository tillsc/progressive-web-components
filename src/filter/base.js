import { PwcSimpleInitElement } from "../core/pwc-simple-init-element.js";

export class BaseFilter extends PwcSimpleInitElement {
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
    input.placeholder = this.getAttribute("placeholder") || "Search…";

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
    const tokens = this._input.value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

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
    const expr =
      `.//*[contains(` +
      `translate(normalize-space(string(.)), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'),` +
      `"${safe}")]`;

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
}