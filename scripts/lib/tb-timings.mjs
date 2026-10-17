// Opt-in phase timings for the harness: how long an IDE takes to start, to open
// its project, to compile it, to build it and to run its [RunAfterBuild] Sub.
//
// Off unless TB_TIMINGS names a file. Then launchIde, waitForCompile,
// setBuildTarget, buildProject (tb-ide.mjs), captureRun (tb-run.mjs) and
// compileProject (tb-build.mjs) each append one JSON line per phase to it, and
// nothing else changes: no output, no exit code, no wait. Every line has `at`
// (epoch ms when it was written), `pid` and `tool` (the process and its script),
// `phase` and `project`; the other fields are the phase's own. A line is
// appended whole, so lanes and processes can share one file.

import { appendFileSync } from "node:fs";
import path from "node:path";

const FILE = process.env.TB_TIMINGS || null;
const TOOL = path.basename(process.argv[1] ?? "");

// The project each connection's IDE has open, for the phases that are given
// only the connection.
const projects = new WeakMap();

/** Whether timings are being written. */
export const timingsOn = FILE !== null;

/** Remember that connection `c` is to the IDE that has `project` open. */
export function timingProject(c, project) {
  if (FILE && c && project) projects.set(c, project);
}

/**
 * Append one phase's line. `c`, when given, names the project for a phase that
 * has only the connection; a `project` in `fields` wins over it.
 */
export function timing(phase, fields = {}, c = null) {
  if (!FILE) return;
  const project = fields.project ?? (c ? projects.get(c) : null) ?? null;
  const line = { at: Date.now(), pid: process.pid, tool: TOOL, phase, ...fields, project };
  try {
    appendFileSync(FILE, `${JSON.stringify(line)}\n`);
  } catch {
    // a timing that cannot be written must not change the run
  }
}
