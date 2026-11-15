// DebugConsole.PrintText against its ColorRGB argument: a BETA 1042 defect, an entry of
// BUGS-TO-REPORT.md (printtext-colorrgb-ignored). The tbIDE package declares the argument as the
// text's colour, an RGB Long, but every line PrintText prints reaches the IDE's page as one of
// the IDE's own yellow message lines (the class debugConsoleOutputTextYELLOW, which event_output
// in ide/main.js gives the output the compiler marks &HFE0000), whatever the argument: an RGB
// colour, 0, or one of the codes the page reads from the compiler's own output (&HFF0000 alert,
// &HFC0000 green, &HEAEAEA text read as HTML, &HFD0000 a native exception, which turns TRACE-MODE
// on). So the colour a page of the documentation shows is never drawn.
//
// The ConsoleColourProbe add-in (probes/consolecolour) prints a line for each value when its
// toolbar buttons are clicked; the scenario reads the HTML the console keeps for each line
// (debugConsoleContent.dataNodes) and the colour its class gives. The tests named in the
// reproducer's repro.json assert the defect, so they pass while it is there. Each test states
// what BETA 1042 does.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "consolecolour");
const PREFIX = "[ConsoleColour] ";
// the lines the Colours button prints, by name, after "none" (printed with no argument)
const VALUES = ["zero", "orange", "red", "green", "blue", "FE0000", "FC0000", "EAEAEA"];

const probeLines = (c, mark) => linesSince(c, mark, { prefix: PREFIX });
async function waitLine(c, mark, line, timeout = 15 * 1000) {
  const ok = await waitFor(c, async (c) => (await probeLines(c, mark)).some((l) => l.startsWith(line)), {
    timeout,
  });
  assert.ok(ok, `the add-in did not print "${line}": ${JSON.stringify(await probeLines(c, mark))}`);
}

// Each of the probe's lines the console holds, by its name (the text after the prefix, up to the
// first space): the class of the span that holds it, the colour that class gives in the console,
// and whether its text was read as HTML (a <b> element where the text had "<b>").
const probeRows = (c) =>
  c.evaluate(`(() => {
    const outer = document.querySelector(".debugConsoleOuter");
    const rows = {};
    for (const n of debugConsoleContent.dataNodes) {
      const html = typeof n === "string" ? n : (n && (n.html ?? n.data ?? n.text)) ?? "";
      const box = document.createElement("div");
      box.innerHTML = html;
      const text = box.textContent;
      const at = text.indexOf(${JSON.stringify(PREFIX)});
      if (at < 0) continue;
      const name = text.slice(at + ${PREFIX.length}).split(" ")[0];
      const span = box.firstElementChild;
      const probe = document.createElement("span");
      probe.className = span ? span.className : "";
      outer.appendChild(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      rows[name] = { cls: span ? span.className : null, colour, html: !!box.querySelector("b") };
    }
    return rows;
  })()`);

scenario("DebugConsole.PrintText and its ColorRGB argument", (lane) => {
  let c;
  let rows;
  before(async () => {
    await lane.addAddin(PROBE);
    c = await lane.open(HOST);
    await waitLine(c, null, "loaded", 30 * 1000);
    const mark = await consoleMark(c);
    await click(c, "addinButton-ConsoleColourColours");
    await waitLine(c, mark, "done");
    rows = await probeRows(c);
  });

  test("a line PrintText prints with no colour is one of the IDE's yellow message lines", () => {
    assert.equal(rows.none?.cls, "debugConsoleOutputTextYELLOW", JSON.stringify(rows));
    assert.equal(rows.none.html, false);
  });

  test("a line printed with an RGB colour, with 0 or with one of the IDE's own codes is drawn as one with no colour", () => {
    for (const name of VALUES) assert.deepEqual(rows[name], rows.none, `the ${name} line: ${JSON.stringify(rows)}`);
  });

  test("a line printed with &HFD0000, the IDE's code for a native exception, is drawn as one with no colour and turns no TRACE-MODE on", async (t) => {
    const was = await c.evaluate("g_TraceMode");
    const mark = await consoleMark(c);
    await click(c, "addinButton-ConsoleColourException");
    await waitLine(c, mark, "FD0000");
    const after = await probeRows(c);
    const trace = await c.evaluate("g_TraceMode");
    t.diagnostic(JSON.stringify({ row: after.FD0000, was, trace }));
    assert.equal(was, false, "TRACE-MODE was on before the line");
    assert.deepEqual(after.FD0000, rows.none);
    assert.equal(trace, false);
  });
});
