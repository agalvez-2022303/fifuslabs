import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import pool from './db.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    return res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    console.error('No se pudo comprobar la conexión a PostgreSQL:', error)
    return res.status(503).json({ status: 'error', database: 'disconnected' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.use((error, _req, res, _next) => {
  console.error('Error en la API:', error)
  return res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(port, () => {
  console.log(`API de FísicaLab disponible en http://localhost:${port}`)
})
