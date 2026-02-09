import { PwcDialogOpener, define } from "./dialog-opener.js";
import cssText from "./dialog-opener.css";

// Ensure the modal-dialog is registered first.
import "../modal-dialog/index.js";

export function register() {
  PwcDialogOpener.registerCss(cssText);
  define();
}

register();
