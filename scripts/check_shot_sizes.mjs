// The gate on rule 4 of WIP.ShotReview.md (One way to take pictures): every page that shows a
// screenshot of the manifest (test/shots/manifest.json) declares the size its pixels are shown
// at, `{:width="..." height="..."}`, its pixels divided by its scale (2, or the manifest's `scale`
// for a program's window), rounded (scripts/lib/shot-sizes.mjs).
//
// The tools set those sizes whenever they write a picture: shoot_docs.mjs, its --cleanup and the
// screenshot review tool. A size typed by hand, a picture copied in, or a page that starts showing
// a picture later are what this gate is for. A size that is wrong makes the picture blurred or
// stretched, and nothing else notices: the build checks the link, not the numbers.
//
// It reads the pages under docs/ and the pictures' headers, not the built site, so it needs no
// build; it is in check.bat because it means nothing without the documentation.

import path from "node:path";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { DOCS_DIR, REPO_ROOT } from "../lib/repo-paths.mjs";
import { MANIFEST, openManifest } from "./lib/shot-manifest.mjs";
import { isDark, sizeMismatches } from "./lib/shot-sizes.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_shot_sizes.mjs [--docs <dir>] [--manifest <file>] [-h, --help]

Checks that every page showing a screenshot of the manifest declares the size
its pixels are shown at: {:width="..." height="..."}, its pixels divided by its
scale (2, or the manifest's scale), rounded.

  --docs <dir>        the pages and pictures (default: docs)
  --manifest <file>   the screenshot manifest (default: test/shots/manifest.json)
  -h, --help          print this text and exit

Exit codes:
  0  every reference declares its picture's size
  1  at least one reference declares another size
  2  the gate could not run: a refused command line, a manifest that cannot be
     read, or a crash`;

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      docs: { type: "string" },
      manifest: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    stopAt: ["help"],
  }),
);
if (cli.values.help) printHelpAndExit(USAGE);

const docsRoot = path.resolve(cli.values.docs ?? DOCS_DIR);
let manifest;
try {
  manifest = openManifest(cli.values.manifest ? path.resolve(cli.values.manifest) : MANIFEST);
} catch (e) {
  console.error(`check_shot_sizes: ${e.message}`);
  process.exit(2);
}
const pictures = Object.keys(JSON.parse(manifest.text()).pictures).filter(isDark);
const wrong = sizeMismatches(docsRoot, pictures, manifest.entry);
const rel = (p) => path.relative(REPO_ROOT, path.join(docsRoot, p)).replace(/\\/g, "/");
for (const w of wrong) {
  const declared =
    w.declared.width === null || w.declared.height === null ? "no size" : `${w.declared.width}x${w.declared.height}`;
  const scale = manifest.entry(w.out)?.scale;
  console.error(
    `${rel(w.page)}:${w.line}: ${w.out} declares ${declared}; its pixels are shown at {:width="${w.shown.width}" height="${w.shown.height}"}${scale ? ` (scale ${scale})` : ""}`,
  );
}
if (wrong.length) {
  console.error(
    `check_shot_sizes: ${wrong.length} reference${wrong.length === 1 ? "" : "s"} to a screenshot declare${wrong.length === 1 ? "s" : ""} another size than its pixels. The screenshot tools set these sizes when they write a picture; set them as the lines above say.`,
  );
  process.exit(1);
}
console.log(
  `check_shot_sizes: ${pictures.length} screenshots of the manifest, every reference to them sized from its pixels`,
);
