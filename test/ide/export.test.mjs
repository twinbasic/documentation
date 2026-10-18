// File > Export Project, measured: what the IDE's own exportProjectTo() does to
// the folder it exports into. It is what the menu command calls once the
// Export Path is known, and it opens no folder picker. Every folder this file
// exports into, and every folder a junction in one points to, is inside the
// lane's work folder: one of the behaviours tested deletes through a junction.
//
// Each test states what BETA 1010 does. If one fails after an IDE update,
// the IDE has changed: update the matching entry in BUGS-TO-REPORT.md or
// bugs/filed/, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { launchOnDesktop } from "../../scripts/lib/tb-ide.mjs";
import { compilerExe } from "../../scripts/lib/tb-install.mjs";
import { messageBoxes, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "export");

// Every file under a folder, as paths relative to it.
function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)));
}

scenario("Export Project", (lane) => {
  let c;
  const root = path.join(lane.work, "export");
  const readOnly = [];

  // Export into a folder and wait for the compiler's last [EXPORT] line; the
  // [EXPORT] lines, without the prefix and trimmed. The second argument of
  // exportProjectTo() is the project's Export Verbose setting, which the menu
  // command passes; every test but the control below exports with it on.
  async function exportTo(folder, verbose = true) {
    const mark = await consoleMark(c);
    await c.evaluate(`exportProjectTo(${JSON.stringify(folder)}, ${verbose}), null`);
    const lines = await waitFor(
      c,
      async () => {
        const l = (await linesSince(c, mark, { prefix: "[EXPORT]" })).map((s) => s.trim());
        return l.some((s) => s.startsWith("COMPLETED") || s === "export failed.") ? l : null;
      },
      { timeout: 60 * 1000 },
    );
    assert.ok(lines, `no [EXPORT] COMPLETED or export failed. line for ${folder}`);
    return lines;
  }

  // The project's own folder, holding nothing but the .twinproj: the last test
  // exports into it.
  const projectDir = path.join(lane.work, "project");

  before(async () => {
    mkdirSync(root, { recursive: true });
    c = await lane.open(PROJECT, { folder: projectDir });
  });

  test("an export into an empty folder writes the compiler packages", async () => {
    const out = path.join(root, "plain");
    mkdirSync(out);
    const lines = await exportTo(out);
    const files = filesUnder(out);
    const packages = [...new Set(files.filter((f) => f.startsWith("Packages\\")).map((f) => f.split("\\")[1]))];
    assert.match(lines.at(-1), /^COMPLETED \(\d+ folders, \d+ files\)$/);
    assert.ok(packages.includes("VBA"), `no Packages\\VBA among ${packages.join(", ")}`);
  });

  // bugs/export-verbose-done-escaped: the compiler sends each DONE line in
  // three parts, "[EXPORT]  DONE: ", the path and the line break, and the
  // console's debugOutputPartial() passes the text that continues an open line
  // through TEXTtoHTML() twice (twinbasic/twinbasic#2444's cause), so each
  // backslash is stored as &amp;#92; and drawn as &#92;. The DELETED lines,
  // sent whole, are right; so are the files.
  test("with Export Verbose, every DONE line shows &#92; for each backslash of the path, and the files are right", async () => {
    const out = path.join(root, "verbose");
    mkdirSync(out);
    const lines = await exportTo(out);
    const done = lines.filter((l) => l.startsWith("DONE: "));
    assert.equal(lines[0], `exporting current project to "\\\\?\\${out}\\"...`);
    assert.match(lines.at(-1), /^COMPLETED \(\d+ folders, \d+ files\)$/);
    assert.ok(done.includes("DONE: &#92;Settings"), `no DONE: &#92;Settings among ${JSON.stringify(done.slice(0, 3))}`);
    assert.ok(done.includes("DONE: &#92;Sources&#92;Startup.twin"));
    assert.deepEqual(
      done.filter((l) => l.includes("\\") || !l.includes("&#92;")),
      [],
      "a DONE line shows a backslash",
    );
    // As the pane draws them: the rows it has drawn, which are the last ones.
    const drawn = await c.evaluate(
      `[...debugConsoleOutput.querySelectorAll("span.debugConsoleOutputText")].map((e) => e.textContent).filter((t) => t.includes("DONE: "))`,
    );
    assert.ok(drawn.length > 0, "the pane draws no DONE row");
    assert.deepEqual(
      drawn.filter((t) => t.includes("\\") || !t.includes("&#92;")),
      [],
      "a drawn DONE row shows a backslash",
    );
    // Each path, with its backslashes put back, is a file the export wrote.
    const missing = done.map((l) => l.slice(6).replaceAll("&#92;", "\\")).filter((r) => !existsSync(path.join(out, r)));
    assert.deepEqual(missing, []);
    const startup = path.join("Sources", "Startup.twin");
    assert.equal(readFileSync(path.join(out, startup), "utf8"), readFileSync(path.join(PROJECT, startup), "utf8"));
  });

  test("control: with Export Verbose, a second export's DELETED lines show the paths' backslashes", async () => {
    const out = path.join(root, "verbose");
    const lines = await exportTo(out);
    const deleted = lines.filter((l) => l.startsWith("DELETED: "));
    assert.ok(
      deleted.includes(`DELETED: \\\\?\\${path.join(out, "Sources", "Startup.twin")}`),
      `no DELETED line for Sources\\Startup.twin among ${JSON.stringify(deleted.slice(0, 3))}`,
    );
    assert.deepEqual(
      deleted.filter((l) => l.includes("&#92;")),
      [],
    );
  });

  test("control: without Export Verbose, the first line and the COMPLETED line show the path's backslashes", async () => {
    const out = path.join(root, "quiet");
    mkdirSync(out);
    const lines = await exportTo(out, false);
    assert.equal(lines.length, 2, JSON.stringify(lines));
    assert.equal(lines[0], `exporting current project to "\\\\?\\${out}\\"...`);
    assert.match(lines[1], /^COMPLETED \(\d+ folders, \d+ files\)$/);
    assert.ok(existsSync(path.join(out, "Sources", "Startup.twin")));
  });

  test("a junction in the export folder is not followed, and its target is kept", async () => {
    const out = path.join(root, "junction");
    const outside = path.join(root, "outside");
    mkdirSync(out);
    mkdirSync(outside);
    writeFileSync(path.join(outside, "precious.txt"), "keep me\n");
    symlinkSync(outside, path.join(out, "linked"), "junction");
    const lines = await exportTo(out);
    assert.ok(
      !lines.some((l) => /\\linked\\precious\.txt$/.test(l)),
      `the export reaches through the junction: ${JSON.stringify(lines)}`,
    );
    assert.deepEqual(filesUnder(outside), ["precious.txt"]);
  });

  test("a read-only file stops the export part-way, and the IDE reports nothing", async () => {
    const out = path.join(root, "readonly");
    mkdirSync(out);
    for (const name of ["a-first.txt", "m-readonly.txt", "z-last.txt"]) writeFileSync(path.join(out, name), "x\n");
    const ro = path.join(out, "m-readonly.txt");
    chmodSync(ro, 0o444);
    readOnly.push(ro);
    const lines = await exportTo(out);
    const boxes = await messageBoxes(c);
    assert.deepEqual(lines.slice(-3), [
      `DELETE FAILED: \\\\?\\${ro}`,
      "ERROR: unable to clean the output folder",
      "export failed.",
    ]);
    assert.deepEqual(filesUnder(out).sort(), ["m-readonly.txt", "z-last.txt"]);
    assert.deepEqual(boxes, []);
  });

  // On a private desktop, as every program a test starts: a plain spawn of the
  // compiler executable would show on the user's.
  test("the command line's import refuses the IDE's export, for its compiler packages", async () => {
    const out = path.join(root, "plain");
    const packed = path.join(root, "repacked.twinproj");
    const run = await launchOnDesktop({
      exe: compilerExe(lane.copy()),
      args: ["import", packed, `${out}\\`, "--overwrite"],
      tag: "ide-test export, the command line's import",
      env: process.env,
      stdout: path.join(root, "import.out"),
      stderr: path.join(root, "import.err"),
      dialogs: "close",
    });
    let timer;
    const timedOut = await Promise.race([
      run.exited.then(() => false),
      new Promise((r) => {
        timer = setTimeout(() => r(true), 60 * 1000);
      }),
    ]);
    clearTimeout(timer);
    if (timedOut) run.launcher.kill();
    const { code, dialogs } = await run.finished;
    assert.equal(timedOut, false, "the import ran past 60 s");
    assert.deepEqual(dialogs, []);
    assert.equal(code, 999);
    assert.equal(existsSync(packed), false);
  });

  // Last, since it deletes the open project's file. The Settings editor refuses
  // an Export Path of ${SourcePath} alone, but the compiler checks nothing.
  test("an export into the project's own folder deletes the project file", async () => {
    const lines = await exportTo(projectDir);
    assert.ok(
      lines.includes(`DELETED: \\\\?\\${lane.project}`),
      "the export no longer deletes the project file in its folder",
    );
    assert.match(lines.at(-1), /^COMPLETED \(\d+ folders, \d+ files\)$/);
    assert.equal(existsSync(lane.project), false);
  });

  // The runner removes the work folder afterwards, and a read-only file would
  // stop it.
  return () => {
    for (const f of readOnly) if (existsSync(f)) chmodSync(f, 0o666);
  };
});
