# Paperbridge

A web-based PDF to Word converter with Google OAuth, built with Next.js and FastAPI.

## Architecture

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, NextAuth.js
- **Backend**: Python, FastAPI, pdf2docx, SQLAlchemy
- **Database**: Neon (Postgres)
- **File Storage**: Cloudflare R2
- **Auth**: Google OAuth via NextAuth.js

## Prerequisites

- Node.js 18+
- Python 3.11+
- A [Neon](https://neon.tech) Postgres database
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket
- [Google OAuth credentials](https://console.cloud.google.com/apis/credentials)

## Setup

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example` and fill in your values.

```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` from `frontend/.env.example` and fill in your values.

```bash
npm run dev
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:3000` to Authorized JavaScript origins
4. Add `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs
5. Copy the Client ID and Client Secret to your `.env.local`

### 4. Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Use the same value in both `frontend/.env.local` (as `NEXTAUTH_SECRET`) and `backend/.env` (as `NEXTAUTH_SECRET`).

## Environment Variables

All secrets are stored in `.env` files which are gitignored. See `.env.example` files in both `frontend/` and `backend/` for the required variables.
