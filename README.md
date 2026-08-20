# AI Health Screening

A voice-based AI health screening application that conducts a basic conversational screening using speech-to-text, an AI conversational assistant, and text-to-speech.

## Features

- Voice-based health screening
- Speech-to-text transcription
- Conversational AI screening
- Text-to-speech AI responses
- Call/session management using a unique call ID
- Structured screening data extraction
- Final health screening report
- Handles incomplete screening information
- Responsive React UI
- English voice interaction

## Architecture

The application follows a simple layered architecture.

```text
Frontend
   |
   v
Express Routes
   |
   v
Controllers
   |
   v
Services
   |
   +---- OpenAI
   |
   +---- Conversation State