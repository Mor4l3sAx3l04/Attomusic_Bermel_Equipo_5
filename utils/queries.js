// utils/queries.js
const queries = {
  // USUARIOS
  getUserByEmail: "SELECT * FROM usuario WHERE correo = $1",
  getUserById: "SELECT * FROM usuario WHERE id_usuario = $1",
  getUserIdByEmail: "SELECT id_usuario FROM usuario WHERE correo = $1",
  checkUserExists: "SELECT * FROM usuario WHERE usuario = $1 OR correo = $2",
  
  // PUBLICACIONES
  getAllPosts: `
    SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
           c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
           (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
           (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
    FROM publicacion p
    JOIN usuario u ON p.id_usuario = u.id_usuario
    LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
    ORDER BY p.fecha_pub DESC
  `,
  
  getPostsByUserId: `
    SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
           c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
           (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
           (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
    FROM publicacion p
    JOIN usuario u ON p.id_usuario = u.id_usuario
    LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
    WHERE u.id_usuario = $1
    ORDER BY p.fecha_pub DESC
  `,
  
  // REACCIONES
  checkLikeExists: "SELECT * FROM reaccion WHERE id_publicacion = $1 AND id_usuario = $2 AND tipo = 'like'",
  addLike: "INSERT INTO reaccion (id_publicacion, id_usuario, tipo) VALUES ($1, $2, 'like')",
  removeLike: "DELETE FROM reaccion WHERE id_publicacion = $1 AND id_usuario = $2 AND tipo = 'like'",
  getUserLikes: "SELECT id_publicacion FROM reaccion WHERE id_usuario = $1 AND tipo = 'like'",
  
  // COMENTARIOS
  addComment: "INSERT INTO comentario (id_publicacion, id_usuario, comentario, fecha_com) VALUES ($1, $2, $3, NOW())",
  getCommentsByPost: `
    SELECT c.id_comentario, c.comentario, c.fecha_com, u.usuario
    FROM comentario c
    JOIN usuario u ON c.id_usuario = u.id_usuario
    WHERE c.id_publicacion = $1
    ORDER BY c.fecha_com DESC
  `,
  
  // SEGUIMIENTO
  checkFollow: "SELECT * FROM seguimiento WHERE id_usuario_seguidor = $1 AND id_usuario_seguido = $2",
  addFollow: "INSERT INTO seguimiento (id_usuario_seguidor, id_usuario_seguido) VALUES ($1, $2)",
  removeFollow: "DELETE FROM seguimiento WHERE id_usuario_seguidor = $1 AND id_usuario_seguido = $2",
  
  countFollowers: "SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguido = $1",
  countFollowing: "SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguidor = $1",
  
  getFollowers: `
    SELECT u.id_usuario, u.usuario, u.correo, u.foto
    FROM seguimiento s
    JOIN usuario u ON s.id_usuario_seguidor = u.id_usuario
    WHERE s.id_usuario_seguido = $1
    ORDER BY s.id_seguimiento DESC
  `,
  
  getFollowing: `
    SELECT u.id_usuario, u.usuario, u.correo, u.foto
    FROM seguimiento s
    JOIN usuario u ON s.id_usuario_seguido = u.id_usuario
    WHERE s.id_usuario_seguidor = $1
    ORDER BY s.id_seguimiento DESC
  `,
  
  // CANCIONES
  checkSongExists: "SELECT id_cancion FROM cancion WHERE id_cancion = $1",
  insertSong: `
    INSERT INTO cancion (id_cancion, nombre, artista, album, url_preview, imagen_url)
    VALUES ($1, $2, $3, $4, $5, $6)
  `,
  
  // REPORTES
  checkReportExists: "SELECT * FROM reporte WHERE id_publicacion = $1 AND id_usuario = $2",
  addReport: "INSERT INTO reporte (id_publicacion, id_usuario, motivo, fecha_rep) VALUES ($1, $2, $3, NOW())",
};

module.exports = queries;