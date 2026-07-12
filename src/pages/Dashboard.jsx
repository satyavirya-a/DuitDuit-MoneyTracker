import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateRelative, getCurrentMonthRange } from '../lib/utils';
import TransactionModal from '../components/TransactionModal';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [defaultType, setDefaultType] = useState('expense');
  const [fabOpen, setFabOpen] = useState(false);

  // Balance visibility toggle (persisted in localStorage)
  const [balanceHidden, setBalanceHidden] = useState(() => {
    return localStorage.getItem('duitduit_balance_hidden') === 'true';
  });

  const toggleBalanceVisibility = () => {
    setBalanceHidden((prev) => {
      const next = !prev;
      localStorage.setItem('duitduit_balance_hidden', String(next));
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { start, end } = getCurrentMonthRange();

    try {
      const [walletsRes, txRes, monthTxRes] = await Promise.all([
        supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at'),
        supabase
          .from('transactions')
          .select('*, categories(name, icon), wallets(name, icon)')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', user.id)
          .gte('date', start)
          .lte('date', end),
      ]);

      if (walletsRes.data) setWallets(walletsRes.data);
      if (txRes.data) setRecentTransactions(txRes.data);

      if (monthTxRes.data) {
        let income = 0, expense = 0;
        monthTxRes.data.forEach((t) => {
          if (t.type === 'income') income += Number(t.amount);
          else expense += Number(t.amount);
        });
        setMonthlyIncome(income);
        setMonthlyExpense(expense);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = (type) => {
    setEditingTransaction(null);
    setDefaultType(type);
    setShowModal(true);
    setFabOpen(false);
  };

  const openEditModal = (tx) => {
    setEditingTransaction(tx);
    setDefaultType(tx.type);
    setShowModal(true);
  };

  const handleSaved = () => {
    fetchData();
  };

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.current_balance), 0);

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard-page" id="dashboard-page">
      {/* Header */}
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Welcome back 👋</p>
          <h1 className="dash-username">{user.user_metadata?.full_name?.split(' ')[0] || 'User'}</h1>
        </div>
        <div className="dash-avatar" id="user-avatar">
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="avatar" referrerPolicy="no-referrer" />
          ) : (
            <span>{(user.user_metadata?.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}</span>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Total Balance Card */}
        <div className="total-balance-card animate-fade-in-up" id="total-balance-card">
          <div className="total-balance-bg-orb" />
          <div className="total-balance-top-row">
            <p className="total-balance-label">Total Balance</p>
            <button
              className="balance-eye-btn"
              onClick={toggleBalanceVisibility}
              aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
              id="balance-eye-btn"
            >
              {balanceHidden ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <h2 className="total-balance-amount">
            {balanceHidden ? '••••••••' : formatCurrency(totalBalance)}
          </h2>
          <div className="monthly-summary">
            <div className="summary-item income">
              <div className="summary-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </div>
              <div>
                <p className="summary-label">Income</p>
                <p className="summary-value">{balanceHidden ? '••••••' : formatCurrency(monthlyIncome)}</p>
              </div>
            </div>
            <div className="summary-divider" />
            <div className="summary-item expense">
              <div className="summary-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </div>
              <div>
                <p className="summary-label">Expense</p>
                <p className="summary-value">{balanceHidden ? '••••••' : formatCurrency(monthlyExpense)}</p>
              </div>
            </div>
          </div>
          <p className="total-balance-period">{monthName}</p>
        </div>

        {/* Wallets */}
        <div className="dash-section">
          <h3 className="section-title">My Wallets</h3>
          {wallets.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <p className="empty-state-text">No wallets yet. Add one in Settings!</p>
            </div>
          ) : (
            <div className="wallets-scroll" id="wallets-scroll">
              {wallets.map((wallet, i) => (
                <div
                  key={wallet.id}
                  className={`wallet-card stagger-item`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="wallet-card-top">
                    <span className="wallet-icon">{wallet.icon}</span>
                    <span className="wallet-name">{wallet.name}</span>
                  </div>
                  <p className="wallet-balance">{balanceHidden ? '••••••' : formatCurrency(wallet.current_balance)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="dash-section">
          <h3 className="section-title">Recent Transactions</h3>
          {recentTransactions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📝</span>
              <p className="empty-state-title">No transactions yet</p>
              <p className="empty-state-text">Tap the + button to add your first transaction</p>
            </div>
          ) : (
            <div className="transaction-list" id="transaction-list">
              {recentTransactions.map((tx, i) => (
                <button
                  key={tx.id}
                  className="transaction-item stagger-item"
                  onClick={() => openEditModal(tx)}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="tx-icon-wrapper">
                    <span className="tx-icon">{tx.categories?.icon || '📁'}</span>
                  </div>
                  <div className="tx-info">
                    <p className="tx-category">{tx.categories?.name || 'Uncategorized'}</p>
                    <p className="tx-meta">
                      {tx.wallets?.name || 'Wallet'} · {formatDateRelative(tx.date)}
                    </p>
                  </div>
                  <p className={`tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount).replace('Rp', '').trim()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <div className={`fab-container ${fabOpen ? 'open' : ''}`} id="fab-container">
        {fabOpen && (
          <div className="fab-backdrop" onClick={() => setFabOpen(false)} />
        )}
        {fabOpen && (
          <div className="fab-options animate-scale-in">
            <button
              className="fab-option income"
              onClick={() => openAddModal('income')}
              id="fab-income-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              Income
            </button>
            <button
              className="fab-option expense"
              onClick={() => openAddModal('expense')}
              id="fab-expense-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              Expense
            </button>
          </div>
        )}
        <button
          className="fab-main"
          onClick={() => setFabOpen(!fabOpen)}
          id="fab-main-btn"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={`fab-icon ${fabOpen ? 'rotated' : ''}`}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
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
