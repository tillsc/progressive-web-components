import { define } from "./multiselect-dual-list.js";
import { registerCss } from "../../core/utils.js";

export function register() {
  registerCss(
    "pwc-multiselect-dual-list-bs5[hide-selected] .list-group-item-secondary { display: none; }"
  );
  define();
}

register();
