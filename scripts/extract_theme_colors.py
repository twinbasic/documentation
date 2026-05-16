"""Extract Symbol* syntax-highlighting properties from twinBASIC IDE .theme files
and emit Rouge-compatible CSS.

Produces three CSS files in scripts/themes/ — twinbasic-classic.css,
twinbasic-dark.css, twinbasic-light.css. Each rule uses the Rouge HTML
formatter class (e.g. .k, .nc, .cp) that docs/_plugins/twinbasic.rb emits
for that token, with the colors and font properties taken from the
corresponding tB theme Symbol.

The mapping is many-to-one: several tB theme Symbols share a single Rouge
class because the lexer doesn't distinguish them (e.g. SymbolMe,
SymbolLiteralBoolean, SymbolLiteralNothing all fall under Rouge Keyword .k
alongside SymbolKeyword). The mapping below picks the canonical tB Symbol
per Rouge class; the unmapped Symbols are listed at the bottom of each
emitted file for reference.

The Classic theme inherits from Light and overrides a subset; the script
resolves the inheritance so the emitted CSS reflects the effective theme.
"""

import os
import re
from pathlib import Path

THEMES_DIR = Path(os.environ["USERPROFILE"]) / "Desktop" / "twinBASIC_IDE_BETA_982" / "themes"
OUT_DIR = Path(__file__).resolve().parent / "themes"

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

SYMBOL_LINE = re.compile(
    r"^Symbol([A-Za-z]+?)(Color|FontStyle|FontWeight|TextDecoration)\s*:\s*(.+?)\s*;?\s*$"
)


def parse_theme(path: Path) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    text = re.sub(r"/\*.*?\*/", "", path.read_text(encoding="utf-8"), flags=re.DOTALL)
    for raw in text.splitlines():
        line = raw.strip()
        if not line.startswith("Symbol"):
            continue
        m = SYMBOL_LINE.match(line)
        if not m:
            continue
        sym, prop, value = m.group(1), m.group(2), m.group(3).strip().rstrip(";").strip()
        result.setdefault(sym, {})[prop] = value
    return result


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


def main() -> None:
    light = parse_theme(THEMES_DIR / "Light.theme")
    dark = parse_theme(THEMES_DIR / "Dark.theme")
    classic_overrides = parse_theme(THEMES_DIR / "Classic.theme")

    classic = {sym: dict(props) for sym, props in light.items()}
    for sym, props in classic_overrides.items():
        classic.setdefault(sym, {}).update(props)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "twinbasic-light.css").write_text(
        render_css(light, "twinBASIC Light theme - Rouge syntax highlighting"),
        encoding="utf-8",
    )
    (OUT_DIR / "twinbasic-dark.css").write_text(
        render_css(dark, "twinBASIC Dark theme - Rouge syntax highlighting"),
        encoding="utf-8",
    )
    (OUT_DIR / "twinbasic-classic.css").write_text(
        render_css(
            classic,
            "twinBASIC Classic theme - Rouge syntax highlighting (Light + Classic overrides)",
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
