"""
=============================================================================
  Pediatric Nutritional Intervention Recommender — FastAPI (Single File)
=============================================================================
  Menggabungkan: src/config.py + src/features/builder.py + src/api/*.py
  menjadi SATU file agar mudah dijalankan tanpa masalah import.

  Cara jalankan (dari folder PRODUK-TA):
      uvicorn main:app --reload --host 0.0.0.0 --port 8000

  Atau tanpa reload (production):
      uvicorn main:app --host 0.0.0.0 --port 8000

  Endpoint:
      GET  /api/v1/health   → cek status model
      POST /api/v1/predict  → prediksi rekomendasi intervensi gizi
      GET  /docs            → Swagger UI (otomatis dari FastAPI)
=============================================================================
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict

import joblib
from fastapi.responses import RedirectResponse
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict

# =============================================================================
# SECTION 1: KONFIGURASI (dari src/config.py)
# =============================================================================

# --- Path otomatis relatif terhadap lokasi file ini ---
PROJECT_ROOT = Path(__file__).resolve().parent
MODELS_DIR   = PROJECT_ROOT / "models"

# [FIX BUG #2] Cek kedua folder: models/ dan saved_models/
# Sebelumnya config.py hanya menunjuk ke "models/" tapi saved_models/ juga ada.
_SAVED_MODELS_DIR = PROJECT_ROOT / "saved_models"

def _find_model_file(filename: str) -> Path:
    """Cari file model di folder models/ dulu, lalu saved_models/."""
    primary = MODELS_DIR / filename
    if primary.exists():
        return primary
    fallback = _SAVED_MODELS_DIR / filename
    if fallback.exists():
        return fallback
    # Kembalikan path primary sebagai default (akan gagal saat load, pesan error jelas)
    return primary

BEST_MODEL_PATH    = _find_model_file("best_model.joblib")
PREPROCESSOR_PATH  = _find_model_file("preprocessor.joblib")
LABEL_ENCODER_PATH = _find_model_file("label_encoder.joblib")

API_VERSION = "v1"

# --- Kolom fitur numerik inti (8 kolom) ---
NUMERIC_CORE_FIELDS = [
    "umur_balita",
    "tinggi_badan_cm",
    "berat_badan_kg",
    "lila_cm",
    "lingkar_kepala_cm",
    "usia_kehamilan_lahir",
    "berat_lahir_kg",
    "panjang_lahir_cm",
]

# --- Kolom fitur kategorikal inti (11 kolom) ---
CATEGORICAL_CORE_FIELDS = [
    "status_gizi_tbu",
    "status_gizi_bbtb",
    "status_gizi_bbu",
    "is_pernah_pmt",
    "is_asi_eksklusif",
    "is_mpasi_hewani",
    "jenis_sanitasi",
    "kebiasaan_cuci_tangan",
    "is_sakit_2_minggu",
    "tren_bb_bulan_lalu",
    "jenis_kelamin",
]

# --- Urutan 19 fitur inti PERSIS seperti core_features di notebook ---
CORE_INPUT_FIELDS = [
    "status_gizi_tbu",
    "status_gizi_bbtb",
    "status_gizi_bbu",
    "is_pernah_pmt",
    "umur_balita",
    "is_asi_eksklusif",
    "is_mpasi_hewani",
    "jenis_sanitasi",
    "kebiasaan_cuci_tangan",
    "is_sakit_2_minggu",
    "tinggi_badan_cm",
    "berat_badan_kg",
    "lila_cm",
    "lingkar_kepala_cm",
    "tren_bb_bulan_lalu",
    "jenis_kelamin",
    "usia_kehamilan_lahir",
    "berat_lahir_kg",
    "panjang_lahir_cm",
]

# --- 10 fitur engineered (dihitung di API, urutan PERSIS build_fe_v2 notebook) ---
FE_FIELDS = [
    "fe_growth_routine_monitor",
    "fe_growth_failure_case",
    "fe_referral_severity",
    "fe_referral_with_pmt_history",
    "fe_mpasi_window_6_24",
    "fe_lactation_window_0_6",
    "fe_tbu_borderline_pendek",
    "fe_sanitasi_risk",
    "fe_recent_sick",
    "fe_phbs_high_risk",
]

# --- 29 kolom final yang masuk ke preprocessor (inti 19 + fe 10) ---
USE_COLS = CORE_INPUT_FIELDS + FE_FIELDS

# --- Mapping label English → Bahasa Indonesia ---
LABEL_ID_MAP: Dict[str, str] = {
    "Sanitation and Clean and Healthy Living Behavior (CHLB) Education":
        "Edukasi Sanitasi & PHBS",
    "Responsive Feeding Education":
        "Edukasi Pola Asuh Responsive Feeding",
    "Lactation Counseling and Breastfeeding Support":
        "Konseling Laktasi & ASI",
    "Complementary Feeding Counseling for Animal Protein Enhancement":
        "Konseling MP-ASI Protein Hewani",
    "Recovery Supplementary Feeding and Primary Healthcare Referral":
        "PMT Pemulihan & Rujukan",
    "Routine Growth Monitoring (No specific issues detected)":
        "Pemantauan Pertumbuhan Rutin",
    "Micronutrient Supplementation (Vitamin A, Zinc, Iron)":
        "Suplementasi Mikronutrien (Vitamin A, Zinc, Fe)",
    "Management of Underweight or Failure to Thrive Children":
        "Tatalaksana Gagal Tumbuh",
}


def to_indonesian_label(model_label: str) -> str:
    """Map label model (English) ke Bahasa Indonesia. Fallback ke label asli."""
    return LABEL_ID_MAP.get(model_label, model_label)


# =============================================================================
# SECTION 2: FEATURE ENGINEERING (dari src/features/builder.py)
# =============================================================================

def _yn_to_num(x) -> int:
    """'Ya' -> 1, selain itu -> 0 (case-insensitive, aman untuk NaN)."""
    if pd.isna(x):
        return 0
    s = str(x).strip().lower()
    return 1 if s in {"ya", "y", "iya", "1", "true", "ada"} else 0


def _txt(series: pd.Series) -> pd.Series:
    """Normalisasi teks: string + lowercase + strip."""
    return series.astype(str).str.lower().str.strip()


def _to_num(series: pd.Series) -> pd.Series:
    """Konversi ke numerik (coerce)."""
    return pd.to_numeric(series, errors="coerce")


def _build_fe_v2(z: pd.DataFrame) -> pd.DataFrame:
    """
    Mereplikasi PERSIS logika build_fe_v2() dari notebook
    agar tidak terjadi training/serving skew.
    """
    df = z.copy()

    # --- fe_growth_*, fe_referral_* (butuh 3 kolom status gizi) ---
    if all(c in df.columns for c in
           ["status_gizi_tbu", "status_gizi_bbtb", "status_gizi_bbu"]):
        tbu  = _txt(df["status_gizi_tbu"])
        bbtb = _txt(df["status_gizi_bbtb"])
        bbu  = _txt(df["status_gizi_bbu"])

        df["fe_growth_routine_monitor"] = (
            tbu.str.contains("normal|tinggi", na=False)
            & bbtb.str.contains("gizi baik|gizi lebih", na=False)
            & bbu.str.contains("berat badan normal|berat badan lebih", na=False)
        ).astype(int)

        df["fe_growth_failure_case"] = (
            bbtb.str.contains("gizi kurang|gizi buruk", na=False)
            | bbu.str.contains(
                "berat badan kurang|berat badan sangat kurang", na=False)
        ).astype(int)

        df["fe_referral_severity"] = (
            tbu.str.contains("sangat pendek", na=False)
            | bbtb.str.contains("gizi buruk", na=False)
        ).astype(int)

    # --- fe_referral_with_pmt_history ---
    if "is_pernah_pmt" in df.columns:
        df["fe_referral_with_pmt_history"] = (
            (df.get("fe_referral_severity", pd.Series([0])) == 1)
            & (df["is_pernah_pmt"].apply(_yn_to_num) == 1)
        ).astype(int)

    # --- fe_mpasi_window_6_24, fe_lactation_window_0_6 ---
    if "umur_balita" in df.columns:
        um = _to_num(df["umur_balita"])
        df["fe_mpasi_window_6_24"]    = ((um >= 6) & (um <= 24)).astype(int)
        df["fe_lactation_window_0_6"] = ((um >= 0) & (um <= 6)).astype(int)

    # --- fe_tbu_borderline_pendek ---
    if "status_gizi_tbu" in df.columns:
        df["fe_tbu_borderline_pendek"] = (
            _txt(df["status_gizi_tbu"]).str.contains("pendek", na=False)
        ).astype(int)

    # --- fe_sanitasi_risk ---
    if "jenis_sanitasi" in df.columns:
        sj = _txt(df["jenis_sanitasi"])
        df["fe_sanitasi_risk"] = (
            sj.str.contains("tanpa tangki|selokan|sungai|terbuka", na=False)
        ).astype(int)

    # --- fe_recent_sick ---
    if "is_sakit_2_minggu" in df.columns:
        df["fe_recent_sick"] = df["is_sakit_2_minggu"].apply(_yn_to_num)

    # --- fe_phbs_high_risk ---
    if all(c in df.columns for c in ["fe_sanitasi_risk", "fe_recent_sick"]):
        df["fe_phbs_high_risk"] = (
            (pd.to_numeric(df["fe_sanitasi_risk"], errors="coerce") == 1)
            & (pd.to_numeric(df["fe_recent_sick"],  errors="coerce") == 1)
        ).astype(int)

    return df


def build_features(raw: dict) -> pd.DataFrame:
    """
    Bangun DataFrame 1 baris (29 kolom urut USE_COLS) dari input mentah.

    Alur:
      1. Ambil hanya 19 fitur inti dari `raw`.
      2. Paksa tipe: numerik -> float, kategorikal -> str.
      3. Hitung 10 fe_*.
      4. Pastikan semua kolom ada (isi 0 jika hilang).
      5. Reindex ke USE_COLS (urutan persis seperti training).
    """
    row = {col: raw.get(col, None) for col in CORE_INPUT_FIELDS}
    df  = pd.DataFrame([row])

    # Paksa tipe data
    for c in NUMERIC_CORE_FIELDS:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").astype(float)
    for c in CATEGORICAL_CORE_FIELDS:
        if c in df.columns:
            df[c] = df[c].astype(str)

    # Tambahkan fe_*
    df = _build_fe_v2(df)

    # Pastikan semua kolom USE_COLS ada (fe_* yang sumbernya hilang → 0)
    for c in USE_COLS:
        if c not in df.columns:
            df[c] = 0

    # Urutkan persis seperti training
    return df.reindex(columns=USE_COLS)


# =============================================================================
# SECTION 3: PYDANTIC MODELS (dari src/api/models.py)
# =============================================================================

class HealthCheck(BaseModel):
    status: str
    version: str
    model_loaded: bool


class PredictionRequest(BaseModel):
    """
    Input endpoint /predict.
    Field extra dari kuesioner (jika ada) otomatis diabaikan (extra='ignore').
    """
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "status_gizi_tbu":     "Normal",
                "status_gizi_bbtb":    "Gizi Baik",
                "status_gizi_bbu":     "Berat Badan Normal",
                "is_pernah_pmt":       "Tidak",
                "umur_balita":         24,
                "is_asi_eksklusif":    "Ya",
                "is_mpasi_hewani":     "Ya, setiap hari",
                "jenis_sanitasi":      "Toilet atau jamban dengan tangki penampung kotoran",
                "kebiasaan_cuci_tangan": "Selalu",
                "is_sakit_2_minggu":   "Tidak",
                "tinggi_badan_cm":     85.0,
                "berat_badan_kg":      12.0,
                "lila_cm":             13.5,
                "lingkar_kepala_cm":   47.0,
                "tren_bb_bulan_lalu":  "Naik",
                "jenis_kelamin":       "Laki-laki",
                "usia_kehamilan_lahir": 9,
                "berat_lahir_kg":      3.1,
                "panjang_lahir_cm":    49.0,
            }
        },
    )

    # --- Kategorikal (wajib) ---
    status_gizi_tbu:       str = Field(..., description="Status gizi TB/U (HAZ)")
    status_gizi_bbtb:      str = Field(..., description="Status gizi BB/TB (WHZ)")
    status_gizi_bbu:       str = Field(..., description="Status gizi BB/U (WAZ)")
    is_pernah_pmt:         str = Field(..., description="Pernah dapat PMT? Ya/Tidak")
    is_asi_eksklusif:      str = Field(..., description="ASI eksklusif? Ya/Tidak")
    is_mpasi_hewani:       str = Field(..., description="MP-ASI hewani?")
    jenis_sanitasi:        str = Field(..., description="Jenis sanitasi")
    kebiasaan_cuci_tangan: str = Field(..., description="Kebiasaan cuci tangan")
    is_sakit_2_minggu:     str = Field(..., description="Sakit 2 minggu terakhir? Ya/Tidak")
    tren_bb_bulan_lalu:    str = Field(..., description="Tren BB vs bulan lalu (Naik/Tetap/Turun)")
    jenis_kelamin:         str = Field(..., description="Laki-laki / Perempuan")

    # --- Numerik (wajib, dengan range validasi) ---
    umur_balita:          float = Field(..., ge=0,   le=60,  description="Umur (bulan)")
    tinggi_badan_cm:      float = Field(..., ge=40,  le=120, description="Tinggi/panjang badan (cm)")
    berat_badan_kg:       float = Field(..., ge=2,   le=25,  description="Berat badan (kg)")
    lila_cm:              float = Field(..., ge=7,   le=20,  description="LILA (cm)")
    lingkar_kepala_cm:    float = Field(..., ge=30,  le=60,  description="Lingkar kepala (cm)")
    usia_kehamilan_lahir: float = Field(..., ge=5,   le=12,  description="Usia kehamilan saat lahir (bulan)")
    berat_lahir_kg:       float = Field(..., ge=0.5, le=6,   description="Berat lahir (kg)")
    panjang_lahir_cm:     float = Field(..., ge=25,  le=60,  description="Panjang lahir (cm)")


class PredictionResponse(BaseModel):
    rekomendasi:      str              = Field(..., description="Rekomendasi intervensi (Bahasa Indonesia)")
    label_model:      str              = Field(..., description="Label asli dari model (English)")
    confidence:       float            = Field(..., ge=0, le=1, description="Confidence kelas terpilih")
    all_probabilities: Dict[str, float] = Field(
        ..., description="Probabilitas semua kelas (key Bahasa Indonesia)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "rekomendasi":  "Pemantauan Pertumbuhan Rutin",
                "label_model":  "Routine Growth Monitoring (No specific issues detected)",
                "confidence":   0.87,
                "all_probabilities": {
                    "Pemantauan Pertumbuhan Rutin":          0.87,
                    "Edukasi Sanitasi & PHBS":               0.08,
                    "Konseling MP-ASI Protein Hewani":       0.05,
                },
            }
        }
    )


# =============================================================================
# SECTION 4: FASTAPI APP (dari src/api/main.py + endpoints.py)
# [FIX BUG #1] Tidak ada circular import karena semuanya dalam 1 file
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("nutrition_api")

# State global — diisi saat startup
_model         = None
_preprocessor  = None
_label_encoder = None


def _is_ready() -> bool:
    """True jika semua artifacts model sudah ter-load."""
    return all(x is not None for x in (_model, _preprocessor, _label_encoder))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load artifacts saat startup; log info saat shutdown."""
    global _model, _preprocessor, _label_encoder
    try:
        logger.info("Memuat model artifacts ...")
        logger.info("  best_model    → %s", BEST_MODEL_PATH)
        logger.info("  preprocessor  → %s", PREPROCESSOR_PATH)
        logger.info("  label_encoder → %s", LABEL_ENCODER_PATH)
        _model         = joblib.load(BEST_MODEL_PATH)
        _preprocessor  = joblib.load(PREPROCESSOR_PATH)
        _label_encoder = joblib.load(LABEL_ENCODER_PATH)
        logger.info("✓ Semua artifacts berhasil dimuat.")
    except FileNotFoundError as exc:
        logger.error(
            "File model tidak ditemukan: %s\n"
            "Pastikan file .joblib ada di folder models/ atau saved_models/.\n"
            "API tetap jalan; endpoint /predict akan mengembalikan HTTP 503.", exc
        )
        _model = _preprocessor = _label_encoder = None
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Gagal load artifacts (%s). API tetap jalan; /predict → 503.", exc
        )
        _model = _preprocessor = _label_encoder = None
    yield
    logger.info("API sedang shutdown ...")


app = FastAPI(
    title="Pediatric Nutritional Intervention Recommender",
    description=(
        "API rekomendasi intervensi gizi balita berbasis Machine Learning.\n\n"
        "Model: XGBoost (best_model.joblib)\n"
        "Input: 19 fitur kuesioner → 29 kolom setelah feature engineering\n"
        "Output: Kelas intervensi + confidence + probabilitas semua kelas"
    ),
    version=API_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # PRODUKSI: ganti dengan domain frontend Anda
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Endpoint: Root (redirect ke docs) ---
@app.get(
    "/",
    include_in_schema=False,  # Tidak muncul di Swagger
)
async def root():
    return RedirectResponse(url="/docs")


# --- Endpoint: Health Check ---
@app.get(
    f"/api/{API_VERSION}/health",
    response_model=HealthCheck,
    summary="Cek status API dan ketersediaan model",
    tags=["Monitoring"],
)
async def health() -> HealthCheck:
    return HealthCheck(
        status="healthy",
        version=API_VERSION,
        model_loaded=_is_ready(),
    )


# --- Endpoint: Prediksi ---
@app.post(
    f"/api/{API_VERSION}/predict",
    response_model=PredictionResponse,
    summary="Prediksi rekomendasi intervensi gizi balita",
    tags=["Prediksi"],
)
async def predict(request: PredictionRequest) -> PredictionResponse:
    # [FIX BUG #2] Cek apakah model sudah siap
    if not _is_ready():
        raise HTTPException(
            status_code=503,
            detail=(
                "Model belum tersedia. "
                "Letakkan file .joblib (best_model, preprocessor, label_encoder) "
                "di folder models/ atau saved_models/."
            ),
        )

    try:
        raw = request.model_dump()

        # Bangun DataFrame 29 kolom
        X   = build_features(raw)

        # Transform dengan preprocessor (OHE + scaling)
        X_t = _preprocessor.transform(X)

        # [FIX BUG #3] Perbaikan ekspresi proba yang salah semantik
        # Sebelumnya: proba = state.preprocessor and state.model.predict_proba(X_t)[0]
        proba    = _model.predict_proba(X_t)[0]          # ndarray shape (n_classes,)
        pred_idx = int(_model.predict(X_t)[0])

        # Label English dari encoder → terjemahkan ke Indonesia
        model_label  = _label_encoder.inverse_transform([pred_idx])[0]
        rekomendasi  = to_indonesian_label(model_label)
        confidence   = float(proba[pred_idx])

        # Probabilitas semua kelas → diurutkan descending
        all_probs = {
            to_indonesian_label(en_label): float(proba[i])
            for i, en_label in enumerate(_label_encoder.classes_)
        }
        all_probs = dict(
            sorted(all_probs.items(), key=lambda kv: kv[1], reverse=True)
        )

        return PredictionResponse(
            rekomendasi=rekomendasi,
            label_model=model_label,
            confidence=confidence,
            all_probabilities=all_probs,
        )

    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Error saat prediksi: %s", exc)
        raise HTTPException(status_code=500, detail=f"Gagal prediksi: {exc}")


# =============================================================================
# SECTION 5: ENTRY POINT (opsional — untuk dijalankan langsung)
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
