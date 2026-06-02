// SharedArrayBuffer broadcast for the render fan-out. Serializes an object
// once into a SAB so all workers share the same memory instead of each
// receiving an independent structured-clone copy.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function packShared(obj) {
  const bytes = encoder.encode(JSON.stringify(obj));
  const sab = new SharedArrayBuffer(bytes.byteLength);
  new Uint8Array(sab).set(bytes);
  return sab;
}

export function unpackShared(sab) {
  return JSON.parse(decoder.decode(new Uint8Array(sab)));
}
