import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export function loadManifest(dir) {
  const p = join(dir, 'manifest.json')
  if (!existsSync(p)) return {}
  return JSON.parse(readFileSync(p, 'utf-8'))
}

export function saveManifest(dir, manifest) {
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
}

export async function fetchMessages(client, channelId, afterSnowflake) {
  const messages = []

  if (afterSnowflake) {
    // Incremental: page forward from last-seen snowflake
    let after = afterSnowflake
    while (true) {
      const batch = await client.request(
        `/channels/${channelId}/messages?limit=100&after=${after}`,
      )
      if (!batch.length) break
      messages.push(...batch)
      after = batch.reduce(
        (max, m) => (BigInt(m.id) > BigInt(max) ? m.id : max),
        batch[0].id,
      )
      if (batch.length < 100) break
    }
  } else {
    // Full fetch: page backward from newest
    let before = null
    while (true) {
      let path = `/channels/${channelId}/messages?limit=100`
      if (before) path += `&before=${before}`
      const batch = await client.request(path)
      if (!batch.length) break
      messages.push(...batch)
      before = batch.reduce(
        (min, m) => (BigInt(m.id) < BigInt(min) ? m.id : min),
        batch[0].id,
      )
      if (batch.length < 100) break
    }
  }

  // Sort chronologically (ascending snowflake)
  messages.sort((a, b) => {
    const d = BigInt(a.id) - BigInt(b.id)
    return d < 0n ? -1 : d > 0n ? 1 : 0
  })

  return messages
}

export function highestSnowflake(messages) {
  if (!messages.length) return null
  return messages.reduce(
    (max, m) => (BigInt(m.id) > BigInt(max) ? m.id : max),
    messages[0].id,
  )
}
