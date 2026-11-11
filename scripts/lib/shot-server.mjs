// The screenshot review tool's server (WIP.ShotReview.md): the pages of one session
// (shot-pages.mjs), the files they show, and the session's runs, whose events reach the pages
// over server-sent events (lib/sse.mjs) as they arrive, through one stream that one of the
// pages holds for all of them in the browser. It listens on the loopback address only and
// answers a request only when it names the loopback address as its host, since its pages and
// pictures can hold the Windows user name.
//
// It decides nothing by code of its own: the verdicts are the runs' (shot-policy.mjs, in
// shoot_docs.mjs and replay.mjs), read from their stages and events, applied under docs/ as
// they arrive and judged again when a review decides otherwise, both by shot-verdicts.mjs; a
// review's decisions and allowances go to the manifest (shot-manifest.mjs); and the model of
// what the pages show is shot-review.mjs's. It also writes the session (shot-session.mjs): its
// runs, the queue's place and the baseline. A request that changes anything is a POST of JSON
// from the tool's own pages: one from another origin is refused.
//
// One run at a time: a picture's verdicts are applied in the runs' order (shot-verdicts.mjs),
// which two runs at once would not keep, and a clean-up writes under docs/ itself, so while
// one runs nothing else may write there and a review's actions wait for it.
//
// The commit takes the session's own files and nothing else (shot-review.mjs's commitPlan, from
// git's status), while no run runs and the baseline is HEAD; it closes the session, and the
// server then serves the next one, whose baseline is the new commit.

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { isOutputTree } from "../../lib/markdown-files.mjs";
import { DOCS_DIR, REPO_ROOT } from "../../lib/repo-paths.mjs";
import { createSseChannel } from "../../lib/sse.mjs";
import { readBundle } from "../svgshot/bundle.mjs";
import { decodePng, pngSize } from "./png.mjs";
import { svgOf } from "./shot-apply.mjs";
import { changeMap, shareOff, strengthPicture } from "./shot-change.mjs";
import { hashOf } from "./shot-manifest.mjs";
import {
  allHtml,
  commitHtml,
  detailHtml,
  hrefs,
  outsideHtml,
  overviewHtml,
  plainHtml,
  runsHtml,
} from "./shot-pages.mjs";
import { pngRule, svgRule } from "./shot-policy.mjs";
import { commitPaths, workingChanges } from "./shot-revision.mjs";
import { createApplier } from "./shot-verdicts.mjs";
import {
  allPictures,
  appliedVerdict,
  commitMessage,
  commitPlan,
  FILTERS,
  filterPictures,
  isOverridden,
  neighbours,
  reviewPictures,
  runFacts,
  undecidedRefusal,
  verdictOfEvent,
} from "./shot-review.mjs";
import { kindOf, runOf, startRun } from "./shot-runs.mjs";
import { commandOf, optionOf, parseSession, readEvents, runPaths, sessionPaths } from "./shot-session.mjs";
import { readReviewed, readStrength, readVerdicts } from "./shot-stage.mjs";

const TYPES = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};
const isImage = (name) => Object.hasOwn(TYPES, path.extname(name).toLowerCase());

// How long the table of shots (shoot_docs.mjs --list) is used before it is read again: it changes
// only with the tool's code.
const SHOTS_FRESH = 30000;

// What a run of the session under `root` left, `record` its record in the session: its events,
// what they say (runFacts) and its verdicts, {out => {png, svg}}, as its stage holds them.
function readRun(root, record) {
  const files = runPaths(root, record.n);
  const events = readEvents(files.events);
  const verdicts = new Map(readVerdicts(files.stage).map((v) => [v.out, { png: v.png, svg: v.svg }]));
  return { events, facts: runFacts(record.tool, events), verdicts };
}

// The pictures of a closed session under `root`, as its overview showed them: each run's
// verdicts as the review applied them (appliedVerdict, readReviewed).
function closedSessionPictures(root) {
  const data = parseSession(readFileSync(sessionPaths(root).file, "utf8"));
  const runs = data.runs.map((record) => {
    const { facts, verdicts } = readRun(root, record);
    const stage = runPaths(root, record.n).stage;
    const applied = new Map([...verdicts].map(([out, v]) => [out, appliedVerdict(v, readReviewed(stage, out))]));
    return { n: record.n, tool: record.tool, live: false, facts, verdicts: applied };
  });
  return reviewPictures(runs).pictures;
}

// A path under docs/ as a URL gives it: forward slashes, no empty or parent segment.
const isDocsFile = (p) => !p.includes("\\") && !p.startsWith("/") && !p.split("/").some((s) => s === "" || s === "..");
// A picture's or an SVG's path, which a review can act on, and any image's, which it can only show.
const isDocsPath = (p) => /\.(png|svg)$/i.test(p) && isDocsFile(p);
const isDocsImage = (p) => isImage(p) && isDocsFile(p);

// Every image under `root`, the build's output trees left out, as its path under it.
function imagesUnder(root) {
  const found = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!rel && isOutputTree(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else if (e.isFile() && isImage(e.name)) found.push(r);
    }
  };
  walk(root, "");
  return found;
}

const readIf = (file) => (existsSync(file) && statSync(file).isFile() ? readFileSync(file) : null);

// The most difference maps kept drawn: drawing one decodes a picture of up to 4.5 M pixels.
const MAPS_KEPT = 16;

// The most bytes a POST's body may have: an allowance with its rectangles, or a run of the
// pictures selected on the overview.
const MOST_BODY = 256 * 1024;

// The lines of a run's log the runs page shows while it runs: the last few.
const TAIL_LINES = 8;

/**
 * A value `read()` gives, kept for a second: the function returned gives the value kept, and
 * reads it again first once it is older than that. `read` answers at once, or with a promise
 * (shot-git-worker.mjs's reads, which git answers in a worker thread, so that no page waits on
 * git): then the value kept is given meanwhile, and `onChange()` is called once the promise gives
 * another. A read that throws or rejects gives `fallback`. Its `again()` has the next call read
 * again; a promise under way then is not kept, and is read again once it settles.
 */
export function kept(read, fallback, onChange) {
  let at = 0;
  let value = fallback;
  let pending = false;
  let generation = 0;
  const get = () => {
    if (pending || Date.now() - at <= 1000) return value;
    let r;
    try {
      r = read();
    } catch {
      r = fallback;
    }
    if (typeof r?.then !== "function") {
      at = Date.now();
      value = r;
      return value;
    }
    pending = true;
    const asked = generation;
    Promise.resolve(r)
      .catch(() => fallback)
      .then((v) => {
        pending = false;
        if (asked !== generation) return get();
        at = Date.now();
        const differs = JSON.stringify(v) !== JSON.stringify(value);
        value = v;
        if (differs) onChange();
      });
    return value;
  };
  get.again = () => {
    at = 0;
    generation++;
  };
  return get;
}

/**
 * The server of the session `session` (openSession): `revision` the baseline as openRevision
 * gives it, `manifest()` the manifest as it is now (openManifest), `docsRoot` the pictures'
 * folder, `bundlesRoot` the bundle cache (or null), `head()` the baseline HEAD would make
 * ({hash, short, build}; null for none, or an error thrown when there is none to read),
 * `baselineOf(rev)` the baseline the commit `rev` would make, as `head()` does for HEAD, which
 * the move back to the earlier baseline takes, `revisionAt(hash)` a revision as openRevision
 * gives it, `changedBetween(a, b)` the pictures that differ between two commits (a Set of paths
 * under docs/; null: every picture is taken to differ), `changed()` the pictures whose PNG or
 * SVG differs from the baseline ([{out, status, parts}], changedPictures' with `svgs`; one with
 * no `parts` is its PNG's); `head()` and `changed()` may answer with a promise instead, read in
 * another thread (kept), `ides` the installs a retake can be run
 * on, newest first ([{build, exe}], listIdes'), `onLine(run, line)` called for each line of a run
 * meant for a person, `browser` where a browser retake works ({captures, extension, noOpen},
 * runOf's), and `command` the probes' stand-in for the tools a run starts (startRun).
 * `repoRoot` is a folder of the git working tree the session's files are committed in;
 * `onCommit({hash, short, message})` closes the session once its files are committed, and
 * returns the next one, {session, revision, archive}, `archive` the closed one's id in the
 * archive; `archived()` lists the archived sessions (shot-session.mjs's listArchived), which
 * the commit page names and whose verdicts the page of every picture reads; `shots()` the table
 * of shots, a promise of [{out, setup, once, window}] (shot-runs.mjs's listShots), or null for
 * no page of every picture; and `readOnly` serves an archived session: nothing may be changed.
 * Returns {server, listen(port, host), start({tool, args}), live(), committing(), close(), model(),
 * applyPending(), session()}: `listen` resolves to the port it listens on; `start` starts a run
 * (runOf's), and returns startRun's handle, or throws while another runs or a commit is under
 * way; `live` the handles of the runs that are running; `committing` a promise that settles when
 * the commit under way has ended, or null when none is; `applyPending` applies what the runs reported and was not applied
 * yet, and returns how many parts; `session` the session it serves now.
 */
export function createReviewServer({
  session,
  revision: initialRevision,
  manifest,
  docsRoot = DOCS_DIR,
  bundlesRoot = null,
  head = () => null,
  baselineOf = () => null,
  revisionAt = null,
  changedBetween = null,
  changed = () => [],
  ides = [],
  browser = {},
  onLine,
  command,
  repoRoot = REPO_ROOT,
  onCommit = () => {
    throw new Error("this server cannot close its session");
  },
  archived = () => [],
  shots = null,
  readOnly = false,
}) {
  const newestIde = ides[0]?.build ?? null;
  // a ping every 5 s, by which a page tells a stream that runs from one that has stopped (shot-pages.mjs)
  const sse = createSseChannel({ ping: 5000 });
  let revision = initialRevision;
  let applier = createApplier({ session, docsRoot, bundlesRoot, revision: () => revision, manifest });
  // The commit that closed the session before this one, as the pages say so: {hash, short,
  // message, archive}, or null.
  let lastCommit = null;
  // The commit under way, as the pages say so, {message, at, plan, done}, `plan` the one it
  // commits and `done` its promise; null when none is. git runs as a child process, so the
  // server goes on answering while it and the repository's hooks run.
  let committing = null;
  // A value read from git that changed, every page fetched again: the runs' and the pictures'.
  const gitChanged = () => sse.send("update", { outs: [], runs: true });
  // The baseline HEAD would make, read again at most once a second (kept).
  const headSeen = kept(head, null, gitChanged);
  // HEAD as it is now, when it is not the baseline. While a commit is under way HEAD moves to it
  // before the session is closed, which is no news.
  const headNow = () => {
    if (committing) return null;
    const h = headSeen();
    return h && h.hash !== session.data.baseline.hash ? h : null;
  };
  // The pictures changed outside the session's runs: read again at most once a second (kept).
  const changedSeen = kept(changed, [], gitChanged);
  const outside = () => changedSeen();
  // run n -> {record, live, handle, events, facts, verdicts}
  const runs = new Map();
  const loadRuns = () => {
    runs.clear();
    for (const record of session.data.runs)
      runs.set(record.n, { record, live: false, handle: null, ...readRun(session.root, record) });
  };
  loadRuns();
  const stageFile = (n, rel) => path.join(runPaths(session.root, n).stage, rel);
  const exists = (rel) => existsSync(path.join(docsRoot, rel));
  const entry = (out) => manifest().entry(out);

  // How much a changed picture changed, which orders the Changed group: a PNG's share of
  // pixels beyond its noise levels, from its strength map; an SVG's share off its PNG.
  const measures = new Map();
  const measure = (p) => {
    const key = `${p.png?.run}:${p.svg?.run}:${p.out}`;
    if (!measures.has(key)) {
      let m = p.svg?.share ?? p.svg?.stats?.pct96 ?? 0;
      if (p.png?.state === "updated" && p.png.strength) {
        const rule = pngRule(entry(p.out));
        try {
          m = shareOff(readStrength(stageFile(p.png.run, p.png.strength)), {
            level: rule.levels + 1,
            rects: rule.rects,
          });
        } catch {}
      }
      measures.set(key, m);
    }
    return measures.get(key);
  };
  // ---- files changed outside the session's runs ----
  // A file's hash as a review keeps it (shot-session.mjs's keepOutside): a PNG's bytes, an SVG's
  // text with its line endings as LF, "absent" for a file that is not there. Kept by the file's
  // time and size, since the model asks on every page.
  const hashes = new Map();
  const partFile = (out, part) => path.join(docsRoot, part === "png" ? out : svgOf(out));
  function fileHash(out, part) {
    const file = partFile(out, part);
    let stat = null;
    try {
      stat = statSync(file);
    } catch {}
    if (!stat?.isFile()) return "absent";
    const key = `${file}\u0000${stat.mtimeMs}\u0000${stat.size}`;
    if (!hashes.has(key)) hashes.set(key, hashOf(part === "png" ? readFileSync(file) : readFileSync(file, "utf8")));
    return hashes.get(key);
  }
  // Whether a review kept the files `parts` of `out` as they are now.
  const outsideKept = (out, parts) => {
    const kept = session.data.outside?.[out];
    return !!kept && parts.every((part) => kept[part] === fileHash(out, part));
  };

  // A run's verdicts as the pages show them: each part as it was applied (shot-verdicts.mjs),
  // judged again after a review, else as the run reported it.
  const shownVerdict = (n, out, v) => appliedVerdict(v, applier.reviewed(n, out));
  const shownVerdicts = (r) => new Map([...r.verdicts].map(([out, v]) => [out, shownVerdict(r.record.n, out, v)]));
  const model = () =>
    reviewPictures(
      [...runs.values()].map((r) => ({
        n: r.record.n,
        tool: r.record.tool,
        live: r.live,
        facts: r.facts,
        verdicts: shownVerdicts(r),
      })),
      { exists, measure, outside: outside(), baseline: session.data.baseline.hash, stale, outsideKept },
    );
  // Whether the picture `out` differs between the commit `hash` and the baseline: a verdict
  // judged against that commit's picture then needs a look. One git diff per pair of commits,
  // kept; one that cannot be read takes every picture to differ.
  const between = new Map();
  const stale = (out, hash) => {
    if (!changedBetween) return true;
    const key = `${hash}..${session.data.baseline.hash}`;
    if (!between.has(key)) {
      let set = null;
      try {
        set = changedBetween(hash, session.data.baseline.hash);
      } catch {}
      between.set(key, set);
    }
    const set = between.get(key);
    return set ? set.has(out) : true;
  };
  const filterOptions = { overridden: (out) => isOverridden(entry(out)), exists };

  // ---- every picture ----
  // The table of shots, read when the page of every picture is first asked for and again once
  // it is older than SHOTS_FRESH; one read at a time. A read that fails keeps the table read
  // before it, if any.
  let shotTable = { at: 0, value: null, loading: null };
  function table() {
    if (!shots) return Promise.reject(new Error("this server was given no table of shots"));
    if (shotTable.value && Date.now() - shotTable.at < SHOTS_FRESH) return Promise.resolve(shotTable.value);
    shotTable.loading ??= Promise.resolve()
      .then(() => shots())
      .then(
        (value) => {
          shotTable = { at: Date.now(), value, loading: null };
          return value;
        },
        (e) => {
          shotTable = { ...shotTable, loading: null };
          if (shotTable.value) return shotTable.value;
          throw e;
        },
      );
    return shotTable.loading;
  }
  // The SVG verdicts any session gave each picture, newest first: this session's as its overview
  // has them, then each archived session's, the newest closed first (read once each: a closed
  // session does not change). An archived session served read-only is this session.
  const closedSessions = new Map();
  function closedPicturesOf(a) {
    if (!closedSessions.has(a.id)) {
      let byOut = new Map();
      try {
        byOut = new Map(closedSessionPictures(a.root).map((p) => [p.out, p]));
      } catch {}
      closedSessions.set(a.id, byOut);
    }
    return closedSessions.get(a.id);
  }
  function verdictsOf() {
    const mine = new Map(model().pictures.map((p) => [p.out, p]));
    const closed = archived()
      .filter((a) => a.root && path.resolve(a.root) !== path.resolve(session.root))
      .map((a) => [a.id, closedPicturesOf(a)]);
    return (out) =>
      [[null, mine], ...closed].flatMap(([id, byOut]) => {
        const p = byOut.get(out);
        return p?.svg ? [{ svg: p.svg, where: { session: id, run: p.svg.run } }] : [];
      });
  }
  async function everyPicture() {
    return allPictures({ shots: await table(), exists, entry, verdicts: verdictsOf(), images: imagesUnder(docsRoot) });
  }
  async function allPage() {
    let all = null;
    let error = null;
    try {
      all = await everyPicture();
    } catch (e) {
      error = e.message;
    }
    return allHtml({
      groups: all?.groups ?? [],
      error,
      baseline: session.data.baseline,
      bundled: (out) => (bundlesRoot ? !!readBundle(bundlesRoot, out) : null),
      entry,
      busy: busyRun(),
      archived: readOnly ? (session.data.closed ?? {}) : null,
    });
  }
  // The page of a picture no run of this session reported, from the page of every picture: the
  // baseline's picture against the file, its SVG, why it has none, and its runs. An image no shot
  // takes is shown at its own size, not at half as a 2x shot is, and the baseline's copy only when
  // it differs. Null when the page of every picture does not list it.
  async function plainPage(out) {
    let all;
    try {
      all = await everyPicture();
    } catch {
      return null;
    }
    const place = neighbours(all.pictures, out);
    if (place.index < 0) return null;
    const p = all.pictures[place.index];
    const file = (src, bytes) => (bytes ? { src, size: p.uncaptured ? null : pngSize(bytes) } : null);
    const atBaseline = revision.bytes(out);
    const now = readIf(path.join(docsRoot, out));
    return plainHtml({
      p,
      place: { index: place.index, total: all.pictures.length },
      prev: place.prev,
      next: place.next,
      files: {
        head: p.uncaptured && atBaseline?.equals(now) ? null : file(hrefs.head(out), atBaseline),
        docs: file(hrefs.docs(out), now),
        svg: p.svg ? { src: hrefs.docs(svgOf(out)), size: null } : null,
      },
      entry: entry(out),
      baseline: session.data.baseline,
      busy: busyRun(),
      bundled: bundlesRoot ? !!readBundle(bundlesRoot, out) : null,
    });
  }

  // ---- runs ----
  const listedOf = (r) => r.facts.listed;
  // A run's verdicts are applied in order, one in each turn of the event loop, so that the
  // server answers between them: a replay reports several pictures a second, each taking 0.1 s
  // or more to apply (its bundle copied into the cache), and applied as their events were read
  // they held every request up for as long as the replay ran. A run that has exited stays live
  // until its verdicts are applied, so that nothing that waits for a run's end (a new run, a
  // commit, Remove) meets one half applied. close() applies what is left at once, then `shut`
  // stops the queue.
  const queue = [];
  let draining = false;
  let shut = false;
  const enqueue = (job) => {
    queue.push(job);
    if (draining) return;
    draining = true;
    setImmediate(drain);
  };
  function drain() {
    const job = shut ? null : queue.shift();
    if (!job) {
      draining = false;
      return;
    }
    try {
      job();
    } finally {
      setImmediate(drain);
    }
  }
  // applied as it arrives: the stage holds the verdict by the time its event is written; one
  // that could not be read is tried again a moment later. A run removed meanwhile is not.
  const applyArrival = (n, out, part) => {
    if (!runs.has(n)) return;
    if (applier.arrive(n, out, part)) sse.send("update", { outs: [out] });
    else if (applier.errors.has(out))
      setTimeout(() => {
        if (!shut && runs.has(n) && applier.arrive(n, out, part)) sse.send("update", { outs: [out] });
      }, 500);
  };
  const onEvent = (record, e) => {
    const r = runs.get(record.n);
    r.events.push(e);
    r.facts = runFacts(record.tool, r.events);
    if (e.type === "picture" || e.type === "svg") {
      const [part, value] = verdictOfEvent(e);
      const v = r.verdicts.get(e.out) ?? { png: null, svg: null };
      v[part] = value;
      r.verdicts.set(e.out, v);
      enqueue(() => applyArrival(record.n, e.out, part));
    }
    if (e.type === "await" || e.type === "refused") sse.send("update", { outs: [e.out], runs: true });
    else if (e.out) sse.send("update", { outs: [e.out] });
    else sse.send("update", { outs: e.type === "run" || e.type === "summary" ? listedOf(r) : [], runs: true });
  };
  const onExit = (record) =>
    enqueue(() => {
      const r = runs.get(record.n);
      if (!r) return;
      r.live = false;
      r.handle = null;
      if (record.tool === "cleanup") {
        // what it put back is no longer changed: every page that shows a picture may differ
        changedSeen.again();
        sse.send("update", { outs: model().pictures.map((p) => p.out), runs: true });
      } else sse.send("update", { outs: listedOf(r), runs: true });
    });
  const liveRuns = () => [...runs.values()].filter((r) => r.live);
  function start({ tool, args }) {
    refuseWhileCommitting();
    const busy = liveRuns()[0];
    if (busy) throw new Error(`run ${busy.record.n} is running: a new run starts once it has ended`);
    const handle = startRun(session, { tool, args }, { onEvent, onExit, onLine, command });
    runs.set(handle.run.n, {
      record: handle.run,
      live: true,
      handle,
      stopAsked: false,
      events: [],
      facts: runFacts(tool, []),
      verdicts: new Map(),
    });
    sse.send("update", { outs: [], runs: true });
    return handle;
  }
  const live = () => liveRuns().map((r) => r.handle);
  // A run the runs page asks for: its IDE named by its build, which is looked up among the installs.
  function startRequest(body) {
    let ide;
    if (body.ide !== undefined && body.ide !== null && body.ide !== "") {
      const found = ides.find((i) => String(i.build) === String(body.ide));
      if (!found) throw new Error(`no install of BETA ${body.ide} was found`);
      ide = found.exe;
    }
    return start(runOf({ ...body, ide }, session.data.baseline, browser));
  }
  // Stop asks a run to stop (its own stop: its IDEs end and the registry is put back); kill ends
  // its process, and is offered only once a stop has been asked for.
  function runAction(n, action) {
    if (action === "remove") return removeRun(n);
    const r = runs.get(n);
    if (!r?.live) throw new Error(`run ${n} is not running`);
    if (action === "stop") {
      if (r.record.tool === "cleanup") throw new Error("a clean-up cannot be stopped: it ends in seconds");
      r.stopAsked = true;
      r.handle.stop();
    } else if (action === "kill") {
      if (!r.stopAsked) throw new Error(`stop run ${n} first: ending its process skips putting the registry back`);
      r.handle.kill();
    } else throw new Error(`no such action: ${action}`);
    sse.send("update", { outs: [], runs: true });
  }
  // Removes a run that has ended, as if it had not run: its layers undone under docs/ (each
  // picture put back as the run found it, and later runs' layers applied again on it), then its
  // record and folder. A run that is running is stopped first. A picture that cannot be put
  // back keeps the run, so that removing it again tries again. Returns {pictures, later}.
  function removeRun(n) {
    refuseWhileCleaning();
    const r = runs.get(n);
    if (!r) throw new Error(`no run ${n}`);
    if (r.live) throw new Error(`run ${n} is running: stop it first, then remove it`);
    const { outs, later, failed } = applier.undo(n);
    // the pictures it put back may no longer differ from the baseline, or may now
    changedSeen.again();
    if (failed.size) {
      sse.send("update", { outs, runs: true });
      const [out, why] = failed.entries().next().value;
      throw new Error(
        `${failed.size} of the ${outs.length} pictures run ${n} changed could not be put back (${out}: ${why}); run ${n} is kept, and removing it again tries again`,
      );
    }
    session.removeRun(n);
    runs.delete(n);
    sse.send("update", { outs, runs: true });
    return { pictures: outs.length, later: later.length };
  }
  // A clean-up writes under docs/ itself: while it runs a review's actions wait.
  const cleaning = () => liveRuns().find((r) => r.record.tool === "cleanup") ?? null;
  const refuseWhileCleaning = () => {
    refuseWhileCommitting();
    const c = cleaning();
    if (c) throw new Error(`run ${c.record.n}, a clean-up, is putting pictures back: try again once it has ended`);
  };
  // While a commit is under way nothing the session would commit changes: no run, no action.
  function refuseWhileCommitting() {
    if (committing) throw new Error("the session is being committed: try again once the commit has ended");
  }

  // A run as the pages show it: its record, the command line it is the same as, and how far it is.
  const runRow = (r) => {
    const owed = r.record.tool === "replay" ? "svg" : "png";
    // a picture a replay passed on for a retake is done with, and said beside the count
    const isDone = (out) =>
      r.verdicts.get(out)?.[owed] || r.facts.failed.has(out) || r.facts.skipped.has(out) || r.facts.retakes.has(out);
    const done = r.facts.listed.filter(isDone).length;
    const failed = new Set(failedOf(r));
    const ofJob = (name) => r.facts.listed.filter((out) => r.facts.jobOf.get(out) === name);
    const jobs = [...r.facts.jobs].map(([name, j]) => ({
      name,
      state: j.state,
      error: j.error,
      pictures: j.pictures,
      done: ofJob(name).filter(isDone).length,
      failed: ofJob(name).filter((out) => failed.has(out)).length,
    }));
    return {
      ...r.record,
      kind: kindOf(r.record),
      dryRun: r.record.args.includes("--dry-run"),
      only: optionOf(r.record, "--only"),
      command: commandOf(r.record),
      live: r.live,
      stopping: r.facts.stopping,
      stopAsked: !!r.stopAsked,
      done,
      failed: failed.size,
      retakes: r.facts.retakes.size,
      listed: r.facts.listed.length,
      jobs,
      awaiting: r.live ? r.facts.awaiting : null,
      refused: r.live ? r.facts.refused : null,
      extension: r.live ? r.facts.extension : null,
      captures: r.facts.captures,
    };
  };
  // The pictures a run failed on: a failure reported, its job failed before reaching it, or a
  // staged verdict that says so. A failed picture counts as done in a job's progress, so the
  // pages say how many of those failed.
  function failedOf(r) {
    const f = r.facts;
    return f.listed.filter((out) => {
      const png = r.verdicts.get(out)?.png;
      if (png) return png.state === "failed";
      return f.failed.has(out) || f.jobs.get(f.jobOf.get(out))?.state === "failed";
    });
  }
  // The lines of a run's log the runs page shows: a clean-up's whole (what it put back), the
  // last few of a run that is running, none of one that has ended (its log has them).
  const logOf = (r) => {
    if (r.record.tool !== "cleanup" && !r.live) return null;
    const text = readIf(runPaths(session.root, r.record.n).log)?.toString("utf8") ?? "";
    const lines = text.split(/\r?\n/).filter((l) => l !== "");
    return r.record.tool === "cleanup" ? lines : lines.slice(-TAIL_LINES);
  };

  // ---- the files the pages show ----
  const verdictOf = (n, out) => shownVerdict(n, out, runs.get(n)?.verdicts.get(out));
  // The picture the run `n` judged its capture of `out` against: the file is as the run's layer
  // found it, before its verdict was applied.
  function referenceBytes(n, out) {
    const against = verdictOf(n, out)?.png?.against;
    if (against === "revision") return revision.bytes(out);
    if (against === "disk") return applier.heldPng(n, out) ?? readIf(path.join(docsRoot, out));
    if (against === "dark") {
      const dark = out.replace(/\.light\.png$/i, ".png");
      const staged = verdictOf(n, dark)?.png?.capture;
      return staged ? readIf(stageFile(n, staged)) : readIf(path.join(docsRoot, dark));
    }
    return null;
  }
  // The PNG the run `n` compared its SVG of `out` with: its capture, else the file as the run's
  // layer found it (a replay's).
  function svgPngBytes(n, out) {
    const capture = verdictOf(n, out)?.png?.capture;
    if (capture) return readIf(stageFile(n, capture));
    return applier.heldPng(n, out) ?? readIf(path.join(docsRoot, out));
  }
  const maps = new Map();
  function mapBytes(n, part, out) {
    const key = `${n}/${part}/${out}`;
    if (maps.has(key)) return maps.get(key);
    const v = verdictOf(n, out)?.[part];
    if (!v?.strength) return null;
    const base = part === "png" ? readIf(stageFile(n, v.capture)) : svgPngBytes(n, out);
    if (!base) return null;
    const bytes = strengthPicture(readStrength(stageFile(n, v.strength)), decodePng(base));
    maps.set(key, bytes);
    if (maps.size > MAPS_KEPT) maps.delete(maps.keys().next().value);
    return bytes;
  }

  // ---- the pages ----
  function overview(filter) {
    const m = model();
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, filterPictures(m.pictures, k, filterOptions).length]));
    const shown = new Set(filterPictures(m.pictures, filter, filterOptions).map((p) => p.out));
    const look = filterPictures(m.pictures, "look", filterOptions);
    const at = Math.max(
      0,
      look.findIndex((p) => p.out === session.data.place),
    );
    return overviewHtml({
      groups: m.groups.map((g) => ({ ...g, pictures: g.pictures.filter((p) => shown.has(p.out)) })),
      filter,
      counts,
      runs: [...runs.values()].map(runRow),
      baseline: session.data.baseline,
      headNow: headNow()?.short ?? null,
      canMove: !!revisionAt,
      newestIde,
      resume: look.length ? { index: at, total: look.length, out: look[at].out } : null,
      exists,
      entry,
      archived: readOnly ? (session.data.closed ?? {}) : null,
      committing: committing ? { message: committing.message, at: committing.at } : null,
    });
  }
  // What keeps a new run from starting, as the pages say so: the run that is running, {n,
  // kind}, or the commit under way, {commit: true, message, at}; null when nothing does.
  const busyRun = () => {
    if (committing) return { commit: true, message: committing.message, at: committing.at };
    const r = liveRuns()[0];
    return r ? { n: r.record.n, kind: kindOf(r.record) } : null;
  };
  function runsPage() {
    // what removing a run would undo: the pictures it reported, and those a later run took too
    const removal = (r) => {
      const outs = [...r.verdicts.keys()];
      const later = [...runs.values()].filter((o) => o.record.n > r.record.n);
      return { pictures: outs.length, later: outs.filter((out) => later.some((o) => o.verdicts.has(out))).length };
    };
    // What "Retake what failed" retakes of a retake that has ended: the pictures it failed on
    // (failedOf), with its --svg and its IDE, by the build it is among the installs found
    // (missing: no longer found). A run that named no IDE ran on the newest install then, whose
    // build its run event records: that build, not the newest install now. Of a replay that has
    // ended: the pictures it failed on and those it says need a retake, with their SVGs, on the
    // newest install, as the runs page's retake is by default: a replay runs no IDE.
    const failedRetake = (r) => {
      if (r.live) return null;
      if (r.record.tool === "replay") {
        const pictures = [...new Set([...failedOf(r), ...r.facts.retakes.keys()])].sort();
        return pictures.length ? { pictures, svg: true, ide: null, missing: null } : null;
      }
      if (r.record.tool === "chromeshot") {
        const pictures = failedOf(r);
        return pictures.length ? { pictures, svg: true, ide: null, missing: null } : null;
      }
      if (r.record.tool !== "shoot_docs" || r.record.args.includes("--dry-run")) return null;
      const pictures = failedOf(r);
      if (!pictures.length) return null;
      const exe = optionOf(r.record, "--ide");
      const build = r.facts.build;
      const found = exe
        ? ides.find((i) => path.resolve(i.exe) === path.resolve(exe))
        : build
          ? ides.find((i) => i.build === build)
          : null;
      return {
        pictures,
        svg: r.record.args.includes("--svg"),
        ide: found?.build ?? null,
        missing: found ? null : exe ? exe : build ? `BETA ${build}` : null,
      };
    };
    return runsHtml({
      runs: [...runs.values()].map((r) => ({
        ...runRow(r),
        log: logOf(r),
        removal: removal(r),
        failedRetake: failedRetake(r),
      })),
      baseline: session.data.baseline,
      ides: ides.map(({ build }) => build),
      busy: busyRun(),
    });
  }
  function detail(out, wanted) {
    const m = model();
    const p = m.pictures.find((q) => q.out === out);
    if (!p) return null;
    let filter = wanted;
    let list = filterPictures(m.pictures, filter, filterOptions);
    let place = neighbours(list, out);
    if (place.index < 0) {
      filter = "all";
      list = m.pictures;
      place = neighbours(list, out);
    }
    if (filter === "look") session.setPlace(out);
    const file = (src, bytes) => (bytes ? { src, size: pngSize(bytes) } : null);
    const pager = { filter, place: { index: place.index, total: list.length }, prev: place.prev, next: place.next };
    // the SVG as the baseline has it and as the file is, for a review of an SVG changed outside the runs
    const svgFiles = () => {
      const s = svgOf(out);
      const png = readIf(path.join(docsRoot, out)) ?? revision.bytes(out);
      const size = png ? pngSize(png) : null;
      return {
        head: revision.bytes(s) ? { src: hrefs.head(s), size } : null,
        docs: exists(s) ? { src: hrefs.docs(s), size } : null,
      };
    };
    const outside = p.outside ? { parts: p.outsideParts, kept: p.outsideKept, svg: svgFiles() } : null;
    if (p.outside && !p.png && !p.svg) {
      const atHead = revision.bytes(out);
      const now = readIf(path.join(docsRoot, out));
      return outsideHtml({
        p,
        ...pager,
        files: { head: file(hrefs.head(out), atHead), docs: file(hrefs.docs(out), now), svg: outside.svg },
        map: atHead && now ? hrefs.outsideMap(out) : null,
        baseline: session.data.baseline,
        busy: busyRun(),
      });
    }
    const n = p.png?.run;
    const files = {
      head: file(hrefs.head(out), revision.bytes(out)),
      capture: p.png?.capture ? file(hrefs.run(n, p.png.capture), readIf(stageFile(n, p.png.capture))) : null,
      reference: p.png?.against ? file(hrefs.reference(n, out), referenceBytes(n, out)) : null,
      svgPng: null,
      svg: null,
    };
    if (p.svg) {
      const s = p.svg.run;
      const capture = verdictOf(s, out)?.png?.capture;
      const held = applier.heldPng(s, out);
      files.svgPng = capture
        ? file(hrefs.run(s, capture), readIf(stageFile(s, capture)))
        : held
          ? file(hrefs.held(s, out), held)
          : file(hrefs.docs(out), readIf(path.join(docsRoot, out)));
      if (p.svg.svg) files.svg = { src: hrefs.run(s, p.svg.svg), size: null };
      else if (exists(svgOf(out))) files.svg = { src: hrefs.docs(svgOf(out)), size: null };
    }
    const e = entry(out);
    return detailHtml({
      p,
      ...pager,
      files,
      maps: {
        png: p.png?.strength ? hrefs.map(n, "png", out) : null,
        svg: p.svg?.strength ? hrefs.map(p.svg.run, "svg", out) : null,
      },
      rules: { png: pngRule(e), svg: svgRule(e) },
      entry: e,
      build: e?.build ?? null,
      baseline: session.data.baseline,
      error: applier.errors.get(out) ?? null,
      busy: busyRun(),
      bundled: bundlesRoot ? !!readBundle(bundlesRoot, out) : null,
      outside,
    });
  }

  // ---- what a review changes ----
  // Each action changes the manifest, then judges the picture again from the run whose verdict
  // it is about (applier.rejudge), so that what the file holds is what the pages then show.
  const capturedBytes = (p) => (p.png?.capture ? readIf(stageFile(p.png.run, p.png.capture)) : null);
  const firstRun = (p) => Math.min(...[p.png?.run, p.svg?.run].filter((n) => n !== undefined));
  // A noise rule's or a bar's limits from a form: a number, or empty for the default.
  const limit = (value, what, { integer = false, min, max }) => {
    if (value === null || value === undefined || value === "") return undefined;
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n)))
      throw new Error(`${what} must be ${integer ? "a whole number" : "a number"} from ${min} to ${max}`);
    return n;
  };
  const rectsOf = (value, what) => {
    if (value === null || value === undefined || value === "") return undefined;
    const list = Array.isArray(value) ? value : String(value).match(/-?\d+/g)?.map(Number);
    const flat = list?.flat() ?? [];
    if (flat.length % 4) throw new Error(`${what} must be four numbers for each rectangle: x0, y0, x1, y1`);
    const rects = [];
    for (let k = 0; k < flat.length; k += 4) rects.push(flat.slice(k, k + 4));
    return rects.length ? rects : undefined;
  };
  // A review of the files of `out` changed outside the session's runs: kept as they are (the
  // session records their bytes; a later change sends them back), or put back as the baseline
  // has them (the applier, which judges the picture's layers again from there).
  function actOutside(p, action) {
    if (!p?.outside) throw new Error(`${p?.out ?? "the picture"} has no file changed outside the session's runs`);
    if (action === "keep") {
      const kept = Object.fromEntries(p.outsideParts.map((part) => [part, fileHash(p.out, part)]));
      session.keepOutside(p.out, kept);
      return;
    }
    applier.putBack(p.out, p.outsideParts);
    session.keepOutside(p.out, null);
    changedSeen.again();
    maps.clear();
    measures.clear();
    const error = applier.errors.get(p.out);
    if (error) throw new Error(`not put back: ${error}`);
  }

  function act(out, body) {
    refuseWhileCleaning();
    const p = model().pictures.find((q) => q.out === out);
    if (body.action === "keep-outside" || body.action === "put-back")
      return actOutside(p, body.action === "keep-outside" ? "keep" : "put-back");
    if (!p || (p.outside && !p.png && !p.svg)) throw new Error(`${out} has no verdict of this session to act on`);
    const m = manifest();
    let from;
    switch (body.action) {
      case "png": {
        const capture = capturedBytes(p);
        if (!capture) throw new Error("there is no capture to decide about");
        if (body.keep !== "old" && body.keep !== "new" && body.keep !== null)
          throw new Error('keep must be "old", "new" or null');
        m.setPart(out, "png", "decision", body.keep ? { keep: body.keep, capture: hashOf(capture) } : undefined);
        from = p.png.run;
        break;
      }
      case "svg": {
        if (!p.svg?.svg) throw new Error("there is no SVG to decide about");
        if (typeof body.accept !== "boolean" && body.accept !== null)
          throw new Error("accept must be true, false or null");
        const svgText = readFileSync(stageFile(p.svg.run, p.svg.svg), "utf8");
        const png = svgPngBytes(p.svg.run, out);
        m.setPart(
          out,
          "svg",
          "decision",
          body.accept === null ? undefined : { accept: body.accept, svg: hashOf(svgText), png: hashOf(png) },
        );
        from = p.svg.run;
        break;
      }
      case "allowance": {
        const { png = {}, svg = {} } = body;
        const noise = {
          levels: limit(png.levels, "The noise levels", { integer: true, min: 0, max: 255 }),
          share: limit(png.share, "The noise share", { min: 0, max: 100 }),
        };
        const bar = {
          levels: limit(svg.levels, "The bar's levels", { integer: true, min: 1, max: 255 }),
          share: limit(svg.share, "The bar's share", { min: 0, max: 100 }),
        };
        const defined = (o) => (Object.values(o).some((v) => v !== undefined) ? o : undefined);
        m.setPart(out, "png", "noise", defined(noise));
        m.setPart(out, "png", "ignore", rectsOf(png.ignore, "The PNG's rectangles"));
        m.setPart(out, "svg", "bar", defined(bar));
        m.setPart(out, "svg", "ignore", rectsOf(svg.ignore, "The SVG's rectangles"));
        from = firstRun(p);
        break;
      }
      case "rule":
        m.setPart(out, "png", "decision", undefined);
        m.setPart(out, "svg", "decision", undefined);
        from = firstRun(p);
        break;
      case "judge":
        from = firstRun(p);
        break;
      default:
        throw new Error(`no such action: ${body.action}`);
    }
    if (!Number.isFinite(from)) throw new Error(`${out} has no verdict of this session to act on`);
    m.save();
    applier.rejudge(out, from);
    maps.clear();
    measures.clear();
    const error = applier.errors.get(out);
    if (error) throw new Error(`judged again, but not applied: ${error}`);
  }

  // Moves the session to HEAD: the new baseline's picture is what a capture is judged against.
  // The session moved to the baseline `b` ({hash, short, build}). Nothing under docs/ changes:
  // what changes is the pictures the verdicts are compared with, so a move is undone by moving
  // back.
  function moveTo(b) {
    if (b.hash === session.data.baseline.hash) return;
    revision = revisionAt(b.hash);
    session.moveBaseline(b);
    headSeen.again();
    changedSeen.again();
    maps.clear();
    measures.clear();
  }
  // HEAD read now, not as kept (headSeen): `head` may answer with a promise (shot-git-worker.mjs),
  // which was once taken for the baseline and failed with "Cannot read properties of undefined".
  async function moveToHead() {
    refuseWhileCleaning();
    let h = null;
    try {
      h = await head();
    } catch {}
    if (!h || !revisionAt) throw new Error("HEAD cannot be read");
    refuseWhileCleaning();
    moveTo(h);
  }
  // Back to the baseline the last move left: its commit by hash (a session moved before the hash
  // was recorded names it by its short hash).
  function moveBack() {
    refuseWhileCleaning();
    const from = session.data.baseline.moved;
    if (!from) throw new Error("the session has not been moved");
    let b = null;
    try {
      b = baselineOf(from.fromHash ?? from.from);
    } catch {}
    if (!b || !revisionAt) throw new Error(`the earlier baseline, ${from.from}, cannot be read`);
    moveTo(b);
  }

  // ---- the commit ----
  // What a commit of the session takes, from git's status now: {plan, message, error}, the plan
  // commitPlan's and the message its default, or `error` why git could not be read.
  // A path as git names it (long names, links resolved), for a file that may not be there yet.
  const real = (file) => {
    if (existsSync(file)) return realpathSync.native(file);
    const up = path.dirname(file);
    return up === file ? file : path.join(real(up), path.basename(file));
  };
  function commitState() {
    try {
      const { top, changes } = workingChanges(repoRoot);
      const rel = (file) => path.relative(real(top), real(file)).replace(/\\/g, "/");
      const plan = commitPlan({
        pictures: model().pictures,
        changes,
        docsPrefix: `${rel(docsRoot)}/`,
        manifestPath: rel(manifest().file),
        entry,
      });
      return { plan, message: commitMessage(plan), error: null };
    } catch (e) {
      return { plan: null, message: null, error: e.message };
    }
  }
  // Why the session cannot be committed now, or null: a commit under way, a run, or a baseline
  // that is not HEAD.
  const commitRefusal = () => {
    if (readOnly) return "this session is archived: it was committed when it was closed";
    if (committing) return "the session is being committed";
    const busy = liveRuns()[0];
    if (busy) return `run ${busy.record.n} is running: commit once it has ended`;
    const h = headNow();
    if (h)
      return `HEAD is now ${h.short}, not the baseline, ${session.data.baseline.short}: move the session to HEAD first, so that what is committed was judged against HEAD's pictures`;
    return null;
  };
  // Commits the session's own files with `body.message`, when `body.files` (their paths) is
  // still what the session would commit; then the session is closed and the next one served
  // (onCommit, which archives it and opens the next). What is checked is checked at once; git
  // then runs without blocking, while every page says the commit is under way (`committing`).
  function commit(body) {
    const refused = commitRefusal();
    if (refused) throw new Error(refused);
    const { plan, error } = commitState();
    if (error) throw new Error(`git could not be read: ${error}`);
    const undecided = undecidedRefusal(plan);
    if (undecided) throw new Error(undecided);
    const paths = plan.files.map((f) => f.path);
    if (!paths.length) throw new Error("the session has changed nothing to commit");
    const asked = Array.isArray(body.files) ? [...body.files].sort() : null;
    if (!asked || asked.length !== paths.length || asked.some((p, i) => p !== paths[i]))
      throw new Error("what the session would commit has changed since the page was drawn: look at it again");
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) throw new Error("the message is empty");
    const added = plan.files.filter((f) => f.status === "added").map((f) => f.path);
    const done = (async () => {
      const made = await commitPaths(repoRoot, { paths, added, message });
      let next;
      try {
        next = onCommit({ ...made, message });
      } catch (e) {
        throw new Error(`committed ${made.short}, but the session could not be closed: ${e.message}`);
      }
      session = next.session;
      revision = next.revision;
      applier = createApplier({ session, docsRoot, bundlesRoot, revision: () => revision, manifest });
      loadRuns();
      headSeen.again();
      changedSeen.again();
      maps.clear();
      measures.clear();
      lastCommit = { ...made, message, archive: next.archive };
      return lastCommit;
    })().finally(() => {
      committing = null;
      sse.send("update", { outs: [], runs: true });
    });
    committing = { message, at: new Date().toISOString(), plan, done };
    sse.send("update", { outs: [], runs: true });
    return done;
  }
  function commitPage() {
    const state = readOnly
      ? { plan: null, message: null, error: null }
      : committing
        ? { plan: committing.plan, message: committing.message, error: null }
        : commitState();
    return commitHtml({
      ...state,
      committing: committing ? { message: committing.message, at: committing.at } : null,
      baseline: session.data.baseline,
      refusal: commitRefusal() ?? undecidedRefusal(state.plan),
      headNow: headNow()?.short ?? null,
      canMove: !!revisionAt,
      lastCommit,
      archived: archived(),
    });
  }

  // ---- answering ----
  let port = null;
  const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);
  const hostAllowed = (host) => {
    const m = /^(.+):(\d+)$/.exec(host ?? "");
    return !!m && LOOPBACK.has(m[1].toLowerCase()) && Number(m[2]) === port;
  };
  const send = (res, status, type, body, headers = {}) => {
    res.writeHead(status, {
      "content-type": type,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
      ...headers,
    });
    res.end(body);
  };
  const notFound = (res, what = "not found") => send(res, 404, "text/plain; charset=utf-8", `${what}\n`);
  // A file is asked for again on every visit to a page (no-cache), and answered with its
  // bytes only when they are not the ones the browser holds: its tag is their hash.
  const sendFile = (req, res, name, bytes) => {
    if (!bytes) return notFound(res);
    const type = TYPES[path.extname(name).toLowerCase()];
    if (!type) return notFound(res);
    const etag = `"${hashOf(bytes)}"`;
    const headers = {
      etag,
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:",
    };
    if (req.headers["if-none-match"]?.split(/\s*,\s*/).includes(etag)) return send(res, 304, type, undefined, headers);
    send(res, 200, type, req.method === "HEAD" ? undefined : bytes, headers);
  };
  const page = (req, res, html) => send(res, 200, "text/html; charset=utf-8", req.method === "HEAD" ? undefined : html);

  const sendJson = (res, status, value) => send(res, status, "application/json", `${JSON.stringify(value)}\n`);
  // A POST: JSON from one of the tool's own pages. A page of another origin can send a form to
  // the loopback address, but not with this content type unasked, and not with this Origin.
  async function post(req, res, url) {
    const origin = req.headers.origin;
    if (origin !== `http://${req.headers.host}`)
      return sendJson(res, 403, { error: "only the tool's own pages may change anything" });
    if (readOnly) return sendJson(res, 403, { error: "this session is archived: nothing in it can be changed" });
    if (!/^application\/json\b/i.test(req.headers["content-type"] ?? ""))
      return sendJson(res, 415, { error: "the body must be JSON" });
    let body;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MOST_BODY) throw new Error("the body is too large");
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch (e) {
      return sendJson(res, 400, { error: `the body could not be read: ${e.message}` });
    }
    let segs;
    try {
      segs = url.pathname.split("/").slice(1).map(decodeURIComponent);
    } catch {
      return sendJson(res, 404, { error: "no such address" });
    }
    const out = segs[0] === "api" && segs[1] === "picture" ? segs.slice(2).join("/") : null;
    try {
      if (url.pathname === hrefs.moveBaseline) {
        if (body.action === "back") moveBack();
        else await moveToHead();
        sse.send("update", { outs: model().pictures.map((p) => p.out), runs: true });
        return sendJson(res, 200, { ok: true, baseline: session.data.baseline });
      }
      if (url.pathname === hrefs.commit) {
        const done = await commit(body);
        return sendJson(res, 200, { ok: true, hash: done.hash, short: done.short, archive: done.archive });
      }
      if (url.pathname === hrefs.startRun) {
        const { run } = startRequest(body);
        return sendJson(res, 200, { ok: true, run: run.n });
      }
      if (segs[0] === "api" && segs[1] === "run" && segs.length === 3 && runs.has(Number(segs[2]))) {
        const done = runAction(Number(segs[2]), body.action);
        return sendJson(res, 200, { ok: true, ...done });
      }
      if (out !== null) {
        if (!isDocsPath(out)) return sendJson(res, 404, { error: "no such picture" });
        act(out, body);
        sse.send("update", { outs: [out] });
        return sendJson(res, 200, { ok: true });
      }
    } catch (e) {
      if (out !== null) sse.send("update", { outs: [out] });
      return sendJson(res, 400, { error: e.message });
    }
    return sendJson(res, 404, { error: "no such address" });
  }

  function handle(req, res) {
    if (!hostAllowed(req.headers.host)) return send(res, 403, "text/plain", "only the loopback address is answered\n");
    if (req.method === "POST") return post(req, res, new URL(req.url, "http://127.0.0.1"));
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "text/plain", "not answered\n");
    const url = new URL(req.url, "http://127.0.0.1");
    let segs;
    try {
      segs = url.pathname.split("/").slice(1).map(decodeURIComponent);
    } catch {
      return notFound(res);
    }
    const filter = FILTERS.some(([k]) => k === url.searchParams.get("filter")) ? url.searchParams.get("filter") : "all";
    const [first, ...rest] = segs;
    if (url.pathname === "/") return page(req, res, overview(filter));
    if (url.pathname === hrefs.runs) return page(req, res, runsPage());
    if (url.pathname === hrefs.commitPage) return page(req, res, commitPage());
    if (url.pathname === hrefs.all) return allPage().then((html) => page(req, res, html));
    if (url.pathname === hrefs.events) return sse.handle(req, res);
    if (first === "picture") {
      const out = rest.join("/");
      if (!isDocsImage(out)) return notFound(res, `${out} is not a picture`);
      // a picture of the session has its page of verdicts; any other image under docs, a plain one
      const html = detail(out, filter);
      if (html) return page(req, res, html);
      return plainPage(out).then((plain) =>
        plain ? page(req, res, plain) : notFound(res, `${out} is not a picture of this session or under docs`),
      );
    }
    if (first === "log") {
      const n = Number(rest[0]);
      const log = runs.has(n) ? readIf(runPaths(session.root, n).log) : null;
      return log ? send(res, 200, "text/plain; charset=utf-8", log) : notFound(res);
    }
    if (first === "api" && rest[0] === "state" && rest.length === 1) {
      const m = model();
      return send(
        res,
        200,
        "application/json",
        JSON.stringify({
          baseline: session.data.baseline,
          runs: [...runs.values()].map(runRow),
          pictures: m.pictures,
          errors: Object.fromEntries(applier.errors),
        }),
      );
    }
    if (first === "file") {
      const [kind, ...more] = rest;
      if (kind === "head" || kind === "docs") {
        const out = more.join("/");
        if (!isDocsImage(out)) return notFound(res);
        return sendFile(req, res, out, kind === "head" ? revision.bytes(out) : readIf(path.join(docsRoot, out)));
      }
      const n = Number(more[0]);
      const rel = more.slice(1).join("/");
      if (!runs.has(n) || !rel || rel.split("/").some((s) => s === "" || s === ".." || s.includes("\\")))
        return notFound(res);
      if (kind === "run") return sendFile(req, res, rel, readIf(stageFile(n, rel)));
      if (kind === "ref" && isDocsPath(rel)) return sendFile(req, res, rel, referenceBytes(n, rel));
      if (kind === "held" && isDocsPath(rel)) return sendFile(req, res, rel, applier.heldPng(n, rel));
      return notFound(res);
    }
    if (first === "map" && rest[0] === "outside") {
      const out = rest.slice(1).join("/");
      if (!isDocsPath(out)) return notFound(res);
      const [a, b] = [revision.bytes(out), readIf(path.join(docsRoot, out))];
      if (!a || !b) return notFound(res);
      return sendFile(req, res, "map.png", changeMap(decodePng(a), decodePng(b)));
    }
    if (first === "map") {
      const [nText, part, ...more] = rest;
      const out = more.join("/");
      if (!runs.has(Number(nText)) || (part !== "png" && part !== "svg") || !isDocsPath(out)) return notFound(res);
      let bytes;
      try {
        bytes = mapBytes(Number(nText), part, out);
      } catch (e) {
        return send(res, 500, "text/plain; charset=utf-8", `the map could not be drawn: ${e.message}\n`);
      }
      return sendFile(req, res, "map.png", bytes);
    }
    return notFound(res);
  }

  const failed = (res, e) => {
    if (!res.headersSent) send(res, 500, "text/plain; charset=utf-8", `${e.stack ?? e}\n`);
    else res.end();
  };
  const server = createServer((req, res) => {
    try {
      handle(req, res)?.catch?.((e) => failed(res, e));
    } catch (e) {
      failed(res, e);
    }
  });
  return {
    server,
    listen(wanted = 0, host = "127.0.0.1") {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(wanted, host, () => {
          server.off("error", reject);
          port = server.address().port;
          resolve(port);
        });
      });
    },
    start,
    live,
    committing: () => committing?.done.catch(() => {}) ?? null,
    model,
    session: () => session,
    applyPending: () => applier.pending(),
    close() {
      // what the runs reported is applied before the server stops, at once
      while (queue.length) queue.shift()();
      shut = true;
      sse.close();
      const closed = new Promise((resolve) => server.close(() => resolve()));
      server.closeAllConnections();
      return closed;
    },
  };
}
