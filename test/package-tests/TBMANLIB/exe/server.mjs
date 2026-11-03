// An HTTPS server on 127.0.0.1 for the cases of this folder: scripts/package_tests.mjs starts it and
// reads its port from the first line it prints. Its certificate fails every check a client can make,
// in one certificate: it expired in 2002, its authority is no one's, and it names another host. A
// client that takes the body it sends has checked none of them.
//
// The certificate is made here, on every run, so no private key is kept in the repository; Node makes
// keys and signatures, not certificates, so the certificate's DER is written by hand.

import { generateKeyPairSync, sign } from "node:crypto";
import { createServer } from "node:https";

const hex = (s) => Buffer.from(s, "hex");

function der(tag, ...parts) {
  const body = Buffer.concat(parts);
  const n = body.length;
  return Buffer.concat([Buffer.from([tag, ...(n < 128 ? [n] : n < 256 ? [0x81, n] : [0x82, n >> 8, n & 255])]), body]);
}
const sequence = (...parts) => der(0x30, ...parts);
const utcTime = (s) => der(0x17, Buffer.from(s));
// A name of one attribute, its common name (the object identifier 2.5.4.3).
const name = (cn) => sequence(der(0x31, sequence(hex("0603550403"), der(0x0c, Buffer.from(cn)))));

const ECDSA_WITH_SHA256 = sequence(hex("06082a8648ce3d040302"));

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const signed = sequence(
  der(0xa0, hex("020102")), // version 3
  hex("020101"), // serial number 1
  ECDSA_WITH_SHA256,
  name("An authority nobody trusts"),
  sequence(utcTime("010101000000Z"), utcTime("020101000000Z")),
  name("another-host.example"),
  publicKey.export({ type: "spki", format: "der" }),
);
const certificate = sequence(signed, ECDSA_WITH_SHA256, der(0x03, hex("00"), sign("sha256", signed, privateKey)));
const lines = certificate.toString("base64").match(/.{1,64}/g);

const server = createServer(
  {
    cert: `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----\n`,
    key: privateKey.export({ type: "pkcs8", format: "pem" }),
  },
  (_request, response) => response.end("the server's answer"),
);
server.listen(0, "127.0.0.1", () => console.log(server.address().port));
