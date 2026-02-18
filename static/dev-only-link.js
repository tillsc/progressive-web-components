import { PwcSimpleInitElement } from "../src/core/pwc-simple-init-element.js";

const backendAvailable = fetch("/.well-known/pwc", { method: "HEAD" })
  .then((r) => r.ok)
  .catch(() => false);

class PwcDevOnlyLink extends PwcSimpleInitElement {
  onConnect() {
    backendAvailable.then((available) => {
      if (!available) return;

      const a = document.createElement("a");
      for (const { name, value } of this.attributes) {
        a.setAttribute(name, value);
      }
      while (this.firstChild) {
        a.appendChild(this.firstChild);
      }
      this.appendChild(a);
    });
  }
}

PwcDevOnlyLink.registerCss("pwc-dev-only-link { display: list-item; }");
customElements.define("pwc-dev-only-link", PwcDevOnlyLink);
