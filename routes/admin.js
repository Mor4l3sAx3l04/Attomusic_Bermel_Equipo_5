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
    console.error("❌ Error en /api/usuario/:correo/rol:", err.message);
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
    console.log("✅ Reportes encontrados:", result.rows.length);
    return res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /api/admin/reportes:", err.message);
    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Resolver reporte
router.post("/reporte/:id/resolver", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "UPDATE reporte SET estado = 'resuelto' WHERE id_publicacion = $1";
    await pool.query(query, [id]);
    console.log("✅ Reporte resuelto:", id);
    return res.json({ message: "Reporte resuelto" });
  } catch (err) {
    console.error("❌ Error resolviendo reporte:", err.message);
    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Limpiar reportes resueltos
router.delete("/reportes/limpiar", async (req, res) => {
  try {
    const query = "DELETE FROM reporte WHERE estado = 'resuelto'";
    const result = await pool.query(query);
    console.log("✅ Reportes eliminados:", result.rowCount);
    return res.json({ message: "Reportes limpiados" });
  } catch (err) {
    console.error("❌ Error limpiando reportes:", err.message);
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
    console.log("✅ Publicaciones encontradas:", result.rows.length);
    return res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /api/admin/publicaciones:", err.message);
    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Eliminar publicación (admin)
router.delete("/publicacion/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("🗑️ Eliminando publicación:", id);
    await client.query("DELETE FROM comentario WHERE id_publicacion = $1", [id]);
    await client.query("DELETE FROM reaccion WHERE id_publicacion = $1", [id]);
    await client.query("DELETE FROM reporte WHERE id_publicacion = $1", [id]);
    await client.query("DELETE FROM publicacion WHERE id_publicacion = $1", [id]);

    await client.query("COMMIT");
    console.log("✅ Publicación eliminada correctamente");
    return res.json({ message: "Publicación eliminada correctamente" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error eliminando publicación:", err.message);
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
    console.log("✅ Usuarios encontrados:", result.rows.length);
    return res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /api/admin/usuarios:", err.message);
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
    console.log(`✅ Rol cambiado a ${nuevoRol} para usuario ${id}`);
    return res.json({ message: "Rol actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error cambiando rol:", err.message);
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
    console.log(`✅ Usuario ${id} baneado hasta ${fechaBaneo.toLocaleDateString()}`);
    return res.json({ message: "Usuario baneado correctamente" });
  } catch (err) {
    console.error("❌ Error baneando usuario:", err.message);
    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Desbanear usuario
router.post("/usuario/:id/desbanear", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "UPDATE usuario SET fecha_baneo = NULL, motivo_baneo = NULL WHERE id_usuario = $1";
    await pool.query(query, [id]);
    console.log(`✅ Usuario ${id} desbaneado`);
    return res.json({ message: "Usuario desbaneado correctamente" });
  } catch (err) {
    console.error("❌ Error desbaneando usuario:", err.message);
    return responses.error(res, "Error en el servidor");
  }
});

// RUTA: Eliminar usuario
router.delete("/usuario/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("🗑️ Eliminando usuario:", id);

    await client.query("DELETE FROM comentario WHERE id_usuario = $1", [id]);
    console.log("  ✓ Comentarios eliminados");

    await client.query("DELETE FROM reaccion WHERE id_usuario = $1", [id]);
    console.log("  ✓ Reacciones eliminadas");

    await client.query("DELETE FROM reporte WHERE id_usuario = $1", [id]);
    console.log("  ✓ Reportes eliminados");

    await client.query(
      "DELETE FROM seguimiento WHERE id_usuario_seguidor = $1 OR id_usuario_seguido = $2",
      [id, id]
    );
    console.log("  ✓ Seguimientos eliminados");

    await client.query("DELETE FROM publicacion WHERE id_usuario = $1", [id]);
    console.log("  ✓ Publicaciones eliminadas");

    await client.query("DELETE FROM usuario WHERE id_usuario = $1", [id]);
    console.log("  ✓ Usuario eliminado");

    await client.query("COMMIT");
    console.log("✅ Usuario eliminado correctamente");
    return res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error eliminando usuario:", err.message);
    return responses.error(res, "Error al eliminar usuario");
  } finally {
    client.release();
  }
});

module.exports = router;