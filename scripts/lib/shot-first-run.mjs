// What keeps a first start's dialogs from the user's registry, for shoot_docs.mjs.
//
// The IDE reads --no-save-ide-settings in parseCommandLine, after the first-run questions, so
// while the licence agreement, the error-reporting question and the first-run IDE Options are
// showing the flag is not set, and each writes the user's IDESettings: LICENCEAGREEMENTV3 on I
// AGREE, ALLOWERRORREPORTINGV3 the moment the question opens, GENERAL the moment the Options open.
// The defaults hook (tb-defaults.mjs) drops the saves of the keys it answers, which are not those
// of the licence. So a page that shows those dialogs runs over a guard of its own, put in at the
// document's start (Page.addScriptToEvaluateOnNewDocument) and the page reloaded:
//
//   * It stands in front of the hook, on window.hostAppObject, by defineProperty: an assignment
//     would go to the hook's setter. The hook's script runs first, because it was added first; a
//     guard that ran before it would be replaced, `inFront` stays false, and no first-run key is
//     answered, so the page starts as any other and shoot_docs stops.
//   * It answers the first-run keys, and records and blocks every SaveIDESetting by its key (a
//     value is never kept) and every other call that writes or that ends the IDE.
//   * A second proxy stands under the hook, on the host object itself, and records any of those
//     calls that reached it in `through`, and drops it too. The record of a run is that list and
//     the counts of what was blocked; shoot_docs fails on any entry in `through`.
//   * The Recent lists are the hook's to answer, empty here, so no path of the user's comes into
//     the page.
//
// An answer comes after a real call to the host. The page's theme files are read by host calls
// made before GENERAL is asked for, so the host answers them first, and a first start draws its
// dialogs in the theme. An answer made in the page alone overtakes them: buildThemeData then finds
// no theme, and the dialogs are drawn with no frame and no background, which no first start shows.
// LICENCEAGREEMENTV3 is the call made: the hook leaves it to the host, and its value is dropped.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { IDE_SETTINGS_KEY } from "./tb-registry.mjs";

// What the page reads for a first start: the three keys a new machine does not have. GENERAL
// is "", not the hook's "{}": "" is what makes it a first start.
export const FIRST_RUN = { GENERAL: "", LICENCEAGREEMENTV3: "", ALLOWERRORREPORTINGV3: "" };

// What the page reads for a start past those dialogs: agreed, and reporting off, so that a page
// left between the shots reports nothing. Made-up dates; neither is saved.
export const SETTLED = { LICENCEAGREEMENTV3: "AGREED_01-JAN-2026", ALLOWERRORREPORTINGV3: "DISAGREED_01-JAN-2026" };

// Runs in the page, in every document of the IDE's browser; only main.htm does anything.
function pageGuard(cfg) {
  if (!/main\.htm$/i.test(location.pathname)) return;
  if (window.__shotGuard) return;
  const G = (window.__shotGuard = {
    gen: cfg.gen,
    hook: !!window.__tbDefaults,
    inFront: false,
    blocked: {},
    through: [],
  });
  // The calls of the host object that write something or end the IDE.
  const STOPPED = new Set([
    "SaveIDESetting",
    "SaveProjectMetaState",
    "AddRecentsList",
    "RemoveRecentsList",
    "ChangeWindowSetting",
    "Shell",
    "Exit",
    "CloseWindow",
  ]);
  const stopped =
    (name) =>
    (...a) => {
      const what = name === "SaveIDESetting" ? `SaveIDESetting ${String(a[0])}` : name;
      G.blocked[what] = (G.blocked[what] ?? 0) + 1;
      return Promise.resolve(undefined);
    };
  const under = (host) =>
    new Proxy(host, {
      get(target, name) {
        const member = target[name];
        if (typeof member !== "function") return member;
        if (STOPPED.has(name)) {
          return (...a) => {
            G.through.push(name === "SaveIDESetting" ? `SaveIDESetting ${String(a[0])}` : name);
            return Promise.resolve(undefined);
          };
        }
        return (...a) => member.apply(target, a);
      },
    });
  const front = (host) => {
    G.inFront = true;
    return new Proxy(host, {
      get(target, name) {
        if (name === "GetIDESetting") {
          return (...a) => {
            const key = String(a[0]);
            if (!Object.hasOwn(cfg.settings, key)) return target.GetIDESetting(...a);
            return target.GetIDESetting("LICENCEAGREEMENTV3").then(() => cfg.settings[key]);
          };
        }
        if (STOPPED.has(name)) return stopped(name);
        return target[name];
      },
    });
  };
  const hook = Object.getOwnPropertyDescriptor(window, "hostAppObject");
  let real;
  Object.defineProperty(window, "hostAppObject", {
    configurable: true,
    enumerable: true,
    get: () => real,
    set: (v) => {
      if (hook?.set) {
        hook.set(v ? under(v) : v);
        real = hook.get();
      } else {
        real = v;
      }
      real = real ? front(real) : real;
    },
  });
}

export const guardSource = (settings, gen) => `(${pageGuard})(${JSON.stringify({ settings, gen })})`;

// A hash of the IDE's settings key as `reg query` lists it, in memory: nothing is written, and
// the values are never kept or shown. What a first start could have written is in this key.
export function settingsHash() {
  const key = `HKCU\\${IDE_SETTINGS_KEY}\\IDESettings`;
  const r = spawnSync("reg", ["query", key], { windowsHide: true });
  if (r.status !== 0) throw new Error(`reg query could not read ${key}`);
  return createHash("sha256").update(r.stdout).digest("hex").slice(0, 12);
}
