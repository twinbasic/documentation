// Finding the twinBASIC install. Shared, because three tools now need it and a
// third private copy is how two of them would come to disagree.
//
// NO INSTALL PATH IS HARDCODED, here or anywhere in this tooling: an install
// path contains a username. Pass one explicitly, set TB_IDE, or unpack the IDE
// where its own zip says to, which is a twinBASIC_IDE_BETA_<n> folder on the
// Desktop.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * The twinBASIC IDE executable, or null.
 *
 * @param {string} [explicit]  a path from --ide, which wins outright
 */
export function findIde(explicit) {
  const named = explicit ?? process.env.TB_IDE;
  if (named) return named;
  const desktop = path.join(process.env.USERPROFILE ?? "", "Desktop");
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

/** The build number of an install, for reporting. Null if it cannot be read. */
export function buildNumber(ide) {
  const m = /twinBASIC_IDE_BETA_(\d+)/.exec(ide ?? "");
  return m ? Number(m[1]) : null;
}
