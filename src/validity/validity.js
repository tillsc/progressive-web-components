import { BaseValidity } from "./base.js";
import { defineOnce } from "../core/utils.js";

export class PwcValidity extends BaseValidity {
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
}

export function define() {
  defineOnce("pwc-validity", PwcValidity);
}
