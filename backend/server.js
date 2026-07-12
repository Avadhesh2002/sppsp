const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  // Production domain
  "https://sppsp.in",
  "https://www.sppsp.in",
  // Vercel preview URL (update after deploy)
  "https://sppsp.vercel.app",
  // Custom FRONTEND_URL from env
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development allow all
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/students',   require('./routes/studentRoutes'));
app.use('/api/admin',      require('./routes/adminRoutes'));
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/users',      require('./routes/userRoutes'));
app.use('/api/teacher',    require('./routes/teacherRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/marks',      require('./routes/marksRoutes'));
app.use('/api/homework',   require('./routes/homeworkRoutes'));
app.use('/api/timetable',  require('./routes/timetableRoutes'));
app.use('/api/datesheet',  require('./routes/datesheetRoutes'));
app.use('/api/fees',       require('./routes/feeRoutes'));
app.use('/api/bus',        require('./routes/busRoutes'));
app.use('/api/push',       require('./routes/pushRoutes'));
app.use('/api/holidays',   require('./routes/holidayRoutes'));
app.use('/api/syllabus',   require('./routes/syllabusRoutes'));

// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'DV Convent School API is running...' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
