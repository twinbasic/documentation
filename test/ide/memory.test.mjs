// The MEMORY 1 pane, tested against four entries in BUGS-TO-REPORT.md:
//
//   "In the Memory pane, the name of a Double, Boolean or user-defined type variable throws an
//   uncaught BigInt error, and the box is not marked invalid" (bugs/memory-bigint-throw)
//   "In a 64-bit program, the Memory pane's Address column drops the high 32 bits"
//   (bugs/memory-address-64bit)
//   "The Memory pane shows memory it cannot read as still loading, with ?? in every cell"
//   (bugs/memory-unreadable-loading)
//   "A negative number in the Memory pane's box gives rows whose addresses jump"
//   (bugs/memory-negative-address)
//
// The project in probes/memory prints the address of n and stops at a Stop statement, with
// variables of several types in scope. The pane is opened from the View menu, and each
// expression is typed into its box with Enter, as a person does. The last test switches the
// project to win64 (lane.setBuildTarget; the IDE does not save the target, IDE_FLAGS) and runs
// it again.
//
// THE IDE IS STARTED WITH --no-save-ide-settings and --no-update-recent-files (IDE_FLAGS in
// scripts/lib/tb-ide.mjs), so it writes no panel layout to the user's own registry (HKCU\Software\VB
// and VBA Program Settings\twinBASIC_IDE\IDESettings), though opening the pane changes the layout.
// The flags do not guard the Window key or the removals from the recent list. So, as soon as the
// project is open, the page's hostAppObject is replaced by a proxy whose ChangeWindowSetting and
// RemoveRecentsList calls do nothing, as code-editor.test.mjs does. Nothing here reaches
// SaveSetting, so lanes.mjs names no settings for this lane.
//
// The tests share the lane's IDE in order. Each test states what BETA 1007 does; the tests named
// "control" pass whether or not the defects are fixed. If another fails after an IDE update, the
// IDE has changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the
// callout on docs/IDE/Memory.md that names it, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { clickAt, pressKey, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "memory");

// Blocks every call the flags do not guard that writes the user's registry (see the top of this file).
const GUARD_JS = `(() => {
  if (window.__guarded) return;
  window.__guarded = true;
  const blocked = new Set(["ChangeWindowSetting", "RemoveRecentsList"]);
  hostAppObject = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      return Reflect.get(target, key);
    },
  });
})()`;

const STATE_JS = `({ paused: !!context.atBreakpoint.value, running: !!context.codeExecuting.value })`;

// What the pane shows: the box and its classes, and the first rows, each cell's text with its
// state (loading, the placeholder of a cell still being read; invalidMem, unreadable memory).
const PANE_JS = (rows) => `(() => {
  const h = hexEditorPanel.outerDiv.querySelector(".hexedr");
  const box = h.querySelector(".addr-input");
  const trs = [...h.querySelectorAll("tbody tr")].slice(0, ${rows});
  const focused = document.activeElement && document.activeElement.closest ? document.activeElement.closest("td") : null;
  return {
    box: box.value,
    invalid: box.classList.contains("invalidExpression"),
    focusedAddr: focused && focused.dataset.addr ? BigInt(focused.dataset.addr).toString(16).toUpperCase() : null,
    rows: trs.map((tr) => ({
      addr: tr.querySelector("th.addr").textContent,
      cells: [...tr.querySelectorAll("td.cell")].map((td) => td.textContent),
      loading: tr.querySelectorAll("td.cell.loading").length,
      invalidMem: tr.querySelectorAll("td.cell.invalidMem").length,
    })),
  };
})()`;

scenario("the MEMORY 1 pane", (lane) => {
  let c;
  let mark;
  let address; // VarPtr(n), as the program printed it, in hexadecimal
  const pane = (rows = 2) => c.evaluate(PANE_JS(rows));
  const state = () => c.evaluate(STATE_JS);

  // F5 to the Stop, and the address the program printed before it.
  async function toStop() {
    mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    assert.ok(
      await waitFor(c, async () => (await state()).paused, { timeout: 60 * 1000 }),
      "the run did not stop at the Stop statement",
    );
    const line = await waitFor(c, async () => (await linesSince(c, mark)).find((l) => l.includes("VarPtr(n)=")));
    assert.ok(line, "the program did not print VarPtr(n)");
    address = line.slice(line.indexOf("=") + 1).trim();
    assert.match(address, /^[0-9A-F]+$/);
  }

  async function endRun() {
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.ok(await waitFor(c, async () => !(await state()).running, { timeout: 30 * 1000 }), "the run did not end");
  }

  // Types an expression into the pane's box and presses Enter.
  async function enter(text) {
    await c.evaluate(
      `(() => { const i = hexEditorPanel.outerDiv.querySelector(".addr-input"); i.focus(); i.select(); })()`,
    );
    await typeText(c, text);
    await pressKey(c, "Enter");
    await sleep(1500);
  }

  // The pane is showing VarPtr(n): its first row at the address, n's bytes in its first cells.
  const showsN = async () => {
    const p = await pane(1);
    return p.rows[0]?.addr === `&H${address.padStart(8, "0")}` &&
      p.rows[0].cells.slice(0, 4).join(" ") === "D2 04 00 00"
      ? p
      : null;
  };

  before(async () => {
    c = await lane.open(PROJECT);
    await c.evaluate(GUARD_JS);
    // View > MEMORY 1
    const view = await c.evaluate(
      `(() => { const q = rootMenuView.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`,
    );
    await clickAt(c, view.x, view.y);
    await sleep(500);
    const item = await c.evaluate(`(() => {
      const it = [...document.querySelectorAll("#contextMenu > *")].find((e) => e.innerText.replace(/\\s+/g, " ").trim().startsWith("MEMORY 1") && e.getBoundingClientRect().width);
      if (!it) return null;
      const q = it.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(item, "the View menu has no item MEMORY 1");
    await clickAt(c, item.x, item.y);
    assert.ok(
      await waitFor(c, () => c.evaluate(`!!hexEditorPanel.outerDiv.querySelector(".hexedr .addr-input")`)),
      "the MEMORY 1 pane did not open",
    );
    await toStop();
  });

  test("control: VarPtr(n) shows n's bytes at the address the program printed", async (t) => {
    await enter("VarPtr(n)");
    const p = await waitFor(c, showsN, { timeout: 5000 });
    t.diagnostic(`VarPtr(n) = ${address}; the pane: ${JSON.stringify(await pane(1))}`);
    assert.ok(p, "the pane does not show n's bytes at VarPtr(n)");
    assert.equal(p.invalid, false);
  });

  test("control: a name the debugger cannot evaluate turns the box red and leaves the rows", async () => {
    await enter("unknownName");
    const p = await pane(1);
    assert.equal(p.invalid, true, "the box is not red");
    assert.ok(await showsN(), "the rows changed");
  });

  for (const [name, value] of [
    ["d", "1.5"],
    ["flag", "True"],
    ["udt", "{user defined type, 8 bytes}"],
  ]) {
    test(`the name ${name} throws "Cannot convert ${value} to a BigInt", and leaves the box unmarked and the rows as they were`, async (t) => {
      const before = (await linesSince(c, mark)).length;
      await enter(name);
      const error = `IDE internal error: Uncaught SyntaxError: Cannot convert ${value} to a BigInt`;
      const printed = await waitFor(c, async () =>
        (await linesSince(c, mark)).slice(before).find((l) => l.includes(error)),
      );
      t.diagnostic(`DEBUG CONSOLE: ${JSON.stringify(printed)}`);
      assert.ok(printed, `the DEBUG CONSOLE did not print ${error}`);
      const p = await pane(1);
      assert.equal(p.box, name);
      assert.equal(p.invalid, false, "the box is red");
      assert.ok(await showsN(), "the rows changed");
    });
  }

  test("0 shows ?? in every value cell, as cells still being read, and never as unreadable memory", async (t) => {
    await enter("0");
    await sleep(5000);
    const p = await pane(3);
    t.diagnostic(JSON.stringify(p.rows.map((r) => `${r.addr} ${r.cells.join(" ")}`)));
    assert.equal(p.rows[0].addr, "&H00000000");
    for (const r of p.rows) {
      assert.deepEqual(r.cells, Array(16).fill("??"), `row ${r.addr}`);
      assert.equal(r.loading, 16, `row ${r.addr} has cells not marked loading`);
      assert.equal(r.invalidMem, 0, `row ${r.addr} has cells marked unreadable`);
    }
  });

  test("neg, which is -8, gives a first row at &HFFFFFFF8 and a second at &H00000008", async (t) => {
    await enter("neg");
    const p = await pane(3);
    t.diagnostic(JSON.stringify(p.rows.map((r) => r.addr)));
    assert.deepEqual(
      p.rows.map((r) => r.addr),
      ["&HFFFFFFF8", "&H00000008", "&H00000018"],
    );
  });

  test("in a 64-bit run, VarPtr(n) shows n's bytes, and the Address column only the low 32 bits of its address", async (t) => {
    await endRun();
    await lane.setBuildTarget("win64");
    await toStop();
    t.diagnostic(`VarPtr(n) = ${address}`);
    assert.ok(BigInt(`0x${address}`) > 0xffffffffn, `VarPtr(n) is below 4 GB in this run: ${address}`);
    await enter("VarPtr(n)");
    const p = await pane(1);
    t.diagnostic(JSON.stringify(p));
    assert.deepEqual(p.rows[0].cells.slice(0, 4), ["D2", "04", "00", "00"], "the pane does not show n's bytes");
    assert.equal(p.focusedAddr, address, "the cell with the focus is not at VarPtr(n)");
    assert.equal(p.rows[0].addr, `&H${address.slice(-8)}`);
    await endRun();
  });
});
