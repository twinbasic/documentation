// Self-test for lib/cli.mjs, the command-line parser the tools move onto, and
// the tools' own command-line cases.
//
//     node scripts/check_cli.mjs
//
// Nothing else tests how any tool reads its command line, which is how a
// value flag given no value came to be read as NaN or as the next flag, and
// `--help` as an output folder. So this makes two assertions.
//
// The module's probes: what parseCli returns and refuses, including a
// comparison with a strict node:util parseArgs over the same argument lists,
// and what numberOption, withUsageError and printHelpAndExit do.
//
// The recorded cases: invocations that stop while the tool reads its command
// line, each with the exit code and the text printed on each stream. A tool's
// cases are recorded from its behaviour before it moves onto lib/cli.mjs, so
// the move has to keep them. A case pins the tool's own words for the error
// exactly; a usage text printed after it is matched by its opening, so adding
// a flag to a tool's usage does not fail this gate. A string is the whole
// stream; a RegExp must match it; a stream a case does not name must be empty.
//
// Only invocations that stop while reading the command line belong here. Each
// runs as a child process, all of them at once, each with a time limit, in an
// empty folder of its own and with TB_IDE and PUPPETEER_EXECUTABLE_PATH naming
// files that do not exist. So a case that gets past the command line fails on
// a message of a different kind rather than starting a twinBASIC IDE or a
// browser, and a default path relative to the working folder, such as
// tbdocs's `docs`, finds nothing. No tree, no browser, no install; about a
// second.

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { CliError, numberOption, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { createProbes, exitOnCrash } from "./lib/gate-probes.mjs";

exitOnCrash();

const { check, report } = createProbes("check_cli");
const show = (x) => JSON.stringify(x);
const caught = (fn) => {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
};
const cliError = (fn, code) => {
  const err = caught(fn);
  return err instanceof CliError && err.code === code ? err : null;
};

// ------------------------------------------------------------ parseCli

const OPTIONS = {
  verbose: { type: "boolean", short: "v" },
  port: { type: "string", short: "p" },
  "root-dir": { type: "string" },
  forbid: { type: "string", multiple: true },
};

{
  const { values } = parseCli([], {
    options: { ...OPTIONS, "root-dir": { type: "string", default: "docs" } },
  });
  check("an absent option takes its default, a multiple one [], any other none", show(values) === show({ rootDir: "docs", forbid: [] }),
    show(values));
}
{
  const { values } = parseCli(["--root-dir", "a", "--root-dir=b", "-v", "--forbid", "x", "--forbid=y"], { options: OPTIONS });
  check("values are keyed in camelCase; a repeat keeps the last, a multiple one all in order",
    show(values) === show({ rootDir: "b", verbose: true, forbid: ["x", "y"] }), show(values));
}
{
  const err = cliError(() => parseCli(["--port"], { options: OPTIONS }), "missing-value");
  check("a value flag at the end has no value", err?.option === "--port" && err.value === undefined && err.message === "--port needs a value",
    show(err));
  const short = cliError(() => parseCli(["-p"], { options: OPTIONS }), "missing-value");
  check("the error names the flag as typed", short?.option === "-p" && short.message === "-p needs a value", show(short));
}
{
  const err = cliError(() => parseCli(["--port", "--verbose"], { options: OPTIONS }), "missing-value");
  check("a value flag followed by a flag has no value", err?.value === "--verbose", show(err));
  const { values } = parseCli(["--port=-5", "-p", "-"], { options: OPTIONS });
  check("an inline value may start with a dash, and a lone - is a value", values.port === "-", show(values));
  const inline = parseCli(["--port=-5"], { options: OPTIONS }).values;
  check("--port=-5 is -5", inline.port === "-5", show(inline));
}
{
  const err = cliError(() => parseCli(["--bogus=1"], { options: OPTIONS }), "unknown-option");
  check("an unknown option is an error that names it as given",
    err?.option === "--bogus" && err.arg === "--bogus=1" && err.message === "unknown option: --bogus=1", show(err));
  const bool = cliError(() => parseCli(["--verbose=1"], { options: OPTIONS }), "unexpected-value");
  check("a boolean given a value is an error", bool?.message === "--verbose takes no value", show(bool));
  const extra = cliError(() => parseCli(["a"], { options: OPTIONS }), "unexpected-positional");
  check("a positional the tool does not take is an error", extra?.arg === "a" && extra.message === "unexpected argument: a", show(extra));
}
{
  const spec = { options: OPTIONS, positionals: { max: 1 }, unknown: "ignore" };
  const r = parseCli(["--bogus", "x", "t", "--verbose=1", "--port", "80", "-q", "u"], spec);
  check("unknown: ignore drops unknown options, a boolean's value and surplus positionals, in order",
    show(r.values) === show({ port: "80", forbid: [] }) && show(r.positionals) === show(["x"])
      && show(r.ignored) === show(["--bogus", "t", "--verbose=1", "-q", "u"]),
    show(r));
  const err = cliError(() => parseCli(["--bogus", "--port"], spec), "missing-value");
  check("unknown: ignore still refuses a value flag with no value", err?.option === "--port", show(err));
}
{
  const r = parseCli(["--x", "-5", "-ab", "t", "--verbose", "--y=1"], { options: OPTIONS, positionals: { max: Infinity }, unknown: "positional" });
  check("unknown: positional makes each unknown option one positional, as given",
    show(r.positionals) === show(["--x", "-5", "-ab", "t", "--y=1"]) && r.values.verbose === true, show(r));
  const err = cliError(() => parseCli(["--x", "t"], { options: OPTIONS, positionals: 1, unknown: "positional" }), "unexpected-positional");
  check("unknown: positional counts them", err?.arg === "t", show(err));
}
{
  const few = cliError(() => parseCli([], { options: OPTIONS, positionals: 1 }), "missing-positional");
  check("too few positionals is an error", few?.message === "expected at least 1 argument, got 0", show(few));
  const many = cliError(() => parseCli(["a", "b"], { options: OPTIONS, positionals: { min: 1, max: 1 } }), "unexpected-positional");
  check("too many positionals is an error naming the first extra", many?.arg === "b", show(many));
  const r = parseCli(["--", "--verbose"], { options: OPTIONS, positionals: 1 });
  check("after -- every argument is a positional", show(r.positionals) === show(["--verbose"]) && !("verbose" in r.values)
    && r.tokens[0].kind === "option-terminator", show(r));
}
{
  const r = parseCli(["--no-check", "x", "--check", "-v"], {
    options: { "no-check": { type: "boolean" }, check: { type: "boolean" }, verbose: { type: "boolean", short: "v" } },
    positionals: 1,
  });
  check("tokens keep the order, each option's with its key",
    show(r.tokens.map((t) => t.key ?? t.value)) === show(["noCheck", "x", "check", "verbose"]), show(r.tokens));
}
{
  const truthy = { options: OPTIONS, acceptsValue: (v) => Boolean(v) };
  check("acceptsValue can take a flag as a value", parseCli(["--port", "--verbose"], truthy).values.port === "--verbose");
  check("acceptsValue can refuse an empty value", Boolean(cliError(() => parseCli(["--port", ""], truthy), "missing-value")));
  const any = parseCli(["--port"], { options: { port: { type: "string", default: "d" } }, acceptsValue: () => true }).values;
  check("a value acceptsValue takes is stored as it is, undefined included", "port" in any && any.port === undefined, show(any));
}
check("unknown takes only its three values", caught(() => parseCli([], { unknown: "warn" })) instanceof TypeError);

// With the defaults, parseCli refuses what a strict parseArgs refuses, in the
// same kind, and otherwise returns the same values and positionals.
{
  const KINDS = {
    ERR_PARSE_ARGS_UNKNOWN_OPTION: ["unknown-option"],
    ERR_PARSE_ARGS_INVALID_OPTION_VALUE: ["missing-value", "unexpected-value"],
    ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL: ["unexpected-positional"],
  };
  const camel = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  const outcome = (fn, strict) => {
    try {
      const { values, positionals } = fn();
      const entries = Object.entries(values)
        .map(([k, v]) => [strict ? camel(k) : k, v])
        .filter(([k, v]) => !(Array.isArray(v) && v.length === 0 && !strict && OPTIONS[k]?.multiple))
        .sort(([a], [b]) => a.localeCompare(b));
      return show({ values: entries, positionals });
    } catch (err) {
      return strict ? show(KINDS[err.code] ?? err.code) : show(Object.values(KINDS).find((k) => k.includes(err.code)) ?? err.code);
    }
  };
  const LISTS = [
    [], ["--verbose"], ["-v"], ["--port", "80"], ["--port=80"], ["-p", "80"], ["-p80"], ["-vp", "80"], ["-pv"],
    ["--port"], ["-p"], ["--port", "--verbose"], ["--port", "-5"], ["--port=-5"], ["--port", "-"], ["--port", ""],
    ["--port="], ["--port", "--"], ["--verbose=1"], ["--verbose="], ["--bogus"], ["--bogus=1"], ["-x"], ["-5"], ["--no-verbose"],
    ["--forbid", "a", "--forbid", "b"], ["--port", "1", "--port", "2"], ["--root-dir", "x"],
    ["a"], ["a", "--verbose", "b"], ["--", "--verbose"], ["--port", "1", "--", "-x"],
  ];
  const differ = [];
  for (const allow of [true, false]) {
    for (const args of LISTS) {
      const strict = outcome(() => parseArgs({ args, options: OPTIONS, strict: true, allowPositionals: allow }), true);
      const ours = outcome(() => parseCli(args, { options: OPTIONS, positionals: allow ? { max: Infinity } : 0 }), false);
      if (strict !== ours) differ.push(`${allow ? "" : "no positionals: "}${show(args)}\n  parseArgs ${strict}\n  parseCli  ${ours}`);
    }
  }
  check(`the defaults agree with a strict parseArgs on ${LISTS.length * 2} argument lists`, differ.length === 0, differ.join("\n"));
}

// ------------------------------------------------------------ numberOption

{
  const port = { option: "--port", integer: true, min: 1, max: 65535 };
  check("numberOption reads a number in range", numberOption("8080", port) === 8080);
  const low = cliError(() => numberOption("0", port), "bad-number");
  check("numberOption refuses one out of range, naming the range",
    low?.message === "--port expects a whole number from 1 to 65535, got: 0" && low.option === "--port", show(low));
  check("numberOption refuses blank text, which Number reads as 0", Boolean(cliError(() => numberOption("", port), "bad-number")));
  check("numberOption refuses a fraction where a whole number is wanted", Boolean(cliError(() => numberOption("1.5", port), "bad-number")));
  check("numberOption takes a fraction otherwise", numberOption("1.5", { option: "--t", min: 0 }) === 1.5);
  const nan = cliError(() => numberOption("abc", { option: "--t", min: 0 }), "bad-number");
  check("numberOption refuses text that is not a number", nan?.message === "--t expects a number of at least 0, got: abc", show(nan));
  const own = cliError(() => numberOption(undefined, { option: "--t", message: (v) => `--t: ${v}?` }), "bad-number");
  check("numberOption takes the tool's own message", own?.message === "--t: undefined?", show(own));
}

// ------------------------------------------------------------ printing and exiting

const EXITED = Symbol("exited");
function capture(fn) {
  const out = { text: "", code: null };
  const stream = { write: (s) => { out.text += s; } };
  const exit = (code) => { out.code = code; throw EXITED; };
  const err = caught(() => fn(stream, exit));
  if (err !== null && err !== EXITED) throw err;
  return out;
}
{
  let result;
  const quiet = capture((stream, exit) => { result = withUsageError(() => 42, { stream, exit }); });
  check("withUsageError returns what fn returns, printing nothing", result === 42 && quiet.text === "" && quiet.code === null, show(quiet));
  const out = capture((stream, exit) => withUsageError(() => parseCli(["--port"], { options: OPTIONS }), { stream, exit, exitCode: 4 }));
  check("withUsageError prints the message and exits with the code", out.text === "--port needs a value\n" && out.code === 4, show(out));
  const own = capture((stream, exit) => withUsageError(() => parseCli(["--bogus"], { options: OPTIONS }), {
    stream, exit, format: (err) => `usage: tool\n${err.code}\n`,
  }));
  check("withUsageError prints the tool's own text, adding no second newline", own.text === "usage: tool\nunknown-option\n" && own.code === 2,
    show(own));
  const other = caught(() => capture((stream, exit) => withUsageError(() => { throw new RangeError("boom"); }, { stream, exit })));
  check("withUsageError throws on anything but a CliError", other instanceof RangeError);
}
{
  const out = capture((stream, exit) => printHelpAndExit("usage: tool", { stream, exit }));
  check("printHelpAndExit prints the text and exits 0", out.text === "usage: tool\n" && out.code === 0, show(out));
  const err = capture((stream, exit) => printHelpAndExit("usage: tool\n", { stream, exit, exitCode: 2 }));
  check("printHelpAndExit takes the tool's exit code", err.text === "usage: tool\n" && err.code === 2, show(err));
}

// ------------------------------------------------------------ the recorded cases

const CASES = [
  // Recorded in C47, from the behaviour C18 settled: a command-line error in
  // tbdocs and check_links exits 4, outside the 1/2/3 bitmask of the link and
  // integrity checks, so it never reads as a broken link. A value flag has no
  // value at the end of the list or before another flag, and --port is a whole
  // number from 1 to 65535. check_links prints on stdout, and requires a value
  // only at the end: before a flag, it takes the flag as the value.
  { tool: "builder/tbdocs.mjs", args: ["--port"], exit: 4, stderr: "--port needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--dest", "--no-pdf"], exit: 4, stderr: "--dest needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=0"], exit: 4, stderr: "--port expects a port number from 1 to 65535, got: 0\n" },
  { tool: "builder/tbdocs.mjs", args: ["--bogus"], exit: 4, stderr: "Unknown argument: --bogus\n" },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree", "--root-dir"], exit: 4, stdout: "error: --root-dir requires a value\n" },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree", "--forbid"], exit: 4, stdout: "error: --forbid requires a value\n" },

  // Recorded in C47, from the behaviour C17 settled: in the four harness tools
  // that check, a value flag with no value, at the end or before another flag,
  // exits 2. tbbuild follows the message with its usage line.
  { tool: "scripts/tbbuild.mjs", args: ["--port"], exit: 2, stderr: /^--port needs a value\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["--timeout", "--keep"], exit: 2, stderr: /^--timeout needs a value\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/check_examples.mjs", args: ["--jobs"], exit: 2, stderr: "check_examples: --jobs needs a value\n" },
  { tool: "scripts/check_examples.mjs", args: ["--port", "--json"], exit: 2, stderr: "check_examples: --port needs a value\n" },
  { tool: "scripts/census_attributes.mjs", args: ["--out"], exit: 2, stderr: "--out needs a value\n" },
  { tool: "scripts/census_attributes.mjs", args: ["--src", "--json"], exit: 2, stderr: "--src needs a value\n" },
  { tool: "scripts/build_package_api.mjs", args: ["--out"], exit: 2, stderr: "--out needs a value\n" },
  { tool: "scripts/build_package_api.mjs", args: ["--src", "--check"], exit: 2, stderr: "--src needs a value\n" },
];

const TIMEOUT_MS = 30_000;

function runCase({ tool, args }, cwd, env) {
  return new Promise((resolve) => {
    execFile(process.execPath, [path.join(REPO_ROOT, tool), ...args], { cwd, env, timeout: TIMEOUT_MS, windowsHide: true },
      (error, stdout, stderr) => {
        const exit = !error ? 0 : error.killed ? `killed after ${TIMEOUT_MS / 1000} s` : error.code;
        resolve({ exit, stdout, stderr });
      });
  });
}

const matches = (expected = "", text) => (expected instanceof RegExp ? expected.test(text) : text === expected);
const expectation = (expected = "") => (expected instanceof RegExp ? String(expected) : show(expected));
const clip = (text) => show(text.length > 400 ? `${text.slice(0, 400)}...` : text);

const scratch = await mkdtemp(path.join(tmpdir(), "tb-check-cli-"));
try {
  const env = {
    ...process.env,
    TB_IDE: path.join(scratch, "no-ide", "twinBASIC.exe"),
    PUPPETEER_EXECUTABLE_PATH: path.join(scratch, "no-browser", "chrome.exe"),
  };
  delete env.TBBUILD_SHOW;
  const results = new Array(CASES.length);
  let next = 0;
  const lane = async () => {
    while (next < CASES.length) {
      const i = next++;
      const cwd = path.join(scratch, `case-${i}`);
      await mkdir(cwd);
      results[i] = await runCase(CASES[i], cwd, env);
    }
  };
  await Promise.all(Array.from({ length: Math.min(availableParallelism(), CASES.length) }, lane));
  CASES.forEach((c, i) => {
    const got = results[i];
    const ok = got.exit === c.exit && matches(c.stdout, got.stdout) && matches(c.stderr, got.stderr);
    check(`${path.basename(c.tool, ".mjs")} ${c.args.join(" ")}: exit ${c.exit}, ${c.stdout ? "stdout" : "stderr"}`, ok,
      `expected exit ${c.exit}, stdout ${expectation(c.stdout)}, stderr ${expectation(c.stderr)}\n`
        + `got      exit ${got.exit}, stdout ${clip(got.stdout)}, stderr ${clip(got.stderr)}`);
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}

// ------------------------------------------------------------ report

process.exit(report());
