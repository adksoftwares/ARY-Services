import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = Number(process.env.PORT || 4000);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

let pool;
if (process.env.DATABASE_URL) {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
}

app.get('/api/health', async (_req, res) => {
  let database = 'not-configured';
  if (pool) {
    try { await pool.query('SELECT 1'); database = 'connected'; }
    catch { database = 'unavailable'; }
  }
  res.json({ status: 'ok', app: 'ARY Services API', database });
});

app.get('/api/service-categories', async (_req, res) => {
  if (!pool) return res.json({ items: [
    { id: 'food-shops', name: 'Food Shops', slug: 'food-shops' },
    { id: 'electrical-repair', name: 'Electrical Repair', slug: 'electrical-repair' },
    { id: 'plumbing', name: 'Plumbing', slug: 'plumbing' }
  ], source: 'demo' });
  try {
    const result = await pool.query(
      'SELECT id, name, slug, description FROM service_categories WHERE status = $1 ORDER BY sort_order, name',
      ['active']
    );
    res.json({ items: result.rows, source: 'database' });
  } catch {
    res.status(500).json({ error: 'Could not load service categories.' });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(port, () => console.log(`ARY Services API listening on port ${port}`));
