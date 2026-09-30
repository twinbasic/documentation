#!/usr/bin/env node
// Probes for the scanners that read twinBASIC source and the attribute
// reference, which run in test.bat:
//
//     node scripts/check_twin_parsers.mjs
//
// Exits 0 when every probe passes, 1 when one fails, 2 on a crash. It reads
// nothing from the tree: every probe is a fixed input.
//
// Each of these has shipped a silent misparse, and none says so when it
// misreads: a line read as the wrong kind is counted, generated or skipped as
// that kind. So each probe is a shape one of them once got wrong, or a
// shape the next edit could lose:
//
//   - the shared modifier list (scripts/lib/twin-declarations.mjs), through
//     all three of its scanners: census_attributes.mjs's declarationKind,
//     twin-api.mjs's parseTwin and tb-fences.mjs's classify. A word missing
//     from the list makes the keyword after it invisible to every one of them.
//   - declarationKind, the kind the attribute census files a declaration
//     under.
//   - parseTargets (scripts/lib/attributes-doc.mjs), which turns an
//     `Applicable to:` line into gen_attribute_probes.mjs's targets.

import { parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { parseTargets } from "./lib/attributes-doc.mjs";
import { createProbes, exitOnCrash } from "./lib/gate-probes.mjs";
import { classify } from "./lib/tb-fences.mjs";
import { parseTwin } from "./lib/twin-api.mjs";
import { MODIFIERS, declarationKind } from "./lib/twin-declarations.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_twin_parsers.mjs [-h, --help]

Runs the probes of the scanners that read twinBASIC source and the attribute
reference, each a shape one of them once misread.

  -h, --help  print this text and exit`;

if (withUsageError(() => parseCli(process.argv.slice(2), {
  options: { help: { type: "boolean", short: "h" } },
  stopAt: ["help"],
})).values.help) printHelpAndExit(USAGE);

const { check, report } = createProbes("check_twin_parsers");
const show = (x) => JSON.stringify(x);

// ------------------------------------------------------- the modifier list

// `Overridable` is the word the census's own list lacked while the other two
// had it; the rest are there so that no word can leave the list unnoticed.
for (const word of ["Overridable", ...MODIFIERS.split("|").filter((w) => w !== "Overridable")]) {
  const line = `Public ${word} Sub Foo()`;
  const kind = declarationKind(line, "Class");
  check(`census: ${line}`, kind === "Sub", `read as ${kind}`);

  const { types, problems } = parseTwin(`Interface IFoo\n    ${line}\nEnd Interface\n`);
  const member = types[0]?.members.find((m) => m.name === "Foo");
  check(`twin-api: ${line}`, problems.length === 0 && member?.kind === "sub", show({ problems, member }));

  const { slot, reason } = classify(`${line}\nEnd Sub\n`);
  check(`tb-fences: ${line}`, slot === "module", show({ slot, reason }));
}

// ---------------------------------------------------------- declarationKind

for (const [decl, container, want] of [
  ["Public Function Foo() As Long", "Module", "Function"],
  ["Property Get Item() As Long", "Class", "Property"],
  ["Public Event Changed()", "Class", "Event"],
  ["Private Class Inner", "Module", "Class"],
  ["CoClass Foo", "(file)", "CoClass"],
  ["Implements IFoo", "Class", "Implements"],
  ["Public Declare PtrSafe Function Beep Lib \"kernel32\" () As Long", "Module", "Declare"],
  ["Public DeclareWide PtrSafe Function Beep Lib \"kernel32\" () As Long", "Module", "DeclareWide"],
  ["Public declarewide Function Beep Lib \"kernel32\" () As Long", "Module", "DeclareWide"],
  // An inline block comment before the keyword is removed, not a reason to
  // give up on the line: giving up lost 14 Interface members to the census.
  ["/* voffset &H00A8*/ Property Get X() As Long", "Interface", "Property"],
  ["Red = 1", "Enum", "EnumMember"],
  ["Width As Long", "Type", "TypeMember"],
  ["Width As Long", "Union", "TypeMember"],
  // A Const is not a variable: Attributes.md states the two as different
  // targets, and [DllExport] is documented on one and refused on the other.
  ["Private Const Answer As Long = 42", "Module", "Const"],
  ["Const Answer = 42", "Module", "Const"],
  ["Public Count As Long", "Class", "Variable"],
  ["Dim Count As Long", "Module", "Variable"],
  ["Private WithEvents Source As Foo", "Class", "Variable"],
  ["End Sub", "Class", null],
]) {
  const got = declarationKind(decl, container);
  check(`declarationKind: ${decl} in ${container} is ${want}`, got === want, `got ${got}`);
}

// ------------------------------------------------------------- parseTargets

for (const [app, want] of [
  ["procedure in a Class", ["PROC_CLASS"]],
  // Matched whole before the split, or "variables" alone probes a MODULE
  // variable -- the opposite of what the line says.
  ["variables and procedures in a Class", ["VAR_CLASS", "PROC_CLASS"]],
  // ...but only a phrase that spans the split is matched whole, or the line's
  // other targets are thrown away.
  ["Class, Module, procedure", ["CLASS", "MODULE", "PROC_MODULE"]],
  ["function in a module, returning a Boolean", ["FUNC_MODULE_BOOL"]],
  ["procedure in a Class or Module", ["PROC_CLASS", "PROC_MODULE"]],
  // The plural, and the full stop the line ends with.
  ["constants in a module.", ["CONST"]],
  ["prototype in an Interface", ["PROC_INTERFACE"]],
  ["Interface declaration within a CoClass", ["COCLASS_INTERFACE"]],
  ["Enum, and an Enum member", ["ENUM", "ENUM_MEMBER"]],
  ["variable in a Class", ["VAR_CLASS"]],
  ["variables", ["VAR_MODULE"]],
  ["something no rule reads", []],
]) {
  const got = parseTargets(app);
  check(`parseTargets: ${app}`, show(got) === show(want), `got ${show(got)}`);
}

process.exit(report());
