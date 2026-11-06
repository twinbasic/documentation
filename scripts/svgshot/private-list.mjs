// The words this machine must not publish in a picture: the Windows user name, git's user.name
// and user.email, which the repository's own commits say, and each `find` of
// scripts/svgshot/private.json, the file the Chrome extension masks by. Nothing is written down
// that git would take: the file is ignored, and the rest is read from the machine.

import { existsSync, readFileSync } from "node:fs";
import { userInfo } from "node:os";
import path from "node:path";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { runGit } from "../lib/shot-revision.mjs";
import { wordList } from "./private-words.mjs";

/** The extension's list of private words (git ignores it). */
export const PRIVATE_FILE = path.join(REPO_ROOT, "scripts", "svgshot", "private.json");

/** The entries of the file `file` (wordList), or none when there is no such file. */
export function privateEntries(file = PRIVATE_FILE) {
  if (!existsSync(file)) return [];
  try {
    return wordList(JSON.parse(readFileSync(file, "utf8")).words);
  } catch (e) {
    throw new Error(`${file}: ${e.message}`);
  }
}

/**
 * Every word a published picture must not show, as strings: `user` (the Windows user name),
 * what git says of the person, and what `file` lists. `git` stands in for running git in the
 * tests: git(args, cwd) returns its exit code and output, {status, stdout}.
 */
export function privateWords({ file = PRIVATE_FILE, user = userInfo().username, git = runGit } = {}) {
  const words = new Set([user, ...privateEntries(file).map((w) => w.find)]);
  for (const key of ["user.email", "user.name"]) {
    const said = git(["config", key], REPO_ROOT);
    if (said.status === 0 && said.stdout.trim()) words.add(said.stdout.trim());
  }
  return [...words];
}
