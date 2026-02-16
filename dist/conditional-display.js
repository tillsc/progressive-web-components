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

// src/core/pwc-children-observer-element.js
var PwcChildrenObserverElement = class extends PwcElement {
  static observeMode = "children";
  // "children" | "tree"
  connectedCallback() {
    if (this._connected) return;
    super.connectedCallback();
    this._startChildrenObserver();
  }
  disconnectedCallback() {
    this._stopChildrenObserver();
    super.disconnectedCallback();
  }
  onChildrenChanged(_mutations) {
  }
  /** Run fn() without triggering onChildrenChanged for the resulting DOM mutations. */
  _withoutChildrenChangedNotification(fn) {
    fn();
    this._childrenObserver?.takeRecords();
  }
  _startChildrenObserver() {
    const mode = this.constructor.observeMode || "children";
    const subtree = mode === "tree";
    this._childrenObserver = new MutationObserver((mutations) => {
      if (!this._connected) return;
      this.onChildrenChanged(mutations);
    });
    this._childrenObserver.observe(this, { childList: true, subtree });
    this.onChildrenChanged([]);
  }
  _stopChildrenObserver() {
    if (!this._childrenObserver) return;
    this._childrenObserver.disconnect();
    this._childrenObserver = null;
  }
};

// src/core/utils.js
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

// src/conditional-display/conditional-display.js
var ConditionalDisplayBase = class extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static observedAttributes = ["selector", "value"];
  attributeChangedCallback(name) {
    switch (name) {
      case "selector":
        this._resolveInput();
        break;
      case "value": {
        const value = this.getAttribute("value");
        this._values = value ? value.split(",") : [];
        break;
      }
      default: {
        return;
      }
    }
    if (this.isConnected) this._update();
  }
  onChildrenChanged() {
    this._resolveInput();
    this._update();
  }
  onDisconnect() {
    this._unbindChangeEvent();
  }
  _onChange = () => this._update();
  _unbindChangeEvent() {
    if (this._changeEventTarget) {
      this._changeEventTarget.removeEventListener("change", this._onChange);
      this._changeEventTarget = null;
    }
  }
  _resolveInput() {
    this._unbindChangeEvent();
    const selector = this.getAttribute("selector");
    this._input = selector ? document.querySelector(selector) : null;
    if (this._input) {
      this._changeEventTarget = this._input.type === "radio" ? this._input.closest("form") || document : this._input;
      this._changeEventTarget.addEventListener("change", this._onChange);
    } else if (selector) {
      console.warn(`<${this.localName}>: No element matches selector "${selector}"`);
    }
  }
  _getInputValue() {
    if (!this._input) return void 0;
    if (this._input.type === "radio") {
      const name = this._input.name;
      const form = this._input.closest("form");
      if (form) return form.elements[name]?.value;
      const checked = document.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
      return checked ? checked.value : void 0;
    }
    if (this._input.type === "checkbox") {
      return this._input.checked ? this._input.value : void 0;
    }
    return this._input.value;
  }
  get _isActive() {
    if (this._input?.type === "checkbox" && !this._values?.length) {
      return this._input.checked;
    }
    const currentValue = this._getInputValue();
    return this._values?.includes(currentValue != null ? String(currentValue) : "undefined");
  }
  _update() {
    if (!this._input) return;
    this._apply(this._isActive);
  }
  _setVisible(visible) {
    if (visible) {
      this.removeAttribute("hidden");
      for (const el of this.querySelectorAll("input, select, textarea")) {
        if (el.hasAttribute("data-pwc-temporarily-disabled")) {
          el.removeAttribute("data-pwc-temporarily-disabled");
          el.removeAttribute("disabled");
        }
      }
    } else {
      this.setAttribute("hidden", "");
      for (const el of this.querySelectorAll("input, select, textarea")) {
        if (!el.disabled) {
          el.setAttribute("disabled", "");
          el.setAttribute("data-pwc-temporarily-disabled", "");
        }
      }
    }
  }
  _setEnabled(enabled) {
    if (enabled) {
      for (const el of this.querySelectorAll("input, select, textarea")) {
        if (el.hasAttribute("data-pwc-temporarily-disabled")) {
          el.removeAttribute("data-pwc-temporarily-disabled");
          el.removeAttribute("disabled");
        }
      }
    } else {
      for (const el of this.querySelectorAll("input, select, textarea")) {
        if (!el.disabled) {
          el.setAttribute("disabled", "");
          el.setAttribute("data-pwc-temporarily-disabled", "");
        }
      }
    }
  }
  _apply(_isActive) {
  }
};
var PwcShownIf = class extends ConditionalDisplayBase {
  _apply(isActive) {
    this._setVisible(isActive);
  }
};
var PwcHiddenIf = class extends ConditionalDisplayBase {
  _apply(isActive) {
    this._setVisible(!isActive);
  }
};
var PwcEnabledIf = class extends ConditionalDisplayBase {
  _apply(isActive) {
    this._setEnabled(isActive);
  }
};
var PwcDisabledIf = class extends ConditionalDisplayBase {
  _apply(isActive) {
    this._setEnabled(!isActive);
  }
};
function define() {
  defineOnce("pwc-shown-if", PwcShownIf);
  defineOnce("pwc-hidden-if", PwcHiddenIf);
  defineOnce("pwc-enabled-if", PwcEnabledIf);
  defineOnce("pwc-disabled-if", PwcDisabledIf);
}

// src/conditional-display/index.js
function register() {
  define();
}
register();
export {
  register
};
