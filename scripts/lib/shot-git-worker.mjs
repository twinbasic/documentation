// What the screenshot review reads from git while it serves its pages, read in a worker thread:
// the baseline HEAD would make (`head`) and the pictures that differ from the session's baseline
// (`changed`). Each is a few git processes run with execFileSync (shot-revision.mjs), which, in
// the server's own thread, held every request and every event of a run while they ran: on
// 2026-11-11 a page of the overview of a session of 132 pictures took 2 s, and each page in the
// browser fetches itself again on each update a run sends, so that a run's progress came minutes
// late and a page fetched again by hand waited behind the others. The server keeps the last value
// and serves it at once (shot-server.mjs, `kept`).

import path from "node:path";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import { MANIFEST, parseManifest } from "./shot-manifest.mjs";
import { changedPictures, openRevision, revisionOf } from "./shot-revision.mjs";
import { newestBuild } from "./shot-session.mjs";

/**
 * The baseline the commit `{hash, short}` makes, in the git repository whose working tree is
 * `repoRoot`: the commit, and the newest build its manifest records.
 */
export function baselineAt(repoRoot, { hash, short }) {
  const bytes = openRevision(repoRoot, hash).bytes(path.relative(repoRoot, MANIFEST).replace(/\\/g, "/"));
  const pictures = bytes ? parseManifest(bytes.toString("utf8")).pictures : {};
  return { hash, short, build: newestBuild(pictures) };
}

const reads = ({ docsDir, repoRoot }) => ({
  head: () => baselineAt(repoRoot, revisionOf(docsDir, "HEAD")),
  changed: (baseline) => changedPictures(docsDir, baseline, undefined, { svgs: true }).pictures,
});

/**
 * Starts the worker for the pictures' folder `docsDir` in the working tree `repoRoot`. Returns
 * {head(), changed(baseline), close()}: `head` a promise of the baseline HEAD would make,
 * `changed` one of the pictures whose PNG or SVG differs from the commit `baseline`
 * (changedPictures' with `svgs`), each rejected as the read throws; and `close` ends the worker.
 * One read at a time, in the order asked. The worker does not keep the process alive.
 */
export function startGitReader({ docsDir, repoRoot }) {
  const worker = new Worker(new URL(import.meta.url), { workerData: { gitReader: { docsDir, repoRoot } } });
  worker.unref();
  const waiting = new Map();
  let next = 0;
  let gone = null;
  const fail = (e) => {
    gone = e;
    for (const w of waiting.values()) w.reject(e);
    waiting.clear();
  };
  worker.on("message", ({ id, value, error }) => {
    const w = waiting.get(id);
    waiting.delete(id);
    if (error === undefined) w?.resolve(value);
    else w?.reject(new Error(error));
  });
  worker.on("error", fail);
  worker.on("exit", (code) => fail(new Error(`the git reader ended (exit ${code})`)));
  const ask = (fn, args) =>
    new Promise((resolve, reject) => {
      if (gone) return reject(gone);
      const id = next++;
      waiting.set(id, { resolve, reject });
      worker.postMessage({ id, fn, args });
    });
  return {
    head: () => ask("head", []),
    changed: (baseline) => ask("changed", [baseline]),
    close: () => worker.terminate(),
  };
}

if (!isMainThread && workerData?.gitReader) {
  const fns = reads(workerData.gitReader);
  parentPort.on("message", ({ id, fn, args }) => {
    try {
      parentPort.postMessage({ id, value: fns[fn](...args) });
    } catch (e) {
      parentPort.postMessage({ id, error: e.message });
    }
  });
}
