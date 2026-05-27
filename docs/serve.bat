@pushd "%~dp0"
node ..\builder\tbdocs.mjs --src . --serve %*
@popd
