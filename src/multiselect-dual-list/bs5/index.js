import { PwcMultiselectDualListBs5, define } from "./multiselect-dual-list.js";

export function register() {
  PwcMultiselectDualListBs5.registerCss(
    "pwc-multiselect-dual-list-bs5[hide-selected] .list-group-item-secondary { display: none; }"
  );
  define();
}

register();
