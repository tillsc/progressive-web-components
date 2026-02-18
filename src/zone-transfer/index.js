import { define } from "./zone-transfer.js";
import { registerCss } from "../core/utils.js";
import cssText from "./zone-transfer.css";

export function register() {
  registerCss(cssText);
  define();
}

register();
