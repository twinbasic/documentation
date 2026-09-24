// Staging an exported twinBASIC source tree as a project the harness can build.
//
// The harness never builds the tree it is given. It copies the tree, changes
// settings in the copy, and packs the copy into a .twinproj with the compiler
// executable's `import` verb. Two of those changes matter to every caller:
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

import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runCompiler } from "./tb-install.mjs";

/**
 * Copy an exported source tree, change its settings, and pack it.
 *
 * @param {object} o
 * @param {string} o.src       the exported tree: the folder holding Settings and Sources
 * @param {string} o.stage     where the copy goes; anything there is replaced
 * @param {string} o.project   the .twinproj to write
 * @param {string} o.compiler  the compiler executable (tb-install's compilerExe)
 * @param {object | ((original: object) => object)} [o.settings]  settings to
 *   set in the copy, or a function from the tree's own settings to them
 * @returns {{original: object, settings: object}} the tree's settings, and the copy's
 */
export function stageProject({ src, stage, project, compiler, settings = {} }) {
  rmSync(stage, { recursive: true, force: true });
  cpSync(src, stage, { recursive: true });
  const file = path.join(stage, "Settings");
  const original = JSON.parse(readFileSync(file, "utf8"));
  const staged = { ...original, ...(typeof settings === "function" ? settings(original) : settings) };
  writeFileSync(file, JSON.stringify(staged, null, "\t"), "utf8");

  // import's exit code does not say whether it worked -- 0 on the failures it
  // reports, 999 on a tree holding an embedded package -- so runCompiler reads
  // the output instead.
  const pack = runCompiler(compiler, ["import", project, stage, "--overwrite"]);
  if (!pack.done) throw new Error(`packing failed${pack.why}:\n${pack.tail}`);
  return { original, settings: staged };
}

/**
 * A project id that belongs to the harness, one per role and lane.
 *
 * Every harness id starts 7B247, and the digit after that is the role: 0 is
 * tbrun's probe, 1 an add-in being built, 2 the project an add-in test opens,
 * and 4 and 5 are check_examples' template and batches, which it numbers
 * itself. The last six hex digits are the lane's DevTools port, which is what
 * already has to differ between runs going on at once.
 */
export const laneProjectId = (role, port) =>
  `{7B247${role}00-0000-4000-9000-7B247${role}${port.toString(16).padStart(6, "0")}}`;
