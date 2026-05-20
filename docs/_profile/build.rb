# frozen_string_literal: true
#
# Run a Jekyll build via Jekyll's Ruby API, with Bundler activated for
# the docs/ Gemfile. Used by:
#
#   * _profile/profile.rb       -- wraps this run in ruby-prof
#   * profile-rbspy.bat         -- spawns ruby.exe with this script
#                                  under rbspy
#
# Invoking ruby.exe directly (rather than `bundle exec jekyll build`)
# avoids the rbspy-on-Windows issue where its CreateProcess-based
# launcher can't resolve `bundle.cmd` / `bundle.bat` shims.

require "bundler/setup"
require "jekyll"
require "jekyll/commands/build"

Jekyll::Commands::Build.process({})
