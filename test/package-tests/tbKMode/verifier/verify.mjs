#!/usr/bin/env node
// The tbKMode verifier: checks the tbKMode package and drivers built with it against Windows itself.
// Needs Node.js and nothing else; see README.md beside this file.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildKernelDatabase } from "./lib/kernels.mjs";
import { checkDriver } from "./lib/imports.mjs";

const here = import.meta.dirname;

const USAGE = `usage: node verify.mjs <command> [options]

Commands:
  imports <driver.sys> ...  checks that every routine a built driver imports is exported by the
                            kernel of each Windows version in db/kernels.json, and that it imports
                            from no user-mode DLL
  kernels [--cache <dir>]   downloads Windows' kernel-mode files from the Microsoft symbol server
                            (config/kernels.json names them) and writes their exports to
                            db/kernels.json; the files are kept in <dir> (default: %TEMP%\\tbkmode-verifier\\symbols)

Options:
  -h, --help                print this text and exit

Exit codes:
  0  done; for imports, every driver passed
  1  imports: a driver imports what some Windows version does not export
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
    options: { cache: { type: "string" }, help: { type: "boolean", short: "h" } },
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

/** The kernel database as JSON with one export to a line, so that a new build reads as a short diff. */
function kernelDatabaseText(db) {
  const lines = ["{", `"format": ${db.format},`, `"comment": ${JSON.stringify(db.comment)},`, '"files": {'];
  const files = Object.entries(db.files);
  files.forEach(([file, f], i) => {
    lines.push(`${JSON.stringify(file)}: {`, `"arch": ${JSON.stringify(f.arch)},`, '"builds": [');
    lines.push(f.builds.map((b) => JSON.stringify(b)).join(",\n"));
    lines.push("],", `"absent": ${JSON.stringify(f.absent)},`, '"exports": {');
    lines.push(
      Object.entries(f.exports)
        .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(",\n"),
    );
    lines.push("}", i < files.length - 1 ? "}," : "}");
  });
  lines.push("}", "}", "");
  return lines.join("\n");
}

if (command === "kernels") {
  if (args.length) fail(`kernels takes no arguments\n${USAGE}`);
  const config = JSON.parse(readFileSync(path.join(here, "config", "kernels.json"), "utf8"));
  const cache = path.resolve(values.cache ?? path.join(tmpdir(), "tbkmode-verifier", "symbols"));
  const db = await buildKernelDatabase(config, { cache, log: (m) => console.log(m) });
  mkdirSync(path.dirname(KERNEL_DB), { recursive: true });
  writeFileSync(KERNEL_DB, kernelDatabaseText(db), "utf8");
  console.log(`wrote ${path.relative(process.cwd(), KERNEL_DB)}`);
} else if (command === "imports") {
  if (!args.length) fail(`imports needs a driver file\n${USAGE}`);
  if (values.cache) fail(`--cache is for kernels\n${USAGE}`);
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
