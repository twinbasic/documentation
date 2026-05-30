// Worker harness for the tbdocs build pipeline. Routes named tasks to the
// appropriate handler and posts back { result } or { error, stack }.
// See PLAN-scheduler.md §Worker for the full handler set.

import { parentPort } from "node:worker_threads";

import { compileScss }       from "./scss.mjs";
import { regenerateMermaid } from "./mermaid.mjs";
import { captureBuildInfo }  from "./build-info.mjs";

// Phase 2: uncomment when render fan-out is wired up.
// import { initHighlighter }                         from "./highlight.mjs";
// import { createMarkdownIt, buildLinkTables,
//          renderPhase }                             from "./render.mjs";
// import { templatePhase }                           from "./template.mjs";
// const highlighterP = initHighlighter();

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

  // Phase 2: render handler (renderPhase + templatePhase over a chunk).
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
