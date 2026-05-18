-- Tabel Transaksi (Buku Besar)
CREATE TABLE IF NOT EXISTS transaksi (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL,
  uraian TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Umum',
  jenis TEXT NOT NULL CHECK (jenis IN ('masuk', 'keluar')),
  jumlah BIGINT NOT NULL,
  saldo BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Wakaf
CREATE TABLE IF NOT EXISTS wakaf (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL,
  nama_wakif TEXT NOT NULL,
  keterangan TEXT DEFAULT '',
  jumlah BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Infaq Jumat
CREATE TABLE IF NOT EXISTS infaq_jumat (
  id SERIAL PRIMARY KEY,
  tanggal_jumat DATE NOT NULL UNIQUE,
  jumlah_kotak BIGINT NOT NULL DEFAULT 0,
  jumlah_online BIGINT NOT NULL DEFAULT 0,
  total BIGINT GENERATED ALWAYS AS (jumlah_kotak + jumlah_online) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (baca publik)
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE wakaf ENABLE ROW LEVEL SECURITY;
ALTER TABLE infaq_jumat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_transaksi" ON transaksi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_wakaf" ON wakaf FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_infaq_jumat" ON infaq_jumat FOR ALL USING (true) WITH CHECK (true);

-- Data contoh transaksi
INSERT INTO transaksi (tanggal, uraian, kategori, jenis, jumlah, saldo) VALUES
('2025-05-01', 'Saldo Awal', 'Umum', 'masuk', 50000000, 50000000),
('2025-05-02', 'Infaq Jumat', 'Infaq', 'masuk', 3500000, 53500000),
('2025-05-05', 'Listrik & Air', 'Operasional', 'keluar', 1200000, 52300000),
('2025-05-09', 'Infaq Jumat', 'Infaq', 'masuk', 4100000, 56400000),
('2025-05-10', 'Honorarium Imam', 'SDM', 'keluar', 2500000, 53900000),
('2025-05-12', 'Donasi Online', 'Donasi', 'masuk', 5000000, 58900000),
('2025-05-15', 'Pembelian Alat Kebersihan', 'Sarana', 'keluar', 750000, 58150000),
('2025-05-16', 'Infaq Jumat', 'Infaq', 'masuk', 3800000, 61950000),
('2025-05-18', 'Biaya Perawatan AC', 'Sarana', 'keluar', 1500000, 60450000);

-- Data contoh wakaf
INSERT INTO wakaf (tanggal, nama_wakif, keterangan, jumlah) VALUES
('2025-01-10', 'Hamba Allah', 'Wakaf Pembangunan', 50000000),
('2025-02-15', 'Bapak Ahmad', 'Wakaf Lantai 2', 100000000),
('2025-03-20', 'Ibu Fatimah', 'Wakaf Umum', 25000000),
('2025-04-05', 'PT. Berkah Sejahtera', 'Wakaf Pembangunan', 200000000),
('2025-04-18', 'Hamba Allah', 'Wakaf Masjid', 75000000),
('2025-05-01', 'Keluarga Santoso', 'Wakaf Almarhum', 50000000);

-- Data contoh infaq jumat
INSERT INTO infaq_jumat (tanggal_jumat, jumlah_kotak, jumlah_online) VALUES
('2025-05-02', 3500000, 850000),
('2025-05-09', 3900000, 1200000),
('2025-05-16', 3800000, 950000);
