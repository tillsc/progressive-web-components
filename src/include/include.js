import { PwcSimpleInitElement } from "../core/pwc-simple-init-element.js";
import { defineOnce } from "../core/utils.js";

/**
 * <pwc-include>
 *
 * Client-side HTML transclusion. Fetches HTML from a URL and inserts it.
 * Inspired by h-include by Gustaf Nilsson Kotte (https://github.com/gustafnk/h-include).
 */
export class PwcInclude extends PwcSimpleInitElement {
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

  refresh() {
    const src = this.getAttribute("src");
    if (!src) return;

    // Media gate
    const media = this.getAttribute("media");
    if (media && !window.matchMedia(media).matches) return;

    // Lazy: defer until visible
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

      // Try fallback URL
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
}

export function define() {
  defineOnce("pwc-include", PwcInclude);
}
