/**
 * main.jsx — Entry Point Aplikasi
 *
 * KONSEP:
 * Ini adalah file pertama yang dijalankan oleh Vite.
 * Tugasnya sederhana: mount komponen <App /> ke elemen DOM #root.
 *
 * StrictMode diaktifkan untuk:
 * 1. Mendeteksi side effects yang tidak aman
 * 2. Memperingatkan tentang API React yang deprecated
 * 3. Di mode development, React akan render komponen 2x
 *    untuk membantu menemukan bug (ini normal!)
 *
 * import './index.css' memuat global styles (design system)
 * yang berlaku untuk seluruh aplikasi.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Mount React ke DOM — ini "menghidupkan" seluruh aplikasi
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
