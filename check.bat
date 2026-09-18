@pushd "%~dp0"
node scripts/check_links.mjs --offline --include-fragments ^
    --check-html --check-a11y --check-ids --check-remote-assets ^
    --check-sitemap --check-search --check-canonical ^
    --fallback-extensions html --index-files "index.html,." ^
    --root-dir docs/_site docs/_site /sep/ ^
    --offline --include-fragments ^
    --check-html --check-a11y --check-ids --check-remote-assets ^
    --forbid "https://docs.twinbasic.com" ^
    --fallback-extensions html --index-files "index.html,." ^
    --root-dir docs/_site-offline docs/_site-offline /sep/ ^
    --offline --no-fail --include-fragments ^
    --root-dir docs/_site-pdf ^
    docs/_site-pdf/book.html %*
@if errorlevel 1 goto :eof
node scripts/check_axe_patch_equiv.mjs
@if errorlevel 1 goto :eof
node scripts/pick_a11y_sample.mjs --check
@if errorlevel 1 goto :eof
node scripts/check_a11y.mjs
@popd
