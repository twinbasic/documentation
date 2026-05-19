@rem Profile a Jekyll build with rbspy (sampling profiler, Windows-native).
@rem
@rem Outputs _profile/out/jekyll-build.speedscope.json -- drag into
@rem https://www.speedscope.app/ for the timeline / sandwich / left-heavy
@rem views (closest in spirit to the Firefox profiler UI).
@rem
@rem rbspy.exe is downloaded into _profile/ (gitignored) -- see
@rem _profile/profile.rb's header for the project's profiling notes.
@rem Sampling rate: 99 Hz (rbspy default).
@if not exist _profile\out mkdir _profile\out
@_profile\rbspy.exe record --format speedscope --file _profile\out\jekyll-build.speedscope.json -- ruby _profile\build.rb %*
