// What scripts/vb6run.mjs needs to build and run Visual Basic 6 code, none of it
// the command line: finding VB6, the Debug.Print rewrite, the generated
// modules, the project, `/make`, running the exe and reading what it wrote.
//
// WHY THIS EXISTS. A documented sample says what it prints in twinBASIC. Where
// twinBASIC claims to be compatible with VB6, the question worth asking is what
// the same code prints in VB6, and the only way to find out is to build it
// there. This is that build, made repeatable.
//
// ----------------------------------------------------- what had to be learned
//
//  1. VB6.EXE IS NEVER STARTED THROUGH A SHELL. In Git Bash a single-slash
//     `/make` or `/out` is rewritten as a path, and VB6 answers every switch it
//     does not know with a MODAL MESSAGE BOX on the user's desktop. It is spawned
//     here with an argument array and no `shell` option. `/make ... /out <log>`
//     writes a compile error to the log in place of a box.
//  2. A COMPILED EXE SHOWS A MODAL BOX for an unhandled run-time error, for
//     MsgBox and for InputBox. Three things stand between a sample and a box: the
//     generated dispatcher runs every sample under an error handler, a sample that
//     calls MsgBox or InputBox or contains `End` is refused before it is built
//     (example-run.mjs's runFenceProblem, the refusal check_run makes), and the
//     project is built with `Unattended=-1`, VB6's own "Unattended Execution",
//     which sends a message box or a run-time error to the Windows event log
//     instead of the screen.
//  3. Debug.Print WRITES NOTHING IN A COMPILED EXE. Each Debug.Print in the sample
//     is rewritten to `Print #511,` against a file the generated Main opens, and
//     `Print #` has the argument syntax of Debug.Print (`;`, `,`, Spc, Tab), so the
//     text is the same. VB6 writes the file in the ANSI code page: it is read back
//     as Windows-1252.
//  4. THE OUTPUT IS FLUSHED AFTER EVERY SAMPLE, because a sample that never
//     returns is ended by its pid at the time limit and an exe that is killed
//     loses what VB6 had buffered. The dispatcher closes and reopens the file
//     around each sample, so only the sample that hangs loses its output.
//  5. `Resume` AFTER A PROCEDURE'S OWN HANDLER. A procedure that handles an error
//     with `On Error Resume Next` returns with Err still set, in VB6 and in
//     twinBASIC, so the dispatcher cannot test Err after the call: its own
//     `On Error GoTo` handler is reached only by an error the sample did not
//     handle (the same design as example-run.mjs's dispatcherText).
//  6. A COMPILE ERROR STOPS VB6 AT THE FIRST FAILING MODULE, so a batch of
//     samples is built, the module the log names is dropped, and the rest is built
//     again, until a project builds.
//
// The probes for the rewrite are in vb6Probes() at the end.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { RUN_DONE, RUN_TAG, parseRun } from "./example-run.mjs";
import { logicalLines } from "./twin-api.mjs";

// ------------------------------------------------------------------- finding

/** Where VB6 is installed, after `--vb6` and `VB6_EXE`. */
export const VB6_DEFAULTS = [
  "C:\\Program Files (x86)\\Microsoft Visual Studio\\VB98\\VB6.EXE",
  "C:\\Program Files\\Microsoft Visual Studio\\VB98\\VB6.EXE",
];

/** The message that says how to point the tool at VB6. */
export const NO_VB6 =
  "no VB6 found: pass --vb6 <path to VB6.EXE>, set VB6_EXE, or install it at\n  " + VB6_DEFAULTS.join("\n  ");

/**
 * VB6.EXE, or null: the path given, else `VB6_EXE`, else the two standard
 * install folders. A path that was given and is not a file is not replaced by
 * a later candidate, so a typo is reported rather than hidden.
 */
export function findVb6(explicit, env = process.env) {
  const given = explicit ?? env.VB6_EXE;
  if (given) return existsSync(given) ? path.resolve(given) : null;
  return VB6_DEFAULTS.find((p) => existsSync(p)) ?? null;
}

// ------------------------------------------------------------------ encoding

// Windows-1252 differs from ISO 8859-1 only in 0x80..0x9F. Node's own TextDecoder
// is not used for it: a Node built with small ICU decodes that range as ISO 8859-1.
// biome-ignore format: a table, eight to a line
const ANSI_HIGH_CODES = [
  0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021,
  0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f,
  0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178,
];
const ANSI_HIGH = new Map(ANSI_HIGH_CODES.map((code, i) => [String.fromCodePoint(code), 0x80 + i]));

/** Text as the bytes VB6 reads: Windows-1252, with `?` for what the page cannot hold. */
export function encodeAnsi(text) {
  const out = [];
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) out.push(code);
    else out.push(ANSI_HIGH.get(ch) ?? 0x3f);
  }
  return Buffer.from(out);
}

/** The text of bytes VB6 wrote. */
export const decodeAnsi = (buf) =>
  Array.from(Buffer.from(buf), (b) => String.fromCodePoint(b >= 0x80 && b < 0xa0 ? ANSI_HIGH_CODES[b - 0x80] : b)).join(
    "",
  );

/** The lines of a text, a closing newline not counting as one more. */
export function splitLines(text) {
  const lines = String(text).split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

// --------------------------------------------------------------- the rewrite

/** The file number the sample's output goes to: 511 is in the range VB6 keeps private to the process. */
export const OUT_FILE = 511;

// A word, as the rewrite reads one. A type character (`$`, `%`...) is left to be the next token.
const WORD = /[A-Za-z_][A-Za-z0-9_]*/y;
const MEMBER_PRINT = /^\s*\.\s*Print(?![A-Za-z0-9_])/i;

function rewriteLine(line, fileNumber) {
  let out = "";
  let count = 0;
  let i = 0;
  // Whether a statement may start here: the start of the line, after `:`, after
  // `Then` and after `Else`. It is what makes `Rem` a comment and nothing else.
  let statement = true;
  // Whether the last token was a dot, so `Foo.Debug.Print` is a member of Foo's.
  let afterDot = false;
  while (i < line.length) {
    const c = line[i];
    if (c === '"') {
      // A string literal; `""` is a quote inside it. VB6's strings end with the line.
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '"') {
          if (line[j + 1] === '"') {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      out += line.slice(i, j + 1);
      i = j + 1;
      statement = false;
      afterDot = false;
    } else if (c === "'") {
      out += line.slice(i);
      break;
    } else if (c === ":") {
      out += c;
      i++;
      statement = true;
      afterDot = false;
    } else if (c === " " || c === "\t") {
      out += c;
      i++;
    } else if (/[A-Za-z_]/.test(c)) {
      WORD.lastIndex = i;
      const word = WORD.exec(line)[0];
      const rest = line.slice(i + word.length);
      if (statement && /^rem$/i.test(word)) {
        out += line.slice(i);
        break;
      }
      if (!afterDot && /^debug$/i.test(word) && MEMBER_PRINT.test(rest)) {
        const printed = MEMBER_PRINT.exec(rest)[0];
        // The comma stays when nothing follows it: `Print #n,` is an empty line, and
        // `Print #n` with no comma is a syntax error.
        out += `Print #${fileNumber},`;
        count++;
        i += word.length + printed.length;
        statement = false;
      } else {
        out += word;
        i += word.length;
        statement = /^(?:then|else)$/i.test(word);
      }
      afterDot = false;
    } else if (/[0-9]/.test(c) && statement && out.trim() === "") {
      // A line number is a label: a statement still follows it.
      const m = /^[0-9]+/.exec(line.slice(i))[0];
      out += m;
      i += m.length;
    } else {
      out += c;
      i++;
      statement = false;
      afterDot = c === ".";
    }
  }
  return { text: out, count };
}

/**
 * The source with every `Debug.Print` statement rewritten to `Print #<n>,`.
 *
 * A `Debug.Print` inside a string literal or after a comment mark (`'` or
 * `Rem`) is left alone; one after a `:` separator, after `Then` or after `Else`
 * is rewritten. The lines are kept one for one, so a VB6 line number is the
 * source's. @returns {{text: string, count: number}}
 */
export function rewriteDebugPrint(src, fileNumber = OUT_FILE) {
  let count = 0;
  const text = String(src)
    .split(/\r?\n/)
    .map((line) => {
      const r = rewriteLine(line, fileNumber);
      count += r.count;
      return r.text;
    })
    .join("\n");
  return { text, count };
}

// ----------------------------------------------------------- generated source

/** The module and file names the generated project uses. */
export const HARNESS = "tbxHarness";
export const USER_MODULE = "tbxUser";
export const BODY_SUB = "tbxBody";
export const USER_MAIN = "tbxUserMain";
const PROJECT = "vb6run";
const OUT_NAME = "vb6run.out";
const MAKE_LOG = "make.log";

const crlf = (text) => String(text).replace(/\r?\n/g, "\r\n");

// A `Sub Main` header in a logical line: the thing that makes a file a whole module.
const MAIN_HEADER = /^(\s*(?:(?:Public|Private|Friend|Static)\s+)*Sub\s+)Main(?![A-Za-z0-9_])/i;

/** Whether the source declares `Sub Main`, comments and string contents not counting. */
export const declaresMain = (src) => logicalLines(src).some(({ text }) => MAIN_HEADER.test(text));

/**
 * One generated module for a text.
 *
 * With `whole` the text is a module that declares `Sub Main`: it keeps its own
 * `Attribute VB_Name` line, or gets one, and its `Sub Main` becomes
 * `Sub tbxUserMain`, because the project's startup procedure has to be the
 * generated one. Without it the text is the body of `Public Sub tbxBody`.
 *
 * VB6 numbers a module's lines from 0 and does not count its `Attribute`
 * lines, so the line in its error message is the line of the file less one for
 * each of those, less one more. `lineDelta` is what to add to VB6's line to get
 * the line of the text given: 0 for statements, which sit two lines into the
 * module, below the `Attribute` line and the `Sub`.
 *
 * @returns {{name: string, text: string, lineDelta: number, call: string}}
 *   `call` is the procedure the dispatcher calls
 */
export function moduleFor(src, { name, whole = false } = {}) {
  const body = rewriteDebugPrint(src).text.replace(/\n+$/, "");
  if (!whole) {
    return {
      name,
      text: crlf(`Attribute VB_Name = "${name}"\nPublic Sub ${BODY_SUB}()\n${body}\nEnd Sub\n`),
      lineDelta: 0,
      call: `${name}.${BODY_SUB}`,
    };
  }
  const lines = body.split("\n");
  const own = /^\s*Attribute\s+VB_Name\s*=\s*"([^"]+)"/i.exec(lines[0] ?? "");
  const moduleName = own ? own[1] : name;
  if (!own) lines.unshift(`Attribute VB_Name = "${moduleName}"`);
  let hidden = 0;
  while (hidden < lines.length && /^\s*Attribute\s/i.test(lines[hidden])) hidden++;
  let renamed = false;
  const text = lines.map((l) => {
    if (renamed || !MAIN_HEADER.test(l.replace(/'.*$/, ""))) return l;
    renamed = true;
    return l.replace(MAIN_HEADER, `$1${USER_MAIN}`);
  });
  return {
    name: moduleName,
    text: crlf(`${text.join("\n")}\n`),
    lineDelta: hidden + 1 - (own ? 0 : 1),
    call: `${moduleName}.${USER_MAIN}`,
  };
}

/**
 * The generated `Sub Main`: for each module in turn it writes a begin marker,
 * calls the module's procedure under an `On Error GoTo` handler of its own, and
 * writes the error, if one reached the handler, and an end marker. The markers
 * are example-run.mjs's, so parseRun reads them.
 *
 * `Command$` is the index of the first sample to run, which is how a run goes on
 * after the sample that did not return.
 *
 * @param {string[]} calls  the procedure each sample's module exposes, in order
 */
export function harnessText(calls) {
  const out = [
    `Attribute VB_Name = "${HARNESS}"`,
    "Option Explicit",
    "",
    "Private tbxOut As String",
    "",
    "Private Sub tbxOpen()",
    "    On Error Resume Next",
    `    Close #${OUT_FILE}`,
    `    Open tbxOut For Append As #${OUT_FILE}`,
    "End Sub",
    "",
    "Private Sub tbxMark(ByVal s As String)",
    "    tbxOpen",
    `    Print #${OUT_FILE}, s`,
    `    Close #${OUT_FILE}`,
    "End Sub",
    "",
    "Sub Main()",
    "    Dim tbxStart As Long, tbxNum As Long, tbxDesc As String",
    "    tbxStart = Val(Command$)",
    `    tbxOut = App.Path & "\\${OUT_NAME}"`,
  ];
  calls.forEach((call, i) => {
    out.push(
      `    If tbxStart > ${i} Then GoTo tbxSkip${i}`,
      `    tbxMark "${RUN_TAG} begin ${i}"`,
      "    tbxOpen",
      "    Err.Clear",
      "    tbxNum = 0",
      `    On Error GoTo tbxError${i}`,
      `    ${call}`,
      `    GoTo tbxNext${i}`,
      `tbxError${i}:`,
      "    tbxNum = Err.Number",
      '    tbxDesc = Replace(Replace(Err.Description, vbCr, " "), vbLf, " ")',
      `    Resume tbxNext${i}`,
      `tbxNext${i}:`,
      "    On Error GoTo 0",
      `    If tbxNum <> 0 Then tbxMark "${RUN_TAG} error " & tbxNum & " " & tbxDesc`,
      `    tbxMark "${RUN_TAG} end ${i}"`,
      `tbxSkip${i}:`,
    );
  });
  out.push(`    tbxMark "${RUN_DONE}"`, "End Sub", "");
  return crlf(out.join("\n"));
}

/** The project file. `Unattended=-1` is why a box VB6 would show is written to the event log instead. */
export function projectText(moduleNames) {
  return crlf(
    [
      "Type=Exe",
      `Module=${HARNESS}; ${HARNESS}.bas`,
      ...moduleNames.map((n) => `Module=${n}; ${n}.bas`),
      'Startup="Sub Main"',
      `ExeName32="${PROJECT}.exe"`,
      'Command32=""',
      `Name="${PROJECT}"`,
      'HelpContextID="0"',
      'CompatibleMode="0"',
      "MajorVer=1",
      "MinorVer=0",
      "RevisionVer=0",
      "AutoIncrementVer=0",
      "StartMode=0",
      "Unattended=-1",
      "Retained=0",
      "CompilationType=0",
      "OptimizationType=0",
      "",
    ].join("\n"),
  );
}

// ----------------------------------------------------------------- the folder

/** A new work folder under the OS temp folder. */
export const makeWorkDir = () => mkdtempSync(path.join(tmpdir(), "vb6run-"));

/**
 * Write the project for these generated modules into `dir`, replacing what was
 * there from an earlier build.
 *
 * @param {{name: string, text: string, call: string}[]} modules
 */
export function writeProject(dir, modules) {
  mkdirSync(dir, { recursive: true });
  for (const f of [MAKE_LOG, `${PROJECT}.exe`, OUT_NAME]) rmSync(path.join(dir, f), { force: true });
  writeFileSync(path.join(dir, `${HARNESS}.bas`), encodeAnsi(harnessText(modules.map((m) => m.call))));
  for (const m of modules) writeFileSync(path.join(dir, `${m.name}.bas`), encodeAnsi(m.text));
  writeFileSync(path.join(dir, `${PROJECT}.vbp`), encodeAnsi(projectText(modules.map((m) => m.name))));
}

// ------------------------------------------------------------------- spawning

/**
 * Run `exe` with an argument array and no shell, for at most `timeoutMs`, and
 * end it by its pid and the processes under it when it runs over. Nothing is
 * shown: the window is hidden and stdio is ignored.
 *
 * @returns {Promise<{status: number|null, timedOut: boolean, error?: string}>}
 */
export function runLimited(exe, args, { cwd, timeoutMs }) {
  return new Promise((resolve) => {
    let timedOut = false;
    let settled = false;
    const done = (r) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ timedOut, ...r });
    };
    const child = spawn(exe, args, { cwd, stdio: "ignore", windowsHide: true });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      } catch {
        child.kill();
      }
    }, timeoutMs);
    child.on("error", (err) => done({ status: null, error: err.message }));
    child.on("close", (status) => done({ status }));
  });
}

/**
 * Build the project in `dir` with `VB6.EXE /make`.
 *
 * @returns {Promise<{built: boolean, log: string, timedOut: boolean, error?: string}>}
 */
export async function make(vb6, dir, { timeoutMs = 120000 } = {}) {
  const r = await runLimited(vb6, ["/make", `${PROJECT}.vbp`, "/out", MAKE_LOG], { cwd: dir, timeoutMs });
  const logPath = path.join(dir, MAKE_LOG);
  const log = existsSync(logPath) ? decodeAnsi(readFileSync(logPath)) : "";
  return { built: existsSync(path.join(dir, `${PROJECT}.exe`)), log, timedOut: r.timedOut, error: r.error };
}

/**
 * Run the built exe from sample number `start`, and read what it wrote.
 *
 * @returns {Promise<{lines: string[], status: number|null, timedOut: boolean, error?: string}>}
 */
export async function runExe(dir, { start = 0, timeoutMs = 30000 } = {}) {
  const outPath = path.join(dir, OUT_NAME);
  rmSync(outPath, { force: true });
  const r = await runLimited(path.join(dir, `${PROJECT}.exe`), [String(start)], { cwd: dir, timeoutMs });
  const lines = existsSync(outPath) ? splitLines(decodeAnsi(readFileSync(outPath))) : [];
  return { lines, status: r.status, timedOut: r.timedOut, error: r.error };
}

// ------------------------------------------------------------------ the build

/**
 * The error in a make log, and the module it names, if that is one of `names`.
 * VB6 reports one error and stops. Its line is `Compile Error in File '<path>',
 * Line <n> : <message>`, and the first line of the log is empty.
 *
 * @returns {{module: string|null, line: number|null, message: string}}
 *   `line` is VB6's own (see moduleFor), `message` the text after the colon, or
 *   the log's first line when it does not read that way
 */
export function parseMakeLog(log, names) {
  const text = String(log).replace(/\r/g, "").trim();
  const m = /Error in File '([^']*)', Line (\d+) : ([^\n]*)/i.exec(text);
  if (!m) return { module: null, line: null, message: text.split("\n")[0] ?? "" };
  const file = m[1].slice(Math.max(m[1].lastIndexOf("\\"), m[1].lastIndexOf("/")) + 1);
  const base = file.replace(/\.bas$/i, "").toLowerCase();
  return {
    module: names.find((n) => n.toLowerCase() === base) ?? null,
    line: Number(m[2]),
    message: m[3].trim(),
  };
}

/**
 * Build samples into one project, dropping the module VB6's log names until the
 * project builds.
 *
 * @param {string} vb6
 * @param {string} dir
 * @param {{name: string, text: string, call: string}[]} modules
 * @returns {Promise<{built: boolean, modules: object[], refused: Map<string, {line: number|null, message: string, log: string}>, log: string}>}
 *   `refused` maps a dropped module's name to VB6's first error; `modules` is what built
 */
export async function buildBatch(vb6, dir, modules, { timeoutMs } = {}) {
  let active = [...modules];
  const refused = new Map();
  for (;;) {
    writeProject(dir, active);
    const r = await make(vb6, dir, { timeoutMs });
    if (r.built) return { built: true, modules: active, refused, log: r.log };
    if (r.timedOut || r.error) {
      throw new Error(`VB6 did not finish building${r.error ? `: ${r.error}` : " in time"}\n${r.log}`);
    }
    const err = parseMakeLog(
      r.log,
      active.map((m) => m.name),
    );
    if (/[\\/]tbxHarness\.bas'/i.test(r.log)) throw new Error(`the generated Sub Main does not build:\n${r.log}`);
    // A log that names no module of the project: with one module left it is that one's, and
    // otherwise nothing says which to drop, so the build cannot go on.
    const culprit = active.find((m) => m.name === err.module) ?? (active.length === 1 ? active[0] : null);
    if (!culprit)
      throw new Error(`VB6 could not build the project, and its log names no sample:\n${r.log || "(empty log)"}`);
    refused.set(culprit.name, { line: err.line, message: err.message, log: r.log });
    active = active.filter((m) => m !== culprit);
    if (!active.length) return { built: false, modules: [], refused, log: r.log };
  }
}

/**
 * Run a built batch, sample by sample, and go on after one that does not return.
 *
 * @param {number} count  samples in the built project
 * @returns {Promise<{items: ReturnType<typeof parseRun>["items"], hung: number[]}>}
 *   `hung` lists the samples that began and never ended
 */
export async function runBatch(dir, count, { timeoutMs } = {}) {
  const items = Array.from({ length: count }, () => ({ began: false, ended: false, output: [], error: null }));
  const hung = [];
  let start = 0;
  while (start < count) {
    const r = await runExe(dir, { start, timeoutMs });
    if (r.error) throw new Error(`could not run the built exe: ${r.error}`);
    const parsed = parseRun(r.lines, count);
    parsed.items.forEach((it, i) => {
      if (it.began) items[i] = it;
    });
    if (parsed.done) break;
    // The run stopped before it finished: the last sample to begin is the one it was in.
    const last = parsed.items.map((it) => it.began && !it.ended).lastIndexOf(true);
    if (last < start) {
      // Nothing began: the exe never got going (it was killed, or it died), and rerunning cannot help.
      if (!parsed.items.some((it) => it.began)) hung.push(start);
      break;
    }
    hung.push(last);
    start = last + 1;
  }
  return { items, hung };
}

// -------------------------------------------------------------------- probes

/**
 * Probes for the Debug.Print rewrite, run by test/example-batches.test.mjs.
 * Each case is a source, and the text it must become, with #511 as the file.
 *
 * @returns {{name: string, ok: boolean, detail?: string}[]}
 */
export function vb6Probes() {
  const P = `Print #${OUT_FILE}`;
  // biome-ignore format: a table, one case per line
  const rewrites = [
    ["a plain statement", 'Debug.Print "a"', `${P}, "a"`],
    ["a lower-case spelling", 'debug.print "a"', `${P}, "a"`],
    ["an upper-case spelling", 'DEBUG.PRINT "a"', `${P}, "a"`],
    ["spaces around the dot", 'Debug . Print "a"', `${P}, "a"`],
    ["a semicolon list", 'Debug.Print "a"; 1; "b"', `${P}, "a"; 1; "b"`],
    ["a comma list", "Debug.Print 1, 2", `${P}, 1, 2`],
    ["Spc and Tab", "Debug.Print Spc(3); Tab(9); 1", `${P}, Spc(3); Tab(9); 1`],
    ["a trailing semicolon", 'Debug.Print "a";', `${P}, "a";`],
    ["a bare Debug.Print", "Debug.Print", `${P},`],
    ["a bare Debug.Print with trailing space", "Debug.Print   ", `${P},   `],
    ["a bare Debug.Print before a comment", "Debug.Print ' blank", `${P}, ' blank`],
    ["a bare Debug.Print before a separator", "Debug.Print: x = 1", `${P},: x = 1`],
    ["an indented statement", '    Debug.Print "a"', `    ${P}, "a"`],
    ["a string holding Debug.Print", 'x = "Debug.Print 1"', 'x = "Debug.Print 1"'],
    ["a string with a doubled quote", 'x = "a""Debug.Print"" b"', 'x = "a""Debug.Print"" b"'],
    ["a string holding Debug.Print, then a statement", 'Debug.Print "Debug.Print"', `${P}, "Debug.Print"`],
    ["a comment holding Debug.Print", "x = 1 ' Debug.Print 2", "x = 1 ' Debug.Print 2"],
    ["a comment line", "' Debug.Print 2", "' Debug.Print 2"],
    ["a Rem line", "Rem Debug.Print 2", "Rem Debug.Print 2"],
    ["a Rem line in lower case, indented", "  rem Debug.Print 2", "  rem Debug.Print 2"],
    ["a Rem after a separator", "x = 1: Rem Debug.Print 2", "x = 1: Rem Debug.Print 2"],
    ["a Rem after Then", "If x Then Rem Debug.Print 2", "If x Then Rem Debug.Print 2"],
    ["a name that starts with Rem", "Remainder = 1: Debug.Print Remainder", `Remainder = 1: ${P}, Remainder`],
    ["a statement after a separator", "x = 1: Debug.Print x", `x = 1: ${P}, x`],
    ["two statements", 'Debug.Print 1: Debug.Print "b"', `${P}, 1: ${P}, "b"`],
    ["a single-line If", "If x Then Debug.Print x", `If x Then ${P}, x`],
    ["a single-line If with Else", 'If x Then Debug.Print "a" Else Debug.Print "b"', `If x Then ${P}, "a" Else ${P}, "b"`],
    ["a single-line If with a bare Else branch", "If x Then Debug.Print x Else Debug.Print", `If x Then ${P}, x Else ${P},`],
    ["a bare Debug.Print before Else", "If x Then Debug.Print Else y = 1", `If x Then ${P}, Else y = 1`],
    ["a line number", '10 Debug.Print "a"', `10 ${P}, "a"`],
    ["a label", 'Done: Debug.Print "a"', `Done: ${P}, "a"`],
    ["a member of another object", "Foo.Debug.Print 1", "Foo.Debug.Print 1"],
    ["a longer name", "Debug.PrintX 1", "Debug.PrintX 1"],
    ["a date literal before it", "d = #1/2/2000#: Debug.Print d", `d = #1/2/2000#: ${P}, d`],
    ["a line continuation", 'Debug.Print "a"; _\n    "b"', `${P}, "a"; _\n    "b"`],
    ["a name that starts with Debug", "Debugger.Print 1", "Debugger.Print 1"],
    ["a string with an apostrophe", `Debug.Print "it's"`, `${P}, "it's"`],
    ["nothing to rewrite", "x = 1", "x = 1"],
    ["Windows line endings", 'Debug.Print 1\r\nDebug.Print 2', `${P}, 1\n${P}, 2`],
  ];
  const out = rewrites.map(([name, src, want]) => {
    const got = rewriteDebugPrint(src).text;
    return {
      name: `vb6 rewrite: ${name}`,
      ok: got === want,
      detail: `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
    };
  });
  const counted = rewriteDebugPrint('Debug.Print 1: Debug.Print "Debug.Print"\n\' Debug.Print\nDebug.Print');
  out.push({ name: "vb6 rewrite: counts what it rewrote", ok: counted.count === 3, detail: String(counted.count) });
  const kept = rewriteDebugPrint("a\nb\nDebug.Print\n").text;
  out.push({
    name: "vb6 rewrite: keeps a closing newline and the line count",
    ok: kept === `a\nb\n${P},\n`,
    detail: JSON.stringify(kept),
  });

  const bytes = encodeAnsi("caf\u00e9 \u20ac \u4e2d");
  out.push({
    name: "vb6 encoding: Windows-1252 out, `?` for what it lacks",
    ok:
      bytes.equals(Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x20, 0x80, 0x20, 0x3f])) &&
      decodeAnsi(bytes.subarray(0, 6)) === "caf\u00e9 \u20ac",
    detail: bytes.toString("hex"),
  });

  const whole = moduleFor('Attribute VB_Name = "M"\nPublic Sub Main()\nDebug.Print 1\nEnd Sub\n', {
    name: USER_MODULE,
    whole: true,
  });
  out.push({
    name: "vb6 module: a whole module keeps its name, loses its Main and its Debug.Print",
    ok:
      whole.name === "M" &&
      whole.call === `M.${USER_MAIN}` &&
      whole.lineDelta === 2 &&
      /Sub tbxUserMain/.test(whole.text) &&
      !/Debug\.Print/.test(whole.text),
    detail: whole.text,
  });
  const unnamed = moduleFor("Sub Main()\nEnd Sub", { name: USER_MODULE, whole: true });
  out.push({
    name: "vb6 module: a whole module with no name line is given one, and the line delta says so",
    ok:
      unnamed.name === USER_MODULE &&
      unnamed.lineDelta === 1 &&
      unnamed.text.startsWith(`Attribute VB_Name = "${USER_MODULE}"\r\n`),
    detail: unnamed.text,
  });
  const body = moduleFor("Debug.Print 1\nx = 2", { name: "tbxM3" });
  out.push({
    name: "vb6 module: statements become a Sub, two lines in",
    ok: body.lineDelta === 0 && body.call === "tbxM3.tbxBody" && body.text.split("\r\n")[2] === `${P}, 1`,
    detail: body.text,
  });
  const log =
    "\r\nCompile Error in File 'C:\\Temp\\vb6run-x\\tbxM2.bas', Line 3 : Syntax error\r\nBuild of 'vb6run.exe' failed.\r\n";
  const parsed = parseMakeLog(log, ["tbxM1", "tbxM2"]);
  out.push({
    name: "vb6 log: the module, VB6 line and message of the first error",
    ok: parsed.module === "tbxM2" && parsed.line === 3 && parsed.message === "Syntax error",
    detail: JSON.stringify(parsed),
  });
  out.push({
    name: "vb6 module: Sub Main is found outside comments and strings only",
    ok:
      declaresMain("Public Sub Main()\nEnd Sub") &&
      !declaresMain('\' Sub Main()\nx = "Sub Main()"') &&
      !declaresMain("Sub MainMenu()\nEnd Sub"),
  });
  return out;
}
