import { PwcSimpleInitElement } from "../core/pwc-simple-init-element.js";
import { defineOnce, tokenList, getOrCreateSheet, fetchSheet, adoptSheets } from "../core/utils.js";

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
      const fragments = fragmentSelector
        ? Array.from(doc.querySelectorAll(fragmentSelector))
        : [doc];

      if (extractStylesAttr !== null) {
        const styleEls = this._collectStyleElements(doc, extractStylesAttr, fragments);
        styleEls.forEach((el) => el.remove());

        const sheets = await PwcInclude._resolveSheets(styleEls, srcUrl);
        if (sheets.length) {
          adoptSheets(this.shadowRoot || document, sheets);
        }
      }

      if (fragmentSelector) {
        this.root.replaceChildren(...fragments.map((m) => document.adoptNode(m)));
      } else {
        this.root.replaceChildren(
          ...Array.from(doc.body.childNodes).map((n) => document.adoptNode(n))
        );
      }
    } else {
      this.root.innerHTML = html;
    }

    if (this.hasAttribute("with-scripts")) {
      this._executeScripts();
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

  _executeScripts() {
    for (const old of Array.from(this.root.querySelectorAll("script"))) {
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
