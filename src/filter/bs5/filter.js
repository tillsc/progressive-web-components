import { BaseFilter } from "../base.js";
import { defineOnce } from "../../core/utils.js";

export class PwcFilterBs5 extends BaseFilter {
  _createInput() {
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = this.getAttribute("placeholder") || "Search…";
    input.classList.add("form-control");

    const wrapper = document.createElement("div");
    wrapper.className = "mb-2";
    wrapper.appendChild(input);

    return { wrapper, input };
  }
}

export function define() {
  defineOnce("pwc-filter-bs5", PwcFilterBs5);
}