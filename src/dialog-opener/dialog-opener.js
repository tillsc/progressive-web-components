import { defineOnce } from "../core/pwc-element.js";
import { BaseDialogOpener } from "./base.js";

class DialogController {
  constructor(dialogEl) {
    this.el = dialogEl;
  }

  show() {
    if (typeof this.el.showModal === "function" && !this.el.open) {
      this.el.showModal();
    }
  }

  hide() {
    if (this.el.open) {
      this.el.close();
    }
  }
}

export class PwcDialogOpener extends BaseDialogOpener {
  dialogContent(closeText) {
    return `
      <header class="pwcdo__header">
        <button class="pwcdo__close" type="button" aria-label="Close">${closeText}</button>
      </header>
      <section class="pwcdo__body"></section>
    `;
  }

  findOrCreateDialog(src) {
    // One dialog per component instance (no global sharing).
    if (!this.dialog) {
      this.dialog = document.createElement("dialog");
      this.dialog.className = "pwc-dialog-opener-modal";

      // Close on backdrop click (native dialog does not do this by default).
      this.dialog.addEventListener("click", (e) => {
        if (e.target === this.dialog) this.dialog.close();
      });

      // Ensure iframe is dropped when dialog closes.
      this.dialog.addEventListener("close", () => {
        const iframe = this.dialog.querySelector("iframe");
        if (iframe) iframe.remove();
      });

      document.body.appendChild(this.dialog);
      this.modal = new DialogController(this.dialog);
    }

    this.dialog.innerHTML = this.dialogContent(this.getAttribute("close") || "Close");

    const closeBtn = this.dialog.querySelector(".pwcdo__close");
    if (closeBtn) closeBtn.addEventListener("click", () => this.modal.hide());

    const body = this.dialog.querySelector(".pwcdo__body");
    body.innerHTML = "";

    // Create iframe via base helper (width/height are intrinsic behavior).
    const iframe = this.createIFrame(src);
    body.appendChild(iframe);
  }
}

export function define() {
  defineOnce("pwc-dialog-opener", PwcDialogOpener);
}