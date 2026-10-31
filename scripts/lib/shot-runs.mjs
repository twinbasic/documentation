// A run of the screenshot review tool (WIP.ShotReview.md, Runs): shoot_docs.mjs or replay.mjs
// as a child process, never their code in the tool's process, given the run's stage
// (--stage) and asked for its events (--events). Its events are kept in the run's events
// file as they arrive and its other lines in its log, so that a session opened again finds
// them (shot-session.mjs). A run is stopped by a line on its stdin (record-lines.mjs), which
// lets it end its IDEs and put the registry back.

import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { readRecords, sendStop } from "./record-lines.mjs";
import { appendEvent, RUN_TOOLS, runPaths } from "./shot-session.mjs";

/** The kind of record a run writes its events as (--events). */
export const EVENT_KIND = "shot-event";

/**
 * The arguments a run of `tool` is started with, after the script: its own `args`, then the
 * stage and --events.
 */
export const runArgs = (args, stage) => [...args, "--stage", stage, "--events"];

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
  // A process group of its own, so that the Ctrl+C that closes the tool does not end the run
  // before it has put the registry back: the tool stops it by its stdin instead.
  const child = spawn(node, [script, ...runArgs(args, files.stage)], {
    cwd: REPO_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: true,
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
      onEvent(run, value);
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
