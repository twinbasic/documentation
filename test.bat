@rem Tests the toolchain has to pass, and the reason they are separate
@rem from check.bat: a content edit cannot change what most of them say,
@rem so writing a reference page should not pay for them.
@rem
@rem "Most", not "none" -- this comment used to say none, and so did
@rem three pages of the documentation, and it was false. Round 3 of the
@rem use-case evaluation found an author routed straight past the one
@rem gate that would have caught their defect by exactly that sentence.
@rem check_code_regions.mjs sweeps every markdown file under docs/, and
@rem check_gate_lists.mjs reads README.md and every page under
@rem docs/Documentation/. Run this file too after adding an unusual code
@rem construct -- a fence holding a fence marker, a 4-space indented
@rem block, an admonition wrapping a fence -- and after editing a
@rem developer page that says how many gates a wrapper runs.
@rem
@rem Otherwise run it when the change touches builder/, scripts/, book/,
@rem eval/ or wisdom/. Both CI workflows run it unconditionally, so a
@rem tooling regression cannot reach staging by someone skipping it.
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
@rem Tools.md's two numbered gate lists against the two wrappers that
@rem actually run them, and then every gate count stated in prose on any
@rem developer page. This rotted three times: round 2 found test.bat
@rem documented as three gates when it had four and fixed it in Tools.md,
@rem Building.md's parallel copy went untouched, a fifth gate landed, and
@rem round 3 found Building.md naming three of five and Extending.md
@rem claiming check.bat runs six. Round 4 found the fix for THAT had put
@rem three more wrong numbers into Building.md and one into README.md,
@rem under a gate that read neither file. None of it broke a link or
@rem failed a gate. Pure text, no tree, no browser, ~50 ms.
node scripts/check_gate_lists.mjs
@if errorlevel 1 goto :fail
@rem A regex that backtracks exponentially is a hang waiting for the
@rem right input, and nothing that reads the site can see it: the corpus
@rem passes until some page happens to contain the trigger, and then the
@rem build stops rather than failing. VOID_TAGS_RE shipped that way, and
@rem so did its first fix. Reads literals and every new RegExp(...) whose
@rem arguments the source decides -- assembling a pattern from constants
@rem was a way out of this gate until it did. Its own probes ride along
@rem in the same run, so a green line cannot be a dead gate. No tree, no
@rem browser, ~5 s.
node scripts/check_regex_safety.mjs
@if errorlevel 1 goto :fail
@rem The pre-render rewrites in render.mjs run over RAW markdown, so none
@rem of them knows what is code -- and this site's subject matter is code.
@rem Four defects of that shape shipped: Liquid tags stripped inside
@rem fences, admonition bodies losing their code indentation, media-URL
@rem spaces percent-encoded inside a fence, and a YAML sample's closing
@rem --- deleted outright. Nothing caught any of them, because the damage
@rem is inside <code> and no other gate looks there.
@rem
@rem Tokenise, rewrite, re-tokenise, compare the literal regions. Its own
@rem probes ride along, so a clean corpus cannot masquerade as a working
@rem gate. No tree, no browser, ~2 s.
node scripts/check_code_regions.mjs
@if errorlevel 1 goto :fail
@rem The page-count drift guard reports nothing on a healthy tree, so
@rem every ordinary build sounds exactly like one whose guard has stopped
@rem working. These probes make the other assertion, against a scratch
@rem baseline file rather than the committed one. The first replays the
@rem defect that motivated it -- 37 pages of AppGlobalClassObject lost to
@rem an exclude rule, under a guard that only knew a floor of 836. No
@rem tree, no browser, ~60 ms.
node scripts/check_page_baseline.mjs
@if errorlevel 1 goto :fail
@rem The book-coverage warnings say nothing when every page has an entry
@rem in docs\_book.yml -- in a part, or in left_out with a reason -- which
@rem is also all a check that had stopped working would say. Until they
@rem existed, whole sections dropped out of the PDF without a word: the
@rem IDE, Challenges and Videos, and Data Types and Enumerations with them.
@rem These probes give each of the five findings a fault to report, on a
@rem manifest and pages built in memory, so they mean the same against an
@rem empty docs\. No tree, no browser, well under a second.
node scripts/check_book_coverage.mjs
@if errorlevel 1 goto :fail
@rem The symbol index (tB/symbols.json) is read by the IDE help add-in,
@rem and a build that indexes the reference cleanly says nothing about the
@rem rules that did not fire on it. These probes assert each one against
@rem the case that made it necessary: the .twin scanner's traps, the rules
@rem that place a symbol on a page or heading, and the drift guard's
@rem refusal of a URL the index has stopped publishing -- a reworded
@rem heading moves its anchor, and an installed add-in keeps the old one.
@rem Fixtures only: no tree, no install, ~100 ms.
node scripts/check_symbol_index.mjs
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
