// The help add-in's project file, published as a download. The add-in's source
// is the folder add-in/, which holds the project's files rather than a project
// file. The `addinProject` task packs it into a .twinproj and writes that into
// the online tree alone, at the path `addin_project.dest` in _config.yml names,
// so the Help Add-In page can offer the file itself. The offline tree holds no
// copy, because the project carries that tree's archive: the offline pages
// link to the website's file (offline-rewrite.mjs, computeWebsiteUrl).
//
// What goes in is the files git tracks under the folder, as the working folder
// holds them:
//
//   * git's list, so a file nobody has added -- a scratch module, a Build/
//     folder the IDE wrote -- never reaches the download, and neither does
//     whatever site.zip sits in Resources/HELP/ (gitignored; any tracked file
//     there is left out by name as well);
//   * the working folder's bytes, so a local build carries an edit not yet
//     committed, and the add-in tried from the build is the one being changed;
//   * Resources/SYMBOLS/symbols.json is replaced by the index this build wrote
//     (tB/symbols.json), so the download carries the index of the pages it is
//     published with. In CI the add-in's committed copy is never rewritten
//     (addin-index.mjs), and the download is still current;
//   * Resources/HELP/site.zip is the archive of the offline tree that this
//     build wrote (help-archive-step.mjs), handed over by the build and never
//     read from the disk, so the add-in built from the download serves the
//     pages itself, without the internet. A build that wrote no archive
//     (--no-help-archive, --serve, another --dest, a fixture) packs none.
//
// Line endings are packed as git stores them. A Windows checkout under
// core.autocrlf holds Settings, the .twin files and the .tbform with CRLF and a
// Linux one with LF, so each file outside Resources/ has its CRLFs made LF
// first; impexp then gives the code files CRLF, as the IDE stores them.
// .gitattributes checks Resources/ out byte for byte, so those files are
// packed as they are. A Windows build and a Linux build therefore write the
// same bytes, and impexp writes no time and sorts every folder, so two builds
// of one tree do too.
//
// The pack is impexp's own importProject, in process, as the harness packs
// (scripts/lib/tb-project.mjs): never the compiler executable, never Python.
// impexp.mjs is the one module under scripts/ the builder may import
// (biome.jsonc): it depends on nothing, it is a build input already, published
// through bundle_extra, and check_tree_fresh.mjs watches it.

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { importProject } from "../scripts/impexp.mjs";
import { posix } from "./paths.mjs";

const exec = promisify(execFile);

// Paths inside the add-in's folder, compared without case: git on Windows
// reports a path in the case it was added with.
const HELP_DIR = "resources/help/";
const SYMBOLS_REL = "resources/symbols/symbols.json";
const VERBATIM_DIR = "resources/";
// Where the archive goes in the project, as the add-in embeds it.
export const ARCHIVE_IN_PROJECT = "Resources/HELP/site.zip";

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The download _config.yml declares, or null when it declares none (the test
 * fixtures' configs do not).
 *
 * @returns {{src: string, dest: string} | null} `src` resolved against the
 *   source tree, as bundle_extra's is; `dest` the path in each tree
 */
export function addinProjectOf(config) {
  const e = config?.addin_project;
  if (!e?.src || !e?.dest) return null;
  return { src: String(e.src), dest: posix(String(e.dest)).replace(/^\/+/, "") };
}

// The files git lists under `dir`, relative to it, with forward slashes.
async function gitFiles(dir, ...args) {
  const { stdout } = await exec("git", ["-C", dir, "ls-files", "-z", ...args, "--", "."], {
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.split("\0").filter(Boolean).sort(byCodePoint);
}

const isHelp = (rel) => rel.toLowerCase().startsWith(HELP_DIR);

function lf(bytes) {
  return Buffer.from(bytes.toString("latin1").replaceAll("\r\n", "\n"), "latin1");
}

/**
 * Pack the add-in's folder into a project file, in memory. Writes nothing
 * outside a temporary folder, which it removes.
 *
 * @param {object} o
 * @param {string} o.dir        the add-in's folder, the one holding Settings
 * @param {string} [o.symbols]  the symbol index to pack in place of the folder's copy
 * @param {Buffer} [o.archive]  the offline tree's archive this build wrote, packed as
 *   Resources/HELP/site.zip; none when absent, whatever site.zip is on the disk
 * @returns {Promise<{bytes: Buffer, files: string[], untracked: string[]}>} the
 *   project file, the files packed, and the files git does not track that were
 *   left out (Resources/HELP/ aside)
 */
export async function packAddinProject({ dir, symbols, archive = null }) {
  const [tracked, untracked] = await Promise.all([gitFiles(dir), gitFiles(dir, "--others", "--exclude-standard")]);
  const files = [];
  for (const rel of tracked) {
    if (isHelp(rel)) continue;
    let bytes;
    if (symbols != null && rel.toLowerCase() === SYMBOLS_REL) bytes = Buffer.from(symbols, "utf8");
    else {
      try {
        bytes = await fs.readFile(path.join(dir, ...rel.split("/")));
      } catch (err) {
        // Deleted in the working folder and not yet in git: not in the add-in.
        if (err.code === "ENOENT") continue;
        throw err;
      }
    }
    files.push({ rel, bytes: rel.toLowerCase().startsWith(VERBATIM_DIR) ? bytes : lf(bytes) });
  }
  if (!files.some((f) => f.rel === "Settings")) {
    throw new Error(`git tracks no Settings file in ${dir}, so it is not the folder of a project`);
  }
  if (archive) files.push({ rel: ARCHIVE_IN_PROJECT, bytes: archive });

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "addin-project-"));
  try {
    const stage = path.join(tmp, path.basename(dir));
    for (const f of files) {
      const p = path.join(stage, ...f.rel.split("/"));
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, f.bytes);
    }
    const out = path.join(tmp, "project.twinproj");
    importProject(out, stage);
    return {
      bytes: await fs.readFile(out),
      files: files.map((f) => f.rel),
      untracked: untracked.filter((rel) => !isHelp(rel)),
    };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

/**
 * Pack the add-in's folder and write the project file into each tree.
 *
 * @param {object} o
 * @param {string} o.dir        the add-in's folder
 * @param {string} [o.symbols]  the symbol index this build wrote
 * @param {Buffer} [o.archive]  the offline archive this build wrote, if it wrote one
 * @param {string[]} o.roots    the trees to write into
 * @param {string} o.rel        the file's path in each tree
 * @returns {Promise<{rel: string, bytes: number, files: number, archived: boolean, untracked: string[], roots: number, ms: number}>}
 */
export async function writeAddinProject({ dir, symbols, archive = null, roots, rel }) {
  const t0 = Date.now();
  const packed = await packAddinProject({ dir, symbols, archive });
  for (const root of roots) {
    const out = path.join(root, ...rel.split("/"));
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, packed.bytes);
  }
  return {
    rel,
    bytes: packed.bytes.length,
    files: packed.files.length,
    archived: !!archive,
    untracked: packed.untracked,
    roots: roots.length,
    ms: Date.now() - t0,
  };
}

/**
 * What the build prints for the task's result: one line, and one more when
 * files git does not track were left out. Each line starts with `indent`.
 */
export function formatAddinProject(r, dirLabel, indent = "") {
  if (!r) return "";
  if (r.failed) return `${indent}add-in project: ${r.rel} not written: ${r.error}\n`;
  const size = r.bytes >= 1048576 ? `${(r.bytes / 1048576).toFixed(1)} MB` : `${(r.bytes / 1024).toFixed(0)} KB`;
  const archive = r.archived ? "with the offline archive" : "without the offline archive";
  const trees = `${r.roots} tree${r.roots === 1 ? "" : "s"}`;
  let text = `${indent}add-in project: ${r.rel}, ${r.files} files, ${size}, ${archive}, in ${trees} (${r.ms} ms)\n`;
  if (r.untracked.length) {
    const shown = r.untracked.slice(0, 5).join(", ");
    const more = r.untracked.length > 5 ? `, and ${r.untracked.length - 5} more` : "";
    text += `${indent}  left out, as git does not track them: ${r.untracked.length} in ${dirLabel}: ${shown}${more}\n`;
  }
  return text;
}
