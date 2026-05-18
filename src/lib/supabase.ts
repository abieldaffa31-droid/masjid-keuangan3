import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      transaksi: {
        Row: {
          id: number
          tanggal: string
          uraian: string
          kategori: string
          jenis: 'masuk' | 'keluar'
          jumlah: number
          saldo: number
          created_at: string
        }
        Insert: {
          tanggal: string
          uraian: string
          kategori: string
          jenis: 'masuk' | 'keluar'
          jumlah: number
          saldo?: number
        }
      }
      wakaf: {
        Row: {
          id: number
          tanggal: string
          nama_wakif: string
          keterangan: string
          jumlah: number
          created_at: string
        }
        Insert: {
          tanggal: string
          nama_wakif: string
          keterangan?: string
          jumlah: number
        }
      }
      infaq_jumat: {
        Row: {
          id: number
          tanggal_jumat: string
          jumlah_kotak: number
          jumlah_online: number
          total: number
          created_at: string
        }
        Insert: {
          tanggal_jumat: string
          jumlah_kotak: number
          jumlah_online: number
          total?: number
        }
      }
    }
  }
}
