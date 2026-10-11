import { Router } from 'express'
import pool from '../db.js'

const router = Router()

router.get('/resumen', async (_req, res) => {
  const [statsResult, topicsResult, statesResult, recentResult, pendingResult, draftsResult] =
    await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM area) AS areas_total,
          (SELECT COUNT(*) FROM temas) AS temas_total,
          (SELECT COUNT(*) FROM temas WHERE estado = 'borrador') AS temas_borrador,
          (SELECT COUNT(*) FROM teoria) AS teoria_total,
          (SELECT COUNT(*) FROM teoria WHERE estado = 'borrador') AS teoria_borrador,
          (SELECT COUNT(*) FROM formulas) AS formulas_total,
          (SELECT COUNT(*) FROM formulas WHERE estado = 'borrador') AS formulas_borrador,
          (SELECT COUNT(*) FROM glosario) AS glosario_total,
          (SELECT COUNT(*) FROM glosario WHERE estado = 'borrador') AS glosario_borrador,
          (SELECT COUNT(*) FROM ejercicios) AS ejercicios_total,
          (SELECT COUNT(*) FROM ejercicios WHERE estado = 'borrador') AS ejercicios_borrador
      `),
      pool.query(`
        SELECT id_tema, titulo, slug, area, nivel, estado,
               total_teoria, total_formulas, total_glosario, total_ejercicios
        FROM vw_temas_resumen
        ORDER BY titulo
      `),
      pool.query(`
        SELECT estado, COUNT(*) AS total
        FROM (
          SELECT estado FROM temas
          UNION ALL SELECT estado FROM teoria
          UNION ALL SELECT estado FROM formulas
          UNION ALL SELECT estado FROM glosario
          UNION ALL SELECT estado FROM ejercicios
        ) AS contenido
        WHERE estado IN ('publicado', 'borrador', 'archivado')
        GROUP BY estado
      `),
      pool.query(
        `SELECT tipo, titulo, tema, estado, fecha_actualizacion
         FROM (
           SELECT 'Tema' AS tipo, t.titulo, t.titulo AS tema, t.estado, t.fecha_actualizacion
           FROM temas t
           UNION ALL
           SELECT 'Teoría', x.titulo, t.titulo, x.estado, x.fecha_actualizacion
           FROM teoria x JOIN temas t ON t.id_tema = x.id_tema
           UNION ALL
           SELECT 'Fórmula', x.titulo, t.titulo, x.estado, x.fecha_actualizacion
           FROM formulas x JOIN temas t ON t.id_tema = x.id_tema
           UNION ALL
           SELECT 'Glosario', x.termino, t.titulo, x.estado, x.fecha_actualizacion
           FROM glosario x JOIN temas t ON t.id_tema = x.id_tema
           UNION ALL
           SELECT 'Ejercicio', x.titulo, t.titulo, x.estado, x.fecha_actualizacion
           FROM ejercicios x JOIN temas t ON t.id_tema = x.id_tema
         ) AS cambios
         ORDER BY fecha_actualizacion DESC
         LIMIT $1`,
        [8]
      ),
      pool.query(`
        SELECT id_tema, titulo, area, estado,
               total_formulas = 0 AS sin_formulas,
               total_glosario = 0 AS sin_glosario,
               total_ejercicios = 0 AS sin_ejercicios
        FROM vw_temas_resumen
        WHERE total_formulas = 0
           OR total_glosario = 0
           OR total_ejercicios = 0
        ORDER BY titulo
      `),
      pool.query(`
        SELECT COUNT(*) AS total
        FROM (
          SELECT estado FROM temas
          UNION ALL SELECT estado FROM teoria
          UNION ALL SELECT estado FROM formulas
          UNION ALL SELECT estado FROM glosario
          UNION ALL SELECT estado FROM ejercicios
        ) AS contenido
        WHERE estado = 'borrador'
      `),
    ])

  const stats = statsResult.rows[0]
  const count = value => Number(value)
  const statistic = (name, draftName = null) => ({
    total: count(stats[`${name}_total`]),
    drafts: draftName ? count(stats[draftName]) : null,
  })
  const contentStatus = { publicado: 0, borrador: 0, archivado: 0 }
  for (const row of statesResult.rows) {
    contentStatus[row.estado] = count(row.total)
  }

  return res.json({
    stats: {
      areas: statistic('areas'),
      temas: statistic('temas', 'temas_borrador'),
      teoria: statistic('teoria', 'teoria_borrador'),
      formulas: statistic('formulas', 'formulas_borrador'),
      glosario: statistic('glosario', 'glosario_borrador'),
      ejercicios: statistic('ejercicios', 'ejercicios_borrador'),
    },
    topics: topicsResult.rows.map(row => ({
      ...row,
      total_teoria: count(row.total_teoria),
      total_formulas: count(row.total_formulas),
      total_glosario: count(row.total_glosario),
      total_ejercicios: count(row.total_ejercicios),
    })),
    contentStatus,
    latestChanges: recentResult.rows,
    pendings: {
      topics: pendingResult.rows,
      draftContentCount: count(draftsResult.rows[0].total),
    },
  })
})

export default router
