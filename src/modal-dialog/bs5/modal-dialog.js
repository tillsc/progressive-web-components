import { ModalDialogBase } from "../base.js";
import { defineOnce, ensureId } from "../../core/utils.js";

export class PwcModalDialogBs5 extends ModalDialogBase {
  static events = ["click", "hidden.bs.modal"];

  onConnect() {
    this.classList.add("modal", "fade");
    this.tabIndex = -1;
    this.setAttribute("aria-hidden", "true");
  }

  get isOpen() {
    return this.classList.contains("show");
  }

  requireBsModal() {
    const BsModal = globalThis.bootstrap?.Modal;
    if (!BsModal) throw new Error("Bootstrap Modal required (globalThis.bootstrap.Modal)");
    return BsModal;
  }

  _render({ title, size = "lg", height, closeText, showCloseButton = true }) {
    globalThis.bootstrap?.Modal?.getInstance(this)?.dispose();

    this.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-${size}">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title"></h3>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer"></div>
        </div>
      </div>
    `;

    const titleEl = this.querySelector(".modal-title");
    titleEl.textContent = title;
    this.setAttribute("aria-labelledby", ensureId(titleEl, "pwc-mdlg-bs5-title"));

    if (showCloseButton) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-close";
      btn.setAttribute("aria-label", closeText);
      btn.setAttribute("data-pwc-action", "close");
      this.querySelector(".modal-header").appendChild(btn);
    }

    const bodyEl = this.querySelector(".modal-body");
    if (height) bodyEl.style.height = height;

    return {
      rootEl: this,
      bodyEl,
      headerEl: this.querySelector(".modal-header"),
      footerEl: this.querySelector(".modal-footer"),
      modal: null,
      teardown: () => {
        this.innerHTML = "";
        this._finalClose = null;
      }
    };
  }

  _getOpenSibling() {
    const el = document.querySelector(".modal.show");
    // Optional Safety: ignore self if already shown
    if (el === this) return null;
    return el;
  }

  _suspend(el) {
    const BsModal = this.requireBsModal();
    BsModal.getOrCreateInstance(el).hide();
  }

  _restore(el) {
    const BsModal = this.requireBsModal();
    BsModal.getOrCreateInstance(el).show();
  }

  _show(ui, { backdrop = true, keyboard = true, focus = true } = {}) {
    const BsModal = this.requireBsModal();
    ui.modal = BsModal.getOrCreateInstance(this, { backdrop, keyboard, focus });
    ui.modal.show();
  }

  _hide(ui) {
    ui.modal?.hide();
  }

  _armFinalClose(_ui, onFinalClose) {
    // store on the instance, not on ui, because ui may be torn down
    this._finalClose = onFinalClose;
  }

  handleEvent(e) {
    if (e.type === "hidden.bs.modal") {
      if (this.dataset.closeReason === "suspend") return;

      const fn = this._finalClose;
      this._finalClose = null;

      if (typeof fn === "function") fn();
      return;
    }

    // Skip backdrop click — Bootstrap handles it via hidden.bs.modal
    if (e.type === "click" && e.target === this) return;

    super.handleEvent(e);
  }
}

export const define = () => defineOnce("pwc-modal-dialog-bs5", PwcModalDialogBs5);