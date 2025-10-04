# LANStreamer v2 — Modular Translation Agent Guide

## 🧠 Purpose
This guide helps you and your AI assistant modularize the translation pipeline for LANStreamer v2.

## 🧩 Pipeline Modules
1. **Audio Capture**: Already handled via FFmpeg in LANStreamer
2. **Transcription**: Use Whisper (local) or API
3. **Translation**: Use M2M100 (local) or Google Translate API
4. **Text-to-Speech**: Use Coqui TTS (local) or ElevenLabs API
5. **Streaming**: Pipe output back into Icecast

## 🐳 Docker Setup
Use Docker Compose to manage:
- `ffmpeg-service`
- `langchain-agent`
- `tts-service`
- `icecast-server`

## 🧠 LangChain Agent
Wrap each module as a callable tool:
- `Transcriber`: Whisper
- `Translator`: M2M100
- `Synthesizer`: Coqui TTS

## 🔌 API Fallbacks
Allow users to configure:
- `USE_LOCAL_TTS=true`
- `TRANSLATE_API_KEY=...`

## 🧑‍💻 SaaS Setup (Optional)
- Host GPU-backed LangChain agent
- Expose `/translate`, `/tts`, `/stream`
- Add billing, auth, and usage tracking

## 🧭 Future Extensions
- Add voice cloning with YourTTS
- Add summarization or sentiment analysis
- Build a remote agent orchestrator for multi-user control
