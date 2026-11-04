// What troubleshooting.test.mjs and troubleshooting-missing.test.mjs need, over starting-kit.mjs,
// whose guard (it says what the guard does) stands in front of the defaults hook in every IDE here,
// so that no recent call and no save of the IDE's reaches the registry. Not a lane itself (lanes.mjs
// does not name it).
//
// Every file a test opens, saves, renames or holds is in the lane's work folder. A file missing from
// an install is missing from the lane's own copy (Lane.copy), for that test only: `without` refuses
// any other path. A read-only flag goes in a `finally`, as readOnly does it.
//
// A native box closes with BM_CLICK on its button: a private desktop takes no input. Every wait on a
// box has a limit, since a box left open wedges the lane. The Windows enumeration fails when a
// desktop has no window left, so nativeBoxes reads that as no box.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachIde,
  desktopWindows,
  IDE_FLAGS,
  killTree,
  launchIde,
  launchOnDesktop,
  postWindowMessage,
  sleep,
} from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { fixPageSize } from "../../scripts/lib/tb-lane.mjs";
import { click, openFile, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { packTree } from "../../scripts/lib/tb-project.mjs";
import { diskText, J, startingKit } from "./starting-kit.mjs";

export { J, sleep };
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROBE = path.join(HERE, "probes", "troubleshooting");
const PACKAGE = path.join(HERE, "probes", "packages", "DocProbePkg");
const MAIN = "/TroubleProbe/Sources/MainMod.twin";
const WM_CLOSE = 0x10;
const BM_CLICK = 0xf5;

// A linked package's reference, as Project Settings writes one.
const LINKED = {
  id: "{7B247500-0000-4000-9000-7B2475000004}",
  isLocalPackage: true,
  licence: "MIT",
  name: "[LINKED-PACKAGE] DocProbePkg",
  path32: "/Packages/DocProbePkg",
  path64: "/Packages/DocProbePkg",
  publishedDate: "01-JAN-2026",
  publishedTime: "00:00:00",
  publisher: "probe",
  symbolId: "DocProbePkg",
  versionBuild: "0",
  versionMajor: "1",
  versionMinor: "0",
  versionRevision: "0",
};

const SERVICES_JS = `(() => {
  const b = document.getElementById("compilerStatusOuter");
  return { badge: b.innerText.trim(), tip: b.title.split("\\n").map((l) => l.trim()).filter(Boolean) };
})()`;

/** The helpers of starting-kit.mjs and these, bound to one lane. */
export function troubleshootingKit(lane) {
  const k = startingKit(lane, { probe: PROBE });
  const ev = (js, o) => k.c.evaluate(js, o);
  const boxesOn = async (desktop) => {
    const list = await desktopWindows(desktop, { children: true }).catch(() => []);
    const out = [];
    list.forEach((w, i) => {
      if (w.class !== "#32770" || !w.visible) return;
      const kids = [];
      for (let j = i + 1; j < list.length && list[j].depth === 1; j++) kids.push(list[j]);
      out.push({
        title: w.title,
        text: kids
          .filter((x) => x.class === "Static" && x.title)
          .map((x) => x.title)
          .join("\n")
          .replace(/\r\n/g, "\n"),
        buttons: kids.filter((x) => x.class === "Button").map((x) => ({ text: x.title, hwnd: x.hwnd })),
      });
    });
    return out;
  };
  // A WebView2 window whose title starts so: the IDE's own window has the project's name in its title.
  const devToolsOn = async (desktop) =>
    (await desktopWindows(desktop))
      .filter((w) => /^DevTools - /.test(w.title || "") && /msedgewebview2\.exe$/i.test(w.exe || ""))
      .map((w) => w.hwnd);

  return Object.assign(k, {
    /** The probe's project, in a folder of its own. */
    probe: (name, settings = {}, sources = {}) => k.project(name, settings, `p-${name}`, sources),
    /** A page with no project and no dialog, then `file` opened. */
    async fromClean(file) {
      await k.noProject();
      await k.open(file);
    },
    /** An unsaved edit: a comment holding `mark` in MainMod, typed. */
    async edit(mark) {
      await openFile(k.c, MAIN, { line: 5, column: 9 });
      await sleep(250);
      await typeText(k.c, `' ${mark}\n`);
      await sleep(350);
    },
    /** Whether the project's file holds `mark` in MainMod. */
    fileHas: (file, mark) => diskText(file, "Sources/MainMod.twin").includes(mark),
    /** Whether an open model of the editor holds `mark`. */
    editorHas: (mark) => ev(`monaco.editor.getModels().some((m) => m.getValue().includes(${J(mark)}))`),
    /** The next alert the page opens. tb-ide.mjs accepts each and keeps it in c.dialogs. */
    async alert(timeout = 10 * 1000) {
      const shown = await waitFor(k.c, (c) => c.dialogs.length > 0, { timeout, interval: 100 });
      assert.ok(shown, `no alert: ${J(await k.box())}`);
      await sleep(300);
      return k.c.dialogs.splice(0).map((d) => d.message);
    },
    /** Run `fn` with the read-only flag on `file`, and clear it whatever happens. */
    async readOnly(file, fn) {
      assert.equal(spawnSync("attrib", ["+R", file], { windowsHide: true }).status, 0);
      try {
        return await fn();
      } finally {
        spawnSync("attrib", ["-R", file], { windowsHide: true });
      }
    },
    services: () => ev(SERVICES_JS),
    pid: () => ev("g_CurrentCompilerProcessId"),
    running: () => ev("!!context.codeExecuting.value"),
    /** The Restart the compiler button, a real click. */
    restart: () => click(k.c, "restartIcon"),
    /** The build box on Safe Mode, and OK on the box that says so. */
    async safeMode() {
      const before = await k.pid();
      await ev(`buildConfigSelector.value = "nocompile"; buildConfigSelector.onchange(); 0`);
      await waitFor(k.c, async () => (await k.pid()) !== before, { timeout: 30 * 1000, interval: 100 });
      const shown = await waitFor(k.c, async () => (await k.box()).some((b) => /SafeMode/.test(b)), {
        timeout: 30 * 1000,
        interval: 100,
      });
      assert.ok(shown, `no Safe Mode box: ${J(await k.box())}`);
      await sleep(300);
      await k.button("OK");
      await sleep(600);
      assert.equal(await ev("buildConfigSelector.value"), "nocompile");
    },
    mark: () => consoleMark(k.c),
    /** The console's lines since a mark that are not empty: an empty console reads as one empty line. */
    since: async (mark) => (await linesSince(k.c, mark)).filter((l) => l.trim()),
    /** The name of the sub, as a DEBUG CONSOLE line runs it. */
    async runSub(name) {
      await ev(`debugSocket.request("evaluate", { expression: ${J(name)}, context: "repl" }, () => {}); 0`);
    },

    // ------------------------------------------------------------------ a linked package

    /** DocProbePkg in the lane's private APPDATA, where a linked package is kept. Its file's path. */
    packPackage() {
      const packages = path.join(lane.appdataDir(), "twinBASIC", "packages");
      mkdirSync(packages, { recursive: true });
      const stage = path.join(lane.work, "pkg");
      cpSync(PACKAGE, stage, { recursive: true });
      const pack = path.join(packages, "DocProbePkg.twinpack");
      packTree(pack, stage);
      return pack;
    },
    /** The probe's project with DocProbePkg linked, and a call of the package's. */
    linkedProject() {
      const settings = JSON.parse(readFileSync(path.join(PROBE, "Settings"), "utf8"));
      return k.probe(
        "Linked",
        { "project.references": [...settings["project.references"], LINKED] },
        {
          "UsesPackage.twin":
            "Module UsesPackage\r\n    Public Sub Show()\r\n        Debug.Print DocProbeVersion()\r\n    End Sub\r\nEnd Module\r\n",
        },
      );
    },

    // ------------------------------------------------------------------ DevTools

    /** The DevTools windows on the lane's desktop, as hwnds. */
    devTools: () => devToolsOn(lane.desktop),
    /** The DevTools windows on the user's desktop, as hwnds: never a title. */
    userDevTools: () => devToolsOn("Default"),
    /** Open DevTools by a key bound in the page only, as a person who bound one would. */
    async openDevTools(press) {
      await ev(
        `(() => { customKeyboardShortcutGroups = { DevTools: { data: ${J(J({ tbIdeDevTools_Show: ["{KEYDOWN}{CTRL}{SHIFT}F12"] }))} } }; activeKeyboardShortcutGroupNames = "|DevTools|"; syncActiveKeyboardShortcuts(); })()`,
      );
      await press();
      const shown = await waitFor(k.c, async () => (await k.devTools()).length > 0, {
        timeout: 15 * 1000,
        interval: 200,
      });
      assert.ok(shown, "DevTools did not open");
    },
    /** Close every DevTools window of the lane. */
    async closeDevTools() {
      for (const hwnd of await k.devTools().catch(() => []))
        await postWindowMessage(lane.desktop, hwnd, WM_CLOSE, 0, 0).catch(() => {});
      await waitFor(k.c, async () => !(await k.devTools().catch(() => [])).length, { timeout: 8000, interval: 200 });
    },

    // ------------------------------------------------------------------ the host's boxes

    /** The visible native dialog boxes on the lane's desktop: title, text, buttons. */
    nativeBoxes: async () => boxesOn((await lane.leased()).desktop),
    /** Wait for a native box. */
    async nativeBox(timeout = 30 * 1000) {
      const shown = await waitFor(null, async () => (await k.nativeBoxes())[0] ?? null, { timeout, interval: 200 });
      assert.ok(shown, "no native box came");
      return shown;
    },
    /** Press the first button of a native box read by nativeBox. */
    pressBox: async (box) => {
      await postWindowMessage((await lane.leased()).desktop, box.buttons[0].hwnd, BM_CLICK, 0, 0);
      await sleep(600);
    },

    // ------------------------------------------------------------------ the install's files

    /** Run `fn` with the files `rels` gone from the lane's own copy of the install, and put them back. */
    async without(rels, fn) {
      const files = rels.map((rel) => path.join(path.dirname(lane.copy()), rel));
      for (const file of files) {
        const inside = path.relative(lane.work, file);
        assert.ok(inside && !inside.startsWith("..") && !path.isAbsolute(inside), "not a file of the lane's copy");
      }
      const moved = [];
      try {
        for (const file of files) {
          renameSync(file, `${file}.gone`);
          moved.push(file);
        }
        return await fn();
      } finally {
        for (const file of moved) renameSync(`${file}.gone`, file);
      }
    },
    /** Whether `rel` is in the lane's copy of the install. */
    inCopy: (rel) => existsSync(path.join(path.dirname(lane.copy()), rel)),
    /**
     * Start the lane's copy on its desktop, as from its icon, for a start that stops before there is
     * a page, so launchIde, which waits a minute for one, is no use. It has IDE_FLAGS and the lane's
     * APPDATA. The box it opens, then OK on it; whether the process then ended by itself.
     */
    async stoppedStart() {
      const { desktop } = await lane.leased();
      const run = await launchOnDesktop({
        exe: lane.copy(),
        desktop,
        env: { ...process.env, APPDATA: lane.appdataDir(), TB_ADDIN_TEST: "1" },
        args: IDE_FLAGS,
      });
      let ended = false;
      const done = run.exited.then(() => {
        ended = true;
      });
      try {
        const box = await k.nativeBox();
        await k.pressBox(box);
        await Promise.race([done, sleep(10 * 1000)]);
        return { box, ended };
      } finally {
        if (!ended) killTree(run.pid);
        await Promise.race([done, sleep(10 * 1000)]);
      }
    },
    /** What starts an IDE with these flags on its command line and no project, for k.startIde. */
    startWith: (flags) => async () => {
      lane.run = await launchIde({
        exe: lane.copy(),
        slot: await lane.leased(),
        show: lane.show,
        env: { APPDATA: lane.appdataDir() },
        browserArgs: lane.browserArgs,
        flags,
      });
      lane.port = lane.run.port;
      lane.c = await attachIde(lane.port);
      assert.ok(lane.c, "the IDE never exposed a debug port");
      if (lane.page) await fixPageSize(lane.c, lane.page);
      return lane.c;
    },
  });
}
