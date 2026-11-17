// The twinBASIC scanner the verifier reads a package with. In the documentation's repository it is
// the one scanner every tool there shares, scripts/lib/twin-api.mjs; packing the verifier's zip
// replaces this file with a copy of that scanner, so the zip needs nothing outside itself. A
// declaration the scanner misreads is fixed there, never here.
export { declareParts, parseSources } from "../../../../../scripts/lib/twin-api.mjs";
