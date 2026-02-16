import { PwcChildrenObserverElement } from "../core/pwc-children-observer-element.js";
import { defineOnce } from "../core/utils.js";

class ConditionalDisplayBase extends PwcChildrenObserverElement {
  static observeMode = "tree";
  static observedAttributes = ["selector", "value"];

  attributeChangedCallback(name) {
    switch (name) {
      case "selector":
        this._resolveInput();
        break;
      case "value": {
        const value = this.getAttribute('value');
        this._values = value ? value.split(',') : [];
        break;
      }
      default: {
        return; // Don't update when nothing relevant changed
      }
    }
    if (this.isConnected) this._update();
  }

  onChildrenChanged() {
    this._resolveInput();
    this._update();
  }

  onDisconnect() {
    this._unbindChangeEvent();
  }

  _onChange = () => this._update();

  _unbindChangeEvent() {
    if (this._changeEventTarget) {
      this._changeEventTarget.removeEventListener('change', this._onChange);
      this._changeEventTarget = null;
    }
  }

  _resolveInput() {
    this._unbindChangeEvent();
    const selector = this.getAttribute('selector');
    this._input = selector ? document.querySelector(selector) : null;
    if (this._input) {
      this._changeEventTarget = this._input.type === 'radio'
        ? this._input.closest('form') || document
        : this._input;
      this._changeEventTarget.addEventListener('change', this._onChange);
    } else if (selector) {
      console.warn(`<${this.localName}>: No element matches selector "${selector}"`);
    }
  }

  _getInputValue() {
    if (!this._input) return undefined;

    if (this._input.type === 'radio') {
      const name = this._input.name;
      const form = this._input.closest('form');
      if (form) return form.elements[name]?.value;
      const checked = document.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
      return checked ? checked.value : undefined;
    }

    if (this._input.type === 'checkbox') {
      return this._input.checked ? this._input.value : undefined;
    }

    return this._input.value;
  }

  get _isActive() {
    if (this._input?.type === 'checkbox' && !this._values?.length) {
      return this._input.checked;
    }
    const currentValue = this._getInputValue();
    return this._values?.includes(currentValue != null ? String(currentValue) : "undefined");
  }

  _update() {
    if (!this._input) return;
    this._apply(this._isActive);
  }

  _setVisible(visible) {
    if (visible) {
      this.removeAttribute('hidden');
      for (const el of this.querySelectorAll('input, select, textarea')) {
        if (el.hasAttribute('data-pwc-temporarily-disabled')) {
          el.removeAttribute('data-pwc-temporarily-disabled');
          el.removeAttribute('disabled');
        }
      }
    } else {
      this.setAttribute('hidden', '');
      for (const el of this.querySelectorAll('input, select, textarea')) {
        if (!el.disabled) {
          el.setAttribute('disabled', '');
          el.setAttribute('data-pwc-temporarily-disabled', '');
        }
      }
    }
  }

  _setEnabled(enabled) {
    if (enabled) {
      for (const el of this.querySelectorAll('input, select, textarea')) {
        if (el.hasAttribute('data-pwc-temporarily-disabled')) {
          el.removeAttribute('data-pwc-temporarily-disabled');
          el.removeAttribute('disabled');
        }
      }
    } else {
      for (const el of this.querySelectorAll('input, select, textarea')) {
        if (!el.disabled) {
          el.setAttribute('disabled', '');
          el.setAttribute('data-pwc-temporarily-disabled', '');
        }
      }
    }
  }

  _apply(_isActive) {}
}

export class PwcShownIf extends ConditionalDisplayBase {
  _apply(isActive) { this._setVisible(isActive); }
}

export class PwcHiddenIf extends ConditionalDisplayBase {
  _apply(isActive) { this._setVisible(!isActive); }
}

export class PwcEnabledIf extends ConditionalDisplayBase {
  _apply(isActive) { this._setEnabled(isActive); }
}

export class PwcDisabledIf extends ConditionalDisplayBase {
  _apply(isActive) { this._setEnabled(!isActive); }
}

export function define() {
  defineOnce("pwc-shown-if", PwcShownIf);
  defineOnce("pwc-hidden-if", PwcHiddenIf);
  defineOnce("pwc-enabled-if", PwcEnabledIf);
  defineOnce("pwc-disabled-if", PwcDisabledIf);
}
