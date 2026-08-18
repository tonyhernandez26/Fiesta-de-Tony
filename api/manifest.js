// Función serverless de Vercel: guarda/lee la lista de reservas
// compartida por todos los invitados y el anfitrión.
//
// Usa Neon (PostgreSQL sin servidor, integración de "Storage" en el
// panel de Vercel). Mientras no hayas conectado una base de datos,
// funciona en modo "demo" con memoria temporal (se reinicia de vez en
// cuando) para que la página nunca se rompa.

import { neon } from "@neondatabase/serverless";

const MAX_BYTES = 500_000; // límite razonable para evitar abuso
const ROW_ID = "boletos_fiesta_manifest";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

const sql = connectionString ? neon(connectionString) : null;

// Respaldo en memoria solo para cuando todavía no hay base de datos
// conectada (no persiste entre reinicios de la función).
globalThis.__memManifest = globalThis.__memManifest || [];

let tableReady = false;
async function ensureTable() {
  if (tableReady || !sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS manifest_kv (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `;
  tableReady = true;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      if (sql) {
        await ensureTable();
        const rows = await sql`SELECT data FROM manifest_kv WHERE id = ${ROW_ID}`;
        const data = rows[0]?.data;
        return res.status(200).json(Array.isArray(data) ? data : []);
      }
      return res.status(200).json(globalThis.__memManifest);
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
      if (sql) {
        await ensureTable();
        await sql`
          INSERT INTO manifest_kv (id, data)
          VALUES (${ROW_ID}, ${JSON.stringify(list)}::jsonb)
          ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
        `;
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
