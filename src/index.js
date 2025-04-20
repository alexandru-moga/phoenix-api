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