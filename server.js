import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { SYSTEM_PROMPT } from './prompt.js';
import db from './database.js';

const app = express();
const PORT = 3000;
const SECRET_KEY = 'rahasia_super_aman_ganti_ini_di_prod'; // Kunci untuk token login
const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'llama3:latest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === EMAIL CONFIGURATION ===
// GANTI DENGAN EMAIL ASLI KAMU UNTUK FITUR VERIFIKASI
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'diasizzat222@gmail.com', // GANTI DENGAN EMAIL GMAIL ASLI KAMU
    pass: 'qbzt dust vpof uoyr', // GANTI DENGAN APP PASSWORD (16 DIGIT) DARI GOOGLE, BUKAN PASSWORD LOGIN
  },
});

// === AUTH ROUTES ===

// 1. Register
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = Math.random().toString(36).substring(7);

    db.run(`INSERT INTO users (email, password, verification_token) VALUES (?, ?, ?)`, [email, hashedPassword, token], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) return res.status(400).json({ error: 'Email sudah terdaftar.' });
        return res.status(500).json({ error: err.message });
      }

      // Kirim Email Verifikasi
      const host = req.get('host'); // Mendapatkan domain (misal: blabla.trycloudflare.com)
      const protocol = req.headers['x-forwarded-proto'] || 'http'; // Deteksi https dari Cloudflare
      const link = `${protocol}://${host}/auth/verify?token=${token}`;
      const mailOptions = {
        to: email,
        subject: 'Verifikasi Akun AI Chatbot',
        html: `<p>Klik link ini untuk verifikasi akun kamu: <a href="${link}">Verifikasi Email</a></p>`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.log('Gagal kirim email (cek config):', err);
        else console.log('Email terkirim:', info.response);
      });

      res.json({ message: 'Registrasi berhasil! Cek email untuk verifikasi.' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Verify Email
app.get('/auth/verify', (req, res) => {
  const { token } = req.query;
  db.get(`SELECT * FROM users WHERE verification_token = ?`, [token], (err, user) => {
    if (!user) return res.send('Token invalid atau kadaluarsa.');

    db.run(`UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?`, [user.id], () => {
      res.send('<h1>Email Terverifikasi! Silakan kembali ke aplikasi dan Login.</h1>');
    });
  });
});

// 3. Login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (!user) return res.status(400).json({ error: 'User tidak ditemukan.' });

    // Cek apakah email sudah diverifikasi
    if (!user.is_verified) return res.status(403).json({ error: 'Email belum diverifikasi! Silakan cek inbox atau spam Anda.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Password salah.' });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, email: user.email });
  });
});

// Middleware Auth Check
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// === CHAT API ROUTES ===

// Get All Chats for Sidebar
app.get('/api/chats', authenticate, (req, res) => {
  db.all(`SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get Specific Chat History
app.get('/api/chat/:id', authenticate, (req, res) => {
  db.get(`SELECT * FROM chats WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id], (err, chat) => {
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    db.all(`SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC`, [req.params.id], (err, rows) => {
      res.json(rows);
    });
  });
});

// === STREAMING CHAT ENDPOINT ===
app.post('/chat', authenticate, async (req, res) => {
  const { message, sessionId } = req.body;
  const userId = req.user.id;

  // Helper Promise untuk DB
  const run = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, (err) => (err ? reject(err) : resolve())));
  const get = (sql, params) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
  const all = (sql, params) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

  try {
    // 1. Cek/Buat Chat Session
    const chat = await get(`SELECT id FROM chats WHERE id = ?`, [sessionId]);
    if (!chat) {
      const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
      await run(`INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)`, [sessionId, userId, title]);
    }

    // 2. Simpan Pesan User
    await run(`INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)`, [sessionId, 'user', message]);

    // 3. Ambil History
    const rows = await all(`SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC`, [sessionId]);
    const messagesPayload = [{ role: 'system', content: SYSTEM_PROMPT }, ...rows];

    // 4. Kirim ke Ollama
    const ollamaRes = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: messagesPayload,
        options: { temperature: 0.7, num_ctx: 4096 },
      }),
    });

    if (!ollamaRes.ok) throw new Error(`Ollama Error: ${ollamaRes.status}`);

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullBotResponse = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              res.write(data.message.content);
              fullBotResponse += data.message.content;
            }
          } catch (e) {}
        }
      }
    }

    // 5. Simpan Jawaban Bot
    await run(`INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)`, [sessionId, 'assistant', fullBotResponse]);

    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 DayBot Siap! Buka: http://localhost:${PORT}`);
  console.log(`🤖 Model: ${MODEL}`);
});
