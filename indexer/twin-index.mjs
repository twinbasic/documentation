import { existsSync, readFileSync, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CliError, die, exitOnCrash, parseCli, printHelpAndExit, refuseTogether, withUsageError } from "../lib/cli.mjs";
import { DOCS_DIR, REPO_ROOT } from "../lib/repo-paths.mjs";
import { calloutLabelsOf } from "../lib/callout-labels.mjs";
import { markdownFiles } from "../lib/markdown-files.mjs";
import { findIde, listIdes } from "../scripts/lib/tb-install.mjs";
import { downloadTwinpack, latestVersion, twinpackFiles, twinservListing } from "./lib/sync.mjs";
import {
  betaForTag,
  compareBuiltinManifest,
  compareInstallManifest,
  extractBuiltinPackages,
  installBeta,
  installOfBeta,
  listInstalledPackages,
  readInstalledPackages,
} from "./lib/builtin-sync.mjs";
import { downloadRelease, getLatestRelease, getReleaseByTag } from "./lib/github-release.mjs";
import { API_FORMAT, buildApi } from "./lib/api-model.mjs";
import {
  STORE_PROBLEMS,
  cacheDownload,
  cachedDownload,
  commitStore,
  ensureStore,
  manifestPath,
  recordedFingerprint,
  reindexStored,
  storedPackages,
  storedVersion,
  storeStatus,
  syncSnapshots,
  writeToStore,
} from "./lib/store.mjs";
import { heldBack, pinnedBuild, pinsOf, planBuiltin, planContributed } from "./lib/pins.mjs";
import { indexerFingerprint } from "./lib/fingerprint.mjs";
import { diffApi, auditCoverage } from "./lib/differ.mjs";
import { documentedPackages, groupFolder, sectionPages } from "./lib/doc-pages.mjs";
import { derivePackageApi } from "./lib/package-api.mjs";
import { batchTasks, newLandingFor, planPackage, sectionModels } from "./lib/draft-plan.mjs";

exitOnCrash();

const execFileP = promisify(execFile);

const INDEXER_DIR = path.join(REPO_ROOT, "indexer");
const STORE_PATH = path.join(INDEXER_DIR, ".packages");
const SNAPSHOTS_PATH = path.join(INDEXER_DIR, "snapshots");
const PACKAGE_API_PATH = path.join(REPO_ROOT, "builder", "package-api.json");
const DOCS_REF_DIR = path.join(DOCS_DIR, "Reference");

const DEFAULT_PACKAGES = ["VBA", "VBRUN", "VB"];
const GIT_SHOW_MAX_BYTES = 1 << 30;

// --- Helpers ---

function packageGroup(symbol, source) {
  if (source === "contributed") return "contributed";
  return DEFAULT_PACKAGES.includes(symbol) ? "default" : "built-in";
}

// What `sync` prints for a package it reads: from the version the store held,
// `from` (null for none), to `item.want`, and how that stands to its pin.
function describeMove(from, { want, pin }) {
  const move = from === null ? `${want}, new` : from === want ? want : `${from} → ${want}`;
  if (!pin) return move;
  return want === pin ? `${move} (its pin)` : `${move} (past its pin, ${pin})`;
}

// What `sync` prints for a package it indexed.
function describeIndex({ files, types, members, problems }) {
  const text = `${files} files, ${types} types, ${members} members, values and fields`;
  return problems ? `${text}; ${problems} declarations the scanner could not place (see "problems" in api.json)` : text;
}

// A sync-state file of the store, or the stub of one never written. The state
// lives in the store, so a fresh clone has none and reads every package.
async function readManifest(name) {
  try {
    return JSON.parse(await fs.readFile(manifestPath(STORE_PATH, name), "utf-8"));
  } catch {
    return null;
  }
}

async function writeManifest(name, manifest) {
  const file = manifestPath(STORE_PATH, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
}

// What `sync` prints for packages the store holds incompletely or from another
// build: `problems` is a list of `{ symbol, why }`, one line for each reason.
function printStoreProblems(problems) {
  for (const why of Object.keys(STORE_PROBLEMS)) {
    const symbols = problems.filter((p) => p.why === why).map((p) => p.symbol);
    if (symbols.length) console.log(`  ${STORE_PROBLEMS[why]}: ${symbols.join(", ")}`);
  }
}

// Indexes again, from the sources the store already holds, the packages whose
// api.json was written by another version of the scanner or the model than this
// checkout's. No download, and no change to what the packages are of: their
// version stays. `items` are `{ symbol, version }`; each lands in `synced`.
async function reindexFromStore(group, items, synced) {
  for (const { symbol, version } of items) {
    const stats = await reindexStored(STORE_PATH, group, symbol);
    synced.push({ group, package: symbol, from: version, to: version });
    console.log(`    ${symbol}: indexed again from the stored sources; ${describeIndex(stats)}`);
  }
}

function isExcluded(sym, exclusions) {
  if (!exclusions) return false;
  // Exclude if the symbol's kind matches
  if (exclusions.kinds.has(sym.kind)) return true;
  // Exclude if the symbol IS an excluded type
  if (sym.isType && exclusions.containers.has(sym.name)) return true;
  // Exclude if the symbol is declared in an excluded type, or in a type inside one
  if (sym.container && sym.container.split(".").some((name) => exclusions.containers.has(name))) return true;
  return false;
}

async function scanDocPages(docsDir) {
  const pages = new Map();
  if (!docsDir) return pages;
  try {
    const files = await walkDir(docsDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await fs.readFile(file, "utf-8");
      const m = content.match(/^title:\s*(.+)$/m);
      if (m) pages.set(m[1].trim(), file);
    }
  } catch {
    /* directory doesn't exist */
  }
  return pages;
}

async function walkDir(dir) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(full)));
    } else {
      results.push(full);
    }
  }
  return results;
}

// The labelled callouts of the markdown under `dir` (lib/callout-labels.mjs), each
// `{ file, line, label, items }`, `file` relative to the repository with `/`.
async function labelledCallouts(dir) {
  const found = [];
  let rels;
  try {
    rels = await markdownFiles(dir);
  } catch {
    return found; /* no such folder */
  }
  for (const rel of rels) {
    const file = path.join(dir, rel);
    const repoRel = path.relative(REPO_ROOT, file).replaceAll("\\", "/");
    for (const c of calloutLabelsOf(await fs.readFile(file, "utf-8"))) {
      found.push({ file: repoRel, line: c.line, label: c.label, items: c.items });
    }
  }
  return found;
}

// A package section's callouts labelled with a version other than `version`, the one the
// store now holds: each is checked against it, and its label moved, before the section's
// indexed_from is, or the build refuses the section.
async function versionCalloutTasks(docsDir, version) {
  const tasks = [];
  for (const c of await labelledCallouts(docsDir)) {
    const v = c.items.find((i) => i.kind === "version")?.value;
    if (!v || v === version) continue;
    tasks.push({ action: "recheck_callout", file: c.file, line: c.line, label: c.label, from: v, to: version });
  }
  return tasks;
}

// The documentation's callouts labelled `BETA <n>` with n below `beta`, the build the store
// holds the built-in packages of. A `since BETA <n>` label is left out: it stays true.
async function staleBetaCallouts(beta) {
  return (await labelledCallouts(DOCS_DIR)).filter((c) =>
    c.items.some((i) => i.kind === "beta" && Number(i.value) < Number(beta)),
  );
}

// --- CLI ---

const COMMANDS = ["sync", "analyze", "draft", "derive"];

const USAGE = `Usage: node indexer/twin-index.mjs <command> [options]

Indexes the twinBASIC packages into API snapshots, and lists what the
documentation still has to say about them.

Commands:
  sync      Read packages, extract sources, generate api.json snapshots
  analyze   Diff API snapshots against documented baseline
  draft     Place the pages analyze's report asks for: the file of each, its
            parent and its permalink, in indexer/.packages/draft/
  derive    Write builder/package-api.json, the package half of the symbol
            index, from the built-in and default packages

sync reads the built-in and default packages from the local twinBASIC install,
and the contributed packages from TWINSERV. A package the reference documents
is pinned at the version its section's indexed_from names: sync reads it at
that version, from the install of that build or that version on TWINSERV, and
lists the newer ones; --upgrade moves it to the newest. A snapshot is written
only of the pinned version. derive reads the install of the pinned build, and
needs no sync first.

analyze covers the packages the reference documents, those with a section in
docs/Reference (a landing page, index.md), and no others: --package or
--packages names the ones to analyze, documented or not, and --all takes every
package in the store. draft reads the report analyze wrote last, and places
the pages of its packages, or of those --package or --packages names.

Options:
  --package <name>       Process only the specified package
  --packages <a>,<b>     Process only the specified packages
  --all                  analyze: every package in the store, not only the
                         documented ones (not with --package or --packages)
  --upgrade              sync: move the packages named, or every one, to the
                         newest version instead of keeping them at their pins
  --ide <path>           sync: the install of the newest build, its folder or
                         its twinBASIC.exe (default: $TB_IDE, else the newest
                         Desktop\\twinBASIC_IDE_BETA_<n>); derive: the install
                         to read (default: that of the pinned build)
  --release              sync, derive: download the built-in and default
                         packages from GitHub releases instead of reading an
                         install
  --check                derive: fail if the file is stale, instead of
                         writing it
  --out <file>           derive: write somewhere other than
                         builder/package-api.json
  -h, --help             Print this text and exit

Exit codes:
  0  the command finished: sync wrote every package it was asked for, or found
     it up to date; analyze wrote its report; draft placed its pages; derive
     wrote the file, or with --check found it up to date
  1  a package failed to sync (its pinned version is nowhere to be had
     included), or one named by --package or --packages does not exist, or is
     not in the report (draft); the others were done; with derive --check, the
     file is stale
  2  a refused command line, no twinBASIC install found, no snapshots to
     analyze (run sync first), no report to draft from (run analyze first),
     packages that declare different APIs under one project name (derive),
     sections pinned at more than one build (derive without --ide), or a crash
`;

// The twinBASIC install the built-in and default packages are read from, as
// the compiler harness finds it: the one --ide names, as its folder or its
// twinBASIC.exe, else $TB_IDE, else the newest twinBASIC_IDE_BETA_<n> on the
// Desktop. Returns its folder and its BETA number.
function resolveInstall(explicit) {
  const remedy = "pass --ide or set TB_IDE, or use --release";
  let ide = findIde(explicit);
  if (ide && !/\.exe$/i.test(ide)) ide = path.join(ide, "twinBASIC.exe");
  if (!ide) throw new CliError("no-install", `no twinBASIC install found: ${remedy}`);
  if (!existsSync(ide)) throw new CliError("no-install", `no twinBASIC.exe at ${ide}: ${remedy}`);
  const root = path.dirname(ide);
  if (!existsSync(path.join(root, "packages"))) {
    throw new CliError("no-install", `no packages folder in ${root}: ${remedy}`);
  }
  const beta = installBeta(root);
  if (!beta) {
    throw new CliError(
      "no-install",
      `cannot tell which BETA ${root} is: ide/build.js is missing, and the folder is not named twinBASIC_IDE_BETA_<n>`,
    );
  }
  return { root, beta };
}

// --package is one name, --packages a comma-separated list; either gives the
// names a command is limited to, or null for every package.
function packageFilter({ package: one, packages }) {
  if (one !== undefined) {
    if (one.includes(",")) {
      throw new CliError("bad-list", `--package expects one package name, got: ${one} (--packages takes a list)`, {
        option: "--package",
        value: one,
      });
    }
    return [one];
  }
  if (packages === undefined) return null;
  const names = packages.split(",").map((s) => s.trim());
  if (names.some((n) => n === "")) {
    throw new CliError("bad-list", `--packages expects package names separated by commas, got: ${packages}`, {
      option: "--packages",
      value: packages,
    });
  }
  return [...new Set(names)];
}

const cli = withUsageError(() => {
  const read = parseCli(process.argv.slice(2), {
    options: {
      help: { type: "boolean", short: "h" },
      package: { type: "string" },
      packages: { type: "string" },
      ide: { type: "string" },
      release: { type: "boolean" },
      upgrade: { type: "boolean" },
      all: { type: "boolean" },
      check: { type: "boolean" },
      out: { type: "string" },
    },
    positionals: { max: 1 },
    stopAt: ["help"],
  });
  if (read.stopped === "help") return read;
  refuseTogether(read.values, ["all", "package", "packages"]);
  refuseTogether(read.values, ["ide", "release"]);
  // Which packages analyze covers is its own matter, and sync reads the lot.
  const named = read.positionals[0];
  if (read.values.all && named !== undefined && named !== "analyze") {
    throw new CliError("not-applicable", `--all does not apply to ${named}`);
  }
  const filter = packageFilter(read.values);
  // An install that is not there is refused with the command line, whatever the command.
  const install = read.values.ide === undefined ? null : resolveInstall(read.values.ide);
  return { ...read, filter, install };
});
if (cli.values.help) printHelpAndExit(USAGE);

const command = cli.positionals[0];
if (!COMMANDS.includes(command)) {
  if (command) console.error(`unknown command: ${command}`);
  printHelpAndExit(USAGE, { stream: "stderr", exitCode: 2 });
}

// Where the built-in and default packages come from is a matter for the commands
// that read them; derive reads every one, because the file covers them all, and
// its own options are its alone.
withUsageError(() => {
  const applies = {
    ide: ["sync", "derive"],
    release: ["sync", "derive"],
    package: ["sync", "analyze", "draft"],
    packages: ["sync", "analyze", "draft"],
    upgrade: ["sync"],
    check: ["derive"],
    out: ["derive"],
  };
  for (const [option, commands] of Object.entries(applies)) {
    if (cli.values[option] !== undefined && !commands.includes(command))
      throw new CliError("not-applicable", `--${option} does not apply to ${command}`);
  }
});

switch (command) {
  case "sync": {
    // The install is looked for before anything is fetched.
    const install = cli.values.release ? null : (cli.install ?? withUsageError(() => resolveInstall()));
    process.exitCode = await runSync(cli.filter, install, { upgrade: cli.values.upgrade === true });
    break;
  }
  case "analyze":
    process.exitCode = await runAnalyze(cli.filter, cli.values.all);
    break;
  case "draft":
    process.exitCode = await runDraft(cli.filter);
    break;
  case "derive": {
    const source = await deriveSource(cli.install, cli.values.release === true);
    process.exitCode = await runDerive(source, { check: cli.values.check, out: cli.values.out });
    break;
  }
}

// An install of one BETA, `{ root, beta }`, or null: the one --ide named, then
// $TB_IDE, then the twinBASIC_IDE_BETA_<n> folders on the Desktop, newest first.
function installForBeta(beta, explicit = null) {
  const exes = [
    explicit && path.join(explicit.root, "twinBASIC.exe"),
    process.env.TB_IDE,
    ...listIdes().map((i) => i.exe),
  ];
  const root = installOfBeta(beta, exes.filter(Boolean));
  return root ? { root, beta } : null;
}

// What derive reads: the install --ide names; else the build the default and
// built-in sections are pinned at, from its install, or with --release (or
// without one) from its release; else, with nothing pinned, the newest install
// or the latest release. `{ install, tag }`, `tag` null for the latest release.
async function deriveSource(explicit, release) {
  if (explicit) return { install: explicit, tag: null };
  let tag;
  try {
    tag = pinnedBuild(pinsOf(await documentedPackages(DOCS_REF_DIR)));
  } catch (e) {
    die(2, `${e.message}: pass --ide to name the build`);
  }
  if (!tag) return { install: release ? null : withUsageError(() => resolveInstall()), tag: null };
  const beta = betaForTag(tag);
  const install = release ? null : installForBeta(beta);
  if (!install && !release) console.log(`No install of BETA ${beta}, the pinned build: its release is downloaded.`);
  return { install, tag };
}

// --- sync command ---

// The built-in and default packages a run can name without asking anyone: the
// three default ones, the documented ones, and what the install holds or the
// last release had.
async function knownBuiltinNames(install, pins) {
  const names = new Set(DEFAULT_PACKAGES);
  for (const key of pins.keys()) if (!key.startsWith("contributed/")) names.add(key.split("/")[1]);
  if (install) {
    for (const { symbol } of listInstalledPackages(install.root)) names.add(symbol);
    return names;
  }
  const manifest = await readManifest("built-in"); /* none in a store never synced */
  for (const { symbol } of Object.values(manifest?.packages ?? {})) names.add(symbol);
  return names;
}

// `install` is `{ root, beta }` for the local twinBASIC install of the newest
// build, or null for the latest GitHub release. Each documented package is read
// at its pin, the version its section's indexed_from names, unless `upgrade`
// moves it to the newest; the others are read at the newest.
async function runSync(filter, install, { upgrade = false } = {}) {
  await ensureStore(STORE_PATH, SNAPSHOTS_PATH);

  const documented = await documentedPackages(DOCS_REF_DIR);
  const run = {
    pins: pinsOf(documented),
    upgrade,
    synced: [],
    failed: [],
    // Every package name either source knows, to tell a name that matches nothing.
    known: new Set(),
    // The documented packages kept at their pins while a newer version exists.
    held: [],
  };

  // A run limited to built-in and default packages has nothing to ask TWINSERV.
  const builtinNames = await knownBuiltinNames(install, run.pins);
  if (filter?.every((name) => builtinNames.has(name))) {
    console.log("Skipping TWINSERV: only built-in and default packages are named.");
  } else {
    await syncContributed(filter, run);
  }
  await syncBuiltin(filter, install, run);

  const { synced, failed } = run;
  if (synced.length) {
    const parts = synced.map((s) => {
      if (s.from && s.from !== s.to) return `${s.package} ${s.from}→${s.to}`;
      return `${s.package} ${s.to}`;
    });
    await commitStore(STORE_PATH, `sync: ${parts.join(", ")}`);
  }

  // The committed snapshots are the baseline the documentation is compared with:
  // only for the packages the reference documents, and only of their pins.
  const written = await syncSnapshots(STORE_PATH, SNAPSHOTS_PATH, documented, filter);
  console.log(
    written.length ? `\nSnapshots written: ${written.map((w) => w.package).join(", ")}.` : "\nSnapshots unchanged.",
  );
  const past = [];
  for (const [key, pin] of run.pins) {
    const [group, name] = key.split("/");
    if (filter && !filter.includes(name)) continue;
    const held = await storedVersion(STORE_PATH, group, name);
    if (held && held !== pin) past.push(`${name} ${held} (pinned at ${pin})`);
  }
  if (past.length) {
    console.log(
      `\nThe store holds these past their pins; their snapshots stay at the pin until indexed_from names the new version:\n  ${past.join("\n  ")}\n` +
        "analyze --package <name> lists the work; a sync without --upgrade moves one back.",
    );
  }
  if (run.held.length) {
    console.log(
      `\nNewer than the pinned version:\n  ${run.held.map((h) => `${h.symbol}: ${h.pin}, newest ${h.newest}`).join("\n  ")}\n` +
        "sync --upgrade --package <name> moves one to the newest.",
    );
  }

  for (const name of filter ?? []) {
    if (run.known.has(name)) continue;
    failed.push({ symbol: name, error: "no such package" });
    console.warn(`  No package named ${name}`);
  }

  console.log(`\nDone. ${synced.length} synced` + (failed.length ? `, ${failed.length} failed` : "") + ".");
  return failed.length ? 1 : 0;
}

// --- Contributed packages (TWINSERV) ---

// A contributed package's `.twinpack` of the version an item wants: the copy an
// earlier sync kept, else TWINSERV's, which is kept in turn.
async function contributedFiles(item) {
  let buffer = await cachedDownload(STORE_PATH, item.symbol, item.want);
  if (!buffer) {
    buffer = await downloadTwinpack(item.id, item.version);
    await cacheDownload(STORE_PATH, item.symbol, item.want, buffer);
  }
  return twinpackFiles(buffer);
}

// What the contributed manifest records of a package: who publishes it and the
// version the store holds.
function contributedEntry(item) {
  return {
    symbol: item.symbol,
    publisher: item.publisher,
    version: item.want,
    publishedDate: item.version?.publishedDate,
    publishedTime: item.version?.publishedTime,
  };
}

async function syncContributed(filter, run) {
  const { synced, failed, known } = run;
  console.log("Fetching TWINSERV package index...");
  const listing = await twinservListing();
  const manifest = (await readManifest("contributed")) ?? { syncedAt: null, packages: {} };
  const recorded = JSON.stringify(manifest.packages);
  const { items, unlisted } = planContributed(listing, { pins: run.pins, filter, upgrade: run.upgrade });
  for (const pkg of listing) known.add(latestVersion(pkg).symbol);
  for (const { symbol } of unlisted) known.add(symbol);

  // The store is the record of what has been read: a package is read when it
  // holds no sources or no api.json of the wanted version, in this format, and
  // indexed again from its sources when another version of the scanner wrote it.
  const problems = [];
  const reindex = [];
  const fetch = [];
  for (const item of [...items, ...unlisted]) {
    const why = await storeStatus(STORE_PATH, "contributed", item.symbol, item.want);
    if (!why) {
      if (item.id) manifest.packages[item.id] = contributedEntry(item);
      continue;
    }
    problems.push({ symbol: item.symbol, why });
    if (why === "old-scanner") reindex.push(item);
    else if (item.version) fetch.push(item);
    else {
      const error = `${item.want} is not on TWINSERV, and the store does not hold it`;
      failed.push({ symbol: item.symbol, error });
      console.warn(`  FAILED: ${item.symbol}: ${error}`);
    }
  }
  printStoreProblems(problems);
  const listed = new Set(listing.map((p) => p.projectId));
  const removed = filter ? [] : Object.entries(manifest.packages).filter(([id]) => !listed.has(id));
  if (removed.length) console.log(`  No longer on TWINSERV: ${removed.map(([, p]) => p.symbol).join(", ")}`);
  if (!problems.length && !removed.length) console.log("  Up to date.");

  // A package about to be downloaded is indexed with the rest; only the others are
  // indexed again from what the store holds.
  await reindexFromStore(
    "contributed",
    reindex.map((item) => ({ symbol: item.symbol, version: item.want })),
    synced,
  );
  for (const item of reindex) if (item.id) manifest.packages[item.id] = contributedEntry(item);

  for (const item of fetch) {
    try {
      const from = await storedVersion(STORE_PATH, "contributed", item.symbol);
      console.log(`  ${item.symbol}: ${describeMove(from, item)}`);
      const files = await contributedFiles(item);
      const { json: apiJson, stats } = buildApi({ symbol: item.symbol, version: item.want, files });
      await writeToStore(STORE_PATH, "contributed", item.symbol, files, apiJson);
      manifest.packages[item.id] = contributedEntry(item);
      synced.push({ group: "contributed", package: item.symbol, from, to: item.want });
      console.log(`    ${describeIndex(stats)}`);
    } catch (e) {
      failed.push({ symbol: item.symbol, error: e.message });
      console.warn(`    FAILED: ${item.symbol}: ${e.message}`);
    }
  }

  for (const [id] of removed) delete manifest.packages[id];
  if (JSON.stringify(manifest.packages) !== recorded || !manifest.syncedAt) {
    manifest.syncedAt = new Date().toISOString();
    await writeManifest("contributed", manifest);
  }
  run.held.push(...heldBack(items));
}

// --- Built-in + Default packages (the local install, or the GitHub release) ---

// The packages of one build, read: from the newest build's own source when it is
// that build, else from an install of it, else from its release.
async function readBuild(tag, newest) {
  if (tag === newest.tag) {
    if (newest.root) return readInstalledPackages(newest.root);
    console.log(`  Downloading the release ${tag}...`);
    return extractBuiltinPackages(await downloadRelease(newest.assetUrl));
  }
  const beta = betaForTag(tag);
  if (!beta) throw new Error(`${tag} is not the tag of a twinBASIC release`);
  const install = newest.source === "install" ? installForBeta(beta) : null;
  if (install) {
    console.log(`  Reading BETA ${beta} from ${install.root}...`);
    return readInstalledPackages(install.root);
  }
  console.log(`  Downloading the release ${tag}...`);
  return extractBuiltinPackages(await downloadRelease((await getReleaseByTag(tag)).assetUrl));
}

async function syncBuiltin(filter, install, run) {
  const { synced, failed, known } = run;
  const builtinManifestPath = manifestPath(STORE_PATH, "built-in");
  let newest;
  if (install) {
    console.log(`\nReading twinBASIC BETA ${install.beta} from ${install.root}...`);
    newest = await compareInstallManifest(builtinManifestPath, install);
  } else {
    console.log("\nChecking twinBASIC release...");
    newest = await compareBuiltinManifest(builtinManifestPath);
  }
  console.log(`  Newest build: ${newest.tag}`);

  // The packages of the newest build: listed by the install, or by the manifest
  // when it describes this release, else by the release itself, read whole.
  const reads = new Map();
  let listing;
  if (newest.root) listing = listInstalledPackages(newest.root);
  else if (!newest.needsUpdate && Object.keys(newest.manifest.packages ?? {}).length) {
    listing = Object.entries(newest.manifest.packages).map(([guid, { symbol }]) => ({ guid, symbol }));
  } else {
    listing = await readBuild(newest.tag, newest);
    reads.set(newest.tag, listing);
  }

  const items = planBuiltin(
    listing.map((p) => p.symbol),
    {
      newestTag: newest.tag,
      groupOf: (symbol) => packageGroup(symbol, "builtin"),
      pins: run.pins,
      filter,
      upgrade: run.upgrade,
    },
  );
  for (const { symbol } of listing) known.add(symbol);
  for (const { symbol } of items) known.add(symbol);

  // Read again if the store lacks a package, or holds it of another build than
  // the one wanted or from an older indexer; index it again from its sources
  // when only the scanner has changed.
  const problems = [];
  const reindex = [];
  const toRead = new Map();
  for (const item of items) {
    const why = await storeStatus(STORE_PATH, item.group, item.symbol, item.want);
    if (!why) continue;
    problems.push({ symbol: item.symbol, why });
    if (why === "old-scanner") reindex.push(item);
    else {
      if (!toRead.has(item.want)) toRead.set(item.want, []);
      toRead.get(item.want).push(item);
    }
  }
  printStoreProblems(problems);
  if (!problems.length) console.log("  Up to date.");
  for (const item of reindex) {
    await reindexFromStore(item.group, [{ symbol: item.symbol, version: item.want }], synced);
  }

  for (const [tag, wanted] of toRead) {
    let packages = reads.get(tag);
    if (!packages) {
      try {
        packages = await readBuild(tag, newest);
        reads.set(tag, packages);
      } catch (e) {
        for (const item of wanted) {
          failed.push({ symbol: item.symbol, error: e.message });
          console.warn(`    FAILED: ${item.symbol}: ${e.message}`);
        }
        continue;
      }
    }
    for (const item of wanted) {
      const pkg = packages.find((p) => p.symbol === item.symbol);
      if (!pkg) {
        const error = `${tag} has no package of that name`;
        failed.push({ symbol: item.symbol, error });
        console.warn(`    FAILED: ${item.symbol}: ${error}`);
        continue;
      }
      const from = await storedVersion(STORE_PATH, item.group, item.symbol);
      const { json: apiJson, stats } = buildApi({ symbol: pkg.symbol, version: tag, files: pkg.files });
      await writeToStore(STORE_PATH, item.group, pkg.symbol, pkg.files, apiJson);
      synced.push({ group: item.group, package: pkg.symbol, from, to: tag });
      console.log(`    ${pkg.symbol}: ${describeMove(from, item)}; ${describeIndex(stats)}`);
    }
  }

  // The manifest describes the newest build: where it was read from, which one,
  // and its packages. Never the install's path, which names its user.
  if (newest.needsUpdate) {
    await writeManifest("built-in", {
      syncedAt: new Date().toISOString(),
      source: newest.source,
      beta: newest.beta,
      twinbasicTag: newest.tag,
      publishedAt: newest.publishedAt,
      packages: Object.fromEntries(listing.map(({ guid, symbol }) => [guid, { symbol }])),
    });
  }
  run.held.push(...heldBack(items));
}

// --- analyze command ---

// `filter` is the names --package or --packages gave, or null; `all` is --all. A named
// package is analyzed whether or not the reference documents it; with no name, the
// packages the reference has a section for, or with --all every package in the store.
async function runAnalyze(filter, all = false) {
  const documented = await documentedPackages(DOCS_REF_DIR);
  const { list: packageList, skipped } = await storedPackages(STORE_PATH, { documented, names: filter, all });

  if (!packageList.length) {
    die(
      2,
      filter
        ? `No package to analyze is named ${filter.join(", ")}. Check the name, or run sync first.`
        : skipped
          ? `The store holds no package the reference documents; ${skipped} others are not analyzed. Run sync first, or pass --all.`
          : "No packages to analyze. Run sync first.",
    );
  }
  if (skipped) {
    console.log(
      `${skipped} packages in the store have no section in the reference and are not analyzed: --all analyzes them, --package <name> one.`,
    );
  }

  const allReports = [];

  for (const { group, name, apiPath } of packageList) {
    console.log(`\nAnalyzing ${name} (${group})...`);
    const current = JSON.parse(await fs.readFile(apiPath, "utf-8"));
    if (current.format !== API_FORMAT) {
      die(2, `${name}: its api.json is in an older format than this indexer writes. Run sync, which indexes it again.`);
    }
    if ((await recordedFingerprint(path.dirname(apiPath))) !== indexerFingerprint()) {
      console.log(
        "  Warning: its api.json was written by another version of the scanner than this checkout's. Run sync, which indexes it again from the stored sources.",
      );
    }

    const section = documented.get(`${group}/${name}`);
    const docsDir = section?.dir ?? null;
    const indexedFrom = section?.indexedFrom ?? null;
    const exclusions = section?.exclusions ?? null;

    let report;
    if (indexedFrom) {
      report = await analyzeUpdate(name, group, current, indexedFrom, docsDir, exclusions);
    } else {
      report = await analyzeAudit(name, group, current, docsDir, exclusions);
    }
    if (indexedFrom && docsDir && current.version !== indexedFrom) {
      const rechecks = await versionCalloutTasks(docsDir, current.version);
      report.tasks.push(...rechecks);
      report.summary.to_recheck = rechecks.length;
    }

    allReports.push(report);
    printReport(report);
  }

  const reportPath = path.join(STORE_PATH, "report.json");
  await fs.writeFile(reportPath, JSON.stringify(allReports, null, 2) + "\n");
  console.log(`\nReport written to ${reportPath}`);

  // The whole reference is analyzed: the callouts a newer build leaves to check again.
  const beta = filter ? null : (await readManifest("built-in"))?.beta;
  if (beta) {
    const stale = await staleBetaCallouts(beta);
    const calloutsPath = path.join(STORE_PATH, "callouts.json");
    await fs.writeFile(calloutsPath, JSON.stringify({ beta, callouts: stale }, null, 2) + "\n");
    if (stale.length) {
      const one = stale.length === 1;
      console.log(
        `\n${stale.length} ${one ? "callout is" : "callouts are"} labelled with a build before BETA ${beta}. ` +
          `Check ${one ? "it" : "each"} on BETA ${beta}: move the label to that build, or remove the callout if the defect is fixed.`,
      );
      for (const c of stale) console.log(`  ${c.file}:${c.line}  ${c.label}`);
    } else {
      console.log(`\nNo callout is labelled with a build before BETA ${beta}.`);
    }
    console.log(`Written to ${calloutsPath}`);
  }

  const analyzed = new Set(packageList.map((p) => p.name));
  const missing = (filter ?? []).filter((name) => !analyzed.has(name));
  for (const name of missing) console.warn(`  No package to analyze is named ${name}`);
  return missing.length ? 1 : 0;
}

async function analyzeUpdate(name, group, current, indexedFrom, docsDir, exclusions) {
  const snapshotRel = `indexer/snapshots/${group}/${name}/api.json`;
  let baseline = null;
  try {
    // git show's output is held in memory up to maxBuffer, 1 MB by default and
    // less than VB's snapshot.
    const { stdout } = await execFileP("git", ["show", `HEAD:${snapshotRel}`], {
      cwd: REPO_ROOT,
      maxBuffer: GIT_SHOW_MAX_BYTES,
    });
    baseline = JSON.parse(stdout);
  } catch {
    /* no committed snapshot */
  }

  if (!baseline) {
    console.log(
      `  Warning: no committed snapshot of ${name} to compare with; comparing against the documentation instead`,
    );
    return analyzeAudit(name, group, current, docsDir, exclusions);
  }
  if (baseline.format !== API_FORMAT) {
    console.log(`  Warning: the committed snapshot is in an older format; comparing against the documentation instead`);
    return analyzeAudit(name, group, current, docsDir, exclusions);
  }
  if (baseline.version !== indexedFrom) {
    console.log(`  Warning: indexed_from (${indexedFrom}) != snapshot version (${baseline.version})`);
    return analyzeAudit(name, group, current, docsDir, exclusions);
  }

  const diff = diffApi(baseline, current);
  const docPages = await scanDocPages(docsDir);

  let excludedCount = 0;
  const notExcluded = (s) => {
    if (isExcluded(s, exclusions)) {
      excludedCount++;
      return false;
    }
    return true;
  };
  const notExcludedMod = (m) => {
    if (isExcluded(m.current, exclusions)) {
      excludedCount++;
      return false;
    }
    return true;
  };

  const publicAdded = diff.added.filter((s) => s.public).filter(notExcluded);
  const publicModified = diff.modified.filter((m) => m.current.public).filter(notExcludedMod);
  const publicRemoved = diff.removed.filter((s) => s.public).filter(notExcluded);
  const publicUnchanged = diff.unchanged.filter((s) => s.public).filter(notExcluded);

  const tasks = [];

  for (const sym of publicAdded) {
    tasks.push({
      action: "create",
      module: sym.container || sym.name,
      symbol: sym.name,
      kind: sym.kind,
      signature: sym.signature,
      file: sym.file,
    });
  }

  for (const { current: cur, baseline: base, changes } of publicModified) {
    tasks.push({
      action: "update",
      module: cur.container || cur.name,
      symbol: cur.name,
      kind: cur.kind,
      reason: changes.includes("signature") ? "signature_changed" : "declaration_changed",
      changes,
      old_signature: base.signature,
      new_signature: cur.signature,
      file: cur.file,
      doc_page: docPages.get(cur.name) || null,
    });
  }

  for (const sym of publicRemoved) {
    tasks.push({
      action: "flag_removal",
      module: sym.container || sym.name,
      symbol: sym.name,
      kind: sym.kind,
      doc_page: docPages.get(sym.name) || null,
    });
  }

  const totalPublic = publicAdded.length + publicModified.length + publicRemoved.length + publicUnchanged.length;

  return {
    package: name,
    group,
    mode: "update",
    from: baseline.version,
    to: current.version,
    tasks,
    summary: {
      total_public: totalPublic,
      documented: totalPublic - publicAdded.length,
      to_create: publicAdded.length,
      to_update: publicModified.length,
      to_remove: 0,
      flagged: publicRemoved.length,
      excluded: excludedCount,
    },
  };
}

async function analyzeAudit(name, group, current, docsDir, exclusions) {
  const docPages = await scanDocPages(docsDir);
  const coverage = auditCoverage(current, docPages);

  let excludedCount = 0;
  const tasks = [];
  for (const sym of coverage.undocumented) {
    if (isExcluded(sym, exclusions)) {
      excludedCount++;
      continue;
    }
    tasks.push({
      action: "create",
      module: sym.container || sym.name,
      symbol: sym.name,
      kind: sym.kind,
      signature: sym.signature || null,
      file: sym.file || null,
    });
  }

  // Also count excluded symbols from the documented list for accurate totals
  const documentedFiltered = coverage.documented.filter((s) => {
    if (isExcluded(s, exclusions)) {
      excludedCount++;
      return false;
    }
    return true;
  });

  return {
    package: name,
    group,
    mode: "audit",
    from: null,
    to: current.version,
    tasks,
    summary: {
      total_public: documentedFiltered.length + tasks.length,
      documented: documentedFiltered.length,
      to_create: tasks.length,
      to_update: 0,
      to_remove: 0,
      flagged: 0,
      excluded: excludedCount,
    },
  };
}

// --- draft command ---

// Places the pages of the report analyze wrote last. indexer/.packages/draft/,
// emptied first, gets the plan of each package (`<package>.json`), a file for
// each batch of pages one agent of the doc-draft workflow writes
// (`batch-<n>.json`), and `manifest.json`, which lists them and is what the
// workflow is given.
async function runDraft(filter) {
  let reports;
  try {
    reports = JSON.parse(await fs.readFile(path.join(STORE_PATH, "report.json"), "utf-8"));
  } catch {
    die(2, "No report to draft from. Run analyze first.");
  }
  const chosen = filter ? reports.filter((r) => filter.includes(r.package)) : reports;
  const documented = await documentedPackages(DOCS_REF_DIR);
  const outDir = path.join(STORE_PATH, "draft");
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  const rel = (p) => path.relative(REPO_ROOT, p).split(path.sep).join("/");
  const writeJson = (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

  // The model pages each section of a group offers the others, the most
  // documented section first, for the pages whose section has none of their kind.
  const modelsByGroup = new Map();
  const groupModels = async (group) => {
    if (modelsByGroup.has(group)) return modelsByGroup.get(group);
    const found = [];
    for (const [key, section] of documented) {
      const [g, name] = key.split("/");
      if (g !== group) continue;
      let api;
      try {
        api = JSON.parse(await fs.readFile(path.join(STORE_PATH, group, name, "api.json"), "utf-8"));
      } catch {
        continue; // not in the store
      }
      const pages = await sectionPages(section.dir);
      found.push({ dir: rel(section.dir), size: pages.length, models: sectionModels({ api, pages }) });
    }
    found.sort((a, b) => b.size - a.size || a.dir.localeCompare(b.dir));
    modelsByGroup.set(group, found);
    return found;
  };

  const manifest = { packages: [] };
  let batchNo = 0;
  for (const report of chosen) {
    // A package with no section yet gets one in its group's folder, by its name,
    // with a landing page like those of the group's other sections.
    const section = documented.get(`${report.group}/${report.package}`);
    const groupDir = path.join(DOCS_REF_DIR, groupFolder(report.group));
    const sectionDir = section?.dir ?? path.join(groupDir, report.package);
    let newLanding = null;
    if (!section) {
      const siblings = [];
      for (const dir of new Set([...documented.values()].map((s) => s.dir))) {
        if (path.dirname(dir) !== groupDir) continue;
        const landing = (await sectionPages(dir)).find((p) => p.rel === "index.md");
        if (landing) siblings.push({ folder: path.basename(dir), ...landing });
      }
      newLanding = newLandingFor(report.package, siblings);
      // A contributed package's landing page opens with its author: the publisher TWINSERV lists.
      if (report.group === "contributed") {
        const listed = Object.values((await readManifest("contributed"))?.packages ?? {});
        newLanding.author = listed.find((p) => p.symbol === report.package)?.publisher ?? null;
      }
    }
    const storeDir = path.join(STORE_PATH, report.group, report.package);
    const api = JSON.parse(await fs.readFile(path.join(storeDir, "api.json"), "utf-8"));
    const plan = planPackage({
      report,
      api,
      pages: await sectionPages(sectionDir),
      sectionDir: rel(sectionDir),
      sourceDir: rel(path.join(storeDir, "sources")),
      newLanding,
      borrowedModels: (await groupModels(report.group)).filter((s) => s.dir !== rel(sectionDir)),
    });
    const planFile = path.join(outDir, `${report.package}.json`);
    await writeJson(planFile, plan);

    const batches = [];
    for (const batch of batchTasks(plan)) {
      const file = path.join(outDir, `batch-${batchNo++}.json`);
      const { package: name, sectionDir: dir, landing, permalinks } = plan;
      await writeJson(file, { package: name, sectionDir: dir, landing, permalinks, ...batch });
      batches.push({ file: rel(file), container: batch.container, pages: batch.tasks.length });
    }
    manifest.packages.push({
      package: plan.package,
      group: plan.group,
      mode: plan.mode,
      version: plan.version,
      sectionDir: plan.sectionDir,
      landing: plan.landing,
      plan: rel(planFile),
      batches,
      unplaced: plan.unplaced.length,
      flagged: plan.flagged.length,
    });

    const created = plan.tasks.filter((t) => t.new).length;
    console.log(
      `${plan.package}: ${created} page(s) to write, ${plan.tasks.length - created} to change, in ${batches.length} batch(es)`,
    );
    for (const t of plan.unplaced)
      console.log(`  unplaced: ${t.kind} ${t.container ? `${t.container}.` : ""}${t.symbol} (${t.reason})`);
    for (const t of plan.flagged)
      console.log(`  no longer declared: ${t.kind} ${t.symbol}${t.file ? ` (${t.file})` : ""}`);
  }
  const manifestFile = path.join(outDir, "manifest.json");
  await writeJson(manifestFile, manifest);
  console.log(`\nPlan written to ${rel(outDir)}/; the workflow takes ${rel(manifestFile)}`);

  const missing = (filter ?? []).filter((name) => !chosen.some((r) => r.package === name));
  for (const name of missing) console.warn(`  The report has no package named ${name}`);
  return missing.length ? 1 : 0;
}

// --- derive command ---

// Writes builder/package-api.json from every built-in and default package of one
// build: the snapshots hold only the documented packages, and keep no declaration
// order. `install` is `{ root, beta }` to read, else the release of `tag` is
// downloaded, else the latest release (deriveSource decides).
async function runDerive({ install, tag }, { check, out = PACKAGE_API_PATH }) {
  let beta;
  let packages;
  if (install) {
    console.log(`Reading twinBASIC BETA ${install.beta} from ${install.root}...`);
    beta = install.beta;
    packages = readInstalledPackages(install.root);
  } else if (tag) {
    console.log(`Downloading the twinBASIC release ${tag}...`);
    beta = betaForTag(tag);
    packages = extractBuiltinPackages(await downloadRelease((await getReleaseByTag(tag)).assetUrl));
  } else {
    console.log("Downloading the latest twinBASIC release...");
    const release = await getLatestRelease();
    beta = betaForTag(release.tag);
    packages = extractBuiltinPackages(await downloadRelease(release.assetUrl));
  }
  // A plain BETA number is written as a number, as it always has been; `999a` stays a string.
  const build = /^\d+$/.test(beta ?? "") ? Number(beta) : beta;

  let derived;
  try {
    derived = derivePackageApi({ build, packages });
  } catch (e) {
    die(2, e.message);
  }
  const { text, types, members, problems, unresolved } = derived;
  console.log(`  ${packages.length} package(s), ${types} type(s), ${members} member(s)`);
  for (const p of problems.slice(0, 20)) console.warn(`  ? ${p.pkg} ${p.file}:${p.line} ${p.why}`);
  if (problems.length > 20) console.warn(`  ? ... and ${problems.length - 20} more`);
  for (const u of unresolved.slice(0, 20)) console.warn(`  ? not found: ${u}`);

  const shown = path.relative(REPO_ROOT, out);
  if (check) {
    const committed = existsSync(out) ? readFileSync(out, "utf8").replace(/\r\n/g, "\n") : null;
    if (committed === text) {
      console.log(`Up to date: ${shown}`);
      return 0;
    }
    console.error(
      `STALE: ${shown} differs from what BETA ${beta} gives; ` +
        "run node indexer/twin-index.mjs derive and commit the result",
    );
    return 1;
  }
  writeFileSync(out, text, "utf8");
  console.log(`Wrote ${shown} (${(text.length / 1024).toFixed(0)} KB)`);
  return 0;
}

function printReport(report) {
  const s = report.summary;
  console.log(`  Mode: ${report.mode}`);
  if (report.from) console.log(`  From: ${report.from} → ${report.to}`);
  else console.log(`  Version: ${report.to}`);
  console.log(`  Public symbols: ${s.total_public} (${s.documented} documented)`);
  if (s.to_create) console.log(`  To create: ${s.to_create}`);
  if (s.to_update) console.log(`  To update: ${s.to_update}`);
  if (s.flagged) console.log(`  Flagged for removal: ${s.flagged}`);
  if (s.excluded) console.log(`  Excluded: ${s.excluded}`);
  if (s.to_recheck) {
    console.log(`  Callouts to check against ${report.to}: ${s.to_recheck}`);
    for (const t of report.tasks.filter((t) => t.action === "recheck_callout"))
      console.log(`    ${t.file}:${t.line}  ${t.label}`);
  }
}
