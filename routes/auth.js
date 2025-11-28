// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const queries = require("../utils/queries");

// RUTA: Registro de usuario
router.post("/register", async (req, res) => {
  const { usuario, correo, contrasena } = req.body;

  if (!usuario || !correo || !contrasena) {
    return responses.badRequest(res, "Faltan campos obligatorios");
  }

  try {
    const existe = await pool.query(queries.checkUserExists, [usuario, correo]);

    if (existe.rows.length > 0) {
      return responses.badRequest(res, "Usuario o correo ya registrado");
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    await pool.query(
      `INSERT INTO usuario (usuario, correo, contrasena, fecha_reg, rol, estado)
      VALUES ($1, $2, $3, CURRENT_DATE, 'usuario', 'activo')`,
      [usuario, correo, hashedPassword]
    );

    return res.json({ message: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error en registro:", err);
    return responses.error(res, "Error en el registro de usuario");
  }
});

// RUTA: Inicio de sesión
router.post("/login", async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return responses.badRequest(res, "Faltan usuario o contraseña");
  }

  try {
    const result = await pool.query("SELECT * FROM usuario WHERE usuario = $1", [usuario]);
    
    if (result.rows.length === 0) {
      return responses.unauthorized(res, "Usuario no encontrado");
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) {
      return responses.unauthorized(res, "Contraseña incorrecta");
    }

    return res.json({
      message: "Inicio de sesión exitoso",
      user: {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    return responses.error(res, "Error en inicio de sesión");
  }
});

// RUTA: Restablecer contraseña
router.post("/reset-password", async (req, res) => {
  const { nombre, correo, nuevaContrasena } = req.body;

  if (!nombre || !correo || !nuevaContrasena) {
    return responses.badRequest(res, "Faltan datos obligatorios");
  }

  if (nuevaContrasena.length < 6) {
    return responses.badRequest(res, "La contraseña debe tener al menos 6 caracteres");
  }

  try {
    const userResult = await pool.query(
      "SELECT id_usuario FROM usuario WHERE usuario = $1 AND correo = $2",
      [nombre, correo]
    );

    if (userResult.rowCount === 0) {
      return responses.notFound(res, "Usuario o correo incorrectos");
    }

    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    await pool.query(
      "UPDATE usuario SET contrasena = $1 WHERE correo = $2",
      [hashedPassword, correo]
    );

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Error en reset-password:", err);
    return responses.error(res, "Error al actualizar la contraseña");
  }
});

module.exports = router;