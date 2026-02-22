import { PwcSimpleInitElement } from "../src/core/pwc-simple-init-element.js";
import { registerCss } from "../src/core/utils.js";

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

registerCss("pwc-dev-only-link { display: list-item; }");
customElements.define("pwc-dev-only-link", PwcDevOnlyLink);
