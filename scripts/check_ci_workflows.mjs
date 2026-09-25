#!/usr/bin/env node
// The gate that both CI workflows run the gates the wrappers run.
//
// Nothing else reads a workflow. A step dropped from one, a gate added to
// test.bat and never to CI, or a lost --check-audit-index would leave CI green
// over a check it had stopped making. This reads test.bat, check.bat and
// build.bat, and the build job of each workflow, and requires:
//
//   1. each workflow runs every gate the two wrappers run, with the same
//      arguments, and in each wrapper's own order. CI interleaves the two
//      wrappers' gates -- check_axe_patch_equiv.mjs, a test.bat gate, runs
//      among check.bat's -- and that is allowed;
//   2. the two workflows run the same gate steps, in the same order;
//   3. each workflow's build passes every argument build.bat passes, and
//      --no-fetch-assets, and nothing else unless ALLOWED records it.
//
// ALLOWED lists the recorded differences, each with where it is recorded. A
// difference not on it is a finding, and so is an allowance that matches
// nothing: one nobody needs is one waiting to hide a real gap.
//
// The probes ride along in every run. Each plants one defect in a small
// synthetic set of wrappers and workflows and requires exactly the findings it
// should produce, so a green run cannot be a gate that has stopped looking.
//
//   node scripts/check_ci_workflows.mjs
//
// Exit codes: 0 clean, 1 a finding, 2 a probe failed or the gate crashed.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { buildArgs, gateSteps, workflowSteps } from "./lib/gate-roster.mjs";

process.on("uncaughtException", (err) => { console.error(err); process.exit(2); });

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const JOB = "build";
const WORKFLOWS = ["checks.yml", "tbdocs-gh-pages.yml"];

const ALLOWED = {
  localOnly: {
    "check_tree_fresh.mjs": "CI builds the tree in the same job, so it cannot be stale (check.bat)",
  },
  ciOnly: [
    {
      script: "check_links_diff.mjs",
      args: "--case fixture --a script --b index",
      workflows: ["checks.yml", "tbdocs-gh-pages.yml"],
      why: "the standalone link checker against its fixture; no wrapper runs it (the step's comment in each workflow)",
    },
    {
      script: "check_links_diff.mjs",
      args: "--case fixture-built --case fixture-built-offline --a script --b fused",
      workflows: ["checks.yml"],
      why: "costs two builds, so it runs before a merge and not on every deploy (PLAN-REVIEW-c9f2dfe0-1b6922b.md, decision 1)",
    },
  ],
  buildFlags: {
    "tbdocs-gh-pages.yml": {
      "--url": "the Pages origin the deploy publishes to",
      "--baseurl": "the Pages base path the deploy publishes under",
    },
  },
  requiredBuildFlags: {
    "--no-fetch-assets": "CI must never download an asset (vendor-assets.mjs)",
  },
};

const keyOf = (s) => (s.args ? `${s.script} ${s.args}` : s.script);

// Remove one occurrence of each of `drop` from `list`; return the rest and
// whatever in `drop` was not found.
function removeEach(list, drop) {
  const rest = [...list];
  const absent = [];
  for (const k of drop) {
    const at = rest.indexOf(k);
    if (at < 0) absent.push(k);
    else rest.splice(at, 1);
  }
  return { rest, absent };
}

/**
 * The findings for one set of texts, as {kind, where, text}. Pure, so that the
 * probes can run it on synthetic sets. `workflows` maps a file name to its
 * parsed YAML.
 */
function findings({ testBat, checkBat, buildBat, workflows, allowed }) {
  const out = [];
  const add = (kind, where, text) => out.push({ kind, where, text });

  const wrappers = [["test.bat", testBat], ["check.bat", checkBat]].map(([name, text]) => ({
    name,
    keys: gateSteps(text).filter((s) => !(s.script in allowed.localOnly)).map(keyOf),
  }));
  const roster = wrappers.flatMap((w) => w.keys);
  const wantBuild = buildArgs(buildBat) ?? [];
  const names = Object.keys(workflows);
  const shared = new Set(
    allowed.ciOnly.filter((e) => names.every((n) => e.workflows.includes(n))).map(keyOf),
  );
  const compared = {};

  for (const wf of names) {
    const steps = workflowSteps(workflows[wf], JOB);
    const all = steps.flatMap((s) => s.gates.map(keyOf));
    const mine = allowed.ciOnly.filter((e) => e.workflows.includes(wf));
    const { rest: core, absent } = removeEach(all, mine.map(keyOf));
    for (const k of absent) {
      add("stale", wf, `the allowance for \`${k}\` matches no step`);
    }

    // 1. The wrappers' gates, each once, with its arguments, in its wrapper's order.
    const missing = removeEach(roster, core).rest;
    const extra = removeEach(core, roster).rest;
    for (const k of missing) add("missing", wf, `\`${k}\` is in a wrapper and not in this workflow`);
    for (const k of extra) add("extra", wf, `\`${k}\` is in this workflow and in neither wrapper, nor allowed`);
    for (const w of wrappers) {
      const inWrapper = new Set(w.keys);
      const inCore = new Set(core);
      const want = w.keys.filter((k) => inCore.has(k));
      const got = core.filter((k) => inWrapper.has(k));
      if (want.join("\n") !== got.join("\n")) {
        add("order", wf, `runs ${w.name}'s gates in another order: ${got.join(", ")}`);
      }
    }

    // 2. What the workflows must have in common: everything but an allowance
    //    that only some of them have.
    compared[wf] = all.filter((k) => roster.includes(k) || shared.has(k));

    // 3. The build.
    const build = steps.find((s) => s.build)?.build;
    if (!build) {
      add("build", wf, "runs no `node builder/tbdocs.mjs` build");
      continue;
    }
    for (const t of removeEach(wantBuild, build).rest) {
      add("build", wf, `the build does not pass \`${t}\`, which build.bat does`);
    }
    for (const flag of Object.keys(allowed.requiredBuildFlags)) {
      if (!build.includes(flag)) add("build", wf, `the build does not pass \`${flag}\` (${allowed.requiredBuildFlags[flag]})`);
    }
    const flagsHere = allowed.buildFlags[wf] ?? {};
    const expected = removeEach(build, [...wantBuild, ...Object.keys(allowed.requiredBuildFlags)]).rest;
    const used = new Set();
    for (let i = 0; i < expected.length; i++) {
      const t = expected[i];
      if (t in flagsHere) {
        used.add(t);
        if (i + 1 < expected.length && !expected[i + 1].startsWith("--")) i++;
        continue;
      }
      add("build", wf, `the build passes \`${t}\`, which build.bat does not and nothing allows`);
    }
    for (const flag of Object.keys(flagsHere)) {
      if (!used.has(flag)) add("stale", wf, `the allowance for the build's \`${flag}\` matches nothing`);
    }
  }

  for (let i = 1; i < names.length; i++) {
    const a = compared[names[0]];
    const b = compared[names[i]];
    if (a.join("\n") === b.join("\n")) continue;
    let at = 0;
    while (at < a.length && a[at] === b[at]) at++;
    add("differ", `${names[0]} / ${names[i]}`,
      `the gate steps part at step ${at + 1}: \`${a[at] ?? "(none)"}\` against \`${b[at] ?? "(none)"}\``);
  }
  return out;
}

// ---------------------------------------------------------------- probes

const P_TEST = [
  '@pushd "%~dp0"',
  "node scripts/a.mjs",
  "@if errorlevel 1 goto :fail",
  "@rem node scripts/commented.mjs",
  "node scripts/b.mjs",
].join("\r\n");
const P_CHECK = "node scripts/fresh.mjs\nnode scripts/c.mjs --check\n";
const P_BUILD = "node builder\\tbdocs.mjs --src docs --check-audit-index %*\n";
const P_ALLOWED = {
  localOnly: { "fresh.mjs": "probe" },
  ciOnly: [{ script: "ci.mjs", args: "", workflows: ["one.yml"], why: "probe" }],
  buildFlags: { "two.yml": { "--url": "probe" } },
  requiredBuildFlags: { "--no-fetch-assets": "probe" },
};
const BUILD_ONE = "node builder/tbdocs.mjs --src docs --no-fetch-assets --check-audit-index";
const BUILD_TWO = "node builder/tbdocs.mjs --src docs --url '${{ steps.pages.outputs.origin }}' --no-fetch-assets --check-audit-index";
const GOOD = ["a.mjs", "b.mjs", "c.mjs --check"];

function wf(gates, build) {
  const steps = [{ name: "Checkout", uses: "actions/checkout@v5" }];
  if (build) steps.push({ name: "Build", run: build });
  for (const g of gates) steps.push({ name: g, run: `node scripts/${g}` });
  return { jobs: { [JOB]: { steps } } };
}

function pair(one, two) {
  return { "one.yml": one, "two.yml": two };
}

const PROBES = [
  ["the recorded differences alone", {}, []],
  ["a gate missing from one workflow",
    { workflows: pair(wf(["a.mjs", "c.mjs --check", "ci.mjs"], BUILD_ONE), wf(GOOD, BUILD_TWO)) },
    ["missing", "differ"]],
  ["a step neither wrapper runs",
    { workflows: pair(wf([...GOOD, "ci.mjs", "x.mjs"], BUILD_ONE), wf([...GOOD, "x.mjs"], BUILD_TWO)) },
    ["extra"]],
  ["two gates reordered in both workflows",
    { workflows: pair(wf(["b.mjs", "a.mjs", "c.mjs --check", "ci.mjs"], BUILD_ONE), wf(["b.mjs", "a.mjs", "c.mjs --check"], BUILD_TWO)) },
    ["order"]],
  ["the two wrappers interleaved alike",
    { workflows: pair(wf(["a.mjs", "c.mjs --check", "b.mjs", "ci.mjs"], BUILD_ONE), wf(["a.mjs", "c.mjs --check", "b.mjs"], BUILD_TWO)) },
    []],
  ["the two workflows interleaved differently",
    { workflows: pair(wf(["a.mjs", "c.mjs --check", "b.mjs", "ci.mjs"], BUILD_ONE), wf(GOOD, BUILD_TWO)) },
    ["differ"]],
  ["a gate's arguments changed",
    { workflows: pair(wf(["a.mjs", "b.mjs", "c.mjs", "ci.mjs"], BUILD_ONE), wf(["a.mjs", "b.mjs", "c.mjs"], BUILD_TWO)) },
    ["missing", "extra"]],
  ["a gate added to test.bat and not to CI",
    { testBat: `${P_TEST}\r\nnode scripts/d.mjs\r\n` },
    ["missing"]],
  ["a build without --check-audit-index",
    { workflows: pair(wf([...GOOD, "ci.mjs"], BUILD_ONE), wf(GOOD, BUILD_TWO.replace(" --check-audit-index", ""))) },
    ["build"]],
  ["a build without --no-fetch-assets",
    { workflows: pair(wf([...GOOD, "ci.mjs"], BUILD_ONE.replace(" --no-fetch-assets", "")), wf(GOOD, BUILD_TWO)) },
    ["build"]],
  ["a build argument nothing allows",
    { workflows: pair(wf([...GOOD, "ci.mjs"], `${BUILD_ONE} --no-offline`), wf(GOOD, BUILD_TWO)) },
    ["build"]],
  ["a workflow with no build",
    { workflows: pair(wf([...GOOD, "ci.mjs"]), wf(GOOD, BUILD_TWO)) },
    ["build"]],
  ["allowances that match nothing",
    { workflows: pair(wf(GOOD, BUILD_ONE), wf(GOOD, BUILD_ONE)) },
    ["stale"]],
];

function runProbes() {
  const failures = [];
  for (const [name, override, want] of PROBES) {
    const input = {
      testBat: P_TEST, checkBat: P_CHECK, buildBat: P_BUILD,
      workflows: pair(wf([...GOOD, "ci.mjs"], BUILD_ONE), wf(GOOD, BUILD_TWO)),
      allowed: P_ALLOWED,
      ...override,
    };
    const got = [...new Set(findings(input).map((f) => f.kind))].sort();
    const expected = [...want].sort();
    if (got.join(",") !== expected.join(",")) {
      failures.push(`${name}: expected [${expected.join(", ")}], got [${got.join(", ")}]`);
    }
  }
  return failures;
}

// ------------------------------------------------------------------ main

const probeFailures = runProbes();
if (probeFailures.length) {
  console.error(`check_ci_workflows: ${probeFailures.length} of ${PROBES.length} probes failed:`);
  for (const f of probeFailures) console.error(`  ${f}`);
  process.exit(2);
}
console.log(`check_ci_workflows: ${PROBES.length} probes, all pass`);

const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
const workflows = {};
for (const name of WORKFLOWS) workflows[name] = yaml.load(read(`.github/workflows/${name}`));
const found = findings({
  testBat: read("test.bat"),
  checkBat: read("check.bat"),
  buildBat: read("build.bat"),
  workflows,
  allowed: ALLOWED,
});

if (found.length) {
  console.error(`check_ci_workflows: ${found.length} finding(s):`);
  for (const f of found) console.error(`  ${f.where}: ${f.kind}: ${f.text}`);
  process.exit(1);
}
const gateCount = gateSteps(read("test.bat")).length
  + gateSteps(read("check.bat")).filter((s) => !(s.script in ALLOWED.localOnly)).length;
console.log(`check_ci_workflows: both workflows run the wrappers' ${gateCount} gates, and build as build.bat does`);
