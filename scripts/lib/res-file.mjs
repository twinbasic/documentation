// A compiled resource file (.res), as VB6's resource editor and rc.exe write one, for a
// fixture that needs a VB6 project with resources: shoot_docs.mjs writes one for the .vbp
// it imports. Icons and a manifest are all it needs; the format is the documented one
// (RESOURCEHEADER, "Resource File Formats" in the Win32 documentation).
//
//     writeFileSync("Demo.res", resFile([
//       ...iconGroup("APPICON", 1, iconImage(32, [200, 40, 40], "square")),
//       manifestResource(readFileSync("manifest.xml")),
//     ]));

const RT_ICON = 3;
const RT_GROUP_ICON = 14;
const RT_MANIFEST = 24;
const LANG_EN_US = 0x0409;
const MOVEABLE = 0x10;
const PURE = 0x20;
const DISCARDABLE = 0x1000;

// A type or a name in a resource header: a number is an ordinal (0xFFFF, then the
// number), a string is UTF-16 with a terminating zero, as rc writes it in capitals.
function idField(id) {
  if (typeof id === "number") {
    const b = Buffer.alloc(4);
    b.writeUInt16LE(0xffff, 0);
    b.writeUInt16LE(id, 2);
    return b;
  }
  return Buffer.from(`${id.toUpperCase()}\0`, "utf16le");
}

const pad4 = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);

// One resource: its header (padded to a DWORD after the name, as the format requires) and
// its data, padded to a DWORD.
function entry({ type, name, data, flags = MOVEABLE | DISCARDABLE, language = LANG_EN_US }) {
  const names = pad4(Buffer.concat([idField(type), idField(name)]));
  const tail = Buffer.alloc(16);
  tail.writeUInt32LE(0, 0); // DataVersion
  tail.writeUInt16LE(flags, 4);
  tail.writeUInt16LE(language, 6);
  tail.writeUInt32LE(0, 8); // Version
  tail.writeUInt32LE(0, 12); // Characteristics
  const head = Buffer.alloc(8);
  head.writeUInt32LE(data.length, 0);
  head.writeUInt32LE(8 + names.length + tail.length, 4);
  return Buffer.concat([head, names, tail, pad4(data)]);
}

/**
 * A .res file of `resources`, each `{type, name, data, flags?, language?}`: the empty
 * entry every .res file starts with, then each in turn.
 * @returns {Buffer}
 */
export function resFile(resources) {
  return Buffer.concat([
    entry({ type: 0, name: 0, data: Buffer.alloc(0), flags: 0, language: 0 }),
    ...resources.map(entry),
  ]);
}

/**
 * The image of an icon as RT_ICON holds it: a 32-bit DIB of `size` pixels square (its
 * height doubled for the AND mask, which is all zero, since the alpha decides), a shape of
 * the colour `rgb` ([r, g, b]) on a transparent ground: "square" or "circle".
 * @returns {Buffer}
 */
export function iconImage(size, rgb, shape) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16); // BI_RGB
  header.writeUInt32LE(size * size * 4, 20);
  const pixels = Buffer.alloc(size * size * 4);
  const r = size / 2 - 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - size / 2;
      const dy = y + 0.5 - size / 2;
      const inside = shape === "circle" ? dx * dx + dy * dy <= r * r : Math.max(Math.abs(dx), Math.abs(dy)) <= r;
      if (!inside) continue;
      // rows bottom-up, each pixel B, G, R, A
      const at = ((size - 1 - y) * size + x) * 4;
      pixels[at] = rgb[2];
      pixels[at + 1] = rgb[1];
      pixels[at + 2] = rgb[0];
      pixels[at + 3] = 255;
    }
  }
  const maskRow = Math.ceil(size / 32) * 4;
  return Buffer.concat([header, pixels, Buffer.alloc(maskRow * size)]);
}

/**
 * An icon as a resource file holds it: the image as RT_ICON `id`, and the group RT_GROUP_ICON
 * `name` that a program loads it by, listing that one image.
 */
export function iconGroup(name, id, image) {
  const size = image.readInt32LE(4);
  const dir = Buffer.alloc(6 + 14);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2); // icons
  dir.writeUInt16LE(1, 4); // one image
  dir.writeUInt8(size >= 256 ? 0 : size, 6);
  dir.writeUInt8(size >= 256 ? 0 : size, 7);
  dir.writeUInt8(0, 8); // colour count
  dir.writeUInt8(0, 9);
  dir.writeUInt16LE(1, 10); // planes
  dir.writeUInt16LE(32, 12); // bits per pixel
  dir.writeUInt32LE(image.length, 14);
  dir.writeUInt16LE(id, 18);
  return [
    { type: RT_ICON, name: id, data: image },
    { type: RT_GROUP_ICON, name, data: dir, flags: MOVEABLE | PURE | DISCARDABLE },
  ];
}

/** An application manifest, RT_MANIFEST 1, as a program's own. */
export const manifestResource = (xml) => ({
  type: RT_MANIFEST,
  name: 1,
  data: Buffer.from(xml),
  flags: MOVEABLE | PURE,
});
