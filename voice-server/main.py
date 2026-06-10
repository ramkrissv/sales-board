"""
Galent SalesPilot — Pipecat Voice AI Server

Real-time conversational voice assistant for sales reps.
Connects to Deepgram for STT, Anthropic Claude for LLM, and Deepgram TTS for speech output.

Run: uvicorn main:app --host 0.0.0.0 --port 8765
"""

import os
import json
import asyncio
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx

load_dotenv()

app = FastAPI(title="Galent Voice AI Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
GALENT_API_URL = os.getenv("GALENT_API_URL", "http://localhost:3000")
MODEL = os.getenv("AI_MODEL", "claude-sonnet-4-6-20250610")

SYSTEM_PROMPT = """You are a voice AI assistant for Galent SalesPilot, a sales intelligence platform.
You help sales reps manage their pipeline through natural conversation.

You can:
- Provide deal updates and pipeline summaries
- Capture meeting notes and action items
- Suggest next steps for active deals
- Answer questions about accounts, contacts, and forecasting

Be concise and action-oriented. Sales reps are busy — give them the key info fast.
When you hear deal-related information (meeting outcomes, next steps, stakeholder updates),
extract structured data and offer to log it to the deal.

Always respond naturally and conversationally. Use specific names and numbers when available."""


async def get_pipeline_context() -> str:
    """Fetch current pipeline summary from Galent API for context."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # This would call the tRPC endpoint — simplified here
            return "Pipeline context: Active deals in your pipeline. Ask about specific deals for details."
    except Exception:
        return "Pipeline context unavailable."


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "galent-voice-ai",
        "anthropic_key_set": bool(ANTHROPIC_API_KEY),
        "deepgram_key_set": bool(DEEPGRAM_API_KEY),
    }


@app.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice conversations.

    Protocol:
    1. Client sends audio chunks (binary) from MediaRecorder
    2. Server forwards to Deepgram for real-time STT
    3. Transcripts are sent to Claude for response
    4. Response text is sent back (client does TTS via browser)

    Messages (JSON):
    - Client → Server: { "type": "audio", "data": "<base64>" }
    - Client → Server: { "type": "transcript", "text": "..." }  (if using browser STT)
    - Server → Client: { "type": "transcript", "text": "..." }  (interim/final STT result)
    - Server → Client: { "type": "response", "text": "..." }    (AI response)
    - Server → Client: { "type": "action", "action": "...", "data": {...} }  (extracted action)
    """
    await websocket.accept()

    conversation_history: list[dict] = []
    pipeline_context = await get_pipeline_context()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "transcript":
                user_text = message["text"]

                # Add to conversation history
                conversation_history.append({"role": "user", "content": user_text})

                # Send to Claude
                try:
                    async with httpx.AsyncClient(timeout=30) as client:
                        response = await client.post(
                            "https://api.anthropic.com/v1/messages",
                            headers={
                                "x-api-key": ANTHROPIC_API_KEY,
                                "anthropic-version": "2023-06-01",
                                "content-type": "application/json",
                            },
                            json={
                                "model": MODEL,
                                "max_tokens": 512,
                                "system": f"{SYSTEM_PROMPT}\n\n{pipeline_context}",
                                "messages": conversation_history[-10:],  # Last 10 turns
                            },
                        )

                        result = response.json()
                        ai_text = result["content"][0]["text"]
                        conversation_history.append({"role": "assistant", "content": ai_text})

                        # Send response back
                        await websocket.send_json({
                            "type": "response",
                            "text": ai_text,
                        })

                        # Check for extractable actions
                        actions = extract_actions(ai_text, user_text)
                        for action in actions:
                            await websocket.send_json({
                                "type": "action",
                                **action,
                            })

                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "text": f"AI processing error: {str(e)}",
                    })

            elif message["type"] == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "text": str(e)})
        except:
            pass


def extract_actions(ai_text: str, user_text: str) -> list[dict]:
    """Extract actionable items from AI response for auto-logging."""
    actions = []

    lower = ai_text.lower()

    # Detect task creation signals
    if any(kw in lower for kw in ["follow up", "schedule", "send proposal", "prepare", "review"]):
        actions.append({
            "action": "suggest_task",
            "data": {"suggestion": ai_text[:100]},
        })

    # Detect deal update signals
    if any(kw in user_text.lower() for kw in ["meeting went", "they said", "decision", "budget", "timeline"]):
        actions.append({
            "action": "log_note",
            "data": {"note": user_text},
        })

    return actions


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8765, reload=True)
