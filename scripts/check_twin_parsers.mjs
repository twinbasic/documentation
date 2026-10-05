#!/usr/bin/env node
// Probes for the scanners that read twinBASIC source and the attribute
// reference, which run in test.bat:
//
//     node scripts/check_twin_parsers.mjs
//
// Exits 0 when every probe passes, 1 when one fails, 2 on a refused command line or a
// crash. It reads
// nothing from the tree: every probe is a fixed input.
//
// Each of these can misparse silently, and none says so when it
// misreads: a line read as the wrong kind is counted, generated or skipped as
// that kind. So each probe is a shape one of them can get wrong, or a
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
//   - wrapProbe (scripts/lib/tb-probe.mjs), which moves a tbrun probe's
//     [RunAfterBuild] to a wrapper; a Sub it wraps wrongly runs the wrong code,
//     one it misses loses tbrun's check that the probe returned, and a wrapper
//     that does not set TbRun's flag sends TbRun.Out's lines past the console.
//   - sentinelIndex (the same module), which reads that check from the console;
//     a line the IDE prints after a return must not read as the probe ending.

import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { parseTargets } from "./lib/attributes-doc.mjs";
import { createProbes } from "./lib/gate-probes.mjs";
import { classify } from "./lib/tb-fences.mjs";
import { IDE_FLAG, SENTINEL, sentinelIndex, TBRUN_FILE, WRAPPER_SUB, wrapProbe } from "./lib/tb-probe.mjs";
import { parseTwin } from "./lib/twin-api.mjs";
import { MODIFIERS, declarationKind } from "./lib/twin-declarations.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_twin_parsers.mjs [-h, --help]

Runs the probes of the scanners that read twinBASIC source and the attribute
reference, each a shape one of them once misread.

  -h, --help  print this text and exit

Exit codes:
  0  every probe passed
  1  a probe failed
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
  ['Public Declare PtrSafe Function Beep Lib "kernel32" () As Long', "Module", "Declare"],
  ['Public DeclareWide PtrSafe Function Beep Lib "kernel32" () As Long', "Module", "DeclareWide"],
  ['Public declarewide Function Beep Lib "kernel32" () As Long', "Module", "DeclareWide"],
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

// ---------------------------------------------------------------- wrapProbe

// Each fixture is one file, Probe.twin; `want` is the Sub wrapped, or null for
// none. A wrapped file must keep every line where it was, and add exactly one
// [RunAfterBuild] -- the wrapper's -- inside the probe's module.
const probe = (body) => `Module Probe\n${body}\nEnd Module\n`;
for (const [what, text, want] of [
  ["a Public Sub", probe("    [RunAfterBuild]\n    Public Sub Run()\n        Debug.Cls\n    End Sub"), "Run"],
  [
    "a Private Sub, CRLF",
    probe("    [RunAfterBuild]\n    Private Sub Go()\n    End Sub").replaceAll("\n", "\r\n"),
    "Go",
  ],
  ["the Sub on the attribute's line", probe("    [RunAfterBuild] Sub Go\n    End Sub"), "Go"],
  [
    "a comment and another attribute between",
    probe('    [RunAfterBuild]\n    \' why\n    [Description("x")]\n    Sub Go()\n    End Sub'),
    "Go",
  ],
  ["a commented-out attribute", probe("    ' [RunAfterBuild]\n    Sub Go()\n    End Sub"), null],
  ["a Sub with parameters", probe("    [RunAfterBuild]\n    Sub Go(ByVal n As Long)\n    End Sub"), null],
  ["a Function", probe("    [RunAfterBuild]\n    Function Go() As Long\n    End Function"), null],
  ["in a Class", "Class Probe\n    [RunAfterBuild]\n    Sub Go()\n    End Sub\nEnd Class\n", null],
  // The End Module that follows is another module's, where Go cannot be called.
  [
    "in a Class before a Module",
    "Class Probe\n    [RunAfterBuild]\n    Sub Go()\n    End Sub\nEnd Class\nModule M\nEnd Module\n",
    null,
  ],
  // The container is the last one before the attribute, not the last in the file.
  [
    "in a Module before a Class",
    `${probe("    [RunAfterBuild]\n    Sub Go()\n    End Sub")}Class C\nEnd Class\n`,
    "Go",
  ],
  [
    "two of them",
    probe("    [RunAfterBuild]\n    Sub A()\n    End Sub\n    [RunAfterBuild]\n    Sub B()\n    End Sub"),
    null,
  ],
  [
    "the second of two modules",
    `${probe("    Sub A()\n    End Sub")}Module Second\n    [RunAfterBuild]\n    Sub B()\n    End Sub\nEnd Module\n`,
    "B",
  ],
]) {
  const r = wrapProbe([{ name: "Probe.twin", text }]);
  const out = r.files.find((f) => f.name === "Probe.twin")?.text;
  const tbrun = r.files.some((f) => f.name === TBRUN_FILE);
  let ok = (r.wrapped?.sub ?? null) === want && tbrun;
  if (ok && want) {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const [before, after] = [text.split(eol), out.split(eol)];
    const attrs = after.filter((l) => /\[RunAfterBuild\]/.test(l)).length;
    const call = after.findIndex((l) => l.trim() === `Public Sub ${WRAPPER_SUB}()`);
    // The wrapper is seven lines, from its attribute to a blank line; without
    // them, the file is the probe's with its attribute blanked.
    const rest = after.filter((_, i) => i < call - 1 || i >= call + 6);
    const kept =
      rest.length === before.length &&
      before.every((l, i) => rest[i] === l || rest[i] === l.replace("[RunAfterBuild]", " ".repeat(15)));
    const endModule = after.findIndex((l, i) => i > call && /^End Module/.test(l));
    ok =
      kept &&
      attrs === 1 &&
      after[call + 1].trim() === `TbRun.${IDE_FLAG} = True` &&
      after[call + 2].trim() === want &&
      after[call + 3].trim() === `Debug.Print "${SENTINEL}"` &&
      endModule > call &&
      !after.slice(0, call).some((l) => l.includes(WRAPPER_SUB));
  }
  check(`wrapProbe: ${what}`, ok, show({ wrapped: r.wrapped, why: r.why, tbrun, out }));
}
check(
  "wrapProbe: a tree with its own Module TbRun gets no second one",
  !wrapProbe([{ name: "Mine.twin", text: "Module TbRun\nEnd Module\n" }]).files.some((f) => f.name === TBRUN_FILE),
  "",
);
{
  // Nor a wrapper that sets a flag the tree's own module may not have.
  const r = wrapProbe([
    { name: "Mine.twin", text: "Module TbRun\nEnd Module\n" },
    { name: "Probe.twin", text: probe("    [RunAfterBuild]\n    Sub Go()\n    End Sub") },
  ]);
  const after = r.files.find((f) => f.name === "Probe.twin")?.text.split("\n") ?? [];
  const call = after.findIndex((l) => l.trim() === `Public Sub ${WRAPPER_SUB}()`);
  check(
    "wrapProbe: a tree with its own Module TbRun gets a wrapper that sets no flag",
    r.wrapped?.sub === "Go" && call >= 0 && after[call + 1].trim() === "Go" && !after.some((l) => l.includes(IDE_FLAG)),
    show({ wrapped: r.wrapped, why: r.why, out: after.join("\n") }),
  );
}

// A Sub or Function named like the hook's module, in that module: `clash` is its
// name as written, and tbrun refuses the probe (BETA 997: the hook does not run).
const hook = "    [RunAfterBuild]\n    Sub Go()\n    End Sub";
const named = (text, files = []) => wrapProbe([...files, { name: "Probe.twin", text }]);
for (const [what, text, want, files] of [
  ["a Sub of the module's name", probe(`${hook}\n    Sub Probe()\n    End Sub`), "Probe"],
  [
    "a Private Function of the module's name",
    probe(`${hook}\n    Private Function Probe() As Long\n    End Function`),
    "Probe",
  ],
  ["the name in another letter case", probe(`${hook}\n    Public Sub PROBE()\n    End Sub`), "PROBE"],
  ["a procedure before the hook", probe(`    Friend Sub probe()\n    End Sub\n${hook}`), "probe"],
  ["a Sub that only starts with the module's name", probe(`${hook}\n    Sub ProbeHelper()\n    End Sub`), undefined],
  ["a Sub that ends with the module's name", probe(`${hook}\n    Sub MyProbe()\n    End Sub`), undefined],
  ["a comment line holding Sub Probe", probe(`${hook}\n    ' Sub Probe()\n    Sub Other()\n    End Sub`), undefined],
  [
    "the same name in another module of the file",
    `${probe(hook)}Module Other\n    Sub Probe()\n    End Sub\nEnd Module\n`,
    undefined,
  ],
  [
    "the same name in another module before it",
    `Module Other\n    Sub Probe()\n    End Sub\nEnd Module\n${probe(hook)}`,
    undefined,
  ],
  [
    "the same name in another file",
    probe(hook),
    undefined,
    [{ name: "Other.twin", text: "Module Other\n    Sub Probe()\n    End Sub\nEnd Module\n" }],
  ],
]) {
  const r = named(text, files);
  check(
    `wrapProbe: clash, ${what}`,
    r.wrapped?.sub === "Go" && r.wrapped.clash === want,
    show({ wrapped: r.wrapped, why: r.why }),
  );
}

// ---------------------------------------------------------------- sentinelIndex
// What tbrun reads to tell a probe that returned from one that ended first.
const WAITING = "[DEBUGGER] Waiting for remaining forms to close...";
for (const [what, lines, want] of [
  ["the sentinel last", ["a", SENTINEL], 1],
  ["a form left loaded", ["a", SENTINEL, WAITING], 1],
  ["nothing printed before it", [SENTINEL, WAITING], 0],
  ["no sentinel", ["a", WAITING], -1],
  ["the probe's own line after it", ["a", SENTINEL, "b"], -1],
  ["an IDE line other than the wait", [SENTINEL, "[DEBUGGER] closed file #1"], -1],
  ["the wait line, prefixed", [SENTINEL, `x${WAITING}`], -1],
  ["an empty console", [], -1],
]) {
  const got = sentinelIndex(lines);
  check(`sentinelIndex: ${what}`, got === want, `got ${got}, want ${want}`);
}

process.exit(report());
