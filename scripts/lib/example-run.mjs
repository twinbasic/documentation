// What check_examples.mjs needs to RUN a sample, and none of it needs an IDE:
// which fences may be run, what a fence says it prints, the generated
// dispatcher that calls each one, and the reading of what the run wrote.
//
// A fence marked `check_run` is a statement sample (slot=sub). It is built into a
// project with a generated `[RunAfterBuild]` Sub that calls each run sample's
// body in turn and prints a marker line around the call (`dispatcherText`),
// because `[RunAfterBuild]` is one per project (TB5114). The lines the run
// writes are split by those markers (`parseRun`) and each sample's share is
// compared with what its own text says it prints (`expectedOutput`,
// `judgeOutput`).
//
// The probes for all of it are in example-batches.mjs's `runProbes`.

import { HIDDEN_MARKER, RUN_MARKER, partOf } from "./tb-fences.mjs";
import { logicalLines } from "./twin-api.mjs";

/** The generated module, Sub and file that call every run sample. */
export const RUN_MODULE = "tbxRun";
export const RUN_SUB = "tbxRunAll";
export const RUN_FILE = "tbxRun.twin";

/** What a marker line starts with, and the line that says the dispatcher finished. */
export const RUN_TAG = "[tbx-run]";
export const RUN_DONE = `${RUN_TAG} done`;

/** A fence that is run: not context, not a resource file. */
export const isRunFence = (f) => !!f.flags?.has(RUN_MARKER) && !f.flags.has(HIDDEN_MARKER) && !f.isResource;

// ------------------------------------------------------------------ selection

// A bare `End` statement ends the whole run, on its own line or after `Then`,
// `Else` or a colon. Read from logicalLines, whose comments and string contents
// are already gone, so `' End` and `"End"` are not matches.
const ENDS_RUN = /(?:^|:|\bThen|\bElse)\s*End$/i;
export const PROMPTS = /\b(MsgBox|InputBox)\b/i;

/**
 * Why a run fence's own text cannot be run, or null.
 *
 * `MsgBox` and `InputBox` wait for a click on a private desktop nobody can see,
 * so the run would hang to its timeout; `End` ends the run, and every sample
 * after it. Comments and string literals are not code and are not read.
 */
export function runFenceProblem(content) {
  for (const { text } of logicalLines(content)) {
    const code = text.trim();
    const prompt = PROMPTS.exec(code);
    if (prompt) {
      return `calls ${prompt[1]}, which waits for a click on a desktop nobody sees, so the run would hang`;
    }
    if (ENDS_RUN.test(code)) return "contains an `End` statement, which ends the run and every sample after it";
  }
  return null;
}

/**
 * Whether a selected fence may be run, as a finding's message and detail, or
 * null when it may (or does not ask to). The fence has its slot already.
 */
export function runRefusal(fence) {
  if (!fence.flags?.has(RUN_MARKER)) return null;
  if (fence.flags.has(HIDDEN_MARKER)) {
    return {
      message: `\`${HIDDEN_MARKER}\` and \`${RUN_MARKER}\` contradict each other`,
      detail: "context is compiled and never run",
    };
  }
  if (fence.keys?.has("expect-error")) {
    return {
      message: `\`${RUN_MARKER}\` cannot be combined with expect-error`,
      detail: "a sample cannot both fail to compile and run",
    };
  }
  if (fence.slot !== "sub") {
    return {
      message: `${RUN_MARKER} runs statement samples (slot=sub) only`,
      detail: `this sample is slot=${fence.slot}${fence.base ? ` (inherits=${fence.base})` : ""}`,
    };
  }
  const problem = runFenceProblem(fence.content);
  return problem ? { message: `a \`${RUN_MARKER}\` sample ${problem}` } : null;
}

/**
 * Split the selection into what is built and run, and the rest.
 *
 * A run fence is a unit. A `projname` group holding one is run as a whole: every
 * visible member is staged in the run project, so the members that define what
 * the run fence uses are there, and only the run fences get a dispatcher call.
 * Hidden fences and resource files travel with their page, so the pages of the
 * run units' samples bring theirs to both lists.
 *
 * @returns {{run: object[], rest: object[]}}
 */
export function partitionRun(selected) {
  const groups = new Set(
    selected
      .filter(isRunFence)
      .map((f) => f.keys?.get("projname"))
      .filter(Boolean),
  );
  const travels = (f) => f.isResource || f.flags?.has(HIDDEN_MARKER);
  const inUnit = (f) => !travels(f) && (isRunFence(f) || groups.has(f.keys?.get("projname")));
  const pages = new Set(selected.filter(inUnit).map((f) => f.rel));
  return {
    run: selected.filter((f) => inUnit(f) || (travels(f) && pages.has(f.rel))),
    rest: selected.filter((f) => !inUnit(f)),
  };
}

// --------------------------------------------------------------------- output

/** The `'` that starts a comment: the first one outside a string literal (`""` escapes). */
function splitComment(line) {
  let inString = false;
  for (let k = 0; k < line.length; k++) {
    const c = line[k];
    if (c === '"') inString = !inString;
    else if (c === "'" && !inString) return { code: line.slice(0, k), comment: line.slice(k + 1) };
  }
  return { code: line, comment: null };
}

/**
 * What a fence says it prints.
 *
 * Either a `' Output:` comment line, whose following comment lines (up to the
 * first line that is not one) are the whole output, or a trailing comment on a
 * `Debug.Print` line, each of which states one line. A `Debug.Print` with no
 * trailing comment states nothing. When anything is stated, the output has
 * exactly that many lines.
 *
 * @returns {{stated: boolean, lines: {text: string, line: number}[]}}
 *   `line` is where the expected line is on the page
 */
export function expectedOutput(fence) {
  const rows = fence.content
    .replace(/\n+$/, "")
    .split("\n")
    .map((l) => l.replace(/\r$/, ""));
  const pageLine = (i) => (fence.concatParts ? partOf(fence.concatParts, i + 1)?.pageLine : null) ?? fence.line + 1 + i;

  const header = rows.findIndex((r) => /^\s*'\s*Output:\s*$/i.test(r));
  if (header >= 0) {
    const lines = [];
    for (let i = header + 1; i < rows.length && /^\s*'/.test(rows[i]); i++) {
      lines.push({ text: rows[i].replace(/^\s*' ?/, ""), line: pageLine(i) });
    }
    return { stated: true, lines };
  }

  const lines = [];
  rows.forEach((row, i) => {
    const { code, comment } = splitComment(row);
    if (comment === null || !/^\s*Debug\s*\.\s*Print\b/i.test(code)) return;
    if (comment.trim()) lines.push({ text: comment.trim(), line: pageLine(i) });
  });
  return { stated: lines.length > 0, lines };
}

/**
 * Compare what a sample printed with what it states, each line trimmed at both
 * ends (twinBASIC prints a number's sign space).
 *
 * @param {{stated: boolean, lines: {text: string, line: number}[]}} expected
 * @param {string[]} output  the lines the sample printed
 * @returns {{line: number | null, message: string, detail?: string}[]}
 *   one entry per mismatch; `line` is the expectation's page line, or null for
 *   a problem with the fence as a whole
 */
export function judgeOutput(expected, output) {
  if (!expected.stated) return [];
  const got = output.map((l) => l.trim());
  const want = expected.lines.map((l) => l.text.trim());
  if (got.length !== want.length) {
    return [
      {
        line: null,
        message: `prints ${got.length} line(s), the page states ${want.length}`,
        detail: `prints ${JSON.stringify(got)}, the page states ${JSON.stringify(want)}`,
      },
    ];
  }
  const problems = [];
  got.forEach((text, i) => {
    if (text !== want[i]) {
      problems.push({
        line: expected.lines[i].line,
        message: `prints ${JSON.stringify(text)}, the page says ${JSON.stringify(want[i])}`,
      });
    }
  });
  return problems;
}

// ----------------------------------------------------------------- dispatcher

/**
 * The generated `[RunAfterBuild]` Sub, calling each module's `tbxBody` in turn.
 *
 * Each call has an `On Error GoTo` handler of its own, so one sample's error
 * does not end the rest, and the error line is the way the run says which one
 * raised it. The handler is reached only by an error the sample did not handle.
 * Testing `Err.Number` after the call would not do: a procedure that handles an
 * error with `On Error Resume Next` returns with `Err` still set, in VB6 and in
 * twinBASIC alike (measured, BETA 995), so a sample that demonstrates an error
 * would be reported as raising it. The first statement is `Debug.Cls`, which
 * erases the IDE's own build log from the console, so what is left is the
 * dispatcher's.
 *
 * @param {string[]} modules  the generated module names, in the order the
 *   samples are numbered
 */
export function dispatcherText(modules) {
  const out = [`Module ${RUN_MODULE}`, "    [RunAfterBuild]", `    Public Sub ${RUN_SUB}()`, "        Debug.Cls"];
  modules.forEach((module, i) => {
    out.push(
      `        Debug.Print "${RUN_TAG} begin ${i}"`,
      "        Err.Clear",
      `        On Error GoTo tbxError${i}`,
      `        ${module}.tbxBody`,
      `        GoTo tbxNext${i}`,
      `tbxError${i}:`,
      `        Debug.Print "${RUN_TAG} error " & Err.Number & " " & Err.Description`,
      `        Resume tbxNext${i}`,
      `tbxNext${i}:`,
      "        On Error GoTo 0",
      `        Debug.Print "${RUN_TAG} end ${i}"`,
    );
  });
  out.push(`        Debug.Print "${RUN_DONE}"`, "    End Sub", "End Module", "");
  return out.join("\n");
}

const MARKER_RE = /^\[tbx-run\] (?:(begin|end) (\d+)|error (-?\d+)(?: (.*))?|(done))$/;

/**
 * Split the lines a run wrote by the dispatcher's markers.
 *
 * @param {string[]} lines  the captured console
 * @param {number} count    how many samples the dispatcher calls
 * @returns {{
 *   items: {began: boolean, ended: boolean, output: string[], error: {number: number, description: string} | null}[],
 *   began: number, done: boolean,
 * }}
 */
export function parseRun(lines, count) {
  const items = Array.from({ length: count }, () => ({ began: false, ended: false, output: [], error: null }));
  let current = -1,
    began = 0,
    done = false;
  for (const raw of lines) {
    const m = MARKER_RE.exec(raw.trim());
    if (!m) {
      if (current >= 0) items[current].output.push(raw);
      continue;
    }
    if (m[5]) {
      done = true;
    } else if (m[1] === "begin" && Number(m[2]) < count) {
      current = Number(m[2]);
      items[current].began = true;
      began++;
    } else if (m[1] === "end" && Number(m[2]) < count) {
      items[Number(m[2])].ended = true;
      current = -1;
    } else if (m[3] !== undefined && current >= 0) {
      items[current].error = { number: Number(m[3]), description: m[4] ?? "" };
    }
  }
  return { items, began, done };
}
