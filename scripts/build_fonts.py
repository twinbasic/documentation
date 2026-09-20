#!/usr/bin/env python3
"""Regenerate the self-hosted webfonts under docs/assets/fonts/.

This is dev tooling, not part of the render pipeline -- tbdocs never runs it.
The .woff2 files it produces are committed artifacts, exactly like the DOT
SVGs and the vendored video thumbnails, so a normal `build.bat` needs neither
Python nor a network connection.  Re-run it only to bump a font version or to
widen the subset.

    python -m pip install "fonttools[woff]"
    python scripts/build_fonts.py

What it does, per face:

  1. Download the pinned upstream release archive and verify its SHA-256.
     A mismatch aborts -- an upstream that silently re-cuts a tag would
     otherwise change the site's typography with no diff to review.
  2. Pin the optical-size axis where the font has one (see FACES below).
  3. Subset to the Unicode ranges the docs actually use, plus headroom.
  4. Write woff2 into docs/assets/fonts/.

Why pin `opsz`.  Inter and Source Serif 4 both carry an optical-size axis
alongside `wght`.  Keeping it costs ~70 KB per face in `gvar` / `CFF2` delta
data -- more than trimming the character set would save -- and buys a subtle
refinement at display sizes.  Dropping it while keeping the *whole* character
set is the better trade for this site: an uncovered codepoint falls back to a
system font, which is the precise inconsistency this whole exercise removes.
`wght` stays variable on every face, which also lets the CSS keep asking for
font-weight 350 (two rules do) and get a real 350 rather than a browser-
dependent snap to 300 or 400.

Why these ranges.  Derived from a census of every codepoint in docs/, then
rounded out to whole Unicode blocks so that a new page using, say, a currency
symbol or an extra arrow does not silently drop to a fallback font.  Emoji are
deliberately excluded: a colour emoji font is several megabytes, and every
platform already ships one.
"""

import hashlib
import io
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEST = REPO / "docs" / "assets" / "fonts"
CACHE = REPO / ".font-cache"

# --- Unicode coverage ------------------------------------------------------
#
# Whole blocks, not a tight per-glyph list.  The census that motivated each
# block is in the comment; the block is kept entire so neighbouring
# codepoints a future page might use are already covered.

UNICODE_TEXT = ",".join([
    "U+0000-00FF",   # Basic Latin + Latin-1 Supplement (pound, degree, times)
    "U+0100-017F",   # Latin Extended-A  -- European names in prose
    "U+0180-024F",   # Latin Extended-B
    "U+02B0-02FF",   # Spacing modifier letters
    "U+0300-036F",   # Combining diacritics -- decomposed forms
    "U+0370-03FF",   # Greek -- pi in the perf notes; also mu, sigma, delta
    "U+2000-206F",   # General punctuation (en/em dash, ellipsis, quotes, U+2060)
    "U+2070-209F",   # Super/subscripts
    "U+20A0-20CF",   # Currency symbols
    "U+2100-214F",   # Letterlike (trade mark, numero, ohm, information)
    "U+2150-218F",   # Number forms -- the 1/8 .. 7/8 fractions in perf tables
    "U+2190-21FF",   # Arrows -- 248 uses of U+2192 alone
    "U+2200-22FF",   # Mathematical operators (approx, not-equal, minus)
    "U+2300-23FF",   # Miscellaneous technical
    "U+25A0-25FF",   # Geometric shapes (black right-pointing triangle)
    "U+2600-26FF",   # Miscellaneous symbols (warning sign)
    "U+2700-27BF",   # Dingbats (check mark U+2713)
    "U+FB00-FB04",   # fi / fl ligatures
    "U+FEFF",        # BOM
])

# Code blocks add box drawing and block elements -- 46 uses across the docs,
# all inside fenced samples.  Cascadia carries them at the same advance width
# as every other glyph, so the ASCII diagrams stay aligned.
UNICODE_MONO = UNICODE_TEXT + ",U+2500-257F,U+2580-259F"

# --- Sources ---------------------------------------------------------------
#
# sha256 is of the release archive as published.  Bumping a version means
# bumping the hash in the same commit.

SOURCES = {
    "inter": dict(
        url="https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip",
        sha256="9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e",
        license_member="LICENSE.txt",
        license_out="Inter-LICENSE.txt",
    ),
    "cascadia": dict(
        url="https://github.com/microsoft/cascadia-code/releases/download/"
            "v2407.24/CascadiaCode-2407.24.zip",
        sha256="e67a68ee3386db63f48b9054bd196ea752bc6a4ebb4df35adce6733da50c8474",
        # The release archive ships no licence file; take it from the tag.
        license_url="https://raw.githubusercontent.com/microsoft/cascadia-code/"
                    "v2407.24/LICENSE",
        license_out="CascadiaMono-LICENSE.txt",
    ),
    "serif": dict(
        url="https://github.com/adobe-fonts/source-serif/releases/download/"
            "4.005R/source-serif-4.005_WOFF2.zip",
        sha256="af10e80dcd2296748b04cb9917db9f7ba0ae65101165fd2f0c16b9812d9abd28",
        license_url="https://raw.githubusercontent.com/adobe-fonts/source-serif/"
                    "4.005R/LICENSE.md",
        license_out="SourceSerif4-LICENSE.txt",
    ),
}

# archive key, member path, pinned axes, unicode set, output name
FACES = [
    ("inter", "web/InterVariable.woff2",
     {"opsz": 16}, UNICODE_TEXT, "inter-variable.woff2"),
    ("inter", "web/InterVariable-Italic.woff2",
     {"opsz": 16}, UNICODE_TEXT, "inter-variable-italic.woff2"),
    ("cascadia", "woff2/CascadiaMono.woff2",
     {}, UNICODE_MONO, "cascadia-mono-variable.woff2"),
    ("cascadia", "woff2/CascadiaMonoItalic.woff2",
     {}, UNICODE_MONO, "cascadia-mono-variable-italic.woff2"),
    # Source Serif is PDF-only: no web stylesheet references it, so no reader
    # ever downloads it.  opsz is pinned at the book's 10.5pt body size.
    ("serif", "source-serif-4.005_WOFF2/VAR/SourceSerif4Variable-Roman.otf.woff2",
     {"opsz": 11}, UNICODE_TEXT, "source-serif-4-variable.woff2"),
    ("serif", "source-serif-4.005_WOFF2/VAR/SourceSerif4Variable-Italic.otf.woff2",
     {"opsz": 11}, UNICODE_TEXT, "source-serif-4-variable-italic.woff2"),
]


def fetch(url, sha256=None):
    """Download to .font-cache/, keyed by basename; verify the digest."""
    CACHE.mkdir(exist_ok=True)
    dest = CACHE / url.rsplit("/", 1)[-1]
    if not dest.exists():
        print("  downloading " + url)
        with urllib.request.urlopen(url) as r, open(dest, "wb") as f:
            shutil.copyfileobj(r, f)
    data = dest.read_bytes()
    if sha256:
        got = hashlib.sha256(data).hexdigest()
        if got != sha256:
            raise SystemExit(
                "sha256 mismatch for " + url
                + "\n  expected " + sha256
                + "\n  got      " + got
                + "\nDelete " + str(dest) + " and retry, or update SOURCES"
                  " if the bump is intended."
            )
    return data


def build_face(archive, member, axes, unicodes, out_name):
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer

    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        raw = z.read(member)

    font = TTFont(io.BytesIO(raw))
    font.flavor = None                       # decompress woff2 before editing
    if axes:
        font = instancer.instantiateVariableFont(font, axes, inplace=False)

    tmp = CACHE / ("_pin_" + out_name)
    font.flavor = "woff2"
    font.save(tmp)

    out = DEST / out_name
    subprocess.run([
        sys.executable, "-m", "fontTools.subset", str(tmp),
        "--unicodes=" + unicodes,
        "--layout-features=*",   # keep kerning, contextual alternates, fractions
        "--name-IDs=*",          # keep the name table, including the OFL notice
        "--notdef-outline",
        "--flavor=woff2",
        "--output-file=" + str(out),
    ], check=True)
    tmp.unlink()
    return len(raw), out.stat().st_size


def main():
    try:
        import fontTools  # noqa: F401
        import brotli     # noqa: F401
    except ImportError:
        raise SystemExit(
            "build_fonts: missing dependencies. Run:\n"
            '  python -m pip install "fonttools[woff]"'
        )

    DEST.mkdir(parents=True, exist_ok=True)
    archives = {}
    for key, spec in SOURCES.items():
        print(key + ":")
        archives[key] = fetch(spec["url"], spec["sha256"])
        lic = DEST / spec["license_out"]
        if "license_member" in spec:
            with zipfile.ZipFile(io.BytesIO(archives[key])) as z:
                lic.write_bytes(z.read(spec["license_member"]))
        else:
            lic.write_bytes(fetch(spec["license_url"]))
        print("  " + lic.name)

    total_in = total_out = 0
    for key, member, axes, unicodes, out_name in FACES:
        src_bytes, out_bytes = build_face(
            archives[key], member, axes, unicodes, out_name)
        total_in += src_bytes
        total_out += out_bytes
        print("  %-38s %7.1f KB -> %6.1f KB"
              % (out_name, src_bytes / 1024, out_bytes / 1024))

    print("  %-38s %7.1f KB -> %6.1f KB"
          % ("TOTAL", total_in / 1024, total_out / 1024))
    print("\nWritten to " + str(DEST) + ". Commit the .woff2 and licence files.")


if __name__ == "__main__":
    main()
