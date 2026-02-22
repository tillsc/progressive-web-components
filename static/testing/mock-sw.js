const paths = [];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (e) => {
  const port = e.ports[0];
  if (e.data.type === "set-routes") {
    paths.length = 0;
    paths.push(...e.data.paths);
    port?.postMessage({ type: "ack" });
  }
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (!paths.includes(url.pathname)) return;

  // Forward to the page, which holds the actual handler logic
  e.respondWith(
    (async () => {
      const client = await self.clients.get(e.clientId);
      if (!client) return fetch(e.request);

      return new Promise((resolve) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = (msg) => {
          const { body, status, headers } = msg.data;
          resolve(new Response(body, { status, headers }));
        };
        client.postMessage(
          { type: "mock-request", url: e.request.url, method: e.request.method },
          [ch.port2]
        );
      });
    })()
  );
});
