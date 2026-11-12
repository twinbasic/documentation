// A screenshot run typed in a terminal is a run of the session (WIP.ShotReview.md, One way to take
// pictures, rule 1): shoot_docs.mjs, its --cleanup, replay.mjs and chromeshot.mjs, whenever they
// would write under docs/. Each calls sessionRun once its command line has passed, before it does
// anything else; it returns only when the tool is to run as it was asked: the run is one of a
// session already (SESSION_RUN, startRun's), has a stage of its own, or writes nothing under docs/.
// Otherwise the run is handed to the screenshot review tool when it is open for this checkout, and
// followed in the terminal; and when it is not, this process opens the session itself and runs the
// tool as the review tool would, through the same code (shot-host.mjs): a child with --stage and
// --events, its verdicts applied under docs/ as they arrive, the run recorded in the session. Either
// way the terminal shows the run's lines, Ctrl+C stops it as the tool's Stop does (a second one
// ends its process), and the process exits with the run's code.

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import path from "node:path";
import { DOCS_DIR, REPO_ROOT } from "../../lib/repo-paths.mjs";
import { defaultBundleCache } from "../svgshot/bundle.mjs";
import { readRecords } from "./record-lines.mjs";
import { baselineAt } from "./shot-git-worker.mjs";
import { createRunHost } from "./shot-host.mjs";
import { openManifest } from "./shot-manifest.mjs";
import { openRevision, revisionOf } from "./shot-revision.mjs";
import { EXIT_KIND, followPath, SESSION_RUN, TERMINAL_RUN_PATH, terminalRunOf } from "./shot-runs.mjs";
import { acquireLock, openSession, REVIEW_ROOT, sessionPaths } from "./shot-session.mjs";
import { createApplier } from "./shot-verdicts.mjs";

/** The file the open review tool says where it listens in: {pid, port}. */
export const serverFile = (root = REVIEW_ROOT) => path.join(root, "server.json");

/** Says, for the review tool of this process, that it listens on `port`; returns what forgets it. */
export function announceServer(port, root = REVIEW_ROOT) {
  const file = serverFile(root);
  writeFileSync(file, `${JSON.stringify({ pid: process.pid, port })}\n`);
  return () => {
    try {
      if (JSON.parse(readFileSync(file, "utf8")).pid === process.pid) rmSync(file, { force: true });
    } catch {}
  };
}

const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
};

/** The review tool open for the session under `root`, {pid, port}, or null. */
export function openTool(root = REVIEW_ROOT, alive = isAlive) {
  const file = serverFile(root);
  if (!existsSync(file)) return null;
  try {
    const { pid, port } = JSON.parse(readFileSync(file, "utf8"));
    return Number.isInteger(pid) && Number.isInteger(port) && alive(pid) ? { pid, port } : null;
  } catch {
    return null;
  }
}

// A request to the review tool on `port`, as one of its own pages makes it (its Origin), the body
// JSON: resolves to {status, body} for a POST, and to the response itself for a GET.
function ask(port, method, where, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: where,
        headers: {
          Host: `127.0.0.1:${port}`,
          ...(data
            ? { Origin: `http://127.0.0.1:${port}`, "Content-Type": "application/json", "Content-Length": data.length }
            : {}),
        },
      },
      (res) => {
        if (method === "GET") return resolve(res);
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let parsed = {};
          try {
            parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {}
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on("error", reject);
    req.end(data ?? undefined);
  });
}

// Ctrl+C: `stop()` the first time, `kill()` the next.
function onInterrupt(name, stop, kill) {
  let asked = false;
  process.on("SIGINT", () => {
    if (asked) {
      console.error(`${name}: ending the run's process: the registry is not put back`);
      kill();
      return;
    }
    asked = true;
    console.error(`${name}: stopping the run as the review tool's Stop does; Ctrl+C again ends its process`);
    stop();
  });
}

/**
 * The run of `tool` with `args` handed to the review tool `open` ({port}, openTool's) and followed:
 * a promise of the run's exit code, or 2 when the tool refused it or stopped answering. Its lines go
 * to `out`, what is said about it to `err`; `onRun(n)` is told its number, and `interrupt` makes
 * Ctrl+C stop it (then end it).
 */
export async function handToTool({
  name,
  open: { port },
  tool,
  args,
  interrupt = true,
  out = console.log,
  err = console.error,
  onRun = () => {},
}) {
  let answer;
  try {
    answer = await ask(port, "POST", TERMINAL_RUN_PATH, { tool, args });
  } catch (e) {
    err(`${name}: the review tool open for this checkout does not answer on port ${port}: ${e.message}`);
    return 2;
  }
  if (answer.status !== 200) {
    err(`${name}: the review tool refused the run: ${answer.body.error ?? `status ${answer.status}`}`);
    return 2;
  }
  const n = answer.body.run;
  onRun(n);
  out(`${name}: run ${n} of the session, handed to the review tool: http://127.0.0.1:${port}/runs`);
  const action = (what) =>
    ask(port, "POST", `/api/run/${n}`, { action: what }).then(
      (r) => r.status !== 200 && err(`${name}: ${what}: ${r.body.error ?? r.status}`),
      (e) => err(`${name}: ${what}: ${e.message}`),
    );
  if (interrupt)
    onInterrupt(
      name,
      () => action("stop"),
      () => action("kill"),
    );
  let res;
  try {
    res = await ask(port, "GET", followPath(n));
  } catch (e) {
    err(`${name}: the run could not be followed: ${e.message}; it goes on in the review tool`);
    return 2;
  }
  return new Promise((resolve) => {
    let exit;
    readRecords(res, [EXIT_KIND], {
      onRecord: (_, value) => {
        exit = value.exit;
      },
      onLine: out,
    });
    res.on("end", () => {
      if (exit === undefined) {
        err(`${name}: the review tool stopped answering before run ${n} ended`);
        return resolve(2);
      }
      resolve(exit ?? 1);
    });
    res.on("error", () => {});
  });
}

// The session opened here, the run made in it and its verdicts applied: the run's exit code, or 2.
async function runHere(name, tool, args, root) {
  const paths = sessionPaths(root);
  let release;
  try {
    release = acquireLock(paths.lock);
  } catch (e) {
    console.error(
      `${name}: ${e.message}. A run from a terminal holds it too: try again once that run has ended, or open the review tool`,
    );
    return 2;
  }
  try {
    const head = revisionOf(DOCS_DIR, "HEAD");
    const session = openSession(root, () => baselineAt(REPO_ROOT, head));
    const baseline = session.data.baseline;
    const revision = openRevision(DOCS_DIR, baseline.hash);
    const applier = createApplier({
      session,
      docsRoot: DOCS_DIR,
      bundlesRoot: defaultBundleCache(name),
      revision: () => revision,
      manifest: () => openManifest(),
    });
    const pending = applier.pending();
    if (pending)
      console.log(`${name}: applied ${pending} verdicts the session's runs had reported and were not applied`);
    if (baseline.hash !== head.hash)
      console.log(
        `${name}: the session's baseline is ${baseline.short} and HEAD is ${head.short}: the run is compared with ${baseline.short}; the review tool moves the session to HEAD`,
      );
    let request;
    try {
      request = terminalRunOf(tool, args, baseline);
    } catch (e) {
      console.error(`${name}: ${e.message}`);
      return 2;
    }
    let ended;
    const done = new Promise((resolve) => {
      ended = resolve;
    });
    const host = createRunHost({
      session: () => session,
      applier: () => applier,
      onLine: (_, text, stream) => (stream === "stderr" ? console.error : console.log)(text),
      onExit: (record) => ended(record),
    });
    const handle = host.start(request);
    console.log(
      `${name}: run ${handle.run.n} of the session in .shot-review, compared with ${baseline.short}; node scripts/shot_review.mjs reviews it`,
    );
    onInterrupt(name, handle.stop, handle.kill);
    await done;
    host.close();
    const record = session.run(handle.run.n);
    return record?.exit ?? 1;
  } catch (e) {
    console.error(`${name}: the session could not be opened: ${e.message}`);
    return 2;
  } finally {
    release();
  }
}

/**
 * Makes this run of `tool` (as a run records it: "shoot_docs", "cleanup", "replay" or "chromeshot")
 * a run of the session when it `writes` under docs/: never returns then, and exits with the run's
 * code. Returns at once when it does not, or when this process is a session's run already. `name`
 * is what the terminal's lines are said by; `args` the command line as typed.
 */
export async function sessionRun({ tool, name = tool, args = process.argv.slice(2), writes, root = REVIEW_ROOT }) {
  if (!writes || process.env[SESSION_RUN]) return;
  const open = openTool(root);
  const code = open ? await handToTool({ name, open, tool, args }) : await runHere(name, tool, args, root);
  process.exit(code);
}
