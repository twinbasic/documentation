"""
Scan docs/_site-offline/ for any https://docs.twinbasic.com/<path>
reference outside of <code> / <pre> blocks. Exit 1 if any found,
0 otherwise.

Run by docs/check.bat after the offline lychee pass. After
_plugins/offlinify.rb's SEO-block strip, no live-site references
should remain except:

  * Sample URLs inside <code> / <pre> blocks (tutorial code that
    legitimately shows live URLs as data, e.g. the VBRUN.Hyperlink
    `NavigateTo "https://docs.twinbasic.com/"` example). Skipped
    via the same code-block shape offlinify uses for its URL
    rewrite.
  * The bare root URL `https://docs.twinbasic.com` or
    `https://docs.twinbasic.com/` -- intentional "go to the live
    docs site" links (e.g. the Documentation entry in the FAQ
    resource list). Skipped via the tail check below.

Anything deeper (`https://docs.twinbasic.com/tB/Core/Const`,
`https://docs.twinbasic.comi`, ...) is flagged: in the offline
copy those navigate back to the live site, undermining the local
read; in source they should be a relative link or a /tB/...
permalink that resolves locally.

Run from anywhere:
    python scripts/check_offline_live_links.py
"""

import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
OFFLINE_TREE = REPO_ROOT / "docs" / "_site-offline"

# Matches a <code>...</code> or <pre>...</pre> block. Same shape as
# _plugins/offlinify.rb CODE_BLOCK_RE so sample URLs in tutorial
# code are skipped here too.
CODE_BLOCK_RE = re.compile(r"<(code|pre)\b[^>]*>.*?</\1>", re.DOTALL)

# Captures the trailing path/typo characters after the domain. An
# empty tail or `/` means the bare root URL (intentional). Anything
# else is a deep link or a typo (`.comi`, `.com/tB/...`).
LIVE_LINK_RE = re.compile(r"https://docs\.twinbasic\.com(?P<tail>[^\s\"'<>]*)")


def main() -> int:
    if not OFFLINE_TREE.is_dir():
        print(
            f"_site-offline/ not found at {OFFLINE_TREE} -- run docs/build.bat first."
        )
        return 2

    hits = []
    for html in sorted(OFFLINE_TREE.rglob("*.html")):
        content = html.read_text(encoding="utf-8")
        link_matches = list(LIVE_LINK_RE.finditer(content))
        if not link_matches:
            continue
        code_ranges = [(m.start(), m.end()) for m in CODE_BLOCK_RE.finditer(content)]
        for m in link_matches:
            tail = m.group("tail")
            if tail == "" or tail == "/":
                continue
            if any(s <= m.start() < e for s, e in code_ranges):
                continue
            line_num = content.count("\n", 0, m.start()) + 1
            start = max(0, m.start() - 60)
            end = min(len(content), m.start() + 80)
            snippet = re.sub(r"[\r\n]+", " ", content[start:end])
            hits.append((html, line_num, snippet))

    if hits:
        print(
            f"FAIL: {len(hits)} reference(s) to docs.twinbasic.com in "
            f"_site-offline/ outside code blocks:"
        )
        for path, line_num, snippet in hits:
            try:
                rel = path.relative_to(REPO_ROOT)
            except ValueError:
                rel = path
            print(f"  {rel}:{line_num}: ...{snippet}...")
        print()
        print(
            "Update the source markdown to use a relative link or /tB/... "
            "permalink instead."
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
