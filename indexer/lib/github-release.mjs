const RELEASES_URL = 'https://api.github.com/repos/twinbasic/twinbasic/releases';

async function getLatestRelease() {
  const res = await fetch(RELEASES_URL, {
    headers: { 'Accept': 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const releases = await res.json();
  if (!Array.isArray(releases) || releases.length === 0)
    throw new Error('GitHub API returned no releases');

  const release = releases[0];
  const asset = release.assets?.find(a => a.name.endsWith('.zip'));
  if (!asset) throw new Error(`No .zip asset in release ${release.tag_name}`);

  return {
    tag: release.tag_name,
    assetUrl: asset.browser_download_url,
    publishedAt: release.published_at,
  };
}

async function downloadRelease(assetUrl) {
  const res = await fetch(assetUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

export { getLatestRelease, downloadRelease };
