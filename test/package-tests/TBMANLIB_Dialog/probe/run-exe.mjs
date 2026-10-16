// Runs a built probe exe on a private desktop, WITHOUT tbrun --exe's dialog closer.
//
//   node test/package-tests/TBMANLIB_Dialog/probe/run-exe.mjs <exe> <probe-ids> [--timeout S]
//
// tbrun --exe closes every dialog the exe opens within 250 ms by pressing its OK button, which
// would race the probe's own automation (src/Auto.twin) and answer the Yes/No boxes itself. This
// runner starts the exe the same way tbrun does (launchOnDesktop: a private desktop from
// tbbroker, held while the exe runs, in a kill-on-close job, so nothing appears on the user's
// desktop) but with no `dialogs` option, and
// reads what the exe wrote with TbRun.Out from the file TBRUN_OUT names. A run that is still going
// after the timeout is ended by its pid (the job takes its children with it), and the windows it
// left on the desktop are listed.
//
// It prints the exe's output, then "--- exit code", and "--- fault recorded" when the event
// log has one for the exe (win-fault.mjs, as tbrun --exe reads it). The probe's work folder,
// %TEMP%\dlgprobe<pid of this runner>, is removed afterwards.
//
// Environment: PROBE_SHOTS=1 makes the exe wait several seconds before it acts on each window;
// SHOTS=<dir> then photographs every new dialog or menu window (PrintWindow, through
// captureWindow) into it.
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../../../../lib/cli.mjs";
import { captureWindow, desktopWindows, killTree, launchOnDesktop } from "../../../../scripts/lib/tb-ide.mjs";
import { faultText, recordedFault } from "../../../../scripts/lib/win-fault.mjs";

const USAGE = `usage: node test/package-tests/TBMANLIB_Dialog/probe/run-exe.mjs <exe> <probe-ids> [--timeout S] [-h, --help]

Runs the TBMANLIB_Dialog probe exe on a private desktop, with the scenarios <probe-ids> names
(comma-separated, as listed at the top of src/Probe.twin), and prints what they report.

  --timeout S      end the exe after S seconds (default 25)
  -h, --help       print this text and exit

Exit codes:
  0  the exe ran to its end and exited 0
  1  the exe exited with another code (a crash included) or was still running at the timeout
  2  the command line was refused, or the runner failed`;

exitOnCrash();
const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        timeout: { type: "string", default: "25" },
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
const outFile = path.join(tmpdir(), `dlgprobe-out-${process.pid}.txt`);
const workDir = path.join(tmpdir(), `dlgprobe${process.pid}`);
rmSync(outFile, { force: true });
const since = Date.now();

const run = await launchOnDesktop({
  exe: path.resolve(exe),
  tag: `TBMANLIB_Dialog probe ${probe}`,
  env: { ...process.env, TBRUN_OUT: outFile, PROBE: probe, PROBE_TAG: String(process.pid) },
});
// The exe's desktop, held for as long as it runs.
const { desktop } = run;

// With SHOTS=<dir>: poll the desktop, and photograph each new visible dialog or menu window.
const shotsDir = process.env.SHOTS;
let polling = !!shotsDir;
const shotLog = [];
const winLog = [];
const seenAny = new Set();
const seenShot = new Set();
if (shotsDir) {
  mkdirSync(shotsDir, { recursive: true });
  let n = 0;
  (async () => {
    while (polling) {
      try {
        for (const w of await desktopWindows(desktop, { children: false })) {
          if (w.visible && !seenAny.has(w.hwnd)) {
            seenAny.add(w.hwnd);
            winLog.push(`${w.class} exe=${w.exe} title=${JSON.stringify(w.title)}`);
          }
          if ((w.class === "#32770" || w.class === "#32768") && w.visible && !seenShot.has(w.hwnd)) {
            seenShot.add(w.hwnd);
            const name = `${String(++n).padStart(2, "0")}-${(w.title || "untitled").replace(/[^A-Za-z0-9]+/g, "_")}.png`;
            try {
              await captureWindow(desktop, w.hwnd, path.join(shotsDir, name));
              shotLog.push(name);
            } catch (e) {
              shotLog.push(`${name} FAILED ${e.message}`);
            }
          }
        }
      } catch {
        // the desktop may be gone
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  })();
}

let timer;
const timedOut = await Promise.race([
  run.exited.then(() => false),
  new Promise((r) => {
    timer = setTimeout(() => r(true), timeoutMs);
  }),
]);
clearTimeout(timer);
polling = false;
let leftover = [];
if (timedOut) {
  try {
    leftover = await desktopWindows(desktop, { children: false });
  } catch (e) {
    leftover = [{ class: "?", title: String(e.message), visible: true }];
  }
  killTree(run.pid);
  run.launcher.kill();
}
const { code } = await run.finished;
process.stdout.write(existsSync(outFile) ? readFileSync(outFile, "utf8") : "");
const f = timedOut ? null : recordedFault(path.resolve(exe), since);
const hex = code !== null && (code < 0 || code > 0xffff) ? ` (0x${(code >>> 0).toString(16)})` : "";
console.log(`--- exit code: ${timedOut ? `(still running after ${timeoutS}s, ended)` : code}${hex}`);
if (f) console.log(`--- fault recorded: ${faultText(f)}`);
if (shotLog.length) console.log(`--- shots: ${shotLog.join(", ")}`);
if (winLog.length) console.log(`--- visible windows seen on the private desktop:\n    ${winLog.join("\n    ")}`);
if (timedOut) {
  console.log("--- windows left on the desktop (visible ones):");
  for (const w of leftover.filter((x) => x.visible)) console.log(`    ${w.class} title=${JSON.stringify(w.title)}`);
}
rmSync(outFile, { force: true });
rmSync(workDir, { recursive: true, force: true });
process.exitCode = timedOut || code !== 0 ? 1 : 0;
