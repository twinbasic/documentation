// Self-test for the symbol index: the .twin declaration scanner that
// scripts/build_package_api.mjs runs over the packages, the derivation
// builder/symbols.mjs runs over the pages, and the drift guard
// builder/symbol-baseline.mjs keeps over the URLs the index publishes.
//
//     node scripts/check_symbol_index.mjs
//
// Every probe is a fixture of its own -- a few lines of twinBASIC, a page or
// three, a scratch baseline file -- so none of it needs a build, a tree or a
// twinBASIC install, and nothing here touches builder/symbol-baseline.json.
//
// A build that indexes the reference cleanly says nothing about any of this:
// the site is one input, and the rules that did not fire on it are exactly the
// ones that stopped working unnoticed. So each rule is asserted here against
// the case that made it necessary:
//
//   - the scanner's traps, each met in the BETA 983 packages -- a Type whose
//     Subs have bodies, an Interface line inside a CoClass, `[Hidden]` on a
//     module whose members are global, a `$` name escaped in brackets, an
//     attribute on the declaration's own line, an attribute run spread over
//     continued lines;
//   - the derivation's rules -- a member on a page of its own and under a
//     heading, a member a base type declares found on the base's page, a page
//     filed under the wrong module, a `$` form, `symbols:`, a heading that
//     opens a section and must not be read as a member of the same name, the
//     typographer's ellipsis in a Core heading, and an attribute's `##`;
//   - the drift guard's refusals, which on a healthy tree it never shows.

import { readFile } from "node:fs/promises";
import { GUARDED_SRC } from "../builder/baseline.mjs";
import { checkSymbolBaseline } from "../builder/symbol-baseline.mjs";
import { deriveSymbolIndex, headingsOf, serializeSymbolIndex } from "../builder/symbols.mjs";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { baselineFixture, createProbes } from "./lib/gate-probes.mjs";
import { apiSnapshot, isPublicType, logicalLinesRaw, parseSources, parseTwin, projectNameOf } from "./lib/twin-api.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_symbol_index.mjs [-h, --help]

Checks that the symbol index still places each kind of symbol, from fixtures:
the .twin declaration scanner, the derivation from the pages and the drift guard.

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

const { check, report } = createProbes("check_symbol_index");
const show = (x) => JSON.stringify(x);

// ------------------------------------------------------------ the scanner

{
  const { types, problems } = parseTwin(
    [
      "Private Module HDCModule",
      "    Type HDC",
      "        Value As LongPtr",
      "        Private Sub Type_Assignment(ByVal RHS As LongPtr)",
      "            Me.Value = RHS",
      "        End Sub",
      "    End Type",
      "End Module",
    ].join("\n"),
  );
  const hdc = types.find((t) => t.name === "HDC");
  check(
    "a Type's Sub has a body, and its End Sub closes it",
    problems.length === 0 && hdc?.members.length === 2,
    show({ problems, members: hdc?.members }),
  );
  check("a Type inside a Private module is not public", hdc && !isPublicType(hdc, types));
}

{
  const { types, problems } = parseTwin(
    [
      "Interface _Collection",
      "    [DispId(1)]",
      "    Sub Add(ByRef Item As Variant)",
      "    [DispId(-4),Hidden,Restricted] Function _NewEnum() As stdole.IUnknown",
      "End Interface",
      '[CoClassId("A4C4671C-499F-101B-BB78-00AA00383CBB")]',
      "CoClass Collection",
      "    [Default] Interface _Collection",
      "    [Source] Interface _CollectionEvents",
      "End CoClass",
    ].join("\n"),
  );
  const co = types.find((t) => t.name === "Collection");
  const iface = types.find((t) => t.name === "_Collection");
  check(
    "an Interface line inside a CoClass is not a block",
    problems.length === 0 && types.length === 2,
    show(problems),
  );
  check(
    "a CoClass knows its default and source interfaces",
    co?.interfaces.find((i) => i.isDefault)?.name === "_Collection" &&
      co?.interfaces.find((i) => i.isSource)?.name === "_CollectionEvents",
    show(co?.interfaces),
  );
  check(
    "an attribute on the declaration's own line applies to it",
    iface?.members.find((m) => m.name === "_NewEnum")?.hidden === true &&
      iface?.members.find((m) => m.name === "Add")?.hidden === false,
    show(iface?.members),
  );
}

{
  const { types, problems } = parseTwin(
    [
      "[Hidden]",
      "Module [_HiddenModule]",
      '    [Description("Returns " & vbCrLf & _',
      '                  "a [bracketed], string")]',
      '    Public DeclareWide PtrSafe Function [Chr$] Lib "<strings>" Alias "#4" (ByVal C As Long) As String',
      '    Public DeclareWide PtrSafe Function Array Lib "<hiddenmodule>" Alias "#-30" (ParamArray A As Variant()) As Variant',
      "    Private Const Secret As Long = 1",
      "    Public Enum Paper",
      "        [A4 Portrait] = 1",
      "        Letter",
      "    End Enum",
      "End Module",
    ].join("\n"),
  );
  const mod = types.find((t) => t.kind === "module");
  check("an escaped module name is read without its brackets", mod?.name === "_HiddenModule", show(mod?.name));
  check(
    "[Hidden] on a module is recorded, and its members are still public",
    mod?.hidden === true &&
      mod.members
        .filter((m) => m.vis === "public")
        .map((m) => m.name)
        .join() === "Chr$,Array",
    show(mod?.members),
  );
  check(
    "an attribute continued over lines, with brackets and commas in its string, is one attribute",
    problems.length === 0 && mod?.members.length === 3,
    show({ problems, members: mod?.members }),
  );
  const paper = types.find((t) => t.name === "Paper");
  check(
    "an escaped enumeration value keeps its space",
    paper?.members.map((m) => m.name).join("|") === "A4 Portrait|Letter",
    show(paper?.members),
  );
}

{
  const { types } = parseTwin(
    [
      "Class CommandButtonBaseCtl",
      "    Public Default As Boolean",
      "    Public Public As Boolean = True",
      "    Public Default Property Get Caption() As String",
      "    End Property",
      "End Class",
    ].join("\n"),
  );
  const names = types[0]?.members.map((m) => `${m.name}:${m.kind}`).join() ?? "";
  check(
    "a field named after a modifier is a field, and a modifier before Property is a modifier",
    names === "Default:field,Public:field,Caption:property",
    names,
  );
}

{
  const parsed = new Map([
    [
      "VB",
      parseTwin(
        [
          "Private Interface _Clipboard Extends stdole.IUnknown",
          "    Function GetText() As String",
          "End Interface",
          "Public CoClass Clipboard",
          "    [Default] Interface _Clipboard",
          "End CoClass",
          "Private Class ButtonBase",
          "    Public Caption As String",
          "End Class",
          "Class CommandButton",
          "    Inherits ButtonBase",
          "End Class",
          "Private Module USER32",
          '    Public DeclareWide PtrSafe Function GetDC Lib "user32" (ByVal h As LongPtr) As LongPtr',
          "End Module",
        ].join("\n"),
      ).types,
    ],
  ]);
  const { packages } = apiSnapshot(parsed);
  const rec = (n) => packages.VB.find((t) => t.name === n);
  check(
    "a private interface a public CoClass is built on keeps its members",
    rec("_Clipboard")?.public === false && rec("_Clipboard")?.members?.GetText === "function",
    show(rec("_Clipboard")),
  );
  check(
    "a private class a public class inherits keeps its members",
    rec("ButtonBase")?.members?.Caption === "field",
    show(rec("ButtonBase")),
  );
  check(
    "a private module nothing exposes is kept by name, without its members",
    rec("USER32")?.public === false && rec("USER32")?.members === undefined,
    show(rec("USER32")),
  );
}

{
  const { problems } = parseTwin(
    [
      "Alias HINSTANCE As LongPtr",
      "Class Widget",
      "    Inherits BaseWidget",
      "    Implements IWidget",
      "    Public Caption As String",
      "    Public Property Get Height() As Long",
      "        #If WIN64 Then",
      "            Return 2",
      "        #Else",
      "            Return 1",
      "        #End If",
      "    End Property",
      "    Event Clicked()",
      "End Class",
    ].join("\n"),
  );
  check("a file-level Alias and a #If inside a body are not problems", problems.length === 0, show(problems));
}

{
  const { types, aliases, problems } = parseTwin(
    [
      "Alias HINSTANCE As LongPtr",
      "Alias cef_window_handle_t As LongPtr                ' HWND",
      "[Hidden] Alias HDC As HWND",
      "Module M",
      "    Alias Local As Long",
      "End Module",
      "Type T",
      "    Alias As Long",
      "End Type",
    ].join("\n"),
    "Aliases.twin",
  );
  check(
    "an Alias is recorded with its target, apart from the types",
    show(aliases.map((a) => `${a.name}=${a.target}`)) ===
      show(["HINSTANCE=LongPtr", "cef_window_handle_t=LongPtr", "HDC=HWND", "Local=Long"]) &&
      aliases.every((a) => a.kind === "alias" && a.vis === "public" && a.file === "Aliases.twin") &&
      types.map((t) => t.name).join() === "M,T" &&
      problems.length === 0,
    show({ aliases, types: types.map((t) => t.name), problems }),
  );
  check(
    "an Alias keeps its signature, its attribute, and where it is declared",
    aliases[1].signature === "Alias cef_window_handle_t As LongPtr" &&
      aliases[2].hidden === true &&
      show(aliases[2].attrs) === show([{ name: "Hidden", args: null }]) &&
      aliases[0].container === null &&
      aliases[3].container === "M",
    show(aliases),
  );
  check(
    "a field named Alias is a field, not an alias",
    show(types.find((t) => t.name === "T")?.members.map((m) => `${m.name}:${m.kind}`)) === show(["Alias:field"]),
    show(types.find((t) => t.name === "T")),
  );
}

{
  const { types, problems } = parseTwin(
    ["Public CoClass App", "    [Default] Interface _App", "    [Source] Interface _AppEvents", "End CoClass"].join(
      "\n",
    ),
  );
  const co = types[0];
  check(
    "a Public CoClass is a public coclass with its interfaces",
    problems.length === 0 &&
      co?.kind === "coclass" &&
      co.vis === "public" &&
      co.signature === "Public CoClass App" &&
      co.interfaces.map((i) => `${i.name}:${i.isDefault}:${i.isSource}`).join() ===
        "_App:true:false,_AppEvents:false:true",
    show({ problems, co }),
  );
}

{
  const { types, problems } = parseTwin(
    [
      "Public Type Keywords",
      "    Type As Long",
      "    Union(3) As Byte",
      "    Function As Long",
      "    Event As Long",
      "    Sub As Long",
      "    Property As Long",
      "    Const As Long",
      "    Inherits As Long",
      "    Last As Long",
      "End Type",
      "Class C",
      "    Public Class As String",
      "    Public Module As Long",
      "    Public Event As Long",
      "    Public Function As Long",
      "    Public Caption As String",
      "End Class",
    ].join("\n"),
  );
  const names = (n) =>
    types
      .find((t) => t.name === n)
      ?.members.map((m) => `${m.name}:${m.kind}`)
      .join();
  check(
    "a field named for a keyword is a field, in a Type and in a Class",
    problems.length === 0 &&
      names("Keywords") ===
        "Type:field,Union:field,Function:field,Event:field,Sub:field,Property:field,Const:field,Inherits:field,Last:field" &&
      names("C") === "Class:field,Module:field,Event:field,Function:field,Caption:field",
    show({ problems, keywords: names("Keywords"), c: names("C") }),
  );
}

{
  // community/slD3D.twin: `Function As Long` in a Type, 3,300 lines in. Read as a
  // procedure, it opens a body nothing closes and swallows the rest of the file.
  const { types, problems } = parseTwin(
    [
      "Module slD3D",
      "    Public Const First As Long = 1",
      "End Module",
      "Public Type D3D11_VIDEO_DECODER_EXTENSION",
      "    Function As Long",
      "    pPrivateInputData As LongPtr",
      "End Type",
      "",
      "Public Enum D3D11_VIDEO_PROCESSOR_FORMAT_SUPPORT",
      "    D3D11_VIDEO_PROCESSOR_FORMAT_SUPPORT_INPUT = 1",
      "End Enum",
      "Public Type After",
      "    Value As Long",
      "End Type",
    ].join("\n"),
  );
  check(
    "a Type with a field named Function does not swallow what follows",
    problems.length === 0 &&
      types.map((t) => t.name).join() ===
        "slD3D,D3D11_VIDEO_DECODER_EXTENSION,D3D11_VIDEO_PROCESSOR_FORMAT_SUPPORT,After" &&
      types[1].members.map((m) => `${m.name}:${m.kind}`).join() === "Function:field,pPrivateInputData:field",
    show({ problems, types: types.map((t) => `${t.name}:${t.members.length}`) }),
  );
}

{
  const { types, problems } = parseTwin(
    [
      "Public Class Counter",
      "    Public Property Get Count() As Long Implements ICounter.Count: Return 1: End Property",
      "    Public Function Twice(ByVal n As Long) As Long: Return n * 2: End Function",
      '    Public Sub Reset(): Debug.Print "x": End Sub',
      "    Public Sub Multi()",
      "        Debug.Print 1",
      "    End Sub",
      "    Public Caption As String",
      "End Class",
    ].join("\n"),
  );
  const c = types[0];
  check(
    "a procedure whose body and End share its line opens nothing",
    problems.length === 0 && c?.members.map((m) => m.name).join() === "Count,Twice,Reset,Multi,Caption",
    show({ problems, members: c?.members.map((m) => m.name) }),
  );
  check(
    "a one-line procedure's signature stops at its colon",
    c?.members[0].signature === "Public Property Get Count() As Long Implements ICounter.Count" &&
      c.members[0].returnType === "Long" &&
      c.members[1].signature === "Public Function Twice(ByVal n As Long) As Long" &&
      c.members[2].signature === "Public Sub Reset()",
    show(c?.members.map((m) => m.signature)),
  );
}

{
  const { types, problems } = parseTwin(
    ["Enum Modes", "    Static = 0", "    ReadOnly = 1", "    Shared", "    Default = 3", "End Enum"].join("\n"),
  );
  check(
    "an enumeration value named for a modifier is a value",
    problems.length === 0 && types[0]?.members.map((m) => m.name).join() === "Static,ReadOnly,Shared,Default",
    show({ problems, members: types[0]?.members }),
  );
}

{
  const { problems } = parseTwin(
    [
      "Option Explicit",
      'Import Library "/Miscellaneous/libtfm_64.a" As libtfm Link "stdlib"',
      'Import Library "/Miscellaneous/libtfm_32.a" As libtfm Link "stdlib"',
      "Module M",
      "End Module",
    ].join("\n"),
  );
  check("a file-level Import Library is not a problem", problems.length === 0, show(problems));
}

{
  const { types, problems } = parseTwin(
    [
      "Module Api",
      "    Public Delegate Function Execute CDecl (ByRef args As Long, ByVal app As LongPtr) As Long",
      "    Private Delegate Sub Callback (ByVal arg As Any)",
      "End Module",
    ].join("\n"),
  );
  const [execute, callback] = types[0]?.members ?? [];
  check(
    "a Delegate is a member with its return type, CDecl before its list",
    problems.length === 0 &&
      execute?.kind === "delegate" &&
      execute.vis === "public" &&
      execute.returnType === "Long" &&
      execute.signature ===
        "Public Delegate Function Execute CDecl (ByRef args As Long, ByVal app As LongPtr) As Long" &&
      callback?.kind === "delegate" &&
      callback.vis === "private" &&
      callback.returnType === null,
    show({ problems, members: types[0]?.members }),
  );
}

{
  const { types, problems } = parseTwin(
    [
      "/*Private*/ Module HiddenModule2",
      '    Public DeclareWide PtrSafe Property Get ScreenGetHeight Lib "<hiddenmodule>" Alias "#87" () As Single',
      '    Public DeclareWide PtrSafe Property Get ScreenGetFonts Lib "<hiddenmodule>" Alias "#89" (ByVal Index As Integer) As String',
      '    Public DeclareWide PtrSafe Property Let ScreenSetFont Lib "<hiddenmodule>" Alias "#90" (ByVal Index As Integer, ByVal Value As String)',
      "End Module",
    ].join("\n"),
  );
  const mod = types[0];
  check(
    "a commented-out Private leaves the module public",
    problems.length === 0 && mod?.name === "HiddenModule2" && mod.vis === "public" && isPublicType(mod, types),
    show({ problems, mod: mod && { ...mod, members: undefined } }),
  );
  check(
    "a DeclareWide Property is a property with its accessor, return type, Lib and Alias",
    mod?.members.map((m) => `${m.name}:${m.kind}:${m.accessor}:${m.returnType}`).join() ===
      "ScreenGetHeight:property:Get:Single,ScreenGetFonts:property:Get:String,ScreenSetFont:property:Let:null" &&
      mod.members[0].signature ===
        'Public DeclareWide PtrSafe Property Get ScreenGetHeight Lib "<hiddenmodule>" Alias "#87" () As Single',
    show(mod?.members),
  );
}

{
  const { types, problems } = parseTwin(
    [
      "Class Base",
      "    Overridable Sub Foo()",
      "    End Sub",
      "    Public Shared Function Bar() As Long",
      "    End Function",
      "    Overridable Function Baz(ByVal x As Long) As Long",
      "    End Function",
      "    Public Caption As String",
      "End Class",
    ].join("\n"),
  );
  check(
    "Overridable and Shared before a Sub or Function are modifiers, and the body closes",
    problems.length === 0 &&
      types[0]?.members.map((m) => `${m.name}:${m.kind}:${m.vis}`).join() ===
        "Foo:sub:public,Bar:function:public,Baz:function:public,Caption:field:public" &&
      types[0].members[0].signature === "Overridable Sub Foo()",
    show({ problems, members: types[0]?.members }),
  );
}

{
  const { types, problems } = parseTwin(
    [
      "Module [_HiddenModule]",
      '    Public DeclareWide PtrSafe Function [Chr$] Lib "<strings>" Alias "#4" (ByVal C As Long) As String',
      "    Function [Date$]() As String",
      "    End Function",
      "    Public Enum [Odd Enum]",
      "        [A4 Portrait] = 1",
      "    End Enum",
      "End Module",
    ].join("\n"),
  );
  const mod = types.find((t) => t.kind === "module");
  check(
    "a bracketed name is read without its brackets, and its signature keeps them",
    problems.length === 0 &&
      mod?.name === "_HiddenModule" &&
      mod.members.map((m) => m.name).join() === "Chr$,Date$" &&
      mod.members[1].signature === "Function [Date$]() As String" &&
      types.find((t) => t.kind === "enum")?.name === "Odd Enum",
    show({ problems, mod }),
  );
}

// ------------------------------------------------------------ what a declaration says

{
  const { types, problems } = parseTwin(
    [
      '[Description("A ""quoted"" thing" & vbCrLf & _',
      '             "second line, with [brackets]"), ClassId("0A102E9C-9E68-411A-A4B8-E6128FC07721")]',
      "[Hidden]",
      "Public Class Widget",
      '    [DispId(1), Description("The text"), Foo(1, 2)]',
      "    Public Property Get Caption() As String Implements IWidget.Caption",
      "    End Property",
      "    Public Property Let Caption(ByVal Value As String)",
      "    End Property",
      "    Public Property Set Icon(ByVal Value As Picture)",
      "    End Property",
      '    [ Description ( ShownIn & "tip" ) ]',
      "    Public Function Items() As Collection(Of Long)",
      "    End Function",
      "    Public Function Same(Of T)(ByVal x As T) As T",
      "    End Function",
      "    Public Property Get Count As Long",
      "    End Property",
      "    Private Const A As Long = 1, B = 2",
      "    Public X(0 To 3) As Long, Y As String",
      '    Declare PtrSafe Function GetDC Lib "user32" Alias "GetDC" (ByVal h As LongPtr) As LongPtr',
      "    Event Changed(ByVal v As Long)",
      "End Class",
    ].join("\n"),
  );
  const w = types[0];
  const m = (n, accessor) =>
    w?.members.find((x) => x.name === n && (accessor === undefined || x.accessor === accessor));
  check("the fixture reads cleanly", problems.length === 0, show(problems));
  check(
    "a type's attributes keep their names in attributes and their arguments in attrs",
    show(w?.attributes) === show(["Description", "ClassId", "Hidden"]) &&
      show(w.attrs.map((a) => a.name)) === show(w.attributes) &&
      w.attrs[1].args === '"0A102E9C-9E68-411A-A4B8-E6128FC07721"' &&
      w.attrs[2].args === null,
    show(w?.attrs),
  );
  check(
    "an attribute's arguments are as written, a comma inside them does not split it",
    show(m("Caption", "Get")?.attrs) ===
      show([
        { name: "DispId", args: "1" },
        { name: "Description", args: '"The text"' },
        { name: "Foo", args: "1, 2" },
      ]),
    show(m("Caption", "Get")?.attrs),
  );
  check(
    "a description is a literal, or literals joined by & with the line-break constants",
    w?.description === 'A "quoted" thing\nsecond line, with [brackets]' &&
      m("Caption", "Get")?.description === "The text",
    show({ type: w?.description, member: m("Caption", "Get")?.description }),
  );
  check(
    "a description that is not made of literals is null, and its attribute keeps the arguments",
    m("Items")?.description === null && m("Items")?.attrs[0].args === 'ShownIn & "tip"',
    show(m("Items")),
  );
  check(
    "a property procedure has its accessor, and a result only for Get",
    m("Caption", "Get")?.returnType === "String" &&
      m("Caption", "Let")?.accessor === "Let" &&
      m("Caption", "Let")?.returnType === null &&
      m("Icon")?.accessor === "Set" &&
      m("Icon")?.returnType === null &&
      m("Count")?.returnType === "Long" &&
      m("Items")?.accessor === null,
    show(w?.members.filter((x) => x.kind === "property")),
  );
  check(
    "a return type is the type after the parameter list, generic or not, not the Implements clause",
    m("Caption", "Get")?.signature === "Public Property Get Caption() As String Implements IWidget.Caption" &&
      m("Items")?.returnType === "Collection(Of Long)" &&
      m("Same")?.returnType === "T" &&
      m("GetDC")?.returnType === "LongPtr",
    show(w?.members.map((x) => [x.name, x.returnType])),
  );
  check(
    "a signature is the declaration as written, Lib and Alias included, without its attributes",
    m("GetDC")?.signature ===
      'Declare PtrSafe Function GetDC Lib "user32" Alias "GetDC" (ByVal h As LongPtr) As LongPtr' &&
      m("Items")?.signature === "Public Function Items() As Collection(Of Long)" &&
      w.signature === "Public Class Widget",
    show(w?.members.map((x) => x.signature)),
  );
  check(
    "each of several names a statement declares has the statement's modifiers and its own piece",
    m("A")?.signature === "Private Const A As Long = 1" &&
      m("B")?.signature === "Private Const B = 2" &&
      m("X")?.signature === "Public X(0 To 3) As Long" &&
      m("Y")?.signature === "Public Y As String",
    show(w?.members.filter((x) => ["A", "B", "X", "Y"].includes(x.name)).map((x) => x.signature)),
  );
  check(
    "a member with nothing to report has empty attrs, no description, no result and no accessor",
    show(m("Changed")) ===
      show({
        name: "Changed",
        kind: "event",
        vis: "public",
        hidden: false,
        line: m("Changed")?.line,
        signature: "Event Changed(ByVal v As Long)",
        attrs: [],
        description: null,
        returnType: null,
        accessor: null,
      }),
    show(m("Changed")),
  );
}

{
  const { types, problems } = parseTwin(
    [
      "Enum Colour",
      '    [Hidden, Description("Last")] [_MAX] = 7',
      "    [Hidden] Green = 5",
      "    Red = 1",
      "End Enum",
    ].join("\n"),
  );
  const [max, green, red] = types[0]?.members ?? [];
  check(
    "an enumeration value has its signature as written and the attributes before it on its line",
    problems.length === 0 &&
      max?.name === "_MAX" &&
      max.signature === "[_MAX] = 7" &&
      max.hidden === true &&
      max.description === "Last" &&
      green?.name === "Green" &&
      green.hidden === true &&
      green.signature === "Green = 5" &&
      red?.signature === "Red = 1" &&
      red.attrs.length === 0 &&
      red.hidden === false,
    show({ problems, members: types[0]?.members }),
  );
}

{
  // The compiler (BETA 983, 995 and 1005) reads a line that is only `[Name]` in an
  // Enum body as a value of that name, with the next number, whatever is in the
  // brackets; the scanner used to take it for the attributes of the next line, and
  // an Enum made of such lines came out with no values at all.
  const { types, problems } = parseTwin(
    [
      "Module Shims",
      "    Private Enum LongPtr",
      "        [_]",
      "    End Enum",
      "    Public Enum GridCellEffectEnum",
      "        [Flat]",
      "        [Raised]",
      "        [Sunken]",
      "    End Enum",
      "    Enum ReportSizeConstants",
      "        [ ]",
      "        [A4 Portrait]",
      "        [Letter Landscape]",
      "    End Enum",
      "    Public Enum Mixed",
      "        Red = 1",
      "        [Flat]",
      "        [_MAX] = 7",
      "        Blue",
      "    End Enum",
      "End Module",
    ].join("\n"),
  );
  const values = (n) =>
    types
      .find((t) => t.name === n)
      ?.members.map((m) => m.name)
      .join("|");
  check(
    "a line of only [Name] in an Enum is a value, in the shim's one-value Enum and in a run of them",
    problems.length === 0 &&
      values("LongPtr") === "_" &&
      values("GridCellEffectEnum") === "Flat|Raised|Sunken" &&
      values("ReportSizeConstants") === " |A4 Portrait|Letter Landscape" &&
      values("Mixed") === "Red|Flat|_MAX|Blue",
    show({ problems, flat: values("GridCellEffectEnum"), mixed: values("Mixed") }),
  );
  const mixed = types.find((t) => t.name === "Mixed")?.members ?? [];
  check(
    "such a value has its bracketed signature, no attributes, and leaves the next value alone",
    mixed.map((m) => m.signature).join("|") === "Red = 1|[Flat]|[_MAX] = 7|Blue" &&
      mixed.every((m) => m.attrs.length === 0 && !m.hidden && m.description === null),
    show(mixed),
  );
}

{
  // `[Hidden]` and `[Description("x")]` are attribute names, and still values here:
  // the compiler gives `E.Hidden` the number 0 and `Red` the number 1, and refuses
  // `[Hidden] Red` (TB5182), so no Enum value can carry an attribute.
  const { types, problems } = parseTwin(
    [
      "Module M",
      "    Public Enum Odd",
      "        [Hidden]",
      "        [Hidden, Restricted]",
      '        [Description("x")]',
      "        Red = 3",
      "    End Enum",
      "End Module",
    ].join("\n"),
  );
  const members = types.find((t) => t.name === "Odd")?.members ?? [];
  check(
    "an attribute-looking line of its own in an Enum is a value of that name, not an attribute",
    problems.length === 0 &&
      members.map((m) => m.name).join("|") === 'Hidden|Hidden, Restricted|Description("x")|Red' &&
      members.every((m) => m.attrs.length === 0 && !m.hidden && m.description === null),
    show({ problems, members }),
  );
}

{
  // Outside an Enum body a line of only an attribute list is still one: before the
  // Enum, before the next member of its Module, and before a member that follows
  // an Enum's `End Enum`.
  const { types, problems } = parseTwin(
    [
      "Module M",
      '    [Description("Papers")]',
      "    Public Enum Paper",
      "        [A4 Portrait] = 1",
      "        Letter",
      "    End Enum",
      "    [Hidden]",
      "    Public Sub S()",
      "    End Sub",
      "    Public Sub T()",
      "    End Sub",
      "End Module",
    ].join("\n"),
  );
  const paper = types.find((t) => t.name === "Paper");
  const m = types.find((t) => t.name === "M");
  check(
    "an attribute list on a line of its own is still one before an Enum and before a member after it",
    problems.length === 0 &&
      paper?.description === "Papers" &&
      paper.members.map((v) => v.name).join("|") === "A4 Portrait|Letter" &&
      m?.members.find((x) => x.name === "S")?.hidden === true &&
      m.members.find((x) => x.name === "T")?.hidden === false,
    show({ problems, paper, members: m?.members }),
  );
}

{
  const lines = logicalLinesRaw('Foo "a, ""b"" [c]" \' note\nBar _\n  "x"  Baz');
  check(
    "logicalLinesRaw gives the line as written beside the blanked one, character for character",
    lines.length === 2 &&
      lines[0].raw === 'Foo "a, ""b"" [c]" ' &&
      lines[0].text === `Foo "${" ".repeat(12)}" ` &&
      lines[0].raw.length === lines[0].text.length &&
      lines[1].raw === 'Bar    "x"  Baz' &&
      lines[1].text === 'Bar    " "  Baz' &&
      lines[1].line === 2,
    show(lines),
  );
}

{
  const settings = '{\n\t"project.id": "{31FD080F}",\n\t"project.name": "Assert",\n\t"project.versionMajor": 0\n}';
  const r = parseSources(
    [
      { path: "Sources/A.twin", text: "Module A\nEnd Module\n" },
      { path: "Sources/Sub/C.TWIN", text: "Class C\nEnd Class\n" },
      { path: "Packages/D.twin", text: "Module D\nEnd Module\n" },
      { path: "Sources/readme.txt", text: "Module E\nEnd Module\n" },
    ],
    settings,
  );
  check(
    "a package in memory gives its project name and the types of its Sources/ .twin files only",
    r.project === "Assert" &&
      r.types.map((t) => `${t.file}:${t.name}`).join() === "Sources/A.twin:A,Sources/Sub/C.TWIN:C" &&
      r.problems.length === 0,
    show({ project: r.project, types: r.types.map((t) => t.file) }),
  );
  check(
    "a project name is read from broken settings as text, and is null when there is none",
    projectNameOf('\u{FEFF}{\n\t"project.name": "X",\n') === "X" &&
      projectNameOf('{"project.id": "{1}"}') === null &&
      projectNameOf(null) === null &&
      parseSources([], null).project === null,
    show(projectNameOf('{"project.id": "{1}"}')),
  );
}

// ------------------------------------------------------------ the pages

const api = {
  build: 983,
  packages: {
    VBA: {
      exports: ["VBA"],
      types: [
        {
          name: "Strings",
          kind: "module",
          members: { Left: "function", Left$: "function", LeftB: "function", LeftB$: "function" },
        },
        { name: "Information", kind: "module", members: { IsArray: "function" } },
        { name: "_HiddenModule", kind: "module", hidden: true, members: { Array: "function" } },
        { name: "_Collection", kind: "interface", members: { Add: "sub", Count: "property" } },
        { name: "Collection", kind: "coclass", default: "_Collection" },
        { name: "Constants", kind: "module" },
        { name: "VbMsgBoxStyle", kind: "enum", in: "Constants", values: ["vbOKOnly", "vbOKCancel"] },
      ],
    },
    tbIDE: {
      exports: ["tbIDE"],
      types: [
        { name: "IEditorV1", kind: "interface", members: { Close: "sub", Path: "property" } },
        { name: "ICodeEditorV1", kind: "interface", extends: "tbIDE.IEditorV1", members: { Text: "property" } },
        { name: "IHtmlElementV1", kind: "interface", members: { Properties: "property", Name: "property" } },
        { name: "Editor", kind: "coclass", default: "IEditorV1" },
        { name: "CodeEditor", kind: "coclass", default: "ICodeEditorV1" },
        { name: "HtmlElement", kind: "coclass", default: "IHtmlElementV1" },
      ],
    },
  },
};

const h = (level, text, id = null) => ({ level, text, id });
const page = (src, url, title, parent, headings, extra = {}) => ({ src, url, title, parent, headings, ...extra });
// biome-ignore format: a table, one entry per line
const pages = [
  page("Reference/Default/VBA/index.md", "/tB/Packages/VBA", "VBA Package", undefined, [h(1, "VBA Package")]),
  page("Reference/Default/VBA/Strings/index.md", "/tB/Modules/Strings/", "Strings Module", "VBA Package", [h(1, "Strings module")]),
  page("Reference/Default/VBA/Strings/Left.md", "/tB/Modules/Strings/Left", "Left", "Strings Module", [h(1, "Left, LeftB")]),
  page("Reference/Default/VBA/Information/index.md", "/tB/Modules/Information/", "Information Module", "VBA Package", [h(1, "Information module")]),
  page("Reference/Default/VBA/Information/Array.md", "/tB/Modules/Information/Array", "Array", "Information Module", [h(1, "Array")]),
  page("Reference/Default/VBA/HiddenModule/index.md", "/tB/Modules/HiddenModule/", "(Default) Module", "VBA Package",
    [h(1, "(Default) module")], { symbols: ["_HiddenModule"] }),
  page("Reference/Default/VBA/Collection/index.md", "/tB/Modules/Collection/", "Collection", "VBA Package", [h(1, "Collection")]),
  page("Reference/Default/VBA/Collection/Add.md", "/tB/Modules/Collection/Add", "Add", "Collection", [h(1, "Add")]),
  page("Reference/Default/VBA/Constants/VbMsgBoxStyle.md", "/tB/Modules/Constants/VbMsgBoxStyle", "VbMsgBoxStyle", "Constants Module",
    [h(1, "VbMsgBoxStyle")]),
  page("Reference/Default/VBA/Debug.md", "/tB/Modules/Debug", "Debug", "VBA Package",
    [h(1, "Debug", "debug"), h(2, "Debug.Print", "debugprint"), h(2, "See Also", "see-also")]),
  page("Reference/Built-In/tbIDE/index.md", "/tB/Packages/tbIDE/", "tbIDE Package", "Built-In Packages", [h(1, "tbIDE Package")]),
  page("Reference/Built-In/tbIDE/Editor.md", "/tB/Packages/tbIDE/Editor", "Editor", "tbIDE Package",
    [h(1, "Editor class", "editor-class"), h(2, "Methods", "methods"), h(3, "Close", "close"), h(2, "Properties", "properties"), h(3, "Path", "path")]),
  page("Reference/Built-In/tbIDE/CodeEditor.md", "/tB/Packages/tbIDE/CodeEditor", "CodeEditor", "tbIDE Package",
    [h(1, "CodeEditor class", "codeeditor-class"), h(2, "Properties", "properties"), h(3, "Text", "text"),
      h(3, "Undeclared", "undeclared"), h(4, "Example", "example"), h(3, "Example", "example-1")]),
  page("Reference/Built-In/tbIDE/HtmlElement.md", "/tB/Packages/tbIDE/HtmlElement", "HtmlElement", "tbIDE Package",
    [h(1, "HtmlElement class", "htmlelement-class"), h(2, "Name", "name"), h(2, "Properties", "properties"),
      h(3, "Name", "name-1"), h(3, "Properties", "properties-1")]),
  page("Reference/Core/Do-Loop.md", "/tB/Core/Do-Loop", "Do...Loop", "Statements", [h(1, "Do…Loop")]),
  page("Reference/Core/If-Then-Else.md", "/tB/Core/If-Then-Else", "If", "Statements", [h(1, "If…Then…Else")]),
  page("Reference/Core/Comparison-Operators.md", "/tB/Core/Comparison-Operators", "Comparison", "Operators",
    [h(1, "Comparison operators")], { symbols: ["=", "<>"] }),
  page("Reference/Core/Concat.md", "/tB/Core/Concat", "&, &=", "Operators", [h(1, "& and &= operators")]),
  page("Reference/Attributes.md", "/tB/Core/Attributes", "Attributes", "Reference Section",
    [h(1, "Attributes", "attributes"), h(2, "AppObject (optional Bool)", "appobject")]),
  page("Reference/Default/VBA/Guide.md", "/Reference/Guide", "Guide", "VBA Package", [h(1, "Guide")]),
];

const r = deriveSymbolIndex({ pages, api });
const find = (name, container) =>
  r.symbols.filter((s) => s.name === name && (container === undefined || s.container === container));
const urlOf = (name, container) => find(name, container).map((s) => s.url);

check("a module is its page's by the title, less 'Module'", urlOf("Strings", null).join() === "/tB/Modules/Strings/");
check(
  "a member with a page of its own under the module's page",
  urlOf("Left", "Strings").join() === "/tB/Modules/Strings/Left",
);
check(
  "a name in the first heading's list shares the page",
  urlOf("LeftB", "Strings").join() === "/tB/Modules/Strings/Left",
);
check(
  "a $ form goes where its base went",
  urlOf("Left$", "Strings").join() === "/tB/Modules/Strings/Left" &&
    urlOf("LeftB$", "Strings").join() === "/tB/Modules/Strings/Left",
  show(find("LeftB$")),
);
check(
  "a page filed under one module and declared in another is the declarer's",
  find("Array").length === 1 &&
    find("Array")[0].container === "_HiddenModule" &&
    find("Array")[0].url === "/tB/Modules/Information/Array",
  show(find("Array")),
);
check(
  "symbols: names a page's subject when its title cannot",
  urlOf("_HiddenModule", null).join() === "/tB/Modules/HiddenModule/",
  show(find("_HiddenModule")),
);
check(
  "a CoClass's member on its own page, by the default interface",
  find("Add", "Collection")[0]?.url === "/tB/Modules/Collection/Add" && find("Add", "Collection")[0]?.kind === "method",
  show(find("Add")),
);
check(
  "an enumeration's values are on its page, not under a heading",
  urlOf("vbOKOnly", "VbMsgBoxStyle").join() === "/tB/Modules/Constants/VbMsgBoxStyle" &&
    find("vbOKOnly")[0]?.kind === "enumvalue",
);
check(
  "an inherited member is found on the page of the type that declares it",
  urlOf("Close", "CodeEditor").join() === "/tB/Packages/tbIDE/Editor#close",
  show(find("Close")),
);
check(
  "a heading under Properties is a member whatever the package declares",
  find("Undeclared", "CodeEditor")[0]?.kind === "property",
  show(find("Undeclared")),
);
check(
  "an Example heading among members, at their level or under one, is not a member",
  !find("Example").length,
  show(find("Example")),
);
check(
  "a section heading is never taken for a member of the same name",
  urlOf("Properties", "HtmlElement").join() === "/tB/Packages/tbIDE/HtmlElement#properties-1",
  show(find("Properties")),
);
check(
  "a member's heading under Properties wins over a prose section of the same name above it",
  urlOf("Name", "HtmlElement").join() === "/tB/Packages/tbIDE/HtmlElement#name-1",
  show(find("Name")),
);
check(
  "a page no package declares, with Name.Member headings, is an object's",
  find("Debug")[0]?.kind === "object" && urlOf("Print", "Debug").join() === "/tB/Modules/Debug#debugprint",
  show(find("Print")),
);
check(
  "a statement's other words are its keywords, through the typographer's ellipsis",
  find("Loop")[0]?.kind === "keyword" &&
    find("Do")[0]?.kind === "statement" &&
    find("Else")[0]?.url === "/tB/Core/If-Then-Else",
  show(r.symbols.filter((s) => s.package === null)),
);
check(
  "an operator page's symbols: are each an operator",
  find("<>")[0]?.kind === "operator" && find("=")[0]?.kind === "operator",
  show(find("<>")),
);
check("an operator page's title gives its operators", find("&=")[0]?.kind === "operator", show(find("&=")));
check(
  "an attribute is its ## heading's, by the id the build gave it",
  urlOf("AppObject").join() === "/tB/Core/Attributes#appobject",
  show(find("AppObject")),
);
check(
  "a CoClass's default interface maps to it",
  r.interfaces["tbIDE.ICodeEditorV1"] === "tbIDE.CodeEditor" && r.interfaces["VBA._Collection"] === "VBA.Collection",
  show(r.interfaces),
);
check("only /tB/ pages are read", !r.symbols.some((s) => !s.url.startsWith("/tB/")) && !find("Guide").length);
check(
  "a declared member no page documents is a gap, not an entry",
  r.gaps.some((g) => g.container === "Collection" && g.name === "Count") && !find("Count").length,
  show(r.gaps),
);

{
  const text = serializeSymbolIndex(r, api);
  const back = JSON.parse(text);
  check(
    "the published file parses, and names its format and API build",
    back.format === 1 && back.api === 983 && back.symbols.length === r.symbols.length,
  );
  const lines = text.split("\n");
  const body = lines.slice(lines.indexOf('  "symbols": [') + 1, lines.lastIndexOf("  ]"));
  const parsed = body.map((l) => {
    try {
      return JSON.parse(l.trim().replace(/,$/, ""));
    } catch {
      return null;
    }
  });
  check(
    "the published file has one entry to a line",
    body.length === r.symbols.length && parsed.every((e, i) => e?.url === r.symbols[i].url),
    `${body.length} entry lines`,
  );
}

{
  const got = headingsOf(
    '<header><h1 class="x" id="a"> <a href="#a"><svg></svg></a> A &amp; B </h1></header><hr>' +
      '<h3 id="c">C <code>D</code></h3><h2>no id</h2>',
  );
  check(
    "headings are read with their ids and text, and <header> and <hr> are not headings",
    show(got) ===
      show([
        { level: 1, id: "a", text: "A & B" },
        { level: 3, id: "c", text: "C D" },
        { level: 2, id: null, text: "no id" },
      ]),
    show(got),
  );
}

// ------------------------------------------------------------ the drift guard

const withBaseline = baselineFixture("symbol-baseline.json");
const urlsIn = async (file) => JSON.parse(await readFile(file, "utf8")).urls;
const BASE = ["/tB/Modules/Strings/Left", "/tB/Packages/tbIDE/ToolWindows#add"];
const BASE_FILE = { src: GUARDED_SRC, urls: BASE };

await withBaseline(BASE_FILE, async (file) => {
  const out = await checkSymbolBaseline({
    src: GUARDED_SRC,
    urls: ["/tB/Modules/Strings/Left", "/tB/Packages/tbIDE/ToolWindows#add-method"],
    write: true,
    file,
  });
  check(
    "a reworded heading's lost anchor fails, and is named",
    out.failed && out.text.includes("ToolWindows#add") && (await urlsIn(file)).length === 2,
    out.text.trim(),
  );
});
await withBaseline(BASE_FILE, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: [...BASE, "/tB/Core/Dim"], write: true, file });
  check(
    "a new URL is accepted and recorded",
    !out.failed && (await urlsIn(file)).includes("/tB/Core/Dim"),
    out.text.trim(),
  );
});
await withBaseline(BASE_FILE, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: [...BASE, "/tB/Core/Dim"], write: false, file });
  check(
    "a new URL with write:false leaves the file alone",
    !out.failed && (await urlsIn(file)).length === 2,
    out.text.trim(),
  );
});
await withBaseline(BASE_FILE, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: BASE, write: true, file });
  check("an unchanged index says nothing", !out.failed && out.text === "", show(out.text));
});
await withBaseline(BASE_FILE, async (file) => {
  await checkSymbolBaseline({ src: GUARDED_SRC, urls: BASE.slice(0, 1), write: false, force: true, file });
  check("--update-symbol-baseline records a removal on request", (await urlsIn(file)).length === 1);
});
await withBaseline(BASE_FILE, async (file) => {
  const out = await checkSymbolBaseline({ src: "test/fixtures/check-src", urls: [], write: true, file });
  check(
    "a foreign source root is ignored, not measured",
    !out.failed && out.text === "" && (await urlsIn(file)).length === 2,
  );
});
await withBaseline(null, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: BASE, write: false, file });
  check(
    "a missing list fails where the build may not write (CI)",
    out.failed && out.text.includes("missing"),
    out.text.trim(),
  );
});
await withBaseline(null, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: BASE, write: true, file });
  check(
    "a missing list is created where it may write",
    !out.failed && (await urlsIn(file)).length === 2,
    out.text.trim(),
  );
});

// ------------------------------------------------------------ report

process.exit(report());
