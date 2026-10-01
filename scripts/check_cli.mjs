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
// Every tool answers --help and -h with its usage on stdout and exit 0,
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
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { DEFAULTS, parseCommandLine } from "../builder/command-line.mjs";
import {
  CliError,
  choiceOption,
  dateOption,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  regexOption,
  urlOption,
  withUsageError,
} from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { CASES, LEAVES_EMPTY } from "./lib/cli-cases.mjs";
import { createProbes } from "./lib/gate-probes.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_cli.mjs [-h, --help]

Tests lib/cli.mjs, the command-line parser, and runs the recorded command-line
cases of every tool, each in an empty folder with no IDE and no browser.

  -h, --help  print this text and exit

Exit codes:
  0  every probe and recorded case passed
  1  a probe or a recorded case failed
  2  the gate could not run: a refused command line, or a crash`;

if (
  withUsageError(() =>
    parseCli(process.argv.slice(2), {
      options: { help: { type: "boolean", short: "h" } },
      stopAt: ["help"],
    }),
  ).values.help
)
  printHelpAndExit(USAGE);

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
  check(
    "an absent option takes its default, a multiple one [], any other none",
    show(values) === show({ rootDir: "docs", forbid: [] }),
    show(values),
  );
}
{
  const { values } = parseCli(["--root-dir", "a", "--root-dir=b", "-v", "--forbid", "x", "--forbid=y"], {
    options: OPTIONS,
  });
  check(
    "values are keyed in camelCase; a repeat keeps the last, a multiple one all in order",
    show(values) === show({ rootDir: "b", verbose: true, forbid: ["x", "y"] }),
    show(values),
  );
}
{
  const err = cliError(() => parseCli(["--port"], { options: OPTIONS }), "missing-value");
  check(
    "a value flag at the end has no value",
    err?.option === "--port" && err.value === undefined && err.message === "--port needs a value",
    show(err),
  );
  const short = cliError(() => parseCli(["-p"], { options: OPTIONS }), "missing-value");
  check(
    "the error names the flag as typed",
    short?.option === "-p" && short.message === "-p needs a value",
    show(short),
  );
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
  check(
    "an unknown option is an error that names it as given",
    err?.option === "--bogus" && err.arg === "--bogus=1" && err.message === "unknown option: --bogus=1",
    show(err),
  );
  const bool = cliError(() => parseCli(["--verbose=1"], { options: OPTIONS }), "unexpected-value");
  check("a boolean given a value is an error", bool?.message === "--verbose takes no value", show(bool));
  const extra = cliError(() => parseCli(["a"], { options: OPTIONS }), "unexpected-positional");
  check(
    "a positional the tool does not take is an error",
    extra?.arg === "a" && extra.message === "unexpected argument: a",
    show(extra),
  );
}
{
  const spec = { options: OPTIONS, positionals: { max: Infinity } };
  const bare = cliError(() => parseCli(["a", "--x", "b"], spec), "unknown-option");
  check("an unknown option is refused even where positionals are taken", bare?.option === "--x", show(bare));
  const short = cliError(() => parseCli(["-ab"], spec), "unknown-option");
  check("a short option cluster with an unknown letter is refused", short?.option === "-a", show(short));
  const r = parseCli(["--", "--x", "-5", "-ab", "--y=1"], spec);
  check(
    "after -- an argument that starts with a dash is a positional",
    show(r.positionals) === show(["--x", "-5", "-ab", "--y=1"]),
    show(r),
  );
  const one = cliError(() => parseCli(["a", "b"], { options: OPTIONS, positionals: 1 }), "unexpected-positional");
  check("a positional beyond max is refused, naming it", one?.arg === "b", show(one));
  const value = cliError(() => parseCli(["--verbose=1", "--port"], spec), "unexpected-value");
  check("the first fault is the one reported", value?.option === "--verbose", show(value));
}
{
  const few = cliError(() => parseCli([], { options: OPTIONS, positionals: 1 }), "missing-positional");
  check("too few positionals is an error", few?.message === "expected at least 1 argument, got 0", show(few));
  const many = cliError(
    () => parseCli(["a", "b"], { options: OPTIONS, positionals: { min: 1, max: 1 } }),
    "unexpected-positional",
  );
  check("too many positionals is an error naming the first extra", many?.arg === "b", show(many));
  const r = parseCli(["--", "--verbose"], { options: OPTIONS, positionals: 1 });
  check(
    "after -- every argument is a positional",
    show(r.positionals) === show(["--verbose"]) && !("verbose" in r.values) && r.tokens[0].kind === "option-terminator",
    show(r),
  );
}
{
  const r = parseCli(["--no-check", "x", "--check", "-v"], {
    options: { "no-check": { type: "boolean" }, check: { type: "boolean" }, verbose: { type: "boolean", short: "v" } },
    positionals: 1,
  });
  check(
    "tokens keep the order, each option's with its key",
    show(r.tokens.map((t) => t.key ?? t.value)) === show(["noCheck", "x", "check", "verbose"]),
    show(r.tokens),
  );
}
{
  const apart = cliError(() => parseCli(["--port", ""], { options: OPTIONS }), "empty-value");
  check(
    "an empty value given separately is refused",
    apart?.option === "--port" && apart.value === "" && apart.message === "--port needs a non-empty value",
    show(apart),
  );
  const inline = cliError(() => parseCli(["--port="], { options: OPTIONS }), "empty-value");
  check(
    "an empty value given inline is refused",
    inline?.arg === "--port=" && inline.message === "--port needs a non-empty value",
    show(inline),
  );
  const short = cliError(() => parseCli(["-p", ""], { options: OPTIONS }), "empty-value");
  check("the empty-value error names the flag as typed", short?.message === "-p needs a non-empty value", show(short));
  const many = cliError(() => parseCli(["--forbid", "a", "--forbid", ""], { options: OPTIONS }), "empty-value");
  check(
    "an empty value of a multiple option is refused",
    many?.option === "--forbid" && many.message === "--forbid needs a non-empty value",
    show(many),
  );
  const manyInline = cliError(() => parseCli(["--forbid="], { options: OPTIONS }), "empty-value");
  check("an empty inline value of a multiple option is refused", Boolean(manyInline), show(manyInline));
  const first = cliError(() => parseCli(["--port", "--", "--forbid="], { options: OPTIONS }), "missing-value");
  check("a value that looks like an option is missing, not empty", first?.option === "--port", show(first));
}
{
  const options = {
    ...OPTIONS,
    port: { type: "string", empty: true },
    forbid: { type: "string", multiple: true, empty: true },
  };
  check(
    "empty: true accepts an empty value, separate or inline",
    parseCli(["--port", ""], { options }).values.port === "" && parseCli(["--port="], { options }).values.port === "",
  );
  check(
    "empty: true accepts empty values of a multiple option",
    show(parseCli(["--forbid=", "--forbid", "", "--forbid", "x"], { options }).values.forbid) === show(["", "", "x"]),
  );
  const missing = cliError(() => parseCli(["--port"], { options }), "missing-value");
  check("empty: true does not excuse a missing value", Boolean(missing), show(missing));
  const other = cliError(() => parseCli(["--root-dir", ""], { options }), "empty-value");
  check("empty: true is per option", other?.option === "--root-dir", show(other));
  check("empty is not passed to parseArgs", caught(() => parseCli([], { options })) === null);
}
{
  const spec = { options: { ...OPTIONS, help: { type: "boolean", short: "h" } }, positionals: 1, stopAt: ["help"] };
  const r = parseCli(["--port", "80", "-h", "--bogus", "--port", "--verbose=1", "a", "b"], spec);
  check(
    "stopAt ends the parse at the option, reading nothing after it and counting no positionals",
    r.stopped === "help" && r.values.port === "80" && r.values.help === true && r.positionals.length === 0,
    show(r),
  );
  check(
    "stopAt does not excuse an error before the option",
    Boolean(cliError(() => parseCli(["--bogus", "--help"], spec), "unknown-option")),
  );
  check(
    "stopAt does not excuse an empty value before the option",
    Boolean(cliError(() => parseCli(["--port=", "--help"], spec), "empty-value")),
  );
  check(
    "without its option, stopAt changes nothing",
    parseCli(["a"], spec).stopped === undefined && Boolean(cliError(() => parseCli([], spec), "missing-positional")),
  );
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
      return strict
        ? show(KINDS[err.code] ?? err.code)
        : show(Object.values(KINDS).find((k) => k.includes(err.code)) ?? err.code);
    }
  };
  // biome-ignore format: a table, one entry per line
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
      const ours = outcome(
        () => parseCli(args, { options: OPTIONS, positionals: allow ? { max: Infinity } : 0 }),
        false,
      );
      if (strict !== ours)
        differ.push(`${allow ? "" : "no positionals: "}${show(args)}\n  parseArgs ${strict}\n  parseCli  ${ours}`);
    }
  }
  check(
    `parseCli agrees with a strict parseArgs on ${LISTS.length * 2} argument lists`,
    differ.length === 0,
    differ.join("\n"),
  );
}

// ------------------------------------------------------------ numberOption

{
  const port = { option: "--port", integer: true, min: 1, max: 65535 };
  check("numberOption reads a number in range", numberOption("8080", port) === 8080);
  const low = cliError(() => numberOption("0", port), "bad-number");
  check(
    "numberOption refuses one out of range, naming the range",
    low?.message === "--port expects a whole number from 1 to 65535, got: 0" && low.option === "--port",
    show(low),
  );
  check(
    "numberOption refuses blank text, which Number reads as 0",
    Boolean(cliError(() => numberOption("", port), "bad-number")),
  );
  check(
    "numberOption refuses a fraction where a whole number is wanted",
    Boolean(cliError(() => numberOption("1.5", port), "bad-number")),
  );
  check("numberOption takes a fraction otherwise", numberOption("1.5", { option: "--t", min: 0 }) === 1.5);
  const nan = cliError(() => numberOption("abc", { option: "--t", min: 0 }), "bad-number");
  check(
    "numberOption refuses text that is not a number",
    nan?.message === "--t expects a number of at least 0, got: abc",
    show(nan),
  );
  const above = { option: "--t", above: 0 };
  const zero = cliError(() => numberOption("0", above), "bad-number");
  check(
    "numberOption above 0 refuses 0, saying greater than 0",
    zero?.message === "--t expects a number greater than 0, got: 0" && zero.option === "--t" && zero.value === "0",
    show(zero),
  );
  check(
    "numberOption above 0 takes 0.5 and refuses a negative",
    numberOption("0.5", above) === 0.5 && Boolean(cliError(() => numberOption("-1", above), "bad-number")),
  );
  const capped = { option: "--t", above: 0, max: 5 };
  const over = cliError(() => numberOption("6", capped), "bad-number");
  check(
    "numberOption above 0 with a max names both",
    over?.message === "--t expects a number greater than 0 and at most 5, got: 6",
    show(over),
  );
  check("numberOption above 0 with a max takes the max itself", numberOption("5", capped) === 5);
  const whole = cliError(() => numberOption("0", { option: "--t", integer: true, above: 0 }), "bad-number");
  check(
    "numberOption above 0 for a whole number says so",
    whole?.message === "--t expects a whole number greater than 0, got: 0",
    show(whole),
  );
  const atMost = cliError(() => numberOption("10", { option: "--t", max: 9 }), "bad-number");
  check(
    "numberOption with only a max names it",
    atMost?.message === "--t expects a number of at most 9, got: 10",
    show(atMost),
  );
  const free = cliError(() => numberOption("x", { option: "--t" }), "bad-number");
  check("numberOption with no range names none", free?.message === "--t expects a number, got: x", show(free));
  check(
    "numberOption reads what Number reads: hex, exponent and padding",
    numberOption("0x10", { option: "--t" }) === 16 &&
      numberOption("1e3", { option: "--t" }) === 1000 &&
      numberOption(" 7 ", { option: "--t" }) === 7,
  );
  check(
    "numberOption refuses trailing text, blank text, a missing value and Infinity",
    ["12abc", "  ", "", undefined, "Infinity"].every((v) =>
      cliError(() => numberOption(v, { option: "--t" }), "bad-number"),
    ),
  );
}

// ------------------------------------------------------------ the other checkers

{
  const pick = { option: "--oracle", choices: ["fs", "index"] };
  check("choiceOption returns a listed value", choiceOption("index", pick) === "index");
  const bad = cliError(() => choiceOption("x", pick), "bad-choice");
  check(
    "choiceOption refuses another, listing the choices",
    bad?.message === "--oracle expects fs or index, got: x" && bad.option === "--oracle" && bad.value === "x",
    show(bad),
  );
  const three = cliError(() => choiceOption("d", { option: "--c", choices: ["a", "b", "c"] }), "bad-choice");
  check(
    "choiceOption lists three with a comma and or",
    three?.message === "--c expects a, b or c, got: d",
    show(three),
  );
  const one = cliError(() => choiceOption("d", { option: "--c", choices: ["a"] }), "bad-choice");
  check("choiceOption names a single choice alone", one?.message === "--c expects a, got: d", show(one));
  check("choiceOption is case-sensitive", Boolean(cliError(() => choiceOption("FS", pick), "bad-choice")));
}
{
  const re = regexOption("^a+$", { option: "--only", flags: "i" });
  check(
    "regexOption returns the RegExp, with its flags",
    re instanceof RegExp && re.flags === "i" && re.test("AA"),
    show(re),
  );
  check("regexOption has no flags by default", regexOption("a", { option: "--only" }).flags === "");
  const bad = cliError(() => regexOption("(", { option: "--only" }), "bad-regex");
  check(
    "regexOption refuses a pattern that does not compile, naming it and the reason",
    bad?.option === "--only" &&
      bad.value === "(" &&
      /^--only expects a regular expression, got: \( \(.+\)$/.test(bad.message),
    show(bad),
  );
  check(
    "regexOption refuses a flag that does not exist",
    Boolean(cliError(() => regexOption("a", { option: "--only", flags: "q" }), "bad-regex")),
  );
}
{
  const url = urlOption("https://example.org/a/b?c=1", { option: "--url" });
  check(
    "urlOption returns a URL for an http or https address",
    url instanceof URL && url.hostname === "example.org" && url.pathname === "/a/b",
    show(url),
  );
  check("urlOption takes http", urlOption("http://127.0.0.1:9/", { option: "--url" }).port === "9");
  const rel = cliError(() => urlOption("foo", { option: "--url" }), "bad-url");
  check(
    "urlOption refuses text that is not an absolute URL",
    rel?.message === "--url expects an absolute http or https URL, got: foo" &&
      rel.option === "--url" &&
      rel.value === "foo",
    show(rel),
  );
  const mail = cliError(() => urlOption("mailto:x", { option: "--url" }), "bad-url");
  check(
    "urlOption refuses another scheme",
    mail?.message === "--url expects an absolute http or https URL, got: mailto:x",
    show(mail),
  );
  check("urlOption refuses a path", Boolean(cliError(() => urlOption("/docs/", { option: "--url" }), "bad-url")));
  check(
    "urlOption takes the schemes it is given",
    urlOption("ftp://h/f", { option: "--u", protocols: ["ftp:"] }).protocol === "ftp:" &&
      cliError(() => urlOption("https://h/", { option: "--u", protocols: ["ftp:"] }), "bad-url")?.message ===
        "--u expects an absolute ftp URL, got: https://h/",
  );
}
{
  const since = { option: "--since", min: "2015-01-01" };
  check(
    "dateOption returns the time in ms of a date",
    dateOption("2024-02-29", { option: "--since" }) === Date.parse("2024-02-29"),
  );
  check(
    "dateOption takes a time after a T",
    dateOption("2024-02-03T10:00Z", { option: "--since" }) === Date.parse("2024-02-03T10:00Z"),
  );
  const bare = cliError(() => dateOption("12", { option: "--since" }), "bad-date");
  check(
    "dateOption refuses 12, which Date.parse reads as a date in 2001",
    bare?.message === "--since expects an ISO 8601 date (YYYY-MM-DD), got: 12" &&
      bare.option === "--since" &&
      bare.value === "12",
    show(bare),
  );
  const march = cliError(() => dateOption("2024-02-30", { option: "--since" }), "bad-date");
  check(
    "dateOption refuses a day the month does not have",
    march?.message === "--since expects an ISO 8601 date (YYYY-MM-DD), got: 2024-02-30",
    show(march),
  );
  check(
    "dateOption refuses 29 February of a common year",
    Boolean(cliError(() => dateOption("2023-02-29", { option: "--since" }), "bad-date")),
  );
  check(
    "dateOption refuses other shapes",
    ["2024-2-3", "2024/02/03", "Feb 3 2024", "", "2024-02-03 10:00", "2024-13-01"].every((v) =>
      cliError(() => dateOption(v, { option: "--since" }), "bad-date"),
    ),
  );
  const early = cliError(() => dateOption("2014-12-31", since), "bad-date");
  check(
    "dateOption refuses a date before min, naming it",
    early?.message === "--since expects an ISO 8601 date (YYYY-MM-DD) no earlier than 2015-01-01, got: 2014-12-31",
    show(early),
  );
  check(
    "dateOption takes min itself and a later date",
    dateOption("2015-01-01", since) === Date.parse("2015-01-01") &&
      dateOption("2024-02-03T10:00Z", since) > Date.parse("2015-01-01"),
  );
}
{
  const names = ["check", "propose", "census"];
  check(
    "refuseTogether takes none of the names given",
    refuseTogether({}, names) === undefined && refuseTogether({ other: true }, names) === undefined,
  );
  check("refuseTogether takes one", refuseTogether({ check: true }, names) === undefined);
  const two = cliError(() => refuseTogether({ check: true, census: true }, names), "conflict");
  check(
    "refuseTogether refuses two, naming both",
    two?.message === "--check and --census cannot be given together" &&
      show(two.options) === show(["--check", "--census"]),
    show(two),
  );
  const three = cliError(() => refuseTogether({ check: true, propose: true, census: true }, names), "conflict");
  check(
    "refuseTogether refuses three, naming all",
    three?.message === "--check, --propose and --census cannot be given together",
    show(three),
  );
  check(
    "refuseTogether does not count false or undefined",
    refuseTogether({ check: true, propose: false, census: undefined }, names) === undefined &&
      refuseTogether({ check: false, propose: false }, names) === undefined,
  );
  const keyed = cliError(() => refuseTogether({ rootDir: "a", showAll: true }, ["root-dir", "show-all"]), "conflict");
  check(
    "refuseTogether reads a long name through its camelCase key",
    keyed?.message === "--root-dir and --show-all cannot be given together",
    show(keyed),
  );
  check(
    "refuseTogether counts a value that is not false",
    Boolean(cliError(() => refuseTogether({ check: "x", propose: 0 }, names), "conflict")),
  );
}

// ------------------------------------------------------------ printing and exiting

const EXITED = Symbol("exited");
function capture(fn) {
  const out = { text: "", code: null };
  const stream = {
    write: (s) => {
      out.text += s;
    },
  };
  const exit = (code) => {
    out.code = code;
    throw EXITED;
  };
  const err = caught(() => fn(stream, exit));
  if (err !== null && err !== EXITED) throw err;
  return out;
}
{
  let result;
  const quiet = capture((stream, exit) => {
    result = withUsageError(() => 42, { stream, exit });
  });
  check(
    "withUsageError returns what fn returns, printing nothing",
    result === 42 && quiet.text === "" && quiet.code === null,
    show(quiet),
  );
  const out = capture((stream, exit) =>
    withUsageError(() => parseCli(["--port"], { options: OPTIONS }), { stream, exit, exitCode: 4 }),
  );
  check(
    "withUsageError prints the message and exits with the code",
    out.text === "--port needs a value\n" && out.code === 4,
    show(out),
  );
  const own = capture((stream, exit) =>
    withUsageError(() => parseCli(["--bogus"], { options: OPTIONS }), {
      stream,
      exit,
      format: (err) => `usage: tool\n${err.code}\n`,
    }),
  );
  check(
    "withUsageError prints the tool's own text, adding no second newline",
    own.text === "usage: tool\nunknown-option\n" && own.code === 2,
    show(own),
  );
  const other = caught(() =>
    capture((stream, exit) =>
      withUsageError(
        () => {
          throw new RangeError("boom");
        },
        { stream, exit },
      ),
    ),
  );
  check("withUsageError throws on anything but a CliError", other instanceof RangeError);
}
{
  const out = capture((stream, exit) => printHelpAndExit("usage: tool", { stream, exit }));
  check("printHelpAndExit prints the text and exits 0", out.text === "usage: tool\n" && out.code === 0, show(out));
  const err = capture((stream, exit) => printHelpAndExit("usage: tool\n", { stream, exit, exitCode: 2 }));
  check("printHelpAndExit takes the tool's exit code", err.text === "usage: tool\n" && err.code === 2, show(err));
}
{
  // exitOnCrash, in a process of its own since it ends the one it is in: a crash
  // exits 2, the cleanup runs first, and a cleanup that throws changes neither.
  const crash = (cleanup) =>
    new Promise((resolve) => {
      const cli = JSON.stringify(pathToFileURL(path.join(REPO_ROOT, "lib", "cli.mjs")).href);
      execFile(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import { exitOnCrash } from ${cli}; exitOnCrash(${cleanup}); setTimeout(() => { throw new Error("boom"); }, 0);`,
        ],
        (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }),
      );
    });
  const bare = await crash("");
  check(
    "exitOnCrash: a crash prints the error and exits 2",
    bare.code === 2 && bare.stderr.includes("boom"),
    show(bare),
  );
  const saved = await crash(`() => console.log("saved")`);
  check(
    "exitOnCrash: the cleanup runs before the exit, and the exit is still 2",
    saved.code === 2 && saved.stdout.trim() === "saved" && saved.stderr.includes("boom"),
    show(saved),
  );
  const failing = await crash(`() => { throw new Error("cleanup failed"); }`);
  check(
    "exitOnCrash: a cleanup that throws does not stop the exit or hide the crash",
    failing.code === 2 && failing.stderr.includes("boom") && failing.stderr.includes("cleanup failed"),
    show(failing),
  );
}

// ------------------------------------------------------------ tbdocs's command line

// What the recorded cases cannot see, because each of these gets past the
// command line and would start a build: the options it returns.
{
  const parsed = (args) => parseCommandLine(args);
  const pick = (args, keys) => show(Object.fromEntries(keys.map((k) => [k, parsed(args)[k]])));
  const CHECKS = ["check", "auditIndex", "checkFindings"];
  check(
    "tbdocs's defaults are DEFAULTS, with no fetchAssets",
    show(parsed([])) === show(DEFAULTS) && !("fetchAssets" in parsed([])),
  );
  check(
    "tbdocs's --no-check undoes the check flags before it",
    pick(["--check-audit-index", "--check-findings", "f", "--no-check"], CHECKS) ===
      show({ check: false, auditIndex: false, checkFindings: null }),
    pick(["--check-audit-index", "--check-findings", "f", "--no-check"], CHECKS),
  );
  check(
    "tbdocs's --no-check leaves the check flags after it",
    pick(["--no-check", "--check-findings", "f"], CHECKS) ===
      show({ check: true, auditIndex: false, checkFindings: "f" }),
    pick(["--no-check", "--check-findings", "f"], CHECKS),
  );
  check(
    "tbdocs's --check-audit-index after --no-check turns the check on",
    pick(["--src", "docs", "--no-check", "--check-audit-index"], CHECKS) ===
      show({ check: true, auditIndex: true, checkFindings: null }),
    pick(["--src", "docs", "--no-check", "--check-audit-index"], CHECKS),
  );
  check(
    "tbdocs's last --check or --no-check wins",
    parsed(["--no-check", "--check"]).check === true && parsed(["--check", "--no-check"]).check === false,
  );
  check(
    "tbdocs's last of --fetch-assets and --no-fetch-assets wins",
    parsed(["--fetch-assets", "--no-fetch-assets"]).fetchAssets === false &&
      parsed(["--no-fetch-assets", "--fetch-assets"]).fetchAssets === true,
  );
  check(
    "tbdocs reads --stall-timeout 0 as disabling the watchdog",
    parsed(["--stall-timeout", "0"]).stallTimeoutMs === 0,
  );
  check(
    "tbdocs reads --baseurl= as the site root, an empty value",
    parsed(["--baseurl="]).baseurl === "" && parsed(["--baseurl", ""]).baseurl === "",
  );
  check("tbdocs reads --stall-timeout in seconds", parsed(["--stall-timeout", "1.5"]).stallTimeoutMs === 1500);
  check(
    "tbdocs takes --name=value for every value flag",
    pick(
      ["--check-findings=f", "--symbol-gaps=g", "--port=81", "--dest=d"],
      ["check", "checkFindings", "symbolGaps", "port", "dest"],
    ) === show({ check: true, checkFindings: "f", symbolGaps: "g", port: 81, dest: "d" }),
  );
  check(
    "tbdocs keeps the flags the negations set",
    pick(["--no-offline", "--no-pdf"], ["skipOffline", "skipPdf"]) === show({ skipOffline: true, skipPdf: true }),
  );
}

// ------------------------------------------------------------ the recorded cases

// The cases themselves are in scripts/lib/cli-cases.mjs.

// Every usage text ends with its tool's one table of exit codes: a line
// `Exit codes:`, then a line for each code, `  <code>  <meaning>`, a long
// meaning wrapped under itself. impexp keeps the table it shares with
// impexp.py, which check_impexp_parity holds the two editions to.
const EXIT_TABLE = /\nExit codes:\n(?: {2}\d {2}[^\n]*\n| {5}[^\n]*\n)+$/;
const oneExitTable = (text) => EXIT_TABLE.test(text) && text.split("Exit codes:").length === 2;

const TIMEOUT_MS = 30_000;

function runCase({ tool, args }, cwd, env) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(REPO_ROOT, tool), ...args],
      { cwd, env, timeout: TIMEOUT_MS, windowsHide: true },
      (error, stdout, stderr) => {
        const exit = !error ? 0 : error.killed ? `killed after ${TIMEOUT_MS / 1000} s` : error.code;
        resolve({ exit, stdout, stderr });
      },
    );
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
    check(
      `${label}: exit ${c.exit}, ${c.stdout ? "stdout" : "stderr"}`,
      ok,
      `expected exit ${c.exit}, stdout ${expectation(c.stdout)}, stderr ${expectation(c.stderr)}\n` +
        `got      exit ${got.exit}, stdout ${clip(got.stdout)}, stderr ${clip(got.stderr)}`,
    );
    if (c.exitCodes)
      check(
        `${label}: ends with one table of exit codes`,
        oneExitTable(got.stdout),
        `got stdout ${clip(got.stdout.slice(-400))}`,
      );
    if (got.left)
      check(`${label}: leaves its folder empty`, got.left.length === 0, `appeared in the folder: ${show(got.left)}`);
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}

// ------------------------------------------------------------ report

process.exit(report());
