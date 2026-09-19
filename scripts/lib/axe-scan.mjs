// Shared definition of "the accessibility scan".
//
// Three consumers:
//
//   * scripts/check_a11y.mjs            -- the production gate (check.bat, CI)
//   * scripts/check_a11y_fingerprint.mjs -- the correctness gate: does a
//     candidate configuration still see everything production sees?
//   * perf/ab-axe.mjs                   -- the cost-attribution rig
//
// All three have to agree on the page list, the viewports, the themes, the
// blocked requests and the axe run options.  If they drift, the fingerprint
// gate stops gating what production actually runs, which is the one failure
// mode the gate exists to prevent.  So everything that defines the scan lives
// here and nowhere else.
//
// See builder/PLAN-axe-perf.md for why each knob below is a knob.

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

// This module lives at <repo>/scripts/lib/axe-scan.mjs.  Anchoring the built
// tree and the axe bundle to the repo root rather than to process.cwd() lets
// perf/ab-axe.mjs run from perf/ (as ab-css.mjs does) while check_a11y.mjs
// runs from the repo root, without either needing to know where the other is.
// An explicit --root-dir still resolves against the caller's cwd, which is
// what someone typing a relative path expects.
export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../../..");

export const DEFAULT_ROOT_DIR = join(REPO_ROOT, "docs/_site-offline");

// The pages the gate audits.  Not a hand-picked list any more: it is derived,
// and scripts/pick_a11y_sample.mjs --check fails the build when the site grows
// a construct no page here covers.
//
// The first six are the original sample.  They were chosen once, by hand, and
// by the time anyone measured, the site had moved underneath them: all six sat
// between 2,175 and 2,694 elements against a site maximum of 5,231, and not one
// had a table, an image, a disclosure widget or a video card.  Rules for those
// constructs ran against nothing and reported a pass.  A full-site sweep
// (scripts/sweep_a11y.mjs, 3,488 audits) found six violation classes on 54
// pages, every one of them in a construct the sample could not see.
//
// The rest close that gap, each earning its place:
//
//   Pipeline-Stages    the site's largest page (5,231 elements) and its
//                      table-heaviest (35 tables, 109 <th>, 1,168 <code>).
//                      Audit cost is super-linear in element count -- k = 2.73,
//                      see builder/PLAN-axe-perf.md -- so this one page is 30 %
//                      of the scan's audit time and is the only guard against
//                      anything that degrades with page size.
//   Features/index     callouts, footnotes, <sup>.  The footnote back-link is
//                      what link-in-text-block caught.
//   Menu/Window        images, <details>/<summary>, <kbd>.
//   Videos/tB          the vendored video cards.
//   Procedures-and-Functions   a bare index page: 1,157 list items, no prose.
//
// The site's 290 redirect stubs are deliberately absent, and cannot be added:
// each carries `<script>location=...</script>`, which navigates before the
// audit runs, so what axe walks is the redirect *target*.  A stub in this list
// would silently be a duplicate audit of another page (measured: the stub for
// /CustomControls.html and /Tutorials/CustomControls/index.html both report
// 2,221 elements).  A page nobody sees for longer than 0 ms is not a page to
// audit.
//
// Cost, measured across the full matrix: 15.3 s of audit against 6.2 s for the
// original six -- 2.45x for eleven pages instead of six, because cost tracks
// element count super-linearly rather than page count.  Pipeline-Stages alone
// is 30 % of it.
export const SAMPLE_PAGES = [
  "/index.html",
  "/tB/Core/Dim.html",
  "/tB/Modules/Interaction/index.html",
  "/Documentation/Development/BuildInfo.html",
  "/tB/Core/Select-Case.html",
  "/404.html",
  "/Documentation/Development/Pipeline-Stages.html",
  "/Features/index.html",
  "/tB/IDE/Project/Menu/Window.html",
  "/Videos/tB.html",
  "/Reference/Procedures-and-Functions.html",
];

// ---------------------------------------------------------------------------
// Page states
// ---------------------------------------------------------------------------
//
// axe walks the DOM as it finds it, and the subtree of a closed <details> is
// `notRendered`: absent from the accessibility tree, and absent from the
// audit.  That property is exactly what makes the per-page section-links
// disclosure cheap -- one tab stop, nothing in the links list -- and it is
// also a hole in this scan.  The construct is on 707 pages, and the state a
// reader sees after one click was never audited at all.  It shipped with
// `target-size` violations on every link inside it (69.6x14 against a 24px
// floor) while check.bat reported a clean pass.
//
// A state is a DOM mutation applied after gotoPage and before the audit.  The
// function is serialised into the page, so it must not close over anything in
// this module.
//
// Each one MUST assert that it found what it expected.  A state that silently
// no-ops degrades into a second audit of the default page -- the scan gets
// slower, reports a pass, and covers nothing extra, which is precisely the
// failure this mechanism exists to prevent.
export const PAGE_STATES = {
  "section-links-open": () => {
    const found = document.querySelectorAll("details.section-links");
    if (found.length !== 1) {
      throw new Error(
        `section-links-open: expected exactly 1 details.section-links, found ${found.length}`
      );
    }
    found[0].open = true;
    const links = found[0].querySelectorAll("li > a");
    if (links.length < 2) {
      throw new Error(
        `section-links-open: disclosure holds ${links.length} link(s); nothing was added to the audit`
      );
    }
    return links.length;
  },
};

// Extra audits layered onto the page x theme x viewport matrix: each entry is
// run at every theme and viewport, like an ordinary page, but with a state
// applied first.
//
// Menu/Window is the host because it is already the sample's disclosure-widget
// page, and because item count buys nothing here.  The obvious candidate was
// Pipeline-Stages -- 72 items against this page's 14 -- but the defect class
// is per-link geometry, which is identical for every item: the spacing between
// two consecutive items does not change with how many follow them, and the
// long labels that make Pipeline-Stages look like the stress case only *wrap*
// at the mobile viewport, which makes a target taller and easier to pass.  It
// is also the most expensive page in the sample.  Measured: both hosts catch
// a reverted fix at both viewports (14 nodes here, 70 there), at 0.41 s per
// audit against 1.28 s.
//
// One page is enough for the same reason -- the disclosure is structurally
// identical on all 707 pages carrying it -- and if this page ever stops
// carrying one, the state applier throws rather than quietly auditing nothing.
//
// Cost: 4 audits on top of 44, +7 % of the sample's audit time (2.64 s
// against 39.8 s).  That is a within-run ratio deliberately -- absolute wall
// times on this box moved between 18 s and 40 s for the same 44 audits across
// runs, so a before/after difference of two runs measures the box, not the
// change.  Same caveat as perf/ab-axe.mjs and its ~20 % resolution floor.
export const STATE_AUDITS = [
  {
    filePath: "/tB/IDE/Project/Menu/Window.html",
    state: "section-links-open",
  },
];

for (const { filePath, state } of STATE_AUDITS) {
  if (!SAMPLE_PAGES.includes(filePath)) {
    throw new Error(
      `STATE_AUDITS: ${filePath} is not in SAMPLE_PAGES, so --pages narrowing would drop it silently`
    );
  }
  if (!Object.hasOwn(PAGE_STATES, state)) {
    throw new Error(`STATE_AUDITS: unknown state "${state}"`);
  }
}

// Fixed sizes keep the media queries -- and therefore which elements are laid
// out and visible to axe -- the same from run to run.
export const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 375, height: 812 },
};

export const THEMES = ["light", "dark"];

// Requests aborted for the duration of the scan.
//
// Every page in the offline tree pulls in the ~3.2 MB search index
// (assets/js/search-data.js) plus lunr.  Loading and parsing it dominated the
// run -- 18.9 s of a 27.1 s scan, across what was then a 24-audit matrix --
// and contributes nothing to the audit: it populates window.store for the
// search box, it does not alter the DOM axe walks.
// Aborting both cuts the scan to ~9.1 s (-66 %) with byte-identical results;
// every rule id and node count, violations and incomplete alike, matched the
// unblocked scan on every combination.
//
// just-the-docs.js is deliberately NOT blocked.  It installs the search
// combobox ARIA (role=listbox, aria-activedescendant) added by Phase 2.1 of
// builder/PLAN-a11y.md, and blocking it makes axe see *less* -- the
// colour-contrast node count on Select-Case drops 54 -> 2 -- which would
// silently mask coverage for ~130 ms.
export const BLOCKED_REQUESTS = [/search-data\.js/, /lunr\.min\.js/];

// --no-sandbox: GitHub's ubuntu-24.04 runners carry the AppArmor restriction
// on unprivileged user namespaces, which Chrome's sandbox needs -- without
// this the launch fails in CI.  --disable-dev-shm-usage avoids crashes where
// /dev/shm is small (containers).  Neither touches layout or computed style,
// so axe sees exactly what it sees locally; book/render-book.mjs passes the
// same pair for the same reason.
export const LAUNCH_ARGS = ["--no-sandbox", "--disable-dev-shm-usage"];

// The production axe.run options.
//
// runOnly: WCAG 2.2 AA is a superset of 2.1 AA, which is a superset of 2.0 AA
// -- but axe's matchTags() is a literal tag test with no version rollup, so a
// rule tagged only wcag21aa does NOT match "wcag22aa".  All five tags have to
// be listed or the 2.1 additions never run.  They never did until this was
// fixed: autocomplete-valid, avoid-inline-spacing (WCAG 1.4.12 text spacing),
// css-orientation-lock and label-content-name-mismatch were all silently
// skipped.  There is no "wcag22a" tag in axe-core 4.13.
//
// rules: heading-order is tagged best-practice rather than WCAG, so the tag
// filter above excludes it -- and nothing else guards heading structure:
// check_links.mjs has no notion of headings, and render.mjs's
// headingLevelNormalizePlugin repairs the legacy h1->h3 house style at build
// time without reporting it.  ruleShouldRun() tests an explicit
// rules[id].enabled BEFORE the tag filter, so this re-admits the one rule
// without dragging in the rest of best-practice.
export const AXE_RUN_OPTIONS = Object.freeze({
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
  },
  rules: { "heading-order": { enabled: true } },
});

/** Shallow-merge extra rule entries onto the production `rules` map. */
export function withRules(extra) {
  return { ...AXE_RUN_OPTIONS.rules, ...extra };
}

// ---------------------------------------------------------------------------
// Schemes
// ---------------------------------------------------------------------------
//
// A scheme is one way of configuring the scan: an optional axe.configure()
// spec, the axe.run() options, and the source patches applied to the bundle.
// `production` is the scheme check_a11y.mjs and sweep_a11y.mjs run -- they
// read it from here rather than declaring their own copy, so a lever added to
// the scheme reaches the shipped scan, and the fingerprint gate's A/A control
// compares the bundle that actually ships against itself.  The rest are the
// levers builder/PLAN-axe-perf.md lists under "Landing options", named so the
// fingerprint gate and the ablation rig can refer to the same thing.
//
// `gates: false` marks a scheme that is expected to change the findings -- it
// exists to attribute cost, not to ship.  The fingerprint harness still runs
// it, it just says up front that a diff is the point.
//
// Every scheme inherits DEFAULT_PATCHES unless it names its own.  The other
// schemes are variations OF production, so comparing one against production
// has to hold the bundle fixed -- otherwise the diff mixes the config change
// with a patch change and attributes both to the config.

export const DEFAULT_PATCHES = ["plain-color-fields"];

export const SCHEMES = {
  production: {
    describe: "what check_a11y.mjs and sweep_a11y.mjs run",
    configure: null,
    runOptions: AXE_RUN_OPTIONS,
  },

  // D3 -- DqElement's constructor calls outerHTML on every result node, pass
  // or fail, then throws the string away above 300 chars.  noHtml is a
  // configure option, not a run option, and resultTypes cannot reach it.
  "no-html": {
    describe: "D3: axe.configure({ noHtml: true })",
    configure: { noHtml: true },
    runOptions: AXE_RUN_OPTIONS,
  },

  // D4 -- generateSelector climbs the ancestor chain running a document query
  // per level until the selector is unique.  selectors:false skips `target`
  // generation outright.
  "no-selectors": {
    describe: "D4: selectors: false",
    configure: null,
    runOptions: { ...AXE_RUN_OPTIONS, selectors: false },
  },

  // D5 -- the correct lever.  no-autoplay-audio is the only preload:true rule
  // our tag set admits, so disabling it empties runLaterRules and removes the
  // preload round trip without the blunt `preload: false`.
  "no-autoplay-audio": {
    describe: "D5: disable the one preload:true rule in our tag set",
    configure: null,
    runOptions: {
      ...AXE_RUN_OPTIONS,
      rules: withRules({ "no-autoplay-audio": { enabled: false } }),
    },
  },

  // D5, blunt version -- kept for the A/B against the targeted lever above.
  "no-preload": {
    describe: "D5 (blunt): preload: false",
    configure: null,
    runOptions: { ...AXE_RUN_OPTIONS, preload: false },
  },

  // Needs the relaxed `incomplete` half of the gate: resultTypes truncates
  // each excluded group's nodes to [nodes[0]] rather than dropping the group.
  "violations-only": {
    describe: "resultTypes: ['violations']",
    configure: null,
    runOptions: { ...AXE_RUN_OPTIONS, resultTypes: ["violations"] },
  },

  // All four config-only levers at once -- the "Landing option 1" candidate.
  "config-only": {
    describe: "D3 + D4 + D5 together (landing option 1, minus resultTypes)",
    configure: { noHtml: true },
    runOptions: {
      ...AXE_RUN_OPTIONS,
      selectors: false,
      rules: withRules({ "no-autoplay-audio": { enabled: false } }),
    },
  },

  // Ablation reference.  Disabling colour-contrast plausibly removes the whole
  // _createGrid build (D1) along with the contrast maths, which is why the
  // 364 -> 168 ms probe reads as dramatic.  It is not a landing candidate.
  "no-contrast": {
    describe: "D1 ablation: colour-contrast disabled (NOT a landing candidate)",
    gates: false,
    configure: null,
    runOptions: {
      ...AXE_RUN_OPTIONS,
      rules: withRules({ "color-contrast": { enabled: false } }),
    },
  },
};

export function getScheme(label) {
  const scheme = SCHEMES[label];
  if (!scheme) {
    throw new Error(
      `unknown scheme "${label}"; known: ${Object.keys(SCHEMES).join(", ")}`
    );
  }
  return { label, patches: DEFAULT_PATCHES, ...scheme };
}

// ---------------------------------------------------------------------------
// axe source
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Source patches
// ---------------------------------------------------------------------------
//
// axe-core ships ONLY a Babel-downleveled bundle -- its package.json `files:`
// lists axe.js and axe.min.js and nothing else, so there is no modern build to
// switch to.  Phase 2 of builder/PLAN-axe-perf.md found the consequence: the
// Color2 class (axe.js:18186) has six `#private` fields plus a brand check,
// emulated with six WeakMaps and a WeakSet, so every `new Color2()` runs
// fourteen weak-collection operations before any colour maths -- and
// `color-contrast` constructs enormous numbers of them.
//
// These patches exist so that cost can be MEASURED before anyone commits to
// maintaining a vendored fork.  They are text substitutions against the
// injected source; nothing on disk is modified.
//
// Every substitution asserts an exact occurrence count, so an axe-core upgrade
// that moves the code -- or rebinds a duplicated private-field name to another
// class -- fails loudly instead of silently measuring nothing.  "At least one"
// is not enough: a bump that made a target match somewhere else as well would
// rewrite that site too and still pass.  Targets are single lines on purpose --
// a multi-line target would be one reformatting away from breaking, and harder
// to re-derive by eye.

function substitute(src, name, from, to, expectedCount = null) {
  const parts = src.split(from);
  const found = parts.length - 1;
  if (found === 0) {
    throw new Error(
      `patch "${name}": target not found in axe.js:\n  ${from}\n` +
        `The bundle has changed (axe-core upgrade?); re-derive before trusting it.`
    );
  }
  if (expectedCount !== null && found !== expectedCount) {
    throw new Error(
      `patch "${name}": expected ${expectedCount} occurrence(s) of\n  ${from}\n` +
        `but found ${found}. The bundle has changed; re-derive before trusting it.`
    );
  }
  return parts.join(to);
}

// Color2's six private fields, in constructor-initialisation order. The
// backing names are parameters of the bundle's top-level IIFE (axe.js:506) and
// appear nowhere outside the class body, which is what makes a global
// substitution safe -- verified by enumerating every occurrence.
const COLOR2_FIELDS = ["_r", "_g", "_b", "_red", "_green", "_blue"];

export const SOURCE_PATCHES = {
  // Babel emits a redeclaration guard on every private-field initialisation
  // and a brand assertion on every private-field access.  Both exist to throw
  // on misuse of the compiled output, which cannot happen here: the classes
  // are internal to a generated bundle.  Removing them drops one WeakMap or
  // WeakSet `has` per field init and one per access -- on Color2 that is seven
  // fewer `has` calls per construction, plus two per colour-channel write.
  //
  // Behaviour-preserving by construction: the only observable difference is
  // which TypeError is thrown by code that is already broken.
  "cheap-private-fields": {
    describe: "drop Babel's redeclaration guard and brand assert (Color2 hot path)",
    apply(src) {
      src = substitute(
        src, "cheap-private-fields/field-init",
        "_checkPrivateRedeclaration(e, t), t.set(e, a);",
        "t.set(e, a);"
      );
      src = substitute(
        src, "cheap-private-fields/method-init",
        "_checkPrivateRedeclaration(e, a), a.add(e);",
        "a.add(e);"
      );
      src = substitute(
        src, "cheap-private-fields/brand",
        "if ('function' == typeof e ? e === t : e.has(t)) {",
        "if (true) {"
      );
      return src;
    },
  },
  // The full version of `cheap-private-fields`, scoped to the one class that
  // matters: replace Color2's WeakMap-emulated `#private` fields with plain own
  // properties.
  //
  // Phase 2 measured `_classPrivateFieldInitSpec` at 23.6 % of self-time on a
  // 9,475-element page, with the sibling helpers taking it to ~34 %.
  // `cheap-private-fields` only removes the guard calls and measured within
  // noise, because the cost that remains is the `WeakMap.set` it keeps. This
  // removes all of it: six `WeakMap.set` plus a `WeakSet.add` per construction,
  // and a `WeakMap.get`/`set` on every colour-channel access.
  //
  // Safety, established by enumerating all 26 call sites (axe.js:18190-18356):
  //
  //   * The backing bindings (_r, _g, _b, _red, _green, _blue, _Class3_brand)
  //     are IIFE parameters at axe.js:506 and are referenced nowhere outside
  //     the Color2 body, so a global substitution cannot reach another class.
  //   * `__r`-style names do not occur anywhere in the bundle.
  //   * Color2 defines an explicit `toJSON` returning {red, green, blue,
  //     alpha}, so serialisation does not see the new own properties.
  //   * All six are initialised in the constructor before either return path,
  //     ahead of `alpha`, so every instance keeps one hidden class.
  //   * `_classPrivateFieldSet` returns the assigned value; every call site is
  //     a statement, and `(this.__x = v)` has the same value anyway.
  //
  // The residual risk is enumeration: the private fields were invisible to
  // `Object.keys` / spread and the own properties are not. Nothing in the
  // bundle enumerates a Color, and the fingerprint gate covers the one
  // consumer that would notice -- `color-contrast` results across the matrix.
  "plain-color-fields": {
    describe: "Color2's six #private fields as plain own properties (no WeakMaps)",
    apply(src) {
      const n = "plain-color-fields";

      // The brand only gates one private method call; drop both halves.
      src = substitute(src, n + "/brand-init",
        "_classPrivateMethodInitSpec(this, _Class3_brand);", "", 1);
      src = substitute(src, n + "/brand-call",
        "_assertClassBrand(_Class3_brand, this, _add)", "_add", 1);

      for (const f of COLOR2_FIELDS) {
        src = substitute(src, n + "/init" + f,
          `_classPrivateFieldInitSpec(this, ${f}, void 0);`,
          `this._${f} = void 0;`, 1);
        // Counts are measured, not guessed: every field is read once (the
        // getter) and written twice (the constructor and the setter) in
        // axe-core 4.13.0.  Asserting them is what stops a bump that rebinds
        // Babel's duplicate private names to a different class from rewriting
        // that class instead -- consistently, silently, and past
        // check_axe_patch_equiv.mjs, which only reads Color2 values.
        src = substitute(src, n + "/get" + f,
          `_classPrivateFieldGet(${f}, this)`,
          `this._${f}`, 1);
        // Prefix-only substitution: the original call's closing paren becomes
        // the closing paren of the assignment expression, so an arbitrary
        // nested argument expression is carried across untouched.
        src = substitute(src, n + "/set" + f,
          `_classPrivateFieldSet(${f}, this, `,
          `(this._${f} = `, 2);
      }
      return src;
    },
  },
};

export function getPatches(names) {
  return names.map((n) => {
    const p = SOURCE_PATCHES[n];
    if (!p) {
      throw new Error(
        `unknown patch "${n}"; known: ${Object.keys(SOURCE_PATCHES).join(", ")}`
      );
    }
    return { name: n, ...p };
  });
}

/**
 * Read the axe-core bundle to inject.
 *
 * Production uses the minified build -- it is the same code and parses
 * faster.  Anything that CPU-profiles the scan must pass `minified: false`:
 * in axe.min.js every profile frame is a mangled single letter, so the
 * bottom-up table is unreadable and find-callers.mjs has nothing to match on.
 */
export function readAxeSource({ minified = true, patches = [] } = {}) {
  if (patches.length && minified) {
    throw new Error("source patches target the unminified bundle; pass minified: false");
  }
  let src = readFileSync(
    join(REPO_ROOT, "node_modules/axe-core", minified ? "axe.min.js" : "axe.js"),
    "utf-8"
  );
  for (const p of getPatches(patches)) src = p.apply(src);
  return src;
}

/** Whatever axe-core version is installed; line citations in the plan pin 4.13.0. */
export function axeVersion() {
  return JSON.parse(
    readFileSync(join(REPO_ROOT, "node_modules/axe-core/package.json"), "utf-8")
  ).version;
}

// ---------------------------------------------------------------------------
// Browser / page plumbing
// ---------------------------------------------------------------------------

export function launchBrowser(opts = {}) {
  return puppeteer.launch({ headless: true, args: LAUNCH_ARGS, ...opts });
}

/** A page with the scan's request blocking installed. */
export async function newAuditPage(browser) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (BLOCKED_REQUESTS.some((re) => re.test(req.url()))) {
      req.abort().catch(() => {});
    } else {
      req.continue().catch(() => {});
    }
  });
  return page;
}

/**
 * Navigate to one page of the offline tree and apply the theme.
 *
 * theme-toggle.js reads localStorage, which is unavailable on file:// origins.
 * Set the data-theme attribute it would have set instead (an explicit
 * override; its declarations are identical to the no-JS prefers-color-scheme
 * path, so this exercises the same dark palette).
 *
 * Note the ordering hazard recorded in PLAN-axe-perf.md H4: theme-toggle.js is
 * `defer` and its apply("system") path calls removeAttribute("data-theme").
 * Deferred scripts run before DOMContentLoaded and we wait on
 * `domcontentloaded`, so this assignment lands last -- but change either side
 * and every "dark" audit silently becomes a light one.
 */
export async function gotoPage(page, { rootDir, filePath, theme }) {
  const url = pathToFileURL(join(rootDir, filePath)).href;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

/**
 * Inject axe and run one audit.
 *
 * `performanceTimer` output does not appear in the return value --
 * _logGatherPerformance and performanceTimer.logMeasures go to console.log.
 * Relaying ~100 rules x 5 measures per audit through CDP would be overhead
 * on the thing being measured, so the measures are read directly out of the
 * performance timeline instead; only the marks are cleared.
 *
 * @returns {{results: object, measures: Array<{name: string, dur: number}>|null,
 *            timings: {inject: number, run: number}}}
 */
export async function runAxe(
  page,
  { axeSource, configure = null, runOptions = AXE_RUN_OPTIONS, performanceTimer = false }
) {
  const tInject = Date.now();
  await page.evaluate(axeSource);
  const injectMs = Date.now() - tInject;

  const tRun = Date.now();
  const { results, measures } = await page.evaluate(
    async (cfg, opts, wantMeasures) => {
      if (cfg) axe.configure(cfg);
      const results = await axe.run(
        document,
        wantMeasures ? { ...opts, performanceTimer: true } : opts
      );
      const measures = wantMeasures
        ? performance
            .getEntriesByType("measure")
            .map((e) => ({ name: e.name, dur: e.duration }))
        : null;
      return { results, measures };
    },
    configure,
    runOptions,
    performanceTimer
  );
  const runMs = Date.now() - tRun;

  return { results, measures, timings: { inject: injectMs, run: runMs } };
}

/**
 * The full page x theme x viewport matrix, in the order check_a11y.mjs walks
 * it (viewport outermost -- setViewport is the expensive one).
 *
 * @returns {Array<{filePath: string, theme: string, viewport: string, label: string}>}
 */
export function buildMatrix({
  pages = SAMPLE_PAGES,
  themes = THEMES,
  viewports = Object.keys(VIEWPORTS),
  stateAudits = STATE_AUDITS,
} = {}) {
  const seen = new Set();
  const uniquePages = pages.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });

  // Follow whatever narrowing the caller applied to `pages`, so --pages does
  // not leave a state audit running on a page the caller excluded.
  const states = stateAudits.filter((s) => seen.has(s.filePath));

  const out = [];
  for (const viewport of viewports) {
    for (const theme of themes) {
      for (const filePath of uniquePages) {
        out.push({
          filePath,
          theme,
          viewport,
          state: null,
          label: `${filePath} [${theme}, ${viewport}]`,
        });
      }
      for (const { filePath, state } of states) {
        out.push({
          filePath,
          theme,
          viewport,
          state,
          label: `${filePath} [${theme}, ${viewport}, ${state}]`,
        });
      }
    }
  }
  return out;
}

/**
 * Walk the matrix, auditing each combination.  `onAudit` is called with
 * `{ ...entry, results, measures, timings }` after each one.
 */
export async function runMatrix(
  page,
  {
    rootDir = DEFAULT_ROOT_DIR,
    matrix = buildMatrix(),
    axeSource,
    configure = null,
    runOptions = AXE_RUN_OPTIONS,
    performanceTimer = false,
    onAudit = null,
  }
) {
  const audits = [];
  let currentViewport = null;

  for (const entry of matrix) {
    if (entry.viewport !== currentViewport) {
      await page.setViewport(VIEWPORTS[entry.viewport]);
      currentViewport = entry.viewport;
    }
    await gotoPage(page, { rootDir, filePath: entry.filePath, theme: entry.theme });
    // Applied after navigation, before the audit. PAGE_STATES entries throw
    // in-page if the construct they expect is not there, and page.evaluate
    // propagates that here rather than letting the audit quietly proceed
    // against the default state.
    // Whatever the applier returns is carried on the record as `stateResult`
    // so a front end can report how much the state actually exposed. "The
    // state ran" and "the state added something" are different claims, and
    // only the second one is worth anything.
    const stateResult = entry.state
      ? await page.evaluate(PAGE_STATES[entry.state])
      : null;
    const audit = await runAxe(page, {
      axeSource,
      configure,
      runOptions,
      performanceTimer,
    });
    const record = { ...entry, ...audit, stateResult };
    audits.push(record);
    if (onAudit) onAudit(record);
  }

  return audits;
}

// ---------------------------------------------------------------------------
// Fingerprints -- the correctness gate
// ---------------------------------------------------------------------------
//
// axe is the correctness oracle, so a change can silently make it see *less*
// while still reporting a pass.  This nearly happened once: blocking
// just-the-docs.js looked like a 130 ms win and quietly dropped color-contrast
// nodes on Select-Case from 54 to 2.
//
// The gate, per builder/PLAN-axe-perf.md:
//
//   * violations -- identical sorted `ruleId:nodeCount`;
//   * incomplete -- identical sorted `ruleId` SET, node counts excluded.
//
// The relaxation on `incomplete` is required, not sloppiness: resultTypes
// truncates each excluded group's `nodes` to `[nodes[0]]` rather than dropping
// the group, so a ruleId:nodeCount fingerprint would read `:1` everywhere and
// silently stop discriminating.
//
// KNOWN BLIND SPOT: the gate compares a candidate against a baseline produced
// by that same scheme's element set.  It therefore cannot detect a change that
// stops auditing elements entirely -- a rule that never runs simply produces
// no entry.  Any change touching *which DOM is walked* (viewport, visibility,
// request blocking) must be argued from source, not from this gate.

export const fmtViolations = (groups) =>
  groups
    .map((g) => `${g.id}:${g.nodes.length}`)
    .sort()
    .join(",");

export const fmtIncomplete = (groups) =>
  [...new Set(groups.map((g) => g.id))].sort().join(",");

export function fingerprint({ filePath, theme, viewport, state, results }) {
  return (
    `${filePath}|${theme}|${viewport}|${state ?? "default"}` +
    `|V[${fmtViolations(results.violations)}]` +
    `|I[${fmtIncomplete(results.incomplete)}]`
  );
}
