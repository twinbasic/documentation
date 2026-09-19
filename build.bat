@rem Builds all three output trees and runs the link + integrity check
@rem over the HTML while it is still in worker memory. Pass --no-check
@rem for a plain build (a later flag wins over the one baked in here).
@rem
@rem --check-audit-index implies --check and adds the one guard the
@rem findings comparison structurally cannot provide: it diffs the tree
@rem index the build derives from its own records against what actually
@rem landed on disk. A MISSING entry turns a working link into a reported
@rem break, which is loud; a SPURIOUS one makes the oracle answer "exists"
@rem for a path that 404s in production, and every link to it passes.
@rem Cost is one readdir per tree.
@pushd "%~dp0"
node builder\tbdocs.mjs --src docs --check-audit-index %*
@rem popd resets ERRORLEVEL, so capture it first -- otherwise a failing
@rem check (or a dot / scss / asset failure) would report success.
@set "TBDOCS_ERR=%ERRORLEVEL%"
@popd
@exit /b %TBDOCS_ERR%
