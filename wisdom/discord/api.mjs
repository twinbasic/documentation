import { setTimeout as sleep } from 'node:timers/promises'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_BASE = 'https://discord.com/api/v10'
const DISCORD_EPOCH = 1420070400000n

export const EXIT_CAP_REACHED = 2

export function snowflakeToTimestamp(snowflake) {
  return Number((BigInt(snowflake) >> 22n) + DISCORD_EPOCH)
}

export function timestampToSnowflake(ms) {
  return String((BigInt(ms) - DISCORD_EPOCH) << 22n)
}

export class CapReachedError extends Error {
  constructor(count, cap) {
    super(`Session query cap reached (${count}/${cap})`)
    this.count = count
    this.cap = cap
  }
}

export async function createClient(config) {
  let token = process.env.DISCORD_TOKEN
  if (!token) {
    const tokenPath = join(__dirname, '..', '.token')
    if (existsSync(tokenPath)) {
      token = readFileSync(tokenPath, 'utf-8')
        .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))[0] || ''
    }
  }
  if (!token) throw new Error('Set DISCORD_TOKEN or create wisdom/.token')

  let tier = 'user'
  let limits = config.limits.user
  let queryCount = 0
  let authHeader = null
  let lastRequestTime = 0
  const buckets = new Map()

  // Detect token type by probing /users/@me with Bot prefix first (recommended path).
  // If that fails, fall back to bare token (user-token auth).
  const botRes = await fetch(`${API_BASE}/users/@me`, {
    headers: { 'Authorization': `Bot ${token}` },
  })
  queryCount++

  if (botRes.ok) {
    const me = await botRes.json()
    authHeader = `Bot ${token}`
    if (me.bot) {
      tier = 'bot'
      limits = config.limits.bot
      process.stderr.write(`[wisdom] Bot token (${me.username}); bot-tier limits\n`)
    } else {
      process.stderr.write(`[wisdom] Authenticated as ${me.username}\n`)
    }
  } else {
    const userRes = await fetch(`${API_BASE}/users/@me`, {
      headers: { 'Authorization': token },
    })
    queryCount++
    if (userRes.ok) {
      const me = await userRes.json()
      authHeader = token
      process.stderr.write(`[wisdom] User token (${me.username}); user-tier limits\n`)
    } else {
      throw new Error('Authentication failed — verify DISCORD_TOKEN')
    }
  }

  async function enforceRateLimit() {
    const now = Date.now()
    const interval = 1000 / limits.requests_per_second
    const elapsed = now - lastRequestTime
    if (elapsed < interval) {
      let delay = interval - elapsed
      if (tier === 'user') delay *= 0.8 + Math.random() * 0.4
      await sleep(delay)
    }
    lastRequestTime = Date.now()
  }

  async function request(path) {
    if (queryCount >= limits.session_query_cap) {
      throw new CapReachedError(queryCount, limits.session_query_cap)
    }

    await enforceRateLimit()

    const route = path.split('?')[0]
    const bucket = buckets.get(route)
    if (bucket && bucket.remaining === 0) {
      const wait = bucket.resetAt - Date.now()
      if (wait > 0) {
        process.stderr.write(`[wisdom] Bucket wait ${(wait / 1000).toFixed(1)}s\n`)
        await sleep(wait)
      }
    }

    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Authorization': authHeader },
    })

    const hdrRemaining = res.headers.get('x-ratelimit-remaining')
    const hdrResetAfter = res.headers.get('x-ratelimit-reset-after')
    if (hdrRemaining !== null) {
      buckets.set(route, {
        remaining: parseInt(hdrRemaining, 10),
        resetAt: Date.now() + parseFloat(hdrResetAfter || '0') * 1000,
      })
    }

    if (res.status === 429) {
      const body = await res.json()
      const retryAfter = body.retry_after || 1
      process.stderr.write(`[wisdom] 429 — retrying in ${retryAfter}s\n`)
      await sleep(retryAfter * 1000)
      return request(path)
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Discord API ${res.status} ${path}: ${text}`)
    }

    queryCount++
    return res.json()
  }

  return {
    request,
    get queryCount() { return queryCount },
    get tier() { return tier },
    get sessionCap() { return limits.session_query_cap },
  }
}
