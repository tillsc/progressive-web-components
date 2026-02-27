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

// src/core/utils.js
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
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
    beforeAttributeUpdated(attributeName, oldNode) {
      if ((attributeName === "value" || attributeName === "checked") && oldNode.matches?.("input,textarea,select") && oldNode.isConnected && !oldNode.readOnly && !oldNode.disabled) return false;
      return true;
    },
    afterNodeMorphed(oldNode, newNode) {
      if (!newNode?.matches?.("[data-pwc-force-value]")) return;
      if (newNode.matches("input[type=checkbox],input[type=radio]")) {
        oldNode.checked = newNode.hasAttribute("checked");
      } else {
        oldNode.value = newNode.value;
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

// src/auto-submit/auto-submit.js
var PwcAutoSubmit = class extends PwcElement {
  static events = ["change"];
  handleEvent(e) {
    const target = e.target;
    if (!target.hasAttribute("data-pwc-auto-submit")) return;
    const form = this.querySelector("form") || target.closest("form");
    if (!form) return;
    if (this.hasAttribute("local-reload") && this.id) {
      this._submitAndLocalReload(form, target);
    } else {
      if (this.hasAttribute("local-reload")) {
        console.warn("<pwc-auto-submit> has local-reload attribute but no id", this);
      }
      form.submit();
    }
  }
  async _submitAndLocalReload(form, trigger) {
    this._abortPending();
    this._controller = new AbortController();
    this.setAttribute("aria-busy", "true");
    const url = new URL(form.action || window.location.href);
    const method = (form.method || "GET").toUpperCase();
    const formData = new FormData(form);
    formData.set("_pwc_autosubmitted_by", trigger.name || trigger.id || "");
    try {
      const credentials = this.hasAttribute("with-credentials") ? "include" : "same-origin";
      let res;
      if (method === "GET") {
        url.search = new URLSearchParams(formData).toString();
        res = await fetch(url, { signal: this._controller.signal, credentials });
      } else {
        res = await fetch(url, {
          method,
          body: formData,
          signal: this._controller.signal,
          credentials
        });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const match = doc.getElementById(this.id);
      if (match) {
        transclude(this, Array.from(match.childNodes), this);
        if (this.hasAttribute("with-scripts")) {
          executeScripts(this);
        }
        this.removeAttribute("aria-busy");
        this.dispatchEvent(new CustomEvent("pwc-auto-submit:load", { bubbles: true }));
      } else {
        console.warn(`<pwc-auto-submit> could not find #${this.id} in response, replacing entire document`);
        document.open();
        document.write(html);
        document.close();
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      this.removeAttribute("aria-busy");
      this.dispatchEvent(
        new CustomEvent("pwc-auto-submit:error", { bubbles: true, detail: { error: err } })
      );
    }
  }
  _abortPending() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }
  onDisconnect() {
    this._abortPending();
  }
};
function define() {
  defineOnce("pwc-auto-submit", PwcAutoSubmit);
}

// src/auto-submit/index.js
function register() {
  define();
}
register();
export {
  register
};
