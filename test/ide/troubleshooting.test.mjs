// When something goes wrong: a save that fails, Safe Mode, a compiler restart, TRACE mode and DevTools,
// tested against seven entries in BUGS-TO-REPORT.md:
//
//   "A failed Save As still moves the project to the new path" (bugs/failed-save-as-moves-project)
//   "Close Project, Save: a save that fails drops the close" (bugs/failed-save-drops-close)
//   "Start in Safe Mode never runs and never ends, and Stop does nothing"
//   (bugs/safe-mode-start-never-runs)
//   "A linked package's missing file gives Restart a bare shutdown box and a wait of about 80 s"
//   (bugs/missing-linked-package-restart-box)
//   "TRACE mode auto-activated by a native exception takes effect only at the next restart"
//   (bugs/trace-auto-activate-needs-restart)
//   "With DevTools open, a compiler restart stops at a debugger statement in the IDE's code"
//   (bugs/devtools-stops-compiler-restart)
//   "A compiler connection that cannot be made restarts the compiler every 5 s, and the crash-loop
//   message never fires" (bugs/compiler-connection-retry-loop)
//
// Two IDEs, one after the other. The first has every test but the last, each with a page of its own
// (k.fromClean reloads the page, so that its variables start again and no project is open). The last
// test's IDE has --debug on its command line, which is what makes a connection that cannot be made;
// it is ended by its pid.
//
// troubleshooting-missing.test.mjs is the rest of this chapter's defects: a file missing from the
// install wants an IDE start of its own for each.
//
// THE RECENT LIST IS WRITTEN BY NOTHING HERE: --no-update-recent-files stays on, and every recent
// call is answered in the page. No save of the IDE's reaches the registry: the guard
// (starting-kit.mjs) records and drops every SaveIDESetting, in front of the defaults hook. Every
// project opened, saved or held read-only is in the lane's work folder, and the linked package is in
// the lane's private APPDATA. DevTools opens on the lane's private desktop, and the test fails if a
// new DevTools window shows on the user's.
//
// The native exceptions of the TRACE tests would each post an error report to the developers if the
// page had reporting on (postError). A tool's IDE has it off (BLANKED_KEYS in tb-defaults.mjs), and
// the hook answers that address itself whatever the page says. Those tests turn it on in the page, as
// a user's IDE has it, to test that: the only test of that fix against a real report. The address is
// also blocked by CDP while they run. The error-reporting question is never opened, and its YES never
// pressed.
//
// The tests share the lane's IDE in order. Each test states what BETA 1034 does; the tests named
// "control" pass whether or not the defects are fixed. If another fails after an IDE update, the IDE
// has changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the callout on
// the page of docs/IDE/Troubleshooting/ that carries it, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { IDE_FLAGS } from "../../scripts/lib/tb-ide.mjs";
import { click, pressKey, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";
import { J, sleep, troubleshootingKit } from "./troubleshooting-kit.mjs";

const NOT_FOUND = /^save project failed, result code 2, GetLastErr: ERROR_PATH_NOT_FOUND/;
const DENIED = /^save project failed, result code 2, GetLastErr: ERROR_ACCESS_DENIED/;
const NATIVE = /NATIVE EXCEPTION: ACCESS_VIOLATION/;
const DUMP = /^(>>> )?thread [0-9A-F]+: /;
const DISCONNECTED = ["COMPILER: Disconnected", "FS: Disconnected", "LSP: Disconnected", "DEBUGGER: Disconnected"];
const OK_TEXT = "ran to the end";

scenario("When something goes wrong", (lane) => {
  const k = troubleshootingKit(lane);
  const ctrlS = () => pressKey(k.c, "s", { ctrl: true });
  // Wait for a compiler other than `old`, with the project ready in it.
  const newCompiler = async (old) => {
    const ok = await waitFor(
      k.c,
      async () => {
        const p = await k.pid();
        return p && p !== old;
      },
      { timeout: 30 * 1000, interval: 100 },
    );
    assert.ok(ok, "no new compiler");
    await k.waitReady(30 * 1000);
  };
  const restartAndWait = async () => {
    const pid = await k.pid();
    await k.restart();
    await newCompiler(pid);
  };

  before(async () => {
    await k.startIde();
  });

  // ------------------------------------------------------------- N2, a failed Save As

  test("control: Save As to a good path moves the project and writes the file", async () => {
    const file = k.probe("GoodFrom");
    const bytes = readFileSync(file);
    await k.fromClean(file);
    await k.edit("GOOD_EDIT");
    const to = path.join(k.folder("good"), "GoodTo.twinproj");
    await k.setAnswer("SaveProjectAs", to);
    await k.cmd("tbProject_SaveAs");
    await waitFor(k.c, () => existsSync(to), { timeout: 10 * 1000, interval: 100 });
    await sleep(800);
    assert.deepEqual(k.c.dialogs.splice(0), []);
    const s = await k.state();
    assert.equal(s.file, "GoodTo.twinproj");
    assert.equal(s.tip, "GoodTo.twinproj");
    assert.equal(s.dirty, false);
    assert.ok(k.fileHas(to, "GOOD_EDIT"));
    assert.ok(readFileSync(file).equals(bytes), "the original was written");
  });

  test("a failed Save As still moves the project: the title bar and the path name the new file, and a plain Save goes there", async () => {
    const file = k.probe("MovedFrom");
    const bytes = readFileSync(file);
    await k.fromClean(file);
    await k.edit("MOVED_EDIT");
    const folder = path.join(lane.work, "no-such-folder");
    const moved = path.join(folder, "Moved.twinproj");
    await k.setAnswer("SaveProjectAs", moved);
    await k.cmd("tbProject_SaveAs");
    assert.match((await k.alert())[0], NOT_FOUND);
    const s = await k.state();
    assert.equal(s.file, "Moved.twinproj");
    assert.equal(s.tip, "Moved.twinproj");
    assert.equal(s.dirty, true);
    assert.equal(existsSync(moved), false);

    // A plain Save tries the new path, and fails while its folder is missing.
    await ctrlS();
    assert.match((await k.alert())[0], NOT_FOUND);
    assert.ok(readFileSync(file).equals(bytes), "the original was written");

    // With the folder there it writes the new path, and the file the reader opened stays as it was.
    mkdirSync(folder);
    await ctrlS();
    await waitFor(k.c, () => existsSync(moved), { timeout: 10 * 1000, interval: 100 });
    await sleep(800);
    assert.equal((await k.state()).dirty, false);
    assert.ok(k.fileHas(moved, "MOVED_EDIT"));
    assert.ok(readFileSync(file).equals(bytes), "the original was written");
  });

  test("a failed Save As over a read-only file moves the project too, and Save As back to the original puts it right", async () => {
    const file = k.probe("ReadOnlyFrom");
    await k.fromClean(file);
    await k.edit("READ_ONLY_EDIT");
    const target = path.join(k.folder("ro"), "ReadOnly.twinproj");
    writeFileSync(target, "x");
    await k.readOnly(target, async () => {
      await k.setAnswer("SaveProjectAs", target);
      await k.cmd("tbProject_SaveAs");
      assert.match((await k.alert())[0], DENIED);
      const s = await k.state();
      assert.equal(s.file, "ReadOnly.twinproj");
      assert.equal(s.dirty, true);
    });
    assert.equal(readFileSync(target, "utf8"), "x");
    await k.setAnswer("SaveProjectAs", file);
    await k.cmd("tbProject_SaveAs");
    await waitFor(k.c, async () => !(await k.state()).dirty, { timeout: 10 * 1000, interval: 100 });
    await sleep(500);
    assert.deepEqual(k.c.dialogs.splice(0), []);
    assert.equal((await k.state()).file, "ReadOnlyFrom.twinproj");
    assert.ok(k.fileHas(file, "READ_ONLY_EDIT"));
  });

  // ------------------------------------------------------------- D9, a failed save in Close Project

  test("control: Close Project, Save, and a save that works closes the project", async () => {
    const file = k.probe("CloseWorks");
    await k.fromClean(file);
    await k.edit("CLOSE_EDIT");
    await k.cmd("tbProject_Close");
    await sleep(800);
    assert.match((await k.box())[0], /You've made changes to this project\. Save now\?/);
    await k.button("Save");
    await waitFor(k.c, async () => !(await k.state()).loaded, { timeout: 15 * 1000, interval: 100 });
    assert.equal((await k.state()).loaded, false);
    assert.ok(k.fileHas(file, "CLOSE_EDIT"));
    assert.deepEqual(k.c.dialogs.splice(0), []);
  });

  test("Close Project, Save, and a save that fails drops the close: the project stays open and changed, and the reader must close again", async () => {
    const file = k.probe("CloseFails");
    await k.fromClean(file);
    await k.edit("DROPPED_EDIT");
    const bytes = readFileSync(file);
    await k.readOnly(file, async () => {
      await k.cmd("tbProject_Close");
      await sleep(800);
      assert.match((await k.box())[0], /You've made changes to this project\. Save now\?/);
      await k.button("Save");
      assert.match((await k.alert())[0], DENIED);
      await sleep(1500);
      const s = await k.state();
      assert.equal(s.loaded, true);
      assert.equal(s.dirty, true);
      assert.deepEqual(await k.box(), [], "the question is not asked again");
    });
    assert.ok(readFileSync(file).equals(bytes), "the file was written");
    assert.equal(await k.editorHas("DROPPED_EDIT"), true);
  });

  // ------------------------------------------------------------- N1, Start in Safe Mode

  test("control: Start with the box on win32 runs the program to its end", async () => {
    await k.fromClean(k.probe("Starts"));
    const m = await k.mark();
    await k.cmd("tbDebug_StartOrContinue");
    const ended = await waitFor(k.c, async () => (await k.since(m)).includes(OK_TEXT), { timeout: 15 * 1000 });
    assert.ok(ended, J(await k.since(m)));
    assert.equal(await waitFor(k.c, async () => !(await k.running()), { timeout: 10 * 1000 }), true);
  });

  test("Start in Safe Mode never runs and never ends, and Stop does nothing; a restart ends it", {
    timeout: 120 * 1000,
  }, async () => {
    await k.fromClean(k.probe("SafeStart"));
    await k.safeMode();
    assert.equal((await k.services()).badge, "tB Services: OPERATIONAL");
    const m = await k.mark();
    await k.cmd("tbDebug_StartOrContinue");
    await sleep(20 * 1000);
    const lines = ["Executing 'Main'...", "WARNING: execution delayed; waiting for background compilation to finish"];
    assert.deepEqual(await k.since(m), lines);
    assert.equal(await k.running(), true);

    await k.cmd("tbDebug_Stop");
    await sleep(15 * 1000);
    assert.deepEqual(await k.since(m), lines);
    assert.equal(await k.running(), true);

    await k.restart();
    const ended = await waitFor(k.c, async () => !(await k.running()), { timeout: 30 * 1000 });
    assert.equal(ended, true, "a restart does not end it");
  });

  // ------------------------------------------------------------- N4, a linked package's file gone

  let linked = null;

  test("control: Restart with a linked package's file there brings the compiler back at once", async () => {
    const pack = k.packPackage();
    const file = k.linkedProject();
    await k.fromClean(file);
    linked = { pack, file };
    await k.edit("LINKED_EDIT");
    const t0 = Date.now();
    await restartAndWait();
    assert.ok(Date.now() - t0 < 30 * 1000);
    assert.deepEqual(await k.nativeBoxes(), []);
    assert.equal(await k.editorHas("LINKED_EDIT"), true);
  });

  test("a linked package's missing file: Restart opens a box titled shutdown that names neither the package nor the file, and the compiler is back about 80 s after OK, the edit kept", {
    timeout: 200 * 1000,
  }, async () => {
    assert.ok(linked, "the control did not open the project");
    rmSync(linked.pack);
    await k.restart();
    const box = await k.nativeBox(20 * 1000);
    assert.equal(box.title, "shutdown");
    assert.equal(box.text, "Run-time error '-2147467259'\n\nUnspecified error");
    assert.deepEqual(
      box.buttons.map((b) => b.text),
      ["OK"],
    );
    assert.match(J(await k.box()), /Please wait/);
    assert.equal((await k.services()).badge, "tB Services: LIMITED");

    await k.pressBox(box);
    const t0 = Date.now();
    const back = await waitFor(k.c, async () => (await k.services()).badge === "tB Services: OPERATIONAL", {
      timeout: 140 * 1000,
      interval: 500,
    });
    assert.ok(back, `no compiler came back: ${J(await k.services())}`);
    const waited = Date.now() - t0;
    assert.ok(waited > 60 * 1000, `it took ${waited} ms`);
    await sleep(1500);
    assert.deepEqual(await k.nativeBoxes(), []);
    assert.equal(await k.editorHas("LINKED_EDIT"), true);
    // The IDE opens the References view by itself, some time after the status bar has come back.
    const readRows = () =>
      k.c.evaluate(
        `[...document.querySelectorAll(".referencesListRow")].filter((r) => r.getBoundingClientRect().height && /DocProbe/.test(r.innerText)).map((r) => r.innerText.replace(/\\s+/g, " "))`,
      );
    const rows = await waitFor(
      k.c,
      async () => {
        const r = await readRows();
        return r.length ? r : null;
      },
      { timeout: 20 * 1000 },
    );
    assert.equal(rows?.length, 1, J(rows));
    assert.match(rows[0], /\[LINKED-PACKAGE\] DocProbePkg .*ERROR unable to load this reference/);
  });

  // ------------------------------------------------------------- D3, TRACE mode

  // What leaves the page while reporting is on: the hosts of requests that are not local, and how
  // many requests to the report's address CDP stopped. Neither should ever be more than none.
  const out = { hosts: [], stopped: 0, on: false };
  const local = /^(https?|wss?):\/\/(localhost|127\.0\.0\.1)[:/]|^(data|blob|devtools|file):/;
  async function watchReports() {
    if (!k.c.__reportWatch) {
      k.c.__reportWatch = true;
      k.c.on((m) => {
        if (m.method === "Network.requestWillBeSent" && out.on && !local.test(m.params.request.url))
          out.hosts.push(new URL(m.params.request.url).host);
        if (m.method === "Fetch.requestPaused") {
          out.stopped++;
          k.c
            .send("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "BlockedByClient" })
            .catch(() => {});
        }
      });
    }
    await k.c.send("Fetch.enable", { patterns: [{ urlPattern: "*twinbasic.com*" }] });
    out.on = true;
    await k.c.evaluate("g_ErrorReporting = true, 0");
  }
  const traceItem = async () => {
    await click(k.c, "rootMenuHelp");
    await sleep(350);
    const item = await k.c.evaluate(
      `[...document.querySelectorAll(".contextMenuItem, .contextMenu .menuItem, .contextMenuOuter div")].filter((e) => /TRACE/.test(e.textContent) && e.children.length <= 3 && e.getBoundingClientRect().height).map((e) => e.innerText.trim()).at(-1)`,
    );
    await pressKey(k.c, "Escape");
    await sleep(200);
    return item;
  };
  /** Run Sub Crash and read what the console then gets, once nothing has come for 1.5 s. */
  const crash = async () => {
    const m = await k.mark();
    await k.runSub("Crash");
    const seen = await waitFor(k.c, async () => (await k.since(m)).some((l) => NATIVE.test(l)), {
      timeout: 15 * 1000,
    });
    assert.ok(seen, `no native exception: ${J(await k.since(m))}`);
    let lines = [];
    for (let quiet = 0; quiet < 6; ) {
      await sleep(250);
      const now = await k.since(m);
      quiet = now.length === lines.length ? quiet + 1 : 0;
      lines = now;
    }
    return lines;
  };

  test("a native exception auto-activates TRACE mode and Help says so, but a second exception in that compiler still prints no dump", async () => {
    await k.fromClean(k.probe("Trace"));
    assert.equal(await k.c.evaluate("g_TraceMode"), false);
    assert.equal(await traceItem(), "Compiler services TRACE mode: Disabled");
    await watchReports();
    const pid = await k.pid();

    const first = await crash();
    assert.ok(
      first.some((l) => /^0001 .*NATIVE EXCEPTION/.test(l)),
      J(first),
    );
    assert.ok(
      first.some((l) => /auto-activated TRACE-MODE/.test(l)),
      J(first),
    );
    assert.equal(first.filter((l) => DUMP.test(l)).length, 0, J(first));
    assert.equal(await k.c.evaluate("g_TraceMode"), true);
    assert.equal(await traceItem(), "Compiler services TRACE mode: Enabled");

    const second = await crash();
    assert.ok(
      second.some((l) => /^0002 .*NATIVE EXCEPTION/.test(l)),
      J(second),
    );
    assert.equal(second.filter((l) => DUMP.test(l)).length, 0, J(second));
    assert.equal(await k.pid(), pid, "the compiler was restarted");
  });

  test("control: after the next restart the same exception prints the dump, a line per thread", async () => {
    await restartAndWait();
    const lines = await crash();
    assert.ok(
      lines.some((l) => /^0001 .*NATIVE EXCEPTION/.test(l)),
      J(lines),
    );
    assert.ok(
      lines.some((l) => DUMP.test(l)),
      J(lines),
    );
    assert.ok(
      lines.some((l) => /^>>> thread [0-9A-F]+: .*Crash/.test(l)),
      J(lines),
    );
  });

  test("no error report leaves a tool's IDE: the defaults hook answers each one, and nothing else went out", async (t) => {
    const reports = await k.c.evaluate("window.__tbDefaults.reports");
    t.diagnostic(`reports answered by the hook: ${reports}`);
    await k.c.evaluate("g_ErrorReporting = false, 0");
    out.on = false;
    await k.c.send("Fetch.disable");
    assert.ok(reports > 0, "the hook answered no report");
    assert.equal(out.stopped, 0, "a request reached CDP's block");
    assert.deepEqual(out.hosts, []);
    // The crashes are asserted: the lane's close is not to fail on them.
    await k.cmd("tbDebugConsole_Clear");
  });

  // ------------------------------------------------------------- N3, DevTools

  test("control: with DevTools closed, Restart brings the compiler back", async () => {
    await k.fromClean(k.probe("Closed"));
    assert.deepEqual(await k.devTools(), []);
    await restartAndWait();
    assert.equal((await k.services()).badge, "tB Services: OPERATIONAL");
  });

  test("with DevTools open, a compiler restart stops at a debugger statement in the IDE's code until DevTools closes", {
    timeout: 90 * 1000,
  }, async () => {
    await k.fromClean(k.probe("Paused"));
    const mine = await k.userDevTools();
    const added = async () => (await k.userDevTools()).filter((h) => !mine.includes(h));
    try {
      await k.openDevTools(() => pressKey(k.c, "F12", { ctrl: true, shift: true }));
      assert.deepEqual(await added(), [], "a DevTools window is on the user's desktop");
      assert.equal((await k.services()).badge, "tB Services: OPERATIONAL");
      const pid = await k.pid();
      const m = await k.mark();
      await k.restart();
      await sleep(8 * 1000);
      const s = await k.services();
      assert.equal(s.badge, "tB Services: UNAVAILABLE");
      assert.deepEqual(s.tip, DISCONNECTED);
      assert.equal(await k.c.evaluate("isRestarting"), false, "it has gone past the statement");
      assert.deepEqual(await k.modals(), []);
      assert.deepEqual(await k.since(m), []);

      await k.closeDevTools();
      await newCompiler(pid);
      assert.ok((await k.since(m)).some((l) => /^restarting from MEMORY /.test(l)));
      assert.deepEqual(await added(), [], "a DevTools window is on the user's desktop");
    } finally {
      await k.closeDevTools();
    }
  });

  // ------------------------------------------------------------- D4, an IDE of its own

  test("a compiler connection that cannot be made restarts the compiler every 5 s, and the crash-loop message never fires", {
    timeout: 120 * 1000,
  }, async () => {
    await lane.closeProject();
    await k.startIde({}, { start: k.startWith([...IDE_FLAGS, "--debug"]) });
    await k.noProject();
    const file = k.probe("NoConnection");
    await k.c.evaluate(
      `(() => { window.__created = []; const real = window.createCompilerInstance; window.createCompilerInstance = function (...r) { window.__created.push(Math.round(performance.now())); return real.apply(this, r); }; })()`,
    );
    const m = await k.mark();
    await k.setAnswer("OpenProject", file);
    await k.cmd("tbProject_Open");
    await sleep(27 * 1000);

    const created = await k.c.evaluate("window.__created");
    assert.ok(created.length >= 5, J(created));
    const gaps = created.slice(1).map((t, i) => t - created[i]);
    assert.ok(
      gaps.every((g) => g > 4000 && g < 7000),
      J(gaps),
    );
    assert.ok((await k.since(m)).filter((l) => /^restarting from FILE/.test(l)).length >= 4, J(await k.since(m)));
    assert.equal(await k.c.evaluate("autoRestartHistory.length"), 0);
    const s = await k.services();
    assert.equal(s.badge, "tB Services: UNAVAILABLE");
    assert.notEqual(await k.c.evaluate("buildConfigSelector.value"), "nocompile");
    assert.equal((await k.events()).filter((e) => /crash loop/i.test(e)).length, 0, "the crash-loop message fired");
    await lane.closeProject();
  });
});
