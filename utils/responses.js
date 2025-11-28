// utils/responses.js
const responses = {
  success: (res, data = null, message = "Éxito") => {
    return res.json({ 
      success: true, 
      message, 
      ...(data && { data }) 
    });
  },

  error: (res, message, status = 500) => {
    return res.status(status).json({ error: message });
  },

  notFound: (res, item = "Recurso") => {
    return res.status(404).json({ error: `${item} no encontrado` });
  },

  badRequest: (res, message) => {
    return res.status(400).json({ error: message });
  },

  unauthorized: (res, message = "No autorizado") => {
    return res.status(401).json({ error: message });
  },

  forbidden: (res, message = "Acceso denegado") => {
    return res.status(403).json({ error: message });
  }
};

module.exports = responses;