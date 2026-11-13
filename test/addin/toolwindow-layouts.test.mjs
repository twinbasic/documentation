// An add-in's tool window against the IDE's panel layouts: two BETA 1042 defects of
// setActivePanelLayoutName in ide/main.js, each an entry of BUGS-TO-REPORT.md, and their
// controls. The LayoutsProbe add-in (probes/layouts) adds one tool window, id
// LayoutsProbePane, hidden, with a suggested size of 500 by 600; two toolbar buttons show and
// hide it, and its OnClose prints "closed" and makes the window again, hidden. The scenario
// applies layouts in the page, as Window > Panel Layouts does, and reads toolWindowsById.
//
// - toolwindow-show-suggested-size: showing a floating window again (Visible = True) gives it
//   the add-in's suggested size whenever floatingToolWindowsData has no place for it
//   (addInEvents.toolWindowSetVisible), and nothing BETA 1042 runs writes a place there: not
//   restoreFloatingConfig, which floats the window at a layout's place, nor the floating
//   panel's resize bars. So the size a layout or a resize by hand gave the window is lost.
//   The control writes the place there, as the help add-in does.
// - layout-loses-addin-toolwindow: applying a layout while the window floats shown, or is
//   docked, takes the window out of the page before closeAllAddinToolwindows closes it; the
//   close then throws inside addInEvents.toolWindowClose, which swallows the error, so the
//   window stays in toolWindowsById, out of the page, and the add-in never hears OnClose.
//   The control is a hidden floating window, which is closed and made again.
//
// The tests named in the two reproducers' repro.json assert the defects, so they pass while
// the defects are there. Each test states what BETA 1042 does. The help add-in works round
// both in add-in/Resources/SCRIPTS/layouts.js (keepFloatingPlaces, closeAddinWindows); when a
// build fixes one, update its entry, this file and that workaround.
//
// The cases that lose the window come last, the docked one in an IDE of its own: a floating
// window lost this way stays lost while the IDE runs, through a compiler restart too.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "layouts");
const ID = "LayoutsProbePane";
// The size the add-in suggests, and the place the layout floats the window at: another size.
const SUGGESTED = { width: 500, height: 600 };
const FLOATED = { left: 100, top: 80, width: 320, height: 240 };
// How long the add-in is given to answer a close it was sent: it answers within a second.
const SETTLE = 2500;

// What the probe printed since a mark, without its prefix.
const probeLines = (c, mark) => linesSince(c, mark, { prefix: "[LayoutsProbe] " });
async function waitLine(c, mark, line, timeout = 15 * 1000) {
  const ok = await waitFor(c, async (c) => (await probeLines(c, mark)).includes(line), { timeout });
  assert.ok(ok, `the add-in did not print "${line}": ${JSON.stringify(await probeLines(c, mark))}`);
}

// The add-in's window as the page has it: its number, whether it is in the page, whether it
// floats, whether it shows, and the floating panel's size and place in CSS pixels.
const win = (c) =>
  c.evaluate(`(() => {
    const w = toolWindowsById[${JSON.stringify(ID)}];
    if (!w) return null;
    const p = w.closest(".floatingPanel");
    const r = (p || w).getBoundingClientRect();
    return {
      id: w.toolWindowId,
      inPage: w.isConnected,
      floating: !!p,
      shown: !!(r.width && r.height) && w.bodyElement.style.display !== "none",
      box: p ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } : null,
      place: floatingToolWindowsData[${JSON.stringify(ID)}] || null,
    };
  })()`);

// A custom layout: the default's docked panels, and the add-in's window floating or docked.
const addLayout = (c, name, { floating = [], dockWindow = false } = {}) =>
  c.evaluate(`(() => {
    const def = JSON.parse(builtInPanelLayouts["<DEFAULT>"].layoutData);
    const layout = ${dockWindow}
      ? { type: "vertical", variableSize: true, size: "0%", content: [
          Object.assign(def, { variableSize: true, size: "0%" }),
          { id: ${JSON.stringify(`ADDIN_${ID}`)}, variableSize: false, size: "25%" },
        ] }
      : def;
    customPanelLayouts[${JSON.stringify(name)}] = { layoutData: JSON.stringify(layout), floatingData: ${JSON.stringify(JSON.stringify(floating))} };
  })()`);
const applyLayout = (c, name) => c.evaluate(`setActivePanelLayoutName(${JSON.stringify(name)})`);

// Drags one of the window's floating panel's resize bars (toolWindowResizeRight, ...Bottom)
// with the mouse by dx, dy CSS pixels.
async function dragBar(c, bar, dx, dy) {
  const r = await c.evaluate(`(() => {
    const p = toolWindowsById[${JSON.stringify(ID)}].closest(".floatingPanel");
    const e = p && p.querySelector(":scope > .${bar}");
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  assert.ok(r, `the window's panel has no ${bar}`);
  const mouse = (type, x, y, buttons) =>
    c.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      buttons,
      clickCount: type === "mouseMoved" ? 0 : 1,
    });
  await mouse("mouseMoved", r.x, r.y, 0);
  await mouse("mousePressed", r.x, r.y, 1);
  for (let i = 1; i <= 5; i++) await mouse("mouseMoved", r.x + (dx * i) / 5, r.y + (dy * i) / 5, 1);
  await mouse("mouseReleased", r.x + dx, r.y + dy, 0);
  await sleep(150);
}

async function pressButton(c, which, line) {
  const mark = await consoleMark(c);
  await click(c, `addinButton-LayoutsProbe${which}`);
  await waitLine(c, mark, line);
}

scenario("an add-in's tool window and the IDE's panel layouts", (lane) => {
  let c;
  // Opens the host project in a new IDE, with the add-in loaded and its window made.
  async function openIde() {
    c = await lane.open(HOST);
    await waitLine(c, null, "loaded", 30 * 1000);
  }
  before(async () => {
    await lane.addAddin(PROBE);
    await openIde();
  });

  test("the add-in's window starts hidden, floating, in the page, with no place kept for it", async () => {
    const w = await win(c);
    assert.ok(w, "toolWindowsById has no window LayoutsProbePane");
    assert.equal(w.inPage, true);
    assert.equal(w.floating, true);
    assert.equal(w.shown, false);
    assert.equal(w.place, null);
  });

  // ---------------------------------------------------------- layout-float-suggested-size

  test("applying a layout that floats the hidden window closes it, and the window made again floats at the layout's place and size", async (t) => {
    await addLayout(c, "Probe floated", { floating: [{ id: `ADDIN_${ID}`, ...FLOATED }] });
    const mark = await consoleMark(c);
    await applyLayout(c, "Probe floated");
    await waitLine(c, mark, "made again");
    await sleep(500);
    const w = await win(c);
    t.diagnostic(JSON.stringify(w));
    assert.equal(w?.inPage, true);
    assert.equal(w.floating, true);
    assert.equal(w.shown, true, "the layout's window does not show");
    assert.deepEqual(w.box, FLOATED);
    assert.equal(w.place, null, "the layout's place was written to floatingToolWindowsData");
  });

  test("hidden and shown again, a window the layout floats takes the add-in's suggested size, not the layout's", async (t) => {
    await pressButton(c, "Hide", "hidden");
    await pressButton(c, "Show", "shown");
    const w = await win(c);
    t.diagnostic(JSON.stringify(w));
    assert.equal(w.shown, true);
    assert.deepEqual({ width: w.box.width, height: w.box.height }, SUGGESTED);
    assert.equal(w.place, null);
  });

  // saveFloatingToolWindowPosition, which writes the place, is called only from the
  // createToolWindow code that BETA 1042 never runs (if (0)); the floating panel's resize
  // bars call savePanelsConfiguration alone.
  test("a window resized by hand with the mouse takes the suggested size too when hidden and shown", async (t) => {
    await dragBar(c, "toolWindowResizeRight", -150, 0);
    await dragBar(c, "toolWindowResizeBottom", 0, -200);
    const resized = await win(c);
    await pressButton(c, "Hide", "hidden");
    await pressButton(c, "Show", "shown");
    const w = await win(c);
    t.diagnostic(JSON.stringify({ resized, shown: w }));
    // 500 by 600 less the drags, give or take the pixel the bar's middle rounds to.
    assert.ok(
      Math.abs(resized.box.width - 350) <= 2 && Math.abs(resized.box.height - 400) <= 2,
      `the drags left ${resized.box.width} by ${resized.box.height}`,
    );
    assert.equal(resized.place, null, "the resize wrote a place");
    assert.deepEqual({ width: w.box.width, height: w.box.height }, SUGGESTED);
  });

  // The control: a place in floatingToolWindowsData, as an older IDE's saved settings bring
  // (panelLayout.floatingToolWindows), and as the help add-in's layouts.js writes.
  test("control: with a place in floatingToolWindowsData, the window keeps its size when hidden and shown", async (t) => {
    await c.evaluate(`(() => {
      const p = toolWindowsById[${JSON.stringify(ID)}].closest(".floatingPanel");
      const f = ${JSON.stringify(FLOATED)};
      for (const k of ["left", "top", "width", "height"]) p.style[k] = f[k] + "px";
      floatingToolWindowsData[${JSON.stringify(ID)}] = f;
    })()`);
    await pressButton(c, "Hide", "hidden");
    await pressButton(c, "Show", "shown");
    const w = await win(c);
    t.diagnostic(JSON.stringify(w));
    assert.equal(w.shown, true);
    assert.deepEqual(w.box, FLOATED);
  });

  // ---------------------------------------------------------- layout-loses-shown-toolwindow

  test("control: applying a layout while the window floats hidden closes it: the add-in hears OnClose and makes it again, in the page", async (t) => {
    await pressButton(c, "Hide", "hidden");
    const before = await win(c);
    const mark = await consoleMark(c);
    await applyLayout(c, "<DEFAULT>");
    await waitLine(c, mark, "made again");
    const w = await win(c);
    t.diagnostic(JSON.stringify({ before, after: w }));
    assert.notEqual(w.id, before.id, "the window was not made again");
    assert.equal(w.inPage, true);
  });

  test("applying a layout while the window floats shown takes it out of the page, keeps it in toolWindowsById, and the add-in hears no OnClose", async (t) => {
    await pressButton(c, "Show", "shown");
    const before = await win(c);
    assert.equal(before.floating, true);
    assert.equal(before.shown, true);
    const mark = await consoleMark(c);
    await applyLayout(c, "<DEFAULT>");
    await sleep(SETTLE);
    const w = await win(c);
    const lines = await probeLines(c, mark);
    t.diagnostic(JSON.stringify({ before, after: w, lines }));
    assert.ok(w, "toolWindowsById no longer has the window");
    assert.equal(w.id, before.id, "the window was made again");
    assert.equal(w.inPage, false, "the window is still in the page");
    assert.deepEqual(lines, [], "the add-in heard of the close");
  });

  test("the lost window stays out of the page when the add-in shows it again", async (t) => {
    const mark = await consoleMark(c);
    await click(c, "addinButton-LayoutsProbeShow");
    await waitFor(c, async (c) => (await probeLines(c, mark)).length > 0);
    const w = await win(c);
    t.diagnostic(JSON.stringify({ after: w, lines: await probeLines(c, mark) }));
    assert.equal(w?.inPage, false);
  });

  // The add-in made again by the restart adds its window under the same id, and
  // createToolWindowById hands it the lost one.
  test("neither a layout that floats the lost window nor a compiler restart puts it back in the page", async (t) => {
    const lost = await win(c);
    let mark = await consoleMark(c);
    await applyLayout(c, "Probe floated");
    await sleep(SETTLE);
    const floated = await win(c);
    const lines = await probeLines(c, mark);
    mark = await consoleMark(c);
    await lane.restartCompiler();
    await waitLine(c, mark, "loaded", 30 * 1000);
    await pressButton(c, "Show", "shown");
    const restarted = await win(c);
    t.diagnostic(JSON.stringify({ floated, lines, restarted }));
    assert.equal(floated.id, lost.id);
    assert.equal(floated.inPage, false, "the layout put the window back");
    assert.deepEqual(lines, [], "the add-in heard of a close");
    assert.equal(restarted.id, lost.id);
    assert.equal(restarted.inPage, false, "the restart put the window back");
  });

  test("applying a layout while the window is docked takes it out of the page, keeps it in toolWindowsById, and the add-in hears no OnClose", async (t) => {
    await lane.closeProject();
    await openIde();
    await addLayout(c, "Probe docked", { dockWindow: true });
    let mark = await consoleMark(c);
    await applyLayout(c, "Probe docked");
    await waitLine(c, mark, "made again");
    await sleep(500);
    const before = await win(c);
    assert.equal(before?.inPage, true);
    assert.equal(before.floating, false, "the layout did not dock the window");
    assert.equal(before.shown, true, "the docked window does not show");
    mark = await consoleMark(c);
    await applyLayout(c, "<DEFAULT>");
    await sleep(SETTLE);
    const w = await win(c);
    const lines = await probeLines(c, mark);
    t.diagnostic(JSON.stringify({ before, after: w, lines }));
    assert.ok(w, "toolWindowsById no longer has the window");
    assert.equal(w.id, before.id, "the window was made again");
    assert.equal(w.inPage, false, "the window is still in the page");
    assert.deepEqual(lines, [], "the add-in heard of the close");
  });

  test("a layout that docks the lost window puts the same window back in the page, hidden, still with no OnClose, and Visible True shows it", async (t) => {
    const lost = await win(c);
    const mark = await consoleMark(c);
    await applyLayout(c, "Probe docked");
    await sleep(SETTLE);
    const docked = await win(c);
    const lines = await probeLines(c, mark);
    await pressButton(c, "Show", "shown");
    const shown = await win(c);
    t.diagnostic(JSON.stringify({ docked, lines, shown }));
    assert.equal(docked.id, lost.id);
    assert.equal(docked.inPage, true);
    assert.equal(docked.shown, false);
    assert.deepEqual(lines, [], "the add-in heard of a close");
    assert.equal(shown.shown, true);
  });
});
