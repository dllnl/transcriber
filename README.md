# Meeting Transcriber

This project is a web application designed to transcribe audio recordings, primarily focusing on meetings recorded via mobile phones. It was developed as a learning exercise to explore and utilize the capabilities of the Cursor IDE and the Gemini CLI for software development and refactoring.

## Project Goals

This application has been refactored from a local-only script into a production-ready, API-first system. The goal is to provide a robust backend for audio transcription, capable of online deployment, while maintaining a clear separation of concerns between the API and its user interface.

## Features

*   **Audio Upload:** Upload `.wav` audio files to the API.
*   **Whisper-based Transcription:** Utilizes OpenAI's Whisper model for high-quality speech-to-text transcription.
*   **Transcription Download:** Download the generated transcription as a `.txt` file via the API.

## Architecture Overview

The application is built with Python and Flask, following a modular, API-first architecture.

*   **Backend (API):** A Flask application structured as a Python package (`app/`) that exposes RESTful endpoints for file upload, transcription, and download. It is designed to be stateless and scalable.
*   **Frontend:** A simple HTML/CSS/JavaScript interface (`index.html`, `static/`) that consumes the backend API. It is completely decoupled from the Flask application.
*   **Containerization:** The entire application is containerized using Docker for consistent development and deployment environments.

## Getting Started (Local Development)

To get this project up and running on your local machine, follow these steps:

### Prerequisites

*   Python 3.10 - 3.13 (Whisper library has compatibility issues with Python 3.14 due to `numba`).
*   `pip` (Python package installer)
*   Docker (for containerized development/deployment)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/transcriber.git
    cd transcriber
    ```
    *(Note: Replace `https://github.com/your-username/transcriber.git` with your actual repository URL if applicable.)*

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    .\venv\Scripts\activate # On Windows
    # source venv/bin/activate # On macOS/Linux
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### Running the Application (Local)

To run the application locally, you need to start both the backend API and open the frontend in your browser.

1.  **Start the Backend API:**
    Open a terminal in the project root and run:
    ```bash
    python run.py
    ```
    The API will typically run on `http://localhost:5000/`. You should see a JSON response if you visit this URL in your browser.

2.  **Access the Frontend:**
    Locate the `index.html` file in the project root and open it directly in your web browser (e.g., by double-clicking it). Ensure your backend API is running for the frontend to function correctly.

## Docker Usage

The application is fully containerized. You can build and run it using Docker.

1.  **Build the Docker image:**
    ```bash
    docker build -t transcriber-app .
    ```

2.  **Run the Docker container:**
    ```bash
    docker run -p 5000:5000 -v "%cd%/instance:/app/instance" --name transcriber-container transcriber-app
    ```
    *   `-p 5000:5000`: Maps port 5000 of your host to port 5000 inside the container.
    *   `-v "%cd%/instance:/app/instance"`: Mounts the local `instance` directory (where uploads are stored) into the container, ensuring data persistence.

    After running the container, the API will be available at `http://localhost:5000/`. You can then open `index.html` in your browser as described above.

## Project Structure

The project follows a modular structure:
*   `app/`: Contains the core Flask application code, split into `__init__.py`, `routes.py`, and `transcription.py`.
*   `static/`: Frontend static assets (CSS, JS).
*   `index.html`: The main frontend HTML file.
*   `run.py`: The entry point for running the Flask application locally.
*   `requirements.txt`: Python dependencies.
*   `Dockerfile`: Instructions for building the Docker image.
*   `.dockerignore`: Specifies files/folders to exclude from the Docker build context.
*   `local/`: (Ignored by Git) Contains local-specific files, scripts, or personal notes that are not part of the main repository.

## Next Steps (Roadmap)

1.  **Frontend Framework (Optional but Recommended):** Consider migrating the frontend to a modern JavaScript framework (e.g., React, Vue, Svelte) for a more dynamic user experience and easier development.
2.  **Deployment Strategy:** Define and implement a deployment strategy for cloud platforms (e.g., AWS, Google Cloud, Azure, Heroku) to host the Dockerized API.

## Contributing

*(Add guidelines for contributions if this were an open-source project.)*

## License

*(Add license information.)*