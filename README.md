# Meeting Transcriber

This project is a web application designed to transcribe audio recordings, primarily focusing on meetings. It features speaker identification (diarization) and a modern React interface.

## Features

*   **Audio Upload:** Support for `.wav` (and other formats) via unified upload.
*   **Whisper Transcription:** High-quality speech-to-text using OpenAI's Whisper model.
*   **Speaker Diarization:** Identifies different speakers in the audio using `pyannote.audio`.
*   **Modern UI:** Fast, responsive React dashboard built with Vite and Tailwind CSS.
*   **Retry Mechanism:** Easy re-queueing of failed transcriptions.
*   **Diarized Download:** Export transcriptions with speaker labels and timestamps.

## Project Structure

The project is split into a clear backend/frontend architecture:

*   `backend/`: Flask API, Whisper/Diarization services, and task queue.
*   `frontend/`: React application using Vite.
*   `docker-compose.yml`: Orchestrates both services for easy deployment.

## Getting Started

### Prerequisites

*   Python 3.10 - 3.13 (Avoid 3.14 due to `numba` compatibility).
*   Node.js & npm (for the frontend).
*   FFmpeg (required for audio processing).
*   Docker (optional, for containerized execution).

### Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```
The API will run on `http://localhost:5000`.

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
O frontend estará disponível em `http://localhost:5173`.

### Docker Usage

The easiest way to run the entire stack is with Docker Compose:

```bash
docker-compose up --build
```

*   **Backend:** `http://localhost:5000`
*   **Frontend:** `http://localhost:5173` (depending on your compose config).

Note: The `instance/` folder in the backend stores the database and uploaded audio files.

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.