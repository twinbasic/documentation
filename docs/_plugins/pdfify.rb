# frozen_string_literal: true

require "fileutils"
require "pathname"
require "set"

# Produces the sparse `_site-pdf/` tree that pagedjs-cli consumes when
# rendering the PDF book. Combined with the offline plugin this means
# one Jekyll invocation produces three trees:
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
# === Hook flow ===
#
# Four hooks, mirroring offlinify's shape:
#
#   :site, :pre_render    -- setup(): flip @enabled on (gated at the
#                            hook level by `also_build_pdf`); clear
#                            @captured.
#   :pages, :post_render  -- maybe_capture(): when the rendered page
#                            is /book.html, stash its `page.output`
#                            bytes in @captured. No I/O.
#   :site, :post_render   -- remove_book_page(): drop /book.html from
#                            `site.pages` before Jekyll's WRITE phase
#                            iterates it, so the concatenated document
#                            never lands in _site/. Runs after every
#                            per-page hook has fired -- offlinify has
#                            already seen book.html and skipped it
#                            via `offline_exclude` -- and before WRITE.
#   :site, :post_write    -- run(): wipe _site-pdf/, write @captured
#                            as _site-pdf/book.html, copy the two
#                            stylesheets, and copy every image
#                            book.html references (sourced from
#                            _site/ -- Jekyll's asset pipeline has
#                            written them there during WRITE).
#
# Capturing in :pages, :post_render and removing in :site, :post_render
# replaces an earlier flow that read _site/book.html via binread and
# then deleted it post-write. The new flow makes one fewer disk
# round-trip and means /book.html is never a live URL on the online
# site at any point during the build.
#
# === What gets copied ===
#
#   book.html              the captured page.output bytes
#   assets/css/print.css   the book design
#   assets/css/rouge.css   the syntax-highlighter theme
#   <img src=> targets     every relative image path inside book.html,
#                          resolved against book.html's directory
#
# The destination tree mirrors the source paths exactly so book.html
# can stay byte-identical -- no URL rewriting is needed.
#
# === The offline_exclude entry ===
#
# `offline_exclude: [book.html]` in _config.yml is still required.
# When `also_build_pdf: true`, offlinify's :pages, :post_render hook
# fires for book.html before pdfify's :site, :post_render removes it
# from site.pages, so the exclude is what makes offlinify skip it.
# When `also_build_pdf: false`, pdfify never runs at all, book.html
# is a regular page on _site/, and the exclude is what keeps it out
# of _site-offline/.
#
# === Strict mode ===
#
# A non-zero `missing` count aborts the build via
# `Jekyll::Errors::FatalException` under `jekyll build` but only
# logs (loudly) under `jekyll serve` -- distinguishing the two via
# `site.config["serving"]`, which Jekyll sets to true in the serve
# command and false in build. The split keeps CI gated tight while
# leaving the dev preview alive for mid-edit saves that temporarily
# break an image reference. The contract enforced is the one the
# code/pre regex skip makes honest: every entry in `missing_paths`
# is a real broken reference, not a syntax-highlighter artefact.
#
# === Compatibility ===
#
# Reads `site.config['also_build_pdf']` and `site.config['serving']`,
# plus each rendered page's `page.output` in memory. Mutates
# `site.pages` once at :site, :post_render to suppress _site/book.html.
# Writes a fresh `<site.dest>-pdf/` tree (wiping any prior contents).
# Touches no files outside _site-pdf/.
#
# If the plugin is removed: `_site-pdf/` is no longer produced and
# `book.bat` would fail until either (a) this plugin is restored or
# (b) `book.bat` is pointed at `_site/book.html` directly. With this
# plugin gone, book.html would render as a normal (large) page on
# the online site; the `offline_exclude` entry would still keep it
# out of _site-offline/.

module Pdfify
  # Three-alternative regex, matched against the full document with
  # the `m` flag (`.` spans newlines). Same shape offlinify uses:
  #
  #   1. `<code\b[^>]*>.*?</code>` -- a `<code>` block. Atomic match;
  #      consumes the body so any `src=` inside (e.g. a tutorial
  #      literal `<img src="foo.png">` shown as a code sample) does
  #      not get re-scanned by the third branch. Group captures are
  #      nil for this branch.
  #   2. `<pre\b[^>]*>.*?</pre>`   -- a `<pre>` block. Same. The two
  #      separate branches are necessary because Rouge wraps code
  #      blocks in `<pre>` (Markdown fenced) but inline code in
  #      `<code>` (single backticks); the syntax highlighter also
  #      emits `<span class="na">src=</span><span class="s">"X"</span>`
  #      sequences inside `<pre>` that would otherwise look like a
  #      real `src="X"` attribute to the third branch.
  #   3. `\bsrc="..."` -- a real attribute, page-relative URL only
  #      (no leading `/`, `#`, or `scheme:`). Group 1=quote char,
  #      group 2=URL. `<img src=>` references in book.html all match
  #      this shape -- the include's baseurl-aware `src="<baseurl>/'
  #      strip already removed any leading slash, so paths arrive
  #      here as `Features/Images/foo.png`, etc.
  #
  # `extract_image_paths` skips matches whose group 1 is nil (the
  # code/pre branches) and harvests the URL from the rest.
  IMG_SRC_RE = %r{<code\b[^>]*>.*?</code>|<pre\b[^>]*>.*?</pre>|\bsrc=(["'])((?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\1}m.freeze

  # Stylesheets the book-combined layout links. Order doesn't matter;
  # the set is iterated and each is copied if present.
  REQUIRED_CSS = %w[
    assets/css/print.css
    assets/css/rouge.css
  ].freeze

  # The URL of the page we capture and suppress.
  BOOK_URL = "/book.html"

  # @enabled flips on at :site, :pre_render when also_build_pdf is
  # true. @captured holds book.html's rendered output once the
  # per-page hook has stashed it; nil until then, set back to nil
  # after run() consumes it.
  @enabled = false
  @captured = nil

  # `:site, :pre_render` entry. Only invoked when `also_build_pdf`
  # is true (the hook gates on the config), so reaching here means
  # the plugin is on for this build.
  def self.setup(_site)
    @enabled = true
    @captured = nil
  end

  # `:pages, :post_render` entry. Stashes the rendered HTML of
  # /book.html in @captured for run() to pick up post-write. No-op
  # on every other page and when pdfify is disabled.
  def self.maybe_capture(page)
    return unless @enabled
    return unless page.url == BOOK_URL
    @captured = page.output.dup
  end

  # `:site, :post_render` entry. Drops /book.html from `site.pages`
  # so Jekyll's WRITE phase doesn't write it to _site/. Runs after
  # every :pages, :post_render hook has fired (offlinify has already
  # seen book.html and skipped it via offline_exclude), and before
  # the WRITE phase iterates site.pages -- so mutating site.pages
  # here is safe. No-op when pdfify is disabled or when /book.html
  # never rendered (in which case run() will warn).
  def self.remove_book_page(site)
    return unless @enabled && @captured
    site.pages.reject! { |p| p.url == BOOK_URL }
  end

  def self.run(site, dest_root)
    return unless @enabled

    unless @captured
      Jekyll.logger.warn "Pdfify:", "no #{BOOK_URL} page rendered; skipping (did its frontmatter change?)"
      return
    end

    source = Pathname.new(site.dest)
    dest   = Pathname.new(dest_root)

    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    # Wipe the destination tree so previous runs do not leave stale
    # images behind when source pages are deleted or renamed.
    FileUtils.rm_rf(dest)
    FileUtils.mkdir_p(dest)

    html = @captured

    copied = 0
    book_dst = dest.join("book.html")
    FileUtils.mkdir_p(book_dst.dirname)
    File.binwrite(book_dst, html)
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
    missing_paths = []
    image_paths.each do |rel|
      src = source.join(rel)
      if src.file?
        copy_file(src, dest.join(rel))
        copied += 1
      else
        missing_paths << rel
      end
    end

    # Per-path error logs first so the build log reads details-then-
    # summary. The code/pre rejection in extract_image_paths means
    # any entry here is a real broken reference -- a markdown image
    # whose target Jekyll didn't write -- not a regex artefact.
    missing_paths.each do |rel|
      Jekyll.logger.error "Pdfify:", "missing image #{rel} (referenced from book.html, not present under _site/)"
    end

    Jekyll.logger.info "Pdfify:", "wrote #{dest_root} -- copied #{copied} file(s) (#{image_paths.size} image(s)#{missing_paths.empty? ? "" : ", #{missing_paths.size} missing"})"

    elapsed_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(0)
    Jekyll.logger.info "Pdfify:", "Pdfifier ran in #{elapsed_ms}ms."

    @captured = nil

    # `jekyll build` aborts on a non-zero missing count (CI gating).
    # `jekyll serve` keeps the dev preview alive -- a mid-edit save
    # that temporarily breaks an image reference shouldn't kill the
    # watcher; the error logs above are loud enough to catch the
    # author's eye, and the next save with a working reference will
    # clear the state. Jekyll sets `config["serving"]` to true in
    # `commands/serve.rb` and false in `commands/build.rb`, so the
    # mode detection is reliable.
    return if missing_paths.empty? || site.config["serving"]
    raise Jekyll::Errors::FatalException,
          "Pdfify: #{missing_paths.size} image reference(s) in book.html missing under _site/ -- see error log above"
  end

  # Walks book.html for relative `<img src=>` URLs and returns the
  # unique set of paths (in document order, dedup'd). Paths are kept
  # exactly as written so the destination layout mirrors the source.
  # Skips `<code>`/`<pre>` blocks so syntax-highlighted code samples
  # (e.g. a tutorial showing a literal `<img src="foo.png">` snippet,
  # or `<span class="na">src=</span><span class="s">"foo"</span>`
  # split by Rouge) don't generate spurious "missing" entries.
  def self.extract_image_paths(html)
    seen = Set.new
    out = []
    html.scan(IMG_SRC_RE) do |quote, url|
      next if quote.nil? # code/pre branch matched -- nothing to harvest
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

Jekyll::Hooks.register :site, :pre_render do |site|
  next unless site.config["also_build_pdf"]
  Pdfify.setup(site)
end

# :low so this READER captures page.output after html-compress
# (:normal) has run. See html-compress.rb's priority convention.
Jekyll::Hooks.register :pages, :post_render, priority: :low do |page|
  Pdfify.maybe_capture(page)
end

Jekyll::Hooks.register :site, :post_render do |site|
  Pdfify.remove_book_page(site)
end

Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["also_build_pdf"]
  Pdfify.run(site, "#{site.dest}-pdf")
end
