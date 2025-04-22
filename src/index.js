const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORS Configuration ---
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'https://phoenixclub.ro',
    '90.95.76.115'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// --- Database Initialization ---
const { initDatabase } = require('./config/db');
initDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// --- Routes ---
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// --- Protected Example Endpoints ---
const authenticateJWT = require('./utils/auth');

app.get('/api/projects', authenticateJWT, async (req, res) => {
  try {
    const { pool } = require('./config/db');
    const conn = await pool.getConnection();
    const result = await conn.query('SELECT * FROM ysws_projects');
    conn.release();

    const today = new Date();
    const projects = result.map(project => {
      let status;
      const start = new Date(project.start_date);
      const end = new Date(project.end_date);
      if (today < start) status = 'future';
      else if (today > end) status = 'ended';
      else status = 'active';
      return { ...project, status };
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/team-members', async (req, res) => {
  try {
    const { pool } = require('./config/db');
    const conn = await pool.getConnection();
    const result = await conn.query(`
      SELECT id, first_name, last_name, role, description, github_username
      FROM members
      WHERE active_member = 1
      ORDER BY
        CASE role
          WHEN 'leader' THEN 1
          WHEN 'co-leader' THEN 2
          ELSE 3
        END,
        last_name ASC
    `);
    conn.release();

    const members = Array.isArray(result) ? result : (result && typeof result === 'object' ? result[0] || [] : []);
    const enhanced = members.map(member => ({
      ...member,
      img: `/images/team/${member.id}.jpg`
    }));

    res.json(enhanced);
  } catch (error) {
    console.error('Team members error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// --- HTTPS Server Options ---
const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/fullchain.pem'),
  minVersion: 'TLSv1.2',
  honorCipherOrder: true,
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384'
  ].join(':')
};

// --- Start HTTPS Server ---
https.createServer(httpsOptions, app).listen(3000, () => {
  console.log('API running on https://api.phoenixclub.ro');
});
