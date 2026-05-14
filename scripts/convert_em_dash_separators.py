"""
Normalise literal en-/em-dashes in markdown source to kramdown smart_quotes form.

Kramdown's smart_quotes feature (enabled by default) renders:
  source `--`  -> en-dash (`-`)
  source `---` -> em-dash (`-`)

Literal `-` and `-` characters in source are therefore redundant. This script
converts them to the equivalent source form, preserving the rendered output:

  * Bullet-list separator em-dash (the first `-` on a `- [link](url) ...` line):
    converted to `--` to match the established See Also separator convention
    (which renders as en-dash).
  * All other em-dashes (prose parentheticals, etc.):
    converted to `---` (renders as em-dash, unchanged).
  * All en-dashes:
    converted to `--` (renders as en-dash, unchanged).

Code is skipped:
  * Fenced code blocks (``` ... ```) are left intact.
  * Inline code spans (`...`) on a line are left intact.

Run from the repository root:
    python scripts/convert_em_dash_separators.py
"""

import re
from pathlib import Path

ROOT = Path("docs")

EM_DASH = "—"
EN_DASH = "–"

# First em-dash after a `[link](url)` on a bullet line. Stops at backticks
# so we don't reach into an inline-code span.
SEPARATOR_PATTERN = re.compile(
    r"^(- \[.*?\]\(.*?\)[^" + EM_DASH + r"\n`]*)" + EM_DASH
)

# A fenced-code-block opener / closer.
FENCE_PATTERN = re.compile(r"^```")

# Split a line into alternating prose / inline-code segments.
INLINE_CODE_SPLIT = re.compile(r"(`[^`\n]*`)")


def process_line(line: str) -> tuple[str, int, int, int]:
    n_sep = 0
    n_em = 0
    n_en = 0

    # Step 1: bullet-list separator em-dash -> `--` (one substitution).
    line, n = SEPARATOR_PATTERN.subn(r"\1--", line, count=1)
    n_sep = n

    # Step 2: remaining em-dash -> `---`, en-dash -> `--`, but only outside
    # inline-code spans.
    parts = INLINE_CODE_SPLIT.split(line)
    new_parts = []
    for part in parts:
        if len(part) >= 2 and part.startswith("`") and part.endswith("`"):
            new_parts.append(part)
            continue
        n_em += part.count(EM_DASH)
        n_en += part.count(EN_DASH)
        part = part.replace(EM_DASH, "---").replace(EN_DASH, "--")
        new_parts.append(part)
    line = "".join(new_parts)

    return line, n_sep, n_em, n_en


def main() -> None:
    total_files = 0
    total_sep = 0
    total_em = 0
    total_en = 0

    for md in sorted(ROOT.rglob("*.md")):
        lines = md.read_text(encoding="utf-8").splitlines(keepends=True)
        new_lines = []
        in_fence = False
        file_sep = 0
        file_em = 0
        file_en = 0

        for line in lines:
            if FENCE_PATTERN.match(line):
                in_fence = not in_fence
                new_lines.append(line)
                continue
            if in_fence:
                new_lines.append(line)
                continue

            new_line, n_sep, n_em, n_en = process_line(line)
            file_sep += n_sep
            file_em += n_em
            file_en += n_en
            new_lines.append(new_line)

        if file_sep + file_em + file_en > 0:
            md.write_text("".join(new_lines), encoding="utf-8")
            total_files += 1
            total_sep += file_sep
            total_em += file_em
            total_en += file_en
            print(
                f"  {md}: sep={file_sep}, prose-em={file_em}, en={file_en}"
            )

    print()
    print(f"Files changed: {total_files}")
    print(f"Separator em-dash -> --:  {total_sep}")
    print(f"Prose em-dash    -> ---:  {total_em}")
    print(f"En-dash          -> --:   {total_en}")
    print(f"Total replacements:       {total_sep + total_em + total_en}")


if __name__ == "__main__":
    main()
