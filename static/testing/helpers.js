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

export function drag(item, targetZone, { clientY } = {}) {
  const itemRect = item.getBoundingClientRect();
  const zoneRect = targetZone.getBoundingClientRect();

  const startX = itemRect.left + itemRect.width / 2;
  const startY = itemRect.top + itemRect.height / 2;
  const endX = zoneRect.left + zoneRect.width / 2;

  // Clamp clientY to the zone's bounds so document.elementFromPoint finds the zone.
  // Values like 0 or 9999 are used in tests to mean "before all" / "after all" items.
  const rawY = clientY !== undefined ? clientY : startY;
  const endY = Math.max(zoneRect.top + 1, Math.min(zoneRect.bottom - 1, rawY));

  const opts = { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1 };
  item.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: startX, clientY: startY }));
  item.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientX: endX, clientY: endY }));
  item.dispatchEvent(new PointerEvent("pointerup",   { ...opts, clientX: endX, clientY: endY }));
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
