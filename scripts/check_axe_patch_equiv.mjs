// Value-equivalence check for the Color2 source patches.
//
// check_a11y_fingerprint.mjs asks "does axe still find the same things".  That
// is the right question for a configuration change, but it is not sufficient
// for a patch to the colour maths: the gate compares `incomplete` as a rule-id
// SET, so a colour error that shifted contrast ratios without flipping any
// pass/fail classification would sail straight through it.
//
// So this checks the numbers themselves.  It builds the same Colors under the
// stock and patched bundles and compares every derived value that
// `color-contrast` actually consumes.
//
// Run it:
//
//   * before adopting a new entry in SOURCE_PATCHES, and
//   * after every axe-core upgrade, alongside check_a11y_fingerprint.mjs --
//     the patches are pinned to the bundle's current text.
//
// Usage:  node scripts/check_axe_patch_equiv.mjs [--patch NAME]
//
// Exit codes: 0 equivalent, 1 a value differs, 2 harness error.
//
// One difference is expected and allowed: `plain-color-fields` turns the six
// private fields into own properties, so `Object.keys(color)` returns them.
// That cannot reach a consumer -- Color2 defines an explicit toJSON returning
// {red, green, blue, alpha}, and color-contrast puts only toHexString()
// strings into result data (axe.js:27284-27285), never a Color instance.
// It is reported, not treated as a failure.

import {
  DEFAULT_ROOT_DIR,
  VIEWPORTS,
  gotoPage,
  launchBrowser,
  newAuditPage,
  readAxeSource,
} from "./lib/axe-scan.mjs";

let patchName = "plain-color-fields";
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--patch" && args[i + 1]) patchName = args[++i];
  else if (args[i] === "-h" || args[i] === "--help") {
    console.log("usage: node scripts/check_axe_patch_equiv.mjs [--patch NAME]");
    process.exit(0);
  } else {
    console.error(`unknown arg: ${args[i]}`);
    process.exit(2);
  }
}

// Runs in the page against whichever bundle was injected.
const PROBE = () => {
  const C = axe.commons.color.Color;
  const out = [];

  // Parsing: every string form color-contrast can meet, including the hsl
  // angle units that route through Color2.parseString's regex rewrite.
  for (const str of [
    "rgb(0, 0, 0)", "rgb(255, 255, 255)", "#27201c", "#fff", "#1a1a1aE6",
    "rgba(12, 34, 56, 0.5)", "hsl(210, 50%, 40%)", "hsl(0.5turn, 60%, 30%)",
    "hsl(2rad, 60%, 30%)", "rgb(1 2 3 / 40%)", "transparent",
  ]) {
    const c = new C();
    try {
      c.parseString(str);
    } catch (e) {
      out.push(["parse:" + str, "throw:" + e.message]);
      continue;
    }
    out.push(["parse:" + str, JSON.stringify(c.toJSON()), c.getRelativeLuminance(), c.toHexString()]);
  }

  // Channel round-trips through BOTH accessor pairs: r/g/b write the
  // normalised field and the 0-255 field, red/green/blue write them the other
  // way round. The patch touches all twelve setters.
  for (const v of [0, 1, 127, 128, 254, 255]) {
    const c = new C(v, 255 - v, 128, 0.75);
    out.push([
      "ctor:" + v, JSON.stringify(c.toJSON()),
      c.r, c.g, c.b, c.red, c.green, c.blue,
      c.getRelativeLuminance(), c.toHexString(),
    ]);
  }

  // Copy constructor takes the early-return path in the constructor.
  const base = new C(30, 60, 90, 1);
  out.push(["copy", JSON.stringify(new C(base).toJSON())]);

  // setLuminosity routes through the private method #add behind the brand
  // assert that plain-color-fields removes; setSaturation through clip().
  out.push(["luminosity", base.getLuminosity(), JSON.stringify(base.setLuminosity(0.4).toJSON())]);
  out.push(["saturation", base.getSaturation(), JSON.stringify(base.setSaturation(0.2).toJSON())]);

  return { values: out, keys: Object.keys(new C(1, 2, 3, 1)) };
};

async function main() {
  const browser = await launchBrowser();
  const page = await newAuditPage(browser);
  await page.setViewport(VIEWPORTS.desktop);

  const results = {};
  try {
    for (const [label, src] of [
      ["stock", readAxeSource({ minified: false })],
      ["patched", readAxeSource({ minified: false, patches: [patchName] })],
    ]) {
      // Any page will do; the probe never touches the DOM.
      await gotoPage(page, { rootDir: DEFAULT_ROOT_DIR, filePath: "/404.html", theme: "light" });
      await page.evaluate(src);
      results[label] = await page.evaluate(PROBE);
    }
  } finally {
    await browser.close();
  }

  console.log(`patch: ${patchName}\n`);

  let differing = 0;
  for (let i = 0; i < results.stock.values.length; i++) {
    const a = JSON.stringify(results.stock.values[i]);
    const b = JSON.stringify(results.patched.values[i]);
    if (a === b) continue;
    differing++;
    console.log(`  DIFFERS\n    stock  : ${a}\n    patched: ${b}`);
  }

  const n = results.stock.values.length;
  console.log(`  ${n - differing}/${n} colour values identical`);

  const ks = JSON.stringify(results.stock.keys);
  const kp = JSON.stringify(results.patched.keys);
  if (ks !== kp) {
    console.log("");
    console.log(`  own properties changed (expected, and unreachable by consumers):`);
    console.log(`    stock  : ${ks}`);
    console.log(`    patched: ${kp}`);
  }

  if (differing > 0) {
    console.log(`\n  ${differing} value(s) differ -- the patch is NOT value-preserving`);
    process.exit(1);
  }
  console.log(`\n  patch is value-preserving`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
