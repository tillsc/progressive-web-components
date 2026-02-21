import { BaseValidity } from "../base.js";
import { defineOnce } from "../../core/utils.js";

export class PwcValidityBs5 extends BaseValidity {
  _updateMessage(el, text) {
    this._withoutChildrenChangedNotification(() => {
      let msg = el.nextElementSibling;
      if (text) {
        el.classList.add("is-invalid");
        if (!msg?.matches(".invalid-feedback")) {
          msg = document.createElement("div");
          msg.className = "invalid-feedback";
          el.insertAdjacentElement("afterend", msg);
        }
        msg.textContent = text;
      } else {
        el.classList.remove("is-invalid");
        if (msg?.matches(".invalid-feedback")) {
          msg.remove();
        }
      }
    });
  }
}

export function define() {
  defineOnce("pwc-validity-bs5", PwcValidityBs5);
}
