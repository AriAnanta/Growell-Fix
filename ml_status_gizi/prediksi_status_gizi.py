import os
import json
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn

app = FastAPI(title="Prediksi Status Gizi Balita API")

# --- GLOBAL VARIABLES ---
models = {}
scaler = None
features_to_scale = []
expected_features = []
target_encoders = {}

# --- STARTUP EVENT TO LOAD ARTIFACTS ---
@app.on_event("startup")
def load_artifacts():
    global models, scaler, features_to_scale, expected_features, target_encoders
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(base_dir, 'models_step11_all_ver5')
    artefak_dir = os.path.join(base_dir, 'artefak')
    
    # Load Models
    try:
        models['TB/U'] = joblib.load(os.path.join(model_dir, 'status_gizi_tbu__lgb__smoteenn.joblib'))
        models['BB/TB'] = joblib.load(os.path.join(model_dir, 'status_gizi_bbtb__lgb__smoteenn.joblib'))
        models['BB/U'] = joblib.load(os.path.join(model_dir, 'status_gizi_bbu__lgb__smoteenn.joblib'))
    except Exception as e:
        print(f"Gagal memuat model: {e}")

    # Load preprocessing mappings
    try:
        mappings = joblib.load(os.path.join(artefak_dir, 'preprocessing_mappings.joblib'))
        features_to_scale = mappings.get('features_to_scale', [])
    except Exception as e:
        print(f"Gagal memuat preprocessing_mappings: {e}")

    # Load scaler
    try:
        scaler = joblib.load(os.path.join(artefak_dir, 'scaler.joblib'))
    except Exception as e:
        print(f"Gagal memuat scaler: {e}")

    # Load target encoders
    try:
        raw_target_encoders = joblib.load(os.path.join(artefak_dir, 'target_encoders.joblib'))
        # Reverse the target encoders to map prediction int -> string label
        for target, encoding_dict in raw_target_encoders.items():
            reversed_dict = {v: k for k, v in encoding_dict.items()}
            
            # Map the exact model name logic to standard outputs
            if target == 'status_gizi_tbu':
                target_encoders['TB/U'] = reversed_dict
            elif target == 'status_gizi_bbtb':
                target_encoders['BB/TB'] = reversed_dict
            elif target == 'status_gizi_bbu':
                target_encoders['BB/U'] = reversed_dict
    except Exception as e:
        print(f"Gagal memuat target encoders: {e}")

    # Extract expected features from one of the models (these are sanitized)
    if 'TB/U' in models:
        model = models['TB/U']
        if hasattr(model, 'feature_name_'):
            expected_features = list(model.feature_name_)
        elif hasattr(model, 'feature_names_in_'):
            expected_features = list(model.feature_names_in_)

def sanitize_lgbm_col_names(df):
    if df is None: return None
    cols = df.columns
    new_cols = []
    seen = set()
    for c in cols:
        new_c = str(c).replace('[', '').replace(']', '').replace('<', '').replace(':', '').replace('?', '').replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_').replace('-', '_')
        original_new_c = new_c
        counter = 0
        while new_c in seen:
            new_c = f"{original_new_c}_{counter}"
            counter += 1
        seen.add(new_c)
        new_cols.append(new_c)
    df_copy = df.copy()
    df_copy.columns = new_cols
    return df_copy

class PredictRequest(BaseModel):
    data: List[Dict[str, Any]]

@app.get("/")
def home():
    return {"message": "API Prediksi Status Gizi Balita Aktif!"}

@app.post("/predict")
def predict(request: PredictRequest):
    if not models or not scaler:
        raise HTTPException(status_code=500, detail="Model atau Scaler belum dimuat dengan benar.")
    
    input_data = request.data
    if not input_data:
        raise HTTPException(status_code=400, detail="Data input tidak boleh kosong.")
    
    try:
        # Convert ke DataFrame
        df = pd.DataFrame(input_data)
        
        # 1. Scaling
        # Pastikan kolom features_to_scale (yang masih bernama asli, misalnya mengandung spasi) ada
        for col in features_to_scale:
            if col not in df.columns:
                df[col] = 0.0
                
        # Lakukan scaling (Scaler menggunakan nama kolom asli)
        if features_to_scale:
            df[features_to_scale] = scaler.transform(df[features_to_scale])
        
        # 2. Sanitize Column Names
        # Ubah nama kolom agar cocok dengan yang dibutuhkan LightGBM (hilangkan spasi, tanda tanya, dsb)
        df_sanitized = sanitize_lgbm_col_names(df)
        
        # 3. Match Expected Features
        # Pastikan semua fitur yang dibutuhkan model sudah ada
        for col in expected_features:
            if col not in df_sanitized.columns:
                df_sanitized[col] = 0.0
                
        # Urutkan dan ambil hanya kolom yang relevan
        df_final = df_sanitized[expected_features]
        
        predictions = []
        for i in range(len(df_final)):
            row = df_final.iloc[[i]]
            
            # Prediksi untuk ketiga target
            pred_tbu = int(models['TB/U'].predict(row)[0])
            pred_bbtb = int(models['BB/TB'].predict(row)[0])
            pred_bbu = int(models['BB/U'].predict(row)[0])
            
            # Decode prediksi menjadi label yang bisa dibaca
            label_tbu = target_encoders.get('TB/U', {}).get(pred_tbu, str(pred_tbu))
            label_bbtb = target_encoders.get('BB/TB', {}).get(pred_bbtb, str(pred_bbtb))
            label_bbu = target_encoders.get('BB/U', {}).get(pred_bbu, str(pred_bbu))
            
            predictions.append({
                "ID": i + 1,
                "Prediksi_TBU": label_tbu,
                "Prediksi_BBTB": label_bbtb,
                "Prediksi_BBU": label_bbu
            })
            
        return {
            "status": "success",
            "total_data": len(predictions),
            "predictions": predictions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat prediksi: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
