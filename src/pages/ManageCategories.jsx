/**
 * ManageCategories Page — CRUD untuk Kategori Income & Expense
 *
 * KONSEP ARSITEKTUR:
 * Kategori dibagi dua: 'income' dan 'expense'.
 * Kita menggunakan tab UI untuk memisahkan keduanya.
 *
 * ALIRAN DATA:
 * 1. Halaman dimuat → fetchCategories() ambil semua kategori user
 * 2. Data difilter di frontend berdasarkan tab aktif (income/expense)
 * 3. User menambah → INSERT ke Supabase dengan type sesuai tab aktif
 * 4. User mengedit → UPDATE nama dan icon
 * 5. User menghapus → DELETE (transaksi terkait tetap ada, category_id jadi NULL)
 *
 * KENAPA filter di frontend, bukan di database?
 * Karena jumlah kategori per user biasanya sedikit (<30).
 * Lebih efisien ambil semua sekaligus lalu filter di client,
 * daripada membuat 2 API call terpisah.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Manage.css';

// Emoji pilihan untuk ikon kategori (dikelompokkan agar mudah dipilih)
const CATEGORY_ICONS = [
  '🍔', '🚗', '🛍️', '💡', '🎬', '🏥', '📚', '📦',
  '💰', '💻', '📈', '🎁', '💵', '🏠', '✈️', '🎮',
  '☕', '👕', '🐾', '🎵', '💪', '💊', '📱', '🔧',
];

export default function ManageCategories() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State utama
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  // Tab aktif menentukan tipe kategori yang ditampilkan
  const [activeTab, setActiveTab] = useState('expense');

  // State form (shared antara add & edit)
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  /**
   * fetchCategories — Ambil semua kategori milik user
   * Kita ambil SEMUA tipe sekaligus, lalu filter di frontend.
   */
  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /**
   * filteredCategories — Filter kategori berdasarkan tab aktif
   * Ini adalah contoh "derived state" — state yang dihitung
   * dari state lain, bukan disimpan sendiri di useState.
   * Ini lebih baik daripada menyimpan 2 array terpisah.
   */
  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const openAddForm = () => {
    setEditingCategory(null);
    setName('');
    setIcon(activeTab === 'expense' ? '📦' : '💵');
    setShowForm(true);
  };

  const openEditForm = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setIcon(cat.icon || '📁');
    setShowForm(true);
    setConfirmDeleteId(null);
  };

  /**
   * handleSave — Simpan kategori baru atau update yang ada
   * Tipe kategori (income/expense) ditentukan oleh tab yang aktif
   * saat user mengklik "Add". Ini mencegah user salah pilih tipe.
   */
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      if (editingCategory) {
        // Update kategori yang ada (nama dan ikon saja, tipe tidak bisa diubah)
        const { error } = await supabase
          .from('categories')
          .update({ name: name.trim(), icon })
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        // Buat kategori baru dengan tipe sesuai tab aktif
        const { error } = await supabase.from('categories').insert({
          user_id: user.id,
          name: name.trim(),
          type: activeTab, // 'income' atau 'expense'
          icon,
        });
        if (error) throw error;
      }

      setShowForm(false);
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * handleDelete — Hapus kategori
   * Di database, transactions.category_id di-set ke NULL saat
   * kategori dihapus (ON DELETE SET NULL). Jadi transaksi lama
   * tidak ikut terhapus, hanya kehilangan referensi kategorinya.
   */
  const handleDelete = async (categoryId) => {
    if (confirmDeleteId !== categoryId) {
      setConfirmDeleteId(categoryId);
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      if (error) throw error;
      setConfirmDeleteId(null);
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category.');
    }
  };

  return (
    <div className="manage-page" id="manage-categories-page">
      {/* Header */}
      <div className="page-header">
        <button className="page-header-btn" onClick={() => navigate('/settings')} id="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>Categories</h1>
        <button className="page-header-btn" onClick={openAddForm} id="add-category-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="page-content">
        {/* --- Tab Toggle: Expense / Income ---
            Tab ini menentukan tipe kategori yang ditampilkan DAN
            tipe kategori baru yang akan dibuat. */}
        <div className="category-tabs" id="category-tabs">
          <button
            className={`category-tab ${activeTab === 'expense' ? 'active expense' : ''}`}
            onClick={() => { setActiveTab('expense'); setShowForm(false); setConfirmDeleteId(null); }}
          >
            Expense
          </button>
          <button
            className={`category-tab ${activeTab === 'income' ? 'active income' : ''}`}
            onClick={() => { setActiveTab('income'); setShowForm(false); setConfirmDeleteId(null); }}
          >
            Income
          </button>
        </div>

        {/* --- Form Tambah/Edit --- */}
        {showForm && (
          <div className="manage-form glass-card animate-fade-in-up" id="category-form">
            <h3 className="manage-form-title">
              {editingCategory ? 'Edit Category' : `New ${activeTab === 'income' ? 'Income' : 'Expense'} Category`}
            </h3>

            {/* Icon Picker */}
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div className="icon-picker" id="category-icon-picker">
                {CATEGORY_ICONS.map((emoji) => (
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
              <label className="form-label">Category Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Food & Drinks"
                value={name}
                onChange={(e) => setName(e.target.value)}
                id="category-name-input"
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
                id="save-category-btn"
              >
                {saving ? 'Saving...' : editingCategory ? 'Update' : 'Add Category'}
              </button>
            </div>
          </div>
        )}

        {/* --- Daftar Kategori --- */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="spinner" />
          </div>
        ) : filteredCategories.length === 0 && !showForm ? (
          <div className="empty-state">
            <span className="empty-state-icon">🏷️</span>
            <p className="empty-state-title">No {activeTab} categories</p>
            <p className="empty-state-text">Add a category to organize your transactions</p>
            <button
              className="btn-primary"
              onClick={openAddForm}
              style={{ marginTop: 16, width: 'auto', padding: '12px 32px' }}
            >
              Add Category
            </button>
          </div>
        ) : (
          <div className="manage-list" id="category-list">
            {filteredCategories.map((cat, i) => (
              <div
                key={cat.id}
                className="manage-list-item glass-card stagger-item"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="manage-item-content" onClick={() => openEditForm(cat)}>
                  <span className="manage-item-icon">{cat.icon}</span>
                  <div className="manage-item-info">
                    <p className="manage-item-name">{cat.name}</p>
                    <p className="manage-item-detail">
                      <span className={`badge badge-${cat.type}`}>{cat.type}</span>
                    </p>
                  </div>
                </div>
                <button
                  className={`manage-delete-btn ${confirmDeleteId === cat.id ? 'confirming' : ''}`}
                  onClick={() => handleDelete(cat.id)}
                  id={`delete-cat-${cat.id}`}
                >
                  {confirmDeleteId === cat.id ? (
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
