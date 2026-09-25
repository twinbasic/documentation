// The symbol index's drift guard: is every URL the last committed build put in
// tB/symbols.json still in it?
//
// The index is a contract with code outside this repository. The IDE help
// add-in carries a copy of it, and an installed add-in keeps its copy until it
// is updated, so a URL the index once gave out has to go on resolving. A page
// URL is protected by `redirect_from:`, but an anchor is not -- redirects are
// whole-page stubs with no fragment remapping, so rewording `### Add` to `###
// Add method` moves `#add` to `#add-method` and every copy of the index that
// has `ToolWindows#add` now lands at the top of the page. Nothing else in the
// build can see that: the link check only follows links made inside the tree,
// and the reworded heading's own page is fine.
//
// So builder/symbol-baseline.json lists every URL the index has published, and
// the build compares, the way builder/page-baseline.mjs compares page counts:
//
//   a URL gone      the build fails and names it
//   URLs added      the list is rewritten, and the changed file turns up in
//                   `git status` to be committed with the pages that added them
//
// A URL that goes is a fault even when it is meant, because meaning it is a
// decision Permanent Links makes rules for -- a redirect where anything can
// carry the URL, and the commit message naming it. Accepting one is a flagged
// run, `--update-symbol-baseline`, which puts the shorter list in the same
// commit as the change that shortened it. The usual fix is not that but to pin
// the old anchor on the reworded heading with `{: #add }`.
//
// It writes under the same restrictions as the page guard, for the same
// reasons: never under CI, which would bless the loss it was asked to catch;
// never under --serve, whose rebuilds follow every half-typed heading; and
// only for the source tree the list describes.

import { readFile, writeFile } from "node:fs/promises";
import { GUARDED_SRC } from "./page-baseline.mjs";

export const SYMBOL_BASELINE_PATH = new URL("./symbol-baseline.json", import.meta.url);

const ACCEPT_CMD_WIN = "build.bat --update-symbol-baseline";
const ACCEPT_CMD_POSIX =
  "node builder/tbdocs.mjs --src docs --check-audit-index --update-symbol-baseline";

// How many lost URLs the failure names before it summarises the rest.
const SHOWN = 25;

async function readBaseline(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

// One URL to a line, so a diff of the file reads as the URLs that came and went.
async function writeBaseline(file, src, urls) {
  const body = urls.map((u) => `    ${JSON.stringify(u)}`).join(",\n");
  await writeFile(file, `{\n  "src": ${JSON.stringify(src)},\n  "urls": [\n${body}\n  ]\n}\n`, "utf8");
}

/**
 * Compare this build's symbol-index URLs with the committed list.
 *
 * @param {object} o
 * @param {string} o.src        this build's source root, repo-relative with
 *                              forward slashes; anything but GUARDED_SRC is
 *                              skipped
 * @param {Iterable<string>} o.urls  every URL in this build's index
 * @param {boolean} o.write     may the list be rewritten? (false under CI,
 *                              --serve and --dry-run)
 * @param {boolean} [o.force]   write it whatever changed (--update-symbol-baseline)
 * @param {URL|string} [o.file] the list to read and write; only the self-test
 *                              passes one
 * @returns {Promise<{failed: boolean, text: string}>}
 */
export async function checkSymbolBaseline({ src, urls, write, force = false, file = SYMBOL_BASELINE_PATH }) {
  if (src !== GUARDED_SRC) return { failed: false, text: "" };
  const current = [...new Set(urls)].sort();
  const baseline = await readBaseline(file);

  if (force) {
    await writeBaseline(file, src, current);
    const was = baseline?.urls?.length;
    return { failed: false, text: `symbol baseline updated: ${was ?? "-"} -> ${current.length} URLs\n` };
  }

  if (!baseline) {
    if (!write) {
      return {
        failed: true,
        text: "ERROR: builder/symbol-baseline.json is missing, so nothing checks that the symbol\n"
            + "       index still has every URL it has published.\n"
            + "       Restore it from git, or regenerate it with:\n"
            + `         ${ACCEPT_CMD_WIN}\n`
            + `         ${ACCEPT_CMD_POSIX}\n`,
      };
    }
    await writeBaseline(file, src, current);
    return { failed: false, text: `symbol baseline created: ${current.length} URLs\n` };
  }

  const now = new Set(current);
  const lost = (baseline.urls ?? []).filter((u) => !now.has(u));
  if (lost.length) {
    const shown = lost.slice(0, SHOWN).map((u) => `         ${u}\n`).join("");
    const more = lost.length > SHOWN ? `         ... and ${lost.length - SHOWN} more\n` : "";
    return {
      failed: true,
      text: `ERROR: ${lost.length} URL(s) the symbol index has published are no longer in it:\n`
          + shown + more
          + "       An installed IDE help add-in keeps these. A reworded heading moves its anchor:\n"
          + "       pin the old one on it, as `{: #add }`. If the symbol is retired, follow\n"
          + "       Permanent Links and record the removal in the same commit:\n"
          + `         ${ACCEPT_CMD_WIN}\n`
          + `         ${ACCEPT_CMD_POSIX}\n`,
    };
  }

  const known = new Set(baseline.urls ?? []);
  const added = current.filter((u) => !known.has(u)).length;
  if (added && write) {
    await writeBaseline(file, src, current);
    return { failed: false, text: `symbol baseline raised: +${added} URLs (commit builder/symbol-baseline.json)\n` };
  }
  return { failed: false, text: "" };
}
