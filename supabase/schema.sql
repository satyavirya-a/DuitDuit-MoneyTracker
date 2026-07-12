-- ============================================
-- DuitDuit Money Tracker - Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Wallets table
create table public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null default 'bank' check (type in ('cash', 'e-wallet', 'bank')),
  initial_balance numeric default 0 not null,
  current_balance numeric default 0 not null,
  icon text default '💳',
  created_at timestamptz default now() not null
);

-- Categories table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text default '📁',
  created_at timestamptz default now() not null
);

-- Transactions table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  to_wallet_id uuid references public.wallets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric not null check (amount > 0),
  date date not null default current_date,
  notes text default '',
  created_at timestamptz default now() not null
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_wallets_user_id on public.wallets(user_id);
create index idx_categories_user_id on public.categories(user_id);
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_date on public.transactions(date desc);
create index idx_transactions_wallet_id on public.transactions(wallet_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- Wallets RLS
create policy "Users can view own wallets" on public.wallets
  for select using (auth.uid() = user_id);
create policy "Users can create own wallets" on public.wallets
  for insert with check (auth.uid() = user_id);
create policy "Users can update own wallets" on public.wallets
  for update using (auth.uid() = user_id);
create policy "Users can delete own wallets" on public.wallets
  for delete using (auth.uid() = user_id);

-- Categories RLS
create policy "Users can view own categories" on public.categories
  for select using (auth.uid() = user_id);
create policy "Users can create own categories" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories
  for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on public.categories
  for delete using (auth.uid() = user_id);

-- Transactions RLS
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);
create policy "Users can create own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update wallet balance when transactions change
create or replace function public.update_wallet_balance()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    if NEW.type = 'income' then
      update public.wallets set current_balance = current_balance + NEW.amount where id = NEW.wallet_id;
    elsif NEW.type = 'expense' then
      update public.wallets set current_balance = current_balance - NEW.amount where id = NEW.wallet_id;
    elsif NEW.type = 'transfer' then
      update public.wallets set current_balance = current_balance - NEW.amount where id = NEW.wallet_id;
      update public.wallets set current_balance = current_balance + NEW.amount where id = NEW.to_wallet_id;
    end if;
    return NEW;

  elsif (TG_OP = 'DELETE') then
    if OLD.type = 'income' then
      update public.wallets set current_balance = current_balance - OLD.amount where id = OLD.wallet_id;
    elsif OLD.type = 'expense' then
      update public.wallets set current_balance = current_balance + OLD.amount where id = OLD.wallet_id;
    elsif OLD.type = 'transfer' then
      update public.wallets set current_balance = current_balance + OLD.amount where id = OLD.wallet_id;
      update public.wallets set current_balance = current_balance - OLD.amount where id = OLD.to_wallet_id;
    end if;
    return OLD;

  elsif (TG_OP = 'UPDATE') then
    -- Reverse old transaction from old wallet
    if OLD.type = 'income' then
      update public.wallets set current_balance = current_balance - OLD.amount where id = OLD.wallet_id;
    elsif OLD.type = 'expense' then
      update public.wallets set current_balance = current_balance + OLD.amount where id = OLD.wallet_id;
    elsif OLD.type = 'transfer' then
      update public.wallets set current_balance = current_balance + OLD.amount where id = OLD.wallet_id;
      update public.wallets set current_balance = current_balance - OLD.amount where id = OLD.to_wallet_id;
    end if;
    -- Apply new transaction to new wallet (handles wallet changes too)
    if NEW.type = 'income' then
      update public.wallets set current_balance = current_balance + NEW.amount where id = NEW.wallet_id;
    elsif NEW.type = 'expense' then
      update public.wallets set current_balance = current_balance - NEW.amount where id = NEW.wallet_id;
    elsif NEW.type = 'transfer' then
      update public.wallets set current_balance = current_balance - NEW.amount where id = NEW.wallet_id;
      update public.wallets set current_balance = current_balance + NEW.amount where id = NEW.to_wallet_id;
    end if;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

-- Trigger: Auto-update wallet balance
create trigger on_transaction_change
  after insert or update or delete on public.transactions
  for each row execute function public.update_wallet_balance();

-- Function: Create default categories for new users
create or replace function public.create_default_categories()
returns trigger as $$
begin
  -- Default expense categories
  insert into public.categories (user_id, name, type, icon) values
    (NEW.id, 'Food & Drinks', 'expense', '🍔'),
    (NEW.id, 'Transport', 'expense', '🚗'),
    (NEW.id, 'Shopping', 'expense', '🛍️'),
    (NEW.id, 'Bills & Utilities', 'expense', '💡'),
    (NEW.id, 'Entertainment', 'expense', '🎬'),
    (NEW.id, 'Health', 'expense', '🏥'),
    (NEW.id, 'Education', 'expense', '📚'),
    (NEW.id, 'Other Expense', 'expense', '📦');

  -- Default income categories
  insert into public.categories (user_id, name, type, icon) values
    (NEW.id, 'Salary', 'income', '💰'),
    (NEW.id, 'Freelance', 'income', '💻'),
    (NEW.id, 'Investment', 'income', '📈'),
    (NEW.id, 'Gift', 'income', '🎁'),
    (NEW.id, 'Other Income', 'income', '💵');

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: Auto-create default categories on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_default_categories();
