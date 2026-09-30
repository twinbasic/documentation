// check_examples.mjs's batches: how samples are packed into projects, the
// canaries each batch carries, how a batch whose build crashed is cut down to
// the samples that crash it, and the probes that test all of it.
//
// None of it needs an IDE. A batch is built through a lane, and the probes
// hand `runBatch` a fake one, so test/example-batches.test.mjs runs them
// without a twinBASIC install; check_examples.mjs runs them too, before every
// run. The lane that stages and builds for real stays in check_examples.mjs,
// with everything else that reads the command line.

import {
  BODY_SLOTS, CONCAT_KEY, HIDDEN_MARKER, MARKER, RUN_MARKER, SLOTS, classify,
  concatFences, parseInfo, partOf, resourcePath, wrapFence,
} from "./tb-fences.mjs";

/** check_examples.mjs's defaults for `--jobs` and `--batch`, which the probes batch with. */
export const DEFAULT_JOBS = 4;
export const DEFAULT_BATCH = 120;

/**
 * Join every `concat_group` into one fence before anything else looks at them.
 *
 * Done here rather than in the batcher because the members are unclassifiable
 * apart -- each half of a split `Class` is an unclosed block -- so the join has
 * to happen before `classify`, not after. Members keep their identity through
 * `concatParts`, which is what turns a diagnostic back into a page line.
 */
export function joinConcatGroups(fences) {
  const groups = new Map();
  const out = [];
  for (const fence of fences) {
    const name = fence.keys.get(CONCAT_KEY);
    if (!name) { out.push(fence); continue; }
    // A group is its page's own, the way hidden context is. Keyed by name
    // alone, two pages that picked the same name would be stitched into one
    // unit -- a class opened on one page and closed on another -- and nothing
    // would say so, because the join happens before anything is classified.
    const key = `${fence.rel}\u0000${name}`;
    if (!groups.has(key)) { groups.set(key, []); out.push({ concatPlaceholder: key }); }
    groups.get(key).push(fence);
  }
  return out.flatMap((f) => {
    if (!f.concatPlaceholder) return [f];
    const parts = groups.get(f.concatPlaceholder)
      .sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line);
    return [concatFences(parts)];
  });
}

// ------------------------------------------------------------------- batching
//
// A batch is a project. Two samples may not land in one when they would declare
// the same name at project scope -- `Class MyClass` appears on four pages -- so
// the packer keeps the names each open batch has already taken and puts a
// colliding sample in the next batch that has room for it.

// The unit a sample is placed with. Samples sharing a `projname` are placed as
// ONE unit, because they are one program: the Assert tutorial defines PadLeft
// in one fence and tests it in the next three, and any of those alone is not a
// sample anybody wrote.
//
// Nothing groups by accident. An ungrouped sample is its own unit, so a
// sample can never quietly come to depend on a neighbour that a later edit
// moves to another project -- which is exactly how the survey and the gate
// came to disagree about the same tutorial, one run finding PadLeft in the
// batch and the other not.
function unitKey(fence) {
  return fence.keys.get("projname") ? `@${fence.keys.get("projname")}` : `#${fence.id}`;
}

export function makeBatches(fences, { batchSize = DEFAULT_BATCH, jobs = DEFAULT_JOBS } = {}) {
  // A `hidden` fence is not a unit of its own: it is the PAGE's context, and
  // it joins every project that holds a sample from that page. So a page can
  // carry the declarations its samples assume -- the class its prose describes
  // but never lists, an API Declare -- instead of those living in a template
  // stage set shared with six hundred unrelated pages.
  //
  // Keyed by page AND template, because the same page can send samples to two
  // templates and a hidden block compiled into the wrong one would fail for a
  // reason that has nothing to do with the page.
  //
  // A `resource` fence travels the same way and for the same reason -- it is a
  // file the page's samples read at compile time, not a unit of its own.
  const hiddenByPage = new Map();
  const visible = [];
  for (const f of fences) {
    if (!f.flags.has(HIDDEN_MARKER) && !f.isResource) { visible.push(f); continue; }
    const key = `${f.project}\u0000${f.rel}`;
    if (!hiddenByPage.has(key)) hiddenByPage.set(key, []);
    hiddenByPage.get(key).push(f);
  }
  const hiddenFor = (project, rel) => hiddenByPage.get(`${project}\u0000${rel}`) ?? [];

  const byProject = new Map();
  for (const f of visible) {
    if (!byProject.has(f.project)) byProject.set(f.project, []);
    byProject.get(f.project).push(f);
  }
  // Fill the lanes rather than the batches. Filling each batch to --batch
  // before opening another one put 120, 55, 4 and 3 samples on four lanes, and
  // a lane's cost is ~8 s of IDE startup plus a compile that is nearly free --
  // so the run takes as long as its biggest batch whatever the others do.
  // ...but not below a floor, or a three-sample run starts three IDEs to save
  // nothing: the wall time of one batch is IDE startup either way, and the
  // extra instances only compete for the box.
  const target = Math.min(batchSize, Math.max(16, Math.ceil(fences.length / jobs)));
  const batches = [];
  for (const [project, list] of byProject) {
    // Units, in first-appearance order, so the layout is a function of the
    // selection and nothing else.
    const units = new Map();
    for (const fence of list) {
      const key = unitKey(fence);
      if (!units.has(key)) units.set(key, []);
      units.get(key).push(fence);
    }

    const open = [];
    for (const [key, members] of units) {
      // Only the slots that put declarations at container scope export
      // anything. A `sub` or `method` sample's declarations are inside a
      // Private Sub and cannot collide with anything.
      const nameOf = (f) =>
        (BODY_SLOTS.has(f.slot) ? [] : (f.inferred?.names ?? [])).map((n) => n.toLowerCase());
      const pages = new Set(members.map((f) => f.rel));
      const names = members.flatMap(nameOf);
      // What the unit's pages' hidden context would ADD to a batch. It is kept
      // apart from the unit's own names because it is charged per PAGE, not per
      // unit: a page's hidden block is copied into a batch once, so two samples
      // from one page do not collide over it. Folding the two together made
      // every page with hidden context split into one batch per sample -- each
      // costing a whole IDE start -- because the second sample "clashed" with
      // the context the first had just brought.
      const hiddenNamesFor = (rel) => hiddenFor(project, rel).flatMap(nameOf);

      // A GROUP GETS ITS OWN PROJECT, and nothing else joins it. Togetherness
      // alone would leave a group's result depending on whichever unrelated
      // samples happened to share the batch -- so the guarantee is the one the
      // author can actually reason about: what compiles is what they grouped,
      // plus the template. It costs one project per group, and groups are
      // written by hand, so there are never many.
      if (key.startsWith("@")) {
        const own = new Set(names);
        for (const rel of pages) for (const n of hiddenNamesFor(rel)) own.add(n);
        batches.push({
          project, fences: [...members], names: own, pages, group: key.slice(1),
        });
        continue;
      }

      let placed = false;
      for (const batch of open) {
        if (batch.fences.length >= target) continue;
        if (names.some((n) => batch.names.has(n))) continue;
        // Only the pages this batch does not already carry bring new context.
        const newPages = [...pages].filter((rel) => !batch.pages.has(rel));
        const incoming = newPages.flatMap(hiddenNamesFor);
        if (incoming.some((n) => batch.names.has(n))) continue;
        batch.fences.push(...members);
        for (const n of names) batch.names.add(n);
        for (const n of incoming) batch.names.add(n);
        for (const rel of newPages) batch.pages.add(rel);
        placed = true;
        break;
      }
      if (placed) continue;
      const own = new Set(names);
      for (const rel of pages) for (const n of hiddenNamesFor(rel)) own.add(n);
      const batch = { project, fences: [...members], names: own, pages };
      open.push(batch);
      batches.push(batch);
    }
  }
  // Every batch now takes the hidden context of every page it draws from. Done
  // last so the placement above decides layout and this only adds to it.
  for (const batch of batches) {
    for (const rel of batch.pages ?? []) batch.fences.push(...hiddenFor(batch.project, rel));
  }
  return batches;
}

// -------------------------------------------------------------------- canaries
//
// waitForCompile reads the IDE's own window: the status bar's counters and the
// Problems panel for the project it has open, once the tB Services indicator
// reads OPERATIONAL and the sample has been the same for five seconds. That is
// the IDE's live analysis, not a build, and an IDE under load can sit
// OPERATIONAL with an empty panel before it has published anything. A batch
// read then reports every sample clean -- and with no reason to doubt it, since
// a project with no errors looks exactly the same.
//
// So every batch carries a file whose diagnostic is KNOWN, and a batch that
// does not report it is not believed. The same idea as sweep_attributes.mjs's
// canaries, whose first run met the fault: a batch of two probes read with no
// diagnostics at all.
//
// The canary is a #Warning directive, TB0005, on a module that enforces it.
// Measured on BETA 987, it was reported beside samples with an unterminated
// Sub, an If with no End If, a stray End Sub and garbage, a class that inherits
// itself, and ten undefined names; under Option Explicit off; in a project that
// ignores TB0005 or makes it an error, where [EnforceWarnings(TB0005)] keeps it
// a warning; and beside a module that ignores TB0005 for itself. A warning
// rather than an error, because an error in every batch left no batch clean:
// tbbuild could never exit 0. The first canaries were errors, and one of them,
// an undefined symbol, is only a warning (TB0002) under Option Explicit off,
// which stopped a run on a sample that compiles. A batch that crashes the
// compiler yields no rows at all, canary included, and is never asked: runBatch
// sends a crash to isolateCrash before it reads the canary.
export const CANARIES = [
  {
    file: "tbxCanary.twin", code: "TB0005",
    text: "[EnforceWarnings(TB0005)]\nPublic Module tbxCanary\n#Warning \"check_examples canary\"\nEnd Module\n",
  },
];
export const CANARY_FILES = new Map(CANARIES.map((c) => [c.file.toLowerCase(), c]));

/**
 * What a batch's canaries did not report, or null if each drew its diagnostic.
 * There is one canary today; the list is kept so another can be added.
 *
 * @param {Map<string, string[]>} drawn  lower-cased canary file name -> the messages of its rows
 */
export function canaryProblem(drawn) {
  const missing = CANARIES
    .filter((c) => !(drawn.get(c.file.toLowerCase()) ?? []).some((m) => m.startsWith(c.code)))
    .map((c) => {
      const got = drawn.get(c.file.toLowerCase()) ?? [];
      return `${c.file} drew ${got.length ? got.join("; ") : "nothing"}, and should draw ${c.code}`;
    });
  return missing.length ? missing.join("; ") : null;
}

/**
 * The samples of a staged batch that the compiler died parsing, as fence ids.
 *
 * `files` is compileProject's `crashFiles`, the base names of the files the
 * compiler was parsing when it went down. For a sample that is its generated
 * module's: `tbx_df66b6fa33.twin` for a batch of nine holding the crash
 * fixture. A file that is no sample of the batch -- the template's own
 * source -- names nothing, and neither does a crash that named no file.
 */
export function crashedIn(files, map) {
  const ids = new Set();
  for (const file of files) {
    const entry = map.get(file.trim().split(/[\\/]/).pop());
    if (entry) ids.add(entry.fence.id);
  }
  return ids;
}

/**
 * A batch's units, and the page context that travels with them.
 *
 * Isolation cuts a batch by unit, never through one. The unit is what
 * `makeBatches` made it: a `projname` group is one program, and a page's
 * `hidden` context travels with every sample from that page. Cutting the fence
 * array instead would take a group's definitions away from its tests and then
 * report the tests -- an isolation run that manufactures the failure it claims
 * to have found. The hidden fences sit at the END of `batch.fences`, so a plain
 * slice loses them for one part outright.
 */
function unitsOf(batch) {
  // Hidden fences and resource files are page context: they follow the samples
  // rather than being split between them.
  const travels = (f) => f.flags.has(HIDDEN_MARKER) || f.isResource;
  const units = new Map();
  for (const f of batch.fences) {
    if (travels(f)) continue;
    const key = unitKey(f);
    if (!units.has(key)) units.set(key, []);
    units.get(key).push(f);
  }
  return { list: [...units.values()], hidden: batch.fences.filter(travels) };
}

/** A batch of some of another's units, with the page context those units need. */
function batchOf(batch, units, hidden) {
  const fences = units.flat();
  const pages = new Set(fences.map((f) => f.rel));
  return { ...batch, fences: [...fences, ...hidden.filter((h) => pages.has(h.rel))], pages };
}

/**
 * Halve a batch WITHOUT cutting through anything that has to stay together.
 *
 * Returns null when there is one unit left, which is the leaf: the smallest
 * thing that can be blamed.
 */
function splitBatch(batch) {
  const { list, hidden } = unitsOf(batch);
  if (list.length < 2) return null;
  const half = Math.ceil(list.length / 2);
  return [list.slice(0, half), list.slice(half)].map((part) => batchOf(batch, part, hidden));
}

/**
 * Take the units holding these samples out of a batch: [those units, the rest].
 *
 * Null when that divides nothing -- no sample of the batch named, or every unit
 * named -- which is what keeps a recursion on either part smaller than the
 * batch it came from. Hidden context is not a unit, so naming it takes nothing
 * out; the samples it travels with are left for halving to find.
 */
function takeOut(batch, ids) {
  const { list, hidden } = unitsOf(batch);
  const named = list.filter((u) => u.some((f) => ids.has(f.id)));
  if (!named.length || named.length === list.length) return null;
  return [batchOf(batch, named, hidden),
          batchOf(batch, list.filter((u) => !named.includes(u)), hidden)];
}

/** The visible samples of a leaf batch, and how to describe it in a finding. */
function leafOf(batch) {
  const visible = batch.fences.filter((f) => !f.flags.has(HIDDEN_MARKER) && !f.isResource);
  const rest = visible.length > 1
    ? ` -- one of the ${visible.length} samples in group \`${batch.group ?? "?"}\`, ` +
      "which is compiled as one program and cannot be split further"
    : "";
  return { rep: visible[0] ?? batch.fences[0], ids: visible.map((f) => f.id), rest };
}

// The stage index is in every diagnostic's path, so two builds of one template
// produce rows that differ by a number. Compared without this, a template's own
// fault is never recognised as its own and every batch bisects to the bottom.
const sameRow = (row) => row.replace(/[/\\]DocSamples\d+[/\\]/, "/");

/**
 * Does this template emit that diagnostic with NO samples in it?
 *
 * One build per template, memoised and shared across lanes, asked before any
 * splitting. Without it the two cases are indistinguishable at the leaf: a
 * sample that provoked a diagnostic inside a package source, and a template that
 * emits it unprompted. Guessing the first would bisect every batch to a single
 * sample -- hundreds of IDE starts -- and then blame an arbitrary one.
 */
const templateOwnRows = new Map();
function ownRowsOf(project, lane) {
  if (!templateOwnRows.has(project)) {
    templateOwnRows.set(project, (async () => {
      // A read with no rows and no canary is read once more, and never believed:
      // it would leave every row of the template counted as a sample's, for the
      // rest of the run. A read with rows of its own was not silent, and needs
      // no canary, as in runBatch.
      const silent = (r) => !r.crashed && r.canaryProblem && !(r.unattributed ?? []).length;
      let result = await lane.build({ project, fences: [] });
      if (silent(result)) result = await lane.build({ project, fences: [] });
      if (silent(result)) {
        throw new Error(`the canary did not report in the \`${project}\` template built with no samples, ` +
          `twice (${result.canaryProblem}): the IDE is reporting before its diagnostics are ready`);
      }
      const rows = result.crashed
        ? [`the ${project} template crashes the compiler with no samples in it`]
        : [...(result.unattributed ?? []), ...(result.unreadable ?? [])];
      if (rows.length) {
        lane.note(`  note: template \`${project}\` does not build clean on its own; ` +
          `${rows.length} row(s) are its own, not any sample's`);
      }
      return new Set(rows.map(sameRow));
    })());
  }
  return templateOwnRows.get(project);
}

/**
 * Whether a build's read shows the IDE was not silent: an ERROR against one of
 * the batch's samples, or one outside every sample that the template does not
 * draw by itself. The template's own rows do not count, since a template that
 * always draws one would otherwise turn the canary off for every batch of it.
 */
async function heard(result, project, lane) {
  for (const rows of result.perFence.values()) {
    if (rows.some((d) => d.severity === "ERROR")) return true;
  }
  if (!(result.unattributed ?? []).length) return false;
  const own = await ownRowsOf(project, lane);
  return result.unattributed.some((r) => !own.has(sameRow(r)));
}

// A function, not a shared object: spreading one would hand every caller the
// same arrays, and a recursion that pushes into them is a bug waiting.
const blank = () => ({
  perFence: new Map(), templateFaults: [], crashed: [], blamed: [], blamedRows: new Map(),
});

/** Several parts' results, as one batch's. */
function merge(subs) {
  const merged = blank();
  for (const sub of subs) {
    for (const [k, v] of sub.perFence ?? []) merged.perFence.set(k, v);
    for (const [k, v] of sub.blamedRows ?? []) merged.blamedRows.set(k, v);
    merged.templateFaults.push(...(sub.templateFaults ?? []));
    merged.crashed.push(...(sub.crashed ?? []));
    merged.blamed.push(...(sub.blamed ?? []));
  }
  return merged;
}

/** Build both halves of a batch; null when it is one unit, which cannot be halved. */
async function split(batch, lane, why) {
  const parts = splitBatch(batch);
  if (!parts) return null;
  lane.note(`  ${why} in ${batch.fences.length} sample(s) [${batch.project}]: splitting to find it`);
  const subs = [];
  for (const part of parts) subs.push(await runBatch(part, lane));
  return merge(subs);
}

/**
 * Find what took the compiler down in a batch, and build everything else.
 *
 * Start where tbbuild says the compiler died: the sample it was parsing is
 * built on its own and the rest without it, two builds where halving pays two
 * for every level. With no sample of the batch named, halve. Either way a
 * crash can need several samples at once, and then no part crashes by itself
 * -- the named sample and the rest both build, or both halves do. Counting
 * every sample of the batch as compiling would be wrong there; `together` finds
 * the samples the crash needs instead.
 *
 * The result is marked `fromCrash`, because a part that crashed may come back
 * with nothing in `crashed` -- its crash needed several samples too -- and
 * whether a part crashed is what decides the next step.
 */
async function isolateCrash(batch, named, lane) {
  const where = `a compiler crash in ${batch.fences.length} sample(s) [${batch.project}]`;
  let parts = takeOut(batch, named);
  if (parts) lane.note(`  ${where}: building the sample it died parsing on its own`);
  else if ((parts = splitBatch(batch))) lane.note(`  ${where}: splitting to find it`);
  else {
    const { rep, ids, rest } = leafOf(batch);
    lane.finding(rep, "crashes the twinBASIC compiler" + rest,
      "the compiler dies parsing this sample; record it in BUGS-TO-REPORT.md");
    // Named back to the caller, because a crashed sample produced no
    // diagnostics and would otherwise be counted as one that compiled -- the
    // same false-clean shape tbbuild's own crash check exists to close.
    return { ...blank(), crashed: ids, fromCrash: true };
  }
  const subs = [];
  for (const part of parts) subs.push(await runBatch(part, lane));
  if (subs.some((s) => s.fromCrash)) return { ...merge(subs), fromCrash: true };
  lane.note("  neither part crashes on its own: looking for the samples it needs together");
  return { ...merge([...subs, await together(batch, ...parts, lane)]), fromCrash: true };
}

/**
 * The samples a crash needs when it needs several: `a` and `b` each built
 * clean, and together they crash.
 *
 * `partners` finds the smallest part of a pool that still crashes with what is
 * held fixed. Whichever half of the pool crashes with it holds what the crash
 * needs; when neither does, each half holds some of it, and each is searched
 * with the other held. That assumes a crash follows from what a build holds --
 * more samples never prevent one -- and the last build checks it: a set that
 * does not crash as found is reported whole instead.
 *
 * Every member built clean in `a` or `b`, so each has its own result. They are
 * blamed rather than passed, because together they take the compiler down.
 */
async function together(batch, a, b, lane) {
  const { hidden } = unitsOf(batch);
  const crashes = async (units) => !!(await lane.build(batchOf(batch, units, hidden))).crashed;
  const partners = async (fixed, pool) => {
    if (pool.length === 1) return pool;
    const half = Math.ceil(pool.length / 2);
    const [x, y] = [pool.slice(0, half), pool.slice(half)];
    if (await crashes([...fixed, ...x])) return partners(fixed, x);
    if (await crashes([...fixed, ...y])) return partners(fixed, y);
    const inX = await partners([...fixed, ...y], x);
    return [...inX, ...await partners([...fixed, ...inX], y)];
  };
  const inA = unitsOf(a).list, inB = unitsOf(b).list;
  const needB = await partners(inA, inB);
  const needA = await partners(needB, inA);
  const found = await crashes([...needA, ...needB]);
  const members = (found ? [...needA, ...needB] : [...inA, ...inB]).flat()
    .filter((f) => !f.flags.has(HIDDEN_MARKER) && !f.isResource);
  const [rep, ...others] = members;
  lane.finding(rep, `crashes the twinBASIC compiler when built with ${others.length} other ` +
    `sample(s), though none of the ${members.length} does on its own`,
    `the others: ${others.map((f) => `${f.rel}:${f.line}`).join(", ")}` +
    (found ? "" : "; no smaller set that crashes was found") + " -- record it in BUGS-TO-REPORT.md");
  return { ...blank(), blamed: members.map((f) => f.id) };
}

/**
 * Build a batch, isolating a crash or an unattributable diagnostic.
 *
 * A crash goes to `isolateCrash`; an unattributable diagnostic is attributed by
 * halving until one unit is left. A crash is a compiler bug as well as a
 * finding, and BUGS-TO-REPORT.md is where one goes. An unattributable
 * diagnostic is the subtler of the two: the sample that caused it may have no
 * diagnostic of its own at all -- a generic instantiated with a type the
 * project does not have reports inside the PACKAGE's source, against the
 * generic's own type parameter -- so without this the sample is counted as
 * compiling while the run fails with a row naming no page.
 */
export async function runBatch(batch, lane) {
  let result = await lane.build(batch);
  if (result.crashed) return isolateCrash(batch, result.named, lane);

  // The canary is needed only by a read that holds no error: that is the read
  // an IDE that published nothing returns, and it looks exactly like a clean
  // batch. A read with errors in it shows the IDE was not silent, and the canary
  // adds nothing there -- it never proved that EVERY file was reported, only that
  // something was (see CANARIES).
  if (result.canaryProblem && !(await heard(result, batch.project, lane))) {
    // The same build once more first: an IDE that read its diagnostics early
    // has said nothing about the batch, and a second read is the cheap answer.
    lane.note(`  the canary did not report in ${batch.fences.length} sample(s) [${batch.project}] ` +
      `(${result.canaryProblem}), and nothing else did: building it again`);
    result = await lane.build(batch);
    if (result.crashed) return isolateCrash(batch, result.named, lane);
    if (result.canaryProblem && !(await heard(result, batch.project, lane))) {
      // Twice silent: either the IDE keeps reading early under this load, or a
      // sample in the batch hides the diagnostics of the rest. Halving finds
      // which, down to parts that report the canary or errors of their own.
      const deeper = await split(batch, lane, "a canary that did not report");
      if (deeper) return deeper;
      // One unit, built twice, and silent both times. Its clean may be a false
      // one, and nothing here can tell, so the run stops rather than pass it --
      // or blame it for errors nobody saw.
      const { rep } = leafOf(batch);
      throw new Error(`the canary did not report beside ${rep.rel}:${rep.line} even when it was built ` +
        `twice on its own (${result.canaryProblem}), and nothing else did either: either the IDE ` +
        "reported before its diagnostics were ready, or that sample hides the diagnostics of every other file");
    }
  }
  // Beside errors a missing canary is not acted on. It has never been seen --
  // the canary was reported beside every kind of broken sample measured -- and
  // would be the first sign of a read that holds some files and not others, so
  // it is said.
  if (result.canaryProblem) {
    lane.note(`  note: the canary did not report in ${batch.fences.length} sample(s) [${batch.project}] ` +
      `(${result.canaryProblem}), though errors did; the errors are taken as found`);
  }

  const unreadable = result.unreadable ?? [];
  const rows = [...new Set((result.unattributed ?? []).map(sameRow))];
  if (!rows.length) {
    return { perFence: result.perFence, templateFaults: unreadable, crashed: [], blamed: [] };
  }

  const own = await ownRowsOf(batch.project, lane);
  const mine = rows.filter((r) => !own.has(r));
  if (!mine.length) {
    // Every row is the template's own. Reported as a template fault, which is
    // what it is, and no sample is blamed for it.
    return { perFence: result.perFence, templateFaults: [...rows, ...unreadable], crashed: [], blamed: [] };
  }

  const deeper = await split(batch, lane, "a diagnostic outside every sample");
  if (deeper) return { ...deeper, templateFaults: [...deeper.templateFaults, ...unreadable] };

  // Blamed, not passed: the whole point is that such a sample can produce no
  // diagnostic of its own, so counting it as compiling is the false clean. The
  // rows go back to `main` rather than straight into a finding, so a sample with
  // errors of its own as well reads as one finding instead of two.
  const { rep, ids, rest } = leafOf(batch);
  return {
    perFence: result.perFence, templateFaults: unreadable, crashed: [], blamed: ids,
    blamedRows: new Map([[rep.id, { rows: mine, rest }]]),
  };
}

/**
 * The bucket a page counts towards in a census or a survey report.
 *
 * A package is the unit the work is actually organised by, and it sits one level
 * deeper than `Reference/` -- `Reference/Default/VB`, `Reference/Built-In/CEF`.
 * Bucketing by the first two segments instead would put all thirteen packages in
 * one row called `Reference/Built-In` and hide exactly what the report is for.
 * A page directly under a section is its own bucket, because `Attributes.md`
 * carrying twelve is a fact about that page rather than about `Reference/`.
 */
export function sectionOf(rel) {
  const parts = rel.split(/[\\/]/);
  if (parts[0] === "Reference" && (parts[1] === "Default" || parts[1] === "Built-In")) {
    return parts.slice(0, 3).join("/");
  }
  if (parts[0] === "Reference") return parts.slice(0, 2).join("/");
  return parts.slice(0, 2).join("/");
}

/**
 * A diagnostic's KIND: its code, with the identifiers taken out.
 *
 * `TB5079 Unrecognized symbol 'WebView'` and `... 'Host'` are one kind and 162
 * of them are one answer; left un-generalised they are 130 rows of one. The
 * identifier is not lost -- it is what the unresolved-name tally counts.
 */
export function diagKind(message) {
  const flat = String(message ?? "").replace(/'[^']*'/g, "'...'").trim();
  return flat.length > 72 ? flat.slice(0, 69) + "..." : flat;
}

/** The name a diagnostic says it could not resolve, or null. */
export function unresolvedName(message) {
  const m = /Unrecognized (?:datatype symbol|symbol|member|token)\s+'([^']+)'/
    .exec(String(message ?? ""));
  return m ? m[1] : null;
}

// --------------------------------------------------------------------- probes
//
// The probes ride along inside the normal run rather than behind a flag nobody
// remembers. A green line saying "every marked sample compiles" is otherwise
// indistinguishable from a gate that has stopped selecting any.

const CLASSIFIER_PROBES = [
  ["a whole Class", "Class Foo\n    Public Sub Bar()\n    End Sub\nEnd Class\n", "file"],
  ["a whole procedure", "Private Sub Foo()\n    Debug.Print 1\nEnd Sub\n", "module"],
  ["a Declare", "Public Declare PtrSafe Function Beep Lib \"kernel32\" (ByVal a As Long) As Long\n", "module"],
  ["loose statements", "Dim x As Long\nx = 1\nDebug.Print x\n", "sub"],
  ["declarations only", "Dim MyString As String\n", "sub"],
  // An Interface body holds PROTOTYPES: a Sub line in one has no End Sub, and a
  // classifier that pushes it as a block reads the whole fence as unbalanced.
  // Seven fences in this corpus are that shape.
  ["an Interface of prototypes", "Interface IFoo\n    Sub Bar()\n    Function Baz() As Long\nEnd Interface\n", "file"],
  // Four UDTs in the shipped packages declare a field called `Type As Long`.
  ["a Type whose field is called Type", "Public Type Rec\n    Type As Long\nEnd Type\n", "module"],
  ["a single-line procedure", "Sub Foo(): End Sub\n", "module"],
  ["an elision", "Dim x As Long\n...\nDebug.Print x\n", null],
  // Microsoft's spaced form, which the VBA-derived pages inherited.
  ["a spaced elision", "ReDim X(10)\n. . .\nReDim Preserve X(15)\n", null],
  // ...but a With-block member line is dots and code, not dots alone.
  ["a With member line", "With Label1\n    .Caption = \"hi\"\nEnd With\n", "sub"],
  ["an unclosed If", "If x Then\n    Debug.Print 1\n", null],
  ["an End with no opener", "    Debug.Print 1\nEnd Sub\n", null],
  ["a continuation line", "Dim a As Long, _\n    b As Long\n", "sub"],
  ["an apostrophe inside a string", "Debug.Print \"it's here ' not a comment\"\n", "sub"],
  // A block comment can span lines, and what follows it closes the line.
  ["a block comment over two lines", "/* Greets\n   the user */ Public Sub Greet()\nEnd Sub\n", "module"],
  ["a byte-order mark", "\u{FEFF}Class Foo\nEnd Class\n", "file"],
  ["only comments and blank lines", "\n' nothing here\n\n", null],
  // The Class row. `Me` is the whole signal, so the three ways it can be a
  // false positive are probes: this corpus prints the word, and a member may
  // be called Me. Getting one of these wrong wraps an ordinary Module sample
  // in a Class, which fails with a diagnostic about the wrapper -- a report
  // pointing at code that is correct.
  ["a procedure using Me", "Private Sub Form_Load()\n    Me.Caption = \"x\"\nEnd Sub\n", "class"],
  ["loose statements using Me", "Me.Print \"hello\"\n", "method"],
  ["Me inside a string literal", "Debug.Print \"Use Me instead\"\n", "sub"],
  ["Me as somebody's member", "Debug.Print foo.Me\n", "sub"],
  ["Me inside a comment", "Dim x As Long    ' Me is fine here\n", "sub"],
  ["Meridian is not Me", "Dim Meridian As Long\nMeridian = 1\n", "sub"],
  // WithEvents is the other Class signal. A standard module may not declare
  // one, so a fence that does is code-behind even with no `Me` in it -- which
  // is the whole WinNamedPipesLib reference, where the field IS the subject.
  ["a WithEvents field", "Private WithEvents srv As Foo\nPrivate Sub srv_Ping()\nEnd Sub\n", "class"],
  // Neither of these is legal in a standard module either.
  ["a top-level Implements", "Implements IFoo\nPrivate Sub IFoo_Bar()\nEnd Sub\n", "class"],
  ["a top-level Inherits", "Inherits Form\nPrivate Sub Form_Load()\nEnd Sub\n", "class"],
  // An access modifier is a container-scope declaration, never a statement.
  // Reference/Core/Public.md's own samples were wrapped in a Sub, where
  // `Public` is a syntax error -- on the page documenting the keyword.
  ["a Public field", "Public NumberOfEmployees As Integer\n", "module"],
  ["a Private field", "Private X As New Collection\n", "module"],
  ["a Private Const", "Private Const Answer As Long = 42\n", "module"],
  // ...but Static IS legal in a procedure, so it stays a statement.
  ["a Static local", "Static Accumulate As Long\nAccumulate = 1\n", "sub"],
  // A Deftype is module-level only, and asked directly the compiler accepts it
  // there -- so the wrong container was the whole of `Unrecognized symbol
  // 'DefInt'` on the page that documents it.
  ["a Deftype", "DefInt A-Z\nDim TaxRate As Double\n", "module"],
  ["Default is a modifier, not a Deftype", "Default Property Get Item() As Long\nEnd Property\n", "module"],
  // ...but only at container scope. Inside a Class the fence brings its own.
  ["WithEvents inside a whole Class", "Class C\n    Private WithEvents srv As Foo\nEnd Class\n", "file"],
];

const INFO_PROBES = [
  ["bare language", "tb", (p) => !p.flags.size && !p.bad.length],
  ["the marker", `tb ${MARKER}`, (p) => p.flags.has(MARKER) && !p.bad.length],
  [`${RUN_MARKER} implies ${MARKER}`, `tb ${RUN_MARKER}`,
    (p) => p.flags.has(MARKER) && p.flags.has(RUN_MARKER)],
  ["a key", `tb ${MARKER} slot=module`, (p) => p.keys.get("slot") === "module"],
  ["a group name", `tb ${MARKER} projname=padleft`, (p) => p.keys.get("projname") === "padleft"],
  ["a typo is refused", "tb check_bild", (p) => p.bad.length === 1 && !p.flags.has(MARKER)],
  ["an inert reason", `tb inert=skeleton`, (p) => p.keys.get("inert") === "skeleton" && !p.bad.length],
  ["an unknown inert reason is refused", `tb inert=because`, (p) => p.bad.length === 1 && !p.keys.has("inert")],
  ["a bare inert is refused", "tb inert", (p) => p.bad.length === 1],
  ["an unknown key is refused", `tb ${MARKER} mode=x`, (p) => p.bad.length === 1],
  ["a bad slot is refused", `tb ${MARKER} slot=banana`, (p) => p.bad.length === 1],
  ["a base class", `tb ${MARKER} inherits=Form`, (p) => p.keys.get("inherits") === "Form"],
  [`${HIDDEN_MARKER} implies ${MARKER}`, `tb ${HIDDEN_MARKER}`,
    (p) => p.flags.has(MARKER) && p.flags.has(HIDDEN_MARKER)],
  ["another language is untouched", "js", (p) => p.lang === "js"],
];

export async function runProbes(say) {
  const failures = [];
  for (const [name, src, want] of CLASSIFIER_PROBES) {
    const got = classify(src).slot;
    if (got !== want) failures.push(`classifier: ${name} -> ${got}, want ${want}`);
  }
  for (const [name, info, ok] of INFO_PROBES) {
    if (!ok(parseInfo(info))) failures.push(`info string: ${name}`);
  }

  // The line arithmetic, which is what turns a diagnostic into a place in a
  // page. Off by one here and every report points at the wrong line, plausibly.
  //
  // Each slot wraps the sample in a different number of lines, and each
  // compensates with a different offset -- so the answer must come out the SAME
  // for all three. A fence opening at page line 10 has `Dim b` on page line 12
  // whatever is generated around it.
  const fence = { rel: "X.md", line: 10, id: "X.md#1", content: "Dim a\nDim b\nDim c\n" };
  for (const slot of SLOTS) {
    // With and without a base: `Inherits` is a generated line like any other,
    // so it shifts the arithmetic, and a base is exactly the case an author
    // reaches for when a sample is already hard to place.
    for (const base of [null, "Form"]) {
      const { text, offset } = wrapFence(fence, slot, "tbx_probe", base);
      const genLine = text.split("\n").findIndex((l) => l.trim() === "Dim b") + 1;
      const pageLine = fence.line + genLine - offset;
      if (pageLine !== 12) {
        failures.push(`line map: ${slot}${base ? " inherits " + base : ""} -> ${pageLine}, want 12`);
      }
    }
  }

  // The container a slot generates, and that a base reaches the source only
  // where a Class is generated -- `Module X / Inherits Form` is not a thing.
  for (const [slot, want] of [["module", "Module"], ["sub", "Module"],
    ["class", "Class"], ["method", "Class"]]) {
    const { text } = wrapFence(fence, slot, "tbx_probe", "Form");
    if (!text.includes(`${want} tbx_probe`)) failures.push(`wrapper: ${slot} is not a ${want}`);
    const inherits = text.includes("Inherits Form");
    if (inherits !== (want === "Class")) {
      failures.push(`wrapper: ${slot} ${inherits ? "emitted" : "dropped"} Inherits`);
    }
  }

  // The batcher, because a grouping that silently stops holding produces a
  // green run whose samples were compiled apart -- the same disagreement
  // between two runs that the `projname` key exists to end. A group stays
  // whole AND stays alone; an ungrouped sample never lands in it.
  const fake = (id, group, names = [], opts = {}) => ({
    id, rel: opts.rel ?? "X.md", line: 1,
    slot: names.length ? "module" : "sub", project: "console",
    keys: new Map(group ? [["projname", group]] : []),
    flags: new Set(opts.hidden ? [HIDDEN_MARKER, MARKER] : [MARKER]),
    inferred: { names },
  });
  const batched = makeBatches([
    fake("a", "g"), fake("b", null), fake("c", "g"), fake("d", "g"),
  ].map((f) => ({ ...f, project: "console" })));
  const groupBatch = batched.find((b) => b.fences.some((f) => f.id === "a"));
  if (!["a", "c", "d"].every((id) => groupBatch?.fences.some((f) => f.id === id))) {
    failures.push("batching: a projname group was split across projects");
  }
  if (groupBatch?.fences.some((f) => f.id === "b")) {
    failures.push("batching: an ungrouped sample joined a group's project ahead of the group");
  }
  // And a collision still separates two units that would clash.
  const clash = makeBatches([fake("p", null, ["MyClass"]), fake("q", null, ["MyClass"])]);
  if (clash.length !== 2) failures.push("batching: two samples declaring one name shared a project");

  // A hidden fence is the PAGE's context: it joins every batch holding a
  // sample from that page, and is never a unit of its own. Both halves are
  // probed, because the failure modes differ -- a hidden block that does not
  // travel leaves its page's samples failing on the very declarations it
  // exists to supply, while one that becomes its own unit is compiled alone,
  // passes, and helps nobody.
  const withHidden = makeBatches([
    fake("h1", null, ["Ctx"], { hidden: true, rel: "P.md" }),
    fake("v1", null, [], { rel: "P.md" }),
    fake("v2", null, [], { rel: "Q.md" }),
  ]);
  const hostsHidden = withHidden.filter((b) => b.fences.some((f) => f.id === "h1"));
  if (hostsHidden.length !== 1 || !hostsHidden[0].fences.some((f) => f.id === "v1")) {
    failures.push("batching: a hidden fence did not travel with its page's sample");
  }
  if (withHidden.some((b) => b.fences.length === 1 && b.fences[0].id === "h1")) {
    failures.push("batching: a hidden fence became a unit of its own");
  }
  // Two samples from ONE page must still share a batch. They both carry that
  // page's hidden context, and charging it twice made every such page split
  // into one project per sample.
  const samePage = makeBatches([
    fake("s1", null, [], { rel: "S.md" }),
    fake("s2", null, [], { rel: "S.md" }),
    fake("hs", null, ["Ctx"], { hidden: true, rel: "S.md" }),
  ]);
  if (samePage.length !== 1) {
    failures.push("batching: one page's hidden context split its own samples apart");
  }
  // Its names have to be counted, or two pages whose hidden blocks declare the
  // same type land in one project and collide.
  const hiddenClash = makeBatches([
    fake("h2", null, ["Ctx"], { hidden: true, rel: "A.md" }),
    fake("a1", null, [], { rel: "A.md" }),
    fake("h3", null, ["Ctx"], { hidden: true, rel: "B.md" }),
    fake("b1", null, [], { rel: "B.md" }),
  ]);
  if (hiddenClash.some((b) => b.fences.some((f) => f.id === "a1") &&
                              b.fences.some((f) => f.id === "b1"))) {
    failures.push("batching: two pages whose hidden context collides shared a project");
  }

  // An isolation split must not cut through a unit. Both halves of that are
  // probed because both manufacture a failure: a group cut apart loses the
  // definitions its tests need, and a page's hidden context left in the other
  // half takes away the declarations it exists to supply -- and the hidden
  // fences sit at the END of batch.fences, where a plain slice drops them.
  const soleGroup = makeBatches([fake("g1", "g"), fake("g2", "g")])[0];
  if (splitBatch(soleGroup) !== null) failures.push("split: a projname group was cut in half");
  const mixed = makeBatches([
    fake("m1", null, [], { rel: "M.md" }),
    fake("m2", null, [], { rel: "N.md" }),
    fake("mh", null, ["Ctx"], { hidden: true, rel: "M.md" }),
  ])[0];
  const halves = splitBatch(mixed) ?? [];
  if (halves.length !== 2) failures.push("split: a two-unit batch did not split");
  const withM1 = halves.find((b) => b.fences.some((f) => f.id === "m1"));
  const withM2 = halves.find((b) => b.fences.some((f) => f.id === "m2"));
  if (!withM1?.fences.some((f) => f.id === "mh")) {
    failures.push("split: a page's hidden context did not travel with its sample");
  }
  if (withM2?.fences.some((f) => f.id === "mh")) {
    failures.push("split: a page's hidden context followed a page that never asked for it");
  }
  // Taking a crash's named sample out is the same kind of cut and can go wrong
  // the same two ways. It also has to refuse a cut that divides nothing, or the
  // recursion on the named part never gets any smaller.
  const [outM2, restM1] = takeOut(mixed, new Set(["m2"])) ?? [];
  if (outM2?.fences.map((f) => f.id).join() !== "m2") {
    failures.push("take out: the named sample did not come out on its own");
  }
  if (!restM1?.fences.some((f) => f.id === "mh")) {
    failures.push("take out: a page's hidden context did not stay with its sample");
  }
  const grouped = { project: "console", fences: [fake("t1", "t"), fake("t2", "t"), fake("u1", null)] };
  if (takeOut(grouped, new Set(["t2"]))?.[0].fences.map((f) => f.id).join() !== "t1,t2") {
    failures.push("take out: a projname group was cut apart");
  }
  if (takeOut(soleGroup, new Set(["g1"])) !== null) {
    failures.push("take out: a cut that divides nothing was made");
  }
  if (takeOut(mixed, new Set(["mh"])) !== null) {
    failures.push("take out: a page's hidden context was taken out as a unit");
  }
  // What is taken out is read off the files the compiler died parsing, which name
  // a sample by its generated module's file: the `crashFiles` of a build.
  const staged9 = new Map([["tbx_df66b6fa33.twin", { fence: { id: "P.md#5" } }]]);
  if ([...crashedIn(["tbx_df66b6fa33.twin"], staged9)].join() !== "P.md#5") {
    failures.push("crash files: the sample the compiler died parsing was not read off them");
  }
  if (crashedIn(["tbxMain.twin"], staged9).size) {
    failures.push("crash files: the template's own file named a sample");
  }
  if (crashedIn([], staged9).size) {
    failures.push("crash files: a crash naming no file named a sample");
  }
  // Isolation itself, run by runBatch against a fake lane. `crash` gets the ids
  // of a build's samples and says whether the compiler goes down, and which of
  // them the report names. Each shape a crash can take has to end in exactly
  // one finding, on the samples it needs -- never in a batch whose samples all
  // count as compiling, which is what a crash that needs two of them would
  // become once halving has separated them.
  const fakeLane = (crash) => {
    const lane = {
      found: [], builds: 0,
      async build(b) {
        lane.builds++;
        const c = crash(new Set(b.fences.map((f) => f.id)));
        return c ? { crashed: true, named: new Set(c.named ?? []) }
                 : { perFence: new Map(), unreadable: [], unattributed: [] };
      },
      finding: (fence) => lane.found.push(fence.id),
      note: () => {},
    };
    return lane;
  };
  const five = { project: "console", fences: ["a", "b", "c", "d", "e"].map((id) => fake(id, null)) };
  const when = (...need) => (ids) => need.every((id) => ids.has(id));
  const naming = (id) => (ids) => ({ named: ids.has(id) ? [id] : [] });
  for (const [shape, crashes, names, alone, set] of [
    ["a named sample that crashes alone", when("c"), naming("c"), ["c"], []],
    ["an unnamed sample that crashes alone", when("d"), () => ({}), ["d"], []],
    ["a named sample that crashes only with another", when("b", "d"), naming("d"), [], ["d", "b"]],
    ["two unnamed samples that halving separates", when("a", "e"), () => ({}), [], ["a", "e"]],
    ["an innocent sample named, the culprit elsewhere", when("e"), naming("b"), ["e"], []],
    ["three samples that crash only together", when("a", "c", "e"), naming("c"), [], ["c", "a", "e"]],
  ]) {
    const lane = fakeLane((ids) => crashes(ids) && names(ids));
    const r = await runBatch(five, lane);
    const got = `${[...r.crashed].sort()} / ${[...r.blamed].sort()} / ${lane.found}`;
    const want = `${[...alone].sort()} / ${[...set].sort()} / ${alone[0] ?? set[0]}`;
    if (got !== want) failures.push(`isolation: ${shape} -> ${got}, want ${want}`);
  }
  // ...and the common case stays cheap: the batch, the named sample, the rest.
  const cheap = fakeLane((ids) => when("c")(ids) && naming("c")(ids));
  await runBatch(five, cheap);
  if (cheap.builds !== 3) failures.push(`isolation: a named crash took ${cheap.builds} builds, want 3`);
  // The canaries: what a batch's rows say about them, and what runBatch does when
  // they are not there. A batch with no rows at all is the one that matters, since
  // it is what an IDE that read its diagnostics early returns.
  const drew = (rows) => canaryProblem(new Map([["tbxcanary.twin", rows]]));
  if (drew(["TB0005 #Warning directive: \"check_examples canary\""]) !== null) {
    failures.push("canaries: a batch that drew the canary was not believed");
  }
  if (drew(["TB0005 x", "TB5000 y"]) !== null) {
    failures.push("canaries: an extra error beside the expected one was refused");
  }
  if (!drew([])?.includes("tbxCanary.twin drew nothing")) {
    failures.push("canaries: a missing canary was not named");
  }
  if (!drew(["TB5000 other"])?.includes("TB5000 other")) {
    failures.push("canaries: a canary that drew the wrong diagnostic was believed");
  }
  if (canaryProblem(new Map()) === null) failures.push("canaries: a batch with no rows at all was believed");
  // `errs` gives the samples that have errors of their own in a build, and
  // `stray` the rows it draws outside every sample.
  const canaryLane = (bad, errs = () => [], stray = () => []) => {
    const lane = {
      builds: 0, notes: [],
      async build(b) {
        lane.builds++;
        const ids = new Set(b.fences.map((f) => f.id));
        const problem = bad(ids, lane.builds);
        const perFence = new Map(errs(ids).map((id) =>
          [id, [{ severity: "ERROR", pageLine: 1, message: "TB5079 x", rel: "X.md" }]]));
        return { perFence, unreadable: [], unattributed: stray(ids), canaryProblem: problem };
      },
      finding: () => {},
      note: (m) => lane.notes.push(m),
    };
    return lane;
  };
  // Each probe starts with no template rows remembered: ownRowsOf keeps what
  // the first build of a template said, a refusal included.
  const outcome = async (lane, batch) => {
    templateOwnRows.clear();
    try { await runBatch(batch, lane); return null; } catch (e) { return e.message; }
  };
  let cl = canaryLane((_ids, n) => (n === 1 ? "no error" : null));
  let threw = await outcome(cl, five);
  if (threw !== null || cl.builds !== 2) {
    failures.push(`canaries: an early read was not answered by one more build (${cl.builds} builds, ${threw})`);
  }
  cl = canaryLane((ids) => (ids.has("c") ? "masked" : null));
  threw = await outcome(cl, five);
  if (!threw || !threw.includes("did not report beside X.md:1")) {
    failures.push(`canaries: a sample that hides them was not found and named (${threw})`);
  }
  // The same sample with errors of its own: the read was not silent, so the
  // batch is taken as read in one build, and the missing canary is only said.
  cl = canaryLane((ids) => (ids.has("c") ? "masked" : null), (ids) => [...ids].filter((id) => id === "c"));
  threw = await outcome(cl, five);
  if (threw !== null || cl.builds !== 1 || !cl.notes.some((m) => m.includes("though errors did"))) {
    failures.push(`canaries: a batch with errors was not taken as read (${cl.builds} builds, ${threw})`);
  }
  // A group where only some members fail, and the canary is missing: the same.
  cl = canaryLane((ids) => (ids.has("t2") ? "masked" : null), (ids) => [...ids].filter((id) => id === "t1"));
  threw = await outcome(cl, grouped);
  if (threw !== null || cl.builds !== 1) {
    failures.push(`canaries: a group with some members failing was not taken as read (${cl.builds} builds, ${threw})`);
  }
  // ...but a row the template draws on its own is no error of the sample's: an
  // early read that holds only that row is still a false clean.
  const ownRow = "{ERROR} /DocSamples1/Sources/Template.twin [1,1]: TB5079 t";
  cl = canaryLane((ids) => (ids.has("c") ? "masked" : null), () => [], () => [ownRow]);
  threw = await outcome(cl, five);
  if (!threw?.includes("did not report beside X.md:1")) {
    failures.push(`canaries: a hiding sample with only the template's own row was passed (${threw})`);
  }
  // The template built with no samples is read again when its canary is missing,
  // and refused when it is missing twice.
  templateOwnRows.clear();
  cl = canaryLane((_ids, n) => (n === 1 ? "no error" : null));
  await ownRowsOf("console", cl);
  if (cl.builds !== 2) failures.push(`canaries: an empty template read early was not read again (${cl.builds} builds)`);
  templateOwnRows.clear();
  threw = await ownRowsOf("console", canaryLane(() => "no error")).then(() => null, (e) => e.message);
  if (!threw?.includes("template built with no samples")) {
    failures.push(`canaries: an empty template that never reports was believed (${threw})`);
  }
  // ...but one with rows of its own was not silent, and is believed in one read.
  templateOwnRows.clear();
  cl = canaryLane(() => "no error", () => [], () => [ownRow]);
  const ownSet = await ownRowsOf("console", cl).catch(() => null);
  if (!ownSet?.has(sameRow(ownRow)) || cl.builds !== 1) {
    failures.push(`canaries: an empty template with rows of its own was not believed (${cl.builds} builds)`);
  }
  templateOwnRows.clear();
  cl = canaryLane((ids) => (ids.has("a") && ids.has("e") ? "masked" : null));
  threw = await outcome(cl, five);
  if (threw !== null || cl.builds <= 2) {
    failures.push(`canaries: two samples that hide them only together were not separated by halving (${cl.builds} builds, ${threw})`);
  }
  cl = canaryLane(() => "no error");
  threw = await outcome(cl, five);
  if (!threw?.includes("did not report")) failures.push("canaries: a batch that never reports did not stop the run");
  // Two builds of one template differ only by the stage index in every path, and
  // a template's own fault is recognised by comparing those rows.
  const row = (n) => `{ERROR} /DocSamples${n}/Packages/P/Sources/S.twin [10,20]: TB5079 x`;
  if (sameRow(row(7)) !== sameRow(row(12))) {
    failures.push("split: one template's rows from two builds do not compare equal");
  }

  // A joined unit has to classify as the construct its halves make, and a
  // diagnostic in either half has to come back to THAT half's page line. Getting
  // the second right is the whole difficulty: an off-by-one here points every
  // finding in the second fence at the wrong line, plausibly.
  const half1 = { rel: "P.md", line: 10, id: "P.md#1", content: "Class Thing\n    Public A As Long\n" };
  const half2 = { rel: "P.md", line: 30, id: "P.md#2", content: "    Public B As Long\nEnd Class\n" };
  const joined = concatFences([half1, half2]);
  if (classify(joined.content).slot !== "file") {
    failures.push("concat: two halves of a Class did not join into a whole one");
  }
  for (const [bodyLine, wantRel, wantPage] of [
    [1, "P.md", 11],    // `Class Thing`      -- first line of the first fence
    [2, "P.md", 12],    // `Public A As Long`
    [3, "P.md", 31],    // `Public B As Long` -- first line of the SECOND fence
    [4, "P.md", 32],    // `End Class`
  ]) {
    const got = partOf(joined.concatParts, bodyLine);
    if (!got || got.fence.rel !== wantRel || got.pageLine !== wantPage) {
      failures.push(`concat: body line ${bodyLine} -> ${got?.pageLine}, want ${wantPage}`);
    }
  }
  if (partOf(joined.concatParts, 99)) failures.push("concat: a line past the end found a part");
  // A hidden header and footer around a visible method: the unit is the
  // method's sample, not page context that only travels with other samples.
  const hide = (f) => ({ ...f, flags: new Set([HIDDEN_MARKER, MARKER]) });
  const method = { rel: "P.md", line: 20, id: "P.md#2", flags: new Set([MARKER]),
    content: "    Sub Paint()\n    End Sub\n" };
  const around = concatFences([hide(half1), method,
    hide({ rel: "P.md", line: 40, id: "P.md#3", content: "End Class\n" })]);
  if (around.id !== "P.md#2" || around.flags.has(HIDDEN_MARKER)) {
    failures.push("concat: a hidden header made the visible part's sample into page context");
  }
  // Two pages that chose the same group name are two units.
  const member = (rel) => ({ rel, line: 1, id: `${rel}#1`, flags: new Set([MARKER]),
    keys: new Map([[CONCAT_KEY, "same-name"]]), content: "Sub S()\nEnd Sub\n" });
  if (joinConcatGroups([member("A.md"), member("B.md")]).length !== 2) {
    failures.push("concat: two pages' groups of one name were joined into one unit");
  }
  if (!parseInfo(`tb ${CONCAT_KEY}=widget`).flags.has(MARKER)) {
    failures.push(`concat: ${CONCAT_KEY} does not imply ${MARKER}`);
  }

  // A resource path is written into a staged project, so a path that climbs out
  // of it would write somewhere on the machine. Every refusal here is a path
  // that must never reach `writeFileSync`.
  for (const [raw, want] of [
    ["/Resources/MESSAGETABLE/Strings.json", "Resources/MESSAGETABLE/Strings.json"],
    ["Resources\\Sub\\file.json", "Resources/Sub/file.json"],
    ["./Resources/./file.json", "Resources/file.json"],
    ["../outside.json", null],
    ["Resources/../../outside.json", null],
    ["C:/Windows/system32/evil.json", null],
    ["//server/share/file.json", null],
    ["   ", null],
  ]) {
    const got = resourcePath(raw);
    if (got !== want) failures.push(`resource path: ${JSON.stringify(raw)} -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
  // ...and a resource fence is collected whatever language it carries, while an
  // ordinary fence in that language is not.
  if (!parseInfo("json resource=/Resources/x.json").keys.has("resource")) {
    failures.push("resource: the key is not read off a non-tb fence");
  }
  if (parseInfo("json resource=/Resources/x.json").bad.length) {
    failures.push("resource: the key is refused as unknown markup");
  }

  // The report's own arithmetic. A survey is only read through this grouping, so
  // a section that buckets wrong or a kind that fails to generalise moves the
  // numbers a decision is made on.
  for (const [rel, want] of [
    ["Reference/Default/VB/Form/index.md", "Reference/Default/VB"],
    ["Reference/Built-In/CEF/CefBrowser.md", "Reference/Built-In/CEF"],
    ["Reference/Core/Dim.md", "Reference/Core"],
    ["Reference/Attributes.md", "Reference/Attributes.md"],
    ["Tutorials/CustomControls/Painting.md", "Tutorials/CustomControls"],
  ]) {
    const got = sectionOf(rel);
    if (got !== want) failures.push(`section: ${rel} -> ${got}, want ${want}`);
  }
  if (diagKind("TB5079 Unrecognized symbol 'WebView'") !== "TB5079 Unrecognized symbol '...'") {
    failures.push("report: a diagnostic kind keeps the identifier, so every row is one of one");
  }
  if (unresolvedName("TB5079 Unrecognized datatype symbol 'ControlsSection'") !== "ControlsSection") {
    failures.push("report: the unresolved name was not read out of the diagnostic");
  }
  if (unresolvedName("TB5214 Only allowed inside a With block") !== null) {
    failures.push("report: a diagnostic naming nothing produced a name anyway");
  }

  // The markup must be invisible to the site. Verified against the REAL
  // pipeline -- createMarkdownIt plus the highlighter -- because a bare
  // markdown-it is a different renderer, which is the mistake WIP.md's
  // "Source dashes" section records paying for.
  const { createMarkdownIt, initHighlighter, applyPreRenderRewrites } =
    await import("../../builder/render.mjs");
  const { maskCode } = await import("../../lib/markdown.mjs");
  const highlighter = await initHighlighter();
  const md = createMarkdownIt({ highlighter, linkTables: null, baseurl: "", staticFiles: new Set() });
  const plain = "```tb\nDim x As Long\n```\n";
  const marked = "```tb " + MARKER + " slot=sub id=probe\nDim x As Long\n```\n";
  if (md.render(plain) !== md.render(marked)) failures.push("markup: the marker reaches the HTML");
  // A hidden fence must reach NO reader. Checked against the real renderer,
  // because everything downstream -- the search index, the offline mirror, the
  // PDF book -- reads the string this produces, so nothing else has to know.
  const hidden = "```tb " + HIDDEN_MARKER + "\nDim secret As Long\n```\n";
  if (md.render(hidden).trim() !== "") failures.push("markup: a hidden fence reaches the HTML");
  // ...and the word has to stand alone: an id that merely contains it, or a
  // fence in another language, must still publish.
  const notHidden = "```tb " + MARKER + " id=hidden-thing\nDim x As Long\n```\n";
  if (md.render(notHidden).trim() === "") failures.push("markup: `hidden` matched inside a value");
  const masked = maskCode(marked, { md });
  if (masked.masked.includes("Dim x As Long")) failures.push("markup: the pre-render mask stops hiding the body");
  if (masked.restore(masked.masked) !== marked) failures.push("markup: the mask does not round-trip");
  if (applyPreRenderRewrites(marked, md) !== marked) failures.push("markup: a pre-render rewrite alters it");

  if (failures.length) {
    for (const f of failures) say(`FAIL  probe: ${f}`);
    return false;
  }
  // 10 line-map (5 slots x 2 bases) + 4 wrapper container + 7 batching
  // + 5 splitting + 5 taking out + 3 crash report + 7 isolation + 9 concat
  // + 10 resource + 8 report + 6 markup + 15 canaries (5 of what a batch's rows say,
  // 7 of what runBatch does about a batch whose canary did not report, 3 of the
  // template built with no samples).
  say(`ok    ${CLASSIFIER_PROBES.length + INFO_PROBES.length + 89} probes: ` +
    "classifier, markup, line mapping, batching, splitting, crash isolation, canaries, concat, " +
    "resources and the report");
  return true;
}
