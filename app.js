// app.js
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const axios = require("axios");

// 👇 IMPORTA las rutas de Spotify
const spotifyRoutes = require("./routes/spotify");
const newsRoutes = require("./routes/news");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Usa las rutas Spotify en /spotify
app.use("/spotify", spotifyRoutes);
app.use("/music-news", newsRoutes);

// CONEXIÓN A POSTGRESQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log("✅ Conectado a PostgreSQL"))
  .catch(err => console.error("❌ Error de conexión:", err));

// RUTA: Registro de usuario
app.post("/register", async (req, res) => {
  const { usuario, correo, contrasena } = req.body;

  if (!usuario || !correo || !contrasena) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    // Verificar si ya existe usuario o correo
    const existe = await pool.query(
      "SELECT * FROM usuario WHERE usuario = $1 OR correo = $2",
      [usuario, correo]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ error: "Usuario o correo ya registrado" });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Insertar nuevo usuario
    await pool.query(
      `INSERT INTO usuario (usuario, correo, contrasena, fecha_reg, rol, estado)
      VALUES ($1, $2, $3, CURRENT_DATE, 'usuario', 'activo')`,
      [usuario, correo, hashedPassword]
    );

    res.json({ message: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("❌ Error en registro:", err);
    res.status(500).json({ error: "Error en el registro de usuario" });
  }
});

// RUTA: Inicio de sesión
app.post("/login", async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: "Faltan usuario o contraseña" });
  }

  try {
    // Buscar usuario
    const result = await pool.query("SELECT * FROM usuario WHERE usuario = $1", [usuario]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // Comparar contraseñas
    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    res.json({
      message: "Inicio de sesión exitoso",
      user: {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error("❌ Error en login:", err);
    res.status(500).json({ error: "Error en inicio de sesión" });
  }
});

// 🚀 Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
