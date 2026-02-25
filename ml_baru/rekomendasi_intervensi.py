from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, List

app = FastAPI(
    title="Sistem Rekomendasi Intervensi Gizi Balita",
    description="API untuk menentukan intervensi gizi berdasarkan data Kader dan Orang Tua",
    version="1.0.0"
)

# --- ENUMERATIONS (Pilihan Jawaban Sesuai Google Form) ---

class StatusGiziBBTB(str, Enum):
    GIZI_BURUK = "Gizi Buruk"
    GIZI_KURANG = "Gizi Kurang"
    GIZI_BAIK = "Gizi Baik"
    GIZI_LEBIH = "Gizi Lebih"

class StatusGiziTBU(str, Enum):
    SANGAT_PENDEK = "Sangat Pendek"
    PENDEK = "Pendek"
    NORMAL = "Normal"
    TINGGI = "Tinggi"

class PolaAsuh(str, Enum):
    RESPONSIVE = "Responsive feeding"
    PEMAKSAAN = "Pemaksaan makan"
    DIBIARKAN = "Dibiarkan makan sendiri"

class Sanitasi(str, Enum):
    SEPTIC_TANK = "Toilet dengan septic tank"
    JAMBAN_SEPTIC = "Jamban dengan septic tank"
    LANGSUNG_SELOKAN = "Toilet tanpa septic tank (ke selokan)"
    JAMBAN_SELOKAN = "Jamban langsung ke selokan"
    SUNGAI_KEBUN = "Buang air di sungai/kebun"

class FrekuensiProtein(str, Enum):
    SETIAP_HARI = "Ya, setiap hari"
    TIDAK_RUTIN = "Ya, namun tidak rutin"
    TIDAK_PERNAH = "Tidak pernah"

# --- INPUT MODEL (Data Gabungan Kader + Orang Tua) ---

class BalitaData(BaseModel):
    # Data Demografi & Fisik (Sumber: Form Kader)
    usia_bulan: int = Field(..., description="Umur balita dalam bulan")
    berat_badan: float = Field(..., description="Berat badan dalam kg")
    
    # Status Gizi (Sumber: Form Kader - Hasil Plotting Kader)
    status_gizi_bb_tb: StatusGiziBBTB = Field(..., description="BB menurut TB (Wasting)")
    status_gizi_tb_u: StatusGiziTBU = Field(..., description="TB menurut Umur (Stunting)")
    
    # Data Riwayat & Kebiasaan (Sumber: Form Orang Tua)
    asi_eksklusif: bool = Field(..., description="Apakah mendapat ASI Eksklusif 6 bulan?")
    konsumsi_protein_hewani: FrekuensiProtein = Field(..., description="Frekuensi makan telur/ikan/daging")
    pola_asuh_makan: PolaAsuh = Field(..., description="Cara orang tua memberi makan")
    
    # Data Lingkungan & Kesehatan (Sumber: Form Orang Tua)
    riwayat_sakit_2minggu: bool = Field(False, description="Apakah sakit (diare/demam) dalam 2 minggu terakhir?")
    jenis_sanitasi: Sanitasi = Field(..., description="Jenis jamban keluarga")
    rutin_vitamin_a: bool = Field(True, description="Apakah rutin mendapat Vitamin A?")
    rutin_posyandu: bool = Field(True, description="Apakah rutin ke Posyandu?")

# --- OUTPUT MODEL ---

class RekomendasiResponse(BaseModel):
    rekomendasi_utama: str
    rekomendasi_tambahan: List[str] = []
    catatan: str

# --- LOGIC ENGINE ---

def determine_intervention(data: BalitaData) -> RekomendasiResponse:
    rec_list = []
    
    # 1. Cek Kondisi Kritis (Gizi Buruk/Kurang) - Prioritas Tertinggi
    if data.status_gizi_bb_tb == StatusGiziBBTB.GIZI_BURUK:
        return RekomendasiResponse(
            rekomendasi_utama="Tatalaksana balita gizi kurang/gagal tumbuh",
            rekomendasi_tambahan=["PMT Pemulihan & Rujuk Puskesmas"],
            catatan="Kondisi Gizi Buruk memerlukan penanganan medis segera."
        )
    
    if data.status_gizi_bb_tb == StatusGiziBBTB.GIZI_KURANG:
        rec_list.append("PMT Pemulihan & Rujuk Puskesmas")

    # 2. Cek Stunting (Pendek/Sangat Pendek) & Masalah Makan
    if data.status_gizi_tb_u in [StatusGiziTBU.PENDEK, StatusGiziTBU.SANGAT_PENDEK]:
        # Jika stunting, biasanya fokus ke protein hewani dan sanitasi
        if data.konsumsi_protein_hewani != FrekuensiProtein.SETIAP_HARI:
            rec_list.append("Konseling MP-ASI Peningkatan Protein Hewani")
        
    # 3. Cek Masalah ASI (Untuk bayi < 24 bulan atau riwayat ASI tidak eksklusif)
    if data.usia_bulan < 6 and not data.asi_eksklusif:
        rec_list.append("Konseling Laktasi & Pemberian ASI")
    elif data.usia_bulan < 24 and not data.asi_eksklusif: # Masih masa menyusui
         rec_list.append("Konseling Laktasi & Pemberian ASI")

    # 4. Cek Masalah Pola Asuh Makan
    if data.pola_asuh_makan != PolaAsuh.RESPONSIVE:
        rec_list.append("Edukasi pola asuh responsive feeding")

    # 5. Cek Sanitasi & Penyakit (Diare/Demam)
    sanitasi_buruk = data.jenis_sanitasi in [Sanitasi.LANGSUNG_SELOKAN, Sanitasi.JAMBAN_SELOKAN, Sanitasi.SUNGAI_KEBUN]
    if sanitasi_buruk or data.riwayat_sakit_2minggu:
        rec_list.append("Edukasi Sanitasi & Perilaku Hidup Bersih Sehat (PHBS)")

    # 6. Cek Suplemen
    if not data.rutin_vitamin_a:
        rec_list.append("Pemberian suplemen (Vitamin A, Zinc, Fe)")
        
    # 7. Cek Asupan Protein (General Check)
    if data.konsumsi_protein_hewani == FrekuensiProtein.TIDAK_PERNAH:
        if "Konseling MP-ASI Peningkatan Protein Hewani" not in rec_list:
            rec_list.append("Konseling MP-ASI Peningkatan Protein Hewani")

    # --- FINAL DECISION ---
    
    # Jika tidak ada masalah yang terdeteksi
    if not rec_list:
        return RekomendasiResponse(
            rekomendasi_utama="Pemantauan Pertumbuhan Rutin (Tidak ada masalah spesifik)",
            catatan="Status gizi baik dan faktor risiko rendah. Lanjutkan pemantauan rutin."
        )
    
    # Jika ada masalah, ambil yang pertama sebagai rekomendasi utama, sisanya tambahan
    return RekomendasiResponse(
        rekomendasi_utama=rec_list[0],
        rekomendasi_tambahan=rec_list[1:],
        catatan=f"Ditemukan {len(rec_list)} faktor risiko yang perlu diintervensi."
    )

# --- ENDPOINT ---

@app.post("/predict-rekomendasi", response_model=RekomendasiResponse)
async def predict_rekomendasi(data: BalitaData):
    """
    Menerima data kondisi balita dan memberikan rekomendasi intervensi gizi 
    sesuai kategori Posyandu.
    """
    result = determine_intervention(data)
    return result

@app.get("/")
def read_root():
    return {"message": "API Rekomendasi Gizi Balita Aktif. Gunakan endpoint /predict-rekomendasi"}