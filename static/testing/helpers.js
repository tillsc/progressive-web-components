// Shared DOM interaction helpers for test pages.

export function setValue(el, value, { change = true } = {}) {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  if (change) el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function click(el) {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }));
}

export function clickRadio(radio) {
  radio.checked = true;
  radio.dispatchEvent(new Event("change", { bubbles: true }));
}

export function toggleCheckbox(cb, checked) {
  cb.checked = checked === undefined ? !cb.checked : checked;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
}

export function drag(item, targetZone, { clientY = 0 } = {}) {
  item.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true }));
  targetZone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, clientY }));
  targetZone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true }));
  item.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true }));
}

export function waitForEvent(el, name, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`waitForEvent timeout: ${name}`)), timeoutMs);
    el.addEventListener(name, (e) => { clearTimeout(timer); resolve(e); }, { once: true });
  });
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
