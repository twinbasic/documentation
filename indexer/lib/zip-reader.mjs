import { inflateRawSync } from 'node:zlib';

// End of Central Directory signature
const EOCD_SIG = 0x06054b50;
// Central Directory file header signature
const CDFH_SIG = 0x02014b50;

function readZipDirectory(buffer) {
  const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Scan backward for EOCD (last 65KB + 22 bytes is the max EOCD size)
  const searchStart = Math.max(0, buf.length - 65557);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('ZIP: End of Central Directory not found');

  const cdEntryCount = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const entries = new Map();
  let pos = cdOffset;
  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < cdEntryCount; i++) {
    if (view.getUint32(pos, true) !== CDFH_SIG)
      throw new Error(`ZIP: bad central directory header at offset ${pos}`);

    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const name = decoder.decode(buf.subarray(pos + 46, pos + 46 + nameLen));
    entries.set(name, {
      name,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      localHeaderOffset,
    });

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

function extractFile(buffer, entry) {
  const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const off = entry.localHeaderOffset;

  const nameLen = view.getUint16(off + 26, true);
  const extraLen = view.getUint16(off + 28, true);
  const dataStart = off + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return Buffer.from(raw);
  }
  if (entry.compressionMethod === 8) {
    return inflateRawSync(raw);
  }
  throw new Error(`ZIP: unsupported compression method ${entry.compressionMethod}`);
}

export { readZipDirectory, extractFile };
