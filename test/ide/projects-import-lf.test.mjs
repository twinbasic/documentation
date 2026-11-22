// Add > Import... of source files whose line endings are not CRLF: BETA 1045's
// release notes say the import "now fixes bad line-feeds of source files
// (.bas/.cls/.twin)". This lane says what that means, file kind by file kind,
// with a file of another kind as the control, which is copied unchanged.
//
// It opens test/ide/probes/projects (projects-kit.mjs says what the page's guard
// does) once, and imports each file under a name the project does not have, so
// that no import replaces a file (that crashes the compiler: projects-import-crash).
// The files imported are written into the lane's work folder.
//
// BETA 1045: in a .twin, .bas or .cls file, each LF without a CR before it becomes CRLF,
// in the IDE and in the saved project; a lone CR stays as it was. Any other file is
// copied unchanged.
//
// Each test states what BETA 1045 does. If one fails after an IDE update, the IDE
// has changed: update docs/IDE/Projects/Adding-Files.md (Import), and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { scenario } from "../addin/scenario.mjs";
import { diskText, J, P, projectKit } from "./projects-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "projects");

// The line endings of a text, in order: "CRLF", "LF" or "CR".
function endings(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\r") {
      if (text[i + 1] === "\n") {
        out.push("CRLF");
        i++;
      } else out.push("CR");
    } else if (text[i] === "\n") out.push("LF");
  }
  return out;
}

scenario("Project Explorer: import fixes line endings", (lane) => {
  let c;
  const k = projectKit(() => c);
  const disk = (rel) => diskText(lane.project, rel);

  function importable(name, text) {
    const dir = path.join(lane.work, "lf", name.replace(/\W/g, "_"));
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    writeFileSync(file, text, "latin1");
    return file;
  }
  // Add > Import... of `file` on the Helpers folder; waits until the IDE holds it.
  async function importFile(file) {
    const name = path.basename(file);
    await k.setAnswer("OpenFiles", file);
    await k.addVia(P("Sources/Helpers"), "Import...");
    const t0 = Date.now();
    while (Date.now() - t0 < 20 * 1000) {
      const ide = await k.ideText(P(`Sources/Helpers/${name}`));
      if (ide !== null && ide !== "(no answer)") break;
      await sleep(250);
    }
    await sleep(1500);
    return {
      ide: await k.ideText(P(`Sources/Helpers/${name}`)),
      disk: disk(`Sources/Helpers/${name}`),
    };
  }

  before(async () => {
    c = await lane.open(PROJECT);
    assert.equal(await k.guard(), true);
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
  });

  const CASES = [
    ["LfOnly.twin", "Module LfOnly\n    ' one\n    ' two\nEnd Module\n", "CRLF"],
    ["CrOnly.twin", "Module CrOnly\r    ' one\r    ' two\rEnd Module\r", "CR"],
    ["Mixed.twin", "Module Mixed\r\n    ' one\n    ' two\r\nEnd Module\n", "CRLF"],
    ["LfOnly.bas", "Attribute VB_Name = \"LfOnlyBas\"\n' one\n' two\n", "CRLF"],
    [
      "LfOnlyCls.cls",
      "VERSION 1.0 CLASS\nBEGIN\n  MultiUse = -1  'True\nEND\nAttribute VB_Name = \"LfOnlyCls\"\n' one\n",
      "CRLF",
    ],
    ["LfOnly.txt", "one\ntwo\nthree\n", "LF"],
  ];
  const results = {};

  for (const [name, text, becomes] of CASES) {
    test(`import of ${name}, written with ${J([...new Set(endings(text))])}, keeps each line ending as ${becomes}, in the IDE and on disk`, async (t) => {
      const r = await importFile(importable(name, text));
      results[name] = { ide: endings(r.ide ?? ""), disk: endings(r.disk ?? "") };
      t.diagnostic(J({ name, wrote: endings(text), ...results[name], ideText: r.ide }));
      assert.ok(r.ide, `${name} was not imported`);
      const want = endings(text).map(() => becomes);
      assert.deepEqual(results[name].ide, want);
      assert.deepEqual(results[name].disk, want);
    });
  }
});
