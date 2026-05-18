@echo off
rem PDF render only. Run build.bat (or `bundle exec jekyll build`) first
rem so _site-pdf\book.html and its dependencies exist; this script
rem assumes the Pdfify plugin has already populated _site-pdf\.
rem
rem --additional-script ..\perf\detach-pages.js injects a Paged.Handler
rem that hides each finalised page from Chromium's layout tree and
rem restores them all before page.pdf() runs. Drops total render from
rem ~104s to ~51s on the 1638-page book by eliminating the O(n^2)
rem getBoundingClientRect cost in paged.js's overflow walker. See
rem perf\README.md for the full analysis.
if not exist _site-pdf\book.html (
    echo _site-pdf\book.html not found. Run build.bat first.
    exit /b 1
)
if not exist _pdf mkdir _pdf
npx pagedjs-cli _site-pdf\book.html -o _pdf\book.pdf --outline-tags h1,h2,h3,h4 -t 600000 --additional-script ..\perf\detach-pages.js
