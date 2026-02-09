import { PwcModalDialog, define } from "./modal-dialog.js";
import cssText from "./modal-dialog.css";

export function register() {
  PwcModalDialog.registerCss(cssText);
  define();
}

register();
