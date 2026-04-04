FROM python:3.11-slim

WORKDIR /app

# Install system deps for pdfplumber + torch
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user with UID 1000 (Required for Hugging Face Spaces)
RUN useradd -m -u 1000 user && \
    chown -R user:user /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything and ensure proper ownership
COPY --chown=user:user . .

# Switch to the non-root user
USER user

# Port 7860 is default for Hugging Face Spaces
EXPOSE 7860

# Run without --reload since it's meant for production (Hugging Face)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
