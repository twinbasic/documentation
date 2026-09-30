#!/usr/bin/env node
// Probes for the logic of the attribute sweep, which run in test.bat:
//
//     node scripts/check_attribute_sweep.mjs
//
// Exits 0 when every probe passes, 1 when one fails, 2 on a refused command line or a
// crash. It starts no IDE and reads nothing from the tree: every probe is a fixed
// input, so it runs without a twinBASIC install.
//
// scripts/sweep_attributes.mjs builds every attribute at every declaration site
// and reports what the compiler accepted, and none of its failures announces
// itself. A site skeleton that is wrong reads as "every attribute is refused
// here"; a control the classifier ignores reads as a recognised attribute; a
// refusal taken for an acceptance is published as a finding about the compiler.
// The IDE is what is slow and what cannot run here, so the parts that decide
// what an answer MEANS are in scripts/lib/attribute-sweep.mjs and
// scripts/lib/attribute-sites.mjs, and these probe them. Each is a shape the
// tool can get wrong, or one the next edit could lose:
//
//   - the site skeletons: what renders, where the attribute goes, that a name
//     is unique to its probe, that a `$&` in an attribute is not read as a
//     replacement pattern, and that every site is in a family or is listed here
//     as being in none.
//   - classify and signature, the reading of a probe's diagnostics: the order
//     the two refusals win in, what counts as accepted, the errors a skeleton
//     draws by itself, and the control's fold.
//   - sortRows, which files the compiler's rows under the probe they belong to.
//   - the argument shapes each name is tried in, and the batches: every probe once,
//     and no batch holding two of an attribute the compiler allows once per project.
//   - aggregate and formDependence, which turn probes into a cell per site and
//     must not let a form nobody built, or `(False)`, decide it.
//   - targetsOf and compare, which read an `Applicable to:` line and lay it
//     against the cells, and the lines of the page as they read today.
//   - the isolating runner, against a fake in place of the IDE: a crash that
//     names its probe, one that names an innocent one and one that needs two
//     together; a hang, with the canaries rebuilt alone at the top; a disturbed
//     canary; a stray error row; a build that could not run; and each cap.
//   - the preflight's verdicts, and the comparison `--verify` makes.

import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { NOT_FAITHFULLY_PROBEABLE, UNSYNTHESISABLE, pad } from "./lib/attribute-probe-kit.mjs";
import {
  FAMILIES, OPTIONAL_SITES, SITE_IDS, SITE_LIST, attributeLine, renderSite,
} from "./lib/attribute-sites.mjs";
import {
  CONTROL_NAME, EXPECTED_CANARIES, FAITHFUL_SITES, MAX_HARNESS_FAILURES, MAX_HUNG_PROBES, MAX_INTERFERING_PROBES,
  MAX_STRAY_PROBES, SINGLETON_NAMES, aggregate, argsOf, canaryOk, classify, compare, createRunner, formDependence,
  judgePreflight, makeBatches, parseTokenRun, rng, signature, singletonKey, sortRows, stage1Forms, stage2Forms,
  targetsOf, verifyMismatches,
} from "./lib/attribute-sweep.mjs";
import { createProbes } from "./lib/gate-probes.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_attribute_sweep.mjs [-h, --help]

Runs the probes of the attribute sweep's logic: its site skeletons, how it reads a
probe's diagnostics, batches probes, and compares the answers with Attributes.md.
No IDE and no tree.

  -h, --help  print this text and exit

Exit codes:
  0  every probe passed
  1  a probe failed
  2  the gate could not run: a refused command line, or a crash`;

if (withUsageError(() => parseCli(process.argv.slice(2), {
  options: { help: { type: "boolean", short: "h" } },
  stopAt: ["help"],
})).values.help) printHelpAndExit(USAGE);

const { check, report } = createProbes("check_attribute_sweep");
const show = (x) => JSON.stringify(x);
const same = (a, b) => show(a) === show(b);

const siteOf = (id) => {
  const s = SITE_LIST.find((x) => x.id === id);
  if (!s) throw new Error(`no site ${id}`);
  return s;
};
const probe = (kind, siteId, name, form = "bare", id = 1) => ({
  id, kind, name, site: siteOf(siteId), form, attr: name === null ? null : `[${name}]`, tag: `S${pad(id, 6)}`,
});
const err = (message, line = 1) => ({ severity: "ERROR", line, col: 1, message });
const warn = (message, line = 1) => ({ severity: "WARNING", line, col: 1, message });

// ------------------------------------------------------------------- sites
check("sites: ids are unique", new Set(SITE_LIST.map((s) => s.id)).size === SITE_LIST.length && SITE_IDS.size === SITE_LIST.length,
  `${SITE_LIST.length} sites, ${SITE_IDS.size} ids`);

// One probe per property, over every site, naming the sites that fail it: a
// probe per site and property is three hundred lines of output.
{
  const ATTR = "[Q$&Z]"; // `$&` is a replacement pattern to a string replace
  const failing = (holds) => SITE_LIST.filter((s) => !holds(s)).map((s) => s.id);
  const verdict = (bad) => bad.length === 0;

  let bad = failing((s) => {
    const one = renderSite(s, "S000001", ATTR);
    return !one.includes("${") && one.split(ATTR).length === 2;
  });
  check("sites: no placeholder is left and the attribute is written once, as given, even with `$&` in it", verdict(bad), show(bad));

  bad = failing((s) => {
    const line = attributeLine(s, "S000001");
    return line >= 1 && renderSite(s, "S000001", ATTR).split("\n")[line - 1]?.includes(ATTR);
  });
  check("sites: attributeLine names the line that holds the attribute", verdict(bad), show(bad));

  bad = failing((s) => {
    const withAttr = renderSite(s, "S000001", ATTR).split("\n").length;
    const without = renderSite(s, "S000001", null);
    return without.split("\n").length === withAttr - (s.inline ? 0 : 1) && !without.includes("${");
  });
  check("sites: an inline site keeps its line count without the attribute, and a whole-line one loses one", verdict(bad), show(bad));

  bad = failing((s) => {
    const ids1 = new Set(renderSite(s, "S000001", ATTR).match(/S\d{6}\w*/g) ?? []);
    const ids2 = new Set(renderSite(s, "S000002", ATTR).match(/S\d{6}\w*/g) ?? []);
    return ids1.size > 0 && [...ids1].every((n) => !ids2.has(n));
  });
  check("sites: every name a skeleton declares is its probe's own, so no two probes collide", verdict(bad), show(bad));

  bad = failing((s) => !/\bProbe(Const|Var)?\b/.test(renderSite(s, "S000001", ATTR)));
  check("sites: no member is called Probe, which every probe would then declare", verdict(bad), show(bad));

  bad = failing((s) => renderSite(s, "S000001", ATTR).endsWith("\n") && !renderSite(s, "S000001", null).includes("@@"));
  check("sites: a skeleton ends in a newline and leaves no marker behind", verdict(bad), show(bad));
}

const inFamily = new Set(Object.values(FAMILIES).flat());
check("families: name only sites that exist", Object.values(FAMILIES).flat().every((id) => SITE_IDS.has(id)),
  show(Object.values(FAMILIES).flat().filter((id) => !SITE_IDS.has(id))));
check("families: OPTIONAL_SITES names only sites that exist", [...OPTIONAL_SITES].every((id) => SITE_IDS.has(id)),
  show([...OPTIONAL_SITES].filter((id) => !SITE_IDS.has(id))));
// A site in no family is one no `Applicable to:` phrase can cover, so accepting it is
// always reported as undocumented. That is right for these and a decision for a new
// site, which is what this list is for.
const NO_FAMILY = ["DELEGATE", "TYPE_FIELD", "TYPE_FIELD_LINE", "CONST_CLASS", "VAR_LOCAL", "INHERITS"];
check("families: the sites in no family are the ones decided", same(SITE_LIST.map((s) => s.id).filter((id) => !inFamily.has(id)), NO_FAMILY),
  show(SITE_LIST.map((s) => s.id).filter((id) => !inFamily.has(id))));
check("sites: an Enum member has no inline site, which the compiler refuses for every attribute",
  !SITE_IDS.has("ENUM_MEMBER_LINE") && SITE_LIST.find((s) => s.id === "ENUM_MEMBER")?.inline === false);
check("sites: ENUM_EMPTY declares the one error an empty Enum draws by itself",
  same([...siteOf("ENUM_EMPTY").baselineCodes], ["TB5233"]));

// ---------------------------------------------------------- classification
const controlSigs = new Map([["MODULE", signature(["TB5079"], ["TB5079 Unrecognized symbol 'ZzNoSuchAttributeProbe'"], CONTROL_NAME)]]);
const stateOf = (p, rows, sigs = controlSigs) => classify(p, rows, sigs).state;
const attrProbe = (siteId = "MODULE", name = "Hidden") => probe("attr", siteId, name);

for (const [what, rows, want] of [
  ["no rows", [], "ACCEPT"],
  ["a warning only", [warn("TB0013 advice")], "ACCEPT"],
  ["TB5155 is a refusal for context", [err("TB5155 This attribute is not supported in this context")], "REJECT_CONTEXT"],
  ["TB5182 is a refusal as unknown", [err("TB5182 Syntax error. No handler for this symbol")], "REJECT_SYNTAX"],
  ["TB5155 wins over TB5182 in one file", [err("TB5182 x"), err("TB5155 y")], "REJECT_CONTEXT"],
  ["TB5114, a second [RunAfterBuild], means it was placed", [err("TB5114 only one")], "ACCEPT_LATER"],
  ["TB5247, a form designer lookup, means it was placed", [err("TB5247 no designer")], "ACCEPT_LATER"],
  ["TB5114 beside another error is not only a later error", [err("TB5114 a", 3), err("TB5000 b", 3)], "ACCEPT_ERR"],
  ["another error on the attribute's own line is recognised", [err("TB5163 Expected String arguments", 1)], "RECOGNISED"],
  ["another error elsewhere in the file is the declaration's", [err("TB5000 Missing implementation", 3)], "ACCEPT_ERR"],
]) {
  check(`classify: ${what}`, stateOf(attrProbe(), rows) === want, `got ${stateOf(attrProbe(), rows)}, want ${want}`);
}

check("classify: an error a skeleton draws with no attribute is not the attribute's",
  stateOf(probe("attr", "ENUM_EMPTY", "PopulateFrom", "fixed"), [err("TB5233 Enum has no defined members", 3)]) === "ACCEPT");
check("classify: that error beside a refusal is still the refusal",
  stateOf(probe("attr", "ENUM_EMPTY", "ClassId"), [err("TB5233 x", 3), err("TB5182 y")]) === "REJECT_SYNTAX");
check("classify: the same error at a site that does not declare it is not forgiven",
  stateOf(probe("attr", "MODULE", "Hidden"), [err("TB5233 x", 3)]) === "ACCEPT_ERR");

const drawn = [err("TB5079 Unrecognized symbol 'On'", 1)];
check("classify: what the control draws is a refusal, whatever the code, for a name that is not the control's",
  stateOf(probe("attr", "MODULE", "On"), drawn) === "REJECT_SYNTAX");
check("classify: without that control the same rows read as recognised, so the fold is what decides it",
  stateOf(probe("attr", "MODULE", "On"), drawn, new Map()) === "RECOGNISED");
check("classify: the fold is per site",
  stateOf(probe("attr", "CLASS", "On"), drawn) === "RECOGNISED");
check("classify: a different code from the control's is not folded",
  stateOf(probe("attr", "MODULE", "On"), [err("TB5073 Unable to disambiguate 'On'", 1)]) === "RECOGNISED");
check("classify: a probe of the tool's own kind is never folded",
  stateOf(probe("control", "MODULE", CONTROL_NAME), [err("TB5079 Unrecognized symbol 'ZzNoSuchAttributeProbe'", 1)]) === "RECOGNISED");
check("classify: a verify probe is read as an attribute probe",
  stateOf(probe("verify", "MODULE", "On"), drawn) === "REJECT_SYNTAX");
check("classify: TB5155 is never folded into anything else",
  stateOf(probe("attr", "MODULE", "On"), [err("TB5155 x")]) === "REJECT_CONTEXT");

// ---------------------------------------------------------------- signature
check("signature: the name goes as a whole word in any case",
  signature([], ["symbol 'on'", "Only one 'On'"], "On") === "|Only one '@';symbol '@'", signature([], ["symbol 'on'", "Only one 'On'"], "On"));
check("signature: a name with a regex operator in it is matched literally",
  signature([], ["symbol 'a.b'", "aXb"], "a.b") === "|aXb;symbol '@'", signature([], ["symbol 'a.b'", "aXb"], "a.b"));
check("signature: a probe's generated names are the same whichever probe it is",
  signature(["TB5000"], ["Missing S000062_U.Ping and S000062_m"], "X") === signature(["TB5000"], ["Missing S000063_U.Ping and S000063_m"], "X"));
check("signature: two codes in any order, once each, are one signature",
  signature(["TB5182", "TB5155", "TB5182"], [], "X") === signature(["TB5155", "TB5182"], [], "X"));

// ------------------------------------------------------------- the canaries
check("canaries: what they are expected to draw is accepted, and a masked refusal is not",
  canaryOk({ ...EXPECTED_CANARIES }) && !canaryOk({ ...EXPECTED_CANARIES, context: "ACCEPT" })
  && !canaryOk({ clean: "ACCEPT", context: "REJECT_CONTEXT" }));
check("canaries: the three answers differ, or one could stand for another",
  new Set(Object.values(EXPECTED_CANARIES)).size === 3);

// ---------------------------------------------------------------- sortRows
{
  const p1 = probe("attr", "MODULE", "A", "bare", 1);
  const p2 = probe("attr", "MODULE", "B", "bare", 2);
  const p3 = probe("attr", "MODULE", "C", "bare", 3);
  const files = new Map([["s000001.twin", p1], ["s000002.twin", p2], ["s000003.twin", p3]]);
  const { byFile, strays } = sortRows([
    "{ERROR} /Proj/Sources/S000001.twin [3,9]: TB5155 refused",
    "{ERROR} /Proj/Sources/S000001.twin [4,1]: TB5000 second",
    "{WARNING} C:\\Proj\\Sources\\S000002.twin [1,1]: TB0013 advice",
    "{ERROR} /Proj/Sources/_ProbeMain.twin [1,1]: TB5000 the template's own",
    "{WARNING} /Proj/Sources/_ProbeMain.twin [1,1]: TB0013 a template note",
    "{ERROR} a row of no shape",
    "{INFO} a note of no shape",
    "garbage",
  ], files, [p1, p2, p3]);
  check("sortRows: rows go under the file they name, whatever its case or separators",
    byFile.get(p1).length === 2 && byFile.get(p1)[0].line === 3 && byFile.get(p2)[0].severity === "WARNING", show([...byFile.values()]));
  check("sortRows: a probe with no rows has an empty list", same(byFile.get(p3), []));
  check("sortRows: only an ERROR that belongs to no probe is a stray", strays.length === 2 && strays.every((s) => s.startsWith("{ERROR}")), show(strays));
}

// -------------------------------------------------------------------- forms
const token = { name: "Debug", doc: null };
const documented = { name: "Description", doc: { app: "x" } };
check("forms: a token-table name is tried bare, and only bare, in smart mode", same(stage1Forms(token, "smart"), ["bare"]));
check("forms: in all mode it gets every shape", same(stage1Forms(token, "all"), ["bare", "true", "false", "str", "int"]));
check("forms: a documented name gets every shape", same(stage1Forms(documented, "smart"), ["bare", "fixed", "true", "false", "str", "int"]));
check("forms: bare mode still tries a shape known to be required", same(stage1Forms(documented, "bare"), ["bare", "fixed"]));
check("forms: an attribute with no fixed shape has none", !stage1Forms({ name: "Hidden", doc: { app: "x" } }, "smart").includes("fixed"));
check("forms: a once-per-project attribute gets two shapes, not six", same(stage1Forms({ name: "RunAfterBuild", doc: { app: "x" } }, "smart"), ["bare", "true"]));
check("forms: stage 2 for it is the one shape", same(stage2Forms({ name: "RunAfterBuild", doc: null }), ["true"]));
check("forms: stage 2 for a name with a fixed shape starts with it", stage2Forms({ name: "ClassId", doc: null })[0] === "fixed");
check("args: bare has none, the Boolean shapes are written, and a GUID is unique to its probe",
  argsOf("bare", "X", 1) === "" && argsOf("true", "X", 1) === "(True)" && argsOf("false", "X", 1) === "(False)"
  && argsOf("fixed", "ClassId", 1) !== argsOf("fixed", "ClassId", 2) && /^\("[0-9a-f-]{36}"\)$/.test(argsOf("fixed", "ClassId", 7)));
check("args: TypeHint names the enum the tool declares", argsOf("fixed", "TypeHint", 1) === "(SweepHintEnum)");

// ------------------------------------------------------------------ batches
{
  const probes = [];
  let id = 1;
  const push = (name, form, site) => probes.push({ id: id++, kind: "attr", name, form, site: { id: site }, attr: null, tag: "" });
  for (let n = 0; n < 12; n++) for (let s = 0; s < 20; s++) push(`N${n}`, "bare", `S${s}`);
  for (let s = 0; s < 20; s++) { push("RunAfterBuild", "bare", `S${s}`); push("RunAfterBuild", "true", `S${s}`); }
  for (let s = 0; s < 3; s++) { push("PopulateFrom", "fixed", `S${s}`); push("PopulateFrom", "bare", `S${s}`); }
  const batches = makeBatches(probes, 25);
  const ids = batches.flat().map((p) => p.id).sort((a, b) => a - b);
  check("batches: every probe is in exactly one", ids.length === probes.length && ids.every((v, i) => v === i + 1));
  check("batches: none is larger than asked", batches.every((b) => b.length <= 25));
  const twice = (key) => batches.some((b) => b.filter((p) => singletonKey(p) === key).length > 1);
  check("batches: no batch holds two of an attribute the compiler allows once", !twice("RunAfterBuild"));
  check("batches: nor two of PopulateFrom's working form", !twice("PopulateFrom"));
  check("batches: the same probes make the same batches", same(makeBatches(probes, 25).map((b) => b.map((p) => p.id)), batches.map((b) => b.map((p) => p.id))));
  check("batches: they are shuffled, so no batch of two or more is one attribute",
    batches.every((b) => b.length < 2 || new Set(b.map((p) => p.name)).size > 1),
    show(batches.filter((b) => b.length >= 2 && new Set(b.map((p) => p.name)).size === 1).map((b) => b[0].name)));
  check("batches: a singleton set that cannot fit makes more batches, not a double",
    makeBatches(probes.filter((p) => p.name === "RunAfterBuild"), 100).length === 40);
  check("batches: singletonKey knows the two names and PopulateFrom's fixed form only",
    SINGLETON_NAMES.has("RunAfterBuild") && singletonKey({ name: "PopulateFrom", form: "fixed" }) === "PopulateFrom"
    && singletonKey({ name: "PopulateFrom", form: "bare" }) === null && singletonKey({ name: null, form: "bare" }) === null);
  const a = rng(1);
  const b = rng(1);
  check("batches: the generator is deterministic", [a(), a(), a()].join() === [b(), b(), b()].join());
}

// ------------------------------------------------------ aggregate and forms
{
  const mk = (id, form, site = "S1", name = "A", kind = "attr") => ({ id, kind, name, form, site: { id: site } });
  const out = (state, codes = []) => ({ state, codes, msgs: [] });
  const cell = (probes, outcomes) => aggregate(probes, new Map(outcomes)).get("A")?.get("S1");

  check("aggregate: the best form decides", cell([mk(1, "bare"), mk(2, "true")], [[1, out("REJECT_CONTEXT")], [2, out("ACCEPT")]]).state === "ACCEPT");
  check("aggregate: a soft answer beats a refusal",
    cell([mk(1, "bare"), mk(2, "true")], [[1, out("REJECT_SYNTAX")], [2, out("ACCEPT_ERR")]]).state === "ACCEPT_ERR");
  check("aggregate: (False) is not part of the answer",
    cell([mk(1, "bare"), mk(2, "false")], [[1, out("REJECT_CONTEXT")], [2, out("ACCEPT")]]).state === "REJECT_CONTEXT");
  check("aggregate: a cell only (False) was built for has no answer",
    cell([mk(1, "bare"), mk(2, "false")], [[2, out("ACCEPT")]]).state === "HARNESS");
  check("aggregate: a refusal beside a form nobody built cannot stand",
    cell([mk(1, "bare"), mk(2, "true")], [[1, out("REJECT_CONTEXT")]]).state === "HARNESS");
  check("aggregate: a refusal beside a form whose build failed cannot stand",
    cell([mk(1, "bare"), mk(2, "true")], [[1, out("REJECT_SYNTAX")], [2, out("HARNESS")]]).state === "HARNESS");
  check("aggregate: an acceptance beside a form nobody built stands",
    cell([mk(1, "bare"), mk(2, "true")], [[1, out("ACCEPT")]]).state === "ACCEPT");
  check("aggregate: a missing (False) does not make a refusal pending",
    cell([mk(1, "bare"), mk(2, "false")], [[1, out("REJECT_SYNTAX")]]).state === "REJECT_SYNTAX");
  check("aggregate: only an attribute probe is aggregated",
    aggregate([mk(1, "bare", "S1", "A", "baseline"), mk(2, "bare", "S1", "B", "control")], new Map()).size === 0);
  check("aggregate: the forms and codes are kept",
    same(Object.keys(cell([mk(1, "bare"), mk(2, "true")], [[1, out("REJECT_CONTEXT", ["TB5155"])], [2, out("REJECT_CONTEXT")]]).forms), ["bare", "true"]));

  const dep = formDependence(aggregate([mk(1, "bare"), mk(2, "true"), mk(3, "bare", "S2"), mk(4, "true", "S2")],
    new Map([[1, out("REJECT_CONTEXT")], [2, out("ACCEPT")], [3, out("ACCEPT")], [4, out("ACCEPT")]])));
  check("formDependence: a shape that changes the placement answer is listed, and cells with several shapes counted",
    dep.list.length === 1 && dep.list[0].site === "S1" && same(dep.list[0].takes, ["true"]) && dep.multi === 2, show(dep));
  const noFalse = formDependence(aggregate([mk(1, "bare"), mk(2, "false")], new Map([[1, out("REJECT_CONTEXT")], [2, out("ACCEPT")]])));
  check("formDependence: (False) is left out of it, and does not make a cell multi-shape",
    noFalse.list.length === 0 && noFalse.multi === 0, show(noFalse));
}

// ---------------------------------------------------------------- targetsOf
for (const [app, want] of [
  ["Class, Module, procedure", ["CLASS", "MODULE", "PROC_ANY"]],
  ["procedures and constants in a module.", ["PROC_MODULE", "CONST"]],
  ["Declare (API declaration) and constants, in a Module", ["DECLARE", "CONST"]],
  ["an Implements ... Via statement in a Class", ["IMPLEMENTS_VIA"]],
  ["procedure in a Class or Interface", ["PROC_CLASS", "PROC_INTERFACE"]],
  ["procedure in a Class or Module", ["PROC_CLASS", "PROC_MODULE"]],
  ["procedure parameters", ["PARAM"]],
  ["procedure definitions", ["PROC_ANY"]],
  ["Function in a Module, returning a Boolean", ["FUNC_MODULE_BOOL"]],
  ["Interface in a Library", ["LIBRARY_INTERFACE"]],
  ["Library", []],
  ["variables in a Class", ["VAR_CLASS"]],
  ["Class, CoClass", ["CLASS", "COCLASS"]],
  [null, []],
  ["", []],
]) {
  check(`targetsOf: ${show(app)}`, same(targetsOf(app), want), `got ${show(targetsOf(app))}`);
}

// ------------------------------------------------------------------ compare
{
  const cells = (o) => new Map(Object.entries(o).map(([site, state]) => [site, { state }]));
  const cmp = (name, app, o) => compare({ name, doc: { app } }, cells(o));

  let c = cmp("X", "Class", { CLASS: "ACCEPT" });
  check("compare: a documented target the compiler accepts is nothing to report",
    !c.missing.length && !c.partial.length && !c.extra.length && !c.untestable.length, show(c));
  c = cmp("X", "Class", { CLASS: "REJECT_SYNTAX" });
  check("compare: a documented target refused everywhere is missing", c.missing.length === 1 && c.missing[0].target === "CLASS", show(c));
  c = cmp("X", "Class", { CLASS: "ACCEPT", INTERFACE: "ACCEPT" });
  check("compare: an accepted site the line does not name is extra", same(c.extra, ["INTERFACE"]), show(c));
  c = cmp("X", "Class", { CLASS: "ACCEPT", INTERFACE: "ACCEPT_ERR" });
  check("compare: an ACCEPT_ERR site is recognised, not accepted", !c.extra.length && same(c.extraSoft, ["INTERFACE"]), show(c));
  c = cmp("X", "Class", { CLASS: "REJECT_SYNTAX", CLASS_PRIVATE: "RECOGNISED" });
  check("compare: a refused target says where it was recognised with an error", same(c.missing[0].soft, ["CLASS_PRIVATE"]), show(c));

  c = cmp("X", "procedure in a Class", {
    PROC_CLASS: "ACCEPT", FUNC_CLASS: "REJECT_SYNTAX", PROPGET_CLASS: "ACCEPT",
    PROPLET_CLASS: "REJECT_SYNTAX", CLASS_INITIALIZE: "REJECT_SYNTAX",
  });
  check("compare: a target that holds for some sites is partial, naming the required ones it fails",
    c.partial.length === 1 && same(c.partial[0].no, ["FUNC_CLASS"]) && !c.missing.length, show(c));
  c = cmp("X", "procedure in a Class", { PROC_CLASS: "ACCEPT", FUNC_CLASS: "ACCEPT", PROPLET_CLASS: "REJECT_SYNTAX", CLASS_INITIALIZE: "REJECT_SYNTAX" });
  check("compare: an optional site refused is not a qualification the page owes", !c.partial.length, show(c));

  // The two regressions the review found: the wrong PROC_ANY, and a Declare in a class.
  c = cmp("DllExport", "procedures and constants in a module.", {
    SUB_MODULE: "ACCEPT", SUB_MODULE_PRIVATE: "ACCEPT", FUNC_MODULE: "ACCEPT", FUNC_MODULE_BOOL: "ACCEPT",
    PROPGET_MODULE: "ACCEPT", CONST: "ACCEPT", CONST_PRIVATE: "ACCEPT",
    PROC_CLASS: "REJECT_SYNTAX", FUNC_CLASS: "REJECT_SYNTAX", DECLARE: "REJECT_CONTEXT",
  });
  check("compare: procedures in a module are not asked to hold in a class",
    !c.missing.length && !c.partial.length && !c.extra.length, show(c));
  const comExport = {
    DECLARE: "ACCEPT", DECLARE_SUB: "ACCEPT", DECLARE_PRIVATE: "ACCEPT", DECLARE_PTRSAFE: "ACCEPT", DECLARE_WIDE: "ACCEPT",
    DECLARE_CLASS: "REJECT_SYNTAX", CONST: "ACCEPT", CONST_PRIVATE: "ACCEPT", CONST_CLASS: "REJECT_SYNTAX",
    SUB_MODULE: "REJECT_CONTEXT",
  };
  c = cmp("ComExport", "Declare (API declaration) and constants, in a Module", comExport);
  check("compare: a Declare in a module does not owe one in a class",
    !c.missing.length && !c.partial.length && !c.extra.length && !c.untestable.length, show(c));
  c = cmp("ComExport", "Declare (API declaration) and constants, in a Module", { ...comExport, CONST_CLASS: "ACCEPT" });
  check("compare: a constant in a class is not covered by constants in a module", same(c.extra, ["CONST_CLASS"]), show(c));

  c = cmp("Hidden", "an Enum member", { CLASS: "ACCEPT" });
  check("compare: a target whose only site was voided is untestable, not agreeing", c.untestable.length === 1 && !c.missing.length, show(c));
  c = cmp("X", "Interface in a Library", { INTERFACE: "ACCEPT" });
  check("compare: a target no site can be written for is untestable", c.untestable.length === 1, show(c));
  c = cmp("X", "Library", {});
  check("compare: a line that yields no target is untestable, not agreeing", c.untestable.length === 1 && c.hasLine, show(c));
  c = cmp("X", "Class", { CLASS: "HARNESS" });
  check("compare: a site whose build failed is untestable, not refused", c.untestable.length === 1 && !c.missing.length, show(c));
  check("compare: an entry with no Applicable to: line says so",
    compare({ name: "X", doc: { app: null } }, cells({})).hasLine === false);
  check("compare: a name with no entry on the page is not compared", compare({ name: "X", doc: null }, cells({})) === null);

  // Enumerator is in the list and overridden: FAITHFUL_SITES gives it sites that can probe it (below).
  const unprobeable = [...Object.keys(NOT_FAITHFULLY_PROBEABLE), ...Object.keys(UNSYNTHESISABLE)].filter((n) => !FAITHFUL_SITES[n]);
  check("compare: an attribute a generic skeleton cannot probe is not compared",
    unprobeable.length > 0 && unprobeable.every((n) => compare({ name: n, doc: { app: "Class" } }, cells({ CLASS: "REJECT_SYNTAX" })).unfaithful),
    show(unprobeable));
  c = cmp("Enumerator", "procedure in a Class or Interface", {
    PROC_CLASS: "REJECT_SYNTAX", FUNC_CLASS: "REJECT_SYNTAX", FUNC_CLASS_OBJECT: "ACCEPT", FUNC_INTERFACE_OBJECT: "ACCEPT", PROC_INTERFACE: "REJECT_SYNTAX",
  });
  check("compare: Enumerator is judged only where a member can return an object",
    !c.unfaithful && !c.missing.length && !c.partial.length, show(c));
  c = cmp("RedirectToStaticImplementation", "prototype in an Interface", { PROC_INTERFACE: "ACCEPT", FUNC_INTERFACE: "REJECT_SYNTAX", PROPGET_INTERFACE: "REJECT_SYNTAX" });
  check("compare: RedirectToStaticImplementation is judged only on a Sub prototype", !c.missing.length && !c.partial.length, show(c));
}

// --------------------------------------------------------- the token table
{
  // The run is what is contiguous around the anchor: a NUL ends it at both sides, and a
  // token that is not an identifier (`9Bad`) or is repeated (`On`) is dropped from it.
  const { tokens, why } = parseTokenRun("junk\u{0}xx|On|Off|DllExport|ComExport|Good_1|On|9Bad|Zz\u{0}more|junk");
  check("token table: the identifiers of the run around the anchor, once each",
    why === null && same(tokens, ["xx", "On", "Off", "DllExport", "ComExport", "Good_1", "Zz"]), show({ tokens, why }));
  check("token table: without the anchor there is a reason and no names", parseTokenRun("no table here").tokens.length === 0 && parseTokenRun("no table here").why !== null);
}

// ---------------------------------------------- the lines of the page, as read
// Every distinct `Applicable to:` line Attributes.md carries, and the targets it
// reads to. Fixed here, not read from the page: if the page changes nothing fails,
// and if targetsOf changes, every real line is what tells.
{
  const LINES = [
    ["procedure prototype in an Interface", ["PROC_INTERFACE"]],
    ["CoClass", ["COCLASS"]],
    ["procedure", ["PROC_ANY"]],
    ["Class", ["CLASS"]],
    ["Interface", ["INTERFACE"]],
    ["Declare (API declaration) and constants, in a Module", ["DECLARE", "CONST"]],
    ["procedure definitions", ["PROC_ANY"]],
    ["Function in a Module. The compiler rejects it on a method in a Class.", ["FUNC_MODULE"]],
    ["Module, procedure in a Class or Module", ["MODULE", "PROC_CLASS", "PROC_MODULE"]],
    ["Interface declaration within a CoClass", ["COCLASS_INTERFACE"]],
    ["Event declaration in a Class", ["EVENT_CLASS"]],
    ["procedure in a Class", ["PROC_CLASS"]],
    ["Class, CoClass, Const, Declare (API declaration), Interface, Module, procedure, Type (UDT)",
      ["CLASS", "COCLASS", "CONST", "DECLARE", "INTERFACE", "MODULE", "TYPE", "PROC_ANY"]],
    ["procedure in an Interface", ["PROC_INTERFACE"]],
    ["Declare (API declaration)", ["DECLARE"]],
    ["procedures.", ["PROC_ANY"]],
    ["Enum", ["ENUM"]],
    ["procedure definition in a module.", ["PROC_MODULE"]],
    ["variables and procedures in a Class", ["VAR_CLASS", "PROC_CLASS"]],
    ["Type (UDT)", ["TYPE"]],
    ["Method in an Interface, API Declarations.", ["PROC_INTERFACE", "DECLARE"]],
    ["Function, Sub", ["FUNC_MODULE", "SUB_MODULE"]],
    ["Declare (API declaration), Module", ["DECLARE", "MODULE"]],
    ["procedure, Declare (API declaration)", ["DECLARE", "PROC_ANY"]],
    ["Module", ["MODULE"]],
    ["an Implements statement in a Class", ["IMPLEMENTS"]],
  ];
  const wrong = LINES.filter(([app, want]) => !same(targetsOf(app), want)).map(([app]) => `${app} -> ${show(targetsOf(app))}`);
  check("targetsOf: the lines of the page, each read as pinned", wrong.length === 0, wrong.join("\n"));
}

// --------------------------------------------- what a cell that is missing a form is
{
  const mk = (id, form) => ({ id, kind: "attr", name: "A", form, site: { id: "S1" } });
  const out = (state) => ({ state, codes: [], msgs: [] });
  const cellOf = (probes, outcomes) => aggregate(probes, new Map(outcomes)).get("A").get("S1");
  check("aggregate: a soft answer beside a form nobody built cannot stand either",
    cellOf([mk(1, "bare"), mk(2, "fixed")], [[1, out("RECOGNISED")]]).state === "HARNESS");
  check("aggregate: nor ACCEPT_ERR beside a form whose build failed",
    cellOf([mk(1, "bare"), mk(2, "fixed")], [[1, out("ACCEPT_ERR")], [2, out("HARNESS")]]).state === "HARNESS");
  check("aggregate: a soft answer with every form built is what it is",
    cellOf([mk(1, "bare"), mk(2, "fixed")], [[1, out("RECOGNISED")], [2, out("REJECT_SYNTAX")]]).state === "RECOGNISED");
  check("compare: so a target only a missing form could satisfy is untestable, not refused",
    (() => {
      const cells = new Map([["CLASS", cellOf([mk(1, "bare"), mk(2, "fixed")], [[1, out("RECOGNISED")]])]]);
      const c = compare({ name: "ClassId", doc: { app: "Class" } }, cells);
      return c.untestable.length === 1 && !c.missing.length;
    })());
}

// ------------------------------------------------ what a code and a message are
{
  const sigs = new Map([["MODULE", signature(["TB5079"], ["TB5079 Unrecognized symbol 'ZzNoSuchAttributeProbe'"], CONTROL_NAME)]]);
  const on = probe("attr", "MODULE", "On");
  check("classify: the same message under another code is not the control's",
    stateOf(on, [err("TB5099 Unrecognized symbol 'On'")], sigs) === "RECOGNISED");
  check("classify: the same code with another message is not the control's",
    stateOf(on, [err("TB5079 Unrecognized symbol 'On' in a call")], sigs) === "RECOGNISED");
  check("classify: a row with no code, on the attribute's line, is recognised",
    stateOf(on, [err("something went wrong")], new Map()) === "RECOGNISED");
  check("classify: a row with no code, elsewhere, is the declaration's",
    stateOf(on, [err("something went wrong", 3)], new Map()) === "ACCEPT_ERR");
  check("classify: a baseline shortcut is not taken for a row with no code",
    stateOf(probe("attr", "ENUM_EMPTY", "PopulateFrom", "fixed"), [err("something went wrong", 3)], new Map()) !== "ACCEPT");
}

// ------------------------------------------------------------ the preflight
{
  const outs = (o) => new Map(Object.entries(o).map(([id, state]) => [Number(id), { state, codes: [], msgs: [`${state} message`] }]));
  const base = (id, site) => probe("baseline", site, null, "bare", id);
  const ctrl = (id, site) => probe("control", site, CONTROL_NAME, "bare", id);
  const v = judgePreflight(
    [base(1, "MODULE"), base(2, "CLASS"), base(3, "INTERFACE"), base(4, "COCLASS")],
    [ctrl(11, "MODULE"), ctrl(12, "CLASS"), ctrl(13, "INTERFACE"), ctrl(14, "COCLASS")],
    outs({ 1: "ACCEPT", 2: "ACCEPT_ERR", 3: "CRASH", 4: "ACCEPT", 11: "REJECT_SYNTAX", 12: "REJECT_SYNTAX", 13: "REJECT_SYNTAX", 14: "ACCEPT" }));
  check("preflight: a site whose baseline does not build clean is voided, a crash included",
    v.voidSites.has("CLASS") && v.voidSites.has("INTERFACE") && !v.voidSites.has("MODULE"), show([...v.voidSites]));
  check("preflight: a site whose control compiles is voided", v.voidSites.get("COCLASS")?.includes("was accepted"), show([...v.voidSites]));
  const w = judgePreflight([base(1, "MODULE")], [ctrl(11, "MODULE")], outs({ 1: "ACCEPT", 11: "HARNESS" }));
  check("preflight: a control that could not be judged voids the site, and says so", w.voidSites.get("MODULE")?.includes("could not be judged"), show([...w.voidSites]));
  check("preflight: the control's signature and state are kept for every site",
    v.controlSig.size === 4 && v.controlState.size === 4 && v.controlSig.get("MODULE").includes("REJECT_SYNTAX message"), show([...v.controlSig]));
}

// ------------------------------------------------------------------- verify
{
  const p = (id) => probe("attr", "MODULE", "A", "bare", id);
  const first = [p(1), p(2), p(3), p(4)];
  const again = [p(11), p(12), p(13), p(14)];
  const before = new Map([[1, { state: "ACCEPT" }], [2, { state: "REJECT_SYNTAX" }], [3, { state: "ACCEPT" }], [4, { state: "REJECT_CONTEXT" }]]);
  const got = new Map([[11, { state: "ACCEPT" }], [12, { state: "ACCEPT" }], [13, { state: "HARNESS" }]]);
  const r = verifyMismatches(first, again, got, before);
  check("verify: a different answer is a mismatch", r.bad.length === 1 && r.bad[0].site === "MODULE" && r.bad[0].first === "REJECT_SYNTAX" && r.bad[0].second === "ACCEPT", show(r));
  check("verify: a rebuild that failed, or that never came back, is not a mismatch but is counted", r.unjudged === 2, show(r));
}

// -------------------------------------------------------------- the runner
{
  const fake = (id) => ({ id, kind: "attr", name: `N${id}`, form: "bare", site: siteOf("MODULE"), attr: `[N${id}]`, tag: `S${pad(id, 6)}` });
  const many = (n) => Array.from({ length: n }, (_, i) => fake(i + 1));
  const has = (probes, ...want) => want.every((id) => probes.some((p) => p.id === id));
  const ok = (probes, extra = {}) => ({ kind: "ok", byFile: new Map(probes.map((p) => [p, []])), strays: [], canaries: { ...EXPECTED_CANARIES }, ...extra });
  const runner = (rule) => {
    const built = [];
    const r = createRunner({ buildOnce: async (probes) => { built.push(probes.map((p) => p.id)); return rule(probes); }, controlSig: new Map() });
    return { ...r, built };
  };
  const stateMap = (out) => new Map([...out].map(([k, v]) => [k, v.state]));
  const onlyStates = (out, want, except) => [...stateMap(out)].every(([k, s]) => (except.includes(k) ? s === want : s === "ACCEPT"));
  const throws = async (fn, re) => { try { await fn(); return false; } catch (e) { return re.test(e.message); } };
  const lane = {};

  let R = runner((ps) => ok(ps));
  let out = await R.runSet(many(8), lane);
  check("runner: a clean batch is one build", R.stats.builds === 1 && R.stats.splits === 0 && onlyStates(out, "ACCEPT", []), show(R.built));

  R = runner((ps) => (has(ps, 5) ? { kind: "crash", named: new Set([5]) } : ok(ps)));
  out = await R.runSet(many(8), lane);
  check("runner: a crash that names its probe takes it out first: three builds, and only it is CRASH",
    R.stats.builds === 3 && onlyStates(out, "CRASH", [5]) && R.stats.crashes.length === 1 && R.stats.crashes[0].id === 5 && !R.stats.comboCrashes.length,
    show(R.built));

  R = runner((ps) => (has(ps, 11) ? { kind: "crash", named: new Set([2]) } : ok(ps)));
  out = await R.runSet(many(16), lane);
  check("runner: a crash that names an innocent probe is still found, by halving, in a handful of builds",
    onlyStates(out, "CRASH", [11]) && out.size === 16 && R.stats.builds <= 12, `${R.stats.builds} builds: ${show(R.built)}`);

  R = runner((ps) => (has(ps, 3, 12) ? { kind: "crash", named: new Set() } : ok(ps)));
  out = await R.runSet(many(16), lane);
  check("runner: a crash that needs two probes together keeps every answer and is recorded, not lost",
    R.stats.comboCrashes.length === 1 && onlyStates(out, "ACCEPT", []) && !R.stats.crashes.length, show(R.stats.comboCrashes));

  R = runner((ps) => (ps.length === 0 ? ok(ps) : has(ps, 7) ? { kind: "hung" } : ok(ps)));
  out = await R.runSet(many(8), lane);
  check("runner: a hang is isolated to its probe, and the canaries alone are rebuilt once, at the top",
    onlyStates(out, "HUNG", [7]) && R.stats.hung.length === 1 && R.built.filter((b) => b.length === 0).length === 1, show(R.built));

  R = runner(() => ({ kind: "hung" }));
  check("runner: a hang beside nothing but the canaries is the IDE's, and stops the run",
    await throws(() => R.runSet(many(8), lane), /never settles even with only the canaries/));

  R = runner((ps) => (has(ps, 4) ? ok(ps, { canaries: { ...EXPECTED_CANARIES, context: "ACCEPT" } }) : ok(ps)));
  out = await R.runSet(many(8), lane);
  check("runner: a probe that disturbs the canaries is INTERFERES, and the rest keep their answers",
    onlyStates(out, "INTERFERES", [4]) && R.stats.interferes.length === 1 && R.stats.canaryFails >= 1, show(R.built));

  R = runner((ps) => (has(ps, 4, 9) ? ok(ps, { canaries: { ...EXPECTED_CANARIES, context: "ACCEPT" } }) : ok(ps)));
  out = await R.runSet(many(16), lane);
  check("runner: canaries that fail only for two probes together are recorded, and blame neither",
    R.stats.comboCrashes.length === 1 && !R.stats.interferes.length && onlyStates(out, "ACCEPT", []), show(R.stats.comboCrashes));

  R = runner((ps) => ok(ps, { canaries: { ...EXPECTED_CANARIES, clean: "REJECT_SYNTAX" } }));
  check(`runner: more than ${MAX_INTERFERING_PROBES} interfering probes means the canaries are no check, and stops the run`,
    await throws(() => R.runSet(many(MAX_INTERFERING_PROBES + 5), lane), new RegExp(`more than ${MAX_INTERFERING_PROBES}`)));

  R = runner((ps) => (has(ps, 6) ? ok(ps, { strays: ["{ERROR} /P/Sources/_ProbeFactory.twin [1,1]: TB5000 unresolved"] }) : ok(ps)));
  out = await R.runSet(many(8), lane);
  check("runner: an error row in no probe's file is put to the one probe that causes it, as RECOGNISED",
    out.get(6).state === "RECOGNISED" && out.get(6).msgs[0].includes("unresolved") && onlyStates(out, "RECOGNISED", [6])
    && R.stats.strays.length === 1 && R.stats.strays[0].includes("[N6]"), show([...stateMap(out)]));

  R = runner((ps) => ok(ps, { strays: ["{ERROR} /P/x.twin [1,1]: TB5000 in every build"] }));
  check(`runner: more than ${MAX_STRAY_PROBES} probes each drawing a stray row means the template does, and stops the run`,
    await throws(() => R.runSet(many(MAX_STRAY_PROBES + 5), lane), new RegExp(`more than ${MAX_STRAY_PROBES}`)));

  R = runner(() => ({ kind: "harness", why: "the IDE would not start" }));
  out = await R.runSet(many(6), lane);
  check("runner: a build that could not run marks its probes HARNESS, without halving, and counts as a failure",
    onlyStates(out, "HARNESS", [1, 2, 3, 4, 5, 6]) && out.failures === 1 && R.stats.builds === 1 && R.stats.harness.length === 1);
  R = runner(() => ({ kind: "harness", why: "again" }));
  check(`runner: more than ${MAX_HARNESS_FAILURES} builds that could not run stops the run`,
    await throws(async () => { for (let i = 0; i < MAX_HARNESS_FAILURES + 1; i++) await R.runSet(many(2), lane); }, new RegExp(`more than ${MAX_HARNESS_FAILURES}`)));

  R = runner((ps) => (ps.length === 0 ? ok(ps) : { kind: "hung" }));
  check(`runner: more than ${MAX_HUNG_PROBES} probes that hang means something is wrong with them all, and stops the run`,
    await throws(async () => { for (let i = 1; i <= MAX_HUNG_PROBES + 1; i++) await R.runSet([fake(i)], lane); }, new RegExp(`more than ${MAX_HUNG_PROBES}`)));
}

process.exit(report());
