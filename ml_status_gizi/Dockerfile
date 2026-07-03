FROM python:3.10-slim

# Install libgomp1 dan compiler tools yang dibutuhkan Python 3.13 untuk memuat model ML
RUN apt-get update && apt-get install -y \
    libgomp1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "prediksi_status_gizi:app", "--host", "0.0.0.0", "--port", "8000"]