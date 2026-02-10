import { PwcMultiselectDualList, define } from "./multiselect-dual-list.js";
import cssText from "./multiselect-dual-list.css";

export function register() {
  PwcMultiselectDualList.registerCss(cssText);
  define();
}

register();
