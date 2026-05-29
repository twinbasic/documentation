// Phase 11 (B3) SCSS compiler: compiles docs/assets/css/just-the-docs-combined.scss
// using the sass (Dart Sass) package directly. The compiled output is the full
// just-the-docs-combined.css served to the site.
//
// Sass load paths, searched in order:
//   1. docs/_sass/                            -- our customizations
//   2. builder/vendor/just-the-docs/_sass/    -- pristine JTD v0.10.1 sources
//
// This mirrors how Jekyll resolved partials when the gem was installed: a
// `_sass/custom/custom.scss` in the site root shadowed the gem's empty
// upstream version. The same shadowing now happens via load-path ordering.
//
// Failure modes:
//   SETUP   -- sass not installed: throw. There is no pre-compiled fallback;
//              `npm install` is the fix. The error message points there.
//   CONTENT -- SCSS syntax error: warn, return { failed: true }. The caller
//              sets process.exitCode = 1 so CI surfaces it. The site still
//              renders but without the just-the-docs theme (the previous
//              build's CSS lingers under <destRoot>/, if any).
//
// On success the caller (tbdocs.mjs) injects the result as a generatedAsset
// at rel "assets/css/just-the-docs-combined.css".

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENDOR_JTD_SASS = path.join(__dirname, "vendor", "just-the-docs", "_sass");
const SCSS_REL = path.join("assets", "css", "just-the-docs-combined.scss");

export async function compileScss(srcRoot) {
  let sass;
  try {
    sass = await import("sass");
  } catch (err) {
    throw new Error(
      "scss: sass not installed. Run `npm install` at the repo root to fetch it.",
      { cause: err },
    );
  }

  const scssPath = path.join(srcRoot, SCSS_REL);

  let result;
  try {
    result = sass.compile(scssPath, {
      style: "expanded",
      sourceMap: false,
      loadPaths: [
        path.join(srcRoot, "_sass"),  // our customizations first
        VENDOR_JTD_SASS,               // gem fallback
      ],
    });
  } catch (err) {
    console.warn(`scss: compilation failed:\n  ${err.message}`);
    return { compiled: false, failed: true };
  }

  return { compiled: true, css: result.css };
}
