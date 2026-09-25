#!/usr/bin/env node
// Record the public API of the packages a twinBASIC install ships, as the
// package half of the documentation's symbol index.
//
//     node scripts/build_package_api.mjs            # regenerate builder/package-api.json
//     node scripts/build_package_api.mjs --check    # fail if it is stale
//
//       --ide <path>    the install root, or its twinBASIC.exe (default: $TB_IDE,
//                       else the newest Desktop\twinBASIC_IDE_BETA_<n>)
//       --src <dir>     read an existing export of the packages instead
//       --cache <dir>   where exports are kept (default %TEMP%\tb-census\beta-<n>,
//                       shared with builder/census_attributes.mjs)
//       --refresh       export again even if the cache has this build
//       --out <file>    write somewhere other than builder/package-api.json
//
// Exit codes: 0 written (or up to date, with --check), 1 stale (--check), 2 the
// tool failed.
//
// Dev tooling, not part of the render pipeline, in the same way as
// scripts/build_dot_metrics.mjs: tbdocs reads builder/package-api.json and never
// runs this, because running it needs a twinBASIC install and CI has none.
// Regenerate it when the documentation is re-indexed against a newer build, and
// commit it with the pages that change.
//
// WHAT THE BUILD TAKES FROM IT. The symbol index (builder/symbols.mjs) takes its
// entries and their URLs from the pages. Four things only the packages know:
//
//   - the kind of a member documented on a page of its own -- `Collection.Add`
//     is a method and `_App.Path` a property, and nothing on either page says so
//     in a form a build can read;
//   - the values of an enumeration, which pages list in tables, not headings;
//   - the interface a CoClass's members are declared on, since that is what the
//     compiler names a member by: hover says `in VBA._Collection` for
//     `Collection.Add` and `in tbIDE.IToolWindowsV1` for `ToolWindows.Add`;
//   - which public symbols have no page, which the build reports.
//
// So the file holds every type each package declares, marked when it is not
// public, with the public members of each that code can reach: a public
// type's, and those of a non-public type a public one exposes -- `CheckBox`
// declares almost nothing itself and gets its members from `CheckBoxBaseCtl`,
// `ButtonBase` and three levels more, and `Clipboard`'s are on a Private
// Interface. apiSnapshot in scripts/lib/twin-api.mjs says which is which.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildNumber, findIde } from "./lib/tb-install.mjs";
import { defaultCache, exportPackages, packageName } from "./lib/tb-packages.mjs";
import { apiSnapshot, parsePackage } from "./lib/twin-api.mjs";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(REPO, "builder", "package-api.json");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? undefined : argv[i + 1]; };
const die = (code, msg) => { console.error(msg); process.exit(code); };

function sources() {
  // --src takes a folder of exports, or a cache holding `packages\` and more:
  // a folder with a Settings file is an export, and one without is looked into.
  const src = opt("src");
  if (src) {
    if (!existsSync(src) || !statSync(src).isDirectory()) die(2, `not a directory: ${src}`);
    const packages = [];
    const look = (dir, depth) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const d = path.join(dir, e.name);
        if (existsSync(path.join(d, "Settings"))) packages.push({ name: packageName(e.name), dir: d });
        else if (depth > 0) look(d, depth - 1);
      }
    };
    look(src, 1);
    if (!packages.length) die(2, `no exported package under ${src}`);
    return { build: null, packages };
  }
  // --ide and TB_IDE may name the install root or the executable in it.
  let ide = findIde(opt("ide"));
  if (ide && !/\.exe$/i.test(ide)) ide = path.join(ide, "twinBASIC.exe");
  if (!ide || !existsSync(ide)) die(2, "no twinBASIC install found; pass --ide or set TB_IDE");
  const root = path.dirname(ide);
  const build = buildNumber(ide);
  const cache = opt("cache") ?? defaultCache(build);
  console.error(`install : ${root}`);
  console.error(`cache   : ${cache}`);
  let r;
  try {
    r = exportPackages({ root, cache, refresh: flag("refresh"), log: (l) => console.error(l) });
  } catch (e) {
    die(2, e.message);
  }
  if (r.failed.length) die(2, `${r.failed.length} package(s) did not export; the API would be incomplete`);
  return { build, packages: r.projects.map((p) => ({ name: p.name, dir: p.dir })) };
}

// ------------------------------------------------------------------ the model

// A package is known to code, and to the compiler, by its project name, which
// is not always its folder's: TwinBasicAssertions is `Assert`, all three CEF
// builds are `cefPackage`, and AppGlobalClassObject is `AppGlobalClassProject`.
// Hover says `in Assert.Exact`, so the snapshot is keyed by the project name,
// and the exports each name covers are listed under it.
function projectName(dir, fallback) {
  try {
    const m = /"project\.name"\s*:\s*"([^"]+)"/.exec(readFileSync(path.join(dir, "Settings"), "utf8"));
    if (m) return m[1];
  } catch { /* no Settings: an export that is not a project */ }
  return fallback;
}

function readAll(packages) {
  const parsed = new Map();                      // project name -> types
  const exportsOf = new Map();                   // project name -> export names
  const problems = [];
  // By code unit, not localeCompare: the file is committed, and a regeneration
  // on a machine with another locale must not reorder it.
  for (const p of [...packages].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const project = projectName(p.dir, p.name);
    const r = parsePackage(p.dir);
    if (parsed.has(project)) {
      // Several exports under one name must declare one API, or the name
      // would stand for two things.
      const same = JSON.stringify(strip(parsed.get(project))) === JSON.stringify(strip(r.types));
      if (!same) die(2, `${p.name} and ${exportsOf.get(project).join(", ")} are all '${project}' but declare different APIs`);
    } else {
      parsed.set(project, r.types);
      for (const x of r.problems) problems.push({ pkg: project, ...x });
    }
    exportsOf.set(project, [...(exportsOf.get(project) ?? []), p.name]);
  }
  return { parsed, exportsOf, problems };
}

// A type as declared, without where: two builds of one package differ in
// their line numbers.
const strip = (types) => types.map(({ line, members, ...t }) => ({ ...t, members: members.map(({ line: _, ...m }) => m) }));

// One type to a line, so that a regeneration against a newer build diffs as the
// types that changed rather than as a rewritten file.
function serialize({ build, packages, exportsOf }) {
  const lines = ["{", `  "build": ${JSON.stringify(build)},`, `  "packages": {`];
  const names = Object.keys(packages);
  names.forEach((pkg, i) => {
    lines.push(`    ${JSON.stringify(pkg)}: {`);
    lines.push(`      "exports": ${JSON.stringify(exportsOf.get(pkg))},`);
    lines.push(`      "types": [`);
    const types = packages[pkg];
    types.forEach((t, j) => { lines.push(`        ${JSON.stringify(t)}${j < types.length - 1 ? "," : ""}`); });
    lines.push("      ]", `    }${i < names.length - 1 ? "," : ""}`);
  });
  lines.push("  }", "}");
  return lines.join("\n") + "\n";
}

// --------------------------------------------------------------------- main

const { build, packages } = sources();
const { parsed, exportsOf, problems } = readAll(packages);
const { packages: model, unresolved } = apiSnapshot(parsed);
const text = serialize({ build, packages: model, exportsOf });

let types = 0;
let members = 0;
for (const list of Object.values(model)) {
  types += list.length;
  for (const t of list) members += Object.keys(t.members ?? {}).length + (t.values?.length ?? 0) + (t.fields?.length ?? 0);
}
console.error(`read    : ${packages.length} package(s), ${types} type(s), ${members} member(s)`);
for (const p of problems.slice(0, 20)) console.error(`  ? ${p.pkg} ${p.file}:${p.line} ${p.why}`);
if (problems.length > 20) console.error(`  ? ... and ${problems.length - 20} more`);
for (const u of [...new Set(unresolved)].slice(0, 20)) console.error(`  ? not found: ${u}`);

const out = opt("out") ?? OUT;
if (flag("check")) {
  const committed = existsSync(out) ? readFileSync(out, "utf8").replace(/\r\n/g, "\n") : null;
  if (committed === text) { console.error(`up to date: ${path.relative(REPO, out)}`); process.exit(0); }
  console.error(`STALE: ${path.relative(REPO, out)} differs from what BETA ${build ?? "?"} gives; ` +
    `run node scripts/build_package_api.mjs and commit the result`);
  process.exit(1);
}
writeFileSync(out, text, "utf8");
console.error(`wrote   : ${path.relative(REPO, out)} (${(text.length / 1024).toFixed(0)} KB)`);
