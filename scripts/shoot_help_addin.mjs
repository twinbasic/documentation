#!/usr/bin/env node
// Take the screenshots of the help add-in (add-in/) for its documentation page,
// docs/IDE/AddIns/, from an IDE on a private desktop: one run rewrites every
// image after a new BETA, and rewrites none that has not changed.
//
//     node scripts/shoot_help_addin.mjs [options]
//
// No wrapper, and not a gate, for the reasons try-help-addin.bat is not one: it
// needs Windows and a twinBASIC install. It is set up as try_help_addin.mjs
// sets an IDE up (a lane of addin-test, lib/tb-lane.mjs) and keeps its rules,
// so that taking the pictures changes nothing the user owns:
//
//   * The add-in is built into a copy of the install made in the work folder,
//     and the IDE has an APPDATA of its own there, so none of the user's
//     add-ins loads. TB_ADDIN_TEST is on, so Open in browser starts nothing.
//   * The IDE's registry entries and the add-in's SaveSetting key (tbDocsHelp)
//     are recorded first and put back at the end. The key is also emptied
//     for the run: the user's own may say Detached, and then F1 would open the
//     window and never the pane.
//   * The pane's pages come from the built site, docs/_site, served on
//     localhost, so build.bat has to have run.
//
// What makes the pictures repeatable, so that a second run changes no byte:
//
//   * The IDE's page is given a fixed size and density, 1280 by 800 CSS pixels
//     at 2x, through the DevTools device-metrics override. The IDE lays itself
//     out inside that cleanly, whatever the private desktop's size, and a
//     capture of a rectangle (Page.captureScreenshot with a clip) is then
//     exactly twice the rectangle's size.
//   * Animations, transitions, the text caret and Monaco's cursor are turned
//     off by a style sheet put into the document and into every shadow root
//     (a tool window is one). Otherwise a blink or a fade is in some captures.
//   * The theme is dark, as the documentation shows it, and no picture holds
//     the DEBUG CONSOLE, whose lines carry the time they were written.
//   * The IDE is given the title bar the detached help window draws for
//     itself (TB_DOCS_HELP_REAL_TITLEBAR=0), not a native Windows one.
//
// The code in the pictures is test/addin/helpdemo, a small program that reads
// as a reader's own. The tool finds each name it presses F1 on by searching the
// source, so a change to the program does not move a case.
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
import { attach } from "./lib/tb-cdp.mjs";
import { consoleMark, linesSince } from "./lib/tb-ide-console.mjs";
import { removeTree } from "./lib/tb-ide-copy.mjs";
import { shutdownIde, sleep } from "./lib/tb-ide.mjs";
import { findIde } from "./lib/tb-install.mjs";
import { Lane } from "./lib/tb-lane.mjs";
import { click, listViewItems, openFile, pressKey, setCursor, typeText, waitFor } from "./lib/tb-operate.mjs";
import { claimPorts } from "./lib/tb-ports.mjs";
import { deleteSettings, finishTidy, restoreKeys, settingsKey, snapshotKeys, startTidy } from "./lib/tb-registry.mjs";

const SETTINGS = "tbDocsHelp";
const PANE = "tbDocsHelpPane";
const ADDIN = path.join(REPO_ROOT, "add-in");
const DEMO = path.join(REPO_ROOT, "test", "addin", "helpdemo");
const DEMO_FILE = "/Inventory/Sources/Inventory.twin";
const DEMO_SOURCE = path.join(DEMO, "Sources", "Inventory.twin");
const SITE = path.join(REPO_ROOT, "docs", "_site");
const DEFAULT_OUT = path.join(REPO_ROOT, "docs", "IDE", "AddIns", "Images");

// The IDE page's size in CSS pixels, and the detached window's. Both at 2x.
const IDE_SIZE = { width: 1280, height: 880 };
const WINDOW_SIZE = { width: 900, height: 700 };
const SCALE = 2;

const USAGE = `usage: node scripts/shoot_help_addin.mjs [--only <regex>] [--out <dir>] [--port N] [--ide <twinBASIC.exe>] [-h, --help]

Builds the help add-in in add-in/ into a copy of the install, opens
test/addin/helpdemo in an IDE on a private desktop, operates it, and writes the
pictures of the add-in's documentation page, Help_<Name>.png, at 2x in the dark
theme. A picture is written only when its bytes differ from the file already
there; each is reported as new, updated or unchanged. The IDE's registry entries
and the add-in's saved settings are put back afterwards. The pane's pages come
from docs/_site, so run build.bat first.

A picture is refused, and the run fails, when the visible text of the page it
was taken from holds the Windows user name.

  --only <regex>   only the pictures whose name (Pane, Hover, Search, Choices,
                   Description, Settings, Window, Toolbar) matches
  --out <dir>      where the pictures go (default docs/IDE/AddIns/Images)
  --port <n>       the IDE's DevTools port: the first free one from n (default
                   9620); the detached window's is the next free one after it,
                   and the IDE that builds the add-in takes the one after that
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
  numberOption(values.port ?? "9620", { option: "--port", integer: true, min: 1, max: 65535 }),
);
const outDir = path.resolve(values.out ?? DEFAULT_OUT);

const ide = findIde(values.ide || undefined);
if (!ide || !existsSync(ide)) {
  die(
    2,
    "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
      "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
}
if (!existsSync(path.join(SITE, "tB", "symbols.json"))) die(2, `no built site in ${SITE}: run build.bat first`);

// ---------------------------------------------------------------- the demo's names

// A place in the demo's source: the line holding `inLine`, and the column
// (1-based) `offset` characters into the first `token` in that line.
const demoLines = readFileSync(DEMO_SOURCE, "utf8").split("\n");
function place(inLine, token, offset) {
  const line = demoLines.findIndex((l) => l.includes(inLine));
  if (line < 0) die(2, `${DEMO_SOURCE} has no line with ${JSON.stringify(inLine)}`);
  const at = demoLines[line].indexOf(token, demoLines[line].indexOf(inLine));
  if (at < 0) die(2, `${JSON.stringify(token)} is not in the line with ${JSON.stringify(inLine)}`);
  return { line: line + 1, column: at + 1 + offset };
}
// F1 and the hover work on any column of a name; the middle letters are safe.
const AT = {
  msgBox: place('MsgBox "Total', "MsgBox", 2),
  hover: place("As New Collection", "Collection", 3),
  add: place('prices.Add "Widget"', ".Add", 2),
  totalPrice: place("& TotalPrice(", "TotalPrice", 3),
};

// ---------------------------------------------------------------- what to shoot

// Each shot is one file, named for the page's figure, and a function that
// leaves the IDE showing it and returns what to capture. Run in the order of
// the page; each brings the IDE to the state it needs and leaves it usable.
const HELP_PAGE = "/tB/Modules/Interaction/MsgBox";

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

async function main(ctx) {
  const { c, origin, windowPort, user, addinLines, results } = ctx;

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

  // ---- capturing
  async function textOf(conn, withFrame) {
    let text = await conn.evaluate(VISIBLE_TEXT);
    if (withFrame) text += `\n${await frameEval(conn, withFrame, "document.body.innerText").catch(() => "")}`;
    return text;
  }
  // A capture of `clip` (CSS pixels, whole numbers) from `conn`, refused when
  // the page's visible text holds the user name. The mouse goes to the page's
  // corner first, since a control under it draws its hover look, unless the
  // picture is of what the mouse rests on.
  async function capture(conn, name, clip, { frame, resting = false } = {}) {
    const text = await textOf(conn, frame);
    if (text.toLowerCase().includes(user.toLowerCase()))
      throw new Error(`the page for ${name} shows the Windows user name`);
    if (conn === c && !resting) await mouseAway(c);
    await quiet(conn);
    await sleep(300);
    const params = { format: "png" };
    if (clip) params.clip = { ...clip, scale: 1 };
    const { data } = await conn.send("Page.captureScreenshot", params);
    return Buffer.from(data, "base64");
  }

  // ---- the shots
  const shots = [];
  const shoot = (name, fn) => shots.push({ name, fn });

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
      return await capture(c, "Pane", clip, { frame: origin });
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
      const png = await capture(c, "Hover", clip, { resting: true });
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
    const png = await capture(c, "Search", await listClip(), { frame: origin });
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
    const png = await capture(c, "Choices", await listClip(), { frame: origin });
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
    return capture(c, "Description", inside({ ...pane, height: 170 }), { frame: origin });
  });

  // The settings panel the gear opens, with the top of the page under it.
  shoot("Settings", async () => {
    await showPage(AT.msgBox, HELP_PAGE);
    await click(c, { toolWindow: PANE, css: "#helpSettings" });
    if (!(await waitFor(c, settingsOpen))) throw new Error("the gear did not open the settings panel");
    await sleep(500);
    await paneAside();
    const pane = await paneRect();
    // 150 CSS pixels ends between the page's heading and its first paragraph.
    const png = await capture(c, "Settings", inside({ ...pane, height: 150 }), { frame: origin });
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
    return capture(c, "Toolbar", clip);
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
      return await capture(win, "Window", null, { frame: origin });
    } finally {
      win?.close();
    }
  });

  return shots;
}

// ---------------------------------------------------------------- run

mkdirSync(outDir, { recursive: true });
let port;
let windowPort;
let buildPort;
try {
  [port, windowPort, buildPort] = await claimPorts(3, { from: firstPort });
} catch (e) {
  die(2, e.message);
}

const work = path.join(tmpdir(), "tbshoot-help", String(port));
try {
  removeTree(work);
} catch (e) {
  die(2, `${work} could not be emptied (${e.code}): is an IDE from an earlier run still open?`);
}
mkdirSync(work, { recursive: true });
const tidy = startTidy({ prefixes: [work] });
if (!tidy) die(2, "could not record the registry, so it could not be put back afterwards");
const settingsBefore = snapshotKeys([settingsKey(SETTINGS)]);
// The add-in's saved settings are the user's; a run starts from none.
deleteSettings([SETTINGS]);

const lane = new Lane({ name: "shoot", port, work, ide, show: false });
let server = null;

// Puts everything back; returns the problems, as lines.
async function putBack() {
  const problems = [];
  try {
    await lane.close();
  } catch (e) {
    console.error(e.message);
  }
  server?.close();
  if (!finishTidy(tidy)) problems.push("the IDE's registry entries could not be put back (see the warning above)");
  try {
    restoreKeys(settingsBefore);
  } catch (e) {
    problems.push(`the ${SETTINGS} settings could not be put back: ${e.message}`);
  }
  try {
    removeTree(work);
  } catch (e) {
    problems.push(`${work} could not be removed (${e.code})`);
  }
  return problems;
}

exitOnCrash(() => {
  console.error("putting the registry back after the crash");
  shutdownIde(lane.run);
  finishTidy(tidy);
  restoreKeys(settingsBefore);
});

// Writes a picture when its bytes differ from the file's; says which.
function keep(name, png) {
  const file = path.join(outDir, `Help_${name}.png`);
  let state = "new";
  if (existsSync(file)) state = readFileSync(file).equals(png) ? "unchanged" : "updated";
  if (state !== "unchanged") writeFileSync(file, png);
  const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)} px, ${png.length} bytes`;
  console.log(`Help_${name}.png: ${state} (${size})`);
}

// The exit code for an error from one step: 1 when it is the add-in's or the
// project's own fault, 2 when the tool failed.
let failed = 0;
let step = "the site";
const t0 = Date.now();
try {
  const files = createStaticHandler(SITE);
  server = await serveLoopback((req, res) => files(req, res));
  const origin = `http://localhost:${server.port}`;
  step = "build";
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
  await lane.addAddin(src, { show: false, port: buildPort });
  step = "open";
  console.log(`opening ${path.relative(REPO_ROOT, DEMO)}`);
  const c = await lane.open(DEMO, {
    env: {
      TB_DOCS_HELP_SITE: origin,
      TB_DOCS_HELP_WINDOW_PORT: String(windowPort),
      TB_DOCS_HELP_REAL_TITLEBAR: "0",
    },
  });
  step = "shoot";
  const addinLines = (mark) => linesSince(c, mark, { prefix: "[tbDocsHelp] " });
  if (
    !(await waitFor(c, async () => (await addinLines(null)).some((l) => l.startsWith("loaded")), { timeout: 30000 }))
  ) {
    throw new Error("the add-in never printed its loaded line");
  }
  await openFile(c, DEMO_FILE, { line: 1, column: 1 });
  // the dark theme, as the documentation shows it
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
  await c.send("Emulation.setDeviceMetricsOverride", { ...IDE_SIZE, deviceScaleFactor: SCALE, mobile: false });
  await sleep(1500);

  const ctx = {
    c,
    origin,
    windowPort,
    user: userInfo().username,
    addinLines,
    results: async () => (await listViewItems(c, { toolWindow: PANE, css: "#helpResults" })).map((i) => i.text),
  };
  const shots = await main(ctx);
  for (const { name, fn } of shots) {
    if (only && !only.test(name)) continue;
    try {
      keep(name, await fn());
    } catch (e) {
      console.error(`Help_${name}.png: FAILED: ${e.message}`);
      failed = 1;
    }
  }
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
} catch (e) {
  console.error(e.message);
  // buildAddin's exitCode is tbbuild's: 1 compile errors, 4 the compiler
  // crashed. Lane.open says "does not compile" for a project with errors.
  const own =
    (step === "build" && (e.exitCode === 1 || e.exitCode === 4)) ||
    (step === "open" && / does not compile\n/.test(e.message)) ||
    step === "shoot";
  failed = own ? 1 : 2;
}
const problems = await putBack();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(3);
}
console.log("the registry and the add-in's settings are as they were found");
process.exit(failed);
