from fastapi import FastAPI, WebSocket
from fastapi.responses import JSONResponse

from voice_gateway.config import get_settings
from voice_gateway.session import VoiceSession

app = FastAPI(title="Acharya Voice Local", version="1.0.0")


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "acharya-voice-local"})


@app.websocket("/voice")
async def voice_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    session = VoiceSession(websocket)
    await session.run()


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "voice_gateway.main:app",
        host=settings.host,
        port=settings.port,
        log_level="info",
    )


if __name__ == "__main__":
    run()
