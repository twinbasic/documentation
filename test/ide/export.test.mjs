// File > Export Project, measured: what the IDE's own exportProjectTo() does to
// the folder it exports into. It is what the menu command calls once the
// Export Path is known, and it opens no folder picker. Every folder this file
// exports into, and every folder a junction in one points to, is inside the
// lane's work folder: one of the behaviours tested deletes through a junction.
//
// Each test states what BETA 983 and 995 do. If one fails after an IDE update,
// the IDE has changed: update the matching entry in BUGS-TO-REPORT.md, and
// then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
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
  // [EXPORT] lines, without the prefix and trimmed.
  async function exportTo(folder) {
    const mark = await consoleMark(c);
    await c.evaluate(`exportProjectTo(${JSON.stringify(folder)}, true), null`);
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

  before(async () => {
    mkdirSync(root, { recursive: true });
    c = await lane.open(PROJECT);
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

  test("a junction in the export folder is followed, and its target emptied", async () => {
    const out = path.join(root, "junction");
    const outside = path.join(root, "outside");
    mkdirSync(out);
    mkdirSync(outside);
    writeFileSync(path.join(outside, "precious.txt"), "keep me\n");
    symlinkSync(outside, path.join(out, "linked"), "junction");
    const lines = await exportTo(out);
    assert.ok(
      lines.some((l) => /^DELETED: .*\\linked\\precious\.txt$/.test(l)),
      "the export no longer deletes through the junction",
    );
    assert.deepEqual(filesUnder(outside), []);
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

  // The runner removes the work folder afterwards, and a read-only file would
  // stop it.
  return () => {
    for (const f of readOnly) if (existsSync(f)) chmodSync(f, 0o666);
  };
});
