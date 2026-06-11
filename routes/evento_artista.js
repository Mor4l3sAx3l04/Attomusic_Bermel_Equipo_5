// routes/evento_artista.js
const express = require('express');
const router = express.Router();
const pool = require('../utils/database');
const responses = require('../utils/responses');
const { requireElite } = require('./pagina_artista');
const { crearNotificacion } = require('./notificaciones');

// GET /api/eventos - Todos los eventos de todos los artistas
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const result = await pool.query(`
      SELECT ea.id_evento, ea.titulo, ea.descripcion, ea.fecha_evento, ea.horario_fin,
             ea.direccion, ea.latitud, ea.longitud, ea.imagen_url,
             u.id_usuario, u.usuario, u.foto, u.tipo_plan, u.insignia_artista,
             pa.nombre_artistico, pa.imagen_portada
      FROM evento_artista ea
      JOIN usuario u ON ea.id_usuario = u.id_usuario
      LEFT JOIN pagina_artista pa ON pa.id_usuario = ea.id_usuario
      ORDER BY ea.fecha_evento ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo todos los eventos:', err);
    return responses.error(res, 'Error obteniendo eventos');
  }
});

// GET /api/eventos/usuario/:id_usuario - Eventos futuros + pasados de un artista
router.get('/usuario/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM evento_artista
      WHERE id_usuario = $1
      ORDER BY fecha_evento ASC
    `, [id_usuario]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo eventos:', err);
    return responses.error(res, 'Error obteniendo eventos');
  }
});

// GET /api/eventos/:id_evento
router.get('/:id_evento', async (req, res) => {
  const { id_evento } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM evento_artista WHERE id_evento = $1', [id_evento]
    );
    if (result.rowCount === 0) return responses.notFound(res, 'Evento');
    return res.json(result.rows[0]);
  } catch (err) {
    return responses.error(res, 'Error obteniendo evento');
  }
});

// POST /api/eventos - Crear evento
router.post('/', requireElite, async (req, res) => {
  const { titulo, descripcion, fecha_evento, horario_fin, direccion, latitud, longitud, imagen_url } = req.body;

  if (!titulo || !titulo.trim()) return responses.badRequest(res, 'El título del evento es requerido');
  if (!fecha_evento) return responses.badRequest(res, 'La fecha del evento es requerida');
  if (!direccion || !direccion.trim()) return responses.badRequest(res, 'La dirección es requerida');

  try {
    const result = await pool.query(`
      INSERT INTO evento_artista (id_usuario, titulo, descripcion, fecha_evento, horario_fin, direccion, latitud, longitud, imagen_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [
      req.user.id_usuario,
      titulo.trim(),
      descripcion || null,
      fecha_evento,
      horario_fin || null,
      direccion.trim(),
      latitud || null,
      longitud || null,
      imagen_url || null
    ]);

    // Notificar a seguidores
    const seguidores = await pool.query(
      'SELECT id_usuario_seguidor FROM seguimiento WHERE id_usuario_seguido = $1',
      [req.user.id_usuario]
    );
    const usuarioR = await pool.query(
      'SELECT usuario FROM usuario WHERE id_usuario = $1', [req.user.id_usuario]
    );
    const nombreUsuario = usuarioR.rows[0]?.usuario || 'Un artista';

    for (const seg of seguidores.rows) {
      await crearNotificacion(
        seg.id_usuario_seguidor,
        req.user.id_usuario,
        'nuevo_evento',
        result.rows[0].id_evento,
        `publicó un nuevo evento: "${titulo.trim()}"`
      );
    }

    return res.json({ message: 'Evento creado exitosamente', evento: result.rows[0] });
  } catch (err) {
    console.error('Error creando evento:', err);
    return responses.error(res, 'Error creando evento');
  }
});

// PUT /api/eventos/:id_evento
router.put('/:id_evento', requireElite, async (req, res) => {
  const { id_evento } = req.params;
  const { titulo, descripcion, fecha_evento, horario_fin, direccion, latitud, longitud, imagen_url } = req.body;

  try {
    const check = await pool.query(
      'SELECT id_usuario FROM evento_artista WHERE id_evento = $1', [id_evento]
    );
    if (check.rowCount === 0) return responses.notFound(res, 'Evento');
    if (check.rows[0].id_usuario !== req.user.id_usuario) {
      return responses.forbidden(res, 'No tienes permiso para editar este evento');
    }

    await pool.query(`
      UPDATE evento_artista SET
        titulo = COALESCE($1, titulo),
        descripcion = COALESCE($2, descripcion),
        fecha_evento = COALESCE($3, fecha_evento),
        horario_fin = $4,
        direccion = COALESCE($5, direccion),
        latitud = $6,
        longitud = $7,
        imagen_url = $8
      WHERE id_evento = $9
    `, [
      titulo?.trim() || null,
      descripcion || null,
      fecha_evento || null,
      horario_fin || null,
      direccion?.trim() || null,
      latitud || null,
      longitud || null,
      imagen_url || null,
      id_evento
    ]);

    return res.json({ message: 'Evento actualizado exitosamente' });
  } catch (err) {
    console.error('Error actualizando evento:', err);
    return responses.error(res, 'Error actualizando evento');
  }
});

// DELETE /api/eventos/:id_evento
router.delete('/:id_evento', requireElite, async (req, res) => {
  const { id_evento } = req.params;
  try {
    const check = await pool.query(
      'SELECT id_usuario FROM evento_artista WHERE id_evento = $1', [id_evento]
    );
    if (check.rowCount === 0) return responses.notFound(res, 'Evento');
    if (check.rows[0].id_usuario !== req.user.id_usuario) {
      return responses.forbidden(res, 'No tienes permiso');
    }
    await pool.query('DELETE FROM evento_artista WHERE id_evento = $1', [id_evento]);
    return res.json({ message: 'Evento eliminado exitosamente' });
  } catch (err) {
    return responses.error(res, 'Error eliminando evento');
  }
});

module.exports = router;
