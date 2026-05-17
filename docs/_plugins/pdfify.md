# Pdfify

`_plugins/pdfify.rb` produces the sparse `_site-pdf/` tree that pagedjs-cli consumes when rendering the book PDF. After Jekyll finishes writing the online site (and after `offlinify.rb` has run, if it is active), this plugin copies just the files pagedjs needs — `book.html`, the two stylesheets the book layout links, and every image `book.html` references — into a sibling directory at `<site.dest>-pdf/`. The result is ~14 MB instead of the ~130 MB the online tree would carry, and one `ls` says exactly what pagedjs sees.

This file sits in `_plugins/` for the same reasons as `offlinify.md`: it lives next to the code it documents, and Jekyll's `_plugins/` folder is plugin-only territory, so this Markdown never gets rendered into the public site.

## Why a sparse copy?

The book's render path is narrow. pagedjs-cli only ever opens `_site-pdf/book.html` — the long concatenated document that the `book.html` page's iterator produced. From there it reads the two stylesheets the `book-combined` layout links (`assets/css/print.css`, `assets/css/rouge.css`) and the images that `book.html` embeds via `<img src=>`. Nothing else under `_site-pdf/` would ever be touched.

The previous approach was a second Jekyll build, configured by a `_config-pdf.yml` overlay, that wrote a complete second site tree into `_site-pdf/` with every page rendered through a minimal `book` layout. ~1300 per-page HTML files, none of which pagedjs ever opened. Two builds in series ran ~30s of Jekyll just to satisfy one consumer. Both the overlay and the second-tier layout were retired when this plugin landed.

A sparse copy also keeps the PDF source honest. Every file in `_site-pdf/` is one pagedjs reads; if you add a `<img src=>` to a chapter and it doesn't show up in the rendered PDF, the missing file in the sparse tree is the breadcrumb.

## When it runs

Activated by `also_build_pdf: true` (the default in `_config.yml`). Reads from `site.dest` (i.e. `_site/`) and writes to `<site.dest>-pdf/`. The hook at the bottom of `pdfify.rb`:

```ruby
Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["also_build_pdf"]
  Pdfify.run(site, site.dest, "#{site.dest}-pdf")
end
```

One Jekyll invocation produces `_site/`, `_site-offline/` (via `offlinify.rb`), and `_site-pdf/` (this plugin). Flip the flag to `false` if you only want the online site, or if you want offline-but-no-PDF.

## The build flow

After Jekyll's WRITE phase completes, the hook fires `Pdfify.run(site, source_root, dest_root)`, which does the following:

1. **Locate `book.html`.** If `<source_root>/book.html` doesn't exist (the `book.html` page didn't render, or was excluded from the build), emit a warning and skip the rest. The plugin never errors the build out.

2. **Wipe and recreate `<dest_root>/`.** Unlike `offlinify.rb`, which empties the directory contents but keeps the directory itself in place to keep the jekyll-watcher happy, `pdfify.rb` deletes the whole tree. The PDF pass doesn't need watcher friendliness — nobody runs `jekyll serve` and refreshes a `_site-pdf/` page in their browser. The wipe is to ensure no stale images linger after source pages are deleted or renamed.

3. **Copy `book.html`** verbatim into the destination. The plugin doesn't rewrite anything inside `book.html`; relative paths like `Features/Images/foo.png` resolve correctly because the destination tree mirrors the source layout exactly.

4. **Copy `REQUIRED_CSS`.** Two files in fixed positions:

   ```
   assets/css/print.css   the book design (page geometry, typography, code blocks, …)
   assets/css/rouge.css   the syntax-highlighter theme
   ```

   Each is copied if present and warned about if missing. A missing stylesheet doesn't fail the build — pagedjs will render with default styles, which is a useful "the build is structurally OK, the asset just slipped" signal.

5. **Extract and copy every relative `<img src=>` target.** Scan `book.html` with `IMG_SRC_RE` (see [What gets copied](#what-gets-copied) for the regex), deduplicate, and copy each one. Missing source files increment a `skipped` counter that lands in the summary log line.

6. **Delete `<source_root>/book.html`.** The concatenated document exists in `_site/` only as a hand-off between Jekyll's render pass and this plugin — it's not a public page on the online site. The companion exclusion in `_config.yml` (`offline_exclude: [..., book.html]`) keeps `offlinify.rb` from copying it into `_site-offline/`; the delete here clears it from `_site/` itself. The two safeguards are independent: the exclude pattern fires whether `offlinify.rb` walks `_site/` before or after pdfify's delete (and still applies when `also_build_pdf: false`, when pdfify never runs at all), and pdfify's delete fires whether or not offlinify is enabled. No hook-ordering assumption is required.

7. **Log the summary:**

   ```
   Pdfify: wrote .../_site-pdf -- copied 84 file(s) (86 image(s), 5 missing)
   ```

   The "missing" portion is suppressed entirely when every image resolved. The counter is a real bug signal — every miss is an `<img src=>` in source markdown that points at a path Jekyll didn't write, and the rendered PDF will have a broken image placeholder in that spot.

## What gets copied

Three categories of file, in this order:

| Category | Source path | Destination path |
|----------|-------------|------------------|
| The book itself | `_site/book.html` | `_site-pdf/book.html` |
| Stylesheets | `_site/assets/css/print.css`, `_site/assets/css/rouge.css` | same, mirrored |
| Images | each unique `<img src="X">` in `book.html`, with `X` resolved against the destination root | `_site-pdf/X` |

The image regex:

```ruby
IMG_SRC_RE = %r{\bsrc=(["'])((?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\1}
```

Matches `src="..."` (or single-quoted) where the URL is **page-relative** — doesn't start with `/`, `#`, or a URL scheme. The lookahead excludes:

- `/...` — root-absolute paths (none reach this regex; the chapter-body include in `book.html` already strips leading slashes via `replace: 'src="/', 'src="'` so the rendered HTML is uniformly relative)
- `#...` — fragment-only (rare in `<img>` but cheap to exclude)
- `mailto:...`, `http:...`, etc. — any RFC 3986 URL scheme

Captures: group 1 is the quote character (so the trailing quote in the pattern matches the same character), group 2 is the URL.

Each match has its `?query` and `#fragment` stripped — images don't need them, and they would confuse the `File.file?` existence probe — then the path is deduplicated via a `Set` and copied if present in `<source_root>/`. The destination layout mirrors the source paths exactly, so an `<img src="Features/Images/foo.png">` reference inside `_site-pdf/book.html` resolves to `_site-pdf/Features/Images/foo.png` — the same shape the source `_site/book.html` had against `_site/` before pdfify deleted it.

## File layout

The PDF build touches the following files:

| Path | Role |
|------|------|
| `docs/_plugins/pdfify.rb` | The plugin. Hooks `:site, :post_write`, runs the copy passes. |
| `docs/_plugins/pdfify.md` | This file. |
| `docs/_config.yml` | `also_build_pdf: true` (default-on) and `exclude: [_site-pdf]` (keeps Jekyll's watcher from rebuilding on the plugin's own output). |
| `docs/book.html` | The page rendered into `_site-pdf/book.html` (via `_layouts/book-combined.html`). Contains the iterator that concatenates every chapter into one HTML document. |
| `docs/_layouts/book-combined.html` | The layout `book.html` uses. Minimal `<html><head>` + `<title>` + the two stylesheets + `{{ content }}`. No nav, no JS, no chrome. |
| `docs/assets/css/print.css` | The book design. |
| `docs/assets/css/rouge.css` | The syntax-highlighter theme. |
| `docs/book.bat` | `npx pagedjs-cli _site-pdf\book.html -o _pdf\book.pdf …`. Run `build.bat` first to populate `_site-pdf/`. |
| `docs/.gitignore` | `_site-pdf` is excluded from git. |

## Failure modes

The plugin surfaces several conditions:

- **`book.html` missing.** `no .../_site/book.html found; skipping (did the book.html page render?)`. Most likely cause is the page was excluded from the build (e.g. via a temporary `published: false` in its frontmatter) or its `permalink:` was changed away from `/book.html`. The plugin emits a warning and skips the whole pass; the rest of the build is unaffected.

- **Missing required CSS.** `missing required asset assets/css/print.css; pagedjs render may break`. Means the SCSS pipeline or a sass-converter step didn't write the expected output. The plugin emits a warning but continues copying other files — the PDF render will fall back to browser defaults for that stylesheet's rules.

- **Missing image targets.** Reported as a count in the summary log line: `… copied 84 file(s) (86 image(s), 5 missing)`. The "missing" portion is suppressed when zero. Each miss is an `<img src=>` in source markdown that points at a path Jekyll didn't write — the rendered PDF will show a broken-image placeholder in that spot. Grep `_site/` for the missing filename to identify the source page; the fix is usually a typo in the markdown or a stale path after a file rename.

- **Real source images that aren't in `_site/`.** Should never happen — Jekyll copies every non-Markdown file under `docs/` into `_site/` by default unless the path is in `exclude:`. If you see image misses in the summary log line, check `_config.yml`'s `exclude:` for an entry that's accidentally catching the image directory.

## Reference: the most important functions

In source order in [`pdfify.rb`](pdfify.rb):

- `run(site, source_root, dest_root)` — orchestrator. Locates `book.html`, wipes the destination, copies `book.html`, the two stylesheets, and every referenced image. Logs the summary.
- `extract_image_paths(html)` — scans `book.html` for the `IMG_SRC_RE` regex, strips query/fragment off each match, deduplicates via a `Set`, returns the unique paths in document order.
- `copy_file(src, dst)` — `FileUtils.mkdir_p` + `FileUtils.cp`. The whole copy path is two lines because the source and destination layouts match by construction.

The whole plugin is ~140 lines of Ruby, ~half of which is doc comments.
