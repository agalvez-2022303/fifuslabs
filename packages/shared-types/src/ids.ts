/**
 * Deterministic, browser-safe UUID generator.
 *
 * Used by the public fallback registry to give legacy static content stable
 * identities (React keys, list rendering). It must stay dependency-free: the
 * frontend bundles this module, so `node:crypto` is not available here.
 *
 * These ids are stable per topic and element but are NOT required to match the
 * records stored in PostgreSQL; the API assigns its own UUIDs on write.
 */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function fallbackUuid(key: string): string {
  // Two FNV-1a passes with different offsets give enough spread for stable keys.
  const fnv = (seed: number, salt: number) => {
    let hash = seed >>> 0
    for (let index = 0; index < key.length; index++) {
      hash ^= key.charCodeAt(index) + salt
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash >>> 0
  }
  const chunks = [0, 4, 8, 12].map(offset =>
    (fnv(0x811c9dc5 ^ offset, offset) >>> 0).toString(16).padStart(8, '0')
  )
  const hex = chunks.join('').padEnd(32, '0').slice(0, 32)
  const variant = '89ab'[parseInt(hex.slice(16, 18), 16) & 0x3]
  const id = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-')
  // Defensive: never hand a malformed id to a schema that validates UUIDs.
  if (!UUID_V4.test(id)) throw new Error(`fallbackUuid produjo un id inválido para: ${key}`)
  return id
}
