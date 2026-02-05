import express from "express";

export function attach(router, ctx) {
  // Serve everything in test/ as static assets
  router.use(express.static(ctx.testRootAbs, { etag: false, maxAge: 0 }));

  // Optional dynamic endpoints under /api
  // router.get("/api/...", (req, res) => { ... });
}