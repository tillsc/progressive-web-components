import { defineOnce } from "../core/utils.js";
import { BaseDialogOpener } from "./base.js";

export class PwcDialogOpener extends BaseDialogOpener {
  findOrCreateDialog(src) {
    if (!this.modalDialog) {
      this.modalDialog = document.createElement("pwc-modal-dialog");
      document.body.appendChild(this.modalDialog);
    }

    const closeText = this.getAttribute("close") || "Close";
    this.modalDialog.open({
      closeText,
      showClose: false
    });
this.modalDialog.footerEl.innerHTML = `
  <div class="pwc-dialog-opener-actions pwc-dialog-opener-footer">
    <button type="button" class="pwc-dialog-opener-close" data-pwc-action="close" aria-label="${closeText}">
      ${closeText}
    </button>
  </div>
`;
    const iframe = this.createIFrame(src);
    this.modalDialog.bodyEl.replaceChildren(iframe);

    // Contract for BaseDialogOpener.enhanceIFrame():
    // it queries this.dialog for "iframe".
    this.dialog = this.modalDialog.ui.rootEl;

    // Contract for BaseDialogOpener.open():
    // it calls this.modal.show()/hide().
    this.modal = {
      show: () => {}, // modal-dialog is already shown by open()
      hide: () => this.modalDialog.close()
    };
  }
}

export function define() {
  defineOnce("pwc-dialog-opener", PwcDialogOpener);
}
