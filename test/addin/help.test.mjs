// The help add-in, add-in/, increments 1 to 3 of Stage 4 in WIP.HelpAddin.md:
// F1 shows the page for the selection or for the name under the cursor in the
// help pane, whose search box and results list find any page of the index;
// for the name under the cursor, the compiler's hover says where it is
// declared.
//
// The add-in is built as committed, with its copy of the symbol index,
// add-in/Resources/SYMBOLS/symbols.json, embedded as a resource. The pane's
// frame loads the built site, docs/_site, which this file serves on localhost
// and gives the add-in as TB_DOCS_HELP_SITE: so every page a case reaches is a
// page of the build, and nothing comes from the network. Run build.bat first.
// Each case is a line and column in helphost/Sources/Cases.twin, so a change to
// that file is a change to this table.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createStaticHandler } from "../../builder/static-files.mjs";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { loadedAddins } from "../../scripts/lib/tb-ide-addins.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import {
  click,
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
import { frameEval, frameOf, serveLoopback } from "./pages.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ADDIN = path.join(ROOT, "add-in");
const INDEX = path.join(ADDIN, "Resources", "SYMBOLS", "symbols.json");
const BUILT = path.join(ROOT, "docs", "_site");
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
  let origin;
  let server;
  const served = []; // { path, status } for every request the site answered

  // The frame shows `url` from the built site in the IDE's theme: the add-in
  // gave it that src with ?theme=, the page it loaded is the build's, not a
  // 404, and the page applied the theme. With `fresh`, the page is a new
  // document: not the one markFrame marked.
  async function showsPage(url, { fresh = false } = {}) {
    const group = await themeGroup(c);
    const [pagePath, fragment] = url.split("#");
    const want = `${origin}${pagePath}?theme=${group}${fragment ? `#${fragment}` : ""}`;
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
      const f = await frameOf(c, origin);
      const loadedUrl = `${origin}${pagePath.replace(/\/$/, "")}?theme=${group}`;
      if (!f || f.url.replace(/\/\?/, "?") !== loadedUrl) return false;
      // A src set to the URL the frame already has reloads it, and a question
      // put to the page being replaced fails: that is not loaded yet.
      const ready = `document.readyState === "complete"${fresh ? " && !window.tbDocsTestMark" : ""}`;
      return (await frameEval(c, origin, ready).catch(() => false)) === true;
    });
    assert.ok(loaded, `the frame did not load ${want}: ${JSON.stringify(await frameOf(c, origin))}`);
    if (fragment) assert.equal((await frameOf(c, origin)).urlFragment, `#${fragment}`);
    const page = served.filter((r) => r.path.replace(/\/$/, "") === pagePath.replace(/\/$/, "")).at(-1);
    assert.equal(page?.status, 200, `${url} as served: ${JSON.stringify(page)}`);
    assert.equal(
      await frameEval(c, origin, `document.documentElement.getAttribute("data-theme")`),
      group,
      "the page's theme",
    );
  }

  // Marks the page the frame shows now, so that showsPage can tell a page F1
  // loaded from it: F1 on the name whose page shows already loads it again,
  // and the page before the reload looks loaded until the reload begins.
  const markFrame = () => frameEval(c, origin, "window.tbDocsTestMark = true").catch(() => {});

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
    const files = createStaticHandler(BUILT);
    server = await serveLoopback((req, res) => {
      res.on("finish", () => served.push({ path: req.url.split(/[?#]/)[0], status: res.statusCode }));
      return files(req, res);
    });
    origin = `http://localhost:${server.port}`;
    await lane.addAddin(ADDIN);
    c = await lane.open(HOST, { env: { TB_DOCS_HELP_SITE: origin } });
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
    const items = await waitFor(c, async (c) => {
      const r = await results(c);
      return r.length > 0 && r;
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
  });

  test("the toolbar's Help button puts the focus in the search box", async () => {
    await at(c, 7, 21);
    await click(c, "addinButton-tbDocsHelp");
    assert.equal(await waitFor(c, async (c) => (await focusedId(c)) === "helpSearch" && "helpSearch"), "helpSearch");
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
    assert.ok(await waitFor(c, async (c) => (await addinLines(c, mark)).some((l) => l.startsWith("loaded"))));
    const src = await waitFor(c, (c) =>
      inPane(
        c,
        `const f = root.querySelector("#helpPage"); return f && !f.dataset.beforeRestart && f.getAttribute("src");`,
      ),
    );
    assert.equal(src, `${origin}/tB/Modules/Interaction/MsgBox?theme=${await themeGroup(c)}`);
  });

  return () => server?.close();
});
