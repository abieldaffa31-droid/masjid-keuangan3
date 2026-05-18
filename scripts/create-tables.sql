-- ============================================================
-- Masjid Pogung Raya – Schema Setup (v2)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ── 1. transaksi (operasional BSI) ────────────────────────
CREATE TABLE IF NOT EXISTS transaksi (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tanggal      date        NOT NULL,
  ft_number    text        UNIQUE,
  uraian       text,
  kategori     text,
  sub_kategori text,
  jenis        text        CHECK (jenis IN ('masuk','keluar')),
  jumlah       bigint      NOT NULL DEFAULT 0,
  saldo        bigint      DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS ft_number    text UNIQUE;
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS sub_kategori text;

-- ── 2. transaksi_wakaf (rekening wakaf BSI) ────────────────
CREATE TABLE IF NOT EXISTS transaksi_wakaf (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tanggal     date        NOT NULL,
  bulan       text,
  ft_number   text        UNIQUE,
  deskripsi   text,
  uang_masuk  bigint      DEFAULT 0,
  uang_keluar bigint      DEFAULT 0,
  saldo       bigint      DEFAULT 0,
  sumber      text,
  keterangan  text,
  created_at  timestamptz DEFAULT now()
);

-- ── 3. wakaf (catatan per-wakif manual) ───────────────────
CREATE TABLE IF NOT EXISTS wakaf (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tanggal    date        NOT NULL,
  nama_wakif text        NOT NULL,
  keterangan text,
  jumlah     bigint      NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── 4. infaq_jumat ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS infaq_jumat (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tanggal_jumat date        NOT NULL UNIQUE,
  jumlah_kotak  bigint      DEFAULT 0,
  jumlah_online bigint      DEFAULT 0,
  total         bigint GENERATED ALWAYS AS (jumlah_kotak + jumlah_online) STORED,
  created_at    timestamptz DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE transaksi        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_wakaf  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wakaf            ENABLE ROW LEVEL SECURITY;
ALTER TABLE infaq_jumat      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transaksi'       AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON transaksi       FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transaksi_wakaf' AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON transaksi_wakaf FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wakaf'           AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON wakaf           FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='infaq_jumat'     AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON infaq_jumat     FOR ALL USING (true) WITH CHECK (true); END IF;
END $$;
