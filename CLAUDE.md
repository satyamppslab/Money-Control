# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Money Control is a personal finance app: transaction tracking, JWT auth, and Gemini AI-powered receipt OCR scanning. It's a classic MERN-style split repo:

- `backend/` — Node.js + Express + Mongoose REST API (CommonJS)
- `frontend/` — React 18 + Vite + TailwindCSS SPA
- `docs/openapi.yaml` — OpenAPI spec for the backend API (register/login, transactions, receipt upload)

## Commands

Run these from within `backend/` or `frontend/` respectively — there is no root-level package.json or workspace tooling.

**Backend** (`backend/`):
- `npm run dev` — start server with nodemon (auto-restart) on `PORT` (default 5000)
- `npm start` — start server with plain node
- No test suite or lint script currently configured.

**Frontend** (`frontend/`):
- `npm run dev` — Vite dev server on port 3000, proxies `/api` to `http://localhost:5000` (see `vite.config.js`)
- `npm run build` — production build
- `npm run lint` — ESLint (`--max-warnings 0`)
- `npm run preview` — preview a production build
- No test suite configured.

Both apps must be run together for local development (backend on :5000, frontend on :3000 with API proxy).

## Environment configuration

Backend reads a `.env` file (gitignored) with:
- `MONGO_URI` — MongoDB connection string. If missing/invalid, `config/db.js` silently falls back to `mongodb://127.0.0.1:27017/money-control` and logs a warning — a missing env var will not error, it'll just connect to local Mongo.
- `JWT_SECRET` — signs auth tokens; falls back to a hardcoded `'secret123'` if unset (dev-only fallback, not safe for production).
- `OCR_API_KEY` — enables real OCR via OCR.Space API.
- `PORT` — backend port, default 5000.

## Architecture

### Backend (`backend/`)
Standard Express layering, one file per concern:
- `app.js` — builds and exports the Express app (middleware + `/api/*` route mounts). Contains **no** `listen()` call so it can be reused by both the local dev server and the Vercel serverless entry point.
- `server.js` — local dev entry point only: loads `.env`, calls `connectDB()`, then `app.listen(PORT)`.
- `api/index.js` — Vercel serverless entry point: loads `.env`, kicks off `connectDB()`, and exports the same `app` for `@vercel/node` to invoke per-request. Do not add `app.listen()` here.
- `config/db.js` — Mongoose connection with local fallback (see above). Caches the connection on `global._mongooseConn` so repeated serverless invocations (warm containers) reuse one connection instead of reconnecting per request.
- `models/` — `User`, `Transaction`, `Receipt` Mongoose schemas.
  - `User.js` hashes passwords via a `pre('save')` bcrypt hook and exposes `matchPassword()`.
  - `Receipt.js` stores OCR results (`ocrData: { merchant, amount, date, items }`) and a `status` (`pending`/`processed`/`failed`). It does **not** store a file path — see uploads note below.
- `middleware/authMiddleware.js` — `protect` middleware: verifies `Authorization: Bearer <jwt>`, attaches `req.user` (password excluded). All private routes use this.
- `middleware/uploadMiddleware.js` — Multer with **memory storage** (`req.file.buffer`), not disk storage. Accepts jpg/jpeg/png/pdf only, 5MB limit.
- `controllers/` + `routes/` — one pair per resource (`auth`, `user`, `transaction`, `receipt`), routes just wire `protect`/`upload` middleware to controller functions.
- `controllers/receiptController.js` is the most complex piece: it loads `@google/genai` defensively (wrapped in try/catch so the server still boots without the package installed), converts the uploaded file buffer to a base64 `inlineData` part, prompts `gemini-2.5-flash` for structured JSON (merchant/amount/date/items), and persists the parsed OCR result (not the file itself) onto the `Receipt` doc. Falls back to mock data whenever the SDK or API key isn't available — keep this fallback behavior in mind when testing OCR-related changes without a real API key.
- Ownership checks (e.g. deleting a transaction) compare `transaction.user.toString()` against `req.user._id.toString()` — follow this pattern for any new user-scoped mutation.

**Receipt uploads are never persisted to disk or served back.** Vercel serverless functions have an ephemeral filesystem, so anything written to disk disappears after the invocation ends. The uploaded receipt is only held in memory long enough to send to Gemini for OCR, then discarded — only the extracted `ocrData` is saved. If "view the original receipt image" is ever needed, that requires wiring up external object storage (e.g. Vercel Blob, S3, Cloudinary) and storing its URL, not local disk storage.

### Deployment (Vercel)
Frontend and backend deploy as **one Vercel project on one domain** (not two separate projects), configured via the root `vercel.json`:
- `builds`: `@vercel/node` builds `backend/api/index.js` as a serverless function; `@vercel/static-build` builds `frontend/` (via its `npm run build` / Vite) into `frontend/dist`.
- `routes`: `/api/*` → the backend function; everything else falls through the static frontend build, with a SPA catch-all to `frontend/index.html` for client-side routing.
- Because both live on the same domain, the frontend's `baseURL: '/api'` in `axiosInstance.js` and the dev-only Vite proxy both resolve correctly with no extra config — no `VITE_API_URL`-style env var is needed.
- Required Vercel project env vars: `MONGO_URI` (must be a reachable cloud MongoDB, e.g. Atlas — the `127.0.0.1` fallback in `config/db.js` only works for local dev), `JWT_SECRET`, `OCR_API_KEY`. `PORT` is not used in serverless (Vercel controls the port).

### Frontend (`frontend/`)
- `src/main.jsx` → `src/App.jsx` sets up `react-router-dom` routes inside a single `AuthProvider`. Public routes: `/login`, `/register`. Private routes (wrapped in `<PrivateRoute />`, redirects to `/login` if no user): `/` (Dashboard), `/transactions`, `/upload-receipt`.
- `src/contexts/AuthContext.jsx` is the single source of truth for auth state and currency formatting: persists `user` (which includes the JWT `token`) and `currency` to `localStorage`, exposes `login`/`register`/`logout` and `formatAmount()`/`CURRENCY_SYMBOLS` for rendering money values consistently across pages.
- `src/api/axiosInstance.js` — shared Axios instance (`baseURL: '/api'`) with a request interceptor that injects `Authorization: Bearer <token>` from the stored user in `localStorage`. Use this instance (not raw `axios`) for all API calls so auth headers are attached automatically.
- Styling is TailwindCSS with a custom `brand` color scale (green) defined in `tailwind.config.js`; dark theme is the default (`bg-slate-950`/`text-slate-100` set in `App.jsx`).
- Icons via `lucide-react`.
