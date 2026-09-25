import { registerHooks } from "node:module";

// Next supplies this marker in production; use its empty server implementation in Node tests.
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "server-only"
      ? "next/dist/compiled/server-only/empty.js"
      : specifier, context);
  },
});
