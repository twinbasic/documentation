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
//   - scanText (scripts/lib/census-scan.mjs), the census's scanner: which
//     bracket groups it counts as attributes. A bracket group alone on its line
//     in an Enum body is a member, not an attribute.
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
import { scanText } from "./lib/census-scan.mjs";
import { createProbes } from "./lib/gate-probes.mjs";
import { classify } from "./lib/tb-fences.mjs";
import { IDE_FLAG, SENTINEL, sentinelIndex, TBRUN_FILE, WRAPPER_SUB, wrapProbe } from "./lib/tb-probe.mjs";
import { logicalLinesRaw, parseTwin, stripComments } from "./lib/twin-api.mjs";
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
  // A field named for a keyword is a field, not a nested declaration: the
  // keyword rule would file `Type As Long` as a Type.
  ["Type As Long", "Type", "TypeMember"],
  ["Type(3) As Byte", "Type", "TypeMember"],
  ["Union As Long", "Type", "TypeMember"],
  ["Enum As Long", "Union", "TypeMember"],
  ["Private Type Inner", "Type", "Type"],
  ["End Type", "Type", null],
  ["Type Foo", "Module", "Type"],
  // A Const is not a variable: Attributes.md states the two as different
  // targets, and [DllExport] is documented on one and refused on the other.
  ["Private Const Answer As Long = 42", "Module", "Const"],
  ["Const Answer = 42", "Module", "Const"],
  ["Public Count As Long", "Class", "Variable"],
  ["Dim Count As Long", "Module", "Variable"],
  ["Private WithEvents Source As Foo", "Class", "Variable"],
  ["End Sub", "Class", null],
  // Every character past ASCII is part of an identifier (BETA 1010): a name that
  // starts with a keyword and goes on past ASCII is not the keyword.
  ["Public Caf\u{E9} As Long", "Class", "Variable"],
  ["Public Class\u{E9} As Long", "Module", "Variable"],
  ["Class\u{E9} As Long", "Type", "TypeMember"],
  ["Gr\u{FC}n = 1", "Enum", "EnumMember"],
  ["Const Gr\u{F6}\u{DF}e = 1", "Module", "Const"],
  ["Public Sub \u{65E5}\u{672C}\u{8A9E}()", "Module", "Sub"],
]) {
  const got = declarationKind(decl, container);
  check(`declarationKind: ${decl} in ${container} is ${want}`, got === want, `got ${got}`);
}

// ----------------------------------------------------------------- scanText

// A bracket group alone on its line in an Enum body is a member (BETA 1010:
// `[Hidden]` is the member Hidden, value 0, and E.[Hidden] and E.Hidden resolve;
// `[Description("x")]` and `[NoSuchAttribute]` are members of those names, and
// `[Hidden] Red = 5` is refused, TB5182, at Red). So the census records no
// attribute for it, and the scan finds neither a problem nor a block left open.
// Each fixture is a file; `want` lists "attr container kind" for every site.
const inModule = (body) => `Public Module M\n${body}\nEnd Module\n`;
const inEnum = (body) => inModule(`    Public Enum E\n${body}\n        Red\n    End Enum`);
for (const [what, text, want] of [
  ["[Hidden] alone in an Enum", inEnum("        [Hidden]"), []],
  ["[Hidden, Restricted] alone in an Enum", inEnum("        [Hidden, Restricted]"), []],
  ['[Description("x")] alone in an Enum', inEnum('        [Description("x")]'), []],
  ["a made-up name alone in an Enum", inEnum("        [NoSuchAttribute]"), []],
  ["a leading underscore alone in an Enum", inEnum("        [_Max]"), []],
  ["stacked groups in an Enum", inEnum('        [Hidden]\n        [Description("x")]'), []],
  ["a comment after the group in an Enum", inEnum("        [Hidden] ' not an attribute"), []],
  ["a name with a space in an Enum", inEnum("        [A4 Portrait]"), []],
  // The VBCCR shape: the whole Enum is one escaped member.
  ["the only member, before End Enum", "Private Enum LongPtr\n[_]\nEnd Enum\n", []],
  // The Enum's end is still seen: the attribute below it belongs to the Module.
  [
    "an attribute after the Enum's End",
    inModule(
      "    Public Enum E\n        [Hidden]\n        Red\n    End Enum\n    [Hidden]\n    Public Sub S()\n    End Sub",
    ),
    ["Hidden Module Sub"],
  ],
  // The same groups elsewhere are attributes.
  ["[Hidden] alone before a Const", inModule("    [Hidden]\n    Public Const C As Long = 7"), ["Hidden Module Const"]],
  ["[Hidden] alone before a Sub", inModule("    [Hidden]\n    Public Sub S()\n    End Sub"), ["Hidden Module Sub"]],
  [
    "inline before a Const, as the VBA package writes them",
    inModule('    [Hidden, Restricted] Public Const utf_8 As String = "utf-8"'),
    ["Hidden Module Const", "Restricted Module Const"],
  ],
  [
    "alone in a Type, before a field",
    "Public Type T\n    [Hidden]\n    Field1 As Long\nEnd Type\n",
    ["Hidden Type TypeMember"],
  ],
]) {
  const { sites, problems } = scanText(text, "Fixture.twin", "Fixture");
  const got = sites.map((s) => `${s.attr} ${s.container} ${s.kind}`);
  check(
    `scanText: ${what}`,
    show(got) === show(want) && problems.length === 0,
    show({ sites: got, problems: problems.map((p) => p.why) }),
  );
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

// ---------------------------------------------------------------- stripComments
// The comment remover shares logicalLinesRaw's scan. What it removes, and keeps
// exactly as written: strings, `Rem` as a statement (not inside a word), block
// comments, a comment that goes on to the next line with ` _`, line endings, the BOM.
const BOM = "\u{FEFF}";
for (const [what, src, want, opts] of [
  ["a trailing ' comment goes with the space before it", "x = 1   ' note\n", "x = 1\n"],
  ["an apostrophe in a string is not a comment", "s = \"it's\" ' c\n", 's = "it\'s"\n'],
  ["an escaped quote does not end the string", 's = "a""b\'c" \' d\n', 's = "a""b\'c"\n'],
  [
    "an apostrophe in an attribute's string",
    "[Description(\"it's\")] Public Sub X() ' c\n",
    '[Description("it\'s")] Public Sub X()\n',
  ],
  ["a date literal", "d = #1/2/2000# ' c\n", "d = #1/2/2000#\n"],
  ["a comment-only line is removed", "a\n    ' c\nb\n", "a\nb\n"],
  ["keepLines leaves it empty", "a\n    ' c\nb\n", "a\n\nb\n", { keepLines: true }],
  ["Rem at the start of a line", "Rem hello\nx\n  Rem\ny\n", "x\ny\n"],
  ["Rem after a colon keeps the colon", "x = 1: Rem note\ny = 2:Rem n\n", "x = 1:\ny = 2:\n"],
  [
    "Rem in a word is code",
    "Remove x\nRemark = 1\nx.Rem = 1\nFoo Rem:=1\nz = Rem(1)\nCall Remove: Remove y\n",
    "Remove x\nRemark = 1\nx.Rem = 1\nFoo Rem:=1\nz = Rem(1)\nCall Remove: Remove y\n",
  ],
  ["a named argument is not a statement separator", "Foo a:=1 ' c\n", "Foo a:=1\n"],
  ["an inline block comment between code is one space", "a /* c */ b\na/* c */b\n", "a b\na b\n"],
  [
    "a block comment before code, with an indent",
    "    /* voffset &H00A8*/ Property Get X()\n",
    "    Property Get X()\n",
  ],
  ["a block comment at the end of code", "x = 1 /* c */\n", "x = 1\n"],
  ["two block comments on a line", "a /* x */ b /* y */ c\n", "a b c\n"],
  // The line break inside a block comment is white space to the compiler: the statement goes on.
  [
    "a block comment across lines joins the code on both sides",
    "a /* start\nmiddle ' not a new comment\nend */ b\nc\n",
    "a b\nc\n",
  ],
  ["the join in a statement", "z = Foo(1) /* a\n        b */ + 3\n", "z = Foo(1) + 3\n"],
  ["a join over several lines", "x = 1 /* a\nb\nc */ + 2\ny\n", "x = 1 + 2\ny\n"],
  ["a block comment across lines, no code after it", "x = 1 /* a\nb */\ny\n", "x = 1\ny\n"],
  ["a block comment across lines, no code before it", "    /* a\n    b */ x = 1\ny\n", "    x = 1\ny\n"],
  ["a block comment that ends on a line that opens another", "a /* 1\nb */ c /* 2\nd */ e\n", "a c e\n"],
  [
    "a block comment across lines, kept as lines",
    "a /* start\nmiddle\nend */ b\nc\n",
    "a b\n\n\nc\n",
    { keepLines: true },
  ],
  [
    "Rem after Then becomes a colon, so the If stays a single line",
    "If x = 5 Then Rem foo\nx = 7\n",
    "If x = 5 Then :\nx = 7\n",
  ],
  ["Rem after Then, continued", "If x Then Rem c _\nnext\ny\n", "If x Then :\ny\n"],
  ["Rem after ElseIf's Then", "ElseIf a Then Rem c\n", "ElseIf a Then :\n"],
  ["Rem after Else is removed", "If x Then y = 1 Else Rem c\nz\n", "If x Then y = 1 Else\nz\n"],
  [
    "Rem not after the keyword alone",
    "x.Then Rem c\nxThen Rem c\nIf x ThenRem c\n",
    "x.Then Rem c\nxThen Rem c\nIf x ThenRem c\n",
  ],
  ["a block comment alone", "/* x\ny */\nz\n", "z\n"],
  ["a comment mark inside a block comment", "a /* ' */ b\n", "a b\n"],
  ["a block mark inside a ' comment", "a ' /* c\nb\n", "a\nb\n"],
  ["a continued code line is code", "x = 1 + _\n    2 ' c\n", "x = 1 + _\n    2\n"],
  ["a ' comment ending in _ goes on", "x = 1 ' c _\ny = 2\nz = 3\n", "x = 1\nz = 3\n"],
  ["an underscore in a word does not continue", "' c_\ny = 2\n'_\nz = 3\n", "y = 2\nz = 3\n"],
  ["Rem and ' comments continue, each to the next", "Rem a _\n' b _\nc\nd\n", "d\n"],
  ["a tab or space after the underscore still continues", "' c _ \nq\nr\n' d _\t\ns\nt\n", "r\nt\n"],
  ["Rem after a colon continues", "x = 4: Rem c _\ny\nz\n", "x = 4:\nz\n"],
  ["CRLF kept", "a ' c\r\nb\r\n", "a\r\nb\r\n"],
  ["CRLF and LF kept per line", "a ' c\r\nb\nc ' d\r\n", "a\r\nb\nc\r\n"],
  ["the BOM is kept", `${BOM}' c\nx\n`, `${BOM}x\n`],
  ["no final line ending", "a ' c", "a"],
  ["a removed last line leaves the ending before it", "a\n' c", "a\n"],
  ["trailing white space without a comment stays", "a   \n", "a   \n"],
  ["no run of blank lines made by a removal", "a\n\n' c\n\nb\n", "a\n\nb\n"],
  ["a run of blank lines that was there stays", "a\n\n\nb\n", "a\n\n\nb\n"],
  ["keepLines makes no change to the blank lines", "a\n\n' c\n\nb\n", "a\n\n\n\nb\n", { keepLines: true }],
  ["no blank line at the start made by a removal", "' header\n\nx\n", "x\n"],
]) {
  const got = stripComments(src, opts).text;
  check(`stripComments: ${what}`, got === want, show({ got, want }));
}
{
  const r = stripComments("a ' x\nRem y\n/* z\nw */\nb ' c _\nd\n");
  check(
    "stripComments: counts the comments, a block once, and the lines removed",
    r.comments.map((c) => `${c.line}:${c.kind}`).join(" ") === "1:line 2:rem 3:block 5:line 6:continued" &&
      r.linesRemoved === 4,
    show(r),
  );
  check(
    "stripComments: keepLines removes no line",
    stripComments("a ' x\nRem y\n/* z\nw */\nb\n", { keepLines: true }).text.split("\n").length === 6,
    "",
  );
}
// What logicalLinesRaw reads of a text must be what it reads of the stripped text,
// for the texts where the two scans agree (no Rem after a colon, no comment
// continued): the same lines, in the same order, with the white space collapsed.
{
  const norm = (s) =>
    logicalLinesRaw(s)
      .map((l) => l.raw.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  const sample = [
    "Module M",
    "    ' a comment",
    '    Public Const S As String = "it\'s ""x"" ' + "' not a comment\" ' comment",
    "    Rem a statement",
    '    [Description("a \' b")] Public Sub P(ByVal a As Long, _',
    "        b As Long) ' trailing",
    "        /* inline */ Dim x As Long /* more */ : x = 1",
    "        /* a block",
    "           over lines */ x = 2",
    "    End Sub",
    "End Module",
    "",
  ];
  for (const eol of ["\n", "\r\n"]) {
    const src = sample.join(eol);
    const got = norm(stripComments(src).text);
    const want = norm(src);
    check(
      `stripComments: logicalLinesRaw reads the stripped text as it read the original (${JSON.stringify(eol)})`,
      show(got) === show(want),
      show({ got, want }),
    );
  }
  // The two do disagree on these, which is why a comment mark after a colon, or a
  // continued comment, is not in the sample above: the scanner has to learn them
  // before the indexer's snapshots may change.
  check(
    "logicalLinesRaw does not read Rem after a colon, or a continued comment",
    logicalLinesRaw("x = 1: Rem n\n")[0].text === "x = 1: Rem n" &&
      logicalLinesRaw("' c _\ny = 2\n").filter((l) => l.text.trim()).length === 1 &&
      logicalLinesRaw("If x Then Rem c\n")[0].text.trim() === "If x Then Rem c",
    "",
  );
  check(
    "logicalLinesRaw ends a logical line at a line break inside a block comment",
    logicalLinesRaw("z = Foo(1) /* a\nb */ + 3\n").filter((l) => l.text.trim()).length === 2,
    "",
  );
}

process.exit(report());
