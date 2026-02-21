/** W3C Context Protocol event. Carries a context name and a synchronous callback. */
class ContextRequestEvent extends Event {
  constructor(context, callback) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
  }
}

/** Request a named value via Context Protocol, falling back to `window.PWC[name]`. */
export function requestContext(element, name) {
  let value;
  element.dispatchEvent(new ContextRequestEvent(name, (v) => { value = v; }));
  return value ?? window.PWC?.[name];
}
