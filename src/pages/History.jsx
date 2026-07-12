import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateRelative, getTodayStr, getMonthRange } from '../lib/utils';
import TransactionModal from '../components/TransactionModal';
import './History.css';

const FILTER_TABS = [
  { key: '1d', label: '1 Day' },
  { key: '1m', label: '1 Month' },
  { key: 'custom', label: 'Custom' },
];

export default function History() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('1d');
  const [wallets, setWallets] = useState({});

  // Custom month picker
  const now = new Date();
  const [customYear, setCustomYear] = useState(now.getFullYear());
  const [customMonth, setCustomMonth] = useState(now.getMonth());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [defaultType, setDefaultType] = useState('expense');

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('transactions')
      .select('*, categories(name, icon), wallets(name, icon)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (activeFilter === '1d') {
      const today = getTodayStr();
      query = query.eq('date', today);
    } else if (activeFilter === '1m') {
      const { start, end } = getMonthRange(now.getFullYear(), now.getMonth());
      query = query.gte('date', start).lte('date', end);
    } else if (activeFilter === 'custom') {
      const { start, end } = getMonthRange(customYear, customMonth);
      query = query.gte('date', start).lte('date', end);
    }

    try {
      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeFilter, customYear, customMonth]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const openEditModal = (tx) => {
    setEditingTransaction(tx);
    setDefaultType(tx.type);
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setDefaultType('expense');
    setShowModal(true);
  };

  const handleSaved = () => {
    fetchTransactions();
  };

  // Delete transaction handler
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDeleteTransaction = async (txId, e) => {
    e.stopPropagation();
    if (confirmDeleteId !== txId) {
      setConfirmDeleteId(txId);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDeleteId((prev) => (prev === txId ? null : prev)), 3000);
      return;
    }
    setDeletingId(txId);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', txId);
      if (error) throw error;
      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Group transactions by date
  const grouped = transactions.reduce((acc, tx) => {
    const key = tx.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Build month options for custom picker
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="history-page" id="history-page">
      {/* Header */}
      <div className="page-header">
        <h1>History</h1>
        <button className="page-header-btn" onClick={openAddModal} id="history-add-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="history-filters" id="history-filters">
        <div className="filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab.key)}
              id={`filter-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeFilter === 'custom' && (
          <div className="custom-month-picker animate-fade-in">
            <select
              className="form-select month-select"
              value={customMonth}
              onChange={(e) => setCustomMonth(Number(e.target.value))}
              id="custom-month-select"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
            <select
              className="form-select year-select"
              value={customYear}
              onChange={(e) => setCustomYear(Number(e.target.value))}
              id="custom-year-select"
            >
              {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="page-content">
        {/* Period Summary */}
        {!loading && transactions.length > 0 && (
          <div className="history-summary animate-fade-in">
            <div className="history-summary-item">
              <span className="history-summary-label">Income</span>
              <span className="history-summary-value income">+{formatCurrency(totalIncome)}</span>
            </div>
            <div className="history-summary-item">
              <span className="history-summary-label">Expense</span>
              <span className="history-summary-value expense">−{formatCurrency(totalExpense)}</span>
            </div>
            <div className="history-summary-item">
              <span className="history-summary-label">Net</span>
              <span className={`history-summary-value ${totalIncome - totalExpense >= 0 ? 'income' : 'expense'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </span>
            </div>
          </div>
        )}

        {/* Transaction Groups */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="spinner" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🔍</span>
            <p className="empty-state-title">No transactions found</p>
            <p className="empty-state-text">
              {activeFilter === '1d'
                ? "You haven't recorded anything today"
                : 'No transactions in this period'}
            </p>
          </div>
        ) : (
          <div className="transaction-groups">
            {Object.entries(grouped).map(([date, txs]) => (
              <div key={date} className="tx-group">
                <p className="tx-group-date">{formatDateRelative(date)}</p>
                <div className="transaction-list">
                  {txs.map((tx, i) => (
                    <div
                      key={tx.id}
                      className="transaction-item-row stagger-item"
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <button
                        className="transaction-item"
                        onClick={() => openEditModal(tx)}
                      >
                        <div className="tx-icon-wrapper">
                          <span className="tx-icon">{tx.type === 'transfer' ? '💸' : (tx.categories?.icon || '📁')}</span>
                        </div>
                        <div className="tx-info">
                          <p className="tx-category">
                            {tx.type === 'transfer' ? 'Transfer / Pindah Dana' : (tx.categories?.name || 'Uncategorized')}
                          </p>
                          <p className="tx-meta">
                            {tx.type === 'transfer' 
                              ? `${tx.wallets?.name || 'Source'} → ${wallets[tx.to_wallet_id]?.name || 'Target'}`
                              : (tx.wallets?.name || 'Wallet')}
                            {tx.notes ? ` · ${tx.notes}` : ''}
                          </p>
                        </div>
                        <p className={`tx-amount ${tx.type}`}>
                          {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount).replace('Rp', '').trim()}
                        </p>
                      </button>
                      <button
                        className={`tx-delete-btn ${confirmDeleteId === tx.id ? 'confirming' : ''}`}
                        onClick={(e) => handleDeleteTransaction(tx.id, e)}
                        disabled={deletingId === tx.id}
                        title={confirmDeleteId === tx.id ? 'Tap again to confirm' : 'Delete'}
                        id={`delete-tx-${tx.id}`}
                      >
                        {deletingId === tx.id ? (
                          <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        transaction={editingTransaction}
        defaultType={defaultType}
        onSaved={handleSaved}
      />
    </div>
  );
}
