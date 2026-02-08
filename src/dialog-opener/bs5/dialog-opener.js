import { defineOnce } from "../../core/pwc-element.js";
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
    if (!this.dialog) {
      // Use existing child socket if provided, otherwise create one.
      this.dialog = this.querySelector(tag) || document.createElement(tag);

      // If caller didn't place it into the DOM, keep it associated with this component.
      // ModalDialogBase will auto-append itself to <body> on open() if not connected.
      if (!this.dialog.isConnected) {
        this.appendChild(this.dialog);
      }
    }

    // Open modal and get access to the body/footer containers.
    this.dialog.open({
      title: this.getAttribute("title") || "",
      size: this.getAttribute("size") || "lg",
      closeText: this.getAttribute("close") || "Close",
      backdrop: true,
      keyboard: true,
      focus: true
    });

    const body = this.dialog.bodyEl;
    body.replaceChildren(this.createIFrame(src));

    // BaseDialogOpener expects this.modal.show()/hide()
    // Map those to the modal-dialog component API.
    this.modal = {
      show: () => {
        // already shown by open(); no-op for compatibility
      },
      hide: () => this.dialog.close()
    };
  }
}

export function define() {
  defineOnce("pwc-dialog-opener-bs5", PwcDialogOpenerBs5);
}
