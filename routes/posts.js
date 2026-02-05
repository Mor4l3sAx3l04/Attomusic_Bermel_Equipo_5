// routes/posts.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const queries = require("../utils/queries");
const { getUserFromEmail } = require("../middleware/auth");

// CREAR Y OBTENER PUBLICACIONES 

// RUTA: Crear publicación
router.post("/publicacion", getUserFromEmail, async (req, res) => {
  try {
    const { idCancion, publicacion } = req.body;
    const id_usuario = req.user.id_usuario;

    if (!publicacion) {
      return responses.badRequest(res, "Datos incompletos");
    }

    let id_cancion_final = null;

    // Si incluye canción, verificar/insertar
    if (idCancion) {
      const cancionExiste = await pool.query(queries.checkSongExists, [idCancion]);

      if (cancionExiste.rowCount === 0) {
        const tokenResp = await axios.get("http://localhost:3000/spotify/token");
        const token = tokenResp.data.access_token;

        const trackResp = await axios.get(`https://api.spotify.com/v1/tracks/${idCancion}`, {
          headers: { Authorization: "Bearer " + token },
        });
        const track = trackResp.data;

        const imagenUrl = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null;

        // Obtener género desde el artista
        const artistResp = await axios.get(
          `https://api.spotify.com/v1/artists/${track.artists[0].id}`,
          { headers: { Authorization: "Bearer " + token } }
        );

        const genero = artistResp.data.genres?.[0] || "Desconocido";

        await pool.query(queries.insertSong, [
          track.id,
          track.name,
          track.artists[0].name,
          track.album.name,
          track.preview_url,
          imagenUrl,
          genero
        ]);
      }

      id_cancion_final = idCancion;
    }

    // Validar publicación con Gemini
    const { validarPublicacion } = require("./gemini");
    const moderacion = await validarPublicacion(publicacion);
    if (!moderacion.apto) {
      return responses.badRequest(res, "Publicación no apta: " + moderacion.razon);
    }

    await pool.query(
      `INSERT INTO publicacion (id_usuario, id_cancion, publicacion, fecha_pub)
      VALUES ($1, $2, $3, NOW())`,
      [id_usuario, id_cancion_final, publicacion]
    );

    return res.json({ message: "Publicación creada con éxito" });
  } catch (err) {
    console.error("Error en /api/publicacion:", err);
    return responses.error(res, "Error interno del servidor");
  }
});

// RUTA: Obtener todas las publicaciones
router.get("/publicaciones", async (req, res) => {
  try {
    const pagina = parseInt(req.query.pagina) || 0;
    const limite = parseInt(req.query.limite) || 10;
    const offset = pagina * limite;

    console.log(`Backend - Página: ${pagina}, Límite: ${limite}, Offset: ${offset}`);

    const result = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, 
            p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album, 
            c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      ORDER BY p.fecha_pub DESC
      LIMIT $1 OFFSET $2
    `, [limite, offset]);

    const countResult = await pool.query('SELECT COUNT(*) as total FROM publicacion');
    const total = parseInt(countResult.rows[0].total);
    const hayMas = (offset + limite) < total;

    console.log(`Backend - Enviando ${result.rows.length} publicaciones | Total: ${total} | Hay más: ${hayMas}`);

    return res.json({
      publicaciones: result.rows,
      hayMas: hayMas,
      total: total,
      paginaActual: pagina
    });
  } catch (err) {
    console.error("Error en /api/publicaciones:", err);
    return responses.error(res, "Error obteniendo publicaciones");
  }
});

// RUTA: Buscar publicaciones
router.get("/publicaciones/buscar", async (req, res) => {
  try {
    const { q } = req.query;
    const pagina = parseInt(req.query.pagina) || 0;
    const limite = parseInt(req.query.limite) || 20; // Más resultados en búsqueda
    const offset = pagina * limite;

    if (!q || q.trim().length === 0) {
      return responses.badRequest(res, "Parámetro de búsqueda vacío");
    }

    const result = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, 
            p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album, 
            c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE p.publicacion ILIKE $1 OR u.usuario ILIKE $1
      ORDER BY p.fecha_pub DESC
      LIMIT $2 OFFSET $3
    `, [`%${q}%`, limite, offset]);

    return res.json(result.rows);
  } catch (err) {
    console.error("Error en búsqueda:", err);
    return responses.error(res, "Error en búsqueda de publicaciones");
  }
});

// RUTA: Publicaciones destacadas (más likes)
router.get("/publicaciones/destacadas", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
             c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
             COUNT(DISTINCT r.id_reaccion) as likes,
             COUNT(DISTINCT co.id_comentario) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      LEFT JOIN reaccion r ON p.id_publicacion = r.id_publicacion AND r.tipo = 'like'
      LEFT JOIN comentario co ON p.id_publicacion = co.id_publicacion
      GROUP BY p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
               c.id_cancion, c.nombre, c.artista, c.album, c.url_preview, c.imagen_url
      HAVING COUNT(DISTINCT r.id_reaccion) > 0
      ORDER BY likes DESC, p.fecha_pub DESC
      LIMIT $1
    `, [limit]);

    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo publicaciones destacadas:", err);
    return responses.error(res, "Error obteniendo publicaciones destacadas");
  }
});

// RUTA: Publicaciones de usuarios que sigo
router.get("/publicaciones/siguiendo", getUserFromEmail, async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;

    const result = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
             c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
             (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
             (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE p.id_usuario IN (
        SELECT id_usuario_seguido
        FROM seguimiento
        WHERE id_usuario_seguidor = $1
      )
      ORDER BY p.fecha_pub DESC
      LIMIT 50
    `, [id_usuario]);

    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo publicaciones de seguidos:", err);
    return responses.error(res, "Error obteniendo publicaciones");
  }
});

//LIKES Y COMENTARIOS 

// RUTA: Dar/Quitar like a publicación
router.post("/publicacion/:id/like", getUserFromEmail, async (req, res) => {
  try {
    const { id } = req.params;
    const id_usuario = req.user.id_usuario;

    const existingLike = await pool.query(queries.checkLikeExists, [id, id_usuario]);

    if (existingLike.rowCount > 0) {
      // Quitar like
      await pool.query(queries.removeLike, [id, id_usuario]);
      return res.json({ message: "Like removido", liked: false });
    } else {
      // Dar like
      await pool.query(queries.addLike, [id, id_usuario]);
      return res.json({ message: "Like agregado", liked: true });
    }
  } catch (err) {
    console.error("Error en like:", err);
    return responses.error(res, "Error al procesar like");
  }
});

// RUTA: Agregar comentario
router.post("/publicacion/:id/comentario", getUserFromEmail, async (req, res) => {
  try {
    const { id } = req.params;
    const { comentario } = req.body;
    const id_usuario = req.user.id_usuario;

    if (!comentario) {
      return responses.badRequest(res, "Datos incompletos");
    }

    // Validar comentario con Gemini
    const { validarPublicacion } = require("./gemini");
    const moderacion = await validarPublicacion(comentario);
    if (!moderacion.apto) {
      return responses.badRequest(res, "Comentario no apto: " + moderacion.razon);
    }

    await pool.query(queries.addComment, [id, id_usuario, comentario]);

    return res.json({ message: "Comentario agregado" });
  } catch (err) {
    console.error("Error en comentario:", err);
    return responses.error(res, "Error al agregar comentario");
  }
});

// RUTA: Obtener comentarios de una publicación
router.get("/publicacion/:id/comentarios", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(queries.getCommentsByPost, [id]);
    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo comentarios:", err);
    return responses.error(res, "Error obteniendo comentarios");
  }
});

// EDITAR Y ELIMINAR

// RUTA: Editar publicación
router.put("/publicacion/:id", getUserFromEmail, async (req, res) => {
  try {
    const { id } = req.params;
    const { publicacion } = req.body;
    const correo = req.user.correo;

    if (!publicacion) {
      return responses.badRequest(res, "Datos incompletos");
    }

    // Verificar que la publicación pertenezca al usuario
    const checkResult = await pool.query(`
      SELECT p.id_publicacion
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE p.id_publicacion = $1 AND u.correo = $2
    `, [id, correo]);

    if (checkResult.rowCount === 0) {
      return responses.forbidden(res, "No tienes permiso para editar esta publicación");
    }

    await pool.query(
      "UPDATE publicacion SET publicacion = $1 WHERE id_publicacion = $2",
      [publicacion, id]
    );

    return res.json({ message: "Publicación actualizada correctamente" });
  } catch (err) {
    console.error("Error actualizando publicación:", err);
    return responses.error(res, "Error actualizando publicación");
  }
});

// RUTA: Eliminar publicación
router.delete("/publicacion/:id", getUserFromEmail, async (req, res) => {
  try {
    const { id } = req.params;
    const correo = req.user.correo;

    // Verificar que la publicación pertenezca al usuario
    const checkResult = await pool.query(`
      SELECT p.id_publicacion
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE p.id_publicacion = $1 AND u.correo = $2
    `, [id, correo]);

    if (checkResult.rowCount === 0) {
      return responses.forbidden(res, "No tienes permiso para eliminar esta publicación");
    }

    await pool.query("DELETE FROM publicacion WHERE id_publicacion = $1", [id]);

    return res.json({ message: "Publicación eliminada correctamente" });
  } catch (err) {
    console.error("Error eliminando publicación:", err);
    return responses.error(res, "Error eliminando publicación");
  }
});

//  REPORTES

// RUTA: Reportar publicación
router.post("/publicacion/:id/reportar", getUserFromEmail, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const id_usuario = req.user.id_usuario;

    if (!motivo || motivo.trim().length < 10) {
      return responses.badRequest(res, "El motivo debe tener al menos 10 caracteres");
    }

    // Verificar si ya reportó
    const yaReporto = await pool.query(queries.checkReportExists, [id, id_usuario]);

    if (yaReporto.rowCount > 0) {
      return responses.badRequest(res, "Ya has reportado esta publicación");
    }

    // Crear tabla de reportes si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reporte (
        id_reporte SERIAL PRIMARY KEY,
        id_publicacion INTEGER REFERENCES publicacion(id_publicacion) ON DELETE CASCADE,
        id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE,
        motivo TEXT NOT NULL,
        fecha_rep TIMESTAMP DEFAULT NOW(),
        estado VARCHAR(20) DEFAULT 'pendiente'
      )
    `);

    await pool.query(queries.addReport, [id, id_usuario, motivo]);

    return res.json({ message: "Reporte enviado correctamente" });
  } catch (err) {
    console.error("Error al reportar:", err);
    return responses.error(res, "Error al enviar reporte");
  }
});

// LIKES DEL USUARIO

// RUTA: Obtener likes del usuario
router.get("/usuario/likes", getUserFromEmail, async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;
    const result = await pool.query(queries.getUserLikes, [id_usuario]);
    const likes = result.rows.map(row => row.id_publicacion);
    return res.json({ likes });
  } catch (err) {
    console.error("Error obteniendo likes:", err);
    return responses.error(res, "Error obteniendo likes");
  }
});

module.exports = router;