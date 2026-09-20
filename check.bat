@rem The gates that need a browser or a separate pass over the built
@rem tree. Link and site-integrity checking moved into the build itself
@rem -- see build.bat and builder/PLAN-checks.md. scripts/check_links.mjs
@rem is still the tool for a tree this build did not produce, and
@rem scripts/check_links_diff.mjs is what says the two agree.
@pushd "%~dp0"
@rem Everything below reads docs\_site-offline\ as it stands. Edit a page,
@rem run this without rebuilding, and it audits the previous build and
@rem passes. Refuse instead, naming build.bat.
node scripts/check_tree_fresh.mjs
@if errorlevel 1 goto :fail
node scripts/check_axe_patch_equiv.mjs
@if errorlevel 1 goto :fail
node scripts/pick_a11y_sample.mjs --check
@if errorlevel 1 goto :fail
node scripts/check_a11y.mjs
@if errorlevel 1 goto :fail
@popd
@exit /b 0
:fail
@rem Capture before popd, which would otherwise reset ERRORLEVEL to 0
@rem and report a clean run.
@set "CHECK_ERR=%ERRORLEVEL%"
@popd
@exit /b %CHECK_ERR%
