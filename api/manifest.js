// Función serverless de Vercel: guarda/lee la lista de reservas
// compartida por todos los invitados y el anfitrión.
//
// Usa Upstash Redis (integración de "Storage" en el panel de Vercel).
// Mientras no hayas conectado una base de datos, funciona en modo
// "demo" con memoria temporal (se reinicia de vez en cuando) para que
// la página nunca se rompa.

import { Redis } from "@upstash/redis";

const KEY = "boletos_fiesta_manifest";
const MAX_BYTES = 500_000; // límite razonable para evitar abuso

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Respaldo en memoria solo para cuando todavía no hay base de datos
// conectada (no persiste entre reinicios de la función).
globalThis.__memManifest = globalThis.__memManifest || [];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const data = redis ? await redis.get(KEY) : globalThis.__memManifest;
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (req.method === "POST") {
      const body = req.body;
      const list = typeof body === "string" ? JSON.parse(body) : body;
      if (!Array.isArray(list)) {
        return res.status(400).json({ error: "Se esperaba una lista." });
      }
      const size = JSON.stringify(list).length;
      if (size > MAX_BYTES) {
        return res.status(413).json({ error: "Datos demasiado grandes." });
      }
      if (redis) {
        await redis.set(KEY, list);
      } else {
        globalThis.__memManifest = list;
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno." });
  }
}
