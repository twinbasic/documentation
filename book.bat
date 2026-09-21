@echo off
@pushd "%~dp0"
rem PDF render only. Run build.bat first so docs\_site-pdf\book.html and
rem its dependencies exist.
rem
rem render-book.mjs drives puppeteer + paged.js + pdf-lib directly so
rem we control pdf-lib's parseSpeed (the default yields the event loop
rem between every 100 objects on load, adding ~32 s to a 100 s build
rem for no reason in Node -- see perf\README.md "Profiling pdf-lib's
rem load" for the full diagnosis). pagedjs-cli passed no options to
rem load/save and inherited that cost; we don't.
rem
rem --additional-script perf\detach-pages.js injects a Paged.Handler
rem that hides each finalised page from Chromium's layout tree and
rem restores them all before page.pdf() runs. Drops total render from
rem ~104s to ~51s on a 1638-page book by eliminating the O(n^2)
rem getBoundingClientRect cost in paged.js's overflow walker.

rem Refuse a stale source tree. Testing only that book.html EXISTS was not
rem enough: edit a page, run book.bat without build.bat, and it renders the
rem PREVIOUS book for two minutes and reports success. Nothing downstream
rem notices, because the PDF it produces is internally consistent -- it is
rem simply the wrong book. That very nearly put a stale render into a
rem page-count comparison during the session that added this check.
rem
rem --marker is required here: every other tree is identified by its
rem index.html, and _site-pdf holds a single book.html instead.
rem
rem Exits 2 when the tree is absent (the case the old existence test
rem covered) and 1 when it is older than docs\ or builder\.
node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html
@if errorlevel 1 goto :fail
if not exist node_modules\puppeteer\package.json (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 exit /b 1
)
if not exist docs\_pdf mkdir docs\_pdf
node book\render-book.mjs docs\_site-pdf\book.html -o "docs\_pdf\twinBASIC Book.pdf" --outline-tags h1,h2,h3,h4 --additional-script perf\detach-pages.js
@rem popd resets ERRORLEVEL, so capture it first -- otherwise a failed
@rem render would report success to whatever called book.bat.
@set "BOOK_ERR=%ERRORLEVEL%"
@popd
@exit /b %BOOK_ERR%
:fail
@rem Same capture-before-popd rule as above. Not folded into an
@rem `if errorlevel 1 (...)` block: %ERRORLEVEL% inside a parenthesised
@rem block expands when the block is PARSED, not when it runs, so the
@rem value captured there would be the one from before the check.
@set "FRESH_ERR=%ERRORLEVEL%"
@popd
@exit /b %FRESH_ERR%
