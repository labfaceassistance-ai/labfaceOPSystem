const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'https://labface.site',
    'https://www.labface.site',
    'http://localhost:3000',
    'http://localhost:8090',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const classRoutes = require('./routes/classRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { getObjectStream } = require('./utils/minioHelper');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/consent', require('./routes/consentRoutes'));
app.use('/api/data-rights', require('./routes/dataRightsRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/warnings', require('./routes/attendanceWarningRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// MinIO Proxy Route — Serves files from MinIO buckets
app.get('/api/minio/:bucket/*', async (req, res) => {
  const bucket = req.params.bucket;
  const objectName = req.params[0]; // The wildcard matches the rest of the path

  if (!bucket || !objectName) {
    return res.status(400).send('Bucket and object name are required');
  }

  try {
    const dataStream = await getObjectStream(bucket, objectName);
    
    // Attempt to set correct content type based on extension
    const ext = path.extname(objectName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.webp': 'image/webp'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }

    dataStream.pipe(res);
  } catch (err) {
    console.error(`[MinIO Proxy] Error fetching ${bucket}/${objectName}:`, err.message);
    if (err.code === 'NoSuchKey') {
      res.status(404).send('File not found');
    } else {
      res.status(500).send('Internal Server Error');
    }
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});



app.get('/', (req, res) => {
  res.send('LabFace Backend API is running');
});

// Catch-all 404 — must come after all defined routes
app.use(notFoundHandler);
// Centralized error handler — must be last middleware
app.use(errorHandler);

// Run server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
