#!/usr/bin/env node
// The tbKMode verifier: checks the tbKMode package and drivers built with it against Windows itself.
// Needs Node.js and nothing else; see README.md beside this file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkDeclares } from "./lib/declares.mjs";
import { checkDriver } from "./lib/imports.mjs";
import { readPackage } from "./lib/package.mjs";
import { kernelDatabaseText, updateKernelDatabase } from "./lib/kernels.mjs";

const here = import.meta.dirname;

const USAGE = `usage: node verify.mjs <command> [options]

Commands:
  check <package folder>    checks every Declare of the package's .twin files, for x86 and x64 as
                            its #If says: that its file exports its entry point in every build of
                            db/kernels.json, and on x86 that its calling convention and the bytes
                            of its parameters are the routine's
  imports <driver.sys> ...  checks that every routine a built driver imports is exported by each
                            build of its kernel-mode file that db/kernels.json records for the
                            driver's arch, and that it imports from no user-mode DLL
  kernels                   updates db/kernels.json to what config/kernels.json names: fetches
                            only what the database lacks (x64 files from the Microsoft symbol
                            server, x86 exports from a WDK's import libraries)

Options:
  --cache <dir>             kernels: where downloads are kept (default: %TEMP%\\tbkmode-verifier)
  --refresh                 kernels: move each Windows version to its newest build
  --rebuild                 kernels: start from an empty database
  --all                     check: list what could not be checked as well
  --json                    check: print the findings as JSON
  -h, --help                print this text and exit

Exit codes:
  0  done; for check, no error; for imports, every driver passed
  1  check: a Declare has an error; imports: a driver imports what some build does not export,
     or from a user-mode DLL
  2  the command line was refused, or the command could not run`;

function fail(message) {
  console.error(`verify: ${message}`);
  process.exit(2);
}

let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      cache: { type: "string" },
      refresh: { type: "boolean" },
      rebuild: { type: "boolean" },
      json: { type: "boolean" },
      all: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
} catch (e) {
  fail(`${e.message}\n${USAGE}`);
}
const { values, positionals } = parsed;
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const [command, ...args] = positionals;
const KERNEL_DB = path.join(here, "db", "kernels.json");

/**
 * Prints findings by module and Declare: each Declare once, with its findings for each arch; a
 * finding that holds for both arches is printed once. "unchecked" ones only with --all.
 */
function printFindings(findings, all) {
  const shown = findings.filter((f) => all || f.severity !== "unchecked");
  const byDeclare = new Map();
  for (const f of shown) {
    const key = `${f.module}\0${f.name}\0${f.line}`;
    if (!byDeclare.has(key)) byDeclare.set(key, []);
    byDeclare.get(key).push(f);
  }
  let module = null;
  for (const list of byDeclare.values()) {
    if (list[0].module !== module) {
      module = list[0].module;
      console.log(`\n${module}`);
    }
    console.log(`  ${list[0].name} (line ${list[0].line})`);
    const seen = new Map();
    for (const f of list) {
      const k = `${f.severity}\0${f.message}`;
      seen.set(k, [...(seen.get(k) ?? []), f.arch]);
    }
    for (const [k, arches] of seen) {
      const [severity, message] = k.split("\0");
      console.log(`    ${severity} ${arches.join("+")}: ${message}`);
    }
  }
  const count = (s) => findings.filter((f) => f.severity === s).length;
  console.log(
    `\n${count("error")} errors, ${count("warning")} warnings, ${count("unchecked")} not checked${all ? "" : " (--all lists them)"}`,
  );
}

if (command === "kernels") {
  if (args.length) fail(`kernels takes no arguments\n${USAGE}`);
  if (values.refresh && values.rebuild) fail(`--refresh and --rebuild exclude each other\n${USAGE}`);
  const config = JSON.parse(readFileSync(path.join(here, "config", "kernels.json"), "utf8"));
  const cache = path.resolve(values.cache ?? path.join(tmpdir(), "tbkmode-verifier"));
  const old = !values.rebuild && existsSync(KERNEL_DB) ? JSON.parse(readFileSync(KERNEL_DB, "utf8")) : null;
  const db = await updateKernelDatabase(config, old, {
    cache,
    refresh: values.refresh,
    log: (m) => console.log(m),
  });
  const text = kernelDatabaseText(db);
  if (existsSync(KERNEL_DB) && readFileSync(KERNEL_DB, "utf8") === text) console.log("db/kernels.json is up to date");
  else {
    mkdirSync(path.dirname(KERNEL_DB), { recursive: true });
    writeFileSync(KERNEL_DB, text, "utf8");
    console.log(`wrote ${path.relative(process.cwd(), KERNEL_DB)}`);
  }
} else if (command === "check") {
  if (args.length !== 1) fail(`check needs the package's folder\n${USAGE}`);
  for (const o of ["cache", "refresh", "rebuild"]) if (values[o]) fail(`--${o} is for kernels\n${USAGE}`);
  const db = JSON.parse(readFileSync(KERNEL_DB, "utf8"));
  let parsed;
  try {
    parsed = readPackage(path.resolve(args[0]));
  } catch (e) {
    fail(e.message);
  }
  const findings = checkDeclares(parsed, db);
  if (values.json) console.log(JSON.stringify({ files: parsed.files.length, findings }, null, 1));
  else printFindings(findings, values.all);
  process.exitCode = findings.some((f) => f.severity === "error") ? 1 : 0;
} else if (command === "imports") {
  if (!args.length) fail(`imports needs a driver file\n${USAGE}`);
  for (const o of ["cache", "refresh", "rebuild"]) if (values[o]) fail(`--${o} is for kernels\n${USAGE}`);
  const db = JSON.parse(readFileSync(KERNEL_DB, "utf8"));
  let bad = false;
  for (const file of args) {
    const r = checkDriver(readFileSync(file), db);
    if (!r.pass) bad = true;
    console.log(`${r.pass ? "PASS" : "FAIL"} ${file} (${r.machine})`);
    for (const p of r.problems) console.log(`  ${p}`);
    for (const u of r.unchecked) console.log(`  not checked: ${u}`);
  }
  process.exitCode = bad ? 1 : 0;
} else {
  fail(`${command ? `unknown command ${command}` : "no command"}\n${USAGE}`);
}
