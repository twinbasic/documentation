import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function stripJsonComments(text) {
  let result = ''
  let i = 0
  let inString = false
  let escaped = false
  while (i < text.length) {
    if (inString) {
      result += text[i]
      if (escaped) escaped = false
      else if (text[i] === '\\') escaped = true
      else if (text[i] === '"') inString = false
      i++
    } else if (text[i] === '"') {
      inString = true
      result += text[i++]
    } else if (text[i] === '/' && text[i + 1] === '/') {
      i += 2
      while (i < text.length && text[i] !== '\n') i++
    } else if (text[i] === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
    } else {
      result += text[i++]
    }
  }
  return result
}

export function loadConfig(cliFlags = {}) {
  const raw = readFileSync(join(__dirname, 'config.jsonc'), 'utf-8')
  const config = JSON.parse(stripJsonComments(raw))

  if (cliFlags.guild) config.guild_id = cliFlags.guild
  if (cliFlags.concurrency != null) config.export.concurrency = Number(cliFlags.concurrency)
  if (cliFlags.rateLimit != null) config.limits._rateLimit = Number(cliFlags.rateLimit)
  if (cliFlags.cap != null) config.limits._cap = Number(cliFlags.cap)
  if (cliFlags.out) config.export.out = cliFlags.out

  if (!config.guild_id) {
    const envGuild = process.env.DISCORD_GUILD_ID
    if (envGuild) config.guild_id = envGuild
    else throw new Error('Guild ID required: set guild_id in config.jsonc, pass --guild, or set DISCORD_GUILD_ID')
  }

  return config
}
