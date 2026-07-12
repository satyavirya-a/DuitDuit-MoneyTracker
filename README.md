# 💰 DuitDuit — Money Tracker

Aplikasi pencatat keuangan pribadi berbasis web dengan tampilan modern dan intuitif. Dibangun menggunakan React dan Supabase sebagai backend.

## ✨ Fitur Utama

- **📊 Dashboard** — Ringkasan saldo total, income, dan expense bulanan
- **💳 Multi-Wallet** — Kelola beberapa dompet/rekening sekaligus
- **📝 Catat Transaksi** — Input pemasukan & pengeluaran dengan kategori
- **📅 History** — Riwayat transaksi dengan filter harian, bulanan, dan custom
- **🗑️ Hapus Transaksi** — Hapus langsung dari history dengan konfirmasi
- **👁️ Hide Balance** — Sembunyikan nominal saldo untuk privasi
- **💲 Format Ribuan** — Nominal otomatis diformat sesuai standar Indonesia (1.500.000)
- **🔐 Google Login** — Autentikasi aman via Google OAuth
- **📱 Mobile-First** — Desain responsif yang dioptimasi untuk smartphone

## 🛠️ Tech Stack

| Teknologi | Fungsi |
|-----------|--------|
| [React 19](https://react.dev) | UI Library |
| [Vite](https://vite.dev) | Build Tool & Dev Server |
| [Supabase](https://supabase.com) | Database, Auth, & Backend |
| [React Router](https://reactrouter.com) | Client-side Routing |

## 🚀 Setup Lokal

### 1. Clone repository

```bash
git clone https://github.com/satyavirya-a/DuitDuit-MoneyTracker.git
cd DuitDuit-MoneyTracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Konfigurasi environment

Buat file `.env` di root project (copy dari `.env.example`):

```bash
cp .env.example .env
```

Isi dengan kredensial Supabase Anda:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173) di browser.

## 📁 Struktur Project

```
src/
├── components/       # Komponen reusable (BottomNav, TransactionModal)
├── contexts/         # React Context (AuthContext)
├── lib/              # Utilitas & konfigurasi (Supabase client, helpers)
├── pages/            # Halaman utama (Dashboard, History, Settings)
├── App.jsx           # Root component & routing
├── main.jsx          # Entry point
└── index.css         # Global styles & design tokens
```

## 📄 License

MIT
