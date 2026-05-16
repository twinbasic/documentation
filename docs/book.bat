@echo off
bundle exec jekyll build --config _config.yml,_config-pdf.yml || exit /b
if not exist _pdf mkdir _pdf
npx pagedjs-cli _site-pdf\book.html -o _pdf\book.pdf --outline-tags h1,h2,h3,h4 -t 600000
