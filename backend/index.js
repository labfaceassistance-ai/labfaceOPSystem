const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'https://labface.site',
    'https://www.labface.site',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
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

app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});



app.get('/', (req, res) => {
  res.send('LabFace Backend API is running');
});

// Run server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
