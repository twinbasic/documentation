@pushd "%~dp0"
node builder\tbdocs.mjs --src docs --serve %*
@rem popd resets ERRORLEVEL, so capture it first -- otherwise a server that
@rem could not start (a failed first build, a port in use) would report success.
@set "TBDOCS_ERR=%ERRORLEVEL%"
@popd
@exit /b %TBDOCS_ERR%
