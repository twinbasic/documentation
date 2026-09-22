// Build-time counts as named values in prose: `{{tbdocs:pages}}` renders as
// the number of pages this build discovered.
//
// Designed in PLAN-counts.md. The point is not to fix wrong numbers; it is to
// remove a class of decay. Round 2 of the use-case evaluation found stale
// figures across the developer documentation and the interesting ones were not
// mistakes -- they were correct when written, derived by hand, and attached to
// nothing that would notice when they stopped being correct. A wrong count
// breaks no link, fails no gate, and reads exactly like a right one.
//
// **A name is a derivation over build state, never a constant.** Getting that
// wrong wastes the exercise: a registry holding `{ pages: 908 }` has not
// removed the stale figure, it has moved it from a page a contributor reads
// into a module nobody opens, which is worse. If a number cannot be derived it
// does not get a name -- an assertion that needs a human to check it belongs in
// prose, where a reader can see that it is a claim.
//
// ---------------------------------------------------------------- the layer
//
// Substitution is a core rule over the inline token stream, rewriting `text`
// tokens. That is not an implementation detail; it is what makes the feature
// safe on a corpus whose subject matter is code:
//
//   prose                 text          substituted
//   `inline code`         code_inline   untouched, separate token type
//   ```fence``` / indent  fence,        untouched, block tokens with no
//                         code_block    children -- an inline walk never
//                                       reaches them at all
//   raw HTML block        html_block    untouched, and see assertNoPlaceholders
//   <span>text</span>     html_inline   the text between the tags IS a text
//                                       token, so substituted
//   image alt             image         only via the recursive descent below
//
// So no rewrite has to be taught what code is, which is the hazard
// WIP.Build.md's "Never rewrite markdown source without knowing what is code"
// records four shipped instances of.
//
// Two things about `text` tokens are easy to get wrong. They are inline text
// *runs* after inline parsing, not raw markdown -- by the time this rule runs
// the typographer has already turned `--` into an en-dash and curled the
// quotes, so a placeholder syntax containing either would not survive.
// `{{tbdocs:<name>}}` contains neither. And **image alt lives in a nested
// child**, which is why the walk recurses: markdown-it's own `replacements`
// rule does not descend into an image token's children, so a flat walk would
// leave a placeholder literal in the alt attribute. (`kramdownDashesPlugin`
// in render.mjs recurses for the same reason, which is why dashes in alt text
// DO convert -- a note in WIP.md once concluded the opposite from this same
// asymmetry.)
//
// ------------------------------------------------------------- the failures
//
// **Never silent, never literal.** A page publishing `{{tbdocs:pgaes}}` to
// readers is the failure this feature exists to prevent, arriving by a new
// route; a placeholder rendering as empty is worse. Both abort the build, and
// it takes two checks rather than one because they fail differently:
//
//   - `validateCountNames` scans the source, with code regions masked by the
//     renderer's own `maskCodeRegions`, and rejects an unknown name. This is
//     the typo case, and it names the file, the line and the nearest match.
//   - `assertNoPlaceholders` scans the rendered HTML for a placeholder that
//     survived, outside `<code>` and `<pre>`. Source validation cannot see
//     this case: a placeholder inside a raw HTML block has a perfectly good
//     name, passes the first check, and still renders literally.
//
// A name with no uses is fine and is not reported. Names are cheap; the
// registry is allowed to offer more than the prose currently asks for.

import { maskCodeRegions } from "./render.mjs";

export const PLACEHOLDER_RE = /\{\{tbdocs:([A-Za-z][A-Za-z0-9]*)\}\}/g;

// ---------------------------------------------------------------- registry
//
// Every entry is a derivation. The comment on each says what it counts and why
// that is the right definition -- which is the part a reader needs in order to
// decide whether the name means what their sentence needs it to mean.

const REF_PREFIX = "Reference/";
const DOC_PREFIX = "Documentation/";

// Packages live one level under Reference/Default/ and Reference/Built-In/ --
// `58a5e1c` split them into the three every project references and the ten the
// IDE ships but references on demand. Counting directories rather than index
// pages keeps the number right for a package whose landing page is missing.
const PACKAGE_ROOTS = ["Reference/Default/", "Reference/Built-In/"];

// Counted per root as well as in total, because the site's prose needs all
// three numbers and only ever had a name for one of them. Round 3 of the
// use-case evaluation found `Reference/index.md` calling all thirteen
// "built-in" while `Reference/Packages.md` reserved the word for the ten --
// both arithmetically right, and a reader cannot tell that from either page.
// A sentence that says `{{tbdocs:builtInPackages}}` cannot drift into the
// other set's number.
function countPackages(pages, root = null) {
  const roots = root ? [root] : PACKAGE_ROOTS;
  const seen = new Set();
  for (const p of pages) {
    for (const r of roots) {
      if (!p.srcRel.startsWith(r)) continue;
      const rest = p.srcRel.slice(r.length);
      const slash = rest.indexOf("/");
      if (slash > 0) seen.add(r + rest.slice(0, slash));
    }
  }
  return seen.size;
}

// Pinned heading ids in the attribute reference. These are a published URL
// contract -- Permanent-Links.md lists every one, and the build's link check
// resolves them -- so the count is worth stating and worth being derived. It
// went from 56 to 58 in the session that noticed it was 56, and again since.
function countAttributeAnchors(pages) {
  const page = pages.find((p) => p.srcRel === "Reference/Attributes.md");
  if (!page) return 0;
  return (page.rawContent.match(/^\{: #[a-z0-9]+ \}/gm) ?? []).length;
}

// Enumerations documented across every package, counted off the alphabetical
// index in Reference/Enumerations.md -- which that page calls the complete
// list ("This page indexes all of them either way"), because a nested enum is
// documented on its declaring class's page and so has no page of its own to
// count. The by-package section above it holds the same 140 today; this reads
// one of the two rather than both, because the user-facing total is the index.
//
// Same shape and same exposure as countAttributeAnchors: it scans one page's
// raw markdown, so a change to that page's list formatting moves the number.
// A missing page yields 0 rather than throwing, matching the precedent -- the
// real guard is the link check, which cannot miss Reference/index.md losing
// its link to a page that no longer exists.
function countEnumerations(pages) {
  const page = pages.find((p) => p.srcRel === "Reference/Enumerations.md");
  if (!page) return 0;
  const body = page.rawContent.split(/^## Alphabetical index\s*$/m)[1];
  if (!body) return 0;
  // Stop at the next heading of any level -- `### See Also` closes the list,
  // and its four bullets are not enumerations. The A/B/C dividers between
  // groups are bold text, not headings, so they do not terminate the scan.
  const list = body.split(/^#{1,6} /m)[0];
  return (list.match(/^- \[/gm) ?? []).length;
}

/**
 * Derive every named count from build state.
 *
 * @param {object} state    scheduler state: needs `pages` and `staticFiles`
 * @param {object} [extra]  values from tasks other than discover
 * @param {number} [extra.redirectStubs]  deriveRedirects' stub count
 * @returns {Record<string, number>}
 */
export function deriveCounts(state, extra = {}) {
  const pages = state.pages ?? [];
  const refPages = pages.filter((p) => p.srcRel.startsWith(REF_PREFIX));
  const folderStyle = refPages.filter((p) => p.srcRel.endsWith("/index.md"));

  return {
    // Everything discover filed as a page: markdown with frontmatter, plus the
    // two HTML pages that carry it.
    pages: pages.length,
    // Everything else under docs/, copied verbatim into each tree.
    staticFiles: (state.staticFiles ?? []).length,
    // The reference section, which is most of the site.
    referencePages: refPages.length,
    // docs/Documentation/ -- the developer documentation this plan is about.
    documentationPages: pages.filter((p) => p.srcRel.startsWith(DOC_PREFIX)).length,
    // Classes and controls written as <Name>/index.md plus siblings, rather
    // than as a single file.
    folderStyleIndexes: folderStyle.length,
    // Of those, the ones whose permalink ends in a slash -- one extra URL
    // segment, which is what makes cross-section links from them asymmetric.
    folderStyleSlashPermalinks: folderStyle.filter(
      (p) => typeof p.permalink === "string" && p.permalink.endsWith("/"),
    ).length,
    packages: countPackages(pages),
    // The two halves of that split, named separately because the prose uses
    // each on its own and the words for them collide.
    defaultPackages: countPackages(pages, "Reference/Default/"),
    builtInPackages: countPackages(pages, "Reference/Built-In/"),
    attributeAnchors: countAttributeAnchors(pages),
    enumerations: countEnumerations(pages),
    // Whole-page stubs emitted for every `redirect_from:` entry. Passed in
    // because it comes from deriveRedirects rather than from discover.
    redirectStubs: extra.redirectStubs ?? 0,
  };
}

export const COUNT_NAMES = Object.keys(deriveCounts({ pages: [], staticFiles: [] })).sort();

// ------------------------------------------------------------------ plugin

/**
 * markdown-it plugin: substitute `{{tbdocs:<name>}}` in prose.
 *
 * Registered after `replacements` so it sees the same text the reader will.
 * `ctx.counts` absent is not an error -- it means a caller that does not need
 * substitution (the SEO pass builds a markdown-it of its own), and the rule
 * then does nothing.
 */
export function countPlugin(md, ctx) {
  md.core.ruler.push("tbdocs-counts", (state) => {
    const counts = ctx.counts;
    if (!counts) return;

    // Recursive because image alt text is a nested child: an `image` token
    // carries its alt as its own children, and a flat walk would leave a
    // placeholder there literal in the alt attribute.
    const walk = (tokens) => {
      for (const t of tokens) {
        if (t.children) walk(t.children);
        if (t.type === "image") {
          // The default renderer builds the alt from the children, but
          // `content` carries it too and other code reads that.
          t.content = substitute(t.content, counts);
          continue;
        }
        if (t.type !== "text" || !t.content.includes("{{tbdocs:")) continue;
        t.content = substitute(t.content, counts);
      }
    };

    for (const blk of state.tokens) {
      if (blk.type === "inline" && blk.children) walk(blk.children);
    }
  });
}

function substitute(text, counts) {
  return text.replace(PLACEHOLDER_RE, (whole, name) =>
    Object.hasOwn(counts, name) ? String(counts[name]) : whole);
}

// -------------------------------------------------------------- validation

/**
 * Find every `{{tbdocs:...}}` in a page's source that is not inside code.
 *
 * Uses the renderer's own `maskCodeRegions`, so "what is code" has one
 * definition here and in the pre-render rewrites. Without it this would reject
 * the very examples the documentation of this feature has to contain.
 *
 * @returns {{name: string, line: number}[]}
 */
export function findCountRefs(rawContent) {
  const { masked } = maskCodeRegions(rawContent.replace(/\r\n?/g, "\n"));
  const out = [];
  for (const m of masked.matchAll(PLACEHOLDER_RE)) {
    out.push({ name: m[1], line: masked.slice(0, m.index).split("\n").length });
  }
  return out;
}

// Closest known name by a cheap edit distance, so the error can say "did you
// mean". Bounded at 3 because beyond that the suggestion is noise.
function nearest(name, names) {
  let best = null, bestD = 4;
  for (const n of names) {
    const d = editDistance(name.toLowerCase(), n.toLowerCase());
    if (d < bestD) { best = n; bestD = d; }
  }
  return best;
}

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Reject an unknown count name, before any worker renders.
 *
 * Validation is here rather than in the inline rule because an unrecognised
 * name cannot be an error there: markdown-it emits the text verbatim, so the
 * rule would publish `{{tbdocs:pgaes}}` to readers rather than fail.
 *
 * @returns {string[]} one message per bad reference; empty means clean
 */
export function validateCountNames(pages, counts) {
  const names = Object.keys(counts).sort();
  const problems = [];
  for (const p of pages) {
    for (const { name, line } of findCountRefs(p.rawContent ?? "")) {
      if (Object.hasOwn(counts, name)) continue;
      const guess = nearest(name, names);
      problems.push(
        `${p.srcRel}:${line}\n` +
        `  unknown count name {{tbdocs:${name}}}\n` +
        (guess ? `  did you mean: ${guess}?\n` : "") +
        `  available: ${names.join(", ")}`,
      );
    }
  }
  return problems;
}

// Consumes <code>...</code> and <pre>...</pre> atomically in the leading
// alternation, so a placeholder the documentation is deliberately SHOWING does
// not trip the assertion. Same shape as book.mjs's replaceOutsideCode and
// offline-rewrite.mjs's img rewrite.
const SURVIVING_PLACEHOLDER_RE =
  /<code\b[^>]*>[\s\S]*?<\/code>|<pre\b[^>]*>[\s\S]*?<\/pre>|(\{\{tbdocs:[A-Za-z][A-Za-z0-9]*\}\})/g;

/**
 * Reject a placeholder that survived rendering, outside code.
 *
 * `validateCountNames` cannot see this case. A placeholder inside a raw HTML
 * block has a perfectly good name, so it passes there -- and markdown-it keeps
 * an `html_block` as one opaque token with no children, so the substitution
 * rule never reaches it and the page publishes the placeholder verbatim.
 *
 * @returns {string|null} the first survivor, or null
 */
export function findSurvivingPlaceholder(html) {
  for (const m of html.matchAll(SURVIVING_PLACEHOLDER_RE)) {
    if (m[1]) return m[1];
  }
  return null;
}
