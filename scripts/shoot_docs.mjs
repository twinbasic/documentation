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
//   community   the same, its compiler restarted on no licence key (in the page only):
//               the COMMUNITY EDITION badge, and the LIMITED one while a compiler starts
//   splash      the same again, for the splash dialog alone (see splashShot)
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
//   customcontrols  test/shots/customcontrols, two custom controls of its own on a
//               CustomControls form: the CustomControls tutorial's composites of their code
//               and PROPERTIES (lib/shot-composite.mjs)
//   code        the sample with test/shots/code staged onto it: the editor's greying of a
//               conditional-compilation block under each build, and the inline hints of a
//               [Flags] enumeration; customcontrols also has the tutorial's code pictures
//               (attributes, the GUID hint, the hover, a form's JSON)
//   sample9     Sample 9 open: its WebView_Create handler, for the WebView2 tutorial
//   featuremap  test/shots/featuremap, FeatureTour: the whole window with twelve of the IDE's
//               features named, in a layout and with editor options set in the page only
//   code-chapter  the same project with test/shots/codechapter staged onto it: the
//               "Writing code" chapter's pictures of the editor (tabs, combo boxes, menus,
//               IntelliSense, finding, bookmarks, Outline, DIAGNOSTICS) and the Edit and
//               View menus with the code focused
//   debugging   the same with test/shots/debugging staged as well: the "Running and
//               debugging" chapter's pictures of a paused program, run from the IDE
//   no-project  no project, as from the IDE's icon: every menu in its
//               no-project state, the dialogs that need no project, and the window,
//               its bars and its panels (each shown as a floating window on its own)
//   programs    test/shots/programs, ShotPrograms, built in the IDE: each picture is the
//               window of the exe, started on a private desktop with a command line naming
//               its form, taken with PrintWindow (lib/tb-ide.mjs's captureWindow), once,
//               in no theme; the ListView's is of the project run from the IDE (F5)
//   codelens    test/shots/codelens: a procedure run by its CodeLens bar, the editor above
//               the DEBUG CONSOLE
//   memory      test/shots/memory: Sub Main run to its Stop, and the MEMORY 1 pane showing
//               a String's characters
//   package     the sample built as a TWINPACK package, and fusion test/shots/fusion, whose
//               Fusion host the compiler builds as it loads: the DEBUG CONSOLE's lines,
//               the paths they name on a folder of the tool's own (PACKAGE_ROOT)
//   package-server  the sample with test/shots/packages, signed out, with the network to
//               TWINSERV and an APPDATA of the tool's own on PACKAGE_ROOT: Project Settings'
//               list of packages, packages downloaded, embedded and linked, and the questions
//               the IDE asks about a linked copy; settings-linked the sample linking a package
//               it has no copy of, and package-check the sample with an older build of a
//               package from TWINSERV embedded, for the check the IDE makes as it loads it
//   import      the sample open, and the VB6 project test/shots/vbp imported from a folder of
//               the tool's own on PACKAGE_ROOT: the Import from twinproj dialog
//   webpage     the demo open, and the Webpage pane on the documentation's home page, whose
//               page is captured from its own DevTools target and put into the pane's picture
//   web         no IDE: a Chrome (puppeteer's) on a private desktop, for the public web pages
//               the FAQ shows, taken once, at 2x
//
// What makes the pictures repeatable, so that a second run changes no byte:
//
//   * The IDE's page is laid out at 100% whatever the display's scaling
//     (--force-device-scale-factor=1, a WebView2 argument), and is then given a
//     fixed size and density, 1280 by 880 CSS pixels at 2x, through the DevTools
//     device-metrics override. A capture of a rectangle (Page.captureScreenshot
//     with a clip) is exactly twice the rectangle's size, and the pages show it
//     at half that size.
//   * Text is drawn in grey levels, never ClearType (--disable-lcd-text, for the
//     IDE's WebView2 and the web pages' Chrome alike). Without it Chromium chose
//     per run: one picture came out in ClearType from a run of a few setups and in
//     grey from a full run, and so changed from run to run.
//   * Animations, transitions, the text caret and Monaco's cursor are turned
//     off by a style sheet put into the document and into every shadow root
//     (a tool window is one), in every picture. Otherwise a blink or a fade is
//     in some captures.
//   * Every picture is taken twice, in the IDE's dark theme as X.png and in its Light
//     theme as X.light.png, by one IDE: it takes its pictures, is switched to Light by
//     the IDE's own command, and takes them again. The site shows the light picture in
//     its light theme (builder/theme-pictures.mjs). A light picture with the dark one's
//     pixels is not kept. Light lays the window out a few pixels differently, so a light
//     picture can be a few pixels off the dark one's size; the page shows each at its own
//     (SIZE_SLACK). A label's pill follows the theme (lib/shot-annotate.mjs).
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
// transparent. A dialog is captured opaque, as a clip of the dialog's box. The open
// list of a native select is an OS window, which no capture holds: it is drawn
// in the page as a replica (lib/shot-annotate.mjs's `list`).
//
// The Windows user name must never be in a published picture. Before a picture
// is kept, the visible text of the page it was taken from (the document, every
// shadow root and the docs page in the pane's frame) is searched for it, and a
// picture whose page holds it is refused. A native tooltip is not drawn and is not
// read (the IDE's title tooltip holds the project's path), except the services badge's, a
// replica drawn in the page (TOOLTIP_CSS) that is read like the rest. A program's window is
// not a page: the texts of the window and its child windows are searched instead,
// and what the program draws itself is the fixture's own text (see programShot).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import path from "node:path";
import puppeteer from "puppeteer";
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
import { launchBrowser } from "./lib/browser.mjs";
import { annotate as annotateOver, LAYER_ID, resolveAnchors, unannotate } from "./lib/shot-annotate.mjs";
import { composite, uncomposite } from "./lib/shot-composite.mjs";
import { decodePng, encodePng } from "./lib/png.mjs";
import { iconGroup, iconImage, manifestResource, resFile } from "./lib/res-file.mjs";
import { diffPicture } from "./lib/shot-diff.mjs";
import { attach } from "./lib/tb-cdp.mjs";
import { consoleMark, linesSince } from "./lib/tb-ide-console.mjs";
import { removeTree } from "./lib/tb-ide-copy.mjs";
import {
  awaitNewCompiler,
  buildProject,
  COMPILE_TIMEOUT,
  captureWindow,
  compilerPid,
  desktopWindows,
  killTree,
  launchOnDesktop,
  shutdownIde,
  sleep,
  waitForCompile,
} from "./lib/tb-ide.mjs";
import { dropBundle, writeBundle } from "./svgshot/bundle.mjs";
import { svgOfPage } from "./svgshot/capture.mjs";
import { useSubsetCache } from "./svgshot/fonts.mjs";
import { holdsUserName, judgeSvg, SVG_FAITHFUL, writeSvg } from "./svgshot/keep.mjs";
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
  waitForEditAnswer,
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
const CUSTOMCONTROLS = path.join(REPO_ROOT, "test", "shots", "customcontrols");
const CODE = path.join(REPO_ROOT, "test", "shots", "code");
const FEATUREMAP = path.join(REPO_ROOT, "test", "shots", "featuremap");
const SETTINGS_FIXTURES = path.join(REPO_ROOT, "test", "shots", "settings");
const DEMO_FILE = "/Inventory/Sources/Inventory.twin";
const DEMO_SOURCE = path.join(DEMO, "Sources", "Inventory.twin");
const SITE = path.join(REPO_ROOT, "docs", "_site");
const DEFAULT_OUT = path.join(REPO_ROOT, "docs");
const DEFAULT_BUNDLES = path.join(REPO_ROOT, ".svgshot-bundles");

// The IDE page's size in CSS pixels, and the detached window's. Both at 2x.
const IDE_SIZE = { width: 1280, height: 880 };
const WINDOW_SIZE = { width: 900, height: 700 };
const SCALE = 2;
// Every IDE lays its page out at 100% whatever the display's scaling, and draws its text in
// grey levels, never ClearType (LCD_TEXT).
const LCD_TEXT = "--disable-lcd-text";
const BROWSER_ARGS = `--force-device-scale-factor=1 ${LCD_TEXT}`;

const USAGE = `usage: node scripts/shoot_docs.mjs [--only <regex>] [--out <dir>] [--diffs <dir>] [--jobs N] [--port N] [--ide <twinBASIC.exe>] [--svg] [-h, --help]

Takes the pictures of the IDE that the documentation shows, from IDEs on a
private desktop, at 2x, each in the IDE's dark theme (X.png) and then in its Light
theme (X.light.png, not kept when it has the dark picture's pixels, and removed
when there is one already): the help add-in's eight (setup help),
the menus, dialogs, bars and panels that need no project (setups no-project and project),
the splash and the status bar's COMMUNITY EDITION and LIMITED badges (setups splash and
community),
the panels, editor, Project Settings and icons of a sample project (setups sample,
settings and glyphs), those of the IDE's Samples 15 and 6 (setups
global-search and sample6), the form and report designers and the Format menu
(setup designer), the Toolbox and PROPERTIES with a control on a form (setups
forms and settings-webview2), and the CustomControls tutorial's pictures of a
custom control's code and PROPERTIES (setup customcontrols), and the editor alone:
the build select's greying, inline hints, a hover, a form's JSON (setups code,
customcontrols and sample9), the whole window with its features named (setup
featuremap), the editor's tabs, combo boxes, menus, IntelliSense, finding and DIAGNOSTICS
in the same project (setup code-chapter), the same project paused, stopped by an error
and running, with its panels, hovers, console and the Debug and Run menus (setup debugging),
a procedure run by its CodeLens bar (setup codelens), the MEMORY 1
pane at a Stop, showing a String (setup memory), the DEBUG
CONSOLE after a package build and a Fusion host build (setups package and fusion),
Project Settings' packages from TWINSERV, signed out, downloaded, embedded and linked
(setups package-server, settings-linked and package-check; they need the network),
and the windows of a running program, the fixture test/shots/programs (setup
programs): those are taken once, as the program draws them, at the display's
DPI, and shown at their size at 96 DPI; a VB6 project's import (setup import),
the Webpage pane on the documentation's home page (setup webpage), and the
public web pages the FAQ shows, in a Chrome on a private desktop, once (setup
web; it and webpage need the network).
A light picture can be a few pixels off the dark one's size, since Light lays
the window out a little differently; the site shows each at its own size.
Each setup is one IDE, started when a picture in it is selected. A picture is
written only when it differs from the file already there by more than a
capture's noise (a few grey levels at a few edge pixels); each is reported as
new, updated or unchanged, and the run ends with how many of each
theme came out each way. The IDE's registry entries and the
saved settings of the add-ins it loads are put back afterwards. The help add-in's pane
shows pages from docs/_site, so run build.bat first for those.

A picture is refused, and the run fails, when the visible text of the page it
was taken from, or a text of the program window it is of, holds the Windows user
name.

  --only <regex>   only the pictures whose path under the output folder
                   (IDE/Menu/Images/Menu_File.png, or its .light.png) matches;
                   each is taken in both themes, a program's window once
  --out <dir>      the folder the pictures' paths are under (default docs)
  --diffs <dir>    write a difference picture into <dir> (not under docs) for
                   each picture that is updated, named for its path and theme
                   (IDE__Menu__Images__Menu_File.dark.png): the file on disk, the new
                   picture and their difference side by side, the difference
                   amplified (yellow for one grey level, shading to red), with
                   the differing region magnified under them. Also one for each
                   two captures of one state that disagree, named .capture-<n>,
                   one for each picture left as it is because it differs only by
                   a capture's noise, named .noise, and one of the two themes of
                   a light picture refused for its size, named .size. Files of
                   the same name are overwritten
  --jobs <n>       how many IDEs run at once (default 6). The setups are queued,
                   the longest first, and the long ones (no-project, sample and
                   customcontrols) are split into parts that each get an IDE of their own; every
                   line is prefixed with its setup or part. With --jobs 1 each
                   setup runs in one IDE, one after another, in the table's order
  --port <n>       the first IDE's DevTools port: the first free ones from n
                   (default 9700); every IDE takes one, the help setup three, the
                   detached window's and the building IDE's after its own, and the
                   global-search and designer setups two, the building IDE's after
                   its own
  --ide <path>     the twinBASIC.exe to copy (default: $TB_IDE, else the
                   newest twinBASIC_IDE_BETA_* on the Desktop)
  --svg            also write each picture as SVG beside its PNG (X.svg),
                   drawn from the page's DOM at the moment of the capture, its
                   text in subsets of the fonts the IDE drew it with (needs
                   Python with fontTools: scripts/subset_font.py); each is
                   reported with how much of it differs from the PNG, and with
                   --diffs its difference map goes there as <name>.svg-diff.png.
                   An SVG with more than 0.25% of its pixels far off the PNG's
                   is not written, and one written before is removed, so that
                   the page shows the PNG; with --diffs it goes there instead,
                   as <name>.svg. An SVG that holds the Windows user name fails
                   the picture. Each picture's bundle, what its SVG is drawn
                   from, goes to the bundle cache for scripts/svgshot/replay.mjs
  --bundles <dir>  with --svg, the bundle cache (default .svgshot-bundles in the
                   repository, which git ignores); never under docs
  -h, --help       print this text and exit

Exit codes:
  0  every picture was written or was unchanged
  1  a picture failed: an element was not found, the page showed the user name,
     a light picture's size is more than 32 pixels off the dark one's (the IDE
     was not in the state the dark picture shows), the add-in did not build, or
     the demo project does not compile
  2  the tool could not run: a refused command line, no IDE, no built site, a
     registry it could not record, or a crash
  3  the registry or the work folder was not put back; see the lines above`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      only: { type: "string" },
      out: { type: "string" },
      diffs: { type: "string" },
      bundles: { type: "string" },
      jobs: { type: "string" },
      port: { type: "string" },
      ide: { type: "string" },
      svg: { type: "boolean", default: false },
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
// With --svg, each picture's bundle (svgshot/bundle.mjs), for replay.mjs: never under docs,
// since a bundle holds the Windows user name.
const bundlesRoot = values.svg ? path.resolve(values.bundles ?? DEFAULT_BUNDLES) : null;
// path.relative gives an absolute path across drives, which is outside docs and does not start with "..".
for (const [option, root] of [
  ["--diffs", diffsRoot],
  ["--bundles", bundlesRoot],
]) {
  if (!root) continue;
  const rel = path.relative(path.join(REPO_ROOT, "docs"), root);
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) die(2, `${option} must not be under docs: ${root}`);
}
// The fonts' cuts are kept beside the bundles, as replay.mjs keeps them (fonts.mjs).
if (bundlesRoot) useSubsetCache(path.join(bundlesRoot, "subsets"));

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
// the page, to put back; for a light picture, `prefer` the dark picture when no light file is
// there yet; with --svg, `svg` the SVG of the picture `capture` returned last.
const newShotState = (name) => ({ name, out: null, reference: null, prefer: null, editedOriginal: null, svg: null });

// A line of output, prefixed with the setup it is from (they run at once).
const say = (name, text) => console.log(`[${name}] ${text}`);
const complain = (name, text) => console.error(`[${name}] ${text}`);

// With --diffs, the difference picture of `before` and `after` (PNG files) for the picture
// `out`, as <out with its folders joined by __ and no extension>.<theme><suffix>.png, the
// theme dark or light. A failure to write it is said, and fails nothing.
function writeDiff(name, out, before, after, { suffix = "", labels } = {}) {
  if (!diffsRoot) return;
  const theme = /\.light\.png$/i.test(out) ? "light" : "dark";
  const base = out.replace(/[\\/]/g, "__").replace(/(\.light)?\.png$/i, "");
  const file = path.join(diffsRoot, `${base}.${theme}${suffix}.png`);
  try {
    mkdirSync(diffsRoot, { recursive: true });
    writeFileSync(file, diffPicture(before, after, labels));
  } catch (e) {
    complain(name, `the difference picture ${file} was not written: ${e.message}`);
  }
}

// Whether two captures (PNG files) are the same picture but for a capture's noise: one size, no
// channel of any pixel more than NOISE_LEVELS grey levels apart, and no more than NOISE_SHARE of
// the pixels apart at all. The noise seen: 1 to 14 levels, along a shadow's or an arrow's edge,
// at a rounded corner, in a scaled bitmap (34 pixels; 81 on About's Close button; the most, 563
// along a dialog's top edge, 0.13% of it). A change the IDE draws moves text or colour by far
// more than 16 levels.
// The pixels inside `rects` (unsteadyRects) are left out.
const NOISE_LEVELS = 16;
const NOISE_SHARE = 0.005;
function nearly(a, b, rects = []) {
  const A = decodePng(a);
  const B = decodePng(b);
  if (A.width !== B.width || A.height !== B.height) return false;
  const most = Math.max(1, Math.floor(A.width * A.height * NOISE_SHARE));
  let apart = 0;
  for (let i = 0; i < A.rgba.length; i += 4) {
    let d = 0;
    for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A.rgba[i + k] - B.rgba[i + k]));
    if (!d || inRects(rects, (i / 4) % A.width, Math.floor(i / 4 / A.width))) continue;
    if (d > NOISE_LEVELS || ++apart > most) return false;
  }
  return true;
}

const inRects = (rects, x, y) => rects.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1);

// Whether two captures are the same picture outside `rects`: byte for byte when there are none.
function same(a, b, rects) {
  if (a.equals(b)) return true;
  if (!rects.length) return false;
  const A = decodePng(a);
  const B = decodePng(b);
  if (A.width !== B.width || A.height !== B.height) return false;
  for (let i = 0; i < A.rgba.length; i += 4) {
    if (
      A.rgba[i] === B.rgba[i] &&
      A.rgba[i + 1] === B.rgba[i + 1] &&
      A.rgba[i + 2] === B.rgba[i + 2] &&
      A.rgba[i + 3] === B.rgba[i + 3]
    )
      continue;
    if (!inRects(rects, (i / 4) % A.width, Math.floor(i / 4 / A.width))) return false;
  }
  return true;
}

// Where in a capture of `clip` the page draws differently from frame to frame of its own accord,
// which no comparison of captures counts: a shot's `unsteady` regions, each `{on, pad}`, an
// annotation anchor (lib/shot-annotate.mjs) and how far round its box, in CSS pixels (1 by
// default, an edge's anti-aliasing), as device-pixel rects of the capture. A clip is in the
// document's coordinates; a capture of the whole window, in the window's.
async function unsteadyRects(conn, clip, unsteady) {
  if (!unsteady?.length) return [];
  const boxes = await resolveAnchors(conn, Object.fromEntries(unsteady.map((u, k) => [`u${k}`, u.on])));
  const scroll = clip ? await conn.evaluate("({ x: scrollX, y: scrollY })") : { x: 0, y: 0 };
  const ox = (clip?.x ?? 0) - scroll.x;
  const oy = (clip?.y ?? 0) - scroll.y;
  return unsteady.map((u, k) => {
    const b = boxes[`u${k}`];
    const pad = u.pad ?? 1;
    return {
      x0: Math.floor((b.x - pad - ox) * SCALE),
      y0: Math.floor((b.y - pad - oy) * SCALE),
      x1: Math.ceil((b.x + b.width + pad - ox) * SCALE),
      y1: Math.ceil((b.y + b.height + pad - oy) * SCALE),
    };
  });
}

// The pauses between the captures `capture` takes of one state, in milliseconds: the
// last two let the page rest long enough to settle.
const CAPTURE_GAPS = [150, 150, 300, 600, 1500, 1500];
// How long the page is left alone before the first capture.
const REST_MS = 1000;

// Fails the picture `name` when `text` holds the Windows user name, quoting where.
function refuseUserName(text, name, what) {
  const at = text.toLowerCase().indexOf(USER.toLowerCase());
  if (at < 0) return;
  const around = `${text.slice(Math.max(0, at - 40), at)}<user>${text.slice(at + USER.length, at + USER.length + 40)}`;
  throw new Error(`${what} for ${name} shows the Windows user name: ${JSON.stringify(around)}`);
}

// A capture of `clip` (CSS pixels, on whole device pixels) from `conn`, refused
// when the page's visible text holds the user name: before the first capture, and
// again, with the SVG when there is one, when a capture is chosen. The page can draw
// again in between (Project Settings put a row's real path back over the one a shot
// set, a second after the first check), and a capture is written to its file as soon
// as it is returned. `away` first takes the mouse
// where it touches nothing, since a control under it draws its hover look, unless
// the picture is of what the mouse rests on. `keep` makes it a cut-out, on a ground
// of the colour `solid` when that is given. `unsteady` names where the page draws
// differently from frame to frame of its own accord (unsteadyRects).
async function capture(conn, name, clip, { frame, away = null, keep = null, solid = null, unsteady = null } = {}) {
  refuseUserName(await textOf(conn, frame), name, "the page");
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
    // A new light picture has no file to equal, and prefers the dark picture (`prefer`) as
    // long as its first capture is within the noise of it: then one the theme does not change
    // comes out with the dark one's pixels. Else it is taken as a new picture.
    const want = conn.shot.reference;
    let prefer = want ? null : conn.shot.prefer;
    // With --svg, the SVG of the same clip, read while the page is still as captured
    // (the cut-out on, the menu open, the overlay drawn); a cut-out has no background.
    // Its size is the PNG's: a clip half a pixel past a whole CSS pixel (a menu 168.5
    // wide) is captured a device pixel short of it (168), and an SVG of the whole clip
    // would show the half of an edge the PNG cuts off.
    const picked = async (png) => {
      refuseUserName(await textOf(conn, frame), name, "the page as captured");
      if (values.svg) {
        const size = { width: png.readUInt32BE(16) / SCALE, height: png.readUInt32BE(20) / SCALE };
        conn.shot.svg = await svgOfPage(conn, clip && { ...clip, ...size }, { background: !keep });
        if (holdsUserName(conn.shot.svg.svg, USER)) throw new Error(`the SVG of ${name} holds the Windows user name`);
      }
      return png;
    };
    // Outside its unsteady regions a capture is compared byte for byte, as everywhere else;
    // one that matches the file or the dark picture there keeps that picture's bytes, so a
    // pixel that flickers does not rewrite the file on every run.
    const masks = await unsteadyRects(conn, clip, unsteady);
    let last = null;
    let agreed = null;
    for (let i = 0; ; i++) {
      const { data } = await conn.send("Page.captureScreenshot", params);
      const png = Buffer.from(data, "base64");
      if (want && same(want, png, masks)) return await picked(want);
      if (prefer && i === 0 && !nearly(prefer, png, masks)) prefer = null;
      if (prefer && same(prefer, png, masks)) return await picked(prefer);
      if (last && !same(last, png, masks) && conn.shot.out) {
        writeDiff(conn.shot.name, conn.shot.out, last, png, {
          suffix: `.capture-${i}`,
          labels: { before: `CAPTURE ${i - 1}`, after: `CAPTURE ${i}` },
        });
      }
      if (last && same(last, png, masks)) agreed = png;
      if (agreed && !want && !prefer) return await picked(agreed);
      if (i === CAPTURE_GAPS.length) break;
      last = png;
      await sleep(CAPTURE_GAPS[i]);
    }
    if (agreed) return await picked(agreed);
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

// Every picture is taken in the IDE's dark theme and again in its Light one (not Classic):
// X.png is the dark picture and X.light.png beside it the light one, and the site shows the
// one for its own theme (builder/theme-pictures.mjs). A setup takes its pictures in dark,
// is switched to Light and takes them again.
const THEMES = ["dark", "light"];
const THEME_COMMAND = { dark: "tbTheme_SwitchToDarkMode", light: "tbTheme_SwitchToLightMode" };
const THEME_NAME = { dark: "dark", light: "Light" };
// The path of a picture in a theme: the dark one is the path the shot table gives.
const themedOut = (out, theme) => (theme === "dark" ? out : out.replace(/\.png$/, ".light.png"));

// Whether the IDE's page is in a dark theme: its panels' colour is dark.
const pageIsDark = (c) =>
  c.evaluate(`(() => {
  const p = document.createElement("div");
  p.style.background = "var(--themeGeneralPanelBackColor)";
  document.body.appendChild(p);
  const [r, g, b] = getComputedStyle(p).backgroundColor.match(/\\d+/g).map(Number);
  p.remove();
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
})()`);

// The IDE in `theme` (dark or light), switched by its own command as the Window menu's
// Theme submenu switches it, once the page shows it: the panels' colour, the page's images
// and its fonts loaded, and two frames on. The page's call that would save the theme is
// one PAGE_DEFAULTS has made do nothing.
async function ensureTheme(c, theme) {
  const want = theme === "dark";
  if ((await pageIsDark(c)) === want) return;
  await c.evaluate(`executeIdeCommand(${JSON.stringify(THEME_COMMAND[theme])})`);
  if (!(await waitFor(c, async () => (await pageIsDark(c)) === want, { timeout: 10000 }))) {
    throw new Error(`the IDE did not switch to the ${THEME_NAME[theme]} theme`);
  }
  const loaded = `document.fonts.status === "loaded" && [...document.images].every((i) => i.complete)`;
  if (!(await waitFor(c, () => c.evaluate(loaded), { timeout: 10000, interval: 100 }))) {
    throw new Error(`the page's images did not load in the ${THEME_NAME[theme]} theme`);
  }
  await frames(c);
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
  await ensureTheme(c, "dark");
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
  await ensureTheme(c, "dark");
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
  await ensureTheme(c, "dark");
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
  await ensureTheme(c, "dark");
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

// ---- customcontrols: test/shots/customcontrols, CustomControlsDemo, a project referencing
// the CustomControls package with two custom controls of its own, MyGrid and MyButton (named
// so that they are not taken for the package's WaynesGrid and WaynesButton, which the Toolbox
// lists beside them), on a CustomControls form, frmCustom: the CustomControls tutorial's
// property sheet pictures. Their members have the tutorial's names. The controls' Toolbox
// images are the package's own, taken from the install's copy of the package under the names
// the classes' [CustomControl] attributes give.

async function startCustomControls(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, CUSTOMCONTROLS)}`);
  const src = path.join(run.work, "customcontrols-src");
  cpSync(CUSTOMCONTROLS, src, { recursive: true });
  const packages = path.join(path.dirname(ide), "packages");
  const pkg = readdirSync(packages).find((d) => d.endsWith("_CustomControlsPackage"));
  if (!pkg) throw new Error(`the install has no CustomControls package in ${packages}`);
  const unpacked = path.join(run.work, "customcontrols-package");
  unpackProject(path.join(packages, pkg, "Package.twinproj"), unpacked);
  mkdirSync(path.join(src, "Miscellaneous"), { recursive: true });
  for (const [from, to] of [
    ["frmGrid.png", "MyGrid.png"],
    ["frmButton.png", "MyButton.png"],
  ]) {
    cpSync(path.join(unpacked, "Miscellaneous", from), path.join(src, "Miscellaneous", to));
  }
  return run.lane.open(src);
}

// ---- code: the sample with test/shots/code staged onto it (in the work folder only): a module
// with a conditional-compilation block (the Compiler Constants page) and a module with a
// [Flags] enumeration (the Attributes page), for the pictures of the editor alone.

async function startCode(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, SAMPLE)} with ${path.relative(REPO_ROOT, CODE)}`);
  const src = stageSample(run);
  cpSync(CODE, src, { recursive: true });
  return run.lane.open(src);
}

// ---- sample9: Sample 9, the ActiveX WebView2 + Monaco sample, exported from the install and
// open: the code of its WebView_Create handler, for the WebView2 tutorial.

async function startSample9(run) {
  run.step = "open";
  say(run.name, "opening Sample 9");
  return run.lane.open(run.lane.exportSample("Sample 9"));
}

// ---- featuremap: test/shots/featuremap, FeatureTour, a Standard EXE of a class with a long
// function, a module and a user-defined type, with three variables declared without a type
// (warnings): the whole window with twelve of the IDE's features named.

async function startFeatureMap(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, FEATUREMAP)}`);
  const src = path.join(run.work, "featuremap-src");
  cpSync(FEATUREMAP, src, { recursive: true });
  return run.lane.open(src);
}

// ---- code-chapter: FeatureTour, the Inventory project of the feature map, with
// test/shots/codechapter's files staged onto it (in the work folder only: the feature map does
// not move), for the pictures of the "Writing code" chapter, all of one project. Helpers is a
// module with an enumeration, a hexadecimal constant of the wrong width and a variable ReDim
// declares; Ev and Ev2 are classes with events, one file; Watcher a class with WithEvents fields
// of both, handling one event of the first. The project's warnings are set as a person sets them
// in Project Settings, so that DIAGNOSTICS has a hint and an information message as well as the
// feature map's warnings: TB0016 (ReDim declares a variable) a hint, TB0012 (a hexadecimal
// literal of the wrong width) information. The project compiles clean; the one error its
// pictures show is put in by the shot, in the page only.
const CODE_CHAPTER = path.join(REPO_ROOT, "test", "shots", "codechapter");
const CODE_CHAPTER_WARNINGS = { errors: [], hints: ["TB0016"], ignored: [], info: ["TB0012"], warnings: [] };

// ---- debugging: the same project with test/shots/debugging staged onto it as well, for the
// "Running and debugging" chapter: a module, Checks, with the chapter's FillTable (a Subscript
// error on its fourth pass), a Sub that starts a short ping with Shell, and a Sub that waits a
// minute at most. It is a setup of its own, so that the Writing code chapter's pictures (whose
// combo boxes list the project's modules) do not change.
const DEBUGGING = path.join(REPO_ROOT, "test", "shots", "debugging");

async function startCodeChapter(run, { extra = null } = {}) {
  run.step = "open";
  const what = [CODE_CHAPTER, ...(extra ? [extra] : [])].map((d) => path.relative(REPO_ROOT, d)).join(" and ");
  say(run.name, `opening ${path.relative(REPO_ROOT, FEATUREMAP)} with ${what}`);
  const src = path.join(run.work, extra ? "debugging-src" : "codechapter-src");
  cpSync(FEATUREMAP, src, { recursive: true });
  cpSync(CODE_CHAPTER, src, { recursive: true });
  if (extra) cpSync(extra, src, { recursive: true });
  const file = path.join(src, "Settings");
  const settings = JSON.parse(readFileSync(file, "utf8"));
  settings["project.warnings"] = CODE_CHAPTER_WARNINGS;
  writeFileSync(file, `${JSON.stringify(settings, null, "\t")}\n`);
  return run.lane.open(src);
}

// ---- forms-chapter: test/shots/forms, FormsDemo, for the pictures of the "Designing forms and
// reports" chapter (formsChapterShots): a form with a menu and controls of a few kinds, a
// Frame holding a TextBox, a control array, and a report with controls in two of its bands.
const FORMS_CHAPTER = path.join(REPO_ROOT, "test", "shots", "forms");

async function startFormsChapter(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, FORMS_CHAPTER)}`);
  const src = path.join(run.work, "forms-src");
  cpSync(FORMS_CHAPTER, src, { recursive: true });
  return run.lane.open(src);
}

// The IDE's desktop, where a previewed form's window shows, and a folder for its captures.
async function prepareFormsChapter(run) {
  const ctx = await prepareWithDesigners(run);
  ctx.desktop = `tbbuild-${run.ports[0]}`;
  ctx.windows = path.join(run.work, "windows");
  mkdirSync(ctx.windows, { recursive: true });
  return ctx;
}

// ---- community: the demo with the compiler started on no licence key, the status bar's
// COMMUNITY EDITION badge as the IDE draws it for a key that is not there (the Community
// Edition), and its LIMITED services badge while a compiler starts.The IDE reads the key from its settings into
// the page's `licenceKey` and passes it to each compiler it starts, which answers with the
// edition. The key is emptied in the page only, and the compiler restarted with the toolbar's
// button, as a key removed in IDE Options would be: the setting itself is never read, changed
// or removed by the tool, and the page's call that would save one is one PAGE_DEFAULTS has made
// do nothing (the compiler hands back the key it was given, which is then the page's own, so
// the IDE has nothing to save anyway).

async function prepareCommunity(run) {
  const ctx = await prepareProject(run);
  const { c } = run;
  if (
    !(await waitFor(c, () => c.evaluate("licenceIsSet === true && !!compilerLicence.innerText"), {
      timeout: 60000,
      interval: 250,
    }))
  ) {
    throw new Error("the compiler never answered the licence check");
  }
  await c.evaluate(`licenceKey = ""`);
  say(run.name, "restarting the compiler with no licence key, in the page only");
  await run.lane.restartCompiler();
  const community = await waitFor(c, () => c.evaluate(`compilerLicence.innerText === "COMMUNITY EDITION"`), {
    timeout: 60000,
    interval: 250,
  });
  if (!community) throw new Error("the compiler started with no key, and the licence badge is not COMMUNITY EDITION");
  await clearUserFromConsole(c);
  return ctx;
}

// A compiler's restart writes a line to the DEBUG CONSOLE that names the project's folder,
// which is under the Windows user's: while the page shows the user name, the console's Clear
// button is pressed (a real click), and the page given time to empty it.
async function clearUserFromConsole(c) {
  const shows = async () => (await textOf(c)).toLowerCase().includes(USER.toLowerCase());
  for (let i = 0; i < 5 && (await shows()); i++) {
    const b = await rectOf(c, '[title="Clear Debug Console"]');
    if (!b) throw new Error("the DEBUG CONSOLE has no Clear button");
    await clickAt(c, b.x + b.width / 2, b.y + b.height / 2);
    await waitFor(c, async () => !(await shows()), { timeout: 10000, interval: 200 });
  }
  await parkMouse(c);
  await frames(c);
}

const SETUPS = {
  help: { ports: 3, start: startHelp, prepare: prepareHelp },
  "global-search": { ports: 2, start: startGlobalSearch, prepare: prepareGlobalSearch },
  sample6: { ports: 1, start: startSample6, prepare: prepareSample },
  designer: { ports: 2, start: startDesigner, prepare: prepareDesigner },
  forms: { ports: 1, start: (run) => startDesigner(run, { addin: false }), prepare: prepareWithDesigners },
  "forms-chapter": { ports: 1, start: startFormsChapter, prepare: prepareFormsChapter },
  customcontrols: { ports: 1, start: startCustomControls, prepare: prepareWithDesigners },
  code: { ports: 1, start: startCode, prepare: prepareSample },
  sample9: { ports: 1, start: startSample9, prepare: prepareSample },
  featuremap: { ports: 1, start: startFeatureMap, prepare: prepareSample },
  "code-chapter": { ports: 1, start: startCodeChapter, prepare: prepareSample },
  debugging: { ports: 1, start: (run) => startCodeChapter(run, { extra: DEBUGGING }), prepare: prepareSample },
  project: { ports: 1, start: startProject, prepare: prepareProject },
  community: { ports: 1, start: startProject, prepare: prepareCommunity },
  splash: { ports: 1, start: startProject, prepare: prepareProject },
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
  programs: { ports: 1, start: startPrograms, prepare: preparePrograms },
  codelens: { ports: 1, start: startCodeLens, prepare: prepareSample },
  memory: { ports: 1, start: startMemory, prepare: prepareSample },
  package: { ports: 1, start: startPackage, prepare: prepareSample },
  fusion: { ports: 1, start: startFusion, prepare: prepareSample },
  "package-server": { ports: 1, start: startPackageServer, prepare: preparePackageServer },
  "settings-linked": { ports: 1, start: startSettings("linked"), prepare: prepareSample },
  "package-check": { ports: 1, start: startPackageCheck, prepare: prepareSample },
  import: { ports: 1, start: startImport, prepare: prepareSample },
  webpage: { ports: 1, start: startProject, prepare: prepareWebpage },
  web: { ports: 1, start: startWeb, prepare: prepareWeb },
};

// ---------------------------------------------------------------- the shots of the no-project setup

// A menu, as a cut-out: the bar item and its drop-down, and the submenu of an
// item when one is hovered. The menus carry a 1 px outline outside their
// border box, so the clip is grown by it, which is also what rounds their
// corners: the outline's corner is what fills the pixel the border's curve leaves.
const OUTLINE = 1;
// `before(c)` brings the IDE to the state the menu is shown in, after every menu is closed,
// and `after(c)`, when given, takes it out of that state once the menu is closed.
function menuShot(name, top, item = null, { subOnly = false, setup = "no-project", before = null, after = null } = {}) {
  return {
    out: `IDE/Menu/Images/${name}.png`,
    setup,
    async take({ c }) {
      await resetUi(c);
      try {
        if (before) await before(c);
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
        if (after) await after(c);
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
// element, waits for that one instead, and `what` names it.
async function dialogStill(c, { ms = 250, timeout = 5000, root = TOP_MODAL, what = null } = {}) {
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
      `  the ${what ?? (root === TOP_MODAL ? "dialog" : "designer")} was still changing after ${timeout / 1000} s`,
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
      },
      {
        type: "arrow",
        from: { of: DC_BUTTON("Clear Debug Console"), at: "top", dx: 50, dy: -64 },
        to: { of: DC_BUTTON("Clear Debug Console"), at: "top", dy: -3 },
      },
      // the menu is the Options button's: named from the right, since the arrows from the left
      // already converge on the buttons
      { type: "label", text: "Options", on: { css: "#contextMenu" }, side: "right", gap: 70 },
      { type: "arrow", from: { of: { css: "#contextMenu" }, at: "right", dx: 66 }, to: { css: "#contextMenu" } },
      { type: "label", text: "Input", on: LEFT_OF(DC_PANEL, 203, -90), side: "left" },
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
      { type: "label", text, on: LEFT_OF(DIAG_PANEL, dy), side: "left" },
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

// Find / Replace shown by Ctrl+H on a line of frmMain's code that holds no word to search for;
// `fn(sel)` takes the picture, `sel` the panel's selector, and the panel goes again however
// that goes.
async function inFindReplace(c, fn) {
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
    return await fn(sel);
  } finally {
    await pressKey(c, "Escape");
    await sleep(400);
    await closePanelIfShown(c, "FIND REPLACE");
  }
}

// A capture of `area` with `prims` drawn over it (a select's list among them: lib/shot-annotate.mjs's
// `list`), the clip as large as what they drew and `margin` more round it all, and `below`
// more at its foot.
async function listClip(c, name, area, prims, { margin = 6, below = 0 } = {}) {
  try {
    const { box } = await annotateOver(c, prims);
    const clip = grow(box ? union(area, box) : area, margin);
    clip.height += below;
    return await capture(c, name, snapOut(clip), { away: () => parkMouse(c) });
  } finally {
    await unannotate(c);
  }
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
    take: ({ c }) =>
      inFindReplace(c, async (sel) => {
        const label = await c.evaluate(`(() => {
  const e = [...document.querySelectorAll(${JSON.stringify(`${sel} *`)})].find((x) => x.children.length === 0 && x.textContent.trim() === "Current File");
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
        await clickAt(c, label.x, label.y);
        await sleep(400);
        return capture(c, "FindReplace", snapOut(await rectOf(c, sel)), { away: () => parkMouse(c) });
      }),
  },
  {
    // the Direction row, its select's list drawn open below it
    out: "IDE/Images/FindReplace_Direction.png",
    setup: "sample",
    take: ({ c }) =>
      inFindReplace(c, async (sel) => {
        const row = await rectOf(c, `${sel} .findReplacePanelHorzGroup:has(.findReplacePanelDropDown2)`);
        if (!row) throw new Error("the Find / Replace panel has no Direction row");
        return listClip(c, "FindReplace_Direction", row, [
          { type: "list", select: { css: `${sel} .findReplacePanelDropDown2` } },
        ]);
      }),
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
  editorOptionsShot(),
];

// ---- the editor's Options pop-up, its four selects drawn open at once

// EDITOR 1's own element `css` (its header's buttons).
const editorPanelPart = (css) =>
  `[...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "EDITOR 1")?.closest(".toolWindowContainer")?.querySelector(${JSON.stringify(css)})`;
const EDITOR_OPTIONS = ".ellipsesIcon2";
// The page the picture is of: EDITOR 1 alone, with no file open.
const EDITOR_OPTIONS_PAGE = { width: 760, height: 560 };
// The pop-up's selects, in its order, and their lists' names.
const EDITOR_SELECTS = ["folding", "whitespace", "fontSize", "navigationBar"];
const editorSelect = (i) => `#contextMenu > .contextMenuItem:nth-child(${i + 1}) select`;

// EDITOR 1 with no file open and every other panel out of the layout, in a page of
// EDITOR_OPTIONS_PAGE, its Options pop-up open (a real click on its button) and moved down
// and left, under the header, so that the four lists fit beside it: a native select's list is
// an OS window, so the four are drawn, open at once, to the right of the pop-up (the lists of
// lower rows nearer), each with an arrow from its select. The header's two buttons boxed and
// named. The default layout is put back after it. (A function declaration: sampleShots is
// made before this part of the file is run.)
function editorOptionsShot() {
  return { out: "IDE/Images/Editor.png", setup: "sample", take: takeEditorOptions };
}
async function takeEditorOptions({ c }) {
  await resetUi(c);
  // the earlier pictures of the setup have edited frmMain's code and put it back
  await closeTabs(c, [], { discard: true });
  for (const id of DOCKED_BESIDE_EDITOR) await undock(c, id);
  try {
    return await atSize(c, EDITOR_OPTIONS_PAGE.width, EDITOR_OPTIONS_PAGE.height, async () => {
      const ed = await settledBox(c, editorPanelRect);
      const button = await c.evaluate(`(() => {
  const e = ${editorPanelPart(EDITOR_OPTIONS)};
  const r = e?.getBoundingClientRect();
  return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);
      const tabs = await rectOf(c, TABS_BUTTON);
      if (!button || !tabs) throw new Error("EDITOR 1 has no Options or no Tabs List button");
      try {
        await clickAt(c, button.x + button.width / 2, button.y + button.height / 2);
        if (!(await menuOpened(c))) throw new Error("the Options button opened no pop-up");
        await c.evaluate(
          `Object.assign(document.getElementById("contextMenu").style, { left: "${ed.x + 24}px", top: "${tabs.y + tabs.height + 56}px" })`,
        );
        await frames(c);
        const at = await resolveAnchors(c, {
          popup: { css: "#contextMenu" },
          ...Object.fromEntries(EDITOR_SELECTS.map((n, i) => [n, { css: editorSelect(i) }])),
        });
        // each list's top 34 pixels under its select's middle, the lists of lower rows nearer the
        // pop-up, so that each arrow can leave its select level and turn down into its list
        // without crossing another
        const top = (n) => at[n].y + at[n].height / 2 + 34;
        const point = (x, y) => ({ rect: { x, y, width: 0, height: 0 } });
        const LIST = (n) => ({ css: `.tbShotList[data-name="${n}"]` });
        const lists = [];
        let prev = null;
        for (const n of [...EDITOR_SELECTS].reverse()) {
          lists.push({
            type: "list",
            name: n,
            select: { css: editorSelect(EDITOR_SELECTS.indexOf(n)) },
            at: prev
              ? { of: LIST(prev), at: "top-right", dx: 24, dy: top(n) - top(prev) }
              : point(at.popup.x + at.popup.width + 20, top(n)),
            rows: n === "fontSize" ? 7 : undefined,
          });
          prev = n;
        }
        const BUTTON = { rect: button };
        const POPUP = { css: "#contextMenu" };
        const annotate = [
          ...lists,
          ...EDITOR_SELECTS.map((n, i) => ({
            type: "arrow",
            from: { of: { css: editorSelect(i) }, at: "right", dx: 4 },
            to: { of: LIST(n), at: "top", dy: -3 },
            elbow: true,
          })),
          { type: "box", on: BUTTON, pad: 2, halo: false },
          { type: "box", on: { css: TABS_BUTTON }, pad: 2, halo: false },
          // the pop-up's arrow leaves the button level, to the left, and comes down onto it
          {
            type: "arrow",
            from: { of: BUTTON, at: "left", dx: -6 },
            to: { of: POPUP, at: "top-right", dx: -40, dy: -4 },
            elbow: true,
          },
          {
            type: "label",
            text: "Options",
            on: { of: POPUP, at: "top-right", dx: -54, dy: -32 },
            side: "left",
            gap: 0,
          },
          { type: "label", text: "Tabs List", on: { css: TABS_BUTTON }, side: "left", gap: 64 },
          {
            type: "arrow",
            from: { of: { css: TABS_BUTTON }, at: "left", dx: -60 },
            to: { css: TABS_BUTTON },
            tipGap: 8,
          },
        ];
        const { box } = await annotateOver(c, annotate);
        const popup = await rectOf(c, "#contextMenu");
        const area = union({ x: ed.x, y: ed.y, width: ed.width, height: popup.y + popup.height + 16 - ed.y }, box);
        return await capture(c, "Editor", snapOut(area, EDITOR_OPTIONS_PAGE.width, EDITOR_OPTIONS_PAGE.height), {
          away: () => parkMouse(c),
        });
      } finally {
        await unannotate(c);
        await closeMenus(c);
      }
    });
  } finally {
    await defaultLayout(c);
  }
}

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
// instead, in the page only, in its text and in its text boxes. nameUserAsUserIn does it in
// each element `css` selects.
const nameUserAsUserIn = (c, css) =>
  c.evaluate(`(() => {
  const re = new RegExp(${JSON.stringify(USER_PATTERN)}, "gi");
  const roots = ${css ? `[...document.querySelectorAll(${JSON.stringify(css)})]` : `[[...document.querySelectorAll(".modalDialogContainer")].pop()]`};
  for (const m of roots) {
    const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) n.nodeValue = n.nodeValue.replace(re, "User");
    for (const i of m.querySelectorAll("input, textarea")) i.value = i.value.replace(re, "User");
  }
})()`);
const nameUserAsUser = (c) => nameUserAsUserIn(c, null);

// The lane stages the project with a build path in its temporary folder, and the dialog shows
// it: the template's own path instead, typed as a user would (input and change), so that the
// dialog holds it and does not put the real path back when it draws the row again, as it does
// now and then over the value nameUserAsUser sets; Cancel keeps nothing. capture refuses the
// picture if the real path shows all the same, in or out of the clip. For every shot of the
// dialog in which the row may be drawn.
const templateBuildPath = (c) =>
  c.evaluate(`(() => {
  const i = document.querySelector(${JSON.stringify(`${settingPart("project.buildPath", "CONTENT")} input`)});
  i.value = "\${SourcePath}\\\\Build\\\\\${ProjectName}_\${Architecture}.\${FileExtension}";
  i.dispatchEvent(new Event("input", { bubbles: true }));
  i.dispatchEvent(new Event("change", { bubbles: true }));
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
    async prepare(c) {
      await templateBuildPath(c);
      await c.evaluate(
        `(() => { const l = document.querySelector(${JSON.stringify(SETTINGS_LIST)}); l.scrollTop = l.scrollHeight; })()`,
      );
    },
  }),
  settingsShot("Features/Images/4fc2bf99-2bec-4943-837d-21038d791574.png", {
    prepare: (c) => scrollToSetting(c, "compiler.traceFlags"),
    clipOf: (m) => ({ x: m.x, y: m.y, width: 760, height: 531 }),
  }),
  settingsShot("Features/Images/569150839-9ffc87ac-250d-40a4-bb47-669b607ad76f.png", {
    async prepare(c) {
      await templateBuildPath(c);
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
  settingsShot("Miscellaneous/Images/2a1c71fd-f81c-4bd3-b61a-0f2979e8961f.png", {
    // the Compiler Warnings section, its heading to the fifteenth warning, TB0002's list drawn
    // open below its select and the two warnings Option Explicit is about ringed
    async prepare(c) {
      // the build path row is outside the clip, but on the page the user-name check reads
      await templateBuildPath(c);
      await c.evaluate(`(() => {
  const w = document.querySelector(".warningOptions");
  w.style.height = "360px";
  w.style.maxHeight = "none";
})()`);
      await scrollToSetting(c, "project.warnings", 12);
    },
    clipOf: async (_m, c) =>
      c.evaluate(`(() => {
  // the heading's own text, not its box, which reaches the dialog's left edge
  const range = document.createRange();
  range.selectNodeContents(document.querySelector(${JSON.stringify(settingPart("project.warnings", "HEADER"))}));
  const h = range.getBoundingClientRect();
  const w = document.querySelector(".warningOptions").getBoundingClientRect();
  const rows = [...document.querySelectorAll(".warningOptions .warningDiv")].map((e) => e.getBoundingClientRect());
  // as far right as the old picture: the longest description (TB0004's) goes on past it
  const x = Math.min(h.x, w.x) - 12;
  return { x, y: h.y - 8, width: w.x + 760 - x, height: rows[14].bottom + 1 - (h.y - 8) };
})()`),
    annotate: [
      { type: "list", select: { css: ".warningDiv:has(.warning_TB0002_warning) .warningState" } },
      {
        // one ring round both codes, its round ends clear of their first and last letters
        type: "ring",
        on: {
          span: [
            { css: ".warningDescription b", text: "TB0002" },
            { css: ".warningDescription b", text: "TB0003" },
          ],
        },
        pad: 2,
        padX: 11,
      },
    ],
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
// to the state the toolbar shows, and `after(c)`, when given, takes it out of that state.
const searchToolbarShot = (name, setup, before, after = null) => ({
  out: `IDE/Images/${name}.png`,
  setup,
  async take({ c }) {
    await resetUi(c);
    try {
      await before(c);
      const theme = await rectOf(c, "#menuBarColorMode");
      const b = await rectOf(c, `#${GS_BUTTON}`);
      if (!theme || !b) throw new Error("the toolbar has no theme button or no Global Search button");
      const width = Math.ceil(TOOLBAR_WIDTH + b.x + b.width - (theme.x + theme.width));
      return await atSize(c, width, IDE_SIZE.height, async () =>
        capture(c, name, snapOut(await toolbarRect(c), width, IDE_SIZE.height), {
          away: () => parkMouse(c),
        }),
      );
    } finally {
      if (after) await after(c);
    }
  },
});

// Whether the IDE is running the project (Start pressed, not yet ended).
const codeExecuting = (c) => c.evaluate("!!context.codeExecuting?.value");

// The project run, as Start does, once the IDE says it is running; and ended, as Stop does.
async function startRun(c) {
  await command(c, "tbDebug_StartOrContinue");
  if (!(await waitFor(c, () => codeExecuting(c), { timeout: 60000, interval: 100 }))) {
    throw new Error("the IDE never started running the project");
  }
  await frames(c);
}
async function stopRun(c) {
  if (!(await codeExecuting(c))) return;
  await command(c, "tbDebug_Stop");
  if (!(await waitFor(c, async () => !(await codeExecuting(c)), { timeout: 30000, interval: 100 }))) {
    throw new Error("the IDE did not stop running the project");
  }
  await frames(c);
}

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
  // the other theme's pictures were taken after it was added: it is opened
  const REPORT = SAMPLE_FILE("Sources/MyReport.tbreport");
  if (await c.evaluate(`!!fs.tree.resolvePath(${JSON.stringify(`twinbasic:${REPORT}`)})`)) {
    await openFile(c, REPORT);
  } else {
    await newReport(c);
  }
  const opened = await waitFor(c, async () => (await editorTabs(c)).some((t) => t.name === "MyReport.tbreport"), {
    timeout: 10000,
    interval: 100,
  });
  if (!opened) throw new Error("the new report did not open in the designer");
  await designerShown(c);
  ctx.report = true;
}

// Sources > Add > Add Windows Report in the Project Explorer, and its name taken as offered.
async function newReport(c) {
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
  // with three controls selected, so that Make Equal is live (setup forms-chapter, frmMain:
  // Command1, Check1 and Command2(0), at Left 10, 140 and 250 as in Arranging.md's example)
  menuShot("Menu_Format_HorizontalSpacing", "Format", "Horizontal Spacing", {
    setup: "forms-chapter",
    before: async (c) => {
      await formsDesigner(c);
      await selectNamed(c, ["Command1", "Check1", "Command2(0)"]);
      await parkMouse(c);
    },
    after: formsReset,
  }),
  formatShot("Menu_Format_VerticalSpacing", "Vertical Spacing"),
  // the toolbar with a form open in the designer
  searchToolbarShot("Toolbar_3", "designer", (c) => openDesigner(c, "MyForm.tbform")),
  // the same while the project runs: its Sub Main shows frmMain, which stays open until Stop
  searchToolbarShot(
    "Toolbar_4",
    "designer",
    async (c) => {
      await openDesigner(c, "MyForm.tbform");
      await startRun(c);
      await clearUserFromConsole(c);
    },
    stopRun,
  ),
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
// group must then reach the top; `upTo: { text }` names the row by its text instead (a row
// with no title: an event, an array's + (add)).
async function scrollProperties(c, category, { upTo = null } = {}) {
  const done = await c.evaluate(`(() => {
  const p = document.querySelector(${JSON.stringify(PROPS)});
  const list = p?.querySelector(".propertiesBoxInner");
  const name = p?.querySelector(".controlSelecter");
  const cat = p && [...p.querySelectorAll(".propertyCategory")].find((e) => e.textContent.trim() === ${JSON.stringify(category)});
  const last = ${
    upTo === null
      ? "null"
      : typeof upTo === "string"
        ? `p?.querySelector(${JSON.stringify(PROP_NAME(upTo))})`
        : `p && [...p.querySelectorAll(".propertyName")].find((e) => e.getBoundingClientRect().height && e.textContent.trim() === ${JSON.stringify(upTo.text)})`
  };
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
  // and the panel corrected by what the list still shows past the row, or lacks of it (the
  // tabs a custom control's panel has above the name are in the list's box)
  for (let i = 0; last && i < 3; i++) {
    const over = top(list) + list.clientHeight - bottom(last);
    if (Math.abs(over) < 0.5) break;
    p.style.height = p.getBoundingClientRect().height - over + "px";
    for (let j = 0; j < 2; j++) list.scrollTop += top(cat) - bottom(name);
  }
  return Math.abs(top(cat) - bottom(name)) < 1 ? "done" : "short";
})()`);
  if (done === "none") {
    throw new Error(`the PROPERTIES panel has no group ${category}${upTo ? ` or row ${upTo.text ?? upTo}` : ""}`);
  }
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
    // Text1's Dock select with its list drawn open, from the panel's title bar to the list's
    // foot: the LAYOUT group at the top, Anchors closed
    out: "Features/Images/4c8b881e-1216-4819-a558-d2ce20f47fcd.png",
    setup: "forms",
    async take({ c }) {
      await resetUi(c);
      await openDesigner(c, "frmAnchors.tbform");
      await selectControl(c, "Text1");
      try {
        // short enough that the list can scroll LAYOUT to its top
        await floatPanel(c, "PROPERTIES", { width: 360, height: 320 });
        await scrollProperties(c, "LAYOUT");
        await expandProperty(c, "Anchors", false);
        await scrollProperties(c, "LAYOUT");
        const panel = await rectOf(c, PROPS);
        const dock = await rectOf(c, PROP_VALUE("Dock"));
        if (!dock) throw new Error("the PROPERTIES panel has no Dock row");
        return await listClip(
          c,
          "4c8b881e",
          { ...panel, height: dock.y + dock.height - panel.y },
          [{ type: "list", select: { css: PROP_VALUE("Dock") } }],
          { margin: 0, below: 8 },
        );
      } finally {
        await unfloatPanel(c, "PROPERTIES");
      }
    },
  },
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
        const clip = snapOut({ x: 0, y: 0, width: EXPLORER_CROP_WIDTH, height: history.y + history.height });
        // the striped ground under the form, at the foot of the crop, differs by a grey level
        // in a pixel or two from one capture to the next
        return await capture(c, "8611d12a", clip, {
          away: () => parkMouse(c),
          unsteady: await groundUnsteady(c, clip),
        });
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
    // description at the foot of the panel: the panel shows none, and the
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

// ---- the "Designing forms and reports" chapter (setup forms-chapter): FormsDemo,
// test/shots/forms. frmMain has a File menu (Open, a separator, Exit) and the controls the
// chapter's pages name: Text1, Label1, Command1, Check1, Frame1 holding Text2, and the control
// array Command2(0) and Command2(1); MyReport has a Label in its Report Header and a Line and a
// Label in its Report Detail. The project refers to WinNativeCommonCtls, so a form's Toolbox
// has a COMMON CONTROLS group. Every picture starts from no tab, no menu and the default layout
// (formsReset), and closes the designer's tab with Discard Changes after it, so that a change
// a picture makes (a lock, a menu, the outlines, the zoom) is never in the next one: the
// designer reads the form from its file again when it opens.

const FORMS_IMAGE = (name) => `IDE/Forms/Images/${name}.png`;
const REPORTS_IMAGE = (name) => `IDE/Reports/Images/${name}.png`;
const FORMS_FILE = (name) => `/FormsDemo/Sources/${name}`;

async function formsReset(c) {
  await resetUi(c);
  await closeTabs(c, [], { discard: true });
  await defaultLayout(c);
  await parkMouse(c);
}

// `file` of FormsDemo open in its designer, alone, from its file.
async function formsDesigner(c, file = "frmMain.tbform") {
  await formsReset(c);
  await openFile(c, FORMS_FILE(file));
  await designerShown(c);
}

// The controls named selected as a person selects them: a click on the first, a Shift+click
// on each other one. A name with an index, `Command2(1)`, is that member of the array.
async function selectNamed(c, names) {
  const centre = (n) =>
    c.evaluate(`(() => {
  const [, name, index] = /^(\\w+)(?:\\((\\d+)\\))?$/.exec(${JSON.stringify(n)});
  const k = ${DESIGNER_GLOBALS}.allControls.find((x) => x.properties.Name === name && (index === undefined || x.properties.Index === Number(index)));
  if (!k) return null;
  const r = k.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
  for (const [i, n] of names.entries()) {
    const at = await centre(n);
    if (!at) throw new Error(`the designer does not draw ${n}`);
    const modifiers = i ? 8 : 0;
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x, y: at.y, modifiers });
    for (const type of ["mousePressed", "mouseReleased"]) {
      await c.send("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", clickCount: 1, modifiers });
    }
  }
  const want = names
    .map((n) => n.replace(/\(\d+\)$/, ""))
    .sort()
    .join();
  if (!(await waitFor(c, async () => (await selectedControls(c)).join() === want, { timeout: 3000, interval: 50 }))) {
    throw new Error(`the clicks selected ${JSON.stringify(await selectedControls(c))}, not ${want}`);
  }
  await frames(c);
}

// The box of the open designer's form with its menu bar and the readouts under it.
const formArea = (c) =>
  c.evaluate(`(() => {
  const g = ${DESIGNER_GLOBALS};
  const boxes = [g.designer, g.designerMenuBar, g.designerDragInfoLeft, g.designerDragInfoRight]
    .filter((e) => e && e.getBoundingClientRect().width)
    .map((e) => e.getBoundingClientRect());
  const x = Math.min(...boxes.map((r) => r.left));
  const y = Math.min(...boxes.map((r) => r.top));
  return { x, y, width: Math.max(...boxes.map((r) => r.right)) - x, height: Math.max(...boxes.map((r) => r.bottom)) - y };
})()`);

// The boxes of the selected control's middle grabber on its right edge and of its in-place
// toolbar (the toolbar's element has no size of its own: its buttons' boxes, joined).
const selectionParts = (c) =>
  c.evaluate(`(() => {
  const box = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
  const pts = [...document.querySelectorAll(".selectedControlDragPointsContainer > *")]
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width);
  const right = Math.max(...pts.map((r) => r.x));
  const column = pts.filter((r) => Math.abs(r.x - right) < 1).sort((a, b) => a.y - b.y);
  const parts = [...document.querySelectorAll(".miniToolbarVisible *")]
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width && r.height);
  const x = Math.min(...parts.map((r) => r.left));
  const y = Math.min(...parts.map((r) => r.top));
  return {
    grab: column.length ? box(column[Math.floor(column.length / 2)]) : null,
    mini: parts.length ? { x, y, width: Math.max(...parts.map((r) => r.right)) - x, height: Math.max(...parts.map((r) => r.bottom)) - y } : null,
  };
})()`);

// The striped ground round a designer's form is drawn a little differently from one capture to
// the next (a few dozen pixels along the stripes, by more than a capture's noise), so that no two
// captures of a picture with much of it agree. These are capture's `unsteady` regions for the
// ground a clip shows: the clip less the form's own boxes (the form, its menu bar, the readouts)
// and the boxes `over` names (a menu, a list), so that nothing but the ground is left out.
async function groundUnsteady(c, clip, over = []) {
  const { parts, ground, tabs } = await c.evaluate(`(() => {
  const g = ${DESIGNER_GLOBALS};
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  return {
    parts: [g.designer, g.designerMenuBar, g.designerDragInfoLeft, g.designerDragInfoRight]
      .filter((e) => e && e.getBoundingClientRect().width)
      .map((e) => ({ ...box(e), pill: e !== g.designer && e !== g.designerMenuBar })),
    ground: (() => {
      const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "EDITOR 1");
      const p = h.closest(".toolWindowContainer").getBoundingClientRect();
      const tabs = document.getElementById("codePanelTabs").getBoundingClientRect();
      return { x: p.x, y: tabs.top, width: p.width, height: p.bottom - tabs.top };
    })(),
    // the tabs and the Tabs List button, in the row the ground is drawn behind
    tabs: [...document.querySelectorAll("#codePanelTabs > *, #codePanelTabs ~ *")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        const t = document.getElementById("codePanelTabs").getBoundingClientRect();
        return r.width && r.top < t.bottom && r.bottom <= t.bottom + 4;
      })
      .map(box),
  };
})()`);
  // the ground is the editor's area under its tabs
  const x0 = Math.max(clip.x, ground.x);
  const y0 = Math.max(clip.y, ground.y);
  const x1 = Math.min(clip.x + clip.width, ground.x + ground.width);
  const y1 = Math.min(clip.y + clip.height, ground.y + ground.height);
  if (x0 >= x1 || y0 >= y1) return [];
  let left = [{ x: x0, y: y0, width: x1 - x0, height: y1 - y0 }];
  // The form's own boxes are compared only 2 pixels in from their edges, where the ground
  // shows through their anti-aliased edges and shadows, and a readout, a pill, only between
  // its rounded ends; a menu or a label over the ground is compared to 2 pixels beyond it.
  const inner = (s) => {
    const r = grow(s, -2);
    return s.pill ? { ...r, x: s.x + s.height / 2, width: s.width - s.height } : r;
  };
  const cuts = [...parts.map(inner), ...[...tabs, ...over.filter(Boolean)].map((s) => grow(s, 2))];
  for (const cut of cuts.filter((r) => r.width > 0 && r.height > 0)) {
    left = left.flatMap((r) => {
      const ix0 = Math.max(r.x, cut.x);
      const iy0 = Math.max(r.y, cut.y);
      const ix1 = Math.min(r.x + r.width, cut.x + cut.width);
      const iy1 = Math.min(r.y + r.height, cut.y + cut.height);
      if (ix0 >= ix1 || iy0 >= iy1) return [r];
      return [
        { x: r.x, y: r.y, width: r.width, height: iy0 - r.y },
        { x: r.x, y: iy1, width: r.width, height: r.y + r.height - iy1 },
        { x: r.x, y: iy0, width: ix0 - r.x, height: iy1 - iy0 },
        { x: ix1, y: iy0, width: r.x + r.width - ix1, height: iy1 - iy0 },
      ].filter((p) => p.width > 0 && p.height > 0);
    });
  }
  return left.map((rect) => ({ on: { rect }, pad: 0 }));
}

// The boxes of what the annotation layer draws, each label, arrow and ring on its own: the
// pictures whose labels lie on a designer's ground leave only the ground round them unsteady.
const layerBoxes = (c) =>
  c.evaluate(`(() => {
  const l = document.getElementById(${JSON.stringify(LAYER_ID)});
  if (!l) return [];
  let kids = [...l.children].filter((e) => e.tagName !== "defs");
  while (kids.length === 1 && kids[0].children.length) kids = [...kids[0].children];
  return kids
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width || r.height)
    .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
})()`);

// A point of the open designer's form, in form pixels.
const formPoint = (c, x, y) =>
  c.evaluate(`(() => {
  const r = ${DESIGNER_GLOBALS}.designer.getBoundingClientRect();
  return { x: r.x + ${x}, y: r.y + ${y} };
})()`);

const formsChapterShots = [
  {
    // frmMain with Label1 selected: its grabbers and the in-place toolbar under it, and the
    // readouts under the form, the pointer's position read with the mouse resting on an empty
    // part of the form (no pointer is drawn). Labels on the editor's ground right of the form.
    out: FORMS_IMAGE("Designer_Selected"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        await selectNamed(c, ["Label1"]);
        const rest = await formPoint(c, 300, 245);
        await mouseMove(c, rest.x - 4, rest.y);
        await mouseMove(c, rest.x, rest.y);
        const shown = await waitFor(
          c,
          () => c.evaluate(`/^x:\\d+ y:\\d+$/.test(${DESIGNER_GLOBALS}.designerDragInfoLeft.innerText)`),
          { timeout: 3000, interval: 50 },
        );
        if (!shown) throw new Error("the readouts do not show the pointer's position");
        await frames(c);
        const area = await formArea(c);
        const { grab, mini } = await selectionParts(c);
        const x = area.x + area.width + 36;
        const mid = (r) => r.y + r.height / 2;
        const READOUTS = { span: [{ css: ".designerDragInfoLeft" }, { css: ".designerDragInfoRight" }] };
        const under = { of: READOUTS, at: "bottom", dy: 34 };
        const annotate = [
          { type: "label", text: "Grabbers", on: POINT(x, mid(grab)), side: "right", gap: 0 },
          { type: "arrow", from: POINT(x - 4, mid(grab)), to: { rect: grab } },
          { type: "label", text: "In-place toolbar", on: POINT(x, mid(mini)), side: "right", gap: 0 },
          { type: "arrow", from: POINT(x - 4, mid(mini)), to: { rect: mini } },
          { type: "label", text: "Readouts", on: under, side: "below", gap: 0 },
          { type: "arrow", from: under, to: [{ css: ".designerDragInfoLeft" }, { css: ".designerDragInfoRight" }] },
        ];
        try {
          const { box } = await annotateOver(c, annotate);
          const clip = snapOut(union({ x: area.x, y: area.y, width: area.width + 6, height: area.height + 8 }, box));
          return await capture(c, "Designer_Selected", clip, {
            unsteady: await groundUnsteady(c, clip, await layerBoxes(c)),
          });
        } finally {
          await unannotate(c);
        }
      } finally {
        await formsReset(c);
      }
    },
  },
  formStateShot("Designer_TabIndex", async (c) => {
    // the designer focused with a click on an empty part of the form, the pointer left there
    // (moved away, the pointer readout shows or not by the moment it left), then Ctrl held
    const at = await formPoint(c, 300, 245);
    await pressAt(c, at.x, at.y);
    await mouseMove(c, at.x, at.y);
    const readout = () =>
      c.evaluate(`(() => {
  const e = ${DESIGNER_GLOBALS}.designerDragInfoLeft;
  return !!e && e.getBoundingClientRect().width > 0 && e.innerText.includes("x:300 y:245");
})()`);
    if (!(await waitFor(c, readout, { timeout: 3000, interval: 50 }))) {
      throw new Error("the pointer readout does not show x:300 y:245");
    }
    await c.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "Control",
      code: "ControlLeft",
      windowsVirtualKeyCode: 17,
      nativeVirtualKeyCode: 17,
      modifiers: 2,
    });
    const shown = () => c.evaluate(`${DESIGNER_GLOBALS}.designer.classList.contains("designerShowTabIndex")`);
    if (!(await waitFor(c, shown, { timeout: 3000, interval: 50 }))) {
      throw new Error("holding Ctrl showed no TabIndex circles");
    }
  }),
  formStateShot("Controls_MultiSelect", (c) => selectNamed(c, ["Command1", "Text1", "Check1"])),
  formStateShot(
    "Controls_RubberBand",
    async (c) => {
      // pressed on the form's empty top right, dragged down and left over Label1 and Text1
      const from = await formPoint(c, 300, 4);
      const to = await formPoint(c, 60, 46);
      await mouseMove(c, from.x, from.y);
      await c.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: from.x,
        y: from.y,
        button: "left",
        clickCount: 1,
        buttons: 1,
      });
      for (let i = 1; i <= 10; i++) {
        await sleep(30);
        const x = from.x + ((to.x - from.x) * i) / 10;
        const y = from.y + ((to.y - from.y) * i) / 10;
        await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left", buttons: 1 });
      }
      await frames(c);
    },
    {
      after: async (c) => {
        const to = await formPoint(c, 60, 46);
        await c.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: to.x,
          y: to.y,
          button: "left",
          clickCount: 1,
        });
      },
    },
  ),
  formStateShot("Controls_Container", async (c) => {
    // the OptionButton tool picked in the Toolbox, the pointer resting inside Frame1
    const tool = await rectOf(c, `${TOOLBOX_TILE("OptionButton")}`);
    if (!tool) throw new Error("the Toolbox has no OptionButton");
    await pressAt(c, tool.x + tool.width / 2, tool.y + tool.height / 2);
    const at = await formPoint(c, 120, 220);
    await mouseMove(c, at.x - 6, at.y);
    await mouseMove(c, at.x, at.y);
    const red = await waitFor(
      c,
      () =>
        c.evaluate(
          `(() => { const f = ${DESIGNER_GLOBALS}.currentFlashingContainer; return f?.properties?.Name === "Frame1" && f.classList.contains("boxShadowRed"); })()`,
        ),
      { timeout: 3000, interval: 50 },
    );
    if (!red) throw new Error("Frame1 was not outlined in red under the OptionButton tool");
    // The outline blinks (the IDE's borderBlink animation, red at its middle), and the quiet
    // style sheet stops every animation at its start, where the outline is transparent: this
    // one is held at its middle instead, as the IDE draws it half the time.
    await c.evaluate(`(() => {
  const s = document.createElement("style");
  s.id = "tbShotBlink";
  s.textContent = ".designer .boxShadowRed { animation: borderBlink 0.5s linear -0.25s 1 normal both paused !important }";
  document.head.appendChild(s);
})()`);
  }),
  formStateShot("Designer_Locked", async (c) => {
    // the outlines on from the grid button's panel, then Command1 locked from the Format menu
    await gridOptions(c);
    const box = await rectOf(c, ".optionShowOutlines");
    if (!box) throw new Error("the grid options have no Show Outlines");
    await pressAt(c, box.x + box.width / 2, box.y + box.height / 2);
    if (
      !(await waitFor(
        c,
        () => c.evaluate(`${DESIGNER_GLOBALS}.state.item.form[0].__IDEOptions.showOutlines === true`),
        { timeout: 3000, interval: 50 },
      ))
    ) {
      throw new Error("Show Outlines did not turn the outlines on");
    }
    await parkMouse(c);
    await waitFor(c, () => c.evaluate(`menuBarGridOptions.style.visibility !== "visible"`), {
      timeout: 3000,
      interval: 50,
    });
    await designerShown(c);
    await selectNamed(c, ["Command1"]);
    await openMenu(c, "Format", { close: false });
    const lock = (await menuItems(c)).find((i) => i.text.startsWith("Lock Controls"));
    if (!lock) throw new Error("the Format menu has no Lock Controls");
    await clickAt(c, lock.x + lock.width / 2, lock.y + lock.height / 2);
    if (!(await waitFor(c, () => rectOf(c, ".hasLockedIcon"), { timeout: 3000, interval: 50 }))) {
      throw new Error("Lock Controls drew no lock");
    }
    await parkMouse(c);
  }),
  {
    // the grid button's panel, opened by the pointer resting on the button, over the editor
    out: FORMS_IMAGE("Designer_GridOptions"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        await gridOptions(c);
        const panel = await rectOf(c, ".menuBarGridOptions");
        const button = await rectOf(c, "#menuBarGrid, .menuBarGrid");
        const area = grow(union(panel, button), 12);
        const clip = snapOut({ ...area, y: button.y - 4, height: area.y + area.height - button.y + 4 });
        return await capture(c, "Designer_GridOptions", clip, {
          unsteady: await groundUnsteady(c, clip, [panel]),
        });
      } finally {
        await formsReset(c);
      }
    },
  },
  {
    // 50 % picked in the zoom box, as a person picks it from the box's list, and the list drawn
    // open over the toolbar, with the form at half size below
    out: FORMS_IMAGE("Designer_Zoom"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        const full = (await formArea(c)).width;
        await c.evaluate(`(() => {
  zoomSelect.selectedIndex = [...zoomSelect.options].findIndex((o) => o.text === "50%");
  zoomSelect.dispatchEvent(new Event("change", { bubbles: true }));
})()`);
        const half = await waitFor(
          c,
          async () => {
            const w = (await formArea(c)).width;
            return w < full * 0.6 ? w : null;
          },
          { timeout: 5000, interval: 50 },
        );
        if (!half) throw new Error("50 % in the zoom box did not shrink the form");
        await designerShown(c);
        const zoom = await rectOf(c, "#zoomSelect");
        try {
          const { box } = await annotateOver(c, [{ type: "list", select: { css: "#zoomSelect" }, rows: 4 }]);
          // the box and its list, with the toolbar's buttons left of it: the form drawn at half
          // size is not in the picture, since its scaled dots come out differently in every
          // capture
          const area = grow(union(zoom, box), 8);
          const clip = snapOut({ ...area, x: area.x - 160, width: area.width + 160 });
          // four rows (the list scrolls): the Light theme's list is drawn in a smaller font, and
          // a list of every option makes its picture 100 px shorter than the dark one
          return await capture(c, "Designer_Zoom", clip, {
            away: () => parkMouse(c),
            unsteady: await groundUnsteady(c, clip, await layerBoxes(c)),
          });
        } finally {
          await unannotate(c);
        }
      } finally {
        await formsReset(c);
      }
    },
  },
  {
    // a right click on Command1, with Command2(0) selected too, and the Align submenu open
    out: FORMS_IMAGE("Controls_ContextMenu"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        // the panels under the editor out of the layout, so that the menu is over the editor alone
        for (const id of ["DEBUG CONSOLE", "PROBLEMS", "CALL STACK", "VARIABLES"]) await undock(c, id);
        await designerShown(c);
        await selectNamed(c, ["Command1", "Command2(0)"]);
        const at = await formPoint(c, 60, 85);
        await mouseMove(c, at.x, at.y);
        await c.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: at.x,
          y: at.y,
          button: "right",
          buttons: 2,
          clickCount: 1,
        });
        await c.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: at.x,
          y: at.y,
          button: "right",
          buttons: 0,
          clickCount: 1,
        });
        if (!(await menuOpened(c))) throw new Error("the right click on Command1 opened no menu");
        const sub = await hoverItem(c, "Align");
        const menu = await rectOf(c, "#contextMenu");
        const clip = snapOut(grow(union(union(await formArea(c), menu), sub), 6));
        return await capture(c, "Controls_ContextMenu", clip, { unsteady: await groundUnsteady(c, clip, [menu, sub]) });
      } finally {
        await closeMenus(c);
        await formsReset(c);
      }
    },
  },
  {
    // + menu clicked in the Form Menu bar, beside the File menu, and &Edit typed into the box
    out: FORMS_IMAGE("MenuEditor_Bar"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        const add = await rectOf(c, ".designerMenuItemAdd");
        if (!add) throw new Error("the Form Menu bar has no + menu");
        await pressAt(c, add.x + add.width / 2, add.y + add.height / 2);
        const box = await waitFor(
          c,
          () => c.evaluate(`document.activeElement?.tagName === "INPUT" ? document.activeElement.value : null`),
          {
            timeout: 3000,
            interval: 50,
          },
        );
        if (box !== "Menu1") throw new Error(`+ menu opened a box holding ${JSON.stringify(box)}`);
        await typeText(c, "&Edit");
        await parkMouse(c);
        await frames(c);
        const bar = await c.evaluate(
          `(() => { const r = ${DESIGNER_GLOBALS}.designerMenuBar.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
        );
        return await capture(c, "MenuEditor_Bar", snapOut({ ...bar, height: bar.height + 48 }), {});
      } finally {
        await pressKey(c, "Escape");
        await formsReset(c);
      }
    },
  },
  {
    // the File menu clicked in the Form Menu bar, its items listed under it, and the right-click
    // menu of Open beside them
    out: FORMS_IMAGE("MenuEditor_Open"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        const item = (sel, text) =>
          c.evaluate(`(() => {
  const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.getBoundingClientRect().width && e.textContent.trim() === ${JSON.stringify(text)});
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
        const file = await item(".designerMenuItem", "File");
        if (!file) throw new Error("the Form Menu bar has no File");
        await pressAt(c, file.x + file.width / 2, file.y + file.height / 2);
        const open = await waitFor(c, () => item(".designerPopUpMenuItem", "Open"), { timeout: 3000, interval: 50 });
        if (!open) throw new Error("File opened no list with Open");
        // at the item's right end, so that the menu opens beside the list rather than over it
        const at = { x: open.x + open.width - 4, y: open.y + open.height / 2 };
        await mouseMove(c, at.x, at.y);
        await c.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: at.x,
          y: at.y,
          button: "right",
          buttons: 2,
          clickCount: 1,
        });
        await c.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: at.x,
          y: at.y,
          button: "right",
          buttons: 0,
          clickCount: 1,
        });
        if (!(await menuOpened(c))) throw new Error("the right click on Open opened no menu");
        await parkMouse(c);
        await frames(c);
        const pop = await rectOf(c, ".designerPopUpMenuBar");
        const bar = await c.evaluate(
          `(() => { const r = ${DESIGNER_GLOBALS}.designerMenuBar.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
        );
        const menu = await rectOf(c, "#contextMenu");
        const clip = snapOut(grow(union(union(bar, pop), menu), 6));
        return await capture(c, "MenuEditor_Open", clip, { unsteady: await groundUnsteady(c, clip, [pop, menu]) });
      } finally {
        await closeMenus(c);
        await formsReset(c);
      }
    },
  },
  {
    // Add > Add Windows Form on Sources in the Project Explorer: the name box in the tree,
    // holding MyForm.tbform with MyForm selected; Escape then creates nothing
    out: FORMS_IMAGE("Designer_AddName"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsReset(c);
      try {
        await peOpen(c, "Sources", true);
        await peRightClick(c, "Sources");
        await hoverItem(c, "Add");
        const it = (await menuItems(c, true)).find((i) => i.text.startsWith("Add Windows Form"));
        if (!it) throw new Error("the Add submenu has no Add Windows Form");
        await mouseMove(c, it.x + 20, it.y + it.height / 2);
        await frames(c);
        await clickAt(c, it.x + 20, it.y + it.height / 2);
        const offered = await waitFor(
          c,
          () => c.evaluate(`document.activeElement?.tagName === "INPUT" ? document.activeElement.value : null`),
          { timeout: 5000, interval: 50 },
        );
        if (offered !== "MyForm.tbform")
          throw new Error(`Add Windows Form offered the name ${JSON.stringify(offered)}`);
        await parkMouse(c);
        await frames(c);
        const panel = await dockedRect(c, "PROJECT EXPLORER");
        // down to the last row of the tree, Startup.twin
        const last = await c.evaluate(
          `Math.max(...[...document.querySelectorAll("*")].filter((e) => e.childElementCount === 0 && e.textContent.trim() === "Startup.twin" && e.getBoundingClientRect().width).map((e) => e.getBoundingClientRect().bottom))`,
        );
        if (!(last > panel.y)) throw new Error("the Project Explorer shows no Startup.twin");
        return await capture(c, "Designer_AddName", snapOut({ ...panel, height: last + 6 - panel.y }), {});
      } finally {
        await pressKey(c, "Escape");
        await formsReset(c);
        if (await c.evaluate(`!!fs.tree.resolvePath(${JSON.stringify(`twinbasic:${FORMS_FILE("MyForm.tbform")}`)})`)) {
          complain(c.shot.name, "Escape in the name box created MyForm.tbform");
        }
      }
    },
  },
  {
    // MyReport with the Report Detail bar clicked: the bands, the controls in two of them, and
    // the page's three bars
    out: REPORTS_IMAGE("Report_Controls"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c, "MyReport.tbreport");
      try {
        // the panels beside the editor out of the layout, so that the editor is wide enough for
        // the report and the bar right of it
        for (const id of DOCKED_BESIDE_EDITOR) await undock(c, id);
        await designerShown(c);
        const bar = await c.evaluate(`(() => {
  const b = [...document.querySelectorAll(".sectionBarDetail")].find((e) => e.getBoundingClientRect().width);
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + 60, y: r.y + r.height / 2 };
})()`);
        if (!bar) throw new Error("the report shows no Report Detail bar");
        await pressAt(c, bar.x, bar.y);
        const picked = await waitFor(
          c,
          () =>
            c.evaluate(
              `(() => { const s = ${DESIGNER_GLOBALS}.controlSelecter; return s.options[s.selectedIndex]?.text.startsWith("Report Detail"); })()`,
            ),
          { timeout: 3000, interval: 50 },
        );
        if (!picked) throw new Error("the click on the Report Detail bar did not select the section");
        // The three bars are drawn only under the pointer (opacity 0, 1 on hover): the pointer
        // rests on PAGE WIDTH, at the report's right edge, half way down
        const width = await c.evaluate(
          `(() => { const r = ${DESIGNER_GLOBALS}.reportWidthResizerBar.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, height: r.height }; })()`,
        );
        if (!width.height) throw new Error("the report has no PAGE WIDTH bar");
        await mouseMove(c, width.x - 20, width.y);
        await mouseMove(c, width.x, width.y);
        const shown = await waitFor(
          c,
          () => c.evaluate(`getComputedStyle(${DESIGNER_GLOBALS}.reportWidthResizerBar).opacity === "1"`),
          { timeout: 3000, interval: 50 },
        );
        if (!shown) throw new Error("the PAGE WIDTH bar did not show under the pointer");
        await frames(c);
        const panel = await editorPanelRect(c);
        const bottom = await c.evaluate(
          `Math.max(...[...document.querySelectorAll(".designerContainerSectionResizer")].filter((e) => e.getBoundingClientRect().width).map((e) => e.getBoundingClientRect().bottom))`,
        );
        const label = await c.evaluate(
          `(() => { const r = ${DESIGNER_GLOBALS}.reportWidthResizerBar.querySelector(".resizerBarLabel").getBoundingClientRect(); return r.right; })()`,
        );
        const clip = snapOut({ ...panel, width: label + 24 - panel.x, height: bottom + 12 - panel.y });
        return await capture(c, "Report_Controls", clip, { unsteady: await groundUnsteady(c, clip) });
      } finally {
        await formsReset(c);
      }
    },
  },
  {
    // the docked Toolbox of frmMain with Show Control Names chosen from its ... menu, in a page
    // tall enough for every tool: the standard group and the COMMON CONTROLS group
    out: FORMS_IMAGE("Toolbox_Form"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        await toolboxNames(c, true);
        // docked at the left the full height of the window, wide enough for the names, and
        // scrolled to its end with the mouse wheel: the end of the first group, the COMMON
        // CONTROLS group and More components (a capture holds no more than the window's
        // own height, so a taller page does not show the whole list)
        await useLayout(c, TOOLBOX_LAYOUT);
        await designerShown(c);
        const lastTile = () =>
          c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "TOOLBOX");
  const p = h.closest(".toolWindowContainer");
  const t = [...p.querySelectorAll(".toolboxItemOuter")].filter((e) => e.getBoundingClientRect().width);
  return { last: t[t.length - 1].getBoundingClientRect().bottom, bottom: p.getBoundingClientRect().bottom };
})()`);
        const panel = await dockedRect(c, "TOOLBOX");
        const at = { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 };
        await mouseMove(c, at.x, at.y);
        for (let i = 0; i < 10 && (await lastTile()).last > (await lastTile()).bottom; i++) {
          await c.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: at.x, y: at.y, deltaX: 0, deltaY: 400 });
          await frames(c);
        }
        const end = await lastTile();
        if (end.last > end.bottom) throw new Error("the wheel did not scroll the Toolbox to its end");
        await c.evaluate("document.activeElement?.blur?.()");
        await parkMouse(c);
        return await capture(c, "Toolbox_Form", snapOut(await dockedRect(c, "TOOLBOX")), { away: () => parkMouse(c) });
      } finally {
        await toolboxNames(c, false);
        await formsReset(c);
      }
    },
  },
  {
    // the Toolbox's search box opened with its magnifier and "Command, Text" typed into it, and
    // the ... menu open on Show Control Names
    out: FORMS_IMAGE("Toolbox_Search"),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        // the Toolbox docked wide enough for the search box
        await useLayout(c, TOOLBOX_LAYOUT);
        await designerShown(c);
        const icon = await dockedRect(c, "TOOLBOX", ".searchObjectsIcon");
        if (!icon) throw new Error("the Toolbox's title bar has no magnifier");
        await pressAt(c, icon.x + icon.width / 2, icon.y + icon.height / 2);
        const focused = await waitFor(
          c,
          () => c.evaluate("document.activeElement === toolboxDockablePanel.searchBarEntry"),
          {
            timeout: 3000,
            interval: 50,
          },
        );
        if (!focused) throw new Error("the magnifier opened no search box");
        await typeText(c, "Command, Text");
        const shown = () =>
          c.evaluate(
            `[...document.querySelectorAll(".toolboxItemOuter")].filter((e) => e.getBoundingClientRect().width).map((e) => e.title || e.innerText.trim()).join()`,
          );
        const narrowed = await waitFor(c, async () => /^Pointer,TextBox,CommandButton(,|$)/.test(await shown()), {
          timeout: 3000,
          interval: 50,
        });
        if (!narrowed) throw new Error(`the search left ${await shown()}`);
        await openToolboxMenu(c);
        const box = await toolboxBox(c);
        const menu = await rectOf(c, "#contextMenu");
        const clip = snapOut(grow(union(box, menu), 2));
        return await capture(c, "Toolbox_Search", clip, {
          away: () => parkMouse(c),
          unsteady: await groundUnsteady(c, clip, [box, menu]),
        });
      } finally {
        await closeMenus(c);
        // Escape in the box ends the search and shows every tool again
        if (await c.evaluate("!!toolboxDockablePanel.searchBarEntry?.getBoundingClientRect().width")) {
          await c.evaluate("toolboxDockablePanel.searchBarEntry.focus()");
          await pressKey(c, "Escape");
        }
        const all = await waitFor(c, () => rectOf(c, TOOLBOX_TILE("OptionButton")), { timeout: 3000, interval: 50 });
        if (!all) complain(c.shot.name, "the Toolbox's search did not end");
        await formsReset(c);
      }
    },
  },
  propertiesShot(
    "Properties_Control",
    async (c) => {
      // the panel's parts named from its left
      const parts = await c.evaluate(`(() => {
  const p = document.querySelector(${JSON.stringify(PROPS)});
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const own = (t) => [...p.querySelectorAll("*")].find((e) => e.childElementCount === 0 && e.textContent.trim() === t && e.getBoundingClientRect().width && !e.closest(".sectionHeader"));
  const sel = p.querySelector(".controlSelecter");
  const cat = [...p.querySelectorAll(".propertyCategory")].find((e) => e.getBoundingClientRect().height);
  const tab = own("PROPERTIES");
  return { sel: sel && box(sel), cat: cat && box(cat), tab: tab && box(tab), panel: box(p) };
})()`);
      if (!parts.sel || !parts.cat || !parts.tab)
        throw new Error(`the PROPERTIES panel lacks a part: ${JSON.stringify(parts)}`);
      const x = parts.panel.x - 64;
      const mid = (r) => r.y + r.height / 2;
      const row = (text, r) => [
        { type: "label", text, on: POINT(x, mid(r)), side: "left", gap: 0 },
        { type: "arrow", from: POINT(x + 4, mid(r)), to: { rect: { ...r, width: 24 } } },
      ];
      return [...row("Tabs", parts.tab), ...row("Object drop-down", parts.sel), ...row("Category", parts.cat)];
    },
    { left: 820 },
  ),
  propertiesShot(
    "Properties_ColourPicker",
    async (c) => {
      await scrollProperties(c, "APPEARANCE");
      const swatch = await rectOf(c, `${PROP_VALUE("BackColor")} .colorElement`);
      if (!swatch) throw new Error("the BackColor row has no swatch");
      await pressAt(c, swatch.x + swatch.width / 2, swatch.y + swatch.height / 2);
      if (!(await waitFor(c, () => rectOf(c, ".sp-container:not(.sp-hidden)"), { timeout: 3000, interval: 50 }))) {
        throw new Error("the swatch opened no colour picker");
      }
      await parkMouse(c);
      return null;
    },
    {
      extra: async (c) => [await rectOf(c, ".sp-container:not(.sp-hidden)")],
      cut: [".sp-container"],
      after: async (c) => {
        const cancel = await rectOf(c, ".sp-container:not(.sp-hidden) .sp-cancel");
        if (cancel) await pressAt(c, cancel.x + cancel.width / 2, cancel.y + cancel.height / 2);
      },
    },
  ),
  propertiesShot(
    "Properties_SystemColours",
    async (c) => {
      await scrollProperties(c, "APPEARANCE");
      const v = await rectOf(c, PROP_VALUE("BackColor"));
      if (!v) throw new Error("the PROPERTIES panel has no BackColor row");
      const at = { x: v.x + v.width - 30, y: v.y + v.height / 2 };
      await mouseMove(c, at.x, at.y);
      await c.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: at.x,
        y: at.y,
        button: "right",
        buttons: 2,
        clickCount: 1,
      });
      await c.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: at.x,
        y: at.y,
        button: "right",
        buttons: 0,
        clickCount: 1,
      });
      if (!(await menuOpened(c))) throw new Error("the right click on BackColor's value opened no menu");
      await hoverItem(c, "SYSTEM COLORS");
      return null;
    },
    {
      extra: async (c) => [await rectOf(c, "#contextMenu"), await rectOf(c, "#contextMenuSUB")],
      after: closeMenus,
      away: false,
      cut: ["#contextMenu", "#contextMenuSUB"],
    },
  ),
  {
    // Add Windows Form in a project without the VB package (the settings setup's sample has
    // none) asks for WinNativeForms first
    out: FORMS_IMAGE("Designer_PackageNeeded"),
    setup: "settings",
    async take({ c }) {
      await resetUi(c);
      await peRightClick(c, "Sources");
      await hoverItem(c, "Add");
      const it = (await menuItems(c, true)).find((i) => i.text.startsWith("Add Windows Form"));
      if (!it) throw new Error("the Add submenu has no Add Windows Form");
      await mouseMove(c, it.x + 20, it.y + it.height / 2);
      await frames(c);
      await clickAt(c, it.x + 20, it.y + it.height / 2);
      if (!(await waitModal(c, "twinBASIC", { timeout: 5000 }))) throw new Error("no Package needed message appeared");
      await dialogStill(c);
      try {
        return await dialogShot(c, "Designer_PackageNeeded");
      } finally {
        await closeModal(c, "Cancel").catch(() => pressKey(c, "Escape"));
      }
    },
  },
  {
    // frmMain previewed with the toolbar's PREVIEW: its window on the IDE's desktop, as it draws
    // itself, with the File menu of the menu editor in its menu bar; taken once, as a running
    // program's window is
    out: FORMS_IMAGE("Preview_Window"),
    setup: "forms-chapter",
    once: true,
    async take(ctx) {
      const { c } = ctx;
      await formsDesigner(c);
      try {
        const preview = await rectOf(c, "#menuBarPreview");
        if (!preview) throw new Error("the toolbar has no PREVIEW button");
        await pressAt(c, preview.x + preview.width / 2, preview.y + preview.height / 2);
        await parkMouse(c);
        const w = await formWindow(ctx.desktop, { title: "frmMain", timeout: 60000 });
        return besideEachOther([
          await windowPicture(ctx.desktop, w.hwnd, "preview", path.join(ctx.windows, "preview.png")),
        ]);
      } finally {
        await stopRun(c);
        await clearConsole(c);
        await formsReset(c);
      }
    },
  },
  propertiesShot("Properties_Events", async (c) => {
    const tab = await c.evaluate(
      `(() => { const r = ${DESIGNER_GLOBALS}.toolbarEvents.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
    );
    await pressAt(c, tab.x + tab.width / 2, tab.y + tab.height / 2);
    const shown = await waitFor(
      c,
      () =>
        c.evaluate(
          `[...document.querySelectorAll(${JSON.stringify(`${PROPS} .propertyName`)})].some((e) => e.getBoundingClientRect().height && e.textContent.trim() === "Click")`,
        ),
      { timeout: 3000, interval: 50 },
    );
    if (!shown) throw new Error("the EVENTS tab lists no Click");
    await parkMouse(c);
    return null;
  }),
];

// The Toolbox docked at the left of the editor, the window's full height (set in the page and
// saved nowhere; formsReset puts the default layout back).
const TOOLBOX_LAYOUT = {
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
        { id: "TOOLBOX", variableSize: false, size: "17%" },
        { id: "EDITOR", variableSize: true, size: "0%" },
      ],
    },
  ],
};

// The docked Toolbox, from its title bar to a little below its last tool.
const toolboxBox = (c) =>
  c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "TOOLBOX");
  const p = h.closest(".toolWindowContainer");
  const r = p.getBoundingClientRect();
  const last = Math.max(...[...p.querySelectorAll(".toolboxItemOuter")].filter((e) => e.getBoundingClientRect().width).map((e) => e.getBoundingClientRect().bottom));
  return { x: r.x, y: r.y, width: r.width, height: Math.min(r.bottom, last + 10) - r.y };
})()`);

// The docked Toolbox's ... menu, opened with a real click.
async function openToolboxMenu(c) {
  const dots = await dockedRect(c, "TOOLBOX", ".ellipsesIcon2");
  if (!dots) throw new Error("the Toolbox's title bar has no ... button");
  await pressAt(c, dots.x + dots.width / 2, dots.y + dots.height / 2);
  if (!(await menuOpened(c))) throw new Error("the Toolbox's ... button opened no menu");
}

// Show Control Names ticked (`on`) or not, chosen from the Toolbox's ... menu when it is not
// so already. The option it saves is saved nowhere (PAGE_DEFAULTS).
async function toolboxNames(c, on) {
  if ((await c.evaluate("!liveIDEOptions.showToolboxIconsOnly")) === on) return;
  await openToolboxMenu(c);
  const it = (await menuItems(c)).find((i) => i.text.startsWith("Show Control Names"));
  if (!it) throw new Error("the Toolbox's ... menu has no Show Control Names");
  await clickAt(c, it.x + it.width / 2, it.y + it.height / 2);
  if (
    !(await waitFor(c, async () => (await c.evaluate("!liveIDEOptions.showToolboxIconsOnly")) === on, {
      timeout: 3000,
      interval: 50,
    }))
  ) {
    throw new Error("Show Control Names did not change the Toolbox");
  }
  await closeMenus(c);
  await frames(c);
}

// frmMain open with Command1 selected and PROPERTIES floating on its own, brought to a state
// by `state(c)`, which returns the annotations (or null). `extra(c)` gives a box the picture
// holds as well as the panel (a colour picker, a menu); `after(c)` runs once it is taken.
function propertiesShot(
  name,
  state,
  { extra = null, after = null, away = true, left = 300, top = 120, height = 520, cut = null } = {},
) {
  return {
    out: FORMS_IMAGE(name),
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        await selectNamed(c, ["Command1"]);
        await parkMouse(c);
        await floatPanel(c, "PROPERTIES", { width: 360, height, left, top });
        const annotate = await state(c);
        let area = await rectOf(c, PROPS);
        const solids = [area];
        for (const box of extra ? await extra(c) : []) {
          area = union(area, box);
          solids.push(box);
        }
        try {
          if (annotate) {
            const { box } = await annotateOver(c, annotate);
            area = union(area, box);
            solids.push(...(await layerBoxes(c)));
          }
          const clip = snapOut(area);
          return await capture(c, name, clip, {
            away: away ? () => parkMouse(c) : null,
            // a picture of the panel and what opens beside it is a cut-out of them, as a menu's is
            ...(cut ? { keep: [PROPS, ...cut] } : { unsteady: await groundUnsteady(c, clip, solids) }),
          });
        } finally {
          if (annotate) await unannotate(c);
        }
      } finally {
        if (after) await after(c);
        await unfloatPanel(c, "PROPERTIES");
        await formsReset(c);
      }
    },
  };
}

// A Toolbox tile by its tool's name.
const TOOLBOX_TILE = (name) => `.toolboxItemOuter[title="${name}"]`;

// The grid options panel, opened as the pointer opens it: moved onto the grid button.
async function gridOptions(c) {
  const b = await rectOf(c, "#menuBarGrid, .menuBarGrid");
  if (!b) throw new Error("the toolbar has no grid button");
  await mouseMove(c, b.x - 30, b.y + b.height / 2);
  await mouseMove(c, b.x + b.width / 2, b.y + b.height / 2);
  if (
    !(await waitFor(c, () => c.evaluate(`menuBarGridOptions.style.visibility === "visible"`), {
      timeout: 3000,
      interval: 50,
    }))
  ) {
    throw new Error("the grid options did not open under the pointer");
  }
  await frames(c);
}

// frmMain's form, its menu bar and readouts, in the state `state(c)` brings it to; `after(c)`
// runs once the picture is taken, before the tab is closed.
function formStateShot(name, state, { after = null, out = FORMS_IMAGE(name) } = {}) {
  return {
    out,
    setup: "forms-chapter",
    async take({ c }) {
      await formsDesigner(c);
      try {
        await state(c);
        const area = await formArea(c);
        const clip = snapOut({ x: area.x, y: area.y, width: area.width + 6, height: area.height + 8 });
        return await capture(c, name, clip, { unsteady: await groundUnsteady(c, clip) });
      } finally {
        if (after) await after(c);
        await c.evaluate(`document.getElementById("tbShotBlink")?.remove()`);
        await c.send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "Control",
          code: "ControlLeft",
          windowsVirtualKeyCode: 17,
          nativeVirtualKeyCode: 17,
        });
        await formsReset(c);
      }
    },
  };
}

// ---- the CustomControls tutorial's property sheet: composites of the fixture's code and the
// PROPERTIES panel (setup customcontrols)

const CC_FILE = (file) => `/CustomControlsDemo/Sources/${file}`;
const CC_FORM = "frmCustom.tbform";
const CC_GRID = "MyGrid1";
const CC_BUTTON = "MyButton1";
// how far the arrow's start is above its end, so that it slopes down to the row
const CC_SLOPE = -48;

// frmCustom open in its designer.
async function ccDesigner(c) {
  await openFile(c, CC_FILE(CC_FORM));
  await designerShown(c);
}

// The value the designer has for a property of one of its controls.
const designerValue = (c, control, property) =>
  c.evaluate(
    `${DESIGNER_GLOBALS}?.allControls.find((x) => x.properties.Name === ${JSON.stringify(control)})?.properties[${JSON.stringify(property)}]`,
  );

// A part of a composite: the lines of one of the fixture's files from the one holding `first`
// to the first after it holding `last`, as the editor shows them (see codeLines).
async function codePart(c, name, file, first, last = first, anchors = {}) {
  await openFile(c, CC_FILE(file));
  return codeLines(c, name, first, last, { anchors });
}

// The lines of the file the editor shows, from the one holding `first` to the first after it
// holding `last` and `after` lines more, as a capture of the real editor, cut to the code's own
// width: from 16 pixels left of the least indented line's first letter to 16 right of the
// longest line's end, and 8 above and below. A line is the one that is `first` (white space
// aside), else the first that holds it. In the page, for the capture: the editor hides every
// other line (as folding does), has 8 pixels of padding at its top, and marks neither the
// caret's line nor the words like the one at the caret. `anchors`, an object of them, are
// resolved in the part. `include`, selectors of elements inside the editor (a code lens above
// a line, a hover), grow the clip to hold them (`{ css, rows: true }` only in height: a code
// lens is as wide as the editor), and `extraRight` more pixels to the right of the code
// (the hints a line ends in); `annotate` is drawn over the code, and the clip grows to hold
// it. `hover`, `{ line, word, offset?, text }`, rests the mouse on that word of that line until
// the IDE's hover that holds `text` shows. `view` is the page size the clip is cut from. With
// `bare`, the part is the picture itself: it returns the PNG.
async function codeLines(
  c,
  name,
  first,
  last = first,
  {
    anchors = {},
    after = 0,
    include = [],
    extraRight = 0,
    annotate = null,
    bare = false,
    hover = null,
    view = IDE_SIZE,
  } = {},
) {
  const PAD = 8;
  const was = await c.evaluate(`(() => {
  const o = monaco.editor.EditorOption;
  const was = {
    padding: editor.getOption(o.padding),
    renderLineHighlight: editor.getOption(o.renderLineHighlight),
    occurrencesHighlight: editor.getOption(o.occurrencesHighlight),
    selectionHighlight: editor.getOption(o.selectionHighlight),
    matchBrackets: editor.getOption(o.matchBrackets),
  };
  editor.updateOptions({
    padding: { ...was.padding, top: ${PAD} },
    renderLineHighlight: "none",
    occurrencesHighlight: typeof was.occurrencesHighlight === "string" ? "off" : false,
    selectionHighlight: false,
    matchBrackets: "never",
  });
  // the margin left of the code (where a line that starts in the first column has its 16
  // pixels) in the colour of the code's own background
  const node = editor.getDomNode();
  const bg = getComputedStyle(node.querySelector(".monaco-editor-background") ?? node).backgroundColor;
  const s = document.createElement("style");
  s.id = "tbShotCodeMargin";
  s.textContent = ".monaco-editor .margin{background-color:" + bg + " !important}";
  document.head.appendChild(s);
  return was;
})()`);
  try {
    const lines = await waitFor(
      c,
      () =>
        c.evaluate(`(() => {
  const m = editor.getModel();
  if (!m) return null;
  const all = m.getLinesContent();
  const find = (from, text) => {
    const rest = all.slice(from - 1);
    const i = rest.findIndex((l) => l.trim() === text);
    const j = i >= 0 ? i : rest.findIndex((l) => l.includes(text));
    return j < 0 ? 0 : from + j;
  };
  const a = find(1, ${JSON.stringify(first)});
  const found = a && find(a, ${JSON.stringify(last)});
  if (!a || !found) return null;
  const b = Math.min(found + ${after}, m.getLineCount());
  const hide = [];
  if (a > 1) hide.push(new monaco.Range(1, 1, a - 1, 1));
  if (b < m.getLineCount()) hide.push(new monaco.Range(b + 1, 1, m.getLineCount(), 1));
  editor.setHiddenAreas(hide);
  editor.setPosition({ lineNumber: a, column: 1 });
  editor.setScrollTop(0);
  return { a, b };
})()`),
      { timeout: 10000, interval: 100 },
    );
    if (!lines) throw new Error(`the open file has no lines from "${first}" to "${last}"`);
    await frames(c);
    if (hover) {
      // the IDE's own hover, from a real mouse resting on `word` of the line `line`
      const at = await c.evaluate(`(() => {
  const m = editor.getModel();
  const n = m.getLinesContent().findIndex((l) => l.includes(${JSON.stringify(hover.line)})) + 1;
  return n ? { n, col: m.getLineContent(n).indexOf(${JSON.stringify(hover.word)}) + 1 + ${hover.offset ?? 0} } : null;
})()`);
      if (!at) throw new Error(`no line "${hover.line}" to hover on`);
      let shown = false;
      for (let attempt = 0; attempt < 3 && !shown; attempt++) {
        await restMouse(c, at.n, at.col);
        shown = await waitFor(c, async () => (await hoverText(c))?.includes(hover.text) && true, { timeout: 6000 });
      }
      if (!shown) throw new Error(`the hover on "${hover.word}" did not show`);
      // the hover is drawn in full once it has been still for a moment
      await sleep(600);
    }
    const clip = await c.evaluate(`(() => {
  const m = editor.getModel();
  const d = editor.getDomNode().getBoundingClientRect();
  const lh = editor.getOption(monaco.editor.EditorOption.lineHeight);
  const at = (lineNumber, column) => editor.getScrolledVisiblePosition({ lineNumber, column });
  let left = Infinity;
  let right = 0;
  for (let n = ${lines.a}; n <= ${lines.b}; n++) {
    const text = m.getLineContent(n);
    if (!text.trim()) continue;
    left = Math.min(left, at(n, text.search(/\\S/) + 1).left);
    right = Math.max(right, at(n, m.getLineMaxColumn(n)).left);
  }
  const top = at(${lines.a}, 1).top;
  const bottom = at(${lines.b}, 1).top + lh;
  const lay = editor.getLayoutInfo();
  let x0 = d.x + left - 16;
  let y0 = d.y + top - ${PAD};
  let x1 = d.x + right + 16 + ${extraRight};
  let y1 = d.y + bottom + ${PAD};
  if (x1 > d.x + (lay.minimap?.minimapLeft ?? lay.width)) return null;
  for (const item of ${JSON.stringify(include)}) {
    const css = typeof item === "string" ? item : item.css;
    for (const e of document.querySelectorAll(css)) {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || e.classList.contains("hidden")) continue;
      // with { css, rows: true } only the rows it takes count: it is as wide as the editor
      if (typeof item === "string") {
        x0 = Math.min(x0, r.left - 16);
        x1 = Math.max(x1, r.right + 16);
      }
      y0 = Math.min(y0, r.top - ${PAD});
      y1 = Math.max(y1, r.bottom + ${PAD});
    }
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
})()`);
    if (!clip) throw new Error(`the lines "${first}" to "${last}" are wider than the editor shows`);
    const resolved = await resolveAnchors(c, anchors);
    let area = snapOut(clip, view.width, view.height);
    try {
      if (annotate) {
        const { box } = await annotateOver(c, annotate);
        if (box) area = snapOut(union(clip, box), view.width, view.height);
      }
      // a hover goes when the mouse is taken away, and the picture is of it
      const png = await capture(c, name, area, { away: hover ? null : () => parkMouse(c) });
      return bare ? png : { png, clip: area, anchors: resolved, column: 0 };
    } finally {
      if (annotate) await unannotate(c);
      if (hover) await mouseAway(c);
    }
  } finally {
    await c.evaluate(`(() => {
  editor.setHiddenAreas([]);
  editor.updateOptions(${JSON.stringify(was)});
  document.getElementById("tbShotCodeMargin")?.remove();
})()`);
  }
}

// A part of a composite: PROPERTIES, floating, for the control `control` of frmCustom, on the
// IDE's background: its EVENTS tab when `events`, the properties `expand` open (in that order)
// and Anchors and Columns otherwise closed, scrolled and sized as scrollProperties does with
// `category` and `upTo`. With `list`, the list of that property's select drawn open below it,
// the part as large as it needs. `anchors` are resolved in the part.
async function propertiesPart(c, name, control, { category, upTo, expand = [], events = false, list = null, anchors }) {
  await ccDesigner(c);
  await selectControl(c, control);
  const tab = (which) => `${PROPS} .toolbar${which}`;
  try {
    await floatPanel(c, "PROPERTIES", { width: 360, height: 700, top: 40 });
    if (events) {
      const t = await rectOf(c, tab("Events"));
      if (!t) throw new Error("PROPERTIES has no EVENTS tab");
      await clickAt(c, t.x + t.width / 2, t.y + t.height / 2);
      const shown = await waitFor(
        c,
        () => c.evaluate(`!!document.querySelector(${JSON.stringify(`${tab("Events")}.selected`)})`),
        {
          timeout: 3000,
          interval: 50,
        },
      );
      if (!shown) throw new Error("a click on EVENTS did not show the events");
      await parkMouse(c);
    } else {
      for (const p of ["Anchors", "Columns"]) {
        if (!expand.includes(p) && (await c.evaluate(`!!document.querySelector(${JSON.stringify(PROP_NAME(p))})`))) {
          await expandProperty(c, p, false);
        }
      }
      for (const p of expand) await expandProperty(c, p, true);
    }
    await scrollProperties(c, category, { upTo });
    const panel = await rectOf(c, PROPS);
    const ground = await c.evaluate("getComputedStyle(document.body).backgroundColor");
    try {
      const { box } = list
        ? await annotateOver(c, [{ type: "list", select: { css: PROP_VALUE(list) } }])
        : { box: null };
      const area = snapOut(box ? union(panel, box) : panel);
      const found = await resolveAnchors(c, anchors);
      const png = await capture(c, name, area, {
        away: () => parkMouse(c),
        keep: [PROPS, `#${LAYER_ID}`],
        solid: ground,
      });
      return { png, clip: area, anchors: found, column: 1 };
    } finally {
      await unannotate(c);
    }
  } finally {
    if (events) {
      const t = await rectOf(c, tab("Properties"));
      if (t) await clickAt(c, t.x + t.width / 2, t.y + t.height / 2);
      await parkMouse(c);
    }
    await unfloatPanel(c, "PROPERTIES");
  }
}

// A composite of the parts `parts(c)` makes, the code left and PROPERTIES right, with one
// arrow from the end of the code anchor `decl` to the row anchor `row`; the column of the
// code is placed so that the arrow slopes down to the row. `before` and `after` change the
// fixture in the page and put it back.
function ccShot(name, parts, { before = null, after = null } = {}) {
  return {
    out: `Tutorials/CustomControls/Images/${name}.png`,
    setup: "customcontrols",
    async take({ c }) {
      await resetUi(c);
      try {
        if (before) await before(c);
        // the parts are not the picture: capture keeps the first two captures that agree
        const { reference, prefer } = c.shot;
        Object.assign(c.shot, { reference: null, prefer: null });
        let made;
        try {
          made = await parts(c);
        } finally {
          Object.assign(c.shot, { reference, prefer });
        }
        try {
          const { box } = await composite(
            c,
            made,
            // to the left end of the row: a flat row's edge nearest the code is its top
            [
              {
                type: "arrow",
                from: { of: { ref: "decl" }, at: "right", dx: 10 },
                to: { of: { ref: "row" }, at: "left", dx: -4 },
              },
            ],
            { align: { from: "decl", to: "row", dy: CC_SLOPE } },
          );
          return await capture(c, name, snapOut(box), { away: () => parkMouse(c) });
        } finally {
          await uncomposite(c);
        }
      } finally {
        if (after) await after(c);
      }
    },
  };
}

// MyField's declaration in MyGrid.twin, with the initializer ` = 42` added at its end (in the
// page, as a person types it), or taken off again, and the designer's MyGrid1 then showing the
// value the class gives it, 42 or 0. An open designer takes a class's new defaults only when
// it opens the form again (it shows no RESYNC for them), so the form's tab is closed first.
const MYFIELD = "Public MyField As Long";
async function myFieldInitializer(c, on) {
  const closeForm = async () =>
    closeTabs(
      c,
      (await editorTabs(c)).map((t) => t.name).filter((n) => n !== CC_FORM),
      { discard: true },
    );
  await closeForm();
  await openFile(c, CC_FILE("MyGrid.twin"));
  const edited = await c.evaluate(`(() => {
  const m = editor.getModel();
  const n = m.getLinesContent().findIndex((l) => l.trim().startsWith(${JSON.stringify(MYFIELD)})) + 1;
  if (n < 1) return false;
  const text = m.getLineContent(n);
  const want = text.replace(/ = 42$/, "") + (${on} ? " = 42" : "");
  if (text !== want) editor.executeEdits("shoot_docs", [{ range: new monaco.Range(n, 1, n, text.length + 1), text: want }]);
  return true;
})()`);
  if (!edited) throw new Error(`MyGrid.twin has no line "${MYFIELD}"`);
  // the form opened again until the compiler has the class's new default: it is read as the
  // designer opens
  const want = on ? 42 : 0;
  for (let attempt = 1; ; attempt++) {
    await ccDesigner(c);
    const has = async () => (await designerValue(c, CC_GRID, "MyField")) === want;
    if (await waitFor(c, has, { timeout: 3000, interval: 100 })) break;
    if (attempt === 6) throw new Error(`the designer's ${CC_GRID} never had MyField ${want}`);
    await closeForm();
  }
}

// MyField's line and MyGrid1's whole property sheet to MyField.
const myFieldParts = (name, decl) => async (c) => [
  await codePart(c, `${name}-code`, "MyGrid.twin", MYFIELD, MYFIELD, { decl: { code: decl } }),
  await propertiesPart(c, `${name}-panel`, CC_GRID, {
    category: "DESIGN",
    upTo: "MyField",
    anchors: { row: { css: PROP_NAME("MyField") } },
  }),
];

const customControlsShots = [
  ccShot("ccMyFieldPropertySheet1a", myFieldParts("ccMyFieldPropertySheet1a", MYFIELD)),
  // the same with MyField's default 42, given in the page and taken off again
  ccShot("ccMyFieldPropertySheet1b", myFieldParts("ccMyFieldPropertySheet1b", `${MYFIELD} = 42`), {
    before: (c) => myFieldInitializer(c, true),
    after: (c) => myFieldInitializer(c, false),
  }),
  // the enumeration and the field of its type; the field's select with its list open
  ccShot("ccMyEnumFieldPropertySheet", async (c) => [
    await codePart(c, "ccMyEnumFieldPropertySheet-code", "MyGrid.twin", "Enum MyEnum", "Public MyEnumField As MyEnum", {
      decl: { code: "Public MyEnumField As MyEnum" },
    }),
    await propertiesPart(c, "ccMyEnumFieldPropertySheet-panel", CC_GRID, {
      category: "LAYOUT",
      upTo: "MyField",
      list: "MyEnumField",
      anchors: { row: { css: PROP_NAME("MyEnumField") } },
    }),
  ]),
  // the class with its ClassId, the field of its type, and the field open in PROPERTIES
  ccShot("ccMyFieldClass", async (c) => [
    await codePart(c, "ccMyFieldClass-class", "MyButton.twin", '[ClassId("B4E1D7A2', "End Class"),
    await codePart(c, "ccMyFieldClass-code", "MyButton.twin", "Public NormalState As", "Public NormalState As", {
      decl: { code: "Public NormalState As MyButtonState = New MyButtonState" },
    }),
    await propertiesPart(c, "ccMyFieldClass-panel", CC_BUTTON, {
      category: "LAYOUT",
      // a nested property's title is its path
      upTo: "NormalState.TextRendering",
      expand: ["NormalState", "NormalState.Corners", "NormalState.Corners.TopLeft"],
      anchors: { row: { css: PROP_NAME("NormalState") } },
    }),
  ]),
  // the class of the array's elements, the array, and the array open in PROPERTIES
  ccShot("ccMyFieldArray", async (c) => [
    await codePart(c, "ccMyFieldArray-class", "MyGrid.twin", '[ClassId("3F6B2C1A', "End Class"),
    await codePart(c, "ccMyFieldArray-code", "MyGrid.twin", "Public Columns() As", "Public Columns() As", {
      decl: { code: "Public Columns() As GridColumn" },
    }),
    await propertiesPart(c, "ccMyFieldArray-panel", CC_GRID, {
      category: "APPEARANCE",
      upTo: { text: "+ (add)" },
      expand: ["Columns", "Columns(0)"],
      anchors: { row: { css: PROP_NAME("Columns") } },
    }),
  ]),
  // the events, and the EVENTS tab that lists them
  ccShot("ccEvents", async (c) => [
    await codePart(c, "ccEvents-code", "MyButton.twin", "Class MyButton", "Event LostFocus()", {
      decl: { code: "Event Click()" },
    }),
    await propertiesPart(c, "ccEvents-panel", CC_BUTTON, {
      events: true,
      category: "GENERAL",
      upTo: { text: "LostFocus" },
      anchors: { row: { css: `${PROPS} .propertyName`, text: "Click" } },
    }),
  ]),
];

// ---- the CustomControls tutorial's code: attributes, the ClassId hint, the hover, a property
// pair and a form's JSON (setup customcontrols, a part of its own)

// MyGrid.twin with the editor showing only the lines `first` to `last` (see codeLines).
const grid = (name, first, last, options = {}) => ({
  out: `Tutorials/CustomControls/Images/${name}.png`,
  setup: "customcontrols",
  async take({ c }) {
    await resetUi(c);
    await openFile(c, CC_FILE("MyGrid.twin"));
    return codeLines(c, name, first, last, { bare: true, ...options });
  },
});

const GRID_CUSTOMCONTROL = '[CustomControl("/Miscellaneous/MyGrid.png")]';
const GRID_COMCREATABLE = "[COMCreatable(False)]";

// The ClassId attribute of GridColumn (the first line of MyGrid.twin) made `[ ClassId () ]`, as
// a person types it above a class: the compiler then offers to insert a GUID, as a line above it.
// The text is replaced in the page and put back.
const CLASSID_EMPTY = "[ ClassId () ]";
const classIdInsertShot = {
  out: "Tutorials/CustomControls/Images/ccClassIdInsert.png",
  setup: "customcontrols",
  async take({ c }) {
    await resetUi(c);
    await openFile(c, CC_FILE("MyGrid.twin"));
    const original = await editorText(c);
    try {
      await c.evaluate(`(() => {
  const m = editor.getModel();
  editor.executeEdits("shoot_docs", [{ range: new monaco.Range(1, 1, 1, m.getLineMaxColumn(1)), text: ${JSON.stringify(CLASSID_EMPTY)} }]);
  editor.focus();
  editor.setPosition({ lineNumber: 1, column: 12 });
  editor.setScrollTop(0);
})()`);
      // the hint and the squiggle under ClassId come from the compiler
      const hint = await waitFor(
        c,
        () =>
          c.evaluate(
            `document.querySelector(".codeLensWidgetText")?.textContent.includes("randomly generated GUID") && !!document.querySelector(".monaco-editor .squiggly-error")`,
          ),
        { timeout: 20000, interval: 200 },
      );
      if (!hint) throw new Error("the compiler offered no GUID for an empty ClassId");
      return await codeLines(c, "ccClassIdInsert", CLASSID_EMPTY, CLASSID_EMPTY, {
        bare: true,
        include: [{ css: ".codeLensWidget", rows: true }, ".codeLensWidgetText"],
      });
    } finally {
      await c.evaluate(`editor.getModel().setValue(${JSON.stringify(original)})`);
      await closeTabs(c, [], { discard: true });
    }
  },
};

const customControlsCodeShots = [
  grid("ccCustomControlAttribute", GRID_CUSTOMCONTROL, GRID_CUSTOMCONTROL),
  grid("ccClassIdAttribute", GRID_CUSTOMCONTROL, '[ClassId("8C2E5A47'),
  grid("ccCOMCreatable", GRID_CUSTOMCONTROL, "Class MyGrid", {
    annotate: [
      {
        type: "arrow",
        from: { of: { code: GRID_COMCREATABLE }, at: "right", dx: 130 },
        to: { code: GRID_COMCREATABLE },
      },
    ],
  }),
  grid("ccICustomControl", "Class MyGrid", "Implements CustomControls.ICustomControl", {
    hover: {
      line: "Implements CustomControls.ICustomControl",
      word: "ICustomControl",
      offset: 3,
      text: "interface ICustomControl",
    },
    include: [".monaco-hover"],
  }),
  classIdInsertShot,
  {
    // a property pair that repaints the control, in a class of its own
    out: "Tutorials/CustomControls/Images/ccMyFieldCustomProperty.png",
    setup: "customcontrols",
    async take({ c }) {
      await resetUi(c);
      await openFile(c, CC_FILE("MyGridProperty.twin"));
      return codeLines(c, "ccMyFieldCustomProperty", "Private _MyField", "ControlContext.Repaint", {
        bare: true,
        after: 1,
      });
    },
  },
  {
    // the JSON of a saved form, from View As JSON on its row in the Project Explorer: the lines
    // of MyGrid1's MyField and Name
    out: "Tutorials/CustomControls/Images/ccMyFieldJson1a.png",
    setup: "customcontrols",
    async take({ c }) {
      await resetUi(c);
      try {
        await peOpen(c, "Sources", true);
        await peRightClick(c, "frmCustomJson.tbform");
        const it = (await menuItems(c)).find((i) => i.text === "View As JSON");
        if (!it) throw new Error("the form's context menu has no View As JSON");
        await clickAt(c, it.x + it.width / 2, it.y + it.height / 2);
      } finally {
        await closeMenus(c);
      }
      const shown = await waitFor(
        c,
        async () =>
          (await editorTabs(c)).some((t) => t.name.startsWith("JSON:")) &&
          (await c.evaluate(`editor.getModel()?.getValue().includes('"MyField"') ?? false`)),
        { timeout: 10000, interval: 100 },
      );
      if (!shown) throw new Error("View As JSON opened no JSON of the form");
      try {
        return await codeLines(c, "ccMyFieldJson1a", '"MyField"', '"Name": "MyGrid1"', { bare: true });
      } finally {
        await closeTabs(c);
      }
    },
  },
];

// ---- the editor alone: the code a page shows (setups code and sample9)

// The build select of the toolbar changed as a person does, and the compiler's answer awaited:
// the lines of the branch that is not compiled are greyed (the editor's excluded-code style).
async function buildConfiguration(c, value) {
  const greyed = (n) =>
    c.evaluate(`editor.getLineDecorations(${n}).some((d) => /ExcludedCode/.test(d.options.inlineClassName || ""))`);
  await c.evaluate(`(() => {
  const e = document.getElementById("buildConfigSelector");
  e.value = ${JSON.stringify(value)};
  e.dispatchEvent(new Event("change", { bubbles: true }));
})()`);
  // the Win64 branch (line 4) is greyed in win32 and the Else branch (line 7) in win64
  const moved = await waitFor(
    c,
    async () => (await greyed(4)) === (value === "win32") && (await greyed(7)) === (value === "win64"),
    { timeout: 20000, interval: 100 },
  );
  if (!moved) throw new Error(`the editor did not grey the branch that ${value} does not compile`);
  // the compiler restarts, and the DEBUG CONSOLE says so with the path of the project, which is
  // under the Windows user's folder: its Clear button empties it, once the line is in
  await waitFor(c, async () => /restarting from/.test(await textOf(c)), { timeout: 10000, interval: 100 });
  for (let i = 0; i < 5 && /restarting from/.test(await textOf(c)); i++) {
    const b = await rectOf(c, '[title="Clear Debug Console"]');
    if (!b) throw new Error("the DEBUG CONSOLE has no Clear button");
    await clickAt(c, b.x + b.width / 2, b.y + b.height / 2);
    await sleep(500);
  }
  await parkMouse(c);
  await frames(c);
}

// The toolbar's build select, the editor's tab and the first eleven lines of ConstantsDemo, in
// one clip, whichever build is chosen; win32 is put back after.
function constantsShot(out, name, build) {
  return {
    out,
    setup: "code",
    async take({ c }) {
      await resetUi(c);
      await closeTabs(c, ["ConstantsDemo.twin"]);
      await openFile(c, SAMPLE_FILE("Sources/ConstantsDemo.twin"), { line: 10, column: 1 });
      try {
        await buildConfiguration(c, build);
        const bar = await toolbarRect(c);
        const panel = await editorPanelRect(c);
        const bottom = await c.evaluate(`(() => {
  const p = editor.getScrolledVisiblePosition({ lineNumber: 11, column: 1 });
  return editor.getDomNode().getBoundingClientRect().y + p.top + p.height + 2;
})()`);
        const clip = { x: panel.x, y: bar.y, width: 700, height: bottom - bar.y };
        return await capture(c, name, snapOut(clip), { away: () => parkMouse(c) });
      } finally {
        await buildConfiguration(c, "win32");
      }
    },
  };
}

// The inline hints that show an enumeration's values are the IDE's, drawn on every line when
// IDE Options has Always show IDE Inline Code Hints ticked: ticked in the page, and put back.
const HINTS_OPTION = "codeHintsVisibility2";
const codeShots = [
  constantsShot("Reference/Images/oHpCiV1.png", "oHpCiV1", "win32"),
  constantsShot("Reference/Images/TYizrRW.png", "TYizrRW", "win64"),
  {
    out: "Reference/Images/flags-attribute.png",
    setup: "code",
    async take({ c }) {
      await resetUi(c);
      await openFile(c, SAMPLE_FILE("Sources/FlagsDemo.twin"));
      const hints = (on) => c.evaluate(`liveIDEOptions.${HINTS_OPTION} = ${on}; changedIdeOptions();`);
      try {
        await hints(true);
        const drawn = await waitFor(
          c,
          () =>
            c.evaluate(
              `[...document.querySelectorAll(".inlineDecoration")].some((e) => getComputedStyle(e, "::after").content.includes("1 << 3"))`,
            ),
          { timeout: 10000, interval: 100 },
        );
        if (!drawn) throw new Error("the editor drew no inline hints for the enumeration's values");
        return await codeLines(c, "flags-attribute", "[Flags]", "End Enum", { bare: true, extraRight: 190 });
      } finally {
        await hints(false);
      }
    },
  },
];

// Sample 9's WebView_Create handler, in a page wide enough for its longest comment line.
const sample9Shots = [
  {
    out: "Tutorials/WebView2/Images/tbWebView2CreateEvent.png",
    setup: "sample9",
    async take({ c }) {
      await resetUi(c);
      return atSize(c, 1500, IDE_SIZE.height, async () => {
        await openFile(c, "/NewProject/Sources/myMonacoControl.twin");
        return codeLines(c, "tbWebView2CreateEvent", "Private Sub WebView_Create()", "End Sub", {
          bare: true,
          view: { width: 1500, height: IDE_SIZE.height },
        });
      });
    },
  },
];

// ---- the feature map: the whole window, twelve of the IDE's features each named by a label
// with an arrow to it (setup featuremap)

// The page's size, and its layout, set in the page and saved nowhere: the Project Explorer,
// OUTLINE, HISTORY and DIAGNOSTICS down the left, the editor with its mini-map filling the rest,
// and no DEBUG CONSOLE, whose compiler lines name the user's folder.
const FEATURE_PAGE = { width: 1440, height: 900 };
const FEATURE_LAYOUT = {
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
          size: "21%",
          content: [
            { id: "PROJECT EXPLORER", variableSize: false, size: "30%" },
            { id: "OUTLINE", variableSize: false, size: "15%" },
            { id: "HISTORY", variableSize: false, size: "22%" },
            { id: "PROBLEMS", variableSize: true, size: "0%" },
          ],
        },
        { id: "EDITOR", variableSize: true, size: "0%" },
      ],
    },
  ],
};
const FEATURE_FILE = "/FeatureTour/Sources/Inventory.twin";
// The options the picture shows that are not the defaults, set in the page only (PAGE_DEFAULTS
// has made saving them do nothing) and put back after it: sticky scroll, the advanced hover, the
// inline hints on every line, the folding controls shown always, and the memory and object
// counts in the status bar.
const FEATURE_OPTIONS = {
  stickyScrolling: true,
  showAdvancedHoverInfo: true,
  codeHintsVisibility2: true,
  hideCodeEditorFolding: false,
  codeFoldingAlwaysVisible: true,
  showDebuggerMemUsage: true,
};
// History's entries: a change in each of three procedures, at these times (London's); the panel
// lists the newest first.
const FEATURE_EDITS = [
  ["2026-01-09T09:12:40Z", "ReDim Preserve items(count)", "Inventory.Add"],
  ["2026-01-09T10:05:17Z", "Find = -1", "Inventory.Find"],
  ["2026-01-09T11:48:03Z", "Total = subtotal", "Inventory.Total"],
];
// The status bar's memory and object counts are the IDE process's own, which change from run to
// run: they are set in the page, as History's times are, and the page stops writing them (the
// IDE writes them only while memUsageDiv is set).
const FEATURE_MEMORY = { memUsage: "175.6", userObjects: "100", gdiObjects: "16" };

// A change in each procedure of FEATURE_EDITS, made and undone at its time: the cursor put on the
// line holding its text, and a space put in at its start and taken out again.
async function featureHistory(c) {
  await c.send("Emulation.setTimezoneOverride", { timezoneId: "Europe/London" });
  try {
    for (const [iso, text] of FEATURE_EDITS) {
      await c.evaluate(FAKE_CLOCK(iso));
      for (const edit of ["insert", "remove"]) {
        const done = await c.evaluate(`(() => {
  const m = editor.getModel();
  const n = m.getLinesContent().findIndex((l) => l.includes(${JSON.stringify(text)})) + 1;
  if (!n) return false;
  // History names the procedure the cursor is in
  editor.setPosition({ lineNumber: n, column: 1 });
  const range = ${edit === "insert"} ? new monaco.Range(n, 1, n, 1) : new monaco.Range(n, 1, n, 2);
  return editor.executeEdits("shoot_docs", [{ range, text: ${edit === "insert"} ? " " : "" }]);
})()`);
        if (!done) throw new Error(`the editor has no line "${text}" to change`);
        await sleep(300);
      }
      await sleep(1200);
    }
  } finally {
    await c.evaluate(REAL_CLOCK);
    await c.send("Emulation.setTimezoneOverride", { timezoneId: "" });
  }
  const names = FEATURE_EDITS.map(([, , name]) => name).reverse();
  const listed = await waitFor(
    c,
    async () => {
      const text = await dockedText(c, "HISTORY");
      return names.every((n) => text.includes(n)) && text;
    },
    { timeout: 5000, interval: 100 },
  );
  if (!listed) throw new Error(`HISTORY does not list ${names.join(", ")}: ${await dockedText(c, "HISTORY")}`);
}

// The text of the docked panel headed `title`.
const dockedText = (c, title) =>
  c.evaluate(
    `[...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === ${JSON.stringify(title)})?.closest(".toolWindowContainer").innerText ?? ""`,
  );

// The box of the lowest element `css` matches in the docked panel headed `title`.
const lowestIn = (c, title, css) =>
  c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === ${JSON.stringify(title)});
  const rs = [...(h?.closest(".toolWindowContainer").querySelectorAll(${JSON.stringify(css)}) ?? [])].map((e) => e.getBoundingClientRect()).filter((r) => r.height);
  const r = rs.sort((a, b) => b.bottom - a.bottom)[0];
  return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);

// The box of the topmost inline hint (the editor draws it as its decoration's ::after) that holds
// `text`.
const hintBox = (c, text) =>
  c.evaluate(`(() => {
  const r = [...document.querySelectorAll(".inlineDecoration")]
    .filter((e) => getComputedStyle(e, "::after").content.includes(${JSON.stringify(text)}))
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width)
    .sort((a, b) => a.y - b.y)[0];
  return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);

const POINT = (x, y) => ({ rect: { x, y, width: 0, height: 0 } });

// The window as IDE-Features.md shows it. Inventory.twin is scrolled into Total, so that sticky
// scroll holds the class's and the function's first lines at the top; the mouse rests on
// StockItem in ItemByIndex's line near the foot, whose hover with the advanced information then
// opens above it, right of the code it covers. The labels are on the editor's empty right and
// foot and in the panels' empty space, each with an arrow to what it names.
const featureMapShot = {
  out: "Features/Images/IDE-FeatureMap.png",
  setup: "featuremap",
  take: takeFeatureMap,
};
async function takeFeatureMap({ c }) {
  await resetUi(c);
  await openFile(c, FEATURE_FILE);
  const keys = Object.keys(FEATURE_OPTIONS);
  const was = JSON.parse(
    await c.evaluate(
      `JSON.stringify(Object.fromEntries(${JSON.stringify(keys)}.map((k) => [k, liveIDEOptions[k] === undefined ? null : liveIDEOptions[k]])))`,
    ),
  );
  const { width: W, height: H } = FEATURE_PAGE;
  try {
    return await atSize(c, W, H, async () => {
      if (!(await c.evaluate(`restorePanelLayout(${JSON.stringify(JSON.stringify(FEATURE_LAYOUT))})`))) {
        throw new Error("the page refused the layout");
      }
      await c.evaluate(`Object.assign(liveIDEOptions, ${JSON.stringify(FEATURE_OPTIONS)}); changedIdeOptions();`);
      // the compiler has read the project: History keeps no change made before that
      await waitCounts(c, [0, 3, 0, 0]);
      await featureHistory(c);
      // the cursor on ItemByIndex's line, and the view from Total's third line: sticky scroll holds two
      await c.evaluate(`(() => {
  const m = editor.getModel();
  const n = (t) => m.getLinesContent().findIndex((l) => l.includes(t)) + 1;
  editor.setPosition({ lineNumber: n("Public Function ItemByIndex"), column: 5 });
  editor.setScrollTop(editor.getTopForLineNumber(n("Dim note")));
})()`);
      const settled = await waitFor(
        c,
        async () =>
          (await c.evaluate(`document.querySelectorAll(".sticky-widget .sticky-line-root").length`)) === 2 &&
          (await hintBox(c, "i = 0 To count - 1")) &&
          (await c.evaluate(`/^[\\d.]+$/.test(document.getElementById("memUsage").innerText)`)),
        { timeout: 20000, interval: 100 },
      );
      if (!settled) throw new Error("the editor showed no sticky lines or no hints, or the memory counts never came");
      await c.evaluate(`(() => {
  memUsageDiv = null;
  for (const [id, v] of Object.entries(${JSON.stringify(FEATURE_MEMORY)})) document.getElementById(id).innerText = v;
})()`);
      const hint = await hintBox(c, "i = 0 To count - 1");
      const history = await lowestIn(c, "HISTORY", ".treeItemInner");
      const problem = await lowestIn(c, "DIAGNOSTICS", ".problemNodeItem");
      if (!history || !problem) throw new Error("HISTORY or DIAGNOSTICS lists nothing");
      // What the labels point at, before the hover (a hover redraws none of it).
      const at = await resolveAnchors(c, {
        editor: { css: ".monaco-editor" },
        sticky: { css: ".sticky-widget" },
        brackets: { code: "(1 + taxRate), 2)" },
        unicode: { code: '"Grüße 👋 こんにちは"' },
        guided: { code: "If items(i).Quantity > 0 Then" },
        belowBlank: { code: "End If", nth: 2 },
        folding: { css: ".cldr" },
        itemByIndex: { code: "Public Function ItemByIndex" },
        minimap: { css: ".minimap" },
        memory: { css: "#statusMemUsage" },
        outline: { css: ".outlineNodeItem", text: "Inventory", own: true },
      });
      const { outline } = at;
      // the IDE's own hover, from a real mouse resting on StockItem in ItemByIndex's line
      const line = await c.evaluate(`(() => {
  const m = editor.getModel();
  const n = m.getLinesContent().findIndex((l) => l.includes("Public Function ItemByIndex")) + 1;
  return { n, col: m.getLineContent(n).indexOf("StockItem") + 4 };
})()`);
      let shown = false;
      for (let attempt = 0; attempt < 3 && !shown; attempt++) {
        await restMouse(c, line.n, line.col);
        shown = await waitFor(c, async () => (await hoverText(c))?.includes("UDT Alignment") && true, {
          timeout: 6000,
        });
      }
      if (!shown) throw new Error("the hover on StockItem showed no advanced information");
      await sleep(600);
      const popup = await c.evaluate(`(() => {
  const r = [...document.querySelectorAll(".monaco-hover")].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 0).getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
      // A label is a pill whose left (or, `side: "left"`, right) end is at a point, centred on
      // it, and its arrow leaves 4 pixels beyond that end.
      const pill = (text, x, y, side = "right") => ({
        type: "label",
        text,
        on: POINT(x, y),
        side,
        gap: 0,
      });
      const arrow = (from, to, extra = {}) => ({ type: "arrow", from, to, ...extra });
      const box = (r) => ({ rect: r });
      const mid = (r) => r.y + r.height / 2;
      const lh = at.itemByIndex.height;
      // the labels right of the code: their left ends line up
      const right = at.editor.x + 560;
      const sticky =
        await c.evaluate(`[...document.querySelectorAll(".sticky-widget .sticky-line-root")].map((root) => {
  const r = root.querySelector(".sticky-line:last-child > span").getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})`);
      // the blank line inside the If block, where its indent guide crosses nothing
      const guide = { x: at.guided.x, y: at.belowBlank.y - lh / 2 };
      const chevron = { x: at.folding.x + at.folding.width / 2, y: at.itemByIndex.y + lh };
      const minimap = { x: at.minimap.x, y: at.minimap.y + 50 };
      // the top of a label at the foot of the editor, under the last line
      const foot = at.editor.y + at.editor.height - 30;
      const annotate = [
        pill("Sticky scroll", right, at.sticky.y + lh),
        arrow(POINT(right - 4, at.sticky.y + lh), sticky.map(box)),
        pill("Colour matching", at.brackets.x + at.brackets.width + 64, at.brackets.y - 12),
        arrow(POINT(at.brackets.x + at.brackets.width + 60, at.brackets.y - 12), box(at.brackets)),
        pill("Unicode in the editor", right, mid(at.unicode)),
        arrow(POINT(right - 4, mid(at.unicode)), box(at.unicode)),
        pill("Indent guides", right, guide.y),
        arrow(POINT(right - 4, guide.y), POINT(guide.x, guide.y)),
        pill("Inline code hints", right, mid(hint)),
        arrow(POINT(right - 4, mid(hint)), box(hint)),
        // below the hover's right part, right of ItemByIndex's line
        pill("Advanced info popup", popup.x + popup.width - 200, popup.y + popup.height + 50),
        arrow(
          POINT(popup.x + popup.width - 150, popup.y + popup.height + 33),
          POINT(popup.x + popup.width - 150, popup.y + popup.height + 3),
        ),
        pill("Mini-map", minimap.x - 70, minimap.y + 110, "left"),
        arrow(POINT(minimap.x - 66, minimap.y + 100), POINT(minimap.x, minimap.y)),
        // from the foot of the editor, straight up the gutter to ItemByIndex's, clear of the first
        // letter of End Class
        pill("Folding controls", chevron.x + 30, foot, "below"),
        arrow(POINT(chevron.x, foot - 4), POINT(chevron.x, chevron.y + 2)),
        pill("Memory usage and object counts", at.memory.x + at.memory.width / 2 - 200, at.memory.y - 50),
        arrow(
          POINT(at.memory.x + at.memory.width / 2 - 20, at.memory.y - 36),
          POINT(at.memory.x + at.memory.width / 2 - 20, at.memory.y - 3),
        ),
        // the panels: Outline's class from its right, History's and Diagnostics' last rows from below
        pill("Outline", outline.x + outline.width + 60, mid(outline)),
        arrow(POINT(outline.x + outline.width + 56, mid(outline)), box(outline)),
        pill("History", history.x + 110, history.y + history.height + 34),
        arrow(
          POINT(history.x + 106, history.y + history.height + 34),
          POINT(history.x + 70, history.y + history.height + 3),
        ),
        pill("Diagnostics", problem.x + 110, problem.y + problem.height + 40),
        arrow(
          POINT(problem.x + 106, problem.y + problem.height + 40),
          POINT(problem.x + 70, problem.y + problem.height + 3),
        ),
      ];
      await annotateOver(c, annotate);
      return await capture(c, "IDE-FeatureMap", snapOut({ x: 0, y: 0, width: W, height: H }, W, H));
    });
  } finally {
    await unannotate(c);
    await mouseAway(c);
    await c.evaluate(`(() => {
  memUsageDiv = document.getElementById("memUsage");
  const was = ${JSON.stringify(was)};
  for (const k of Object.keys(was)) {
    if (was[k] === null) delete liveIDEOptions[k];
    else liveIDEOptions[k] = was[k];
  }
  changedIdeOptions();
})()`);
    await defaultLayout(c);
  }
}

// ---- the "Writing code" chapter (setup code-chapter): FeatureTour with test/shots/codechapter

const CHAPTER_FILE = (name) => `/FeatureTour/Sources/${name}`;
const CHAPTER_IMAGE = (name) => `IDE/Code/Images/${name}.png`;
// The editor's three navigation combo boxes, native selects named by their class, left to
// right, and the bar that holds them.
const COMBOS = ["codePanelDropDownComponent", "codePanelDropDownScope", "codePanelDropDownProcedure"];
const COMBO = (n) => ({ css: `select.${COMBOS[n]}` });
const COMBO_BAR = ".codePanelDropDownContainer";
// 16 pixels past the right end of box 3, where a picture of the boxes and the code stops: the
// minimap beyond it is drawn a little differently according to what the editor showed before.
const comboEnd = async (c) => {
  const r = await rectOf(c, "select.codePanelDropDownProcedure");
  return r.x + r.width + 16;
};
// What each combo box shows, closed.
const comboTexts = (c) =>
  c.evaluate(
    `${JSON.stringify(COMBOS)}.map((k) => { const s = document.querySelector("select." + k); return s && s.selectedIndex >= 0 ? s.options[s.selectedIndex].text : null; })`,
  );

// The line and column (1-based) of the `nth` line of the open file holding `text`, `offset`
// characters into it; throws when there is none.
async function codePlace(c, text, { nth = 1, offset = 0 } = {}) {
  const at = await c.evaluate(`(() => {
  const ls = editor.getModel().getLinesContent();
  let k = 0;
  for (let i = 0; i < ls.length; i++) {
    const j = ls[i].indexOf(${JSON.stringify(text)});
    if (j >= 0 && ++k === ${nth}) return { line: i + 1, column: j + 1 + ${offset} };
  }
  return null;
})()`);
  if (!at) throw new Error(`the open file has no line holding ${JSON.stringify(text)}`);
  return at;
}

// The caret on `text` in the open file (see codePlace), the focus in the code, and the view
// scrolled so that `top` is the first line shown (1 by default).
async function caretOn(c, text, { nth = 1, offset = 0, top = 1 } = {}) {
  const at = await codePlace(c, text, { nth, offset });
  await setCursor(c, at.line, at.column);
  await c.evaluate(`editor.setScrollTop(editor.getTopForLineNumber(${top}))`);
  await frames(c);
  return at;
}

// The box of the editor's code area (the Monaco editor: margin, code, minimap).
const editorBox = (c) =>
  c.evaluate(`(() => {
  const r = editor.getDomNode().getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);

// The box of lines `from` to `to` of the open file as shown, the editor's width.
async function linesBox(c, from, to) {
  const r = await c.evaluate(`(() => {
  const e = editor.getDomNode().getBoundingClientRect();
  const top = editor.getTopForLineNumber(${from}) - editor.getScrollTop();
  const bottom = editor.getTopForLineNumber(${to}) - editor.getScrollTop() + editor.getOption(monaco.editor.EditorOption.lineHeight);
  return { x: e.x, y: e.y + top, width: e.width, height: bottom - top };
})()`);
  return r;
}

// Inventory open with the caret inside Add, so that the three combo boxes show the class, (general)
// and the procedure; the bar of combo boxes and the first lines of the class under it, each box
// numbered as the Editor page's table numbers it.
const codeCombosShot = {
  out: CHAPTER_IMAGE("Combos"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Inventory.twin"]);
    await caretOn(c, "ReDim Preserve items(count)", { offset: 0 });
    const want = ["Inventory", "(general)", "Add"];
    const shown = await waitFor(
      c,
      async () => {
        const t = await comboTexts(c);
        return t.every((s, i) => s?.startsWith(want[i])) && t;
      },
      { timeout: 10000, interval: 100 },
    );
    if (!shown) throw new Error(`the combo boxes show ${JSON.stringify(await comboTexts(c))}, not ${want.join(", ")}`);
    const bar = await rectOf(c, COMBO_BAR);
    if (!bar) throw new Error("the editor shows no combo boxes");
    const code = await linesBox(c, 1, 11);
    const area = { x: bar.x, y: bar.y, width: (await comboEnd(c)) - bar.x, height: code.y + code.height - bar.y };
    // each badge inside its box, short of the box's arrow
    const annotate = [0, 1, 2].map((n) => ({
      type: "badge",
      n: n + 1,
      on: { of: COMBO(n), at: "right", dx: -44 },
      side: "above",
      gap: -11,
    }));
    return annotatedClip(c, "Combos", area, annotate);
  },
};

// The editor alone in the window, every panel docked beside it out of the layout, in a page
// `width` wide; the default layout put back after `fn`.
async function editorAlone(c, width, fn, height = IDE_SIZE.height) {
  await resetUi(c);
  await closeFindWidget(c);
  for (const id of DOCKED_BESIDE_EDITOR) await undock(c, id);
  try {
    return await atSize(c, width, height, async () => {
      await settledBox(c, editorBox);
      return fn();
    });
  } finally {
    await defaultLayout(c);
  }
}

// Runs `fn` on the open file and then undoes every edit made since, in the page, so that the
// file is as it was opened and its tab shows no unsaved change; whatever box is open closed
// first.
async function editedThenUndone(c, fn) {
  const version = await c.evaluate("editor.getModel().getAlternativeVersionId()");
  let out;
  let failure = null;
  try {
    out = await fn();
  } catch (e) {
    failure = e;
  }
  await pressKey(c, "Escape");
  await pressKey(c, "Escape");
  const back = await c.evaluate(`(() => {
  const m = editor.getModel();
  for (let i = 0; i < 100 && m.getAlternativeVersionId() !== ${version} && m.canUndo(); i++) editor.trigger("shoot_docs", "undo");
  return m.getAlternativeVersionId() === ${version};
})()`);
  if (failure) throw failure;
  if (!back) throw new Error("the edits made for the picture could not be undone");
  return out;
}

// A new line put in after the `nth` line holding `after` in the open file, indented eight
// spaces, holding `text`; returns its number.
async function newLineAfter(c, after, text, { nth = 1 } = {}) {
  const { line } = await codePlace(c, after, { nth });
  await c.evaluate(
    `editor.executeEdits("shoot_docs", [{ range: new monaco.Range(${line + 1}, 1, ${line + 1}, 1), text: ${JSON.stringify(`        ${text}\n`)} }])`,
  );
  return line + 1;
}

// The signature-help box, as the page holds it: whether it is on and shown, its box, its
// signatures, and whether F1 has expanded it.
const SIGNATURE = `(() => {
  const b = debugConsoleEntryIntellisenseBoxSignature;
  const r = b.getBoundingClientRect();
  return { on: !!context.activeSignatureHelp.value, shown: r.width > 0 && r.height > 0,
    box: { x: r.x, y: r.y, width: r.width, height: r.height },
    sigs: b.querySelectorAll(".sigHelpHeaderText").length, expanded: sigHelpIsExpanded };
})()`;

// Signature help as it opens when `(` is typed after `call`, on a new line put in after the
// `nth` line holding `after` in Inventory, with the editor alone in a page wide enough for the
// whole box; with `expand`, after F1 too. The picture is the box and the code from the line
// above it down to the typed line; the help under the typed line (its datatype) is left out.
// The compiler underlines the call, which has no arguments yet, so the picture waits for that
// underline: it is there or not according to when the picture is taken, else.
function signatureShot(name, { after, nth = 1, call, sigs, expand = false }) {
  return {
    out: CHAPTER_IMAGE(name),
    setup: "code-chapter",
    take: ({ c }) =>
      editorAlone(c, 1600, async () => {
        await openFile(c, CHAPTER_FILE("Inventory.twin"));
        return editedThenUndone(c, async () => {
          const line = await newLineAfter(c, after, call, { nth });
          await setCursor(c, line, 9 + call.length);
          await frames(c);
          await pressKey(c, "(");
          const open = await waitFor(
            c,
            async () => {
              const s = await c.evaluate(SIGNATURE);
              return s.on && s.shown && s.sigs === sigs && s;
            },
            { timeout: 10000, interval: 100 },
          );
          if (!open) throw new Error(`typing ( after ${call} showed no signature help with ${sigs} signatures`);
          const marked = await waitFor(
            c,
            () =>
              c.evaluate(
                `monaco.editor.getModelMarkers({ resource: editor.getModel().uri }).some((m) => m.startLineNumber === ${line})`,
              ),
            { timeout: 15000, interval: 100 },
          );
          if (!marked) throw new Error(`the compiler never marked the call on line ${line}`);
          // F1 expands or collapses the box, and the page keeps the state for the next box it shows
          const f1 = async (want) => {
            if ((await c.evaluate(SIGNATURE)).expanded === want) return;
            await pressKey(c, "F1");
            const now = await waitFor(c, async () => (await c.evaluate(SIGNATURE)).expanded === want, {
              timeout: 5000,
              interval: 100,
            });
            if (!now) throw new Error(`F1 did not ${want ? "expand" : "collapse"} the signature help`);
          };
          await f1(expand);
          const { box } = await settledBox(c, () => c.evaluate(SIGNATURE));
          const lineBox = await linesBox(c, line - 1, line);
          const ed = await editorBox(c);
          // from the top of the line 6 pixels above the box, so that its edge has room
          const crossed = await c.evaluate(
            `editor.getTargetAtClientPoint(${ed.x + 8}, ${box.y - 6})?.position?.lineNumber ?? null`,
          );
          if (!crossed) throw new Error("no line of code lies under the signature help's top edge");
          const top = (await linesBox(c, crossed, crossed)).y;
          const area = {
            x: ed.x,
            y: top,
            width: box.x + box.width + 12 - ed.x,
            height: lineBox.y + lineBox.height - top,
          };
          try {
            return await capture(c, name, snapOut(area, 1600, IDE_SIZE.height), { away: () => parkMouse(c) });
          } finally {
            await f1(false);
          }
        });
      }),
  };
}

// The hover over a call to a procedure of the project: Total, in MainModule's Main, a function
// of the Inventory class. The picture is the popup and the line under it, from the editor's left.
const codeHoverShot = {
  out: CHAPTER_IMAGE("Hover"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["MainModule.twin"]);
    const at = await codePlace(c, "stock.Total(", { offset: "stock.".length + 2 });
    await c.evaluate("editor.setScrollTop(0)");
    let shown = false;
    for (let attempt = 0; attempt < 3 && !shown; attempt++) {
      await restMouse(c, at.line, at.column);
      shown = await waitFor(c, async () => (await hoverText(c))?.includes("Inventory") && true, { timeout: 6000 });
    }
    if (!shown) throw new Error(`the hover on Total showed nothing naming Inventory: ${await hoverText(c)}`);
    try {
      const popup = await settledBox(c, () =>
        c.evaluate(`(() => {
  const r = [...document.querySelectorAll(".monaco-hover")].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 0).getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`),
      );
      const lineBox = await linesBox(c, at.line, at.line);
      const ed = await editorBox(c);
      const top = Math.min(popup.y, lineBox.y) - 8;
      const bottom = Math.max(popup.y + popup.height, lineBox.y + lineBox.height) + 8;
      const area = { x: ed.x, y: top, width: popup.x + popup.width + 12 - ed.x, height: bottom - top };
      // the mouse stays on Total: the popup goes when it leaves
      return await capture(c, "Hover", snapOut(area));
    } finally {
      await mouseAway(c);
    }
  },
};

// Inventory's Total with the inline code hints on (Always show IDE Inline Code Hints, set in the
// page only, as for flags-attribute): each End line, and Next, followed by the hint the compiler
// sends for it. The picture is the function, from the editor's left to past the longest hint.
const codeHintsShot = {
  out: CHAPTER_IMAGE("Hints"),
  setup: "code-chapter",
  take: ({ c }) => editorAlone(c, IDE_SIZE.width, () => takeCodeHints(c)),
};
async function takeCodeHints(c) {
  await openFile(c, CHAPTER_FILE("Inventory.twin"));
  const first = (await codePlace(c, "Public Function Total")).line;
  const last = (await codePlace(c, "Total = subtotal")).line + 1;
  await caretOn(c, "Public Function Total", { top: first - 1 });
  const hints = (on) => c.evaluate(`liveIDEOptions.${HINTS_OPTION} = ${on}; changedIdeOptions();`);
  const ends = `[...document.querySelectorAll(".inlineDecoration")].map((e) => e.getBoundingClientRect()).filter((r) => r.width)`;
  try {
    await hints(true);
    const drawn = await waitFor(
      c,
      () =>
        c.evaluate(
          `[...document.querySelectorAll(".inlineDecoration")].some((e) => getComputedStyle(e, "::after").content.includes("Total") && getComputedStyle(e, "::after").display !== "none")`,
        ),
      { timeout: 10000, interval: 100 },
    );
    if (!drawn) throw new Error("the editor drew no inline hint after End Function");
    const box = await linesBox(c, first, last);
    // past the longest hint and the longest line
    const right = await settledBox(c, () =>
      c.evaluate(`(() => {
  const m = editor.getModel();
  const left = editor.getDomNode().getBoundingClientRect().x;
  const lines = [];
  for (let n = ${first}; n <= ${last}; n++) lines.push(left + editor.getScrolledVisiblePosition({ lineNumber: n, column: m.getLineMaxColumn(n) }).left);
  return Math.max(...lines, ...${ends}.filter((r) => r.y >= ${box.y} && r.y < ${box.y + box.height}).map((r) => r.right));
})()`),
    );
    const ed = await editorBox(c);
    const area = { x: ed.x, y: box.y - 4, width: right + 24 - ed.x, height: box.height + 4 };
    return await capture(c, "Hints", snapOut(area), { away: () => parkMouse(c) });
  } finally {
    await hints(false);
  }
}

// A right-click at a point of the page, as a person makes it: the mouse moved there first.
async function rightClickAt(c, x, y) {
  await mouseMove(c, x, y);
  await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "right", buttons: 2, clickCount: 1 });
  await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "right", buttons: 0, clickCount: 1 });
}

// The chapter's files open as tabs, in this order, and no other tab.
// Monaco's find widget closed, as Esc in it closes it (the editor is one for every file, so a
// widget left open shows over the next file's code), and its marks with it.
async function closeFindWidget(c) {
  const open = `!!editor.getDomNode().querySelector(".find-widget.visible")`;
  if (!(await c.evaluate(open))) return;
  await c.evaluate(`editor.getContribution("editor.contrib.findController").closeFindWidget()`);
  if (!(await waitFor(c, async () => !(await c.evaluate(open)), { timeout: 3000, interval: 50 }))) {
    throw new Error("the find widget would not close");
  }
  await frames(c);
}

// With `layout`, the default layout first: a picture of DIAGNOSTICS leaves it floated and hidden.
async function chapterTabs(c, names, { layout = true } = {}) {
  await resetUi(c);
  await closeFindWidget(c);
  if (layout) await defaultLayout(c);
  await closeTabs(c, [], { discard: true });
  for (const n of names) await openFile(c, CHAPTER_FILE(n));
  const shown = (await editorTabs(c)).map((t) => t.name);
  if (shown.join() !== names.join())
    throw new Error(`the editor's tabs are ${shown.join(", ")}, not ${names.join(", ")}`);
}

const TAB = (name) => ({ css: "#codePanelTabs > .tabItem", text: name });

// The tab strip with four tabs in four states, each named by a label under it with an arrow up
// to it: Types as it was opened; Watcher with a change not saved (a space put in at the end of
// its first line, in the page, and undone after), which puts a dot in place of the close button;
// Inventory tinted by its warnings; and Ev opened by one click in the Project Explorer with
// File Explorer: Single-Click Preview on (set in the page only), a preview tab in italics.
const codeTabsStatesShot = {
  out: CHAPTER_IMAGE("Tabs_States"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Types.twin", "Inventory.twin"]);
    // The page tints a tab when the compiler sends the file's diagnostics while the tab is open,
    // not when a tab opens on a file the compiler has reported already: so Inventory is changed
    // and the change undone, as a person editing it would, and the compiler reports it again.
    const tinted = () =>
      c.evaluate(
        `[...document.querySelectorAll("#codePanelTabs > .tabItem")].some((e) => e.querySelector(".tabItemText").textContent.trim() === "Inventory.twin" && e.classList.contains("warning"))`,
      );
    await editedThenUndone(c, async () => {
      await c.evaluate(
        `editor.executeEdits("shoot_docs", [{ range: new monaco.Range(1, editor.getModel().getLineMaxColumn(1), 1, editor.getModel().getLineMaxColumn(1)), text: " " }])`,
      );
      if (!(await waitFor(c, tinted, { timeout: 15000, interval: 100 }))) {
        throw new Error("the compiler's diagnostics for Inventory did not tint its tab");
      }
    });
    await openFile(c, CHAPTER_FILE("Watcher.twin"));
    const was = await c.evaluate("liveIDEOptions.previewDocs");
    try {
      await c.evaluate("liveIDEOptions.previewDocs = true; changedIdeOptions();");
      // the change goes with the tab, closed with Discard Changes after the picture
      await c.evaluate(
        `editor.executeEdits("shoot_docs", [{ range: new monaco.Range(1, editor.getModel().getLineMaxColumn(1), 1, editor.getModel().getLineMaxColumn(1)), text: " " }])`,
      );
      await peOpen(c, "Sources", true);
      await peSelect(c, "Ev.twin");
      const states = await waitFor(
        c,
        () =>
          c.evaluate(`(() => {
  const tabs = [...document.querySelectorAll("#codePanelTabs > .tabItem")];
  const t = (n) => tabs.find((e) => e.querySelector(".tabItemText").textContent.trim() === n);
  const ok = !!t("Ev.twin")?.querySelector(".tabItemPreview") &&
    t("Inventory.twin")?.classList.contains("warning") &&
    !!t("Watcher.twin")?.querySelector(".circleIconSmall") &&
    !t("Types.twin")?.classList.contains("warning") && !t("Types.twin")?.classList.contains("error");
  return ok ? tabs.map((e) => e.className) : null;
})()`),
        { timeout: 10000, interval: 100 },
      );
      if (!states) {
        const now = await c.evaluate(
          `[...document.querySelectorAll("#codePanelTabs > .tabItem")].map((e) => e.className + " / " + e.innerHTML.replace(/\\s+/g, " ").slice(0, 300))`,
        );
        throw new Error(`the four tabs never showed their four states: ${JSON.stringify(now)}`);
      }
      await mouseAway(c);
      const strip = await rectOf(c, "#codePanelTabs");
      const tabs = [
        ["Types.twin", "Normal"],
        ["Inventory.twin", "Has warnings"],
        ["Watcher.twin", "Unsaved changes"],
        ["Ev.twin", "Preview tab"],
      ];
      // the labels in two rows, so that two side by side never touch
      const annotate = tabs.flatMap(([name, text], i) => {
        const gap = i % 2 ? 78 : 36;
        return [
          { type: "label", text, on: TAB(name), side: "below", gap },
          { type: "arrow", from: { of: TAB(name), at: "bottom", dy: gap - 2 }, to: TAB(name) },
        ];
      });
      const last = (await editorTabs(c)).at(-1).tab;
      const area = { x: strip.x, y: strip.y, width: last.x + last.width + 40 - strip.x, height: strip.height };
      // the strip and the labels on the strip's own ground, the code under it left out
      const ground = await c.evaluate(`(() => {
  for (let e = document.getElementById("codePanelTabs"); e; e = e.parentElement) {
    const k = getComputedStyle(e).backgroundColor;
    if (!/^rgba\\(.*, 0\\)$/.test(k) && k !== "transparent") return k;
  }
  return null;
})()`);
      if (!ground) throw new Error("the tab strip has no background colour");
      return await annotatedClip(c, "Tabs_States", area, annotate, {
        keep: ["#codePanelTabs", `#${LAYER_ID}`],
        solid: ground,
      });
    } finally {
      await c.evaluate(`liveIDEOptions.previewDocs = ${JSON.stringify(was)}; changedIdeOptions();`);
      await closeTabs(c, [], { discard: true });
    }
  },
};

// The right-click menu of a tab, open over the editor: the tab strip and the menu.
const codeTabMenuShot = {
  out: CHAPTER_IMAGE("Tab_Menu"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Types.twin", "Inventory.twin", "Helpers.twin"]);
    // the active tab, at its lower right corner, so that the menu opens under it and covers no
    // tab's name
    const tab = (await editorTabs(c)).find((t) => t.name === "Helpers.twin").tab;
    try {
      await rightClickAt(c, tab.x + tab.width - 6, tab.y + tab.height - 3);
      if (!(await menuOpened(c))) throw new Error("a right-click on a tab opened no menu");
      const menu = await rectOf(c, "#contextMenu");
      const strip = await rectOf(c, "#codePanelTabs");
      // the strip's tabs and the menu, from the strip's left to past the menu, short of the minimap
      // (see comboEnd)
      const area = grow(union(strip, menu), 8);
      area.x = strip.x;
      area.width = menu.x + menu.width + 40 - strip.x;
      return await capture(c, "Tab_Menu", snapOut(area), { away: () => parkMouse(c) });
    } finally {
      await closeMenus(c);
      await closeTabs(c, [], { discard: true });
    }
  },
};

// The editor's right-click menu, opened over Twice's Return line in Helpers, with its Code Editor
// Options submenu open: from the line above the one clicked, the code under the menu and the
// submenu, with the editor alone in the window so that both open over code. The submenu opens
// level with its item, near the menu's foot, and hangs below it: the page is tall enough that it
// still ends over the code.
const CONTEXT_MENU_HEIGHT = 1040;
const codeContextMenuShot = {
  out: CHAPTER_IMAGE("Context_Menu"),
  setup: "code-chapter",
  take: ({ c }) => editorAlone(c, IDE_SIZE.width, () => takeContextMenu(c), CONTEXT_MENU_HEIGHT),
};
async function takeContextMenu(c) {
  await chapterTabs(c, ["Helpers.twin"]);
  // the clicked line second in the view, so that the menu and its submenu open over code
  const { line: returnLine } = await codePlace(c, "Return n * 2");
  const at = await caretOn(c, "Return n * 2", { offset: 4, top: returnLine - 1 });
  try {
    const line = await linesBox(c, at.line, at.line);
    const p = await c.evaluate(`(() => {
  const e = editor.getDomNode().getBoundingClientRect();
  const q = editor.getScrolledVisiblePosition({ lineNumber: ${at.line}, column: ${at.column} });
  return { x: e.x + q.left, y: e.y + q.top + q.height / 2 };
})()`);
    await rightClickAt(c, p.x, p.y);
    if (!(await menuOpened(c))) throw new Error("a right-click in the code opened no menu");
    const sub = await hoverItem(c, "Code Editor Options");
    const menu = await rectOf(c, "#contextMenu");
    const above = { ...line, y: line.y - line.height, width: menu.x - line.x };
    const area = grow(union(union(menu, sub), above), 8);
    area.x = line.x;
    area.y = above.y;
    area.height = Math.max(menu.y + menu.height, sub.y + sub.height) + 8 - above.y;
    return await capture(c, "Context_Menu", snapOut(area, IDE_SIZE.width, CONTEXT_MENU_HEIGHT));
  } finally {
    await closeMenus(c);
  }
}

// Monaco's command palette, opened by the command of the right-click menu's Monaco Command
// Palette, its input empty: the palette and the top of the editor round it.
const codePaletteShot = {
  out: CHAPTER_IMAGE("Command_Palette"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Helpers.twin"]);
    await caretOn(c, "Return n * 2", { offset: 4 });
    const widget = `[...document.querySelectorAll(".quick-input-widget")].find((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== "none")`;
    try {
      await command(c, "tbEditor_ShowMonacoCommandPalette");
      const box = await waitFor(
        c,
        () =>
          c.evaluate(`(() => {
  const w = ${widget};
  if (!w || !w.querySelectorAll(".monaco-list-row").length) return null;
  const r = w.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`),
        { timeout: 5000, interval: 100 },
      );
      if (!box) throw new Error("the command palette did not open with its list");
      const settled = await settledBox(c, () =>
        c.evaluate(
          `(() => { const r = ${widget}.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
        ),
      );
      const ed = await editorBox(c);
      // from the editor's left to past the palette, short of the minimap (see comboEnd)
      const area = {
        x: ed.x,
        y: ed.y,
        width: settled.x + settled.width + 24 - ed.x,
        height: settled.y + settled.height + 16 - ed.y,
      };
      return await capture(c, "Command_Palette", snapOut(area), { away: () => parkMouse(c) });
    } finally {
      await pressKey(c, "Escape");
      await waitFor(c, async () => !(await c.evaluate(`!!(${widget})`)), { timeout: 3000, interval: 50 });
    }
  },
};

// Watcher open with the caret in src_Changed, so that box 2 shows src and box 3 the event the
// handler is for; box 3's list, which the page fills on a real press and an OS window draws, drawn
// open as a replica below it: Changed [src_Changed] in bold above Reset. The bar and the class's
// code under it.
const codeComboListsShot = {
  out: CHAPTER_IMAGE("Combo_Lists"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Watcher.twin"]);
    await caretOn(c, "Count = Count + Twice", { offset: 0 });
    const want = ["Watcher", "src", "Changed [src_Changed]"];
    const shown = await waitFor(
      c,
      async () => {
        const t = await comboTexts(c);
        return t.join("|") === want.join("|") && t;
      },
      { timeout: 10000, interval: 100 },
    );
    if (!shown) throw new Error(`the combo boxes show ${JSON.stringify(await comboTexts(c))}, not ${want.join(", ")}`);
    const box = await rectOf(c, "select.codePanelDropDownProcedure");
    const count = () =>
      c.evaluate(
        `[...document.querySelector("select.codePanelDropDownProcedure").options].filter((o) => !o.hidden && o.text).length`,
      );
    try {
      // a real press fills the list, and opens the OS's, which Escape closes
      await clickAt(c, box.x + box.width / 2, box.y + box.height / 2);
      const filled = await waitFor(c, async () => (await count()) >= 2, { timeout: 5000, interval: 100 });
      await pressKey(c, "Escape");
      if (!filled) throw new Error("a press on box 3 did not fill its list");
      const bar = await rectOf(c, COMBO_BAR);
      const code = await linesBox(c, 1, 15);
      const area = { x: bar.x, y: bar.y, width: (await comboEnd(c)) - bar.x, height: code.y + code.height - bar.y };
      return await listClip(c, "Combo_Lists", area, [{ type: "list", select: COMBO(2) }], { margin: 0 });
    } finally {
      await caretOn(c, "Count = Count + Twice", { offset: 0 });
    }
  },
};

// The Edit and View menus with the code editor focused (the caret in Helpers), as cut-outs.
const focusCode = async (c) => {
  await chapterTabs(c, ["Helpers.twin"]);
  await caretOn(c, "Return n * 2", { offset: 4 });
  if (!(await c.evaluate("editor.hasTextFocus()"))) throw new Error("the code editor does not have the focus");
};

// ---- the EDITOR panel, its parts named

// The EDITOR panel of the default layout on its own (a cut-out on the window's ground), Helpers
// open with Types and Inventory as tabs beside it and the caret in Twice, the fold arrows shown
// always (set in the page only, as the feature map sets them), and its parts named by labels in
// the space the panels round it leave: the header's ... button from above, the Tabs List button,
// the combo boxes and the minimap from the right, the tab strip and the margin from the left.
const EDITOR_PANEL_MARK = "data-tb-shot-editor";
const codeEditorPanelShot = {
  out: CHAPTER_IMAGE("Editor_Panel"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Types.twin", "Inventory.twin", "Helpers.twin"]);
    await caretOn(c, "Return n * 2", { offset: 4 });
    const options = { hideCodeEditorFolding: false, codeFoldingAlwaysVisible: true };
    const keys = Object.keys(options);
    const was = JSON.parse(
      await c.evaluate(
        `JSON.stringify(Object.fromEntries(${JSON.stringify(keys)}.map((k) => [k, liveIDEOptions[k] === undefined ? null : liveIDEOptions[k]])))`,
      ),
    );
    try {
      await c.evaluate(`Object.assign(liveIDEOptions, ${JSON.stringify(options)}); changedIdeOptions();`);
      // the panel is marked for the cut-out, an attribute that draws nothing
      const panel = await c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "EDITOR 1");
  const p = h.closest(".toolWindowContainer");
  p.setAttribute(${JSON.stringify(EDITOR_PANEL_MARK)}, "");
  const r = p.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
      const shown = await waitFor(c, () => c.evaluate(`document.querySelectorAll(".monaco-editor .cldr").length > 0`), {
        timeout: 5000,
        interval: 100,
      });
      if (!shown) throw new Error("the editor shows no fold arrows");
      const OPTIONS = { css: `[${EDITOR_PANEL_MARK}] .ellipsesIcon2` };
      const TABS_LIST = { css: TABS_BUTTON };
      const MINIMAP = { css: `[${EDITOR_PANEL_MARK}] .monaco-editor .minimap` };
      const GUTTER = { css: `[${EDITOR_PANEL_MARK}] .monaco-editor .margin` };
      const at = await resolveAnchors(c, {
        options: OPTIONS,
        tabsList: TABS_LIST,
        box3: COMBO(2),
        minimap: MINIMAP,
        gutter: GUTTER,
        tab: TAB("Types.twin"),
      });
      const right = panel.x + panel.width + 44;
      const left = panel.x - 44;
      const point = (x, y) => ({ rect: { x, y, width: 0, height: 0 } });
      const mid = (r) => r.y + r.height / 2;
      const marginY = mid(at.gutter) - 60;
      const annotate = [
        { type: "label", text: "Options", on: { of: OPTIONS, at: "top", dy: -44 }, side: "above", gap: 0 },
        { type: "arrow", from: { of: OPTIONS, at: "top", dy: -42 }, to: OPTIONS },
        { type: "label", text: "Tabs List", on: point(right, mid(at.tabsList)), side: "right", gap: 0 },
        { type: "arrow", from: point(right - 4, mid(at.tabsList)), to: TABS_LIST },
        { type: "label", text: "Combo boxes", on: point(right, mid(at.box3)), side: "right", gap: 0 },
        { type: "arrow", from: point(right - 4, mid(at.box3)), to: COMBO(2) },
        { type: "label", text: "Minimap", on: point(right, at.minimap.y + 60), side: "right", gap: 0 },
        {
          type: "arrow",
          from: point(right - 4, at.minimap.y + 60),
          to: point(at.minimap.x + at.minimap.width - 30, at.minimap.y + 60),
        },
        { type: "label", text: "Tab strip", on: point(left, mid(at.tab)), side: "left", gap: 0 },
        { type: "arrow", from: point(left + 4, mid(at.tab)), to: TAB("Types.twin") },
        { type: "label", text: "Margin", on: point(left, marginY), side: "left", gap: 0 },
        { type: "arrow", from: point(left + 4, marginY), to: point(at.gutter.x + 24, marginY) },
      ];
      const ground = await c.evaluate("getComputedStyle(document.body).backgroundColor");
      return await annotatedClip(c, "Editor_Panel", panel, annotate, {
        keep: [`[${EDITOR_PANEL_MARK}]`, `#${LAYER_ID}`],
        solid: ground,
      });
    } finally {
      await c.evaluate(`(() => {
  document.querySelector("[${EDITOR_PANEL_MARK}]")?.removeAttribute(${JSON.stringify(EDITOR_PANEL_MARK)});
  const was = ${JSON.stringify(was)};
  for (const k of Object.keys(was)) {
    if (was[k] === null) delete liveIDEOptions[k];
    else liveIDEOptions[k] = was[k];
  }
  changedIdeOptions();
})()`);
    }
  },
};

// ---- Paste As Comment: before and after

// The page's clipboard calls answered from a text of the tool's own, so that the IDE never reads
// or writes the host's clipboard; put back by REAL_CLIPBOARD.
const FAKE_CLIPBOARD = (text) => `(() => {
  if (!window.tbRealRequest) {
    window.tbRealRequest = debugSocket.request;
    window.tbRealReadText = navigator.clipboard.readText;
    window.tbRealWriteText = navigator.clipboard.writeText;
  }
  const real = window.tbRealRequest.bind(debugSocket);
  const clip = { text: ${JSON.stringify(text)} };
  debugSocket.request = function (method, params, cb, ...rest) {
    if (method === "copyClipboardIDE") { clip.text = params.text; cb && cb({ body: {} }); return; }
    if (method === "readClipboardIDE") { cb && cb({ body: { text: clip.text, extraData: undefined } }); return; }
    return real(method, params, cb, ...rest);
  };
  navigator.clipboard.readText = () => Promise.resolve(clip.text);
  navigator.clipboard.writeText = () => Promise.resolve();
})()`;
const REAL_CLIPBOARD = `(() => {
  if (!window.tbRealRequest) return;
  debugSocket.request = window.tbRealRequest;
  navigator.clipboard.readText = window.tbRealReadText;
  navigator.clipboard.writeText = window.tbRealWriteText;
  delete window.tbRealRequest;
})()`;
// Three lines of text, the second blank, as another program would put them on the clipboard.
const PASTED = "Debug.Print Twice(6)\r\n\r\nDebug.Print Twice(7)";

// Helpers' Third with a blank line put in under its Debug.Print and the caret on it, and the same
// Sub after Paste As Comment of PASTED there, side by side with an arrow from one to the other.
const codePasteAsCommentShot = {
  out: CHAPTER_IMAGE("Paste_As_Comment"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Helpers.twin"]);
    const { reference, prefer } = c.shot;
    Object.assign(c.shot, { reference: null, prefer: null });
    let made;
    try {
      made = await editedThenUndone(c, async () => {
        const line = await newLineAfter(c, "Debug.Print Twice(5)", "");
        await setCursor(c, line, 9);
        const SUB = { code: "Public Sub Third()" };
        const before = await codeLines(c, "Paste_As_Comment-before", "Public Sub Third()", "End Sub", {
          anchors: { before: SUB },
        });
        await c.evaluate(FAKE_CLIPBOARD(PASTED));
        try {
          await setCursor(c, line, 9);
          await command(c, "tbEditor_ClipboardPasteAsComment");
          const pasted = await waitFor(
            c,
            () =>
              c.evaluate(
                `editor.getModel().getLinesContent().filter((l) => l.includes("' Debug.Print Twice(")).length === 2`,
              ),
            { timeout: 5000, interval: 100 },
          );
          if (!pasted) throw new Error("Paste As Comment put in no commented lines");
        } finally {
          await c.evaluate(REAL_CLIPBOARD);
        }
        await pressKey(c, "Escape");
        const after = await codeLines(c, "Paste_As_Comment-after", "Public Sub Third()", "End Sub", {
          anchors: { after: SUB },
        });
        return [before, { ...after, column: 1 }];
      });
    } finally {
      Object.assign(c.shot, { reference, prefer });
    }
    try {
      const { box } = await composite(c, made, [
        {
          type: "arrow",
          from: { of: { ref: "before" }, at: "right", dx: 10 },
          to: { of: { ref: "after" }, at: "left", dx: -4 },
        },
      ]);
      return await capture(c, "Paste_As_Comment", snapOut(box), { away: () => parkMouse(c) });
    } finally {
      await uncomposite(c);
    }
  },
};

// ---- Finding

const FIND = panelSel("FIND REPLACE");

// Find In Project from the end of Helpers, Find What typed as a person types it, and Find Next
// pressed once: the match after Helpers' last Twice is in Watcher, which the panel opens in a
// preview tab with the match selected. The panel floating where it opens, and the editor round it.
const codeFindProjectShot = {
  out: CHAPTER_IMAGE("Find_Project"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Helpers.twin"]);
    await caretOn(c, "End Module");
    const state = () =>
      c.evaluate(`(() => { const t = findReplacePanel._this; return {
  what: t.findWhatInput.value, project: t.findScopeProjectButton.checked, packages: !t.findInPackagesInput.disabled,
  options: [t.findWholeWordGroupInput, t.findMatchCaseGroupInput, t.findUsePatternMatchingInput, t.findUseRegExpInput].some((e) => e.checked) }; })()`);
    const click = async (expr) => {
      const r = await c.evaluate(
        `(() => { const e = ${expr}; const q = e && e.getBoundingClientRect(); return q && q.width ? { x: q.x + q.width / 2, y: q.y + q.height / 2 } : null; })()`,
      );
      if (!r) throw new Error(`nothing to click: ${expr}`);
      await clickAt(c, r.x, r.y);
    };
    try {
      await pressKey(c, "f", { ctrl: true, shift: true });
      if (!(await waitFor(c, () => rectOf(c, FIND), { timeout: 5000, interval: 100 }))) {
        throw new Error("Ctrl+Shift+F did not show the Find / Replace panel");
      }
      if (!(await state()).project) await click("findReplacePanel._this.findScopeProjectButton");
      await click("findReplacePanel._this.findWhatInput");
      await pressKey(c, "a", { ctrl: true });
      await typeText(c, "Twice");
      const s = await state();
      if (s.what !== "Twice" || !s.project || !s.packages || s.options) {
        throw new Error(`the Find / Replace panel is not as the picture needs it: ${JSON.stringify(s)}`);
      }
      // The search starts at the top of the current file: Find Next is pressed until the match it
      // selects is in Watcher, a file after Helpers in the project's order.
      const at = () =>
        c.evaluate(`(() => {
  const tab = document.querySelector("#codePanelTabs > .tabItemSelected .tabItemText")?.textContent.trim();
  const p = editor.getPosition();
  return { tab, line: p.lineNumber, column: p.column, selected: editor.getModel().getValueInRange(editor.getSelection()) };
})()`);
      let found = false;
      for (let press = 0; press < 6 && !found; press++) {
        const was = JSON.stringify(await at());
        await click(
          `[...document.querySelectorAll(${JSON.stringify(`${FIND} *`)})].find((b) => b.children.length === 0 && b.textContent.trim() === "Find Next")`,
        );
        const now = await waitFor(
          c,
          async () => {
            const a = await at();
            return JSON.stringify(a) !== was && a.selected === "Twice" && a;
          },
          { timeout: 10000, interval: 100 },
        );
        if (!now) throw new Error(`Find Next selected no further match: ${was}`);
        found = now.tab === "Watcher.twin";
      }
      if (!found) throw new Error("Find Next never selected Twice in Watcher");
      await frames(c);
      const ed = await editorPanelRect(c);
      // the floating panel moved inside the editor panel, as a person drags it there, so that the
      // picture holds nothing of the panels beside the editor
      await c.evaluate(`document.querySelector(${JSON.stringify(FIND)}).style.left = "${ed.x + 24}px"`);
      await frames(c);
      const panel = await rectOf(c, FIND);
      // from the editor panel's left to past the panel, short of the minimap (see comboEnd)
      const area = {
        x: ed.x,
        y: ed.y,
        width: panel.x + panel.width + 24 - ed.x,
        height: (await linesBox(c, 15, 15)).y + 4 - ed.y,
      };
      return await capture(c, "Find_Project", snapOut(area), { away: () => parkMouse(c) });
    } finally {
      await pressKey(c, "Escape");
      await closePanelIfShown(c, "FIND REPLACE");
      await closeTabs(c, [], { discard: true });
    }
  },
};

// Quick Replace (Alt+H) in Helpers: Monaco's find widget at the top right of the editor, its
// replace row shown, Twice typed as the text to find, the count of matches, and the matches marked
// in the code.
const codeQuickFindShot = {
  out: CHAPTER_IMAGE("Quick_Find"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Helpers.twin"]);
    await caretOn(c, "Public Function Twice", { offset: "Public Function ".length + 2 });
    const widget = `editor.getDomNode().querySelector(".find-widget")`;
    try {
      await pressKey(c, "h", { alt: true });
      const open = await waitFor(
        c,
        () =>
          c.evaluate(`(() => { const w = ${widget}; return !!w && w.classList.contains("visible") && w.classList.contains("replaceToggled") &&
  w.contains(document.activeElement); })()`),
        { timeout: 5000, interval: 100 },
      );
      if (!open) throw new Error("Alt+H did not show the find widget with its replace row");
      // the word typed into the box to find, over whatever an earlier search left there
      await pressKey(c, "a", { ctrl: true });
      await typeText(c, "Twice");
      const counted = await waitFor(
        c,
        () =>
          c.evaluate(`(() => { const w = ${widget}; return document.activeElement.value === "Twice" &&
  /\\d+ of \\d+/.test(w.querySelector(".matchesCount")?.textContent ?? "") && w.querySelector(".matchesCount").textContent; })()`),
        { timeout: 5000, interval: 100 },
      );
      if (!counted) throw new Error("typing Twice into the find widget counted no matches");
      const box = await settledBox(c, () =>
        c.evaluate(
          `(() => { const r = ${widget}.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
        ),
      );
      const ed = await editorBox(c);
      const last = await codePlace(c, "Debug.Print Twice(5)");
      const lines = await linesBox(c, 1, last.line);
      // to just past the widget, short of the minimap (see comboEnd)
      const area = {
        x: ed.x,
        y: ed.y,
        width: box.x + box.width + 8 - ed.x,
        height: Math.max(box.y + box.height, lines.y + lines.height) + 4 - ed.y,
      };
      return await capture(c, "Quick_Find", snapOut(area), { away: () => parkMouse(c) });
    } finally {
      await closeFindWidget(c);
    }
  },
};

// ---- Navigating

// Helpers with a bookmark on Twice's first line and one on Third's, made with Ctrl+B, and the
// glyph of the lower one named from below, the arrow straight up the glyph margin. The bookmarks
// are cleared after with the right-click menu's Clear Bookmarks (Project) command.
const codeBookmarksShot = {
  out: CHAPTER_IMAGE("Bookmarks"),
  setup: "code-chapter",
  async take({ c }) {
    await chapterTabs(c, ["Helpers.twin"]);
    const first = await codePlace(c, "Public Function Twice");
    try {
      for (const text of ["Public Function Twice", "Public Sub Third"]) {
        await caretOn(c, text, { offset: 4, top: first.line - 1 });
        await pressKey(c, "b", { ctrl: true });
      }
      await caretOn(c, "End Module", { top: first.line - 1 });
      const glyphs = await waitFor(
        c,
        () =>
          c.evaluate(`(() => {
  const g = [...document.querySelectorAll(".bookmarkActiveGlyph")].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
  return g.length === 2 ? g.sort((a, b) => a.y - b.y).map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })) : null;
})()`),
        { timeout: 5000, interval: 100 },
      );
      if (!glyphs) throw new Error("Ctrl+B on two lines did not draw two bookmark glyphs");
      const end = await codePlace(c, "End Module");
      const code = await linesBox(c, first.line - 1, end.line);
      const lower = glyphs[1];
      const x = lower.x + lower.width / 2;
      const labelY = code.y + code.height + 40;
      // the label's left end under the glyph, the arrow up from its top edge: nothing of the label
      // is left of the editor
      const annotate = [
        {
          type: "label",
          text: "Bookmark",
          on: { rect: { x: lower.x - 4, y: labelY, width: 0, height: 0 } },
          side: "right",
          gap: 0,
        },
        { type: "arrow", from: { rect: { x, y: labelY - 16, width: 0, height: 0 } }, to: { rect: lower } },
      ];
      const area = { x: code.x, y: code.y, width: 560, height: code.height };
      return await annotatedClip(c, "Bookmarks", area, annotate);
    } finally {
      await command(c, "tbEditor_ClearBookmarksProject");
      await waitFor(c, () => c.evaluate(`document.querySelectorAll(".bookmarkActiveGlyph").length === 0`), {
        timeout: 3000,
        interval: 100,
      });
    }
  },
};

// The OUTLINE panel, floating, for Helpers, with its ... menu open (a real click on the button).
const codeOutlineMenuShot = annotatedPanelShot(
  "Outline_Menu",
  "OUTLINE",
  { width: 300, height: 180 },
  {
    setup: "code-chapter",
    out: CHAPTER_IMAGE("Outline_Menu"),
    before: (c) => openFile(c, CHAPTER_FILE("Helpers.twin")),
    async open(c) {
      const b = await rectOf(c, `${panelSel("OUTLINE")} .ellipsesIcon2`);
      if (!b) throw new Error("OUTLINE has no ... button");
      await clickAt(c, b.x + b.width / 2, b.y + b.height / 2);
      if (!(await menuOpened(c))) throw new Error("the ... button of OUTLINE opened no menu");
    },
  },
);

// ---- Diagnostics

// An error put into Helpers in the page (a line printing a name nothing declares, in Third), with
// Hints and Information switched on in DIAGNOSTICS by their commands, as the count buttons do; the
// error discarded and the switches put back after.
const DIAG_ERROR = "Debug.Print Undefined1";
// Waits for the project's counts of errors, warnings, hints and information messages, as the page
// keeps them for the Project Explorer's root (which DIAGNOSTICS shows when it is open), to be
// `want` for a second and a half: DIAGNOSTICS may be closed, its counters with it.
async function waitProjectCounts(c, want) {
  const counts = () =>
    c.evaluate(
      `["Error", "Warning", "Hint", "Info"].map((k) => fs.tree.rootFolder["cachedDiagnostics_child" + k + "Count"] ?? 0)`,
    );
  let since = 0;
  const ok = await waitFor(
    c,
    async () => {
      if ((await counts()).join() !== want.join()) {
        since = 0;
        return false;
      }
      since ||= Date.now();
      return Date.now() - since > 1500;
    },
    { timeout: 30000, interval: 300 },
  );
  if (!ok)
    throw new Error(`the project's diagnostics never settled at ${want.join(",")}: ${(await counts()).join(",")}`);
}
// With `layout`, the default layout first (before DIAGNOSTICS floats, never after).
async function diagnosticsWithError(c, { layout = true } = {}) {
  await chapterTabs(c, ["Helpers.twin"], { layout });
  await newLineAfter(c, "Debug.Print Twice(5)", DIAG_ERROR);
  await waitProjectCounts(c, [1, 4, 1, 1]);
  const shown = await c.evaluate("JSON.stringify(problemsPanelOptions)");
  c.shot.problemsShown = shown;
  if (!(await c.evaluate("problemsPanelOptions.showHints"))) await command(c, "tbProblems_ToggleShowHints");
  if (!(await c.evaluate("problemsPanelOptions.showInfos"))) await command(c, "tbProblems_ToggleShowInfos");
}
async function diagnosticsBack(c) {
  const was = c.shot.problemsShown ? JSON.parse(c.shot.problemsShown) : null;
  c.shot.problemsShown = null;
  if (was) {
    if ((await c.evaluate("problemsPanelOptions.showHints")) !== was.showHints)
      await command(c, "tbProblems_ToggleShowHints");
    if ((await c.evaluate("problemsPanelOptions.showInfos")) !== was.showInfos)
      await command(c, "tbProblems_ToggleShowInfos");
  }
  await closeTabs(c, [], { discard: true });
  await waitProjectCounts(c, [0, 4, 1, 1]);
}
// The box of the floating DIAGNOSTICS row holding `code`, once the panel lists a row of each kind.
const diagRow = (c, code) =>
  waitFor(
    c,
    () =>
      c.evaluate(`(() => {
  const rows = [...document.querySelectorAll(${JSON.stringify(`${DIAG} .problemNodeItem`)})];
  if (!["TB5079", "TB0003", "TB0016", "TB0012"].every((k) => rows.some((e) => e.textContent.includes(k)))) return null;
  const r = rows.find((e) => e.textContent.includes(${JSON.stringify(code)}))?.getBoundingClientRect();
  return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`),
    { timeout: 5000, interval: 100 },
  );

// DIAGNOSTICS floating, its rows of all four kinds in three files, the error's row selected with a
// real click, which shows Jump to issue and Help under it.
const codeDiagnosticsRowsShot = panelShot("Diagnostics_Rows", "PROBLEMS", [560, 360], {
  setup: "code-chapter",
  out: CHAPTER_IMAGE("Diagnostics_Rows"),
  before: diagnosticsWithError,
  async prepare(c) {
    const r = await diagRow(c, "TB5079");
    if (!r) throw new Error("DIAGNOSTICS has no row for the error");
    await clickAt(c, r.x + 60, r.y + r.height / 2);
    if (!(await waitFor(c, () => rectOf(c, `${DIAG} .problemButtonJump`), { timeout: 3000, interval: 50 }))) {
      throw new Error("a click on the error's row showed no Jump to issue button");
    }
    await frames(c);
  },
  restore: diagnosticsBack,
});

// The same panel with its right-click menu open over the error's row.
const codeDiagnosticsMenuShot = annotatedPanelShot(
  "Diagnostics_Menu",
  "PROBLEMS",
  { width: 560, height: 360 },
  {
    setup: "code-chapter",
    out: CHAPTER_IMAGE("Diagnostics_Menu"),
    // the panel floats before this runs: the layout is left as it is
    before: (c) => diagnosticsWithError(c, { layout: false }),
    async open(c) {
      const r = await diagRow(c, "TB5079");
      if (!r) throw new Error("DIAGNOSTICS has no row for the error");
      await rightClickAt(c, r.x + 60, r.y + r.height / 2);
      if (!(await menuOpened(c))) throw new Error("a right-click on a DIAGNOSTICS row opened no menu");
    },
    after: diagnosticsBack,
  },
);

const codeChapterShots = [
  codeEditorPanelShot,
  codeTabsStatesShot,
  codeTabMenuShot,
  codeComboListsShot,
  codeContextMenuShot,
  codePaletteShot,
  // the Edit and View menus are shown as they are while a person types code
  menuShot("Menu_Edit", "Edit", null, { setup: "code-chapter", before: focusCode }),
  menuShot("Menu_View", "View", null, { setup: "code-chapter", before: focusCode }),
  codeCombosShot,
  signatureShot("SignatureHelp", { after: "Dim i As Long", nth: 2, call: "i = InStr", sigs: 2 }),
  signatureShot("SignatureHelp_Expanded", { after: "count = 0", call: "MsgBox", sigs: 1, expand: true }),
  codeHoverShot,
  codeHintsShot,
  codePasteAsCommentShot,
  codeFindProjectShot,
  codeQuickFindShot,
  codeBookmarksShot,
  codeOutlineMenuShot,
  codeDiagnosticsRowsShot,
  codeDiagnosticsMenuShot,
];

// ---- the "Running and debugging" chapter (setup debugging): the Writing code chapter's project,
// FeatureTour, with test/shots/debugging's Checks module as well. Main calls Inventory.Total,
// whose loop line takes the breakpoint; the program prints one line on the loop's first pass.
// Every picture starts from nothing running, no breakpoint, no watch, an empty DEBUG CONSOLE and
// the default layout (debugReset), and leaves it so. The DEBUG CONSOLE's line times and the time
// a line took change from run to run: they are set in the page once the real ones are shown, as
// the CodeLens pictures' are.

const DEBUG_IMAGE = (name) => `IDE/Debugging/Images/${name}.png`;
const LOOP_LINE = "subtotal = subtotal + items(i).Quantity * price";
const isPaused = (c) => c.evaluate("!!context.atBreakpoint?.value");

// The value a panel's tree shows for the row at `names` (from the top), or null.
const treeValue = (c, panel, names) =>
  c.evaluate(`(() => {
  let f = ${panel}.tree.rootFolder;
  for (const n of ${JSON.stringify(names)}) f = f && Object.values(f.entries || {}).find((e) => e.name === n);
  return f ? ((f.customRenderData || {}).value ?? null) : null;
})()`);

// The text of the WATCHES panel: each row's expression, value and type on lines of their own.
const watchesText = (c) =>
  c.evaluate(String.raw`watchPanel.tree.sectionHeader.parentNode.innerText.replace(/\n{2,}/g, "\n")`);

// An object's address changes from run to run: each one the page shows is set to OBJECT_ADDRESS,
// in the page, once the real ones are shown.
const OBJECT_ADDRESS = "441954992";
const fixObjectAddresses = (c) =>
  c.evaluate(String.raw`(() => {
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n.nodeValue.includes("{object: ")) n.nodeValue = n.nodeValue.replace(/\{object: \d+\}/g, "{object: ${OBJECT_ADDRESS}}");
  }
})()`);

// The DEBUG CONSOLE emptied with its own button.
async function clearConsole(c) {
  if (await c.evaluate("debugConsoleContent.dataNodes.length === 0")) return;
  const clear = await rectOf(c, '[title="Clear Debug Console"]');
  if (!clear) throw new Error("the DEBUG CONSOLE has no Clear button");
  await clickAt(c, clear.x + clear.width / 2, clear.y + clear.height / 2);
  if (!(await waitFor(c, () => c.evaluate("debugConsoleContent.dataNodes.length === 0"), { timeout: 5000 }))) {
    throw new Error("the DEBUG CONSOLE was not cleared");
  }
  await parkMouse(c);
}

// Nothing running, no breakpoint, no watch, no tab, the default layout and an empty console.
async function debugReset(c) {
  await resetUi(c);
  await removePointer(c);
  for (let i = 0; i < 3 && (await codeExecuting(c)); i++) {
    await command(c, "tbDebug_Stop");
    await waitFor(c, async () => !(await codeExecuting(c)), { timeout: 15000, interval: 100 });
  }
  if (await codeExecuting(c)) throw new Error("the program would not end");
  await command(c, "tbDebug_BreakpointsClear");
  await command(c, "tbWatches_Clear");
  await closeTabs(c, [], { discard: true });
  await defaultLayout(c);
  await clearConsole(c);
  await frames(c);
}

// A breakpoint on the line of the open file holding `text`, set with F9 as a person sets it.
async function breakpointOn(c, text) {
  const { line } = await codePlace(c, text);
  if (!(await waitForEditAnswer(c))) throw new Error("the compiler never answered the last edit");
  await setCursor(c, line, 9);
  await pressKey(c, "F9");
  const set = await waitFor(
    c,
    () =>
      c.evaluate(
        `editor.getModel().getAllDecorations().some((d) => d.range.startLineNumber === ${line} && /breakpointActiveGlyph/.test(d.options.glyphMarginClassName || ""))`,
      ),
    { timeout: 5000, interval: 50 },
  );
  if (!set) throw new Error(`F9 set no breakpoint on ${JSON.stringify(text)}`);
  return line;
}

// A watch added with Debug > Add Watch..., its expression typed and entered.
async function addWatch(c, expression) {
  await command(c, "tbWatches_Add");
  const box = await waitFor(c, () => c.evaluate(`document.activeElement?.placeholder === "Expression to watch"`), {
    timeout: 5000,
    interval: 50,
  });
  if (!box) throw new Error("Add Watch... opened no box");
  await typeText(c, expression);
  await pressKey(c, "Enter");
  const added = await waitFor(
    c,
    () =>
      c.evaluate(
        `Object.values(watchPanel.tree.rootFolder.entries || {}).some((e) => e.name === ${JSON.stringify(expression)})`,
      ),
    { timeout: 5000, interval: 50 },
  );
  if (!added) throw new Error(`the watch ${expression} was not added`);
}

// Waits for the program to be paused with `test` true; throws naming `what` otherwise.
async function waitStop(c, test, what) {
  const ok = await waitFor(c, async () => (await isPaused(c)) && (await test()), { timeout: 60000, interval: 150 });
  if (!ok) throw new Error(`the program did not stop ${what}`);
  await frames(c);
}

// Main run with a breakpoint on Total's loop line (and on `also`, if given), stopped there on
// the loop's first pass (`pass` 1, i = 0) or its second (`pass` 2, i = 1), when the first has
// printed its line. Inventory is open; `before` runs before Start.
async function pausedInTotal(c, { pass = 1, also = null, before = null } = {}) {
  await openFile(c, CHAPTER_FILE("Inventory.twin"));
  await breakpointOn(c, LOOP_LINE);
  if (also) await breakpointOn(c, also);
  if (before) await before(c);
  await clearConsole(c);
  await startRun(c);
  const iIs = (v) => async () => (await treeValue(c, "variablesPanel", ["Locals", "i"])) === v;
  await waitStop(c, iIs("0"), "at the breakpoint in Total");
  if (pass === 2) {
    await command(c, "tbDebug_StartOrContinue");
    // the console's text, whether or not the layout shows it
    const printed = async () =>
      (await c.evaluate(`document.querySelector(".debugConsoleOuter")?.textContent ?? ""`)).includes(": Widget") &&
      (await iIs("1")());
    await waitStop(c, printed, "on the loop's second pass");
  }
  // the panels fill in turn: wait for the call stack's two frames
  const frames2 = await waitFor(
    c,
    () =>
      c.evaluate(
        `Object.values(liveStackTraceInfo).some((t) => Object.values(t || {}).filter((f) => f && f.name).length >= 2)`,
      ),
    { timeout: 10000, interval: 100 },
  );
  if (!frames2) throw new Error("the Call Stack never showed Total and Main");
}

// A layout set in the page and saved nowhere.
async function useLayout(c, layout) {
  if (!(await c.evaluate(`restorePanelLayout(${JSON.stringify(JSON.stringify(layout))})`))) {
    throw new Error("the page refused the layout");
  }
  await frames(c);
}
const LAYOUT_ROWS = (bottom, size) => ({
  type: "horizontal",
  variableSize: true,
  size: "0%",
  content: [
    { id: "TOOLBAR", variableSize: false, size: "fit-content" },
    { id: "EDITOR", variableSize: true, size: "0%" },
    { type: "vertical", variableSize: false, size, content: bottom },
  ],
});
// the editor with its panels below it, each `[id, size]` and the last taking the rest
const panelsRow = (panels) =>
  panels.map(([id, size], i) =>
    i === panels.length - 1 ? { id, variableSize: true, size: "0%" } : { id, variableSize: false, size },
  );
const PAUSED_LAYOUT = LAYOUT_ROWS(
  panelsRow([["DEBUG CONSOLE", "30%"], ["CALL STACK", "22%"], ["VARIABLES", "24%"], ["WATCHES"]]),
  "34%",
);
const STOP_LAYOUT = LAYOUT_ROWS(panelsRow([["CALL STACK", "42%"], ["VARIABLES"]]), "23%");
// the TOOLBOX, empty beside code, wide enough for labels on the editor's left
const GLYPHS_LAYOUT = {
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
        { id: "TOOLBOX", variableSize: false, size: "22%" },
        { id: "EDITOR", variableSize: true, size: "0%" },
      ],
    },
  ],
};

// The box of the docked panel headed `title` (EDITOR 1, CALL STACK...).
const panelBox = (c, title) =>
  c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === ${JSON.stringify(title)});
  const r = h?.closest(".toolWindowContainer")?.getBoundingClientRect();
  return r && r.width ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);

// The whole window paused in Total on the loop's second pass, in a layout with the DEBUG
// CONSOLE, CALL STACK, VARIABLES and WATCHES under the editor; two watches.
const debugPausedPanelsShot = {
  out: DEBUG_IMAGE("Paused_Panels"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      await useLayout(c, PAUSED_LAYOUT);
      await pausedInTotal(c, {
        pass: 2,
        before: async (c) => {
          await addWatch(c, "subtotal");
          await addWatch(c, "items(i).Quantity");
        },
      });
      const watched = await waitFor(c, async () => (await watchesText(c)).includes("items(i).Quantity:\n8\n"), {
        timeout: 10000,
        interval: 100,
      });
      if (!watched) {
        const shown = await watchesText(c);
        throw new Error(`the watches never showed their values: ${JSON.stringify(shown)}`);
      }
      await c.evaluate(
        `editor.setScrollTop(editor.getTopForLineNumber(${(await codePlace(c, "Public Function Total")).line}))`,
      );
      await fixConsoleTimes(c);
      await fixObjectAddresses(c);
      await frames(c);
      return await capture(c, "Paused_Panels", snapOut({ x: 0, y: 0, ...IDE_SIZE }), { away: () => parkMouse(c) });
    } finally {
      await debugReset(c);
    }
  },
};

// FillTable run with F6 and stopped by its Subscript error: the editor with the error panel
// under the failing line, and CALL STACK and VARIABLES under the editor.
const debugErrorPanelShot = {
  out: DEBUG_IMAGE("Error_Panel"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      return await atSize(c, 1100, 700, async () => {
        await useLayout(c, STOP_LAYOUT);
        await openFile(c, CHAPTER_FILE("Checks.twin"));
        await caretOn(c, "For i = 1 To 6", { offset: 4 });
        await command(c, "tbDebug_RunOrPreview");
        await waitStop(
          c,
          async () =>
            (await c.evaluate(`document.querySelectorAll(".errorWidgetButton").length`)) === 4 &&
            (await treeValue(c, "variablesPanel", ["Locals", "idx"])) === "7",
          "at the Subscript error",
        );
        await c.evaluate(
          `editor.setScrollTop(editor.getTopForLineNumber(${(await codePlace(c, "Public Sub FillTable")).line}))`,
        );
        await frames(c);
        const ed = await panelBox(c, "EDITOR 1");
        const vars = await panelBox(c, "VARIABLES");
        if (!ed || !vars) throw new Error("the editor or VARIABLES is not in the layout");
        const area = { x: 0, y: ed.y, width: 1100, height: vars.y + vars.height - ed.y };
        return capture(c, "Error_Panel", snapOut(area, 1100, 700), { away: () => parkMouse(c) });
      });
    } finally {
      await debugReset(c);
    }
  },
};

// Inventory at Total with a breakpoint on the loop line and the mouse resting in the margin of
// the line above, which shows the faint dot there; a pointer drawn at the mouse, and the two
// dots named by labels in the empty TOOLBOX on the editor's left.
const debugBreakpointGlyphsShot = {
  out: DEBUG_IMAGE("Breakpoint_Glyphs"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      await useLayout(c, GLYPHS_LAYOUT);
      await openFile(c, CHAPTER_FILE("Inventory.twin"));
      const bp = await breakpointOn(c, LOOP_LINE);
      const first = (await codePlace(c, "Public Function Total")).line;
      await caretOn(c, "Public Sub Add", { top: first });
      const above = bp - 1;
      const at = await c.evaluate(`(() => {
  const e = editor.getDomNode().getBoundingClientRect();
  const l = editor.getLayoutInfo();
  const lh = editor.getOption(monaco.editor.EditorOption.lineHeight);
  const y = e.y + editor.getTopForLineNumber(${above}) - editor.getScrollTop() + lh / 2;
  return { x: e.x + l.glyphMarginLeft + l.glyphMarginWidth - 3, y: y + 3 };
})()`);
      await mouseMove(c, at.x - 6, at.y);
      await mouseMove(c, at.x, at.y);
      const ghost = await waitFor(c, () => rectOf(c, ".breakpointInactiveGlyph"), { timeout: 5000, interval: 50 });
      if (!ghost) throw new Error("the margin showed no faint dot under the mouse");
      await drawPointer(c, at);
      const code = await linesBox(c, first + 3, bp + 4);
      const ed = await editorBox(c);
      const left = ed.x - 64;
      const dot = await rectOf(c, ".breakpointActiveGlyph");
      const mid = (r) => r.y + r.height / 2;
      const annotate = [
        { type: "label", text: "Breakpoint", on: POINT(left, mid(dot) + 16), side: "left", gap: 0 },
        { type: "arrow", from: POINT(left + 4, mid(dot) + 16), to: { css: ".breakpointActiveGlyph" } },
        { type: "label", text: "Faint dot", on: POINT(left, mid(ghost) - 16), side: "left", gap: 0 },
        { type: "arrow", from: POINT(left + 4, mid(ghost) - 16), to: { css: ".breakpointInactiveGlyph" } },
      ];
      const area = { x: ed.x, y: code.y, width: 560, height: code.height };
      return await annotatedClip(c, "Breakpoint_Glyphs", area, annotate, { away: null });
    } finally {
      await removePointer(c);
      await mouseMove(c, 2, IDE_SIZE.height - 10);
      await debugReset(c);
    }
  },
};

// The first colour of the element `sel` and its ancestors that is not transparent: the ground
// a cut-out of it is put on.
const groundOf = (c, sel) =>
  c.evaluate(`(() => {
  for (let e = document.querySelector(${JSON.stringify(sel)}); e; e = e.parentElement) {
    const k = getComputedStyle(e).backgroundColor;
    if (!/^rgba\\(.*, 0\\)$/.test(k) && k !== "transparent") return k;
  }
  return null;
})()`);

// The open file scrolled so that the line holding `text` is the first shown.
async function scrollToLine(c, text) {
  await c.evaluate(`editor.setScrollTop(editor.getTopForLineNumber(${(await codePlace(c, text)).line}))`);
  await frames(c);
}

// Main run with a breakpoint on its last line, stopped there once Locals holds `first`.
async function pausedInMain(c) {
  await openFile(c, CHAPTER_FILE("MainModule.twin"));
  await breakpointOn(c, "Debug.Print first.Quantity");
  await clearConsole(c);
  await startRun(c);
  await waitStop(c, async () => (await treeValue(c, "variablesPanel", ["Locals", "first"])) !== null, "in Main");
}

// The node of a panel's tree at `names` (from the top), as an expression for the page.
const treeNode = (panel, names) =>
  `(() => { let f = ${panel}.tree.rootFolder; for (const n of ${JSON.stringify(names)}) f = f && Object.values(f.entries || {}).find((e) => e.name === n); return f || null; })()`;

// A folder of a panel's tree expanded (or collapsed, with `open` false) by a click on its
// plus (or minus) box, as a person does it, once its rows show. A click flips the folder at
// once, and the panel draws it again when its parts arrive, from the expanded state it keeps
// for each path: the flip does not always hold, so the click is made again until it does.
async function toggleRow(c, panel, names, open = true) {
  const node = treeNode(panel, names);
  const there = () =>
    c.evaluate(
      `(() => { const f = ${node}; return !!f && f.isCollapsed === ${!open} && (${!open} || Object.keys(f.entries || {}).length > 0); })()`,
    );
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await there()) && (await sleep(500), await there())) {
      await parkMouse(c);
      await frames(c);
      return;
    }
    const at = await c.evaluate(`(() => {
  const d = ${node}?.innerDiv?.querySelector(".treeNodeIcon");
  const r = d?.getBoundingClientRect();
  return r && r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
})()`);
    if (!at) throw new Error(`the ${panel} has no row ${names.join(" > ")}`);
    await clickAt(c, at.x, at.y);
    await waitFor(c, there, { timeout: 3000, interval: 50 });
  }
  throw new Error(`four clicks did not ${open ? "expand" : "collapse"} ${names.join(" > ")}`);
}

// A line typed into the DEBUG CONSOLE's input row and entered, once the console shows the
// time it took. The text is put in the row whole: a space typed while the row's completion
// list is open accepts the list's first entry.
async function consoleRun(c, line) {
  const taken = async () => ((await consoleText(c)).match(/\(time taken: /g) || []).length;
  const before = await taken();
  await c.evaluate(`(() => { const i = debugConsoleEntry; i.focus(); i.value = ${JSON.stringify(line)}; })()`);
  await pressKey(c, "Enter");
  if (!(await waitFor(c, async () => (await taken()) > before, { timeout: 15000, interval: 100 }))) {
    throw new Error(`the console never finished ${JSON.stringify(line)}`);
  }
  await frames(c);
}

// Inventory paused at its loop line on the loop's first pass, with a second breakpoint on the
// function's last line: the editor, and CALL STACK and VARIABLES under it.
const debugPausedLineShot = {
  out: DEBUG_IMAGE("Paused_Line"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      return await atSize(c, 1100, 700, async () => {
        await useLayout(c, STOP_LAYOUT);
        await pausedInTotal(c, { also: "Total = subtotal" });
        await scrollToLine(c, "Public Function Total");
        await fixObjectAddresses(c);
        await frames(c);
        const ed = await panelBox(c, "EDITOR 1");
        const vars = await panelBox(c, "VARIABLES");
        if (!ed || !vars) throw new Error("the editor or VARIABLES is not in the layout");
        const area = { x: 0, y: ed.y, width: 1100, height: vars.y + vars.height - ed.y };
        return capture(c, "Paused_Line", snapOut(area, 1100, 700), { away: () => parkMouse(c) });
      });
    } finally {
      await debugReset(c);
    }
  },
};

// The toolbar's run and step buttons while Inventory is paused, cut out on the toolbar's own
// ground (its other controls left out), each button that works named by a label below, the
// labels in a column at the right, the rightmost button's highest, so that no arrow crosses
// another.
const RUN_BUTTONS = ["playIcon", "pauseIcon", "stopIcon", "debugStepOverIcon", "debugStepIntoIcon", "debugStepOutIcon"];
const debugToolbarPausedShot = {
  out: DEBUG_IMAGE("Toolbar_Paused"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      await pausedInTotal(c);
      const bar = await toolbarRect(c);
      const ground = await groundOf(c, "#playIcon");
      if (!ground) throw new Error("the toolbar has no background colour");
      const ids = ["debugStepOutIcon", "debugStepIntoIcon", "debugStepOverIcon", "stopIcon", "playIcon"];
      const names = ["Step Out", "Step Into", "Step Over", "Stop", "Continue"];
      const boxes = [];
      for (const id of ids) {
        const r = await rectOf(c, `#${id}`);
        if (!r) throw new Error(`the toolbar has no #${id}`);
        boxes.push(r);
      }
      const live = await c.evaluate(
        `${JSON.stringify(ids)}.every((id) => !document.getElementById(id).classList.contains("disabledCommand")) && document.getElementById("pauseIcon").classList.contains("disabledCommand")`,
      );
      if (!live) throw new Error("the toolbar's buttons are not as they are at a stop");
      const right = boxes[0].x + boxes[0].width + 28;
      const below = bar.y + bar.height;
      const annotate = ids.flatMap((id, i) => {
        const y = below + 22 + 26 * i;
        return [
          { type: "label", text: names[i], on: POINT(right, y), side: "right", gap: 0 },
          { type: "arrow", from: POINT(right - 4, y), to: { css: `#${id}` }, elbow: true },
        ];
      });
      const left = boxes[4].x - 12;
      const area = { x: left, y: bar.y, width: right - left, height: bar.height };
      return await annotatedClip(c, "Toolbar_Paused", area, annotate, {
        keep: [...RUN_BUTTONS.map((id) => `#${id}`), `#${LAYER_ID}`],
        solid: ground,
      });
    } finally {
      await debugReset(c);
    }
  },
};

// The status bar's box for a program that the program started (Checks' PingLater, a ping with
// no window, typed into the console with nothing running), its menu open above it: the status
// bar from a little left of the box to a little right of it, cut out on the window's ground. The box
// names the process id, which changes from run to run: it is set in the page to PROCESS_ID.
// The ping is ended with the menu's Terminate, or by its id if the box has gone.
const PROCESS_BOX = "#runningProcessesContainer > .runningProcessOuter";
const PROCESS_ID = "10432";
const debugProcessBoxShot = {
  out: DEBUG_IMAGE("Process_Box"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    let pid = null;
    try {
      await consoleRun(c, "PingLater");
      if (!(await waitFor(c, () => rectOf(c, PROCESS_BOX), { timeout: 15000, interval: 100 }))) {
        throw new Error("PingLater put no PROCESS box in the status bar");
      }
      pid = Number((await consoleText(c)).match(/\[SHELL\] process (\d+) started/)?.[1]) || null;
      await c.evaluate(
        `document.querySelector(${JSON.stringify(`${PROCESS_BOX} .runningProcess`)}).textContent = "PROCESS ${PROCESS_ID}: RUNNING"`,
      );
      await frames(c);
      const box = await rectOf(c, PROCESS_BOX);
      await clickAt(c, box.x + box.width / 2, box.y + box.height / 2);
      if (!(await menuOpened(c))) throw new Error("a click on the PROCESS box opened no menu");
      const menu = await rectOf(c, "#contextMenu");
      const bar = await rectOf(c, "#rootStatusBar");
      const ground = await c.evaluate("getComputedStyle(document.body).backgroundColor");
      const left = Math.min(box.x, menu.x) - 24;
      const top = menu.y - 12;
      const right = Math.max(box.x + box.width, menu.x + menu.width) + 160;
      const area = { x: left, y: top, width: right - left, height: bar.y + bar.height - top };
      return await capture(c, "Process_Box", snapOut(area), {
        keep: ["#rootStatusBar", "#contextMenu"],
        solid: ground,
        away: () => parkMouse(c),
      });
    } finally {
      await endPing(c, pid);
      await debugReset(c);
    }
  },
};

// The ping PingLater started ended: with Terminate on its box's menu while the box is there,
// else by its process id.
async function endPing(c, pid) {
  await closeMenus(c);
  const box = await rectOf(c, PROCESS_BOX);
  if (box) {
    await clickAt(c, box.x + box.width / 2, box.y + box.height / 2);
    if (await menuOpened(c)) {
      const t = (await menuItems(c)).find((i) => i.text === "Terminate");
      if (t) await clickAt(c, t.x + t.width / 2, t.y + t.height / 2);
    }
    await waitFor(c, async () => !(await rectOf(c, PROCESS_BOX)), { timeout: 15000, interval: 100 });
    await closeMenus(c);
  }
  if (pid) killTree(pid);
}

// VARIABLES floated on its own, `width` by `height`.
const floatVariables = (c, width = 420, height = 214) => floatPanel(c, "VARIABLES", { width, height });

// Main paused on its last line, VARIABLES floated with the user-defined type `first` expanded.
const debugVariablesExpandedShot = {
  out: DEBUG_IMAGE("Variables_Expanded"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      await pausedInMain(c);
      await toggleRow(c, "variablesPanel", ["Locals", "first"]);
      const box = await floatVariables(c);
      await fixObjectAddresses(c);
      await frames(c);
      return await capture(c, "Variables_Expanded", snapOut(box), { away: () => parkMouse(c) });
    } finally {
      if (await c.evaluate(`${treeNode("variablesPanel", ["Locals", "first"])}?.isCollapsed === false`)) {
        await toggleRow(c, "variablesPanel", ["Locals", "first"], false);
      }
      await unfloatPanel(c, "VARIABLES");
      await debugReset(c);
    }
  },
};

// Total paused on the loop's second pass: VARIABLES floated, `subtotal`'s value double-clicked
// and its text box open (`edit`); or VARIABLES docked at the editor's right, the mouse resting
// on `subtotal`'s row and its tooltip shown, the top of the panel and the tooltip cut out on
// the panel's ground (a floating panel is drawn over the tooltip). The tooltip names the
// value's address, which changes from run to run: it is set in the page to POINTER_TEXT.
const POINTER_TEXT = "(&H0019F3A4)";
const TIP_MARK = "data-tb-shot-tip";
const PANEL_MARK = "data-tb-shot-panel";
const TIP_LAYOUT = {
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
        { id: "VARIABLES", variableSize: false, size: "33%" },
        { id: "EDITOR", variableSize: true, size: "0%" },
      ],
    },
  ],
};
function variablesRowShot(name, { edit }) {
  return {
    out: DEBUG_IMAGE(name),
    setup: "debugging",
    async take({ c }) {
      await debugReset(c);
      try {
        await pausedInTotal(c, { pass: 2 });
        if (!edit) await useLayout(c, TIP_LAYOUT);
        await fixObjectAddresses(c);
        let box;
        if (edit) box = await floatVariables(c, 400, 236);
        else {
          const panel = await panelBox(c, "VARIABLES");
          if (!panel) throw new Error("VARIABLES is not in the layout");
          box = { ...panel, height: 250 };
          await c.evaluate(
            `[...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "VARIABLES").closest(".toolWindowContainer").setAttribute(${JSON.stringify(PANEL_MARK)}, "")`,
          );
        }
        const row = `${treeNode("variablesPanel", ["Locals", "subtotal"])}?.innerDiv`;
        const at = await c.evaluate(`(() => {
  const v = ${row}?.querySelector(".variableValue")?.getBoundingClientRect();
  const n = ${row}?.querySelector(".variableName")?.getBoundingClientRect();
  return v && n ? { value: { x: v.x + v.width / 2, y: v.y + v.height / 2 }, name: { x: n.x + n.width / 2, y: n.y + n.height / 2 } } : null;
})()`);
        if (!at) throw new Error("VARIABLES has no row for subtotal");
        if (edit) {
          // the first click of the two draws the row again, which can lose the double-click:
          // it is made again until the box opens
          let open = false;
          for (let attempt = 0; attempt < 3 && !open; attempt++) {
            await clickAt(c, at.value.x, at.value.y);
            await clickAt(c, at.value.x, at.value.y, { clickCount: 2 });
            open = await waitFor(
              c,
              () =>
                c.evaluate(
                  `document.activeElement?.tagName === "INPUT" && !!document.activeElement.closest(${JSON.stringify(panelSel("VARIABLES"))})`,
                ),
              { timeout: 3000, interval: 50 },
            );
          }
          if (!open) throw new Error("a double-click on subtotal's value opened no text box");
          await fixObjectAddresses(c);
          await frames(c);
          return await capture(c, name, snapOut(box), { away: () => parkMouse(c) });
        }
        await mouseMove(c, at.name.x - 4, at.name.y);
        await mouseMove(c, at.name.x, at.name.y);
        // The tooltip is laid out, hidden, as soon as the mouse rests, and placed again when it
        // is shown (class visibleTooltip) about a second later, then fades in: its box once it
        // is shown and its fade has ended, else null.
        const tipBox = () =>
          c.evaluate(`(() => {
  const t = document.getElementById("hoverTooltip");
  if (!t?.classList.contains("visibleTooltip") || t.getAnimations({ subtree: true }).length) return null;
  t.setAttribute(${JSON.stringify(TIP_MARK)}, "");
  const walk = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) n.nodeValue = n.nodeValue.replace(/\\(&H[0-9A-F]+\\)/, ${JSON.stringify(POINTER_TEXT)});
  const r = t.getBoundingClientRect();
  return r.width ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);
        if (!(await waitFor(c, tipBox, { timeout: 8000, interval: 100 }))) {
          throw new Error("resting on subtotal's row showed no tooltip");
        }
        const shown = await settledBox(c, tipBox);
        const ground = await groundOf(c, `[${PANEL_MARK}] .sectionBody`);
        const png = await capture(c, name, snapOut(grow(union(box, shown), 8)), {
          keep: [`[${PANEL_MARK}]`, `[${TIP_MARK}]`],
          solid: ground,
        });
        const still = await tipBox();
        if (JSON.stringify(still) !== JSON.stringify(shown)) {
          throw new Error(
            `the tooltip moved during the capture: ${JSON.stringify(shown)}, then ${JSON.stringify(still)}`,
          );
        }
        return png;
      } finally {
        await pressKey(c, "Escape");
        await c.evaluate(`(() => {
  document.querySelector("[${TIP_MARK}]")?.removeAttribute(${JSON.stringify(TIP_MARK)});
  document.querySelector("[${PANEL_MARK}]")?.removeAttribute(${JSON.stringify(PANEL_MARK)});
})()`);
        if (edit) await unfloatPanel(c, "VARIABLES");
        await debugReset(c);
      }
    },
  };
}

// WATCHES floated with four watches, one an expression the compiler refuses: while Total is
// paused on the loop's second pass, or (`ended`) once the program has been ended there.
const WATCHES = ["items(i).Name", "items(i).Quantity", "subtotal", "subtotal *"];
function watchesShot(name, { ended }) {
  return {
    out: DEBUG_IMAGE(name),
    setup: "debugging",
    async take({ c }) {
      await debugReset(c);
      try {
        await pausedInTotal(c, {
          pass: 2,
          before: async (c) => {
            for (const w of WATCHES) await addWatch(c, w);
          },
        });
        const evaluated = await waitFor(
          c,
          async () => {
            const t = await watchesText(c);
            return t.includes("(compile error") && t.includes('"Gadget"') && t;
          },
          { timeout: 10000, interval: 100 },
        );
        if (!evaluated) throw new Error(`the watches were never evaluated: ${JSON.stringify(await watchesText(c))}`);
        if (ended) {
          await stopRun(c);
          const gone = await waitFor(
            c,
            async () => ((await watchesText(c)).match(/not available/g) || []).length === WATCHES.length,
            { timeout: 10000, interval: 100 },
          );
          if (!gone)
            throw new Error(`the watches did not all read not available: ${JSON.stringify(await watchesText(c))}`);
        }
        const box = await floatPanel(c, "WATCHES", { width: 520, height: 128 });
        return await capture(c, name, snapOut(box), { away: () => parkMouse(c) });
      } finally {
        await unfloatPanel(c, "WATCHES");
        await debugReset(c);
      }
    },
  };
}

// Total paused on the loop's first pass, Main's row of CALL STACK clicked: MainModule's line
// highlighted with no arrow, VARIABLES showing Main's variables.
const debugCallStackFramesShot = {
  out: DEBUG_IMAGE("CallStack_Frames"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      return await atSize(c, 1100, 700, async () => {
        await useLayout(c, STOP_LAYOUT);
        await pausedInTotal(c);
        const at = await c.evaluate(`(() => {
  for (const t of Object.values(callStackPanel.tree.rootFolder.entries)) {
    for (const f of Object.values(t.entries || {})) {
      const d = f.innerDiv;
      if (d && /^Main\\n/.test(d.innerText)) { const r = d.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }
    }
  }
  return null;
})()`);
        if (!at) throw new Error("CALL STACK has no row for Main");
        await clickAt(c, at.x, at.y);
        const moved = await waitFor(
          c,
          async () =>
            (await c.evaluate(`editor.getModel().getLinesContent().some((l) => l.includes("Public Sub Main"))`)) &&
            (await treeValue(c, "variablesPanel", ["Locals", "first"])) !== null,
          { timeout: 10000, interval: 100 },
        );
        if (!moved) throw new Error("a click on Main in CALL STACK did not show Main");
        await c.evaluate("editor.setScrollTop(0)");
        await parkMouse(c);
        await fixObjectAddresses(c);
        await frames(c);
        const ed = await panelBox(c, "EDITOR 1");
        const vars = await panelBox(c, "VARIABLES");
        if (!ed || !vars) throw new Error("the editor or VARIABLES is not in the layout");
        const area = { x: 0, y: ed.y, width: 1100, height: vars.y + vars.height - ed.y };
        return capture(c, "CallStack_Frames", snapOut(area, 1100, 700), { away: () => parkMouse(c) });
      });
    } finally {
      await debugReset(c);
    }
  },
};

// Total paused on the loop's second pass, the mouse resting on the loop line: on `subtotal`,
// or (`selection`) inside `items(i).Quantity * price`, selected. The picture is the popup and
// the line, from the editor's left.
function debugHoverShot(name, { selection }) {
  return {
    out: DEBUG_IMAGE(name),
    setup: "debugging",
    async take({ c }) {
      await debugReset(c);
      try {
        await pausedInTotal(c, { pass: 2 });
        await scrollToLine(c, "Public Function Total");
        const at = await codePlace(c, LOOP_LINE);
        let col = at.column + 3;
        let want = "subtotal";
        if (selection) {
          const text = "items(i).Quantity * price";
          const from = at.column + LOOP_LINE.indexOf(text);
          await c.evaluate(
            `editor.setSelection(new monaco.Selection(${at.line}, ${from}, ${at.line}, ${from + text.length}))`,
          );
          col = from + 10;
          want = text;
        }
        let shown = false;
        for (let attempt = 0; attempt < 3 && !shown; attempt++) {
          await restMouse(c, at.line, col);
          shown = await waitFor(c, async () => (await hoverText(c))?.includes(`${want}:`) && true, { timeout: 6000 });
        }
        if (!shown) throw new Error(`the hover showed no value of ${want}: ${await hoverText(c)}`);
        const popup = await settledBox(c, () =>
          c.evaluate(`(() => {
  const r = [...document.querySelectorAll(".monaco-hover")].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 0).getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`),
        );
        const lineBox = await linesBox(c, at.line, at.line);
        const ed = await editorBox(c);
        const top = Math.min(popup.y, lineBox.y) - 8;
        const bottom = Math.max(popup.y + popup.height, lineBox.y + lineBox.height) + 8;
        const right = Math.max(popup.x + popup.width, (await pointOf(c, at.line, at.column + LOOP_LINE.length)).x);
        const area = { x: ed.x, y: top, width: right + 12 - ed.x, height: bottom - top };
        // the mouse stays on the line: the popup goes when it leaves
        return await capture(c, name, snapOut(area));
      } finally {
        await mouseAway(c);
        await debugReset(c);
      }
    },
  };
}

// The DEBUG CONSOLE floated on its own, `width` (560) by `height`.
const floatConsole = (c, height, width = 560) => floatPanel(c, "DEBUG CONSOLE", { width, height });

// Total paused on the loop's second pass, two lines entered in the DEBUG CONSOLE: the value of
// subtotal printed, then a new value given to it.
const debugConsoleRunShot = {
  out: DEBUG_IMAGE("Console_Run"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      await pausedInTotal(c, { pass: 2 });
      await consoleRun(c, "? subtotal");
      await consoleRun(c, "subtotal = 5");
      const box = await floatConsole(c, 236);
      await fixConsoleTimes(c, "0.0001023s");
      await frames(c);
      return await capture(c, "Console_Run", snapOut(box), { away: () => parkMouse(c) });
    } finally {
      await unfloatPanel(c, "DEBUG CONSOLE");
      await debugReset(c);
    }
  },
};

// The DEBUG CONSOLE floated after Main has run to its end, its menu opened with a right-click
// right of its first line, the menu inside the panel and clear of the lines. (A cut-out of the console would show
// the line it measures its text with, which it hides.)
const debugConsoleMenuShot = {
  out: DEBUG_IMAGE("Console_Menu"),
  setup: "debugging",
  async take({ c }) {
    await debugReset(c);
    try {
      // the run can be over before the IDE is seen running: its last line is the time it took
      await command(c, "tbDebug_StartOrContinue");
      const ended = await waitFor(
        c,
        async () => (await consoleText(c)).includes("(time taken: ") && !(await codeExecuting(c)),
        { timeout: 60000, interval: 100 },
      );
      if (!ended) throw new Error("Main did not run to its end");
      const box = await floatConsole(c, 180, 640);
      await fixConsoleTimes(c, "0.0021175s");
      await frames(c);
      await rightClickAt(c, box.x + 410, box.y + 34);
      if (!(await menuOpened(c))) throw new Error("a right-click in the DEBUG CONSOLE opened no menu");
      const menu = await rectOf(c, "#contextMenu");
      if (union(box, menu).width !== box.width || union(box, menu).height !== box.height) {
        throw new Error("the menu is not inside the DEBUG CONSOLE");
      }
      return await capture(c, "Console_Menu", snapOut(box), { away: () => parkMouse(c) });
    } finally {
      await closeMenus(c);
      await unfloatPanel(c, "DEBUG CONSOLE");
      await debugReset(c);
    }
  },
};

// The Debug and Run menus as they are while a program is paused and while one runs: Total
// paused, the caret in the code; Checks' WaitAWhile run with F6, a loop of a minute at most.
async function pausedForMenu(c) {
  await debugReset(c);
  await pausedInTotal(c);
  const top = (await codePlace(c, "Public Function Total")).line;
  await caretOn(c, LOOP_LINE, { offset: 4, top });
  if (!(await c.evaluate("editor.hasTextFocus()"))) throw new Error("the code editor does not have the focus");
}
async function runningForMenu(c) {
  await debugReset(c);
  await openFile(c, CHAPTER_FILE("Checks.twin"));
  await caretOn(c, "started = Timer", { offset: 4 });
  await command(c, "tbDebug_RunOrPreview");
  if (!(await waitFor(c, () => codeExecuting(c), { timeout: 30000, interval: 100 }))) {
    throw new Error("F6 never started WaitAWhile");
  }
  await frames(c);
}

const debuggingShots = [
  debugPausedPanelsShot,
  debugErrorPanelShot,
  debugBreakpointGlyphsShot,
  debugPausedLineShot,
  debugToolbarPausedShot,
  debugProcessBoxShot,
  debugVariablesExpandedShot,
  variablesRowShot("Variables_Edit", { edit: true }),
  variablesRowShot("Variables_Tooltip", { edit: false }),
  watchesShot("Watches_Values", { ended: false }),
  watchesShot("Watches_NotAvailable", { ended: true }),
  debugCallStackFramesShot,
  debugHoverShot("Hover_Paused", { selection: false }),
  debugHoverShot("Hover_Selection", { selection: true }),
  debugConsoleRunShot,
  debugConsoleMenuShot,
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

// A badge's tooltip is its plain HTML `title`, which WebView2 draws as a native Windows tooltip
// on a real mouse hover and in no other way: no capture holds it, and no mouse the tool can
// move reaches a private desktop (WIP.Screenshots.md, Special IDE states). So it is drawn in the page, as
// a replica of Windows 10's tooltip holding the badge's own title, read from the IDE: the
// owner's decision (2026-10-10). The look is calibrated against the pictures taken by hand in
// January: Segoe UI 9 pt (12 px) in #242424 on white, a 1 px #242424 border, 16 px lines, 7 px
// of padding at the sides, 3 above and 4 below, the box a whole number of pixels wide. It does
// not follow the IDE's theme, so the Light pass takes the dark pass's picture and keeps no file
// of its own. It is placed as Windows places a tooltip by the cursor, which is taken to be at
// the badge's middle: its left edge at the cursor, 21 px below it, or above the badge when it
// would not fit below (the status bar is at the bottom of the window), and inside the window.
const TOOLTIP_ID = "tbShotTooltip";
const TOOLTIP_CSS =
  "all:initial;position:fixed;z-index:2147483647;pointer-events:none;box-sizing:border-box;" +
  "border:1px solid #242424;background:#fff;color:#242424;white-space:pre-line;" +
  "font:12px/16px 'Segoe UI',sans-serif;padding:3px 7px 4px 7px;display:block";

// Puts the replica of the tooltip of the element `sel` into the page; returns its text and
// its rectangle in CSS pixels. Throws when the element has no title.
async function tooltipOn(c, sel) {
  const r = await c.evaluate(`(() => {
    const badge = document.querySelector(${JSON.stringify(sel)});
    if (!badge) return { error: "no such element" };
    const text = badge.title;
    if (!text) return { error: "the element has no title" };
    document.getElementById(${JSON.stringify(TOOLTIP_ID)})?.remove();
    const e = document.createElement("div");
    e.id = ${JSON.stringify(TOOLTIP_ID)};
    e.style.cssText = ${JSON.stringify(TOOLTIP_CSS)};
    e.textContent = text;
    document.body.appendChild(e);
    e.style.left = "0px";
    e.style.top = "0px";
    e.style.width = Math.ceil(e.getBoundingClientRect().width) + "px";
    const t = e.getBoundingClientRect();
    const b = badge.getBoundingClientRect();
    const cursor = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    const left = Math.max(0, Math.min(window.innerWidth - t.width, Math.round(cursor.x)));
    const below = Math.round(cursor.y) + 21;
    const top = below + t.height <= window.innerHeight ? below : Math.round(b.y) - t.height - 2;
    e.style.left = left + "px";
    e.style.top = top + "px";
    const f = e.getBoundingClientRect();
    return { text, rect: { x: f.x, y: f.y, width: f.width, height: f.height } };
  })()`);
  if (r.error) throw new Error(`the tooltip of ${sel}: ${r.error}`);
  return r;
}

const tooltipOff = (c) => c.evaluate(`document.getElementById(${JSON.stringify(TOOLTIP_ID)})?.remove()`);

// The picture of the replica alone, as the January ones are.
async function tooltipShotTake(c, name, sel) {
  const { text, rect } = await tooltipOn(c, sel);
  try {
    say(c.shot.name, `  the tooltip text: ${JSON.stringify(text)}`);
    return await capture(c, name, snapOut(rect), { away: () => parkMouse(c) });
  } finally {
    await tooltipOff(c);
  }
}

// The status bar's services badge once the compiler's services have all answered.
const servicesBadgeReady = async (c) => {
  await resetUi(c);
  const ready = await waitFor(
    c,
    () =>
      c.evaluate(
        `(() => { const e = document.getElementById("compilerStatusOuter"); return !!e && e.classList.contains("servicesOK") && e.innerText.includes("OPERATIONAL"); })()`,
      ),
    { timeout: 60000, interval: 250 },
  );
  if (!ready) throw new Error("the services badge never said OPERATIONAL");
};

const servicesShot = {
  out: "IDE/Images/Services_Operational.png",
  setup: "project",
  async take({ c }) {
    await servicesBadgeReady(c);
    return capture(c, "Services_Operational", snapOut(await rectOf(c, "#compilerStatusOuter")), {
      away: () => parkMouse(c),
    });
  },
};

// The tooltip of that badge, the four services each OPERATIONAL (a replica, see TOOLTIP_CSS).
const servicesTooltipShot = {
  out: "IDE/Images/Services_Operational_Tooltip.png",
  setup: "project",
  async take({ c }) {
    await servicesBadgeReady(c);
    return tooltipShotTake(c, "Services_Operational_Tooltip", "#compilerStatusOuter");
  },
};

// The services badge with no compiler connected, as the IDE starts with no project.
const unavailableBadgeReady = async (c) => {
  await resetUi(c);
  const unavailable = await c.evaluate(
    `!compilerStatusOuter.classList.contains("servicesOK") && !compilerStatusOuter.classList.contains("servicesPARTIAL") && /UNAVAILABLE/.test(compilerStatus.innerText)`,
  );
  if (!unavailable) throw new Error("the services badge does not say UNAVAILABLE");
};

// Its tooltip, each of the four services Not initialized (they read Disconnected only for 0.1 s
// between one compiler and the next), is the badge's own title, drawn as a replica.
const unavailableTooltipShot = {
  out: "IDE/Images/Services_Unavailable_Tooltip.png",
  setup: "no-project",
  async take({ c }) {
    await unavailableBadgeReady(c);
    return tooltipShotTake(c, "Services_Unavailable_Tooltip", "#compilerStatusOuter");
  },
};

const unavailableShot = {
  out: "IDE/Images/Services_Unavailable.png",
  setup: "no-project",
  async take({ c }) {
    await unavailableBadgeReady(c);
    say(c.shot.name, `  the badge's title: ${JSON.stringify(await c.evaluate("compilerStatusOuter.title"))}`);
    return capture(c, "Services_Unavailable", snapOut(await rectOf(c, "#compilerStatusOuter")), {
      away: () => parkMouse(c),
    });
  },
};

// The licence badge of a compiler started on no licence key (setup community).
const communityShot = {
  out: "IDE/Images/Licence_CommunityEdition.png",
  setup: "community",
  async take({ c }) {
    await resetUi(c);
    const text = await c.evaluate("compilerLicence.innerText");
    if (text !== "COMMUNITY EDITION") throw new Error(`the licence badge says ${JSON.stringify(text)}`);
    return capture(c, "Licence_CommunityEdition", snapOut(await rectOf(c, "#compilerLicenceOuter")), {
      away: () => parkMouse(c),
    });
  },
};

// The services badge while a compiler starts: the IDE draws LIMITED from the moment the new
// compiler's own connection is up until the page has connected the other three, one after
// another (FS, then LSP, then the debugger, once the compiler has loaded the project), about
// 0.6 s, too short to capture. A closed connection is no route to a longer one: the compiler
// ends within 0.1 s of losing any of its four (and the browser takes a minute to close one),
// and the IDE starts another, so LIMITED shows for as long again. So the compiler is
// restarted with the toolbar's button, and the page's first call of the three, fs.connect, is
// held until the picture is taken: the IDE stays where its start-up is, the compiler up and the
// other three not yet connected, and draws LIMITED itself. The call is then made as the IDE
// made it, the other two follow, and the badge goes back to OPERATIONAL.
const HOLD_FS_CONNECT = `(() => {
  if (window.tbFsConnect) return;
  const own = Object.prototype.hasOwnProperty.call(fs, "connect");
  const connect = fs.connect;
  window.tbFsConnect = { own, connect, held: null };
  fs.connect = function (...args) {
    window.tbFsConnect.held = () => connect.apply(fs, args);
  };
})()`;
const RELEASE_FS_CONNECT = `(() => {
  const h = window.tbFsConnect;
  if (!h) return false;
  delete window.tbFsConnect;
  if (h.own) fs.connect = h.connect;
  else delete fs.connect;
  if (h.held) h.held();
  return !!h.held;
})()`;
const servicesAre = (c, cls) => c.evaluate(`compilerStatusOuter.classList.contains(${JSON.stringify(cls)})`);
const limitedShot = {
  out: "IDE/Images/Services_Limited.png",
  setup: "community",
  async take({ c }) {
    await resetUi(c);
    if (!(await waitFor(c, () => servicesAre(c, "servicesOK"), { timeout: 60000, interval: 250 }))) {
      throw new Error("the services badge never said OPERATIONAL before the restart");
    }
    await c.evaluate(HOLD_FS_CONNECT);
    try {
      await click(c, "restartIcon");
      const held = await waitFor(
        c,
        () =>
          c.evaluate(
            `!!window.tbFsConnect?.held && compilerStatusOuter.classList.contains("servicesPARTIAL") && /LIMITED/.test(compilerStatus.innerText)`,
          ),
        { timeout: 60000, interval: 100 },
      );
      if (!held) throw new Error("the restarted compiler never asked for its FS connection, with the badge LIMITED");
      // The restart's line names the project's folder, under the user's, and the console's
      // Clear does nothing until the compiler is connected: the name is replaced in the
      // console's text, in the page only, as nameUserAsUser does in a dialog. The picture
      // is of the badge, which holds no name.
      await nameUserAsUserIn(c, ".debugConsoleOuter");
      say(c.shot.name, `  the badge's title: ${JSON.stringify(await c.evaluate("compilerStatusOuter.title"))}`);
      return await capture(c, "Services_Limited", snapOut(await rectOf(c, "#compilerStatusOuter")), {
        away: () => parkMouse(c),
      });
    } finally {
      await c.evaluate(RELEASE_FS_CONNECT);
      if (!(await waitFor(c, () => servicesAre(c, "servicesOK"), { timeout: 60000, interval: 250 }))) {
        complain(c.shot.name, "the services badge did not go back to OPERATIONAL after the restart");
      }
      await clearUserFromConsole(c);
    }
  },
};

// Resolves once every CSS background image in the top dialog is decoded: the VIP Gold logos
// are backgrounds, which dialogStill's wait for <img> elements does not cover.
const dialogBackgrounds = (c) =>
  c.evaluate(
    `(async () => {
  const root = ${TOP_MODAL};
  if (!root) return 0;
  const urls = new Set();
  for (const e of [root, ...root.querySelectorAll("*")]) {
    for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]*)"?\\)/g)) urls.add(m[1]);
  }
  await Promise.all([...urls].map((u) => { const i = new Image(); i.src = u; return i.decode().catch(() => {}); }));
  return urls.size;
})()`,
    { awaitPromise: true },
  );

// The splash: the IDE's own dialog, which its start-up shows with showSplashWindow and closes
// 2.5 s later with the New / Open Project dialog in its place. The page is not yet at its
// fixed size by then, so the tool calls showSplashWindow again, as start-up does, and holds the
// 2.5 s close (the one timer of that length the call starts) until the picture is taken; the
// close then runs as the IDE wrote it, and New / Open Project is cancelled. The sponsors'
// logos come out scaled one of two ways (one of them about 8,800 pixels apart from the other),
// by what has drawn them before in the same IDE: in the no-project setup by whether the
// start-up splash was drawn before or after the page was set to 2x, and in the project setup
// About's light picture changed with the splash taken before it; and the New / Open Project
// dialog its close shows leaves the status bar's badges a pixel shorter in the pictures after
// it. So it has a setup of its own, the demo open, whose IDE draws the logos nowhere else and
// showed no splash at start-up.
const splashShot = {
  out: dialogOut("IDE", "Splash_Screen"),
  setup: "splash",
  async take({ c }) {
    await resetUi(c);
    const shown = await c.evaluate(`(() => {
  if (!window.chrome?.webview || inProcessPortNumber !== 0) return false;
  const real = window.setTimeout;
  window.setTimeout = (fn, ms, ...rest) => {
    if (ms === 2500 && !window.tbSplashClose) {
      window.tbSplashClose = fn;
      return 0;
    }
    return real(fn, ms, ...rest);
  };
  try {
    showSplashWindow();
  } finally {
    window.setTimeout = real;
  }
  return typeof window.tbSplashClose === "function";
})()`);
    if (!shown) throw new Error("showSplashWindow showed no splash");
    try {
      if (!(await waitModal(c, "Loading"))) throw new Error("the splash did not open");
      await dialogStill(c);
      await dialogBackgrounds(c);
      return await dialogShot(c, "Splash_Screen");
    } finally {
      await c.evaluate(`(() => { const close = window.tbSplashClose; delete window.tbSplashClose; close?.(); })()`);
      if (await waitModal(c, "New / Open", { timeout: 10000 })) await closeModal(c, "Cancel");
      await resetUi(c);
    }
  },
};

// ---------------------------------------------------------------- pictures of a running program

// The windows of a running program (setup programs): test/shots/programs, ShotPrograms, a
// Standard EXE whose command line names the form it shows. The project is opened in the
// setup's IDE and built there; each picture starts the exe on a private desktop of its own,
// as a person starts a program, takes its window with PrintWindow (captureWindow in
// lib/tb-ide.mjs) and ends it. The program and the tool take turns through files in a folder
// (TB_SHOT_SIGNALS): the program writes "shown" once its form is drawn, a form that shows
// anchoring is made larger on "grow" and writes "grown", and "end" ends it. The ListView's
// picture is of the program run from the IDE (F5) instead, since Immediate Memory
// Invalidation is the debugger's: the fixture's Settings give the run its command line,
// "listview", and turn the setting on.
//
// A program's window is drawn as the system draws it, not by the IDE, so it is taken once: the
// shot is `once`, taken in the dark pass only. Its pixels are at the desktop's DPI (144 on a
// display at 150%), not at the page pictures' 2x; the page shows it at its size at 96 DPI
// (`scale`). The capture is cropped to the window's visible frame: the invisible resize
// borders of a Windows 10 frame are left out. A picture of two windows (a form before and
// after it is made larger) has them side by side, their tops level, with a transparent gap.
// The Windows user name: captureWindow returns the texts of the window and its child windows,
// which are searched for it; the text the program draws itself (labels, the ListView's rows,
// a frame's caption) is the fixture's own, which reads nothing from the machine.

const PROGRAMS = path.join(REPO_ROOT, "test", "shots", "programs");
// The class of a twinBASIC form's window: ThunderRT6FormDC in an exe, ThunderFormDC run from
// the IDE (whose own window is a ThunderForm).
const FORM_CLASS = /^Thunder(RT6)?Form(DC)?$/;
// The gap between two windows of one picture, in pixels at 96 DPI.
const WINDOW_GAP = 16;

async function startPrograms(run) {
  run.step = "open";
  run.signals = path.join(run.work, "signals");
  mkdirSync(run.signals, { recursive: true });
  say(run.name, `opening ${path.relative(REPO_ROOT, PROGRAMS)}`);
  return run.lane.open(PROGRAMS, { env: { TB_SHOT_SIGNALS: path.join(run.signals, "ide") } });
}

async function preparePrograms(run) {
  const { c } = run;
  run.step = "shoot";
  const built = await buildProject(c);
  if (!built.ok || !/\.exe$/i.test(built.file ?? "")) {
    throw new Error(`ShotPrograms did not build: ${built.message ?? built.file}`);
  }
  say(run.name, `built ${path.basename(built.file)}`);
  return {
    c,
    exe: built.file,
    signals: run.signals,
    // the programs' own desktop, and the IDE's, where a program run from the IDE shows
    desktop: `tbshoot-programs-${run.ports[0]}`,
    ideDesktop: `tbbuild-${run.ports[0]}`,
  };
}

// Waits for the program's signal `name` in the folder `dir`.
async function signalled(dir, name, { timeout = 30000 } = {}) {
  if (!(await waitFor(null, () => existsSync(path.join(dir, name)), { timeout, interval: 50 }))) {
    throw new Error(`the program never wrote "${name}"`);
  }
}

// The visible form window on `desktop`: the program `pid`'s, or the one titled `title`.
async function formWindow(desktop, { pid = null, title = null, timeout = 15000 } = {}) {
  const found = await waitFor(
    null,
    async () =>
      (await desktopWindows(desktop)).find(
        (w) =>
          w.depth === 0 &&
          w.visible &&
          FORM_CLASS.test(w.class) &&
          (pid === null || w.pid === pid) &&
          (title === null || w.title === title),
      ),
    { timeout, interval: 200 },
  );
  if (!found) throw new Error(`no form window${title ? ` titled ${JSON.stringify(title)}` : ""} on ${desktop}`);
  return found;
}

// The pixels of a picture, `box` [left, top, right, bottom] of them.
function crop({ width, rgba }, [left, top, right, bottom]) {
  const w = right - left;
  const h = bottom - top;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    out.set(rgba.subarray(((top + y) * width + left) * 4, ((top + y) * width + right) * 4), y * w * 4);
  return { width: w, height: h, rgba: out };
}

// One capture of a window, as `captureWindow` writes it to `file`, once two in a row are equal
// (a window being drawn can differ from one to the next); refused when a text of the window
// holds the user name.
async function stableWindow(desktop, hwnd, name, file, flags = 2) {
  let last = null;
  for (let i = 0; i < 8; i++) {
    const info = await captureWindow(desktop, hwnd, file, { flags });
    const named = info.texts.find((t) => t.toLowerCase().includes(USER.toLowerCase()));
    if (named !== undefined)
      throw new Error(`the window of ${name} shows the Windows user name in ${JSON.stringify(named)}`);
    const png = readFileSync(file);
    if (last?.equals(png)) return { info, picture: decodePng(png) };
    last = png;
    await sleep(250);
  }
  throw new Error(`the window of ${name} kept changing: no two captures in a row were equal`);
}

// A window's picture, cropped to its visible frame. A layered window (a form's Opacity and
// TransparencyKey) is given the alpha the system blends it with what is under it: its alpha
// everywhere, and none where its client area has the key colour. PW_RENDERFULLCONTENT draws
// those pixels black, so they are read from a capture of the client area alone (flags 1),
// which draws them in the key colour. The page is then what is under the window.
async function windowPicture(desktop, hwnd, name, file) {
  const { info, picture } = await stableWindow(desktop, hwnd, name, file);
  if (info.layered) {
    const [key, alpha, lwa] = info.layered;
    const { picture: client } = await stableWindow(desktop, hwnd, name, file.replace(/\.png$/, "-client.png"), 1);
    const [cl, ct, cr, cb] = info.client;
    const k = [key & 255, (key >> 8) & 255, (key >> 16) & 255];
    for (let y = 0; y < picture.height; y++) {
      for (let x = 0; x < picture.width; x++) {
        let a = lwa & 2 ? alpha : 255;
        if (lwa & 1 && x >= cl && x < cr && y >= ct && y < cb) {
          const j = ((y - ct) * client.width + (x - cl)) * 4;
          if (client.rgba[j] === k[0] && client.rgba[j + 1] === k[1] && client.rgba[j + 2] === k[2]) a = 0;
        }
        picture.rgba[(y * picture.width + x) * 4 + 3] = a;
      }
    }
  }
  return { picture: crop(picture, info.frame), dpi: info.dpi };
}

// The pictures of windows side by side, their tops level, WINDOW_GAP apart on a transparent
// ground, as a PNG to be shown at its size at 96 DPI.
function besideEachOther(windows) {
  const { dpi } = windows[0];
  const gap = Math.round((WINDOW_GAP * dpi) / 96);
  const width = windows.reduce((n, w) => n + w.picture.width, 0) + gap * (windows.length - 1);
  const height = Math.max(...windows.map((w) => w.picture.height));
  const rgba = Buffer.alloc(width * height * 4);
  let x0 = 0;
  for (const { picture: p } of windows) {
    for (let y = 0; y < p.height; y++)
      rgba.set(p.rgba.subarray(y * p.width * 4, (y + 1) * p.width * 4), (y * width + x0) * 4);
    x0 += p.width + gap;
  }
  return { png: encodePng({ width, height, rgba }), scale: dpi / 96 };
}

// Starts the program with `scene` on the setup's desktop, waits for its form, runs `fn` with
// its folder of signals and its window, and ends it: by "end", or by its process id when it
// has not ended ten seconds later. A box it opened (an unhandled error opens one) fails the
// picture.
async function withProgram(ctx, scene, fn) {
  const dir = path.join(ctx.signals, scene);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const run = await launchOnDesktop({
    exe: ctx.exe.split("/").join("\\"),
    arg: scene,
    desktop: ctx.desktop,
    env: { ...process.env, TB_SHOT_SIGNALS: dir },
    dialogs: "close",
  });
  let result;
  try {
    await signalled(dir, "shown");
    result = await fn(dir, await formWindow(ctx.desktop, { pid: run.pid }));
  } finally {
    writeFileSync(path.join(dir, "end"), "");
    if (!(await Promise.race([run.exited.then(() => true), sleep(10000).then(() => false)]))) {
      killTree(run.pid);
      run.launcher.kill();
    }
  }
  const { dialogs } = await run.finished;
  if (dialogs.length) {
    throw new Error(`the program opened a box: ${dialogs.map((d) => `${d.title}: ${d.text}`).join("; ")}`);
  }
  return result;
}

// A form of the program, `scene` its command line; with `grow`, the form and then the form
// made larger, side by side.
const programShot = (out, scene, { grow = false } = {}) => ({
  out,
  setup: "programs",
  once: true,
  take: (ctx) =>
    withProgram(ctx, scene, async (dir, w) => {
      const shown = [await windowPicture(ctx.desktop, w.hwnd, scene, path.join(dir, "before.png"))];
      if (grow) {
        writeFileSync(path.join(dir, "grow"), "");
        await signalled(dir, "grown");
        shown.push(await windowPicture(ctx.desktop, w.hwnd, scene, path.join(dir, "after.png")));
      }
      return besideEachOther(shown);
    }),
});

// The ListView whose column headers were given a freed string, run from the IDE with Immediate
// Memory Invalidation on: the IDE's run (F5) of the project, whose command line is "listview".
// Its window is on the IDE's desktop, where the IDE's window has the input; the program draws
// its frame as the active window's (MainModule's Activate).
const listViewShot = {
  out: "Features/Images/021f6cbf-acce-445d-ade7-3fcad0af4927.png",
  setup: "programs",
  once: true,
  async take(ctx) {
    const { c } = ctx;
    const dir = path.join(ctx.signals, "ide");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    await startRun(c);
    try {
      await signalled(dir, "shown", { timeout: 60000 });
      const w = await formWindow(ctx.ideDesktop, { title: "ListView Demo" });
      return besideEachOther([await windowPicture(ctx.ideDesktop, w.hwnd, "listview", path.join(dir, "window.png"))]);
    } finally {
      // the program ends itself on "end"; Stop when it has not ten seconds later
      writeFileSync(path.join(dir, "end"), "");
      if (!(await waitFor(c, async () => !(await codeExecuting(c)), { timeout: 10000, interval: 200 }))) {
        await stopRun(c);
      }
    }
  },
};

const ANCHORS = (name) => `Features/Images/${name}.png`;
const programShots = [
  programShot(ANCHORS("fddbffa9-2b71-47f5-b925-e67fc66b9e5c"), "anchors-all", { grow: true }),
  programShot(ANCHORS("3fa1cf2b-0af5-44ae-ae6a-3c0662f51f57"), "anchors-top-left-bottom", { grow: true }),
  programShot(ANCHORS("0aeb25f6-d864-4ebb-a9f5-bbd7b5d242e8"), "anchors-right-bottom", { grow: true }),
  programShot(ANCHORS("4829696d-788b-40ee-bebd-5afa44477460"), "frame-all", { grow: true }),
  programShot(ANCHORS("bc9f3756-a14b-4ee7-b819-6822497b640a"), "frame-no-bottom", { grow: true }),
  programShot(ANCHORS("599a66ad-31d5-449f-bbf5-00963fe9aa2a"), "dock-bottom"),
  programShot(ANCHORS("80185a8d-2952-415f-bc02-ec3ddea89568"), "dock-multi"),
  programShot(ANCHORS("4ad9c774-b31d-47d3-9963-6d99ac4f37bb"), "multiframe"),
  programShot(ANCHORS("5fc60b7b-4f54-445c-8504-451019b7ec55"), "checkmark"),
  programShot(ANCHORS("85f25aa2-abc8-4d42-8510-078f8ee4a324"), "translucent"),
  listViewShot,
];

// ---- codelens: test/shots/codelens, CodeLensDemo, two modules whose procedures the editor's
// CodeLens bar runs (setup codelens): the editor above the DEBUG CONSOLE, in a layout set in
// the page, the procedure run by a real click on its bar. The console's line times (the
// page's clock for some lines, the compiler's for what the procedure prints) and the time the
// run took change from run to run: they are set in the page once the real ones are shown, as
// the feature map's memory figures are.

const CODELENS = path.join(REPO_ROOT, "test", "shots", "codelens");
const CODELENS_TIME = "16:41:58.204";
const CODELENS_LAYOUT = {
  type: "horizontal",
  variableSize: true,
  size: "0%",
  content: [
    { id: "TOOLBAR", variableSize: false, size: "fit-content" },
    { id: "EDITOR", variableSize: true, size: "0%" },
    { id: "DEBUG CONSOLE", variableSize: false, size: "20%" },
  ],
};

async function startCodeLens(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, CODELENS)}`);
  return run.lane.open(CODELENS);
}

// The text of the DEBUG CONSOLE.
const consoleText = (c) => c.evaluate(`document.querySelector(".debugConsoleOuter")?.innerText ?? ""`);

// The CodeLens bar of `file`, which runs `procedure` (as the bar names it), clicked, and the
// editor down to the end of the file with the DEBUG CONSOLE below it, once the console holds
// each of `lines` ([text, how many times], once by default) and the time taken. `size` is the page's; the picture is `width` wide from
// the editor's left edge.
function codeLensShot(out, file, procedure, lines, { size, width, taken }) {
  return {
    out,
    setup: "codelens",
    async take({ c }) {
      await resetUi(c);
      try {
        return await atSize(c, size.width, size.height, async () => {
          if (!(await c.evaluate(`restorePanelLayout(${JSON.stringify(JSON.stringify(CODELENS_LAYOUT))})`))) {
            throw new Error("the page refused the layout");
          }
          await openFile(c, `/CodeLensDemo/Sources/${file}`);
          const bar = await waitFor(
            c,
            () =>
              c.evaluate(`(() => {
  const w = [...document.querySelectorAll(".codeLensWidget")].find((e) => e.innerText.includes(${JSON.stringify(procedure)}));
  const t = w && [...w.querySelectorAll("*")].reverse().find((e) => e.innerText?.includes(${JSON.stringify(procedure)}));
  const r = (t ?? w)?.getBoundingClientRect();
  return r && r.width ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`),
            { timeout: 30000, interval: 200 },
          );
          if (!bar) throw new Error(`the editor shows no CodeLens bar for ${procedure}`);
          const clear = await rectOf(c, '[title="Clear Debug Console"]');
          if (!clear) throw new Error("the DEBUG CONSOLE has no Clear button");
          await clickAt(c, clear.x + clear.width / 2, clear.y + clear.height / 2);
          if (!(await waitFor(c, () => c.evaluate("debugConsoleContent.dataNodes.length === 0"), { timeout: 5000 }))) {
            throw new Error("the DEBUG CONSOLE was not cleared");
          }
          await clickAt(c, bar.x + Math.min(bar.width / 2, 40), bar.y + bar.height / 2);
          const done = await waitFor(
            c,
            async () => {
              const text = await consoleText(c);
              return /time taken: [\d.]+s/.test(text) && lines.every(([l, n = 1]) => text.split(l).length > n);
            },
            { timeout: 30000, interval: 200 },
          );
          if (!done) throw new Error(`the run of ${procedure} printed ${JSON.stringify(await consoleText(c))}`);
          // each line's time and the time taken, once the real ones are shown
          await fixConsoleTimes(c, taken);
          await parkMouse(c);
          const area = await c.evaluate(`(() => {
  const m = document.querySelector(".monaco-editor .lines-content").closest(".monaco-editor").getBoundingClientRect();
  const dc = [...document.querySelectorAll(".sectionHeaderInner")].find((e) => e.textContent === "DEBUG CONSOLE").closest(".toolWindowContainer").getBoundingClientRect();
  return { x: m.x, y: m.y, width: ${width}, height: dc.bottom - m.y };
})()`);
          return capture(c, path.basename(out, ".png"), snapOut(area, size.width, size.height));
        });
      } finally {
        await closeTabs(c, [], { discard: true });
        await defaultLayout(c);
      }
    },
  };
}

const codeLensShots = [
  codeLensShot(
    "Features/Images/b0724fe2-636d-47db-a8fc-531a585ddaf9.png",
    "Vehicles.twin",
    "Garage.DoHonk",
    [["Executing 'CodeLensDemo.Garage.DoHonk'"], ["HONK!", 2]],
    { size: { width: 680, height: 860 }, width: 530, taken: "0.0000534s" },
  ),
  codeLensShot(
    "Features/Images/351d0147-cad3-4e16-89e5-0a9e43496740.png",
    "MyModule.twin",
    "MyModule.CheckScale",
    [["Executing 'CodeLensDemo.MyModule.CheckScale'"], ["Scale factor: "]],
    { size: { width: 800, height: 880 }, width: 640, taken: "0.0001564s" },
  ),
];

// ---- memory: test/shots/memory, MemoryDemo, whose Sub Main stops with s holding fifteen
// characters (setup memory): the MEMORY 1 pane at the stop, `s` typed into its box and
// entered, which the IDE turns into StrPtr(s). The pane is sized to two rows, which the
// characters and their terminating null fill exactly. The string's address changes from run
// to run: the address column is set in the page once the rows are read, as the CodeLens
// pictures' console times are. The run is started before the pane floats and ended after.

const MEMORY_PROJECT = path.join(REPO_ROOT, "test", "shots", "memory");
const MEMORY_ADDRESSES = ["&H0F423AC8", "&H0F423AD8"];
const MEMORY_TEXT = "H.e.l.l.o. .t.w.i.n.B.A.S.I.C...";

async function startMemory(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, MEMORY_PROJECT)}`);
  return run.lane.open(MEMORY_PROJECT);
}

// The pane's rows as the page shows them: their count, and the text column of each.
const memoryRows = (c) =>
  c.evaluate(`(() => {
  const rows = [...hexEditorPanel.outerDiv.querySelectorAll(".hexedr tbody tr")];
  return { count: rows.length, text: rows.map((r) => [...r.querySelectorAll("td.acell")].map((d) => d.textContent).join("")).join("") };
})()`);

const memoryShot = panelShot("Memory_String", "MEMORY 1", [696, 120], {
  setup: "memory",
  async before(c) {
    await startRun(c);
    if (!(await waitFor(c, () => c.evaluate("!!context.atBreakpoint?.value"), { timeout: 60000, interval: 100 }))) {
      throw new Error("the program did not stop at its Stop statement");
    }
  },
  async prepare(c) {
    // the pane's height for two rows: the rows follow the pane's size
    const sel = panelSel("MEMORY 1");
    for (let i = 0; i < 20; i++) {
      const { count } = await memoryRows(c);
      if (count === 2) break;
      await c.evaluate(`(() => {
  const p = document.querySelector(${JSON.stringify(sel)});
  p.style.height = (p.getBoundingClientRect().height + (${count} < 2 ? 4 : -4)) + "px";
})()`);
      await frames(c);
    }
    if ((await memoryRows(c)).count !== 2) throw new Error("the MEMORY 1 pane would not show two rows");
    await c.evaluate(
      `(() => { const i = hexEditorPanel.outerDiv.querySelector(".addr-input"); i.focus(); i.select(); })()`,
    );
    await typeText(c, "s");
    await pressKey(c, "Enter");
    // The rows are drawn again once the debugger answers, and the cell at the address then
    // takes the focus: the box can already read StrPtr(s) from the theme before.
    const read = await waitFor(
      c,
      async () =>
        (await c.evaluate(`hexEditorPanel.outerDiv.querySelector(".addr-input").value`)) === "StrPtr(s)" &&
        (await c.evaluate(`!!document.activeElement?.closest?.(".hexedr td.cell")`)) &&
        (await memoryRows(c)).text === MEMORY_TEXT,
      { timeout: 15000, interval: 100 },
    );
    if (!read) throw new Error(`the MEMORY 1 pane shows ${JSON.stringify(await memoryRows(c))}`);
    await c.evaluate(`(() => {
  const a = ${JSON.stringify(MEMORY_ADDRESSES)};
  hexEditorPanel.outerDiv.querySelectorAll(".hexedr tbody th.addr").forEach((t, i) => { t.textContent = a[i]; });
  document.activeElement?.blur();
})()`);
    await frames(c);
    const shown = await c.evaluate(
      `[...hexEditorPanel.outerDiv.querySelectorAll(".hexedr tbody th.addr")].map((t) => t.textContent)`,
    );
    if (JSON.stringify(shown) !== JSON.stringify(MEMORY_ADDRESSES)) {
      throw new Error(`the MEMORY 1 pane drew its addresses again: ${JSON.stringify(shown)}`);
    }
  },
  restore: (c) => stopRun(c),
});

// ---- package: the sample, a TWINPACK package, built (setup package), with its build path on a
// folder of the tool's own at the root of the temp folder's drive, PACKAGE_ROOT: the DEBUG
// CONSOLE names the file the build creates, and the lane's own build path is under the
// user's profile. The folder is made by the IDE and removed at the end of the run, unless it
// was there before it. The console's times are set in the page once the real ones are shown,
// as the CodeLens pictures' are.

const PACKAGE_ROOT = path.join(path.parse(tmpdir()).root, "tbshots");
const PACKAGE_BUILD_PATH = path.join(PACKAGE_ROOT, "Build", "${ProjectName}_${Architecture}.${FileExtension}");

// Sets every line time of the DEBUG CONSOLE to CODELENS_TIME, and the time a CodeLens run took
// to `taken` when given, in the page.
const fixConsoleTimes = (c, taken = null) =>
  c.evaluate(`(() => {
  const walk = document.createTreeWalker(document.querySelector(".debugConsoleOuter"), NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    n.nodeValue = n.nodeValue.replace(/^\\d\\d:\\d\\d:\\d\\d\\.\\d{3}$/, ${JSON.stringify(CODELENS_TIME)});
    ${taken ? `n.nodeValue = n.nodeValue.replace(/time taken: [\\d.]+s/, ${JSON.stringify(`time taken: ${taken}`)});` : ""}
  }
})()`);

// ---- fusion: test/shots/fusion, FusionDemo, a Standard EXE referencing the 32-bit Microsoft
// Windows Common Controls 6.0 (MSCOMCTL.OCX, which has to be registered on the machine) with
// its Fusion mode fusionAllTo32: the compiler builds the Fusion host EXE as it loads the
// project. Its output path, the project's ActiveX Fusion Host EXE Output Path, is set in the
// staged copy to PACKAGE_ROOT, as the package's build path is.

const FUSION = path.join(REPO_ROOT, "test", "shots", "fusion");
const FUSION_LINE = "[BUILD] successfully built Fusion server file";

async function startFusion(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, FUSION)}, its Fusion host path ${PACKAGE_BUILD_PATH}`);
  const src = path.join(run.work, "fusion-src");
  cpSync(FUSION, src, { recursive: true });
  const file = path.join(src, "Settings");
  const settings = JSON.parse(readFileSync(file, "utf8"));
  settings["project.fusionBuildPath"] = PACKAGE_BUILD_PATH;
  writeFileSync(file, JSON.stringify(settings, null, "\t"));
  return run.lane.open(src);
}

// The DEBUG CONSOLE as the project's load leaves it, the line that says the host was built its
// only one, floated on its own. A line before it would name the lane's folder: the
// user's name is replaced in the console's text in the page, as for the LIMITED picture's
// restart line, and the panel is sized to show the last line, which the console scrolls to.
const fusionShot = {
  out: "Features/Images/569099635-bc9553a6-fcce-487d-a478-dbee557f33b1.png",
  setup: "fusion",
  async take({ c }) {
    await resetUi(c);
    try {
      // the panel's text is read once it shows: a hidden one has none
      const box = await floatPanel(c, "DEBUG CONSOLE", { width: 560, height: 116 });
      const text = await waitFor(
        c,
        async () => {
          const t = await consoleText(c);
          return (t.includes(FUSION_LINE) || /failed to build Fusion/.test(t)) && t;
        },
        { timeout: 60000, interval: 200 },
      );
      if (!text?.includes(FUSION_LINE)) {
        throw new Error(
          `the compiler did not build the Fusion host: ${JSON.stringify(text?.match(/.*Fusion.*/)?.[0])}`,
        );
      }
      await nameUserAsUserIn(c, ".debugConsoleOuter");
      await fixConsoleTimes(c);
      return await capture(c, "569099635", snapOut(box), { away: () => parkMouse(c) });
    } finally {
      await unfloatPanel(c, "DEBUG CONSOLE");
    }
  },
};

async function startPackage(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, SAMPLE)}, its build path ${PACKAGE_BUILD_PATH}`);
  return run.lane.open(stageSample(run), { buildPath: PACKAGE_BUILD_PATH });
}

const packageBuildShot = {
  out: "Features/Packages/Images/8d74d820-9907-4e76-ac42-71d0233187f1.png",
  setup: "package",
  async take({ c }) {
    await resetUi(c);
    try {
      const box = await floatPanel(c, "DEBUG CONSOLE", { width: 560, height: 160 });
      const clear = await rectOf(c, '[title="Clear Debug Console"]');
      if (!clear) throw new Error("the DEBUG CONSOLE has no Clear button");
      await clickAt(c, clear.x + clear.width / 2, clear.y + clear.height / 2);
      if (!(await waitFor(c, () => c.evaluate("debugConsoleContent.dataNodes.length === 0"), { timeout: 5000 }))) {
        throw new Error("the DEBUG CONSOLE was not cleared");
      }
      const built = await buildProject(c);
      if (!built.ok || !/\.twinpack$/i.test(built.file ?? "")) {
        throw new Error(`the sample did not build a package: ${built.message ?? built.file}`);
      }
      await fixConsoleTimes(c);
      return await capture(c, "8d74d820", snapOut(box), { away: () => parkMouse(c) });
    } finally {
      await unfloatPanel(c, "DEBUG CONSOLE");
    }
  },
};

// ---- package-server: the sample with test/shots/packages staged onto it (Greeting, a class to
// type a package's name into), signed out, with the network to TWINSERV: Project Settings' list
// of the packages TWINSERV serves, packages downloaded from it and embedded, and a package linked
// and the two questions the IDE then asks. The list is TWINSERV's live list, so the rows a
// picture shows change as packages are published. Every picture brings the project to its state
// itself and puts it back: what it ticks it unticks again before it leaves the dialog (the IDE
// deletes the project's copy of an embedded package at once), and the local packages folder is
// emptied, so each starts from the project as staged. packagesClean says when one did not.
// The IDE's APPDATA is a folder of the tool's own on PACKAGE_ROOT, PACKAGES_APPDATA: the
// questions about a linked copy name its path, and the lane's own APPDATA is under the user's
// profile. Publishing needs a publisher signed in (packagePublisherPublish opens the sign-in
// form first), so the confirmation box of a publish is not reachable and has no shot.
//
// settings-linked is the sample with a Settings file that links OLEGuids and an APPDATA with no
// copy of it, as a project opened on a machine that lacks the package; package-check is the
// sample with an older OLEGuids embedded, as the IDE embedded it when that was TWINSERV's newest:
// the tool downloads it from TWINSERV, by the address the IDE downloads from, and writes the
// reference the IDE writes for a package from TWINSERV. The IDE downloads only the newest build,
// and a package imported from a file has no publisher, which the check needs.

const PACKAGES = path.join(REPO_ROOT, "test", "shots", "packages");
const PACKAGES_APPDATA = path.join(PACKAGE_ROOT, "AppData", "Roaming");
const LOCAL_PACKAGES = path.join(PACKAGES_APPDATA, "twinBASIC", "packages");
const TWINSERV = "https://www.everythingaccess.com/twinbasic/packages";
// The package of the linked pictures and of the check, and the older build the check finds.
const OLEGUIDS = "OLE Guid and interface definitions";
const OLEGUIDS_ID = "{7E880520-9F56-45E1-9772-DF9FFE246715}";
const OUTDATED_VERSION = "1.0.0.9";
// The two packages of the import pictures, as the list names them.
const FORMATTER = "CSharpishStringFormater";
const FILE_PROPS = "FilePropertyExplorer";

async function startPackageServer(run) {
  run.step = "open";
  say(run.name, `opening ${path.relative(REPO_ROOT, SAMPLE)} with ${path.relative(REPO_ROOT, PACKAGES)}`);
  rmSync(PACKAGES_APPDATA, { recursive: true, force: true });
  mkdirSync(PACKAGES_APPDATA, { recursive: true });
  const src = stageSample(run);
  cpSync(PACKAGES, src, { recursive: true });
  return run.lane.open(src, { env: { APPDATA: PACKAGES_APPDATA } });
}

// The project's packages folder as staged, which every picture leaves as it found it.
const projectPackages = (c) =>
  c.evaluate(
    `Object.keys(fs.tree.resolvePath("twinbasic:${SAMPLE_FILE("Packages")}")?.entries ?? {}).sort().join(",")`,
  );

async function preparePackageServer(run) {
  const ctx = await prepareSample(run);
  return { ...ctx, lane: run.lane, packages: await projectPackages(run.c) };
}

// Throws when an earlier picture left a package in the project (its folder, or a reference that
// was applied), and empties the local packages folder (the IDE writes into it, and does not make it).
async function packagesClean({ c, packages }) {
  if (existsSync(LOCAL_PACKAGES)) {
    for (const f of readdirSync(LOCAL_PACKAGES)) rmSync(path.join(LOCAL_PACKAGES, f), { recursive: true, force: true });
  }
  const now = await projectPackages(c);
  const refs = await c.evaluate(
    `new Promise((done) => getProjectSettings((s) => done((s["project.references"] ?? []).filter((r) => !r.isCompilerPackage && String(r.path32).startsWith("/Packages/")).map((r) => r.name))))`,
    { awaitPromise: true },
  );
  if (now !== packages || refs.length) {
    throw new Error(
      `the project still holds a package from an earlier picture: its Packages folder holds ${now}, where ${packages} was staged${refs.length ? `, and it references ${refs.join(", ")}` : ""}`,
    );
  }
}

// Project > References, Cancel to close it.
const inReferences = (c, run) =>
  inDialog(c, { command: LIBRARY_REFERENCES, title: "Project Settings", close: "Cancel", still: 500 }, run);

const PE_SETTINGS = { css: '.panelHeaderIcon[title="Project Settings"]' };
// The IDE's completion list, its own box rather than Monaco's suggest widget.
const COMPLETIONS = ".debugConsoleEntryIntellisenseBox";
const REFERENCES_TAB = (name) => ({ css: ".referencesListChoiceOption", text: name });
// The list of the tab shown: the dialog holds one for each tab, the others hidden, and the
// list of Available COM References has the class of Available Packages' too.
const SHOWN_LIST = ".referencesListNewOuter:not(.referenceListHidden)";
const AVAILABLE_ROW = `${SHOWN_LIST} .referencesListNewAvailable .referencesListRow`;
const ENABLED_ROW = `${SHOWN_LIST} .referencesListNew .referencesListRow`;
const VERSION_HEADER = `${SHOWN_LIST} .referencesListRowHeader .referencesListColVersion`;
const IMPORT_BUTTON = { css: ".loadFromFile" };
const LOGIN_TIP = { css: ".warningNotLoggedIn" };
// The rows of a package in the list of Available Packages, by the start of the name the list
// shows, and the Enabled Libraries row of a reference, by a part of its name.
const AVAILABLE_ROW_OF = (name) => `${AVAILABLE_ROW}:has(.referencesListColName2[title^="${name}"])`;
const ENABLED_ROW_OF = (name) => `${ENABLED_ROW}:has(.referencesListColName[title*="${name}"])`;

// The tab of the dialog `name`, a real click, once it shows; for Available Packages, once the list
// holds TWINSERV's packages.
async function referencesTab(c, name) {
  await clickInModal(c, name);
  if (name === "Available Packages") {
    const listed = await waitFor(
      c,
      () => c.evaluate(`!!document.querySelector(${JSON.stringify(AVAILABLE_ROW_OF(OLEGUIDS))})`),
      { timeout: 30000, interval: 200 },
    );
    if (!listed) throw new Error("the Available Packages list never showed TWINSERV's packages");
  }
  await dialogStill(c, { ms: 500 });
}

// The visible box of the references list (the tab shown).
const referencesList = (c) => shownRect(c, SHOWN_LIST);

// The tick of each row of package `name` in Available Packages: `enabled`, `embedded`, each
// tickIcon2, tickIcon2empty or tickIconInProgress.
const packageRows = (c, name) =>
  c.evaluate(`[...document.querySelectorAll(${JSON.stringify(AVAILABLE_ROW_OF(name))})].map((r) => {
  const t = (e) => e?.innerHTML.match(/tickIcon\\w*/)?.[0] ?? null;
  return { enabled: t(r.querySelector(".referencesListColEnabled")), embedded: t(r.querySelector(".referencesListIsLocalPackage")) };
})`);

// A real click on `cell` (a class) of the first row of package `name` whose tick is `ticked`,
// the list scrolled first so that the row is `below` pixels under its header.
async function clickPackage(c, name, cell, { ticked, below = 56 }) {
  const row = `[...document.querySelectorAll(${JSON.stringify(AVAILABLE_ROW_OF(name))})].find((r) => r.querySelector(${JSON.stringify(`.referencesListColEnabled ${ticked ? ".tickIcon2" : ".tickIcon2empty"}`)}))`;
  const found = await c.evaluate(`(() => {
  const r = ${row};
  if (!r) return false;
  const list = r.closest(".referencesListNewOuter");
  const head = list.querySelector(".referencesListRowHeader").getBoundingClientRect();
  list.scrollTop += r.getBoundingClientRect().top - head.bottom - ${below};
  return true;
})()`);
  if (!found) throw new Error(`Available Packages has no ${ticked ? "ticked" : "unticked"} row of ${name}`);
  await frames(c);
  const p = await c.evaluate(`(() => {
  const b = ${row}.querySelector(${JSON.stringify(cell)}).getBoundingClientRect();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
})()`);
  await clickAt(c, p.x, p.y);
}

// Ticks package `name` in Available Packages and waits for the IDE to download and embed it.
async function tickPackage(c, name) {
  await clickPackage(c, name, ".referencesListColEnabled", { ticked: false });
  const embedded = await waitFor(
    c,
    async () => (await packageRows(c, name)).some((r) => r.enabled === "tickIcon2" && r.embedded === "tickIcon2"),
    { timeout: 60000, interval: 200 },
  );
  if (!embedded)
    throw new Error(`${name} was not downloaded and embedded: ${JSON.stringify(await packageRows(c, name))}`);
  await dialogStill(c, { ms: 500 });
}

// Unticks package `name` in Available Packages, once no row of it is ticked; the IDE deletes the
// project's copy of it at once.
async function untickPackage(c, name) {
  await clickPackage(c, name, ".referencesListColEnabled", { ticked: true });
  const gone = await waitFor(c, async () => (await packageRows(c, name)).every((r) => r.enabled === "tickIcon2empty"), {
    timeout: 30000,
    interval: 200,
  });
  if (!gone) throw new Error(`${name} stayed ticked`);
  await dialogStill(c, { ms: 500 });
}

// Unticks a reference in Enabled Libraries, a real click, once its row has gone.
async function untickReference(c, name) {
  const t = await shownRect(c, `${ENABLED_ROW_OF(name)} .referencesListColEnabled`);
  if (!t) throw new Error(`Enabled Libraries has no row of ${name}`);
  await clickAt(c, t.x + t.width / 2, t.y + t.height / 2);
  if (!(await waitFor(c, async () => !(await shownRect(c, ENABLED_ROW_OF(name))), { timeout: 30000, interval: 200 }))) {
    throw new Error(`${name} stayed in Enabled Libraries`);
  }
  await dialogStill(c, { ms: 500 });
}

// Apply Changes, a real click; waits for the compiler the IDE restarts to compile the project.
async function applyChanges({ c, lane }) {
  const before = await compilerPid(c);
  // The IDE's own Clear, as its button does (the dialog covers the button): the crash count
  // checkCompile reads is the DEBUG CONSOLE's, so a crash an earlier Apply met is not counted
  // against this one. One does now and then: an ACCESS_VIOLATION in the compiler, BETA 1005.
  await c.evaluate("clearDebugConsole()");
  await clickInModal(c, "Apply Changes");
  await awaitNewCompiler(c, before, { why: "Apply Changes" });
  try {
    lane.checkCompile(await waitForCompile(c, { project: lane.project, timeout: COMPILE_TIMEOUT }), "the sample");
  } catch (e) {
    // the DEBUG CONSOLE's lines about a crash, which the message only counts
    const lines = await c.evaluate(
      `(debugConsoleContent.dataNodes ?? []).filter((l) => /NATIVE EXCEPTION|ParsingFileStart|crash/i.test(l)).map((l) => l.replace(/<[^>]*>/g, " ").slice(0, 300))`,
    );
    throw new Error(`${e.message}${lines.length ? `\n${lines.join("\n")}` : ""}`);
  }
  await parkMouse(c);
}

// Waits for the top dialog to be the IDE's question that starts with `text`, and to be still.
async function question(c, text) {
  const asked = await waitFor(
    c,
    () => c.evaluate(`(${TOP_MODAL})?.innerText.includes(${JSON.stringify(text)}) ?? false`),
    { timeout: 30000, interval: 200 },
  );
  if (!asked) throw new Error(`the IDE did not ask "${text}"`);
  await dialogStill(c, { ms: 500 });
}

// OLEGuids downloaded, embedded and then linked: the IDE writes the local copy into the packages
// folder and drops the project's own. Then unticked, which leaves the local copy, and ticked
// again: the IDE asks whether to use the local copy or download it again.
async function linkedThenTicked(c) {
  await tickPackage(c, OLEGUIDS);
  await clickPackage(c, OLEGUIDS, ".referencesListIsLocalPackage", { ticked: true });
  const linked = await waitFor(
    c,
    async () =>
      existsSync(path.join(LOCAL_PACKAGES, "OLEGuids.twinpack")) &&
      (await packageRows(c, OLEGUIDS)).some((r) => r.enabled === "tickIcon2" && r.embedded === "tickIcon2empty"),
    { timeout: 30000, interval: 200 },
  );
  if (!linked) throw new Error("OLEGuids was not linked: the packages folder holds no OLEGuids.twinpack");
  await untickPackage(c, OLEGUIDS);
  await clickPackage(c, OLEGUIDS, ".referencesListColEnabled", { ticked: false });
  await question(c, "Local Package exists");
}

const PACKAGE_IMAGE = (name) => `Features/Packages/Images/${name}.png`;

// A settingsShot taken once the compiler has said which references it could not load: the
// dialog marks them as it opens, and the compiler says so a little after the project has
// compiled.
function missingLinkedShot(out, options) {
  const shot = settingsShot(out, options);
  return {
    ...shot,
    async take(ctx) {
      const said = await waitFor(ctx.c, () => ctx.c.evaluate("problemReferences.length > 0"), {
        timeout: 30000,
        interval: 200,
      });
      if (!said) throw new Error("the compiler reported no reference it could not load");
      return shot.take(ctx);
    },
  };
}
// A rectangle from the left and top of `a` to the right and bottom of `b`.
const span = (a, b) => ({ x: a.x, y: a.y, width: b.x + b.width - a.x, height: b.y + b.height - a.y });

// Project Settings opened by the Project Explorer's gear, a real click, scrolled to Library
// References, on Available Packages; the gear, the heading and the tab ringed and numbered. The
// dialog is shown whole, from its title, with the gear beside it, which a smaller page does
// not make narrower: the dialog then covers the gear.
async function takeE749(c) {
  const gear = await rectOf(c, PE_SETTINGS.css);
  if (!gear) throw new Error("the Project Explorer has no Project Settings button");
  await clickAt(c, gear.x + gear.width / 2, gear.y + gear.height / 2);
  if (!(await waitModal(c, "Project Settings"))) throw new Error("Project Settings did not open");
  try {
    await dialogStill(c, { ms: 500 });
    await scrollToSetting(c, "project.references", 10);
    await referencesTab(c, "Available Packages");
    // The build path the lane stages the project with names the user's folder, and so do
    // libraries registered under it, in the list of Available COM References that the whole
    // dialog fills (hidden, its text still in the page's): once that list is filled.
    await waitFor(
      c,
      () =>
        c.evaluate(
          `[...document.querySelectorAll(".referencesListNewOuter.referenceListHidden .referencesListNewAvailable")].some((l) => l.children.length > 3)`,
        ),
      { timeout: 20000, interval: 250 },
    );
    await nameUserAsUser(c);
    const dialog = (await modals(c)).pop();
    const list = await referencesList(c);
    const x = dialog.x - 10;
    const y = dialog.y - 10;
    const area = { x, y, width: gear.x + gear.width + 30 - x, height: list.y + list.height + 12 - y };
    const heading = { css: settingPart("project.references", "HEADER"), own: true };
    const tab = REFERENCES_TAB("Available Packages");
    const png = await annotatedClip(c, "e749e10f", area, [
      { type: "ring", on: PE_SETTINGS },
      { type: "badge", n: 1, on: PE_SETTINGS, side: "below" },
      { type: "ring", on: heading },
      { type: "badge", n: 2, on: heading, side: "below" },
      { type: "ring", on: tab },
      { type: "badge", n: 3, on: tab, side: "right" },
    ]);
    return png;
  } finally {
    await closeModal(c, "Cancel");
  }
}

const packageServerShots = [
  {
    // the dialog opened by the Project Explorer's gear, on Available Packages: the gear, the
    // Library References heading and the tab numbered in the order they are used
    out: PACKAGE_IMAGE("e749e10f-e361-4f15-a977-d756fcb3b5dd"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      await resetUi(c);
      return takeE749(c);
    },
  },
  {
    // the foot of the list, the Import from file... button numbered 4 and the TIP to sign in
    out: PACKAGE_IMAGE("e35d5955-9e70-4d6e-abd7-748558da75ba"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      return inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        await c.evaluate(
          `(() => { const l = document.querySelector(${JSON.stringify(SHOWN_LIST)}); l.scrollTop = l.scrollHeight; })()`,
        );
        await frames(c);
        const list = await referencesList(c);
        const button = await shownRect(c, IMPORT_BUTTON.css);
        const tip = await shownRect(c, LOGIN_TIP.css);
        const area = {
          x: list.x - 6,
          y: list.y + list.height - 74,
          width: list.width + 12,
          height: Math.max(button.y + button.height, tip.y + tip.height) + 14 - (list.y + list.height - 74),
        };
        return annotatedClip(c, "e35d5955", area, [
          { type: "ring", on: IMPORT_BUTTON },
          { type: "badge", n: 4, on: IMPORT_BUTTON, side: "right" },
        ]);
      });
    },
  },
  {
    // the TIP to sign in, below the list's lower right corner
    out: PACKAGE_IMAGE("0fa1272d-41d6-4d0f-b19c-f47f24a47c4d"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      return inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        const list = await referencesList(c);
        const tip = await shownRect(c, LOGIN_TIP.css);
        const x = tip.x - 280;
        const y = list.y + list.height - 80;
        return annotatedClip(c, "0fa1272d", {
          x,
          y,
          width: list.x + list.width + 6 - x,
          height: tip.y + tip.height + 14 - y,
        });
      });
    },
  },
  {
    // Project > References on Available Packages, the built-in packages first, an arrow at the tab
    out: "Features/Images/5951dab6-738e-4b63-83c4-3331ec6d36b9.png",
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      return inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        const heading = await shownRect(c, settingPart("project.references", "HEADER"));
        const list = await referencesList(c);
        const tip = await shownRect(c, LOGIN_TIP.css);
        const x = heading.x + heading.width - 130;
        const y = heading.y - 12;
        const tab = REFERENCES_TAB("Available Packages");
        return annotatedClip(
          c,
          "5951dab6",
          { x, y, width: list.x + list.width + 12 - x, height: tip.y + tip.height + 14 - y },
          [{ type: "arrow", from: { of: tab, at: "right", dx: 110 }, to: tab }],
        );
      });
    },
  },
  {
    // a package ticked for the first time on this machine: Embedded, the column and the row's tick
    out: PACKAGE_IMAGE("1f7e3574-f3c8-4aee-972a-ff161c0e51ac"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      return inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        await tickPackage(c, OLEGUIDS);
        try {
          const tabs = await shownRect(c, ".referencesListChoice");
          const list = await referencesList(c);
          const row = await shownRect(c, AVAILABLE_ROW_OF(OLEGUIDS));
          const symbol = await shownRect(c, `${AVAILABLE_ROW_OF(OLEGUIDS)} .referencesListColSymbol`);
          const header = { css: ".referencesListRowHeader .referencesListColLocation", text: "Embedded" };
          const tick = { css: `${AVAILABLE_ROW_OF(OLEGUIDS)} .referencesListIsLocalPackage .tickIcon2` };
          const area = span(
            { x: list.x - 4, y: tabs.y - 8 },
            { x: symbol.x + symbol.width, y: row.y, width: 0, height: row.height * 2 + 4 },
          );
          return await annotatedClip(c, "1f7e3574", area, [
            { type: "arrow", from: { of: header, at: "left", dx: -150 }, to: header },
            { type: "arrow", from: { of: header, at: "bottom", dy: 2 }, to: tick },
          ]);
        } finally {
          await untickPackage(c, OLEGUIDS);
        }
      });
    },
  },
  {
    // two packages downloaded and embedded: Enabled Libraries lists them
    out: PACKAGE_IMAGE("f2fd8374-fe46-40b0-8c66-2443df4dc5b3"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      return inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        await tickPackage(c, FORMATTER);
        await tickPackage(c, FILE_PROPS);
        try {
          await referencesTab(c, "Enabled Libraries");
          const heading = await shownRect(c, settingPart("project.references", "HEADER"));
          const last = await shownRect(c, ENABLED_ROW_OF(FILE_PROPS));
          const version = await shownRect(c, VERSION_HEADER);
          const x = heading.x + heading.width - 130;
          const y = heading.y - 12;
          return await annotatedClip(c, "f2fd8374", {
            x,
            y,
            width: version.x + version.width + 4 - x,
            height: last.y + last.height + 14 - y,
          });
        } finally {
          await untickReference(c, FORMATTER);
          await untickReference(c, FILE_PROPS);
        }
      });
    },
  },
  {
    // CSharpishStringFormater referenced and applied, and "fmt." typed in a method: the
    // completion list offers the package's members
    out: PACKAGE_IMAGE("e2a65dfe-4a9d-4524-b6d6-7a6d1bc35cdb"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      await inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        await tickPackage(c, FORMATTER);
        await applyChanges(ctx);
      });
      let was = null;
      try {
        await openFile(c, SAMPLE_FILE("Sources/Greeting.twin"), { line: 4, column: 1 });
        was = { text: await editorText(c), counts: await diagCounts(c) };
        await setCursor(c, 4, 1);
        await typeText(c, "        fmt");
        // The list shows each member's type as "..." until the compiler has given it, which it
        // now and then never does for a list: the dot is typed again then.
        const listed = (resolved) =>
          c.evaluate(`(() => {
  const b = [...document.querySelectorAll(${JSON.stringify(COMPLETIONS)})].find((b) => b.getBoundingClientRect().width);
  const rows = b ? [...b.querySelectorAll(".listitem")] : [];
  if (!rows.some((r) => r.innerText.includes("AsciiEscapeBase"))) return false;
  return !${resolved} || rows.every((r) => [...(r.querySelector(".isenseType")?.childNodes ?? [])].every((n) => n.nodeType !== 3 || n.nodeValue !== "..."));
})()`);
        // A list opened by the name typed before the dot is placed where that name starts, and
        // the dot's list then opens where that one was: closed first, the dot's list opens at
        // the dot, the same in every run.
        const boxShown = () =>
          c.evaluate(
            `[...document.querySelectorAll(${JSON.stringify(COMPLETIONS)})].some((b) => b.getBoundingClientRect().width)`,
          );
        const noList = async () => {
          await sleep(400);
          for (let k = 0; k < 3 && (await boxShown()); k++) {
            await pressKey(c, "Escape");
            await waitFor(c, async () => !(await boxShown()), { timeout: 2000, interval: 100 });
          }
        };
        let shown = false;
        for (let i = 0; i < 3 && !shown; i++) {
          if (i) {
            await pressKey(c, "Escape");
            await pressKey(c, "Backspace");
          }
          await noList();
          await typeText(c, ".");
          if (!(await waitFor(c, () => listed(false), { timeout: 30000, interval: 200 }))) {
            throw new Error("typing fmt. opened no completion list of the package's members");
          }
          shown = await waitFor(c, () => listed(true), { timeout: 10000, interval: 200 });
        }
        if (!shown) throw new Error("the completion list never showed its members' types");
        await sleep(500);
        const area = await c.evaluate(`(() => {
  const ed = editor.getDomNode().getBoundingClientRect();
  const left = ed.x + editor.getLayoutInfo().contentLeft;
  const top = ed.y + editor.getScrolledVisiblePosition({ lineNumber: 3, column: 1 }).top;
  const w = [...document.querySelectorAll(${JSON.stringify(COMPLETIONS)})].find((b) => b.getBoundingClientRect().width).getBoundingClientRect();
  return { x: left - 6, y: top - 6, width: w.right + 8 - (left - 6), height: w.bottom + 8 - (top - 6) };
})()`);
        return await capture(c, "e2a65dfe", snapOut(area));
      } finally {
        await pressKey(c, "Escape");
        if (was) {
          await c.evaluate(`editor.getModel().setValue(${JSON.stringify(was.text)})`);
          await waitCounts(c, was.counts);
        }
        await closeTabs(c, [], { discard: true });
        await inReferences(c, async () => {
          await untickReference(c, FORMATTER);
          await applyChanges(ctx);
        });
      }
    },
  },
  {
    // OLEGuids ticked again once a linked copy is on the machine: use it, or download it again
    out: PACKAGE_IMAGE("f48a7254-e5c9-48c5-8099-725c0951ae5f"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      return inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        await linkedThenTicked(c);
        try {
          const box = (await modals(c)).pop();
          const list = await referencesList(c);
          const tabs = await shownRect(c, ".referencesListChoice");
          // from the question's left edge: the row being ticked shows a spinning icon in the
          // list's tick column, an animated picture that no two captures hold alike
          const x = box.x - 2;
          const y = tabs.y - 8;
          return await annotatedClip(c, "f48a7254", {
            x,
            y,
            width: box.x + box.width + 16 - x,
            height: Math.max(list.y + list.height, box.y + box.height) + 4 - y,
          });
        } finally {
          await closeModal(c, "Cancel");
        }
      });
    },
  },
  {
    // the same package downloaded again and its Embedded unticked: the IDE asks before it
    // replaces the linked copy
    out: PACKAGE_IMAGE("8cf72685-1188-4607-a55a-df16d4280474"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      return inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        await linkedThenTicked(c);
        await closeModal(c, "Download it from TWINSERV (EMBED)");
        const embedded = await waitFor(
          c,
          async () =>
            (await packageRows(c, OLEGUIDS)).some((r) => r.enabled === "tickIcon2" && r.embedded === "tickIcon2"),
          { timeout: 60000, interval: 200 },
        );
        if (!embedded) throw new Error("OLEGuids was not downloaded again");
        await dialogStill(c, { ms: 500 });
        await clickPackage(c, OLEGUIDS, ".referencesListIsLocalPackage", { ticked: true });
        await question(c, "Local Package already exists");
        try {
          return await dialogShot(c, "8cf72685");
        } finally {
          await closeModal(c, "Cancel");
          await untickPackage(c, OLEGUIDS);
        }
      });
    },
  },
  {
    // an embedded package in Enabled Libraries, its tick ringed: unticking it deletes the
    // project's copy at once
    out: PACKAGE_IMAGE("a1331a0e-3ba3-45cf-8dc3-2e24f0fa1fe6"),
    setup: "package-server",
    async take(ctx) {
      const { c } = ctx;
      await packagesClean(ctx);
      return inReferences(c, async () => {
        await referencesTab(c, "Available Packages");
        await tickPackage(c, OLEGUIDS);
        try {
          await referencesTab(c, "Enabled Libraries");
          const tabs = await shownRect(c, ".referencesListChoice");
          const list = await referencesList(c);
          const row = await shownRect(c, ENABLED_ROW_OF(OLEGUIDS));
          const version = await shownRect(c, VERSION_HEADER);
          return await annotatedClip(
            c,
            "a1331a0e",
            span(
              { x: list.x - 4, y: tabs.y - 8 },
              { x: version.x + version.width + 4, y: row.y, width: 0, height: row.height + 30 },
            ),
            [{ type: "ring", on: { css: `${ENABLED_ROW_OF(OLEGUIDS)} .referencesListColEnabled .tickIcon2` } }],
          );
        } finally {
          await untickReference(c, OLEGUIDS);
        }
      });
    },
  },
  // a project that links OLEGuids, opened where there is no copy of it: the reference's error
  missingLinkedShot(PACKAGE_IMAGE("f66fb240-dcb7-46ee-896d-78c3789a7876"), {
    setup: "settings-linked",
    command: LIBRARY_REFERENCES,
    clipOf: async (_m, c) => {
      const error = await waitFor(c, () => shownRect(c, `${ENABLED_ROW_OF(OLEGUIDS)} .referencesListError`), {
        timeout: 10000,
        interval: 200,
      });
      if (!error) throw new Error("the linked package's row shows no error");
      await dialogStill(c, { ms: 500 });
      const row = await shownRect(c, ENABLED_ROW_OF(OLEGUIDS));
      return { x: row.x, y: row.y, width: error.x + error.width + 12 - row.x, height: row.height };
    },
  }),
  {
    // the DEBUG CONSOLE as the project's load leaves it: the check of its packages against TWINSERV
    out: PACKAGE_IMAGE("db4636f6-d988-4e31-94a2-c4c170418e81"),
    setup: "package-check",
    async take({ c }) {
      await resetUi(c);
      try {
        const box = await floatPanel(c, "DEBUG CONSOLE", { width: 640, height: 72 });
        const line = `[PACKAGE CHECK] OLEGuids ${OUTDATED_VERSION}`;
        const text = await waitFor(
          c,
          async () => {
            const t = await consoleText(c);
            return /is available/.test(t) && t;
          },
          { timeout: 60000, interval: 200 },
        );
        if (!text?.includes(line)) throw new Error(`the DEBUG CONSOLE holds no "${line}": ${JSON.stringify(text)}`);
        await fixConsoleTimes(c);
        return await capture(c, "db4636f6", snapOut(box), { away: () => parkMouse(c) });
      } finally {
        await unfloatPanel(c, "DEBUG CONSOLE");
      }
    },
  },
];

// The sample with OLEGuids OUTDATED_VERSION embedded: downloaded from TWINSERV, unpacked into the
// project's Packages folder and referenced as the IDE references a package from TWINSERV.
async function startPackageCheck(run) {
  run.step = "open";
  const list = await fetch(`${TWINSERV}/query?auth=`, { signal: AbortSignal.timeout(30000) });
  if (!list.ok) throw new Error(`TWINSERV's list of packages answered ${list.status}`);
  const pkg = (await list.json()).public.find((p) => p.projectId === OLEGUIDS_ID);
  const v = pkg?.versions.find(
    (x) => [x.versionMajor, x.versionMinor, x.versionBuild, x.versionRevision].join(".") === OUTDATED_VERSION,
  );
  if (!v) throw new Error(`TWINSERV no longer serves OLEGuids ${OUTDATED_VERSION}: keep the old picture`);
  const query = ["Major", "Minor", "Revision", "Build"].map((k) => `&version${k}=${v[`version${k}`]}`).join("");
  const res = await fetch(`${TWINSERV}/download?auth=&id=${OLEGUIDS_ID}${query}`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`TWINSERV answered ${res.status} for OLEGuids ${OUTDATED_VERSION}`);
  const file = path.join(run.work, "OLEGuids.twinpack");
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  say(run.name, `opening ${path.relative(REPO_ROOT, SAMPLE)} with OLEGuids ${OUTDATED_VERSION} from TWINSERV embedded`);
  const src = stageSample(run);
  unpackProject(file, path.join(src, "Packages", v.symbol));
  const settingsFile = path.join(src, "Settings");
  const settings = JSON.parse(readFileSync(settingsFile, "utf8"));
  settings["project.references"].push({
    autoCtlExt: true,
    id: OLEGUIDS_ID,
    licence: v.licence,
    name: `[IMPORTED] ${v.description}`,
    path32: `/Packages/${v.symbol}`,
    path64: `/Packages/${v.symbol}`,
    publishedDate: v.publishedDate,
    publishedTime: v.publishedTime,
    publisher: pkg.publisher,
    symbolId: v.symbol,
    versionBuild: v.versionBuild,
    versionMajor: v.versionMajor,
    versionMinor: v.versionMinor,
    versionRevision: v.versionRevision,
  });
  writeFileSync(settingsFile, JSON.stringify(settings, null, "\t"));
  return run.lane.open(src);
}

// ---------------------------------------------------------------- pictures not of the IDE's own UI

// ---- import: the sample open, and a VB6 project, test/shots/vbp's ImportDemo, imported as the
// Add menu's Import imports a .vbp. The IDE's own Open dialog is a native window, so the take
// calls what the IDE calls with the file chosen in it (importFileByPath); the IDE then loads the
// project in a compiler of its own and shows the Import from twinproj dialog, its tree of what
// it found. The project is staged on PACKAGE_ROOT, a folder of the tool's own at the root of
// the temp folder's drive, since the dialog names the .vbp's path: with CRLF line ends, as VB6
// writes its files, a module in a folder beside the project's (Shared), which the IDE puts
// under {PARENT-FOLDER}, and a resource file the tool writes (lib/res-file.mjs): three icons
// and the manifest test/shots/vbp/manifest.xml.

const VBP = path.join(REPO_ROOT, "test", "shots", "vbp");
const VBP_ROOT = path.join(PACKAGE_ROOT, "Projects");
const VBP_FILE = path.join(VBP_ROOT, "ImportDemo", "ImportDemo.vbp");

function stageVbp() {
  rmSync(VBP_ROOT, { recursive: true, force: true });
  for (const dir of ["ImportDemo", "Shared"]) {
    mkdirSync(path.join(VBP_ROOT, dir), { recursive: true });
    for (const f of readdirSync(path.join(VBP, dir))) {
      const text = readFileSync(path.join(VBP, dir, f), "utf8");
      writeFileSync(path.join(VBP_ROOT, dir, f), text.replace(/\r?\n/g, "\r\n"));
    }
  }
  writeFileSync(
    path.join(VBP_ROOT, "ImportDemo", "ImportDemo.res"),
    resFile([
      ...iconGroup("APPICON", 1, iconImage(32, [200, 40, 40], "square")),
      ...iconGroup("CIRCLE", 2, iconImage(32, [40, 90, 200], "circle")),
      ...iconGroup("SQUARE", 3, iconImage(32, [40, 160, 70], "square")),
      manifestResource(readFileSync(path.join(VBP, "manifest.xml"))),
    ]),
  );
}

async function startImport(run) {
  stageVbp();
  return startSample(run);
}

// A row of the import dialog's tree, by its name.
const importRow = (name) => `[...document.querySelectorAll(".objListImportItem")].find((r) =>
  r.querySelector(".objListText2")?.textContent.trim() === ${JSON.stringify(name)})`;
const IMPORT_TICKED = ["Form1.frm.tbform", "Form1.frm.twin"];

// The dialog with every folder open (the IDE opens all but Miscellaneous) and the form's two
// files ticked with real clicks, as the FAQ tells the reader to: the dialog's title bar and its
// tree, down to the last row and across to the end of the widest, as the page has always shown
// it, without the empty rest of the list and the buttons.
const importShot = {
  out: "Miscellaneous/Images/16833fae-4bd7-418f-bb16-691a611a5b01.png",
  setup: "import",
  async take({ c }) {
    await resetUi(c);
    await c.evaluate(`importFileByPath(${JSON.stringify(VBP_FILE)}, () => {})`);
    try {
      if (!(await waitModal(c, "Import from twinproj", { timeout: 60000 }))) {
        throw new Error("the Import from twinproj dialog did not open");
      }
      if (!(await waitFor(c, () => c.evaluate(`!!${importRow("Miscellaneous")}`), { timeout: 30000 }))) {
        throw new Error("the import dialog never listed the project's files");
      }
      for (const name of IMPORT_TICKED) {
        const box = await c.evaluate(`(() => {
  const r = ${importRow(name)}?.querySelector("#checkMark")?.getBoundingClientRect();
  return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
})()`);
        if (!box) throw new Error(`the import dialog has no ${name}`);
        await clickAt(c, box.x, box.y);
        const ticked = `${importRow(name)}?.querySelector("#checkMark")?.classList.contains("codicon-check")`;
        if (!(await waitFor(c, () => c.evaluate(ticked), { timeout: 3000, interval: 50 }))) {
          throw new Error(`${name} was not ticked`);
        }
      }
      await dialogStill(c);
      return await dialogShot(c, "import", async (m) => {
        const rows = await c.evaluate(`(() => {
  const rs = [...document.querySelectorAll(".objListImportItem")].filter((r) => r.getBoundingClientRect().width);
  const right = Math.max(...rs.flatMap((r) => [...r.children].map((k) => k.getBoundingClientRect().right)));
  return { right, bottom: Math.max(...rs.map((r) => r.getBoundingClientRect().bottom)) };
})()`);
        // the dialog is centred, so its box can start half a CSS pixel above its border, on
        // what is behind it
        const top = Math.ceil(m.y);
        return { x: m.x, y: top, width: rows.right + 16 - m.x, height: rows.bottom + 12 - top };
      });
    } finally {
      await cancelImport(c);
    }
  },
};

// Cancel ends the compiler the IDE loaded the project in, and the IDE then restarts its own:
// once that is done, the DEBUG CONSOLE's line about it, which names the work folder, under the
// user's, is cleared, so that the next picture's page does not hold it. A compiler that does not
// come back is said; the next picture's user-name check fails if its line is still there.
async function cancelImport(c) {
  if (!(await modals(c)).length) return;
  await closeModal(c, "Cancel");
  await waitFor(c, async () => /restarting from/.test(await consoleText(c)), { timeout: 15000, interval: 200 });
  if (!(await waitFor(c, () => servicesAre(c, "servicesOK"), { timeout: 60000, interval: 250 }))) {
    complain(c.shot.name, "the compiler did not come back after the import was cancelled");
  }
  await clearUserFromConsole(c);
}

// ---- webpage: the demo open, and the Webpage pane on its own, floating, showing the
// documentation's home page at the IDE's default zoom, 70%. The pane's page is a second
// WebView2 that the IDE's host lays over the pane, so a capture of the IDE's page holds the
// pane's header and an empty body: the page is captured from its own DevTools target (the
// host's WebView2s share the IDE's port) at the same 2x and put where the host puts it, one
// pixel inside the pane's body (syncPosition). The pane's settings are the IDE's defaults with
// the documentation's address, in the page only (the IDE's call that saves them is one
// PAGE_DEFAULTS has made do nothing). The page follows the OS's light or dark preference,
// set to the theme of the picture.

const WEBPAGE_URL = "https://docs.twinbasic.com/";
const WEBPAGE_PANEL = "webpagePanel._this.sectionHeader.panelDiv";
const WEBPAGE_BOX = { left: 140, top: 120, width: 340, height: 500 };

// The pane's page's target once it shows `url` and has loaded, its fonts and images too.
async function paneTarget(port, url) {
  const p = await waitFor(
    null,
    async () => {
      try {
        return await attach(port, url);
      } catch {
        return null;
      }
    },
    { timeout: 30000, interval: 250 },
  );
  if (!p) throw new Error(`the Webpage pane never showed ${url}`);
  // the page is still being replaced when its target first has the address: an evaluation
  // then finds no document to run in
  const loaded = `location.href === ${JSON.stringify(url)} && document.readyState === "complete" && document.fonts.status === "loaded" && [...document.images].every((i) => i.complete)`;
  const ready = () => p.evaluate(loaded).catch(() => false);
  if (!(await waitFor(p, ready, { timeout: 30000, interval: 100 }))) {
    p.close();
    throw new Error(`${url} did not finish loading in the Webpage pane`);
  }
  return p;
}

// Copies the pixels of `part` into `whole` (both decoded pictures) at (x, y).
function paste(whole, part, x, y) {
  for (let row = 0; row < part.height; row++) {
    whole.rgba.set(
      part.rgba.subarray(row * part.width * 4, (row + 1) * part.width * 4),
      ((y + row) * whole.width + x) * 4,
    );
  }
}

async function prepareWebpage(run) {
  return { ...(await prepareProject(run)), port: run.ports[0] };
}

const webpageShot = {
  out: "IDE/Images/Webpage.png",
  setup: "webpage",
  async take({ c, port }) {
    await resetUi(c);
    const dark = await pageIsDark(c);
    await c.evaluate(`liveWebpanelSettings = { zoom: 0.7, url: ${JSON.stringify(WEBPAGE_URL)}, mobileMode: false }`);
    await command(c, "tbWebpage_ShowPanel");
    let p = null;
    try {
      if (
        !(await waitFor(c, () => c.evaluate(`!!${WEBPAGE_PANEL}?.getBoundingClientRect().width`), { timeout: 5000 }))
      ) {
        throw new Error("the Webpage pane did not appear");
      }
      await c.evaluate(`(() => {
  Object.assign(${WEBPAGE_PANEL}.style, ${JSON.stringify(Object.fromEntries(Object.entries(WEBPAGE_BOX).map(([k, v]) => [k, `${v}px`])))});
  webpagePanel.syncSettings();
  webpagePanel.syncPosition();
})()`);
      const url = () => c.evaluate("webpagePanel.webpagePanelHeaderUrl.value");
      if (!(await waitFor(c, async () => (await url()) === WEBPAGE_URL, { timeout: 30000 }))) {
        throw new Error(`the Webpage pane's address is ${await url()}, not ${WEBPAGE_URL}`);
      }
      p = await paneTarget(port, WEBPAGE_URL);
      p.shot = newShotState("webpage");
      const inner = await rectOf(c, ".webpagePanelInner");
      const view = { width: inner.width - 2, height: inner.height - 2 };
      if (!Number.isInteger(inner.x) || !Number.isInteger(inner.y) || !Number.isInteger(view.width)) {
        throw new Error(`the Webpage pane's body is not on whole pixels: ${JSON.stringify(inner)}`);
      }
      await p.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }],
      });
      await p.send("Emulation.setDeviceMetricsOverride", { ...view, deviceScaleFactor: SCALE, mobile: false });
      await p.evaluate("window.scrollTo(0, 0)");
      await frames(p);
      const page = decodePng(await capture(p, "webpage", null));
      if (page.width !== view.width * SCALE || page.height !== view.height * SCALE) {
        throw new Error(
          `the pane's page came out ${page.width}x${page.height} px, not ${view.width}x${view.height} at 2x`,
        );
      }
      const panel = await c.evaluate(
        `(() => { const r = ${WEBPAGE_PANEL}.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
      );
      const clip = snapOut(panel);
      const whole = decodePng(await capture(c, "Webpage", clip, { frame: p, away: () => parkMouse(c) }));
      paste(whole, page, (inner.x + 1 - clip.x) * SCALE, (inner.y + 1 - clip.y) * SCALE);
      return encodePng(whole);
    } finally {
      if (p) {
        await p.send("Emulation.clearDeviceMetricsOverride").catch(() => {});
        p.close();
      }
      await command(c, "tbWebpage_HidePanel");
    }
  },
};

// ---- web: public web pages the FAQ shows, in a Chrome the tool starts on a private desktop
// of its own (puppeteer's, with a profile in the job's work folder), driven over DevTools as the
// IDE's page is. A page is no part of the IDE, so each picture is taken once, at 2x, in the
// page's light colours (the OS preference set to light). Their numbers are whatever the page
// says today: a release's size and age, a runtime's version.

async function startWeb(run) {
  run.step = "open";
  const port = run.ports[0];
  const exe = await puppeteer.executablePath();
  if (!existsSync(exe)) throw new Error(`no Chrome at ${exe}: run npm install`);
  say(run.name, "starting Chrome");
  const browser = await launchOnDesktop({
    exe,
    args: [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${path.join(run.work, "chrome")}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--force-device-scale-factor=1",
      LCD_TEXT,
      "--window-size=1400,1000",
      // a window on a desktop nobody sees counts as hidden, and Chrome then draws no frames:
      // the captures would wait for one, or hold a blank page
      "--disable-features=CalculateNativeWinOcclusion",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "about:blank",
    ],
    desktop: `tbshoot-web-${port}`,
    env: process.env,
  });
  // ended as an IDE is, by the lane: by its process id, with every process it started
  run.lane.run = browser;
  const c = await waitFor(
    null,
    async () => {
      try {
        return await attach(port, "about:blank");
      } catch {
        return null;
      }
    },
    { timeout: 30000, interval: 250 },
  );
  if (!c) throw new Error("Chrome never offered its page on its DevTools port");
  c.dialogs = [];
  run.lane.c = c;
  await c.send("Page.enable");
  await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  return c;
}

async function prepareWeb(run) {
  run.step = "shoot";
  return { c: run.c };
}

// Loads `url` into the page at `width` by IDE_SIZE.height CSS pixels, and waits until it and
// its fonts and images have loaded.
async function webPage(c, url, width) {
  await c.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: IDE_SIZE.height,
    deviceScaleFactor: SCALE,
    mobile: false,
  });
  await c.send("Page.navigate", { url });
  const loaded = `document.readyState === "complete" && document.fonts.status === "loaded" && [...document.images].every((i) => i.complete)`;
  if (
    !(await waitFor(c, () => c.evaluate(`location.href !== "about:blank" && ${loaded}`), {
      timeout: 60000,
      interval: 250,
    }))
  ) {
    throw new Error(`${url} did not finish loading`);
  }
  await quiet(c);
}

// The element the expression `find` gives, scrolled so that its top is `top` CSS pixels below
// the window's (out from under a page's fixed header), once what scrolling into view starts has
// settled; its box. A page that is still building itself after it has loaded (Microsoft's
// replaces its content, and the document's scroll goes back to the top) is waited for: the page
// is left until nothing in it has changed for a second, then scrolled, and that again until
// the element stays where it was put.
async function scrolledTo(c, find, top) {
  const at = () =>
    c.evaluate(
      `(() => { const e = ${find}; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
    );
  for (let i = 0; i < 6; i++) {
    await dialogStill(c, { ms: 1000, timeout: 15000, root: "document.body", what: "page" });
    const box = await waitFor(c, at, { timeout: 15000, interval: 200 });
    if (!box) throw new Error(`nothing on the page answers ${find}`);
    if (Math.abs(box.y - top) < 1) return box;
    await c.evaluate(`window.scrollBy(0, ${Math.round(box.y - top)})`);
    await sleep(500);
  }
  throw new Error(`the page would not keep ${find} where it was scrolled to`);
}

// A capture's clip is in the document's coordinates, not the window's: the window's box `r`,
// inside a window `width` CSS pixels wide, snapped to whole device pixels and moved by how far
// the page is scrolled.
async function pageClip(c, r, width) {
  const clip = snapOut(r, width);
  const { x, y } = await c.evaluate("({ x: scrollX, y: scrollY })");
  return { ...clip, x: clip.x + x, y: clip.y + y };
}

// Microsoft's WebView2 download page, its three cards: the arrow and the ring point at the
// Evergreen Standalone Installer's x86 download. At the width of a desktop's window, where the
// cards are in one row and the Fixed Version's two lists side by side.
const WV2_HEADING = `[...document.querySelectorAll("h2")].find((h) => /Download the WebView2 Runtime/.test(h.textContent))`;
const WV2_CARD = { css: "h3", text: "Evergreen Standalone Installer" };
const WV2_WIDTH = 1280;
const webView2Shot = {
  out: "Miscellaneous/Images/94490c87-fafe-4d5b-ae39-d3cedba1c21d.png",
  setup: "web",
  once: true,
  async take({ c }) {
    await webPage(c, "https://developer.microsoft.com/en-us/microsoft-edge/webview2", WV2_WIDTH);
    const heading = await scrolledTo(c, WV2_HEADING, 100);
    const cards = await c.evaluate(`(() => {
  const r = document.querySelector(".block-webview2").getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);
    const area = {
      x: cards.x - 8,
      y: heading.y - 24,
      width: cards.width + 16,
      height: cards.y + cards.height + 16 - heading.y + 24,
    };
    try {
      const { box } = await annotateOver(c, [
        { type: "arrow", from: { of: WV2_CARD, at: "left", dx: -44 }, to: { of: WV2_CARD, at: "left", dx: -2 } },
        { type: "ring", on: { css: "button", text: "x86" } },
      ]);
      // The Version list's arrow, an 8 by 9 inline SVG, changes a pixel by more than a
      // capture's noise from frame to frame, with animations and transitions off.
      return await capture(c, "webview2", await pageClip(c, union(area, box), WV2_WIDTH), {
        unsteady: [{ on: { css: "#version .px-dropdown__icon" } }],
      });
    } finally {
      await unannotate(c);
    }
  },
};

// The newest twinBASIC release on GitHub, its Assets list opened with a real click, as the
// FAQ tells the reader to: the first release of the repository's list of releases, in a window
// wide enough for the start of the file's SHA-256. The list, without the release's box around it.
const ASSETS = `[...document.querySelectorAll("summary")].find((s) => /^Assets/.test(s.textContent.trim()))`;
const RELEASE_WIDTH = 1280;
const releaseShot = {
  out: "Miscellaneous/Images/ac019c1a-dcef-4964-a730-bc5b86c644ba.png",
  setup: "web",
  once: true,
  async take({ c }) {
    await webPage(c, "https://github.com/twinbasic/twinbasic/releases", RELEASE_WIDTH);
    const summary = await scrolledTo(c, ASSETS, 120);
    const open = () => c.evaluate(`${ASSETS}.parentElement.open && /\\.zip/.test(${ASSETS}.parentElement.innerText)`);
    if (!(await open())) {
      await clickAt(c, summary.x + 20, summary.y + summary.height / 2);
      if (!(await waitFor(c, open, { timeout: 15000, interval: 200 }))) throw new Error("the Assets list did not open");
    }
    await dialogStill(c, { ms: 500, timeout: 10000, root: `${ASSETS}.parentElement`, what: "Assets list" });
    const list = await c.evaluate(
      `(() => { const r = ${ASSETS}.parentElement.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
    );
    return capture(c, "release", await pageClip(c, grow(list, 12), RELEASE_WIDTH), { away: () => parkMouse(c) });
  },
};

const notIdeShots = [importShot, webpageShot, webView2Shot, releaseShot];

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

  // The detached window with a page; attached again afterwards, as the other theme's pass
  // starts with the pane.
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
      let png;
      try {
        await pageDrawn(win, frame);
        png = await snap(win, "Window", null, { frame });
      } finally {
        frame.close();
      }
      // The help back in the pane, with the window's Attach button, for the pictures of the
      // next theme.
      const back = await consoleMark(c);
      await win.evaluate(`document.getElementById("helpAttach").click()`);
      if (!(await waitFor(c, async () => (await addinLines(back)).includes("attached"), { timeout: 30000 }))) {
        throw new Error(`the window's Attach did not attach: ${JSON.stringify(await addinLines(back))}`);
      }
      return png;
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
  servicesShot,
  servicesTooltipShot,
  communityShot,
  limitedShot,
  unavailableShot,
  unavailableTooltipShot,
  splashShot,
  menuBarShot,
  menuShot("Menu_File", "File"),
  menuShot("Menu_Project", "Project"),
  menuShot("Menu_Format", "Format"),
  // the Debug menu while a program is paused, the Run menu while one runs
  menuShot("Menu_Debug", "Debug", null, { setup: "debugging", before: pausedForMenu, after: debugReset }),
  menuShot("Menu_Run", "Run", null, { setup: "debugging", before: runningForMenu, after: debugReset }),
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
  ...formsChapterShots,
  ...customControlsShots,
  ...customControlsCodeShots,
  ...codeShots,
  ...sample9Shots,
  featureMapShot,
  ...codeChapterShots,
  ...debuggingShots,
  newProjectOptionsShot,
  ...programShots,
  ...codeLensShots,
  memoryShot,
  packageBuildShot,
  fusionShot,
  ...packageServerShots,
  ...notIdeShots,
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
  "code-chapter": [
    { suffix: "-2", from: "IDE/Code/Images/Combos.png" },
    { suffix: "-3", from: "IDE/Code/Images/Paste_As_Comment.png" },
  ],
  debugging: [
    { suffix: "-2", from: "IDE/Debugging/Images/Variables_Expanded.png" },
    { suffix: "-3", from: "IDE/Debugging/Images/CallStack_Frames.png" },
  ],
  customcontrols: [
    { suffix: "-2", from: "Tutorials/CustomControls/Images/ccMyFieldClass.png" },
    { suffix: "-3", from: "Tutorials/CustomControls/Images/ccCustomControlAttribute.png" },
  ],
};

// About how long each job takes, in seconds, for queuing the longest first. They also decide
// which IDEs run side by side, and that can move a few anti-aliased pixels: with sample
// started after no-project, Diagnostics came out with 34 pixels of one arrow's edge a grey
// level or two off, twice. Rerun twice after changing them.
const JOB_SECONDS = {
  help: 79,
  project: 22,
  community: 25,
  splash: 15,
  sample: 57,
  "sample-2": 130,
  "sample-3": 106,
  settings: 45,
  "settings-symbols": 10,
  "settings-webview2": 24,
  "settings-fusion": 14,
  glyphs: 45,
  "global-search": 45,
  sample6: 21,
  designer: 61,
  forms: 40,
  "forms-chapter": 90,
  customcontrols: 54,
  "customcontrols-2": 53,
  "customcontrols-3": 35,
  code: 33,
  sample9: 11,
  featuremap: 39,
  "code-chapter": 95,
  "code-chapter-2": 85,
  "code-chapter-3": 100,
  debugging: 74,
  "debugging-2": 64,
  "debugging-3": 71,
  "no-project": 68,
  "no-project-2": 59,
  "no-project-3": 70,
  programs: 45,
  codelens: 35,
  memory: 30,
  package: 25,
  fusion: 20,
  "package-server": 150,
  "settings-linked": 12,
  "package-check": 15,
  import: 20,
  webpage: 20,
  web: 20,
};

// ---------------------------------------------------------------- run

// --only selects a shot by its dark picture's path or its light one's, and a shot is taken in both.
const selected = SHOTS.filter((s) => !only || THEMES.some((theme) => only.test(themedOut(s.out, theme))));
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

// The build folder the package and fusion setups write into, the APPDATA of the
// package-server setup and the VB6 project the import setup stages, removed at the end unless
// it was there before the run; the APPDATA and the project, the tool's own, are removed either way.
const removePackageRoot = !existsSync(PACKAGE_ROOT)
  ? () => rmSync(PACKAGE_ROOT, { recursive: true, force: true })
  : () => {
      if (wanted.includes("package-server")) rmSync(PACKAGES_APPDATA, { recursive: true, force: true });
      if (wanted.includes("import")) rmSync(VBP_ROOT, { recursive: true, force: true });
    };

const running = new Set(); // the jobs with an IDE open: { lane, server }

function restoreSettings() {
  if (settingsBefore) restoreKeys(settingsBefore);
}

exitOnCrash(() => {
  console.error("putting the registry back after the crash");
  for (const run of running) if (run.lane.run) shutdownIde(run.lane.run);
  finishTidy(tidy);
  restoreSettings();
  removePackageRoot();
});

// How many pictures of each theme came out in each state, for the run's last lines.
const tally = { dark: {}, light: {} };
const count = (theme, state) => {
  tally[theme][state] = (tally[theme][state] ?? 0) + 1;
};
const pngSize = (png) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });

// How far, in device pixels, a light picture's width or height may be from the dark one's.
// The Light theme lays the window out a little differently (its toolbar is 4 CSS pixels
// shorter, a panel's title bar 3, some buttons narrower), so a clip worked out from the page's
// elements comes out up to a few pixels off, and the page shows each picture at its own size
// (builder/theme-pictures.mjs). A larger difference is not the theme's: most likely the IDE
// was not in the state the dark picture shows.
const SIZE_SLACK = 32;

// Writes a picture when its bytes differ from the file's; says which. `out` is the dark
// picture's path. A light picture is compared with the dark one (`dark`, this run's, or the
// file's): one with the same pixels, but for a capture's noise (`nearly`), is not kept, and a
// light file there already is removed, since the page shows X.png in both themes then; one
// more than SIZE_SLACK off its size fails. A picture within a capture's noise of its file is
// not written either.
function keep(name, out, png, theme, dark, scale = SCALE) {
  const file = path.join(outRoot, themedOut(out, theme));
  const { w, h } = pngSize(png);
  let other = "";
  if (theme === "light" && dark) {
    const d = pngSize(dark);
    if (Math.abs(d.w - w) > SIZE_SLACK || Math.abs(d.h - h) > SIZE_SLACK) {
      writeDiff(name, themedOut(out, theme), dark, png, {
        suffix: ".size",
        labels: { before: "DARK", after: "LIGHT" },
      });
      throw new Error(
        `the light picture is ${w}x${h} px and the dark one ${d.w}x${d.h} px: more than the theme's layout moves`,
      );
    }
    if (d.w !== w || d.h !== h) {
      count(theme, "of another size than the dark picture");
      other = `; the dark picture is ${d.w}x${d.h} px`;
    }
    if (nearly(dark, png)) {
      const had = existsSync(file);
      if (had) rmSync(file);
      count(theme, "the same as the dark picture");
      say(
        name,
        `${themedOut(out, theme)}: the dark picture's pixels, but for a capture's noise: ${had ? "removed" : "not written"}`,
      );
      return false;
    }
  }
  mkdirSync(path.dirname(file), { recursive: true });
  let state = "new";
  let write = true;
  if (existsSync(file)) {
    const was = readFileSync(file);
    if (was.equals(png)) {
      state = "unchanged";
      write = false;
    } else if (nearly(was, png)) {
      // a run now and then settles on the other version of a capture's noise for every
      // capture of a state (WIP.Screenshots.md, Capture): the file stays as it is
      state = "unchanged but for a capture's noise";
      write = false;
      writeDiff(name, themedOut(out, theme), was, png, { suffix: ".noise" });
    } else {
      state = "updated";
      writeDiff(name, themedOut(out, theme), was, png);
    }
  }
  if (write) writeFileSync(file, png);
  count(theme, state);
  say(
    name,
    `${themedOut(out, theme)}: ${state} (${w}x${h} px, ${png.length} bytes; shown at {:width="${Math.round(w / scale)}" height="${Math.round(h / scale)}"}${other})`,
  );
}

// A `once` picture has no light file: one left from before is removed, and its SVG.
function dropLight(name, out) {
  const svg = path.join(outRoot, themedOut(out, "light").replace(/\.png$/i, ".svg"));
  if (existsSync(svg)) rmSync(svg);
  if (bundlesRoot) dropBundle(bundlesRoot, themedOut(out, "light"));
  const file = path.join(outRoot, themedOut(out, "light"));
  if (!existsSync(file)) return;
  rmSync(file);
  say(name, `${themedOut(out, "light")}: removed (the picture is taken once, in no theme)`);
}

// With --svg: one headless browser for the whole run, which renders each SVG to
// compare it with its PNG; and a line per picture for the summary.
let svgBrowser = null;
const svgResults = [];

// Writes a picture's SVG beside its PNG when it is faithful to the PNG it was
// taken with (keep.mjs) and its bytes differ from the file's, refused when it
// holds the user name; an SVG that is not faithful is not written, and one
// written before is removed. Says how much of it differs from the PNG. The
// picture's bundle goes to the bundle cache whether or not its SVG is written,
// so that replay.mjs can draw it again once the converter draws it better.
async function keepSvg(name, out, png, picture) {
  const svgOut = out.replace(/\.png$/i, ".svg");
  const file = path.join(outRoot, svgOut);
  const drop = (why) => {
    const had = existsSync(file);
    if (had) rmSync(file);
    say(name, `${svgOut}: ${had ? "removed" : "not written"}, the PNG is kept (${why})`);
  };
  if (!picture) {
    drop("the picture is not a single capture");
    return;
  }
  const { svg, stats, misses, bundle } = picture;
  if (holdsUserName(svg, USER)) throw new Error(`the SVG of ${out} holds the Windows user name`);
  // The bundle names the PNG as the file holds it: a capture within the noise of the file
  // leaves the file as it was, and that file is what replay.mjs compares with.
  const pngFile = path.join(outRoot, out);
  if (bundlesRoot) writeBundle(bundlesRoot, out, bundle, existsSync(pngFile) ? readFileSync(pngFile) : png, misses);
  svgBrowser ??= launchBrowser();
  const { diff, faithful, measures } = await judgeSvg(await svgBrowser, svg, png, stats);
  if (diffsRoot) {
    mkdirSync(diffsRoot, { recursive: true });
    writeFileSync(
      path.join(diffsRoot, `${out.replace(/[\\/]/g, "__").replace(/\.png$/i, "")}.svg-diff.png`),
      diff.diff,
    );
  }
  const bytes = Buffer.byteLength(svg);
  svgResults.push({ out: svgOut, bytes, png: png.length, faithful, ...diff.stats });
  if (!faithful) {
    drop(measures);
    // To see what went wrong, the SVG goes beside its difference map.
    if (diffsRoot)
      writeFileSync(path.join(diffsRoot, `${out.replace(/[\\/]/g, "__").replace(/\.png$/i, "")}.svg`), svg);
    return;
  }
  const state = writeSvg(file, svg);
  say(
    name,
    `${svgOut}: ${state} (${(bytes / 1024).toFixed(0)} KB against the PNG's ${(png.length / 1024).toFixed(0)} KB; ${measures})`,
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

// What a setup's page holds once it is prepared and that its shots change: the editor's
// tabs, the Tabs List's Recently Closed, and the context's own keys (a take that does
// something once records it there, as closedResources does).
async function setupState(c, ctx) {
  return {
    tabs: (await editorTabs(c)).map((t) => t.name),
    recent: await c.evaluate("typeof g_RecentlyClosedTabs === 'undefined' ? null : [...g_RecentlyClosedTabs]"),
    keys: Object.keys(ctx),
  };
}

// Between the two themes' passes: the setup back to the state it was prepared in, as near
// as the page allows, so that the second pass's shots start where the first's did. Nothing
// open; the tabs opened since closed with their changes discarded (the page's own: nothing
// is saved), Recently Closed as it was, and what the takes recorded in the context dropped.
async function backToPrepared(c, ctx, was) {
  await resetUi(c);
  await closeTabs(c, was.tabs, { discard: true });
  if (was.recent) await c.evaluate(`g_RecentlyClosedTabs = ${JSON.stringify(was.recent)}`);
  for (const k of Object.keys(ctx)) if (!was.keys.includes(k)) delete ctx[k];
  await parkMouse(c);
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
    // Each picture in dark, then the IDE in Light and each again, in the same IDE: a shot sets
    // the state it shows, and backToPrepared puts back what the shots leave behind that a
    // later one sees (tabs, Recently Closed, a take's done-once marks). A light picture
    // with no file yet prefers a capture equal to the dark picture, so that one the theme
    // does not change comes out identical to it rather than a capture's noise away.
    // A `once` shot, a picture the IDE's theme has no part in (a running program's window), is
    // taken in the dark pass only; a job of them has no light pass.
    const darks = new Map();
    const prepared = await setupState(run.c, ctx);
    for (const theme of THEMES) {
      const shots = theme === "dark" ? job.shots : job.shots.filter((s) => !s.once);
      if (!shots.length) continue;
      if (theme !== "dark") {
        await backToPrepared(run.c, ctx, prepared);
        await ensureTheme(run.c, theme);
        say(job.name, `the IDE in its ${THEME_NAME[theme]} theme`);
      }
      for (const shot of shots) {
        const out = themedOut(shot.out, theme);
        const file = path.join(outRoot, out);
        const darkFile = path.join(outRoot, shot.out);
        const dark =
          theme === "dark" ? null : (darks.get(shot.out) ?? (existsSync(darkFile) ? readFileSync(darkFile) : null));
        state.reference = existsSync(file) ? readFileSync(file) : null;
        state.prefer = dark;
        state.out = out;
        state.svg = null;
        try {
          // a take returns the PNG's bytes, or { png, scale } for a picture not at SCALE
          const taken = await shot.take(ctx);
          const png = Buffer.isBuffer(taken) ? taken : taken.png;
          if (theme === "dark") darks.set(shot.out, png);
          const kept = keep(job.name, shot.out, png, theme, dark, Buffer.isBuffer(taken) ? SCALE : taken.scale);
          if (shot.once) dropLight(job.name, shot.out);
          // A light picture that is the dark one is not kept, and neither is its SVG or bundle.
          const svgFile = path.join(outRoot, out.replace(/\.png$/i, ".svg"));
          if (values.svg && kept !== false) await keepSvg(job.name, out, png, state.svg);
          else if (values.svg) {
            if (existsSync(svgFile)) rmSync(svgFile);
            dropBundle(bundlesRoot, out);
          }
        } catch (e) {
          complain(job.name, `${out}: FAILED: ${e.message}`);
          count(theme, "failed");
          failed = 1;
        } finally {
          state.reference = null;
          state.prefer = null;
          state.out = null;
        }
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
for (const theme of THEMES) {
  const states = Object.entries(tally[theme]).map(([state, n]) => `${n} ${state}`);
  console.log(`${THEME_NAME[theme]}: ${states.join(", ") || "none taken"}`);
}
if (svgBrowser) {
  await (await svgBrowser).close();
  const kept = svgResults.filter((r) => r.faithful);
  const sum = (k) => kept.reduce((n, r) => n + r[k], 0);
  console.log(
    `SVG: ${kept.length} pictures, ${(sum("bytes") / 1048576).toFixed(1)} MB against their PNGs' ${(sum("png") / 1048576).toFixed(1)} MB; ` +
      `${svgResults.length - kept.length} left as PNG, more than ${SVG_FAITHFUL}% of their pixels strongly off. The furthest from their PNGs:`,
  );
  for (const r of svgResults.toSorted((a, b) => b.pct96 - a.pct96 || b.pct32 - a.pct32).slice(0, 15))
    console.log(
      `  ${r.pct32.toFixed(2).padStart(6)}% ${r.pct96.toFixed(2).padStart(6)}%  ${r.out}${r.faithful ? "" : "  (PNG kept)"}`,
    );
}

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
try {
  removePackageRoot();
} catch (e) {
  problems.push(`${PACKAGE_ROOT} could not be removed (${e.code})`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(3);
}
console.log(
  `the registry${settingsBefore ? ` and the ${savedApps.join(" and ")} settings are` : " is"} as ${settingsBefore ? "they were" : "it was"} found`,
);
process.exit(failed);
