// Pages for a tool window's frame: a server on localhost for them, and the
// frame read back through the IDE page's DevTools connection. Used by
// panes.test.mjs and help.test.mjs.

import http from "node:http";

/**
 * Serves `handler` on one port of both loopback addresses, since the frame may
 * resolve localhost to either. A port whose IPv6 side something else holds is
 * given up for another, so that no request can reach a stranger's server.
 *
 * @param {http.RequestListener} handler
 * @returns {Promise<{ port: number, close: () => void }>}
 */
export async function serveLoopback(handler) {
  const listen = (host, port) =>
    new Promise((resolve, reject) => {
      const s = http.createServer(handler);
      s.once("error", reject);
      s.listen(port, host, () => resolve(s));
    });
  for (let tries = 0; tries < 5; tries++) {
    const v4 = await listen("127.0.0.1", 0);
    const port = v4.address().port;
    try {
      const v6 = await listen("::1", port);
      return {
        port,
        close: () => {
          v4.close();
          v6.close();
        },
      };
    } catch (e) {
      if (e.code === "EADDRNOTAVAIL" || e.code === "EAFNOSUPPORT") {
        return { port, close: () => v4.close() }; // no IPv6 loopback at all
      }
      v4.close();
    }
  }
  throw new Error("no loopback port was free on both IPv4 and IPv6");
}

/**
 * The IDE page's child frame whose URL starts with `origin`, as
 * Page.getFrameTree gives it ({ id, url, urlFragment, ... }), or null. A frame
 * on another site is not in the tree: it has a DevTools target of its own.
 */
export async function frameOf(c, origin) {
  const tree = await c.send("Page.getFrameTree");
  return (tree.frameTree.childFrames ?? []).map((f) => f.frame).find((f) => f.url.startsWith(origin)) ?? null;
}

/**
 * `expression` evaluated in that frame's document, in an isolated world of the
 * test's own so that nothing of the page's script is touched.
 */
export async function frameEval(c, origin, expression) {
  const frame = await frameOf(c, origin);
  if (!frame) throw new Error(`no frame on ${origin}`);
  const { executionContextId } = await c.send("Page.createIsolatedWorld", {
    frameId: frame.id,
    worldName: "addin-test",
  });
  const r = await c.send("Runtime.evaluate", { expression, contextId: executionContextId, returnByValue: true });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
