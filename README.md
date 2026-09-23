# DCM Origin.ai

A production-grade, AI-powered Laboratory Information Management System (LIMS) for tissue culture and biological batch management — now extended with **FieldLink**, a field-operations module for tracking farmers, plots, seed lots, and plantation genealogy.

## Key Features

1. **Autonomous AI Agent (LangChain + LangGraph + DeepSeek)**
   - Fully integrated AI assistant that reasons and queries live lab data using the ReAct pattern.
   - **Voice Support**: talk to the assistant directly using your microphone.
   - **Dynamic Data Visualizations**: generates rich, interactive charts from natural language on-the-fly using Recharts.
   - **Document Q&A (RAG)**: answers questions over SOPs/MSDS PDFs via a FAISS vector index built from documents in Azure Blob Storage.
   - **Agentic actions**: can trigger report emails, expense/manpower lookups, and chemical-expiry alerts on request.

2. **Enterprise Integration & Security**
   - **Microsoft Entra ID (SSO)**: secure OIDC-based authentication integrated with corporate directories.
   - **Role-based user management**: admin onboarding workflow, role editor, and self-service profile editing.
   - **Azure Blob Storage**: profile pictures and RAG source documents are stored and served from Azure.

3. **FieldLink — Field Operations Module**
   - Farmer, field, and plot management with map-based plot boundaries (satellite view).
   - Seed lot tracking and transplantation logs, with a genealogy view tracing lots back to their source.
   - Variety mapping across fields and plots.

4. **Advanced Analytics Pipeline**
   - **dbt & DuckDB**: an automated background pipeline extracts raw data from the live database, models it with dbt, and loads it into DuckDB for fast analytics (production, contamination, cost-per-plantlet, manpower cost).
   - **Asynchronous Processing (Celery & Redis)**: heavy tasks (the dbt pipeline, PDF/Excel report generation) run on background workers so the UI never freezes.

5. **Automated Reporting & Email Agent**
   - Ask the AI to compile and email expense, cost, or progress reports instantly.
   - Scheduled Celery Beat jobs: a weekly PDF lab performance digest (Mondays) and a daily chemical inventory/expiry alert.

6. **Cross-platform**
   - Responsive web app (React + Vite) and a native Android build via Capacitor.

7. **Premium UI/UX (Glassmorphism)**
   - Apple iOS-inspired aesthetic with translucent backgrounds, blurs, soft shadows, and high-density enterprise layouts.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui, Framer Motion, Recharts, MSAL (Microsoft Authentication Library), Capacitor (Android).
- **Backend**: Django, Django REST Framework, Channels/ASGI (uvicorn), LangChain, LangGraph, Celery, Redis, Playwright (server-side PDF rendering).
- **Database**: MySQL.
- **Analytics Engine**: dbt (Data Build Tool), DuckDB.
- **AI / LLM**: DeepSeek API, HuggingFace embeddings (`all-MiniLM-L6-v2`) + FAISS for RAG.
- **Storage**: Azure Blob Storage.

## Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose (recommended path — spins up everything below for you), **or**, for a native setup:
  - Python 3.11+
  - Node.js 20+
  - MySQL 8
  - Redis 7

## Quick Start — Docker Compose (recommended)

This runs the full stack: MySQL, Redis, the Django/ASGI backend, a Celery worker, Celery Beat (scheduler), and the frontend behind Nginx.

1. Copy the root environment template and fill in real values (DB credentials, `DEEPSEEK_API_KEY`, Azure/Email/Entra settings as needed):
   ```bash
   cp .env.example .env
   ```
2. Build and start every service:
   ```bash
   docker compose up --build
   ```
   The backend container runs `python manage.py migrate` automatically on startup.
3. Open the app:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
4. Create an admin user (one-time, in a second terminal):
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```
5. Useful commands:
   ```bash
   docker compose logs -f celery_worker   # watch background task processing
   docker compose logs -f celery_beat     # watch the scheduled digest jobs
   docker compose down                    # stop everything
   docker compose down -v                 # stop and wipe DB/Redis volumes
   ```

> Only need to change a value later? Edit `.env` and re-run `docker compose up -d` — Compose will recreate the affected containers.

## Manual Setup (without Docker)

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # on Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
playwright install chromium   # required once, for PDF report rendering

cp .env.example .env          # fill in DB/Redis/API credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

You'll also need Redis and a Celery worker + beat running locally for background tasks and scheduled digests:
```bash
celery -A config worker -l info
celery -A config beat -l info
```

### Frontend
```bash
cp .env.example .env          # set VITE_API_BASE_URL and, if using SSO, VITE_AZURE_*
npm install
npm run dev
```

### Android (optional)
The web app is wrapped with Capacitor for a native Android build — see `capacitor.config.ts` and the `android/` project. After `npm run build`:
```bash
npx cap sync android
npx cap open android
```

## Environment Variables
See [.env.example](.env.example) (used by Docker Compose and the frontend) and [backend/.env.example](backend/.env.example) (used when running the backend natively) for the full list of variables, with comments explaining each one.
