import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Never let a developer's .env redirect automated tests to the real Supabase project.
    env: { CONTENT_REPOSITORY: 'json', DEV_AUTH: 'false' },
  },
})
