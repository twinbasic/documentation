@echo off
rem PDF render only. Run build.bat (or `bundle exec jekyll build`) first
rem so _site-pdf\book.html and its dependencies exist; this script
rem assumes the Pdfify plugin has already populated _site-pdf\.
if not exist _site-pdf\book.html (
    echo _site-pdf\book.html not found. Run build.bat first.
    exit /b 1
)
if not exist _pdf mkdir _pdf
npx pagedjs-cli _site-pdf\book.html -o _pdf\book.pdf --outline-tags h1,h2,h3,h4 -t 600000
