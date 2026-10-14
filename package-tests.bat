@echo off
@pushd "%~dp0"
rem Run the contributed packages' test projects (test\package-tests\<Package>\).
rem
rem Each NOTE and WARNING of a contributed package's section is backed by test
rem cases in that package's project. A case checks what is correct, so a
rem defect of the package is a failing case, and expect.json records how each
rem case fails on the version the section documents. This runs every case,
rem with the package embedded, as 32-bit and 64-bit, and says which ones no
rem longer do what expect.json says: fixed (the page's callout goes) or
rem changed (a claim of the page is no longer true).
rem
rem THIS IS NOT ONE OF THE GATES, for the reasons examples.bat is not: it
rem needs a twinBASIC install, Windows and a private desktop. The gate that
rem ties the pages' callouts to the cases, check_package_tests.mjs, needs
rem none of that and is in test.bat. Arguments are passed straight through:
rem
rem   package-tests.bat                       every project
rem   package-tests.bat tbRegExp --arch win32 one package, one architecture
rem   package-tests.bat tbRegExp --update     write its expect.json from the run
rem
rem Exit: 0 every case as documented, 1 a case fixed or changed, 2 the harness
rem failed.
node scripts/package_tests.mjs %*
@rem popd resets ERRORLEVEL, so capture it first.
@set "PACKAGE_TESTS_ERR=%ERRORLEVEL%"
@popd
@exit /b %PACKAGE_TESTS_ERR%
