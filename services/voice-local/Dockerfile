FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY voice_gateway ./voice_gateway
COPY prompts ./prompts

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["uvicorn", "voice_gateway.main:app", "--host", "0.0.0.0", "--port", "8080"]
