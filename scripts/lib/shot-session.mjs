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
//   session/runs/<n>/held/         what each picture held before the run's verdict on it was
//                                  applied (shot-apply.mjs's holdPicture, shot-verdicts.mjs)
//   archive/<id>/session/          a closed session, as session/ was: a commit closes one, and
//                                  <id> is the commit's short hash
//
// session.json is {format, created, baseline: {hash, short, build, moved}, runs, place, closed}: `build`
// the newest build the manifest at the baseline records, or null, and `moved` {at, from} when
// the session was moved to this baseline from another (`from` its short hash); each run {n, tool, args,
// started, ended, exit, stopped, interrupted}, `args` its options as the command line gives
// them, without --stage and --events, which the tool adds; `place` the picture the queue was
// left at, or null; `closed` {hash, short, message, at}, the commit that closed it, once it is
// archived. A clean-up run (tool "cleanup") has only its log.

import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";

/** The folder that holds the session and the archived ones. */
export const REVIEW_ROOT = path.join(REPO_ROOT, ".shot-review");

export const SESSION_FORMAT = 1;

/**
 * The tools a session runs, by the name a run records, as their paths from the repository's
 * root. A clean-up is shoot_docs.mjs --cleanup, whose args name --cleanup: it writes under
 * docs/ itself, and has no stage and no events. A browser retake is chromeshot.mjs --take, which
 * waits for the person who takes the pictures.
 */
export const RUN_TOOLS = {
  shoot_docs: "scripts/shoot_docs.mjs",
  replay: "scripts/svgshot/replay.mjs",
  cleanup: "scripts/shoot_docs.mjs",
  chromeshot: "scripts/svgshot/chromeshot.mjs",
};

/** The tools whose runs are staged (--stage and --events), the review tool applying their verdicts. */
export const STAGED_TOOLS = new Set(["shoot_docs", "replay", "chromeshot"]);

/** The value of the option `option` (`--only`) in a run's args, or null. */
export function optionOf(run, option) {
  const k = run?.args?.indexOf(option) ?? -1;
  return k >= 0 ? (run.args[k + 1] ?? null) : null;
}

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
 * removeRun(n), endRun(n, fields), setPlace(out)}; each change is saved at once.
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
      // a removed run's number is not given again: a page or a cache may still name it
      const n = [...data.runs, ...(data.removed ?? [])].reduce((m, r) => Math.max(m, r.n), 0) + 1;
      const r = { n, tool, args, started: now(), ended: null, exit: null, stopped: false, interrupted: false };
      data.runs.push(r);
      save();
      return r;
    },
    /**
     * Removes the run `n` from the session, once its layers are undone (the applier's undo):
     * its record goes to `removed`, {n, tool, args, started, removed}, and its folder is
     * deleted. Returns whether the folder could be deleted; one held open stays, unused.
     */
    removeRun(n) {
      const r = run(n);
      if (!r) throw new Error(`no run ${n}`);
      data.runs = data.runs.filter((x) => x !== r);
      data.removed = [...(data.removed ?? []), { n, tool: r.tool, args: r.args, started: r.started, removed: now() }];
      save();
      try {
        rmSync(runPaths(root, n).dir, { recursive: true, force: true, maxRetries: 5 });
        return true;
      } catch {
        return false;
      }
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
    /**
     * Records that a review kept the files of the picture `out` changed outside the session's
     * runs as they are: `kept` {png, svg}, each the hash (shot-manifest.mjs's hashOf) of the file
     * kept, or null for a part not kept; null forgets the record. A record holds while the
     * files hold those bytes (WIP.ShotReview.md, Commit).
     */
    keepOutside(out, kept) {
      const all = { ...(data.outside ?? {}) };
      if (kept) all[out] = kept;
      else delete all[out];
      data.outside = all;
      save();
    },
    /**
     * Makes `baseline` ({hash, short, build}) the session's, recording when and which one it
     * replaced as `moved`, {at, from, fromHash}, `from` its short hash.
     */
    moveBaseline(baseline) {
      data.baseline = {
        ...baseline,
        moved: { at: now(), from: data.baseline.short, fromHash: data.baseline.hash },
      };
      save();
    },
    /**
     * Closes the session with the commit `commit` ({hash, short, message}), recorded as
     * `closed` with the time, and moves its folder into the archive, without its lock: the
     * archived session is opened again by openSession(archiveRoot(root, id)). Returns `id`, the
     * commit's short hash (with -2, -3 ... when an archived session has it already). No run may
     * be running: its files are moved.
     */
    archive(commit) {
      data.closed = { ...commit, at: now() };
      save();
      let id = commit.short;
      for (let k = 2; existsSync(archiveRoot(root, id)); k++) id = `${commit.short}-${k}`;
      const to = sessionPaths(archiveRoot(root, id)).dir;
      mkdirSync(path.dirname(to), { recursive: true });
      try {
        renameSync(paths.dir, to);
      } catch {
        // a file in it held open for a moment (a scanner, an indexer): copied, then removed
        cpSync(paths.dir, to, { recursive: true });
        rmSync(paths.dir, { recursive: true, force: true, maxRetries: 5 });
      }
      rmSync(path.join(to, "lock"), { force: true });
      return id;
    },
  };
}

/** The root of the archived session `id` under `root`, which openSession opens. */
export const archiveRoot = (root, id) => path.join(sessionPaths(root).archive, id);

/**
 * The sessions archived under `root`, the newest closed first: [{id, root, closed, baseline,
 * runs}], `root` the one openSession opens, `closed` {hash, short, message, at}, `runs` how many
 * it had. A folder that holds no session is left out.
 */
export function listArchived(root) {
  const dir = sessionPaths(root).archive;
  if (!existsSync(dir)) return [];
  const found = [];
  for (const id of readdirSync(dir)) {
    const file = sessionPaths(archiveRoot(root, id)).file;
    try {
      const s = parseSession(readFileSync(file, "utf8"), file);
      found.push({
        id,
        root: archiveRoot(root, id),
        closed: s.closed ?? null,
        baseline: s.baseline,
        runs: s.runs.length,
      });
    } catch {}
  }
  const at = (a) => a.closed?.at ?? "";
  return found.sort((a, b) => (at(a) < at(b) ? 1 : at(a) > at(b) ? -1 : a.id < b.id ? -1 : 1));
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
