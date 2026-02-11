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
  static events = ["input"];
  onConnect() {
    const { wrapper, input } = this._createInput();
    this._input = input;
    const debounceTimeout = Number(this.getAttribute("debounce"));
    this._debouncedFilter = this._debounce(
      () => this.applyFilter(),
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
    this.applyFilter();
  }
  _createInput() {
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = this.getAttribute("placeholder") || "Search\u2026";
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
  applyFilter() {
    if (!this._input) return;
    const tokens = this._input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
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
          totalCount: rows.length
        }
      })
    );
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
