@echo off
@pushd "%~dp0"
rem Test twinBASIC IDE add-ins by machine: the scenarios under test\addin.
rem
rem Each lane in test\addin\lanes.mjs is a node:test file with its own copy of
rem the twinBASIC install, into which it builds the add-ins it tests, and its
rem own DevTools port. It opens a project, operates the IDE the way a person
rem does, and reads what the add-in did. The IDE's registry entries and the
rem add-ins' own saved settings are put back as they were found at the end.
rem WIP.HelpAddin.md is the plan this serves, and WIP.Harness.md says how.
rem
rem THIS IS NOT ONE OF THE GATES, for the reasons examples.bat is not: it
rem needs a twinBASIC install and Windows, with a private desktop and a
rem CDP-reachable WebView2, and neither is on the CI box. Keep it out of
rem build.bat, check.bat, test.bat and both CI workflows.
rem
rem Arguments are passed straight through:
rem
rem   addin-test.bat --only sample15     just that lane
rem   addin-test.bat --port 9600         lanes on ports 9600, 9601, ...
rem   addin-test.bat --jobs 1            one lane at a time
rem
rem Exit: 0 every lane passed and the registry is as it was found, 1 a lane
rem failed, 2 the harness failed or could not put the registry back.
node scripts/addin_test.mjs %*
@rem popd resets ERRORLEVEL, so capture it first -- otherwise a failing lane
@rem would report success to whatever called addin-test.bat.
@set "ADDIN_TEST_ERR=%ERRORLEVEL%"
@popd
@exit /b %ADDIN_TEST_ERR%
