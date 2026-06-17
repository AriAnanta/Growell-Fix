from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI(title="Growell Forecasting API")

API_KEY = os.getenv("API_KEY", "growell123")

# Try importing pygrowup for Z-score calculation
try:
    from pygrowup2 import Calculator
except ImportError:
    try:
        from pygrowup import Calculator
    except ImportError:
        Calculator = None

calc = Calculator() if Calculator else None

# Load 12 model terbaik saat startup
models = {}
for step in range(1, 7):
    for target in ['BB', 'TB']:
        path = f"models/model_{target}_t{step}.joblib"
        if os.path.exists(path):
            models[f'{target}_t{step}'] = joblib.load(path)

print(f"Model loaded: {list(models.keys())}")


class ForecastInput(BaseModel):
    usia_bulan: float
    jk: int               # L=0, P=1
    berat: float
    tinggi: float
    bb_t1: float
    bb_t2: float
    bb_t3: float
    tb_t1: float
    tb_t2: float
    tb_t3: float
    delta_bb: float
    delta_tb: float
    delta_bb_t1: float
    delta_tb_t1: float
    accel_bb: float
    accel_tb: float
    zs_bbu: float
    zs_tbu: float
    zs_bbtb: float
    zs_bbu_t1: float
    zs_tbu_t1: float


class ZScoreInput(BaseModel):
    berat: float
    tinggi: float
    usia_bulan: float
    jenis_kelamin: str   # "Laki-laki" atau "Perempuan"


@app.get("/")
def root():
    return {"message": "Growell Forecasting API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": len(models)}


@app.post("/zscore")
def zscore(
    data: ZScoreInput,
    x_api_key: str = Header(...)
):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    if not calc:
        raise HTTPException(status_code=503, detail="pygrowup tidak tersedia")

    sex = 'M' if data.jenis_kelamin.lower().startswith('l') else 'F'

    try:
        zs_bbu = calc.wfa(data.berat, data.usia_bulan, sex)
        zs_tbu = calc.lhfa(data.tinggi, data.usia_bulan, sex)
        zs_bbtb = calc.wfl(data.berat, data.usia_bulan, sex, data.tinggi)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal hitung z-score: {str(e)}")

    return {
        "zs_bb_u": round(float(zs_bbu), 4) if zs_bbu is not None else None,
        "zs_tb_u": round(float(zs_tbu), 4) if zs_tbu is not None else None,
        "zs_bb_tb": round(float(zs_bbtb), 4) if zs_bbtb is not None else None,
    }


@app.post("/forecast")
def forecast(
    data: ForecastInput,
    x_api_key: str = Header(...)
):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    X = np.array([[
        data.usia_bulan, data.jk,
        data.berat, data.tinggi,
        data.bb_t1, data.bb_t2, data.bb_t3,
        data.tb_t1, data.tb_t2, data.tb_t3,
        data.delta_bb, data.delta_tb,
        data.delta_bb_t1, data.delta_tb_t1,
        data.accel_bb, data.accel_tb,
        data.zs_bbu, data.zs_tbu, data.zs_bbtb,
        data.zs_bbu_t1, data.zs_tbu_t1
    ]])

    result = {
        "t0": {
            "bb": round(data.berat, 2),
            "tb": round(data.tinggi, 2)
        },
        "prediksi": []
    }

    for step in range(1, 7):
        bb_pred = models[f'BB_t{step}'].predict(X)[0]
        tb_pred = models[f'TB_t{step}'].predict(X)[0]

        result["prediksi"].append({
            "step": f"t+{step}",
            "bb": round(float(bb_pred), 2),
            "tb": round(float(tb_pred), 2)
        })

    return result