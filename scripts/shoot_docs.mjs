#!/usr/bin/env node
// Take the screenshots of the IDE that the documentation shows, from an IDE on a
// private desktop: one run rewrites every picture after a new BETA, and rewrites
// none that has not changed.
//
//     node scripts/shoot_docs.mjs [options]
//
// No wrapper, and not a gate, for the reasons try-help-addin.bat is not one: it
// needs Windows and a twinBASIC install. It is set up as try_help_addin.mjs
// sets an IDE up (a lane of addin-test, lib/tb-lane.mjs) and keeps its rules,
// so that taking the pictures changes nothing the user owns:
//
//   * Every IDE runs from a copy of the install made in the work folder, with an
//     APPDATA of its own there, so none of the user's add-ins loads.
//     TB_ADDIN_TEST is on, so Open in browser starts nothing.
//   * The IDE's registry entries and the help add-in's SaveSetting key
//     (tbDocsHelp) are recorded first and put back at the end.
//
// The tool is a table of shots, and each shot names the setup (one IDE, started
// one way) it is taken in. A setup is started only when a shot in it is
// selected, and the setups run one after another:
//
//   help        the help add-in built into the copy, and test/addin/helpdemo
//               open; the pane's pages come from the built site, docs/_site, served
//               on localhost, so build.bat has to have run
//   project     test/addin/helpdemo open, with no add-in: what needs a compiler
//               that has answered, as About's licence line does
//   no-project  no project, as from the IDE's icon: every menu in its
//               no-project state, the dialogs that need no project, and the window,
//               its bars and its panels (each shown as a floating window on its own)
//
// What makes the pictures repeatable, so that a second run changes no byte:
//
//   * The IDE's page is laid out at 100% whatever the display's scaling
//     (--force-device-scale-factor=1, a WebView2 argument), and is then given a
//     fixed size and density, 1280 by 880 CSS pixels at 2x, through the DevTools
//     device-metrics override. A capture of a rectangle (Page.captureScreenshot
//     with a clip) is exactly twice the rectangle's size, and the pages show it
//     at half that size.
//   * Animations, transitions, the text caret and Monaco's cursor are turned
//     off by a style sheet put into the document and into every shadow root
//     (a tool window is one), in every picture. Otherwise a blink or a fade is
//     in some captures.
//   * The theme is dark, as the documentation shows it.
//   * What the user's machine would put into a picture is kept out of the IDE's
//     page, in the page only (the no-project and project setups): the IDE's
//     options are set to their defaults, the saved panel layouts and keyboard
//     groups are dropped and the recent lists are replaced by lists of the
//     tool's own. Nothing in the page is saved: the calls that write the IDE's
//     settings and the recent list are replaced by calls that do nothing before
//     the options are changed. The language is the one the IDE runs in.
//
// A menu is captured as a cut-out: the bar item and its drop-downs are kept, as
// the IDE draws them, and the rest of the page, background included, is
// transparent. A dialog is captured opaque, as a clip of the dialog's box.
//
// The Windows user name must never be in a published picture. Before a picture
// is kept, the visible text of the page it was taken from (the document, every
// shadow root and the docs page in the pane's frame) is searched for it, and a
// picture whose page holds it is refused. A tooltip is not drawn and is not
// read; the IDE's title tooltip holds the project's path.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import path from "node:path";
import { createStaticHandler } from "../builder/static-files.mjs";
import {
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  regexOption,
  withUsageError,
} from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { hoverText, mouseAway, pointOf, restMouse } from "../test/addin/hover.mjs";
import { frameEval, frameOf, serveLoopback } from "../test/addin/pages.mjs";
import { annotate as annotateOver, LAYER_ID, unannotate } from "./lib/shot-annotate.mjs";
import { attach } from "./lib/tb-cdp.mjs";
import { consoleMark, linesSince } from "./lib/tb-ide-console.mjs";
import { removeTree } from "./lib/tb-ide-copy.mjs";
import { shutdownIde, sleep } from "./lib/tb-ide.mjs";
import { findIde } from "./lib/tb-install.mjs";
import { Lane } from "./lib/tb-lane.mjs";
import { click, clickAt, listViewItems, openFile, pressKey, setCursor, typeText, waitFor } from "./lib/tb-operate.mjs";
import { claimPorts } from "./lib/tb-ports.mjs";
import { deleteSettings, finishTidy, restoreKeys, settingsKey, snapshotKeys, startTidy } from "./lib/tb-registry.mjs";

const SETTINGS = "tbDocsHelp";
const PANE = "tbDocsHelpPane";
const ADDIN = path.join(REPO_ROOT, "add-in");
const DEMO = path.join(REPO_ROOT, "test", "addin", "helpdemo");
const DEMO_FILE = "/Inventory/Sources/Inventory.twin";
const DEMO_SOURCE = path.join(DEMO, "Sources", "Inventory.twin");
const SITE = path.join(REPO_ROOT, "docs", "_site");
const DEFAULT_OUT = path.join(REPO_ROOT, "docs");

// The IDE page's size in CSS pixels, and the detached window's. Both at 2x.
const IDE_SIZE = { width: 1280, height: 880 };
const WINDOW_SIZE = { width: 900, height: 700 };
const SCALE = 2;
// Every IDE lays its page out at 100% whatever the display's scaling.
const BROWSER_ARGS = "--force-device-scale-factor=1";

const USAGE = `usage: node scripts/shoot_docs.mjs [--only <regex>] [--out <dir>] [--port N] [--ide <twinBASIC.exe>] [-h, --help]

Takes the pictures of the IDE that the documentation shows, from IDEs on a
private desktop, at 2x in the dark theme: the help add-in's eight (setup help),
and the menus, dialogs, bars and panels that need no project (setups no-project and project).
Each setup is one IDE, started when a picture in it is selected. A picture is
written only when its bytes differ from the file already there; each is
reported as new, updated or unchanged. The IDE's registry entries and the
help add-in's saved settings are put back afterwards. The help add-in's pane
shows pages from docs/_site, so run build.bat first for those.

A picture is refused, and the run fails, when the visible text of the page it
was taken from holds the Windows user name.

  --only <regex>   only the pictures whose path under the output folder
                   (IDE/Menu/Images/Menu_File.png) matches
  --out <dir>      the folder the pictures' paths are under (default docs)
  --port <n>       the first IDE's DevTools port: the first free ones from n
                   (default 9700); the help setup takes three, the detached
                   window's and the building IDE's after its own
  --ide <path>     the twinBASIC.exe to copy (default: $TB_IDE, else the
                   newest twinBASIC_IDE_BETA_* on the Desktop)
  -h, --help       print this text and exit

Exit codes:
  0  every picture was written or was unchanged
  1  a picture failed: an element was not found, the page showed the user name,
     the add-in did not build, or the demo project does not compile
  2  the tool could not run: a refused command line, no IDE, no built site, a
     registry it could not record, or a crash
  3  the registry or the work folder was not put back; see the lines above`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      only: { type: "string" },
      out: { type: "string" },
      port: { type: "string" },
      ide: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
const only = values.only === undefined ? null : withUsageError(() => regexOption(values.only, { option: "--only" }));
const firstPort = withUsageError(() =>
  numberOption(values.port ?? "9700", { option: "--port", integer: true, min: 1, max: 65535 }),
);
const outRoot = path.resolve(values.out ?? DEFAULT_OUT);

const ide = findIde(values.ide || undefined);
if (!ide || !existsSync(ide)) {
  die(
    2,
    "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
      "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
}

const USER = userInfo().username;

// ---------------------------------------------------------------- geometry

const clamp = (r, vw, vh) => {
  const x0 = Math.max(0, Math.floor(r.x));
  const y0 = Math.max(0, Math.floor(r.y));
  const x1 = Math.min(vw, Math.ceil(r.x + r.width));
  const y1 = Math.min(vh, Math.ceil(r.y + r.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};
// The whole CSS pixels inside a rectangle: a capture of the pane's own box, with
// none of what is under its fractional edge (a few pixels of it change with the timing).
const inside = (r) => {
  const x0 = Math.ceil(r.x);
  const y0 = Math.ceil(r.y);
  return { x: x0, y: y0, width: Math.floor(r.x + r.width) - x0, height: Math.floor(r.y + r.height) - y0 };
};
const grow = (r, m) => ({ x: r.x - m, y: r.y - m, width: r.width + 2 * m, height: r.height + 2 * m });
const union = (a, b) => {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.width, b.x + b.width);
  const y1 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};
// A rectangle snapped outward to whole device pixels (a CSS pixel is SCALE of them),
// inside the page: the capture is then exactly SCALE times the rectangle's size.
const snapOut = (r, vw = IDE_SIZE.width, vh = IDE_SIZE.height) => {
  const x0 = Math.max(0, Math.floor(r.x * SCALE) / SCALE);
  const y0 = Math.max(0, Math.floor(r.y * SCALE) / SCALE);
  const x1 = Math.min(vw, Math.ceil((r.x + r.width) * SCALE) / SCALE);
  const y1 = Math.min(vh, Math.ceil((r.y + r.height) * SCALE) / SCALE);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

// ---------------------------------------------------------------- capturing

const QUIET_CSS =
  "*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important;scroll-behavior:auto !important}" +
  ".monaco-editor .cursors-layer{visibility:hidden !important}";

// Gives the document and every shadow root in it the quiet style sheet, once each.
const quiet = (conn) =>
  conn.evaluate(`(() => {
  const css = ${JSON.stringify(QUIET_CSS)};
  const add = (root) => {
    if (root.querySelector("#tbShotQuiet")) return;
    const s = document.createElement("style");
    s.id = "tbShotQuiet";
    s.textContent = css;
    (root.head || root).appendChild(s);
  };
  const walk = (root) => {
    add(root);
    for (const e of root.querySelectorAll("*")) if (e.shadowRoot) walk(e.shadowRoot);
  };
  walk(document);
})()`);

// The visible text of a page: the document's and each shadow root's, where an
// element's innerText leaves out what is not drawn.
const VISIBLE_TEXT = `(() => {
  const out = [];
  const take = (e) => { if (e.innerText) out.push(e.innerText); };
  const walk = (root) => {
    for (const e of root.querySelectorAll("*")) {
      if (e.shadowRoot) {
        for (const k of e.shadowRoot.children) take(k);
        walk(e.shadowRoot);
      }
    }
  };
  take(document.body);
  walk(document);
  return out.join("\\n");
})()`;

async function textOf(conn, withFrame) {
  let text = await conn.evaluate(VISIBLE_TEXT);
  if (withFrame) text += `\n${await frameEval(conn, withFrame, "document.body.innerText").catch(() => "")}`;
  return text;
}

// A cut-out: the page's own background and everything but the `keep` selectors
// (and what is inside them) transparent. The page's default background is cleared
// too, which is what shows through at the corners. With `solid`, a CSS colour, the
// page is that colour instead and nothing is transparent: a floating panel is then
// on a plain ground of the IDE's own colour, without the shadow it casts, and the
// clip can reach beyond it to hold annotations.
const CUT_CSS = (keep, solid) =>
  `html,body,#bodyInner{background:${solid ?? "transparent"} !important;background-image:none !important}` +
  "body *{visibility:hidden !important}" +
  `${keep.map((k) => `${k},${k} *`).join(",")}{visibility:visible !important}` +
  (solid ? ".floatingPanel{box-shadow:none !important}" : "");

async function cutoutOn(conn, keep, solid = null) {
  await conn.evaluate(`(() => {
    document.getElementById("tbCut")?.remove();
    const s = document.createElement("style");
    s.id = "tbCut";
    s.textContent = ${JSON.stringify(CUT_CSS(keep, solid))};
    document.head.appendChild(s);
  })()`);
  if (!solid) await conn.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await sleep(250);
}

async function cutoutOff(conn) {
  await conn.evaluate(`document.getElementById("tbCut")?.remove()`);
  await conn.send("Emulation.setDefaultBackgroundColorOverride", {});
  await sleep(150);
}

// A capture of `clip` (CSS pixels, on whole device pixels) from `conn`, refused
// when the page's visible text holds the user name. `away` first takes the mouse
// where it touches nothing, since a control under it draws its hover look, unless
// the picture is of what the mouse rests on. `keep` makes it a cut-out, on a ground
// of the colour `solid` when that is given.
async function capture(conn, name, clip, { frame, away = null, keep = null, solid = null } = {}) {
  const text = await textOf(conn, frame);
  if (text.toLowerCase().includes(USER.toLowerCase()))
    throw new Error(`the page for ${name} shows the Windows user name`);
  if (away) await away();
  await quiet(conn);
  try {
    if (keep) await cutoutOn(conn, keep, solid);
    await sleep(300);
    const params = { format: "png" };
    if (clip) params.clip = { ...clip, scale: 1 };
    const { data } = await conn.send("Page.captureScreenshot", params);
    return Buffer.from(data, "base64");
  } finally {
    if (keep) await cutoutOff(conn);
  }
}

// ---------------------------------------------------------------- operating the IDE's own menus and dialogs

const TOP = {
  File: "rootMenuFile",
  Edit: "rootMenuEdit",
  View: "rootMenuView",
  Project: "rootMenuProject",
  Format: "rootMenuFormat",
  Debug: "rootMenuDebug",
  Run: "rootMenuRun",
  Tools: "rootMenuTools",
  "Add-Ins": "rootMenuAddins",
  Window: "rootMenuWindows",
  Help: "rootMenuHelp",
};

const rectOf = (c, sel) =>
  c.evaluate(`(() => {
  const e = document.querySelector(${JSON.stringify(sel)});
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return r.width && r.height ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);

const mouseMove = (c, x, y) => c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
// The page's lower left corner: no control is there, and no menu or dialog reaches it.
const parkMouse = (c) => mouseMove(c, 2, IDE_SIZE.height - 10);

// Items of the open drop-down (or of its submenu): text, rectangle.
const menuItems = (c, sub = false) =>
  c.evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(sub ? "#contextMenuSUB > *" : "#contextMenu > *")})].map((e) => {
    const r = e.getBoundingClientRect();
    return { tag: e.tagName, text: e.innerText.trim(), x: r.x, y: r.y, width: r.width, height: r.height };
  }))()`);

async function closeMenus(c) {
  if (await rectOf(c, "#contextMenu")) {
    await pressKey(c, "Escape");
    await waitFor(c, async () => !(await rectOf(c, "#contextMenu")), { timeout: 2000, interval: 100 });
  }
  await parkMouse(c);
  await sleep(150);
}

// Opens a top-level menu with a real press on its title (the IDE opens on mousedown).
async function openMenu(c, name) {
  await closeMenus(c);
  const r = await rectOf(c, `#${TOP[name]}`);
  if (!r) throw new Error(`there is no ${name} menu`);
  await clickAt(c, r.x + r.width / 2, r.y + r.height / 2);
  const ok = await waitFor(c, async () => (await rectOf(c, "#contextMenu"))?.height > 0, {
    timeout: 5000,
    interval: 100,
  });
  if (!ok) throw new Error(`the ${name} menu did not open`);
  await sleep(250);
  return rectOf(c, "#contextMenu");
}

// Moves the mouse onto an item of the open drop-down and waits until its submenu
// is showing: the IDE opens it 500 ms after the hover, and until its items are in,
// #contextMenuSUB is an empty box. Returns the submenu's rectangle.
async function hoverItem(c, text) {
  const items = await menuItems(c);
  const it = items.find((i) => i.text === text || i.text.startsWith(text));
  if (!it) throw new Error(`no menu item "${text}" in ${JSON.stringify(items.map((i) => i.text))}`);
  await mouseMove(c, it.x + 8, it.y + it.height / 2);
  await mouseMove(c, it.x + it.width / 2, it.y + it.height / 2);
  const sub = await waitFor(
    c,
    async () => {
      const n = await c.evaluate(`document.querySelectorAll("#contextMenuSUB > .contextMenuItem").length`);
      return n > 0 ? rectOf(c, "#contextMenuSUB") : null;
    },
    { timeout: 4000, interval: 100 },
  );
  if (!sub) throw new Error(`the submenu of "${text}" did not open`);
  await sleep(300);
  return sub;
}

// Every modal dialog showing, top one last.
const modals = (c) =>
  c.evaluate(`(() => [...document.querySelectorAll(".modalDialogContainer")].map((m) => {
    const r = m.getBoundingClientRect();
    const bar = m.querySelector(".modalTitleBar");
    return { title: bar ? bar.innerText.trim() : "", x: r.x, y: r.y, width: r.width, height: r.height };
  }).filter((m) => m.width && m.height))()`);

// Runs an IDE command as the menu does.
const command = (c, id) => c.evaluate(`executeIdeCommand(${JSON.stringify(id)})`);

// Waits for a modal whose title contains `title`; returns its rectangle.
const waitModal = (c, title, { timeout = 10000 } = {}) =>
  waitFor(c, async () => (await modals(c)).filter((m) => m.title.includes(title)).pop() ?? null, {
    timeout,
    interval: 150,
  });

// A real click on the smallest element of the top modal whose text is `text`
// (and that matches `selector`).
async function clickInModal(c, text, selector = "*") {
  const p = await c.evaluate(`(() => {
    const ms = [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width);
    const m = ms[ms.length - 1];
    if (!m) return null;
    const area = (e) => e.getBoundingClientRect().width * e.getBoundingClientRect().height;
    const e = [...m.querySelectorAll(${JSON.stringify(selector)})]
      .filter((e) => e.textContent.trim() === ${JSON.stringify(text)} && e.getBoundingClientRect().width)
      .sort((a, b) => area(a) - area(b))[0];
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  if (!p) throw new Error(`nothing in the top dialog reads "${text}"`);
  await clickAt(c, p.x, p.y);
}

// Closes the top modal with a real click on a button.
async function closeModal(c, caption) {
  const before = (await modals(c)).length;
  if (!before) return;
  await clickInModal(c, caption, ".msgBoxButton");
  if (!(await waitFor(c, async () => (await modals(c)).length < before, { timeout: 5000, interval: 100 }))) {
    throw new Error(`the dialog did not close on "${caption}"`);
  }
  await sleep(300);
}

// Nothing open: no menu, no dialog, the mouse out of the way.
async function resetUi(c) {
  await closeMenus(c);
  for (let n = (await modals(c)).length; n > 0; n--) {
    await pressKey(c, "Escape");
    await sleep(400);
  }
  await parkMouse(c);
}

// ---------------------------------------------------------------- the IDE's page

// The dark theme, as the documentation shows it.
async function ensureDark(c) {
  const isDark = () =>
    c.evaluate(`(() => {
  const p = document.createElement("div");
  p.style.background = "var(--themeGeneralPanelBackColor)";
  document.body.appendChild(p);
  const [r, g, b] = getComputedStyle(p).backgroundColor.match(/\\d+/g).map(Number);
  p.remove();
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
})()`);
  if (!(await isDark())) {
    await c.evaluate('executeIdeCommand("tbTheme_SwitchToDarkMode")');
    if (!(await waitFor(c, isDark, { timeout: 10000 }))) throw new Error("the IDE did not switch to the dark theme");
  }
}

// Keeps the user's machine out of the pictures, in the IDE's page only. First the
// calls that write the IDE's settings and the recent list are replaced by calls
// that do nothing, and the functions that save the options too, so that nothing
// below is saved, now or when the IDE ends. Then the IDE's options go back to
// their defaults, the saved panel layouts and keyboard groups go, the panel
// features are all allowed, and the recent lists are the tool's own. The language
// is left as the IDE runs it, and so are the options the schema does not list.
// Returns what differed from the defaults.
const PAGE_DEFAULTS = `(() => {
  const blocked = new Set(["SaveIDESetting", "AddRecentsList", "RemoveRecentsList"]);
  hostAppObject = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      return Reflect.get(target, key);
    },
  });
  saveIDEOptions = () => {};
  saveIDEOptions2 = () => {};
  const differed = [];
  for (const o of ideOptionsSchema) {
    const now = JSON.stringify(liveIDEOptions[o.name]);
    if (now !== JSON.stringify(o.default)) differed.push(o.name + " was " + now);
    if (o.default === undefined) delete liveIDEOptions[o.name];
    else liveIDEOptions[o.name] = structuredClone(o.default);
  }
  differed.push(...Object.keys(liveIDEOptions2).filter((k) => k !== "projectExplorerFileMode").map((k) => "panel option " + k));
  liveIDEOptions2 = {};
  syncDockPanelOptions();
  if (Object.keys(customPanelLayouts).length) differed.push("custom panel layouts " + Object.keys(customPanelLayouts).join(","));
  if (activePanelLayoutName !== "<DEFAULT>") differed.push("active panel layout " + JSON.stringify(activePanelLayoutName));
  if (Object.keys(customKeyboardShortcutGroups).length) differed.push("keyboard groups " + Object.keys(customKeyboardShortcutGroups).join(","));
  if (activeKeyboardShortcutGroupNames !== "") differed.push("active keyboard groups " + JSON.stringify(activeKeyboardShortcutGroupNames));
  customPanelLayouts = {};
  activePanelLayoutName = "<DEFAULT>";
  customKeyboardShortcutGroups = {};
  activeKeyboardShortcutGroupNames = "";
  window.HostGetVB6RecentProjects = (done) => done("");
  window.HostGetRecentsList = (e) => {
    e.classList.add("frontPageListViewLIST");
    listviewFromArray(e, [], () => {});
  };
  changedIdeOptions();
  return JSON.stringify(differed);
})()`;

// The recent list the New / Open Project dialog shows, from now on.
const setRecents = (c, entries) =>
  c.evaluate(`window.HostGetRecentsList = (e) => {
  e.classList.add("frontPageListViewLIST");
  listviewFromArray(e, ${JSON.stringify(entries)}, () => {});
}`);

// ---------------------------------------------------------------- setups

// A setup is one IDE: `ports` it claims, `start` which opens it and returns the
// connection, `prepare` which brings it to a state the shots start from and
// returns their context. `run` holds the lane, the ports, the work folder and
// what the setup has to put back.

const demoLines = () => readFileSync(DEMO_SOURCE, "utf8").split("\n");

// ---- help

async function startHelp(run) {
  const { lane, ports, work } = run;
  const files = createStaticHandler(SITE);
  run.server = await serveLoopback((req, res) => files(req, res));
  run.origin = `http://localhost:${run.server.port}`;
  run.step = "build";
  console.log(`building ${path.relative(REPO_ROOT, ADDIN)} into a copy of ${ide}`);
  // The add-in as committed, without the help archive, so that the pane's frame
  // loads the site served here (as the help lane does).
  const src = path.join(work, "help-src");
  cpSync(ADDIN, src, {
    recursive: true,
    filter: (f) => ![path.join(ADDIN, "Build"), path.join(ADDIN, "Resources", "HELP")].includes(f),
  });
  // On a port of its own: the building IDE's WebView2 can keep listening on its
  // port for longer than launchIde waits (ten seconds) after the IDE ends.
  await lane.addAddin(src, { show: false, port: ports[2] });
  run.step = "open";
  console.log(`opening ${path.relative(REPO_ROOT, DEMO)}`);
  return lane.open(DEMO, {
    env: {
      TB_DOCS_HELP_SITE: run.origin,
      TB_DOCS_HELP_WINDOW_PORT: String(ports[1]),
      TB_DOCS_HELP_REAL_TITLEBAR: "0",
    },
  });
}

async function prepareHelp(run) {
  const { c, origin } = run;
  run.step = "shoot";
  const addinLines = (mark) => linesSince(c, mark, { prefix: "[tbDocsHelp] " });
  if (
    !(await waitFor(c, async () => (await addinLines(null)).some((l) => l.startsWith("loaded")), { timeout: 30000 }))
  ) {
    throw new Error("the add-in never printed its loaded line");
  }
  await openFile(c, DEMO_FILE, { line: 1, column: 1 });
  run.defaults = JSON.parse(await c.evaluate(PAGE_DEFAULTS));
  await ensureDark(c);
  await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
  await sleep(1500);
  const ctx = {
    c,
    origin,
    windowPort: run.ports[1],
    addinLines,
    results: async () => (await listViewItems(c, { toolWindow: PANE, css: "#helpResults" })).map((i) => i.text),
  };
  ctx.help = helpTakes(ctx);
  return ctx;
}

// ---- project: the demo, with no add-in

async function startProject(run) {
  run.step = "open";
  console.log(`opening ${path.relative(REPO_ROOT, DEMO)}`);
  return run.lane.open(DEMO);
}

async function prepareProject(run) {
  const { c } = run;
  run.step = "shoot";
  await openFile(c, DEMO_FILE, { line: 1, column: 1 });
  run.defaults = JSON.parse(await c.evaluate(PAGE_DEFAULTS));
  await ensureDark(c);
  await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
  await sleep(1500);
  return { c };
}

// ---- no-project

async function startNoProject(run) {
  run.step = "open";
  console.log("opening the IDE with no project");
  run.lane.includeProjects();
  return run.lane.openNoProject();
}

async function prepareNoProject(run) {
  const { c } = run;
  run.step = "shoot";
  await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
  // The splash, then the New / Open Project dialog the IDE starts with.
  if (!(await waitModal(c, "New / Open", { timeout: 60000 }))) throw new Error("the IDE showed no New / Open dialog");
  await sleep(1000);
  run.defaults = JSON.parse(await c.evaluate(PAGE_DEFAULTS));
  await closeModal(c, "Cancel");
  await ensureDark(c);
  await sleep(1500);
  await parkMouse(c);
  return { c };
}

const SETUPS = {
  help: { ports: 3, start: startHelp, prepare: prepareHelp },
  project: { ports: 1, start: startProject, prepare: prepareProject },
  "no-project": { ports: 1, start: startNoProject, prepare: prepareNoProject },
};

// ---------------------------------------------------------------- the shots of the no-project setup

// A menu, as a cut-out: the bar item and its drop-down, and the submenu of an
// item when one is hovered. The menus carry a 1 px outline outside their
// border box, so the clip is grown by it, which is also what rounds their
// corners: the outline's corner is what fills the pixel the border's curve leaves.
const OUTLINE = 1;
function menuShot(name, top, item = null, { subOnly = false } = {}) {
  return {
    out: `IDE/Menu/Images/${name}.png`,
    setup: "no-project",
    async take({ c }) {
      await resetUi(c);
      try {
        const drop = await openMenu(c, top);
        const title = await rectOf(c, `#${TOP[top]}`);
        const sub = item ? await hoverItem(c, item) : null;
        let area;
        let keep;
        if (subOnly) {
          area = grow(sub, OUTLINE);
          keep = ["#contextMenuSUB"];
        } else {
          const u = sub ? union(union(title, drop), sub) : union(title, drop);
          // the outline is outside the sides and the bottom; the bar is above
          area = { x: u.x - OUTLINE, y: u.y, width: u.width + 2 * OUTLINE, height: u.height + OUTLINE };
          keep = [`#${TOP[top]}`, "#contextMenu", ...(sub ? ["#contextMenuSUB"] : [])];
        }
        return await capture(c, name, snapOut(area), { keep });
      } finally {
        await closeMenus(c);
      }
    },
  };
}

// The menu bar on its own, at a width that puts the window buttons beside the titles.
const menuBarShot = {
  out: "IDE/Menu/Images/Menu.png",
  setup: "no-project",
  async take({ c }) {
    await resetUi(c);
    try {
      await c.send("Emulation.setDeviceMetricsOverride", {
        width: 611,
        height: IDE_SIZE.height,
        deviceScaleFactor: SCALE,
        mobile: false,
      });
      await sleep(1000);
      await closeMenus(c);
      const bar = await rectOf(c, "#rootMenu1");
      if (!bar) throw new Error("the page has no menu bar");
      return await capture(c, "Menu", snapOut(bar, 611, IDE_SIZE.height), { away: () => parkMouse(c) });
    } finally {
      await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
      await sleep(500);
    }
  },
};

// The top dialog's box, opaque (its shadow falls outside), or `clipOf(box)` of it.
// `annotate`, a shot's list of primitives (lib/shot-annotate.mjs), is drawn over
// the page for the capture and taken off again however that goes; the clip grows to
// hold what it drew.
async function dialogShot(c, name, clipOf = (m) => m, annotate = null) {
  await c.evaluate("document.activeElement?.blur?.()");
  await sleep(300);
  const box = (await modals(c)).pop();
  if (!box) throw new Error(`no dialog is open for ${name}`);
  let area = clipOf(box);
  try {
    if (annotate) {
      const { box: drawn } = await annotateOver(c, annotate);
      if (drawn) area = union(area, drawn);
    }
    return await capture(c, name, snapOut(area), { away: () => parkMouse(c) });
  } finally {
    if (annotate) await unannotate(c);
  }
}

// Opens a dialog by its command and returns once its title is in; `run` takes the
// picture and the dialog is closed with `close` however that goes.
async function inDialog(c, { command: id, title, close, settle = 800, timeout = 10000 }, run) {
  await resetUi(c);
  await command(c, id);
  if (!(await waitModal(c, title, { timeout }))) throw new Error(`the dialog "${title}" did not open`);
  await sleep(settle);
  try {
    return await run();
  } finally {
    await closeModal(c, close).catch(async () => {
      await pressKey(c, "Escape");
      await sleep(500);
    });
  }
}

// The New / Open Project dialog, with no VB6 tab (the tool's own recent lists).
const inNewProject = (c, run) =>
  inDialog(c, { command: "tbProject_New", title: "New / Open", close: "Cancel", settle: 1200 }, run);

const dialogOut = (dir, name) => `${dir}/Images/${name}.png`;

// `annotate`: the primitives drawn over the picture (lib/shot-annotate.mjs).
const newProjectShot = (name, prepare = async () => {}, { out = dialogOut("IDE", name), annotate = null } = {}) => ({
  out,
  setup: "no-project",
  annotate,
  take: ({ c }) =>
    inNewProject(c, async () => {
      await prepare(c);
      return dialogShot(c, name, undefined, annotate);
    }),
});

const samplesTab = async (c) => {
  await clickInModal(c, "Samples", ".buttonGroupItem");
  await sleep(800);
};

// Scrolls the Samples list until the sample whose title starts with `title` is
// `above` pixels under the list's top edge.
async function scrollSamples(c, title, above = 12) {
  const found = await c.evaluate(`(() => {
  const l = document.querySelector(".frontPageListView");
  const it = [...l.querySelectorAll(".frontPageListViewItem")].find((e) => e.innerText.startsWith(${JSON.stringify(title)}));
  if (!it) return false;
  l.scrollTop += it.getBoundingClientRect().top - l.getBoundingClientRect().top - ${above};
  return true;
})()`);
  if (!found) throw new Error(`the Samples tab lists no ${title}`);
  await sleep(500);
}

// Anchors in the New / Open Project dialog, for the annotations of its pictures.
const NEW_TILE = (title) => ({ css: ".frontPageListViewItem", text: title });
const SAMPLE_TITLE = (title) => ({ css: ".frontPageListViewItem", text: title, own: true });
const DIALOG_TAB = (title) => ({ css: ".buttonGroupItem", text: title });

const dialogShots = [
  newProjectShot("New_Project"),
  newProjectShot("New_Project_Samples", samplesTab),
  newProjectShot("New_Project_Recent_1", async (c) => {
    await setRecents(c, []);
    await clickInModal(c, "New", ".buttonGroupItem");
    await sleep(400);
    await clickInModal(c, "Recent", ".buttonGroupItem");
    await sleep(1200);
  }),
  newProjectShot("New_Project_Recent_2", async (c) => {
    // blank names, as the picture has always had
    await setRecents(c, [
      { name: " ", projectPath: "x1" },
      { name: " ", projectPath: "x2" },
    ]);
    await clickInModal(c, "New", ".buttonGroupItem");
    await sleep(400);
    await clickInModal(c, "Recent", ".buttonGroupItem");
    await sleep(1200);
  }),
  {
    out: dialogOut("IDE", "Components_Message"),
    setup: "no-project",
    take: ({ c }) =>
      inDialog(c, { command: "tbToolbox_ShowMoreComponents", title: "twinBASIC", close: "OK", settle: 500 }, () =>
        dialogShot(c, "Components_Message"),
      ),
  },
  {
    // With a project open: with none, the two font rows read "<font list
    // unavailable: load a project first>" in place of their lists.
    out: dialogOut("IDE/Menu", "Menu_Tools_IDEOptions"),
    setup: "project",
    take: ({ c }) =>
      inDialog(c, { command: "tbIde_ShowIDEOptions", title: "IDE Options", close: "Close" }, () =>
        dialogShot(c, "Menu_Tools_IDEOptions"),
      ),
  },
  {
    // The LLVM rows of IDE Options, the default thread count among them: the title
    // bar and the rows from the one above the threads', scrolled to.
    out: "LLVM/Images/llvmdoc2.png",
    setup: "project",
    take: ({ c }) =>
      inDialog(c, { command: "tbIde_ShowIDEOptions", title: "IDE Options", close: "Close" }, async () => {
        const scrolled = await c.evaluate(`(() => {
  const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
  const text = (t) => [...m.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === t);
  const above = text("Monaco: Render Whitespace");
  const row = text("LLVM Compiler: Maximum number of threads");
  const scroller = m.querySelector(".ideOptionsDialog");
  if (!above || !row || !scroller) return false;
  scroller.scrollTop += above.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 10;
  return true;
})()`);
        if (!scrolled) throw new Error("IDE Options has no LLVM rows to scroll to");
        await sleep(500);
        return dialogShot(c, "llvmdoc2", (m) => ({ x: m.x, y: m.y, width: m.width, height: 187 }));
      }),
  },
  {
    out: dialogOut("IDE/Menu", "Menu_Window_KeyboardShortcuts_ManageKeyboardShortcuts"),
    setup: "no-project",
    take: ({ c }) =>
      inDialog(
        c,
        { command: "tbKeyboardShortcuts_ShowManageKeyboardShortcuts", title: "Manage Keyboard", close: "Cancel" },
        () => dialogShot(c, "ManageKeyboardShortcuts"),
      ),
  },
  {
    out: dialogOut("IDE/Menu", "Menu_Window_KeyboardShortcuts_ManageKeyboardShortcuts_1"),
    setup: "no-project",
    take: ({ c }) =>
      inDialog(
        c,
        { command: "tbKeyboardShortcuts_ShowManageKeyboardShortcuts", title: "Manage Keyboard", close: "Cancel" },
        async () => {
          await clickInModal(c, "Edit as JSON");
          await sleep(500);
          return dialogShot(c, "ManageKeyboardShortcuts_1");
        },
      ),
  },
  {
    out: dialogOut("IDE/Menu", "Menu_Window_PanelLayouts_ManagePanelLayouts_Default"),
    setup: "no-project",
    take: ({ c }) =>
      inDialog(c, { command: "tbPanels_ShowManagePanelLayouts", title: "Manage Panel", close: "Cancel" }, () =>
        dialogShot(c, "ManagePanelLayouts_Default"),
      ),
  },
  {
    out: dialogOut("IDE/Menu", "Menu_Window_PanelLayouts_ManagePanelLayouts_Fullscreen"),
    setup: "no-project",
    take: ({ c }) =>
      inDialog(c, { command: "tbPanels_ShowManagePanelLayouts", title: "Manage Panel", close: "Cancel" }, async () => {
        await clickInModal(c, "<FULLSCREEN> (built-in)");
        await sleep(500);
        return dialogShot(c, "ManagePanelLayouts_Fullscreen");
      }),
  },
  {
    // The Samples tab scrolled to the add-in samples.
    out: "Miscellaneous/Images/0e24eb5c-c9af-49a9-a908-03968b211554.png",
    setup: "no-project",
    take: ({ c }) =>
      inNewProject(c, async () => {
        await samplesTab(c);
        await scrollSamples(c, "Sample 10.");
        return dialogShot(c, "Samples_Scrolled");
      }),
  },
  // ---- annotated
  newProjectShot("FAQ_ImportVBP", async () => {}, {
    out: "Miscellaneous/Images/7e1cb69c-6db3-4f3f-aea1-c1fae25938a2.png",
    annotate: [
      // from below the tile, up at its icon
      {
        type: "arrow",
        from: { of: NEW_TILE("Import from VBP"), at: "bottom", dy: 22 },
        to: { of: NEW_TILE("Import from VBP"), at: "bottom", dy: -44 },
      },
    ],
  }),
  newProjectShot(
    "Package_Sample",
    async (c) => {
      await samplesTab(c);
      await scrollSamples(c, "Sample 7.", 118);
    },
    {
      out: "Features/Packages/Images/6ad7a172-0e1b-4276-ac89-042681552507.png",
      annotate: [{ type: "ring", on: SAMPLE_TITLE("Sample 7. Package") }],
    },
  ),
  newProjectShot(
    "ccSampleProject",
    async (c) => {
      await samplesTab(c);
      await scrollSamples(c, "Sample 6.", 118);
    },
    {
      out: "Tutorials/CustomControls/Images/ccSampleProject.png",
      annotate: [
        { type: "ring", on: DIALOG_TAB("Samples") },
        { type: "badge", n: 1, on: DIALOG_TAB("Samples"), side: "below", dx: -14 },
        { type: "ring", on: SAMPLE_TITLE("Sample 6. CustomControls") },
        { type: "badge", n: 2, on: SAMPLE_TITLE("Sample 6. CustomControls"), side: "left" },
      ],
    },
  ),
  newProjectShot("WebView2_Sample", samplesTab, {
    out: "Tutorials/WebView2/Images/tbWebView2Sample0.png",
    annotate: [
      {
        type: "arrow",
        from: { of: NEW_TILE("Sample 1a. WebView2 Examples"), at: "right", dx: -24 },
        to: SAMPLE_TITLE("Sample 1a. WebView2 Examples"),
      },
    ],
  }),
];

// ---- the window, its bars and its panels (no project)

// Runs `fn` with the page at another size, and puts it back.
async function atSize(c, width, height, fn) {
  await resetUi(c);
  try {
    await c.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: SCALE, mobile: false });
    await sleep(1000);
    return await fn();
  } finally {
    await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
    await sleep(500);
  }
}

// The status bar's last region names the command under the mouse and keeps it after
// the mouse has left. Hovering File > Close Project (greyed out with no project, and
// named all the same) puts tbProject_Close there, as the pictures have always shown;
// the mouse then rests on the editor, which has no command of its own.
async function nameCloseProject(c) {
  await openMenu(c, "File");
  const item = (await menuItems(c)).find((i) => i.text.startsWith("Close Project"));
  if (!item) throw new Error("the File menu has no Close Project");
  await mouseMove(c, item.x + 8, item.y + item.height / 2);
  await sleep(300);
  await pressKey(c, "Escape");
  // a closed menu leaves its box in the page, 2 by 8 pixels and empty
  if (!(await waitFor(c, async () => (await menuItems(c)).length === 0, { timeout: 2000, interval: 100 }))) {
    throw new Error("the File menu did not close");
  }
  const { w, h } = await c.evaluate("({ w: innerWidth, h: innerHeight })");
  await mouseMove(c, w / 2, h / 2);
  await sleep(300);
  const named = await c.evaluate(`document.getElementById("statusHoveringCommand").innerText`);
  if (named !== "tbProject_Close") throw new Error(`the status bar names "${named}", not tbProject_Close`);
}

// The IDE's whole window at the size of a full-HD screen, as it opens with no project.
const ideWindowShot = {
  out: "IDE/Images/IDE.png",
  setup: "no-project",
  take: ({ c }) =>
    atSize(c, 1920, 1032, async () => {
      await nameCloseProject(c);
      return capture(c, "IDE", snapOut({ x: 0, y: 0, width: 1920, height: 1032 }, 1920, 1032));
    }),
};

// The status bar at the width of its own contents, with the command named at its right.
const statusBarShot = {
  out: "IDE/Images/StatusBar.png",
  setup: "no-project",
  take: ({ c }) =>
    atSize(c, 661, IDE_SIZE.height, async () => {
      await nameCloseProject(c);
      const bar = await rectOf(c, "#rootStatusBar");
      return capture(c, "StatusBar", snapOut(bar, 661, IDE_SIZE.height));
    }),
};

// The four community icons at the right of the services and licence badges.
const linksShot = {
  out: "IDE/Images/Links.png",
  setup: "no-project",
  async take({ c }) {
    await resetUi(c);
    const bar = await rectOf(c, "#rootStatusBar");
    const icons = await rectOf(c, "#findUsOnline");
    if (!bar || !icons) throw new Error("the status bar has no community icons");
    return capture(c, "Links", snapOut({ x: icons.x, y: bar.y, width: icons.width, height: bar.height }), {
      away: () => parkMouse(c),
    });
  },
};

// The toolbar at the width of its buttons, the close button of the bar at its right.
const toolbarShot = {
  out: "IDE/Images/Toolbar_1.png",
  setup: "no-project",
  take: ({ c }) =>
    atSize(c, 1128, IDE_SIZE.height, async () => {
      // the first ancestor of the Preview button that spans the window is the bar
      const bar = await c.evaluate(`(() => {
  let e = document.getElementById("toolbarPreviewBtn");
  while (e && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement;
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
      if (!bar || bar.height > 60) throw new Error(`no toolbar found: ${JSON.stringify(bar)}`);
      return capture(c, "Toolbar_1", snapOut(bar, 1128, IDE_SIZE.height), { away: () => parkMouse(c) });
    }),
};

// A panel shows as a floating window when it is not in the layout, as View > <panel> does
// it. A docked one is hidden first so that it floats too: the picture is then the panel
// on its own, with its border, whatever the layout. Floating panels are 300 by 500 until
// sized, and the one just shown flashes for a second.
const panelSel = (id) => `.floatingPanel[id="${id}"]`;
const PANEL_COMMANDS = {
  "PROJECT EXPLORER": "ProjectExplorer",
  "OPEN EDITORS": "OpenEditors",
  HISTORY: "History",
  OUTLINE: "Outline",
  VARIABLES: "Variables",
  WATCHES: "Watches",
  "DEBUG CONSOLE": "DebugConsole",
  PROBLEMS: "Problems",
  "PACKAGE PUBLISHING": "PackagePublishing",
  PROPERTIES: "Properties",
};

// "Show" or "Hide". The Memory pane has no command of its own: its View entry runs showToolWindow.
function panelCommand(c, id, what) {
  if (id === "MEMORY 1") {
    return c.evaluate(
      what === "Show"
        ? "showToolWindow(hexEditorPanel)"
        : "closePanelBySectionHeader(hexEditorPanel._this.sectionHeader)",
    );
  }
  return command(c, `tb${PANEL_COMMANDS[id]}_${what}Panel`);
}

async function floatPanel(c, id, { width, height, left = 140, top = 120 }) {
  if (await c.evaluate(`isPanelIdDocked(${JSON.stringify(id)})`)) {
    await panelCommand(c, id, "Hide");
    await sleep(300);
  }
  await panelCommand(c, id, "Show");
  const sel = panelSel(id);
  if (!(await waitFor(c, () => rectOf(c, sel), { timeout: 5000, interval: 100 }))) {
    throw new Error(`the ${id} panel did not appear`);
  }
  await c.evaluate(`(() => {
  const p = document.querySelector(${JSON.stringify(sel)});
  Object.assign(p.style, { left: "${left}px", top: "${top}px", width: "${width}px", height: "${height}px" });
})()`);
  await sleep(1400);
  return rectOf(c, sel);
}

async function unfloatPanel(c, id) {
  if (await rectOf(c, panelSel(id))) await panelCommand(c, id, "Hide");
  await sleep(300);
}

// A panel on its own, sized to hold its title bar and the start of its body.
const panelShot = (name, id, [width, height]) => ({
  out: `IDE/Images/${name}.png`,
  setup: "no-project",
  async take({ c }) {
    await resetUi(c);
    try {
      const box = await floatPanel(c, id, { width, height });
      return await capture(c, name, snapOut(box), { away: () => parkMouse(c) });
    } finally {
      await unfloatPanel(c, id);
    }
  },
});

// A panel with annotations: the panel (and the menu `open` shows, if any) on a plain ground
// of the colour of its own body, the annotations drawn over, and the clip as large as they
// need. Labels sit on the ground at the panel's left; the primitives are those of
// lib/shot-annotate.mjs.
function annotatedPanelShot(name, id, size, { open = null, annotate }) {
  return {
    out: `IDE/Images/${name}.png`,
    setup: "no-project",
    async take({ c }) {
      await resetUi(c);
      const sel = panelSel(id);
      try {
        const box = await floatPanel(c, id, { ...size, left: 280 });
        // the body's colour, as the first of it and its ancestors that is not transparent
        const ground = await c.evaluate(`(() => {
  for (let e = document.querySelector(${JSON.stringify(`${sel} .sectionBody`)}); e; e = e.parentElement) {
    const k = getComputedStyle(e).backgroundColor;
    if (!/^rgba\\(.*, 0\\)$/.test(k) && k !== "transparent") return k;
  }
  return null;
})()`);
        if (!ground) throw new Error(`the ${id} panel has no background colour`);
        if (open) await open(c);
        const menu = open ? await rectOf(c, "#contextMenu") : null;
        let area = menu ? union(box, menu) : box;
        try {
          const { box: drawn } = await annotateOver(c, annotate);
          area = grow(union(area, drawn), 8);
          return await capture(c, name, snapOut(area), {
            away: () => parkMouse(c),
            keep: [sel, "#contextMenu", `#${LAYER_ID}`],
            solid: ground,
          });
        } finally {
          await unannotate(c);
          await closeMenus(c);
        }
      } finally {
        await unfloatPanel(c, id);
      }
    },
  };
}

// The Debug Console's header buttons and its input row, with its Options menu open: the menu
// opens where the mouse is pressed, so the press is at the button's lower left.
const DC = panelSel("DEBUG CONSOLE");
const DC_PANEL = { css: DC };
const DC_BUTTON = (title) => ({ css: `${DC} [title="${title}"]` });
const DC_OPTIONS = { css: `${DC} .ellipsesIcon2` };
const DC_INPUT = { css: `${DC} .debugConsoleEntryContainer` };
// a point `dy` below the panel's top edge, `dx` from its left edge, where a label ends
const LEFT_OF = (panel, dy, dx = -30) => ({ of: panel, at: "top-left", dx, dy });

const debugConsoleShot = annotatedPanelShot(
  "DebugConsole",
  "DEBUG CONSOLE",
  { width: 430, height: 215 },
  {
    async open(c) {
      const b = await rectOf(c, `${DC} .ellipsesIcon2`);
      await clickAt(c, b.x + 2, b.y + 15);
      if (!(await waitFor(c, () => rectOf(c, "#contextMenu"), { timeout: 3000, interval: 100 }))) {
        throw new Error("the Options menu did not open");
      }
      await sleep(300);
    },
    annotate: [
      // the buttons are 21 pixels apart, so their boxes are tight and need no halo
      { type: "box", on: DC_BUTTON("Auto Scroll"), pad: 1, halo: false },
      { type: "box", on: DC_BUTTON("Clear Debug Console"), pad: 1, halo: false },
      { type: "box", on: DC_OPTIONS, pad: 1, halo: false },
      { type: "box", on: DC_INPUT },
      // the two buttons are named from above, since the menu covers the panel below them:
      // Auto Scroll's label to the left, Clear's higher and to the right, so the arrows never cross
      {
        type: "label",
        text: "Auto Scroll",
        on: { of: DC_BUTTON("Auto Scroll"), at: "top", dx: -70, dy: -34 },
        side: "above",
        tone: "dark",
      },
      {
        type: "arrow",
        from: { of: DC_BUTTON("Auto Scroll"), at: "top", dx: -60, dy: -38 },
        to: { of: DC_BUTTON("Auto Scroll"), at: "top", dy: -3 },
      },
      {
        type: "label",
        text: "Clear Debug Console",
        on: { of: DC_BUTTON("Clear Debug Console"), at: "top", dx: 60, dy: -60 },
        side: "above",
        tone: "dark",
      },
      {
        type: "arrow",
        from: { of: DC_BUTTON("Clear Debug Console"), at: "top", dx: 50, dy: -64 },
        to: { of: DC_BUTTON("Clear Debug Console"), at: "top", dy: -3 },
      },
      // the menu is the Options button's: named from the right, since the arrows from the left
      // already converge on the buttons
      { type: "label", text: "Options", on: { css: "#contextMenu" }, side: "right", gap: 70, tone: "dark" },
      { type: "arrow", from: { of: { css: "#contextMenu" }, at: "right", dx: 66 }, to: { css: "#contextMenu" } },
      { type: "label", text: "Input", on: LEFT_OF(DC_PANEL, 203, -90), side: "left", tone: "dark" },
      { type: "arrow", from: LEFT_OF(DC_PANEL, 203, -86), to: DC_INPUT, tipGap: 11 },
    ],
  },
);

// The four counts in the Diagnostics header, each named from the left.
const DIAG = panelSel("PROBLEMS");
const DIAG_PANEL = { css: DIAG };
// a point under the badge, so that the arrow comes up at it from the body and not along the header
const DIAG_BADGE = (id) => ({ of: { css: `${DIAG} #${id}` }, at: "bottom", dy: 8 });
const diagnosticsShot = annotatedPanelShot(
  "Diagnostics",
  "PROBLEMS",
  { width: 430, height: 250 },
  {
    // the first label is low enough that the shortest arrow still has room to turn upright
    annotate: [
      ["Errors", "statusErrors", 95],
      ["Warnings", "statusWarnings", 135],
      ["Hints", "statusHints", 175],
      ["Information", "statusInfos", 215],
    ].flatMap(([text, id, dy]) => [
      { type: "label", text, on: LEFT_OF(DIAG_PANEL, dy), side: "left", tone: "dark" },
      { type: "arrow", from: LEFT_OF(DIAG_PANEL, dy, -26), to: DIAG_BADGE(id), elbow: true },
    ]),
  },
);

const panelShots = [
  ideWindowShot,
  statusBarShot,
  linksShot,
  toolbarShot,
  panelShot("ProjectExplorer", "PROJECT EXPLORER", [400, 116]),
  panelShot("Outline", "OUTLINE", [300, 96]),
  panelShot("History", "HISTORY", [300, 96]),
  panelShot("Watches", "WATCHES", [300, 76]),
  panelShot("OpenEditors", "OPEN EDITORS", [360, 92]),
  panelShot("Variables", "VARIABLES", [240, 248]),
  panelShot("Properties", "PROPERTIES", [400, 376]),
  panelShot("PackagePublishing", "PACKAGE PUBLISHING", [300, 268]),
  panelShot("Memory", "MEMORY 1", [696, 82]),
  diagnosticsShot,
  // after Diagnostics: the mouse press that opens the console's menu leaves a ghost of the
  // pointer in the next picture at the same place
  debugConsoleShot,
];

// The route a person takes: Standard EXE is selected on the New tab, and Open
// asks for its options. Cancel closes the dialog and creates nothing. Last
// of the setup, since the IDE has begun to start a project.
const newProjectOptionsShot = {
  out: "Miscellaneous/Images/05306a72-4ff6-427d-8970-969ef0c582e6.png",
  setup: "no-project",
  take: ({ c }) =>
    inNewProject(c, async () => {
      await clickInModal(c, "Open", ".msgBoxButton");
      if (!(await waitModal(c, "New Project Options", { timeout: 60000 }))) {
        throw new Error("Open on Standard EXE did not show the New Project Options dialog");
      }
      await sleep(1000);
      // the Project Name is selected: leave its caret at the end of the name
      await c.evaluate(`(() => {
  const i = [...document.querySelectorAll(".modalDialogContainer")].pop().querySelector("input[type=text], input:not([type])");
  if (i) i.setSelectionRange(i.value.length, i.value.length);
})()`);
      try {
        return await dialogShot(c, "New_Project_Options");
      } finally {
        await closeModal(c, "Cancel");
        await sleep(1000);
      }
    }),
};

// About's last line reads the compiler's licence, which the IDE has only once a
// project has been loaded and its compiler has answered: so it is taken in the
// project setup.
const aboutShot = {
  out: "IDE/Menu/Images/Menu_Help_About.png",
  setup: "project",
  async take({ c }) {
    const ready = await waitFor(
      c,
      () => c.evaluate(`licenceIsSet === true && !/NOT READY/.test(compilerLicence.innerText)`),
      { timeout: 60000, interval: 250 },
    );
    if (!ready) throw new Error("the compiler never answered the licence check, so About would say NOT READY");
    return inDialog(c, { command: "tbHelp_ShowAboutWindow", title: "About", close: "Close", settle: 1500 }, () =>
      dialogShot(c, "Menu_Help_About"),
    );
  },
};

// ---------------------------------------------------------------- the shots of the help setup

function helpTakes(ctx) {
  const { c, origin, windowPort, addinLines, results } = ctx;
  const AT = helpPlaces();
  const HELP_PAGE = "/tB/Modules/Interaction/MsgBox";
  const takes = {};
  const shoot = (name, fn) => {
    takes[name] = fn;
  };
  // the mouse goes to the page's corner for a picture, unless it is of what the mouse rests on
  const snap = (conn, name, clip, { frame, resting = false } = {}) =>
    capture(conn, name, clip, { frame, away: conn === c && !resting ? () => mouseAway(c) : null });

  // ---- reading the pane
  const inPane = (body) =>
    c.evaluate(`(() => {
  const w = toolWindowsById[${JSON.stringify(PANE)}];
  if (!w) return null;
  const root = w.bodyElement.getRootNode();
  ${body}
})()`);
  const frameSrc = () => inPane(`return root.querySelector("#helpPage")?.getAttribute("src") ?? null;`);
  const searchValue = () => inPane(`return root.querySelector("#helpSearch")?.value ?? null;`);
  const summaryShown = () =>
    inPane(`const s = root.querySelector("#helpSummary"); return !!s && s.style.display !== "none";`);
  const settingsOpen = () =>
    inPane(`return root.querySelector("#helpSettings")?.getAttribute("aria-expanded") === "true";`);
  const paneRect = () =>
    c.evaluate(`(() => {
  const f = toolWindowsById[${JSON.stringify(PANE)}]?.shadowDom.host.closest(".floatingPanel");
  if (!f) return null;
  const r = f.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
  // The pane from its top to the last result row shown whole: the page under the
  // list is the one an earlier F1 left, and says nothing about the list.
  const listClip = async () => {
    const pane = await paneRect();
    // The list scrolls, and the page's frame under it covers the rows past its end.
    const { last, end, more } = await inPane(`const list = root.querySelector("#helpResults").getBoundingClientRect();
  const page = root.querySelector("#helpPage")?.getBoundingClientRect();
  const end = page && page.height && page.top > list.top ? Math.min(list.bottom, page.top) : list.bottom;
  const all = [...root.querySelectorAll("#helpResults .hit")].map((r) => r.getBoundingClientRect());
  const rows = all.filter((r) => r.bottom <= end + 0.5).map((r) => r.bottom);
  return { last: rows.length ? Math.max(...rows) : end, end, more: all.some((r) => r.bottom > end + 0.5) };`);
    // Rows have no gap between them: with more past the view, end at the last whole one.
    return inside({ ...pane, height: Math.min(last + (more ? 0 : 8), end) - pane.y });
  };
  // The floating pane covers the middle of the editor: against the window's right edge.
  const paneAside = () =>
    c.evaluate(`(() => {
  const s = toolWindowsById[${JSON.stringify(PANE)}]?.shadowDom.host.closest(".floatingPanel");
  if (!s) return;
  s.style.left = (innerWidth - s.getBoundingClientRect().width - 4) + "px";
})()`);
  const paneVisibility = (v) =>
    c.evaluate(`(() => {
  const s = toolWindowsById[${JSON.stringify(PANE)}]?.shadowDom.host.closest(".floatingPanel");
  if (s) s.style.visibility = ${JSON.stringify(v)};
})()`);
  const editorRect = () =>
    c.evaluate(
      `(() => { const r = editor.getDomNode().getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
    );
  const elementRect = (id) =>
    c.evaluate(`(() => {
  const e = document.getElementById(${JSON.stringify(id)});
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return r.width && r.height ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);

  // ---- operating
  async function at({ line, column }) {
    await openFile(c, DEMO_FILE, { line, column });
    await setCursor(c, line, column);
    await c.evaluate("editor.setScrollTop(0)");
    await sleep(300);
  }
  async function emptySearch() {
    if (!(await searchValue())) return;
    await click(c, { toolWindow: PANE, css: "#helpSearch" });
    await pressKey(c, "End");
    for (let n = (await searchValue()).length; n > 0; n--) await pressKey(c, "Backspace");
  }
  async function closeSettings() {
    if (await settingsOpen()) await click(c, { toolWindow: PANE, css: "#helpSettings" });
    await waitFor(c, async () => !(await settingsOpen()));
  }
  // F1 on a name of the demo.
  async function f1(target) {
    for (let attempt = 1; ; attempt++) {
      await at(target);
      await pressKey(c, "F1");
      // the pane is made and shown by the first one
      if (await waitFor(c, async () => (await paneRect()) && true, { timeout: 8000 })) return;
      if (attempt === 3) throw new Error("F1 did not show the pane");
    }
  }
  // The pane's page for the name, loaded: F1 on it, then wait for the frame's
  // document to be one made after the F1, complete, and the summary hidden.
  async function showPage(target, pagePath) {
    await closeSettings();
    await emptySearch();
    const markIt = () => frameEval(c, origin, "window.tbShotMark = true").catch(() => {});
    await markIt();
    await f1(target);
    const loaded = await waitFor(
      c,
      async () => {
        const src = await frameSrc();
        if (!src?.includes(pagePath) || (await summaryShown())) return false;
        const f = await frameOf(c, origin);
        if (!f || !f.url.includes(pagePath.replace(/\/$/, ""))) return false;
        const ready = await frameEval(c, origin, `document.readyState === "complete" && !window.tbShotMark`).catch(
          () => false,
        );
        return ready === true;
      },
      { timeout: 20000 },
    );
    if (!loaded) throw new Error(`the pane did not show ${pagePath}`);
    await sleep(2500); // fonts and images in the frame
    await paneAside();
  }
  // The results list, once it has stopped changing for a second.
  async function settledResults() {
    let list = "";
    let since = 0;
    return waitFor(
      c,
      async () => {
        const r = await results();
        if (JSON.stringify(r) !== list) [list, since] = [JSON.stringify(r), Date.now()];
        return r.length > 0 && Date.now() - since >= 1000 && r;
      },
      { timeout: 20000 },
    );
  }

  // ---- the shots, in the order of the page

  // The pane with the page F1 found, and the code beside it.
  shoot("Pane", async () => {
    await showPage(AT.msgBox, HELP_PAGE);
    const ed = await editorRect();
    // The pane ends where the editor does, so that the DEBUG CONSOLE, whose lines
    // carry the time they were written, is not in the picture.
    const setHeight = (h) =>
      c.evaluate(`(() => {
  const s = toolWindowsById[${JSON.stringify(PANE)}]?.shadowDom.host.closest(".floatingPanel");
  if (s) s.style.height = ${JSON.stringify(h)};
})()`);
    const was = await paneRect();
    try {
      await setHeight(`${Math.floor(ed.y + ed.height - was.y - 4)}px`);
      await sleep(500);
      const pane = await paneRect();
      // From the editor's left edge, its gutter included, and from its tab row, to
      // the pane's right and bottom edges.
      const top = ed.y - 60;
      const clip = inside({ x: ed.x, y: top, width: pane.x + pane.width - ed.x, height: pane.y + pane.height - top });
      return await snap(c, "Pane", clip, { frame: origin });
    } finally {
      await setHeight("");
    }
  });

  // The IDE's own hover with the add-in's link, and a pointer resting on the name.
  shoot("Hover", async () => {
    await showPage(AT.msgBox, HELP_PAGE);
    // tick Hover help in the settings panel, if it is not
    const ticked = await inPane(`return root.querySelector("#helpHover").checked;`);
    if (!ticked) {
      await click(c, { toolWindow: PANE, css: "#helpSettings" });
      await waitFor(c, settingsOpen);
      await click(c, { toolWindow: PANE, css: "#helpHover" });
      await sleep(300);
      await closeSettings();
    }
    await paneVisibility("hidden");
    try {
      const link = "Help: Collection class";
      // The class's hover lists its members and is tall: with the editor scrolled
      // up by two lines it fits above the DEBUG CONSOLE, whose lines carry their time.
      await c.evaluate("editor.setScrollTop(44)");
      let shown = null;
      for (let attempt = 0; attempt < 3 && !shown; attempt++) {
        await restMouse(c, AT.hover.line, AT.hover.column);
        shown = await waitFor(c, async () => (await hoverText(c))?.includes(link) && true);
      }
      if (!shown) throw new Error("the hover with the add-in's link did not show");
      await sleep(500);
      const hover = await c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".monaco-hover")].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 0);
  const r = h.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
      // the mouse's place, as restMouse sent it last
      const p = await pointOf(c, AT.hover.line, AT.hover.column);
      const tip = { x: p.x + 1, y: p.y };
      // the code line the pointer rests on, from the editor's left edge
      const ed = await editorRect();
      const name = { x: ed.x, y: p.top, width: tip.x + 120 - ed.x, height: p.height + 24 };
      await c.evaluate(`(() => {
  const d = document.createElement("div");
  d.id = "tbShotPointer";
  d.style.cssText = "position:fixed;left:${tip.x}px;top:${tip.y}px;width:12px;height:19px;pointer-events:none;z-index:2147483647";
  d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="19" viewBox="0 0 12 19"><path d="M0.5 0.5 V15.5 L4 12.3 L6.6 18.3 L9 17.3 L6.4 11.4 H11.4 Z" fill="#fff" stroke="#000" stroke-width="1" stroke-linejoin="round"/></svg>';
  document.body.appendChild(d);
})()`);
      // Never as far down as the DEBUG CONSOLE, whose lines carry their time.
      const area = grow(union(hover, name), 20);
      // less below than around: the next code line starts 8 pixels under the box
      area.height = Math.min(area.height - 14, ed.y + ed.height - area.y);
      const clip = clamp(area, IDE_SIZE.width, IDE_SIZE.height);
      const png = await snap(c, "Hover", clip, { resting: true });
      await c.evaluate(`document.getElementById("tbShotPointer")?.remove()`);
      return png;
    } finally {
      await c.evaluate(`document.getElementById("tbShotPointer")?.remove()`);
      await mouseAway(c);
      await paneVisibility("");
    }
  });

  // The pane with a query typed and the results listed.
  shoot("Search", async () => {
    await showPage(AT.msgBox, HELP_PAGE);
    await click(c, { toolWindow: PANE, css: "#helpSearch" });
    await typeText(c, "format");
    const items = await settledResults();
    if (!items) throw new Error("the search listed nothing");
    await paneAside();
    const png = await snap(c, "Search", await listClip(), { frame: origin });
    await emptySearch();
    return png;
  });

  // F1 on a member of a late-bound object lists the pages the member could be.
  shoot("Choices", async () => {
    await showPage(AT.msgBox, HELP_PAGE);
    await f1(AT.add);
    const items = await settledResults();
    if (!items || items.length < 2) throw new Error(`F1 on a late-bound member listed ${JSON.stringify(items)}`);
    await paneAside();
    const png = await snap(c, "Choices", await listClip(), { frame: origin });
    await emptySearch();
    return png;
  });

  // F1 on a procedure of the project with a [Description]: the summary, not a page.
  shoot("Description", async () => {
    await showPage(AT.msgBox, HELP_PAGE);
    await f1(AT.totalPrice);
    const shown = await waitFor(c, summaryShown, { timeout: 20000 });
    if (!shown) throw new Error("F1 on a procedure with a description did not show the summary");
    await sleep(500);
    await paneAside();
    // The summary is short, and the rest of the pane is empty: its top part.
    const pane = await paneRect();
    return snap(c, "Description", inside({ ...pane, height: 170 }), { frame: origin });
  });

  // The settings panel the gear opens, with the top of the page under it.
  shoot("Settings", async () => {
    await showPage(AT.msgBox, HELP_PAGE);
    await click(c, { toolWindow: PANE, css: "#helpSettings" });
    if (!(await waitFor(c, settingsOpen))) throw new Error("the gear did not open the settings panel");
    // the picture shows the defaults, both unticked: the Hover picture ticks Hover help
    if (await inPane(`return root.querySelector("#helpHover").checked;`)) {
      await click(c, { toolWindow: PANE, css: "#helpHover" });
      await sleep(300);
    }
    await sleep(500);
    await paneAside();
    const pane = await paneRect();
    // 150 CSS pixels ends between the page's heading and its first paragraph.
    const png = await snap(c, "Settings", inside({ ...pane, height: 150 }), { frame: origin });
    await closeSettings();
    return png;
  });

  // The toolbar's Help button.
  shoot("Toolbar", async () => {
    await mouseAway(c);
    const b = await elementRect("addinButton-tbDocsHelp");
    if (!b) throw new Error("the toolbar has no Help button");
    const clip = clamp(
      // The buttons before it too, so that a reader can find it on the toolbar.
      { x: b.x - 260, y: b.y - 10, width: b.width + 284, height: b.height + 20 },
      IDE_SIZE.width,
      IDE_SIZE.height,
    );
    return snap(c, "Toolbar", clip);
  });

  // The detached window with a page. Last: the pane is gone afterwards.
  shoot("Window", async () => {
    await showPage(AT.msgBox, HELP_PAGE);
    const mark = await consoleMark(c);
    await click(c, { toolWindow: PANE, css: "#helpDetach" });
    if (!(await waitFor(c, async () => (await addinLines(mark)).includes("detached"), { timeout: 30000 }))) {
      throw new Error(`the add-in did not detach: ${JSON.stringify(await addinLines(mark))}`);
    }
    let win = null;
    try {
      const attached = await waitFor(
        c,
        async () => {
          try {
            win = await attach(windowPort, "", { timeout: 30000 });
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 30000 },
      );
      if (!attached) throw new Error(`no page on the window's DevTools port ${windowPort}`);
      await win.send("Emulation.setFocusEmulationEnabled", { enabled: true });
      await win.send("Emulation.setDeviceMetricsOverride", { ...WINDOW_SIZE, deviceScaleFactor: SCALE, mobile: false });
      if (
        !(await waitFor(c, async () => (await addinLines(mark)).some((l) => l.startsWith("window page ")), {
          timeout: 30000,
        }))
      ) {
        throw new Error("the window's page did not load");
      }
      await sleep(3000); // fonts and images in the frame
      return await snap(win, "Window", null, { frame: origin });
    } finally {
      win?.close();
    }
  });

  return takes;
}

// The code in the help pictures is test/addin/helpdemo, a small program that reads
// as a reader's own. The tool finds each name it presses F1 on by searching the
// source, so a change to the program does not move a case.
function helpPlaces() {
  const lines = demoLines();
  // A place in the demo's source: the line holding `inLine`, and the column
  // (1-based) `offset` characters into the first `token` in that line.
  const place = (inLine, token, offset) => {
    const line = lines.findIndex((l) => l.includes(inLine));
    if (line < 0) throw new Error(`${DEMO_SOURCE} has no line with ${JSON.stringify(inLine)}`);
    const at = lines[line].indexOf(token, lines[line].indexOf(inLine));
    if (at < 0) throw new Error(`${JSON.stringify(token)} is not in the line with ${JSON.stringify(inLine)}`);
    return { line: line + 1, column: at + 1 + offset };
  };
  // F1 and the hover work on any column of a name; the middle letters are safe.
  return {
    msgBox: place('MsgBox "Total', "MsgBox", 2),
    hover: place("As New Collection", "Collection", 3),
    add: place('prices.Add "Widget"', ".Add", 2),
    totalPrice: place("& TotalPrice(", "TotalPrice", 3),
  };
}

// ---------------------------------------------------------------- the table of shots

// Each shot is a picture: `out` its path under the output folder, `setup` the IDE
// it is taken in, `take(ctx)` which brings that IDE to the state it shows and
// returns the picture's bytes. Within a setup they run in the order here.
const helpShot = (name) => ({
  out: `IDE/AddIns/Images/Help_${name}.png`,
  setup: "help",
  take: (ctx) => ctx.help[name](),
});

const SHOTS = [
  ...["Pane", "Hover", "Search", "Choices", "Description", "Settings", "Toolbar", "Window"].map(helpShot),
  aboutShot,
  menuBarShot,
  menuShot("Menu_File", "File"),
  menuShot("Menu_Edit", "Edit"),
  menuShot("Menu_View", "View"),
  menuShot("Menu_Project", "Project"),
  menuShot("Menu_Format", "Format"),
  menuShot("Menu_Debug", "Debug"),
  menuShot("Menu_Run", "Run"),
  menuShot("Menu_Tools", "Tools"),
  menuShot("Menu_Add-Ins", "Add-Ins"),
  menuShot("Menu_Window", "Window"),
  menuShot("Menu_Help", "Help"),
  menuShot("Menu_Debug_DebuggerOptions", "Debug", "Debugger Options"),
  menuShot("Menu_Debug_DebuggerOptions_2", "Debug", "Debugger Options", { subOnly: true }),
  menuShot("Menu_Window_Theme", "Window", "Theme"),
  menuShot("Menu_Window_Language", "Window", "Language"),
  menuShot("Menu_Window_PanelLayouts", "Window", "Panel Layouts"),
  menuShot("Menu_Window_PanelFeatures", "Window", "Panel Features"),
  menuShot("Menu_Window_KeyboardShortcuts", "Window", "Keyboard Shortcuts"),
  ...dialogShots,
  // after the dialogs: the panels' pictures change the layout
  ...panelShots,
  newProjectOptionsShot,
];

// ---------------------------------------------------------------- run

const selected = SHOTS.filter((s) => !only || only.test(s.out));
const wanted = Object.keys(SETUPS).filter((name) => selected.some((s) => s.setup === name));
if (!selected.length) die(2, `no picture's path matches ${values.only}`);
if (wanted.includes("help") && !existsSync(path.join(SITE, "tB", "symbols.json"))) {
  die(2, `no built site in ${SITE}: run build.bat first`);
}

let ports;
try {
  ports = await claimPorts(
    wanted.reduce((n, name) => n + SETUPS[name].ports, 0),
    { from: firstPort },
  );
} catch (e) {
  die(2, e.message);
}

const root = path.join(tmpdir(), "tbshoot-docs", String(ports[0]));
try {
  removeTree(root);
} catch (e) {
  die(2, `${root} could not be emptied (${e.code}): is an IDE from an earlier run still open?`);
}
mkdirSync(root, { recursive: true });
const tidy = startTidy({ prefixes: [root] });
if (!tidy) die(2, "could not record the registry, so it could not be put back afterwards");
const settingsBefore = wanted.includes("help") ? snapshotKeys([settingsKey(SETTINGS)]) : null;
// The add-in's saved settings are the user's; a run starts from none.
if (settingsBefore) deleteSettings([SETTINGS]);

let current = null; // the setup running now: { lane, server }

function restoreSettings() {
  if (settingsBefore) restoreKeys(settingsBefore);
}

exitOnCrash(() => {
  console.error("putting the registry back after the crash");
  if (current?.lane.run) shutdownIde(current.lane.run);
  finishTidy(tidy);
  restoreSettings();
});

// Writes a picture when its bytes differ from the file's; says which.
function keep(out, png) {
  const file = path.join(outRoot, out);
  mkdirSync(path.dirname(file), { recursive: true });
  let state = "new";
  if (existsSync(file)) state = readFileSync(file).equals(png) ? "unchanged" : "updated";
  if (state !== "unchanged") writeFileSync(file, png);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  console.log(
    `${out}: ${state} (${w}x${h} px, ${png.length} bytes; shown at {:width="${w / SCALE}" height="${h / SCALE}"})`,
  );
}

// Ends a setup's IDE and what it served; returns the problems, as lines.
async function endSetup() {
  const problems = [];
  if (!current) return problems;
  const { lane, server } = current;
  current = null;
  try {
    await lane.close();
  } catch (e) {
    console.error(e.message);
  }
  server?.close();
  return problems;
}

// The exit code for an error from one step: 1 when it is the add-in's or the
// project's own fault, 2 when the tool failed.
let failed = 0;
const t0 = Date.now();
let at = 0;
for (const name of wanted) {
  const setup = SETUPS[name];
  const mine = ports.slice(at, at + setup.ports);
  at += setup.ports;
  console.log(`setup ${name}`);
  const run = {
    name,
    step: "start",
    ports: mine,
    work: path.join(root, name),
    lane: null,
    server: null,
    c: null,
  };
  mkdirSync(run.work, { recursive: true });
  run.lane = new Lane({
    name: `shoot-${name}`,
    port: mine[0],
    work: run.work,
    ide,
    show: false,
    browserArgs: BROWSER_ARGS,
  });
  current = run;
  try {
    run.c = await setup.start(run);
    const ctx = await setup.prepare(run);
    if (run.defaults) {
      console.log(
        `page settings put to their defaults (in the page only, saved nowhere): ${run.defaults.join("; ") || "none differed"}`,
      );
    }
    for (const shot of selected.filter((s) => s.setup === name)) {
      try {
        keep(shot.out, await shot.take(ctx));
      } catch (e) {
        console.error(`${shot.out}: FAILED: ${e.message}`);
        failed = 1;
      }
    }
  } catch (e) {
    console.error(e.message);
    // buildAddin's exitCode is tbbuild's: 1 compile errors, 4 the compiler
    // crashed. Lane.open says "does not compile" for a project with errors.
    const own =
      (run.step === "build" && (e.exitCode === 1 || e.exitCode === 4)) ||
      (run.step === "open" && / does not compile\n/.test(e.message)) ||
      run.step === "shoot";
    failed = Math.max(failed, own ? 1 : 2);
  }
  await endSetup();
}
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);

const problems = [];
if (!finishTidy(tidy)) problems.push("the IDE's registry entries could not be put back (see the warning above)");
try {
  restoreSettings();
} catch (e) {
  problems.push(`the ${SETTINGS} settings could not be put back: ${e.message}`);
}
try {
  removeTree(root);
} catch (e) {
  problems.push(`${root} could not be removed (${e.code})`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(3);
}
console.log(
  `the registry${settingsBefore ? " and the add-in's settings are" : " is"} as ${settingsBefore ? "they were" : "it was"} found`,
);
process.exit(failed);
