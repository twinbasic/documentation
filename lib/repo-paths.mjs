// The repository root, and the paths several tools build from it. Every tool
// takes them from here rather than from the working directory, so it runs the
// same from any folder, and a change to the repository's layout is made once.
//
// A path a tool is given on its command line still resolves against the
// working directory, which is what someone typing a relative path expects.

import path from "node:path";
import { fileURLToPath } from "node:url";

/** The repository root: the folder holding `docs/`, `builder/`, `scripts/` and this `lib/`. */
export const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

/** The documentation source tree, `docs/`, which also holds the build's output trees. */
export const DOCS_DIR = path.join(REPO_ROOT, "docs");
