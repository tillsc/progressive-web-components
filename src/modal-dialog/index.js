import { define } from "./modal-dialog.js";
import { registerCss } from "../core/utils.js";
import cssText from "./modal-dialog.css";

export function register() {
  registerCss(cssText);
  define();
}

register();
