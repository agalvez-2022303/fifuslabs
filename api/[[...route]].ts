import { getRequestListener } from '@hono/node-server'
import { app } from '../backend/composition'

// Node HTTP adapter for Vercel Functions; Vite uses this same app.fetch.
// Keep raw bodies for the streaming size limit / generic JSON validator.
export const config = { api: { bodyParser: false } }
export default getRequestListener(app.fetch)
