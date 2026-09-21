#!/usr/bin/env node
// Generate a twinBASIC probe project for Reference/Attributes.md placements.
//
//     node scripts/gen_attribute_probes.mjs <out_dir> [key.md]
//
// `Attributes.md` states an `Applicable to:` line for 52 of its 57 attributes,
// and none of them had been checked against the compiler --- the one that was
// checked turned out to be wrong. twinBASIC cannot compile a project from the
// command line (see Features/Packages/Import-Export-Tool), so this does the
// next best thing: it writes one source file per claimed placement, so a single
// IDE build answers every claim at once.
//
// A misplaced attribute is reported as `This attribute is not supported in
// this context` (TB5155) or `Syntax error.  No handler for this symbol`
// (TB5182); which of the two comes back does not say whether the attribute
// exists, only that it is not accepted there.
//
// Up to three trees are written, on two different contracts:
//
//   <out_dir>           AttributeProbes   -- every probe expected to compile
//   <out_dir>-2         AttributeProbes2  -- the same, for placements that
//                                            cannot share a project (one
//                                            [RunAfterBuild] per project)
//   <out_dir>-explore   AttributeExplore  -- **a diagnostic is the answer**:
//                                            questions the page cannot settle
//
// Keeping the two contracts apart is what makes either build readable: red in
// AttributeProbes is a documentation defect, red in AttributeExplore is a
// result.
//
// Then pack each tree and open the result in the IDE:
//
//     bin\twinBASIC_win32.exe import AttributeProbes.twinproj <out_dir> --overwrite
//
// Re-run after editing `Attributes.md`; the key cites the line each probe came
// from.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOCS = path.join(REPO, "docs", "Reference", "Attributes.md");

const USAGE = `Generate a twinBASIC probe project for Reference/Attributes.md placements.

    node scripts/gen_attribute_probes.mjs <out_dir> [key.md]

Writes one source file per claimed attribute placement, plus a key naming the
Attributes.md line each probe came from. Every probe is expected to compile; a
diagnostic naming a probe module is a finding.`;

// ----------------------------------------------------------------- parsing
const LINK_BOLD = /\[\*\*([^\]]*)\*\*\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

function clean(s) {
  return s
    .replace(LINK_BOLD, "$1")
    .replace(LINK, "$1")
    .replaceAll("**", "")
    .replaceAll("\\", "")
    .trim();
}

async function parseAttributes(file) {
  // Python reads in text mode, so universal-newline translation has already
  // collapsed CRLF before the split. Match that, or every line carries a
  // trailing CR into the generated key.
  const lines = (await fs.readFile(file, "utf8")).replace(/\r\n?/g, "\n").split("\n");
  const entries = [];
  let cur = null;

  lines.forEach((line, i) => {
    const m = /^Syntax:\s*(.*)$/.exec(line);
    if (m) {
      const name = /^Syntax:\s*\*\*\[(\w+)/.exec(line);
      // A `Syntax:` line that names no attribute leaves `cur` alone, exactly as
      // the Python `continue` did -- the line cannot also be `Applicable to:`.
      if (!name) return;
      cur = { name: name[1], syntax: clean(m[1]), line: i + 1, app: null };
      entries.push(cur);
      return;
    }
    const m2 = /^Applicable to:\s*(.*)$/.exec(line);
    if (m2 && cur !== null && cur.app === null) cur.app = clean(m2[1]);
  });

  return entries;
}

// --------------------------------------------------------------- arguments
// An attribute with a mandatory argument needs a value that is itself valid, or
// the compiler reports the argument instead of the placement. GUIDs are unique
// per probe so two probes can never collide on one id.
const GUID_ATTRS = new Set([
  "ClassId", "CoClassId", "InterfaceId", "EventInterfaceId",
  "EnumId", "FormDesignerId",
]);
const FIXED_ARGS = {
  Description: '("attribute placement probe")',
  DispId: "(1000)",
  IdeButton: '("probe")',
  PackingAlignment: "(4)",
  CompileIf: "(True)",
  // The five below were once in UNSYNTHESISABLE, four of them for want of a
  // usable argument value. `Attributes.md` states each shape but no value, and
  // the shipped packages turned out to carry one apiece -- so these are copied
  // from code the compiler already accepts rather than guessed:
  //
  //   [CoClassCustomConstructor("CreatePropertyBagObject")]  VBRUN/PropertyBag
  //   [CustomControl("/miscellaneous/frmButton.png")]        CustomControlsPackage
  //   [PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json",
  //                 "events", "name", "id")]                 Sample 22
  //   [IgnoreWarnings(TB0001)]                               VB/QRCodeHelper
  //
  // The image and .json those two point at are written into the tree beside the
  // probes, and the factory into `_ProbeFactory.twin`; see the emission in
  // main(). All five probes build clean on BETA 983.
  //
  // Qualified, because the documented shape is "fully qualified path to factory
  // method" and that is the claim under test. VBRUN uses the bare form too.
  CoClassCustomConstructor: '("ProbeFactoryModule.ProbeFactory")',
  CustomControl: '("/miscellaneous/probe.png")',
  PopulateFrom: '("json", "/Resources/PROBE/Strings.json", "events", "name", "id")',
  IgnoreWarnings: "(TB0001)",
  // Listed as unsynthesisable on the grounds that "the option string vocabulary
  // is not documented". It is: the entry documents +llvm, +optimize,
  // +optimizesize and +optimizespeed. `+optimize` is used here rather than
  // `+llvm`, which the page says cannot compile procedures taking objects,
  // strings or dynamic arrays -- a probe should fail on its placement or not at
  // all. An empty string is also accepted, confirmed by the X04 probe.
  CompilerOptions: '("+optimize")',
  // Names a module procedure the compiler must resolve, and whose signature has
  // to match the member carrying the attribute; `_ProbeFactory.twin` declares a
  // matching `Sub ProbeRedirect()`.
  //
  // This probe is the reason the exercise was worth doing on entries written
  // from a usage census: the census grouped uses by *declaration keyword* and
  // reported "on a Property Get, a Function and a Sub", so the entry went out
  // saying `procedure in a Class`. The probe put it on a class method and got
  // TB5155. Grouping the same 82 uses by *enclosing construct* instead shows
  // every one of them is inside an Interface -- `_App`, `_Clipboard`, `_Screen`,
  // `_Forms`, `VBGlobal`. A census answers the question it was asked, and
  // "which keyword" is not "which scope".
  RedirectToStaticImplementation: '("ProbeFactoryModule.ProbeRedirect")',
};

// Placements the packages evidence but a generic skeleton cannot probe
// faithfully. Excluded deliberately, and named in the key, because a probe that
// tests the wrong thing is worse than no probe: it fails for a reason that is
// not the documentation's and sends the reader after a defect that is not there.
const NOT_FAITHFULLY_PROBEABLE = {
  CustomDesigner: "the designer name has to suit the property's type -- " +
    "`designer_SpectrumWindows` is for an OLE_COLOR, `designer_MultiLineText` for a " +
    "String -- so a rejection could mean the placement or the pairing, and the probe " +
    "could not tell you which. Placement evidenced by 154 uses across four packages",
  Enumerator: "the member has to return stdole.IUnknown or a Variant; the generic " +
    "procedure skeleton returns neither, so the probe would test the return type " +
    "rather than the placement. Evidenced by 25 uses across five packages",
};
// Arguments that cannot be synthesised without something else being true.
// FormDesignerId earned its place the hard way: probed on a Class it reached
// TB5247 `unable to find matching form designer JSON`, which is the compiler
// accepting the placement and then failing a lookup. That confirms the
// documented placement and tells us nothing further, so it is not worth a probe.
const UNSYNTHESISABLE = {
  FormDesignerId: "needs a form designer JSON to match; probing it reached TB5247, " +
    "which already confirms the documented placement on a Class",
};

// Attributes the compiler allows only once per project, so their second and
// later placements cannot share a project with the first. TB5114 for
// [RunAfterBuild].
const SINGLETON = {
  RunAfterBuild: "the compiler allows only one [RunAfterBuild] per project",
};

// Placements a page's own worked example uses but its `Applicable to:` line does
// not name. Expected to compile for the same reason: the page says so.
//
// The DllExport entry was the case this existed for: the line said "variables",
// the example used a Public Const, and probing both settled it -- the variable
// is rejected (TB5155), the Const compiles. The line now says "constants", so
// the ordinary target parser covers it and no extra probe is needed.
//
// [IgnoreWarnings] is here because its entry states no `Applicable to:` line at
// all, so the target parser yields nothing and it would go unprobed for want of
// a claim to test. The three placements are the ones the shipped packages use
// -- 113 occurrences across VB, cefPackage and Sample 22 -- so a diagnostic
// here would mean the probe is malformed. What the probe settles is the missing
// line: whatever compiles is what `Applicable to:` should say.
const EXTRA_PROBES = [
  ["IgnoreWarnings", "MODULE", "no `Applicable to:` line; Module is what VB/QRCodeHelper uses"],
  ["IgnoreWarnings", "CLASS", "no `Applicable to:` line; Class is what VB/Fusion uses"],
  ["IgnoreWarnings", "PROC_MODULE", "no `Applicable to:` line; a Sub is the commonest use"],
];

// Resources the argument forms above refer to. `import` packs the whole tree,
// so these ride along into the .twinproj exactly as a hand-made project's would.
//
// The PNG is a 1x1 opaque black image, written as bytes rather than fetched:
// [CustomControl] needs a real image at the path, not merely a path.
const PROBE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9" +
  "awAAAABJRU5ErkJggg==",
  "base64",
);
const PROBE_STRINGS_JSON = JSON.stringify(
  { events: [{ id: 1, name: "probe_event_one" }, { id: 2, name: "probe_event_two" }] },
  null,
  4,
) + "\n";
// [CoClassCustomConstructor] names a factory the compiler must be able to
// resolve. VBRUN's real one is `() As stdole.IUnknown`; this mirrors it.
const PROBE_FACTORY_TWIN =
  "' Targets that probes name by string. ProbeFactory is for\n" +
  "' [CoClassCustomConstructor] and mirrors VBRUN's CreatePropertyBagObject,\n" +
  "' which is `() As stdole.IUnknown`. ProbeRedirect is for\n" +
  "' [RedirectToStaticImplementation], and its signature must match the\n" +
  "' PROC_CLASS skeleton's `Public Sub Probe()`.\n\n" +
  "Public Module ProbeFactoryModule\n" +
  "    Public Function ProbeFactory() As stdole.IUnknown\n" +
  "    End Function\n\n" +
  "    Public Sub ProbeRedirect()\n" +
  "    End Sub\n" +
  "End Module\n";

// ------------------------------------------------------------ exploratory
// A third project, `AttributeExplore`, on the opposite contract to the probes
// above: **a diagnostic here is the answer, not a defect.** These ask questions
// `Attributes.md` cannot answer and no shipped package demonstrates, so there
// is no placement to expect. Each entry carries what a clean build would mean
// and what a rejection would mean, because a result nobody can read is not one.
//
// Kept in its own project so the "every probe compiles" contract on
// AttributeProbes stays true and a red build there stays meaningful.
//
// `got` records what BETA 983 answered, so re-running the generator does not
// lose the result and a later build can be compared against it. A probe whose
// `got` is out of date is worse than one with none, so update it in the same
// commit as any change to the probe.
//
// One reading rule, learned here: **the diagnostic code does not distinguish
// "no such attribute" from "wrong place for it".** [ConstantFoldable] is
// unquestionably a real attribute and drew TB5182 `No handler for this symbol`
// on a class method, the same code an invented name would draw; [ComExport]
// drew TB5155 `This attribute is not supported in this context` on a Sub and
// then compiled clean on a Const. Existence is settled by the compiler's token
// table, not by which of the two codes comes back.
const EXPLORATORY = [
  {
    tag: "X01_ConstantFoldableNumericsOnly_Module",
    asks: "Is [ConstantFoldableNumericsOnly] accepted on a Function in a Module?",
    got: "BETA 983: clean. The documented placement holds.",
    clean: "the documented placement holds",
    rejected: "`Applicable to: Function` is wrong even for a module function",
    body:
      "Public Module X01_ConstantFoldableNumericsOnly_Module\n" +
      "    [ConstantFoldableNumericsOnly]\n" +
      "    Public Function Probe(ByVal Value As Long) As Long\n" +
      "        Return Value\n" +
      "    End Function\n" +
      "End Module\n",
  },
  {
    tag: "X02_ConstantFoldableNumericsOnly_Class",
    asks: "Is it accepted on a method in a Class? Its sibling [ConstantFoldable] is not.",
    got: "BETA 983: TB5182 on the attribute. REJECTED -- `Applicable to: " +
      "Function` was unqualified and wrong; the entry now carries the `in " +
      "a Module` qualification its sibling always had.",
    clean: "the two siblings differ, and the unqualified `Applicable to: Function` is right",
    rejected: "the line needs the same `in a Module` qualification its sibling carries",
    body:
      "Public Class X02_ConstantFoldableNumericsOnly_Class\n" +
      "    [ConstantFoldableNumericsOnly]\n" +
      "    Public Function Probe(ByVal Value As Long) As Long\n" +
      "        Return Value\n" +
      "    End Function\n" +
      "End Class\n",
  },
  {
    tag: "X03_ConstantFoldable_Class_control",
    asks: "Control: [ConstantFoldable] on a Class method, already known to be rejected.",
    got: "BETA 983: TB5182 on the attribute, as expected -- the same code " +
      "X02 drew, which is what makes X02's result readable.",
    clean: "the earlier finding has regressed or was wrong -- re-check it before trusting X02",
    rejected: "expected; this is what the X02 diagnostic should be compared against",
    body:
      "' Control probe. This placement is already known to be rejected, and it is\n" +
      "' here so X02's result can be read against a diagnostic of known meaning\n" +
      "' produced by the same build.\n\n" +
      "Public Class X03_ConstantFoldable_Class_control\n" +
      "    [ConstantFoldable]\n" +
      "    Public Function Probe(ByVal Value As Long) As Long\n" +
      "        Return Value\n" +
      "    End Function\n" +
      "End Class\n",
  },
  {
    tag: "X04_CompilerOptions_Module",
    asks: "Is [CompilerOptions(\"\")] accepted on a procedure, and is an empty string a legal option set?",
    got: "BETA 983: clean. The documented placement holds and an empty " +
      "option string is accepted.",
    clean: "the documented placement holds and the argument may be empty",
    rejected: "read the diagnostic: a placement complaint answers the `Applicable to:` " +
      "line, an argument complaint may name the option vocabulary, which is " +
      "documented nowhere",
    body:
      "Public Module X04_CompilerOptions_Module\n" +
      '    [CompilerOptions("")]\n' +
      "    Public Sub Probe()\n" +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X05_ComExport_Module_Sub",
    asks: "Does [ComExport] exist as an attribute? It sits beside DllExport in the " +
      "compiler's token table and appears nowhere in docs/ or in any shipped package.",
    got: "BETA 983: TB5155 on the attribute. REJECTED on a procedure.",
    clean: "it exists and is accepted on a procedure in a Module",
    rejected: "either it is not an attribute, or not one for a procedure",
    body:
      "Public Module X05_ComExport_Module_Sub\n" +
      "    [ComExport]\n" +
      "    Public Sub Probe()\n" +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X06_ComExport_Const",
    asks: "[ComExport] on a Const -- the target [DllExport] turned out to mean.",
    got: "BETA 983: clean. [ComExport] mirrors [DllExport] exactly -- " +
      "constants, not procedures. Now documented.",
    clean: "it mirrors DllExport, which documents constants",
    rejected: "it does not mirror DllExport on this target",
    body:
      "Public Module X06_ComExport_Const\n" +
      "    [ComExport]\n" +
      "    Public Const ProbeConst As Long = 1\n" +
      "End Module\n",
  },
  {
    tag: "X07_ImplementsViaPrivateFriendlies",
    asks: "Does [ImplementsViaPrivateFriendlies] exist? It sits beside " +
      "WithDispatchForwarding in the token table, which is used 44 times on an " +
      "Implements statement.",
    got: "BETA 983: TB5155 on the attribute. REJECTED -- it does NOT take " +
      "its neighbour's position, so the placement is still unknown.",
    clean: "it exists and takes the same position as its neighbour",
    rejected: "it is not an attribute for an Implements statement",
    body:
      "Public Interface IX07Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "Public Class X07_ImplementsViaPrivateFriendlies\n" +
      "    [ImplementsViaPrivateFriendlies] Implements IX07Probe\n\n" +
      "    Private Sub IX07Probe_Ping() Implements IX07Probe.Ping\n" +
      "    End Sub\n" +
      "End Class\n",
  },
  {
    tag: "X08_ExecuteHostCommand_Module",
    asks: "Does [ExecuteHostCommand] exist? The token table has it next to IdeButton, " +
      "and the binary also carries a `custom/executeHostCommand` JSON-RPC method, " +
      "so it is probably an IDE-addin hook rather than a compiler directive.",
    got: "BETA 983: TB5182 on the attribute. REJECTED on a procedure in a " +
      "Module; placement still unknown.",
    clean: "it is accepted on a procedure in a Module, like IdeButton",
    rejected: "it needs an argument, a different target, or is not an attribute",
    body:
      "Public Module X08_ExecuteHostCommand_Module\n" +
      "    [ExecuteHostCommand]\n" +
      "    Public Sub Probe()\n" +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X09_Library_DispInterface",
    asks: "What is the `Library` block, and is [DispInterface] accepted on an " +
      "Interface inside one? `Attributes.md` claims exactly this placement. No " +
      "hand-written source in any package uses it -- `Library`/`End Library` and " +
      "[LibraryId(\"\")] appear in the compiler alongside `' Original type " +
      "library:`, which suggests the construct is emitted when a COM type " +
      "library is imported rather than written by hand.",
    got: "BETA 983: TB5182 on lines 10, 11, 12 and 16 -- `[LibraryId(...)]`, " +
      "`Library`, `[DispInterface]` and `End Library`. Lines 13-15, the " +
      "nested Interface, parsed cleanly, so the failure is the Library " +
      "scaffolding and not this reconstruction of the Interface. That " +
      "matches what the entry already says: the construct is generated " +
      "for a COM reference and cannot be written by hand.",
    clean: "the documented placement holds and the block can be hand-written",
    rejected: "read the diagnostic: a syntax complaint means the block shape below is " +
      "wrong and the attribute is untested; a placement complaint answers the line",
    body:
      "' The Library block shape here is reconstructed from the compiler's own\n" +
      "' strings, not copied from a working source, because no shipped package\n" +
      "' contains one. If this does not parse, the attribute is still unprobed.\n\n" +
      '[LibraryId("00000000-0000-4000-8000-000000000901")]\n' +
      "Library X09ProbeLib\n" +
      "    [DispInterface]\n" +
      "    Interface IX09ProbeDisp\n" +
      "        Sub Ping()\n" +
      "    End Interface\n" +
      "End Library\n",
  },
  {
    tag: "X10_Library_DualInterface",
    asks: "Same question for [DualInterface].",
    got: "BETA 983: TB5182 on lines 6, 7, 8 and 12 -- the same shape as X09.",
    clean: "the documented placement holds",
    rejected: "as X09 -- distinguish a syntax complaint from a placement one",
    body:
      '[LibraryId("00000000-0000-4000-8000-000000000910")]\n' +
      "Library X10ProbeLib\n" +
      "    [DualInterface]\n" +
      "    Interface IX10ProbeDual\n" +
      "        Sub Ping()\n" +
      "    End Interface\n" +
      "End Library\n",
  },
  {
    tag: "X11_DispInterface_plain_Interface",
    asks: "Is [DispInterface] accepted on an ordinary Interface, outside a Library? " +
      "If it is, the `in a Library` qualification on its line is wrong.",
    got: "BETA 983: TB5182 on the attribute. REJECTED, so the `in a Library` " +
      "qualification is real rather than incidental.",
    clean: "the qualification is wrong, or at least not required",
    rejected: "the qualification is real, and X09 is the only way to reach the attribute",
    body:
      "[DispInterface]\n" +
      "Public Interface IX11ProbeDisp\n" +
      "    Sub Ping()\n" +
      "End Interface\n",
  },

  // ---- second round -------------------------------------------------------
  // [ImplementsViaPrivateFriendlies] and [ExecuteHostCommand] are the two names
  // the first round left unplaced. Both are in the compiler's token table and
  // neither occurs in any package or sample, so there is no usage to copy; these
  // sweep the remaining plausible targets rather than guess at one.
  {
    tag: "X12_ImplementsViaPrivateFriendlies_Class",
    asks: "[ImplementsViaPrivateFriendlies] on the Class rather than on its Implements " +
      "statement. The name reads as a policy for how a class implements its interfaces, " +
      "which would be a whole-class setting.",
    got: "BETA 983: TB5182 on the attribute. REJECTED on the Class too.",
    clean: "it is a class-level attribute, and X07 tried the wrong target",
    rejected: "not the class either; try the interface side",
    body:
      "Public Interface IX12Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "[ImplementsViaPrivateFriendlies]\n" +
      "Public Class X12_ImplementsViaPrivateFriendlies_Class\n" +
      "    Implements IX12Probe\n\n" +
      "    Private Sub IX12Probe_Ping() Implements IX12Probe.Ping\n" +
      "    End Sub\n" +
      "End Class\n",
  },
  {
    tag: "X13_ImplementsViaPrivateFriendlies_Interface",
    asks: "Same attribute on the Interface being implemented, which would make it the " +
      "interface author's choice rather than the implementor's.",
    got: "BETA 983: TB5182 on the attribute. REJECTED on the Interface too, " +
      "so all three plausible targets are exhausted and the placement is " +
      "a question for the maintainer.",
    clean: "it belongs on the Interface",
    rejected: "neither side of an Implements relationship takes it",
    body:
      "[ImplementsViaPrivateFriendlies]\n" +
      "Public Interface IX13Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n",
  },
  {
    tag: "X14_ExecuteHostCommand_Class_Sub",
    asks: "[ExecuteHostCommand] on a method in a Class. The binary pairs the name with a " +
      "`custom/executeHostCommand` JSON-RPC method, so it is likely an addin hook, and an " +
      "addin's entry points are class methods rather than module procedures.",
    got: "BETA 983: TB5182 on the attribute. REJECTED on a class method.",
    clean: "it is a class-method attribute",
    rejected: "not a bare attribute on a class method; it may need an argument",
    body:
      "Public Class X14_ExecuteHostCommand_Class_Sub\n" +
      "    [ExecuteHostCommand]\n" +
      "    Public Sub Probe()\n" +
      "    End Sub\n" +
      "End Class\n",
  },
  {
    tag: "X15_ExecuteHostCommand_with_argument",
    asks: "[ExecuteHostCommand(\"probe\")] -- the same attribute with a String argument, on " +
      "the same target as [IdeButton], whose entry it sits beside in the token table and " +
      "which takes a caption.",
    got: "BETA 983: TB5182 on the attribute, at the same column as the bare " +
      "form in X08, so the argument is not what X08 was missing. Three " +
      "targets tried, all rejected; a question for the maintainer.",
    clean: "it takes a String argument, and the bare form in X08 failed for want of one",
    rejected: "read the diagnostic: complaining about the argument rather than the " +
      "placement would say the target is right and the argument type is not",
    body:
      "Public Module X15_ExecuteHostCommand_with_argument\n" +
      '    [ExecuteHostCommand("probe")]\n' +
      "    Public Sub Probe()\n" +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X17_Source_without_Default",
    asks: "Is [Source] accepted on a CoClass interface on its own? Every one of the six " +
      "uses in the packages is `[Default, Source]`, so the entry written for it cannot " +
      "say whether the pairing is required or merely universal.",
    got: "BETA 983: clean. [Source] works without [Default], so the " +
      "universal pairing in the packages is a convention rather than a " +
      "requirement. The entry now says so instead of recording it as " +
      "unknown.",
    clean: "the two are independent, and [Source] marks an events interface by itself",
    rejected: "[Source] requires [Default], and the entry should say so",
    body:
      "Public Interface IX17Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "Public Interface IX17ProbeEvents\n" +
      "    Sub Pinged()\n" +
      "End Interface\n\n" +
      "Public CoClass X17_Source_without_Default\n" +
      "    [Default] Interface IX17Probe\n" +
      "    [Source] Interface IX17ProbeEvents\n" +
      "End CoClass\n",
  },
  {
    tag: "X16_ComExport_True",
    asks: "Does [ComExport] take the optional Boolean its sibling [DllExport] does? The " +
      "entry written for it claims no argument, because only the bare form was probed.",
    got: "BETA 983: clean. [ComExport] DOES take the optional Boolean, and " +
      "the entry written from X06 alone was wrong to give it no argument. " +
      "Corrected.",
    clean: "the entry should read `[ComExport [ ( True | False ) ]]`, like DllExport's",
    rejected: "the bare form is the whole syntax, and the entry as written is right",
    body:
      "Public Module X16_ComExport_True\n" +
      "    [ComExport(True)]\n" +
      "    Public Const ProbeConst As Long = 1\n" +
      "End Module\n",
  },
];

const pad = (n, width) => String(n).padStart(width, "0");

function attrText(name, idx) {
  if (GUID_ATTRS.has(name)) return `[${name}("00000000-0000-0000-0000-${pad(idx, 12)}")]`;
  if (Object.hasOwn(FIXED_ARGS, name)) return `[${name}${FIXED_ARGS[name]}]`;
  if (name === "TypeHint") return `[TypeHint(ProbeHintEnum${pad(idx, 3)})]`;
  return `[${name}]`;
}

// ----------------------------------------------------------------- targets
// Ordered: the specific phrasings must win over the bare ones.
// Phrasings that must be matched against the WHOLE `Applicable to:` line, before
// it is split on commas and "and". Splitting first turns "variables and
// procedures in a Class" into "variables" -- which falls through to the bare
// `/variable/i` rule and probes a MODULE variable, the opposite of what the line
// says.
//
// Only patterns that themselves span a comma or an "and" belong here, and that
// restriction is load-bearing: a rule general enough to match an ordinary line
// would win before the split and throw the line's other targets away. Trying
// every RULE against the whole string first was the first attempt, and it
// silently reduced "Class, Module, procedure" to Class alone.
const WHOLE_PHRASE_RULES = [
  [/variables?\s+and\s+procedures?\s+in\s+a\s+class/i, ["VAR_CLASS", "PROC_CLASS"]],
  [/function\s+in\s+a\s+module,\s*returning\s+a\s+boolean/i, ["FUNC_MODULE_BOOL"]],
];

const RULES = [
  [/interface\s+in\s+a\s+library/i, ["LIBRARY_INTERFACE"]],
  // Added with the attributes the package census turned up. Each sits before
  // the generic rule it would otherwise fall through to: a "prototype in an
  // Interface" reaches `/procedure/i` and probes a module Sub, and an
  // "Interface declaration within a CoClass" reaches `/^interface\b/i` and
  // probes a free-standing Interface, which is exactly the placement the line
  // is distinguishing itself from.
  [/prototype\s+in\s+an\s+interface/i, ["PROC_INTERFACE"]],
  [/interface\s+declaration\s+within\s+a\s+coclass/i, ["COCLASS_INTERFACE"]],
  [/implements\s+statement/i, ["IMPLEMENTS"]],
  [/event\s+declaration\s+in\s+a\s+class/i, ["EVENT_CLASS"]],
  [/(procedure|method)\s+in\s+an\s+interface/i, ["PROC_INTERFACE"]],
  [/procedure\s+in\s+a\s+class\s+or\s+module/i, ["PROC_CLASS", "PROC_MODULE"]],
  [/procedure\s+in\s+a\s+class/i, ["PROC_CLASS"]],
  [/function\s+in\s+a\s+module/i, ["FUNC_MODULE"]],
  [/procedure\s+parameter/i, ["PARAM"]],
  [/variable.*\bin\s+a\s+class/i, ["VAR_CLASS"]],
  [/variable.*\bin\s+a\s+module/i, ["VAR_MODULE"]],
  [/variable/i, ["VAR_MODULE"]],
  [/declare|api\s+declaration/i, ["DECLARE"]],
  [/^type\b/i, ["TYPE"]],
  [/^enum\b/i, ["ENUM"]],
  // "Const", but also "constants in a module." -- \b after "const" fails on
  // the plural, which silently dropped a target until it was noticed.
  [/^const(ant)?s?\b/i, ["CONST"]],
  [/^sub\b/i, ["SUB_MODULE"]],
  [/^function\b/i, ["FUNC_MODULE"]],
  [/^coclass\b/i, ["COCLASS"]],
  [/^class\b/i, ["CLASS"]],
  [/^module\b/i, ["MODULE"]],
  [/^interface\b/i, ["INTERFACE"]],
  [/procedure/i, ["PROC_MODULE"]],
];

// Python's str.strip(".") removes every leading and trailing dot, not one.
const stripDots = (s) => s.replace(/^\.+/, "").replace(/\.+$/, "");

function parseTargets(app) {
  const out = [];
  const whole = stripDots(app.trim()).trim();
  for (const [pattern, targets] of WHOLE_PHRASE_RULES) {
    if (pattern.test(whole)) return [...targets];
  }
  for (const phrase of app.split(/,|\band\b/)) {
    const p = stripDots(phrase.trim()).trim();
    if (!p) continue;
    for (const [pattern, targets] of RULES) {
      if (pattern.test(p)) {
        for (const t of targets) if (!out.includes(t)) out.push(t);
        break;
      }
    }
  }
  return out;
}

// --------------------------------------------------------------- renderers
// Returns the body of a .twin file placing `attr` at `target`.
//
// Enum names are made unique per probe. A Public Enum's name and its members
// are project-global, so two probes both declaring `ProbeEnum` collide with
// TB5000 `duplicate definition in the current scope` -- which reads like a
// finding and is not one. Module Subs named `Probe` do NOT collide, so the
// uniqueness is needed for enums only.
function render(target, tag, attr, needsHintEnum, idx) {
  const hint = needsHintEnum
    ? `\n    Public Enum ProbeHintEnum${pad(idx, 3)}\n` +
      `        ProbeHintValue${pad(idx, 3)} = 1\n    End Enum\n`
    : "";

  switch (target) {
    case "MODULE":
      return `${attr}\nPublic Module ${tag}\nEnd Module\n`;
    case "CLASS":
      return `${attr}\nPublic Class ${tag}\nEnd Class\n`;
    case "INTERFACE":
      return `${attr}\nPublic Interface ${tag}\n    Sub Ping()\nEnd Interface\n`;
    case "COCLASS":
      return `Public Interface ${tag}_Iface\n    Sub Ping()\nEnd Interface\n\n` +
        `${attr}\nPublic CoClass ${tag}\n    Interface ${tag}_Iface\nEnd CoClass\n`;
    case "PROC_MODULE":
    case "SUB_MODULE":
      return `Public Module ${tag}\n${hint}    ${attr}\n    Public Sub Probe()\n    End Sub\n` +
        "End Module\n";
    case "FUNC_MODULE":
      return `Public Module ${tag}\n${hint}    ${attr}\n    Public Function Probe() As Long\n` +
        "    End Function\nEnd Module\n";
    // A Function whose return type the line specifies. [RunBeforeStartupObject]
    // is documented as returning a Boolean, and the generic FUNC_MODULE
    // skeleton returns Long, so probing it with that would test a signature
    // the documentation does not claim.
    case "FUNC_MODULE_BOOL":
      return `Public Module ${tag}\n${hint}    ${attr}\n` +
        "    Public Function Probe() As Boolean\n    End Function\nEnd Module\n";
    // An Interface line inside a CoClass, which is a different placement from a
    // free-standing Interface -- [Default] and [Source] take this one and not
    // that one.
    case "COCLASS_INTERFACE":
      return `Public Interface ${tag}_Iface\n    Sub Ping()\nEnd Interface\n\n` +
        `Public CoClass ${tag}\n    ${attr} Interface ${tag}_Iface\nEnd CoClass\n`;
    case "IMPLEMENTS":
      return `Public Interface ${tag}_Iface\n    Sub Ping()\nEnd Interface\n\n` +
        `Public Class ${tag}\n    ${attr} Implements ${tag}_Iface\n\n` +
        `    Private Sub ${tag}_Iface_Ping() Implements ${tag}_Iface.Ping\n` +
        "    End Sub\nEnd Class\n";
    case "EVENT_CLASS":
      return `Public Class ${tag}\n${hint}    ${attr}\n    Public Event Probed()\nEnd Class\n`;
    case "PROC_CLASS":
      return `Public Class ${tag}\n${hint}    ${attr}\n    Public Sub Probe()\n    End Sub\n` +
        "End Class\n";
    case "PROC_INTERFACE":
      return `Public Interface ${tag}\n${hint}    ${attr}\n    Sub Probe()\nEnd Interface\n`;
    case "DECLARE":
      return `Public Module ${tag}\n    ${attr}\n    Public Declare Function Probe Lib ` +
        '"kernel32" Alias "GetTickCount" () As Long\nEnd Module\n';
    case "TYPE":
      return `Public Module ${tag}\n    ${attr}\n    Public Type ProbeUdt\n` +
        "        Field1 As Long\n    End Type\nEnd Module\n";
    case "ENUM":
      // [PopulateFrom] fills the enum from a .json resource, so its probe must
      // leave the body empty -- Sample 22 declares `Enum EVENTS / End Enum`.
      // Seeding a member would put a hand-written value beside compiler-emitted
      // ones and test two things at once.
      if (attr.startsWith("[PopulateFrom")) {
        return `Public Module ${tag}\n    ${attr}\n    Public Enum ProbeEnum${pad(idx, 3)}\n` +
          "    End Enum\nEnd Module\n";
      }
      return `Public Module ${tag}\n    ${attr}\n    Public Enum ProbeEnum${pad(idx, 3)}\n` +
        `        ProbeValue${pad(idx, 3)} = 1\n    End Enum\nEnd Module\n`;
    case "CONST":
      return `Public Module ${tag}\n${hint}    ${attr}\n    Public Const ProbeConst As Long = 1\n` +
        "End Module\n";
    case "VAR_CLASS":
      return `Public Class ${tag}\n${hint}    ${attr}\n    Public ProbeVar As Long\nEnd Class\n`;
    case "VAR_MODULE":
      return `Public Module ${tag}\n${hint}    ${attr}\n    Public ProbeVar As Long\nEnd Module\n`;
    case "PARAM":
      return `Public Module ${tag}\n${hint}    Public Sub Probe(${attr} ByVal Value As Long)\n` +
        "    End Sub\nEnd Module\n";
    default:
      return null;
  }
}

const HUMAN = {
  MODULE: "on a Module", CLASS: "on a Class", INTERFACE: "on an Interface",
  COCLASS: "on a CoClass", PROC_MODULE: "on a Sub in a Module",
  SUB_MODULE: "on a Sub in a Module", FUNC_MODULE: "on a Function in a Module",
  PROC_CLASS: "on a Sub in a Class",
  PROC_INTERFACE: "on a prototype in an Interface",
  DECLARE: "on a Declare", TYPE: "on a Type (UDT)", ENUM: "on an Enum",
  CONST: "on a Const", VAR_CLASS: "on a variable in a Class",
  VAR_MODULE: "on a variable in a Module", PARAM: "on a procedure parameter",
  LIBRARY_INTERFACE: "on an Interface in a Library",
  FUNC_MODULE_BOOL: "on a Boolean Function in a Module",
  COCLASS_INTERFACE: "on an Interface line inside a CoClass",
  IMPLEMENTS: "on an Implements statement in a Class",
  EVENT_CLASS: "on an Event in a Class",
};

// Built as an object and serialised, rather than held as a literal blob, so the
// backslashes in the paths are escaped by JSON.stringify rather than by hand.
// Tab indent and key order match what the IDE writes.
const SETTINGS_OBJ = {
  "configuration.inherits": "Defaults",
  "project.appTitle": "Attribute placement probes",
  "project.buildPath": "${SourcePath}\\Build\\${ProjectName}_${Architecture}.${FileExtension}",
  "project.buildType": "Standard EXE",
  "project.description": "Generated from docs/Reference/Attributes.md. Every module is expected to compile; a diagnostic is a finding.",
  "project.exportPathIsV2": true,
  "project.id": "{A77B1BE0-0000-4000-8000-000000000001}",
  "project.name": "AttributeProbes",
  "project.optionExplicit": true,
  "project.references": [
    {
      id: "{00020430-0000-0000-C000-000000000046}",
      lcid: 0,
      name: "OLE Automation",
      path32: "C:\\Windows\\SysWOW64\\stdole2.tlb",
      path64: "C:\\Windows\\System32\\stdole2.tlb",
      symbolId: "stdole",
      versionMajor: 2,
      versionMinor: 0,
    },
    {
      hasBeenSplit: true,
      id: "{F50B82D0-DCAB-43FE-9631-11959D4A4728}",
      isCompilerPackage: true,
      licence: "MIT",
      name: "[COMPILER PACKAGE] twinBASIC - VB Compatibility Package (Forms)",
      path32: "",
      path64: "",
      publisher: "TWINBASIC-COMPILER",
      symbolId: "VB",
      versionBuild: 0,
      versionMajor: 0,
      versionMinor: 0,
      versionRevision: 31,
    },
  ],
  "project.settingsVersion": 1,
  "project.startupObject": "Sub Main",
  "project.warnings": { errors: [], hints: [], ignored: [], info: [], warnings: [] },
  "runtime.useUnicodeStandardLibrary": true,
};
const SETTINGS = JSON.stringify(SETTINGS_OBJ, null, "\t") + "\n";

// The .twin sources are written CRLF; the Settings blob and the key are written
// exactly as composed.
const writeCrlf = (file, text) => fs.writeFile(file, text.replace(/\n/g, "\r\n"), "utf8");
const writeRaw = (file, text) => fs.writeFile(file, text, "utf8");

const MAIN_TWIN = "' Startup object for the probe project. Does nothing.\n\n" +
  "Module ProbeMain\n    Public Sub Main()\n    End Sub\nEnd Module\n";

async function main(argv) {
  if (argv.length < 1) {
    console.log(USAGE);
    return 2;
  }
  const out = argv[0];
  // The key must land OUTSIDE the tree: anything inside it gets packed into the
  // .twinproj and shows up as a stray file in the project.
  const keyPath = argv[1] ?? path.join(path.dirname(path.resolve(out)), "probe-key.md");
  const srcDir = path.join(out, "Sources");
  const overflowSrc = path.join(out + "-2", "Sources");
  await fs.mkdir(srcDir, { recursive: true });

  const entries = await parseAttributes(DOCS);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const probes = [];
  const overflow = [];
  const skipped = [];
  const noApp = [];
  let idx = 0;

  // Write one probe. Returns the tag, or null if it could not be built.
  async function emit(e, target, note, seenSingleton) {
    idx += 1;
    const tag = `P${pad(idx, 3)}_${e.name}_${target}`;
    const body = render(target, tag, attrText(e.name, idx), e.name === "TypeHint", idx);
    if (body === null) {
      skipped.push([e, `no skeleton for target ${target}`]);
      idx -= 1;
      return null;
    }
    const why = note ? `' ${note}\n` : "";
    const header = `' ${tag} -- [${e.name}] ${HUMAN[target]}\n` +
      `' Attributes.md:${e.line} -- ` +
      (e.app ? `"Applicable to: ${e.app}"` : "no `Applicable to:` line") +
      `\n${why}` +
      "' Expected: compiles clean.\n\n";
    const targetDir = seenSingleton ? overflowSrc : srcDir;
    await writeCrlf(path.join(targetDir, tag + ".twin"), header + body);
    (seenSingleton ? overflow : probes).push([tag, e, target]);
    return tag;
  }

  const singletonUsed = new Set();
  for (const e of entries) {
    if (!e.app) {
      noApp.push(e);
      continue;
    }
    if (Object.hasOwn(UNSYNTHESISABLE, e.name)) {
      skipped.push([e, UNSYNTHESISABLE[e.name]]);
      continue;
    }
    if (Object.hasOwn(NOT_FAITHFULLY_PROBEABLE, e.name)) {
      skipped.push([e, NOT_FAITHFULLY_PROBEABLE[e.name]]);
      continue;
    }
    for (const target of parseTargets(e.app)) {
      if (target === "LIBRARY_INTERFACE") {
        // Not a gap. The entries say the attribute is emitted into the Library
        // modules twinBASIC generates for a COM reference and "cannot be
        // manually created", and the compiler agrees: the X09/X10 probes had
        // `Library`, `End Library` and `[LibraryId(...)]` all rejected with
        // TB5182 while the Interface nested inside parsed cleanly, and X11 had
        // [DispInterface] rejected on an ordinary Interface. The placement is
        // real and unreachable from project source, so there is nothing here a
        // probe can assert.
        skipped.push([e, "the placement exists only in compiler-generated Library " +
          "modules, which project source cannot declare -- confirmed by the X09/X11 probes"]);
        continue;
      }
      let second = false;
      if (Object.hasOwn(SINGLETON, e.name)) {
        if (singletonUsed.has(e.name)) {
          second = true;
          await fs.mkdir(overflowSrc, { recursive: true });
        }
        singletonUsed.add(e.name);
      }
      await emit(e, target, second ? SINGLETON[e.name] : null, second);
    }
  }

  for (const [name, target, note] of EXTRA_PROBES) {
    const e = byName.get(name);
    if (e) await emit(e, target, note, false);
  }

  await writeCrlf(path.join(srcDir, "_ProbeMain.twin"), MAIN_TWIN);
  await writeCrlf(path.join(srcDir, "_ProbeFactory.twin"), PROBE_FACTORY_TWIN);
  await writeRaw(path.join(out, "Settings"), SETTINGS);

  // Resource folders the argument forms point at. Named to match the paths in
  // FIXED_ARGS; the leading `/` in those paths is project-root-relative, and
  // the lookup is case-insensitive (the packages write `/miscellaneous/` for a
  // folder the IDE shows as `Miscellaneous`).
  await fs.mkdir(path.join(out, "Miscellaneous"), { recursive: true });
  await fs.writeFile(path.join(out, "Miscellaneous", "probe.png"), PROBE_PNG);
  await fs.mkdir(path.join(out, "Resources", "PROBE"), { recursive: true });
  await writeRaw(path.join(out, "Resources", "PROBE", "Strings.json"), PROBE_STRINGS_JSON);
  if (overflow.length) {
    await writeCrlf(path.join(overflowSrc, "_ProbeMain.twin"), MAIN_TWIN);
    await writeRaw(
      path.join(out + "-2", "Settings"),
      SETTINGS.replaceAll("AttributeProbes", "AttributeProbes2")
        .replaceAll("000000000001", "000000000002"),
    );
  }

  // The exploratory project. Separate because its probes are questions rather
  // than claims, so a red build here is a result and a red build in
  // AttributeProbes is a documentation defect. Merging them would cost that
  // distinction, which is the only thing making either build readable.
  const exploreSrc = path.join(out + "-explore", "Sources");
  await fs.mkdir(exploreSrc, { recursive: true });
  for (const x of EXPLORATORY) {
    const header =
      `' ${x.tag}\n` +
      `' ASKS     : ${x.asks}\n` +
      `' CLEAN    : ${x.clean}\n` +
      `' REJECTED : ${x.rejected}\n\n`;
    await writeCrlf(path.join(exploreSrc, x.tag + ".twin"), header + x.body);
  }
  await writeCrlf(path.join(exploreSrc, "_ProbeMain.twin"), MAIN_TWIN);
  await writeRaw(
    path.join(out + "-explore", "Settings"),
    SETTINGS.replaceAll("AttributeProbes", "AttributeExplore")
      .replaceAll("000000000001", "000000000003"),
  );

  const distinct = new Set(probes.map((p) => p[1].name));
  const k = [];
  k.push("# Attribute placement probes -- key\n\n");
  k.push("Generated from `docs/Reference/Attributes.md` by " +
    `\`scripts/gen_attribute_probes.mjs\`. ${probes.length} probes over ` +
    `${distinct.size} attributes.\n\n`);
  k.push("**Every probe is expected to compile.** Each applies one attribute at one " +
    "placement `Attributes.md` says is legal, in its own source file. A clean " +
    "build means all of those claims hold.\n\n");
  k.push("A diagnostic naming a probe module is a finding. The one to look for is " +
    "`This attribute is not supported in this context`, which says the " +
    "`Applicable to:` line is wrong. Any other diagnostic more likely means the " +
    "probe itself is malformed.\n\n");
  k.push("| Probe | Attribute | Placement | Attributes.md |\n|---|---|---|---|\n");
  for (const [tag, e, target] of probes) {
    k.push(`| \`${tag}\` | \`[${e.name}]\` | ${HUMAN[target]} | line ${e.line} |\n`);
  }
  k.push("\n## Expected diagnostics that are not findings\n\n");
  k.push("- `[COMControl]` on an Interface draws two TB0013 recommendations, to " +
    "specify `[InterfaceId()]` and `[EventInterfaceId()]`. They are advice about " +
    "stable COM ids, not a placement failure, and the probe deliberately omits " +
    "both rather than risk testing two attributes at once.\n");
  if (overflow.length) {
    k.push("\n## Second project\n\n");
    k.push("These placements cannot share a project with the ones above, so they " +
      "are packed separately as `AttributeProbes2`. Build it the same way.\n\n");
    k.push("| Probe | Attribute | Placement | Why separate |\n|---|---|---|---|\n");
    for (const [tag, e, target] of overflow) {
      k.push(`| \`${tag}\` | \`[${e.name}]\` | ${HUMAN[target]} | ${SINGLETON[e.name]} |\n`);
    }
  }
  k.push("\n## Third project -- `AttributeExplore`\n\n");
  k.push("**The opposite contract: a diagnostic here is the answer, not a defect.** " +
    "These ask questions `Attributes.md` cannot answer and no shipped package " +
    "demonstrates, so no placement is expected. Build it and record what each " +
    "one does; each source file carries its own `ASKS` / `CLEAN` / `REJECTED` " +
    "header saying how to read its result.\n\n");
  k.push("| Probe | Asks | Last recorded result |\n|---|---|---|\n");
  for (const x of EXPLORATORY) {
    k.push(`| \`${x.tag}\` | ${x.asks} | ${x.got ?? "*not yet run*"} |\n`);
  }
  if (skipped.length) {
    k.push("\n## Not probed\n\n");
    for (const [e, why] of skipped) k.push(`- **\`[${e.name}]\`** (line ${e.line}) -- ${why}\n`);
  }
  if (noApp.length) {
    k.push("\n## No `Applicable to:` line in the documentation\n\n");
    k.push("These entries state no placement at all, so there is nothing to verify " +
      "and nothing for a reader to rely on:\n\n");
    for (const e of noApp) k.push(`- **\`[${e.name}]\`** (line ${e.line})\n`);
  }
  await writeRaw(keyPath, k.join(""));

  console.log(`probes written : ${probes.length}`);
  console.log(`attributes     : ${distinct.size}`);
  console.log(`exploratory    : ${EXPLORATORY.length}`);
  console.log(`not probed     : ${skipped.length}`);
  console.log(`no Applicable  : ${noApp.length}`);
  console.log(`key            : ${keyPath}`);
  return 0;
}

process.exit(await main(process.argv.slice(2)));
