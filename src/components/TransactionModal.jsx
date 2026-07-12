import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getTodayStr } from '../lib/utils';
import './TransactionModal.css';

export default function TransactionModal({
  isOpen,
  onClose,
  transaction = null,
  defaultType = 'expense',
  onSaved,
}) {
  const { user } = useAuth();
  const isEditing = !!transaction;

  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [notes, setNotes] = useState('');

  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load categories and wallets
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadData = async () => {
      const [catRes, walRes] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
        supabase.from('wallets').select('*').eq('user_id', user.id).order('name'),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (walRes.data) setWallets(walRes.data);
    };
    loadData();
  }, [isOpen, user]);

  // Populate form when editing or opening
  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);

    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDate(transaction.date);
      setCategoryId(transaction.category_id || '');
      setWalletId(transaction.wallet_id);
      setNotes(transaction.notes || '');
    } else {
      setType(defaultType);
      setAmount('');
      setDate(getTodayStr());
      setCategoryId('');
      setWalletId('');
      setNotes('');
    }
  }, [isOpen, transaction, defaultType]);

  // Auto-select first wallet if none selected
  useEffect(() => {
    if (!walletId && wallets.length > 0 && !isEditing) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId, isEditing]);

  // Auto-select first matching category
  useEffect(() => {
    const filtered = categories.filter((c) => c.type === type);
    if (!isEditing && filtered.length > 0) {
      setCategoryId(filtered[0].id);
    }
  }, [type, categories, isEditing]);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSave = async () => {
    if (!amount || !walletId || !categoryId) return;
    setSaving(true);

    const data = {
      user_id: user.id,
      type,
      amount: parseFloat(amount),
      date,
      category_id: categoryId,
      wallet_id: walletId,
      notes: notes.trim(),
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('transactions')
          .update(data)
          .eq('id', transaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transactions').insert(data);
        if (error) throw error;
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving transaction:', err);
      alert('Failed to save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);
      if (error) throw error;
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!isOpen) return null;

  const isValid = amount && parseFloat(amount) > 0 && walletId && categoryId;

  return (
    <div className="modal-overlay" onClick={onClose} id="transaction-modal-overlay">
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        id="transaction-modal"
      >
        {/* Header */}
        <div className="modal-header">
          <button className="modal-close-btn" onClick={onClose} id="modal-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="modal-title">
            {isEditing ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <div style={{ width: 40 }} />
        </div>

        {/* Type Toggle */}
        <div className="type-toggle" id="type-toggle">
          <button
            className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
            onClick={() => setType('expense')}
            id="type-expense-btn"
          >
            Expense
          </button>
          <button
            className={`type-btn ${type === 'income' ? 'active income' : ''}`}
            onClick={() => setType('income')}
            id="type-income-btn"
          >
            Income
          </button>
        </div>

        {/* Amount Input */}
        <div className="amount-section">
          <span className="amount-currency">Rp</span>
          <input
            type="number"
            className="amount-input"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            autoFocus
            id="amount-input"
          />
        </div>

        {/* Form Fields */}
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              id="date-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                id="category-select"
              >
                <option value="">Select</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Wallet</label>
              <select
                className="form-select"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                id="wallet-select"
              >
                <option value="">Select</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="What's this for?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              id="notes-input"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!isValid || saving}
            id="save-transaction-btn"
          >
            {saving ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {isEditing ? 'Update' : 'Save Transaction'}
              </>
            )}
          </button>

          {isEditing && (
            <button
              className={`btn-delete-transaction ${confirmDelete ? 'confirming' : ''}`}
              onClick={handleDelete}
              disabled={deleting}
              id="delete-transaction-btn"
            >
              {deleting ? 'Deleting...' : confirmDelete ? 'Tap again to confirm' : 'Delete Transaction'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
