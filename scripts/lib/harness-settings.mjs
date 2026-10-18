// test/harness.json: the settings the documentation's tools share with tblaunch --
// which samples a run leaves out (exclusions) and how long each phase may take
// (timeouts). test/harness.md is the contract for the file; this module is its one
// reader on this side.
//
// The file is read from the repository root, once per process. A missing file, a
// version this reader does not know (or none), a key it does not know at any
// level, an exclusion of the wrong shape and a timeout that is not a number of
// seconds greater than 0 are each a HarnessError, which every tool turns into
// exit 2. So is a TB_<PHASE> variable that is not such a number.
//
// A timeout is resolved as test/harness.md says: the tool's option, then the
// variable, then the file. The option is the tool's to parse (optionSeconds, so
// that a bad value is a usage error with the tool's own usage text); the rest is
// timeoutMs's. Seconds go in, milliseconds come out.

import { readFileSync } from "node:fs";
import path from "node:path";
import { numberOption } from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";

/** The file, from the repository root. */
export const HARNESS_FILE = path.join(REPO_ROOT, "test", "harness.json");
/** How the file is named in a message. */
export const HARNESS_NAME = "test/harness.json";
/** The newest `version` this reader knows. */
export const HARNESS_VERSION = 1;

/** The modes the exclusions are keyed by: a compile, a `--build`, an `--llvm` build. */
export const EXCLUSION_MODES = ["compile", "build", "llvm"];
/** The stages: `build`, then either run. */
export const EXCLUSION_STAGES = ["build", "compiler-run", "exe-run"];

/**
 * Every timeout key the file may hold. The documentation's tools ignore the
 * ones only tblaunch uses (`handshake`, `load`, `setup`, `licence`).
 */
export const TIMEOUT_KEYS = [
  "projectOpen",
  "handshake",
  "load",
  "setup",
  "compile",
  "licence",
  "build",
  "compilerRun",
  "compilerRunQuiet",
  "exeRun",
];

/** The keys a person can override, with the option and the variable that do it. */
export const OVERRIDES = {
  compile: { option: "compile-timeout", variable: "TB_COMPILE_TIMEOUT" },
  build: { option: "build-timeout", variable: "TB_BUILD_TIMEOUT" },
  compilerRun: { option: "compiler-run-timeout", variable: "TB_COMPILER_RUN_TIMEOUT" },
  compilerRunQuiet: { option: "compiler-run-quiet", variable: "TB_COMPILER_RUN_QUIET" },
  exeRun: { option: "exe-run-timeout", variable: "TB_EXE_RUN_TIMEOUT" },
};

/** A fault in the file or in a TB_<PHASE> variable: the tools exit 2 for it. */
export class HarnessError extends Error {
  constructor(message) {
    super(message);
    this.name = "HarnessError";
  }
}

const isMap = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const isSeconds = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * What is wrong with the exclusions' shape, as a list of sentences: three levels,
 * mode, package and stage, each stage's value "*" or a non-empty list of ids.
 * @param {unknown} list  the parsed `exclusions` object
 */
export function exclusionProblems(list) {
  if (!isMap(list)) return ["it is not an object keyed by mode"];
  const problems = [];
  for (const [mode, packages] of Object.entries(list)) {
    if (!EXCLUSION_MODES.includes(mode)) {
      problems.push(`${mode}: not a mode (${EXCLUSION_MODES.join(", ")})`);
      continue;
    }
    if (!isMap(packages)) {
      problems.push(`${mode}: not an object keyed by package`);
      continue;
    }
    for (const [pkg, stages] of Object.entries(packages)) {
      if (!isMap(stages) || !Object.keys(stages).length) {
        problems.push(`${mode}.${pkg}: not an object keyed by stage`);
        continue;
      }
      for (const [stage, rule] of Object.entries(stages)) {
        const where = `${mode}.${pkg}.${stage}`;
        if (!EXCLUSION_STAGES.includes(stage)) problems.push(`${where}: not a stage (${EXCLUSION_STAGES.join(", ")})`);
        else if (mode === "compile" && stage !== "build") problems.push(`${where}: compile has no stage but build`);
        const ok = rule === "*" || (Array.isArray(rule) && rule.length && rule.every((id) => typeof id === "string"));
        if (!ok) problems.push(`${where}: neither "*" nor a list of sample ids`);
      }
    }
  }
  return problems;
}

/**
 * What is wrong with the whole file, as a list of sentences: the version, the
 * keys at every level, the exclusions' shape, and every timeout a number of
 * seconds greater than 0. Every timeout key must be present.
 * @param {unknown} data  the parsed file
 */
export function harnessProblems(data) {
  if (!isMap(data)) return ["it is not a JSON object"];
  const problems = [];
  if (!("version" in data)) problems.push("it has no version");
  else if (!Number.isInteger(data.version) || data.version < 1)
    problems.push("version: not a whole number of at least 1");
  else if (data.version > HARNESS_VERSION) {
    problems.push(`version ${data.version} is newer than this reader knows (${HARNESS_VERSION})`);
  }
  for (const key of Object.keys(data)) {
    if (!["version", "exclusions", "timeouts"].includes(key)) problems.push(`${key}: not a known key`);
  }
  if (!("exclusions" in data)) problems.push("it has no exclusions");
  else for (const p of exclusionProblems(data.exclusions)) problems.push(`exclusions: ${p}`);
  if (!("timeouts" in data)) problems.push("it has no timeouts");
  else if (!isMap(data.timeouts)) problems.push("timeouts: not an object keyed by phase");
  else {
    for (const [key, value] of Object.entries(data.timeouts)) {
      if (!TIMEOUT_KEYS.includes(key)) problems.push(`timeouts.${key}: not a known key`);
      else if (!isSeconds(value)) problems.push(`timeouts.${key}: not a number of seconds greater than 0`);
    }
    for (const key of TIMEOUT_KEYS) if (!(key in data.timeouts)) problems.push(`timeouts.${key}: missing`);
  }
  return problems;
}

let cached = null;

/**
 * The file, read and checked once per process.
 * @returns {{version: number, exclusions: object, timeouts: Record<string, number>}}
 * @throws {HarnessError}
 */
export function readHarness() {
  if (cached) return cached;
  let data;
  try {
    data = JSON.parse(readFileSync(HARNESS_FILE, "utf8"));
  } catch (e) {
    throw new HarnessError(`cannot read ${HARNESS_NAME}: ${e.message}`);
  }
  const problems = harnessProblems(data);
  if (problems.length) throw new HarnessError(`${HARNESS_NAME}:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  cached = data;
  return data;
}

/**
 * The value of a TB_<PHASE> variable in seconds, or undefined when it is unset.
 * @throws {HarnessError} for a value that is not a number greater than 0
 */
export function variableSeconds(key, env = process.env) {
  const name = OVERRIDES[key]?.variable;
  const raw = name ? env[name] : undefined;
  if (raw === undefined || raw === "") return undefined;
  const n = raw.trim() === "" ? Number.NaN : Number(raw);
  if (!isSeconds(n)) throw new HarnessError(`${name} expects a number of seconds greater than 0, got: ${raw}`);
  return n;
}

/**
 * A timeout in milliseconds: `seconds` (the tool's option, parsed) when it is
 * given, else the phase's TB_<PHASE> variable, else the file.
 *
 * @param {string} key   a TIMEOUT_KEYS entry
 * @param {number} [seconds]  the option's value, from optionSeconds
 * @param {object} [o]
 * @param {Record<string, string | undefined>} [o.env]  the variables (default process.env)
 * @param {object} [o.harness]  the parsed file (default readHarness())
 * @throws {HarnessError}
 */
export function timeoutMs(key, seconds, { env = process.env, harness } = {}) {
  if (!TIMEOUT_KEYS.includes(key)) throw new Error(`not a timeout key: ${key}`);
  if (seconds !== undefined) return Math.round(seconds * 1000);
  const fromVariable = variableSeconds(key, env);
  if (fromVariable !== undefined) return Math.round(fromVariable * 1000);
  return Math.round((harness ?? readHarness()).timeouts[key] * 1000);
}

/**
 * Reads the file and every TB_<PHASE> variable, so that a tool with no timeout
 * options of its own refuses either's fault (exit 2) before it starts an IDE,
 * rather than inside one of its lanes.
 * @throws {HarnessError}
 */
export function checkHarness(env = process.env) {
  readHarness();
  for (const key of Object.keys(OVERRIDES)) timeoutMs(key, undefined, { env });
}

/**
 * A timeout option's value in seconds, or undefined when it was not given. The
 * first of `names` given wins; a tool refuses two of them together itself.
 *
 * @param {object} values  parseCli's values (camelCased names)
 * @param {string[]} names  the option and its aliases, without the dashes
 * @throws {CliError} for a value that is not a number greater than 0
 */
export function optionSeconds(values, names) {
  for (const name of names) {
    const camel = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (values[camel] !== undefined) return numberOption(values[camel], { option: `--${name}`, above: 0 });
  }
  return undefined;
}

/** The text of a timeout in a message: seconds, without a needless fraction. */
export const secondsText = (ms) => `${Math.round(ms) / 1000} s`;
