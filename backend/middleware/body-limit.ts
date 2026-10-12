import type { MiddlewareHandler } from 'hono'
import { PayloadTooLargeError } from '../errors'
import type { AppEnv } from '../http-types'

export const MAX_BODY_BYTES = 256 * 1024
export const bodyLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const length = Number(c.req.header('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) throw new PayloadTooLargeError()
  const reader = c.req.raw.body?.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  if (reader) {
    try {
      let reading = true
      while (reading) {
        const { done, value } = await reader.read()
        if (done) {
          reading = false
          continue
        }
        size += value.byteLength
        if (size > MAX_BODY_BYTES) {
          await reader.cancel()
          throw new PayloadTooLargeError()
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  c.set('rawBody', new TextDecoder().decode(bytes))
  await next()
}
