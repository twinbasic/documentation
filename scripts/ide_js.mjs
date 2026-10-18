#!/usr/bin/env node
// Reads, names and patches the twinBASIC IDE's minified ide/main.js, so that an
// IDE defect report in BUGS-TO-REPORT.md can carry a "Fix shape": the fixed
// function in a readable form, close to what twinBASIC's developer works with,
// tested on a patched copy of the install. The library is scripts/ide-js/lib.mjs,
// which says how it works; the name map is scripts/ide-js/names.json; each fix
// is bugs/<slug>/fix.js beside its entry's reproducer.
//
// Two rules (WIP.Harness.md): only a copy of an install is ever patched, never
// one on the Desktop (`patch` writes into a copy under the temp folder, or to a
// file outside every install); and Wayne Phillips' own sources are never used,
// so every name in the map is ours.
//
// Exit codes: 0 done, 1 a finding (a name lost, a fix that does not apply),
// 2 the tool could not do its job -- see USAGE.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { die, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import {
  buildOf,
  checkUnit,
  coverage,
  emptyMap,
  FixError,
  fileView,
  fixShapes,
  load,
  mainJsOf,
  NameError,
  namedUnits,
  parse,
  patchUnits,
  scopes,
  sealUnit,
  unitInfo,
  unitView,
} from "./ide-js/lib.mjs";
import { makeIdeCopy } from "./lib/tb-ide-copy.mjs";
import { findIde } from "./lib/tb-install.mjs";

exitOnCrash();

const DEFAULT_MAP = path.join(REPO_ROOT, "scripts", "ide-js", "names.json");

const USAGE = `usage: node scripts/ide_js.mjs <command> [arguments] [--ide <install>] [--map <names.json>] [--out <file>] [--copy-to <dir>] [--all] [--json] [-h, --help]

Reads, names and patches the twinBASIC IDE's minified ide/main.js. A unit is a
top-level function ("debugOutputPartial") or a method of a top-level class
("Class.method"), whose name the minifier keeps; the map gives our names to the
locals and parameters inside units, keyed by where each is declared, so that it
applies to a new build.

Commands:
  survey                    what the minifier left in main.js, and whether the
                            token list rebuilds it byte for byte
  units <other install>     the units that are the same, changed, added and
                            removed between --ide's build and another
  list <unit>               the unit's bindings, each with its key, to name
  name <unit> <key>=<name>...
                            give names to bindings of a unit, in the map, sealed
                            against --ide's build
  seal                      seal every unit of the map against --ide's build again,
                            after its names have been checked there
  check                     how each name of the map applies to --ide's build:
                            exact, carried, review or lost
  view <unit>...            the readable view of units, in our names
  view --all --out <file>   the whole file, every unit of the map in our names
                            (about 50,000 lines; never into the repository)
  patch <fix.js>            splice a fix (whole units in our names) into main.js:
                            --copy-to <dir> copies the install into <dir>, under
                            the temp folder, with the patched main.js, and prints
                            its twinBASIC.exe; --out <file> writes main.js only
  shape <fix.js>            the fix shape: each unit of the fix as the build has
                            it and as fixed, a diff in our names, as markdown

Options:
  --ide <install>   the install: its twinBASIC.exe, its folder or a main.js
                    (default: $TB_IDE, else the newest twinBASIC_IDE_BETA_<n> on
                    the Desktop)
  --map <file>      the name map (default: scripts/ide-js/names.json)
  --out <file>      view, patch: write to this file, not stdout; refused inside
                    the repository, and inside an install not under the temp folder
  --copy-to <dir>   patch: the folder for the patched copy, under the temp folder
  --all             view: the whole file
  --json            survey, units, check: one JSON object
  -h, --help        print this text and exit

Exit codes:
  0  done; check: no name is lost; survey: the token list rebuilds the file
  1  a finding: check, a name is lost; survey, a byte the token list does not
     account for; patch, shape, a fix that does not apply to the build (a unit
     it names is missing, a name in it is one of the build's minified names, or
     the patched unit is not the fix)
  2  a refused command line, an install or a file that cannot be read, a main.js
     or fix that does not parse, a name the map may not take, a refused --out or
     --copy-to, or a crash`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

// What each command takes, as [positionals min, max, options]; anything else is refused.
const COMMANDS = {
  survey: [0, 0, ["ide", "json"]],
  units: [1, 1, ["ide", "json"]],
  list: [1, 1, ["ide"]],
  name: [2, Infinity, ["ide", "map"]],
  seal: [0, 0, ["ide", "map"]],
  check: [0, 0, ["ide", "map", "json"]],
  view: [0, Infinity, ["ide", "map", "out", "all"]],
  patch: [1, 1, ["ide", "map", "out", "copyTo"]],
  shape: [1, 1, ["ide", "map"]],
};
const COMMAND_ARGS = {
  units: "another install",
  list: "a unit",
  name: "a unit and at least one <key>=<name>",
  view: "a unit, or --all",
  patch: "a fix",
  shape: "a fix",
};
const FLAG = (key) => `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        ide: { type: "string" },
        map: { type: "string" },
        out: { type: "string" },
        "copy-to": { type: "string" },
        all: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      positionals: { min: 0, max: Infinity },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

// A command line refused after the parse: the message, then the usage. All of
// these are checked before an install is read.
const refuse = (message) => die(2, `${message}\n${USAGE}`);
const insideTemp = (p) => insideDir(tmpdir(), p);

const [command, ...args] = positionals;
if (!command) die(2, USAGE);
if (!(command in COMMANDS)) refuse(`unknown command: ${command}`);
const [min, max, applies] = COMMANDS[command];
for (const key of ["ide", "map", "out", "copyTo", "all", "json"]) {
  const given = values[key] !== undefined && values[key] !== false;
  if (given && !applies.includes(key)) refuse(`${FLAG(key)} does not apply to ${command}`);
}
// view takes units, or --all and none
const fewest = command === "view" && !values.all ? 1 : min;
const most = command === "view" && values.all ? 0 : max;
if (args.length < fewest) refuse(`${command} needs ${COMMAND_ARGS[command]}`);
if (args.length > most) refuse(`unexpected argument: ${args[most]}`);
if (command === "view" && values.all && !values.out) refuse("view --all needs --out <file>");
if (command === "patch" && !values.out === !values.copyTo)
  refuse("patch needs one of --out <file> and --copy-to <dir>");
if (command === "name") {
  for (const pair of args.slice(1)) if (!/^[^=]+=.+$/.test(pair)) refuse(`expected <key>=<name>, got: ${pair}`);
}
// Never into an install that is not a copy under the temp folder, and never
// into the repository, which holds no copy of main.js.
if (values.out) {
  const out = path.resolve(values.out);
  if (insideDir(REPO_ROOT, out)) refuse(`refusing --out ${out}: it is inside the repository`);
  for (let dir = path.dirname(out); !insideTemp(out) && path.dirname(dir) !== dir; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, "twinBASIC.exe")) || existsSync(path.join(dir, "ide", "main.js")))
      refuse(`refusing --out ${out}: it is inside the install ${dir}`);
  }
}
if (values.copyTo && !insideTemp(values.copyTo))
  refuse(`refusing --copy-to ${path.resolve(values.copyTo)}: it is not under ${tmpdir()}`);

/** The install's main.js, parsed, with its file and build. */
function loadInstall(given) {
  const ide = findIde(given);
  if (!ide) die(2, "no twinBASIC install: pass --ide or set TB_IDE");
  const file = mainJsOf(ide);
  if (values.out && path.resolve(values.out).toLowerCase() === path.resolve(file).toLowerCase())
    die(2, `refusing --out ${path.resolve(values.out)}: it is the main.js read`);
  let parsed;
  try {
    parsed = load(file);
  } catch (err) {
    die(2, err.code === "ENOENT" ? `no main.js at ${file}` : `${file} does not parse: ${err.message}`);
  }
  return { file, parsed, build: buildOf(file) };
}

function loadFix(file) {
  try {
    return parse(readFileSync(file, "utf8"));
  } catch (err) {
    return die(2, err.code === "ENOENT" ? `no fix at ${file}` : `${file} does not parse: ${err.message}`);
  }
}

const mapFile = values.map ?? DEFAULT_MAP;
function readMap({ orEmpty = false } = {}) {
  try {
    const map = JSON.parse(readFileSync(mapFile, "utf8"));
    if (map.format !== 1 || typeof map.units !== "object") die(2, `${mapFile} is not a name map of format 1`);
    return map;
  } catch (err) {
    if (err.code === "ENOENT" && orEmpty) return emptyMap();
    return die(2, err.code === "ENOENT" ? `no name map at ${mapFile}` : `${mapFile} cannot be read: ${err.message}`);
  }
}
const writeMap = (map) => writeFileSync(mapFile, `${JSON.stringify(map, null, 2)}\n`);

const excerpt = (text, at) => text.slice(Math.max(0, at - 25), at + 35).replace(/\s+/g, " ");
const print = (obj, lines) => console.log(values.json ? JSON.stringify(obj, null, 2) : lines.join("\n"));

if (command === "survey") {
  const t0 = performance.now();
  const { file, parsed, build } = loadInstall(values.ide);
  const parseMs = Math.round(performance.now() - t0);
  const { text, ast } = parsed;
  const top = {};
  for (const n of ast.body) {
    const k = n.type === "VariableDeclaration" ? `${n.type}(${n.kind})` : n.type;
    top[k] = (top[k] ?? 0) + 1;
  }
  const sm = scopes(parsed);
  let locals = 0;
  const lengths = {};
  for (const s of sm.scopes) {
    if (s === sm.globalScope) continue;
    for (const v of s.variables) {
      if (!v.defs.length) continue;
      locals++;
      lengths[v.name.length] = (lengths[v.name.length] ?? 0) + 1;
    }
  }
  const count = (re) => (text.match(re) ?? []).length;
  const report = {
    file,
    build,
    bytes: Buffer.byteLength(text),
    lines: text.split("\n").length,
    parseMs,
    tokens: parsed.tokens.length,
    comments: parsed.comments.length,
    coverage: coverage(parsed),
    topLevel: top,
    units: namedUnits(ast).size,
    globalNames: sm.globalScope.variables.length,
    implicitGlobals: sm.globalScope.through.length,
    localBindings: locals,
    localNameLengths: lengths,
    sourceMappingURL: count(/sourceMappingURL/g),
  };
  print(
    report,
    Object.entries(report).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`),
  );
  process.exit(report.coverage.exact ? 0 : 1);
}

if (command === "units") {
  const a = loadInstall(values.ide);
  const b = loadInstall(args[0]);
  const ua = namedUnits(a.parsed.ast);
  const ub = namedUnits(b.parsed.ast);
  const changed = [];
  const tally = { same: 0, changed: 0, removed: 0, added: 0 };
  for (const name of ua.keys()) {
    if (!ub.has(name)) {
      tally.removed++;
      continue;
    }
    if (unitInfo(a.parsed, name).shape === unitInfo(b.parsed, name).shape) tally.same++;
    else {
      tally.changed++;
      changed.push(name);
    }
  }
  for (const name of ub.keys()) if (!ua.has(name)) tally.added++;
  print({ from: a.build, to: b.build, ...tally, changed }, [
    `${a.build ?? a.file} -> ${b.build ?? b.file}: ${JSON.stringify(tally)}`,
    `changed: ${changed.join(", ")}`,
  ]);
  process.exit(0);
}

if (command === "list") {
  const { parsed } = loadInstall(values.ide);
  const u = unitInfo(parsed, args[0]);
  if (!u) die(2, `no unit named ${args[0]}`);
  console.log(`${args[0]}: ${u.node.end - u.node.start} bytes at ${u.node.start}, shape ${u.shape}`);
  for (const x of u.bindings) {
    const use = x.ranges[1] ?? x.ranges[0];
    console.log(
      `  ${x.key.padEnd(8)} ${x.name.padEnd(4)} ${x.def.padEnd(10)} ${x.kind.padEnd(7)} refs ${String(x.refs).padStart(2)}  ${excerpt(parsed.text, use[0])}`,
    );
  }
  process.exit(0);
}

if (command === "name" || command === "seal") {
  const { parsed, build } = loadInstall(values.ide);
  const map = readMap({ orEmpty: command === "name" });
  const work = {};
  if (command === "name") {
    const [unit, ...pairs] = args;
    const names = Object.fromEntries(Object.entries(map.units[unit]?.names ?? {}).map(([key, n]) => [key, n.name]));
    for (const pair of pairs) {
      const at = pair.indexOf("=");
      names[pair.slice(0, at)] = pair.slice(at + 1);
    }
    work[unit] = names;
  } else {
    for (const [unit, entry] of Object.entries(map.units))
      work[unit] = Object.fromEntries(Object.entries(entry.names).map(([key, n]) => [key, n.name]));
  }
  try {
    for (const [unit, names] of Object.entries(work)) map.units[unit] = sealUnit(parsed, unit, names, build);
  } catch (err) {
    if (err instanceof NameError) die(2, err.message);
    throw err;
  }
  writeMap(map);
  console.log(`sealed ${Object.keys(work).join(", ") || "nothing"} against ${build ?? "an unknown build"}`);
  process.exit(0);
}

if (command === "check") {
  const { parsed, build } = loadInstall(values.ide);
  const map = readMap();
  const tally = { exact: 0, carried: 0, review: 0, lost: 0 };
  const rows = [];
  for (const [unit, entry] of Object.entries(map.units)) {
    for (const v of checkUnit(parsed, unit, entry).verdicts) {
      tally[v.verdict]++;
      rows.push({ unit, ...v });
    }
  }
  print({ build, ...tally, names: rows }, [
    ...rows.map(
      (r) =>
        `${r.verdict.padEnd(8)} ${r.unit} ${r.key} ${r.was} -> ${r.now ?? "?"} = ${r.name}${r.why ? `  (${r.why})` : ""}`,
    ),
    `${build ?? "unknown build"}: ${JSON.stringify(tally)}`,
  ]);
  process.exit(tally.lost ? 1 : 0);
}

if (command === "view") {
  const { parsed, build } = loadInstall(values.ide);
  const map = readMap({ orEmpty: values.map === undefined });
  let out = "";
  if (values.all) out = await fileView(parsed, map, build);
  for (const unit of args) {
    const v = await unitView(parsed, unit, map.units[unit], build);
    if (v === undefined) die(2, `no unit named ${unit}`);
    out += v;
  }
  if (values.out) writeOut(values.out, out);
  else process.stdout.write(out);
  process.exit(0);
}

// patch and shape
const { file, parsed, build } = loadInstall(values.ide);
const fix = loadFix(args[0]);
const map = readMap();
try {
  if (command === "shape") {
    for (const s of await fixShapes(parsed, fix, map)) {
      const code = (list) => list.map((n) => `\`${n}\``).join(", ");
      const ours = s.ours.length
        ? ` The local names are ours, not twinBASIC's (${code(s.ours.map(([, o]) => o))}); the build calls them ${code(s.ours.map(([m]) => m))}.`
        : "";
      console.log(
        `\`${s.unit}\` in \`ide/main.js\`, ${build ?? "an unknown build"}, in a readable form.${ours}\n\n` +
          `\`\`\`diff\n${s.diff || " (no change)\n"}\`\`\`\n`,
      );
    }
    process.exit(0);
  }
  const r = patchUnits(parsed, fix, map);
  for (const [unit, verdicts] of r.skipped) {
    const names = verdicts.map((v) => v.name).join(", ");
    console.log(`${unit}: names the map does not apply to this build, kept as written: ${names}`);
  }
  for (const e of r.edits) {
    const pre = parsed.text.slice(Math.max(0, e.from - 16), e.from);
    const post = parsed.text.slice(e.to, e.to + 8);
    console.log(`${e.unit} @${e.from}:\n  ${pre}${e.before}${post}\n  ${pre}${e.after}${post}`);
  }
  const net = Buffer.byteLength(r.text) - Buffer.byteLength(parsed.text);
  console.log(`${r.edits.length} edit(s), ${net} byte(s) net; each patched unit is the fix`);
  if (values.out) {
    writeOut(values.out, r.text);
    console.log(`patched main.js: ${path.resolve(values.out)}`);
  } else {
    const exe = path.join(path.dirname(path.dirname(path.resolve(file))), "twinBASIC.exe");
    let copy;
    try {
      copy = makeIdeCopy({ ide: exe, dest: values.copyTo });
    } catch (err) {
      die(2, err.message);
    }
    writeFileSync(mainJsOf(copy), r.text);
    console.log(`patched copy: ${copy}`);
  }
  process.exit(0);
} catch (err) {
  if (err instanceof FixError) die(1, err.message);
  throw err;
}

function insideDir(root, p) {
  const rel = path.relative(path.resolve(root), path.resolve(p));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function writeOut(given, text) {
  mkdirSync(path.dirname(path.resolve(given)), { recursive: true });
  writeFileSync(given, text);
}
