// The IDE with its default settings, whatever the user's own IDE saved.
//
// The IDE reads its per-user settings (options, panel layouts, keyboard groups, ...)
// through `hostAppObject.GetIDESetting(key)`. IDE_FLAGS (tb-ide.mjs) stop it writing them,
// and nothing stops it reading them: a font size the owner changed in their own IDE showed
// in every IDE the tools started. So each IDE a tool starts is answered "no saved value" for
// those keys, in the page only. The registry is never written. try-help-addin, which is the
// user's own IDE in all but its project, keeps its settings (`userSettings` of launchIde).
// WIP.Harness.md, "Default settings, whatever the user saved", says why it is built this way.
//
// A script has to run before main.js reads the settings, and main.htm is not loaded when
// the IDE has started: the IDE's browser process writes DevToolsActivePort, main.htm
// commits some 0.2 to 0.8 s after. So installDefaultsHook, started before the IDE is, waits
// for the file, connects to the *browser* target and auto-attaches to every target the
// browser creates, paused (waitForDebuggerOnStart); each page gets a script that runs at its
// document's start (Page.addScriptToEvaluateOnNewDocument), and is resumed. The script puts
// a setter on window.hostAppObject, which main2.js assigns, to wrap the host object. The
// connection stays open for the IDE's life: the script is the session's, and a page that
// reloads is hooked again only while it is.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { connect } from "./tb-cdp.mjs";

// The keys answered with no saved value, and the answer each takes. GENERAL and GENERAL2 are
// parsed as the options' objects, and "" in their place is the first run's mark: the IDE then
// opens its Options dialog and goes no further. The others take "" as a fresh install's
// answer: JSON.parse fails inside a try and the variable keeps its default, parseJson gives
// undefined, an empty targetArchitectureMemory reads as "unknown", and the Object Browser
// (OBJECT_BROWSER, BETA 1023) and the New / Open Project dialog's section (NEWFRONTPAGE, BETA
// 1033) test the length first and keep their defaults. Not here, and
// answered from the registry: the licence's keys, LICENCEAGREEMENTV3, ALLOWERRORREPORTINGV3,
// PUBLISHER and NEWYEAR_*, which are not settings of how the IDE looks.
export const BLANKED_KEYS = {
  GENERAL: "{}",
  GENERAL2: "{}",
  LAYOUT: "",
  LAYOUTv2: "",
  CUSTOM_PANEL_LAYOUTS: "",
  ACTIVE_PANEL_LAYOUT_NAME: "",
  CUSTOM_KEYBOARD_SHORTCUT_GROUPS: "",
  ACTIVE_KEYBOARD_SHORTCUT_GROUPS: "",
  WEBPANEL_SETTINGS: "",
  FORMS_windowsPalette: "",
  targetArchitectureMemory: "",
  OBJECT_BROWSER: "",
  NEWFRONTPAGE: "",
};

// Runs in the page, in every document of the IDE's browser; only main.htm does anything.
// `window.__tbDefaults` is the marker that it ran, and its `keys` the keys it answered
// (never their values). Every function of the host object is bound to the real object: the
// proxy of a WebView2 host object refuses to be called with another `this`.
export function pageHook(answers) {
  if (!/main\.htm$/i.test(location.pathname)) return;
  const marker = { keys: [] };
  window.__tbDefaults = marker;
  let real;
  const wrap = (host) =>
    new Proxy(host, {
      get(target, name) {
        const member = target[name];
        if (typeof member !== "function") return member;
        if (name !== "GetIDESetting") return (...a) => member.apply(target, a);
        return (...a) => {
          const key = String(a[0]);
          if (!Object.hasOwn(answers, key)) return member.apply(target, a);
          marker.keys.push(key);
          return Promise.resolve(answers[key]);
        };
      },
    });
  Object.defineProperty(window, "hostAppObject", {
    configurable: true,
    enumerable: true,
    get: () => real,
    set: (v) => {
      real = v ? wrap(v) : v;
    },
  });
}

export const hookSource = () => `(${pageHook})(${JSON.stringify(BLANKED_KEYS)})`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// How long checkDefaults waits for the hook to be installed before it reloads the page.
const READY_LIMIT = 60 * 1000;

// How long checkDefaults waits for the page it attached to to commit main.htm.
const MAIN_LIMIT = 60 * 1000;

// Runs in the page: whether its document is main.htm yet, and whether the hook's script ran in it.
const LOOK = "({ main: /main\\.htm$/i.test(location.pathname), ran: !!window.__tbDefaults })";

/**
 * Start hooking the IDE whose WebView2 profile is `profile`, from before it has started.
 * The file is polled every 5 ms: launchIde's own poll is at 100 ms and answers too late.
 *
 * @param {object} o
 * @param {string} o.profile  the IDE's WEBVIEW2_USER_DATA_FOLDER
 * @param {number} o.since    when it was started; a DevToolsActivePort older than 2 s before is left over
 * @returns {{ error: Error | null, closed: Promise<void>, ready: Promise<void>, stop: () => void }}
 *   `error` is why no hook was installed (set once known); `failures` the pages it could not
 *   prepare; `ready` settles once the hook is installed with every page then known prepared,
 *   has failed or was stopped; `stop` ends the polling and closes the
 *   connection, and is called when the IDE ends or fails to start. A hook that was installed leaves
 *   the page's `window.__tbDefaults`, which attachIde checks.
 */
export function installDefaultsHook({ profile, since }) {
  let markReady;
  const hook = {
    error: null,
    failures: [],
    trace: [],
    closed: null,
    ready: new Promise((r) => (markReady = r)),
    stop: () => {},
  };
  // What the hook did, with its time since `since`, for the error checkDefaults throws.
  const note = (what) => hook.trace.push(`${((Date.now() - since) / 1000).toFixed(1)} s ${what}`);
  let stopped = false;
  let client = null;
  hook.stop = () => {
    stopped = true;
    client?.close();
    markReady();
  };
  hook.closed = (async () => {
    const file = path.join(profile, "EBWebView", "DevToolsActivePort");
    const until = Date.now() + 60 * 1000;
    let port;
    let wsPath;
    while (!stopped) {
      try {
        if (statSync(file).mtimeMs >= since - 2000) {
          const [a, b] = readFileSync(file, "utf8").split(/\r?\n/);
          if (Number(a) > 0 && b) {
            port = Number(a);
            wsPath = b;
            break;
          }
        }
      } catch {
        // not written yet
      }
      if (Date.now() > until) throw new Error("the IDE wrote no DevToolsActivePort in a minute");
      await wait(5);
    }
    if (stopped) return;
    client = await connect(`ws://127.0.0.1:${port}${wsPath}`, { what: `the IDE's browser on port ${port}` });
    note("connected");
    client.onClose(() => note("the connection closed"));
    const source = hookSource();
    // Every page prepared while the hook is set up, which `ready` waits for. A page that existed
    // before the auto-attach (the case checkDefaults reloads for) is attached by setAutoAttach
    // itself and prepared from its event: a reload before its script is added loads it unhooked
    // again, as a shoot_docs run of ten IDEs at once did on BETA 1033.
    const preparing = [];
    const prepare = async ({ sessionId, targetInfo, waitingForDebugger }) => {
      try {
        if (targetInfo.type === "page") {
          const page = `${targetInfo.url || "a page"}${waitingForDebugger ? ", paused" : ""}`;
          note(`attached ${page}`);
          await client.send("Page.enable", {}, { sessionId });
          await client.send("Page.addScriptToEvaluateOnNewDocument", { source }, { sessionId });
          note(`prepared ${page}`);
        }
      } finally {
        // A target left paused never loads; one that is gone answers with an error.
        await client.send("Runtime.runIfWaitingForDebugger", {}, { sessionId }).catch(() => {});
      }
    };
    client.on((m) => {
      if (m.method !== "Target.attachedToTarget") return;
      const { targetInfo } = m.params;
      preparing.push(
        prepare(m.params).catch((e) => {
          if (targetInfo.type === "page") hook.failures.push(`${targetInfo.url || "a page"}: ${e.message}`);
        }),
      );
    });
    await client.send("Target.setDiscoverTargets", { discover: true });
    await client.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    // A page that existed before the auto-attach is hooked late, when the document is still
    // to commit; if it has, the reload attachIde does picks the script up.
    const { targetInfos } = await client.send("Target.getTargets");
    for (const t of targetInfos.filter((x) => x.type === "page" && !x.attached)) {
      const { sessionId } = await client.send("Target.attachToTarget", { targetId: t.targetId, flatten: true });
      await prepare({ sessionId, targetInfo: t });
    }
    await Promise.all(preparing);
    note("ready");
  })()
    .catch((e) => {
      if (!stopped) hook.error = e;
    })
    .finally(() => markReady());
  return hook;
}

/**
 * Whether the main page ran the hook, and if it did not, one reload, which the hook's session
 * and this connection have the script waiting for: the page was hooked after its document had
 * begun (about 1 launch in 50 on the dev box). Throws when it still did not, since the IDE would
 * have the user's settings, saying what the page, the check and the hook did. Called by
 * attachIde on a connection to the page.
 *
 * @param {{ evaluate: Function, send: Function }} c  the connection
 * @param {{ error: Error | null }} hook
 */
export async function checkDefaults(c, hook) {
  let lastError = null;
  const look = () =>
    c.evaluate(LOOK).catch((e) => {
      lastError = e.message;
      return { main: false, ran: false };
    });
  let seen = await look();
  if (seen.ran) return;
  const begun = Date.now();
  const steps = [];
  const step = (what) => steps.push(`${((Date.now() - begun) / 1000).toFixed(1)} s ${what}`);
  const fail = (what) => fails(c, hook, what, steps, lastError);
  step("no marker");
  // attachIde attaches to the page listed as main.htm, which it is while its navigation there is
  // still pending: the document is about:blank, and a reload loads that again and cancels the
  // navigation, so the page stays blank (a shoot_docs run of 16 IDEs at once on BETA 1033). The
  // check waits for main.htm to commit, and its document may then have run the hook after all.
  if (!seen.main) {
    for (const until = Date.now() + MAIN_LIMIT; !seen.main && Date.now() < until; ) {
      await wait(50);
      seen = await look();
    }
    if (!seen.main) {
      step("main.htm still not committed");
      throw await fail("its page never loaded main.htm");
    }
    step("main.htm committed");
    if (seen.ran) return;
  }
  const ran = async () => (await look()).ran;
  // The hook connects on its own, and on a busy machine (ten jobs at once) it can still be on
  // its way: a reload before it has attached loads the page unhooked again, and the hook then
  // attaches to a page whose document has committed. So the reload waits for it.
  let timer;
  await Promise.race([hook.ready, new Promise((r) => (timer = setTimeout(r, READY_LIMIT)))]);
  clearTimeout(timer);
  if (hook.error) throw new Error(`the IDE's settings were not made the defaults: ${hook.error.message}`);
  step("the hook ready");
  if (await ran()) return;
  // The script is added on this connection too, which stays open while the page reloads, so the
  // reload is hooked whatever became of the hook's own session: a shoot_docs run of ten IDEs at
  // once on BETA 1033 still reloaded a page unhooked once the hook waited for its pages.
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: hookSource() }).then(
    () => step("the script added to the page"),
    (e) => step(`adding the script to the page failed: ${e.message}`),
  );
  await c.send("Page.reload", {});
  step("reloaded");
  for (let i = 0; i < 400; i++) {
    await wait(50);
    if (await ran()) return;
  }
  step("still no marker");
  throw await fail("its page ran no hook, even after a reload");
}

// The error checkDefaults throws: `what` went wrong, and what the page, the check and the hook did.
async function fails(c, hook, what, steps, lastError) {
  const page = await c
    .evaluate("location.href + ', ' + document.readyState")
    .then((s) => `the page is ${s}`)
    .catch((e) => `the page answers nothing: ${e.message}`);
  const failed = hook.failures?.length ? `; preparing a page failed: ${hook.failures.join("; ")}` : "";
  return new Error(
    `the IDE's settings were not made the defaults: ${what} ` +
      `(it would have the user's settings; userSettings: true is the opt-out)${failed}; ${page}` +
      `${lastError ? `; the last check failed: ${lastError}` : ""}; the check: ${steps.join(", ")}` +
      `${hook.trace?.length ? `; the hook: ${hook.trace.join(", ")}` : ""}`,
  );
}
