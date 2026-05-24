// Phase 2 build-info capture. Two `git` shell-outs (parallel) to
// produce { commit, commitDate } for the PDF title page. Falls back to
// "unknown" placeholders when git is missing or this isn't a repo
// (tarball install) so the build never aborts on it.
//
// See builder/PLAN-2.md §5.9. Ports: _plugins/build-info.rb.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function captureBuildInfo() {
  const [commit, commitDate] = await Promise.all([
    git("rev-parse", "--short", "HEAD"),
    git("log", "-1", "--format=%cs"),
  ]);
  return { commit, commitDate };
}

async function git(...args) {
  try {
    const { stdout } = await exec("git", args);
    return stdout.trim();
  } catch {
    return "unknown";
  }
}
