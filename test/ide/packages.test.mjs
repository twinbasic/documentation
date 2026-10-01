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
// the IDE has changed: update the matching entry in BUGS-TO-REPORT.md and the
// two Packages pages under docs/Features/Packages, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { click, waitFor } from "../../scripts/lib/tb-operate.mjs";
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
