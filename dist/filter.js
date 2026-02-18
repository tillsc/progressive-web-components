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

// src/core/pwc-simple-init-element.js
var PwcSimpleInitElement = class extends PwcElement {
  connectedCallback() {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
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
  static defaultStatusSelector = "pwc-filter-status, [data-pwc-filter-status]";
  static defaultInputSelector = "pwc-filter-input, [data-pwc-filter-input]";
  static events = ["input"];
  onConnect() {
    const { wrapper, input } = this._createInput();
    this._input = input;
    const debounceTimeout = Number(this.getAttribute("debounce"));
    this._debouncedFilter = this._debounce(
      () => this.applyFilter(),
      Number.isFinite(debounceTimeout) ? debounceTimeout : 300
    );
    this._status = this.querySelector(this.constructor.defaultStatusSelector);
    if (!this._status) {
      this._status = document.createElement("span");
      Object.assign(this._status.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: "0"
      });
      this.append(this._status);
    }
    if (!this._status.hasAttribute("role")) this._status.setAttribute("role", "status");
    if (!this._status.hasAttribute("aria-live")) this._status.setAttribute("aria-live", "polite");
    if (!this._status.hasAttribute("aria-atomic")) this._status.setAttribute("aria-atomic", "true");
    const inputTarget = this.querySelector(this.constructor.defaultInputSelector);
    if (inputTarget) {
      inputTarget.appendChild(wrapper);
    } else {
      this.prepend(wrapper);
    }
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
    input.setAttribute("aria-label", input.placeholder);
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
    const matchCount = rows.filter((r) => !r.hidden).length;
    if (this._status) {
      this._status.textContent = tokens.length > 0 ? `${matchCount} / ${rows.length}` : "";
    }
    this.dispatchEvent(
      new CustomEvent("pwc-filter:change", {
        bubbles: true,
        detail: {
          filterText: this._input.value,
          matchCount,
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
