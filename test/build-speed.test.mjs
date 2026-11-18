// Unit tests for the modules of scripts/build_speed.mjs that read what another
// part of the tooling writes: the build's Gantt chart (builder/gantt.mjs) and a
// V8 CPU profile.
//
// build_speed.mjs takes a build's times from its chart, since the build writes
// no timings file. A change to how the chart is drawn would not fail the tool:
// it would report other numbers, and a measurement that is wrong reads like one
// that is right. These draw a chart from timings of their own with the build's
// writer and read the same times back.
//
// Runs with a bare `node --test test/build-speed.test.mjs`: no build, no lanes.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { groupGanttTimings, renderGantt } from "../builder/gantt.mjs";
import { chartLine, range, readChart } from "../scripts/build-speed/chart.mjs";
import { formatTrees, profileTrees } from "../scripts/build-speed/profile.mjs";

// The scheduler's timings are in milliseconds since the epoch; the chart's are
// seconds from the first start. A chart is 900 units wide, so a time read back
// from it is within a few hundredths of a second of the one drawn.
const T0 = 1_000_000;
const main = (start, end) => ({ start: T0 + start, end: T0 + end });
const lane = (n, start, end, ganttSection) => ({
  ...main(start, end),
  workerStart: T0 + start,
  workerEnd: T0 + end,
  lane: n,
  ganttSection,
});
const near = (actual, expected, what) =>
  assert.ok(Math.abs(actual - expected) <= 0.03, `${what}: ${actual} is not within 0.03 s of ${expected}`);

function chartOf(timings) {
  return renderGantt(groupGanttTimings(new Map(Object.entries(timings))));
}

const BUILD = {
  config: main(0, 10),
  markdownInit: main(100, 200),
  "renderEnvInit:0": lane(0, 400, 500, "Boot"),
  "renderEnvInit:1": lane(1, 450, 600, "Boot"),
  "render:0": lane(0, 500, 4000, "Render"),
  "render:1": lane(1, 600, 5000, "Render"),
  searchIndex: main(6000, 6500),
  addinProject: main(7000, 7100),
};

describe("readChart", () => {
  const chart = readChart(chartOf(BUILD));

  test("reads the first render, render's end and the chart's end", () => {
    near(chart.env, 0.4, "env");
    near(chart.render.start, 0.5, "the first render");
    near(chart.render.end, 5.0, "render's end");
    near(chart.end, 7.1, "the chart's end");
  });

  test("reads a main-thread task by its label, and gives null for a name the chart has not", () => {
    const bar = chart.task("searchIndex");
    near(bar.start, 6.0, "searchIndex starts");
    near(bar.end, 6.5, "searchIndex ends");
    near(chart.task("markdownInit").end, 0.2, "markdownInit ends");
    assert.equal(chart.task("linkJoin"), null);
  });

  test("reads a chart whose build took minutes", () => {
    const long = readChart(chartOf({ config: main(0, 10), "render:0": lane(0, 30_000, 240_000, "Render") }));
    assert.ok(Math.abs(long.render.start - 30) <= 0.5, `the first render: ${long.render.start}`);
    assert.ok(Math.abs(long.render.end - 240) <= 0.5, `render's end: ${long.render.end}`);
  });

  test("gives null for what a chart has no bar of, and refuses what is not a chart", () => {
    const bare = readChart(chartOf({ config: main(0, 10), searchIndex: main(1000, 2000) }));
    assert.equal(bare.env, null);
    assert.equal(bare.render.start, null);
    assert.throws(() => readChart("<svg></svg>"), /not a build's Gantt chart/);
  });

  test("chartLine names each figure, and a task the chart has not as unknown", () => {
    const line = chartLine(chart, ["searchIndex", "linkJoin"]);
    assert.match(
      line,
      /^first render 0\.5\d; render ends \d\.\d\d; ends 7\.\d\d; searchIndex [\d.]+ to [\d.]+; linkJoin \?$/,
    );
  });
});

describe("range", () => {
  test("is the lowest and the highest, one value when they agree, and unknown for none", () => {
    assert.equal(range([0.84, 0.7, 0.91]), "0.70 to 0.91 s");
    assert.equal(range([0.701, 0.704]), "0.70 s");
    assert.equal(range([null, 1.5]), "1.50 s");
    assert.equal(range([null]), "?");
  });
});

describe("profileTrees", () => {
  const frame = (functionName, lineNumber) => ({ functionName, url: "file:///x/work.mjs", lineNumber });
  // (root) -> outer -> inner -> outer, and (root) -> other.
  const profile = {
    nodes: [
      { id: 1, callFrame: { functionName: "(root)", url: "", lineNumber: -1 }, children: [2, 5] },
      { id: 2, callFrame: frame("outer", 9), children: [3] },
      { id: 3, callFrame: frame("inner", 19), children: [4] },
      { id: 4, callFrame: frame("outer", 9) },
      { id: 5, callFrame: frame("other", 29) },
    ],
    samples: [2, 3, 4, 4, 5],
    timeDeltas: [500, 1000, 2000, 2000, 8000],
  };

  test("totals a function with what it calls, and counts one that calls itself once", () => {
    const trees = profileTrees(profile, ["outer"], 3);
    const outer = trees.get("outer");
    assert.equal(outer.t, 5500);
    const inner = outer.kids.get("inner work.mjs:20");
    assert.equal(inner.t, 5000);
    assert.equal(inner.kids.get("outer work.mjs:10").t, 4000);
  });

  test("keeps only as many levels of callees as it is asked for", () => {
    const outer = profileTrees(profile, ["outer"], 1).get("outer");
    assert.equal(outer.t, 5500);
    assert.equal(outer.kids.get("inner work.mjs:20").kids.size, 0);
  });

  test("prints callees by time, leaves out the small ones, and says which name had no sample", () => {
    const names = ["other", "outer", "absent"];
    const lines = formatTrees(profileTrees(profile, names, 3), names, 4.5);
    assert.deepEqual(
      lines.map((l) => l.trim()),
      [
        "8.0 ms  other",
        "5.5 ms  outer",
        "5.0 ms  inner work.mjs:20",
        "?      absent: no sample is under a function of this name",
      ],
    );
  });
});
