# frozen_string_literal: true

# Logs the wall-clock duration of each top-level Jekyll build phase
# (READ / GENERATE / RENDER / WRITE+CLEANUP) to the build output as the
# phase boundaries are crossed.
#
# `jekyll build --profile` prints per-Liquid-template render times in a
# summary table at the end of the build, but the build phase breakdown
# is only visible there if --profile is passed. With this plugin you see
# each phase's duration inline, alongside the existing log lines from
# plugins (jekyll-remote-theme, jekyll-gfm-admonitions,
# jekyll-github-metadata, etc.), so the otherwise-silent stretch between
# a generator's last log line and a :post_render hook's first log line
# becomes a visible number.
#
# Example output:
#
#       Phases: READ done in 540ms.
#         GFMA: Converted admonitions in 232 file(s).
#         GFMA: Generator ran in 410ms.
#       Phases: GENERATE done in 3800ms.
#   GitHub Metadata: No GitHub API authentication could be found...
#       Phases: RENDER done in 12030ms.
#         GFMA: Inserting admonition CSS in 0 page(s).
#       Phases: WRITE+CLEANUP done in 580ms.
#                    done in 16.960 seconds.
#
# Phase to hook mapping:
#
#   :site, :after_reset  -- end of RESET, start of READ.
#   :site, :post_read    -- end of READ, start of GENERATE.
#   :site, :pre_render   -- end of GENERATE, start of RENDER.
#   :site, :post_render  -- end of RENDER, start of CLEANUP+WRITE.
#   :site, :post_write   -- end of WRITE, build effectively done.
#
# RESET itself is not measured separately; in practice it is a few ms of
# clearing the site model and is bundled into the brief gap between
# `:after_init` and `:after_reset`. CLEANUP (removing orphaned files
# from `_site`) and WRITE (writing rendered output to disk) share a hook
# boundary -- Jekyll has no hook between them -- so they are reported as
# one bucket.
#
# Numbers are wall-clock from a monotonic clock, not CPU time; they
# include any GC pauses and I/O waits that landed in the phase.

module BuildPhaseTiming
  MARKS = {}

  def self.mark(name)
    MARKS[name] = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  end

  def self.log_phase(label, from, to)
    return unless MARKS[from] && MARKS[to]
    elapsed_ms = ((MARKS[to] - MARKS[from]) * 1000).round(0)
    Jekyll.logger.info "Phases:", "#{label} done in #{elapsed_ms}ms."
  end
end

Jekyll::Hooks.register :site, :after_reset do
  BuildPhaseTiming.mark(:read_start)
end

Jekyll::Hooks.register :site, :post_read do
  BuildPhaseTiming.mark(:read_end)
  BuildPhaseTiming.log_phase("READ",          :read_start,   :read_end)
end

Jekyll::Hooks.register :site, :pre_render do
  BuildPhaseTiming.mark(:generate_end)
  BuildPhaseTiming.log_phase("GENERATE",      :read_end,     :generate_end)
end

Jekyll::Hooks.register :site, :post_render do
  BuildPhaseTiming.mark(:render_end)
  BuildPhaseTiming.log_phase("RENDER",        :generate_end, :render_end)
end

Jekyll::Hooks.register :site, :post_write do
  BuildPhaseTiming.mark(:write_end)
  BuildPhaseTiming.log_phase("WRITE+CLEANUP", :render_end,   :write_end)
end
