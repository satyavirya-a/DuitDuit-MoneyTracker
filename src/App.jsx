/**
 * App.jsx — Komponen Root & Router Utama
 *
 * KONSEP ARSITEKTUR:
 * File ini adalah "pusat kendali" aplikasi yang menghubungkan semua bagian:
 *
 * 1. AuthProvider (Context) — membungkus seluruh app agar setiap komponen
 *    bisa mengakses data user dan fungsi auth via useAuth() hook.
 *
 * 2. BrowserRouter (react-router-dom) — mengatur navigasi berbasis URL.
 *    Setiap URL path dipetakan ke satu komponen halaman.
 *
 * 3. ProtectedRoute — wrapper yang mengecek apakah user sudah login.
 *    Jika belum, otomatis redirect ke /login.
 *
 * MENGAPA AuthProvider di LUAR BrowserRouter?
 * Karena AuthProvider tidak bergantung pada routing, tapi routing (ProtectedRoute)
 * bergantung pada auth state. Jadi auth harus "lebih tinggi" di component tree.
 *
 * POLA ROUTING:
 *   /login          → Login (publik, tidak perlu auth)
 *   /dashboard      → Dashboard (protected)
 *   /history        → History (protected)
 *   /settings       → Settings hub (protected)
 *   /settings/*     → Sub-halaman settings (protected)
 *   /*              → Redirect ke /dashboard (catch-all)
 */
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import ManageWallets from './pages/ManageWallets';
import ManageCategories from './pages/ManageCategories';
import './App.css';

/**
 * AppLayout — Layout wrapper yang menentukan struktur halaman
 *
 * Komponen ini memiliki 2 tanggung jawab:
 * 1. Menentukan apakah BottomNav perlu ditampilkan
 *    (hanya saat user sudah login dan bukan di halaman login)
 * 2. Menambahkan padding bawah pada konten agar tidak
 *    tertutup oleh BottomNav yang fixed di bawah
 */
function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  // BottomNav hanya muncul jika user login & bukan di halaman login
  const showNav = user && location.pathname !== '/login';

  return (
    <>
      {/* Container utama — padding-bottom ditambah jika ada navbar */}
      <div className={`app-content ${showNav ? 'with-nav' : ''}`}>
        <Routes>
          {/* Halaman publik */}
          <Route path="/login" element={<Login />} />

          {/* Halaman protected — dibungkus ProtectedRoute */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute><History /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/settings/wallets" element={
            <ProtectedRoute><ManageWallets /></ProtectedRoute>
          } />
          <Route path="/settings/categories" element={
            <ProtectedRoute><ManageCategories /></ProtectedRoute>
          } />

          {/* Catch-all: URL yang tidak dikenal → redirect ke dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>

      {/* Bottom Navigation — fixed di bawah layar */}
      {showNav && <BottomNav />}
    </>
  );
}

/**
 * App — Komponen paling atas (root)
 *
 * Urutan pembungkusan (dari luar ke dalam):
 * AuthProvider → BrowserRouter → AppLayout
 *
 * Ini penting karena:
 * - AuthProvider harus di luar agar semua komponen bisa akses auth
 * - BrowserRouter harus di luar Routes agar routing berfungsi
 * - AppLayout di dalam BrowserRouter agar bisa menggunakan useLocation()
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
