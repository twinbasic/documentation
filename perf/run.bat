@echo off
rem Per-page timing harness for paged.js. Defaults to rendering
rem ..\docs\_site-pdf\book.html. Pass an explicit path to override.
cd /d "%~dp0"
if not exist ..\node_modules\puppeteer\package.json (
    echo Installing dependencies...
    pushd .. && call npm install && popd
    if errorlevel 1 exit /b 1
)
node measure.mjs %*
