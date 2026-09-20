@rem Tests the toolchain has to pass. Nothing here reads a page of
@rem documentation, so an edit confined to docs/ cannot change any
@rem outcome and does not need this file -- that is the whole point of
@rem it being separate from check.bat.
@rem
@rem Run this when the change touches builder/, scripts/, book/, eval/ or
@rem wisdom/. Both CI workflows run it unconditionally, so a tooling
@rem regression cannot reach staging by someone skipping it locally.
@rem
@rem The split is by what a gate INTERROGATES, not by what it happens to
@rem open: check_axe_patch_equiv.mjs loads a built page, but only because
@rem the probe needs some document to run in -- what it is testing is the
@rem axe source patch. A new gate belongs here if it would still be worth
@rem running against an empty docs/.
@pushd "%~dp0"
@rem The publish allowlist is enforced inside the build, so a clean
@rem build.bat already says nothing unpublishable is in docs/. It does
@rem NOT say the allowlist still refuses anything -- one widened until it
@rem refuses nothing reports the same clean pass. This asserts the
@rem refusals against named probes: a stray .bak, a .pem, a scratch .md
@rem with no frontmatter. No tree, no browser, ~40 ms, so it goes first.
node scripts/check_publish_policy.mjs
@if errorlevel 1 goto :fail
@rem A regex that backtracks exponentially is a hang waiting for the
@rem right input, and nothing that reads the site can see it: the corpus
@rem passes until some page happens to contain the trigger, and then the
@rem build stops rather than failing. VOID_TAGS_RE shipped that way, and
@rem so did its first fix. Its own probes ride along in the same run, so
@rem a green line cannot be a dead gate. No tree, no browser, ~5 s.
node scripts/check_regex_safety.mjs
@if errorlevel 1 goto :fail
@rem check_a11y.mjs injects a PATCHED axe bundle (plain-color-fields,
@rem -26 % on a realistic page set). The patch asserts its substitution
@rem targets, so an axe-core bump fails loudly; this catches the other
@rem case, where the text still matches but the colour maths has changed.
@rem The fingerprint gate cannot see that -- it compares `incomplete` as
@rem a rule-id set.
@rem
@rem Needs a browser and any one built page (it loads /404.html from
@rem docs\_site-offline\ and never touches its DOM), so run build.bat
@rem first. Staleness does not matter here, which is why this does not
@rem sit behind check_tree_fresh.mjs.
node scripts/check_axe_patch_equiv.mjs
@if errorlevel 1 goto :fail
@popd
@exit /b 0
:fail
@rem Capture before popd, which would otherwise reset ERRORLEVEL to 0
@rem and report a clean run.
@set "TEST_ERR=%ERRORLEVEL%"
@popd
@exit /b %TEST_ERR%
