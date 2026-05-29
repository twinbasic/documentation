@pushd "%~dp0"
node builder\tbdocs.mjs --src docs --serve %*
@popd
