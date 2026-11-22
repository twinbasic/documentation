// The datasheet element, new in BETA 1045, measured in a tool window. Its
// DatasheetProbe add-in (probes/datasheet) opens a tool window, adds a
// "datasheet" element to its root and registers the element's four events on
// the root, as Sample 27 does on its designer's root. How each handler answers
// is set by the scenario through two properties of the root, and the scenario
// runs controller methods from twinBASIC through a third (the probe's header
// says how). What the grid holds and draws is read from the page: the
// controller, the Hypergrid instance it wraps, and the text the grid paints.
//
// Each test states what BETA 1045 does. If one fails after an IDE update, the
// IDE has changed: update the tbIDE pages that rest on it,
// docs/Reference/Built-In/tbIDE/Datasheet.md, HtmlElements.md and
// HtmlEventProperties.md, then .claude/beta1045/probe-datasheet.md's answer,
// and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { loadedAddins } from "../../scripts/lib/tb-ide-addins.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, pressKey, toolWindow, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "datasheet");
const W = "DatasheetProbeData"; // the id the probe gives ToolWindows.Add
const ROOT = `toolWindowsById[${JSON.stringify(W)}].bodyElement`;
const CTL = `${ROOT}.controller`;
const GRID = `${CTL}.getGrid()`;

// The reply the probe's onGetInfo gives on the happy path: three columns, one
// with a header, and 300 records.
const INFO = (columns = 3, recordCount = 300) =>
  JSON.stringify({
    recordCount,
    columns: [
      { name: "id", type: "integer" },
      { name: "name", header: "Full name", type: "string" },
      { name: "flag", type: "boolean" },
      ...(columns > 3 ? [{ name: "extra", type: "string" }] : []),
    ],
  });

// ------------------------------------------------------------------ reading

const probeLines = (c, mark) => linesSince(c, mark, { prefix: "[DatasheetProbe] " });

// How the probe's handlers answer (see OnGetInfo and OnGetRows in the probe).
const setReplies = (c, { info, rows }) =>
  c.evaluate(`(() => { const r = ${ROOT};
    ${info !== undefined ? `r.probeInfo = ${JSON.stringify(info)};` : ""}
    ${rows !== undefined ? `r.probeRows = ${JSON.stringify(rows)};` : ""} })()`);

// Run a command in the add-in (RunCommand in the probe) and return what it
// printed after "->": the result's TypeName and value. The hidden button is
// pressed from script: it is the probe's own plumbing, and a real click would
// take the focus off the grid.
async function cmd(c, text) {
  const mark = await consoleMark(c);
  await c.evaluate(`(() => { const r = ${ROOT}; r.probeCmd = ${JSON.stringify(text)};
    r.querySelector("#dscmd").click(); })()`);
  const head = `cmd ${text} -> `;
  const line = await waitFor(c, async (c) => (await probeLines(c, mark)).find((l) => l.startsWith(head)), {
    timeout: 15 * 1000,
  });
  assert.ok(line, `the add-in did not answer "${text}": ${JSON.stringify(await probeLines(c, mark))}`);
  return line.slice(head.length);
}

const state = (c) => c.evaluate(`${CTL}.getState()`);
const lastError = (c) => c.evaluate(`${CTL}.getLastError()`);
const vscroll = (c) => c.evaluate(`${GRID}.getVScrollValue()`);

// Each onGetRows the page raises, with its time: the root's handler wrapped.
const WRAP_ROWS_JS = `(() => { const r = ${ROOT}; const f = r.onGetRows; window.__dsRows = [];
  r.onGetRows = function (a) { window.__dsRows.push({ t: performance.now(), start: a.start, end: a.end });
    return f.apply(this, arguments); }; })()`;
const rowsAsked = (c) => c.evaluate("window.__dsRows.splice(0)");

// The grid's geometry: each visible data row and column with its rectangle in
// the page's coordinates, and the header row's.
const GEOMETRY_JS = `(() => {
  const g = ${GRID};
  const box = g.canvas.canvas.getBoundingClientRect();
  const rows = g.renderer.visibleRows.map((r) => ({
    data: r.subgrid === g.behavior.dataModel || !!r.subgrid?.isData,
    row: r.rowIndex, top: box.y + r.top, height: r.height }));
  const cols = g.renderer.visibleColumns.filter(Boolean).map((v) => ({
    col: v.columnIndex, left: box.x + v.left, width: v.width }));
  return { box: { x: box.x, y: box.y, width: box.width, height: box.height }, rows, cols };
})()`;
const geometry = (c) => c.evaluate(GEOMETRY_JS);

// The centre of a cell: column index as the grid counts them (0 is the
// record selector), data row zero-based; row "header" for the header.
async function cellPoint(c, col, row) {
  const g = await geometry(c);
  const r = row === "header" ? g.rows.find((r) => !r.data) : g.rows.find((r) => r.data && r.row === row);
  const k = g.cols.find((k) => k.col === col);
  assert.ok(r && k, `no cell ${col},${row} on screen: ${JSON.stringify(g)}`);
  return { x: k.left + k.width / 2, y: r.top + r.height / 2 };
}

// What the grid paints: one full repaint (Hypergrid skips a cell whose
// snapshot is unchanged, so the snapshots are cleared first) with fillText,
// moveTo and 2 px high fillRects recorded, each placed in the cell it falls
// in. Per row shown: for each grid column the text drawn, and whether a tick
// (a moveTo) or a dash (the fillRect) was drawn.
const PAINTED_JS = `(() => {
  const g = ${GRID};
  const canvas = g.canvas.canvas;
  const marks = [];
  const P = CanvasRenderingContext2D.prototype;
  const orig = { fillText: P.fillText, moveTo: P.moveTo, fillRect: P.fillRect };
  const mine = function () { return this.canvas === canvas; };
  P.fillText = function (t, x, y, ...a) { if (mine.call(this)) marks.push({ k: "text", t: String(t), x, y,
    m: this.getTransform() }); return orig.fillText.call(this, t, x, y, ...a); };
  P.moveTo = function (x, y) { if (mine.call(this)) marks.push({ k: "tick", x, y, m: this.getTransform() });
    return orig.moveTo.call(this, x, y); };
  P.fillRect = function (x, y, w, h) { if (mine.call(this) && h === 2 && w < 12) marks.push({ k: "dash", x, y,
    m: this.getTransform() }); return orig.fillRect.call(this, x, y, w, h); };
  // A cell's text is drawn with simpleText, an alias Hypergrid copies from
  // fillText onto its graphics context, so the prototype alone misses it.
  const ctx = canvas.getContext("2d");
  const aliased = [ctx, g.canvas.gc, g.canvas.gc?.gc].filter((o) => o && Object.hasOwn(o, "simpleText"));
  const saved = aliased.map((o) => o.simpleText);
  aliased.forEach((o, i) => { o.simpleText = function (t, x, y, ...a) {
    marks.push({ k: "text", t: String(t), x, y, m: ctx.getTransform() }); return saved[i].call(this, t, x, y, ...a); }; });
  try {
    g.renderer.cellEventPool.forEach((e) => { e.snapshot = []; });
    g.paintNow();
  } finally { Object.assign(P, orig); aliased.forEach((o, i) => { o.simpleText = saved[i]; }); }
  const dpr = canvas.width / canvas.getBoundingClientRect().width;
  const rows = g.renderer.visibleRows, cols = g.renderer.visibleColumns.filter(Boolean);
  const out = {};
  for (const mk of marks) {
    const x = (mk.m.a * mk.x + mk.m.e) / dpr, y = (mk.m.d * mk.y + mk.m.f) / dpr;
    const r = rows.find((r) => y >= r.top && y < r.top + r.height);
    const k = cols.find((k) => x >= k.left && x < k.left + k.width);
    if (!r || !k) continue;
    const key = (r.subgrid === g.behavior.dataModel || r.subgrid?.isData) ? String(r.rowIndex) : "header";
    const cell = ((out[key] ??= {})[k.columnIndex] ??= {});
    if (mk.k === "text") cell.text = (cell.text ?? "") + mk.t;
    else cell[mk.k] = true;
  }
  return out;
})()`;
const painted = (c) => c.evaluate(PAINTED_JS);

// The navigator: its text, the record box's value and which controls are disabled.
const NAVIGATOR_JS = `(() => { const r = ${CTL}.getRootElement();
  const box = r.querySelector("input");
  return { text: r.innerText.replace(/\\s+/g, " ").trim(), record: box ? box.value : null,
    disabled: [...r.querySelectorAll("button, input")].filter((e) => e.disabled).length,
    controls: r.querySelectorAll("button, input").length }; })()`;
const navigator = (c) => c.evaluate(NAVIGATOR_JS);

// Mouse input at a point, as CDP sends it.
const mouse = (c, type, { x, y }, extra = {}) => c.send("Input.dispatchMouseEvent", { type, x, y, ...extra });
async function press(c, p, { button = "left", clickCount = 1, modifiers = 0 } = {}) {
  await mouse(c, "mouseMoved", p, { modifiers });
  await mouse(c, "mousePressed", p, { button, clickCount, modifiers });
  await mouse(c, "mouseReleased", p, { button, clickCount, modifiers });
}

// ------------------------------------------------------------------ the tests

scenario("The datasheet element in a tool window", (lane) => {
  let c;
  const exceptions = [];
  const paused = [];
  before(async () => {
    await lane.addAddin(PROBE);
    c = await lane.open(HOST);
    await c.send("Runtime.enable");
    c.on((m) => {
      if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails;
        exceptions.push({
          text: d.text,
          description: (d.exception?.description ?? "").split("\n")[0],
          value: d.exception?.value,
          url: d.url,
          line: d.lineNumber,
        });
      } else if (m.method === "Debugger.paused") {
        paused.push({ reason: m.params.reason, fn: m.params.callFrames?.[0]?.functionName ?? "" });
        c.send("Debugger.resume").catch(() => {});
      }
    });
  });

  test("the element is a plain div; Ready and the four events are on its parent, the window's root", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.ok(names.includes("DatasheetProbe AddIn"), `loaded: ${JSON.stringify(names)}`);
    const mark = await consoleMark(c);
    await click(c, "addinButton-DatasheetProbeShow");
    assert.ok(await waitFor(c, async (c) => (await toolWindow(c, W))?.visible), "the tool window did not appear");
    assert.ok(await waitFor(c, async (c) => (await probeLines(c, mark)).includes("shown")));
    assert.deepEqual(
      await c.evaluate(`(() => { const r = ${ROOT}; const d = r.querySelector("#ds");
        return { tag: d?.tagName, children: d?.children.length, ready: typeof r.Ready,
          dsReady: typeof d?.Ready, controller: typeof r.controller,
          events: ["onGetInfo","onGetRows","onRightClickColumnHeader","onChangedColumnWidths"].map((n) => typeof r[n]) }; })()`),
      {
        tag: "DIV",
        children: 0,
        ready: "function",
        dsReady: "undefined",
        controller: "undefined",
        events: ["function", "function", "function", "function"],
      },
    );
    await c.evaluate(WRAP_ROWS_JS);
  });

  test("Ready() stops at its debugger statement when a DevTools client has the debugger on", async () => {
    await c.send("Debugger.enable");
    try {
      // The scenario resumes the pause at once, so Ready() returns.
      assert.equal(await cmd(c, "ready"), "done");
    } finally {
      await c.send("Debugger.disable");
    }
    assert.deepEqual(paused, [{ reason: "other", fn: "n.Ready" }]);
  });

  test("after Ready(): one controller on the root and on the element, state created, nothing asked", async () => {
    assert.deepEqual(
      {
        state: await cmd(c, "state"),
        isready: await cmd(c, "isready"),
        sheetstate: await cmd(c, "sheetstate"),
        selected: await cmd(c, "selected"),
        widths: await cmd(c, "widths"),
        same: await c.evaluate(`${ROOT}.controller === ${ROOT}.querySelector("#ds").controller`),
        visibility: await c.evaluate(`${CTL}.getRootElement().style.visibility`),
      },
      {
        state: "created /", // getLastError() is ""
        isready: "Boolean False",
        sheetstate: "String created",
        selected: "String -1:-1",
        widths: "String []",
        same: true,
        visibility: "hidden",
      },
    );
    const mark = await consoleMark(c);
    await sleep(500);
    assert.deepEqual(await probeLines(c, mark), []);
  });

  test("a number comes back to twinBASIC as a LongLong: setTimeout(3000)", async () => {
    assert.equal(await cmd(c, "timeout|3000"), "LongLong 3000");
  });

  test("onGetInfo returning without Resolve fails the load at once, not at the timeout", async () => {
    await setReplies(c, { info: "(none)", rows: "" });
    const mark = await consoleMark(c);
    const t0 = Date.now();
    assert.equal(await cmd(c, "load"), "String OK");
    const ms = await waitFor(c, async (c) => ((await state(c)) === "error" ? Date.now() - t0 : null), {
      timeout: 10000,
      interval: 50,
    });
    assert.ok(ms !== null && ms < 1500, `error after ${ms} ms (the timeout is 3000)`);
    assert.equal(await lastError(c), "onGetInfo() must return {recordCount, columns}");
    assert.deepEqual(await probeLines(c, mark), [
      "cmd load -> String OK",
      "info asked, argsIpcCached True",
      "info not resolved",
    ]);
    assert.equal(await c.evaluate(`${CTL}.getRootElement().style.visibility`), "hidden");
  });

  test("onGetInfo resolving a Long fails the load, and loadData() can be called again", async () => {
    await setReplies(c, { info: "(long)" });
    assert.equal(await cmd(c, "load"), "String OK");
    assert.ok(await waitFor(c, async (c) => (await state(c)) === "error", { timeout: 6000, interval: 50 }));
    assert.equal(await lastError(c), "onGetInfo() must return {recordCount, columns}");
  });

  test("onGetInfo resolving malformed JSON fails the load with JSON.parse's message", async () => {
    await setReplies(c, { info: "{not json" });
    assert.equal(await cmd(c, "load"), "String OK");
    assert.ok(await waitFor(c, async (c) => (await state(c)) === "error", { timeout: 6000, interval: 50 }));
    assert.equal(await lastError(c), "Expected property name or '}' in JSON at position 1 (line 1 column 2)");
  });

  test("a resolver kept past the timeout: the load fails at the timeout, and the late Resolve is ignored", async (t) => {
    await setReplies(c, { info: `(late)${INFO()}` });
    await rowsAsked(c);
    const mark = await consoleMark(c);
    const t0 = Date.now();
    assert.equal(await cmd(c, "load"), "String OK");
    const ms = await waitFor(c, async (c) => ((await state(c)) === "error" ? Date.now() - t0 : null), {
      timeout: 8000,
      interval: 50,
    });
    t.diagnostic(`error after ${ms} ms`);
    assert.ok(ms !== null && ms >= 2800 && ms < 3800, `error after ${ms} ms (the timeout is 3000)`);
    assert.equal(await lastError(c), "Timeout: onGetInfo");
    assert.ok(
      await waitFor(c, async (c) => (await probeLines(c, mark)).includes("timer resolved 1"), { timeout: 4000 }),
      "the late Resolve was not made",
    );
    await sleep(500);
    assert.equal(await state(c), "error");
    assert.deepEqual(await rowsAsked(c), []);
  });

  test("a resolver kept and called from a timer after the handler returned loads the grid", async () => {
    await setReplies(c, { info: `(timer)${INFO()}`, rows: "" });
    await rowsAsked(c);
    const mark = await consoleMark(c);
    assert.equal(await cmd(c, "load"), "String OK");
    assert.ok(await waitFor(c, async (c) => (await state(c)) === "ready", { timeout: 10000, interval: 50 }));
    assert.equal(await lastError(c), "");
    await sleep(1000);
    const lines = await probeLines(c, mark);
    assert.deepEqual(lines.slice(0, 4), [
      "cmd load -> String OK",
      "info asked, argsIpcCached True",
      "info resolve deferred",
      "timer resolved 1",
    ]);
    // Pages of 128 rows: the one shown and the next, asked for together.
    assert.deepEqual(lines.slice(4), ["rows 0-128", "rows 128-256"]);
    const asked = await rowsAsked(c);
    assert.ok(asked.length === 2 && asked[1].t - asked[0].t < 100, JSON.stringify(asked));
    assert.equal(await cmd(c, "load"), "String READY");
    assert.equal(await c.evaluate(`${CTL}.getRootElement().style.visibility`), "visible");
  });

  test("after the load: record 1 is current, and the navigator says how many records", async () => {
    assert.equal(await cmd(c, "selected"), "String 0:0");
    // First and Previous disabled; the record box holds 1.
    assert.deepEqual(await navigator(c), { text: "of 300 records", record: "1", disabled: 2, controls: 9 });
  });

  // The probe's rows 0 to 7 (RowJson). Grid column 0 is the record selector,
  // whose triangle at the current record is a moveTo too; 1 to 3 are id
  // (integer), name (string) and flag (boolean).
  test("what the grid draws: the header, a 0 as nothing, no number formatting, a tick only for true", async () => {
    const p = await painted(c);
    assert.deepEqual(p.header, { 1: { text: "id" }, 2: { text: "Full name" }, 3: { text: "flag" } });
    const rows = Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((r) => [r, p[r]]));
    assert.deepEqual(rows, {
      0: { 0: { tick: true }, 3: { tick: true } }, // [0, null, true]: the 0 draws nothing
      1: { 1: { text: "1" }, 2: { text: "42" } }, // [1, 42, false]: false is an empty box
      2: { 1: { text: "2" }, 2: { text: "true" }, 3: { dash: true } }, // [2, true, null]
      3: { 1: { text: "3" }, 2: { text: "1.5" } }, // [3, 1.5, 1]: 1 is an empty box
      4: { 1: { text: "4" }, 2: { text: "x" } }, // [4, "x", "true"]: so is "true"
      5: { 1: { text: "5" }, 2: { text: "[object Object]" } }, // [5, {"a":1}, false]
      6: { 1: { text: "1234567.891" }, 2: { text: "Name 6" }, 3: { tick: true } },
      7: { 1: { text: "seven" } }, // ["seven", 0, false]: text in an integer column; 0 again nothing
    });
  });

  test("showNulls(True) draws a null as the text null, except in a boolean column", async () => {
    await cmd(c, "nulls|true");
    const p = await painted(c);
    await cmd(c, "nulls|false");
    assert.deepEqual(p["0"], { 0: { tick: true }, 2: { text: "null" }, 3: { tick: true } });
    assert.deepEqual(p["2"], { 1: { text: "2" }, 2: { text: "true" }, 3: { dash: true } });
  });

  test("zoom: setZoom clamps to 25..400, refuses text once ready, and the navigator shows it", async () => {
    assert.equal(await cmd(c, "zoom|500"), "LongLong 400");
    assert.equal(await cmd(c, "zoom|10"), "LongLong 25");
    assert.equal(await cmd(c, "zoomtext|abc"), "Boolean False");
    assert.equal(await cmd(c, "zoom|150"), "LongLong 150");
    assert.equal((await navigator(c)).text, "of 300 records 150%");
    assert.equal(await c.evaluate(`${GRID}.properties.font`), "18px Tahoma, Geneva, sans-serif");
    assert.equal(await cmd(c, "zoom|100"), "LongLong 100");
    assert.equal((await navigator(c)).text, "of 300 records");
  });

  test("showNulls, showGridLines and showAlternateRowColors return what they are given", async () => {
    for (const k of ["nulls", "lines", "alt"]) {
      assert.equal(await cmd(c, `${k}|false`), "Boolean False");
      assert.equal(await cmd(c, `${k}|true`), "Boolean True");
    }
    await cmd(c, "nulls|false");
  });

  test("column widths: get, set, clamping, a bad entry, a name that is not a column", async () => {
    assert.equal(await cmd(c, "widths"), 'String [{"id":110},{"name":110},{"flag":110}]');
    assert.equal(
      await cmd(c, 'setwidths|[{"id":80},{"name":200},{"flag":60}]'),
      'String [{"id":80},{"name":200},{"flag":60}]',
    );
    assert.equal(await cmd(c, "widths"), 'String [{"id":80},{"name":200},{"flag":60}]');
    assert.equal(await cmd(c, 'setwidths|[{"id":0}]'), "Boolean False");
    assert.equal(await cmd(c, 'setwidths|[{"id":5000}]'), 'String [{"id":2400},{"name":200},{"flag":60}]');
    assert.equal(await cmd(c, 'setwidths|[{"nosuch":50}]'), 'String [{"id":2400},{"name":200},{"flag":60}]');
    assert.equal(await cmd(c, 'setwidths|[{"id":80}]'), 'String [{"id":80},{"name":200},{"flag":60}]');
  });

  test("onChangedColumnWidths: raised by autoFitColumnWidths and resetColumnWidths with a widths field, not by setColumnWidths or setZoom", async () => {
    let mark = await consoleMark(c);
    assert.equal(await cmd(c, "autofit"), "String OK");
    await sleep(800);
    assert.deepEqual(await probeLines(c, mark), [
      "cmd autofit -> String OK",
      'widths changed [{"id":89},{"name":100},{"flag":45}]',
    ]);
    mark = await consoleMark(c);
    // A JavaScript undefined reaches twinBASIC as Null.
    assert.equal(await cmd(c, "reset"), "Null");
    await sleep(800);
    assert.deepEqual(await probeLines(c, mark), [
      "cmd reset -> Null",
      'widths changed [{"id":110},{"name":110},{"flag":110}]',
    ]);
    mark = await consoleMark(c);
    await cmd(c, 'setwidths|[{"id":90}]');
    await cmd(c, "zoom|200");
    await sleep(800);
    assert.deepEqual(await probeLines(c, mark), [
      'cmd setwidths|[{"id":90}] -> String [{"id":90},{"name":110},{"flag":110}]',
      "cmd zoom|200 -> LongLong 200",
    ]);
    await cmd(c, "zoom|100");
    await cmd(c, "reset");
    await sleep(500);
  });

  test("setColumnIsSorted and setColumnIsFiltered: True for a column, False past the last; (filtered) in the navigator", async () => {
    assert.equal(await cmd(c, "sorted|0|true"), "Boolean True");
    assert.equal(await cmd(c, "filtered|1|true"), "Boolean True");
    assert.equal((await navigator(c)).text, "of 300 records (filtered)");
    assert.equal(await cmd(c, "filtered|9|true"), "Boolean False");
    assert.equal(await cmd(c, "filtered|1|false"), "Boolean True");
    assert.equal(await cmd(c, "sorted|0|false"), "Boolean True");
    assert.equal((await navigator(c)).text, "of 300 records");
  });

  test("navigateToRecord: 1-based, clamped, truncated; getSelectedRows zero-based", async () => {
    const at = async (n) => [await cmd(c, `nav|${n}`), await cmd(c, "selected"), (await navigator(c)).record];
    assert.deepEqual(await at(150), ["String OK", "String 149:149", "150"]);
    assert.deepEqual(await at(0), ["String OK", "String 0:0", "1"]);
    assert.deepEqual(await at(99999), ["String OK", "String 299:299", "300"]);
    // CLng(12.7) is 13 before the call: the probe passes a Long.
    assert.deepEqual(await at(12.7), ["String OK", "String 12:12", "13"]);
    assert.equal(await cmd(c, "selectall"), "Null");
    assert.equal(await cmd(c, "selected"), "String 0:299");
    await cmd(c, "nav|1");
  });

  test("flashMessage shows its text in the navigator for the time given", async () => {
    assert.equal(await cmd(c, "flash|hello there|2000"), "Boolean True");
    assert.equal((await navigator(c)).text, "of 300 records hello there");
    await sleep(2500);
    assert.equal((await navigator(c)).text, "of 300 records");
  });

  test("getRootElement() comes back to twinBASIC as Nothing, getGrid() as an Object", async () => {
    assert.equal(await cmd(c, "rootelement"), "Nothing");
    assert.equal(await cmd(c, "grid"), "Object");
    assert.equal(await cmd(c, "isready"), "Boolean True");
  });

  test("onRightClickColumnHeader: columnIndex among the provider's columns, and the point; nothing for the selector's header", async (t) => {
    const p = await cellPoint(c, 2, "header");
    const mark = await consoleMark(c);
    await press(c, p, { button: "right" });
    await sleep(800);
    t.diagnostic(`pressed at ${JSON.stringify(p)}`);
    // On the lane's private desktop the window is at the screen's origin, so
    // x and y (screenX, screenY) equal clientX and clientY here.
    const x = Math.floor(p.x),
      y = Math.floor(p.y);
    assert.deepEqual(await probeLines(c, mark), [`rightclick columnIndex 1 clientX ${x} clientY ${y} x ${x} y ${y}`]);
    const q = await cellPoint(c, 0, "header");
    const mark2 = await consoleMark(c);
    await press(c, q, { button: "right" });
    await sleep(800);
    assert.deepEqual(await probeLines(c, mark2), []);
    await pressKey(c, "Escape");
  });

  test("dragging over the selector selects rows 3 to 5; Hypergrid's copy handler gives them as TSV", async () => {
    const a = await cellPoint(c, 0, 3);
    const b = await cellPoint(c, 0, 5);
    await mouse(c, "mouseMoved", a);
    await mouse(c, "mousePressed", a, { button: "left", clickCount: 1 });
    await mouse(c, "mouseMoved", b, { button: "left" });
    await mouse(c, "mouseReleased", b, { button: "left", clickCount: 1 });
    await sleep(300);
    assert.equal(await cmd(c, "selected"), "String 3:5");
    assert.equal(await c.evaluate(`${GRID}.hasFocus()`), true);
    // A copy event made in the page, with a DataTransfer of its own, so the
    // system clipboard is never touched (Ctrl+C itself is not pressed).
    assert.deepEqual(
      await c.evaluate(`(() => { const dt = new DataTransfer();
      const ev = new ClipboardEvent("copy", { clipboardData: dt, bubbles: true, cancelable: true });
      document.body.dispatchEvent(ev); return { data: dt.getData("text/plain"), prevented: ev.defaultPrevented }; })()`),
      { data: "\t3\t1.5\t1\n\t4\tx\ttrue\n\t5\t[object Object]\tfalse\n", prevented: true },
    );
  });

  test("keys: Up and Down move the current record; PageDown scrolls without moving it", async (t) => {
    await press(c, await cellPoint(c, 2, 8));
    assert.equal(await cmd(c, "selected"), "String 8:8");
    await pressKey(c, "ArrowDown");
    await sleep(200);
    assert.equal(await cmd(c, "selected"), "String 9:9");
    await pressKey(c, "ArrowUp");
    await pressKey(c, "ArrowUp");
    await sleep(200);
    assert.equal(await cmd(c, "selected"), "String 7:7");
    await pressKey(c, "ArrowDown", { shift: true });
    await sleep(200);
    assert.equal(await cmd(c, "selected"), "String 7:7");
    // The keys left to Hypergrid: each throws inside fin-hypergrid.min.js, and
    // neither the current record nor the current cell moves.
    const TYPE_ERROR = "TypeError: Cannot read properties of null (reading 'x')";
    for (const [key, mods, threw] of [
      ["ArrowRight", {}, TYPE_ERROR],
      ["Tab", {}, TYPE_ERROR],
      ["ArrowLeft", {}, TYPE_ERROR],
      ["Home", {}, "page left not yet implemented"],
      ["End", {}, "page right not yet implemented"],
      ["End", { ctrl: true }, "page right not yet implemented"],
      ["Home", { ctrl: true }, "page left not yet implemented"],
    ]) {
      const n = exceptions.length;
      await pressKey(c, key, mods);
      await sleep(250);
      const name = `${mods.ctrl ? "Ctrl+" : ""}${key}`;
      assert.deepEqual(
        {
          name,
          selected: await cmd(c, "selected"),
          cell: await c.evaluate(`${GRID}.selectionModel.getLastSelection()?.origin`),
          vscroll: await vscroll(c),
          threw: exceptions.slice(n).map((e) => ({ message: e.description || e.value, file: path.basename(e.url) })),
        },
        {
          name,
          selected: "String 7:7",
          cell: { x: 2, y: 7 },
          vscroll: 0,
          threw: [{ message: threw, file: "fin-hypergrid.min.js" }],
        },
      );
    }
    exceptions.length = 0; // asserted above; the run's last test reports any others
    const v0 = await vscroll(c);
    await pressKey(c, "PageDown");
    await sleep(300);
    t.diagnostic(`PageDown: from ${v0} to ${await vscroll(c)}`);
    assert.equal(await cmd(c, "selected"), "String 7:7");
    assert.ok((await vscroll(c)) > v0);
    await cmd(c, "nav|1");
  });

  test("no editor: a double-click, a typed key and Enter on a data cell open nothing, and Enter moves down", async () => {
    const editor = () =>
      c.evaluate(`(() => { const g = ${GRID}; const r = ${ROOT};
      return { cellEditor: !!g.cellEditor,
        fields: [...r.querySelectorAll("input, textarea, select")].map((f) => f.className),
        textfields: document.querySelectorAll(".hypergrid-textfield").length }; })()`);
    const none = { cellEditor: false, fields: ["record-input"], textfields: 0 };
    const p = await cellPoint(c, 2, 9);
    await press(c, p);
    await mouse(c, "mousePressed", p, { button: "left", clickCount: 2 });
    await mouse(c, "mouseReleased", p, { button: "left", clickCount: 2 });
    await sleep(500);
    assert.deepEqual(await editor(), none);
    assert.equal((await navigator(c)).record, "10");
    await pressKey(c, "z");
    await sleep(300);
    assert.deepEqual(await editor(), none);
    await pressKey(c, "Enter");
    await sleep(300);
    assert.deepEqual(await editor(), none);
    assert.equal((await navigator(c)).record, "11");
    assert.deepEqual((await painted(c))["9"], { 1: { text: "9" }, 2: { text: "Name 9" } });
    await cmd(c, "nav|1");
  });

  test("the wheel scrolls 0.05 rows a pixel; Ctrl+wheel scrolls the same and does not zoom", async () => {
    const p = await cellPoint(c, 2, 2);
    assert.equal(await vscroll(c), 0);
    await mouse(c, "mouseMoved", p);
    await mouse(c, "mouseWheel", p, { deltaX: 0, deltaY: 100 });
    await sleep(400);
    assert.equal(await vscroll(c), 5);
    await mouse(c, "mouseWheel", p, { deltaX: 0, deltaY: 300 });
    await sleep(400);
    assert.equal(await vscroll(c), 20);
    await mouse(c, "mouseWheel", p, { deltaX: 0, deltaY: -300, modifiers: 2 });
    await sleep(400);
    assert.equal(await vscroll(c), 5);
    assert.equal(await c.evaluate(`${GRID}.properties.font`), "12px Tahoma, Geneva, sans-serif");
    // The current record stays where it was.
    assert.equal((await navigator(c)).record, "1");
    await cmd(c, "nav|1");
  });

  test("refresh asks onGetInfo again; a new column count is SCHEMA_CHANGED; the old count recovers", async () => {
    let mark = await consoleMark(c);
    await setReplies(c, { info: INFO() });
    assert.equal(await cmd(c, "refresh"), "String OK");
    await sleep(1000);
    assert.equal(await state(c), "ready");
    assert.deepEqual(await probeLines(c, mark), [
      "cmd refresh -> String OK",
      "info asked, argsIpcCached True",
      "info resolved",
      "rows 0-128",
      "rows 128-256",
    ]);
    mark = await consoleMark(c);
    await setReplies(c, { info: INFO(4) });
    assert.equal(await cmd(c, "refresh"), "String OK");
    await sleep(1000);
    assert.equal(await state(c), "error");
    assert.equal(
      await lastError(c),
      "SCHEMA_CHANGED: provider column count changed from 3 to 4; recreate the datasheet with loadData() in a new designer",
    );
    assert.equal(await cmd(c, "load"), "String READY");
    mark = await consoleMark(c);
    await setReplies(c, { info: INFO(3, 50) });
    assert.equal(await cmd(c, "refresh"), "String OK");
    await sleep(1000);
    assert.equal(await state(c), "ready");
    assert.equal(await lastError(c), "");
    assert.deepEqual((await probeLines(c, mark)).slice(3), ["rows 0-50"]);
    assert.equal((await navigator(c)).text, "of 50 records");
    await setReplies(c, { info: INFO() });
    await cmd(c, "refresh");
    await sleep(1000);
  });

  test("a reply with a row too few: the page is asked again after 750, 1500, 3000 and 6000 ms, then no more until refresh", async (t) => {
    await setReplies(c, { rows: "(short)" });
    await rowsAsked(c);
    assert.equal(await cmd(c, "refresh"), "String OK");
    await sleep(13000);
    const asked = await rowsAsked(c);
    const t0 = asked[0].t;
    const page0 = asked.filter((a) => a.start === 0).map((a) => Math.round(a.t - t0));
    t.diagnostic(
      `page 0 asked at ${JSON.stringify(page0)} ms; page 128 ${asked.filter((a) => a.start === 128).length} time(s)`,
    );
    assert.equal(page0.length, 5);
    const gaps = page0.slice(1).map((v, i) => v - page0[i]);
    for (const [i, want] of [750, 1500, 3000, 6000].entries())
      assert.ok(gaps[i] >= want && gaps[i] < want + 200, `gaps ${JSON.stringify(gaps)}`);
    // Row failures leave the state and the last error alone.
    assert.equal(await state(c), "ready");
    assert.equal(await lastError(c), "");
    await setReplies(c, { rows: "" });
    await sleep(1500);
    assert.deepEqual(await rowsAsked(c), []);
    assert.equal(await cmd(c, "refresh"), "String OK");
    await sleep(1000);
    assert.deepEqual(
      (await rowsAsked(c)).map((a) => a.start),
      [0, 128],
    );
    assert.equal((await painted(c))["0"]?.["3"]?.tick, true);
  });

  test("onGetRows returning without Resolve fails the page at once, and it is asked again after 750 ms", async (t) => {
    await setReplies(c, { rows: "(none)" });
    await rowsAsked(c);
    assert.equal(await cmd(c, "refresh"), "String OK");
    await sleep(1500);
    const asked = await rowsAsked(c);
    const page0 = asked.filter((a) => a.start === 0).map((a) => Math.round(a.t - asked[0].t));
    t.diagnostic(`page 0 asked at ${JSON.stringify(page0)} ms`);
    assert.equal(page0.length, 2);
    assert.ok(page0[1] >= 750 && page0[1] < 950);
  });

  test("onGetRows resolved from a timer after the handler returned fills the rows", async (t) => {
    await setReplies(c, { rows: "(timer)" });
    const mark = await consoleMark(c);
    assert.equal(await cmd(c, "refresh"), "String OK");
    await sleep(2500);
    t.diagnostic(`lines: ${JSON.stringify(await probeLines(c, mark))}`);
    assert.equal(await state(c), "ready");
    assert.equal((await painted(c))["0"]?.["3"]?.tick, true);
  });

  test("nothing else threw in the page", () => {
    assert.deepEqual(exceptions, []);
  });
});
