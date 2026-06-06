// routes/pagina_artista.js
const express = require('express');
const router = express.Router();
const pool = require('../utils/database');
const responses = require('../utils/responses');

async function requireElite(req, res, next) {
  const correo = req.body.correo || req.query.correo || req.get('x-user-email');
  if (!correo) return responses.unauthorized(res, 'Usuario no autenticado');
  try {
    const r = await pool.query('SELECT id_usuario, tipo_plan, rol FROM usuario WHERE correo = $1', [correo]);
    if (r.rowCount === 0) return responses.notFound(res, 'Usuario');
    const u = r.rows[0];
    if (u.tipo_plan !== 'attoelite' && u.rol !== 'admin') {
      return responses.forbidden(res, 'Se requiere AttoElite para esta acción');
    }
    req.user = { id_usuario: u.id_usuario, correo };
    next();
  } catch (err) {
    console.error('Error en requireElite:', err);
    return responses.error(res, 'Error verificando permisos');
  }
}

// GET /api/pagina-artista/anuncios - Páginas aleatorias para mostrar como anuncios
router.get('/anuncios', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pa.id_pagina, pa.id_usuario, pa.nombre_artistico, pa.descripcion,
             pa.generos, pa.imagen_portada,
             u.usuario, u.foto,
             (SELECT COUNT(*) FROM cancion_artista WHERE id_usuario = pa.id_usuario) AS num_canciones
      FROM pagina_artista pa
      JOIN usuario u ON pa.id_usuario = u.id_usuario
      WHERE u.tipo_plan = 'attoelite' AND u.estado = 'activo'
      ORDER BY RANDOM()
      LIMIT 3
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo anuncios de artistas:', err);
    return responses.error(res, 'Error obteniendo anuncios');
  }
});

// GET /api/pagina-artista/:id_usuario - Obtener página de artista pública
router.get('/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const result = await pool.query(`
      SELECT pa.id_pagina, pa.id_usuario, pa.nombre_artistico, pa.descripcion,
             pa.generos, pa.imagen_portada, pa.fecha_creacion, pa.fecha_actualizacion,
             u.usuario, u.foto, u.tipo_plan, u.es_vip, u.insignia_artista, u.rol,
             u.fondo_perfil,
             (SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguido = pa.id_usuario) AS seguidores,
             (SELECT COUNT(*) FROM cancion_artista WHERE id_usuario = pa.id_usuario) AS num_canciones,
             (SELECT COUNT(*) FROM album_artista WHERE id_usuario = pa.id_usuario) AS num_albums,
             (SELECT COUNT(*) FROM evento_artista WHERE id_usuario = pa.id_usuario AND fecha_evento >= NOW()) AS num_eventos
      FROM pagina_artista pa
      JOIN usuario u ON pa.id_usuario = u.id_usuario
      WHERE pa.id_usuario = $1
    `, [id_usuario]);

    if (result.rowCount === 0) return responses.notFound(res, 'Página de artista');
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error obteniendo página de artista:', err);
    return responses.error(res, 'Error obteniendo página de artista');
  }
});

// POST /api/pagina-artista - Crear página de artista (solo AttoElite)
router.post('/', requireElite, async (req, res) => {
  const { nombre_artistico, descripcion, generos, imagen_portada } = req.body;

  if (!nombre_artistico || !nombre_artistico.trim()) {
    return responses.badRequest(res, 'El nombre artístico es requerido');
  }

  try {
    const existing = await pool.query(
      'SELECT id_pagina FROM pagina_artista WHERE id_usuario = $1',
      [req.user.id_usuario]
    );
    if (existing.rowCount > 0) {
      return responses.badRequest(res, 'Ya tienes una página de artista. Edítala en su lugar.');
    }

    const generosArray = Array.isArray(generos) ? generos : [];

    const result = await pool.query(`
      INSERT INTO pagina_artista (id_usuario, nombre_artistico, descripcion, generos, imagen_portada)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [req.user.id_usuario, nombre_artistico.trim(), descripcion || null, generosArray, imagen_portada || null]);

    return res.json({ message: 'Página de artista creada exitosamente', pagina: result.rows[0] });
  } catch (err) {
    console.error('Error creando página de artista:', err);
    return responses.error(res, 'Error creando página de artista');
  }
});

// PUT /api/pagina-artista - Actualizar página de artista
router.put('/', requireElite, async (req, res) => {
  const { nombre_artistico, descripcion, generos, imagen_portada } = req.body;

  try {
    const sets = [];
    const vals = [];
    let idx = 1;

    if (nombre_artistico) { sets.push(`nombre_artistico = $${idx++}`); vals.push(nombre_artistico.trim()); }
    if (descripcion !== undefined) { sets.push(`descripcion = $${idx++}`); vals.push(descripcion); }
    if (Array.isArray(generos)) { sets.push(`generos = $${idx++}`); vals.push(generos); }
    if (imagen_portada !== undefined) { sets.push(`imagen_portada = $${idx++}`); vals.push(imagen_portada); }
    sets.push('fecha_actualizacion = NOW()');

    if (sets.length === 1) return responses.badRequest(res, 'No hay campos para actualizar');

    vals.push(req.user.id_usuario);
    await pool.query(
      `UPDATE pagina_artista SET ${sets.join(', ')} WHERE id_usuario = $${idx}`,
      vals
    );

    return res.json({ message: 'Página de artista actualizada exitosamente' });
  } catch (err) {
    console.error('Error actualizando página de artista:', err);
    return responses.error(res, 'Error actualizando página de artista');
  }
});

module.exports = router;
module.exports.requireElite = requireElite;
