// What the screenshot review tool shows of a session (WIP.ShotReview.md, The pages): every
// picture its runs reported, each with the newest verdict on its PNG and on its SVG, and the
// group of the overview it is in; and what a commit of the session takes, with its default
// message. Nothing here reads a file: the server reads each run's events (shot-session.mjs)
// and verdicts (shot-stage.mjs), and git's status (shot-revision.mjs), and passes in what else
// the model needs to know, such as whether a file is under docs/.

import { THUMB_DIR_REL } from "../../builder/vendor-assets.mjs";
import { svgOf } from "./shot-apply.mjs";
import { SVG_FAITHFUL } from "./shot-policy.mjs";
import { WINDOW_WHY } from "./shot-stage.mjs";

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
  ["retake", "Needs a retake"],
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
 * What the events of a run of `tool` ("shoot_docs" or "replay") say: {listed, svg, build, jobs,
 * failed, skipped, retakes, stopping, summary, awaiting, refused, extension, captures}. `listed` the pictures the run is to take or
 * draw, in its order; `svg` whether it gives each an SVG verdict (a replay's are SVG verdicts
 * only); `build` the IDE's build a retake ran on, or null; `jobs` a Map from a job's name to {pictures, state, error}, state "waiting",
 * "started", "done" or "failed" (a job that failed is then reported done, and stays failed),
 * and `jobOf` from a picture to its job's name; `failed` a Map from a picture to its error;
 * `skipped` the pictures a stopped run did not take; `retakes` a Map from a picture replay
 * could not draw to why; `summary` the run's last event, or null while it runs.
 */
export function runFacts(tool, events) {
  const facts = {
    listed: [],
    svg: tool === "replay",
    build: null,
    jobs: new Map(),
    jobOf: new Map(),
    failed: new Map(),
    skipped: new Set(),
    retakes: new Map(),
    stopping: false,
    summary: null,
    // a browser retake's: the picture it waits for a person to take, {job, out, url, shows}, why
    // their last capture was refused, what to do about the extension, and where captures land
    awaiting: null,
    refused: null,
    extension: null,
    captures: null,
  };
  for (const e of events) {
    if (e.type === "run") {
      if (tool === "replay") facts.listed = e.pictures ?? [];
      else {
        facts.svg = !!e.svg;
        facts.build = e.build ?? null;
        facts.extension = e.extension ?? null;
        facts.captures = e.captures ?? null;
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
      if (e.state !== "started" && facts.awaiting?.job === e.job) facts.awaiting = null;
    } else if (e.type === "await") {
      facts.awaiting = { job: e.job, out: e.out, url: e.url, shows: e.shows };
      facts.refused = null;
    } else if (e.type === "refused") facts.refused = e.error;
    else if (e.type === "failed") facts.failed.set(e.out, e.error);
    else if (e.type === "skipped") facts.skipped.add(e.out);
    else if (e.type === "retake") facts.retakes.set(e.out, e.why);
    else if (e.type === "stopping") facts.stopping = true;
    else if (e.type === "summary") {
      facts.summary = e;
      facts.awaiting = null;
    }
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

/** A picture's two files, as a part of a verdict names them. */
export const PARTS = ["png", "svg"];

// The PNG states after which the session has decided what the file holds: written, put back as
// the baseline has it (with its SVG), or removed (with its SVG).
const PNG_DECIDED = new Set(["new", "updated", "restored", "dark", "once"]);

/**
 * Which files of its picture a layer's verdict `v` ({png, svg} as applied) decided, {png, svg}:
 * the PNG when it was written, put back or removed; the SVG when it was written or removed, or
 * its PNG was any of those (an SVG goes with its PNG: one the layer left as it was, beside a PNG
 * it wrote, is the SVG it judged). An SVG that stayed beside a PNG that stayed was not decided:
 * whatever it holds is what the layer found, a change from outside the session's runs included.
 */
export function wroteOf(v) {
  const png = PNG_DECIDED.has(v?.png?.state);
  return { png, svg: png || SVG_CHANGES.has(v?.svg?.state) };
}

/**
 * Whether `p` is a picture of program windows, of which no SVG is drawn (svgVerdict's
 * `window`). A run before the mark said "the picture is not a single capture" of these and of
 * a shot that turned its SVG off (References_Detail) alike, so its verdict is not one: a
 * retake marks it.
 */
export const isWindow = (p) => !!p.svg?.window;

/**
 * The group of the overview the picture `p` is in (GROUPS): `exists(path)` says whether a
 * file is under docs/.
 */
export function groupOf(p, exists) {
  if (p.outside) return "outside";
  if (p.progress) return "progress";
  if (p.failed || p.png?.state === "failed") return "failed";
  // a replay could not draw its SVG again from its bundle: whatever the PNG's verdict, the
  // SVG under docs is left as it was until a retake
  if (p.retake) return "retake";
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
 * `outside` lists the pictures under docs/ whose PNG or SVG differs from the baseline ([{out,
 * status, parts}], as changedPictures gives them with `svgs`; an entry with no `parts` is its
 * PNG's). A file that differs and that no layer of the session decided (wroteOf) was changed
 * outside the session's runs, whether a run reported the picture or not: its picture is in a
 * group of its own, `outside` saying what changed (the status for a picture no run reported, else
 * "SVG modified" and the like), `outsideParts` which files, and `outsideKept` whether
 * `outsideKept(out, parts)` says a review kept them as they are (the session's record, against
 * the files' bytes). Nothing changed outside is committed until a review keeps it or puts it
 * back. A PNG verdict judged against the revision (`against`) of another
 * baseline than `baseline` (its `baseline`, which the review tool records as it applies it)
 * needs a look, `why` "baseline", when `stale(out, hash)` says the picture differs between that
 * commit and the baseline: the picture it was judged against has changed. A move to a commit
 * that changed no picture leaves every verdict as it was.
 *
 * Returns {pictures, groups}: each picture {out, png, svg, failed, retake, skipped, progress,
 * outside, outsideParts, outsideKept, group, measure}, `png` and `svg` with the run that gave
 * them as `run`, `failed` and
 * `retake` {run, error | why} or null, `skipped` the run that did not take it, or null;
 * `progress` whether a run that is running still owes it a verdict; `measure` how much it
 * changed, from `measure(p)`, which orders the Changed group, most first. `groups` is GROUPS
 * with each one's pictures, [{key, title, pictures}].
 */
export function reviewPictures(
  runs,
  {
    exists = () => false,
    measure = () => 0,
    outside = [],
    baseline = null,
    stale = () => true,
    outsideKept = () => false,
  } = {},
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
        outsideParts: [],
        outsideKept: false,
      });
    return byOut.get(out);
  };
  // which of a picture's files a layer of the session wrote (wroteOf), over every layer
  const mine = new Map();
  for (const run of [...runs].sort((a, b) => a.n - b.n)) {
    const { facts, n } = run;
    for (const [out, v] of run.verdicts) {
      const p = at(out);
      if (v.png) {
        p.png = { run: n, ...v.png };
        p.svg = v.svg ? { run: n, ...v.svg } : null;
      } else if (v.svg) p.svg = { run: n, ...v.svg };
      if (v.png || v.svg) Object.assign(p, { failed: null, retake: null, skipped: null });
      const wrote = wroteOf(v);
      const had = mine.get(out) ?? { png: false, svg: false };
      mine.set(out, { png: had.png || wrote.png, svg: had.svg || wrote.svg });
    }
    for (const [out, error] of facts.failed) at(out).failed = { run: n, error };
    for (const [out, why] of facts.retakes) at(out).retake = { run: n, why };
    for (const out of facts.skipped) if (!run.verdicts.has(out)) at(out).skipped = n;
    for (const out of facts.listed) {
      const p = at(out);
      const owed =
        !facts.failed.has(out) &&
        !facts.skipped.has(out) &&
        !facts.retakes.has(out) &&
        owes(run, run.verdicts.get(out));
      p.progress = run.live && owed;
      // a picture its job never reached, the job having failed first
      const job = facts.jobs.get(facts.jobOf.get(out));
      if (owed && job?.state === "failed" && !run.verdicts.get(out)?.png)
        p.failed = { run: n, error: `its job, ${facts.jobOf.get(out)}, failed: ${job.error}` };
    }
  }
  for (const change of outside) {
    const { out, status } = change;
    const parts = change.parts ?? { png: status, svg: null };
    const reported = byOut.has(out);
    const wrote = mine.get(out) ?? { png: false, svg: false };
    const unexplained = PARTS.filter((part) => parts[part] && !wrote[part]);
    if (!unexplained.length) continue;
    const p = at(out);
    p.outside = reported ? unexplained.map((part) => `${part.toUpperCase()} ${parts[part]}`).join(", ") : status;
    p.outsideParts = unexplained;
    p.outsideKept = !!outsideKept(out, unexplained);
  }
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

/**
 * A run's verdict on a picture, `v` ({png, svg} as its stage holds it, or null), as the review
 * tool applied it: `done` is what it applied (shot-stage.mjs's readReviewed), or null, and each
 * part it applied takes the place of the run's.
 */
export function appliedVerdict(v, done) {
  if (!done || !v) return v ?? null;
  return { png: done.done.includes("png") ? done.png : v.png, svg: done.done.includes("svg") ? done.svg : v.svg };
}

// ---- every picture --------------------------------------------------------------------
//
// The page of every picture (WIP.ShotReview.md, All pictures) shows the pictures as the working
// tree has them, whatever any session did: every picture shoot_docs.mjs's table names
// (shoot_docs.mjs --list), each with its PNG and SVG as they are under docs/, its build and
// allowances from the manifest, and for one with no SVG, why, from the newest verdict that says;
// and every other image under docs/, which no run can take.

/** The groups of the page of every picture, in its order: [key, heading]. */
export const ALL_GROUPS = [
  ["windows", "No SVG: program windows"],
  ["nosvg", "No SVG"],
  ["missing", "Not under docs"],
  ["overridden", "With an allowance or a review's decision"],
  ["uncaptured", "No automated capture"],
  ["svg", "With an SVG"],
];

// The images that are no pictures of the documentation to look at: what a script makes (a
// diagram's SVG, beside its DOT source; the build's Gantt chart; a video's poster frame) and the
// favicon, which never changes.
const NOT_LISTED = new Set(["assets/images/gantt.svg", "favicon.png"]);
const notListed = (out, exists) =>
  NOT_LISTED.has(out) ||
  out.startsWith(`${THUMB_DIR_REL}/`) ||
  (/\.svg$/i.test(out) && exists(out.replace(/\.svg$/i, ".dot")));

/** The light picture of a dark one's path. */
const lightOf = (out) => out.replace(/\.png$/i, ".light.png");

// A verdict's share is a percentage already (decideSvg's, as the manifest's).
const pctText = (share) => `${+share.toFixed(3)}%`;

/**
 * What an SVG verdict (svgVerdict's shape) says of why its picture has no SVG, {why, text}, or
 * null when it says nothing: an SVG left as it was with its PNG, and not judged. `why` is
 * "window", "refused", "accepted" (judged faithful, and not written: its PNG was not) or "none"
 * (no SVG was drawn).
 */
export function noSvgReason(svg) {
  if (!svg) return null;
  if (svg.window) return { why: "window", text: WINDOW_WHY };
  if (svg.faithful === false)
    return {
      why: "refused",
      text: `refused: ${svg.share !== null && svg.share !== undefined ? `${pctText(svg.share)} of its pixels strongly off its PNG` : (svg.measures ?? svg.why ?? "too far off its PNG")}`,
    };
  if (svg.faithful === true)
    return { why: "accepted", text: `drawn and accepted, but not written: ${svg.why ?? "its PNG was not written"}` };
  if (svg.state === "not written" || svg.state === "removed")
    return { why: "none", text: svg.why ?? "no SVG was drawn of it" };
  return null;
}

/**
 * Every picture the table `shots` names (shoot_docs.mjs --list: [{out, setup, once, window}],
 * `out` the dark picture's), as the page of every picture shows them: the dark picture, and the
 * light one when the table takes it and it is under docs/ (one that is not is the dark one's
 * pixels, and the page shows the dark one in both themes). `exists(path)` says whether a file is
 * under docs/, `entry(out)` a picture's entry in the manifest, or null, and `verdicts(out)` the
 * SVG verdicts any session gave it, newest first, [{svg, where}], `where` {session, run} (the
 * session's id, null for the one being served). `images` is every image file under docs/: each
 * that no shot takes is listed too, as `uncaptured`, unless a script makes it (NOT_LISTED).
 *
 * Returns {pictures, groups}: each picture {out, setup, window, once, png, svg, bothThemes,
 * build, reason, group, uncaptured}, `png` and `svg` whether each file is under docs/,
 * `bothThemes` that the dark picture is shown in both themes, `build` the manifest's, and `reason`
 * for a picture of the table with no SVG {why, text, where}: the table's for a program's window,
 * else the newest verdict's that says (noSvgReason), with where it is from, else {why: "unknown"}.
 * `groups` is ALL_GROUPS with each one's pictures, [{key, title, pictures}]; the No SVG group is
 * ordered by reason, then path.
 */
export function allPictures({ shots, exists, entry = () => null, verdicts = () => [], images = [] }) {
  const pictures = [];
  for (const shot of shots) {
    const light = lightOf(shot.out);
    const outs = [shot.out, ...(!shot.once && exists(light) ? [light] : [])];
    for (const out of outs) {
      const e = entry(out);
      const p = {
        out,
        setup: shot.setup,
        window: !!shot.window,
        once: !!shot.once,
        png: exists(out),
        svg: exists(svgOf(out)),
        bothThemes: out === shot.out && !shot.once && outs.length === 1,
        build: e?.build ?? null,
        reason: null,
        group: null,
        uncaptured: false,
      };
      if (!p.svg) {
        if (p.window) p.reason = { ...noSvgReason({ window: true }), where: null };
        else {
          const said = verdicts(out).find((v) => noSvgReason(v.svg));
          p.reason = said
            ? { ...noSvgReason(said.svg), where: said.where }
            : { why: "unknown", text: "no verdict of any session says why", where: null };
        }
      }
      p.group = !p.png ? "missing" : !p.svg ? (p.window ? "windows" : "nosvg") : isOverridden(e) ? "overridden" : "svg";
      pictures.push(p);
    }
  }
  const taken = new Set(shots.flatMap((shot) => [shot.out, lightOf(shot.out)]).flatMap((out) => [out, svgOf(out)]));
  for (const out of images) {
    if (taken.has(out) || notListed(out, exists)) continue;
    pictures.push({
      out,
      setup: null,
      window: false,
      once: false,
      png: true,
      svg: false,
      bothThemes: false,
      build: null,
      reason: null,
      group: "uncaptured",
      uncaptured: true,
    });
  }
  pictures.sort((a, b) => (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));
  const groups = ALL_GROUPS.map(([key, title]) => ({ key, title, pictures: pictures.filter((p) => p.group === key) }));
  groups
    .find((g) => g.key === "nosvg")
    .pictures.sort((a, b) =>
      a.reason.why < b.reason.why ? -1 : a.reason.why > b.reason.why ? 1 : a.out < b.out ? -1 : 1,
    );
  return { pictures: groups.flatMap((g) => g.pictures), groups };
}

// ---- the commit -----------------------------------------------------------------------
//
// The session's own files (WIP.ShotReview.md, Commit) are the PNG and the SVG of each picture a
// run of it reported, and the manifest; of those, a commit takes the ones git reports changed.
// A clean-up's pictures are not among them: it puts a picture back as the baseline has it, and
// the session is committed only while its baseline is HEAD, so what a clean-up put back has
// nothing to commit. A file changed outside the session's runs is taken once a review has kept
// it, and holds the commit back until a review keeps it or puts it back; every other change of
// the working tree is left out.

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
 * Returns {files, leftOut, counts, build, undecided}: `files` the files to commit, [{path,
 * status, out, part, why}], `part` "png", "svg" or "manifest" and `why` what the session did to
 * it; `leftOut` the working tree's other changes ([{path, status}]); `counts` {changed, created,
 * taken, kept, dropped, svgWritten, svgByAllowance, svgByReview, svgRemoved, outsideKept,
 * manifest}; `build` the newest build a PNG committed was taken on, or null; and `undecided` the
 * pictures changed outside the session's runs that no review has kept or put back, none of whose
 * files is taken (undecidedRefusal). A file changed outside the runs that a review kept is
 * taken, and its picture counted in `outsideKept`. A PNG kept at the baseline by a review is
 * counted (`kept`) though it has nothing to commit, as its decision is in the manifest.
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
    outsideKept: 0,
    manifest: false,
  };
  let build = null;
  const undecided = [];
  const take = (file, part, why, out = null) => files.push({ path: file, status: status.get(file), out, part, why });
  for (const p of pictures) {
    if (!p.outside && !p.png && !p.svg) continue;
    // a file changed outside the runs: nothing of its picture goes until a review keeps it or puts it back
    const outsideParts = new Set(p.outside ? (p.outsideParts?.length ? p.outsideParts : ["png"]) : []);
    if (outsideParts.size && !p.outsideKept) {
      undecided.push(p.out);
      continue;
    }
    if (outsideParts.size) counts.outsideKept++;
    const pngPath = docsPrefix + p.out;
    const svgPath = docsPrefix + svgOf(p.out);
    const png = p.png;
    if (outsideParts.has("png") && status.has(pngPath)) take(pngPath, "png", KEPT_OUTSIDE, p.out);
    else if (status.has(pngPath)) {
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
    if (outsideParts.has("svg") && status.has(svgPath)) take(svgPath, "svg", KEPT_OUTSIDE, p.out);
    else if (status.has(svgPath)) {
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
  return { files, leftOut: changes.filter((c) => !committed.has(c.path)), counts, build, undecided };
}

// Why a file changed outside the runs is committed.
const KEPT_OUTSIDE = "changed outside the runs, kept by review";

/**
 * Why a commit of the session `plan` (commitPlan's) is refused for what it leaves undecided, or
 * null: a picture changed outside the session's runs that no review has kept or put back. A
 * commit leaves nothing of the pictures behind (WIP.ShotReview.md, Commit).
 */
export function undecidedRefusal(plan) {
  const n = plan?.undecided?.length ?? 0;
  if (!n) return null;
  return `${many(n, "picture")} changed outside the session's runs ${n === 1 ? "needs" : "need"} Keep or Put back first: ${plan.undecided.slice(0, 3).join(", ")}${n > 3 ? ", ..." : ""}`;
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
  if (c.outsideKept) pictures.push(`${c.outsideKept} kept from outside the runs`);
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
