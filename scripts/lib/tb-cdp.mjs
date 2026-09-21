// Minimal Chrome DevTools Protocol client over Node's global WebSocket.
//
// Deliberately not puppeteer, for one reason that matters here: a pending
// javascript dialog blocks the renderer, and puppeteer's connect() handshake
// talks to the renderer, so it hangs on exactly the IDE state you most need to
// recover from. Browser-process commands -- `Page.handleJavaScriptDialog`
// among them -- keep working on a raw connection.
//
// Used by scripts/tbbuild.mjs. See WIP.md, "Compiling a twinBASIC project
// without the IDE in front of you".

/**
 * Attach to a DevTools page target.
 *
 * @param {number} port  the --remote-debugging-port the target was started with
 * @param {string} match substring the target URL must contain
 */
export async function attach(port, match = "main.htm") {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const t = list.find((x) => x.type === "page" && x.url.includes(match));
  if (!t) throw new Error(`no page target matching ${JSON.stringify(match)} on port ${port}`);

  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

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

  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  const evaluate = async (expression, { awaitPromise = false } = {}) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
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
