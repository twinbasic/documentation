// Discord message types that carry user content
const TYPE_DEFAULT = 0
const TYPE_REPLY = 19

export function filterMessages(messages) {
  return messages.filter(m => m.type === TYPE_DEFAULT || m.type === TYPE_REPLY)
}

export function shouldSkipThread(filteredMessages) {
  if (filteredMessages.length <= 1) return true
  if (filteredMessages.every(m => m.author?.bot)) return true
  return false
}
