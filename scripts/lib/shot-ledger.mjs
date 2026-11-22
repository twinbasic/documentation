// The ledger of the screenshot review tool's commits (WIP.ShotReview.md, The ledger): a line in
// the shared review folder's committed.jsonl for each commit the tool makes, written before git
// commits, naming each picture file the commit holds and its blob, or null for one it removes:
//
//   {"at": "...", "checkout": "<name or null>", "message": "...", "files": [["docs/.../A.png", "<blob>"], ...]}
//
// A blob is what git stores, so a rebase or a cherry-pick keeps it: a picture the tool committed
// in a worktree is still on record once the worktree's branch is rebased onto staging and
// staging is fast-forwarded to it, and the worktree removed (owner, 2026-11-22).
//
// unrecordedPictures is the check the reference-transaction hook makes (scripts/shot_ledger.mjs
// --hook) before staging moves: every screenshot that a commit staging gains changes, at the state
// that commit leaves it in, must be on record. A screenshot is a PNG the manifest names, at either
// end, and its SVGs (X.svg is X.png's, X.light.svg X.light.png's). Commits that a remote-tracking
// ref already holds are left out: they are published already, and whatever reviewed them was not
// this clone.
//
// Lean on purpose: the hook loads this on every move of staging, so it imports nothing but node's
// own modules and the session module's paths.

import { execFile, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { CHECKOUTS, sharedRootOf } from "./shot-session.mjs";

/** The ledger of the review folder `root` (a session root or the shared folder). */
export const ledgerFile = (root) => path.join(sharedRootOf(root), "committed.jsonl");

/** The manifest of the screenshots, as a path in the repository. */
export const MANIFEST_PATH = "test/shots/manifest.json";

/** The docs folder, as a path in the repository: the manifest's keys are paths under it. */
export const DOCS_PREFIX = "docs/";

const PICTURE = /\.(png|svg)$/i;

/** The PNG a picture file is part of: itself, or the PNG an SVG is drawn of. */
export const pngOfFile = (file) => file.replace(/\.svg$/i, ".png");

/** The checkout a session root is of: a worktree's name, or null for the main checkout. */
export const checkoutOf = (root) => (path.basename(path.dirname(root)) === CHECKOUTS ? path.basename(root) : null);

/** The key a file at a blob (null: removed) is recorded under. */
const keyOf = (file, blob) => `${file}\n${blob ?? "-"}`;

function gitAsync(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, windowsHide: true, maxBuffer: 1 << 26 }, (e, stdout, stderr) =>
      e ? reject(new Error(`git ${args[0]}: ${(stderr || e.message).trim()}`)) : resolve(stdout),
    );
  });
}

/**
 * Records the picture files among `paths` (paths from the top of the working tree, forward
 * slashes) that the commit about to be made in the working tree of the folder `repo` holds: each
 * one there with the blob git makes of it (its filters applied, as `git add` would), each one gone
 * with null. Appends one line to the ledger of `root`. Resolves to the files recorded,
 * [[path, blob | null]]; records nothing when there is no picture among them.
 */
export async function recordPictures(root, { repo, paths, message, now = () => new Date().toISOString() }) {
  const pictures = paths.filter((p) => p.startsWith(DOCS_PREFIX) && PICTURE.test(p));
  if (!pictures.length) return [];
  const top = path.resolve((await gitAsync(["rev-parse", "--show-toplevel"], repo)).trim());
  const there = pictures.filter((p) => existsSync(path.join(top, p)));
  const blobs = there.length ? (await gitAsync(["hash-object", "--", ...there], top)).trim().split(/\r?\n/) : [];
  if (blobs.length !== there.length) throw new Error("git hash-object gave no blob for each picture");
  const byPath = new Map(there.map((p, k) => [p, blobs[k]]));
  const files = pictures.map((p) => [p, byPath.get(p) ?? null]);
  const file = ledgerFile(root);
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify({ at: now(), checkout: checkoutOf(root), message, files })}\n`);
  return files;
}

/** The ledger of `root`, as a Set of keys (a path and its blob); empty when there is none. */
export function readLedger(root) {
  const file = ledgerFile(root);
  const keys = new Set();
  if (!existsSync(file)) return keys;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // a line cut short by a process that died while writing it
    }
    for (const [p, blob] of entry.files ?? []) keys.add(keyOf(p, blob));
  }
  return keys;
}

/** Runs git in `cwd`: {status, stdout}. Stands in for itself in the probes. */
export function runGit(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 1 << 28 });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// The PNGs the manifest at `rev` names, as paths in the repository; none when it has no manifest.
function manifestPictures(repo, rev, git) {
  const r = git(["show", `${rev}:${MANIFEST_PATH}`], repo);
  if (r.status !== 0) return [];
  try {
    return Object.keys(JSON.parse(r.stdout).pictures ?? {}).map((k) => DOCS_PREFIX + k);
  } catch {
    return [];
  }
}

/**
 * The screenshot files that moving a branch from `from` to `to` brings in and that no line of the
 * ledger `recorded` (readLedger) holds at that blob: [{path, blob, commit}], `blob` null for a file
 * removed and `commit` the newest commit that changed it, sorted by path. Only commits that `to`
 * reaches and neither `from` nor a remote-tracking ref does count, and of each file only the state
 * the newest of them leaves it in (a picture retaken twice on a branch is reviewed once, as the
 * second retake). `git(args, cwd)` stands in for running git in the probes.
 */
export function unrecordedPictures({ repo, from, to, recorded, git = runGit }) {
  const screenshots = new Set([...manifestPictures(repo, from, git), ...manifestPictures(repo, to, git)]);
  if (!screenshots.size) return [];
  const log = git(
    [
      "-c",
      "core.quotePath=false",
      "log",
      "--first-parent",
      "-m",
      "--raw",
      "--no-renames",
      "--no-abbrev",
      "--format=commit %H",
      to,
      "--not",
      from,
      "--remotes",
      "--",
      DOCS_PREFIX,
    ],
    repo,
  );
  if (log.status !== 0) throw new Error(`git log ${from}..${to} failed: ${log.stderr.trim()}`);
  const newest = new Map();
  let commit = null;
  for (const line of log.stdout.split(/\r?\n/)) {
    const c = /^commit ([0-9a-f]{40,64})$/.exec(line);
    if (c) {
      commit = c[1];
      continue;
    }
    const m = /^:\d+ \d+ [0-9a-f]+ ([0-9a-f]+) ([AMDT])\t(.+)$/.exec(line);
    if (!m || newest.has(m[3])) continue;
    const [, blob, status, file] = m;
    if (!PICTURE.test(file) || !screenshots.has(pngOfFile(file))) continue;
    newest.set(file, { path: file, blob: status === "D" ? null : blob, commit });
  }
  return [...newest.values()]
    .filter((f) => !recorded.has(keyOf(f.path, f.blob)))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
