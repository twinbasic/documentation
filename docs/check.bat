@rem Run the Python-based link checker on both build outputs, then scan
@rem _site-offline/ for live-site links that survived offlinify.
@rem
@rem Same arguments as lychee.bat -- only the executable differs. The Python
@rem script is faster on this workload (~25x on Windows) and a bit stricter:
@rem it flags <script src> targets that don't exist and rejects trailing
@rem slashes on file-shaped URLs (e.g. `foo.html/`), both of which lychee
@rem silently accepts. lychee.bat remains available as a second opinion.
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
@rem live-links   Greps _site-offline/ HTML for any surviving
@rem               https://docs.twinbasic.com reference outside <code> /
@rem               <pre> blocks. After _plugins/offlinify.rb strips the
@rem               jekyll-seo-tag block from each page, none should
@rem               remain -- a hit means a source link goes to the live
@rem               site instead of the canonical /tB/... permalink.
@rem               See ../scripts/check_offline_live_links.py.
@rem
@rem All three checks always run so you see all errors in one pass; the
@rem script exits non-zero if any fails (earlier failures take precedence
@rem in the reported code).
@setlocal
@set CHECK=python "%~dp0..\scripts\check_links.py"
@echo Checking _site/ (online) ...
@%CHECK% --offline --include-fragments --fallback-extensions html --index-files "index.html,." --root-dir ".\_site" ".\_site" %*
@set EXIT1=%ERRORLEVEL%
@echo.
@echo Checking _site-offline/ (offline) ...
@rem No `.` in --index-files: under file://, a bare directory URL
@rem (`Foo/`) requires an actual index.html inside. The online check
@rem above accepts `.` because GitHub Pages can serve an unstyled
@rem directory listing or a 404 in that case; offline, there's no
@rem such fallback, and the link is just broken.
@%CHECK% --offline --include-fragments --index-files "index.html" --root-dir ".\_site-offline" ".\_site-offline" %*
@set EXIT2=%ERRORLEVEL%
@echo.
@echo Checking _site-offline/ for live-site links ...
@python "%~dp0..\scripts\check_offline_live_links.py"
@set EXIT3=%ERRORLEVEL%
@echo.
@echo Checking _site-pdf/book.html (informational -- failures do not block) ...
@rem Links in the book are not fully resolved (absolute intra-site URLs stay live
@rem until the book chapter transform rewrites them, and some fragments are still
@rem missing). Run for visibility; exit code is intentionally not propagated.
@%CHECK% --offline --include-fragments --root-dir ".\_site-pdf" ".\_site-pdf\book.html" %*
@echo.
@if %EXIT1% NEQ 0 exit /b %EXIT1%
@if %EXIT2% NEQ 0 exit /b %EXIT2%
@exit /b %EXIT3%
