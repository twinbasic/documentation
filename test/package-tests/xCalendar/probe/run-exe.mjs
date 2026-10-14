// Runs a built xCalendar probe exe on a private desktop.
//
//   node test/package-tests/xCalendar/probe/run-exe.mjs <exe> <probe-ids> [--timeout S] [--desktop NAME] [--shots DIR]
//
// The exe is started as tbrun --exe starts it (launchOnDesktop: a private desktop, in a
// kill-on-close job, so nothing appears on the user's desktop), and what it wrote with TbRun.Out
// is read from the file TBRUN_OUT names. Unlike the Dialog probe's runner this one lets
// launchOnDesktop close the boxes the exe opens (an unhandled error in the control opens one) and
// lists them, since the probe's own automation operates no dialog.
//
// A line "SHOT <name> hwnd=<n>" in the exe's output asks for a picture of the form window: with
// --shots the runner photographs that window (PrintWindow, through captureWindow) into
// <DIR>/<name>.png and writes the file PROBE_ACK<name>, which the exe is waiting for. Without
// --shots no acknowledgement is ever written, and the exe stops waiting after 12 s.
//
// It prints the exe's output, then "--- exit code", "--- fault recorded" when the event log has
// one for the exe (win-fault.mjs, as tbrun --exe reads it), and "--- boxes" for any box the exe
// opened. A run still going after the timeout is ended by its pid.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os, { tmpdir } from "node:os";
import path from "node:path";
import { exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../../../../lib/cli.mjs";
import { captureWindow, desktopWindows, killTree, launchOnDesktop } from "../../../../scripts/lib/tb-ide.mjs";
import { faultText, recordedFault } from "../../../../scripts/lib/win-fault.mjs";

const USAGE = `usage: node test/package-tests/xCalendar/probe/run-exe.mjs <exe> <probe-ids> [--timeout S] [--desktop NAME] [--shots DIR] [-h, --help]

Runs the xCalendar probe exe on a private desktop, with the scenarios <probe-ids> names
(comma-separated, as listed at the top of src/Probe.twin), and prints what they report.

  --timeout S      end the exe after S seconds (default 33)
  --desktop NAME   the private desktop's name (default xcalprobe-<pid>)
  --shots DIR      photograph the form window when the exe asks (scenario 15) into DIR
  -h, --help       print this text and exit

Exit codes:
  0  the exe ran to its end, exited 0, and opened no box
  1  the exe exited with another code, opened a box, faulted, or was still running at the timeout
  2  the command line was refused, or the runner failed`;

exitOnCrash();
const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        timeout: { type: "string", default: "33" },
        desktop: { type: "string" },
        shots: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      positionals: 2,
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);
const timeoutS = withUsageError(() => numberOption(values.timeout, { option: "--timeout", above: 0 }), usageError);

const [exe, probe] = positionals;
const timeoutMs = timeoutS * 1000;
const desktop = values.desktop || `xcalprobe-${process.pid}`;
const outFile = path.join(tmpdir(), `xcalprobe-out-${process.pid}.txt`);
const ackBase = path.join(tmpdir(), `xcalprobe-ack-${process.pid}-`);
rmSync(outFile, { force: true });
const since = Date.now();
if (values.shots) mkdirSync(values.shots, { recursive: true });

const run = await launchOnDesktop({
  exe: path.resolve(exe),
  desktop,
  env: { ...process.env, TBRUN_OUT: outFile, PROBE: probe, PROBE_ACK: ackBase },
  dialogs: "close",
});

// Pictures: watch the output for SHOT lines.
let watching = true;
const shotNotes = [];
const user = os.userInfo().username.toLowerCase();
const done = new Set();
const watcher = (async () => {
  while (watching) {
    try {
      const text = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
      for (const m of text.matchAll(/^SHOT (\w+) hwnd=(\d+)\s*$/gm)) {
        if (done.has(m[1])) continue;
        done.add(m[1]);
        if (values.shots) {
          const file = path.join(values.shots, `${m[1]}.png`);
          try {
            const info = await captureWindow(desktop, Number(m[2]), file);
            const hit = (info.texts ?? []).some((t) => user && t.toLowerCase().includes(user));
            shotNotes.push(
              `${m[1]}.png ${info.width}x${info.height} dpi=${info.dpi} frame=${info.frame} client=${info.client} user-name-in-window-texts=${hit}`,
            );
            if (hit) rmSync(file, { force: true });
          } catch (e) {
            shotNotes.push(`${m[1]}.png FAILED ${e.message}`);
          }
        }
        writeFileSync(ackBase + m[1], "x");
      }
    } catch {
      // the file may be mid-write
    }
    await new Promise((r) => setTimeout(r, 150));
  }
})();

let timer;
const timedOut = await Promise.race([
  run.exited.then(() => false),
  new Promise((r) => {
    timer = setTimeout(() => r(true), timeoutMs);
  }),
]);
clearTimeout(timer);
let leftover = [];
let cpuNote = "";
if (timedOut) {
  try {
    leftover = await desktopWindows(desktop, { children: false });
  } catch (e) {
    leftover = [{ class: "?", title: String(e.message), visible: true }];
  }
  // Is it spinning or waiting? The exe's processor time, twice, a second apart.
  const cpu = () => {
    const r = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `(Get-Process -Id ${run.pid}).TotalProcessorTime.TotalMilliseconds`,
      ],
      { encoding: "utf8", windowsHide: true },
    );
    return Number.parseFloat(String(r.stdout).trim());
  };
  const c0 = cpu();
  await new Promise((r) => setTimeout(r, 1500));
  const c1 = cpu();
  cpuNote = `processor time of pid ${run.pid}: ${Math.round(c0)} ms, then ${Math.round(c1)} ms 1.5 s later`;
  killTree(run.pid);
  run.launcher.kill();
}
const { code, dialogs } = await run.finished;
watching = false;
await watcher;
process.stdout.write(existsSync(outFile) ? readFileSync(outFile, "utf8") : "");
const f = timedOut ? null : recordedFault(path.resolve(exe), since);
const hex = code !== null && (code < 0 || code > 0xffff) ? ` (0x${(code >>> 0).toString(16)})` : "";
console.log(`--- exit code: ${timedOut ? `(still running after ${timeoutS}s, ended)` : code}${hex}`);
if (f) console.log(`--- fault recorded: ${faultText(f)}`);
if (dialogs?.length) {
  console.log("--- boxes the exe opened (each closed):");
  for (const d of dialogs) console.log(`    title=${JSON.stringify(d.title)} text=${JSON.stringify(d.text)}`);
}
for (const n of shotNotes) console.log(`--- shot: ${n}`);
if (timedOut) {
  console.log(`--- ${cpuNote}`);
  console.log("--- windows left on the desktop at the timeout (visible ones):");
  for (const w of leftover.filter((x) => x.visible)) console.log(`    ${w.class} title=${JSON.stringify(w.title)}`);
}
rmSync(outFile, { force: true });
for (const n of done) rmSync(ackBase + n, { force: true });
process.exitCode = timedOut || code !== 0 || dialogs?.length ? 1 : 0;
