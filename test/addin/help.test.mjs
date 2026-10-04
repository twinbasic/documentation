// The help add-in, add-in/, increment 1 of Stage 4 in WIP.HelpAddin.md: F1, or
// the toolbar's Help button, opens the page for the selection or for the name
// under the cursor. Under the harness the add-in starts no browser and prints
// "open <url>" instead, which these tests read.
//
// The add-in is built with the symbol index of the last docs build,
// docs/_site/tB/symbols.json, embedded as a resource: run build.bat first.
// Each case is a line and column in helphost/Sources/Cases.twin, so a change
// to that file is a change to this table.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { loadedAddins } from "../../scripts/lib/tb-ide-addins.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import {
  answerMessageBox,
  click,
  messageBoxes,
  notifications,
  openedUrls,
  openFile,
  pressKey,
  select,
  setCursor,
  waitFor,
} from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ADDIN = path.join(ROOT, "add-in");
const INDEX = path.join(ROOT, "docs", "_site", "tB", "symbols.json");
const HOST = path.join(HERE, "helphost");
const FILE = "/HelpHost/Sources/Cases.twin";
const SITE = "https://docs.twinbasic.com";

// The add-in's tree with the index added, staged in the lane's work folder:
// add-in/ itself holds no copy of it.
function stageAddin(work) {
  assert.ok(fs.existsSync(INDEX), `${INDEX} is missing: run build.bat first`);
  const src = path.join(work, "help-src");
  fs.rmSync(src, { recursive: true, force: true });
  fs.cpSync(ADDIN, src, { recursive: true });
  const res = path.join(src, "Resources", "SYMBOLS");
  fs.mkdirSync(res, { recursive: true });
  fs.copyFileSync(INDEX, path.join(res, "symbols.json"));
  return src;
}

const addinLines = async (c, mark) => linesSince(c, mark, { prefix: "[tbDocsHelp] " });

// Press F1 (or run `act`) and return the URLs the add-in opened after it.
async function opened(c, act = () => pressKey(c, "F1")) {
  const mark = await consoleMark(c);
  await act();
  const urls = await waitFor(c, async (c) => {
    const u = await openedUrls(c, { since: mark });
    return u.length > 0 && u;
  });
  assert.deepEqual(await addinLines(c, mark), [], "the add-in printed something");
  return urls ?? [];
}

// Press F1 and wait for a notification with `text`; nothing may be opened.
async function notified(c, text) {
  const mark = await consoleMark(c);
  await pressKey(c, "F1");
  const shown = await waitFor(c, async (c) => (await notifications(c)).find((t) => t.trim() === text));
  assert.ok(shown, `notifications: ${JSON.stringify(await notifications(c))}`);
  await sleep(300);
  assert.deepEqual(await openedUrls(c, { since: mark }), []);
}

async function at(c, line, column) {
  await setCursor(c, line, column);
  await sleep(100);
}

scenario("the help add-in, increment 1: F1 to a page", (lane) => {
  let c;
  let entries;
  before(async () => {
    entries = JSON.parse(fs.readFileSync(INDEX, "utf8")).symbols.length;
    await lane.addAddin(stageAddin(lane.work));
    c = await lane.open(HOST);
    await openFile(c, FILE, { line: 5, column: 9 });
  });

  test("it loads with the whole index and the test switch on", async () => {
    assert.ok((await loadedAddins(c)).some((a) => a.name === "twinBASIC Documentation Help"));
    const loaded = await waitFor(c, async (c) => (await addinLines(c, null)).find((l) => l.startsWith("loaded")));
    // Checked before any key is pressed: with the switch off, F1 would start a
    // browser on the lane's desktop.
    assert.equal(loaded, `loaded, index ${entries} entries, test switch on`);
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
      assert.deepEqual(await opened(c), [SITE + url]);
    });
  }

  test("a selection is looked up as selected", async () => {
    // "Print" alone is the bare name, where the cursor would give Debug.Print.
    await select(c, { startLine: 7, startColumn: 15, endLine: 7, endColumn: 20 });
    await sleep(100);
    assert.deepEqual(await opened(c), [`${SITE}/tB/Core/Print`]);
  });

  test("a name with no page says so", async () => {
    await at(c, 8, 13);
    await notified(c, "No help for 'zzqHelpProbe'");
  });

  test("no name at the cursor says so", async () => {
    await at(c, 3, 3);
    await notified(c, "No name at the cursor");
  });

  test("a member of an unknown object offers its pages", async () => {
    // c.Add: the add-in cannot tell what c is, so every Add is a choice.
    await at(c, 4, 11);
    const mark = await consoleMark(c);
    await pressKey(c, "F1");
    const box = await waitFor(c, async (c) => (await messageBoxes(c)).at(-1));
    assert.ok(box, "no message box");
    assert.equal(box.title, "twinBASIC Help");
    assert.equal(box.buttons.length, 13, JSON.stringify(box.buttons));
    assert.ok(box.buttons.includes("Collection.Add") && box.buttons.includes("ToolWindows.Add"));
    assert.equal(box.buttons.at(-1), "Cancel");
    await answerMessageBox(c, "Collection.Add");
    const urls = await waitFor(c, async (c) => {
      const u = await openedUrls(c, { since: mark });
      return u.length > 0 && u;
    });
    assert.deepEqual(urls, [`${SITE}/tB/Modules/Collection/Add`]);
  });

  test("Cancel opens nothing", async () => {
    await at(c, 4, 11);
    const mark = await consoleMark(c);
    await pressKey(c, "F1");
    assert.ok(await waitFor(c, async (c) => (await messageBoxes(c)).length > 0), "no message box");
    await answerMessageBox(c, "Cancel");
    assert.ok(await waitFor(c, async (c) => (await messageBoxes(c)).length === 0), "the box stayed");
    await sleep(300);
    assert.deepEqual(await openedUrls(c, { since: mark }), []);
    assert.deepEqual(await addinLines(c, mark), []);
  });

  test("the toolbar's Help button does what F1 does", async () => {
    await at(c, 7, 21);
    assert.deepEqual(await opened(c, () => click(c, "addinButton-tbDocsHelp")), [`${SITE}/tB/Modules/Strings/Len`]);
  });
});
