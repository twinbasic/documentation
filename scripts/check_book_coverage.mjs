// Self-test for the book-coverage warnings.
//
// builder/book.mjs's bookCoverage() holds every page against _book.yml: a
// page must be selected by a book entry or named in `left_out:`, and every
// entry must still match a page. On a consistent manifest it reports
// nothing, so an ordinary build says exactly what a check that had stopped
// working would say. These probes make the other assertion -- that each of
// its five findings still fires -- and that the pages the book emits by a
// route other than a selector (a chaptered part's landing, a foreword, the
// book page itself) are never reported as missing.
//
// The pages and the manifest are built here in memory, not read from docs/,
// so the probes mean the same thing against an empty tree. That is what puts
// this in test.bat rather than check.bat.
//
// Before the warnings existed, a page no entry selected was left out of the
// PDF without a word: the IDE, Challenges and Videos sections, and Data
// Types, Enumerations and twinBASIC Additions, all went missing that way.
//
//     node scripts/check_book_coverage.mjs

import { resolveBookChapters, bookCoverage, formatBookCoverage } from "../builder/book.mjs";

// A crash is the harness failing, not a finding: exit 2, as Extending.md's gate
// conventions require. This file runs at top level, so there is no main().catch
// to do it; the handler also catches a rejected top-level await.
process.on("uncaughtException", (err) => { console.error(err); process.exit(2); });

const page = (srcRel, permalink, title, frontmatter = {}) => ({
  srcRel, permalink, navPath: title, frontmatter: { title, permalink, ...frontmatter },
});

// Every way into the book, and both ways out of it.
const PAGES = [
  page("index.md", "/", "Welcome"),                     // front_matter
  page("Guide/index.md", "/Guide/", "Guide"),           // flat part: landing ...
  page("Guide/One.md", "/Guide/One", "One"),            // ... and its prefix sweep
  page("Guide/Two.md", "/Guide/Two", "Two"),
  page("Ref/index.md", "/Ref/", "Reference"),           // chaptered part: landing
  page("Ref/Intro.md", "/Ref/Intro", "Intro"),          // ... foreword
  page("Ref/Alpha.md", "/Ref/Alpha", "Alpha"),          // ... a chapter
  page("Ref/Beta/index.md", "/Ref/Beta/", "Beta"),      // ... a chapter's landing
  page("Ref/Beta/Gamma.md", "/Ref/Beta/Gamma", "Gamma"),
  page("Extra/index.md", "/Extra", "Extra"),            // left_out by prefix
  page("Extra/Sub.md", "/Extra/Sub", "Sub"),
  page("404.html", "/404.html", "Not found"),           // left_out exactly
  page("book.html", "/book.html", "", { layout: "book-combined" }), // the book itself
];

// A fresh manifest per probe: resolveBookChapters writes _chapters into it.
const manifest = () => ({
  front_matter: [{ title: "Introduction", page: "/", no_descent: true }],
  parts: [
    { title: "Guide", landing_page: "/Guide/", page: "/Guide/" },
    {
      title: "Reference", foreword_page: "/Ref/Intro", landing_page: "/Ref/",
      chapters: [
        { title: "Alpha", page: "/Ref/Alpha" },
        { title: "Beta", landing_page: "/Ref/Beta/", page: "/Ref/Beta/" },
      ],
    },
  ],
  left_out: [
    { reason: "Not book material", page: "/Extra" },
    { reason: "The error page", page: "/404.html", no_descent: true },
  ],
});

function coverage(mutate = () => {}) {
  const book = manifest();
  const pages = [...PAGES];
  mutate(book, pages);
  resolveBookChapters(book, pages);
  const c = bookCoverage(book, pages);
  return { c, text: formatBookCoverage(c).join("\n") };
}

const KINDS = ["unlisted", "both", "emptyEntries", "emptyLeftOut", "missingUrls"];
const counts = (c) => KINDS.map(k => `${k}=${c[k].length}`).join(" ");

let failures = 0;
const results = [];

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failures++;
}

// Exactly the findings `expect` names, as {kind: n}, and none of any other kind.
function only(c, expect) {
  return KINDS.every(k => c[k].length === (expect[k] ?? 0));
}

// --- a consistent manifest is quiet, including the pages no selector names ---

{
  const { c, text } = coverage();
  check("a consistent manifest reports nothing", only(c, {}) && text === "", counts(c));
  const unlisted = new Set(c.unlisted.map(p => p.permalink));
  check("a chaptered part's landing counts as in the book", !unlisted.has("/Ref/"), counts(c));
  check("a part's foreword counts as in the book", !unlisted.has("/Ref/Intro"), counts(c));
  check("the book page itself is never reported", !unlisted.has("/book.html"), counts(c));
}

// --- each finding fires, alone ------------------------------------------------

{
  const { c, text } = coverage((_, pages) => pages.push(page("New/Page.md", "/New/Page", "Page")));
  check("a page no entry mentions is reported, with the remedy",
        only(c, { unlisted: 1 }) && text.includes("New/Page.md") && text.includes("/New/Page") &&
        text.includes("left_out"), text || counts(c));
}
{
  const { c, text } = coverage((book) =>
    book.left_out.push({ reason: "Probe", page: "/Guide/One", no_descent: true }));
  check("a page both in the book and in left_out is reported",
        only(c, { both: 1 }) && text.includes("Guide/One.md"), text || counts(c));
}
{
  const { c, text } = coverage((book) =>
    book.left_out.push({ reason: "Renamed since", page: "/Gone", no_descent: true }));
  check("a left_out entry matching no page is reported by its reason",
        only(c, { emptyLeftOut: 1 }) && text.includes("Renamed since"), text || counts(c));
}
{
  const { c, text } = coverage((book) =>
    book.parts[1].chapters.push({ title: "Empty chapter", page: "/Nothing" }));
  check("a chapter selecting no page is reported",
        only(c, { emptyEntries: 1 }) && text.includes("Empty chapter"), text || counts(c));
}
{
  const { c, text } = coverage((book) =>
    book.parts.push({ title: "Empty part", page: "/Nothing" }));
  check("a flat part selecting no page is reported",
        only(c, { emptyEntries: 1 }) && text.includes("Empty part"), text || counts(c));
}
{
  const { c, text } = coverage((book) =>
    book.front_matter.push({ title: "Empty front matter", page: "/Nothing", no_descent: true }));
  check("a front_matter entry selecting no page is reported",
        only(c, { emptyEntries: 1 }) && text.includes("Empty front matter"), text || counts(c));
}
{
  const { c, text } = coverage((book) =>
    book.parts[1].chapters.push({ title: "Typo", landing_page: "/Ref/Typo/", page: "/Ref/Alpha" }));
  check("a landing_page naming no page is reported",
        only(c, { missingUrls: 1 }) && text.includes("/Ref/Typo/"), text || counts(c));
}
{
  // The foreword's page loses its only selector, so it is reported too:
  // both findings are the truth, and the probe asserts both.
  const { c, text } = coverage((book) => { book.parts[1].foreword_page = "/Ref/Missing"; });
  check("a foreword_page naming no page is reported, and the page it meant too",
        only(c, { missingUrls: 1, unlisted: 1 }) && text.includes("/Ref/Missing") &&
        text.includes("Ref/Intro.md"), text || counts(c));
}

// --- report ------------------------------------------------------------------

for (const { name, ok, detail } of results) {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok && detail) console.log(`       ${detail.replaceAll("\n", "\n       ")}`);
}
console.log(
  failures
    ? `check_book_coverage: ${failures} of ${results.length} probes failed -- ` +
      `bookCoverage() in builder/book.mjs no longer reports what the probe names`
    : `check_book_coverage: ${results.length} probes, all pass`
);
process.exit(failures ? 1 : 0);
