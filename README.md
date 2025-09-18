# EasyTrack (monorepo)

SaaS multitenant para puntos de paquetería.
- **Frontend**: `frontend/` (Vite + React) → Vercel
- **Admin**: `admin/` (Vite + React) → Vercel
- **API**: `backend/` (Node/Express) → Render
- **DB**: Supabase

## Desarrollo local
- API: `cd backend && npm i && npm run start:dev` (o `npm start`)
- Front: `cd frontend && npm i && npm run dev`
- Admin: `cd admin && npm i && npm run dev`

Variables: copia `.env.example` → `.env` en cada carpeta y completa valores.

## Deploy
- Vercel (frontend/admin): Root Directory = `frontend/` o `admin/`
- Render (backend): Root Directory = `backend/`, Health = `/health`
