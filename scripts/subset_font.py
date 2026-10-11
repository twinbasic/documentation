#!/usr/bin/env python3
"""Cut fonts down to the characters a picture draws, with fontTools.

The IDE screenshots drawn as SVG (scripts/svgshot/) carry their text as real
text, in subsets of the fonts the IDE drew it with: one subset per font per
picture, holding exactly the characters that picture needs.  This does the
subsetting, with the same fontTools options scripts/build_fonts.py gives the
site's webfonts, and keeps the hinting, so the text renders as the IDE drew it.

    python -m pip install "fonttools[woff]"
    python scripts/subset_font.py < jobs.json > results.json

Standard input is a JSON list of jobs.  A job names its font either as a file,
{"path": "C:/Windows/Fonts/segoeui.ttf", "index": 0} (index: the face within a
.ttc collection), or as the font's bytes, {"data": "<base64>"}; and the
characters to keep, {"unicodes": [70, 105, 108, 101]}; "hinting": false drops
the hinting instructions and tables; "weight": 600 cuts a variable font at that
weight first (held to its weight axis's range).  Standard output is a
JSON list with one {"woff2": "<base64>"} per job, in the same order, or
{"error": "<why>"} for a font that could not be subset, so that one font a web
page serves in a form fontTools cannot cut costs only its own text.

The output is deterministic: the font's own head.modified is kept rather than
set to the current time, so the same job always gives the same bytes.  Glyph
bounds are kept as the font stores them (see subset_font).
"""

import argparse
import base64
import io
import json
import sys


def subset_options():
    from fontTools import subset

    options = subset.Options()
    # fontTools' default layout features are the ones a browser applies unasked
    # (kern, liga, calt, ccmp, mark, ...), which are all a picture's text was
    # shaped with; "*" would also keep every glyph reachable through small caps
    # or a stylistic set, which the picture never shows.
    options.name_IDs = ["*"]  # keep the name table, copyright and licence notices
    options.notdef_outline = True
    options.flavor = "woff2"
    return options


def patch_gvar_subset():
    """Makes fontTools' subsetter take a gvar with glyphs missing, as the rest of fontTools does.

    A glyph with no entry in gvar.variations has no variation: gvar's own
    compile reads each glyph with variations.get(name, []), and the instancer
    deletes the entry of every glyph a partial instance leaves without one.
    The subsetter's gvar step (fontTools 4.65.0, subset/__init__.py,
    subset_glyphs for gvar) looks each kept glyph up instead, so pinning the
    weight of a font that keeps another axis (Segoe UI Variable has opsz)
    fails with KeyError '.notdef', the glyph it always keeps.  This is that
    step with a missing glyph read as none, which for a complete table is
    what it already did; delete it once fontTools does the same.
    """
    from fontTools import subset  # noqa: F401  (registers the subsetter's methods)
    from fontTools.ttLib import getTableClass

    gvar = getTableClass("gvar")
    if getattr(gvar.subset_glyphs, "missing_glyphs_as_none", False):
        return

    def subset_glyphs(self, s):
        self.variations = {g: self.variations.get(g, []) for g in s.glyphs}
        self.glyphCount = len(self.variations)
        return bool(self.variations)

    subset_glyphs.missing_glyphs_as_none = True
    gvar.subset_glyphs = subset_glyphs


def subset_font(raw, index, unicodes, hinting=True, weight=None):
    """The font in `raw` (face `index` of a collection) as a woff2 holding `unicodes`.

    Loaded through subset.load_font, as the fontTools.subset command line
    loads it: neither the timestamp nor the glyph bounds are recalculated.
    The bounds matter.  A font may store a glyph box looser than its outline
    (codicon does), and a TrueType rasteriser places the outline by the stored
    xMin against the left side bearing; a recalculated, tighter xMin with the
    side bearing left as it was moves the glyph sideways.

    `weight` cuts a variable font at that weight first (held to the range of
    its weight axis), so that the subset draws exactly the weight a run was
    drawn at; its other axes stay variable, as they were in the page, and a
    font with no weight axis is left as it is.
    """
    from fontTools import subset

    patch_gvar_subset()
    options = subset_options()
    options.font_number = index
    options.hinting = hinting
    font = subset.load_font(io.BytesIO(raw), options)
    if weight is not None and "fvar" in font:
        from fontTools.varLib import instancer

        axis = next((a for a in font["fvar"].axes if a.axisTag == "wght"), None)
        if axis is not None:
            at = min(max(float(weight), axis.minValue), axis.maxValue)
            font = instancer.instantiateVariableFont(font, {"wght": at}, inplace=True)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    out = io.BytesIO()
    subset.save_font(font, out, options)
    return out.getvalue()


def main():
    argparse.ArgumentParser(
        description=__doc__.split("\n\n", 1)[0],
        epilog="Exit codes: 0 every job has its result, a subset or the reason"
        " it could not be cut; 1 a missing dependency or unreadable input; 2 a"
        " refused command line.",
    ).parse_args()

    try:
        import brotli  # noqa: F401
        import fontTools  # noqa: F401
    except ImportError:
        raise SystemExit(
            'subset_font: missing dependencies. Run:\n  python -m pip install "fonttools[woff]"'
        )

    try:
        jobs = json.load(sys.stdin)
    except ValueError as e:
        raise SystemExit("subset_font: standard input is not a JSON list of jobs: %s" % e)

    results = []
    for n, job in enumerate(jobs):
        try:
            if "data" in job:
                raw = base64.b64decode(job["data"])
            else:
                with open(job["path"], "rb") as f:
                    raw = f.read()
            woff2 = subset_font(
                raw, job.get("index", 0), job["unicodes"], job.get("hinting", True), job.get("weight")
            )
        except Exception as e:
            results.append({"error": "job %d (%s): %r" % (n, job.get("path", "data"), e)})
            continue
        results.append({"woff2": base64.b64encode(woff2).decode("ascii")})
    json.dump(results, sys.stdout)


if __name__ == "__main__":
    main()
