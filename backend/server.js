const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Added bcrypt

const app = express();
const saltRounds = 10; // For bcrypt hashing

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '..')));

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false },
});

// --- DATABASE INIT ---
app.get('/api/init', async (req, res) => {
    try {
        await pool.query('DROP TABLE IF EXISTS user_borrows CASCADE;');
        await pool.query('DROP TABLE IF EXISTS books CASCADE;');
        await pool.query('DROP TABLE IF EXISTS users CASCADE;');

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
            await pool.query('INSERT INTO books(title,author,genre,image) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', row);
        }
        res.send('<h1>Success!</h1><p>Database Reset. Users cleared. Passwords will now be hashed.</p>');
    } catch (err) { res.status(500).send(err.message); }
});

// --- AUTH WITH BCRYPT ---

app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const result = await pool.query(
            'INSERT INTO users(username, password, email) VALUES($1, $2, $3) RETURNING id, username',
            [username, hashedPassword, email]
        );
        res.json({ ok: true, user: result.rows[0] });
    } catch (err) { res.status(400).json({ error: "Username already taken" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Compare hashed password
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                // Remove password from object before sending to frontend
                delete user.password;
                return res.json({ ok: true, user });
            }
        }
        res.status(401).json({ error: "Invalid username or password" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- BOOKS & BORROW ---

app.get('/api/books', async (req, res) => {
    const r = await pool.query('SELECT * FROM books ORDER BY title ASC');
    res.json(r.rows);
});

app.post('/api/borrow/:id', async (req, res) => {
    const bookId = req.params.id;
    const { userId } = req.body;
    const cur = await pool.query('SELECT status FROM books WHERE id = $1', [bookId]);
    const nextStatus = cur.rows[0].status === 'Available' ? 'Borrowed' : 'Available';
    
    await pool.query('UPDATE books SET status=$1 WHERE id=$2', [nextStatus, bookId]);
    if (nextStatus === 'Borrowed') {
        await pool.query('INSERT INTO user_borrows(user_id, book_id) VALUES($1, $2)', [userId, bookId]);
    } else {
        await pool.query('UPDATE user_borrows SET returned_at=NOW() WHERE user_id=$1 AND book_id=$2 AND returned_at IS NULL', [userId, bookId]);
    }
    res.json({ ok: true });
});

app.listen(3000, () => console.log('🚀 Secure Server running on http://localhost:3000'));