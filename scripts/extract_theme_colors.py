"""Extract Symbol* syntax-highlighting properties from twinBASIC IDE .theme files.

Produces three CSS files in scripts/themes/ — twinbasic-classic.css,
twinbasic-dark.css, twinbasic-light.css — one CSS rule per Symbol with the
four properties (Color, FontStyle, FontWeight, TextDecoration) grouped
together.

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
    out = [f"/* {header} */\n\n"]
    for sym in sorted(theme):
        props = theme[sym]
        out.append(f".Symbol{sym} {{\n")
        for key in ("Color", "FontStyle", "FontWeight", "TextDecoration"):
            if key in props:
                out.append(f"  {CSS_PROP[key]}: {props[key]};\n")
        out.append("}\n\n")
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
        render_css(light, "twinBASIC Light theme - syntax highlighting colors"),
        encoding="utf-8",
    )
    (OUT_DIR / "twinbasic-dark.css").write_text(
        render_css(dark, "twinBASIC Dark theme - syntax highlighting colors"),
        encoding="utf-8",
    )
    (OUT_DIR / "twinbasic-classic.css").write_text(
        render_css(
            classic,
            "twinBASIC Classic theme - syntax highlighting colors (Light + Classic overrides)",
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
