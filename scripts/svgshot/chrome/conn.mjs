// The connection to a tab, through chrome.debugger: what capture.mjs's collectBundle and
// annotate.mjs are given in place of lib/tb-cdp.mjs's socket, with the same send and evaluate.

const PROTOCOL = "1.3";

/** Attaches to the tab `tabId`: {send, evaluate, detach}. */
export async function attachDebugger(tabId) {
  const target = { tabId };
  await chrome.debugger.attach(target, PROTOCOL);
  const send = (method, params = {}, { timeout = 30 * 1000 } = {}) =>
    new Promise((res, rej) => {
      const timer = setTimeout(
        () => rej(new Error(`${method} had no answer in ${timeout / 1000} s -- is the tab showing?`)),
        timeout,
      );
      // A member that is undefined is left out, as JSON leaves it out on a socket.
      chrome.debugger
        .sendCommand(target, method, JSON.parse(JSON.stringify(params)))
        .then(
          (result) => res(result ?? {}),
          (e) => rej(new Error(`${method}: ${e.message ?? e}`)),
        )
        .finally(() => clearTimeout(timer));
    });
  const evaluate = async (expression, { awaitPromise = false, timeout } = {}) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise }, { timeout });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
    }
    return r.result.value;
  };
  return { send, evaluate, detach: () => chrome.debugger.detach(target).catch(() => {}) };
}
