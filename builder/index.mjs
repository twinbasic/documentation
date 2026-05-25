// tbdocs orchestrator. Phases 1+2: DISCOVER + COMPUTE.
//
// Usage: node builder/index.mjs [--src <path>]
//
// Default --src is "docs" relative to the current working directory.
// The flag exists for tests pointing at fixture trees.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { captureBuildInfo } from "./build-info.mjs";
import { renderPhase } from "./render.mjs";

function parseArgs(argv) {
  const args = { src: "docs" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--src") {
      args.src = argv[++i];
    } else if (a.startsWith("--src=")) {
      args.src = a.slice("--src=".length);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function makeTimer() {
  const laps = [];
  let last = Date.now();
  return {
    lap(label) {
      const now = Date.now();
      laps.push({ label, ms: now - last });
      last = now;
    },
    summary() {
      return laps.map(l => `${l.label}=${l.ms}ms`).join(" ");
    },
  };
}

async function main() {
  const { src } = parseArgs(process.argv.slice(2));
  const srcRoot = path.resolve(process.cwd(), src);

  const t = makeTimer();
  const { pages, staticFiles } = await discover(srcRoot);
  t.lap("discover");

  // Issue build-info immediately so the git shell-outs overlap with the
  // CPU-bound nav work.
  const buildInfoPromise = captureBuildInfo();

  const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
  const { navTree } = computeNav(pages, config);
  t.lap("nav");

  const { seoSiteTitle, seoLogoUrl } = precomputeSeo(pages, config);
  t.lap("seo");

  const bookData = await loadBookData(srcRoot);
  resolveBookChapters(bookData, pages);
  t.lap("book");

  const buildInfo = await buildInfoPromise;
  t.lap("buildInfo");

  const site = { config, navTree, seoSiteTitle, seoLogoUrl, buildInfo, bookData };

  await renderPhase(pages, site, staticFiles);
  t.lap("render");

  console.log(`Phase 1+2+3 done: ${pages.length} pages, ${staticFiles.length} static files`);
  console.log(t.summary());

  // Drift guard from PLAN-1.md §1.
  if (pages.length < 836) {
    console.error(`WARN: page count ${pages.length} below baseline 836`);
    process.exitCode = 1;
  }

  // Phase 4+ chains in here.
  return { pages, staticFiles, site };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
