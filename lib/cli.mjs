// Command-line parsing for every tool, over node:util's parseArgs.
//
// parseCli() reads an argument list against a table of options and either
// returns what it found or throws a CliError that names the problem. A tool
// prints that error and exits with withUsageError(). numberOption() reads a
// number that has to be one, and printHelpAndExit() prints a usage text.
//
// The parse is strict: an unknown option, a boolean given a value, a value flag
// with no value, an empty value and a positional the tool does not take are all
// errors. A value that starts with a dash is given inline, as `--port=-5`, and
// a positional that starts with one after `--`.
//
// parseArgs runs loose, and this module makes a strict parse's checks itself,
// from the tokens: a strict parse stops at the first unknown option and takes
// an empty value, and a loose parse alone takes a trailing value flag as
// `true`. Apart from the empty value, parseCli refuses what a strict parse
// refuses and returns what it returns; the probes compare the two.
//
// scripts/check_cli.mjs carries the probes for this module, and the recorded
// command-line cases of the tools that use it.

import { parseArgs } from "node:util";

/** A problem with the command line: `code` says which, and the fields name the argument. */
export class CliError extends Error {
  constructor(code, message, fields = {}) {
    super(message);
    this.name = "CliError";
    this.code = code;
    Object.assign(this, fields);
  }
}

// parseArgs' own test for a value that looks like an option: two or more
// characters, the first a dash. So `-` alone is a value, and so is "".
const isOptionLike = (v) => v.length > 1 && v[0] === "-";

// Whether a value flag was given a value: it takes the next argument unless
// that looks like an option, as a strict parse does; given inline, as
// `--port=-5`, any value is taken. An argument list that ends at the flag gives
// it none.
const hasValue = (value, inline) => value !== undefined && (inline || !isOptionLike(value));

const camelCase = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/**
 * Parses `argv` (without Node's own two entries) against `options`, a table in
 * parseArgs' shape keyed by long name: `{ type: "boolean" | "string", short,
 * multiple, default, empty }`.
 *
 * Returns `{ values, positionals, tokens, stopped }`. `values` is keyed by the
 * camelCase of each long name (`--root-dir` is `rootDir`); an absent option
 * takes its `default`, a `multiple` one with no default is `[]`, and any other
 * absent option is missing from `values`. A repeated option that is not
 * `multiple` keeps its last value. `tokens` are parseArgs' tokens for the
 * options, positionals and `--` that were kept, in order, each option's with
 * its `key`, for a tool whose flags depend on their order.
 *
 * `positionals` is how many the tool takes: a number, or `{ min, max }`; 0 by
 * default. A string option's value may not be empty, `--x ""` or `--x=`, unless
 * its spec says `empty: true`. `stopAt` names options that end the parse where
 * they stand, as a hand-written loop that answers `--help` or `--list` on the
 * spot does: nothing after the first of them is read or checked, the positional
 * count included, and `stopped` in the result is its key.
 *
 * Throws a CliError whose code is "unknown-option", "unexpected-value",
 * "missing-value", "empty-value", "unexpected-positional" or
 * "missing-positional", with `option` (the flag as typed, `--port` or `-p`),
 * `arg` (the argument as given) and `value` where they apply.
 */
export function parseCli(argv, { options = {}, positionals = 0, stopAt = [] } = {}) {
  const { min, max } = typeof positionals === "number" ? { min: positionals, max: positionals } : { min: 0, max: Infinity, ...positionals };

  const table = {};
  for (const [name, { default: _default, empty: _empty, ...spec }] of Object.entries(options)) table[name] = spec;
  const { tokens } = parseArgs({ args: argv, options: table, strict: false, allowPositionals: true, tokens: true });

  const values = {};
  const kept = [];
  const found = [];
  let stopped;

  for (const t of tokens) {
    if (t.kind === "option-terminator") { kept.push(t); continue; }
    if (t.kind === "positional") {
      if (found.length >= max) throw new CliError("unexpected-positional", `unexpected argument: ${t.value}`, { arg: t.value });
      found.push(t.value);
      kept.push(t);
      continue;
    }
    const spec = options[t.name];
    const arg = argv[t.index];
    if (!spec) throw new CliError("unknown-option", `unknown option: ${arg}`, { option: t.rawName, arg });
    const key = camelCase(t.name);
    let value;
    if (spec.type === "boolean") {
      if (t.inlineValue) throw new CliError("unexpected-value", `${t.rawName} takes no value`, { option: t.rawName, arg, value: t.value });
      value = true;
    } else {
      if (!hasValue(t.value, Boolean(t.inlineValue))) {
        throw new CliError("missing-value", `${t.rawName} needs a value`, { option: t.rawName, arg, value: t.value });
      }
      if (t.value === "" && !spec.empty) {
        throw new CliError("empty-value", `${t.rawName} needs a non-empty value`, { option: t.rawName, arg, value: t.value });
      }
      value = t.value;
    }
    if (spec.multiple) (values[key] ??= []).push(value);
    else values[key] = value;
    kept.push({ ...t, key });
    if (stopAt.includes(t.name)) { stopped = key; break; }
  }

  if (found.length < min && !stopped) {
    throw new CliError("missing-positional", `expected at least ${min} argument${min === 1 ? "" : "s"}, got ${found.length}`, { count: found.length });
  }
  for (const [name, spec] of Object.entries(options)) {
    const key = camelCase(name);
    if (key in values) continue;
    if ("default" in spec) values[key] = spec.default;
    else if (spec.multiple) values[key] = [];
  }
  return { values, positionals: found, tokens: kept, stopped };
}

/**
 * Reads `value`, the text given to the flag `option`, as a number: a whole one
 * when `integer`, between `min` and `max` inclusive. Blank text is not a
 * number, though Number("") is 0. Throws a CliError "bad-number", whose message
 * is `message(value)` when that is given.
 */
export function numberOption(value, { option, integer = false, min = -Infinity, max = Infinity, message } = {}) {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (Number.isFinite(n) && (!integer || Number.isInteger(n)) && n >= min && n <= max) return n;
  const range = Number.isFinite(min) && Number.isFinite(max) ? ` from ${min} to ${max}`
    : Number.isFinite(min) ? ` of at least ${min}`
    : Number.isFinite(max) ? ` of at most ${max}`
    : "";
  const text = message ? message(value) : `${option} expects ${integer ? "a whole number" : "a number"}${range}, got: ${value}`;
  throw new CliError("bad-number", text, { option, value });
}

// A stream named "stdout" or "stderr", or any object with a write(), which is
// how the probes read what was printed.
const streamOf = (stream) => (typeof stream === "string" ? process[stream] : stream);
const line = (text) => (text.endsWith("\n") ? text : `${text}\n`);

/**
 * Runs `fn` and returns what it returns. A CliError thrown from it is printed
 * to `stream` -- `format(err)`, or the error's own message -- and the process
 * exits with `exitCode`; anything else is thrown on. `exit` stands in for
 * process.exit in the probes.
 */
export function withUsageError(fn, { stream = "stderr", exitCode = 2, format = (err) => err.message, exit = process.exit } = {}) {
  try {
    return fn();
  } catch (err) {
    if (!(err instanceof CliError)) throw err;
    streamOf(stream).write(line(format(err)));
    return exit(exitCode);
  }
}

/** Prints `text` to `stream` and exits with `exitCode`; `exit` as for withUsageError. */
export function printHelpAndExit(text, { stream = "stdout", exitCode = 0, exit = process.exit } = {}) {
  streamOf(stream).write(line(text));
  return exit(exitCode);
}
