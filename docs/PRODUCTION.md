LABFACE PRODUCTION GUIDE
-----------------------

This document explains how to run LabFace in a production environment.

I. BEFORE YOU START
To deploy the system, you need:
- Docker and Docker Compose
- A configured Cloudflare Tunnel
- Your .env.prod file with production passwords

II. DEPLOYMENT
Everything is managed through the main deployment script. Run this from the root directory:

  bash deploy-production.sh

The script takes care of:
- Stopping old containers
- Building new images with production optimizations
- Launching all services (Frontend, Backend, AI, Database, and Nginx)

III. CHECKING THE SYSTEM
To see if everything is running:
  docker compose -f docker-compose.production.yml ps

To watch the backend logs for troubleshooting:
  docker compose -f docker-compose.production.yml logs -f backend

IV. DATABASE & STORAGE
Backing up the database:
  docker exec labface-mariadb-1 mysqldump -u root -p[root_password] labface > backup.sql

Your uploads (profile photos and logs) are stored in:
- minio_data (volume)
- backend/uploads (folder)

V. ACCESS
- Website: https://labface.site
- Backend: http://backend:5000
- AI Service: http://ai-service:8000
