// The help add-in, add-in/, increments 1 and 2 of Stage 4 in WIP.HelpAddin.md:
// F1 shows the page for the selection or for the name under the cursor in the
// help pane, whose search box and results list find any page of the index.
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
const focusedId = (c) => inPane(c, "return root.activeElement?.id ?? null;");
const searchValue = (c) => inPane(c, `return root.querySelector("#helpSearch")?.value ?? null;`);
const results = async (c) => (await listViewItems(c, { toolWindow: PANE, css: "#helpResults" })).map((i) => i.text);

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

  // The frame shows `url` from the built site: the add-in gave it that src,
  // and the page it loaded is the build's, not a 404.
  async function showsPage(url) {
    const want = origin + url;
    const src = await waitFor(c, async (c) => {
      const s = await frameSrc(c);
      return s === want && s;
    });
    assert.equal(src ?? (await frameSrc(c)), want, "the frame's src");
    assert.ok((await toolWindow(c, PANE))?.visible, "the pane is not showing");
    const [pagePath, fragment] = url.split("#");
    const loaded = await waitFor(c, async (c) => {
      const f = await frameOf(c, origin);
      if (!f || f.url.replace(/\/$/, "") !== origin + pagePath.replace(/\/$/, "")) return false;
      return (await frameEval(c, origin, "document.readyState")) === "complete";
    });
    assert.ok(loaded, `the frame did not load ${url}: ${JSON.stringify(await frameOf(c, origin))}`);
    if (fragment) assert.equal((await frameOf(c, origin)).urlFragment, `#${fragment}`);
    const page = served.filter((r) => r.path.replace(/\/$/, "") === pagePath.replace(/\/$/, "")).at(-1);
    assert.equal(page?.status, 200, `${url} as served: ${JSON.stringify(page)}`);
  }

  // Press F1 (or run `act`), and expect `url` in the pane and nothing printed.
  async function f1Shows(url, act = () => pressKey(c, "F1")) {
    const mark = await consoleMark(c);
    await act();
    await showsPage(url);
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

  test("a member of an unknown object lists its pages, and a click shows one", async () => {
    // c.Add: the add-in cannot tell what c is, so every page of an Add is listed.
    await at(c, 4, 11);
    const was = await frameSrc(c);
    await pressKey(c, "F1");
    const items = await waitFor(c, async (c) => {
      const r = await results(c);
      return r.length > 0 && r;
    });
    assert.equal(items?.length, 12, JSON.stringify(items));
    assert.ok(items.includes("Collection.Addmethod") && items.includes("ToolWindows.Addmethod"), JSON.stringify(items));
    assert.equal(await searchValue(c), "c.Add");
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
    assert.equal(src, `${origin}/tB/Modules/Interaction/MsgBox`);
  });

  return () => server?.close();
});
