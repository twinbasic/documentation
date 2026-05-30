// Worker harness for the tbdocs build pipeline. Routes named tasks to the
// appropriate handler and posts back { result } or { error, stack }.
// See PLAN-scheduler.md §Worker for the full handler set.

import { parentPort } from "node:worker_threads";

import { compileScss }       from "./scss.mjs";
import { regenerateMermaid } from "./mermaid.mjs";
import { captureBuildInfo }  from "./build-info.mjs";

import { initHighlighter }                         from "./highlight.mjs";
import { createMarkdownIt, buildLinkTables,
         renderPhase }                             from "./render.mjs";
import { templatePhase }                           from "./template.mjs";
import { unpackShared }                            from "./sab-broadcast.mjs";

// Start WASM init immediately, do NOT await. Module evaluation finishes
// synchronously so the parentPort.on('message') dispatcher is installed
// before the pool sends any work. Only the `render` handler awaits.
const highlighterP = initHighlighter();

const handlers = {
  async scss({ ctx }) {
    return { scssResult: await compileScss(ctx.srcRoot) };
  },

  async mermaid({ ctx }) {
    return { mermaidStats: await regenerateMermaid(ctx.srcRoot) };
  },

  async buildInfo() {
    return { buildInfo: await captureBuildInfo() };
  },

  async render({ inputs }) {
    const { sharedSAB, chunk } = inputs;
    const { siteData, initData, linkTablesData, staticFilesArr,
            baseurl, buildInfo } = unpackShared(sharedSAB);

    const highlighter = await highlighterP;
    const linkTables  = reconstructLinkTables(linkTablesData);
    const staticFiles = new Set(staticFilesArr);
    const markdown    = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles });

    const site = { ...siteData, markdown, buildInfo };
    await renderPhase(chunk, site);
    await templatePhase(chunk, site, initData);

    // book-combined pages have renderedContent but no html (Phase 8
    // handles them from renderedContent); send html: undefined for those.
    return chunk.map(p => ({
      destPath:        p.destPath,
      renderedContent: p.renderedContent,
      html:            p.html,
    }));
  },
};

parentPort.on("message", async (msg) => {
  const { name, ...payload } = msg;
  const handler = handlers[name];
  if (!handler) {
    parentPort.postMessage({ error: `unknown task: ${name}` });
    return;
  }
  try {
    const result = await handler(payload);
    parentPort.postMessage({ result });
  } catch (err) {
    parentPort.postMessage({ error: err.message, stack: err.stack });
  }
});

// linkTables values are page objects in the main pipeline, but
// resolveLink() in the relative-links plugin only reads .permalink.
// The serialized form ships [key, permalink] pairs; we reconstruct
// minimal { permalink } stubs in the worker.
function reconstructLinkTables({ byPath, byUrl, byRedirect }) {
  const make = (pairs) => new Map(pairs.map(([k, pl]) => [k, { permalink: pl }]));
  return { byPath: make(byPath), byUrl: make(byUrl), byRedirect: make(byRedirect) };
}
