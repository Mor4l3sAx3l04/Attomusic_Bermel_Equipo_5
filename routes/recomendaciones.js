// routes/recomendaciones.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const { getUserFromEmail } = require("../middleware/auth");

// ANÁLISIS DE GUSTOS DEL USUARIO 

async function getUserInteractions(id_usuario) {
  try {
    // Canciones con las que ha interactuado (likes en publicaciones)
    const likesResult = await pool.query(`
      SELECT DISTINCT c.id_cancion, c.nombre, c.artista, c.album, 
            COUNT(*) as interacciones
      FROM reaccion r
      JOIN publicacion p ON r.id_publicacion = p.id_publicacion
      JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE r.id_usuario = $1 AND r.tipo = 'like' AND p.id_cancion IS NOT NULL
      GROUP BY c.id_cancion, c.nombre, c.artista, c.album
    `, [id_usuario]);

    // Canciones en las que ha comentado (en publicaciones)
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

    // Canciones que ha calificado
    const ratingsResult = await pool.query(`
      SELECT id_cancion, 
             calificacion,
             1 as interacciones
      FROM calificaciones
      WHERE id_usuario = $1
    `, [id_usuario]);

    // Canciones en las que ha comentado (directamente)
    const songCommentsResult = await pool.query(`
      SELECT id_cancion,
             COUNT(*) as interacciones
      FROM comentarios_canciones
      WHERE id_usuario = $1
      GROUP BY id_cancion
    `, [id_usuario]);

    return {
      likes: likesResult.rows,
      comments: commentsResult.rows,
      posts: postsResult.rows,
      ratings: ratingsResult.rows,        
      songComments: songCommentsResult.rows 
    };
  } catch (err) {
    console.error("Error obteniendo interacciones:", err);
    throw err;
  }
}

function calculatePreferences(interactions) {
  const artistScores = new Map();
  const songScores = new Map();
  const songIds = new Set();

  // Pesos para cada tipo de interacción
  const weights = {
    posts: 5,          // Publicar una canción
    likes: 3,          // Like en publicación
    comments: 4,       // Comentar en publicación
    ratings: 2,        // Calificar canción (se multiplica por estrellas)
    songComments: 4    // Comentar directamente en canción
  };

  // Procesar interacciones tradicionales
  ['posts', 'likes', 'comments'].forEach(type => {
    interactions[type].forEach(item => {
      const weight = weights[type];
      const interactionCount = item.interacciones || 1;
      const score = weight * interactionCount;

      // Artistas preferidos
      if (item.artista) {
        const currentArtist = artistScores.get(item.artista) || 0;
        artistScores.set(item.artista, currentArtist + score);
      }

      // Canciones vistas
      songScores.set(item.id_cancion, (songScores.get(item.id_cancion) || 0) + score);
      songIds.add(item.id_cancion);
    });
  });

  // Procesar calificaciones
  if (interactions.ratings) {
    interactions.ratings.forEach(rating => {
      // Peso basado en las estrellas (1-5)
      const score = weights.ratings * rating.calificacion;
      
      songScores.set(rating.id_cancion, (songScores.get(rating.id_cancion) || 0) + score);
      songIds.add(rating.id_cancion);
    });
  }

  // Procesar comentarios directos en canciones
  if (interactions.songComments) {
    interactions.songComments.forEach(comment => {
      const score = weights.songComments * comment.interacciones;
      
      songScores.set(comment.id_cancion, (songScores.get(comment.id_cancion) || 0) + score);
      songIds.add(comment.id_cancion);
    });
  }

  // Ordenar artistas por preferencia
  const topArtists = Array.from(artistScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist]) => artist);

  return {
    topArtists,
    artistScores,
    knownSongIds: Array.from(songIds),
    totalInteractions: interactions.posts.length + 
                      interactions.likes.length + 
                      interactions.comments.length +
                      (interactions.ratings?.length || 0) +
                      (interactions.songComments?.length || 0)
  };
}

async function enriquecerCancionesSpotify(cancionIds) {
  if (!cancionIds || cancionIds.length === 0) return new Map();

  const cancionInfo = new Map();
  
  try {
    // Buscar info en Spotify para cada canción
    const promesas = cancionIds.slice(0, 20).map(async (idCancion) => {
      try {
        const API_URL = process.env.API_URL || 'http://localhost:3000';
        const response = await axios.get(`${API_URL}/spotify/track/${idCancion}`);
        const track = response.data;
        
        if (track && track.artists) {
          cancionInfo.set(idCancion, {
            artista: track.artists.map(a => a.name).join(", "),
            album: track.album?.name,
            nombre: track.name
          });
        }
      } catch (err) {
        console.warn(`No se pudo obtener info de canción ${idCancion}`);
      }
    });

    await Promise.allSettled(promesas);
  } catch (err) {
    console.error('Error enriqueciendo canciones:', err);
  }

  return cancionInfo;
}

async function getUserInteractionsEnriquecidas(id_usuario) {
  const interactions = await getUserInteractions(id_usuario);
  
  // Obtener IDs de canciones que NO tienen info de artista
  const cancionesSinInfo = [
    ...(interactions.ratings || []).map(r => r.id_cancion),
    ...(interactions.songComments || []).map(c => c.id_cancion)
  ].filter(id => id);

  // Enriquecer con info de Spotify
  const spotifyInfo = await enriquecerCancionesSpotify(cancionesSinInfo);

  // Agregar info de artista a las calificaciones y comentarios
  if (interactions.ratings) {
    interactions.ratings = interactions.ratings.map(rating => {
      const info = spotifyInfo.get(rating.id_cancion);
      return {
        ...rating,
        artista: info?.artista,
        album: info?.album,
        nombre: info?.nombre
      };
    });
  }

  if (interactions.songComments) {
    interactions.songComments = interactions.songComments.map(comment => {
      const info = spotifyInfo.get(comment.id_cancion);
      return {
        ...comment,
        artista: info?.artista,
        album: info?.album,
        nombre: info?.nombre
      };
    });
  }

  return interactions;
}


async function calculatePreferencesEnriquecidas(id_usuario) {
  const interactions = await getUserInteractionsEnriquecidas(id_usuario);
  
  const artistScores = new Map();
  const songScores = new Map();
  const songIds = new Set();

  const weights = {
    posts: 5,
    likes: 3,
    comments: 4,
    ratings: 2,
    songComments: 4
  };

  // Procesar interacciones tradicionales
  ['posts', 'likes', 'comments'].forEach(type => {
    interactions[type].forEach(item => {
      const weight = weights[type];
      const interactionCount = item.interacciones || 1;
      const score = weight * interactionCount;

      if (item.artista) {
        const currentArtist = artistScores.get(item.artista) || 0;
        artistScores.set(item.artista, currentArtist + score);
      }

      songScores.set(item.id_cancion, (songScores.get(item.id_cancion) || 0) + score);
      songIds.add(item.id_cancion);
    });
  });

  // Procesar calificaciones
  if (interactions.ratings) {
    interactions.ratings.forEach(rating => {
      const score = weights.ratings * rating.calificacion;
      
      // Agregar puntaje al artista si existe
      if (rating.artista) {
        const currentArtist = artistScores.get(rating.artista) || 0;
        artistScores.set(rating.artista, currentArtist + score);
      }
      
      songScores.set(rating.id_cancion, (songScores.get(rating.id_cancion) || 0) + score);
      songIds.add(rating.id_cancion);
    });
  }

  // Procesar comentarios
  if (interactions.songComments) {
    interactions.songComments.forEach(comment => {
      const score = weights.songComments * comment.interacciones;
      
      if (comment.artista) {
        const currentArtist = artistScores.get(comment.artista) || 0;
        artistScores.set(comment.artista, currentArtist + score);
      }
      
      songScores.set(comment.id_cancion, (songScores.get(comment.id_cancion) || 0) + score);
      songIds.add(comment.id_cancion);
    });
  }

  const topArtists = Array.from(artistScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist]) => artist);

  return {
    topArtists,
    artistScores,
    knownSongIds: Array.from(songIds),
    totalInteractions: interactions.posts.length + 
                      interactions.likes.length + 
                      interactions.comments.length +
                      (interactions.ratings?.length || 0) +
                      (interactions.songComments?.length || 0)
  };
}

// RECOMENDACIONES DE PUBLICACIONES

router.get("/", getUserFromEmail, async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;
    const limit = parseInt(req.query.limit) || 20;

    // 1. Obtener interacciones del usuario (CON info enriquecida)
    const preferences = await calculatePreferencesEnriquecidas(id_usuario);

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
      topArtists: preferences.topArtists.slice(0, 5),
      totalInteractions: preferences.totalInteractions
    });

  } catch (err) {
    console.error('Error en recomendaciones:', err);
    return responses.error(res, "Error obteniendo recomendaciones");
  }
});

//RECOMENDACIONES DE USUARIOS

router.get("/usuarios", getUserFromEmail, async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;
    const limit = parseInt(req.query.limit) || 10;

    // 1. Obtener preferencias del usuario actual
    const preferences = await calculatePreferencesEnriquecidas(id_usuario);

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

    // 2. Buscar usuarios con calificaciones/comentarios en canciones similares
    const similarUsers = await pool.query(`
      WITH user_songs AS (
        -- Usuarios que calificaron las mismas canciones
        SELECT id_usuario, id_cancion, 
               calificacion as score
        FROM calificaciones
        WHERE id_cancion = ANY($2::varchar[])
          AND id_usuario != $1
        
        UNION ALL
        
        -- Usuarios que comentaron las mismas canciones
        SELECT id_usuario, id_cancion,
               5 as score
        FROM comentarios_canciones
        WHERE id_cancion = ANY($2::varchar[])
          AND id_usuario != $1
      ),
      user_scores AS (
        SELECT us.id_usuario,
              COUNT(DISTINCT us.id_cancion) as canciones_comunes,
              AVG(us.score) as avg_score,
              SUM(us.score) as total_score
        FROM user_songs us
        GROUP BY us.id_usuario
      )
      SELECT u.id_usuario, u.usuario, u.correo, u.foto,
            COALESCE(us.canciones_comunes, 0) as canciones_comunes,
            COALESCE(us.avg_score, 0) as avg_score,
            (SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguido = u.id_usuario) as seguidores
      FROM usuario u
      LEFT JOIN user_scores us ON u.id_usuario = us.id_usuario
      WHERE u.estado = 'activo'
        AND u.id_usuario != $1
        AND u.id_usuario NOT IN (
          SELECT id_usuario_seguido FROM seguimiento WHERE id_usuario_seguidor = $1
        )
        AND us.canciones_comunes > 0
      ORDER BY us.canciones_comunes DESC, us.total_score DESC, seguidores DESC
      LIMIT $3
    `, [id_usuario, preferences.knownSongIds, limit]);

    return res.json({
      recommendations: similarUsers.rows,
      algorithm: "taste_matching_enhanced",
      topArtists: preferences.topArtists.slice(0, 5)
    });

  } catch (err) {
    console.error('Error en recomendaciones de usuarios:', err);
    return responses.error(res, "Error obteniendo usuarios recomendados");
  }
});

// ANÁLISIS DE GUSTOS
router.get("/analisis", getUserFromEmail, async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;

    const preferences = await calculatePreferencesEnriquecidas(id_usuario);
    const interactions = await getUserInteractionsEnriquecidas(id_usuario);

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
        comments: interactions.comments.length,
        ratings: interactions.ratings?.length || 0,          
        songComments: interactions.songComments?.length || 0 
      },
      //Promedio de calificaciones del usuario
      averageRating: interactions.ratings?.length > 0
        ? (interactions.ratings.reduce((sum, r) => sum + r.calificacion, 0) / interactions.ratings.length).toFixed(1)
        : 0
    };

    return res.json(stats);

  } catch (err) {
    console.error('Error en análisis:', err);
    return responses.error(res, "Error obteniendo análisis");
  }
});

module.exports = router;