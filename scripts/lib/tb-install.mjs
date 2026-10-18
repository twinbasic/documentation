// Finding the twinBASIC install, and the compiler executable beside its IDE.
// Shared, because several tools need it and a private copy in each is how two
// of them would come to disagree.
//
// NO INSTALL PATH IS HARDCODED, here or anywhere in this tooling: an install
// path contains a username. Pass one explicitly, set TB_IDE, or unpack the IDE
// where its own zip says to, which is a twinBASIC_IDE_BETA_<n> folder on the
// Desktop.
//
// THE OLDEST BUILD THE TOOLS RUN IS MIN_BUILD (owner: "we never run anything
// before that"). It is the first build whose IDE takes `--no-save-ide-settings`
// and `--no-update-recent-files` (IDE_FLAGS in tb-ide.mjs), which every IDE the
// harness starts is given: an older IDE ignores both silently and writes the
// user's settings. findIde passes over an older install on the Desktop, and
// unsupportedIde names one given by --ide or TB_IDE, which every tool that
// starts an IDE refuses (launchIde refuses it too, as the last resort).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** The oldest twinBASIC build the harness runs an IDE from. */
export const MIN_BUILD = 1007;

/**
 * The twinBASIC IDE executable, or null.
 *
 * Without a path from --ide or TB_IDE, the newest twinBASIC_IDE_BETA_<n> on the
 * Desktop that holds a twinBASIC.exe and is not older than MIN_BUILD. The
 * Desktop is under USERPROFILE, else under the home folder: without the
 * fallback, a missing USERPROFILE searched a `Desktop` folder relative to the
 * working directory.
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
      if (build < MIN_BUILD) continue;
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

/**
 * The build number of an install, or null if it cannot be read. The IDE records
 * it in `ide/build.js` beside the executable (`var tbVersionInfo = 'twinBASIC
 * IDE BETA 1007';`), and a copy of an install (tb-ide-copy.mjs) carries that
 * file, so a lane's copy under the temp folder reads as its source does. The
 * name of the install's folder, twinBASIC_IDE_BETA_<n>, is the fallback, for an
 * executable whose file is not there to read.
 */
export function buildNumber(ide) {
  if (!ide) return null;
  try {
    const m = /twinBASIC IDE BETA (\d+)/.exec(readFileSync(path.join(path.dirname(ide), "ide", "build.js"), "utf8"));
    if (m) return Number(m[1]);
  } catch {
    /* no build.js: an install not unpacked whole, or no install at all */
  }
  const m = /twinBASIC_IDE_BETA_(\d+)/.exec(ide);
  return m ? Number(m[1]) : null;
}

/**
 * Why this IDE may not be run, or null: it is a build older than MIN_BUILD.
 * An IDE whose build cannot be read is not refused here; it is whatever the
 * caller's own check of the path says it is.
 */
export function unsupportedIde(ide) {
  const build = buildNumber(ide);
  if (build === null || build >= MIN_BUILD) return null;
  return (
    `the twinBASIC IDE at ${ide} is BETA ${build}, and the tools run BETA ${MIN_BUILD} or later: ` +
    "an older IDE ignores --no-save-ide-settings and --no-update-recent-files and writes your IDE settings and recent list"
  );
}
