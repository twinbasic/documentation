// Server-sent events: a channel that pages hold open with an EventSource, and that the
// server writes events to. builder/serve.mjs sends its live-reload over one; the
// screenshot review tool sends a run's progress over another.

/**
 * A new channel: {handle(req, res), send(event, data), close(), size}. `handle` answers a
 * request with the event stream and keeps it until the page goes; `send` writes one event
 * to every page holding the channel, `data` a string (one line) or any value, sent as its
 * JSON; `close` ends every stream. A comment goes to each page every 30 seconds, so that
 * nothing between the two ends it as idle.
 */
export function createSseChannel() {
  const clients = new Set();
  const write = (res, text) => {
    try {
      res.write(text);
    } catch {}
  };
  return {
    handle(req, res) {
      res.statusCode = 200;
      res.setHeader("content-type", "text/event-stream");
      res.setHeader("cache-control", "no-store");
      res.setHeader("connection", "keep-alive");
      res.write(": connected\n\n");
      clients.add(res);
      const keepalive = setInterval(() => write(res, ": keepalive\n\n"), 30000);
      req.on("close", () => {
        clearInterval(keepalive);
        clients.delete(res);
      });
    },
    send(event, data) {
      const text = typeof data === "string" ? data : JSON.stringify(data);
      for (const res of clients) write(res, `event: ${event}\ndata: ${text}\n\n`);
    },
    close() {
      for (const res of clients) {
        try {
          res.end();
        } catch {}
      }
      clients.clear();
    },
    get size() {
      return clients.size;
    },
  };
}
