#!/usr/bin/env node
// Census every attribute used by the twinBASIC packages an IDE install ships.
//
//     node scripts/census_attributes.mjs [options]
//
// The options, and the exit codes (0 the report was produced, 2 the tool could
// not do its job or crashed), are in USAGE below, which --help prints.
//
// ---------------------------------------------------------------- why this
//
// `Reference/Attributes.md` states an `Applicable to:` line per attribute, and
// the only evidence for most of them is what the shipped packages do. That
// evidence was gathered by hand, one attribute at a time, with a grep whose
// blind spots were rediscovered on each pass. This is that sweep, done once,
// over every attribute at once.
//
// **A census is evidence, not applicability.** It says where an attribute IS
// used, never where it MAY be used -- `scripts/gen_attribute_probes.mjs` plus
// `scripts/tbbuild.mjs` answer that, by asking the compiler. The two are
// complementary and the distinction is not pedantic: `[Hidden]` is used on a
// whole CoClass and on Class and Interface members, and the compiler refuses
// it (TB5155) on the Interface lines inside a CoClass body -- a census alone
// would never have found the boundary. `gen_attribute_probes.mjs` records the
// converse trap under [RedirectToStaticImplementation]: a census grouped by
// declaration keyword said "on a Property Get, a Function and a Sub", the
// entry went out saying "procedure in a Class", and the probe returned TB5155
// because every one of those 82 uses is inside an Interface. So this groups by
// ENCLOSING CONSTRUCT as well as by keyword, and reports the pair.
//
// ------------------------------------------------- what the scanner must not do
//
// The scanner is scripts/lib/census-scan.mjs, which lists the seven ways a naive
// sweep of this corpus gets a wrong answer; scripts/check_twin_parsers.mjs runs
// its traps on fixed input.
//
// One result to read before calling a row impossible: **a twinBASIC `Type` can
// contain `DeclareWide` members.** `CustomControls.twin`'s `Type SerializeInfo`
// holds a dozen, so `Type / DeclareWide` is a real construct and not a stack
// fault.
//
// Only TYPE blocks are tracked for the enclosing construct, and anything the
// scanner cannot resolve goes to an `unresolved` bucket and is reported.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseAttributes } from "./lib/attributes-doc.mjs";
import { scanText } from "./lib/census-scan.mjs";
import { findIde } from "./lib/tb-install.mjs";
import { defaultCache, exportPackages, packageName } from "./lib/tb-packages.mjs";
import { die, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { DOCS_DIR } from "../lib/repo-paths.mjs";

exitOnCrash();

const ATTR_DOC = path.join(DOCS_DIR, "Reference", "Attributes.md");

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      ide: { type: "string" },
      exported: { type: "string" },
      cache: { type: "string" },
      attr: { type: "string" },
      out: { type: "string" },
      "dump-sites": { type: "string" },
      refresh: { type: "boolean", default: false },
      samples: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
const log = (...a) => {
  if (!values.quiet) console.error(...a);
};

const USAGE = `usage: node scripts/census_attributes.mjs [options]

Counts every attribute used by the twinBASIC packages an IDE install ships, by
declaration keyword and by enclosing construct.

  --ide <path>         twinBASIC install root (default: $TB_IDE, else the
                       newest %USERPROFILE%/Desktop/twinBASIC_IDE_BETA_*)
  --exported <dir>     census an already-exported tree and do not export
  --cache <dir>        where exports are kept (default: %TEMP%/tb-census/beta-<n>)
  --refresh            re-export even if the cache already has this build
  --samples            also census projects/ and addins/, not just packages/
  --attr <name>        restrict the report to one attribute
  --json               emit JSON instead of markdown
  --out <file>         write the report to a file instead of stdout
  --dump-sites <file>  write every raw site, or with --attr those of that
                       attribute, to a JSON file, to find the file behind a row
  --quiet              suppress progress on stderr
  -h, --help           print this text and exit

Exit codes:
  0  the report was produced
  2  a refused command line, no install, an install with no package project, or a
     crash (a package that fails to export is left out of the census)`;

if (values.help) printHelpAndExit(USAGE);

// ------------------------------------------------------------- the install
// Found as every harness tool finds it, by scripts/lib/tb-install.mjs's
// findIde, and then checked for the packages/ folder the census reads. An
// install path contains a username, so it is never hardcoded.
function findInstall() {
  const found = findIde(values.ide);
  if (!found) die(2, "no twinBASIC install found; pass --ide or set TB_IDE");
  // Accept either the install root or the IDE exe inside it.
  const root = /\.exe$/i.test(found) ? path.dirname(found) : found;
  if (existsSync(path.join(root, "packages"))) return root;
  if (existsSync(path.join(path.dirname(root), "packages"))) return path.dirname(root);
  die(2, `no packages/ under ${root} -- pass the install root with --ide`);
}

const buildNumberOf = (root) => /_BETA_(\d+)$/.exec(root)?.[1] ?? "unknown";

// ------------------------------------------------------------- the export
// scripts/lib/tb-packages.mjs, shared with scripts/build_package_api.mjs so the
// two read the same export from the same cache. A failed export leaves no
// folder behind, and is left out of the census rather than counted as empty.
function exportAll(root, cacheDir, includeSamples) {
  try {
    const { projects, failed } = exportPackages({
      root,
      cache: cacheDir,
      refresh: values.refresh,
      samples: includeSamples,
      log,
    });
    const lost = new Set(failed.map((f) => f.name));
    return projects.filter((p) => !lost.has(p.name));
  } catch (e) {
    die(2, e.message);
  }
}

// ------------------------------------------------------------- the scanner
// scripts/lib/census-scan.mjs, so that scripts/check_twin_parsers.mjs can run its
// traps on fixed input.
const scanFile = (file, pkg) => scanText(readFileSync(file, "utf8"), file, pkg);

// ------------------------------------------------------ documented attributes
function documentedAttributes() {
  if (!existsSync(ATTR_DOC)) return null;
  return new Map(parseAttributes(readFileSync(ATTR_DOC, "utf8")).map((e) => [e.name, e]));
}

// ------------------------------------------------------------------- report
function buildReport(sites, problems, files, projects, meta) {
  const byAttr = new Map();
  for (const s of sites) {
    if (!byAttr.has(s.attr)) byAttr.set(s.attr, []);
    byAttr.get(s.attr).push(s);
  }
  const doc = documentedAttributes();

  const rows = [...byAttr.entries()]
    .map(([attr, ss]) => {
      const targets = new Map();
      for (const s of ss) {
        const k = `${s.container} / ${s.kind}`;
        targets.set(k, (targets.get(k) ?? 0) + 1);
      }
      const pkgs = [...new Set(ss.map((s) => s.pkg))].sort();
      return {
        attr,
        uses: ss.length,
        packages: pkgs,
        withArgs: ss.filter((s) => s.hasArgs).length,
        targets: [...targets.entries()].sort((a, b) => b[1] - a[1]),
        documented: doc ? doc.has(attr) : null,
        applicableTo: doc?.get(attr)?.app ?? null,
        unresolved: ss.filter((s) => s.kind === "UNRESOLVED").length,
      };
    })
    .sort((a, b) => b.uses - a.uses || a.attr.localeCompare(b.attr));

  const usedNames = new Set(byAttr.keys());
  const undocumented = doc ? rows.filter((r) => !r.documented).map((r) => r.attr) : [];
  const unused = doc ? [...doc.keys()].filter((n) => !usedNames.has(n)).sort() : [];

  return { meta, rows, undocumented, unused, problems, files, projects, sites: sites.length };
}

function renderMarkdown(rep) {
  const L = [];
  L.push(`# twinBASIC attribute census`);
  L.push("");
  L.push(`Generated ${rep.meta.when} against **${rep.meta.install}** (BETA ${rep.meta.build}).`);
  L.push("");
  L.push(`| | |`);
  L.push(`|---|---|`);
  L.push(`| projects scanned | ${rep.projects} |`);
  L.push(`| \`.twin\` files | ${rep.files} |`);
  L.push(`| attribute sites | ${rep.sites} |`);
  L.push(`| distinct attributes | ${rep.rows.length} |`);
  if (rep.meta.documentedCount != null) {
    L.push(`| documented in \`Attributes.md\` | ${rep.meta.documentedCount} |`);
  }
  L.push(`| unresolved declarations | ${rep.problems.filter((p) => p.why === "declaration not classified").length} |`);
  L.push("");
  L.push(`> A census says where an attribute **is** used, never where it **may** be used.`);
  L.push(`> Use \`scripts/gen_attribute_probes.mjs\` with \`scripts/tbbuild.mjs\` for applicability.`);
  L.push("");

  L.push(`## Attributes by use`);
  L.push("");
  L.push(`| Attribute | Uses | Pkgs | Documented | Where it is used (enclosing construct / declaration) |`);
  L.push(`|---|---:|---:|:---:|---|`);
  for (const r of rep.rows) {
    const where = r.targets.map(([k, n]) => `${k} ×${n}`).join("<br>");
    const docMark = r.documented === null ? "--" : r.documented ? "yes" : "**no**";
    L.push(`| \`${r.attr}\` | ${r.uses} | ${r.packages.length} | ${docMark} | ${where} |`);
  }
  L.push("");

  if (rep.undocumented.length) {
    L.push(`## Used but not in \`Attributes.md\` (${rep.undocumented.length})`);
    L.push("");
    L.push(`Each is an attribute the shipped packages use and the reference does not mention.`);
    L.push("");
    for (const a of rep.undocumented) {
      const r = rep.rows.find((x) => x.attr === a);
      L.push(`- \`${a}\` --- ${r.uses} use(s) in ${r.packages.join(", ")}`);
    }
    L.push("");
  }

  if (rep.unused.length) {
    L.push(`## Documented but unused in the packages (${rep.unused.length})`);
    L.push("");
    L.push(`Not a defect: an attribute can be real, documented and simply not used by any`);
    L.push(`shipped package. It does mean the census offers no evidence for its \`Applicable to:\``);
    L.push(`line, so a probe is the only check available.`);
    L.push("");
    L.push(rep.unused.map((a) => `\`${a}\``).join(", "));
    L.push("");
  }

  const byWhy = new Map();
  for (const p of rep.problems) {
    if (!byWhy.has(p.why)) byWhy.set(p.why, []);
    byWhy.get(p.why).push(p);
  }
  L.push(`## What the scanner could not resolve (${rep.problems.length})`);
  L.push("");
  if (!rep.problems.length) {
    L.push(`Nothing. Every attribute site resolved to a declaration, and every type block closed.`);
  } else {
    L.push(`Reported rather than bucketed silently: a census that hides its own confusion`);
    L.push(`publishes a wrong number with no way to notice.`);
    L.push("");
    for (const [why, ps] of [...byWhy.entries()].sort((a, b) => b[1].length - a[1].length)) {
      L.push(`### ${why} (${ps.length})`);
      L.push("");
      for (const p of ps.slice(0, 25)) {
        L.push(
          `- \`${p.pkg}\` ${path.basename(p.file)}:${p.line}${p.text ? ` --- \`${p.text.replace(/`/g, "'")}\`` : ""}`,
        );
      }
      if (ps.length > 25) L.push(`- ... and ${ps.length - 25} more`);
      L.push("");
    }
  }
  return L.join("\n") + "\n";
}

function renderAttrDetail(rep, attr) {
  const r = rep.rows.find((x) => x.attr.toLowerCase() === attr.toLowerCase());
  if (!r) return `No use of \`${attr}\` in the scanned packages.\n`;
  const L = [];
  L.push(`# \`[${r.attr}]\` --- census`);
  L.push("");
  L.push(`${r.uses} use(s) across ${r.packages.length} package(s): ${r.packages.join(", ")}.`);
  if (r.applicableTo) L.push(`\n\`Attributes.md\` says: **Applicable to:** ${r.applicableTo}`);
  L.push("");
  L.push(`| Enclosing construct | Declaration it decorates | Uses |`);
  L.push(`|---|---|---:|`);
  for (const [k, n] of r.targets) {
    const [c, kind] = k.split(" / ");
    L.push(`| ${c} | ${kind} | ${n} |`);
  }
  L.push("");
  L.push(`> Evidence only. The compiler decides applicability -- see \`gen_attribute_probes.mjs\`.`);
  return L.join("\n") + "\n";
}

// --------------------------------------------------------------------- main
function collectTwinFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectTwinFiles(p, out);
    else if (e.name.toLowerCase().endsWith(".twin")) out.push(p);
  }
  return out;
}

function main() {
  let projects,
    install = null,
    build = "n/a";
  const exportedDir = values.exported;

  if (exportedDir) {
    if (!existsSync(exportedDir) || !statSync(exportedDir).isDirectory()) die(2, `not a directory: ${exportedDir}`);
    install = exportedDir;
    projects = readdirSync(exportedDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((e) => {
        const g = path.join(exportedDir, e.name);
        const inner = readdirSync(g, { withFileTypes: true }).filter((x) => x.isDirectory());
        return inner.length
          ? inner.map((x) => ({ name: x.name, dir: path.join(g, x.name) }))
          : [{ name: e.name, dir: g }];
      });
    if (!projects.length) projects = [{ name: path.basename(exportedDir), dir: exportedDir }];
  } else {
    install = findInstall();
    build = buildNumberOf(install);
    log(`install : ${install}`);
    const cache = values.cache ?? defaultCache(build);
    log(`cache   : ${cache}`);
    projects = exportAll(install, cache, values.samples);
  }

  const allSites = [],
    allProblems = [];
  let fileCount = 0;
  for (const p of projects) {
    const pkg = packageName(p.name);
    for (const f of collectTwinFiles(p.dir)) {
      fileCount++;
      try {
        const { sites, problems } = scanFile(f, pkg);
        allSites.push(...sites);
        allProblems.push(...problems);
      } catch (e) {
        allProblems.push({ file: f, pkg, line: 0, why: "scanner threw", text: String(e.message) });
      }
    }
  }
  log(`scanned : ${fileCount} .twin files, ${allSites.length} attribute sites`);

  const doc = documentedAttributes();
  const rep = buildReport(allSites, allProblems, fileCount, projects.length, {
    when: new Date().toISOString().slice(0, 10),
    install,
    build,
    documentedCount: doc ? doc.size : null,
  });

  const attr = values.attr;
  const text = values.json
    ? JSON.stringify(
        attr ? (rep.rows.find((r) => r.attr.toLowerCase() === attr.toLowerCase()) ?? null) : rep,
        null,
        2,
      ) + "\n"
    : attr
      ? renderAttrDetail(rep, attr)
      : renderMarkdown(rep);

  // Every raw site, for answering "which file produced this row?" -- the
  // question every surprising number in the report turns into.
  const dump = values.dumpSites;
  if (dump) {
    writeFileSync(
      dump,
      JSON.stringify(attr ? allSites.filter((s) => s.attr.toLowerCase() === attr.toLowerCase()) : allSites, null, 1),
      "utf8",
    );
    log(`sites   : ${dump}`);
  }

  const out = values.out;
  if (out) {
    writeFileSync(out, text, "utf8");
    log(`report  : ${out}`);
  } else process.stdout.write(text);
}

main();
