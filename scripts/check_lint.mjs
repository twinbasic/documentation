#!/usr/bin/env node
// The lint gate: the pinned Biome over the scope biome.jsonc names.
//
// The rules are the ones that find defects -- Biome's correctness and
// suspicious groups -- and none about style. Moving and deleting code leaves
// unused imports and undeclared names behind, and nothing else reads the
// tooling for them.
//
// Warnings fail as well as errors. Biome reports noUnusedImports and
// noUnusedVariables as warnings and exits 0 on warnings, so a plain
// `biome lint` passes a file full of unused imports; --error-on-warnings is
// what makes them findings.
//
// Biome's exit code cannot tell a finding from a gate that checked nothing. It
// exits 1 for a finding and also for a configuration it cannot read, and 0 for
// a scope that matches no script at all: it counts biome.jsonc itself as a
// file checked, so it never says that no files were processed. The summary it
// writes to a file beside its usual output tells them apart. A configuration
// it cannot read leaves no summary; the summary counts the findings, and the
// files checked.
//
//   node scripts/check_lint.mjs
//
// Exit codes: 0 clean, 1 a finding, 2 Biome could not lint, or checked no
// script.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.on("uncaughtException", (err) => { console.error(err); process.exit(2); });

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function cannotLint(message) {
  console.error(`check_lint: ${message}`);
  process.exit(2);
}

let biome;
try {
  biome = createRequire(import.meta.url).resolve("@biomejs/biome/bin/biome");
} catch {
  cannotLint("Biome is not installed; run npm install");
}

// What Biome's summary reporter wrote, or null when it wrote nothing.
function readSummary(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const checked = /\bChecked (\d+) files?\b/.exec(text);
  let found = 0;
  for (const m of text.matchAll(/\bFound (\d+) (?:errors?|warnings?)\b/g)) found += Number(m[1]);
  return { checked: checked ? Number(checked[1]) : null, found };
}

const dir = mkdtempSync(path.join(os.tmpdir(), "check_lint-"));
let run;
let summary;
try {
  const file = path.join(dir, "summary.txt");
  run = spawnSync(
    process.execPath,
    [biome, "lint", "--error-on-warnings", "--reporter=default", "--reporter=summary", `--reporter-file=${file}`],
    { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"] },
  );
  summary = readSummary(file);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (run.error) cannotLint(`could not start Biome: ${run.error.message}`);
if (!summary) cannotLint(`Biome stopped before linting (exit ${run.status}); its message is above`);
if (run.status !== 0) {
  if (summary.found > 0) process.exit(1);
  cannotLint(`Biome failed without a finding (exit ${run.status}); its message is above`);
}
// The count includes biome.jsonc.
if (summary.checked === null) cannotLint("Biome's summary does not say how many files it checked");
if (summary.checked < 2) cannotLint("Biome checked no script: the scope biome.jsonc names matches none");
