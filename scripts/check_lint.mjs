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
// With --staged it lints only the scripts the next commit adds or changes,
// which is how the pre-commit hook in .githooks/ runs it. Biome keeps those
// its scope includes, and a commit whose scripts it excludes checks none and
// is clean. A commit that stages no script returns before Biome starts. A
// partly staged file is linted as it is in the working tree.
//
//   node scripts/check_lint.mjs              # the whole scope: test.bat and CI
//   node scripts/check_lint.mjs --staged     # the staged scripts: the hook
//
// Exit codes: 0 clean, 1 a finding, 2 a refused command line, Biome could not lint or,
// over the whole scope, checked no script, or a crash.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";

exitOnCrash();

function cannotLint(message) {
  console.error(`check_lint: ${message}`);
  process.exit(2);
}

// A command-line error prints the message, then the first line of the usage.
const SYNOPSIS = "usage: node scripts/check_lint.mjs [--staged]";
const USAGE = `${SYNOPSIS}

Runs the pinned Biome over the tooling and the site's scripts, and fails on a
warning as well as an error.

  --staged    lint only the scripts the next commit adds or changes
  -h, --help  print this text and exit

Exit codes:
  0  Biome found nothing (--staged: or no script is staged, so nothing was linted)
  1  Biome found an error or a warning
  2  the gate could not lint: a refused command line, git or Biome failing to run,
     Biome checking no script over the whole scope, or a crash`;
const cli = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: { staged: { type: "boolean", default: false }, help: { type: "boolean", short: "h" } },
      positionals: 0,
      stopAt: ["help"],
    }),
  { format: (err) => `check_lint: ${err.message}\n${SYNOPSIS}` },
);
if (cli.values.help) printHelpAndExit(USAGE);
if (cli.tokens.length > (cli.values.staged ? 1 : 0)) {
  const bare = cli.tokens.some((t) => t.kind === "option-terminator");
  console.error(`check_lint: ${bare ? "unexpected argument: --" : "--staged given more than once"}\n${SYNOPSIS}`);
  process.exit(2);
}
const staged = cli.values.staged;

// The scripts the next commit adds or changes that are still on disk, by the
// two extensions the scope in biome.jsonc is made of.
function stagedScripts() {
  const r = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (r.error) cannotLint(`could not run git: ${r.error.message}`);
  if (r.status !== 0) cannotLint(`git diff --cached failed: ${r.stderr.trim()}`);
  return r.stdout.split("\0").filter((f) => /\.m?js$/.test(f) && existsSync(path.join(REPO_ROOT, f)));
}

const scripts = staged ? stagedScripts() : [];
if (staged && !scripts.length) process.exit(0);

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
  const args = ["lint", "--error-on-warnings", "--reporter=default", "--reporter=summary", `--reporter-file=${file}`];
  if (staged) args.push("--no-errors-on-unmatched", "--", ...scripts);
  run = spawnSync(process.execPath, [biome, ...args], { cwd: REPO_ROOT, stdio: ["ignore", "inherit", "inherit"] });
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
if (summary.checked === null) cannotLint("Biome's summary does not say how many files it checked");
// The whole scope has to reach a script; the count includes biome.jsonc.
if (!staged && summary.checked < 2) cannotLint("Biome checked no script: the scope biome.jsonc names matches none");
