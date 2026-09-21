// The allowlist that decides what may reach a published tree.
//
// discover() files every non-page it finds under docs/ as a static file and
// write.mjs copies it verbatim, so **the source tree's shape is the site's
// shape**. The only filter is _config.yml's `exclude:`, and a denylist can
// only refuse what someone thought to name in advance. Measured against the
// real config, every one of these published at a public URL on a green
// build: a scratch `NOTES.md` with no frontmatter, a `Dim.md.bak`, a
// `sample.twin`, a `secrets.json`, a `draft.docx`, a `deploy.pem`, a
// `Thumbs.db`, a `build.log`.
//
// So the rule is inverted here: name what may ship, and refuse the rest.
// A new asset type is then a deliberate one-line edit to this file, which
// is the whole point -- the cost of adding `.webp` is paid once, by the
// person who knows they are adding it, instead of being paid silently by
// whoever drops a key file into docs/ three years from now.
//
// Two enforcement points, both unconditional (they do not ride on
// `--check`, because a build run without checks is exactly when a stray
// file would otherwise slip through):
//
//   * SOURCE -- over the static-file inventory, in the `discover` task.
//     Names the file on disk and aborts before anything is written.
//   * TREE   -- over each tree's derived inventory, in the `dispatch`
//     task. Covers what the source sweep structurally cannot see:
//     generated auxiliaries, vendored theme assets, redirect stubs, and
//     the offline tree's own substitutions.
//
// Unlike the link check, a finding here ABORTS. A broken link still leaves
// a tree worth inspecting; a tree with a private key in it is a tree
// nobody should be one `upload-pages-artifact` away from publishing.

// ── The lists ───────────────────────────────────────────────────────

// What a file discovered under docs/ may carry. Lowercase, dot included.
//
// `.md` is deliberately absent. A markdown file that reaches this check is
// one discover() could not parse frontmatter from, which is the shape of
// the AppGlobalClassObject bug -- a UTF-8 BOM in front of the `---` made
// gray-matter report no frontmatter, the page was filed as a static asset,
// and its raw markdown was served verbatim for months. stripBom() fixed
// that cause; this refuses the whole class.
export const SOURCE_EXTENSIONS = new Set([
  ".css",
  ".gif",
  ".html",
  ".jpeg",
  ".jpg",
  ".js",
  ".png",
  ".svg",
  ".txt",     // the three font licences under assets/fonts/
  ".woff2",
]);

// Additionally emitted by the build itself, never by a contributor:
// sitemap.xml and assets/js/search-data.json. Kept separate from
// SOURCE_EXTENSIONS on purpose -- folding them in would bless a stray
// `docs/secrets.json`, and `.json` is one of the extensions most worth
// refusing at source.
export const BUILD_EXTENSIONS = new Set([
  ".json",
  ".xml",
]);

// Files that legitimately have no extension. CNAME is GitHub Pages'
// custom-domain marker and has to sit at the site root under that exact
// name.
export const EXTENSIONLESS_FILENAMES = new Set([
  "CNAME",
]);

// ── Policy ──────────────────────────────────────────────────────────

// `bundle_extra` entries are individually declared in _config.yml, with
// both their source and their published path spelled out, so they are
// exempt from the extension rule -- that is what declaring one means.
// It is how `Features/Packages/downloads/impexp.py` and `impexp.mjs` ship
// while a stray `.py` or `.mjs` anywhere else still fails.
export function publishPolicyFor(config) {
  const declared = new Set();
  for (const entry of config?.bundle_extra ?? []) {
    if (entry?.dest) declared.add(posix(String(entry.dest)));
  }
  return { declared };
}

// Returns null when `rel` may be published, or a short reason when it may
// not. `extensions` is the set in force for this surface.
function refuse(rel, extensions, declared) {
  const r = posix(rel);
  if (declared.has(r)) return null;

  const base = r.slice(r.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");

  if (dot <= 0) {
    // `dot === 0` is a dotfile; fast-glob runs with `dot: false` so one
    // cannot arrive from source, but the tree sweep should still refuse it.
    if (EXTENSIONLESS_FILENAMES.has(base)) return null;
    return dot === 0 ? "dotfile" : "no extension";
  }

  const ext = base.slice(dot).toLowerCase();
  if (extensions.has(ext)) return null;

  if (ext === ".md") {
    // Not "check for a BOM": stripBom() removes one before parsing, so a
    // BOM'd page renders normally and never reaches here. Nor is it
    // malformed YAML, which throws its own error naming the file and the
    // parse fault. What is left is gray-matter finding no frontmatter
    // block at all -- either there is none, or something precedes the
    // opening `---`.
    return "markdown with no frontmatter block -- it would be served as " +
           "raw markdown (the opening `---` must be the first line)";
  }
  return `${ext} is not a publishable type`;
}

// SOURCE sweep. `staticFiles` is discover()'s inventory, after
// bundle_extra and the dot / vendorAssets appends.
export function unpublishableSourceFiles(staticFiles, policy) {
  const out = [];
  for (const f of staticFiles) {
    const why = refuse(f.destRel, SOURCE_EXTENSIONS, policy.declared);
    if (why) out.push({ rel: posix(f.destRel), from: f.srcPath, why });
  }
  return out.sort(byRel);
}

// TREE sweep. `rels` is a derived tree inventory (deriveTreeRels), which
// is every path the tree will hold: pages, redirect stubs, static files,
// vendored theme assets and generated auxiliaries.
export function unpublishableTreePaths(rels, policy) {
  const extensions = new Set([...SOURCE_EXTENSIONS, ...BUILD_EXTENSIONS]);
  const out = [];
  for (const rel of rels) {
    const why = refuse(rel, extensions, policy.declared);
    if (why) out.push({ rel: posix(rel), why });
  }
  return out.sort(byRel);
}

// ── Reporting ───────────────────────────────────────────────────────

// One message for both sweeps. Lists every finding rather than the first
// few: the set is small by construction (a clean build reports none), and
// a contributor who added four scratch files wants all four named.
//
// The two surfaces end differently, and only the source one names
// `bundle_extra`. A declared path is exempt on both, and the source sweep
// runs first (`discover`, which `dispatch` depends on transitively), so
// anything still standing at the tree sweep was minted by the build --
// where declaring a source file is no remedy at all.
//
// The order of the source remedies is deliberate: widening
// SOURCE_EXTENSIONS for one download publishes every file of that type
// under docs/ from then on, which is the `secrets.json` case the whole
// allowlist exists to refuse, reintroduced by the person fixing a build
// failure. It goes last, and says what it costs.
export function formatPublishRefusal(findings, { surface, label }) {
  const one = findings.length === 1;
  const lines = findings.map(f => f.from
    ? `  ${f.rel}\n      from ${f.from}\n      ${f.why}`
    : `  ${f.rel}\n      ${f.why}`);
  return (
    `${findings.length} file${one ? "" : "s"} would be published from ` +
    `${label} but ${one ? "is" : "are"} not a publishable ` +
    `type:\n${lines.join("\n")}\n\n` +
    (surface === "source"
      ? `Either remove ${one ? "it" : "them"} from docs/, or add a pattern ` +
        "to `exclude:` in docs/_config.yml. To publish one file, declare it " +
        "there under `bundle_extra:` with `src` (resolved against docs/, so " +
        "it may live outside) and `dest` -- exempt by path, which is how " +
        "scripts/impexp.py ships. Add the extension to SOURCE_EXTENSIONS in " +
        "builder/publish-policy.mjs only when the site is genuinely gaining " +
        "an asset type: that publishes every file of that type under docs/, " +
        "now and later.\n"
      : `Nothing in docs/ produced ${one ? "this" : "these"}; ` +
        `${one ? "it comes" : "they come"} from the build itself ` +
        "(generated auxiliaries, vendored theme assets, redirect stubs). " +
        "Add the extension to BUILD_EXTENSIONS in builder/publish-policy.mjs " +
        "if the new output is intended.\n")
  );
}

function byRel(a, b) { return a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0; }

function posix(p) { return String(p).replaceAll("\\", "/"); }
