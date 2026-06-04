import { snowflakeToTimestamp } from '../discord/api.mjs'
import { highestSnowflake } from '../discord/messages.mjs'

export function buildFrontmatter(thread, messages, tagMap, channelMap) {
  const channel = channelMap[thread.parent_id]
  const starter = messages[0]

  const tags = (thread.applied_tags || [])
    .map(id => tagMap[id])
    .filter(Boolean)
    .sort()

  const created = normalizeTimestamp(
    thread.thread_metadata?.create_timestamp || snowflakeToTimestamp(thread.id),
  )

  const archived = thread.thread_metadata?.archived
    ? normalizeTimestamp(thread.thread_metadata.archive_timestamp)
    : null

  const starterReactions = aggregateReactions(starter ? [starter] : [])
  const topReactions = aggregateReactions(messages)

  const fm = {
    thread_id: thread.id,
    title: thread.name || '',
    channel: channel?.name || 'unknown',
    channel_id: thread.parent_id || '',
    tags,
    created,
  }
  if (archived) fm.archived = archived
  fm.message_count = messages.length
  // Phase 3 watermark: highest snowflake among the messages.  Monotonic and
  // time-encoded, stable across filesystem operations that would invalidate
  // an mtime watermark (git checkout, cross-platform clones, OneDrive sync,
  // etc.).  Paired with message_count to catch deletions of the most recent
  // message (where the snowflake regresses).
  const lastMessageId = highestSnowflake(messages)
  if (lastMessageId) fm.last_message_id = lastMessageId
  fm.reply_count = Math.max(0, messages.length - 1)
  if (Object.keys(starterReactions).length) fm.starter_reactions = starterReactions
  if (Object.keys(topReactions).length) fm.top_reactions = topReactions
  fm.has_answer = tags.includes('Answered')

  return fm
}

export function serializeFrontmatter(fm) {
  const lines = ['---']

  lines.push(`thread_id: ${quote(fm.thread_id)}`)
  lines.push(`title: ${quote(fm.title)}`)
  lines.push(`channel: ${quote(fm.channel)}`)
  lines.push(`channel_id: ${quote(fm.channel_id)}`)
  lines.push(`tags: [${fm.tags.map(quote).join(', ')}]`)
  lines.push(`created: ${quote(fm.created)}`)
  if (fm.archived) lines.push(`archived: ${quote(fm.archived)}`)
  lines.push(`message_count: ${fm.message_count}`)
  if (fm.last_message_id) lines.push(`last_message_id: ${quote(fm.last_message_id)}`)
  lines.push(`reply_count: ${fm.reply_count}`)
  if (fm.starter_reactions) {
    lines.push('starter_reactions:')
    for (const [emoji, count] of Object.entries(fm.starter_reactions)) {
      lines.push(`  ${quote(emoji)}: ${count}`)
    }
  }
  if (fm.top_reactions) {
    lines.push('top_reactions:')
    for (const [emoji, count] of Object.entries(fm.top_reactions)) {
      lines.push(`  ${quote(emoji)}: ${count}`)
    }
  }
  lines.push(`has_answer: ${fm.has_answer}`)
  lines.push('---')

  return lines.join('\n')
}

export function buildChannelFrontmatter(channel, messages) {
  const topReactions = aggregateReactions(messages)

  const fm = {
    channel_id: channel.id,
    title: channel.name || '',
    message_count: messages.length,
  }
  if (Object.keys(topReactions).length) fm.top_reactions = topReactions

  return fm
}

export function serializeChannelFrontmatter(fm) {
  const lines = ['---']
  lines.push(`channel_id: ${quote(fm.channel_id)}`)
  lines.push(`title: ${quote(fm.title)}`)
  lines.push(`message_count: ${fm.message_count}`)
  if (fm.top_reactions) {
    lines.push('top_reactions:')
    for (const [emoji, count] of Object.entries(fm.top_reactions)) {
      lines.push(`  ${quote(emoji)}: ${count}`)
    }
  }
  lines.push('---')
  return lines.join('\n')
}

function quote(v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  const s = String(v)
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function normalizeTimestamp(input) {
  if (!input) return null
  const d = typeof input === 'number' ? new Date(input) : new Date(input)
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function aggregateReactions(messages) {
  const totals = {}
  for (const msg of messages) {
    for (const r of msg.reactions || []) {
      const name = r.emoji?.name
      if (!name) continue
      totals[name] = (totals[name] || 0) + r.count
    }
  }
  return Object.fromEntries(
    Object.entries(totals).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  )
}
