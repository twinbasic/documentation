#!/usr/bin/env node
// Reproducer projects for the entries of BUGS-TO-REPORT.md, under bugs/<slug>/.
//
//     node scripts/bug_repro.mjs new <slug> "<entry title>"
//     node scripts/bug_repro.mjs pack <slug>
//     node scripts/bug_repro.mjs compile|build|run <slug> [options]
//     node scripts/bug_repro.mjs verify [slug ...] [options]
//
// What a reproducer is, and where it lives, is the preamble of BUGS-TO-REPORT.md
// ("Reproducer projects"). This tool keeps the three files in step -- the source
// tree, the packed .twinproj and the zip for the GitHub issue -- and puts a
// reproducer in front of the compiler, through scripts/tbbuild.mjs and
// scripts/tbrun.mjs, so that an entry can say what it saw and a later beta can be
// asked whether it still does.
//
// bugs/<slug>/repro.json says how to ask. `verify` reads it for every reproducer:
// the mode (compile, build, run, cli or manual), the target, and what a
// reproduction looks like (`expect`). Its keys are listed by loadRepro() below,
// and the contributor-facing description is docs/Documentation/Tools.md.
//
// Exit codes: 0 done, 1 a finding, 2 the tool could not do its job, 3 and up its
// own -- see USAGE. tbbuild's and tbrun's exit codes are mapped into that table by
// TBBUILD_EXIT and TBRUN_EXIT, and are what `expect.exit` in repro.json is
// compared with, unmapped.
//
// ---------------------------------------------------------------- why this
//
// An entry in BUGS-TO-REPORT.md owes a reader a project that shows the bug. By
// hand, that is an impexp import and a zip, and then a build to see that the bug
// is still there; this does the first two the same way every time and the third
// without a person at the IDE. `verify` is the reason the file exists: an entry
// that no longer reproduces on the newest beta is one to retire or to re-check.
//
// `verify` is never run by a wrapper, a gate or CI. It needs a twinBASIC install,
// and Windows with a private desktop, as examples.bat does.
//
// ------------------------------------------------------------- what it relies on
//
//  1. THE ZIP IS WRITTEN HERE, in Node. Compress-Archive is PowerShell and 7-Zip
//     is not on PATH; Git Bash's `tar -a` writes a tar archive under the .zip
//     name and exits 0. A single-entry zip is a local header, the deflated
//     bytes, a central directory entry and the end record, and zlib.crc32 is the
//     checksum, so no dependency is needed. The entry's time is the .twinproj's
//     own, so packing an unchanged source tree twice writes the same zip.
//  2. impexp EXITS 6 WHEN IT WARNS. `import` that finished with a warning is
//     still a pack, so 0 and 6 are both success, and its output is printed.
//  3. AN IDE THAT RUNS MANY REPRODUCERS OWNS THE REGISTRY TIDY ONCE. Under
//     `verify` this process calls startTidy for every lane, so the tbbuild and
//     tbrun children (which find TB_REGISTRY_OWNER set) leave the registry alone,
//     and nothing a lane that finishes first puts back is another's entry. The
//     lanes use ports base, base+1, ..., which key the work folders tbbuild and
//     tbrun use, as in check_examples.
//  4. `run` STAGES A COPY, never the tree: it adds Sources/TbRunProbe.twin, a
//     module whose [RunAfterBuild] Sub clears the console and calls Main. With
//     --exe that module is left out, because tbrun runs Sub Main in the built exe
//     itself.
//  5. `cli` MODE RUNS THE COMPILER EXECUTABLE (bin\twinBASIC_win32.exe) with
//     stdin from the null device and a time limit, on the packed project, and
//     compares its exit code and output. Paths are given backslashed and in full:
//     `export` prefixes \\?\ to its project path, and cannot find a folder named
//     with forward slashes (WIP.md, "Driving the twinBASIC compiler").
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import {
  CliError,
  choiceOption,
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  withUsageError,
} from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { summaryLine, TARGETS } from "./lib/tb-ide.mjs";
import { compilerExe, findIde } from "./lib/tb-install.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

let tidy = null;
exitOnCrash(() => finishTidy(tidy));

const USAGE = `usage: node scripts/bug_repro.mjs <command> [slug ...] [--ide <twinBASIC.exe>] [--port N] [--arch win32|win64] [--timeout S] [--llvm] [--exe] [--jobs N] [--keep] [--show|--hide] [-h, --help]

Reproducer projects for the entries of BUGS-TO-REPORT.md, under bugs/<slug>/.
<slug> is kebab-case: lowercase letters and digits joined by single hyphens.

Commands:
  new <slug> "<title>"  create bugs/<slug>/src/ from the console template, with a
                        project of the slug's name and a Startup module, and
                        bugs/<slug>/repro.json with "mode": "manual"
  pack <slug>           pack src/ into <slug>.twinproj with scripts/impexp.mjs, and
                        write <slug>.zip, the file a GitHub issue accepts
  compile <slug>        pack, then compile the project in the IDE (tbbuild) and
                        print its diagnostics
  build <slug>          pack, then compile and build it (tbbuild --build)
  run <slug>            run a copy of src/ whose [RunAfterBuild] probe calls Sub
                        Main, and print what it writes to the DEBUG CONSOLE (tbrun)
  verify [slug ...]     run what each repro.json says, for the named reproducers or
                        all of bugs/*, and report per reproducer whether it
                        reproduces. Needs a twinBASIC install; run by a person only

Options:
  --ide <path>      twinBASIC.exe (default: $TB_IDE, else the newest
                    twinBASIC_IDE_BETA_* on the Desktop)
  --port <n>        DevTools port to start the IDE on (default 9440); with verify
                    the first of the lanes' ports
  --arch <target>   win32 or win64 (default win32); compile, build and run
  --timeout <secs>  as tbbuild's and tbrun's; with a cli reproducer, the time
                    limit on the compiler executable
  --llvm            build with LLVM; build and run
  --exe             run also runs the built exe and prints what it writes; run
  --jobs <n>        reproducers to run at once, on ports base, base+1, ... (default
                    1); verify
  --keep            leave the IDE running; its pid is printed; compile, build, run
  --show, --hide    show the IDE on the desktop, or keep it on a private one
                    (default: hidden, unless TBBUILD_SHOW is set)
  -h, --help        print this text and exit

Exit codes:
  0  done: a project that compiled, built or ran as it should; with verify, every
     reproducer that can be run on its own still reproduces
  1  a finding: the project has errors, or its build failed after a clean compile;
     with verify, at least one reproducer no longer reproduces
  2  a refused command line (a slug that is not kebab-case, a reproducer that does
     not exist, an option that does not apply to the command), a repro.json that
     is not valid, no IDE, a project that could not be packed, a harness that
     failed, or a crash; with verify, a lane's harness failed
  3  new: bugs/<slug> already exists
  4  the compile never settled
  5  the project crashes the compiler
  6  run: the probe printed nothing
  7  run: the probe ended before it returned
  8  run --exe: the exe exited with a code other than 0, or was still running after
     --timeout`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

// What each command takes besides -h; anything else given is refused.
const APPLIES = {
  new: [],
  pack: [],
  compile: ["ide", "port", "arch", "timeout", "keep", "show", "hide"],
  build: ["ide", "port", "arch", "timeout", "keep", "show", "hide", "llvm"],
  run: ["ide", "port", "arch", "timeout", "keep", "show", "hide", "llvm", "exe"],
  verify: ["ide", "port", "timeout", "jobs", "show", "hide"],
};
const FLAG = (key) => `--${key}`;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        ide: { type: "string" },
        port: { type: "string" },
        arch: { type: "string" },
        timeout: { type: "string" },
        jobs: { type: "string" },
        llvm: { type: "boolean", default: false },
        exe: { type: "boolean", default: false },
        keep: { type: "boolean", default: false },
        show: { type: "boolean", default: false },
        hide: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      positionals: { min: 0, max: Infinity },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

const [command, ...args] = positionals;
if (!command) die(2, USAGE);

// Everything on the command line is read before anything starts.
const { port, arch, timeout, jobs, slugs, title } = withUsageError(() => {
  if (!(command in APPLIES)) throw new CliError("unknown-command", `unknown command: ${command}`);
  for (const key of Object.keys(values)) {
    if (key === "help" || !values[key] || APPLIES[command].includes(key)) continue;
    throw new CliError("inapplicable", `${FLAG(key)} does not apply to ${command}`, { option: FLAG(key) });
  }
  if (values.show && values.hide) {
    throw new CliError("conflict", "--show and --hide cannot be given together", { options: ["--show", "--hide"] });
  }
  const read = {
    port: numberOption(values.port ?? "9440", { option: "--port", integer: true, min: 1, max: 65535 }),
    arch: values.arch === undefined ? undefined : choiceOption(values.arch, { option: "--arch", choices: TARGETS }),
    timeout: values.timeout === undefined ? undefined : numberOption(values.timeout, { option: "--timeout", above: 0 }),
    jobs: numberOption(values.jobs ?? "1", { option: "--jobs", integer: true, min: 1 }),
  };
  if (read.port + read.jobs - 1 > 65535) {
    throw new CliError("bad-number", `--port ${read.port} with --jobs ${read.jobs} runs past port 65535`);
  }
  const named = command === "verify" ? args : args.slice(0, 1);
  // verify takes any number of slugs, none meaning every reproducer under bugs/.
  if (command !== "verify") {
    if (!args.length) {
      throw new CliError("missing-positional", `${command} needs a slug`);
    } else if (command === "new" && args.length !== 2) {
      throw new CliError("missing-positional", `new needs a slug and the entry's title, quoted: new <slug> "<title>"`);
    } else if (command !== "new" && args.length > 1) {
      throw new CliError("unexpected-positional", `unexpected argument: ${args[1]}`, { arg: args[1] });
    }
  }
  for (const slug of named) {
    if (!SLUG.test(slug)) {
      throw new CliError(
        "bad-slug",
        `not a valid slug: ${slug} (lowercase letters and digits joined by single hyphens, such as my-bug)`,
      );
    }
  }
  if (command === "new" && !args[1].trim()) throw new CliError("empty-value", "the entry's title is empty");
  return { ...read, slugs: named, title: command === "new" ? args[1] : undefined };
}, usageError);

// ------------------------------------------------------------------ the files

const BUGS = path.join(REPO_ROOT, "bugs");
const TEMPLATE = path.join(REPO_ROOT, "test", "example-projects", "console", "Settings");
const IMPEXP = path.join(REPO_ROOT, "scripts", "impexp.mjs");
const TBBUILD = path.join(REPO_ROOT, "scripts", "tbbuild.mjs");
const TBRUN = path.join(REPO_ROOT, "scripts", "tbrun.mjs");

const where = (slug) => {
  const dir = path.join(BUGS, slug);
  return {
    dir,
    src: path.join(dir, "src"),
    repro: path.join(dir, "repro.json"),
    twinproj: path.join(dir, `${slug}.twinproj`),
    zip: path.join(dir, `${slug}.zip`),
  };
};
const rel = (file) => path.relative(REPO_ROOT, file).replaceAll("\\", "/");

/** A failure the command (or one verify lane) reports and ends on, with the exit code it means. */
class Fail extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

const crlf = (lines) => lines.join("\r\n");
const STARTUP = crlf(["Module Startup", "", "    Public Sub Main()", "    End Sub", "", "End Module", ""]);
const PROBE = crlf([
  "Module TbRunProbe",
  "    [RunAfterBuild]",
  "    Public Sub RunRepro()",
  "        Debug.Cls",
  "        Main",
  "    End Sub",
  "End Module",
  "",
]);

// kebab-case to PascalCase, for the project's name. A name that begins with a
// digit is not an identifier, so it is given a word to start with.
function pascal(slug) {
  const name = slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
  return (/^\d/.test(name) ? `Repro${name}` : name).slice(0, 60);
}

// Rewrites the string value of one key of the template's Settings. A key the
// template does not have is an error, because it means the template changed.
function setKey(text, key, value) {
  const re = new RegExp(`("${key.replaceAll(".", "\\.")}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!re.test(text)) throw new Fail(`${rel(TEMPLATE)} has no "${key}" to set`);
  return text.replace(re, (_, head) => `${head}${JSON.stringify(value)}`);
}

function newReproducer(slug, entryTitle) {
  const p = where(slug);
  if (existsSync(p.dir)) throw new Fail(`${rel(p.dir)} already exists`, 3);
  if (!existsSync(TEMPLATE)) throw new Fail(`no template project at ${rel(TEMPLATE)}`);
  const name = pascal(slug);
  let settings = readFileSync(TEMPLATE, "utf8");
  settings = setKey(settings, "project.name", name);
  settings = setKey(settings, "project.appTitle", name);
  settings = setKey(settings, "project.description", `Reproduces: ${entryTitle}`);
  settings = setKey(settings, "project.id", `{${randomUUID().toUpperCase()}}`);
  mkdirSync(path.join(p.src, "Sources"), { recursive: true });
  writeFileSync(path.join(p.src, "Settings"), settings);
  writeFileSync(path.join(p.src, "Sources", "Startup.twin"), STARTUP);
  const steps = "Describe what a person does to see the bug, or set mode to compile, build, run or cli.";
  writeFileSync(p.repro, `${JSON.stringify({ mode: "manual", steps }, null, 2)}\n`);
  console.log(`created ${rel(p.dir)}/ (project ${name}): edit src/Sources, then pack; repro.json is manual until set`);
}

// ------------------------------------------------------------------------ zip

/**
 * A zip file of one file, as the bytes: a local header, the deflated data, a
 * central directory entry and the end record, with the file's own modified time.
 */
function zipOne(name, data, mtime) {
  const compressed = zlib.deflateRawSync(data, { level: 9 });
  const crc = zlib.crc32(data);
  const nameBytes = Buffer.from(name, "utf8");
  const time = (mtime.getHours() << 11) | (mtime.getMinutes() << 5) | (mtime.getSeconds() >> 1);
  const date = ((Math.max(mtime.getFullYear(), 1980) - 1980) << 9) | ((mtime.getMonth() + 1) << 5) | mtime.getDate();
  const UTF8 = 0x0800;

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed: deflate
  local.writeUInt16LE(UTF8, 6);
  local.writeUInt16LE(8, 8); // method: deflate
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  // extra field length (28) stays 0

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(UTF8, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(date, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  // extra, comment, disk, internal and external attributes (30-41) stay 0
  central.writeUInt32LE(0, 42); // offset of the local header

  const localSize = local.length + nameBytes.length + compressed.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8); // entries on this disk
  end.writeUInt16LE(1, 10); // entries in all
  end.writeUInt32LE(central.length + nameBytes.length, 12);
  end.writeUInt32LE(localSize, 16);

  return Buffer.concat([local, nameBytes, compressed, central, nameBytes, end]);
}

// Packs src/ into the .twinproj with impexp, then zips it. Returns what impexp
// printed, which the caller prints or not.
function pack(slug) {
  const p = where(slug);
  if (!existsSync(path.join(p.src, "Settings"))) throw new Fail(`no ${rel(p.src)}/Settings: nothing to pack`);
  const r = spawnSync(process.execPath, [IMPEXP, "import", p.twinproj, p.src, "--overwrite"], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    windowsHide: true,
  });
  const said = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.error || (r.status !== 0 && r.status !== 6)) {
    throw new Fail(
      `impexp import ${r.error ? `failed (${r.error.message})` : `exited ${r.status}`}:\n${said.trimEnd()}`,
    );
  }
  const file = readFileSync(p.twinproj);
  writeFileSync(p.zip, zipOne(`${slug}.twinproj`, file, statSync(p.twinproj).mtime));
  return `${said}packed ${rel(p.twinproj)} and ${rel(p.zip)}`;
}

// ------------------------------------------------------------ repro.json

const MODES = ["compile", "build", "run", "cli", "manual"];
// What `expect` may hold in each mode.
const EXPECT_KEYS = {
  compile: ["exit", "diagnostics", "noDiagnostics"],
  build: ["exit", "message"],
  run: ["exit", "output"],
  cli: ["exit", "output"],
};

/**
 * Reads and strictly checks bugs/<slug>/repro.json. A fault is a Fail that names
 * the file and the key. Returns the file's content with each regular expression
 * compiled (`expect.output` as RegExp objects, `expect.message` as one).
 */
function loadRepro(slug) {
  const file = where(slug).repro;
  const name = rel(file);
  const bad = (key, why) => {
    throw new Fail(`${name}: ${key ? `"${key}" ` : ""}${why}`);
  };
  if (!existsSync(file)) throw new Fail(`${name}: no such file`);
  let json;
  try {
    json = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return bad("", `is not valid JSON: ${e.message}`);
  }
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isObject(json)) return bad("", "must be a JSON object");
  const keys = ["mode", "arch", "llvm", "expect", "cli", "steps"];
  for (const key of Object.keys(json)) if (!keys.includes(key)) bad(key, "is not a key repro.json has");
  if (!MODES.includes(json.mode)) bad("mode", `must be one of ${MODES.join(", ")}`);
  const { mode } = json;
  if ("arch" in json && !TARGETS.includes(json.arch)) bad("arch", `must be ${TARGETS.join(" or ")}`);
  if ("llvm" in json && typeof json.llvm !== "boolean") bad("llvm", "must be true or false");
  if (json.llvm && !["build", "run"].includes(mode)) bad("llvm", "applies to the build and run modes only");
  if ("steps" in json && typeof json.steps !== "string") bad("steps", "must be a string");
  if (mode === "cli") {
    if (!Array.isArray(json.cli) || !json.cli.length || !json.cli.every((a) => typeof a === "string")) {
      bad("cli", "must be a list of strings, the compiler executable's arguments");
    }
  } else if ("cli" in json) bad("cli", "applies to the cli mode only");

  const out = { ...json, expect: undefined };
  if (mode === "manual") {
    if ("expect" in json) bad("expect", "does not apply to the manual mode");
    return out;
  }
  if (!isObject(json.expect)) bad("expect", "is required, an object, for every mode but manual");
  const e = json.expect;
  for (const key of Object.keys(e)) {
    if (!["exit", "diagnostics", "noDiagnostics", "output", "message"].includes(key)) {
      bad(`expect.${key}`, "is not a key expect has");
    }
    if (!EXPECT_KEYS[mode].includes(key)) bad(`expect.${key}`, `does not apply to the ${mode} mode`);
  }
  if ("exit" in e && !Number.isInteger(e.exit)) bad("expect.exit", "must be a whole number");
  if ("diagnostics" in e && !(Array.isArray(e.diagnostics) && e.diagnostics.every((d) => typeof d === "string"))) {
    bad("expect.diagnostics", "must be a list of strings, diagnostic codes");
  }
  if ("noDiagnostics" in e && typeof e.noDiagnostics !== "boolean")
    bad("expect.noDiagnostics", "must be true or false");
  const regex = (key, text) => {
    if (typeof text !== "string") bad(key, "must be a string, a regular expression");
    try {
      return new RegExp(text, "m");
    } catch (err) {
      return bad(key, `is not a regular expression: ${err.message}`);
    }
  };
  const expect = { ...e };
  if ("output" in e) {
    if (!Array.isArray(e.output)) bad("expect.output", "must be a list of regular expressions");
    expect.output = e.output.map((text, i) => regex(`expect.output[${i}]`, text));
  }
  if ("message" in e) expect.message = regex("expect.message", e.message);
  if (!Object.keys(e).length) bad("expect", "is empty: say what a reproduction looks like");
  out.expect = expect;
  return out;
}

// --------------------------------------------------------- running the tools

function findTools(ide) {
  const exe = findIde(ide);
  if (!exe || !existsSync(exe)) {
    throw new Fail(
      (exe ? `no twinBASIC IDE at ${exe}: ` : "no twinBASIC IDE found: ") +
        "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
    );
  }
  return exe;
}

// A tool run as a child, with its output collected. A tool that outlives its
// time limit is ended with its process tree, by pid.
function runNode(scriptArgs, limitMs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, scriptArgs, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8").on("data", (d) => {
      stdout += d;
    });
    child.stderr.setEncoding("utf8").on("data", (d) => {
      stderr += d;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    }, limitMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: `${stderr}${e.message}`, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

// The limit on a child: its own timeout, and then time for it to end the IDE.
const limitFor = (secs, own) => ((secs ?? own) + 240) * 1000;

const ideFlags = (o) => [
  ...(o.ide ? ["--ide", o.ide] : []),
  "--port",
  String(o.port),
  ...(o.arch ? ["--arch", o.arch] : []),
  ...(o.timeout !== undefined ? ["--timeout", String(o.timeout)] : []),
  ...(o.show ? ["--show"] : []),
  ...(o.hide ? ["--hide"] : []),
  ...(o.keep ? ["--keep"] : []),
];

/** tbbuild on the packed project: `build` adds --build, or --llvm, which implies it. */
async function compileOrBuild(slug, o) {
  const p = where(slug);
  const flags = [...ideFlags(o), ...(o.llvm ? ["--llvm"] : o.build ? ["--build"] : [])];
  const r = await runNode([TBBUILD, p.twinproj, "--json", ...flags], limitFor(o.timeout, 180));
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // a failure before the report: its words are on stderr
  }
  return { ...r, json, message: r.stderr.trim(), output: r.stdout };
}

/** tbrun on a staged copy of src/, with the probe module added unless --exe runs Sub Main in the exe. */
async function runProbe(slug, o) {
  const p = where(slug);
  const stage = path.join(tmpdir(), "bugrepro", String(o.port), slug);
  rmSync(stage, { recursive: true, force: true });
  try {
    cpSync(p.src, stage, { recursive: true });
    mkdirSync(path.join(stage, "Sources"), { recursive: true });
    if (!o.exe) writeFileSync(path.join(stage, "Sources", "TbRunProbe.twin"), PROBE);
    const flags = [...ideFlags(o), ...(o.llvm ? ["--llvm"] : []), ...(o.exe ? ["--exe"] : [])];
    const r = await runNode([TBRUN, stage, ...flags], limitFor(o.timeout, 120));
    return { ...r, json: null, message: r.stderr.trim(), output: r.stdout };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

/** The compiler executable, on the packed project, as a cli repro.json says. */
function runCli(slug, repro, o) {
  const exe = compilerExe(findTools(o.ide));
  if (!existsSync(exe)) throw new Fail(`no compiler beside the IDE at ${exe}`);
  const scratch = mkdtempSync(path.join(tmpdir(), "bugrepro-cli-"));
  try {
    // Copies, so a command that writes its project or its folder (an import, an
    // export --overwrite) never touches the committed reproducer.
    const p = where(slug);
    const project = path.join(scratch, path.basename(p.twinproj));
    const src = path.join(scratch, "src");
    copyFileSync(p.twinproj, project);
    cpSync(p.src, src, { recursive: true });
    const argv = repro.cli.map((a) =>
      a.replaceAll("{project}", project).replaceAll("{src}", src).replaceAll("{tmp}", scratch),
    );
    const limit = (o.timeout ?? 120) * 1000;
    const r = spawnSync(exe, argv, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: limit,
      windowsHide: true,
    });
    if (r.error) {
      throw new Fail(
        r.error.code === "ETIMEDOUT" ? `the compiler executable ran past ${limit / 1000} s` : r.error.message,
      );
    }
    const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", json: null, message: "", output };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// tbbuild's and tbrun's exit codes in this tool's table.
const TBBUILD_EXIT = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 5, 5: 1 };
const TBRUN_EXIT = { 0: 0, 1: 1, 2: 2, 3: 6, 4: 5, 5: 7, 6: 8 };
const mapped = (table, code) => table[code] ?? 2;

// ------------------------------------------------------------------- printing

function printBuild(r) {
  const j = r.json;
  if (j) {
    if (j.arch && j.arch !== TARGETS[0]) console.log(`target: ${j.arch}`);
    for (const row of j.diagnostics ?? []) console.log(row);
    console.log(summaryLine([j.errors, j.warnings, j.hints, j.infos]));
    // The build log is the finding when the build failed; on success it is noise.
    if (r.code === 5) for (const line of j.buildLog ?? []) console.log(line);
    if (j.built) console.log(`built: ${j.built}`);
    if (j.dialogs?.length) console.log("dialogs:", JSON.stringify(j.dialogs));
    if (j.kept && j.idePid) console.log(`ide-pid: ${j.idePid}`);
  } else if (r.stdout.trim()) process.stdout.write(r.stdout);
  if (r.stderr.trim()) process.stderr.write(r.stderr.endsWith("\n") ? r.stderr : `${r.stderr}\n`);
}

function printRun(r) {
  if (r.stdout) process.stdout.write(r.stdout.endsWith("\n") ? r.stdout : `${r.stdout}\n`);
  if (r.stderr.trim()) process.stderr.write(r.stderr.endsWith("\n") ? r.stderr : `${r.stderr}\n`);
}

const requireReproducer = (slug) => {
  const p = where(slug);
  if (!existsSync(path.join(p.src, "Settings"))) {
    throw new Fail(`no such reproducer: ${rel(p.dir)} (no src/Settings)`);
  }
};

// --------------------------------------------------------------------- verify

// Whether a run reproduces what repro.json expects: the problems, none if it does.
function mismatches(repro, r) {
  const e = repro.expect;
  const problems = [];
  if ("exit" in e && r.code !== e.exit) problems.push(`expected exit ${e.exit}, got ${r.code}`);
  if (e.diagnostics) {
    const rows = (r.json?.diagnostics ?? []).join("\n");
    for (const code of e.diagnostics) if (!rows.includes(code)) problems.push(`${code} was not reported`);
  }
  if (e.noDiagnostics) {
    const j = r.json;
    const total = j ? j.errors + j.warnings + j.hints + j.infos : null;
    if (total === null) problems.push("there is no report to read");
    else if (total) problems.push(`expected no diagnostics, got ${total}`);
  }
  for (const re of e.output ?? []) if (!re.test(r.output)) problems.push(`the output does not match /${re.source}/`);
  if (e.message && !e.message.test(r.message)) problems.push(`the message does not match /${e.message.source}/`);
  return problems;
}

// One reproducer: pack it, run what repro.json says, judge the result.
async function verifyOne(slug, repro, lane) {
  if (repro.mode === "manual") return { slug, status: "manual", detail: repro.steps ?? "(no steps recorded)" };
  const o = { ide: values.ide, port: lane, arch: repro.arch, timeout, show: values.show, hide: values.hide };
  try {
    pack(slug);
    let r;
    let table;
    if (repro.mode === "cli") r = runCli(slug, repro, o);
    else if (repro.mode === "run") {
      r = await runProbe(slug, { ...o, llvm: repro.llvm });
      table = TBRUN_EXIT;
    } else {
      r = await compileOrBuild(slug, { ...o, build: repro.mode === "build", llvm: repro.llvm });
      table = TBBUILD_EXIT;
    }
    const wanted = repro.expect.exit;
    if (r.timedOut) return { slug, status: "harness", detail: "the tool outlived its time limit and was ended" };
    // Exit 2 is the tool's own failure, and tbbuild's 3 a compile that never
    // settled: neither says anything about the bug unless the file expects it.
    const failed = table && (r.code === 2 || (table === TBBUILD_EXIT && r.code === 3)) && r.code !== wanted;
    if (failed || r.code === null) {
      const said = (r.message || r.stdout || "no output").trim().split("\n").slice(-3).join(" | ");
      return { slug, status: "harness", detail: `exit ${r.code}: ${said}` };
    }
    const problems = mismatches(repro, r);
    return problems.length
      ? { slug, status: "no-longer", detail: problems.join("; ") }
      : { slug, status: "reproduces", detail: `${repro.mode} exit ${r.code}` };
  } catch (e) {
    if (!(e instanceof Fail)) throw e;
    return { slug, status: "harness", detail: e.message.split("\n").join(" | ") };
  }
}

const LABEL = {
  reproduces: "reproduces",
  "no-longer": "NO LONGER REPRODUCES",
  manual: "manual",
  harness: "harness failed",
};

async function verify() {
  let all = slugs;
  if (!all.length) {
    all = existsSync(BUGS) ? readdirSyncDirs(BUGS).filter((s) => SLUG.test(s) && existsSync(where(s).repro)) : [];
  }
  if (!all.length) {
    console.log("no reproducers: nothing under bugs/ has a repro.json");
    return 0;
  }
  // Every file is read before anything starts: a fault in one is the person's to
  // fix, and not a reason to have run the others.
  const repros = new Map();
  for (const slug of all) {
    requireReproducer(slug);
    repros.set(slug, loadRepro(slug));
  }
  const automatic = all.filter((s) => ["compile", "build", "run"].includes(repros.get(s).mode));
  const lanes = Math.min(jobs, Math.max(all.length, 1));
  if (automatic.length || all.some((s) => repros.get(s).mode === "cli")) findTools(values.ide);
  if (automatic.length) {
    const ports = Array.from({ length: lanes }, (_, i) => port + i);
    tidy = startTidy({
      paths: automatic.map((s) => where(s).twinproj),
      prefixes: ports.flatMap((n) => [
        path.join(tmpdir(), "tbbuild", String(n)),
        path.join(tmpdir(), "tbrun", String(n)),
      ]),
    });
  }
  const results = [];
  const queue = [...all];
  const lane = async (index) => {
    while (queue.length) {
      const slug = queue.shift();
      const res = await verifyOne(slug, repros.get(slug), port + index);
      results.push(res);
      console.log(`${slug}: ${LABEL[res.status]}${res.detail ? ` -- ${res.detail}` : ""}`);
    }
  };
  try {
    await Promise.all(Array.from({ length: lanes }, (_, i) => lane(i)));
  } finally {
    finishTidy(tidy);
    tidy = null;
  }
  const count = (status) => results.filter((r) => r.status === status).length;
  console.log(
    `${count("reproduces")} reproduce, ${count("no-longer")} no longer reproduce, ` +
      `${count("manual")} manual, ${count("harness")} harness failed`,
  );
  return count("harness") ? 2 : count("no-longer") ? 1 : 0;
}

function readdirSyncDirs(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

// ----------------------------------------------------------------------- main

async function main() {
  const [slug] = slugs;
  const o = {
    ide: values.ide,
    port,
    arch,
    timeout,
    show: values.show,
    hide: values.hide,
    keep: values.keep,
    llvm: values.llvm,
    exe: values.exe,
  };
  switch (command) {
    case "new":
      newReproducer(slug, title);
      return 0;
    case "pack":
      requireReproducer(slug);
      console.log(pack(slug));
      return 0;
    case "compile":
    case "build": {
      requireReproducer(slug);
      findTools(o.ide);
      console.log(pack(slug));
      const r = await compileOrBuild(slug, { ...o, build: command === "build" });
      printBuild(r);
      if (r.timedOut) throw new Fail("tbbuild outlived its time limit and was ended");
      return mapped(TBBUILD_EXIT, r.code);
    }
    case "run": {
      requireReproducer(slug);
      findTools(o.ide);
      const r = await runProbe(slug, o);
      printRun(r);
      if (r.timedOut) throw new Fail("tbrun outlived its time limit and was ended");
      return mapped(TBRUN_EXIT, r.code);
    }
    default:
      return verify();
  }
}

try {
  process.exit(await main());
} catch (e) {
  if (!(e instanceof Fail)) throw e;
  finishTidy(tidy);
  die(e.code, e.message);
}
