const routes = new Set();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (e) => {
  if (e.data?.type === "claim") self.clients.claim();
  if (e.data?.type === "set-routes") {
    e.data.paths.forEach((p) => routes.add(p));
  }
});

self.addEventListener("fetch", (e) => {
  if (!routes.has(new URL(e.request.url).pathname)) return;

  e.respondWith(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window" });
      if (allClients.length === 0) return fetch(e.request);

      // Broadcast to all window clients; the one with a matching route
      // handler responds, iframes/others simply ignore the message.
      return new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) { done = true; resolve(fetch(e.request)); }
        }, 5000);

        for (const client of allClients) {
          const ch = new MessageChannel();
          ch.port1.onmessage = (msg) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            const { body, status, headers } = msg.data;
            resolve(new Response(body, { status, headers }));
          };
          client.postMessage(
            { type: "mock-request", url: e.request.url, method: e.request.method },
            [ch.port2]
          );
        }
      });
    })()
  );
});
