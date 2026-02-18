import { define } from "./multiselect-dual-list.js";
import { registerCss } from "../core/utils.js";
import cssText from "./multiselect-dual-list.css";

export function register() {
  registerCss(cssText);
  define();
}

register();
