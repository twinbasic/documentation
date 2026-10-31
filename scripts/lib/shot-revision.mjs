// The pictures under docs/ as a git revision has them, and what becomes of a picture when it
// is compared with them: shoot_docs.mjs compares each new capture with the picture at HEAD
// (or another revision) before the file on disk, so that a picture does not drift from the
// repository's over several runs, each step within a capture's noise of the file before it;
// and its --cleanup puts back every picture git reports modified that is within that noise of
// the revision's. svgshot/sheet.mjs --against lists the pictures that differ from a revision
// and reads the revision's pictures here too. The noise rule itself is withinNoise, in
// shot-change.mjs: every caller passes it in. And where a folder of pictures that may hold the
// Windows user name may be written (outputRefusal): a sheet, or a run's stage. And what the
// working tree changed, and a commit of some of it, for the screenshot review tool's commit.
//
// Git is run in the docs folder, so that the repository that holds it answers, whichever
// checkout the script is in. The reads are batched: one `git cat-file --batch` process for
// any number of files.

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { isOutputTree } from "../../lib/markdown-files.mjs";

/**
 * Runs git in `cwd` and returns {status, stdout}: status 0 and its output as text, or its
 * exit code (128 when it could not run) and no output. Its error output is dropped.
 */
export function runGit(args, cwd) {
  try {
    return {
      status: 0,
      stdout: execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      }),
    };
  } catch (e) {
    return { status: typeof e.status === "number" ? e.status : 128, stdout: "" };
  }
}

/**
 * The pictures git reports changed, from the text of `git diff --name-status
 * --no-renames -z` (status, path, status, path, ... separated by NUL): [{out,
 * status}], status "modified", "added" or "deleted", the PNGs only, the build's output
 * trees left out, sorted by path.
 */
export function parseNameStatus(text) {
  const parts = text.split("\0");
  const found = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const letter = parts[i].trim()[0];
    const status = letter === "A" ? "added" : letter === "D" ? "deleted" : "modified";
    found.push({ out: parts[i + 1], status });
  }
  return keepPictures(found);
}

/** The PNGs of a list of paths from `git ls-files -z` (NUL separated), as [{out, status: "added"}]. */
export const parseUntracked = (text) =>
  keepPictures(
    text
      .split("\0")
      .filter(Boolean)
      .map((out) => ({ out, status: "added" })),
  );

function keepPictures(list) {
  const seen = new Set();
  return list
    .filter(({ out }) => /\.png$/i.test(out) && !isOutputTree(out.split("/")[0]) && !seen.has(out) && seen.add(out))
    .sort((a, b) => (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));
}

/**
 * The PNGs under `docsRoot` that differ from the revision `rev`, read with git run in
 * `docsRoot` (so its own repository answers, whichever checkout this script is in):
 * {hash, short, prefix, pictures}, `prefix` the folder's path from the repository's root
 * with a closing slash (empty at the root), `pictures` as parseNameStatus gives them,
 * with the PNGs git does not track yet, which are added. The working tree is compared,
 * not the index. Throws an Error that says why when `rev` is not a commit there or the
 * folder is not in a git working tree. `git` stands in for running git in the probes.
 */
export function changedPictures(docsRoot, rev, git = runGit) {
  const { hash: id, short, prefix } = revisionOf(docsRoot, rev, git);
  const diff = git(["diff", "--name-status", "--no-renames", "--relative", "-z", id, "--", "."], docsRoot);
  if (diff.status !== 0) throw new Error(`git diff against ${rev} failed in ${docsRoot}`);
  const untracked = git(["ls-files", "-z", "--others", "--exclude-standard", "--", "."], docsRoot);
  if (untracked.status !== 0) throw new Error(`git ls-files failed in ${docsRoot}`);
  const pictures = keepPictures([...parseNameStatus(diff.stdout), ...parseUntracked(untracked.stdout)]);
  return { hash: id, short, prefix, pictures };
}

/**
 * The commit `rev` names in the git repository of the folder `root`: {hash, short,
 * prefix}, `prefix` the folder's path from the repository's root with a closing slash
 * (empty at the root). Throws an Error that says why when `rev` is not a commit there or
 * the folder is not in a git working tree. `git` stands in for running git in the probes.
 */
export function revisionOf(root, rev, git = runGit) {
  if (rev === "" || rev.startsWith("-")) throw new Error(`not a revision: ${JSON.stringify(rev)}`);
  const where = git(["rev-parse", "--show-prefix"], root);
  if (where.status !== 0) throw new Error(`${root} is not in a git working tree`);
  const hash = git(["rev-parse", "--verify", "--quiet", `${rev}^{commit}`], root);
  if (hash.status !== 0) throw new Error(`no revision ${rev} in the git repository of ${root}`);
  const id = hash.stdout.trim();
  const short = git(["rev-parse", "--short=8", id], root).stdout.trim() || id.slice(0, 8);
  return { hash: id, short, prefix: where.stdout.trim() };
}

/**
 * Reads what `git cat-file --batch` wrote for the object names `names`, in their order:
 * a Map from each name to its bytes, or null for one that is missing or not a file.
 */
export function parseCatFileBatch(buf, names) {
  const found = new Map();
  let pos = 0;
  for (const name of names) {
    const nl = buf.indexOf(10, pos);
    if (nl < 0) throw new Error(`git cat-file's output ends before ${name}`);
    const header = buf.toString("utf8", pos, nl);
    pos = nl + 1;
    // "<oid> <type> <size>", else "<name> missing" (or "ambiguous"), with nothing after it
    const m = /^[0-9a-f]{40,64} (\S+) (\d+)$/.exec(header);
    if (!m) {
      found.set(name, null);
      continue;
    }
    const size = Number(m[2]);
    found.set(name, m[1] === "blob" ? buf.subarray(pos, pos + size) : null);
    pos += size + 1;
  }
  return found;
}

/**
 * The files `outs` (paths under the folder `root`, which is `prefix` from the repository's
 * root) as the commit `hash` has them, in one git process however many there are: a Map
 * from each to its bytes, or null for one the commit does not have. The bytes are the
 * commit's own, with no checkout filter: an SVG has LF where a checkout under core.autocrlf
 * has CRLF (`cat-file --filters` would apply it, but gives the unfiltered size in its
 * header, so its output cannot be split), so a text file is put back with
 * restoreFromRevision rather than from these bytes.
 */
export function readRevisionFiles(root, hash, prefix, outs) {
  const unique = [...new Set(outs)];
  if (!unique.length) return new Map();
  const names = unique.map((out) => `${hash}:${prefix}${out}`);
  const buf = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: `${names.join("\n")}\n`,
    maxBuffer: 2 ** 31 - 1,
    stdio: ["pipe", "pipe", "ignore"],
    windowsHide: true,
  });
  const byName = parseCatFileBatch(buf, names);
  return new Map(unique.map((out, i) => [out, byName.get(names[i])]));
}

/**
 * Writes the files `outs` (paths under the folder `root`, each of which the commit `hash`
 * has) as a checkout of that commit writes them, in one git process (`git restore
 * --worktree`, which leaves the index alone), so that git counts each as unchanged when
 * the commit is HEAD. Each path is literal, never a pattern.
 */
export function restoreFromRevision(root, hash, outs) {
  if (!outs.length) return;
  execFileSync("git", ["restore", `--source=${hash}`, "--worktree", "--pathspec-from-file=-", "--pathspec-file-nul"], {
    cwd: root,
    input: `${outs.map((out) => `:(literal)${out}`).join("\0")}\0`,
    stdio: ["pipe", "ignore", "pipe"],
    windowsHide: true,
  });
}

/**
 * The pictures under the folder `root` as the revision `rev` has them: {rev, hash, short,
 * prefix, read(outs), bytes(out)}. `read` fetches the files `outs` in one git process and
 * keeps them, returning a Map from each to its bytes or null; `bytes` returns one, from what
 * was read, else in a process of its own. Throws as revisionOf does.
 */
export function openRevision(root, rev, git = runGit) {
  const { hash, short, prefix } = revisionOf(root, rev, git);
  const kept = new Map();
  const read = (outs) => {
    const wanted = outs.filter((out) => !kept.has(out));
    for (const [out, bytes] of readRevisionFiles(root, hash, prefix, wanted)) kept.set(out, bytes);
    return new Map(outs.map((out) => [out, kept.get(out)]));
  };
  return { rev, hash, short, prefix, read, bytes: (out) => read([out]).get(out) };
}

/**
 * What becomes of a new capture `png` of a picture (PNG bytes): `revision` the picture as the
 * revision has it, or null (a new shot, a file git does not track, or the reference turned
 * off), `disk` the file as it is, or null, and `near(a, b)` the noise rule over two PNG files.
 * Returns {state, write, against}, `write` the bytes the file is to hold, null when it stays as
 * it is, and `against` the picture the capture was found equal to, near or beyond noise of:
 * "revision", "disk", or null for a new picture. The review's regions of change are worked
 * out against it (shot-queue.mjs's reviewPicture).
 *
 *   restored   the capture is the revision's picture, or within noise of it, and the file
 *              is not (an earlier run's drift, or none): the file becomes the revision's
 *   unchanged  the file is the capture, or the revision's picture and the capture equals it
 *   noise      the file is the revision's picture, or (when the capture is not within noise
 *              of the revision's) within noise of the capture: it stays as it is
 *   updated    a file there, which the capture differs from beyond noise: written
 *   new        no file there, and the revision has none the capture is near: written
 */
export function pictureFate(png, revision, disk, near) {
  if (revision && (revision.equals(png) || near(revision, png))) {
    const against = "revision";
    if (disk?.equals(revision)) return { state: revision.equals(png) ? "unchanged" : "noise", write: null, against };
    return { state: "restored", write: revision, against };
  }
  if (disk?.equals(png)) return { state: "unchanged", write: null, against: "disk" };
  if (disk && near(disk, png)) return { state: "noise", write: null, against: "disk" };
  return { state: disk ? "updated" : "new", write: png, against: disk ? "disk" : null };
}

// An SVG's text with CRLF made LF: git counts a checkout under core.autocrlf as the same file.
const lf = (bytes) => bytes.toString("utf8").replace(/\r\n/g, "\n");

/**
 * What becomes of a picture's SVG when its PNG goes back to the revision's: `revision` the
 * SVG as the revision has it, or null, `disk` as it is, or null. Returns "keep" (the same,
 * line endings aside, or neither there), "write" (the revision's goes in its place) or
 * "remove" (the revision has none).
 */
export function svgFate(revision, disk) {
  if (!revision) return disk ? "remove" : "keep";
  return disk && lf(disk) === lf(revision) ? "keep" : "write";
}

/**
 * Sorts the pictures git reports changed against a revision (`pictures`, [{out, status}] as
 * changedPictures gives them) into what shoot_docs.mjs --cleanup does with each: `before(out)`
 * the revision's PNG, `after(out)` the file's, `near(a, b, out)` whether the file goes back to
 * the revision's (the noise rule over two PNG files, and the picture's entry in the manifest:
 * shot-policy.mjs's cleanupResets). Returns {reset, real, added, deleted, unreadable}, each a
 * list of paths but `unreadable`, [{out, error}]: a modified picture near the revision's is
 * reset, any other is a real change, and an added or deleted one is a real change that is not compared.
 */
export function planCleanup(pictures, before, after, near) {
  const plan = { reset: [], real: [], added: [], deleted: [], unreadable: [] };
  for (const { out, status } of pictures) {
    if (status === "added" || status === "deleted") {
      plan[status].push(out);
      continue;
    }
    try {
      plan[near(before(out), after(out), out) ? "reset" : "real"].push(out);
    } catch (e) {
      plan.unreadable.push({ out, error: e.message });
    }
  }
  return plan;
}

// ---- the working tree, and a commit of some of it -------------------------------------
//
// The screenshot review tool commits the files its session changed and nothing else
// (WIP.ShotReview.md, Commit), so it asks git what the working tree changed, and commits a
// list of paths by name.

/**
 * The changes git reports, from the text of `git status --porcelain=v1 -z --no-renames
 * --untracked-files=all` ("XY path", separated by NUL): [{path, status}], `path` from the
 * repository's root, `status` "added" (not tracked yet, or added to the index), "deleted" (from
 * the working tree or the index) or "modified", sorted by path.
 */
export function parseStatus(text) {
  const found = [];
  for (const entry of text.split("\0")) {
    if (entry.length < 4) continue;
    const [x, y, p] = [entry[0], entry[1], entry.slice(3)];
    const status = x === "D" || y === "D" ? "deleted" : x === "?" || x === "A" ? "added" : "modified";
    found.push({ path: p, status });
  }
  return found.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * What the working tree of the folder `root` changed: {top, changes}, `top` the repository's
 * root and `changes` parseStatus' list, ignored files left out. Throws an Error that says why
 * when the folder is not in a git working tree.
 */
export function workingChanges(root, git = runGit) {
  const top = git(["rev-parse", "--show-toplevel"], root);
  if (top.status !== 0) throw new Error(`${root} is not in a git working tree`);
  const dir = top.stdout.trim();
  const status = git(["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"], dir);
  if (status.status !== 0) throw new Error(`git status failed in ${dir}`);
  return { top: path.resolve(dir), changes: parseStatus(status.stdout) };
}

// Runs git in `cwd` with `input` on its stdin, and returns its output; throws an Error with
// what git said, stdout and stderr, when it fails.
function gitSaying(args, cwd, input) {
  try {
    return execFileSync("git", args, {
      cwd,
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (e) {
    const said = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
    throw new Error(`git ${args[0]} failed${said ? `: ${said}` : ` (${e.message})`}`);
  }
}

const literalSpecs = (paths) => `${paths.map((p) => `:(literal)${p}`).join("\0")}\0`;

/**
 * Commits the files `paths` (from the root of the repository whose working tree holds `root`)
 * with the message `message`, and nothing else: each of `added`, which git does not track yet,
 * is added first, and then every path is committed as the working tree holds it (`git commit
 * --only`), a file removed as a deletion. Whatever else the index holds stays in it, not
 * committed. The repository's hooks run. Returns {hash, short}, the new commit. Throws an Error
 * with git's own words when git refuses: a hook, nothing to commit, an empty message.
 */
export function commitPaths(root, { paths, added = [], message }) {
  if (!paths.length) throw new Error("no file to commit");
  const { top } = workingChanges(root);
  if (added.length) gitSaying(["add", "--pathspec-from-file=-", "--pathspec-file-nul"], top, literalSpecs(added));
  gitSaying(
    ["commit", "--quiet", "--only", "-m", message, "--pathspec-from-file=-", "--pathspec-file-nul"],
    top,
    literalSpecs(paths),
  );
  const hash = gitSaying(["rev-parse", "HEAD"], top).trim();
  return { hash, short: gitSaying(["rev-parse", "--short=8", hash], top).trim() };
}

const inside = (dir, root) => {
  const rel = path.relative(root, dir);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/**
 * Why `dir` may not take a folder of pictures that may hold the Windows user name, or
 * null: it is under one of `docsRoots`, or inside a git working tree at a path git does
 * not ignore. A sheet (sheet.mjs draws its pictures without the check) and a run's stage
 * (shot-stage.mjs: its bundles hold the page's text) must never be committed or published. `git` stands in for running git in the probes:
 * git(args, cwd) returns its exit code and output, {status, stdout}.
 */
export function outputRefusal(dir, docsRoots, git = runGit) {
  const abs = path.resolve(dir);
  for (const root of docsRoots) if (inside(abs, path.resolve(root))) return `${abs} is under ${path.resolve(root)}`;
  let near = abs;
  while (!existsSync(near) || !statSync(near).isDirectory()) {
    const up = path.dirname(near);
    if (up === near) return null;
    near = up;
  }
  const top = git(["rev-parse", "--show-toplevel"], near);
  if (top.status !== 0) return null;
  const root = path.resolve(top.stdout.trim());
  const rel = path.relative(root, abs).replace(/\\/g, "/");
  if (rel === "") return `${abs} is the root of the git working tree`;
  const ignored = git(["check-ignore", "-q", "--", rel], root);
  if (ignored.status === 0) return null;
  if (ignored.status === 1) return `${abs} is inside the git working tree ${root}, at a path git does not ignore`;
  return `git check-ignore could not say whether ${abs} is ignored`;
}
