import { startServer } from "./server.mjs";

const { baseUrl } = await startServer({ port: 5123 });
console.log(baseUrl);