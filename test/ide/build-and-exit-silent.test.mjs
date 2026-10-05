// `twinBASIC.exe --buildAndExit32 <project>`, tested against the entry
// "--buildAndExit32 writes nothing, exits 0 on a project with errors, and hangs
// on a failing build" in BUGS-TO-REPORT.md (reproducer: bugs/build-and-exit-silent).
// The switch belongs to the IDE executable, so the command runs on a private
// desktop (launchOnDesktop), from the lane's own copy of the install, with the
// lane's own APPDATA, and the project is packed into the lane's work folder.
//
// Each test states what BETA 983, 995 and 997 do. If one fails after an IDE
// update, the switch has changed: update the entry in BUGS-TO-REPORT.md or
// bugs/filed/, the notes that name it (scripts/tbbuild.mjs, WIP.Harness.md,
// docs/Documentation/Tools.md, docs/Features/Packages/Import-export tool.md),
// and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { launchOnDesktop, shutdownIde } from "../../scripts/lib/tb-ide.mjs";
import { laneProjectId, stageProject } from "../../scripts/lib/tb-project.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(HERE, "..", "..", "bugs", "build-and-exit-silent", "src");

// A build that finishes does so in a few seconds; one that hangs was still
// running after 30 and 40 seconds.
const FINISH_LIMIT = 120 * 1000;
const HANG_LIMIT = 45 * 1000;

const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");

// What the command printed, without Chromium's own log lines about shutting
// down ("[...:ERROR:ui\gfx\win\window_impl.cc:172] Failed to unregister
// class Chrome_WidgetWin_0. Error = 1412"), which say nothing about the build.
const buildLines = (text) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\[[\d/.]+:[A-Z]+:[^\]]*\]/.test(l));

scenario("--buildAndExit32 without a window to look at", (lane) => {
  // Pack the reproducer into a folder of its own, optionally with Main calling
  // Unused, and return where its files are and where the build would go.
  function stage(name, { callUnused = false } = {}) {
    const dir = path.join(lane.work, "bae", name);
    const project = path.join(dir, "BuildAndExitSilent.twinproj");
    mkdirSync(dir, { recursive: true });
    stageProject({
      src: SOURCE,
      stage: path.join(dir, "src"),
      project,
      settings: { "project.id": laneProjectId(6, lane.port) },
      prepare: (tree) => {
        if (!callUnused) return;
        const file = path.join(tree, "Sources", "Startup.twin");
        const text = readFileSync(file, "utf8");
        const edited = text.replace(/(Public Sub Main\(\)\r?\n)/, "$1        Unused\n");
        assert.notEqual(edited, text, "the reproducer's Main was not found");
        writeFileSync(file, edited, "utf8");
      },
    });
    return { dir, project, exe: path.join(dir, "Build", "BuildAndExitSilent_win32.exe") };
  }

  // Run the switch on a project and wait up to `limit` ms. A command still running
  // then is ended by its pid, and the result says so.
  async function buildAndExit(name, project, limit) {
    const dir = path.dirname(project);
    const temp = path.join(lane.work, "temp", name);
    mkdirSync(temp, { recursive: true });
    const stdout = path.join(dir, "stdout.txt");
    const stderr = path.join(dir, "stderr.txt");
    const started = Date.now();
    const run = await launchOnDesktop({
      exe: lane.copy(),
      arg: "--buildAndExit32",
      args: [project],
      desktop: `ide-test-bae-${lane.port}-${name}`,
      env: {
        ...process.env,
        APPDATA: lane.appdataDir(),
        TEMP: temp,
        TMP: temp,
        WEBVIEW2_USER_DATA_FOLDER: path.join(lane.work, "wv2", name),
        TB_ADDIN_TEST: "1",
      },
      stdout,
      stderr,
      dialogs: "close",
    });
    let timer;
    const hung = await Promise.race([
      run.exited.then(() => false),
      new Promise((r) => {
        timer = setTimeout(() => r(true), limit);
      }),
    ]);
    clearTimeout(timer);
    if (hung) {
      // By its pid and its job, never by image name.
      shutdownIde(run);
    }
    const { code, dialogs } = await run.finished;
    return {
      hung,
      code,
      dialogs,
      seconds: (Date.now() - started) / 1000,
      stdout: read(stdout),
      stderr: read(stderr),
    };
  }

  test("an error in a procedure nothing calls: it exits 0, writes the exe, and says nothing", async () => {
    const { project, exe } = stage("unused");
    const r = await buildAndExit("unused", project, FINISH_LIMIT);
    assert.equal(r.hung, false, `the command ran past ${FINISH_LIMIT / 1000} s`);
    assert.equal(r.code, 0, `exit code ${r.code}`);
    assert.ok(existsSync(exe), "no Build\\BuildAndExitSilent_win32.exe was written");
    assert.deepEqual(buildLines(r.stdout), [], "the command wrote to stdout");
    assert.deepEqual(buildLines(r.stderr), [], "the command wrote to stderr about the build");
  });

  test("an error in code the build reaches: it never exits and writes no exe", async () => {
    const { project, exe } = stage("called", { callUnused: true });
    const r = await buildAndExit("called", project, HANG_LIMIT);
    assert.equal(r.hung, true, `the command ended after ${r.seconds} s with exit code ${r.code}`);
    assert.equal(existsSync(exe), false, "a Build\\BuildAndExitSilent_win32.exe was written");
    assert.deepEqual(buildLines(r.stdout), [], "the command wrote to stdout");
    assert.deepEqual(buildLines(r.stderr), [], "the command wrote to stderr about the build");
  });
});
