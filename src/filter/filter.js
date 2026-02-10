import {defineOnce} from "../core/utils.js";
import { BaseFilter } from "./base.js";

export class PwcFilter extends BaseFilter {

}

export function define() {
  defineOnce("pwc-filter", PwcFilter);
}