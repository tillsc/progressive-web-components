import { ensureId } from "../../core/utils.js";
import { defineOnce, PwcSimpleInitElement } from "../../core/pwc-element.js";

export class PwcModalDialogBs5 extends PwcSimpleInitElement {
  onConnect() {
    // Host is the Bootstrap modal root.
    this.classList.add("modal", "fade");
    this.tabIndex = -1;
    this.setAttribute("aria-hidden", "true");
  }

  onDisconnect() {
    this._teardown();
  }

  open(options = {}) {
    const BsModal = globalThis.bootstrap?.Modal;
    if (!BsModal) throw new Error("Bootstrap Modal required (globalThis.bootstrap.Modal)");

    if (!this.isConnected) {
      this._autoRemove = true;
      document.body.appendChild(this);
    }

    // Build scaffold fresh per open (simple + avoids lifecycle edge cases).
    const {
      title = "",
      size = "lg",
      closeText = "Close",
      backdrop = true,
      keyboard = true,
      focus = true
    } = options;

    this.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-${size}">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title"></h3>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer"></div>
        </div>
      </div>
    `;

    const dialogEl = this.querySelector(".modal-dialog");
    const titleEl = this.querySelector(".modal-title");
    const bodyEl = this.querySelector(".modal-body");
    const footerEl = this.querySelector(".modal-footer");

    titleEl.textContent = title;

    // Default close button in footer (caller can clear/replace after open).
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn btn-secondary";
    closeBtn.setAttribute("data-bs-dismiss", "modal");
    closeBtn.textContent = closeText;
    footerEl.append(closeBtn);

    // Parent modal stacking (suspend/restore).
    const parentModalEl = document.querySelector(".modal.show");
    const parentId =
      parentModalEl && parentModalEl !== this ? ensureId(parentModalEl) : null;

    if (parentId) this.dataset.parentModalId = parentId;
    else delete this.dataset.parentModalId;

    // Create modal instance.
    this._modal = BsModal.getOrCreateInstance(this, { backdrop, keyboard, focus });
    this._closed = false;

    // Install hidden handler once per open.
    const onHidden = () => {
      if (this.dataset.closeReason !== "final") return;

      this.removeEventListener("hidden.bs.modal", onHidden);
      this._teardown();

      const pid = this.dataset.parentModalId;
      if (pid) {
        const el = document.getElementById(pid);
        if (el) {
          delete el.dataset.closeReason;
          BsModal.getOrCreateInstance(el).show();
        }
      }

      delete this.dataset.closeReason;

      if (this._autoRemove && this.isConnected) this.remove();
    };

    this.addEventListener("hidden.bs.modal", onHidden);

    // Suspend parent (if any) and show.
    if (parentModalEl && parentModalEl !== this) {
      parentModalEl.dataset.closeReason = "suspend";
      BsModal.getOrCreateInstance(parentModalEl).hide();
    }

    this._modal.show();

    return {
      el: this,
      bodyEl,
      footerEl,
      close: () => this.close()
    };
  }

  close() {
    if (this._closed) return;
    this._closed = true;
    this.dataset.closeReason = "final";
    this._modal?.hide();
  }

  _teardown() {
    try {
      this._modal?.dispose();
    } catch {
      // ignore
    } finally {
      this._modal = null;
    }
  }
}

export const define = () => defineOnce("pwc-modal-dialog-bs5", PwcModalDialogBs5);