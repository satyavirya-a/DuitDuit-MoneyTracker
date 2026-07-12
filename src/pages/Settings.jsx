/**
 * Settings Page — Hub Navigasi Pengaturan
 *
 * KONSEP ARSITEKTUR:
 * Settings berfungsi sebagai "hub" yang mengarahkan user ke sub-halaman
 * (ManageWallets, ManageCategories). Ini mengikuti pola navigasi yang
 * sama seperti aplikasi iOS/Android Settings — list of menu items.
 *
 * Kita juga menampilkan profil user (dari Google OAuth metadata)
 * dan tombol Sign Out di sini.
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  /**
   * handleSignOut — Proses logout
   * Memanggil supabase.auth.signOut() via AuthContext,
   * lalu redirect ke halaman login.
   * Kita wrap dalam try-catch karena network bisa gagal.
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  return (
    <div className="settings-page" id="settings-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="page-content">
        {/* --- User Profile Card ---
            Data ini datang dari Google OAuth metadata yang otomatis
            disimpan oleh Supabase saat user login.
            user.user_metadata berisi: full_name, avatar_url, email */}
        <div className="settings-profile-card glass-card animate-fade-in-up" id="profile-card">
          <div className="settings-avatar">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>
                {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
              </span>
            )}
          </div>
          <div className="settings-user-info">
            <h2 className="settings-user-name">
              {user?.user_metadata?.full_name || 'User'}
            </h2>
            <p className="settings-user-email">{user?.email}</p>
          </div>
        </div>

        {/* --- Menu Items ---
            Setiap menu item adalah tombol navigasi yang mengarah ke
            sub-halaman. Kita menggunakan navigate() dari react-router-dom
            alih-alih <Link> agar bisa menambahkan logika tambahan
            (misalnya analytics tracking) di masa depan. */}
        <div className="settings-section">
          <h3 className="section-title">Manage</h3>

          <div className="settings-menu glass-card">
            {/* Menu: Kelola Wallet */}
            <button
              className="settings-menu-item"
              onClick={() => navigate('/settings/wallets')}
              id="menu-wallets"
            >
              <div className="menu-item-left">
                <span className="menu-item-icon">💳</span>
                <div>
                  <p className="menu-item-title">Wallets</p>
                  <p className="menu-item-desc">Manage your sources of funds</p>
                </div>
              </div>
              <svg className="menu-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Menu: Kelola Kategori */}
            <button
              className="settings-menu-item"
              onClick={() => navigate('/settings/categories')}
              id="menu-categories"
            >
              <div className="menu-item-left">
                <span className="menu-item-icon">🏷️</span>
                <div>
                  <p className="menu-item-title">Categories</p>
                  <p className="menu-item-desc">Customize income & expense categories</p>
                </div>
              </div>
              <svg className="menu-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* --- Sign Out Section --- */}
        <div className="settings-section">
          <h3 className="section-title">Account</h3>
          <button
            className="settings-signout-btn"
            onClick={handleSignOut}
            id="signout-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>

        {/* App version footer */}
        <p className="settings-footer">DuitDuit v1.0 — Made with ❤️</p>
      </div>
    </div>
  );
}
