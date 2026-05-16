"""Extract Symbol* syntax-highlighting properties from twinBASIC IDE .theme files
and emit Rouge-compatible CSS/SCSS.

Two outputs per run:

1. scripts/themes/twinbasic-{classic,dark,light}.css -- flat CSS for inspection.
   One rule per Rouge HTML formatter class (e.g. .k, .nc, .cp) that
   docs/_plugins/twinbasic.rb emits, with colors and font properties taken
   from the corresponding tB theme Symbol.

2. docs/_sass/custom/_twinbasic-{light,dark}.scss -- SCSS partials shipped in
   the site, scoped under `.language-tb .highlight` so they only repaint
   fenced ```tb``` code blocks and leave OneLight/OneDark untouched on every
   other language. Classic is inspection-only (no SCSS).

The mapping is many-to-one: several tB theme Symbols share a single Rouge
class because the lexer doesn't distinguish them (e.g. SymbolSub folds into
.nf alongside SymbolFunction). The mapping below picks the canonical tB
Symbol per Rouge class; the unmapped Symbols are listed at the bottom of
each emitted file for reference.

The Classic theme inherits from Light and overrides a subset; the script
resolves the inheritance so the emitted CSS reflects the effective theme.
"""

import os
import re
from pathlib import Path

THEMES_DIR = Path(os.environ["USERPROFILE"]) / "Desktop" / "twinBASIC_IDE_BETA_982" / "themes"
REPO_ROOT = Path(__file__).resolve().parent.parent
CSS_OUT_DIR = REPO_ROOT / "scripts" / "themes"
SCSS_OUT_DIR = REPO_ROOT / "docs" / "_sass" / "custom"

CSS_PROP = {
    "Color": "color",
    "FontStyle": "font-style",
    "FontWeight": "font-weight",
    "TextDecoration": "text-decoration",
}

# Rouge HTML formatter class -> tB theme Symbol (canonical source for colors).
# Only includes Rouge classes that twinbasic.rb actually emits. Order here is
# the order the rules appear in the emitted CSS.
ROUGE_TO_SYMBOL: list[tuple[str, str, str]] = [
    ("c1", "Comment",                         "' comments and REM"),
    ("cm", "Comment",                         "C-style block comments"),
    ("cp", "ConditionalCompilationDirective", "#If / #ElseIf / #Else / #End If / #Const / #Region"),
    ("k",  "Keyword",                         "Dim, If, End, Sub, ..."),
    ("kd", "Keyword",                         "Option Strict / Explicit / Compare / Base"),
    ("kt", "BuiltInDataType",                 "Boolean, Integer, String, ..."),
    ("lb", "LiteralBoolean",                  "True, False"),
    ("lc", "ContinuationCharacter",           "'_' line-continuation marker"),
    ("ld", "LiteralDate",                     "#m/d/yyyy [h:mm:ss am/pm]# date-time literals"),
    ("le", "LiteralEmpty",                    "Empty"),
    ("ln", "LiteralNothing",                  "Nothing"),
    ("lu", "LiteralNull",                     "Null"),
    ("mi", "LiteralNumeric",                  "integer literals"),
    ("mf", "LiteralNumeric",                  "float literals"),
    ("s",  "LiteralString",                   "string literals"),
    ("se", "LiteralString",                   "\"\" escape inside string literals"),
    ("o",  "Operator",                        "+, -, =, <, >, &, ..."),
    ("ow", "NamedOperator",                   "And, Or, Not, Is, Mod, ..."),
    ("na", "Attribute",                       "[Documentation(...)] attribute names"),
    ("nb", "Class",                           "Debug, Err"),
    ("nc", "Class",                           "Class / CoClass / Enum / Interface / Type / Structure names"),
    ("nf", "Function",                        "Function / Sub / Property names"),
    ("nn", "Module",                          "Module / Namespace / Imports targets"),
    ("nv", "Variable",                        "Dim / Const / ReDim variable names"),
]

# tB Symbols that have no Rouge counterpart from twinbasic.rb. The lexer either
# doesn't tokenize them at all or folds them into a broader Rouge token (in which
# case the canonical Symbol in ROUGE_TO_SYMBOL wins).
UNMAPPED_SYMBOLS: list[tuple[str, str]] = [
    ("ConditionalCompilationExcludedCode", "not tokenized — would need preproc evaluation"),
    ("Constant",                           "not distinguished from Name"),
    ("DeclareFunction",                    "not distinguished from Keyword .k"),
    ("DeclareSub",                         "not distinguished from Keyword .k"),
    ("Enum",                               "folded into Name::Class .nc"),
    ("EnumMember",                         "not distinguished from Name"),
    ("Field",                              "not distinguished from Name"),
    ("GenericDataType",                    "not tokenized"),
    ("GenericValue",                       "not tokenized"),
    ("GlobalVariablePrivate",              "not distinguished from Name"),
    ("GlobalVariablePublic",               "not distinguished from Name"),
    ("Interface",                          "folded into Name::Class .nc"),
    ("LateBoundFunction",                  "not distinguished from Name"),
    ("Library",                            "not distinguished from Name"),
    ("LineLabel",                          "not tokenized"),
    ("LineNumber",                         "not tokenized"),
    ("Me",                                 "folded into Keyword .k"),
    ("MultiLineSeperator",                 "not tokenized"),
    ("NamedArgument",                      "not tokenized"),
    ("ParamByRef",                         "not tokenized"),
    ("ParamByVal",                         "not tokenized"),
    ("PropertyGet",                        "folded into Keyword .k"),
    ("PropertyLet",                        "folded into Keyword .k"),
    ("PropertySet",                        "folded into Keyword .k"),
    ("ReturnValue",                        "not tokenized"),
    ("Sub",                                "folded into Name::Function .nf"),
    ("UDT",                                "folded into Name::Class .nc"),
    ("VariableUndeclared",                 "not distinguished from Name"),
]

PROPERTY_LINE = re.compile(r"^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+?)\s*;?\s*$")
SYMBOL_PROP = re.compile(r"^Symbol([A-Za-z]+?)(Color|FontStyle|FontWeight|TextDecoration)$")


def parse_theme(path: Path) -> dict[str, str]:
    """Parse a .theme file into a flat `property -> value` dict. Properties with
    an empty value (the IDE theme's `Name:    ;` fall-back-to-parent form) are
    omitted."""
    result: dict[str, str] = {}
    text = re.sub(r"/\*.*?\*/", "", path.read_text(encoding="utf-8"), flags=re.DOTALL)
    for raw in text.splitlines():
        m = PROPERTY_LINE.match(raw.strip())
        if not m:
            continue
        name, value = m.group(1), m.group(2).strip().rstrip(";").strip()
        if not value:
            continue
        result[name] = value
    return result


def symbol_props(theme: dict[str, str]) -> dict[str, dict[str, str]]:
    """Filter a flat theme dict down to its Symbol* entries, grouped by Symbol
    name and keyed by the bare property suffix (Color / FontStyle / ...)."""
    grouped: dict[str, dict[str, str]] = {}
    for name, value in theme.items():
        m = SYMBOL_PROP.match(name)
        if not m:
            continue
        sym, prop = m.group(1), m.group(2)
        grouped.setdefault(sym, {})[prop] = value
    return grouped


def render_css(theme: dict[str, dict[str, str]], header: str) -> str:
    out = [f"/* {header} */\n"]
    out.append("/* Selectors are the Rouge HTML formatter classes emitted by docs/_plugins/twinbasic.rb. */\n\n")

    for rouge, sym, comment in ROUGE_TO_SYMBOL:
        props = theme.get(sym)
        if not props:
            continue
        out.append(f".{rouge} {{  /* Symbol{sym} — {comment} */\n")
        for key in ("Color", "FontStyle", "FontWeight", "TextDecoration"):
            if key in props:
                out.append(f"  {CSS_PROP[key]}: {props[key]};\n")
        out.append("}\n\n")

    out.append("/* tB Symbols with no dedicated Rouge class in twinbasic.rb: */\n")
    for sym, why in UNMAPPED_SYMBOLS:
        out.append(f"/*   Symbol{sym} — {why} */\n")

    return "".join(out)


def render_scss(theme: dict[str, dict[str, str]], header: str, code_bg: str | None = None) -> str:
    out = [f"/* {header} */\n"]
    out.append("/* Selectors are the Rouge HTML formatter classes emitted by docs/_plugins/twinbasic.rb. */\n")
    out.append("/* Scoped under .language-tb .highlight so they only repaint tB fenced code blocks. */\n\n")
    out.append(".language-tb .highlight {\n")

    rules = []
    for rouge, sym, comment in ROUGE_TO_SYMBOL:
        props = theme.get(sym)
        if not props:
            continue
        rule = [f"  .{rouge} {{  /* Symbol{sym} — {comment} */\n"]
        for key in ("Color", "FontStyle", "FontWeight", "TextDecoration"):
            if key in props:
                rule.append(f"    {CSS_PROP[key]}: {props[key]};\n")
        rule.append("  }\n")
        rules.append("".join(rule))
    out.append("\n".join(rules))
    out.append("}\n")

    if code_bg:
        out.append("\n")
        out.append("/* tB CodePanelBackColor scoped to tB code-block containers (.language-tb).    */\n")
        out.append("/* The .language-tb class lives on the outer .highlighter-rouge div emitted    */\n")
        out.append("/* by kramdown for ```tb``` fenced blocks, so `.language-tb.highlighter-rouge` */\n")
        out.append("/* (no space) hits the outer container and `.language-tb <descendant>` hits    */\n")
        out.append("/* the nested .highlight / pre / etc. The partial is imported inside           */\n")
        out.append("/* `html.dark-mode { ... }` by just-the-docs-combined.scss, so SCSS nesting    */\n")
        out.append("/* confines these rules to dark mode automatically.                            */\n")
        out.append(".language-tb.highlighter-rouge,\n")
        out.append(".language-tb .highlight,\n")
        out.append(".language-tb pre.highlight,\n")
        out.append(".language-tb .highlight pre {\n")
        out.append(f"  background-color: {code_bg};\n")
        out.append("}\n")

    return "".join(out)


def main() -> None:
    light = parse_theme(THEMES_DIR / "Light.theme")
    dark = parse_theme(THEMES_DIR / "Dark.theme")
    classic = parse_theme(THEMES_DIR / "Classic.theme")

    light_syms = symbol_props(light)
    dark_syms = symbol_props(dark)
    classic_syms = {sym: dict(props) for sym, props in light_syms.items()}
    for sym, props in symbol_props(classic).items():
        classic_syms.setdefault(sym, {}).update(props)

    # Flat CSS for inspection.
    CSS_OUT_DIR.mkdir(parents=True, exist_ok=True)
    (CSS_OUT_DIR / "twinbasic-light.css").write_text(
        render_css(light_syms, "twinBASIC Light theme - Rouge syntax highlighting"),
        encoding="utf-8",
    )
    (CSS_OUT_DIR / "twinbasic-dark.css").write_text(
        render_css(dark_syms, "twinBASIC Dark theme - Rouge syntax highlighting"),
        encoding="utf-8",
    )
    (CSS_OUT_DIR / "twinbasic-classic.css").write_text(
        render_css(
            classic_syms,
            "twinBASIC Classic theme - Rouge syntax highlighting (Light + Classic overrides)",
        ),
        encoding="utf-8",
    )

    # SCSS partials shipped in the site (classic is inspection-only).
    SCSS_OUT_DIR.mkdir(parents=True, exist_ok=True)
    (SCSS_OUT_DIR / "_twinbasic-light.scss").write_text(
        render_scss(light_syms, "twinBASIC Light theme - Rouge syntax highlighting"),
        encoding="utf-8",
    )
    (SCSS_OUT_DIR / "_twinbasic-dark.scss").write_text(
        render_scss(
            dark_syms,
            "twinBASIC Dark theme - Rouge syntax highlighting",
            code_bg=dark.get("CodePanelBackColor"),
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
