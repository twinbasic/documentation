#!/usr/bin/env node
// Measures the build: how long tbdocs takes, where in the build the time is,
// and what one part of it costs alone. For work on the build's speed
// (WIP.BuildSpeed.md); it is not a gate, and nothing runs it.
//
//   node scripts/build_speed.mjs bench [--tree <dir>]... [--runs <n>] [--cpus all,4] [--task a,b] [--out <dir>]
//   node scripts/build_speed.mjs serve [--tree <dir>]... [--builds <n>] [--task a,b] [--out <dir>]
//   node scripts/build_speed.mjs times <gantt.svg>... [--task a,b]
//   node scripts/build_speed.mjs png <gantt.svg>...
//   node scripts/build_speed.mjs profile <file.cpuprofile> --fn <name,name> [--depth <n>]
//   node scripts/build_speed.mjs part <name> [--tree <dir>] [--file <file>]
//
// bench builds each tree as build.bat does, in turn, --runs times: on every CPU
// and on the first four, which is the nearest thing this machine has to a CI
// runner. serve builds each tree several times on one pool of lanes, as
// `tbdocs --serve` rebuilds: the first build is cold, the rest are rebuilds.
// Both keep each build's Gantt chart (and bench its log) under --out, print one
// line for each build, and end with the range of each figure over the runs: one
// build's total says little on a machine that is doing other things.
//
// A tree is a checkout: this one by default, and a second --tree is how a branch
// is compared with its base (the main checkout while a worktree is ahead of it,
// or a detached worktree of the commit, given a node_modules junction). The
// trees are built in turn within each run, so that what else the machine is
// doing falls on both. bench builds a tree in place, as build.bat would.
//
// The times come from the chart (scripts/build-speed/chart.mjs): the build
// writes no timings file. `times` reads charts kept from earlier runs, and
// `png` renders them to PNG files beside them, to look at.
//
// profile gives the inclusive time of named functions in a profile taken with
//   node --cpu-prof --cpu-prof-interval 100 builder/tbdocs.mjs --src docs
// where the main thread's file is the one whose name ends .0.001.cpuprofile. A
// profile inflates code that runs once; for the parts of one task, marks
// printed to stderr are the better tool.
//
// part times one part of the build alone on one thread, with the modules of
// the tree it is given (scripts/build-speed/parts.mjs).
//
// Exit codes: 0 done; 1 a build failed; 2 a refused command line, or a crash.

import { spawnSync } from "node:child_process";
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CliError, exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { chartLine, range, readChart } from "./build-speed/chart.mjs";
import { PARTS, runPart } from "./build-speed/parts.mjs";
import { formatTrees, profileTrees } from "./build-speed/profile.mjs";

exitOnCrash();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_ARGS = ["builder/tbdocs.mjs", "--src", "docs", "--check-audit-index"];
const CHART_REL = "assets/images/gantt.svg";

const USAGE = `usage: node scripts/build_speed.mjs <command> [options]

  bench    build each tree --runs times, on every CPU and on four; keep each log and chart
             [--tree <dir>]... [--runs <n>] [--cpus all,4] [--task a,b] [--out <dir>]
  serve    build each tree --builds times on one pool, as tbdocs --serve rebuilds
             [--tree <dir>]... [--builds <n>] [--task a,b] [--out <dir>]
  times    the times in charts kept from earlier runs
             <gantt.svg>... [--task a,b]
  png      render charts to PNG files beside them
             <gantt.svg>...
  profile  the inclusive time of named functions in a node --cpu-prof profile
             <file.cpuprofile> --fn <name,name> [--depth <n>]
  part     one part of the build alone on one thread
             <name> [--tree <dir>] [--file <file>]

  --tree <dir>   a checkout to measure (default: this one); repeat it to compare checkouts
  --runs <n>     builds of each tree at each CPU count (default 3)
  --cpus <list>  CPU counts to build on, "all" or a number (default all,4)
  --builds <n>   builds on the pool, the first of them cold (default 5)
  --task <list>  main-thread tasks whose times to report as well
  --out <dir>    where logs and charts are kept (default .build-speed/ in this checkout)
  --fn <list>    function names to total in the profile
  --depth <n>    levels of callees under each (default 3)
  --file <file>  the file \`part deflate\` deflates
  -h, --help     this text

parts:
${Object.entries(PARTS)
  .map(([name, p]) => `  ${name.padEnd(14)} ${p.about}`)
  .join("\n")}
`;

const usageError = (message) => {
  throw new CliError("usage", message);
};

const { values, positionals } = withUsageError(
  () => {
    const cli = parseCli(process.argv.slice(2), {
      options: {
        tree: { type: "string", multiple: true },
        runs: { type: "string" },
        cpus: { type: "string" },
        builds: { type: "string" },
        task: { type: "string" },
        out: { type: "string" },
        fn: { type: "string" },
        depth: { type: "string" },
        file: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      positionals: { min: 0, max: Infinity },
      stopAt: ["help"],
    });
    if (cli.stopped === "help") printHelpAndExit(USAGE);
    return cli;
  },
  { format: (err) => `build_speed: ${err.message}\n\n${USAGE}` },
);

const list = (text) => (text ? text.split(",").filter(Boolean) : []);
const [command, ...args] = positionals;
const tasks = list(values.task);

// The trees to measure, each with a label for its files: its folder's name, and
// the position as well when two trees have the same one.
function trees() {
  const dirs = (values.tree.length ? values.tree : [ROOT]).map((dir) => path.resolve(dir));
  for (const dir of dirs) {
    if (!existsSync(path.join(dir, "builder", "tbdocs.mjs"))) usageError(`--tree ${dir}: no builder/tbdocs.mjs there`);
  }
  const names = dirs.map((dir) => path.basename(dir));
  return dirs.map((dir, i) => ({
    dir,
    label: names.indexOf(names[i]) === names.lastIndexOf(names[i]) ? names[i] : `${names[i]}-${i + 1}`,
  }));
}

function outDir() {
  const out = path.resolve(values.out ?? path.join(ROOT, ".build-speed"));
  mkdirSync(out, { recursive: true });
  return out;
}

// One build of a tree in a process of its own, on every CPU or on the first
// `cpus` of them, its output in `log`. On Windows the CPUs are given with
// `start /affinity`, which Node's availableParallelism follows; elsewhere with
// taskset. `start` does not pass the build's exit code on, so whether the build
// succeeded is read from the chart: a build writes it last.
function buildOnce(tree, cpus, log) {
  const started = Date.now();
  let status;
  if (cpus === "all") {
    const fd = openSync(log, "w");
    try {
      status = spawnSync(process.execPath, BUILD_ARGS, { cwd: tree.dir, stdio: ["ignore", fd, fd] }).status;
    } finally {
      closeSync(fd);
    }
  } else if (process.platform === "win32") {
    const mask = ((1n << BigInt(cpus)) - 1n).toString(16);
    const line = `start "" /affinity ${mask} /b /wait "${process.execPath}" ${BUILD_ARGS.join(" ")} > "${log}" 2>&1`;
    spawnSync("cmd.exe", ["/d", "/s", "/c", `"${line}"`], { cwd: tree.dir, windowsVerbatimArguments: true });
    status = null;
  } else {
    const fd = openSync(log, "w");
    try {
      status = spawnSync("taskset", ["-c", `0-${cpus - 1}`, process.execPath, ...BUILD_ARGS], {
        cwd: tree.dir,
        stdio: ["ignore", fd, fd],
      }).status;
    } finally {
      closeSync(fd);
    }
  }
  const chart = path.join(tree.dir, "docs", "_site", CHART_REL);
  const fresh = existsSync(chart) && statSync(chart).mtimeMs >= started - 1000;
  const done = /Done in (\d+)ms/.exec(existsSync(log) ? readFileSync(log, "utf8") : "");
  return { ok: fresh && (status === null || status === 0), chart, seconds: done ? Number(done[1]) / 1000 : null };
}

// The figures of one build, from its chart: null where the chart has none.
function figures(svg) {
  const chart = readChart(svg);
  const row = { firstRender: chart.render.start, renderEnds: chart.render.end, ends: chart.end, tasks: {} };
  for (const name of tasks) {
    const bar = chart.task(name);
    row.tasks[name] = bar ? bar.end - bar.start : null;
  }
  return { chart, row };
}

function summary(title, rows) {
  const good = rows.filter((r) => r.ok);
  const parts = [
    `first render ${range(good.map((r) => r.firstRender))}`,
    `render ends ${range(good.map((r) => r.renderEnds))}`,
    `build ends ${range(good.map((r) => r.ends))}`,
    ...tasks.map((name) => `${name} takes ${range(good.map((r) => r.tasks[name]))}`),
  ];
  const failed = rows.length - good.length;
  console.log(`${title}: ${parts.join("; ")}${failed ? `; ${failed} of ${rows.length} builds FAILED` : ""}`);
}

function bench() {
  const runs = numberOption(values.runs ?? "3", { option: "--runs", integer: true, min: 1 });
  const counts = list(values.cpus ?? "all,4").map((c) =>
    c === "all" ? c : numberOption(c, { option: "--cpus", integer: true, min: 1, max: os.availableParallelism() }),
  );
  if (counts.length === 0) usageError("--cpus names no CPU count");
  const all = trees();
  const out = outDir();
  const rows = [];
  for (let run = 1; run <= runs; run++) {
    for (const tree of all) {
      for (const cpus of counts) {
        const stem = `${tree.label}-${cpus === "all" ? "all" : `${cpus}cpu`}-${run}`;
        const built = buildOnce(tree, cpus, path.join(out, `build-${stem}.log`));
        let row = { tree, cpus, ok: built.ok };
        let line = "FAILED: see its log";
        if (built.ok) {
          copyFileSync(built.chart, path.join(out, `gantt-${stem}.svg`));
          const read = figures(readFileSync(built.chart, "utf8"));
          // The build's own "Done in" is the whole of it; the chart ends a little earlier.
          row = { ...row, ...read.row, ends: built.seconds ?? read.row.ends };
          line = `${chartLine(read.chart, tasks)}; done in ${row.ends.toFixed(2)}`;
        }
        rows.push(row);
        console.log(`${stem}: ${line}`);
      }
    }
  }
  console.log("");
  for (const tree of all) {
    for (const cpus of counts) {
      const title = `${tree.label}, ${cpus === "all" ? "every CPU" : `${cpus} CPUs`}`;
      summary(
        title,
        rows.filter((r) => r.tree === tree && r.cpus === cpus),
      );
    }
  }
  console.log(`logs and charts: ${out}`);
  return rows.every((r) => r.ok);
}

async function serve() {
  const builds = numberOption(values.builds ?? "5", { option: "--builds", integer: true, min: 2 });
  const all = trees();
  const out = outDir();
  let ok = true;
  const lines = [];
  for (const tree of all) {
    const { runBuild, createWorkerPool } = await import(pathToFileURL(path.join(tree.dir, "builder/tbdocs.mjs")).href);
    const scratch = path.join(tree.dir, ".build-speed", "serve");
    const dest = path.join(scratch, "_serve");
    const pool = createWorkerPool();
    const log = console.log;
    const rows = [];
    try {
      for (let n = 1; n <= builds; n++) {
        process.exitCode = 0;
        console.log = () => {};
        const t = Date.now();
        try {
          await runBuild({
            src: path.join(tree.dir, "docs"),
            dest,
            serve: true,
            skipOffline: true,
            skipPdf: true,
            pool,
          });
        } finally {
          console.log = log;
        }
        const seconds = (Date.now() - t) / 1000;
        const stem = `${tree.label}-serve-${n}`;
        const built = process.exitCode === 0 && existsSync(path.join(dest, CHART_REL));
        let row = { ok: built };
        let line = "FAILED";
        if (built) {
          copyFileSync(path.join(dest, CHART_REL), path.join(out, `gantt-${stem}.svg`));
          const read = figures(readFileSync(path.join(dest, CHART_REL), "utf8"));
          row = { ...row, ...read.row, ends: seconds };
          line = `${chartLine(read.chart, tasks)}; done in ${seconds.toFixed(2)}`;
        }
        ok &&= built;
        rows.push(row);
        log(`${stem}${n === 1 ? " (cold)" : ""}: ${line}`);
      }
    } finally {
      await pool.destroy();
      rmSync(scratch, { recursive: true, force: true });
    }
    lines.push([`${tree.label}, rebuilds`, rows.slice(1)]);
  }
  console.log("");
  for (const [title, rows] of lines) summary(title, rows);
  console.log(`charts: ${out}`);
  process.exitCode = 0;
  return ok;
}

function times() {
  if (args.length === 0) usageError("times: name at least one chart");
  for (const file of args)
    console.log(`${path.basename(file)}: ${chartLine(readChart(readFileSync(file, "utf8")), tasks)}`);
  return true;
}

async function png() {
  if (args.length === 0) usageError("png: name at least one chart");
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    for (const file of args) {
      const svg = readFileSync(file, "utf8");
      const width = Number(/width="(\d+)"/.exec(svg)?.[1]);
      const height = Number(/height="(\d+)"/.exec(svg)?.[1]);
      if (!width || !height) throw new Error(`${file}: no width and height on its <svg>`);
      await page.setViewport({ width, height, deviceScaleFactor: 1.5 });
      await page.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
      const out = file.replace(/\.svg$/i, "") + ".png";
      await page.screenshot({ path: out });
      console.log(out);
    }
  } finally {
    await browser.close();
  }
  return true;
}

function profile() {
  if (args.length !== 1) usageError("profile: name one .cpuprofile file");
  const names = list(values.fn);
  if (names.length === 0) usageError("profile: --fn names the functions to total");
  const depth = numberOption(values.depth ?? "3", { option: "--depth", integer: true, min: 0 });
  const trees = profileTrees(JSON.parse(readFileSync(args[0], "utf8")), names, depth);
  for (const line of formatTrees(trees, names)) console.log(line);
  return true;
}

async function part() {
  const [name] = args;
  if (args.length !== 1 || !Object.hasOwn(PARTS, name)) {
    usageError(`part: name one of ${Object.keys(PARTS).join(", ")}`);
  }
  if (values.tree.length > 1) usageError("part: one --tree at a time");
  await runPart(name, trees()[0].dir, { file: values.file });
  return true;
}

const COMMANDS = { bench, serve, times, png, profile, part };

// withUsageError takes a synchronous function, and some of the commands are
// not: a CliError from any of them is printed here the same way.
let ok;
try {
  if (!command) usageError("name a command");
  if (!Object.hasOwn(COMMANDS, command)) usageError(`unknown command: ${command}`);
  if (!["times", "png", "profile", "part"].includes(command) && args.length) {
    usageError(`${command} takes no file: ${args[0]}`);
  }
  ok = await COMMANDS[command]();
} catch (err) {
  if (!(err instanceof CliError)) throw err;
  process.stderr.write(`build_speed: ${err.message}\n\n${USAGE}`);
  process.exit(2);
}
process.exit(ok ? 0 : 1);
