// Staging an exported twinBASIC source tree as a project the harness can build.
//
// The harness never builds the tree it is given. It copies the tree, changes
// settings in the copy, and packs the copy into a .twinproj with impexp, in
// process. Two of those changes matter to every caller:
//
//   * project.buildPath becomes an explicit file. The default
//     `${SourcePath}\Build\...` template makes the IDE open a native Save
//     dialog on the build, and on the private desktop the harness uses that
//     dialog is invisible and takes no input, so the build never happens --
//     and nothing says so, because the IDE's page stays responsive.
//   * project.id becomes one of the harness's own (laneProjectId), so that two
//     projects open at once never share one: two tbrun probes that did
//     confused the IDE's recent list.
//
// Rewriting the caller's own tree would do both, but a harness that edits the
// project it was pointed at is one nobody trusts with a real project.
//
// Not the compiler executable's `import` verb: it exits 999 with nothing
// written on a tree holding an embedded package (twinbasic/twinbasic#841), and
// 0 on every failure it reports. impexp also packs the files in alphabetical
// order where the compiler packs them in reverse, and the order can decide
// what compiles (the static-ctor-args entry in BUGS-TO-REPORT.md).

import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { exportProject, importProject, readProject } from "../impexp.mjs";

// What impexp refused, with its details, for an error message.
const why = (e) => [e.message, ...(e.details ?? [])].join("\n");

/**
 * Read a project file's container and say what is wrong with it. Writes nothing.
 *
 * A project file the IDE cannot read -- empty, cut short, or not a project at
 * all -- does not make it fail. The IDE answers with a message box, which nobody
 * can see or answer on the private desktop the harness runs it on, and the run
 * goes on to its deadline, where it can read as clean. So the file is read first,
 * with the reader impexp unpacks a project with, before an IDE is started on it.
 *
 * @throws {Error} naming the file and what is wrong
 */
export function checkProject(project) {
  try {
    readProject(project);
  } catch (e) {
    throw new Error(why(e));
  }
}

/**
 * Pack a source tree into a project file, replacing the file.
 *
 * @returns {object} impexp's counts
 */
export function packTree(project, tree) {
  try {
    return importProject(project, tree, { overwrite: true });
  } catch (e) {
    throw new Error(`packing failed: ${why(e)}`);
  }
}

/**
 * Write a project's source into a folder, which should be new or empty.
 *
 * Export replaces the files it writes and leaves every other file there, and
 * the next pack would put those back in, so a folder left holding one is an
 * error rather than impexp's warning.
 *
 * @returns {object} impexp's counts
 */
export function unpackProject(project, folder) {
  let r;
  try {
    r = exportProject(project, folder, { overwrite: true });
  } catch (e) {
    throw new Error(`unpacking failed: ${why(e)}`);
  }
  if (r.stale.length) throw new Error(`unpacking left files that are not in ${project}:\n${r.stale.join("\n")}`);
  return r;
}

/**
 * Copy an exported source tree, change its settings, and pack it.
 *
 * @param {object} o
 * @param {string} o.src       the exported tree: the folder holding Settings and Sources
 * @param {string} o.stage     where the copy goes; anything there is replaced
 * @param {string} o.project   the .twinproj to write
 * @param {object | ((original: object) => object)} [o.settings]  settings to
 *   set in the copy, or a function from the tree's own settings to them
 * @param {(stage: string) => void} [o.prepare]  changes the copy before it is packed
 * @returns {{original: object, settings: object}} the tree's settings, and the copy's
 */
export function stageProject({ src, stage, project, settings = {}, prepare }) {
  rmSync(stage, { recursive: true, force: true });
  cpSync(src, stage, { recursive: true });
  const file = path.join(stage, "Settings");
  const original = JSON.parse(readFileSync(file, "utf8"));
  const staged = { ...original, ...(typeof settings === "function" ? settings(original) : settings) };
  writeFileSync(file, JSON.stringify(staged, null, "\t"), "utf8");
  prepare?.(stage);
  packTree(project, stage);
  return { original, settings: staged };
}

/**
 * A project id that belongs to the harness, one per role and lane.
 *
 * Every harness id starts 7B247, and the digit after that is the role: 0 is
 * tbrun's probe, 1 an add-in being built, 2 the project an add-in test opens,
 * 3 the project tbbuild stages for --build or --llvm, and 4 and 5 are
 * check_examples' template and batches, which it numbers itself. The last six
 * hex digits are the lane's DevTools port, which is what already has to differ
 * between runs going on at once.
 */
export const laneProjectId = (role, port) =>
  `{7B247${role}00-0000-4000-9000-7B247${role}${port.toString(16).padStart(6, "0")}}`;
