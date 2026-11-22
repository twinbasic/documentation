// The custom-designer API new in BETA 1045, measured: Designers.Register and Unregister,
// DesignerFactory.CreateDesigner, the Designer callbacks, DesignerHost (GetURI, SetFileData,
// Caption, Tooltip, RootDomElement), DesignerToolbox and Editors.Open with a Designer. The
// DesignersProbe add-in (probes/designers) registers designers for the extensions of the files
// in probes/designers-host and logs every call the IDE makes on them, with a counter, to the
// DEBUG CONSOLE; its designers' TOOLBOX items call SetFileData. The scenario opens, edits, saves
// and closes those files with real input and reads the log, the tabs, the TOOLBOX, the Project
// Explorer and the project file on disk. The last test calls Unregister, which takes the
// compiler down, in IDEs of their own.
//
// Each test states what BETA 1045 does. If one fails after an IDE update, the IDE has changed:
// update the pages that rest on it --- docs/Reference/Built-In/tbIDE/Designers.md, Designer.md,
// DesignerHost.md, DesignerToolbox.md and Editors.md --- and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { loadedAddins } from "../../scripts/lib/tb-ide-addins.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, openFile, pressKey, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { diskText, projectKit } from "../ide/projects-kit.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "probes", "designers-host");
const PROBE = path.join(HERE, "probes", "designers");
const J = JSON.stringify;
const SRC = (name) => `/DesignersHost/Sources/${name}`;

// What the probe printed since a mark, without its prefix, its counter and the number of the
// designer instance ("Probe Default#3" is "Probe Default#"). The counter is in the order the
// lines were printed, which is the console's order.
const probeLines = async (c, mark) =>
  (await linesSince(c, mark, { prefix: "[DesignersProbe] " })).map((l) => l.replace(/^\d+ /, "").replace(/#\d+/, "#"));

// The lines a designer prints in OnAttached, for one whose GetURI is `uri`.
const ATTACHED = (d, uri) => [
  `${d}# attached uri=[${uri}] err=0`,
  `${d}# caption=[] tooltip=[] err=0`,
  `${d}# body err=0`,
  `${d}# toolbox err=0`,
  `${d}# attached end`,
];
const REGISTERED = [
  "register Probe Default .prb err=0",
  "register Probe Other .prb err=0",
  "register Probe NoDot prb err=0",
  "register Probe Any .* err=0",
  "register Probe Prolog .prx err=0",
  "register Probe Png .prp err=0",
];

// The designers the page holds, in registration order.
const REGISTERED_JS = `g_registeredCustomDesigners.map((d) => ({ name: d.name, extension: d.extension,
  isDefault: !!d.isDefault, icon: typeof d.iconData === "string" ? d.iconData.slice(0, 8) : d.iconData ?? null }))`;

// A file's icon in the Project Explorer, as the page holds it and as its row shows it, and the
// width the browser decodes it at (0: it cannot draw it).
const TREE_ICON_JS = (p) => `new Promise((res) => {
  const n = fs.tree.resolvePath("twinbasic:" + ${J(p)});
  if (!n) return res(null);
  const icon = n.overrideIcon || null;
  const dom = n.domObject && n.domObject.querySelector("[style*='background-image']");
  const shown = dom ? /url\\(["']?(data:[^,;]*[;,])/.exec(dom.style.backgroundImage)?.[1] ?? dom.style.backgroundImage : null;
  const m = icon && /url\\(['"]?([^'")]+)/.exec(icon);
  if (!m) return res({ type: null, shown, width: null });
  const type = /^data:[^,;]*[;,]/.exec(m[1])[0];
  const img = new Image();
  img.onload = () => res({ type, shown, width: img.naturalWidth });
  img.onerror = () => res({ type, shown, width: 0 });
  img.src = m[1];
})`;

// The TOOLBOX panel's items, by caption.
const TOOLBOX_JS = `[...toolboxDockablePanel._this.sectionHeader.sectionRoot.querySelectorAll(".toolboxItemOuter")]
  .map((e) => ({ caption: e.innerText.trim(), selected: e.classList.contains("selectedTool") }))`;
const TOOL_AT_JS = (caption) => `(() => {
  const e = [...toolboxDockablePanel._this.sectionHeader.sectionRoot.querySelectorAll(".toolboxItemOuter")]
    .find((e) => e.innerText.trim() === ${J(caption)});
  if (!e) return null;
  e.scrollIntoView({ block: "nearest" });
  const r = e.getBoundingClientRect();
  return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
})()`;

// A tab of the code panel, by its text: where its middle and its close icon are, and the type
// of the data: URL of its icon.
const TAB_JS = (name) => `(() => {
  const t = [...document.querySelectorAll("#codePanelTabs > .tabItem")].find((t) => t.innerText.trim() === ${J(name)});
  if (!t) return null;
  const r = t.getBoundingClientRect();
  const x = t.querySelector(".codicon-close");
  const q = x && x.getBoundingClientRect();
  const icon = t.querySelector(".tabItemIconLeft");
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, close: q ? { x: q.x + q.width / 2, y: q.y + q.height / 2 } : null,
           icon: icon ? /data:[^,;]*[;,]/.exec(icon.style.backgroundImage)?.[0] ?? null : null };
})()`;

// The selected tab as the page holds it: its editor type, its designer's URI, the text in the
// designer's shadow root, and whether the page holds it changed.
const SELECTED_JS = `(() => {
  const n = openEditors.selectedEditorNode;
  if (!n) return null;
  const d = n.customDesigner;
  return { name: n.name, type: n.type, uri: d ? d.uri : null,
           body: d && d._shadow ? d._shadow.textContent.trim() : null, isDirty: !!openEditors.isDirtyEditor(n) };
})()`;

scenario("The custom-designer API of BETA 1045", (lane) => {
  let c;
  const kit = projectKit(() => c);
  const disk = (name) => diskText(lane.project, `Sources/${name}`);

  async function waitLine(mark, re, { timeout = 10 * 1000 } = {}) {
    const ok = await waitFor(c, async (c) => (await probeLines(c, mark)).some((l) => re.test(l)), {
      timeout,
      interval: 150,
    });
    const lines = await probeLines(c, mark);
    assert.ok(ok, `the add-in did not print ${re}: ${J(lines)}`);
    return lines;
  }
  // The lines since a mark once none has come for `quiet` ms: long enough for a callback the
  // IDE sends after the call returned, such as an echo of SetFileData, to arrive.
  async function settled(mark, quiet = 1000) {
    let last = -1;
    let lines = [];
    for (let i = 0; i < 40; i++) {
      lines = await probeLines(c, mark);
      if (lines.length === last) return lines;
      last = lines.length;
      await sleep(quiet);
    }
    return lines;
  }
  const tab = (name) => c.evaluate(TAB_JS(name));
  const selected = () => c.evaluate(SELECTED_JS);
  const toolbox = () => c.evaluate(TOOLBOX_JS);
  const dirtyDot = async (name) => (await kit.tabs()).find((t) => t.name === name)?.dirty;
  async function selectTab(name) {
    const t = await tab(name);
    assert.ok(t, `no tab ${name}: ${J(await kit.tabs())}`);
    await kit.clickAt(t.x, t.y);
    await sleep(500);
  }
  // Close a tab with its close icon; answer a question about unsaved changes with `reply`.
  // The question's buttons, or null when nothing was asked.
  async function closeTab(name, reply = null) {
    const t = await waitFor(c, async () => (await tab(name))?.close ?? null, { timeout: 10 * 1000 });
    assert.ok(t, `the tab ${name} has no close icon: ${J(await tab(name))}`);
    await kit.clickAt(t.x, t.y);
    await sleep(700);
    const asked = await kit.questions();
    if (asked.length) {
      assert.ok(reply, `closing ${name} asked ${J(asked)}`);
      await kit.answer(reply);
    }
    assert.ok(
      await waitFor(c, async () => (await tab(name)) === null, { timeout: 10 * 1000 }),
      `the tab ${name} is still open`,
    );
    return asked.length ? asked[0].buttons : null;
  }
  async function clickTool(caption) {
    const r = await c.evaluate(TOOL_AT_JS(caption));
    assert.ok(r, `the TOOLBOX has no ${caption}: ${J(await toolbox())}`);
    const mark = await consoleMark(c);
    await kit.clickAt(r.x, r.y);
    return settled(mark);
  }
  // The file's context menu in the Project Explorer, and its Open with submenu (null when the
  // menu has no Open with), each as its items' text. The menus are left closed.
  async function openWithItems(p, { keepOpen = false } = {}) {
    await kit.rightNode(p);
    const items = await kit.menuItems();
    const ow = items.find((i) => i.text === "Open with");
    let sub = null;
    if (ow) {
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: ow.left + 8, y: ow.y });
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: ow.x, y: ow.y });
      await waitFor(c, async () => (await kit.menuItems(true)).length > 0, { timeout: 4000, interval: 100 });
      await sleep(200);
      sub = (await kit.menuItems(true)).map((i) => i.text);
    }
    if (!keepOpen) await kit.closeMenus();
    return { menu: items.map((i) => i.text), sub };
  }
  // Open a file with a double-click on its row; the probe's lines once they have settled.
  async function openByDoubleClick(name) {
    const mark = await consoleMark(c);
    await kit.doubleClickNode(SRC(name));
    assert.ok(
      await waitFor(c, async () => (await kit.tabs()).some((t) => t.name === name && t.selected)),
      `${name} did not open in a tab: ${J(await kit.tabs())}`,
    );
    return settled(mark);
  }

  before(async () => {
    await lane.addAddin(PROBE);
    c = await lane.open(HOST);
    await kit.expand("/DesignersHost/Sources");
  });

  test("the add-in loads, and every Register returns with no error", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.ok(names.includes("DesignersProbe AddIn"), `loaded: ${J(names)}`);
    const lines = await waitLine(null, /^ready$/);
    assert.deepEqual(lines, ["loaded 0.15.1045", ...REGISTERED, "ready"]);
  });

  test("Register: the page keeps each registration as given, the extension unchanged and the IconData as base64", async () => {
    assert.deepEqual(await c.evaluate(REGISTERED_JS), [
      { name: "Probe Default", extension: ".prb", isDefault: true, icon: "PHN2ZyB4" },
      { name: "Probe Other", extension: ".prb", isDefault: false, icon: "PHN2ZyB4" },
      { name: "Probe NoDot", extension: "prb", isDefault: false, icon: "" },
      { name: "Probe Any", extension: ".*", isDefault: false, icon: "" },
      { name: "Probe Prolog", extension: ".prx", isDefault: true, icon: "PD94bWwg" },
      { name: "Probe Png", extension: ".prp", isDefault: true, icon: "iVBORw0K" },
    ]);
  });

  test("IconData: SVG markup that starts <svg draws, an XML prolog does not, PNG bytes draw", async () => {
    const icons = {};
    for (const f of ["Sample.prb", "UPPER.PRB", "Prolog.prx", "Png.prp", "Other.xyz"]) {
      icons[f] = await c.evaluate(TREE_ICON_JS(SRC(f)), { awaitPromise: true });
    }
    assert.deepEqual(icons, {
      "Sample.prb": { type: "data:image/svg+xml;", shown: "data:image/svg+xml;", width: 16 },
      "UPPER.PRB": { type: "data:image/svg+xml;", shown: "data:image/svg+xml;", width: 16 },
      "Prolog.prx": { type: "data:image;", shown: "data:image;", width: 0 },
      "Png.prp": { type: "data:image;", shown: "data:image;", width: 4 },
      "Other.xyz": { type: null, shown: null, width: null },
    });
  });

  test("opening a file of a default designer's extension: CreateDesigner, OnAttached, OnActivated, then OnFileDataChanged", async () => {
    const lines = await openByDoubleClick("Sample.prb");
    assert.deepEqual(lines, [
      "create Probe Default",
      ...ATTACHED("Probe Default", SRC("Sample.prb")),
      "Probe Default# activated",
      "Probe Default# data n=5 hex=4142434445",
    ]);
    assert.deepEqual(await selected(), {
      name: SRC("Sample.prb"),
      type: "UIDesigner",
      uri: SRC("Sample.prb"),
      body: "Designers probe: Probe Default#1",
      isDirty: false,
    });
    assert.equal((await tab("Sample.prb")).icon, "data:image/svg+xml;");
  });

  test("the TOOLBOX shows the active designer's items, none selected", async () => {
    assert.deepEqual(await toolbox(), [
      { caption: "Change", selected: false },
      { caption: "Restore", selected: false },
    ]);
  });

  test("SetFileData: no OnFileDataChanged follows; the tab is marked changed, the file on disk is not", async () => {
    const lines = await clickTool("Change");
    assert.deepEqual(lines, [
      "Probe Default# click Change",
      "Probe Default# set begin n=6 hex=414243444521",
      "Probe Default# set end err=0",
    ]);
    assert.equal(await dirtyDot("Sample.prb"), true);
    assert.equal((await selected()).isDirty, true);
    assert.equal(disk("Sample.prb"), "ABCDE");
    // A click selects the item.
    assert.deepEqual(await toolbox(), [
      { caption: "Change", selected: true },
      { caption: "Restore", selected: false },
    ]);
  });

  // An IDE defect: fileHandler_CustomDesigner.isDirty clears cachedIsDirtyState, which
  // updateDirtyState then reads to decide whether to take the dot away.
  test("SetFileData with the saved bytes: the page holds the tab unchanged, but its dot stays", async () => {
    const lines = await clickTool("Restore");
    assert.deepEqual(lines, [
      "Probe Default# click Restore",
      "Probe Default# set begin n=5 hex=4142434445",
      "Probe Default# set end err=0",
    ]);
    assert.equal((await selected()).isDirty, false);
    assert.equal(await dirtyDot("Sample.prb"), true);
  });

  test("closing a tab the page holds unchanged: no question; OnClosing, OnDeactivated, OnClosed", async () => {
    const mark = await consoleMark(c);
    assert.equal(await closeTab("Sample.prb"), null);
    assert.deepEqual(await settled(mark), [
      "Probe Default# closing",
      "Probe Default# deactivated",
      "Probe Default# closed",
    ]);
  });

  test("Ctrl+S: OnSaveCompleted alone, the file on disk written, the tab unmarked", async () => {
    assert.deepEqual(await openByDoubleClick("Sample.prb"), [
      "create Probe Default",
      ...ATTACHED("Probe Default", SRC("Sample.prb")),
      "Probe Default# activated",
      "Probe Default# data n=5 hex=4142434445",
    ]);
    await clickTool("Change");
    const mark = await consoleMark(c);
    await pressKey(c, "s", { ctrl: true });
    assert.deepEqual(await settled(mark), ["Probe Default# saved"]);
    assert.ok(
      (await linesSince(c, mark)).some((l) => /saving to disk \[DONE\]/.test(l)),
      "the project was not saved",
    );
    assert.equal(disk("Sample.prb"), "ABCDE!");
    assert.equal(await dirtyDot("Sample.prb"), false);
    assert.equal((await selected()).isDirty, false);
  });

  test("another tab selected and back: OnDeactivated, OnActivated, and the TOOLBOX empty meanwhile", async () => {
    let mark = await consoleMark(c);
    await openFile(c, SRC("Main.twin"));
    assert.deepEqual(await settled(mark), ["Probe Default# deactivated"]);
    assert.deepEqual(await toolbox(), []);
    mark = await consoleMark(c);
    await selectTab("Sample.prb");
    assert.deepEqual(await settled(mark), ["Probe Default# activated"]);
    // The selection made by the click is kept.
    assert.deepEqual(await toolbox(), [
      { caption: "Change", selected: true },
      { caption: "Restore", selected: false },
    ]);
  });

  test("closing a changed tab, answering Save: OnDeactivated, OnClosed, then OnSaveCompleted, and no OnClosing", async () => {
    await clickTool("Change");
    assert.equal(await dirtyDot("Sample.prb"), true);
    const mark = await consoleMark(c);
    assert.deepEqual(await closeTab("Sample.prb", "Save"), ["Save", "Discard Changes", "Cancel"]);
    assert.deepEqual(await settled(mark), [
      "Probe Default# deactivated",
      "Probe Default# closed",
      "Probe Default# saved",
    ]);
    // The bytes go into the project the IDE holds, which stays unsaved: the project file on
    // disk is written by the next save of the project (Ctrl+S above).
    assert.equal(await kit.ideText(SRC("Sample.prb")), "ABCDE!!");
    assert.equal(await c.evaluate("projectIsDirty"), true);
    assert.equal(disk("Sample.prb"), "ABCDE!");
  });

  test("closing a changed tab, answering Discard Changes: OnClosing, OnDeactivated, OnClosed; the IDE keeps the saved bytes", async () => {
    const opened = await openByDoubleClick("Sample.prb");
    assert.equal(opened.at(-1), "Probe Default# data n=7 hex=41424344452121");
    await clickTool("Change");
    const mark = await consoleMark(c);
    assert.deepEqual(await closeTab("Sample.prb", "Discard Changes"), ["Save", "Discard Changes", "Cancel"]);
    assert.deepEqual(await settled(mark), [
      "Probe Default# closing",
      "Probe Default# deactivated",
      "Probe Default# closed",
    ]);
    assert.equal(await kit.ideText(SRC("Sample.prb")), "ABCDE!!");
  });

  test("Open with lists every designer whose extension matches, in registration order, case-insensitively; an extension with no dot matches nothing", async () => {
    const sub = {};
    for (const f of ["Sample.prb", "UPPER.PRB", "Prolog.prx", "Other.xyz", "Main.twin"]) {
      const r = await openWithItems(SRC(f));
      assert.deepEqual(r.menu.slice(0, 3), ["Open", "Open with", "Add"], `${f}'s menu`);
      sub[f] = r.sub;
    }
    assert.deepEqual(sub, {
      "Sample.prb": ["Probe Default", "Probe Other", "Probe Any"],
      "UPPER.PRB": ["Probe Default", "Probe Other", "Probe Any"],
      "Prolog.prx": ["Probe Any", "Probe Prolog"],
      "Other.xyz": ["Probe Any"],
      "Main.twin": ["Probe Any"],
    });
  });

  test("a double-click opens the default designer, whatever the case of the extension; a non-default one is not used", async () => {
    assert.deepEqual(await openByDoubleClick("UPPER.PRB"), [
      "create Probe Default",
      ...ATTACHED("Probe Default", SRC("UPPER.PRB")),
      "Probe Default# activated",
      "Probe Default# data n=5 hex=5550504552",
    ]);
    await closeTab("UPPER.PRB");
    // Only ".*", not a default, matches Other.xyz: the text editor opens it.
    assert.deepEqual(await openByDoubleClick("Other.xyz"), []);
    assert.equal((await selected()).type, "TextEditor");
    await closeTab("Other.xyz");
    assert.deepEqual(await openByDoubleClick("Png.prp"), [
      "create Probe Png",
      ...ATTACHED("Probe Png", SRC("Png.prp")),
      "Probe Png# activated",
      "Probe Png# data n=3 hex=505250",
    ]);
    assert.equal((await tab("Png.prp")).icon, "data:image;");
    await closeTab("Png.prp");
    await settled(await consoleMark(c));
  });

  test("Open with a non-default designer: its factory's CreateDesigner, then the same callbacks", async () => {
    await openWithItems(SRC("Sample.prb"), { keepOpen: true });
    const mark = await consoleMark(c);
    await kit.pick("Probe Other", { sub: true });
    assert.deepEqual(await settled(mark), [
      "create Probe Other",
      ...ATTACHED("Probe Other", SRC("Sample.prb")),
      "Probe Other# activated",
      "Probe Other# data n=7 hex=41424344452121",
    ]);
    await closeTab("Sample.prb");
    await settled(await consoleMark(c));
  });

  test("Editors.Open with a Designer: returns at once; a tab (unnamed), GetURI empty, the Path unused, no OnFileDataChanged", async () => {
    const mark = await consoleMark(c);
    await click(c, "addinButton-DesignersProbeExplicit");
    assert.deepEqual(await settled(mark), [
      "explicit open begin",
      "explicit open end err=0",
      ...ATTACHED("Explicit", ""),
      "Explicit# activated",
    ]);
    const s = await selected();
    assert.deepEqual(s, {
      name: "(unnamed)",
      type: "UIDesigner",
      uri: "",
      body: s.body,
      isDirty: false,
    });
    assert.match(s.body, /^Designers probe: Explicit#\d+$/);
    assert.equal(await tab("Other.xyz"), null);
  });

  test("opening a file while another designer's tab is selected: that one's OnDeactivated comes between OnAttached and OnActivated", async () => {
    assert.deepEqual(await openByDoubleClick("Sample.prb"), [
      "create Probe Default",
      ...ATTACHED("Probe Default", SRC("Sample.prb")),
      "Explicit# deactivated",
      "Probe Default# activated",
      "Probe Default# data n=7 hex=41424344452121",
    ]);
  });

  test("a compiler restart: each file's designer is made again and given the unsaved bytes, with no OnActivated; the (unnamed) tab is not recovered", async () => {
    await clickTool("Change");
    assert.equal(await dirtyDot("Sample.prb"), true);
    const mark = await consoleMark(c);
    await lane.restartCompiler();
    assert.deepEqual(await settled(mark), [
      "loaded 0.15.1045",
      ...REGISTERED,
      "ready",
      "create Probe Default",
      ...ATTACHED("Probe Default", SRC("Sample.prb")),
      "Probe Default# data n=8 hex=4142434445212121",
    ]);
    const s = await selected();
    assert.equal(s.name, SRC("Sample.prb"));
    assert.equal(s.isDirty, true);
    assert.equal(s.body, "Designers probe: Probe Default#1");
    await selectTab("(unnamed)");
    assert.equal((await selected()).body, "Sorry, unable to recover this document");
  });

  // Unregister in IDEs of their own, since it takes the compiler down. The lane throws about
  // the crash from open, which refuses a compile that never settled, and from closeProject.
  async function unregisterRun(mode) {
    await lane.closeProject();
    let opened = null;
    let crash = null;
    let lines = [];
    try {
      await lane.open(HOST, { env: { TB_DESIGNERS_UNREGISTER: mode }, timeout: 60 * 1000 });
    } catch (e) {
      opened = e.message.split("\n")[0];
    }
    try {
      if (lane.c) lines = await linesSince(lane.c, null);
    } finally {
      try {
        await lane.closeProject();
      } catch (e) {
        crash = e.message.split("\n")[0];
      }
    }
    return { opened, crash, lines };
  }

  test("Unregister ends the compiler with an access violation, for a registered extension or not, with an error handler or not", async (t) => {
    for (const mode of ["resume .prb", "plain .zzz"]) {
      const r = await unregisterRun(mode);
      const [how, ext] = mode.split(" ");
      t.diagnostic(`${mode}: ${r.opened}`);
      assert.match(r.opened ?? "", /the compiler crashed/, `${mode}: open ${J(r.opened)}`);
      assert.match(r.crash ?? "", /the compiler crashed/, `${mode}: close ${J(r.crash)}`);
      const begun = r.lines.filter((l) => /^\[DesignersProbe\] \d+ unregister /.test(l));
      assert.ok(begun.length >= 2, `${mode}: ${J(begun)}`);
      // Each compiler the IDE started reached the call and never printed the line after it.
      for (const l of begun) assert.match(l, new RegExp(`unregister ${ext.replace(".", "\\.")} begin, ${how}$`));
      const exceptions = r.lines.filter((l) => /NATIVE EXCEPTION/.test(l));
      assert.ok(exceptions.length >= 1);
      for (const l of exceptions) {
        assert.match(
          l,
          /NATIVE EXCEPTION: ACCESS_VIOLATION +\{no-basic-code\} \[\$80004001\?DesignersProbe\.dll\+[0-9A-F]+\]/,
        );
      }
    }
  });
});
