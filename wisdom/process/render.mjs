export function renderMessages(messages, members) {
  const msgMap = new Map(messages.map(m => [m.id, m]))
  const blocks = []

  for (const msg of messages) {
    const name = resolveDisplayName(msg.author, members)
    const ts = formatTimestamp(msg.timestamp)
    const lines = []

    const ref = msg.message_reference
    if (ref?.message_id && msgMap.has(ref.message_id)) {
      const parent = msgMap.get(ref.message_id)
      const parentName = resolveDisplayName(parent.author, members)
      lines.push(`**${name}** _${ts}_ ↩ replying to **${parentName}**`)
      lines.push('')
      const snippet = truncate(parent.content || '', 120)
      if (snippet) {
        lines.push(`> ${snippet}`)
        lines.push('')
      }
    } else {
      lines.push(`**${name}** _${ts}_`)
      lines.push('')
    }

    if (msg.content) {
      lines.push(msg.content)
      lines.push('')
    }

    if (msg.attachments?.length) {
      for (const att of msg.attachments) {
        lines.push(`[attachment: ${att.filename}]`)
      }
      lines.push('')
    }

    const rxParts = (msg.reactions || [])
      .filter(r => r.count >= 1 && r.emoji?.name)
      .map(r => `${r.emoji.name}×${r.count}`)
    if (rxParts.length) {
      lines.push(`> ${rxParts.join('  ')}`)
      lines.push('')
    }

    blocks.push(lines.join('\n'))
  }

  return blocks.join('\n')
}

function resolveDisplayName(author, members) {
  if (!author) return 'Unknown'
  const m = members[author.id]
  if (m) return m.nick || m.global_name || m.username || author.username || 'Unknown'
  return author.global_name || author.username || 'Unknown'
}

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function truncate(text, maxLen) {
  const line = text.split('\n')[0]
  if (line.length <= maxLen) return line
  return line.slice(0, maxLen) + '…'
}
