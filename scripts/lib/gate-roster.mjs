// The gates a wrapper or a CI workflow runs, read from its own text.
//
// A wrapper runs one `node scripts/<name>.mjs` per line, chained with
// `@if errorlevel` rather than `&&`; a workflow runs one per step's `run:`.
// Both are read the same way: an invocation at the start of a line, so a
// commented line (`@rem`, `rem`, `#`) or a continuation never counts.
//
// check_gate_lists.mjs compares the wrappers with Tools.md's numbered lists,
// and check_ci_workflows.mjs compares them with the two workflows.

const GATE_LINE = /^\s*@?node\s+scripts[\\/]([A-Za-z0-9_]+\.mjs)[ \t]*(.*?)\s*$/;
const BUILD_LINE = /^\s*@?node\s+builder[\\/]tbdocs\.mjs[ \t]*(.*?)\s*$/;

function matchLines(text, re) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = re.exec(line);
    if (m) out.push(m);
  }
  return out;
}

/** The gate scripts a text invokes, in order, as `{script, args}`. */
export function gateSteps(text) {
  return matchLines(text, GATE_LINE).map((m) => ({ script: m[1], args: m[2] }));
}

/** The gate scripts a batch file invokes, in order: the names alone. */
export function gatesFromBat(src) {
  return gateSteps(src).map((s) => s.script);
}

/**
 * The arguments of the first tbdocs build a text runs, split into tokens, or
 * null if it runs none. A quoted token keeps its spaces, which a workflow's
 * `'${{ steps.pages.outputs.origin }}'` needs; a batch file's `%*` is dropped.
 */
export function buildArgs(text) {
  const m = matchLines(text, BUILD_LINE)[0];
  if (!m) return null;
  const out = [];
  const re = /'([^']*)'|"([^"]*)"|(\S+)/g;
  let t;
  while ((t = re.exec(m[1]))) {
    const token = t[1] ?? t[2] ?? t[3];
    if (token !== "%*") out.push(token);
  }
  return out;
}

/**
 * One job's steps from a parsed workflow, each with the gates and the build it
 * runs: `{name, gates, build}`.
 */
export function workflowSteps(workflow, job) {
  const steps = workflow?.jobs?.[job]?.steps ?? [];
  return steps.map((s) => ({
    name: s.name ?? s.uses ?? "",
    gates: gateSteps(s.run ?? ""),
    build: buildArgs(s.run ?? ""),
  }));
}
