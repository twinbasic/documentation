// The screenshot review tool (WIP.ShotReview.md): a server on the loopback address with a
// page of every picture a session's runs took or drew, grouped by what shoot_docs.mjs and
// replay.mjs decided about it, and a page for each picture, which show each run's verdicts as
// they arrive. The session is in the gitignored .shot-review/ (lib/shot-session.mjs), and a
// run is shoot_docs.mjs or svgshot/replay.mjs as a child process with --stage and --events,
// or shoot_docs.mjs --cleanup (lib/shot-runs.mjs). The server is lib/shot-server.mjs, its pages lib/shot-pages.mjs.
//
// While a run is staged the tool is the only writer under docs/: each verdict is applied as it
// arrives, and again when a review decides otherwise or changes an allowance (lib/shot-verdicts.mjs),
// and a review's decisions and allowances go to the manifest. Its runs page starts a retake, a
// replay or a clean-up, one at a time, and stops one; --retake and --replay start one as it
// opens. Its commit page commits the session's own files: the commit closes the session, which
// is archived, and the tool goes on with the next one, whose baseline is the new commit;
// --archived opens an archived session again, read-only.

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
import { runOf } from "./lib/shot-runs.mjs";
import { createReviewServer } from "./lib/shot-server.mjs";
import {
  acquireLock,
  archiveRoot,
  listArchived,
  newestBuild,
  openSession,
  REVIEW_ROOT,
  sessionPaths,
} from "./lib/shot-session.mjs";

const DEFAULT_PORT = 4180;

const USAGE = `usage: node scripts/shot_review.mjs [--port N] [--retake <regex> | --replay <regex>] [--jobs N] [--ide <twinBASIC.exe>]
       node scripts/shot_review.mjs --archived <id> [--port N]
       node scripts/shot_review.mjs -h, --help

Serves the screenshot review of the session in .shot-review at
http://127.0.0.1:<port>/: every picture the session's runs took or drew,
grouped by what was decided about it, with a page for each that compares it
with the picture at the session's baseline, and the pictures that differ
from the baseline otherwise. Each verdict is applied under docs as it
arrives, and a picture's page can decide otherwise or change its allowances
(test/shots/manifest.json), which judges it again at once. Its runs page
(/runs) starts a retake, a replay or a clean-up of the pictures matching a
pattern or of those selected on the overview, one run at a time, stops
the one that runs, and removes one that has ended, as if it had not run (what
it wrote under docs is put back, and later runs' verdicts on those pictures
are judged again); a picture's page retakes it or replays its SVG. The
session is made when there is none, with HEAD as its baseline, and one tool
at a time holds it; closing the tool loses nothing, and what a run reported
and was not applied is applied when the session is opened again.

Its commit page (/commit) commits the session's own files and nothing else:
the PNGs and SVGs its runs reported that git reports changed, and the
manifest, with a message that can be edited. The commit closes the session,
which is archived in .shot-review/archive/<id> (<id> the commit's short
hash), and the tool goes on with the next session, whose baseline is the
new commit.

  --port N          the port to listen on, on the loopback address only
                    (default ${DEFAULT_PORT})
  --retake <regex>  start a run of shoot_docs.mjs --svg --only <regex>
  --replay <regex>  start a run of svgshot/replay.mjs --only <regex>
  --jobs N          the run's --jobs
  --ide <exe>       the retake's --ide
  --archived <id>   open an archived session instead, read-only, beside the
                    open one (give it another --port)
  -h, --help        print this text and exit

A retake is scripts/shoot_docs.mjs and a replay scripts/svgshot/replay.mjs,
each run with --stage, a folder of the session, and --events; a retake and a
clean-up are compared with the session's baseline (--against). A clean-up
(scripts/shoot_docs.mjs --cleanup) is not staged: it writes under docs
itself, and a review's actions wait while it runs. A commit runs git without
holding up the pages, which say it is under way; meanwhile nothing can be
changed and no run started. Ctrl+C stops a run that is running as its own stop
does (its IDEs end and the registry is put back), waits for a commit under way
to end, then closes the tool; a second Ctrl+C ends the run's process at once.

Exit codes:
  0  the tool was closed
  2  the tool could not run: a refused command line, the port in use, the
     session held by another tool, no archived session of that id, no git
     working tree, or a crash`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      port: { type: "string" },
      retake: { type: "string" },
      replay: { type: "string" },
      jobs: { type: "string" },
      ide: { type: "string" },
      archived: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
withUsageError(() => refuseTogether(values, ["retake", "replay"]));
for (const other of ["retake", "replay", "jobs", "ide"])
  withUsageError(() => refuseTogether(values, ["archived", other]));
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

const paths = sessionPaths(REVIEW_ROOT);
// The baseline a commit makes: the commit, and the newest build its manifest records.
const baselineAt = ({ hash, short }) => {
  const bytes = openRevision(REPO_ROOT, hash).bytes(path.relative(REPO_ROOT, MANIFEST).replace(/\\/g, "/"));
  const pictures = bytes ? parseManifest(bytes.toString("utf8")).pictures : {};
  return { hash, short, build: newestBuild(pictures) };
};

let app;
let session;
if (values.archived !== undefined) {
  // An archived session, read-only: no lock, no run, nothing applied, no commit.
  const found = listArchived(REVIEW_ROOT);
  if (!found.some((a) => a.id === values.archived))
    die(
      2,
      `shot_review: no archived session ${values.archived}${found.length ? `: the archived sessions are ${found.map((a) => a.id).join(", ")}` : ": there is none"}`,
    );
  session = openSession(archiveRoot(REVIEW_ROOT, values.archived), () => {
    throw new Error("an archived session has its baseline");
  });
  try {
    app = createReviewServer({
      session,
      revision: openRevision(DOCS_DIR, session.data.baseline.hash),
      manifest: () => openManifest(),
      bundlesRoot: BUNDLE_CACHE,
      archived: () => listArchived(REVIEW_ROOT),
      readOnly: true,
    });
  } catch (e) {
    die(2, `shot_review: ${e.message}`);
  }
} else {
  // The session: held by this tool alone, made with HEAD as its baseline when there is none.
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
  session = openSession(REVIEW_ROOT, () => baselineAt(head));
  app = createReviewServer({
    session,
    revision: openRevision(DOCS_DIR, session.data.baseline.hash),
    manifest: () => openManifest(),
    bundlesRoot: BUNDLE_CACHE,
    head: () => baselineAt(revisionOf(DOCS_DIR, "HEAD")),
    revisionAt: (hash) => openRevision(DOCS_DIR, hash),
    changed: () => changedPictures(DOCS_DIR, session.data.baseline.hash).pictures,
    ides: listIdes(),
    onLine: (run, line) => console.log(`run ${run.n}: ${line}`),
    // The commit closes the session: archived with its lock, and the next one held and made with
    // the commit as its baseline.
    onCommit(commit) {
      const archive = session.archive(commit);
      release = acquireLock(paths.lock);
      session = openSession(REVIEW_ROOT, () => baselineAt(commit));
      console.log(`committed ${commit.short}: ${commit.message}`);
      console.log(`the session is archived as ${archive}; the next one's baseline is ${commit.short}`);
      return { session, revision: openRevision(DOCS_DIR, commit.hash), archive };
    },
    archived: () => listArchived(REVIEW_ROOT),
  });
  const applied = app.applyPending();
  if (applied) console.log(`applied ${applied} verdicts the session's runs had reported and were not applied`);
}
let listening;
try {
  listening = await app.listen(port);
} catch (e) {
  release();
  die(2, `shot_review: port ${port} could not be used (${e.code ?? e.message}); choose another with --port`);
}
console.log(
  `screenshot review: http://127.0.0.1:${listening}/ (${values.archived === undefined ? "the session" : `the archived session ${values.archived}, read-only,`} of ${session.data.baseline.short}, ${session.data.runs.length} runs)`,
);

for (const kind of ["retake", "replay"]) {
  if (values[kind] === undefined) continue;
  const { run } = app.start(
    runOf({ kind, only: values[kind], jobs: values.jobs, ide: values.ide }, session.data.baseline),
  );
  console.log(`run ${run.n} started: a ${kind} of ${values[kind]}`);
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
  // A commit under way is let finish: git runs on a console of its own, which Ctrl+C does not
  // reach, and the session it commits is archived only once it has.
  const commit = app.committing();
  if (commit) {
    console.log("waiting for the commit to end");
    await commit;
  }
  await app.close();
  release();
  process.exit(0);
});
