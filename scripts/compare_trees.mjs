#!/usr/bin/env node
// Build the site before and after a change, and compare the three trees
// byte for byte.
//
//   node scripts/compare_trees.mjs                      # HEAD against the working tree
//   node scripts/compare_trees.mjs --before <ref>       # any commit against the working tree
//   node scripts/compare_trees.mjs --keep               # leave the trees and logs for inspection
//   node scripts/compare_trees.mjs -- --baseurl /docs   # extra tbdocs arguments, for both builds
//
// The oracle for a builder/ change that claims to change no output
// (builder/PLAN-TOOLING-REVIEW.md, decision 3). A change that is meant to
// alter the output is checked the same way: the differences it reports should
// be the intended ones and no others.
//
// Both sides are built from git worktrees checked out under .compare-trees/
// at the repository root (gitignored): the before side at --before, the after
// side at a commit object made from the working tree through a temporary
// index, so neither the real index nor any file in the working tree changes.
// Building the working tree in place does not work as an oracle: under
// core.autocrlf a fresh checkout writes CRLF where files a tool has rewritten
// hold LF, and every file the build copies verbatim then differs. The after
// side includes untracked files that are not ignored, which is what a commit
// of the working tree would hold.
//
// The worktrees need no node_modules of their own: Node resolves packages by
// walking up from the importing file, and the walk reaches this checkout's.
// Both builds run tbdocs with --no-fetch-assets and CI=1 in the environment,
// so the page and symbol baselines are read and never written (tbdocs.mjs's
// mayWrite); the only other reader of CI is the asset fetch, which the flag
// already turns off.
//
// A few regions differ between any two builds, and are normalised rather than
// excluded, each for the reason given in NORMALISERS below. A normaliser that
// finds nothing to replace says so, instead of letting the file through.
//
// A run that fails keeps .compare-trees/ so its logs can be read; the next
// run removes it before starting.
//
// Exit codes: 0 the trees match, 1 they differ, 2 the tool failed.

import { spawnSync } from "node:child_process";
import { closeSync, existsSync, openSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const WORK = path.join(ROOT, ".compare-trees");
const SIDES = ["before", "after"];

// The three trees one build writes, by the suffix tbdocs adds to --dest.
const TREES = [["online", ""], ["offline", "-offline"], ["pdf", "-pdf"]];

// Files whose bytes differ between any two builds of the same source. Each
// normalise() returns the text with the varying region replaced, or null when
// it cannot find the region -- which is itself worth reporting.
const GANTT_MARKER = 'data-svg-src="assets/images/gantt.svg"';
const NORMALISERS = [
  {
    trees: ["online", "offline"],
    path: "assets/images/gantt.svg",
    reason: "the build's own task timings (gantt.mjs)",
    normalise: () => "<svg><!-- gantt chart --></svg>",
  },
  {
    trees: ["online", "offline"],
    path: "Documentation/Development/BuildInfo.html",
    reason: "the same chart, inlined by tbdocs.mjs's injectGanttChart",
    normalise: (s) => {
      const at = s.indexOf(GANTT_MARKER);
      const start = at < 0 ? -1 : s.indexOf("<svg", at);
      const end = start < 0 ? -1 : s.indexOf("</svg>", start);
      if (end < 0) return null;
      return s.slice(0, start) + "<svg><!-- gantt chart --></svg>" + s.slice(end + "</svg>".length);
    },
  },
  {
    trees: ["pdf"],
    path: "book.html",
    reason: "the title page's build line: the wall-clock date and the commit (book.mjs's renderTitlePage)",
    normalise: (s) => {
      const re = /(<p class="build-info">)[^<]*(<\/p>)/;
      return re.test(s) ? s.replace(re, "$1(build line)$2") : null;
    },
  },
];

const TEXT_EXT = /\.(?:html?|css|js|mjs|json|xml|svg|txt|md|map|py|yml)$/i;

const USAGE = `usage: node scripts/compare_trees.mjs [--before <ref>] [--keep] [--max <n>] [-- <tbdocs args>]

Builds <ref> (default HEAD) and the working tree, each from a git worktree
under .compare-trees/ with tbdocs --no-fetch-assets and CI=1, and compares the
online, offline and PDF trees byte for byte.

  --before <ref>  the commit to build as the before side (default HEAD)
  --keep          leave .compare-trees/ in place: both worktrees, their trees
                  and both build logs
  --max <n>       list at most n differences per tree (default 20)
  --              everything after it is passed to both tbdocs builds

Exit codes: 0 the trees match, 1 they differ, 2 the tool failed.
`;

function usageError(message) {
  process.stderr.write(`compare_trees: ${message}\n\n${USAGE}`);
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { before: "HEAD", keep: false, max: 20, tbdocs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") { opts.tbdocs = argv.slice(i + 1); break; }
    if (a === "--help" || a === "-h") { process.stdout.write(USAGE); process.exit(0); }
    if (a === "--keep") { opts.keep = true; continue; }
    if (a === "--before" || a === "--max") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) usageError(`${a} needs a value`);
      i++;
      if (a === "--before") opts.before = v;
      else {
        opts.max = Number(v);
        if (!Number.isInteger(opts.max) || opts.max < 0) usageError(`--max takes a whole number, not "${v}"`);
      }
      continue;
    }
    usageError(`unknown argument "${a}"`);
  }
  return opts;
}

class ToolError extends Error {}

function git(args, { env, allowFail = false } = {}) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", env: env ? { ...process.env, ...env } : process.env });
  if (r.error) throw new ToolError(`git ${args.join(" ")}: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    throw new ToolError(`git ${args.join(" ")} exited ${r.status}: ${(r.stderr || "").trim()}`);
  }
  return r;
}

// Worktrees left by a run that failed, or kept by --keep.
async function removeWorktrees() {
  for (const side of SIDES) {
    const dir = path.join(WORK, side);
    if (!existsSync(dir)) continue;
    git(["worktree", "remove", "--force", dir], { allowFail: true });
    await fs.rm(dir, { recursive: true, force: true });
  }
  git(["worktree", "prune"], { allowFail: true });
}

// A commit object holding the working tree as `git add -A` would stage it,
// made in a copy of the index so that the real one is untouched. Fixed
// identities keep it independent of the user's configuration; nothing refers
// to it afterwards, so git's garbage collection removes it in time.
function snapshotWorkingTree() {
  const gitDir = path.resolve(ROOT, git(["rev-parse", "--git-dir"]).stdout.trim());
  const index = path.join(WORK, "index");
  const env = {
    GIT_INDEX_FILE: index,
    GIT_AUTHOR_NAME: "compare_trees", GIT_AUTHOR_EMAIL: "compare_trees@localhost",
    GIT_COMMITTER_NAME: "compare_trees", GIT_COMMITTER_EMAIL: "compare_trees@localhost",
  };
  return fs.copyFile(path.join(gitDir, "index"), index).then(() => {
    git(["add", "-A"], { env });
    const tree = git(["write-tree"], { env }).stdout.trim();
    const commit = git(["commit-tree", tree, "-p", "HEAD", "-m", "compare_trees: the working tree"], { env }).stdout.trim();
    return { tree, commit };
  });
}

function build(label, root, dest, extra) {
  const log = path.join(WORK, `${label}.log`);
  const fd = openSync(log, "w");
  const started = Date.now();
  const r = spawnSync(
    process.execPath,
    [path.join(root, "builder", "tbdocs.mjs"), "--src", "docs", "--dest", dest, "--no-fetch-assets", ...extra],
    { cwd: root, env: { ...process.env, CI: "1" }, stdio: ["ignore", fd, fd] },
  );
  closeSync(fd);
  if (r.error) throw new ToolError(`${label} build: ${r.error.message}`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (!existsSync(dest)) throw new ToolError(`${label} build wrote no tree (exit ${r.status}); see ${log}`);
  return { status: r.status, seconds };
}

async function listFiles(root) {
  const out = [];
  async function visit(dir, rel) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path.join(dir, entry.name), r);
      else if (entry.isFile()) out.push(r);
    }
  }
  if (existsSync(root)) await visit(root, "");
  return out;
}

function byCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Where two versions of a file first differ, in a form a person can read: a
// line number and a JSON-quoted excerpt from each side, so whitespace shows.
function firstDifference(rel, x, y) {
  if (typeof x !== "string" && !TEXT_EXT.test(rel)) {
    let k = 0;
    const n = Math.min(x.length, y.length);
    while (k < n && x[k] === y[k]) k++;
    return `binary, first difference at byte ${k} (sizes ${x.length} and ${y.length})`;
  }
  const s = typeof x === "string" ? x : x.toString("utf8");
  const t = typeof y === "string" ? y : y.toString("utf8");
  let k = 0;
  const n = Math.min(s.length, t.length);
  while (k < n && s[k] === t[k]) k++;
  const line = s.slice(0, k).split("\n").length;
  const from = Math.max(0, k - 40);
  return `line ${line}\n      before: ${JSON.stringify(s.slice(from, k + 60))}\n      after:  ${JSON.stringify(t.slice(from, k + 60))}`;
}

async function compareTree(name, before, after, applied) {
  const [fb, fa] = await Promise.all([listFiles(before), listFiles(after)]);
  const inBefore = new Set(fb);
  const inAfter = new Set(fa);
  const onlyBefore = fb.filter((f) => !inAfter.has(f)).sort(byCodePoint);
  const onlyAfter = fa.filter((f) => !inBefore.has(f)).sort(byCodePoint);
  const common = fb.filter((f) => inAfter.has(f));
  const differ = [];
  let next = 0;
  async function worker() {
    while (next < common.length) {
      const rel = common[next++];
      const [x, y] = await Promise.all([fs.readFile(path.join(before, rel)), fs.readFile(path.join(after, rel))]);
      const n = NORMALISERS.find((m) => m.path === rel && m.trees.includes(name));
      if (!n) {
        if (!x.equals(y)) differ.push({ rel, detail: firstDifference(rel, x, y) });
        continue;
      }
      const nx = n.normalise(x.toString("utf8"));
      const ny = n.normalise(y.toString("utf8"));
      if (nx === null || ny === null) {
        if (!x.equals(y)) {
          differ.push({ rel, detail: `the normaliser for ${n.reason} found nothing to replace\n      ${firstDifference(rel, x, y)}` });
        }
        continue;
      }
      applied.push(`${name}: ${rel} (${n.reason})`);
      if (nx !== ny) differ.push({ rel, detail: firstDifference(rel, nx, ny) });
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker));
  differ.sort((p, q) => byCodePoint(p.rel, q.rel));
  return { name, total: new Set([...fb, ...fa]).size, differ, onlyBefore, onlyAfter };
}

function printList(title, items, max, render) {
  if (!items.length) return;
  console.log(`    ${title}:`);
  for (const item of items.slice(0, max)) console.log(`      ${render(item)}`);
  if (items.length > max) console.log(`      ... and ${items.length - max} more`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const before = git(["rev-parse", "--verify", `${opts.before}^{commit}`]).stdout.trim();

  await removeWorktrees();
  await fs.rm(WORK, { recursive: true, force: true });
  await fs.mkdir(WORK, { recursive: true });

  let failed = true;
  try {
    const after = await snapshotWorkingTree();
    const unchanged = after.tree === git(["rev-parse", `${before}^{tree}`]).stdout.trim();
    const commits = { before, after: after.commit };
    const dest = {};
    for (const side of SIDES) {
      git(["worktree", "add", "--detach", path.join(WORK, side), commits[side]]);
      dest[side] = path.join(WORK, side, ".compare-out", "site");
    }
    console.log(`compare_trees: before = ${opts.before} (${before.slice(0, 9)}), after = the working tree${unchanged ? " (the same files)" : ""}`);
    const b = build("before", path.join(WORK, "before"), dest.before, opts.tbdocs);
    const a = build("after", path.join(WORK, "after"), dest.after, opts.tbdocs);
    console.log(`  builds: before ${b.seconds} s (exit ${b.status}), after ${a.seconds} s (exit ${a.status})`);

    const applied = [];
    const results = [];
    for (const [name, suffix] of TREES) {
      results.push(await compareTree(name, dest.before + suffix, dest.after + suffix, applied));
    }

    let differences = b.status === a.status ? 0 : 1;
    for (const r of results) {
      const same = r.total - r.differ.length - r.onlyBefore.length - r.onlyAfter.length;
      console.log(`  ${r.name.padEnd(8)} ${String(r.total).padStart(5)} files: ${same} identical, ${r.differ.length} differ, ${r.onlyBefore.length} only before, ${r.onlyAfter.length} only after`);
      differences += r.differ.length + r.onlyBefore.length + r.onlyAfter.length;
    }
    if (applied.length) {
      console.log("  normalised:");
      for (const line of applied.sort(byCodePoint)) console.log(`    ${line}`);
    }
    if (b.status !== a.status) console.log(`  the builds exited differently: before ${b.status}, after ${a.status}`);
    for (const r of results) {
      if (!r.differ.length && !r.onlyBefore.length && !r.onlyAfter.length) continue;
      console.log(`  ${r.name}:`);
      printList("differ", r.differ, opts.max, (d) => `${d.rel}  ${d.detail}`);
      printList("only before", r.onlyBefore, opts.max, (f) => f);
      printList("only after", r.onlyAfter, opts.max, (f) => f);
    }
    console.log(differences ? "compare_trees: the trees differ" : "compare_trees: the trees match");
    if (opts.keep) console.log(`  kept: ${WORK}`);
    failed = false;
    return differences ? 1 : 0;
  } finally {
    // A failed run keeps everything, so the log its message names is still
    // there; the next run removes it before starting.
    if (failed) process.stderr.write(`compare_trees: left ${WORK} for inspection\n`);
    else if (!opts.keep) {
      await removeWorktrees();
      await fs.rm(WORK, { recursive: true, force: true });
    }
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`compare_trees: ${err instanceof ToolError ? err.message : err.stack}\n`);
    process.exit(2);
  },
);
