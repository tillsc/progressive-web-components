import { installOnce } from "../core/css.js";

import { define } from "./dialog-opener.js";
import cssText from "./dialog-opener.css";

export function register() {
  installOnce("pwc-dialog-opener", cssText);
  define();
}

register();