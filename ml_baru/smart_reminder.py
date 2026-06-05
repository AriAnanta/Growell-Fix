import pandas as pd
import numpy as np
from pydantic import BaseModel, Field
from typing import List
from sklearn.preprocessing import MinMaxScaler
from sklearn_extra.cluster import KMedoids

# --- Input Models ---
class SmartReminderInput(BaseModel):
    user_id: str = Field(..., description="ID user atau balita untuk referensi kembalian")
    attendance: float = Field(..., description="Tingkat kehadiran (0-100 atau nilai raw lain)")
    parent_activity_score: float = Field(..., description="Skor keaktifan/pengetahuan ortu (raw)")
    child_score: float = Field(..., description="Skor risiko kondisi anak (raw)")

class SmartReminderBatchRequest(BaseModel):
    data: List[SmartReminderInput] = Field(..., description="Batch data untuk di-cluster")

class SmartReminderResult(BaseModel):
    user_id: str
    attendance_norm: float
    parent_norm: float
    child_norm: float
    final_score: float
    cluster: int
    priority_label: str

class SmartReminderBatchResponse(BaseModel):
    results: List[SmartReminderResult]
    best_k: int

def predict_smart_reminder_batch(batch: SmartReminderBatchRequest) -> SmartReminderBatchResponse:
    if not batch.data:
        return SmartReminderBatchResponse(results=[], best_k=0)
    
    # Konversi input ke DataFrame
    df = pd.DataFrame([item.model_dump() for item in batch.data])
    
    # Jika data terlalu sedikit untuk clustering (k=2 butuh minimal 2 data)
    if len(df) < 2:
        results = []
        for index, row in df.iterrows():
            # Hitung risiko statis jika cuma 1 data
            att_risk = 1 - (row['attendance'] / 100.0 if row['attendance'] else 0)
            parent_risk = 1 - (row['parent_activity_score'] / 100.0 if row['parent_activity_score'] else 0)
            
            # Note: child_score is on a 1.0 - 4.0 scale. Min 1, Max 4. We scale it to 0-1.
            child_risk = (row['child_score'] - 1) / 3.0 if row['child_score'] else 0
            
            final_score = (0.3 * att_risk) + (0.2 * parent_risk) + (0.5 * child_risk)
            
            # Threshold 0.4 untuk TINGGI, atau jika child_risk cukup tinggi (sebanding dengan 1 kondisi parah / skor 1.9)
            is_high = final_score >= 0.4 or child_risk >= 0.3
            
            results.append(SmartReminderResult(
                user_id=row['user_id'],
                attendance_norm=1 - att_risk,
                parent_norm=1 - parent_risk,
                child_norm=child_risk,
                final_score=final_score,
                cluster=1 if is_high else 0,
                priority_label="TINGGI (Butuh Notifikasi Agresif)" if is_high else "RENDAH (Hanya Info Berkala)"
            ))
        return SmartReminderBatchResponse(results=results, best_k=1)
    
    # 1. Normalisasi dengan MinMaxScaler
    scaler = MinMaxScaler()
    features = ['attendance', 'parent_activity_score', 'child_score']
    X_norm = scaler.fit_transform(df[features])
    
    df['attendance_norm'] = X_norm[:, 0]
    df['parent_norm'] = X_norm[:, 1]
    df['child_norm'] = X_norm[:, 2]
    
    # 2. Hitung Final Score (Sesuai bobot dari notebook)
    # att_risk = 1 - att_norm
    # parent_risk = 1 - parent_norm
    # child_risk = child_norm
    # final = (0.3 * att_risk) + (0.2 * parent_risk) + (0.5 * child_risk)
    
    df['attendance_risk'] = 1 - df['attendance_norm']
    df['parent_risk'] = 1 - df['parent_norm']
    df['child_risk'] = df['child_norm']
    
    df['final_score'] = (
        0.3 * df['attendance_risk'] +
        0.2 * df['parent_risk'] +
        0.5 * df['child_risk']
    )
    
    # 3. K-Medoids Clustering (Dinamis K)
    # Secara default, jika data cukup, k=2 sudah merepresentasikan Tinggi/Rendah.
    # Di notebook mencari k terbaik, untuk efisiensi API kita fix-kan K=2 (High & Low Priority)
    # Atau K=3 jika data >= 3. Kita set K=2 sebagai dasar pembeda "Prioritas" dan "Biasa".
    k_optimal = 2 if len(df) >= 2 else 1
    
    if k_optimal > 1:
        # Gunakan fitur terbobot untuk K-Medoids (mengikuti notebook)
        # Atau langsung clustering final_score 1D juga bisa. 
        # Di notebook clustering menggunakan weighted X_norm.
        weighted_X = np.column_stack((
            df['attendance_risk'] * 0.3,
            df['parent_risk'] * 0.2,
            df['child_risk'] * 0.5
        ))
        
        kmedoids = KMedoids(n_clusters=k_optimal, random_state=42)
        df['cluster'] = kmedoids.fit_predict(weighted_X)
        
        # Tentukan cluster mana yang memiliki rata-rata final_score tertinggi (Cluster Prioritas)
        cluster_final_score = df.groupby('cluster')['final_score'].mean()
        priority_cluster = cluster_final_score.idxmax()
    else:
        df['cluster'] = 0
        priority_cluster = 0
        
    df['priority_label'] = df['cluster'].apply(
        lambda x: "TINGGI (Butuh Notifikasi Agresif)" if x == priority_cluster else "RENDAH (Hanya Info Berkala)"
    )
    
    # 4. Susun Kembalian
    results = []
    for index, row in df.iterrows():
        results.append(SmartReminderResult(
            user_id=row['user_id'],
            attendance_norm=row['attendance_norm'],
            parent_norm=row['parent_norm'],
            child_norm=row['child_norm'],
            final_score=row['final_score'],
            cluster=int(row['cluster']),
            priority_label=row['priority_label']
        ))
        
    return SmartReminderBatchResponse(results=results, best_k=k_optimal)
