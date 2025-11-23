import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY no está definida.");
    process.exit(1);
}

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
    "razon": "explicación breve",
    "categorias": ["hate", "violencia", "sexual", "spam", "nsfw", "repetitivo", "nonsense"]
}

Comentario a analizar:
"${publicacion}"
`;

    try {
        const result = await model.generateContent(prompt);
        const respuesta = result.response.text();

        // EXTRAER JSON
        const jsonMatch = respuesta.match(/\{[\s\S]*\}/);

        if (!jsonMatch) throw new Error("JSON inválido");
        
        return JSON.parse(jsonMatch[0]);

    } catch (err) {
        console.error("Error al validar publicación con Gemini:", err);

        // Retornar error seguro
        return {
            apto: false,
            razon: "Error al analizar el texto",
            categorias: ["error"]
        };
    }
}

export { validarPublicacion };
