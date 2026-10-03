// A zip file written in Node, for scripts/bug_repro.mjs, which zips a reproducer's
// project for the GitHub issue that reports it.
//
// WHY IT IS WRITTEN HERE. Compress-Archive is PowerShell and 7-Zip is not on PATH;
// Git Bash's `tar -a` writes a tar archive under the .zip name and exits 0. A zip
// is a local header and the deflated bytes for each file, a central directory
// entry for each, and the end record, and zlib.crc32 is the checksum, so no
// dependency is needed. Each file keeps its own modified time, so zipping an
// unchanged set of files twice writes the same bytes.

import { readFileSync, statSync } from "node:fs";
import zlib from "node:zlib";

/**
 * A zip file, as the bytes: for each file a local header and the deflated data,
 * then a central directory entry for each and the end record. Each file is
 * `{ name, data, mtime }`, and keeps its own modified time.
 */
export function zipFiles(files) {
  const UTF8 = 0x0800;
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data, mtime } of files) {
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);
    const nameBytes = Buffer.from(name, "utf8");
    const time = (mtime.getHours() << 11) | (mtime.getMinutes() << 5) | (mtime.getSeconds() >> 1);
    const date = ((Math.max(mtime.getFullYear(), 1980) - 1980) << 9) | ((mtime.getMonth() + 1) << 5) | mtime.getDate();

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed: deflate
    local.writeUInt16LE(UTF8, 6);
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    // extra field length (28) stays 0

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(UTF8, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    // extra, comment, disk, internal and external attributes (30-41) stay 0
    central.writeUInt32LE(offset, 42); // offset of the local header

    locals.push(local, nameBytes, compressed);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + compressed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8); // entries on this disk
  end.writeUInt16LE(files.length, 10); // entries in all
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, directory, end]);
}

/** A zip entry for a file on disk: the name it has in the zip, its bytes and its own modified time. */
export const fileEntry = (name, file) => ({ name, data: readFileSync(file), mtime: statSync(file).mtime });

/**
 * The files of a zip written by zipFiles, read back through its central
 * directory: `{ name, data }` for each, with the data inflated. It reads no
 * other zip than this writer's (no extra fields, no zip64), which is all a probe
 * of what was zipped needs.
 */
export function readZip(buf) {
  const endAt = buf.length - 22;
  if (endAt < 0 || buf.readUInt32LE(endAt) !== 0x06054b50) throw new Error("not a zip: no end record");
  const count = buf.readUInt16LE(endAt + 10);
  let at = buf.readUInt32LE(endAt + 16);
  const files = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error("not a zip: bad central directory entry");
    const size = buf.readUInt32LE(at + 20);
    const nameLength = buf.readUInt16LE(at + 28);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString("utf8", at + 46, at + 46 + nameLength);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    files.push({ name, data: zlib.inflateRawSync(buf.subarray(start, start + size)) });
    at += 46 + nameLength;
  }
  return files;
}
