// Can an add-in show a Form holding the WebView2 control as a top-level window,
// which the user could drag to another monitor? The DetachProbe add-in
// (probes/detach) builds a Form with a WebView2 on it and shows it modeless
// from a toolbar button. It prints what the window is (its handle, owning
// process and visibility), when the WebView2 is ready, every message that
// passes between the page and the add-in, and what Hide, Show and Unload do.
// This file serves a page of its own on localhost, which the add-in's page
// loads in an iframe (TB_DETACH_URL), clicks the buttons and reads the DEBUG
// CONSOLE.
//
// The WebView2's user data folder is set to %TEMP%\tbDetachProbe in the
// control's Create event, as an add-in has to: left empty, the runtime picks a
// folder beside the host executable, which here is the compiler in the install.
// The tests also count the msedgewebview2.exe processes under that folder
// before the IDE starts and after it ends.
//
// Each test states what BETA 997 does. If one fails after an IDE update, the
// IDE has changed: update the plan for detaching the help pane in
// WIP.HelpAddin.md, and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { loadedAddins } from "../../scripts/lib/tb-ide-addins.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { serveLoopback } from "./pages.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "detach");
// The IDE's TEMP is a folder of the harness's own (launchIde in tb-ide.mjs), and
// the add-in builds its user data folder from the TEMP it finds.
const ideTemp = (lane) => path.join(process.env.TEMP ?? tmpdir(), `tbbuild-tmp-${lane.port}`);
// DETACH_NOUDF=1 leaves the control's user data folder unset: the variant that
// shows where the runtime puts it then.
const NOUDF = !!process.env.DETACH_NOUDF;

// What the probe printed since a mark, without its prefix.
const probeLines = (c, mark) => linesSince(c, mark, { prefix: "[DetachProbe] " });
const lineWith = (lines, re) => lines.find((l) => re.test(l));
const waitLine = (c, mark, re, timeout = 30 * 1000) =>
  waitFor(
    c,
    async (c) => {
      const l = lineWith(await probeLines(c, mark), re);
      return l ?? false;
    },
    { timeout },
  );

const ps = (script) =>
  execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();

// The ids of the msedgewebview2.exe processes started under the probe's user data folder.
const probeBrowsers = () =>
  ps(
    `Get-CimInstance Win32_Process -Filter "name='msedgewebview2.exe'" | ` +
      `Where-Object { $_.CommandLine -like '*tbDetachProbe*' } | ForEach-Object { $_.ProcessId }`,
  )
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);

// "<name>|<parent id>" of a process, or "" when it is gone.
const processOf = (pid) =>
  ps(
    `Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | ` +
      `ForEach-Object { $_.Name + '|' + $_.ParentProcessId }`,
  );

// Every folder in the copy of the install whose name ends in .WebView2, with
// what it holds one level down.
const webView2Folders = (root) =>
  existsSync(root)
    ? readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((e) => e.isDirectory() && /\.WebView2$/i.test(e.name))
        .map((e) => path.join(e.parentPath ?? e.path, e.name))
        .map((f) => `${path.relative(root, f)} [${readdirSync(f).join(", ")}]`)
    : [];

// The --user-data-dir of a browser process.
const userDataDir = (pid) =>
  ps(`(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`).match(
    /--user-data-dir="?([^"]+?)"?(?= --|$)/,
  )?.[1];

scenario("a Form holding a WebView2, shown by an add-in", (lane) => {
  let c, server, origin, before0, root, beforeFolders, formPid;
  const requests = [];
  before(async () => {
    server = await serveLoopback((req, res) => {
      requests.push({ url: req.url, dest: req.headers["sec-fetch-dest"] });
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end("<!doctype html><title>Detach fixture</title><p>fixture page</p>");
    });
    origin = `http://localhost:${server.port}/`;
    before0 = probeBrowsers();
    await lane.addAddin(PROBE);
    root = path.dirname(lane.copy());
    const env = { TB_DETACH_URL: `${origin}fixture.html` };
    if (NOUDF) env.TB_DETACH_NOUDF = "1";
    c = await lane.open(HOST, { env });
    beforeFolders = webView2Folders(root);
  });

  test("the add-in builds with a Form and a WebView2, loads, and adds its buttons", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.ok(names.includes("DetachProbe AddIn"), `loaded: ${JSON.stringify(names)}`);
    assert.ok(await waitLine(c, null, /^loaded$/), "the add-in did not load");
  });

  test("Show makes a visible top-level window, owned by the compiler's process", async (t) => {
    const mark = await consoleMark(c);
    await click(c, "addinButton-detachProbe");
    assert.ok(await waitLine(c, mark, /^window pid /), `no window: ${JSON.stringify(await probeLines(c, mark))}`);
    const lines = await probeLines(c, mark);
    t.diagnostic(lines.join(" | "));
    const m = lineWith(lines, /^window pid /).match(/^window pid (\d+) current pid (\d+)$/);
    assert.ok(m, JSON.stringify(lines));
    formPid = Number(m[1]);
    assert.equal(formPid, Number(m[2]), "the form belongs to a process other than the add-in's");
    const owner = processOf(formPid);
    t.diagnostic(`owner ${formPid}: ${owner}; the IDE is ${lane.run.pid}: ${processOf(lane.run.pid)}`);
    assert.match(owner, /^twinBASIC.*\.exe\|/i);
    assert.equal(lineWith(lines, /^visible /), "visible 1");
    const rect = lineWith(lines, /^rect /).match(/^rect (-?\d+),(-?\d+),(-?\d+),(-?\d+)$/);
    assert.ok(
      rect && Number(rect[3]) - Number(rect[1]) > 100 && Number(rect[4]) - Number(rect[2]) > 100,
      lines.join("|"),
    );
  });

  test("the WebView2 becomes ready, and the page and the add-in exchange messages", async (t) => {
    const ready = await waitLine(c, null, /^ready \d+$/);
    assert.ok(ready, `not ready: ${JSON.stringify(await probeLines(c, null))}`);
    t.diagnostic(ready);
    assert.ok(await waitLine(c, null, /^msg frame-loaded:/), `no frame: ${JSON.stringify(await probeLines(c, null))}`);
    const lines = await probeLines(c, null);
    t.diagnostic(lines.join(" | "));
    const dir = userDataDir(lineWith(lines, /^browser pid /).slice(12));
    t.diagnostic(`user data dir of the browser: ${dir}`);
    const expected = NOUDF
      ? path.join(root, "bin", "twinBASIC_win32_noDEP.exe.WebView2", "EBWebView")
      : path.join(ideTemp(lane), "tbDetachProbe", "EBWebView");
    assert.equal(dir?.toLowerCase(), expected.toLowerCase());
    assert.equal(lineWith(lines, /^error /), undefined);
    for (const want of ["msg shell-loaded", "msg echo:ping", `msg frame-loaded:${origin}fixture.html`]) {
      assert.ok(lines.includes(want), `${want} is not in ${JSON.stringify(lines)}`);
    }
    assert.ok(
      requests.some((r) => r.url === "/fixture.html" && r.dest === "iframe"),
      JSON.stringify(requests),
    );
    if (!NOUDF) {
      const folder = path.join(ideTemp(lane), "tbDetachProbe");
      assert.ok(existsSync(folder), `${folder} was not made`);
      t.diagnostic(`${folder}: ${readdirSync(folder).join(", ")}`);
    }
  });

  test("nothing is written into the copy of the install", (t) => {
    const now = webView2Folders(root);
    t.diagnostic(`WebView2 folders in the copy: before ${JSON.stringify(beforeFolders)}, now ${JSON.stringify(now)}`);
    assert.deepEqual(now, beforeFolders);
  });

  test("Hide hides the window, Show shows it again, and the page stays loaded", async () => {
    let mark = await consoleMark(c);
    await click(c, "addinButton-detachProbeHide");
    assert.ok(await waitLine(c, mark, /^visible /));
    assert.deepEqual(await probeLines(c, mark), ["hidden", "visible 0"]);
    mark = await consoleMark(c);
    await click(c, "addinButton-detachProbeShow");
    assert.ok(await waitLine(c, mark, /^visible /));
    assert.deepEqual(await probeLines(c, mark), ["shown", "visible 1"]);
    // The page was not reloaded: no second shell-loaded, no second ready.
    await sleep(2000);
    const lines = await probeLines(c, null);
    assert.equal(lines.filter((l) => l === "msg shell-loaded").length, 1);
    assert.equal(lines.filter((l) => /^ready /.test(l)).length, 1);
  });

  test("Unload ends the form, and the button makes a fresh one", async (t) => {
    let mark = await consoleMark(c);
    await click(c, "addinButton-detachProbeUnload");
    assert.ok(await waitLine(c, mark, /^unloaded$/));
    t.diagnostic((await probeLines(c, mark)).join(" | "));
    mark = await consoleMark(c);
    await click(c, "addinButton-detachProbe");
    assert.ok(await waitLine(c, mark, /^msg frame-loaded:/), JSON.stringify(await probeLines(c, mark)));
    const lines = await probeLines(c, mark);
    t.diagnostic(lines.join(" | "));
    assert.ok(lines.includes("msg shell-loaded") && lines.includes("msg echo:ping"), JSON.stringify(lines));
    assert.equal(lines.filter((l) => /^ready /.test(l)).length, 1);
  });

  // After the lane is closed, even when closing it fails.
  return async () => {
    const at = probeBrowsers().length;
    let later = at;
    for (let i = 0; i < 20 && later > 0; i++) {
      await sleep(500);
      later = probeBrowsers().length;
    }
    console.log(
      `msedgewebview2.exe under tbDetachProbe: before ${before0.length}, when the IDE ended ${at}, ten seconds later ${later}`,
    );
    server?.close();
  };
});
