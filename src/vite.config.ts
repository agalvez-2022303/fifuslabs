import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { getRequestListener } from '@hono/node-server'
import { composeApp } from '../backend/composition'

/**
 * Solo adapta HTTP Node: el routing, validación y servicios viven en la misma app Hono que Vercel.
 */
function localApiDevPlugin(): Plugin {
  return {
    name: 'local-api-dev-middleware',
    configureServer(server) {
      const app = composeApp(path.resolve(__dirname, '../data'))
      const listener = getRequestListener(app.fetch)
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api' && !req.url?.startsWith('/api/')) {
          return next()
        }
        void listener(req, res).catch(next)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localApiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
      '@physicslab/shared-types': path.resolve(__dirname, '../packages/shared-types/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Code-split por simulación para bundles pequeños en móviles
        manualChunks: id => {
          if (id.includes('simulations/constant-acceleration')) return 'sim-aceleracion'
          if (id.includes('simulations/three-forces')) return 'sim-fuerzas-equilibrio'
          if (id.includes('simulations/force-composition')) return 'sim-composicion'
          if (id.includes('simulations/vector-representation')) return 'sim-vector-representation'
          if (id.includes('node_modules/react-router-dom')) return 'router'
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
