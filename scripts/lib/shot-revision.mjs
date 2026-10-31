// The pictures under docs/ as a git revision has them, and what becomes of a picture when it
// is compared with them: shoot_docs.mjs compares each new capture with the picture at HEAD
// (or another revision) before the file on disk, so that a picture does not drift from the
// repository's over several runs, each step within a capture's noise of the file before it;
// and its --cleanup puts back every picture git reports modified that is within that noise of
// the revision's. svgshot/sheet.mjs --against reads the revision's pictures here too. The
// noise rule itself is withinNoise, in shot-change.mjs: every caller passes it in.
//
// Git is run in the docs folder, so that the repository that holds it answers, whichever
// checkout the script is in. The reads are batched: one `git cat-file --batch` process for
// any number of files.

import { execFileSync } from "node:child_process";

/**
 * Runs git in `cwd` and returns {status, stdout}: status 0 and its output as text, or its
 * exit code (128 when it could not run) and no output. Its error output is dropped.
 */
export function runGit(args, cwd) {
  try {
    return {
      status: 0,
      stdout: execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
    };
  } catch (e) {
    return { status: typeof e.status === "number" ? e.status : 128, stdout: "" };
  }
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
 * Returns {state, write}, `write` the bytes the file is to hold, null when it stays as it is:
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
    if (disk?.equals(revision)) return { state: revision.equals(png) ? "unchanged" : "noise", write: null };
    return { state: "restored", write: revision };
  }
  if (disk?.equals(png)) return { state: "unchanged", write: null };
  if (disk && near(disk, png)) return { state: "noise", write: null };
  return { state: disk ? "updated" : "new", write: png };
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
 * the revision's PNG, `after(out)` the file's, `near(a, b)` the noise rule over two PNG files.
 * Returns {reset, real, added, deleted, unreadable}, each a list of paths but `unreadable`,
 * [{out, error}]: a modified picture within noise of the revision's is reset, any other is a
 * real change, and an added or deleted one is a real change that is not compared.
 */
export function planCleanup(pictures, before, after, near) {
  const plan = { reset: [], real: [], added: [], deleted: [], unreadable: [] };
  for (const { out, status } of pictures) {
    if (status === "added" || status === "deleted") {
      plan[status].push(out);
      continue;
    }
    try {
      plan[near(before(out), after(out)) ? "reset" : "real"].push(out);
    } catch (e) {
      plan.unreadable.push({ out, error: e.message });
    }
  }
  return plan;
}
