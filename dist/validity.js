// src/core/pwc-element.js
var PwcElement = class extends HTMLElement {
  /** DOM event types to bind on the host. Subclasses override. */
  static events = [];
  connectedCallback() {
    this._bindEvents();
  }
  disconnectedCallback() {
    this._unbindEvents();
    this.onDisconnect();
  }
  /** Cleanup hook for subclasses. */
  onDisconnect() {
  }
  _bindEvents() {
    const events = this.constructor.events ?? [];
    for (const type of events) {
      this.addEventListener(type, this);
    }
  }
  _unbindEvents() {
    const events = this.constructor.events ?? [];
    for (const type of events) {
      this.removeEventListener(type, this);
    }
  }
  /** Default event handler. Subclasses override to route events. */
  handleEvent(_event) {
  }
};

// src/core/pwc-children-observer-element.js
var PwcChildrenObserverElement = class extends PwcElement {
  static observeMode = "children";
  // "children" | "tree"
  static observeAttributes = null;
  connectedCallback() {
    super.connectedCallback();
    this._startChildrenObserver();
  }
  disconnectedCallback() {
    this._stopChildrenObserver();
    super.disconnectedCallback();
  }
  /** Called on connect and on every child mutation. Subclasses override. */
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
      if (!this.isConnected) return;
      this.onChildrenChanged(mutations);
    });
    const options = { childList: true, subtree };
    if (this.constructor.observeAttributes?.length) {
      options.attributes = true;
      options.attributeFilter = this.constructor.observeAttributes;
    }
    this._childrenObserver.observe(this, options);
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
function tokenList(str) {
  const el = document.createElement("span");
  el.className = str || "";
  return el.classList;
}

// src/validity/base.js
var BaseValidity = class extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static observeAttributes = ["data-pwc-validity"];
  _cleanups = [];
  onChildrenChanged(mutations) {
    if (!mutations.length) {
      for (const el of this.querySelectorAll("[data-pwc-validity]")) {
        this._applyValidity(el);
      }
      return;
    }
    const affected = mutations.flatMap(
      (m) => m.type === "attributes" ? [m.target] : [...m.addedNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE).flatMap((n) => [n, ...n.querySelectorAll("[data-pwc-validity]")]).filter((n) => n.hasAttribute("data-pwc-validity"))
    );
    for (const el of affected) this._applyValidity(el);
  }
  _applyValidity(el) {
    const value = el.getAttribute("data-pwc-validity");
    if (value) {
      el.setCustomValidity(value);
      this._updateMessage(el, value);
      this._setupClearing(el);
    } else {
      if (el.validity?.customError) el.setCustomValidity("");
      this._updateMessage(el, null);
    }
  }
  _updateMessage(_el, _text) {
  }
  _setupClearing(el) {
    let clearOn = el.dataset.pwcValidityClearOn ?? this.getAttribute("clear-on");
    let clearAfter = el.dataset.pwcValidityClearAfter ?? this.getAttribute("clear-after");
    if (clearOn === "off") clearOn = null;
    if (clearAfter === "off") clearAfter = null;
    if (!clearOn && !clearAfter) return;
    let timeoutId;
    const clear = () => {
      if (clearOn) {
        for (const event of tokenList(clearOn)) {
          el.removeEventListener(event, clear);
        }
      }
      if (timeoutId !== void 0) {
        clearTimeout(timeoutId);
        timeoutId = void 0;
      }
      el.removeAttribute("data-pwc-validity");
    };
    if (clearOn) {
      for (const event of tokenList(clearOn)) {
        el.addEventListener(event, clear);
      }
    }
    if (clearAfter) {
      timeoutId = setTimeout(clear, parseInt(clearAfter, 10));
    }
    this._cleanups.push(clear);
  }
  onDisconnect() {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
  }
};

// src/validity/validity.js
var PwcValidity = class extends BaseValidity {
  _updateMessage(el, text) {
    this._withoutChildrenChangedNotification(() => {
      let msg = el.nextElementSibling;
      if (text) {
        if (!msg?.matches(".pwc-validity-message")) {
          msg = document.createElement("span");
          msg.className = "pwc-validity-message";
          el.insertAdjacentElement("afterend", msg);
        }
        msg.textContent = text;
      } else if (msg?.matches(".pwc-validity-message")) {
        msg.remove();
      }
    });
  }
};
function define() {
  defineOnce("pwc-validity", PwcValidity);
}

// src/validity/index.js
function register() {
  define();
}
register();
export {
  register
};
