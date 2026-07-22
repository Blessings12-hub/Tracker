import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — point it at your Postgres instance (see .env.example)');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's managed Postgres requires SSL; local Postgres usually doesn't.
  ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false,
});

export async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

// Small helpers so route files read close to their old sqlite shape.
export const db = {
  query: (text, params) => pool.query(text, params),
  get: async (text, params) => (await pool.query(text, params)).rows[0] || null,
  all: async (text, params) => (await pool.query(text, params)).rows,
  run: (text, params) => pool.query(text, params),
};
