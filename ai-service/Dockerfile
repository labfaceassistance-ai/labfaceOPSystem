FROM labface-ai-base:latest

WORKDIR /app

# Copy application code (this layer changes frequently)
# Copy application code folders specifically to avoid copying the 7GB 'packages' directory
COPY core/ ./core/
COPY routes/ ./routes/
COPY services/ ./services/
COPY utils/ ./utils/
COPY main.py .
COPY requirements.txt .
COPY requirements_light.txt .
COPY download_models.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
