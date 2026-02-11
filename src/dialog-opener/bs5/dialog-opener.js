import { defineOnce } from "../../core/utils.js";
import { BaseDialogOpener } from "../base.js";

/**
 * <pwc-dialog-opener-bs5>
 *
 * Uses <pwc-modal-dialog-bs5> as the Bootstrap modal socket.
 *
 * Requirements:
 * - Bootstrap 5 CSS + JS present (globalThis.bootstrap.Modal)
 * - pwc-modal-dialog-bs5 defined (either imported/bundled or already on page)
 */
export class PwcDialogOpenerBs5 extends BaseDialogOpener {
  findOrCreateDialog(src) {
    const tag = "pwc-modal-dialog-bs5";

    // Prefer one modal socket per opener instance.
    if (!this.modalDialog) {
      // Use existing child socket if provided, otherwise create one.
      this.modalDialog = this.querySelector(tag) || document.createElement(tag);

      // If caller didn't place it into the DOM, keep it associated with this component.
      // ModalDialogBase will auto-append itself to <body> on open() if not connected.
      if (!this.modalDialog.isConnected) {
        this.appendChild(this.modalDialog);
      }
    }

    const closeText = this.getAttribute("close-text") || "Close";

    // Open modal and get access to the body/footer containers.
    this.modalDialog.open({
      title: this.getAttribute("title") || "",
      size: this.getAttribute("size") || "lg",
      closeText,
      showClose: false,
      backdrop: true,
      keyboard: true,
      focus: true
    });

    this.modalDialog.footerEl.classList.add("pwc-dialog-opener-actions");
    this.modalDialog.footerEl.innerHTML = `
      <button type="button" class="btn btn-secondary" data-pwc-action="close" aria-label="${closeText}">
        ${closeText}
      </button>
    `;

    this.modalDialog.bodyEl.replaceChildren(this.createIFrame(src));

    return this.modalDialog;
  }

  closeDialog() {
    this.modalDialog.close();
  }

  _moveOutSelector() {
    let selector = super._moveOutSelector();
    if (selector === "primary") {
      selector = ".btn-primary[type=submit]";
    }
    return selector
  }
}

export function define() {
  defineOnce("pwc-dialog-opener-bs5", PwcDialogOpenerBs5);
}
