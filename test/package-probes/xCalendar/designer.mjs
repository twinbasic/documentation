// Opens the xCalendar probe's project in an IDE on a private desktop, edits the control's
// properties in the form designer's Properties panel as a person does, saves, and prints what the
// IDE wrote for the control into Form1.tbform.
//
//   node test/package-probes/xCalendar/designer.mjs [--port N] [--edit Name=text ...] [--out FILE]
//
// Why: the control keeps its design-time values in a property bag (its ReadProperties and
// WriteProperties), and what the IDE stores in the form's designer file for it cannot be written by
// hand: keys named after the properties in the control's entry are ignored when the exe starts
// (probe.mjs --set). This script gets the IDE to write the entry. The file it saves can be built
// into the probe with `probe.mjs --form FILE`, and scenario 1 then says what the control reads at
// run time.
//
// The IDE is the newest twinBASIC_IDE_BETA_<n> on the Desktop, in a lane's own copy of the install
// with the lane's own APPDATA (scripts/lib/tb-lane.mjs), on a private desktop.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../../../lib/cli.mjs";
import { sleep } from "../../../scripts/lib/tb-ide.mjs";
import { findIde } from "../../../scripts/lib/tb-install.mjs";
import { Lane } from "../../../scripts/lib/tb-lane.mjs";
import { openFile, pressKey, typeText, waitFor } from "../../../scripts/lib/tb-operate.mjs";
import { wrapProbe } from "../../../scripts/lib/tb-probe.mjs";
import { unpackProject } from "../../../scripts/lib/tb-project.mjs";
import { stageTree } from "./stage.mjs";

const USAGE = `usage: node test/package-probes/xCalendar/designer.mjs [--port N] [--edit Name=text ...] [--out FILE] [-h, --help]

Opens the probe's project in an IDE, selects xCalendar1 in Form1's designer, types each --edit
value into the Properties panel's cell for that property (Name=text), saves the project and prints
the control's entry in the Form1.tbform the IDE wrote.

  --port N       the IDE's DevTools port (default 9915; ports 9910 to 9940 are this probe's)
  --edit N=T     a property and the text to type in its cell; repeatable
  --out FILE     also write the saved Form1.tbform to FILE
  -h, --help     print this text and exit

Exit codes:
  0  the form was edited and saved
  1  the designer, the control or a property cell was not found
  2  the command line was refused, or the IDE could not be run`;

exitOnCrash();
const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        port: { type: "string", default: "9915" },
        edit: { type: "string", multiple: true },
        out: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      positionals: 0,
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);
const port = withUsageError(
  () => numberOption(values.port, { option: "--port", integer: true, min: 1024, max: 65535 }),
  usageError,
);

const ide = findIde();
if (!ide) {
  console.error("designer: no twinBASIC_IDE_BETA_<n> on the Desktop (TB_IDE names one)");
  process.exit(2);
}
const work = path.join(tmpdir(), "xcal-designer", String(port));
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const tree = await stageTree({ key: `d${port}` });
// tbrun adds the TbRun module the probe writes with; an IDE opening the tree needs it too.
{
  const probe = path.join(tree, "Sources", "Probe.twin");
  const wrapped = wrapProbe([{ name: "Probe.twin", text: readFileSync(probe, "utf8") }]);
  for (const f of wrapped.files) writeFileSync(path.join(tree, "Sources", f.name), f.text, "utf8");
}
const lane = new Lane({ name: "xcal-designer", port, work, ide });

const GLOBALS = "getCurrentFormEditorGlobals()";
let code = 0;
try {
  const c = await lane.open(tree);
  await openFile(c, "/DocSamples/Sources/Form1.tbform");
  const shown = await waitFor(
    c,
    () =>
      c.evaluate(
        `(() => { const g = ${GLOBALS}; return !!g && g.gotInitialFormData === true && g.resyncOverlay.style.visibility !== "visible"; })()`,
      ),
    { timeout: 30000, interval: 200 },
  );
  if (!shown) throw new Error("the designer never showed its form");
  await sleep(1500);

  // Select the control with a click on its centre.
  const at = await c.evaluate(`(() => {
    const g = ${GLOBALS};
    const d = g.designer.getBoundingClientRect();
    const p = g.allControls.find((x) => x.properties.Name === "xCalendar1")?.properties;
    if (!p) return null;
    return { x: d.x + p.Left + p.Width / 2, y: d.y + p.Top + p.Height / 2 };
  })()`);
  if (!at) throw new Error("the designer does not hold xCalendar1");
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
    await c.send("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", clickCount: 1 });
  }
  await sleep(1000);
  const selected = await c.evaluate(`(${GLOBALS}.selectedControls || []).map((x) => x.properties.Name).sort()`);
  console.log(`selected: ${JSON.stringify(selected)}`);

  const names = () => c.evaluate(`[...document.querySelectorAll(".propertyName")].map((e) => e.textContent.trim())`);
  if ((await names()).length === 0) {
    await c.evaluate(`executeIdeCommand("tbPanels_SetActiveLayoutDefault")`);
    await sleep(1500);
  }
  console.log(`properties panel rows: ${JSON.stringify(await names())}`);

  for (const edit of values.edit ?? []) {
    const i = edit.indexOf("=");
    const name = edit.slice(0, i);
    const text = edit.slice(i + 1);
    const cell = await c.evaluate(`(() => {
      const n = [...document.querySelectorAll(".propertyName")].find((e) => e.textContent.trim() === ${JSON.stringify(name)});
      if (!n) return null;
      n.scrollIntoView({ block: "center" });
      const r = n.nextElementSibling.getBoundingClientRect();
      return { x: r.x + 20, y: r.y + r.height / 2 };
    })()`);
    if (!cell) {
      console.log(`designer: the Properties panel has no ${name}`);
      code = 1;
      continue;
    }
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await c.send("Input.dispatchMouseEvent", { type, x: cell.x, y: cell.y, button: "left", clickCount: 1 });
    }
    await sleep(400);
    await pressKey(c, "End");
    for (let k = 0; k < 12; k++) await pressKey(c, "Backspace");
    await typeText(c, text);
    await pressKey(c, "Enter");
    await sleep(1200);
    const after = await c.evaluate(`(() => {
      const n = [...document.querySelectorAll(".propertyName")].find((e) => e.textContent.trim() === ${JSON.stringify(name)});
      const v = n?.nextElementSibling;
      return v ? (v.querySelector("input,select,textarea")?.value ?? v.textContent.trim()) : null;
    })()`);
    console.log(
      `typed ${JSON.stringify(text)} into ${name}; the cell now reads ${JSON.stringify(after)}; dialogs: ${JSON.stringify(c.dialogs)}`,
    );
  }

  await c.evaluate(`executeIdeCommand("tbProject_SaveAllChanges")`);
  await sleep(2500);
} catch (e) {
  console.error(`designer: ${e.message}`);
  code = code || 1;
} finally {
  await lane.closeProject().catch((e) => console.error(`designer: ${e.message}`));
}

// What the IDE wrote.
try {
  const out = path.join(work, "saved");
  unpackProject(lane.project, out);
  const text = readFileSync(path.join(out, "Sources", "Form1.tbform"), "utf8");
  const control = JSON.parse(text)[0]._children.find((c) => c.Name === "xCalendar1");
  console.log("the control's entry in Form1.tbform:");
  console.log(JSON.stringify(control, null, "\t"));
  if (values.out) writeFileSync(values.out, text, "utf8");
} catch (e) {
  console.error(`designer: cannot read what the IDE saved: ${e.message}`);
  code = code || 1;
}
process.exitCode = code;
