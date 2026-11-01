// A run of the screenshot review tool (WIP.ShotReview.md, Runs): shoot_docs.mjs or replay.mjs
// as a child process, never their code in the tool's process, given the run's stage
// (--stage) and asked for its events (--events). Its events are kept in the run's events
// file as they arrive and its other lines in its log, so that a session opened again finds
// them (shot-session.mjs). A run is stopped by a line on its stdin (record-lines.mjs), which
// lets it end its IDEs and put the registry back. A clean-up (shoot_docs.mjs --cleanup) is a
// run with neither: it starts no IDE and ends in seconds.
//
// What a run is started with is runOf's, for the runs page and the tool's command line alike.

import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { numberOption, regexOption } from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { readRecords, sendStop } from "./record-lines.mjs";
import { appendEvent, RUN_TOOLS, runPaths, STAGED_TOOLS } from "./shot-session.mjs";

/** The kind of record a run writes its events as (--events). */
export const EVENT_KIND = "shot-event";

/**
 * The table of shots, as `shoot_docs.mjs --list` prints it: a promise of [{out, setup, once,
 * window}]. It runs as a child, hidden as a run is (startRun), and starts no IDE; `command` is
 * the probes' stand-in for it, {node, script}.
 */
export function listShots({ command } = {}) {
  const node = command?.node ?? process.execPath;
  const script = command?.script ?? path.join(REPO_ROOT, RUN_TOOLS.shoot_docs);
  return new Promise((resolve, reject) => {
    const child = spawn(node, [script, "--list"], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const out = [];
    const err = [];
    child.stdout.on("data", (d) => out.push(d));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", reject);
    child.on("close", (code) => {
      const text = Buffer.concat(out).toString("utf8");
      if (code !== 0)
        return reject(new Error(`shoot_docs.mjs --list exited ${code}: ${Buffer.concat(err).toString("utf8").trim()}`));
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        reject(new Error(`shoot_docs.mjs --list printed no table: ${e.message}`));
      }
    });
  });
}

/**
 * The arguments a run of `tool` is started with, after the script: its own `args`, then, for a
 * staged tool, the stage and --events.
 */
export const runArgs = (tool, args, stage) => (STAGED_TOOLS.has(tool) ? [...args, "--stage", stage, "--events"] : args);

/** The kinds of run the review tool starts: [kind, what it is called]. */
export const RUN_KINDS = [
  ["retake", "Retake"],
  ["replay", "Replay"],
  ["cleanup", "Clean-up"],
];

/** A pattern that matches each of `pictures` (paths under docs/) exactly, and nothing else. */
export const onlyOf = (pictures) =>
  `^(?:${pictures.map((out) => out.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`;

// A field of a request left empty: undefined, null or blank.
const empty = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/**
 * The run a request asks for, as {tool, args}, args as the command line gives them (startRun
 * adds the stage): `kind` "retake" (shoot_docs.mjs, compared with the session's `baseline`,
 * {hash}), "replay" (svgshot/replay.mjs) or "cleanup" (shoot_docs.mjs --cleanup against the
 * baseline, `dryRun` for the list of what it would put back); the pictures `only`, a pattern, or
 * `pictures`, their paths under docs/, or neither for every picture; `svg` a retake's --svg (on
 * unless false), `jobs` its or a replay's --jobs, `ide` a retake's twinBASIC.exe, and `recheck`
 * a replay's. Throws, with a message for a person, on a request that is not one.
 */
export function runOf({ kind, only, pictures, svg = true, jobs, ide, recheck = false, dryRun = false }, baseline) {
  if (!RUN_KINDS.some(([k]) => k === kind)) throw new Error(`no such kind of run: ${kind}`);
  const refuse = (what, ok) => {
    if (!ok) throw new Error(`a ${RUN_KINDS.find(([k]) => k === kind)[1].toLowerCase()} takes no ${what}`);
  };
  refuse("IDE", kind === "retake" || empty(ide));
  refuse("--svg", kind === "retake" || svg === true);
  refuse("--recheck", kind === "replay" || !recheck);
  refuse("--dry-run", kind === "cleanup" || !dryRun);
  refuse("--jobs", kind !== "cleanup" || empty(jobs));
  if (!empty(only) && pictures !== undefined) throw new Error("give a pattern or the pictures, not both");
  let pattern = null;
  if (pictures !== undefined) {
    if (!Array.isArray(pictures) || !pictures.length || pictures.some((p) => typeof p !== "string" || !p))
      throw new Error("no picture was given");
    pattern = onlyOf(pictures);
  } else if (!empty(only)) {
    regexOption(String(only), { option: "--only" });
    pattern = String(only);
  }
  const onlyArgs = pattern === null ? [] : ["--only", pattern];
  const jobArgs = empty(jobs)
    ? []
    : ["--jobs", String(numberOption(String(jobs), { option: "--jobs", integer: true, min: 1, max: 16 }))];
  const against = ["--against", baseline.hash];
  if (kind === "retake")
    return {
      tool: "shoot_docs",
      args: [...(svg ? ["--svg"] : []), ...onlyArgs, ...against, ...jobArgs, ...(empty(ide) ? [] : ["--ide", ide])],
    };
  if (kind === "replay") return { tool: "replay", args: [...onlyArgs, ...(recheck ? ["--recheck"] : []), ...jobArgs] };
  return { tool: "cleanup", args: ["--cleanup", ...(dryRun ? ["--dry-run"] : []), ...onlyArgs, ...against] };
}

/** The kind of the run `run` (a session's record), as RUN_KINDS names it. */
export const kindOf = (run) => (run.tool === "shoot_docs" ? "retake" : run.tool);

/**
 * Starts a run of `tool` with `args` in `session` (openSession): adds it to the session and
 * spawns the tool from the repository's root. `onEvent(run, value)` is called for each event,
 * `onLine(run, line)` for each other line, stdout and stderr alike, and `onExit(run)` once
 * it has ended and the session records how. `command` stands in for the script's path in the
 * probes: {node, script}. Returns {run, stop(), kill(), exited}: `stop` asks the run to stop,
 * `kill` ends its process (which skips putting the registry back), `exited` a promise of
 * its exit code.
 */
export function startRun(
  session,
  { tool, args },
  { onEvent = () => {}, onLine = () => {}, onExit = () => {}, command } = {},
) {
  const run = session.addRun({ tool, args });
  const files = runPaths(session.root, run.n);
  mkdirSync(files.dir, { recursive: true });
  const node = command?.node ?? process.execPath;
  const script = command?.script ?? path.join(REPO_ROOT, RUN_TOOLS[tool]);
  // The Ctrl+C that closes the tool must not end the run before it has put the registry back:
  // the tool stops it by its stdin instead. On Windows, windowsHide with no stdio inherited is
  // CREATE_NO_WINDOW: a console of its own with no window, which the terminal's Ctrl+C does not
  // reach and which every console program the run starts (git, PowerShell, reg) inherits.
  // Never detached there: that is DETACHED_PROCESS, no console at all, and each of those
  // programs then opens a console window on the user's desktop. Elsewhere, a process group of
  // its own.
  const child = spawn(node, [script, ...runArgs(tool, args, files.stage)], {
    cwd: REPO_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  // A stop sent as the run ends meets a closed pipe.
  child.stdin.on("error", () => {});
  let stopped = false;
  const line = (text) => {
    appendFileSync(files.log, `${text}\n`);
    onLine(run, text);
  };
  readRecords(child.stdout, [EVENT_KIND], {
    onRecord: (_, value) => {
      appendEvent(files.events, value);
      if (value.type === "summary") stopped ||= !!value.stopped;
      // A fault in taking an event must not end the tool: the run would lose its pipe and end
      // without putting the registry back.
      try {
        onEvent(run, value);
      } catch (e) {
        line(`the review tool could not take the event ${JSON.stringify(value.type)}: ${e.stack ?? e}`);
      }
    },
    onLine: line,
  });
  readRecords(child.stderr, [], { onRecord: () => {}, onLine: line });
  const exited = new Promise((resolve) => {
    child.on("error", (e) => line(`the run could not start: ${e.message}`));
    child.on("close", (code) => {
      session.endRun(run.n, { exit: code, stopped });
      onExit(run);
      resolve(code);
    });
  });
  return {
    run,
    child,
    stop() {
      stopped = true;
      sendStop(child);
    },
    kill: () => child.kill(),
    exited,
  };
}
