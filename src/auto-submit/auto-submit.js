import { PwcElement } from "../core/pwc-element.js";
import { defineOnce } from "../core/utils.js";
import { transclude, executeScripts } from "../core/transclude.js";

/**
 * <pwc-auto-submit>
 *
 * On `change` events from contained form elements, submits the form via
 * `fetch` and transcludes the matching fragment from the response.
 */
export class PwcAutoSubmit extends PwcElement {
  static events = ["change"];

  handleEvent(e) {
    const target = e.target;
    if (!target.hasAttribute("data-auto-submit")) return;

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
          credentials,
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
}

export function define() {
  defineOnce("pwc-auto-submit", PwcAutoSubmit);
}
