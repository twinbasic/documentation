// A project's own test cases, found in its sources and run in an IDE: what
// `tbrun --tests` does, and so what a reproducer of mode "test" asks
// (scripts/bug_repro.mjs).
//
// Two kinds of case:
//
//   * A unit test: a parameterless Sub marked [TestCase] in a Module marked
//     [TestFixture], twinBASIC's own form, checked with the Assert package. It
//     is run with the compiler's test mode: the debugger's `evaluate` request
//     with `isTest: true`, the request the IDE's CodeLens "run" link sends,
//     plus that flag. In test mode a failed assertion, an unhandled run-time
//     error and an access violation each end the case and come back as the
//     response's `body.error`, with the line in `body.lineNumber`, and the next
//     case runs; with no `body.error` the case passed. Without the flag a failed
//     assertion stops the run at an error panel instead, and `On Error` cannot
//     catch it. In BETA 1005 the IDE itself never sets the flag: it offers no
//     way to run a test (a [TestCase] Sub gets no CodeLens "run" link, and
//     main.js's handler for the compiler's custom/provideTests request is
//     empty). WIP.Harness.md, "Running a project's test cases", has the rest.
//   * A compile case, for a defect that is a compile-time diagnostic, which no
//     unit test can assert: a line of source ending in a comment
//     `' CASE <Name>: TB5074` (one or more codes, comma-separated),
//     `' CASE <Name>: error` or `' CASE <Name>: none`. It passes when the IDE
//     reports each code named on that line; for `error`, any error on it (for a
//     defect whose fix may choose its own diagnostic); for `none`, nothing at
//     all on it.

import { MODIFIERS } from "./twin-declarations.mjs";

// One attribute at the start of what is left of a line: [Name] or [Name(args)],
// where args may hold quoted strings. The name and the arguments are captured.
const ATTRIBUTE_RE = /^[ \t]*\[[ \t]*(\w+)[ \t]*(?:\(((?:"[^"]*"|[^)"])*)\))?[ \t]*\]/;
const MODULE_RE = new RegExp(`^[ \\t]*(?:(?:${MODIFIERS})[ \\t]+)*Module[ \\t]+(\\w+)`, "i");
const END_MODULE_RE = /^[ \t]*End[ \t]+Module\b/i;
const SUB_RE = new RegExp(`^[ \\t]*(?:(?:${MODIFIERS})[ \\t]+)*(Sub|Function)[ \\t]+(\\w+)[ \\t]*(\\([^)]*\\))?`, "i");
const COMMENT_RE = /^[ \t]*(?:'|Rem\b)/i;
const CASE_RE = /'[ \t]*CASE[ \t]+(\w+)[ \t]*:[ \t]*(none|error|TB\d+(?:[ \t]*,[ \t]*TB\d+)*)[ \t]*$/i;
// A diagnostic row as the IDE's PROBLEMS panel gives it to compileOutcome:
// "{ERROR} /Project/Sources/Startup.twin [19,28]: TB5074 Cannot construct ...".
const ROW_RE = /^\{(\w+)\}[ \t]+(\S+)[ \t]+\[(\d+),\d+\]:[ \t]+(TB\d+)/;

// A row's file as findCases names it: its path under the project's Sources/ folder, in lower case, or
// null for a file elsewhere, such as a package's.
const underSources = (row) => /^\/[^/]+\/Sources\/(.+)$/i.exec(row)?.[1].toLowerCase() ?? null;

const isOn = (arg) => arg === undefined || !/^\s*False\s*$/i.test(arg);

/**
 * The cases in a project's sources.
 *
 * @param {{name: string, text: string}[]} files  the .twin files, each named by its path under Sources/, such as
 *   "Tests/Probe.twin"
 * @returns {{tests: {fixture: string, name: string, file: string, line: number}[],
 *            compiles: {name: string, file: string, line: number, codes: string[], anyError: boolean}[],
 *            problems: string[]}}
 *   `codes` is empty for `none` and for `error`, which sets `anyError`. `problems` names a [TestCase] the runner cannot
 *   call: one with parameters, a Function, or one outside a [TestFixture] module.
 */
export function findCases(files) {
  const tests = [];
  const compiles = [];
  const problems = [];
  for (const { name: file, text } of files) {
    let fixture = null;
    let pending = [];
    text.split(/\r?\n/).forEach((raw, i) => {
      const line = i + 1;
      const marker = CASE_RE.exec(raw);
      if (marker) {
        const what = marker[2].toLowerCase();
        const codes = what === "none" || what === "error" ? [] : what.split(",").map((c) => c.trim().toUpperCase());
        compiles.push({ name: marker[1], file, line, codes, anyError: what === "error" });
      }
      if (COMMENT_RE.test(raw) || !raw.trim()) return;
      let rest = raw;
      for (let m; (m = ATTRIBUTE_RE.exec(rest)); rest = rest.slice(m[0].length)) {
        pending.push({ name: m[1], on: isOn(m[2]) });
      }
      if (!rest.trim() || COMMENT_RE.test(rest)) return;
      const has = (n) => pending.some((a) => a.on && a.name.toLowerCase() === n);
      const mod = MODULE_RE.exec(rest);
      if (mod) fixture = has("testfixture") ? mod[1] : null;
      else if (END_MODULE_RE.test(rest)) fixture = null;
      else if (has("testcase")) {
        const sub = SUB_RE.exec(rest);
        const where = `${file} line ${line}`;
        if (!sub) problems.push(`${where}: [TestCase] is not on a Sub`);
        else if (!fixture) problems.push(`${where}: [TestCase] Sub ${sub[2]} is not in a [TestFixture] Module`);
        else if (sub[1].toLowerCase() !== "sub")
          problems.push(`${where}: [TestCase] ${sub[2]} is a Function, not a Sub`);
        else if (sub[3] && sub[3].slice(1, -1).trim())
          problems.push(`${where}: [TestCase] Sub ${sub[2]} takes arguments`);
        else tests.push({ fixture, name: sub[2], file, line });
      }
      pending = [];
    });
  }
  return { tests, compiles, problems };
}

/**
 * Judges the compile cases by the diagnostics the IDE reported.
 *
 * @param {{name: string, file: string, line: number, codes: string[], anyError: boolean}[]} compiles
 * @param {string[]} rows  compileOutcome's rows
 * @returns {{name: string, pass: boolean, detail: string}[]}
 */
export function judgeCompiles(compiles, rows) {
  const reported = rows.map((r) => ROW_RE.exec(r)).filter(Boolean);
  return compiles.map(({ name, file, line, codes, anyError }) => {
    const rowsHere = reported.filter((m) => Number(m[3]) === line && underSources(m[2]) === file.toLowerCase());
    const here = rowsHere.map((m) => m[4].toUpperCase());
    const got = here.length ? [...new Set(here)].join(", ") : "none";
    const pass = anyError
      ? rowsHere.some((m) => m[1].toUpperCase() === "ERROR")
      : codes.length
        ? codes.every((c) => here.includes(c))
        : !here.length;
    const wanted = anyError ? "an error" : codes.length ? codes.join(", ") : "none";
    return { name, pass, detail: pass ? "" : `expected ${wanted} on ${file} line ${line}, got ${got}` };
  });
}

/**
 * Runs one [TestCase] Sub in the compiler's test mode.
 *
 * @param {object} c  a tb-cdp connection to an IDE whose project compiled clean
 * @param {{fixture: string, name: string}} test
 * @param {number} timeoutMs
 * @returns {Promise<{pass: boolean, detail: string}>}  `detail` is the failure,
 *   on one line, with the line the case stopped on when the compiler gives it
 */
export async function runTest(c, { fixture, name }, timeoutMs) {
  const expression = JSON.stringify(`${fixture}.${name}`);
  const r = await c.evaluate(
    `new Promise((done) => {
      const timer = setTimeout(() => done({ timedOut: true }), ${Number(timeoutMs)});
      debugSocket.request("evaluate", { expression: ${expression}, isTest: true }, (e) => {
        clearTimeout(timer);
        done({ success: !!e.success, message: e.message || "", body: e.body || null });
      });
    })`,
    { awaitPromise: true, timeout: timeoutMs + 5000 },
  );
  const oneLine = (s) =>
    String(s)
      .replace(/\s*\r?\n\s*/g, " ")
      .trim();
  if (r.timedOut) return { pass: false, detail: `no answer from the compiler after ${timeoutMs / 1000} s` };
  // success false: the expression did not compile, as for a Sub that is not there.
  if (!r.success) return { pass: false, detail: oneLine(r.message || "the compiler refused to run it") };
  if (r.body?.error) {
    const at = r.body.lineNumber > 0 ? ` (line ${r.body.lineNumber})` : "";
    return { pass: false, detail: `${oneLine(r.body.error)}${at}` };
  }
  return { pass: true, detail: "" };
}

/** A case's line as tbrun prints it. */
export const caseLine = (name, { pass, detail }) => `${pass ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`;
