# 🤖 DayBot - Advanced AI Chatbot System

DayBot adalah sistem chatbot AI yang canggih dan komprehensif, dirancang untuk memberikan pengalaman asisten virtual yang cerdas, responsif, dan mampu memproses berbagai jenis dokumen serta gambar secara lokal.

---

## 📄 Deskripsi
DayBot bukan sekadar antarmuka chat biasa. Proyek ini mengintegrasikan kecerdasan buatan (LLM) dengan kemampuan pemrosesan dokumen (PDF) dan pengenalan karakter visual (OCR). Dibangun dengan fokus pada privasi (menggunakan model lokal) dan fitur keamanan seperti autentikasi user melalui email.

---

## 🚀 Fitur Utama
- **Streaming Chat**: Respons AI yang muncul kata demi kata secara real-time.
- **OCR (Optical Character Recognition)**: Mengekstrak teks dari gambar (PNG, JPG, JPEG) menggunakan Tesseract.js.
- **PDF Extraction**: Membaca dan memproses konten dari file PDF.
- **Sistem Autentikasi**: Lengkap dengan Sign Up, Login (JWT), Verifikasi Email, dan Lupa Password.
- **Chat History**: Riwayat percakapan tersimpan aman di database SQLite.
- **Persona DayBot**: AI yang analitis, mampu mirroring bahasa user, dan profesional.

---

## 🛠️ Stack Teknologi & Model

### **AI Model**
- **Model**: `Llama 3 (8B)` via [Ollama](https://ollama.com/).
- **Backend Communication**: Menggunakan API lokal Ollama (`localhost:11434`).

### **Framework & Library**
- **Backend**: Node.js dengan **Express.js**.
- **Frontend**: **React.js** (dikelola dengan **Vite**).
- **Database**: **SQLite3** untuk manajemen user dan riwayat chat.
- **OCR Engine**: **Tesseract.js** (mendukung bahasa Indonesia & Inggris).
- **Document Parser**: **pdf-parse**.
- **Auth & Security**: **Bcrypt** (password hashing) & **JSON Web Token (JWT)**.
- **Email Service**: **Nodemailer** (integrasi Gmail SMTP).

---

## 🏗️ Arsitektur Sistem
Sistem ini menggunakan arsitektur **Client-Server**:
1. **Frontend**: Bertanggung jawab untuk UI/UX, menangani file upload, dan konsumsi streaming API.
2. **Backend (Express)**: Pusat logika yang menangani routing, autentikasi, akses database, serta bertindak sebagai perantara (_proxy_) antara user dan Ollama.
3. **Ollama Server**: Menjalankan model `llama3` secara lokal di background.
4. **Database (SQLite)**: Menyimpan data user, token verifikasi, dan riwayat pesan chat.

---

## 📁 Struktur File
```text
ai-chatbot/
├── public/                 # UI/UX: HTML, CSS, dan Client-side JS
│   ├── index.html          # Halaman Chat Utama
│   ├── login.html          # Halaman Login & Reset Password
│   ├── style.css           # Styling (Premium Dark Mode)
│   └── script.js           # Logika Frontend & Streaming
├── uploads/                # Penyimpanan sementara file PDF/Gambar
├── database.db             # Database SQLite (User & Chat History)
├── database.js             # Konfigurasi Schema Database
├── server.js               # Backend Express (Auth & AI Logic)
├── prompt.js               # System Prompt (Persona DayBot)
├── package.json            # Dependensi & Scripts
├── eng/ind.traineddata     # Data bahasa Tesseract OCR
├── cloudflared.exe         # Tunneling untuk akses publik (optional)
├── .env                    # Konfigurasi Kredensial (Email & Secret)
└── tests/                  # Script pengujian fungsi (test_*.js)
```

---

## 🔄 Cara Kerja (Workflow)
1. **Autentikasi**:
   - User mendaftar -> Token verifikasi dikirim ke email via Nodemailer.
   - User verifikasi -> Akun aktif -> Login menghasilkan JWT token.
2. **Chatting**:
   - User mengirim pesan -> Backend mengambil riwayat chat sebelumnya dari database.
   - Backend mengirim prompt (System Prompt + History + Pesan Baru) ke Ollama.
   - Ollama melakukan streaming respons -> Backend meneruskan setiap chunk kata ke Frontend.
3. **Pemrosesan File**:
   - User mengunggah gambar/PDF -> Backend memproses file menggunakan Tesseract (Gambar) atau pdf-parse (PDF).
   - Teks hasil ekstraksi dikembalikan ke user untuk digunakan sebagai konteks chat.

---

## 📦 Cara Memulai (Running Locally)

1. **Prasyarat**:
   - Instal [Node.js](https://nodejs.org/)
   - Instal [Ollama](https://ollama.com/) dan jalankan `ollama run llama3`

2. **Instalasi**:
   ```bash
   npm install
   ```

3. **Konfigurasi .env**:
   Salin file `.env.example` menjadi `.env` dan isi kredensial yang diperlukan:
   ```bash
   cp .env.example .env
   ```
   *Edit file `.env` dan masukkan email, password aplikasi, dan konfigurasi lainnya.*

4. **Menjalankan Project**:
   ```bash
   npm start
   ```
   Buka `http://localhost:3000` di browser.

---

## ⬆️ Cara Push ke GitHub
Jika kamu ingin menyimpan project ini di repository pribadimu:

1. **Inisialisasi Git** (jika belum):
   ```bash
   git init
   ```

2. **Tambahkan file ke staging**:
   ```bash
   git add .
   ```

3. **Commit perubahan**:
   ```bash
   git commit -m "feat: initial commit DayBot AI Chatbot"
   ```

4. **Buat Repository di GitHub**, lalu hubungkan:
   ```bash
   git remote add origin https://github.com/username-kamu/nama-repo.git
   ```

5. **Push ke GitHub**:
   ```bash
   git push -u origin main
   ```

---

> **Note**: Pastikan folder `node_modules`, `database.db`, dan file `.env` sudah masuk ke dalam `.gitignore` sebelum melakukan push untuk menjaga keamanan dan efisiensi repository.
