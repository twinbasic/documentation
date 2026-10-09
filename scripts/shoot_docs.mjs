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
//   * The IDE's registry entries and the SaveSetting keys of the add-ins the run
//     loads (tbDocsHelp, GlobalSearchAddIn) are recorded first and put back at the end.
//
// The tool is a table of shots, and each shot names the setup (one IDE, started
// one way) it is taken in. A setup is started only when a shot in it is
// selected. Up to --jobs of them run at once, each IDE on a port, a work folder
// and a private desktop of its own, and no state is shared between them but the
// registry, which is put back once for the whole run:
//
//   help        the help add-in built into the copy, and test/addin/helpdemo
//               open; the pane's pages come from the built site, docs/_site, served
//               on localhost, so build.bat has to have run
//   project     test/addin/helpdemo open, with no add-in: what needs a compiler
//               that has answered, as About's licence line does
//   sample      test/shots/sample, SampleProject: the Project Explorer and the other
//               panels with a project, and the editor
//   settings    the sample with a Settings file of test/shots/settings, for the pictures
//               of Project Settings (-symbols, -webview2 and -fusion have the
//               references those pictures list); glyphs is the sample itself, for
//               the icons the pages show inline
//   global-search  Sample 15, the Global Search add-in, built into the copy, and
//               the sample's own project open: the add-in's pictures and the toolbar
//               that has its button
//   sample6     Sample 6, the CustomControls sample, open: its package in the Project
//               Explorer, and the package as JSON
//   designer    the sample with the forms of test/shots/designer staged onto it and the
//               Global Search add-in built into the copy: the form and report designers,
//               the Format menu over two selected controls, and the toolbar with a form open
//   forms       the same project without the add-in: PROPERTIES for a TextBox, the
//               Toolbox beside a QR code, and the window in a layout of its own;
//               settings-webview2 stages a form with a WebView2 control as well, for
//               the WebView2 tutorial's Toolbox and PROPERTIES
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

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
import { diffPicture } from "./lib/shot-diff.mjs";
import { attach } from "./lib/tb-cdp.mjs";
import { consoleMark, linesSince } from "./lib/tb-ide-console.mjs";
import { removeTree } from "./lib/tb-ide-copy.mjs";
import { shutdownIde, sleep } from "./lib/tb-ide.mjs";
import { unpackProject } from "./lib/tb-project.mjs";
import { findIde } from "./lib/tb-install.mjs";
import { Lane } from "./lib/tb-lane.mjs";
import {
  click,
  clickAt,
  editorText,
  listViewItems,
  openFile,
  pressKey,
  setCursor,
  typeText,
  waitFor,
} from "./lib/tb-operate.mjs";
import { claimPorts } from "./lib/tb-ports.mjs";
import { deleteSettings, finishTidy, restoreKeys, settingsKey, snapshotKeys, startTidy } from "./lib/tb-registry.mjs";

const SETTINGS = "tbDocsHelp";
const PANE = "tbDocsHelpPane";
// Sample 15's SaveSetting application name, the id it gives its tool window, and its
// toolbar button's element.
const GS_SETTINGS = "GlobalSearchAddIn";
const GS_WINDOW = "GlobalSearchAddInData";
const GS_BUTTON = "addinButton-GlobalSearchAddInButton";
const ADDIN = path.join(REPO_ROOT, "add-in");
const DEMO = path.join(REPO_ROOT, "test", "addin", "helpdemo");
const SAMPLE = path.join(REPO_ROOT, "test", "shots", "sample");
const DESIGNER = path.join(REPO_ROOT, "test", "shots", "designer");
const DESIGNER_WEBVIEW2 = path.join(DESIGNER, "webview2");
const SETTINGS_FIXTURES = path.join(REPO_ROOT, "test", "shots", "settings");
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

const USAGE = `usage: node scripts/shoot_docs.mjs [--only <regex>] [--out <dir>] [--diffs <dir>] [--jobs N] [--port N] [--ide <twinBASIC.exe>] [-h, --help]

Takes the pictures of the IDE that the documentation shows, from IDEs on a
private desktop, at 2x in the dark theme: the help add-in's eight (setup help),
the menus, dialogs, bars and panels that need no project (setups no-project and project),
the panels, editor, Project Settings and icons of a sample project (setups sample,
settings and glyphs), those of the IDE's Samples 15 and 6 (setups
global-search and sample6), the form and report designers and the Format menu
(setup designer), and the Toolbox and PROPERTIES with a control on a form (setups
forms and settings-webview2).
Each setup is one IDE, started when a picture in it is selected. A picture is
written only when its bytes differ from the file already there; each is
reported as new, updated or unchanged. The IDE's registry entries and the
saved settings of the add-ins it loads are put back afterwards. The help add-in's pane
shows pages from docs/_site, so run build.bat first for those.

A picture is refused, and the run fails, when the visible text of the page it
was taken from holds the Windows user name.

  --only <regex>   only the pictures whose path under the output folder
                   (IDE/Menu/Images/Menu_File.png) matches
  --out <dir>      the folder the pictures' paths are under (default docs)
  --diffs <dir>    write a difference picture into <dir> (not under docs) for
                   each picture that is updated: the file on disk, the new
                   picture and their difference side by side, the difference
                   amplified (yellow for one grey level, shading to red), with
                   the differing region magnified under them. Also one for each
                   two captures of one state that disagree, named .capture-<n>.
                   Files of the same name are overwritten
  --jobs <n>       how many IDEs run at once (default 6). The setups are queued,
                   the longest first, and the two long ones (no-project and sample)
                   are split into parts that each get an IDE of their own; every
                   line is prefixed with its setup or part. With --jobs 1 each
                   setup runs in one IDE, one after another, in the table's order
  --port <n>       the first IDE's DevTools port: the first free ones from n
                   (default 9700); every IDE takes one, the help setup three, the
                   detached window's and the building IDE's after its own, and the
                   global-search and designer setups two, the building IDE's after
                   its own
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
      diffs: { type: "string" },
      jobs: { type: "string" },
      port: { type: "string" },
      ide: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
const only = values.only === undefined ? null : withUsageError(() => regexOption(values.only, { option: "--only" }));
const jobCount = withUsageError(() =>
  numberOption(values.jobs ?? "6", { option: "--jobs", integer: true, min: 1, max: 16 }),
);
const firstPort = withUsageError(() =>
  numberOption(values.port ?? "9700", { option: "--port", integer: true, min: 1, max: 65535 }),
);
const outRoot = path.resolve(values.out ?? DEFAULT_OUT);
const diffsRoot = values.diffs === undefined ? null : path.resolve(values.diffs);
// path.relative gives an absolute path across drives, which is outside docs and does not start with "..".
if (diffsRoot) {
  const rel = path.relative(path.join(REPO_ROOT, "docs"), diffsRoot);
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
    die(2, `--diffs must not be under docs: ${values.diffs}`);
  }
}

const ide = findIde(values.ide || undefined);
if (!ide || !existsSync(ide)) {
  die(
    2,
    "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
      "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
}

const USER = userInfo().username;
const USER_PATTERN = USER.replace(/[.*+?^$|()[\]{}\\]/g, "\\$&");

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
// element's innerText leaves out what is not drawn, and the values of its text boxes,
// which innerText leaves out too.
const VISIBLE_TEXT = `(() => {
  const out = [];
  const take = (e) => { if (e.innerText) out.push(e.innerText); };
  const values = (root) => {
    for (const e of root.querySelectorAll("input, textarea")) if (e.value && e.getBoundingClientRect().width) out.push(e.value);
  };
  const walk = (root) => {
    for (const e of root.querySelectorAll("*")) {
      if (e.shadowRoot) {
        for (const k of e.shadowRoot.children) take(k);
        values(e.shadowRoot);
        walk(e.shadowRoot);
      }
    }
  };
  take(document.body);
  values(document);
  walk(document);
  return out.join("\\n");
})()`;

// `expression` evaluated in the document of a frame: `frame` is the origin of a child frame
// of `conn`'s page, or the connection to a frame of another site, which is a target of its
// own (the detached help window's page is a string, and its frame is on another site).
const inFrame = (conn, frame, expression) =>
  typeof frame === "string" ? frameEval(conn, frame, expression) : frame.evaluate(expression);

async function textOf(conn, withFrame) {
  let text = await conn.evaluate(VISIBLE_TEXT);
  if (withFrame) text += `\n${await inFrame(conn, withFrame, "document.body.innerText")}`;
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

// Resolves once the page has drawn two more frames: a change made before it (a style
// sheet, a class, a mouse move and the hover look it ends) is then on the screen.
const frames = (conn) =>
  conn.evaluate("new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))", {
    awaitPromise: true,
  });

async function cutoutOn(conn, keep, solid = null) {
  await conn.evaluate(`(() => {
    document.getElementById("tbCut")?.remove();
    const s = document.createElement("style");
    s.id = "tbCut";
    s.textContent = ${JSON.stringify(CUT_CSS(keep, solid))};
    document.head.appendChild(s);
  })()`);
  if (!solid) await conn.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await frames(conn);
}

async function cutoutOff(conn) {
  await conn.evaluate(`document.getElementById("tbCut")?.remove()`);
  await conn.send("Emulation.setDefaultBackgroundColorOverride", {});
  await frames(conn);
}

// What one running setup keeps, on its connection as `c.shot` (the detached window's
// connection shares it): `name` the setup's, for its lines; `reference` the bytes of the
// file the running shot writes, when there is one, which `capture` prefers the version of a
// picture that equals; `editedOriginal` the module of the sample that a shot has replaced in
// the page, to put back.
const newShotState = (name) => ({ name, out: null, reference: null, editedOriginal: null });

// A line of output, prefixed with the setup it is from (they run at once).
const say = (name, text) => console.log(`[${name}] ${text}`);
const complain = (name, text) => console.error(`[${name}] ${text}`);

// With --diffs, the difference picture of `before` and `after` (PNG files) for the picture
// `out`, as <out with its folders joined by __><suffix>.png. A failure to write it is said,
// and fails nothing.
function writeDiff(name, out, before, after, { suffix = "", labels } = {}) {
  if (!diffsRoot) return;
  const file = path.join(diffsRoot, `${out.replace(/[\\/]/g, "__").replace(/\.png$/i, "")}${suffix}.png`);
  try {
    mkdirSync(diffsRoot, { recursive: true });
    writeFileSync(file, diffPicture(before, after, labels));
  } catch (e) {
    complain(name, `the difference picture ${file} was not written: ${e.message}`);
  }
}

// The pauses between the captures `capture` takes of one state, in milliseconds: the
// last two let the page rest long enough to settle.
const CAPTURE_GAPS = [150, 150, 300, 600, 1500, 1500];
// How long the page is left alone before the first capture.
const REST_MS = 1000;

// A capture of `clip` (CSS pixels, on whole device pixels) from `conn`, refused
// when the page's visible text holds the user name. `away` first takes the mouse
// where it touches nothing, since a control under it draws its hover look, unless
// the picture is of what the mouse rests on. `keep` makes it a cut-out, on a ground
// of the colour `solid` when that is given.
async function capture(conn, name, clip, { frame, away = null, keep = null, solid = null } = {}) {
  const text = await textOf(conn, frame);
  const at = text.toLowerCase().indexOf(USER.toLowerCase());
  if (at >= 0) {
    const around = `${text.slice(Math.max(0, at - 40), at)}<user>${text.slice(at + USER.length, at + USER.length + 40)}`;
    throw new Error(`the page for ${name} shows the Windows user name: ${JSON.stringify(around)}`);
  }
  if (away) await away();
  await quiet(conn);
  try {
    if (keep) await cutoutOn(conn, keep, solid);
    else await frames(conn);
    // The corner pixels of a rounded box that has just appeared (a menu, a submenu, a
    // dialog) are drawn a grey level differently when the page is captured within about a
    // second of it, and stay so whatever follows. The page changes nothing in that second
    // (no element, class or style changes), so there is no condition to wait for.
    await sleep(REST_MS);
    const params = { format: "png" };
    if (clip) params.clip = { ...clip, scale: 1 };
    // Captures of one unchanged state come out as two or more versions that differ in a
    // few pixels by a few grey levels (the edge of a shadow's blur, of the status bar's
    // scaled Ko-fi icon): the compositor draws them a little differently from frame to
    // frame, which pixels and how often varies from run to run, and no way of taking the
    // capture removes it (captureBeyondViewport and fromSurface:false do, but they also
    // drop the scrollbars and the alpha channel). Some of it also settles only once the
    // page has been left alone for a second or so after the last change, and captures in
    // quick succession do not leave it alone: a submenu's corner pixel, the shadows of a
    // dialog's buttons just after another dialog with large pictures has closed. Nothing in
    // the page says when. So the captures are taken further and further apart
    // (CAPTURE_GAPS), and the picture is the one that equals the file already there when a
    // capture does, else the last capture that equals the one before it; with no file
    // there, the first that does. A picture is rewritten only when the IDE draws something
    // else.
    const want = conn.shot.reference;
    let last = null;
    let agreed = null;
    for (let i = 0; ; i++) {
      const { data } = await conn.send("Page.captureScreenshot", params);
      const png = Buffer.from(data, "base64");
      if (want?.equals(png)) return png;
      if (last && !last.equals(png) && conn.shot.out) {
        writeDiff(conn.shot.name, conn.shot.out, last, png, {
          suffix: `.capture-${i}`,
          labels: { before: `CAPTURE ${i - 1}`, after: `CAPTURE ${i}` },
        });
      }
      if (last?.equals(png)) agreed = png;
      if (agreed && !want) return agreed;
      if (i === CAPTURE_GAPS.length) break;
      last = png;
      await sleep(CAPTURE_GAPS[i]);
    }
    if (agreed) return agreed;
    throw new Error(`the page for ${name} kept changing: no two captures in a row were equal`);
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
    // a closed menu leaves its box in the page, 2 by 8 pixels and empty: the menu is
    // closed once it holds no item
    await waitFor(c, async () => (await menuItems(c)).length === 0, { timeout: 2000, interval: 50 });
  }
  await parkMouse(c);
  await frames(c);
}

// Waits for a menu to open (the box a closed one leaves holds no item), and for it to be
// drawn; false when none opened.
async function menuOpened(c) {
  if (!(await waitFor(c, async () => (await menuItems(c)).length > 0, { timeout: 5000, interval: 50 }))) return false;
  await frames(c);
  return true;
}

// Opens a top-level menu with a real press on its title (the IDE opens on mousedown). With
// `close: false` the Escape that closeMenus may press is left out, for a state Escape would
// undo (a selection in the designer); the caller has closed every menu.
async function openMenu(c, name, { close = true } = {}) {
  if (close) await closeMenus(c);
  const r = await rectOf(c, `#${TOP[name]}`);
  if (!r) throw new Error(`there is no ${name} menu`);
  await clickAt(c, r.x + r.width / 2, r.y + r.height / 2);
  if (!(await menuOpened(c))) throw new Error(`the ${name} menu did not open`);
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
  await frames(c);
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
  await frames(c);
}

// Nothing open: no menu, no dialog, the mouse out of the way.
async function resetUi(c) {
  await closeMenus(c);
  for (let n = (await modals(c)).length; n > 0; n--) {
    await pressKey(c, "Escape");
    await waitFor(c, async () => (await modals(c)).length < n, { timeout: 2000, interval: 50 });
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

// The page at its fixed size and density, IDE_SIZE at SCALE. The page names its scale in a
// class of the body, scale100 at 100%, once, when it has loaded, and draws some icons
// from it (New Project's tiles take 32 px ones at scale100, 48 px ones else): so the
// density changes only once the class is there, and the class must be scale100. An IDE
// opened with no project is attached to before the page has loaded.
async function fixPageSize(c) {
  const scale = await waitFor(c, () => c.evaluate(`document.body?.className.match(/\\bscale\\d+\\b/)?.[0] ?? null`), {
    timeout: 60000,
    interval: 100,
  });
  if (scale !== "scale100") throw new Error(`the IDE's page is at ${scale ?? "no scale"}, not scale100`);
  await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
  await quiet(c);
  await frames(c);
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
  say(run.name, `building ${path.relative(REPO_ROOT, ADDIN)} into a copy of ${ide}`);
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
  say(run.name, `opening ${path.relative(REPO_ROOT, DEMO)}`);
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
  await fixPageSize(c);
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
  say(run.name, `opening ${path.relative(REPO_ROOT, DEMO)}`);
  return run.lane.open(DEMO);
}

async function prepareProject(run) {
  const { c } = run;
  run.step = "shoot";
  await openFile(c, DEMO_FILE, { line: 1, column: 1 });
  run.defaults = JSON.parse(await c.evaluate(PAGE_DEFAULTS));
  await ensureDark(c);
  await fixPageSize(c);
  return { c };
}

// ---- no-project

async function startNoProject(run) {
  run.step = "open";
  say(run.name, "opening the IDE with no project");
  run.lane.includeProjects();
  return run.lane.openNoProject();
}

async function prepareNoProject(run) {
  const { c } = run;
  run.step = "shoot";
  await fixPageSize(c);
  // The splash, then the New / Open Project dialog the IDE starts with. The IDE goes on
  // starting after it shows, with nothing in the page to say when it is done.
  if (!(await waitModal(c, "New / Open", { timeout: 60000 }))) throw new Error("the IDE showed no New / Open dialog");
  await sleep(1000);
  run.defaults = JSON.parse(await c.evaluate(PAGE_DEFAULTS));
  await closeModal(c, "Cancel");
  await ensureDark(c);
  await parkMouse(c);
  await frames(c);
  return { c };
}

// ---- sample: the project made for the pictures

// test/shots/sample is SampleProject, a Standard EXE of a form, a few modules, three
// resources, a string table, a changelog and a licence file, which compiles clean. A
// shot that needs errors edits a module in the page and puts it back. The one file the
// tree does not hold is the template's icon, a binary: it is taken from the install's
// own Standard EXE project, as the New Project dialog would give it.
// The fixture in the work folder, with the template's icon.
function stageSample(run) {
  const src = path.join(run.work, "sample-src");
  cpSync(SAMPLE, src, { recursive: true });
  const template = path.join(run.work, "template");
  unpackProject(path.join(path.dirname(ide), "projects", "_Standard EXE", "projectName.twinproj"), template);
  mkdirSync(path.join(src, "Resources", "ICON"), { recursive: true });
  cpSync(
    path.join(template, "Resources", "ICON", "twinBASIC.ico"),
    path.join(src, "Resources", "ICON", "twinBASIC.ico"),
  );
  return src;
}

async function startSample(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, SAMPLE)}`);
  return run.lane.open(stageSample(run));
}

// The sample with another Settings file, test/shots/settings/<variant>.json: the
// references, the warnings and the aliases a Project Settings picture shows. Without the
// VB package the form cannot compile, so the form and the line that shows it go
// (`keepForm` leaves them, for a variant that has the package). `stage`, a folder, is copied
// onto the project as well.
const startSettings =
  (variant, { keepForm = false, stage = null } = {}) =>
  async (run) => {
    run.step = "open";
    say(run.name, `opening ${path.relative(REPO_ROOT, SAMPLE)} with the ${variant} settings`);
    const src = stageSample(run);
    cpSync(path.join(SETTINGS_FIXTURES, `${variant}.json`), path.join(src, "Settings"));
    if (stage) cpSync(stage, src, { recursive: true });
    if (!keepForm) {
      rmSync(path.join(src, "Sources", "frmMain.twin"));
      rmSync(path.join(src, "Sources", "frmMain.tbform"));
      const main = path.join(src, "Sources", "MainModule.twin");
      writeFileSync(main, readFileSync(main, "utf8").replace("frmMain.Show", 'Debug.Print "Hello"'));
    }
    return run.lane.open(src);
  };

async function prepareSample(run) {
  const { c } = run;
  run.step = "shoot";
  run.defaults = JSON.parse(await c.evaluate(PAGE_DEFAULTS));
  // the Project Explorer starts in the file view whatever the IDE saved (in the page only)
  await c.evaluate("switchToProjectExplorerFileMode()");
  await ensureDark(c);
  await fixPageSize(c);
  await parkMouse(c);
  return { c };
}

// The Fusion references make the compiler write a line to the DEBUG CONSOLE that names
// the temporary folder, so the console is emptied with a click on its Clear button.
async function prepareFusion(run) {
  const ctx = await prepareSample(run);
  const { c } = run;
  await sleep(4000);
  const b = await rectOf(c, '[title="Clear Debug Console"]');
  if (!b) throw new Error("the DEBUG CONSOLE has no Clear button");
  await clickAt(c, b.x + b.width / 2, b.y + b.height / 2);
  await sleep(500);
  await parkMouse(c);
  return ctx;
}

// ---- global-search: Sample 15, the Global Search add-in, built into the copy (never into
// the install, nor into %APPDATA%) and loaded, with the sample's own project open, as the
// pictures have always had it. Its options are saved with SaveSetting, under GS_SETTINGS,
// which the run records first and puts back.

// Builds Sample 15 into the lane's copy of the install, on the setup's second port (the
// building IDE's, as the help setup builds); returns the sample's exported tree.
async function buildGlobalSearch(run) {
  const { lane, ports } = run;
  run.step = "build";
  say(run.name, `building Sample 15, the Global Search add-in, into a copy of ${ide}`);
  // the install is only read: the sample is exported into the work folder
  const src = lane.exportSample("Sample 15");
  await lane.addAddin(src, { show: false, port: ports[1] });
  return src;
}

// Waits for the add-in's button on the toolbar, which says it has loaded.
async function globalSearchLoaded(c) {
  if (!(await waitFor(c, () => rectOf(c, `#${GS_BUTTON}`), { timeout: 30000, interval: 100 }))) {
    throw new Error("the Global Search add-in put no button on the toolbar");
  }
}

async function startGlobalSearch(run) {
  const src = await buildGlobalSearch(run);
  run.step = "open";
  say(run.name, "opening Sample 15");
  return run.lane.open(src);
}

async function prepareGlobalSearch(run) {
  await globalSearchLoaded(run.c);
  return prepareSample(run);
}

// ---- sample6: Sample 6, the CustomControls sample, exported from the install and open

async function startSample6(run) {
  run.step = "open";
  say(run.name, "opening Sample 6");
  return run.lane.open(run.lane.exportSample("Sample 6"));
}

// ---- designer: the sample with test/shots/designer's forms staged onto it (in the work
// folder only: test/shots/sample is not changed, so the sample's pictures do not move), and
// the Global Search add-in built into the copy, as global-search builds it, for the toolbar
// with a form open. MyForm is empty; frmControls holds two command buttons, for the Format
// menu; frmAnchors a TextBox and frmQRCode a QR code. The report is added by the IDE itself,
// as a person adds one (designerShots). A second icon, MyOwnIcon.ico, is the template's icon
// under another name. `forms` is the same project without the add-in, for the pictures of
// the panels with a control (formShots). test/shots/designer/webview2 holds a form with a
// WebView2 control, which only the settings-webview2 setup stages: the others have no
// WebView2 package.

async function startDesigner(run, { addin = true } = {}) {
  if (addin) await buildGlobalSearch(run);
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, SAMPLE)} with ${path.relative(REPO_ROOT, DESIGNER)}`);
  const src = stageSample(run);
  cpSync(DESIGNER, src, { recursive: true, filter: (f) => f !== DESIGNER_WEBVIEW2 });
  const icons = path.join(src, "Resources", "ICON");
  cpSync(path.join(icons, "twinBASIC.ico"), path.join(icons, "MyOwnIcon.ico"));
  return run.lane.open(src);
}

// Every five seconds the page compares the device pixel ratio with the one it loaded at, and
// on a change covers each open designer with RESYNC until it is pressed. The ratio is the
// tool's own (fixPageSize), so the page is told it is the one it has. No designer is open yet.
async function prepareWithDesigners(run) {
  const ctx = await prepareSample(run);
  await run.c.evaluate("currentDPI = window.devicePixelRatio");
  return ctx;
}

async function prepareDesigner(run) {
  await globalSearchLoaded(run.c);
  return prepareWithDesigners(run);
}

const SETUPS = {
  help: { ports: 3, start: startHelp, prepare: prepareHelp },
  "global-search": { ports: 2, start: startGlobalSearch, prepare: prepareGlobalSearch },
  sample6: { ports: 1, start: startSample6, prepare: prepareSample },
  designer: { ports: 2, start: startDesigner, prepare: prepareDesigner },
  forms: { ports: 1, start: (run) => startDesigner(run, { addin: false }), prepare: prepareWithDesigners },
  project: { ports: 1, start: startProject, prepare: prepareProject },
  sample: { ports: 1, start: startSample, prepare: prepareSample },
  settings: { ports: 1, start: startSettings("base"), prepare: prepareSample },
  "settings-symbols": { ports: 1, start: startSettings("symbols"), prepare: prepareSample },
  "settings-webview2": {
    ports: 1,
    start: startSettings("webview2", { keepForm: true, stage: DESIGNER_WEBVIEW2 }),
    prepare: prepareWithDesigners,
  },
  "settings-fusion": { ports: 1, start: startSettings("fusion"), prepare: prepareFusion },
  glyphs: { ports: 1, start: startSample, prepare: prepareSample },
  "no-project": { ports: 1, start: startNoProject, prepare: prepareNoProject },
};

// ---------------------------------------------------------------- the shots of the no-project setup

// A menu, as a cut-out: the bar item and its drop-down, and the submenu of an
// item when one is hovered. The menus carry a 1 px outline outside their
// border box, so the clip is grown by it, which is also what rounds their
// corners: the outline's corner is what fills the pixel the border's curve leaves.
const OUTLINE = 1;
// `before(c)` brings the IDE to the state the menu is shown in, after every menu is closed.
function menuShot(name, top, item = null, { subOnly = false, setup = "no-project", before = null } = {}) {
  return {
    out: `IDE/Menu/Images/${name}.png`,
    setup,
    async take({ c }) {
      await resetUi(c);
      if (before) await before(c);
      try {
        const drop = await openMenu(c, top, { close: !before });
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
      await frames(c);
      await closeMenus(c);
      const bar = await rectOf(c, "#rootMenu1");
      if (!bar) throw new Error("the page has no menu bar");
      return await capture(c, "Menu", snapOut(bar, 611, IDE_SIZE.height), { away: () => parkMouse(c) });
    } finally {
      await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
      await frames(c);
    }
  },
};

const TOP_MODAL = `[...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).pop()`;

// Waits until nothing in the top dialog has changed for `ms` milliseconds, its images are
// decoded and the page's fonts loaded, and two frames are drawn: a dialog that fills itself
// in (Project Settings asks the compiler for its lists) is then done. Says so when the
// dialog was still changing after `timeout`, and goes on. `root`, an expression for another
// element, waits for that one instead.
async function dialogStill(c, { ms = 250, timeout = 5000, root = TOP_MODAL } = {}) {
  const r = await c.evaluate(
    `(async () => {
  const root = ${root};
  if (!root) return "gone";
  const r = await new Promise((done) => {
    let quiet;
    const finish = (v) => { obs.disconnect(); clearTimeout(quiet); clearTimeout(cap); done(v); };
    const obs = new MutationObserver(() => { clearTimeout(quiet); quiet = setTimeout(() => finish("still"), ${ms}); });
    obs.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    quiet = setTimeout(() => finish("still"), ${ms});
    const cap = setTimeout(() => finish("moving"), ${timeout});
  });
  await document.fonts.ready;
  await Promise.all([...root.querySelectorAll("img")].map((i) => i.decode().catch(() => {})));
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return r;
})()`,
    { awaitPromise: true, timeout: timeout + 10000 },
  );
  if (r === "moving") {
    say(
      c.shot.name,
      `  the ${root === TOP_MODAL ? "dialog" : "designer"} was still changing after ${timeout / 1000} s`,
    );
  }
}

// The top dialog's box, opaque (its shadow falls outside), or `clipOf(box)` of it.
// `annotate`, a shot's list of primitives (lib/shot-annotate.mjs), is drawn over
// the page for the capture and taken off again however that goes; the clip grows to
// hold what it drew.
async function dialogShot(c, name, clipOf = (m) => m, annotate = null) {
  await c.evaluate("document.activeElement?.blur?.()");
  await frames(c);
  const box = (await modals(c)).pop();
  if (!box) throw new Error(`no dialog is open for ${name}`);
  let area = await clipOf(box);
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

// Opens a dialog by its command and returns once its title is in and it has stopped
// changing for `still` milliseconds; `run` takes the picture and the dialog is closed
// with `close` however that goes.
async function inDialog(c, { command: id, title, close, still = 250, timeout = 10000 }, run) {
  await resetUi(c);
  await command(c, id);
  if (!(await waitModal(c, title, { timeout }))) throw new Error(`the dialog "${title}" did not open`);
  await dialogStill(c, { ms: still });
  try {
    return await run();
  } finally {
    await closeModal(c, close).catch(async () => {
      const n = (await modals(c)).length;
      await pressKey(c, "Escape");
      await waitFor(c, async () => (await modals(c)).length < n, { timeout: 2000, interval: 50 });
    });
  }
}

// The New / Open Project dialog, with no VB6 tab (the tool's own recent lists).
const inNewProject = (c, run) => inDialog(c, { command: "tbProject_New", title: "New / Open", close: "Cancel" }, run);

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
  await dialogStill(c);
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
  await frames(c);
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
    await dialogStill(c);
    await clickInModal(c, "Recent", ".buttonGroupItem");
    await dialogStill(c);
  }),
  newProjectShot("New_Project_Recent_2", async (c) => {
    // blank names, as the picture has always had
    await setRecents(c, [
      { name: " ", projectPath: "x1" },
      { name: " ", projectPath: "x2" },
    ]);
    await clickInModal(c, "New", ".buttonGroupItem");
    await dialogStill(c);
    await clickInModal(c, "Recent", ".buttonGroupItem");
    await dialogStill(c);
  }),
  {
    out: dialogOut("IDE", "Components_Message"),
    setup: "no-project",
    take: ({ c }) =>
      inDialog(c, { command: "tbToolbox_ShowMoreComponents", title: "twinBASIC", close: "OK" }, () =>
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
        await frames(c);
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
          await dialogStill(c);
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
        await dialogStill(c);
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
    await frames(c);
    return await fn();
  } finally {
    await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
    await frames(c);
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
  const hovered = () => c.evaluate(`document.getElementById("statusHoveringCommand").innerText`);
  await waitFor(c, async () => (await hovered()) === "tbProject_Close", { timeout: 2000, interval: 50 });
  await pressKey(c, "Escape");
  // a closed menu leaves its box in the page, 2 by 8 pixels and empty
  if (!(await waitFor(c, async () => (await menuItems(c)).length === 0, { timeout: 2000, interval: 50 }))) {
    throw new Error("the File menu did not close");
  }
  const { w, h } = await c.evaluate("({ w: innerWidth, h: innerHeight })");
  await mouseMove(c, w / 2, h / 2);
  await frames(c);
  const named = await hovered();
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

// The toolbar: the first ancestor of the Preview button that spans the window.
async function toolbarRect(c) {
  const bar = await c.evaluate(`(() => {
  let e = document.getElementById("toolbarPreviewBtn");
  while (e && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement;
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
  if (!bar || bar.height > 60) throw new Error(`no toolbar found: ${JSON.stringify(bar)}`);
  return bar;
}

// The toolbar at the width of its buttons, the close button of the bar at its right.
const TOOLBAR_WIDTH = 1128;
const toolbarShot = {
  out: "IDE/Images/Toolbar_1.png",
  setup: "no-project",
  take: ({ c }) =>
    atSize(c, TOOLBAR_WIDTH, IDE_SIZE.height, async () =>
      capture(c, "Toolbar_1", snapOut(await toolbarRect(c), TOOLBAR_WIDTH, IDE_SIZE.height), {
        away: () => parkMouse(c),
      }),
    ),
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
  "CALL STACK": "CallStack",
  TOOLBOX: "Toolbox",
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

// The IDE flashes a panel it shows (its flashDiv): a class for a second, whose animation
// the quiet style sheet turns off. The panel is laid out at its size once the class has
// gone and two frames are drawn.
// Takes a panel out of the layout if it is docked there.
async function undock(c, id) {
  const docked = () => c.evaluate(`isPanelIdDocked(${JSON.stringify(id)})`);
  if (!(await docked())) return;
  await panelCommand(c, id, "Hide");
  if (!(await waitFor(c, async () => !(await docked()), { timeout: 5000, interval: 50 }))) {
    throw new Error(`the ${id} panel would not leave the layout`);
  }
}

async function floatPanel(c, id, { width, height, left = 140, top = 120 }) {
  await undock(c, id);
  await panelCommand(c, id, "Show");
  const sel = panelSel(id);
  if (!(await waitFor(c, () => rectOf(c, sel), { timeout: 5000, interval: 50 }))) {
    throw new Error(`the ${id} panel did not appear`);
  }
  await c.evaluate(`(() => {
  const p = document.querySelector(${JSON.stringify(sel)});
  Object.assign(p.style, { left: "${left}px", top: "${top}px", width: "${width}px", height: "${height}px" });
})()`);
  const flashing = () =>
    c.evaluate(`!!document.querySelector(${JSON.stringify(`${sel}.flashElement, ${sel} .flashElement`)})`);
  if (!(await waitFor(c, async () => !(await flashing()), { timeout: 5000, interval: 50 }))) {
    throw new Error(`the ${id} panel never stopped flashing`);
  }
  await frames(c);
  return rectOf(c, sel);
}

async function unfloatPanel(c, id) {
  const sel = panelSel(id);
  if (await rectOf(c, sel)) {
    await panelCommand(c, id, "Hide");
    await waitFor(c, async () => !(await rectOf(c, sel)), { timeout: 5000, interval: 50 });
  }
  await frames(c);
}

// A panel on its own, sized to hold its title bar and the start of its body. With a
// project open (`setup: "sample"`), `before(c)` brings the IDE to a state before the panel
// floats, `prepare(c)` brings the panel to the state shown once it floats, and
// `clipOf(box)` takes a part of the panel in place of the whole.
const panelShot = (
  name,
  id,
  [width, height],
  {
    setup = "no-project",
    out = `IDE/Images/${name}.png`,
    before = null,
    prepare = null,
    restore = null,
    clipOf = (box) => box,
    away = true,
  } = {},
) => ({
  out,
  setup,
  async take({ c }) {
    await resetUi(c);
    try {
      if (before) await before(c);
      let box = await floatPanel(c, id, { width, height });
      if (prepare) {
        await prepare(c);
        box = await rectOf(c, panelSel(id));
      }
      return await capture(c, name, snapOut(await clipOf(box, c)), { away: away ? () => parkMouse(c) : null });
    } finally {
      if (restore) await restore(c);
      await unfloatPanel(c, id);
    }
  },
});

// A panel with annotations: the panel (and the menu `open` shows, if any) on a plain ground
// of the colour of its own body, the annotations drawn over, and the clip as large as they
// need. Labels sit on the ground at the panel's left; the primitives are those of
// lib/shot-annotate.mjs. With none, it is the panel and its menu on that ground; `away:
// false` leaves the mouse where `open` put it, for a menu item's hover look.
function annotatedPanelShot(
  name,
  id,
  size,
  {
    open = null,
    annotate = [],
    setup = "no-project",
    out = `IDE/Images/${name}.png`,
    before = null,
    after = null,
    away = true,
  },
) {
  return {
    out,
    setup,
    async take({ c }) {
      await resetUi(c);
      const sel = panelSel(id);
      try {
        const box = await floatPanel(c, id, { ...size, left: 280 });
        if (before) await before(c);
        // the body's colour, as the first of it and its ancestors that is not transparent
        const ground = await c.evaluate(`(() => {
  // the Toolbox has no sectionBody: the panel's own then
  const body = document.querySelector(${JSON.stringify(`${sel} .sectionBody`)}) ?? document.querySelector(${JSON.stringify(sel)});
  for (let e = body; e; e = e.parentElement) {
    const k = getComputedStyle(e).backgroundColor;
    if (!/^rgba\\(.*, 0\\)$/.test(k) && k !== "transparent") return k;
  }
  return null;
})()`);
        if (!ground) throw new Error(`the ${id} panel has no background colour`);
        if (open) await open(c);
        const menu = open ? await rectOf(c, "#contextMenu") : null;
        // an empty submenu leaves a box of a few pixels in the page
        const submenu = open && (await menuItems(c, true)).length ? await rectOf(c, "#contextMenuSUB") : null;
        let area = menu ? union(box, menu) : box;
        if (submenu) area = union(area, submenu);
        try {
          const { box: drawn } = annotate.length ? await annotateOver(c, annotate) : { box: null };
          area = grow(drawn ? union(area, drawn) : area, 8);
          return await capture(c, name, snapOut(area), {
            away: away ? () => parkMouse(c) : null,
            keep: [sel, "#contextMenu", "#contextMenuSUB", `#${LAYER_ID}`],
            solid: ground,
          });
        } finally {
          await unannotate(c);
          await closeMenus(c);
        }
      } finally {
        if (after) await after(c);
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
      if (!(await menuOpened(c))) throw new Error("the Options menu did not open");
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

// ---- the panels and the editor of the sample project

const PE = panelSel("PROJECT EXPLORER");

// A row of the Project Explorer's tree, floating or docked: its box, its name's box, its
// expander's box and whether it is open. With `after`, the first row named `text` below the
// row named `after` (a package's Miscellaneous, not the project's).
const PE_SCOPE = `(document.querySelector(${JSON.stringify(PE)}) ||
  [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "PROJECT EXPLORER")?.closest(".toolWindowContainer"))`;
const peNode = (c, text, after = null) =>
  c.evaluate(`(() => {
  const rows = [...${PE_SCOPE}.querySelectorAll(".itemNode")];
  const from = ${JSON.stringify(after)} === null ? 0 : rows.findIndex((e) => e.textContent.trim() === ${JSON.stringify(after)}) + 1;
  const n = from > 0 || ${JSON.stringify(after)} === null ? rows.slice(from).find((e) => e.textContent.trim() === ${JSON.stringify(text)}) : null;
  if (!n) return null;
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const icon = n.parentElement.querySelector(".treeNodeIcon");
  return { row: box(n.parentElement), name: box(n), icon: icon && box(icon), open: !!icon && icon.className.includes("iconCollapse") };
})()`);

async function peFind(c, text, after = null) {
  const n = await peNode(c, text, after);
  if (!n) throw new Error(`the Project Explorer has no row "${text}"${after ? ` below "${after}"` : ""}`);
  return n;
}

// Opens or closes a folder of the tree with a real click on its expander, and waits for
// the tree to show it. The row has to be in the panel's view: the click lands on what is
// drawn there. `after` as peNode takes it.
async function peOpen(c, text, want, after = null) {
  // the row is there once the tree has drawn
  const n = await waitFor(c, () => peNode(c, text, after).catch(() => null), { timeout: 5000, interval: 50 });
  if (!n) throw new Error(`the Project Explorer has no row "${text}"`);
  if (n.open === want) return;
  await clickAt(c, n.icon.x + n.icon.width / 2, n.icon.y + n.icon.height / 2);
  if (!(await waitFor(c, async () => (await peFind(c, text, after)).open === want, { timeout: 3000, interval: 50 }))) {
    throw new Error(`the click on the expander of "${text}" did not ${want ? "open" : "close"} it`);
  }
  await frames(c);
}

// Selects a row with a real click on its name (which toggles a folder as well).
async function peSelect(c, text) {
  const n = await peFind(c, text);
  await clickAt(c, n.name.x + n.name.width / 2, n.name.y + n.name.height / 2);
  await frames(c);
}

const peHeader = (box, c) =>
  rectOf(c, `${PE} .sectionHeader`).then((h) => ({
    x: box.x,
    y: box.y,
    width: box.width,
    height: h.y + h.height - box.y + 1,
  }));

const headerButton = (id, title) => `${panelSel(id)} .sectionHeader [title^="${title}"]`;

// ---- the editor's tabs

const TABS_BUTTON = ".codicon-triangle-down[title='Tabs List']";
const SAMPLE_FILE = (rest) => `/SampleProject/${rest}`;
const RESOURCES = ["Resources/MANIFEST/#1.xml", "Resources/STRING/Strings.json", "Resources/MESSAGETABLE/Strings.json"];

// The tabs of the editor, left to right: name and the boxes of the tab and its close icon.
const editorTabs = (c) =>
  c.evaluate(`(() => [...document.querySelectorAll(".tabItem")].map((t) => {
    const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { name: t.querySelector(".tabItemText").textContent.trim(), tab: box(t), close: box(t.querySelector(".tabItemIconRight")) };
  }).filter((t) => t.tab.width))()`);

// Closes the tabs whose names are not in `keep`, each with a real click on its close icon
// (a tab that is closed any other way is not in the Tabs List's Recently Closed). With
// `discard`, a tab that asks whether to save its changes is closed with Discard Changes: the
// changes are the page's own (after the Format menu's pictures the designer has marked
// frmControls changed, though no control has moved), and nothing is saved either way.
async function closeTabs(c, keep = [], { discard = false } = {}) {
  for (let n = 0; n < 20; n++) {
    const tabs = await editorTabs(c);
    const t = tabs.find((x) => !keep.includes(x.name));
    if (!t) return;
    await clickAt(c, t.close.x + t.close.width / 2, t.close.y + t.close.height / 2);
    const closed = async () => (await editorTabs(c)).length < tabs.length;
    const asked = async () => (await modals(c)).some((m) => m.title === "twinBASIC");
    await waitFor(c, async () => (await closed()) || (discard && (await asked())), { timeout: 3000, interval: 50 });
    if (discard && !(await closed()) && (await asked())) {
      await closeModal(c, "Discard Changes");
      await waitFor(c, closed, { timeout: 3000, interval: 50 });
    }
  }
  const left = (await editorTabs(c)).map((t) => t.name);
  const asked = await c.evaluate(`${TOP_MODAL}?.innerText.replace(/\\s+/g, " ") ?? ""`);
  throw new Error(`the editor's tabs would not close: ${left.join(", ")}${asked ? `; a dialog: ${asked}` : ""}`);
}

async function openTabsList(c) {
  await resetUi(c);
  const b = await rectOf(c, TABS_BUTTON);
  if (!b) throw new Error("the editor has no Tabs List button");
  await clickAt(c, b.x + b.width / 2, b.y + b.height / 2);
  if (!(await menuOpened(c))) throw new Error("the Tabs List did not open");
}

// Three resource files opened and closed, in the order the pictures list them.
async function closedResources(ctx) {
  if (ctx.resourcesClosed) return;
  const { c } = ctx;
  await closeTabs(c);
  // the list shows the last one closed first
  for (const f of [...RESOURCES].reverse()) {
    await openFile(c, SAMPLE_FILE(f));
    await sleep(400);
    await closeTabs(c);
  }
  ctx.resourcesClosed = true;
}

// The Tabs List menu as a cut-out: the menu, and the button and the submenu when asked.
function tabsListShot(name, { button = false, submenu = false, open = async () => {} }) {
  return {
    out: `IDE/Images/${name}.png`,
    setup: "sample",
    async take(ctx) {
      const { c } = ctx;
      await closedResources(ctx);
      await open(c);
      try {
        await openTabsList(c);
        const menu = await rectOf(c, "#contextMenu");
        const sub = submenu ? await hoverItem(c, "Recently Closed") : null;
        let area = grow(menu, OUTLINE);
        if (button) area = union(area, grow(await rectOf(c, TABS_BUTTON), 1));
        if (sub) area = union(area, grow(sub, OUTLINE));
        return await capture(c, name, snapOut(area), {
          keep: ["#contextMenu", ...(sub ? ["#contextMenuSUB"] : []), ...(button ? [TABS_BUTTON] : [])],
        });
      } finally {
        await closeMenus(c);
      }
    },
  };
}

// ---- the mouse pointer, which a capture does not hold

const drawPointer = (c, tip) =>
  c.evaluate(`(() => {
  const d = document.createElement("div");
  d.id = "tbShotPointer";
  d.style.cssText = "position:fixed;left:${tip.x}px;top:${tip.y}px;width:12px;height:19px;pointer-events:none;z-index:2147483647";
  d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="19" viewBox="0 0 12 19"><path d="M0.5 0.5 V15.5 L4 12.3 L6.6 18.3 L9 17.3 L6.4 11.4 H11.4 Z" fill="#fff" stroke="#000" stroke-width="1" stroke-linejoin="round"/></svg>';
  document.body.appendChild(d);
})()`);
const removePointer = (c) => c.evaluate(`document.getElementById("tbShotPointer")?.remove()`);

// ---- the sample's own pictures

// A capture of a part of the page, with the annotations over it if any, the clip grown to
// hold them.
async function annotatedClip(c, name, area, annotate = null, options = {}) {
  try {
    if (annotate) {
      const { box } = await annotateOver(c, annotate);
      if (box) area = union(area, box);
    }
    return await capture(c, name, snapOut(area), { away: () => parkMouse(c), ...options });
  } finally {
    if (annotate) await unannotate(c);
  }
}

// ---- History: its times are the page's own clock, so the page's clock is set for the
// edits that make its entries and the time zone is London's, as the old pictures'

const FAKE_CLOCK = (iso) => `(() => {
  const Real = window.tbRealDate || Date;
  window.tbRealDate = Real;
  const T = new Real(${JSON.stringify(iso)}).getTime();
  window.Date = class extends Real {
    constructor(...a) { if (a.length === 0) super(T); else super(...a); }
    static now() { return T; }
  };
})()`;
const REAL_CLOCK = "(() => { if (window.tbRealDate) window.Date = window.tbRealDate; })()";

// A property of the form, typed into its cell in the Properties panel: `keys` pressed at the
// end of the Caption.
async function editCaption(c, key) {
  const cell = await c.evaluate(`(() => {
  const n = [...document.querySelectorAll(".propertyName")].find((e) => e.textContent.trim() === "Caption");
  if (!n) return null;
  const r = n.nextElementSibling.getBoundingClientRect();
  return { x: r.x + 20, y: r.y + r.height / 2 };
})()`);
  if (!cell) throw new Error("the Properties panel has no Caption");
  await clickAt(c, cell.x, cell.y);
  await sleep(400);
  await pressKey(c, "End");
  await pressKey(c, key);
  await pressKey(c, "Enter");
  await sleep(1200);
}

// Two entries: the code edited at 16:41 and then the form at 18:02, as the old pictures had
// them (the list shows the newest first).
async function makeHistory(ctx) {
  if (ctx.history) return;
  const { c } = ctx;
  await c.send("Emulation.setTimezoneOverride", { timezoneId: "Europe/London" });
  try {
    await c.evaluate(FAKE_CLOCK("2026-01-09T16:41:58Z"));
    await openFile(c, SAMPLE_FILE("Sources/frmMain.twin"), { line: 4, column: 1 });
    await setCursor(c, 4, 1);
    await pressKey(c, " ");
    await sleep(300);
    await pressKey(c, "Backspace");
    await sleep(1500);
    await c.evaluate(FAKE_CLOCK("2026-01-09T18:02:51Z"));
    await openFile(c, SAMPLE_FILE("Sources/frmMain.tbform"));
    await sleep(1200);
    await editCaption(c, " ");
    await editCaption(c, "Backspace");
  } finally {
    await c.evaluate(REAL_CLOCK);
    await c.send("Emulation.setTimezoneOverride", { timezoneId: "" });
  }
  ctx.history = true;
}

// The HISTORY panel on its own; with `row`, the pointer on that row (0 the newest) and the
// IDE's own tooltip, in the picture.
function historyShot(name, row = null) {
  return {
    out: `IDE/Images/${name}.png`,
    setup: "sample",
    async take(ctx) {
      const { c } = ctx;
      await makeHistory(ctx);
      await resetUi(c);
      try {
        // wider than the tooltip when there is one, so that no editor shows beside the panel
        const box = await floatPanel(c, "HISTORY", {
          width: row === null ? 300 : 360,
          height: row === null ? 96 : 120,
        });
        let area = box;
        if (row === null) return await capture(c, name, snapOut(area), { away: () => parkMouse(c) });
        const r = await c.evaluate(`(() => {
  const rows = [...document.querySelectorAll('${panelSel("HISTORY")} .treeItemInner')].map((e) => e.getBoundingClientRect()).sort((a, b) => a.y - b.y);
  const e = rows[${row}];
  return { x: e.x, y: e.y, width: e.width, height: e.height };
})()`);
        const tip = { x: r.x + 80, y: r.y + r.height / 2 };
        // the tooltip of an earlier hover may still be showing: it goes when the pointer is away
        await parkMouse(c);
        await waitFor(c, async () => !(await rectOf(c, "#hoverTooltip.visibleTooltip")), {
          timeout: 4000,
          interval: 200,
        });
        await mouseMove(c, tip.x - 2, tip.y);
        await mouseMove(c, tip.x, tip.y);
        // the IDE's own tooltip, which it shows about a second after the pointer rests
        // (the entries are listed newest first: the form's, then the code's)
        const named = ["frmMain.tbform", "frmMain.twin"][row];
        const tooltip = await waitFor(
          c,
          async () =>
            (await c.evaluate(
              `document.querySelector("#hoverTooltip.visibleTooltip")?.innerText.includes(${JSON.stringify(named)})`,
            )) && rectOf(c, "#hoverTooltip.visibleTooltip"),
          { timeout: 6000, interval: 200 },
        );
        if (!tooltip) throw new Error(`the History entry showed no tooltip for ${named}`);
        await sleep(400);
        await drawPointer(c, { x: tip.x + 1, y: tip.y });
        area = union(union(box, tooltip), { x: tip.x, y: tip.y, width: 12, height: 19 });
        return await capture(c, name, snapOut(area));
      } finally {
        await removePointer(c);
        // the tooltip logic wants the pointer to have rested elsewhere before it shows another
        await mouseMove(c, IDE_SIZE.width / 2, IDE_SIZE.height / 2);
        await sleep(1500);
        await unfloatPanel(c, "HISTORY");
        await parkMouse(c);
      }
    },
  };
}

const PE_ROW = (text) => ({ css: `${PE} .itemNode`, text, own: true });
const CS_THREAD = { css: `${panelSel("CALL STACK")} .itemNode`, text: "MAIN_THREAD [IDLE]", own: true };
const DIAG_ITEM = (id) => ({ css: `${DIAG} #${id}` });

// The Project Explorer's file view toggle, a real click on its button.
async function toggleFileView(c) {
  const b = await rectOf(c, headerButton("PROJECT EXPLORER", "Toggle file view"));
  await clickAt(c, b.x + b.width / 2, b.y + b.height / 2);
  await sleep(900);
}

// ---- text of a module of the page, replaced and put back

const DIAG_TWO_ERRORS = `Module MainModule

    DefInt A-C

    Public Sub Main()
        ReDim items(3)
        frmMain.Show
        hMenu = 1
        hr = 2
    End Sub

End Module
`;
const FIVE_ERRORS = `[Description("The sample's main window")]
[FormDesignerId("5C0F8A71-3B2E-4D69-8A14-7E91C2D4B601")]
[PredeclaredId]
Class frmMain

    Sub New()
        hr = 0
        hMenu = 1
        hMenu = 2
        hMenu = 3
        hMenu = 4
    End Sub

End Class
`;

const diagCounts = (c) =>
  c.evaluate(
    `["errorCount", "warningCount", "hintCount", "infoCount"].map((i) => Number(document.getElementById(i).innerText))`,
  );

// Waits for the Diagnostics counts to be `want` and to stay so for a second and a half.
async function waitCounts(c, want) {
  let since = 0;
  const ok = await waitFor(
    c,
    async () => {
      const now = (await diagCounts(c)).join();
      if (now !== want.join()) {
        since = 0;
        return false;
      }
      since ||= Date.now();
      return Date.now() - since > 1500;
    },
    { timeout: 30000, interval: 300 },
  );
  if (!ok) throw new Error(`the diagnostics never settled at ${want.join(",")}: ${(await diagCounts(c)).join(",")}`);
}

async function editText(c, text, counts, file = "Sources/MainModule.twin") {
  await openFile(c, SAMPLE_FILE(file));
  c.shot.editedOriginal = { file, text: await editorText(c) };
  await c.evaluate(`editor.getModel().setValue(${JSON.stringify(text)})`);
  await waitCounts(c, counts);
}

async function restoreText(c) {
  if (!c.shot.editedOriginal) return;
  const { file, text } = c.shot.editedOriginal;
  c.shot.editedOriginal = null;
  await openFile(c, SAMPLE_FILE(file));
  await c.evaluate(`editor.getModel().setValue(${JSON.stringify(text)})`);
  await waitCounts(c, [0, 0, 0, 0]);
}

const PUBLISH_BUTTON = { css: `${panelSel("PACKAGE PUBLISHING")} .packageManagerPublish` };

// Right click on a row of the Project Explorer, on the middle of its name or, `atEnd`, on
// its last letters: its menu opens at the pointer.
async function peRightClick(c, text, { atEnd = false } = {}) {
  const n = await peFind(c, text);
  const x = atEnd ? n.name.x + n.name.width - 6 : n.name.x + n.name.width / 2;
  const y = n.name.y + n.name.height / 2;
  await mouseMove(c, x, y);
  await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "right", buttons: 2, clickCount: 1 });
  await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "right", buttons: 0, clickCount: 1 });
  if (!(await menuOpened(c))) throw new Error(`the context menu of "${text}" did not open`);
}

// Once the form designer has been shown, the page draws a border at a fractional position a
// grey level or two differently, for good (the page's own drawing changes; the layout does
// not). A picture of the sample taken after the first that opens the form, in the table's
// order, opens the form first, so that it comes out the same in a part of the setup.
const formShown = (c) => openFile(c, SAMPLE_FILE("Sources/frmMain.tbform"));

// The layout the sample's later pictures are of: without the side panels its earlier
// pictures float (a docked panel leaves the layout when it floats).
const sampleLayout = async (c) => {
  for (const id of ["OPEN EDITORS", "HISTORY", "TOOLBOX", "PROJECT EXPLORER", "WATCHES"]) await undock(c, id);
};

// Closes a floating panel that is showing, whatever the command that opened it.
async function closePanelIfShown(c, id) {
  const close = await rectOf(c, `${panelSel(id)} .sectionHeader .codicon-close`);
  if (close) await clickAt(c, close.x + close.width / 2, close.y + close.height / 2);
  await sleep(300);
}

const sampleShots = [
  tabsListShot("Editor_TabsList_RecentlyClosed", { button: true }),
  tabsListShot("Editor_TabsList_RecentlyClosed_Example", { button: true, submenu: true }),
  tabsListShot("Editor_TabsList_Example", {
    async open(c) {
      await openFile(c, SAMPLE_FILE("Sources/frmMain.tbform"));
      await sleep(600);
    },
  }),
  // ---- with the Project Explorer docked, as the layout has it: before a picture floats it
  {
    // the editor and the Project Explorer, the string table open and its folder shown
    out: "Miscellaneous/Images/97cc8655-7a8b-47f3-b52c-eb1ddfce662f.png",
    setup: "sample",
    take: ({ c }) =>
      atSize(c, 1160, IDE_SIZE.height, async () => {
        await closeTabs(c);
        for (const f of ["Sources/frmMain.twin", "Sources/frmMain.tbform", "Sources/MainModule.twin", RESOURCES[1]]) {
          await openFile(c, SAMPLE_FILE(f));
          await sleep(500);
        }
        for (const folder of ["Resources", "ICON", "MANIFEST", "STRING"]) await peOpen(c, folder, true);
        await peSelect(c, "Strings.json");
        await sleep(500);
        const ed = await c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "EDITOR 1");
  const r = h.closest(".toolWindowContainer").getBoundingClientRect();
  return { x: r.x, y: r.y };
})()`);
        return capture(
          c,
          "97cc8655",
          snapOut({ x: ed.x, y: ed.y, width: 1160 - ed.x, height: 417 }, 1160, IDE_SIZE.height),
          {
            away: () => parkMouse(c),
          },
        );
      }),
  },
  {
    // a window crop: the right of the title bar, the toolbar, the editor's tab and the Project Explorer
    out: "Miscellaneous/Images/71ddde83-a091-47e3-b5b8-681954b0639d.png",
    setup: "sample",
    async take({ c }) {
      await resetUi(c);
      await closeTabs(c);
      await openFile(c, SAMPLE_FILE("Sources/MainModule.twin"));
      await sleep(500);
      for (const folder of ["Resources", "ICON", "MANIFEST"]) await peOpen(c, folder, true);
      await peOpen(c, "STRING", false);
      await peOpen(c, "MESSAGETABLE", false);
      return capture(c, "71ddde83", snapOut({ x: 340, y: 0, width: 940, height: 426 }), { away: () => parkMouse(c) });
    },
  },
  {
    // a right click on the Sources folder: the menu and the Add submenu, as a cut-out
    out: "IDE/Images/RightClick-Add.png",
    setup: "sample",
    async take({ c }) {
      await resetUi(c);
      try {
        await peOpen(c, "Sources", true);
        await peRightClick(c, "Sources");
        const sub = await hoverItem(c, "Add");
        const menu = await rectOf(c, "#contextMenu");
        return await capture(c, "RightClick-Add", snapOut(grow(union(menu, sub), OUTLINE)), {
          keep: ["#contextMenu", "#contextMenuSUB"],
        });
      } finally {
        await closeMenus(c);
      }
    },
  },
  {
    // Add CustomControls Form asks for the package first
    out: "IDE/Images/RightClick-Add-CustomControlsForm-Popup.png",
    setup: "sample",
    async take({ c }) {
      await resetUi(c);
      await peRightClick(c, "Sources");
      await hoverItem(c, "Add");
      const items = await menuItems(c, true);
      const it = items.find((i) => i.text.startsWith("Add CustomControls Form"));
      if (!it) throw new Error("the Add submenu has no Add CustomControls Form");
      await mouseMove(c, it.x + 20, it.y + it.height / 2);
      await frames(c);
      await clickAt(c, it.x + 20, it.y + it.height / 2);
      if (!(await waitModal(c, "twinBASIC", { timeout: 5000 }))) throw new Error("no Package needed message appeared");
      await dialogStill(c);
      try {
        return await dialogShot(c, "RightClick-Add-CustomControlsForm-Popup");
      } finally {
        await closeModal(c, "Cancel").catch(() => pressKey(c, "Escape"));
      }
    },
  },
  panelShot("OpenEditors_1", "OPEN EDITORS", [360, 92], {
    setup: "sample",
    async prepare(c) {
      await closeTabs(c);
      await openFile(c, SAMPLE_FILE("Sources/frmMain.tbform"));
      await openFile(c, SAMPLE_FILE("Sources/frmMain.twin"));
      await sleep(600);
    },
  }),
  historyShot("History_1"),
  historyShot("History_2", 0),
  historyShot("History_3", 1),
  {
    // the Toolbox with a form open, as tall as its list: More components is at the end
    out: "IDE/Images/Toolbox_MoreComponents.png",
    setup: "sample",
    async take({ c }) {
      await resetUi(c);
      await openFile(c, SAMPLE_FILE("Sources/frmMain.tbform"));
      await sleep(1000);
      try {
        await floatPanel(c, "TOOLBOX", { width: 210, height: 800, top: 40 });
        const b = await rectOf(c, ".toolboxMoreComponents");
        if (!b) throw new Error("the Toolbox has no More components item");
        return await capture(c, "Toolbox_MoreComponents", snapOut(b), { away: () => parkMouse(c) });
      } finally {
        await unfloatPanel(c, "TOOLBOX");
      }
    },
  },
  {
    // Find / Replace with its Current File scope, on a line that holds no word to search for
    out: "IDE/Images/FindReplace.png",
    setup: "sample",
    async take({ c }) {
      await resetUi(c);
      await openFile(c, SAMPLE_FILE("Sources/frmMain.twin"));
      await setCursor(c, 5, 1);
      await pressKey(c, "h", { ctrl: true });
      const sel = panelSel("FIND REPLACE");
      if (!(await waitFor(c, () => rectOf(c, sel), { timeout: 5000, interval: 100 }))) {
        throw new Error("Ctrl+H did not show the Find / Replace panel");
      }
      await sleep(800);
      try {
        const label = await c.evaluate(`(() => {
  const e = [...document.querySelectorAll(${JSON.stringify(`${sel} *`)})].find((x) => x.children.length === 0 && x.textContent.trim() === "Current File");
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
        await clickAt(c, label.x, label.y);
        await sleep(400);
        return await capture(c, "FindReplace", snapOut(await rectOf(c, sel)), { away: () => parkMouse(c) });
      } finally {
        await pressKey(c, "Escape");
        await sleep(400);
        await closePanelIfShown(c, "FIND REPLACE");
      }
    },
  },
  {
    // the toolbar crop, a ring on the Build button
    out: "Features/Packages/Images/4d90f313-35d5-426d-8fc3-852ca03382fa.png",
    setup: "sample",
    async take({ c }) {
      await resetUi(c);
      const b = await rectOf(c, "#buildIcon");
      if (!b) throw new Error("the toolbar has no Build button");
      const area = { x: b.x + b.width / 2 - 190, y: 0, width: 323, height: b.y + b.height + 34 };
      return annotatedClip(c, "4d90f313", area, [{ type: "ring", on: { css: "#buildIcon" } }]);
    },
  },
  panelShot("ProjectExplorer_Sample", "PROJECT EXPLORER", [400, 200], {
    setup: "sample",
    async prepare(c) {
      // a click on a folder's name may toggle it as well as select it: selected, then closed
      await peOpen(c, "Resources", false);
      await peOpen(c, "Sources", true);
      await peSelect(c, "Sources");
      await sleep(400);
      await peOpen(c, "Sources", false);
    },
  }),
  panelShot("ProjectExplorer_Header", "PROJECT EXPLORER", [400, 200], {
    setup: "sample",
    clipOf: peHeader,
  }),
  // the file view's toggle under the mouse, as it looks on a hover
  panelShot("b000d3aa", "PROJECT EXPLORER", [296, 200], {
    setup: "sample",
    out: "Features/Images/b000d3aa-3689-4d94-88e3-bca44f8b7de6.png",
    away: false,
    async prepare(c) {
      const b = await rectOf(c, headerButton("PROJECT EXPLORER", "Toggle file view"));
      await mouseMove(c, b.x + b.width / 2, b.y + b.height / 2);
      await sleep(400);
    },
    clipOf: peHeader,
  }),
  panelShot("Watches_1", "WATCHES", [300, 76], { setup: "sample" }),
  panelShot("Watches_2", "WATCHES", [300, 76], {
    setup: "sample",
    async prepare(c) {
      const b = await rectOf(c, headerButton("WATCHES", "Add Watch"));
      await clickAt(c, b.x + b.width / 2, b.y + b.height / 2);
      await sleep(600);
    },
  }),
  panelShot("PackagePublishing_1", "PACKAGE PUBLISHING", [300, 330], { setup: "sample", before: formShown }),
  {
    // the panel as it shows over the editor, with the code of the project behind it
    out: "Features/Packages/Images/9eeffbcf-d73e-4a92-bce5-811ed60aba98.png",
    setup: "sample",
    async take({ c }) {
      await resetUi(c);
      // The window behind the panel as the picture shows it: the later layout, and the form,
      // its code and the module open, in that order.
      // Only the tabs that should not be there are closed: the History pictures have edited
      // the form and its code (and put them back), and closing either asks to save it.
      await sampleLayout(c);
      await closeTabs(c, ["frmMain.tbform", "frmMain.twin", "MainModule.twin"]);
      for (const f of ["Sources/frmMain.tbform", "Sources/frmMain.twin", "Sources/MainModule.twin"]) {
        await openFile(c, SAMPLE_FILE(f));
      }
      await frames(c);
      try {
        const box = await floatPanel(c, "PACKAGE PUBLISHING", { width: 300, height: 330, left: 300 });
        return await capture(c, "9eeffbcf", snapOut(grow(box, 24)), { away: () => parkMouse(c) });
      } finally {
        await unfloatPanel(c, "PACKAGE PUBLISHING");
      }
    },
  },
  annotatedPanelShot(
    "packPublishButton",
    "PACKAGE PUBLISHING",
    { width: 300, height: 345 },
    {
      setup: "sample",
      out: "Features/Packages/Images/packPublishButton.png",
      // from the empty body under the button, straight up at its lower corners
      annotate: [
        { at: "bottom-left", dx: 28 },
        { at: "bottom-right", dx: -28 },
      ].map(({ at, dx }) => ({
        type: "arrow",
        from: { of: PUBLISH_BUTTON, at, dx, dy: 56 },
        to: { of: PUBLISH_BUTTON, at, dx, dy: 0 },
      })),
    },
  ),
  // the Project Explorer of a package: the changelog and the licence file, from the right
  annotatedPanelShot(
    "packLicenceFiles",
    "PROJECT EXPLORER",
    { width: 400, height: 236 },
    {
      setup: "sample",
      out: "Features/Packages/Images/packLicenceFiles.png",
      async before(c) {
        // Both folders closed, and no row that shows selected: a click on a row selects it,
        // and so does the editor that becomes active, its file's, which is in Sources
        for (const folder of ["Resources", "Sources"]) await peOpen(c, folder, false);
        for (const f of ["Sources/frmMain.twin", "Sources/MainModule.twin"]) await openFile(c, SAMPLE_FILE(f));
      },
      annotate: ["CHANGELOG.md", "LICENCE.md"].map((file) => ({
        type: "arrow",
        from: { of: PE_ROW(file), at: "right", dx: 110 },
        to: PE_ROW(file),
      })),
    },
  ),
  // the thread list with no program running: the compiler's and the main thread
  annotatedPanelShot(
    "CallStack",
    "CALL STACK",
    { width: 360, height: 190 },
    {
      setup: "sample",
      annotate: [
        // the label under the main thread, an arrow straight up at it, and one that leaves its
        // right side level and then rises at the compiler's row, clear of the text below it
        {
          type: "label",
          text: "Active Threads",
          on: { of: CS_THREAD, at: "bottom", dy: 52 },
          side: "below",
          gap: 0,
          tone: "dark",
        },
        { type: "arrow", from: { of: CS_THREAD, at: "bottom", dy: 49 }, to: { of: CS_THREAD, at: "bottom", dy: 4 } },
        {
          type: "arrow",
          from: { of: CS_THREAD, at: "bottom", dx: 82, dy: 65 },
          to: { of: CS_THREAD, at: "top", dx: 108, dy: -3 },
          elbow: true,
        },
      ],
    },
  ),
  panelShot("9a5c50d5", "PROJECT EXPLORER", [423, 526], {
    setup: "sample",
    out: "Features/Images/9a5c50d5-a9f8-44a7-96f7-ae84548bd7ef.png",
    prepare: toggleFileView,
    restore: toggleFileView,
  }),
  // the context menu of the Sources folder with the Add submenu, the way to Import marked
  annotatedPanelShot(
    "2b32ab8c",
    "PROJECT EXPLORER",
    { width: 300, height: 215 },
    {
      setup: "sample",
      out: "Miscellaneous/Images/2b32ab8c-fabc-4f42-9e6b-06e85574eaf4.png",
      async before(c) {
        // folded, so that the arrow to Add crosses no file name
        await peOpen(c, "Resources", false);
        await peOpen(c, "Sources", false);
      },
      async open(c) {
        await peRightClick(c, "Sources");
        await hoverItem(c, "Add");
      },
      annotate: [
        { type: "ring", on: { css: "#contextMenuSUB > *", text: "Import...", own: true } },
        {
          type: "arrow",
          from: { of: { css: "#contextMenuSUB > *", text: "Import..." }, at: "right", dx: 60 },
          to: { css: "#contextMenuSUB > *", text: "Import...", own: true },
          tipGap: 9,
        },
        // from the Sources row, past its name (the offsets count from the menu row's left
        // edge): level with Add, the line would cross CHANGELOG.md
        {
          type: "arrow",
          from: { of: { css: "#contextMenu > *", text: "Add" }, at: "left", dx: -30, dy: -14 },
          to: { css: "#contextMenu > *", text: "Add", own: true },
          tipGap: 9,
        },
      ],
    },
  ),
  // ---- with errors: a module of the page is edited, and put back
  annotatedPanelShot(
    "Diagnostics_Toggles",
    "PROBLEMS",
    { width: 430, height: 30 },
    {
      setup: "sample",
      before: (c) => editText(c, DIAG_TWO_ERRORS, [2, 0, 0, 3]),
      after: restoreText,
      annotate: [
        ...["statusErrors", "statusWarnings", "statusHints", "statusInfos"].map((id) => ({
          type: "box",
          on: DIAG_ITEM(id),
          pad: 1,
          halo: false,
        })),
        {
          type: "label",
          text: "Click to toggle ON/OFF",
          on: { of: DIAG_PANEL, at: "bottom-left", dx: 20, dy: 58 },
          side: "right",
          gap: 0,
          tone: "dark",
        },
        ...["statusErrors", "statusWarnings", "statusHints", "statusInfos"].map((id) => ({
          type: "arrow",
          from: { of: DIAG_PANEL, at: "bottom-left", dx: 232, dy: 58 },
          to: { of: DIAG_ITEM(id), at: "bottom", dy: 7 },
          elbow: true,
        })),
      ],
    },
  ),
  annotatedPanelShot(
    "Diagnostics_Totals",
    "PROBLEMS",
    { width: 430, height: 30 },
    {
      setup: "sample",
      before: (c) => editText(c, DIAG_TWO_ERRORS, [2, 0, 0, 3]),
      after: restoreText,
      annotate: [
        ...["errorCount", "warningCount", "hintCount", "infoCount"].map((id) => ({
          type: "box",
          on: DIAG_ITEM(id),
          pad: 2,
          halo: false,
        })),
        {
          type: "label",
          text: "Total counts for each category",
          on: { of: DIAG_PANEL, at: "bottom-left", dx: 20, dy: 58 },
          side: "right",
          gap: 0,
          tone: "dark",
        },
        ...["errorCount", "warningCount", "hintCount", "infoCount"].map((id) => ({
          type: "arrow",
          from: { of: DIAG_PANEL, at: "bottom-left", dx: 280, dy: 58 },
          to: { of: DIAG_ITEM(id), at: "bottom", dy: 8 },
          elbow: true,
        })),
      ],
    },
  ),
  {
    // five unrecognised symbols in one file, the first entry open
    out: "Miscellaneous/Images/e409ea37-96ad-44c5-8017-3699ef04b53d.png",
    setup: "sample",
    async take({ c }) {
      await resetUi(c);
      try {
        await floatPanel(c, "PROBLEMS", { width: 347, height: 193 });
        await editText(c, FIVE_ERRORS, [5, 0, 0, 0], "Sources/frmMain.twin");
        const row = await c.evaluate(`(() => {
  const area = (e) => e.getBoundingClientRect().width * e.getBoundingClientRect().height;
  const hits = [...document.querySelectorAll('${panelSel("PROBLEMS")} *')].filter((x) => /TB5079/.test(x.textContent) && area(x) > 0);
  const e = hits.sort((a, b) => area(a) - area(b))[0];
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
        await clickAt(c, row.x, row.y);
        await sleep(800);
        return await capture(c, "e409ea37", snapOut(await rectOf(c, panelSel("PROBLEMS"))), {
          away: () => parkMouse(c),
        });
      } finally {
        await restoreText(c);
        await unfloatPanel(c, "PROBLEMS");
      }
    },
  },
];

// ---- Project Settings: a dialog of rows, each `<key>_HEADER`, `_CONTENT` and `_DESCRIPTION`
// in a list that scrolls under a filter box

const SETTINGS_LIST = ".configEditorContainerInner";
const settingPart = (key, part) => `[class~="${key}_${part}"]`;
const SETTING = (key, part) => ({ css: settingPart(key, part) });

// The first element matching `css` that is drawn, as a rectangle.
const shownRect = (c, css) =>
  c.evaluate(`(() => {
  const e = [...document.querySelectorAll(${JSON.stringify(css)})].find((x) => x.getBoundingClientRect().width > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);

// Scrolls the list until the row of `key` is `below` pixels under the filter box.
async function scrollToSetting(c, key, below = 6) {
  const done = await c.evaluate(`(() => {
  const list = document.querySelector(${JSON.stringify(SETTINGS_LIST)});
  const h = document.querySelector(${JSON.stringify(settingPart(key, "HEADER"))});
  const banner = document.querySelector(".filterBanner");
  if (!list || !h || !banner) return false;
  const row = h.closest(".optionEnabled") || h.parentElement;
  list.scrollTop += row.getBoundingClientRect().top - banner.getBoundingClientRect().bottom - ${below};
  return true;
})()`);
  if (!done) throw new Error(`Project Settings has no row ${key}`);
  await frames(c);
}

// The row of `key` as a rectangle, its dotted lines included.
const settingRow = (c, key) =>
  c.evaluate(`(() => {
  const h = document.querySelector(${JSON.stringify(settingPart(key, "HEADER"))});
  const r = (h.closest(".optionEnabled") || h.parentElement).getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);

// A path in the dialog that holds the Windows user name (the build path the lane stages the
// project with, a library registered under the profile folder) names the user "User"
// instead, in the page only, in its text and in its text boxes.
const nameUserAsUser = (c) =>
  c.evaluate(`(() => {
  const re = new RegExp(${JSON.stringify(USER_PATTERN)}, "gi");
  const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
  const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) n.nodeValue = n.nodeValue.replace(re, "User");
  for (const i of m.querySelectorAll("input, textarea")) i.value = i.value.replace(re, "User");
})()`);

// The dialog of Project > Project Settings (or Project > References, which filters its
// list to the library references), picture `out` of it, Cancel to close it. `prepare(c)`
// scrolls or switches it; `clipOf(box, c)` takes a part of the dialog.
const settingsShot = (
  out,
  { setup = "settings", command: id = "tbProject_ShowSettings", prepare = null, clipOf = (m) => m, annotate = null },
) => ({
  out,
  setup,
  take: ({ c }) =>
    inDialog(c, { command: id, title: "Project Settings", close: "Cancel", still: 500 }, async () => {
      await nameUserAsUser(c);
      if (prepare) await prepare(c);
      return dialogShot(c, out, (m) => clipOf(m, c), annotate);
    }),
});

const LIBRARY_REFERENCES = "tbProject_ShowReferences";

// The last row of the library list that is showing: where a picture of the list can end.
const lastReferenceBottom = (c) =>
  c.evaluate(`(() => {
  const list = [...document.querySelectorAll(".referencesListNewOuter")].find((e) => e.getBoundingClientRect().width > 0);
  return Math.max(...[...list.querySelectorAll(".referencesListColVersion")].map((e) => e.getBoundingClientRect().bottom));
})()`);

const settingsShots = [
  // the two compiler option sections at the end of the list
  settingsShot("LLVM/Images/llvmdoc1.png", {
    prepare: (c) =>
      c.evaluate(
        `(() => { const l = document.querySelector(${JSON.stringify(SETTINGS_LIST)}); l.scrollTop = l.scrollHeight; })()`,
      ),
  }),
  settingsShot("Features/Images/4fc2bf99-2bec-4943-837d-21038d791574.png", {
    prepare: (c) => scrollToSetting(c, "compiler.traceFlags"),
    clipOf: (m) => ({ x: m.x, y: m.y, width: 760, height: 531 }),
  }),
  settingsShot("Features/Images/569150839-9ffc87ac-250d-40a4-bb47-669b607ad76f.png", {
    async prepare(c) {
      // The lane stages the project with a build path in its temporary folder, and the
      // dialog shows it: the template's own path, in the page only (Cancel keeps nothing).
      await c.evaluate(`(() => {
  const i = document.querySelector(${JSON.stringify(`${settingPart("project.buildPath", "CONTENT")} input`)});
  i.value = "\${SourcePath}\\\\Build\\\\\${ProjectName}_\${Architecture}.\${FileExtension}";
})()`);
      await scrollToSetting(c, "project.buildPath");
    },
    clipOf: (m) => ({ x: m.x, y: m.y, width: m.width, height: 460 }),
    // the label's text and the input of the row, as the old picture boxed them
    annotate: [
      {
        type: "box",
        on: {
          span: [
            { css: settingPart("project.fusionBuildPath", "HEADER"), own: true },
            SETTING("project.fusionBuildPath", "CONTENT"),
          ],
        },
        pad: 6,
      },
    ],
  }),
  settingsShot("Miscellaneous/Images/01009879-fdbc-4a8e-8683-353aab6193df.png", {
    prepare: (c) => scrollToSetting(c, "project.optionExplicit"),
    clipOf: (m) => ({ x: m.x, y: m.y, width: 740, height: 140 }),
  }),
  settingsShot("IDE/Images/project settings description text.png", {
    prepare: (c) => scrollToSetting(c, "project.optionExplicit"),
    clipOf: async (_m, c) => {
      const r = await settingRow(c, "project.optionExplicit");
      return { x: r.x, y: r.y - 1, width: 900, height: r.height + 2 };
    },
    // from the empty space under the row's label, level with the description, along to its first word
    annotate: [
      {
        type: "arrow",
        from: { of: SETTING("project.optionExplicit", "DESCRIPTION"), at: "left", dx: -130 },
        to: { css: settingPart("project.optionExplicit", "DESCRIPTION"), own: true },
      },
    ],
  }),
  settingsShot("Features/Images/017bd6f8-4b35-43a9-b6be-84cba69daf64.png", {
    // the first sixteen warnings, shown whole: the list scrolls in a box of its own
    async prepare(c) {
      await c.evaluate(`(() => {
  const w = document.querySelector(".warningOptions");
  w.style.height = "360px";
  w.style.maxHeight = "none";
})()`);
      await scrollToSetting(c, "project.warnings", -40);
    },
    clipOf: async (_m, c) =>
      c.evaluate(`(() => {
  const rows = [...document.querySelectorAll(".warningOptions .warningDiv")].map((e) => e.getBoundingClientRect());
  const w = document.querySelector(".warningOptions").getBoundingClientRect();
  const first = rows[0];
  const last = rows[15];
  return { x: w.x - 6, y: first.y - 6, width: w.width + 12, height: last.bottom - first.y + 8 };
})()`),
  }),
  settingsShot("IDE/Images/ProjectSettings_LibraryReferences.png", { command: LIBRARY_REFERENCES }),
  settingsShot("IDE/Images/ProjectSettings_AvailableCOMReferences.png", {
    command: LIBRARY_REFERENCES,
    async prepare(c) {
      await clickInModal(c, "Available COM References");
      const listed = await waitFor(
        c,
        async () =>
          (await c.evaluate(
            `[...document.querySelectorAll(".referencesListNewOuter")].some((e) => e.getBoundingClientRect().width > 0 && e.querySelectorAll(".referencesListColVersion").length > 3)`,
          )) === true,
        { timeout: 20000, interval: 250 },
      );
      if (!listed) throw new Error("the Available COM References list stayed empty");
      await dialogStill(c, { ms: 500 });
      // Some libraries are registered under the user's profile folder
      await nameUserAsUser(c);
      await frames(c);
      const names = await c.evaluate(
        `[...document.querySelectorAll(".referencesListNewOuter")].find((e) => e.getBoundingClientRect().width > 0).innerText.split("\\n").filter(Boolean).slice(0, 12).join(" | ")`,
      );
      say(c.shot.name, `  Available COM References starts: ${names}`);
    },
  }),
  settingsShot("Features/Packages/Images/LibrarySymbols.png", {
    setup: "settings-symbols",
    command: LIBRARY_REFERENCES,
    clipOf: async (m, c) => {
      const alias = await shownRect(c, ".referencesListColSymbolOverride");
      return { x: m.x, y: m.y, width: m.width, height: alias.y + alias.height + 10 - m.y };
    },
  }),
  settingsShot("Features/Images/569100769-f1f2790a-0094-4843-809f-a8a9e928fd41.png", {
    setup: "settings-fusion",
    command: LIBRARY_REFERENCES,
    // the table scrolled right to the Locale to Fusion columns, from the label to the list's foot
    async prepare(c) {
      await c.evaluate(`(() => {
  const l = [...document.querySelectorAll(".referencesListNewOuter")].find((e) => e.getBoundingClientRect().width > 0);
  l.scrollLeft = l.scrollWidth;
})()`);
      await frames(c);
    },
    clipOf: async (m, c) => {
      const label = await shownRect(c, settingPart("project.references", "HEADER"));
      const list = await shownRect(c, ".referencesListNewOuter");
      return { x: m.x, y: label.y - 12, width: m.width, height: list.y + list.height + 8 - (label.y - 12) };
    },
  }),
  settingsShot("Tutorials/WebView2/Images/tbWebView2References.png", {
    setup: "settings-webview2",
    command: LIBRARY_REFERENCES,
    // the label, the tabs and the rows of the list
    clipOf: async (m, c) => {
      const label = await shownRect(c, settingPart("project.references", "HEADER"));
      const bottom = await lastReferenceBottom(c);
      return { x: m.x, y: label.y - 12, width: m.width, height: bottom + 12 - (label.y - 12) };
    },
  }),
];

// ---- the IDE's own icons, as the pages show them inline

// An icon clipped to its element's box: `find(c)` returns the rectangle.
const glyphShot = (name, find, { prepare = null, restore = null, away = true } = {}) => ({
  out: `IDE/Images/${name}.png`,
  setup: "glyphs",
  async take({ c }) {
    await resetUi(c);
    try {
      if (prepare) await prepare(c);
      const r = await find(c);
      if (!r) throw new Error(`no element for the ${name} icon`);
      return await capture(c, name, snapOut(r), { away: away ? () => parkMouse(c) : null });
    } finally {
      if (restore) await restore(c);
    }
  },
});

// The element matching `css` in the docked panel headed `title`.
const inDocked = (title, css) => (c) =>
  c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === ${JSON.stringify(title)});
  const e = h?.closest(".toolWindowContainer")?.querySelector(${JSON.stringify(css)});
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);

// The icon in front of a Project Explorer row.
const treeIcon = (text) => (c) =>
  c.evaluate(`(() => {
  const n = [...document.querySelectorAll(".itemNode")].find((e) => e.textContent.trim() === ${JSON.stringify(text)});
  const e = n?.previousElementSibling;
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);

// The icon of an entry of the Add submenu (Sources > right click > Add), the mouse left on Add.
const addMenuIcon = (text) => ({
  find: (c) =>
    c.evaluate(`(() => {
  const row = [...document.querySelectorAll("#contextMenuSUB > .contextMenuItem")].find((e) => e.innerText.trim().startsWith(${JSON.stringify(text)}));
  const e = row?.querySelector(".contextMenuItemIcon");
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`),
  options: {
    away: false,
    async prepare(c) {
      await peOpen(c, "Sources", true);
      await peRightClick(c, "Sources");
      await hoverItem(c, "Add");
    },
    restore: closeMenus,
  },
});

const sourcesOpen = (c) => peOpen(c, "Sources", true);

const glyphShots = [
  glyphShot("Settings", inDocked("PROJECT EXPLORER", '[title="Project Settings"]')),
  glyphShot("Toggle", inDocked("PROJECT EXPLORER", '[title^="Toggle file view"]')),
  glyphShot("Add", inDocked("PROJECT EXPLORER", '[title="Add..."]')),
  glyphShot("Folder", treeIcon("Sources"), { prepare: sourcesOpen }),
  glyphShot("File-Green", treeIcon("CHANGELOG.md"), { prepare: sourcesOpen }),
  glyphShot("tB-Green", treeIcon("frmMain.tbform"), { prepare: sourcesOpen }),
  glyphShot("tB-Red", treeIcon("MainModule.twin"), { prepare: sourcesOpen }),
  glyphShot("tB-Blue", addMenuIcon("Add Module (.BAS)").find, addMenuIcon("Add Module (.BAS)").options),
  glyphShot("tB-Orange", addMenuIcon("Add Class (.CLS)").find, addMenuIcon("Add Class (.CLS)").options),
  glyphShot("DebugConsole_AutoScroll", inDocked("DEBUG CONSOLE", '[title="Auto Scroll"]')),
  glyphShot("DebugConsole_Clear", inDocked("DEBUG CONSOLE", '[title="Clear Debug Console"]')),
  glyphShot("DebugConsole_Options", inDocked("DEBUG CONSOLE", ".ellipsesIcon2")),
  glyphShot("DebugConsole_Input", inDocked("DEBUG CONSOLE", ".debugConsoleEntryMarker")),
  glyphShot("Clear", (c) => shownRect(c, `${panelSel("WATCHES")} [title="Clear Watches"]`), {
    async prepare(c) {
      await floatPanel(c, "WATCHES", { width: 300, height: 76 });
    },
    restore: (c) => unfloatPanel(c, "WATCHES"),
  }),
];

// ---- the Global Search add-in (Sample 15), with the sample's own project open

const GS_FILE = "/tbGlobalSearchAddIn1/Sources/MainModule.twin";
// the floating panel that holds the add-in's tool window, and the window's body
const GS_PANEL = `toolWindowsById[${JSON.stringify(GS_WINDOW)}]?.shadowDom.host.closest(".floatingPanel")`;
const GS_BODY = `toolWindowsById[${JSON.stringify(GS_WINDOW)}].bodyElement`;
const GS_OPTIONS = [
  "searchBarInsidePackages",
  "searchBarMatchCase",
  "searchBarMatchWholeWordOnly",
  "searchBarExcludeComments",
];

const gsPanelRect = (c) =>
  c.evaluate(`(() => {
  const p = ${GS_PANEL};
  if (!p) return null;
  const r = p.getBoundingClientRect();
  return r.width && r.height ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);

// The add-in's tool window, shown with a real click on its toolbar button when it is not
// showing, as a floating panel of `width` by `height`.
async function gsShow(c, { width, height }) {
  if (!(await gsPanelRect(c))) {
    await click(c, GS_BUTTON);
    if (!(await waitFor(c, () => gsPanelRect(c), { timeout: 5000, interval: 50 }))) {
      throw new Error("the Global Search button showed no tool window");
    }
  }
  await c.evaluate(
    `Object.assign(${GS_PANEL}.style, { left: "140px", top: "120px", width: "${width}px", height: "${height}px" })`,
  );
  const flashing = () =>
    c.evaluate(`(() => { const p = ${GS_PANEL}; return !!p && !!p.matches(".flashElement, :has(.flashElement)"); })()`);
  if (!(await waitFor(c, async () => !(await flashing()), { timeout: 5000, interval: 50 }))) {
    throw new Error("the Global Search window never stopped flashing");
  }
  await frames(c);
  return gsPanelRect(c);
}

// Closes the tool window with a real click on its close button.
async function gsHide(c) {
  const x = await c.evaluate(`(() => {
  const e = ${GS_PANEL}?.querySelector(".sectionHeader .codicon-close");
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
  if (x) {
    await clickAt(c, x.x, x.y);
    await waitFor(c, async () => !(await gsPanelRect(c)), { timeout: 3000, interval: 50 });
  }
  await parkMouse(c);
}

// The number of files the search lists, from the list view's data (it draws only the rows
// that fit).
const gsResults = (c) =>
  c.evaluate(
    `(() => { const l = ${GS_BODY}.querySelector("#resultsList")?.listview; return l ? l.itemCount : null; })()`,
  );

// A search for `query` with only In packages ticked, or none, each option set with a real
// click (which the add-in saves with SaveSetting). The add-in searches a second after the
// last key, and adds the files it finds one at a time: done when the list has not changed
// for two seconds.
async function gsSearch(c, query, { packages = false } = {}) {
  for (const id of GS_OPTIONS) {
    const want = packages && id === "searchBarInsidePackages";
    if ((await c.evaluate(`${GS_BODY}.querySelector("#${id}").checked`)) !== want) {
      await click(c, { toolWindow: GS_WINDOW, css: `#${id}` });
    }
  }
  if ((await c.evaluate(`${GS_BODY}.querySelector("#searchBarInput").value`)) !== query) {
    await click(c, { toolWindow: GS_WINDOW, css: "#searchBarInput" });
    await pressKey(c, "a", { ctrl: true });
    if (query) await typeText(c, query);
    else await pressKey(c, "Backspace");
  }
  let last = null;
  let since = 0;
  const settled = await waitFor(
    c,
    async () => {
      const n = await gsResults(c);
      if (n !== last) [last, since] = [n, Date.now()];
      return Date.now() - since >= 2000;
    },
    { timeout: 30000, interval: 200 },
  );
  if (!settled) throw new Error(`the search for "${query}" never settled`);
  await c.evaluate(`${GS_BODY}.getRootNode().activeElement?.blur()`);
  await frames(c);
  return last;
}

// The tool window 389 pixels tall after a search for `query`; with `head`, its part above
// the results list (the window scrolls its whole body when it is any shorter).
const gsShot = (name, query, { packages = false, head = false } = {}) => ({
  out: `IDE/AddIns/Images/${name}.png`,
  setup: "global-search",
  async take({ c }) {
    await resetUi(c);
    try {
      const panel = await gsShow(c, { width: 352, height: 389 });
      const files = await gsSearch(c, query, { packages });
      if (query) say(c.shot.name, `  the search for "${query}" lists ${files} files`);
      let clip = panel;
      if (head) {
        const list = await c.evaluate(`${GS_BODY}.querySelector("#resultsList").getBoundingClientRect().top`);
        clip = { ...panel, height: list - panel.y };
      }
      return await capture(c, name, snapOut(clip), { away: () => parkMouse(c) });
    } finally {
      await gsHide(c);
    }
  },
});

// The toolbar with a project open, the Global Search add-in's button at the right: as wide
// as Toolbar_1 and the button, which comes after the theme's, so that the close button of
// the bar is as far from it as it is from the theme's there. `before(c)` brings the editor
// to the state the toolbar shows.
const searchToolbarShot = (name, setup, before) => ({
  out: `IDE/Images/${name}.png`,
  setup,
  async take({ c }) {
    await resetUi(c);
    await before(c);
    const theme = await rectOf(c, "#menuBarColorMode");
    const b = await rectOf(c, `#${GS_BUTTON}`);
    if (!theme || !b) throw new Error("the toolbar has no theme button or no Global Search button");
    const width = Math.ceil(TOOLBAR_WIDTH + b.x + b.width - (theme.x + theme.width));
    return atSize(c, width, IDE_SIZE.height, async () =>
      capture(c, name, snapOut(await toolbarRect(c), width, IDE_SIZE.height), {
        away: () => parkMouse(c),
      }),
    );
  },
});

const globalSearchShots = [
  {
    // the add-in's button, with a little of the toolbar each side of it
    out: "IDE/AddIns/Images/Toolbar_GlobalSearch.png",
    setup: "global-search",
    async take({ c }) {
      await resetUi(c);
      const bar = await toolbarRect(c);
      const b = await rectOf(c, `#${GS_BUTTON}`);
      return capture(
        c,
        "Toolbar_GlobalSearch",
        snapOut({ x: b.x - 10, y: bar.y, width: b.width + 20, height: bar.height }),
        { away: () => parkMouse(c) },
      );
    },
  },
  // the toolbar with a project open and no editor
  searchToolbarShot("Toolbar_2", "global-search", (c) => closeTabs(c)),
  gsShot("GlobalSearch", "", { head: true }),
  gsShot("GlobalSearch_2", "Button1", { packages: true }),
  // the sample's module open: the Outline lists what it declares
  panelShot("Outline_1", "OUTLINE", [300, 96], {
    setup: "global-search",
    async before(c) {
      await openFile(c, GS_FILE);
    },
    async prepare(c) {
      const listed = await waitFor(
        c,
        () =>
          c.evaluate(
            `!!document.querySelector(${JSON.stringify(panelSel("OUTLINE"))})?.innerText.includes("MainModule")`,
          ),
        { timeout: 10000, interval: 100 },
      );
      if (!listed) throw new Error("the Outline never listed MainModule");
      await frames(c);
    },
  }),
  menuShot("Menu_Add-Ins_GlobalSearch", "Add-Ins", null, { setup: "global-search" }),
  {
    // the message the add-in's entry in the Add-Ins menu shows, closed with its own button
    out: "IDE/Menu/Images/GlobalSearch-Popup.png",
    setup: "global-search",
    async take({ c }) {
      await resetUi(c);
      await openMenu(c, "Add-Ins");
      const it = (await menuItems(c)).find((i) => i.text.startsWith("GlobalSearchAddIn"));
      if (!it) throw new Error("the Add-Ins menu has no GlobalSearchAddIn entry");
      await clickAt(c, it.x + it.width / 2, it.y + it.height / 2);
      const box = await waitFor(
        c,
        () =>
          c.evaluate(`(() => {
  const t = document.getElementById("msgBox1text");
  if (!t || !/not been implemented/.test(t.textContent)) return null;
  const e = document.getElementById("msgBoxInner1");
  const r = e.getBoundingClientRect();
  return r.width && r.height ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`),
        { timeout: 5000, interval: 50 },
      );
      if (!box) throw new Error("the Add-Ins entry showed no message");
      try {
        // with its 1 px outline, which is outside its box
        return await capture(c, "GlobalSearch-Popup", snapOut(grow(box, OUTLINE)), { away: () => parkMouse(c) });
      } finally {
        const x = await rectOf(c, "#closeMsgBox1");
        if (x) await clickAt(c, x.x + x.width / 2, x.y + x.height / 2);
        await waitFor(c, async () => !(await rectOf(c, "#msgBox1text")), { timeout: 3000, interval: 50 });
        await parkMouse(c);
      }
    },
  },
];

// ---- Sample 6, the CustomControls sample: its controls are in the CustomControls package,
// and their toolbox images in the package's Miscellaneous folder

const CC_PACKAGE = "CustomControlsPackage";

const sample6Shots = [
  annotatedPanelShot(
    "ccGridButtonImage",
    "PROJECT EXPLORER",
    { width: 400, height: 330 },
    {
      setup: "sample6",
      out: "Tutorials/CustomControls/Images/ccGridButtonImage.png",
      async before(c) {
        await peOpen(c, "Sources", false);
        await peOpen(c, "Packages", true);
        await peOpen(c, CC_PACKAGE, true);
        await peOpen(c, "Miscellaneous", true, CC_PACKAGE);
      },
      annotate: [
        {
          type: "arrow",
          from: { of: PE_ROW("frmGrid.png"), at: "right", dx: 110 },
          to: PE_ROW("frmGrid.png"),
        },
      ],
    },
  ),
  // the package's context menu, the mouse on View As JSON
  annotatedPanelShot(
    "22660f54",
    "PROJECT EXPLORER",
    { width: 260, height: 250 },
    {
      setup: "sample6",
      out: "Features/Images/22660f54-ff5d-4b21-93d3-39715f1f35ed.png",
      away: false,
      async before(c) {
        await peOpen(c, "Sources", false);
        await peOpen(c, "Packages", true);
        await peOpen(c, CC_PACKAGE, false);
      },
      async open(c) {
        // at the end of the name: the menu opens at the pointer, and covers what is right of it
        await peRightClick(c, CC_PACKAGE, { atEnd: true });
        const it = (await menuItems(c)).find((i) => i.text === "View As JSON");
        if (!it) throw new Error("the package's context menu has no View As JSON");
        await mouseMove(c, it.x + 8, it.y + it.height / 2);
        await mouseMove(c, it.x + it.width / 2, it.y + it.height / 2);
        await frames(c);
      },
    },
  ),
  {
    // the package as JSON in the editor: from its first line of data (above it, a comment
    // gives the time it was made), with the line numbers and without the minimap
    out: "Features/Images/a6525b1d-ac22-4303-ae27-7984c20eba0c.png",
    setup: "sample6",
    async take({ c }) {
      await resetUi(c);
      await closeTabs(c);
      // the Project Explorer floats for the click, and goes again before the picture
      try {
        await floatPanel(c, "PROJECT EXPLORER", { width: 300, height: 400 });
        await peOpen(c, "Packages", true);
        await peRightClick(c, CC_PACKAGE);
        const it = (await menuItems(c)).find((i) => i.text === "View As JSON");
        if (!it) throw new Error("the package's context menu has no View As JSON");
        await clickAt(c, it.x + it.width / 2, it.y + it.height / 2);
      } finally {
        await closeMenus(c);
        await unfloatPanel(c, "PROJECT EXPLORER");
      }
      const shown = await waitFor(
        c,
        async () =>
          (await editorTabs(c)).some((t) => t.name.startsWith("JSON:")) &&
          (await c.evaluate("editor.getModel()?.getLineCount() ?? 0")) > 20,
        { timeout: 10000, interval: 100 },
      );
      if (!shown) throw new Error("View As JSON opened no JSON tab");
      try {
        await c.evaluate("editor.setScrollTop(0)");
        await frames(c);
        const clip = await c.evaluate(`(() => {
  const d = editor.getDomNode().getBoundingClientRect();
  const top = (n) => editor.getTopForLineNumber(n) - editor.getScrollTop();
  const lay = editor.getLayoutInfo();
  const right = lay.minimap?.minimapLeft ?? lay.minimapLeft ?? lay.width - lay.verticalScrollbarWidth;
  return { x: d.x, y: d.y + top(7), width: right, height: top(18) - top(7) };
})()`);
        return await capture(c, "a6525b1d", snapOut(clip), { away: () => parkMouse(c) });
      } finally {
        await closeTabs(c);
      }
    },
  },
];

// ---- the designers: a form, the Format menu over a selection, and a report (setup designer)

const DESIGNER_GLOBALS = "getCurrentFormEditorGlobals()";
// the open designer's own area, which dialogStill watches
const DESIGNER_AREA = `${DESIGNER_GLOBALS}?.designerContainer?.parentElement`;

// Waits until the open designer has its form from the compiler and is not covered by RESYNC,
// and then until nothing in it has changed for half a second and its pictures are decoded.
async function designerShown(c) {
  const ready = await waitFor(
    c,
    () =>
      c.evaluate(`(() => {
  const g = ${DESIGNER_GLOBALS};
  return !!g && g.gotInitialFormData === true && g.resyncOverlay.style.visibility !== "visible";
})()`),
    { timeout: 20000, interval: 100 },
  );
  if (!ready) throw new Error("the designer never showed its form");
  await dialogStill(c, { ms: 500, root: DESIGNER_AREA });
}

// Opens a form or report of the sample's Sources in its designer, and waits for it.
async function openDesigner(c, file) {
  await openFile(c, SAMPLE_FILE(`Sources/${file}`));
  await designerShown(c);
}

// The names of the controls selected in the open designer, sorted (the form's own name when
// no control is).
const selectedControls = (c) =>
  c.evaluate(`(${DESIGNER_GLOBALS}.selectedControls || []).map((x) => x.properties.Name).sort()`);

// The centres of the named controls of the open designer: the form's client area, offset by
// each control's Left and Top (in pixels in the .tbform), as long as what is drawn there is a
// control.
const controlCentres = (c, names) =>
  c.evaluate(`(() => {
  const g = ${DESIGNER_GLOBALS};
  const d = g.designer.getBoundingClientRect();
  return ${JSON.stringify(names)}.map((n) => {
    const p = g.allControls.find((x) => x.properties.Name === n)?.properties;
    if (!p) return null;
    const at = { x: d.x + p.Left + p.Width / 2, y: d.y + p.Top + p.Height / 2 };
    return document.elementFromPoint(at.x, at.y)?.closest(".baseControl") ? at : null;
  });
})()`);

// A real click with the left button at x, y; with `ctrl`, Ctrl held.
async function pressAt(c, x, y, { ctrl = false } = {}) {
  const modifiers = ctrl ? 2 : 0;
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, modifiers });
  for (const type of ["mousePressed", "mouseReleased"]) {
    await c.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, modifiers });
  }
}

// frmControls open with both its buttons selected, as a person selects them: a click on the
// first and a Ctrl+click on the second. With two controls selected the Format menu has every
// command but the two Make Equal, which it greys.
const FORMAT_SELECTION = ["Command1", "Command2"];
async function selectTwoControls(c) {
  await openDesigner(c, "frmControls.tbform");
  const want = FORMAT_SELECTION.join();
  if ((await selectedControls(c)).join() !== want) {
    const at = await controlCentres(c, FORMAT_SELECTION);
    if (at.includes(null)) throw new Error(`the designer does not draw ${FORMAT_SELECTION.join(" and ")}`);
    await pressAt(c, at[0].x, at[0].y);
    await pressAt(c, at[1].x, at[1].y, { ctrl: true });
    const selected = await waitFor(c, async () => (await selectedControls(c)).join() === want, {
      timeout: 3000,
      interval: 50,
    });
    if (!selected) throw new Error(`the clicks selected ${JSON.stringify(await selectedControls(c))}`);
  }
  await parkMouse(c);
  await frames(c);
}

// MyReport, added as a person adds a report: Sources > Add > Add Windows Report, and the name
// the IDE offers, MyReport, taken with Enter. It is added to the project in the page and saved
// nowhere; once per IDE.
async function addReport(ctx) {
  if (ctx.report) return;
  const { c } = ctx;
  await resetUi(c);
  // the Project Explorer floats for it, since an earlier picture may have taken it out of the
  // layout, and goes again once the name is taken
  try {
    await floatPanel(c, "PROJECT EXPLORER", { width: 300, height: 400 });
    try {
      await peOpen(c, "Sources", true);
      await peRightClick(c, "Sources");
      await hoverItem(c, "Add");
      const it = (await menuItems(c, true)).find((i) => i.text.startsWith("Add Windows Report"));
      if (!it) throw new Error("the Add submenu has no Add Windows Report");
      await mouseMove(c, it.x + 20, it.y + it.height / 2);
      await frames(c);
      await clickAt(c, it.x + 20, it.y + it.height / 2);
    } catch (e) {
      // not after the click: the Escape closeMenus may press would end the renaming
      await closeMenus(c);
      throw e;
    }
    // the new file's row, its name in a text box to rename it
    const offered = await waitFor(
      c,
      () => c.evaluate(`document.activeElement?.tagName === "INPUT" ? document.activeElement.value : null`),
      { timeout: 5000, interval: 50 },
    );
    if (offered !== "MyReport.tbreport") {
      throw new Error(`Add Windows Report offered the name ${JSON.stringify(offered)}`);
    }
    await pressKey(c, "Enter");
  } finally {
    await unfloatPanel(c, "PROJECT EXPLORER");
  }
  const opened = await waitFor(c, async () => (await editorTabs(c)).some((t) => t.name === "MyReport.tbreport"), {
    timeout: 10000,
    interval: 100,
  });
  if (!opened) throw new Error("the new report did not open in the designer");
  await designerShown(c);
  ctx.report = true;
}

// EDITOR 1's box, its header included.
const editorPanelRect = (c) =>
  c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "EDITOR 1");
  const r = h.closest(".toolWindowContainer").getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);

// The box `measure(c)` returns once two reads 100 ms apart agree: the panels are laid out
// again a moment after the page changes size.
async function settledBox(c, measure) {
  let last = null;
  const box = await waitFor(
    c,
    async () => {
      const now = await measure(c);
      const same = last && JSON.stringify(now) === JSON.stringify(last);
      last = now;
      return same && now;
    },
    { timeout: 5000, interval: 100 },
  );
  if (!box) throw new Error("a panel kept changing size");
  return box;
}

// The page size at which the panel `measure(c)` returns has the width and height `want`
// gives (one of them, or both). A panel can grow with the page by less than the page does:
// the page size is a first guess, measured, and corrected once along the slope that gives. A
// size `want` does not give stays IDE_SIZE's.
async function fitPage(c, measure, want) {
  const at = await settledBox(c, measure);
  const guess = { ...IDE_SIZE };
  for (const k in want) guess[k] = Math.round(IDE_SIZE[k] + want[k] - at[k]);
  const then = await atSize(c, guess.width, guess.height, () => settledBox(c, measure));
  const fit = { ...guess };
  for (const k in want) {
    if (then[k] !== at[k]) {
      fit[k] = Math.round(guess[k] + ((want[k] - then[k]) * (guess[k] - IDE_SIZE[k])) / (then[k] - at[k]));
    }
  }
  return fit;
}

// EDITOR 1 with one designer open and no other tab, at the size of the old pictures. The
// panels the default layout docks around it are taken out of the layout first, so that the
// page is no larger than the editor: in a page of about 1920 by 1030, the captures of the
// striped ground behind a designer alternate between two versions a few pixels apart, and
// no two in a row agree.
const EDITOR_SIZE = { width: 1319, height: 698 };
const DOCKED_BESIDE_EDITOR = [
  "TOOLBOX",
  "PROJECT EXPLORER",
  "PROPERTIES",
  "DEBUG CONSOLE",
  "PROBLEMS",
  "CALL STACK",
  "VARIABLES",
];
function designerShot(name, file, { report = false } = {}) {
  return {
    out: `IDE/Images/${name}.png`,
    setup: "designer",
    async take(ctx) {
      const { c } = ctx;
      await resetUi(c);
      if (report) await addReport(ctx);
      await openDesigner(c, file);
      await closeTabs(c, [file], { discard: true });
      for (const id of DOCKED_BESIDE_EDITOR) await undock(c, id);
      const { width, height } = await fitPage(c, editorPanelRect, EDITOR_SIZE);
      return atSize(c, width, height, async () => {
        const box = await settledBox(c, editorPanelRect);
        await designerShown(c);
        return capture(c, name, snapOut(box, width, height), { away: () => parkMouse(c) });
      });
    },
  };
}

const formatShot = (name, item = null) =>
  menuShot(name, "Format", item, { setup: "designer", before: selectTwoControls });

const designerShots = [
  designerShot("tbForm", "MyForm.tbform"),
  formatShot("Menu_Format_1"),
  formatShot("Menu_Format_Align", "Align"),
  formatShot("Menu_Format_MakeSameSize", "Make Same Size"),
  formatShot("Menu_Format_HorizontalSpacing", "Horizontal Spacing"),
  formatShot("Menu_Format_VerticalSpacing", "Vertical Spacing"),
  // the toolbar with a form open in the designer
  searchToolbarShot("Toolbar_3", "designer", (c) => openDesigner(c, "MyForm.tbform")),
  // the report's pictures last: the first of them adds the report to the project
  designerShot("tbReport", "MyReport.tbreport", { report: true }),
  {
    // The Toolbox with the report open, from its title bar to a little below the report's
    // last tool. Docked, as the default layout has it: the report's tools hide the others
    // only inside the window's own layout, and a floating Toolbox shows every tool whatever
    // the designer. An earlier picture has taken it out of the layout: Window > Panel Layouts
    // > Default puts it back.
    out: "IDE/Images/Toolbox_Report.png",
    setup: "designer",
    async take(ctx) {
      const { c } = ctx;
      await resetUi(c);
      await addReport(ctx);
      const docked = () => c.evaluate(`isPanelIdDocked("TOOLBOX")`);
      if (!(await docked())) {
        await command(c, "tbPanels_SetActiveLayoutDefault");
        if (!(await waitFor(c, docked, { timeout: 5000, interval: 50 }))) {
          throw new Error("the default layout did not dock the Toolbox");
        }
      }
      await openDesigner(c, "MyReport.tbreport");
      // The docked panel's box, to the bottom of its last tool, once only the report's show;
      // in a page as wide as makes the panel as wide as the old picture, so that its title
      // bar has room for its buttons.
      const reportTools = () =>
        c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "TOOLBOX");
  const p = h?.closest(".toolWindowContainer");
  if (!p) return null;
  const t = [...p.querySelectorAll(".toolboxItemOuter")].filter((e) => e.getBoundingClientRect().width);
  if (!t.length || !t.every((e) => e.classList.contains("toolboxReportCtrl"))) return null;
  const r = p.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: Math.max(...t.map((e) => e.getBoundingClientRect().bottom)) - r.y };
})()`);
      if (!(await waitFor(c, reportTools, { timeout: 5000, interval: 100 }))) {
        throw new Error("the docked Toolbox did not show the report's tools alone");
      }
      const { width, height } = await fitPage(c, reportTools, { width: 198 });
      return atSize(c, width, height, async () => {
        const box = await settledBox(c, reportTools);
        // the layout puts the focus on the Pointer, which draws a box round it
        await c.evaluate("document.activeElement?.blur?.()");
        return capture(c, "Toolbox_Report", snapOut({ ...box, height: box.height + 12 }, width, height), {
          away: () => parkMouse(c),
        });
      });
    },
  },
];

// ---- the panels with a control on a form (setups forms and settings-webview2)

// Selects the control `name` of the open designer with a real click on it.
async function selectControl(c, name) {
  if ((await selectedControls(c)).join() !== name) {
    const [at] = await controlCentres(c, [name]);
    if (!at) throw new Error(`the designer does not draw ${name}`);
    await pressAt(c, at.x, at.y);
    if (!(await waitFor(c, async () => (await selectedControls(c)).join() === name, { timeout: 3000, interval: 50 }))) {
      throw new Error(`the click selected ${JSON.stringify(await selectedControls(c))}, not ${name}`);
    }
  }
  await parkMouse(c);
  await frames(c);
}

// The window's own layout, the default one, as Window > Panel Layouts > Default sets it (in
// the page: the layout's name is saved through a call that does nothing).
async function defaultLayout(c) {
  await command(c, "tbPanels_SetActiveLayoutDefault");
  if (!(await waitFor(c, () => c.evaluate(`isPanelIdDocked("TOOLBOX")`), { timeout: 5000, interval: 50 }))) {
    throw new Error("the default layout did not dock the Toolbox");
  }
  await frames(c);
}

// The box of the element `css` matches in the docked panel headed `title`, or the panel's.
const dockedRect = (c, title, css = null) =>
  c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === ${JSON.stringify(title)});
  const p = h?.closest(".toolWindowContainer");
  const e = p && ${css === null ? "p" : `p.querySelector(${JSON.stringify(css)})`};
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);

const PROPS = panelSel("PROPERTIES");
// A row of the floating PROPERTIES panel, by its property's name (its title starts with it,
// and goes on with the property's description when it has one), and the cell of its value.
const PROP_NAME = (name) => `${PROPS} .propertyName[title^="${name}"]`;
const PROP_VALUE = (name) => `${PROP_NAME(name)} + .propertyValue`;

// Scrolls the floating PROPERTIES panel until the group headed `category` is just under the
// control's name, which stays at the top of the panel as the list scrolls, or as near as the
// list's end lets it. With `upTo`, a row's property name, the panel is first made as tall as
// shows the list from the group's heading to the bottom of that row and no further, and the
// group must then reach the top.
async function scrollProperties(c, category, { upTo = null } = {}) {
  const done = await c.evaluate(`(() => {
  const p = document.querySelector(${JSON.stringify(PROPS)});
  const list = p?.querySelector(".propertiesBoxInner");
  const name = p?.querySelector(".controlSelecter");
  const cat = p && [...p.querySelectorAll(".propertyCategory")].find((e) => e.textContent.trim() === ${JSON.stringify(category)});
  const last = ${upTo === null ? "null" : `p?.querySelector(${JSON.stringify(PROP_NAME(upTo))})`};
  if (!list || !name || !cat || (${upTo !== null} && !last)) return "none";
  const top = (e) => e.getBoundingClientRect().top;
  const bottom = (e) => e.getBoundingClientRect().bottom;
  if (last) {
    // the list's box shows the name and the group: its height set through the panel's
    const want = name.getBoundingClientRect().height + bottom(last) - top(cat);
    p.style.height = p.getBoundingClientRect().height + want - list.clientHeight + "px";
  }
  // twice: the name sticks to the top only once the list has scrolled
  for (let i = 0; i < 2; i++) list.scrollTop += top(cat) - bottom(name);
  return Math.abs(top(cat) - bottom(name)) < 1 ? "done" : "short";
})()`);
  if (done === "none") throw new Error(`the PROPERTIES panel has no group ${category}${upTo ? ` or row ${upTo}` : ""}`);
  if (done === "short" && upTo) throw new Error(`the PROPERTIES panel's list ends before ${category} reaches its top`);
  await frames(c);
}

// Opens or closes a property that holds others (Anchors) with a real click on its arrow.
async function expandProperty(c, name, want) {
  const state = () =>
    c.evaluate(`(() => {
  const e = document.querySelector(${JSON.stringify(`${PROP_NAME(name)} > .treeNodeExpanded, ${PROP_NAME(name)} > .treeNodeCollapsed`)});
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { open: e.className === "treeNodeExpanded", x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
  const s = await state();
  if (!s) throw new Error(`the PROPERTIES panel has no ${name} to expand`);
  if (s.open === want) return;
  await clickAt(c, s.x, s.y);
  if (!(await waitFor(c, async () => (await state())?.open === want, { timeout: 3000, interval: 50 }))) {
    throw new Error(`the click on ${name}'s arrow did not ${want ? "open" : "close"} it`);
  }
  await frames(c);
}

// frmAnchors open with Text1 selected, and PROPERTIES floating on its own with the LAYOUT
// group at its top, the Anchors row closed or open, and the panel as tall as shows the group
// down to the Dock row under Anchors.
function anchorsShot(out, name, { expanded, annotate = null }) {
  return {
    out,
    setup: "forms",
    annotate,
    async take({ c }) {
      await resetUi(c);
      await openDesigner(c, "frmAnchors.tbform");
      await selectControl(c, "Text1");
      try {
        await floatPanel(c, "PROPERTIES", { width: 400, height: 360 });
        // scrolled to before the click, which lands on what is drawn, and again after it
        await scrollProperties(c, "LAYOUT");
        await expandProperty(c, "Anchors", expanded);
        await scrollProperties(c, "LAYOUT", { upTo: "Dock" });
        return await annotatedClip(c, name, await rectOf(c, PROPS), annotate);
      } finally {
        await unfloatPanel(c, "PROPERTIES");
      }
    },
  };
}

// The 8611d12a picture's layout, set in the page: the Project Explorer above History at the
// left, the Toolbox, then the editor (the default layout has the Project Explorer at the
// right and no History). Nothing is saved: the layout is the window's until the default one
// is put back.
const EXPLORER_LAYOUT = {
  type: "horizontal",
  variableSize: true,
  size: "0%",
  content: [
    { id: "TOOLBAR", variableSize: false, size: "fit-content" },
    {
      type: "vertical",
      variableSize: true,
      size: "0%",
      content: [
        {
          type: "horizontal",
          variableSize: false,
          size: "26%",
          content: [
            { id: "PROJECT EXPLORER", variableSize: false, size: "47%" },
            { id: "HISTORY", variableSize: true, size: "0%" },
          ],
        },
        {
          type: "vertical",
          variableSize: true,
          size: "0%",
          content: [
            { id: "TOOLBOX", variableSize: false, size: "15%" },
            { id: "EDITOR", variableSize: true, size: "0%" },
          ],
        },
      ],
    },
  ],
};
// How much of the window 8611d12a shows, from its left edge: the IDE's title is further right.
const EXPLORER_CROP_WIDTH = 642;

const WEB_TILE = { css: `${panelSel("TOOLBOX")} .toolboxItemOuter[title="WebView2"]` };

const formShots = [
  anchorsShot("Features/Images/b26da59b-4e98-40b7-b97b-bb3cef4ca1d0.png", "b26da59b", {
    expanded: false,
    // the whole Anchors row, its name and its value
    annotate: [{ type: "underline", on: { span: [{ css: PROP_NAME("Anchors") }, { css: PROP_VALUE("Anchors") }] } }],
  }),
  anchorsShot("Features/Images/d5dff8f5-c5fa-4620-ba11-430d06276b27.png", "d5dff8f5", { expanded: true }),
  {
    // The Toolbox and the form beside it, with a QR code on the form: from the panels' title
    // bars to below the Toolbox's tools, as far right as a little past the QR code.
    out: "Features/Images/54ed49d8-b434-45e3-9e63-a1fe75cdf814.png",
    setup: "forms",
    async take({ c }) {
      await resetUi(c);
      await defaultLayout(c);
      await openDesigner(c, "frmQRCode.tbform");
      await closeTabs(c, ["frmQRCode.tbform"], { discard: true });
      await designerShown(c);
      const panel = await dockedRect(c, "TOOLBOX");
      const tools = await c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "TOOLBOX");
  const t = [...h.closest(".toolWindowContainer").querySelectorAll(".toolboxItemOuter[title]")].filter((e) => e.getBoundingClientRect().width);
  return Math.max(...t.map((e) => e.getBoundingClientRect().bottom));
})()`);
      const qr = await c.evaluate(`(() => {
  const g = ${DESIGNER_GLOBALS};
  const d = g.designer.getBoundingClientRect();
  const p = g.allControls.find((x) => x.properties.Name === "QRCode1")?.properties;
  return p ? { right: d.x + p.Left + p.Width, bottom: d.y + p.Top + p.Height } : null;
})()`);
      if (!panel || !qr) throw new Error("the Toolbox or the QR code is not drawn");
      const bottom = Math.max(tools, qr.bottom) + 10;
      return capture(
        c,
        "54ed49d8",
        snapOut({ x: panel.x, y: panel.y, width: qr.right + 40 - panel.x, height: bottom - panel.y }),
        { away: () => parkMouse(c) },
      );
    },
  },
  {
    // A crop of the window from its left edge, the menu bar down to History's title bar: the
    // Project Explorer with Resources > ICON open on its two icons, the Toolbox, and MyForm's
    // code and form open, the form in front. The layout is set in the page for it.
    out: "Miscellaneous/Images/8611d12a-d7a6-48cc-9544-cb27c5299aa5.png",
    setup: "forms",
    async take({ c }) {
      await resetUi(c);
      await closeTabs(c, [], { discard: true });
      await openFile(c, SAMPLE_FILE("Sources/MyForm.twin"));
      await openDesigner(c, "MyForm.tbform");
      try {
        if (!(await c.evaluate(`restorePanelLayout(${JSON.stringify(JSON.stringify(EXPLORER_LAYOUT))})`))) {
          throw new Error("the page refused the layout");
        }
        await frames(c);
        await designerShown(c);
        for (const [folder, open] of [
          ["Resources", true],
          ["ICON", true],
          ["MANIFEST", false],
          ["MESSAGETABLE", false],
          ["STRING", false],
          ["Sources", false],
        ]) {
          await peOpen(c, folder, open);
        }
        const history = await dockedRect(c, "HISTORY", ".sectionHeader");
        if (!history) throw new Error("the layout has no History panel");
        return await capture(
          c,
          "8611d12a",
          snapOut({ x: 0, y: 0, width: EXPLORER_CROP_WIDTH, height: history.y + history.height }),
          { away: () => parkMouse(c) },
        );
      } finally {
        await defaultLayout(c);
      }
    },
  },
  // frmWeb's Toolbox, floating, its WebView2 tile pointed at. A floating Toolbox lists every
  // tool whatever the designer (Toolbox_Report): for a form it lists what the docked one does.
  annotatedPanelShot(
    "tbWebView2Toolbox",
    "TOOLBOX",
    { width: 180, height: 350 },
    {
      setup: "settings-webview2",
      out: "Tutorials/WebView2/Images/tbWebView2Toolbox.png",
      before: (c) => openDesigner(c, "frmWeb.tbform"),
      // level with the tile, from the empty end of its row
      annotate: [{ type: "arrow", from: { of: WEB_TILE, at: "right", dx: 90 }, to: WEB_TILE }],
    },
  ),
  {
    // Web1 in PROPERTIES, floating, with its GENERAL group, where the WebView2 control's own
    // properties are, from the top of the list to its end. The control draws nothing in the
    // designer: it has no DocumentURL, so no page is loaded. (The old picture had a property's
    // description at the foot of the panel: in BETA 997 the panel shows none, and the
    // description is only the native tooltip of the property's name, which no capture holds.)
    out: "Tutorials/WebView2/Images/tbWebView2Properties.png",
    setup: "settings-webview2",
    async take({ c }) {
      await resetUi(c);
      await openDesigner(c, "frmWeb.tbform");
      await selectControl(c, "Web1");
      try {
        // wide enough for the longest name, AdditionalAllowedFrameAncestors
        await floatPanel(c, "PROPERTIES", { width: 500, height: 640, top: 40 });
        await scrollProperties(c, "GENERAL", { upTo: "ZoomFactor" });
        return await capture(c, "tbWebView2Properties", snapOut(await rectOf(c, PROPS)), {
          away: () => parkMouse(c),
        });
      } finally {
        await unfloatPanel(c, "PROPERTIES");
      }
    },
  },
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
      await dialogStill(c);
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
    return inDialog(c, { command: "tbHelp_ShowAboutWindow", title: "About", close: "Close" }, () =>
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
    await pageDrawn(c);
    await paneAside();
  }
  // The docs page in the frame on `conn`'s page (`frame`, as inFrame takes it) drawn whole:
  // its fonts loaded, the images in its view loaded, its body unchanged for a quarter of a
  // second, and two frames on.
  async function pageDrawn(conn, frame = origin) {
    let last = null;
    let since = 0;
    const DRAWN = `document.fonts.status === "loaded" &&
  [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).every((i) => i.complete)
  ? document.body.innerHTML.length + ":" + document.body.scrollHeight : null`;
    let error = null;
    const drawn = await waitFor(
      conn,
      async () => {
        const now = await inFrame(conn, frame, DRAWN).catch((e) => {
          error = e;
          return null;
        });
        if (now !== last) [last, since] = [now, Date.now()];
        return now !== null && Date.now() - since >= 250;
      },
      { timeout: 20000, interval: 100 },
    );
    if (!drawn) throw new Error(`the docs page in the frame was never drawn whole${error ? `: ${error.message}` : ""}`);
    await frames(conn);
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
            win.shot = c.shot;
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
      // The window's page is a string the add-in loads, so its frame of the docs is on
      // another site, a target of its own.
      const frame = await waitFor(c, () => attach(windowPort, origin, { type: "iframe" }).catch(() => null), {
        timeout: 30000,
      });
      if (!frame) throw new Error(`no frame of ${origin} on the window's DevTools port ${windowPort}`);
      try {
        await pageDrawn(win, frame);
        return await snap(win, "Window", null, { frame });
      } finally {
        frame.close();
      }
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
  ...sampleShots,
  ...settingsShots,
  ...glyphShots,
  ...globalSearchShots,
  ...sample6Shots,
  ...designerShots,
  ...formShots,
  newProjectOptionsShot,
];

// ---------------------------------------------------------------- the jobs

// The long setups, cut where a part can start from the IDE's first state: `from` the path
// of the part's first picture, `suffix` its job's name. A shot that shows state an earlier
// shot of its setup leaves (the layout behind 9eeffbcf, the Project Explorer's selection in
// packLicenceFiles) brings the IDE to it itself, so that it comes out the same in a part.
const PARTS = {
  "no-project": [
    { suffix: "-2", from: "IDE/Images/New_Project.png" },
    { suffix: "-3", from: "IDE/Images/IDE.png" },
  ],
  sample: [
    { suffix: "-2", from: "IDE/Images/OpenEditors_1.png" },
    { suffix: "-3", from: "IDE/Images/PackagePublishing_1.png" },
  ],
};

// About how long each job takes, in seconds, for queuing the longest first. They also decide
// which IDEs run side by side, and that can move a few anti-aliased pixels: with sample
// started after no-project, Diagnostics came out with 34 pixels of one arrow's edge a grey
// level or two off, twice. Rerun twice after changing them.
const JOB_SECONDS = {
  help: 45,
  project: 11,
  sample: 34,
  "sample-2": 55,
  "sample-3": 54,
  settings: 22,
  "settings-symbols": 8,
  "settings-webview2": 20,
  "settings-fusion": 12,
  glyphs: 24,
  "global-search": 58,
  sample6: 26,
  designer: 62,
  forms: 30,
  "no-project": 33,
  "no-project-2": 38,
  "no-project-3": 41,
};

// ---------------------------------------------------------------- run

const selected = SHOTS.filter((s) => !only || only.test(s.out));
const wanted = Object.keys(SETUPS).filter((name) => selected.some((s) => s.setup === name));
if (!selected.length) die(2, `no picture's path matches ${values.only}`);
if (wanted.includes("help") && !existsSync(path.join(SITE, "tB", "symbols.json"))) {
  die(2, `no built site in ${SITE}: run build.bat first`);
}

// A job is one IDE: a setup started for some of its shots, in the table's order. With
// --jobs 1 every setup is one job. With more, a setup that has PARTS is cut into one job
// per part, so that the long ones do not decide how long the run takes.
function planJobs() {
  const jobs = [];
  for (const name of wanted) {
    const parts = jobCount > 1 ? (PARTS[name] ?? []) : [];
    let part = { suffix: "" };
    const byPart = new Map([[part, []]]);
    for (const shot of SHOTS.filter((s) => s.setup === name)) {
      const next = parts.find((p) => p.from === shot.out);
      if (next) byPart.set((part = next), []);
      if (selected.includes(shot)) byPart.get(part).push(shot);
    }
    for (const [p, shots] of byPart) {
      if (!shots.length) continue;
      jobs.push({
        name: name + p.suffix,
        setup: name,
        shots,
        weight: JOB_SECONDS[name + p.suffix] ?? shots.length * 10,
        ports: [],
      });
    }
  }
  // the longest first, so that the last to start is a short one; one at a time, in the
  // table's order
  return jobCount > 1 ? jobs.sort((a, b) => b.weight - a.weight) : jobs;
}
const jobs = planJobs();

let ports;
try {
  ports = await claimPorts(
    jobs.reduce((n, job) => n + SETUPS[job.setup].ports, 0),
    { from: firstPort },
  );
} catch (e) {
  die(2, e.message);
}
{
  let at = 0;
  for (const job of jobs) {
    job.ports = ports.slice(at, at + SETUPS[job.setup].ports);
    at += job.ports.length;
  }
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
// The SaveSetting application names of the add-ins a setup loads. What they have saved is
// the user's (an installed copy of the add-in reads the same key): a run starts from none,
// and puts it back at the end.
const ADDIN_SETTINGS = { help: SETTINGS, "global-search": GS_SETTINGS, designer: GS_SETTINGS };
const savedApps = [...new Set(wanted.filter((name) => ADDIN_SETTINGS[name]).map((name) => ADDIN_SETTINGS[name]))];
const settingsBefore = savedApps.length ? snapshotKeys(savedApps.map(settingsKey)) : null;
if (settingsBefore) deleteSettings(savedApps);

const running = new Set(); // the jobs with an IDE open: { lane, server }

function restoreSettings() {
  if (settingsBefore) restoreKeys(settingsBefore);
}

exitOnCrash(() => {
  console.error("putting the registry back after the crash");
  for (const run of running) if (run.lane.run) shutdownIde(run.lane.run);
  finishTidy(tidy);
  restoreSettings();
});

// Writes a picture when its bytes differ from the file's; says which.
function keep(name, out, png) {
  const file = path.join(outRoot, out);
  mkdirSync(path.dirname(file), { recursive: true });
  let state = "new";
  if (existsSync(file)) {
    const was = readFileSync(file);
    state = was.equals(png) ? "unchanged" : "updated";
    if (state === "updated") writeDiff(name, out, was, png);
  }
  if (state !== "unchanged") writeFileSync(file, png);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  say(
    name,
    `${out}: ${state} (${w}x${h} px, ${png.length} bytes; shown at {:width="${w / SCALE}" height="${h / SCALE}"})`,
  );
}

// Ends a job's IDE and what it served.
async function endRun(run) {
  running.delete(run);
  try {
    await run.lane.close();
  } catch (e) {
    complain(run.name, e.message);
  }
  run.server?.close();
}

// The exit code for an error from one step: 1 when it is the add-in's or the
// project's own fault, 2 when the tool failed.
let failed = 0;
const t0 = Date.now();

async function runJob(job) {
  const setup = SETUPS[job.setup];
  const started = Date.now();
  say(job.name, `starting (${job.shots.length} pictures)`);
  const run = {
    name: job.name,
    step: "start",
    ports: job.ports,
    work: path.join(root, job.name),
    lane: null,
    server: null,
    c: null,
  };
  mkdirSync(run.work, { recursive: true });
  run.lane = new Lane({
    name: `shoot-${job.name}`,
    port: job.ports[0],
    work: run.work,
    ide,
    show: false,
    browserArgs: BROWSER_ARGS,
  });
  const state = newShotState(job.name);
  running.add(run);
  try {
    run.c = await setup.start(run);
    run.c.shot = state;
    const ctx = await setup.prepare(run);
    if (run.defaults) {
      say(
        job.name,
        `page settings put to their defaults (in the page only, saved nowhere): ${run.defaults.join("; ") || "none differed"}`,
      );
    }
    for (const shot of job.shots) {
      const file = path.join(outRoot, shot.out);
      state.reference = existsSync(file) ? readFileSync(file) : null;
      state.out = shot.out;
      try {
        keep(job.name, shot.out, await shot.take(ctx));
      } catch (e) {
        complain(job.name, `${shot.out}: FAILED: ${e.message}`);
        failed = 1;
      } finally {
        state.reference = null;
        state.out = null;
      }
    }
  } catch (e) {
    complain(job.name, e.message);
    // buildAddin's exitCode is tbbuild's: 1 compile errors, 4 the compiler
    // crashed. Lane.open says "does not compile" for a project with errors.
    const own =
      (run.step === "build" && (e.exitCode === 1 || e.exitCode === 4)) ||
      (run.step === "open" && / does not compile\n/.test(e.message)) ||
      run.step === "shoot";
    failed = Math.max(failed, own ? 1 : 2);
  }
  await endRun(run);
  say(job.name, `done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

// --jobs IDEs at a time, each taking the next of the queue when its job ends.
{
  const queue = [...jobs];
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await runJob(job);
  };
  await Promise.all(Array.from({ length: Math.min(jobCount, jobs.length) }, worker));
}
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);

const problems = [];
if (!finishTidy(tidy)) problems.push("the IDE's registry entries could not be put back (see the warning above)");
try {
  restoreSettings();
} catch (e) {
  problems.push(`the ${savedApps.join(" and ")} settings could not be put back: ${e.message}`);
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
  `the registry${settingsBefore ? ` and the ${savedApps.join(" and ")} settings are` : " is"} as ${settingsBefore ? "they were" : "it was"} found`,
);
process.exit(failed);
