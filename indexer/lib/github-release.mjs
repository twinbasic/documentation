const RELEASES_URL = "https://api.github.com/repos/twinbasic/twinbasic/releases";

// What the indexer needs of a release: its tag, the URL of its zip and its date.
function releaseOf(release) {
  const asset = release.assets?.find((a) => a.name.endsWith(".zip"));
  if (!asset) throw new Error(`No .zip asset in release ${release.tag_name}`);
  return {
    tag: release.tag_name,
    assetUrl: asset.browser_download_url,
    publishedAt: release.published_at,
  };
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText} (${url})`);
  return res.json();
}

async function getLatestRelease() {
  const releases = await getJson(RELEASES_URL);
  if (!Array.isArray(releases) || releases.length === 0) throw new Error("GitHub API returned no releases");
  return releaseOf(releases[0]);
}

/** The release of one build, by its tag (`beta-x-1042`), for a package pinned at it. */
async function getReleaseByTag(tag) {
  return releaseOf(await getJson(`${RELEASES_URL}/tags/${encodeURIComponent(tag)}`));
}

async function downloadRelease(assetUrl) {
  const res = await fetch(assetUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

export { getLatestRelease, getReleaseByTag, downloadRelease };
