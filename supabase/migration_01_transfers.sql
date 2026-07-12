-- ============================================
-- MIGRATION SCRIPT: Fitur Transfer & Tipe Wallet
-- ============================================
-- SILAKAN COPY KODE INI DAN JALANKAN DI SUPABASE SQL EDITOR

-- 1. Update tabel wallets (tambah tipe)
ALTER TABLE public.wallets 
ADD COLUMN type text NOT NULL DEFAULT 'bank' 
CHECK (type IN ('cash', 'e-wallet', 'bank'));

-- 2. Update tabel transactions (tambah target wallet & izinkan tipe transfer)
-- Karena tidak bisa langsung mengubah constraint CHECK dengan mudah,
-- kita harus hapus constraint lama dan buat yang baru.
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense', 'transfer'));

ALTER TABLE public.transactions 
ADD COLUMN to_wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE;

-- Buat index untuk to_wallet_id agar query cepat
CREATE INDEX idx_transactions_to_wallet_id ON public.transactions(to_wallet_id);

-- 3. Update Fungsi Database Trigger untuk Saldo
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET current_balance = current_balance + NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.wallets SET current_balance = current_balance - NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' THEN
      -- Kurangi dari sumber
      UPDATE public.wallets SET current_balance = current_balance - NEW.amount WHERE id = NEW.wallet_id;
      -- Tambah ke target
      UPDATE public.wallets SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_wallet_id;
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET current_balance = current_balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.wallets SET current_balance = current_balance + OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' THEN
      -- Kembalikan ke sumber
      UPDATE public.wallets SET current_balance = current_balance + OLD.amount WHERE id = OLD.wallet_id;
      -- Tarik dari target
      UPDATE public.wallets SET current_balance = current_balance - OLD.amount WHERE id = OLD.to_wallet_id;
    END IF;
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- REVERSE (BATALKAN) TRANSAKSI LAMA
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET current_balance = current_balance - OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.wallets SET current_balance = current_balance + OLD.amount WHERE id = OLD.wallet_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.wallets SET current_balance = current_balance + OLD.amount WHERE id = OLD.wallet_id;
      UPDATE public.wallets SET current_balance = current_balance - OLD.amount WHERE id = OLD.to_wallet_id;
    END IF;

    -- APPLY TRANSAKSI BARU
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET current_balance = current_balance + NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.wallets SET current_balance = current_balance - NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE public.wallets SET current_balance = current_balance - NEW.amount WHERE id = NEW.wallet_id;
      UPDATE public.wallets SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_wallet_id;
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
