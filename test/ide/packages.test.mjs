// Settings > References > Available Packages > Import from file..., measured:
// what the IDE does with a .twinpack chosen there. The package, DocProbePkg in
// probes/packages, is packed by scripts/impexp.mjs, and is imported into the
// project in probes/packages/host by clicking the dialog's own button.
//
// The button opens a native file picker, which a lane cannot see. So for the
// click only, the page's hostAppObject answers OpenPackage with the file's
// path, and HostReadFileDataBase64 hands over the file's bytes read here. Both
// stubs go in after the References page has loaded, because the compiler reads
// the built-in packages through HostReadFileDataBase64 while it loads; a stub
// in place then gives it the wrong bytes, and it stops at a run-time error box
// that nobody sees. OpenPackage puts the real hostAppObject back as it answers,
// and every other read goes to the real HostReadFileDataBase64.
//
// Each test states what BETA 995 does, which is what BETA 983 did by hand. In
// a lane, BETA 983's References page never finishes loading, so this file
// cannot run against it. If a test fails after an IDE update,
// the IDE has changed: update the matching entry in BUGS-TO-REPORT.md or bugs/filed/ and the
// two Packages pages under docs/Features/Packages, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { waitForCompile } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, clickAt, openFile, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const HOST = path.join(HERE, "probes", "packages", "host");
const PKG = path.join(HERE, "probes", "packages", "DocProbePkg");

// The open Settings editor's working copy of the project's settings.
const CONFIG_JS = `[...document.querySelectorAll("*")].find((e) => e.globalVars?.configData)?.globalVars`;
// The compiler's requests still waiting for an answer.
const WAITING_JS = `Object.keys(debugSocket.requestsAwaitingResponse).length`;

// The picker and the file read, answered for one file; and the compiler's
// answer to the import, recorded.
const stubsJs = (pack, base64) => `(() => {
  const real = hostAppObject;
  hostAppObject = new Proxy(real, {
    get: (t, p) => p === "OpenPackage"
      ? () => { hostAppObject = real; return Promise.resolve(${JSON.stringify(pack)}); }
      : (typeof t[p] === "function" ? t[p].bind(t) : t[p]),
  });
  const read = HostReadFileDataBase64;
  HostReadFileDataBase64 = function (p, cb) {
    if (p !== ${JSON.stringify(pack)}) return read.apply(this, arguments);
    HostReadFileDataBase64 = read;
    cb(${JSON.stringify(base64)});
  };
  window.__importAnswers = [];
  const request = debugSocket.request;
  debugSocket.request = function (name, args, cb) {
    if (name !== "importPackage") return request.apply(this, arguments);
    debugSocket.request = request;
    return request.call(this, name, args, (m) => { window.__importAnswers.push(JSON.parse(JSON.stringify(m))); return cb(m); });
  };
  return true;
})()`;

scenario("Import from file... in the Packages dialog", (lane) => {
  let c;
  let pack;

  before(async () => {
    pack = path.join(lane.work, "DocProbePkg.twinpack");
    execFileSync(process.execPath, [path.join(REPO, "scripts", "impexp.mjs"), "import", pack, PKG], { stdio: "pipe" });
    c = await lane.open(HOST);
  });

  test("the imported package is listed, but not ticked", async () => {
    await c.evaluate(`executeIdeCommand("tbProject_ShowReferences"), null`);
    assert.ok(await waitFor(c, (c) => c.evaluate(`!!${CONFIG_JS}`), { timeout: 20 * 1000 }), "no Settings editor");
    assert.ok(
      await waitFor(c, async () => (await c.evaluate(WAITING_JS)) === 0, { timeout: 60 * 1000 }),
      "the References page never finished loading",
    );
    await click(c, { css: "div", text: "Available Packages" });
    await c.evaluate(stubsJs(pack, readFileSync(pack).toString("base64")));
    await click(c, { css: "div", text: "Import from file..." });

    const answers = await waitFor(c, async () => {
      const a = await c.evaluate("window.__importAnswers");
      return a.length ? a : null;
    });
    assert.ok(answers, "the compiler never answered the import");
    // The compiler puts the symbol in the answer's body; the dialog's handler,
    // packageLoadFromFile in main.js, reads it from the answer itself.
    assert.equal(answers[0].success, true);
    assert.deepEqual(answers[0].body, { packageSymbol: "DocProbePkg" });

    const listed = await waitFor(c, (c) =>
      c.evaluate(
        `[...document.querySelectorAll(".referencesListRow .referencesListColSymbol")].some((e) => e.textContent.trim() === "DocProbePkg")`,
      ),
    );
    assert.ok(listed, "DocProbePkg is not in the Available Packages list");
    const referenced = await c.evaluate(
      `${CONFIG_JS}.configData["project.references"].map((r) => r.symbolId ?? r.name)`,
    );
    assert.ok(!referenced.includes("DocProbePkg"), "the imported package is now ticked");
  });
});

// ---------------------------------------------------------------------------
// Replacing an embedded package: BUGS-TO-REPORT.md, "Replacing an embedded
// package under one Apply keeps running the old copy". The probe is a project
// that embeds DocProbePkg v1 and prints what the package's function returns.
// It replaces v1 with v2 (untick v1, import v2, tick v2) and runs again. The
// control applies after the untick and again after the tick; the other test
// applies once, at the end, and differs from the control in nothing else.
//
// Both versions are generated into the lane's work folder from the v1 tree at
// probes/packages/DocProbePkg, which the first test above uses as it is. v2
// has its version fields in Settings at 2.0.0.0 and its function returns 2.
// impexp.mjs adds the empty folders every exported package has; without its
// Packages folder, BETA 995's compiler crashes on each restart after the
// embedding Apply, and the IDE drops into Safe Mode, where nothing runs
// (twinbasic/twinbasic#2442). Each test works on a copy of the host project in its own folder,
// because applying writes the project's settings. The copy's Main is empty
// until v1 is embedded, since the host cannot compile before the package is
// referenced; the test then writes Main in the editor.

const RUN_MAIN = `Module Startup
    Public Sub Main()
        Debug.Print "DocProbeVersion=" & DocProbeVersion()
    End Sub
End Module
`;

const VERSION_PREFIX = "DocProbeVersion=";

// The References page's rows, for a failure message: the list each is in,
// its name, and whether its tick box is ticked.
const ROWS_JS = `[...document.querySelectorAll(".referencesListRow")].map((r) => ({
  list: r.parentElement.className,
  name: r.querySelector(".referencesListColName2, .referencesListColSymbol")?.textContent.trim() ?? "",
  ticked: !!r.querySelector(".referencesListColEnabled .tickIcon2"),
})).filter((r) => r.ticked || r.name.includes("DocProbe"))`;

// The page's two lists of rows. Installed references are in the first, with
// the name of the package followed by an edit mark; Available Packages are in
// the second, named by their description, which here is the same text for v1
// and v2.
const INSTALLED = "referencesListNew";
const AVAILABLE = "referencesListNewAvailable";
const DESCRIPTION = "DocProbePkg.twinpack";

scenario("Replacing an embedded package", (lane) => {
  let c;
  let v1;
  let v2;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // A copy of the v1 tree in the work folder for `version`, packed to a
  // .twinpack as the first test does.
  function packVersion(version) {
    const tree = path.join(lane.work, `DocProbePkg-v${version}`);
    cpSync(PKG, tree, { recursive: true });
    const settings = path.join(tree, "Settings");
    const source = path.join(tree, "Sources", "DocProbe.twin");
    writeFileSync(
      settings,
      readFileSync(settings, "utf8").replace('"project.versionMajor": 1', `"project.versionMajor": ${version}`),
    );
    writeFileSync(source, readFileSync(source, "utf8").replace("Return 1", `Return ${version}`));
    const out = `${tree}.twinpack`;
    execFileSync(process.execPath, [path.join(REPO, "scripts", "impexp.mjs"), "import", out, tree], { stdio: "pipe" });
    return out;
  }

  before(() => {
    v1 = packVersion(1);
    v2 = packVersion(2);
  });

  // Open the Settings editor on the References page, and wait for it to load.
  async function openReferences() {
    await c.evaluate(`executeIdeCommand("tbProject_ShowReferences"), null`);
    assert.ok(await waitFor(c, (c) => c.evaluate(`!!${CONFIG_JS}`), { timeout: 20 * 1000 }), "no Settings editor");
    assert.ok(
      await waitFor(c, async () => (await c.evaluate(WAITING_JS)) === 0, { timeout: 60 * 1000 }),
      "the References page never finished loading",
    );
  }

  // Click the tick box of the row in `list` that names a package and is in
  // the state `ticked`, with a real click, as a person does.
  async function tick(name, { ticked, list }) {
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
    assert.ok(
      where,
      `no ${ticked ? "ticked" : "unticked"} row for ${name} in ${list}: ${JSON.stringify(await c.evaluate(ROWS_JS))}`,
    );
    await clickAt(c, where.x, where.y);
    await sleep(1500);
  }

  // Import a package through Available Packages, as the first test does.
  async function importFile(file) {
    await click(c, { css: "div", text: "Available Packages" });
    await c.evaluate(stubsJs(file, readFileSync(file).toString("base64")));
    await click(c, { css: "div", text: "Import from file..." });
    const answers = await waitFor(c, async () => {
      const a = await c.evaluate("window.__importAnswers");
      return a.length ? a : null;
    });
    assert.ok(answers?.[0].success, "the compiler did not accept the import");
  }

  // Click Apply, #SAVEBTN, and wait for the compile to settle. Returns what the
  // console showed: the restart, the save, or only "Project settings updated".
  async function apply({ errors = false } = {}) {
    const mark = await consoleMark(c);
    await click(c, { css: "#SAVEBTN" });
    assert.ok(
      await waitFor(c, async () => !(await c.evaluate(`!!${CONFIG_JS}`)), { timeout: 20 * 1000 }),
      "the Settings editor stayed open",
    );
    await sleep(2000);
    await settle({ errors });
    return linesSince(c, mark);
  }

  // Wait until the compiler has settled, with no errors unless `errors`: with
  // the package unticked, Main no longer compiles.
  async function settle({ errors = false } = {}) {
    const waited = await waitForCompile(c, { project: lane.project, timeout: 90 * 1000 });
    assert.ok(waited.loaded && !waited.crash, `the compiler did not settle: ${JSON.stringify(waited)}`);
    if (!errors) assert.match(waited.last, /"e":"0"/, `the compile has errors: ${waited.last}`);
  }

  // Start a run from the editor, as F5 does, and read the version the host
  // printed; end the run.
  async function runVersion() {
    const mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    const lines = await waitFor(
      c,
      async () => {
        const l = await linesSince(c, mark);
        return l.some((x) => x.startsWith(VERSION_PREFIX)) ? l : null;
      },
      { timeout: 60 * 1000 },
    );
    assert.ok(lines, `the run printed no version: ${JSON.stringify(await linesSince(c, mark))}`);
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`).catch(() => {});
    return Number(lines.find((x) => x.startsWith(VERSION_PREFIX)).slice(VERSION_PREFIX.length));
  }

  // The entry's three steps on a project of its own, and what each Apply
  // wrote to the console. `applyAfterUntick` is the control.
  async function replace(name, applyAfterUntick) {
    const host = path.join(lane.work, name);
    cpSync(HOST, host, { recursive: true });
    c = await lane.open(host, { folder: path.join(lane.work, `${name}-staged`) });
    const applies = {};

    // Step 1: embed v1: import it, tick it, one Apply.
    await openReferences();
    await importFile(v1);
    await tick(DESCRIPTION, { ticked: false, list: AVAILABLE });
    applies.embed = await apply();
    await openFile(c, "/PackagesProbe/Sources/Startup.twin");
    await c.evaluate(`editor.getModel().setValue(${JSON.stringify(RUN_MAIN)})`);
    await sleep(3000);
    await settle();
    const first = await runVersion();

    // Step 2: untick v1, import v2, tick v2.
    await openReferences();
    await tick("DocProbePkg", { ticked: true, list: INSTALLED });
    if (applyAfterUntick) {
      applies.untick = await apply({ errors: true });
      await openReferences();
    }
    await importFile(v2);
    await tick(DESCRIPTION, { ticked: false, list: AVAILABLE });
    // Step 3: Apply.
    applies.replace = await apply();
    const second = await runVersion();
    return { first, second, applies };
  }

  // What an Apply wrote to the console.
  const restarted = (lines) => lines.some((l) => /restarting from FILE|require compiler-restart/.test(l));
  const saved = (lines) => lines.some((l) => /saving to disk \[DONE\]/.test(l));

  test("an Apply after the untick and another after the tick: each restarts and saves, and v2 runs (control)", async () => {
    const r = await replace("control", true).finally(() => lane.closeProject());
    assert.equal(r.first, 1, "v1 did not run");
    for (const step of ["embed", "untick", "replace"]) {
      assert.ok(restarted(r.applies[step]) && saved(r.applies[step]), `the ${step} Apply did not restart and save`);
    }
    assert.equal(r.second, 2, "v2 does not run after the second Apply");
  });

  // BETA 995, as BETA 983 by hand: the one Apply writes only the line "Project
  // settings updated". The compiler is not restarted and nothing is saved, and
  // the run still prints v1. The control above is what shows that the probe can
  // tell the two versions apart.
  test("one Apply after the untick, the import and the tick: no restart, no save, and v1 still runs", async () => {
    const r = await replace("oneapply", false).finally(() => lane.closeProject());
    assert.equal(r.first, 1, "v1 did not run");
    assert.ok(restarted(r.applies.embed) && saved(r.applies.embed), "the embed Apply did not restart and save");
    assert.deepEqual(r.applies.replace, ["[COMPILER] Project settings updated"]);
    assert.equal(r.second, 1, "v2 runs after one Apply: the bug looks fixed, so update BUGS-TO-REPORT.md");
  });
});
