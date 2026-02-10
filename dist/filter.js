// src/core/utils.js
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

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
    if (this._connected) return;
    this._connected = true;
    this._bindEvents();
  }
  disconnectedCallback() {
    if (!this._connected) return;
    this._connected = false;
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

// src/core/pwc-simple-init-element.js
var PwcSimpleInitElement = class extends PwcElement {
  connectedCallback() {
    if (this._connected) return;
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this._connected) return;
      this.onConnect();
    });
  }
  /**
   * Hook for subclasses.
   * Called once per connection, after microtask deferral.
   */
  onConnect() {
  }
};

// src/filter/base.js
var BaseFilter = class extends PwcSimpleInitElement {
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
    input.placeholder = this.getAttribute("placeholder") || "Search\u2026";
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
    const tokens = this._input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
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
    const expr = `.//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'),"${safe}")]`;
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
};

// src/filter/filter.js
var PwcFilter = class extends BaseFilter {
};
function define() {
  defineOnce("pwc-filter", PwcFilter);
}

// src/filter/index.js
function register() {
  define();
}
register();
export {
  register
};
