cd /d "%~dp0"
node ..\builder\index.mjs --src .
npx --yes http-server _site -p 4000 -c-1
