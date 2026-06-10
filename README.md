# SnapDoc AI — Backend

Express + TypeScript REST API for SnapDoc AI. Handles AI calls (Gemini), database
access (Supabase), and auth verification. Deployed on Vercel.

Part of the SnapDoc AI platform — see the `snapdoc-ai` knowledge repo for
overall architecture and the mobile app.

---

## Stack

- Node.js + Express + TypeScript
- Google Gemini 1.5 Flash (multimodal — OCR + explanations + chat)
- Supabase (Postgres + Auth)
- Jest + Supertest for tests
- Deployed on Vercel

---

## Getting Started

```bash
npm install
npm run dev
```

Runs on `http://localhost:3001` by default.

### Environment

Copy `.env.example` to `.env` and fill in:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key_from_aistudio
PORT=3001
```

> Never commit `.env` files or hardcode API keys. Get keys from the Supabase dashboard
> (Project Settings → API) and Google AI Studio (free, no card).

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled build |
| `npm test` | Run Jest test suite |

---

## Project Structure

```
src/
├── index.ts          # App entry point
├── middleware/
│   └── auth.ts       # Supabase JWT verification
├── routes/
│   ├── explain.ts    # POST /api/explain
│   ├── chat.ts       # POST /api/chat
│   ├── scans.ts      # /api/scans CRUD
│   └── profile.ts    # /api/profile
├── services/
│   ├── gemini.ts      # Gemini OCR/explain/chat calls
│   └── supabase.ts    # Supabase client
└── types/             # Shared types
```

---

## API Endpoints

All endpoints require `Authorization: Bearer <supabase_jwt>`.

```
POST   /api/explain          — { base64 } → { scan_id, summary, document_type, key_points, flags }
POST   /api/chat              — { scan_id, message, history[] } → { reply }
POST   /api/scans             — save a scan
GET    /api/scans             — get active (non-archived) scans
GET    /api/scans/archived     — get archived scans
GET    /api/scans/:id          — get single scan with messages
PATCH  /api/scans/:id          — { archived: bool } archive/unarchive
DELETE /api/scans/:id          — delete a scan + its messages
GET    /api/profile            — get profile + scan count
PATCH  /api/profile            — { display_name } update profile
```

---

## Related Docs

- `snapdoc-ai` knowledge repo — `CLAUDE.md` has full DB schema, env setup, and gotchas
- `snapdoc-ai/maps/backend/` — architecture maps and gotchas for this service
