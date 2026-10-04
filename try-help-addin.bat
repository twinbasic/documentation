@echo off
@pushd "%~dp0"
rem Try the help add-in by hand: opens an IDE on your desktop with add-in\
rem built and loaded, and waits until you close it.
rem
rem The add-in goes into a copy of the twinBASIC install in the temp folder,
rem never into the install's addins\ or %APPDATA%\twinBASIC\addins\, and the
rem IDE gets an APPDATA of its own. The IDE's registry entries and the
rem add-in's saved settings are put back once the IDE is closed. The pane's
rem pages come from docs\_site, so run build.bat first.
rem
rem THIS IS NOT ONE OF THE GATES: it needs a twinBASIC install and Windows.
rem Keep it out of build.bat, check.bat, test.bat and both CI workflows.
rem
rem Arguments are passed straight through:
rem
rem   try-help-addin.bat --project test\addin\helphost   the project to open
rem   try-help-addin.bat --port 9600                     another DevTools port
rem
rem Exit: 0 the IDE was closed and the registry is as it was found, 1 the
rem add-in did not build or the project does not compile, 2 the tool could
rem not run, 3 the registry or the work folder was not put back.
node scripts/try_help_addin.mjs %*
@rem popd resets ERRORLEVEL, so capture it first.
@set "TRY_HELP_ADDIN_ERR=%ERRORLEVEL%"
@popd
@exit /b %TRY_HELP_ADDIN_ERR%
