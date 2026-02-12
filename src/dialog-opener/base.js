import { PwcElement } from "../core/pwc-element.js";

export class BaseDialogOpener extends PwcElement {
  static events = ["click"];
  static hiddenInDialogSelector =  "pwc-dialog-opener-hidden, [data-pwc-dialog-opener-hidden]"

  constructor() {
    super();
    this._iframeLoadHandler = (e) => {
      this._onIFrameLoad(e).catch(console.error);
    };
  }

  handleEvent(e) {
    if (e.type !== "click") return;
    if (e.defaultPrevented) return;

    const link = e.target.closest("a");
    if (!link || !this.contains(link)) return;

    e.preventDefault();

    if (this.hasAttribute("local-reload") && !this.id) {
      console.warn("<pwc-dialog-opener> has local-reload attribute but no id", this);
    }

    const href = link.getAttribute("href");
    if (!href) return;

    const label = link.getAttribute("aria-label") || link.textContent.trim();
    const iframeTitle = this.getAttribute("iframe-title") || (label ? `Dialog: ${label}` : "");
    this._openDialogWith(href, iframeTitle);
  }

  // Variant hook: must return a DOM element containing the iframe
  // eslint-disable-next-line no-unused-vars
  findOrCreateDialog(_src) {
    throw new Error("BaseDialogOpener: findOrCreateDialog(src) must be implemented by a variant");
  }

  // Variant hook: close the dialog
  closeDialog() {
    throw new Error("BaseDialogOpener: closeDialog() must be implemented by a variant");
  }

  createIFrame(src) {
    const iframe = document.createElement("iframe");
    iframe.src = src;

    iframe.style.width = "100%";
    iframe.style.height = getComputedStyle(this).getPropertyValue("--pwc-dialog-opener-height").trim() || "550px";
    iframe.style.display = "none";

    return iframe;
  }

  _openDialogWith(href, iframeTitle) {
    const src = this._prepareIFrameLink(href);
    this.dialog = this.findOrCreateDialog(src);
    this._enhanceIFrame(iframeTitle);
  }

  _prepareIFrameLink(src) {
    const s = new URL(src, document.location.href);

    const defaultValues = [...this.querySelectorAll("input")]
      .map((input) => {
        if (input.value) return input.value;
        return null;
      })
      .filter((item) => item !== null);

    if (defaultValues.length > 0) {
      s.searchParams.set("pwc_default", defaultValues.join(","));
    }

    s.searchParams.set("pwc_embedded", true);
    return s.toString();
  }

  _enhanceIFrame(iframeTitle) {
    this.iframe = this.dialog.querySelector("iframe");
    this.iframe.title = iframeTitle;

    this.iframe.removeEventListener("load", this._iframeLoadHandler);
    this.iframe.addEventListener("load", this._iframeLoadHandler);
  }

  _installIFrameAdditionalEventTriggers() {
    const additionalEvents = (this.getAttribute("iframe-additional-events") || "").trim()
      .split(/\s+/).filter(Boolean);
    if (!additionalEvents.length) return;

    const doc = this.iframe?.contentWindow?.document;
    if (!doc) return;

    this._hookedDocs||= new WeakSet();
    if (this._hookedDocs.has(doc)) return;
    this._hookedDocs.add(doc);

    for (const ev of additionalEvents) {
      doc.addEventListener(ev, this._iframeLoadHandler);
    }
  }

  async _onIFrameLoad(_e) {
    let uri;
    try {
      uri = new URL(this.iframe.contentWindow.location);
    } catch (e) {
      throw new Error(`<pwc-dialog-opener> cannot access iframe location (cross-origin?): ${e.message}`);
    }

    if (uri.searchParams.has("pwc_done_with")) {
      this.closeDialog();

      uri.searchParams.delete("pwc_embedded");
      uri.searchParams.set("pwc_cb", Math.floor(Math.random() * 100000));

      const localReloadWorked = await this._tryLocalReload(uri);
      if (!localReloadWorked) {
        window.location.href = uri.toString();
      }
      return;
    }

    this._installIFrameAdditionalEventTriggers();
    this._applyIFrameDomTransformations();
    this.iframe.style.display = "unset";
  }

  async _tryLocalReload(newUri) {
    const currentUri = new URL(window.location.href);
    if (
      currentUri.hostname !== newUri.hostname ||
      currentUri.pathname !== newUri.pathname ||
      currentUri.protocol !== newUri.protocol
    ) {
      console.log(`<dialog-opener> Warning: local-reload got different base uri (${newUri.toString()}) then window has (${currentUri.toString()}). This might lead to problems, but we'll try it anyway.`);
    }

    if (this.hasAttribute("local-reload") && this.id) {
      const localReloadOptionTokens = document.createElement("div").classList;
      if (this.hasAttribute("local-reload")) localReloadOptionTokens.add(...this.getAttribute("local-reload").split(/\s+/));
      const localReloadOptions = {
        replaceUrl: localReloadOptionTokens.contains("replace-url"),
        pushUrl: localReloadOptionTokens.contains("push-url"),
        withScripts: localReloadOptionTokens.contains("with-scripts")
      };

      newUri.searchParams.set("local_reload", this.id);

      const res = await fetch(newUri);
      if (res.ok) {
        const html = await res.text();
        const newDocument = new DOMParser().parseFromString(html, "text/html");
        const fragment = newDocument.getElementById(this.id);

        if (fragment) {
          this.replaceChildren(...fragment.childNodes);

          // Optional History API update
          if (localReloadOptions.replaceUrl || localReloadOptions.pushUrl) {

            if (localReloadOptions.pushUrl) {
              history.pushState(null, "", newUri);
            }
            else if (localReloadOptions.replaceUrl) {
              history.replaceState(null, "", newUri);
            }
          }

          if (localReloadOptions.withScripts) {
            this._executeInlineScripts(this);
          }

          this.dispatchEvent(
            new CustomEvent("pwc-dialog-opener:local-reload", {
              bubbles: true,
              detail: { url: newUri.toString() }
            })
          );

          return true;
        }
        console.log("local-reload not possible, falling back to full reload");
      }
    }

    return false;
  }

  _executeInlineScripts(root) {
    console.log("Executing inline scripts in local-reload fragment", root);
    const scripts = Array.from(root.querySelectorAll("script"));

    for (const old of scripts) {
      if (old.src) {
        console.warn("Ignoring external script in local-reload fragment:", old.src);
        old.remove();
        continue;
      }

      // Re-create script to execute it
      const s = document.createElement("script");
      // preserve type if present (default is classic)
      if (old.type) s.type = old.type;
      if (old.noModule) s.noModule = true;

      s.textContent = old.textContent || "";

      old.replaceWith(s);
    }
  }

  _applyIFrameDomTransformations() {
    const iframeDoc = this.iframe.contentWindow?.document;
    if (!iframeDoc) return;

    if  (this.getAttribute("hoist-actions")) {
      let buttonContainer = this.dialog.querySelector("dialog-opener-buttons");
      if (!buttonContainer) {
        buttonContainer = document.createElement("dialog-opener-buttons");
        this.dialog.querySelector(".pwc-dialog-opener-actions").prepend(buttonContainer);
      } else {
        buttonContainer.innerHTML = "";
      }

      const elements = iframeDoc.querySelectorAll(this._moveOutSelector());
      for (let i = 0; i < elements.length; i++) {
        const btn = elements[i];

        const outerBtn = document.createElement(btn.tagName);
        for (const attr of btn.attributes) {
          outerBtn.setAttribute(attr.name, attr.value);
        }
        outerBtn.innerHTML = btn.innerHTML;

        outerBtn.addEventListener("click", () => {
          this.iframe.style.display = "none";
          btn.click();
        });

        buttonContainer.append(outerBtn);

        btn.style.display = "none";
      }
    }

    iframeDoc.querySelectorAll(this.constructor.hiddenInDialogSelector).forEach((el) => {
      el.style.display = "none";
    });
  }

  _moveOutSelector() {
    let selector = this.getAttribute("hoist-actions");
    if (selector === "submit") {
      selector = "button[type=submit], input[type=submit]";
    }
    return selector;
  }
}