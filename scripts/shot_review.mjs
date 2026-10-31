// The screenshot review tool (WIP.ShotReview.md): a server on the loopback address with a
// page of every picture a session's runs took or drew, grouped by what shoot_docs.mjs and
// replay.mjs decided about it, and a page for each picture, which show each run's verdicts as
// they arrive. The session is in the gitignored .shot-review/ (lib/shot-session.mjs), and a
// run is the command-line tool as a child process with --stage and --events
// (lib/shot-runs.mjs). The server is lib/shot-server.mjs, its pages lib/shot-pages.mjs.
//
// While a run is staged the tool is the only writer under docs/: each verdict is applied as it
// arrives, and again when a review decides otherwise or changes an allowance (lib/shot-verdicts.mjs),
// and a review's decisions and allowances go to the manifest. The runs page and the commit come
// in the plan's later steps.

import path from "node:path";
import {
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  regexOption,
  withUsageError,
} from "../lib/cli.mjs";
import { DOCS_DIR, REPO_ROOT } from "../lib/repo-paths.mjs";
import { listIdes } from "./lib/tb-install.mjs";
import { MANIFEST, openManifest, parseManifest } from "./lib/shot-manifest.mjs";
import { changedPictures, openRevision, revisionOf } from "./lib/shot-revision.mjs";
import { BUNDLE_CACHE } from "./svgshot/bundle.mjs";
import { createReviewServer } from "./lib/shot-server.mjs";
import { acquireLock, newestBuild, openSession, REVIEW_ROOT, sessionPaths } from "./lib/shot-session.mjs";

const DEFAULT_PORT = 4180;

const USAGE = `usage: node scripts/shot_review.mjs [--port N] [--retake <regex> | --replay <regex>] [--jobs N] [--ide <twinBASIC.exe>] [-h, --help]

Serves the screenshot review of the session in .shot-review at
http://127.0.0.1:<port>/: every picture the session's runs took or drew,
grouped by what was decided about it, with a page for each that compares it
with the picture at the session's baseline, and the pictures that differ
from the baseline otherwise. Each verdict is applied under docs as it
arrives, and a picture's page can decide otherwise or change its allowances
(test/shots/manifest.json), which judges it again at once. The session is
made when there is none, with HEAD as its baseline, and one tool at a time
holds it; closing the tool loses nothing, and what a run reported and was
not applied is applied when the session is opened again.

  --port N          the port to listen on, on the loopback address only
                    (default ${DEFAULT_PORT})
  --retake <regex>  start a run of shoot_docs.mjs --svg --only <regex>
  --replay <regex>  start a run of svgshot/replay.mjs --only <regex>
  --jobs N          the run's --jobs
  --ide <exe>       the retake's --ide
  -h, --help        print this text and exit

A run is the command-line tool with --stage, a folder of the session, and
--events; a retake is compared with the session's baseline (--against). Ctrl+C stops a run that is running as its own stop does (its IDEs end
and the registry is put back), then closes the tool; a second Ctrl+C ends the
run's process at once.

Exit codes:
  0  the tool was closed
  2  the tool could not run: a refused command line, the port in use, the
     session held by another tool, no git working tree, or a crash`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      port: { type: "string" },
      retake: { type: "string" },
      replay: { type: "string" },
      jobs: { type: "string" },
      ide: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
withUsageError(() => refuseTogether(values, ["retake", "replay"]));
const port = withUsageError(() =>
  numberOption(values.port ?? String(DEFAULT_PORT), { option: "--port", integer: true, min: 1, max: 65535 }),
);
for (const option of ["retake", "replay"])
  if (values[option] !== undefined) withUsageError(() => regexOption(values[option], { option: `--${option}` }));
if (values.jobs !== undefined)
  withUsageError(() => numberOption(values.jobs, { option: "--jobs", integer: true, min: 1, max: 16 }));
if (values.jobs !== undefined && values.retake === undefined && values.replay === undefined)
  die(2, "shot_review: --jobs is for a run: --retake or --replay");
if (values.ide !== undefined && values.retake === undefined) die(2, "shot_review: --ide is for --retake");

let release = () => {};
exitOnCrash(() => release());

// The session: held by this tool alone, made with HEAD as its baseline when there is none.
const paths = sessionPaths(REVIEW_ROOT);
try {
  release = acquireLock(paths.lock);
} catch (e) {
  die(2, `shot_review: ${e.message}`);
}
let head;
try {
  head = revisionOf(DOCS_DIR, "HEAD");
} catch (e) {
  release();
  die(2, `shot_review: ${e.message}`);
}
// The baseline a commit makes: the commit, and the newest build its manifest records.
const baselineAt = ({ hash, short }) => {
  const bytes = openRevision(REPO_ROOT, hash).bytes(path.relative(REPO_ROOT, MANIFEST).replace(/\\/g, "/"));
  const pictures = bytes ? parseManifest(bytes.toString("utf8")).pictures : {};
  return { hash, short, build: newestBuild(pictures) };
};
const session = openSession(REVIEW_ROOT, () => baselineAt(head));

const app = createReviewServer({
  session,
  revision: openRevision(DOCS_DIR, session.data.baseline.hash),
  manifest: () => openManifest(),
  bundlesRoot: BUNDLE_CACHE,
  head: () => baselineAt(revisionOf(DOCS_DIR, "HEAD")),
  revisionAt: (hash) => openRevision(DOCS_DIR, hash),
  changed: () => changedPictures(DOCS_DIR, session.data.baseline.hash).pictures,
  newestIde: listIdes()[0]?.build ?? null,
  onLine: (run, line) => console.log(`run ${run.n}: ${line}`),
});
const applied = app.applyPending();
if (applied) console.log(`applied ${applied} verdicts the session's runs had reported and were not applied`);
let listening;
try {
  listening = await app.listen(port);
} catch (e) {
  release();
  die(2, `shot_review: port ${port} could not be used (${e.code ?? e.message}); choose another with --port`);
}
console.log(
  `screenshot review: http://127.0.0.1:${listening}/ (the session of ${session.data.baseline.short}, ${session.data.runs.length} runs)`,
);

const runOptions = () => [
  ...(values.jobs === undefined ? [] : ["--jobs", values.jobs]),
  ...(values.ide === undefined ? [] : ["--ide", values.ide]),
];
if (values.retake !== undefined) {
  const { run } = app.start({
    tool: "shoot_docs",
    args: ["--svg", "--only", values.retake, "--against", session.data.baseline.hash, ...runOptions()],
  });
  console.log(`run ${run.n} started: a retake of ${values.retake}`);
}
if (values.replay !== undefined) {
  const { run } = app.start({ tool: "replay", args: ["--only", values.replay, ...runOptions()] });
  console.log(`run ${run.n} started: a replay of ${values.replay}`);
}

// Ctrl+C: the runs stopped as their own stop does, then the tool closed; a second one ends them at once.
let closing = false;
process.on("SIGINT", async () => {
  const live = app.live();
  if (closing) {
    for (const h of live) h.kill();
    release();
    process.exit(0);
  }
  closing = true;
  if (live.length) {
    console.log("stopping the runs: Ctrl+C again ends their processes at once, which skips putting the registry back");
    for (const h of live) h.stop();
    await Promise.all(live.map((h) => h.exited));
  }
  await app.close();
  release();
  process.exit(0);
});
