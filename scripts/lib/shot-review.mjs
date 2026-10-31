// What the screenshot review tool shows of a session (WIP.ShotReview.md, The pages): every
// picture its runs reported, each with the newest verdict on its PNG and on its SVG, and the
// group of the overview it is in. Nothing here reads a file: the server reads each run's
// events (shot-session.mjs) and verdicts (shot-stage.mjs), and passes in what else the model
// needs to know, such as whether a file is under docs/.

import { svgOf } from "./shot-apply.mjs";

/** The overview's groups, in its order: [key, heading]. */
export const GROUPS = [
  ["progress", "In progress"],
  ["look", "Needs a look"],
  ["changed", "Changed, most changed first"],
  ["noise", "Only noise"],
  ["unchanged", "Unchanged"],
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

/**
 * The group of the overview the picture `p` is in (GROUPS): `exists(path)` says whether a
 * file is under docs/.
 */
export function groupOf(p, exists) {
  if (p.progress) return "progress";
  if (p.failed) return "failed";
  if (p.png?.look || p.svg?.look) return "look";
  if (!p.png && !p.svg) return "failed";
  switch (p.png?.state) {
    case "updated":
      return "changed";
    case "new":
      return "added";
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
 * Returns {pictures, groups}: each picture {out, png, svg, failed, retake, skipped, progress,
 * group, measure}, `png` and `svg` with the run that gave them as `run`, `failed` and `retake`
 * {run, error | why} or null, `skipped` the run that did not take it, or null; `progress`
 * whether a run that is running still owes it a verdict; `measure` how much it changed, from
 * `measure(p)`, which orders the Changed group, most first. `groups` is GROUPS with each
 * one's pictures, [{key, title, pictures}].
 */
export function reviewPictures(runs, { exists = () => false, measure = () => 0 } = {}) {
  const byOut = new Map();
  const at = (out) => {
    if (!byOut.has(out))
      byOut.set(out, { out, png: null, svg: null, failed: null, retake: null, skipped: null, progress: false });
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
  const pictures = [...byOut.values()].sort((a, b) => (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));
  for (const p of pictures) {
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
  if (filter === "nosvg") return pictures.filter((p) => !hasSvg(p, exists));
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
