// Tests for the screenshot review tool, scripts/shot_review.mjs (WIP.ShotReview.md), that need
// no IDE and no browser: lib/shot-session.mjs, the session and its lock, its runs, its archive;
// lib/shot-review.mjs and lib/shot-pages.mjs, what the pages show of the runs' verdicts, the
// queue, the chips (a picture's allowances among them), the loupes, the commit's plan and
// message; lib/shot-verdicts.mjs, the verdicts applied under a scratch docs folder as they
// arrive and judged again after a review; lib/shot-runs.mjs, a run made from a request; and
// lib/shot-server.mjs, the server, with a stand-in run in place of shoot_docs.mjs and replay.mjs,
// in a scratch repository: the pages, the actions, the runs page and the commit. The decisions
// and writes the tool shares with the command-line tools (shot-policy.mjs, shot-apply.mjs,
// shot-manifest.mjs, shot-queue.mjs, shot-stage.mjs) are tested in test/svgshot.test.mjs.
//
// Runs with a bare `node --test test/shot-review.test.mjs`: no tree, no build; git for the
// scratch repositories.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { pngHash, readBundle, writeBundle } from "../scripts/svgshot/bundle.mjs";
import { decodePng, encodePng } from "../scripts/lib/png.mjs";
import {
  pngVerdict,
  readReviewed,
  stageCapture,
  stagedFiles,
  stageSvg,
  svgVerdict,
  WINDOW_WHY,
  writeVerdict,
} from "../scripts/lib/shot-stage.mjs";
import { hashOf, openManifest } from "../scripts/lib/shot-manifest.mjs";
import { changeMap, strengthOf, strengthPicture } from "../scripts/lib/shot-change.mjs";
import {
  acquireLock,
  appendEvent,
  archiveRoot,
  commandOf,
  listArchived,
  newestBuild,
  openSession,
  parseSession,
  readEvents,
  runPaths,
  sessionPaths,
  STAGED_TOOLS,
} from "../scripts/lib/shot-session.mjs";
import {
  allPictures,
  appliedVerdict,
  commitMessage,
  commitPlan,
  filterPictures,
  groupOf,
  hasSvg,
  neighbours,
  noSvgReason,
  reviewPictures,
  runFacts,
  undecidedRefusal,
  verdictOfEvent,
  wroteOf,
} from "../scripts/lib/shot-review.mjs";
import {
  allHtml,
  chipsOf,
  detailHtml,
  encodePath,
  hrefs,
  loupesHtml,
  outsideHtml,
  plainHtml,
} from "../scripts/lib/shot-pages.mjs";
import { pngRule, svgRule } from "../scripts/lib/shot-policy.mjs";
import { againstOf, createApplier } from "../scripts/lib/shot-verdicts.mjs";
import { browserTable, kindOf, onlyOf, runArgs, runOf } from "../scripts/lib/shot-runs.mjs";
import { createReviewServer, kept } from "../scripts/lib/shot-server.mjs";
import { startGitReader } from "../scripts/lib/shot-git-worker.mjs";
import { openRevision } from "../scripts/lib/shot-revision.mjs";

describe("the screenshot review's session (shot-session.mjs)", () => {
  const baseline = () => ({ hash: "a".repeat(40), short: "aaaaaaaa", build: 1500 });

  test("is made with its baseline, numbers its runs, and marks one left running as interrupted", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-session-"));
    try {
      const s = openSession(root, baseline, () => "t0");
      assert.deepEqual(s.data, { format: 1, created: "t0", baseline: baseline(), runs: [], place: null });
      const one = s.addRun({ tool: "shoot_docs", args: ["--svg", "--only", "Menu_File|Close"] });
      const two = s.addRun({ tool: "replay", args: [] });
      assert.deepEqual([one.n, two.n], [1, 2]);
      s.endRun(1, { exit: 0, stopped: false });
      s.setPlace("IDE/Images/A.png");
      assert.throws(() => s.addRun({ tool: "rm", args: [] }), /no such tool/);
      const again = openSession(
        root,
        () => assert.fail("a session there is not made again"),
        () => "t1",
      );
      assert.deepEqual(
        again.data.runs.map((r) => [r.n, r.ended, r.interrupted]),
        [
          [1, "t0", false],
          [2, "t1", true],
        ],
      );
      assert.equal(again.data.place, "IDE/Images/A.png");
      assert.equal(runPaths(root, 2).stage, path.join(root, "session", "runs", "2", "stage"));
      assert.equal(commandOf(one), 'node scripts/shoot_docs.mjs --svg --only "Menu_File|Close"');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("is archived by the commit that closes it, without its lock, opened from the archive, and listed newest first", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-session-"));
    try {
      const commit = { hash: "c".repeat(40), short: "cccccccc", message: "Screenshots retaken" };
      const s = openSession(root, baseline, () => "t1");
      s.addRun({ tool: "replay", args: [] });
      acquireLock(sessionPaths(root).lock);
      assert.equal(s.archive(commit), "cccccccc");
      assert.equal(fs.existsSync(sessionPaths(root).dir), false);
      assert.equal(fs.existsSync(sessionPaths(archiveRoot(root, "cccccccc")).lock), false);
      const archived = openSession(archiveRoot(root, "cccccccc"), () => assert.fail("an archived session is not made"));
      assert.deepEqual([archived.data.closed, archived.data.runs.length], [{ ...commit, at: "t1" }, 1]);
      // a second session closed by a commit of the same short hash
      openSession(root, baseline, () => "t2").archive(commit);
      fs.mkdirSync(path.join(sessionPaths(root).archive, "empty"));
      assert.deepEqual(
        listArchived(root).map((a) => [a.id, a.closed.at, a.baseline.short, a.runs]),
        [
          ["cccccccc-2", "t2", "aaaaaaaa", 0],
          ["cccccccc", "t1", "aaaaaaaa", 1],
        ],
      );
      assert.deepEqual(listArchived(path.join(root, "none")), []);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("refuses a file that is not a session", () => {
    assert.throws(() => parseSession("{"), /not JSON/);
    assert.throws(() => parseSession('{"format":2}'), /format 1/);
    assert.throws(() => parseSession(JSON.stringify({ format: 1, baseline: baseline(), runs: [{ n: 1 }] })), /a run/);
  });

  test("is held by one tool: a lock of a process still running refuses, one of a process ended is taken", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-session-"));
    try {
      const lock = sessionPaths(root).lock;
      const release = acquireLock(lock, 100, () => true);
      assert.throws(() => acquireLock(lock, 200, () => true), /process 100/);
      const taken = acquireLock(lock, 200, () => false);
      release();
      assert.equal(fs.readFileSync(lock, "utf8"), "200");
      taken();
      assert.equal(fs.existsSync(lock), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("reads a run's events, a last line cut short left out, and the newest build", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shot-session-"));
    try {
      const file = path.join(dir, "events.jsonl");
      assert.deepEqual(readEvents(file), []);
      fs.writeFileSync(file, '{"type":"run"}\n{"type":"picture","out":"a.png"}\n{"type":"sv');
      assert.deepEqual(
        readEvents(file).map((e) => e.type),
        ["run", "picture"],
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    assert.equal(newestBuild({ "a.png": { build: 1010 }, "b.png": {}, "c.png": { build: 1034 } }), 1034);
    assert.equal(newestBuild({}), null);
  });

  test("makes a run's arguments from a request, the pictures as a pattern that matches each alone, and refuses one that is not a run", () => {
    const base = baseline();
    const h = base.hash;
    assert.deepEqual(runOf({ kind: "retake", only: "Menu_File", jobs: "2", ide: "C:/tb/twinBASIC.exe" }, base), {
      tool: "shoot_docs",
      args: ["--svg", "--only", "Menu_File", "--against", h, "--jobs", "2", "--ide", "C:/tb/twinBASIC.exe"],
    });
    assert.deepEqual(runOf({ kind: "retake", svg: false }, base), { tool: "shoot_docs", args: ["--against", h] });
    assert.deepEqual(runOf({ kind: "replay", only: " ", recheck: true }, base), {
      tool: "replay",
      args: ["--recheck", "--against", h],
    });
    const pictures = ["IDE/Images/A.png", "IDE/Images/A (1).light.png"];
    const cleanup = runOf({ kind: "cleanup", dryRun: true, pictures }, base);
    assert.deepEqual(cleanup, {
      tool: "cleanup",
      args: [
        "--cleanup",
        "--dry-run",
        "--only",
        "^(?:IDE/Images/A\\.png|IDE/Images/A \\(1\\)\\.light\\.png)$",
        "--against",
        h,
      ],
    });
    const pattern = new RegExp(cleanup.args[3]);
    assert.deepEqual(
      [...pictures, "IDE/Images/AxPng", "IDE/Images/A.png.svg"].map((p) => pattern.test(p)),
      [true, true, false, false],
    );
    assert.equal(onlyOf(["a.png"]), "^(?:a\\.png)$");
    assert.equal(
      commandOf({ tool: "cleanup", args: ["--cleanup", "--against", h] }),
      `node scripts/shoot_docs.mjs --cleanup --against ${h}`,
    );
    assert.deepEqual(
      ["shoot_docs", "replay", "cleanup", "chromeshot"].map((tool) => kindOf({ tool })),
      ["retake", "replay", "cleanup", "browser"],
    );
    for (const [request, refusal] of [
      [{ kind: "rm" }, /no such kind of run: rm/],
      [{ kind: "retake", only: "(" }, /--only expects a regular expression/],
      [{ kind: "retake", jobs: "17" }, /--jobs/],
      [{ kind: "retake", recheck: true }, /a retake takes no --recheck/],
      [{ kind: "replay", ide: "C:/tb/twinBASIC.exe" }, /a replay takes no IDE/],
      [{ kind: "replay", svg: false }, /a replay takes no --svg/],
      [{ kind: "cleanup", jobs: "2" }, /a clean-up takes no --jobs/],
      [{ kind: "replay", dryRun: true }, /a replay takes no --dry-run/],
      [{ kind: "retake", only: "A", pictures: ["A.png"] }, /a pattern or the pictures, not both/],
      [{ kind: "retake", pictures: [] }, /no picture was given/],
    ])
      assert.throws(() => runOf(request, base), refusal);
  });
});

describe("a browser retake of the screenshot review", () => {
  const base = { hash: "c".repeat(40) };
  const RUN = "Documentation/Images/run-workflow.png";
  const MERGE = "Documentation/Images/merge-pull-request.light.png";

  test("is what a retake of a browser's picture is, whichever page asks for it", () => {
    // The light picture stands for its shot, and each shot is taken once.
    const run = runOf({ kind: "retake", pictures: [RUN, RUN.replace(".png", ".light.png"), MERGE] }, base);
    assert.equal(run.tool, "chromeshot");
    assert.deepEqual(run.args.slice(2), ["--against", base.hash]);
    const only = new RegExp(run.args[1]);
    assert.deepEqual(
      [RUN, "Documentation/Images/merge-pull-request.png", "Documentation/Images/confirm-merge.png"].map((p) =>
        only.test(p),
      ),
      [true, true, false],
    );
    // What the runs page's retake form sends with it is the IDE's, and goes with the IDE.
    assert.equal(
      runOf({ kind: "retake", pictures: [RUN], ide: "C:/tb/twinBASIC.exe", jobs: "2" }, base).tool,
      "chromeshot",
    );
    // Where it works comes from the tool's own options.
    const placed = runOf({ kind: "browser", only: "run-workflow" }, base, {
      captures: "D:/c",
      extension: "D:/e",
      noOpen: true,
    });
    assert.deepEqual(placed.args, [
      "--take",
      "run-workflow",
      "--against",
      base.hash,
      "--captures",
      "D:/c",
      "--extension",
      "D:/e",
      "--no-open",
    ]);
    assert.deepEqual(runOf({ kind: "browser" }, base).args.slice(0, 2), ["--take", "."]);
    // An IDE's picture is the IDE's, and the two do not share a run.
    assert.equal(runOf({ kind: "retake", pictures: ["IDE/Images/Menu_File.png"] }, base).tool, "shoot_docs");
    assert.throws(
      () => runOf({ kind: "retake", pictures: [RUN, "IDE/Images/Menu_File.png"] }, base),
      /runs of their own/,
    );
    assert.throws(() => runOf({ kind: "browser", only: "(" }, base), /--take expects a regular expression/);
  });

  test("is staged, its stage and events given as a retake's are", () => {
    assert.ok(STAGED_TOOLS.has("chromeshot"));
    assert.deepEqual(runArgs("chromeshot", ["--take", "x"], "S"), ["--take", "x", "--stage", "S", "--events"]);
    assert.equal(
      commandOf({ tool: "chromeshot", args: ["--take", "x"] }),
      "node scripts/svgshot/chromeshot.mjs --take x",
    );
  });

  test("says which picture it waits for, why the last capture was refused, and when it is done", () => {
    const start = [
      {
        type: "run",
        svg: true,
        build: null,
        captures: "D:/c",
        extension: { folder: "D:/e", step: "press reload" },
        jobs: [{ name: "run-workflow", pictures: [RUN] }],
      },
      { type: "job", job: "run-workflow", state: "started" },
      { type: "await", job: "run-workflow", out: RUN, url: "https://x/y", shows: "Open it." },
    ];
    const waiting = runFacts("chromeshot", start);
    assert.deepEqual(waiting.awaiting, { job: "run-workflow", out: RUN, url: "https://x/y", shows: "Open it." });
    assert.equal(waiting.refused, null);
    assert.deepEqual(waiting.extension, { folder: "D:/e", step: "press reload" });
    assert.equal(waiting.captures, "D:/c");
    assert.ok(waiting.svg);
    const refused = [...start, { type: "refused", job: "run-workflow", out: RUN, error: "no marks" }];
    assert.equal(runFacts("chromeshot", refused).refused, "no marks");
    // A later wait starts clean, and a job ended waits for nothing.
    const next = [...refused, { type: "await", job: "b", out: "b.png", url: "u", shows: "s" }];
    assert.equal(runFacts("chromeshot", next).refused, null);
    const done = [...refused, { type: "job", job: "run-workflow", state: "done" }];
    assert.equal(runFacts("chromeshot", done).awaiting, null);
    assert.equal(runFacts("chromeshot", [...start, { type: "summary", stopped: true }]).awaiting, null);
  });

  test("lists its pictures in the table of every picture, as a setup of their own", () => {
    const table = browserTable();
    assert.equal(table.length, 6);
    assert.ok(table.every((s) => s.setup === "browser" && !s.once && !s.window));
    assert.ok(table.some((s) => s.out === RUN));
  });
});

describe("what the screenshot review shows (shot-review.mjs, shot-pages.mjs)", () => {
  const A = "IDE/Images/A.png";
  const B = "IDE/Images/B.png";
  const C = "IDE/Images/C.png";
  const D = "IDE/Images/D.light.png";
  const E = "IDE/Images/E.png";
  const run = (n, tool, live, events, verdicts) => ({
    n,
    tool,
    live,
    facts: runFacts(tool, events),
    verdicts: new Map(Object.entries(verdicts).map(([out, v]) => [out, { png: null, svg: null, ...v }])),
  });
  const jobs = (...pictures) => ({ type: "run", svg: true, jobs: [{ name: "j", pictures }] });

  test("a run's events say what it lists, its jobs, its failures and what it did not take", () => {
    const f = runFacts("shoot_docs", [
      jobs(A, B),
      { type: "job", job: "j", state: "started" },
      { type: "failed", out: A, error: "boom" },
      { type: "stopping" },
      { type: "skipped", out: B },
    ]);
    assert.deepEqual(f.listed, [A, B]);
    assert.equal(f.svg, true);
    assert.deepEqual(f.jobs.get("j"), { pictures: 2, state: "started", error: null });
    assert.equal(f.jobOf.get(B), "j");
    assert.equal(f.failed.get(A), "boom");
    assert.deepEqual([...f.skipped], [B]);
    assert.equal(f.stopping, true);
    // the build the run event names, which Retake what failed takes when the run named no IDE
    assert.equal(f.build, null);
    assert.equal(runFacts("shoot_docs", [{ ...jobs(A), build: 1033 }]).build, 1033);
    const r = runFacts("replay", [
      { type: "run", pictures: [C] },
      { type: "retake", out: C, why: "no bundle" },
    ]);
    assert.deepEqual([r.listed, r.svg, r.retakes.get(C)], [[C], true, "no bundle"]);
    assert.deepEqual(verdictOfEvent({ type: "svg", job: "j", out: A, state: "new" }), ["svg", { state: "new" }]);
  });

  test("a job that fails before it reaches a picture fails the picture, with the job's error", () => {
    const events = [
      jobs(A, B),
      { type: "job", job: "j", state: "started" },
      { type: "job", job: "j", state: "failed", error: "no hook" },
      { type: "job", job: "j", state: "done" },
    ];
    assert.deepEqual(runFacts("shoot_docs", events).jobs.get("j"), { pictures: 2, state: "failed", error: "no hook" });
    const { pictures } = reviewPictures([run(1, "shoot_docs", false, events, { [A]: { png: { state: "new" } } })]);
    const at = (out) => pictures.find((p) => p.out === out);
    assert.deepEqual([at(A).group, at(A).failed], ["added", null]);
    assert.deepEqual([at(B).group, at(B).failed], ["failed", { run: 1, error: "its job, j, failed: no hook" }]);
  });

  test("a picture takes the newest verdicts, and a retake's PNG drops an older run's SVG", () => {
    const runs = [
      run(1, "shoot_docs", false, [jobs(A, B, C), { type: "failed", out: C, error: "boom" }], {
        [A]: { png: { state: "updated" }, svg: { state: "new" } },
        [B]: { png: { state: "noise" }, svg: { state: "unchanged" } },
      }),
      run(2, "replay", false, [{ type: "run", pictures: [A, D] }], {
        [A]: { svg: { state: "updated" } },
        [D]: { svg: { state: "removed" } },
      }),
      run(3, "shoot_docs", true, [jobs(A, E)], { [A]: { png: { state: "unchanged" } } }),
    ];
    const { pictures, groups } = reviewPictures(runs);
    const at = (out) => pictures.find((p) => p.out === out);
    assert.deepEqual([at(A).png, at(A).svg, at(A).progress], [{ run: 3, state: "unchanged" }, null, true]);
    assert.deepEqual([at(E).progress, at(E).group], [true, "progress"]);
    assert.deepEqual(
      [B, C, D].map((out) => at(out).group),
      ["noise", "failed", "changed"],
    );
    assert.equal(at(C).failed.error, "boom");
    assert.deepEqual(
      groups.map((g) => g.key),
      [
        "progress",
        "look",
        "changed",
        "noise",
        "outside",
        "unchanged",
        "windows",
        "added",
        "deleted",
        "retake",
        "failed",
      ],
    );
    assert.deepEqual(
      pictures.map((p) => p.out),
      [A, E, D, B, C],
    );
    // the same runs once the third has ended: A's PNG is unchanged, and it has no SVG verdict
    const ended = reviewPictures(runs.map((r) => ({ ...r, live: false })));
    assert.equal(ended.pictures.find((p) => p.out === A).group, "unchanged");
  });

  test("a picture a replay passed on for a retake is in Needs a retake, not in progress, whatever its PNG", () => {
    const runs = [
      run(1, "shoot_docs", false, [jobs(A, B)], {
        [A]: { png: { state: "unchanged" }, svg: { state: "unchanged" } },
        [B]: { png: { state: "unchanged" }, svg: { state: "unchanged" } },
      }),
      run(
        2,
        "replay",
        true,
        [
          { type: "run", pictures: [A, B, C] },
          { type: "retake", out: A, why: "no bundle" },
        ],
        {},
      ),
    ];
    const at = (pictures, out) => pictures.find((p) => p.out === out);
    const live = reviewPictures(runs).pictures;
    assert.deepEqual([at(live, A).group, at(live, A).progress], ["retake", false]);
    assert.deepEqual([at(live, B).group, at(live, C).group], ["progress", "progress"]);
    const ended = reviewPictures(runs.map((r) => ({ ...r, live: false }))).pictures;
    assert.deepEqual([at(ended, A).group, at(ended, A).retake], ["retake", { run: 2, why: "no bundle" }]);
    // a later run's verdict on it takes it out of the group
    const retaken = reviewPictures([
      ...runs.map((r) => ({ ...r, live: false })),
      run(3, "shoot_docs", false, [jobs(A)], { [A]: { png: { state: "unchanged" }, svg: { state: "updated" } } }),
    ]).pictures;
    assert.deepEqual([at(retaken, A).group, at(retaken, A).retake], ["changed", null]);
  });

  test("the Changed group is ordered by how much each changed, and a look comes first", () => {
    const runs = [
      run(1, "shoot_docs", false, [jobs(A, B, C)], {
        [A]: { png: { state: "updated" } },
        [B]: { png: { state: "updated" } },
        [C]: { png: { state: "updated", look: { why: "small", text: "small" } } },
      }),
    ];
    const share = { [A]: 0.5, [B]: 3 };
    const { groups } = reviewPictures(runs, { measure: (p) => share[p.out] });
    const by = Object.fromEntries(groups.map((g) => [g.key, g.pictures.map((p) => p.out)]));
    assert.deepEqual([by.look, by.changed], [[C], [B, A]]);
  });

  test("a picture no run reported is changed outside the runs, and a verdict judged against another baseline needs a look", () => {
    const runs = [
      run(1, "shoot_docs", false, [jobs(A, B)], {
        [A]: { png: { state: "noise", against: "revision", baseline: "old" } },
        [B]: { png: { state: "updated", against: "disk", baseline: "old" } },
      }),
    ];
    const outside = [
      { out: B, status: "modified" },
      { out: C, status: "added" },
    ];
    const { pictures } = reviewPictures(runs, { outside, baseline: "new" });
    const at = (out) => pictures.find((p) => p.out === out);
    // C no run reported; B's PNG a run wrote, so the change is the session's
    assert.deepEqual(
      [at(C).group, at(C).outside, at(C).outsideParts, at(B).outside],
      ["outside", "added", ["png"], null],
    );
    assert.deepEqual([at(A).group, at(A).png.look.why], ["look", "baseline"]);
    assert.deepEqual([at(B).group, at(B).png.look], ["changed", undefined]);
    assert.equal(reviewPictures(runs, { baseline: "old" }).pictures.find((p) => p.out === A).group, "noise");
    // a commit that did not change A's picture leaves its verdict as it was
    const kept = reviewPictures(runs, { baseline: "new", stale: (out, hash) => !(out === A && hash === "old") });
    assert.deepEqual([kept.pictures.find((p) => p.out === A).group], ["noise"]);
    assert.match(chipsOf(at(C)), /changed outside the runs: added/);
  });

  test("a file no layer of the session wrote is changed outside the runs, whether a run reported its picture or not", () => {
    const F = "IDE/Images/F.png";
    // what a layer decides: a PNG written, put back or removed takes its SVG with it
    assert.deepEqual(
      ["updated", "new", "restored", "dark", "once", "noise", "unchanged", "failed"].map(
        (state) => wroteOf({ png: { state } }).png,
      ),
      [true, true, true, true, true, false, false, false],
    );
    assert.deepEqual(wroteOf({ png: { state: "updated" }, svg: { state: "unchanged" } }), { png: true, svg: true });
    assert.deepEqual(wroteOf({ png: { state: "noise" }, svg: { state: "unchanged" } }), { png: false, svg: false });
    assert.deepEqual(wroteOf({ svg: { state: "removed" } }), { png: false, svg: true });
    const runs = [
      run(1, "shoot_docs", false, [jobs(A, B, C, D, E)], {
        // the PNG and its SVG stayed: whatever they hold is what the run found
        [A]: { png: { state: "noise" }, svg: { state: "unchanged", why: "its PNG is not written" } },
        // the PNG stayed, and the run wrote the SVG (its bundle could not draw it again)
        [B]: { png: { state: "unchanged" }, svg: { state: "updated" } },
        // the PNG written, its SVG the same as the file's: the session judged both
        [C]: { png: { state: "updated" }, svg: { state: "unchanged" } },
        // the PNG put back as the baseline has it, with its SVG
        [D]: { png: { state: "restored" }, svg: { state: "updated" } },
        [E]: { png: { state: "unchanged" }, svg: { state: "unchanged" } },
      }),
      // a later run that leaves A as it is does not make its files the session's
      run(2, "shoot_docs", false, [jobs(A)], { [A]: { png: { state: "unchanged" }, svg: { state: "unchanged" } } }),
    ];
    const outside = [
      { out: A, status: "SVG modified", parts: { png: null, svg: "modified" } },
      { out: B, status: "SVG modified", parts: { png: null, svg: "modified" } },
      { out: C, status: "modified", parts: { png: "modified", svg: "modified" } },
      { out: D, status: "SVG modified", parts: { png: null, svg: "modified" } },
      { out: E, status: "modified", parts: { png: "modified", svg: "added" } },
      { out: F, status: "SVG added", parts: { png: null, svg: "added" } },
    ];
    const kept = { [E]: ["png", "svg"] };
    const { pictures, groups } = reviewPictures(runs, {
      outside,
      outsideKept: (out, parts) => JSON.stringify(kept[out]) === JSON.stringify(parts),
    });
    const at = (out) => pictures.find((p) => p.out === out);
    assert.deepEqual(
      [A, B, C, D, E, F].map((out) => [at(out).outside, at(out).outsideParts, at(out).outsideKept]),
      [
        ["SVG modified", ["svg"], false],
        [null, [], false],
        [null, [], false],
        [null, [], false],
        ["PNG modified, SVG added", ["png", "svg"], true],
        ["SVG added", ["svg"], false],
      ],
    );
    assert.deepEqual(
      groups.find((g) => g.key === "outside").pictures.map((p) => p.out),
      [A, E, F],
    );
    assert.match(chipsOf(at(E)), /kept from outside the runs: PNG modified, SVG added/);
    assert.match(chipsOf(at(A)), /changed outside the runs: SVG modified/);
  });

  test("a picture changed outside the runs is compared side by side, by a swipe, by blinking and by a map", () => {
    const baseline = { short: "abcd1234" };
    const pager = { filter: "all", place: { index: 0, total: 1 }, prev: null, next: null };
    const svg = {
      head: { src: "/file/head/x.svg", size: [800, 600] },
      docs: { src: "/file/docs/x.svg", size: [800, 600] },
    };
    const modes = (html) => [...html.matchAll(/data-set="(\w+)"/g)].map((m) => m[1]);
    // an SVG changed alone: its two versions compared, the map drawn by the page; the PNG shown once
    const svgOnly = outsideHtml({
      p: { out: A, outside: "SVG modified", outsideParts: ["svg"], outsideKept: false },
      ...pager,
      files: {
        head: { src: "/file/head/x.png", size: [800, 600] },
        docs: { src: "/file/docs/x.png", size: [800, 600] },
        svg,
      },
      map: "/map/outside/x.png",
      baseline,
    });
    assert.equal(svgOnly.match(/class="compare"/g).length, 1);
    assert.deepEqual(modes(svgOnly), ["side", "swipe", "blink", "map"]);
    assert.match(
      svgOnly,
      /<canvas class="diffmap" data-a="\/file\/head\/x.svg" data-b="\/file\/docs\/x.svg" width="800" height="600"/,
    );
    assert.match(svgOnly, /The PNG, as HEAD has it/);
    // a PNG changed: compared with HEAD's, the map the server's
    const pngToo = outsideHtml({
      p: { out: A, outside: "modified", outsideParts: ["png", "svg"], outsideKept: false },
      ...pager,
      files: {
        head: { src: "/file/head/x.png", size: [800, 600] },
        docs: { src: "/file/docs/x.png", size: [800, 600] },
        svg,
      },
      map: "/map/outside/x.png",
      baseline,
    });
    assert.equal(pngToo.match(/class="compare"/g).length, 2);
    assert.match(pngToo, /<div class="view mapview"><figure><span class="pic"><img src="\/map\/outside\/x.png"/);
    // an SVG with no version at HEAD: nothing to compare it with
    const added = outsideHtml({
      p: { out: A, outside: "SVG added", outsideParts: ["svg"], outsideKept: false },
      ...pager,
      files: { head: null, docs: { src: "/file/docs/x.png", size: [800, 600] }, svg: { ...svg, head: null } },
      map: null,
      baseline,
    });
    assert.doesNotMatch(added, /class="compare"/);
    assert.match(added, /HEAD has no SVG/);
  });

  test("a commit waits for every file changed outside the runs to be kept or put back, and takes the kept ones", () => {
    const pictures = [
      {
        out: A,
        png: { state: "noise" },
        svg: { state: "unchanged" },
        outside: "SVG modified",
        outsideParts: ["svg"],
        outsideKept: false,
      },
      { out: B, png: null, svg: null, outside: "modified", outsideParts: ["png"], outsideKept: true },
      {
        out: C,
        png: { state: "updated", by: "rule", build: 1501 },
        svg: { state: "updated" },
        outside: null,
        outsideParts: [],
      },
    ];
    const changes = [A.replace(/\.png$/, ".svg"), B, C, C.replace(/\.png$/, ".svg")].map((out) => ({
      path: `docs/${out}`,
      status: "modified",
    }));
    const plan = commitPlan({ pictures, changes, docsPrefix: "docs/", manifestPath: "m.json" });
    assert.deepEqual(plan.undecided, [A]);
    assert.deepEqual(
      plan.files.map((f) => [f.path, f.why]),
      [
        [`docs/${B}`, "changed outside the runs, kept by review"],
        [`docs/${C}`, "changed by the tool's verdict"],
        [`docs/${C.replace(/\.png$/, ".svg")}`, "written"],
      ],
    );
    assert.deepEqual(
      plan.leftOut.map((c) => c.path),
      [`docs/${A.replace(/\.png$/, ".svg")}`],
    );
    assert.equal(plan.counts.outsideKept, 1);
    assert.match(undecidedRefusal(plan), /1 picture changed outside the session's runs needs Keep or Put back first/);
    assert.equal(undecidedRefusal({ ...plan, undecided: [] }), null);
    assert.match(commitMessage(plan), /1 kept from outside the runs/);
  });

  test("a picture's allowances are chips, with the rule each makes as their tooltip", () => {
    const p = { out: A, png: { state: "unchanged", by: "rule" }, svg: null };
    assert.doesNotMatch(chipsOf(p), /allowance/);
    assert.doesNotMatch(chipsOf(p, { build: 1501 }), /allowance/);
    const chips = chipsOf(p, { png: { noise: { levels: 24 } }, svg: { ignore: [[0, 0, 2, 2]] } });
    assert.match(
      chips,
      /<span class="chip review" title="PNG allowance: within noise when no pixel is more than 24 levels off[^"]*">PNG: allowance<\/span>/,
    );
    assert.match(
      chips,
      /<span class="chip review" title="SVG allowance: [^"]*1 rectangle left out">SVG: allowance<\/span>/,
    );
  });

  test("a picture the run takes once, or the dark one's light picture, is deleted only when its file is there", () => {
    const p = { out: D, png: { state: "dark" }, svg: null, progress: false, failed: null };
    assert.equal(
      groupOf(p, () => true),
      "deleted",
    );
    assert.equal(
      groupOf(p, () => false),
      "unchanged",
    );
    assert.equal(
      groupOf({ ...p, png: { state: "new" } }, () => false),
      "added",
    );
  });

  test("the filters: no SVG after the verdicts are applied, and a picture's neighbours in a list", () => {
    const pictures = [
      { out: A, svg: { state: "new" } },
      { out: B, svg: { state: "not written" } },
      { out: C, svg: null },
      { out: E, svg: { state: "unchanged" }, group: "look" },
    ];
    const exists = (f) => f === "IDE/Images/E.svg";
    assert.deepEqual(
      pictures.map((p) => hasSvg(p, exists)),
      [true, false, false, true],
    );
    assert.deepEqual(
      filterPictures(pictures, "nosvg", { exists }).map((p) => p.out),
      [B, C],
    );
    assert.deepEqual(
      filterPictures(pictures, "look").map((p) => p.out),
      [E],
    );
    assert.deepEqual(
      filterPictures(pictures, "overridden", { overridden: (out) => out === A }).map((p) => p.out),
      [A],
    );
    assert.equal(filterPictures(pictures, "nonsense").length, 4);
    const { index, prev, next } = neighbours(pictures, B);
    assert.deepEqual([index, prev.out, next.out], [1, A, C]);
    assert.deepEqual(neighbours(pictures, "x.png"), { index: -1, prev: null, next: null });
  });

  test("a picture of program windows is a group of its own, PNG only, unless its PNG changed", () => {
    const why = WINDOW_WHY;
    const svg = svgVerdict({ state: "not written", why, window: true });
    assert.equal(svg.window, true);
    assert.equal("window" in svgVerdict({ state: "not written", why: "refused" }), false);
    const exists = () => true;
    const at = (png, part = svg) => ({ out: A, png: { state: png, look: null }, svg: part });
    assert.equal(groupOf(at("unchanged"), exists), "windows");
    assert.equal(groupOf(at("noise"), exists), "windows");
    assert.equal(groupOf(at("updated"), exists), "changed");
    assert.equal(groupOf(at("new"), exists), "added");
    // a run before the mark said the same of References_Detail, whose shot turned its SVG off:
    // that is no mark
    assert.equal(
      groupOf(at("unchanged", { state: "not written", why: "the picture is not a single capture" }), exists),
      "unchanged",
    );
    assert.equal(groupOf(at("unchanged", { state: "not written", why: "refused" }), exists), "unchanged");
    // the No SVG filter leaves them out, and their chip says why there is none
    assert.deepEqual(filterPictures([at("unchanged")], "nosvg", { exists: () => false }), []);
    assert.match(chipsOf(at("unchanged")), /SVG: PNG only: a program's window/);
  });

  test("a commit takes the session's own files that git reports changed, and says what it did to each", () => {
    const I = "IDE/Images/";
    const pictures = [
      {
        out: `${I}A.png`,
        png: { state: "updated", by: "rule", build: 1501 },
        svg: { state: "updated", by: "rule", stats: { pct96: 0.1 } },
      },
      { out: `${I}B.light.png`, png: { state: "dark", by: "rule" }, svg: null },
      { out: `${I}C.png`, png: { state: "restored", by: "decision" }, svg: null },
      // written by the rule, but only with its allowance: 0.4% is past the default bar
      {
        out: `${I}D.png`,
        png: { state: "new", by: "rule", build: 1502 },
        svg: { state: "new", by: "rule", stats: { pct96: 0.4 } },
      },
      {
        out: `${I}E.png`,
        png: { state: "updated", by: "decision", build: 1501 },
        svg: { state: "new", by: "decision" },
      },
      { out: `${I}F.png`, png: null, svg: null, outside: "modified" },
      { out: `${I}G.png`, png: null, svg: { state: "removed", by: "rule" } },
      // a retake whose picture is as HEAD has it: nothing to commit, and not counted
      { out: `${I}H.png`, png: { state: "unchanged", by: "rule" }, svg: { state: "unchanged" } },
      // a review took a capture that HEAD now has: judged by that decision, but nothing kept against the tool
      { out: `${I}J.png`, png: { state: "unchanged", by: "decision" }, svg: null },
    ];
    const changes = [
      ["docs/IDE/Images/A.png", "modified"],
      ["docs/IDE/Images/A.svg", "modified"],
      ["docs/IDE/Images/B.light.png", "deleted"],
      ["docs/IDE/Images/B.light.svg", "deleted"],
      ["docs/IDE/Images/D.png", "added"],
      ["docs/IDE/Images/D.svg", "added"],
      ["docs/IDE/Images/E.png", "modified"],
      ["docs/IDE/Images/E.svg", "added"],
      ["docs/IDE/Images/F.png", "modified"],
      ["docs/IDE/Images/G.svg", "deleted"],
      ["README.md", "modified"],
      ["test/shots/manifest.json", "modified"],
    ].map(([p, status]) => ({ path: p, status }));
    const plan = commitPlan({
      pictures,
      changes,
      docsPrefix: "docs/",
      manifestPath: "test/shots/manifest.json",
      entry: (out) =>
        ({
          [`${I}C.png`]: { png: { decision: { keep: "old", capture: "c" } } },
          [`${I}D.png`]: { svg: { bar: { share: 1 } } },
          [`${I}J.png`]: { png: { decision: { keep: "new", capture: "j" } } },
        })[out] ?? null,
    });
    assert.deepEqual(
      plan.files.map((f) => [f.path.replace("docs/IDE/Images/", ""), f.status, f.part, f.why]),
      [
        ["A.png", "modified", "png", "changed by the tool's verdict"],
        ["A.svg", "modified", "svg", "written"],
        ["B.light.png", "deleted", "png", "removed: the dark picture's pixels"],
        ["B.light.svg", "deleted", "svg", "removed"],
        ["D.png", "added", "png", "new"],
        ["D.svg", "added", "svg", "written: accepted by its allowance"],
        ["E.png", "modified", "png", "taken by review, against the tool's verdict"],
        ["E.svg", "added", "svg", "written: accepted by review"],
        ["G.svg", "deleted", "svg", "removed"],
        ["test/shots/manifest.json", "modified", "manifest", "the review's decisions and allowances, and the builds"],
      ],
    );
    assert.equal(plan.files[0].out, `${I}A.png`);
    assert.deepEqual(
      plan.leftOut.map((c) => c.path),
      ["docs/IDE/Images/F.png", "README.md"],
    );
    assert.deepEqual(plan.counts, {
      changed: 2,
      created: 1,
      taken: 1,
      kept: 1,
      dropped: 1,
      svgWritten: 3,
      svgByAllowance: 1,
      svgByReview: 1,
      svgRemoved: 2,
      outsideKept: 0,
      manifest: true,
    });
    // F, changed outside the runs and not decided, holds the commit back
    assert.deepEqual(plan.undecided, [`${I}F.png`]);
    assert.equal(plan.build, 1502);
    assert.equal(
      commitMessage(plan),
      "Screenshots retaken on BETA 1502: 2 pictures changed (1 new), 1 taken by review, 1 kept at HEAD by review, 1 light picture removed; 3 SVGs written (1 by allowance, 1 by review), 2 removed",
    );

    // the plan's own example, a replay alone, the manifest alone, and nothing
    const none = Object.fromEntries(Object.keys(plan.counts).map((k) => [k, k === "manifest" ? false : 0]));
    const counts = (c) => ({ ...none, ...c });
    assert.equal(
      commitMessage({
        counts: counts({ changed: 39, kept: 3, svgWritten: 35, svgByAllowance: 2, svgRemoved: 1 }),
        build: 1501,
      }),
      "Screenshots retaken on BETA 1501: 39 pictures changed, 3 kept at HEAD by review; 35 SVGs written (2 by allowance), 1 removed",
    );
    assert.equal(
      commitMessage({ counts: counts({ svgWritten: 1, manifest: true }), build: null }),
      "Screenshot SVGs drawn again: 1 SVG written",
    );
    assert.equal(
      commitMessage({ counts: counts({ svgRemoved: 2 }), build: null }),
      "Screenshot SVGs drawn again: 2 SVGs removed",
    );
    assert.equal(
      commitMessage({ counts: counts({ kept: 1, manifest: true }), build: null }),
      "Screenshots reviewed: 1 kept at HEAD by review",
    );
    assert.equal(
      commitMessage({ counts: counts({ manifest: true }), build: null }),
      "Screenshot review: the manifest's decisions and allowances",
    );
    assert.equal(commitMessage({ counts: counts({}), build: null }), null);
    assert.deepEqual(commitPlan({ pictures, changes: [], docsPrefix: "docs/", manifestPath: "m.json" }).files, []);
  });

  test("an address encodes each segment of a path, and a loupe crops and enlarges its region", () => {
    assert.equal(hrefs.picture("IDE/Images/A b#.png", "look"), "/picture/IDE/Images/A%20b%23.png?filter=look");
    assert.equal(hrefs.picture(A, "all"), `/picture/${A}`);
    assert.equal(encodePath("a/b c"), "a/b%20c");
    const html = loupesHtml(
      [{ x0: 100, y0: 50, x1: 130, y1: 60, pixels: 300, core: 40 }],
      [400, 200],
      { src: "/o", label: "HEAD" },
      { src: "/n", label: "new" },
    );
    // 30 x 10 px with 6 px round it, enlarged 4 times
    assert.match(
      html,
      /width:168px;height:88px;background-image:url\('\/o'\);background-size:1600px 800px;background-position:-376px -176px/,
    );
    assert.match(html, /HEAD \| new: 30 x 10 px at 100, 50/);
    assert.equal(loupesHtml([], [400, 200], {}, {}), "");
  });

  test("a capture that is HEAD's picture byte for byte offers no choice of picture, only the way back from a decision", () => {
    const page = (png, against = "revision") =>
      detailHtml({
        p: { out: A, group: "look", png: { run: 1, regions: [], regionCount: 0, ...png, against }, svg: null },
        filter: "all",
        place: { index: 0, total: 1, group: "look" },
        prev: null,
        next: null,
        files: { head: { src: "/h", size: [4, 4] }, capture: { src: "/c", size: [4, 4] } },
        maps: {},
        rules: { png: pngRule(null), svg: svgRule(null) },
        build: null,
        baseline: { hash: "a".repeat(40), short: "aaaaaaaa" },
      });
    const same = page({ state: "unchanged", by: "rule" });
    assert.match(same, /nothing to keep or take/);
    assert.doesNotMatch(same, /Take the new capture|Back to the rule/);
    assert.match(page({ state: "unchanged", by: "decision" }), /Back to the rule/);
    // the file is the capture and differs from HEAD's: keeping the old picture puts HEAD's back
    assert.match(page({ state: "unchanged", by: "rule" }, "disk"), /Keep the old picture/);
  });

  test("an SVG that stays with its PNG can be accepted in place of the file's, and not refused", () => {
    const page = (svg) =>
      detailHtml({
        p: {
          out: A,
          group: "look",
          png: { run: 1, state: "unchanged", by: "rule", against: "revision", regions: [], regionCount: 0 },
          svg: { run: 1, svg: "pictures/A.svg", regions: [], faithful: true, by: "rule", share: 0, ...svg },
        },
        filter: "all",
        place: { index: 0, total: 1, group: "look" },
        prev: null,
        next: null,
        files: { head: { src: "/h", size: [4, 4] }, capture: { src: "/c", size: [4, 4] } },
        maps: {},
        rules: { png: pngRule(null), svg: svgRule(null) },
        build: null,
        baseline: { hash: "a".repeat(40), short: "aaaaaaaa" },
      });
    const stays = page({ state: "unchanged", why: "its PNG is not written" });
    assert.match(stays, />Accept this SVG in place of the file's</);
    assert.doesNotMatch(stays, />No SVG</);
    assert.match(page({ state: "updated", why: null }), />No SVG</);
  });

  test("the SVG's pictures zoom on a click, each at its device size", () => {
    const html = detailHtml({
      p: {
        out: A,
        group: "look",
        png: null,
        svg: { run: 1, state: "unchanged", svg: "pictures/A.svg", regions: [], faithful: true, by: "rule", share: 0 },
      },
      filter: "all",
      place: { index: 0, total: 1, group: "look" },
      prev: null,
      next: null,
      files: { svgPng: { src: "/p", size: [380, 674] }, svg: { src: "/s", size: [380, 674] } },
      maps: { svg: "/m" },
      rules: { png: pngRule(null), svg: svgRule(null) },
      build: null,
      baseline: { hash: "a".repeat(40), short: "aaaaaaaa" },
    });
    // the three pictures in a group that zooms, its panel after it, closed, with its levels
    assert.match(html, /<div class="trio zoomable" data-zoom-w="380" data-zoom-h="674"/);
    assert.match(html, /<div class="zoom" hidden>/);
    for (const k of [2, 4, 8, 16]) assert.match(html, new RegExp(`data-zoom-level="${k}"`));
    // the page's script draws each picture at its device size, an SVG rasterised there
    assert.match(html, /drawImage\(img, 0, 0, w, h\)/);
  });

  test("a picture's page offers no replay without a bundle, and fetches itself again when the runs change", () => {
    const page = (bundled) =>
      detailHtml({
        p: { out: A, group: "look", png: null, svg: null },
        filter: "all",
        place: { index: 0, total: 1, group: "look" },
        prev: null,
        next: null,
        files: { head: { src: "/h", size: [4, 4] } },
        maps: {},
        rules: { png: pngRule(null), svg: svgRule(null) },
        build: null,
        baseline: { hash: "a".repeat(40), short: "aaaaaaaa" },
        bundled,
      });
    const replay = (html) => /<button[^>]*>Replay its SVG</.exec(html)[0];
    assert.match(replay(page(false)), / disabled title="the bundle cache has no bundle of this picture/);
    assert.doesNotMatch(replay(page(true)), /disabled/);
    assert.doesNotMatch(replay(page(null)), /disabled/);
    // an update that names no picture of the page but says the runs changed: the run buttons
    assert.match(page(true), /if \(me && !d\.runs && !\(d\.outs \|\| \[\]\)\.includes\(me\)\) return;/);
  });

  test("a strength map is drawn as changeMap draws the two pictures it was measured on", () => {
    const img = (shade) => {
      const rgba = new Uint8Array(30 * 20 * 4);
      for (let i = 0; i < 600; i++) rgba.set([i % 7 === 0 ? shade : 40, 60, 80, 255], i * 4);
      return decodePng(Buffer.from(encodePng({ width: 30, height: 20, rgba })));
    };
    const [a, b] = [img(40), img(200)];
    assert.deepEqual(Buffer.from(strengthPicture(strengthOf(a, b), b)), Buffer.from(changeMap(a, b)));
    assert.throws(() => strengthPicture(strengthOf(a, b), { ...b, width: 29 }), /30 x 20 px/);
  });

  test("a run's verdict as the review applied it takes each part the review applied", () => {
    const v = { png: { state: "updated" }, svg: { state: "new" } };
    assert.equal(appliedVerdict(v, null), v);
    assert.equal(appliedVerdict(null, { done: ["png"] }), null);
    assert.deepEqual(appliedVerdict(v, { done: ["png"], png: { state: "noise" }, svg: null }), {
      png: { state: "noise" },
      svg: { state: "new" },
    });
  });

  test("every picture of the table, with why one has no SVG from the newest verdict that says", () => {
    const shots = [
      { out: "IDE/Images/W.png", setup: "programs", once: true, window: true },
      { out: A, setup: "s", once: false, window: false },
      { out: B, setup: "s", once: false, window: false },
      { out: C, setup: "s", once: false, window: false },
      { out: E, setup: "s", once: false, window: false },
      { out: "IDE/Images/Gone.png", setup: "s", once: false, window: false },
    ];
    const files = new Set([
      "IDE/Images/W.png",
      A,
      "IDE/Images/A.light.png",
      "IDE/Images/A.svg",
      B,
      "IDE/Images/B.light.png",
      C,
      E,
      "IDE/Images/E.svg",
    ]);
    const refused = { state: "not written", faithful: false, share: 0.4 };
    const unjudged = { state: "unchanged", why: "its PNG is not written", faithful: null };
    const verdicts = {
      // the newest verdict says nothing, the one before it does
      "IDE/Images/A.light.png": [
        { svg: unjudged, where: { session: null, run: 3 } },
        { svg: refused, where: { session: "abc1234", run: 2 } },
      ],
      [B]: [{ svg: { state: "unchanged", faithful: true }, where: { session: null, run: 1 } }],
    };
    const { pictures, groups } = allPictures({
      shots,
      exists: (p) => files.has(p),
      entry: (out) => (out === E ? { build: 1034, svg: { bar: { levels: 96, share: 1 } } } : null),
      verdicts: (out) => verdicts[out] ?? [],
    });
    const at = (out) => pictures.find((p) => p.out === out);
    assert.deepEqual(
      groups.map((g) => [g.key, g.pictures.map((p) => p.out)]),
      [
        ["windows", ["IDE/Images/W.png"]],
        // by reason, then path: accepted, refused, unknown
        ["nosvg", ["IDE/Images/B.png", "IDE/Images/A.light.png", "IDE/Images/B.light.png", C]],
        ["missing", ["IDE/Images/Gone.png"]],
        ["overridden", [E]],
        ["uncaptured", []],
        ["svg", [A]],
      ],
    );
    assert.deepEqual(at("IDE/Images/A.light.png").reason, {
      why: "refused",
      text: "refused: 0.4% of its pixels strongly off its PNG",
      where: { session: "abc1234", run: 2 },
    });
    assert.equal(at(B).reason.why, "accepted");
    assert.match(at(B).reason.text, /^drawn and accepted, but not written: its PNG was not written$/);
    assert.deepEqual(at(C).reason, { why: "unknown", text: "no verdict of any session says why", where: null });
    assert.equal(at("IDE/Images/W.png").reason.why, "window");
    // a light picture not under docs is the dark one's pixels: the dark one is shown in both themes
    assert.equal(at(C).bothThemes, true);
    assert.equal(at(A).bothThemes, false);
    assert.equal(
      pictures.some((p) => p.out === "IDE/Images/C.light.png"),
      false,
    );
    assert.equal(at(E).build, 1034);
    assert.equal(noSvgReason(unjudged), null);
    assert.deepEqual(noSvgReason({ state: "not written", why: "its shot draws no SVG of it" }), {
      why: "none",
      text: "its shot draws no SVG of it",
    });
  });

  test("an image no shot takes is listed, unless a script makes it or it is the favicon", () => {
    const hand = ["Features/Hand.png", "Tutorials/Hand.webp"];
    const images = [
      A,
      "IDE/Images/A.light.png",
      "IDE/Images/A.svg",
      "IDE/Images/A.light.svg",
      ...hand,
      "Tutorials/Diagram.svg",
      "assets/images/gantt.svg",
      "assets/thumbnails/yt-x.jpg",
      "favicon.png",
    ];
    const files = new Set([...images, "Tutorials/Diagram.dot"]);
    const { pictures, groups } = allPictures({
      shots: [{ out: A, setup: "s", once: false, window: false }],
      exists: (p) => files.has(p),
      images,
    });
    assert.deepEqual(
      groups.find((g) => g.key === "uncaptured").pictures.map((p) => p.out),
      hand,
    );
    assert.deepEqual(
      pictures.filter((p) => p.uncaptured).map((p) => p.out),
      hand,
    );
    assert.deepEqual(
      pictures.find((p) => p.out === hand[1]),
      {
        out: hand[1],
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
      },
    );
    // one with an SVG of its own that no shot takes is listed as well, and neither is a diagram
    assert.deepEqual(
      allPictures({ shots: [], exists: () => false, images: ["Hand.svg"] }).pictures.map((p) => p.out),
      ["Hand.svg"],
    );
  });

  test("an image no shot takes can be looked at, and offers nothing a run would do", () => {
    const p = {
      out: "Features/Hand.webp",
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
    };
    const all = allHtml({
      groups: [{ key: "uncaptured", title: "No automated capture", pictures: [p] }],
      baseline: { short: "abc" },
    });
    assert.match(all, /No automated capture \(1\)/);
    assert.match(all, /no automated capture<\/span>/);
    assert.ok(all.includes(`src="${hrefs.docs(p.out)}"`));
    assert.doesNotMatch(all, /<input[^>]*data-pick/);
    const plain = plainHtml({
      p,
      place: { index: 0, total: 1 },
      files: { head: null, docs: { src: hrefs.docs(p.out), size: null }, svg: null },
      baseline: { short: "abc" },
    });
    assert.match(plain, /No tool takes this image/);
    assert.doesNotMatch(plain, /Retake|Replay|size unknown|HEAD \(abc\)/);
    assert.ok(plain.includes(`<img src="${hrefs.docs(p.out)}" alt="The file">`));
  });

  test("the page of every picture says why each has no SVG, offers their replay, and a picture's plain page its runs", () => {
    const p = {
      out: C,
      setup: "s",
      window: false,
      once: false,
      png: true,
      svg: false,
      bothThemes: true,
      build: null,
      reason: {
        why: "refused",
        text: "refused: 0.4% of its pixels strongly off its PNG",
        where: { session: "abc1234", run: 2 },
      },
      group: "nosvg",
    };
    const html = allHtml({
      groups: [{ key: "nosvg", title: "No SVG", pictures: [p] }],
      baseline: { short: "aaaaaaaa" },
      bundled: () => true,
    });
    assert.match(html, /<a href="\/all" aria-current="page">All pictures<\/a>/);
    assert.match(html, /no SVG: refused/);
    assert.match(html, /refused: 0\.4% of its pixels strongly off its PNG \(run 2 of session abc1234\)/);
    assert.match(html, /one picture for both themes/);
    assert.match(html, /build unknown/);
    const replay = /data-act="([^"]*)"[^>]*>Judge their SVGs again from their bundles \(1\)/.exec(html);
    assert.deepEqual(JSON.parse(replay[1].replace(/&quot;/g, '"')), { kind: "replay", pictures: [C], recheck: true });
    assert.deepEqual(runOf({ kind: "replay", pictures: [C], recheck: true }, { hash: "a".repeat(40) }), {
      tool: "replay",
      args: ["--only", onlyOf([C]), "--recheck", "--against", "a".repeat(40)],
    });
    // with no bundle, no replay, and the card says so
    const none = allHtml({
      groups: [{ key: "nosvg", title: "No SVG", pictures: [p] }],
      baseline: { short: "aaaaaaaa" },
      bundled: () => false,
    });
    assert.doesNotMatch(none, /Judge their SVGs again/);
    assert.match(none, /no bundle/);
    const plain = plainHtml({
      p,
      place: { index: 0, total: 1 },
      prev: null,
      next: null,
      files: { head: null, docs: { src: hrefs.docs(C), size: [80, 60] }, svg: null },
      baseline: { short: "aaaaaaaa" },
      bundled: true,
    });
    assert.match(plain, /<body data-out="IDE\/Images\/C\.png">/);
    assert.match(plain, />Retake this picture</);
    assert.match(plain, />Replay its SVG</);
    assert.match(plain, /1 of 1 · All pictures/);
    // a program's window offers a retake only
    const windowPage = plainHtml({
      p: { ...p, window: true, reason: { why: "window", text: "a window", where: null } },
      place: { index: 0, total: 1 },
      prev: null,
      next: null,
      files: { head: null, docs: null, svg: null },
      baseline: { short: "aaaaaaaa" },
    });
    assert.doesNotMatch(windowPage, />Replay its SVG</);
  });
});

describe("the screenshot review's writes under docs (shot-verdicts.mjs)", () => {
  const A = "IDE/Images/A.png";
  // A grey picture 40 x 30, with a bright block when `block`.
  const grey = (block) => {
    const rgba = new Uint8Array(40 * 30 * 4);
    for (let i = 0; i < 1200; i++) {
      const [x, y] = [i % 40, Math.floor(i / 40)];
      const s = block && x >= 10 && x < 30 && y >= 8 && y < 22 ? 250 : 40;
      rgba.set([s, s, s, 255], i * 4);
    }
    return Buffer.from(encodePng({ width: 40, height: 30, rgba }));
  };
  const OLD = grey(false);
  const NEW = grey(true);
  const QUIET = { width: 40, height: 30, data: new Uint8Array(1200) };

  test("a verdict read while the run writes it is not applied, and is applied when called again", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-verdicts-read-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const docs = path.join(root, "docs");
    fs.mkdirSync(path.join(docs, "IDE", "Images"), { recursive: true });
    fs.writeFileSync(path.join(docs, A), OLD);
    const base = "a".repeat(40);
    const session = openSession(root, () => ({ hash: base, short: "aaaaaaaa", build: 1010 }));
    const revision = { hash: base, short: "aaaaaaaa", bytes: () => OLD, read: () => new Map() };
    const applier = createApplier({
      session,
      docsRoot: docs,
      bundlesRoot: null,
      revision: () => revision,
      manifest: () => openManifest(path.join(root, "manifest.json")),
    });
    session.addRun({ tool: "shoot_docs", args: ["--against", base] });
    const stage = runPaths(root, 1).stage;
    const fate = {
      state: "updated",
      write: NEW,
      against: "revision",
      size: { w: 40, h: 30 },
      dark: null,
      by: "rule",
      earlier: null,
    };
    writeVerdict(
      stage,
      A,
      "png",
      pngVerdict({ decision: fate, review: null, build: 1501, staged: stageCapture(stage, A, NEW, null) }),
    );
    // the file as a reader met it while the run wrote it in place: empty
    const file = stagedFiles(stage, A).verdict;
    const whole = fs.readFileSync(file);
    fs.writeFileSync(file, "");
    assert.equal(applier.arrive(1, A, "png"), false);
    assert.match(applier.errors.get(A), /run 1's verdict could not be read/);
    assert.deepEqual(fs.readFileSync(path.join(docs, A)), OLD);
    fs.writeFileSync(file, whole);
    assert.equal(applier.arrive(1, A, "png"), true);
    assert.equal(applier.errors.has(A), false);
    assert.deepEqual(fs.readFileSync(path.join(docs, A)), NEW);
    // a staged file is renamed into place: no temporary file is left beside it
    assert.deepEqual(
      fs.readdirSync(path.dirname(file)).filter((f) => f.endsWith(".tmp")),
      [],
    );
  });

  test("an SVG a run found the same picture as the baseline's goes back to its bytes, one the same as the file's stays, while that still holds", (t) => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "shot-verdicts-same-"));
    t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
    const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: ["ignore", "pipe", "ignore"] }).toString();
    try {
      git("init", "-q");
    } catch {
      t.skip("no git");
      return;
    }
    for (const [k, v] of [
      ["core.autocrlf", "false"],
      ["user.name", "t"],
      ["user.email", "t@t"],
      ["commit.gpgsign", "false"],
    ])
      git("config", k, v);
    const docs = path.join(repo, "docs");
    const SVG = A.replace(/\.png$/, ".svg");
    const at = (out) => path.join(docs, out);
    fs.mkdirSync(path.dirname(at(A)), { recursive: true });
    fs.writeFileSync(at(A), OLD);
    fs.writeFileSync(at(SVG), "<svg>baseline</svg>");
    git("add", ".");
    git("commit", "-q", "-m", "x");
    // a terminal rewrote the SVG in bytes no one sees
    fs.writeFileSync(at(SVG), "<svg>same picture, other bytes</svg>");
    const revision = openRevision(docs, "HEAD");
    const session = openSession(path.join(repo, ".review"), () => ({
      hash: revision.hash,
      short: revision.short,
      build: 1010,
    }));
    const applier = createApplier({
      session,
      docsRoot: docs,
      bundlesRoot: null,
      revision: () => revision,
      manifest: () => openManifest(path.join(repo, "manifest.json")),
    });
    const replayOf = (same) => {
      const n = session.addRun({ tool: "replay", args: [] }).n;
      writeVerdict(runPaths(session.root, n).stage, A, "svg", svgVerdict({ state: "restored", why: "the same", same }));
      return n;
    };
    // as the file is: it stays
    const kept = replayOf({ as: "file", file: hashOf("<svg>same picture, other bytes</svg>") });
    assert.equal(applier.arrive(kept, A, "svg"), true);
    assert.equal(applier.reviewed(kept, A).svg.state, "unchanged");
    assert.equal(fs.readFileSync(at(SVG), "utf8"), "<svg>same picture, other bytes</svg>");
    // the same picture as another baseline's: not applied, and it says why
    const elsewhere = replayOf({ as: "baseline", baseline: "f".repeat(40) });
    assert.equal(applier.arrive(elsewhere, A, "svg"), true);
    assert.deepEqual(
      [applier.reviewed(elsewhere, A).svg.state, fs.readFileSync(at(SVG), "utf8")],
      ["unchanged", "<svg>same picture, other bytes</svg>"],
    );
    assert.match(applier.reviewed(elsewhere, A).svg.why, /draw it again/);
    // the same picture as this baseline's: its bytes go back, and the session wrote the file
    const back = replayOf({ as: "baseline", baseline: revision.hash });
    assert.equal(applier.arrive(back, A, "svg"), true);
    assert.equal(applier.reviewed(back, A).svg.state, "restored");
    assert.equal(fs.readFileSync(at(SVG), "utf8"), "<svg>baseline</svg>");
    assert.deepEqual(wroteOf(applier.reviewed(back, A)), { png: false, svg: true });
    assert.equal(git("status", "--porcelain", "--", "docs"), "");
  });

  test("puts back a picture changed outside the runs, and judges the run that found the change again, against the baseline", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-verdicts-putback-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const docs = path.join(root, "docs");
    const at = (out) => path.join(docs, out);
    const SVG = A.replace(/\.png$/, ".svg");
    fs.mkdirSync(path.dirname(at(A)), { recursive: true });
    // a run from a terminal left NEW and an SVG; the baseline has OLD and no SVG
    fs.writeFileSync(at(A), NEW);
    fs.writeFileSync(at(SVG), "<svg>from a terminal</svg>");
    const base = "a".repeat(40);
    const session = openSession(root, () => ({ hash: base, short: "aaaaaaaa", build: 1010 }));
    const revision = {
      hash: base,
      short: "aaaaaaaa",
      bytes: (out) => (out === A ? OLD : null),
      read: (outs) => new Map(outs.map((out) => [out, out === A ? OLD : null])),
    };
    const applier = createApplier({
      session,
      docsRoot: docs,
      bundlesRoot: null,
      revision: () => revision,
      manifest: () => openManifest(path.join(root, "manifest.json")),
    });
    session.addRun({ tool: "shoot_docs", args: ["--against", base] });
    const stage = runPaths(root, 1).stage;
    // the session's run captures NEW: the file is the capture, so it stays
    const fate = {
      state: "unchanged",
      write: null,
      against: "disk",
      size: { w: 40, h: 30 },
      dark: null,
      by: "rule",
      earlier: null,
    };
    writeVerdict(
      stage,
      A,
      "png",
      pngVerdict({ decision: fate, review: null, build: 1501, staged: stageCapture(stage, A, NEW, QUIET) }),
    );
    assert.equal(applier.arrive(1, A, "png"), true);
    assert.equal(applier.reviewed(1, A).png.state, "unchanged");
    assert.deepEqual(wroteOf(applier.reviewed(1, A)), { png: false, svg: false });

    applier.putBack(A, ["png", "svg"]);
    assert.equal(applier.errors.has(A), false);
    // the run found the baseline's picture, and its capture is now a change it wrote
    assert.deepEqual(applier.heldPng(1, A), OLD);
    assert.equal(applier.reviewed(1, A).png.state, "updated");
    assert.deepEqual(wroteOf(applier.reviewed(1, A)), { png: true, svg: true });
    assert.deepEqual(fs.readFileSync(at(A)), NEW);
    // the baseline has no SVG: the one from the terminal is gone
    assert.equal(fs.existsSync(at(SVG)), false);
  });

  test("undoes a run: each picture it changed put back, a later run's layer judged again on it, and its number not given again", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-verdicts-undo-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const docs = path.join(root, "docs");
    const B = "IDE/Images/B.png";
    const at = (out) => path.join(docs, out);
    fs.mkdirSync(path.dirname(at(A)), { recursive: true });
    fs.writeFileSync(at(A), OLD);
    fs.writeFileSync(at(B), OLD);
    // a third picture, unlike both
    const rgba = new Uint8Array(1200 * 4).fill(200);
    const OTHER = Buffer.from(encodePng({ width: 40, height: 30, rgba }));
    const base = "a".repeat(40);
    const session = openSession(root, () => ({ hash: base, short: "aaaaaaaa", build: 1010 }));
    const revision = { hash: base, short: "aaaaaaaa", bytes: () => OLD, read: () => new Map() };
    const applier = createApplier({
      session,
      docsRoot: docs,
      bundlesRoot: null,
      revision: () => revision,
      manifest: () => openManifest(path.join(root, "manifest.json")),
    });
    const take = (n, out, png) => {
      const stage = runPaths(root, n).stage;
      const fate = {
        state: "updated",
        write: png,
        against: "revision",
        size: { w: 40, h: 30 },
        dark: null,
        by: "rule",
        earlier: null,
      };
      writeVerdict(
        stage,
        out,
        "png",
        pngVerdict({ decision: fate, review: null, build: 1501, staged: stageCapture(stage, out, png, null) }),
      );
      assert.equal(applier.arrive(n, out, "png"), true);
    };
    // run 1 changes A and B; run 2 takes A again
    session.addRun({ tool: "shoot_docs", args: ["--against", base] });
    take(1, A, NEW);
    take(1, B, NEW);
    session.addRun({ tool: "shoot_docs", args: ["--against", base] });
    take(2, A, OTHER);
    assert.deepEqual([fs.readFileSync(at(A)), fs.readFileSync(at(B))], [OTHER, NEW]);
    assert.deepEqual(applier.heldPng(2, A), NEW);

    const { outs, later, failed } = applier.undo(1);
    assert.deepEqual([outs, later, failed.size], [[A, B], [A], 0]);
    // B as it was before run 1; A run 2's capture, judged again against what it now finds
    assert.deepEqual([fs.readFileSync(at(A)), fs.readFileSync(at(B))], [OTHER, OLD]);
    assert.deepEqual(applier.heldPng(2, A), OLD);
    assert.equal(applier.reviewed(2, A).png.state, "updated");

    assert.equal(session.removeRun(1), true);
    assert.equal(fs.existsSync(runPaths(root, 1).dir), false);
    assert.deepEqual(
      session.data.runs.map((r) => r.n),
      [2],
    );
    assert.deepEqual(
      session.data.removed.map((r) => r.n),
      [1],
    );
    // a removed run's number is not given again
    assert.equal(session.addRun({ tool: "shoot_docs", args: [] }).n, 3);
    session.removeRun(3);
    assert.equal(session.addRun({ tool: "shoot_docs", args: [] }).n, 4);
    assert.throws(() => session.removeRun(1), /no run 1/);
  });

  test("applies a run's verdicts as they arrive, judges them again after a review, and drops a replay's SVG of another PNG", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-verdicts-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const docs = path.join(root, "docs");
    const bundles = path.join(root, "bundles");
    const manifestFile = path.join(root, "manifest.json");
    const at = (out) => path.join(docs, out);
    fs.mkdirSync(path.dirname(at(A)), { recursive: true });
    fs.writeFileSync(at(A), OLD);
    fs.writeFileSync(at("IDE/Images/A.svg"), "<svg>old</svg>");
    const m0 = openManifest(manifestFile);
    m0.setBuild(A, 1010);
    m0.save();
    const base = "a".repeat(40);
    const session = openSession(root, () => ({ hash: base, short: "aaaaaaaa", build: 1010 }));
    const revision = { hash: base, short: "aaaaaaaa", bytes: (out) => (out === A ? OLD : null), read: () => new Map() };
    const applier = createApplier({
      session,
      docsRoot: docs,
      bundlesRoot: bundles,
      revision: () => revision,
      manifest: () => openManifest(manifestFile),
      // the cache's bundles, not drawable, taken as able to draw the picture again
      staleOf: () => null,
    });

    // run 1, a retake: the capture differs from the file, and its SVG is faithful
    const run1 = session.addRun({ tool: "shoot_docs", args: ["--svg", "--against", base] });
    assert.equal(againstOf(run1), base);
    const stage1 = runPaths(root, 1).stage;
    const fate = {
      state: "updated",
      write: NEW,
      against: "disk",
      size: { w: 40, h: 30 },
      dark: null,
      by: "rule",
      earlier: null,
    };
    writeVerdict(
      stage1,
      A,
      "png",
      pngVerdict({ decision: fate, review: null, build: 1501, staged: stageCapture(stage1, A, NEW, null) }),
    );
    const judged = { faithful: true, by: "rule", share: 0, earlier: null };
    writeVerdict(
      stage1,
      A,
      "svg",
      svgVerdict({
        state: "updated",
        verdict: judged,
        measures: "0% off",
        staged: stageSvg(stage1, A, "<svg>new</svg>", QUIET),
      }),
    );
    writeBundle(path.join(stage1, "bundles"), A, { v: 1 }, NEW, []);
    assert.equal(applier.arrive(1, A, "png"), true);
    assert.equal(applier.arrive(1, A, "png"), false);
    assert.ok(fs.readFileSync(at(A)).equals(NEW));
    assert.equal(openManifest(manifestFile).entry(A).build, 1501);
    assert.equal(applier.arrive(1, A, "svg"), true);
    assert.equal(fs.readFileSync(at("IDE/Images/A.svg"), "utf8"), "<svg>new</svg>");
    assert.equal(readBundle(bundles, A).png, pngHash(NEW));
    assert.deepEqual(readReviewed(stage1, A).done, ["png", "svg"]);
    assert.equal(readReviewed(stage1, A).png.baseline, base);

    // a review keeps the old picture: it and its SVG go back, and so does the build
    const m = openManifest(manifestFile);
    m.setPart(A, "png", "decision", { keep: "old", capture: hashOf(NEW) });
    m.save();
    applier.rejudge(A, 1);
    assert.equal(applier.errors.size, 0);
    assert.ok(fs.readFileSync(at(A)).equals(OLD));
    assert.equal(fs.readFileSync(at("IDE/Images/A.svg"), "utf8"), "<svg>old</svg>");
    assert.equal(openManifest(manifestFile).entry(A).build, 1010);
    assert.equal(readBundle(bundles, A), null);
    const kept = applier.reviewed(1, A);
    assert.deepEqual(
      [kept.png.state, kept.png.by, kept.svg.state, kept.svg.why],
      ["noise", "decision", "unchanged", "its PNG is not written"],
    );

    // accepts the run's SVG though the PNG stays: it takes the file's SVG's place, its bundle
    // naming the PNG the file holds
    const ma = openManifest(manifestFile);
    ma.setPart(A, "svg", "decision", { accept: true, svg: hashOf("<svg>new</svg>"), png: hashOf(NEW) });
    ma.save();
    applier.rejudge(A, 1);
    assert.equal(applier.errors.size, 0);
    assert.ok(fs.readFileSync(at(A)).equals(OLD));
    assert.equal(fs.readFileSync(at("IDE/Images/A.svg"), "utf8"), "<svg>new</svg>");
    assert.deepEqual([applier.reviewed(1, A).svg.state, applier.reviewed(1, A).svg.by], ["updated", "decision"]);
    assert.equal(readBundle(bundles, A).png, pngHash(OLD));

    // then takes the new capture, and refuses its SVG
    const m2 = openManifest(manifestFile);
    m2.setPart(A, "png", "decision", { keep: "new", capture: hashOf(NEW) });
    m2.setPart(A, "svg", "decision", { accept: false, svg: hashOf("<svg>new</svg>"), png: hashOf(NEW) });
    m2.save();
    applier.rejudge(A, 1);
    assert.ok(fs.readFileSync(at(A)).equals(NEW));
    assert.equal(fs.existsSync(at("IDE/Images/A.svg")), false);
    assert.deepEqual([applier.reviewed(1, A).svg.state, applier.reviewed(1, A).svg.by], ["removed", "decision"]);

    // run 2, a replay, draws an SVG of the new PNG; a review then keeps the old picture, and
    // the replay's SVG, of a PNG no longer the file's, is dropped
    session.addRun({ tool: "replay", args: [] });
    const stage2 = runPaths(root, 2).stage;
    writeVerdict(
      stage2,
      A,
      "svg",
      svgVerdict({
        state: "new",
        verdict: judged,
        measures: "0% off",
        staged: stageSvg(stage2, A, "<svg>replayed</svg>", QUIET),
      }),
    );
    // the review refused another SVG: this one is judged by the bar
    assert.equal(applier.pending(), 1);
    assert.equal(fs.readFileSync(at("IDE/Images/A.svg"), "utf8"), "<svg>replayed</svg>");
    assert.equal(applier.reviewed(2, A).svg.earlier, false);
    const m3 = openManifest(manifestFile);
    m3.setPart(A, "png", "decision", { keep: "old", capture: hashOf(NEW) });
    m3.save();
    applier.rejudge(A, 1);
    assert.ok(fs.readFileSync(at(A)).equals(OLD));
    assert.equal(fs.readFileSync(at("IDE/Images/A.svg"), "utf8"), "<svg>old</svg>");
    assert.deepEqual([applier.reviewed(2, A).svg, applier.reviewed(2, A).done], [null, ["svg"]]);
    assert.equal(readReviewed(stage2, A).svg, null);
  });

  test("caches the bundle of an SVG that stays with its PNG only when it is the file's SVG, writes the SVG when the cache's bundle is stale, and puts both back when a run is undone", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-verdicts-bundle-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const docs = path.join(root, "docs");
    const bundles = path.join(root, "bundles");
    const at = (out) => path.join(docs, out);
    fs.mkdirSync(path.dirname(at(A)), { recursive: true });
    fs.writeFileSync(at(A), OLD);
    fs.writeFileSync(at("IDE/Images/A.svg"), "<svg>same</svg>\r\n");
    // the cache's bundle, taken before the converter asked what the run's bundle answers
    writeBundle(bundles, A, { v: 0 }, OLD, []);
    const base = "a".repeat(40);
    const session = openSession(root, () => ({ hash: base, short: "aaaaaaaa", build: 1010 }));
    const revision = { hash: base, short: "aaaaaaaa", bytes: () => OLD, read: () => new Map() };
    // whether the cache's bundle can draw the picture again (staleBundle), as the test says
    let stale = null;
    const applier = createApplier({
      session,
      docsRoot: docs,
      bundlesRoot: bundles,
      revision: () => revision,
      manifest: () => openManifest(path.join(root, "manifest.json")),
      staleOf: () => stale,
    });
    const svgFile = () => fs.readFileSync(at("IDE/Images/A.svg"), "utf8");
    // a retake whose capture is the file's PNG, its SVG `svg`, its bundle { v: n }
    const retake = (n, svg) => {
      session.addRun({ tool: "shoot_docs", args: ["--svg", "--against", base] });
      const stage = runPaths(root, n).stage;
      const fate = {
        state: "unchanged",
        write: null,
        against: "revision",
        size: { w: 40, h: 30 },
        dark: null,
        by: "rule",
        earlier: null,
      };
      writeVerdict(
        stage,
        A,
        "png",
        pngVerdict({ decision: fate, review: null, build: 1501, staged: stageCapture(stage, A, OLD, null) }),
      );
      writeVerdict(
        stage,
        A,
        "svg",
        svgVerdict({
          state: "unchanged",
          why: "its PNG is not written",
          verdict: { faithful: true, by: "rule", share: 0, earlier: null },
          measures: "0% off",
          staged: stageSvg(stage, A, svg, QUIET),
        }),
      );
      writeBundle(path.join(stage, "bundles"), A, { v: n }, OLD, []);
      assert.equal(applier.arrive(n, A, "png"), true);
      assert.equal(applier.arrive(n, A, "svg"), true);
      assert.equal(applier.errors.size, 0);
    };

    // the same SVG: the run's bundle takes the old one's place, naming the file's PNG
    retake(1, "<svg>same</svg>\n");
    assert.equal(applier.reviewed(1, A).svg.why, "its PNG is not written");
    assert.equal(svgFile(), "<svg>same</svg>\r\n");
    assert.deepEqual([readBundle(bundles, A).v, readBundle(bundles, A).png], [1, pngHash(OLD)]);
    // another SVG: the cache keeps the bundle the file's SVG was drawn from
    retake(2, "<svg>other</svg>\n");
    assert.equal(svgFile(), "<svg>same</svg>\r\n");
    assert.equal(readBundle(bundles, A).v, 1);
    // undoing run 1 puts the cache's bundle back as run 1 found it
    applier.undo(1);
    assert.equal(applier.errors.size, 0);
    assert.equal(readBundle(bundles, A).v, 0);

    // the cache's bundle cannot draw the picture again: the run's SVG is written though its PNG
    // stays, and its bundle cached naming the file's PNG
    stale = { retake: "the bundle is of format 2, the converter reads 3" };
    retake(3, "<svg>newer</svg>\n");
    assert.deepEqual([applier.reviewed(3, A).svg.state, svgFile()], ["updated", "<svg>newer</svg>\n"]);
    assert.deepEqual([readBundle(bundles, A).v, readBundle(bundles, A).png], [3, pngHash(OLD)]);
    // and undoing it puts the file's SVG and the cache's bundle back
    stale = null;
    applier.undo(3);
    assert.equal(applier.errors.size, 0);
    assert.deepEqual([svgFile(), readBundle(bundles, A).v], ["<svg>same</svg>\r\n", 0]);
  });
});

describe("the screenshot review's server (shot-server.mjs)", () => {
  const A = "IDE/Images/A.png";
  const B = "IDE/Images/B.light.png";
  // A flat grey picture 40 x 30, with a bright block in it when `block`: the capture of A,
  // against HEAD's without it. The stand-in run below has its own copy, from its source.
  const flat = (block) => {
    const rgba = new Uint8Array(40 * 30 * 4);
    for (let i = 0; i < 1200; i++) {
      const [x, y] = [i % 40, Math.floor(i / 40)];
      const s = block && x >= 10 && x < 30 && y >= 8 && y < 22 ? 250 : 40;
      rgba.set([s, s, s, 255], i * 4);
    }
    return Buffer.from(encodePng({ width: 40, height: 30, rgba }));
  };
  const lib = (name) => JSON.stringify(pathToFileURL(path.join(REPO_ROOT, "scripts", "lib", name)).href);
  // A run as shoot_docs.mjs --stage --events makes one: A taken and its SVG accepted, then a
  // wait for the stop line, after which B is not taken.
  const FAKE = `import { onStop, writeRecord } from ${lib("record-lines.mjs")};
import { pngVerdict, stageCapture, stageSvg, svgVerdict, writeVerdict } from ${lib("shot-stage.mjs")};
import { reviewPicture, reviewSvg } from ${lib("shot-queue.mjs")};
import { encodePng } from ${lib("png.mjs")};
const flat = ${flat.toString()};
const args = process.argv.slice(2);
const stage = args[args.indexOf("--stage") + 1];
if (!args.includes("--only") || !args.includes("--events")) process.exit(2);
const ev = (type, v = {}) => writeRecord("shot-event", { type, ...v });
const [A, B] = ${JSON.stringify([A, B])};
ev("run", { tool: "shoot_docs", svg: true, jobs: [{ name: "j", setup: "s", pictures: [A, B] }] });
ev("job", { job: "j", state: "started" });
console.log("taking " + A);
const cap = flat(true);
const fate = { state: "updated", write: cap, against: "revision", size: { w: 40, h: 30 }, dark: null, by: "rule", earlier: null };
const review = reviewPicture(fate, cap, flat(false), null);
const part = pngVerdict({ decision: fate, review, build: 1501, staged: stageCapture(stage, A, cap, review.strength) });
writeVerdict(stage, A, "png", part);
ev("picture", { job: "j", out: A, ...part });
const strength = { width: 40, height: 30, data: new Uint8Array(1200) };
const judged = { faithful: true, by: "rule", share: 0, earlier: null };
const svg = svgVerdict({ state: "new", verdict: judged, review: reviewSvg(judged, strength), stats: { pct8: 0, pct32: 0, pct96: 0 }, measures: "0% off", staged: stageSvg(stage, A, "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='15'/>", strength) });
writeVerdict(stage, A, "svg", svg);
ev("svg", { job: "j", out: A, ...svg });
onStop(process.stdin, () => {
  ev("stopping");
  ev("skipped", { job: "j", out: B });
  ev("job", { job: "j", state: "done" });
  ev("summary", { stopped: true, exit: 0 });
  process.exit(0);
});
`;

  // A revision as openRevision gives one, of the commit "<c>" repeated, holding `files`.
  const stubRevision = (c, files) => ({
    hash: c.repeat(40),
    short: c.repeat(8),
    bytes: (out) => files[out] ?? null,
    read: (outs) => new Map(outs.map((out) => [out, files[out] ?? null])),
  });

  const until = async (what, ok) => {
    for (const t0 = Date.now(); !ok(); ) {
      if (Date.now() - t0 > 15000) assert.fail(`timed out waiting for ${what}`);
      await new Promise((r) => setTimeout(r, 20));
    }
  };

  test("runs a browser retake, and its page says what to do in the browser", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-"));
    const docs = path.join(root, "docs");
    fs.mkdirSync(docs);
    const script = path.join(root, "fake-take.mjs");
    const OUT = "Documentation/Images/run-workflow.png";
    const record = (value) => `console.log(${JSON.stringify(`@@shot-event ${JSON.stringify(value)}`)});`;
    fs.writeFileSync(
      script,
      [
        `import { writeFileSync } from "node:fs";`,
        `writeFileSync(${JSON.stringify(path.join(root, "args.json"))}, JSON.stringify(process.argv.slice(2)));`,
        record({
          type: "run",
          svg: true,
          build: null,
          captures: "D:/captures",
          extension: { folder: "D:/ext", step: "press reload on svgshot" },
          jobs: [{ name: "run-workflow", setup: "browser", pictures: [OUT] }],
        }),
        record({ type: "job", job: "run-workflow", state: "started" }),
        record({
          type: "await",
          job: "run-workflow",
          out: OUT,
          url: "https://example.com/page",
          shows: "Press <Run>.",
        }),
        record({ type: "refused", job: "run-workflow", out: OUT, error: "it has no marks" }),
        // A person's take takes a while: until the tool stops it.
        `process.stdin.on("data", () => process.exit(0)); setTimeout(() => {}, 60000);`,
      ].join("\n"),
    );
    const revision = stubRevision("a", {});
    const app = createReviewServer({
      session: openSession(root, () => ({ hash: revision.hash, short: revision.short, build: 1500 })),
      revision,
      manifest: () => openManifest(path.join(root, "manifest.json")),
      docsRoot: docs,
      command: { script },
      browser: { captures: "D:/captures", noOpen: true },
    });
    try {
      const base = `http://127.0.0.1:${await app.listen(0)}`;
      // The retake button of the picture's page: a retake, of a picture a browser takes.
      const started = await fetch(base + hrefs.startRun, {
        method: "POST",
        headers: { origin: base, "content-type": "application/json" },
        body: JSON.stringify({ kind: "retake", pictures: [OUT] }),
      });
      assert.equal(started.status, 200, await started.clone().text());
      const page = async () => (await fetch(base + hrefs.runs)).text();
      const until = async (pattern) => {
        for (let k = 0; k < 100; k++) {
          const text = await page();
          if (pattern.test(text)) return text;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error(`the runs page never said ${pattern}`);
      };
      const text = await until(/Its last capture was refused: it has no marks/);
      assert.match(text, /Run 1: Browser retake, running/);
      assert.match(text, /Take <code>run-workflow<\/code> in the browser/);
      assert.match(text, /Press &lt;Run&gt;\./);
      assert.match(text, /href="https:\/\/example\.com\/page"/);
      assert.match(text, /press reload on svgshot/);
      assert.match(text, /D:\/captures/);
      const args = JSON.parse(fs.readFileSync(path.join(root, "args.json"), "utf8"));
      assert.equal(args[0], "--take");
      assert.ok(args.includes("--no-open") && args.includes("D:/captures") && args.includes("--events"));
      // Stopping it leaves no instruction behind.
      await Promise.all(app.live().map((h) => (h.stop(), h.exited)));
      const ended = await until(/Run 1: Browser retake, (?:stopped|ended)/);
      assert.doesNotMatch(ended, /in the browser<\/h4>/);
    } finally {
      for (const h of app.live()) h.kill();
      await app.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("follows a run as it reports, serves its pages and files to the loopback host only, and reads the run back", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-"));
    const docs = path.join(root, "docs");
    fs.mkdirSync(docs);
    const script = path.join(root, "fake-run.mjs");
    fs.writeFileSync(script, FAKE);
    const head = flat(false);
    const revision = stubRevision("a", { [A]: head });
    const manifestFile = path.join(root, "manifest.json");
    const make = (more = {}) =>
      createReviewServer({
        session: openSession(root, () => ({ hash: revision.hash, short: revision.short, build: 1500 })),
        revision,
        manifest: () => openManifest(manifestFile),
        docsRoot: docs,
        command: { script },
        ...more,
      });
    const app = make();
    let app2 = null;
    try {
      const port = await app.listen(0);
      const base = `http://127.0.0.1:${port}`;
      const get = async (p) => {
        const res = await fetch(base + p);
        return {
          status: res.status,
          type: res.headers.get("content-type"),
          body: Buffer.from(await res.arrayBuffer()),
        };
      };
      const events = [];
      const stream = await fetch(`${base}/events`);
      const reader = stream.body.getReader();
      (async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          events.push(Buffer.from(value).toString());
        }
      })().catch(() => {});

      const handle = app.start({ tool: "shoot_docs", args: ["--only", "A|B"] });
      const pic = (out) => app.model().pictures.find((p) => p.out === out);
      await until("A's SVG verdict", () => pic(A)?.svg);
      assert.equal(pic(A).group, "look");
      assert.equal(pic(A).png.look.why, "small");
      assert.equal(pic(B).group, "progress");
      const removeLive = await fetch(base + hrefs.runAct(1), {
        method: "POST",
        headers: { origin: base, "content-type": "application/json" },
        body: JSON.stringify({ action: "remove" }),
      });
      assert.deepEqual(
        [removeLive.status, (await removeLive.json()).error],
        [400, "run 1 is running: stop it first, then remove it"],
      );

      const overview = await get("/");
      assert.equal(overview.status, 200);
      const html = overview.body.toString();
      assert.match(html, /In progress \(1\)/);
      assert.match(html, /Needs a look \(1\)/);
      // each group selects its pictures, or none (the page's script keeps its mixed state)
      assert.match(
        html,
        /<input type="checkbox" data-pick-group="look" aria-label="Select every picture in Needs a look/,
      );
      assert.match(html, /<div class="cards" data-group="look">/);
      assert.match(html, /g\.indeterminate = n > 0 && n < outs\.length;/);
      // a page fetches itself once in 400 ms while updates keep coming, not put off by each
      assert.match(html, /timer \?\?= setTimeout\(fetchNow, 400\);/);
      assert.doesNotMatch(html, /clearTimeout\(timer\)/);
      assert.match(html, /Resume at 1 of 1/);
      assert.match(html, /<code>node scripts\/shoot_docs\.mjs --only &quot;A\|B&quot;<\/code>/);
      const detail = await get(`/picture/${A}?filter=look`);
      assert.equal(detail.status, 200);
      assert.match(detail.body.toString(), /<body data-out="IDE\/Images\/A\.png">/);
      assert.match(detail.body.toString(), /1 of 1 · Needs a look/);
      assert.equal(app.model().pictures.length, 2);
      const capture = await get(hrefs.run(1, pic(A).png.capture));
      assert.deepEqual([capture.status, capture.type], [200, "image/png"]);
      assert.deepEqual(decodePng(capture.body).width, 40);
      assert.deepEqual((await get(hrefs.reference(1, A))).body, head);
      assert.deepEqual((await get(hrefs.head(A))).body, head);
      // a file the browser holds is not sent again
      const tagged = await fetch(base + hrefs.head(A));
      const etag = tagged.headers.get("etag");
      await tagged.arrayBuffer();
      assert.match(etag, /^"[0-9a-f]{40}"$/);
      const held = await fetch(base + hrefs.head(A), { headers: { "if-none-match": etag } });
      assert.deepEqual([held.status, (await held.arrayBuffer()).byteLength], [304, 0]);
      const other = await fetch(base + hrefs.head(A), { headers: { "if-none-match": '"0"' } });
      assert.deepEqual([other.status, Buffer.from(await other.arrayBuffer())], [200, head]);
      // the pages' one event stream is held by the page that holds the lock
      assert.match(html, /navigator\.locks\.request\("shot-review-events"/);
      const map = await get(hrefs.map(1, "png", A));
      assert.deepEqual([map.status, decodePng(map.body).height], [200, 30]);
      assert.equal((await get(hrefs.map(1, "svg", A))).status, 200);
      assert.equal((await get(hrefs.run(1, pic(A).svg.svg))).type, "image/svg+xml");
      assert.equal((await get("/file/run/1/%2E%2E/%2E%2E/session.json")).status, 404);
      assert.equal((await get("/picture/IDE/Images/Nothing.png")).status, 404);
      assert.equal((await get("/file/docs/x.txt")).status, 404);
      const forged = await new Promise((resolve, reject) => {
        import("node:http").then(({ request }) =>
          request({ port, path: "/", headers: { host: `docs.example:${port}` } }, (res) => {
            res.resume();
            resolve(res.statusCode);
          })
            .on("error", reject)
            .end(),
        );
      });
      assert.equal(forged, 403);

      handle.stop();
      assert.equal(await handle.exited, 0);
      await until("the run's end", () => !app.live().length);
      assert.equal(pic(B).group, "failed");
      assert.equal(pic(B).skipped, 1);
      assert.match(events.join(""), /event: update\ndata: \{"outs":\["IDE\/Images\/A\.png"\]\}/);
      const files = runPaths(root, 1);
      assert.match(fs.readFileSync(files.log, "utf8"), /^taking IDE\/Images\/A\.png$/m);
      assert.equal(readEvents(files.events).at(-1).type, "summary");
      const state = JSON.parse((await get("/api/state")).body);
      assert.deepEqual(
        [state.runs[0].stopped, state.runs[0].exit, state.runs[0].done, state.runs[0].listed],
        [true, 0, 2, 2],
      );

      // The session opened again: its run read back from the stage and the events.
      // B's capture failed, as shoot_docs.mjs stages that: a verdict with no regions
      await app.close();
      writeVerdict(runPaths(root, 1).stage, B, "png", { state: "failed", error: "boom" });
      app2 = make();
      const again = app2.model().pictures;
      assert.deepEqual(
        again.map((p) => [p.out, p.group]),
        [
          [A, "look"],
          [B, "failed"],
        ],
      );
      const port2 = await app2.listen(0);
      const failedPage = await fetch(`http://127.0.0.1:${port2}/picture/${B}`);
      assert.equal(failedPage.status, 200);
      assert.match(await failedPage.text(), /Regions of change<\/dt><dd>not measured/);

      const base2 = `http://127.0.0.1:${port2}`;
      const runsPage = await (await fetch(base2 + hrefs.runs)).text();
      // a failed picture counts as done, and the job says how many failed
      assert.match(runsPage, /<code>j<\/code> <progress[^>]*><\/progress>2 of 2, <span class="fail">1 failed<\/span>/);
      // Retake what failed: a new retake of the picture run 1 failed on, with its --svg (none)
      const retake =
        /<button type="button" data-url="\/api\/runs" data-act="([^"]*)"[^>]*>Retake what failed \(1\)<\/button>/.exec(
          runsPage,
        );
      assert.ok(retake, "run 1 offers Retake what failed");
      const act = JSON.parse(retake[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
      assert.deepEqual(act, { kind: "retake", pictures: [B], svg: false });
      assert.deepEqual(runOf(act, { hash: "a".repeat(40) }), {
        tool: "shoot_docs",
        args: ["--only", onlyOf([B]), "--against", "a".repeat(40)],
      });
      // a run that named no IDE is retaken on the build its run event names, not the newest
      // install; with that build gone, the button says so
      await app2.close();
      const eventsFile = runPaths(root, 1).events;
      const [first, ...rest] = fs.readFileSync(eventsFile, "utf8").split("\n");
      fs.writeFileSync(eventsFile, [JSON.stringify({ ...JSON.parse(first), build: 1501 }), ...rest].join("\n"));
      const retakeOn = async (ides) => {
        const probe = make({ ides });
        try {
          const page = await (await fetch(`http://127.0.0.1:${await probe.listen(0)}${hrefs.runs}`)).text();
          return /<button[^>]*>Retake what failed \(1\)<\/button>/.exec(page)[0].replace(/&quot;/g, '"');
        } finally {
          await probe.close();
        }
      };
      const newer = { build: 1600, exe: "C:/tb1600/twinBASIC.exe" };
      assert.match(await retakeOn([newer, { build: 1501, exe: "C:/tb1501/twinBASIC.exe" }]), /"ide":1501/);
      assert.match(await retakeOn([newer]), /disabled title="the IDE run 1 used, BETA 1501, is no longer found"/);
      app2 = make();
      await app2.listen(port2);

      // Removed: what it wrote under docs undone, its record and folder gone.
      assert.match(
        runsPage,
        /data-confirm="Remove run 1\? Every picture it changed goes back to how it was before it ran\./,
      );
      assert.equal(fs.existsSync(path.join(docs, A)), true);
      const removed = await fetch(base2 + hrefs.runAct(1), {
        method: "POST",
        headers: { origin: base2, "content-type": "application/json" },
        body: JSON.stringify({ action: "remove" }),
      });
      assert.deepEqual(await removed.json(), { ok: true, pictures: 1, later: 0 });
      assert.equal(fs.existsSync(path.join(docs, A)), false);
      assert.deepEqual(app2.model().pictures, []);
      assert.equal(fs.existsSync(runPaths(root, 1).dir), false);
      assert.doesNotMatch(await (await fetch(base2 + hrefs.runs)).text(), /Run 1:/);
    } finally {
      // a run left waiting for its stop line would keep the test's process alive
      for (const h of app.live()) h.kill();
      await app.close();
      await app2?.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("serves every picture of the table as the working tree has it, with why one has no SVG from an archived session, and a plain page for one", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-all-"));
    const docs = path.join(root, "docs");
    const C = "IDE/Images/C.png";
    fs.mkdirSync(path.join(docs, "IDE", "Images"), { recursive: true });
    fs.writeFileSync(path.join(docs, C), flat(false));
    fs.writeFileSync(path.join(docs, A), flat(false));
    fs.writeFileSync(path.join(docs, "IDE/Images/A.svg"), "<svg/>");
    // images no shot takes: one to look at, a poster frame and the favicon
    const HAND = "Features/Hand.webp";
    fs.mkdirSync(path.join(docs, "Features"), { recursive: true });
    fs.mkdirSync(path.join(docs, "assets/thumbnails"), { recursive: true });
    fs.writeFileSync(path.join(docs, HAND), "RIFF");
    fs.writeFileSync(path.join(docs, "assets/thumbnails/yt-x.jpg"), "jpeg");
    fs.writeFileSync(path.join(docs, "favicon.png"), flat(false));
    const revision = stubRevision("a", { [C]: flat(false), [HAND]: Buffer.from("RIFF") });
    const base = () => ({ hash: revision.hash, short: revision.short, build: 1500 });
    // a closed session whose replay refused C's SVG
    const closed = openSession(archiveRoot(root, "abc1234"), base);
    closed.addRun({ tool: "replay", args: [] });
    writeVerdict(
      runPaths(archiveRoot(root, "abc1234"), 1).stage,
      C,
      "svg",
      svgVerdict({ state: "not written", verdict: { faithful: false, share: 0.4 } }),
    );
    let table = [
      { out: A, setup: "s", once: true, window: false },
      { out: C, setup: "s", once: false, window: false },
    ];
    let reads = 0;
    const app = createReviewServer({
      session: openSession(root, base),
      revision,
      manifest: () => openManifest(path.join(root, "manifest.json")),
      docsRoot: docs,
      archived: () => listArchived(root),
      shots: async () => {
        reads++;
        if (!table) throw new Error("no table");
        return table;
      },
    });
    try {
      const at = `http://127.0.0.1:${await app.listen(0)}`;
      const all = await (await fetch(at + hrefs.all)).text();
      assert.match(all, /No SVG \(1\)/);
      assert.match(all, /refused: 0\.4% of its pixels strongly off its PNG \(run 1 of session abc1234\)/);
      assert.match(all, /With an SVG \(1\)/);
      // the table is read once while it is fresh
      await fetch(at + hrefs.all);
      assert.equal(reads, 1);
      // C, which no run of this session reported, has a plain page; a picture the table does not name has none
      const plain = await fetch(at + hrefs.picture(C));
      assert.equal(plain.status, 200);
      const text = await plain.text();
      assert.match(text, /<body data-out="IDE\/Images\/C\.png">/);
      assert.match(text, /No run of this session reported this picture/);
      assert.equal((await fetch(at + hrefs.picture("IDE/Images/Nope.png"))).status, 404);
      // an image no shot takes is listed and shown, alone when the baseline has the same bytes; a
      // poster frame and the favicon are not listed; and no action reaches it
      assert.match(all, /No automated capture \(1\)/);
      assert.doesNotMatch(all, /yt-x\.jpg|favicon/);
      const hand = await (await fetch(at + hrefs.picture(HAND))).text();
      assert.match(hand, /No tool takes this image/);
      assert.doesNotMatch(hand, /HEAD \(/);
      const file = await fetch(at + hrefs.docs(HAND));
      assert.equal(file.headers.get("content-type").split(";")[0], "image/webp");
      assert.equal((await fetch(at + hrefs.picture("assets/thumbnails/yt-x.jpg"))).status, 404);
      const acted = await fetch(at + hrefs.act(HAND), {
        method: "POST",
        headers: { origin: at, "content-type": "application/json" },
        body: "{}",
      });
      assert.equal(acted.status, 404);
      // the overview links to the page
      assert.match(await (await fetch(`${at}/`)).text(), /<a href="\/all">All pictures<\/a>/);
      // a table that cannot be read is said so, on a server that has none yet
      table = null;
      const app2 = createReviewServer({
        session: openSession(root, base),
        revision,
        manifest: () => openManifest(path.join(root, "manifest.json")),
        docsRoot: docs,
        shots: async () => {
          throw new Error("shoot_docs.mjs --list exited 2");
        },
      });
      try {
        const at2 = `http://127.0.0.1:${await app2.listen(0)}`;
        assert.match(
          await (await fetch(at2 + hrefs.all)).text(),
          /The table of shots could not be read: shoot_docs\.mjs --list exited 2/,
        );
      } finally {
        await app2.close();
      }
    } finally {
      await app.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("offers a replay that ended with pictures it could not draw again a retake of them", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-replay-"));
    const docs = path.join(root, "docs");
    fs.mkdirSync(docs);
    const revision = stubRevision("a", {});
    const session = openSession(root, () => ({ hash: revision.hash, short: revision.short, build: 1500 }));
    session.addRun({ tool: "replay", args: ["--only", "A|B"] });
    const { dir, events } = runPaths(root, 1);
    fs.mkdirSync(dir, { recursive: true });
    appendEvent(events, { type: "run", tool: "replay", pictures: [A, B] });
    appendEvent(events, { type: "retake", out: B, why: "no answer for 1 question" });
    appendEvent(events, { type: "summary", counts: {}, retakes: [{ out: B, why: "no answer for 1 question" }] });
    session.endRun(1, { exit: 1, stopped: false });
    const app = createReviewServer({
      session,
      revision,
      manifest: () => openManifest(path.join(root, "manifest.json")),
      docsRoot: docs,
    });
    try {
      const page = await (await fetch(`http://127.0.0.1:${await app.listen(0)}${hrefs.runs}`)).text();
      const retake =
        /<button type="button" data-url="\/api\/runs" data-act="([^"]*)"[^>]*>Retake what failed \(1\)<\/button>/.exec(
          page,
        );
      assert.ok(retake, "the replay offers Retake what failed");
      assert.deepEqual(JSON.parse(retake[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&")), {
        kind: "retake",
        pictures: [B],
        svg: true,
      });
      assert.match(page, /title="a new retake of the picture run 1 failed on or could not draw again:/);
    } finally {
      await app.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("applies a verdict as it arrives, takes a review's decisions and allowances, lists what changed outside its runs, and moves to HEAD", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-act-"));
    const docs = path.join(root, "docs");
    const Z = "IDE/Images/Z.png";
    fs.mkdirSync(path.join(docs, "IDE", "Images"), { recursive: true });
    fs.writeFileSync(path.join(docs, Z), flat(true));
    const script = path.join(root, "fake-run.mjs");
    fs.writeFileSync(script, FAKE);
    const head = flat(false);
    const capture = flat(true);
    const manifestFile = path.join(root, "manifest.json");
    const app = createReviewServer({
      session: openSession(root, () => ({ hash: "a".repeat(40), short: "aaaaaaaa", build: 1500 })),
      revision: stubRevision("a", { [A]: head, [Z]: head }),
      manifest: () => openManifest(manifestFile),
      docsRoot: docs,
      // a commit made outside the tool, whose A is the capture
      head: () => ({ hash: "b".repeat(40), short: "bbbbbbbb", build: 1501 }),
      baselineOf: (rev) => (rev.startsWith("a") ? { hash: "a".repeat(40), short: "aaaaaaaa", build: 1500 } : null),
      revisionAt: (hash) => stubRevision(hash[0], { [A]: capture }),
      // the commit changed A's picture
      changedBetween: () => new Set([A]),
      changed: () => [
        { out: Z, status: "modified" },
        { out: A, status: "added" },
      ],
      command: { script },
    });
    try {
      const port = await app.listen(0);
      const base = `http://127.0.0.1:${port}`;
      const get = async (p) => {
        const res = await fetch(base + p);
        return { status: res.status, text: await res.text() };
      };
      const post = async (p, body, headers = {}) => {
        const res = await fetch(base + p, {
          method: "POST",
          headers: { origin: base, "content-type": "application/json", ...headers },
          body: JSON.stringify(body),
        });
        return [res.status, await res.json()];
      };
      const docsA = () => fs.readFileSync(path.join(docs, A));
      const svgA = path.join(docs, "IDE/Images/A.svg");
      const pic = (out) => app.model().pictures.find((p) => p.out === out);
      const handle = app.start({ tool: "shoot_docs", args: ["--only", "A|B"] });
      await until("A's SVG verdict", () => pic(A)?.svg);

      // applied as it arrived: the capture and its SVG
      assert.ok(docsA().equals(capture));
      assert.ok(fs.existsSync(svgA));
      assert.equal(openManifest(manifestFile).entry(A).build, 1501);

      // Z, which no run reported, is changed outside the runs; A, which one did, is not
      assert.deepEqual([pic(Z).group, pic(A).outside], ["outside", null]);
      const overview = await get("/");
      assert.match(overview.text, /Changed outside the session's runs \(1\)/);
      assert.match(overview.text, /Move the session to bbbbbbbb/);
      assert.match((await get(`/picture/${Z}`)).text, /No run of this session reported this picture/);
      assert.equal((await get(hrefs.outsideMap(Z))).status, 200);
      // Z kept as it is: recorded against its bytes, and its page says the commit takes it
      assert.match((await get(`/picture/${Z}`)).text, /The commit takes nothing of this picture until/);
      assert.deepEqual(await post(hrefs.act(Z), { action: "keep-outside" }), [200, { ok: true }]);
      assert.deepEqual([pic(Z).outsideKept, Object.keys(app.session().data.outside)], [true, [Z]]);
      assert.match((await get(`/picture/${Z}`)).text, /A review kept it as it is, and the commit takes it/);
      // then put back as the baseline has it: the record goes
      assert.deepEqual(await post(hrefs.act(Z), { action: "put-back" }), [200, { ok: true }]);
      assert.ok(fs.readFileSync(path.join(docs, Z)).equals(head));
      assert.deepEqual(app.session().data.outside, {});
      // A has no file changed outside the runs to keep
      assert.equal((await post(hrefs.act(A), { action: "keep-outside" }))[0], 400);

      // a POST from another origin, or not of JSON, changes nothing
      assert.equal(
        (await post(hrefs.act(A), { action: "png", keep: "old" }, { origin: "http://docs.example" }))[0],
        403,
      );
      assert.equal(
        (await post(hrefs.act(A), { action: "png", keep: "old" }, { "content-type": "text/plain" }))[0],
        415,
      );
      assert.equal(openManifest(manifestFile).entry(A).png, undefined);

      // keep the old picture: HEAD's goes back, its SVG with it (HEAD has none)
      assert.deepEqual(await post(hrefs.act(A), { action: "png", keep: "old" }), [200, { ok: true }]);
      assert.ok(docsA().equals(head));
      assert.equal(fs.existsSync(svgA), false);
      assert.deepEqual([pic(A).png.state, pic(A).png.by, pic(A).group], ["restored", "decision", "noise"]);
      assert.deepEqual(openManifest(manifestFile).entry(A).png.decision, { keep: "old", capture: hashOf(capture) });
      assert.match((await get(`/picture/${A}`)).text, /aria-pressed="true">Keep the old picture/);

      // moved to HEAD: the verdict judged against the old baseline's picture needs a look,
      // and judged again it is against the new one's, which is the capture
      assert.deepEqual((await post(hrefs.moveBaseline, { action: "move" }))[0], 200);
      assert.equal(app.model().pictures.find((p) => p.out === A).png.look.why, "baseline");
      assert.doesNotMatch((await get("/")).text, /Move the session to/);
      // moved back, which changes no file: the verdict is compared with its own baseline again
      assert.match((await get("/")).text, /Move back to aaaaaaaa/);
      assert.deepEqual((await post(hrefs.moveBaseline, { action: "back" }))[0], 200);
      assert.deepEqual([app.session().data.baseline.short, pic(A).group], ["aaaaaaaa", "noise"]);
      assert.equal(app.session().data.baseline.moved.fromHash, "b".repeat(40));
      assert.ok(docsA().equals(head));
      assert.deepEqual((await post(hrefs.moveBaseline, { action: "move" }))[0], 200);
      assert.equal(pic(A).png.look.why, "baseline");
      assert.equal((await post(hrefs.act(A), { action: "judge" }))[0], 200);
      assert.deepEqual([pic(A).png.state, pic(A).png.look], ["restored", null]);
      assert.ok(docsA().equals(capture));

      // an allowance refused, then applied; back to the defaults and to the rule
      const [status, refused] = await post(hrefs.act(A), { action: "allowance", png: { levels: "300" } });
      assert.equal(status, 400);
      assert.match(refused.error, /noise levels must be a whole number from 0 to 255/);
      const allowance = {
        action: "allowance",
        png: { levels: "255", share: "100", ignore: "[0, 0, 4, 4]" },
        svg: { share: "1" },
      };
      assert.equal((await post(hrefs.act(A), allowance))[0], 200);
      // (the file is HEAD's picture, put back: its build is not known)
      assert.deepEqual(openManifest(manifestFile).entry(A), {
        png: {
          noise: { levels: 255, share: 100 },
          ignore: [[0, 0, 4, 4]],
          decision: { keep: "old", capture: hashOf(capture) },
        },
        svg: { bar: { share: 1 } },
      });
      // The overview's card shows both allowances.
      const cards = (await get("/")).text;
      assert.match(cards, />PNG: allowance</);
      assert.match(cards, />SVG: allowance</);
      assert.equal((await post(hrefs.act(A), { action: "allowance", png: {}, svg: {} }))[0], 200);
      assert.doesNotMatch((await get("/")).text, />PNG: allowance</);
      assert.equal((await post(hrefs.act(A), { action: "rule" }))[0], 200);
      assert.equal(openManifest(manifestFile).entry(A), null);
      assert.deepEqual([pic(A).png.by, pic(A).png.state], ["rule", "restored"]);

      handle.stop();
      assert.equal(await handle.exited, 0);
    } finally {
      for (const h of app.live()) h.kill();
      await app.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  // A clean-up as shoot_docs.mjs --cleanup makes one, put before the stand-in run: its list,
  // and, when it is not a dry run, a wait for the file "go" beside it before it ends.
  const CLEANUP = `const cleanupArgs = process.argv.slice(2);
if (cleanupArgs.includes("--cleanup")) {
  const { existsSync } = await import("node:fs");
  if (cleanupArgs.includes("--stage") || cleanupArgs.includes("--events")) process.exit(2);
  const dry = cleanupArgs.includes("--dry-run");
  console.log("IDE/Images/Z.png: " + (dry ? "would be put back" : "put back") + " as aaaaaaaa has it");
  if (!dry) while (!existsSync(new URL("./go", import.meta.url))) await new Promise((r) => setTimeout(r, 20));
  process.exit(0);
}
`;

  test("starts, stops and lists runs from its runs page, one at a time, and holds a review's actions while a clean-up runs", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-runs-"));
    const docs = path.join(root, "docs");
    const Z = "IDE/Images/Z.png";
    fs.mkdirSync(path.join(docs, "IDE", "Images"), { recursive: true });
    fs.writeFileSync(path.join(docs, Z), flat(true));
    const script = path.join(root, "fake-run.mjs");
    fs.writeFileSync(script, CLEANUP + FAKE);
    const hash = "a".repeat(40);
    let changed = [{ out: Z, status: "modified" }];
    const app = createReviewServer({
      session: openSession(root, () => ({ hash, short: "aaaaaaaa", build: 1500 })),
      revision: stubRevision("a", { [A]: flat(false), [Z]: flat(false) }),
      manifest: () => openManifest(path.join(root, "manifest.json")),
      docsRoot: docs,
      changed: () => changed,
      ides: [{ build: 1501, exe: "C:/tb/twinBASIC.exe" }],
      command: { script },
    });
    try {
      const port = await app.listen(0);
      const base = `http://127.0.0.1:${port}`;
      const get = async (p) => (await fetch(base + p)).text();
      const post = async (p, body) => {
        const res = await fetch(base + p, {
          method: "POST",
          headers: { origin: base, "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        return [res.status, await res.json()];
      };
      const ended = (n) => until(`run ${n}'s end`, () => !app.live().length);

      const empty = await get(hrefs.runs);
      assert.match(empty, /No run yet\./);
      assert.match(empty, /<option value="1501" selected>BETA 1501: newer than the baseline's BETA 1500<\/option>/);
      for (const kind of ["retake", "replay", "cleanup"])
        assert.match(empty, new RegExp(`id="start-${kind}" data-kind="${kind}"`));
      assert.match(await get("/"), /No run yet: start one on the <a href="\/runs">runs page<\/a>/);

      // a clean-up's list first, with the button that puts them back
      assert.deepEqual(await post(hrefs.startRun, { kind: "cleanup", dryRun: true, only: "Z" }), [
        200,
        { ok: true, run: 1 },
      ]);
      await ended(1);
      let page = await get(hrefs.runs);
      assert.match(page, /Run 1: Clean-up, a dry run, ended, exit 0/);
      assert.match(page, /<pre class="log">IDE\/Images\/Z\.png: would be put back as aaaaaaaa has it<\/pre>/);
      assert.match(page, new RegExp(`node scripts/shoot_docs\\.mjs --cleanup --dry-run --only Z --against ${hash}`));
      assert.match(
        page,
        /data-act="\{&quot;kind&quot;:&quot;cleanup&quot;,&quot;only&quot;:&quot;Z&quot;\}"[^>]*>Put them back</,
      );

      // the clean-up itself: nothing else starts and a review's actions wait until it ends
      assert.equal((await post(hrefs.startRun, { kind: "cleanup", only: "Z" }))[0], 200);
      assert.equal(app.model().pictures.find((p) => p.out === Z).group, "outside");
      const [busy, refused] = await post(hrefs.startRun, { kind: "replay" });
      assert.deepEqual([busy, refused.error], [400, "run 2 is running: a new run starts once it has ended"]);
      assert.match(
        (await post(hrefs.act(Z), { action: "judge" }))[1].error,
        /run 2, a clean-up, is putting pictures back/,
      );
      assert.match((await post(hrefs.moveBaseline, {}))[1].error, /run 2, a clean-up/);
      assert.match((await post(hrefs.runAct(2), { action: "stop" }))[1].error, /a clean-up cannot be stopped/);
      assert.match(await get(hrefs.runs), /Run 2, a clean-up, is running/);
      changed = [];
      fs.writeFileSync(path.join(root, "go"), "");
      await ended(2);
      // what it put back has left the outside group at once, not once git is read again a second later
      assert.equal(app.model().pictures.length, 0);
      assert.doesNotMatch(await get(hrefs.runs), /Put them back/);

      // a retake of the pictures selected, on the install chosen by its build
      assert.match(
        (await post(hrefs.startRun, { kind: "retake", ide: "999" }))[1].error,
        /no install of BETA 999 was found/,
      );
      assert.deepEqual(await post(hrefs.startRun, { kind: "retake", pictures: [A], ide: "1501" }), [
        200,
        { ok: true, run: 3 },
      ]);
      await until("A's SVG verdict", () => app.model().pictures.find((p) => p.out === A)?.svg);
      const [state] = JSON.parse(await get("/api/state")).runs.slice(-1);
      assert.deepEqual(state.args, [
        "--svg",
        "--only",
        "^(?:IDE/Images/A\\.png)$",
        "--against",
        hash,
        "--ide",
        "C:/tb/twinBASIC.exe",
      ]);
      assert.deepEqual(state.jobs, [{ name: "j", state: "started", error: null, pictures: 2, done: 1, failed: 0 }]);
      page = await get(hrefs.runs);
      assert.match(page, /<li><code>j<\/code> <progress max="2" value="1"><\/progress>1 of 2<\/li>/);
      assert.match(page, /<pre class="log">taking IDE\/Images\/A\.png<\/pre>/);
      assert.match(page, />Stop</);
      assert.match(
        await get(`/picture/${A}`),
        /<button[^>]*disabled title="run 3 is running[^"]*">Retake this picture</,
      );
      assert.match((await post(hrefs.runAct(3), { action: "kill" }))[1].error, /stop run 3 first/);
      assert.deepEqual(await post(hrefs.runAct(3), { action: "stop" }), [200, { ok: true }]);
      await ended(3);
      page = await get(hrefs.runs);
      assert.match(page, /Run 3: Retake, stopped, exit 0/);
      assert.doesNotMatch(page, />Stop<|>Kill</);
      assert.match((await post(hrefs.runAct(3), { action: "stop" }))[1].error, /run 3 is not running/);
      assert.match(await get(`/picture/${A}`), /<button[^>]*>Retake this picture</);
      assert.doesNotMatch(await get(`/picture/${A}`), /disabled title="run/);
    } finally {
      for (const h of app.live()) h.kill();
      await app.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("commits the session's own files and nothing else, closes the session, and serves the next one", async (t) => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-commit-"));
    const reviewRoot = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-session-"));
    // the file the test's pre-commit hook waits for; written here too, so a failed test lets git end
    const gate = path.join(reviewRoot, "gate");
    t.after(() => {
      fs.writeFileSync(gate, "");
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(reviewRoot, { recursive: true, force: true });
    });
    const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: ["ignore", "pipe", "ignore"] }).toString();
    try {
      git("init", "-q");
    } catch {
      t.skip("no git");
      return;
    }
    for (const [k, v] of [
      ["core.autocrlf", "false"],
      ["user.name", "t"],
      ["user.email", "t@t"],
      ["commit.gpgsign", "false"],
    ])
      git("config", k, v);
    const docs = path.join(repo, "docs");
    fs.mkdirSync(path.join(docs, "IDE", "Images"), { recursive: true });
    fs.mkdirSync(path.join(repo, "test", "shots"), { recursive: true });
    fs.writeFileSync(path.join(docs, A), flat(false));
    fs.writeFileSync(path.join(repo, "other.txt"), "o\n");
    git("add", ".");
    git("commit", "-q", "-m", "x");
    const script = path.join(reviewRoot, "fake-run.mjs");
    fs.writeFileSync(script, FAKE);
    const manifestFile = path.join(repo, "test", "shots", "manifest.json");
    const baselineOf = (hash) => ({ hash, short: hash.slice(0, 8), build: null });
    const headHash = () => git("rev-parse", "HEAD").trim();
    let committed = null;
    const app = createReviewServer({
      session: openSession(reviewRoot, () => baselineOf(headHash())),
      revision: openRevision(docs, "HEAD"),
      manifest: () => openManifest(manifestFile),
      docsRoot: docs,
      repoRoot: repo,
      head: () => baselineOf(headHash()),
      revisionAt: (hash) => openRevision(docs, hash),
      command: { script },
      onCommit(commit) {
        committed = commit;
        const archive = app.session().archive(commit);
        return {
          session: openSession(reviewRoot, () => baselineOf(commit.hash)),
          revision: openRevision(docs, commit.hash),
          archive,
        };
      },
      archived: () => listArchived(reviewRoot),
    });
    let archivedApp = null;
    try {
      const port = await app.listen(0);
      const base = `http://127.0.0.1:${port}`;
      const get = async (p) => (await fetch(base + p)).text();
      const post = async (p, body) => {
        const res = await fetch(base + p, {
          method: "POST",
          headers: { origin: base, "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        return [res.status, await res.json()];
      };
      const handle = app.start({ tool: "shoot_docs", args: ["--only", "A|B"] });
      await until("A's SVG verdict", () => app.model().pictures.find((p) => p.out === A)?.svg);
      fs.writeFileSync(path.join(repo, "other.txt"), "changed\n");
      const files = ["docs/IDE/Images/A.png", "docs/IDE/Images/A.svg", "test/shots/manifest.json"];
      const message = "Screenshots retaken on BETA 1501: 1 picture changed; 1 SVG written";

      // nothing is committed while a run runs
      let page = await get(hrefs.commitPage);
      assert.match(
        page,
        /<button type="submit" disabled title="run 1 is running: commit once it has ended">Commit 3 files</,
      );
      assert.match((await post(hrefs.commit, { message, files }))[1].error, /run 1 is running/);
      handle.stop();
      await handle.exited;
      await until("the run's end", () => !app.live().length);

      // the files the session changed, its default message, and the other change left out
      page = await get(hrefs.commitPage);
      assert.ok(page.includes(`data-files="${JSON.stringify(files).replace(/"/g, "&quot;")}"`));
      // While the commit runs, its status says so, not the "applying..." of every other action.
      assert.match(page, /<form class="commit" id="commit" data-keep data-busy="committing\.\.\."/);
      assert.ok(page.includes('from.closest("[data-busy]")?.dataset.busy || "applying..."'));
      assert.ok(page.includes(`data-default="${message}">${message}</textarea>`));
      assert.match(page, /<button type="submit">Commit 3 files</);
      assert.ok(
        page.includes(
          `<tr><td><code><a href="/picture/IDE/Images/A.png">docs/IDE/Images/A.png</a></code></td><td>modified</td><td>changed by the tool's verdict</td></tr>`,
        ),
      );
      assert.match(page, /<h2>Left out \(1\)<\/h2>[\s\S]*<li><code>other\.txt<\/code> modified<\/li>/);
      assert.match(await get("/"), /<a href="\/commit">Commit<\/a>/);

      // refused: another list of files than the session's, and an empty message
      assert.match(
        (await post(hrefs.commit, { message, files: files.slice(1) }))[1].error,
        /has changed since the page was drawn/,
      );
      assert.match((await post(hrefs.commit, { message: "  ", files }))[1].error, /the message is empty/);
      assert.equal(headHash(), app.session().data.baseline.hash);

      // While git and the hooks run, the server answers, every page says the commit is under
      // way, and nothing can change: a pre-commit hook holds the commit until the gate is there.
      const hook = path.join(repo, ".git", "hooks", "pre-commit");
      fs.writeFileSync(hook, `#!/bin/sh\nwhile [ ! -e "${gate.replace(/\\/g, "/")}" ]; do sleep 0.05; done\n`);
      fs.chmodSync(hook, 0o755);
      const pending = post(hrefs.commit, { message: "Screenshots: A", files: [...files].reverse() });
      await until("the commit to be under way", () => app.committing() !== null);
      page = await get(hrefs.commitPage);
      assert.match(page, /<span class="status" role="status">committing\.\.\.<\/span>/);
      assert.match(page, /Committing the session: <q>Screenshots: A<\/q>/);
      assert.match(page, /data-default="Screenshots: A" readonly>Screenshots: A<\/textarea>/);
      assert.match(page, /<button type="submit" disabled title="the session is being committed">Commit 3 files</);
      assert.match(await get("/"), /Committing the session: <q>Screenshots: A<\/q>/);
      assert.match(await get(hrefs.runs), /<p class="notice">Committing the session/);
      assert.match(await get(`/picture/${A}`), /disabled title="the session is being committed: a new run starts/);
      assert.match((await post(hrefs.act(A), { action: "png", keep: "old" }))[1].error, /being committed/);
      assert.match((await post(hrefs.startRun, { kind: "replay", only: "A" }))[1].error, /being committed/);
      assert.match((await post(hrefs.commit, { message, files }))[1].error, /being committed/);
      assert.equal(headHash(), app.session().data.baseline.hash);
      fs.writeFileSync(gate, "");

      // committed: those files and nothing else, the session archived and the next one served
      const [status, done] = await pending;
      fs.rmSync(hook);
      assert.equal(app.committing(), null);
      assert.equal(status, 200, done.error);
      assert.deepEqual([done.hash, done.short, done.archive], [headHash(), committed.short, committed.short]);
      assert.equal(git("log", "-1", "--format=%B").trim(), "Screenshots: A");
      assert.equal(
        git("show", "--name-status", "--format=", "HEAD"),
        "M\tdocs/IDE/Images/A.png\nA\tdocs/IDE/Images/A.svg\nA\ttest/shots/manifest.json\n",
      );
      assert.equal(git("status", "--porcelain"), " M other.txt\n");
      assert.deepEqual([app.session().data.baseline.hash, app.session().data.runs], [done.hash, []]);
      assert.deepEqual(app.model().pictures, []);
      page = await get(hrefs.commitPage);
      assert.match(
        page,
        new RegExp(
          `Committed ${done.short}: Screenshots: A\\. The session it closed is archived as <code>${done.short}</code>`,
        ),
      );
      assert.match(page, /The session has changed nothing to commit\./);
      assert.match(
        page,
        new RegExp(`<code>node scripts/shot_review\\.mjs --archived ${done.short} --port 4181</code>`),
      );
      assert.doesNotMatch(await get("/"), /HEAD is now/);

      // the archived session, read-only
      const archived = openSession(archiveRoot(reviewRoot, done.short), () => assert.fail("it is there"));
      assert.equal(archived.data.closed.message, "Screenshots: A");
      archivedApp = createReviewServer({
        session: archived,
        revision: openRevision(docs, archived.data.baseline.hash),
        manifest: () => openManifest(manifestFile),
        docsRoot: docs,
        repoRoot: repo,
        readOnly: true,
      });
      const aPort = await archivedApp.listen(0);
      const aBase = `http://127.0.0.1:${aPort}`;
      assert.match(await (await fetch(`${aBase}/`)).text(), new RegExp(`An archived session, closed by ${done.short}`));
      assert.deepEqual(
        archivedApp.model().pictures.map((p) => p.out),
        [A, B],
      );
      const refused = await fetch(`${aBase}${hrefs.act(A)}`, {
        method: "POST",
        headers: { origin: aBase, "content-type": "application/json" },
        body: JSON.stringify({ action: "judge" }),
      });
      assert.deepEqual(
        [refused.status, (await refused.json()).error],
        [403, "this session is archived: nothing in it can be changed"],
      );
      assert.match(await (await fetch(`${aBase}${hrefs.commitPage}`)).text(), /this session is archived/);
    } finally {
      for (const h of app.live()) h.kill();
      await app.close();
      await archivedApp?.close();
    }
  });
});

describe("what the screenshot review reads from git while it serves its pages (kept, shot-git-worker.mjs)", () => {
  const settle = () => new Promise((r) => setImmediate(r));

  test("a read that answers at once is read again once it is a second old, or at once after again()", () => {
    let reads = 0;
    const get = kept(
      () => ++reads,
      0,
      () => assert.fail("no change is told for a read that answers at once"),
    );
    assert.equal(get(), 1);
    assert.equal(get(), 1);
    get.again();
    assert.equal(get(), 2);
    const thrown = kept(
      () => {
        throw new Error("no git");
      },
      "fallback",
      () => {},
    );
    assert.equal(thrown(), "fallback");
  });

  test("a read that answers with a promise gives the value kept meanwhile, and tells of another once it settles", async () => {
    let answer = ["A"];
    let resolveNext = null;
    let changes = 0;
    const get = kept(
      () => new Promise((r) => (resolveNext = () => r(answer))),
      [],
      () => changes++,
    );
    // the page is drawn at once with what is kept, while git is read
    assert.deepEqual(get(), []);
    assert.deepEqual(get(), [], "one read at a time");
    resolveNext();
    await settle();
    assert.deepEqual(get(), ["A"]);
    assert.equal(changes, 1);
    // the same answer again tells of nothing
    get.again();
    get();
    resolveNext();
    await settle();
    assert.equal(changes, 1);
    // again() while a read is under way: that read is not kept, and git is read again
    get.again();
    get();
    const stale = resolveNext;
    get.again();
    answer = ["B"];
    stale();
    await settle();
    await settle();
    assert.deepEqual(get(), ["A"], "the read from before again() is not kept");
    resolveNext();
    await settle();
    assert.deepEqual(get(), ["B"]);
    assert.equal(changes, 2);
    // a read that fails gives the fallback
    const failing = kept(
      () => Promise.reject(new Error("no git")),
      "none",
      () => {},
    );
    failing();
    await settle();
    assert.equal(failing(), "none");
  });

  test("the worker reads HEAD's baseline and the pictures changed from it in this working tree", async () => {
    const git = startGitReader({ docsDir: path.join(REPO_ROOT, "docs"), repoRoot: REPO_ROOT });
    try {
      const hash = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
      const head = await git.head();
      assert.equal(head.hash, hash);
      assert.equal(head.short, hash.slice(0, head.short.length));
      assert.ok(head.build === null || Number.isInteger(head.build), JSON.stringify(head));
      assert.ok(Array.isArray(await git.changed(hash)));
      await assert.rejects(git.changed("no-such-revision"), /no revision no-such-revision/);
    } finally {
      await git.close();
    }
  });
});
