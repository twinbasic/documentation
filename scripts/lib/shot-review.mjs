// What the screenshot review tool shows of a session (WIP.ShotReview.md, The pages): every
// picture its runs reported, each with the newest verdict on its PNG and on its SVG, and the
// group of the overview it is in; and what a commit of the session takes, with its default
// message. Nothing here reads a file: the server reads each run's events (shot-session.mjs)
// and verdicts (shot-stage.mjs), and git's status (shot-revision.mjs), and passes in what else
// the model needs to know, such as whether a file is under docs/.

import { svgOf } from "./shot-apply.mjs";
import { SVG_FAITHFUL } from "./shot-policy.mjs";

/** The overview's groups, in its order: [key, heading]. */
export const GROUPS = [
  ["progress", "In progress"],
  ["look", "Needs a look"],
  ["changed", "Changed, most changed first"],
  ["noise", "Only noise"],
  ["outside", "Changed outside the session's runs"],
  ["unchanged", "Unchanged"],
  ["windows", "Program windows: PNG only"],
  ["added", "Added"],
  ["deleted", "Deleted"],
  ["failed", "Failed or not taken"],
];

/** The overview's filters: [key, label]. */
export const FILTERS = [
  ["all", "All"],
  ["look", "Needs a look"],
  ["overridden", "Overridden"],
  ["nosvg", "No SVG"],
];

/**
 * What the events of a run of `tool` ("shoot_docs" or "replay") say: {listed, svg, jobs,
 * failed, skipped, retakes, stopping, summary}. `listed` the pictures the run is to take or
 * draw, in its order; `svg` whether it gives each an SVG verdict (a replay's are SVG verdicts
 * only); `jobs` a Map from a job's name to {pictures, state, error}, state "waiting",
 * "started", "done" or "failed" (a job that failed is then reported done, and stays failed),
 * and `jobOf` from a picture to its job's name; `failed` a Map from a picture to its error;
 * `skipped` the pictures a stopped run did not take; `retakes` a Map from a picture replay
 * could not draw to why; `summary` the run's last event, or null while it runs.
 */
export function runFacts(tool, events) {
  const facts = {
    listed: [],
    svg: tool === "replay",
    jobs: new Map(),
    jobOf: new Map(),
    failed: new Map(),
    skipped: new Set(),
    retakes: new Map(),
    stopping: false,
    summary: null,
  };
  for (const e of events) {
    if (e.type === "run") {
      if (tool === "replay") facts.listed = e.pictures ?? [];
      else {
        facts.svg = !!e.svg;
        facts.listed = (e.jobs ?? []).flatMap((j) => j.pictures);
        for (const j of e.jobs ?? []) {
          facts.jobs.set(j.name, { pictures: j.pictures.length, state: "waiting", error: null });
          for (const out of j.pictures) facts.jobOf.set(out, j.name);
        }
      }
    } else if (e.type === "job" && facts.jobs.has(e.job)) {
      const job = facts.jobs.get(e.job);
      if (job.state !== "failed") job.state = e.state;
      if (e.state === "failed") job.error = e.error ?? null;
    } else if (e.type === "failed") facts.failed.set(e.out, e.error);
    else if (e.type === "skipped") facts.skipped.add(e.out);
    else if (e.type === "retake") facts.retakes.set(e.out, e.why);
    else if (e.type === "stopping") facts.stopping = true;
    else if (e.type === "summary") facts.summary = e;
  }
  return facts;
}

/**
 * The verdict a `picture` or `svg` event carries, as its part of a stage's verdict file: the
 * event without its type, job and picture. Returns [part, value], part "png" or "svg".
 */
export function verdictOfEvent(e) {
  const { type, job: _, out: __, ...value } = e;
  return [type === "picture" ? "png" : "svg", value];
}

// The PNG verdicts after which a run draws no SVG.
const NO_SVG = new Set(["dark", "once"]);

// Whether a run still owes the verdict `v` ({png, svg} or undefined) a part.
function owes(run, v) {
  if (run.tool === "replay") return !v?.svg;
  if (!v?.png) return true;
  return run.facts.svg && !v.svg && !NO_SVG.has(v.png.state);
}

/**
 * The SVG states that change the file: written or removed. "unchanged" and "not written"
 * leave it as it is.
 */
export const SVG_CHANGES = new Set(["new", "updated", "removed"]);

// What a run before 2026-11-01 said of a picture of program windows, which it did not mark;
// the one shot that turned its SVG off (References_Detail) said the same, until the converter
// drew a line-through and it was taken again with its SVG.
const OLD_WINDOW_WHY = "the picture is not a single capture";

/** Whether `p` is a picture of program windows, of which no SVG is drawn (svgVerdict's `window`). */
export const isWindow = (p) => !!p.svg?.window || p.svg?.why === OLD_WINDOW_WHY;

/**
 * The group of the overview the picture `p` is in (GROUPS): `exists(path)` says whether a
 * file is under docs/.
 */
export function groupOf(p, exists) {
  if (p.outside) return "outside";
  if (p.progress) return "progress";
  if (p.failed || p.png?.state === "failed") return "failed";
  if (p.png?.look || p.svg?.look) return "look";
  if (!p.png && !p.svg) return "failed";
  switch (p.png?.state) {
    case "updated":
      return "changed";
    case "new":
      return "added";
  }
  // a program's window has no SVG to look at or miss: a group of its own unless its PNG changed
  if (isWindow(p)) return "windows";
  switch (p.png?.state) {
    case "noise":
    case "restored":
      return "noise";
    case "dark":
    case "once":
      return exists(p.out) ? "deleted" : "unchanged";
  }
  return SVG_CHANGES.has(p.svg?.state) ? "changed" : "unchanged";
}

/**
 * Every picture the session's `runs` reported, in the overview's order: `runs` is
 * [{n, tool, live, facts, verdicts}], oldest first, `facts` runFacts', `verdicts` a Map from a
 * picture to {png, svg}, each part null or as the stage holds it. A picture takes its PNG
 * verdict from the newest run that gave it one, and its SVG verdict from the newest run since
 * then: an SVG changes with its PNG, so a retake's PNG verdict drops an older SVG's.
 *
 * `outside` lists the pictures under docs/ that differ from the baseline ([{out, status}], as
 * changedPictures gives them): those no run reported are in a group of their own, with
 * `outside` their status. A PNG verdict judged against the revision (`against`) of another
 * baseline than `baseline` (its `baseline`, which the review tool records as it applies it)
 * needs a look, `why` "baseline", when `stale(out, hash)` says the picture differs between that
 * commit and the baseline: the picture it was judged against has changed. A move to a commit
 * that changed no picture leaves every verdict as it was.
 *
 * Returns {pictures, groups}: each picture {out, png, svg, failed, retake, skipped, progress,
 * outside, group, measure}, `png` and `svg` with the run that gave them as `run`, `failed` and
 * `retake` {run, error | why} or null, `skipped` the run that did not take it, or null;
 * `progress` whether a run that is running still owes it a verdict; `measure` how much it
 * changed, from `measure(p)`, which orders the Changed group, most first. `groups` is GROUPS
 * with each one's pictures, [{key, title, pictures}].
 */
export function reviewPictures(
  runs,
  { exists = () => false, measure = () => 0, outside = [], baseline = null, stale = () => true } = {},
) {
  const byOut = new Map();
  const at = (out) => {
    if (!byOut.has(out))
      byOut.set(out, {
        out,
        png: null,
        svg: null,
        failed: null,
        retake: null,
        skipped: null,
        progress: false,
        outside: null,
      });
    return byOut.get(out);
  };
  for (const run of [...runs].sort((a, b) => a.n - b.n)) {
    const { facts, n } = run;
    for (const [out, v] of run.verdicts) {
      const p = at(out);
      if (v.png) {
        p.png = { run: n, ...v.png };
        p.svg = v.svg ? { run: n, ...v.svg } : null;
      } else if (v.svg) p.svg = { run: n, ...v.svg };
      if (v.png || v.svg) Object.assign(p, { failed: null, retake: null, skipped: null });
    }
    for (const [out, error] of facts.failed) at(out).failed = { run: n, error };
    for (const [out, why] of facts.retakes) at(out).retake = { run: n, why };
    for (const out of facts.skipped) if (!run.verdicts.has(out)) at(out).skipped = n;
    for (const out of facts.listed) {
      const p = at(out);
      const owed = !facts.failed.has(out) && !facts.skipped.has(out) && owes(run, run.verdicts.get(out));
      p.progress = run.live && owed;
      // a picture its job never reached, the job having failed first
      const job = facts.jobs.get(facts.jobOf.get(out));
      if (owed && job?.state === "failed" && !run.verdicts.get(out)?.png)
        p.failed = { run: n, error: `its job, ${facts.jobOf.get(out)}, failed: ${job.error}` };
    }
  }
  for (const { out, status } of outside) if (!byOut.has(out)) at(out).outside = status;
  const pictures = [...byOut.values()].sort((a, b) => (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));
  for (const p of pictures) {
    if (
      baseline &&
      p.png?.against === "revision" &&
      p.png.baseline &&
      p.png.baseline !== baseline &&
      stale(p.out, p.png.baseline)
    )
      p.png = {
        ...p.png,
        look: { why: "baseline", text: "judged against the picture of the session's earlier baseline" },
      };
    p.group = groupOf(p, exists);
    p.measure = p.group === "changed" ? measure(p) : 0;
  }
  const groups = GROUPS.map(([key, title]) => ({ key, title, pictures: pictures.filter((p) => p.group === key) }));
  const changed = groups.find((g) => g.key === "changed");
  changed.pictures.sort((a, b) => b.measure - a.measure || (a.out < b.out ? -1 : 1));
  return { pictures: groups.flatMap((g) => g.pictures), groups };
}

/**
 * Whether the picture `p` has an SVG once its verdicts are applied: written by this one, or a
 * file there that it leaves.
 */
export function hasSvg(p, exists) {
  const state = p.svg?.state;
  if (state === "new" || state === "updated") return true;
  if (state === "removed" || state === "not written") return false;
  return exists(svgOf(p.out));
}

/**
 * The pictures of `pictures` (in the overview's order) a filter of FILTERS shows:
 * `overridden(out)` whether the manifest holds a decision or an allowance for one,
 * `exists(path)` whether a file is under docs/. An unknown filter shows them all.
 */
export function filterPictures(pictures, filter, { overridden = () => false, exists = () => false } = {}) {
  if (filter === "look") return pictures.filter((p) => p.group === "look");
  if (filter === "overridden") return pictures.filter((p) => overridden(p.out));
  // a program's window cannot have one: its own group says so
  if (filter === "nosvg") return pictures.filter((p) => !hasSvg(p, exists) && !isWindow(p));
  return pictures;
}

/** Whether a manifest entry holds a decision or an allowance: anything but the build. */
export const isOverridden = (entry) => !!(entry?.png || entry?.svg);

/** Where `out` is in `list` (pictures): {index, prev, next}, index -1 and no neighbours when it is not there. */
export function neighbours(list, out) {
  const index = list.findIndex((p) => p.out === out);
  if (index < 0) return { index, prev: null, next: null };
  return { index, prev: list[index - 1] ?? null, next: list[index + 1] ?? null };
}

// ---- the commit -----------------------------------------------------------------------
//
// The session's own files (WIP.ShotReview.md, Commit) are the PNG and the SVG of each picture a
// run of it reported, and the manifest; of those, a commit takes the ones git reports changed.
// A clean-up's pictures are not among them: it puts a picture back as the baseline has it, and
// the session is committed only while its baseline is HEAD, so what a clean-up put back has
// nothing to commit. A picture changed outside the session's runs is left out, with every other
// change of the working tree.

const writes = (state) => state === "new" || state === "updated";

// Whether a picture's entry in the manifest changes its SVG's bar.
const svgAllowance = (entry) => !!(entry?.svg?.bar || entry?.svg?.ignore);

/**
 * What a commit of the session takes: `pictures` reviewPictures', `changes` what the working
 * tree changed ([{path, status}], paths from the repository's root: shot-revision.mjs's
 * workingChanges), `docsPrefix` the pictures' folder from the repository's root with a closing
 * slash ("docs/"), `manifestPath` the manifest's ("test/shots/manifest.json"), and `entry(out)`
 * a picture's entry in the manifest, or null.
 *
 * Returns {files, leftOut, counts, build}: `files` the files to commit, [{path, status, out,
 * part, why}], `part` "png", "svg" or "manifest" and `why` what the session did to it; `leftOut`
 * the working tree's other changes ([{path, status}]); `counts` {changed, created, taken, kept,
 * dropped, svgWritten, svgByAllowance, svgByReview, svgRemoved, manifest}; and `build` the newest
 * build a PNG committed was taken on, or null. A PNG kept at the baseline by a review is counted
 * (`kept`) though it has nothing to commit, as its decision is in the manifest.
 */
export function commitPlan({ pictures, changes, docsPrefix, manifestPath, entry = () => null }) {
  const status = new Map(changes.map((c) => [c.path, c.status]));
  const files = [];
  const counts = {
    changed: 0,
    created: 0,
    taken: 0,
    kept: 0,
    dropped: 0,
    svgWritten: 0,
    svgByAllowance: 0,
    svgByReview: 0,
    svgRemoved: 0,
    manifest: false,
  };
  let build = null;
  const take = (file, part, why, out = null) => files.push({ path: file, status: status.get(file), out, part, why });
  for (const p of pictures) {
    if (p.outside || (!p.png && !p.svg)) continue;
    const pngPath = docsPrefix + p.out;
    const svgPath = docsPrefix + svgOf(p.out);
    const png = p.png;
    if (status.has(pngPath)) {
      let why;
      if (status.get(pngPath) === "deleted") {
        counts.dropped++;
        why = png?.state === "once" ? "removed: the picture is taken once" : "removed: the dark picture's pixels";
      } else if (png?.by === "decision" && writes(png.state)) {
        counts.taken++;
        why = "taken by review, against the tool's verdict";
      } else {
        counts.changed++;
        if (status.get(pngPath) === "added") counts.created++;
        why = status.get(pngPath) === "added" ? "new" : "changed by the tool's verdict";
      }
      if (png?.build && writes(png.state) && (build === null || png.build > build)) build = png.build;
      take(pngPath, "png", why, p.out);
    } else if (
      png?.by === "decision" &&
      entry(p.out)?.png?.decision?.keep === "old" &&
      !writes(png.state) &&
      png.state !== "dark" &&
      png.state !== "once"
    )
      // (a "new" decision about a capture that is the file's own bytes kept nothing against the tool)
      counts.kept++;
    if (status.has(svgPath)) {
      let why;
      if (status.get(svgPath) === "deleted") {
        counts.svgRemoved++;
        why = "removed";
      } else {
        counts.svgWritten++;
        why = "written";
        if (p.svg?.by === "decision") {
          counts.svgByReview++;
          why = "written: accepted by review";
        } else if (svgAllowance(entry(p.out)) && !(p.svg?.stats?.pct96 < SVG_FAITHFUL)) {
          counts.svgByAllowance++;
          why = "written: accepted by its allowance";
        }
      }
      take(svgPath, "svg", why, p.out);
    }
  }
  if (status.has(manifestPath)) {
    counts.manifest = true;
    take(manifestPath, "manifest", "the review's decisions and allowances, and the builds");
  }
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const committed = new Set(files.map((f) => f.path));
  return { files, leftOut: changes.filter((c) => !committed.has(c.path)), counts, build };
}

const many = (n, one, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

/**
 * A commit's default message, one line, from commitPlan's `counts` and `build`: "Screenshots
 * retaken on BETA 1501: 39 pictures changed, 3 kept at HEAD by review; 35 SVGs written (2 by
 * allowance), 1 removed". Null when there is nothing to commit.
 */
export function commitMessage({ counts: c, build }) {
  const pictures = [];
  if (c.changed) pictures.push(`${many(c.changed, "picture")} changed${c.created ? ` (${c.created} new)` : ""}`);
  if (c.taken) pictures.push(`${c.taken} taken by review`);
  if (c.kept) pictures.push(`${c.kept} kept at HEAD by review`);
  if (c.dropped) pictures.push(`${many(c.dropped, "light picture")} removed`);
  const svgs = [];
  if (c.svgWritten) {
    const by = [
      c.svgByAllowance ? `${c.svgByAllowance} by allowance` : null,
      c.svgByReview ? `${c.svgByReview} by review` : null,
    ].filter(Boolean);
    svgs.push(`${many(c.svgWritten, "SVG")} written${by.length ? ` (${by.join(", ")})` : ""}`);
  }
  if (c.svgRemoved) svgs.push(c.svgWritten ? `${c.svgRemoved} removed` : `${many(c.svgRemoved, "SVG")} removed`);
  const parts = [pictures.join(", "), svgs.join(", ")].filter(Boolean).join("; ");
  if (!parts) return c.manifest ? "Screenshot review: the manifest's decisions and allowances" : null;
  const changes = c.changed || c.taken || c.dropped;
  const what =
    build && changes
      ? `Screenshots retaken on BETA ${build}`
      : changes
        ? "Screenshots retaken"
        : pictures.length
          ? "Screenshots reviewed"
          : "Screenshot SVGs drawn again";
  return `${what}: ${parts}`;
}
