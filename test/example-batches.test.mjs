// Runs check_examples.mjs's probes: the fence classifier, the markup, the
// batching, the splitting and crash isolation, the canaries and the report.
//
// check_examples.mjs runs them before every run, but that needs a twinBASIC
// install to be worth starting, so it runs only by hand. The probes need no
// IDE -- crash isolation is driven through a fake lane -- so they run here
// too, where CI runs them.
//
// Runs with a bare `node --test test/example-batches.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { test } from "node:test";
import { runProbes } from "../scripts/lib/example-batches.mjs";

test("check_examples' probes pass", async () => {
  const said = [];
  const passed = await runProbes((...a) => said.push(a.join(" ")));
  assert.ok(passed, said.join("\n"));
});
