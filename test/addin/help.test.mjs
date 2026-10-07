// The help add-in, add-in/, increments 1 to 3 of Stage 4 in WIP.HelpAddin.md:
// F1 shows the page for the selection or for the name under the cursor in the
// help pane, whose search box and results list find any page of the index;
// for the name under the cursor, the compiler's hover says where it is
// declared.
//
// The add-in is built as committed, with its copy of the symbol index,
// add-in/Resources/SYMBOLS/symbols.json, embedded as a resource. This file
// serves the built site, docs/_site, on localhost and gives the add-in it as
// TB_DOCS_HELP_SITE, which Open in browser opens. The lane named help builds
// the add-in without the help archive, so the pane's frame loads that site
// too; the lane named help-offline builds it with an archive of the built
// offline tree (lib/help-archive.mjs, the writer a build uses too), so the frame
// loads the add-in's own server. Either way every page a case reaches is a page of the
// build, and nothing comes from the network. Run build.bat first.
// Each case is a line and column in helphost/Sources/Cases.twin, so a change to
// that file is a change to this table.
//
// The last cases are the Detach button, which moves the pane into a window of
// the add-in's own, a Form holding a WebView2 control. The window's page is
// read and operated over DevTools: the add-in starts the control with the
// debugging port in TB_DOCS_HELP_WINDOW_PORT, which only the test switch
// allows, and prints "window page <src>" when the frame in it has loaded.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createStaticHandler } from "../../builder/static-files.mjs";
import { writeHelpArchive } from "../../lib/help-archive.mjs";
import { attach } from "../../scripts/lib/tb-cdp.mjs";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { loadedAddins } from "../../scripts/lib/tb-ide-addins.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import {
  click,
  clickAt,
  elementRect,
  listViewItems,
  notifications,
  openedUrls,
  openFile,
  pressKey,
  select,
  setCursor,
  toolWindow,
  typeText,
  waitFor,
} from "../../scripts/lib/tb-operate.mjs";
import { claimPorts } from "../../scripts/lib/tb-ports.mjs";
import { hoverLink, hoverText, mouseAway, restMouse } from "./hover.mjs";
import { frameEval, frameOf, serveLoopback } from "./pages.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ADDIN = path.join(ROOT, "add-in");
const INDEX = path.join(ADDIN, "Resources", "SYMBOLS", "symbols.json");
const BUILT = path.join(ROOT, "docs", "_site");
const BUILT_OFFLINE = path.join(ROOT, "docs", "_site-offline");
const FRESH_GATE = path.join(ROOT, "scripts", "check_tree_fresh.mjs");
// "serving site.zip, <n> files, at <origin>", which the add-in prints when it
// has the archive.
const SERVING = /^serving site\.zip, \d+ files, at (http:\/\/localhost:\d+)$/;
const HOST = path.join(HERE, "helphost");
const FILE = "/HelpHost/Sources/Cases.twin";
const PANE = "tbDocsHelpPane";

const addinLines = async (c, mark) => linesSince(c, mark, { prefix: "[tbDocsHelp] " });

// An expression on the pane's shadow root, `root`.
const inPane = (c, body) =>
  c.evaluate(`(() => {
  const w = toolWindowsById[${JSON.stringify(PANE)}];
  if (!w) return null;
  const root = w.bodyElement.getRootNode();
  ${body}
})()`);

const frameSrc = (c) => inPane(c, `return root.querySelector("#helpPage")?.getAttribute("src") ?? null;`);
// "dark" or "light", from the IDE theme's panel colour rather than from the
// API the add-in asks (Themes.ActiveThemeNameGroup).
const themeGroup = (c) =>
  c.evaluate(`(() => {
  const probe = document.createElement("div");
  probe.style.background = "var(--themeGeneralPanelBackColor)";
  document.body.appendChild(probe);
  const [r, g, b] = getComputedStyle(probe).backgroundColor.match(/\\d+/g).map(Number);
  probe.remove();
  return 0.299 * r + 0.587 * g + 0.114 * b < 128 ? "dark" : "light";
})()`);
const focusedId = (c) => inPane(c, "return root.activeElement?.id ?? null;");
const searchValue = (c) => inPane(c, `return root.querySelector("#helpSearch")?.value ?? null;`);
const results = async (c) => (await listViewItems(c, { toolWindow: PANE, css: "#helpResults" })).map((i) => i.text);
// The results list's height, one drawn row's, the whole pane's,
// and whether the list's scrollbar shows; null while the list is hidden. The
// list view keeps a hidden copy of a row to measure with, so the row is the
// first one with a height.
const resultsBox = (c) =>
  inPane(
    c,
    `const l = root.querySelector("#helpResults");
  if (!l || l.style.display === "none") return null;
  const heights = [...l.querySelectorAll(".hit, .none")].map((e) => e.getBoundingClientRect().height);
  return {
    height: l.getBoundingClientRect().height,
    row: heights.find((h) => h > 0) ?? null,
    pane: root.querySelector("#helpWrap").getBoundingClientRect().height,
    scrollbar: getComputedStyle(l.querySelector(".scrollBackV")).display !== "none",
  };`,
  );
// What shows in place of the page for a name with none: null while the page shows.
const summary = (c) =>
  inPane(
    c,
    `const s = root.querySelector("#helpSummary");
  if (!s || s.style.display === "none") return null;
  const text = (css) => s.querySelector(css)?.textContent ?? null;
  return {
    declaration: text(".declaration"),
    description: text(".description"),
    where: text(".where"),
    frameHidden: root.querySelector("#helpPage").style.display === "none",
    browserDisabled: root.querySelector("#helpBrowser").disabled,
  };`,
  );
// Whether the frame shows, rather than a summary, with Open in browser enabled.
const pageState = (c) =>
  inPane(
    c,
    `return {
    summary: root.querySelector("#helpSummary")?.style.display ?? null,
    frame: root.querySelector("#helpPage")?.style.display ?? null,
    browserDisabled: root.querySelector("#helpBrowser")?.disabled ?? null,
  };`,
  );

async function at(c, line, column) {
  await setCursor(c, line, column);
  await sleep(100);
}

async function emptySearch(c) {
  await click(c, { toolWindow: PANE, css: "#helpSearch" });
  await pressKey(c, "End");
  for (let n = (await searchValue(c)).length; n > 0; n--) await pressKey(c, "Backspace");
}

scenario("the help add-in: F1 and the help pane", (lane) => {
  let c;
  let entries;
  let origin; // the site this file serves
  let pages; // where the frame's pages come from: origin, or the add-in's server
  let server;
  let windowPort; // the detached window's DevTools port
  const offline = lane.name === "help-offline";
  // What the IDE is started with: the site this file serves, the window's
  // debugging port, and the window's frame, which the IDE's own option
  // "Show real OS titlebar" would otherwise decide: 0 the frame the page draws
  // a title bar for, 1 the Windows one. The option is never changed.
  const ideEnv = (realTitlebar) => ({
    TB_DOCS_HELP_SITE: origin,
    TB_DOCS_HELP_WINDOW_PORT: String(windowPort),
    TB_DOCS_HELP_REAL_TITLEBAR: String(realTitlebar),
  });

  // The frame shows `url` from the built site in the IDE's theme: the add-in
  // gave it that src with ?theme= and ?pane=1, the page it loaded is the
  // build's, not a 404, and the page applied the theme and hid the site's
  // navigation and header. With `fresh`, the page is a new document: not the
  // one markFrame marked.
  async function showsPage(url, { fresh = false } = {}) {
    const group = await themeGroup(c);
    const [pagePath, fragment] = url.split("#");
    const want = `${pages}${pagePath}?theme=${group}&pane=1${fragment ? `#${fragment}` : ""}`;
    // The frame can have this src already, hidden behind a summary, so the
    // page showing again is waited for too.
    const shown = { summary: "none", frame: "", browserDisabled: false };
    const src = await waitFor(c, async (c) => {
      const s = await frameSrc(c);
      return s === want && JSON.stringify(await pageState(c)) === JSON.stringify(shown) && s;
    });
    assert.equal(src ?? (await frameSrc(c)), want, "the frame's src");
    assert.ok((await toolWindow(c, PANE))?.visible, "the pane is not showing");
    assert.deepEqual(await pageState(c), shown);
    const loaded = await waitFor(c, async (c) => {
      const f = await frameOf(c, pages);
      const loadedUrl = `${pages}${pagePath.replace(/\/$/, "")}?theme=${group}&pane=1`;
      if (!f || f.url.replace(/\/\?/, "?") !== loadedUrl) return false;
      // A src set to the URL the frame already has reloads it, and a question
      // put to the page being replaced fails: that is not loaded yet.
      const ready = `document.readyState === "complete"${fresh ? " && !window.tbDocsTestMark" : ""}`;
      return (await frameEval(c, pages, ready).catch(() => false)) === true;
    });
    if (!loaded) {
      const frames = (await c.send("Page.getFrameTree")).frameTree.childFrames ?? [];
      assert.fail(
        `the frame did not load ${want}; the page's frames: ${JSON.stringify(frames.map((f) => f.frame.url))}`,
      );
    }
    if (fragment) assert.equal((await frameOf(c, pages)).urlFragment, `#${fragment}`);
    // The status the page itself came with, after any redirect to its folder.
    const status = await frameEval(c, pages, `performance.getEntriesByType("navigation")[0]?.responseStatus`);
    assert.equal(status, 200, `${url} as served`);
    assert.equal(
      await frameEval(c, pages, `document.documentElement.getAttribute("data-theme")`),
      group,
      "the page's theme",
    );
    assert.deepEqual(await paneChrome(), PANE_CHROME, "the site's chrome in the pane");
  }

  // What the frame's page shows of the site's chrome: the pane hides the
  // sidebar and the header, and keeps the breadcrumbs and the footer.
  const PANE_CHROME = { sidebar: "none", header: "none", breadcrumbs: "block", footer: "block" };
  const paneChrome = () =>
    frameEval(
      c,
      pages,
      `(() => {
        const shown = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : "missing"; };
        return { sidebar: shown(".side-bar"), header: shown(".main-header"), breadcrumbs: shown(".breadcrumb-nav"), footer: shown("footer[role=contentinfo]") };
      })()`,
    );

  // Marks the page the frame shows now, so that showsPage can tell a page F1
  // loaded from it: F1 on the name whose page shows already loads it again,
  // and the page before the reload looks loaded until the reload begins.
  const markFrame = () => frameEval(c, pages, "window.tbDocsTestMark = true").catch(() => {});

  // The frame's origin once the add-in has loaded after `mark`: the add-in's
  // server, whose port changes with every start, or the site this file serves.
  async function pagesOrigin(mark) {
    const loaded = await waitFor(c, async (c) => (await addinLines(c, mark)).some((l) => l.startsWith("loaded")));
    assert.ok(loaded, "the add-in never printed its loaded line");
    const serving = (await addinLines(c, mark)).filter((l) => l.startsWith("serving") || l.startsWith("not serving"));
    if (!offline) {
      assert.deepEqual(serving, [], "the add-in built without the archive serves it");
      return origin;
    }
    assert.equal(serving.length, 1, `the add-in's lines about the archive: ${JSON.stringify(serving)}`);
    const m = serving[0].match(SERVING);
    assert.ok(m, `the add-in does not serve the archive: ${serving[0]}`);
    return m[1];
  }

  // Press F1 at line:column, and expect `want` in place of the page, the frame
  // hidden, Open in browser disabled, and nothing printed.
  async function f1Summary(line, column, want) {
    await at(c, line, column);
    const mark = await consoleMark(c);
    await pressKey(c, "F1");
    const got = await waitFor(c, async (c) => {
      const s = await summary(c);
      return s?.declaration === want.declaration && s;
    });
    assert.deepEqual(got || (await summary(c)), { ...want, frameHidden: true, browserDisabled: true });
    assert.ok((await toolWindow(c, PANE))?.visible, "the pane is not showing");
    assert.deepEqual(await addinLines(c, mark), [], "the add-in printed something");
  }

  // Press F1 (or run `act`), and expect `url` in the pane and nothing printed.
  async function f1Shows(url, act = () => pressKey(c, "F1")) {
    const mark = await consoleMark(c);
    await markFrame();
    await act();
    await showsPage(url, { fresh: true });
    assert.deepEqual(await addinLines(c, mark), [], "the add-in printed something");
  }

  before(async () => {
    assert.ok(fs.existsSync(path.join(BUILT, "tB", "symbols.json")), `no built site in ${BUILT}: run build.bat`);
    entries = JSON.parse(fs.readFileSync(INDEX, "utf8")).symbols.length;
    server = await serveLoopback(createStaticHandler(BUILT));
    origin = `http://localhost:${server.port}`;
    // The add-in as committed, with the archive only in the offline lane,
    // whatever add-in/Resources/HELP holds in this working tree.
    const src = path.join(lane.work, "help-src");
    fs.rmSync(src, { recursive: true, force: true });
    const skip = [path.join(ADDIN, "Build"), path.join(ADDIN, "Resources", "HELP")];
    fs.cpSync(ADDIN, src, { recursive: true, filter: (f) => !skip.includes(f) });
    if (offline) {
      // A tree older than its sources is refused, so the lane never tests
      // a previous build's pages.
      const fresh = spawnSync(process.execPath, [FRESH_GATE, "--tree", BUILT_OFFLINE], { encoding: "utf8" });
      assert.equal(fresh.status, 0, `${BUILT_OFFLINE} is stale or missing; run build.bat first:\n${fresh.stderr}`);
      try {
        await writeHelpArchive({ src: BUILT_OFFLINE, out: path.join(src, "Resources", "HELP", "site.zip") });
      } catch (err) {
        assert.fail(`writeHelpArchive failed: ${err.message}${err.problems ? `\n${err.problems.join("\n")}` : ""}`);
      }
    }
    await lane.addAddin(src);
    [windowPort] = await claimPorts(1, { from: 9760 });
    c = await lane.open(HOST, { env: ideEnv(0) });
    pages = await pagesOrigin(null);
    await openFile(c, FILE, { line: 5, column: 9 });
  });

  test("it loads with the whole index and the test switch on, and makes its pane", async () => {
    assert.ok((await loadedAddins(c)).some((a) => a.name === "twinBASIC Documentation Help"));
    const loaded = await waitFor(c, async (c) => (await addinLines(c, null)).find((l) => l.startsWith("loaded")));
    // Checked before any key is pressed: with the switch off, the add-in would
    // ignore TB_DOCS_HELP_SITE, and "Open in browser" would start a browser.
    assert.equal(loaded, `loaded, index ${entries} entries, test switch on`);
    const pane = await toolWindow(c, PANE);
    assert.equal(pane?.title, "TWINBASIC HELP");
    assert.equal(pane.visible, false);
    assert.equal(await frameSrc(c), null, "a page in the frame before any was asked for");
  });

  // Asked from here, not from the pane: the server finds a path as GitHub
  // Pages does, and sends each file as the offline tree has it.
  test("the add-in's server answers as GitHub Pages does", { skip: !offline && "the help lane" }, async () => {
    const get = (p, o = {}) => fetch(`${pages}${p}`, { redirect: "manual", signal: AbortSignal.timeout(10000), ...o });
    const tree = (rel) => fs.readFileSync(path.join(BUILT_OFFLINE, rel));

    let r = await get("/tB/Modules/Interaction/MsgBox?theme=dark&pane=1");
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(r.headers.get("content-encoding"), "gzip");
    assert.ok(Buffer.from(await r.arrayBuffer()).equals(tree("tB/Modules/Interaction/MsgBox.html")));

    r = await get("/Documentation/Images/af-vector-studio.png");
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "image/png");
    assert.equal(r.headers.get("content-encoding"), null);
    assert.ok(Buffer.from(await r.arrayBuffer()).equals(tree("Documentation/Images/af-vector-studio.png")));

    r = await get("/Features/Advanced?pane=1");
    assert.equal(r.status, 301);
    assert.equal(r.headers.get("location"), "/Features/Advanced/?pane=1");
    await r.body?.cancel();
    r = await get("/Features/Advanced/");
    assert.ok(Buffer.from(await r.arrayBuffer()).equals(tree("Features/Advanced/index.html")));

    r = await get("/no/such/page");
    assert.equal(r.status, 404);
    await r.body?.cancel();
    r = await get("/tB/Modules/Interaction/MsgBox", { method: "HEAD" });
    assert.equal(r.status, 200);
    assert.ok(Number(r.headers.get("content-length")) > 0);
  });

  // [line, column, URL] in Cases.twin; the comment says what the cursor is on.
  // The compiler's hover says where most of these are declared; the ones it
  // says nothing about (Debug.Print, a statement, a comment) take the index's
  // lookup alone.
  const CASES = [
    [5, 9, "/tB/Modules/Interaction/MsgBox", "the first letter of a name"],
    [5, 15, "/tB/Modules/Interaction/MsgBox", "just after a name"],
    [6, 27, "/tB/Modules/Interaction/MsgBox", "VBA.Interaction.MsgBox: Container.Name"],
    [6, 15, "/tB/Modules/Interaction/", "VBA.Interaction: Package.Name"],
    [7, 15, "/tB/Modules/Debug#print", "Debug.Print: the member, not the statement"],
    [7, 21, "/tB/Modules/Strings/Len", "a function inside a call"],
    [8, 9, "/tB/Core/Dim", "a statement"],
    [9, 9, "/tB/Core/Close", "a bare name: the statement wins over twelve methods"],
    [10, 28, "/tB/Packages/tbIDE/ToolWindows#add", "a chain in a comment: ToolWindows.Add"],
    [4, 12, "/tB/Modules/Collection/Add", "c.Add, c a Collection: VBA._Collection's"],
    [21, 15, "/tB/Modules/Collection/Add", ".Add inside With on a Collection"],
    [16, 35, "/tB/Packages/tbIDE/ToolWindows#add", "Host.ToolWindows.Add: tbIDE.IToolWindowsV1's"],
    [14, 25, "/tB/Packages/VB/CheckBox/#value", "a CheckBox's Value: VB._CheckBox's"],
    [14, 42, "/tB/Modules/Constants/VbMsgBoxStyle", "an enumeration's value"],
    [14, 52, "/tB/Modules/Constants/", "a constant"],
    // Hover names another procedure for these, GetAppPath and GetErrNumber,
    // but its package still picks VB's App from AppGlobalClassObject's, and
    // ErrObject.Number from every other Number.
    [14, 36, "/tB/Packages/VB/App/#path", "App.Path"],
    [14, 64, "/tB/Modules/ErrObject/Number", "Err.Number"],
  ];
  for (const [line, column, url, what] of CASES) {
    test(`F1 on ${what} (${line}:${column})`, async () => {
      await at(c, line, column);
      await f1Shows(url);
    });
  }

  test("a selection is looked up as selected", async () => {
    // "Print" alone is the bare name, where the cursor would give Debug.Print.
    await select(c, { startLine: 7, startColumn: 15, endLine: 7, endColumn: 20 });
    await sleep(100);
    await f1Shows("/tB/Core/Print");
  });

  test("a name with no page says so and leaves the page", async () => {
    const was = await frameSrc(c);
    await at(c, 8, 13);
    await pressKey(c, "F1");
    const text = "No help for 'zzqHelpProbe'";
    const shown = await waitFor(c, async (c) => (await notifications(c)).find((t) => t.trim() === text));
    assert.ok(shown, `notifications: ${JSON.stringify(await notifications(c))}`);
    await sleep(300);
    assert.equal(await frameSrc(c), was);
  });

  test("F1 with no name at the cursor puts the focus in the search box", async () => {
    await at(c, 3, 3);
    await pressKey(c, "F1");
    assert.equal(await waitFor(c, async (c) => (await focusedId(c)) === "helpSearch" && "helpSearch"), "helpSearch");
  });

  // P15: the compiler's hover gives a name's [Description]. A name declared
  // where the documentation has no page shows that in place of the page.
  test("a name the project declares shows its declaration and description, though a package has a page for it", async () => {
    // Cases.Beep, not VBA.Interaction.Beep.
    await f1Summary(18, 10, {
      declaration: "Sub Beep ( )",
      description: "Sounds the project's own tone.",
      where: "Declared in HelpHost.Cases",
    });
  });

  test("a procedure of the project with no [Description] shows its declaration", async () => {
    await f1Summary(36, 22, {
      declaration: "Function Plain ( ) As Long",
      description: "No description.",
      where: "Declared in HelpHost.Cases",
    });
  });

  test("a class of the project shows its description, without its members", async () => {
    await f1Summary(35, 24, {
      declaration: "class Gadget",
      description: "A gadget of the project's own.",
      where: "Declared in HelpHost",
    });
  });

  test("F1 on a procedure's own name where it is declared says so, and leaves the pane", async () => {
    const was = await summary(c);
    await at(c, 27, 17);
    await pressKey(c, "F1");
    const text = "No help for 'Beep': it is declared here";
    const shown = await waitFor(c, async (c) => (await notifications(c)).find((t) => t.trim() === text));
    assert.ok(shown, `notifications: ${JSON.stringify(await notifications(c))}`);
    await sleep(300);
    assert.deepEqual(await summary(c), was);
  });

  test("a member of a late-bound object lists its pages, and a click shows one", async () => {
    // o.Add, o As Object: the compiler cannot tell either, so every page of an
    // Add is listed.
    await at(c, 17, 12);
    const was = await frameSrc(c);
    await pressKey(c, "F1");
    // A list read as soon as it had items once held 3 of the 12, so wait until
    // it has stopped changing for a second.
    let list = "";
    let since = 0;
    const items = await waitFor(c, async (c) => {
      const r = await results(c);
      if (JSON.stringify(r) !== list) [list, since] = [JSON.stringify(r), Date.now()];
      return r.length > 0 && Date.now() - since >= 1000 && r;
    });
    assert.equal(items?.length, 12, JSON.stringify(items));
    assert.ok(items.includes("Collection.Addmethod") && items.includes("ToolWindows.Addmethod"), JSON.stringify(items));
    assert.equal(await searchValue(c), "o.Add");
    assert.equal(await frameSrc(c), was, "a list must not change the page");
    await f1Shows("/tB/Modules/Collection/Add", () =>
      click(c, { toolWindow: PANE, css: "#helpResults .hit .label", text: "Collection.Add" }),
    );
  });

  test("the search box finds names as typed, and Enter shows the first", async () => {
    await emptySearch(c);
    await typeText(c, "msgbo");
    const items = await waitFor(c, async (c) => {
      const r = await results(c);
      return r[0] === "Interaction.MsgBoxfunction" && r;
    });
    assert.ok(items, JSON.stringify(await results(c)));
    await f1Shows("/tB/Modules/Interaction/MsgBox", () => pressKey(c, "Enter"));
  });

  test("a search that matches nothing says so", async () => {
    await emptySearch(c);
    await typeText(c, "zzqq");
    assert.ok(
      await waitFor(c, async (c) => (await results(c)).join() === "No matches"),
      JSON.stringify(await results(c)),
    );
    // The list draws its rows a moment after it has them: no row has a height yet.
    const box = await waitFor(c, async (c) => (await resultsBox(c))?.row > 0 && (await resultsBox(c)));
    assert.ok(box && Math.abs(box.height - box.row) < 1 && !box.scrollbar, JSON.stringify(await resultsBox(c)));
  });

  test("the results list is as tall as its rows, up to 35% of the pane", async () => {
    await emptySearch(c);
    await typeText(c, "msgbo");
    // The add-in fills the list before it shows it, so wait for both.
    const few = await waitFor(c, async (c) => {
      const r = await results(c);
      return r.length > 0 && r[0] === "Interaction.MsgBoxfunction" && (await resultsBox(c))?.row > 0 && r.length;
    });
    let box = await resultsBox(c);
    assert.ok(
      box.height < 0.3 * box.pane && Math.abs(box.height - few * box.row) < 1 && !box.scrollbar,
      JSON.stringify({ few, box }),
    );
    // "a" finds the search's limit of 100, far more than 35% of the pane holds.
    await emptySearch(c);
    await typeText(c, "a");
    box = await waitFor(c, async (c) => {
      const b = await resultsBox(c);
      return b && (await results(c)).length > 0 && b.scrollbar && b;
    });
    assert.ok(box && Math.abs(box.height - 0.35 * box.pane) < 1, JSON.stringify(box));
  });

  test("the search box's clear button hides the results", async () => {
    await emptySearch(c);
    await typeText(c, "zzqq");
    assert.ok(await waitFor(c, async (c) => (await results(c)).join() === "No matches"));
    // The clear button is drawn at the box's right end, inside its padding.
    const r = await elementRect(c, { toolWindow: PANE, css: "#helpSearch" });
    await clickAt(c, r.x + r.width - 14, r.y + r.height / 2);
    assert.equal(await searchValue(c), "", "the click missed the clear button");
    assert.ok(await waitFor(c, async (c) => (await resultsBox(c)) === null), JSON.stringify(await resultsBox(c)));
  });

  test("the toolbar's Help button puts the focus in the search box", async () => {
    await at(c, 7, 21);
    await click(c, "addinButton-tbDocsHelp");
    assert.equal(await waitFor(c, async (c) => (await focusedId(c)) === "helpSearch" && "helpSearch"), "helpSearch");
  });

  // The IDE draws the pane's header, the tool-window header the detached
  // window's title bar copies; what a copy has to match is read here, while the
  // pane shows.
  let paneHeader;
  test("the pane's header is the IDE's tool-window header", async () => {
    paneHeader = await c.evaluate(`(() => {
      const h = [...document.querySelectorAll("#ADDIN_${PANE} .sectionHeader")]
        .find((e) => e.textContent.trim() === "TWINBASIC HELP");
      if (!h) return null;
      const s = getComputedStyle(h);
      return {
        height: h.getBoundingClientRect().height,
        look: { backgroundColor: s.backgroundColor, color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom },
      };
    })()`);
    assert.ok(paneHeader, "no header for the pane");
  });

  test("Open in browser opens the page the pane shows", async () => {
    const mark = await consoleMark(c);
    await click(c, { toolWindow: PANE, css: "#helpBrowser" });
    const urls = await waitFor(c, async (c) => {
      const u = await openedUrls(c, { since: mark });
      return u.length > 0 && u;
    });
    assert.deepEqual(urls, [`${origin}/tB/Modules/Interaction/MsgBox`]);
  });

  // The background, since it is not inherited: the IDE gives the tool window
  // the theme's text colour already, so the pane's would match with no CSS.
  test("the pane's colours are the IDE theme's", async () => {
    const colours = await inPane(
      c,
      `const probe = document.createElement("div");
  probe.style.background = "var(--themeGeneralPanelBackColor)";
  document.body.appendChild(probe);
  const theme = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return { theme, pane: getComputedStyle(root.querySelector("#helpWrap")).backgroundColor };`,
    );
    assert.ok(colours.theme && colours.theme !== "rgba(0, 0, 0, 0)", JSON.stringify(colours));
    assert.equal(colours.pane, colours.theme);
  });

  // Through the IDE's own commands for its theme menu, which tell the compiler,
  // and so the add-in, of the change (OnChangedTheme). The IDE saves the theme
  // where the user's own IDE reads it; the run's registry tidy puts it back
  // (restoreTheme in scripts/lib/tb-registry.mjs).
  test("a theme change loads the page again in the new theme", async () => {
    const page = "/tB/Modules/Interaction/MsgBox";
    const was = await themeGroup(c);
    const other = was === "dark" ? "light" : "dark";
    const switchTo = (group) =>
      c.evaluate(
        `executeIdeCommand(${JSON.stringify(group === "dark" ? "tbTheme_SwitchToDarkMode" : "tbTheme_SwitchToLightMode")})`,
      );
    try {
      await switchTo(other);
      assert.equal(await themeGroup(c), other, "the IDE's theme did not change");
      await showsPage(page);
    } finally {
      await switchTo(was);
    }
    await showsPage(page);
  });

  test("a compiler restart empties the pane, and the add-in puts its page back", async () => {
    // The old frame is marked, so that the frame found after is the new pane's.
    await inPane(c, `root.querySelector("#helpPage").dataset.beforeRestart = "1";`);
    const mark = await consoleMark(c);
    await lane.restartCompiler();
    pages = await pagesOrigin(mark);
    const src = await waitFor(c, (c) =>
      inPane(
        c,
        `const f = root.querySelector("#helpPage"); return f && !f.dataset.beforeRestart && f.getAttribute("src");`,
      ),
    );
    assert.equal(src, `${pages}/tB/Modules/Interaction/MsgBox?theme=${await themeGroup(c)}&pane=1`);
  });

  // A page reached from the pane's page has no parameters of its own; the site
  // keeps both for the tab.
  test("a page reached by a link keeps the IDE's theme and the pane's layout", async () => {
    await f1Shows("/tB/Modules/Interaction/MsgBox", () => at(c, 5, 9).then(() => pressKey(c, "F1")));
    const next = "/tB/Modules/Strings/Len";
    await frameEval(c, pages, `location.href = ${JSON.stringify(next)}`);
    const loaded = await waitFor(c, async (c) => {
      const f = await frameOf(c, pages);
      if (f?.url !== `${pages}${next}`) return false;
      return (await frameEval(c, pages, `document.readyState === "complete"`).catch(() => false)) === true;
    });
    assert.ok(loaded, `the frame did not load ${next}: ${JSON.stringify(await frameOf(c, pages))}`);
    assert.equal(
      await frameEval(c, pages, `document.documentElement.getAttribute("data-theme")`),
      await themeGroup(c),
      "the page's theme",
    );
    assert.deepEqual(await paneChrome(), PANE_CHROME, "the site's chrome in the pane");
  });

  // Hover help: links in the IDE's own hover under the mouse, while the pane's
  // box is ticked.
  const hoverBox = () => inPane(c, `return root.querySelector("#helpHover")?.checked ?? null;`);
  // A class's hover lists its members, and is taller than the room below it.
  const COLLECTION_LINK = "Help: Collection class (VBA)";
  const LEN_LINK = "Help: Len function (VBA.Strings)";

  // The pane floats over the middle of the code editor, where the mouse has to
  // rest and click: move it against the window's right edge.
  const paneAside = () =>
    c.evaluate(`(() => {
  const s = toolWindowsById[${JSON.stringify(PANE)}].shadowDom.host.closest(".floatingPanel");
  if (!s) return null;
  s.style.left = (innerWidth - s.getBoundingClientRect().width - 4) + "px";
  return s.getBoundingClientRect().left;
})()`);

  // The hover under the mouse at a place, once the IDE's own text is in it.
  // The first hover after a compiler restart can come back empty, while the
  // compiler is still starting, and stays empty however long the mouse rests;
  // the mouse then rests again, once.
  async function mouseHover(line, column, want = "in VBA.") {
    await paneAside();
    for (let attempt = 0; ; attempt++) {
      await restMouse(c, line, column);
      const t = await waitFor(c, async (c) => {
        const t = await hoverText(c);
        return t?.includes(want) && t;
      });
      if (t || attempt === 1) return t;
    }
  }

  test("hover help is off until its box is ticked", async () => {
    assert.equal(await hoverBox(), false);
    const mark = await consoleMark(c);
    const t = await mouseHover(5, 9);
    assert.ok(t && !t.includes("Help:"), `the mouse hover: ${JSON.stringify(t)}`);
    assert.deepEqual(await addinLines(c, mark), []);
  });

  // The IDE's dock resizer along the code editor's bottom edge, and the dock's
  // drop targets, lie over a hover that reaches past it and take the mouse;
  // Monaco then hides the hover. The add-in draws the hover above them, with
  // hover help on or off (twinbasic/twinbasic#2506).
  test("with the box unticked, the hover stays while the mouse slides down it past the editor's bottom", async () => {
    // The hover over Collection, without the link while the box is unticked.
    const COLLECTION_HOVER = "in package VBA";
    await mouseHover(3, 22, COLLECTION_HOVER);
    const box = await c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".monaco-hover")].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 0);
  const r = h.getBoundingClientRect(), e = editor.getDomNode().getBoundingClientRect();
  return { left: r.left, bottom: r.bottom, editor: e.bottom };
})()`);
    assert.ok(box.bottom > box.editor + 12, `the hover does not reach past the editor: ${JSON.stringify(box)}`);
    const x = Math.round(box.left + 40);
    for (let y = Math.round(box.editor) - 12; y <= Math.round(box.editor) + 12; y++) {
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await sleep(20);
      const shown = await hoverText(c);
      assert.ok(shown?.includes(COLLECTION_HOVER), `the hover went at ${x},${y}, the editor's bottom at ${box.editor}`);
    }
    await mouseAway(c);
  });

  // The link is the hover's first line, where a long hover shows it without
  // being scrolled.
  test("with the box ticked, the mouse hover has the link first, and a click shows the page", async () => {
    await click(c, { toolWindow: PANE, css: "#helpHover" });
    assert.equal(await hoverBox(), true);
    const mark = await consoleMark(c);
    const t = await mouseHover(3, 22, COLLECTION_LINK);
    assert.ok(t, `the mouse hover: ${JSON.stringify(await hoverText(c))}`);
    assert.ok(t.startsWith(COLLECTION_LINK) && t.includes("in package VBA"), JSON.stringify(t));
    assert.equal(t.split(COLLECTION_LINK).length, 2, `the link is there more than once: ${JSON.stringify(t)}`);
    const link = await hoverLink(c, COLLECTION_LINK);
    assert.ok(link?.top, `the link cannot be clicked: ${JSON.stringify(link)}`);
    await markFrame();
    await clickAt(c, link.x, link.y);
    await showsPage("/tB/Modules/Collection/", { fresh: true });
    await mouseAway(c);
    assert.deepEqual(await openedUrls(c, { since: mark }), [], "the click opened a browser");
    assert.deepEqual(await addinLines(c, mark), []);
  });

  test("hover help shows nothing for a name with no page", async () => {
    const mark = await consoleMark(c);
    // The project's own Beep, which has a summary but no page.
    const t = await mouseHover(18, 10, "Beep");
    assert.ok(t && !t.includes("Help:"), `the mouse hover: ${JSON.stringify(t)}`);
    assert.deepEqual(await addinLines(c, mark), []);
  });

  test("after a compiler restart the box is still ticked and the mouse hover has the link once", async () => {
    const mark = await consoleMark(c);
    await lane.restartCompiler();
    pages = await pagesOrigin(mark);
    assert.ok(await waitFor(c, async () => (await hoverBox()) === true), "the box is not ticked after the restart");
    await openFile(c, "/HelpHost/Sources/Cases.twin", { line: 9, column: 9 });
    const t = await mouseHover(7, 21, LEN_LINK);
    assert.ok(t, `the mouse hover: ${JSON.stringify(await hoverText(c))}`);
    assert.equal(t.split(LEN_LINK).length, 2, `the link is there more than once: ${JSON.stringify(t)}`);
    await mouseAway(c);
  });

  test("unticking the box turns hover help off, and the hover is still drawn above the dock", async () => {
    await click(c, { toolWindow: PANE, css: "#helpHover" });
    assert.equal(await hoverBox(), false);
    assert.ok(
      await c.evaluate("!!document.getElementById('tbDocsHoverStay')"),
      "the hover is no longer drawn above the dock",
    );
    const t = await mouseHover(7, 21);
    assert.ok(t && !t.includes("Help:"), `the mouse hover: ${JSON.stringify(t)}`);
    await mouseAway(c);
  });

  // ------------------------------------------------------------ the detached window

  let win; // the DevTools connection to the window's page
  let firstDetach; // the console mark before the first Detach
  // The window's style bits that tell a Windows title bar from none.
  const WS_CAPTION = 0xc00000;
  const WS_THICKFRAME = 0x40000;
  const WS_VISIBLE = 0x10000000;
  // The style the add-in printed for the window's frame after `mark`, as
  // "window chrome <custom|native> style <hex>".
  async function windowFrame(mark) {
    const m = (await addinLines(c, mark)).map((l) => l.match(/^window chrome (custom|native) style ([0-9A-F]+)$/));
    const last = m.filter(Boolean).pop();
    return last ? { chrome: last[1], style: Number.parseInt(last[2], 16) } : null;
  }
  // Wait for the add-in's line after `mark`, and return the lines.
  async function waitForLine(mark, line, timeout = 10 * 1000) {
    const found = await waitFor(c, async (c) => (await addinLines(c, mark)).includes(line), { timeout });
    assert.ok(found, `no "${line}" in ${JSON.stringify(await addinLines(c, mark))}`);
    return addinLines(c, mark);
  }
  // The centre of an element of the window's page.
  const centreInWindow = (css) =>
    win.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(css)})
      .getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  // The src of the frame in the window, from the add-in's "window page" line
  // after a mark.
  const windowPage = async (mark) =>
    (await addinLines(c, mark)).find((l) => l.startsWith("window page "))?.slice("window page ".length) ?? null;
  const windowRows = () =>
    win.evaluate(`[...document.querySelectorAll("#helpResults .hit .label")].map((e) => e.textContent)`);
  const windowBox = () => win.evaluate(`document.getElementById("helpHover").checked`);
  // A click on an element of the window's page.
  async function clickInWindow(css) {
    const p = await centreInWindow(css);
    await clickAt(win, p.x, p.y);
  }
  // The same theme properties in the IDE and in the window's page; the IDE
  // sets them on its document, the add-in on the window's from the theme's
  // files. None is in the window's plain palette.
  const THEME_PROPERTIES = ["CodePanelBackColor", "MenuBackColor", "TreeItemHoverBackColor", "ErrorTabTextColor"];
  const themeProperties = (conn) =>
    conn.evaluate(
      `${JSON.stringify(THEME_PROPERTIES)}.map((n) => getComputedStyle(document.documentElement).getPropertyValue("--theme" + n).trim())`,
    );

  // Click Detach in the pane, and wait for the window to say "detached".
  async function detach() {
    const mark = await consoleMark(c);
    await click(c, { toolWindow: PANE, css: "#helpDetach" });
    assert.ok(
      await waitFor(c, async (c) => (await addinLines(c, mark)).includes("detached"), { timeout: 30 * 1000 }),
      `the add-in did not detach: ${JSON.stringify(await addinLines(c, mark))}`,
    );
    return mark;
  }

  // Connect to the window's page, which the control starts with the debugging
  // port: the page is there once the window has made its control.
  async function connectWindow() {
    win?.close();
    win = null;
    const connected = await waitFor(
      c,
      async () => {
        try {
          win = await attach(windowPort, "", { timeout: 30 * 1000 });
          return true;
        } catch {
          return false;
        }
      },
      { timeout: 30 * 1000 },
    );
    assert.ok(connected, `no page on the window's debugging port ${windowPort}`);
    await win.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  }

  test("Detach hides the pane and shows the window with the page the pane had, and the pane's frame stays", async () => {
    const was = await frameSrc(c);
    assert.ok(was, "the pane had no page to carry over");
    const mark = await detach();
    firstDetach = mark;
    assert.equal(await waitFor(c, () => windowPage(mark), { timeout: 30 * 1000 }), was);
    assert.equal((await toolWindow(c, PANE))?.visible, false, "the pane is still showing");
    assert.equal(await frameSrc(c), was);
    await connectWindow();
    assert.equal(await win.evaluate(`document.getElementById("helpPage").src`), was);
    assert.equal(await win.evaluate(`document.title`), "twinBASIC Help");
  });

  test("the window has the IDE theme's properties", async () => {
    const ide = await themeProperties(c);
    assert.ok(
      ide.every((v) => v),
      JSON.stringify(ide),
    );
    assert.deepEqual(await themeProperties(win), ide);
    assert.equal(
      await win.evaluate(`document.documentElement.getAttribute("data-group")`),
      await themeGroup(c),
      "the window's group",
    );
  });

  test("the window's title bar is one row, with the title and four buttons, and Windows draws no caption", async () => {
    const bar = await win.evaluate(`(() => {
      const el = (id) => document.getElementById(id);
      const bar = el("helpTitleBar").getBoundingClientRect();
      const rects = {};
      const inRow = (id) => {
        const r = el(id).getBoundingClientRect();
        rects[id] = [r.left, r.top, r.width, r.height].map(Math.round);
        return r.width > 0 && r.top >= bar.top && r.bottom <= bar.bottom;
      };
      const s = getComputedStyle(el("helpTitleBar"));
      return {
        chrome: document.documentElement.getAttribute("data-chrome"),
        top: bar.top,
        height: bar.height,
        below: el("helpBar").getBoundingClientRect().top,
        title: el("helpTitle").textContent,
        inRow: ["helpGrip", "helpTitle", "helpAttach", "helpMinimize", "helpMaximize", "helpClose"].map(inRow),
        rects,
        attachIn: el("helpAttach").parentElement.id,
        attachWord: getComputedStyle(el("helpAttach").querySelector(".label")).display,
        look: { backgroundColor: s.backgroundColor, color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom },
      };
    })()`);
    const { rects, look, height, ...rest } = bar;
    assert.ok(paneHeader, "the pane's header was not read");
    assert.deepEqual(
      rest,
      {
        chrome: "custom",
        top: 0,
        below: height,
        title: "TWINBASIC HELP",
        inRow: [true, true, true, true, true, true],
        attachIn: "helpTitleBar",
        attachWord: "none",
      },
      JSON.stringify(rects),
    );
    // The IDE's own tool-window header, read from the pane while it showed.
    assert.deepEqual(look, paneHeader.look);
    assert.ok(
      Math.abs(height - paneHeader.height) <= 1,
      `the bar is ${height} high, the IDE's header ${paneHeader.height}`,
    );
    const frame = await windowFrame(firstDetach);
    assert.equal(frame?.chrome, "custom");
    assert.notEqual(frame.style & WS_CAPTION, WS_CAPTION, `the window's style ${frame.style.toString(16)}`);
    assert.ok(frame.style & WS_THICKFRAME, "the window cannot be resized");
    assert.ok(frame.style & WS_VISIBLE, "the window is not visible");
  });

  // The Maximize button and the title bar's double click maximize the window
  // and restore it, and the button shows which it will do.
  const maximizeButton = () =>
    win.evaluate(`({
      state: document.documentElement.getAttribute("data-state"),
      title: document.getElementById("helpMaximize").title,
      glyphs: [".maximize", ".restore"].map((s) => getComputedStyle(document.querySelector("#helpMaximize " + s)).display === "none"),
    })`);

  // The size of the window's page and of the monitor's work area, in the same
  // units: a maximized window with no title bar of its own has to fill the
  // work area, not the whole monitor over the taskbar (WindowApi,
  // LimitMaximizeToWorkArea).
  const placeAndWorkArea = () =>
    win.evaluate(`({
      window: [innerWidth, innerHeight],
      work: [screen.availWidth, screen.availHeight],
    })`);

  test("Maximize and Restore change the window's state, and the button shows which it will do", async () => {
    let mark = await consoleMark(c);
    await clickInWindow("#helpMaximize");
    await waitForLine(mark, "window state max");
    const maximized = await waitFor(c, async () => {
      const p = await placeAndWorkArea();
      return p.window.every((v, i) => Math.abs(v - p.work[i]) <= 1) && p;
    });
    assert.ok(maximized, `not the work area: ${JSON.stringify(await placeAndWorkArea())}`);
    assert.ok(
      await waitFor(c, async () => (await maximizeButton()).state === "max"),
      JSON.stringify(await maximizeButton()),
    );
    assert.deepEqual(await maximizeButton(), { state: "max", title: "Restore", glyphs: [true, false] });
    mark = await consoleMark(c);
    await clickInWindow("#helpMaximize");
    await waitForLine(mark, "window state normal");
    assert.ok(await waitFor(c, async () => (await maximizeButton()).state === "normal"));
    assert.deepEqual(await maximizeButton(), { state: "normal", title: "Maximize", glyphs: [false, true] });
  });

  test("a double click on the bar maximizes the window, and another restores it", async () => {
    const p = await centreInWindow("#helpTitle");
    for (const want of ["max", "normal"]) {
      const mark = await consoleMark(c);
      await clickAt(win, p.x, p.y, { clickCount: 2 });
      await waitForLine(mark, `window state ${want}`);
    }
  });

  test("Minimize, and F1 brings the window back", async () => {
    let mark = await consoleMark(c);
    await clickInWindow("#helpMinimize");
    await waitForLine(mark, "window state min");
    await at(c, 7, 21);
    mark = await consoleMark(c);
    await pressKey(c, "F1");
    const want = `${pages}/tB/Modules/Strings/Len?theme=${await themeGroup(c)}&pane=1`;
    await waitForLine(mark, "window state normal");
    assert.equal(await waitFor(c, () => windowPage(mark)), want);
  });

  test("F1 shows the page in the window, and the pane is left alone", async () => {
    const pane = await frameSrc(c);
    await at(c, 7, 21);
    const mark = await consoleMark(c);
    await pressKey(c, "F1");
    const want = `${pages}/tB/Modules/Strings/Len?theme=${await themeGroup(c)}&pane=1`;
    assert.equal(await waitFor(c, () => windowPage(mark)), want);
    assert.equal(await win.evaluate(`document.getElementById("helpPage").src`), want);
    assert.equal(await frameSrc(c), pane, "the pane's frame changed");
    assert.equal((await toolWindow(c, PANE))?.visible, false, "the pane is showing");
    assert.deepEqual(await addinLines(c, mark), [`window page ${want}`]);
  });

  test("typing in the window's search box lists the results there, and Enter shows the first", async () => {
    const mark = await consoleMark(c);
    await win.evaluate(`document.getElementById("helpSearch").focus()`);
    await typeText(win, "msgbo");
    const rows = await waitFor(c, async () => {
      const r = await windowRows();
      return r[0] === "Interaction.MsgBox" && r;
    });
    assert.ok(rows, JSON.stringify(await windowRows()));
    assert.ok((await addinLines(c, mark)).some((l) => /^window results \d+$/.test(l)));
    const enter = await consoleMark(c);
    await pressKey(win, "Enter");
    assert.equal(
      await waitFor(c, () => windowPage(enter)),
      `${pages}/tB/Modules/Interaction/MsgBox?theme=${await themeGroup(c)}&pane=1`,
    );
  });

  test("a click on a result in the window shows its page there", async () => {
    const rows = await windowRows();
    const n = rows.indexOf("Interaction.MsgBox");
    assert.ok(n >= 0, JSON.stringify(rows));
    const mark = await consoleMark(c);
    // The first row is the page shown already; the next is another entry.
    await clickInWindow(`#helpResults .hit:nth-child(${n === 0 ? 2 : 1})`);
    const got = await waitFor(c, () => windowPage(mark));
    assert.ok(got?.startsWith(`${pages}/tB/`) && !got.includes("/Interaction/MsgBox?"), String(got));
    assert.equal((await toolWindow(c, PANE))?.visible, false);
  });

  test("Hover help can be ticked in the window, and the pane's box follows", async () => {
    assert.equal(await hoverBox(), false);
    await clickInWindow("#helpHover");
    assert.ok(await waitFor(c, async () => (await hoverBox()) === true), "the pane's box is not ticked");
    assert.equal(await windowBox(), true);
    await clickInWindow("#helpHover");
    assert.ok(await waitFor(c, async () => (await hoverBox()) === false), "the pane's box is still ticked");
    assert.equal(await windowBox(), false);
  });

  test("a name with no page shows its summary in the window, and Open in browser is disabled there", async () => {
    await at(c, 18, 10);
    const mark = await consoleMark(c);
    await pressKey(c, "F1");
    assert.ok(
      await waitFor(c, async (c) => (await addinLines(c, mark)).includes("window summary")),
      JSON.stringify(await addinLines(c, mark)),
    );
    const shown = await win.evaluate(`({
      declaration: document.querySelector("#helpSummary .declaration")?.textContent,
      summary: document.getElementById("helpSummary").style.display,
      frame: document.getElementById("helpPage").style.display,
      browserDisabled: document.getElementById("helpBrowser").disabled,
    })`);
    assert.deepEqual(shown, { declaration: "Sub Beep ( )", summary: "", frame: "none", browserDisabled: true });
  });

  test("a theme change reaches the window", async () => {
    const was = await themeGroup(c);
    const other = was === "dark" ? "light" : "dark";
    const switchTo = (group) =>
      c.evaluate(
        `executeIdeCommand(${JSON.stringify(group === "dark" ? "tbTheme_SwitchToDarkMode" : "tbTheme_SwitchToLightMode")})`,
      );
    try {
      await switchTo(other);
      assert.equal(await themeGroup(c), other, "the IDE's theme did not change");
      const sameAsIde = await waitFor(
        c,
        async () => JSON.stringify(await themeProperties(win)) === JSON.stringify(await themeProperties(c)),
      );
      assert.ok(sameAsIde, "the window's properties are not the new theme's");
      assert.equal(await win.evaluate(`document.documentElement.getAttribute("data-group")`), other);
    } finally {
      await switchTo(was);
    }
    assert.ok(
      await waitFor(
        c,
        async () => JSON.stringify(await themeProperties(win)) === JSON.stringify(await themeProperties(c)),
      ),
      "the window's properties are not the old theme's again",
    );
  });

  // A press on the bar with the mouse moved a few pixels, or held for 250 ms,
  // starts the system's move loop through the add-in, and a click does not.
  // The page posts "drag" and the add-in prints "window drag" before it runs
  // the loop, which follows the real mouse; the harness's desktop has none,
  // and the window does not move under the page's synthetic mouse (its
  // screenX and screenY were read before and after), so that is not asserted.
  const mouse = (type, p, extra = {}) =>
    win.send("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: "left", buttons: 1, ...extra });

  test("a click or a small move on the bar starts no drag, and a larger move does", async () => {
    const p = await centreInWindow("#helpTitle");
    const mark = await consoleMark(c);
    await clickAt(win, p.x, p.y);
    await win.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
    await mouse("mousePressed", p, { clickCount: 1 });
    await mouse("mouseMoved", { x: p.x + 2, y: p.y + 1 });
    await sleep(100);
    await mouse("mouseReleased", { x: p.x + 2, y: p.y + 1 }, { buttons: 0 });
    await sleep(500);
    assert.deepEqual(await addinLines(c, mark), [], "a click started a drag");
    await mouse("mousePressed", p, { clickCount: 1 });
    await mouse("mouseMoved", { x: p.x + 30, y: p.y + 10 });
    await waitForLine(mark, "window drag");
    await mouse("mouseReleased", { x: p.x + 30, y: p.y + 10 }, { buttons: 0 });
  });

  test("a press held on the bar for 250 ms starts a drag", async () => {
    const p = await centreInWindow("#helpTitle");
    const mark = await consoleMark(c);
    await mouse("mousePressed", p, { clickCount: 1 });
    await waitForLine(mark, "window drag");
    await mouse("mouseReleased", p, { buttons: 0 });
  });

  test("the X hides the window and the help stays detached, and F1 shows it again", async () => {
    let mark = await consoleMark(c);
    await clickInWindow("#helpClose");
    await waitForLine(mark, "window hidden");
    assert.equal((await toolWindow(c, PANE))?.visible, false, "the pane is showing");
    await at(c, 5, 9);
    mark = await consoleMark(c);
    await pressKey(c, "F1");
    const lines = await waitForLine(mark, "window shown");
    assert.equal(
      await waitFor(c, () => windowPage(mark)),
      `${pages}/tB/Modules/Interaction/MsgBox?theme=${await themeGroup(c)}&pane=1`,
    );
    assert.ok(!lines.includes("detached") && !lines.includes("attached"), JSON.stringify(lines));
    assert.equal((await toolWindow(c, PANE))?.visible, false, "the pane is showing");
    assert.equal((await windowFrame(mark))?.chrome, "custom");
  });

  test("Attach brings the pane back with the search and the last page", async () => {
    await at(c, 7, 21);
    const mark = await consoleMark(c);
    await pressKey(c, "F1");
    const want = `${pages}/tB/Modules/Strings/Len?theme=${await themeGroup(c)}&pane=1`;
    assert.equal(await waitFor(c, () => windowPage(mark)), want);
    await clickInWindow("#helpAttach");
    assert.ok(
      await waitFor(c, async (c) => (await addinLines(c, mark)).includes("attached")),
      JSON.stringify(await addinLines(c, mark)),
    );
    assert.ok(await waitFor(c, async (c) => (await toolWindow(c, PANE))?.visible), "the pane is not showing");
    await showsPage("/tB/Modules/Strings/Len");
    assert.equal(await searchValue(c), "msgbo");
  });

  test("a detached window comes back after a compiler restart", async () => {
    await detach();
    const mark = await consoleMark(c);
    await lane.restartCompiler();
    pages = await pagesOrigin(mark);
    assert.ok(
      await waitFor(c, async (c) => (await addinLines(c, mark)).includes("detached"), { timeout: 30 * 1000 }),
      JSON.stringify(await addinLines(c, mark)),
    );
    const want = `${pages}/tB/Modules/Strings/Len?theme=${await themeGroup(c)}&pane=1`;
    assert.equal(await waitFor(c, () => windowPage(mark), { timeout: 30 * 1000 }), want);
    assert.equal((await toolWindow(c, PANE))?.visible, false);
    await connectWindow();
    const attached = await consoleMark(c);
    await clickInWindow("#helpAttach");
    assert.ok(await waitFor(c, async (c) => (await addinLines(c, attached)).includes("attached")));
    assert.ok(await waitFor(c, async (c) => (await toolWindow(c, PANE))?.visible), "the pane is not showing");
    await showsPage("/tB/Modules/Strings/Len");
  });

  test("a window hidden with the X stays hidden after a compiler restart, until the Help button shows it", async () => {
    await detach();
    await connectWindow();
    let mark = await consoleMark(c);
    await clickInWindow("#helpClose");
    await waitForLine(mark, "window hidden");
    mark = await consoleMark(c);
    await lane.restartCompiler();
    pages = await pagesOrigin(mark);
    await sleep(2000);
    const lines = await addinLines(c, mark);
    assert.deepEqual(
      lines.filter((l) => l.startsWith("window") || l === "detached"),
      [],
      "the window was shown again",
    );
    assert.equal((await toolWindow(c, PANE))?.visible, false, "the pane is showing");
    mark = await consoleMark(c);
    await click(c, "addinButton-tbDocsHelp");
    await waitForLine(mark, "window shown", 30 * 1000);
    await connectWindow();
    // The search box gets the focus once the new window's page is ready.
    assert.ok(
      await waitFor(c, async () => (await win.evaluate(`document.activeElement?.id`)) === "helpSearch"),
      "the search box has no focus in the window",
    );
    mark = await consoleMark(c);
    await clickInWindow("#helpAttach");
    await waitForLine(mark, "attached");
    assert.ok(await waitFor(c, async (c) => (await toolWindow(c, PANE))?.visible), "the pane is not showing");
  });

  // The IDE's option "Show real OS titlebar" gives the window the Windows title
  // bar, and the page then draws none. The harness cannot change the option
  // without changing the user's own, so the add-in reads
  // TB_DOCS_HELP_REAL_TITLEBAR under the test switch instead, which is the
  // IDE's environment: a second IDE is started with it.
  test("with the IDE's option Show real OS titlebar on, the window has the Windows title bar and Attach is in the search bar", async () => {
    win?.close();
    win = null;
    await lane.closeProject();
    c = await lane.open(HOST, { env: ideEnv(1) });
    pages = await pagesOrigin(null);
    await click(c, "addinButton-tbDocsHelp");
    assert.ok(await waitFor(c, async (c) => (await toolWindow(c, PANE))?.visible), "the pane is not showing");
    const mark = await detach();
    const frame = await windowFrame(mark);
    assert.equal(frame?.chrome, "native");
    assert.equal(frame.style & WS_CAPTION, WS_CAPTION, `the window's style ${frame.style.toString(16)}`);
    assert.ok(frame.style & WS_THICKFRAME, "the window cannot be resized");
    await connectWindow();
    // The add-in tells the page which frame it has once the page is ready.
    await waitFor(
      c,
      async () => (await win.evaluate(`document.documentElement.getAttribute("data-chrome")`)) === "native",
    );
    const page = await win.evaluate(`(() => {
      const el = (id) => document.getElementById(id);
      return {
        chrome: document.documentElement.getAttribute("data-chrome"),
        bar: getComputedStyle(el("helpTitleBar")).display,
        attachIn: el("helpAttach").parentElement.id,
        attachWord: getComputedStyle(el("helpAttach").querySelector(".label")).display !== "none",
        searchTop: el("helpBar").getBoundingClientRect().top,
        order: [...el("helpBar").children].map((e) => e.id),
      };
    })()`);
    assert.deepEqual(page, {
      chrome: "native",
      bar: "none",
      attachIn: "helpBar",
      attachWord: true,
      searchTop: 0,
      order: ["helpSearch", "helpBrowser", "helpAttach", "helpHoverLabel"],
    });
    const attached = await consoleMark(c);
    await clickInWindow("#helpAttach");
    await waitForLine(attached, "attached");
  });

  return () => {
    win?.close();
    server?.close();
  };
});
