// Shared DOM interaction helpers for test pages.

export function changeValue(el, value) {
  el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function clickRadio(radio) {
  radio.checked = true;
  radio.dispatchEvent(new Event("change", { bubbles: true }));
}

export function toggleCheckbox(cb) {
  cb.checked = !cb.checked;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
}

export function key(el, k, opts = {}) {
  el.dispatchEvent(new KeyboardEvent("keydown", {
    key: k,
    bubbles: true,
    cancelable: true,
    ctrlKey: Boolean(opts.ctrlKey),
    metaKey: Boolean(opts.metaKey)
  }));
}
