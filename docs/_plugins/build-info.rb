# frozen_string_literal: true

# Captures the current git commit (short hash + commit date) into
# `site.data['build']` so Liquid templates can stamp build provenance
# on the rendered output. Consumed today by the PDF book's title page
# (BOOKPLAN.md task 1.3); the colophon (1.4) and global TOC (Phase 3)
# will read the same fields.
#
# Exposed as:
#   site.data.build.commit       # e.g. "d4fa6fc"  ('unknown' if git unavailable)
#   site.data.build.commit_date  # e.g. "2026-05-16" (ISO short, %cs)
#
# Hooked into `:site, :post_read` -- after Jekyll's READ phase has loaded
# `_data/*.yml` into `site.data` (which would otherwise overwrite anything
# set earlier), and before GENERATE / RENDER touch it. Cost is two `git`
# invocations per build (~10 ms total); negligible against the 13 s
# baseline.
#
# Falls back to "unknown" placeholders when git isn't on PATH or the
# working tree isn't a repo (e.g. tarball install) -- the title page
# template renders without conditional gymnastics on a missing data file.

require "open3"

module BuildInfo
  def self.git(*args)
    out, status = Open3.capture2("git", *args)
    status.success? ? out.strip : "unknown"
  rescue Errno::ENOENT
    "unknown"
  end

  def self.capture(site)
    commit      = git("rev-parse", "--short", "HEAD")
    commit_date = git("log", "-1", "--format=%cs")
    site.data["build"] = { "commit" => commit, "commit_date" => commit_date }
    Jekyll.logger.info "BuildInfo:", "commit=#{commit}, commit_date=#{commit_date}"
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  BuildInfo.capture(site)
end
