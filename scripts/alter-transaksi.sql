-- Jalankan di Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Paste semua, lalu klik Run

-- 1. Tambah kolom ke transaksi operasional
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS ft_number    text UNIQUE;
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS sub_kategori text;

-- 2. Fix transaksi_wakaf: tambah unique constraint + perbaiki RLS
ALTER TABLE transaksi_wakaf ADD COLUMN IF NOT EXISTS ft_number text;
ALTER TABLE transaksi_wakaf ADD COLUMN IF NOT EXISTS bulan text;
ALTER TABLE transaksi_wakaf ADD COLUMN IF NOT EXISTS deskripsi text;
ALTER TABLE transaksi_wakaf ADD COLUMN IF NOT EXISTS uang_masuk bigint DEFAULT 0;
ALTER TABLE transaksi_wakaf ADD COLUMN IF NOT EXISTS uang_keluar bigint DEFAULT 0;
ALTER TABLE transaksi_wakaf ADD COLUMN IF NOT EXISTS saldo bigint DEFAULT 0;
ALTER TABLE transaksi_wakaf ADD COLUMN IF NOT EXISTS sumber text;
ALTER TABLE transaksi_wakaf ADD COLUMN IF NOT EXISTS keterangan text;

-- Unique constraint untuk deduplication
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transaksi_wakaf_ft_number_key'
  ) THEN
    ALTER TABLE transaksi_wakaf ADD CONSTRAINT transaksi_wakaf_ft_number_key UNIQUE (ft_number);
  END IF;
END $$;

-- Enable RLS dan beri akses penuh ke anon key
ALTER TABLE transaksi_wakaf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all ON transaksi_wakaf;
CREATE POLICY allow_all ON transaksi_wakaf FOR ALL USING (true) WITH CHECK (true);

-- 3. Sama untuk transaksi
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all ON transaksi;
CREATE POLICY allow_all ON transaksi FOR ALL USING (true) WITH CHECK (true);
