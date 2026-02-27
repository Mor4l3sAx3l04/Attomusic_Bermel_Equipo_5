// routes/admin.js
const express = require("express");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const queries = require("../utils/queries");

// RUTA: Verificar rol del usuario
router.get("/usuario/:correo/rol", async (req, res) => {
  const { correo } = req.params;

  try {
    const result = await pool.query("SELECT rol FROM usuario WHERE correo = $1", [correo]);

    if (result.rows.length === 0) {
      return responses.notFound(res, "Usuario");
    }

    return res.json({ rol: result.rows[0].rol });
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Obtener publicaciones reportadas
router.get("/reportes", async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.usuario, u.correo,
             (SELECT COUNT(*) FROM reporte r WHERE r.id_publicacion = p.id_publicacion AND r.estado = 'pendiente') as num_reportes
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE p.id_publicacion IN (
        SELECT DISTINCT id_publicacion FROM reporte WHERE estado = 'pendiente'
      )
      ORDER BY num_reportes DESC, p.fecha_pub DESC
    `;

    const result = await pool.query(query);

    return res.json(result.rows);
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Resolver reporte
router.post("/reporte/:id/resolver", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "UPDATE reporte SET estado = 'resuelto' WHERE id_publicacion = $1";
    await pool.query(query, [id]);

    return res.json({ message: "Reporte resuelto" });
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Limpiar reportes resueltos
router.delete("/reportes/limpiar", async (req, res) => {
  try {
    const query = "DELETE FROM reporte WHERE estado = 'resuelto'";
    const result = await pool.query(query);

    return res.json({ message: "Reportes limpiados" });
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Obtener todas las publicaciones
router.get("/publicaciones", async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.usuario, u.correo,
             (SELECT COUNT(*) FROM reaccion r WHERE r.id_publicacion = p.id_publicacion) as likes,
             (SELECT COUNT(*) FROM comentario c WHERE c.id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      ORDER BY p.fecha_pub DESC
    `;

    const result = await pool.query(query);

    return res.json(result.rows);
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Eliminar publicación (admin)
router.delete("/publicacion/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM comentario WHERE id_publicacion = $1", [id]);
    await client.query("DELETE FROM reaccion WHERE id_publicacion = $1", [id]);
    await client.query("DELETE FROM reporte WHERE id_publicacion = $1", [id]);
    await client.query("DELETE FROM publicacion WHERE id_publicacion = $1", [id]);

    await client.query("COMMIT");

    return res.json({ message: "Publicación eliminada correctamente" });
  } catch (err) {
    await client.query("ROLLBACK");

    return responses.error(res, "Error al eliminar publicación");
  } finally {
    client.release();
  }
});

// RUTA: Obtener todos los usuarios
router.get("/usuarios", async (req, res) => {
  try {
    const query = `
      SELECT id_usuario, usuario, correo, foto, fecha_reg, rol, fecha_baneo, estado
      FROM usuario
      ORDER BY fecha_reg DESC
    `;

    const result = await pool.query(query);

    return res.json(result.rows);
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Cambiar rol de usuario
router.put("/usuario/:id/rol", async (req, res) => {
  const { id } = req.params;
  const { nuevoRol } = req.body;

  if (!["admin", "usuario"].includes(nuevoRol)) {
    return responses.badRequest(res, "Rol inválido");
  }

  try {
    const query = "UPDATE usuario SET rol = $1 WHERE id_usuario = $2";
    await pool.query(query, [nuevoRol, id]);

    return res.json({ message: "Rol actualizado correctamente" });
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Banear usuario temporalmente
router.post("/usuario/:id/banear", async (req, res) => {
  const { id } = req.params;
  const { dias, motivo } = req.body;

  const fechaBaneo = new Date();
  fechaBaneo.setDate(fechaBaneo.getDate() + parseInt(dias));

  try {
    const query = "UPDATE usuario SET fecha_baneo = $1, motivo_baneo = $2 WHERE id_usuario = $3";
    await pool.query(query, [fechaBaneo, motivo, id]);

    return res.json({ message: "Usuario baneado correctamente" });
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Desbanear usuario
router.post("/usuario/:id/desbanear", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "UPDATE usuario SET fecha_baneo = NULL, motivo_baneo = NULL WHERE id_usuario = $1";
    await pool.query(query, [id]);

    return res.json({ message: "Usuario desbaneado correctamente" });
  } catch (err) {

    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Eliminar usuario
router.delete("/usuario/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM comentario WHERE id_usuario = $1", [id]);

    await client.query("DELETE FROM reaccion WHERE id_usuario = $1", [id]);

    await client.query("DELETE FROM reporte WHERE id_usuario = $1", [id]);

    await client.query(
      "DELETE FROM seguimiento WHERE id_usuario_seguidor = $1 OR id_usuario_seguido = $2",
      [id, id]
    );

    await client.query("DELETE FROM publicacion WHERE id_usuario = $1", [id]);

    await client.query("DELETE FROM usuario WHERE id_usuario = $1", [id]);

    await client.query("COMMIT");
    return res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    await client.query("ROLLBACK");
    return responses.error(res, "Error al eliminar usuario");
  } finally {
    client.release();
  }
});

// RUTA: Obtener cuentas eliminadas por sus propios usuarios
router.get("/cuentas-eliminadas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id_registro, id_usuario, usuario, correo, motivo, fecha_eliminacion
      FROM cuenta_eliminada
      ORDER BY fecha_eliminacion DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo cuentas eliminadas:", err);
    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Estadísticas generales para el dashboard
router.get("/estadisticas", async (req, res) => {
  try {
    const [
      usuariosActivos,
      generosTop,
      artistasTop,
      cancionesTop,
      resumenCuentas,
      publicacionesPorDia,
      usuariosTop,
      distribucionRoles,
      reportesPorMes,
    ] = await Promise.all([

      // 1) Usuarios más activos (por publicaciones + likes + comentarios)
      pool.query(`
        SELECT u.usuario,
               COUNT(DISTINCT p.id_publicacion) AS publicaciones,
               COUNT(DISTINCT r.id_reaccion)    AS likes_dados,
               COUNT(DISTINCT c.id_comentario)  AS comentarios
        FROM usuario u
        LEFT JOIN publicacion  p ON p.id_usuario = u.id_usuario
        LEFT JOIN reaccion     r ON r.id_usuario = u.id_usuario
        LEFT JOIN comentario   c ON c.id_usuario = u.id_usuario
        GROUP BY u.id_usuario, u.usuario
        ORDER BY (COUNT(DISTINCT p.id_publicacion) + COUNT(DISTINCT r.id_reaccion) + COUNT(DISTINCT c.id_comentario)) DESC
        LIMIT 8
      `),

      // 2) Géneros más escuchados (de canciones en publicaciones)
      pool.query(`
        SELECT COALESCE(c.genero, 'Sin género') AS genero, COUNT(*) AS total
        FROM publicacion p
        JOIN cancion c ON p.id_cancion = c.id_cancion
        WHERE c.genero IS NOT NULL
        GROUP BY c.genero
        ORDER BY total DESC
        LIMIT 10
      `),

      // 3) Artistas más oídos (en publicaciones)
      pool.query(`
        SELECT c.artista, COUNT(*) AS menciones
        FROM publicacion p
        JOIN cancion c ON p.id_cancion = c.id_cancion
        GROUP BY c.artista
        ORDER BY menciones DESC
        LIMIT 10
      `),

      // 4) Canciones más calificadas (promedio + total calificaciones)
      pool.query(`
        SELECT c.nombre, c.artista,
               ROUND(AVG(cal.calificacion)::numeric, 1) AS promedio,
               COUNT(*) AS total_calificaciones
        FROM calificaciones cal
        JOIN cancion c ON cal.id_cancion = c.id_cancion
        GROUP BY c.id_cancion, c.nombre, c.artista
        ORDER BY total_calificaciones DESC
        LIMIT 8
      `),

      // 5) Resumen de cuentas (activas vs eliminadas)
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM usuario WHERE estado = 'activo') AS activas,
          (SELECT COUNT(*) FROM cuenta_eliminada)                AS eliminadas,
          (SELECT COUNT(*) FROM usuario WHERE fecha_baneo IS NOT NULL AND fecha_baneo > NOW()) AS baneadas
      `),

      // 6) Publicaciones por día (últimos 14 días)
      pool.query(`
        SELECT DATE(fecha_pub) AS dia, COUNT(*) AS total
        FROM publicacion
        WHERE fecha_pub >= NOW() - INTERVAL '14 days'
        GROUP BY dia
        ORDER BY dia ASC
      `),

      // 7) Top usuarios por seguidores
      pool.query(`
        SELECT u.usuario, COUNT(s.id_seguimiento) AS seguidores
        FROM usuario u
        LEFT JOIN seguimiento s ON s.id_usuario_seguido = u.id_usuario
        GROUP BY u.id_usuario, u.usuario
        ORDER BY seguidores DESC
        LIMIT 8
      `),

      // 8) Distribución de roles
      pool.query(`
        SELECT rol, COUNT(*) AS total FROM usuario GROUP BY rol
      `),

      // 9) Cuentas eliminadas por mes (últimos 6 meses)
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', fecha_eliminacion), 'Mon YYYY') AS mes,
               COUNT(*) AS total
        FROM cuenta_eliminada
        WHERE fecha_eliminacion >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', fecha_eliminacion)
        ORDER BY DATE_TRUNC('month', fecha_eliminacion) ASC
      `),
    ]);

    return res.json({
      usuariosActivos: usuariosActivos.rows,
      generosTop: generosTop.rows,
      artistasTop: artistasTop.rows,
      cancionesTop: cancionesTop.rows,
      resumenCuentas: resumenCuentas.rows[0],
      publicacionesPorDia: publicacionesPorDia.rows,
      usuariosTop: usuariosTop.rows,
      distribucionRoles: distribucionRoles.rows,
      reportesPorMes: reportesPorMes.rows,
    });
  } catch (err) {
    console.error("Error obteniendo estadísticas:", err);
    return responses.error(res, "Error al obtener estadísticas");
  }
});

module.exports = router;
