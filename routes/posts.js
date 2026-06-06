// routes/posts.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const queries = require("../utils/queries");
const { getUserFromEmail } = require("../middleware/auth");
const { crearNotificacion } = require("./notificaciones");

async function getItunesPreview(nombre, artista) {
  try {
    const query = encodeURIComponent(`${nombre} ${artista}`);
    const resp = await axios.get(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
    return resp.data?.results?.[0]?.previewUrl || null;
  } catch {
    return null;
  }
}

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

        const previewUrl = track.preview_url || await getItunesPreview(track.name, track.artists[0].name);

        await pool.query(queries.insertSong, [
          track.id,
          track.name,
          track.artists[0].name,
          track.album.name,
          previewUrl,
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
      WITH rnk AS (
        SELECT u2.id_usuario,
               RANK() OVER (ORDER BY COUNT(s.id_seguimiento) DESC, u2.fecha_reg DESC) AS posicion
        FROM usuario u2
        LEFT JOIN seguimiento s ON u2.id_usuario = s.id_usuario_seguido
        WHERE u2.estado = 'activo'
        GROUP BY u2.id_usuario, u2.fecha_reg
      )
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto,
            u.fondo_publicaciones, u.es_vip, u.rol, u.insignia_artista, u.tipo_plan,
            CASE WHEN rnk.posicion <= 3 THEN rnk.posicion ELSE NULL END AS posicion_ranking,
            p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album,
            c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      LEFT JOIN rnk ON u.id_usuario = rnk.id_usuario
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

// RUTA: Obtener una publicación por ID
router.get("/publicacion/:id(\\d+)", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      WITH rnk AS (
        SELECT u2.id_usuario,
               RANK() OVER (ORDER BY COUNT(s.id_seguimiento) DESC, u2.fecha_reg DESC) AS posicion
        FROM usuario u2
        LEFT JOIN seguimiento s ON u2.id_usuario = s.id_usuario_seguido
        WHERE u2.estado = 'activo'
        GROUP BY u2.id_usuario, u2.fecha_reg
      )
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto,
            u.fondo_publicaciones, u.es_vip, u.rol, u.insignia_artista, u.tipo_plan,
            CASE WHEN rnk.posicion <= 3 THEN rnk.posicion ELSE NULL END AS posicion_ranking,
            p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album,
            c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      LEFT JOIN rnk ON u.id_usuario = rnk.id_usuario
      WHERE p.id_publicacion = $1
    `, [id]);

    if (result.rows.length === 0) return responses.notFound(res, "Publicación");
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error en GET /api/publicacion/:id:", err);
    return responses.error(res, "Error obteniendo publicación");
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
      WITH rnk AS (
        SELECT u2.id_usuario,
               RANK() OVER (ORDER BY COUNT(s.id_seguimiento) DESC, u2.fecha_reg DESC) AS posicion
        FROM usuario u2
        LEFT JOIN seguimiento s ON u2.id_usuario = s.id_usuario_seguido
        WHERE u2.estado = 'activo'
        GROUP BY u2.id_usuario, u2.fecha_reg
      )
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto,
            u.fondo_publicaciones, u.es_vip, u.rol, u.insignia_artista, u.tipo_plan,
            CASE WHEN rnk.posicion <= 3 THEN rnk.posicion ELSE NULL END AS posicion_ranking,
            p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album,
            c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      LEFT JOIN rnk ON u.id_usuario = rnk.id_usuario
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
      WITH rnk AS (
        SELECT u2.id_usuario,
               RANK() OVER (ORDER BY COUNT(s.id_seguimiento) DESC, u2.fecha_reg DESC) AS posicion
        FROM usuario u2
        LEFT JOIN seguimiento s ON u2.id_usuario = s.id_usuario_seguido
        WHERE u2.estado = 'activo'
        GROUP BY u2.id_usuario, u2.fecha_reg
      )
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
             u.fondo_publicaciones, u.es_vip, u.rol, u.insignia_artista, u.tipo_plan,
             CASE WHEN rnk.posicion <= 3 THEN rnk.posicion ELSE NULL END AS posicion_ranking,
             c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
             COUNT(DISTINCT reac.id_reaccion) as likes,
             COUNT(DISTINCT co.id_comentario) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      LEFT JOIN reaccion reac ON p.id_publicacion = reac.id_publicacion AND reac.tipo = 'like'
      LEFT JOIN comentario co ON p.id_publicacion = co.id_publicacion
      LEFT JOIN rnk ON u.id_usuario = rnk.id_usuario
      GROUP BY p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
               u.fondo_publicaciones, u.es_vip, u.rol, u.insignia_artista, u.tipo_plan, rnk.posicion,
               c.id_cancion, c.nombre, c.artista, c.album, c.url_preview, c.imagen_url
      HAVING COUNT(DISTINCT reac.id_reaccion) > 0
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
      WITH rnk AS (
        SELECT u2.id_usuario,
               RANK() OVER (ORDER BY COUNT(s.id_seguimiento) DESC, u2.fecha_reg DESC) AS posicion
        FROM usuario u2
        LEFT JOIN seguimiento s ON u2.id_usuario = s.id_usuario_seguido
        WHERE u2.estado = 'activo'
        GROUP BY u2.id_usuario, u2.fecha_reg
      )
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
             u.fondo_publicaciones, u.es_vip, u.rol, u.insignia_artista, u.tipo_plan,
             CASE WHEN rnk.posicion <= 3 THEN rnk.posicion ELSE NULL END AS posicion_ranking,
             c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
             (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
             (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      LEFT JOIN rnk ON u.id_usuario = rnk.id_usuario
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

      const pubResult = await pool.query(
        "SELECT id_usuario FROM publicacion WHERE id_publicacion = $1", [id]
      );
      if (pubResult.rows.length > 0) {
        const actorResult = await pool.query(
          "SELECT usuario FROM usuario WHERE id_usuario = $1", [id_usuario]
        );
        const actorNombre = actorResult.rows[0]?.usuario || "Alguien";
        await crearNotificacion(
          pubResult.rows[0].id_usuario,   // quién recibe
          id_usuario,                      // quién actuó
          "like",                          // tipo
          id,                              // id de la publicación
          `${actorNombre} reaccionó a tu publicación ❤️`
        );
      }

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

    const pubComentario = await pool.query(
      "SELECT id_usuario FROM publicacion WHERE id_publicacion = $1", [id]
    );
    if (pubComentario.rows.length > 0) {
      const actorComentario = await pool.query(
        "SELECT usuario FROM usuario WHERE id_usuario = $1", [id_usuario]
      );
      const actorNombre = actorComentario.rows[0]?.usuario || "Alguien";
      await crearNotificacion(
        pubComentario.rows[0].id_usuario,
        id_usuario,
        "comentario",
        id,
        `${actorNombre} comentó en tu publicación 💬`
      );
    }

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