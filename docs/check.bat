@rem Run the Node-based link checker on all three build outputs in parallel.
@rem /sep/ dispatches each segment to a worker thread; results are printed
@rem in order with headers.
@rem
@rem _site/         Online tree.  --fallback-extensions html mirrors what
@rem                GitHub Pages does at request time.
@rem _site-offline/  Offline tree.  --forbid catches surviving live-site
@rem                links the offlinify rewrite missed.
@rem _site-pdf/      PDF source.  --no-fail makes failures informational
@rem                (links in the book are not fully resolved).
@setlocal
@node "%~dp0..\scripts\check_links.mjs"^
 --offline --include-fragments --fallback-extensions html --index-files "index.html,." --root-dir ".\_site" ".\_site" %*^
 /sep/^
 --offline --include-fragments --index-files "index.html" --forbid "https://docs.twinbasic.com" --root-dir ".\_site-offline" ".\_site-offline" %*^
 /sep/^
 --offline --no-fail --include-fragments --root-dir ".\_site-pdf" ".\_site-pdf\book.html" %*
