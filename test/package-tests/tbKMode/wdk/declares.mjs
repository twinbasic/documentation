// node test/package-tests/tbKMode/wdk/declares.mjs <Module>
//
// Checks every Declare of one tbKMode module two ways, and prints each one that fails:
//   * its name (or Alias) against the exports of the system file its Lib names
//     (%SystemRoot%\System32 or System32\drivers), read with dumpbin /exports;
//   * its number of parameters against the C prototype on its Microsoft Learn page, which
//     learn.mjs <Module> has recorded in learn/<Module>.json.
// The Declares come from the indexer's snapshot (api.mjs). A Declare under #If is checked branch by
// branch; System32 holds this machine's kernel, the x64 one, so a branch for x86 alone has its
// parameters compared and its export not.
// It reads files and starts nothing but dumpbin.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { declaresOf, x86Only } from "./api.mjs";
import { inMsvc, workDir } from "./msvc.mjs";

const [mod] = process.argv.slice(2);
if (!mod) {
  console.error("usage: node test/package-tests/tbKMode/wdk/declares.mjs <Module>");
  process.exit(2);
}
const dir = workDir(mod);

function splitTop(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
const declares = declaresOf(mod).map((d) => ({ ...d, params: d.params.length }));

let problems = 0;
const exportsOf = new Map();
for (const lib of new Set(declares.map((d) => d.lib.toLowerCase()))) {
  const sys = process.env.SystemRoot ?? "C:\\Windows";
  const file = [path.join(sys, "System32", lib), path.join(sys, "System32", "drivers", lib)].find((f) => existsSync(f));
  if (!file) {
    console.log(`no ${lib} in System32 or System32\\drivers`);
    problems++;
    continue;
  }
  const out = inMsvc("x64", dir, `dumpbin /exports "${file}"`);
  exportsOf.set(lib, new Set([...out.matchAll(/^\s+\d+\s+[0-9A-F]+\s+(?:[0-9A-F]{8}\s+)?(\w+)/gm)].map((x) => x[1])));
}
const branch = (d) => (d.cond ? ` (#If ${d.cond})` : "");
let x86Branches = 0;
for (const d of declares) {
  if (x86Only(d.cond)) {
    x86Branches++;
    continue;
  }
  const ex = exportsOf.get(d.lib.toLowerCase());
  if (ex && !ex.has(d.entry)) {
    console.log(`not exported by ${d.lib}: ${d.entry}${branch(d)}`);
    problems++;
  }
}
const learnFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "learn", `${mod}.json`);
if (existsSync(learnFile)) {
  const pages = new Map(
    JSON.parse(readFileSync(learnFile, "utf8"))
      .filter((p) => p.kind === "Declare" && p.syntax)
      .map((p) => [p.name, p.syntax]),
  );
  let compared = 0;
  for (const d of declares) {
    const syntax = pages.get(d.name);
    if (!syntax) continue;
    compared++;
    const body = syntax.slice(syntax.indexOf("(") + 1, syntax.lastIndexOf(")")).replace(/\[[^\]]*\]/g, "");
    const pieces = !body.trim() || /^\s*void\s*$/i.test(body) ? [] : splitTop(body);
    // A variadic routine (DbgPrint's `...`) takes its fixed parameters and any number after them:
    // a Declare for it may name more, never fewer.
    const variadic = pieces.length > 0 && pieces.at(-1).trim() === "...";
    const c = pieces.length - (variadic ? 1 : 0);
    if (variadic ? d.params < c : c !== d.params) {
      console.log(`${d.name}${branch(d)}: C has ${c} parameters${variadic ? " and ..." : ""}, the Declare ${d.params}`);
      problems++;
    }
  }
  console.log(
    `${declares.length} Declares; ${compared} compared with their Microsoft Learn prototype; ${x86Branches} for x86 alone, whose export this x64 machine cannot check`,
  );
} else console.log(`${declares.length} Declares; no ${learnFile}: run learn.mjs ${mod} to compare parameters`);
process.exit(problems ? 1 : 0);
