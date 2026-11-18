// Phase 2 build-info capture. One `git` shell-out to produce
// { commit, commitDate } for the PDF title page. Falls back to
// "unknown" placeholders when git is missing or this isn't a repo
// (tarball install) so the build never aborts on it.
//
// One process, not two: on Windows a `git` takes a few tenths of a second to
// start, more while the lanes boot. `%h` is the abbreviation `rev-parse
// --short HEAD` prints.
//
// See builder/PLAN-2.md §5.9. Ports: _plugins/build-info.rb.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function captureBuildInfo() {
  try {
    const { stdout } = await exec("git", ["log", "-1", "--format=%h %cs"]);
    const [commit, commitDate] = stdout.trim().split(" ");
    if (commit && commitDate) return { commit, commitDate };
  } catch {
    // Not a repository, or no git.
  }
  return { commit: "unknown", commitDate: "unknown" };
}
