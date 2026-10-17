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
import { BUILD_FAILED } from "../scripts/lib/tb-ide.mjs";
import { checkCapture } from "../scripts/lib/tb-run.mjs";
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

test("vb6run's probes pass", () => {
  const probes = vb6Probes();
  assert.ok(probes.length > 0, "vb6Probes() returned no probes");
  const failed = probes.filter((p) => !p.ok);
  assert.deepEqual(
    failed.map((p) => `${p.name}: ${p.detail ?? ""}`),
    [],
  );
});
