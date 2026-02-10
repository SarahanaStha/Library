const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Serve static site files from project root
app.use(express.static(path.join(__dirname)));

// Configure Postgres pool using DATABASE_URL (Neon)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('Warning: DATABASE_URL not set. API will fail to connect to DB until configured.');
}

const pool = new Pool({
  user: 'neondb_owner',
  host: 'ep-twilight-forest-ahi5tx9t-pooler.c-3.us-east-1.aws.neon.tech',
  database: 'neondb',
  password: 'npg_arInu2g1fxHl',
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // Essential for Neon
  },
});

// Initialize DB with sample books (call once)
app.post('/api/init', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        genre TEXT,
        image TEXT,
        status TEXT DEFAULT 'Available'
      );
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create user_borrows table to track borrowed books
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_borrows (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        returned_at TIMESTAMP,
        UNIQUE(user_id, book_id)
      );
    `);

    const sample = [
      ['If love had a Price','Ana Huang','Romance','if love had a price.jfif','Borrowed'],
      ['If the sun never sets','Ana Huang','Romance','if the sun never sets.jfif','Available'],
      ['If we ever meet again','Ana Huang','Romance','if we ever meet again.jfif','Available'],
      ['If we were perfect','Ana Huang','Romance','if we were perfect.jfif','Available'],
      ['King of Envy','Ana Huang','Romance','king of envy.jfif','Available']
    ];

    for (const row of sample) {
      await pool.query(
        'INSERT INTO books(title,author,genre,image,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        row
      );
    }

    res.json({ ok: true, message: 'Initialized tables and seeded sample rows.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get all books
app.get('/api/books', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM books ORDER BY id');
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users(username, password, email) VALUES($1, $2, $3) RETURNING id, username, email',
      [username, password, email]
    );
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Login a user
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's borrowed books
app.get('/api/user/:userId/borrowed', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  
  if (!userId) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const result = await pool.query(
      `SELECT b.*, ub.borrowed_at, ub.returned_at, ub.id as borrow_id
       FROM user_borrows ub
       JOIN books b ON ub.book_id = b.id
       WHERE ub.user_id = $1 AND ub.returned_at IS NULL
       ORDER BY ub.borrowed_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle borrow/return for a book id (with user tracking)
app.post('/api/borrow/:id', async (req, res) => {
  const bookId = parseInt(req.params.id, 10);
  const userId = req.body.userId ? parseInt(req.body.userId, 10) : null;
  
  if (!bookId) {
    return res.status(400).json({ error: 'Invalid book ID' });
  }

  try {
    const cur = await pool.query('SELECT status FROM books WHERE id = $1', [bookId]);
    if (!cur.rows.length) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const current = cur.rows[0].status || 'Available';
    const next = current.toLowerCase() === 'available' ? 'Borrowed' : 'Available';
    
    // Update book status
    const bookUpdate = await pool.query(
      'UPDATE books SET status=$1 WHERE id=$2 RETURNING *',
      [next, bookId]
    );

    // Track borrowing if user is logged in
    if (userId) {
      if (next === 'Borrowed') {
        // Record the borrow
        await pool.query(
          `INSERT INTO user_borrows(user_id, book_id) VALUES($1, $2) 
           ON CONFLICT(user_id, book_id) DO UPDATE SET returned_at = NULL`,
          [userId, bookId]
        );
      } else {
        // Record the return
        await pool.query(
          'UPDATE user_borrows SET returned_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND book_id = $2',
          [userId, bookId]
        );
      }
    }

    res.json(bookUpdate.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  
  console.log(`Server running on port ${port}`)});
