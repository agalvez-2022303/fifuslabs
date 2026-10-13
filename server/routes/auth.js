import { Router } from 'express'
import pool from '../db.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { correo, password } = req.body ?? {}

  if (
    typeof correo !== 'string' ||
    typeof password !== 'string' ||
    !correo.trim() ||
    !password
  ) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' })
  }

  const result = await pool.query(
    `SELECT id_usuario, nombre, correo, rol, password_hash
     FROM usuario
     WHERE LOWER(correo) = LOWER($1)
     LIMIT 1`,
    [correo.trim()]
  )
  const user = result.rows[0]

  // TODO: reemplazar por bcrypt.compare y emitir JWT
  if (!user || password !== user.password_hash) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
  }

  if (user.rol !== 'admin') {
    return res.status(403).json({ error: 'No tienes permisos de administrador' })
  }

  // TODO: reemplazar por bcrypt.compare y emitir JWT
  return res.json({
    id_usuario: user.id_usuario,
    nombre: user.nombre,
    correo: user.correo,
    rol: user.rol,
  })
})

export default router
