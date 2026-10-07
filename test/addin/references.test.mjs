// P20 in WIP.HelpAddin.md, measured: which packages the IDE's virtual file
// system lists for a project, so which packages the help add-in can offer. The
// ReferencesProbe add-in (probes/references) walks the tree with For Each,
// from the file system's root and from the project's, descending only into
// folders named Packages and their direct children, and prints a line for
// each folder. It does this when the project is loaded and again two seconds
// later. Three projects are opened in turn: references-defaults, which
// references what the IDE's Standard EXE template does; references-bare,
// which references only OLE Automation; and references-many, which references
// every built-in package. The last test adds a reference to the first while the
// add-in is loaded and removes it again, on the References page, as a person
// does.
//
// Each test states what BETA 995 and 997 do, which is the same. If one fails after an IDE update, the
// IDE has changed: update P20 in WIP.HelpAddin.md, and the Folder page
// (docs/Reference/Built-In/tbIDE/Folder.md), and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { compileOutcome, compilerPid, sleep, waitForCompile } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, clickAt, messageBoxes, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROBE = path.join(HERE, "probes", "references");
const SYMBOLS = path.join(HERE, "..", "..", "add-in", "Resources", "SYMBOLS", "symbols.json");

// The package names the add-in's symbol index knows.
const INDEXED = Object.keys(JSON.parse(readFileSync(SYMBOLS, "utf8")).packages);

// What the probe printed, as entries. A line is "[P20] <phase> <kind> | <path> |
// <name> | <flag> | <parent>", and a "packages" line goes on " | <names>", the
// names of the folders in it, in the order For Each gives them. `raw` is the
// line after the phase, to compare the two phases.
const LINE = /^\[P20\] (load|timer) (root|child|reference|packages|package) \| (.*)$/;
function entries(lines) {
  return lines.flatMap((l) => {
    const m = LINE.exec(l);
    if (!m) return [];
    const [path, name, flag, parent, names] = m[3].split(" | ");
    return [
      {
        phase: m[1],
        kind: m[2],
        path,
        name,
        flag,
        parent,
        names: names ? names.split(",") : [],
        raw: `${m[2]} | ${m[3]}`,
      },
    ];
  });
}

// The loads in a stretch of the console, each as "load start | <project> |
// <pid>" and the entries after it, in the instance of the add-in the compiler
// made.
function loads(lines) {
  const out = [];
  for (const l of lines) {
    const start = /^\[P20\] load start \| (.+) \| (\d+)$/.exec(l);
    if (start) out.push({ project: start[1], pid: Number(start[2]), lines: [] });
    else if (l.startsWith("[P20] ") && out.length) out.at(-1).lines.push(l);
  }
  return out.map((o) => ({ ...o, entries: entries(o.lines), done: o.lines.filter((l) => l.endsWith(" done")) }));
}

// The names in the project's own Packages folder, and in the Packages folder of
// a package, by the package's name.
const topNames = (es, project) =>
  es.find((e) => e.kind === "packages" && e.path === `twinbasic:/${project}/Packages`)?.names;
const nestedNames = (es, owner) =>
  es.find((e) => e.kind === "packages" && e.path.endsWith(`/${owner}/Packages`))?.names;
const sorted = (a) => [...a].sort();

// The pass of one phase of a load, by its entries.
const phaseOf = (load, phase) => load.entries.filter((e) => e.phase === phase);

// ---------------------------------------------------------------- the References page
// Taken from ide/packages.test.mjs, which says why each part is as it is.

// The open Settings editor's working copy of the project's settings.
const CONFIG_JS = `[...document.querySelectorAll("*")].find((e) => e.globalVars?.configData)?.globalVars`;
// The working copy's references, by symbol. A tick or an untick changes it at once.
const REFERENCES_JS = `${CONFIG_JS}.configData["project.references"].map((r) => r.symbolId ?? r.name)`;
// Every row of the References page, as text, to tell when the lists stop changing.
const ALL_ROWS_JS = `[...document.querySelectorAll(".referencesListRow")].map((r) => r.parentElement.className + " " + r.textContent).join("\\n")`;
// The sequence numbers of the compiler socket's requests still awaiting an answer.
const WAITING_JS = `JSON.stringify(Object.keys(debugSocket.requestsAwaitingResponse))`;
// The two lists of rows: the references the project has, and Available Packages.
const INSTALLED = "referencesListNew";
const AVAILABLE = "referencesListNewAvailable";

// Open the Settings editor on the References page, and wait for it to load: for
// the requests sent after it was opened to be answered.
async function openReferences(c) {
  const older = JSON.parse(await c.evaluate(WAITING_JS));
  const newer = async () => JSON.parse(await c.evaluate(WAITING_JS)).filter((k) => !older.includes(k));
  await c.evaluate(`executeIdeCommand("tbProject_ShowReferences"), null`);
  assert.ok(await waitFor(c, (c) => c.evaluate(`!!${CONFIG_JS}`), { timeout: 20 * 1000 }), "no Settings editor");
  assert.ok(
    await waitFor(c, async () => (await newer()).length === 0, { timeout: 60 * 1000 }),
    "the References page never finished loading",
  );
}

// Click the tick box of the row in `list` that names a package and is in the
// state `ticked`, with a real click, as a person does, once the rows have
// stopped changing: Available Packages also lists TWINSERV's packages, which
// arrive by a request the page does not count as pending, and a click while
// they are being added lands on another row. Returns the references before
// and after.
async function tick(c, name, { ticked, list }) {
  let rows = null;
  let since = 0;
  const stable = await waitFor(
    c,
    async () => {
      const now = await c.evaluate(ALL_ROWS_JS);
      if (now !== rows) [rows, since] = [now, Date.now()];
      return Date.now() - since >= 2000;
    },
    { timeout: 30 * 1000 },
  );
  assert.ok(stable, "the References page's rows never stopped changing");
  const find = `(() => {
    const r = [...document.querySelectorAll(".referencesListRow")].find((r) =>
      r.querySelector(".referencesListColName2, .referencesListColSymbol")?.textContent.includes(${JSON.stringify(name)})
      && r.parentElement.className === ${JSON.stringify(list)}
      && !!r.querySelector(".referencesListColEnabled .tickIcon2") === ${ticked});
    if (!r) return null;
    const b = r.querySelector(".referencesListColEnabled");
    b.scrollIntoView({ block: "center" });
    const q = b.getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
  })()`;
  const where = await waitFor(c, (c) => c.evaluate(find), { timeout: 15 * 1000 });
  assert.ok(where, `no ${ticked ? "ticked" : "unticked"} row for ${name} in ${list}`);
  const before = await c.evaluate(REFERENCES_JS);
  await clickAt(c, where.x, where.y);
  await sleep(1500);
  return { before, after: await c.evaluate(REFERENCES_JS) };
}

scenario("P20: the packages a project references, in the virtual file system", (lane) => {
  before(async () => {
    await lane.addAddin(PROBE);
  });

  // Open a host project, let the add-in load and its timer fire, and keep what
  // it printed. The project stays open if `keep`.
  async function observe(host, { keep = false } = {}) {
    const c = await lane.open(path.join(HERE, "probes", `references-${host}`), {
      folder: path.join(lane.work, host),
    });
    const timed = await waitFor(c, async (c) => loads(await linesSince(c)).some((l) => l.done.length === 2), {
      timeout: 60 * 1000,
    });
    assert.ok(timed, `the add-in never finished its second pass in ${host}`);
    const result = loads(await linesSince(c));
    if (!keep) await lane.closeProject();
    return { c, loads: result };
  }
  const seen = {};
  const once = (host) => (seen[host] ??= observe(host));

  test("the add-in loads once per project, and prints both passes", async () => {
    for (const host of ["defaults", "bare", "many"]) {
      const { loads: ls } = await once(host);
      assert.equal(ls.length, 1, `${host}: ${ls.length} loads`);
      assert.equal(ls[0].project, `References${host[0].toUpperCase()}${host.slice(1)}`);
      assert.deepEqual(ls[0].done, ["[P20] load done", "[P20] timer done"]);
    }
  });

  test("Q3: the list is complete when Host_OnProjectLoaded runs: two seconds later it is the same", async () => {
    for (const host of ["defaults", "bare", "many"]) {
      const [l] = (await once(host)).loads;
      const load = phaseOf(l, "load").map((e) => e.raw);
      const timer = phaseOf(l, "timer").map((e) => e.raw);
      assert.ok(load.length > 10, `${host}: only ${load.length} lines`);
      assert.deepEqual(timer, load, `${host}: the second pass differs from the first`);
    }
  });

  test("Q1: the file system's root is twinbasic:/, and holds a folder named for the project, which holds Packages", async () => {
    const [l] = (await once("defaults")).loads;
    const es = phaseOf(l, "load");
    const roots = es.filter((e) => e.kind === "root");
    assert.deepEqual(
      roots.map((e) => [e.path, e.name, e.flag, e.parent]),
      [
        ["twinbasic:/", "", "False", "(none)"],
        ["twinbasic:/ReferencesDefaults", "ReferencesDefaults", "False", "twinbasic:/"],
      ],
    );
    // The folders of the file system's root, then of the project's. For Each
    // gives the project's in a different order each time the project loads.
    assert.deepEqual(
      sorted(es.filter((e) => e.kind === "child").map((e) => e.name)),
      sorted([
        "ReferencesDefaults",
        "References",
        "Sources",
        "Resources",
        "Packages",
        "Miscellaneous",
        "ImportedTypeLibraries",
      ]),
    );
    const packages = es.find((e) => e.kind === "child" && e.name === "Packages");
    assert.deepEqual(
      [packages.path, packages.flag, packages.parent],
      ["twinbasic:/ReferencesDefaults/Packages", "True", "twinbasic:/ReferencesDefaults"],
    );
  });

  test("Q1: IsPackagesFolder is true for the project's Packages folder and for each package's, false for a package's folder", async () => {
    for (const host of ["defaults", "bare", "many"]) {
      const es = phaseOf((await once(host)).loads[0], "load");
      const lists = es.filter((e) => e.kind === "packages");
      assert.ok(lists.length > 1, host);
      assert.ok(
        lists.every((e) => e.name === "Packages" && e.flag === "True"),
        host,
      );
      const packages = es.filter((e) => e.kind === "package");
      assert.ok(packages.length > 1, host);
      assert.ok(
        packages.every((e) => e.flag === "False"),
        host,
      );
      assert.ok(
        es.filter((e) => e.kind === "child" && e.name !== "Packages").every((e) => e.flag === "False"),
        host,
      );
    }
  });

  test("Q1: a package's folder is named for the package's project, not for its symbol, its description or its install folder", async () => {
    // The template's reference to VB has the symbol WindowsControlsPackage and
    // the description "twinBASIC - VB Compatibility Package (Forms)"; the
    // install folder of Assert is TwinBasicAssertions, of CustomControlsPackage
    // is {697A5CBF-...}_CustomControlsPackage, of AppGlobalClassProject
    // {C192FB39-...}_AppGlobalClassObject.
    const defaults = phaseOf((await once("defaults")).loads[0], "load");
    assert.deepEqual(sorted(topNames(defaults, "ReferencesDefaults")), ["VB", "VBA", "VBRUN"]);
    const many = phaseOf((await once("many")).loads[0], "load");
    const top = topNames(many, "ReferencesMany");
    for (const name of ["Assert", "AppGlobalClassProject", "CustomControls", "CustomControlsPackage", "cefPackage"]) {
      assert.ok(top.includes(name), `${name} is not in ${top}`);
    }
    for (const bad of [
      "TwinBasicAssertions",
      "AppGlobalClassObject",
      "WindowsControlsPackage",
      "CEF",
      "cefPackage145",
    ]) {
      assert.ok(!top.includes(bad), `${bad} is in ${top}`);
    }
  });

  test("Q1: the names are the keys of the symbol index's packages, but for VBComDlg, which only another package references", async () => {
    const many = phaseOf((await once("many")).loads[0], "load");
    const every = new Set(many.filter((e) => e.kind === "package").map((e) => e.name));
    assert.deepEqual(sorted([...every].filter((n) => !INDEXED.includes(n))), ["VBComDlg"]);
    // The index has every name the project lists, whichever level.
    assert.deepEqual(sorted(INDEXED.filter((n) => !every.has(n))), []);
    assert.ok(!topNames(many, "ReferencesMany").includes("VBComDlg"));
    assert.deepEqual(sorted(nestedNames(many, "WinNativeCommonCtls")), ["VB", "VBComDlg", "VBRUN", "VBA"].sort());
  });

  test("Q1: a package shows the Path and Parent of the first Packages folder it was found in, whichever lists it", async () => {
    // VB lists VBRUN and VBA, and so do the project's own Packages folder: the
    // project's list shows the same two folders, with the paths under VB.
    const defaults = phaseOf((await once("defaults")).loads[0], "load");
    const vba = defaults.filter((e) => e.kind === "package" && e.name === "VBA");
    assert.ok(vba.length >= 2);
    assert.ok(
      vba.every((e) => e.path === "twinbasic:/ReferencesDefaults/Packages/VB/Packages/VBA"),
      JSON.stringify(vba.map((e) => e.path)),
    );
    assert.ok(vba.every((e) => e.parent === "twinbasic:/ReferencesDefaults/Packages/VB/Packages"));
    // With no VB to list them first, they sit directly in the project's Packages folder.
    const bare = phaseOf((await once("bare")).loads[0], "load");
    assert.deepEqual(
      bare.filter((e) => e.kind === "package").map((e) => e.path),
      ["twinbasic:/ReferencesBare/Packages/VBRUN", "twinbasic:/ReferencesBare/Packages/VBA"],
    );
  });

  test("Q2: a project with the template's references lists VB, VBRUN and VBA, and not AppGlobalClassProject", async () => {
    const es = phaseOf((await once("defaults")).loads[0], "load");
    assert.deepEqual(sorted(topNames(es, "ReferencesDefaults")), ["VB", "VBA", "VBRUN"]);
    assert.deepEqual(sorted(nestedNames(es, "VB")), ["VBA", "VBRUN"]);
    assert.deepEqual(nestedNames(es, "VBA"), []);
    assert.deepEqual(nestedNames(es, "VBRUN"), []);
  });

  test("Q2: a project that references only OLE Automation still lists VBRUN and VBA", async () => {
    const es = phaseOf((await once("bare")).loads[0], "load");
    assert.deepEqual(sorted(topNames(es, "ReferencesBare")), ["VBA", "VBRUN"]);
  });

  test("Q2: a project that references every built-in package lists them all, and their own references only inside them", async () => {
    const es = phaseOf((await once("many")).loads[0], "load");
    assert.deepEqual(
      sorted(topNames(es, "ReferencesMany")),
      sorted([
        "AppGlobalClassProject",
        "Assert",
        "cefPackage",
        "CustomControls",
        "CustomControlsPackage",
        "tbIDE",
        "VB",
        "VBA",
        "VBRUN",
        "WebView2Package",
        "WinEventLogLib",
        "WinNamedPipesLib",
        "WinNativeCommonCtls",
        "WinServicesLib",
      ]),
    );
    assert.deepEqual(sorted(nestedNames(es, "tbIDE")), ["VBA", "VBRUN"]);
    assert.deepEqual(sorted(nestedNames(es, "CustomControlsPackage")), ["CustomControls", "VBA", "VBRUN"]);
    assert.deepEqual(sorted(nestedNames(es, "WebView2Package")), ["VB", "VBA", "VBRUN"]);
    assert.deepEqual(sorted(nestedNames(es, "cefPackage")), ["VB", "VBA", "VBRUN"]);
    assert.deepEqual(nestedNames(es, "AppGlobalClassProject"), []);
  });

  test("a type library is not a package: the References folder holds a file for it", async () => {
    for (const host of ["defaults", "bare", "many"]) {
      const es = phaseOf((await once(host)).loads[0], "load").filter((e) => e.kind === "reference");
      assert.equal(es.length, 1, host);
      // FileSystemItemType.FileVIRTUALDOC, a "stdole" with the library's id and version after U+241E.
      assert.equal(es[0].flag, "1");
      assert.match(es[0].name, /^stdole\u{241E}00020430-0000-0000-C000-000000000046_2_0$/u);
    }
  });

  test("the Packages folder lists the references newest first, then VBRUN and VBA", async () => {
    const many = phaseOf((await once("many")).loads[0], "load");
    assert.deepEqual(topNames(many, "ReferencesMany"), [
      "WinServicesLib",
      "WinNativeCommonCtls",
      "WinNamedPipesLib",
      "WinEventLogLib",
      "cefPackage",
      "WebView2Package",
      "Assert",
      "CustomControls",
      "CustomControlsPackage",
      "tbIDE",
      "AppGlobalClassProject",
      "VB",
      "VBRUN",
      "VBA",
    ]);
  });

  // -------------------------------------------------------------- adding and removing a reference
  let c;
  let mark;
  let compiler;

  // Click Apply, #SAVEBTN, and wait for the compile to settle. Returns what the
  // console showed since, and the message boxes that were open meanwhile.
  async function apply() {
    mark = await consoleMark(c);
    await click(c, { css: "#SAVEBTN" });
    const boxes = [];
    const closed = await waitFor(
      c,
      async () => {
        boxes.push(...(await messageBoxes(c)));
        return !(await c.evaluate(`!!${CONFIG_JS}`));
      },
      { timeout: 20 * 1000, interval: 100 },
    );
    assert.ok(closed, "the Settings editor stayed open");
    await sleep(2000);
    const waited = await waitForCompile(c, { project: lane.project, timeout: 90 * 1000 });
    const outcome = compileOutcome(waited, { name: lane.project });
    assert.ok(outcome.ok, `the compiler did not settle: ${outcome.message}`);
    assert.equal(outcome.counts[0], 0, `the compile has errors: ${outcome.rows.join("\n")}`);
    return { lines: (await linesSince(c, mark)).filter((l) => !l.startsWith("[P20]")), boxes };
  }

  // The add-in's loads since the mark, once the last has printed its second pass.
  async function loadsSince() {
    const done = await waitFor(
      c,
      async (c) => {
        const l = loads(await linesSince(c, mark));
        return l.length > 0 && l.at(-1).done.length === 2;
      },
      { timeout: 60 * 1000 },
    );
    assert.ok(done, `no complete load since the Apply: ${JSON.stringify(loads(await linesSince(c, mark)))}`);
    return loads(await linesSince(c, mark));
  }

  // What an Apply that changes the references writes, and what it does not
  // ask: the IDE saves the project and restarts the compiler without a box.
  const RESTARTED = [
    "[COMPILER] Project settings changes require compiler-restart",
    "[PROJECT] twinBASIC project saving to disk [DONE]",
    "restarting from FILE",
  ];

  test("a project is open with the add-in loaded", async () => {
    const o = await observe("defaults", { keep: true });
    c = o.c;
    compiler = await compilerPid(c);
    assert.equal(o.loads[0].pid, compiler);
  });

  test("Q4: ticking a package in Available Packages and applying restarts the compiler without a question, and the new add-in lists the package first", async () => {
    await openReferences(c);
    await click(c, { css: "div", text: "Available Packages" });
    const r = await tick(c, "WebView2 Package", { ticked: false, list: AVAILABLE });
    assert.deepEqual(sorted(r.after), sorted([...r.before, "WebView2Package"]));
    const applied = await apply();
    assert.deepEqual(applied.lines, RESTARTED);
    assert.deepEqual(applied.boxes, [], "the IDE asked something");
    const ls = await loadsSince();
    assert.equal(ls.length, 1, "Host_OnProjectLoaded did not run exactly once in the new compiler");
    assert.equal(ls[0].project, "ReferencesDefaults");
    assert.notEqual(ls[0].pid, compiler);
    assert.equal(ls[0].pid, await compilerPid(c));
    compiler = ls[0].pid;
    const es = phaseOf(ls[0], "load");
    assert.deepEqual(topNames(es, "ReferencesDefaults"), ["WebView2Package", "VB", "VBRUN", "VBA"]);
    assert.deepEqual(sorted(nestedNames(es, "WebView2Package")), ["VB", "VBA", "VBRUN"]);
    assert.deepEqual(
      phaseOf(ls[0], "timer").map((e) => e.raw),
      es.map((e) => e.raw),
    );
  });

  test("Q4: unticking it in the installed references and applying restarts the compiler again, and the new add-in no longer lists it", async () => {
    await openReferences(c);
    const r = await tick(c, "WebView2Package", { ticked: true, list: INSTALLED });
    assert.deepEqual(sorted(r.after), sorted(r.before.filter((s) => s !== "WebView2Package")));
    const applied = await apply();
    assert.deepEqual(applied.lines, RESTARTED);
    assert.deepEqual(applied.boxes, [], "the IDE asked something");
    const ls = await loadsSince();
    assert.equal(ls.length, 1);
    assert.notEqual(ls[0].pid, compiler);
    assert.equal(ls[0].pid, await compilerPid(c));
    const es = phaseOf(ls[0], "load");
    assert.deepEqual(topNames(es, "ReferencesDefaults"), ["VB", "VBRUN", "VBA"]);
    assert.equal(nestedNames(es, "WebView2Package"), undefined);
  });
});
