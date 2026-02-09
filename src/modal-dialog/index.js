import { installCssOnce } from "../core/utils.js";

import { define } from "./modal-dialog.js";
import cssText from "./modal-dialog.css";

export function register() {
  installCssOnce("pwc-modal-dialog", cssText);
  define();
}

register();
