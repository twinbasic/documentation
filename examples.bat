@echo off
@pushd "%~dp0"
rem Compile the documentation's own twinBASIC code samples.
rem
rem Every ```tb fence marked `check_build` is generated into a project and
rem handed to the compiler. Two samples that do not compile shipped before
rem anything asked -- a fence is something check_code_regions.mjs protects the
rem CONTENTS of and nothing evaluates.
rem
rem THIS IS NOT ONE OF THE GATES. It is not in build.bat, check.bat, test.bat
rem or either CI workflow, and it must not be added to them:
rem
rem   * it needs a twinBASIC install, and `npm install` has to remain
rem     sufficient to build the docs;
rem   * it needs Windows, a private desktop and a CDP-reachable WebView2, none
rem     of which exists on the CI box;
rem   * an IDE cold start is 8-11 s where a whole site build is ~4 s.
rem
rem It is run by a person, deliberately -- the same deal sweep_a11y.mjs makes.
rem Arguments are passed straight through, so the useful ones are:
rem
rem   examples.bat --only "^Reference/Core"    just those pages
rem   examples.bat --census                    classify every fence, no compiler
rem   examples.bat --propose                   compile the unmarked ones too
rem   examples.bat --propose --apply           ...and mark the ones that pass
rem
rem Exit: 0 clean, 1 a sample does not compile, 2 the harness failed.
node scripts/check_examples.mjs %*
@rem popd resets ERRORLEVEL, so capture it first -- otherwise a failing sample
@rem would report success to whatever called examples.bat.
@set "EXAMPLES_ERR=%ERRORLEVEL%"
@popd
@exit /b %EXAMPLES_ERR%
