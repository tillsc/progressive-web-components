import { ModalDialogBase } from "./base.js";
import { defineOnce } from "../core/pwc-element.js";

export class PwcModalDialog extends ModalDialogBase {
  isOpen() {
    return Boolean(this._ui?.rootEl?.open);
  }

  _render({ title, size, closeText }) {
    const dlg = document.createElement("dialog");
    dlg.className = `pwc-modal-dialog pwc-modal-dialog--${size}`;

    dlg.innerHTML = `
      <div class="pwc-modal-dialog-surface" role="document">
        <header class="pwc-modal-dialog-header">
          <h3 class="pwc-modal-dialog-title"></h3>
          <button type="button" class="pwc-modal-dialog-x" aria-label="Close" data-pwc-action="close">×</button>
        </header>
        <section class="pwc-modal-dialog-body"></section>
        <footer class="pwc-modal-dialog-footer"></footer>
      </div>
    `;

    dlg.querySelector(".pwc-modal-dialog-title").textContent = title;
    dlg.querySelector("[data-pwc-action='close']").setAttribute("aria-label", closeText);

    this.replaceChildren(dlg);

    return {
      rootEl: dlg,
      bodyEl: dlg.querySelector(".pwc-modal-dialog-body"),
      headerEl: dlg.querySelector(".pwc-modal-dialog-header"),
      footerEl: dlg.querySelector(".pwc-modal-dialog-footer"),
      teardown: () => {
        if (dlg.open) dlg.close();
        dlg.remove();
      }
    };
  }

  _getOpenSibling() {
    // Return the HOST element of the currently open modal (not the <dialog>)
    // so dataset.closeReason lives on the custom element, not on the dialog node.
    const candidates = Array.from(document.querySelectorAll("pwc-modal-dialog"));
    return candidates.find((el) => el !== this && el._ui?.rootEl?.open === true) || null;
  }

  _suspend(hostEl) {
    // hostEl is <pwc-modal-dialog>
    if (hostEl.isOpen()) hostEl.rootEl.close();
  }

  _restore(hostEl) {
    const dlg = hostEl.rootEl;
    if (dlg && typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
  }

  _show(ui) {
    const dlg = ui.rootEl;
    if (typeof dlg?.showModal !== "function") throw new Error("<dialog> not supported");
    if (!dlg.open) dlg.showModal();
  }

  _hide(ui) {
    const dlg = ui?.rootEl;
    if (dlg?.open) dlg.close();
  }

  _armFinalClose(ui, onFinalClose) {
    const dlg = ui?.rootEl;
    if (!dlg) return;

    const onClose = () => {
      // Suspend closes must NOT teardown.
      if (this.dataset.closeReason === "suspend") return;
      onFinalClose();
    };

    dlg.addEventListener("close", onClose);

    const prevTeardown = ui.teardown;
    ui.teardown = () => {
      dlg.removeEventListener("close", onClose);
      if (prevTeardown) prevTeardown();
    };
  }
}

export const define = () => defineOnce("pwc-modal-dialog", PwcModalDialog);