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

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { DOCS_DIR, REPO_ROOT } from "../../lib/repo-paths.mjs";
import { createSseChannel } from "../../lib/sse.mjs";
import { decodePng, pngSize } from "./png.mjs";
import { svgOf } from "./shot-apply.mjs";
import { changeMap, shareOff, strengthPicture } from "./shot-change.mjs";
import { hashOf } from "./shot-manifest.mjs";
import { commitHtml, detailHtml, hrefs, outsideHtml, overviewHtml, runsHtml } from "./shot-pages.mjs";
import { pngRule, svgRule } from "./shot-policy.mjs";
import { commitPaths, workingChanges } from "./shot-revision.mjs";
import { createApplier } from "./shot-verdicts.mjs";
import {
  commitMessage,
  commitPlan,
  FILTERS,
  filterPictures,
  isOverridden,
  neighbours,
  reviewPictures,
  runFacts,
  verdictOfEvent,
} from "./shot-review.mjs";
import { kindOf, runOf, startRun } from "./shot-runs.mjs";
import { commandOf, optionOf, readEvents, runPaths } from "./shot-session.mjs";
import { readStrength, readVerdicts } from "./shot-stage.mjs";

const TYPES = { ".png": "image/png", ".svg": "image/svg+xml" };

// A picture's or an SVG's path under docs/, as a URL gives it: forward slashes, no empty or
// parent segment.
const isDocsPath = (p) =>
  /^[^\\]+\.(png|svg)$/i.test(p) && !p.startsWith("/") && !p.split("/").some((s) => s === "" || s === "..");

const readIf = (file) => (existsSync(file) && statSync(file).isFile() ? readFileSync(file) : null);

// The most difference maps kept drawn: drawing one decodes a picture of up to 4.5 M pixels.
const MAPS_KEPT = 16;

// The most bytes a POST's body may have: an allowance with its rectangles, or a run of the
// pictures selected on the overview.
const MOST_BODY = 256 * 1024;

// The lines of a run's log the runs page shows while it runs: the last few.
const TAIL_LINES = 8;

/**
 * The server of the session `session` (openSession): `revision` the baseline as openRevision
 * gives it, `manifest()` the manifest as it is now (openManifest), `docsRoot` the pictures'
 * folder, `bundlesRoot` the bundle cache (or null), `head()` the baseline HEAD would make
 * ({hash, short, build}; null for none, or an error thrown when there is none to read),
 * `revisionAt(hash)` a revision as openRevision gives it, `changed()` the pictures that differ
 * from the baseline ([{out, status}], changedPictures'), `ides` the installs a retake can be run
 * on, newest first ([{build, exe}], listIdes'), `onLine(run, line)` called for each line of a run
 * meant for a person, and `command` the probes' stand-in for the tools a run starts (startRun).
 * `repoRoot` is a folder of the git working tree the session's files are committed in;
 * `onCommit({hash, short, message})` closes the session once its files are committed, and
 * returns the next one, {session, revision, archive}, `archive` the closed one's id in the
 * archive; `archived()` lists the archived sessions (shot-session.mjs's listArchived), which
 * the commit page names; and `readOnly` serves an archived session: nothing may be changed.
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
  revisionAt = null,
  changed = () => [],
  ides = [],
  onLine,
  command,
  repoRoot = REPO_ROOT,
  onCommit = () => {
    throw new Error("this server cannot close its session");
  },
  archived = () => [],
  readOnly = false,
}) {
  const newestIde = ides[0]?.build ?? null;
  const sse = createSseChannel();
  let revision = initialRevision;
  let applier = createApplier({ session, docsRoot, bundlesRoot, revision: () => revision, manifest });
  // The commit that closed the session before this one, as the pages say so: {hash, short,
  // message, archive}, or null.
  let lastCommit = null;
  // The commit under way, as the pages say so, {message, at, plan, done}, `plan` the one it
  // commits and `done` its promise; null when none is. git runs as a child process, so the
  // server goes on answering while it and the repository's hooks run.
  let committing = null;
  // HEAD as it is now, when it is not the baseline: read again at most once a second. While a
  // commit is under way HEAD moves to it before the session is closed, which is no news.
  let headSeen = { at: 0, value: null };
  const headNow = () => {
    if (committing) return null;
    if (Date.now() - headSeen.at > 1000) {
      let value = null;
      try {
        const h = head();
        value = h && h.hash !== session.data.baseline.hash ? h : null;
      } catch {}
      headSeen = { at: Date.now(), value };
    }
    return headSeen.value;
  };
  // The pictures changed outside the session's runs: read again at most once a second.
  let changedSeen = { at: 0, value: [] };
  const outside = () => {
    if (Date.now() - changedSeen.at > 1000) {
      let value = [];
      try {
        value = changed();
      } catch {}
      changedSeen = { at: Date.now(), value };
    }
    return changedSeen.value;
  };
  // run n -> {record, live, handle, events, facts, verdicts}
  const runs = new Map();
  const loadRuns = () => {
    runs.clear();
    for (const record of session.data.runs) {
      const files = runPaths(session.root, record.n);
      const events = readEvents(files.events);
      const verdicts = new Map(readVerdicts(files.stage).map((v) => [v.out, { png: v.png, svg: v.svg }]));
      runs.set(record.n, { record, live: false, handle: null, events, facts: runFacts(record.tool, events), verdicts });
    }
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
  // A run's verdicts as the pages show them: each part as it was applied (shot-verdicts.mjs),
  // judged again after a review, else as the run reported it.
  const shownVerdict = (n, out, v) => {
    const done = applier.reviewed(n, out);
    if (!done || !v) return v ?? null;
    return { png: done.done.includes("png") ? done.png : v.png, svg: done.done.includes("svg") ? done.svg : v.svg };
  };
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
      { exists, measure, outside: outside(), baseline: session.data.baseline.hash },
    );
  const filterOptions = { overridden: (out) => isOverridden(entry(out)), exists };

  // ---- runs ----
  const listedOf = (r) => r.facts.listed;
  const onEvent = (record, e) => {
    const r = runs.get(record.n);
    r.events.push(e);
    r.facts = runFacts(record.tool, r.events);
    if (e.type === "picture" || e.type === "svg") {
      const [part, value] = verdictOfEvent(e);
      const v = r.verdicts.get(e.out) ?? { png: null, svg: null };
      v[part] = value;
      r.verdicts.set(e.out, v);
      // applied as it arrives: the stage holds the verdict by the time its event is written
      applier.arrive(record.n, e.out, part);
    }
    if (e.out) sse.send("update", { outs: [e.out] });
    else sse.send("update", { outs: e.type === "run" || e.type === "summary" ? listedOf(r) : [], runs: true });
  };
  const onExit = (record) => {
    const r = runs.get(record.n);
    r.live = false;
    r.handle = null;
    if (record.tool === "cleanup") {
      // what it put back is no longer changed: every page that shows a picture may differ
      changedSeen = { at: 0, value: [] };
      sse.send("update", { outs: model().pictures.map((p) => p.out), runs: true });
    } else sse.send("update", { outs: listedOf(r), runs: true });
  };
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
    return start(runOf({ ...body, ide }, session.data.baseline));
  }
  // Stop asks a run to stop (its own stop: its IDEs end and the registry is put back); kill ends
  // its process, and is offered only once a stop has been asked for.
  function runAction(n, action) {
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
    const isDone = (out) => r.verdicts.get(out)?.[owed] || r.facts.failed.has(out) || r.facts.skipped.has(out);
    const done = r.facts.listed.filter(isDone).length;
    const jobs = [...r.facts.jobs].map(([name, j]) => ({
      name,
      state: j.state,
      error: j.error,
      pictures: j.pictures,
      done: r.facts.listed.filter((out) => r.facts.jobOf.get(out) === name && isDone(out)).length,
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
      listed: r.facts.listed.length,
      jobs,
    };
  };
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
    return runsHtml({
      runs: [...runs.values()].map((r) => ({ ...runRow(r), log: logOf(r) })),
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
    if (p.outside) {
      const atHead = revision.bytes(out);
      const now = readIf(path.join(docsRoot, out));
      return outsideHtml({
        p,
        ...pager,
        files: { head: file(hrefs.head(out), atHead), docs: file(hrefs.docs(out), now) },
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
  function act(out, body) {
    refuseWhileCleaning();
    const p = model().pictures.find((q) => q.out === out);
    if (!p || p.outside) throw new Error(`${out} has no verdict of this session to act on`);
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
  function moveToHead() {
    refuseWhileCleaning();
    const h = head();
    if (!h || !revisionAt) throw new Error("HEAD cannot be read");
    if (h.hash === session.data.baseline.hash) return;
    revision = revisionAt(h.hash);
    session.moveBaseline(h);
    headSeen = { at: 0, value: null };
    changedSeen = { at: 0, value: [] };
    maps.clear();
    measures.clear();
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
      headSeen = { at: 0, value: null };
      changedSeen = { at: 0, value: [] };
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
      refusal: commitRefusal(),
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
        moveToHead();
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
        runAction(Number(segs[2]), body.action);
        return sendJson(res, 200, { ok: true });
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
    if (url.pathname === hrefs.events) return sse.handle(req, res);
    if (first === "picture") {
      const out = rest.join("/");
      const html = isDocsPath(out) ? detail(out, filter) : null;
      return html ? page(req, res, html) : notFound(res, `${out} is not a picture of this session`);
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
        if (!isDocsPath(out)) return notFound(res);
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
      sse.close();
      const closed = new Promise((resolve) => server.close(() => resolve()));
      server.closeAllConnections();
      return closed;
    },
  };
}
