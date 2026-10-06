// The IDE's recent-projects list, tested against the entry "The recent-projects
// list fills its empty slots with copies of its last entry" in BUGS-TO-REPORT.md
// (reproducer: bugs/recent-projects-copies).
//
// With "0" = A and "1" = B and "2" to "20" holding nothing, opening C leaves
// "0" = C, "1" = A and "2" to "20" all = B: nineteen copies.
//
// THIS TEST WRITES THE USER'S OWN LIST, HKCU\Software\VB and VBA Program
// Settings\twinBASIC_IDE\RecentlyOpened. Every IDE of every install reads and
// writes that key whatever its APPDATA is. So the test records the key as it
// is, value by value with the type of each, before it writes anything, and puts
// it back with restoreKeys after the lane's IDE has exited, even when a test
// failed. The runner's own tidy (startTidy and finishTidy in
// scripts/lib/tb-registry.mjs) only keeps no more copies of a path than the key
// had and drops every path under a lane's folder, so it is not relied on for
// this. All three project paths are inside the lane's work folder.
//
// Any other IDE that opens a project while this runs, another lane's or another
// session's, writes the same key and spoils the shape the test looks for. So
// the test tries again, up to ATTEMPTS times, when the list does not even have
// the opened project on top with A under it; a list that has both, and anything
// but B in the slots below, is the defect gone, and fails the test at once.
//
// If the test fails after an IDE update, the IDE has changed: update the entry
// in BUGS-TO-REPORT.md or bugs/filed/, WIP.Harness.md and
// scripts/lib/tb-registry.mjs (which say a short list trips it), and then this
// file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { portTaken, sleep } from "../../scripts/lib/tb-ide.mjs";
import { packTree } from "../../scripts/lib/tb-project.mjs";
import { IDE_SETTINGS_KEY, norm, restoreKeys, snapshotKeys } from "../../scripts/lib/tb-registry.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(HERE, "..", "..", "bugs", "recent-projects-copies", "src");
const KEY = `${IDE_SETTINGS_KEY}\\RecentlyOpened`;
const SLOTS = 21;
const ATTEMPTS = 4;

// The key's values as { name: data }, read now.
function listNow() {
  const [entry] = snapshotKeys([KEY]);
  const values = entry.snap?.values ?? [];
  return Object.fromEntries([].concat(values).map((v) => [v.name, v.data]));
}

scenario("the recent-projects list", (lane) => {
  const folder = (name) => path.join(lane.work, "recent", name);
  const A = path.join(folder("A"), "project.twinproj");
  const B = path.join(folder("B"), "project.twinproj");
  const C = path.join(folder("C"), "project.twinproj"); // where lane.open puts the project it is given
  let found = null; // the key as the test found it, for restoreKeys

  before(() => {
    found = snapshotKeys([KEY]);
    const entry = found[0].snap;
    assert.ok(entry, "the IDE has no RecentlyOpened key to start from");
    assert.deepEqual([].concat(entry.keys ?? []), [], "RecentlyOpened has subkeys, which this test does not expect");
    for (const dir of ["A", "B", "C"]) mkdirSync(folder(dir), { recursive: true });
    // A and B exist as projects, as in the reproducer; C is packed by lane.open.
    packTree(A, SOURCE);
    packTree(B, SOURCE);
  });

  // "0" = A, "1" = B and "2" to "20" deleted: restoreKeys deletes every value
  // the snapshot does not list.
  const setList = () =>
    restoreKeys([
      {
        path: KEY,
        snap: {
          values: [
            { name: "0", kind: "String", data: A },
            { name: "1", kind: "String", data: B },
          ],
          keys: [],
        },
      },
    ]);

  // Open C, and read the list once the IDE has put C on top of it; the last
  // list read if it never does.
  async function openC() {
    setList();
    await lane.open(SOURCE, { folder: folder("C") });
    let values = {};
    for (let i = 0; i < 50; i++) {
      values = listNow();
      if (norm(values["0"] ?? "") === norm(C)) break;
      await sleep(200);
    }
    return values;
  }

  test("opening a project fills the slots that held nothing with copies of the last entry", async (t) => {
    let values;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      if (attempt > 1) {
        await lane.closeProject();
        // The ended IDE's WebView2 can hold the DevTools port for a while.
        for (let i = 0; i < 150 && (await portTaken(lane.port)); i++) await sleep(200);
      }
      values = await openC();
      t.diagnostic(`attempt ${attempt}: "0" and "1" ${norm(values["1"] ?? "") === norm(A) ? "as set" : "disturbed"}`);
      if (norm(values["0"] ?? "") === norm(C) && norm(values["1"] ?? "") === norm(A)) break;
    }
    const shown = JSON.stringify(values);
    assert.equal(norm(values["0"] ?? ""), norm(C), `"0" is not the opened project: ${shown}`);
    assert.equal(norm(values["1"] ?? ""), norm(A), `"1" is not A: ${shown}`);
    for (let i = 2; i < SLOTS; i++) {
      assert.equal(norm(values[String(i)] ?? ""), norm(B), `"${i}" is not a copy of B: ${shown}`);
    }
  });

  // After the lane has closed and its IDE has exited, which can write the list as
  // it ends. Runs even when a test or the close failed.
  return () => {
    if (found) restoreKeys(found);
  };
});
