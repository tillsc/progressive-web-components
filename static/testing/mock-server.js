/**
 * Register a Service Worker that intercepts fetch requests and delegates
 * to route handlers.  All lifecycle complexity is contained here — callers
 * just `await mockRoutes([{ path, handle }])`.
 */

const SW_URL = "/static/testing/mock-sw.js";

function sendMessage(sw, data) {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => resolve(e.data);
    sw.postMessage(data, [ch.port2]);
  });
}

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
  const doc = document.implementation.createHTMLDocument();
  doc.body.innerHTML = document.querySelector(selector).outerHTML;

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
  await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;

  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve,
        { once: true })
    );
  }

  const ctrl = navigator.serviceWorker.controller;

  // Serialize route definitions: extract paths, store handlers locally,
  // let the SW know which paths to intercept.  On fetch the SW asks back
  // via MessageChannel and we run the handler here on the page.
  const paths = routes.map((r) => r.path);
  await sendMessage(ctrl, { type: "set-routes", paths });

  // Listen for the SW forwarding intercepted requests
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type !== "mock-request") return;

    const { url, method } = e.data;
    const parsed = new URL(url);
    const route = routes.find((r) => parsed.pathname === r.path);

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
