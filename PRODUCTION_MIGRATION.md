# Production migration checklist

## Current architecture
- Next.js frontend in `frontend/`
- Express backend in `backend/`
- Python AI/CCTV service in `ai-service/`
- MySQL database via `backend/config/db.js`
- MinIO storage via `backend/utils/minioHelper.js`

## What was cleaned up
- Removed one-off testing and style-fix scripts from the root and `scratch/`
- Removed `brain/check_time.js`
- Kept `deploy.sh`, `local-only.sh`, and the production Docker files

## Production target
Use a hosted stack instead of local Docker:
1. Vercel for the Next.js frontend
2. Render / Railway / Fly / Cloud Run for the Express backend
3. Render / Railway / Fly / VPS for the Python AI service
4. Managed MySQL or Postgres for the database
5. Cloudflare R2 or another S3-compatible provider for uploads and snapshots

## Required environment variables

### Frontend
- `BACKEND_URL` — the hosted backend origin used by Next.js rewrites
- `NEXT_PUBLIC_API_URL` — optional override for client-side API calls

### Backend
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `AI_SERVICE_URL`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_USE_SSL`
- `FRONTEND_URL`
- `BUILD_ID`

## Important notes
- The AI/CCTV service should not be deployed to Vercel. It needs a long-lived process and RTSP access.
- The current `backend/utils/minioHelper.js` now respects `MINIO_USE_SSL`, so it can target HTTPS endpoints like R2.
- The `frontend/.env.example` and `backend/.env.example` files were added to make the production setup explicit.
- The `backend/routes/aiRoutes.js` proxy remains the single backend integration point for camera status and video feed.

## Recommended rollout order
1. Migrate the database to a managed provider
2. Migrate storage to R2 or S3-compatible storage
3. Deploy the backend
4. Deploy the AI/CCTV service
5. Deploy the frontend to Vercel
6. Point `labface.site` to Vercel
7. Update `BACKEND_URL` and `AI_SERVICE_URL` to your hosted origins

## Current local-only parts that should be removed later
- Nginx-specific video proxy behavior in `nginx/nginx.conf`
- Any remaining references to local Docker hostnames such as `backend`, `minio`, and `mariadb`
