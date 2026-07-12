/**
 * ManageWallets Page — CRUD untuk Wallet/Sumber Dana
 *
 * KONSEP ARSITEKTUR:
 * Halaman ini memungkinkan user mengelola wallet (dompet) mereka.
 * 
 * ALIRAN DATA:
 * 1. Saat halaman dimuat → fetchWallets() mengambil data dari Supabase
 * 2. User menambah wallet → handleSave() INSERT ke Supabase, lalu refresh
 * 3. User mengedit wallet → handleSave() UPDATE ke Supabase
 *    - Jika initial_balance berubah, current_balance juga harus disesuaikan
 *    - Formula: new_current = current + (new_initial - old_initial)
 * 4. User menghapus wallet → handleDelete() DELETE dari Supabase
 *    - Transaksi terkait juga terhapus (CASCADE di database)
 *
 * KENAPA current_balance diupdate dengan "selisih" (diff)?
 * Karena current_balance = initial_balance + semua_income - semua_expense.
 * Jika kita hanya ubah initial_balance, kita cukup tambahkan selisihnya
 * ke current_balance tanpa perlu menghitung ulang semua transaksi.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/utils';
import './Manage.css';

// Daftar emoji yang bisa dipilih sebagai ikon wallet
const WALLET_ICONS = ['💳', '🏦', '💰', '💵', '🪙', '📱', '💎', '🏧', '💲', '🔷'];

export default function ManageWallets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State untuk daftar wallet
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk form (digunakan baik saat tambah maupun edit)
  const [showForm, setShowForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [icon, setIcon] = useState('💳');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  /**
   * fetchWallets — Mengambil semua wallet milik user dari database
   * RLS di Supabase memastikan hanya wallet milik user ini yang dikembalikan,
   * tapi kita tetap filter .eq('user_id') sebagai best practice.
   */
  const fetchWallets = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');
      if (error) throw error;
      setWallets(data || []);
    } catch (err) {
      console.error('Error fetching wallets:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  /**
   * openAddForm — Reset form dan buka mode "tambah baru"
   */
  const openAddForm = () => {
    setEditingWallet(null);
    setName('');
    setInitialBalance('');
    setIcon('💳');
    setShowForm(true);
  };

  /**
   * openEditForm — Isi form dengan data wallet yang ada, buka mode "edit"
   * @param {Object} wallet - Data wallet yang akan diedit
   */
  const openEditForm = (wallet) => {
    setEditingWallet(wallet);
    setName(wallet.name);
    setInitialBalance(String(wallet.initial_balance));
    setIcon(wallet.icon || '💳');
    setShowForm(true);
    setConfirmDeleteId(null);
  };

  /**
   * handleSave — Simpan wallet (baru atau update)
   *
   * LOGIKA PENTING untuk UPDATE initial_balance:
   * Jika user mengubah initial_balance, kita harus meng-update
   * current_balance juga. Caranya:
   *   selisih = initial_balance_baru - initial_balance_lama
   *   current_balance_baru = current_balance_lama + selisih
   *
   * Contoh: Wallet awal Rp 1.000.000, sudah ada expense Rp 200.000
   *   → current_balance = Rp 800.000
   *   User ubah initial menjadi Rp 1.500.000
   *   → selisih = 500.000
   *   → current_balance = 800.000 + 500.000 = Rp 1.300.000 ✅
   */
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      if (editingWallet) {
        // MODE: Update wallet yang sudah ada
        const newInitial = parseFloat(initialBalance) || 0;
        const oldInitial = editingWallet.initial_balance;
        // Hitung selisih untuk menyesuaikan current_balance
        const balanceDiff = newInitial - oldInitial;

        const { error } = await supabase
          .from('wallets')
          .update({
            name: name.trim(),
            initial_balance: newInitial,
            // Sesuaikan current_balance berdasarkan perubahan initial
            current_balance: editingWallet.current_balance + balanceDiff,
            icon,
          })
          .eq('id', editingWallet.id);
        if (error) throw error;
      } else {
        // MODE: Buat wallet baru
        // Saat pertama kali dibuat, current_balance = initial_balance
        // karena belum ada transaksi sama sekali
        const balance = parseFloat(initialBalance) || 0;
        const { error } = await supabase.from('wallets').insert({
          user_id: user.id,
          name: name.trim(),
          initial_balance: balance,
          current_balance: balance,
          icon,
        });
        if (error) throw error;
      }

      setShowForm(false);
      fetchWallets();
    } catch (err) {
      console.error('Error saving wallet:', err);
      alert('Failed to save wallet.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * handleDelete — Hapus wallet dari database
   * Menggunakan pola "double-tap to confirm" — user harus klik
   * tombol delete 2 kali. Ini mencegah penghapusan tidak sengaja.
   *
   * PERINGATAN: Menghapus wallet juga menghapus SEMUA transaksi
   * yang terkait karena kita set ON DELETE CASCADE di database.
   */
  const handleDelete = async (walletId) => {
    if (confirmDeleteId !== walletId) {
      // Klik pertama: tampilkan konfirmasi
      setConfirmDeleteId(walletId);
      return;
    }

    // Klik kedua: benar-benar hapus
    try {
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', walletId);
      if (error) throw error;
      setConfirmDeleteId(null);
      fetchWallets();
    } catch (err) {
      console.error('Error deleting wallet:', err);
      alert('Failed to delete wallet.');
    }
  };

  return (
    <div className="manage-page" id="manage-wallets-page">
      {/* Header dengan tombol kembali */}
      <div className="page-header">
        <button className="page-header-btn" onClick={() => navigate('/settings')} id="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>Wallets</h1>
        <button className="page-header-btn" onClick={openAddForm} id="add-wallet-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="page-content">
        {/* --- Form Tambah/Edit Wallet --- */}
        {showForm && (
          <div className="manage-form glass-card animate-fade-in-up" id="wallet-form">
            <h3 className="manage-form-title">
              {editingWallet ? 'Edit Wallet' : 'New Wallet'}
            </h3>

            {/* Icon Picker — grid emoji untuk memilih ikon wallet */}
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div className="icon-picker" id="icon-picker">
                {WALLET_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    className={`icon-option ${icon === emoji ? 'active' : ''}`}
                    onClick={() => setIcon(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Wallet Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., BCA, GoPay, Cash"
                value={name}
                onChange={(e) => setName(e.target.value)}
                id="wallet-name-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Balance (Rp)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                inputMode="numeric"
                id="wallet-balance-input"
              />
            </div>

            <div className="manage-form-actions">
              <button
                className="btn-ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!name.trim() || saving}
                style={{ flex: 1 }}
                id="save-wallet-btn"
              >
                {saving ? 'Saving...' : editingWallet ? 'Update' : 'Add Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* --- Daftar Wallet --- */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="spinner" />
          </div>
        ) : wallets.length === 0 && !showForm ? (
          <div className="empty-state">
            <span className="empty-state-icon">💳</span>
            <p className="empty-state-title">No wallets yet</p>
            <p className="empty-state-text">Add your first wallet to start tracking</p>
            <button
              className="btn-primary"
              onClick={openAddForm}
              style={{ marginTop: 16, width: 'auto', padding: '12px 32px' }}
            >
              Add Wallet
            </button>
          </div>
        ) : (
          <div className="manage-list" id="wallet-list">
            {wallets.map((wallet, i) => (
              <div
                key={wallet.id}
                className="manage-list-item glass-card stagger-item"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="manage-item-content" onClick={() => openEditForm(wallet)}>
                  <span className="manage-item-icon">{wallet.icon}</span>
                  <div className="manage-item-info">
                    <p className="manage-item-name">{wallet.name}</p>
                    <p className="manage-item-detail">
                      Balance: {formatCurrency(wallet.current_balance)}
                    </p>
                  </div>
                </div>
                <button
                  className={`manage-delete-btn ${confirmDeleteId === wallet.id ? 'confirming' : ''}`}
                  onClick={() => handleDelete(wallet.id)}
                  id={`delete-wallet-${wallet.id}`}
                >
                  {confirmDeleteId === wallet.id ? (
                    <span style={{ fontSize: '0.7rem' }}>Confirm?</span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
