# Labface OP System

Labface OP System is a Next.js frontend for a multi-service attendance and surveillance platform. The frontend is deployed on Vercel, while the backend, AI/CCTV service, database, and object storage remain hosted separately.

## Project layout

- `frontend/` — Next.js app and API rewrites
- `backend/` — Express API server
- `ai-service/` — Python service for AI and CCTV processing
- `PRODUCTION_MIGRATION.md` — production architecture and rollout plan

## Local development

Install dependencies in the frontend folder and start the app:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Local environment variables

Create a local `.env.local` in `frontend/` with:

```env
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

The frontend uses `next.config.mjs` rewrites to proxy `/api/*` and `/api/ai/*` requests to the backend.

## Production architecture

### Frontend

- Deploy the Next.js app on Vercel
- Point your custom domain to Vercel
- Set `BACKEND_URL` to your hosted backend origin
- Keep `NEXT_PUBLIC_API_URL` optional unless the app uses client-side direct calls

### Backend

- Host the Express backend on Render, Railway, Fly.io, or a managed container platform
- Keep the backend as the only API gateway to the AI service and storage helpers
- Configure database and storage environment variables from `backend/.env.example`

### AI / CCTV service

- Do **not** deploy the AI/CCTV service to Vercel
- It needs a long-lived process and access to cameras / RTSP sources
- Deploy it separately on Render, Railway, Fly.io, or a VPS
- Set `AI_SERVICE_URL` on the backend so the API can proxy camera status and video operations

### Storage and database

- Use a managed MySQL or Postgres database for application metadata and face recognition records
- Use S3-compatible object storage (for example R2, AWS S3, or MinIO-compatible cloud storage) for snapshots, uploads, and face-related media
- The storage helper in `backend/utils/minioHelper.js` is already configured to support external endpoints and `MINIO_USE_SSL`

## CCTV video feed strategy

Vercel is suitable for the frontend only. Live CCTV/video ingestion should be handled by the hosted AI/CCTV service, not by the Vercel frontend itself.

Recommended flow:

1. The AI/CCTV service connects to the camera stream (RTSP or other supported source)
2. The backend exposes a controlled API for status, snapshots, and stream metadata
3. The frontend consumes the backend API and renders video previews or signed URLs
4. Raw media and derived artifacts are stored in object storage

If you need a browser-based live preview, use a signed URL or a backend-proxied stream endpoint. Do not rely on Vercel to run the camera ingestion process.

## Environment variables

### Frontend

Use `frontend/.env.example` as the template:

```env
BACKEND_URL=https://your-backend.example.com
NEXT_PUBLIC_API_URL=https://your-backend.example.com
```

### Backend

Use `backend/.env.example` as the template. Required values include:

```env
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
AI_SERVICE_URL=https://your-ai-service.example.com
MINIO_ENDPOINT=your-storage-endpoint
MINIO_PORT=443
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_USE_SSL=true
FRONTEND_URL=https://your-frontend-domain.com
BUILD_ID=production
```

## Deployment checklist

1. Deploy the backend and AI/CCTV service to hosted infrastructure
2. Configure the managed database
3. Configure S3-compatible object storage
4. Deploy the frontend to Vercel
5. Set `BACKEND_URL` and `AI_SERVICE_URL`
6. Point your domain to Vercel
7. Validate login, attendance, uploads, and CCTV endpoints

## Useful commands

```bash
cd frontend
npm run lint
npm run build
```

## Notes

- `frontend/next.config.mjs` rewrites `/api/ai/*` and `/api/*` to the backend URL
- `PRODUCTION_MIGRATION.md` contains the rollout order and current hosting recommendations
- If you are moving off local Docker, remove the Nginx-specific local proxy logic after the hosted backend and AI service are live
