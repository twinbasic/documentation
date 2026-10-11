// A rectangle of a PNG's pixels as text: each distinct colour a letter, one
// line per row, then the colours. With --beside, the same rectangle of a second
// PNG to the right of it, in the same letters, so that a reference and a render
// can be read against each other pixel by pixel: where an edge lies, how thick
// a stroke is, which colour a blend came out as. diff.mjs says how much differs;
// this says how.

import fs from "node:fs";
import { exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../../lib/cli.mjs";
import { decodePng } from "../lib/png.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/pixels.mjs <png> <x> <y> <w> <h> [--beside <png>] [-h, --help]

Prints the pixels of the rectangle x, y, w, h (device pixels) of <png> as one
letter per pixel, a letter per distinct colour, each row numbered, and then the
colour each letter stands for (r,g,b,a). "." is the first colour met.

  --beside <png>  print the same rectangle of this PNG to the right, in the
                  same letters
  -h, --help      print this text and exit

Exit codes:
  0  printed
  2  the tool could not run: a refused command line, a file that is no PNG, a crash`;

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      beside: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    positionals: 5,
    stopAt: ["help"],
  }),
);
if (cli.values.help) printHelpAndExit(USAGE);
const [file, ...numbers] = cli.positionals;
const [x0, y0, w, h] = withUsageError(() =>
  numbers.map((v, k) =>
    numberOption(v, { option: ["<x>", "<y>", "<w>", "<h>"][k], integer: true, min: k < 2 ? 0 : 1 }),
  ),
);

const pictures = [file, cli.values.beside].filter(Boolean).map((f) => decodePng(fs.readFileSync(f)));
const LETTERS = ".abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=?@";
const palette = new Map();
const letter = (c) => {
  if (!palette.has(c)) palette.set(c, LETTERS[palette.size] ?? "~");
  return palette.get(c);
};
for (const [k, p] of pictures.entries()) console.log(`${k ? "beside: " : ""}${p.width}x${p.height}`);
for (let y = y0; y < y0 + h; y++) {
  const rows = pictures.map(({ width, height, rgba }) => {
    let row = "";
    for (let x = x0; x < x0 + w; x++) {
      if (x >= width || y >= height) {
        row += " ";
        continue;
      }
      const o = (y * width + x) * 4;
      row += letter(`${rgba[o]},${rgba[o + 1]},${rgba[o + 2]},${rgba[o + 3]}`);
    }
    return row;
  });
  console.log(`${String(y).padStart(5)} ${rows.join("  ")}`);
}
for (const [c, l] of palette) console.log(`${l} ${c}`);
