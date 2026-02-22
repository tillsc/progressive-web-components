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

// src/core/pwc-simple-init-element.js
var PwcSimpleInitElement = class extends PwcElement {
  connectedCallback() {
    super.connectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.onConnect();
    });
  }
  /** Called once after connect. Subclasses override. */
  onConnect() {
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
var _sheetCache = /* @__PURE__ */ new Map();
function getOrCreateSheet(cssText) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  const normalized = Array.from(sheet.cssRules, (r) => r.cssText).join("\n");
  if (_sheetCache.has(normalized)) {
    return _sheetCache.get(normalized);
  }
  _sheetCache.set(normalized, sheet);
  return sheet;
}
async function fetchSheet(url) {
  const resolved = new URL(url, document.baseURI).href;
  if (_sheetCache.has(resolved)) {
    return _sheetCache.get(resolved);
  }
  try {
    const res = await fetch(resolved);
    if (!res.ok) return null;
    const cssText = await res.text();
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    _sheetCache.set(resolved, sheet);
    return sheet;
  } catch {
    return null;
  }
}
function adoptSheets(target, sheets) {
  const existing = target.adoptedStyleSheets;
  const newOnes = sheets.filter((s) => !existing.includes(s));
  if (newOnes.length) {
    target.adoptedStyleSheets = [...existing, ...newOnes];
  }
}

// src/core/context.js
var ContextRequestEvent = class extends Event {
  constructor(context, callback) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
  }
};
function requestContext(element, name) {
  let value;
  element.dispatchEvent(new ContextRequestEvent(name, (v) => {
    value = v;
  }));
  return value ?? window.PWC?.[name];
}

// src/core/transclude.js
var MORPH_OPTIONS = {
  morphStyle: "innerHTML",
  restoreFocus: true,
  callbacks: {
    beforeAttributeUpdated(attributeName, node) {
      if ((attributeName === "value" || attributeName === "checked") && node.matches?.("input,textarea,select") && node.isConnected && !node.readOnly && !node.disabled) return false;
      return true;
    },
    afterNodeMorphed(oldNode, newNode) {
      if (!newNode?.matches?.("[data-pwc-force-value]")) return;
      if (newNode.matches("input[type=checkbox],input[type=radio]")) {
        oldNode.checked = newNode.hasAttribute("checked");
      } else {
        oldNode.value = newNode.getAttribute("value") ?? "";
      }
    }
  }
};
function transclude(target, content, contextElement) {
  const el = contextElement || target;
  const morphLib = el.hasAttribute?.("nomorph") ? null : requestContext(el, "idiomorph");
  if (morphLib) {
    morphLib.morph(target, content, MORPH_OPTIONS);
  } else if (typeof content === "string") {
    target.innerHTML = content;
  } else {
    target.replaceChildren(...content);
  }
}
function executeScripts(root) {
  for (const old of Array.from(root.querySelectorAll("script"))) {
    const s = document.createElement("script");
    if (old.src) s.src = old.src;
    if (old.type) s.type = old.type;
    if (old.noModule) s.noModule = true;
    s.textContent = old.textContent;
    old.replaceWith(s);
  }
}

// src/include/include.js
var PwcInclude = class _PwcInclude extends PwcSimpleInitElement {
  static observedAttributes = ["src", "media"];
  onConnect() {
    this.refresh();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    if (oldValue === newValue) return;
    this.refresh();
  }
  onDisconnect() {
    this._teardownLazy();
    this._abortPending();
  }
  get root() {
    return this.shadowRoot || this;
  }
  refresh() {
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
      await this._insert(html, src);
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
  async _insert(html, srcUrl) {
    if (this.hasAttribute("shadow") && !this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    const fragmentSelector = this.getAttribute("fragment");
    const extractStylesAttr = this.getAttribute("extract-styles");
    if (fragmentSelector || extractStylesAttr !== null) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const fragments = fragmentSelector ? Array.from(doc.querySelectorAll(fragmentSelector)) : [doc];
      if (extractStylesAttr !== null) {
        const styleEls = this._collectStyleElements(doc, extractStylesAttr, fragments);
        styleEls.forEach((el) => el.remove());
        const sheets = await _PwcInclude._resolveSheets(styleEls, srcUrl);
        if (sheets.length) {
          adoptSheets(this.shadowRoot || document, sheets);
        }
      }
      if (fragmentSelector) {
        transclude(this.root, fragments.map((m) => document.adoptNode(m)), this);
      } else {
        transclude(this.root, Array.from(doc.body.childNodes).map((n) => document.adoptNode(n)), this);
      }
    } else {
      transclude(this.root, html, this);
    }
    if (this.hasAttribute("with-scripts")) {
      executeScripts(this.root);
    }
  }
  _collectStyleElements(doc, extractStylesAttr, fragments) {
    const modes = tokenList(extractStylesAttr || "fragment");
    const selector = 'style, link[rel="stylesheet"]';
    const result = [];
    if (modes.contains("document")) {
      result.push(...doc.querySelectorAll(selector));
    } else {
      if (modes.contains("head")) {
        result.push(...doc.head.querySelectorAll(selector));
      }
      if (modes.contains("fragment")) {
        for (const fragment of fragments) {
          result.push(...fragment.querySelectorAll(selector));
        }
      }
    }
    return result;
  }
  static async _resolveSheets(styleElements, srcUrl) {
    const promises = styleElements.map((el) => {
      if (el.tagName === "LINK") {
        const href = el.getAttribute("href");
        const resolved = new URL(href, new URL(srcUrl, document.baseURI)).href;
        return fetchSheet(resolved);
      }
      return Promise.resolve(getOrCreateSheet(el.textContent));
    });
    const results = await Promise.all(promises);
    return [...new Set(results.filter(Boolean))];
  }
  _abortPending() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }
  _setupLazy() {
    if (this._observer) return;
    this._observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this._lazyTriggered = true;
        this._teardownLazy();
        this.refresh();
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
