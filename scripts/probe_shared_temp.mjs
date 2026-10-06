#!/usr/bin/env node
// Measure whether twinBASIC builds that share one TEMP folder fail to write the type library.
//
//     node scripts/probe_shared_temp.mjs [options]
//
// The defect is the entry of BUGS-TO-REPORT.md whose reproducer is
// bugs/concurrent-builds-shared-temp/: several IDEs building at once with one
// TEMP folder now and then fail with `[TYPELIB] failed to finalize
// typelibrary.  Disk error?`, then `[LINKER] FAILED to create type library` and
// `[BUILD] failed`. The reproducer needs eight IDEs at once, which bug_repro
// cannot run, so this probe runs them.
//
// Each round starts --ides IDEs at once, one cold start each (an IDE reused for
// a second project wedges), each on a project of its own packed from the
// reproducer's source. Every IDE compiles its project, then all wait for each
// other, so that Build is pressed in all of them at about the same moment, as the
// reproducer's step 3 asks. The build log of each is read and a build that failed
// is classified by it.
//
// The harness gives every IDE a temp folder of its own (launchIde). The probe
// takes that back for the run it measures: TEMP and TMP of every IDE are one
// folder made for the run, passed in launchIde's `env`. --control leaves the
// harness's own folders in place, which is the control of the reproducer's step 4.
//
// compileProject (lib/tb-build.mjs) has no `env`, so the probe does its steps
// itself, in the order compileProject does them, over the same library calls.
//
// Exit codes: see USAGE.
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { die, exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { buildNumber, findIde } from "./lib/tb-install.mjs";
import {
  attachIde,
  buildProject,
  compileOutcome,
  launchIde,
  setBuildTarget,
  shutdownIdeAsync,
  waitForCompile,
} from "./lib/tb-ide.mjs";
import { claimPorts } from "./lib/tb-ports.mjs";
import { laneProjectId, stageProject } from "./lib/tb-project.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

let tidy = null;
let work = null;
function cleanUp() {
  finishTidy(tidy);
  tidy = null;
  if (work) {
    try {
      rmSync(work, { recursive: true, force: true });
    } catch {
      // a file still held open; the next run on this port empties the folder
    }
    work = null;
  }
}
exitOnCrash(cleanUp);

const USAGE = `usage: node scripts/probe_shared_temp.mjs [--ides N] [--rounds R] [--control] [--all] [--ide <twinBASIC.exe>] [--port N] [--timeout S] [-h, --help]

Starts N twinBASIC IDEs at once, each building its own copy of the project of
bugs/concurrent-builds-shared-temp/, with one TEMP folder for all of them, and
counts the builds that fail to write the type library. It prints one line per
round, the last console lines of every build that failed, and a summary line
\`<f> of <n> builds failed to write the type library (TEMP shared|TEMP per IDE)\`.

  --ides <n>        IDEs at once (default 8)
  --rounds <r>      rounds of one build in each IDE (default 24)
  --control         give each IDE a TEMP folder of its own, instead of one folder
                    for all of them: the control, which is expected to fail none
  --all             run every round; by default the probe stops after the round
                    in which it first sees a type library fail
  --ide <path>      twinBASIC.exe (default: $TB_IDE, else the newest
                    twinBASIC_IDE_BETA_* on the Desktop)
  --port <n>        first DevTools port to try (default 9760); the IDEs take the
                    first free ports from it
  --timeout <secs>  give up waiting for a compile, and again for a build (default 180)
  -h, --help        print this text and exit

Exit codes:
  0  no build failed to write the type library
  1  at least one build did: the defect is there
  2  the probe could not do its job: a refused command line, no IDE, no free
     ports, an IDE that did not start, a project that did not compile, a build
     that failed in some other way, or a crash`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

const { values } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        ides: { type: "string" },
        rounds: { type: "string" },
        control: { type: "boolean", default: false },
        all: { type: "boolean", default: false },
        ide: { type: "string" },
        port: { type: "string" },
        timeout: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

const { ides, rounds, port, timeout } = withUsageError(
  () => ({
    ides: numberOption(values.ides ?? "8", { option: "--ides", integer: true, min: 1, max: 32 }),
    rounds: numberOption(values.rounds ?? "24", { option: "--rounds", integer: true, min: 1 }),
    port: numberOption(values.port ?? "9760", { option: "--port", integer: true, min: 1, max: 65535 }),
    timeout: numberOption(values.timeout ?? "180", { option: "--timeout", above: 0 }) * 1000,
  }),
  usageError,
);
const control = values.control;
const runAll = values.all;

const IDE = findIde(values.ide);
if (!IDE || !existsSync(IDE)) {
  die(
    2,
    (IDE ? `no twinBASIC IDE at ${IDE}: ` : "no twinBASIC IDE found: ") +
      "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
}

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(REPO, "bugs", "concurrent-builds-shared-temp", "src");
if (!existsSync(path.join(SOURCE, "Settings"))) die(2, `the reproducer's source is missing: ${SOURCE}`);

// What the build log says when the type library is the part that failed.
const TYPELIB_FAILED = /\[TYPELIB\] failed|FAILED to create type library/;
const label = control ? "TEMP per IDE" : "TEMP shared";

// All the lanes wait here once they have compiled, so that Build is pressed in
// all of them together. A lane that never gets there is dropped, or the rest
// would wait for it for ever.
function makeBarrier(count) {
  let expected = count;
  let waiting = [];
  const release = () => {
    if (waiting.length < expected) return;
    const open = waiting;
    waiting = [];
    for (const resolve of open) resolve();
  };
  return {
    arrive: () =>
      new Promise((resolve) => {
        waiting.push(resolve);
        release();
      }),
    drop: () => {
      expected--;
      release();
    },
  };
}

/**
 * One build in a cold-started IDE.
 *
 * @returns {Promise<{kind: "ok" | "typelib" | "other", log: string[], message: string}>}
 */
async function buildOnce({ project, lanePort, env, barrier }) {
  let handle = null;
  let c = null;
  let arrived = false;
  const fail = (message, log = []) => ({ kind: "other", log, message });
  try {
    try {
      handle = await launchIde({ exe: IDE, project, port: lanePort, env });
    } catch (e) {
      return fail(e.message);
    }
    c = await attachIde(lanePort);
    if (!c) return fail("the IDE never exposed a debug port");

    let outcome = compileOutcome(await waitForCompile(c, { project, timeout }), { name: project });
    if (!outcome.ok) return fail(outcome.message);
    try {
      const target = await setBuildTarget(c, "win32", { project, timeout });
      if (target.waited) {
        outcome = compileOutcome(target.waited, { name: project });
        if (!outcome.ok) return fail(outcome.message);
      }
    } catch (e) {
      return fail(e.message);
    }
    if (outcome.counts[0] > 0)
      return fail(`the project compiled with ${outcome.counts[0]} error(s):\n${outcome.rows.join("\n")}`);

    arrived = true;
    await barrier.arrive();
    const built = await buildProject(c, { timeout });
    if (built.ok) return { kind: "ok", log: built.log, message: "" };
    if (built.log.some((l) => TYPELIB_FAILED.test(l)))
      return { kind: "typelib", log: built.log, message: built.message };
    return fail(built.message, built.log);
  } catch (e) {
    return fail(e.stack ?? String(e));
  } finally {
    if (!arrived) barrier.drop();
    try {
      c?.close();
    } catch {
      // the IDE is about to be ended
    }
    await shutdownIdeAsync(handle);
  }
}

// ----------------------------------------------------------------- the run

let ports;
try {
  ports = await claimPorts(ides, { from: port });
} catch (e) {
  die(2, e.message);
}

work = path.join(tmpdir(), "tbprobe-shared-temp", String(ports[0]));
rmSync(work, { recursive: true, force: true });
const sharedTemp = path.join(work, "shared-temp");
mkdirSync(sharedTemp, { recursive: true });
tidy = startTidy({ prefixes: [work] });

console.log(
  `BETA ${buildNumber(IDE) ?? "?"}: ${ides} IDE(s) at once, up to ${rounds} round(s), ` +
    (control ? "a TEMP folder for each IDE" : `one TEMP folder for all: ${sharedTemp}`),
);

const t0 = Date.now();
let builds = 0;
let typelibFailures = 0;
const others = [];

try {
  for (let round = 1; round <= rounds; round++) {
    const projects = ports.map((lanePort) => {
      const lane = path.join(work, String(lanePort));
      const out = path.join(lane, "out");
      mkdirSync(out, { recursive: true });
      const project = path.join(lane, "probe.twinproj");
      stageProject({
        src: SOURCE,
        stage: path.join(lane, "stage"),
        project,
        settings: {
          "project.buildPath": path.join(out, "${ProjectName}_${Architecture}.${FileExtension}"),
          "project.id": laneProjectId(6, lanePort),
        },
      });
      return project;
    });
    const env = control ? {} : { TEMP: sharedTemp, TMP: sharedTemp };
    const barrier = makeBarrier(ides);
    const results = await Promise.all(
      projects.map((project, i) => buildOnce({ project, lanePort: ports[i], env, barrier })),
    );

    builds += results.length;
    const failed = results.map((r, i) => ({ ...r, port: ports[i] })).filter((r) => r.kind === "typelib");
    typelibFailures += failed.length;
    console.log(`round ${round}: ${failed.length} failed`);
    for (const r of failed) {
      console.log(`  IDE on port ${r.port}, round ${round}:`);
      for (const l of r.log.slice(-8)) console.log(`    ${l}`);
    }
    results.forEach((r, i) => {
      if (r.kind === "other") others.push({ round, port: ports[i], ...r });
    });
    if (others.length) break;
    if (failed.length && !runAll) break;
  }
} finally {
  cleanUp();
}

const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`(${secs} s)`);
for (const o of others) {
  console.error(`round ${o.round}, port ${o.port}: a build failed in another way:\n${o.message}`);
  for (const l of o.log.slice(-8)) console.error(`    ${l}`);
}
console.log(`${typelibFailures} of ${builds} builds failed to write the type library (${label})`);
process.exit(others.length ? 2 : typelibFailures ? 1 : 0);
