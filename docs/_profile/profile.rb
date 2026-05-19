# frozen_string_literal: true
#
# Run a Jekyll build under ruby-prof and write callgrind + flat / graph
# summaries into _profile/out/.
#
# Usage (from docs/):
#   bundle exec ruby _profile/profile.rb
# Or via the wrapper:
#   profile-rubyprof.bat
#
# ruby-prof is instrumentation-based (Ruby TracePoint), so the run is
# noticeably slower than a normal build -- expect ~3-5x wall time.
# That's the trade for complete coverage with no sampling bias.
#
# Output files (under _profile/out/):
#   callgrind.out.jekyll-build  -- KCachegrind / QCachegrind input
#   jekyll-build.flat.txt       -- top methods by self-time
#   jekyll-build.graph.txt      -- callers/callees per method
#
# Measure mode is WALL_TIME by default (includes I/O waits, which is
# what we want for a build that writes thousands of files). Switch to
# PROCESS_TIME if you specifically want CPU-only numbers.

require "fileutils"
require "ruby-prof"

OUT_DIR = File.expand_path("out", __dir__)
FileUtils.mkdir_p(OUT_DIR)

profile = RubyProf::Profile.new(
  measure_mode: RubyProf::WALL_TIME,
  exclude_common: true,
)
profile.start

begin
  load File.expand_path("build.rb", __dir__)
ensure
  result = profile.stop

  RubyProf::CallTreePrinter.new(result).print(
    path: OUT_DIR,
    profile: "jekyll-build",
  )

  File.open(File.join(OUT_DIR, "jekyll-build.flat.txt"), "w") do |f|
    RubyProf::FlatPrinter.new(result).print(f, min_percent: 0.5)
  end

  File.open(File.join(OUT_DIR, "jekyll-build.graph.txt"), "w") do |f|
    RubyProf::GraphPrinter.new(result).print(f, min_percent: 0.5)
  end

  puts
  puts "ruby-prof output written to #{OUT_DIR}"
  puts "  callgrind.out.jekyll-build  -- open in KCachegrind / QCachegrind"
  puts "  jekyll-build.flat.txt       -- top methods by self-time"
  puts "  jekyll-build.graph.txt      -- callers/callees per method"
end
