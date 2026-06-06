// routes/album_artista.js
const express = require('express');
const router = express.Router();
const pool = require('../utils/database');
const responses = require('../utils/responses');
const { requireElite } = require('./pagina_artista');
const { crearNotificacion } = require('./notificaciones');

// GET /api/albums/usuario/:id_usuario - Álbumes de un usuario
router.get('/usuario/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const result = await pool.query(`
      SELECT aa.*,
             (SELECT COUNT(*) FROM album_cancion WHERE id_album = aa.id_album) AS num_canciones
      FROM album_artista aa
      WHERE aa.id_usuario = $1
      ORDER BY aa.fecha_creacion DESC
    `, [id_usuario]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo álbumes:', err);
    return responses.error(res, 'Error obteniendo álbumes');
  }
});

// GET /api/albums/:id_album - Detalle de un álbum
router.get('/:id_album', async (req, res) => {
  const { id_album } = req.params;
  try {
    const album = await pool.query(
      'SELECT * FROM album_artista WHERE id_album = $1', [id_album]
    );
    if (album.rowCount === 0) return responses.notFound(res, 'Álbum');
    return res.json(album.rows[0]);
  } catch (err) {
    return responses.error(res, 'Error obteniendo álbum');
  }
});

// GET /api/albums/:id_album/canciones - Canciones de un álbum
router.get('/:id_album/canciones', async (req, res) => {
  const { id_album } = req.params;
  try {
    const result = await pool.query(`
      SELECT ca.id_cancion, ca.nombre, ca.descripcion, ca.genero, ca.imagen_url, ca.fecha_subida,
             ac.orden
      FROM album_cancion ac
      JOIN cancion_artista ca ON ac.id_cancion = ca.id_cancion
      WHERE ac.id_album = $1
      ORDER BY ac.orden ASC
    `, [id_album]);
    return res.json(result.rows);
  } catch (err) {
    return responses.error(res, 'Error obteniendo canciones del álbum');
  }
});

// POST /api/albums - Crear álbum
router.post('/', requireElite, async (req, res) => {
  const { nombre, descripcion, imagen_portada } = req.body;
  if (!nombre || !nombre.trim()) return responses.badRequest(res, 'El nombre del álbum es requerido');

  try {
    const result = await pool.query(`
      INSERT INTO album_artista (id_usuario, nombre, descripcion, imagen_portada)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [req.user.id_usuario, nombre.trim(), descripcion || null, imagen_portada || null]);

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
        'nuevo_album',
        result.rows[0].id_album,
        `publicó un nuevo álbum: "${nombre.trim()}"`
      );
    }

    return res.json({ message: 'Álbum creado exitosamente', album: result.rows[0] });
  } catch (err) {
    console.error('Error creando álbum:', err);
    return responses.error(res, 'Error creando álbum');
  }
});

// PUT /api/albums/:id_album - Actualizar álbum
router.put('/:id_album', requireElite, async (req, res) => {
  const { id_album } = req.params;
  const { nombre, descripcion, imagen_portada } = req.body;

  try {
    const check = await pool.query(
      'SELECT id_usuario FROM album_artista WHERE id_album = $1', [id_album]
    );
    if (check.rowCount === 0) return responses.notFound(res, 'Álbum');
    if (check.rows[0].id_usuario !== req.user.id_usuario) {
      return responses.forbidden(res, 'No tienes permiso para editar este álbum');
    }

    const sets = [];
    const vals = [];
    let idx = 1;
    if (nombre) { sets.push(`nombre = $${idx++}`); vals.push(nombre.trim()); }
    if (descripcion !== undefined) { sets.push(`descripcion = $${idx++}`); vals.push(descripcion); }
    if (imagen_portada !== undefined) { sets.push(`imagen_portada = $${idx++}`); vals.push(imagen_portada); }

    if (sets.length === 0) return responses.badRequest(res, 'No hay campos para actualizar');

    vals.push(id_album);
    await pool.query(`UPDATE album_artista SET ${sets.join(', ')} WHERE id_album = $${idx}`, vals);
    return res.json({ message: 'Álbum actualizado exitosamente' });
  } catch (err) {
    return responses.error(res, 'Error actualizando álbum');
  }
});

// DELETE /api/albums/:id_album
router.delete('/:id_album', requireElite, async (req, res) => {
  const { id_album } = req.params;
  try {
    const check = await pool.query(
      'SELECT id_usuario FROM album_artista WHERE id_album = $1', [id_album]
    );
    if (check.rowCount === 0) return responses.notFound(res, 'Álbum');
    if (check.rows[0].id_usuario !== req.user.id_usuario) {
      return responses.forbidden(res, 'No tienes permiso');
    }
    await pool.query('DELETE FROM album_artista WHERE id_album = $1', [id_album]);
    return res.json({ message: 'Álbum eliminado exitosamente' });
  } catch (err) {
    return responses.error(res, 'Error eliminando álbum');
  }
});

// POST /api/albums/:id_album/canciones - Agregar canción al álbum
router.post('/:id_album/canciones', requireElite, async (req, res) => {
  const { id_album } = req.params;
  const { id_cancion } = req.body;
  if (!id_cancion) return responses.badRequest(res, 'id_cancion requerido');

  try {
    const albumCheck = await pool.query(
      'SELECT id_usuario FROM album_artista WHERE id_album = $1', [id_album]
    );
    if (albumCheck.rowCount === 0) return responses.notFound(res, 'Álbum');
    if (albumCheck.rows[0].id_usuario !== req.user.id_usuario) {
      return responses.forbidden(res, 'No tienes permiso');
    }

    const songCheck = await pool.query(
      'SELECT id_usuario FROM cancion_artista WHERE id_cancion = $1', [id_cancion]
    );
    if (songCheck.rowCount === 0) return responses.notFound(res, 'Canción');
    if (songCheck.rows[0].id_usuario !== req.user.id_usuario) {
      return responses.forbidden(res, 'Esa canción no te pertenece');
    }

    const maxOrden = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden FROM album_cancion WHERE id_album = $1',
      [id_album]
    );

    await pool.query(
      'INSERT INTO album_cancion (id_album, id_cancion, orden) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [id_album, id_cancion, maxOrden.rows[0].next_orden]
    );

    return res.json({ message: 'Canción agregada al álbum' });
  } catch (err) {
    return responses.error(res, 'Error agregando canción al álbum');
  }
});

// DELETE /api/albums/:id_album/canciones/:id_cancion
router.delete('/:id_album/canciones/:id_cancion', requireElite, async (req, res) => {
  const { id_album, id_cancion } = req.params;
  try {
    const check = await pool.query(
      'SELECT id_usuario FROM album_artista WHERE id_album = $1', [id_album]
    );
    if (check.rowCount === 0) return responses.notFound(res, 'Álbum');
    if (check.rows[0].id_usuario !== req.user.id_usuario) {
      return responses.forbidden(res, 'No tienes permiso');
    }
    await pool.query(
      'DELETE FROM album_cancion WHERE id_album = $1 AND id_cancion = $2',
      [id_album, id_cancion]
    );
    return res.json({ message: 'Canción eliminada del álbum' });
  } catch (err) {
    return responses.error(res, 'Error eliminando canción del álbum');
  }
});

module.exports = router;
