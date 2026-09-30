// What an attribute probe project needs, shared by the two tools that write one:
// gen_attribute_probes.mjs (a probe for each target Attributes.md claims) and
// sweep_attributes.mjs (every attribute at every site, to find what the page does
// not say).
//
// Held once because the values are hard-won. An attribute with a mandatory
// argument needs one that is itself valid, or the compiler reports the argument
// instead of the applicability, and each entry below is what the compiler
// accepts. Two tools with two copies would drift, and the drift would read as a
// finding about the compiler.

import { mkdirSync, promises as fs, writeFileSync } from "node:fs";
import path from "node:path";

export const pad = (n, width) => String(n).padStart(width, "0");

// GUIDs are unique per probe so two probes can never collide on one id.
export const GUID_ATTRS = new Set([
  "ClassId", "CoClassId", "InterfaceId", "EventInterfaceId",
  "EnumId", "FormDesignerId",
]);

export const FIXED_ARGS = {
  Description: '("attribute applicability probe")',
  DispId: "(1000)",
  IdeButton: '("probe")',
  PackingAlignment: "(4)",
  CompileIf: "(True)",
  // The five below are not UNSYNTHESISABLE, although `Attributes.md` states
  // each shape but no value: the shipped packages carry one apiece, so these
  // are copied from code the compiler already accepts rather than guessed:
  //
  //   [CoClassCustomConstructor("CreatePropertyBagObject")]  VBRUN/PropertyBag
  //   [CustomControl("/miscellaneous/frmButton.png")]        CustomControlsPackage
  //   [PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json",
  //                 "events", "name", "id")]                 Sample 22
  //   [IgnoreWarnings(TB0001)]                               VB/QRCodeHelper
  //
  // The image and .json those two point at are written into the tree beside the
  // probes (writeProbeResources), and the factory into `_ProbeFactory.twin`.
  // All five probes build clean on BETA 983.
  //
  // Qualified, because the documented shape is "fully qualified path to factory
  // method" and that is the claim under test. VBRUN uses the bare form too.
  CoClassCustomConstructor: '("ProbeFactoryModule.ProbeFactory")',
  CustomControl: '("/miscellaneous/probe.png")',
  PopulateFrom: '("json", "/Resources/PROBE/Strings.json", "events", "name", "id")',
  IgnoreWarnings: "(TB0001)",
  // The package census shows every use passing a toolbox image path.
  // "no_designer" is the other accepted value and
  // is what the probe uses, because it needs no file to resolve against.
  WindowsControl: '("no_designer")',
  // The entry documents +llvm, +optimize, +optimizesize and +optimizespeed.
  // `+optimize` is used here rather than `+llvm`, which the page says cannot
  // compile procedures taking objects, strings or dynamic arrays -- a probe
  // should fail on its applicability or not at all. An empty string is also
  // accepted, confirmed by the X04 probe.
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
  // "which keyword" is not "where it is applicable".
  RedirectToStaticImplementation: '("ProbeFactoryModule.ProbeRedirect")',
};

/** The attribute as written in a probe; `idx` keeps GUID and hint-enum ids unique. */
export function attrText(name, idx) {
  if (GUID_ATTRS.has(name)) return `[${name}("00000000-0000-0000-0000-${pad(idx, 12)}")]`;
  if (Object.hasOwn(FIXED_ARGS, name)) return `[${name}${FIXED_ARGS[name]}]`;
  if (name === "TypeHint") return `[TypeHint(ProbeHintEnum${pad(idx, 3)})]`;
  return `[${name}]`;
}

// The PNG is a 1x1 opaque black image, written as bytes rather than fetched:
// [CustomControl] needs a real image at the path, not merely a path.
export const PROBE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9" +
  "awAAAABJRU5ErkJggg==",
  "base64",
);
export const PROBE_STRINGS_JSON = JSON.stringify(
  { events: [{ id: 1, name: "probe_event_one" }, { id: 2, name: "probe_event_two" }] },
  null,
  4,
) + "\n";
// [CoClassCustomConstructor] names a factory the compiler must be able to
// resolve. VBRUN's real one is `() As stdole.IUnknown`; this mirrors it.
export const PROBE_FACTORY_TWIN =
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

// Built as an object and serialised, rather than held as a literal blob, so the
// backslashes in the paths are escaped by JSON.stringify rather than by hand.
// Tab indent and key order match what the IDE writes.
const SETTINGS_OBJ = {
  "configuration.inherits": "Defaults",
  "project.appTitle": "Attribute applicability probes",
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

/** The Settings file text for a probe project, with the name and id it needs. */
export function settingsText(overrides = {}) {
  return JSON.stringify({ ...SETTINGS_OBJ, ...overrides }, null, "\t") + "\n";
}

// The same Settings text with the generator's names swapped, as the overflow and
// exploratory projects need. Kept as the original text-replacement so the files
// gen_attribute_probes writes stay byte-identical.
export const SETTINGS = settingsText();

export const MAIN_TWIN = "' Startup object for the probe project. Does nothing.\n\n" +
  "Module ProbeMain\n    Public Sub Main()\n    End Sub\nEnd Module\n";

// The .twin sources are written CRLF; the Settings blob and the key are written
// exactly as composed.
export const writeCrlf = (file, text) => fs.writeFile(file, text.replace(/\n/g, "\r\n"), "utf8");
export const writeRaw = (file, text) => fs.writeFile(file, text, "utf8");

/**
 * The files the argument forms above point at. Named to match the paths in
 * FIXED_ARGS; the leading `/` in those paths is project-root-relative, and the
 * lookup is case-insensitive (the packages write `/miscellaneous/` for a folder
 * the IDE shows as `Miscellaneous`).
 */
export async function writeProbeResources(out) {
  await fs.mkdir(path.join(out, "Miscellaneous"), { recursive: true });
  await fs.writeFile(path.join(out, "Miscellaneous", "probe.png"), PROBE_PNG);
  await fs.mkdir(path.join(out, "Resources", "PROBE"), { recursive: true });
  await writeRaw(path.join(out, "Resources", "PROBE", "Strings.json"), PROBE_STRINGS_JSON);
}

/** writeProbeResources for a caller that stages a project synchronously. */
export function writeProbeResourcesSync(out) {
  mkdirSync(path.join(out, "Miscellaneous"), { recursive: true });
  writeFileSync(path.join(out, "Miscellaneous", "probe.png"), PROBE_PNG);
  mkdirSync(path.join(out, "Resources", "PROBE"), { recursive: true });
  writeFileSync(path.join(out, "Resources", "PROBE", "Strings.json"), PROBE_STRINGS_JSON, "utf8");
}

// Targets the packages evidence but a generic skeleton cannot probe
// faithfully. Excluded deliberately, and named in the key, because a probe that
// tests the wrong thing is worse than no probe: it fails for a reason that is
// not the documentation's and sends the reader after a defect that is not there.
export const NOT_FAITHFULLY_PROBEABLE = {
  CustomDesigner: "the designer name has to suit the property's type -- " +
    "`designer_SpectrumWindows` is for an OLE_COLOR, `designer_MultiLineText` for a " +
    "String -- so a rejection could mean the applicability or the pairing, and the " +
    "probe could not tell you which. Applicability evidenced by 154 uses across " +
    "four packages",
  Enumerator: "the member has to return stdole.IUnknown or a Variant; the generic " +
    "procedure skeleton returns neither, so the probe would test the return type " +
    "rather than the applicability. Evidenced by 25 uses across five packages",
  SpecialCompilerBinding: "the argument is an index into the compiler's own internal " +
    "implementations -- the six uses in the VB package pass 1, 2, 3, 4 and 254 -- so " +
    "there is no value a probe could pass that would test the applicability " +
    "rather than the number. Evidenced by those six uses, on a Sub, a Declare " +
    "and a Property Get",
};
// Arguments that cannot be synthesised without something else being true.
// FormDesignerId earned its place the hard way: probed on a Class it reached
// TB5247 `unable to find matching form designer JSON`, which is the compiler
// accepting the applicability and then failing a lookup. That confirms the
// documented applicability and tells us nothing further, so it is not worth a
// probe.
export const UNSYNTHESISABLE = {
  FormDesignerId: "needs a form designer JSON to match; probing it reached TB5247, " +
    "which already confirms the documented applicability on a Class",
};
