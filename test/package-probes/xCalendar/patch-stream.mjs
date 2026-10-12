// Makes the designer data of a control that was saved on another day.
//
//   node test/package-probes/xCalendar/patch-stream.mjs <in.tbform> <out.tbform> Year=2020 Month=5 Day=17
//
// designer.mjs gets the IDE to write xCalendar1's entry in a Form1.tbform: the properties as plain
// keys, and `_IPersistStreamData`, the property bag the control's ReadProperties reads at run time
// (probe.mjs --set shows that the plain keys alone are ignored). Saved on the day it is placed, the
// bag holds Day, Month and Year of that day and no Value, because the control's WriteProperties
// leaves out a Value equal to the current date. To see what the control reads on a later day, this
// writes the file again with a bag whose Day, Month and Year are the ones given, and the plain
// keys to match; the date given is the day the file was "saved" on.
//
// The bag stores each of these three as a 16-bit integer straight after its key, the key in UTF-16.
import { readFileSync, writeFileSync } from "node:fs";

const [inFile, outFile, ...pairs] = process.argv.slice(2);
if (!inFile || !outFile || pairs.length === 0) {
  console.error("usage: node patch-stream.mjs <in.tbform> <out.tbform> Year=N Month=N Day=N");
  process.exit(2);
}
const want = Object.fromEntries(
  pairs.map((p) => {
    const [k, v] = p.split("=");
    return [k, Number(v)];
  }),
);
const form = JSON.parse(readFileSync(inFile, "utf8").replace(/^﻿/, ""));
const control = form[0]._children.find((c) => c.Name === "xCalendar1");
const bag = Buffer.from(control._IPersistStreamData, "base64");
for (const [key, value] of Object.entries(want)) {
  const needle = Buffer.from(key.toLowerCase(), "utf16le");
  const at = bag.indexOf(needle);
  if (at < 0) {
    console.error(`patch-stream: the bag has no ${key}`);
    process.exit(1);
  }
  const old = bag.readInt16LE(at + needle.length);
  bag.writeInt16LE(value, at + needle.length);
  console.log(`${key}: ${old} -> ${value}`);
  control[key] = value;
}
control._IPersistStreamData = bag.toString("base64");
if (want.Year && want.Month && want.Day) {
  const d = new Date(Date.UTC(want.Year, want.Month - 1, want.Day));
  control.Value = Math.round(d.getTime() / 86400000) + 25569;
  control.ValueStr = `${want.Month}/${want.Day}/${want.Year}`;
}
writeFileSync(outFile, `${JSON.stringify(form, null, "\t")}\n`, "utf8");
