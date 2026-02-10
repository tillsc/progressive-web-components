import { PwcZoneTransfer, define } from "./zone-transfer.js";
import cssText from "./zone-transfer.css";

export function register() {
  PwcZoneTransfer.registerCss(cssText);
  define();
}

register();
