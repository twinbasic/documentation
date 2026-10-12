// What the three Project Explorer lanes share: projects.test.mjs, projects-loss.test.mjs and
// projects-import-crash.test.mjs. Not a lane itself (lanes.mjs does not name it).
//
// Each lane opens test/ide/probes/projects, the project ProjectsProbe, in a lane's copy of the
// install, and works its Project Explorer with real input: clicks, right clicks, keys and drags
// through CDP. Drags go through CDP's drag interception, as an HTML drag needs.
//
// guard() replaces the page's hostAppObject, as soon as each project is open, by a proxy that
//  - does nothing for SaveIDESetting, ChangeWindowSetting, AddRecentsList and RemoveRecentsList,
//    which write the user's own registry;
//  - answers every native dialog the IDE could open (Open, Save As, Browse For Folder, the file
//    pickers) from window.__answers[name], "" (Cancel) when none is set: a lane cannot see a
//    native dialog, and every path it answers is in the lane's work folder;
//  - records every Shell call and runs only the IDE's own taskkill of its compiler, so nothing
//    starts a program;
//  - records the window titles the IDE sets, which carry the unsaved-changes dot.
// It also replaces the clipboard with one in the page (Copy and Cut in Project Explorer write
// text/html), so the user's clipboard is never read or written, and records the page's uncaught
// errors and the notifications msgBox shows.

import assert from "node:assert/strict";
import { readProject } from "../../scripts/impexp.mjs";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { pressKey, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";

export const J = JSON.stringify;
export const NAME = "ProjectsProbe";
/** An IDE path of the probe project. */
export const P = (rel = "") => (rel ? `/${NAME}/${rel}` : `/${NAME}`);

const GUARD_JS = `(() => {
  if (window.__guarded) return true;
  window.__guarded = true;
  window.__answers = {};
  window.__hostCalls = [];
  window.__titles = [];
  window.__errors = [];
  window.__msg = [];
  window.addEventListener("error", (e) => window.__errors.push(String(e.message)));
  window.addEventListener("unhandledrejection", (e) => window.__errors.push("rejection: " + String(e.reason && e.reason.message || e.reason)));
  const blocked = new Set(["SaveIDESetting", "ChangeWindowSetting", "AddRecentsList", "RemoveRecentsList"]);
  const dialogs = new Set(["ChooseFolder", "OpenFiles", "OpenIconCursor", "OpenImage", "OpenPackage", "OpenProject", "OpenProjectVBP", "OpenTypeLibrary", "SaveProjectAs"]);
  hostAppObject = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      if (dialogs.has(key)) return (...args) => {
        const a = window.__answers[key] ?? "";
        window.__hostCalls.push([key, args.map(String), a]);
        return Promise.resolve(a);
      };
      if (key === "Shell") return (cmdline, ...rest) => {
        window.__hostCalls.push(["Shell", [String(cmdline)], ""]);
        if (/^taskkill \\/PID \\d+ \\/F$/.test(String(cmdline))) return target.Shell(cmdline, ...rest);
        return Promise.resolve(0);
      };
      if (key === "SetWindowTitle") return (t, ...rest) => { window.__titles.push(String(t)); return target.SetWindowTitle(t, ...rest); };
      return Reflect.get(target, key);
    },
  });
  // TWINSERV's package list, which Available Packages asks for: never fetched.
  window.__dropped = [];
  if (typeof getPackages === "function") getPackages = function () { window.__dropped.push("getPackages"); };
  // The clipboard, in the page.
  window.__clip = [];
  const item = (type, text) => ({ types: [type], getType: (t) => Promise.resolve(new Blob([t === type ? text : ""], { type })) });
  navigator.clipboard.writeText = (t) => { window.__clip = [item("text/plain", String(t))]; return Promise.resolve(); };
  navigator.clipboard.readText = () => { const i = window.__clip.find((x) => x.types.includes("text/plain")); return i ? i.getType("text/plain").then((b) => b.text()) : Promise.resolve(""); };
  navigator.clipboard.write = async (items) => {
    const out = [];
    for (const it of items) for (const t of it.types) out.push(item(t, await (await it.getType(t)).text()));
    window.__clip = out;
  };
  navigator.clipboard.read = () => Promise.resolve(window.__clip.slice());
  window.__clipText = async () => { const out = []; for (const i of window.__clip) for (const t of i.types) out.push(t + ": " + await (await i.getType(t)).text()); return out; };
  const request = debugSocket.request.bind(debugSocket);
  debugSocket.request = function (method, params, cb, ...rest) {
    if (method === "copyClipboardIDE") { window.__clip = [item("text/plain", params.text)]; cb && cb({ body: {} }); return; }
    if (method === "readClipboardIDE") { window.__clipText().then((t) => cb && cb({ body: { text: (t.find((x) => x.startsWith("text/plain: ")) || "text/plain: ").slice(12) } })); return; }
    return request(method, params, cb, ...rest);
  };
  // Every notification msgBox shows, as text.
  const real = msgBox;
  msgBox = function (t, ...r) { window.__msg.push(String(t).replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim()); return real.apply(this, [t, ...r]); };
  return true;
})()`;

// Every node of the file view: path, name, folder, collapsed, shown.
const ROWS_JS = (all) => `(() => {
  const out = [];
  const sel = new Set(fs.tree.selectedItems);
  const walk = (f) => {
    const es = f.getSortedEntries ? f.getSortedEntries() : f.entries || {};
    for (const k in es) {
      const e = es[k];
      const dom = e.domObject;
      const shown = !!dom && dom.style.display !== "none" && !!dom.getBoundingClientRect().height;
      if (${all} || shown) out.push({ path: e.getFullPath(), name: e.name, folder: !!e.isFolder, collapsed: !!e.isCollapsed, sel: sel.has(e), shown });
      if (e.isFolder && (${all} || !e.isCollapsed)) walk(e);
    }
  };
  walk(fs.tree.rootFolder);
  return out;
})()`;

const NODE_AT_JS = (p) => `(() => {
  const n = fs.tree.resolvePath("twinbasic:" + ${J(p)});
  if (!n || !n.innerDiv) return null;
  n.innerDiv.scrollIntoView({ block: "nearest" });
  const r = n.innerDiv.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.x + Math.min(r.width / 2, 30), y: r.y + r.height / 2 };
})()`;

const MENU_ITEMS_JS = (
  sub,
) => `[...document.querySelectorAll(${J(sub ? "#contextMenuSUB > *" : "#contextMenu > *")})].map((e) => {
  const r = e.getBoundingClientRect();
  return { cls: String(e.className), text: e.innerText.replace(/\\s+/g, " ").trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, left: r.x };
}).filter((i) => i.w && i.text)`;

const BOXES_JS = `[...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => ({
  title: (m.querySelector(".modalTitleBar")?.innerText || "").trim(),
  text: m.innerText.replace(/\\s+/g, " ").trim(),
  buttons: [...m.querySelectorAll(".msgBoxButton, button")].map((b) => b.textContent.trim()).filter(Boolean),
}))`;

const TABS_JS = `[...document.querySelectorAll("#codePanelTabs > .tabItem")].map((t) => ({
  name: t.innerText.trim(), selected: t.classList.contains("tabItemSelected"), dirty: !!t.querySelector(".circleIconSmall"),
}))`;

// A file of the project as the IDE holds it, as text.
const READ_JS = (p) => `new Promise((res) => {
  const n = fs.tree.resolvePath("twinbasic:" + ${J(p)});
  if (!n) return res(null);
  setTimeout(() => res("(no answer)"), 8000);
  fs.readFile(n, (enc, data) => res(new TextDecoder().decode(new Uint8Array(data))));
})`;

/** The files of a project file on disk, as paths, or the reason it cannot be read. */
export function diskFiles(file) {
  let tree;
  try {
    tree = readProject(file);
  } catch (e) {
    return { damaged: e.message };
  }
  const out = [];
  const walk = (n, p) => {
    for (const c of n.children || []) {
      if (c.children) walk(c, `${p}${c.name}/`);
      else out.push(p + c.name);
    }
  };
  walk(tree, "");
  return { files: out };
}

/** One file of a project file on disk, as text; null when it has none of that path. */
export function diskText(file, rel) {
  let node = readProject(file);
  for (const part of rel.split("/")) {
    node = (node.children || []).find((c) => c.name.toLowerCase() === part.toLowerCase());
    if (!node) return null;
  }
  return Buffer.from(node.content).toString("utf8");
}

/** The helpers, bound to the lane's connection as `getC()` returns it. */
export function projectKit(getC) {
  const c = () => getC();
  const ev = (js, o) => c().evaluate(js, o);

  // ---------------------------------------------------------------- input

  const mods = ({ alt, ctrl, shift } = {}) => (alt ? 1 : 0) | (ctrl ? 2 : 0) | (shift ? 8 : 0);
  async function clickAt(x, y, { button = "left", clickCount = 1, ...m } = {}) {
    const modifiers = mods(m);
    await c().send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, modifiers });
    await c().send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button, clickCount, modifiers });
    await c().send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button, clickCount, modifiers });
    await sleep(250);
  }
  async function doubleClickAt(x, y, m = {}) {
    await clickAt(x, y, m);
    const modifiers = mods(m);
    await c().send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 2,
      modifiers,
    });
    await c().send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 2,
      modifiers,
    });
    await sleep(400);
  }
  const key = (name, m) => pressKey(c(), name, m);
  const type = (text) => typeText(c(), text);

  // ---------------------------------------------------------------- the page

  const guard = () => ev(GUARD_JS);
  const setAnswer = (name, value) => ev(`window.__answers[${J(name)}] = ${J(value)}, true`);
  const hostCalls = () => ev("window.__hostCalls.splice(0)");
  const errors = () => ev("window.__errors.splice(0)");
  const msgs = () => ev("window.__msg.splice(0)");
  const clip = () => ev("window.__clipText()", { awaitPromise: true });
  const lastTitle = () => ev("window.__titles[window.__titles.length - 1] ?? null");
  const boxes = () => ev(BOXES_JS);
  // The boxes shown but the progress box of a compiler restart, which asks nothing.
  const questions = async () => (await boxes()).filter((b) => b.title !== "Please wait...");
  const tabs = () => ev(TABS_JS);
  const run = (id) => ev(`executeIdeCommand(${J(id)}), true`);

  /** Click a button of the top modal box by its caption. */
  async function answer(caption) {
    const r = await ev(`(() => {
      const ms = [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width);
      const m = ms[ms.length - 1];
      const b = m && [...m.querySelectorAll(".msgBoxButton, button")].find((e) => e.textContent.trim() === ${J(caption)} && e.getBoundingClientRect().width);
      if (!b) return null;
      const q = b.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(r, `no box with a ${caption} button: ${J(await boxes())}`);
    await clickAt(r.x, r.y);
    await sleep(500);
  }
  /** Wait for a modal box whose text matches, and return it. */
  async function waitForBox(re, { timeout = 10 * 1000 } = {}) {
    return waitFor(c(), async () => (await boxes()).find((b) => re.test(b.text)) ?? null, { timeout, interval: 200 });
  }

  // ---------------------------------------------------------------- the tree

  const rows = ({ all = false } = {}) => ev(ROWS_JS(all));
  const exists = (p) => ev(`!!fs.tree.resolvePath("twinbasic:" + ${J(p)})`);
  const selection = () => ev("fs.tree.selectedItems.map((e) => e.getFullPath())");
  const ideText = (p) => ev(READ_JS(p), { awaitPromise: true });
  const nodeAt = (p) => ev(NODE_AT_JS(p));

  async function clickNode(p, m = {}) {
    const r = await nodeAt(p);
    assert.ok(r, `no visible row ${p}`);
    await clickAt(r.x, r.y, m);
    await sleep(250);
  }
  async function doubleClickNode(p) {
    const r = await nodeAt(p);
    assert.ok(r, `no visible row ${p}`);
    await doubleClickAt(r.x, r.y);
    await sleep(800);
  }
  /** Open a folder by its expander, which a click on its name would toggle. */
  async function expand(p) {
    const n = await ev(
      `(() => { const n = fs.tree.resolvePath("twinbasic:" + ${J(p)}); return n ? !!n.isCollapsed : null; })()`,
    );
    assert.notEqual(n, null, `no folder ${p}`);
    if (!n) return;
    const r = await ev(`(() => {
      const n = fs.tree.resolvePath("twinbasic:" + ${J(p)});
      const i = n.domObject.querySelector(".treeNodeIcon");
      if (!i) return null;
      i.scrollIntoView({ block: "nearest" });
      const q = i.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(r, `${p} has no expander`);
    await clickAt(r.x, r.y);
    await sleep(300);
  }

  // ---------------------------------------------------------------- menus

  const menuItems = (sub = false) => ev(MENU_ITEMS_JS(sub));
  const menuOpen = () =>
    ev(
      `(() => { const m = document.querySelector("#contextMenu"); return !!m && m.getBoundingClientRect().width > 0 && m.children.length > 0; })()`,
    );
  async function closeMenus() {
    if (await menuOpen()) {
      await key("Escape");
      await sleep(300);
    }
  }
  /** Right-click a row; the menu's items. */
  // A right click straight after typing in an editor sometimes opens no menu; a second one,
  // after a left click on the row, does.
  async function rightNode(p) {
    const r = await nodeAt(p);
    assert.ok(r, `no visible row ${p}`);
    let items = null;
    for (let tries = 0; tries < 2 && !items; tries++) {
      if (tries) await clickAt(r.x, r.y);
      await clickAt(r.x, r.y, { button: "right" });
      items = await waitFor(
        c(),
        async () => {
          const i = await menuItems();
          return i.length ? i : null;
        },
        { timeout: 3000, interval: 150 },
      );
    }
    await sleep(300);
    return items ?? [];
  }
  /** Click an item of the open menu, or of its submenu, by the start of its text. */
  async function pick(text, { sub = false } = {}) {
    const items = await menuItems(sub);
    const it = items.find((i) => i.text === text || i.text.startsWith(text));
    assert.ok(it, `no menu item ${text}: ${items.map((i) => i.text).join(" | ")}`);
    if (sub) await c().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: it.left + 10, y: it.y });
    await clickAt(it.x, it.y);
    await sleep(600);
  }
  /** Right-click a row, then Add > item. */
  async function addVia(p, item) {
    await rightNode(p);
    const items = await menuItems();
    const add = items.find((i) => i.text === "Add");
    if (!add) {
      const where = await ev(`(() => {
        const n = fs.tree.resolvePath("twinbasic:" + ${J(p)});
        const r = n && n.innerDiv && n.innerDiv.getBoundingClientRect();
        const e = r && document.elementFromPoint(r.x + 10, r.y + r.height / 2);
        return { row: r && [r.x, r.y, r.width, r.height], under: e && (e.tagName + "." + e.className), menu: document.querySelector("#contextMenu")?.children.length ?? null };
      })()`);
      assert.fail(`no Add in the menu on ${p}: ${items.map((i) => i.text).join(" | ")} ${J(where)}`);
    }
    await c().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: add.left + 8, y: add.y });
    await c().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: add.x, y: add.y });
    const shown = await waitFor(c(), async () => (await menuItems(true)).length > 0, { timeout: 4000, interval: 100 });
    assert.ok(shown, "the Add submenu did not open");
    await sleep(200);
    await pick(item, { sub: true });
  }

  /** An HTML drag of one row onto another, through CDP's drag interception. */
  async function drag(from, to) {
    const a = await nodeAt(from);
    const b = await nodeAt(to);
    assert.ok(a && b, `drag: no visible row ${a ? to : from}`);
    await c().send("Input.setInterceptDrags", { enabled: true });
    let data = null;
    c().on((m) => {
      if (m.method === "Input.dragIntercepted" && !data) data = m.params.data;
    });
    await c().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: a.x, y: a.y });
    await c().send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: a.x,
      y: a.y,
      button: "left",
      clickCount: 1,
      buttons: 1,
    });
    for (let i = 1; i <= 6; i++) {
      await c().send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: a.x + i * 3,
        y: a.y + ((b.y - a.y) * i) / 6,
        button: "left",
        buttons: 1,
      });
      await sleep(40);
    }
    await sleep(200);
    await c().send("Input.setInterceptDrags", { enabled: false });
    if (!data) {
      await c().send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: b.x,
        y: b.y,
        button: "left",
        clickCount: 1,
      });
      assert.fail(`the drag of ${from} never started`);
    }
    for (const t of ["dragEnter", "dragOver"])
      await c().send("Input.dispatchDragEvent", { type: t, x: b.x, y: b.y, data });
    await sleep(200);
    const zone = await ev(`!!document.querySelector(".folderDropZone")`);
    await c().send("Input.dispatchDragEvent", { type: "drop", x: b.x, y: b.y, data });
    await c().send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: b.x,
      y: b.y,
      button: "left",
      clickCount: 1,
    });
    await sleep(1200);
    return { zone };
  }

  // ---------------------------------------------------------------- editors and saving

  /** Open a file by a double-click on its row, and type a comment at its end. */
  async function editFile(p, text) {
    await doubleClickNode(p);
    const name = p.split("/").pop();
    assert.ok(
      await waitFor(c(), async () => (await tabs()).some((t) => t.name === name && t.selected), { timeout: 10 * 1000 }),
      `${name} did not open in a tab`,
    );
    await sleep(800);
    await key("End", { ctrl: true });
    await key("Enter");
    await type(text);
    await sleep(800);
    assert.equal((await tabs()).find((t) => t.name === name)?.dirty, true, `${name}'s tab is not marked changed`);
  }

  const mark = () => consoleMark(c());
  const printed = (m) => linesSince(c(), m);
  /** Wait for a console line matching `re` since a mark; the lines since it. */
  async function waitForLine(m, re, { timeout = 15 * 1000 } = {}) {
    const lines = await waitFor(
      c(),
      async () => {
        const l = await printed(m);
        return l.some((s) => re.test(s)) ? l : null;
      },
      { timeout, interval: 250 },
    );
    return lines ?? (await printed(m));
  }
  const SAVED = /saving to disk \[DONE\]/;

  return {
    clickAt,
    doubleClickAt,
    key,
    type,
    guard,
    setAnswer,
    hostCalls,
    errors,
    msgs,
    clip,
    lastTitle,
    boxes,
    questions,
    tabs,
    run,
    answer,
    waitForBox,
    rows,
    exists,
    selection,
    ideText,
    nodeAt,
    clickNode,
    doubleClickNode,
    expand,
    menuItems,
    menuOpen,
    closeMenus,
    rightNode,
    pick,
    addVia,
    drag,
    editFile,
    mark,
    printed,
    waitForLine,
    SAVED,
  };
}
