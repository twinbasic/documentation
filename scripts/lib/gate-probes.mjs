// What the gates' self-tests share: the probe accumulator and its report, and a
// scratch baseline file for the two drift guards.
//
// Every export here does its work when called, never on import.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// A probe list for the gate `tool`. `check(name, ok, detail)` records one probe;
// `report()` prints a line for each, with a failed probe's detail under it,
// every line of the detail indented alike, then a summary, and returns the exit
// code: 1 if any probe failed. `onFailure`, when given, ends the summary of a
// failed run, to say what a failed probe means.
export function createProbes(tool, onFailure) {
  const results = [];
  return {
    check(name, ok, detail) {
      results.push({ name, ok, detail });
    },
    report() {
      const failures = results.filter((r) => !r.ok).length;
      for (const { name, ok, detail } of results) {
        console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
        if (!ok && detail) console.log(`       ${String(detail).replaceAll("\n", "\n       ")}`);
      }
      console.log(
        failures
          ? `${tool}: ${failures} of ${results.length} probes failed${onFailure ? ` -- ${onFailure}` : ""}`
          : `${tool}: ${results.length} probes, all pass`
      );
      return failures ? 1 : 0;
    },
  };
}

// withBaseline(initial, fn) for a drift guard whose baseline is the JSON file
// `name`. fn(file) runs with `file` in a fresh folder in the system temp
// directory, holding `initial` as JSON, or absent when `initial` is null; the
// folder is removed whatever fn does. So no probe touches the real baseline
// under builder/.
export function baselineFixture(name) {
  return async (initial, fn) => {
    const dir = await mkdtemp(path.join(tmpdir(), `tb-${path.basename(name, ".json")}-`));
    const file = path.join(dir, name);
    try {
      if (initial) await writeFile(file, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
      return await fn(file);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}
