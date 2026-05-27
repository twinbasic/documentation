@pushd "%~dp0"
node ..\builder\index.mjs --src . %*
@popd