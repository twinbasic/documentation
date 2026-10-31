// The screenshot review tool's session (WIP.ShotReview.md, Sessions): a folder in the
// gitignored .shot-review/, which can hold the Windows user name (a run's stage holds its
// bundles), so it is never under docs/ and never committed. One session at a time, held by
// one tool at a time (its lock). Closing the tool loses nothing: opening it again opens the
// session, and each run's pictures are read back from its stage.
//
//   session/session.json           the baseline commit and its build, the runs, the queue's place
//   session/lock                   the process id of the tool that holds the session
//   session/runs/<n>/stage/        the run's stage (shot-stage.mjs)
//   session/runs/<n>/events.jsonl  each event the run reported (--events), a JSON object a line
//   session/runs/<n>/log.txt       the run's lines meant for a person, stdout and stderr
//   archive/<id>/                  a closed session: a commit closes one
//
// session.json is {format, created, baseline: {hash, short, build}, runs, place}: `build` the
// newest build the manifest at the baseline records, or null; each run {n, tool, args,
// started, ended, exit, stopped, interrupted}, `args` its options as the command line gives
// them, without --stage and --events, which the tool adds; `place` the picture the queue was
// left at, or null.

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";

/** The folder that holds the session and the archived ones. */
export const REVIEW_ROOT = path.join(REPO_ROOT, ".shot-review");

export const SESSION_FORMAT = 1;

/** The tools a session runs, by the name a run records, as their paths from the repository's root. */
export const RUN_TOOLS = {
  shoot_docs: "scripts/shoot_docs.mjs",
  replay: "scripts/svgshot/replay.mjs",
};

/** The files of the session under `root` (REVIEW_ROOT). */
export const sessionPaths = (root) => {
  const dir = path.join(root, "session");
  return {
    dir,
    file: path.join(dir, "session.json"),
    lock: path.join(dir, "lock"),
    runs: path.join(dir, "runs"),
    archive: path.join(root, "archive"),
  };
};

/** The files of the run `n` of the session under `root`. */
export const runPaths = (root, n) => {
  const dir = path.join(sessionPaths(root).runs, String(n));
  return {
    dir,
    stage: path.join(dir, "stage"),
    events: path.join(dir, "events.jsonl"),
    log: path.join(dir, "log.txt"),
  };
};

const shellQuote = (s) => (/^[A-Za-z0-9_./:=,+-]+$/.test(s) ? s : `"${s.replace(/(["\\$`])/g, "\\$1")}"`);

/** The command line a run is the same as, to be run from the repository's root in a terminal. */
export const commandOf = (run) => ["node", RUN_TOOLS[run.tool], ...run.args].map(shellQuote).join(" ");

/** The newest build a manifest's `pictures` record, or null when none records one. */
export function newestBuild(pictures) {
  let newest = null;
  for (const e of Object.values(pictures ?? {})) if (e.build && (newest === null || e.build > newest)) newest = e.build;
  return newest;
}

/** The session in `text`, checked: throws, naming `name`, on anything that is not one. */
export function parseSession(text, name = "session.json") {
  let s;
  try {
    s = JSON.parse(text);
  } catch (e) {
    throw new Error(`${name} is not JSON: ${e.message}`);
  }
  if (s?.format !== SESSION_FORMAT) throw new Error(`${name} is not a session of format ${SESSION_FORMAT}`);
  if (!/^[0-9a-f]{40,64}$/.test(s.baseline?.hash ?? "")) throw new Error(`${name} has no baseline commit`);
  if (!Array.isArray(s.runs)) throw new Error(`${name} has no list of runs`);
  for (const r of s.runs)
    if (!Number.isInteger(r.n) || !RUN_TOOLS[r.tool] || !Array.isArray(r.args))
      throw new Error(`${name} has a run that is not one: ${JSON.stringify(r)}`);
  return s;
}

// Whether the process `pid` is running: signal 0 tests it, EPERM meaning it runs as another user.
const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
};

/**
 * Takes the lock `file` for the process `pid`: returns a function that gives it up. Throws
 * when another process that is still running holds it; a lock left by one that ended is taken
 * over. `alive(pid)` stands in for the test in the probes.
 */
export function acquireLock(file, pid = process.pid, alive = isAlive) {
  mkdirSync(path.dirname(file), { recursive: true });
  try {
    writeFileSync(file, String(pid), { flag: "wx" });
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    const holder = Number(readFileSync(file, "utf8").trim());
    if (holder !== pid && Number.isInteger(holder) && holder > 0 && alive(holder))
      throw new Error(`the session is open in another screenshot review tool, process ${holder}`);
    writeFileSync(file, String(pid));
  }
  return () => {
    try {
      if (readFileSync(file, "utf8").trim() === String(pid)) unlinkSync(file);
    } catch {}
  };
}

/**
 * The session under `root`, created when there is none with the baseline `baseline()` returns
 * ({hash, short, build}). Its runs that had not ended when the tool that started them stopped
 * are marked `interrupted`. Returns {root, paths, data, save(), run(n), addRun({tool, args}),
 * endRun(n, fields), setPlace(out)}; each change is saved at once.
 */
export function openSession(root, baseline, now = () => new Date().toISOString()) {
  const paths = sessionPaths(root);
  let data;
  if (existsSync(paths.file)) {
    data = parseSession(readFileSync(paths.file, "utf8"), paths.file);
    for (const r of data.runs) if (r.ended === null) Object.assign(r, { ended: now(), interrupted: true });
  } else data = { format: SESSION_FORMAT, created: now(), baseline: baseline(), runs: [], place: null };
  const save = () => {
    mkdirSync(paths.dir, { recursive: true });
    const temp = `${paths.file}.${process.pid}.tmp`;
    writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
    renameSync(temp, paths.file);
  };
  save();
  const run = (n) => data.runs.find((r) => r.n === n) ?? null;
  return {
    root,
    paths,
    data,
    save,
    run,
    addRun({ tool, args }) {
      if (!RUN_TOOLS[tool]) throw new Error(`no such tool: ${tool}`);
      const n = data.runs.reduce((m, r) => Math.max(m, r.n), 0) + 1;
      const r = { n, tool, args, started: now(), ended: null, exit: null, stopped: false, interrupted: false };
      data.runs.push(r);
      save();
      return r;
    },
    endRun(n, fields) {
      Object.assign(run(n), { ended: now(), ...fields });
      save();
    },
    setPlace(out) {
      if (data.place === out) return;
      data.place = out;
      save();
    },
  };
}

/** Appends `value` as a line of JSON to the events file of a run. */
export const appendEvent = (file, value) => appendFileSync(file, `${JSON.stringify(value)}\n`);

/**
 * The events a run reported, from its events file: a list, empty when there is none. A last
 * line cut short (the tool stopped as it wrote it) is left out.
 */
export function readEvents(file) {
  if (!existsSync(file)) return [];
  const events = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {}
  }
  return events;
}
