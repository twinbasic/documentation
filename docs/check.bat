@rem Use lychee to check the links in the site
@"%~dp0..\.claude\lychee.exe" --offline --include-fragments --fallback-extensions html --index-files "index.html,." --root-dir ".\_site" ".\_site" %*