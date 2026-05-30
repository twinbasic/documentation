// Worker harness for the tbdocs build pipeline. Routes named tasks to the
// appropriate handler and posts back { result } or { error, stack }.
// See PLAN-scheduler.md §Worker for the full handler set; Phase 0 ships
// the dispatcher skeleton only -- handlers are filled in per phase.

import { parentPort } from "node:worker_threads";

const handlers = {
  // Phase 1: scss, mermaid, buildInfo
  // Phase 2: render
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
