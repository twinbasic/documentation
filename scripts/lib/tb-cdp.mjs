// Minimal Chrome DevTools Protocol client over Node's global WebSocket.
//
// Deliberately not puppeteer, for one reason that matters here: a pending
// javascript dialog blocks the renderer, and puppeteer's connect() handshake
// talks to the renderer, so it hangs on exactly the IDE state you most need to
// recover from. Browser-process commands -- `Page.handleJavaScriptDialog`
// among them -- keep working on a raw connection.
//
// Used by scripts/lib/tb-ide.mjs. See WIP.Harness.md, "Compiling a twinBASIC
// project without the IDE in front of you".

/**
 * Attach to a DevTools page target.
 *
 * Every call has a time limit. A page blocked by a javascript dialog, or inside
 * a synchronous host call, never answers `Runtime.evaluate` or an input event,
 * and without a limit the caller waits forever, with nothing on screen to say
 * why. A call that runs out rejects with a sentence saying so; a connection
 * that closes rejects everything still waiting on it at once.
 *
 * @param {number} port  the --remote-debugging-port the target was started with
 * @param {string} match substring the target URL must contain
 * @param {object} [o]
 * @param {number} [o.timeout]  milliseconds a call may take (default 30000); one
 *                              call can pass its own
 */
export async function attach(port, match = "main.htm", { timeout = 30 * 1000 } = {}) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`,
    { signal: AbortSignal.timeout(10 * 1000) })).json();
  const t = list.find((x) => x.type === "page" && x.url.includes(match));
  if (!t) throw new Error(`no page target matching ${JSON.stringify(match)} on port ${port}`);

  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error(`the DevTools socket on port ${port} did not open`)),
                             10 * 1000);
    ws.onopen = () => { clearTimeout(timer); res(); };
    ws.onerror = (e) => { clearTimeout(timer); rej(e); };
  });

  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    } else if (m.method) {
      for (const l of listeners) l(m);
    }
  };
  ws.onclose = () => {
    for (const { rej } of pending.values()) rej(new Error("the DevTools connection closed"));
    pending.clear();
  };

  const send = (method, params = {}, { timeout: ms = timeout } = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      const timer = setTimeout(() => {
        pending.delete(i);
        rej(new Error(`${method} had no answer in ${ms / 1000} s -- the page may be blocked ` +
                      "by a javascript dialog or a synchronous host call"));
      }, ms);
      timer.unref?.();
      pending.set(i, {
        res: (v) => { clearTimeout(timer); res(v); },
        rej: (e) => { clearTimeout(timer); rej(e); },
      });
      try {
        ws.send(JSON.stringify({ id: i, method, params }));
      } catch {
        pending.delete(i);
        clearTimeout(timer);
        rej(new Error("the DevTools connection is closed"));
      }
    });

  const evaluate = async (expression, { awaitPromise = false, timeout: ms = timeout } = {}) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise },
                         { timeout: ms });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description ??
        JSON.stringify(r.exceptionDetails));
    }
    return r.result.value;
  };

  return {
    url: t.url,
    send,
    evaluate,
    on: (fn) => listeners.push(fn),
    close: () => ws.close(),
  };
}
