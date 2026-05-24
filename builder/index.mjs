// tbdocs orchestrator. Phase 1 only: resolves the source root and runs
// DISCOVER. Subsequent phases plug into this same entry point.
//
// Usage: node builder/index.mjs [--src <path>]
//
// Default --src is "docs" relative to the current working directory
// (so the canonical invocation is `node builder/index.mjs` from the
// repo root). The flag exists for tests pointing at fixture trees.

import path from "node:path";
import process from "node:process";
import { discover } from "./discover.mjs";

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

async function main() {
  const { src } = parseArgs(process.argv.slice(2));
  const srcRoot = path.resolve(process.cwd(), src);

  const t0 = Date.now();
  const { pages, staticFiles } = await discover(srcRoot);
  const dt = Date.now() - t0;

  console.log(`discover: pages=${pages.length} static=${staticFiles.length} (${dt} ms)`);

  // Drift guard from PLAN-1.md §1 -- if this fires, either the exclude
  // logic regressed or content really shrank; either case warrants a look.
  if (pages.length < 836) {
    console.error(`WARN: page count ${pages.length} below baseline 836`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
