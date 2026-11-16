import { queryPackages, downloadPackage } from "./twinserv-client.mjs";
import { readPackageFiles } from "./package-files.mjs";

// TWINSERV lists a package's versions newest first, by its own rule: forliny's
// {CA836295-...} lists WinReg 1.0.1.1 before WinSysTray 1.0.2.0. The newest is the
// first listed, never the highest number and never the last.
function latestVersion(pkg) {
  return pkg.versions[0];
}

function versionString(v) {
  return `${v.versionMajor}.${v.versionMinor}.${v.versionRevision}.${v.versionBuild}`;
}

/** Every package TWINSERV lists publicly, each with its versions newest first. */
async function twinservListing() {
  return (await queryPackages()).public;
}

/** A package's `.twinpack`, as TWINSERV serves it, of the version `version` records. */
async function downloadTwinpack(projectId, version) {
  return downloadPackage(projectId, version);
}

/** The files of a `.twinpack`, as `buildApi` and `writeToStore` take them. */
function twinpackFiles(buffer) {
  return readPackageFiles(buffer);
}

export { downloadTwinpack, latestVersion, twinpackFiles, twinservListing, versionString };
