import { PwcChildrenObserverElement } from "../core/pwc-children-observer-element.js";
import { defineOnce } from "../core/utils.js";

/**
 * <pwc-zone-transfer>
 *
 * Drag&drop + keyboard sort, optional keyboard move across zones via per-zone hotkeys.
 *
 * Hooks (default):
 * - Zones:  pwc-zone-transfer-zone, [data-pwc-zone]
 * - Items:  pwc-zone-transfer-item, [data-pwc-item]
 * - Handle: pwc-zone-transfer-handle, [data-pwc-handle]
 *
 * Zone hotkeys (optional):
 * - data-pwc-zone-key="Enter" on a zone element
 *   Pressing that key moves the focused item to that zone.
 *
 * Keyboard:
 * - ArrowUp/ArrowDown: move focus within current zone
 * - Ctrl+ArrowUp/Ctrl+ArrowDown: reorder focused item within zone
 * - Zone hotkey: move focused item to that zone (only if any zone hotkeys are defined)
 *
 * Events:
 * - pwc-zone-transfer:change { itemId, fromZone, toZone, index, method }
 */
export class PwcZoneTransfer extends PwcChildrenObserverElement {
  static events = ["dragstart", "dragover", "drop", "dragend", "keydown"];
  static observeMode = "tree";

  static zoneSelector = "pwc-zone-transfer-zone, [data-pwc-zone]";
  static itemSelector = "pwc-zone-transfer-item, [data-pwc-item]";
  static handleSelector = "pwc-zone-transfer-handle, [data-pwc-handle]";

  onChildrenChanged() {
    const items = this._items();
    for (const item of items) {
      if (!item.hasAttribute("draggable")) item.setAttribute("draggable", "true");
      if (!item.hasAttribute("tabindex")) item.tabIndex = -1;
      if (!item.hasAttribute("role")) item.setAttribute("role", "option");
    }

    for (const zone of this._zones()) {
      if (!zone.hasAttribute("role")) zone.setAttribute("role", "listbox");
      if (!zone.hasAttribute("tabindex")) zone.tabIndex = -1;
    }

    const active = items.find((it) => it.tabIndex === 0) || items[0] || null;
    for (const it of items) it.tabIndex = it === active ? 0 : -1;
  }

  handleEvent(e) {
    if (e.type === "dragstart") return this._onDragStart(e);
    if (e.type === "dragover") return this._onDragOver(e);
    if (e.type === "drop") return this._onDrop(e);
    if (e.type === "dragend") return this._onDragEnd();
    if (e.type === "keydown") return this._onKeyDown(e);
  }

  _zones() {
    return Array.from(this.querySelectorAll(this.constructor.zoneSelector));
  }

  _items(zoneEl) {
    return Array.from((zoneEl || this).querySelectorAll(this.constructor.itemSelector));
  }

  _onDragStart(e) {
    const item = this._closestItem(e.target);
    if (!item) return;

    if (item.querySelector(this.constructor.handleSelector) && !this._closestHandle(e.target)) {
      e.preventDefault();
      return;
    }

    const zone = this._closestZone(item);
    if (!zone) return;

    this._drag = { item, fromZone: zone };

    // Optional UX hint for native DnD
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";

    item.classList.add("pwc-zone-transfer-dragging");
    this._ensurePlaceholder(item);
  }

  _onDragOver(e) {
    if (!this._drag?.item) return;

    const zone = this._closestZone(e.target);
    if (!zone) return;

    e.preventDefault();

    // Optional UX hint for native DnD
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

    this._ensurePlaceholder(this._drag.item);

    const beforeEl = this._beforeFromPointer(zone, e, this._drag.item);
    this._movePlaceholder(zone, beforeEl);

    this._drag.overZone = zone;
    this._drag.overMethod = beforeEl ? "before" : "append";
  }

  _onDrop(e) {
    if (!this._drag?.item) return;

    const zone = this._closestZone(e.target);
    if (!zone) return;

    e.preventDefault();

    this._applyMove(this._drag.item, this._drag.fromZone, zone, this._drag.overMethod || "append");
    this._clearPlaceholder();
  }

  _onDragEnd() {
    if (this._drag?.item) this._drag.item.classList.remove("pwc-zone-transfer-dragging");
    this._drag = null;
    this._clearPlaceholder();
  }

  _onKeyDown(e) {
    if (e.target?.closest?.("input,textarea,select,button,[contenteditable]")) return;

    const item = this._closestItem(e.target);
    if (!item) return;

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      if (e.ctrlKey || e.metaKey) this._keyboardReorder(item, dir);
      else this._focusSibling(item, dir);
      return;
    }

    const zone = this._zoneByHotkey(e.key);
    if (!zone) return;

    e.preventDefault();
    this._keyboardMoveToZone(item, zone);
  }

  _keyboardReorder(item, dir) {
    const zone = this._closestZone(item);
    if (!zone) return;

    const items = this._items(zone);
    const i = items.indexOf(item);
    if (i < 0) return;

    const j = i + dir;
    if (j < 0 || j >= items.length) return;

    zone.insertBefore(item, dir > 0 ? items[j].nextElementSibling : items[j]);

    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    item.focus();

    this._emitChange(item, zone, zone, this._indexInZone(item, zone), "before");
  }

  _keyboardMoveToZone(item, zone) {
    const fromZone = this._closestZone(item);
    if (!fromZone || fromZone === zone) return;

    zone.appendChild(item);

    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    item.focus();

    this._emitChange(item, fromZone, zone, this._indexInZone(item, zone), "append");
  }

  _zoneByHotkey(key) {
    const zones = this._zones();
    if (!zones.some((z) => z.hasAttribute("data-pwc-zone-key"))) return null;
    return zones.find((z) => z.getAttribute("data-pwc-zone-key") === key) || null;
  }

  _emitChange(item, fromZone, toZone, index, method) {
    this.dispatchEvent(
      new CustomEvent("pwc-zone-transfer:change", {
        bubbles: true,
        detail: {
          itemId: this._itemId(item),
          fromZone: this._zoneName(fromZone),
          toZone: this._zoneName(toZone),
          index,
          method
        }
      })
    );
  }

  _applyMove(item, fromZone, toZone, method) {
    if (this._placeholder?.parentNode === toZone) toZone.insertBefore(item, this._placeholder);
    else toZone.appendChild(item);

    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;

    this._emitChange(item, fromZone, toZone, this._indexInZone(item, toZone), method);
  }

  _focusSibling(item, dir) {
    const zone = this._closestZone(item);
    if (!zone) return;

    const items = this._items(zone);
    const i = items.indexOf(item);
    if (i < 0) return;

    const next = items[i + dir];
    if (!next) return;

    item.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  }

  _ensurePlaceholder(itemEl) {
    if (this._placeholder?.isConnected) return;

    this._placeholder = document.createElement("div");
    this._placeholder.className = "pwc-zone-transfer-placeholder";
    this._placeholder.setAttribute("aria-hidden", "true");
    this._placeholder.style.height = `${Math.max(8, Math.round(itemEl.getBoundingClientRect().height || 0))}px`;
  }

  _movePlaceholder(zoneEl, beforeEl) {
    if (!this._placeholder) return;
    if (beforeEl && beforeEl.parentNode === zoneEl) zoneEl.insertBefore(this._placeholder, beforeEl);
    else zoneEl.appendChild(this._placeholder);
  }

  _clearPlaceholder() {
    if (this._placeholder?.parentNode) this._placeholder.parentNode.removeChild(this._placeholder);
  }

  _beforeFromPointer(zoneEl, e, draggedItem) {
    const y = e.clientY;
    for (const it of this._items(zoneEl)) {
      if (it === draggedItem || it === this._placeholder) continue;
      const r = it.getBoundingClientRect();
      if (y <= r.top + r.height / 2) return it;
    }
    return null;
  }

  _closestZone(node) {
    if (!(node instanceof Element)) return null;
    const zone = node.closest(this.constructor.zoneSelector);
    return zone && this.contains(zone) ? zone : null;
  }

  _closestItem(node) {
    if (!(node instanceof Element)) return null;
    const item = node.closest(this.constructor.itemSelector);
    return item && this.contains(item) ? item : null;
  }

  _closestHandle(node) {
    if (!(node instanceof Element)) return null;
    const handle = node.closest(this.constructor.handleSelector);
    return handle && this.contains(handle) ? handle : null;
  }

  _zoneName(zoneEl) {
    if (!zoneEl) return "";
    return zoneEl.tagName.toLowerCase() === "pwc-zone-transfer-zone"
      ? zoneEl.getAttribute("name") || ""
      : zoneEl.getAttribute("data-pwc-zone") || "";
  }

  _itemId(itemEl) {
    if (!itemEl) return "";
    return itemEl.tagName.toLowerCase() === "pwc-zone-transfer-item"
      ? itemEl.getAttribute("id") || itemEl.getAttribute("data-id") || ""
      : itemEl.getAttribute("data-pwc-item") || itemEl.getAttribute("id") || "";
  }

  _indexInZone(itemEl, zoneEl) {
    return Math.max(0, this._items(zoneEl).indexOf(itemEl));
  }
}

export function define() {
  defineOnce("pwc-zone-transfer", PwcZoneTransfer);
}