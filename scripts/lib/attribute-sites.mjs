// Every place an attribute can be written, as a skeleton that compiles without it.
//
// sweep_attributes.mjs puts each attribute at each of these sites and asks the
// compiler. A site is a claim about the compiler's grammar, so it has to be
// right on its own: the sweep first builds every skeleton with NO attribute, and
// a site that does not build clean is voided in the report rather than trusted.
// That check is what stops a wrong skeleton reading as "every attribute is
// refused here".
//
// A site id is the target name `parseTargets` (attributes-doc.mjs) and
// gen_attribute_probes.mjs already use wherever one exists -- MODULE, PROC_CLASS
// -- so a result can be laid against an `Applicable to:` line. Where the
// documentation's phrase covers several sites (`procedure in a Class` is a Sub,
// a Function and a property), FAMILIES says which, and the report can then say
// that a line is only partly true.

/**
 * The attribute goes where `${A}` is. `inline` marks a site whose attribute
 * shares a line with the declaration it decorates (an Implements statement, an
 * Interface line inside a CoClass), because those are the sites the compiler
 * treats as a different kind of target from a free-standing declaration.
 *
 * `${T}` is the probe's unique module or class name, and `${U}` a second unique
 * name for the helper types a skeleton declares. A Public Enum's name and
 * members are project-global, so two probes sharing one collide with TB5000,
 * which reads like a finding and is not.
 */
// biome-ignore format: a table, one entry per line
const SITES = [
  // ---- whole declarations ------------------------------------------------
  ["MODULE", "on a Module",
    "${A}\nPublic Module ${T}\nEnd Module\n"],
  ["CLASS", "on a Class",
    "${A}\nPublic Class ${T}\nEnd Class\n"],
  ["INTERFACE", "on an Interface",
    "${A}\nPublic Interface ${T}\n    Sub Ping()\nEnd Interface\n"],
  ["COCLASS", "on a CoClass",
    "Public Interface ${U}\n    Sub Ping()\nEnd Interface\n\n" +
    "${A}\nPublic CoClass ${T}\n    Interface ${U}\nEnd CoClass\n"],
  ["ENUM", "on an Enum",
    "Public Module ${T}\n    ${A}\n    Public Enum ${U}\n        ${U}_One = 1\n    End Enum\nEnd Module\n"],
  // [PopulateFrom] fills the enum from a .json resource, so its body is empty
  // (Sample 22 declares `Enum EVENTS / End Enum`); a hand-written member beside
  // the compiler's would test two things at once.
  //
  // An empty Enum is itself an error, TB5233, which is the whole reason the
  // site exists: only an attribute that fills the enum removes it. The site
  // declares that one code as its own, so a probe that draws nothing else is
  // read as clean.
  ["ENUM_EMPTY", "on an empty Enum",
    "Public Module ${T}\n    ${A}\n    Public Enum ${U}\n    End Enum\nEnd Module\n", { baselineCodes: ["TB5233"] }],
  ["ENUM_CLASS", "on an Enum in a Class",
    "Public Class ${T}\n    ${A}\n    Public Enum ${U}\n        ${U}_One = 1\n    End Enum\nEnd Class\n"],
  ["TYPE", "on a Type (UDT)",
    "Public Module ${T}\n    ${A}\n    Public Type ${U}\n        Field1 As Long\n    End Type\nEnd Module\n"],
  ["TYPE_CLASS", "on a Type in a Class",
    "Public Class ${T}\n    ${A}\n    Public Type ${U}\n        Field1 As Long\n    End Type\nEnd Class\n"],
  ["DELEGATE", "on a Delegate",
    "Public Module ${T}\n    ${A}\n    Public Delegate Sub ${U}()\nEnd Module\n"],

  // ---- members of an Enum or a Type --------------------------------------
  // An Enum MEMBER is not the Enum: [Hidden] is accepted on one and refused on
  // the other, so one skeleton would answer for both and get one wrong.
  //
  // The Type field is written twice, inline (`[Name] Field1 As Long`) and on
  // its own line, because packages write it either way and both are legal.
  //
  // The Enum member is written ONLY on its own line, and that site is voided by
  // the sweep. Measured on BETA 987: inline, the compiler refuses every
  // attribute, [Hidden] included (TB5182), though Attributes.md documents
  // [Hidden] on an Enum member; on its own line it accepts ANY `[...]`,
  // `[ClassId("guid")]` and `[Hidden(True)]` among them, because an Enum body
  // reads a bare `[Name]` line as something else (an escaped member). The
  // unknown-name control therefore compiles, the site is voided, and an Enum
  // member target is reported as one the sweep cannot test.
  ["ENUM_MEMBER", "on an Enum member, on its own line",
    "Public Module ${T}\n    Public Enum ${U}\n        ${A}\n        ${U}_One = 1\n    End Enum\nEnd Module\n"],
  ["TYPE_FIELD", "on a Type field, inline",
    "Public Module ${T}\n    Public Type ${U}\n        ${A} Field1 As Long\n    End Type\nEnd Module\n", { inline: true }],
  ["TYPE_FIELD_LINE", "on a Type field, on its own line",
    "Public Module ${T}\n    Public Type ${U}\n        ${A}\n        Field1 As Long\n    End Type\nEnd Module\n"],

  // ---- procedures in a Module --------------------------------------------
  ["SUB_MODULE", "on a Sub in a Module",
    "Public Module ${T}\n    ${A}\n    Public Sub Probe()\n    End Sub\nEnd Module\n"],
  ["SUB_MODULE_PRIVATE", "on a Private Sub in a Module",
    "Public Module ${T}\n    ${A}\n    Private Sub Probe()\n    End Sub\nEnd Module\n"],
  ["FUNC_MODULE", "on a Function in a Module",
    "Public Module ${T}\n    ${A}\n    Public Function Probe() As Long\n    End Function\nEnd Module\n"],
  // [RunBeforeStartupObject] is documented as returning a Boolean, and the
  // generic skeleton returns Long, so probing it there would test a signature
  // the documentation does not claim.
  ["FUNC_MODULE_BOOL", "on a Boolean Function in a Module",
    "Public Module ${T}\n    ${A}\n    Public Function Probe() As Boolean\n    End Function\nEnd Module\n"],
  ["FUNC_MODULE_OBJECT", "on a Function returning an object in a Module",
    "Public Module ${T}\n    ${A}\n    Public Function Probe() As stdole.IUnknown\n    End Function\nEnd Module\n"],
  ["PROPGET_MODULE", "on a Property Get in a Module",
    "Public Module ${T}\n    ${A}\n    Public Property Get Probe() As Long\n    End Property\nEnd Module\n"],

  // ---- declarations of API functions -------------------------------------
  ["DECLARE", "on a Declare Function in a Module",
    "Public Module ${T}\n    ${A}\n    Public Declare Function Probe Lib \"kernel32\" Alias \"GetTickCount\" () As Long\nEnd Module\n"],
  ["DECLARE_SUB", "on a Declare Sub in a Module",
    "Public Module ${T}\n    ${A}\n    Public Declare Sub Probe Lib \"kernel32\" Alias \"Sleep\" (ByVal Milliseconds As Long)\nEnd Module\n"],
  ["DECLARE_PRIVATE", "on a Private Declare in a Module",
    "Public Module ${T}\n    ${A}\n    Private Declare Function Probe Lib \"kernel32\" Alias \"GetTickCount\" () As Long\nEnd Module\n"],
  ["DECLARE_CLASS", "on a Declare in a Class",
    "Public Class ${T}\n    ${A}\n    Private Declare Function Probe Lib \"kernel32\" Alias \"GetTickCount\" () As Long\nEnd Class\n"],

  // ---- constants and variables -------------------------------------------
  ["CONST", "on a Const in a Module",
    "Public Module ${T}\n    ${A}\n    Public Const ProbeConst As Long = 1\nEnd Module\n"],
  ["CONST_PRIVATE", "on a Private Const in a Module",
    "Public Module ${T}\n    ${A}\n    Private Const ProbeConst As Long = 1\nEnd Module\n"],
  // Private, because the compiler refuses a Public Const in a Class (TB5250).
  ["CONST_CLASS", "on a Const in a Class",
    "Public Class ${T}\n    ${A}\n    Private Const ProbeConst As Long = 1\nEnd Class\n"],
  ["VAR_MODULE", "on a variable in a Module",
    "Public Module ${T}\n    ${A}\n    Public ProbeVar As Long\nEnd Module\n"],
  ["VAR_CLASS", "on a variable in a Class",
    "Public Class ${T}\n    ${A}\n    Public ProbeVar As Long\nEnd Class\n"],
  ["VAR_CLASS_PRIVATE", "on a Private variable in a Class",
    "Public Class ${T}\n    ${A}\n    Private ProbeVar As Long\nEnd Class\n"],
  ["VAR_CLASS_WITHEVENTS", "on a WithEvents variable in a Class",
    "Public Class ${U}\n    Public Event Pinged()\nEnd Class\n\n" +
    "Public Class ${T}\n    ${A}\n    Private WithEvents ProbeVar As ${U}\nEnd Class\n"],
  ["VAR_LOCAL", "on a local variable, inline",
    "Public Module ${T}\n    Public Sub Probe()\n        ${A} Dim x As Long\n    End Sub\nEnd Module\n", { inline: true }],
  // ---- more procedures, variables, declarations, parameters ----------------
  ["VAR_MODULE_PRIVATE", "on a Private variable in a Module",
    "Public Module ${T}\n    ${A}\n    Private ProbeVar As Long\nEnd Module\n"],
  ["VAR_MODULE_INIT", "on an initialised variable in a Module",
    "Public Module ${T}\n    ${A}\n    Public ProbeVar As Long = 5\nEnd Module\n"],
  ["SUB_STATIC_MODULE", "on a Static Sub in a Module",
    "Public Module ${T}\n    ${A}\n    Public Static Sub Probe()\n    End Sub\nEnd Module\n"],
  ["SUB_GENERIC", "on a generic Sub in a Module",
    "Public Module ${T}\n    ${A}\n    Public Sub Probe(Of X)()\n    End Sub\nEnd Module\n"],
  ["CLASS_GENERIC", "on a generic Class",
    "${A}\nPublic Class ${T}(Of X)\nEnd Class\n"],
  ["CLASS_PRIVATE", "on a Private Class",
    "${A}\nPrivate Class ${T}\nEnd Class\n"],
  ["SUB_FRIEND_CLASS", "on a Friend Sub in a Class",
    "Public Class ${T}\n    ${A}\n    Friend Sub Probe()\n    End Sub\nEnd Class\n"],
  ["FUNC_CLASS_OBJECT", "on a Function returning an object in a Class",
    "Public Class ${T}\n    ${A}\n    Public Function Probe() As stdole.IUnknown\n    End Function\nEnd Class\n"],
  ["PROPSET_CLASS", "on a Property Set in a Class",
    "Public Class ${T}\n    Private mO As Object\n    Public Property Get Probe() As Object\n        Return mO\n    End Property\n\n" +
    "    ${A}\n    Public Property Set Probe(ByVal Value As Object)\n        Set mO = Value\n    End Property\nEnd Class\n"],
  ["FUNC_INTERFACE_OBJECT", "on an object-returning Function prototype in an Interface",
    "Public Interface ${T}\n    ${A}\n    Function Probe() As stdole.IUnknown\nEnd Interface\n"],
  ["DECLARE_PTRSAFE", "on a Declare PtrSafe in a Module",
    "Public Module ${T}\n    ${A}\n    Public Declare PtrSafe Function Probe Lib \"kernel32\" Alias \"GetTickCount\" () As Long\nEnd Module\n"],
  ["DECLARE_WIDE", "on a DeclareWide in a Module",
    "Public Module ${T}\n    ${A}\n    Public DeclareWide Function Probe Lib \"kernel32\" Alias \"GetTickCount\" () As Long\nEnd Module\n"],
  ["PARAM_OPTIONAL", "on an Optional parameter",
    "Public Module ${T}\n    Public Sub Probe(${A} Optional ByVal Value As Long = 0)\n    End Sub\nEnd Module\n", { inline: true }],
  ["PARAM_PARAMARRAY", "on a ParamArray parameter",
    "Public Module ${T}\n    Public Sub Probe(${A} ParamArray Values() As Variant)\n    End Sub\nEnd Module\n", { inline: true }],

  // ---- members of a Class ------------------------------------------------
  ["PROC_CLASS", "on a Sub in a Class",
    "Public Class ${T}\n    ${A}\n    Public Sub Probe()\n    End Sub\nEnd Class\n"],
  ["FUNC_CLASS", "on a Function in a Class",
    "Public Class ${T}\n    ${A}\n    Public Function Probe() As Long\n    End Function\nEnd Class\n"],
  ["PROPGET_CLASS", "on a Property Get in a Class",
    "Public Class ${T}\n    Private mV As Long\n    ${A}\n    Public Property Get Probe() As Long\n        Return mV\n    End Property\n\n" +
    "    Public Property Let Probe(ByVal Value As Long)\n        mV = Value\n    End Property\nEnd Class\n"],
  ["PROPLET_CLASS", "on a Property Let in a Class",
    "Public Class ${T}\n    Private mV As Long\n    Public Property Get Probe() As Long\n        Return mV\n    End Property\n\n" +
    "    ${A}\n    Public Property Let Probe(ByVal Value As Long)\n        mV = Value\n    End Property\nEnd Class\n"],
  ["EVENT_CLASS", "on an Event in a Class",
    "Public Class ${T}\n    ${A}\n    Public Event Probed()\nEnd Class\n"],
  ["CLASS_INITIALIZE", "on Class_Initialize",
    "Public Class ${T}\n    ${A}\n    Private Sub Class_Initialize()\n    End Sub\nEnd Class\n"],

  // ---- members of an Interface -------------------------------------------
  ["PROC_INTERFACE", "on a prototype in an Interface",
    "Public Interface ${T}\n    ${A}\n    Sub Probe()\nEnd Interface\n"],
  ["FUNC_INTERFACE", "on a Function prototype in an Interface",
    "Public Interface ${T}\n    ${A}\n    Function Probe() As Long\nEnd Interface\n"],
  ["PROPGET_INTERFACE", "on a Property Get prototype in an Interface",
    "Public Interface ${T}\n    ${A}\n    Property Get Probe() As Long\nEnd Interface\n"],

  // ---- statements that share a line with their attribute -----------------
  ["COCLASS_INTERFACE", "on an Interface line inside a CoClass",
    "Public Interface ${U}\n    Sub Ping()\nEnd Interface\n\n" +
    "Public CoClass ${T}\n    ${A} Interface ${U}\nEnd CoClass\n", { inline: true }],
  ["IMPLEMENTS", "on an Implements statement in a Class",
    "Public Interface ${U}\n    Sub Ping()\nEnd Interface\n\n" +
    "Public Class ${T}\n    ${A} Implements ${U}\n\n    Private Sub ${U}_Ping() Implements ${U}.Ping\n    End Sub\nEnd Class\n",
    { inline: true }],
  ["IMPLEMENTS_VIA_FIELD", "on an Implements ... Via field statement",
    "Public Interface ${U}\n    Sub Ping()\nEnd Interface\n\n" +
    "Public Class ${U}_Base\n    Implements ${U}\n\n    Private Sub ${U}_Ping() Implements ${U}.Ping\n    End Sub\nEnd Class\n\n" +
    "Public Class ${T}\n    ${A} Implements ${U} Via mBase = New ${U}_Base\nEnd Class\n",
    { inline: true }],
  ["IMPLEMENTS_VIA_CLASS", "on an Implements ... Via Class statement",
    "Public Interface ${U}\n    Sub Ping()\nEnd Interface\n\n" +
    "Public Class ${U}_Base\n    Implements ${U}\n\n    Private Sub ${U}_Ping() Implements ${U}.Ping\n    End Sub\nEnd Class\n\n" +
    "Public Class ${T}\n    ${A} Implements ${U} Via ${U}_Base\nEnd Class\n",
    { inline: true }],
  ["INHERITS", "on an Inherits statement",
    "Public Class ${U}\n    Public Sub Ping()\n    End Sub\nEnd Class\n\n" +
    "Public Class ${T}\n    ${A} Inherits ${U}\nEnd Class\n", { inline: true }],

  // ---- parameters --------------------------------------------------------
  ["PARAM", "on a procedure parameter",
    "Public Module ${T}\n    Public Sub Probe(${A} ByVal Value As Long)\n    End Sub\nEnd Module\n", { inline: true }],
  ["PARAM_DECLARE", "on a Declare parameter",
    "Public Module ${T}\n    Public Declare Sub Probe Lib \"kernel32\" Alias \"Sleep\" (${A} ByVal Milliseconds As Long)\nEnd Module\n",
    { inline: true }],
  ["PARAM_INTERFACE", "on an Interface prototype parameter",
    "Public Interface ${T}\n    Sub Probe(${A} ByVal Value As Long)\nEnd Interface\n", { inline: true }],
];

// `Probe`, `ProbeConst` and `ProbeVar` become `${M}`, unique per probe. Members
// of a module are project-global, so a hundred probes each exporting `Probe`
// (or `ProbeConst`, for [DllExport] and [ComExport]) would collide with each
// other and the collision would read as a finding about the attribute.
export const SITE_LIST = SITES.map(([id, human, template, opts = {}]) => ({
  id, human, template: template.replace(/\bProbe(Const|Var)?\b/g, () => "${M}"), inline: !!opts.inline,
  // Codes the skeleton draws with no attribute at all, and that are not the attribute's doing.
  baselineCodes: new Set(opts.baselineCodes ?? []),
}));
export const SITE_IDS = new Set(SITE_LIST.map((s) => s.id));

/**
 * What an `Applicable to:` target from `parseTargets` covers. The documentation
 * says `procedure in a Class` and means all four of these; if the compiler
 * accepts three and refuses one, that is a qualification the page does not make.
 */
// biome-ignore format: a table, one entry per line
export const FAMILIES = {
  MODULE: ["MODULE"],
  CLASS: ["CLASS", "CLASS_PRIVATE", "CLASS_GENERIC"],
  INTERFACE: ["INTERFACE"],
  COCLASS: ["COCLASS"],
  PROC_MODULE: ["SUB_MODULE", "SUB_MODULE_PRIVATE", "SUB_STATIC_MODULE", "SUB_GENERIC", "FUNC_MODULE", "FUNC_MODULE_BOOL",
    "FUNC_MODULE_OBJECT", "PROPGET_MODULE"],
  SUB_MODULE: ["SUB_MODULE", "SUB_MODULE_PRIVATE", "SUB_STATIC_MODULE"],
  FUNC_MODULE: ["FUNC_MODULE", "FUNC_MODULE_OBJECT"],
  FUNC_MODULE_BOOL: ["FUNC_MODULE_BOOL"],
  PROC_CLASS: ["PROC_CLASS", "FUNC_CLASS", "FUNC_CLASS_OBJECT", "PROPGET_CLASS", "PROPLET_CLASS", "PROPSET_CLASS",
    "SUB_FRIEND_CLASS", "CLASS_INITIALIZE"],
  PROC_INTERFACE: ["PROC_INTERFACE", "FUNC_INTERFACE", "FUNC_INTERFACE_OBJECT", "PROPGET_INTERFACE"],
  // "Procedure" with no place named: every procedure site there is.
  PROC_ANY: ["SUB_MODULE", "SUB_MODULE_PRIVATE", "SUB_STATIC_MODULE", "SUB_GENERIC", "FUNC_MODULE", "FUNC_MODULE_BOOL",
    "FUNC_MODULE_OBJECT", "PROPGET_MODULE", "PROC_CLASS", "FUNC_CLASS", "FUNC_CLASS_OBJECT", "PROPGET_CLASS",
    "PROPLET_CLASS", "PROPSET_CLASS", "SUB_FRIEND_CLASS", "CLASS_INITIALIZE", "PROC_INTERFACE", "FUNC_INTERFACE",
    "FUNC_INTERFACE_OBJECT", "PROPGET_INTERFACE"],
  DECLARE: ["DECLARE", "DECLARE_SUB", "DECLARE_PRIVATE", "DECLARE_CLASS", "DECLARE_PTRSAFE", "DECLARE_WIDE"],
  TYPE: ["TYPE", "TYPE_CLASS"],
  ENUM: ["ENUM", "ENUM_EMPTY", "ENUM_CLASS"],
  ENUM_MEMBER: ["ENUM_MEMBER"],
  // "constants in a Module": a Const in a Class is a different target, so
  // accepting it is reported as undocumented rather than absorbed.
  CONST: ["CONST", "CONST_PRIVATE"],
  VAR_CLASS: ["VAR_CLASS", "VAR_CLASS_PRIVATE", "VAR_CLASS_WITHEVENTS"],
  VAR_MODULE: ["VAR_MODULE", "VAR_MODULE_PRIVATE", "VAR_MODULE_INIT"],
  PARAM: ["PARAM", "PARAM_DECLARE", "PARAM_INTERFACE", "PARAM_OPTIONAL", "PARAM_PARAMARRAY"],
  IMPLEMENTS: ["IMPLEMENTS"],
  // `Implements ... Via`: parseTargets reads nothing from that phrase, so
  // sweep_attributes.mjs adds it (see its `targetsOf`).
  IMPLEMENTS_VIA: ["IMPLEMENTS_VIA_FIELD", "IMPLEMENTS_VIA_CLASS"],
  EVENT_CLASS: ["EVENT_CLASS"],
  COCLASS_INTERFACE: ["COCLASS_INTERFACE"],
};

/**
 * Sites a family lists that a documented target may leave out without being
 * "partly true": a Private variant, a special form of the same thing. Accepting
 * one is covered by the family; refusing one is not a qualification the page
 * owes. Without this, `procedure in a Class` would be reported partly false
 * because `Class_Initialize` is refused.
 */
// biome-ignore format: a table, one entry per line
export const OPTIONAL_SITES = new Set([
  "CLASS_INITIALIZE", "SUB_MODULE_PRIVATE", "SUB_STATIC_MODULE", "SUB_GENERIC", "FUNC_MODULE_OBJECT", "DECLARE_PRIVATE",
  "DECLARE_PTRSAFE", "DECLARE_WIDE", "CONST_PRIVATE", "VAR_CLASS_PRIVATE", "VAR_MODULE_PRIVATE", "VAR_MODULE_INIT",
  "ENUM_EMPTY", "TYPE_CLASS", "ENUM_CLASS", "PARAM_DECLARE", "PARAM_INTERFACE", "PARAM_OPTIONAL", "PARAM_PARAMARRAY",
  "PROPLET_CLASS", "PROPSET_CLASS", "SUB_FRIEND_CLASS", "FUNC_CLASS_OBJECT", "FUNC_INTERFACE_OBJECT", "CLASS_PRIVATE",
  "CLASS_GENERIC", "VAR_CLASS_WITHEVENTS", "ENUM_MEMBER", "DECLARE_CLASS", "CONST_CLASS",
]);

/**
 * The text of a probe: the skeleton with the attribute at its site.
 *
 * @param {object} site   a SITE_LIST entry
 * @param {string} tag    the probe's unique name (a legal identifier)
 * @param {string|null} attr  the attribute as written (`[Name(...)]`), or null
 *   for the baseline build with no attribute
 */
export function renderSite(site, tag, attr) {
  // Function replacers throughout: a string replacement reads `$&` and `$'`
  // specially, and attribute text is whatever `--names` was given.
  const sub = (s, key, value) => s.replaceAll(key, () => value);
  let filled = sub(site.template, "${T}", tag);
  filled = sub(filled, "${U}", `${tag}_U`);
  filled = sub(filled, "${M}", `${tag}_m`);
  if (attr !== null) return sub(filled, "${A}", attr);
  // Baseline. An inline site loses the attribute and keeps its statement; a
  // stand-alone one loses the whole line, which would otherwise be blank.
  if (site.inline) return filled.replaceAll("${A} ", "").replaceAll("${A}", "");
  return filled.split("\n").filter((l) => l.trim() !== "${A}").join("\n");
}

/** Which line (1-based) of the rendered probe holds the attribute. */
export function attributeLine(site, tag) {
  const lines = renderSite(site, tag, "@@ATTR@@").split("\n");
  const i = lines.findIndex((l) => l.includes("@@ATTR@@"));
  return i < 0 ? -1 : i + 1;
}
