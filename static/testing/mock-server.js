/**
 * Register a Service Worker that intercepts fetch requests and delegates
 * to route handlers.  All lifecycle complexity is contained here — callers
 * just `await mockRoutes([{ path, handle }])`.
 *
 * Route paths are resolved relative to the page URL, so test files can
 * use short relative paths like `"./mock/basic"`.
 */

const SW_URL = new URL("../../mock-sw.js", import.meta.url).href;

/**
 * Clone an element from the current page and apply value/text changes.
 * Returns a text/html Response.
 *
 *   echoElement("#my-el", {
 *     values: { "#first": "Alice", "#color": "red" },
 *     texts:  { ".status": "OK" },
 *   })
 */
export function echoElement(selector, { values, texts } = {}) {
  const source = document.querySelector(selector);
  const doc = document.implementation.createHTMLDocument();
  // <template> elements store their DOM in .content, not as children
  if (source instanceof HTMLTemplateElement) {
    doc.body.appendChild(doc.importNode(source.content, true));
  } else {
    doc.body.innerHTML = source.outerHTML;
  }

  if (values) {
    for (const [sel, val] of Object.entries(values)) {
      doc.querySelector(sel)?.setAttribute("value", val);
    }
  }
  if (texts) {
    for (const [sel, text] of Object.entries(texts)) {
      const el = doc.querySelector(sel);
      if (el) el.textContent = text;
    }
  }

  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>${doc.body.innerHTML}</body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function mockRoutes(routes) {
  const reg = await navigator.serviceWorker.register(SW_URL);

  // Ensure the SW controls this page before setting up handlers.
  if (reg.installing || reg.waiting) {
    // New/updated SW is pending — wait for it to take over.
    await new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve,
        { once: true })
    );
  } else if (!navigator.serviceWorker.controller) {
    // After shift-reload the page is uncontrolled even though the SW is
    // active.  A simple claim is not enough — sub-resource fetches
    // (iframe navigations) still bypass the SW.  Soft-reload so the
    // page loads properly under SW control.
    reg.active.postMessage({ type: "claim" });
    await new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve,
        { once: true })
    );
    location.reload();
    await new Promise(() => {}); // halt until reload
  }

  // Resolve route paths relative to the page and register them with the SW.
  // Fire-and-forget postMessage — no ack, cannot hang.
  const resolved = routes.map((r) => ({
    ...r,
    absPath: new URL(r.path, location.href).pathname,
  }));
  navigator.serviceWorker.controller.postMessage({
    type: "set-routes",
    paths: resolved.map((r) => r.absPath),
  });

  // Listen for the SW forwarding intercepted requests
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type !== "mock-request") return;

    const { url, method } = e.data;
    const pathname = new URL(url).pathname;
    const route = resolved.find((r) => r.absPath === pathname);

    if (route) {
      const request = new Request(url, { method });
      Promise.resolve(route.handle(request)).then(async (response) => {
        e.ports[0].postMessage({
          type: "mock-response",
          body: await response.text(),
          status: response.status,
          headers: Object.fromEntries(response.headers),
        });
      });
    }
  });
}
