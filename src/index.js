const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- CORS Configuration ---
const corsOptions = {
  origin: [
    'http://127.0.0.1:5500',
    'https://phoenixclub.ro',
    '90.95.76.115'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// --- Body Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Database Initialization ---
const { initDatabase } = require('./config/db');
initDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// --- Routes ---
const contactRoutes = require('./routes/contactRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/contact', contactRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/auth', authRoutes);

// --- Example API Endpoints ---
app.get('/api/projects', async (req, res) => {
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

    let members;
    if (Array.isArray(result)) {
      members = result;
    } else if (result && typeof result === 'object') {
      members = result[0] || [];
    } else {
      members = [];
    }

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
