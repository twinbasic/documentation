@pushd "%~dp0..\"
node scripts/check_links.mjs --offline --include-fragments ^
    --check-html --check-a11y --check-ids ^
    --check-sitemap --check-search ^
    --fallback-extensions html --index-files "index.html,." ^
    --root-dir docs/_site docs/_site /sep/ ^
    --offline --include-fragments ^
    --check-html --check-a11y --check-ids ^
    --forbid "https://docs.twinbasic.com" ^
    --fallback-extensions html --index-files "index.html,." ^
    --root-dir docs/_site-offline docs/_site-offline %*
@popd