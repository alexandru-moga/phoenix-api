const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const { initDatabase } = require('./config/db');
initDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

const contactRoutes = require('./routes/contactRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const authRoutes = require('./routes/authRoutes'); // Add this line

app.use('/api/contact', contactRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/auth', authRoutes); // Add this after app initialization

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/fullchain.pem'),
  minVersion: 'TLSv1.2'
};

const httpsOptions = {
  minVersion: 'TLSv1.2',
  honorCipherOrder: true,
  ciphers: [
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384'
  ].join(':'),
  key: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/fullchain.pem')
};

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
    console.log('Fetching team members with active_member = 1...');
    
    // Get the full result without destructuring
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
    
    // Handle different result formats from MariaDB
    let members;
    if (Array.isArray(result)) {
      members = result;
    } else if (result && typeof result === 'object') {
      // Sometimes MariaDB returns results with rows at index 0
      members = result[0] || [];
    } else {
      members = [];
    }
    
    console.log(`Found ${members.length} active members`);
    
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


https.createServer(httpsOptions, app).listen(3000, () => {
  console.log('API running on https://api.phoenixclub.ro');
});

async function createIndexes(conn) {
  const indexes = [
      { name: 'idx_login_code', column: 'login_code' },
      { name: 'idx_login_code_expires', column: 'login_code_expires' }
  ];

  for (const index of indexes) {
      try {
          // Verify column exists first
          const [colRows] = await conn.query(
              `SELECT COLUMN_NAME 
               FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = ? 
               AND TABLE_NAME = 'members'
               AND COLUMN_NAME = ?`,
              [process.env.DB_NAME, index.column]
          );

          if (colRows.length === 0) {
              throw new Error(`Column ${index.column} missing for index ${index.name}`);
          }

          // Create index if missing
          const [indexRows] = await conn.query(
              `SELECT INDEX_NAME 
               FROM INFORMATION_SCHEMA.STATISTICS 
               WHERE TABLE_SCHEMA = ? 
               AND TABLE_NAME = 'members'
               AND INDEX_NAME = ?`,
              [process.env.DB_NAME, index.name]
          );

          if (indexRows.length === 0) {
              await conn.query(
                  `CREATE INDEX ${index.name} ON members (${index.column})`
              );
              console.log(`Created index ${index.name}`);
          }
      } catch (error) {
          console.error(`Index operation failed: ${error.message}`);
          throw error;
      }
  }
}