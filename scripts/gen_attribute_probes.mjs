#!/usr/bin/env node
// Generate a twinBASIC probe project for Reference/Attributes.md applicability.
//
//     node scripts/gen_attribute_probes.mjs <out_dir> [key.md]
//
// `Attributes.md` states an `Applicable to:` line for 52 of its 57 attributes,
// and none of them had been checked against the compiler --- the one that was
// checked turned out to be wrong. twinBASIC cannot compile a project from the
// command line (see Features/Packages/Import-Export-Tool), so this does the
// next best thing: it writes one source file per claimed target, so a single
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
//   <out_dir>-2         AttributeProbes2  -- the same, for targets that
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
import { parseAttributes, parseTargets } from "./lib/attributes-doc.mjs";
import { MAIN_TWIN, NOT_FAITHFULLY_PROBEABLE, PROBE_FACTORY_TWIN, SETTINGS, UNSYNTHESISABLE, attrText, pad, writeCrlf, writeProbeResources, writeRaw } from "./lib/attribute-probe-kit.mjs";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { DOCS_DIR } from "../lib/repo-paths.mjs";

exitOnCrash();

const ATTR_DOC = path.join(DOCS_DIR, "Reference", "Attributes.md");

const USAGE = `Generate a twinBASIC probe project for Reference/Attributes.md applicability.

    node scripts/gen_attribute_probes.mjs <out_dir> [key.md] [-h, --help]

Writes one source file per claimed attribute target, plus a key naming the
Attributes.md line each probe came from. Every probe is expected to compile; a
diagnostic naming a probe module is a finding.

  <out_dir>   the folder to write the probe project into
  key.md      where to write the key (default: probe-key.md beside <out_dir>)
  -h, --help  print this text and exit

A folder or key that starts with a dash is given after \`--\`.

Exit codes:
  0  the probe project and the key were written
  2  a refused command line, or a crash`;

// The argument shapes, the resource files they point at and the project's
// Settings are shared with sweep_attributes.mjs: see lib/attribute-probe-kit.mjs.

// NOT_FAITHFULLY_PROBEABLE and UNSYNTHESISABLE live in lib/attribute-probe-kit.mjs,
// where sweep_attributes.mjs reads them too.

// Attributes the compiler allows only once per project, so their second and
// later targets cannot share a project with the first. TB5114 for
// [RunAfterBuild].
const SINGLETON = {
  RunAfterBuild: "the compiler allows only one [RunAfterBuild] per project",
};

// Targets a page's own worked example uses but its `Applicable to:` line does
// not name. Expected to compile for the same reason: the page says so.
//
// The DllExport entry was the case this existed for: the line said "variables",
// the example used a Public Const, and probing both settled it -- the variable
// is rejected (TB5155), the Const compiles. The line now says "constants", so
// the ordinary target parser covers it and no extra probe is needed.
//
// [IgnoreWarnings] was here for one round, because its entry stated no
// `Applicable to:` line and the target parser therefore yielded nothing to
// test. Those three probes compiled, and the line the entry was missing has
// been written from them plus the 113 package uses -- so the ordinary target
// parser now covers it and the extra probes would only duplicate themselves.
const EXTRA_PROBES = [];


// ------------------------------------------------------------ exploratory
// A third project, `AttributeExplore`, on the opposite contract to the probes
// above: **a diagnostic here is the answer, not a defect.** These ask questions
// `Attributes.md` cannot answer and no shipped package demonstrates, so there
// is no applicability to expect. Each entry carries what a clean build would
// mean and what a rejection would mean, because a result nobody can read is
// not one.
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
// then compiled clean on a Const. Which of the two codes comes back says
// nothing about existence.
//
// And **the token table does not settle existence either**, which an earlier
// draft of this comment claimed. The table interns keywords, attributes and
// object members together -- `Debug`, `Print` and `Assert` sit in it beside
// `Description` and `DllExport`. `ExecuteHostCommand` is in it and is a member
// of `Debug`, not an attribute, which is why it was rejected in every
// attribute position tried across two rounds. A name in the table is a name
// the compiler knows; what kind of name it is has to be probed.
const EXPLORATORY = [
  {
    tag: "X01_ConstantFoldableNumericsOnly_Module",
    asks: "Is [ConstantFoldableNumericsOnly] accepted on a Function in a Module?",
    got: "BETA 983: clean. The documented applicability holds.",
    clean: "the documented applicability holds",
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
      "' Control probe. This is already known to be rejected, and it is\n" +
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
    got: "BETA 983: clean. The documented applicability holds and an empty " +
      "option string is accepted.",
    clean: "the documented applicability holds and the argument may be empty",
    rejected: "read the diagnostic: a complaint about where the attribute sits " +
      "answers the `Applicable to:` " +
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
      "its neighbour's position. Settled later by X25: it belongs on the " +
      "`Implements ... Via` form of the statement, not the plain one.",
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
      "Module. Settled later by X19: it is not an attribute at all, but a " +
      "member of Debug.",
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
      "Interface inside one? `Attributes.md` claims exactly this. No " +
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
    clean: "the documented applicability holds and the block can be hand-written",
    rejected: "read the diagnostic: a syntax complaint means the block shape below is " +
      "wrong and the attribute is untested; a complaint about where it sits " +
      "answers the line",
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
    clean: "the documented applicability holds",
    rejected: "as X09 -- distinguish a syntax complaint from an applicability one",
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
    got: "BETA 983: TB5182 on the attribute. REJECTED on the Class too. " +
      "Settled later by X25, on the Implements ... Via statement.",
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
    got: "BETA 983: TB5182 on the attribute. REJECTED on the Interface too. " +
      "Three targets exhausted -- and all three were the wrong question: " +
      "X25 found it on the Implements ... Via statement.",
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
    got: "BETA 983: TB5182 on the attribute. REJECTED on a class method. " +
      "Not an attribute anywhere; see X19.",
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
      "form in X08, so the argument is not what X08 was missing. Not an " +
      "attribute in any position: X19 shows it is a member of Debug.",
    clean: "it takes a String argument, and the bare form in X08 failed for want of one",
    rejected: "read the diagnostic: complaining about the argument rather than the " +
      "applicability would say the target is right and the argument type is not",
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

  // ---- third round ---------------------------------------------------------
  // The two names the first two rounds left unplaced, settled. Both turned on
  // asking a different question rather than trying another target:
  //
  //   [ExecuteHostCommand] is not an attribute at all. The token table mixes
  //   keywords, attributes and object members, and this one is a member of
  //   `Debug` -- X18 to X21 below. The maintainer confirmed it afterwards: a
  //   leftover from the VS Code IDE, never wired to this one, to be removed.
  //
  //   [ImplementsViaPrivateFriendlies] belongs on `Implements ... Via`, the
  //   composition-delegation form, not on the plain `Implements` that X07 and
  //   the round-2 probes tried -- X25 to X28, with the effect pinned down by
  //   the A/B in X29 to X33.
  //
  // One trap on the way, worth stating because it looked like a discovery for
  // several minutes: `Implements IFoo Via PrivateFriendlies` compiles, and
  // means nothing. `Via` is the documented delegation keyword and its operand
  // is a field name, so that line declares a private field that happens to be
  // called PrivateFriendlies. A probe whose text reads like the answer is the
  // one to re-check hardest.
  {
    tag: "X18_Debug_Cls",
    asks: "Does the Debug object have members beyond Print and Assert? The compiler " +
      "binary carries ANSI identifiers DebugClsCommand and DebugExecuteHostCommand " +
      "side by side.",
    got: "BETA 983: clean. Debug.Cls compiles, so the pairing is real -- which " +
      "is what makes X19 readable.",
    clean: "Debug has a wider member set, and X19's premise is worth testing",
    rejected: "the DebugXxxCommand identifiers are not Debug members, and X19 is a guess",
    body:
      "Public Module X18_Debug_Cls\n" +
      "    Public Sub Probe()\n" +
      "        Debug.Cls\n" +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X19_Debug_ExecuteHostCommand",
    asks: "Is ExecuteHostCommand a member of Debug rather than an attribute? X08, X14 " +
      "and X15 rejected it in every attribute position tried.",
    got: "BETA 983: clean. It is a Debug member, so the token table entry was " +
      "never an attribute and Attributes.md was right not to have one.",
    clean: "it is a Debug member; no attribute entry is owed for the name",
    rejected: "it is neither an attribute nor a Debug member",
    body:
      "Public Module X19_Debug_ExecuteHostCommand\n" +
      "    Public Sub Probe()\n" +
      '        Debug.ExecuteHostCommand "tbFile_SaveProject"\n' +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X20_Debug_ExecuteHostCommand_noarg",
    asks: "What is the parameter called? The compiler's string pool has " +
      '"Expected argument: command" immediately after DebugExecuteHostCommand.',
    got: "BETA 983: TB5023 `Expected argument: command` -- the string from the " +
      "binary, produced by the compiler, naming the parameter. This is the " +
      "probe that identifies the binding outright.",
    clean: "the argument is optional",
    rejected: "read the message: naming the parameter identifies the binding",
    body:
      "Public Module X20_Debug_ExecuteHostCommand_noarg\n" +
      "    Public Sub Probe()\n" +
      "        Debug.ExecuteHostCommand\n" +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X21_ExecuteHostCommand_bare_statement",
    asks: "Is it also a statement in its own right, without the Debug prefix?",
    got: "BETA 983: TB5079 `Unrecognized symbol 'ExecuteHostCommand'`. It must " +
      "be qualified.",
    clean: "it is a statement as well as a Debug member",
    rejected: "it is reachable only through Debug",
    body:
      "Public Module X21_ExecuteHostCommand_bare_statement\n" +
      "    Public Sub Probe()\n" +
      '        ExecuteHostCommand "tbFile_SaveProject"\n' +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X22_IVPF_plain_Implements_friendly_body",
    asks: "Was X07 rejected for the attribute or for the class body? This gives the " +
      "plain Implements the unprefixed private member the attribute's name suggests, " +
      "instead of the usual IFoo_Ping stub.",
    got: "BETA 983: TB5155 on the attribute, plus TB5000 `Missing implementation " +
      "of member Sub Ping()`. Two answers: the attribute is rejected on a plain " +
      "Implements whatever the body looks like, and an unprefixed private member " +
      "does not satisfy an interface on its own.",
    clean: "the body was what X07 was short of",
    rejected: "the attribute is what a plain Implements refuses",
    body:
      "Public Interface IX22Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "Public Class X22_IVPF_plain_Implements_friendly_body\n" +
      "    [ImplementsViaPrivateFriendlies] Implements IX22Probe\n\n" +
      "    Private Sub Ping()\n" +
      "    End Sub\n" +
      "End Class\n",
  },
  {
    tag: "X23_IVPF_with_boolean",
    asks: "Does it take the optional Boolean many twinBASIC attributes take? Only the " +
      "bare form had been tried.",
    got: "BETA 983: TB5155 on the attribute, at the same place as the bare form " +
      "in X07 -- so a missing argument was not what X07 was short of either.",
    clean: "it takes a Boolean, and the bare form failed for want of one",
    rejected: "the argument is not what the plain Implements was refusing",
    body:
      "Public Interface IX23Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "Public Class X23_IVPF_with_boolean\n" +
      "    [ImplementsViaPrivateFriendlies(True)] Implements IX23Probe\n\n" +
      "    Private Sub IX23Probe_Ping() Implements IX23Probe.Ping\n" +
      "    End Sub\n" +
      "End Class\n",
  },
  {
    tag: "X24_IVPF_CoClass_interface",
    asks: "On an Interface line inside a CoClass -- the target [Default] and [Source] " +
      "take, and one the earlier rounds did not try.",
    got: "BETA 983: TB5182 on the attribute. Not this target either.",
    clean: "it is a CoClass interface-line attribute",
    rejected: "not a CoClass interface line",
    body:
      "Public Interface IX24Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "Public CoClass X24_IVPF_CoClass_interface\n" +
      "    [ImplementsViaPrivateFriendlies] Interface IX24Probe\n" +
      "End CoClass\n",
  },
  {
    tag: "X25_IVPF_on_Via_delegation",
    asks: "On an `Implements ... Via <field> = <expr>` statement -- the " +
      "composition-delegation form, which every earlier probe had skipped in favour " +
      "of the plain Implements.",
    got: "BETA 983: CLEAN. This is the answer. The attribute belongs on the " +
      "Via form of the statement, which is what its name says and what five " +
      "rejections had not suggested. Documented.",
    clean: "this is its target, and every earlier probe was on the wrong statement",
    rejected: "not the Via form either, and the name is misleading",
    body:
      "Public Interface IX25Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "Public Class CX25Base\n" +
      "    Implements IX25Probe\n\n" +
      "    Private Sub IX25Probe_Ping() Implements IX25Probe.Ping\n" +
      "    End Sub\n" +
      "End Class\n\n" +
      "Public Class X25_IVPF_on_Via_delegation\n" +
      "    [ImplementsViaPrivateFriendlies] Implements IX25Probe Via mBase = New CX25Base\n" +
      "End Class\n",
  },
  {
    tag: "X26_IVPF_on_Via_class",
    asks: "The same attribute on the class-to-class form the Inheritance page shows, " +
      "`Implements <Interface> Via <ClassName>`.",
    got: "BETA 983: clean. Both spellings of the Via statement take it.",
    clean: "both spellings of the Via statement take it",
    rejected: "only the field-and-constructor spelling takes it",
    body:
      "Public Interface IX26Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "Public Class CX26Base\n" +
      "    Implements IX26Probe\n\n" +
      "    Private Sub IX26Probe_Ping() Implements IX26Probe.Ping\n" +
      "    End Sub\n" +
      "End Class\n\n" +
      "Public Class X26_IVPF_on_Via_class\n" +
      "    [ImplementsViaPrivateFriendlies] Implements IX26Probe Via CX26Base\n" +
      "End Class\n",
  },
  {
    tag: "X27_IVPF_on_Inherits",
    asks: "On an Inherits statement -- twinBASIC's other inheritance mechanism.",
    got: "BETA 983: TB5155 on the attribute. Delegation only, not Inherits.",
    clean: "it applies to both inheritance mechanisms",
    rejected: "it is specific to Implements ... Via",
    body:
      "Public Class CX27Base\n" +
      "    Public Sub Ping()\n" +
      "    End Sub\n" +
      "End Class\n\n" +
      "Public Class X27_IVPF_on_Inherits\n" +
      "    [ImplementsViaPrivateFriendlies] Inherits CX27Base\n" +
      "End Class\n",
  },
  {
    tag: "X28_WDF_on_Via_control",
    asks: "Control for X25. [WithDispatchForwarding] is a known-good " +
      "Implements-statement attribute. Does the Via form simply accept any attribute?",
    got: "BETA 983: TB5155 on the attribute. REJECTED -- so the Via form does " +
      "NOT accept attributes indiscriminately, and X25's clean build is about " +
      "that attribute rather than about that statement. This control is what " +
      "makes X25 evidence instead of a coincidence.",
    clean: "the Via form accepts attributes generally, and X25 proves little",
    rejected: "expected; the Via form is selective, which is what makes X25 mean something",
    body:
      "' Control probe. The opposite pairing of X25: this attribute is accepted\n" +
      "' on a plain Implements and rejected here, while\n" +
      "' [ImplementsViaPrivateFriendlies] is rejected there and accepted here.\n\n" +
      "Public Interface IX28Probe\n" +
      "    Sub Ping()\n" +
      "End Interface\n\n" +
      "Public Class CX28Base\n" +
      "    Implements IX28Probe\n\n" +
      "    Private Sub IX28Probe_Ping() Implements IX28Probe.Ping\n" +
      "    End Sub\n" +
      "End Class\n\n" +
      "Public Class X28_WDF_on_Via_control\n" +
      "    [WithDispatchForwarding] Implements IX28Probe Via mBase = New CX28Base\n" +
      "End Class\n",
  },

  // X29 to X33 are the A/B that gives the attribute an effect rather than only
  // a legal position. One source shape, four call sites, the attribute the
  // only thing that varies.
  {
    tag: "X29_Via_Friend_outside_plain",
    asks: "Baseline. Without the attribute, is a Friend member of the delegate callable " +
      "on the delegating class from elsewhere in the project?",
    got: "BETA 983: clean. A plain Via forwards Friend members as Friend, so " +
      "they are reachable project-wide.",
    clean: "a plain Via re-exposes the delegate's Friend members",
    rejected: "it does not, and X30 has nothing to remove",
    body:
      "Public Class CX29Base\n" +
      "    Public Sub PublicPing()\n" +
      "    End Sub\n" +
      "    Friend Sub FriendPing()\n" +
      "    End Sub\n" +
      "End Class\n\n" +
      "Public Class CX29Derived\n" +
      "    Implements CX29Base Via mBase = New CX29Base\n" +
      "End Class\n\n" +
      "Public Module X29_Via_Friend_outside_plain\n" +
      "    Public Sub Probe()\n" +
      "        Dim d As CX29Derived = New CX29Derived\n" +
      "        d.FriendPing\n" +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X30_Via_Friend_outside_attr",
    asks: "The same call with the attribute added, and nothing else changed.",
    got: "BETA 983: TB5027 `Unrecognized member 'FriendPing' on type " +
      "'_CX30Derived'`. Against X29's clean build this is the effect: the " +
      "attribute stops the delegate's Friend members being re-exposed.",
    clean: "the attribute does not affect Friend visibility",
    rejected: "this is the effect -- read it against X29",
    body:
      "Public Class CX30Base\n" +
      "    Public Sub PublicPing()\n" +
      "    End Sub\n" +
      "    Friend Sub FriendPing()\n" +
      "    End Sub\n" +
      "End Class\n\n" +
      "Public Class CX30Derived\n" +
      "    [ImplementsViaPrivateFriendlies] Implements CX30Base Via mBase = New CX30Base\n" +
      "End Class\n\n" +
      "Public Module X30_Via_Friend_outside_attr\n" +
      "    Public Sub Probe()\n" +
      "        Dim d As CX30Derived = New CX30Derived\n" +
      "        d.FriendPing\n" +
      "    End Sub\n" +
      "End Module\n",
  },
  {
    tag: "X31_Via_Friend_inside_attr",
    asks: "Is that member gone, or merely private? Calling it from inside the class " +
      "separates the two.",
    got: "BETA 983: clean, both through Me and unqualified. The member is still " +
      "there and still forwarded -- it is private to the class. `Private " +
      "friendlies` is literal.",
    clean: "private rather than absent, which is what the attribute's name claims",
    rejected: "the member is gone entirely, and the name overstates it",
    body:
      "Public Class CX31Base\n" +
      "    Friend Sub FriendPing()\n" +
      "    End Sub\n" +
      "End Class\n\n" +
      "Public Class X31_Via_Friend_inside_attr\n" +
      "    [ImplementsViaPrivateFriendlies] Implements CX31Base Via mBase = New CX31Base\n\n" +
      "    Public Sub CallThroughMe()\n" +
      "        Me.FriendPing\n" +
      "    End Sub\n\n" +
      "    Public Sub CallBare()\n" +
      "        FriendPing\n" +
      "    End Sub\n" +
      "End Class\n",
  },
  {
    tag: "X32_Via_Public_outside_attr",
    asks: "Does the attribute touch Public members too, or only Friend ones?",
    got: "BETA 983: clean. Public members forward exactly as they do without " +
      "the attribute, so the effect is confined to Friend members.",
    clean: "the effect is confined to Friend members",
    rejected: "the attribute makes every forwarded member private",
    body:
      "Public Class CX32Base\n" +
      "    Public Sub PublicPing()\n" +
      "    End Sub\n" +
      "    Friend Sub FriendPing()\n" +
      "    End Sub\n" +
      "End Class\n\n" +
      "Public Class CX32Derived\n" +
      "    [ImplementsViaPrivateFriendlies] Implements CX32Base Via mBase = New CX32Base\n" +
      "End Class\n\n" +
      "Public Module X32_Via_Public_outside_attr\n" +
      "    Public Sub Probe()\n" +
      "        Dim d As CX32Derived = New CX32Derived\n" +
      "        d.PublicPing\n" +
      "    End Sub\n" +
      "End Module\n",
  },
];



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
    // An Interface line inside a CoClass, which is a different target from a
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
    // An Enum MEMBER, not the Enum itself. The two cannot share a probe:
    // [Hidden] is accepted on a member and refused on the Enum with TB5155,
    // so one skeleton would answer for both and get one of them wrong.
    // Core/Open documents the [Hidden, Restricted] pair on exactly this target.
    case "ENUM_MEMBER":
      return `Public Module ${tag}\n    Public Enum ProbeEnum${pad(idx, 3)}\n` +
        `        ${attr}\n        ProbeValue${pad(idx, 3)} = 1\n    End Enum\nEnd Module\n`;
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
  CONST: "on a Const", ENUM_MEMBER: "on an Enum member",
  VAR_CLASS: "on a variable in a Class",
  VAR_MODULE: "on a variable in a Module", PARAM: "on a procedure parameter",
  LIBRARY_INTERFACE: "on an Interface in a Library",
  FUNC_MODULE_BOOL: "on a Boolean Function in a Module",
  COCLASS_INTERFACE: "on an Interface line inside a CoClass",
  IMPLEMENTS: "on an Implements statement in a Class",
  EVENT_CLASS: "on an Event in a Class",
};




async function main(argv) {
  const { values, positionals } = withUsageError(() => parseCli(argv, {
    options: { help: { type: "boolean", short: "h" } },
    positionals: { min: 0, max: 2 },
    stopAt: ["help"],
  }));
  if (values.help) printHelpAndExit(USAGE);
  if (positionals.length < 1) {
    console.error(USAGE);
    return 2;
  }
  const out = positionals[0];
  // The key must land OUTSIDE the tree: anything inside it gets packed into the
  // .twinproj and shows up as a stray file in the project.
  const keyPath = positionals[1] ?? path.join(path.dirname(path.resolve(out)), "probe-key.md");
  const srcDir = path.join(out, "Sources");
  const overflowSrc = path.join(out + "-2", "Sources");
  await fs.mkdir(srcDir, { recursive: true });

  const entries = parseAttributes(await fs.readFile(ATTR_DOC, "utf8"));
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
        // [DispInterface] rejected on an ordinary Interface. The applicability
        // is real and unreachable from project source, so there is nothing here a
        // probe can assert.
        skipped.push([e, "it applies only inside compiler-generated Library " +
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

  await writeProbeResources(out);
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
  k.push("# Attribute applicability probes -- key\n\n");
  k.push("Generated from `docs/Reference/Attributes.md` by " +
    `\`scripts/gen_attribute_probes.mjs\`. ${probes.length} probes over ` +
    `${distinct.size} attributes.\n\n`);
  k.push("**Every probe is expected to compile.** Each applies one attribute at one " +
    "target `Attributes.md` says is legal, in its own source file. A clean " +
    "build means all of those claims hold.\n\n");
  k.push("A diagnostic naming a probe module is a finding. The one to look for is " +
    "`This attribute is not supported in this context`, which says the " +
    "`Applicable to:` line is wrong. Any other diagnostic more likely means the " +
    "probe itself is malformed.\n\n");
  k.push("| Probe | Attribute | Applies to | Attributes.md |\n|---|---|---|---|\n");
  for (const [tag, e, target] of probes) {
    k.push(`| \`${tag}\` | \`[${e.name}]\` | ${HUMAN[target]} | line ${e.line} |\n`);
  }
  k.push("\n## Expected diagnostics that are not findings\n\n");
  k.push("- `[COMControl]` on an Interface draws two TB0013 recommendations, to " +
    "specify `[InterfaceId()]` and `[EventInterfaceId()]`. They are advice about " +
    "stable COM ids, not an applicability failure, and the probe deliberately omits " +
    "both rather than risk testing two attributes at once.\n");
  if (overflow.length) {
    k.push("\n## Second project\n\n");
    k.push("These targets cannot share a project with the ones above, so they " +
      "are packed separately as `AttributeProbes2`. Build it the same way.\n\n");
    k.push("| Probe | Attribute | Applies to | Why separate |\n|---|---|---|---|\n");
    for (const [tag, e, target] of overflow) {
      k.push(`| \`${tag}\` | \`[${e.name}]\` | ${HUMAN[target]} | ${SINGLETON[e.name]} |\n`);
    }
  }
  k.push("\n## Third project -- `AttributeExplore`\n\n");
  k.push("**The opposite contract: a diagnostic here is the answer, not a defect.** " +
    "These ask questions `Attributes.md` cannot answer and no shipped package " +
    "demonstrates, so no applicability is expected. Build it and record what each " +
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
    k.push("These entries state no applicability at all, so there is nothing to verify " +
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
