---
title: Kitchen
permalink: /Kitchen
---
# Kitchen
{: .no_toc }

Every integrity fault the check can report, in one page.

Two elements sharing an id, for `--check-ids`:

<span id="dup">first</span> <span id="dup">second</span>

An image with no `alt` and a remote `src`, an anchor with no accessible
name, and an empty `href` -- three a11y findings and one remote asset:

<img src="https://example.invalid/pic.png"> <a href="#"></a> <a href="">click here</a>

A `<div>` inside a `<p>`, for `--check-html`. htmlparser2 auto-closes the
`<p>` as soon as the `<div>` opens, so what is reported is
`html-closed-early: <p>` -- see the note beside FIXTURE_EXPECTED in
scripts/check_links_diff.mjs about why the other shape is unreachable:

<p>before<div>inside</div>after</p>

A second canonical, later in the document than the template's own. The
SAX walker keeps the last one it sees, so this is what the canonical
check compares -- and it is also a link, so it breaks twice:

<link rel="canonical" href="/wrong-canonical">

## Section One

More content, so the page has a real heading structure.
