# Internship Management System

Full-stack internship portal with role-based access for students, faculty, and admins.

## Project Structure

```text
AbdasProject/
├── backend/      # Node.js + Express + MongoDB API
├── frontend/     # React + Vite app
├── docker-compose.yml
├── .env.example  # Environment template (safe to commit)
└── README.md
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB (local install) or Docker + Docker Compose

## 1) Install Dependencies

From project root:

```bash
cd backend
npm install
cd ../frontend
npm install
```

## 2) Configure Environment

Create root `.env` from the example:

```bash
cp .env.example .env
```

Required vars in root `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/internship_system
JWT_SECRET=change_me_to_a_long_random_secret
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Notes:
- Backend reads root `.env` (`backend/server.js` loads `../.env`).
- Keep real secrets only in `.env`, never in git.

## 3) Database Setup

### Option A: Docker MongoDB (recommended)

```bash
docker compose up -d
```

For Docker MongoDB in this repo, use:

```env
MONGO_URI=mongodb://admin:password@localhost:27017/internship_db?authSource=admin
```

### Option B: Local MongoDB service

Use:

```env
MONGO_URI=mongodb://localhost:27017/internship_system
```

## 4) Run the App

Use two terminals.

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

URLs:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173` (may auto-switch to `5174` if busy)

Frontend proxies `/api/*` to `http://localhost:5000`.

## 5) Health Check

```bash
curl http://localhost:5000/
```

Expected response:

```text
Internship Management System API is running
```

## Common Issues

### `EADDRINUSE: address already in use :::5000`

Another process is already using port `5000`. Stop that process and restart backend.

### MongoDB connection errors

Usually a wrong `MONGO_URI` for your selected DB mode (Docker vs local).

### AI quota/model issues

- Verify `GEMINI_API_KEY` in root `.env`
- Verify `GEMINI_MODEL` (default: `gemini-2.5-flash`)
- Restart backend after env changes

## Scripts

Backend:
- `npm run dev` -> nodemon
- `npm start` -> node
- `npm run seed:admin` -> creates exactly one admin user (skips if an admin already exists)

Frontend:
- `npm run dev` -> Vite dev server
- `npm run build` -> production build
- `npm run preview` -> preview build
- `npm run lint` -> TypeScript type-check (`tsc --noEmit`)

## Role And Registration Rules

- Public signup (`/api/auth/signup` and `/api/auth/register`) creates `student` users only.
- Faculty and admin accounts are not allowed through public signup.
- Admin dashboard "Add User" supports only `student` and `faculty` roles.
- Backend enforces this through protected endpoint: `POST /api/auth/admin/create-user` (admin token required).

## Admin Account Setup

Public signup only creates student accounts.

To create the first admin account, run:

```bash
cd backend
npm run seed:admin
```

The seed script creates exactly one admin account in total:

- If an admin already exists, it exits without creating another admin.
- If no admin exists, it creates one admin with the configured credentials.

By default the seed script uses placeholders:

- name: `admin_placeholder`
- email: `admin@example.com`
- password: `ChangeMe123!`

You can override these with environment variables before running:

- `ADMIN_SEED_NAME`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`

Recommended:

- Set strong `ADMIN_SEED_*` values in `.env` before first run.
- Change placeholder credentials immediately if defaults were used.
