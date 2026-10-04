// Finding the twinBASIC install, and the compiler executable beside its IDE.
// Shared, because several tools need it and a private copy in each is how two
// of them would come to disagree.
//
// NO INSTALL PATH IS HARDCODED, here or anywhere in this tooling: an install
// path contains a username. Pass one explicitly, set TB_IDE, or unpack the IDE
// where its own zip says to, which is a twinBASIC_IDE_BETA_<n> folder on the
// Desktop.

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
  } catch {
    /* no Desktop, or unreadable */
  }
  return best?.exe ?? null;
}

/**
 * The compiler executable beside an IDE. It is the one with a command line --
 * `export`, `import` and four more verbs, none of which builds. Nothing here
 * packs or unpacks through it: impexp does, in process (tb-project.mjs). It is
 * for a reproducer's own command line (bug_repro's `cli` mode) and for a test
 * of what the compiler's own verbs do.
 */
export function compilerExe(ide) {
  return path.join(path.dirname(ide), "bin", "twinBASIC_win32.exe");
}

/** The build number of an install, for reporting. Null if it cannot be read. */
export function buildNumber(ide) {
  const m = /twinBASIC_IDE_BETA_(\d+)/.exec(ide ?? "");
  return m ? Number(m[1]) : null;
}
