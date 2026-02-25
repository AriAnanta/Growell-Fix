FROM python:3.9-slim-bullseye

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install six first (needed by pygrowup during setup)
RUN pip install --no-cache-dir six setuptools wheel

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and models
COPY app.py .
COPY rekomendasi_intervensi.py .
COPY *.joblib ./
COPY models/ ./models/
COPY models_enhanced_final/ ./models_enhanced_final/
COPY .env .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
