// The pictures of a bug reproducer (scripts/bug_repro.mjs): what repro.json's `images` key
// means, the files that must stand behind it, and the three PNG files each picture has.
//
// A graphical defect is shown best by what twinBASIC drew beside what VB6 drew. The two
// capture modules in test/repro-templates/png/ (PngDump.twin, PngDump.bas) save a picture
// as <name>.png in the folder bug_repro names in BUGREPRO_IMAGES, and bug_repro keeps
// them in bugs/<slug>/images/:
//
//     <name>-tb.png       from `run`
//     <name>-vb6.png      from `vb6`
//     <name>-compare.png  both and their difference, written when both exist: the picture
//                         that goes into the issue
//
// Everything here reads or writes files and judges, and starts nothing, so test/png.test.mjs
// runs it without twinBASIC or VB6. PNG decoding, comparison and drawing are lib/png.mjs.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { comparePngs, composeComparison, decodePng, encodePng } from "./png.mjs";
import { fileEntry } from "./zip.mjs";

/** The environment variable the capture modules read the folder from. */
export const IMAGES_ENV = "BUGREPRO_IMAGES";
/** The folder of a reproducer that holds its pictures. */
export const IMAGES_DIR = "images";
/** A picture's name: what PngDump accepts. */
export const IMAGE_NAME = /^[A-Za-z0-9_-]+$/;
/** The templates `new --with-images` copies, and the files a reproducer's copies are compared with. */
export const PNG_TEMPLATES = path.join(REPO_ROOT, "test", "repro-templates", "png");
export const PNGDUMP_TWIN = "PngDump.twin";
export const PNGDUMP_BAS = "PngDump.bas";
/** The line Probe.vbp needs to build PngDump.bas. */
export const PNGDUMP_VBP_LINE = "Module=PngDump; PngDump.bas";
/** The file `run` writes beside the pictures, saying which beta drew the twinBASIC ones. */
export const BETA_FILE = "tb-beta.txt";

/** A fault in a picture or its files that the command reports and ends on. */
export class ImageError extends Error {}

/**
 * Why a value is not a valid `images` list, or null. The answer is `{ key, why }`, the key
 * being `images` or one element of it.
 */
export function imagesKeyProblem(images) {
  if (!Array.isArray(images) || !images.length) {
    return { key: "images", why: "must be a non-empty list of picture names" };
  }
  for (const [i, name] of images.entries()) {
    const key = `images[${i}]`;
    if (typeof name !== "string" || !IMAGE_NAME.test(name)) {
      return { key, why: `must be a name of letters, digits, - and _, got ${JSON.stringify(name)}` };
    }
    if (images.indexOf(name) !== i) return { key, why: `names ${name} twice` };
  }
  return null;
}

/** Text with every line ending as `\n`, so that a checkout's CRLF and an editor's LF compare equal. */
export const normaliseEol = (text) => String(text).replace(/\r\n?/g, "\n");

/** Every file called `name` under `dir`, as paths, in name order; none when `dir` is not there. */
export function findFiles(dir, name) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const found = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const at = path.join(dir, e.name);
    if (e.isDirectory()) found.push(...findFiles(at, name));
    else if (e.name === name) found.push(at);
  }
  return found;
}

/** Whether a Probe.vbp builds PngDump.bas. */
export const hasPngModule = (vbp) => /^[ \t]*Module[ \t]*=[ \t]*PngDump[ \t]*;[ \t]*PngDump\.bas[ \t]*$/im.test(vbp);

/**
 * A Probe.vbp with the line that builds PngDump.bas, after its last Module line (or, when it has
 * none, after the Type line, or first). A project that has it is returned as it is. The line
 * ending is the project's own.
 */
export function addPngModule(vbp) {
  if (hasPngModule(vbp)) return vbp;
  const eol = vbp.includes("\r\n") ? "\r\n" : "\n";
  const lines = vbp.split(/\r?\n/);
  const trailing = lines[lines.length - 1] === "" ? lines.pop() : null;
  let at = -1;
  lines.forEach((l, i) => {
    if (/^\s*Module\s*=/i.test(l)) at = i;
  });
  if (at < 0) at = lines.findIndex((l) => /^\s*Type\s*=/i.test(l));
  lines.splice(at + 1, 0, PNGDUMP_VBP_LINE);
  return lines.join(eol) + (trailing === null ? "" : eol);
}

/**
 * What stands wrong behind an `images` key in the reproducer at `dir`: `errors` stop the command,
 * `warnings` do not, because a filed reproducer must stay as it was filed.
 *
 * The twinBASIC side needs a PngDump.twin under src/Sources/; a vb6/ folder, if there is one, needs
 * PngDump.bas and a Probe.vbp that builds it. Each copy that differs from the template (line
 * endings aside) draws a warning.
 *
 * @param {string} dir  the reproducer's folder
 * @param {string} [templates]  where the templates are (a probe's own folder)
 * @returns {{errors: string[], warnings: string[]}}
 */
export function imageSourceCheck(dir, templates = PNG_TEMPLATES) {
  const errors = [];
  const warnings = [];
  const rel = (f) => path.relative(dir, f).replaceAll("\\", "/");
  const drift = (file, templateName) => {
    const template = path.join(templates, templateName);
    if (!existsSync(template)) return;
    if (normaliseEol(readFileSync(file, "latin1")) !== normaliseEol(readFileSync(template, "latin1"))) {
      warnings.push(`${rel(file)} differs from test/repro-templates/png/${templateName}`);
    }
  };
  const twins = findFiles(path.join(dir, "src", "Sources"), PNGDUMP_TWIN);
  if (!twins.length) errors.push(`images needs a ${PNGDUMP_TWIN} under src/Sources/: new --with-images copies it`);
  for (const file of twins) drift(file, PNGDUMP_TWIN);
  const vb6 = path.join(dir, "vb6");
  if (existsSync(vb6) && statSync(vb6).isDirectory()) {
    const bas = path.join(vb6, PNGDUMP_BAS);
    if (!existsSync(bas))
      errors.push(`images needs vb6/${PNGDUMP_BAS}, because vb6/ exists: new --with-images copies it`);
    else drift(bas, PNGDUMP_BAS);
    const vbp = path.join(vb6, "Probe.vbp");
    if (existsSync(vbp) && !hasPngModule(readFileSync(vbp, "latin1"))) {
      errors.push(`vb6/Probe.vbp needs the line ${PNGDUMP_VBP_LINE}`);
    }
  }
  return { errors, warnings };
}

/**
 * `new --with-images`: PngDump.twin into src/Sources/ and, with `withVb6`, PngDump.bas into vb6/ and
 * its line into Probe.vbp. The reproducer's folder must already have both.
 */
export function copyImageTemplates(dir, { withVb6, templates = PNG_TEMPLATES }) {
  const sources = path.join(dir, "src", "Sources");
  mkdirSync(sources, { recursive: true });
  copyFileSync(path.join(templates, PNGDUMP_TWIN), path.join(sources, PNGDUMP_TWIN));
  if (!withVb6) return;
  copyFileSync(path.join(templates, PNGDUMP_BAS), path.join(dir, "vb6", PNGDUMP_BAS));
  const vbp = path.join(dir, "vb6", "Probe.vbp");
  writeFileSync(vbp, addPngModule(readFileSync(vbp, "latin1")), "latin1");
}

/** The path of one of a picture's three files in an images folder: kind is `tb`, `vb6` or `compare`. */
export const imageFile = (imagesDir, name, kind) => path.join(imagesDir, `${name}-${kind}.png`);

/** The label over the twinBASIC panel. */
export const tbLabel = (beta) => (beta ? `TWINBASIC BETA ${beta}` : "TWINBASIC");

/** The beta `run` recorded beside the pictures, or null. */
export function recordedBeta(imagesDir) {
  const file = path.join(imagesDir, BETA_FILE);
  if (!existsSync(file)) return null;
  const n = Number.parseInt(readFileSync(file, "utf8"), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** What a picture's comparison says, in the line the commands print. */
export function comparisonLine(name, a, b, { sameSize, differing }) {
  if (!differing) return `image ${name}: identical`;
  const sizes = sameSize ? "" : `sizes differ (twinBASIC ${a.width}x${a.height}, VB6 ${b.width}x${b.height}), `;
  return `image ${name}: ${sizes}${differing} pixels differ`;
}

function readPng(file, what) {
  try {
    return decodePng(readFileSync(file));
  } catch (e) {
    throw new ImageError(`${what} ${file} cannot be read: ${e.message}`);
  }
}

/**
 * When both `<name>-tb.png` and `<name>-vb6.png` are in `imagesDir`, writes `<name>-compare.png`
 * beside them and says what they show; null when one is missing. `beta` labels the twinBASIC panel;
 * the beta `run` recorded is used when it is not given.
 *
 * @returns {{line: string, sameSize: boolean, differing: number, file: string} | null}
 */
export function writeComparison(imagesDir, name, beta = recordedBeta(imagesDir)) {
  const tbFile = imageFile(imagesDir, name, "tb");
  const vb6File = imageFile(imagesDir, name, "vb6");
  if (!existsSync(tbFile) || !existsSync(vb6File)) return null;
  const tb = readPng(tbFile, "the twinBASIC picture");
  const vb6 = readPng(vb6File, "the VB6 picture");
  const composed = composeComparison(tb, vb6, { tb: tbLabel(beta) });
  const file = imageFile(imagesDir, name, "compare");
  writeFileSync(file, encodePng(composed));
  return {
    line: comparisonLine(name, tb, vb6, composed),
    sameSize: composed.sameSize,
    differing: composed.differing,
    file,
  };
}

/**
 * Compares the pictures a run has just made, `<name>.png` in `freshDir`, with the VB6 pictures a
 * reproducer has kept, `<name>-vb6.png` in `keptDir`. A picture missing on either side throws an
 * ImageError that names it.
 *
 * @returns {{name: string, sameSize: boolean, differing: number}[]}
 */
export function compareWithKept(freshDir, keptDir, names) {
  return names.map((name) => {
    const fresh = path.join(freshDir, `${name}.png`);
    const kept = imageFile(keptDir, name, "vb6");
    if (!existsSync(fresh)) throw new ImageError(`the run wrote no picture ${name}.png`);
    if (!existsSync(kept)) throw new ImageError(`there is no ${IMAGES_DIR}/${name}-vb6.png to compare with`);
    const { sameSize, differing } = comparePngs(readPng(fresh, "the picture"), readPng(kept, "the picture"));
    return { name, sameSize, differing };
  });
}

/**
 * Why a run does not reproduce what `expect.imagesDiffer` says, as problems, none when it does.
 * `true` reproduces when at least one picture differs, a size difference counting; `false` when every
 * picture matches.
 */
export function imagesDifferProblems(expected, results) {
  const differs = (r) => !r.sameSize || r.differing > 0;
  if (expected) {
    return results.some(differs) ? [] : ["every picture matches its VB6 picture, and imagesDiffer is true"];
  }
  return results
    .filter(differs)
    .map((r) =>
      r.sameSize
        ? `picture ${r.name} differs from its VB6 picture in ${r.differing} pixels, and imagesDiffer is false`
        : `picture ${r.name} is not the size of its VB6 picture, and imagesDiffer is false`,
    );
}

/** The files of a reproducer's pictures folder, as zip entries named `images/<file>`; none without the folder. */
export function imageZipEntries(dir) {
  const images = path.join(dir, IMAGES_DIR);
  if (!existsSync(images) || !statSync(images).isDirectory()) return [];
  return readdirSync(images, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort()
    .map((file) => fileEntry(`${IMAGES_DIR}/${file}`, path.join(images, file)));
}

/**
 * Copies the pictures a probe wrote, `<name>.png` in `fromDir`, to `<name>-<kind>.png` in `toDir`.
 * Returns the names it found and the names that are missing.
 */
export function collectImages(fromDir, toDir, names, kind) {
  const found = [];
  const missing = [];
  for (const name of names) {
    const file = path.join(fromDir, `${name}.png`);
    if (!existsSync(file)) {
      missing.push(name);
      continue;
    }
    mkdirSync(toDir, { recursive: true });
    copyFileSync(file, imageFile(toDir, name, kind));
    found.push(name);
  }
  return { found, missing };
}
