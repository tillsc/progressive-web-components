// src/core/pwc-element.js
var PwcElement = class extends HTMLElement {
  /**
   * List of DOM event types to bind on the host element.
   * Subclasses may override.
   *
   * Example:
   *   static events = ["click", "input"];
   */
  static events = [];
  static registerCss(cssText) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
  connectedCallback() {
    this._bindEvents();
  }
  disconnectedCallback() {
    this._unbindEvents();
    this.onDisconnect();
  }
  /**
   * Optional cleanup hook for subclasses.
   */
  onDisconnect() {
  }
  /**
   * Bind declared events using the handleEvent pattern.
   */
  _bindEvents() {
    const events = this.constructor.events ?? [];
    for (const type of events) {
      this.addEventListener(type, this);
    }
  }
  /**
   * Unbind all previously declared events.
   */
  _unbindEvents() {
    const events = this.constructor.events ?? [];
    for (const type of events) {
      this.removeEventListener(type, this);
    }
  }
  /**
   * Default event handler.
   * Subclasses are expected to override this method
   * and route events as needed.
   */
  handleEvent(_event) {
  }
};

// src/core/pwc-children-observer-element.js
var PwcChildrenObserverElement = class extends PwcElement {
  static observeMode = "children";
  // "children" | "tree"
  connectedCallback() {
    super.connectedCallback();
    this._startChildrenObserver();
  }
  disconnectedCallback() {
    this._stopChildrenObserver();
    super.disconnectedCallback();
  }
  onChildrenChanged(_mutations) {
  }
  /** Run fn() without triggering onChildrenChanged for the resulting DOM mutations. */
  _withoutChildrenChangedNotification(fn) {
    fn();
    this._childrenObserver?.takeRecords();
  }
  _startChildrenObserver() {
    const mode = this.constructor.observeMode || "children";
    const subtree = mode === "tree";
    this._childrenObserver = new MutationObserver((mutations) => {
      if (!this.isConnected) return;
      this.onChildrenChanged(mutations);
    });
    this._childrenObserver.observe(this, { childList: true, subtree });
    this.onChildrenChanged([]);
  }
  _stopChildrenObserver() {
    if (!this._childrenObserver) return;
    this._childrenObserver.disconnect();
    this._childrenObserver = null;
  }
};

// src/core/utils.js
function defineOnce(name, classDef) {
  if (customElements.get(name)) return;
  customElements.define(name, classDef);
}

// src/zone-transfer/zone-transfer.js
var PwcZoneTransfer = class extends PwcChildrenObserverElement {
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
      if (!zone.hasAttribute("aria-label")) {
        const name = this._zoneName(zone);
        if (name) zone.setAttribute("aria-label", name);
      }
    }
    const active = items.find((it) => it.tabIndex === 0) || items[0] || null;
    for (const it of items) it.tabIndex = it === active ? 0 : -1;
    this._getOrCreateLiveRegion();
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
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    item.classList.add("pwc-zone-transfer-dragging");
    this._ensurePlaceholder(item);
  }
  _onDragOver(e) {
    if (!this._drag?.item) return;
    const zone = this._closestZone(e.target);
    if (!zone) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    this._ensurePlaceholder(this._drag.item);
    const beforeEl = this._beforeFromPointer(zone, e, this._drag.item);
    this._movePlaceholder(zone, beforeEl);
  }
  _onDrop(e) {
    if (!this._drag?.item) return;
    const zone = this._closestZone(e.target);
    if (!zone) return;
    e.preventDefault();
    this._applyMove(this._drag.item, this._drag.fromZone, zone, "drag");
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
    this._emitChange(item, zone, zone, this._indexInZone(item, zone), "keyboard");
  }
  _keyboardMoveToZone(item, zone) {
    const fromZone = this._closestZone(item);
    if (!fromZone || fromZone === zone) return;
    zone.appendChild(item);
    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    item.focus();
    this._emitChange(item, fromZone, zone, this._indexInZone(item, zone), "keyboard");
  }
  _zoneByHotkey(key) {
    const zones = this._zones();
    if (!zones.some((z) => z.hasAttribute("data-pwc-zone-hotkey"))) return null;
    return zones.find((z) => z.getAttribute("data-pwc-zone-hotkey") === key) || null;
  }
  _getOrCreateLiveRegion() {
    if (!this._liveRegion) {
      this._liveRegion = document.createElement("span");
      this._liveRegion.setAttribute("role", "status");
      this._liveRegion.setAttribute("aria-live", "assertive");
      this._liveRegion.setAttribute("aria-atomic", "true");
      Object.assign(this._liveRegion.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: "0"
      });
      this._withoutChildrenChangedNotification(() => this.appendChild(this._liveRegion));
    }
    return this._liveRegion;
  }
  _emitChange(item, fromZone, toZone, index, trigger) {
    if (trigger === "keyboard") {
      const region = this._getOrCreateLiveRegion();
      region.textContent = fromZone !== toZone ? this._zoneName(toZone) : `${index + 1}`;
    }
    this.dispatchEvent(
      new CustomEvent("pwc-zone-transfer:change", {
        bubbles: true,
        detail: {
          itemId: this._itemId(item),
          fromZone: this._zoneName(fromZone),
          toZone: this._zoneName(toZone),
          index,
          trigger
        }
      })
    );
  }
  _applyMove(item, fromZone, toZone, trigger) {
    if (this._placeholder?.parentNode === toZone) toZone.insertBefore(item, this._placeholder);
    else toZone.appendChild(item);
    for (const it of this._items()) it.tabIndex = it === item ? 0 : -1;
    this._emitChange(item, fromZone, toZone, this._indexInZone(item, toZone), trigger);
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
    return zoneEl.tagName.toLowerCase() === "pwc-zone-transfer-zone" ? zoneEl.getAttribute("name") || "" : zoneEl.getAttribute("data-pwc-zone") || "";
  }
  _itemId(itemEl) {
    if (!itemEl) return "";
    return itemEl.tagName.toLowerCase() === "pwc-zone-transfer-item" ? itemEl.getAttribute("id") || itemEl.getAttribute("data-id") || "" : itemEl.getAttribute("data-pwc-item") || itemEl.getAttribute("id") || "";
  }
  _indexInZone(itemEl, zoneEl) {
    return Math.max(0, this._items(zoneEl).indexOf(itemEl));
  }
};
function define() {
  defineOnce("pwc-zone-transfer", PwcZoneTransfer);
}

// src/zone-transfer/zone-transfer.css
var zone_transfer_default = 'pwc-zone-transfer [draggable="true"] {\n    cursor: grab;\n}\n\npwc-zone-transfer .pwc-zone-transfer-dragging {\n    cursor: grabbing;\n    opacity: 0.6;\n}\n\npwc-zone-transfer .pwc-zone-transfer-placeholder {\n    opacity: 0.3;\n}';

// src/zone-transfer/index.js
function register() {
  PwcZoneTransfer.registerCss(zone_transfer_default);
  define();
}
register();
export {
  register
};
