// Build, the build path, Auto-Increment, the first save from the build's box and
// the Package Publishing sign-in, with real clicks: the defects queued in
// BUGS-TO-REPORT.md from the trials for the Building pages (their fact sheet's
// B15, B14, B11, B1, B4 and B2). Three IDEs, one after the other:
//  - test/ide/probes/building-exe, a Standard EXE with (VERSION) Auto-Increment
//    Revision at 1.0.7.3 and a Build Output Path holding ${ProjectID}:
//    "${ProjectID} in the build path becomes an empty string" and
//    "Auto-Increment raises the version in memory only, and the increments are
//    lost";
//  - test/ide/probes/building-pkg, a package, with its Package Publishing pane:
//    "A remembered publisher password containing ~ is read back wrong",
//    "A saved publisher name containing ' is cut short in the sign-in box" and
//    "OK in the publish failure box raises a page TypeError". Nothing reaches the
//    package server: the guard (building-kit.mjs) blocks it and fails the test on
//    any request, a publish's server call is a stub in the page, and the
//    publisher's name and password are test values set in the page, the IDE's
//    own put back in the page at the end, never read out of it;
//  - no project, then New Project (Standard EXE): "Save in the build's 'You must
//    first save the project' box writes no project file".
//
// Each test states what BETA 1010 does. If one fails after an IDE update, the
// IDE has changed: update the matching entry in BUGS-TO-REPORT.md or
// bugs/filed/, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { pressKey, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";
import {
  answer,
  boxes,
  clickText,
  diskText,
  guard,
  hostCalls,
  ideSettings,
  J,
  linesUntil,
  menu,
  mkdir,
  pageErrors,
  press,
  projectState,
  serverRequests,
  setAnswer,
  sleep,
  variant,
  version,
  waitBox,
} from "./building-kit.mjs";

const EXE = "BuildProbeExe";
const ID_PATH = "${SourcePath}\\Build\\${ProjectID}_${ProjectName}.${FileExtension}";

scenario("Building", (lane) => {
  let c;
  const exeDir = path.join(lane.work, "exe");
  const built = {};

  before(async () => {
    const src = variant("building-exe", path.join(lane.work, "src-exe"));
    c = await lane.open(src, { folder: exeDir, buildPath: ID_PATH });
    await guard(c);
  });

  // ------------------------------------------------------------- the build path and Auto-Increment

  test("${ProjectID} in Build Output Path becomes an empty string", async () => {
    const id = (await ideSettings(c, EXE))["project.id"];
    assert.match(id, /^\{7B247200-/, "the project has no id of the lane's");
    const r = await press(c, "build");
    Object.assign(built, r);
    const out = path.join(exeDir, "Build", `_${EXE}.exe`);
    assert.ok(r.lines.includes(`[LINKER] SUCCESS created output file '${out}'`), J(r.lines));
    assert.deepEqual(readdirSync(path.join(exeDir, "Build")), [`_${EXE}.exe`]);
  });

  test("control: ${SourcePath}, ${ProjectName} and ${FileExtension} in the same Build Output Path are expanded", () => {
    assert.ok(
      built.lines.some(
        (l) => l.startsWith(`[LINKER] SUCCESS created output file '${exeDir}\\Build\\`) && l.endsWith(`${EXE}.exe'`),
      ),
      J(built.lines),
    );
  });

  test("Auto-Increment raises the version in the IDE only: the project is not marked changed, its file keeps the old number, and Close Project asks nothing", async () => {
    assert.ok(built.lines.includes("[BUILD] Auto-incremented next build number to: 1.0.7.4"), J(built.lines));
    const r = await press(c, "build");
    assert.ok(r.lines.includes("[BUILD] Auto-incremented next build number to: 1.0.7.5"), J(r.lines));
    assert.equal(version(await ideSettings(c, EXE)), "1.0.7.5");
    assert.deepEqual(await projectState(c), { dirty: false, tx: 0, path: lane.project });
    assert.equal(version(JSON.parse(diskText(lane.project, "Settings"))), "1.0.7.3");
    await menu(c, "File", "Close Project");
    await sleep(3000);
    assert.deepEqual(
      (await boxes(c)).filter((b) => !b.startsWith("[New / Open")),
      [],
      "Close Project asked something",
    );
    assert.equal(version(JSON.parse(diskText(lane.project, "Settings"))), "1.0.7.3");
    assert.deepEqual(await pageErrors(c), []);
  });

  // ------------------------------------------------------------- Package Publishing

  test("a remembered publisher password containing ~ is read back with NUL in place of each ~", async () => {
    await lane.closeProject();
    const src = variant("building-pkg", path.join(lane.work, "src-pkg"));
    c = await lane.open(src, { folder: path.join(lane.work, "pkg") });
    await guard(c);
    // The IDE's own publisher settings, kept in the page and put back by the last
    // Package Publishing test; never read out of it.
    await c.evaluate(
      `window.__pubKeep = { n: packagePublisherName, p: packagePublisherPassword, r: packagePublisherRememberPassword, s: packagePublisherSessionID }; packagePublisherSessionID = ""; 0`,
    );
    await menu(c, "View", "PACKAGE PUBLISHING");
    const got = await remembered("pa~ss~word");
    assert.deepEqual(got.saved, true);
    assert.deepEqual(
      got.codes,
      [..."pa\0ss\0word"].map((ch) => ch.charCodeAt(0)),
    );
    const form = await signInForm();
    assert.equal(form.user, "TestPublisher");
    // The NUL, written into the form's HTML, is read back as U+FFFD.
    assert.equal(form.password, "pa\u{FFFD}ss\u{FFFD}word");
    assert.deepEqual(await serverRequests(c), []);
  });

  test("control: a remembered publisher password without ~ is read back as it was", async () => {
    const got = await remembered("Test-Pass_123!");
    assert.deepEqual(
      got.codes,
      [..."Test-Pass_123!"].map((ch) => ch.charCodeAt(0)),
    );
    const form = await signInForm();
    assert.equal(form.password, "Test-Pass_123!");
    assert.deepEqual(await serverRequests(c), []);
  });

  test("a saved publisher name containing ' is cut at the apostrophe in the sign-in box", async () => {
    await c.evaluate(
      `packagePublisherName = "O'Brien"; packagePublisherPassword = ""; packagePublisherRememberPassword = false; 0`,
    );
    const form = await signInForm();
    assert.equal(form.user, "O");
    assert.ok(form.attributes.includes("brien'"), J(form.attributes));
    assert.deepEqual(await serverRequests(c), []);
  });

  test("control: a saved publisher name with no apostrophe is shown whole in the sign-in box", async () => {
    await c.evaluate(`packagePublisherName = "TestPublisher"; 0`);
    const form = await signInForm();
    assert.equal(form.user, "TestPublisher");
    assert.deepEqual(await serverRequests(c), []);
  });

  test("OK in the box of a publish that fails with an HTTPS code raises a page TypeError", async () => {
    const box = await failedPublish(500);
    assert.equal(box, "[twinBASIC] [PUBLISH] FAILED. Server returned HTTPS code 500 {OK}");
    await answer(c, "OK");
    assert.deepEqual(await boxes(c), []);
    assert.deepEqual(await pageErrors(c), ["Uncaught TypeError: t is not a function"]);
  });

  test("control: OK in the box of a publish refused as a version already uploaded raises no error", async () => {
    const box = await failedPublish(551);
    assert.equal(box, "[twinBASIC] [PUBLISH] FAILED. Package already uploaded with this exact version number. {OK}");
    await answer(c, "OK");
    assert.deepEqual(await boxes(c), []);
    assert.deepEqual(await pageErrors(c), []);
    // The IDE's own publisher settings and server call, back as they were.
    await c.evaluate(
      `serverHttpsGetUtf8 = window.__realServer; window.__publisherSetting = undefined; packagePublisherName = __pubKeep.n; packagePublisherPassword = __pubKeep.p; packagePublisherRememberPassword = __pubKeep.r; packagePublisherSessionID = __pubKeep.s; delete window.__pubKeep; 0`,
    );
    assert.deepEqual(await serverRequests(c), []);
  });

  // The IDE saves a password with the page's own savePublisherInfo (into the
  // guard's record, never the registry), and reads it back with its own
  // loadPublisherInfo, as at its next start.
  async function remembered(password) {
    return c.evaluate(
      `(async () => {
        packagePublisherName = "TestPublisher"; packagePublisherPassword = ${J(password)}; packagePublisherRememberPassword = true;
        window.__publisherSaved = null;
        await new Promise((r) => savePublisherInfo(r));
        window.__publisherSetting = window.__publisherSaved;
        packagePublisherName = ""; packagePublisherPassword = ""; packagePublisherRememberPassword = false;
        loadPublisherInfo();
        await new Promise((r) => setTimeout(r, 500));
        return { saved: window.__publisherSaved !== null, codes: [...packagePublisherPassword].map((ch) => ch.charCodeAt(0)) };
      })()`,
      { awaitPromise: true },
    );
  }

  // SIGN IN in the pane, the sign-in box's LOGIN fields, then Cancel.
  async function signInForm() {
    await clickText(c, "SIGN IN");
    assert.ok(await waitBox(c, /Publisher Login \/ Signup/), "no sign-in box");
    const form = await c.evaluate(`(() => {
      const u = document.getElementById("PublisherUserIdLogin"), p = document.getElementById("PublisherPasswordLogin");
      return { user: u.value, password: p.value, attributes: [...u.attributes].map((a) => a.name) };
    })()`);
    await answer(c, "Cancel");
    assert.deepEqual(await boxes(c), []);
    return form;
  }

  // The IDE's packagePublisherPublishNow, as Continue in the publish confirmation
  // calls it, with the server call replaced in the page by one that fails with
  // `status`; the box it shows.
  async function failedPublish(status) {
    await pageErrors(c);
    await c.evaluate(`(() => {
      window.__realServer = window.__realServer || serverHttpsGetUtf8;
      serverHttpsGetUtf8 = function (url, ok, fail) { setTimeout(() => fail(${status}), 50); };
      packagePublisherPublishNow(new Uint8Array(4), "BuildProbePkg");
    })()`);
    const box = await waitBox(c, /PUBLISH/);
    assert.deepEqual(await serverRequests(c), []);
    return box;
  }

  // ------------------------------------------------------------- a project never saved

  test("Save in the build's 'You must first save the project' box takes the path but writes no project file and builds nothing, and Close Project then asks to save", async () => {
    await lane.closeProject();
    lane.includeProjects();
    c = await lane.openNoProject();
    await waitFor(
      c,
      () =>
        c.evaluate(
          `(() => { try { return typeof hostAppObject !== "undefined" && [...document.querySelectorAll(".modalTitleBar")].some((b) => b.innerText.includes("New / Open")); } catch { return false; } })()`,
        ),
      { timeout: 90 * 1000, interval: 250 },
    );
    await sleep(1500);
    await guard(c);
    await clickText(c, "Standard EXE", { scope: ".frontPageListViewItem" });
    await answer(c, "Open");
    assert.ok(await waitBox(c, /New Project Options/, { timeout: 60 * 1000 }), "no New Project Options");
    await answer(c, "Continue");
    await waitFor(c, () => c.evaluate(`typeof licenceIsSet !== "undefined" && licenceIsSet === true`), {
      timeout: 60 * 1000,
    });
    await sleep(2000);
    await guard(c);
    const target = path.join(mkdir(path.join(lane.work, "new")), "MyNewProject.twinproj");
    await setAnswer(c, "SaveProjectAs", target);
    const mark = await consoleMark(c);
    const r = await press(c, "build", { timeout: 5000 });
    assert.deepEqual(r.boxes, ["[twinBASIC] You must first save the project. Save now? {Save/Cancel}"]);
    await answer(c, "Save");
    await sleep(4000);
    assert.deepEqual(await hostCalls(c), [["SaveProjectAs", ["NewProject"], target]]);
    assert.deepEqual(await projectState(c), { dirty: true, tx: 1, path: target });
    assert.equal(existsSync(target), false);
    assert.deepEqual(
      (await linesSince(c, mark)).filter((l) => l.trim()),
      [],
      "the build or the save printed something",
    );
    assert.deepEqual(readdirSync(path.dirname(target)), []);
    await menu(c, "File", "Close Project");
    assert.equal(
      await waitBox(c, /changes/),
      "[twinBASIC] You've made changes to this project. Save now? {Save/Discard Changes/Cancel}",
    );
    await answer(c, "Cancel");
    assert.equal(existsSync(target), false);
  });

  test("control: Ctrl+S then writes the project file", async () => {
    const target = path.join(lane.work, "new", "MyNewProject.twinproj");
    const mark = await consoleMark(c);
    await pressKey(c, "s", { ctrl: true });
    const lines = await linesUntil(c, mark, /\[PROJECT\]/);
    assert.ok(lines.includes("[PROJECT] twinBASIC project saving to disk [DONE]"), J(lines));
    assert.ok(existsSync(target));
    assert.deepEqual(await pageErrors(c), []);
  });
});
