# InsureLens

InsureLens is a full-stack web application for analyzing insurance proposal documents. Users upload one or more proposal files, enter their own LLM API key, and receive a structured analysis with key metrics, cash value trends, IRR trends, and plain-English advisor notes.

The project is designed as a deployable web app rather than a local-only prototype. The frontend runs on Next.js, and the backend runs on FastAPI.

## Features

- Upload multiple insurance proposal files.
- Enter a user-owned LLM API key directly in the web UI.
- Extract core insurance fields from PDF and text-based documents.
- Display annual premium, total premium, cash value, death benefit, expected return, and IRR.
- Compare multiple insurance products with charts.
- Switch the Key Metrics panel between uploaded products.
- Generate advisor-style notes for each product.
- Use PDF text extraction with OCR fallback for scanned pages.
- Deploy the frontend and backend separately for production use.

## Tech Stack

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Recharts
- lucide-react

### Backend

- FastAPI
- Python
- pdfplumber
- pytesseract
- OpenAI-compatible LLM API client
- numpy-financial

### Deployment

- Frontend: Vercel
- Backend: Render Docker Web Service
- Source control: GitHub

## Application Flow

1. The user opens the web app.
2. The user uploads one or more insurance proposal files.
3. The user enters their own LLM API key.
4. The frontend sends the files and API key to the backend.
5. The backend extracts text from each file.
6. If a PDF page has no selectable text, OCR is used as a fallback.
7. The backend sends the extracted content to the LLM.
8. The LLM returns structured insurance data.
9. The backend normalizes fields and computes missing metrics when possible.
10. The frontend renders metrics, charts, and advisor notes.

## Project Structure

```text
.
├── src/
│   ├── app/
│   ├── components/
│   │   └── Dashboard.tsx
│   └── lib/
│       ├── analysis.ts
│       ├── api.ts
│       └── types.ts
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── services/
│   │   ├── main.py
│   │   └── models.py
│   ├── Dockerfile
│   └── requirements.txt
├── render.yaml
├── vercel.json
├── package.json
└── README.md
```

## Frontend Overview

The frontend provides a two-column interface inspired by modern SaaS product pages. The left side contains the upload and API key workflow. The right side contains the analysis preview.

The main UI is implemented in:

```text
src/components/Dashboard.tsx
```

The analysis preview includes:

- Key Metrics
- Cash Value Trend
- IRR Trend
- Advisor Notes

When multiple proposal files are analyzed, the charts compare all products. The Key Metrics panel includes product selector buttons so the user can switch between products without changing the overall layout.

## Backend Overview

The backend receives uploaded files, extracts text, calls the LLM, normalizes the response, computes derived values, and returns structured JSON to the frontend.

Key backend modules:

```text
backend/app/api/routes.py
backend/app/services/document_parser.py
backend/app/services/llm.py
backend/app/services/analysis.py
backend/app/core/config.py
```

The backend supports the following analysis fields:

- Product name
- Annual premium
- Payment duration
- Total premium
- Coverage amount
- Death benefit
- Cash value
- Expected return
- Benefit illustration table
- IRR trend
- Summary notes

## Local Development

### Prerequisites

- Node.js 20 or newer
- Python 3.11 or newer
- Tesseract OCR, if OCR support is needed

On macOS, install Tesseract with:

```bash
brew install tesseract tesseract-lang
```

### 1. Start the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will run at:

```text
http://localhost:8000
```

Health check:

```text
http://localhost:8000/api/health
```

### 2. Start the Frontend

In a second terminal:

```bash
npm install
cp .env.example .env.local
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```

## Environment Variables

### Frontend

Create `.env.local` from `.env.example`.

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

For production, this should point to the deployed backend URL, for example:

```bash
NEXT_PUBLIC_API_BASE_URL=https://insurance-analyzer-api.onrender.com
```

### Backend

Create `backend/.env` from `backend/.env.example`.

```bash
DEEPSEEK_API_KEY=
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
CORS_ORIGINS=http://localhost:3000
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
MAX_UPLOAD_SIZE_MB=20
ENABLE_OCR=true
MAX_PDF_PAGES=20
MAX_LLM_CHARS=60000
```

`DEEPSEEK_API_KEY` is optional. The app is designed so users can enter their own API key in the frontend. If a backend fallback key is configured, the backend can use it when the request does not include a user key.

## User API Key Model

InsureLens does not require the deployment owner to hard-code a shared API key in the frontend.

The user enters an API key in the web page. The key is sent to the backend only for the current analysis request. It is not saved in the repository and is not persisted by the frontend after refresh.

For production, the app should always be served over HTTPS.

## Deployment

### Why Not GitHub Pages

GitHub Pages is not suitable for the full application because InsureLens requires:

- A backend API
- File uploads
- PDF processing
- OCR fallback
- LLM API calls
- Server-side environment variables

GitHub Pages can only host static frontend files. It cannot run the FastAPI backend or process uploaded documents.

### Recommended Deployment

Use:

- Vercel for the Next.js frontend
- Render for the FastAPI backend

This architecture keeps the frontend fast and simple while allowing the backend to handle document parsing and LLM analysis.

### Deploy the Backend on Render

This repository includes `render.yaml` and `backend/Dockerfile`.

Recommended Render settings:

- Service type: Web Service
- Environment: Docker
- Root directory: `backend`
- Health check path: `/api/health`

Important environment variables:

```bash
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
CORS_ORIGINS=https://your-vercel-domain.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
MAX_UPLOAD_SIZE_MB=20
ENABLE_OCR=true
MAX_PDF_PAGES=20
MAX_LLM_CHARS=60000
```

`DEEPSEEK_API_KEY` can be left empty if every user enters their own key in the web UI.

### Deploy the Frontend on Vercel

Recommended Vercel settings:

- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Root directory: repository root

Set this environment variable in Vercel:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com
```

After deployment, make sure the Vercel domain is allowed by the backend CORS configuration.

## Validation

Run frontend checks:

```bash
npm run typecheck
npm run build
```

Run backend syntax validation:

```bash
cd backend
python -m compileall app
```

Run the backend locally and check:

```text
http://localhost:8000/api/health
```

## Known Limitations

- Large PDFs may take longer to process.
- Scanned PDFs are slower because OCR is required.
- Render free instances may cold start after inactivity.
- LLM extraction quality depends on document quality and the selected model.
- The app does not currently store user accounts or analysis history.
- Uploaded files are processed for the request and are not persisted as long-term records.

## Future Improvements

- Add more detailed timeout and API-key error messages.
- Add downloadable PDF or CSV reports.
- Add side-by-side product comparison tables.
- Add saved analysis history.
- Add a sample demo mode that does not require a user API key.
- Add stricter JSON schema validation for LLM responses.
- Add background jobs for large file processing.
- Add monitoring and structured backend logs.
- Add automated end-to-end tests.

## Current Status

The app is currently deployable with a Vercel frontend and Render backend. The latest UI supports multi-file analysis, chart comparison, and product switching inside the Key Metrics panel.
