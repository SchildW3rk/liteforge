import { liteforgeServer, type InferServerApi } from '@liteforge/server'
import { greetingsModule } from './greetings.server.js'

export const api = liteforgeServer({
  modules: {
    greetings: greetingsModule,
  },
})

export type Api = InferServerApi<typeof api>
