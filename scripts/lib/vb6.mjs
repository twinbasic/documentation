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
//  7. A GROUP OF FENCES IS A PROJECT OF ITS OWN. A projname= group's files are
//     translated into VB6 classes and modules (translateTwinFile) and its run
//     fences are modules beside them. Each component keeps the fence's line
//     numbers, the other components' lines blank, so VB6's line, which counts
//     from 0 and skips the Attribute lines and the form header of a class, is the
//     fence's line less one. The output file is open whenever sample code runs,
//     so a Class_Terminate that prints, run as the sample's Sub ends, is captured.
//
//  8. A BUG REPRODUCER'S VB6 PROJECT IS BUILT AS A PROJECT, NOT AS SAMPLES. bug_repro.mjs
//     keeps one in bugs/<slug>/vb6/ and builds it in a temp copy with the same `/make`
//     and the same Unattended Execution (runRepro): Probe.vbp builds Probe.exe, which
//     writes out.txt beside itself and handles its own errors.
//  9. VB6 REFUSES UNATTENDED EXECUTION FOR A PROJECT WITH A FORM: "Unattended Project
//     Cannot be visible at runtime", and no exe. A reproducer whose project names a
//     form, a user control, a property page, a user document or a designer is built
//     without it, so a box its exe shows is a real window. That is why runRepro starts
//     every reproducer's exe as tbrun starts an exe, on a private desktop inside a
//     kill-on-close job: a box there is on no desktop anyone uses, and the time limit
//     ends the exe waiting on it.
//
// 10. A `project=form` FENCE GETS A BLANK Form1.frm, WITHOUT UNATTENDED EXECUTION (9),
//     AND ITS EXE RUNS ON A PRIVATE DESKTOP. A form a sample leaves loaded keeps the exe
//     running after Main returns, so the generated Main unloads every form after each
//     sample, as the twinBASIC dispatcher does. A twinBASIC `Declare PtrSafe` is not VB6:
//     declaresForVb6 drops PtrSafe and reads LongPtr as Long.
//
// The probes for the rewrite and the translation are in vb6Probes() at the end.

import { execFileSync, spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROMPTS, RUN_DONE, RUN_TAG, parseRun } from "./example-run.mjs";
import { killTree, launchOnDesktop } from "./tb-ide.mjs";
import { logicalLines } from "./twin-api.mjs";
import { fileEntry, readZip, zipFiles } from "./zip.mjs";

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

// ----------------------------------------------------- twinBASIC file to VB6

// The first line of a Declare statement, up to where PtrSafe would stand.
const DECLARE_START = /^(\s*(?:(?:Public|Private)\s+)?Declare\s+)PtrSafe\s+/i;

/**
 * A text with its API declarations as VB6 reads them: a `Declare` statement loses `PtrSafe`,
 * which VB6 does not know, and its `LongPtr` is `Long`, which is what a pointer is in a
 * 32-bit exe. The lines stay where they were, so a line number still names the same line.
 * Nothing else is touched, and a `Declare` with no `PtrSafe` is left as it is.
 */
export function declaresForVb6(src) {
  let continued = false;
  return String(src)
    .split("\n")
    .map((line) => {
      const start = DECLARE_START.test(line);
      if (!start && !continued) return line;
      const out = line.replace(DECLARE_START, "$1").replace(/\bLongPtr\b/gi, "Long");
      continued = /_\s*\r?$/.test(out);
      return out;
    })
    .join("\n");
}

/**
 * The header VB6 writes at the top of a class module in a Standard EXE. The
 * first four lines are the form file's, and VB6 never counts them or the
 * `Attribute` lines in a line number.
 */
export const classHeader = (name) => [
  "VERSION 1.0 CLASS",
  "BEGIN",
  "  MultiUse = -1  'True",
  "END",
  `Attribute VB_Name = "${name}"`,
  "Attribute VB_GlobalNameSpace = False",
  "Attribute VB_Creatable = False",
  "Attribute VB_PredeclaredId = False",
  "Attribute VB_Exposed = False",
];

// What to add to the line of a VB6 error in a class module to get the line of the text it
// was made from: see translateTwinFile.
const CLASS_LINE_DELTA = 1;

// A block's opening and closing line, as a logical line has them (comments gone, strings
// blanked). The name has to be the whole of what follows, so `Class Foo(Of T)` is not an
// opener: it stays in the file's top level, where VB6 refuses it, and so does a stray
// `End Class`. Public, Private and Friend before the keyword are accepted and dropped.
const BLOCK_OPEN = /^\s*(?:(?:Public|Private|Friend)\s+)?(Class|Module)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i;
const BLOCK_CLOSE = /^\s*End\s+(Class|Module)\s*$/i;

/**
 * The blocks of a twinBASIC file that have a VB6 form: every `Class <Name>` and
 * `Module <Name>` up to its `End`, found outside comments and strings.
 *
 * @returns {{kind: "cls"|"bas", name: string, from: number, to: number}[]}
 *   `from` and `to` are the lines, counted from 1, of the opening and closing line
 */
export function findBlocks(text) {
  const blocks = [];
  let open = null;
  for (const { text: line, line: at } of logicalLines(text)) {
    if (!open) {
      const m = BLOCK_OPEN.exec(line);
      if (m) open = { kind: m[1].toLowerCase() === "class" ? "cls" : "bas", name: m[2], from: at };
    } else {
      const m = BLOCK_CLOSE.exec(line);
      if (m && (m[1].toLowerCase() === "class") === (open.kind === "cls")) {
        blocks.push({ ...open, to: at });
        open = null;
      }
    }
  }
  return blocks;
}

/**
 * VB6 components for the text of a twinBASIC file.
 *
 * Each block is a component of its own, a `.cls` for a Class and a `.bas` for a
 * Module, with its opening and closing line left out. What is outside every
 * block (Declare, Type, Enum, Const, procedures) is one more `.bas`, named
 * `topName`, when anything but blank lines and comments is there. Nothing else
 * is translated: a construct VB6 has no form for (an Interface, a CoClass, a
 * generic, an attribute line) stays where it is, and VB6 refuses it.
 *
 * Every component has the lines of the text, one for one, with the other
 * components' lines blank, so a line VB6 reports is a line of the text:
 * `lineDelta` is what to add to VB6's line to get it. `Debug.Print` is
 * rewritten, as in moduleFor.
 *
 * @returns {{name: string, kind: "cls"|"bas", text: string, lineDelta: number}[]}
 */
export function translateTwinFile(src, { topName }) {
  const lines = declaresForVb6(rewriteDebugPrint(src).text).replace(/\n+$/, "").split("\n");
  const blocks = findBlocks(src);
  const owner = new Array(lines.length + 1).fill(-1); // by line, from 1
  blocks.forEach((b, i) => {
    for (let l = b.from; l <= Math.min(b.to, lines.length); l++) owner[l] = i;
  });
  const components = [];
  // `from`..`to` of a block are its own lines, kept apart from the rest: they are dropped, as
  // lines, by being left blank.
  const shape = (keep, upTo, header) => {
    const body = [];
    for (let l = 1; l <= upTo; l++) body.push(keep(l) ? lines[l - 1] : "");
    return crlf(`${[...header, ...body].join("\n")}\n`);
  };
  blocks.forEach((b, i) => {
    const keep = (l) => owner[l] === i && l !== b.from && l !== b.to;
    const header = b.kind === "cls" ? classHeader(b.name) : [`Attribute VB_Name = "${b.name}"`];
    components.push({
      name: b.name,
      kind: b.kind,
      text: shape(keep, b.to - 1, header),
      lineDelta: b.kind === "cls" ? CLASS_LINE_DELTA : 1,
    });
  });
  const keepTop = (l) => owner[l] === -1;
  const top = lines.filter((_, k) => keepTop(k + 1));
  const topCode = logicalLines(top.join("\n")).some(({ text }) => text.trim() !== "");
  if (topCode) {
    components.push({
      name: topName,
      kind: "bas",
      text: shape(keepTop, lines.length, [`Attribute VB_Name = "${topName}"`]),
      lineDelta: 1,
    });
  }
  return components;
}

/**
 * One `.bas` for text that is a module's declarations and procedures, with the
 * lines of the text kept (a VB6 line less one is the text's), and `Debug.Print`
 * rewritten.
 */
export function declarationsModule(src, name) {
  const body = declaresForVb6(rewriteDebugPrint(src).text).replace(/\n+$/, "");
  return { name, kind: "bas", text: crlf(`Attribute VB_Name = "${name}"\n${body}\n`), lineDelta: 1 };
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
    // A form a sample left loaded keeps the exe running after Main returns, so
    // each sample's forms are unloaded when it ends, as the twinBASIC dispatcher does.
    "Private Sub tbxUnloadForms()",
    "    Dim i As Long",
    "    On Error Resume Next",
    "    For i = Forms.Count - 1 To 0 Step -1",
    "        Unload Forms(i)",
    "    Next i",
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
      "    tbxUnloadForms",
      `    If tbxNum <> 0 Then tbxMark "${RUN_TAG} error " & tbxNum & " " & tbxDesc`,
      `    tbxMark "${RUN_TAG} end ${i}"`,
      `tbxSkip${i}:`,
    );
  });
  out.push(`    tbxMark "${RUN_DONE}"`, "End Sub", "");
  return crlf(out.join("\n"));
}

/**
 * A blank form: the VB6 side of twinBASIC's `form` template (test/example-projects/form),
 * whose Form1 is an empty form of 300 by 300 pixels with a predeclared instance. A
 * `project=form` fence is built into a project that has this component, as
 * `{name: "Form1", kind: "frm", text: FORM1}`.
 */
export const FORM1_NAME = "Form1";
export const FORM1 = crlf(
  [
    "VERSION 5.00",
    "Begin VB.Form Form1",
    '   Caption         =   "Form1"',
    "   ClientHeight    =   4500",
    "   ClientLeft      =   60",
    "   ClientTop       =   345",
    "   ClientWidth     =   4500",
    '   LinkTopic       =   "Form1"',
    "   ScaleHeight     =   4500",
    "   ScaleWidth      =   4500",
    "   StartUpPosition =   3  'Windows Default",
    "   Visible         =   0   'False",
    "End",
    'Attribute VB_Name = "Form1"',
    "Attribute VB_GlobalNameSpace = False",
    "Attribute VB_Creatable = False",
    "Attribute VB_PredeclaredId = True",
    "Attribute VB_Exposed = False",
    "Option Explicit",
    "",
  ].join("\n"),
);

/** The project's components that are forms, which VB6 will not build with Unattended Execution. */
export const hasForm = (components) => components.some((c) => c.kind === "frm");

/**
 * The project file. `Unattended=-1` is why a box VB6 would show is written to the event log
 * instead; a project with a form cannot have it (see 9 at the top), and is run on a private
 * desktop for the same reason a reproducer is.
 */
export function projectText(components) {
  return crlf(
    [
      "Type=Exe",
      ...components.filter((c) => c.kind === "frm").map((c) => `Form=${c.name}.frm`),
      `Module=${HARNESS}; ${HARNESS}.bas`,
      ...components
        .filter((c) => c.kind !== "frm")
        .map((c) => (c.kind === "cls" ? `Class=${c.name}; ${c.name}.cls` : `Module=${c.name}; ${c.name}.bas`)),
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
      ...(hasForm(components) ? [] : ["Unattended=-1"]),
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
 * @param {{name: string, text: string, call: string}[]} modules  the samples, which the
 *   generated Main calls in order
 * @param {{name: string, kind: "cls"|"bas", text: string}[]} support  components the
 *   samples use, built into the project and never called
 */
export function writeProject(dir, modules, support = []) {
  mkdirSync(dir, { recursive: true });
  for (const f of [MAKE_LOG, `${PROJECT}.exe`, OUT_NAME]) rmSync(path.join(dir, f), { force: true });
  writeFileSync(path.join(dir, `${HARNESS}.bas`), encodeAnsi(harnessText(modules.map((m) => m.call))));
  const all = [...support, ...modules];
  for (const m of all) writeFileSync(path.join(dir, `${m.name}.${m.kind ?? "bas"}`), encodeAnsi(m.text));
  writeFileSync(path.join(dir, `${PROJECT}.vbp`), encodeAnsi(projectText(all)));
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
 * Run `exe` with one argument on a private desktop, inside a kill-on-close job, for at most
 * `timeoutMs`, for a project with a form: a window or a box the exe shows is then on a
 * desktop nobody uses. It ends as runLimited's does, by its pid.
 *
 * @returns {Promise<{status: number|null, timedOut: boolean, error?: string}>}
 */
async function runOnDesktop(exe, arg, { timeoutMs }) {
  let run;
  try {
    run = await launchOnDesktop({ exe, arg, desktop: `vb6run-${process.pid}`, env: { ...process.env } });
  } catch (e) {
    return { status: null, timedOut: false, error: `could not run the built exe on a private desktop: ${e.message}` };
  }
  let timer;
  const timedOut = await Promise.race([
    run.exited.then(() => false),
    new Promise((r) => {
      timer = setTimeout(() => r(true), timeoutMs);
    }),
  ]);
  clearTimeout(timer);
  if (timedOut) {
    killTree(run.pid);
    run.launcher.kill();
  }
  const status = await run.exited;
  return { status: timedOut ? null : status, timedOut };
}

/**
 * Build the project in `dir` with `VB6.EXE /make`.
 *
 * @returns {Promise<{built: boolean, log: string, timedOut: boolean, error?: string}>}
 */
export async function make(vb6, dir, { timeoutMs = 120000, project = PROJECT } = {}) {
  const r = await runLimited(vb6, ["/make", `${project}.vbp`, "/out", MAKE_LOG], { cwd: dir, timeoutMs });
  const logPath = path.join(dir, MAKE_LOG);
  const log = existsSync(logPath) ? decodeAnsi(readFileSync(logPath)) : "";
  return { built: existsSync(path.join(dir, `${project}.exe`)), log, timedOut: r.timedOut, error: r.error };
}

/**
 * Run the built exe from sample number `start`, and read what it wrote. The
 * generated project is `vb6run.exe`, which writes `vb6run.out` and takes `start`
 * as its command line; a reproducer's is `project: "Probe"`, which writes
 * `outName` and takes `args` (none by default).
 *
 * @returns {Promise<{lines: string[], status: number|null, timedOut: boolean, error?: string}>}
 */
export async function runExe(
  dir,
  { start = 0, timeoutMs = 30000, project = PROJECT, outName = OUT_NAME, args = [String(start)], desktop = false } = {},
) {
  const outPath = path.join(dir, outName);
  rmSync(outPath, { force: true });
  const r = desktop
    ? await runOnDesktop(path.join(dir, `${project}.exe`), args.join(" "), { timeoutMs })
    : await runLimited(path.join(dir, `${project}.exe`), args, { cwd: dir, timeoutMs });
  const lines = existsSync(outPath) ? splitLines(decodeAnsi(readFileSync(outPath))) : [];
  return { lines, status: r.status, timedOut: r.timedOut, error: r.error };
}

// ------------------------------------------------------- a reproducer's project

// scripts/bug_repro.mjs keeps a VB6 project beside a bug's twinBASIC one, in
// bugs/<slug>/vb6/, to show what VB6 does where the bug report says twinBASIC
// differs. The convention: it builds `Probe.exe` from `Probe.vbp`, and writes what
// it finds to `out.txt` beside the exe, with every error handled. The folder holds
// sources only. It is built in a copy under the OS temp folder, so no exe or
// output ever lands in the repository, and the copy's project gets Unattended
// Execution, as the generated project of vb6run does: a message box, or an error
// the program did not handle, goes to the event log in place of the desktop. A
// project with a form cannot have it (see 9 at the top), and every reproducer's
// exe runs on a private desktop.

/** The project, exe and output of a reproducer's VB6 project. */
export const REPRO_PROJECT = "Probe";
export const REPRO_OUT = "out.txt";

/**
 * The files of a VB6 project that are sources: the project, its modules, classes,
 * forms and user controls (`.frx` is a form's binary part, `.ctx` a user control's).
 */
export const REPRO_SOURCE_EXTENSIONS = [".vbp", ".bas", ".cls", ".frm", ".frx", ".ctl", ".ctx"];

/**
 * The files in a reproducer's vb6/ folder, by name: the sources, and the others
 * (an exe, an output, a log, a folder), which are never zipped or built.
 */
export function reproFiles(dir) {
  const sources = [];
  const others = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const source = e.isFile() && REPRO_SOURCE_EXTENSIONS.includes(path.extname(e.name).toLowerCase());
    (source ? sources : others).push(e.name);
  }
  return { sources, others };
}

/**
 * What stops a reproducer's VB6 project from being built and run, or null: no
 * `Probe.vbp`, or a source that calls `MsgBox` or `InputBox`, which would open a
 * modal box on the desktop of whoever runs it (the check vb6run makes on a
 * sample). Comments and string contents are not read.
 */
export function reproProblem(dir) {
  const { sources } = reproFiles(dir);
  if (!sources.includes(`${REPRO_PROJECT}.vbp`)) return `has no ${REPRO_PROJECT}.vbp`;
  for (const name of sources) {
    if (/\.(?:vbp|frx|ctx)$/i.test(name)) continue;
    for (const { text, line } of logicalLines(decodeAnsi(readFileSync(path.join(dir, name))))) {
      const prompt = PROMPTS.exec(text);
      if (prompt) {
        return `${name}, line ${line} calls ${prompt[1]}, which opens a modal box on the desktop of whoever runs the exe`;
      }
    }
  }
  return null;
}

/** The files of a reproducer's VB6 zip, as zipFiles takes them: its sources, flat, in name order. */
export function reproZipFiles(dir) {
  return reproFiles(dir).sources.map((name) => fileEntry(name, path.join(dir, name)));
}

/**
 * Whether a project file names a component VB6 can show: a form (an MDI form is a
 * `Form=` line too), a user control, a property page, a user document or a
 * designer. VB6 will not build such a project with `Unattended=-1`.
 */
export const hasVisibleComponent = (vbp) =>
  /^[ \t]*(?:Form|UserControl|PropertyPage|UserDocument|Designer)[ \t]*=/im.test(String(vbp));

/**
 * The text of a project file with `Unattended=-1`, in the general section, before
 * any `[Section]`. A line it already has is replaced. With `on` false, the line
 * is only removed.
 */
export function unattended(vbp, on = true) {
  const lines = String(vbp).split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  const kept = lines.filter((l) => !/^\s*Unattended\s*=/i.test(l));
  const section = kept.findIndex((l) => /^\s*\[/.test(l));
  if (on) kept.splice(section < 0 ? kept.length : section, 0, "Unattended=-1");
  return `${kept.join("\r\n")}\r\n`;
}

/**
 * Run a reproducer's built exe on a private desktop, inside a kill-on-close job,
 * for at most `timeoutMs`, and read the out.txt it wrote. `env` adds variables to the exe's
 * environment, which is the caller's otherwise.
 *
 * @returns {Promise<{lines: string[], status: number|null, timedOut: boolean}>}
 */
async function runReproExe(work, timeoutMs, env = {}) {
  const outPath = path.join(work, REPRO_OUT);
  rmSync(outPath, { force: true });
  let run;
  try {
    run = await launchOnDesktop({
      exe: path.join(work, `${REPRO_PROJECT}.exe`),
      desktop: `bugrepro-vb6-${process.pid}`,
      env: { ...process.env, ...env },
    });
  } catch (e) {
    throw new Error(`could not run the built exe on a private desktop: ${e.message}`);
  }
  let timer;
  const timedOut = await Promise.race([
    run.exited.then(() => false),
    new Promise((r) => {
      timer = setTimeout(() => r(true), timeoutMs);
    }),
  ]);
  clearTimeout(timer);
  if (timedOut) {
    killTree(run.pid);
    run.launcher.kill();
  }
  const status = await run.exited;
  const lines = existsSync(outPath) ? splitLines(decodeAnsi(readFileSync(outPath))) : [];
  return { lines, status: timedOut ? null : status, timedOut };
}

/**
 * Build and run the VB6 project in `dir` (a reproducer's vb6/ folder), in a copy
 * of its sources under the OS temp folder, which is removed unless `keep`.
 *
 * @returns {Promise<{built: boolean, log: string, lines: string[], status: number|null, timedOut: boolean, work: string, kept: boolean}>}
 *   `lines` is what out.txt held; a VB6 that did not finish building throws
 */
export async function runRepro(vb6, dir, { timeoutMs = 30000, keep = false, env = {} } = {}) {
  const work = mkdtempSync(path.join(tmpdir(), "bugrepro-vb6-"));
  try {
    for (const name of reproFiles(dir).sources) copyFileSync(path.join(dir, name), path.join(work, name));
    const vbp = path.join(work, `${REPRO_PROJECT}.vbp`);
    const text = decodeAnsi(readFileSync(vbp));
    writeFileSync(vbp, encodeAnsi(unattended(text, !hasVisibleComponent(text))));
    const made = await make(vb6, work, { project: REPRO_PROJECT });
    if (made.timedOut || made.error) {
      throw new Error(`VB6 did not finish building${made.error ? `: ${made.error}` : " in time"}\n${made.log}`);
    }
    const result = { built: made.built, log: made.log, lines: [], status: null, timedOut: false, work, kept: keep };
    if (!made.built) return result;
    const ran = await runReproExe(work, Math.min(timeoutMs, 2147483647), env);
    return { ...result, lines: ran.lines, status: ran.status, timedOut: ran.timedOut };
  } finally {
    if (!keep) rmSync(work, { recursive: true, force: true });
  }
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
  const base = file.replace(/\.(?:bas|cls|frm)$/i, "").toLowerCase();
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
 * With `support`, components the samples use (a group's classes and modules),
 * an error in one of them cannot be dropped: nothing in the group can be built,
 * and the result carries it as `supportError`.
 *
 * @param {{name: string, text: string, call: string}[]} modules
 * @returns {Promise<{built: boolean, modules: object[], refused: Map<string, {line: number|null, message: string, log: string}>, supportError: null | {component: object, line: number|null, message: string}, log: string}>}
 *   `refused` maps a dropped module's name to VB6's first error; `modules` is what built
 */
export async function buildBatch(vb6, dir, modules, { timeoutMs, support = [] } = {}) {
  let active = [...modules];
  const refused = new Map();
  for (;;) {
    writeProject(dir, active, support);
    const r = await make(vb6, dir, { timeoutMs });
    if (r.built) return { built: true, modules: active, refused, supportError: null, log: r.log };
    if (r.timedOut || r.error) {
      throw new Error(`VB6 did not finish building${r.error ? `: ${r.error}` : " in time"}\n${r.log}`);
    }
    const err = parseMakeLog(
      r.log,
      [...support, ...active].map((m) => m.name),
    );
    if (/[\\/]tbxHarness\.bas'/i.test(r.log)) throw new Error(`the generated Sub Main does not build:\n${r.log}`);
    const component = support.find((m) => m.name === err.module);
    if (component) {
      return {
        built: false,
        modules: [],
        refused,
        supportError: { component, line: err.line, message: err.message },
        log: r.log,
      };
    }
    // A log that names no module of the project: with one module left it is that one's, and
    // otherwise nothing says which to drop, so the build cannot go on.
    const culprit =
      active.find((m) => m.name === err.module) ??
      (active.length === 1 && support.every((c) => c.kind === "frm") ? active[0] : null);
    if (!culprit)
      throw new Error(`VB6 could not build the project, and its log names no sample:\n${r.log || "(empty log)"}`);
    refused.set(culprit.name, { line: err.line, message: err.message, log: r.log });
    active = active.filter((m) => m !== culprit);
    if (!active.length) return { built: false, modules: [], refused, supportError: null, log: r.log };
  }
}

/**
 * Run a built batch, sample by sample, and go on after one that does not return.
 *
 * @param {number} count  samples in the built project
 * @param {{timeoutMs?: number, desktop?: boolean}} o  `desktop` runs the exe on a private
 *   desktop, for a project with a form
 * @returns {Promise<{items: ReturnType<typeof parseRun>["items"], hung: number[]}>}
 *   `hung` lists the samples that began and never ended
 */
export async function runBatch(dir, count, { timeoutMs, desktop = false } = {}) {
  const items = Array.from({ length: count }, () => ({ began: false, ended: false, output: [], error: null }));
  const hung = [];
  let start = 0;
  while (start < count) {
    const r = await runExe(dir, { start, timeoutMs, desktop });
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

  // The translation of a twinBASIC file into VB6 components.
  const tr = (src) => translateTwinFile(src, { topName: "tbxTop0" });
  const shape = (cs) => cs.map((c) => `${c.name}.${c.kind}`).join(" ");
  const lines = (c) => c.text.split("\r\n");
  const check = (name, ok, detail) => out.push({ name: `vb6 translate: ${name}`, ok, detail });

  const cls = tr("Class Foo\n    Public X As Long\n    Debug.Print 1\nEnd Class\n");
  check("a class block is a .cls with the VB6 class header", shape(cls) === "Foo.cls", shape(cls));
  check(
    "the header is VB6's, and the Class and End Class lines are blank",
    JSON.stringify(lines(cls[0]).slice(0, 11)) ===
      JSON.stringify([...classHeader("Foo"), "", "    Public X As Long"]) &&
      lines(cls[0])[11] === `    ${P}, 1` &&
      lines(cls[0])[12] === "",
    JSON.stringify(lines(cls[0])),
  );
  check(
    "the class header text",
    classHeader("Foo").join("|") ===
      'VERSION 1.0 CLASS|BEGIN|  MultiUse = -1  \'True|END|Attribute VB_Name = "Foo"|Attribute VB_GlobalNameSpace = False|Attribute VB_Creatable = False|Attribute VB_PredeclaredId = False|Attribute VB_Exposed = False',
  );
  const mod = tr("Module Util\n    Public Function F() As Long\n    End Function\nEnd Module");
  check(
    "a module block is a .bas named by it, with one Attribute line",
    shape(mod) === "Util.bas" && lines(mod[0])[0] === 'Attribute VB_Name = "Util"' && lines(mod[0])[1] === "",
    JSON.stringify(lines(mod[0])),
  );
  const top = tr("Public Const A As Long = 1\nClass Foo\nEnd Class\nPublic Function F() As Long\nEnd Function\n");
  check("the file's top level is one .bas, after the blocks", shape(top) === "Foo.cls tbxTop0.bas", shape(top));
  check(
    "the top level keeps the line numbers: the block's lines are blank in it",
    JSON.stringify(lines(top[1]).slice(1, 6)) ===
      JSON.stringify(["Public Const A As Long = 1", "", "", "Public Function F() As Long", "End Function"]),
    JSON.stringify(lines(top[1])),
  );
  check(
    "Public, Private and Friend before Class and Module are accepted",
    shape(
      tr(
        "Public Class A\nEnd Class\nPrivate Class B\nEnd Class\nFriend Module C\nEnd Module\nPrivate Module D\nEnd Module",
      ),
    ) === "A.cls B.cls C.bas D.bas",
  );
  const strc = tr('Class A\n    Debug.Print "End Class"\n    \' End Class\n    x = 1\nEnd Class\nClass B\nEnd Class');
  check(
    "End Class in a string or a comment does not end a block",
    shape(strc) === "A.cls B.cls" &&
      lines(strc[0]).some((l) => l.includes("x = 1")) &&
      !lines(strc[1]).some((l) => l.includes("x = 1")),
    shape(strc),
  );
  const opener = tr('Debug.Print "Class A"\n\' Class B\nx = 1');
  check("Class in a string or a comment opens nothing", shape(opener) === "tbxTop0.bas", shape(opener));
  const generic = tr("Class Box(Of T)\nEnd Class");
  check(
    "a generic class is not a block: VB6 refuses it where it stands",
    shape(generic) === "tbxTop0.bas",
    shape(generic),
  );
  const unclosed = tr("Class A\n    x = 1");
  check("a class that is never closed is not a block", shape(unclosed) === "tbxTop0.bas", shape(unclosed));
  const wrongEnd = tr("Class A\nEnd Module\nEnd Class");
  check("End Module does not close a Class", shape(wrongEnd) === "A.cls", shape(wrongEnd));
  const commentsOnly = tr("' only a comment\n\nClass A\nEnd Class");
  check("a top level with only comments is no component", shape(commentsOnly) === "A.cls", shape(commentsOnly));
  const iface = tr('[InterfaceId("x")]\nInterface I\nEnd Interface\nClass A\nEnd Class');
  check(
    "an Interface stays in the top level",
    shape(iface) === "A.cls tbxTop0.bas" && lines(iface[1]).includes("Interface I"),
    shape(iface),
  );
  check(
    "a block's lines map back: the line delta is 1 for a class, a module and the top level",
    cls[0].lineDelta === 1 && mod[0].lineDelta === 1 && top[1].lineDelta === 1,
  );
  const decl = declarationsModule("Public Const A = 1\nDebug.Print 2", "tbxTop2");
  check(
    "declarations are one .bas, Debug.Print rewritten",
    decl.kind === "bas" && lines(decl)[2] === `${P}, 2`,
    JSON.stringify(lines(decl)),
  );
  const proj = projectText([
    { name: "Foo", kind: "cls" },
    { name: "Util", kind: "bas" },
  ]);
  check(
    "the project lists a class as Class= and a module as Module=",
    proj.includes("Class=Foo; Foo.cls\r\n") && proj.includes("Module=Util; Util.bas\r\n"),
  );
  check("a project with no form is built with Unattended Execution", proj.includes("Unattended=-1\r\n"));
  // `project=form`: a blank Form1.frm beside the samples, and no Unattended Execution, which VB6
  // refuses for a project that has a form.
  const formProj = projectText([
    { name: FORM1_NAME, kind: "frm", text: FORM1 },
    { name: "Util", kind: "bas" },
  ]);
  check(
    "a form is listed as Form=, and the project is not unattended",
    formProj.includes("Form=Form1.frm\r\n") &&
      !formProj.includes("Unattended") &&
      !formProj.includes("Module=Form1") &&
      formProj.includes("Module=Util; Util.bas\r\n"),
    JSON.stringify(formProj),
  );
  check(
    "the blank form is a Form1 with a predeclared instance",
    FORM1.startsWith("VERSION 5.00\r\nBegin VB.Form Form1\r\n") &&
      /Attribute VB_PredeclaredId = True\r\n/.test(FORM1) &&
      !/(?<!\r)\n/.test(FORM1),
  );
  // Each sample's forms are unloaded before its end marker, as the twinBASIC dispatcher does, because
  // a form left loaded keeps the exe running after Main returns.
  const harness = harnessText(["a.Body", "b.Body"]).split("\r\n");
  check(
    "the harness unloads a sample's forms before the sample's end marker",
    [0, 1].every((i) => {
      const call = harness.indexOf(`    ${i ? "b" : "a"}.Body`);
      const unload = harness.indexOf("    tbxUnloadForms", call);
      return unload > call && unload < harness.findIndex((l) => l.includes(`end ${i}"`));
    }) && harness.includes("        Unload Forms(i)"),
  );
  const declared = declaresForVb6(
    'Public Declare PtrSafe Function GetPixel Lib "gdi32" (ByVal hdc As LongPtr, ByVal x As Long) As Long\n' +
      'Private Declare PtrSafe Function F Lib "k" (ByVal a As LongPtr, _\n    ByVal b As LongPtr) As LongPtr\n' +
      'Declare Function G Lib "k" (ByVal a As LongPtr) As Long\n' +
      "Dim p As LongPtr\n",
  ).split("\n");
  check(
    "a PtrSafe Declare loses PtrSafe and reads LongPtr as Long, across a continuation",
    declared[0] === 'Public Declare Function GetPixel Lib "gdi32" (ByVal hdc As Long, ByVal x As Long) As Long' &&
      declared[1] === 'Private Declare Function F Lib "k" (ByVal a As Long, _' &&
      declared[2] === "    ByVal b As Long) As Long",
    JSON.stringify(declared),
  );
  check(
    "a Declare with no PtrSafe, and any other line, is left as it is",
    declared[3] === 'Declare Function G Lib "k" (ByVal a As LongPtr) As Long' && declared[4] === "Dim p As LongPtr",
    JSON.stringify(declared),
  );
  out.push(...reproProbes());
  return out;
}

/**
 * Probes for a reproducer's VB6 project (bug_repro.mjs): which files go into its
 * zip, what refuses it, and the project file the build copy gets. They write a
 * folder under the OS temp folder and remove it.
 *
 * @returns {{name: string, ok: boolean, detail?: string}[]}
 */
function reproProbes() {
  const out = [];
  const check = (name, ok, detail) => out.push({ name: `vb6 reproducer: ${name}`, ok, detail });
  const dir = mkdtempSync(path.join(tmpdir(), "vb6-repro-probe-"));
  const put = (name, text) => writeFileSync(path.join(dir, name), text);
  try {
    put("Probe.vbp", 'Type=Exe\r\nModule=Module1; Module1.bas\r\nStartup="Sub Main"\r\nExeName32="Probe.exe"\r\n');
    put(
      "Module1.bas",
      'Attribute VB_Name = "Module1"\r\nSub Main()\r\n    \' MsgBox is only mentioned\r\n    x = "InputBox"\r\nEnd Sub\r\n',
    );
    put("Widget.cls", "VERSION 1.0 CLASS\r\nBEGIN\r\nEND\r\n");
    put("Form1.frm", "VERSION 5.00\r\n");
    put("Form1.frx", "binary");
    put("UC1.ctl", "VERSION 5.00\r\n");
    // A binary part that happens to spell a prompt: never read as code.
    put("UC1.ctx", "MsgBox binary");
    // What a build or a run leaves behind, and what an editor does, none of which is a source.
    for (const name of ["Probe.exe", "out.txt", "make.log", "Probe.vbw", "notes.md", "Module1.bas.bak"]) put(name, "x");
    mkdirSync(path.join(dir, "Sub.bas"));
    const want = ["Form1.frm", "Form1.frx", "Module1.bas", "Probe.vbp", "UC1.ctl", "UC1.ctx", "Widget.cls"];
    const files = reproFiles(dir);
    check("only sources are listed, by name", files.sources.join(" ") === want.join(" "), files.sources.join(" "));
    check(
      "an exe, an output, a log, a folder and an editor's files are not",
      ["Probe.exe", "out.txt", "make.log", "Probe.vbw", "notes.md", "Module1.bas.bak", "Sub.bas"].every((n) =>
        files.others.includes(n),
      ),
      files.others.join(" "),
    );
    const zipped = readZip(zipFiles(reproZipFiles(dir)));
    check(
      "the zip holds the sources and nothing else, flat",
      zipped.map((f) => f.name).join(" ") === want.join(" "),
      zipped.map((f) => f.name).join(" "),
    );
    check(
      "the zip holds each file's own bytes",
      zipped.every((f) => f.data.equals(readFileSync(path.join(dir, f.name)))),
    );
    check("a project with Probe.vbp and no prompt is accepted", reproProblem(dir) === null, String(reproProblem(dir)));
    put("Module1.bas", 'Sub Main()\r\n    msgbox "x"\r\nEnd Sub\r\n');
    check(
      "MsgBox in a module refuses the project, whatever its case",
      /^Module1\.bas, line 2 calls msgbox/.test(reproProblem(dir) ?? ""),
      String(reproProblem(dir)),
    );
    put("Module1.bas", "Sub Main()\r\nEnd Sub\r\n");
    put("Widget.cls", 'VERSION 1.0 CLASS\r\nBEGIN\r\nEND\r\nSub F()\r\n    x = InputBox("a")\r\nEnd Sub\r\n');
    check(
      "InputBox in a class refuses it too",
      /^Widget\.cls, line 5 calls InputBox/.test(reproProblem(dir) ?? ""),
      String(reproProblem(dir)),
    );
    put("Widget.cls", "VERSION 1.0 CLASS\r\nBEGIN\r\nEND\r\n");
    check("a class with only its header is accepted", reproProblem(dir) === null, String(reproProblem(dir)));
    // The picture module that bug_repro new --with-images copies into vb6/ is a source like any other, and
    // must not call a prompt.
    const pngDump = fileURLToPath(new URL("../../test/repro-templates/png/PngDump.bas", import.meta.url));
    copyFileSync(pngDump, path.join(dir, "PngDump.bas"));
    check(
      "PngDump.bas, the picture module of --with-images, passes",
      reproProblem(dir) === null,
      String(reproProblem(dir)),
    );
    rmSync(path.join(dir, "PngDump.bas"));
    put("UC1.ctl", "VERSION 5.00\r\nBegin VB.UserControl UC1\r\nEnd\r\nSub F()\r\n    MsgBox 1\r\nEnd Sub\r\n");
    check(
      "MsgBox in a user control refuses it too",
      /^UC1\.ctl, line 5 calls MsgBox/.test(reproProblem(dir) ?? ""),
      String(reproProblem(dir)),
    );
    put("UC1.ctl", "VERSION 5.00\r\n");
    rmSync(path.join(dir, "Probe.vbp"));
    check(
      "a folder with no Probe.vbp is refused",
      reproProblem(dir) === `has no ${REPRO_PROJECT}.vbp`,
      String(reproProblem(dir)),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const vbp = 'Type=Exe\r\nName="Probe"\r\n\r\n[MS Transaction Server]\r\nAutoRefresh=1\r\n';
  check(
    "Unattended goes before the first section",
    unattended(vbp) === 'Type=Exe\r\nName="Probe"\r\n\r\nUnattended=-1\r\n[MS Transaction Server]\r\nAutoRefresh=1\r\n',
    JSON.stringify(unattended(vbp)),
  );
  check(
    "a project with no section gets it at the end, and one with Unattended has it once",
    unattended('Type=Exe\nUnattended=0\nName="P"\n') === 'Type=Exe\r\nName="P"\r\nUnattended=-1\r\n',
    JSON.stringify(unattended('Type=Exe\nUnattended=0\nName="P"\n')),
  );
  check(
    "with on false, Unattended is only removed",
    unattended("Type=Exe\nUnattended=-1\nForm=Form1.frm\n", false) === "Type=Exe\r\nForm=Form1.frm\r\n",
    JSON.stringify(unattended("Type=Exe\nUnattended=-1\nForm=Form1.frm\n", false)),
  );
  check(
    "a form, a user control and a designer are visible components, a module and a class are not",
    hasVisibleComponent("Type=Exe\r\nForm=Form1.frm\r\n") &&
      hasVisibleComponent("UserControl=Ctl.ctl\r\n") &&
      hasVisibleComponent("Designer=DataEnv.Dsr\r\n") &&
      !hasVisibleComponent('Type=Exe\r\nModule=Module1; Module1.bas\r\nClass=C; C.cls\r\nStartup="Sub Main"\r\n') &&
      !hasVisibleComponent("[MS Transaction Server]\r\nFormatted=1\r\n"),
    "",
  );
  return out;
}
