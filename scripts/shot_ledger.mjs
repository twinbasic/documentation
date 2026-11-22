// The screenshot review tool's ledger, and the check that guards staging (WIP.ShotReview.md,
// The ledger; owner, 2026-11-22). Every commit the review tool makes is on record in the shared
// review folder's committed.jsonl, picture by picture (lib/shot-ledger.mjs). Staging may not move
// to a commit that brings in a screenshot at a state no line records: a picture taken or changed
// outside the review tool, or reviewed in a worktree whose session was lost.
//
//   node scripts/shot_ledger.mjs check <from> <to>    the screenshots from..to brings in unrecorded
//   node scripts/shot_ledger.mjs record <from> <to>   put them on record, by hand (the owner only)
//   node scripts/shot_ledger.mjs --hook               .githooks/reference-transaction calls this
//
// The hook reads git's lines (<old> <new> <ref>) on stdin, and for refs/heads/staging refuses the
// move when `check` would list anything: a fast-forward, a reset, a rebase that ends on staging, or
// a commit made on it. SHOT_LEDGER_ALLOW=1 lets one move through, saying what it let through; it is
// the owner's to set, never a session's.
//
// Exits 0 when nothing is unrecorded (or `record` recorded), 1 when something is (the hook: the
// move is refused), 2 when the command line is refused or the check crashes.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { ledgerFile, readLedger, runGit, unrecordedPictures } from "./lib/shot-ledger.mjs";
import { REVIEW_ROOT } from "./lib/shot-session.mjs";

exitOnCrash();

/** The branch the check guards. */
const GUARDED = "refs/heads/staging";
const ZERO = /^0+$/;

const USAGE = `usage: node scripts/shot_ledger.mjs check <from> <to>
       node scripts/shot_ledger.mjs record <from> <to>
       node scripts/shot_ledger.mjs --hook
       node scripts/shot_ledger.mjs -h, --help

Lists the screenshots (the PNGs test/shots/manifest.json names, and their SVGs)
that the commits <to> reaches and <from> and the remote-tracking refs do not
bring in at a state no commit of the screenshot review tool recorded. Its ledger
is .shot-review/committed.jsonl in the main checkout, which every worktree's
review tool writes to.

  check <from> <to>  list them; exit 1 when there is any
  record <from> <to> put them on record as reviewed (for the owner only, after
                     looking at them)
  --hook             what .githooks/reference-transaction runs: git's lines
                     on stdin; a move of ${GUARDED} that brings any in is
                     refused, unless SHOT_LEDGER_ALLOW=1 is set (the owner's)

Exit codes: 0 nothing unrecorded (or recorded), 1 something unrecorded (with
--hook: the move refused), 2 the command line refused, or a crash.`;

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: { hook: { type: "boolean" }, help: { type: "boolean", short: "h" } },
    positionals: { min: 0, max: 3 },
    stopAt: ["help"],
  }),
);
if (cli.stopped === "help") printHelpAndExit(USAGE);

const git = (args) => runGit(args, REPO_ROOT);
const commitOf = (rev) => {
  const r = git(["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]);
  if (r.status !== 0) {
    console.error(`shot_ledger: ${rev} is not a commit`);
    process.exit(2);
  }
  return r.stdout.trim();
};
const short = (hash) => hash.slice(0, 8);

function report(found, from, to) {
  console.error(
    `shot_ledger: ${short(from)}..${short(to)} brings in ${found.length} screenshot file(s) that no commit of the review tool recorded:`,
  );
  for (const f of found) console.error(`  ${f.path}  ${f.blob ? short(f.blob) : "(removed)"}  in ${short(f.commit)}`);
}

if (cli.values.hook) {
  if (cli.positionals.length) printHelpAndExit(USAGE, { stream: "stderr", exitCode: 2 });
  const lines = readFileSync(0, "utf8").split(/\r?\n/).filter(Boolean);
  let refused = false;
  for (const line of lines) {
    const [oldValue, newValue, ref] = line.split(" ");
    if (ref !== GUARDED || !newValue || ZERO.test(newValue)) continue;
    // git may not say what the ref held; in "prepared" it holds it still
    let from = oldValue;
    if (!from || ZERO.test(from)) {
      const r = git(["rev-parse", "--verify", "--quiet", GUARDED]);
      if (r.status !== 0) continue; // the branch is being made: nothing to compare with
      from = r.stdout.trim();
    }
    if (from === newValue) continue;
    const found = unrecordedPictures({ repo: REPO_ROOT, from, to: newValue, recorded: readLedger(REVIEW_ROOT) });
    if (!found.length) continue;
    report(found, from, newValue);
    if (process.env.SHOT_LEDGER_ALLOW === "1") {
      console.error("shot_ledger: let through, since SHOT_LEDGER_ALLOW=1 is set");
      continue;
    }
    console.error(
      `shot_ledger: staging is not moved. Take or review these pictures with the screenshot review tool (node scripts/shot_review.mjs) in the checkout that has them, and commit them from it; see WIP.ShotReview.md, The ledger.`,
    );
    refused = true;
  }
  process.exit(refused ? 1 : 0);
}

const [command, fromRev, toRev] = cli.positionals;
if (!["check", "record"].includes(command) || cli.positionals.length !== 3)
  printHelpAndExit(USAGE, { stream: "stderr", exitCode: 2 });
const from = commitOf(fromRev);
const to = commitOf(toRev);
const found = unrecordedPictures({ repo: REPO_ROOT, from, to, recorded: readLedger(REVIEW_ROOT) });
if (command === "check") {
  if (!found.length) {
    console.log(`shot_ledger: every screenshot ${short(from)}..${short(to)} brings in is on record`);
    process.exit(0);
  }
  report(found, from, to);
  process.exit(1);
}
if (!found.length) {
  console.log(`shot_ledger: nothing to record: every screenshot ${short(from)}..${short(to)} brings in is on record`);
  process.exit(0);
}
const file = ledgerFile(REVIEW_ROOT);
mkdirSync(path.dirname(file), { recursive: true });
appendFileSync(
  file,
  `${JSON.stringify({
    at: new Date().toISOString(),
    checkout: null,
    message: `recorded by hand: ${short(from)}..${short(to)}`,
    files: found.map((f) => [f.path, f.blob]),
  })}\n`,
);
console.log(`shot_ledger: ${found.length} screenshot file(s) of ${short(from)}..${short(to)} put on record`);
