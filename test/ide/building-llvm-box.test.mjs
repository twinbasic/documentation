// The Compiling... box of an LLVM build, with a second box open while it shows:
// the defect queued in BUGS-TO-REPORT.md from the trials for the Building pages
// (their fact sheet's B7), "A box opened during an LLVM build is closed in place
// of the Compiling... box, which stays and blocks the IDE". A lane of its own,
// since the defect leaves the IDE blocked: test/ide/probes/building-exe with
// +llvm in Compiler Options (BUILD). LLVM needs a licence that allows it; the
// lane's IDE reads the user's.
//
// A person cannot open a box during the build, since the Compiling... box covers
// the IDE, so the test opens one from the page, with the IDE's own
// showModalNotification, at the build's first progress event.
//
// Each test states what BETA 1010 does. If one fails after an IDE update, the
// IDE has changed: update the matching entry in BUGS-TO-REPORT.md or
// bugs/filed/, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { holdLlvmCache } from "../../scripts/lib/tb-llvm-cache.mjs";
import { scenario } from "../addin/scenario.mjs";
import { boxes, guard, J, pageErrors, press, sleep, variant } from "./building-kit.mjs";

// Each build progress event, as [percent, the titles of the boxes showing just
// before the IDE handles it]; when window.__secondBox is set, the IDE's own
// showModalNotification opens a box at the first event that is not the end (-1).
const HOOK_JS = `(() => {
  if (window.__progressHooked) return;
  window.__progressHooked = true;
  window.__progress = [];
  window.__secondBox = false;
  const proto = Object.getPrototypeOf(debugSocket);
  const real = proto.event_setBuildProgress;
  proto.event_setBuildProgress = function (e) {
    const p = e.body.percent10 / 10;
    window.__progress.push([p, [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => (m.querySelector(".modalTitleBar")?.innerText || "").trim())]);
    const r = real.call(this, e);
    if (p !== -1 && window.__secondBox) { window.__secondBox = false; showModalNotification("A second box"); }
    return r;
  };
})()`;

scenario("Building: a box during an LLVM build", (lane) => {
  let c, lease;

  // A lease on the LLVM cache server first, so that the server is never one
  // this IDE's compiler starts in its own job, which would end with it and take
  // the cache from every other run on the machine (tb-llvm-cache.mjs).
  before(async () => {
    lease = await holdLlvmCache(lane.ide);
    const src = variant("building-exe", path.join(lane.work, "src-llvm"), {
      "compiler.buildOptions": "+llvm",
      "project.versionAutoIncrement": undefined,
    });
    c = await lane.open(src, { folder: path.join(lane.work, "llvm") });
    await guard(c);
    await c.evaluate(HOOK_JS);
  });

  const state = () =>
    c.evaluate(
      `({ progress: window.__progress.splice(0), lock: lockUICount, modals: [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => (m.querySelector(".modalTitleBar")?.innerText || "").trim()) })`,
    );

  test("a box opened during an LLVM build is closed at its end in place of the Compiling... box, which stays with no button and blocks the IDE", {
    timeout: 120 * 1000,
  }, async () => {
    await c.evaluate("window.__secondBox = true");
    const r = await press(c, "build");
    assert.ok(
      r.lines.some((l) => l.startsWith("[LINKER] SUCCESS created output file")),
      J(r.lines),
    );
    await sleep(3000);
    const s = await state();
    assert.equal(s.progress.at(-1)[0], -1, J(s.progress));
    assert.deepEqual(s.modals, ["Compiling..."], J(s));
    assert.deepEqual(await boxes(c), ["[Compiling...] Compiling... 0.0% {}"]);
    assert.equal(s.lock, 1);
    // What is left closed from the page, so that the lane closes cleanly.
    for (let i = 0; i < 3 && (await c.evaluate("modalDialogs.length")) > 0; i++) await c.evaluate("hideModalDialog()");
    await sleep(500);
    assert.deepEqual(await c.evaluate("[modalDialogs.length, lockUICount]"), [0, 0]);
    assert.deepEqual(await pageErrors(c), []);
  });

  test("control: an LLVM build shows the Compiling... box and closes it at its end", {
    timeout: 120 * 1000,
  }, async () => {
    const r = await press(c, "build");
    assert.ok(
      r.lines.some((l) => l.startsWith("[LINKER] SUCCESS created output file")),
      J(r.lines),
    );
    await sleep(1500);
    const s = await state();
    assert.ok(
      s.progress.some(([p, m]) => p === -1 && m.includes("Compiling...")),
      J(s.progress),
    );
    assert.equal(s.progress.at(-1)[0], -1);
    assert.deepEqual(s.modals, []);
    assert.equal(s.lock, 0);
  });

  // Released once the lane's IDE has ended.
  return () => lease?.release();
});
