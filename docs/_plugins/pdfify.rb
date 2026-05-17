# frozen_string_literal: true

require "fileutils"
require "pathname"
require "set"

# Produces the sparse `_site-pdf/` tree that pagedjs-cli consumes when
# rendering the PDF book. Runs at `:site, :post_write` -- after Jekyll
# has written `_site/` (and after `offlinify.rb` has run, if it is
# active). Combined with the offline plugin this means one Jekyll
# invocation produces three trees:
#
#   _site/          -- the online site
#   _site-offline/  -- the offline mirror with file://-resolvable URLs
#   _site-pdf/      -- this plugin's output: just the files pagedjs needs
#
# === Why a sparse copy? ===
#
# pagedjs-cli only ever opens `_site-pdf/book.html` -- the long
# concatenated document that book.html's iterator produced. It reads
# the two stylesheets the book-combined layout links (`print.css`,
# `rouge.css`) and the images that book.html embeds via `<img src=>`.
# Nothing else under `_site-pdf/` would ever be touched. Copying the
# full ~130 MB online tree just to satisfy pagedjs would waste disk
# and obscure which files actually participate in the render; the
# sparse tree is ~10 MB and one `ls` says exactly what pagedjs sees.
#
# This also retires the older `_config-pdf.yml` overlay (which ran a
# whole second Jekyll build, layout-changed, into `_site-pdf/`). That
# pass produced ~1300 per-page HTML files that pagedjs never opened.
#
# === What gets copied ===
#
#   book.html              copied verbatim from <site.dest>/book.html
#   assets/css/print.css   the book design
#   assets/css/rouge.css   the syntax-highlighter theme
#   <img src=> targets     every relative image path inside book.html,
#                          resolved against book.html's directory
#
# Anything else in `_site/` is not part of the PDF render path and is
# skipped. The output tree mirrors the source paths exactly so book.html
# can stay byte-identical -- no URL rewriting is needed.
#
# === Compatibility ===
#
# Reads `site.dest` and `site.config['also_build_pdf']`. Writes a fresh
# `<site.dest>-pdf/` tree (wiping any prior contents). Touches no files
# outside that.
#
# If the plugin is removed: `_site-pdf/` is no longer produced and
# `book.bat` would fail until either (a) this plugin is restored or
# (b) `book.bat` is pointed at `_site/book.html` directly. `_site/` is
# unaffected.

module Pdfify
  # Matches `src="..."` / `src='...'` whose URL is page-relative
  # (doesn't start with `/`, `#`, or a URL scheme). Captures 1=quote
  # char, 2=URL. `<img src=>` references in book.html all match this
  # shape -- the include's `replace: 'src="/', 'src="'` already strips
  # any leading slash so paths arrive here as `Features/Images/foo.png`,
  # `Tutorials/CEF/Images/bar.svg`, etc.
  IMG_SRC_RE = %r{\bsrc=(["'])((?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\1}.freeze

  # Stylesheets the book-combined layout links. Order doesn't matter;
  # the set is iterated and each is copied if present.
  REQUIRED_CSS = %w[
    assets/css/print.css
    assets/css/rouge.css
  ].freeze

  def self.run(site, source_root, dest_root)
    source = Pathname.new(source_root)
    dest   = Pathname.new(dest_root)

    book_src = source.join("book.html")
    unless book_src.file?
      Jekyll.logger.warn "Pdfify:", "no #{book_src} found; skipping (did the book.html page render?)"
      return
    end

    # Wipe the destination tree so previous runs do not leave stale
    # images behind when source pages are deleted or renamed.
    FileUtils.rm_rf(dest)
    FileUtils.mkdir_p(dest)

    html = book_src.binread

    copied = 0
    copy_file(book_src, dest.join("book.html"))
    copied += 1

    REQUIRED_CSS.each do |rel|
      src = source.join(rel)
      if src.file?
        copy_file(src, dest.join(rel))
        copied += 1
      else
        Jekyll.logger.warn "Pdfify:", "missing required asset #{rel}; pagedjs render may break"
      end
    end

    image_paths = extract_image_paths(html)
    skipped = 0
    image_paths.each do |rel|
      src = source.join(rel)
      if src.file?
        copy_file(src, dest.join(rel))
        copied += 1
      else
        skipped += 1
      end
    end

    Jekyll.logger.info "Pdfify:", "wrote #{dest_root} -- copied #{copied} file(s) (#{image_paths.size} image(s)#{skipped.zero? ? "" : ", #{skipped} missing"})"
  end

  # Walks book.html for relative `<img src=>` URLs and returns the
  # unique set of paths (in document order, dedup'd). Paths are kept
  # exactly as written so the destination layout mirrors the source.
  def self.extract_image_paths(html)
    seen = Set.new
    out = []
    html.scan(IMG_SRC_RE) do |_quote, url|
      # Strip any `?query` / `#fragment` -- images don't need them
      # and they would confuse the file existence check.
      path = url.split(/[?#]/, 2).first
      next if path.nil? || path.empty?
      next unless seen.add?(path)
      out << path
    end
    out
  end

  def self.copy_file(src, dst)
    FileUtils.mkdir_p(dst.dirname)
    FileUtils.cp(src, dst)
  end
end

Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["also_build_pdf"]
  Pdfify.run(site, site.dest, "#{site.dest}-pdf")
end
