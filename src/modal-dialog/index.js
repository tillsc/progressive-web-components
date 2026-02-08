import { installOnce } from "../core/css.js";

import { define } from "./modal-dialog.js";
import cssText from "./modal-dialog.css";

export function register() {
  installOnce("pwc-modal-dialog", cssText);
  define();
}

register();
