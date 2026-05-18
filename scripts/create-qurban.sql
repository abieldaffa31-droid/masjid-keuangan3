-- Jalankan di Supabase SQL Editor
-- Tabel hewan qurban (lengkap dengan tipe & harga)

CREATE TABLE IF NOT EXISTS hewan_qurban (
  id            bigserial PRIMARY KEY,
  jenis_hewan   text NOT NULL,          -- 'Sapi' | 'Kambing'
  tipe          text NOT NULL,          -- 'Diamond'|'Platinum'|'Gold'|'Jumbo'|'Super'|'Besar'|'Sedang 2'|'Sedang'|'Biasa'
  grup          text,                   -- untuk sapi 1/7: 'Diamond 01', 'Platinum 02', dst
  nama_pemilik  text,
  harga         bigint NOT NULL DEFAULT 0,
  include_sembelih boolean DEFAULT true,
  status        text DEFAULT 'Lunas',   -- 'Lunas' | 'DP' | 'Belum Bayar'
  keterangan    text,
  tanggal       date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE hewan_qurban ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all ON hewan_qurban;
CREATE POLICY allow_all ON hewan_qurban FOR ALL USING (true) WITH CHECK (true);
