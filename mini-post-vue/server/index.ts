import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { createStore } from './store.ts'

const port = Number(process.env.PORT ?? 8787)
const app = createApp({ store: createStore() })

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`)
})
