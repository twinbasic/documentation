// Runs check_examples.mjs's probes: the fence classifier, the markup, the
// batching, the splitting and crash isolation, the canaries and the report.
// Also runs vb6run.mjs's probes (scripts/lib/vb6.mjs): the Debug.Print rewrite,
// the generated modules, the reading of VB6's make log and the Windows-1252
// encoding. vb6run.mjs is the run side of the same samples, built in VB6, and
// shares check_run's fence reader and output comparison with check_examples.mjs.
//
// check_examples.mjs runs its probes before every run, but that needs a twinBASIC
// install to be worth starting, so it runs only by hand. The probes need no
// IDE -- crash isolation is driven through a fake lane -- and the VB6 ones need
// no VB6, so they run here too, where CI runs them.
//
// Runs with a bare `node --test test/example-batches.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { test } from "node:test";
import { runProbes } from "../scripts/lib/example-batches.mjs";
import {
  HarnessError,
  harnessProblems,
  OVERRIDES,
  optionSeconds,
  readHarness,
  timeoutMs,
} from "../scripts/lib/harness-settings.mjs";
import { BUILD_FAILED, LLVM_REFUSAL, linkedLog } from "../scripts/lib/tb-ide.mjs";
import { buildTimeoutMessage, checkCapture } from "../scripts/lib/tb-run.mjs";
import { vb6Probes } from "../scripts/lib/vb6.mjs";

test("check_examples' probes pass", async () => {
  const said = [];
  const passed = await runProbes((...a) => said.push(a.join(" ")));
  assert.ok(passed, said.join("\n"));
});

// What a build's log says, as compileProject reads it for check_examples: a line
// that matches BUILD_FAILED is a failed build (exit 5, isolated and reported
// against its samples), not a harness failure.
test("the failure lines of a build and a run are read as a failed build", () => {
  for (const line of [
    "[LINKER] FAILED to create output file",
    "[BUILD] failed",
    "[LINKER] compilation (codegen) error detected in 'Startup.Main' at line #3",
    "LLVM compilation error in 'StaticRegex.AppendStr': a feature used in your code is not yet supported with the LLVM compiler.",
    "[LLVM] codegen error occurred when compiling 'Bitmap.New': Call parameter type does not match function signature!",
  ]) {
    assert.ok(BUILD_FAILED.test(line), line);
  }
  for (const line of [
    "[BUILD] Starting...",
    "[LINKER] SUCCESS created output file 'C:\\x.exe'",
    "[LLVM] cache ready",
  ]) {
    assert.ok(!BUILD_FAILED.test(line), line);
  }
  // The BETA 1010 run: the build succeeds, the run starts, and the codegen error stops it.
  const captured = [
    "[BUILD] Starting...",
    "[LINKER] SUCCESS created output file 'C:\\x.exe'",
    "[BUILD] Executing 'P.tbxRun.tbxRunAll'...",
    "[LLVM] codegen error occurred when compiling 'Bitmap.New': Call parameter type does not match function signature!",
  ];
  assert.equal(checkCapture(captured, []).buildFailed, captured[3]);
});

// test/harness.md: an LLVM refusal fails the build wherever it is printed, with or
// without [LLVM], before the link line or after Executing, an exe linked or not.
test("an LLVM refusal is a failed build wherever it is", () => {
  const refusals = [
    "LLVM compilation error in 'StaticRegex.AppendStr': a feature used in your code is not yet supported with the LLVM compiler.",
    "[LLVM] LLVM compilation error in 'StaticRegex.AppendStr': a feature used in your code is not yet supported.",
    "[LLVM] codegen error occurred when compiling 'Bitmap.New': Call parameter type does not match function signature!",
    "codegen error occurred when compiling 'Img.New': Call parameter type does not match function signature!",
  ];
  for (const line of refusals) {
    assert.ok(LLVM_REFUSAL.test(line), line);
    assert.ok(BUILD_FAILED.test(line), line);
  }
  assert.ok(!LLVM_REFUSAL.test("[BUILD] failed"));
  assert.ok(!LLVM_REFUSAL.test("note: LLVM compilation error in 'X' quoted"));
  const linked = ["[BUILD] Starting...", "[LINKER] SUCCESS created output file 'C:\\x.exe'"];
  const executing = "[BUILD] Executing 'P.tbxRun.tbxRunAll'...";
  // Erased by the run's Debug.Cls, before the link line: the build's own lines.
  const before = ["[BUILD] Starting...", refusals[3], linked[1], executing];
  assert.equal(checkCapture(["the run's output"], before).lost, refusals[3]);
  // Erased after Executing, as BETA 1010 prints tbRegExp's.
  const after = [...linked, executing, refusals[0]];
  assert.equal(checkCapture(["the run's output"], after).lost, refusals[0]);
  // A build log with no refusal, and a clean run, is not a failure.
  const clean = checkCapture(["the run's output"], [...linked, executing]);
  assert.equal(clean.lost, undefined);
  assert.equal(clean.buildFailed, undefined);
  // A build-timeout capture says so as a timeout; any other ending says nothing.
  assert.match(buildTimeoutMessage({ ended: "build-timeout", limitMs: 1500 }), /^timeout: .* within 1\.5 s /);
  assert.equal(buildTimeoutMessage({ ended: "run-timeout", limitMs: 60000 }), undefined);
});

// buildProject follows a [RunAfterBuild] run's compile after the link (linkedLog): the
// BETA 1010 tbRegExp log, where LLVM refuses only after Executing, fails the build.
test("a build that links reads on through the run's compile", () => {
  const start = "[BUILD] Starting...";
  const linked = "[LINKER] SUCCESS created output file 'C:\\x.exe'";
  const executing = "[BUILD] Executing 'DocSamples0.tbxRun.tbxRunAll'...";
  const refused =
    "LLVM compilation error in 'StaticRegex.AppendStr': a feature used in your code is not yet supported with the LLVM compiler.";
  assert.equal(linkedLog([start]), null);
  assert.equal(linkedLog([start, refused]), null, "not linked yet: the build's own wait decides");
  assert.equal(linkedLog([start, linked, "[LINKER]    Launch EXE  Open Folder"]), "linked");
  assert.equal(linkedLog([start, linked, executing]), "executing");
  assert.equal(linkedLog([start, linked, executing, ""]), "executing", "a blank line is no output");
  assert.equal(linkedLog([start, linked, executing, refused, ""]), "refused");
  assert.equal(linkedLog([start, refused, linked]), "refused", "a refusal before the link");
  assert.equal(linkedLog([start, linked, executing, "probe ran"]), "ran");
});

// lib/harness-settings.mjs, the reader of test/harness.json (test/harness.md).
test("test/harness.json is read as its contract says", () => {
  const good = readHarness();
  assert.equal(good.version, 1);
  assert.deepEqual(harnessProblems(good), []);
  const copy = () => JSON.parse(JSON.stringify(good));
  const problems = (mutate) => {
    const d = copy();
    mutate(d);
    return harnessProblems(d);
  };
  // The version: missing, newer or not a whole number is refused.
  assert.equal(problems((d) => delete d.version).length, 1);
  assert.match(problems((d) => (d.version = 2)).join(), /newer than this reader knows/);
  assert.equal(problems((d) => (d.version = "1")).length, 1);
  // Unknown keys at every level, and a missing timeout.
  assert.match(problems((d) => (d.extra = 1)).join(), /extra: not a known key/);
  assert.match(problems((d) => (d.timeouts.complie = 30)).join(), /timeouts\.complie: not a known key/);
  assert.match(problems((d) => delete d.timeouts.exeRun).join(), /timeouts\.exeRun: missing/);
  assert.match(problems((d) => (d.exclusions.fast = {})).join(), /exclusions: fast: not a mode/);
  assert.match(problems((d) => (d.exclusions.llvm.X = { run: "*" })).join(), /llvm\.X\.run: not a stage/);
  assert.match(problems((d) => (d.exclusions.compile = { X: { "compiler-run": "*" } })).join(), /no stage but build/);
  // A timeout that is not a number of seconds greater than 0; decimals are allowed.
  for (const bad of [0, -1, "30", null]) {
    assert.equal(problems((d) => (d.timeouts.build = bad)).length, 1, String(bad));
  }
  assert.deepEqual(
    problems((d) => (d.timeouts.build = 0.5)),
    [],
  );
  assert.equal(harnessProblems([]).length, 1);
  // The overrides: option, then variable, then file; seconds in, ms out.
  const harness = copy();
  harness.timeouts.compile = 30;
  assert.equal(timeoutMs("compile", undefined, { env: {}, harness }), 30000);
  assert.equal(timeoutMs("compile", undefined, { env: { TB_COMPILE_TIMEOUT: "2.5" }, harness }), 2500);
  assert.equal(timeoutMs("compile", 0.25, { env: { TB_COMPILE_TIMEOUT: "2.5" }, harness }), 250);
  assert.equal(timeoutMs("projectOpen", undefined, { env: { TB_PROJECT_OPEN_TIMEOUT: "1" }, harness }), 15000);
  for (const bad of ["0", "-3", "abc", " "]) {
    assert.throws(
      () => timeoutMs("build", undefined, { env: { TB_BUILD_TIMEOUT: bad }, harness }),
      (e) =>
        e instanceof HarnessError && /^TB_BUILD_TIMEOUT expects a number of seconds greater than 0/.test(e.message),
      bad,
    );
  }
  // Every override key has its option and its variable, as the contract names them.
  assert.deepEqual(
    Object.entries(OVERRIDES).map(([k, o]) => `${k} --${o.option} ${o.variable}`),
    [
      "compile --compile-timeout TB_COMPILE_TIMEOUT",
      "build --build-timeout TB_BUILD_TIMEOUT",
      "compilerRun --compiler-run-timeout TB_COMPILER_RUN_TIMEOUT",
      "compilerRunQuiet --compiler-run-quiet TB_COMPILER_RUN_QUIET",
      "exeRun --exe-run-timeout TB_EXE_RUN_TIMEOUT",
    ],
  );
  // An option is parsed by the tool, its first given name winning.
  assert.equal(optionSeconds({ timeout: "4" }, ["compile-timeout", "timeout"]), 4);
  assert.equal(optionSeconds({ compileTimeout: "1.5", timeout: "4" }, ["compile-timeout", "timeout"]), 1.5);
  assert.equal(optionSeconds({}, ["compile-timeout"]), undefined);
  assert.throws(
    () => optionSeconds({ buildTimeout: "0" }, ["build-timeout"]),
    /--build-timeout expects a number greater than 0/,
  );
});

test("vb6run's probes pass", () => {
  const probes = vb6Probes();
  assert.ok(probes.length > 0, "vb6Probes() returned no probes");
  const failed = probes.filter((p) => !p.ok);
  assert.deepEqual(
    failed.map((p) => `${p.name}: ${p.detail ?? ""}`),
    [],
  );
});
