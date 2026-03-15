# LabFace 🚀

LabFace is an advanced AI-driven face recognition attendance and management system designed for educational institutions. It provides a seamless, automated, and secure way to track attendance and manage academic records.

## 🛠 Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Node.js (Express), MariaDB
- **Storage:** MinIO (Object Storage)
- **AI Service:** Python (FastAPI), InsightFace (AntelopeV2), GFPGAN
- **Deployment:** Docker, Nginx, Cloudflare Tunnel

## 🚀 Quick Start (Production)

To deploy the entire stack on your server:

1. **Configure Environment:** Ensure `.env.prod` is present in the root directory.
2. **Run Deployment:**
   ```bash
   bash deploy-production.sh
   ```

## 📖 Documentation

- [System Architecture](docs/ARCHITECTURE.md) - Technical overview and data flow.
- [API Documentation](docs/API.md) - Endpoint details and request formats.
- [Production Guide](docs/PRODUCTION.md) - Detailed deployment and maintenance instructions.

## 🛡 Security & Privacy

LabFace is built with privacy-first principles, including:
- Data encryption at rest and in transit.
- Secure face embedding storage (no raw images stored for recognition).
- Full compliance with Data Privacy standards.

---
© 2026 LabFace Team
