import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/**
 * Middleware de desarrollo para servir endpoints /api directamente desde data/
 * evitando errores ECONNREFUSED cuando no se ejecuta un backend serverless separado.
 */
function localApiDevPlugin(): Plugin {
  return {
    name: 'local-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          return next()
        }

        const dataDir = path.resolve(__dirname, '../data')
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname

        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')

        // 1. /api/categories
        if (pathname === '/api/categories') {
          const file = path.join(dataDir, 'categories.json')
          if (fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
            res.statusCode = 200
            return res.end(JSON.stringify({ data, total: data.length }))
          }
        }

        // 2. /api/simulations o /api/simulations/:slug
        if (pathname.startsWith('/api/simulations')) {
          const parts = pathname.split('/').filter(Boolean)
          const file = path.join(dataDir, 'simulations.json')
          if (fs.existsSync(file)) {
            const sims = JSON.parse(fs.readFileSync(file, 'utf-8'))
            if (parts.length === 2) {
              res.statusCode = 200
              return res.end(JSON.stringify({ data: sims, total: sims.length }))
            } else if (parts.length === 3) {
              const slug = parts[2]
              const found = sims.find((s: { slug: string }) => s.slug === slug)
              if (found) {
                res.statusCode = 200
                return res.end(JSON.stringify({ data: found }))
              } else {
                res.statusCode = 404
                return res.end(JSON.stringify({ error: 'Simulación no encontrada' }))
              }
            }
          }
        }

        // 3. /api/content/:slug
        if (pathname.startsWith('/api/content')) {
          const parts = pathname.split('/').filter(Boolean)
          if (parts.length === 3) {
            const slug = parts[2]
            const file = path.join(dataDir, 'content', `${slug}.json`)
            if (fs.existsSync(file)) {
              const content = JSON.parse(fs.readFileSync(file, 'utf-8'))
              res.statusCode = 200
              return res.end(JSON.stringify({ data: content }))
            } else {
              res.statusCode = 404
              return res.end(JSON.stringify({ error: 'Contenido no encontrado' }))
            }
          }
        }

        next()
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
