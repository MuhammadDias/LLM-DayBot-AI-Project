import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3').verbose();

// === DATABASE SETUP (SQLite) ===
// Kode ini akan otomatis membuat file 'database.db' jika belum ada
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Database error:', err.message);
  else console.log('✅ Connected to SQLite database (database.db).');
});

// Init Tables (Buat tabel jika belum ada)
db.serialize(() => {
  // Tabel User
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT
  )`);

  // Tabel Chat Sessions (Daftar Percakapan)
  db.run(`CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Tabel Messages (Isi Chat)
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES chats(id)
  )`);
});

export default db;
