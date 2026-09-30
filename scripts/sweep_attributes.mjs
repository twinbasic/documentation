#!/usr/bin/env node
// Ask the compiler where every attribute is legal, exhaustively.
//
//     node scripts/sweep_attributes.mjs [options]
//
// The options, and the exit codes, are in USAGE below, which --help prints.
//
// ---------------------------------------------------------------- why this
//
// `Reference/Attributes.md` states an `Applicable to:` line per attribute, and
// three tools already touch it, none of them exhaustive:
//
//   * census_attributes.mjs reports where the SHIPPED PACKAGES use an attribute.
//     That is evidence of use, not of legality -- `[Hidden]` is refused on an
//     Interface line inside a CoClass, and used nowhere on a whole Class though
//     the compiler accepts it there.
//   * gen_attribute_probes.mjs probes the targets the page CLAIMS. It cannot find
//     a target the page does not name, so an entry that is too short stays too
//     short. `[ComExport]` documented as "constants in a Module" would stay so
//     if the targets tried were a Sub and a Const, with an API `Declare` never
//     among them.
//   * its EXPLORATORY list asks the questions a person thought of.
//
// This asks every question. Each attribute name x each declaration site
// (lib/attribute-sites.mjs) x each argument shape, built in batches, with the
// compiler's own answer recorded: accepted, refused, or recognised but faulty.
// The result is laid against Attributes.md, and the disagreements are the report.
//
// ------------------------------------------------- what makes an answer readable
//
//   1. A site is a claim about the grammar, so every skeleton is built with NO
//      attribute first (the baseline). A site that does not build clean is
//      voided, never trusted -- otherwise a wrong skeleton reads as "every
//      attribute is refused here".
//   2. TB5155 and TB5182 do not separate "wrong place" from "no such attribute"
//      (`[ConstantFoldable]`, plainly real, draws TB5182 on a class method). So
//      an unknown name is built at every site too, as the CONTROL. A probe that
//      draws exactly what the control draws at its site is a refusal, whatever
//      the code -- that is what keeps `[Reset] Dim x` from reading as a
//      recognised attribute because a name was parsed as something else. A site
//      whose control COMPILES is voided.
//   3. A batch could be wrong even when every skeleton is right: the compiler
//      might stop reporting after so many errors, or a syntax error in one file
//      might suppress the semantic errors of the rest. Three CANARY probes
//      (one clean, one context-refused, one unknown) ride in every batch. What
//      they must draw is fixed in this file, not read from a build: a build that
//      contained the masking could otherwise calibrate the check to it. The tool
//      first builds the canaries alone and refuses to go on unless they draw what
//      is recorded here. A batch whose canaries differ, or that holds an error
//      row belonging to no probe, is halved rather than believed.
//   4. Halving is also how a compiler crash, a hang or a stray error row is
//      isolated to a probe.
//   5. `--verify N` rebuilds N random probes in fresh batches and compares.
//   6. Batches are shuffled, so one attribute's probes do not share a project,
//      and an attribute the compiler allows once per project ([RunAfterBuild])
//      goes in one probe to a batch, or its TB5114 would read as acceptance.
//
// What is NOT settled by a clean build: that the attribute DOES anything, or
// what. That takes an A/B probe (see the X29..X33 probes in
// gen_attribute_probes.mjs), and this tool only says where to point one. Nor
// does a clean build here prove the attribute survives a full build: the
// diagnostics are the IDE's background compile, so a check made only at link
// time (an export table) is not seen.
//
// Needs a twinBASIC install and Windows with a private desktop, like
// examples.bat, so it is outside every gate and outside CI.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseAttributes } from "./lib/attributes-doc.mjs";
import { MAIN_TWIN, PROBE_FACTORY_TWIN, pad, settingsText, writeProbeResourcesSync } from "./lib/attribute-probe-kit.mjs";
import {
  CANARY_SPECS, CONTROL_NAME, EXPECTED_CANARIES, aggregate, argsOf, canaryOk, classify, compare, createRunner,
  firm, formDependence, inconclusive, judgePreflight, makeBatches, parseTokenRun, recognised, sortRows, soft,
  stage1Forms, stage2Forms, verifyMismatches,
} from "./lib/attribute-sweep.mjs";
import { SITE_LIST, renderSite } from "./lib/attribute-sites.mjs";
import { compileProject } from "./lib/tb-build.mjs";
import { sleep, wantShow } from "./lib/tb-ide.mjs";
import { compilerExe, buildNumber, findIde, runCompiler } from "./lib/tb-install.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";
import { CliError, choiceOption, exitOnCrash, numberOption, parseCli, printHelpAndExit, refuseTogether, withUsageError } from "../lib/cli.mjs";
import { DOCS_DIR } from "../lib/repo-paths.mjs";

// What a crash has to be able to write: the run's build number and its verify
// result, which main() fills in. A run of many builds is in one process, so an
// uncaught exception from the IDE or CDP code ends every lane's work, and the
// report of what was learned is what would be lost (see `salvage`).
const run = { build: "?", verify: null };
exitOnCrash(salvage);

const ATTR_DOC = path.join(DOCS_DIR, "Reference", "Attributes.md");

// As tbdocs and check_links name theirs: 1 is a finding, 2 is the tool unable to do its job.
const EXIT_FOUND = 1;
const EXIT_ERROR = 2;

const USAGE = `usage: node scripts/sweep_attributes.mjs [options]

Builds every attribute at every declaration site and reports what the compiler
accepts, laid against Reference/Attributes.md.

  --ide <path>        twinBASIC.exe (default: $TB_IDE, else the newest
                      twinBASIC_IDE_BETA_* on the Desktop)
  --names <a,b,...>   only these attribute names, in any case (default: every
                      name in Attributes.md plus every name in the compiler's
                      token table)
  --sites <a,b,...>   only these sites (default: all; --list-sites names them)
  --forms <mode>      argument shapes to try: bare, smart or all (default smart:
                      every shape for a documented attribute, the bare form for
                      a token-table name and more only where it was recognised;
                      a shape known to be required is always tried)
  --no-tokens         do not add the compiler's token-table names
  --jobs <n>          concurrent IDE lanes (default 4)
  --port <n>          first DevTools port; a lane uses one more each (default 9560)
  --batch-size <n>    probes per project (default 400)
  --verify <n>        afterwards rebuild n random probes in fresh batches and
                      compare with the first answer (default 0)
  --out <file>        write the markdown report there instead of stdout
  --dump-results <file>
                      also write every result, raw, as JSON
  --work <dir>        where projects are staged; must be under the system temp
                      folder (default %TEMP%/tbsweep/<port>)
  --keep              keep the staged projects
  --preflight         build only the canaries, baselines and controls, and stop
  --dry-run           count the probes and build nothing
  --list-sites        print the site ids and exit
  --show, --hide      show the IDEs on the desktop, or keep them private
  --timeout <secs>    how long to wait for one build to settle (default 180)
  -h, --help          print this text and exit

A report is written even when the run is cut short, and says so at the top.

Exit codes:
  0  the report was produced and its self-checks held
  1  a self-check found a fault: a probe disturbed the canaries even beside
     nothing else, or --verify found a probe that answered differently the
     second time
  2  a refused command line, no install, canaries that do not draw what this
     file records, a harness failure, a run cut short (its report is written
     all the same), or a crash`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values } = withUsageError(() => parseCli(process.argv.slice(2), {
  options: {
    ide: { type: "string" }, names: { type: "string" }, sites: { type: "string" },
    forms: { type: "string" }, "no-tokens": { type: "boolean", default: false },
    jobs: { type: "string" }, port: { type: "string" }, "batch-size": { type: "string" },
    verify: { type: "string" }, out: { type: "string" }, "dump-results": { type: "string" },
    work: { type: "string" }, keep: { type: "boolean", default: false },
    preflight: { type: "boolean", default: false }, "dry-run": { type: "boolean", default: false },
    "list-sites": { type: "boolean", default: false },
    show: { type: "boolean", default: false }, hide: { type: "boolean", default: false },
    timeout: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
  stopAt: ["help"],
}), usageError);
if (values.help) printHelpAndExit(USAGE);
if (values.listSites) {
  for (const s of SITE_LIST) console.log(`${s.id.padEnd(22)} ${s.human}`);
  process.exit(0);
}

const opt = withUsageError(() => {
  refuseTogether(values, ["show", "hide"]);
  const forms = choiceOption(values.forms ?? "smart", { option: "--forms", choices: ["bare", "smart", "all"] });
  const csv = (v) => (v === undefined ? null : v.split(",").map((s) => s.trim()).filter(Boolean));
  const names = csv(values.names);
  const sites = csv(values.sites);
  for (const s of sites ?? []) {
    if (!SITE_LIST.some((x) => x.id === s)) {
      throw new CliError("bad-value", `unknown site: ${s} (--list-sites names them)`, { option: "--sites", value: s });
    }
  }
  const basePort = numberOption(values.port ?? "9560", { option: "--port", integer: true, min: 1, max: 65535 });
  const jobs = numberOption(values.jobs ?? "4", { option: "--jobs", integer: true, min: 1 });
  // A lane takes the port after the last one's.
  if (basePort + jobs - 1 > 65535) {
    throw new CliError("conflict", `--port ${basePort} with --jobs ${jobs} runs past port 65535`, { option: "--port" });
  }
  // startTidy sweeps and restores registry entries under folders only the
  // harness writes to, and refuses one outside the temp folder (asTempFolder), so
  // the tidy would be lost for every build of the run.
  const workRoot = path.resolve(values.work ?? path.join(tmpdir(), "tbsweep", String(basePort)));
  const tmpRoot = path.resolve(tmpdir());
  if (workRoot.toLowerCase() === tmpRoot.toLowerCase()
    || !(workRoot.toLowerCase() + path.sep).startsWith(tmpRoot.toLowerCase() + path.sep)) {
    throw new CliError("bad-value", `--work must be under ${tmpRoot}, not ${workRoot}`, { option: "--work", value: workRoot });
  }
  return {
    forms, names, sites, basePort, workRoot,
    jobs,
    batchSize: numberOption(values.batchSize ?? "400", { option: "--batch-size", integer: true, min: 4 }),
    verify: numberOption(values.verify ?? "0", { option: "--verify", integer: true, min: 0 }),
    timeout: values.timeout === undefined ? null
      : numberOption(values.timeout, { option: "--timeout", above: 0 }),
  };
}, usageError);

const say = (msg) => console.error(msg);
let tidy = null;
const die = (code, msg) => { console.error(msg); finishTidy(tidy); process.exit(code); };

// ------------------------------------------------------------- the install
const IDE = findIde(values.ide);
if (!values.dryRun && (!IDE || !existsSync(IDE))) {
  die(EXIT_ERROR, (IDE ? `no twinBASIC IDE at ${IDE}: ` : "no twinBASIC IDE found: ") +
    "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop");
}
const COMPILER = IDE ? compilerExe(IDE) : null;
const SHOW = wantShow({ show: values.show, hide: values.hide });

// ------------------------------------------------------------ the universe
// The compiler's token table is parsed by lib/attribute-sweep.mjs's parseTokenRun; this reads
// the binary it is in.
function readTokenTable(ide) {
  const dll = path.join(path.dirname(ide), "bin", "twinBASIC_win32.dll");
  if (!existsSync(dll)) return { tokens: [], why: `no ${dll}` };
  return parseTokenRun(readFileSync(dll).toString("latin1"));
}

const docEntries = parseAttributes(readFileSync(ATTR_DOC, "utf8"));

const universe = new Map(); // name -> { name, doc, token }
for (const e of docEntries) universe.set(e.name, { name: e.name, doc: e, token: false });
let tokenNote = null;
if (!values.noTokens && IDE && existsSync(IDE)) {
  const { tokens, why } = readTokenTable(IDE);
  if (why) tokenNote = why;
  // Matched to the page's spelling in any case, so `Comexport` is not probed as
  // an undocumented name beside the documented `ComExport`.
  const byLower = new Map([...universe.keys()].map((k) => [k.toLowerCase(), k]));
  for (const t of tokens) {
    const known = byLower.get(t.toLowerCase());
    if (known) universe.get(known).token = true;
    else { universe.set(t, { name: t, doc: null, token: true }); byLower.set(t.toLowerCase(), t); }
  }
}
if (opt.names) {
  const byLower = new Map([...universe.keys()].map((k) => [k.toLowerCase(), k]));
  const wanted = new Set();
  for (const n of opt.names) {
    const known = byLower.get(n.toLowerCase());
    if (known) wanted.add(known);
    else { universe.set(n, { name: n, doc: null, token: false }); wanted.add(n); }
  }
  for (const n of [...universe.keys()]) if (!wanted.has(n)) universe.delete(n);
}
const SITES = SITE_LIST.filter((s) => !opt.sites || opt.sites.includes(s.id));

// ------------------------------------------------------------------ probes
/** @typedef {{id:number, kind:string, name:string|null, site:object, form:string, attr:string|null, tag:string}} Probe */
let nextId = 1;
function makeProbe(kind, site, name, form) {
  const id = nextId++;
  const tag = `S${pad(id, 6)}`;
  let attr = null;
  if (name !== null) attr = `[${name}${argsOf(form, name, id)}]`;
  return { id, kind, name, site, form, attr, tag };
}

const siteById = (id) => SITE_LIST.find((s) => s.id === id);
function canariesFor() {
  return CANARY_SPECS.map(([k, siteId, attr]) => {
    const p = makeProbe(`canary:${k}`, siteById(siteId), null, "bare");
    p.attr = attr;
    return p;
  });
}

// Inside a Module, so no reader has to wonder whether a file-level Enum is legal.
const SUPPORT_TWIN =
  "' The enum [TypeHint] names. One shared declaration, so no probe has to carry its own.\n\n" +
  "Public Module SweepSupport\n    Public Enum SweepHintEnum\n        SweepHintValue = 1\n    End Enum\nEnd Module\n";

// What the unknown name draws at each site, filled in by the preflight and read by classify.
const controlSig = new Map();

// ---------------------------------------------------------------- building
let stageCounter = 0;
const workRoot = opt.workRoot;

function stageBatch(probes, lane) {
  const index = stageCounter++;
  const dir = path.join(lane.work, `b${index}`);
  rmSync(dir, { recursive: true, force: true });
  const src = path.join(dir, "Sources");
  mkdirSync(src, { recursive: true });
  const name = `AttrSweep${index}`;
  writeFileSync(path.join(dir, "Settings"), settingsText({
    "project.name": name,
    "project.appTitle": "Attribute sweep",
    "project.description": "Generated by scripts/sweep_attributes.mjs. A diagnostic is an answer, not a defect.",
    // Keyed per batch: two projects sharing an id confuse the IDE's recents list.
    // Role digit 6 is this tool's, after tb-project's 0-2 and check_examples' 4-5.
    "project.id": `{7B247600-0000-4000-9000-7B2476${index.toString(16).padStart(6, "0")}}`,
    // An explicit file, never the ${SourcePath} template: that opens a native
    // Save dialog on the build, invisible on the private desktop, and the build
    // simply never happens while every health check says the IDE is fine.
    "project.buildPath": path.join(dir, `${name}.exe`).split("/").join("\\"),
  }), "utf8");
  const crlf = (t) => t.replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n");
  const put = (file, text) => writeFileSync(path.join(src, file), crlf(text), "utf8");
  put("_ProbeMain.twin", MAIN_TWIN);
  put("_ProbeFactory.twin", PROBE_FACTORY_TWIN);
  put("_ProbeSupport.twin", SUPPORT_TWIN);
  // `import` packs the whole tree, so what [CustomControl] and [PopulateFrom]
  // point at has to be in it before the pack.
  writeProbeResourcesSync(dir);
  const files = new Map();
  for (const p of probes) {
    put(`${p.tag}.twin`, renderSite(p.site, p.tag, p.attr));
    files.set(`${p.tag}.twin`.toLowerCase(), p);
  }
  const proj = path.join(lane.work, `b${index}.twinproj`);
  // Windows paths throughout: the compiler prefixes \\?\, which takes no forward slash.
  const pack = runCompiler(COMPILER, ["import", proj.split("/").join("\\"), dir.split("/").join("\\"), "--overwrite"]);
  if (!pack.done) throw new Error(`packing failed${pack.why}:\n${pack.tail}`);
  return { proj, dir, files };
}


/**
 * One build of `probes` plus the canaries.
 *
 * Returns { kind: "ok", byFile, strays, canaries } where `byFile` maps a probe to
 * its parsed rows, { kind: "crash", named } / { kind: "hung" }, or
 * { kind: "harness", why } when the build could not be run twice running.
 */
async function buildOnce(probes, lane) {
  const all = [...probes, ...canariesFor()];
  let staged;
  let r;
  for (let attempt = 0; ; attempt++) {
    try {
      staged = stageBatch(all, lane);
      r = await compileProject({
        project: staged.proj, ide: IDE, port: lane.port, show: SHOW,
        ...(opt.timeout ? { timeout: opt.timeout * 1000 } : {}),
      });
    } catch (e) {
      r = { code: 2, message: e.message, rows: [], crashFiles: [] };
    }
    if (staged && !values.keep) rmSync(staged.dir, { recursive: true, force: true });
    if (staged && !values.keep) rmSync(staged.proj, { force: true });
    if (r.code === 0 || r.code === 1 || r.code === 3 || r.code === 4) break;
    if (attempt === 1 || !staged) return { kind: "harness", why: `tbbuild exited ${r.code}: ${r.message.split("\n")[0]}` };
    await sleep(3000);
  }
  if (r.code === 4) {
    const named = new Set();
    for (const f of r.crashFiles) {
      const p = staged.files.get(f.trim().split(/[\\/]/).pop().toLowerCase());
      if (p && !p.kind.startsWith("canary")) named.add(p.id);
    }
    return { kind: "crash", named };
  }
  if (r.code === 3) return { kind: "hung" };
  const { byFile, strays } = sortRows(r.rows, staged.files, all);
  const canaries = {};
  for (const p of all) if (p.kind.startsWith("canary:")) canaries[p.kind.slice(7)] = classify(p, byFile.get(p), controlSig).state;
  for (const p of all) if (p.kind.startsWith("canary:")) byFile.delete(p);
  return { kind: "ok", byFile, strays, canaries };
}


// The isolating runner is in lib/attribute-sweep.mjs, with the IDE behind `buildOnce`, so a fake can
// be probed by scripts/check_attribute_sweep.mjs.
const { runSet, stats } = createRunner({ buildOnce, controlSig, say });

/** Run batches over `jobs` lanes; resolves the union of their outcomes. */
async function runAll(probes, label) {
  const results = new Map();
  let done = 0;
  const queue = makeBatches(probes, opt.batchSize);
  const lanes = Array.from({ length: Math.min(opt.jobs, queue.length) }, async (_, i) => {
    const work = path.join(workRoot, `lane${i}`);
    mkdirSync(work, { recursive: true });
    const lane = { port: opt.basePort + i, work };
    while (queue.length && !stats.cutShort) {
      const batch = queue.shift();
      try {
        for (const [k, v] of await runSet(batch, lane)) results.set(k, v);
      } catch (e) {
        // One lane's failure does not take the others' work with it: the run
        // stops taking batches, the lanes settle, and what is known is reported.
        stats.cutShort ??= e.message;
        for (const p of batch) if (!results.has(p.id)) results.set(p.id, { state: "HARNESS", codes: [], msgs: [e.message] });
      }
      done += batch.length;
      say(`  ${label}: ${done}/${probes.length} probes (lane ${i})`);
    }
  });
  await Promise.allSettled(lanes);
  return results;
}

// -------------------------------------------------------------- the sweep
const outcomeOf = new Map(); // probe id -> outcome
const probeOf = new Map();   // probe id -> probe
const voidSites = new Map(); // site id -> why
const controlState = new Map(); // site id -> { state, codes }

function register(probes) { for (const p of probes) probeOf.set(p.id, p); return probes; }

function planStage1() {
  const list = [];
  for (const u of universe.values()) {
    for (const key of stage1Forms(u, opt.forms)) {
      for (const s of SITES) if (!voidSites.has(s.id)) list.push(makeProbe("attr", s, u.name, key));
    }
  }
  return register(list);
}

function planStage2() {
  if (opt.forms !== "smart") return [];
  const bare = new Map();
  for (const p of probeOf.values()) if (p.kind === "attr" && p.form === "bare") bare.set(`${p.name}|${p.site.id}`, p);
  const list = [];
  for (const u of universe.values()) {
    if (u.doc) continue; // documented names already had every form
    const seen = SITES.some((s) => {
      const p = bare.get(`${u.name}|${s.id}`);
      return p && recognised(outcomeOf.get(p.id)?.state);
    });
    if (!seen) continue;
    for (const key of stage2Forms(u)) {
      for (const s of SITES) if (!voidSites.has(s.id)) list.push(makeProbe("attr", s, u.name, key));
    }
  }
  return register(list);
}

/**
 * The checks that come before any answer is believed: the canaries alone, then
 * every site with no attribute and with an unknown one.
 */
async function preflight() {
  const lane = { port: opt.basePort, work: path.join(workRoot, "lane0") };
  mkdirSync(lane.work, { recursive: true });

  // The canaries beside nothing. They must draw what this file records, or every
  // later check is measuring against the wrong thing. A refusal here means the
  // compiler changed, or a support file is broken, and either needs a person.
  stats.builds++;
  const c = await buildOnce([], lane);
  if (c.kind !== "ok") die(EXIT_ERROR, `the canary-only build ${c.kind === "harness" ? c.why : c.kind === "crash" ? "crashed the compiler" : "never settled"}`);
  if (!canaryOk(c.canaries)) {
    die(EXIT_ERROR, `the canaries draw ${JSON.stringify(c.canaries)} on their own, and this file records ${JSON.stringify(EXPECTED_CANARIES)}.\n` +
      "If the compiler has changed, check by hand what `[Description]` on a Module, `[Hidden]` on an Interface line in a\n" +
      "CoClass and an invented name each draw, then update EXPECTED_CANARIES; do not just copy what was drawn.");
  }
  if (c.strays.length) die(EXIT_ERROR, `the template project draws error rows of its own, so no batch can be attributed:\n${c.strays.join("\n")}`);

  const base = register(SITES.map((s) => makeProbe("baseline", s, null, "bare")));
  const ctrl = register(SITES.map((s) => makeProbe("control", s, CONTROL_NAME, "bare")));
  say(`preflight: ${base.length} baselines, ${ctrl.length} controls`);
  for (const p of ctrl) p.attr = `[${CONTROL_NAME}]`;
  for (const [k, v] of await runSet([...base, ...ctrl], lane)) outcomeOf.set(k, v);
  const verdict = judgePreflight(base, ctrl, outcomeOf);
  for (const [k, v] of verdict.voidSites) voidSites.set(k, v);
  for (const [k, v] of verdict.controlState) controlState.set(k, v);
  for (const [k, v] of verdict.controlSig) controlSig.set(k, v);
}

// ------------------------------------------------------------------ report

function report(agg, dep, meta) {
  const L = [];
  const a = (s = "") => L.push(s);
  a(`# Attribute sweep -- BETA ${meta.build}`);
  a();
  if (meta.incomplete) {
    a(`> **INCOMPLETE.** The run was cut short: ${meta.incomplete}. Probes not built are shown as HARNESS or absent, and nothing below is a complete answer.`);
    a();
  }
  a(`${meta.attrProbes} attribute probes over ${agg.size} names and ${SITES.length - voidSites.size} of ${SITES.length} sites ` +
    `(${voidSites.size} voided), ${stats.builds} builds, ${stats.splits} splits. ` +
    `Forms: \`${opt.forms}\`. Compared against \`Reference/Attributes.md\` (${docEntries.length} entries).`);
  a();
  a("A clean build says the compiler ACCEPTS the attribute there. It does not say the attribute does anything, or that it survives a full build.");
  a();
  a("## Self-checks");
  a();
  a(`- The canaries drew \`${JSON.stringify(EXPECTED_CANARIES)}\` alone, as this tool records, and ` +
    `${stats.canaryFails} batch(es) drew otherwise and were split.`);
  if (meta.verify) {
    a(`- \`--verify ${meta.verify.n}\`: ${meta.verify.bad.length} of ${meta.verify.n} probes answered differently on a rebuild` +
      (meta.verify.unjudged ? `, and ${meta.verify.unjudged} could not be rebuilt to a conclusive answer, which says nothing either way.` : "."));
  }
  a(`- ${dep.multi} (name, site) cells were tried with two or more argument shapes (not counting \`false\`); ` +
    (dep.list.length
      ? `**${dep.list.length} of them changed the placement answer** -- listed at the end, and a token-table name tried bare only is not safe from this.`
      : "none changed the placement answer. That covers the names tried with several shapes; a token-table name no site recognised was tried bare only."));
  if (stats.crashes.length) a(`- **${stats.crashes.length} probe(s) crash the compiler** -- see below; report them in BUGS-TO-REPORT.md.`);
  if (stats.hung.length) a(`- **${stats.hung.length} probe(s) never settled.**`);
  if (stats.comboCrashes.length) a(`- **${stats.comboCrashes.length} crash(es) or hang(s) need several probes together** -- see below.`);
  if (stats.interferes.length) a(`- **${stats.interferes.length} probe(s) each change what the canaries draw** -- shown as INTERFERES.`);
  if (stats.harness.length) a(`- **${stats.harness.length} build(s) could not be run**; their probes are HARNESS.`);
  if (stats.strays.length) a(`- ${stats.strays.length} error row(s) belong to no probe's file -- see below.`);
  if (tokenNote) a(`- The token table was not read: ${tokenNote}.`);
  a();

  a("## Sites");
  a();
  a("| site | what | control (unknown name) | status |");
  a("|---|---|---|---|");
  for (const s of SITES) {
    const c = controlState.get(s.id);
    a(`| \`${s.id}\` | ${s.human} | ${c ? `${c.state} ${c.codes.join(",")}` : "--"} | ${voidSites.has(s.id) ? `**voided**: ${voidSites.get(s.id)}` : "ok"} |`);
  }
  a();

  const docNames = [...agg.keys()].filter((n) => universe.get(n)?.doc);
  const newNames = [...agg.keys()].filter((n) => !universe.get(n)?.doc);

  a("## Documented attributes: where the page and the compiler disagree");
  a();
  let disagreements = 0;
  const agree = [];
  const agreeSome = [];
  const notFaithful = [];
  for (const name of docNames) {
    const u = universe.get(name);
    const c = compare(u, agg.get(name));
    if (!c) continue;
    if (c.unfaithful) { notFaithful.push([name, c.unfaithful]); continue; }
    const bits = [];
    if (!c.hasLine) bits.push("**no `Applicable to:` line**");
    for (const m of c.missing) {
      bits.push(`documented target \`${m.target}\` is **refused** at ${m.sites.map((s) => `\`${s}\``).join(", ")}` +
        (m.soft.length ? ` (recognised, but with an error, at ${m.soft.map((s) => `\`${s}\``).join(", ")})` : ""));
    }
    for (const p of c.partial) {
      bits.push(`documented target \`${p.target}\` holds only partly: accepted at ${p.yes.map((s) => `\`${s}\``).join(", ")}; ` +
        `**refused** at ${p.no.map((s) => `\`${s}\``).join(", ")}`);
    }
    if (c.extra.length) bits.push(`**accepted but not documented**: ${c.extra.map((s) => `\`${s}\``).join(", ")}`);
    if (c.extraSoft.length) bits.push(`recognised, with an error, at sites not documented: ${c.extraSoft.map((s) => `\`${s}\``).join(", ")}`);
    if (!bits.length) { (c.untestable.length ? agreeSome : agree).push(name); }
    if (bits.length || c.untestable.length) {
      if (bits.length) disagreements++;
      a(`### \`[${name}]\` (Attributes.md:${u.doc.line})`);
      a();
      a(`Documented: ${u.doc.app ?? "*nothing*"}`);
      a();
      for (const b of bits) a(`- ${b}`);
      for (const b of c.untestable) a(`- **not testable**, so not counted as agreeing -- ${b}`);
      a();
    }
  }
  a(`${disagreements} of ${docNames.length} documented attributes disagree. ` +
    `${agree.length} agree on every target: ${agree.map((n) => `\`${n}\``).join(", ") || "none"}. ` +
    `${agreeSome.length} agree on what could be tested but have a target that could not be: ${agreeSome.map((n) => `\`${n}\``).join(", ") || "none"}.`);
  a();
  if (notFaithful.length) {
    a("Not compared, because a generic skeleton cannot probe them faithfully (the reason gen_attribute_probes.mjs records):");
    a();
    for (const [n, why] of notFaithful) a(`- \`[${n}]\` -- ${why}`);
    a();
  }

  a("## Names in the compiler's token table that the page does not document");
  a();
  const placed = newNames.filter((n) => [...agg.get(n).values()].some((c) => recognised(c.state)));
  const unplaced = newNames.filter((n) => !placed.includes(n));
  if (placed.length) {
    a("Recognised at a site, so **candidates for a new entry** (accepted, or recognised with an error):");
    a();
    for (const n of placed) {
      const cells = [...agg.get(n)].filter(([, c]) => recognised(c.state));
      a(`- \`[${n}]\`: ` + cells.map(([s, c]) => `\`${s}\` ${c.state}${soft(c.state) ? ` (${[...c.msgs].slice(0, 1).join("")})` : ""}` +
        ` via ${Object.entries(c.forms).filter(([, st]) => recognised(st)).map(([k]) => k).join("/")}`).join("; "));
    }
  } else a("None was recognised at any site.");
  a();
  a(`${unplaced.length} further name(s) were refused at every site, in every form tried. They are keywords, object members, ` +
    "or attributes for a site this matrix lacks: " + (unplaced.map((n) => `\`${n}\``).join(" ") || "none") + ".");
  a();

  // A name taken almost everywhere is more likely a name the parser skips than
  // an attribute that applies to everything.
  const suspect = [...agg].filter(([, m]) => {
    const probed = [...m.values()].filter((c) => !inconclusive(c.state));
    const yes = probed.filter((c) => firm(c.state)).length;
    return probed.length >= 15 && yes / probed.length >= 0.6;
  }).map(([n, m]) => `\`${n}\` (${[...m.values()].filter((c) => firm(c.state)).length} of ${m.size})`);
  if (suspect.length) {
    a("## Accepted at most sites");
    a();
    a("Accepted at 60% or more of the sites tried. Either the attribute applies nearly everywhere, or the parser skips what it does not know here; " +
      `read the control column above before believing it: ${suspect.join(", ")}.`);
    a();
  }

  if (dep.list.length) {
    a("## Argument shape changed the placement answer");
    a();
    for (const d of dep.list) a(`- \`[${d.name}]\` at \`${d.site}\`: taken with ${d.takes.join(", ")}; refused with ${d.refuses.join(", ")}`);
    a();
  }
  if (stats.crashes.length || stats.hung.length || stats.comboCrashes.length) {
    a("## Compiler crashes and hangs");
    a();
    for (const p of stats.crashes) a(`- crash: \`${p.attr}\` at \`${p.site.id}\``);
    for (const p of stats.hung) a(`- never settled: \`${p.attr}\` at \`${p.site.id}\``);
    for (const s of stats.comboCrashes) a(`- ${s}`);
    a();
  }
  if (stats.strays.length) {
    a("## Error rows outside every probe's file");
    a();
    a("Each was caused by the single probe named, which is shown as RECOGNISED.");
    a();
    for (const s of stats.strays.slice(0, 50)) a(`- ${s}`);
    a();
  }
  if (stats.harness.length || stats.interferes.length) {
    a("## Builds that could not be judged");
    a();
    for (const s of stats.harness) a(`- ${s}`);
    for (const p of stats.interferes) a(`- \`${p.attr}\` at \`${p.site.id}\` changes what the canaries draw`);
    a();
  }

  a("## Full matrix, documented attributes");
  a();
  a("`A` accepted, `a` accepted after a later error, `e` recognised, the declaration then erred, `R` recognised with an error on the attribute, `.` refused, `!` crash, hang or harness failure, `-` voided.");
  a();
  const ids = SITES.map((s) => s.id);
  a(`| attribute | ${ids.join(" | ")} |`);
  a(`|---|${ids.map(() => "---").join("|")}|`);
  const glyph = {
    ACCEPT: "A", ACCEPT_LATER: "a", ACCEPT_ERR: "e", RECOGNISED: "R", REJECT_CONTEXT: ".", REJECT_SYNTAX: ".",
    CRASH: "!", HUNG: "!", HARNESS: "!", INTERFERES: "!", VOID: "-",
  };
  for (const name of docNames) {
    const bySite = agg.get(name);
    a(`| \`${name}\` | ${ids.map((s) => (voidSites.has(s) ? "-" : glyph[bySite.get(s)?.state ?? "VOID"])).join(" | ")} |`);
  }
  a();
  return L.join("\n") + "\n";
}

/** Write the report and the JSON from whatever is known, complete or not. */
/** The crash handler's cleanup: the report of what the run had learned, and the registry put back. */
function salvage(err) {
  if (outcomeOf.size) emit(run.build, run.verify, `a crash: ${err?.message ?? err}`);
  finishTidy(tidy);
}

function emit(build, verify, incomplete) {
  const agg = aggregate(probeOf.values(), outcomeOf);
  const dep = formDependence(agg);
  const attrProbes = [...probeOf.values()].filter((p) => p.kind === "attr").length;
  const text = report(agg, dep, { build, attrProbes, verify, incomplete });
  if (values.out) writeFileSync(values.out, text, "utf8"); else process.stdout.write(text);
  if (values.dumpResults) {
    writeFileSync(values.dumpResults, JSON.stringify({
      build, forms: opt.forms, incomplete: incomplete ?? null, canaries: EXPECTED_CANARIES,
      voidSites: Object.fromEntries(voidSites),
      controls: Object.fromEntries([...controlState].map(([k, v]) => [k, { state: v.state, codes: v.codes, msgs: v.msgs }])),
      results: Object.fromEntries([...agg].map(([n, m]) => [n, Object.fromEntries([...m].map(([s, c]) => [s, {
        state: c.state, forms: c.forms, codes: [...c.codes], msgs: [...c.msgs],
      }]))])),
      crashes: stats.crashes.map((p) => ({ attr: p.attr, site: p.site.id })),
      hung: stats.hung.map((p) => ({ attr: p.attr, site: p.site.id })),
      interferes: stats.interferes.map((p) => ({ attr: p.attr, site: p.site.id })),
      comboCrashes: stats.comboCrashes, strays: stats.strays, harness: stats.harness,
      formDependence: dep.list, verify,
    }, null, 2), "utf8");
  }
}

// -------------------------------------------------------------------- main
async function main() {
  const build = IDE ? buildNumber(IDE) ?? "?" : "?";
  run.build = build;
  say(`sweep: ${universe.size} names (${[...universe.values()].filter((u) => u.doc).length} documented), ` +
    `${SITES.length} sites, BETA ${build}`);
  if (values.dryRun) {
    let n = 0;
    for (const u of universe.values()) n += stage1Forms(u, opt.forms).length * SITES.length;
    console.log(`stage 1: ${n} probes in ${Math.ceil(n / opt.batchSize)} or more batches of ${opt.batchSize}, ` +
      `${opt.jobs} lane(s); the canaries ride in every batch, and stage 2 adds more for token-table names some site recognises`);
    return 0;
  }
  const started = Date.now();
  mkdirSync(workRoot, { recursive: true });
  tidy = startTidy({ prefixes: [workRoot] });
  let verify = null;
  try {
    await preflight();
    if (values.preflight) {
      for (const [id, why] of voidSites) console.log(`voided ${id}: ${why}`);
      console.log(`canaries: ${JSON.stringify(EXPECTED_CANARIES)}; ${SITES.length - voidSites.size} of ${SITES.length} sites usable`);
      finishTidy(tidy);
      return 0;
    }
    const s1 = planStage1();
    say(`stage 1: ${s1.length} probes`);
    for (const [k, v] of await runAll(s1, "stage 1")) outcomeOf.set(k, v);
    if (!stats.cutShort) {
      const s2 = planStage2();
      if (s2.length) {
        say(`stage 2: ${s2.length} probes for names some site recognised`);
        for (const [k, v] of await runAll(s2, "stage 2")) outcomeOf.set(k, v);
      }
    }

    if (opt.verify && !stats.cutShort) {
      const pool = [...probeOf.values()].filter((p) => p.kind === "attr" && outcomeOf.get(p.id)
        && !inconclusive(outcomeOf.get(p.id).state));
      const pick = [];
      while (pick.length < Math.min(opt.verify, pool.length)) {
        pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      }
      // A second identity, so the rebuild is a different file in a different
      // batch beside different companions: sameness cannot come from caching.
      const again = register(pick.map((p) => makeProbe("verify", p.site, p.name, p.form)));
      const got = await runAll(again, "verify");
      const { bad, unjudged } = verifyMismatches(pick, again, got, outcomeOf);
      verify = { n: pick.length, bad, unjudged };
      run.verify = verify;
    }

    emit(build, verify, stats.cutShort);
    say(`done in ${Math.round((Date.now() - started) / 1000)} s`);
    finishTidy(tidy);
    // A run cut short could not do its job (2), though its report is written; a
    // self-check that found a fault is a finding (1).
    if (stats.cutShort) return EXIT_ERROR;
    return stats.interferes.length || (verify && verify.bad.length) ? EXIT_FOUND : 0;
  } catch (e) {
    // Whatever was learned is still worth having: a cut-short run says so at the
    // top of the report rather than leaving nothing.
    console.error(e.stack ?? e.message);
    try { if (outcomeOf.size) emit(build, verify, e.message); } catch (e2) { console.error(`the report could not be written: ${e2.message}`); }
    finishTidy(tidy);
    return EXIT_ERROR;
  }
}

let code = EXIT_ERROR;
try {
  code = await main();
} catch (e) {
  console.error(e.stack ?? e.message);
  finishTidy(tidy);
  code = EXIT_ERROR;
}
// Explicit, as census_attributes and gen_attribute_probes end: the markdown
// parser Attributes.md is read with keeps the event loop alive.
process.exit(code);
