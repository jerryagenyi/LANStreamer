# 🧠 Translation Agent Guide — LANStreamer v2

## 🎯 Purpose
This document outlines the modular architecture of the translation pipeline used in LANStreamer v2. It is designed for real-time multilingual translation of streamed audio, supporting both local models and optional API integrations.

---

## 🧩 Pipeline Overview

### 1. 🎙️ Audio Capture
- **Tool**: FFmpeg (already integrated in LANStreamer)
- **Function**: Captures live audio from microphone, system, or network stream
- **Output**: Raw audio file or stream buffer

### 2. 📝 Transcription
- **Tool**: [Whisper](https://github.com/openai/whisper) (local) or Whisper API
- **Function**: Converts audio to text
- **Output**: Transcribed text in source language
- **LangChain Tool Name**: `Transcriber`

### 3. 🌐 Translation
- **Tool**: [M2M100](https://huggingface.co/facebook/m2m100_418M) (local) or Google Translate API
- **Function**: Translates text from source to target language
- **Output**: Translated text
- **LangChain Tool Name**: `Translator`
- **Note**: Use `forced_bos_token_id` to specify target language in M2M100

### 4. 🔊 Text-to-Speech (TTS)
- **Tool**: [Coqui TTS](https://github.com/coqui-ai/TTS) (local) or ElevenLabs API
- **Function**: Converts translated text to speech
- **Output**: Audio file or stream
- **LangChain Tool Name**: `Synthesizer`

### 5. 📡 Streaming Output
- **Tool**: Icecast + FFmpeg
- **Function**: Broadcasts translated audio to listeners
- **Output**: Live stream accessible via LAN or web

---

## 🧠 LangChain Agent Setup

Each module is wrapped as a callable LangChain tool:

```python
from langchain.agents import initialize_agent, Tool

tools = [
    Tool(name="Transcriber", func=transcribe_audio, description="Convert audio to text"),
    Tool(name="Translator", func=translate_text, description="Translate text to another language"),
    Tool(name="Synthesizer", func=synthesize_speech, description="Convert text to speech")
]

agent = initialize_agent(tools, llm, verbose=True)
