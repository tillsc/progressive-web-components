import { define } from "./dialog-opener.js";

// Ensure the modal-dialog-bs5 is registered first.
import "../../modal-dialog/bs5/index.js";

export function register() {
  define();
}

register();