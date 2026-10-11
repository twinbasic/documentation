#!/usr/bin/env node
// Find the images the IDE's own style sheets label with the wrong media type.
//
//     node scripts/probe_ide_image_labels.mjs [options]
//
// The defect is the entry of BUGS-TO-REPORT.md whose reproducer is
// bugs/ide-stylesheet-image-labels/: the IDE's styles.css embeds images as
// data: URIs, and some are labelled with a type their bytes do not have: a GIF
// and a JPEG labelled image/png, and two PNGs labelled /png, a type with no
// "image" in front of the slash.
//
// The probe reads every .css file under the ide folder of the install and hands
// it to stripFile (scripts/lib/compact-image.mjs), which names each image by its
// bytes, whatever the page called it, and reports each label it would change.
// The stripped output is thrown away; nothing in the install is written. This
// is the half of test/compact-image.test.mjs that reads the IDE's stylesheets,
// turned into a report.
//
// Exit codes: see USAGE.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { die, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { stripFile } from "./lib/compact-image.mjs";
import { buildNumber, findIde } from "./lib/tb-install.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/probe_ide_image_labels.mjs [--ide <twinBASIC.exe>] [-h, --help]

Reads the style sheets of the twinBASIC IDE, every .css file under the ide folder
of the install, and compares the media type each embedded data: image is labelled
with against the type its bytes have (PNG, JPEG, GIF or BMP), as stripFile in
scripts/lib/compact-image.mjs does when it strips an image. Nothing is written.

The probe prints one line for each mislabelled image, \`<file> line <n>: labelled
<label>, the bytes are <kind>\`, with the file relative to the install, and last a
summary line, \`<n> of <total> images in the IDE's stylesheets are mislabelled
(BETA <build>)\` or \`none of the <total> images in the IDE's stylesheets is
mislabelled (BETA <build>)\`. Any other report of stripFile, such as a data: URI
labelled as an image whose base64 cannot be read, is printed as a \`note:\` line and
does not count.

  --ide <path>   twinBASIC.exe (default: $TB_IDE, else the newest
                 twinBASIC_IDE_BETA_* on the Desktop); its stylesheets are the
                 .css files under the ide folder beside it
  -h, --help     print this text and exit

Exit codes:
  0  every embedded image is labelled with the type its bytes have
  1  at least one is not: the defect is there
  2  the probe could not do its job: a refused command line, no IDE, no ide folder,
     no stylesheet or no embedded image in it to check, or a crash`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

const { values } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        ide: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

/** The .css files under `dir`, in path order. */
function stylesheets(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...stylesheets(full));
    else if (/\.css$/i.test(entry.name)) found.push(full);
  }
  return found;
}

const ide = findIde(values.ide);
if (!ide || !statSync(ide, { throwIfNoEntry: false })?.isFile()) {
  die(
    2,
    (ide ? `no twinBASIC IDE at ${ide}: ` : "no twinBASIC IDE found: ") +
      "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
}
const install = path.dirname(ide);
const folder = path.join(install, "ide");
if (!statSync(folder, { throwIfNoEntry: false })?.isDirectory()) die(2, `no ide folder beside ${ide}: ${folder}`);
const files = stylesheets(folder);
if (!files.length) die(2, `no .css file under ${folder}`);

// stripFile's report for a label it changes: `labelled <label>, but is <a PNG>; now labelled <type>`.
const RELABEL = /^labelled (.+), but is (an? [A-Z]+); now labelled .+$/;

let total = 0;
let mislabelled = 0;
for (const file of files) {
  const shown = path.relative(install, file).split(path.sep).join("/");
  const { images, reports } = stripFile(readFileSync(file));
  total += images;
  for (const { line, message } of reports) {
    const m = RELABEL.exec(message);
    if (m) {
      mislabelled++;
      console.log(`${shown} line ${line}: labelled ${m[1]}, the bytes are ${m[2]}`);
    } else console.log(`note: ${shown} line ${line}: ${message}`);
  }
}
if (!total)
  die(2, `${files.length} stylesheet(s) under ${folder} embed no image this reads, so there is nothing to check`);

const build = `BETA ${buildNumber(ide) ?? "?"}`;
const images = total === 1 ? "image" : "images";
console.log(
  mislabelled
    ? `${mislabelled} of ${total} ${images} in the IDE's stylesheets ${mislabelled === 1 ? "is" : "are"} mislabelled (${build})`
    : `none of the ${total} ${images} in the IDE's stylesheets is mislabelled (${build})`,
);
process.exit(mislabelled ? 1 : 0);
