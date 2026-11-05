import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.mjs";
import { snowflakeToTimestamp } from "../discord/api.mjs";
import { slugify } from "./slugify.mjs";
import { filterMessages, shouldSkipThread } from "./filter.mjs";
import {
  buildFrontmatter,
  serializeFrontmatter,
  buildChannelFrontmatter,
  serializeChannelFrontmatter,
} from "./frontmatter.mjs";
import { renderMessages } from "./render.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runProcess(flags) {
  const inDir = flags.in || join(__dirname, "..", "data", "raw");
  const outDir = flags.out || join(__dirname, "..", "data", "threads");

  const guildPath = join(inDir, "guild.json");
  if (!existsSync(guildPath)) {
    process.stderr.write("[wisdom] guild.json not found — run export first\n");
    process.exit(2);
  }
  const channels = JSON.parse(readFileSync(guildPath, "utf-8"));
  const { tagMap, channelMap } = buildLookups(channels);

  const membersPath = join(inDir, "members.json");
  const members = existsSync(membersPath) ? JSON.parse(readFileSync(membersPath, "utf-8")) : {};

  const threadsDir = join(inDir, "threads");
  if (!existsSync(threadsDir)) {
    process.stderr.write("[wisdom] No threads directory found — run export first\n");
    process.exit(2);
  }

  const files = readdirSync(threadsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const sinceMs = flags.since ? Date.parse(flags.since) : null;

  let processed = 0,
    skipped = 0,
    upToDate = 0;

  for (const file of files) {
    const inPath = join(threadsDir, file);
    const raw = JSON.parse(readFileSync(inPath, "utf-8"));
    const thread = raw.thread;
    if (!thread) {
      skipped++;
      continue;
    }

    if (flags.channels?.length && !flags.channels.includes(thread.parent_id)) {
      skipped++;
      continue;
    }

    if (sinceMs) {
      const createdMs = thread.thread_metadata?.create_timestamp
        ? Date.parse(thread.thread_metadata.create_timestamp)
        : snowflakeToTimestamp(thread.id);
      if (createdMs < sinceMs) {
        skipped++;
        continue;
      }
    }

    const channelName = channelMap[thread.parent_id]?.name || "unknown";
    const slug = slugify(thread.name);
    const outPath = join(outDir, channelName, `${thread.id}--${slug}.md`);

    if (!flags.force && existsSync(outPath)) {
      if (statSync(outPath).mtimeMs >= statSync(inPath).mtimeMs) {
        upToDate++;
        continue;
      }
    }

    const filtered = filterMessages(raw.messages || []);
    if (shouldSkipThread(filtered)) {
      skipped++;
      continue;
    }

    const fm = buildFrontmatter(thread, filtered, tagMap, channelMap);
    const body = renderMessages(filtered, members);
    const output = serializeFrontmatter(fm) + "\n\n" + body;

    mkdirSync(join(outDir, channelName), { recursive: true });
    writeFileSync(outPath, output);
    processed++;
  }

  // Process text channels
  const unmined = new Set(loadConfig(flags).process?.unmined_channels || []);
  const channelsDir = join(inDir, "channels");
  if (existsSync(channelsDir)) {
    const channelFiles = readdirSync(channelsDir)
      .filter((f) => f.endsWith(".json"))
      .sort();

    for (const file of channelFiles) {
      const inPath = join(channelsDir, file);
      const raw = JSON.parse(readFileSync(inPath, "utf-8"));
      const channel = raw.channel;
      if (!channel) {
        skipped++;
        continue;
      }

      if (flags.channels?.length && !flags.channels.includes(channel.id)) {
        skipped++;
        continue;
      }

      if (sinceMs) {
        if (snowflakeToTimestamp(channel.id) < sinceMs) {
          skipped++;
          continue;
        }
      }

      const outPath = join(outDir, `${channel.name}.md`);
      const filtered = filterMessages(raw.messages || []);
      const months = unmined.has(channel.name) ? [] : channelMonths(channel, filtered, outDir);

      const current = (p) => existsSync(p) && statSync(p).mtimeMs >= statSync(inPath).mtimeMs;
      if (!flags.force && [outPath, ...months.map((m) => m.path)].every(current)) {
        upToDate++;
        continue;
      }

      if (!filtered.length) {
        skipped++;
        continue;
      }
      if (filtered.every((m) => m.author?.bot)) {
        skipped++;
        continue;
      }

      const fm = buildChannelFrontmatter(channel, filtered);
      const body = renderMessages(filtered, members);
      const output = serializeChannelFrontmatter(fm) + "\n\n" + body;

      mkdirSync(outDir, { recursive: true });
      writeFileSync(outPath, output);
      processed++;

      for (const month of months) {
        const monthFm = buildFrontmatter(month.thread, month.messages, tagMap, channelMap);
        const monthBody = renderMessages(month.messages, members, filtered);
        mkdirSync(dirname(month.path), { recursive: true });
        writeFileSync(month.path, serializeFrontmatter(monthFm) + "\n\n" + monthBody);
        processed++;
      }
    }
  }

  process.stderr.write(`[wisdom] Process done — ${processed} written, ${skipped} skipped, ${upToDate} up-to-date\n`);
}

// A text channel as the extract step reads it: one file per calendar month, in
// the channel's folder and shaped like a thread, so that its watermark, its
// state and its merge are a thread's.
function channelMonths(channel, messages, outDir) {
  const byMonth = new Map();
  for (const m of messages) {
    const month = m.timestamp.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(m);
  }
  return [...byMonth].map(([month, kept]) => {
    const id = `${channel.id}-${month}`;
    const name = `#${channel.name} ${month}`;
    return {
      path: join(outDir, channel.name, `${id}--${slugify(name)}.md`),
      thread: { id, name, parent_id: channel.id, thread_metadata: { create_timestamp: kept[0].timestamp } },
      messages: kept,
    };
  });
}

function buildLookups(channels) {
  const channelMap = {};
  const tagMap = {};
  for (const ch of channels) {
    channelMap[ch.id] = ch;
    if (ch.available_tags) {
      for (const tag of ch.available_tags) {
        tagMap[tag.id] = tag.name;
      }
    }
  }
  return { channelMap, tagMap };
}
