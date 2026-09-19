@rem Builds all three output trees and runs the link + integrity check
@rem over the HTML while it is still in worker memory. Pass --no-check
@rem for a plain build (a later flag wins over the one baked in here).
@pushd "%~dp0"
node builder\tbdocs.mjs --src docs --check %*
@rem popd resets ERRORLEVEL, so capture it first -- otherwise a failing
@rem check (or a dot / scss / asset failure) would report success.
@set "TBDOCS_ERR=%ERRORLEVEL%"
@popd
@exit /b %TBDOCS_ERR%
