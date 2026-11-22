// The Menus, ProjectExplorer and theme-colour features of tbIDE new in BETA 1045, measured rather
// than read off the IDE's code (.claude/beta1045/facts-host.md, "Needs a probe" 9, 11 to 15, 17
// and 19). The MenusProbe add-in (probes/menus) adds entries to the Project Explorer's file-view
// context menu and the File menu, two custom menu-bar menus (ProbeFirst as its very first menu
// call, ProbeAfter after entries elsewhere) and an invisible one for ShowPopup; its toolbar
// buttons change and remove entries, print SelectedItemPath, call AddFileUI and open tool windows
// painted with the --themeAddin* variables. The UnsupportedProbe add-in (probes/unsupported)
// returns tbIDE's UnsupportedHostAddin. The project opened is probes/menus-host, which has a folder
// inside Sources and two beside it.
//
// Input is real input: menus are opened with real clicks and right clicks and read from the page's
// DOM (#contextMenu, #contextMenuSUB, the menu bar). Themes are switched through the Window >
// Theme list, as test/ide/customising.test.mjs does; the IDE runs with --no-save-ide-settings, so
// the choice is not saved. Neither add-in calls SaveSetting.
//
// Each test states what BETA 1045 does. If one fails after an IDE update, the IDE has changed:
// update the tbIDE pages that rest on it (docs/Reference/Built-In/tbIDE/Menus.md, Menu.md,
// MenuEntry.md, ProjectExplorer.md, Themes.md, AddIn.md) and docs/IDE/Customising/Themes.md, and
// then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { loadedAddins } from "../../scripts/lib/tb-ide-addins.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, clickAt, pressKey, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "probes", "menus-host");
const PROBE = path.join(HERE, "probes", "menus");
const UNSUPPORTED = path.join(HERE, "probes", "unsupported");
const P = "/MenusHost";
const J = JSON.stringify;
const ADDIN_VARS = [
  "--themeAddinBackColor",
  "--themeAddinPanelBackColor",
  "--themeAddinControlBackColor",
  "--themeAddinBorderColor",
  "--themeAddinForeColor",
  "--themeAddinSecondaryForeColor",
  "--themeAddinAccentBackColor",
  "--themeAddinAccentForeColor",
];

// ------------------------------------------------------------------ reading the page

// Every element of the open menu (level 0) or of its first submenu (level 1), in order: a
// separator is an "hr"; `shown` is whether it has a size; `icon` the start of an add-in icon's
// background image.
const MENU_JS = (sub) => `(() => {
  const m = document.querySelector(${J(sub ? "#contextMenuSUB" : "#contextMenu")});
  if (!m) return [];
  return [...m.children].map((e) => {
    const r = e.getBoundingClientRect();
    const img = e.querySelector(".customMenuImage");
    return {
      tag: e.tagName.toLowerCase(),
      text: e.tagName === "HR" ? "" : (e.childNodes[e.childNodes.length - 1]?.nodeType === 3 ? e.childNodes[e.childNodes.length - 1].textContent : e.innerText).trim(),
      full: e.innerText.replace(/\\s+/g, " ").trim(),
      disabled: e.classList.contains("contextMenuItemDisabled"),
      superHidden: e.classList.contains("contextMenuItemSuperHidden"),
      shown: r.width > 0 && r.height > 0,
      icon: img ? img.style.backgroundImage.slice(0, 40) : null,
      x: r.x + r.width / 2, y: r.y + r.height / 2, left: r.x, top: r.y,
    };
  });
})()`;

const MENU_OPEN_JS = `(() => { const m = document.querySelector("#contextMenu"); const r = m && m.getBoundingClientRect();
  return !!m && r.width > 0 && m.children.length > 0 && getComputedStyle(m).visibility !== "hidden" && getComputedStyle(m).display !== "none"; })()`;

const MENU_BOX_JS = `(() => { const r = document.querySelector("#contextMenu").getBoundingClientRect(); return { left: r.left, top: r.top }; })()`;

// The menu bar's items: text, id, shown.
const BAR_JS = `[...rootMenuFile.parentNode.children].map((e) => ({
  id: e.id, text: e.innerText.trim(), cls: String(e.className),
  shown: getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0,
}))`;

// The --themeAddin* values on the page's root, inline on a tool window's body, computed there,
// and the background its box paints.
const THEME_JS = (id) => `(() => {
  const names = ${J(ADDIN_VARS)};
  const w = toolWindowsById[${J(id)}];
  const b = w.bodyElement;
  const root = getComputedStyle(document.documentElement);
  const cb = getComputedStyle(b);
  return {
    theme: getThemeName(),
    root: names.map((n) => root.getPropertyValue(n).trim()),
    inline: names.map((n) => b.style.getPropertyValue(n).trim()),
    computed: names.map((n) => cb.getPropertyValue(n).trim()),
    box: getComputedStyle(b.querySelector(${J(`#${id}Theme`)})).backgroundColor,
  };
})()`;

// A file of the project as the IDE holds it, as text, or null.
const READ_JS = (p) => `new Promise((res) => {
  const n = fs.tree.resolvePath("twinbasic:" + ${J(p)});
  if (!n) return res(null);
  setTimeout(() => res("(no answer)"), 8000);
  fs.readFile(n, (enc, data) => res(new TextDecoder().decode(new Uint8Array(data))));
})`;

// Where a tree row is, scrolled into view, or null.
const NODE_AT_JS = (p) => `(() => {
  const n = fs.tree.resolvePath("twinbasic:" + ${J(p)});
  if (!n || !n.innerDiv) return null;
  n.innerDiv.scrollIntoView({ block: "nearest" });
  const r = n.innerDiv.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.x + Math.min(r.width / 2, 30), y: r.y + r.height / 2 };
})()`;

// What the page holds of each add-in's entries: for each add-in, each menu id and how many entries it holds.
const STORE_JS = `Object.values(g_ExtensibilityMenus).map((a) => ({ custom: Object.values(a.__detachedMenus || {}).map((d) => d.caption), menus: Object.fromEntries(Object.entries(a.children || {}).map(([k, v]) => [k.length > 40 ? k.slice(0, 40) : k, Object.keys(v.children || {}).length])) }))`;

// Records every message msgBox shows, as text.
const GUARD_JS = `(() => {
  if (window.__menusGuarded) return;
  window.__menusGuarded = true;
  window.__msg = [];
  const real = msgBox;
  msgBox = function (t, ...r) { window.__msg.push(String(t).replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim()); return real.apply(this, [t, ...r]); };
})()`;

// ------------------------------------------------------------------ the tests

scenario("tbIDE Menus, ProjectExplorer and theme colours (BETA 1045)", (lane) => {
  let c;
  const lines = (mark) => linesSince(c, mark, { prefix: "[MenusProbe] " });
  const waitLine = async (mark, re, timeout = 10 * 1000) =>
    waitFor(c, async () => (await lines(mark)).find((l) => re.test(l)) ?? null, { timeout });
  const menu = (sub = false) => c.evaluate(MENU_JS(sub));
  const shownMenu = async (sub = false) => (await menu(sub)).filter((i) => i.shown);
  const texts = async (sub = false) => (await shownMenu(sub)).map((i) => (i.tag === "hr" ? "---" : i.text));
  const menuOpen = () => c.evaluate(MENU_OPEN_JS);
  const bar = () => c.evaluate(BAR_JS);

  async function closeMenus() {
    await c.evaluate("try { hideContextMenu() } catch {}");
    await sleep(300);
  }
  async function rightClickAt(x, y) {
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    for (const type of ["mousePressed", "mouseReleased"]) {
      await c.send("Input.dispatchMouseEvent", { type, x, y, button: "right", clickCount: 1 });
    }
  }
  async function nodeAt(p) {
    const r = await c.evaluate(NODE_AT_JS(p));
    assert.ok(r, `no visible row ${p}`);
    return r;
  }
  async function clickNode(p) {
    const r = await nodeAt(p);
    await clickAt(c, r.x, r.y);
    await sleep(300);
  }
  async function expand(p) {
    const r = await c.evaluate(`(() => {
      const n = fs.tree.resolvePath("twinbasic:" + ${J(p)});
      if (!n || !n.isCollapsed) return null;
      const i = n.domObject.querySelector(".treeNodeIcon");
      const q = i.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    if (r) {
      await clickAt(c, r.x, r.y);
      await sleep(400);
    }
  }
  // Right-click a row of the Project Explorer and wait for the menu; its items as shown.
  async function openRowMenu(p) {
    const r = await nodeAt(p);
    await clickAt(c, r.x, r.y);
    await sleep(200);
    await rightClickAt(r.x, r.y);
    assert.ok(await waitFor(c, menuOpen, { timeout: 5000, interval: 100 }), `no menu opened on ${p}`);
    await sleep(300);
    return shownMenu();
  }
  // Click an item of the open menu by its text.
  async function pick(text, { sub = false } = {}) {
    const it = (await shownMenu(sub)).find((i) => i.text === text);
    assert.ok(it, `no menu item ${text}: ${J(await texts(sub))}`);
    await clickAt(c, it.x, it.y);
    await sleep(400);
  }
  async function hover(text) {
    const it = (await shownMenu()).find((i) => i.text === text);
    assert.ok(it, `no menu item ${text}: ${J(await texts())}`);
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: it.left + 8, y: it.y });
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: it.x, y: it.y });
  }
  async function clickBar(text) {
    const r = await c.evaluate(`(() => {
      const e = [...rootMenuFile.parentNode.children].find((e) => e.innerText.trim() === ${J(text)});
      if (!e) return null;
      const q = e.getBoundingClientRect();
      return q.width ? { x: q.x + q.width / 2, y: q.y + q.height / 2 } : null;
    })()`);
    assert.ok(r, `no menu-bar item ${text}: ${J(await bar())}`);
    await clickAt(c, r.x, r.y);
    await sleep(500);
  }
  // Click a toolbar button of the probe and wait for the line it prints.
  async function button(id, re) {
    const mark = await consoleMark(c);
    await click(c, `addinButton-${id}`);
    if (!re) return null;
    const l = await waitLine(mark, re);
    assert.ok(l, `${id} printed nothing matching ${re}: ${J(await lines(mark))}`);
    return l;
  }
  async function chooseTheme(label) {
    await c.evaluate(`executeIdeCommand("tbThemes_ShowList")`);
    await sleep(600);
    const at = await c.evaluate(`(() => {
      const l = ${J(label)};
      const it = [...document.querySelectorAll("#contextMenu > *")].find((e) => { const t = e.innerText.trim(); return t === l || t.startsWith(l + " ("); });
      if (!it) return null;
      const q = it.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(at, `the theme list has no item ${label}: ${J(await texts())}`);
    await clickAt(c, at.x, at.y);
    await sleep(1000);
    await closeMenus();
  }

  before(async () => {
    await lane.addAddin(PROBE);
    await lane.addAddin(UNSUPPORTED);
    c = await lane.open(HOST);
    await c.evaluate(GUARD_JS);
    assert.ok(await waitLine(null, /^loaded/, 20 * 1000), "the probe did not finish loading");
  });

  const idsLine = async () => (await lines(null)).find((l) => l.startsWith("ids ")) ?? "";
  const idOf = (s, key) => new RegExp(`(?:^| )${key}=(\\S+)`).exec(s)?.[1];
  const GUID = /^\{[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\}$/;
  const PE_FILE = `${P}/Sources/Main.twin`;
  // The entries the probe adds to the Project Explorer's menu, as they stand at the end of the
  // menu on a file, after the IDE's own items.
  const tail = (all) => all.slice(all.indexOf("P unknown command"));

  test("both add-ins load, and Host.CompilerVersion is 0.15.1045", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.deepEqual(names.slice().sort(), ["", "MenusProbe AddIn"]);
    assert.ok((await lines(null)).includes("version <0.15.1045>"), J(await lines(null)));
  });

  test("UnsupportedHostAddin: listed with an empty name, drawn as a separator in the Add-Ins menu, and nothing in the console", async () => {
    const all = await linesSince(c, null);
    // The only console line about it is the probe's own: no load failure.
    assert.deepEqual(
      all.filter((l) => /UnsupportedProbe/i.test(l)),
      ["[UnsupportedProbe] returning UnsupportedHostAddin"],
    );
    await clickBar("Add-Ins");
    assert.deepEqual(await texts(), ["---", "MenusProbe AddIn"]);
    await closeMenus();
  });

  test("Menu.Id and MenuEntry.Id: a named menu's is its property name, a custom menu's and an entry's a GUID, a submenu's the dotted path", async () => {
    const s = await idsLine();
    assert.equal(idOf(s, "pe"), "ProjectExplorerFileViewContextMenu");
    assert.equal(idOf(s, "pecaption"), "ProjectExplorerFileViewContextMenu");
    assert.equal(idOf(s, "pevisible"), "True");
    assert.match(idOf(s, "first"), GUID);
    assert.equal(idOf(s, "firstcaption"), "ProbeFirst");
    // An invisible custom menu's Visible reads True.
    assert.equal(idOf(s, "popupvisible"), "True");
    assert.match(idOf(s, "entry"), GUID);
    assert.equal(idOf(s, "entryparent"), "ProjectExplorerFileViewContextMenu");
    const sub = idOf(s, "sub");
    assert.match(sub, GUID);
    assert.equal(idOf(s, "subchildren"), `ProjectExplorerFileViewContextMenu.${sub}`);
    assert.match(idOf(s, "child"), GUID);
    assert.equal(idOf(s, "childparent"), `ProjectExplorerFileViewContextMenu.${sub}`);
  });

  test('SelectedItemPath is "" with nothing selected', async () => {
    assert.equal(await c.evaluate("fs.tree.selectedItem ? 1 : null"), null);
    assert.equal(await button("MenusProbeSelected", /^selected/), "selected <>");
  });

  test("AddEntry on a named menu: RelativeToCommand and RelativePriority, a separator, Visible, Enabled, Checked, IconData; BeforeShow on the first opening; Click", async () => {
    const mark = await consoleMark(c);
    await openRowMenu(PE_FILE);
    const all = await texts();
    // Priority -1 before the command, 0 and 1 after it, ties in the order added.
    assert.deepEqual(all.slice(0, 5), ["P before Open", "Open", "P after Open 0", "P after Open 0b", "P after Open 1"]);
    // An unknown command and none both go to the end, in the order added; AddEntry() is a
    // separator; Visible = False is not drawn; BeforeShow's Caption and Visible show on this opening.
    assert.deepEqual(tail(all), [
      "P unknown command",
      "P no relative",
      "---",
      "P disabled",
      "P checked",
      "P icon",
      "P submenu",
      "P before show 1",
      "P remove me",
    ]);
    const items = await menu();
    const item = (t) => items.find((i) => i.text === t);
    assert.equal(item("P hidden").superHidden, true);
    assert.equal(item("P toggled").shown, false);
    assert.equal(item("P disabled").disabled, true);
    // Checked replaces the icon with the IDE's own PNG check mark; an SVG string is drawn as SVG.
    assert.equal(item("P checked").icon, 'url("data:image;base64,iVBORw0KGgoAAAANS');
    assert.equal(item("P icon").icon, 'url("data:image/svg+xml;base64,PHN2ZyB4b');
    assert.deepEqual(await lines(mark), ["beforeshow 1"]);
    const m2 = await consoleMark(c);
    await pick("P after Open 0");
    assert.ok(await waitLine(m2, /^click after open 0$/), J(await lines(m2)));
    assert.equal(await menuOpen(), false);
  });

  test("BeforeShow fires on every opening; an entry added in it shows on that opening; a submenu entry's Click never fires", async () => {
    const mark = await consoleMark(c);
    await openRowMenu(PE_FILE);
    assert.deepEqual(tail(await texts()), [
      "P unknown command",
      "P no relative",
      "---",
      "P disabled",
      "P checked",
      "P icon",
      "P submenu",
      "P before show 2",
      "P toggled",
      "P remove me",
      "P added in BeforeShow",
    ]);
    await hover("P submenu");
    assert.ok(await waitFor(c, async () => (await texts(true)).length > 0, { timeout: 3000 }), "no submenu");
    assert.deepEqual(await texts(true), ["P child 1", "P child 2"]);
    // A child's BeforeShow fires when its submenu opens.
    assert.deepEqual(await lines(mark), ["beforeshow 2", "beforeshow child 2"]);
    // A click on the entry that holds the submenu sends no Click, and the menu stays open.
    const m2 = await consoleMark(c);
    await pick("P submenu");
    await sleep(1000);
    assert.deepEqual(
      (await lines(m2)).filter((l) => l.startsWith("click")),
      [],
    );
    assert.equal(await menuOpen(), true);
    if (!(await texts(true)).length) {
      await hover("P submenu");
      await waitFor(c, async () => (await texts(true)).length > 0, { timeout: 3000 });
    }
    const child = (await shownMenu(true)).find((i) => i.text === "P child 1");
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: child.left + 5, y: child.y });
    const m3 = await consoleMark(c);
    await clickAt(c, child.x, child.y);
    assert.ok(await waitLine(m3, /^click child 1$/), J(await lines(m3)));
    await closeMenus();
  });

  test("on a folder the IDE hides Open, and the entries placed by it keep their places", async () => {
    await openRowMenu(`${P}/Sources/Inner`);
    const all = await texts();
    assert.deepEqual(all.slice(0, 5), ["P before Open", "P after Open 0", "P after Open 0b", "P after Open 1", "Add"]);
    assert.ok(all.includes("P before show 3"), J(all));
    await closeMenus();
  });

  test("the File menu: an entry before tbEditor_Save, and one at the end", async () => {
    await clickBar("File");
    const all = await texts();
    const save = all.findIndex((t) => t.startsWith("Save Current Document"));
    assert.equal(all[save - 1], "P file before Save");
    assert.equal(all[all.length - 1], "P file end");
    await closeMenus();
  });

  test("AddCustom: a menu-bar item after Help; the add-in's first menu call gives one that does not open, and whose Caption and Visible do not change it", async () => {
    const b = (await bar()).map((i) => i.text);
    const help = b.indexOf("Help");
    assert.deepEqual(b.slice(help, help + 4), ["Help", "ProbeFirst", "ProbeAfter", "ProbePopup"]);
    const shown = Object.fromEntries((await bar()).map((i) => [i.text, i.shown]));
    assert.equal(shown.ProbePopup, false); // AddCustom(..., False)
    // ProbeFirst, made before any other menu call, does not open.
    let mark = await consoleMark(c);
    await clickBar("ProbeFirst");
    assert.equal(await menuOpen(), false);
    await closeMenus();
    // ProbeAfter opens with its entry, whose Click fires.
    await clickBar("ProbeAfter");
    assert.equal(await menuOpen(), true);
    assert.deepEqual(await texts(), ["After item"]);
    mark = await consoleMark(c);
    await pick("After item");
    assert.ok(await waitLine(mark, /^click after item$/));
    await closeMenus();
    // Caption: ProbeAfter's bar item changes, ProbeFirst's does not, though both read back the
    // new caption; a named menu's Caption cannot be set (E_NOTIMPL) and reads its id.
    mark = await consoleMark(c);
    assert.equal(
      await button("MenusProbeCaption", /^captions/),
      "captions first=ProbeFirst2 after=ProbeAfter2 file=FileMenu",
    );
    assert.ok((await lines(mark)).includes("named caption error -2147467263"));
    let names = (await bar()).map((i) => i.text);
    assert.ok(
      names.includes("ProbeFirst") && names.includes("ProbeAfter2") && !names.includes("ProbeFirst2"),
      J(names),
    );
    // Visible = False hides ProbeAfter2 and leaves ProbeFirst shown; both read back False.
    assert.equal(await button("MenusProbeHide", /^hidden/), "hidden first=False after=False");
    names = Object.fromEntries((await bar()).map((i) => [i.text, i.shown]));
    assert.equal(names.ProbeFirst, true);
    assert.equal(names.ProbeAfter2, false);
  });

  test("ShowPopup: a custom menu opens with its top-left at the point given; a named menu shows nothing", async () => {
    await button("MenusProbeShow", /^shown MenusProbeWin$/);
    await sleep(500);
    let mark = await consoleMark(c);
    await click(c, { toolWindow: "MenusProbeWin", css: "#MenusProbeWinPopupCustom" });
    const at = /^popup custom at (\d+),(\d+)$/.exec(await waitLine(mark, /^popup custom at/));
    assert.ok(await waitFor(c, menuOpen, { timeout: 3000 }), "the popup did not open");
    assert.deepEqual(await c.evaluate(MENU_BOX_JS), { left: Number(at[1]), top: Number(at[2]) });
    assert.deepEqual(await texts(), ["Popup item 1", "Popup item 2"]);
    mark = await consoleMark(c);
    await pick("Popup item 2");
    assert.ok(await waitLine(mark, /^click popup 2$/));
    await closeMenus();
    // The Project Explorer's menu (from a click and from a toolbar button) and the File menu.
    for (const [how, re] of [
      [{ toolWindow: "MenusProbeWin", css: "#MenusProbeWinPopupNamed" }, /^popup named at/],
      [{ toolWindow: "MenusProbeWin", css: "#MenusProbeWinPopupFile" }, /^popup file at/],
      ["addinButton-MenusProbePopupPE", /^popup pe from button$/],
    ]) {
      mark = await consoleMark(c);
      await click(c, how);
      assert.ok(await waitLine(mark, re));
      await sleep(1500);
      assert.equal(await menuOpen(), false, J(how));
      assert.deepEqual(
        (await lines(mark)).filter((l) => l.startsWith("beforeshow")),
        [],
      );
    }
  });

  test("MenuEntry.Remove removes one entry; Menu.RemoveAllAddedEntries the menu's", async () => {
    await button("MenusProbeRemove", /^removed one/);
    await openRowMenu(PE_FILE);
    assert.ok(!(await texts()).includes("P remove me"));
    await closeMenus();
    await button("MenusProbeRemoveFile", /^removed file/);
    await clickBar("File");
    assert.deepEqual(
      (await texts()).filter((t) => t.startsWith("P ")),
      [],
    );
    await closeMenus();
    await openRowMenu(PE_FILE);
    assert.ok((await texts()).includes("P before Open"));
    await closeMenus();
  });

  test('SelectedItemPath: "twinbasic:" and the full path, for a file and for a folder', async () => {
    await expand(`${P}/Sources/Inner`);
    await clickNode(`${P}/Sources/Inner/Inner.twin`);
    assert.equal(await button("MenusProbeSelected", /^selected/), `selected <twinbasic:${P}/Sources/Inner/Inner.twin>`);
    await clickNode(`${P}/Notes`);
    assert.equal(await button("MenusProbeSelected", /^selected/), `selected <twinbasic:${P}/Notes>`);
  });

  // Starts AddFileUI with `p` selected, and returns the rename box's state.
  async function startAddFile(p) {
    await expand(`${P}/Sources/Inner`);
    await clickNode(p);
    const mark = await consoleMark(c);
    await click(c, "addinButton-MenusProbeAddFile");
    const box = await waitFor(
      c,
      () =>
        c.evaluate(`(() => { const i = document.getElementById("renameInput"); if (!i || !i.getBoundingClientRect().width) return null;
        return { value: i.value, start: i.selectionStart, end: i.selectionEnd }; })()`),
      { timeout: 5000 },
    );
    assert.ok(box, "AddFileUI showed no name box");
    await sleep(500);
    return { mark, box };
  }
  const read = (p) => c.evaluate(READ_JS(p), { awaitPromise: true });

  test("AddFileUI: the name box; Enter returns the new file's path without twinbasic:, and Escape, an empty name and an invalid one return an empty string rather than raise an error", async () => {
    const inner = `${P}/Sources/Inner`;
    let { mark, box } = await startAddFile(`${inner}/Inner.twin`);
    assert.deepEqual(box, { value: "MyFile.prb", start: 0, end: 6 });
    await pressKey(c, "Enter");
    assert.equal(await waitLine(mark, /^addfile/), `addfile ok <${inner}/MyFile.prb>`);
    assert.equal(await read(`${inner}/MyFile.prb`), "hello");
    // The suggestion is made unique; Escape returns "" and creates nothing.
    ({ mark, box } = await startAddFile(`${inner}/Inner.twin`));
    assert.equal(box.value, "MyFile2.prb");
    await pressKey(c, "Escape");
    assert.equal(await waitLine(mark, /^addfile/), "addfile ok <>");
    assert.equal(await read(`${inner}/MyFile2.prb`), null);
    // An empty name.
    ({ mark } = await startAddFile(`${inner}/Inner.twin`));
    await pressKey(c, "a", { ctrl: true });
    await pressKey(c, "Backspace");
    await pressKey(c, "Enter");
    assert.equal(await waitLine(mark, /^addfile/), "addfile ok <>");
    // An invalid name: the IDE says so, and the call returns "".
    ({ mark } = await startAddFile(`${inner}/Inner.twin`));
    await typeText(c, "bad\\name");
    await pressKey(c, "Enter");
    assert.equal(await waitLine(mark, /^addfile/), "addfile ok <>");
    assert.ok((await c.evaluate("window.__msg")).includes("Cannot create: the new name entered is invalid."));
    // A name typed with the extension keeps one extension.
    ({ mark } = await startAddFile(`${inner}/Inner.twin`));
    await pressKey(c, "a", { ctrl: true });
    await typeText(c, "Typed.prb");
    await pressKey(c, "Enter");
    assert.equal(await waitLine(mark, /^addfile/), `addfile ok <${inner}/Typed.prb>`);
  });

  test("AddFileUI with a folder beside Sources selected: the file goes in Sources, unless the folder's name starts with Sources", async () => {
    let { mark } = await startAddFile(`${P}/Notes`);
    await pressKey(c, "Enter");
    assert.equal(await waitLine(mark, /^addfile/), `addfile ok <${P}/Sources/MyFile.prb>`);
    ({ mark } = await startAddFile(`${P}/SourcesExtra`));
    await pressKey(c, "Enter");
    assert.equal(await waitLine(mark, /^addfile/), `addfile ok <${P}/SourcesExtra/MyFile.prb>`);
  });

  const DARK = ["#2b2b2b", "#494343", "#575050", "#666060", "#eeeeee", "#BCB5B5", "#AC947A", "#1F1B18"];
  const LIGHT = ["#FFFFFF", "#F0F0F0", "#E1E4E6", "#C3CDDA", "#20232B", "#606A79", "#3E6FC1", "#FFFFFF"];

  test("--themeAddin*: a tool window keeps the colours of the theme it was made in; High Contrast Dark has Dark's", async () => {
    const theme = (id) => c.evaluate(THEME_JS(id));
    let s = await theme("MenusProbeWin");
    assert.deepEqual([s.theme, s.root, s.inline, s.computed, s.box], ["dark", DARK, DARK, DARK, "rgb(43, 43, 43)"]);
    const mark = await consoleMark(c);
    await chooseTheme("Light");
    s = await theme("MenusProbeWin");
    assert.deepEqual([s.theme, s.root, s.inline, s.computed, s.box], ["light", LIGHT, DARK, DARK, "rgb(43, 43, 43)"]);
    // OnChangedTheme is told the theme's name in lower case.
    assert.ok(await waitLine(mark, /^theme changed light$/), J(await lines(mark)));
    await button("MenusProbeShow2", /^shown MenusProbeWin2$/);
    s = await theme("MenusProbeWin2");
    assert.deepEqual([s.inline, s.computed, s.box], [LIGHT, LIGHT, "rgb(255, 255, 255)"]);
    // Chosen from Light, so the values are not left over from the theme before.
    await chooseTheme("High Contrast Dark");
    s = await theme("MenusProbeWin2");
    assert.deepEqual([s.theme, s.root, s.inline], ["high contrast dark", DARK, LIGHT]);
    await chooseTheme("Dark");
  });

  test("Menus.RemoveAllAddedEntries changes nothing; a compiler restart drops every entry, the add-in adds its own again, and the dead ProbeFirst item stays", async () => {
    const store = () => c.evaluate(STORE_JS);
    await button("MenusProbeLate", /^added late/);
    const before = await store();
    await button("MenusProbeRemoveAll", /^removed all/);
    await sleep(800);
    assert.deepEqual(await store(), before);
    await clickBar("File");
    assert.deepEqual(
      (await texts()).filter((t) => t.startsWith("P ")),
      ["P late"],
    );
    await closeMenus();
    const mark = await consoleMark(c);
    await lane.restartCompiler();
    assert.ok(await waitLine(mark, /^loaded/, 30 * 1000), "the probe did not load again");
    await sleep(1000);
    const b = (await bar()).filter((i) => i.shown).map((i) => i.text);
    assert.deepEqual(b.slice(b.indexOf("Help"), b.indexOf("Help") + 4), [
      "Help",
      "ProbeFirst",
      "ProbeFirst",
      "ProbeAfter",
    ]);
    await clickBar("File");
    assert.deepEqual(
      (await texts()).filter((t) => t.startsWith("P ")),
      ["P file before Save", "P file end"],
    );
    await closeMenus();
    await openRowMenu(PE_FILE);
    const all = await texts();
    assert.ok(all.includes("P before show 1") && all.includes("P remove me"), J(all));
    await closeMenus();
  });
});
