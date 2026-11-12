// A run of the screenshot review tool (WIP.ShotReview.md, Runs): shoot_docs.mjs, replay.mjs or
// chromeshot.mjs --take as a child process, never their code in the tool's process, given the run's stage
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
import { browserShot, SHOTS } from "../svgshot/chrome/shots.mjs";
import { readRecords, sendStop } from "./record-lines.mjs";
import { appendEvent, RUN_TOOLS, runPaths, STAGED_TOOLS } from "./shot-session.mjs";

/** The kind of record a run writes its events as (--events). */
export const EVENT_KIND = "shot-event";

/** The variable a run of a session is started with, its number: the tool runs as it is asked. */
export const SESSION_RUN = "SHOT_SESSION_RUN";

/** The kind of record that ends what a terminal following a run is sent: {exit}, the run's code. */
export const EXIT_KIND = "shot-exit";

/** Where the open review tool says it listens, beside the session: {pid, port}. */
export const TERMINAL_RUN_PATH = "/api/terminal-run";

/** The address a terminal follows run `n` at. */
export const followPath = (n) => `/api/run/${n}/follow`;

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
 * The table of the pictures taken in a person's browser (chrome/shots.mjs), in the form of
 * listShots', beside the table of the IDE's.
 */
export const browserTable = () => SHOTS.map(({ out }) => ({ out, setup: "browser", once: false, window: false }));

/**
 * The arguments a run of `tool` is started with, after the script: its own `args`, then, for a
 * staged tool, the stage and --events.
 */
export const runArgs = (tool, args, stage) => (STAGED_TOOLS.has(tool) ? [...args, "--stage", stage, "--events"] : args);

/** The kinds of run the review tool starts: [kind, what it is called]. */
export const RUN_KINDS = [
  ["retake", "Retake"],
  ["browser", "Browser retake"],
  ["replay", "Replay"],
  ["cleanup", "Clean-up"],
];

/** A pattern that matches each of `pictures` (paths under docs/) exactly, and nothing else. */
export const onlyOf = (pictures) =>
  `^(?:${pictures.map((out) => out.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`;

// A field of a request left empty: undefined, null or blank.
const empty = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

// The run of chromeshot.mjs --take a request asks for: the pictures `pictures`, of the panel's
// table, else those `only` matches, else all of them. `browser` is {captures, extension, noOpen}.
function browserRun({ only, pictures }, baseline, { captures, extension, noOpen } = {}) {
  let pattern = ".";
  if (pictures !== undefined) {
    const shots = pictures.map(browserShot);
    if (shots.includes(null))
      throw new Error("a browser retake and a retake in the IDE are runs of their own: choose one or the other");
    pattern = onlyOf([...new Set(shots.map((s) => s.out))]);
  } else if (!empty(only)) {
    regexOption(String(only), { option: "--take" });
    pattern = String(only);
  }
  return {
    tool: "chromeshot",
    args: [
      "--take",
      pattern,
      "--against",
      baseline.hash,
      ...(empty(captures) ? [] : ["--captures", captures]),
      ...(empty(extension) ? [] : ["--extension", extension]),
      ...(noOpen ? ["--no-open"] : []),
    ],
  };
}

/**
 * The run a request asks for, as {tool, args}, args as the command line gives them (startRun
 * adds the stage): `kind` "retake" (shoot_docs.mjs, compared with the session's `baseline`,
 * {hash}), "replay" (svgshot/replay.mjs, its SVGs compared with the baseline's first) or "cleanup" (shoot_docs.mjs --cleanup against the
 * baseline, `dryRun` for the list of what it would put back); the pictures `only`, a pattern, or
 * `pictures`, their paths under docs/, or neither for every picture; `svg` a retake's --svg (on
 * unless false), `jobs` its or a replay's --jobs, `ide` a retake's twinBASIC.exe, and `recheck`
 * a replay's. A retake of pictures taken in a browser is "browser", whatever asked for it, since
 * the IDE cannot take them (`browser`, as browserRun has it, says where). Throws, with a message
 * for a person, on a request that is not one.
 */
export function runOf(
  { kind, only, pictures, svg = true, jobs, ide, recheck = false, dryRun = false },
  baseline,
  browser = {},
) {
  if (!RUN_KINDS.some(([k]) => k === kind)) throw new Error(`no such kind of run: ${kind}`);
  const ofBrowser = kind === "retake" && Array.isArray(pictures) && pictures.some(browserShot);
  if (kind === "browser" || ofBrowser) return browserRun({ only, pictures }, baseline, browser);
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
  if (kind === "replay")
    return { tool: "replay", args: [...onlyArgs, ...(recheck ? ["--recheck"] : []), ...against, ...jobArgs] };
  return { tool: "cleanup", args: ["--cleanup", ...(dryRun ? ["--dry-run"] : []), ...onlyArgs, ...against] };
}

// The options a run of the session is not given from a terminal, and why: the session gives the
// first two, and the others would write elsewhere than the session's own folders and cache.
const SESSION_OWNS = [
  ["--stage", "the session gives a run its stage"],
  ["--events", "the session reads a run's events"],
  ["--diffs", "a run of the session keeps its difference maps in its stage"],
  ["--bundles", "a run of the session keeps its bundles in the session's cache, .svgshot-bundles"],
  ["--out", "a run of the session writes under docs"],
  ["--against-disk", "a run of the session is compared with the session's baseline"],
];

/**
 * The run a terminal asks for, as {tool, args} for startRun: `tool` the name a run records
 * (RUN_TOOLS; shoot_docs.mjs --cleanup is "cleanup") and `args` the command line as typed, which is
 * kept but for --against, added as the session's `baseline` ({hash, short}) when it is not given.
 * Throws, with a message for a person, on an option the session gives or forbids, and on an
 * --against that names another revision than the baseline.
 */
export function terminalRunOf(tool, args, baseline) {
  if (!RUN_TOOLS[tool]) throw new Error(`no such tool: ${tool}`);
  if (!Array.isArray(args) || args.some((a) => typeof a !== "string"))
    throw new Error("the command line is not a list of strings");
  const named = (a, option) => a === option || a.startsWith(`${option}=`);
  for (const [option, why] of SESSION_OWNS)
    if (args.some((a) => named(a, option))) throw new Error(`${option} is not for a run of the session: ${why}`);
  const k = args.findIndex((a) => named(a, "--against"));
  if (k < 0) return { tool, args: [...args, "--against", baseline.hash] };
  const rev = args[k].includes("=") ? args[k].slice(args[k].indexOf("=") + 1) : args[k + 1];
  if (rev !== baseline.hash && rev !== baseline.short)
    throw new Error(
      `--against ${rev}: a run of the session is compared with the session's baseline, ${baseline.short}; leave --against out`,
    );
  return { tool, args };
}

/** The kind of the run `run` (a session's record), as RUN_KINDS names it. */
export const kindOf = (run) =>
  run.tool === "shoot_docs" ? "retake" : run.tool === "chromeshot" ? "browser" : run.tool;

/**
 * Starts a run of `tool` with `args` in `session` (openSession): adds it to the session and
 * spawns the tool from the repository's root. `onEvent(run, value)` is called for each event,
 * `onLine(run, line, stream)` for each other line, `stream` "stdout" or "stderr", and `onExit(run)` once
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
  // SESSION_RUN tells the tool it is a run of the session, so that it runs as it is asked and does
  // not hand itself to a session again (shot-front.mjs).
  const child = spawn(node, [script, ...runArgs(tool, args, files.stage)], {
    cwd: REPO_ROOT,
    env: { ...process.env, [SESSION_RUN]: String(run.n) },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  // A stop sent as the run ends meets a closed pipe.
  child.stdin.on("error", () => {});
  let stopped = false;
  const line = (text, stream = "stdout") => {
    appendFileSync(files.log, `${text}\n`);
    onLine(run, text, stream);
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
    onLine: (text) => line(text, "stdout"),
  });
  readRecords(child.stderr, [], { onRecord: () => {}, onLine: (text) => line(text, "stderr") });
  const exited = new Promise((resolve) => {
    child.on("error", (e) => line(`the run could not start: ${e.message}`, "stderr"));
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
