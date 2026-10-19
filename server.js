const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  for (let i = 1; i <= 10; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT
        )`);
      console.log('Connected to PostgreSQL');
      return;
    } catch (err) {
      console.log(`Waiting for database (${i}/10)...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.error('Could not connect to PostgreSQL');
  process.exit(1);
}

// Create
app.post('/notes', async (req, res) => {
  try {
    const { title, content } = req.body;
    const result = await pool.query(
      'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read all
app.get('/notes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read one
app.get('/notes/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [req.params.id]);
    result.rows.length ? res.json(result.rows[0]) : res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
app.put('/notes/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const result = await pool.query(
      'UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [title, content, req.params.id]
    );
    result.rows.length ? res.json(result.rows[0]) : res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
app.delete('/notes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDb().then(() => {
  app.listen(3000, () => console.log('API running on port 3000'));
});