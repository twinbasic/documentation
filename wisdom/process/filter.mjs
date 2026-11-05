// Discord message types that carry user content
const TYPE_DEFAULT = 0;
const TYPE_REPLY = 19;
const TYPE_THREAD_STARTER = 21;

export function filterMessages(messages) {
  const kept = [];
  for (const m of messages) {
    if (m.type === TYPE_DEFAULT || m.type === TYPE_REPLY) kept.push(m);
    // A thread started from a text channel's message opens with a stub, and that
    // message is its referenced_message, or null once it has been deleted.
    else if (m.type === TYPE_THREAD_STARTER && m.referenced_message) kept.push(m.referenced_message);
  }
  return kept;
}

export function shouldSkipThread(filteredMessages) {
  if (filteredMessages.length <= 1) return true;
  if (filteredMessages.every((m) => m.author?.bot)) return true;
  return false;
}
