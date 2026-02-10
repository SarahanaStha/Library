const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '..')));

// NEW: Connection Object (Better than a long string)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// Test DB Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('--- ❌ CONNECTION FAILED ❌ ---');
    console.error('Error Message:', err.message);
    console.log('\nACTION REQUIRED:');
    console.log('1. Go to https://console.neon.tech/');
    console.log('2. Click "Roles" and reset password for "neondb_owner"');
    console.log('3. Copy the NEW password into your .env file');
    console.error('---------------------------------');
  } else {
    console.log('✅ Success: Connected to Neon Postgres!');
    release();
  }
});

/* --- ALL ROUTES BELOW --- */

app.get('/api/init', async (req, res) => {
    try {
      console.log("Resetting database tables...");
      
      // 1. Drop existing tables to fix the missing UNIQUE constraint
      // We drop user_borrows first because it depends on the others
      await pool.query('DROP TABLE IF EXISTS user_borrows CASCADE;');
      await pool.query('DROP TABLE IF EXISTS books CASCADE;');
      await pool.query('DROP TABLE IF EXISTS users CASCADE;');

      // 2. Create tables with correct constraints
      await pool.query(`
        CREATE TABLE books (
          id SERIAL PRIMARY KEY,
          title TEXT UNIQUE NOT NULL, 
          author TEXT,
          genre TEXT,
          image TEXT,
          status TEXT DEFAULT 'Available'
        );

        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE user_borrows (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
          borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          returned_at TIMESTAMP
        );
      `);

      const sample = [
        ['If love had a Price','Ana Huang','Romance','if love had a price.jfif'],
        ['If the sun never sets','Ana Huang','Romance','if the sun never sets.jfif'],
        ['If we ever meet again','Ana Huang','Romance','if we ever meet again.jfif'],
        ['If we were perfect','Ana Huang','Romance','if we were perfect.jfif'],
        ['King of Envy','Ana Huang','Romance','king of envy.jfif'],
        ['King of Gluttony','Ana Huang','Romance','king of gluttony.jfif'],
        ['King of Greed','Ana Huang','Romance','king of greed.jfif'],
        ['King of Pride','Ana Huang','Romance','king of pride.jfif'],
        ['King of Sloth','Ana Huang','Romance','king of sloth.jfif'],
        ['King of Wrath','Ana Huang','Romance','king of wrath.jfif'],
        ['The Defender','Ana Huang','Romance','the defender.jfif'],
        ['The Keeper','Ana Huang','Romance','the keeper.jfif'],
        ['The Striker','Ana Huang','Romance','the striker.jfif'],
        ['Twisted Game','Ana Huang','Romance','twisted game.jfif'],
        ['Twisted Hate','Ana Huang','Romance','twisted hate.jfif'],
        ['Twisted Lies','Ana Huang','Romance','twisted lies.jfif'],
        ['Twisted Love','Ana Huang','Romance','twisted love.jfif']
      ];

      for (const row of sample) {
        // Now ON CONFLICT (title) will work because title is UNIQUE
        await pool.query(
          'INSERT INTO books(title,author,genre,image,status) VALUES($1,$2,$3,$4,\'Available\') ON CONFLICT (title) DO NOTHING',
          row
        );
      }
      
      res.send('<h1>Success!</h1><p>Tables recreated correctly and books seeded. Go back to your Library site.</p>');
    } catch (err) {
      console.error(err);
      res.status(500).send(`Database Init Error: ${err.message}`);
    }
});

app.get('/api/books', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM books ORDER BY title ASC');
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        const result = await pool.query('INSERT INTO users(username, password, email) VALUES($1, $2, $3) RETURNING id, username', [username, password, email]);
        res.json({ ok: true, user: result.rows[0] });
    } catch (err) { res.status(400).json({ error: "Username exists" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT id, username FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length) res.json({ ok: true, user: result.rows[0] });
        else res.status(401).json({ error: "Invalid credentials" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/borrow/:id', async (req, res) => {
    const bookId = req.params.id;
    const { userId } = req.body;
    try {
        const cur = await pool.query('SELECT status FROM books WHERE id = $1', [bookId]);
        const nextStatus = cur.rows[0].status === 'Available' ? 'Borrowed' : 'Available';
        await pool.query('UPDATE books SET status=$1 WHERE id=$2', [nextStatus, bookId]);
        if (nextStatus === 'Borrowed') {
            await pool.query('INSERT INTO user_borrows(user_id, book_id) VALUES($1, $2)', [userId, bookId]);
        } else {
            await pool.query('UPDATE user_borrows SET returned_at=NOW() WHERE user_id=$1 AND book_id=$2 AND returned_at IS NULL', [userId, bookId]);
        }
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3000, () => console.log('🚀 Server active on http://localhost:3000'));