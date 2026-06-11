// routes/cancion_artista.js
const express = require('express');
const router = express.Router();
const pool = require('../utils/database');
const responses = require('../utils/responses');
const { getUserFromEmail } = require('../middleware/auth');
const { crearNotificacion } = require('./notificaciones');

// GET /api/canciones-artista - Feed de canciones (sin audio para no saturar)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  try {
    const result = await pool.query(`
      SELECT ca.id_cancion, ca.nombre, ca.descripcion, ca.genero, ca.imagen_url, ca.fecha_subida,
             u.id_usuario, u.usuario, u.foto, u.tipo_plan, u.rol, u.insignia_artista, u.fondo_publicaciones,
             (SELECT COUNT(*) FROM like_cancion_artista WHERE id_cancion = ca.id_cancion) AS likes,
             (SELECT COUNT(*) FROM comentario_cancion_artista WHERE id_cancion = ca.id_cancion) AS comentarios
      FROM cancion_artista ca
      JOIN usuario u ON ca.id_usuario = u.id_usuario
      ORDER BY ca.fecha_subida DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo feed de canciones:', err);
    return responses.error(res, 'Error obteniendo canciones');
  }
});

// GET /api/canciones-artista/usuario/:id_usuario
router.get('/usuario/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const result = await pool.query(`
      SELECT ca.id_cancion, ca.nombre, ca.descripcion, ca.genero, ca.imagen_url, ca.fecha_subida,
             u.id_usuario, u.usuario, u.foto, u.fondo_publicaciones,
             (SELECT COUNT(*) FROM like_cancion_artista WHERE id_cancion = ca.id_cancion) AS likes,
             (SELECT COUNT(*) FROM comentario_cancion_artista WHERE id_cancion = ca.id_cancion) AS comentarios
      FROM cancion_artista ca
      JOIN usuario u ON ca.id_usuario = u.id_usuario
      WHERE ca.id_usuario = $1
      ORDER BY ca.fecha_subida DESC
    `, [id_usuario]);
    return res.json(result.rows);
  } catch (err) {
    return responses.error(res, 'Error obteniendo canciones del usuario');
  }
});

// GET /api/canciones-artista/:id/audio - Carga el audio solo cuando se necesita
router.get('/:id/audio', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT audio_data FROM cancion_artista WHERE id_cancion = $1', [id]
    );
    if (result.rowCount === 0) return responses.notFound(res, 'Canción');
    return res.json({ audio_data: result.rows[0].audio_data });
  } catch (err) {
    return responses.error(res, 'Error obteniendo audio');
  }
});

// POST /api/canciones-artista/subir
router.post('/subir', getUserFromEmail, async (req, res) => {
  const { nombre, descripcion, genero, imagen_url, audio_data } = req.body;
  const { id_usuario } = req.user;

  if (!nombre || !nombre.trim()) return responses.badRequest(res, 'El nombre es obligatorio');
  if (!audio_data) return responses.badRequest(res, 'El audio es obligatorio');
  if (nombre.trim().length > 200) return responses.badRequest(res, 'El nombre es demasiado largo');

  try {
    const result = await pool.query(`
      INSERT INTO cancion_artista (id_usuario, nombre, descripcion, genero, imagen_url, audio_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_cancion
    `, [id_usuario, nombre.trim(), descripcion || null, genero || null, imagen_url || null, audio_data]);

    // Si es la primera canción, otorgar insignia de artista (permanente)
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM cancion_artista WHERE id_usuario = $1', [id_usuario]
    );
    const esPrimera = parseInt(countRes.rows[0].count) === 1;
    if (esPrimera) {
      await pool.query('UPDATE usuario SET insignia_artista = true WHERE id_usuario = $1', [id_usuario]);
    }

    // Si el usuario es AttoElite, notificar a sus seguidores
    const planR = await pool.query('SELECT tipo_plan FROM usuario WHERE id_usuario = $1', [id_usuario]);
    if (planR.rows[0]?.tipo_plan === 'attoelite') {
      const seguidores = await pool.query(
        'SELECT id_usuario_seguidor FROM seguimiento WHERE id_usuario_seguido = $1', [id_usuario]
      );
      for (const seg of seguidores.rows) {
        await crearNotificacion(
          seg.id_usuario_seguidor,
          id_usuario,
          'nueva_cancion_elite',
          result.rows[0].id_cancion,
          `publicó una nueva canción: "${nombre.trim()}"`
        );
      }
    }

    return res.json({
      message: 'Canción publicada exitosamente',
      id_cancion: result.rows[0].id_cancion,
      insignia_artista_nueva: esPrimera
    });
  } catch (err) {
    console.error('Error subiendo canción:', err);
    return responses.error(res, 'Error al subir la canción');
  }
});

// POST /api/canciones-artista/:id/like
router.post('/:id/like', getUserFromEmail, async (req, res) => {
  const { id } = req.params;
  const { id_usuario } = req.user;
  try {
    const existing = await pool.query(
      'SELECT id_like FROM like_cancion_artista WHERE id_cancion = $1 AND id_usuario = $2',
      [id, id_usuario]
    );
    if (existing.rowCount > 0) {
      await pool.query(
        'DELETE FROM like_cancion_artista WHERE id_cancion = $1 AND id_usuario = $2',
        [id, id_usuario]
      );
      return res.json({ liked: false });
    } else {
      await pool.query(
        'INSERT INTO like_cancion_artista (id_cancion, id_usuario) VALUES ($1, $2)',
        [id, id_usuario]
      );
      // Notificar al dueño de la canción
      const dueno = await pool.query('SELECT id_usuario FROM cancion_artista WHERE id_cancion = $1', [id]);
      if (dueno.rowCount > 0) {
        await crearNotificacion(dueno.rows[0].id_usuario, id_usuario, 'like_cancion', id, 'reaccionó a tu canción ❤️');
      }
      return res.json({ liked: true });
    }
  } catch (err) {
    return responses.error(res, 'Error al procesar like');
  }
});

// GET /api/canciones-artista/:id/like-estado
router.get('/:id/like-estado', async (req, res) => {
  const { id } = req.params;
  const correo = req.query.correo;
  if (!correo) return res.json({ liked: false });
  try {
    const uRes = await pool.query('SELECT id_usuario FROM usuario WHERE correo = $1', [correo]);
    if (uRes.rowCount === 0) return res.json({ liked: false });
    const r = await pool.query(
      'SELECT id_like FROM like_cancion_artista WHERE id_cancion = $1 AND id_usuario = $2',
      [id, uRes.rows[0].id_usuario]
    );
    return res.json({ liked: r.rowCount > 0 });
  } catch (err) {
    return res.json({ liked: false });
  }
});

// POST /api/canciones-artista/:id/comentario
router.post('/:id/comentario', getUserFromEmail, async (req, res) => {
  const { id } = req.params;
  const { id_usuario } = req.user;
  const { comentario } = req.body;
  if (!comentario || !comentario.trim()) {
    return responses.badRequest(res, 'El comentario no puede estar vacío');
  }
  try {
    await pool.query(
      'INSERT INTO comentario_cancion_artista (id_cancion, id_usuario, comentario) VALUES ($1, $2, $3)',
      [id, id_usuario, comentario.trim()]
    );
    // Notificar al dueño de la canción
    const dueno = await pool.query('SELECT id_usuario FROM cancion_artista WHERE id_cancion = $1', [id]);
    if (dueno.rowCount > 0) {
      await crearNotificacion(dueno.rows[0].id_usuario, id_usuario, 'comentario_cancion', id, 'comentó en tu canción 💬');
    }
    return res.json({ message: 'Comentario agregado' });
  } catch (err) {
    return responses.error(res, 'Error al agregar comentario');
  }
});

// GET /api/canciones-artista/:id/comentarios
router.get('/:id/comentarios', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT cc.id_comentario, cc.comentario, cc.fecha,
             u.usuario, u.foto, u.id_usuario
      FROM comentario_cancion_artista cc
      JOIN usuario u ON cc.id_usuario = u.id_usuario
      WHERE cc.id_cancion = $1
      ORDER BY cc.fecha DESC
    `, [id]);
    return res.json(result.rows);
  } catch (err) {
    return responses.error(res, 'Error obteniendo comentarios');
  }
});

module.exports = router;
