#!/usr/bin/env node
// A feasibility probe for drawing the documentation's IDE screenshots as SVG from
// the IDE page's DOM: it saves everything a converter would need, per state, as a
// "bundle" folder, so that the converter can be developed offline without starting
// an IDE again.
//
//     node scripts/svgshot/probe.mjs [--out <dir>] [--only ide|menu-file] [--port N] [--ide <twinBASIC.exe>]
//
// It opens the IDE as shoot_docs.mjs's `project` setup does (test/addin/helpdemo
// open, no add-in; the demo's module in the editor; the page's options at their
// defaults in the page only; the dark theme; the page at 1280x880 CSS pixels at 2x),
// then captures two states, each into <out>/<state>/:
//
//   ide        the whole page as it stands
//   menu-file  the File menu open, as menuShot opens it, without the cut-out
//
// A bundle holds page.png (the picture a converter has to match), snapshot.json
// (DOMSnapshot with the computed styles meta.json lists), resources.json (the
// images the page draws, as data: URLs), fonts.json (the @font-face rules and their
// files, document.fonts, and the platform fonts the text really used), census.json
// (what drawing features the page uses, and how many of each), meta.json, and
// canvas-<n>.png for each visible canvas.
//
// The rules of shoot_docs.mjs hold: the IDE runs from a copy of the install on a
// private desktop with an APPDATA of its own and TB_ADDIN_TEST on, its pid is
// printed when it starts and it is ended by that pid, and the IDE's registry
// entries are put back at the end. The bundles are scratch data for a converter:
// they hold URLs into the work folder, and so the Windows user name, and a
// converter must never copy either into a picture it writes.

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import path from "node:path";
import {
  choiceOption,
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  withUsageError,
} from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { removeTree } from "../lib/tb-ide-copy.mjs";
import { shutdownIde, sleep } from "../lib/tb-ide.mjs";
import { buildNumber, findIde } from "../lib/tb-install.mjs";
import { Lane } from "../lib/tb-lane.mjs";
import { clickAt, openFile, pressKey, waitFor } from "../lib/tb-operate.mjs";
import { claimPorts } from "../lib/tb-ports.mjs";
import { finishTidy, startTidy } from "../lib/tb-registry.mjs";

const DEMO = path.join(REPO_ROOT, "test", "addin", "helpdemo");
const DEMO_FILE = "/Inventory/Sources/Inventory.twin";
const IDE_SIZE = { width: 1280, height: 880 };
const SCALE = 2;
// --disable-lcd-text: grayscale anti-aliasing, as an SVG image gets, so the
// comparison measures geometry rather than ClearType's colour fringes.
const BROWSER_ARGS = "--force-device-scale-factor=1 --disable-lcd-text";
const REST_MS = 1000;
const OUTLINE = 1;
const STATES = ["ide", "menu-file"];
// How many text-bearing elements are asked which platform fonts drew their text.
const FONT_SAMPLE = 300;

// The computed styles the snapshot holds, in this order; those the browser does
// not know are left out, and meta.json lists the ones used.
const STYLES = [
  "display",
  "visibility",
  "opacity",
  "color",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "background-clip",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "outline-width",
  "outline-style",
  "outline-color",
  "outline-offset",
  "box-shadow",
  "text-shadow",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "white-space",
  "text-decoration-line",
  "text-decoration-style",
  "text-decoration-color",
  "text-decoration-thickness",
  "text-decoration-skip-ink",
  "text-underline-offset",
  "text-underline-position",
  "float",
  "text-overflow",
  "overflow-x",
  "overflow-y",
  "transform",
  "transform-origin",
  "filter",
  "backdrop-filter",
  "mask-image",
  "-webkit-mask-image",
  "mask-size",
  "mask-position",
  "mask-repeat",
  "clip-path",
  "z-index",
  "position",
  "fill",
  "stroke",
  "stroke-width",
  "-webkit-text-fill-color",
  "direction",
  "writing-mode",
  "mix-blend-mode",
  "object-fit",
];

const USAGE = `usage: node scripts/svgshot/probe.mjs [--out <dir>] [--only ide|menu-file] [--port N] [--ide <twinBASIC.exe>] [-h, --help]

Opens the IDE as shoot_docs.mjs's project setup does, on a private desktop, and
saves what an SVG converter needs from the IDE's page into one bundle folder per
state: page.png, snapshot.json (DOMSnapshot with computed styles), resources.json,
fonts.json, census.json and meta.json (and canvas-<n>.png for a visible canvas).
The two states are ide (the whole page) and menu-file (the File menu open).

  --out <dir>      the folder the bundles go under, as <dir>/<state>/ (default
                   a folder named svgshot-bundles in the temp folder)
  --only <state>   only that state: ide or menu-file
  --port <n>       the IDE's DevTools port: the first free one from n (default 9800)
  --ide <path>     the twinBASIC.exe to copy (default: $TB_IDE, else the
                   newest twinBASIC_IDE_BETA_* on the Desktop)
  -h, --help       print this text and exit

Exit codes:
  0  every bundle was written
  1  a bundle failed
  2  the tool could not run: a refused command line, no IDE, or the demo project
     did not open
  3  the registry or the work folder was not put back; see the lines above`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      out: { type: "string" },
      only: { type: "string" },
      port: { type: "string" },
      ide: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
const only =
  values.only === undefined
    ? null
    : withUsageError(() => choiceOption(values.only, { option: "--only", choices: STATES }));
const firstPort = withUsageError(() =>
  numberOption(values.port ?? "9800", { option: "--port", integer: true, min: 1, max: 65535 }),
);
const outRoot = path.resolve(values.out ?? path.join(tmpdir(), "svgshot-bundles"));
const ide = findIde(values.ide || undefined);
if (!ide || !existsSync(ide)) {
  die(
    2,
    "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
}

const USER = userInfo().username;

// ------------------------------------------------------------ the IDE's page (copied from shoot_docs.mjs)

const QUIET_CSS =
  "*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important;scroll-behavior:auto !important}" +
  ".monaco-editor .cursors-layer{visibility:hidden !important}";

// Gives the document and every shadow root in it the quiet style sheet, once each.
const quiet = (c) =>
  c.evaluate(`(() => {
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

// Resolves once the page has drawn two more frames.
const frames = (c) =>
  c.evaluate("new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))", {
    awaitPromise: true,
  });

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

// Keeps the user's machine out of the page, in the page only: the IDE's options at
// their defaults, no saved panel layouts or keyboard groups, empty recent lists, and
// the calls that save any of it replaced by calls that do nothing.
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

async function ensureDark(c) {
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
}

// The page at its fixed size and density, IDE_SIZE at SCALE, once its body names scale100.
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

// ------------------------------------------------------------ the IDE's menus (copied from shoot_docs.mjs)

const rectOf = (c, sel) =>
  c.evaluate(`(() => {
  const e = document.querySelector(${JSON.stringify(sel)});
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return r.width && r.height ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
})()`);

const mouseMove = (c, x, y) => c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
const parkMouse = (c) => mouseMove(c, 2, IDE_SIZE.height - 10);

const menuItems = (c) =>
  c.evaluate(`(() => [...document.querySelectorAll("#contextMenu > *")].map((e) => {
    const r = e.getBoundingClientRect();
    return { tag: e.tagName, text: e.innerText.trim(), x: r.x, y: r.y, width: r.width, height: r.height };
  }))()`);

async function closeMenus(c) {
  if (await rectOf(c, "#contextMenu")) {
    await pressKey(c, "Escape");
    // a closed menu leaves its box in the page, empty: it is closed once it holds no item
    await waitFor(c, async () => (await menuItems(c)).length === 0, { timeout: 2000, interval: 50 });
  }
  await parkMouse(c);
  await frames(c);
}

async function menuOpened(c) {
  if (!(await waitFor(c, async () => (await menuItems(c)).length > 0, { timeout: 5000, interval: 50 }))) return false;
  await frames(c);
  return true;
}

// Opens the File menu with a real press on its title (the IDE opens on mousedown).
async function openFileMenu(c) {
  await closeMenus(c);
  const r = await rectOf(c, "#rootMenuFile");
  if (!r) throw new Error("there is no File menu");
  await clickAt(c, r.x + r.width / 2, r.y + r.height / 2);
  if (!(await menuOpened(c))) throw new Error("the File menu did not open");
  return rectOf(c, "#contextMenu");
}

const modals = (c) =>
  c.evaluate(`(() => [...document.querySelectorAll(".modalDialogContainer")].map((m) => {
    const r = m.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }).filter((m) => m.width && m.height))()`);

// Nothing open: no menu, no dialog, the mouse out of the way.
async function resetUi(c) {
  await closeMenus(c);
  for (let n = (await modals(c)).length; n > 0; n--) {
    await pressKey(c, "Escape");
    await waitFor(c, async () => (await modals(c)).length < n, { timeout: 2000, interval: 50 });
  }
  await parkMouse(c);
}

const union = (a, b) => {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.width, b.x + b.width);
  const y1 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};
// A rectangle snapped outward to whole device pixels, inside the page.
const snapOut = (r) => {
  const x0 = Math.max(0, Math.floor(r.x * SCALE) / SCALE);
  const y0 = Math.max(0, Math.floor(r.y * SCALE) / SCALE);
  const x1 = Math.min(IDE_SIZE.width, Math.ceil((r.x + r.width) * SCALE) / SCALE);
  const y1 = Math.min(IDE_SIZE.height, Math.ceil((r.y + r.height) * SCALE) / SCALE);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

// ------------------------------------------------------------ the page-side scripts

// Runs in the page, over the document and every open shadow root. For each distinct
// url it can draw (an <img>, a url() in a computed background, mask, list-style or
// border image, in the pseudo-elements too, an <image> or <use> of an inline svg, an
// input of type image) it counts the uses and the visible uses; a url with a visible
// use is fetched into a data: URL, and a failure is recorded, not thrown.
const RESOURCES_JS = String.raw`(async () => {
  const roots = [];
  const visit = (root) => {
    roots.push(root);
    for (const e of root.querySelectorAll("*")) if (e.shadowRoot) visit(e.shadowRoot);
  };
  visit(document);
  const usage = new Map();
  let dataUrls = 0;
  let dataUrlsVisible = 0;
  const note = (url, kind, vis) => {
    if (!url || url === "about:blank") return;
    if (url.startsWith("data:")) {
      dataUrls++;
      if (vis) dataUrlsVisible++;
      return;
    }
    let u = usage.get(url);
    if (!u) usage.set(url, (u = { kinds: new Set(), count: 0, visible: 0 }));
    u.kinds.add(kind);
    u.count++;
    if (vis) u.visible++;
  };
  const re = /url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)\s"']*))\s*\)/g;
  const urlsIn = (value) => {
    const out = [];
    if (!value || !value.includes("url(")) return out;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(value))) out.push(m[1] ?? m[2] ?? m[3]);
    return out;
  };
  const PROPS = ["background-image", "mask-image", "-webkit-mask-image", "list-style-image", "border-image-source", "content"];
  const absolute = (href, base) => {
    try {
      return new URL(href, base).href;
    } catch {
      return null;
    }
  };
  for (const root of roots) {
    for (const e of root.querySelectorAll("*")) {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const vis = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      for (const p of PROPS) for (const u of urlsIn(cs.getPropertyValue(p))) note(u, p, vis);
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(e, pseudo);
        if (ps.display === "none") continue;
        for (const p of PROPS) for (const u of urlsIn(ps.getPropertyValue(p))) note(u, pseudo + " " + p, vis);
      }
      const tag = e.tagName.toLowerCase();
      if (tag === "img") note(e.currentSrc || e.src, "img", vis);
      else if (tag === "input" && e.type === "image") note(e.src, "input-image", vis);
      else if (tag === "video") note(e.poster, "video-poster", vis);
      else if (tag === "image" || tag === "use") {
        const h = e.getAttribute("href") || e.getAttribute("xlink:href");
        if (h && !h.startsWith("#")) note(absolute(h, e.baseURI), "svg-" + tag, vis);
      }
    }
  }
  const toData = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    const data = await new Promise((done, fail) => {
      const f = new FileReader();
      f.onload = () => done(f.result);
      f.onerror = () => fail(f.error);
      f.readAsDataURL(blob);
    });
    return { data, type: blob.type, bytes: blob.size };
  };
  const resources = {};
  const failures = {};
  const info = {};
  const hiddenOnly = {};
  const todo = [];
  for (const [url, u] of usage) {
    const row = { kinds: [...u.kinds], count: u.count, visible: u.visible };
    if (u.visible > 0) {
      info[url] = row;
      todo.push(url);
    } else hiddenOnly[url] = row;
  }
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(
      todo.slice(i, i + 8).map(async (url) => {
        try {
          const r = await toData(url);
          resources[url] = r.data;
          info[url].type = r.type;
          info[url].bytes = r.bytes;
        } catch (e) {
          failures[url] = String(e.message ?? e);
        }
      }),
    );
  }
  return { resources, failures, info, hiddenOnly, dataUrls: { all: dataUrls, visible: dataUrlsVisible }, origin: location.origin };
})()`;

// The @font-face rules of the document and of every open shadow root (style elements,
// links and adopted sheets, through @media, @supports, @layer and @import), document.fonts,
// and the files the rules name that the page can fetch.
const FONTS_JS = String.raw`(async () => {
  const roots = [];
  const visit = (root) => {
    roots.push(root);
    for (const e of root.querySelectorAll("*")) if (e.shadowRoot) visit(e.shadowRoot);
  };
  visit(document);
  const faces = [];
  const inaccessible = [];
  let sheets = 0;
  const absolute = (href, base) => {
    try {
      return new URL(href, base).href;
    } catch {
      return href;
    }
  };
  const parseSrc = (src, base) => {
    const out = [];
    const re = /(url|local)\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)\s"']*))\s*\)(?:\s*format\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\))?/g;
    let m;
    while ((m = re.exec(src))) {
      const value = m[2] ?? m[3] ?? m[4];
      out.push(m[1] === "url" ? { url: absolute(value, base), format: m[5] ?? m[6] ?? m[7] ?? null } : { local: value });
    }
    return out;
  };
  const walkRules = (rules, sheet, owner, via) => {
    for (const r of rules) {
      if (r.type === CSSRule.FONT_FACE_RULE) {
        const st = r.style;
        const base = sheet.href || document.baseURI;
        faces.push({
          owner,
          via,
          sheetHref: sheet.href ? sheet.href.split("/").pop() : null,
          family: st.getPropertyValue("font-family"),
          weight: st.getPropertyValue("font-weight"),
          style: st.getPropertyValue("font-style"),
          stretch: st.getPropertyValue("font-stretch"),
          unicodeRange: st.getPropertyValue("unicode-range"),
          display: st.getPropertyValue("font-display"),
          variationSettings: st.getPropertyValue("font-variation-settings"),
          src: st.getPropertyValue("src"),
          sources: parseSrc(st.getPropertyValue("src"), base),
        });
      } else if (r.type === CSSRule.IMPORT_RULE && r.styleSheet) {
        walkSheet(r.styleSheet, owner, via + ">@import");
      } else if (r.cssRules) {
        walkRules(r.cssRules, sheet, owner, via);
      }
    }
  };
  const walkSheet = (sheet, owner, via) => {
    sheets++;
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (e) {
      inaccessible.push({ owner, via, href: sheet.href ? sheet.href.split("/").pop() : null, error: String(e.message ?? e) });
      return;
    }
    walkRules(rules, sheet, owner, via);
  };
  roots.forEach((root, i) => {
    const owner = root === document ? "document" : "shadow:" + (root.host.tagName.toLowerCase() + (root.host.id ? "#" + root.host.id : "")) + "#" + i;
    for (const s of root.styleSheets) walkSheet(s, owner, "styleSheets");
    for (const s of root.adoptedStyleSheets ?? []) walkSheet(s, owner, "adopted");
  });
  const documentFonts = [];
  for (const f of document.fonts) {
    documentFonts.push({ family: f.family, weight: f.weight, style: f.style, stretch: f.stretch, unicodeRange: f.unicodeRange, display: f.display, status: f.status });
  }
  const urls = [...new Set(faces.flatMap((f) => f.sources.filter((s) => s.url).map((s) => s.url)))];
  const files = {};
  const fileFailures = {};
  const fileInfo = {};
  for (const url of urls) {
    if (url.startsWith("data:")) {
      files[url] = url;
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const blob = await res.blob();
      files[url] = await new Promise((done, fail) => {
        const f = new FileReader();
        f.onload = () => done(f.result);
        f.onerror = () => fail(f.error);
        f.readAsDataURL(blob);
      });
      fileInfo[url] = { type: blob.type, bytes: blob.size, sameOrigin: new URL(url).origin === location.origin };
    } catch (e) {
      fileFailures[url] = String(e.message ?? e);
    }
  }
  return { sheets, faces, inaccessible, documentFonts, files, fileFailures, fileInfo, origin: location.origin };
})()`;

// What drawing features the page uses, and how many of each, over the document and every
// open shadow root. "visible" is: a box with a size, and not visibility:hidden.
const CENSUS_JS = String.raw`(() => {
  const t0 = performance.now();
  const roots = [];
  const visit = (root) => {
    roots.push(root);
    for (const e of root.querySelectorAll("*")) if (e.shadowRoot) visit(e.shadowRoot);
  };
  visit(document);
  const F = {};
  const bump = (key, vis, amount = 1) => {
    const c = (F[key] ??= { all: 0, visible: 0 });
    c.all += amount;
    if (vis) c.visible += amount;
  };
  const box = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
  const desc = (e) => {
    let s = e.tagName.toLowerCase();
    if (e.id) s += "#" + e.id;
    if (e.classList && e.classList.length) s += "." + [...e.classList].slice(0, 4).join(".");
    return s;
  };
  const px = (v) => parseFloat(v) || 0;
  const SRC_KINDS = [
    [/^data:image\/svg/, "data-svg"],
    [/^data:image\/png/, "data-png"],
    [/^data:/, "data-other"],
    [/\.svg(?:[?#]|$)/i, "svg-file"],
    [/\.png(?:[?#]|$)/i, "png-file"],
  ];
  const tags = {};
  const hosts = {};
  const fam = new Map();
  const imgs = { total: 0, visible: 0, bySrcKind: {} };
  const canvases = [];
  const canvasEls = [];
  const iframes = [];
  const scrolling = [];
  const pseudoKinds = {};
  const rare = { video: 0, object: 0, embed: 0, input: 0, textarea: 0, select: 0, button: 0 };
  let total = 0;
  let visibleTotal = 0;
  let textBearingVisible = 0;
  let svgRoots = 0;
  let svgRootsVisible = 0;
  let svgElements = 0;
  const RAD = ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"];
  for (const root of roots) {
    const inShadow = root !== document;
    if (inShadow) hosts[root.host.tagName.toLowerCase()] = (hosts[root.host.tagName.toLowerCase()] ?? 0) + 1;
    for (const e of root.querySelectorAll("*")) {
      total++;
      const tag = e.tagName.toLowerCase();
      tags[tag] = (tags[tag] ?? 0) + 1;
      if (tag in rare) rare[tag]++;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const vis = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      if (vis) visibleTotal++;
      if (cs.transform !== "none") bump("transform", vis);
      if (cs.filter !== "none") bump("filter", vis);
      const bf = cs.getPropertyValue("backdrop-filter");
      if (bf && bf !== "none") bump("backdropFilter", vis);
      if (cs.boxShadow !== "none") bump("boxShadow", vis);
      if (cs.textShadow !== "none") bump("textShadow", vis);
      const bg = cs.backgroundImage;
      if (bg.includes("gradient(")) bump("backgroundGradient", vis);
      if (bg.includes("url(")) bump("backgroundUrl", vis);
      if (cs.backgroundClip === "text") bump("backgroundClipText", vis);
      const m1 = cs.getPropertyValue("mask-image");
      const m2 = cs.getPropertyValue("-webkit-mask-image");
      if ((m1 && m1 !== "none") || (m2 && m2 !== "none")) bump("mask", vis);
      if (cs.clipPath !== "none") bump("clipPath", vis);
      if (Number.parseFloat(cs.opacity) < 1) bump("opacityBelow1", vis);
      if (RAD.some((p) => px(cs.getPropertyValue(p)) > 0)) bump("borderRadius", vis);
      if (cs.mixBlendMode !== "normal") bump("mixBlendMode", vis);
      if (cs.position === "fixed") bump("positionFixed", vis);
      else if (cs.position === "sticky") bump("positionSticky", vis);
      if (cs.textDecorationLine !== "none") {
        bump("textDecoration", vis);
        // The converter draws a solid underline in the default place; every other decoration is counted
        // as not drawn (snapshot-svg.mjs, decorationsOf).
        if (cs.textDecorationLine !== "underline" || cs.textDecorationStyle !== "solid" || cs.textUnderlinePosition !== "auto")
          bump("textDecorationNotDrawn", vis);
      }
      if (cs.letterSpacing !== "normal" && px(cs.letterSpacing) !== 0) bump("letterSpacing", vis);
      if (cs.writingMode !== "horizontal-tb") bump("verticalWriting", vis);
      if (cs.direction !== "ltr") bump("rtl", vis);
      if (cs.getPropertyValue("-webkit-text-fill-color") !== cs.color) bump("textFillDiffersFromColor", vis);
      if (cs.outlineStyle !== "none" && px(cs.outlineWidth) > 0) bump("outline", vis);
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(e, pseudo);
        const content = ps.content;
        if (!content || content === "none" || content === "normal" || ps.display === "none") continue;
        bump("pseudoContent", vis);
        const kind = content === '""' ? "empty" : content.startsWith("url(") ? "url" : /^(?:counter|attr)\(/.test(content) ? "dynamic" : "text";
        pseudoKinds[kind] = (pseudoKinds[kind] ?? 0) + 1;
        const bi = ps.backgroundImage;
        const mi = ps.getPropertyValue("mask-image");
        const wm = ps.getPropertyValue("-webkit-mask-image");
        if ((bi && bi !== "none") || (mi && mi !== "none") || (wm && wm !== "none")) bump("pseudoContentWithImage", vis);
        if (ps.backgroundColor && ps.backgroundColor !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(ps.backgroundColor)) bump("pseudoContentWithBackgroundColor", vis);
      }
      const html = e instanceof HTMLElement;
      if (cs.textOverflow === "ellipsis") {
        bump("textOverflowEllipsis", vis);
        if (html && cs.overflowX !== "visible" && e.scrollWidth > e.clientWidth) bump("textOverflowEllipsisTruncating", vis);
      }
      const ox = cs.overflowX;
      const oy = cs.overflowY;
      const scrollish = (v) => v === "auto" || v === "scroll";
      if (html) {
        const bw = px(cs.borderLeftWidth) + px(cs.borderRightWidth);
        const bh = px(cs.borderTopWidth) + px(cs.borderBottomWidth);
        const sv = scrollish(oy) && e.scrollHeight > e.clientHeight + 1;
        const sh = scrollish(ox) && e.scrollWidth > e.clientWidth + 1;
        // an inline box has no client size, which would make every one look as if it had a scrollbar
        const boxed = cs.display !== "inline" && e.clientWidth > 0 && e.clientHeight > 0;
        const bv = boxed && e.offsetWidth - e.clientWidth - bw > 0.5;
        const bhz = boxed && e.offsetHeight - e.clientHeight - bh > 0.5;
        if (sv) bump("scrollingVertically", vis);
        if (sh) bump("scrollingHorizontally", vis);
        if (bv) bump("scrollbarVisibleVertical", vis);
        if (bhz) bump("scrollbarVisibleHorizontal", vis);
        if ((sv || sh) && vis) scrolling.push({ el: desc(e), inShadow, rect: box(r), scrollHeight: e.scrollHeight, clientHeight: e.clientHeight, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth, overflowX: ox, overflowY: oy, scrollbarV: bv, scrollbarH: bhz });
        if ((ox === "hidden" || ox === "clip" || oy === "hidden" || oy === "clip") && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) bump("overflowHiddenAndClipping", vis);
        if (ox === "hidden" || ox === "clip" || oy === "hidden" || oy === "clip") bump("overflowHiddenOrClip", vis);
      }
      let textBearing = false;
      for (const n of e.childNodes) {
        if (n.nodeType === 3 && n.nodeValue.trim()) {
          textBearing = true;
          break;
        }
      }
      if (!textBearing && (tag === "input" || tag === "textarea")) textBearing = !!(e.value || e.placeholder);
      const key = cs.fontFamily;
      let row = fam.get(key);
      if (!row) fam.set(key, (row = { family: key, all: 0, textBearing: 0, textBearingVisible: 0 }));
      row.all++;
      if (textBearing) row.textBearing++;
      if (textBearing && vis) {
        row.textBearingVisible++;
        textBearingVisible++;
      }
      if (tag === "img") {
        imgs.total++;
        if (vis) imgs.visible++;
        const src = e.currentSrc || e.src || "";
        let kind = "other-file";
        for (const [re, k] of SRC_KINDS) {
          if (re.test(src)) {
            kind = k;
            break;
          }
        }
        if (!src) kind = "empty";
        const row2 = (imgs.bySrcKind[kind] ??= { all: 0, visible: 0 });
        row2.all++;
        if (vis) row2.visible++;
      } else if (tag === "canvas") {
        canvases.push({ el: desc(e), inShadow, width: e.width, height: e.height, rect: box(r), visible: vis });
        canvasEls.push(vis ? e : null);
      } else if (tag === "iframe") {
        iframes.push({ src: (e.getAttribute("src") || "").split("/").pop(), srcdoc: e.hasAttribute("srcdoc"), el: desc(e), inShadow, rect: box(r), visible: vis });
      }
      if (e instanceof SVGElement) {
        svgElements++;
        if (e instanceof SVGSVGElement && !e.ownerSVGElement) {
          svgRoots++;
          if (vis) svgRootsVisible++;
        }
      }
    }
  }
  const area = (s) => s.rect.width * s.rect.height;
  scrolling.sort((a, b) => area(b) - area(a));
  const canvasData = [];
  canvasEls.forEach((e, i) => {
    if (!e || canvasData.length >= 20) return;
    try {
      canvasData.push({ index: i, data: e.toDataURL("image/png") });
    } catch (err) {
      canvasData.push({ index: i, error: String(err.message ?? err) });
    }
  });
  const byCount = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  return {
    census: {
      page: { innerWidth, innerHeight, devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, origin: location.origin, base: (document.baseURI || "").split("/").pop() },
      elements: { all: total, visible: visibleTotal, textBearingVisible },
      shadowRoots: { open: roots.length - 1, hostsByTag: hosts },
      canvases,
      iframes,
      imgs,
      svgInline: { roots: svgRoots, rootsVisible: svgRootsVisible, elements: svgElements },
      features: F,
      pseudoContentKinds: pseudoKinds,
      scrolling: scrolling.slice(0, 25),
      rareElements: rare,
      fontFamilies: [...fam.values()].sort((a, b) => b.all - a.all),
      tagsTop: byCount(tags, 40),
      ms: Math.round(performance.now() - t0),
    },
    canvasData,
  };
})()`;

// ------------------------------------------------------------ taking a bundle

const pngSize = (png) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
const kb = (file) => `${(statSync(file).size / 1024).toFixed(0)} KB`;
const say = (text) => console.log(text);

// The snapshot's counts per document and the open/closed shadow roots it saw.
function analyseSnapshot(snap) {
  const S = snap.strings;
  const docs = snap.documents.map((doc) => {
    const roots = {};
    const rt = doc.nodes.shadowRootType;
    if (rt) for (const v of rt.value) roots[S[v]] = (roots[S[v]] ?? 0) + 1;
    return {
      document: (S[doc.documentURL] ?? "").split("/").pop(),
      nodes: doc.nodes.nodeName.length,
      layoutNodes: doc.layout.nodeIndex.length,
      textBoxes: doc.textBoxes.layoutIndex.length,
      pseudoElementNodes: doc.nodes.pseudoType?.index.length ?? 0,
      shadowRootsByType: roots,
      contentWidth: doc.contentWidth,
      contentHeight: doc.contentHeight,
      scrollOffset: { x: doc.scrollOffsetX, y: doc.scrollOffsetY },
    };
  });
  return { documents: docs, strings: S.length };
}

// The elements whose text the platform-font query is asked about: one per distinct
// font (family, size, weight, style) first, then others spread evenly, up to `limit`.
function pickTextElements(snap, names, limit) {
  const S = snap.strings;
  const doc = snap.documents[0];
  const at = Object.fromEntries(names.map((n, i) => [n, i]));
  const style = (li, name) => {
    const k = doc.layout.styles[li]?.[at[name]];
    return k >= 0 ? S[k] : "";
  };
  const layoutOf = new Map();
  doc.layout.nodeIndex.forEach((ni, li) => {
    layoutOf.set(ni, li);
  });
  const parents = new Map();
  const tb = doc.textBoxes;
  for (let i = 0; i < tb.layoutIndex.length; i++) {
    const [x, y, w, h] = tb.bounds[i];
    if (w <= 0 || h <= 0 || x + w <= 0 || y + h <= 0 || x >= IDE_SIZE.width || y >= IDE_SIZE.height) continue;
    const li = tb.layoutIndex[i];
    const pi = doc.nodes.parentIndex[doc.layout.nodeIndex[li]];
    // a text node's layout holds no computed styles: its element's do
    const pl = layoutOf.get(pi);
    if (pi < 0 || pl === undefined || style(pl, "visibility") === "hidden") continue;
    let p = parents.get(pi);
    if (!p) {
      const s = (name) => style(pl, name);
      p = {
        nodeIndex: pi,
        backendNodeId: doc.nodes.backendNodeId[pi],
        element: S[doc.nodes.nodeName[pi]],
        family: s("font-family"),
        size: s("font-size"),
        weight: s("font-weight"),
        style: s("font-style"),
        chars: 0,
      };
      parents.set(pi, p);
    }
    p.chars += tb.length[i];
  }
  const all = [...parents.values()];
  const combos = new Map();
  for (const p of all) {
    const key = [p.family, p.size, p.weight, p.style].join("|");
    const best = combos.get(key);
    if (!best || p.chars > best.chars) combos.set(key, p);
  }
  const chosen = new Set([...combos.values()].slice(0, limit));
  const rest = all.filter((p) => !chosen.has(p));
  const room = limit - chosen.size;
  for (let i = 0; i < room && rest.length; i++) chosen.add(rest[Math.floor((i * rest.length) / room)]);
  return { picked: [...chosen], elementsWithText: all.length, distinctFonts: combos.size };
}

// CSS.getPlatformFontsForNode for the picked elements, aggregated.
async function platformFonts(c, snap, names) {
  const { picked, elementsWithText, distinctFonts } = pickTextElements(snap, names, FONT_SAMPLE);
  await c.send("DOM.enable");
  await c.send("DOM.getDocument", { depth: 0 });
  await c.send("CSS.enable");
  const byFont = new Map();
  const byRequested = new Map();
  let errors = 0;
  try {
    const { nodeIds } = await c.send("DOM.pushNodesByBackendIdsToFrontend", {
      backendNodeIds: picked.map((p) => p.backendNodeId),
    });
    for (let i = 0; i < picked.length; i++) {
      const p = picked[i];
      if (!nodeIds[i]) {
        errors++;
        continue;
      }
      let fonts;
      try {
        ({ fonts } = await c.send("CSS.getPlatformFontsForNode", { nodeId: nodeIds[i] }));
      } catch {
        errors++;
        continue;
      }
      const resolved = fonts.map((f) => ({ ...f }));
      for (const f of resolved) {
        const k = [f.familyName, f.postScriptName ?? "", f.isCustomFont].join("|");
        const row = byFont.get(k) ?? {
          familyName: f.familyName,
          postScriptName: f.postScriptName ?? null,
          isCustomFont: f.isCustomFont,
          glyphCount: 0,
          elements: 0,
        };
        row.glyphCount += f.glyphCount;
        row.elements++;
        byFont.set(k, row);
      }
      const rk = [p.family, p.size, p.weight, p.style].join("|");
      if (!byRequested.has(rk)) {
        byRequested.set(rk, {
          family: p.family,
          size: p.size,
          weight: p.weight,
          style: p.style,
          element: p.element,
          chars: p.chars,
          resolved,
        });
      }
    }
  } finally {
    await c.send("CSS.disable").catch(() => {});
    await c.send("DOM.disable").catch(() => {});
  }
  return {
    sampled: picked.length,
    elementsWithText,
    distinctFonts,
    errors,
    aggregate: [...byFont.values()].sort((a, b) => b.glyphCount - a.glyphCount),
    byRequested: [...byRequested.values()],
  };
}

// Second chance for what an in-page fetch could not read: the bytes the browser itself
// loaded, through the DevTools resource tree.
async function viaDevTools(c, urls) {
  const found = {};
  if (!urls.length) return found;
  let tree;
  try {
    ({ frameTree: tree } = await c.send("Page.getResourceTree"));
  } catch {
    return found;
  }
  const known = new Map();
  const visit = (t) => {
    for (const r of t.resources ?? []) known.set(r.url, { frameId: t.frame.id, mimeType: r.mimeType });
    for (const k of t.childFrames ?? []) visit(k);
  };
  visit(tree);
  for (const url of urls) {
    const r = known.get(url);
    if (!r) continue;
    try {
      const { content, base64Encoded } = await c.send("Page.getResourceContent", { frameId: r.frameId, url });
      found[url] = {
        data: `data:${r.mimeType};base64,${base64Encoded ? content : Buffer.from(content).toString("base64")}`,
        type: r.mimeType,
      };
    } catch {
      // stays a failure
    }
  }
  return found;
}

const writeJson = (dir, name, value) => writeFileSync(path.join(dir, name), JSON.stringify(value));

async function takeBundle(c, state, extraMeta, buildLabel) {
  const dir = path.join(outRoot, state);
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  await quiet(c);
  await frames(c);
  await sleep(REST_MS);

  const text = await c.evaluate(VISIBLE_TEXT);
  const userInVisibleText = text.toLowerCase().includes(USER.toLowerCase());

  const shot = async () => {
    const { data } = await c.send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: IDE_SIZE.width, height: IDE_SIZE.height, scale: 1 },
    });
    return Buffer.from(data, "base64");
  };
  const png = await shot();
  writeFileSync(path.join(dir, "page.png"), png);

  const styles = await c.evaluate(`${JSON.stringify(STYLES)}.filter((p) => CSS.supports(p, "initial"))`);
  const snap = await c.send(
    "DOMSnapshot.captureSnapshot",
    {
      computedStyles: styles,
      includePaintOrder: true,
      includeDOMRects: true,
      includeBlendedBackgroundColors: true,
      includeTextColorOpacities: true,
    },
    { timeout: 180000 },
  );
  writeJson(dir, "snapshot.json", snap);
  const shape = analyseSnapshot(snap);
  const stylesPerNode = new Set(snap.documents.flatMap((d) => d.layout.styles.map((s) => s.length)));
  const userStrings = snap.strings.filter((s) => s.toLowerCase().includes(USER.toLowerCase())).length;

  // census
  const { census, canvasData } = await c.evaluate(CENSUS_JS, { timeout: 180000 });
  const doc0Open = shape.documents[0]?.shadowRootsByType.open ?? 0;
  const snapshotRoots = shape.documents.reduce((a, d) => {
    for (const [k, v] of Object.entries(d.shadowRootsByType)) a[k] = (a[k] ?? 0) + v;
    return a;
  }, {});
  census.shadowRoots = {
    ...census.shadowRoots,
    snapshotMainDocumentOpen: doc0Open,
    snapshotAllDocuments: snapshotRoots,
    seenBySnapshotButNotByPageWalk: doc0Open - census.shadowRoots.open,
    closedInSnapshot: snapshotRoots.closed ?? 0,
  };
  census.snapshot = {
    documents: shape.documents.length,
    perDocument: shape.documents.map((d) => ({ nodes: d.nodes, layoutNodes: d.layoutNodes, textBoxes: d.textBoxes })),
  };
  writeJson(dir, "census.json", census);
  const canvasFiles = [];
  for (const cv of canvasData) {
    if (!cv.data) continue;
    const file = `canvas-${cv.index}.png`;
    writeFileSync(path.join(dir, file), Buffer.from(cv.data.split(",")[1], "base64"));
    canvasFiles.push(file);
  }

  // resources
  const res = await c.evaluate(RESOURCES_JS, { awaitPromise: true, timeout: 180000 });
  const retried = await viaDevTools(c, Object.keys(res.failures));
  for (const [url, r] of Object.entries(retried)) {
    res.resources[url] = r.data;
    res.info[url] = { ...res.info[url], type: r.type, via: "devtools", fetchError: res.failures[url] };
    delete res.failures[url];
  }
  writeJson(dir, "resources.json", res);

  // fonts
  const fonts = await c.evaluate(FONTS_JS, { awaitPromise: true, timeout: 180000 });
  const fontRetried = await viaDevTools(c, Object.keys(fonts.fileFailures));
  for (const [url, r] of Object.entries(fontRetried)) {
    fonts.files[url] = r.data;
    fonts.fileInfo[url] = { type: r.type, via: "devtools", fetchError: fonts.fileFailures[url] };
    delete fonts.fileFailures[url];
  }
  fonts.platformFonts = await platformFonts(c, snap, styles);
  writeJson(dir, "fonts.json", fonts);

  // the page must not have moved under the extraction
  const png2 = await shot();
  const metrics = await c.send("Page.getLayoutMetrics");
  const probeRects = {};
  for (const sel of ["#rootMenuFile", "#contextMenu", "body"]) probeRects[sel] = await rectOf(c, sel);
  const meta = {
    state,
    takenAt: new Date().toISOString(),
    ide: { build: buildNumber(ide), folder: path.basename(path.dirname(ide)), label: buildLabel },
    viewport: { ...IDE_SIZE, devicePixelRatio: SCALE },
    page: census.page,
    png: pngSize(png),
    captureAgrees: png.equals(png2),
    layoutMetrics: { cssLayoutViewport: metrics.cssLayoutViewport, cssContentSize: metrics.cssContentSize },
    stylesRequested: styles,
    stylesDropped: STYLES.filter((p) => !styles.includes(p)),
    stylesPerLayoutNode: [...stylesPerNode],
    snapshot: shape,
    probeRects,
    userName: { visibleText: userInVisibleText, snapshotStrings: userStrings },
    ...extraMeta,
  };
  writeJson(dir, "meta.json", meta);

  const layout = shape.documents.reduce((n, d) => n + d.layoutNodes, 0);
  const boxes = shape.documents.reduce((n, d) => n + d.textBoxes, 0);
  say(
    `[${state}] ${((Date.now() - t0) / 1000).toFixed(1)} s; capture ${meta.captureAgrees ? "stable" : "changed during the extraction"}`,
  );
  say(
    `[${state}] page.png ${kb(path.join(dir, "page.png"))} (${meta.png.width}x${meta.png.height}), snapshot.json ${kb(path.join(dir, "snapshot.json"))} ` +
      `(${shape.documents.length} document(s), ${shape.documents.reduce((n, d) => n + d.nodes, 0)} nodes, ${layout} layout nodes, ${boxes} text boxes), ` +
      `resources.json ${kb(path.join(dir, "resources.json"))} (${Object.keys(res.resources).length} fetched, ${Object.keys(res.failures).length} failed, ${Object.keys(res.hiddenOnly).length} hidden-only, ${res.dataUrls.all} data: uses), ` +
      `fonts.json ${kb(path.join(dir, "fonts.json"))} (${fonts.faces.length} @font-face, ${Object.keys(fonts.files).length} files, ${Object.keys(fonts.fileFailures).length} failed), ` +
      `census.json ${kb(path.join(dir, "census.json"))}, meta.json${canvasFiles.length ? `, ${canvasFiles.length} canvas png` : ""}`,
  );
  if (userInVisibleText || userStrings) {
    say(
      `[${state}] the Windows user name is in the bundle: ${userInVisibleText ? "in the page's visible text; " : ""}in ${userStrings} snapshot string(s). ` +
        "Scratch data only: a converter must not carry it into a picture.",
    );
  }
  return meta;
}

// ------------------------------------------------------------ run

mkdirSync(outRoot, { recursive: true });
let ports;
try {
  ports = await claimPorts(1, { from: firstPort });
} catch (e) {
  die(2, e.message);
}
const root = path.join(tmpdir(), "tbshoot-svg", String(ports[0]));
try {
  removeTree(root);
} catch (e) {
  die(2, `${root} could not be emptied (${e.code}): is an IDE from an earlier run still open?`);
}
mkdirSync(root, { recursive: true });
const tidy = startTidy({ prefixes: [root] });
if (!tidy) die(2, "could not record the registry, so it could not be put back afterwards");

const lane = new Lane({ name: "svgshot", port: ports[0], work: root, ide, show: false, browserArgs: BROWSER_ARGS });

const endIde = () => {
  if (lane.run) shutdownIde(lane.run);
  finishTidy(tidy);
};
exitOnCrash(() => {
  console.error("ending the IDE by its pid and putting the registry back after the crash");
  endIde();
});
process.on("SIGINT", () => {
  endIde();
  process.exit(130);
});

let failed = 0;
let toldPid = false;
const watcher = setInterval(() => {
  if (lane.run && !toldPid) {
    toldPid = true;
    say(
      `IDE pid ${lane.run.pid} on a private desktop, DevTools port ${ports[0]} (end it by pid: taskkill /PID ${lane.run.pid} /T /F)`,
    );
  }
}, 100);

try {
  say(`opening ${path.relative(REPO_ROOT, DEMO)} in ${path.basename(path.dirname(ide))}`);
  let c;
  try {
    c = await lane.open(DEMO);
  } finally {
    clearInterval(watcher);
  }
  await openFile(c, DEMO_FILE, { line: 1, column: 1 });
  const defaults = JSON.parse(await c.evaluate(PAGE_DEFAULTS));
  say(
    `page settings put to their defaults (in the page only, saved nowhere): ${defaults.join("; ") || "none differed"}`,
  );
  await ensureDark(c);
  await fixPageSize(c);
  const editor = await c.evaluate(
    `(() => ({ viewLines: document.querySelectorAll(".monaco-editor .view-line").length, firstLine: document.querySelector(".monaco-editor .view-line")?.innerText ?? null }))()`,
  );
  // the build as the IDE's own title bar names it (the page's document.title is empty)
  const buildLabel = await c.evaluate(`document.body.innerText.match(/twinBASIC IDE BETA \\d+/)?.[0] ?? null`);
  say(`editor shows ${editor.viewLines} lines; the title bar names ${JSON.stringify(buildLabel)}`);

  for (const state of STATES.filter((s) => !only || s === only)) {
    try {
      await resetUi(c);
      let extra = { editor };
      if (state === "menu-file") {
        const title = await rectOf(c, "#rootMenuFile");
        const drop = await openFileMenu(c);
        const u = union(title, drop);
        // as menuShot computes it: the outline is outside the sides and the bottom; the bar is above
        const area = { x: u.x - OUTLINE, y: u.y, width: u.width + 2 * OUTLINE, height: u.height + OUTLINE };
        extra = {
          editor,
          menu: "File",
          clip: snapOut(area),
          clipUnsnapped: area,
          titleRect: title,
          dropRect: drop,
          items: await menuItems(c),
        };
      }
      try {
        await takeBundle(c, state, extra, buildLabel);
      } finally {
        if (state === "menu-file") await closeMenus(c);
      }
    } catch (e) {
      console.error(`[${state}] FAILED: ${e.message}`);
      failed = 1;
    }
  }
} catch (e) {
  clearInterval(watcher);
  console.error(e.message);
  failed = 2;
}

try {
  await lane.close();
} catch (e) {
  console.error(e.message);
  failed = Math.max(failed, 1);
}
const problems = [];
if (!finishTidy(tidy)) problems.push("the IDE's registry entries could not be put back (see the warning above)");
try {
  removeTree(root);
} catch (e) {
  problems.push(`${root} could not be removed (${e.code})`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(3);
}
say(`the registry is as it was found; bundles are in ${outRoot}`);
process.exit(failed);
