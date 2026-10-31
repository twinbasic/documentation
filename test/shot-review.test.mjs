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
  stageSvg,
  svgVerdict,
  writeVerdict,
} from "../scripts/lib/shot-stage.mjs";
import { hashOf, openManifest } from "../scripts/lib/shot-manifest.mjs";
import { changeMap, strengthOf, strengthPicture } from "../scripts/lib/shot-change.mjs";
import {
  acquireLock,
  archiveRoot,
  commandOf,
  listArchived,
  newestBuild,
  openSession,
  parseSession,
  readEvents,
  runPaths,
  sessionPaths,
} from "../scripts/lib/shot-session.mjs";
import {
  commitMessage,
  commitPlan,
  filterPictures,
  groupOf,
  hasSvg,
  neighbours,
  reviewPictures,
  runFacts,
  verdictOfEvent,
} from "../scripts/lib/shot-review.mjs";
import { chipsOf, encodePath, hrefs, loupesHtml } from "../scripts/lib/shot-pages.mjs";
import { againstOf, createApplier } from "../scripts/lib/shot-verdicts.mjs";
import { kindOf, onlyOf, runOf } from "../scripts/lib/shot-runs.mjs";
import { createReviewServer } from "../scripts/lib/shot-server.mjs";
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
      args: ["--recheck"],
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
      ["shoot_docs", "replay", "cleanup"].map((tool) => kindOf({ tool })),
      ["retake", "replay", "cleanup"],
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
      ["progress", "look", "changed", "noise", "outside", "unchanged", "added", "deleted", "failed"],
    );
    assert.deepEqual(
      pictures.map((p) => p.out),
      [A, E, D, B, C],
    );
    // the same runs once the third has ended: A's PNG is unchanged, and it has no SVG verdict
    const ended = reviewPictures(runs.map((r) => ({ ...r, live: false })));
    assert.equal(ended.pictures.find((p) => p.out === A).group, "unchanged");
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
      { out: A, status: "modified" },
      { out: C, status: "added" },
    ];
    const { pictures } = reviewPictures(runs, { outside, baseline: "new" });
    const at = (out) => pictures.find((p) => p.out === out);
    assert.deepEqual([at(C).group, at(C).outside, at(A).outside], ["outside", "added", null]);
    assert.deepEqual([at(A).group, at(A).png.look.why], ["look", "baseline"]);
    assert.deepEqual([at(B).group, at(B).png.look], ["changed", undefined]);
    assert.equal(reviewPictures(runs, { baseline: "old" }).pictures.find((p) => p.out === A).group, "noise");
    assert.match(chipsOf(at(C)), /changed outside the runs: added/);
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
      manifest: true,
    });
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

  test("follows a run as it reports, serves its pages and files to the loopback host only, and reads the run back", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shot-review-"));
    const docs = path.join(root, "docs");
    fs.mkdirSync(docs);
    const script = path.join(root, "fake-run.mjs");
    fs.writeFileSync(script, FAKE);
    const head = flat(false);
    const revision = stubRevision("a", { [A]: head });
    const manifestFile = path.join(root, "manifest.json");
    const make = () =>
      createReviewServer({
        session: openSession(root, () => ({ hash: revision.hash, short: revision.short, build: 1500 })),
        revision,
        manifest: () => openManifest(manifestFile),
        docsRoot: docs,
        command: { script },
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

      const overview = await get("/");
      assert.equal(overview.status, 200);
      const html = overview.body.toString();
      assert.match(html, /In progress \(1\)/);
      assert.match(html, /Needs a look \(1\)/);
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
      await app.close();
      app2 = make();
      const again = app2.model().pictures;
      assert.deepEqual(
        again.map((p) => [p.out, p.group]),
        [
          [A, "look"],
          [B, "failed"],
        ],
      );
    } finally {
      // a run left waiting for its stop line would keep the test's process alive
      for (const h of app.live()) h.kill();
      await app.close();
      await app2?.close();
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
      revisionAt: (hash) => stubRevision(hash[0], { [A]: capture }),
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
      assert.deepEqual(state.jobs, [{ name: "j", state: "started", error: null, pictures: 2, done: 1 }]);
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
