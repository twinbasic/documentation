// P3, P4 and P12 in WIP.HelpAddin.md, measured rather than read off the IDE's
// code: a web page in a tool window, HTML set through innerHTML with inline
// handlers in it, and raiseEvent from plain tool-window HTML. The PanesProbe
// add-in (probes/panes) builds the tool window and points its iframe at
// TB_PANES_URL. This file serves that page, and the two it leads to, from a
// server of its own on localhost: the IDE's own page is on localhost too, so
// the frame is on the same site, in the page's own process, where CDP can read
// it through Page.getFrameTree. A frame on another site gets a process and a
// DevTools target of its own (P3 in WIP.HelpAddin.md).
//
// Each test states what BETA 983 does. If one fails after an IDE update, the
// IDE has changed: update P3, P4 and P12 in WIP.HelpAddin.md and the tbIDE
// pages that rest on them (HtmlElement, HtmlElementProperties, HtmlElements,
// ToolWindow), and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, loadedAddins, readConsole, sleep } from "../../scripts/lib/tb-ide.mjs";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { click, clickAt, pressKey, toolWindow, waitFor } from "../../scripts/lib/tb-operate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "panes");
const W = "PanesProbeData";            // the id the probe gives ToolWindows.Add
const lane = addinLane();

// ------------------------------------------------------------------ the pages

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="color-scheme" content="light dark"><title>${title}</title>
<style>body{font:14px sans-serif;margin:8px}@media (prefers-color-scheme: dark){body{background:#111;color:#eee}}</style>
</head><body><h1>${title}</h1>${body}</body></html>`;
const PAGES = {
  "/a.html": page("Fixture A", `<p><a id="toB" href="b.html">to page B</a></p>` +
                  Array.from({ length: 200 }, (_, i) => `<p>line ${i + 1}</p>`).join("")),
  "/b.html": page("Fixture B", `<p><a id="toA" href="a.html">to page A</a></p>`),
  "/c.html": page("Fixture C", "<p>page C</p>"),
};

// Serve PAGES on one port of both loopback addresses, since the frame may
// resolve localhost to either, recording every request. A port whose IPv6
// side something else holds is given up for another, so that no request can
// reach a stranger's server.
async function servePages() {
  const requests = [];
  const handler = (req, res) => {
    requests.push({ url: req.url, dest: req.headers["sec-fetch-dest"] });
    const body = PAGES[req.url.split("?")[0]];
    res.writeHead(body ? 200 : 404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(body ?? "");
  };
  const listen = (host, port) => new Promise((resolve, reject) => {
    const s = http.createServer(handler);
    s.once("error", reject);
    s.listen(port, host, () => resolve(s));
  });
  for (let tries = 0; tries < 5; tries++) {
    const v4 = await listen("127.0.0.1", 0);
    const port = v4.address().port;
    try {
      const v6 = await listen("::1", port);
      return { port, requests, close: () => { v4.close(); v6.close(); } };
    } catch (e) {
      if (e.code === "EADDRNOTAVAIL" || e.code === "EAFNOSUPPORT") {
        return { port, requests, close: () => v4.close() };      // no IPv6 loopback at all
      }
      v4.close();
    }
  }
  throw new Error("no loopback port was free on both IPv4 and IPv6");
}

// ------------------------------------------------------------------ reading

// The probe's lines in the DEBUG CONSOLE since a mark, without the prefix.
const probeLines = async (c, mark) => ((await readConsole(c, { since: mark })) ?? "").split("\n")
  .map((l) => l.trim()).filter((l) => l.startsWith("[PanesProbe] ")).map((l) => l.slice(13));

// The frame, and an expression evaluated in its document, in an isolated world
// of the test's own so that nothing of the page's script is touched.
async function frameOf(c, origin) {
  const tree = await c.send("Page.getFrameTree");
  return (tree.frameTree.childFrames ?? []).map((f) => f.frame).find((f) => f.url.startsWith(origin)) ?? null;
}
async function frameEval(c, origin, expression) {
  const frame = await frameOf(c, origin);
  if (!frame) throw new Error(`no frame on ${origin}`);
  const { executionContextId } = await c.send("Page.createIsolatedWorld",
    { frameId: frame.id, worldName: "panes-test" });
  const r = await c.send("Runtime.evaluate", { expression, contextId: executionContextId, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

// An element of the tool window, as a rectangle in the page's coordinates.
const rectOf = (c, css) => c.evaluate(`(() => {
  const e = toolWindowsById[${JSON.stringify(W)}].bodyElement.querySelector(${JSON.stringify(css)});
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
})()`);

// Click an element of the page in the frame, at its centre, as a person would.
async function clickInFrame(c, origin, css) {
  const f = await rectOf(c, "#p3frame");
  const e = await frameEval(c, origin, `(() => { const r = document.querySelector(${JSON.stringify(css)})
    .getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await clickAt(c, f.x + e.x, f.y + e.y);
}

// Windows' app mode, which a WebView2 page's prefers-color-scheme follows
// unless its host says otherwise: AppsUseLightTheme 0 is dark.
function windowsAppModeDark() {
  try {
    const out = execFileSync("reg", ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
                                     "/v", "AppsUseLightTheme"], { encoding: "utf8", windowsHide: true });
    return /AppsUseLightTheme\s+REG_DWORD\s+0x0\b/.test(out);
  } catch {
    return false;                      // no value: Windows' default, light
  }
}

// ------------------------------------------------------------------ the tests

describe("P3, P4 and P12: HTML and a web page in a tool window", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c, pages, origin;
  const exceptions = [];
  before(async () => {
    pages = await servePages();
    origin = `http://localhost:${pages.port}/`;
    await lane.addAddin(PROBE);
    c = await lane.open(HOST, { env: { TB_PANES_URL: `${origin}a.html` } });
    await c.send("Runtime.enable");
    c.on((m) => {
      if (m.method !== "Runtime.exceptionThrown") return;
      const d = m.params.exceptionDetails;
      exceptions.push((d.exception?.description ?? d.text ?? "").split("\n")[0]);
    });
  });
  after(async () => {
    try { await lane?.close(); } finally { pages?.close(); }
  });

  test("the add-in loads, and its button opens its tool window", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.ok(names.includes("PanesProbe AddIn"), `loaded: ${JSON.stringify(names)}`);
    const mark = await consoleMark(c);
    await click(c, "addinButton-PanesProbeShow");
    assert.ok(await waitFor(c, async (c) => (await toolWindow(c, W))?.visible), "the tool window did not appear");
    assert.ok(await waitFor(c, async (c) => (await probeLines(c, mark)).includes("shown")),
              "the add-in did not finish building its tool window");
  });

  test("P4: innerHTML renders, and its inline handlers run as the IDE page's own script", async () => {
    assert.equal(await c.evaluate(`toolWindowsById[${JSON.stringify(W)}].bodyElement.querySelector("#p4bold")?.tagName`), "B");
    // The <img>'s onerror ran with nothing clicked, and saw the page's internals.
    assert.equal(await waitFor(c, (c) => c.evaluate("window.__p4error")), "object");
    await click(c, { toolWindow: W, css: "#p4click" });
    assert.equal(await waitFor(c, (c) => c.evaluate("window.__p4click")), "object");
  });

  test("P4: a property whose name starts with \"on\" is dropped, and the add-in is told nothing", async () => {
    assert.ok((await probeLines(c, null)).includes("onclick property set, error 0"));
    assert.deepEqual(await c.evaluate(`(() => { const e = toolWindowsById[${JSON.stringify(W)}].bodyElement
      .querySelector("#p4onprop"); return [e.onclick, e.getAttribute("onclick")]; })()`), [null, null]);
  });

  test("P12: raiseEvent from plain tool-window HTML throws, and the add-in hears nothing", async () => {
    const mark = await consoleMark(c);
    const n = exceptions.length;
    await click(c, { toolWindow: W, css: "#p12raise" });
    assert.ok(await waitFor(c, () => exceptions.length > n), "raiseEvent threw nothing");
    assert.match(exceptions[n], /^TypeError: Cannot read properties of null \(reading 'rootEventHandler'\)/);
    await sleep(1500);
    assert.deepEqual((await probeLines(c, mark)).filter((l) => l.startsWith("p12Event")), []);
  });

  test("P12: an inline handler that calls the listener AddEventListener put on its parent reaches the add-in", async () => {
    const mark = await consoleMark(c);
    const n = exceptions.length;
    await click(c, { toolWindow: W, css: "#p12direct" });
    assert.ok(await waitFor(c, async (c) => (await probeLines(c, mark)).includes("p12Event from p12direct")),
              `the add-in's listener was not called: ${JSON.stringify(await probeLines(c, mark))}`);
    assert.deepEqual(exceptions.slice(n), []);
  });

  test("P3: Visible = True sets the root's display to block, and a wrapper keeps the frame filling the window", async () => {
    assert.equal(await c.evaluate(`toolWindowsById[${JSON.stringify(W)}].bodyElement.style.display`), "block");
    const body = await c.evaluate(`(() => { const r = toolWindowsById[${JSON.stringify(W)}].bodyElement
      .getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
    const frame = await rectOf(c, "#p3frame");
    assert.ok(Math.abs(frame.width - body.width) < 2, `frame ${JSON.stringify(frame)} in body ${JSON.stringify(body)}`);
    assert.ok(Math.abs(frame.y + frame.height - (body.y + body.height)) < 2,
              `the frame does not reach the bottom: frame ${JSON.stringify(frame)}, body ${JSON.stringify(body)}`);
    assert.ok(frame.height > 150, `the frame kept its default height: ${JSON.stringify(frame)}`);
  });

  test("P3: the frame loads the page, and the add-in hears its load event", async () => {
    const loaded = await waitFor(c, async (c) => (await frameOf(c, origin))?.url === `${origin}a.html` &&
      await frameEval(c, origin, "document.readyState") === "complete");
    assert.ok(loaded, `the frame did not load ${origin}a.html`);
    assert.equal(await frameEval(c, origin, "document.title"), "Fixture A");
    assert.deepEqual(pages.requests[0], { url: "/a.html", dest: "iframe" });
    assert.ok(await waitFor(c, async (c) => (await probeLines(c, null)).includes("frame load")),
              "the add-in's load listener was not called");
  });

  test("P3: the mouse wheel scrolls the page in the frame", async () => {
    const f = await rectOf(c, "#p3frame");
    const x = f.x + f.width / 2, y = f.y + f.height / 2;
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await c.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: 400 });
    assert.ok(await waitFor(c, async (c) => await frameEval(c, origin, "scrollY") > 0), "the page did not scroll");
    await frameEval(c, origin, "scrollTo(0, 0)");
  });

  test("P3: keys pressed with the focus in the frame go to the page, not to the add-in's shortcuts", async () => {
    await clickInFrame(c, origin, "h1");
    assert.equal(await waitFor(c, (c) => frameEval(c, origin, "document.hasFocus()")), true);
    let mark = await consoleMark(c);
    await pressKey(c, "F1");
    await sleep(1500);
    assert.deepEqual((await probeLines(c, mark)).filter((l) => l === "fired f1"), []);
    // The control: back in the IDE's own document, F1 fires.
    await click(c, { toolWindow: W, css: "#p4bold" });
    mark = await consoleMark(c);
    await pressKey(c, "F1");
    assert.ok(await waitFor(c, async (c) => (await probeLines(c, mark)).includes("fired f1")),
              "F1 did not fire outside the frame either");
  });

  test("P3: a link in the page navigates the frame", async () => {
    const mark = await consoleMark(c);
    await clickInFrame(c, origin, "#toB");
    assert.ok(await waitFor(c, async (c) => (await frameOf(c, origin))?.url === `${origin}b.html`),
              `the frame is at ${(await frameOf(c, origin))?.url}`);
    assert.ok(await waitFor(c, async (c) => (await probeLines(c, mark)).includes("frame load")));
    assert.ok(pages.requests.some((r) => r.url === "/b.html" && r.dest === "iframe"));
  });

  test("P3: the add-in moves the frame to another page by setting its src", async () => {
    const mark = await consoleMark(c);
    await click(c, "addinButton-PanesProbeNavigate");
    assert.ok(await waitFor(c, async (c) => (await frameOf(c, origin))?.url === `${origin}c.html`),
              `the frame is at ${(await frameOf(c, origin))?.url}`);
    assert.ok(await waitFor(c, async (c) => (await probeLines(c, mark)).includes("frame load")));
    assert.equal(await waitFor(c, (c) => frameEval(c, origin, "document.title")), "Fixture C");
  });

  test("P3: the page's colour scheme is Windows' app mode", async (t) => {
    const dark = await frameEval(c, origin, `matchMedia("(prefers-color-scheme: dark)").matches`);
    t.diagnostic(`frame dark: ${dark}; Windows app mode dark: ${windowsAppModeDark()}; ` +
                 `IDE theme: ${await c.evaluate("getBaseThemeName()")}`);
    assert.equal(dark, windowsAppModeDark());
  });
});
