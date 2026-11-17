// Unit tests for builder/discover.mjs and builder/discover-read.mjs: the
// source tree's inventory, which the build reads in pieces on its lanes, and
// for builder/fnmatch.mjs, the patterns the output trees' inventories leave
// files out by.
//
// The build compares its output with the last commit's, so a fault that the
// site's own tree and its piece count do not reach passes it: an inventory
// that depends on how many pieces it was read in, a picture pair with a file
// from outside the tree. These read a small tree of their own in any number
// of pieces.
//
// Runs with a bare `node --test test/discover.test.mjs`: no build, no lanes.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { assemble, cutPieces, discover, listSources } from "../builder/discover.mjs";
import { readPiece } from "../builder/discover-read.mjs";
import { deriveTreeRels } from "../builder/check-tree.mjs";
import { fnmatchPathname, matchesAny } from "../builder/fnmatch.mjs";

// A PNG's first 24 bytes, which is all the build reads of one.
function pngHeader(width, height) {
  const b = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "latin1");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

const top = mkdtempSync(path.join(os.tmpdir(), "tbdocs-discover-"));
after(() => rmSync(top, { recursive: true, force: true }));
const srcRoot = path.join(top, "docs");
const put = (rel, content) => {
  const file = path.join(top, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const page = (title, extra = "") => `---\ntitle: ${title}\n${extra}---\n\nThe ${title} page.\n`;

for (const folder of ["A", "B", "C", "D", "E"]) {
  put(`docs/${folder}/index.md`, page(folder, `permalink: /x/${folder}/\n`));
  put(`docs/${folder}/Other.md`, page(`${folder} other`));
  put(`docs/${folder}/Images/shot.png`, pngHeader(800, 600));
  put(`docs/${folder}/Images/shot.light.png`, pngHeader(804, 600));
  put(`docs/${folder}/notes.txt`, `notes of ${folder}\n`);
}
put("docs/index.md", page("Home", "permalink: /\n"));
put("docs/Hash.md", page("Input #"));
put("docs/raw.md", "No frontmatter here.\n");
put("docs/A/Images/broken.png", pngHeader(10, 10));
put("docs/A/Images/broken.light.png", "not a PNG, though longer than a header");
put("docs/_out/skipped.md", page("Skipped"));
// Outside the tree, as _config.yml's bundle_extra names them: a file of its own,
// and the dark picture of a light picture that is inside the tree.
put("extra/tool.mjs", "export {};\n");
put("extra/dark.png", pngHeader(640, 480));
put("docs/A/Images/outside.light.png", pngHeader(644, 480));
const EXTRA = [
  { src: "../extra/tool.mjs", dest: "downloads/tool.mjs" },
  { src: "../extra/dark.png", dest: "A/Images/outside.png" },
];
const IGNORE = ["_*", "_*/**"];

async function inventory(count, extra = EXTRA) {
  const plan = cutPieces(await listSources(srcRoot, IGNORE), count, extra);
  const results = plan.pieces.map((piece) => readPiece(srcRoot, piece));
  return { plan, results, ...assemble(srcRoot, plan, results) };
}

describe("the source tree's inventory", () => {
  test("is the same in any number of pieces", async () => {
    const one = await inventory(1);
    assert.equal(one.plan.pieces.length, 1);
    for (const count of [2, 3, 4, 7, 50]) {
      const many = await inventory(count);
      assert.equal(many.plan.pieces.length, count);
      assert.deepEqual(many.pages, one.pages, `${count} pieces: the pages`);
      assert.deepEqual(many.staticFiles, one.staticFiles, `${count} pieces: the static files`);
      assert.deepEqual(
        Object.entries(many.pictureSizes),
        Object.entries(one.pictureSizes),
        `${count} pieces: the pairs`,
      );
    }
  });

  test("a count below one is one piece", async () => {
    assert.equal((await inventory(0)).plan.pieces.length, 1);
  });

  test("the pages are sorted by file name, then by path", async () => {
    const { pages } = await inventory(3);
    assert.deepEqual(
      pages.map((p) => p.srcRel),
      [
        "Hash.md",
        ...["A", "B", "C", "D", "E"].map((f) => `${f}/Other.md`),
        ...["A", "B", "C", "D", "E"].map((f) => `${f}/index.md`),
        "index.md",
      ],
    );
    const a = pages.find((p) => p.srcRel === "A/index.md");
    assert.equal(a.permalink, "/x/A/");
    assert.equal(a.destPath, "x/A/index.html");
    assert.equal(a.rawContent, "\nThe A page.\n");
    assert.equal(a.contentLine, 5);
    assert.equal(a.srcPath, path.join(srcRoot, "A/index.md"));
    assert.equal(pages.find((p) => p.srcRel === "A/Other.md").permalink, "/A/Other.html");
  });

  test("a file with no frontmatter is a static file, and an excluded one is nowhere", async () => {
    const { pages, staticFiles } = await inventory(2);
    const raw = staticFiles.find((s) => s.srcRel === "raw.md");
    assert.deepEqual(raw, { srcPath: path.join(srcRoot, "raw.md"), srcRel: "raw.md", destRel: "raw.md", size: 21 });
    assert.ok(![...pages, ...staticFiles].some((f) => f.srcRel.startsWith("_out")));
  });

  test("the static files are sorted by path, with the files from outside the tree after them", async () => {
    const { staticFiles } = await inventory(4);
    const rels = staticFiles.map((s) => s.srcRel);
    const inside = rels.slice(0, -EXTRA.length);
    assert.deepEqual(inside, [...inside].sort());
    assert.deepEqual(rels.slice(-EXTRA.length), ["downloads/tool.mjs", "A/Images/outside.png"]);
    const tool = staticFiles.at(-2);
    assert.equal(tool.srcPath, path.join(top, "extra", "tool.mjs"));
    assert.equal(tool.size, 11);
  });

  test("a pair's sizes are read, one with its dark picture outside the tree too", async () => {
    const { pictureSizes } = await inventory(3);
    assert.deepEqual(pictureSizes["B/Images/shot.light.png"], [804, 600, 800, 600]);
    assert.deepEqual(pictureSizes["A/Images/outside.light.png"], [644, 480, 640, 480]);
    // No entry for a pair with a file that is no PNG, or for a light picture with no dark one.
    assert.ok(!("A/Images/broken.light.png" in pictureSizes));
    assert.equal((await inventory(3, [])).pictureSizes["A/Images/outside.light.png"], undefined);
    // In the static files' order.
    const lights = Object.keys(pictureSizes);
    assert.deepEqual(lights, [...lights].sort());
  });

  test("an unquoted value that ends in # is a warning from its piece", async () => {
    const { results } = await inventory(2);
    const warnings = results.flatMap((r) => r.warnings);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /^discover: Hash\.md:2: an unquoted value ends in #/);
  });

  test("frontmatter that does not parse names its file", async () => {
    put("bad/docs/Bad.md", "---\ntitle: [unclosed\n---\n");
    const bad = path.join(top, "bad", "docs");
    const plan = cutPieces(await listSources(bad), 2);
    assert.throws(() => plan.pieces.map((p) => readPiece(bad, p)), /Failed to parse frontmatter in Bad\.md/);
  });

  test("discover() is the same inventory in one call, without the files from outside", async () => {
    const warn = console.warn;
    const warned = [];
    console.warn = (line) => warned.push(line);
    let found;
    try {
      found = await discover(srcRoot, IGNORE);
    } finally {
      console.warn = warn;
    }
    const pieces = await inventory(3, []);
    assert.deepEqual(found.pages, pieces.pages);
    assert.deepEqual(found.staticFiles, pieces.staticFiles);
    assert.equal(warned.length, 1);
  });
});

// The output trees' inventories leave out what offline_exclude names
// (builder/fnmatch.mjs). The site's own list has few wildcards, and the build's
// comparison sees only that list.
describe("the patterns a tree's inventory leaves files out by", () => {
  test("* stays within a folder, ** crosses folders, ? is one character", () => {
    assert.equal(fnmatchPathname("a/*.svg", "a/b.svg"), true);
    assert.equal(fnmatchPathname("a/*.svg", "a/c/b.svg"), false);
    assert.equal(fnmatchPathname("a/**", "a/c/b.svg"), true);
    assert.equal(fnmatchPathname("a/?.svg", "a/b.svg"), true);
    assert.equal(fnmatchPathname("a/?.svg", "a//.svg"), false);
    assert.equal(fnmatchPathname("a.b", "axb"), false);
  });

  test("a list matches as its patterns do one by one", () => {
    const patterns = ["Images/x.svg", "book/**", "*.tmp", "a+b(1).png"];
    const rels = [
      "Images/x.svg",
      "Images/x.svg2",
      "book/a/b.html",
      "book",
      "x.tmp",
      "d/x.tmp",
      "a+b(1).png",
      "aab1.png",
    ];
    for (const rel of rels) {
      const one = patterns.some((pat) => fnmatchPathname(pat, rel));
      assert.equal(matchesAny(rel, patterns), one, rel);
    }
    assert.equal(matchesAny("x", []), false);
    assert.equal(matchesAny("x", undefined), false);
  });

  test("a pattern added to a list that was already used is honoured", () => {
    const patterns = ["a.svg"];
    assert.equal(matchesAny("b.svg", patterns), false);
    patterns.push("b.svg");
    assert.equal(matchesAny("b.svg", patterns), true);
  });

  test("the offline tree's inventory leaves out what the list names", () => {
    const common = {
      pages: [{ destPath: "a\\index.html" }, { destPath: "book\\b.html" }],
      staticFiles: [{ destRel: "Images\\x.svg" }, { destRel: "Images\\x.png" }],
      stubs: [],
      themeAssetRels: [],
      excludePatterns: ["Images/x.svg", "book/**"],
    };
    const offline = deriveTreeRels("offline", common);
    assert.equal(offline.includes("a/index.html"), true);
    assert.equal(offline.includes("Images/x.png"), true);
    assert.equal(offline.includes("Images/x.svg"), false);
    assert.equal(offline.includes("book/b.html"), false);
    const online = deriveTreeRels("online", common);
    assert.equal(online.includes("Images/x.svg"), true);
    assert.equal(online.includes("book/b.html"), true);
  });
});
