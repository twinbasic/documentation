// Unit tests for builder/addin-project.mjs, which packs the help add-in's
// folder, add-in/, into the project file the build publishes beside the Help
// Add-In page.
//
// A build says only that the file it wrote is in each tree (its index audit
// fails when the file is missing); nothing in it says what the file holds. So
// these pack the real add-in/ and compare the project, file by file, with the
// files git tracks there; and they pack fixture folders, each a git repository
// of its own, for what the real folder cannot show on every machine: a file git
// does not track, a Resources/HELP/ archive even when git tracks one, and a CRLF
// checkout beside an LF one.
//
// That docs/_config.yml declares the download, at a path the publish allowlist
// exempts, is scripts/check_publish_policy.mjs's to assert; nothing here reads
// docs/.
//
// Runs with a bare `node --test test/addin-project.test.mjs`: needs git, but no
// built tree, no twinBASIC install and no Python.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { addinProjectOf, packAddinProject, writeAddinProject } from "../builder/addin-project.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { readProject } from "../scripts/impexp.mjs";

const ADDIN = path.join(REPO_ROOT, "add-in");
const tmp = mkdtempSync(path.join(tmpdir(), "addin-project-test-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: "pipe" });

// Every file a project file holds, by its path under the root, with its bytes.
function filesIn(bytes) {
  const file = path.join(tmp, `read-${Math.random().toString(36).slice(2)}.twinproj`);
  writeFileSync(file, bytes);
  const out = new Map();
  (function walk(dir, rel) {
    for (const e of dir.children) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.kind === "file") out.set(r, e.content);
      else walk(e, r);
    }
  })(readProject(file), "");
  return out;
}

// The bytes the project should hold for a file of the working folder: line
// endings as git stores them outside Resources/, and CRLF in the code files,
// as the IDE stores them.
function expected(rel, bytes) {
  if (rel.toLowerCase().startsWith("resources/")) return bytes;
  let text = bytes.toString("latin1").replaceAll("\r\n", "\n");
  if (/\.(twin|bas|cls)$/i.test(rel)) text = text.replaceAll("\n", "\r\n");
  return Buffer.from(text, "latin1");
}

// A fixture add-in: a git repository holding `tracked`, with `untracked`
// beside them. Each value is the file's text.
function fixture(name, tracked, untracked = {}) {
  const dir = path.join(tmp, name);
  for (const [rel, text] of Object.entries({ ...tracked, ...untracked })) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), text, "latin1");
  }
  git(dir, "init", "-q");
  git(dir, "-c", "core.autocrlf=false", "add", "-f", "--", ...Object.keys(tracked));
  return dir;
}

const SETTINGS = '{\n\t"project.name": "Probe"\n}\n';
const TRACKED = {
  Settings: SETTINGS,
  "Sources/Module1.twin": "Module Module1\nEnd Module\n",
  "Sources/Form1.tbform": "{\n}\n",
  "Resources/SYMBOLS/symbols.json": '{"committed":true}\n',
  "Resources/SHELL/shell.js": "a\r\nb\n",
};
const crlf = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.replaceAll(/\r?\n/g, "\r\n")]));

describe("the help add-in's project file", () => {
  test("holds exactly the files git tracks in add-in/, as the working folder has them", async () => {
    const symbols = '{"probe":"the index this build wrote"}\n';
    const { bytes, files } = await packAddinProject({ dir: ADDIN, symbols });
    const want = git(ADDIN, "ls-files", "-z")
      .split("\0")
      .filter((rel) => rel && !rel.toLowerCase().startsWith("resources/help/"));
    const got = filesIn(bytes);
    assert.deepEqual([...got.keys()].sort(), [...want].sort(), "the files in the project");
    assert.deepEqual([...files].sort(), [...want].sort(), "the files the pack reports");
    for (const rel of want) {
      const bytesWanted =
        rel === "Resources/SYMBOLS/symbols.json"
          ? Buffer.from(symbols)
          : expected(rel, readFileSync(path.join(ADDIN, ...rel.split("/"))));
      assert.ok(got.get(rel).equals(bytesWanted), `${rel} differs from add-in/${rel}`);
    }
    assert.ok(![...got.keys()].some((rel) => /^resources\/help\//i.test(rel)), "Resources/HELP/ is in the project");
    assert.ok(want.includes("Settings") && want.some((rel) => rel.endsWith(".twin")), "add-in/ looks empty");
  });

  test("leaves out a file git does not track, and Resources/HELP/ even when git tracks it", async () => {
    const dir = fixture(
      "strays",
      { ...TRACKED, "Resources/HELP/site.zip": "PK tracked by mistake" },
      { "Sources/Scratch.twin": "Module Scratch\nEnd Module\n", "Resources/HELP/other.zip": "PK" },
    );
    const { bytes, untracked } = await packAddinProject({ dir });
    assert.deepEqual([...filesIn(bytes).keys()].sort(), Object.keys(TRACKED).sort());
    assert.deepEqual(untracked, ["Sources/Scratch.twin"]);
  });

  test("packs the index it is given in place of the folder's copy, and the copy without one", async () => {
    const dir = fixture("symbols", TRACKED);
    const given = filesIn((await packAddinProject({ dir, symbols: '{"built":true}\n' })).bytes);
    assert.equal(given.get("Resources/SYMBOLS/symbols.json").toString(), '{"built":true}\n');
    const own = filesIn((await packAddinProject({ dir })).bytes);
    assert.equal(own.get("Resources/SYMBOLS/symbols.json").toString(), '{"committed":true}\n');
  });

  test("is the same bytes from an LF and a CRLF checkout, and from one pack to the next", async () => {
    const lf = await packAddinProject({ dir: fixture("lf", TRACKED) });
    const resources = Object.fromEntries(Object.entries(TRACKED).filter(([k]) => k.startsWith("Resources/")));
    const windows = { ...crlf(TRACKED), ...resources };
    const cr = await packAddinProject({ dir: fixture("crlf", windows) });
    assert.ok(lf.bytes.equals(cr.bytes), "a CRLF checkout packs differently from an LF one");
    assert.ok(lf.bytes.equals((await packAddinProject({ dir: fixture("lf", TRACKED) })).bytes), "two packs differ");
    const got = filesIn(lf.bytes);
    assert.equal(got.get("Sources/Module1.twin").toString(), "Module Module1\r\nEnd Module\r\n");
    assert.equal(got.get("Settings").toString(), SETTINGS);
    assert.equal(got.get("Resources/SHELL/shell.js").toString(), "a\r\nb\n", "a resource was changed");
  });

  test("is written into every tree it is given, at the declared path", async () => {
    const dir = fixture("write", TRACKED);
    const roots = [path.join(tmp, "out", "_site"), path.join(tmp, "out", "_site-offline")];
    const rel = "tB/IDE/AddIns/downloads/Probe.twinproj";
    const r = await writeAddinProject({ dir, roots, rel });
    const written = roots.map((root) => readFileSync(path.join(root, ...rel.split("/"))));
    assert.ok(written[0].equals(written[1]), "the trees hold different files");
    assert.equal(r.bytes, written[0].length);
    assert.equal(r.files, Object.keys(TRACKED).length);
  });

  test("is declared only by a config that names both ends", () => {
    const declared = { addin_project: { src: "../add-in", dest: "/tB/IDE/AddIns/downloads/P.twinproj" } };
    assert.deepEqual(addinProjectOf(declared), { src: "../add-in", dest: "tB/IDE/AddIns/downloads/P.twinproj" });
    assert.equal(addinProjectOf({}), null);
    assert.equal(addinProjectOf({ addin_project: { src: "../add-in" } }), null);
  });
});
