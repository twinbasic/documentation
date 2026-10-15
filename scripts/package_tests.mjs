// Runs the package test projects, test/package-tests/<Package>/, and judges each case against
// the package's expect.json.
//
//     node scripts/package_tests.mjs <Package> [<Package> ...] [options]
//     node scripts/package_tests.mjs --all-packages [options]
//
//       <Package>         a package with a test project, matched to its folder without regard
//                         to case (tbregexp is tbRegExp)
//       --all-packages    every package with a test project; a run of all of them takes several
//                         minutes a package, so it is never the default
//       --arch <a>        win32, win64 or both (default both)
//       --port <n>        the first DevTools port to try (default 9620); the run claims the first
//                         free one from there (scripts/lib/tb-ports.mjs)
//       --timeout <secs>  how long one case may take (default 60)
//       --hang-timeout <secs>  how long a case expect.json says never returns is given (default 20)
//       --update          write expect.json from this run, for the architectures run
//       --ide <path>      as tbrun's
//       --json            one JSON object instead of text
//
// Each case is written to check what is correct, so a defect of the package is a failing case,
// and expect.json records how each case fails, or that it never returns, on the version the
// section documents. A case is then one of: documented (as expect.json says), fixed (expected
// to fail or never return, and passes) or changed (anything else). Fixed means the page's
// callout goes; changed means a claim of the page is no longer true.
//
// For each package and architecture the project is staged with the package embedded (from
// %TEMP%\tb-twinserv, the cache check_examples keeps, downloaded from TWINSERV when it is not
// there) and run with `tbrun --tests`. A case that does not return stops the IDE's compiler,
// so a case expect.json marks as never returning is run alone, and a case that unexpectedly
// does not return is judged, and the cases after it are run again in a new IDE.
//
// A compile case that expects an error is in the package folder's compile/, a project of compile
// cases only, because the compiler runs no [TestCase] in a project with errors; it is staged with
// the package embedded too, and its cases are judged with the rest.
//
// RunAll.twin, which the project's Sub Main runs, is generated from the cases and expect.json:
// the run writes it again when it is out of date, and says so.
//
// Needs Windows and a twinBASIC install, as tbrun does; outside every gate and outside CI.
//
// Exit: 0 every case documented, 1 a case fixed or changed, 2 the harness failed or the command
// line was refused.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { downloadPackage } from "../indexer/lib/twinserv-client.mjs";
import {
  choiceOption,
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  withUsageError,
} from "../lib/cli.mjs";
import {
  COMPILE_DIR,
  compileSources,
  RESOURCES_DIR,
  resourceFiles,
  EXPECT_JSON,
  packageTestNames,
  packageVersion,
  RUNALL_FILE,
  readExpect,
  templateSettings,
  testSettings,
  testSources,
} from "../lib/package-tests.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { embeddedPackages } from "./lib/example-batches.mjs";
import {
  ARCHES,
  archesOf,
  expectationFor,
  expectFrom,
  judge,
  outcomeOf,
  projectCases,
  runAllText,
} from "./lib/package-test-cases.mjs";
import { claimPorts } from "./lib/tb-ports.mjs";
import { unpackProject } from "./lib/tb-project.mjs";

const ROOT = path.join(REPO_ROOT, "test", "package-tests");
const TEMPLATES = path.join(REPO_ROOT, "test", "example-projects");
const TBRUN = path.join(REPO_ROOT, "scripts", "tbrun.mjs");
const CACHE = path.join(tmpdir(), "tb-twinserv");
const WORK = path.join(tmpdir(), "tb-package-tests");

const USAGE = `usage: node scripts/package_tests.mjs (<Package> ... | --all-packages) [--arch win32|win64|both] [--port N] [--timeout S] [--hang-timeout S] [--update] [--ide <path>] [--json] [-h, --help]

Runs package test projects under test/package-tests/ with tbrun --tests, each
with its package embedded, and judges every case against the package's
expect.json: documented (as it says), fixed (expected to fail or never return,
and passes) or changed. Name one or more packages (in any case), or pass
--all-packages to run every project.

  --all-packages          run every package's test project
  --arch <a>              win32, win64 or both (default both)
  --port <n>              the first DevTools port to try (default 9620)
  --timeout <secs>        how long one case may take (default 60)
  --hang-timeout <secs>   how long a case that never returns is given (default 20)
  --update                write expect.json from this run, for the architectures run
  --ide <path>            as tbrun's
  --json                  emit one JSON object instead of text
  -h, --help              print this text and exit

Exit codes:
  0  every case did what expect.json says
  1  a case was fixed or changed
  2  a refused command line (no package named and no --all-packages, a package
     with no test project), or the harness failed`;

const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        arch: { type: "string" },
        port: { type: "string" },
        timeout: { type: "string" },
        "hang-timeout": { type: "string" },
        update: { type: "boolean", default: false },
        "all-packages": { type: "boolean", default: false },
        ide: { type: "string" },
        json: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      positionals: { min: 0, max: Infinity },
      stopAt: ["help"],
    }),
  { format: (err) => `${err.message}\n${USAGE}` },
);
if (values.help) printHelpAndExit(USAGE);

const opts = withUsageError(
  () => ({
    arches:
      choiceOption(values.arch ?? "both", { option: "--arch", choices: [...ARCHES, "both"] }) === "both"
        ? ARCHES
        : [values.arch],
    port: numberOption(values.port ?? "9620", { option: "--port", integer: true, min: 1, max: 65535 }),
    timeout: numberOption(values.timeout ?? "60", { option: "--timeout", above: 0 }),
    hangTimeout: numberOption(values.hangTimeout ?? "20", { option: "--hang-timeout", above: 0 }),
  }),
  { format: (err) => `${err.message}\n${USAGE}` },
);

exitOnCrash();

// The packages to run: those named, each matched to its folder without regard to case, or all
// of them with --all-packages. Neither is refused, and so are both, before anything starts.
const known = packageTestNames(ROOT);
const knownList = known.length ? known.join(", ") : "none";
if (values.allPackages && positionals.length) die(2, `name packages or pass --all-packages, not both\n${USAGE}`);
if (!values.allPackages && !positionals.length) {
  die(2, `name a package, or pass --all-packages; packages with a test project: ${knownList}\n${USAGE}`);
}
const byLower = new Map(known.map((p) => [p.toLowerCase(), p]));
const missing = positionals.filter((p) => !byLower.has(p.toLowerCase()));
if (missing.length) {
  die(2, `no test project for ${missing.join(", ")}; packages with a test project: ${knownList}\n${USAGE}`);
}
const packages = values.allPackages ? known : [...new Set(positionals.map((p) => byLower.get(p.toLowerCase())))];
if (!packages.length) die(2, "test/package-tests/ holds no test project");

const [port] = await claimPorts(1, { from: opts.port });
const say = (s) => {
  if (!values.json) console.log(s);
};

for (const pkg of packages) await ensurePackage(templateSettings(TEMPLATES, pkg));

const report = [];
let failed = false;
for (const pkg of packages) {
  const r = await runPackage(pkg);
  report.push(r);
  if (r.cases.some((c) => c.verdict !== "documented")) failed = true;
}
if (values.json) console.log(JSON.stringify({ port, packages: report }, null, 2));
process.exit(failed ? 1 : 0);

// ---------------------------------------------------------------- one package

async function runPackage(pkg) {
  const template = templateSettings(TEMPLATES, pkg);
  const version = packageVersion(template, pkg);
  const expect = readExpect(ROOT, pkg);
  if (expect.version && expect.version !== version) {
    say(`${pkg}: expect.json is for version ${expect.version}, the template for ${version}`);
  }
  let files = testSources(ROOT, pkg);
  const { tests, compiles, problems } = projectCases(files);
  const compileFiles = compileSources(ROOT, pkg);
  const compileProject = projectCases(compileFiles);
  problems.push(...compileProject.problems.map((p) => `${COMPILE_DIR}/: ${p}`));
  if (compileProject.tests.length) problems.push(`${COMPILE_DIR}/ holds a [TestCase]: it holds compile cases only`);
  if (problems.length) die(2, `${pkg}:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  refreshRunAll(pkg, version, tests, expect);
  files = testSources(ROOT, pkg);

  const compileNames = compileProject.compiles.map((c) => c.name);
  const names = [...compiles.map((c) => c.name), ...compileNames, ...tests.map((t) => `${t.fixture}.${t.name}`)];
  const twice = names.filter((n, i) => names.indexOf(n) !== i);
  if (twice.length) die(2, `${pkg}: two cases are named ${[...new Set(twice)].join(", ")}`);
  say(`${pkg} ${version}: ${names.length} case${names.length === 1 ? "" : "s"}`);
  const outcomes = new Map(names.map((n) => [n, {}]));
  // A package tested on one architecture only (expect.json's arches) is run on that one.
  const arches = opts.arches.filter((a) => archesOf(expect).includes(a));
  if (arches.length < opts.arches.length) say(`  tested on ${archesOf(expect).join(", ")} only`);
  for (const arch of arches) {
    if (compileNames.length) {
      const compileTree = stageTree(`${pkg}-${COMPILE_DIR}`, pkg, arch, template, compileFiles);
      for (const r of tbrunCases(compileTree, arch, compileNames, opts.timeout))
        outcomes.get(r.name)[arch] = outcomeOf(r);
    }
    const tree = stageTree(pkg, pkg, arch, template, files, resourceFiles(ROOT, pkg));
    const own = names.filter((n) => !compileNames.includes(n));
    const hangs = own.filter((n) => expectationFor(expect, n, arch).kind === "hang");
    let rest = own.filter((n) => !hangs.includes(n));
    // A case that does not return keeps the compiler busy, so tbrun reports the cases it did not
    // send as "not run", and those are run again in a new IDE: by name, whatever order tbrun ran
    // the files in.
    while (rest.length) {
      const results = tbrunCases(tree, arch, rest, opts.timeout);
      const next = [];
      let stalled = null;
      for (const r of results) {
        if (/^not run: /.test(r.detail ?? "") && !r.pass) {
          next.push(r.name);
          continue;
        }
        const o = outcomeOf(r);
        outcomes.get(r.name)[arch] = o;
        if (o.kind === "hang") stalled = r.name;
      }
      if (next.length)
        say(`  ${arch}: ${stalled ?? "a case"} did not return; running the ${next.length} not run again`);
      if (next.length && !stalled)
        throw new Error(`tbrun left ${next.length} cases not run, and no case that did not return`);
      rest = next;
    }
    for (const name of hangs) {
      const [r] = tbrunCases(tree, arch, [name], opts.hangTimeout);
      outcomes.get(name)[arch] = outcomeOf(r);
    }
  }

  const cases = [];
  for (const name of names) {
    for (const arch of arches) {
      const expected = expectationFor(expect, name, arch);
      const got = outcomes.get(name)[arch] ?? { kind: "fail", detail: "no result" };
      const verdict = judge(expected, got);
      cases.push({ name, arch, verdict, expected, got });
      if (verdict !== "documented") {
        say(`  ${verdict.toUpperCase()} ${arch} ${name}`);
        say(`    expected: ${describe(expected)}`);
        say(`    got:      ${describe(got)}`);
      }
    }
  }
  const documented = cases.filter((c) => c.verdict === "documented").length;
  say(`  ${documented} of ${cases.length} as documented (${arches.join(", ")})`);

  if (values.update) {
    const next = expectFrom({ version, names, outcomes, previous: expect });
    const file = path.join(ROOT, pkg, EXPECT_JSON);
    writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    say(`  wrote ${path.relative(REPO_ROOT, file).replaceAll(path.sep, "/")}`);
    refreshRunAll(pkg, version, tests, next);
  }
  return { package: pkg, version, cases };
}

function describe(o) {
  return o.kind === "pass" ? "pass" : o.kind === "hang" ? "does not return" : `fails: ${o.detail}`;
}

// RunAll.twin follows the cases and expect.json; it is written only when it changes.
function refreshRunAll(pkg, version, tests, expect) {
  const file = path.join(ROOT, pkg, "Sources", RUNALL_FILE);
  const text = runAllText({ pkg, version, tests, expect });
  const old = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
  if (old === text) return;
  writeFileSync(file, text, "utf8");
  say(`  wrote ${path.relative(REPO_ROOT, file).replaceAll(path.sep, "/")}`);
}

// ---------------------------------------------------------------- staging and running

async function ensurePackage(settings) {
  for (const p of embeddedPackages(settings)) {
    const tree = path.join(CACHE, p.key);
    if (existsSync(path.join(tree, "Settings"))) continue;
    const file = `${tree}.twinpack`;
    if (!existsSync(file)) {
      say(`  downloading ${p.folder} (${p.key}) from TWINSERV`);
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(file, await downloadPackage(p.id, p.version));
    }
    unpackProject(file, tree);
  }
}

// The project staged as WORK/<label>-<arch>-<port>, with the package embedded, and with the
// resources given (the run-time project's Resources/, byte for byte).
function stageTree(label, pkg, arch, template, files, resources = []) {
  const settings = testSettings(template, pkg);
  const tree = path.join(WORK, `${label}-${arch}-${port}`);
  rmSync(tree, { recursive: true, force: true });
  mkdirSync(path.join(tree, "Sources"), { recursive: true });
  writeFileSync(path.join(tree, "Settings"), `${JSON.stringify(settings, null, "\t")}\n`, "utf8");
  for (const p of embeddedPackages(settings)) {
    const from = path.join(CACHE, p.key);
    if (!existsSync(path.join(from, "Settings"))) throw new Error(`${p.folder} is not in ${CACHE}`);
    cpSync(from, path.join(tree, "Packages", p.folder), { recursive: true });
  }
  for (const f of files) {
    const out = path.join(tree, "Sources", ...f.name.split("/"));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, f.text.replace(/\n/g, "\r\n"), "utf8");
  }
  for (const r of resources) {
    const out = path.join(tree, RESOURCES_DIR, ...r.name.split("/"));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, r.bytes);
  }
  return tree;
}

// tbrun --tests --json on some of the cases; its cases in the order asked.
function tbrunCases(tree, arch, names, timeoutSecs) {
  const args = [TBRUN, tree, "--tests", "--json", "--arch", arch, "--port", String(port)];
  args.push("--timeout", String(timeoutSecs), "--only", names.join(","));
  if (values.ide) args.push("--ide", values.ide);
  const r = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // below
  }
  if (!json || (r.status !== 0 && r.status !== 7)) {
    throw new Error(`tbrun exited ${r.status} on ${tree} (${arch}):\n${r.stderr || r.stdout}`);
  }
  // A run-time project that does not compile ran nothing: that is the project's fault, never a
  // verdict on a case, so it is not judged (nor written to expect.json by --update).
  if (json.cases.some((c) => /^not run: the project has compile errors/.test(c.detail ?? ""))) {
    const errors = (json.diagnostics ?? []).filter((d) => String(d).startsWith("{ERROR}"));
    throw new Error(
      `${tree} (${arch}) does not compile, so no case ran; a compile case that expects an error goes in ` +
        `${COMPILE_DIR}/:\n${errors.map((d) => `  ${d}`).join("\n")}`,
    );
  }
  const byName = new Map(json.cases.map((c) => [c.name, c]));
  return names.map((n) => ({ name: n, ...(byName.get(n) ?? { pass: false, detail: "tbrun gave no result" }) }));
}
