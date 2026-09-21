"""Generate a twinBASIC probe project for Reference/Attributes.md placements.

`Attributes.md` states an `Applicable to:` line for 52 of its 57 attributes, and
none of them had been checked against the compiler --- the one that was checked
turned out to be wrong. twinBASIC cannot compile a project from the command line
(see Features/Packages/Import-Export-Tool), so this does the next best thing: it
writes one source file per claimed placement, so a single IDE build answers every
claim at once.

Every probe is expected to compile. The compiler reports a misplaced attribute as
`This attribute is not supported in this context`, so a diagnostic naming a probe
module means that `Applicable to:` line is wrong.

    python scripts/gen_attribute_probes.py <out_dir> [key.md]

Then pack the tree and open the result in the IDE:

    bin\\twinBASIC_win32.exe import AttributeProbes.twinproj <out_dir> --overwrite

Re-run after editing `Attributes.md`; the key cites the line each probe came from.
"""
import io
import os
import re
import sys

DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    "..", "docs", "Reference", "Attributes.md")

# ----------------------------------------------------------------- parsing
LINK_BOLD = re.compile(r"\[\*\*([^\]]*)\*\*\]\([^)]*\)")
LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")


def clean(s):
    s = LINK_BOLD.sub(r"\1", s)
    s = LINK.sub(r"\1", s)
    return s.replace("**", "").replace("\\", "").strip()


def parse_attributes(path):
    lines = io.open(path, encoding="utf-8").read().split("\n")
    entries, cur = [], None
    for i, line in enumerate(lines):
        m = re.match(r"^Syntax:\s*(.*)$", line)
        if m:
            name = re.match(r"^Syntax:\s*\*\*\[(\w+)", line)
            if not name:
                continue
            cur = {"name": name.group(1), "syntax": clean(m.group(1)),
                   "line": i + 1, "app": None}
            entries.append(cur)
        m2 = re.match(r"^Applicable to:\s*(.*)$", line)
        if m2 and cur is not None and cur["app"] is None:
            cur["app"] = clean(m2.group(1))
    return entries


# --------------------------------------------------------------- arguments
# An attribute with a mandatory argument needs a value that is itself valid, or
# the compiler reports the argument instead of the placement. GUIDs are unique
# per probe so two probes can never collide on one id.
GUID_ATTRS = {"ClassId", "CoClassId", "InterfaceId", "EventInterfaceId",
              "EnumId", "FormDesignerId"}
FIXED_ARGS = {
    "Description": '("attribute placement probe")',
    "DispId": "(1000)",
    "IdeButton": '("probe")',
    "PackingAlignment": "(4)",
    "CompileIf": "(True)",
}
# Arguments that cannot be synthesised without something else being true.
UNSYNTHESISABLE = {
    "CoClassCustomConstructor": "needs a fully qualified path to an existing factory method",
    "CustomControl": "needs an image file present in the project",
    "PopulateFrom": "needs a .json resource plus three field names",
    "IgnoreWarnings": "needs a valid TBnnnn warning code; the codes are not documented",
    "CompilerOptions": "the option string vocabulary is not documented",
}


def attr_text(name, idx):
    if name in GUID_ATTRS:
        return '[%s("00000000-0000-0000-0000-%012d")]' % (name, idx)
    if name in FIXED_ARGS:
        return "[%s%s]" % (name, FIXED_ARGS[name])
    if name == "TypeHint":
        return "[TypeHint(ProbeHintEnum)]"
    return "[%s]" % name


# ----------------------------------------------------------------- targets
# Ordered: the specific phrasings must win over the bare ones.
RULES = [
    (r"interface\s+in\s+a\s+library", ["LIBRARY_INTERFACE"]),
    (r"(procedure|method)\s+in\s+an\s+interface", ["PROC_INTERFACE"]),
    (r"procedure\s+in\s+a\s+class\s+or\s+module", ["PROC_CLASS", "PROC_MODULE"]),
    (r"procedure\s+in\s+a\s+class", ["PROC_CLASS"]),
    (r"function\s+in\s+a\s+module", ["FUNC_MODULE"]),
    (r"procedure\s+parameter", ["PARAM"]),
    (r"variable.*\bin\s+a\s+class", ["VAR_CLASS"]),
    (r"variable.*\bin\s+a\s+module", ["VAR_MODULE"]),
    (r"variable", ["VAR_MODULE"]),
    (r"declare|api\s+declaration", ["DECLARE"]),
    (r"^type\b", ["TYPE"]),
    (r"^enum\b", ["ENUM"]),
    (r"^const\b", ["CONST"]),
    (r"^sub\b", ["SUB_MODULE"]),
    (r"^function\b", ["FUNC_MODULE"]),
    (r"^coclass\b", ["COCLASS"]),
    (r"^class\b", ["CLASS"]),
    (r"^module\b", ["MODULE"]),
    (r"^interface\b", ["INTERFACE"]),
    (r"procedure", ["PROC_MODULE"]),
]


def parse_targets(app):
    out = []
    for phrase in re.split(r",|\band\b", app):
        p = phrase.strip().strip(".").strip()
        if not p:
            continue
        for pat, targets in RULES:
            if re.search(pat, p, re.I):
                for t in targets:
                    if t not in out:
                        out.append(t)
                break
    return out


# --------------------------------------------------------------- renderers
HINT_ENUM = ("\n    Public Enum ProbeHintEnum\n"
             "        ProbeHintValue = 1\n"
             "    End Enum\n")


def render(target, tag, attr, needs_hint_enum):
    """Return the body of a .twin file placing `attr` at `target`."""
    hint = HINT_ENUM if needs_hint_enum else ""
    if target == "MODULE":
        return "%s\nPublic Module %s\nEnd Module\n" % (attr, tag)
    if target == "CLASS":
        return "%s\nPublic Class %s\nEnd Class\n" % (attr, tag)
    if target == "INTERFACE":
        return "%s\nPublic Interface %s\n    Sub Ping()\nEnd Interface\n" % (attr, tag)
    if target == "COCLASS":
        return ("Public Interface %s_Iface\n    Sub Ping()\nEnd Interface\n\n"
                "%s\nPublic CoClass %s\n    Interface %s_Iface\nEnd CoClass\n"
                % (tag, attr, tag, tag))
    if target in ("PROC_MODULE", "SUB_MODULE"):
        return ("Public Module %s\n%s    %s\n    Public Sub Probe()\n    End Sub\n"
                "End Module\n" % (tag, hint, attr))
    if target == "FUNC_MODULE":
        return ("Public Module %s\n%s    %s\n    Public Function Probe() As Long\n"
                "    End Function\nEnd Module\n" % (tag, hint, attr))
    if target == "PROC_CLASS":
        return ("Public Class %s\n%s    %s\n    Public Sub Probe()\n    End Sub\n"
                "End Class\n" % (tag, hint, attr))
    if target == "PROC_INTERFACE":
        return ("Public Interface %s\n%s    %s\n    Sub Probe()\nEnd Interface\n"
                % (tag, hint, attr))
    if target == "DECLARE":
        return ("Public Module %s\n    %s\n    Public Declare Function Probe Lib "
                '"kernel32" Alias "GetTickCount" () As Long\nEnd Module\n'
                % (tag, attr))
    if target == "TYPE":
        return ("Public Module %s\n    %s\n    Public Type ProbeUdt\n"
                "        Field1 As Long\n    End Type\nEnd Module\n" % (tag, attr))
    if target == "ENUM":
        return ("Public Module %s\n    %s\n    Public Enum ProbeEnum\n"
                "        ProbeValue = 1\n    End Enum\nEnd Module\n" % (tag, attr))
    if target == "CONST":
        return ("Public Module %s\n%s    %s\n    Public Const ProbeConst As Long = 1\n"
                "End Module\n" % (tag, hint, attr))
    if target == "VAR_CLASS":
        return ("Public Class %s\n%s    %s\n    Public ProbeVar As Long\nEnd Class\n"
                % (tag, hint, attr))
    if target == "VAR_MODULE":
        return ("Public Module %s\n%s    %s\n    Public ProbeVar As Long\nEnd Module\n"
                % (tag, hint, attr))
    if target == "PARAM":
        return ("Public Module %s\n%s    Public Sub Probe(%s ByVal Value As Long)\n"
                "    End Sub\nEnd Module\n" % (tag, hint, attr))
    return None


HUMAN = {
    "MODULE": "on a Module", "CLASS": "on a Class", "INTERFACE": "on an Interface",
    "COCLASS": "on a CoClass", "PROC_MODULE": "on a Sub in a Module",
    "SUB_MODULE": "on a Sub in a Module", "FUNC_MODULE": "on a Function in a Module",
    "PROC_CLASS": "on a Sub in a Class",
    "PROC_INTERFACE": "on a prototype in an Interface",
    "DECLARE": "on a Declare", "TYPE": "on a Type (UDT)", "ENUM": "on an Enum",
    "CONST": "on a Const", "VAR_CLASS": "on a variable in a Class",
    "VAR_MODULE": "on a variable in a Module", "PARAM": "on a procedure parameter",
    "LIBRARY_INTERFACE": "on an Interface in a Library",
}

SETTINGS = """{
\t"configuration.inherits": "Defaults",
\t"project.appTitle": "Attribute placement probes",
\t"project.buildPath": "${SourcePath}\\\\Build\\\\${ProjectName}_${Architecture}.${FileExtension}",
\t"project.buildType": "Standard EXE",
\t"project.description": "Generated from docs/Reference/Attributes.md. Every module is expected to compile; a diagnostic is a finding.",
\t"project.exportPathIsV2": true,
\t"project.id": "{A77B1BE0-0000-4000-8000-000000000001}",
\t"project.name": "AttributeProbes",
\t"project.optionExplicit": true,
\t"project.references": [
\t\t{
\t\t\t"id": "{00020430-0000-0000-C000-000000000046}",
\t\t\t"lcid": 0,
\t\t\t"name": "OLE Automation",
\t\t\t"path32": "C:\\\\Windows\\\\SysWOW64\\\\stdole2.tlb",
\t\t\t"path64": "C:\\\\Windows\\\\System32\\\\stdole2.tlb",
\t\t\t"symbolId": "stdole",
\t\t\t"versionMajor": 2,
\t\t\t"versionMinor": 0
\t\t},
\t\t{
\t\t\t"hasBeenSplit": true,
\t\t\t"id": "{F50B82D0-DCAB-43FE-9631-11959D4A4728}",
\t\t\t"isCompilerPackage": true,
\t\t\t"licence": "MIT",
\t\t\t"name": "[COMPILER PACKAGE] twinBASIC - VB Compatibility Package (Forms)",
\t\t\t"path32": "",
\t\t\t"path64": "",
\t\t\t"publisher": "TWINBASIC-COMPILER",
\t\t\t"symbolId": "VB",
\t\t\t"versionBuild": 0,
\t\t\t"versionMajor": 0,
\t\t\t"versionMinor": 0,
\t\t\t"versionRevision": 31
\t\t}
\t],
\t"project.settingsVersion": 1,
\t"project.startupObject": "Sub Main",
\t"project.warnings": {
\t\t"errors": [],
\t\t"hints": [],
\t\t"ignored": [],
\t\t"info": [],
\t\t"warnings": []
\t},
\t"runtime.useUnicodeStandardLibrary": true
}
"""


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    out = sys.argv[1]
    # The key must land OUTSIDE the tree: anything inside it gets packed into
    # the .twinproj and shows up as a stray file in the project.
    key_path = (sys.argv[2] if len(sys.argv) > 2 else
                os.path.join(os.path.dirname(os.path.abspath(out)), "probe-key.md"))
    src_dir = os.path.join(out, "Sources")
    os.makedirs(src_dir, exist_ok=True)

    entries = parse_attributes(DOCS)
    probes, skipped, no_app = [], [], []
    idx = 0
    for e in entries:
        if not e["app"]:
            no_app.append(e)
            continue
        if e["name"] in UNSYNTHESISABLE:
            skipped.append((e, UNSYNTHESISABLE[e["name"]]))
            continue
        for target in parse_targets(e["app"]):
            if target == "LIBRARY_INTERFACE":
                skipped.append((e, "the Library declaration has no reference page in docs/"))
                continue
            idx += 1
            tag = "P%03d_%s_%s" % (idx, e["name"], target)
            body = render(target, tag, attr_text(e["name"], idx),
                          e["name"] == "TypeHint")
            if body is None:
                skipped.append((e, "no skeleton for target %s" % target))
                idx -= 1
                continue
            header = ("' %s -- [%s] %s\n"
                      "' Attributes.md:%d -- \"Applicable to: %s\"\n"
                      "' Expected: compiles clean.\n\n"
                      % (tag, e["name"], HUMAN[target], e["line"], e["app"]))
            io.open(os.path.join(src_dir, tag + ".twin"), "w",
                    encoding="utf-8", newline="\r\n").write(header + body)
            probes.append((tag, e, target))

    io.open(os.path.join(src_dir, "_ProbeMain.twin"), "w",
            encoding="utf-8", newline="\r\n").write(
        "' Startup object for the probe project. Does nothing.\n\n"
        "Module ProbeMain\n    Public Sub Main()\n    End Sub\nEnd Module\n")
    io.open(os.path.join(out, "Settings"), "w",
            encoding="utf-8", newline="").write(SETTINGS)

    k = io.open(key_path, "w", encoding="utf-8", newline="")
    k.write("# Attribute placement probes -- key\n\n")
    k.write("Generated from `docs/Reference/Attributes.md` by "
            "`scripts/gen_attribute_probes.py`. %d probes over %d attributes.\n\n"
            % (len(probes), len({p[1]["name"] for p in probes})))
    k.write("**Every probe is expected to compile.** Each applies one attribute at one "
            "placement `Attributes.md` says is legal, in its own source file. A clean "
            "build means all of those claims hold.\n\n")
    k.write("A diagnostic naming a probe module is a finding. The one to look for is "
            "`This attribute is not supported in this context`, which says the "
            "`Applicable to:` line is wrong. Any other diagnostic more likely means the "
            "probe itself is malformed.\n\n")
    k.write("| Probe | Attribute | Placement | Attributes.md |\n|---|---|---|---|\n")
    for tag, e, target in probes:
        k.write("| `%s` | `[%s]` | %s | line %d |\n"
                % (tag, e["name"], HUMAN[target], e["line"]))
    if skipped:
        k.write("\n## Not probed\n\n")
        for e, why in skipped:
            k.write("- **`[%s]`** (line %d) -- %s\n" % (e["name"], e["line"], why))
    if no_app:
        k.write("\n## No `Applicable to:` line in the documentation\n\n")
        k.write("These entries state no placement at all, so there is nothing to verify "
                "and nothing for a reader to rely on:\n\n")
        for e in no_app:
            k.write("- **`[%s]`** (line %d)\n" % (e["name"], e["line"]))
    k.close()

    print("probes written : %d" % len(probes))
    print("attributes     : %d" % len({p[1]["name"] for p in probes}))
    print("not probed     : %d" % len(skipped))
    print("no Applicable  : %d" % len(no_app))
    print("key            : %s" % key_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
