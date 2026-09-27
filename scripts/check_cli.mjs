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
{
  const spec = { options: { ...OPTIONS, help: { type: "boolean", short: "h" } }, positionals: 1, stopAt: ["help"] };
  const r = parseCli(["--port", "80", "-h", "--bogus", "--port"], spec);
  check("stopAt ends the parse at the option, reading nothing after it and counting no positionals",
    r.stopped === "help" && r.values.port === "80" && r.values.help === true, show(r));
  check("stopAt does not excuse an error before the option",
    Boolean(cliError(() => parseCli(["--bogus", "--help"], spec), "unknown-option")));
  check("without its option, stopAt changes nothing", parseCli(["a"], spec).stopped === undefined
    && Boolean(cliError(() => parseCli([], spec), "missing-positional")));
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

  // Recorded in C48, before the a11y and diagram tools moved onto lib/cli.mjs.
  // A value flag given nothing, at the end or as "", reads as an unknown
  // argument; one followed by another flag takes the flag as its value, so that
  // is no case. check_a11y has no --help and refuses it. --theme and --viewport
  // are checked against their lists (C20). check_dot_fit and build_dot_metrics
  // ignore every argument, so neither has a case.
  { tool: "scripts/check_a11y.mjs", args: ["--help"], exit: 2, stderr: "unknown arg: --help\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--bogus"], exit: 2, stderr: "unknown arg: --bogus\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--root-dir"], exit: 2, stderr: "unknown arg: --root-dir\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--theme", ""], exit: 2, stderr: "unknown arg: --theme\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/check_a11y.mjs", args: ["--viewport", "huge"], exit: 2, stderr: 'unknown --viewport "huge"; expected one of desktop, mobile or both\n' },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_a11y_fingerprint\.mjs / },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--bogus"], exit: 2, stderr: "unknown arg: --bogus\n" },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--pages"], exit: 2, stderr: "unknown arg: --pages\n" },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_axe_patch_equiv\.mjs / },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--bogus"], exit: 2, stderr: "unknown arg: --bogus\n" },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--patch"], exit: 2, stderr: "unknown arg: --patch\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_tree_fresh\.mjs / },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--bogus"], exit: 2, stderr: "unknown arg: --bogus\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--source"], exit: 2, stderr: "unknown arg: --source\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--tree"], exit: 2, stderr: "unknown arg: --tree\n" },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--help"], exit: 0, stderr: /^usage: node scripts\/pick_a11y_sample\.mjs / },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--bogus"], exit: 2, stderr: "unknown arg: --bogus\n" },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--budget"], exit: 2, stderr: "unknown arg: --budget\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--help"], exit: 0, stderr: /^usage: node scripts\/sweep_a11y\.mjs / },
  { tool: "scripts/sweep_a11y.mjs", args: ["--bogus"], exit: 2, stderr: "unknown arg: --bogus\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--limit"], exit: 2, stderr: "unknown arg: --limit\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/sweep_a11y.mjs", args: ["--viewport", "huge"], exit: 2, stderr: 'unknown --viewport "huge"; expected one of desktop, mobile or both\n' },

  // Recorded in C49, before the harness tools moved onto lib/cli.mjs. All of
  // them ignore an unknown flag. tbbuild, tbrun and addin_test answer --help
  // with their usage line on stderr and exit 2; tbbuild checks its numbers
  // first. tbbuild finds its project anywhere in the list (C17). tbrun and
  // addin_test give a value flag with nothing after it, or "", its default,
  // and a value flag takes the argument after it whatever it is.
  // check_examples and census_attributes print their help on stdout and exit
  // 0, after the value checks; build_package_api has no --help, and
  // gen_attribute_probes takes any argument as its output folder, so only its
  // empty list is a case. census_attributes prints its own header comment,
  // with the checkout's line endings.
  { tool: "scripts/tbbuild.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--help"], exit: 2, stderr: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--arch", "win99"], exit: 2, stderr: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--port", "1.5"], exit: 2, stderr: /^--port takes a positive whole number\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--timeout", "abc"], exit: 2, stderr: /^--timeout takes a positive number\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--timeout", "-3"], exit: 2, stderr: /^--timeout needs a value\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--port", "0", "--help"], exit: 2, stderr: /^--port takes a positive whole number\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["--bogus", "--keep", "x.twinproj"], exit: 2, stderr: "no such project: x.twinproj\n" },
  { tool: "scripts/tbrun.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--help"], exit: 2, stderr: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch", "win99"], exit: 2, stderr: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["--port", "no-such-dir"], exit: 2, stderr: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch"], exit: 2, stderr: /^not a directory: .*no-such-dir\ntbrun takes an exported source tree / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch", ""], exit: 2, stderr: /^not a directory: .*no-such-dir\ntbrun takes an exported source tree / },
  { tool: "scripts/tbrun.mjs", args: ["--bogus", "no-such-dir"], exit: 2, stderr: /^not a directory: .*no-such-dir\ntbrun takes an exported source tree / },
  { tool: "scripts/addin_test.mjs", args: ["--help"], exit: 2, stderr: /^usage: node scripts\/addin_test\.mjs / },
  { tool: "scripts/addin_test.mjs", args: ["--ide"], exit: 2, stderr: /^no twinBASIC IDE found: pass --ide / },
  { tool: "scripts/addin_test.mjs", args: ["--ide", ""], exit: 2, stderr: /^no twinBASIC IDE found: pass --ide / },
  { tool: "scripts/check_examples.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_examples\.mjs \[options\]\n/ },
  { tool: "scripts/check_examples.mjs", args: ["--jobs", "0"], exit: 2, stderr: "check_examples: --jobs takes a positive whole number\n" },
  { tool: "scripts/check_examples.mjs", args: ["--batch", "1.5"], exit: 2, stderr: "check_examples: --batch takes a positive whole number\n" },
  { tool: "scripts/check_examples.mjs", args: ["--jobs", "0", "--help"], exit: 2, stderr: "check_examples: --jobs takes a positive whole number\n" },
  { tool: "scripts/check_examples.mjs", args: ["--help", "--jobs"], exit: 2, stderr: "check_examples: --jobs needs a value\n" },
  { tool: "scripts/census_attributes.mjs", args: ["--help"], exit: 0, stdout: /^\n {4}node scripts\/census_attributes\.mjs \[options\]\r?\n/ },
  { tool: "scripts/census_attributes.mjs", args: ["--help", "--attr"], exit: 2, stderr: "--attr needs a value\n" },
  { tool: "scripts/census_attributes.mjs", args: ["--dump-sites"], exit: 2, stderr: "--dump-sites needs a value\n" },
  { tool: "scripts/build_package_api.mjs", args: ["--help"], exit: 2, stderr: "no twinBASIC install found; pass --ide or set TB_IDE\n" },
  { tool: "scripts/gen_attribute_probes.mjs", args: [], exit: 2, stdout: /^Generate a twinBASIC probe project for Reference\/Attributes\.md applicability\.\n/ },

  // Recorded in C50, before the gates and link tools moved onto lib/cli.mjs.
  // check_links prints on stdout and exits 4; an unknown flag is warned about
  // and takes the argument after it along, unless that starts with a dash, and
  // a value flag takes whatever follows. check_links_diff, crawl_check and
  // compare_trees refuse an unknown argument; crawl_check has no --help, and a
  // value flag there takes whatever follows. check_publish_policy reads only
  // --src and ignores the rest; check_lint takes --staged alone or nothing.
  // survey_tooling's words for a parse error were node:util's, so only the
  // line and the usage after it are pinned. check_regex_safety,
  // check_code_regions, check_gate_lists and convert_em_dash_separators
  // ignore every argument they do not know, so none has a case.
  { tool: "scripts/check_links.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node check_links\.mjs \[options\] <inputs\.\.\.>\n/ },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree"], exit: 4, stdout: "error: --offline is required. Online (network) checking is not implemented by this tool.\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline"], exit: 4, stdout: "error: at least one input file or directory is required\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "--bogus", "no-such-tree"], exit: 4, stdout: "warning: ignoring unrecognised arguments: --bogus no-such-tree\nerror: at least one input file or directory is required\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "-x", "--bogus=1"], exit: 4, stdout: "warning: ignoring unrecognised arguments: -x --bogus=1\nerror: at least one input file or directory is required\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "--root-dir", "--forbid"], exit: 4, stdout: "error: at least one input file or directory is required\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node scripts\/check_links_diff\.mjs \[options\]\n/ },
  { tool: "scripts/check_links_diff.mjs", args: [], exit: 2, stderr: /^error: --a and --b are both 'script', which compares nothing\.\n/ },
  { tool: "scripts/check_links_diff.mjs", args: ["--bogus"], exit: 2, stderr: "error: unknown argument: --bogus\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["stray"], exit: 2, stderr: "error: unknown argument: stray\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["--list=1"], exit: 2, stderr: "error: unknown argument: --list=1\n" },
  { tool: "scripts/crawl_check.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--help"], exit: 2, stderr: "unknown flag: --help\n" },
  { tool: "scripts/crawl_check.mjs", args: ["--bogus", "http://127.0.0.1:9/"], exit: 2, stderr: "unknown flag: --bogus\n" },
  { tool: "scripts/crawl_check.mjs", args: ["--timeout", "5", "-x"], exit: 2, stderr: "unknown flag: -x\n" },
  { tool: "scripts/crawl_check.mjs", args: ["--skip-external=1"], exit: 2, stderr: "unknown flag: --skip-external=1\n" },
  { tool: "scripts/crawl_check.mjs", args: ["--concurrency", "--bogus"], exit: 2, stderr: /^usage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/check_publish_policy.mjs", args: ["--src"], exit: 2, stderr: /^TypeError \[ERR_INVALID_ARG_TYPE\]: The "path" argument must be of type string\. Received undefined\n/ },
  { tool: "scripts/survey_tooling.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--bogus"], exit: 2, stderr: /^[^\n]+\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["stray"], exit: 2, stderr: /^[^\n]+\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--root"], exit: 2, stderr: /^[^\n]+\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--window", "0"], exit: 2, stderr: /^--window expects a positive integer, got: 0\nusage: node scripts\/survey_tooling\.mjs / },
  { tool: "scripts/survey_tooling.mjs", args: ["--top", "1.5"], exit: 2, stderr: /^--top expects a positive integer, got: 1\.5\nusage: node scripts\/survey_tooling\.mjs / },
  { tool: "scripts/survey_tooling.mjs", args: ["--window", "0", "--help"], exit: 0, stdout: /^usage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/check_lint.mjs", args: ["--help"], exit: 2, stderr: "check_lint: usage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--staged", "--staged"], exit: 2, stderr: "check_lint: usage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--staged", "x"], exit: 2, stderr: "check_lint: usage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--"], exit: 2, stderr: "check_lint: usage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--staged=1"], exit: 2, stderr: "check_lint: usage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/compare_trees.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/compare_trees\.mjs \[--before <ref>\] / },
  { tool: "scripts/compare_trees.mjs", args: ["--bogus"], exit: 2, stderr: /^compare_trees: unknown argument "--bogus"\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["stray"], exit: 2, stderr: /^compare_trees: unknown argument "stray"\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--before"], exit: 2, stderr: /^compare_trees: --before needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--max", "--keep"], exit: 2, stderr: /^compare_trees: --max needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--max", "1.5"], exit: 2, stderr: /^compare_trees: --max takes a whole number, not "1\.5"\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--bogus", "--help"], exit: 2, stderr: /^compare_trees: unknown argument "--bogus"\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--before", "--", "x"], exit: 2, stderr: /^compare_trees: --before needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--keep=1"], exit: 2, stderr: /^compare_trees: unknown argument "--keep=1"\n\nusage: node scripts\/compare_trees\.mjs / },
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
