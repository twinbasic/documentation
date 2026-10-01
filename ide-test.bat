@echo off
@pushd "%~dp0"
rem Test the twinBASIC IDE itself by machine: the scenarios under test\ide.
rem
rem Each lane in test\ide\lanes.mjs is a node:test file with its own copy of
rem the twinBASIC install and its own DevTools port. It opens a project,
rem operates the IDE the way a person does (the debugger, Export Project, the
rem Packages dialog) and reads what the IDE did. The IDE's registry entries are
rem put back as they were found at the end. addin-test.bat is the same runner
rem for IDE add-ins; WIP.Harness.md says how both work.
rem
rem THIS IS NOT ONE OF THE GATES, for the reasons examples.bat is not: it
rem needs a twinBASIC install and Windows, with a private desktop and a
rem CDP-reachable WebView2, and neither is on the CI box. Keep it out of
rem build.bat, check.bat, test.bat and both CI workflows.
rem
rem Arguments are passed straight through:
rem
rem   ide-test.bat --only export         just that lane
rem   ide-test.bat --port 9700           lanes on ports 9700, 9701, ...
rem   ide-test.bat --jobs 1              one lane at a time
rem
rem Exit: 0 every lane passed and the registry is as it was found, 1 a lane
rem failed, 2 the harness could not run, 3 the registry or a work folder was
rem not put back.
node scripts/ide_test.mjs %*
@rem popd resets ERRORLEVEL, so capture it first -- otherwise a failing lane
@rem would report success to whatever called ide-test.bat.
@set "IDE_TEST_ERR=%ERRORLEVEL%"
@popd
@exit /b %IDE_TEST_ERR%
