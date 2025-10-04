Perfect, Jeremiah. Here's a comprehensive and teachable `translation-agent.md` file that documents your modular pipeline for LANStreamer v2. It’s written to guide both your AI assistant and future collaborators—whether they’re junior devs, contributors, or ops engineers.

---

```markdown
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
```

---

## 🐳 Docker Compose Strategy

Use Docker to containerize each service:
- `ffmpeg-service`: Audio capture
- `whisper-service`: Transcription
- `m2m100-service`: Translation
- `tts-service`: Speech synthesis
- `icecast-server`: Streaming

Provide two modes:
- `dev-compose.yml`: For local testing with volume mounts
- `prod-compose.yml`: For deployment with prebuilt images

---

## 🔌 API Fallbacks

Allow users to configure external APIs:
```env
USE_LOCAL_TTS=true
TRANSLATE_API_KEY=your_google_api_key
TTS_API_KEY=your_elevenlabs_key
```

---

## 🧑‍💻 SaaS Setup (Optional)

To scale as a service:
- Host GPU-backed LangChain agent
- Expose endpoints: `/translate`, `/tts`, `/stream`
- Add user authentication, billing, and usage tracking
- Use providers like RunPod, Lambda Labs, or Paperspace

---

## 🧭 Future Extensions

- Add voice cloning with YourTTS
- Add summarization or sentiment analysis
- Build a remote agent orchestrator for multi-user control
- Integrate with MCP registry for developer collaboration

---

## 📚 References

- [Whisper](https://github.com/openai/whisper)
- [M2M100](https://huggingface.co/facebook/m2m100_418M)
- [Coqui TTS](https://github.com/coqui-ai/TTS)
- [LangChain](https://docs.langchain.com/)
- [Icecast](https://icecast.org/)

```

---

Let me know if you'd like this scaffolded into a GitHub README or paired with a Docker Compose file. We can also build a `translation-agent.py` starter script that wires all the tools together. You're architecting something truly impactful.