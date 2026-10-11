#!/usr/bin/env node
// Find the properties the IDE silently drops when it loads the themes it ships.
//
//     node scripts/probe_theme_semicolon.mjs [options]
//
// The defect is the entry of BUGS-TO-REPORT.md whose reproducer is
// bugs/theme-missing-semicolon/: in BETA 1005, line 63 of Dark.theme and of
// Light.theme reads `DiagnosticsGroupFontSize: 90%` with no `;`, and the
// IDE's theme loader loses that property and the next one.
//
// The loader is applyThemeData in <install>\ide\main.js. It takes the file's
// text with a "\r\n" added, removes /* ... */ comments, cuts it at every ";"
// followed by a space, a tab or a line end, removes the line breaks from each
// piece, cuts each piece at every ": " and ":\t", and keeps the piece only if
// that gives exactly two parts (the name, with leading spaces and tabs
// removed, and the value). A piece that gives any other number is dropped
// without a message. This probe applies the same rule to every .theme file in
// the install's themes folder, and reports each piece that holds text and is
// dropped, with the line it starts on in the file as it is on disk.
//
// It reads the files and nothing else: it starts no IDE and no program, and
// writes nothing. Exit codes: see USAGE.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { die, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { buildNumber, findIde } from "./lib/tb-install.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/probe_theme_semicolon.mjs [--ide <twinBASIC.exe>] [-h, --help]

Reads every .theme file in the themes folder of the twinBASIC install and splits
it into properties as the IDE's theme loader does (applyThemeData in ide\\main.js):
comments removed, cut at each ";" followed by a space, a tab or a line end, each
piece cut at each ": " and ":<tab>", and kept only if that gives exactly two
parts. A piece that does not is dropped by the IDE without a message, and the
usual cause is a property that lacks its ";", which merges it with the next one
and loses both. Nothing is written and no program is started.

The probe prints one line for each dropped piece, \`<file> line <n>: dropped
<what the piece holds>\`, with the file relative to the install, then a summary
line, \`<n> properties are lost in <k> of <total> shipped themes (BETA <build>)\`,
or \`no shipped theme loses a property (BETA <build>)\` when none does. A piece
with no ": " in it is shown whole; a merged piece is shown as the names it lost.

  --ide <path>   twinBASIC.exe (default: $TB_IDE, else the newest
                 twinBASIC_IDE_BETA_* on the Desktop); its themes are the
                 .theme files in the themes folder beside it
  -h, --help     print this text and exit

Exit codes:
  0  every piece of every shipped theme loads: the defect is not there
  1  at least one piece is dropped: the defect is there
  2  the probe could not do its job: a refused command line, no IDE, no themes
     folder or no .theme file in it, or a crash`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

const { values } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        ide: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

/**
 * The pieces applyThemeData cuts `text` into, each with the offset in `text`
 * where it starts and the number of parts it gives. Comments are removed as the
 * loader removes them (not replaced by spaces), and every character that stays
 * keeps the offset it had in `text`, so that a piece can be placed in the file.
 */
function loaderPieces(text) {
  const kept = [];
  const at = [];
  const withEnd = `${text}\r\n`;
  const comment = /\/\*[\s\S]*?\*\//g;
  let from = 0;
  for (let m = comment.exec(withEnd); ; m = comment.exec(withEnd)) {
    const to = m ? m.index : withEnd.length;
    for (let i = from; i < to; i++) {
      kept.push(withEnd[i]);
      at.push(i);
    }
    if (!m) break;
    from = m.index + m[0].length;
  }
  const stripped = kept.join("");

  const pieces = [];
  const cut = /; |;\t|;\n|;\r\n/g;
  let start = 0;
  for (let m = cut.exec(stripped); ; m = cut.exec(stripped)) {
    const end = m ? m.index : stripped.length;
    const raw = stripped.slice(start, end);
    const flat = raw.replace(/[\r\n]/g, "");
    pieces.push({ offset: at[start], raw, flat, parts: flat.split(/: |:\t/).length });
    if (!m) break;
    start = m.index + m[0].length;
  }
  return pieces;
}

/** The line number, from 1, of the first character of `piece` that is not white space. */
function lineOf(text, piece) {
  let i = piece.offset;
  while (i < text.length && /\s/.test(text[i])) i++;
  return text.slice(0, i).split("\n").length;
}

/** The names of the properties that start a line of `piece`, as the files lay them out. */
function namesIn(piece) {
  return [...piece.raw.matchAll(/(?:^|\n)[ \t]*([^\s:;]+)(?=:[ \t])/g)].map((m) => m[1]);
}

/** What the loader lost with `piece`: the names of the properties run together in it, else the piece whole. */
function lost(piece) {
  const names = namesIn(piece);
  if (names.length < 2) return `"${piece.flat.trim()}"`;
  return `${names.join(" and ")} (run together with no ";" between them)`;
}

/** How many properties `piece` costs: the ones run together in it, at least one. */
function lostCount(piece) {
  return Math.max(1, namesIn(piece).length);
}

const ide = findIde(values.ide);
if (!ide || !statSync(ide, { throwIfNoEntry: false })?.isFile()) {
  die(
    2,
    (ide ? `no twinBASIC IDE at ${ide}: ` : "no twinBASIC IDE found: ") +
      "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
}
const install = path.dirname(ide);
const folder = path.join(install, "themes");
if (!statSync(folder, { throwIfNoEntry: false })?.isDirectory()) die(2, `no themes folder beside ${ide}: ${folder}`);
const files = readdirSync(folder)
  .filter((name) => /\.theme$/i.test(name))
  .sort();
if (!files.length) die(2, `no .theme file in ${folder}`);

let dropped = 0;
let affected = 0;
for (const name of files) {
  const text = readFileSync(path.join(folder, name), "utf8");
  const shown = `themes/${name}`;
  let here = 0;
  for (const piece of loaderPieces(text)) {
    if (piece.parts === 2 || !piece.flat.trim()) continue;
    here += lostCount(piece);
    console.log(`${shown} line ${lineOf(text, piece)}: dropped ${lost(piece)}`);
  }
  dropped += here;
  if (here) affected++;
}

const build = `BETA ${buildNumber(ide) ?? "?"}`;
console.log(
  dropped
    ? `${dropped} ${dropped === 1 ? "property is" : "properties are"} lost in ${affected} of ${files.length} shipped themes (${build})`
    : `no shipped theme loses a property (${build})`,
);
process.exit(dropped ? 1 : 0);
