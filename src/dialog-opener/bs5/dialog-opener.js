import { defineOnce } from "../../core/pwc-element.js";
import { BaseDialogOpener } from "../base.js";

export class PwcDialogOpenerBs5 extends BaseDialogOpener {
  dialogContent = (closeText) => `
<div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-body"></div>
      <div class="modal-footer pwc-dialog-opener-actions">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${closeText}</button>
      </div>
    </div>
  </div>
</div>`;

  findOrCreateDialog(src) {
    this.dialog = document.querySelector("div.pwc-dialog-opener-modal");
    if (!this.dialog) {
      this.dialog = document.createElement("div");
      this.dialog.classList.add("pwc-dialog-opener-modal");
      document.body.appendChild(this.dialog);
    }

    this.dialog.innerHTML = this.dialogContent(this.getAttribute("close") || "Close");

    const body = this.dialog.querySelector(".modal-body");
    body.innerHTML = "";

    const iframe = this.createIFrame(src);
    body.appendChild(iframe);

    this.modal = new bootstrap.Modal(this.dialog.querySelector(".modal"));
  }
}

export function define() {
  defineOnce("pwc-dialog-opener-bs5", PwcDialogOpenerBs5);
}
