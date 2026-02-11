import { defineOnce } from "../core/utils.js";
import { BaseDialogOpener } from "./base.js";

export class PwcDialogOpener extends BaseDialogOpener {
  findOrCreateDialog(src) {
    if (!this.modalDialog) {
      this.modalDialog = document.createElement("pwc-modal-dialog");
      document.body.appendChild(this.modalDialog);
    }

    const closeText = this.getAttribute("close-text") || "Close";
    this.modalDialog.open({
      closeText,
      showClose: false
    });
    this.modalDialog.footerEl.classList.add("pwc-dialog-opener-actions");
    this.modalDialog.footerEl.innerHTML = `
      <button type="button" class="pwc-dialog-opener-close" data-pwc-action="close" aria-label="${closeText}">
        ${closeText}
      </button>
    `;
    const iframe = this.createIFrame(src);
    this.modalDialog.bodyEl.replaceChildren(iframe);

    return this.modalDialog.ui.rootEl;
  }

  closeDialog() {
    this.modalDialog.close();
  }
}

export function define() {
  defineOnce("pwc-dialog-opener", PwcDialogOpener);
}
