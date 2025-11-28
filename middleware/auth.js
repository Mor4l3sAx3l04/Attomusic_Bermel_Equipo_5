// middleware/auth.js
const pool = require("../utils/database");
const responses = require("../utils/responses");
const queries = require("../utils/queries");

async function getUserFromEmail(req, res, next) {
  try {
    const correo = req.body.correo || req.query.correo;
    
    if (!correo) {
      return responses.unauthorized(res, "Usuario no autenticado");
    }

    const result = await pool.query(queries.getUserIdByEmail, [correo]);
    
    if (result.rowCount === 0) {
      return responses.notFound(res, "Usuario");
    }

    req.user = {
      id_usuario: result.rows[0].id_usuario,
      correo: correo
    };
    
    next();
  } catch (err) {
    console.error("Error en auth middleware:", err);
    return responses.error(res, "Error de autenticación");
  }
}

async function requireAdmin(req, res, next) {
  try {
    const correo = req.body.correo || req.query.correo;
    
    if (!correo) {
      return responses.unauthorized(res, "Usuario no autenticado");
    }

    const result = await pool.query(queries.getUserByEmail, [correo]);
    
    if (result.rowCount === 0) {
      return responses.notFound(res, "Usuario");
    }

    const user = result.rows[0];

    if (user.rol !== 'admin') {
      return responses.forbidden(res, "Acceso denegado. Solo administradores");
    }

    req.user = {
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol
    };
    
    next();
  } catch (err) {
    console.error("Error en admin middleware:", err);
    return responses.error(res, "Error de autenticación");
  }
}

module.exports = {
  getUserFromEmail,
  requireAdmin
};