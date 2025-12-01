// routes/recomendaciones.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const { getUserFromEmail } = require("../middleware/auth");

// ANÁLISIS DE GUSTOS DEL USUARIO 

/**
 * Obtiene todas las interacciones del usuario
 */
async function getUserInteractions(id_usuario) {
  try {
    // Canciones con las que ha interactuado (likes)
    const likesResult = await pool.query(`
      SELECT DISTINCT c.id_cancion, c.nombre, c.artista, c.album, 
            COUNT(*) as interacciones
      FROM reaccion r
      JOIN publicacion p ON r.id_publicacion = p.id_publicacion
      JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE r.id_usuario = $1 AND r.tipo = 'like' AND p.id_cancion IS NOT NULL
      GROUP BY c.id_cancion, c.nombre, c.artista, c.album
    `, [id_usuario]);

    // Canciones en las que ha comentado
    const commentsResult = await pool.query(`
      SELECT DISTINCT c.id_cancion, c.nombre, c.artista, c.album,
            COUNT(*) as interacciones
      FROM comentario co
      JOIN publicacion p ON co.id_publicacion = p.id_publicacion
      JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE co.id_usuario = $1 AND p.id_cancion IS NOT NULL
      GROUP BY c.id_cancion, c.nombre, c.artista, c.album
    `, [id_usuario]);

    // Canciones que ha publicado
    const postsResult = await pool.query(`
      SELECT DISTINCT c.id_cancion, c.nombre, c.artista, c.album,
            COUNT(*) as interacciones
      FROM publicacion p
      JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE p.id_usuario = $1 AND p.id_cancion IS NOT NULL
      GROUP BY c.id_cancion, c.nombre, c.artista, c.album
    `, [id_usuario]);

    return {
      likes: likesResult.rows,
      comments: commentsResult.rows,
      posts: postsResult.rows
    };
  } catch (err) {
    console.error("Error obteniendo interacciones:", err);
    throw err;
  }
}

/**
 * Calcula puntajes de preferencia del usuario
 */
function calculatePreferences(interactions) {
  const artistScores = new Map();
  const genreScores = new Map();
  const songScores = new Map();

  // Pesos para cada tipo de interacción
  const weights = {
    posts: 5,      
    likes: 3,      
    comments: 4    
  };

  // Procesar todas las interacciones
  ['posts', 'likes', 'comments'].forEach(type => {
    interactions[type].forEach(item => {
      const weight = weights[type];
      const interactions = item.interacciones || 1;
      const score = weight * interactions;

      // Artistas preferidos
      const currentArtist = artistScores.get(item.artista) || 0;
      artistScores.set(item.artista, currentArtist + score);

      // Canciones vistas
      songScores.set(item.id_cancion, score);
    });
  });

  // Ordenar artistas por preferencia
  const topArtists = Array.from(artistScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist]) => artist);

  return {
    topArtists,
    artistScores,
    knownSongIds: Array.from(songScores.keys()),
    totalInteractions: interactions.posts.length + 
                      interactions.likes.length + 
                      interactions.comments.length
  };
}

// RECOMENDACIONES DE PUBLICACIONES

/**
 * GET /api/recomendaciones
 * Devuelve publicaciones recomendadas basadas en los gustos del usuario
 */
router.get("/", getUserFromEmail, async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;
    const limit = parseInt(req.query.limit) || 20;

    // 1. Obtener interacciones del usuario
    const interactions = await getUserInteractions(id_usuario);
    const preferences = calculatePreferences(interactions);

    // Si el usuario es nuevo, devolver publicaciones populares
    if (preferences.totalInteractions === 0) {
      
      const fallback = await pool.query(`
        SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, 
               p.publicacion, p.fecha_pub,
               c.id_cancion, c.nombre AS cancion, c.artista, c.album, 
               c.url_preview, c.imagen_url AS imagen_cancion,
               (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
               (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
        FROM publicacion p
        JOIN usuario u ON p.id_usuario = u.id_usuario
        LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
        WHERE p.id_cancion IS NOT NULL
        ORDER BY likes DESC, p.fecha_pub DESC
        LIMIT $1
      `, [limit]);

      return res.json({
        recommendations: fallback.rows,
        algorithm: "popular",
        reason: "Usuario sin interacciones previas"
      });
    }

    // 2. Buscar publicaciones de artistas similares
    const recommendations = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto,
            p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album,
            c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios,
            CASE 
              WHEN c.artista = ANY($2::text[]) THEN 3
              ELSE 1
            END as relevancia
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE p.id_usuario != $1
        AND c.id_cancion != ALL($3::varchar[])
        AND p.id_publicacion NOT IN (
          SELECT id_publicacion FROM reaccion WHERE id_usuario = $1
        )
        AND (
          c.artista = ANY($2::text[])
          OR c.album IN (
            SELECT DISTINCT album FROM cancion WHERE artista = ANY($2::text[])
          )
        )
      ORDER BY relevancia DESC, likes DESC, p.fecha_pub DESC
      LIMIT $4
    `, [id_usuario, preferences.topArtists, preferences.knownSongIds, limit]);

    return res.json({
      recommendations: recommendations.rows,
      algorithm: "collaborative_filtering",
      topArtists: preferences.topArtists.slice(0, 5)
    });

  } catch (err) {
    return responses.error(res, "Error obteniendo recomendaciones");
  }
});

//RECOMENDACIONES DE USUARIOS

/**
 * GET /api/recomendaciones/usuarios
 * Devuelve usuarios con gustos similares
 */
router.get("/usuarios", getUserFromEmail, async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;
    const limit = parseInt(req.query.limit) || 10;

    // 1. Obtener preferencias del usuario actual
    const interactions = await getUserInteractions(id_usuario);
    const preferences = calculatePreferences(interactions);

    if (preferences.totalInteractions === 0) {
      // Usuario nuevo: mostrar usuarios populares
      const popular = await pool.query(`
        SELECT u.id_usuario, u.usuario, u.correo, u.foto,
              COUNT(DISTINCT s.id_seguimiento) as seguidores
        FROM usuario u
        LEFT JOIN seguimiento s ON u.id_usuario = s.id_usuario_seguido
        WHERE u.id_usuario != $1
          AND u.estado = 'activo'
          AND u.id_usuario NOT IN (
            SELECT id_usuario_seguido FROM seguimiento WHERE id_usuario_seguidor = $1
          )
        GROUP BY u.id_usuario, u.usuario, u.correo, u.foto
        ORDER BY seguidores DESC
        LIMIT $2
      `, [id_usuario, limit]);

      return res.json({
        recommendations: popular.rows,
        algorithm: "popular_users",
        reason: "Usuario sin interacciones previas"
      });
    }

    // 2. Buscar usuarios que interactúan con los mismos artistas
    const similarUsers = await pool.query(`
      WITH user_artists AS (
        SELECT DISTINCT p.id_usuario, c.artista,
              COUNT(*) as interacciones
        FROM publicacion p
        JOIN cancion c ON p.id_cancion = c.id_cancion
        WHERE c.artista = ANY($2::text[])
          AND p.id_usuario != $1
        GROUP BY p.id_usuario, c.artista
      ),
      user_scores AS (
        SELECT ua.id_usuario,
              COUNT(DISTINCT ua.artista) as artistas_comunes,
              SUM(ua.interacciones) as total_interacciones
        FROM user_artists ua
        GROUP BY ua.id_usuario
      )
      SELECT u.id_usuario, u.usuario, u.correo, u.foto,
            us.artistas_comunes,
            us.total_interacciones,
            (SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguido = u.id_usuario) as seguidores
      FROM usuario u
      JOIN user_scores us ON u.id_usuario = us.id_usuario
      WHERE u.estado = 'activo'
        AND u.id_usuario NOT IN (
          SELECT id_usuario_seguido FROM seguimiento WHERE id_usuario_seguidor = $1
        )
      ORDER BY us.artistas_comunes DESC, us.total_interacciones DESC
      LIMIT $3
    `, [id_usuario, preferences.topArtists, limit]);

    return res.json({
      recommendations: similarUsers.rows,
      algorithm: "taste_matching",
      topArtists: preferences.topArtists.slice(0, 5)
    });

  } catch (err) {

    return responses.error(res, "Error obteniendo usuarios recomendados");
  }
});

// ANÁLISIS DE GUSTOs

/**
 * GET /api/recomendaciones/analisis
 * Devuelve un análisis detallado de los gustos del usuario
 */
router.get("/analisis", getUserFromEmail, async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;

    const interactions = await getUserInteractions(id_usuario);
    const preferences = calculatePreferences(interactions);

    // Obtener estadísticas detalladas
    const stats = {
      totalInteractions: preferences.totalInteractions,
      topArtists: Array.from(preferences.artistScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([artist, score]) => ({ artist, score })),
      recentActivity: {
        posts: interactions.posts.length,
        likes: interactions.likes.length,
        comments: interactions.comments.length
      }
    };

    return res.json(stats);

  } catch (err) {
    
    return responses.error(res, "Error obteniendo análisis");
  }
});

module.exports = router;