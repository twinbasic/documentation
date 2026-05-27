cd /d "%~dp0"
node ..\builder\tbdocs.mjs --src .
node serve.mjs
