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
// undefined, and an empty targetArchitectureMemory reads as "unknown". Not here, and
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

/**
 * Start hooking the IDE whose WebView2 profile is `profile`, from before it has started.
 * The file is polled every 5 ms: launchIde's own poll is at 100 ms and answers too late.
 *
 * @param {object} o
 * @param {string} o.profile  the IDE's WEBVIEW2_USER_DATA_FOLDER
 * @param {number} o.since    when it was started; a DevToolsActivePort older than 2 s before is left over
 * @returns {{ error: Error | null, closed: Promise<void>, stop: () => void }}
 *   `error` is why no hook was installed (set once known); `stop` ends the polling and closes the
 *   connection, and is called when the IDE ends or fails to start. A hook that was installed leaves
 *   the page's `window.__tbDefaults`, which attachIde checks.
 */
export function installDefaultsHook({ profile, since }) {
  const hook = { error: null, closed: null, stop: () => {} };
  let stopped = false;
  let client = null;
  hook.stop = () => {
    stopped = true;
    client?.close();
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
    const source = hookSource();
    const prepare = async ({ sessionId, targetInfo }) => {
      try {
        if (targetInfo.type === "page") {
          await client.send("Page.enable", {}, { sessionId });
          await client.send("Page.addScriptToEvaluateOnNewDocument", { source }, { sessionId });
        }
      } finally {
        // A target left paused never loads; one that is gone answers with an error.
        await client.send("Runtime.runIfWaitingForDebugger", {}, { sessionId }).catch(() => {});
      }
    };
    client.on((m) => {
      if (m.method === "Target.attachedToTarget") prepare(m.params).catch(() => {});
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
  })().catch((e) => {
    if (!stopped) hook.error = e;
  });
  return hook;
}

/**
 * Whether the main page ran the hook, and if it did not, one reload, which the hook's session
 * has the script waiting for: the page was hooked after its document had begun (about 1 launch
 * in 50 on the dev box). Throws when it still did not, since the IDE would have the user's
 * settings. Called by attachIde on a connection to the page.
 *
 * @param {{ evaluate: Function, send: Function }} c  the connection
 * @param {{ error: Error | null }} hook
 */
export async function checkDefaults(c, hook) {
  const ran = () => c.evaluate("!!window.__tbDefaults").catch(() => false);
  if (await ran()) return;
  if (hook.error) throw new Error(`the IDE's settings were not made the defaults: ${hook.error.message}`);
  await c.send("Page.reload", {});
  for (let i = 0; i < 400; i++) {
    await wait(50);
    if (await ran()) return;
  }
  throw new Error(
    "the IDE's settings were not made the defaults: its page ran no hook, even after a reload " +
      "(it would have the user's settings; userSettings: true is the opt-out)",
  );
}
