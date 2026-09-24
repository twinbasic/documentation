#!/usr/bin/env node
// Run one use-case evaluator as an isolated Claude Code process.
//
//     node eval/run_case.mjs --corpus <dir> --site <snapshot> --protocol <repo|site>
//                            --goal <file> --out <prefix> [options]
//     node eval/run_case.mjs --smoke --corpus <dir> --site <snapshot> --out <prefix> [options]
//
//       --claude <exe>    the Claude Code executable (default: $EVAL_CLAUDE, else
//                         claude on PATH)
//       --model <name>    the evaluator's model (default: sonnet)
//       --timeout <min>   give up after this many minutes (default 20)
//       --prompt-only     write the prompt and the search shim, run nothing
//
// A case writes <prefix>.prompt.md, <prefix>.jsonl (the whole session, as
// stream-json), <prefix>.err, <prefix>.report.md and <prefix>.meta.json, and
// prints eval/transcript.mjs's digest. --smoke runs a fixed configuration
// check instead of a case, on the site-entry protocol, and asserts what came
// back. Run it once per round, before the cases. See eval/README.md.
//
// Exit: 0 the run finished (--smoke: every check passed), 1 it did not
// (--smoke: a check failed), 2 it could not start.
//
// ---------------------------------------------------------------- why
//
// Rounds 1-7 ran each evaluator as a subagent of the orchestrating session.
// A subagent started in this repository receives the session's CLAUDE.md, and
// the local CLAUDE.md is one line, @WIP.md --- so the evaluator had in its own
// context the file build_corpus.mjs withholds from the corpus: every gate's
// hazard, remedy and don't. Asked without tools, a subagent quoted WIP.md's
// first heading. Renaming CLAUDE.md for the spawn changes nothing, because the
// session has already read it.
//
// A separate process started inside the corpus has no CLAUDE.md above it, and
// everything else that reaches a model's context is switched off here:
//
//   * --safe-mode: no CLAUDE.md, skills, installed plugins, hooks or MCP. Two
//     built-in plugins still load, and one is named agents-md, so the
//     preflight refuses a corpus with an AGENTS.md in it, or above it.
//   * --tools Read,Grep,Glob,Bash: nothing can write, fetch or spawn.
//   * blockReadsOutsideWorkingDirectories, with the working directory set to
//     the corpus root, or to its docs/ for the site-entry protocol: "only
//     files under docs/ may be opened" is a property of the process rather
//     than an instruction.
//   * --permission-mode dontAsk with one allow rule, Bash(site-search *):
//     every other command is refused without asking.
//   * every CLAUDE* and MCP_* variable is dropped, so the child cannot attach
//     to the session that started it.
//
// The search box is a generated shim on the child's PATH rather than the
// command protocol.md used to give, `node eval/site_search.mjs ...`. Under
// dontAsk, a command naming the script by its path was refused whatever the
// allow rule said: the rule passed with --allowedTools, the rule passed with
// --settings, the rule for the subst-ed O:\ form of the path, and a bare
// --help were all refused, and the debug log showed only that the rule had
// loaded. `site-search "..."` passes. Which part of the path matching refuses
// was not isolated.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printDigest, readTranscript, summarize } from "./transcript.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEARCH_SCRIPT = path.join(REPO_ROOT, "eval", "site_search.mjs");
const SEARCH_COMMAND = 'site-search "your query here"';

const SETTINGS = JSON.stringify({
  permissions: { blockReadsOutsideWorkingDirectories: true, allow: ["Bash(site-search *)"] },
});

/** Files Claude Code reads into a model's context from the working directory,
 *  its ancestors, and any directory a read touches. */
const MEMORY_FILES = ["CLAUDE.md", "CLAUDE.local.md", "AGENTS.md"];

const fwd = (p) => p.split(path.sep).join("/");

function parseArgs(argv) {
  const o = { claude: process.env.EVAL_CLAUDE || "claude", model: "sonnet", timeout: 20 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--corpus") o.corpus = path.resolve(argv[++i]);
    else if (a === "--site") o.site = path.resolve(argv[++i]);
    else if (a === "--protocol") o.protocol = argv[++i];
    else if (a === "--goal") o.goal = path.resolve(argv[++i]);
    else if (a === "--out") o.out = path.resolve(argv[++i]);
    else if (a === "--claude") o.claude = argv[++i];
    else if (a === "--model") o.model = argv[++i];
    else if (a === "--timeout") o.timeout = Number(argv[++i]);
    else if (a === "--smoke") o.smoke = true;
    else if (a === "--prompt-only") o.promptOnly = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  if (o.smoke) o.protocol = "site";
  return o;
}

/** The evaluator-facing half of protocol.md: from its first rule up to "For the orchestrator". */
function evaluatorProtocol() {
  const lines = fs.readFileSync(path.join(REPO_ROOT, "eval", "protocol.md"), "utf8").split(/\r?\n/);
  const start = lines.indexOf("---");
  const end = lines.findIndex((l) => l.startsWith("## For the orchestrator"));
  if (start < 0 || end < start) throw new Error("eval/protocol.md: cannot find the evaluator-facing half");
  const text = lines.slice(start + 1, end).join("\n").trim();
  if (!text.includes(SEARCH_COMMAND)) {
    throw new Error(`eval/protocol.md: the evaluator half no longer gives the search command as ${SEARCH_COMMAND}`);
  }
  return text;
}

function casePrompt(o, goal) {
  const root = fwd(o.corpus);
  const where = o.protocol === "site"
    ? `This case uses **the site-entry variant** described above. Your working directory is ` +
      `\`${root}/docs\`, and nothing outside it can be opened.`
    : `This case uses the default protocol, not the site-entry variant. Your working directory ` +
      `is \`${root}\`.`;
  return `${evaluatorProtocol().replaceAll("<CORPUS_ROOT>", root)}\n\n## This case\n\n${where}\n\n` +
    `## Your goal\n\n${goal.trim()}\n`;
}

function smokePrompt() {
  return [
    "This is a configuration check, not a task. Do each item once, in order, and answer briefly.",
    "",
    "1. Without using any tool: write a line reading BEGIN CONTEXT, then every heading (a line " +
      "starting with #) that appears in any system reminder or appended context you were given, " +
      "one per line and verbatim, then a line reading END CONTEXT.",
    '2. With your Bash tool, run: site-search "keep my project in git"',
    '3. With your Bash tool, run: node -e "console.log(1)"',
    `4. With your Read tool, read ${fwd(path.join(REPO_ROOT, "WIP.md"))} and report only whether ` +
      "the read was refused.",
    "5. With your Read tool, read ../README.md and report only whether the read was refused.",
    "6. With your Read tool, read index.md and report only its first heading.",
  ].join("\n") + "\n";
}

const FORBIDDEN_CONTEXT = /working notes|wip\.md|check_code_regions|source_extensions|modules-dark/i;

function smokeChecks(s) {
  const bash = (re) => s.calls.filter((c) => c.tool === "Bash" && re.test(String(c.input.command ?? "")));
  const read = (re) => s.calls.filter((c) => c.tool === "Read" && re.test(fwd(String(c.input.file_path ?? ""))));
  const all = s.texts.join("\n");
  const b = all.indexOf("BEGIN CONTEXT");
  const e = all.indexOf("END CONTEXT");
  const context = b >= 0 && e > b ? all.slice(b, e) : null;
  return [
    ["the search box runs", bash(/site-search/).some((c) => c.ok && c.output.includes("query:"))],
    ["any other command is refused", bash(/node -e/).some((c) => c.ok === false)],
    ["the repository is unreadable", read(/\/WIP\.md$/).some((c) => c.ok === false)],
    ["the corpus outside docs/ is unreadable", read(/README\.md$/).some((c) => c.ok === false)],
    ["the published tree is readable", read(/index\.md$/).some((c) => c.ok === true)],
    ["the context holds no project notes", context !== null && !FORBIDDEN_CONTEXT.test(context)],
  ];
}

/** Memory files the evaluator would load: above its working directory, or anywhere in the corpus. */
function memoryFiles(corpus, cwd) {
  const found = new Set();
  for (let d = cwd; ; d = path.dirname(d)) {
    for (const f of [...MEMORY_FILES, path.join(".claude", "CLAUDE.md")]) {
      if (fs.existsSync(path.join(d, f))) found.add(path.join(d, f));
    }
    if (path.dirname(d) === d) break;
  }
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (MEMORY_FILES.includes(entry.name)) found.add(abs);
    }
  };
  walk(corpus);
  return [...found];
}

/** The evaluator's search box: site_search.mjs against the snapshot, and nothing else. */
function writeShim(binDir, site) {
  for (const p of [SEARCH_SCRIPT, site]) {
    if (/["$`]/.test(p)) throw new Error(`cannot quote ${p} in a shell script`);
  }
  fs.mkdirSync(binDir, { recursive: true });
  const shim = path.join(binDir, "site-search");
  fs.writeFileSync(shim,
    "#!/usr/bin/env bash\n" +
    "# Generated by eval/run_case.mjs: the site's search box, against the index\n" +
    "# snapshotted with this round's corpus.\n" +
    `exec node "${fwd(SEARCH_SCRIPT)}" --site "${fwd(site)}" "$@"\n`);
  fs.chmodSync(shim, 0o755);
}

function childEnv(binDir) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    const u = k.toUpperCase();
    if (!u.startsWith("CLAUDE") && !u.startsWith("MCP_")) env[k] = v;
  }
  const key = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  env[key] = binDir + path.delimiter + (env[key] ?? "");
  return env;
}

function runClaude(o, prompt, cwd, binDir) {
  const args = [
    "-p", "--model", o.model, "--safe-mode",
    "--tools", "Read,Grep,Glob,Bash",
    "--permission-mode", "dontAsk", "--settings", SETTINGS,
    "--strict-mcp-config", "--disable-slash-commands", "--no-session-persistence",
    "--output-format", "stream-json", "--verbose",
  ];
  const out = fs.openSync(`${o.out}.jsonl`, "w");
  const err = fs.openSync(`${o.out}.err`, "w");
  return new Promise((resolve) => {
    const child = spawn(o.claude, args, {
      cwd, env: childEnv(binDir), stdio: ["pipe", out, err], windowsHide: true,
    });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, o.timeout * 60_000);
    const done = (code, error) => {
      clearTimeout(timer);
      fs.closeSync(out);
      fs.closeSync(err);
      resolve({ code, error, timedOut });
    };
    child.once("error", (e) => done(null, e));
    child.once("exit", (code) => done(code, null));
    child.stdin.end(prompt);
  });
}

const USAGE =
  "Usage: node eval/run_case.mjs --corpus <dir> --site <snapshot> --protocol <repo|site>\n" +
  "                              --goal <file> --out <prefix> [--claude <exe>] [--model <m>]\n" +
  "                              [--timeout <min>] [--prompt-only]\n" +
  "       node eval/run_case.mjs --smoke --corpus <dir> --site <snapshot> --out <prefix>\n\n" +
  "Runs one use-case evaluator as an isolated Claude Code process and audits its\n" +
  "session. See eval/README.md.";

async function main(argv) {
  const o = parseArgs(argv);
  const complete = o.corpus && o.site && o.out &&
    (o.smoke || (o.goal && ["repo", "site"].includes(o.protocol)));
  if (o.help || !complete) {
    console.log(USAGE);
    return o.help ? 0 : 2;
  }

  const cwd = o.protocol === "site" ? path.join(o.corpus, "docs") : o.corpus;
  const needed = [cwd, path.join(o.site, "assets/js/search-data.json"), path.join(o.site, "assets/js/vendor/lunr.min.js")];
  const missing = needed.filter((p) => !fs.existsSync(p));
  if (missing.length) {
    console.error(`missing: ${missing.join(", ")}`);
    return 2;
  }
  const memory = memoryFiles(o.corpus, cwd);
  if (memory.length) {
    console.error(`these would be read into the evaluator's context:\n  ${memory.join("\n  ")}`);
    return 2;
  }

  fs.mkdirSync(path.dirname(o.out), { recursive: true });
  const prompt = o.smoke ? smokePrompt() : casePrompt(o, fs.readFileSync(o.goal, "utf8"));
  fs.writeFileSync(`${o.out}.prompt.md`, prompt);
  const binDir = `${o.out}.bin`;
  writeShim(binDir, o.site);
  if (o.promptOnly) {
    console.log(`wrote ${o.out}.prompt.md and ${fwd(binDir)}/site-search`);
    return 0;
  }

  const started = new Date().toISOString();
  const run = await runClaude(o, prompt, cwd, binDir);
  if (run.error) {
    console.error(`cannot start ${o.claude}: ${run.error.message}`);
    return 2;
  }
  const s = summarize(readTranscript(`${o.out}.jsonl`));
  fs.writeFileSync(`${o.out}.report.md`, s.report);
  fs.writeFileSync(`${o.out}.meta.json`, JSON.stringify({
    kind: o.smoke ? "smoke" : "case", protocol: o.protocol, goal: o.goal ?? null,
    corpus: o.corpus, site: o.site, cwd, model: s.init?.model ?? null,
    claudeCode: s.init?.claude_code_version ?? null, started, finished: new Date().toISOString(),
    exit: run.code, timedOut: run.timedOut,
  }, null, 2) + "\n");
  printDigest(s);

  if (s.result?.is_error && /authenticat/i.test(s.report)) {
    console.log("\nclaude is not signed in: run `claude auth login`, then run this again.");
    return 1;
  }
  if (run.timedOut) {
    console.log(`\ntimed out after ${o.timeout} min`);
    return 1;
  }
  if (o.smoke) {
    console.log("");
    const checks = smokeChecks(s);
    for (const [name, ok] of checks) console.log(`${ok ? "ok  " : "FAIL"}  ${name}`);
    return checks.every(([, ok]) => ok) ? 0 : 1;
  }
  if (run.code !== 0 || !s.report) {
    console.log(`\nclaude exited ${run.code}; see ${o.out}.err`);
    return 1;
  }
  console.log(`\nreport: ${o.out}.report.md`);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e) => { console.error(e.message); process.exit(2); },
);
