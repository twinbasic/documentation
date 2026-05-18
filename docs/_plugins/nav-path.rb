# frozen_string_literal: true

# Populates `page.data["nav_path"]` on every page that has a `title`.
# The nav path is the slash-joined `grand_parent / parent / title`
# chain that just-the-docs uses to build its sidebar tree. It is the
# selector used by book.yml's `nav_prefixes:` option in book.html --
# a way to sweep pages into a chapter / part by their position in the
# nav tree rather than by URL prefix.
#
# Example: `Reference/Operators.md` has `parent: Reference Section`
# and `title: Operators`, so its nav_path is
# "Reference Section/Operators". The individual operator pages under
# `/tB/Core/` carry `parent: Operators, grand_parent: Reference Section`,
# so their nav_paths are "Reference Section/Operators/AddressOf" etc.
# A book.yml entry with `nav_prefixes: [Reference Section/Operators]`
# therefore sweeps in the Operators index plus every operator page
# without having to enumerate the /tB/Core/* URLs one by one.
#
# Runs in the GENERATE phase so the populated field is available to
# `book.html` (and any other template) during RENDER.

module Jekyll
  class NavPathGenerator < Generator
    safe true
    priority :low

    def generate(site)
      site.pages.each do |page|
        title = page["title"]
        next unless title
        parts = []
        parts << page["grand_parent"] if page["grand_parent"]
        parts << page["parent"]       if page["parent"]
        parts << title
        page.data["nav_path"] = parts.join("/")
      end
    end
  end
end
