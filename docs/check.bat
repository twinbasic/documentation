@rem Use lychee to check the links in both build outputs.
@rem
@rem _site/        Online tree. `--fallback-extensions html` mirrors what
@rem               GitHub Pages does at request time: an extensionless
@rem               URL like /FAQ is served as /FAQ.html. Without the flag
@rem               every pretty permalink would appear broken.
@rem _site-offline/ Offline tree. No extension fallback -- every link must
@rem               resolve to an actual file under file://, since the
@rem               browser does no rewriting. Catches relative links in
@rem               markdown sources whose permalink shape doesn't match
@rem               the rendered filename (e.g. `[Foo](Foo/)` when Jekyll
@rem               wrote `Foo.html`, not `Foo/index.html`).
@rem
@rem Both checks always run so you see all errors in one pass; the script
@rem exits non-zero if either fails (online failure takes precedence in
@rem the reported code).
@setlocal
@set LYCHEE="%~dp0..\.claude\lychee.exe"
@echo Checking _site/ (online) ...
@%LYCHEE% --offline --include-fragments --fallback-extensions html --index-files "index.html,." --root-dir ".\_site" ".\_site" %*
@set EXIT1=%ERRORLEVEL%
@echo.
@echo Checking _site-offline/ (offline) ...
@rem No `.` in --index-files: under file://, a bare directory URL
@rem (`Foo/`) requires an actual index.html inside. The online check
@rem above accepts `.` because GitHub Pages can serve an unstyled
@rem directory listing or a 404 in that case; offline, there's no
@rem such fallback, and the link is just broken.
@%LYCHEE% --offline --include-fragments --index-files "index.html" --root-dir ".\_site-offline" ".\_site-offline" %*
@set EXIT2=%ERRORLEVEL%
@if %EXIT1% NEQ 0 exit /b %EXIT1%
@exit /b %EXIT2%
