"""
Offline link checker for static sites.

CLI mirrors the subset of lychee flags used by docs/check.bat, so that an
invocation like

    python scripts/check_links.py --offline --include-fragments
        --fallback-extensions html --index-files "index.html,."
        --root-dir docs/_site docs/_site

produces the same correctness verdict as the equivalent lychee call (only
faster and a bit stricter -- see "Differences from lychee" below).

Why this exists: lychee's offline pipeline funnels every link occurrence
through an async channel before its dedup cache short-circuits the work.
On this site (~733k occurrences, ~12k unique targets) that fixed-per-
occurrence overhead is ~50s on Windows. This script dedupes (target, frag)
up front, so the filesystem and fragment checks run once per unique target.

Online (network) link checking is not implemented. --offline is therefore
required; the script exits non-zero if it is absent.

Differences from lychee (correctness):
  * Trailing slash on a file-shaped URL ('foo.html/') is reported broken,
    where lychee normalises and accepts. Catches authoring mistakes.
  * <script src> URLs are checked. Lychee 0.24.1 silently skips them.

Differences from lychee (output): no per-link line numbers in error
messages -- selectolax doesn't expose source positions.
"""

import argparse
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import unquote, urlparse

from selectolax.parser import HTMLParser

# (selector, attribute_name) pairs. We can't use a single multi-selector
# query because some elements expose links under non-href/src attributes
# (cite, action, data, srcset, ...). Lychee covers a similar set in
# lychee-lib/src/extract/html/html5gum.rs.
LINK_ATTRS = [
    ("a[href]", "href"),
    ("area[href]", "href"),
    ("base[href]", "href"),
    ("link[href]", "href"),
    ("img[src]", "src"),
    ("img[longdesc]", "longdesc"),
    ("img[srcset]", "srcset"),
    ("script[src]", "src"),
    ("iframe[src]", "src"),
    ("frame[src]", "src"),
    ("embed[src]", "src"),
    ("source[src]", "src"),
    ("source[srcset]", "srcset"),
    ("audio[src]", "src"),
    ("video[src]", "src"),
    ("video[poster]", "poster"),
    ("track[src]", "src"),
    ("input[src]", "src"),
    ("input[formaction]", "formaction"),
    ("button[formaction]", "formaction"),
    ("form[action]", "action"),
    ("object[data]", "data"),
    ("blockquote[cite]", "cite"),
    ("q[cite]", "cite"),
    ("del[cite]", "cite"),
    ("ins[cite]", "cite"),
]

SRCSET_ATTRS = {"srcset"}


def _split_srcset(value):
    # srcset is `URL [descriptor], URL [descriptor], ...`. Descriptors
    # cannot contain commas, so a comma split is safe; each part's first
    # whitespace-separated token is the URL.
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        url = part.split(None, 1)[0]
        if url:
            yield url


def extract_links(html_path):
    data = html_path.read_bytes()
    tree = HTMLParser(data)
    out = []
    for selector, attr in LINK_ATTRS:
        for node in tree.css(selector):
            v = node.attributes.get(attr)
            if not v:
                continue
            if attr in SRCSET_ATTRS:
                out.extend(_split_srcset(v))
            else:
                out.append(v)
    return out


def extract_fragment_ids(html_path):
    data = html_path.read_bytes()
    tree = HTMLParser(data)
    ids = set()
    for node in tree.css("[id]"):
        v = node.attributes.get("id")
        if v:
            ids.add(v)
    for node in tree.css("a[name]"):
        v = node.attributes.get("name")
        if v:
            ids.add(v)
    return ids


def _normalize_base_path(s):
    """Coerce a base-path arg into the canonical '/prefix' form (leading
    slash, no trailing slash). Empty input maps to empty string."""
    if not s:
        return ""
    s = s.strip().rstrip("/")
    if not s:
        return ""
    if not s.startswith("/"):
        s = "/" + s
    return s


def _strip_base_path(path_str, base_path):
    """Lop a base-path prefix off an absolute URL path, if it matches.

    A Jekyll build with `--baseurl /twinBASIC-docs` produces hrefs like
    '/twinBASIC-docs/foo' that resolve, in the deployed site, to '/foo'
    under the actual root. This mirrors lychee's `--remap` regex but as
    a clean prefix strip:

      '/twinBASIC-docs/foo' -> '/foo'      (prefix + /...)
      '/twinBASIC-docs'     -> '/'          (bare prefix, treat as root)
      '/twinBASIC-docs-other' -> unchanged  (only strip on '/' or end-of-string)
      '/foo'                -> unchanged    (no prefix match)
    """
    if not base_path:
        return path_str
    if path_str == base_path:
        return "/"
    if path_str.startswith(base_path + "/"):
        return path_str[len(base_path):]
    return path_str


def resolve(href, source_dir_str, source_str, root_str, base_path=""):
    """Lexically resolve href -> (normalized_target_str, is_dir_link, fragment).
    Returns None for schemes/netlocs we skip. Uses only string ops — no
    filesystem syscalls (Path.resolve is ~110us per call on Windows).

    is_dir_link captures whether the URL ended in '/' before normalization.
    os.path.normpath strips trailing slashes, but the distinction matters
    for resolution: 'foo/' must resolve as a directory (try index files),
    while 'foo' falls through to fallback extensions ('foo.html') if no
    file/dir 'foo' exists.

    base_path is an absolute-URL prefix to strip before resolving against
    root_str -- e.g. '/twinBASIC-docs' to handle a Jekyll --baseurl build.
    Only applied to absolute URLs; relative paths are unaffected.
    """
    if "#" in href:
        path_part, frag = href.split("#", 1)
    else:
        path_part, frag = href, None
    if not path_part:
        return source_str, False, frag

    if ":" in path_part[:16] or path_part.startswith("//"):
        parsed = urlparse(path_part)
        if parsed.scheme or parsed.netloc:
            return None
        path_str = parsed.path
    else:
        path_str = path_part

    if "%" in path_str:
        path_str = unquote(path_str)

    is_dir_link = path_str.endswith("/") or path_str.endswith("/.")

    if path_str.startswith("/"):
        path_str = _strip_base_path(path_str, base_path)
        target = os.path.normpath(os.path.join(root_str, path_str.lstrip("/")))
    else:
        target = os.path.normpath(os.path.join(source_dir_str, path_str))
    return target, is_dir_link, frag


def check_path(target_str, is_dir_link, fallback_exts, index_files):
    """Mirror lychee --fallback-extensions / --index-files semantics.

    A trailing-slash URL ('foo/') must resolve as a directory: try each
    index_file in order, with '.' meaning 'accept the directory itself'.
    Fallback extensions never apply to dir-shaped links.

    A non-slash URL ('foo') tries the path as a file first, then as a dir
    (same index-file logic), then falls back to fallback extensions.
    """
    target = Path(target_str)
    if is_dir_link:
        if not target.is_dir():
            return None
        for idx in index_files:
            if idx == ".":
                return target
            cand = target / idx
            if cand.is_file():
                return cand
        return None
    if target.is_file():
        return target
    if target.is_dir():
        for idx in index_files:
            if idx == ".":
                return target
            cand = target / idx
            if cand.is_file():
                return cand
        return None
    for ext in fallback_exts:
        cand = Path(target_str + "." + ext)
        if cand.is_file():
            return cand
    return None


def _build_parser():
    ap = argparse.ArgumentParser(
        prog="check_links.py",
        description=(
            "Offline link checker. CLI mirrors the subset of lychee flags "
            "used by check.bat. Only offline checking is implemented; "
            "--offline is required."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument(
        "--offline", action="store_true",
        help=(
            "REQUIRED. Skip network checks (the only mode supported). "
            "This script exits non-zero if the flag is absent."
        ),
    )
    ap.add_argument(
        "--include-fragments", action="store_true",
        help=(
            "Verify URL fragments (#anchor) against id/name attributes in "
            "the target HTML. Off by default to match lychee."
        ),
    )
    ap.add_argument(
        "--fallback-extensions", default="", metavar="EXTS",
        help=(
            "Comma-separated extensions to try if a path does not resolve "
            "as-is (e.g. 'html'). Empty by default."
        ),
    )
    ap.add_argument(
        "--index-files", default="", metavar="FILES",
        help=(
            "Comma-separated index file names to try when a path resolves "
            "to a directory. Use '.' to accept the directory itself when "
            "no index file matches. Empty by default."
        ),
    )
    ap.add_argument(
        "--root-dir", type=Path, metavar="DIR",
        help=(
            "Root directory for absolute URL paths (e.g. '/foo'). "
            "If absent, absolute URLs cannot be resolved and are reported "
            "as broken."
        ),
    )
    ap.add_argument(
        "--base-path", default="", metavar="PREFIX",
        help=(
            "URL-path prefix to strip from absolute URLs before resolving "
            "against --root-dir. Matches a Jekyll build's --baseurl, e.g. "
            "'/twinBASIC-docs'. Equivalent to a constrained form of "
            "lychee's --remap. Empty by default (no stripping)."
        ),
    )
    ap.add_argument(
        "--threads", type=int, default=os.cpu_count() or 4, metavar="N",
        help="Worker threads for HTML parsing. Default: CPU count.",
    )
    ap.add_argument(
        "-v", "--verbose", action="store_true",
        help="Print per-stage timing breakdown.",
    )
    ap.add_argument(
        "inputs", nargs="+", type=Path,
        help=(
            "Files or directories to scan. Directories are searched "
            "recursively for *.html."
        ),
    )
    return ap


def _collect_html_files(inputs):
    out = []
    for inp in inputs:
        if inp.is_file():
            out.append(inp)
        elif inp.is_dir():
            out.extend(inp.rglob("*.html"))
        else:
            print(f"warning: input not found: {inp}", file=sys.stderr)
    return out


def main():
    ap = _build_parser()
    # parse_known_args so extra lychee flags passed via check.bat's %*
    # don't break us. Unknown flags are surfaced as a warning.
    args, extra = ap.parse_known_args()
    if extra:
        print(
            f"warning: ignoring unrecognised arguments: {' '.join(extra)}",
            file=sys.stderr,
        )

    if not args.offline:
        ap.error(
            "--offline is required. Online (network) checking is not "
            "implemented by this tool; use lychee for that."
        )

    root_str = str(args.root_dir.resolve()) if args.root_dir else ""
    fallback_exts = [e for e in args.fallback_extensions.split(",") if e]
    index_files = [e for e in args.index_files.split(",") if e]
    base_path = _normalize_base_path(args.base_path)

    t0 = time.perf_counter()
    html_files = _collect_html_files(args.inputs)
    t_walk = time.perf_counter()

    # Per-file: extract once, then group hrefs by (source_dir, href) so we
    # resolve each unique combination exactly once. The same nav/footer
    # links repeat across hundreds of pages from the same directory.
    occurrences = []  # (source_path, source_dir_str, href)
    with ThreadPoolExecutor(max_workers=args.threads) as ex:
        for src, hrefs in zip(html_files, ex.map(extract_links, html_files)):
            src_dir = str(src.parent)
            src_str = str(src)
            for h in hrefs:
                occurrences.append((src_str, src_dir, h))
    t_extract = time.perf_counter()

    # Memoize resolution by (source_dir, href). Each unique (dir, href)
    # resolves identically regardless of which file in that dir found it.
    resolution_cache = {}
    unique_checks = {}
    for src_str, src_dir, href in occurrences:
        rk = (src_dir, href)
        r = resolution_cache.get(rk, ...)
        if r is ...:
            r = resolve(href, src_dir, src_str, root_str, base_path)
            resolution_cache[rk] = r
        if r is None:
            continue
        target, is_dir, frag = r
        # Include is_dir in the key: 'foo' and 'foo/' resolve via
        # different rules even after normpath collapses them.
        key = (target, is_dir, frag)
        unique_checks.setdefault(key, []).append((src_str, href))
    t_resolve = time.perf_counter()

    path_keys = sorted({(t, d) for (t, d, _) in unique_checks})
    target_resolution = {}
    for (t, d) in path_keys:
        target_resolution[(t, d)] = check_path(t, d, fallback_exts, index_files)
    t_check_paths = time.perf_counter()

    files_for_fragments = sorted({
        target_resolution[(t, d)] for (t, d, f) in unique_checks
        if f and target_resolution.get((t, d))
    })
    fragment_cache = {}
    if args.include_fragments and files_for_fragments:
        with ThreadPoolExecutor(max_workers=args.threads) as ex:
            for f, ids in zip(files_for_fragments,
                              ex.map(extract_fragment_ids, files_for_fragments)):
                fragment_cache[f] = ids
    t_fragments = time.perf_counter()

    broken = []  # one entry per occurrence; for human-readable report
    broken_keys = set()  # unique broken (target, is_dir, frag) keys
    for key, sources in unique_checks.items():
        target_str, is_dir, frag = key
        resolved = target_resolution.get((target_str, is_dir))
        if resolved is None:
            broken_keys.add(key)
            for src_str, href in sources:
                broken.append((src_str, href, "target not found"))
            continue
        if frag and args.include_fragments:
            ids = fragment_cache.get(resolved, set())
            if frag not in ids:
                broken_keys.add(key)
                for src_str, href in sources:
                    broken.append((src_str, href, f"fragment #{frag} not found"))
    t_done = time.perf_counter()

    total = len(occurrences)
    unique = len(unique_checks)
    errors_unique = len(broken_keys)
    ok_unique = unique - errors_unique

    if broken:
        # Group by source file, lychee-style.
        by_source = {}
        for src_str, href, reason in broken:
            by_source.setdefault(src_str, []).append((href, reason))
        for src_str in sorted(by_source):
            print(f"\n[{src_str}]:")
            for href, reason in by_source[src_str]:
                print(f"  ERROR  {href} -- {reason}")
        print()

    elapsed = t_done - t0
    print(
        f"Checked {total} occurrences ({unique} unique) in {elapsed:.3f}s "
        f"-- {ok_unique} OK, {errors_unique} broken"
    )

    if args.verbose:
        print()
        print(f"  Files scanned:        {len(html_files)}")
        print(f"  Fragment targets:     {len(files_for_fragments)}")
        print(f"  Walk:        {t_walk - t0:.3f}s")
        print(f"  Extract:     {t_extract - t_walk:.3f}s")
        print(f"  Resolve:     {t_resolve - t_extract:.3f}s")
        print(f"  Check paths: {t_check_paths - t_resolve:.3f}s")
        print(f"  Fragments:   {t_fragments - t_check_paths:.3f}s")
        print(f"  Report:      {t_done - t_fragments:.3f}s")

    if broken:
        sys.exit(1)


if __name__ == "__main__":
    main()
