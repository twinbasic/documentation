@rem Run the Node-based link checker on both build outputs. The offline
@rem pass additionally uses --forbid to flag any surviving
@rem https://docs.twinbasic.com/<path> link that the offlinify rewrite
@rem missed.
@rem
@rem _site/        Online tree. `--fallback-extensions html` mirrors what
@rem               GitHub Pages does at request time: an extensionless
@rem               URL like /FAQ is served as /FAQ.html. Without the flag
@rem               every pretty permalink would appear broken. No
@rem               --forbid here -- the online tree intentionally carries
@rem               canonical https://docs.twinbasic.com links in the
@rem               jekyll-seo-tag block.
@rem _site-offline/ Offline tree. No extension fallback -- every link
@rem               must resolve to an actual file under file://, since
@rem               the browser does no rewriting. Catches relative links
@rem               whose permalink shape doesn't match the rendered
@rem               filename (e.g. `[Foo](Foo/)` when Jekyll wrote
@rem               `Foo.html`, not `Foo/index.html`). --forbid on this
@rem               pass also fails the build if any extracted link
@rem               still points at https://docs.twinbasic.com/<path>
@rem               (bare domain and trailing-slash root are exempt).
@rem
@rem All three checks always run so you see all errors in one pass; the
@rem script exits non-zero if any fails (earlier failures take precedence
@rem in the reported code).
@setlocal
@set CHECK=node "%~dp0..\scripts\check_links.mjs"
@echo Checking _site/ (online) ...
@%CHECK% --offline --include-fragments --fallback-extensions html --index-files "index.html,." --root-dir ".\_site" ".\_site" %*
@set EXIT1=%ERRORLEVEL%
@echo.
@echo Checking _site-offline/ (offline, with --forbid) ...
@rem No `.` in --index-files: under file://, a bare directory URL
@rem (`Foo/`) requires an actual index.html inside. The online check
@rem above accepts `.` because GitHub Pages can serve an unstyled
@rem directory listing or a 404 in that case; offline, there's no
@rem such fallback, and the link is just broken.
@%CHECK% --offline --include-fragments --index-files "index.html" --forbid "https://docs.twinbasic.com" --root-dir ".\_site-offline" ".\_site-offline" %*
@set EXIT2=%ERRORLEVEL%
@echo.
@echo Checking _site-pdf/book.html (informational -- failures do not block) ...
@rem Links in the book are not fully resolved (absolute intra-site URLs stay live
@rem until the book chapter transform rewrites them, and some fragments are still
@rem missing). Run for visibility; exit code is intentionally not propagated.
@%CHECK% --offline --include-fragments --root-dir ".\_site-pdf" ".\_site-pdf\book.html" %*
@echo.
@if %EXIT1% NEQ 0 exit /b %EXIT1%
@exit /b %EXIT2%
