import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "OK" : "NO CARGADA");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function validarPublicacion(publicacion) {
    const prompt = `
Eres un sistema de moderación avanzado para una red social.

Tu TAREA:
Analizar un comentario y responder SOLO un JSON válido SIN nada más.

Debes detectar:
- lenguaje ofensivo, insultos, odio  
- contenido sexual o explícito  
- violencia o amenazas  
- discriminación  
- contenido perturbador  
- spam  
- repetición excesiva de palabras  
- cadenas sin sentido  
- promoción engañosa  
- texto generado automáticamente o repetitivo  
- flood / mismo mensaje repetido  
- intentos de evadir filtros con símbolos  

ESTRUCTURA DE RESPUESTA ÚNICA (JSON PURO):

{
    "apto": true/false,
    "razon": "explicación breve de por qué se acepta o rechaza",
    "categorias": ["hate", "violencia", "sexual", "spam", "nsfw", "repetitivo", "nonsense"]
}

Comportamiento:
- Si detectas repetición (ej: "hola hola hola hola") → "apto": false + categoria "repetitivo".
- Si detectas spam o flood → "apto": false + categoria "spam".
- Si el comentario es ofensivo → "apto": false + categoria "hate".
- Si está limpio y es normal → "apto": true.

Comentario a analizar:
"${publicacion}"
`;

    const result = await model.generateContent(prompt);
    let respuesta = result.response.text();

    console.log("Respuesta cruda de Gemini:", respuesta);

    try {
        // EXTRAER SOLO EL JSON
        const jsonMatch = respuesta.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("No se encontró JSON válido");
        }

        const jsonStr = jsonMatch[0];

        const moderacion = JSON.parse(jsonStr);

        return moderacion;
    } catch (e) {
        console.error("Error procesando JSON de Gemini:", e);
        return {
            apto: false,
            razon: "Error analizando texto",
            categorias: ["error"]
        };
    }
}

export { validarPublicacion };