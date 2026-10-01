import { join } from "node:path";
import { readJsonFile, writeFileAtomic } from "../files.mjs";

export function loadManifest(dir) {
  return readJsonFile(
    join(dir, "manifest.json"),
    {},
    "Delete it, and the next export fetches the whole history of every channel and thread again.",
  );
}

export function saveManifest(dir, manifest) {
  writeFileAtomic(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

export async function fetchMessages(client, channelId, afterSnowflake) {
  const messages = [];

  if (afterSnowflake) {
    // Incremental: page forward from last-seen snowflake
    let after = afterSnowflake;
    while (true) {
      const batch = await client.request(`/channels/${channelId}/messages?limit=100&after=${after}`);
      if (!batch.length) break;
      messages.push(...batch);
      after = batch.reduce((max, m) => (BigInt(m.id) > BigInt(max) ? m.id : max), batch[0].id);
      if (batch.length < 100) break;
    }
  } else {
    // Full fetch: page backward from newest
    let before = null;
    while (true) {
      let path = `/channels/${channelId}/messages?limit=100`;
      if (before) path += `&before=${before}`;
      const batch = await client.request(path);
      if (!batch.length) break;
      messages.push(...batch);
      before = batch.reduce((min, m) => (BigInt(m.id) < BigInt(min) ? m.id : min), batch[0].id);
      if (batch.length < 100) break;
    }
  }

  messages.sort(bySnowflake);
  return messages;
}

// Chronological order (ascending snowflake), the order a target's file keeps.
function bySnowflake(a, b) {
  const d = BigInt(a.id) - BigInt(b.id);
  return d < 0n ? -1 : d > 0n ? 1 : 0;
}

/**
 * The messages a target's file already holds, followed by those fetched since,
 * in chronological order.  A fetched message whose id is already held is dropped.
 */
export function appendMessages(stored, fetched) {
  const ids = new Set(stored.map((m) => m.id));
  return [...stored, ...fetched.filter((m) => !ids.has(m.id))].sort(bySnowflake);
}

export function highestSnowflake(messages) {
  if (!messages.length) return null;
  return messages.reduce((max, m) => (BigInt(m.id) > BigInt(max) ? m.id : max), messages[0].id);
}
