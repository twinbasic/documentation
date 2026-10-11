const BASE_URL = 'https://www.everythingaccess.com/twinbasic/packages';

async function queryPackages() {
  const res = await fetch(`${BASE_URL}/query?auth=`);
  if (!res.ok) throw new Error(`queryPackages failed: HTTP ${res.status}`);
  return res.json();
}

async function downloadPackage(projectId, version) {
  const params = new URLSearchParams({
    auth: '',
    id: projectId,
    versionMajor: String(version.versionMajor),
    versionMinor: String(version.versionMinor),
    versionRevision: String(version.versionRevision),
    versionBuild: String(version.versionBuild),
  });
  const res = await fetch(`${BASE_URL}/download?${params}`);
  if (!res.ok) throw new Error(`downloadPackage failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export { queryPackages, downloadPackage };
