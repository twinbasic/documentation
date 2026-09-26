// Finding the twinBASIC install, and running its compiler executable. Shared,
// because three tools now need it and a third private copy is how two of them
// would come to disagree.
//
// NO INSTALL PATH IS HARDCODED, here or anywhere in this tooling: an install
// path contains a username. Pass one explicitly, set TB_IDE, or unpack the IDE
// where its own zip says to, which is a twinBASIC_IDE_BETA_<n> folder on the
// Desktop.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The twinBASIC IDE executable, or null.
 *
 * Without a path from --ide or TB_IDE, the newest twinBASIC_IDE_BETA_<n> on the
 * Desktop that holds a twinBASIC.exe. The Desktop is under USERPROFILE, else
 * under the home folder: without the fallback, a missing USERPROFILE searched a
 * `Desktop` folder relative to the working directory.
 *
 * @param {string} [explicit]  a path from --ide, which wins outright
 */
export function findIde(explicit) {
  const named = explicit ?? process.env.TB_IDE;
  if (named) return named;
  const desktop = path.join(process.env.USERPROFILE || os.homedir(), "Desktop");
  let best = null;
  try {
    for (const name of readdirSync(desktop)) {
      const m = /^twinBASIC_IDE_BETA_(\d+)$/.exec(name);
      if (!m) continue;
      const exe = path.join(desktop, name, "twinBASIC.exe");
      if (!existsSync(exe)) continue;
      const build = Number(m[1]);
      if (!best || build > best.build) best = { build, exe };
    }
  } catch { /* no Desktop, or unreadable */ }
  return best?.exe ?? null;
}

/**
 * The compiler executable beside an IDE. It is the one with a command line --
 * `export`, `import` and four more verbs, none of which builds -- so packing a
 * source tree into a .twinproj goes through this and compiling does not.
 */
export function compilerExe(ide) {
  return path.join(path.dirname(ide), "bin", "twinBASIC_win32.exe");
}

/**
 * Run one of the compiler executable's verbs and say whether it finished.
 *
 * The exit code cannot say so. `import` and `export` exit 0 on every failure
 * they report themselves, and `import` exits 999 with no result line at all
 * when the tree has a folder inside its top-level `Packages` -- any project
 * that embeds a package (BUGS-TO-REPORT.md). A last line of `... DONE` is the
 * only success, so that is the test, whatever the exit status. Not
 * execFileSync: it throws on a non-zero exit, so a 999 escaped as an exception
 * before the output was ever read, and tbrun reported it as compile errors.
 *
 * @returns {{done: boolean, why: string, tail: string}} `why` is empty, or the
 *   exit code or spawn error in parentheses, ready to follow a word such as
 *   "packing failed"; `tail` is the last three lines of output
 */
export function runCompiler(exe, args) {
  const r = spawnSync(exe, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const out = (r.stdout ?? "").trim();
  const lines = [out, (r.stderr ?? "").trim()].filter(Boolean).join("\n").split(/\r?\n/);
  return {
    done: !r.error && /\.\.\. DONE$/.test(out),
    why: r.error ? ` (${r.error.message})` : r.status ? ` (exit code ${r.status})` : "",
    tail: lines.slice(-3).join("\n"),
  };
}

/** The build number of an install, for reporting. Null if it cannot be read. */
export function buildNumber(ide) {
  const m = /twinBASIC_IDE_BETA_(\d+)/.exec(ide ?? "");
  return m ? Number(m[1]) : null;
}
