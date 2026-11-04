// What starting.test.mjs needs from the page and the disk. Not a lane itself (lanes.mjs does not
// name it).
//
// THE GUARD (pageGuard) sits in front of the defaults hook (tb-defaults.mjs), on the page's
// window.hostAppObject, put in by defineProperty, never an assignment: an assignment would go to the
// hook's setter, and the hook would stand in front of the guard. It goes in at the document's start,
// and the page is reloaded (fresh), so the page starts for real over it, and every test can start
// from a page of its own with a project-less IDE. Nothing the IDE does there reaches the registry
// through the page:
//  - GetRecentsList and GetVB6RecentProjects are answered from the page, so a row of the dialog never
//    holds one of the user's paths, and no test reads the user's lists;
//  - AddRecentsList, RemoveRecentsList, ChangeWindowSetting, Exit and CloseWindow do nothing;
//  - SaveIDESetting does nothing and is recorded, by key; a value is kept only for the keys a test
//    reads (KEPT), and of the licence key, which the page never saves here, nothing at all;
//  - GetIDESetting is answered from the page for the keys a test gives (settings);
//  - every native picker is answered from the page ("" is Cancel), so that none opens;
//  - Shell is recorded and run only for the IDE's own taskkill of its compiler; root.Shell, made anew
//    at every compiler connection, is stubbed the same way;
//  - frontPageOpenProject, showNewProjectOptions and the rest are recorded with the time, so a test
//    can say what ran; with blockOpen the open is recorded and goes no further.
//
// Every file a test opens, damages, saves or builds is in the lane's work folder. project() packs one
// from probes/starting; damaged() writes a cut copy of a project the lane's IDE saved.

import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseProject } from "../../scripts/impexp.mjs";
import { desktopWindows, postWindowMessage, sleep } from "../../scripts/lib/tb-ide.mjs";
import { clickAt, pressKey, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { packTree } from "../../scripts/lib/tb-project.mjs";
import { diskText } from "./projects-kit.mjs";

export const J = JSON.stringify;
export { diskText, sleep };
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROBE = path.join(HERE, "probes", "starting");

/** A project's Settings as they are in its file, parsed. */
export const fileSettings = (file) => JSON.parse(diskText(file, "Settings"));

/** The names of a project file's source files, its own folders first, as impexp reads them. */
export function fileSources(file) {
  const out = [];
  const walk = (e, inSources) => {
    if (e.kind === "file") {
      if (inSources && /\.(twin|bas|tbform)$/.test(e.name)) out.push(e.name);
      return;
    }
    for (const x of e.children) walk(x, inSources || e.name === "Sources");
  };
  walk(parseProject(readFileSync(file)), false);
  return out;
}

/** Each file under a project file's Resources, as `type/name` and its size; an empty name reads <EMPTY>. */
export function fileResources(file) {
  const out = [];
  const walk = (e, p) => {
    if (e.kind === "file") out.push([p, e.content.length]);
    else for (const x of e.children) walk(x, `${p}/${x.name === "" ? "<EMPTY>" : x.name}`);
  };
  const find = (e) => (e.name === "Resources" ? e : e.children ? e.children.map(find).find(Boolean) : null);
  const res = find(parseProject(readFileSync(file)));
  for (const x of res?.children ?? []) walk(x, x.name);
  return out;
}

/** A project file's entries in order, with where each is: a file's content and where it ends. */
export function layout(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = 4;
  const out = [];
  const u32 = () => {
    p += 4;
    return v.getUint32(p - 4, true);
  };
  let first = true;
  const entry = (parent) => {
    const start = p;
    const kind = v.getInt16(p, true);
    p += 2;
    const n = u32();
    const name = buf.subarray(p, p + n).toString("utf8");
    p += n + 8 + 4 + 1;
    const isRoot = first;
    first = false;
    const full = parent ? `${parent}/${name}` : name;
    if (kind === 1 && !isRoot) {
      const len = u32();
      const contentAt = p;
      p += len;
      const tail = u32();
      p += tail * 4;
      out.push({ full, file: true, start, contentAt, len, end: p });
    } else {
      const count = u32();
      out.push({ full, file: false, start });
      for (let i = 0; i < count; i++) entry(isRoot ? "" : full);
    }
  };
  entry("");
  return out;
}

/** A .res file: an empty first entry, then one for each [type, name, bytes]. */
export function writeRes(entries) {
  const parts = [];
  const id = (x) => {
    if (typeof x === "number") {
      const b = Buffer.alloc(4);
      b.writeUInt16LE(0xffff, 0);
      b.writeUInt16LE(x, 2);
      return b;
    }
    const s = Buffer.from(`${x}\0`, "utf16le");
    return s.length % 4 ? Buffer.concat([s, Buffer.alloc(2)]) : s;
  };
  const entry = (type, name, data, lang = 0x0409) => {
    const t = id(type);
    const n = id(name);
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(8 + t.length + n.length + 16, 4);
    const tail = Buffer.alloc(16);
    tail.writeUInt16LE(0x1030, 4);
    tail.writeUInt16LE(lang, 6);
    parts.push(head, t, n, tail, data);
    if (data.length % 4) parts.push(Buffer.alloc(4 - (data.length % 4)));
  };
  entry(0, 0, Buffer.alloc(0), 0);
  for (const e of entries) entry(...e);
  return Buffer.concat(parts);
}

// Runs in the page, in every document of the IDE's browser (see the top of this file).
function pageGuard(cfg) {
  if (!/main\.htm$/i.test(location.pathname)) return;
  if (window.__g) return;
  const G = (window.__g = {
    gen: cfg.gen,
    settings: cfg.settings || {},
    recents: cfg.recents ?? "",
    vb6: cfg.vb6 ?? "",
    answers: cfg.answers || {},
    blockOpen: !!cfg.blockOpen,
    saves: [],
    ev: [],
    errors: [],
    shell: [],
    target: null,
  });
  const rec = (k, v) => G.ev.push([k, v]);
  const KEPT = /^(NEWFRONTPAGE|OBJECT_BROWSER|LICENCEAGREEMENTV3|ALLOWERRORREPORTINGV3)$/;
  const DIALOGS = [
    "ChooseFolder",
    "OpenFiles",
    "OpenIconCursor",
    "OpenImage",
    "OpenPackage",
    "OpenProject",
    "OpenProjectVBP",
    "OpenTypeLibrary",
    "SaveProjectAs",
  ];
  const wrap = (host) => {
    G.target = true;
    return new Proxy(host, {
      get(target, key) {
        if (key === "GetIDESetting") {
          return (...a) =>
            Object.hasOwn(G.settings, String(a[0])) ? Promise.resolve(G.settings[a[0]]) : target.GetIDESetting(...a);
        }
        if (key === "SaveIDESetting") {
          return (...a) => {
            const k = String(a[0]);
            G.saves.push([k, KEPT.test(k) ? String(a[1]).slice(0, 200) : "(value not kept)"]);
            return Promise.resolve(undefined);
          };
        }
        if (key === "GetRecentsList") return () => Promise.resolve(G.recents);
        if (key === "GetVB6RecentProjects") return () => Promise.resolve(G.vb6);
        if (key === "ChangeWindowSetting") return () => Promise.resolve(undefined);
        if (key === "AddRecentsList" || key === "RemoveRecentsList") {
          return () => {
            rec("host", key);
            return Promise.resolve(undefined);
          };
        }
        if (key === "Exit" || key === "CloseWindow") {
          return () => {
            rec("host", key);
            return Promise.resolve(undefined);
          };
        }
        if (key === "Shell") {
          return (cmdline, ...rest) => {
            G.shell.push(String(cmdline).slice(0, 200));
            if (/^taskkill \/PID \d+ \/F$/.test(String(cmdline))) return target.Shell(cmdline, ...rest);
            return Promise.resolve(0);
          };
        }
        if (DIALOGS.includes(key)) {
          return () => {
            let a = G.answers[key];
            if (Array.isArray(a)) a = a.length ? a.shift() : "";
            rec("dialog", key);
            return Promise.resolve(a ?? "");
          };
        }
        return target[key];
      },
    });
  };
  const d = Object.getOwnPropertyDescriptor(window, "hostAppObject");
  let real = d?.get ? d.get() : undefined;
  if (real) real = wrap(real);
  Object.defineProperty(window, "hostAppObject", {
    configurable: true,
    enumerable: true,
    get: () => real,
    set: (v) => {
      if (d?.set) {
        d.set(v);
        v = d.get();
      }
      real = v ? wrap(v) : v;
    },
  });
  window.addEventListener("error", (e) => G.errors.push(String(e.message)));
  const hooks = () => {
    if (G.hooked) return;
    G.hooked = true;
    for (const name of ["closeProjectNow", "closeProjectSafely", "showNewProjectOptions"]) {
      const f = window[name];
      if (typeof f === "function") {
        window[name] = function (...r) {
          rec("call", name);
          return f.apply(this, r);
        };
      }
    }
    const realOpen = window.frontPageOpenProject;
    window.frontPageOpenProject = function (e) {
      rec("open", e.projectPath);
      if (!G.blockOpen) return realOpen.call(this, e);
    };
    const realMsg = window.msgBox;
    if (realMsg) {
      window.msgBox = function (t, ...r) {
        rec(
          "msgBox",
          String(t)
            .replace(/<[^>]+>/g, " ")
            .slice(0, 200),
        );
        return realMsg.apply(this, [t, ...r]);
      };
    }
  };
  if (typeof window.showModalDialog === "function" && window.showFrontPageDialog) hooks();
  else document.addEventListener("DOMContentLoaded", hooks);
}

// The IDE makes root anew at every compiler connection: each new one is stubbed at once.
const ROOT_STUB_JS = `if (window.__g) setInterval(() => {
  try {
    if (typeof root !== "undefined" && root && root.Shell && !root.Shell.__stub) {
      const realShell = root.Shell.bind(root);
      root.Shell = function (cmdline, muted) {
        window.__g.shell.push("root.Shell: " + String(cmdline).slice(0, 200));
        if (/^taskkill \\/PID \\d+ \\/F$/.test(String(cmdline))) return realShell(cmdline, muted);
      };
      root.Shell.__stub = true;
    }
  } catch {}
}, 20);`;

// A project's name as a person reads it: the last part of a path, never the path.
const LEAF = (e) => `(${e} ? ${e}.split("\\\\").pop() : null)`;

// The state of the open project, as the page holds it.
const STATE_JS = `(() => { try { return {
  title: rootMenuText ? rootMenuText.innerText.split(" - ")[0].trim() : null,
  tip: rootMenuText ? rootMenuText.title.split("\\\\").pop() : null,
  dirty: projectIsDirty,
  file: ${LEAF("projectFilePath")},
  loaded: context.projectLoaded.value,
  root: Object.keys(fs.tree.rootFolder.entries || {}),
  services: (document.getElementById("compilerStatusOuter")?.innerText || "").replace("tB Services: ", ""),
}; } catch (e) { return { error: e.message }; } })()`;

// True when a project is fully open and the IDE is idle. A recovered project may have no Sources.
const READY_JS = `(() => { try {
  return Object.keys(fs.tree.rootFolder.entries).length > 0 && context.projectLoaded.value
    && licenceIsSet === true && !(lockUICount > 0)
    && /OPERATIONAL/.test(document.getElementById("compilerStatusOuter")?.innerText || "");
} catch { return false; } })()`;

// The New / Open Project dialog as a person sees it, or null when it is not showing.
const DIALOG_JS = `(() => {
  const r = document.getElementById("fp2root");
  if (!r || !r.getBoundingClientRect().width) return null;
  const a = document.activeElement;
  const name = (e) => (e.querySelector(".fp2-cardName, .fp2-rowName")?.innerText || "").trim();
  const items = [...r.querySelectorAll(".fp2-card, .fp2-row")];
  const sel = items.find((e) => e.classList.contains("fp2-selected"));
  return {
    rail: [...r.querySelectorAll(".fp2-railItem")].filter((e) => e.classList.contains("fp2-railItemSelected")).map((e) => e.querySelector(".fp2-railItemText").innerText)[0],
    search: r.querySelector(".fp2-search").value,
    selected: sel ? name(sel) : null,
    focus: a === document.body ? "body" : a.classList.contains("fp2-search") ? "search" : a.classList.contains("fp2-card") ? "card:" + name(a) : a.classList.contains("modalDialogContainer") ? "dialog" : a.tagName + "." + a.className,
    hilite: [...document.querySelectorAll(".buttonFocused")].map((e) => e.textContent.trim()),
  };
})()`;

// What the search shows: each row's lines, with the marked words in << >>.
const SEARCH_JS = `[...document.querySelectorAll("#fp2root .fp2-group .fp2-row")].map((r) =>
  [...r.querySelector(".fp2-rowMain").children].map((l) => [...l.childNodes].map((n) => n.nodeType === 3 ? n.textContent : "<<" + n.textContent + ">>").join("")))`;

const ITEM_AT_JS = (re) => `(() => {
  const e = [...document.querySelectorAll("#fp2root .fp2-card, #fp2root .fp2-row")].find((x) => ${re}.test(x.innerText.replace(/\\s*\\n\\s*/g, " ")) && x.getBoundingClientRect().width);
  if (!e) return null;
  e.scrollIntoView({ block: "nearest" });
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`;

// The smallest element of the top modal box whose text is `text`.
const IN_MODAL_JS = (text, selector) => `(() => {
  const ms = [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width);
  const m = ms[ms.length - 1];
  if (!m) return null;
  const area = (e) => e.getBoundingClientRect().width * e.getBoundingClientRect().height;
  const e = [...m.querySelectorAll(${J(selector)})].filter((e) => e.textContent.trim() === ${J(text)} && e.getBoundingClientRect().width).sort((a, b) => area(a) - area(b))[0];
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`;

// A file of the open project as the IDE reads it; a path below the project's root.
const READ_JS = (rel) => `new Promise((res) => {
  const k = Object.keys(fs.tree.rootFolder.entries)[0];
  const n = fs.tree.resolvePath("twinbasic:/" + k + "/" + ${J(rel)});
  if (!n) return res(null);
  setTimeout(() => res("(no answer)"), 8000);
  fs.readFile(n, (enc, data) => res(new TextDecoder().decode(new Uint8Array(data))));
})`;

// Every file of the open project below Sources. A project recovered with no source has no such folder.
const SOURCES_JS = `(() => {
  const k = Object.keys(fs.tree.rootFolder.entries)[0];
  const s = fs.tree.resolvePath("twinbasic:/" + k + "/Sources");
  return s ? Object.values(s.entries).map((e) => e.name) : [];
})()`;

// Below Resources of the open project: each row's type, its name as the tree holds it, its key.
const RESOURCES_JS = `(() => {
  const res = fs.tree.resolvePath("twinbasic:/" + Object.keys(fs.tree.rootFolder.entries)[0] + "/Resources");
  const out = [];
  for (const t of Object.values(res.entries)) for (const [k, e] of Object.entries(t.entries || {})) out.push([t.name, e.name, k]);
  return out;
})()`;

/** The helpers, bound to one lane. `k.c` is the open IDE's connection. */
export function startingKit(lane) {
  let c = null;
  let scriptId = null;
  let gen = 0;
  let trees = 0;
  let master = null;
  const ev = (js, o) => c.evaluate(js, o);
  const box = async () => {
    const r =
      await ev(`[...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => ({
      title: (m.querySelector(".modalTitleBar")?.innerText || "").trim(),
      text: m.innerText.replace(/\\s+/g, " ").trim().slice(0, 300),
      buttons: [...m.querySelectorAll(".msgBoxButton")].filter((b) => b.getBoundingClientRect().width).map((b) => b.textContent.trim()).filter(Boolean),
    }))`);
    return r.map((b) => `[${b.title}] ${b.text} {${b.buttons.join("/")}}`);
  };
  const modals = () =>
    ev(
      `[...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => (m.querySelector(".modalTitleBar")?.innerText || "").trim())`,
    );

  /** A real click on the element of the top box whose text is `text`. */
  async function clickInModal(text, selector = ".msgBoxButton") {
    const p = await ev(IN_MODAL_JS(text, selector));
    assert.ok(p, `no ${text} in the top box: ${J(await box())}`);
    await clickAt(c, p.x, p.y);
    await sleep(250);
  }
  const key = async (name, mods) => {
    await pressKey(c, name, mods);
    await sleep(140);
  };

  /** The page again, with the guard at its document's start: what `cfg` says, and no project. */
  async function fresh(cfg = {}, { wait = true } = {}) {
    await c.send("Page.enable");
    if (scriptId) await c.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptId }).catch(() => {});
    const n = ++gen;
    const source = `(${pageGuard})(${J({ ...cfg, gen: n })}); ${ROOT_STUB_JS}`;
    scriptId = (await c.send("Page.addScriptToEvaluateOnNewDocument", { source })).identifier;
    await c.send("Page.reload", {});
    const up = () =>
      ev(
        `(() => { try { return window.__g?.gen === ${n} && document.readyState === "complete"; } catch { return false; } })()`,
      );
    assert.ok(await waitFor(c, up, { timeout: 30 * 1000, interval: 100 }), "the page did not start again");
    // The hook's own script runs first, or it would stand in front of the guard: wrap never runs then.
    const inFront = await waitFor(c, () => ev("window.__g.target"), { timeout: 10 * 1000, interval: 50 });
    assert.ok(inFront, "the guard is not in front of the defaults hook");
    if (wait) await waitStartDialog();
  }

  async function waitStartDialog(timeout = 60 * 1000) {
    const ok = await waitFor(c, () => ev(DIALOG_JS), { timeout, interval: 100 });
    assert.ok(ok, `no New / Open Project dialog: ${J(await box())}`);
    await sleep(300);
  }

  /** Wait for a project to be open and the IDE idle, and to stay so for a second. */
  async function waitReady(timeout = 60 * 1000) {
    const until = Date.now() + timeout;
    let since = null;
    while (Date.now() < until) {
      if (await ev(READY_JS)) {
        since ??= Date.now();
        if (Date.now() - since >= 1000) return;
      } else {
        since = null;
      }
      await sleep(100);
    }
    assert.fail(`no project became ready: ${J(await ev(STATE_JS))} ${J(await box())}`);
  }

  const nameBox = `[...document.querySelectorAll(".modalDialogContainer input")].find((x) => x.type !== "checkbox")`;

  const k = {
    get c() {
      return c;
    },
    box,
    modals,
    key,
    fresh,
    waitStartDialog,
    waitReady,
    clickInModal,
    button: (caption) => clickInModal(caption),
    state: () => ev(STATE_JS),
    dialog: () => ev(DIALOG_JS),
    searchRows: () => ev(SEARCH_JS),
    /** Each card or row of the dialog: its text, and the path it opens. */
    items: () =>
      ev(
        `[...document.querySelectorAll("#fp2root .fp2-card, #fp2root .fp2-row")].map((e) => [e.innerText.replace(/\\s*\\n\\s*/g, " | "), e.fp2Item?.projectPath])`,
      ),
    sources: () => ev(SOURCES_JS),
    resources: () => ev(RESOURCES_JS),
    /** The events recorded since the last call, each as "kind what". */
    events: async () => (await ev("window.__g.ev.splice(0)")).map(([a, b]) => `${a} ${b}`),
    saves: () => ev("window.__g.saves.splice(0)"),
    setAnswer: (name, value) => ev(`window.__g.answers[${J(name)}] = ${J(value)}, true`),
    setG: (name, value) => ev(`window.__g[${J(name)}] = ${J(value)}, true`),
    cmd: (id) => ev(`executeIdeCommand(${J(id)}), true`),
    flags: () =>
      ev(
        `({ use: g_UseLastMassagedSettings, last: g_LastMassagedSettings ? g_LastMassagedSettings["project.name"] : null, laa: liveLAAOption })`,
      ),
    pageErrors: () => ev("window.__g.errors.splice(0)"),

    /** Start an IDE with no project, and the guard in front of the hook. */
    async startIde(cfg = {}) {
      scriptId = null;
      c = await lane.openNoProject();
      await waitStartDialog(90 * 1000);
      await fresh(cfg);
    },
    /** A page with no project and no dialog. */
    async noProject(cfg = {}) {
      await fresh(cfg);
      await clickInModal("Cancel");
      await sleep(300);
    },

    /** A folder of the lane's work folder. */
    folder(name) {
      const dir = path.join(lane.work, name);
      mkdirSync(dir, { recursive: true });
      return dir;
    },
    /** A .twinproj packed from probes/starting, with these Settings over the probe's. */
    project(name, settings = {}, folder = "files") {
      const tree = path.join(lane.work, "trees", `${name}-${++trees}`);
      cpSync(PROBE, tree, { recursive: true });
      const f = path.join(tree, "Settings");
      writeFileSync(f, J({ ...JSON.parse(readFileSync(f, "utf8")), ...settings }, null, "\t"));
      const file = path.join(k.folder(folder), `${name}.twinproj`);
      packTree(file, tree);
      return file;
    },
    /** A .vbp with one module, and a .res when it is given entries for one. */
    vbp(folder, entries = null) {
      const dir = k.folder(folder);
      const lines = ["Type=Exe", "Module=Module1; Module1.bas"];
      if (entries) {
        writeFileSync(path.join(dir, "Res.res"), writeRes(entries));
        lines.push('ResFile32="Res.res"');
      }
      lines.push(
        'Startup="Sub Main"',
        'ExeName32="Probe.exe"',
        'Name="Probe"',
        "CompilationType=0",
        "OptimizationType=0",
      );
      writeFileSync(path.join(dir, "Probe.vbp"), `${lines.join("\r\n")}\r\n`);
      writeFileSync(
        path.join(dir, "Module1.bas"),
        'Attribute VB_Name = "Module1"\r\nOption Explicit\r\nSub Main()\r\nEnd Sub\r\n',
      );
      return path.join(dir, "Probe.vbp");
    },

    /** File > Open Project..., the picker answered with `file`, and wait for the project. */
    async open(file) {
      await k.setAnswer("OpenProject", file);
      await k.cmd("tbProject_Open");
      await sleep(600);
      await waitReady();
    },
    /** Close Project, Discard Changes if it asks; what it asked. */
    async close() {
      await k.cmd("tbProject_Close");
      await sleep(800);
      const asked = await box();
      if ((await modals()).length) await clickInModal("Discard Changes");
      await sleep(800);
      return asked;
    },
    async item(re) {
      const p = await ev(ITEM_AT_JS(re));
      assert.ok(p, `no item ${re} in the dialog`);
      return p;
    },
    async clickItem(re) {
      const p = await k.item(re);
      await clickAt(c, p.x, p.y);
      await sleep(200);
    },
    /** A real double-click on a card or row of the dialog. */
    async dblItem(re) {
      const p = await k.item(re);
      for (const [type, n] of [
        ["mouseMoved", 0],
        ["mousePressed", 1],
        ["mouseReleased", 1],
        ["mousePressed", 2],
        ["mouseReleased", 2],
      ]) {
        await c.send("Input.dispatchMouseEvent", {
          type,
          x: p.x,
          y: p.y,
          button: n ? "left" : "none",
          clickCount: n,
          buttons: type === "mousePressed" ? 1 : 0,
        });
      }
      await sleep(200);
    },
    section: (title) => clickInModal(title, ".fp2-railItemText"),
    async waitOptions() {
      const ok = await waitFor(c, async () => (await modals()).some((t) => t.includes("New Project Options")), {
        timeout: 30 * 1000,
        interval: 100,
      });
      assert.ok(ok, `no New Project Options: ${J(await box())}`);
      await sleep(250);
    },
    nameBox: () => ev(`${nameBox}.value`),
    /** The name box of New Project Options selected. */
    selectName: () => ev(`(() => { const i = ${nameBox}; i.focus(); i.select(); })()`),
    async typeName(name) {
      await k.selectName();
      await pressKey(c, "Backspace");
      await typeText(c, name);
      await sleep(120);
    },
    /** New, a card, a name, Continue: a new project, never saved. */
    async newProject(name, card = /^Standard EXE$/) {
      await k.cmd("tbProject_New");
      await waitStartDialog(8000);
      await k.dblItem(card);
      await k.waitOptions();
      await k.typeName(name);
      await k.button("Continue");
      await sleep(400);
      await waitReady();
    },
    /** New, Import from VBP..., the picker answered with `vbp`, a name, Continue. */
    async importVbp(vbp, name = null) {
      await k.setAnswer("OpenProjectVBP", vbp);
      await k.cmd("tbProject_New");
      await waitStartDialog(8000);
      await k.dblItem(/^Import from VBP/);
      await k.waitOptions();
      if (name) await k.typeName(name);
      await k.button("Continue");
      await sleep(400);
      await waitReady();
    },
    /** A file of the open project as the IDE reads it. */
    readFile: (rel) => ev(READ_JS(rel), { awaitPromise: true }),
    /** The Settings the IDE holds for the open project. */
    settings: async () => JSON.parse(await k.readFile("Settings")),
    /** Ctrl+S, and wait for `file` to change. */
    async saveAndWait(file) {
      const before = statSync(file).mtimeMs;
      await pressKey(c, "s", { ctrl: true });
      await waitFor(c, () => statSync(file).mtimeMs !== before, { timeout: 10 * 1000, interval: 100 });
      await sleep(600);
    },

    // ------------------------------------------------------------------ the damaged files

    /** The master: the probe's project with LAA on, saved once by the IDE, so it has the IDE's layout. */
    async masterBytes() {
      if (master) return master;
      const file = k.project("Throwaway", { "project.largeAddressAware": true, "project.name": "Throwaway" }, "master");
      await k.noProject();
      await k.open(file);
      await k.saveAndWait(file);
      await k.close();
      master = readFileSync(file);
      return master;
    },
    /** A copy of the first `length` bytes of `bytes`, as Damaged.twinproj in a folder of its own. */
    damaged(folder, bytes) {
      const file = path.join(k.folder(folder), "Damaged.twinproj");
      writeFileSync(file, bytes);
      return file;
    },

    // ------------------------------------------------------------------ the compiler's own boxes

    /** The visible native dialog boxes on the lane's desktop: title, texts, buttons. */
    async nativeBoxes() {
      const list = await desktopWindows(lane.desktop, { children: true });
      const out = [];
      list.forEach((w, i) => {
        if (w.class !== "#32770" || !w.visible) return;
        const kids = [];
        for (let j = i + 1; j < list.length && list[j].depth === 1; j++) kids.push(list[j]);
        out.push({
          title: w.title,
          texts: kids.filter((x) => x.class === "Static" && x.title).map((x) => x.title),
          buttons: kids.filter((x) => x.class === "Button").map((x) => ({ text: x.title, hwnd: x.hwnd })),
        });
      });
      return out;
    },
    /** Press the first button of the first native box. BM_CLICK, since a private desktop takes no input. */
    async pressNative() {
      const [b] = await k.nativeBoxes();
      if (!b) return false;
      await postWindowMessage(lane.desktop, b.buttons[0].hwnd, 0xf5, 0, 0);
      await sleep(500);
      return true;
    },
    /** Open a damaged project: OK on each native box, until a project is open. How many boxes there were, and the first. */
    async openDamaged(file) {
      await k.setAnswer("OpenProject", file);
      await k.cmd("tbProject_Open");
      const seen = [];
      const until = Date.now() + 40 * 1000;
      while (Date.now() < until) {
        await sleep(300);
        const nat = await k.nativeBoxes();
        if (nat.length) {
          seen.push(nat[0]);
          await k.pressNative();
        } else if (seen.length && (await ev(READY_JS))) break;
      }
      await waitReady(10 * 1000);
      return seen;
    },
  };
  return k;
}
