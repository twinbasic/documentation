@echo off
rem PDF render only. Run build.bat (or `bundle exec jekyll build`) first
rem so _site-pdf\book.html and its dependencies exist; this script
rem assumes the Pdfify plugin has already populated _site-pdf\.
rem
rem render-book.mjs drives puppeteer + paged.js + pdf-lib directly so
rem we control pdf-lib's parseSpeed (the default yields the event loop
rem between every 100 objects on load, adding ~32 s to a 100 s build
rem for no reason in Node -- see perf\README.md "Profiling pdf-lib's
rem load" for the full diagnosis). pagedjs-cli passed no options to
rem load/save and inherited that cost; we don't.
rem
rem --additional-script ..\perf\detach-pages.js injects a Paged.Handler
rem that hides each finalised page from Chromium's layout tree and
rem restores them all before page.pdf() runs. Drops total render from
rem ~104s to ~51s on the 1638-page book by eliminating the O(n^2)
rem getBoundingClientRect cost in paged.js's overflow walker.
if not exist _site-pdf\book.html (
    echo _site-pdf\book.html not found. Run build.bat first.
    exit /b 1
)
if not exist node_modules\puppeteer\package.json (
    echo Installing docs\ dependencies...
    call npm install
    if errorlevel 1 exit /b 1
)
if not exist _pdf mkdir _pdf
node render-book.mjs _site-pdf\book.html -o _pdf\book.pdf --outline-tags h1,h2,h3,h4 --additional-script ..\perf\detach-pages.js
