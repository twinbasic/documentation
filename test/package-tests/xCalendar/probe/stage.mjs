// Stages the xCalendar probe's source tree: the contributed template's Settings
// (test/example-projects/contributed-xCalendar), the package embedded under Packages/xCalendar as
// check_examples embeds it, and src/. Used by probe.mjs (build and run the exe) and designer.mjs
// (open the tree in an IDE and edit the control in the form designer).
//
// The package comes from the cache check_examples keeps, %TEMP%\tb-twinserv, and is downloaded from
// TWINSERV into it when it is not there. It is not read from the indexer's store: the store keeps
// only the .twin file, and the control's windows (the two combo boxes, the picture boxes) are
// declared in the xCalendar.tbcontrol designer file.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { downloadPackage } from "../../../../indexer/lib/twinserv-client.mjs";
import { embeddedPackages } from "../../../../scripts/lib/example-batches.mjs";
import { unpackProject } from "../../../../scripts/lib/tb-project.mjs";

const here = import.meta.dirname;
const template = path.join(here, "..", "..", "..", "example-projects", "contributed-xCalendar");

/** The text with CRLF line ends, as the IDE writes a source file. */
export const crlf = (text) => text.replace(/\r?\n/g, "\r\n");

/**
 * Write the source tree to %TEMP%\xcal-probe\tree-<key> and return its path.
 *
 * @param {object} o
 * @param {string} o.key       names the folder (the caller's process id)
 * @param {string} [o.form]    a .tbform file to use in place of src/Form1.tbform
 * @param {string[]} [o.set]   "Name=JSON" entries added to the control's entry in Form1.tbform
 * @throws {Error} when the package cannot be fetched or an entry of `set` is not Name=JSON
 */
export async function stageTree({ key, form, set = [] }) {
  const [embed] = embeddedPackages(JSON.parse(readFileSync(path.join(template, "Settings"), "utf8")));
  if (!embed) throw new Error("the contributed-xCalendar template embeds no package");
  const cache = path.join(tmpdir(), "tb-twinserv");
  const pkg = path.join(cache, embed.key);
  if (!existsSync(path.join(pkg, "Settings"))) {
    const file = `${pkg}.twinpack`;
    if (!existsSync(file)) {
      console.error(`probe: downloading ${embed.folder} (${embed.key}) from TWINSERV`);
      try {
        mkdirSync(cache, { recursive: true });
        writeFileSync(file, await downloadPackage(embed.id, embed.version));
      } catch (e) {
        throw new Error(`cannot download the package: ${e.message}`);
      }
    }
    unpackProject(file, pkg);
  }

  const tree = path.join(tmpdir(), "xcal-probe", `tree-${key}`);
  rmSync(tree, { recursive: true, force: true });
  mkdirSync(path.join(tree, "Sources"), { recursive: true });
  cpSync(path.join(template, "Settings"), path.join(tree, "Settings"));
  cpSync(pkg, path.join(tree, "Packages", embed.folder), { recursive: true });
  for (const f of readdirSync(path.join(here, "src"))) {
    writeFileSync(path.join(tree, "Sources", f), crlf(readFileSync(path.join(here, "src", f), "utf8")), "utf8");
  }
  const formFile = path.join(tree, "Sources", "Form1.tbform");
  if (form) writeFileSync(formFile, crlf(readFileSync(form, "utf8")), "utf8");
  if (set.length) {
    const data = JSON.parse(readFileSync(formFile, "utf8"));
    const control = data[0]._children.find((c) => c.Name === "xCalendar1");
    for (const kv of set) {
      const i = kv.indexOf("=");
      if (i < 1) throw new Error(`--set wants Name=JSON, not ${kv}`);
      try {
        control[kv.slice(0, i)] = JSON.parse(kv.slice(i + 1));
      } catch (e) {
        throw new Error(`--set ${kv}: ${e.message}`);
      }
    }
    writeFileSync(formFile, crlf(`${JSON.stringify(data, null, "\t")}\n`), "utf8");
  }
  return tree;
}
