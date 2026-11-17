#!/usr/bin/env node
// The tbKMode verifier: checks the tbKMode package and drivers built with it against Windows itself.
// Needs Node.js and nothing else; see README.md beside this file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkDriver } from "./lib/imports.mjs";
import { kernelDatabaseText, updateKernelDatabase } from "./lib/kernels.mjs";

const here = import.meta.dirname;

const USAGE = `usage: node verify.mjs <command> [options]

Commands:
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
  -h, --help                print this text and exit

Exit codes:
  0  done; for imports, every driver passed
  1  imports: a driver imports what some build does not export, or from a user-mode DLL
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
