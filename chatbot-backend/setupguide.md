# Chatbot Backend Setup Guide

This guide covers the necessary steps to set up and run the Python backend for the Intern Management System Chatbot locally.

## Prerequisites
- **Python 3.9+** installed on your system.
- Ensure that the main system services (PostgreSQL, Hasura, etc.) are running via Docker.

## Setup Instructions

### 1. Navigate to the Backend Directory
Open your terminal and navigate to the backend directory:
```bash
cd chatbot-backend
```

### 2. Create a Virtual Environment
It is highly recommended to use a virtual environment to manage dependencies locally.
```bash
python -m venv venv
```

### 3. Activate the Virtual Environment
Activate the environment to ensure Python resolves the correct dependencies.

- **Windows:**
  ```powershell
  .\venv\Scripts\activate
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

### 4. Install Dependencies
Install all required Python packages via `pip`.
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Copy the example environment file and fill out any necessary API keys (like the Gemini API key) before running the backend.
```bash
cp .env.example .env
```

Here is an example `.env` file configuration:
```bash
# ──────────────────────────────────────────────────────────
# InternHub — Environment Variables (DO NOT COMMIT THIS FILE)
# ──────────────────────────────────────────────────────────

# ── Groq LLM ──────────────────────────────────────────────
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# ── PostgreSQL Database ───────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=intern_management
DB_USER=chatbot
DB_PASSWORD=your_db_password_here

# ── ChromaDB (local vector store) ────────────────────────
CHROMA_PATH=./chroma_db

# ── JWT Authentication ────────────────────────────────────
JWT_SECRET=your_jwt_secret_here
JWT_ALGORITHM=HS256

# ── CORS ──────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000

# ── Server ────────────────────────────────────────────────
PORT=8000
```
*(Open `.env` in your text editor and update the required values. Ensure you have the GROQ API Key or other dependencies correctly set).*

### 6. Training (If First Time)
If this is the first time running the backend and it uses Vanna for SQL training:
```bash
python train_agent.py
```
*(This command stores the required DDL structures/schema inside an onboard vector database like ChromaDB for LLM retrieval and SQL synthesis).*

### 7. Run the Application
Finally, start the backend server.
```bash
python app.py
```
The server will boot up and begin listening to requests from the frontend chatbot interface.
