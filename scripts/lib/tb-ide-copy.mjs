// A private copy of a twinBASIC install, one per test lane.
//
// The compiler loads every DLL in <install>\addins\win32 or \win64 as it
// starts. A test add-in built or copied there would load into every IDE the
// user starts from that install, and two lanes testing different add-ins could
// not share the folder at all. So each lane runs its own copy of the install,
// whose addins folders hold exactly what the lane put there and nothing else --
// not even the Global Search add-in the install ships with.
//
// A copy, not hardlinks. The install is 233 files and 57 MB once the sample
// projects are left out, which copies in well under a second. Hardlinks would
// save that, at the price of sharing every file with the user's install, so
// that any write the IDE made into its own folder would land in the real one.
// None was measured -- a compile, a compiler crash and a build-and-run session
// changed no file, not even an mtime (WIP.HelpAddin.md, P11) -- but a copy
// makes the question irrelevant instead of merely answered.
//
// Left out: projects\ (the samples and New Project templates, 29 MB; a test
// opens its project on the command line and never shows that dialog) and
// addins\ (recreated, holding only what the caller asks for).
//
// The copy keeps the install's folder name, twinBASIC_IDE_BETA_<n>, so that
// tb-install's buildNumber() still reads the build off its path.
//
// Starting an IDE from a new path makes it register the .twinproj association
// to itself (see tb-registry.mjs). Whatever starts IDEs from a copy has to
// hold a startTidy/finishTidy around them, which tbbuild and tbrun already do.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const MARKER = ".tbharness-ide-copy";
const LEFT_OUT = new Set(["projects", "addins"]);

// A copy is created and deleted only inside the temp folder, and deleted only
// where this module left its marker: a wrong `dest` must not be able to empty
// a folder that somebody cares about.
function insideTemp(p) {
  const rel = path.relative(path.resolve(tmpdir()), path.resolve(p));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Copy an install into `dest`, with private add-in folders.
 *
 * @param {object} o
 * @param {string} o.ide       the install's twinBASIC.exe
 * @param {string} o.dest      a folder inside the temp folder; the copy goes in
 *                             `<dest>\<install folder name>`. An earlier copy
 *                             made there by this module is replaced; anything
 *                             else there is refused.
 * @param {{win32?: string[], win64?: string[]}} [o.addins]  DLLs to put in the
 *                             copy's addins folders; both are created, empty if
 *                             not named
 * @returns {string} the copy's twinBASIC.exe
 */
export function makeIdeCopy({ ide, dest, addins = {} }) {
  const install = path.dirname(path.resolve(ide));
  if (!insideTemp(dest)) throw new Error(`refusing to make an IDE copy outside ${tmpdir()}: "${dest}"`);
  const root = path.join(path.resolve(dest), path.basename(install));
  if (existsSync(root)) {
    if (!existsSync(path.join(root, MARKER))) {
      throw new Error(`refusing to replace "${root}": it is not an IDE copy this module made`);
    }
    rmSync(root, { recursive: true, force: true });
  }
  mkdirSync(root, { recursive: true });
  for (const entry of readdirSync(install)) {
    if (LEFT_OUT.has(entry.toLowerCase())) continue;
    cpSync(path.join(install, entry), path.join(root, entry), { recursive: true });
  }
  for (const arch of ["win32", "win64"]) {
    const dir = path.join(root, "addins", arch);
    mkdirSync(dir, { recursive: true });
    for (const dll of addins[arch] ?? []) cpSync(dll, path.join(dir, path.basename(dll)));
  }
  writeFileSync(path.join(root, MARKER),
    `A private copy of ${install}, made by scripts/lib/tb-ide-copy.mjs. Safe to delete.\n`);
  return path.join(root, "twinBASIC.exe");
}

/**
 * Delete a copy made by makeIdeCopy. Refuses anything without its marker, and
 * anything outside the temp folder. End the copy's IDEs first: a running IDE
 * holds its files open.
 *
 * @param {string} exe  the copy's twinBASIC.exe, as makeIdeCopy returned it
 */
export function removeIdeCopy(exe) {
  const root = path.dirname(path.resolve(exe));
  if (!insideTemp(root) || !existsSync(path.join(root, MARKER))) {
    throw new Error(`refusing to delete "${root}": it is not an IDE copy this module made`);
  }
  // Retries, because an IDE ended a moment ago can still be letting go of its
  // files. Anything still holding them after that is a leaked process, and the
  // EPERM is the right thing to report.
  rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
