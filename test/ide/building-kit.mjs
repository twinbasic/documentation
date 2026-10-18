// What the Building lanes share: building.test.mjs, building-hklm.test.mjs and
// building-llvm-box.test.mjs. Not a lane itself (lanes.mjs does not name it).
//
// Each lane opens a project from test/ide/probes/building-* (or a variant of one,
// written into the lane's work folder) in a lane's copy of the install, and
// presses Build, Clean and the boxes' buttons with the mouse. Every build, Clean
// and save writes into the lane's work folder.
//
// guard() replaces, as soon as a project is open:
//  - the page's hostAppObject, by a proxy that does nothing for SaveIDESetting,
//    ChangeWindowSetting, AddRecentsList and RemoveRecentsList (which write the
//    user's registry), records the PUBLISHER value a test saves, answers
//    GetIDESetting("PUBLISHER") from window.__publisherSetting when a test sets
//    one, answers every native dialog from window.__answers[name] ("" is Cancel),
//    and records every Shell call, running only the IDE's own taskkill of its
//    compiler;
//  - root.Shell, which the console's Launch EXE and Open Folder links and Open
//    Build Output Folder call, by a recorder, again for each new root: the IDE
//    makes root anew at every compiler connection, a restart's included, and a
//    root left unstubbed would open the real Explorer;
//  - the page's XMLHttpRequest and fetch, so that no request reaches the
//    package server (www.everythingaccess.com): one is recorded and sent nowhere.
//    CDP blocks the server's URLs as well, and records any request the page
//    makes to it; serverRequests() returns both, and a test fails on any.
// It also records the page's uncaught errors.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { answerMessageBox, click, clickAt, messageBoxes, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { diskText } from "./projects-kit.mjs";

export const J = JSON.stringify;
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROBES = path.join(HERE, "probes");
export { diskText, messageBoxes, sleep };

const SERVER = /everythingaccess\.com/i;

/**
 * The templates' Build Output Path, which the lane's open would otherwise
 * replace with its own (<work>\out\<name>.exe): the build writes into the
 * project's folder, which is in the lane's work folder.
 */
export const TEMPLATE_BUILD_PATH = "${SourcePath}\\Build\\${ProjectName}_${Architecture}.${FileExtension}";

const GUARD_JS = `(() => {
  if (!window.__stubRoot) {
    window.__shell = [];
    window.__stubRoot = () => {
      if (typeof root !== "undefined" && root && root.Shell && !root.Shell.__stub) {
        root.Shell = function (cmdline, muted) { window.__shell.push("root.Shell: " + String(cmdline)); };
        root.Shell.__stub = true;
      }
    };
    setInterval(window.__stubRoot, 20);
  }
  window.__stubRoot();
  if (window.__guarded) return true;
  window.__guarded = true;
  window.__answers = {};
  window.__hostCalls = [];
  window.__errors = [];
  window.__net = [];
  window.__publisherSaved = null;
  window.__publisherSetting = undefined;
  window.addEventListener("error", (e) => window.__errors.push(String(e.message)));
  window.addEventListener("unhandledrejection", (e) => window.__errors.push("rejection: " + String(e.reason && e.reason.message || e.reason)));
  const blocked = new Set(["ChangeWindowSetting", "AddRecentsList", "RemoveRecentsList"]);
  const dialogs = new Set(["ChooseFolder", "OpenFiles", "OpenIconCursor", "OpenImage", "OpenPackage", "OpenProject", "OpenProjectVBP", "OpenTypeLibrary", "SaveProjectAs"]);
  hostAppObject = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      if (key === "SaveIDESetting") return async (name, value) => { if (name === "PUBLISHER") window.__publisherSaved = String(value); };
      if (key === "GetIDESetting") return (name, ...rest) => name === "PUBLISHER" && window.__publisherSetting !== undefined ? Promise.resolve(window.__publisherSetting) : target.GetIDESetting(name, ...rest);
      if (dialogs.has(key)) return (...args) => {
        const a = window.__answers[key] ?? "";
        window.__hostCalls.push([key, args.map(String), a]);
        return Promise.resolve(a);
      };
      if (key === "Shell") return (cmdline, ...rest) => {
        window.__hostCalls.push(["Shell", [String(cmdline)], ""]);
        if (/^taskkill \\/PID \\d+ \\/F$/.test(String(cmdline))) return target.Shell(cmdline, ...rest);
        window.__shell.push(String(cmdline));
        return Promise.resolve(0);
      };
      return Reflect.get(target, key);
    },
  });
  const server = ${SERVER};
  const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u, ...r) { this.__u = String(u); return open.call(this, m, server.test(String(u)) ? "http://127.0.0.1:9/blocked" : u, ...r); };
  XMLHttpRequest.prototype.send = function (...a) { if (server.test(this.__u || "")) window.__net.push(this.__u.replace(/\\?.*/, "?...")); return send.apply(this, a); };
  const f = window.fetch;
  window.fetch = function (u, ...r) { if (server.test(String(u))) { window.__net.push("fetch " + String(u).replace(/\\?.*/, "?...")); return Promise.reject(new Error("blocked")); } return f.call(this, u, ...r); };
  return true;
})()`;

/** Install the guard on a connection just opened; again after anything that reloads the page. */
export async function guard(c) {
  await c.evaluate(GUARD_JS);
  if (!c.__buildingGuard) {
    c.__buildingGuard = true;
    c.__serverRequests = [];
    await c.send("Network.enable");
    await c.send("Network.setBlockedURLs", { urls: ["*everythingaccess*"] });
    c.on((m) => {
      if (m.method === "Network.requestWillBeSent" && SERVER.test(m.params.request.url))
        c.__serverRequests.push(m.params.request.url.replace(/\?.*/, "?..."));
    });
  }
}

/** Every request to the package server seen so far, by CDP or by the page's guard (none, or the test fails). */
export const serverRequests = async (c) => [
  ...(c.__serverRequests ?? []),
  ...(await c.evaluate("window.__net.slice()")),
];
export const pageErrors = (c) => c.evaluate("window.__errors.splice(0)");
export const hostCalls = (c) => c.evaluate("window.__hostCalls.splice(0)");
export const shells = (c) => c.evaluate("window.__shell.slice()");
export const setAnswer = (c, name, value) => c.evaluate(`window.__answers[${J(name)}] = ${J(value)}`);

/** The message boxes showing, as "[title] text {buttons}". */
export const boxes = async (c) =>
  (await messageBoxes(c)).map(
    (b) => `[${b.title}] ${String(b.text).replace(/\s+/g, " ").trim()} {${b.buttons.join("/")}}`,
  );

/** Click a button of the box on top, by its caption, with the mouse. */
export async function answer(c, caption) {
  await answerMessageBox(c, caption);
  await sleep(500);
}

/** Wait for a box whose text matches `re`; its "[title] text {buttons}", or null. */
export async function waitBox(c, re, { timeout = 10 * 1000 } = {}) {
  return waitFor(c, async () => (await boxes(c)).find((b) => re.test(b)) ?? null, { timeout, interval: 200 });
}

// The centre of the smallest visible element under `scope` whose text, its
// white space made single, is `text` (or starts with it); null when none is.
const centreJs = (scope, text, starts) => `(() => {
  const norm = (e) => e.textContent.replace(/\\s+/g, " ").trim();
  const area = (e) => e.getBoundingClientRect().width * e.getBoundingClientRect().height;
  const e = [...document.querySelectorAll(${J(scope)})]
    .filter((e) => (${starts} ? norm(e).startsWith(${J(text)}) : norm(e) === ${J(text)}) && area(e) > 0)
    .sort((a, b) => area(a) - area(b))[0];
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`;

/** Click, with the mouse, the smallest visible element whose whole text is `text`. */
export async function clickText(c, text, { scope = "*", startsWith = false } = {}) {
  const p = await c.evaluate(centreJs(scope, text, startsWith));
  if (!p) throw new Error(`nothing on screen reads ${J(text)}`);
  await clickAt(c, p.x, p.y);
  await sleep(600);
}

/** A root menu (File, View, ...) opened with the mouse, then one of its items. */
export async function menu(c, root, item) {
  await clickText(c, root, { scope: "[id^=rootMenu]" });
  await clickText(c, item, { scope: "#contextMenu > *", startsWith: true });
}

const END_RE =
  /\[LINKER\] SUCCESS|\[BUILD\] successful|\[LINKER\] FAILED|\[BUILD\] failed|\[BUILD-CLEAN\]|NATIVE EXCEPTION|\[BUILD ERROR\]/;

/**
 * Press Build or Clean on the toolbar with the mouse, and return the console's
 * lines since the press once a closing line has been followed by `quiet` ms of
 * nothing new (or `timeout` has passed), with the boxes showing then.
 */
export async function press(c, which, { timeout = 60 * 1000, quiet = 2000 } = {}) {
  const mark = await consoleMark(c);
  await waitFor(c, () => c.evaluate("licenceIsSet === true && !(lockUICount > 0)"), { timeout: 60 * 1000 });
  await click(c, which === "clean" ? "trashIcon" : "buildIcon");
  const t0 = Date.now();
  let lines = [],
    last = -1,
    changed = Date.now(),
    ended = false;
  while (Date.now() - t0 < timeout) {
    lines = (await linesSince(c, mark)).map((l) => l.trim()).filter(Boolean);
    if (lines.length !== last) {
      last = lines.length;
      changed = Date.now();
    }
    ended ||= lines.some((l) => END_RE.test(l));
    if ((ended || (await boxes(c)).length) && Date.now() - changed > quiet) break;
    await sleep(150);
  }
  return { lines, boxes: await boxes(c), mark };
}

/**
 * After a box that a press left was answered: the console's lines since the
 * press (`r`, press's result) past those it returned, once a closing line has
 * come among them and nothing new for `quiet` ms.
 */
export async function linesAfter(c, r, { timeout = 30 * 1000, quiet = 1500 } = {}) {
  const t0 = Date.now();
  let lines = [],
    last = -1,
    changed = Date.now();
  while (Date.now() - t0 < timeout) {
    lines = (await linesSince(c, r.mark))
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(r.lines.length);
    if (lines.length !== last) {
      last = lines.length;
      changed = Date.now();
    }
    if (lines.some((l) => END_RE.test(l)) && Date.now() - changed > quiet) break;
    await sleep(150);
  }
  return lines;
}

/** Console lines since `mark`, trimmed, once a line matches `re` (or after `timeout`). */
export async function linesUntil(c, mark, re, { timeout = 30 * 1000, quiet = 1500 } = {}) {
  await waitFor(c, async () => (await linesSince(c, mark)).some((l) => re.test(l)), { timeout });
  await sleep(quiet);
  return (await linesSince(c, mark)).map((l) => l.trim()).filter(Boolean);
}

/**
 * A copy of a fixture under `dir`, its Settings changed (undefined deletes a
 * key): the tree a lane opens.
 */
export function variant(fixture, dir, settings = {}) {
  cpSync(path.join(PROBES, fixture), dir, { recursive: true });
  const f = path.join(dir, "Settings");
  const s = JSON.parse(readFileSync(f, "utf8"));
  for (const [k, v] of Object.entries(settings)) {
    if (v === undefined) delete s[k];
    else s[k] = v;
  }
  writeFileSync(f, JSON.stringify(s, null, "\t"), "utf8");
  return dir;
}

/** The project's Settings as the IDE holds them now, parsed. */
export const ideSettings = (c, name) =>
  c.evaluate(
    `new Promise((res) => { const n = fs.tree.resolvePath("twinbasic:/${name}/Settings"); if (!n) return res(null); fs.readFile(n, (enc, data) => { try { res(JSON.parse(new TextDecoder().decode(new Uint8Array(data)))); } catch (e) { res(null); } }); })`,
    { awaitPromise: true },
  );

/** The four parts of a project version from a Settings object. */
export const version = (s) =>
  s && ["Major", "Minor", "Build", "Revision"].map((p) => s[`project.version${p}`] ?? 0).join(".");

/** Whether the IDE has the project marked changed, and its unsaved transactions. */
export const projectState = (c) =>
  c.evaluate(
    `({ dirty: typeof projectIsDirty === "undefined" ? null : projectIsDirty, tx: typeof g_SessionFilesystemTransactions === "undefined" ? null : g_SessionFilesystemTransactions.length, path: typeof projectFilePath === "undefined" ? null : projectFilePath ?? null })`,
  );

export function mkdir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ------------------------------------------------------------------ the registry (read only)

/** The fixed GUIDs of test/ide/probes/building-ax's class. */
export const AX_IDS = ["A001", "A002", "A003"].map((x) => `{B01D0000-0000-4000-8000-00000000${x}}`);

/**
 * The keys an ActiveX build of building-ax can write, in HKCU and HKLM, both
 * views. Its type library id is the project's id, which the lane gives it
 * (laneProjectId(2, slot)).
 */
export function axKeys(projectId) {
  const rel = [
    ...AX_IDS.flatMap((g) => [
      `CLSID\\${g}`,
      `Interface\\${g}`,
      `WOW6432Node\\CLSID\\${g}`,
      `WOW6432Node\\Interface\\${g}`,
    ]),
    `TypeLib\\${projectId}`,
    `WOW6432Node\\TypeLib\\${projectId}`,
    "BuildProbeAx.MyClass",
  ];
  return ["HKCU\\Software\\Classes", "HKLM\\Software\\Classes"].flatMap((root) => rel.map((r) => `${root}\\${r}`));
}

/** The keys of `keys` that exist (reg query, read only). */
export const presentKeys = (keys) =>
  keys.filter((k) => spawnSync("reg", ["query", k], { encoding: "utf8", windowsHide: true }).status === 0);
