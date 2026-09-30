// Self-test for lib/cli.mjs, the command-line parser every tool reads through, and
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
// and what numberOption, withUsageError and printHelpAndExit do. With them,
// the options builder/command-line.mjs returns for tbdocs, whose --no-check
// makes the order of its flags matter.
//
// The recorded cases: invocations that stop while the tool reads its command
// line, each with the exit code and the text printed on each stream. A case
// pins the tool's own words for the error
// exactly; a usage text printed after it is matched by its opening, so adding
// a flag to a tool's usage does not fail this gate. A string is the whole
// stream; a RegExp must match it; a stream a case does not name must be empty.
//
// Every tool answers --help and -h with its usage on stdout and exit 0 (C71),
// so each has a case for both, and after each of them the folder it ran in must
// still be empty: a help request starts no IDE or browser and writes nothing.
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
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { DEFAULTS, parseCommandLine } from "../builder/command-line.mjs";
import { CliError, numberOption, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { createProbes, exitOnCrash } from "./lib/gate-probes.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_cli.mjs [-h, --help]

Tests lib/cli.mjs, the command-line parser, and runs the recorded command-line
cases of every tool, each in an empty folder with no IDE and no browser.

  -h, --help  print this text and exit`;

if (withUsageError(() => parseCli(process.argv.slice(2), {
  options: { help: { type: "boolean", short: "h" } },
  stopAt: ["help"],
})).values.help) printHelpAndExit(USAGE);

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
  const spec = { options: OPTIONS, positionals: { max: Infinity } };
  const bare = cliError(() => parseCli(["a", "--x", "b"], spec), "unknown-option");
  check("an unknown option is refused even where positionals are taken", bare?.option === "--x", show(bare));
  const short = cliError(() => parseCli(["-ab"], spec), "unknown-option");
  check("a short option cluster with an unknown letter is refused", short?.option === "-a", show(short));
  const r = parseCli(["--", "--x", "-5", "-ab", "--y=1"], spec);
  check("after -- an argument that starts with a dash is a positional",
    show(r.positionals) === show(["--x", "-5", "-ab", "--y=1"]), show(r));
  const one = cliError(() => parseCli(["a", "b"], { options: OPTIONS, positionals: 1 }), "unexpected-positional");
  check("a positional beyond max is refused, naming it", one?.arg === "b", show(one));
  const value = cliError(() => parseCli(["--verbose=1", "--port"], spec), "unexpected-value");
  check("the first fault is the one reported", value?.option === "--verbose", show(value));
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
  const apart = cliError(() => parseCli(["--port", ""], { options: OPTIONS }), "empty-value");
  check("an empty value given separately is refused", apart?.option === "--port" && apart.value === "" && apart.message === "--port needs a non-empty value",
    show(apart));
  const inline = cliError(() => parseCli(["--port="], { options: OPTIONS }), "empty-value");
  check("an empty value given inline is refused", inline?.arg === "--port=" && inline.message === "--port needs a non-empty value", show(inline));
  const short = cliError(() => parseCli(["-p", ""], { options: OPTIONS }), "empty-value");
  check("the empty-value error names the flag as typed", short?.message === "-p needs a non-empty value", show(short));
  const many = cliError(() => parseCli(["--forbid", "a", "--forbid", ""], { options: OPTIONS }), "empty-value");
  check("an empty value of a multiple option is refused", many?.option === "--forbid" && many.message === "--forbid needs a non-empty value", show(many));
  const manyInline = cliError(() => parseCli(["--forbid="], { options: OPTIONS }), "empty-value");
  check("an empty inline value of a multiple option is refused", Boolean(manyInline), show(manyInline));
  const first = cliError(() => parseCli(["--port", "--", "--forbid="], { options: OPTIONS }), "missing-value");
  check("a value that looks like an option is missing, not empty", first?.option === "--port", show(first));
}
{
  const options = { ...OPTIONS, port: { type: "string", empty: true }, forbid: { type: "string", multiple: true, empty: true } };
  check("empty: true accepts an empty value, separate or inline",
    parseCli(["--port", ""], { options }).values.port === "" && parseCli(["--port="], { options }).values.port === "");
  check("empty: true accepts empty values of a multiple option",
    show(parseCli(["--forbid=", "--forbid", "", "--forbid", "x"], { options }).values.forbid) === show(["", "", "x"]));
  const missing = cliError(() => parseCli(["--port"], { options }), "missing-value");
  check("empty: true does not excuse a missing value", Boolean(missing), show(missing));
  const other = cliError(() => parseCli(["--root-dir", ""], { options }), "empty-value");
  check("empty: true is per option", other?.option === "--root-dir", show(other));
  check("empty is not passed to parseArgs", caught(() => parseCli([], { options })) === null);
}
{
  const spec = { options: { ...OPTIONS, help: { type: "boolean", short: "h" } }, positionals: 1, stopAt: ["help"] };
  const r = parseCli(["--port", "80", "-h", "--bogus", "--port", "--verbose=1", "a", "b"], spec);
  check("stopAt ends the parse at the option, reading nothing after it and counting no positionals",
    r.stopped === "help" && r.values.port === "80" && r.values.help === true && r.positionals.length === 0, show(r));
  check("stopAt does not excuse an error before the option",
    Boolean(cliError(() => parseCli(["--bogus", "--help"], spec), "unknown-option")));
  check("stopAt does not excuse an empty value before the option",
    Boolean(cliError(() => parseCli(["--port=", "--help"], spec), "empty-value")));
  check("without its option, stopAt changes nothing", parseCli(["a"], spec).stopped === undefined
    && Boolean(cliError(() => parseCli([], spec), "missing-positional")));
}

// parseCli refuses what a strict parseArgs refuses, in the same kind, and
// otherwise returns the same values and positionals. An empty value is the
// exception: a strict parseArgs takes it and parseCli refuses it, so the lists
// hold none, and the probes above cover it.
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
    ["--port"], ["-p"], ["--port", "--verbose"], ["--port", "-5"], ["--port=-5"], ["--port", "-"],
    ["--port", "--"], ["--verbose=1"], ["--verbose="], ["--bogus"], ["--bogus=1"], ["-x"], ["-5"], ["--no-verbose"],
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
  check(`parseCli agrees with a strict parseArgs on ${LISTS.length * 2} argument lists`, differ.length === 0, differ.join("\n"));
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

// ------------------------------------------------------------ tbdocs's command line

// What the recorded cases cannot see, because each of these gets past the
// command line and would start a build: the options it returns.
{
  const parsed = (args) => parseCommandLine(args);
  const pick = (args, keys) => show(Object.fromEntries(keys.map((k) => [k, parsed(args)[k]])));
  const CHECKS = ["check", "auditIndex", "checkFindings"];
  check("tbdocs's defaults are DEFAULTS, with no fetchAssets", show(parsed([])) === show(DEFAULTS) && !("fetchAssets" in parsed([])));
  check("tbdocs's --no-check undoes the check flags before it",
    pick(["--check-audit-index", "--check-findings", "f", "--no-check"], CHECKS) === show({ check: false, auditIndex: false, checkFindings: null }),
    pick(["--check-audit-index", "--check-findings", "f", "--no-check"], CHECKS));
  check("tbdocs's --no-check leaves the check flags after it",
    pick(["--no-check", "--check-findings", "f"], CHECKS) === show({ check: true, auditIndex: false, checkFindings: "f" }),
    pick(["--no-check", "--check-findings", "f"], CHECKS));
  check("tbdocs's --check-audit-index after --no-check turns the check on",
    pick(["--src", "docs", "--no-check", "--check-audit-index"], CHECKS) === show({ check: true, auditIndex: true, checkFindings: null }),
    pick(["--src", "docs", "--no-check", "--check-audit-index"], CHECKS));
  check("tbdocs's last --check or --no-check wins",
    parsed(["--no-check", "--check"]).check === true && parsed(["--check", "--no-check"]).check === false);
  check("tbdocs's last of --fetch-assets and --no-fetch-assets wins",
    parsed(["--fetch-assets", "--no-fetch-assets"]).fetchAssets === false && parsed(["--no-fetch-assets", "--fetch-assets"]).fetchAssets === true);
  check("tbdocs reads --stall-timeout 0 as disabling the watchdog", parsed(["--stall-timeout", "0"]).stallTimeoutMs === 0);
  check("tbdocs reads --baseurl= as the site root, an empty value", parsed(["--baseurl="]).baseurl === "" && parsed(["--baseurl", ""]).baseurl === "");
  check("tbdocs reads --stall-timeout in seconds", parsed(["--stall-timeout", "1.5"]).stallTimeoutMs === 1500);
  check("tbdocs takes --name=value for every value flag",
    pick(["--check-findings=f", "--symbol-gaps=g", "--port=81", "--dest=d"], ["check", "checkFindings", "symbolGaps", "port", "dest"])
      === show({ check: true, checkFindings: "f", symbolGaps: "g", port: 81, dest: "d" }));
  check("tbdocs keeps the flags the negations set",
    pick(["--no-offline", "--no-pdf"], ["skipOffline", "skipPdf"]) === show({ skipOffline: true, skipPdf: true }));
}

// ------------------------------------------------------------ the recorded cases

const CASES = [
  // Recorded in C47, from the behaviour C18 settled: a command-line error in
  // tbdocs and check_links exits 4, outside the 1/2/3 bitmask of the link and
  // integrity checks, so it never reads as a broken link. A value flag has no
  // value at the end of the list or before another flag, and --port is a whole
  // number from 1 to 65535. check_links prints its errors on stderr, after
  // "error: ".
  { tool: "builder/tbdocs.mjs", args: ["--port"], exit: 4, stderr: "--port needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--dest", "--no-pdf"], exit: 4, stderr: "--dest needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=0"], exit: 4, stderr: "--port expects a port number from 1 to 65535, got: 0\n" },
  { tool: "builder/tbdocs.mjs", args: ["--bogus"], exit: 4, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree", "--root-dir"], exit: 4, stderr: "error: --root-dir needs a value\n" },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree", "--forbid"], exit: 4, stderr: "error: --forbid needs a value\n" },

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

  // Recorded in C48, for the a11y and diagram tools. A value flag given
  // nothing, at the end or as "", or followed by another flag, is refused.
  // Each of them answers --help on stdout with exit 0 (C71).
  // --theme and --viewport are checked against their lists (C20).
  // check_dot_fit and build_dot_metrics take one flag of their own besides
  // --help and -h, and neither has a case beyond those and the generated ones.
  { tool: "scripts/check_a11y.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_a11y\.mjs / },
  { tool: "scripts/check_a11y.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--root-dir"], exit: 2, stderr: "--root-dir needs a value\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--root-dir", "--theme", "dark"], exit: 2, stderr: "--root-dir needs a value\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--theme", ""], exit: 2, stderr: "--theme needs a non-empty value\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/check_a11y.mjs", args: ["--viewport", "huge"], exit: 2, stderr: 'unknown --viewport "huge"; expected one of desktop, mobile or both\n' },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_a11y_fingerprint\.mjs / },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--pages"], exit: 2, stderr: "--pages needs a value\n" },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_axe_patch_equiv\.mjs / },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--patch"], exit: 2, stderr: "--patch needs a value\n" },
  { tool: "scripts/check_pdf_shims_equiv.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_pdf_shims_equiv\.mjs\n/ },
  { tool: "scripts/check_pdf_shims_equiv.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_impexp_parity.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_impexp_parity\.mjs\n/ },
  { tool: "scripts/check_impexp_parity.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_tree_fresh\.mjs / },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--source"], exit: 2, stderr: "--source needs a value\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--tree"], exit: 2, stderr: "--tree needs a value\n" },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/pick_a11y_sample\.mjs / },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--budget"], exit: 2, stderr: "--budget needs a value\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/sweep_a11y\.mjs / },
  { tool: "scripts/sweep_a11y.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--limit"], exit: 2, stderr: "--limit needs a value\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/sweep_a11y.mjs", args: ["--viewport", "huge"], exit: 2, stderr: 'unknown --viewport "huge"; expected one of desktop, mobile or both\n' },

  // Recorded in C49, for the harness tools. All of them answer --help and -h
  // on stdout with exit 0 before any other check, a number or a missing
  // project included (C71). tbbuild finds its project anywhere in the list
  // (C17). An unknown option, a value flag with no value or an empty one is
  // refused, and tbbuild and tbrun follow the message with their usage.
  // gen_attribute_probes takes one output folder and an optional key file, so
  // only its empty list is a case here.
  { tool: "scripts/tbbuild.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--help"], exit: 0, stdout: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--arch", "win99"], exit: 2, stderr: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--port", "1.5"], exit: 2, stderr: /^--port takes a positive whole number\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--timeout", "abc"], exit: 2, stderr: /^--timeout takes a positive number\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--timeout", "-3"], exit: 2, stderr: /^--timeout needs a value\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--port", "0", "--help"], exit: 0, stdout: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["--bogus", "--keep", "x.twinproj"], exit: 2, stderr: /^unknown option: --bogus\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["--keep", "x.twinproj"], exit: 2, stderr: "no such project: x.twinproj\n" },
  { tool: "scripts/tbrun.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--help"], exit: 0, stdout: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch", "win99"], exit: 2, stderr: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["--port", "no-such-dir"], exit: 2, stderr: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch"], exit: 2, stderr: /^--arch needs a value\nusage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch", ""], exit: 2, stderr: /^--arch needs a non-empty value\nusage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["--bogus", "no-such-dir"], exit: 2, stderr: /^unknown option: --bogus\nusage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch", "win64"], exit: 2, stderr: /^not a directory: .*no-such-dir\ntbrun takes an exported source tree / },
  { tool: "scripts/addin_test.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/addin_test\.mjs / },
  { tool: "scripts/addin_test.mjs", args: ["--ide"], exit: 2, stderr: "--ide needs a value\n" },
  { tool: "scripts/addin_test.mjs", args: ["--ide", ""], exit: 2, stderr: "--ide needs a non-empty value\n" },
  { tool: "scripts/addin_test.mjs", args: ["--ide", "no-such.exe"], exit: 2, stderr: /^no twinBASIC IDE found: pass --ide / },
  { tool: "scripts/check_examples.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_examples\.mjs \[options\]\n/ },
  { tool: "scripts/check_examples.mjs", args: ["--jobs", "0"], exit: 2, stderr: "check_examples: --jobs takes a positive whole number\n" },
  { tool: "scripts/check_examples.mjs", args: ["--batch", "1.5"], exit: 2, stderr: "check_examples: --batch takes a positive whole number\n" },
  { tool: "scripts/check_examples.mjs", args: ["--jobs", "0", "--help"], exit: 0, stdout: /^usage: node scripts\/check_examples\.mjs \[options\]\n/ },
  { tool: "scripts/check_examples.mjs", args: ["--help", "--jobs"], exit: 0, stdout: /^usage: node scripts\/check_examples\.mjs \[options\]\n/ },
  { tool: "scripts/census_attributes.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/census_attributes\.mjs \[options\]\n/ },
  { tool: "scripts/census_attributes.mjs", args: ["--help", "--attr"], exit: 0, stdout: /^usage: node scripts\/census_attributes\.mjs \[options\]\n/ },
  { tool: "scripts/census_attributes.mjs", args: ["--dump-sites"], exit: 2, stderr: "--dump-sites needs a value\n" },
  { tool: "scripts/build_package_api.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/build_package_api\.mjs \[options\]\n/ },
  { tool: "scripts/gen_attribute_probes.mjs", args: [], exit: 2, stderr: /^Generate a twinBASIC probe project for Reference\/Attributes\.md applicability\.\n/ },

  // Recorded in C50, for the gates and link tools. check_links prints its
  // errors on stderr, after "error: ", and exits 4. Every one of them refuses
  // an unknown option, a stray argument, a value given to a flag that takes
  // none, and a value flag with no value, and crawl_check, compare_trees and
  // survey_tooling follow the message with their usage. check_lint prints its
  // name, the message and its usage line. check_regex_safety,
  // check_code_regions, check_gate_lists and convert_em_dash_separators take
  // only flags of their own, and none has a case beyond --help, -h and the
  // generated ones below.
  { tool: "scripts/check_links.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node check_links\.mjs \[options\] <inputs\.\.\.>\n/ },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree"], exit: 4, stderr: "error: --offline is required. Online (network) checking is not implemented by this tool.\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline"], exit: 4, stderr: "error: at least one input file or directory is required\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "--bogus", "no-such-tree"], exit: 4, stderr: "error: unknown option: --bogus\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "-x", "--bogus=1"], exit: 4, stderr: "error: unknown option: -x\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "--root-dir", "--forbid"], exit: 4, stderr: "error: --root-dir needs a value\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node scripts\/check_links_diff\.mjs \[options\]\n/ },
  { tool: "scripts/check_links_diff.mjs", args: [], exit: 2, stderr: /^error: --a and --b are both 'script', which compares nothing\.\n/ },
  { tool: "scripts/check_links_diff.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["--list=1"], exit: 2, stderr: "--list takes no value\n" },
  { tool: "scripts/crawl_check.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--bogus", "http://127.0.0.1:9/"], exit: 2, stderr: /^unknown option: --bogus\nusage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--timeout", "5", "-x"], exit: 2, stderr: /^unknown option: -x\nusage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--skip-external=1"], exit: 2, stderr: /^--skip-external takes no value\nusage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--concurrency", "--bogus"], exit: 2, stderr: /^--concurrency needs a value\nusage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/check_publish_policy.mjs", args: ["--src"], exit: 2, stderr: "--src needs a value\n" },
  { tool: "scripts/survey_tooling.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--bogus"], exit: 2, stderr: /^unknown option: --bogus\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["stray"], exit: 2, stderr: /^unexpected argument: stray\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--root"], exit: 2, stderr: /^--root needs a value\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--window", "0"], exit: 2, stderr: /^--window expects a positive integer, got: 0\nusage: node scripts\/survey_tooling\.mjs / },
  { tool: "scripts/survey_tooling.mjs", args: ["--top", "1.5"], exit: 2, stderr: /^--top expects a positive integer, got: 1\.5\nusage: node scripts\/survey_tooling\.mjs / },
  { tool: "scripts/survey_tooling.mjs", args: ["--window", "0", "--help"], exit: 0, stdout: /^usage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/check_lint.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_lint\.mjs \[--staged\]\n/ },
  { tool: "scripts/check_lint.mjs", args: ["--staged", "--staged"], exit: 2, stderr: "check_lint: --staged given more than once\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--staged", "x"], exit: 2, stderr: "check_lint: unexpected argument: x\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--"], exit: 2, stderr: "check_lint: unexpected argument: --\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--staged=1"], exit: 2, stderr: "check_lint: --staged takes no value\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--bogus"], exit: 2, stderr: "check_lint: unknown option: --bogus\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/compare_trees.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/compare_trees\.mjs \[--before <ref>\] / },
  { tool: "scripts/compare_trees.mjs", args: ["--bogus"], exit: 2, stderr: /^compare_trees: unknown option: --bogus\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["stray"], exit: 2, stderr: /^compare_trees: unexpected argument: stray\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--before"], exit: 2, stderr: /^compare_trees: --before needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--max", "--keep"], exit: 2, stderr: /^compare_trees: --max needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--max", "1.5"], exit: 2, stderr: /^compare_trees: --max takes a whole number, not "1\.5"\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--bogus", "--help"], exit: 2, stderr: /^compare_trees: unknown option: --bogus\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--before", "--", "x"], exit: 2, stderr: /^compare_trees: --before needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--keep=1"], exit: 2, stderr: /^compare_trees: --keep takes no value\n\nusage: node scripts\/compare_trees\.mjs / },

  // Recorded in C51, for render-book, eval/ and wisdom. In every one of them an
  // unknown option, a value flag with no value and a value given to a boolean
  // are refused at the parse, in the parser's own words, exit 2, and so is an
  // argument beyond those a tool takes (nav_hops and site_search take any
  // number). A search term or a file name that starts with a dash goes after
  // --. build_corpus, nav_hops, run_case, site_search and transcript print
  // their usage on stderr when an argument they need is
  // missing; wisdom does when no command is given, and names an unknown one.
  // Every tool here answers -h and --help on stdout with exit 0 (C71), and
  // reads nothing after it. The command in the wisdom cases is never a real
  // one, so that none can start an export. render-book's missing input file is
  // not a usage error and exits 1, as does a --site that holds no search index.
  { tool: "book/render-book.mjs", args: ["--help"], exit: 0, stdout: /^usage: node render-book\.mjs <input\.html> / },
  { tool: "book/render-book.mjs", args: [], exit: 2, stderr: "usage: node render-book.mjs <input.html> -o <output.pdf> [--outline-tags ...] [-t ms] [--additional-script path]...\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "b.html"], exit: 2, stderr: "unexpected argument: b.html\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "-o"], exit: 2, stderr: "-o needs a value\n" },
  { tool: "book/render-book.mjs", args: ["-o", "--bogus", "a.html"], exit: 2, stderr: "-o needs a value\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "-o", "out.pdf", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "-o", "out.pdf", "--outline-tags"], exit: 2, stderr: "--outline-tags needs a value\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "-o", "out.pdf", "-t", "abc"], exit: 1, stderr: /^input not found: .*a\.html\n$/ },
  { tool: "book/render-book.mjs", args: ["-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "eval/build_corpus.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/build_corpus\.mjs --dest <path> / },
  { tool: "eval/build_corpus.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/build_corpus\.mjs --dest <path> / },
  { tool: "eval/build_corpus.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/build_corpus.mjs", args: ["stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "eval/build_corpus.mjs", args: ["--help", "--bogus"], exit: 0, stdout: /^Usage: node eval\/build_corpus\.mjs --dest <path> / },
  { tool: "eval/build_corpus.mjs", args: ["--quiet=1"], exit: 2, stderr: "--quiet takes no value\n" },
  { tool: "eval/build_corpus.mjs", args: ["-hq"], exit: 0, stdout: /^Usage: node eval\/build_corpus\.mjs --dest <path> / },
  { tool: "eval/build_corpus.mjs", args: ["--src"], exit: 2, stderr: "--src needs a value\n" },
  { tool: "eval/nav_hops.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/nav_hops\.mjs \[--from <page>\] / },
  { tool: "eval/nav_hops.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/nav_hops\.mjs \[--from <page>\] / },
  { tool: "eval/nav_hops.mjs", args: ["--from", "nope.md", "x"], exit: 2, stderr: /^no start page: .*[\\/]nope\.md\n$/ },
  { tool: "eval/nav_hops.mjs", args: ["--src", "nowhere", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/nav_hops.mjs", args: ["--src", "nowhere", "--", "--bogus"], exit: 2, stderr: /^no start page: .*[\\/]nowhere[\\/]docs[\\/]index\.md\n$/ },
  { tool: "eval/nav_hops.mjs", args: ["--help=1", "--src", "nowhere"], exit: 2, stderr: "--help takes no value\n" },
  { tool: "eval/nav_hops.mjs", args: ["--from", "--src", "x"], exit: 2, stderr: "--from needs a value\n" },
  { tool: "eval/nav_hops.mjs", args: ["--", "C:/x"], exit: 2, stderr: "these patterns arrived as Windows paths: C:/x\nGit Bash converted them. Run with MSYS_NO_PATHCONV=1 set, or from another shell.\n" },
  { tool: "eval/nav_hops.mjs", args: ["--src"], exit: 2, stderr: "--src needs a value\n" },
  { tool: "eval/nav_hops.mjs", args: ["x", "--from"], exit: 2, stderr: "--from needs a value\n" },
  { tool: "eval/run_case.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/run_case\.mjs --corpus <dir> / },
  { tool: "eval/run_case.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/run_case\.mjs --corpus <dir> / },
  { tool: "eval/run_case.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/run_case.mjs", args: ["stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "eval/run_case.mjs", args: ["--help", "--bogus"], exit: 0, stdout: /^Usage: node eval\/run_case\.mjs --corpus <dir> / },
  { tool: "eval/run_case.mjs", args: ["--prompt-only=1"], exit: 2, stderr: "--prompt-only takes no value\n" },
  { tool: "eval/run_case.mjs", args: ["--corpus"], exit: 2, stderr: "--corpus needs a value\n" },
  { tool: "eval/run_case.mjs", args: ["--smoke", "--corpus", "c", "--site", "s", "--out", "o"], exit: 2, stderr: /^missing: .*[\\/]c[\\/]docs, .*search-data\.json, .*lunr\.min\.js\n$/ },
  { tool: "eval/run_case.mjs", args: ["--smoke", "--corpus", "c", "--site", "s", "--out", "o", "--timeout", "abc"], exit: 2, stderr: /^missing: .*[\\/]c[\\/]docs, / },
  { tool: "eval/run_case.mjs", args: ["--corpus", "c", "--site", "s", "--out", "o", "--protocol", "repo"], exit: 2, stderr: /^Usage: node eval\/run_case\.mjs --corpus <dir> / },
  { tool: "eval/run_case.mjs", args: ["--corpus", "c", "--site", "s", "--out", "o", "--protocol", "--smoke"], exit: 2, stderr: "--protocol needs a value\n" },
  { tool: "eval/site_search.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/site_search\.mjs "<query>" / },
  { tool: "eval/site_search.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/site_search\.mjs "<query>" / },
  { tool: "eval/site_search.mjs", args: ["--site", "nowhere", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/site_search.mjs", args: ["--site", "nowhere", "--", "--bogus"], exit: 1, stderr: /^missing .*search-data\.json\nRun build\.bat / },
  { tool: "eval/site_search.mjs", args: ["--help=1", "--site", "nowhere"], exit: 2, stderr: "--help takes no value\n" },
  { tool: "eval/site_search.mjs", args: ["--composition", "--site", "nowhere"], exit: 1, stderr: /^missing .*search-data\.json\nRun build\.bat / },
  { tool: "eval/site_search.mjs", args: ["--site"], exit: 2, stderr: "--site needs a value\n" },
  { tool: "eval/search_quality.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/search_quality\.mjs \[--site docs\/_site\] / },
  { tool: "eval/search_quality.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/search_quality.mjs", args: ["stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "eval/search_quality.mjs", args: ["--help", "--bogus"], exit: 0, stdout: /^Usage: node eval\/search_quality\.mjs \[--site docs\/_site\] / },
  { tool: "eval/search_quality.mjs", args: ["--help=1"], exit: 2, stderr: "--help takes no value\n" },
  { tool: "eval/search_quality.mjs", args: ["-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "eval/search_quality.mjs", args: ["--site", "nowhere"], exit: 1, stderr: /^missing .*search-data\.json\nRun build\.bat / },
  { tool: "eval/search_quality.mjs", args: ["--site", "nowhere", "--sample", "abc"], exit: 1, stderr: /^missing .*search-data\.json\nRun build\.bat / },
  { tool: "eval/search_quality.mjs", args: ["--site", "--help"], exit: 2, stderr: "--site needs a value\n" },
  { tool: "eval/search_quality.mjs", args: ["--site"], exit: 2, stderr: "--site needs a value\n" },
  { tool: "eval/search_quality.mjs", args: ["--site", "nowhere", "--save"], exit: 2, stderr: "--save needs a value\n" },
  { tool: "eval/transcript.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/transcript\.mjs <case\.jsonl> / },
  { tool: "eval/transcript.mjs", args: ["-h"], exit: 0, stdout: /^Usage: node eval\/transcript\.mjs <case\.jsonl> / },
  { tool: "eval/transcript.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/transcript\.mjs <case\.jsonl> / },
  { tool: "eval/transcript.mjs", args: ["nope.jsonl", "--help"], exit: 0, stdout: /^Usage: node eval\/transcript\.mjs <case\.jsonl> / },
  { tool: "eval/transcript.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/transcript.mjs", args: ["--help=1"], exit: 2, stderr: "--help takes no value\n" },
  { tool: "eval/transcript.mjs", args: ["nope.jsonl"], exit: 1, stderr: /Error: ENOENT: no such file or directory, open '[^']*nope\.jsonl'\r?\n/ },
  { tool: "eval/transcript.mjs", args: ["--bogus", "nope.jsonl"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/transcript.mjs", args: ["-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "eval/transcript.mjs", args: ["--", "-x"], exit: 1, stderr: /Error: ENOENT: no such file or directory, open '(?:[^']*[\\/])?-x'\r?\n/ },
  { tool: "eval/transcript.mjs", args: ["a.jsonl", "b.jsonl"], exit: 2, stderr: "unexpected argument: b.jsonl\n" },
  { tool: "wisdom/wisdom.mjs", args: [], exit: 2, stderr: /^Usage: node wisdom\/wisdom\.mjs <command> \[options\]\n/ },
  { tool: "wisdom/wisdom.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node wisdom\/wisdom\.mjs <command> \[options\]\n/ },
  { tool: "wisdom/wisdom.mjs", args: ["bogus"], exit: 2, stderr: /^unknown command: bogus\nUsage: node wisdom\/wisdom\.mjs <command> \[options\]\n/ },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--guild", "--bogus"], exit: 2, stderr: "--guild needs a value\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--cap"], exit: 2, stderr: "--cap needs a value\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--help"], exit: 0, stdout: /^Usage: node wisdom\/wisdom\.mjs <command> \[options\]\n/ },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--force=1"], exit: 2, stderr: "--force takes no value\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--guild", "x", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },

  // Recorded in C52, for tbdocs, with C47's four above. Every command-line
  // error exits 4. A value flag refuses a missing value and one that starts
  // with a dash, "--" included; an unknown option is refused as given, as is a
  // positional, and a boolean given a value. Each --port and --stall-timeout
  // is checked where it stands, so a bad one fails even when a later one is
  // good. A --dest the build refuses exits 4 too, after the command line has
  // been read. --baseurl takes an empty value, meaning the site root; the
  // other value flags refuse one.
  { tool: "builder/tbdocs.mjs", args: ["--src"], exit: 4, stderr: "--src needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--url"], exit: 4, stderr: "--url needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--check-findings"], exit: 4, stderr: "--check-findings needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--symbol-gaps", "--serve"], exit: 4, stderr: "--symbol-gaps needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--dest", "--"], exit: 4, stderr: "--dest needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout"], exit: 4, stderr: "--stall-timeout needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout", "-1"], exit: 4, stderr: "--stall-timeout needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["foo"], exit: 4, stderr: "unexpected argument: foo\n" },
  { tool: "builder/tbdocs.mjs", args: ["-"], exit: 4, stderr: "unexpected argument: -\n" },
  { tool: "builder/tbdocs.mjs", args: ["-x"], exit: 4, stderr: "unknown option: -x\n" },
  { tool: "builder/tbdocs.mjs", args: ["-xy"], exit: 4, stderr: "unknown option: -xy\n" },
  { tool: "builder/tbdocs.mjs", args: ["-h"], exit: 0, stdout: /^usage: node builder\/tbdocs\.mjs \[options\]\n/ },
  { tool: "builder/tbdocs.mjs", args: ["--help"], exit: 0, stdout: /^usage: node builder\/tbdocs\.mjs \[options\]\n/ },
  { tool: "builder/tbdocs.mjs", args: ["--dry-run=1"], exit: 4, stderr: "--dry-run takes no value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--no-check=1"], exit: 4, stderr: "--no-check takes no value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--no-check", "--bogus"], exit: 4, stderr: "unknown option: --bogus\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port", "abc"], exit: 4, stderr: "--port expects a port number from 1 to 65535, got: abc\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port="], exit: 4, stderr: "--port needs a non-empty value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout="], exit: 4, stderr: "--stall-timeout needs a non-empty value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=65536"], exit: 4, stderr: "--port expects a port number from 1 to 65535, got: 65536\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=1.5"], exit: 4, stderr: "--port expects a port number from 1 to 65535, got: 1.5\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=80", "--port=0"], exit: 4, stderr: "--port expects a port number from 1 to 65535, got: 0\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=abc", "--port=80"], exit: 4, stderr: "--port expects a port number from 1 to 65535, got: abc\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout=-1"], exit: 4, stderr: "--stall-timeout expects seconds (0 disables), got: -1\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout=abc"], exit: 4, stderr: "--stall-timeout expects seconds (0 disables), got: abc\n" },
  { tool: "builder/tbdocs.mjs", args: ["--src", ".", "--dest", "."], exit: 4,
    stderr: /^refusing --dest (.+): it is or contains the source tree \1, which cleaning it would delete\n$/ },
  { tool: "builder/tbdocs.mjs", args: ["--src=.", "--dest=sub"], exit: 4,
    stderr: /^refusing --dest (.+)[\\/]sub: it is inside the source tree, so a build would read its output back as source, or serve would rebuild on its own writes\. Use a folder directly under \1 whose name starts with _site, _serve, _pdf, or one inside such a folder, or one outside \1\.\n$/ },
];

// Recorded in C71. Every tool prints its usage on stdout and exits 0 for
// --help and for -h, so each is a case, the two forms alike, unless the table
// above already holds it. The value is the start of the tool's text where that
// is not `usage: node <tool>`: an older text that opens otherwise, or one that
// names the tool without its folder.
const HELP_TOOLS = {
  "builder/tbdocs.mjs": null,
  "book/render-book.mjs": "usage: node render-book.mjs <input.html> ",
  "wisdom/wisdom.mjs": "Usage: node wisdom/wisdom.mjs <command> [options]\n",
  "eval/build_corpus.mjs": "Usage: node eval/build_corpus.mjs ",
  "eval/nav_hops.mjs": "Usage: node eval/nav_hops.mjs ",
  "eval/run_case.mjs": "Usage: node eval/run_case.mjs ",
  "eval/search_quality.mjs": "Usage: node eval/search_quality.mjs ",
  "eval/site_search.mjs": "Usage: node eval/site_search.mjs ",
  "eval/transcript.mjs": "Usage: node eval/transcript.mjs ",
  "scripts/addin_test.mjs": null,
  "scripts/build_dot_metrics.mjs": null,
  "scripts/build_package_api.mjs": null,
  "scripts/census_attributes.mjs": null,
  "scripts/check_a11y.mjs": null,
  "scripts/check_a11y_fingerprint.mjs": null,
  "scripts/check_axe_patch_equiv.mjs": null,
  "scripts/check_book_coverage.mjs": null,
  "scripts/check_ci_workflows.mjs": null,
  "scripts/check_cli.mjs": null,
  "scripts/check_code_regions.mjs": null,
  "scripts/check_dot_fit.mjs": null,
  "scripts/check_examples.mjs": null,
  "scripts/check_gate_lists.mjs": null,
  "scripts/check_impexp_parity.mjs": null,
  "scripts/check_links.mjs": "Usage: node check_links.mjs [options] <inputs...>\n",
  "scripts/check_links_diff.mjs": "Usage: node scripts/check_links_diff.mjs [options]\n",
  "scripts/check_lint.mjs": null,
  "scripts/check_page_baseline.mjs": null,
  "scripts/check_pdf_shims_equiv.mjs": null,
  "scripts/check_publish_policy.mjs": null,
  "scripts/check_regex_safety.mjs": null,
  "scripts/check_symbol_index.mjs": null,
  "scripts/check_tb_registry.mjs": null,
  "scripts/check_tree_fresh.mjs": null,
  "scripts/check_twin_parsers.mjs": null,
  "scripts/compare_trees.mjs": null,
  "scripts/convert_em_dash_separators.mjs": null,
  "scripts/crawl_check.mjs": null,
  "scripts/gen_attribute_probes.mjs": "Generate a twinBASIC probe project for Reference/Attributes.md applicability.\n",
  "scripts/impexp.mjs": "Usage:\n",
  "scripts/pick_a11y_sample.mjs": null,
  "scripts/survey_tooling.mjs": null,
  "scripts/sweep_a11y.mjs": null,
  "scripts/tbbuild.mjs": null,
  "scripts/tbrun.mjs": null,
};
const literal = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
for (const [tool, start] of Object.entries(HELP_TOOLS)) {
  const opening = start ? literal(start) : `${literal(`usage: node ${tool}`)}[ \\n]`;
  for (const flag of ["--help", "-h"]) {
    if (CASES.some((c) => c.tool === tool && c.args.length === 1 && c.args[0] === flag)) continue;
    CASES.push({ tool, args: [flag], exit: 0, stdout: new RegExp(`^${opening}`) });
  }
}

// Recorded in C72. Every tool refuses an unknown flag and an empty value at
// the parse, so each has a case for the first and, where it has a value
// option, for the second: `tool: [option, extras]`, the option given as
// `--option=`. Both exit 2, or 4 in tbdocs and check_links, print the refusal on
// stderr and nothing on stdout. `prefix` is the text a tool puts before its
// message. `args` replaces `--bogus` where the tool must never get further than
// the parse: convert_em_dash_separators would rewrite docs/ but for --check, and
// wisdom needs a command that is not a real one. A case the table above already
// holds, the same tool with the same arguments, is not added again.
const REFUSALS = {
  "builder/tbdocs.mjs": ["src", { exit: 4 }],
  "book/render-book.mjs": ["output"],
  "wisdom/wisdom.mjs": ["guild", { args: ["bogus", "--bogus"], empty: ["bogus", "--guild="] }],
  "eval/build_corpus.mjs": ["dest"],
  "eval/nav_hops.mjs": ["from"],
  "eval/run_case.mjs": ["corpus"],
  "eval/search_quality.mjs": ["site"],
  "eval/site_search.mjs": ["site"],
  "eval/transcript.mjs": [null],
  "scripts/addin_test.mjs": ["ide"],
  "scripts/build_dot_metrics.mjs": [null],
  "scripts/build_package_api.mjs": ["out"],
  "scripts/census_attributes.mjs": ["out"],
  "scripts/check_a11y.mjs": ["root-dir"],
  "scripts/check_a11y_fingerprint.mjs": ["pages"],
  "scripts/check_axe_patch_equiv.mjs": ["patch"],
  "scripts/check_book_coverage.mjs": [null],
  "scripts/check_ci_workflows.mjs": [null],
  "scripts/check_cli.mjs": [null],
  "scripts/check_code_regions.mjs": [null],
  "scripts/check_dot_fit.mjs": [null],
  "scripts/check_examples.mjs": ["only", { prefix: "check_examples: " }],
  "scripts/check_gate_lists.mjs": [null],
  "scripts/check_impexp_parity.mjs": [null],
  "scripts/check_links.mjs": ["root-dir", { exit: 4, prefix: "error: " }],
  "scripts/check_links_diff.mjs": ["a"],
  "scripts/check_lint.mjs": [null, { prefix: "check_lint: " }],
  "scripts/check_page_baseline.mjs": [null],
  "scripts/check_pdf_shims_equiv.mjs": [null],
  "scripts/check_publish_policy.mjs": ["src"],
  "scripts/check_regex_safety.mjs": [null],
  "scripts/check_symbol_index.mjs": [null],
  "scripts/check_tb_registry.mjs": [null],
  "scripts/check_tree_fresh.mjs": ["tree"],
  "scripts/check_twin_parsers.mjs": [null],
  "scripts/compare_trees.mjs": ["before", { prefix: "compare_trees: " }],
  "scripts/convert_em_dash_separators.mjs": [null, { args: ["--check", "--bogus"] }],
  "scripts/crawl_check.mjs": ["timeout"],
  "scripts/gen_attribute_probes.mjs": [null],
  "scripts/impexp.mjs": [null, { prefix: "ERROR: " }],
  "scripts/pick_a11y_sample.mjs": ["sweep"],
  "scripts/survey_tooling.mjs": ["root"],
  "scripts/sweep_a11y.mjs": ["out"],
  "scripts/tbbuild.mjs": ["ide"],
  "scripts/tbrun.mjs": ["ide"],
};
// The cases whose folder must stay empty, as for a help request: a refusal
// starts no IDE or browser and writes nothing, and a tool that read the flag as
// a folder name would create one.
const LEAVES_EMPTY = new Set();
for (const tool of Object.keys(HELP_TOOLS)) {
  if (!(tool in REFUSALS)) throw new Error(`HELP_TOOLS names ${tool}, which REFUSALS does not`);
}
for (const [tool, [option, { exit = 2, prefix = "", args, empty } = {}]] of Object.entries(REFUSALS)) {
  if (!(tool in HELP_TOOLS)) throw new Error(`REFUSALS names ${tool}, which HELP_TOOLS does not`);
  const wanted = [{ args: args ?? ["--bogus"], stderr: new RegExp(`^${literal(`${prefix}unknown option: --bogus\n`)}`) }];
  if (option) wanted.push({ args: empty ?? [`--${option}=`], stderr: new RegExp(`^${literal(`${prefix}--${option} needs a non-empty value\n`)}`) });
  for (const w of wanted) {
    const held = CASES.find((c) => c.tool === tool && c.args.length === w.args.length && c.args.every((a, i) => a === w.args[i]));
    if (held) LEAVES_EMPTY.add(held);
    else {
      const made = { tool, args: w.args, exit, stderr: w.stderr };
      CASES.push(made);
      LEAVES_EMPTY.add(made);
    }
  }
}

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

const asksForHelp = ({ args }) => args.includes("--help") || args.includes("-h");
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
      if (asksForHelp(CASES[i]) || LEAVES_EMPTY.has(CASES[i])) results[i].left = await readdir(cwd);
    }
  };
  await Promise.all(Array.from({ length: Math.min(availableParallelism(), CASES.length) }, lane));
  CASES.forEach((c, i) => {
    const got = results[i];
    const ok = got.exit === c.exit && matches(c.stdout, got.stdout) && matches(c.stderr, got.stderr);
    const label = `${path.basename(c.tool, ".mjs")} ${c.args.join(" ")}`;
    check(`${label}: exit ${c.exit}, ${c.stdout ? "stdout" : "stderr"}`, ok,
      `expected exit ${c.exit}, stdout ${expectation(c.stdout)}, stderr ${expectation(c.stderr)}\n`
        + `got      exit ${got.exit}, stdout ${clip(got.stdout)}, stderr ${clip(got.stderr)}`);
    if (got.left) check(`${label}: leaves its folder empty`, got.left.length === 0, `appeared in the folder: ${show(got.left)}`);
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}

// ------------------------------------------------------------ report

process.exit(report());
