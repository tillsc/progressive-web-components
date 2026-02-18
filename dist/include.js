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

// src/core/utils.js
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

// src/include/include.js
var PwcInclude = class extends PwcSimpleInitElement {
  static observedAttributes = ["src", "media"];
  onConnect() {
    this._load();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._connected) return;
    if (oldValue === newValue) return;
    this._load();
  }
  /** Re-fetch the current `src` and replace content. */
  refresh() {
    this._load();
  }
  onDisconnect() {
    this._teardownLazy();
    this._abortPending();
  }
  // -- internal ---------------------------------------------------------------
  _load() {
    const src = this.getAttribute("src");
    if (!src) return;
    const media = this.getAttribute("media");
    if (media && !window.matchMedia(media).matches) return;
    if (this.hasAttribute("lazy") && !this._lazyTriggered) {
      this._setupLazy();
      return;
    }
    this._fetch(src);
  }
  async _fetch(src) {
    this._abortPending();
    this._controller = new AbortController();
    this.setAttribute("aria-busy", "true");
    try {
      const credentials = this.hasAttribute("with-credentials") ? "include" : "same-origin";
      const res = await fetch(src, { signal: this._controller.signal, credentials });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      this._insert(html);
      this.removeAttribute("aria-busy");
      this.dispatchEvent(new CustomEvent("pwc-include:load", { bubbles: true }));
    } catch (err) {
      if (err.name === "AbortError") return;
      const alt = this.getAttribute("alt");
      if (alt && src !== alt) {
        this._fetch(alt);
        return;
      }
      this.removeAttribute("aria-busy");
      this.dispatchEvent(
        new CustomEvent("pwc-include:error", { bubbles: true, detail: { error: err } })
      );
    }
  }
  _insert(html) {
    const fragment = this.getAttribute("fragment");
    if (fragment) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const matches = doc.querySelectorAll(fragment);
      this.replaceChildren(...Array.from(matches).map((m) => document.adoptNode(m)));
    } else {
      this.innerHTML = html;
    }
    if (this.hasAttribute("with-scripts")) {
      this._executeScripts();
    }
  }
  _executeScripts() {
    for (const old of Array.from(this.querySelectorAll("script"))) {
      const s = document.createElement("script");
      if (old.src) s.src = old.src;
      if (old.type) s.type = old.type;
      if (old.noModule) s.noModule = true;
      s.textContent = old.textContent;
      old.replaceWith(s);
    }
  }
  _abortPending() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }
  // -- lazy loading -----------------------------------------------------------
  _setupLazy() {
    if (this._observer) return;
    this._observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this._lazyTriggered = true;
        this._teardownLazy();
        this._load();
      }
    });
    this._observer.observe(this);
  }
  _teardownLazy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }
};
function define() {
  defineOnce("pwc-include", PwcInclude);
}

// src/include/index.js
function register() {
  define();
}
register();
export {
  register
};
