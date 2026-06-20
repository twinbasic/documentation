const TYPE_TEXT = 0
const TYPE_FORUM = 15
const TYPE_MAP = { text: TYPE_TEXT, forum: TYPE_FORUM }

function shouldInclude(channel, config, explicitIds) {
  if (explicitIds?.length) return explicitIds.includes(channel.id)

  const allowed = (config.channels.include_types || ['text', 'forum']).map(t => TYPE_MAP[t])
  if (!allowed.includes(channel.type)) return false
  if (config.channels.exclude_ids?.includes(channel.id)) return false

  for (const pat of config.channels.exclude_patterns || []) {
    if (new RegExp(pat, 'i').test(channel.name)) return false
  }
  return true
}

export async function discoverChannels(client, config, explicitIds) {
  const guildId = config.guild_id

  // Step 1 — full channel list (kept unfiltered for guild.json / Phase 2 tag resolution)
  const allChannels = await client.request(`/guilds/${guildId}/channels`)
  const included = allChannels.filter(c => shouldInclude(c, config, explicitIds))
  const textChannels = included.filter(c => c.type === TYPE_TEXT)
  const forumChannels = included.filter(c => c.type === TYPE_FORUM)
  process.stderr.write(
    `[wisdom] Channels: ${textChannels.length} text, ${forumChannels.length} forum\n`,
  )

  // Step 2 — active threads (guild-wide endpoint; bot-only, skipped for user tokens)
  const forumIds = new Set(forumChannels.map(c => c.id))
  let activeThreads = []
  try {
    const activeData = await client.request(`/guilds/${guildId}/threads/active`)
    activeThreads = (activeData.threads || []).filter(t => forumIds.has(t.parent_id))
    process.stderr.write(`[wisdom] Active threads: ${activeThreads.length}\n`)
  } catch (err) {
    if (/403/.test(err.message)) {
      process.stderr.write('[wisdom] Active threads endpoint unavailable (user token); skipping\n')
    } else {
      throw err
    }
  }

  // Step 3 — archived threads (per forum channel, paginated)
  const archivedThreads = []
  for (const forum of forumChannels) {
    try {
      let before = null
      while (true) {
        let path = `/channels/${forum.id}/threads/archived/public?limit=100`
        if (before) path += `&before=${encodeURIComponent(before)}`
        const data = await client.request(path)
        const batch = data.threads || []
        archivedThreads.push(...batch)
        if (!data.has_more || !batch.length) break
        before = batch[batch.length - 1].thread_metadata?.archive_timestamp
        if (!before) break
      }
    } catch (err) {
      if (/403/.test(err.message)) {
        process.stderr.write(`[wisdom] No access to #${forum.name}; skipping\n`)
      } else {
        throw err
      }
    }
  }
  process.stderr.write(`[wisdom] Archived threads: ${archivedThreads.length}\n`)

  // Deduplicate (a thread could appear in both active and archived lists)
  const seen = new Set()
  const threads = []
  for (const t of [...activeThreads, ...archivedThreads]) {
    if (seen.has(t.id)) continue
    seen.add(t.id)
    threads.push(t)
  }

  // Filter by minimum message count
  const minCount = config.threads?.min_message_count ?? 2
  const filtered = threads.filter(t => (t.message_count ?? 0) >= minCount)
  const skipped = threads.length - filtered.length
  if (skipped) {
    process.stderr.write(`[wisdom] Skipped ${skipped} threads below ${minCount}-message threshold\n`)
  }

  return { allChannels, textChannels, forumChannels, threads: filtered }
}

export async function fetchMembers(client, guildId) {
  const members = {}
  let after = '0'
  try {
    while (true) {
      const batch = await client.request(
        `/guilds/${guildId}/members?limit=1000&after=${after}`,
      )
      if (!batch.length) break
      for (const m of batch) {
        members[m.user.id] = {
          username: m.user.username,
          global_name: m.user.global_name || null,
          nick: m.nick || null,
        }
      }
      after = batch[batch.length - 1].user.id
      if (batch.length < 1000) break
    }
  } catch (err) {
    if (/403/.test(err.message)) {
      process.stderr.write('[wisdom] Members endpoint unavailable (missing access); skipping\n')
      return members
    }
    throw err
  }
  process.stderr.write(`[wisdom] Members: ${Object.keys(members).length}\n`)
  return members
}
